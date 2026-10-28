/**
 * 手相识别 · 本地图片质量校验
 * ------------------------------------------------------------------
 * 目的：只把「完全无法辨认」的废片在**本地**拦掉——严重失焦、画面全黑、
 * 纯色。不上传图片、不消耗识别费用、还能立刻给出重拍引导。
 *
 * 【判定原则】宁可放过，不可错杀。轻微模糊 / 噪点 / 细节不足 / 偏暗偏亮
 * 一律放行：这些情况交给识别环节处理，比在门口把用户挡回去体验更好。
 *
 * 实现（离屏 canvas 取样）：
 *   1. 灰度标准差 contrast —— 画面有没有可辨认的明暗结构（纯色会趋近 0）
 *   2. 归一化锐度 sharp = sqrt(拉普拉斯方差) / contrast × 1000
 *      —— 除以 contrast 是为了消除亮度/对比度对清晰度指标的影响，
 *         否则「清晰但偏暗」的照片会被误判成模糊（详见 config.js 标定表）
 *   3. 平均亮度 brightness —— 只拦全黑 / 全白
 *   4. 肤色占比 skinRatio、贴边比例 edgeTouch —— 取景是否合规
 *
 * 环境不支持（如本地自检）时返回 skipped，不阻塞后续识别。
 * ------------------------------------------------------------------
 * 转写说明：由 utils/palm/quality.js 转写，module.exports → JY.palmQuality；
 *   校验算法（拉普拉斯方差 / 灰度标准差 / 肤色色度 / 阈值判定顺序）与原实现逐行一致。
 *   仅改动「图片解码」边界：
 *   - 入参从「wx 临时文件路径」改为 dataURL 或 HTMLImageElement（见 check 注释）；
 *   - wx.createOffscreenCanvas(...) → Document.createElement('canvas')（同样 256×256 离屏取样）；
 *   - canvas.createImage()/img.onload/onerror → JY.loadImage(src)（core 提供，
 *     支持 dataURL 与 Image 元素，图片加载完成后再 drawImage 读像素）；
 *   - 超时兜底（1.5s 放行）与 skipped 语义保留。
 */
JY.palmQuality = (function () {
// 转写：const CFG = require('./config.js') → var CFG = JY.palmConfig（config.js 先加载）
const CFG = JY.palmConfig

/** 拉普拉斯方差：4 邻域二阶差分，步长 2 取样，/100 归一化到易读量级 */
function laplacianVariance(gray, w, h) {
  let sum = 0, sumSq = 0, n = 0
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const i = y * w + x
      const v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w]
      sum += v; sumSq += v * v; n++
    }
  }
  if (!n) return 0
  const mean = sum / n
  return Math.max(0, sumSq / n - mean * mean) / 100 // 归一化到易读量级
}

/** 灰度标准差：画面明暗结构的丰富程度，纯色/全黑会趋近 0 */
function stdDev(gray, w, h) {
  const n = w * h
  if (!n) return 0
  let sum = 0, sumSq = 0
  for (let i = 0; i < n; i++) { sum += gray[i]; sumSq += gray[i] * gray[i] }
  const mean = sum / n
  return Math.sqrt(Math.max(0, sumSq / n - mean * mean))
}

/**
 * 由灰度缓冲算出清晰度三件套（抽出来便于离线回归测试，见 tools/test-quality.js）
 * @param {Uint8Array} gray 灰度数组
 * @param {number} w 宽
 * @param {number} h 高
 * @returns {{blur:number, contrast:number, sharp:number}}
 *   blur     未归一化的拉普拉斯方差，仅作调参参考
 *   contrast 灰度标准差，纯色趋近 0
 *   sharp    归一化锐度，阈值比对用的是它
 */
function computeMetrics(gray, w, h) {
  const contrast = stdDev(gray, w, h)
  const blur = laplacianVariance(gray, w, h)
  // contrast 为 0 时（纯色）由 FLAT 分支先拦掉，这里只需防除零
  const sharp = contrast > 0.001 ? Math.sqrt(blur) / contrast * 1000 : 0
  return { blur: blur, contrast: contrast, sharp: sharp }
}

/**
 * 肤色判定：用**归一化色度**而非绝对 RGB
 * ------------------------------------------------------------------
 * 为什么不用绝对阈值：旧版要求 r>60 && g>30 && b>12，画面一暗这些条件就全部失效
 * （实测：同一张清晰照片亮度降到 35%，肤色占比从 0.65 掉到 0.03，会被误判成
 * 「没有识别到手掌」）。改成按 r/(r+g+b) 的比例判断，光照强弱不影响色度。
 * 实测归一化后：亮度 137→16，肤色占比稳定在 0.70→0.65；纯灰/蓝天/绿植均为 0。
 */
function isSkin(r, g, b) {
  const s = r + g + b
  if (s < 30) return false          // 近黑，色度无意义
  const rn = r / s, gn = g / s, bn = b / s
  return rn > gn && gn > bn &&      // 暖色序：红 > 绿 > 蓝
         rn > 0.33 && rn < 0.52 &&  // 肤色红分量占比区间
         (rn - bn) > 0.04 &&        // 与中性灰拉开距离
         (rn - bn) < 0.22           // 排除过于饱和的橙红色
}

/**
 * 转写说明：入参由「wx 临时文件路径」改为「dataURL 或 HTMLImageElement」。
 * @param {string|HTMLImageElement} src 图片 dataURL，或已加载/加载中的 Image 元素
 * @returns {Promise<{ok:boolean, skipped?:boolean, code?:string, message?:string, guide?:string, metrics?:object}>}
 */
function check(src) {
  const q = CFG.quality
  return new Promise(function (resolve) {
    let settled = false
    let timer = null
    const done = function (r) {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      if (q.debug && r.metrics) {
        console.log('[palm/quality]', r.code || 'PASS', JSON.stringify(r.metrics))
      }
      resolve(r)
    }
    const pass = function (metrics) {
      done({ ok: true, metrics: metrics })
    }
    // 转写：原「所测 wx.createOffscreenCanvas 不可用则跳过」→「DOM canvas 不可用则跳过」
    if (typeof document === 'undefined' || !document.createElement) {
      return done({ ok: true, skipped: true })
    }

    let canvas
    try {
      canvas = document.createElement('canvas')
      canvas.width = q.size
      canvas.height = q.size
    } catch (e) {
      return done({ ok: true, skipped: true })
    }
    // 兜底：图片解码异常时不让流程悬空，超时即放行交给后续识别
    timer = setTimeout(function () { done({ ok: true, skipped: true }) }, 1500)

    const ctx = canvas.getContext('2d')
    // 转写：原 canvas.createImage()/img.onload/onerror/img.src = path
    //       → JY.loadImage(src)（dataURL 或 Image 元素，加载完成后再读像素）
    const loadImage = (typeof JY !== 'undefined' && JY.loadImage) ||
      function (s) { return Promise.reject(new Error('no loadImage')) }
    loadImage(src).then(function (img) {
      ctx.drawImage(img, 0, 0, q.size, q.size)
      let data
      try {
        data = ctx.getImageData(0, 0, q.size, q.size).data
      } catch (e) {
        return done({ ok: true, skipped: true })
      }

      const w = q.size, h = q.size
      const gray = new Uint8Array(w * h)
      let brightSum = 0, skin = 0
      let edgeTouch = 0, edgeTotal = 0

      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const r = data[i], g = data[i + 1], b = data[i + 2]
        const lum = (r * 299 + g * 587 + b * 114) / 1000
        gray[p] = lum
        brightSum += lum
        const sk = isSkin(r, g, b)
        if (sk) skin++
        const x = p % w, y = (p / w) | 0
        const onEdge = x < 3 || y < 3 || x > w - 4 || y > h - 4
        if (onEdge) { edgeTotal++; if (sk) edgeTouch++ }
      }

      const cm = computeMetrics(gray, w, h)
      const metrics = {
        sharp: Math.round(cm.sharp * 10) / 10,
        contrast: Math.round(cm.contrast * 10) / 10,
        blur: Math.round(cm.blur * 100) / 100,   // 未归一化的原始值，仅供调参参考
        brightness: Math.round(brightSum / (w * h)),
        skinRatio: Math.round((skin / (w * h)) * 1000) / 1000,
        edgeTouch: edgeTotal ? Math.round((edgeTouch / edgeTotal) * 1000) / 1000 : 0
      }

      // 判定顺序：曝光 → 纯色 → 严重失焦 → 取景。
      // 纯色必须排在失焦之前，它同时是 sharp 的除零保护。
      if (metrics.brightness < q.darkMax) {
        return done({ ok: false, code: 'LOW_LIGHT', metrics: metrics })
      }
      if (metrics.brightness > q.brightMin) {
        return done({ ok: false, code: 'OVER_EXPOSED', metrics: metrics })
      }
      if (metrics.contrast < q.contrastMin) {
        return done({ ok: false, code: 'FLAT', metrics: metrics })
      }
      if (metrics.sharp < q.sharpMin) {
        return done({ ok: false, code: 'BLUR', metrics: metrics })
      }
      if (metrics.skinRatio < q.skinMin) {
        return done({ ok: false, code: 'NOT_HAND', metrics: metrics })
      }
      if (metrics.edgeTouch > q.edgeTouchMax) {
        return done({ ok: false, code: 'HAND_INCOMPLETE', metrics: metrics })
      }
      pass(metrics)
    }).catch(function () {
      done({ ok: true, skipped: true })
    })
  })
}

return {
  check: check,
  // 供离线回归测试使用（见 tools/test-quality.js），业务不要调
  _internals: { computeMetrics: computeMetrics, isSkin: isSkin }
}
})()
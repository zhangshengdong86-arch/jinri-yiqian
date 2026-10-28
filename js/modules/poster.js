/**
 * 结果分享海报：canvas 2d 绘制长图
 *
 * 设计约定
 *   - 逻辑宽度固定 375，高度按内容算（先测量再绘制，避免留白或截断）
 *   - 配色跟随页面主题（水墨 / 暖砂 / 深紫 / 星夜），不做硬编码
 *   - 底部强制带娱乐声明，与页面内 disclaimer 保持同一口径
 *   - 所有绘制走 try/catch，失败时由调用方降级为「分享小程序卡片」
 *
 * 用法（页面）
 *   const poster = require('../../utils/poster.js')
 *   poster.render(this, '#posterCanvas', spec, {
 *     success: function (path) {},   // 临时文件路径
 *     fail: function (msg) {}
 *   })
 * ------------------------------------------------------------------
 * 转写说明：由 utils/poster.js 转写，module.exports → JY.poster；绘制逻辑一字未改。
 *   - wx.createSelectorQuery() 照写（core.js 已提供 shim：exec 同步返回真实
 *     DOM canvas 节点，随后直接用原生 2d 上下文，宋体/字重/圆角/渐变/透明度全部保留）。
 *   - 页面要求：调用方页面 render() 里必须渲染
 *     <canvas id="posterCanvas" width="375" height="800"></canvas>
 *     （不想露出的画布由页面 css 定位到视口外或隐藏）。
 *   - 原 wx.canvasToTempFilePath({ canvas: canvas, ... }) 是「canvas 节点导出」，core 的
 *     canvasToTempFilePath shim 只支持按 canvasId 查会话，故换成对 DOM canvas 直接
 *     toDataURL('image/png') 输出：success(r.tempFilePath) 收到的即 PNG dataURL，
 *     与 core.js 约定的「tempFilePath = dataURL」一致，页面拿它调 JY.saveDataUrl 下载。
 *   - save() 原走 wx.saveImageToPhotosAlbum（相册）/wx.previewImage（预览），网页版无相册，
 *     改为触发浏览器下载（JY.saveDataUrl），回调契约不变。
 */
JY.poster = (function () {
const W = 375
const PAD = 30
const IW = W - PAD * 2

const SERIF = '"Songti SC", "STSong", "SimSun", serif'
const SANS = '-apple-system, "PingFang SC", "Helvetica Neue", sans-serif'

/* ---------------- 主题皮肤 ---------------- */
const SKINS = {
  // 每日一签：宣纸米白
  daily: { bg1: '#FBF7F0', bg2: '#F2EBE0', ink: '#2C2622', sub: '#6E655B', line: '#E2D9CB', accent: '#B08D3F', card: '#FFFFFF' },
  // 卜卦：水墨灰白
  divination: { bg1: '#F8F6F2', bg2: '#EDEAE3', ink: '#25282C', sub: '#6A7078', line: '#DCD8D0', accent: '#A32D2D', card: '#FFFFFF' },
  // 塔罗：深紫鎏金（深底浅字）
  tarot: { bg1: '#211C33', bg2: '#161228', ink: '#EFE9F7', sub: '#A79CC0', line: '#3A3153', accent: '#C8A45C', card: '#2A2440' },
  // 手相：暖砂大地
  palm: { bg1: '#FAF3E8', bg2: '#F1E5D2', ink: '#3A2E22', sub: '#7A6B58', line: '#E3D5BE', accent: '#C08A4A', card: '#FFFFFF' },
  // 星座：星夜极光（深底浅字）
  zodiac: { bg1: '#131A2E', bg2: '#0C1120', ink: '#E7ECF6', sub: '#8E9AB2', line: '#26304A', accent: '#7FA8E8', card: '#1A2238' }
}

function skin(key) {
  return SKINS[key] || SKINS.daily
}

/* ---------------- 绘制小工具 ---------------- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/** 按字符换行：中英文混排都能断，避免整段被截断 */
function wrap(ctx, str, maxW) {
  const out = []
  const s = String(str === undefined || str === null ? '' : str)
  const paras = s.split('\n')
  for (let p = 0; p < paras.length; p++) {
    let line = ''
    const chars = paras[p].split('')
    for (let i = 0; i < chars.length; i++) {
      const t = line + chars[i]
      if (line && ctx.measureText(t).width > maxW) {
        out.push(line)
        line = chars[i]
      } else {
        line = t
      }
    }
    out.push(line)
  }
  return out.length ? out : ['']
}

/* ---------------- 布局与绘制 ---------------- */
/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} spec { skin, eyebrow, date, title, titleColor, subtitle, blocks:[{label,text}], footer }
 * @param {Boolean} paint true 绘制 / false 仅测量
 * @return {Number} 画布总高
 */
function render(ctx, spec, paint) {
  const sk = skin(spec.skin)
  const blocks = spec.blocks || []
  const lh = 23

  function font(size, weight, serif) {
    ctx.font = (weight || '400') + ' ' + size + 'px ' + (serif ? SERIF : SANS)
  }
  function line(str, x, y, color, maxW, lineH) {
    const arr = maxW ? wrap(ctx, str, maxW) : [String(str)]
    const h = lineH || lh
    if (paint) {
      ctx.fillStyle = color
      for (let i = 0; i < arr.length; i++) ctx.fillText(arr[i], x, y + i * h)
    }
    return arr.length * h
  }

  let y = 0

  /* 背景 */
  if (paint) {
    const g = ctx.createLinearGradient(0, 0, 0, 900)
    g.addColorStop(0, sk.bg1)
    g.addColorStop(1, sk.bg2)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, 4000)
  }

  /* 顶部品牌条 */
  y = 38
  if (paint) {
    ctx.fillStyle = sk.accent
    roundRect(ctx, PAD, y - 9, 4, 18, 2)
    ctx.fill()
  }
  font(17, '600', true)
  if (paint) {
    ctx.fillStyle = sk.ink
    ctx.fillText('今日宜签', PAD + 14, y + 5)
  }
  font(11, '400', false)
  if (paint) {
    ctx.fillStyle = sk.sub
    const right = (spec.eyebrow || '') + (spec.date ? ' · ' + spec.date : '')
    const rw = ctx.measureText(right).width
    ctx.fillText(right, W - PAD - rw, y + 4)
  }
  y += 26

  if (paint) {
    ctx.strokeStyle = sk.line
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD, y)
    ctx.lineTo(W - PAD, y)
    ctx.stroke()
  }
  y += 34

  /* 主标题 */
  font(34, '600', true)
  if (paint) ctx.textAlign = 'center'
  const titleLines = wrap(ctx, spec.title || '', IW)
  if (paint) {
    ctx.fillStyle = spec.titleColor || sk.accent
    for (let i = 0; i < titleLines.length; i++) {
      ctx.fillText(titleLines[i], W / 2, y + 20 + i * 44)
    }
  }
  y += titleLines.length * 44

  if (spec.subtitle) {
    font(13, '400', false)
    if (paint) ctx.fillStyle = sk.sub
    const sl = wrap(ctx, spec.subtitle, IW)
    if (paint) {
      for (let i = 0; i < sl.length; i++) ctx.fillText(sl[i], W / 2, y + 2 + i * 20)
    }
    y += sl.length * 20
  }
  if (paint) ctx.textAlign = 'left'
  y += 26

  /* 内容块 */
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (!b || (!b.label && !b.text)) continue
    const bTop = y

    if (b.label) {
      font(12, '500', false)
      if (paint) {
        ctx.fillStyle = sk.accent
        ctx.fillText('◆  ' + b.label, PAD + 10, bTop + 16)
      }
      y = bTop + 16 + 14
    }

    font(b.size || 15, '400', b.serif === true)
    const txt = Array.isArray(b.text) ? b.text.join('\n') : b.text
    y += line(txt, PAD + 10, y + 16, b.color || sk.ink, IW - 20, b.lineHeight || lh)

    y += 8

    // 卡片底：让每块像一张宣纸小笺
    if (paint) {
      ctx.fillStyle = sk.card
      ctx.globalAlpha = b.card === false ? 0 : 0.55
      if (b.card !== false) {
        roundRect(ctx, PAD, bTop, IW, y - bTop - 8, 10)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      // 重绘文字（卡片盖住了）
      font(12, '500', false)
      if (b.label) {
        ctx.fillStyle = sk.accent
        ctx.fillText('◆  ' + b.label, PAD + 10, bTop + 16)
      }
      font(b.size || 15, '400', b.serif === true)
      const arr = wrap(ctx, Array.isArray(b.text) ? b.text.join('\n') : b.text, IW - 20)
      ctx.fillStyle = b.color || sk.ink
      for (let k = 0; k < arr.length; k++) {
        ctx.fillText(arr[k], PAD + 10, bTop + 16 + 14 + 16 + k * (b.lineHeight || lh))
      }
    }
    y += 18
  }

  /* 底部 */
  y += 6
  if (paint) {
    ctx.strokeStyle = sk.line
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD, y)
    ctx.lineTo(W - PAD, y)
    ctx.stroke()

    // 朱砂小印
    ctx.fillStyle = sk.accent
    roundRect(ctx, W - PAD - 44, y + 16, 44, 44, 6)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    font(13, '600', true)
    ctx.textAlign = 'center'
    ctx.fillText('今日', W - PAD - 22, y + 36)
    ctx.fillText('宜签', W - PAD - 22, y + 52)
    ctx.textAlign = 'left'
  }
  y += 22

  font(11, '400', false)
  if (paint) ctx.fillStyle = sk.sub
  const footLines = wrap(ctx, spec.footer || '本内容仅供娱乐，不作为决策依据', IW - 60)
  for (let i = 0; i < footLines.length; i++) {
    if (paint) ctx.fillText(footLines[i], PAD, y + 14 + i * 17)
  }
  y += footLines.length * 17 + 30

  return Math.max(y, 420)
}

/* ---------------- 对外接口 ---------------- */
/**
 * 生成海报临时文件
 * @param {Object} page   页面实例
 * @param {String} sel    canvas 选择器
 * @param {Object} spec   内容
 * @param {Object} cb     { success(path), fail(msg) }
 */
function make(page, sel, spec, cb) {
  cb = cb || {}
  function fail(m) { if (cb.fail) cb.fail(m) }

  const q = wx.createSelectorQuery ? wx.createSelectorQuery() : null
  if (!q) { fail('当前环境不支持绘图，可直接分享给好友'); return }
  if (page && q.in) q.in(page)
  q.select(sel).fields({ node: true, size: true }).exec(function (res) {
    if (!res || !res[0] || !res[0].node) {
      fail('画布未就绪')
      return
    }
    const canvas = res[0].node
    let ctx
    try {
      ctx = canvas.getContext('2d')
    } catch (e) {
      fail('不支持绘图')
      return
    }
    if (!ctx) { fail('不支持绘图'); return }

    let dpr = 2
    try {
      // 优先新接口，老基础库回退到已废弃但仍在的 getSystemInfoSync
      if (wx.getWindowInfo) dpr = wx.getWindowInfo().pixelRatio || 2
      else if (wx.getSystemInfoSync) dpr = wx.getSystemInfoSync().pixelRatio || 2
    } catch (e) {}

    try {
      // 先用一个临时高度测量
      canvas.width = W * dpr
      canvas.height = 800 * dpr
      ctx.scale(dpr, dpr)
      const H = render(ctx, spec, false)

      // 再按真实高度绘制
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.scale(dpr, dpr)
      render(ctx, spec, true)

      /* 转写：原 wx.canvasToTempFilePath({ canvas: canvas, x:0, y:0, width:W, height:H,
         destWidth: W*dpr, destHeight: H*dpr, fileType:'png', quality:1, success/fail... })
         网页版 core 的 canvasToTempFilePath shim 按 canvasId 查会话、不识别 canvas 节点入参，
         此处直接读该 DOM canvas 的数据输出（同步）：
         success(r.tempFilePath) 收到的即 PNG dataURL，页面拿它调 JY.saveDataUrl 下载。 */
      let url = ''
      try { url = canvas.toDataURL('image/png') } catch (e) { url = '' }
      if (url && cb.success) cb.success(url)
      else fail('生成失败')
    } catch (e) {
      fail('绘制异常')
    }
  })
}

/** 保存到相册；无权限时降级为预览（用户可长按保存）
 *  转写：网页版无相册权限体系，保存 = 触发浏览器下载（JY.saveDataUrl）；
 *        原 wx.saveImageToPhotosAlbum 成功/失败分支与 wx.previewImage 预览
 *        在网页版不可用，已整段替换（原文见 source/utils/poster.js）。回调契约不变。 */
function save(path, cb) {
  cb = cb || {}
  function onFail() { if (cb.fail) cb.fail() }
  if (typeof JY.saveDataUrl !== 'function') {
    onFail()
    return
  }
  try {
    JY.saveDataUrl(path, 'jinri-yiqian-share.png')
    if (cb.success) cb.success()
  } catch (e) {
    onFail()
  }
}

return {
  W: W,
  SKINS: SKINS,
  skin: skin,
  render: render,
  make: make,
  save: save
}
})()
/**
 * 手相识别 · 门面（业务只调这里，不感知具体引擎）
 * ------------------------------------------------------------------
 * 流程：本地质量校验（不上传） → 引擎识别 → 统一结构返回。
 * 引擎可替换：vision.setProvider('cloud') 或改 config.js 的 provider。
 *
 * 返回成功：{ ok:true, degraded, note, data:{ shape, hand, lines } }
 * 返回失败：{ ok:false, code, message, guide, canFallback }
 * ------------------------------------------------------------------
 * 转写说明：由 utils/palm/vision.js 转写，module.exports → JY.palmVision；
 *   流程与文案一字未改（ERRORS / fail / setProvider / currentProvider / toPreset / 倾斜判定原样）。
 *   require 映射（均先于本文件加载，顶层引用安全）：
 *     ./config.js        → JY.palmConfig
 *     ./quality.js       → JY.palmQuality
 *     ./providers/mock.js  → JY.palmMock
 *     ./providers/cloud.js → JY.palmCloud（网页版永远 reject，靠 autoFallback 回落 mock）
 *   analyze 入参从「wx 临时文件路径」改为 dataURL 或 HTMLImageElement（与 quality/mock 一致）。
 */
JY.palmVision = (function () {
const CFG = JY.palmConfig
const quality = JY.palmQuality
const mockProvider = JY.palmMock
const cloudProvider = JY.palmCloud

const PROVIDERS = { mock: mockProvider, cloud: cloudProvider }

/**
 * 异常码 → 用户可见文案与重拍引导
 * ------------------------------------------------------------------
 * 文案原则：说「为什么过不了 + 下一步怎么做」，不用笼统的「照片模糊」。
 * 清晰度判定已放宽，BLUR 只在严重失焦时才会触发，所以措辞用「严重失焦」。
 */
const ERRORS = {
  BLUR: { message: '严重失焦，掌纹无法辨认', guide: '拍摄时手保持稳定，等相机对焦完成再按快门；也可以离手掌近一点再拍。' },
  FLAT: { message: '画面是纯色，看不到掌纹', guide: '请把掌心正对镜头，让掌纹完整出现在画面里再拍。' },
  LOW_LIGHT: { message: '画面太暗，看不清掌纹', guide: '到窗边或灯光下，让掌心受光均匀后再拍。' },
  OVER_EXPOSED: { message: '画面太亮，掌纹被冲淡', guide: '避开直射强光，柔光下掌纹才清楚。' },
  NOT_HAND: { message: '没有识别到手掌', guide: '让手掌完整占据画面中心，掌心朝向镜头。' },
  HAND_INCOMPLETE: { message: '手掌未完整入镜', guide: '四周留出空隙，指尖与手腕都拍进来。' },
  TILTED: { message: '手掌倾斜角度过大', guide: '把手放平、正对镜头，不要侧握。' },
  READ_FAILED: { message: '读取图片失败', guide: '请重新选择一张照片。' },
  TIMEOUT: { message: '识别超时', guide: '网络不佳，请重试或改用自测。' },
  SERVICE_UNAVAILABLE: { message: '识别服务未接入', guide: '当前为示例结果，可改用自测获得更贴合的解读。' },
  SERVICE_ERROR: { message: '识别服务暂不可用', guide: '请稍后重试，或改用自测模式。' }
}

function fail(code, extra) {
  const e = ERRORS[code] || ERRORS.SERVICE_ERROR
  return Object.assign({
    ok: false,
    code: code,
    message: e.message,
    guide: e.guide,
    canFallback: true
  }, extra || {})
}

/** 运行时切换引擎：'mock' | 'cloud' */
function setProvider(name) {
  if (PROVIDERS[name]) CFG.provider = name
  return CFG.provider
}

function currentProvider() {
  return PROVIDERS[CFG.provider] ? CFG.provider : 'mock'
}

/**
 * 识别手掌照片
 * 转写说明：入参由「wx 临时文件路径」改为 dataURL 或 HTMLImageElement。
 * @param {string|HTMLImageElement} src 图片 dataURL 或 Image 元素
 * @returns {Promise<object>}
 */
function analyze(src) {
  if (!src) return Promise.resolve(fail('READ_FAILED'))
  let metrics = null

  return quality.check(src).then(function (q) {
    // 质量校验自己带了 message/guide 时优先用它，避免文案在两处各写一份而改漏
    if (!q.ok) {
      const extra = {}
      if (q.message) extra.message = q.message
      if (q.guide) extra.guide = q.guide
      return fail(q.code, extra)
    }
    metrics = q.metrics || null
    const name = currentProvider()
    return PROVIDERS[name].analyze(src, metrics)
      .catch(function (err) {
        // 云端不可用且允许降级 → 回落本地示例，但明确标注
        if (CFG.autoFallback && name !== 'mock') {
          return mockProvider.analyze(src, metrics).then(function (r) {
            r.degraded = true
            r.note = '识别服务暂不可用，当前为示例结果'
            r.fallbackFrom = err && err.code ? err.code : 'SERVICE_ERROR'
            return r
          })
        }
        return fail((err && err.code) || 'SERVICE_ERROR')
      })
  }).then(function (r) {
    // 云端返回的倾斜/完整性二次判定（本地像素难以判断倾斜）
    if (r && r.ok && r.data && r.data.hand) {
      const tilt = Math.abs(r.data.hand.tilt || 0)
      if (tilt > 28) return fail('TILTED')
    }
    return r
  }).catch(function () {
    return fail('SERVICE_ERROR')
  })
}

/** 把识别结果压成页面解读所需的形态标签 */
function toPreset(result) {
  if (!result || !result.ok || !result.data) return null
  const d = result.data
  const preset = { type: d.shape && d.shape.id ? d.shape.id : '' }
  d.lines.forEach(function (l) { if (l.tag) preset[l.id] = l.tag })
  return preset.type ? preset : null
}

return {
  analyze: analyze,
  setProvider: setProvider,
  currentProvider: currentProvider,
  toPreset: toPreset,
  ERRORS: ERRORS
}
})()
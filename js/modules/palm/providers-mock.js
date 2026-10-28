/**
 * 手相识别 · 本地启发式 Provider（零依赖，永远可用）
 * ------------------------------------------------------------------
 * 不做真实图像识别，仅按掌相常见分布给出一份示例结果并明确标注。
 * 用途：1) 云环境未就绪时的兜底；2) 本地自检；3) 演示。
 * 真实识别由 cloud.js 提供，两者对业务返回完全一致的结构。
 * ------------------------------------------------------------------
 * 转写说明：由 utils/palm/providers/mock.js 转写，module.exports → JY.palmMock；
 *   随机手型 / 线形标签逻辑一字未改，不依赖图片路径（analyze 的 src 参数不参与计算）。
 *   - require('../../data.js') → var DATA = JY.data（data.js 先加载）
 *   - require('../../util.js') → var util = JY.util（util.js 先加载）
 */
JY.palmMock = (function () {
const DATA = JY.data
const util = JY.util

const SHAPES = DATA.PALM_TYPES || []
const TAGS = ['long', 'short', 'curve', 'straight', 'fork', 'chain', 'island']

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

/**
 * 转写说明：入参「本地图片路径」→ dataURL 或 HTMLImageElement（本 provider 不读取图片，参数仅透传）。
 * @param {string|HTMLImageElement} src 图片 dataURL 或 Image 元素
 * @param {object} metrics 本地质量校验结果（可空）
 * @returns {Promise<object>} 统一识别结果
 */
function analyze(src, metrics) {
  const shape = SHAPES.length ? pick(SHAPES).id : 'square'
  const lines = (DATA.PALM_LINES || []).map(function (l) {
    const tag = pick(TAGS)
    return {
      id: l.id,
      name: l.name,
      tag: tag,
      // 示例数据不提供真实坐标，避免误当精确结果使用
      points: [],
      direction: '',
      confidence: 0.5
    }
  })

  return Promise.resolve({
    ok: true,
    degraded: true,               // 关键：标注为「非真实识别」
    note: '当前为示例结果（未接入真实识别）',
    data: {
      shape: { id: shape, confidence: 0.5 },
      hand: { bbox: null, tilt: 0, completeness: 1 },
      lines: lines,
      metrics: metrics || null
    }
  })
}

return {
  name: 'mock',
  analyze: analyze,
  _util: util
}
})()
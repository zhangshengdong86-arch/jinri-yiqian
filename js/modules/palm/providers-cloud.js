/**
 * 手相识别 · 云端 Provider（微信云开发云函数 + 视觉大模型）
 * ------------------------------------------------------------------
 * 隐私设计：图片以压缩后的 JPEG 传给云函数，云函数内只做内存处理，
 * 不写任何持久化存储；小程序端 tempFilePath 用完即弃，不写 storage。
 *
 * 云环境未配置/不可用时：抛出 SERVICE_UNAVAILABLE，由 vision.js 决定是否回落 mock。
 * ------------------------------------------------------------------
 * 转写说明：网页版无云端 → analyze() 永远返回
 *   Promise.reject({ code: 'SERVICE_UNAVAILABLE', ... })，
 *   由 JY.palmVision 按 autoFallback 自动回落 mock（结果标注「示例」）。
 *   原 wx.cloud.callFunction 相关实现（readBase64 / normalize / 超时保护）整段
 *   以注释形式存档于文末，便于将来恢复真实云端识别。
 */
JY.palmCloud = (function () {
// 转写：const CFG = require('../config.js') → var CFG = JY.palmConfig
const CFG = JY.palmConfig

/**
 * 转写说明：网页版无云端，永远走 mock 降级（见 vision.js 的 autoFallback 逻辑）。
 * @param {string|HTMLImageElement} src 图片 dataURL 或 Image 元素（不使用）
 * @param {object} metrics 本地质量校验结果（不使用）
 * @returns {Promise<object>} 永远 reject
 */
function analyze(src, metrics) {
  return Promise.reject({
    code: 'SERVICE_UNAVAILABLE',
    message: '云识别服务未配置',
    guide: '网页版暂无云识别服务，已自动改用本地示例结果。'
  })
}

return { name: 'cloud', analyze: analyze }

/* ==================================================================
 * 以下为原 utils/palm/providers/cloud.js 其余实现（网页版注释存档）：
 * ================================================================== */
// /** 读取临时文件为 base64（压缩后体积通常远小于原图） */
// function readBase64(path) {
//   return new Promise(function (resolve, reject) {
//     if (typeof wx === 'undefined' || !wx.getFileSystemManager) {
//       return reject({ code: 'SERVICE_UNAVAILABLE', message: '当前环境不支持文件系统' })
//     }
//     try {
//       wx.getFileSystemManager().readFile({
//         filePath: path,
//         encoding: 'base64',
//         success: function (r) { resolve('data:image/jpeg;base64,' + r.data) },
//         fail: function () { reject({ code: 'READ_FAILED', message: '读取图片失败' }) }
//       })
//     } catch (e) {
//       reject({ code: 'READ_FAILED', message: '读取图片失败' })
//     }
//   })
// }
//
// /** 规范化云端返回，保证与 mock 输出结构一致 */
// function normalize(raw) {
//   const d = raw && raw.data ? raw.data : (raw || {})
//   const lines = (d.lines || []).map(function (l) {
//     return {
//       id: l.id,
//       name: l.name || l.id,
//       tag: l.tag || '',
//       points: Array.isArray(l.points) ? l.points : [],
//       direction: l.direction || '',
//       confidence: typeof l.confidence === 'number' ? l.confidence : 0
//     }
//   })
//   return {
//     ok: true,
//     degraded: false,
//     note: '',
//     data: {
//       shape: {
//         id: (d.shape && d.shape.id) || '',
//         confidence: (d.shape && d.shape.confidence) || 0
//       },
//       hand: {
//         bbox: (d.hand && d.hand.bbox) || null,
//         tilt: (d.hand && d.hand.tilt) || 0,
//         completeness: (d.hand && d.hand.completeness) || 1
//       },
//       lines: lines
//     }
//   }
// }
//
// /**
//  * @param {string} path 本地图片路径
//  * @param {object} metrics 本地质量校验结果
//  * @returns {Promise<object>}
//  */
// function analyze(path, metrics) {
//   const cfg = CFG.cloud
//   if (typeof wx === 'undefined' || !wx.cloud || !cfg.env) {
//     return Promise.reject({
//       code: 'SERVICE_UNAVAILABLE',
//       message: '云识别服务未配置',
//       guide: '请在 utils/palm/config.js 中填入云环境 ID，或保持 mock 引擎。'
//     })
//   }
//
//   return readBase64(path).then(function (dataUrl) {
//     return new Promise(function (resolve, reject) {
//       let settled = false
//       const finish = function (fn, arg) {
//         if (settled) return
//         settled = true
//         fn(arg)
//       }
//       // 超时保护
//       const timer = setTimeout(function () {
//         finish(reject, { code: 'TIMEOUT', message: '识别超时', guide: '网络不佳，请重试或改用自测。' })
//       }, cfg.timeout)
//
//       wx.cloud.callFunction({
//         name: cfg.fn,
//         data: { image: dataUrl, metrics: metrics || null },
//         success: function (res) {
//           clearTimeout(timer)
//           const r = res && res.result
//           if (!r || r.ok === false) {
//             return finish(reject, {
//               code: (r && r.code) || 'SERVICE_ERROR',
//               message: (r && r.message) || '识别失败',
//               guide: (r && r.guide) || '请重新拍摄一张清晰的掌心照片。'
//             })
//           }
//           finish(resolve, normalize(r))
//         },
//         fail: function (err) {
//           clearTimeout(timer)
//           finish(reject, {
//             code: 'SERVICE_ERROR',
//             message: '识别服务暂不可用',
//             guide: '请稍后重试，或改用自测模式。',
//             detail: err && err.errMsg
//           })
//         }
//       })
//     })
//   })
// }
//
// module.exports = { name: 'cloud', analyze: analyze }
})()
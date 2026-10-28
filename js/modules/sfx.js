/* =============================================================================
 * sfx.js —— 揭晓音效「鎏金揭示 Shimmer」
 * -----------------------------------------------------------------------------
 * 网页版暂不播音频，音效逻辑见 source/utils/sfx.js。
 * 转写说明：保留全部导出键（play / unlock / stop / set / setEnabled /
 *            isEnabled / isSupported），各函数改为空实现：
 *   - play()      返回 dead() 句柄（结构与原句柄一致：startedAt/impactAt/endsAt/
 *                 stop/ctx/silent），页面动画对时逻辑不受影响；
 *   - unlock()    恒返回 false（无声可解锁）；
 *   - set()       恒返回 {}（参数对象）；
 *   - isEnabled / setEnabled 保留原存储开关逻辑（sg_sfx_v1，供设置 UI 沿用）；
 *   - isSupported() 恒返回 false，页面据此隐藏音效开关。
 * 原 WebAudio 合成实现（蓄势噪声、五声琶音、混响 IR 等）不随网页版迁移。
 * ========================================================================== */
JY.sfx = (function () {

function dead() {
  return { startedAt: 0, impactAt: 0, endsAt: 0, stop: function () {}, ctx: null, silent: true }
}

/**
 * 触发一次揭晓音效（网页版空实现）。
 * @param {Object} patch 可选，运行时覆盖参数（忽略）
 * @returns {{startedAt,impactAt,endsAt,stop,ctx,silent}}
 */
function play(patch) {
  return dead()
}

/** 在用户手势回调里调用一次（网页版空实现）。 */
function unlock() {
  return false
}

/** 停止最近一次播放（网页版空实现）。 */
function stop() {}

/** 运行时改参数（网页版空实现）。 */
function set(patch) {
  return {}
}

/** 总开关（持久化到 sg_sfx_v1，默认开启）——保留原存储逻辑 */
function isEnabled() {
  try {
    var v = wx.getStorageSync('sg_sfx_v1')
    return v !== false && v !== 'off' && v !== 0
  } catch (e) { return true }
}

function setEnabled(on) {
  try { wx.setStorageSync('sg_sfx_v1', !!on) } catch (e) {}
  return !!on
}

/** 是否可用（供 UI 判断是否展示开关）：网页版恒不支持 */
function isSupported() {
  return false
}

return {
  play: play,
  unlock: unlock,
  stop: stop,
  set: set,
  setEnabled: setEnabled,
  isEnabled: isEnabled,
  isSupported: isSupported
}
})()
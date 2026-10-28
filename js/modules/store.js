/**
 * 全局状态：历史记录 / 收藏 / 用户档案
 * 统一走 wx.setStorageSync，App.globalData 只做内存镜像
 * 所有页面通过 getApp() 读写，不各自维护副本，避免状态割裂
 * 转写说明：由 utils/store.js 转写，module.exports → JY.store；逻辑一字未改。
 */
JY.store = (function () {
const KEY_HISTORY = 'sg_history'
const KEY_FAVORITE = 'sg_favorite'
const KEY_PROFILE = 'sg_profile'
const MAX_HISTORY = 60

function read(key, def) {
  try {
    const v = wx.getStorageSync(key)
    return v === '' || v === undefined || v === null ? def : v
  } catch (e) {
    return def
  }
}

function write(key, val) {
  try {
    wx.setStorageSync(key, val)
  } catch (e) {}
}

function init(app) {
  const h = read(KEY_HISTORY, [])
  const f = read(KEY_FAVORITE, [])
  const p = read(KEY_PROFILE, null)
  app.globalData.history = Array.isArray(h) ? h : []
  app.globalData.favorites = Array.isArray(f) ? f : []
  app.globalData.profile = p
}

function addHistory(app, record) {
  if (!record) return
  record.id = 'r_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
  record.time = record.time || Date.now()
  const list = app.globalData.history || []
  list.unshift(record)
  app.globalData.history = list.slice(0, MAX_HISTORY)
  write(KEY_HISTORY, app.globalData.history)
  return record
}

function getHistory(app, cat) {
  const list = app.globalData.history || []
  if (!cat) return list
  return list.filter(function (r) { return r.cat === cat })
}

/**
 * 按 route 去重写入：同一条"可回看路径"只保留最新一条
 * 用于星座运势这类同一页面会被反复触发记录的场景，避免历史被刷屏
 */
function upsertHistory(app, record) {
  if (!record || !record.route) return addHistory(app, record)
  const list = app.globalData.history || []
  app.globalData.history = list.filter(function (r) { return r.route !== record.route })
  return addHistory(app, record)
}

function removeHistory(app, id) {
  const list = app.globalData.history || []
  app.globalData.history = list.filter(function (r) { return r.id !== id })
  write(KEY_HISTORY, app.globalData.history)
  return app.globalData.history
}

function clearHistory(app) {
  app.globalData.history = []
  write(KEY_HISTORY, [])
}

function isFavorite(app, id) {
  const list = app.globalData.favorites || []
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return true
  }
  return false
}

function toggleFavorite(app, record) {
  if (!record || !record.id) return false
  const list = app.globalData.favorites || []
  let hit = -1
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === record.id) { hit = i; break }
  }
  if (hit >= 0) {
    list.splice(hit, 1)
  } else {
    list.unshift(record)
  }
  app.globalData.favorites = list
  write(KEY_FAVORITE, list)
  return hit < 0
}

function saveProfile(app, profile) {
  app.globalData.profile = Object.assign({}, app.globalData.profile || {}, profile || {})
  write(KEY_PROFILE, app.globalData.profile)
  return app.globalData.profile
}

return {
  init: init,
  addHistory: addHistory,
  upsertHistory: upsertHistory,
  getHistory: getHistory,
  removeHistory: removeHistory,
  clearHistory: clearHistory,
  isFavorite: isFavorite,
  toggleFavorite: toggleFavorite,
  saveProfile: saveProfile
}
})()
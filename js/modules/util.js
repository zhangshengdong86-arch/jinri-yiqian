/**
 * 通用工具函数
 * 转写说明：由 utils/util.js 转写，module.exports → JY.util；
 *   require('./links.js') → var links = JY.links（links.js 在本文件之前加载）；逻辑一字未改。
 */
JY.util = (function () {
const links = JY.links

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

function formatDate(d) {
  d = d || new Date()
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

function formatTime(d) {
  d = d || new Date()
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes())
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  if (!arr || !arr.length) return null
  return arr[randInt(0, arr.length - 1)]
}

/** Fisher-Yates 洗牌，返回新数组 */
function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

/** 按概率返回 true */
function chance(p) {
  return Math.random() < p
}

function toast(title, icon) {
  wx.showToast({ title: title, icon: icon || 'none', duration: 1600 })
}

/**
 * 页面跳转统一入口
 * 带 fail 回调：跳转失败时给出可见提示，避免"点了没反应却查不到原因"
 *
 * 两种写法（链接格式统一由 utils/links.js 决定，这里不再手写 ?a=1&b=2）：
 *   util.nav('/pages/history/index?cat=tarot')        // 直接给完整地址（兼容旧调用）
 *   util.nav('/pages/history/index', { cat: 'tarot' }) // 推荐：路径 + 参数，自动编码、自动省空值
 */
function nav(url, params) {
  // 传了参数就交给统一构造函数：键不编码、值走 encodeURIComponent、空值自动省略
  const target = params ? links.page(url, params) : url
  if (!target) {
    toast('页面路径为空')
    return
  }
  wx.navigateTo({
    url: target,
    fail: function (err) {
      console.error('[nav fail]', target, err)
      toast('跳转失败：' + ((err && err.errMsg) || '未知错误'))
    }
  })
}

/**
 * 统一的返回入口
 * 页面栈里还有上一层就返回；直接打开（分享/回看/单页调试）时退回指定页面，
 * 避免出现"点了返回没反应"的死角
 */
function back(fallbackUrl) {
  const stack = (typeof getCurrentPages === 'function' && getCurrentPages()) || []
  if (stack.length > 1) {
    wx.navigateBack({ delta: 1 })
    return
  }
  const url = fallbackUrl || '/pages/index/index'
  wx.redirectTo({ url: url })
}

/* ================= 轻柔触感（haptic）=================
 * 微信 vibrateShort 的能力边界：
 *   iOS     —— 支持 heavy / medium / light 三档，档位越强"咚"得越硬
 *   Android —— 忽略 type，固定约 15ms 单次，连着调会糊成廉价嗡鸣
 *
 * 「高级轻柔」的做法不是把档位调小，而是：
 *   1. 只用最柔的 light 档，靠"节奏"而不是"力度"表达轻重
 *   2. 一次交互拆成 2~3 下渐弱的轻触（起手 → 过程 → 收尾），有呼吸感
 *   4. 连点节流 + 序列互斥，快速连点不会叠成一团乱震
 *
 * 说明：当前版本**默认完全关闭震动**，交互反馈改由翻页 / 进场类视觉特效承载。
 *      需要恢复时调用 setHapticEnabled(true)，或把 isHapticEnabled 的默认值改回 true。
 * ==================================================== */
var HAPTIC_PATTERNS = {
  // 轻点：一下即止，最克制
  tap:     [{ at: 0,   type: 'light' }],
  // 轻触反馈：两下，间隔短，像指尖轻叩
  soft:    [{ at: 0,   type: 'light' }, { at: 120, type: 'light' }],
  // 抽签：渐弱三下，对应"起手 → 摇动 → 渐收"
  draw:    [{ at: 0,   type: 'light' }, { at: 200, type: 'light' }, { at: 430, type: 'light' }],
  // 揭晓：轻点一下 + 一点余韵，留白收尾
  reveal:  [{ at: 0,   type: 'light' }, { at: 100, type: 'light' }],
  // 成卦 / 成签：前两下轻，第三下落定（节奏拉开，不靠加重）
  confirm: [{ at: 0,   type: 'light' }, { at: 130, type: 'light' }, { at: 330, type: 'light' }]
}

// 旧调用 light / medium / heavy 的语义映射：强弱改为节奏差异
var HAPTIC_LEGACY = { light: 'tap', medium: 'soft', heavy: 'confirm' }

var _hapticSeq = 0
var _hapticLast = 0
var _hapticPlatform = null

function getPlatform() {
  if (_hapticPlatform) return _hapticPlatform
  try {
    var info = (typeof wx !== 'undefined' && wx.getSystemInfoSync && wx.getSystemInfoSync()) || {}
    _hapticPlatform = info.platform ||
      (String(info.system || '').indexOf('iOS') >= 0 ? 'ios' : 'android')
  } catch (e) {
    _hapticPlatform = 'ios'
  }
  return _hapticPlatform
}

function isHapticEnabled() {
  try {
    var v = wx.getStorageSync('sg_haptic_v1')
    return v === true || v === 'on' || v === 1   // 默认关闭：需显式开启才震动
  } catch (e) { return false }
}

function setHapticEnabled(on) {
  try { wx.setStorageSync('sg_haptic_v1', !!on) } catch (e) {}
}

/**
 * 触发一段节奏化轻震
 * @param {string} name  tap | soft | draw | reveal | confirm
 */
function haptic(name) {
  if (typeof wx === 'undefined') return
  if (!isHapticEnabled()) return
  var pattern = HAPTIC_PATTERNS[name] || HAPTIC_PATTERNS.tap
  var now = Date.now()
  if (now - _hapticLast < 60) return    // 连点节流
  _hapticLast = now

  // Android 连震会嗡，只保留前 1~2 下
  var steps = pattern
  if (getPlatform() === 'android') {
    steps = (name === 'draw' || name === 'confirm') ? pattern.slice(0, 2) : pattern.slice(0, 1)
  }

  var seq = ++_hapticSeq
  steps.forEach(function (s) {
    setTimeout(function () {
      if (seq !== _hapticSeq) return    // 已被新的触感序列取代，丢弃余下
      try { wx.vibrateShort({ type: s.type }) } catch (e) {}
    }, s.at)
  })
}

/** 兼容旧调用：vibrate('light' | 'medium' | 'heavy') → 走对应的轻柔节奏 */
function vibrate(type) {
  haptic(HAPTIC_LEGACY[type] || 'tap')
}

/** 简易防抖 */
function debounce(fn, wait) {
  let timer = null
  return function () {
    const args = arguments
    const ctx = this
    if (timer) clearTimeout(timer)
    timer = setTimeout(function () {
      fn.apply(ctx, args)
    }, wait || 300)
  }
}

/**
 * 当前页面路径 + 参数，用于「历史回看」场景下重建可收藏的记录
 * 走 utils/links.js 的同一套规则：顺序、编码、空值都与生成侧一致，
 * 因此「生成出来的链接」与「回看时重建的链接」字符串完全相同，收藏不会重复堆积。
 */
function currentRoute(page) {
  return links.fromOptions(page && page.route, page && page.options)
}

/**
 * 收藏 / 取消收藏一条结果
 * 以 route 作唯一键：同一条结果反复点只会在收藏与取消之间切换，不会堆重复项。
 * @param {Object} rec { id, cat, catName, title, route, time }
 * @return {Boolean} 操作后是否为「已收藏」
 */
function toggleFav(rec) {
  if (!rec) return false
  // 统一以 route 为键：同一结果反复收藏只会切换状态，不会堆出重复项
  const r = Object.assign({}, rec, { id: rec.route || rec.id })
  if (!r.id) return false
  let on = false
  try {
    on = getApp().toggleFavorite(r)
  } catch (e) {
    return false
  }
  toast(on ? '已收藏，可在「我的收藏」里回看' : '已取消收藏')
  return on
}

/** 当前结果是否已收藏 */
function isFav(id) {
  if (!id) return false
  try {
    return getApp().isFavorite(id)
  } catch (e) {
    return false
  }
}

return {
  nav: nav,
  back: back,
  pad2: pad2,
  formatDate: formatDate,
  formatTime: formatTime,
  randInt: randInt,
  pick: pick,
  shuffle: shuffle,
  chance: chance,
  toast: toast,
  vibrate: vibrate,
  haptic: haptic,
  setHapticEnabled: setHapticEnabled,
  isHapticEnabled: isHapticEnabled,
  debounce: debounce,
  toggleFav: toggleFav,
  isFav: isFav,
  currentRoute: currentRoute
}
})()
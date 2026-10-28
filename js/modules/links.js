/**
 * 分享 / 回看链接统一构造
 * ==================================================================
 * 为什么要有这个文件：
 *   之前每个页面都是手写拼接（'/x?a=' + a + '&b=' + b），参数顺序、编码方式、
 *   空值处理各不相同，导致「分享出去的地址」和「历史里能回看的地址」对不上，
 *   收藏/历史又把整条链接当去重重键，格式一乱就会出现重复项或打不开的脏记录。
 *   这里把格式规范固化成「一张规格表 + 一个构造函数」，页面只负责传参数。
 *
 * 格式规范（从现有可用的分享长图 / 历史回看链接反推并固化，改造前后字符串完全一致）
 *   1. 结构   /<page/path>?<k1>=<v1>&<k2>=<v2>
 *             path 以 / 开头、不带 query、不带尾部斜杠；没有任何参数时不带 ?
 *   2. 命名   全小写英文单词、语义命名（mode/auto/spread/cards/rev/q/type/...），
 *             不用驼峰、不加类型前缀
 *   3. 取值   布尔写 1 / 0；多值用英文逗号 , 连接（数组原样输出，不再二次编码，
 *             否则 , 会变成 %2C、破坏既有链接）；自由文本（所问 q、搜索词 kw）
 *             走 encodeURIComponent；键本身永不编码
 *   4. 顺序   固定：场景/模式（mode、auto）→ 主体数据 → 用户输入（q）收尾。
 *             顺序稳定，链接才能直接当收藏 / 历史的唯一键
 *   5. 空值   null / undefined / '' / NaN / 空数组 → 整个参数省略；
 *             个别历史兼容字段（q）写进 keep 名单，为空也保留成 q=，避免老链接变形
 *   6. 兜底   path 非法（含 ?、空格、非法字符、空串）→ 返回 ''，由调用方落到类目入口页
 *
 * 用法
 *   const links = require('../utils/links.js')
 *   links.link('tarot', { spread: 'triangle', auto: 1, cards: [...], rev: [...], q: q })
 *   links.page('/pages/history/index', { cat: 'tarot' })
 *   links.share({ cat: 'palm', subject: '方形手', params: {...} })
 * ==================================================================
 * 转写说明：由 utils/links.js 转写，module.exports → JY.links；逻辑一字未改。
 */
JY.links = (function () {

/** 分享标题尾缀：所有分享位强制带娱乐声明，与页面内 disclaimer 同一口径 */
var DISCLAIM = '（仅供娱乐）'

/**
 * 类目 → 链接规格
 *   path  页面路径（不含参数）
 *   order 参数顺序：场景/模式 → 主体数据 → 用户输入
 *   keep  即使为空也要占位输出的参数（历史兼容，勿随意增删）
 *   list  多值参数：数组或已用逗号连接的字符串都按「逐项编码 + 逗号连接」处理
 *   need  必填参数：缺失即判为无效，直接回落到兜底页，不产出打不开的半截链接
 */
var SPECS = {
  divination: {
    path: '/pages/divination/cast',
    order: ['mode', 'yao', 'mv', 'q'],
    keep: ['q'],
    need: ['yao']
  },
  tarot: {
    path: '/package-tarot/pages/tarot/reading',
    order: ['spread', 'auto', 'cards', 'rev', 'q'],
    keep: ['q'],
    list: ['cards', 'rev'],
    need: ['spread', 'cards']
  },
  palm: {
    path: '/pages/palm/reading',
    order: ['mode', 'auto', 'type', 'life', 'career', 'marriage'],
    need: ['type']
  },
  zodiac: {
    path: '/pages/zodiac/detail',
    order: ['id', 'period'],
    need: ['id']
  },
  match: {
    path: '/pages/zodiac/match',
    order: ['a', 'b'],
    need: ['a', 'b']
  },
  daily: {
    path: '/pages/daily/index',
    order: ['date'],
    need: ['date']
  }
}

/** 类目 → 入口页：没有结果可分享时的兜底地址 */
var ENTRY = {
  divination: '/pages/divination/index',
  tarot: '/package-tarot/pages/tarot/index',
  palm: '/pages/palm/index',
  zodiac: '/pages/zodiac/index',
  match: '/pages/zodiac/index',
  daily: '/pages/daily/index',
  home: '/pages/index/index'
}

/** 类目 → 展示名（分享标题用） */
var CAT_NAME = {
  divination: '卜卦',
  tarot: '塔罗',
  palm: '手相',
  zodiac: '星座',
  match: '星座配对',
  daily: '每日一签',
  home: '今日宜签'
}

/* ---------------- 基础规则 ---------------- */

/** 判空：这些值一律不出现在链接里 */
function isBlank(v) {
  if (v === null || v === undefined) return true
  if (typeof v === 'number') return isNaN(v)
  if (Array.isArray(v)) return v.length === 0
  return String(v) === ''
}

/** 单个标量 → 编码后的值（自由文本必须编码，键不编码） */
function scalar(v) {
  var s = (v === null || v === undefined) ? '' : String(v)
  try {
    return encodeURIComponent(s)
  } catch (e) {
    return ''
  }
}

/**
 * 值 → 链接里的写法
 *   布尔 → 1 / 0
 *   多值 → 逐项编码后用逗号连接（数组、或已用逗号拼好的字符串都走这条）
 *         注意不能整体编码：, 会变成 %2C，导致回看时重建出来的链接与原始链接不同，
 *         收藏 / 历史的去重重键就会漂移（同一结果存成两条）
 *   其余 → encodeURIComponent
 */
function encodeValue(v, asList) {
  if (typeof v === 'boolean') v = v ? 1 : 0
  if (Array.isArray(v) || asList) {
    var arr = Array.isArray(v) ? v : String(v).split(',')
    return arr.map(function (x) { return scalar(x) }).join(',')
  }
  return scalar(v)
}

/** 路径标准化：补 /、去 query 与尾部斜杠；含非法字符直接判无效 */
function normalizePath(p) {
  var s = String(p === null || p === undefined ? '' : p).trim()
  if (!s) return ''
  s = s.split('?')[0].split('#')[0]
  if (s.charAt(0) !== '/') s = '/' + s
  s = s.replace(/\/{2,}/g, '/').replace(/\/+$/, '')
  if (!/^\/[A-Za-z0-9_\-\/]+$/.test(s)) return ''
  return s
}

/** 按规格取参数顺序：声明过的按 order，未声明的按字母序追加，保证同一组参数永远同一字符串 */
function orderOf(params, spec) {
  var order = ((spec && spec.order) || []).slice()
  var extra = Object.keys(params || {}).filter(function (k) { return order.indexOf(k) < 0 })
  return order.concat(extra.sort())
}

/**
 * 拼 query（不带前导 ?）
 * @param {Object} params 键值
 * @param {Object} spec   { order, keep }
 */
function query(params, spec) {
  params = params || {}
  var keep = (spec && spec.keep) || []
  var list = (spec && spec.list) || []
  var out = []
  orderOf(params, spec).forEach(function (k) {
    if (!Object.prototype.hasOwnProperty.call(params, k)) return
    if (isBlank(params[k])) {
      // keep 名单里的字段即使为空也要占位，否则老链接会少一段、收藏键对不上
      if (keep.indexOf(k) >= 0) out.push(k + '=')
      return
    }
    out.push(k + '=' + encodeValue(params[k], list.indexOf(k) >= 0))
  })
  return out.join('&')
}

/**
 * 通用构造：任意页面 + 任意参数
 * @param {String} path   页面路径（可不带前导 /，可误带 ?query，会自动清洗）
 * @param {Object} params 参数（未声明顺序的键按字母序）
 * @return {String} 完整链接；path 非法时返回 ''
 */
function page(path, params) {
  var base = normalizePath(path)
  if (!base) return ''
  var q = query(params, null)
  return base + (q ? '?' + q : '')
}

/** 按类目规格构造；类目不存在或路径非法时返回 fallback（默认类目入口） */
function link(kind, params, fallback) {
  var spec = SPECS[kind]
  if (!spec) return fallback || ''
  var base = normalizePath(spec.path)
  if (!base) return fallback || ''
  var p = params || {}
  // 必填参数缺失 → 直接回落到兜底页，不产出「只有 mode 的半截链接」
  var need = spec.need || []
  for (var i = 0; i < need.length; i++) {
    if (isBlank(p[need[i]])) return fallback || ''
  }
  var q = query(p, spec)
  return (base + (q ? '?' + q : '')) || fallback || ''
}

/** 反查：某个页面路径属于哪条规格（回看重建链接时用来复用同一套顺序与 keep 规则） */
function specOf(path) {
  var base = normalizePath(path)
  var keys = Object.keys(SPECS)
  for (var i = 0; i < keys.length; i++) {
    if (normalizePath(SPECS[keys[i]].path) === base) return SPECS[keys[i]]
  }
  return null
}

/** 从页面 options 重建链接（回看 / 收藏用）：与生成侧同一套顺序、编码、空值规则 */
function fromOptions(path, options) {
  var base = normalizePath(path)
  if (!base) return ''
  var q = query(options || {}, specOf(base))
  return base + (q ? '?' + q : '')
}

/** 至少有一个有效值（用于判断「这条分享能不能带上结果参数」） */
function hasValue(params) {
  if (!params) return false
  return Object.keys(params).some(function (k) { return !isBlank(params[k]) })
}

/** 类目入口页；未知类目回落到首页 */
function entryOf(kind) {
  return ENTRY[kind] || ENTRY.home
}

/**
 * 统一构造 onShareAppMessage 的返回值
 * 规则：有结果 → 分享「能直接还原结果的回看链接」；没有结果 → 回落到类目入口
 * @param {Object} o
 *   cat      类目键（divination / tarot / palm / zodiac / match / daily / home）
 *   subject  结果主体，如 '乾为天'、'圣三角'、'方形手'、'白羊座 · 本周运势'
 *   params   回看参数；为空或全空则只分享入口页
 *   fallback 兜底路径（默认类目入口）
 *   fallbackTitle 无结果时的标题（默认 '今日宜签 · <类目名>'）
 * @return {Object} { title, path }
 */
function share(o) {
  o = o || {}
  var kind = o.cat || 'home'
  var entry = o.fallback || entryOf(kind)
  // 有可用参数就分享回看链接，否则分享入口，保证分享出去的地址一定能打开
  var path = (hasValue(o.params) ? (link(kind, o.params, entry) || entry) : entry)
  var name = CAT_NAME[kind] || CAT_NAME.home
  var title = o.subject
    ? (name + ' · ' + o.subject + DISCLAIM)
    : (o.fallbackTitle || ('今日宜签 · ' + name))
  return { title: title, path: path }
}

return {
  DISCLAIM: DISCLAIM,
  SPECS: SPECS,
  ENTRY: ENTRY,
  CAT_NAME: CAT_NAME,
  isBlank: isBlank,
  encodeValue: encodeValue,
  normalizePath: normalizePath,
  query: query,
  page: page,
  link: link,
  specOf: specOf,
  fromOptions: fromOptions,
  hasValue: hasValue,
  entryOf: entryOf,
  share: share
}
})()
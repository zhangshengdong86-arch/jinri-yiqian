/**
 * 每日一签 —— 内容库 + 确定性抽签 + 本机存储
 * ------------------------------------------------------------------
 * 设计要点：
 *   1. 同日同用户结果恒定（用「日期 + uid」作种子），符合「每日一签」语义：
 *      今天抽和晚上抽是同一支签，不会变来变去。
 *   2. 独立存储于 sg_daily_v1，不写入全局 history，避免「每日一签」刷屏历史。
 *   3. 所有存储读写包 try/catch，兼容走查模拟器（无真实 wx 时也安全）。
 *   4. 纯内容生成，娱乐向；签等偏向「吉 / 平」，措辞温和，不写具体灾厄。
 * ------------------------------------------------------------------
 * 转写说明：由 utils/daily.js 转写，module.exports → JY.daily；逻辑与数据一字未改。
 *   - require('./theme.js')     → var THEME = JY.theme（theme.js 先加载）
 *   - require('./db/poems.js')  → var POEMS_TONE = JY.dbPoems（db/poems.js 先加载）
 */
JY.daily = (function () {
const THEME = JY.theme

/* ---------------- 签等（权重即概率，合计 100） ----------------
   当前五档：上上签 8% / 上签 32% / 中签 35% / 下签 20% / 下下签 5%。
   中上签、中下签权重置 0，暂不参与抽签（条目与文案保留，改回权重即可恢复）。 */
var LEVELS = [
  { key: 'shangshang', label: '上上签', grade: '大吉', color: '#2FAF6B', weight: 8,
    desc: '云开见月，诸事顺遂，宜把握当下、顺势而为。' },
  { key: 'shang', label: '上签', grade: '吉', color: '#3FB984', weight: 32,
    desc: '风和日丽，谋事多成，稳中求进自有回响。' },
  { key: 'zhongshang', label: '中上签', grade: '小吉', color: '#7BBE4F', weight: 0,
    desc: '小有所成，耐心经营，渐入佳境不必急。' },
  { key: 'zhong', label: '中签', grade: '平', color: '#C9A96E', weight: 35,
    desc: '平顺无波，守常即可，静待时机水到渠成。' },
  { key: 'zhongxia', label: '中下签', grade: '小凶', color: '#D98A3D', weight: 0,
    desc: '稍有阻滞，宜缓宜守，勿急躁冒进自乱阵脚。' },
  { key: 'xia', label: '下签', grade: '凶', color: '#C25B4E', weight: 20,
    desc: '诸事宜敛，养精蓄锐，转机往往藏在退一步里。' },
  { key: 'xiaxia', label: '下下签', grade: '大凶', color: '#8E3A32', weight: 5,
    desc: '谷底亦是转机处，收敛锋芒、蓄力待时，不必与当下硬碰。' }
]

/* ---------------- 主题（映射四大模块 + 心语） ---------------- */
var THEMES = [
  { key: 'divination', name: '卜卦', emoji: '☯', route: '/pages/divination/index',
    hint: '今日宜以一卦问心，静中得解。' },
  { key: 'zodiac', name: '星座', emoji: '✦', route: '/pages/zodiac/index',
    hint: '借星轨之光，看看今日的守护。' },
  { key: 'palm', name: '手相', emoji: '✋', route: '/pages/palm/index',
    hint: '掌中纹路，落笔成今日注脚。' },
  { key: 'tarot', name: '塔罗', emoji: '🃏', route: '/package-tarot/pages/tarot/index',
    hint: '洗一叠牌，让此刻自照。' },
  { key: 'heart', name: '心语', emoji: '✧', route: '',
    hint: '无需外求，今日与你说说心里话。' }
]

/* ---------------- 诗句池（103 首，按情绪倾向分组，依签级取组） ---------------- */
var POEMS_TONE = JY.dbPoems
var POEMS = POEMS_TONE.positive.concat(POEMS_TONE.neutral).concat(POEMS_TONE.reflective)
var TONE_BY_LEVEL = { shangshang: 'positive', shang: 'positive', zhongshang: 'positive', zhong: 'neutral', zhongxia: 'reflective', xia: 'reflective', xiaxia: 'reflective' }

/** 签诗按签级取对应情绪组，避免「下下签」配「海阔凭鱼跃」这类违和组合 */
function pickPoem(rnd, levelKey) {
  var tone = TONE_BY_LEVEL[levelKey] || 'neutral'
  var list = (POEMS_TONE[tone] && POEMS_TONE[tone].length) ? POEMS_TONE[tone] : POEMS
  return list[Math.floor(rnd() * list.length)]
}

/* ---------------- 宜 / 忌 ---------------- */
var YI = ['出行', '签约', '表白心意', '学习', '静心', '理财规划', '结交贵人', '创作', '运动', '整理收纳', '复盘总结', '助人', '早睡', '远行', '主动沟通', '种草新计划']
var JI = ['冲动行事', '拖延', '熬夜', '与人争执', '贪心冒进', '独断专行', '过度透支', '轻易许重诺', '犹豫不决', '抱怨', '暴饮暴食', '做重大决定', '随意借贷', '口舌之争', '自我否定']

/* ---------------- 幸运 ---------------- */
var LUCK_COLORS = [
  { name: '朱红', hex: '#C0392B' },
  { name: '鎏金', hex: '#C9A96E' },
  { name: '黛青', hex: '#2C5F6F' },
  { name: '月白', hex: '#DCE6EE' },
  { name: '松绿', hex: '#3E7C5A' },
  { name: '紫檀', hex: '#6E4B6E' },
  { name: '橙黄', hex: '#D98A3D' },
  { name: '天蓝', hex: '#3A7CA5' },
  { name: '胭脂', hex: '#B0506A' },
  { name: '霜灰', hex: '#8A93A0' }
]
var LUCK_TIMES = ['卯时 (5–7)', '辰时 (7–9)', '巳时 (9–11)', '午时 (11–13)', '申时 (15–17)', '酉时 (17–19)', '戌时 (19–21)']
var LUCK_DIRS = ['东', '东南', '南', '西南', '西', '西北', '北', '东北']

/* ---------------- 星语（10 句，柔和收束） ---------------- */
var XINGYU = [
  '今天不必急着要答案，允许事情慢一点展开。',
  '你比自己以为的更稳，记得对自己温柔一些。',
  '把注意力放回此刻，很多焦虑会自己散去。',
  '好事常在不经意处敲门，留一扇门给它。',
  '今天的你，值得被好好对待。',
  '不必事事周全，完成比完美更重要。',
  '给心里那个小孩一点耐心，他会带你找到光。',
  '允许自己休息，也是一种本事。',
  '今天适合对自己说一句：已经很好了。',
  '路要一步步走，今天的这一步就很好。'
]

/* ---------------- 工具 ---------------- */
function hashStr(s) {
  var h = 0x811c9dc5
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h >>> 0
}
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    var t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function getUid() {
  try {
    var u = wx.getStorageSync('sg_uid')
    if (u) return u
    u = 'u_' + hashStr(Date.now() + '|' + Math.random()).toString(36)
    wx.setStorageSync('sg_uid', u)
    return u
  } catch (e) {
    return 'anon'
  }
}
function readStore() {
  try {
    var v = wx.getStorageSync('sg_daily_v1')
    if (v && typeof v === 'object') return v
  } catch (e) {}
  return { uid: getUid(), records: {} }
}
function writeStore(s) {
  try { wx.setStorageSync('sg_daily_v1', s) } catch (e) {}
}
function dateKey(d) {
  d = d || new Date()
  var p = function (n) { return n < 10 ? '0' + n : '' + n }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
function weekday(d) {
  return '星期' + ['日', '一', '二', '三', '四', '五', '六'][(d || new Date()).getDay()]
}
/* 加权抽取：权重 <= 0 或非数字的条目不参与（旧版 `|| 1` 会把 0 当成 1，已修正） */
function weightedPick(rnd, arr, weightKey) {
  var pool = []
  var total = 0
  arr.forEach(function (x) {
    var w = x[weightKey]
    if (typeof w !== 'number' || !(w > 0)) return
    pool.push(x)
    total += w
  })
  if (!pool.length) return arr[arr.length - 1]
  var r = rnd() * total
  for (var i = 0; i < pool.length; i++) {
    r -= pool[i][weightKey]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}
function pickN(rnd, arr, n) {
  var pool = arr.slice()
  var out = []
  n = Math.min(n, pool.length)
  for (var i = 0; i < n; i++) {
    var j = Math.floor(rnd() * pool.length)
    out.push(pool.splice(j, 1)[0])
  }
  return out
}

/* 根据底色亮度返回可读文字色：浅底用深字、深底用白字 */
function hexToRgb(hex) {
  hex = (hex || '').replace('#', '')
  if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c }).join('')
  var n = parseInt(hex, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
function readableText(hex) {
  var c = hexToRgb(hex)
  var L = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255
  return L > 0.5 ? '#1B1F27' : '#FFFFFF'
}

/* ---------------- 抽签（确定性） ---------------- */
function draw(dateStr, uid) {
  var seed = hashStr(dateStr + '|' + uid)
  var rnd = mulberry32(seed)
  var level = weightedPick(rnd, LEVELS, 'weight')
  var theme = THEMES[Math.floor(rnd() * THEMES.length)]
  var poem = pickPoem(rnd, level.key)
  var yi = pickN(rnd, YI, 3)
  var ji = pickN(rnd, JI, 3)
  var luck = {
    color: LUCK_COLORS[Math.floor(rnd() * LUCK_COLORS.length)],
    num: 1 + Math.floor(rnd() * 9),
    time: LUCK_TIMES[Math.floor(rnd() * LUCK_TIMES.length)],
    dir: LUCK_DIRS[Math.floor(rnd() * LUCK_DIRS.length)]
  }
  var xingyu = XINGYU[Math.floor(rnd() * XINGYU.length)]
  var signNo = (seed % 100) + 1
  return {
    date: dateStr,
    signNo: signNo,
    level: { key: level.key, label: level.label, grade: level.grade, color: level.color, text: readableText(level.color), desc: level.desc },
    theme: { key: theme.key, name: theme.name, emoji: theme.emoji, route: theme.route, hint: theme.hint },
    poem: poem,
    yi: yi,
    ji: ji,
    luck: luck,
    xingyu: xingyu,
    time: Date.now()
  }
}

/* ---------------- 存储接口 ---------------- */
function getToday() {
  var k = dateKey()
  var s = readStore()
  return s.records[k] || null
}
function drawToday() {
  var k = dateKey()
  var s = readStore()
  s.uid = s.uid || getUid()
  if (s.records[k]) return s.records[k]
  var rec = draw(k, s.uid)
  s.records[k] = rec
  var keys = Object.keys(s.records).sort().reverse()
  if (keys.length > 60) {
    keys.slice(60).forEach(function (x) { delete s.records[x] })
  }
  writeStore(s)
  return rec
}
function getPast(dateStr) {
  var s = readStore()
  return s.records[dateStr] || null
}
function listRecent(limit) {
  var s = readStore()
  return Object.keys(s.records).sort().reverse().slice(0, limit || 7).map(function (k) {
    var r = s.records[k]
    return { date: k, label: r.level.label, color: r.level.color, emoji: r.theme.emoji, name: r.theme.name }
  })
}

/* ---------------- 打卡统计 ---------------- */
/**
 * 连续天数：今天抽过则从今天往前数；今天还没抽则从昨天往前数
 *（今天尚有补抽机会，不算断签）。两天都没抽则为 0。
 */
function streak() {
  var s = readStore()
  var recs = s.records || {}
  var d = new Date()
  d.setHours(0, 0, 0, 0)
  var todayKey = dateKey(d)
  if (!recs[todayKey]) {
    d.setDate(d.getDate() - 1)
    if (!recs[dateKey(d)]) return 0
  }
  var n = 0
  while (recs[dateKey(d)]) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

/** 累计抽签天数 */
function totalDays() {
  var s = readStore()
  return Object.keys(s.records || {}).length
}

/** 今日是否已抽 */
function drawnToday() {
  var s = readStore()
  return !!s.records[dateKey()]
}

/**
 * 某个月的日历数据（周一为一周起始）
 * @return {Array} 6×7 = 42 格，每格 { day, date, inMonth, has, label, color, emoji, isToday }
 */
function monthGrid(year, month) {
  var s = readStore()
  var recs = s.records || {}
  var todayKey = dateKey()
  var first = new Date(year, month - 1, 1)
  var startOffset = (first.getDay() + 6) % 7   // 周一=0
  var days = new Date(year, month, 0).getDate()
  var cells = []
  var i
  for (i = 0; i < startOffset; i++) cells.push({ day: 0, inMonth: false })
  for (i = 1; i <= days; i++) {
    var d = new Date(year, month - 1, i)
    var k = dateKey(d)
    var r = recs[k]
    cells.push({
      day: i,
      date: k,
      inMonth: true,
      has: !!r,
      label: r ? r.level.label : '',
      color: r ? r.level.color : '',
      emoji: r ? r.theme.emoji : '',
      isToday: k === todayKey
    })
  }
  while (cells.length < 42) cells.push({ day: 0, inMonth: false })
  return cells
}

return {
  LEVELS: LEVELS,
  THEMES: THEMES,
  POEMS: POEMS,
  YI: YI,
  JI: JI,
  LUCK_COLORS: LUCK_COLORS,
  LUCK_TIMES: LUCK_TIMES,
  LUCK_DIRS: LUCK_DIRS,
  XINGYU: XINGYU,
  dateKey: dateKey,
  weekday: weekday,
  draw: draw,
  getToday: getToday,
  drawToday: drawToday,
  getPast: getPast,
  listRecent: listRecent,
  streak: streak,
  totalDays: totalDays,
  drawnToday: drawnToday,
  monthGrid: monthGrid
}
})()
/**
 * 内容装配工具
 * ------------------------------------------------------------------
 * 职责：把「算法结果」与「内容库」拼成可直接渲染的文案对象。
 * 原则：引擎只算标识，文案一律从这里按标识取；内容库缺条目时，
 *       用结构化兜底文案顶上，保证页面永远有字可看，不出现空白页。
 * ------------------------------------------------------------------
 * 转写说明：由 utils/content.js 转写，module.exports → JY.content；逻辑一字未改。
 *   - require('./data.js')     → var DATA = JY.data（data.js 在本文件之前加载，顶层可用）
 *   - require('./hexagram.js') → 函数内取 JY.hexagram（hexagram.js 在本文件之后加载，
 *     故用 hx() 惰性取值，见 allHexagrams）
 */
JY.content = (function () {
const DATA = JY.data
// 转写：const HX = require('./hexagram.js') → 惰性（hexagram.js 在 content.js 之后加载）
function hx() {
  return JY.hexagram
}

/** 六十四卦全表：上卦 × 下卦 组合，带八宫序与上下卦名 */
function allHexagrams() {
  const list = []
  let no = 0
  const HX = hx()
  for (let ui = 0; ui < HX.ORDER.length; ui++) {
    for (let li = 0; li < HX.ORDER.length; li++) {
      no++
      list.push({
        no: no,
        name: HX.GRID_64[ui][li],
        upper: HX.ORDER[ui],
        lower: HX.ORDER[li],
        hasDetail: !!findRaw(HX.GRID_64[ui][li])
      })
    }
  }
  return list
}

function findRaw(name) {
  for (let i = 0; i < DATA.HEXAGRAMS.length; i++) {
    if (DATA.HEXAGRAMS[i].name === name) return DATA.HEXAGRAMS[i]
  }
  return null
}

/**
 * 取某一卦的完整解读。
 * 内容库有 → 直接用；没有 → 按上下卦象意生成通用文案（不会空白）
 */
function hexDetail(name, upper, lower) {
  const raw = findRaw(name)
  if (raw) return raw

  const tri = {}
  DATA.TRIGRAMS.forEach(function (t) { tri[t.name] = t })
  // 优先用调用方传入的上下卦名；缺失时才从卦名首末字回退
  const up = tri[upper] || tri[name.charAt(0)] || { key: '健', nature: '天' }
  const lo = tri[lower] || tri[name.charAt(name.length - 1)] || { key: '顺', nature: '地' }

  return {
    name: name,
    upper: upper || '',
    lower: lower || '',
    level: '待补',
    judge: '卦辞待内容库补充',
    meaning: '上' + up.nature + '下' + lo.nature + '，' + up.key + '而' + lo.key + '。',
    modern: '这一卦的专属解读还在补充中。下面是基于卦象结构给出的通用描述，供参考。',
    career: '结合卦象：宜' + up.key + '，忌冒进。',
    love: '结合卦象：以' + lo.key + '的方式回应更有效。',
    wealth: '守常为宜，避免大额决定。',
    health: '留意作息与情绪，不适请及时就医。',
    advice: ['先把问题写清楚', '做一件今天就能完成的小事'],
    tags: [up.key, lo.key]
  }
}

/** 按名字取塔罗牌 */
function cardById(id) {
  for (let i = 0; i < DATA.TAROT_CARDS.length; i++) {
    if (String(DATA.TAROT_CARDS[i].id) === String(id)) return DATA.TAROT_CARDS[i]
  }
  return null
}

/** 按 id 取星座 */
function zodiacById(id) {
  for (let i = 0; i < DATA.ZODIACS.length; i++) {
    if (DATA.ZODIACS[i].id === id) return DATA.ZODIACS[i]
  }
  return DATA.ZODIACS[0]
}

return {
  allHexagrams: allHexagrams,
  hexDetail: hexDetail,
  cardById: cardById,
  zodiacById: zodiacById
}
})()
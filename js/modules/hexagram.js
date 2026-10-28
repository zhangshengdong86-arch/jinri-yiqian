/**
 * 卦象推演基础表
 * ------------------------------------------------------------------
 * TRIGRAM_BITS：八卦爻象，数组自下而上，1 阳 0 阴
 * GRID_64：六十四卦名矩阵，行=上卦 列=下卦，顺序 乾兑离震巽坎艮坤
 * 有了这两张表，起卦结果就是真实卦名，不依赖示例库是否齐全。
 * ------------------------------------------------------------------
 * 转写说明：由 utils/hexagram.js 转写，module.exports → JY.hexagram；逻辑一字未改。
 */
JY.hexagram = (function () {
const ORDER = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']

const TRIGRAM_BITS = {
  '乾': [1, 1, 1],
  '兑': [1, 1, 0],
  '离': [1, 0, 1],
  '震': [1, 0, 0],
  '巽': [0, 1, 1],
  '坎': [0, 1, 0],
  '艮': [0, 0, 1],
  '坤': [0, 0, 0]
}

const GRID_64 = [
  ['乾为天', '天泽履', '天火同人', '天雷无妄', '天风姤', '天水讼', '天山遁', '天地否'],
  ['泽天夬', '兑为泽', '泽火革', '泽雷随', '泽风大过', '泽水困', '泽山咸', '泽地萃'],
  ['火天大有', '火泽睽', '离为火', '火雷噬嗑', '火风鼎', '火水未济', '火山旅', '火地晋'],
  ['雷天大壮', '雷泽归妹', '雷火丰', '震为雷', '雷风恒', '雷水解', '雷山小过', '雷地豫'],
  ['风天小畜', '风泽中孚', '风火家人', '风雷益', '巽为风', '风水涣', '风山渐', '风地观'],
  ['水天需', '水泽节', '水火既济', '水雷屯', '水风井', '坎为水', '水山蹇', '水地比'],
  ['山天大畜', '山泽损', '山火贲', '山雷颐', '山风蛊', '山水蒙', '艮为山', '山地剥'],
  ['地天泰', '地泽临', '地火明夷', '地雷复', '地风升', '地水师', '地山谦', '坤为地']
]

/** 三爻 → 卦名 */
function trigramOf(bits) {
  for (const name in TRIGRAM_BITS) {
    const b = TRIGRAM_BITS[name]
    if (b[0] === bits[0] && b[1] === bits[1] && b[2] === bits[2]) return name
  }
  return '坤'
}

/** 六爻（自下而上，1 阳 0 阴）→ 卦名与上下卦 */
function hexagramOf(yao) {
  const lowerBits = [yao[0], yao[1], yao[2]]
  const upperBits = [yao[3], yao[4], yao[5]]
  const lower = trigramOf(lowerBits)
  const upper = trigramOf(upperBits)
  const li = ORDER.indexOf(lower)
  const ui = ORDER.indexOf(upper)
  const name = GRID_64[ui][li]
  return { lower: lower, upper: upper, name: name }
}

/** 互卦：二三四爻为下卦，三四五爻为上卦 */
function mutualOf(yao) {
  const lowerBits = [yao[1], yao[2], yao[3]]
  const upperBits = [yao[2], yao[3], yao[4]]
  const lower = trigramOf(lowerBits)
  const upper = trigramOf(upperBits)
  return { lower: lower, upper: upper, name: GRID_64[ORDER.indexOf(upper)][ORDER.indexOf(lower)] }
}

/** 数字 → 1..8 的卦序（0 视为 8） */
function numToTrigram(n) {
  let v = Math.abs(Math.floor(n)) % 8
  if (v === 0) v = 8
  return ORDER[v - 1]
}

/** 总数 → 动爻位（1..6，0 视为 6） */
function numToMoving(n) {
  let v = Math.abs(Math.floor(n)) % 6
  if (v === 0) v = 6
  return v
}

/** 爻象可视化：返回自下而上的 6 层描述 */
function renderYao(yao, moving) {
  const out = []
  for (let i = 0; i < 6; i++) {
    out.push({
      index: i + 1,
      yang: yao[i] === 1,
      moving: !!moving[i],
      mark: yao[i] === 1 ? (moving[i] ? '○' : '—') : (moving[i] ? '×' : '- -')
    })
  }
  return out
}

return {
  ORDER: ORDER,
  TRIGRAM_BITS: TRIGRAM_BITS,
  GRID_64: GRID_64,
  trigramOf: trigramOf,
  hexagramOf: hexagramOf,
  mutualOf: mutualOf,
  numToTrigram: numToTrigram,
  numToMoving: numToMoving,
  renderYao: renderYao
}
})()
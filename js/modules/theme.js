/**
 * 类目主题配置（JS 侧）
 * 与 styles/tokens.wxss、styles/themes.wxss 中的 CSS 变量一一对应
 * 作用：进入类目页时动态改写原生导航栏配色，保证原生栏与页面主题一致
 * 转写说明：由 utils/theme.js 转写，module.exports → JY.theme；逻辑与数据一字未改。
 */
JY.theme = (function () {
const ROOT = {
  key: 'root',
  name: '今日宜签',
  navBg: '#0E1220',
  navText: '#ffffff',
  bg: '#0E1220',
  accent: '#C9A96E'
}

const CATEGORIES = [
  {
    key: 'divination',
    name: '卜卦',
    en: 'Divination',
    desc: '六爻 · 梅花易数',
    slogan: '一卦一问，静心自观',
    navBg: '#EFE9DC',
    navText: '#000000',
    bg: '#F3EFE6',
    accent: '#9E2B25',
    accent2: '#C8A96A',
    emoji: '☯',
    route: '/pages/divination/index',
    // 首页封面底部风格胶囊：卜卦不展示，留空即可（填回文案即恢复）
    styleTag: '',
    tone: 'light'
  },
  {
    key: 'zodiac',
    name: '星座',
    en: 'Zodiac',
    desc: '运势 · 配对 · 星盘',
    slogan: '星轨流转，照见今日',
    navBg: '#0B1026',
    navText: '#ffffff',
    bg: '#0B1026',
    accent: '#7C6BFF',
    accent2: '#38E1D0',
    emoji: '✦',
    route: '/pages/zodiac/index',
    styleTag: '',
    tone: 'dark'
  },
  {
    key: 'palm',
    name: '手相',
    en: 'Palmistry',
    desc: '手型 · 主线 · 掌丘',
    slogan: '掌中纹路，落笔成解',
    navBg: '#F5EADC',
    navText: '#000000',
    bg: '#FAF3EC',
    accent: '#C96F4A',
    accent2: '#7A8B5A',
    emoji: '✋',
    route: '/pages/palm/index',
    styleTag: '',
    tone: 'light'
  },
  {
    key: 'tarot',
    name: '塔罗',
    en: 'Tarot',
    desc: '牌阵 · 正逆位',
    slogan: '洗牌落定，照见此刻',
    navBg: '#140B22',
    navText: '#ffffff',
    bg: '#140B22',
    accent: '#C9A227',
    accent2: '#8E6BC8',
    emoji: '✧',
    route: '/package-tarot/pages/tarot/index',
    styleTag: '',
    tone: 'dark'
  }
]

function get(key) {
  if (!key) return ROOT
  for (let i = 0; i < CATEGORIES.length; i++) {
    if (CATEGORIES[i].key === key) return CATEGORIES[i]
  }
  return ROOT
}

return { ROOT: ROOT, CATEGORIES: CATEGORIES, get: get }
})()
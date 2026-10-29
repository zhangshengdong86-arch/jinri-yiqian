/**
 * 图片资源清单 —— 全项目唯一需要手动维护的图片文件
 * ------------------------------------------------------------------
 * 组件 components/ph-img 会自动来这里取地址：
 *   resolve(key) 优先查 MAP[key]；MAP 没填且 AUTO=true 时，按 /assets/<key> 约定自动拼。
 *   图片不存在 / 加载失败，组件自动回落到原来的「符号 + 虚线占位」，不会开天窗。
 *
 * 你要做的只有两步：
 *   1. 把图片按 key 里的路径放进 miniprogram/assets/<目录>/<文件名>
 *   2. （可选）在下面的 MAP 里显式指定地址，比如换成 CDN 的 https:// 链接
 *
 * 详见 docs/图片植入手册.md
 * ------------------------------------------------------------------
 * 转写说明：由 utils/images.js 转写，module.exports → JY.images；逻辑与清单一字未改。
 *   - require('./asset-manifest.js') → 函数内惰性取 JY.assetManifest（转写约定，
 *     首访时构造 EXISTS，语义与原文一致）
 *   - 路径前缀：原 '/assets/' → 'assets/'（相对路径，基准是 index.html）
 *   - PKG_BASE：原 tarot 分包 '/package-tarot/assets/' → 'assets/tarot/'
 *     （key 自带 'tarot/' 前缀，拼接时去掉该前缀，避免出现 assets/tarot/tarot/ 重复路径）
 */
JY.images = (function () {

// 自动模式：按 assets/<key> 约定找图。关掉则只有 MAP 里显式配置的才生效（控制台不会有加载失败提示）
var AUTO = true

// 真实存在的图片清单（由 tools/sync-assets.js 扫描 assets/ 生成）
// 只有清单里的 key 才会返回地址 —— 没放图的占位不会发起请求，控制台不再刷 404
var EXISTS = null
// 转写：var manifest = require('./asset-manifest.js') → 惰性构造 EXISTS（函数内取 JY.assetManifest）
function ensureExists() {
  if (EXISTS) return EXISTS
  EXISTS = {}
  try {
    var manifest = JY.assetManifest
    if (manifest && manifest.length) {
      manifest.forEach(function (k) { EXISTS[k] = true })
    }
  } catch (e) { /* 清单缺失时退回原行为 */ }
  return EXISTS
}

// 精准覆盖：key -> 图片地址（本地 /assets/... 或远程 https://...）
// 留空字符串 = 走 AUTO 约定路径；填了就以这里为准
var MAP = {
  // —— 品牌与入口层 ——
  'brand/brand_logo.png': '',
  'brand/cat_icon_divination.webp': '',
  'brand/cat_icon_zodiac.webp': '',
  'brand/cat_icon_palm.webp': '',
  'brand/cat_icon_tarot.webp': '',

  // —— 卜卦 ——
  'divination/dv_coin.png': '',
  'divination/dv_hexagram_frame.webp': '',
  'divination/dv_header_ink.png': '',

  // —— 星座 ——（12 个主视觉 + 12 个符号图标为动态 key，在 AUTO 模式下放对文件名即可，无需在此登记）
  'zodiac/zd_today_card.png': '',

  // —— 手相 ——
  'palm/pm_header_hand.png': '',
  'palm/pm_icon_camera.png': '',
  'palm/pm_icon_quiz.webp': '',
  'palm/pm_guide_hand.webp': '',
  'palm/pm_result_hand.webp': '',

  // —— 塔罗 ——（78 张牌面为动态 key：tarot/tarot_card_0.png ... tarot_card_77.png）
  'tarot/tr_header_arcana.webp': '',
  'tarot/tarot_back.webp': ''
}

/**
 * 按 key 解析图片地址
 * @param {string} key 形如 'tarot/tarot_back.png'
 * @returns {string} 地址；'' 表示用占位
 */
// 分包资源：tarot 卡图已随页面移入分包 package-tarot，主包不占体积
// 转写：网页版无分包，'tarot/' 映射为 assets/tarot/（相对路径，基准是 index.html）
var PKG_BASE = { 'tarot/': 'assets/tarot/' }

// 缓存刷新戳：整批调整图片后改这个值，强制全网 CDN / 浏览器缓存失效
var ASSET_V = '?v=20261028f'

function resolve(key) {
  if (!key) return ''
  var v = MAP[key]
  if (typeof v === 'string' && v) return v        // MAP 显式配置了地址，优先
  if (!AUTO) return ''
  // 清单为空（尚未同步过）时保持原行为；否则只给真实存在的文件返回地址
  var known = Object.keys(ensureExists()).length
  if (!known || ensureExists()[key]) {
    for (var p in PKG_BASE) {
      // 转写：key 自带目录前缀（如 'tarot/xxx.webp'），映射值已含 'assets/tarot/'，
      //       拼接时去掉 key 的 'tarot/' 前缀，避免重复目录
      if (key.indexOf(p) === 0) return PKG_BASE[p] + key.slice(p.length) + ASSET_V
    }
    return 'assets/' + key + ASSET_V    // 转写：原 '/assets/' + key → 相对路径
  }
  return ''
}

return {
  MAP: MAP,
  resolve: resolve,
  isAuto: function () { return AUTO },
  setAuto: function (v) { AUTO = !!v }
}
})()
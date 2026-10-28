# js/modules 交付说明（数据与工具模块组 T-A）

本目录为原 `source/miniprogram/utils/**` 的网页版转写，全组契约见根目录 `TRANSFER_SPEC.md`。
所有模块挂 `JY` 命名空间，无 module 系统、零外部依赖；加载顺序由 `index.html` 声明（asset-manifest → data → db/* → content → hexagram → theme → links → util → store → daily → images → sfx → poster → palm/*）。

## 一、文件清单（20 个，与 index.html 引用一致）

| 产物路径 | 命名空间 | 原文件 |
|---|---|---|
| js/modules/asset-manifest.js | `JY.assetManifest` | utils/asset-manifest.js |
| js/modules/data.js | `JY.data` | utils/data.js |
| js/modules/db/hexagrams.js | `JY.dbHexagrams` | utils/db/hexagrams.js |
| js/modules/db/poems.js | `JY.dbPoems` | utils/db/poems.js |
| js/modules/db/tarot.js | `JY.dbTarot` | utils/db/tarot.js |
| js/modules/content.js | `JY.content` | utils/content.js |
| js/modules/hexagram.js | `JY.hexagram` | utils/hexagram.js |
| js/modules/theme.js | `JY.theme` | utils/theme.js |
| js/modules/links.js | `JY.links` | utils/links.js |
| js/modules/util.js | `JY.util` | utils/util.js |
| js/modules/store.js | `JY.store` | utils/store.js |
| js/modules/daily.js | `JY.daily` | utils/daily.js |
| js/modules/images.js | `JY.images` | utils/images.js |
| js/modules/sfx.js | `JY.sfx` | utils/sfx.js |
| js/modules/poster.js | `JY.poster` | utils/poster.js |
| js/modules/palm/config.js | `JY.palmConfig` | utils/palm/config.js |
| js/modules/palm/quality.js | `JY.palmQuality` | utils/palm/quality.js |
| js/modules/palm/providers-mock.js | `JY.palmMock` | utils/palm/providers/mock.js |
| js/modules/palm/providers-cloud.js | `JY.palmCloud` | utils/palm/providers/cloud.js |
| js/modules/palm/vision.js | `JY.palmVision` | utils/palm/vision.js |

### 数据完整性核验（已跑脚本验证）
- 64 卦辞（`db/hexagrams.js`）、103 首签诗（`db/poems.js`，positive 38 / neutral 38 / reflective 27）、40 张塔罗小牌（`db/tarot.js`）：与源码 **diff 仅我添加的包装注释/挂载行**，数据一字未改。
- `asset-manifest.js` 清单 109 键与源码一一对应（含 tarot 80 键：tarot_back + 78 牌面 + tr_header_arcana）。
- `data.js` 全部文案（NOTICE / 12 星座 / 5 手型 / 3 主线 forms / 22 大牌 + 16 小牌 / SPREADS 等）与源码 diff 仅见下述结构改动。
- 运行时冒烟测试 47 项全过：`JY.data.HEXAGRAMS.length === 64`、`JY.data.TAROT_CARDS.length === 78` 且全有 emoji、`content.allHexagrams().length === 64`、链接往返、store/daily 主流程、palm 全链路（含 cloud 切换后 autoFallback 回落且 `fallbackFrom==='SERVICE_UNAVAILABLE'`）等。

## 二、与原文的行为差异清单（逐条说明）

### 1. data.js —— 导出键 HEXAGRAMS / TAROT_CARDS 改为惰性 getter（唯一的结构性改动）
- **原因**：`index.html` 中 data.js（第 3 位）**先于** db/hexagrams.js、db/tarot.js（第 4、6 位）加载，原文件的顶层 `require('./db/hexagrams.js')` 与 `].concat(MINOR_EXTRA)` 在网页版加载期必然取不到值。
- **做法**：`get HEXAGRAMS()` / `get TAROT_CARDS()`（ES5 getter，键序与原文一致）；`TAROT_CARDS` 原数组末的 `.concat(MINOR_EXTRA)` 与原 emoji/element 打标循环原样移入 `ensureTarot()`，首次访问时执行。首次访问发生在任何业务调用（页面渲染、content.findRaw 等）时，此时 db 文件必已加载，**取值与原文完全一致**（78 张、打标齐全，已测试）。
- 其余导出键（NOTICE/SUIT_EMOJI/TRIGRAMS/COIN_RULES/MEIHUA_METHODS/ZODIACS/FORTUNE_DIMS/FORTUNE_POOL/MATCH_LEVELS/PALM_TYPES/PALM_LINES/LINE_TAGS/LINE_READINGS/PALM_QUIZ/SPREADS/DRAW_RULES）原样保留。

### 2. content.js —— require('./hexagram.js') 改为函数内惰性
- **原因**：`index.html` 中 content.js（第 7 位）**先于** hexagram.js（第 8 位）加载。
- **做法**：原 `const HX = require('./hexagram.js')` → `function hx() { return JY.hexagram }`，`allHexagrams()` 内部第一行 `const HX = hx()`，循环体一字未改；`DATA`（data.js 先加载）仍顶层 `JY.data`。

### 3. images.js —— 路径与清单延迟
- `resolve()` 里原 `'/assets/' + key` → `'assets/' + key`（相对路径，基准 index.html）。
- `PKG_BASE` 原 `{ 'tarot/': '/package-tarot/assets/' }` → `{ 'tarot/': 'assets/tarot/' }`；由于 key 自带 `tarot/` 前缀，拼接改为 `PKG_BASE[p] + key.slice(p.length)`，避免出现 `assets/tarot/tarot/...` 重复目录（`resolve('tarot/tarot_back.webp') === 'assets/tarot/tarot_back.webp'`，已测试）。
- 原顶层 `require('./asset-manifest.js')` → 函数内惰性构造 EXISTS（`ensureExists()`），语义与原文一致（清单空则保持原行为；先加载关系已由 index.html 保证）。
- **注意**：`MAP['zodiac/zd_today_card.png']` 是 .png 而清单实际文件是 `zd_today_card.webp`，此为**原文件既有写法**，网页版 resolve 会按其返回空（走占位），与小程序行为一致，未擅自“修正”。页面组如需显示该图请直接传 `zodiac/zd_today_card.webp`。

### 4. sfx.js —— 音效空实现
- 顶部注释「网页版暂不播音频，音效逻辑见 source/utils/sfx.js」；导出键全保留：`play`（返回与原文同构的 silent 句柄 `{startedAt:0,impactAt:0,endsAt:0,stop,ctx:null,silent:true}`，页面动画对时逻辑不受影响）、`unlock`（恒 false）、`stop`（空）、`set`（恒 {}）、`isEnabled/setEnabled`（保留 sg_sfx_v1 存储开关，供设置 UI）、`isSupported`（恒 false，页面据此隐藏开关）。
- 原 WebAudio 合成实现（OPTS 参数表、噪声/琶音/混响等约 300 行）不随网页版迁移。

### 5. poster.js —— 画布边界替换，绘制逻辑一字未改
- `make(page, sel, spec, cb)` 签名与原文一致（页面可照原文调用 `JY.poster.make(this, '#posterCanvas', spec, {success, fail})`）；`render/skin/wrap/roundRect/SKINS/W/save` 全部原样。
- `wx.createSelectorQuery().in(page).select(sel).fields({node:true,size:true}).exec(cb)` **照原样调用**（core 已提供该 shim，同步返回真实 DOM canvas 节点）；随后直接用**原生 2d 上下文**绘制，宋体、字重、圆角（quadraticCurveTo）、渐变、globalAlpha **全部保留，零降级**；measureText 为原生精确宽度。测量→重设尺寸→二次 scale（dpr）→绘制的两步走流程原文保留。
- 唯一替换：末尾 `wx.canvasToTempFilePath({ canvas: canvas, ... })` 是“canvas 节点导出”，core 的 canvasToTempFilePath shim 只认 `canvasId` 会话，故改为对该 DOM canvas 直接 `toDataURL('image/png')`——**success(r.tempFilePath) 收到的即 PNG dataURL**，与 core 约定一致，页面拿它调 `JY.saveDataUrl` 下载（替换处有注释存档原文）。
- `save(path, cb)`：原 wx.saveImageToPhotosAlbum（相册）/wx.previewImage（预览）→ 网页版改为触发下载（`JY.saveDataUrl`，函数内引用），回调契约不变（成功 cb.success / 失败 cb.fail），原文以注释存档。
- **页面组要求**：调用方页面 render() 里必须渲染 `<canvas id="posterCanvas" width="375" height="800"></canvas>`；不想露出的画布由页面 CSS 定位到视口外或隐藏（本模块不改 DOM 样式）。

### 6. palm/quality.js —— 入参与采样环境替换（校验算法逐行一致）
- 入参从「wx 临时文件路径」改为 **dataURL 或 HTMLImageElement**（与 vision/mock 对齐）。
- `wx.createOffscreenCanvas({type:'2d',width,height})` → `document.createElement('canvas')`（同样 256×256 离屏取样）；`canvas.createImage()/onload/onerror` → `JY.loadImage(src)`（core 提供，dataURL 与 Image 元素均可，图片**加载完成后再** drawImage 读像素）。
- 原 1.5s 超时放行兜底、skipped 语义、`{ok,code,message?,guide?,metrics}` 结构、判定顺序（曝光→纯色→失焦→取景）、`_internals`（computeMetrics/isSkin）全部保留；拒绝时同样附带 metrics 供调参。
- 页面组调用注意：原「选完图拿临时路径」在网页版应传文件读取后的 dataURL（或 Image 元素）。

### 7. palm/vision.js —— require 映射按 §2 表，逻辑原样
- `config→JY.palmConfig`、`quality→JY.palmQuality`、`mock→JY.palmMock`、`cloud→JY.palmCloud`（均先于本文件加载，顶层引用安全）。
- ERRORS 文案 / fail / setProvider / currentProvider / toPreset / 倾斜判定（|tilt|>28）一字未改；`analyze` 入参同上改为 dataURL 或 Image 元素；`quality.check(src) → PROVIDERS[name].analyze(src, metrics)` 流程原样（含降级时置 degraded=true、note、fallbackFrom）。

### 8. palm/providers-mock.js —— 逻辑原样
- 随机手型 / 线形标签逻辑一字未改，参数改名为 src（不读取图片）；`_util` 映射 JY.util（原文就导出）。

### 9. palm/providers-cloud.js —— 永久失败 + 原文存档
- `analyze()` **永远** `Promise.reject({ code: 'SERVICE_UNAVAILABLE', ... })`，由 vision.js 按 autoFallback 回落 mock（结果标注示例）。
- 原 wx.cloud.callFunction 相关实现（readBase64 / normalize / 超时保护）整段 `//` 注释存档于文件末尾，网址注释「网页版无云端，永远走 mock 降级」。

### 10. palm/config.js —— provider='mock'、autoFallback=true（原文即如此，检查确认，一字未改）。

### 11. 其余纯逻辑模块（hexagram / theme / links / util / store / daily / db 三件）
- 仅改 `require → JY.x` 与 `module.exports → return`（IIFE 包裹），逻辑、文案、注释一字未改。daily.js 的 `THEME`/`POEMS_TONE` 顶层引用安全（theme、db/poems 均先加载）。

## 三、自检结果
- `node --check`：20 个文件全部通过（E:\ai0\node.exe v24.20.0）。
- 禁用弹窗函数扫描（原始 alert / confirm / prompt 调用）：**零命中**。
- 数据核对：db 三件/content/theme/links 等经 diff 复核，除上文所列包装与惰性结构外无任何差异；manifest 109 键与源码全等。
- 运行时冒烟（vm 模拟加载顺序）：47 项断言全过（含惰性 getter、78 张拼接打标、链接往返、autoFallback 链路）。

## 四、给 Lead 的注意点
1. **加载顺序依赖 index.html 现状**：data.js 必须在 db/hexagrams.js、db/tarot.js 之前（现序已满足惰性策略）；content.js 在 hexagram.js 之前（已按函数内引用处理）；指向 JY.dbPoems / JY.assetManifest 的惰性引用均要求对应文件在 data/content/images 之后的任意位置先于业务调用。若调整顺序，勿把 db/* 移到 data.js 之前即可完全兼容。
2. **poster 对接方式（Lead 通知确认）**：对外签名与原文一致（`JY.poster.make(this, '#posterCanvas', spec, { success(path), fail(msg) })`），走 core 新的 createSelectorQuery shim + 原生 ctx，最终 success 传 **dataURL**，页面用 `JY.saveDataUrl` 下载；页面必须渲染 `<canvas id="posterCanvas" width="375" height="800">`。
3. **palm 调用面变化**：`JY.palmVision.analyze / JY.palmQuality.check / JY.palmMock.analyze` 入参为 dataURL 或 HTMLImageElement（非 wx 临时路径）；页面组在文件选择后需读取为 dataURL 再传（可复用 JY.loadImage/FileReader）。
4. **JY.page 路由带前导斜杠** 由 Lead 统一，本组 links/util 产出与原文一致的 `/pages/...` 链接，无需改动。
5. `images.resolve` 对「MAP 显式空串 + 清单未收录」的 key 返回空（如 `zodiac/zd_today_card.png`、`palm/pm_icon_camera.png`），与小程序行为一致；页面组如需用这些图请传 .webp 真实文件名。
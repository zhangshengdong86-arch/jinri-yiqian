# 「今日宜签」Web 版转写规范（TRANSFER SPEC）

> 目标：把微信小程序 `source/miniprogram/` 完整转写为**纯静态网页**，
> 双击 `index.html` 即可在浏览器使用（file:// 协议），不依赖 Node、无构建、无后端。
> 本文件是全体转写成员的**唯一契约**，务必先通读再动手；有疑问先在交付说明里写明，不要自行发明接口。

---

## 0. 目录约定

```
jinri-yiqian-web/
├── index.html            # 唯一入口（Lead 维护，勿改）
├── TRANSFER_SPEC.md      # 本规范
├── scripts/check.js      # 本地自检脚本（Lead 维护）
├── css/
│   ├── tokens.css themes.css base.css ui.css   # 全局样式（Lead 维护）
│   └── pages/<页面slug>.css                    # 每页一个，由转写者交付
├── js/
│   ├── core.js           # 运行时：wx shim / 路由 / 组件渲染器（Lead 维护）
│   ├── modules/          # 原 utils/ 转写，一文件一模块
│   │   ├── data.js content.js hexagram.js daily.js theme.js store.js
│   │   ├── util.js links.js images.js asset-manifest.js sfx.js poster.js
│   │   ├── db/hexagrams.js db/poems.js db/tarot.js
│   │   └── palm/config.js palm/quality.js palm/vision.js palm/providers-mock.js palm/providers-cloud.js
│   └── pages/<页面slug>.js   # 每页一个，由转写者交付
└── assets/               # 图片（已由 Lead 复制到位，直接引用，勿新建目录）
    ├── brand/ divination/ palm/ zodiac/ share/
    └── tarot/            # 78 张牌面 tarot_card_0..77.webp + tarot_back.webp + 头图
```

`source/` 目录是**只读原件，永远不要修改**。所有产出写到上面约定的新路径。

---

## 1. 总原则

1. **JS 逻辑照搬，只改边界**：页面的 data / onLoad / onShow / 事件方法**原样保留**逻辑，
   唯一改动是 `require` 引用、`Page({...})` 注册、WXML→render()、个别 wx API 在 SPEC 里注明的替代。
2. **全局命名空间 `JY`**：所有模块挂 `JY.<name>`；页面用 `JY.page(route, cfg)` 注册。
   禁止使用 ES module（file:// 下 import 会被 CORS 拦截）。
3. **零外部依赖**：不引 CDN、不 npm、不 fetch、不用 alert/confirm/prompt（弹窗走 wx.showModal 的 shim）。
4. **中文注释**。
5. 交付文件必须通过 `node --check`。

---

## 2. 模块转写（原 utils/*.js → js/modules/*.js）

文件骨架（以 theme.js 为例）：

```js
/* 由 utils/theme.js 转写：require→JY.*，module.exports→JY.theme；逻辑未改 */
JY.theme = (function () {
  var ROOT = { ...原来内容... };        // 函数体原样
  function get(key) { ... }
  return { ROOT: ROOT, CATEGORIES: CATEGORIES, get: get };
})();
```

规则：
- 文件内 `const xxx = require('./yyy.js')` → `var xxx = JY.yyy`；
  若 require 目标是本组文件（如 palm 内部互引 `./config`→`JY.palmConfig`），用下述「palm 子命名空间」。
  顶层取不到就报错的（如 images.js 顶层 require asset-manifest）改为**函数内延迟取用**或按「模块名清单」注册声明（见 §7 加载顺序，所有 modules/*.js 在任何页面脚本之前加载，因此函数期引用恒可用；只有顶层直接解构才需要小心，优先写成函数内）。
- `module.exports = {...}` → `return {...}`，外层 IIFE 包住。
- 其他逻辑**一字不改**（含注释）。`wx.*` 调用保持原样——core.js 提供全套 shim。
- `getApp()` 保持原样可用。
- `getCurrentPages()` 保持原样可用。

### palm 子命名空间（统一改名）

| 原文件 | 转写后命名空间 | 内部 require 改写 |
|---|---|---|
| utils/palm/config.js | `JY.palmConfig` | `./config.js`→`JY.palmConfig` |
| utils/palm/quality.js | `JY.palmQuality` | `./config.js`→`JY.palmConfig` |
| utils/palm/vision.js | `JY.palmVision` | `./config.js`→`JY.palmConfig`、`./quality.js`→`JY.palmQuality`、`./providers/mock.js`→`JY.palmMock`、`./providers/cloud.js`→`JY.palmCloud` |
| utils/palm/providers/mock.js | `JY.palmMock` | `../../data.js`→`JY.data`、`../../util.js`→`JY.util` |
| utils/palm/providers/cloud.js | `JY.palmCloud` | 转写为**永远失败**的 provider：`analyze()` 返回 `Promise.reject({code:'SERVICE_UNAVAILABLE'})`；`wx.cloud.callFunction` 的调用可整段注释掉并注明「网页版无云端」。 |

`utils/palm/vision.js` 的 `config.js` 中 `provider` 默认值必须为 `'mock'`、`autoFallback: true`（保证网页版不依赖后端）。

### 特例说明
- `utils/images.js`：`PKG_BASE` 的 `'tarot/'` 映射改为 `'assets/tarot/'`；`'/assets/'` 前缀改为 `'assets/'`（相对路径，配合 `../assets/` 计算：**页面脚本在 js/ 下、页面在 index.html 域下渲染，HTML 里的相对路径基准是 index.html**，所以 resolve 返回带 `assets/` 前缀的字符串即可）。`asset-manifest.js` 转写为 `JY.assetManifest = (function(){ return [ ...原清单键数组... ]; })();`（键数组，带 tarot 动态键吗？——清单只保留 source 里写死的键；tarot 动态键在 MANIFEST 里若有 78 张则照搬）。
- `utils/sfx.js`：转写时音效全部空实现（函数存在、直接 return），保留导出键，注释「网页版暂不播音频」。
- `utils/poster.js`：保留**生成分享长图的绘制逻辑**；把 `wx.createCanvasContext('poster')` 当原样调用（core 提供 shim，见 §5 canvas）；`wx.canvasToTempFilePath` 当原样调用（shim 已把它改为**同步**执行 success 回调并传 `{tempFilePath: <dataURL>}`）。注意 shim 的 `drawImage(filePath)` 支持 dataURL 与相对路径。页面侧拿到 dataURL 后用 core 提供的 `JY.saveDataUrl(url, filename)` 触发浏览器下载。请梳理 poster.js 导出：`JY.poster.draw(cat, record)` 描述 返回 Promise<dataURL> 或保留原文案结构即可，页面调用处由页面组自行对齐（在页面注释里写明怎么调）。

### 数据与逻辑模块（务必逐字保留数据）
`data.js / content.js / hexagram.js / db/hexagrams.js / db/poems.js / db/tarot.js / daily.js / store.js / links.js / util.js`
- 数据表（64 卦辞、103 签诗、78 牌义、12 星座、NOTICE 等）**一个标点都不能改**。
- 注意 `data.js` 的导出里除了 NOTICE 还有 CONSULT 等；`daily.js` 导出 getToday/streak/totalDays/history 等方法；`links.js` 还有 `fromOptions`、`share` 方法——全部保留。

---

## 3. 页面转写（原 pages/x/*.{js,wxml,wxss} → js/pages/`<slug>`.js + css/pages/`<slug>`.css）

slug 对照表（**必须照此命名**）：

| 原路径 | slug |
|---|---|
| pages/index/index | `index` |
| pages/divination/index | `divination-index` |
| pages/divination/cast | `divination-cast` |
| pages/divination/glossary/index | `divination-glossary` |
| pages/zodiac/index | `zodiac-index` |
| pages/zodiac/detail | `zodiac-detail` |
| pages/zodiac/match/index | `zodiac-match` |
| pages/palm/index | `palm-index` |
| pages/palm/reading | `palm-reading` |
| pages/palm/lines/index | `palm-lines` |
| pages/daily/index | `daily-index` |
| pages/daily/calendar | `daily-calendar` |
| pages/history/index | `history` |
| pages/about/index | `about` |
| package-tarot/pages/tarot/index | `tarot-index` |
| package-tarot/pages/tarot/reading | `tarot-reading` |
| package-tarot/pages/tarot/cards/index | `tarot-cards` |

### 3.1 页面 JS 骨架

```js
/* 由 pages/xxx 三件套转写 */
JY.page('pages/xxx/xxx', {
  navTitle: '页面标题文案（照抄 navigationBarTitleText）',
  themeKey: 'divination',        // 挂载 t-divination 主题（控制页面色板）
                                 // 可选值: 'divination'|'zodiac'|'palm'|'tarot'|''（留空=root）
  themeKey2: 't-root',           // 可选：第二主题类只挂在这页容器上（用于首页四卡/多主题页）

  data: { ...原 data 原样... },

  onLoad: function (options) { ...原 onLoad 原样... },
  onShow: function () { ...原 onShow 原样... },
  // ... 原页面上所有方法原样（含 goXxx / 事件回调）...

  render: function () { return `
    ...WXML 转换的 HTML（见 3.2）...
  `; }
});
```

- `this.setData({...})`、`this.data`、`this.options`、`this.route` 由 core.js 提供，**照原样使用**。
- 原 `onShareAppMessage` / `onShareTimeline` → 删除；分享动作改成页面内按钮调 `JY.poster.xxx` + `JY.saveDataUrl`（海报组约定：分享按钮统一 `data-act="share"`，页面实现 share 方法：调 poster → saveDataUrl 下载长图提示）。
- 原 `onPullDownRefresh` → 删除。
- `getApp()` 照用；`app.applyTheme(catKey)/resetTheme()` 照用（core 实现）。

### 3.2 WXML → HTML（render 返回的模板字符串）

| WXML | 转为 |
|---|---|
| `<view class="a">` | `<div class="a">`（`<text>` 用 `<span>`；`<image>` 用 `<img>`；`<input>` `<textarea>` `<button>` 保留同名标签，button 加 `type="button"`） |
| `{{expr}}` | `${expr}`（模板字符串内 JS 表达式；`{{}}` 里的字段原来 this.data 的，原样写在模板表达式即可，core 渲染时以 this 为上下文） |
| `wx:if="{{x}}"` | JS 条件：先算 `var showX = x`，模板里 `${showX ? \`...\` : ''}` |
| `wx:for="{{list}}" wx:key="k"` | `(this.data.list||[]).map(function(item,index){ return \`...\` }).join('')`；循环项引用 `item`/`index` 变量名不变 |
| `bindtap="fn"` | `data-act="fn"` |
| `data-xxx="{{item.xxx}}"` | 见 §6 dataset 规则 |
| `<disclaimer type="short"/>` | `${JY.ui.disclaimer({type:'short'})}` |
| `<ph-img .../>` | `${JY.ui.phImg({emoji:'☯', img:'brand/brand_logo.png', name:'...', usage:'...', ratio:'1:1', spec:'96×96 @2x', radius:'50%'})}`（属性名逐一对应，属性转小驼峰不变） |
| `<sheet-card title="a" sub="b">内层</sheet-card>` | `${JY.ui.sheetCard({title:'a', sub:'b', body:\`内层\`})}` |
| 注释 `<!-- -->` | 可保留为 JS 注释或删除 |
| `hover-class` / `animation-delay` 内联 style | style 属性原样输出为行内 style；hover 反馈：给元素加 CSS class 名 `<原class>--hover` 不必写 hover js，桌面端用 CSS `:hover`（在页面 css 里把 `--hover` 类名同时写成 `:hover` 选择器即可） |
| `<canvas canvas-id="x"/>` | `<canvas id="x" width="375" height="800"></canvas>`（设计 750rpx=375px；高清可 ×2） |
| `<picker>`/`<radio-group>` 等表单控件 | 换成 `<select>`/`<div data-act>` 自绘选项；交互状态写进 data 并在 render 里渲染 |

**渲染上下文**：render 在 `this` 上下文中以 `this.data` 数据执行（core 用 `new Function` 包裹页面实例为 `this`——即模板内可直接写 `this.data.xxx`，也支持 `${this.data.xxx}`；写 `${xxx}` 时 core 会在存在实例属性时兜底）。为了稳妥：**模板内一律用 `this.` 前缀**（例如 `${this.data.today}`）。

### 3.3 wxss → css（css/pages/<slug>.css）

- 每条 `-?\d+(\.\d+)?rpx` 的值 ÷2，单位改 px（`750rpx`→`375px`，`-8rpx`→`-4px`，保留原始小数精度）。禁止用 calc 偷懒。
- 选择器里 `page` → `body`（删掉这个规则也行，因为全局 css 已完成 body 样式）；`view` → `div`（或删：HTML 里已无 view）；`text` → `span`。
- `@import` 删除（全局已按 tokens→themes→base→ui 顺序加载）。
- 只保留**本页独有**的类；`.pg / .pg__inner / .u-* / .dc / .ph / .sc / .t-*` 等全局类已在全局 css，不要重复。
- 允许新增少量辅助类，命名前缀 `w-`（web 专属），并在页面 js 顶部注释说明。
- 不用 scoped/命名冲突担心：core 按「每次只挂载当前页 css」动态切换 `<link>`，所以类名跨页同名不冲突。

---

## 4. wx.* shim 支持清单（core.js 已实现，页面/模块照原样调用）

✅ 可用：`getStorageSync/setStorageSync/removeStorageSync/clearStorageSync/getStorageInfoSync`
✅ `navigateTo/redirectTo/reLaunch/switchTab/navigateBack`（switchTab 按 navigateTo 处理）
✅ `showToast/hideToast/showLoading/hideLoading/showModal/showActionSheet`（回调风格与小程序一致）
✅ `setNavigationBarColor/setNavigationBarTitle`
✅ `vibrateShort/vibrateLong`（空实现，静默）
✅ `getSystemInfoSync`（返回 windowWidth 等合理值）、`getMenuButtonBoundingClientRect`（mock）
✅ `setClipboardData`、`pageScrollTo`
✅ `createCanvasContext/canvasToTempFilePath/draw`（见 §5）
✅ `getCurrentPages()`、`getApp()`、`Page()`（全局可用）
✅ `wx.cloud.init`（空实现）
⚠️ 不要使用 `wx.request`、`wx.uploadFile`、`wx.downloadFile`、`wx.login`、`wx.getUserProfile`（网页版无后端；如原代码不得已用到，改为 mock 返回并注释）。

## 5. canvas shim（poster / 塔罗用）

```js
var ctx = wx.createCanvasContext('canvasId');   // 页面 render 里必须有 <canvas id="canvasId">
ctx.setFillStyle(c); ctx.setStrokeStyle(c); ctx.setLineWidth(n);
ctx.setFontSize(s); ctx.setTextAlign(a|'left'|'center'|'right'); ctx.setTextBaseline(b);
ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h);
ctx.fillText(t,x,y); ctx.strokeText?; // 无
ctx.beginPath(); ctx.moveTo(); ctx.lineTo(); ctx.arc(); ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.drawImage(imgOrDataUrlOrRelPath, x, y, w, h);
ctx.setGlobalAlpha(a); ctx.save(); ctx.restore(); ctx.scale(); ctx.translate(); ctx.setTransform?(不支持→注释);
ctx.measureText(t)   // → {width}
ctx.draw(reserve, cb) // 提交绘制；shim 先等 drawImage 的图片加载完成再执行 cb()
wx.canvasToTempFilePath({canvasId:'id', success:function(res){ res.tempFilePath /* = dataURL */ }})
```
不支持的（如 `createLinearGradient`）先注释并写「网页版略过」，渲染效果允许轻微降级。

## 6. 事件与 dataset（重要）

所有交互元素写 `data-act="方法名"`，点击由 core 全局委托到 `页面实例[方法名]`，事件对象形如
`{ currentTarget: { dataset: {..} }, target: {...} }`。

dataset 传值规则：
- 简单字符串/数字：直接写 `data-route="/pages/x/y"`、`data-key="zodiac"`（读取 `e.currentTarget.dataset.route`）。
- **对象/带变量值**：写 `data-<key>="$<路径>"`，core 会沿页面实例取值。
  例：原 `data-item="{{item}}"` → `data-item="$rowData.2"`（页面 render 时把遍历对象存在 `this.data.rowData` 数组里并在模板注｀释标好索引）；或直接用 `data-item="$data.recent.0"`。模板内确保 `this.data.<路径>` 或实例字段可达。
- `data-act="$fn"` 这种动态方法名不允许，方法名必须是编译期字符串。

## 7. 加载顺序与自检

index.html 将按 `core.js → modules/* → pages/*` 排序同步加载（文件名升序，若有依赖顺序问题，Lead 集成时统一调整）。因此：
- 页面文件顶层**不要**执行任何依赖 JY 模块的语句，把引用放进函数内；
- modules 之间顶层也只做「惰性引用」（函数内 `JY.xxx`），除少量基础模块外都安全。

交付前自检（转写者必做）：
1. `node --check <你的每个文件>` 全部通过；
2. render() 的模板字符串闭合、转义正确（属性值内 `"` 用 `&quot;` 或避免嵌套引号）；
3. 所有 `data-act` 都能在页面配置对象里找到同名方法；
4. css 里搜 `[0-9]rpx` 应无残留（动了 `var(--x)` 引用的除外，var 引用不动）；
5. grep 你的文件确保没有 `alert(`, `confirm(`, `prompt(`。

## 8. 禁止事项

- 禁止改 `source/` 下任何文件；禁止改 `index.html`、`js/core.js`、`css/tokens.css`、`css/themes.css`、`css/base.css`、`css/ui.css`、`TRANSFER_SPEC.md`。
- 禁止引入任何 CDN/外部链接、Google 字体、网络图片。
- 禁止删除版权/娱乐声明文案与逻辑（disclaimer 必须依原样出现在所有结果页与分享位）。
- 禁止改变原文案、原数据（卦辞、签诗、牌义、星座数据等一字不动）。
- 禁止输出除交付文件之外的新依赖文件（如 package.json 可以直接建但里面不能依赖安装）。
- 各交付文件只写自己负责的 slug/模块，文件名精确匹配 §0/§3 的清单。

## 9. 交付

完成后在 `js/modules/README.md` 或 `js/pages/README.md`（哪个组就写哪个）里追加一节：
- 你负责的文件清单；
- 与原文的行为差异清单（如：canvas 效果降级、音效空实现、云端→mock、动画简化），逐条说明原因；
- 无法解决/需要 Lead 介入的点。
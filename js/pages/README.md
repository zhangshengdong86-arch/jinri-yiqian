# js/pages 交付说明（各组追加各自小节，勿覆盖他人内容）

> 本文件由各组转写者追加维护：每节注明组别、文件清单、与原文差异、需 Lead 注意的点。
> 追加时请读取最新内容并替换 / 扩写自己小组的那一节，不要动其他小组的章节。

---

## T-D（每日一签 + 历史 + 关于 · daily-history-team）

### 文件清单

| 转写文件 | 对应原文三件套 |
|---|---|
| js/pages/daily-index.js + css/pages/daily-index.css | source/miniprogram/pages/daily/index.{js,wxml,wxss} |
| js/pages/daily-calendar.js + css/pages/daily-calendar.css | source/miniprogram/pages/daily/calendar.{js,wxml,wxss} |
| js/pages/history.js + css/pages/history.css | source/miniprogram/pages/history/index.{js,wxml,wxss} |
| js/pages/about.js + css/pages/about.css | source/miniprogram/pages/about/index.{js,wxml,wxss} |

### 与原文差异（逐条）

1. **路由注册键**：core.js 的 `go()` 以「带前导斜杠」的 key（如 `/pages/daily/index`）查 `pages` 表，
   但示范页 index.js 注册的是无斜杠 key（`pages/index/index`），两者不一致。
   本节 4 页同时注册了带斜杠与不带斜杠两个 key 以兼容任一修正方向。
   **需 Lead 决策**：统一 core 查表或示范页注册（建议 core 在 `JY.page`/`go` 里做一次 normalize）。
2. **onShareAppMessage 删除**（daily/index、daily/calendar、history、about 四页均有）：
   网页版无小程序分享卡片。
   - daily-index 把原「分享给好友」按钮（open-type=share）转为 `data-act="share"`，
     页面实现 `share()`：与 makePoster 走同一条 `JY.poster.make(this, '#posterCanvas', spec, {…})`
     调用（参数按原文，未发明签名）；success 回调拿到 dataURL 后 `JY.saveDataUrl(url, filename)` 触发下载。
   - 原 `poster.save(path)`（存相册）在 success 回调里改为 `JY.saveDataUrl`（web 无相册），其余逻辑原样。
   - calendar/history/about 页面 wxml 本身没有分享按钮，仅删除 onShareAppMessage。
3. **history 的 switchTab**：原代码 `this.setData({cur}, callback)` 依赖 setData 第二参数回调；
   core 的 setData 只支持一个参数，改为 `this.setData({cur}); this.build();`（行为等价）。
4. **抽签动画**：原 daily 页的翻页转场本就是纯 CSS keyframes + setTimeout（未用 wx.createAnimation），
   state 机逻辑原样保留，无需新增 .w-* 辅助类；揭晓延时依赖 sfx 音频时钟那段
   （sfx 网页版空实现返回 undefined → 抛错被 try/catch 吞掉 → delay 保持 900ms），行为与原页面无声卡时一致。
5. **hover 反馈**：wxss 的 hover-class（--hover 类）改为 CSS `:hover` 选择器；`catchtap="stopPop"`
   转成 `data-act="stopPop"` 空方法拦截弹层内部点击（core 全局委托 closest 机制下等价）。
6. **WXML→HTML**：view→div、text→span、button 加 type="button"；wx:for→map（日历 42 格网格、
   about 嵌套 map 沿用 g/p 变量名）；wx:if→条件拼接；disclaimer / sheet-card→JY.ui.*；
   canvas→`<canvas id="posterCanvas" class="u-poster-canvas" width="375" height="800">`。
7. **CSS**：rpx÷2=px（1rpx→0.5px 等小数位保留），@import 无；选择器无 page/view/text 残留；
   只含本页独有类，.u-*/.cs-actions/.u-poster-canvas 等全局类交由全局 css。
8. **显式 cssFile**：4 页均显式声明 `cssFile:'<slug>'`（daily-index / daily-calendar / history / about），
   交互元素全部使用 `data-act`（无 data-evt 场景），配置对象里 data-act 方法齐全。
9. **getApp/theme**：四页均为 root 主题（themeKey:''），原 daily/calendar/history/about 的
   `app.resetTheme()` 调用原样保留（core 会正确设置导航栏与 body 主题类）。

### 自检结果

- `node --check` 4 个 js 全部通过；css 无 `[0-9]rpx` 残留；无 alert/confirm/prompt；data-act 方法齐全。

### 注意点（请 Lead/其他组知悉）

- 依赖 JY.util / JY.links / JY.daily / JY.theme / JY.store / JY.data / JY.sfx / JY.poster / JY.saveDataUrl
  ——由 T-A 组按原文导出签名交付；接口假设 = source/utils/* 原文导出，未做任何发明。
- JY.poster.make 的 success 回调须回传 dataURL（core 的 canvasToTempFilePath shim 已保证），
  请 T-A 组确认 poster.js 转写对 `'#posterCanvas'` 选择器的适配（原代码走 wx.createSelectorQuery + 2d 节点，
  core 无 createSelectorQuery shim）。

---

## T-B（卜卦 + 星座 · div-zodiac-team）

### 文件清单

| 转写文件 | 对应原文三件套 |
|---|---|
| js/pages/divination-index.js + css/pages/divination-index.css | source/miniprogram/pages/divination/index.{js,wxml,wxss,json} |
| js/pages/divination-cast.js + css/pages/divination-cast.css | source/miniprogram/pages/divination/cast.{js,wxml,wxss,json} |
| js/pages/divination-glossary.js + css/pages/divination-glossary.css | source/miniprogram/pages/divination/glossary/index.{js,wxml,wxss,json} |
| js/pages/zodiac-index.js + css/pages/zodiac-index.css | source/miniprogram/pages/zodiac/index.{js,wxml,wxss,json} |
| js/pages/zodiac-detail.js + css/pages/zodiac-detail.css | source/miniprogram/pages/zodiac/detail.{js,wxml,wxss,json} |
| js/pages/zodiac-match.js + css/pages/zodiac-match.css | source/miniprogram/pages/zodiac/match/index.{js,wxml,wxss,json} |

### 与原文差异（逐条）

1. **路由双键注册**：与 T-D 同一处理 —— 每页同时注册
   `JY.page('pages/xxx', cfg)` 与 `JY.page('/pages/xxx', cfg)` 两个 key，
   兼容 core.go() 的「带前导斜杠查表」与示范页 index.js 的「无斜杠注册」矛盾。
   **等 Lead 归一后删掉一个即可**（六页均在文件尾有同段注释标记）。
2. **onShareAppMessage → share**：
   - divination-cast 原「分享这一卦」（open-type=share）+ onShareAppMessage → 删除后者，
     按钮改 `data-act="share"`，新增 `share()`：与 `makePoster` 共用同一份 blocks 构造
     （提取为本文件顶层 `shareBlocks()`，文案逐字未改），走原签名
     `poster.make(this, '#posterCanvas', spec, {success, fail})`，success 拿到 dataURL 后
     `JY.saveDataUrl(path, 'divination-<卦名>.png')` 触发下载；fail 提示「生成失败，可截屏保存」。
     `makePoster`（生成分享长图按钮）保持原样调用 `poster.save(path)`（由 T-A 组转写 save 为网页下载/预览）。
   - zodiac-detail 原「分享运势」+ onShareAppMessage → 删除后者、按钮转 `data-act="share"`，
     新增 `share()`：zodiac 皮肤海报 spec（skin:'zodiac'，title=星座+周期运势，blocks=综合+五维）→
     `JY.saveDataUrl` 下载。原文 detail 页并未调用 poster，此处 spec 按 poster.js 源文件头部注释的字段
     {skin,eyebrow,date,title,subtitle,blocks,footer} 填写，未发明 poster 接口签名。
   - zodiac-match 的 onShareAppMessage 直接删除（该页 wxml 无分享按钮）。
3. **表单控件**：picker mode=selector → `<select class="w-select" data-evt="onMatch/onA/onB">`，
   选项值 = 0..11 索引；core 的 input/change 委托给出 e.detail.value（字符串），
   原页面的 `parseInt(e.detail.value, 10)` 写法原样兼容。textarea/input 的 bindinput →
   `data-evt`（onQuestion/onNumA/onNumB/onText/onSearch）。
4. **输入焦点退化（web 固有）**：每次 setData 全量重渲染，输入中途每打一个字都会重建 DOM、
   丢失焦点（value 已写回、内容不丢，但无法连续盲打）。逻辑照搬 SPEC 未改；
   如需流畅输入，建议 Lead 后续在 core 给 setData 加「渲染节流/输入框 focus 回填」。
5. **结果态空值兜底**：结果页分支（step=result）用 `var res = this.data.result || {}` 渲染；
   WXML 对 `{{result.name}}`（result=null）容忍，JS 模板串不容忍，此改动等价原渲染语义。
6. **rpx 数值（JS 内）**：摇一卦动画延时是 `index*90`ms（时间值非 rpx，未动）；
   页面 JS 中无其他 rpx 常量。
7. **共享类提升**：base.css 已含 .cs-input/.cs-ph/.cs-count/.cs-label/.cs-text/.cs-num/.cs-nums/
   .cs-actions/.dv-tri*/.dv-more*/.gl-head*/.gl-list*/.gl-item*（Lead 已放全局），
   本组 css 不再重复；cast 页的 `.is-yang/.is-yin` 修饰符与 qz-toss keyframes 保留在页面 css。
   zodiac-index.css 保留 `.pg { position: relative; }`（供 .zd-sky 星点层定位，仅该页挂载时生效）。
8. **hover 反馈**：hover-class（dv-tri__item--hover/u-row--hover/zd-cell--hover）改 CSS `:hover`
   选择器写入对应页面 css；placeholder-class="cs-ph" 改 `::placeholder` 规则等价实现。
9. **主题**：六页 themeKey = 各自类目（divination×3 / zodiac×3）；页面内原
   `app.applyTheme('divination'|'zodiac')` 调用原样保留（cast 页原文无 onShow/applyTheme，themeKey 兜底）。
10. **canvas**：cast 与 zodiac-detail 页渲染离屏 `<canvas id="posterCanvas" class="u-poster-canvas" width="375" height="800">`，
    poster 转写侧请以 `wx.createCanvasContext('posterCanvas')` 取画布（core 按 id 查 DOM）。

### 自检结果

- `node --check` 6 个 js 全部通过；12 个文件 grep `[0-9]rpx` 与 alert(/confirm(/prompt( 均无残留。
- `node scripts/check.js` **0 失败**（在 T-A 组模块全部落地后复测）。
- 另做了扩展状态冒烟（临时脚本，已删除）：cast 四种模式 + 摇卦中 + replay 还原 + 结果态、
  glossary 关键词直达/空结果、detail 配对/周期切换/非法周期回落/摩羯 zc-hard、
  match 初始/swap/quick/同星座提示 —— 全部通过，data-act/data-evt 方法齐全。

### 注意点（请 Lead / 其他组知悉）

- 依赖 T-A 组：JY.data / JY.content / JY.hexagram / JY.util / JY.links / JY.store / JY.poster。
  其中 poster.make 的形状按 source/utils/poster.js 原文导出（make(page, sel, spec, cb) + save(path, cb)）。
- 本组页面用到的原文案、原数据（64 卦、八卦、12 星座、五个维度、配对等级）全部直接取自 T-A 组模块，
  页面内未改一字。
- zodiac-index 的星点坐标用 Math.random（原文如此），每次进入页面星图不同 —— 与小程序行为一致。

---

## T-C（手相 + 塔罗 · palm-tarot-team）

### 文件清单

| 转写文件 | 对应原文三件套 |
|---|---|
| js/pages/palm-index.js + css/pages/palm-index.css | source/miniprogram/pages/palm/index.{js,wxml,wxss,json} |
| js/pages/palm-reading.js + css/pages/palm-reading.css | source/miniprogram/pages/palm/reading.{js,wxml,wxss,json} |
| js/pages/palm-lines.js + css/pages/palm-lines.css | source/miniprogram/pages/palm/lines/index.{js,wxml,wxss,json} |
| js/pages/tarot-index.js + css/pages/tarot-index.css | source/miniprogram/package-tarot/pages/tarot/index.{js,wxml,wxss,json} |
| js/pages/tarot-reading.js + css/pages/tarot-reading.css | source/miniprogram/package-tarot/pages/tarot/reading.{js,wxml,wxss,json} |
| js/pages/tarot-cards.js + css/pages/tarot-cards.css | source/miniprogram/package-tarot/pages/tarot/cards/index.{js,wxml,wxss,json} |

### 与原文差异（逐条）

1. **路由双键注册**：与 T-D / T-B 同一处理 —— 每页同时注册 `JY.page('pages/xxx', cfg)`
   与 `JY.page('/pages/xxx', cfg)` 两个 key，兼容 core `go()` 的带斜杠查表与示范页的无斜杠注册。
   六个文件末尾均有同段注释标记，Lead 归一删除其一即可。
2. **手相拍照 → 网页文件选择（本组最大改造）**：`wx.chooseMedia` 无 shim，pal-reading 改为
   - 模板常驻隐藏 `&lt;input type="file" accept="image/*" id="wFile" style="display:none" data-evt="onFileChange"&gt;`；
   - 原「选择照片」按钮 `data-act="pickPhoto"`：给 input 绑 `cancel` 事件兜底提示
     「已取消选择，可重新选择或改用手型自测」，清空 value 后 `input.click()`；
   - `onFileChange` 走 data-evt 委托，但 core 委托的 `e.detail.value` 只是文件名，
     真实 File 从 `document.getElementById('wFile').files[0]` 取（页面内注释说明）；
     用 `file.name|size|lastModified` 去重（浏览器对 file 输入同时触发 input 与 change）；
   - FileReader → dataURL → `new Image()` 解码 → `JY.palmVision.analyze(image)`（接口同 SPEC：
     成功 `{ok:true,degraded?,note?,data}`、失败 `{ok:false,code,message,guide,canFallback}`）；
     质量校验已在 palmVision 内部，页面不再重复。
   - 失败处理保持原逻辑：错误态页面内展示 `errMsg/errGuide`（原文案），另 `wx.showToast`
     即时提示 `r.message`（原文案）；引擎异常拒绝时防御性落回错误态；图片解码失败落回错误态。
   - 原页面 loading / 失败提示 / `vision.toPreset(r)` 结果跳转 / finish(preset) / 历史入库，全部原样。
3. **文案微调（仅此两处，已注明）**：原「选择照片」→「选择/拍摄手掌照片」、
   原「重新拍摄」→「重新选择/拍摄」；其余文案（含隐私告知「本机与服务端删除」）一字未改。
4. **塔罗翻牌动画 = 原 CSS 3D**：核对源文件，翻牌本就是
   `.tr-card__inner{transition:transform;transform-style:preserve-3d}` + `.is-flip{rotateY(180deg)}`
   + 正反面 `backface-visibility:hidden`，**没有** `wx.createAnimation`；网页版直接沿用转换后的
   CSS（perspective 降为 500px），未另写动画实现。洗牌仍是原 `setTimeout(1400)` 状态机原样，
   洗牌台五张牌背的 `animation-delay:index*90ms`（时间值非 rpx，未动）沿用全局 sg-float。
5. **塔罗提问 textarea 输入保持聚焦**：原 `bindinput` 走 setData → 网页整页重渲染会丢焦点
   （T-B 同类问题）。本页 `onQuestion` 改为直接写 `this.data.question` + 局部更新
   `#wQCount` 字数计数（值仍全在 data，后续抽牌/结果页渲染一致）；textarea 默认值写在元素内容中。
6. **onShareAppMessage → share**（pal-reading、tarot-reading 两页）：原 open-type="share" 按钮改
   `data-act="share"`，新增 `share()` = 复用本页 `makePoster`（生成分享长图并下载）。
   `poster.make(this, '#posterCanvas', spec, {success,fail})`、`poster.save(path)` 均按原文签名原样调用
   （不发明接口；path 为 dataURL，save 的下载实现交由 T-A 组）。
7. **picker → select**（palm-lines 组合查询）：`<picker mode="selector">` 改为
   `<select class="zd-pick" data-evt="onLinePick|onTagPick">`，选项值 0..N-1，原
   `parseInt(e.detail.value,10)` 逻辑原样兼容；`.zd-pick` 类在本页 css 内本地定义（全局无此类）。
8. **结果态空值兜底**（pal-reading）：原 WXML 对 null 结果容忍；JS 模板串改为
   `if (step==='result'){ var r=this.data.result; if (r){...} }`，等价原 wx:if="{{result}}" 语义。
9. **WXML→HTML**：view→div、text→span、image→img（object-fit:cover 辅助类写在本页 css，
   等价原 mode="aspectFill"）、button 加 type="button"；wx:for→map（嵌套循环沿用原
   qi/oi、f、p、k 变量名避免遮蔽）；wx:if/elif/else→条件拼接；hover-class→CSS :hover；
   placeholder-class="cs-ph"→`::placeholder` 规则；disclaimer/sheet-card/ph-img→JY.ui.*；
   canvas→`<canvas id="posterCanvas" class="u-poster-canvas" width="375" height="800">`。
10. **CSS**：rpx÷2=px（1rpx→0.5px 等小数保留），@import 无；只保留本页独有类
    （.gl-*/.u-*/.cs-actions/.dv-more/.u-poster-canvas/--hover 类已在全局 css，不重复）；
    `.zd-pick` 例外在 palm-lines.css 本地定义（见第 7 条）。
11. **主题与导航**：手相三页 themeKey='palm'、cssFile='palm-*'；塔罗三页 themeKey='tarot'、
    cssFile='tarot-*'；navTitle 照抄 json（手相/看掌/主线图鉴/塔罗/抽牌/牌库图鉴）；
    各页 `app.applyTheme('palm'|'tarot')` 原样保留。

### 自检结果

- `node --check` 6 个 js 全部通过；12 个文件 grep `[0-9]rpx`、`alert(`、`confirm(`、`prompt(` 均无残留。
- 扩展状态冒烟（临时脚本，已删除，26 项断言全过）：pal-index / pal-lines（打开指定线、
  组合查询两线两形态）/ pal-reading（quiz 全流程、回看 replay 直达结果、错误态渲染）/
  tarot-index / tarot-reading（ask→shuffle→pick 全翻→综合、放大预览开关、回看 3 牌还原）/
  tarot-cards（切大牌分组、展开正逆位牌义、kw 直达）；所有 data-act/data-evt 均有对应方法。
- `node scripts/check.js` 依赖 T-A 组模块落地后复测（届时 17 页 + 模块应 0 失败）。

### 注意点（请 Lead / 其他组知悉）

- 依赖 T-A 组导出：JY.data（PALM_TYPES/PALM_LINES/LINE_TAGS/LINE_READINGS/PALM_QUIZ/
  SPREADS/DRAW_RULES/TAROT_CARDS/NOTICE）、JY.util（nav/back/toast/vibrate/pick/shuffle/chance/
  formatDate/isFav/toggleFav/currentRoute）、JY.links（link/entryOf）、JY.poster（make/save）、
  JY.palmVision（analyze/toPreset，接口按 SPEC：analyze(src) Promise，质量校验在其内部）、
  JY.images（resolve `tarot/tarot_card_0..77.webp`/`tarot/tarot_back.webp`/`palm/*` 指向 assets/）。
- 手相识别失败文案（严重失焦/纯色/太暗太亮/未识别手掌/倾斜等）全部取自 palmVision 返回值，
  错误态页 + toast 双展示原文案，未在页面内另写一份。
- 78 张牌义、正逆位、牌阵组合逻辑全部取自 JY.data.TAROT_CARDS / SPREADS，页面未改一字；
  牌图 img key 与原文一致（tarot/tarot_card_&lt;id&gt;.webp），请 images 组确认 0..77 全在清单。
- poster 侧注意：两 reading 页常驻渲染 `#posterCanvas` 离屏画布（u-poster-canvas 已在全局 css），
  `poster.make` 内部若用了 wx.createSelectorQuery（core 无此 shim），请 poster 组以
  `wx.createCanvasContext('posterCanvas')` 按 id 取画布。
- 双 key 注册与 core 查表的不一致，提请 Lead 在 core 归一（见第 1 条）。
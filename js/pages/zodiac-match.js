/**
 * 星座 · 配对页（slug: zodiac-match）
 * 由 source/miniprogram/pages/zodiac/match/index.{js,wxml,wxss,json} 转写：
 *  - index.js 逻辑原样保留（require→JY.*），onShareAppMessage 删除（本页无分享按钮）
 *  - index.wxml → render() 模板（wx:for→map，bindtap→data-act；picker→<select data-evt> 自绘，
 *    交换按钮 data-act="swap"）
 *  - index.wxss → css/pages/zodiac-match.css（rpx÷2=px；gl-head* 已提升到全局 base.css）
 * 与原文差异：
 *  - picker mode=selector range={{names}} value={{idxA/idxB}} → <select data-evt="onA/onB">，
 *    选项值=0..11 索引（e.detail.value 为字符串，原 parseInt 照旧兼容）
 *  - {{zA.symbol}} 等对 null 的容错改为 (this.data.zA || {}) 兜底（等价 WXML 空渲染）
 */
(function () {
  var app = getApp();
  var DATA = JY.data;
  var CONTENT = JY.content;
  var util = JY.util;
  var links = JY.links;

  function seedOf(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }

  var QUICK = [
    { k: 'q1', a: 'aries', b: 'leo', text: '白羊 × 狮子' },
    { k: 'q2', a: 'taurus', b: 'virgo', text: '金牛 × 处女' },
    { k: 'q3', a: 'gemini', b: 'aquarius', text: '双子 × 水瓶' },
    { k: 'q4', a: 'cancer', b: 'scorpio', text: '巨蟹 × 天蝎' },
    { k: 'q5', a: 'leo', b: 'scorpio', text: '狮子 × 天蝎' },
    { k: 'q6', a: 'libra', b: 'gemini', text: '天秤 × 双子' }
  ];

  /** 星座选择下拉（原 picker → select）：选项值 = 索引 */
  function selectHtml(names, curIdx, evtName) {
    var opts = (names || []).map(function (name, i) {
      return '<option value="' + i + '"' + (i === curIdx ? ' selected' : '') + '>' + JY.esc(name) + '</option>';
    }).join('');
    return '<select class="w-select" data-evt="' + evtName + '">' + opts + '</select>';
  }

  var cfg = {
    navTitle: '星座配对',
    themeKey: 'zodiac',           // 兜底主题：星座类目星夜极光色板
    cssFile: 'zodiac-match',

    data: {
      names: [],
      idxA: 0,
      idxB: 3,
      zA: null,
      zB: null,
      result: null,
      quick: QUICK
    },

    onLoad: function (options) {
      const names = DATA.ZODIACS.map(function (z) { return z.name; });
      let a = options.a || 'aries';
      let b = options.b || 'leo';
      let ia = names.indexOf(CONTENT.zodiacById(a).name);
      let ib = names.indexOf(CONTENT.zodiacById(b).name);
      if (ia < 0) ia = 0;
      if (ib < 0) ib = 3;
      if (ia === ib) ib = (ia + 1) % names.length;
      this.setData({ names: names, idxA: ia, idxB: ib });
      this.compute();
    },

    onShow: function () {
      try { app.applyTheme('zodiac'); } catch (e) {}
    },

    onA: function (e) { this.setData({ idxA: parseInt(e.detail.value, 10) }); this.compute(); },
    onB: function (e) { this.setData({ idxB: parseInt(e.detail.value, 10) }); this.compute(); },

    swap: function () {
      const a = this.data.idxA;
      const b = this.data.idxB;
      this.setData({ idxA: b, idxB: a });
      this.compute();
      util.vibrate('light');
    },

    applyQuick: function (e) {
      const a = e.currentTarget.dataset.a;
      const b = e.currentTarget.dataset.b;
      const names = this.data.names;
      this.setData({
        idxA: names.indexOf(CONTENT.zodiacById(a).name),
        idxB: names.indexOf(CONTENT.zodiacById(b).name)
      });
      this.compute();
      util.vibrate('light');
    },

    compute: function () {
      const zA = DATA.ZODIACS[this.data.idxA];
      const zB = DATA.ZODIACS[this.data.idxB];
      if (!zA || !zB) return;

      if (zA.id === zB.id) {
        this.setData({ zA: zA, zB: zB, result: null });
        util.toast('请选择两个不同的星座');
        return;
      }

      const s = seedOf(zA.id + '&' + zB.id);
      let score = 40 + (s % 58);
      if (zA.element === zB.element) score += 8;
      if (zA.mode === zB.mode) score += 4;
      if (score > 99) score = 99;

      let lv = DATA.MATCH_LEVELS[2];
      for (let i = 0; i < DATA.MATCH_LEVELS.length; i++) {
        if (score >= DATA.MATCH_LEVELS[i].min) { lv = DATA.MATCH_LEVELS[i]; break; }
      }

      const elementNote = zA.element === zB.element
        ? '同为' + zA.element + '象，底层节奏接近，容易互相理解。'
        : zA.element + '象 × ' + zB.element + '象，差异明显，互补与摩擦并存。';
      const modeNote = zA.mode === zB.mode
        ? '同为' + zA.mode + '模式，处事节奏相似，容易同步推进。'
        : zA.mode + ' × ' + zB.mode + '，一个偏启动一个偏收束，需要协调先后。';

      this.setData({
        zA: zA,
        zB: zB,
        result: {
          score: score,
          star: Math.max(1, Math.round(score / 20)),
          levelName: lv.name,
          desc: lv.desc,
          tip: lv.tip,
          elementNote: elementNote,
          modeNote: modeNote
        }
      });
    },

    goDetailA: function () {
      const z = this.data.zA;
      if (z) util.nav('/pages/zodiac/detail', { id: z.id });
    },

    goBack: function () {
      wx.navigateBack({ delta: 1 });
    },

    render: function () {
      var self = this;
      var d = self.data;
      var zA = d.zA || {};
      var zB = d.zB || {};
      var res = d.result;

      /* 快捷组合：原 wx:for="{{quick}}" wx:key="k" */
      var quickHtml = (d.quick || []).map(function (item, index) {
        return '<div class="mt-quick__item" data-act="applyQuick"' +
          ' data-a="' + JY.esc(item.a) + '" data-b="' + JY.esc(item.b) + '">' +
          '<span class="mt-quick__t">' + JY.esc(item.text) + '</span>' +
          '</div>';
      }).join('');

      /* 结果星级：原 wx:for="{{[1,2,3,4,5]}}" */
      var starHtml = [1, 2, 3, 4, 5].map(function (s) {
        return '<div class="u-star' + (res && s <= res.star ? ' u-star--on' : '') + '"></div>';
      }).join('');

      return '<div class="pg t-zodiac">' +
        '<div class="pg__inner">' +

        '<div class="gl-head">' +
        '<div class="gl-head__t">星座配对</div>' +
        '<div class="gl-head__s">选两个星座，看一份相处参考</div>' +
        '</div>' +

        /* 选择 */
        '<div class="mt-pick">' +
        '<div class="mt-pick__side">' +
        '<div class="mt-pick__k">星座 A</div>' +
        selectHtml(d.names, d.idxA, 'onA') +
        '</div>' +

        '<div class="mt-pick__mid" data-act="swap">⇄</div>' +

        '<div class="mt-pick__side">' +
        '<div class="mt-pick__k">星座 B</div>' +
        selectHtml(d.names, d.idxB, 'onB') +
        '</div>' +
        '</div>' +

        /* 结果 */
        (res ?
          '<div class="mt-res u-mt-3">' +
          '<div class="mt-res__score">' + JY.esc(res.score) + '</div>' +
          '<div class="mt-res__side">' +
          '<div class="mt-res__lv">' + JY.esc(res.levelName) + '</div>' +
          '<div class="u-stars u-mt-2">' + starHtml + '</div>' +
          '<div class="mt-res__desc u-mt-2">' + JY.esc(res.desc) + '</div>' +
          '</div>' +
          '</div>' : '') +

        (res ?
          '<div class="u-mt-3">' +
          JY.ui.sheetCard({
            title: '相处提示',
            sub: '娱乐性描述，不作为相处依据',
            body: '<div class="u-t--sub">' + JY.esc(res.tip) + '</div>' +
              '<div class="u-div"></div>' +
              '<div class="u-row"><div class="u-row__k">' + JY.esc(zA.name) + '</div><div class="u-row__v">' +
              JY.esc(zA.element) + '象 · ' + JY.esc(zA.mode) + ' · 守护' + JY.esc(zA.ruler) + '</div></div>' +
              '<div class="u-row"><div class="u-row__k">' + JY.esc(zB.name) + '</div><div class="u-row__v">' +
              JY.esc(zB.element) + '象 · ' + JY.esc(zB.mode) + ' · 守护' + JY.esc(zB.ruler) + '</div></div>' +
              '<div class="u-row"><div class="u-row__k">元素关系</div><div class="u-row__v">' + JY.esc(res.elementNote) + '</div></div>' +
              '<div class="u-row"><div class="u-row__k">模式关系</div><div class="u-row__v">' + JY.esc(res.modeNote) + '</div></div>'
          }) +
          '</div>' : '') +

        /* 快捷组合 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">试试这些组合</div>' +
        '<div class="u-sec__sub">点击直接切换</div>' +
        '</div>' +
        '<div class="mt-quick">' + quickHtml + '</div>' +
        '</div>' +

        '<div class="u-mt-4">' + JY.ui.disclaimer({ type: 'full' }) + '</div>' +

        '<div class="cs-actions u-mt-4">' +
        '<button class="u-btn u-btn--primary u-btn--block" type="button" data-act="goDetailA">看 ' + JY.esc(zA.name) + ' 今日运势</button>' +
        '<button class="u-btn u-btn--ghost u-btn--block u-mt-3" type="button" data-act="goBack">返回星座</button>' +
        '</div>' +
        '<div class="u-safe"></div>' +
        '</div>' +
        '</div>';
    }
  };

  // 双键注册：core.go() 按「带前导斜杠」的 key 查 pages 表，而示范页 index.js 注册的是无斜杠 key，
  // 两端暂时不一致（T-D 组已在 js/pages/README.md 提请 Lead 归一），这里同注册两个 key 兼容两个方向。
  JY.page('pages/zodiac/match/index', cfg);
})();
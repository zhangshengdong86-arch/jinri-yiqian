/**
 * 卜卦 · 类目入口页（slug: divination-index）
 * 由 source/miniprogram/pages/divination/index.{js,wxml,wxss,json} 转写：
 *  - index.js 逻辑原样保留（require→JY.*，getApp 照用）
 *  - index.wxml → render() 模板（wx:for→map，bindtap→data-act，组件→JY.ui.*）
 *  - index.wxss → css/pages/divination-index.css（rpx÷2=px；dv-tri、dv-more 已提升到全局 base.css）
 * 与原文差异：
 *  - hover-class 改用页面 CSS 的 :hover 选择器（.dv-tri__item:hover / .u-row:hover）
 *  - data-act 由 core 全局委托；data-mode/data-name/data-url 为普通字符串 dataset
 */
(function () {
  var app = getApp();
  var DATA = JY.data;
  var util = JY.util;

  var NO = ['壹', '贰', '叁', '肆'];

  var cfg = {
    navTitle: '卜卦',
    themeKey: 'divination',       // 兜底主题：Division 类目水墨宣纸色板
    cssFile: 'divination-index',

    data: {
      methods: [],
      trigrams: [],
      history: []
    },

    onLoad: function () {
      const coin = DATA.COIN_RULES;
      const list = [
        { key: 'coin', name: '铜钱六爻', desc: coin.desc, hint: '最常用 · 摇六次成一卦' }
      ].concat(DATA.MEIHUA_METHODS.map(function (m) {
        return { key: m.key, name: m.name, desc: m.desc, hint: m.hint };
      }));
      list.forEach(function (m, i) { m.no = NO[i] || String(i + 1); });
      this.setData({
        methods: list,
        trigrams: DATA.TRIGRAMS
      });
    },

    onShow: function () {
      try { app.applyTheme('divination'); } catch (e) {}
      const list = app.getHistory('divination').slice(0, 5).map(function (r) {
        return {
          id: r.id,
          title: r.title,
          route: r.route || '',
          timeText: util.formatDate(new Date(r.time))
        };
      });
      this.setData({ history: list });
    },

    goCast: function (e) {
      const mode = e.currentTarget.dataset.mode;
      util.nav('/pages/divination/cast', { mode: mode });
    },

    /** 点八卦：带着卦名去速查页看它的象意 */
    tapTrigram: function (e) {
      const name = e.currentTarget.dataset.name;
      util.nav('/pages/divination/glossary/index', { kw: name });
    },

    /** 通用跳转：data-url 写在 wxml 上，所有列表项复用这一个方法 */
    goPage: function (e) {
      util.nav(e.currentTarget.dataset.url);
    },

    openRecord: function (e) {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      const item = this.data.history[idx];
      if (!item) return;
      if (!item.route) {
        util.toast('这条记录是旧版本产生的，无法回看');
        return;
      }
      util.nav(item.route);
    },

    goHome: function () {
      util.back('/pages/index/index');
    },

    render: function () {
      var self = this;

      /* 起卦方式列表：原 wx:for="{{methods}}" wx:key="key" */
      var methodsHtml = (self.data.methods || []).map(function (item, index) {
        return '<div class="dv-item u-card--tap" data-act="goCast" data-mode="' + JY.esc(item.key) + '">' +
          '<div class="dv-item__no">' + JY.esc(item.no) + '</div>' +
          '<div class="dv-item__main">' +
          '<div class="dv-item__name">' + JY.esc(item.name) + '</div>' +
          '<div class="dv-item__desc">' + JY.esc(item.desc) + '</div>' +
          '<div class="dv-item__hint">' + JY.esc(item.hint) + '</div>' +
          '</div>' +
          '<div class="dv-item__arrow">›</div>' +
          '</div>';
      }).join('');

      /* 八卦九宫格：原 wx:for="{{trigrams}}" wx:key="id"，hover 用 CSS :hover */
      var triHtml = (self.data.trigrams || []).map(function (item, index) {
        return '<div class="dv-tri__item" data-act="tapTrigram" data-name="' + JY.esc(item.name) + '">' +
          '<div class="dv-tri__sym">' + JY.esc(item.symbol) + '</div>' +
          '<div class="dv-tri__name">' + JY.esc(item.name) + '</div>' +
          '<div class="dv-tri__meta">' + JY.esc(item.nature) + ' · ' + JY.esc(item.element) + '</div>' +
          '</div>';
      }).join('');

      /* 本类目历史：原 wx:for="{{history}}"，data-index 内联索引 */
      var histHtml = (self.data.history || []).map(function (item, index) {
        return '<div class="u-row" data-act="openRecord" data-index="' + index + '">' +
          '<div class="u-row__k">' + JY.esc(item.title) + '</div>' +
          '<div class="u-row__v">' + JY.esc(item.timeText) + ' ›</div>' +
          '</div>';
      }).join('');

      return '<div class="pg t-divination">' +
        '<div class="pg__inner">' +

        /* 类目头：印章 + 竖排标题 */
        '<div class="dv-head">' +
        '<div class="dv-seal">卦</div>' +
        '<div class="dv-head__main">' +
        '<div class="dv-head__title">卜卦</div>' +
        '<div class="dv-head__en">DIVINATION</div>' +
        '<div class="dv-head__slogan">一卦一问，静心自观</div>' +
        '</div>' +
        '<div class="dv-head__img">' +
        JY.ui.phImg({
          emoji: '☯',
          img: 'divination/dv_header_ink.png',
          name: 'dv_header_ink.png',
          usage: '页头插画 · 素面铜钱',
          ratio: '1:1',
          spec: '320×320 @2x'
        }) +
        '</div>' +
        '</div>' +

        /* 起卦方式 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">选择起卦方式</div>' +
        '<div class="u-sec__sub">共 4 种</div>' +
        '</div>' +
        '<div class="dv-list">' + methodsHtml + '</div>' +
        '</div>' +

        /* 八卦速查 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">八卦速查</div>' +
        '<div class="u-sec__sub">基础象意</div>' +
        '</div>' +
        '<div class="dv-tri">' + triHtml + '</div>' +
        '<div class="dv-more" data-act="goPage" data-url="/pages/divination/glossary/index">' +
        '<span>查看六十四卦全表与卦辞</span>' +
        '<span class="dv-more__arrow">›</span>' +
        '</div>' +
        '</div>' +

        /* 本类目历史 */
        (self.data.history && self.data.history.length > 0 ?
          '<div class="u-sec">' +
          '<div class="u-sec__head">' +
          '<div class="u-sec__title">本类目记录</div>' +
          '<div class="u-sec__sub">最近 ' + (self.data.history || []).length + ' 条 · 可点开回看</div>' +
          '</div>' +
          '<div class="u-card u-card--flat">' + histHtml + '</div>' +
          '</div>' : '') +

        /* 继续深入 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">继续深入</div>' +
        '<div class="u-sec__sub">不迷路</div>' +
        '</div>' +
        '<div class="u-card u-card--flat">' +
        '<div class="u-row" data-act="goPage" data-url="/pages/divination/glossary/index">' +
        '<div class="u-row__k">卦象速查</div>' +
        '<div class="u-row__v">八卦 + 六十四卦 ›</div>' +
        '</div>' +
        '<div class="u-row" data-act="goPage" data-url="/pages/history/index?cat=divination">' +
        '<div class="u-row__k">我的卜卦记录</div>' +
        '<div class="u-row__v">›</div>' +
        '</div>' +
        '<div class="u-row" data-act="goPage" data-url="/pages/about/index">' +
        '<div class="u-row__k">关于与声明</div>' +
        '<div class="u-row__v">›</div>' +
        '</div>' +
        '</div>' +
        '</div>' +

        '<div class="u-mt-4">' +
        JY.ui.disclaimer({ type: 'full' }) +
        '</div>' +
        '<div class="cs-actions u-mt-3">' +
        '<button class="u-btn u-btn--ghost u-btn--block" type="button" data-act="goHome">回到首页</button>' +
        '</div>' +
        '<div class="u-safe"></div>' +
        '</div>' +
        '</div>';
    }
  };

  // 双键注册：core.go() 按「带前导斜杠」的 key 查 pages 表，而示范页 index.js 注册的是无斜杠 key，
  // 两端暂时不一致（T-D 组已在 js/pages/README.md 提请 Lead 归一），这里同注册两个 key 兼容两个方向。
  JY.page('pages/divination/index', cfg);
})();
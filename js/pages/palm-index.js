/**
 * 手相首页 · palm-index
 * 由 pages/palm/index 三件套转写：
 *  - index.js 逻辑原样保留（require→JY.*，getApp 照用，const→var）
 *  - index.wxml → render() 模板（wx:for→map，bindtap→data-act，组件→JY.ui.*）
 *  - index.wxss → css/pages/palm-index.css（单位 1:2 换算，var(--x) 不动）
 * w- 辅助类：无；hover-class 改由页面 css 的 :hover 规则承担（pm-line / pm-type）。
 */
(function () {
  var app = getApp();
  var DATA = JY.data;
  var util = JY.util;
  var links = JY.links;

  var pageCfg = {
    navTitle: '手相',
    themeKey: 'palm',
    cssFile: 'palm-index',

    data: {
      lines: [],
      types: [],
      history: []
    },

    onLoad: function () {
      this.setData({ lines: DATA.PALM_LINES, types: DATA.PALM_TYPES })
    },

    onShow: function () {
      try { app.applyTheme('palm') } catch (e) {}
      var list = app.getHistory('palm').slice(0, 5).map(function (r) {
        return {
          id: r.id,
          title: r.title,
          route: r.route || '',
          timeText: util.formatDate(new Date(r.time))
        }
      })
      this.setData({ history: list })
    },

    goReading: function (e) {
      util.nav('/pages/palm/reading', { mode: e.currentTarget.dataset.mode })
    },

    /** 点某条主线：去图鉴页并展开这条线 */
    goLine: function (e) {
      util.nav('/pages/palm/lines/index', { line: e.currentTarget.dataset.id })
    },

    /** 点某个手型：带着手型参数直接看一次结果（主线用默认形态，与回看链接同格式） */
    goType: function (e) {
      var route = links.link('palm', {
        mode: 'quiz',
        auto: 1,
        type: e.currentTarget.dataset.id,
        life: 'curve',
        career: 'long',
        marriage: 'straight'
      }, '/pages/palm/reading')
      util.nav(route)
    },

    /** 通用跳转：data-url 写在模板上，所有列表项复用这一个方法 */
    goPage: function (e) {
      util.nav(e.currentTarget.dataset.url)
    },

    openRecord: function (e) {
      var idx = parseInt(e.currentTarget.dataset.index, 10)
      var item = this.data.history[idx]
      if (!item) return
      if (!item.route) {
        util.toast('这条记录是旧版本产生的，无法回看')
        return
      }
      util.nav(item.route)
    },

    goHome: function () {
      util.back('/pages/index/index')
    },

    render: function () {
      var self = this;

      /* 掌纹主线列表 */
      var linesHtml = (self.data.lines || []).map(function (item, index) {
        return '<div class="pm-line" data-act="goLine" data-id="' + JY.esc(item.id) + '">' +
          '<div class="pm-line__body">' +
          '<div class="pm-line__name">' + JY.esc(item.name) + '</div>' +
          '<div class="pm-line__domain">' + JY.esc(item.domain) + '</div>' +
          '<div class="pm-line__meta">' + JY.esc(item.from) + ' → ' + JY.esc(item.to) + '</div>' +
          '<div class="pm-line__normal">' + JY.esc(item.normal) + '</div>' +
          '<div class="pm-line__go">看这种线形的解读 ›</div>' +
          '</div></div>';
      }).join('');

      /* 手型分类列表 */
      var typesHtml = (self.data.types || []).map(function (item, index) {
        return '<div class="pm-type" data-act="goType" data-id="' + JY.esc(item.id) + '">' +
          '<div class="pm-type__dot"></div>' +
          '<div class="pm-type__main">' +
          '<div class="pm-type__name">' + JY.esc(item.name) + '</div>' +
          '<div class="pm-type__feat">' + JY.esc(item.feature) + '</div>' +
          '<div class="pm-type__read">' + JY.esc(item.reading) + '</div>' +
          '<div class="pm-type__go">按这个手型看一次 ›</div>' +
          '</div></div>';
      }).join('');

      /* 本类目历史 */
      var historyHtml = (self.data.history || []).map(function (item, index) {
        return '<div class="u-row" data-act="openRecord" data-index="' + index + '">' +
          '<div class="u-row__k">' + JY.esc(item.title) + '</div>' +
          '<div class="u-row__v">' + JY.esc(item.timeText) + ' ›</div>' +
          '</div>';
      }).join('');

      return (
        '<div class="pg t-palm"><div class="pg__inner">' +

        /* 页头 */
        '<div class="pm-head">' +
        '<div class="pm-head__main">' +
        '<div class="pm-head__title">手相</div>' +
        '<div class="pm-head__en">PALMISTRY</div>' +
        '<div class="pm-head__slogan">掌中纹路，落笔成解</div>' +
        '</div>' +
        '<div class="pm-head__img">' + JY.ui.phImg({
          emoji: '✋', img: 'palm/pm_header_hand.webp', name: 'pm_header_hand.webp',
          usage: '页头手掌线稿插画', ratio: '1:1', spec: '200×200 @2x'
        }) + '</div>' +
        '</div>' +

        /* 三种入口 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">选择一种方式</div>' +
        '<div class="u-sec__sub">两种路径 · 结果一致</div>' +
        '</div>' +
        '<div class="pm-entry">' +
        '<div class="pm-entry__item" data-act="goReading" data-mode="upload">' +
        '<div class="pm-entry__icon pm-entry__icon--a">' + JY.ui.phImg({
          emoji: '📷', img: 'palm/pm_icon_banner.png', name: 'pm_icon_banner.png',
          usage: '拍照看掌布幡图标', ratio: '1:1', spec: '160×160 @2x'
        }) + '</div>' +
        '<div class="pm-entry__name">拍照看掌</div>' +
        '<div class="pm-entry__desc">上传手掌照片，识别主线与形态</div>' +
        '<div class="u-tag u-mt-2">推荐</div>' +
        '</div>' +
        '<div class="pm-entry__item" data-act="goReading" data-mode="quiz">' +
        '<div class="pm-entry__icon pm-entry__icon--b">' + JY.ui.phImg({
          emoji: '✍️', img: 'palm/pm_icon_quiz.webp', name: 'pm_icon_quiz.webp',
          usage: '自测入口图标', ratio: '1:1', spec: '80×80 @2x'
        }) + '</div>' +
        '<div class="pm-entry__name">手型自测</div>' +
        '<div class="pm-entry__desc">四道选择题，同样得到一份解读</div>' +
        '<div class="u-tag u-tag--muted u-mt-2">兜底方案</div>' +
        '</div>' +
        '</div>' +
        '</div>' +

        /* 掌纹主线 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">掌纹主线</div>' +
        '<div class="u-sec__sub">三条线 · 先看这个就够了</div>' +
        '</div>' +
        '<div class="pm-lines">' + linesHtml + '</div>' +
        '<div class="dv-more" data-act="goPage" data-url="/pages/palm/lines/index">' +
        '<span>打开主线图鉴（含三种线的常见形态）</span>' +
        '<span class="dv-more__arrow">›</span>' +
        '</div>' +
        '</div>' +

        /* 手型分类 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">手型分类</div>' +
        '<div class="u-sec__sub">共 ' + JY.esc((self.data.types || []).length) + ' 类</div>' +
        '</div>' +
        '<div class="u-card">' + typesHtml + '</div>' +
        '</div>' +

        /* 本类目历史 */
        (self.data.history && self.data.history.length > 0 ?
          '<div class="u-sec">' +
          '<div class="u-sec__head">' +
          '<div class="u-sec__title">最近看过</div>' +
          '<div class="u-sec__sub">可点开回看</div>' +
          '</div>' +
          '<div class="u-card u-card--flat">' + historyHtml + '</div>' +
          '</div>' : '') +

        /* 继续深入 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">继续深入</div>' +
        '<div class="u-sec__sub">不迷路</div>' +
        '</div>' +
        '<div class="u-card u-card--flat">' +
        '<div class="u-row" data-act="goPage" data-url="/pages/palm/lines/index">' +
        '<div class="u-row__k">主线图鉴</div>' +
        '<div class="u-row__v">生命线 · 事业线 · 婚姻线 ›</div>' +
        '</div>' +
        '<div class="u-row" data-act="goPage" data-url="/pages/history/index?cat=palm">' +
        '<div class="u-row__k">我的手相记录</div>' +
        '<div class="u-row__v">›</div>' +
        '</div>' +
        '<div class="u-row" data-act="goPage" data-url="/pages/about/index">' +
        '<div class="u-row__k">关于与声明</div>' +
        '<div class="u-row__v">›</div>' +
        '</div>' +
        '</div>' +
        '</div>' +

        '<div class="u-mt-4">' + JY.ui.disclaimer({ type: 'full' }) + '</div>' +
        '<div class="cs-actions u-mt-3">' +
        '<button type="button" class="u-btn u-btn--ghost u-btn--block" data-act="goHome">回到首页</button>' +
        '</div>' +
        '<div class="u-safe"></div>' +
        '</div></div>'
      );
    }
  };
  // 双 key 注册：check.js 认无斜杠 key；core go() 查带斜杠 key（与 T-D 同策略，Lead 统一 normalize 后可删）
  JY.page('pages/palm/index', pageCfg);
  JY.page('/pages/palm/index', pageCfg);
})();
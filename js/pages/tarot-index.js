/**
 * 塔罗首页 · tarot-index
 * 由 package-tarot/pages/tarot/index 三件套转写：
 *  - index.js 逻辑原样保留（require→JY.*，const→var）
 *  - index.wxml → render() 模板（wx:for→map，bindtap→data-act，组件→JY.ui.*；
 *    牌图 key 原样：tarot/tarot_card_N.webp 由 JY.images.resolve 映射到 assets/tarot/）
 *  - index.wxss → css/pages/tarot-index.css（单位 1:2）
 * w- 辅助类：无。
 */
(function () {
  var app = getApp();
  var DATA = JY.data;
  var util = JY.util;

  var pageCfg = {
    navTitle: '塔罗',
    themeKey: 'tarot',
    cssFile: 'tarot-index',

    data: {
      spreads: [],
      drawGuide: '',
      history: []
    },

    onLoad: function () {
      this.setData({
        spreads: DATA.SPREADS,
        drawGuide: DATA.DRAW_RULES.guide
      })
    },

    onShow: function () {
      try { app.applyTheme('tarot') } catch (e) {}
      var list = app.getHistory('tarot').slice(0, 5).map(function (r) {
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
      var id = e.currentTarget.dataset.id
      // 参数交给统一构造函数：id 为空时自动省掉 spread，不会出现 ?spread=undefined
      util.nav('/package-tarot/pages/tarot/reading', { spread: id })
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

      /* 牌阵列表 */
      var spreadsHtml = (self.data.spreads || []).map(function (item, index) {
        return '<div class="tr-sp" data-act="goReading" data-id="' + JY.esc(item.id) + '">' +
          '<div class="tr-sp__left">' +
          '<div class="tr-sp__count">' + JY.esc(item.count) + '</div>' +
          '<div class="tr-sp__unit">张</div>' +
          '</div>' +
          '<div class="tr-sp__main">' +
          '<div class="tr-sp__name">' + JY.esc(item.name) + '</div>' +
          '<div class="tr-sp__scene">' + JY.esc(item.scene) + '</div>' +
          '<div class="tr-sp__desc">' + JY.esc(item.desc) + '</div>' +
          '<div class="tr-sp__pos">' +
          (item.positions || []).map(function (p, pi) {   // 原内层 wx:for-item="p"
            return '<span class="tr-sp__positem">' + JY.esc(p.name) + '</span>';
          }).join('') +
          '</div>' +
          '</div>' +
          '<div class="tr-sp__arrow">›</div>' +
          '</div>';
      }).join('');

      /* 最近抽过 */
      var historyHtml = (self.data.history || []).map(function (item, index) {
        return '<div class="u-row" data-act="openRecord" data-index="' + index + '">' +
          '<div class="u-row__k">' + JY.esc(item.title) + '</div>' +
          '<div class="u-row__v">' + JY.esc(item.timeText) + ' ›</div>' +
          '</div>';
      }).join('');

      return (
        '<div class="pg t-tarot"><div class="pg__inner">' +

        /* 页头 */
        '<div class="tr-head">' +
        '<div class="tr-arch u-cardimg">' + JY.ui.phImg({
          emoji: '🃏', img: 'tarot/tr_header_arcana.webp', name: 'tr_header_arcana.webp',
          usage: '页头塔罗主视觉 · 卡片牌', ratio: '3:4', radius: '0', spec: '300×400 @2x', variant: 'dark'
        }) + '</div>' +
        '<div class="tr-head__main">' +
        '<div class="tr-head__title">塔罗</div>' +
        '<div class="tr-head__en">TAROT</div>' +
        '<div class="tr-head__slogan">洗牌、抽牌、照见此刻</div>' +
        '</div>' +
        '</div>' +

        '<div class="tr-rule u-mt-3">' +
        '<div class="tr-rule__t">' + JY.esc(self.data.drawGuide) + '</div>' +
        '</div>' +

        /* 选择牌阵 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">选择牌阵</div>' +
        '<div class="u-sec__sub">共 ' + JY.esc((self.data.spreads || []).length) + ' 种</div>' +
        '</div>' +
        spreadsHtml +
        '</div>' +

        /* 最近抽过 */
        (self.data.history && self.data.history.length > 0 ?
          '<div class="u-sec">' +
          '<div class="u-sec__head">' +
          '<div class="u-sec__title">最近抽过</div>' +
          '<div class="u-sec__sub">可点开回看</div>' +
          '</div>' +
          '<div class="u-card">' + historyHtml + '</div>' +
          '</div>' : '') +

        /* 继续深入 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">继续深入</div>' +
        '<div class="u-sec__sub">不迷路</div>' +
        '</div>' +
        '<div class="u-card u-card--flat">' +
        '<div class="u-row" data-act="goPage" data-url="/package-tarot/pages/tarot/cards/index">' +
        '<div class="u-row__k">牌库图鉴</div>' +
        '<div class="u-row__v">大牌 22 张 · 小牌 16 张 ›</div>' +
        '</div>' +
        '<div class="u-row" data-act="goPage" data-url="/pages/history/index?cat=tarot">' +
        '<div class="u-row__k">我的塔罗记录</div>' +
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
  JY.page('package-tarot/pages/tarot/index', pageCfg);
  JY.page('/package-tarot/pages/tarot/index', pageCfg);
})();
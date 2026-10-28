/**
 * 牌库图鉴 · tarot-cards
 * 由 package-tarot/pages/tarot/cards/index 三件套转写：
 *  - index.js 逻辑原样保留（require→JY.*，const→var；GROUPS 常量原样）
 *  - index.wxml → render() 模板（wx:for→map，bindtap→data-act；78 张牌义解读、
 *    正逆位文本在 JY.data.TAROT_CARDS，一字不动）
 *  - index.wxss → css/pages/tarot-cards.css（单位 1:2）
 * w- 辅助类：无。
 */
(function () {
  var app = getApp();
  var DATA = JY.data;
  var util = JY.util;

  var GROUPS = [
    { k: 'all', name: '全部' },
    { k: 'major', name: '大牌' },
    { k: '权杖', name: '权杖' },
    { k: '圣杯', name: '圣杯' },
    { k: '宝剑', name: '宝剑' },
    { k: '星币', name: '星币' }
  ]

  var pageCfg = {
    navTitle: '牌库图鉴',
    themeKey: 'tarot',
    cssFile: 'tarot-cards',

    data: {
      groups: GROUPS,
      group: 'all',
      total: 0,
      majorCount: 0,
      all: [],
      list: [],
      openKey: '',
      detail: null
    },

    onLoad: function (options) {
      options = options || {}
      var all = DATA.TAROT_CARDS.map(function (c, i) {
        return { key: String(c.id) + '_' + i, no: i + 1, card: c }
      })
      var patch = {
        all: all,
        list: all,
        total: all.length,
        majorCount: DATA.TAROT_CARDS.filter(function (c) { return c.arcana === 'major' }).length
      }
      // 带关键词进入（如从结果页「查这些牌」跳来）：自动展开命中项
      var kw = ''
      if (options.kw) {
        try { kw = decodeURIComponent(options.kw) } catch (e) { kw = options.kw }
      }
      if (kw) {
        var hit = all.filter(function (x) { return x.card.name.indexOf(kw) >= 0 })[0]
        if (hit) {
          patch.group = hit.card.arcana === 'major' ? 'major' : (hit.card.suit || 'all')
          patch.list = all.filter(function (x) {
            return patch.group === 'all' ? true
              : (patch.group === 'major' ? x.card.arcana === 'major' : x.card.suit === patch.group)
          })
          patch.openKey = hit.key
          patch.detail = hit.card
        }
      }
      this.setData(patch)
    },

    onShow: function () {
      try { app.applyTheme('tarot') } catch (e) {}
    },

    switchGroup: function (e) {
      var k = e.currentTarget.dataset.k
      var list = this.data.all
      if (k === 'major') {
        list = this.data.all.filter(function (x) { return x.card.arcana === 'major' })
      } else if (k !== 'all') {
        list = this.data.all.filter(function (x) { return x.card.suit === k })
      }
      this.setData({ group: k, list: list, openKey: '', detail: null })
    },

    tapCard: function (e) {
      var key = e.currentTarget.dataset.key
      if (this.data.openKey === key) {
        this.setData({ openKey: '', detail: null })
        return
      }
      var item = this.data.list.filter(function (x) { return x.key === key })[0]
      if (!item) return
      this.setData({ openKey: key, detail: item.card })
      util.vibrate('light')
    },

    goReading: function () {
      util.nav('/package-tarot/pages/tarot/reading', { spread: 'triangle' })
    },

    goBack: function () {
      util.back('/package-tarot/pages/tarot/index')
    },

    render: function () {
      var self = this;

      /* 分组标签 */
      var tabsHtml = (self.data.groups || []).map(function (item, index) {
        return '<div class="tr-tab' + (item.k === self.data.group ? ' is-on' : '') + '"' +
          ' data-act="switchGroup" data-k="' + JY.esc(item.k) + '">' + JY.esc(item.name) + '</div>';
      }).join('');

      /* 牌列表：点击展开该牌的正逆位释义（detail 仅对展开项渲染） */
      var listHtml = (self.data.list || []).map(function (item, index) {
        var det = self.data.detail || {};
        var bodyHtml = (self.data.openKey === item.key) ? (
          '<div class="gl-item__body">' +
          '<div class="tr-det">' +
          '<div class="tr-det__row"><span class="tr-det__k">元素</span><span class="tr-det__v">' +
          JY.esc(det.element || det.suit) + '</span></div>' +
          '<div class="tr-det__row"><span class="tr-det__k">正位</span><span class="tr-det__v">' +
          JY.esc(det.upText) + '</span></div>' +
          '<div class="tr-det__row"><span class="tr-det__k">逆位</span><span class="tr-det__v">' +
          JY.esc(det.revText) + '</span></div>' +
          '<div class="tr-det__row"><span class="tr-det__k">建议</span><span class="tr-det__v">' +
          JY.esc(det.advice) + '</span></div>' +
          '<div class="tr-det__kw">' +
          (det.upright || []).map(function (k, ki) {   // 原内层 wx:for-item="k"
            return '<span class="u-tag">' + JY.esc(k) + '</span>';
          }).join('') +
          '</div>' +
          '</div>' +
          '</div>'
        ) : '';

        return '<div class="gl-item">' +
          '<div class="gl-item__head" data-act="tapCard" data-key="' + JY.esc(item.key) + '">' +
          '<div class="gl-item__no">' + JY.esc(item.no) + '</div>' +
          '<div class="gl-item__name">' + JY.esc(item.card.name) + '</div>' +
          '<div class="gl-item__meta">' + JY.esc(item.card.en) + '</div>' +
          '<div class="gl-item__flag">' + (item.card.arcana === 'major' ? '大' : '小') + '</div>' +
          '<div class="gl-item__arrow">' + (self.data.openKey === item.key ? '−' : '+') + '</div>' +
          '</div>' +
          bodyHtml +
          '</div>';
      }).join('');

      return (
        '<div class="pg t-tarot"><div class="pg__inner">' +

        '<div class="gl-head">' +
        '<div class="gl-head__t">牌库图鉴</div>' +
        '<div class="gl-head__s">共 ' + JY.esc(self.data.total) + ' 张 · 大阿尔卡纳 ' +
        JY.esc(self.data.majorCount) + ' 张已全 · 点击看正逆位牌义</div>' +
        '</div>' +

        /* 分组 */
        '<div class="tr-tabs">' + tabsHtml + '</div>' +

        /* 列表 */
        '<div class="gl-list u-mt-3">' + listHtml + '</div>' +

        (self.data.list.length === 0 ? '<div class="u-t--hint u-mt-3">该分组暂无牌面。</div>' : '') +

        '<div class="u-mt-4">' + JY.ui.disclaimer({ type: 'full' }) + '</div>' +

        '<div class="cs-actions u-mt-4">' +
        '<button type="button" class="u-btn u-btn--primary u-btn--block" data-act="goReading">用这些牌抽一次</button>' +
        '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="goBack">返回塔罗</button>' +
        '</div>' +
        '<div class="u-safe"></div>' +
        '</div></div>'
      );
    }
  };
  // 双 key 注册：check.js 认无斜杠 key；core go() 查带斜杠 key（与 T-D 同策略，Lead 统一 normalize 后可删）
  JY.page('package-tarot/pages/tarot/cards/index', pageCfg);
  JY.page('/package-tarot/pages/tarot/cards/index', pageCfg);
})();
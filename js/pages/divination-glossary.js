/**
 * 卜卦 · 卦象速查页（slug: divination-glossary）
 * 由 source/miniprogram/pages/divination/glossary/index.{js,wxml,wxss,json} 转写：
 *  - index.js 逻辑原样保留（require→JY.*）
 *  - index.wxml → render() 模板（wx:for→map，bindtap→data-act，bindinput→data-evt）
 *  - index.wxss → css/pages/divination-glossary.css（rpx÷2=px；
 *    gl-head、gl-list、gl-item、dv-tri 等已提升到全局 base.css）
 * 与原文差异：
 *  - 搜索 input 的 bindinput 走 data-evt（core 全局 input 委托，e.detail.value=值）
 *  - 展开的卦详情沿用 this.data.detail（与 WXML 的 {{detail.xxx}} 一致）
 *  - ph-img/disclaimer/sheet-card 组件在 wxml 的 json 引用未实际使用到的组件（ph-img、
 *    sheet-card）不额外渲染，仅保留转发声明（照原文案渲染 disclaimer）
 */
(function () {
  var app = getApp();
  var DATA = JY.data;
  var CONTENT = JY.content;
  var util = JY.util;

  var cfg = {
    navTitle: '卦象速查',
    themeKey: 'divination',       // 兜底主题：卜卦类目水墨色板
    cssFile: 'divination-glossary',

    data: {
      trigrams: [],
      openTri: '',
      openTriData: null,
      all: [],
      list: [],
      total: 0,
      detailCount: 0,
      keyword: '',
      openNo: 0,
      detail: null
    },

    onLoad: function (options) {
      options = options || {};
      const all = CONTENT.allHexagrams();
      let kw = '';
      if (options.kw) {
        try { kw = decodeURIComponent(options.kw); } catch (e) { kw = options.kw; }
      }
      const list = kw ? all.filter(function (x) {
        return x.name.indexOf(kw) >= 0 || x.upper.indexOf(kw) >= 0 || x.lower.indexOf(kw) >= 0;
      }) : all;

      const patch = {
        trigrams: DATA.TRIGRAMS,
        all: all,
        list: list,
        total: all.length,
        keyword: kw,
        detailCount: all.filter(function (x) { return x.hasDetail; }).length
      };

      // 带关键词进入（如从结果页「查这一卦」跳来）：直接展开唯一命中项
      if (kw && list.length > 0) {
        const item = list[0];
        const d = CONTENT.hexDetail(item.name, item.upper, item.lower);
        d.hasRaw = item.hasDetail;
        patch.openNo = item.no;
        patch.detail = d;
      }
      this.setData(patch);
    },

    onShow: function () {
      try { app.applyTheme('divination'); } catch (e) {}
    },

    tapTrigram: function (e) {
      const name = e.currentTarget.dataset.name;
      if (this.data.openTri === name) {
        this.setData({ openTri: '', openTriData: null });
        return;
      }
      const t = DATA.TRIGRAMS.filter(function (x) { return x.name === name; })[0];
      this.setData({ openTri: name, openTriData: t });
      util.vibrate('light');
    },

    onSearch: function (e) {
      const kw = (e.detail.value || '').trim();
      this.setData({ keyword: kw });
      if (!kw) {
        this.setData({ list: this.data.all, openNo: 0, detail: null });
        return;
      }
      const list = this.data.all.filter(function (x) {
        return x.name.indexOf(kw) >= 0 || x.upper.indexOf(kw) >= 0 || x.lower.indexOf(kw) >= 0;
      });
      this.setData({ list: list, openNo: 0, detail: null });
    },

    tapHex: function (e) {
      const no = parseInt(e.currentTarget.dataset.no, 10);
      if (this.data.openNo === no) {
        this.setData({ openNo: 0, detail: null });
        return;
      }
      const item = this.data.list.filter(function (x) { return x.no === no; })[0];
      if (!item) return;
      const d = CONTENT.hexDetail(item.name, item.upper, item.lower);
      d.hasRaw = item.hasDetail;
      this.setData({ openNo: no, detail: d });
      util.vibrate('light');
    },

    goCast: function () {
      util.nav('/pages/divination/cast?mode=coin');
    },

    goBack: function () {
      wx.navigateBack({ delta: 1 });
    },

    render: function () {
      var self = this;
      var d = self.data;

      /* 八卦基础：原 wx:for="{{trigrams}}"，选中态 is-on */
      var triHtml = (d.trigrams || []).map(function (item, index) {
        return '<div class="dv-tri__item' + (item.name === d.openTri ? ' is-on' : '') + '"' +
          ' data-act="tapTrigram" data-name="' + JY.esc(item.name) + '">' +
          '<div class="dv-tri__sym">' + JY.esc(item.symbol) + '</div>' +
          '<div class="dv-tri__name">' + JY.esc(item.name) + '</div>' +
          '<div class="dv-tri__meta">' + JY.esc(item.nature) + ' · ' + JY.esc(item.element) + '</div>' +
          '</div>';
      }).join('');

      /* 六十四卦列表：展开详情引用 this.data.detail（与 WXML 一致） */
      var listHtml = (d.list || []).map(function (item, index) {
        var head = '<div class="gl-item__head" data-act="tapHex" data-no="' + item.no + '">' +
          '<div class="gl-item__no">' + JY.esc(item.no) + '</div>' +
          '<div class="gl-item__name">' + JY.esc(item.name) + '</div>' +
          '<div class="gl-item__meta">' + JY.esc(item.upper) + '上' + JY.esc(item.lower) + '下</div>' +
          '<div class="gl-item__flag">' + (item.hasDetail ? '详解' : '通义') + '</div>' +
          '<div class="gl-item__arrow">' + (d.openNo === item.no ? '−' : '+') + '</div>' +
          '</div>';

        var body = '';
        if (d.openNo === item.no && d.detail) {
          var det = d.detail;
          var tips = '';
          if (det.advice && det.advice.length > 0) {
            tips = '<div class="gl-det__tips">' +
              det.advice.map(function (t) { return '<div class="gl-det__tip">· ' + JY.esc(t) + '</div>'; }).join('') +
              '</div>';
          }
          body = '<div class="gl-item__body">' +
            '<div class="gl-det">' +
            '<div class="gl-det__judge">' + JY.esc(det.judge) + '</div>' +
            '<div class="gl-det__lv">' + JY.esc(det.level) + '</div>' +
            '<div class="u-t--sub u-mt-2">' + JY.esc(det.meaning) + '</div>' +
            '<div class="u-div"></div>' +
            '<div class="u-t--sub">' + JY.esc(det.modern) + '</div>' +
            '<div class="u-row u-mt-2"><div class="u-row__k">事业</div><div class="u-row__v">' + JY.esc(det.career) + '</div></div>' +
            '<div class="u-row"><div class="u-row__k">感情</div><div class="u-row__v">' + JY.esc(det.love) + '</div></div>' +
            '<div class="u-row"><div class="u-row__k">财运</div><div class="u-row__v">' + JY.esc(det.wealth) + '</div></div>' +
            '<div class="u-row"><div class="u-row__k">健康</div><div class="u-row__v">' + JY.esc(det.health) + '</div></div>' +
            tips +
            (det.hasRaw ? '' : '<div class="u-t--hint u-mt-2">此卦为通用象意描述，专属卦辞待内容库补充。</div>') +
            '</div>' +
            '</div>';
        }
        return '<div class="gl-item">' + head + body + '</div>';
      }).join('');

      return '<div class="pg t-divination">' +
        '<div class="pg__inner">' +

        '<div class="gl-head">' +
        '<div class="gl-head__t">卦象速查</div>' +
        '<div class="gl-head__s">八卦基础 · 六十四卦全表 · 点击任意一卦看解读</div>' +
        '</div>' +

        /* 八卦基础 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">八卦基础</div>' +
        '<div class="u-sec__sub">点击卦象看象意</div>' +
        '</div>' +
        '<div class="dv-tri">' + triHtml + '</div>' +

        (d.openTri && d.openTriData ?
          '<div class="u-card u-mt-3">' +
          '<div class="gl-tri__h">' + JY.esc(d.openTriData.name) + ' · ' + JY.esc(d.openTriData.symbol) + '</div>' +
          '<div class="u-row"><div class="u-row__k">自然</div><div class="u-row__v">' + JY.esc(d.openTriData.nature) + '</div></div>' +
          '<div class="u-row"><div class="u-row__k">五行</div><div class="u-row__v">' + JY.esc(d.openTriData.element) + '</div></div>' +
          '<div class="u-row"><div class="u-row__k">卦数</div><div class="u-row__v">' + JY.esc(d.openTriData.num) + '</div></div>' +
          '<div class="u-row"><div class="u-row__k">核心义</div><div class="u-row__v">' + JY.esc(d.openTriData.key) + '</div></div>' +
          '</div>' : '') +
        '</div>' +

        /* 六十四卦 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">六十四卦</div>' +
        '<div class="u-sec__sub">共 ' + d.total + ' 卦 · 已收录 ' + d.detailCount + ' 卦详解</div>' +
        '</div>' +

        '<div class="u-card">' +
        '<input class="cs-text" data-evt="onSearch" value="' + JY.esc(d.keyword) + '"' +
        ' placeholder="输入卦名搜索，如「泰」「既济」" />' +
        '</div>' +

        '<div class="gl-list u-mt-3">' + listHtml + '</div>' +

        (d.list && d.list.length === 0 ?
          '<div class="u-t--hint u-mt-3">没有匹配的卦，换个关键词试试。</div>' : '') +
        '</div>' +

        '<div class="u-mt-4">' + JY.ui.disclaimer({ type: 'full' }) + '</div>' +

        '<div class="gl-actions u-mt-4">' +
        '<button class="u-btn u-btn--primary u-btn--block" type="button" data-act="goCast">用这一卦起一卦</button>' +
        '<button class="u-btn u-btn--ghost u-btn--block u-mt-3" type="button" data-act="goBack">返回卜卦</button>' +
        '</div>' +
        '<div class="u-safe"></div>' +
        '</div>' +
        '</div>';
    }
  };

  // 双键注册：core.go() 按「带前导斜杠」的 key 查 pages 表，而示范页 index.js 注册的是无斜杠 key，
  // 两端暂时不一致（T-D 组已在 js/pages/README.md 提请 Lead 归一），这里同注册两个 key 兼容两个方向。
  JY.page('pages/divination/glossary/index', cfg);
})();
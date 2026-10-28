/**
 * 星座 · 类目入口页（slug: zodiac-index）
 * 由 source/miniprogram/pages/zodiac/index.{js,wxml,wxss,json} 转写：
 *  - index.js 逻辑原样保留（require→JY.*）
 *  - index.wxml → render() 模板（wx:for→map，bindtap→data-act，组件→JY.ui.*）
 *  - index.wxss → css/pages/zodiac-index.css（rpx÷2=px；.pg 补 position:relative 供 .zd-sky 定位）
 * 与原文差异：
 *  - hover-class zd-cell--hover 改用页面 CSS 的 .zd-cell:hover
 *  - 星点装饰层 zd-sky 保留（CSS 星点 + sg-twinkle 全局 keyframes）
 *  - data-url 里的 {{activeId || 'aries'}} 在模板里内联求值
 */
(function () {
  var app = getApp();
  var DATA = JY.data;
  var util = JY.util;

  var cfg = {
    navTitle: '星座',
    themeKey: 'zodiac',           // 兜底主题：星座类目星夜极光色板
    cssFile: 'zodiac-index',

    data: {
      today: '',
      zodiacs: [],
      elements: [],
      activeId: '',
      stars: []
    },

    onLoad: function () {
      const stars = [];
      for (let i = 0; i < 18; i++) {
        stars.push({
          x: (Math.random() * 94 + 2).toFixed(2),
          y: (Math.random() * 42 + 1).toFixed(2),
          d: Math.floor(Math.random() * 2400)
        });
      }
      const groups = { '火': [], '土': [], '风': [], '水': [] };
      DATA.ZODIACS.forEach(function (z) {
        if (groups[z.element]) groups[z.element].push(z.name.replace('座', ''));
      });
      const elements = ['火', '土', '风', '水'].map(function (k) {
        return { key: k, name: k + '象', list: groups[k].join(' · ') };
      });
      this.setData({ zodiacs: DATA.ZODIACS, elements: elements, stars: stars });

      const p = app.globalData.profile;
      if (p && p.zodiacId) this.setData({ activeId: p.zodiacId });
    },

    onShow: function () {
      try { app.applyTheme('zodiac'); } catch (e) {}
      const d = new Date();
      const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
      this.setData({ today: util.formatDate(d) + ' · 星期' + week });
    },

    goDetail: function (e) {
      const id = e.currentTarget.dataset.id;
      this.setData({ activeId: id });
      util.nav('/pages/zodiac/detail', { id: id });
    },

    /** 通用跳转：data-url 写在 wxml 上，所有列表项复用这一个方法 */
    goPage: function (e) {
      util.nav(e.currentTarget.dataset.url);
    },

    goHome: function () {
      util.back('/pages/index/index');
    },

    render: function () {
      var self = this;
      var d = self.data;

      /* 星点装饰层：原 wx:for="{{stars}}" wx:key="*this" */
      var starsHtml = (d.stars || []).map(function (item, index) {
        return '<div class="zd-star" style="left:' + item.x + '%;top:' + item.y + '%;animation-delay:' + item.d + 'ms"></div>';
      }).join('');

      /* 十二星座网格：原 wx:for="{{zodiacs}}" wx:key="id" */
      var cellsHtml = (d.zodiacs || []).map(function (item, index) {
        return '<div class="zd-cell' + (item.id === d.activeId ? ' is-active' : '') + '"' +
          ' data-act="goDetail" data-id="' + JY.esc(item.id) + '">' +
          '<div class="zd-cell__icon">' +
          JY.ui.phImg({
            emoji: item.symbol,
            img: 'zodiac/zd_art_' + item.id + '_lineart.webp',
            name: 'zd_art_' + item.id + '_lineart.webp',
            usage: item.name + '星座线稿',
            ratio: '1:1',
            spec: '96×96 @2x',
            variant: 'dark',
            circle: true,
            inset: '-12'
          }) +
          '</div>' +
          '<div class="zd-cell__name">' + JY.esc(item.name) + '</div>' +
          '<div class="zd-cell__range">' + JY.esc(item.range) + '</div>' +
          '<div class="zd-cell__el">' + JY.esc(item.element) + '象</div>' +
          '</div>';
      }).join('');

      /* 四元素分组：原 wx:for="{{elements}}" wx:key="key" */
      var eleHtml = (d.elements || []).map(function (item, index) {
        return '<div class="zd-ele__item">' +
          '<div class="zd-ele__name">' + JY.esc(item.name) + '</div>' +
          '<div class="zd-ele__list">' + JY.esc(item.list) + '</div>' +
          '</div>';
      }).join('');

      return '<div class="pg t-zodiac">' +

        /* 星点装饰层 */
        '<div class="zd-sky">' + starsHtml + '</div>' +

        '<div class="pg__inner">' +
        '<div class="zd-head">' +
        '<div class="zd-head__title">星座</div>' +
        '<div class="zd-head__en">ZODIAC</div>' +
        '<div class="zd-head__slogan">星轨之下，今日一签</div>' +
        '<div class="zd-head__date">' + JY.esc(d.today) + '</div>' +
        '</div>' +

        /* 今日概览 */
        '<div class="zd-today u-mt-3">' +
        '<div class="zd-today__img">' +
        JY.ui.phImg({
          emoji: '✨',
          img: 'zodiac/zd_today_card.webp',
          name: 'zd_today_card.png',
          usage: '今日运势卡 · 星空插画',
          ratio: '16:9',
          spec: '686×386 @2x',
          variant: 'dark'
        }) +
        '</div>' +
        '<div class="zd-today__text">' +
        '<div class="zd-today__k">今日概览</div>' +
        '<div class="zd-today__v">选择一个星座，查看今日五个维度的描述</div>' +
        '</div>' +
        '</div>' +

        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">十二星座</div>' +
        '<div class="u-sec__sub">点击查看详情</div>' +
        '</div>' +
        '<div class="zd-grid">' + cellsHtml + '</div>' +
        '</div>' +

        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">四元素</div>' +
        '<div class="u-sec__sub">分组视角</div>' +
        '</div>' +
        '<div class="zd-ele">' + eleHtml + '</div>' +
        '</div>' +

        /* 继续深入 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">继续深入</div>' +
        '<div class="u-sec__sub">不迷路</div>' +
        '</div>' +
        '<div class="u-card u-card--flat">' +
        '<div class="u-row" data-act="goPage" data-url="/pages/zodiac/match/index">' +
        '<div class="u-row__k">星座配对</div>' +
        '<div class="u-row__v">两两配对 ›</div>' +
        '</div>' +
        '<div class="u-row" data-act="goPage" data-url="/pages/zodiac/detail?id=' + JY.esc(d.activeId || 'aries') + '">' +
        '<div class="u-row__k">我的星座运势</div>' +
        '<div class="u-row__v">›</div>' +
        '</div>' +
        '<div class="u-row" data-act="goPage" data-url="/pages/history/index?cat=zodiac">' +
        '<div class="u-row__k">我的星座记录</div>' +
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
        '<button class="u-btn u-btn--ghost u-btn--block" type="button" data-act="goHome">回到首页</button>' +
        '</div>' +
        '<div class="u-safe"></div>' +
        '</div>' +
        '</div>';
    }
  };

  // 双键注册：core.go() 按「带前导斜杠」的 key 查 pages 表，而示范页 index.js 注册的是无斜杠 key，
  // 两端暂时不一致（T-D 组已在 js/pages/README.md 提请 Lead 归一），这里同注册两个 key 兼容两个方向。
  JY.page('pages/zodiac/index', cfg);
})();
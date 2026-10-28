/**
 * 关于 · 产品说明 / 页面地图 / 常见问题
 * 由 pages/about/index.{js,wxml,wxss} 三件套转写：
 *  - index.js 逻辑原样保留（require→JY.*，getApp 照用）
 *  - index.wxml → render() 模板：wx:for→map（嵌套 map/wxml 用 g / p 变量名），
 *    bindtap→data-act、sheet-card→JY.ui.sheetCard、disclaimer with-health 原样
 *  - index.wxss → css/pages/about.css（rpx÷2=px；--hover 类改为 :hover）
 *
 * 分享位：原 onShareAppMessage 删除（网页版无小程序分享卡片），本页无分享按钮。
 * 复制娱乐声明走 wx.setClipboardData（core 的 shim 已实现）。
 */
(function () {
  var app = getApp();
  var util = JY.util;
  var links = JY.links;
  var DATA = JY.data;
  var THEME = JY.theme;

  var cfg = {
    navTitle: '关于',
    themeKey: '',
    cssFile: 'about',

    data: {
      version: 'v1.0.0',
      build: '',
      cats: [],
      map: [],
      faqs: [],
      openFaq: -1
    },

    onLoad: function () {
      var d = new Date();
      this.setData({
        cats: THEME.CATEGORIES,
        build: util.formatDate(d),
        map: [
          {
            group: '入口',
            items: [
              { name: '首页', path: '/pages/index/index', desc: '四个类目入口 + 最近记录' },
              { name: '每日一签', path: '/pages/daily/index', desc: '每日一签 · 运势日历与过往重温' },
              { name: '历史记录', path: '/pages/history/index', desc: '本机全部记录，可回看可删除' },
              { name: '关于', path: '/pages/about/index', desc: '本页' }
            ]
          },
          {
            group: '卜卦',
            items: [
              { name: '卜卦首页', path: '/pages/divination/index', desc: '4 种起卦方式 + 八卦速查' },
              { name: '起卦', path: '/pages/divination/cast?mode=coin', desc: '铜钱六爻 / 数字 / 时间 / 文字' },
              { name: '卦象速查', path: '/pages/divination/glossary/index', desc: '八卦象意 + 六十四卦全表' }
            ]
          },
          {
            group: '星座',
            items: [
              { name: '星座首页', path: '/pages/zodiac/index', desc: '十二星座列表' },
              { name: '运势详情', path: '/pages/zodiac/detail?id=aries', desc: '今日/本周/本月/今年 + 配对' },
              { name: '星座配对', path: '/pages/zodiac/match/index', desc: '两两配对与关系提示' }
            ]
          },
          {
            group: '手相',
            items: [
              { name: '手相首页', path: '/pages/palm/index', desc: '拍照看掌 / 手型自测' },
              { name: '看掌', path: '/pages/palm/reading?mode=quiz', desc: '四题自测得出手型与主线' },
              { name: '主线图鉴', path: '/pages/palm/lines/index', desc: '生命线 / 智慧线 / 感情线' }
            ]
          },
          {
            group: '塔罗',
            items: [
              { name: '塔罗首页', path: '/package-tarot/pages/tarot/index', desc: '牌阵选择' },
              { name: '抽牌', path: '/package-tarot/pages/tarot/reading?spread=triangle', desc: '洗牌 · 抽牌 · 翻牌 · 解读' },
              { name: '牌库图鉴', path: '/package-tarot/pages/tarot/cards/index', desc: '大牌 22 张 + 小牌 16 张' }
            ]
          }
        ],
        faqs: [
          {
            q: '这些结果是真的吗？',
            a: '不是。所有内容由预设规则与内容库生成，属于娱乐性质的文字游戏，不预测、不断言、不构成任何依据。'
          },
          {
            q: '会不会保存我的照片？',
            a: '不会。手相页读取的照片只在本次会话中用于展示预览，离开页面即释放引用，不上传、不留存、不做任何识别。'
          },
          {
            q: '记录存在哪里？',
            a: '只存在这台手机的本地存储里，没有服务器账号，换设备或卸载小程序后不会保留。可以在历史记录页一键清空。'
          },
          {
            q: '有收费解读或真人咨询吗？',
            a: '没有。本产品不提供任何收费解读、人工咨询、改运服务，也不会以任何形式索取费用。'
          },
          {
            q: '为什么有的卦没有详细解释？',
            a: '内容库目前覆盖部分卦的完整卦辞，其余卦会基于上下卦象意自动生成一段通用描述，标注为「通义」，后续会逐条补齐。'
          }
        ]
      });
    },

    onShow: function () {
      try { app.resetTheme(); } catch (e) {}
    },

    tapFaq: function (e) {
      var i = parseInt(e.currentTarget.dataset.index, 10);
      this.setData({ openFaq: this.data.openFaq === i ? -1 : i });
    },

    goPage: function (e) {
      var path = e.currentTarget.dataset.path;
      util.nav(path);
    },

    goCat: function (e) {
      var route = e.currentTarget.dataset.route;
      util.nav(route);
    },

    goHistory: function () {
      util.nav('/pages/history/index');
    },

    goHome: function () {
      util.back('/pages/index/index');
    },

    copyNotice: function () {
      wx.setClipboardData({
        data: DATA.NOTICE.full,
        success: function () {
          util.toast('声明已复制');
        }
      });
    },

    render: function () {
      var self = this;
      var d = self.data;

      /* 「它是什么」分区卡 */
      var kvRows = [
        { k: '内容来源', v: '预设规则 + 内容库' },
        { k: '是否联网', v: '否，全部在本机完成' },
        { k: '是否上传照片', v: '否，离开页面即释放' },
        { k: '是否收费', v: '否，无任何付费环节' }
      ].map(function (r) {
        return '<div class="ab-kv__row"><span class="ab-kv__k">' + JY.esc(r.k) + '</span>' +
          '<span class="ab-kv__v">' + JY.esc(r.v) + '</span></div>';
      }).join('');

      var whatCard = JY.ui.sheetCard({
        title: '它是什么',
        sub: '一句话说清',
        body: '<div class="ab-para">' +
          '一个把卜卦、星座、手相、塔罗放在同一套界面里的娱乐内容工具。' +
          '你提出一个问题，它按预设规则给出一段文字；这段文字不预测任何事，也不构成任何依据。' +
          '</div>' +
          '<div class="ab-kv">' + kvRows + '</div>'
      });

      /* 四个类目 */
      var catsHtml = (d.cats || []).map(function (item) {
        return '<div class="ab-cat t-' + JY.esc(item.key) + '"' +
          ' data-route="' + JY.esc(item.route) + '" data-act="goCat">' +
          '<div class="ab-cat__n">' + JY.esc(item.name) + '</div>' +
          '<div class="ab-cat__d">' + JY.esc(item.desc) + '</div>' +
          '<div class="ab-cat__s">' + JY.esc(item.slogan) + '</div>' +
          '</div>';
      }).join('');

      /* 页面地图（嵌套 wx:for：g / p 变量名与原 wxml 一致） */
      var mapHtml = (d.map || []).map(function (g) {
        var items = g.items.map(function (p) {
          return '<div class="ab-map__item" data-path="' + JY.esc(p.path) + '" data-act="goPage">' +
            '<div class="ab-map__main">' +
            '<div class="ab-map__n">' + JY.esc(p.name) + '</div>' +
            '<div class="ab-map__d">' + JY.esc(p.desc) + '</div>' +
            '</div>' +
            '<div class="ab-map__arrow">›</div>' +
            '</div>';
        }).join('');
        return '<div class="ab-map"><div class="ab-map__g">' + JY.esc(g.group) + '</div>' +
          '<div class="ab-map__list">' + items + '</div></div>';
      }).join('');

      /* 常见问题 */
      var faqHtml = (d.faqs || []).map(function (item, index) {
        return '<div class="ab-faq__item" data-index="' + index + '" data-act="tapFaq">' +
          '<div class="ab-faq__q">' +
          '<span class="ab-faq__qm">' + (d.openFaq === index ? '−' : '+') + '</span>' +
          '<span class="ab-faq__qt">' + JY.esc(item.q) + '</span>' +
          '</div>' +
          (d.openFaq === index ? '<div class="ab-faq__a">' + JY.esc(item.a) + '</div>' : '') +
          '</div>';
      }).join('');

      return '<div class="pg t-root"><div class="pg__inner">' +

        /* 品牌 */
        '<div class="ab-brand">' +
        '<div class="ab-brand__mark">宜</div>' +
        '<div class="ab-brand__name">今日宜签</div>' +
        '<div class="ab-brand__en">JIN RI YI QIAN</div>' +
        '<div class="ab-brand__slogan">四种方式，一次自观</div>' +
        '<div class="ab-brand__meta">' + JY.esc(d.version) + ' · 构建日期 ' + JY.esc(d.build) + '</div>' +
        '</div>' +

        /* 它是什么 */
        '<div class="u-mt-4">' + whatCard + '</div>' +

        /* 四个类目 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">四个类目</div>' +
        '<div class="u-sec__sub">点进去看看</div>' +
        '</div>' +
        '<div class="ab-cats">' + catsHtml + '</div>' +
        '</div>' +

        /* 页面地图：走查用，全部可点 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">页面地图</div>' +
        '<div class="u-sec__sub">共 16 个页面 · 均可直接跳转</div>' +
        '</div>' +
        mapHtml +
        '</div>' +

        /* 常见问题 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">常见问题</div>' +
        '<div class="u-sec__sub">点开看回答</div>' +
        '</div>' +
        '<div class="ab-faq">' + faqHtml + '</div>' +
        '</div>' +

        /* 声明 */
        '<div class="u-mt-4">' + JY.ui.disclaimer({ type: 'full', withHealth: true }) + '</div>' +

        '<div class="cs-actions u-mt-3">' +
        '<button type="button" class="u-btn u-btn--ghost u-btn--block" data-act="copyNotice">复制娱乐声明</button>' +
        '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="goHistory">查看历史记录</button>' +
        '<button type="button" class="u-btn u-btn--primary u-btn--block u-mt-3" data-act="goHome">回到首页</button>' +
        '</div>' +
        '<div class="u-safe"></div>' +
        '</div></div>';
    }
  };

  /* 路由键与 core 查表兼容（同 daily-index 说明） */
  JY.page('/pages/about/index', cfg);
})();
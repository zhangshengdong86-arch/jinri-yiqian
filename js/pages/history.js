/**
 * 历史记录 · 本机记录 / 收藏的查阅与管理
 * 由 pages/history/index.{js,wxml,wxss} 三件套转写：
 *  - index.js 逻辑原样保留（require→JY.*，getApp 照用）
 *    注意：原 switchTab 里 setData 的第二个参数是回调，网页版 setData
 *    不支持回调参数，改为 setData 后直接调用 this.build()
 *  - index.wxml → render() 模板：wx:for→map、bindtap→data-act
 *  - index.wxss → css/pages/history.css（rpx÷2=px；--hover 类改为 :hover）
 *
 * 分享位：原 onShareAppMessage 删除（网页版无小程序分享卡片），本页无分享按钮。
 * 收藏/删除/清空交互、回到结果的回看链接均走 util.nav(item.route) 原样。
 */
(function () {
  var app = getApp();
  var util = JY.util;
  var links = JY.links;
  var THEME = JY.theme;

  var CATS = [
    { key: 'all', name: '全部' },
    { key: 'fav', name: '收藏', emoji: '★' },
    { key: 'divination', name: '卜卦', emoji: '☯' },
    { key: 'zodiac', name: '星座', emoji: '✦' },
    { key: 'palm', name: '手相', emoji: '✋' },
    { key: 'tarot', name: '塔罗', emoji: '✧' }
  ];

  var cfg = {
    navTitle: '历史记录',
    themeKey: '',
    cssFile: 'history',

    data: {
      tabs: [],
      cur: 'all',
      curName: '全部记录',
      list: [],
      total: 0,
      favTotal: 0,
      cats: []
    },

    onLoad: function (options) {
      options = options || {};
      this.setData({
        cats: THEME.CATEGORIES,
        cur: options.cat || 'all'
      });
    },

    onShow: function () {
      try { app.resetTheme(); } catch (e) {}
      this.build();
    },

    build: function () {
      var all = app.getHistory() || [];
      var favs = app.getFavorites() || [];
      var counts = {};
      counts.all = all.length;
      counts.fav = favs.length;
      CATS.forEach(function (c) {
        if (c.key === 'all' || c.key === 'fav') return;
        counts[c.key] = all.filter(function (r) { return r.cat === c.key; }).length;
      });
      var tabs = CATS.map(function (c) {
        return { key: c.key, name: c.name, count: counts[c.key] || 0 };
      });

      var cur = this.data.cur;
      var curTab = CATS.filter(function (c) { return c.key === cur; })[0] || CATS[0];
      var src = cur === 'all' ? all
        : (cur === 'fav' ? favs : all.filter(function (r) { return r.cat === cur; }));

      var list = src.map(function (r) {
        var d = new Date(r.time);
        return {
          id: r.id,
          cat: r.cat,
          catName: r.catName || '其他',
          title: r.title || '（无标题）',
          route: r.route || '',
          canOpen: !!r.route,
          timeText: util.formatDate(d) + ' ' + util.formatTime(d)
        };
      });

      this.setData({
        tabs: tabs,
        list: list,
        total: all.length,
        favTotal: favs.length,
        curName: curTab.name + '记录'
      });
    },

    switchTab: function (e) {
      var key = e.currentTarget.dataset.key;
      this.setData({ cur: key });
      // 原代码 setData 的第二个参数为回调；网页版 setData 不支持回调，直接续调 build()
      this.build();
    },

    openRecord: function (e) {
      var idx = parseInt(e.currentTarget.dataset.index, 10);
      var item = this.data.list[idx];
      if (!item) return;
      if (!item.route) {
        util.toast('这条记录是旧版本产生的，无法回看');
        return;
      }
      util.nav(item.route);
    },

    delRecord: function (e) {
      var ctx = this;
      var id = e.currentTarget.dataset.id;
      var isFav = this.data.cur === 'fav';
      wx.showModal({
        title: isFav ? '取消收藏' : '删除这条记录',
        content: isFav ? '只会从收藏里移除，记录仍在。' : '删除后无法恢复。',
        confirmText: isFav ? '取消收藏' : '删除',
        confirmColor: '#A32D2D',
        success: function (res) {
          if (!res.confirm) return;
          // 收藏以 route 为键，直接用 id 反查即可移除
          if (isFav) app.toggleFavorite({ id: id });
          else app.removeHistory(id);
          ctx.build();
          util.toast(isFav ? '已取消收藏' : '已删除');
        }
      });
    },

    clearAll: function () {
      var ctx = this;
      wx.showModal({
        title: '清空记录',
        content: '将删除本机保存的全部 ' + this.data.total + ' 条记录，无法恢复。',
        confirmText: '清空',
        confirmColor: '#A32D2D',
        success: function (res) {
          if (!res.confirm) return;
          app.clearHistory();
          ctx.build();
          util.toast('已清空');
        }
      });
    },

    goCat: function (e) {
      var route = e.currentTarget.dataset.route;
      util.nav(route);
    },

    goHome: function () {
      util.back('/pages/index/index');
    },

    render: function () {
      var self = this;
      var d = self.data;

      var tabsHtml = (d.tabs || []).map(function (t) {
        return '<div class="hi-tab' + (t.key === d.cur ? ' is-on' : '') + '"' +
          ' data-act="switchTab" data-key="' + JY.esc(t.key) + '">' +
          JY.esc(t.name) +
          (t.count > 0 ? '<span class="hi-tab__n">' + JY.esc(t.count) + '</span>' : '') +
          '</div>';
      }).join('');

      var listHtml = (d.list || []).map(function (item, index) {
        return '<div class="hi-item">' +
          '<div class="hi-item__main" data-index="' + index + '" data-act="openRecord">' +
          '<div class="hi-item__top">' +
          '<span class="hi-badge hi-badge--' + JY.esc(item.cat) + '">' + JY.esc(item.catName) + '</span>' +
          '<span class="hi-item__time">' + JY.esc(item.timeText) + '</span>' +
          '</div>' +
          '<div class="hi-item__title">' + JY.esc(item.title) + '</div>' +
          '<div class="hi-item__foot">' +
          '<span class="hi-item__go">' + (item.canOpen ? '点此回看 ›' : '该记录不可回看') + '</span>' +
          '</div>' +
          '</div>' +
          '<div class="hi-item__del" data-id="' + JY.esc(item.id) + '" data-act="delRecord">' +
          (d.cur === 'fav' ? '取消收藏' : '删除') + '</div>' +
          '</div>';
      }).join('');

      /* 空态 */
      var emptyHtml = '';
      if (d.list.length === 0 && d.cur === 'fav') {
        emptyHtml = '<div class="hi-empty">' +
          '<div class="hi-empty__mark">★</div>' +
          '<div class="hi-empty__t">还没有收藏</div>' +
          '<div class="hi-empty__s">在结果页点「收藏」，之后可以随时回来重看</div>' +
          '</div>';
      } else if (d.list.length === 0) {
        var emptyCats = (d.cats || []).map(function (item) {
          return '<div class="hi-empty__cat t-' + JY.esc(item.key) + '"' +
            ' data-route="' + JY.esc(item.route) + '" data-act="goCat">' +
            '<span class="hi-empty__cn">' + JY.esc(item.name) + '</span>' +
            '<span class="hi-empty__cd">' + JY.esc(item.desc) + '</span>' +
            '</div>';
        }).join('');
        emptyHtml = '<div class="hi-empty">' +
          '<div class="hi-empty__mark">○</div>' +
          '<div class="hi-empty__t">这里还没有记录</div>' +
          '<div class="hi-empty__s">选一种方式试一次，结果会自动出现在这里</div>' +
          '<div class="hi-empty__cats">' + emptyCats + '</div>' +
          '</div>';
      }

      return '<div class="pg t-root"><div class="pg__inner">' +

        /* 概览 */
        '<div class="hi-head">' +
        '<div class="hi-head__num">' + JY.esc(d.total) + '</div>' +
        '<div class="hi-head__side">' +
        '<div class="hi-head__t">条本机记录</div>' +
        '<div class="hi-head__s">只保存在这台手机上 · 不上传</div>' +
        '</div>' +
        '</div>' +

        /* 分类筛选 */
        '<div class="hi-tabs">' + tabsHtml + '</div>' +

        /* 列表 */
        (d.list.length > 0 ?
          '<div class="u-sec">' +
          '<div class="u-sec__head">' +
          '<div class="u-sec__title">' + JY.esc(d.curName) + '</div>' +
          '<div class="u-sec__sub">点任意一条可回看</div>' +
          '</div>' +
          '<div class="hi-list">' + listHtml + '</div>' +
          '</div>' : '') +

        emptyHtml +

        /* 操作 */
        (d.total > 0 ?
          '<div class="cs-actions u-mt-4">' +
          '<button type="button" class="u-btn u-btn--ghost u-btn--block" data-act="clearAll">清空全部记录</button>' +
          '</div>' : '') +

        '<div class="u-mt-4">' + JY.ui.disclaimer({ type: 'full' }) + '</div>' +

        '<div class="cs-actions u-mt-3">' +
        '<button type="button" class="u-btn u-btn--primary u-btn--block" data-act="goHome">回到首页</button>' +
        '</div>' +
        '<div class="u-safe"></div>' +
        '</div></div>';
    }
  };

  /* 路由键与 core 查表兼容（同 daily-index 说明） */
  JY.page('/pages/history/index', cfg);
})();
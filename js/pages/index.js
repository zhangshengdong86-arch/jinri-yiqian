/**
 * 首页 · 入口层
 * 由 pages/index/ 三件套转写：
 *  - index.js 逻辑原样保留（require→JY.*，getApp 照用）
 *  - index.wxml → render() 模板（wx:for→map，bindtap→data-act，组件→JY.ui.*）
 *  - index.wxss → css/pages/index.css（由脚本转换）
 */
(function () {
  var util = JY.util;
  var links = JY.links;
  var store = JY.store;
  var THEME = JY.theme;
  var daily = JY.daily;

  /** 读取 globalData */
  function gd() {
    try {
      var a = (typeof getApp === 'function' && getApp()) || null;
      return (a && a.globalData) || {};
    } catch (e) {
      return {};
    }
  }

  JY.page('pages/index/index', {
    navTitle: '今日宜签',
    themeKey: '',
    cssFile: 'index',

    data: {
      appName: '今日宜签',
      appSlogan: '四种方式，一次自观',
      today: '',
      cats: [],
      recent: [],
      historyCount: 0,
      dailyStatus: '',
      dailySub: '',
      streak: 0,
      totalDays: 0,
      streakTip: ''
    },

    onLoad: function () {
      this.setData({ cats: gd().categories || THEME.CATEGORIES });
    },

    onShow: function () {
      try {
        getApp().resetTheme();
      } catch (e) {}
      this.refresh();
    },

    refresh: function () {
      var d = new Date();
      var list = gd().history || [];
      var recent = list.slice(0, 3).map(function (r) {
        var t = new Date(r.time);
        return {
          id: r.id,
          cat: r.cat,
          catName: r.catName || '',
          title: r.title || '',
          route: r.route || '',
          dateText: util.formatDate(t) + ' ' + util.formatTime(t)
        };
      });
      var week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
      var drec = daily.getToday();
      this.setData({
        today: util.formatDate(d) + ' 星期' + week,
        recent: recent,
        historyCount: list.length,
        dailyStatus: drec ? ('今日 · ' + drec.level.label) : '今日运势，待你揭晓',
        dailySub: drec ? ('第 ' + drec.signNo + ' 签 · 今日主题「' + drec.theme.name + '」') : '点此抽一签',
        streak: daily.streak(),
        totalDays: daily.totalDays(),
        streakTip: daily.streak() > 0 ? '别断在今天' : '抽第一签，开始记录'
      });
    },

    goDaily: function () {
      util.nav('/pages/daily/index');
    },

    goCalendar: function () {
      util.nav('/pages/daily/calendar');
    },

    goCat: function (e) {
      var route = e.currentTarget.dataset.route;
      util.nav(route);
    },

    goHistory: function (e) {
      var item = e.currentTarget.dataset.item;
      if (item && item.route) {
        util.nav(item.route);
        return;
      }
      util.toast('这条记录是旧版本产生的，无法回看');
    },

    showAbout: function () {
      util.nav('/pages/about/index');
    },

    goHistoryPage: function () {
      util.nav('/pages/history/index');
    },

    clearHistory: function () {
      var ctx = this;
      wx.showModal({
        title: '清空记录',
        content: '将删除本机保存的全部历史记录，无法恢复。',
        confirmText: '清空',
        confirmColor: '#A32D2D',
        success: function (res) {
          if (res.confirm) {
            store.clearHistory(getApp());
            ctx.refresh();
            util.toast('已清空');
          }
        }
      });
    },

    render: function () {
      var self = this;
      var catsHtml = (self.data.cats || []).map(function (item, index) {
        var icon = JY.ui.phImg({
          emoji: item.emoji,
          img: 'brand/cat_icon_' + item.key + '.webp',
          name: 'cat_icon_' + item.key + '.webp',
          usage: item.name + '入口图标',
          ratio: '1:1',
          radius: '10px',
          spec: '88×88 @2x'
        });
        return '<div class="cat t-' + JY.esc(item.key) + ' u-anim-up' + (item.styleTag ? '' : '') + '"' +
          ' style="animation-delay:' + (index * 60) + 'ms"' +
          ' data-act="goCat" data-route="' + JY.esc(item.route) + '">' +
          '<div class="cat__icon">' + icon + '</div>' +
          '<div class="cat__main">' +
          '<div class="cat__en">' + JY.esc(item.en) + '</div>' +
          '<div class="cat__name">' + JY.esc(item.name) + '</div>' +
          '<div class="cat__pitch">' + JY.esc(item.slogan) + '</div>' +
          '<div class="cat__desc">' + JY.esc(item.desc) + '</div>' +
          (item.styleTag ? '<div class="cat__tag">' + JY.esc(item.styleTag) + '</div>' : '') +
          '</div></div>';
      }).join('');

      var recentHtml = (self.data.recent || []).map(function (item, index) {
        return '<div class="u-row" data-act="goHistory" data-item="$data.recent.' + index + '">' +
          '<div class="rec__l">' +
          '<div class="rec__cat">' + JY.esc(item.catName) + '</div>' +
          '<div class="rec__title">' + JY.esc(item.title) + '</div>' +
          '</div>' +
          '<div class="rec__time">' + JY.esc(item.dateText) + ' ›</div>' +
          '</div>';
      }).join('');

      return (
        '<div class="pg t-root"><div class="pg__inner">' +

        /* 品牌头 */
        '<div class="hero u-anim-in">' +
        '<div class="hero__mark">' + JY.ui.phImg({
          emoji: '☯', img: 'brand/brand_logo.png', name: 'brand_logo.png',
          usage: '品牌标识 · 圆形徽记', ratio: '1:1', spec: '96×96 @2x', radius: '50%'
        }) + '</div>' +
        '<div class="hero__text">' +
        '<div class="hero__name">' + JY.esc(self.data.appName) + '</div>' +
        '<div class="hero__slogan">' + JY.esc(self.data.appSlogan) + '</div>' +
        '</div>' +
        '<div class="hero__date">' + JY.esc(self.data.today) + '</div>' +
        '</div>' +

        /* 娱乐声明 */
        '<div class="u-mt-3">' + JY.ui.disclaimer({ type: 'short', size: 'sm' }) + '</div>' +

        /* 每日一签入口 */
        '<div class="u-sec">' +
        '<div class="daily-card" data-act="goDaily">' +
        '<div class="daily-card__l">' +
        '<div class="daily-card__label">每日一签</div>' +
        '<div class="daily-card__main">' + JY.esc(self.data.dailyStatus) + '</div>' +
        '<div class="daily-card__sub">' + JY.esc(self.data.dailySub) + '</div>' +
        '</div>' +
        '<div class="daily-card__r">' +
        '<div class="daily-card__emoji">🎴</div>' +
        '<div class="daily-card__go">›</div>' +
        '</div></div></div>' +

        /* 打卡条 */
        '<div class="u-mt-3">' +
        '<div class="hm-check" data-act="goCalendar">' +
        '<div class="hm-check__l">' +
        '<div class="hm-check__n">' +
        '<span class="hm-check__num">' + JY.esc(self.data.streak) + '</span>' +
        '<span class="hm-check__unit">天</span>' +
        '<span class="hm-check__tip">' + JY.esc(self.data.streakTip) + '</span>' +
        '</div>' +
        '<div class="hm-check__t">已累计抽签 ' + JY.esc(self.data.totalDays) + ' 天 · 只记在这台手机上</div>' +
        '</div>' +
        '<div class="hm-check__r">' +
        '<div class="hm-check__cal">签文日历</div>' +
        '<div class="hm-check__go">›</div>' +
        '</div></div></div>' +

        /* 四个类目入口 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">选择一种方式</div>' +
        '<div class="u-sec__sub">四种路径 · 各自独立</div>' +
        '</div>' +
        '<div class="cats">' + catsHtml + '</div>' +
        '</div>' +

        /* 最近记录 */
        (self.data.recent && self.data.recent.length > 0 ?
          '<div class="u-sec">' +
          '<div class="u-sec__head">' +
          '<div class="u-sec__title">最近看过</div>' +
          '<div class="u-sec__sub">共 ' + JY.esc(self.data.historyCount) + ' 条 · 可点开回看</div>' +
          '</div>' +
          '<div class="u-card u-card--flat">' +
          recentHtml +
          '<div class="u-row" data-act="goHistoryPage">' +
          '<div class="u-row__k">查看全部记录</div>' +
          '<div class="u-row__v">›</div>' +
          '</div></div></div>' : '') +

        /* 底部说明 */
        '<div class="foot">' +
        '<div class="u-div u-div--text">以 上</div>' +
        JY.ui.disclaimer({ type: 'full' }) +
        '<div class="foot__links">' +
        '<span class="foot__link" data-act="showAbout">关于本产品</span>' +
        '<span class="foot__dot">·</span>' +
        '<span class="foot__link" data-act="goHistoryPage">历史记录</span>' +
        '<span class="foot__dot">·</span>' +
        '<span class="foot__link" data-act="clearHistory">清空记录</span>' +
        '</div>' +
        '<div class="u-safe"></div>' +
        '</div>' +

        '</div></div>'
      );
    }
  });
})();
/**
 * 签文日历 · 月历打卡与当日签文回看
 * 由 pages/daily/calendar.{js,wxml,wxss} 三件套转写：
 *  - calendar.js 逻辑原样保留（require→JY.*，getApp 照用）
 *  - calendar.wxml → render() 模板：wx:for→map（42 格月历网格），
 *    bindtap→data-act、catchtap→data-act="stopPop"（空方法拦截冒泡点击）
 *  - calendar.wxss → css/pages/daily-calendar.css（rpx÷2=px；--hover 类改为 :hover）
 *
 * 分享位：原 onShareAppMessage 删除（网页版无小程序分享卡片），本页无分享按钮。
 */
(function () {
  var app = getApp();
  var util = JY.util;
  var links = JY.links;
  var daily = JY.daily;

  var WEEK = ['一', '二', '三', '四', '五', '六', '日'];

  var cfg = {
    navTitle: '签文日历',
    themeKey: '',
    cssFile: 'daily-calendar',

    data: {
      year: 0,
      month: 0,
      title: '',
      weeks: WEEK,
      cells: [],
      streak: 0,
      total: 0,
      monthCount: 0,
      canNext: false,
      detail: null
    },

    onLoad: function () {
      var now = new Date();
      var y = now.getFullYear();
      var m = now.getMonth() + 1;
      this.setData({ year: y, month: m });
      this.build(y, m);
    },

    onShow: function () {
      try { app.resetTheme(); } catch (e) {}
      this.build();
    },

    build: function (y, m) {
      y = y || this.data.year;
      m = m || this.data.month;
      var cells = daily.monthGrid(y, m);
      var count = cells.filter(function (c) { return c.has; }).length;
      var now = new Date();
      var isFuture = y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1);

      this.setData({
        year: y,
        month: m,
        cells: cells,
        title: y + ' 年 ' + m + ' 月',
        monthCount: count,
        canNext: !isFuture,
        streak: daily.streak(),
        total: daily.totalDays()
      });
    },

    prev: function () {
      var y = this.data.year;
      var m = this.data.month - 1;
      if (m < 1) { m = 12; y--; }
      this.setData({ detail: null });
      this.build(y, m);
    },

    next: function () {
      if (!this.data.canNext) return;
      var y = this.data.year;
      var m = this.data.month + 1;
      if (m > 12) { m = 1; y++; }
      this.setData({ detail: null });
      this.build(y, m);
    },

    tapDay: function (e) {
      var idx = parseInt(e.currentTarget.dataset.index, 10);
      var c = this.data.cells[idx];
      if (!c || !c.inMonth) return;
      if (!c.has) {
        util.toast('这一天没有抽签记录');
        return;
      }
      var r = daily.getPast(c.date);
      if (!r) { util.toast('记录已清理'); return; }
      this.setData({
        detail: {
          date: r.date,
          label: r.level.label,
          color: r.level.color,
          signNo: r.signNo,
          themeEmoji: r.theme.emoji,
          themeName: r.theme.name,
          poemLines: String(r.poem || '').split('\n'),
          yiText: (r.yi || []).join(' · '),
          jiText: (r.ji || []).join(' · ')
        }
      });
    },

    // 拦截弹层内部点击（原 catchtap），避免点内容时误触发遮罩关闭
    stopPop: function () {},

    closeDetail: function () {
      this.setData({ detail: null });
    },

    goDaily: function () {
      util.back('/pages/daily/index');
    },

    render: function () {
      var self = this;
      var d = self.data;

      var weekHtml = (d.weeks || []).map(function (w) {
        return '<div class="cal-week__c">' + JY.esc(w) + '</div>';
      }).join('');

      /* 42 格月历网格：首日偏移 / 跨月补空格 / 今日标记均来自 daily.monthGrid */
      var cellsHtml = (d.cells || []).map(function (c, index) {
        var cls = 'cal-cell' +
          (c.inMonth ? '' : ' is-out') +
          (c.has ? ' is-has' : '') +
          (c.isToday ? ' is-today' : '');
        var inner = '';
        if (c.inMonth) {
          inner = '<div class="cal-cell__d">' + JY.esc(c.day) + '</div>' +
            (c.has
              ? '<div class="cal-cell__m">' + JY.esc(c.emoji) + '</div>'
              : '<div class="cal-cell__m cal-cell__m--none">·</div>') +
            (c.has ? '<div class="cal-cell__dot" style="background:' + JY.esc(c.color) + ';"></div>' : '');
        }
        return '<div class="' + cls + '" data-index="' + index + '" data-act="tapDay">' + inner + '</div>';
      }).join('');

      /* 当日签文弹层 */
      var popHtml = '';
      if (d.detail) {
        var poemHtml = d.detail.poemLines.map(function (line) {
          return '<div class="cal-pop__poem">' + JY.esc(line) + '</div>';
        }).join('');
        popHtml = '<div class="cal-mask" data-act="closeDetail">' +
          '<div class="cal-pop" data-act="stopPop">' +
          '<div class="cal-pop__head">' +
          '<div class="cal-pop__date">' + JY.esc(d.detail.date) + '</div>' +
          '<div class="cal-pop__lv" style="color:' + JY.esc(d.detail.color) + ';">' + JY.esc(d.detail.label) + '</div>' +
          '</div>' +
          '<div class="cal-pop__sub">第 ' + JY.esc(d.detail.signNo) + ' 签 · ' + JY.esc(d.detail.themeEmoji) + ' ' + JY.esc(d.detail.themeName) + '</div>' +
          '<div class="u-div"></div>' +
          poemHtml +
          '<div class="cal-pop__row">' +
          '<span class="cal-pop__k">宜</span>' +
          '<span class="cal-pop__v">' + JY.esc(d.detail.yiText) + '</span>' +
          '</div>' +
          '<div class="u-mt-3">' + JY.ui.disclaimer({ type: 'short', size: 'sm' }) + '</div>' +
          '<div class="cal-pop__close" data-act="closeDetail">关闭</div>' +
          '</div></div>';
      }

      return '<div class="pg t-root"><div class="pg__inner">' +

        /* 打卡概览 */
        '<div class="cal-head">' +
        '<div class="cal-head__item"><div class="cal-head__n">' + JY.esc(d.streak) + '</div><div class="cal-head__t">连续天数</div></div>' +
        '<div class="cal-head__sep"></div>' +
        '<div class="cal-head__item"><div class="cal-head__n">' + JY.esc(d.total) + '</div><div class="cal-head__t">累计抽签</div></div>' +
        '<div class="cal-head__sep"></div>' +
        '<div class="cal-head__item"><div class="cal-head__n">' + JY.esc(d.monthCount) + '</div><div class="cal-head__t">本月记录</div></div>' +
        '</div>' +

        /* 月份切换 */
        '<div class="cal-bar">' +
        '<div class="cal-bar__btn" data-act="prev">‹</div>' +
        '<div class="cal-bar__title">' + JY.esc(d.title) + '</div>' +
        '<div class="cal-bar__btn' + (d.canNext ? '' : ' is-off') + '" data-act="next">›</div>' +
        '</div>' +

        /* 星期表头 */
        '<div class="cal-week">' + weekHtml + '</div>' +

        /* 日期格 */
        '<div class="cal-grid">' + cellsHtml + '</div>' +

        '<div class="u-t--hint u-mt-3">点任意一天回看当天的签文 · 只保存在这台手机上</div>' +

        '<div class="u-mt-4">' + JY.ui.disclaimer({ type: 'short', size: 'sm' }) + '</div>' +

        '<div class="cs-actions u-mt-4">' +
        '<button type="button" class="u-btn u-btn--primary u-btn--block" data-act="goDaily">回到每日一签</button>' +
        '</div>' +
        '<div class="u-safe"></div>' +
        '</div>' + popHtml + '</div>';
    }
  };

  /* 路由键与 core 查表兼容（同 daily-index 说明） */
  JY.page('/pages/daily/calendar', cfg);
})();
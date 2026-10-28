/**
 * 每日一签 · 抽签与揭晓页
 * 由 pages/daily/index.{js,wxml,wxss} 三件套转写：
 *  - index.js 逻辑原样保留（require→JY.*，getApp 照用；
 *    sfx 网页版为空实现，play() 返回 undefined，原代码的 try/catch 已兜住，
 *    揭晓延时落到 900ms 常量）
 *  - index.wxml → render() 模板：wx:if→条件拼接、wx:for→map、
 *    bindtap→data-act、disclaimer→JY.ui.disclaimer
 *  - index.wxss → css/pages/daily-index.css（rpx÷2=px；--hover 类改为 :hover）
 *
 * 分享位转写（按 Lead 约定）：
 *  - 原「分享给好友」（open-type=share 触发的 onShareAppMessage）删除；
 *    按钮改为 data-act="share"，页面实现 share()：与 makePoster 走同一条
 *    JY.poster.make(this, '#posterCanvas', spec, {...}) 调用（参数按原文），
 *    success 拿到 dataURL 后 JY.saveDataUrl(url) 触发浏览器下载（网页版无相册）。
 *  - 「生成分享长图」makePoster 保留，success 同样改走 JY.saveDataUrl。
 */
(function () {
  var app = getApp();
  var util = JY.util;
  var links = JY.links;
  var daily = JY.daily;
  var sfx = JY.sfx;
  var poster = JY.poster;

  var cfg = {
    navTitle: '每日一签',
    themeKey: '',
    cssFile: 'daily-index',

    data: {
      state: 'idle',        // idle | turning | result
      turn: null,           // 翻页转场期间展示的结果封面
      today: '',
      weekday: '',
      record: null,
      poemLines: [],
      past: false,
      pastDate: '',
      pastWeekday: '',
      faved: false,
      streak: 0,
      recent: []
    },

    onLoad: function (options) {
      options = options || {};
      try { app.resetTheme(); } catch (e) {}
      // 带日期进入：直接回看那一天（签文日历与「我的收藏」走这条）
      if (options.date) {
        this.viewPast({ currentTarget: { dataset: { date: options.date } } });
        return;
      }
      this.loadToday();
    },

    onShow: function () {
      try { app.resetTheme(); } catch (e) {}
      // 兜底：翻页转场若被切后台 / 渲染中断，不会永远卡在 turning，回来直接揭晓
      if (this.data.state === 'turning' && this._rec) this.reveal();
    },

    // 离页：清定时器并掐断余韵，避免声音跨页延续
    onHide: function () { this.cleanup(); },
    onUnload: function () { this.cleanup(); },

    cleanup: function () {
      if (this._timer) { clearTimeout(this._timer); this._timer = null; }
      try { sfx.stop(); } catch (e) {}
    },

    // 今日是否抽过，抽过直接看结果
    loadToday: function () {
      var d = new Date();
      var rec = daily.getToday();
      this.setData({
        today: util.formatDate(d),
        weekday: daily.weekday(d),
        record: rec,
        poemLines: rec ? rec.poem.split('\n') : [],
        state: rec ? 'result' : 'idle',
        past: false,
        pastDate: '',
        pastWeekday: '',
        recent: daily.listRecent(7),
        streak: daily.streak(),
        faved: this.isFaved(rec)
      });
    },

    // 抽签：翻页转场 + 「鎏金揭示」音效 —— 蓄势 900ms，揭晓瞬间正好落在爆发点
    onDraw: function () {
      if (this.data.state === 'turning' || this.data.record) return;
      var rec = daily.drawToday();
      this._rec = rec;
      this.setData({
        state: 'turning',
        turn: {
          signNo: rec.signNo,
          label: rec.level.label,
          grade: rec.level.grade,
          color: rec.level.color,
          text: rec.level.text,
          themeEmoji: rec.theme.emoji,
          themeName: rec.theme.name
        }
      });

      // 音效须在用户手势中解锁；用音频时钟算揭晓延时，避免定时器漂移
      var delay = 900;
      try {
        sfx.unlock();
        var h = sfx.play();
        this._sfx = h;
        // 网页版 sfx 为空实现（play 返回 undefined），下面这句抛错会被 catch 吞掉，delay 保持 900
        if (!h.silent && h.ctx) {
          delay = Math.max(0, Math.round((h.impactAt - h.ctx.currentTime) * 1000));
        }
      } catch (e) { /* 无音效不影响翻页 */ }

      var ctx = this;
      this._timer = setTimeout(function () { ctx.reveal(); }, delay);
    },

    // 揭晓（也便于走查模拟器直接调用，绕过定时器）
    reveal: function () {
      if (this._timer) { clearTimeout(this._timer); this._timer = null; }
      if (!this._rec) return;
      this.setData({
        record: this._rec,
        poemLines: this._rec.poem.split('\n'),
        state: 'result',
        turn: null,
        recent: daily.listRecent(7),
        streak: daily.streak(),
        faved: this.isFaved(this._rec)
      });
    },

    // 去对应模块深入
    goTheme: function () {
      var r = this.data.record && this.data.record.theme && this.data.record.theme.route;
      if (r) util.nav(r);
    },

    // 重温过往日签
    viewPast: function (e) {
      var date = e.currentTarget.dataset.date;
      if (!date) return;
      var rec = daily.getPast(date);
      if (!rec) { util.toast('这一天还没抽签'); return; }
      var p = String(date).split('-');
      var wd = daily.weekday(new Date(+p[0], +p[1] - 1, +p[2]));
      this.setData({
        record: rec,
        poemLines: rec.poem.split('\n'),
        state: 'result',
        past: true,
        pastDate: date,
        pastWeekday: wd,
        faved: this.isFaved(rec)
      });
    },

    /* ---------------- 收藏 ---------------- */
    // 收藏键用「带日期的回看路径」，同一天反复点只切换状态
    favRoute: function (r) {
      // 走统一规格：/pages/daily/index?date=2026-10-24；日期缺失时退回不带参入口，
      // 不会出现 ?date=undefined 这种打不开的脏键
      return links.link('daily', { date: r && r.date }, links.entryOf('daily'));
    },
    isFaved: function (r) {
      return r ? util.isFav(this.favRoute(r)) : false;
    },
    toggleFav: function () {
      var r = this.data.record;
      if (!r) return;
      var route = this.favRoute(r);
      this.setData({
        faved: util.toggleFav({
          id: route,
          cat: 'daily',
          catName: '每日一签',
          title: r.date + ' · ' + r.level.label,
          route: route,
          time: r.time || Date.now()
        })
      });
    },

    backToday: function () {
      this.loadToday();
    },

    goHome: function () {
      util.back('/pages/index/index');
    },

    goCalendar: function () {
      util.nav('/pages/daily/calendar');
    },

    goHistory: function () {
      util.nav('/pages/history/index');
    },

    // 生成分享长图：把今日签文画成一张可保存的图
    makePoster: function () {
      var ctx = this;
      var r = this.data.record;
      if (!r) return;
      if (this._postering) return;
      this._postering = true;
      if (wx.showLoading) wx.showLoading({ title: '生成中', mask: true });

      var spec = {
        skin: 'daily',
        eyebrow: '每日一签',
        date: r.date,
        title: r.level.label,
        titleColor: r.level.color,
        subtitle: '第 ' + r.signNo + ' 签 · ' + r.theme.name,
        blocks: [
          { label: '签文', text: r.poem, serif: true, size: 15 },
          { label: '宜', text: r.yi.join(' · '), size: 14 },
          { label: '星语', text: r.xingyu, size: 14 }
        ],
        footer: '本内容仅供娱乐，不作为决策依据'
      };

      // 与原文同签名的 JY.poster.make 调用；网页版 success 收到的 path 即 dataURL
      poster.make(this, '#posterCanvas', spec, {
        success: function (path) {
          if (wx.hideLoading) wx.hideLoading();
          ctx._postering = false;
          // 网页版无相册：拿到 dataURL 直接触发下载（原 poster.save 改为 JY.saveDataUrl）
          JY.saveDataUrl(path, '每日一签-' + r.date + '.png');
        },
        fail: function () {
          if (wx.hideLoading) wx.hideLoading();
          ctx._postering = false;
          if (wx.showToast) wx.showToast({ title: '生成失败，可直接分享给好友', icon: 'none' });
        }
      });
    },

    // 原「分享给好友」按钮（open-type=share → onShareAppMessage 已删除）的网页版动作：
    // 与 makePoster 走同一条海报生成流程，成功后下载长图
    share: function () {
      this.makePoster();
    },

    render: function () {
      var self = this;
      var d = self.data;
      var rec = d.record;
      var body = '';

      /* 顶部：日期 / 回到今日 */
      var topTitle = d.past ? (d.pastDate + ' 日签') : '今日一签';
      var topDate = d.past ? (d.pastDate + ' ' + d.pastWeekday) : (d.today + ' ' + d.weekday);
      body += '<div class="d-top u-anim-in">' +
        '<div class="d-top__title">' + JY.esc(topTitle) + '</div>' +
        '<div class="d-top__date">' + JY.esc(topDate) + '</div>' +
        (d.past ? '<div class="d-top__back" data-act="backToday">‹ 回到今日</div>' : '') +
        '</div>';

      /* 未抽签：签筒 + 抽签 */
      if (d.state === 'idle') {
        body += '<div class="d-idle">' +
          '<div class="d-tube">' +
          '<div class="d-tube__body">🎴</div>' +
          '<div class="d-tube__sticks">' +
          '<div class="d-stick"></div><div class="d-stick"></div><div class="d-stick"></div>' +
          '</div></div>' +
          '<div class="d-idle__tip">静心片刻，摇一签问今日</div>' +
          '<button type="button" class="u-btn u-btn--primary u-btn--block d-draw" data-act="onDraw">抽 今 日 一 签</button>' +
          '<div class="u-mt-4">' + JY.ui.disclaimer({ type: 'short', size: 'sm' }) + '</div>' +
          '</div>';
      }

      /* 抽签中：翻页转场（以视觉特效替代震动） */
      if (d.state === 'turning' && d.turn) {
        body += '<div class="d-turn">' +
          '<div class="d-turn__stage">' +
          /* 翻走的一面：签筒卡背 */
          '<div class="d-turn__page d-turn__page--out"><div class="d-turn__side">' +
          '<div class="d-turn__sigil">🎴</div>' +
          '<div class="d-turn__hint">静 心 片 刻</div>' +
          '</div></div>' +
          /* 翻来的一面：结果封面 */
          '<div class="d-turn__page d-turn__page--in"><div class="d-turn__side d-turn__side--face">' +
          '<div class="d-turn__no">第 ' + JY.esc(d.turn.signNo) + ' 签</div>' +
          '<div class="d-turn__level" style="background:' + JY.esc(d.turn.color) + ';color:' + JY.esc(d.turn.text) + ';">' +
          JY.esc(d.turn.label) + ' · ' + JY.esc(d.turn.grade) + '</div>' +
          '<div class="d-turn__theme">' + JY.esc(d.turn.themeEmoji) + ' ' + JY.esc(d.turn.themeName) + '</div>' +
          '</div></div>' +
          '</div>' +
          '<div class="d-idle__tip">天机正在翻开…</div>' +
          '</div>';
      }

      /* 结果 */
      if (d.state === 'result' && rec) {
        var poemHtml = (d.poemLines || []).map(function (line) {
          return '<div class="d-poem__line">' + JY.esc(line) + '</div>';
        }).join('');
        var yiHtml = (rec.yi || []).map(function (t) {
          return '<span class="d-yiji__item">' + JY.esc(t) + '</span>';
        }).join('');
        var jiHtml = (rec.ji || []).map(function (t) {
          return '<span class="d-yiji__item">' + JY.esc(t) + '</span>';
        }).join('');
        var recentHtml = (d.recent || []).map(function (item) {
          return '<div class="d-past__item" data-date="' + JY.esc(item.date) + '" data-act="viewPast">' +
            '<div class="d-past__date">' + JY.esc(item.date) + '</div>' +
            '<div class="d-past__lv" style="color:' + JY.esc(item.color) + ';">' + JY.esc(item.label) + '</div>' +
            '<div class="d-past__em">' + JY.esc(item.emoji) + ' ' + JY.esc(item.name) + '</div>' +
            '</div>';
        }).join('');

        body += '<div class="d-result">' +

          '<div class="d-sign u-anim-in">' +
          '<div class="d-sign__no">第 ' + JY.esc(rec.signNo) + ' 签</div>' +
          '<div class="d-sign__level" style="background:' + JY.esc(rec.level.color) + ';color:' + JY.esc(rec.level.text) + ';">' +
          JY.esc(rec.level.label) + ' · ' + JY.esc(rec.level.grade) + '</div>' +
          '</div>' +

          /* 今日主题（可深入） */
          '<div class="d-theme" data-act="goTheme">' +
          '<div class="d-theme__emoji">' + JY.esc(rec.theme.emoji) + '</div>' +
          '<div class="d-theme__body">' +
          '<div class="d-theme__name">今日主题 · ' + JY.esc(rec.theme.name) + '</div>' +
          '<div class="d-theme__hint">' + JY.esc(rec.theme.hint) + '</div>' +
          '</div>' +
          (rec.theme.route
            ? '<div class="d-theme__go">去深入 ›</div>'
            : '<div class="d-theme__go d-theme__go--muted">心语</div>') +
          '</div>' +

          /* 诗句 */
          '<div class="d-poem">' + poemHtml + '</div>' +

          /* 签解 */
          '<div class="d-sec">' +
          '<div class="d-sec__t">签解</div>' +
          '<div class="d-sec__p">' + JY.esc(rec.level.desc) + '</div>' +
          '</div>' +

          /* 宜 / 忌 */
          '<div class="d-yiji">' +
          '<div class="d-yiji__col d-yiji__col--yi"><div class="d-yiji__h">宜</div><div class="d-yiji__items">' + yiHtml + '</div></div>' +
          '<div class="d-yiji__col d-yiji__col--ji"><div class="d-yiji__h">忌</div><div class="d-yiji__items">' + jiHtml + '</div></div>' +
          '</div>' +

          /* 幸运四宫格 */
          '<div class="d-luck">' +
          '<div class="d-luck__cell">' +
          '<div class="d-luck__k">幸运色</div>' +
          '<div class="d-luck__dot" style="background:' + JY.esc(rec.luck.color.hex) + ';"></div>' +
          '<div class="d-luck__v">' + JY.esc(rec.luck.color.name) + '</div>' +
          '</div>' +
          '<div class="d-luck__cell">' +
          '<div class="d-luck__k">幸运数字</div>' +
          '<div class="d-luck__v d-luck__v--big">' + JY.esc(rec.luck.num) + '</div>' +
          '</div>' +
          '<div class="d-luck__cell">' +
          '<div class="d-luck__k">吉时</div>' +
          '<div class="d-luck__v">' + JY.esc(rec.luck.time) + '</div>' +
          '</div>' +
          '<div class="d-luck__cell">' +
          '<div class="d-luck__k">方位</div>' +
          '<div class="d-luck__v">' + JY.esc(rec.luck.dir) + '方</div>' +
          '</div>' +
          '</div>' +

          /* 星语 */
          '<div class="d-xingyu">' +
          '<div class="d-xingyu__q">✧ 星语</div>' +
          '<div class="d-xingyu__p">' + JY.esc(rec.xingyu) + '</div>' +
          '</div>' +

          /* 操作 */
          '<div class="d-actions">' +
          '<button type="button" class="u-btn u-btn--ghost u-btn--block" data-act="share">分享给好友</button>' +
          '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="makePoster">生成分享长图</button>' +
          '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="toggleFav">' +
          (d.faved ? '已收藏 ★' : '收藏这一签') + '</button>' +
          (!d.past ? '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="goCalendar">签文日历 · 已连续 ' + JY.esc(d.streak) + ' 天</button>' : '') +
          (!d.past ? '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="goHistory">查看历史记录</button>' : '') +
          '<button type="button" class="u-btn u-btn--primary u-btn--block u-mt-3" data-act="goHome">回到首页</button>' +
          '</div>' +

          /* 过往日签 */
          (d.recent.length > 0 ?
            '<div class="u-sec u-mt-5">' +
            '<div class="u-sec__head">' +
            '<div class="u-sec__title">过往日签</div>' +
            '<div class="u-sec__sub">点开重温</div>' +
            '</div>' +
            '<div class="d-past">' + recentHtml + '</div>' +
            '</div>' : '') +

          '<div class="u-mt-4">' + JY.ui.disclaimer({ type: 'short', size: 'sm' }) + '</div>' +
          '<div class="u-safe"></div>' +
          '</div>';
      }

      return '<div class="pg t-root daily"><div class="pg__inner">' + body + '</div>' +
        /* 离屏画布：仅用于绘制分享长图，不参与页面布局 */
        '<canvas id="posterCanvas" class="u-poster-canvas" width="375" height="800"></canvas>' +
        '</div>';
    }
  };

  /* 路由键说明：core.js 的 go() 以带前导斜杠的 key（'/pages/daily/index'）查表；
     示范页注册的是无斜杠 key，两者存在不一致，这里两个键都注册以兼容任一修正方向 */
  JY.page('/pages/daily/index', cfg);
})();
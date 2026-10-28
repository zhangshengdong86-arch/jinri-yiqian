/**
 * 星座 · 详情页（slug: zodiac-detail）
 * 由 source/miniprogram/pages/zodiac/detail.{js,wxml,wxss,json} 转写：
 *  - detail.js 逻辑原样保留（require→JY.*），onShareAppMessage 删除、新增 share
 *  - detail.wxml → render() 模板（wx:for→map，bindtap→data-act；picker→<select data-evt>
 *    自绘选项；开关周期 tab 用 data-key 传值）
 *  - detail.wxss → css/pages/zodiac-detail.css（rpx÷2=px，含 .zc-hard 摩羯硬朗主题）
 * 与原文差异：
 *  - picker mode=selector range={{matchNames}} → <select data-evt="onMatch">，选项值=0..11 索引
 *    （e.detail.value 为字符串，原 onMatch 的 parseInt 照旧兼容）
 *  - 分享按钮（原 open-type="share"）→ data-act="share"：生成 zodiac 皮肤长图 + JY.saveDataUrl 下载
 *  - .zc-hard 主题变量装在根节点 .pg.t-zodiac.zc-hard（照原 wxss）
 */
(function () {
  var app = getApp();
  var DATA = JY.data;
  var util = JY.util;
  var links = JY.links;
  var store = JY.store;
  var poster = JY.poster;

  var PERIODS = [
    { key: 'day', name: '今日' },
    { key: 'week', name: '本周' },
    { key: 'month', name: '本月' },
    { key: 'year', name: '今年' }
  ];

  /** 稳定伪随机：同一星座 + 同一天 + 同一周期，结果不变 */
  function seedOf(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }

  function pickBySeed(arr, seed) {
    return arr[seed % arr.length];
  }

  var cfg = {
    navTitle: '星座详情',
    themeKey: 'zodiac',           // 兜底主题：星座类目星夜极光色板
    cssFile: 'zodiac-detail',

    data: {
      zodiacId: '',
      zodiac: null,
      periods: PERIODS,
      period: 'day',
      periodName: '今日',
      todayText: '',
      fortune: { overall: { score: 60, star: 3, text: '' } },
      dims: [],
      luckySign: '',
      matchNames: [],
      matchIndex: 0,
      match: null,
      // 视觉强化：部分星座使用专属硬朗主题（结构与布局不变，只换皮肤与素材）
      hard: false,
      heroImg: ''
    },

    onLoad: function (options) {
      options = options || {};
      const id = options.id || 'aries';
      const z = DATA.ZODIACS.filter(function (x) { return x.id === id; })[0] || DATA.ZODIACS[0];
      const names = DATA.ZODIACS.map(function (x) { return x.name; });
      const period = PERIODS.filter(function (x) { return x.key === (options.period || 'day'); })[0] || PERIODS[0];
      // 硬朗主题星座：摩羯（保留硬朗皮肤，但主视觉沿用统一的星座线稿；填文件名则用专属图）
      const HARD_IDS = { capricorn: '' };
      const hard = Object.keys(HARD_IDS).indexOf(z.id) >= 0;
      this.setData({
        zodiacId: z.id,
        zodiac: z,
        hard: hard,
        heroImg: HARD_IDS[z.id] || ('zd_art_' + z.id + '_lineart.webp'),
        matchNames: names,
        matchIndex: names.indexOf(z.id === 'aries' ? '狮子座' : '白羊座'),
        period: period.key,
        periodName: period.name,
        todayText: util.formatDate(new Date())
      });
      // 记录为常用星座
      const p = app.globalData.profile;
      if (!p || p.zodiacId !== z.id) {
        store.saveProfile(app, { zodiacId: z.id });
      }
      this.build();
    },

    onShow: function () {
      try { app.applyTheme('zodiac'); } catch (e) {}
    },

    switchPeriod: function (e) {
      const key = e.currentTarget.dataset.key;
      // 校验周期 key，非法值一律回落到"今日"，避免写出一条参数不合法的历史记录
      const p = PERIODS.filter(function (x) { return x.key === key; })[0] || PERIODS[0];
      this.setData({ period: p.key, periodName: p.name });
      this.build();
    },

    build: function () {
      const z = this.data.zodiac;
      const period = this.data.period;
      const dateKey = period === 'day' ? util.formatDate(new Date())
        : period === 'week' ? (util.formatDate(new Date()) + 'w')
        : period === 'month' ? util.formatDate(new Date()).slice(0, 7)
        : String(new Date().getFullYear());

      const base = seedOf(z.id + '|' + dateKey + '|' + period);
      const level = base % 3 === 0 ? 'high' : (base % 3 === 1 ? 'mid' : 'low');
      const pool = DATA.FORTUNE_POOL[level];

      function make(dimKey) {
        const s = seedOf(z.id + dateKey + period + dimKey);
        const star = (s % 5) + 1;
        const text = pickBySeed(pool[dimKey] || pool.overall, s);
        return { key: dimKey, star: star, text: text, score: star * 20 };
      }

      const dims = DATA.FORTUNE_DIMS.map(function (d) {
        const m = make(d.key);
        m.name = d.name;
        return m;
      });
      const overall = dims[0];
      const lucky = DATA.ZODIACS[(base + 3) % 12];

      this.setData({
        dims: dims,
        fortune: { overall: { score: overall.score, star: overall.star, text: overall.text } },
        luckySign: lucky.name
      });

      // 同一星座 + 同一周期只保留最新一条，避免切换周期把历史刷满
      app.upsertHistory({
        cat: 'zodiac',
        catName: '星座',
        title: z.name + ' · ' + this.data.periodName + '运势',
        route: links.link('zodiac', { id: z.id, period: this.data.period }, links.entryOf('zodiac'))
      });
    },

    onMatch: function (e) {
      const idx = parseInt(e.detail.value, 10);
      const z = this.data.zodiac;
      const target = DATA.ZODIACS[idx];
      this.setData({ matchIndex: idx });
      if (target.id === z.id) {
        this.setData({ match: null });
        util.toast('请选择另一个星座');
        return;
      }
      const s = seedOf(z.id + '&' + target.id);
      let score = 40 + (s % 60);
      if (z.element === target.element) score += 8;
      if (z.mode === target.mode) score += 4;
      if (score > 99) score = 99;
      let lv = DATA.MATCH_LEVELS[2];
      for (let i = 0; i < DATA.MATCH_LEVELS.length; i++) {
        if (score >= DATA.MATCH_LEVELS[i].min) { lv = DATA.MATCH_LEVELS[i]; break; }
      }
      this.setData({
        match: {
          score: score,
          levelName: lv.name,
          desc: lv.desc,
          tip: lv.tip
        }
      });
      util.vibrate('light');
    },

    goMatch: function () {
      util.nav('/pages/zodiac/match/index', { a: this.data.zodiacId });
    },

    goHistory: function () {
      util.nav('/pages/history/index', { cat: 'zodiac' });
    },

    backToList: function () {
      util.back('/pages/zodiac/index');
    },

    // 分享运势（原 open-type="share" 按钮 / onShareAppMessage 的网页版等价）：
    // 生成 zodiac 皮肤分享长图 → JY.saveDataUrl 触发浏览器下载
    share: function () {
      const ctx = this;
      const z = this.data.zodiac;
      if (!z) return;
      if (this._postering) return;
      this._postering = true;
      if (wx.showLoading) wx.showLoading({ title: '生成中', mask: true });

      const dimsText = (this.data.dims || []).map(function (d) {
        return d.name + '：' + d.text;
      }).join('\n');

      const spec = {
        skin: 'zodiac',
        eyebrow: '星座运势',
        date: this.data.todayText,
        title: z.name + ' · ' + this.data.periodName + '运势',
        subtitle: z.en + ' · ' + z.range,
        blocks: [
          { label: '综合', text: this.data.fortune.overall.text, size: 14 },
          { label: '五个维度', text: dimsText, size: 14 }
        ],
        footer: '本内容仅供娱乐，不作为决策依据'
      };

      poster.make(this, '#posterCanvas', spec, {
        success: function (path) {
          if (wx.hideLoading) wx.hideLoading();
          ctx._postering = false;
          JY.saveDataUrl(path, 'zodiac-' + z.id + '-' + ctx.data.period + '.png');
        },
        fail: function () {
          if (wx.hideLoading) wx.hideLoading();
          ctx._postering = false;
          if (wx.showToast) wx.showToast({ title: '生成失败，可截屏保存', icon: 'none' });
        }
      });
    },

    render: function () {
      var self = this;
      var d = self.data;
      var z = d.zodiac || {};
      var f = (d.fortune && d.fortune.overall) || { score: 0, star: 0, text: '' };

      /* 周期切换：原 wx:for="{{periods}}" wx:key="key" */
      var tabsHtml = (d.periods || []).map(function (item, index) {
        return '<div class="zd-tab' + (item.key === d.period ? ' is-on' : '') + '"' +
          ' data-act="switchPeriod" data-key="' + JY.esc(item.key) + '">' +
          JY.esc(item.name) + '</div>';
      }).join('');

      /* 综合分星级：原 wx:for="{{[1,2,3,4,5]}}" */
      var starHtml = [1, 2, 3, 4, 5].map(function (s) {
        return '<div class="u-star' + (s <= f.star ? ' u-star--on' : '') + '"></div>';
      }).join('');

      /* 五个维度：原 wx:for="{{dims}}" wx:key="key"，内部星级循环改内层 map */
      var dimsHtml = (d.dims || []).map(function (item, index) {
        var sub = [1, 2, 3, 4, 5].map(function (s) {
          return '<div class="u-star' + (s <= item.star ? ' u-star--on' : '') + '"></div>';
        }).join('');
        return '<div class="zd-dim">' +
          '<div class="zd-dim__k">' + JY.esc(item.name) + '</div>' +
          '<div class="u-stars">' + sub + '</div>' +
          '<div class="zd-dim__v">' + JY.esc(item.text) + '</div>' +
          '</div>';
      }).join('');

      /* 关键词：原 wx:for="{{zodiac.keywords}}" wx:key="*this"（text 标签） */
      var kwHtml = (z.keywords || []).map(function (item, index) {
        return '<span class="u-tag">' + JY.esc(item) + '</span>';
      }).join('');

      /* 配对的星座选择：原 picker range={{matchNames}} value={{matchIndex}} → select */
      var selectOptions = (d.matchNames || []).map(function (name, i) {
        return '<option value="' + i + '"' + (i === d.matchIndex ? ' selected' : '') + '>' + JY.esc(name) + '</option>';
      }).join('');

      return '<div class="pg t-zodiac' + (d.hard ? ' zc-hard' : '') + '">' +
        '<div class="pg__inner">' +

        /* 星座主视觉 */
        '<div class="zd-hero">' +
        '<div class="zd-hero__img">' +
        JY.ui.phImg({
          emoji: z.symbol,
          img: 'zodiac/' + d.heroImg,
          name: 'zd_hero_' + z.id + '.png',
          usage: (z.name || '') + '主视觉插画',
          ratio: '1:1',
          spec: '400×400 @2x',
          variant: 'dark',
          circle: true,
          inset: '-12'
        }) +
        '</div>' +
        '<div class="zd-hero__main">' +
        '<div class="zd-hero__sym">' + JY.esc(z.symbol) + '</div>' +
        '<div class="zd-hero__name">' + JY.esc(z.name) + '</div>' +
        '<div class="zd-hero__en">' + JY.esc(z.en) + ' · ' + JY.esc(z.range) + '</div>' +
        '<div class="zd-hero__tags">' +
        '<span class="u-tag">' + JY.esc(z.element) + '象</span>' +
        '<span class="u-tag">' + JY.esc(z.mode) + '</span>' +
        '<span class="u-tag">守护 ' + JY.esc(z.ruler) + '</span>' +
        '</div>' +
        '</div>' +
        '</div>' +

        /* 周期切换 */
        '<div class="zd-tabs">' + tabsHtml + '</div>' +

        /* 综合分 */
        '<div class="zd-score u-mt-3">' +
        '<div class="zd-score__num">' + JY.esc(f.score) + '</div>' +
        '<div class="zd-score__side">' +
        '<div class="zd-score__k">' + JY.esc(d.periodName) + '综合</div>' +
        '<div class="u-stars u-mt-2">' + starHtml + '</div>' +
        '<div class="zd-score__txt u-mt-2">' + JY.esc(f.text) + '</div>' +
        '</div>' +
        '</div>' +

        /* 五维 */
        '<div class="u-mt-3">' +
        JY.ui.sheetCard({
          title: '五个维度',
          sub: d.periodName + ' · ' + d.todayText,
          body: dimsHtml
        }) +
        '</div>' +

        /* 幸运物 */
        JY.ui.sheetCard({
          title: '幸运参考',
          sub: '娱乐性的小提示',
          body: '<div class="u-row"><div class="u-row__k">幸运色</div><div class="u-row__v">' + JY.esc(z.color) + '</div></div>' +
            '<div class="u-row"><div class="u-row__k">幸运数字</div><div class="u-row__v">' + JY.esc(z.number) + '</div></div>' +
            '<div class="u-row"><div class="u-row__k">幸运石</div><div class="u-row__v">' + JY.esc(z.stone) + '</div></div>' +
            '<div class="u-row"><div class="u-row__k">今日贵人星座</div><div class="u-row__v">' + JY.esc(d.luckySign) + '</div></div>'
        }) +

        /* 关键词 */
        JY.ui.sheetCard({
          title: '关键词',
          sub: '这个星座常被这样描述',
          body: '<div class="zd-kw">' + kwHtml + '</div>'
        }) +

        /* 配对 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">星座配对</div>' +
        '<div class="u-sec__sub">选一个星座</div>' +
        '</div>' +
        '<div class="u-card">' +
        '<select class="w-select" data-evt="onMatch">' + selectOptions + '</select>' +
        (d.match ?
          '<div class="zd-match u-mt-3">' +
          '<div class="zd-match__score">' + JY.esc(d.match.score) + '</div>' +
          '<div class="zd-match__info">' +
          '<div class="zd-match__name">' + JY.esc(d.match.levelName) + '</div>' +
          '<div class="zd-match__desc">' + JY.esc(d.match.desc) + '</div>' +
          '<div class="zd-match__tip">建议：' + JY.esc(d.match.tip) + '</div>' +
          '</div>' +
          '</div>' : '') +
        '</div>' +
        '</div>' +

        '<div class="u-mt-4">' + JY.ui.disclaimer({ type: 'full', withHealth: true }) + '</div>' +

        '<div class="cs-actions u-mt-4">' +
        '<button class="u-btn u-btn--ghost u-btn--block" type="button" data-act="goMatch">去配对页细看</button>' +
        '<button class="u-btn u-btn--ghost u-btn--block u-mt-3" type="button" data-act="goHistory">看全部记录</button>' +
        '<button class="u-btn u-btn--ghost u-btn--block u-mt-3" type="button" data-act="backToList">换个星座</button>' +
        '<button class="u-btn u-btn--primary u-btn--block u-mt-3" type="button" data-act="share">分享运势</button>' +
        '</div>' +
        '<div class="u-safe"></div>' +
        '</div>' +

        /* 离屏画布：分享长图专用 */
        '<canvas id="posterCanvas" class="u-poster-canvas" width="375" height="800"></canvas>' +
        '</div>';
    }
  };

  // 双键注册：core.go() 按「带前导斜杠」的 key 查 pages 表，而示范页 index.js 注册的是无斜杠 key，
  // 两端暂时不一致（T-D 组已在 js/pages/README.md 提请 Lead 归一），这里同注册两个 key 兼容两个方向。
  JY.page('pages/zodiac/detail', cfg);
})();
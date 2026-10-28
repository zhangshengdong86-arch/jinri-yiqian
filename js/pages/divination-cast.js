/**
 * 卜卦 · 起卦页（slug: divination-cast）
 * 由 source/miniprogram/pages/divination/cast.{js,wxml,wxss,json} 转写：
 *  - cast.js 逻辑原样保留（require→JY.*），onShareAppMessage 删除、新增 share（海报组约定）
 *  - cast.wxml → render() 模板（wx:if/elif/else→条件拼串，wx:for→map，bindtap→data-act，
 *    bindinput→data-evt，picker 无；canvas 转 <canvas id="posterCanvas">）
 *  - cast.wxss → css/pages/divination-cast.css（rpx÷2=px；cs-input/cs-ph/cs-count/cs-label/
 *    cs-text/cs-num/cs-nums/cs-actions 已提升到全局 base.css）
 * 与原文差异：
 *  - wx:else 分支（结果页）用 (this.data.result || {}) 兜底，等价于 WXML 对 null 的容错渲染
 *  - textarea/input 的 bindinput 走 data-evt（core 全局 input/change 委托，e.detail.value=值）
 *  - poster 调用保持原签名：JY.poster.make(this,'#posterCanvas',spec,{success,fail})、
 *    JY.poster.save(path)；share 为 onShareAppMessage 对应的按钮动作：生成后 JY.saveDataUrl 下载
 *  - 摇卦动画在三枚铜钱上用 CSS（qz-toss keyframes），rpx 数值已在 css 中 ÷2
 */
(function () {
  var app = getApp();
  var DATA = JY.data;
  var HX = JY.hexagram;
  var util = JY.util;
  var links = JY.links;
  var poster = JY.poster;

  var NO_TEXT = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

  /* 字背组合 → 爻象。背为阳记 3、字为阴记 2，三枚相加得 6/7/8/9：
     3 背 = 9 老阳 ○（阳动，阳极变阴）
     2 背 1 字 = 8 少阴（阴静）
     1 背 2 字 = 7 少阳（阳静）
     3 字 = 6 老阴 ×（阴动，阴极变阳） */
  var COIN_MAP = {
    3: { name: '老阳', yang: true, moving: true, mark: '○', combo: '三背', num: 9 },
    2: { name: '少阴', yang: false, moving: false, mark: '', combo: '二背一字', num: 8 },
    1: { name: '少阳', yang: true, moving: false, mark: '', combo: '一背二字', num: 7 },
    0: { name: '老阴', yang: false, moving: true, mark: '×', combo: '三字', num: 6 }
  };

  /** 静息态三枚均为「字」面朝上 */
  function REST_COINS() {
    return [
      { face: 0, faceText: '字' },
      { face: 0, faceText: '字' },
      { face: 0, faceText: '字' }
    ];
  }

  /** 历史回看参数："101010" -> [1,0,1,0,1,0] */
  function parseBits(str) {
    const out = [];
    if (!str) return out;
    String(str).split('').forEach(function (c) {
      if (c === '0' || c === '1') out.push(parseInt(c, 10));
    });
    return out;
  }

  function decode(s) {
    if (!s) return '';
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  /** 分享长图内容块：makePoster 与 share 共用同一套文案结构（原 makePoster 内联逻辑提取） */
  function shareBlocks(r) {
    var blocks = [
      { label: '卦辞', text: r.judge, serif: true, size: 15 },
      { label: '现代解读', text: r.modern, size: 14 }
    ];
    if (r.changed || r.mutual) {
      blocks.push({
        label: '变与互',
        text: '动爻：' + (r.movingText || '无') + '\n变卦：' + (r.changed || '—') + '　互卦：' + (r.mutual || '—'),
        size: 14
      });
    }
    blocks.push({
      label: '分项参考',
      text: '事业：' + r.career + '\n感情：' + r.love + '\n财运：' + r.wealth,
      size: 14
    });
    if (r.advice && r.advice.length) {
      blocks.push({ label: '可以做的一件小事', text: r.advice.join('\n'), size: 14 });
    }
    return blocks;
  }

  var cfg = {
    navTitle: '起卦',
    themeKey: 'divination',       // 兜底主题：卜卦类目水墨色板
    cssFile: 'divination-cast',

    data: {
      mode: 'coin',
      step: 'ask',
      question: '',
      numA: '',
      numB: '',
      textInput: '',
      nowText: '',
      coinDesc: '',
      coinTip: '',
      startText: '开始起卦',
      current: 0,
      yaoView: [],
      coinAnim: false,
      coins: REST_COINS(),
      coinCombo: '',
      coinText: '',
      finished: false,
      faved: false,
      yao: [],
      moving: [],
      result: null
    },

    onLoad: function (options) {
      options = options || {};
      const mode = options.mode || 'coin';
      const d = new Date();
      const map = {
        coin: '摇一卦',
        number: '起卦',
        time: '以此时起卦',
        text: '起卦',
        replay: '回看'
      };
      this.setData({
        mode: mode,
        coinDesc: DATA.COIN_RULES.desc,
        coinTip: DATA.COIN_RULES.movingTip,
        startText: map[mode] || '开始起卦',
        nowText: util.formatDate(d) + ' ' + util.formatTime(d)
      });

      // 历史回看：直接还原当时那一卦，不再写一条新记录
      if (mode === 'replay') {
        const yao = parseBits(options.yao);
        const mv = parseBits(options.mv);
        if (yao.length === 6) {
          this.setData({ question: decode(options.q), step: 'result', finished: false });
          this.finish(yao, mv.length === 6 ? mv : [0, 0, 0, 0, 0, 0], true);
          return;
        }
        util.toast('这条记录缺少参数，已回到起卦');
        this.setData({ mode: 'coin', step: 'ask', startText: '摇一卦' });
      }
    },

    onQuestion: function (e) { this.setData({ question: e.detail.value }); },
    onNumA: function (e) { this.setData({ numA: e.detail.value }); },
    onNumB: function (e) { this.setData({ numB: e.detail.value }); },
    onText: function (e) { this.setData({ textInput: e.detail.value }); },

    start: function () {
      const mode = this.data.mode;
      if (mode === 'number') {
        const a = parseInt(this.data.numA, 10);
        const b = parseInt(this.data.numB, 10);
        if (isNaN(a) || isNaN(b)) { util.toast('请输入两个数字'); return; }
        this.buildFromNumbers(a, b);
      } else if (mode === 'time') {
        const d = new Date();
        const sum = d.getFullYear() + (d.getMonth() + 1) + d.getDate();
        this.buildFromNumbers(sum, sum + d.getHours() + 1);
      } else if (mode === 'text') {
        const t = (this.data.textInput || '').replace(/\s/g, '');
        if (t.length < 2) { util.toast('至少写两个字'); return; }
        const half = Math.ceil(t.length / 2);
        this.buildFromNumbers(half, t.length);
      } else {
        this.setData({
          step: 'casting',
          current: 0,
          finished: false,
          yao: [],
          moving: [],
          yaoView: this.emptyView(),
          coins: REST_COINS(),
          coinCombo: '',
          coinText: ''
        });
      }
    },

    emptyView: function () {
      const arr = [];
      for (let i = 0; i < 6; i++) {
        arr.push({ index: i, noText: NO_TEXT[i], yang: false, moving: false, markText: '', empty: true });
      }
      return arr.reverse();
    },

    /** 铜钱摇一爻：真掷三枚（每枚字/背各 1/2），再按字背组合判定爻象 */
    throwOnce: function () {
      const ctx = this;
      // 以已摇出的爻数为准终止：摇满六爻或已出结果就不再接受点击，
      // 避免「手快多点一次」摇出第七爻、写出一条无法回看的脏记录
      if (this.data.coinAnim) return;
      if (this.data.yao.length >= 6) return;
      if (this.data.step !== 'casting') return;

      // 掷三枚：1 = 背，0 = 字
      const faces = [0, 1, 2].map(function () { return Math.random() < 0.5 ? 1 : 0; });
      const backCount = faces.reduce(function (a, b) { return a + b; }, 0);
      const rule = COIN_MAP[backCount];
      const coins = faces.map(function (f) { return { face: f, faceText: f ? '背' : '字' }; });

      // 先翻面（动画 580ms），翻停即揭晓本爻
      this.setData({ coins: coins, coinAnim: true, coinCombo: '', coinText: '' });

      setTimeout(function () {
        const yao = ctx.data.yao.slice();
        const movingArr = ctx.data.moving.slice();
        yao.push(rule.yang ? 1 : 0);
        movingArr.push(rule.moving ? 1 : 0);

        const view = [];
        for (let i = 0; i < 6; i++) {
          const done = i < yao.length;
          view.push({
            index: i,
            noText: NO_TEXT[i],
            yang: done ? yao[i] === 1 : true,
            moving: done ? movingArr[i] === 1 : false,
            markText: done ? (yao[i] === 1 ? (movingArr[i] ? '老阳 ○' : '少阳') : (movingArr[i] ? '老阴 ×' : '少阴')) : '',
            empty: !done
          });
        }
        view.reverse();

        const judge = rule.moving
          ? (rule.name + ' ' + rule.mark + ' · 动爻，' + (rule.yang ? '阳极变阴' : '阴极变阳'))
          : (rule.name + ' · ' + (rule.yang ? '阳爻' : '阴爻') + '，静爻');

        // current 一视同仁地推进到 6，摇满后按钮不再响应
        ctx.setData({
          yao: yao,
          moving: movingArr,
          yaoView: view,
          coinAnim: false,
          current: yao.length,
          coinCombo: rule.combo + ' · ' + rule.num,
          coinText: judge
        });

        if (yao.length >= 6) {
          setTimeout(function () { ctx.finish(yao, movingArr); }, 500);
        }
      }, 620);
    },

    buildFromNumbers: function (a, b) {
      const lower = HX.numToTrigram(a);
      const upper = HX.numToTrigram(b);
      const lowerBits = HX.TRIGRAM_BITS[lower];
      const upperBits = HX.TRIGRAM_BITS[upper];
      const yao = lowerBits.concat(upperBits);
      const mv = HX.numToMoving(a + b);
      const moving = [0, 0, 0, 0, 0, 0];
      moving[mv - 1] = 1;
      this.finish(yao, moving);
    },

    finish: function (yao, moving, isReplay) {
      // 一次起卦只写一条记录：防连点、防动画回调重入
      if (this.data.finished) return;
      const h = HX.hexagramOf(yao);
      const changedYao = yao.map(function (v, i) { return moving[i] ? (v === 1 ? 0 : 1) : v; });
      const ch = HX.hexagramOf(changedYao);
      const mu = HX.mutualOf(yao);
      const detail = this.findDetail(h.name);
      const mvText = moving.map(function (m, i) { return m ? NO_TEXT[i] : null; }).filter(Boolean);

      const yaoView = HX.renderYao(yao, moving).map(function (y) {
        return {
          index: y.index,
          noText: NO_TEXT[y.index - 1],
          yang: y.yang,
          moving: y.moving,
          markText: y.moving ? (y.yang ? '○' : '×') : ''
        };
      }).reverse();

      const result = {
        name: h.name,
        upper: h.upper,
        lower: h.lower,
        level: detail.level,
        judge: detail.judge,
        meaning: detail.meaning,
        modern: detail.modern,
        career: detail.career,
        love: detail.love,
        wealth: detail.wealth,
        health: detail.health,
        advice: detail.advice,
        changed: ch.name,
        mutual: mu.name,
        movingText: mvText.length ? mvText.join('、') : '无动爻',
        yaoView: yaoView
      };

      this.setData({ step: 'result', result: result, yao: yao, moving: moving, finished: true });

      // 回看参数：顺序与编码由 links.js 统一（场景 mode → 卦象 yao → 动爻 mv → 所问 q）
      this._replayParams = {
        mode: 'replay',
        yao: yao.join(''),
        mv: moving.join(''),
        q: this.data.question
      };

      if (!isReplay) {
        this._favRec = app.addHistory({
          cat: 'divination',
          catName: '卜卦',
          title: h.name + ' · ' + (this.data.question || '未填写所问'),
          route: links.link('divination', this._replayParams, links.entryOf('divination'))
        });
        this.setData({ faved: util.isFav(this._favRec.route) });
      } else {
        // 回看场景不写历史，按当前页面参数重建，保证「收藏」仍可用
        this._favRec = {
          cat: 'divination',
          catName: '卜卦',
          title: h.name + ' · ' + (this.data.question || '未填写所问'),
          // 与生成侧同一构造函数，重键才不会漂移；构造失败时退回按 options 原样重建
          route: links.link('divination', this._replayParams, '') || util.currentRoute(this)
        };
        this.setData({ faved: util.isFav(this._favRec.route) });
      }
      util.vibrate('heavy');
    },

    /** 从示例库找详情；找不到则用象意生成通用文案（待补数据时不至空白） */
    findDetail: function (name) {
      for (let i = 0; i < DATA.HEXAGRAMS.length; i++) {
        if (DATA.HEXAGRAMS[i].name === name) return DATA.HEXAGRAMS[i];
      }
      const tri = {};
      DATA.TRIGRAMS.forEach(function (t) { tri[t.name] = t; });
      const up = tri[name.charAt(0)] || { key: '', nature: '' };
      const lo = tri[name.charAt(name.length - 1)] || { key: '', nature: '' };
      return {
        level: '待补',
        judge: '卦辞待内容库补充',
        meaning: '上' + up.nature + '下' + lo.nature + '，' + up.key + '而' + lo.key + '。',
        modern: '完整卦辞与四维度解读待数据补齐后展示，当前为基于卦象结构的通用描述。',
        career: '结合卦象：宜' + up.key + '，忌冒进。',
        love: '结合卦象：以' + lo.key + '的方式回应更有效。',
        wealth: '守常为宜。',
        health: '留意作息与情绪。',
        advice: ['先把问题写清楚', '做一件今天就能完成的小事']
      };
    },

    restart: function () {
      this.setData({
        step: 'ask',
        question: '',
        numA: '',
        numB: '',
        textInput: '',
        yao: [],
        moving: [],
        result: null,
        current: 0,
        finished: false,
        coins: REST_COINS(),
        coinCombo: '',
        coinText: ''
      });
    },

    /** 带着本卦名去速查页，自动定位到这一卦 */
    goGlossary: function () {
      const name = this.data.result ? this.data.result.name : '';
      util.nav('/pages/divination/glossary/index', { kw: name });
    },

    goHistory: function () {
      util.nav('/pages/history/index', { cat: 'divination' });
    },

    goBack: function () {
      util.back('/pages/divination/index');
    },

    // 收藏这一卦（以回看路径为键，重复点只切换状态）
    toggleFav: function () {
      if (!this._favRec) return;
      this.setData({ faved: util.toggleFav(this._favRec) });
    },

    // 生成分享长图：卦象 + 卦辞 + 现代解读
    makePoster: function () {
      const ctx = this;
      const r = this.data.result;
      if (!r) return;
      if (this._postering) return;
      this._postering = true;
      if (wx.showLoading) wx.showLoading({ title: '生成中', mask: true });

      const blocks = shareBlocks(r);

      poster.make(this, '#posterCanvas', {
        skin: 'divination',
        eyebrow: '铜钱六爻',
        date: '',
        title: r.name,
        subtitle: r.changed ? ('本卦 ' + r.name + ' → 变卦 ' + r.changed) : ('本卦 · ' + r.name),
        blocks: blocks,
        footer: '本内容仅供娱乐，不作为决策依据'
      }, {
        success: function (path) {
          if (wx.hideLoading) wx.hideLoading();
          ctx._postering = false;
          poster.save(path);
        },
        fail: function () {
          if (wx.hideLoading) wx.hideLoading();
          ctx._postering = false;
          if (wx.showToast) wx.showToast({ title: '生成失败，可直接分享给好友', icon: 'none' });
        }
      });
    },

    // 分享这一卦（原 open-type="share" 按钮 / onShareAppMessage 的网页版等价）：
    // 生成分享长图 → JY.saveDataUrl 触发浏览器下载
    share: function () {
      const ctx = this;
      const r = this.data.result;
      if (!r) {
        util.toast('先起一卦再分享');
        return;
      }
      if (this._postering) return;
      this._postering = true;
      if (wx.showLoading) wx.showLoading({ title: '生成中', mask: true });

      poster.make(this, '#posterCanvas', {
        skin: 'divination',
        eyebrow: '铜钱六爻',
        date: '',
        title: r.name,
        subtitle: r.changed ? ('本卦 ' + r.name + ' → 变卦 ' + r.changed) : ('本卦 · ' + r.name),
        blocks: shareBlocks(r),
        footer: '本内容仅供娱乐，不作为决策依据'
      }, {
        success: function (path) {
          if (wx.hideLoading) wx.hideLoading();
          ctx._postering = false;
          JY.saveDataUrl(path, 'divination-' + r.name + '.png');
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

      /* ---------- 步骤一：所问之事 ---------- */
      var askHtml = '<div class="u-anim-in">' +
        '<div class="u-sec">' +
        '<div class="u-sec__title">心中默念所问之事</div>' +
        '<div class="u-sec__sub">写下来，有助于你聚焦问题</div>' +
        '</div>' +
        '<div class="u-card u-mt-3">' +
        '<textarea class="cs-input" data-evt="onQuestion" maxlength="40" placeholder="例如：这个月要不要换个工作节奏">' +
        JY.esc(d.question) +
        '</textarea>' +
        '<div class="cs-count">' + String(d.question || '').length + '/40</div>' +
        '</div>' +

        (d.mode === 'number' ?
          '<div class="u-card u-mt-3">' +
          '<div class="cs-label">报两个数字</div>' +
          '<div class="cs-nums">' +
          '<input class="cs-num" type="number" data-evt="onNumA" value="' + JY.esc(d.numA) + '" placeholder="数字一" />' +
          '<input class="cs-num" type="number" data-evt="onNumB" value="' + JY.esc(d.numB) + '" placeholder="数字二" />' +
          '</div>' +
          '<div class="u-t--hint u-mt-2">随意报出即可，不必刻意挑选</div>' +
          '</div>' : '') +

        (d.mode === 'text' ?
          '<div class="u-card u-mt-3">' +
          '<div class="cs-label">写一句话（不超过 20 字）</div>' +
          '<input class="cs-text" data-evt="onText" maxlength="20" value="' + JY.esc(d.textInput) + '" placeholder="以字数分上下卦" />' +
          '</div>' : '') +

        (d.mode === 'time' ?
          '<div class="u-card u-card--flat u-mt-3">' +
          '<div class="u-t--sub">将使用当前时间起卦：' + JY.esc(d.nowText) + '</div>' +
          '</div>' : '') +

        (d.mode === 'coin' ?
          '<div class="u-card u-card--flat u-mt-3">' +
          '<div class="u-t--sub">' + JY.esc(d.coinDesc) + '</div>' +
          '<div class="u-t--hint u-mt-2">' + JY.esc(d.coinTip) + '</div>' +
          '</div>' : '') +

        '<div class="u-mt-4">' +
        '<button class="u-btn u-btn--primary u-btn--block" type="button" data-act="start">' + JY.esc(d.startText) + '</button>' +
        '</div>' +
        '<div class="u-mt-3">' + JY.ui.disclaimer({ type: 'short', size: 'sm' }) + '</div>' +
        '</div>';

      /* ---------- 步骤二：摇卦中 ---------- */
      var yaoRowsHtml = (d.yaoView || []).map(function (item, index) {
        return '<div class="cs-yao__row">' +
          '<div class="cs-yao__no">' + JY.esc(item.noText) + '</div>' +
          '<div class="cs-yao__line' + (item.yang ? ' is-yang' : ' is-yin') + (item.moving ? ' is-moving' : '') + '">' +
          '<div class="cs-yao__seg"></div>' +
          (item.yang ? '' : '<div class="cs-yao__seg"></div>') +
          '</div>' +
          '<div class="cs-yao__mark">' + JY.esc(item.markText || '') + '</div>' +
          '</div>';
      }).join('');

      var coinsHtml = (d.coins || []).map(function (item, index) {
        return '<div class="cs-coin__slot">' +
          '<div class="qz-coin' + (item.face ? ' is-back' : '') + (d.coinAnim ? ' is-toss' : '') + '"' +
          ' style="animation-delay:' + (index * 90) + 'ms">' +
          '<div class="qz-coin__face qz-coin__face--front">' +
          '<div class="qz-coin__hole"></div>' +
          '<span class="qz-coin__char qz-coin__char--l">通</span>' +
          '<span class="qz-coin__char qz-coin__char--r">寶</span>' +
          '</div>' +
          '<div class="qz-coin__face qz-coin__face--back">' +
          '<div class="qz-coin__hole"></div>' +
          '<div class="qz-coin__manchu qz-coin__manchu--l"></div>' +
          '<div class="qz-coin__manchu qz-coin__manchu--r"></div>' +
          '</div>' +
          '</div>' +
          '<div class="cs-coin__tag">' + JY.esc(item.faceText) + '</div>' +
          '</div>';
      }).join('');

      var castHtml = '<div class="u-anim-in">' +
        '<div class="cs-stage">' +
        (d.question ? '<div class="cs-stage__q">' + JY.esc(d.question) + '</div>' : '') +
        '<div class="cs-stage__no">第 ' + d.current + '/6 爻</div>' +
        '<div class="cs-yao">' + yaoRowsHtml + '</div>' +
        '<div class="cs-coin">' + coinsHtml + '</div>' +
        (d.coinText ?
          '<div class="cs-read">' +
          '<div class="cs-read__combo">' + JY.esc(d.coinCombo) + '</div>' +
          '<div class="cs-read__judge">' + JY.esc(d.coinText) + '</div>' +
          '</div>' : '') +
        (d.current < 6 ?
          '<button class="u-btn u-btn--primary u-btn--block u-mt-4" type="button" data-act="throwOnce">' +
          (d.current === 0 ? '开始摇卦' : '再摇一次') +
          '</button>' : '') +
        '</div>' +
        '</div>';

      /* ---------- 步骤三：结果 ---------- */
      var res = d.result || {};
      var adviceHtml = (res.advice || []).map(function (item, index) {
        return '<div class="u-row"><div class="u-row__v">' + (index + 1) + '. ' + JY.esc(item) + '</div></div>';
      }).join('');

      var frameYaoHtml = (res.yaoView || []).map(function (item, index) {
        return '<div class="cs-frame__row">' +
          '<div class="cs-frame__line' + (item.yang ? ' is-yang' : ' is-yin') + '"></div>' +
          (item.moving ? '<div class="cs-frame__mark">' + JY.esc(item.markText) + '</div>' : '') +
          '</div>';
      }).join('');

      var resultHtml = '<div class="u-anim-up">' +
        '<div class="cs-res__head">' +
        '<div class="cs-res__sub">所问 · ' + JY.esc(d.question || '未填写') + '</div>' +
        '<div class="cs-res__name">' + JY.esc(res.name) + '</div>' +
        '<div class="cs-res__meta">' + JY.esc(res.upper) + '上 ' + JY.esc(res.lower) + '下 · ' + JY.esc(res.level) + '</div>' +
        '</div>' +

        '<div class="cs-frame u-mt-3">' +
        JY.ui.phImg({
          emoji: '☰',
          img: 'divination/dv_hexagram_frame.webp',
          name: 'dv_hexagram_frame.webp',
          usage: '卦画框 · 水墨衬底',
          ratio: '3:2',
          spec: '600×400 @2x'
        }) +
        '<div class="cs-frame__yao">' + frameYaoHtml + '</div>' +
        '</div>' +

        '<div class="u-mt-3">' +
        JY.ui.sheetCard({
          title: '卦象概述',
          sub: '本卦 · ' + JY.esc(res.name),
          body: '<div class="u-t">' + JY.esc(res.judge) + '</div>' +
            '<div class="u-div"></div>' +
            '<div class="u-t--sub">' + JY.esc(res.meaning) + '</div>'
        }) +
        '</div>' +

        JY.ui.sheetCard({
          title: '现代解读',
          body: '<div class="u-t--sub">' + JY.esc(res.modern) + '</div>'
        }) +

        JY.ui.sheetCard({
          title: '分项参考',
          sub: '娱乐性描述，不作为决策依据',
          body: '<div class="u-row"><div class="u-row__k">事业</div><div class="u-row__v">' + JY.esc(res.career) + '</div></div>' +
            '<div class="u-row"><div class="u-row__k">感情</div><div class="u-row__v">' + JY.esc(res.love) + '</div></div>' +
            '<div class="u-row"><div class="u-row__k">财运</div><div class="u-row__v">' + JY.esc(res.wealth) + '</div></div>' +
            '<div class="u-row"><div class="u-row__k">健康</div><div class="u-row__v">' + JY.esc(res.health) + '</div></div>'
        }) +

        JY.ui.sheetCard({
          title: '变与互',
          sub: '动爻 ' + JY.esc(res.movingText),
          body: '<div class="u-row"><div class="u-row__k">变卦</div><div class="u-row__v">' + JY.esc(res.changed) + '</div></div>' +
            '<div class="u-row"><div class="u-row__k">互卦</div><div class="u-row__v">' + JY.esc(res.mutual) + '</div></div>' +
            '<div class="u-t--hint u-mt-2">动爻代表变化的位置，互卦代表过程中的内在结构。</div>'
        }) +

        (res.advice && res.advice.length > 0 ?
          JY.ui.sheetCard({ title: '可以做的一件小事', body: adviceHtml }) : '') +

        '<div class="u-mt-3">' + JY.ui.disclaimer({ type: 'full', withHealth: true }) + '</div>' +

        '<div class="cs-actions u-mt-4">' +
        '<button class="u-btn u-btn--ghost u-btn--block" type="button" data-act="restart">再起一卦</button>' +
        (d.result ?
          '<button class="u-btn u-btn--ghost u-btn--block u-mt-3" type="button" data-act="toggleFav">' +
          (d.faved ? '已收藏 ★' : '收藏这一卦') + '</button>' : '') +
        '<button class="u-btn u-btn--ghost u-btn--block u-mt-3" type="button" data-act="goGlossary">查这一卦的卦辞</button>' +
        '<button class="u-btn u-btn--ghost u-btn--block u-mt-3" type="button" data-act="goHistory">看全部记录</button>' +
        '<button class="u-btn u-btn--primary u-btn--block u-mt-3" type="button" data-act="share">分享这一卦</button>' +
        '<button class="u-btn u-btn--ghost u-btn--block u-mt-3" type="button" data-act="makePoster">生成分享长图</button>' +
        '<button class="u-btn u-btn--ghost u-btn--block u-mt-3" type="button" data-act="goBack">返回卜卦</button>' +
        '</div>' +
        '</div>';

      var stepHtml = d.step === 'ask' ? askHtml : (d.step === 'casting' ? castHtml : resultHtml);

      return '<div class="pg t-divination">' +
        '<div class="pg__inner">' +
        stepHtml +
        '<div class="u-safe"></div>' +
        '</div>' +

        /* 离屏画布：仅用于绘制分享长图，不参与页面布局 */
        '<canvas id="posterCanvas" class="u-poster-canvas" width="375" height="800"></canvas>' +
        '</div>';
    }
  };

  // 双键注册：core.go() 按「带前导斜杠」的 key 查 pages 表，而示范页 index.js 注册的是无斜杠 key，
  // 两端暂时不一致（T-D 组已在 js/pages/README.md 提请 Lead 归一），这里同注册两个 key 兼容两个方向。
  JY.page('pages/divination/cast', cfg);
})();
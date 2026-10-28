/**
 * 塔罗抽牌 · tarot-reading
 * 由 package-tarot/pages/tarot/reading 三件套转写：
 *  - reading.js 逻辑原样保留（require→JY.*，const→var；onShareAppMessage 删除，
 *    open-type="share" 按钮改 data-act="share"）
 *  - 【动画改造】原翻牌本就用 CSS transition + 3D transform（.tr-card__inner/.is-flip，
 *    backface-visibility 等），无 wx.createAnimation 依赖 → 直接沿用 CSS 3D 翻牌，
 *    洗牌仍是 source 里的 setTimeout 状态机，原样保留。
 *  - 【输入改造】textarea 的 bindinput 走 data-evt；为避免每次输入都整页重渲染丢焦点，
 *    onQuestion 改为直接写 this.data.question + 局部更新字数（逻辑等价，见方法内注释）。
 *  - 牌图 key 原样：tarot/tarot_card_N.webp / tarot/tarot_back.webp（JY.images.resolve
 *    映射到 assets/tarot/）。
 * w- 辅助类：无（翻牌 3D 类沿用原 .tr-card 系列；textarea 占位色见页面 css）。
 */
(function () {
  var app = getApp();
  var DATA = JY.data;
  var util = JY.util;
  var links = JY.links;
  var poster = JY.poster;

  var pageCfg = {
    navTitle: '抽牌',
    themeKey: 'tarot',
    cssFile: 'tarot-reading',

    data: {
      spread: null,
      step: 'ask',
      question: '',
      cards: [],
      openedCount: 0,
      allFlipped: false,
      summary: '',
      faved: false,
      previewCard: null
    },

    onLoad: function (options) {
      options = options || {}
      var id = options.spread || 'triangle'
      var sp = DATA.SPREADS.filter(function (s) { return s.id === id })[0] || DATA.SPREADS[1]
      this.setData({ spread: sp })

      // 历史回看：按记录里的牌面还原，不再写一条新记录
      if (options.auto === '1' && options.cards) {
        var ids = String(options.cards).split(',')
        var revs = String(options.rev || '').split(',')
        var q = ''
        if (options.q) { try { q = decodeURIComponent(options.q) } catch (e) { q = options.q } }
        var cards = sp.positions.map(function (p, i) {
          var card = DATA.TAROT_CARDS.filter(function (c) { return String(c.id) === String(ids[i]) })[0]
          return {
            i: i,
            posName: p.name,
            posMeaning: p.meaning,
            card: card || DATA.TAROT_CARDS[0],
            reversed: revs[i] === '1',
            flipped: true
          }
        })
        this.setData({
          question: q,
          cards: cards,
          openedCount: cards.length,
          allFlipped: true,
          step: 'result'
        })
        this.showResult(true)
        // 回看场景不写历史，这里重建收藏记录，保证「收藏」仍可用
        this._favRec = {
          cat: 'tarot',
          catName: '塔罗',
          title: sp.name + ' · ' + (q || '未填写问题'),
          // 与生成侧同一构造函数，重键才不会漂移；构造失败时退回按 options 原样重建
          route: links.link('tarot', this._replayParams, '') || util.currentRoute(this)
        }
        this.setData({ faved: util.isFav(this._favRec.route) })
      }
    },

    onShow: function () {
      try { app.applyTheme('tarot') } catch (e) {}
    },

    // 原 bindinput。网页差异：setData 会整页重渲染、文本框丢焦点，
    // 因此直接写 data + 局部更新字数计数（#wQCount）。其余消费点（抽牌页头/结果页头）
    // 都是在后续整页渲染时读取 this.data.question，值保持一致。
    onQuestion: function (e) {
      var v = e.detail.value
      this.data.question = v
      var c = document.getElementById('wQCount')
      if (c) c.textContent = v.length + '/40'
    },

    shuffle: function () {
      var ctx = this
      this.setData({ step: 'shuffle' })
      util.vibrate('light')
      setTimeout(function () {
        var sp = ctx.data.spread
        var pool = util.shuffle(DATA.TAROT_CARDS)
        var picked = pool.slice(0, sp.count)
        var cards = sp.positions.map(function (p, i) {
          var card = picked[i] || pool[0]
          return {
            i: i,
            posName: p.name,
            posMeaning: p.meaning,
            card: card,
            reversed: util.chance(DATA.DRAW_RULES.reversedRate),
            flipped: false
          }
        })
        ctx.setData({ step: 'pick', cards: cards, openedCount: 0, allFlipped: false })
      }, 1400)
    },

    flipCard: function (e) {
      var idx = parseInt(e.currentTarget.dataset.index, 10)
      var cards = this.data.cards.slice()
      if (!cards[idx] || cards[idx].flipped) return
      cards[idx].flipped = true
      var opened = cards.filter(function (c) { return c.flipped }).length
      this.setData({
        cards: cards,
        openedCount: opened,
        allFlipped: opened >= cards.length
      })
      util.vibrate('medium')
    },

    showResult: function (skipHistory) {
      var cards = this.data.cards
      if (!cards || !cards.length) {
        util.toast('先洗牌再翻牌')
        return
      }
      // 综合：大阿尔卡纳优先，其次取中间位置
      var core = cards.filter(function (c) { return c.card.arcana === 'major' })[0]
      if (!core) core = cards[Math.floor(cards.length / 2)]
      var rev = core.reversed
      var summary = '这组牌的核心是「' + core.card.name + '」（' + (rev ? '逆位' : '正位') +
        '）。' + (rev ? core.card.revText : core.card.upText) +
        '结合' + this.data.spread.name + '的位置关系，可以把注意力先放在' + core.posName + '上：' + core.card.advice

      this.setData({ step: 'result', summary: summary })

      // 回看参数：顺序与编码由 links.js 统一（牌阵 → auto → 牌序 → 正逆 → 所问）
      var sp = this.data.spread || {}
      this._replayParams = {
        spread: sp.id,
        auto: 1,
        cards: cards.map(function (c) { return c.card.id }),
        rev: cards.map(function (c) { return c.reversed ? 1 : 0 }),
        q: this.data.question
      }

      if (!skipHistory) {
        this._favRec = app.addHistory({
          cat: 'tarot',
          catName: '塔罗',
          title: this.data.spread.name + ' · ' + (this.data.question || '未填写问题'),
          route: links.link('tarot', this._replayParams, links.entryOf('tarot'))
        })
        this.setData({ faved: util.isFav(this._favRec.route) })
      }
    },

    restart: function () {
      this.setData({ step: 'ask', cards: [], openedCount: 0, allFlipped: false, summary: '', previewCard: null })
    },

    // 点击牌面放大查看
    openPreview: function (e) {
      var idx = parseInt(e.currentTarget.dataset.index, 10)
      var c = this.data.cards[idx]
      if (!c) return
      this.setData({ previewCard: c })
    },
    closePreview: function () {
      this.setData({ previewCard: null })
    },

    goCards: function () {
      var core = this.data.cards[0]
      util.nav('/package-tarot/pages/tarot/cards/index', { kw: core ? core.card.name : '' })
    },

    goHistory: function () {
      util.nav('/pages/history/index', { cat: 'tarot' })
    },

    goBack: function () {
      util.back('/package-tarot/pages/tarot/index')
    },

    // 收藏这组牌
    toggleFav: function () {
      if (!this._favRec) return
      this.setData({ faved: util.toggleFav(this._favRec) })
    },

    // 分享（原 open-type="share" 按钮）：网页版无系统分享，走「生成分享长图并下载」同一流程
    share: function () {
      this.makePoster()
    },

    // 生成分享长图：牌阵 + 每张牌正逆位 + 综合（调用签名与 utils/poster.js 保持一致；
    // 成功回调里的 path 为 dataURL，由 JY.poster.save → JY.saveDataUrl 触发下载）
    makePoster: function () {
      var ctx = this
      var cards = this.data.cards || []
      if (!cards.length || !this.data.summary) return
      if (this._postering) return
      this._postering = true
      if (wx.showLoading) wx.showLoading({ title: '生成中', mask: true })

      var sp = this.data.spread || {}
      var core = cards.filter(function (c) { return c.card.arcana === 'major' })[0]
      if (!core) core = cards[Math.floor(cards.length / 2)]

      var blocks = [{
        label: '牌阵 · ' + sp.name,
        text: cards.map(function (c) {
          return c.posName + '：' + c.card.name + '（' + (c.reversed ? '逆位' : '正位') + '）\n' +
            (c.reversed ? c.card.revText : c.card.upText)
        }).join('\n'),
        size: 14
      }, {
        label: '综合',
        text: this.data.summary,
        size: 14
      }]

      poster.make(this, '#posterCanvas', {
        skin: 'tarot',
        eyebrow: '塔罗',
        date: '',
        title: core.card.name,
        subtitle: sp.name + ' · ' + (core.reversed ? '逆位' : '正位'),
        blocks: blocks,
        footer: '本内容仅供娱乐，不作为决策依据'
      }, {
        success: function (path) {
          if (wx.hideLoading) wx.hideLoading()
          ctx._postering = false
          poster.save(path)
        },
        fail: function () {
          if (wx.hideLoading) wx.hideLoading()
          ctx._postering = false
          if (wx.showToast) wx.showToast({ title: '生成失败，可直接分享给好友', icon: 'none' })
        }
      })
    },

    render: function () {
      var self = this;
      var step = self.data.step;
      var sp = self.data.spread || {};

      /* 一、提问 */
      var askHtml = (step === 'ask') ? (
        '<div class="u-anim-in">' +
        '<div class="tr-ask__head">' +
        '<div class="tr-ask__spread">' + JY.esc(sp.name) + '</div>' +
        '<div class="tr-ask__count">' + JY.esc(sp.count) + ' 张 · ' + JY.esc(sp.scene) + '</div>' +
        '<div class="tr-ask__desc">' + JY.esc(sp.desc) + '</div>' +
        '</div>' +
        '<div class="u-card u-mt-4">' +
        '<div class="u-t--sub">默想你的问题，写下来</div>' +
        '<textarea class="tr-ask__input u-mt-2" data-evt="onQuestion" maxlength="40"' +
        ' placeholder="例如：这个季度该把重心放在哪里">' + JY.esc(self.data.question) + '</textarea>' +
        '<div class="cs-count" id="wQCount">' + JY.esc((self.data.question || '').length) + '/40</div>' +
        '</div>' +
        '<div class="u-card u-card--flat u-mt-3">' +
        '<div class="u-t--hint">位置含义</div>' +
        (sp.positions || []).map(function (item, index) {
          return '<div class="u-row"><div class="u-row__k">' + JY.esc(item.name) + '</div>' +
            '<div class="u-row__v">' + JY.esc(item.meaning) + '</div></div>';
        }).join('') +
        '</div>' +
        '<div class="u-mt-4">' +
        '<button type="button" class="u-btn u-btn--primary u-btn--block" data-act="shuffle">开始洗牌</button>' +
        '</div>' +
        '<div class="u-mt-3">' + JY.ui.disclaimer({ type: 'short', size: 'sm' }) + '</div>' +
        '</div>'
      ) : '';

      /* 二、洗牌（原 wx:for 遍历 [0,1,2,3,4]，动画延迟 index*90ms 原样） */
      var shuffleHtml = (step === 'shuffle') ? (
        '<div class="tr-shuffle">' +
        '<div class="tr-shuffle__deck">' +
        [0, 1, 2, 3, 4].map(function (n, index) {
          return '<div class="tr-shuffle__card u-cardimg u-cardimg--sm"' +
            ' style="animation-delay:' + (index * 90) + 'ms">' +
            JY.ui.phImg({
              emoji: '✦', img: 'tarot/tarot_back.webp', name: 'tarot_back.webp',
              usage: '牌背图案', ratio: '3:4', radius: '0', spec: '300×400 @2x', variant: 'dark'
            }) +
            '</div>';
        }).join('') +
        '</div>' +
        '<div class="tr-shuffle__t u-anim-pulse">洗牌中…</div>' +
        '</div>'
      ) : '';

      /* 三、抽牌（CSS 3D 翻牌：.tr-card__inner 加 .is-flip 即触发 rotateY(180deg)） */
      var pickHtml = (step === 'pick') ? (
        '<div class="u-anim-in">' +
        '<div class="tr-pick__head">' +
        (self.data.question ? '<div class="tr-pick__q">' + JY.esc(self.data.question) + '</div>' : '') +
        '<div class="tr-pick__t">已翻开 ' + JY.esc(self.data.openedCount) + '/' + JY.esc(sp.count) + ' 张</div>' +
        '</div>' +
        '<div class="tr-cards">' +
        (self.data.cards || []).map(function (item, index) {
          var c = item.card || {};
          return '<div class="tr-card" data-act="flipCard" data-index="' + index + '">' +
            '<div class="tr-card__inner' + (item.flipped ? ' is-flip' : '') + '">' +
            '<div class="tr-card__back u-cardimg">' +
            JY.ui.phImg({
              emoji: '✦', img: 'tarot/tarot_back.webp', name: 'tarot_back.webp',
              usage: '牌背图案', ratio: '3:4', radius: '0', spec: '300×400 @2x', variant: 'dark'
            }) +
            '<div class="tr-card__no">' + JY.esc(item.posName) + '</div>' +
            '</div>' +
            '<div class="tr-card__face u-cardimg">' +
            JY.ui.phImg({
              emoji: c.emoji, img: 'tarot/tarot_card_' + c.id + '.webp', name: 'tarot_card_' + c.id + '.webp',
              usage: c.name + '牌面', ratio: '3:4', radius: '0', spec: '300×400 @2x', variant: 'dark'
            }) +
            '<div class="tr-card__info">' +
            '<div class="tr-card__name">' + JY.esc(c.name) + '</div>' +
            '<div class="tr-card__en">' + JY.esc(c.en) + '</div>' +
            '<div class="tr-card__rev' + (item.reversed ? ' is-rev' : '') + '">' +
            (item.reversed ? '逆位' : '正位') + '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
        }).join('') +
        '</div>' +
        (self.data.allFlipped ?
          '<div class="u-mt-4"><button type="button" class="u-btn u-btn--primary u-btn--block" data-act="showResult">查看解读</button></div>'
          : '') +
        '</div>'
      ) : '';

      /* 四、结果 */
      var resultHtml = '';
      if (step === 'result') {
        resultHtml = '<div class="u-anim-up">' +
          '<div class="tr-res__head">' +
          '<div class="tr-res__q">' + JY.esc(self.data.question || '未填写问题') + '</div>' +
          '<div class="tr-res__spread">' + JY.esc(sp.name) + ' · ' + JY.esc(sp.count) + ' 张</div>' +
          '</div>' +
          (self.data.cards || []).map(function (item, index) {
            var c = item.card || {};
            return '<div class="u-mt-3">' + JY.ui.sheetCard({
              title: item.posName, sub: item.posMeaning, body:
                '<div class="tr-res__card">' +
                '<div class="tr-res__arch u-cardimg" data-act="openPreview" data-index="' + index + '">' +
                JY.ui.phImg({
                  emoji: c.emoji, img: 'tarot/tarot_card_' + c.id + '.webp', name: 'tarot_card_' + c.id + '.webp',
                  usage: c.name + '牌面', ratio: '3:4', radius: '0', spec: '300×400 @2x', variant: 'dark'
                }) +
                '</div>' +
                '<div class="tr-res__main">' +
                '<div class="tr-res__name">' + JY.esc(c.name) + '</div>' +
                '<div class="tr-res__en">' + JY.esc(c.en) + '</div>' +
                '<div class="tr-res__rev' + (item.reversed ? ' is-rev' : '') + '">' +
                (item.reversed ? '逆位' : '正位') + '</div>' +
                '<div class="tr-res__kw">' +
                ((item.reversed ? c.reversed : c.upright) || []).map(function (k, ki) {
                  return '<span class="u-tag">' + JY.esc(k) + '</span>';
                }).join('') +
                '</div>' +
                '</div>' +
                '</div>' +
                '<div class="u-div"></div>' +
                '<div class="u-t--sub">' + JY.esc(item.reversed ? c.revText : c.upText) + '</div>' +
                '<div class="u-t--hint u-mt-2">建议：' + JY.esc(c.advice) + '</div>'
            }) + '</div>';
          }).join('') +
          '<div class="u-mt-3">' + JY.ui.sheetCard({
            title: '综合来看', sub: '把几张牌串起来看', body: '<div class="u-t--sub">' + JY.esc(self.data.summary) + '</div>'
          }) + '</div>' +
          '<div class="u-mt-3">' + JY.ui.disclaimer({ type: 'full', withHealth: true }) + '</div>' +
          '<div class="cs-actions u-mt-4">' +
          '<button type="button" class="u-btn u-btn--ghost u-btn--block" data-act="restart">再抽一次</button>' +
          (self.data.summary ?
            '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="toggleFav">' +
            (self.data.faved ? '已收藏 ★' : '收藏这组牌') + '</button>' : '') +
          '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="goCards">在牌库里查这些牌</button>' +
          '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="goHistory">看全部记录</button>' +
          '<button type="button" class="u-btn u-btn--primary u-btn--block u-mt-3" data-act="share">分享牌阵</button>' +
          '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="makePoster">生成分享长图</button>' +
          '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="goBack">换个牌阵</button>' +
          '</div>' +
          '</div>';
      }

      /* 牌面放大预览层：点击结果页任意牌面弹出，点击任意处关闭 */
      var zoomHtml = '';
      if (self.data.previewCard) {
        var p = self.data.previewCard;
        zoomHtml = '<div class="tr-zoom" data-act="closePreview">' +
          '<div class="tr-zoom__mask"></div>' +
          '<div class="tr-zoom__card">' +
          '<div class="tr-zoom__img u-cardimg">' + JY.ui.phImg({
            emoji: p.card.emoji, img: 'tarot/tarot_card_' + p.card.id + '.webp',
            name: 'tarot_card_' + p.card.id + '.webp', usage: p.card.name + '牌面',
            ratio: '3:4', radius: '0', spec: '300×400 @2x', variant: 'dark'
          }) + '</div>' +
          '<div class="tr-zoom__name">' + JY.esc(p.card.name) + '</div>' +
          '<div class="tr-zoom__en">' + JY.esc(p.card.en) + ' · ' + (p.reversed ? '逆位' : '正位') + '</div>' +
          '<div class="tr-zoom__pos">' + JY.esc(p.posName) + ' · ' + JY.esc(p.posMeaning) + '</div>' +
          '</div>' +
          '</div>';
      }

      return (
        '<div class="pg t-tarot"><div class="pg__inner">' +
        askHtml + shuffleHtml + pickHtml + resultHtml +
        '<div class="u-safe"></div>' +
        '</div>' +
        zoomHtml +

        /* 离屏画布：仅用于绘制分享长图，不参与页面布局 */
        '<canvas id="posterCanvas" class="u-poster-canvas" width="375" height="800"></canvas>' +
        '</div>'
      );
    }
  };
  // 双 key 注册：check.js 认无斜杠 key；core go() 查带斜杠 key（与 T-D 同策略，Lead 统一 normalize 后可删）
  JY.page('package-tarot/pages/tarot/reading', pageCfg);
  JY.page('/package-tarot/pages/tarot/reading', pageCfg);
})();
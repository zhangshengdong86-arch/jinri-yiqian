/**
 * 手相看掌 · palm-reading
 * 由 pages/palm/reading 三件套转写：
 *  - reading.js 逻辑原样保留（require→JY.*，const→var；onShareAppMessage 删除，
 *    open-type="share" 按钮改 data-act="share"）
 *  - 【拍照改造】wx.chooseMedia 无 shim → 隐藏 <input type="file"> + FileReader→dataURL
 *    + <img> 加载后交给 JY.palmVision.analyze（质量校验在该模块内部完成）；
 *    失败文案 message/guide 用原文案展示（错误态页面 + toast）。
 *  - reading.wxml → render() 模板；reading.wxss → css/pages/palm-reading.css（单位 1:2）
 * w- 辅助类：无；文件选择框 wFile 用内联 style 隐藏；照片 object-fit 见页面 css。
 */
(function () {
  var app = getApp();
  var DATA = JY.data;
  var util = JY.util;
  var links = JY.links;
  var poster = JY.poster;
  var vision = JY.palmVision;

  var ADVICE = [
    '把精力集中在一条主线上，比同时推进三件事更有效。',
    '这周给自己留两个完整的不被打扰时段。',
    '想清楚之后先做三天，再用结果判断是否继续。',
    '把「必须做」和「想做」分成两列，各保留三项。'
  ]

  var pageCfg = {
    navTitle: '看掌',
    themeKey: 'palm',
    cssFile: 'palm-reading',

    data: {
      mode: 'upload',
      step: 'guide',
      imgPath: '',
      quiz: [],
      answers: {},
      result: null,
      scanNote: '',
      errMsg: '',
      errGuide: '',
      faved: false
    },

    onLoad: function (options) {
      options = options || {}
      var mode = options.mode || 'upload'
      var patch = {
        mode: mode,
        step: mode === 'quiz' ? 'quiz' : 'guide',
        // 逐题深拷贝一份：DATA.PALM_QUIZ 是模块级常量，若直接持有引用，
        // 选中状态会写回常量并在下次进入页面时残留（表现为「选项点了没反应/已预选」）
        quiz: DATA.PALM_QUIZ.map(function (q) {
          return { id: q.id, title: q.title, selected: '', options: q.options.slice() }
        })
      }
      // 历史回看：按记录里的手型与主线形态还原，不再写一条新记录
      if (options.auto === '1' && options.type) {
        patch.step = 'result'
        this.setData(patch)
        this.finish('replay', {
          type: options.type,
          life: options.life || 'curve',
          career: options.career || 'long',
          marriage: options.marriage || 'straight'
        }, true)
        return
      }
      this.setData(patch)
    },

    onShow: function () {
      try { app.applyTheme('palm') } catch (e) {}
    },

    switchQuiz: function () {
      this.setData({ mode: 'quiz', step: 'quiz' })
    },
    switchUpload: function () {
      this.setData({ mode: 'upload', step: 'guide' })
    },

    /**
     * 网页版拍照入口（替代原 chooseImage / wx.chooseMedia）：
     * 触发隐藏的 <input type="file" accept="image/*">；读取与识别流程见 onFileChange。
     * 浏览器取消选择不会触发 change 事件，用 input 的 cancel 事件做兜底提示。
     */
    pickPhoto: function () {
      var ctx = this
      var input = document.getElementById('wFile')
      if (!input) return
      if (!input._wCancelBound) {
        input._wCancelBound = true
        input.addEventListener('cancel', function () {
          util.toast('已取消选择，可重新选择或改用手型自测')
          ctx.setData({ step: 'guide', errMsg: '', errGuide: '' })
        })
      }
      input.value = '' // 允许连续选择同一个文件
      input.click()
    },

    /**
     * 文件选择回调（data-evt 委托；核心委托只给 e.detail.value = 文件名，
     * 真实 File 对象直接从 input.files 取）。
     * 之后与原 chooseMedia.success 完全一致：进扫描态 → 识别 → 错误态/结果。
     */
    onFileChange: function () {
      var ctx = this
      var input = document.getElementById('wFile')
      var file = input && input.files && input.files[0]
      if (!file) return
      // 浏览器对 file 输入会同时触发 input 与 change 事件，去重防止识别跑两遍
      var sig = file.name + '|' + file.size + '|' + file.lastModified
      if (ctx._fileSig === sig) return
      ctx._fileSig = sig
      if (file.type.indexOf('image/') !== 0) {
        util.toast('请选择图片文件')
        return
      }
      var reader = new FileReader()
      reader.onload = function () {
        var dataUrl = reader.result
        ctx.setData({ imgPath: dataUrl, step: 'scanning', errMsg: '', errGuide: '' })
        // 先构造 Image（保证可解码），再把图像对象交给识别引擎（也接受 dataURL）
        var im = new Image()
        im.onload = function () {
          vision.analyze(im).then(function (r) {
            if (!r.ok) {
              // 质量校验/识别失败的原文案：错误态页面内展示，再 toast 一次即时提示
              ctx.setData({ step: 'error', errMsg: r.message, errGuide: r.guide })
              util.vibrate('heavy')
              if (r.message) wx.showToast({ title: r.message, icon: 'none', duration: 2600 })
              return
            }
            ctx._vision = r
            ctx.finish('upload', vision.toPreset(r) || undefined)
          }, function () {
            // 防御：引擎异常拒绝（原逻辑只在 resolve 内处理失败）也落回错误态，避免卡在扫描
            ctx.setData({ step: 'error', errMsg: '识别失败', errGuide: '请重试一次，或改用手型自测。' })
          })
        }
        im.onerror = function () {
          ctx.setData({ step: 'error', errMsg: '照片读取失败', errGuide: '请重新选择一张照片。' })
        }
        im.src = dataUrl
      }
      reader.onerror = function () {
        util.toast('照片读取失败，请重试')
      }
      reader.readAsDataURL(file)
    },

    // 识别失败后的两个出口：重新拍摄 / 转手型自测
    retake: function () {
      this.setData({ step: 'guide', imgPath: '', errMsg: '', errGuide: '' })
      this.pickPhoto()
    },

    chooseOpt: function (e) {
      var qi = parseInt(e.currentTarget.dataset.qindex, 10)
      var tag = e.currentTarget.dataset.tag
      if (isNaN(qi) || !tag) return                  // 防御：下标或标签缺失时不写脏数据
      var quiz = this.data.quiz
      if (!quiz[qi]) return
      // 只替换被点击的那一题对象，其余保持引用，避免就地改动原数据
      var next = quiz.map(function (q, i) {
        return i === qi ? Object.assign({}, q, { selected: tag }) : q
      })
      this.setData({ quiz: next })
      util.vibrate('light')
    },

    submitQuiz: function () {
      var all = this.data.quiz.every(function (q) { return !!q.selected })
      if (!all) {
        util.toast('还有题目未选择')
        return
      }
      this.finish('quiz')
    },

    finish: function (from, preset, skipHistory) {
      var answers = {}
      this.data.quiz.forEach(function (q) { if (q.selected) answers[q.id] = q.selected })

      var typeTag
      var lineTags
      if (preset) {
        typeTag = preset.type
        lineTags = { life: preset.life, career: preset.career, marriage: preset.marriage }
      } else if (from === 'upload') {
        // 图像识别未接入时，用示例规则给出一份示例解读，并明确标注
        typeTag = util.pick(DATA.PALM_TYPES).id
        lineTags = {
          life: util.pick(['long', 'curve', 'chain']),
          career: util.pick(['long', 'short', 'break']),
          marriage: util.pick(['straight', 'curve', 'chain'])
        }
      } else {
        typeTag = answers.q1 || 'square'
        lineTags = {
          life: answers.q2 || 'curve',
          career: answers.q3 || 'long',
          marriage: answers.q4 || 'straight'
        }
      }
      var type = DATA.PALM_TYPES.filter(function (t) { return t.id === typeTag })[0] || DATA.PALM_TYPES[0]

      function tagName(id) {
        var t = DATA.LINE_TAGS.filter(function (x) { return x.id === id })[0]
        return t ? t.name : id
      }

      var lines = DATA.PALM_LINES.map(function (l) {
        var tid = lineTags[l.id]
        var map = DATA.LINE_READINGS[l.id] || {}
        return {
          id: l.id,
          name: l.name,
          // 三线均有配套问卷题；取不到形态时退回通用描述，避免出现空文案
          tagName: tid ? tagName(tid) : '常见形态',
          text: map[tid] || l.normal || '这一项的细化解读待内容库补齐。'
        }
      })

      var result = {
        typeName: type.name,
        feature: type.feature,
        reading: type.reading,
        good: type.good,
        note: type.note,
        lines: lines,
        advice: util.pick(ADVICE)
      }

      // 说明文案随识别状态变化：真实识别 / 降级示例 / 历史回看
      var v = this._vision
      var note = ''
      if (from === 'upload') {
        note = (v && !v.degraded)
          ? '已根据你上传的照片完成识别，结果仅供参考娱乐。'
          : '当前为示例解读（识别未接入或服务不可用），可改用自测获得更贴合的结果。'
      } else if (from === 'replay') {
        note = '这是历史记录的还原结果，参数来自当时那一次自测。'
      }

      this.setData({
        step: 'result',
        result: result,
        scanNote: note
      })

      // 回看参数：顺序与编码由 links.js 统一（模式 → auto → 手型 → 三条主线）
      // 拍照看掌无法还原照片，回看统一落到自测模式
      this._replayParams = {
        mode: 'quiz',
        auto: 1,
        type: type.id,
        life: lineTags.life,
        career: lineTags.career,
        marriage: lineTags.marriage
      }

      if (!skipHistory) {
        this._favRec = app.addHistory({
          cat: 'palm',
          catName: '手相',
          title: type.name + ' · ' + (from === 'upload' ? '拍照看掌' : '手型自测'),
          route: links.link('palm', this._replayParams, links.entryOf('palm'))
        })
        this.setData({ faved: util.isFav(this._favRec.route) })
      } else {
        // 回看场景不写历史，按当前页面参数重建，保证「收藏」仍可用
        this._favRec = {
          cat: 'palm',
          catName: '手相',
          title: type.name + ' · ' + (from === 'upload' ? '拍照看掌' : '手型自测'),
          // 与生成侧同一构造函数，重键才不会漂移；构造失败时退回按 options 原样重建
          route: links.link('palm', this._replayParams, '') || util.currentRoute(this)
        }
        this.setData({ faved: util.isFav(this._favRec.route) })
      }
      util.vibrate('heavy')
    },

    restart: function () {
      this.setData({ step: this.data.mode === 'quiz' ? 'quiz' : 'guide', imgPath: '', result: null })
      var quiz = this.data.quiz.map(function (q) { return Object.assign({}, q, { selected: '' }) })
      this.setData({ quiz: quiz })
    },

    goLines: function () {
      util.nav('/pages/palm/lines/index')
    },

    goHistory: function () {
      util.nav('/pages/history/index', { cat: 'palm' })
    },

    goBack: function () {
      util.back('/pages/palm/index')
    },

    onUnload: function () {
      // 合规要求：离开页面即释放图片引用，不留存（网页运行时暂不触发，逻辑保留）
      this.setData({ imgPath: '' })
    },

    // 收藏这次解读
    toggleFav: function () {
      if (!this._favRec) return
      this.setData({ faved: util.toggleFav(this._favRec) })
    },

    // 分享（原 open-type="share" 按钮）：网页版无系统分享，走「生成分享长图并下载」同一流程
    share: function () {
      this.makePoster()
    },

    // 生成分享长图：手型 + 主线解读（调用签名与 utils/poster.js 保持一致，
    // 成功回调里的 path 为 dataURL，由 JY.poster.save → JY.saveDataUrl 触发下载）
    makePoster: function () {
      var ctx = this
      var r = this.data.result
      if (!r) return
      if (this._postering) return
      this._postering = true
      if (wx.showLoading) wx.showLoading({ title: '生成中', mask: true })

      var blocks = [{
        label: '手型 · ' + r.typeName,
        text: r.reading,
        size: 14
      }]
      var lines = (r.lines || []).map(function (l) {
        return l.name + '（' + l.tagName + '）：' + l.text
      }).join('\n')
      if (lines) blocks.push({ label: '主线', text: lines, size: 14 })
      if (r.advice) blocks.push({ label: '可以做的一件小事', text: r.advice, size: 14 })

      poster.make(this, '#posterCanvas', {
        skin: 'palm',
        eyebrow: '手相',
        date: '',
        title: r.typeName,
        subtitle: r.feature || '',
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
      var mode = self.data.mode;
      var step = self.data.step;

      /* 拍照路径 · 引导 */
      var guideHtml = (mode === 'upload' && step === 'guide') ? (
        '<div class="u-sec">' +
        '<div class="u-sec__title">拍一张手掌照片</div>' +
        '<div class="u-sec__sub">光线充足、手掌摊开、占满画面</div>' +
        '</div>' +
        '<div class="pm-guide u-mt-3">' + JY.ui.phImg({
          emoji: '🖐', img: 'palm/pm_guide_hand.webp', name: 'pm_guide_hand.webp',
          usage: '拍摄示意 · 标准掌位', ratio: '4:3', spec: '640×480 @2x'
        }) + '</div>' +
        '<div class="u-card u-mt-3">' +
        '<div class="u-row"><div class="u-row__k">光线</div><div class="u-row__v">自然光，避免阴影</div></div>' +
        '<div class="u-row"><div class="u-row__k">姿势</div><div class="u-row__v">五指自然张开，掌心朝上</div></div>' +
        '<div class="u-row"><div class="u-row__k">范围</div><div class="u-row__v">手腕到指尖完整入镜</div></div>' +
        '</div>' +
        '<div class="pm-privacy u-mt-3">' +
        '<div class="pm-privacy__t">照片仅用于本次识别，识别完成后即从本机与服务端删除，不用于任何其他用途。</div>' +
        '</div>' +
        '<div class="u-mt-4">' +
        // 文案微调：原「选择照片」→「选择/拍摄手掌照片」（网页版由系统文件框选择，可覆盖拍照）
        '<button type="button" class="u-btn u-btn--primary u-btn--block" data-act="pickPhoto">选择/拍摄手掌照片</button>' +
        '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="switchQuiz">不方便拍照？用手型自测</button>' +
        '</div>'
      ) : '';

      /* 拍照路径 · 扫描中 */
      var scanHtml = (mode === 'upload' && step === 'scanning') ? (
        '<div class="pm-scan">' +
        (self.data.imgPath ? '<img class="pm-scan__photo" src="' + JY.esc(self.data.imgPath) + '" alt="">' : '') +
        '<div class="pm-scan__line"></div>' +
        '<div class="pm-scan__t u-anim-pulse">正在识别主线与形态…</div>' +
        '</div>'
      ) : '';

      /* 拍照路径 · 识别失败：给出明确原因 + 重拍引导 + 转自测出口 */
      var errHtml = (mode === 'upload' && step === 'error') ? (
        '<div class="pm-err">' +
        '<div class="pm-err__img">' +
        (self.data.imgPath ? '<img class="pm-scan__photo" src="' + JY.esc(self.data.imgPath) + '" alt="">' : '') +
        '</div>' +
        '<div class="pm-err__title">' + JY.esc(self.data.errMsg) + '</div>' +
        '<div class="pm-err__guide">' + JY.esc(self.data.errGuide) + '</div>' +
        '<div class="u-mt-4">' +
        // 文案微调：原「重新拍摄」→「重新选择/拍摄」
        '<button type="button" class="u-btn u-btn--primary u-btn--block" data-act="retake">重新选择/拍摄</button>' +
        '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="switchQuiz">改用自测</button>' +
        '</div>' +
        '</div>'
      ) : '';

      /* 自测路径（结果以外的阶段）：
         原为嵌套 wx:for，外层 for-index="qi"、内层 for-item="opt" for-index="oi"，
         避免两层默认 index 互相遮蔽导致 data-qindex 取错题号。这里直接用 qi / oi 命名。 */
      var quizHtml = (mode === 'quiz' && step !== 'result') ? (
        '<div class="u-sec">' +
        '<div class="u-sec__title">手型自测</div>' +
        '<div class="u-sec__sub">共 ' + JY.esc((self.data.quiz || []).length) + ' 题 · 凭第一感觉选</div>' +
        '</div>' +
        (self.data.quiz || []).map(function (item, qi) {
          return '<div class="u-mt-3"><div class="u-card">' +
            '<div class="pm-q__no">第 ' + (qi + 1) + ' 题</div>' +
            '<div class="pm-q__title">' + JY.esc(item.title) + '</div>' +
            '<div class="pm-q__opts">' +
            (item.options || []).map(function (opt, oi) {
              return '<div class="pm-q__opt' + (item.selected === opt.tag ? ' is-on' : '') + '"' +
                ' data-act="chooseOpt" data-qindex="' + qi + '" data-tag="' + JY.esc(opt.tag) + '">' +
                JY.esc(opt.label) + '</div>';
            }).join('') +
            '</div>' +
            '</div></div>';
        }).join('') +
        '<div class="u-mt-4">' +
        '<button type="button" class="u-btn u-btn--primary u-btn--block" data-act="submitQuiz">生成解读</button>' +
        '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="switchUpload">改为拍照看掌</button>' +
        '</div>'
      ) : '';

      /* 结果 */
      var resultHtml = '';
      if (step === 'result') {
        var r = self.data.result;
        if (r) {
          resultHtml = '<div class="u-anim-up">' +
            '<div class="pm-res__head">' +
            '<div class="pm-res__img">' +
            (self.data.imgPath
              ? '<img class="pm-res__photo" src="' + JY.esc(self.data.imgPath) + '" alt="">'
              : JY.ui.phImg({
                  emoji: '✋', img: 'palm/pm_result_hand.webp', name: 'pm_result_hand.webp',
                  usage: '结果页手掌示意图', ratio: '1:1', spec: '320×320 @2x'
                })) +
            '</div>' +
            '<div class="pm-res__main">' +
            '<div class="pm-res__k">手型判断</div>' +
            '<div class="pm-res__name">' + JY.esc(r.typeName) + '</div>' +
            '<div class="pm-res__feat">' + JY.esc(r.feature) + '</div>' +
            '</div>' +
            '</div>' +
            (mode === 'upload'
              ? '<div class="pm-note u-mt-3"><div class="pm-note__t">' + JY.esc(self.data.scanNote) + '</div></div>'
              : '') +
            '<div class="u-mt-3">' + JY.ui.sheetCard({
              title: '手型解读', sub: '看整体倾向', body:
                '<div class="u-t--sub">' + JY.esc(r.reading) + '</div>' +
                '<div class="u-div"></div>' +
                '<div class="u-row"><div class="u-row__k">优势</div><div class="u-row__v">' + JY.esc(r.good) + '</div></div>' +
                '<div class="u-row"><div class="u-row__k">留意</div><div class="u-row__v">' + JY.esc(r.note) + '</div></div>'
            }) + '</div>' +
            JY.ui.sheetCard({
              title: '主线解析', sub: '按形态标签匹配', body: (r.lines || []).map(function (item, index) {
                return '<div class="pm-line__res">' +
                  '<div class="pm-line__res__k">' + JY.esc(item.name) + ' · ' + JY.esc(item.tagName) + '</div>' +
                  '<div class="pm-line__res__v">' + JY.esc(item.text) + '</div>' +
                  '</div>';
              }).join('')
            }) +
            JY.ui.sheetCard({
              title: '一条建议', body: '<div class="u-t--sub">' + JY.esc(r.advice) + '</div>'
            }) +
            '<div class="u-mt-3">' + JY.ui.disclaimer({ type: 'full', withHealth: true }) + '</div>' +
            '<div class="cs-actions u-mt-4">' +
            '<button type="button" class="u-btn u-btn--ghost u-btn--block" data-act="restart">重新看一次</button>' +
            '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="toggleFav">' +
            (self.data.faved ? '已收藏 ★' : '收藏这次解读') + '</button>' +
            '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="goLines">查这些主线的详解</button>' +
            '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="goHistory">看全部记录</button>' +
            '<button type="button" class="u-btn u-btn--primary u-btn--block u-mt-3" data-act="share">分享结果</button>' +
            '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="makePoster">生成分享长图</button>' +
            '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="goBack">返回手相</button>' +
            '</div>' +
            '</div>';
        }
      }

      return (
        '<div class="pg t-palm"><div class="pg__inner">' +
        guideHtml + scanHtml + errHtml + quizHtml + resultHtml +
        '<div class="u-safe"></div>' +
        '</div>' +

        /* 隐藏文件选择框：拍照入口（网页版替代 wx.chooseMedia） */
        '<input type="file" accept="image/*" id="wFile" data-evt="onFileChange" style="display:none">' +

        /* 离屏画布：仅用于绘制分享长图，不参与页面布局 */
        '<canvas id="posterCanvas" class="u-poster-canvas" width="375" height="800"></canvas>' +
        '</div>'
      );
    }
  };
  // 双 key 注册：check.js 认无斜杠 key；core go() 查带斜杠 key（与 T-D 同策略，Lead 统一 normalize 后可删）
  JY.page('pages/palm/reading', pageCfg);
  JY.page('/pages/palm/reading', pageCfg);
})();
/**
 * 主线图鉴 · palm-lines
 * 由 pages/palm/lines/index 三件套转写：
 *  - index.js 逻辑原样保留（require→JY.*，const→var）
 *  - index.wxml → render() 模板；<picker mode="selector"> → <select data-evt>（change 时
 *    core 委托给方法，e.detail.value 即选中项下标字符串，与原 bindchange 一致）
 *  - index.wxss → css/pages/palm-lines.css（单位 1:2）
 * w- 辅助类：无；选择器复用原 .zd-pick 类名并在本页 css 内定义（html 无 wrapper，
 *           原生 select 自带下拉箭头）。
 */
(function () {
  var app = getApp();
  var DATA = JY.data;
  var util = JY.util;

  var pageCfg = {
    navTitle: '主线图鉴',
    themeKey: 'palm',
    cssFile: 'palm-lines',

    data: {
      lines: [],
      tags: [],
      openLine: '',
      openTag: '',
      openTagData: null,
      lineNames: [],
      tagNames: [],
      lineIdx: 0,
      tagIdx: 0,
      comboText: '',
      comboHas: false,
      comboLineName: '',
      comboTagName: ''
    },

    onLoad: function (options) {
      options = options || {}
      var patch = {
        lines: DATA.PALM_LINES,
        tags: DATA.LINE_TAGS,
        lineNames: DATA.PALM_LINES.map(function (l) { return l.name }),
        tagNames: DATA.LINE_TAGS.map(function (t) { return t.name })
      }
      // 从手相首页点某条主线进来：直接展开这条线
      if (options.line) {
        patch.openLine = options.line
      }
      this.setData(patch)
      this.buildCombo()
    },

    onShow: function () {
      try { app.applyTheme('palm') } catch (e) {}
    },

    tapLine: function (e) {
      var id = e.currentTarget.dataset.id
      this.setData({ openLine: this.data.openLine === id ? '' : id })
      util.vibrate('light')
    },

    tapTag: function (e) {
      var id = e.currentTarget.dataset.id
      if (this.data.openTag === id) {
        this.setData({ openTag: '', openTagData: null })
        return
      }
      var t = DATA.LINE_TAGS.filter(function (x) { return x.id === id })[0]
      this.setData({ openTag: id, openTagData: t })
      util.vibrate('light')
    },

    // 原 picker bindchange：change 事件委托传入 e.detail.value（字符串下标）
    onLinePick: function (e) {
      this.setData({ lineIdx: parseInt(e.detail.value, 10) })
      this.buildCombo()
    },

    onTagPick: function (e) {
      this.setData({ tagIdx: parseInt(e.detail.value, 10) })
      this.buildCombo()
    },

    buildCombo: function () {
      var line = DATA.PALM_LINES[this.data.lineIdx]
      var tag = DATA.LINE_TAGS[this.data.tagIdx]
      if (!line || !tag) return
      var map = DATA.LINE_READINGS[line.id] || {}
      var text = map[tag.id]
      this.setData({
        comboLineName: line.name,
        comboTagName: tag.name,
        comboText: text || ('「' + tag.name + '」通常表示：' + tag.general + '。对应到' + line.name + '，可以理解为这一领域的表现带有类似倾向。'),
        comboHas: !!text
      })
    },

    goQuiz: function () {
      util.nav('/pages/palm/reading?mode=quiz')
    },

    goBack: function () {
      util.back('/pages/palm/index')
    },

    render: function () {
      var self = this;

      /* 主线列表：点开看位置观察法与常见形态解析 */
      var linesHtml = (self.data.lines || []).map(function (item, index) {
        var bodyHtml = (self.data.openLine === item.id) ? (
          '<div class="gl-item__body">' +
          '<div class="u-row"><div class="u-row__k">走向</div><div class="u-row__v">' +
          JY.esc(item.from) + ' → ' + JY.esc(item.to) + '</div></div>' +
          '<div class="pm-obs">' +
          '<div class="pm-obs__k">位置与观察方法</div>' +
          '<div class="pm-obs__v">' + JY.esc(item.observe) + '</div>' +
          '</div>' +
          '<div class="pm-obs__k u-mt-3">常见形态与解析</div>' +
          (item.forms || []).map(function (f, fi) {   // 原内层 wx:for-item="f"
            return '<div class="pm-form">' +
              '<div class="pm-form__k">' + JY.esc(f.name) + '</div>' +
              '<div class="pm-form__s">' + JY.esc(f.summary) + '</div>' +
              '<div class="pm-form__g">' +
              '<div class="pm-form__i"><span class="pm-form__t">性格</span>' + JY.esc(f.trait) + '</div>' +
              '<div class="pm-form__i"><span class="pm-form__t">健康</span>' + JY.esc(f.health) + '</div>' +
              '<div class="pm-form__i"><span class="pm-form__t">事业</span>' + JY.esc(f.career) + '</div>' +
              '<div class="pm-form__i"><span class="pm-form__t">情感</span>' + JY.esc(f.emotion) + '</div>' +
              '</div>' +
              '</div>';
          }).join('') +
          '</div>'
        ) : '';

        return '<div class="gl-item">' +
          '<div class="gl-item__head" data-act="tapLine" data-id="' + JY.esc(item.id) + '">' +
          '<div class="gl-item__no">线</div>' +
          '<div class="gl-item__name">' + JY.esc(item.name) + '</div>' +
          '<div class="gl-item__meta">' + JY.esc(item.domain) + '</div>' +
          '<div class="gl-item__arrow">' + (self.data.openLine === item.id ? '−' : '+') + '</div>' +
          '</div>' +
          bodyHtml +
          '</div>';
      }).join('');

      /* 形态标签 */
      var tagsHtml = (self.data.tags || []).map(function (item, index) {
        return '<div class="pm-tag' + (self.data.openTag === item.id ? ' is-on' : '') + '"' +
          ' data-act="tapTag" data-id="' + JY.esc(item.id) + '">' + JY.esc(item.name) + '</div>';
      }).join('');

      /* 组合查询下拉选项 */
      var lineOpts = (self.data.lineNames || []).map(function (n, i) {
        return '<option value="' + i + '"' + (self.data.lineIdx === i ? ' selected' : '') + '>' + JY.esc(n) + '</option>';
      }).join('');
      var tagOpts = (self.data.tagNames || []).map(function (n, i) {
        return '<option value="' + i + '"' + (self.data.tagIdx === i ? ' selected' : '') + '>' + JY.esc(n) + '</option>';
      }).join('');

      var comboHtml = (self.data.comboText) ? (
        '<div class="pm-combo u-mt-3">' +
        '<div class="pm-combo__k">' + JY.esc(self.data.comboLineName) + ' · ' + JY.esc(self.data.comboTagName) + '</div>' +
        '<div class="pm-combo__v">' + JY.esc(self.data.comboText) + '</div>' +
        (self.data.comboHas ? '' : '<div class="u-t--hint u-mt-2">这一组合的专属解读待内容库补充，以上为通用描述。</div>') +
        '</div>'
      ) : '';

      return (
        '<div class="pg t-palm"><div class="pg__inner">' +

        '<div class="gl-head">' +
        '<div class="gl-head__t">主线图鉴</div>' +
        '<div class="gl-head__s">三条主线 · 常见形态 · 可组合查询对应解读</div>' +
        '</div>' +

        /* 主线 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">掌纹主线</div>' +
        '<div class="u-sec__sub">点击看说明</div>' +
        '</div>' +
        '<div class="gl-list">' + linesHtml + '</div>' +
        '</div>' +

        /* 形态标签 */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">常见形态</div>' +
        '<div class="u-sec__sub">共 ' + JY.esc((self.data.tags || []).length) + ' 种 · 点击看含义</div>' +
        '</div>' +
        '<div class="pm-tags">' + tagsHtml + '</div>' +
        (self.data.openTag ? (
          '<div class="u-card u-mt-3">' +
          '<div class="pm-tag__n">' + JY.esc(self.data.openTagData.name) + '</div>' +
          '<div class="u-t--sub u-mt-2">' + JY.esc(self.data.openTagData.general) + '</div>' +
          '</div>'
        ) : '') +
        '</div>' +

        /* 组合查询：原 picker 改为 select（change 事件 → onLinePick / onTagPick） */
        '<div class="u-sec">' +
        '<div class="u-sec__head">' +
        '<div class="u-sec__title">组合查询</div>' +
        '<div class="u-sec__sub">选一条线 + 一种形态</div>' +
        '</div>' +
        '<div class="u-card">' +
        '<div class="cs-label">主线</div>' +
        '<select class="zd-pick" data-evt="onLinePick">' + lineOpts + '</select>' +
        '<div class="cs-label u-mt-3">形态</div>' +
        '<select class="zd-pick" data-evt="onTagPick">' + tagOpts + '</select>' +
        comboHtml +
        '</div>' +
        '</div>' +

        '<div class="u-mt-4">' + JY.ui.disclaimer({ type: 'full', withHealth: true }) + '</div>' +

        '<div class="cs-actions u-mt-4">' +
        '<button type="button" class="u-btn u-btn--primary u-btn--block" data-act="goQuiz">去做手型自测</button>' +
        '<button type="button" class="u-btn u-btn--ghost u-btn--block u-mt-3" data-act="goBack">返回手相</button>' +
        '</div>' +
        '<div class="u-safe"></div>' +
        '</div></div>'
      );
    }
  };
  // 双 key 注册：check.js 认无斜杠 key；core go() 查带斜杠 key（与 T-D 同策略，Lead 统一 normalize 后可删）
  JY.page('pages/palm/lines/index', pageCfg);
  JY.page('/pages/palm/lines/index', pageCfg);
})();
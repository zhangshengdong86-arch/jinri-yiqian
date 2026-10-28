/**
 * ============================================================
 * core.js · 「今日宜签」网页版运行时
 * ------------------------------------------------------------
 * 职责（对应微信小程序运行环境）：
 *   1. 全局命名空间 JY 与 HTML 转义工具
 *   2. wx.* 兼容层（storage / 导航 / 弹层 / 导航栏 / canvas / 震动）
 *   3. hash 路由 + 页面注册 / 实例化 / setData / 生命周期
 *   4. App 对象（globalData / 主题切换 / 历史与收藏代理）
 *   5. 组件渲染器（disclaimer / ph-img / sheet-card）
 * 页面与模块文件一律挂 JY 命名空间，无构建、无 module 系统。
 * ============================================================
 */
(function () {
  'use strict';
  var JY = window.JY = window.JY || {};

  /* ================= 基础工具 ================= */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  JY.esc = esc;

  /* ================= Storage（wx.setStorageSync 兼容） ================= */
  var memStore = {};
  function lsGet(key) {
    try {
      if (!window.localStorage) return memStore[key];
      var raw = window.localStorage.getItem(String(key));
      if (raw === null || raw === undefined) return '';
      try { return JSON.parse(raw); } catch (e) { return raw; }
    } catch (e) { return memStore[key]; }
  }
  function lsSet(key, val) {
    memStore[key] = val;
    try {
      if (window.localStorage) window.localStorage.setItem(String(key), JSON.stringify(val));
    } catch (e) { /* 隐私模式 / 容量满：降级为内存 */ }
  }
  function lsRemove(key) {
    delete memStore[key];
    try { if (window.localStorage) window.localStorage.removeItem(String(key)); } catch (e) {}
  }

  /* ================= 路由注册与实例 ================= */
  var pages = (JY._pages = {});       // route -> 页面配置对象
  var stack = [];                      // { inst, route, options }
  var silentHash = false;

  JY.page = function (route, cfg) {
    route = String(route || '');
    if (route.charAt(0) !== '/') route = '/' + route;   // 统一带前导斜杠注册
    pages[route] = cfg;
    if (!cfg.cssFile) {
      // 从路由推导 css 文件名（slug），与 TRANSFER_SPEC §3 的对照表一致
      var r = String(route || '').replace(/^\/?package-tarot\//, '').replace(/^\//, '');
      var m = r.match(/^pages\/([^/]+)\/([^/]+)(?:\/index)?$/);
      if (m) {
        var g = m[1], p = m[2];
        if (g === 'index' && p === 'index') cfg.cssFile = 'index';
        else if ((g === 'history' || g === 'about') && p === 'index') cfg.cssFile = g;
        else cfg.cssFile = g + '-' + p;
      } else {
        cfg.cssFile = 'index';
      }
    }
    return cfg;
  };

  function paramsOf(url) {
    url = String(url || '');
    var idx = url.indexOf('?');
    var route = idx < 0 ? url : url.slice(0, idx);
    if (route.charAt(0) !== '/') route = '/' + route;
    route = route.replace(/\/+$/, '');
    var options = {};
    if (idx >= 0) {
      url.slice(idx + 1).split('&').forEach(function (kv) {
        if (!kv) return;
        var p = kv.split('=');
        try {
          options[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
        } catch (e) {}
      });
    }
    return { route: route, options: options };
  }

  function linkOf(item) {
    var q = [];
    Object.keys(item.options || {}).forEach(function (k) {
      var v = item.options[k];
      if (v === null || v === undefined || v === '') return;
      q.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    return item.route + (q.length ? '?' + q.join('&') : '');
  }

  function instantiate(route, options) {
    var cfg = pages[route] || pages['/pages/index/index'];
    var inst = Object.create(cfg);
    inst.data = JSON.parse(JSON.stringify(cfg.data || {}));
    inst.options = options || {};
    inst.route = route;
    inst._loaded = false;
    inst.setData = function (patch) {
      var self = this;
      Object.keys(patch).forEach(function (k) { self.data[k] = patch[k]; });
      renderPage(self);
    };
    return inst;
  }

  function current() {
    var s = stack[stack.length - 1];
    return s ? s.inst : null;
  }

  function top() { return stack[stack.length - 1] || null; }

  /* ================= 渲染 ================= */
  var navTitleEl, navBackEl, navEl, appEl;
  function els() {
    if (!navEl) {
      navEl = document.getElementById('wNav');
      navTitleEl = document.getElementById('wNavTitle');
      navBackEl = document.getElementById('wNavBack');
      appEl = document.getElementById('app');
    }
  }

  function renderPage(inst) {
    els();
    if (!appEl) return;
    // 表单焦点保持：setData 全量重渲染后恢复输入焦点与光标（data-evt/data-act 标识）
    var act = null, focusKey = null;
    try {
      act = document.activeElement;
      if (act && act !== document.body && act.closest && !act.closest('#wUi')) {
        var tag = act.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          focusKey = act.getAttribute('data-evt') || act.getAttribute('data-act') || null;
        }
      }
    } catch (e) {}
    var html = '<div class="pg"><div class="pg__inner">页面渲染缺失</div></div>';
    try {
      if (typeof inst.render === 'function') html = inst.render.call(inst);
    } catch (e) {
      console.error('[render]', inst.route, e);
      html = '<div class="pg"><div class="pg__inner">页面渲染出错：' + esc(e.message || e) + '</div></div>';
    }
    appEl.innerHTML = html;
    if (focusKey) {
      try {
        var t = appEl.querySelector('[data-evt="' + focusKey + '"], [data-act="' + focusKey + '"]');
        if (t) {
          t.focus();
          if (typeof t.setSelectionRange === 'function' && t.value) {
            var L = t.value.length;
            try { t.setSelectionRange(L, L); } catch (e2) {}
          }
        }
      } catch (e3) {}
    }
    applyNav(inst);
    swapCss(inst);
    window.scrollTo(0, 0);
  }

  /* 导航栏颜色 → 主题类映射（每个类目页都通过 setNavigationBarColor 声明配色，由此推导主题） */
  var NAV_THEME = {
    '#0E1220': 't-root',
    '#EFE9DC': 't-divination',
    '#F3EFE6': 't-divination',
    '#0B1026': 't-zodiac',
    '#F5EADC': 't-palm',
    '#FAF3EC': 't-palm',
    '#140B22': 't-tarot'
  };
  function themeClassOf(navBg) { return NAV_THEME[String(navBg).toUpperCase()] || 't-root'; }

  function applyNav(inst) {
    els();
    var ts = (inst && inst.navTitle) || '今日宜签';
    try { if (navTitleEl) navTitleEl.textContent = ts; } catch (e) {}
    var hasBack = stack.length > 1;
    try { if (navEl) navEl.classList[hasBack ? 'add' : 'remove']('w-nav--has-back'); } catch (e) {}
  }

  function swapCss(inst) {
    var css = 'css/pages/' + ((inst && inst.cssFile) || 'index') + '.css';
    var link = document.getElementById('pageCssLink');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.id = 'pageCssLink';
      document.head.appendChild(link);
    }
    if (link.getAttribute('href') !== css) link.setAttribute('href', css);
  }

  function showPage(inst) {
    renderPage(inst);
    try {
      if (typeof inst.onShow === 'function') inst.onShow.call(inst);
    } catch (e) { console.error('[onShow]', inst.route, e); }
  }

  /* ================= 导航 ================= */
  function go(url, isReplace) {
    var p = paramsOf(url);
    if (!pages[p.route]) {
      toast('页面不存在：' + p.route);
      return;
    }
    if (isReplace && stack.length) stack.pop();
    var last = top();
    if (last && last.route === p.route &&
        JSON.stringify(last.options || {}) === JSON.stringify(p.options || {})) {
      // 同页同参：刷新展示，不重复压栈
      showPage(last.inst);
      setHash(linkOf(last), true);
      return;
    }
    var inst = instantiate(p.route, p.options);
    stack.push({ inst: inst, route: p.route, options: p.options });
    if (!inst._loaded) {
      inst._loaded = true;
      try {
        if (typeof inst.onLoad === 'function') inst.onLoad.call(inst, inst.options);
      } catch (e) { console.error('[onLoad]', p.route, e); }
    }
    setHash(linkOf(top()), true);
    showPage(inst);
  }

  function back() {
    if (stack.length <= 1) {
      stack = [];
      go('/pages/index/index');
      return;
    }
    stack.pop();
    var t = top();
    setHash(linkOf(t), true);
    showPage(t.inst);
  }

  function setHash(url, silent) {
    silentHash = !!silent;
    try { location.hash = '#' + url; } catch (e) {}
  }

  function hashRoute() {
    var h = String(location.hash || '').replace(/^#/, '');
    if (!h) { stack = []; go('/pages/index/index'); return; }
    var p = paramsOf(h);
    var last = top();
    if (last && last.route === p.route &&
        JSON.stringify(last.options || {}) === JSON.stringify(p.options || {})) {
      showPage(last.inst);
      return;
    }
    // 浏览器前进/后退：栈内已存在同地址 → 回卷到该层
    for (var i = stack.length - 1; i >= 0; i--) {
      if (stack[i].route === p.route &&
          JSON.stringify(stack[i].options || {}) === JSON.stringify(p.options || {})) {
        stack = stack.slice(0, i + 1);
        showPage(stack[i].inst);
        return;
      }
    }
    go(h);
  }

  JY.nav = { go: go, back: back, current: current };

  /* ================= App ================= */
  function makeApp() {
    var app = {
      globalData: {
        appName: '今日宜签',
        appSlogan: '四种方式，一次自观',
        categories: (JY.theme && JY.theme.CATEGORIES) || [],
        currentCat: '',
        history: [],
        favorites: [],
        profile: null
      },
      applyTheme: function (catKey) {
        var t = ((JY.theme && JY.theme.get) ? JY.theme.get(catKey) : null) ||
          { navText: '#ffffff', navBg: '#0E1220' };
        app.globalData.currentCat = catKey || '';
        wx.setNavigationBarColor({
          frontColor: t.navText,
          backgroundColor: t.navBg,
          animation: { duration: 180, timingFunc: 'easeIn' }
        });
      },
      resetTheme: function () {
        app.globalData.currentCat = '';
        wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: '#0E1220' });
      },
      addHistory: function (r) { return JY.store.addHistory(app, r); },
      upsertHistory: function (r) { return JY.store.upsertHistory(app, r); },
      getHistory: function (c) { return JY.store.getHistory(app, c); },
      removeHistory: function (id) { return JY.store.removeHistory(app, id); },
      clearHistory: function () { return JY.store.clearHistory(app); },
      isFavorite: function (id) { return JY.store.isFavorite(app, id); },
      getFavorites: function () { return app.globalData.favorites || []; },
      toggleFavorite: function (r) { return JY.store.toggleFavorite(app, r); }
    };
    return app;
  }
  var app = (JY.app = makeApp());
  window.getApp = function () { return JY.app || app; };
  window.getCurrentPages = function () {
    return stack.map(function (s) { return s.inst; });
  };
  window.Page = function (cfg) { return cfg; };

  /* ================= 弹层 ================= */
  function uiHost() {
    var h = document.getElementById('wUi');
    if (!h) {
      h = document.createElement('div');
      h.className = 'w-ui';
      h.id = 'wUi';
      document.body.appendChild(h);
    }
    return h;
  }
  var toastTimer = null;
  function toast(title, duration) {
    var host = uiHost();
    var old = host.querySelector('.w-toast');
    if (old) old.parentNode.removeChild(old);
    if (!title) return;
    var d = document.createElement('div');
    d.className = 'w-toast';
    d.textContent = title;
    host.appendChild(d);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      if (d.parentNode) d.parentNode.removeChild(d);
    }, duration || 1600);
  }

  var loadingEl = null;
  function showLoading(o) {
    o = o || {};
    hideLoading();
    var host = uiHost();
    loadingEl = document.createElement('div');
    loadingEl.className = 'w-loading';
    loadingEl.innerHTML = '<div class="w-loading__spin"></div>' +
      (o.title ? '<div class="w-loading__text">' + esc(o.title) + '</div>' : '');
    host.appendChild(loadingEl);
  }
  function hideLoading() {
    if (loadingEl && loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
    loadingEl = null;
  }

  function showModal(o) {
    o = o || {};
    var host = uiHost();
    var mask = document.createElement('div');
    mask.className = 'w-modal';
    mask.innerHTML =
      '<div class="w-modal__panel">' +
      (o.title ? '<div class="w-modal__title">' + esc(o.title) + '</div>' : '') +
      '<div class="w-modal__content">' + esc(o.content || '') + '</div>' +
      '<div class="w-modal__btns">' +
      (o.showCancel === false ? '' :
        '<button class="w-modal__btn w-modal__btn--cancel" type="button">' + esc(o.cancelText || '取消') + '</button>') +
      '<button class="w-modal__btn w-modal__btn--confirm" type="button">' + esc(o.confirmText || '确定') + '</button>' +
      '</div></div>';
    host.appendChild(mask);
    function done(confirm) {
      if (mask.parentNode) mask.parentNode.removeChild(mask);
      if (typeof o.success === 'function') o.success({ confirm: confirm, cancel: !confirm });
      if (typeof o.complete === 'function') o.complete();
    }
    var c = mask.querySelector('.w-modal__btn--confirm');
    var x = mask.querySelector('.w-modal__btn--cancel');
    c.addEventListener('click', function () { done(true); });
    if (x) x.addEventListener('click', function () { done(false); });
    mask.addEventListener('click', function (e) {
      if (e.target === mask) done(false);
    });
    if (o.confirmColor) c.style.color = o.confirmColor;
  }

  function showActionSheet(o) {
    o = o || {};
    var host = uiHost();
    var mask = document.createElement('div');
    mask.className = 'w-sheet';
    var items = (o.itemList || []).map(function (t, i) {
      return '<div class="w-sheet__item" data-i="' + i + '">' + esc(t) + '</div>';
    }).join('');
    mask.innerHTML = '<div class="w-sheet__panel">' + items +
      '<div class="w-sheet__item w-sheet__cancel" data-i="-1">取消</div></div>';
    host.appendChild(mask);
    function done(idx) {
      if (mask.parentNode) mask.parentNode.removeChild(mask);
      if (idx < 0) {
        if (typeof o.fail === 'function') o.fail({ errMsg: 'cancel' });
      } else if (typeof o.success === 'function') {
        o.success({ tapIndex: idx });
      }
      if (typeof o.complete === 'function') o.complete();
    }
    mask.querySelector('.w-sheet__panel').addEventListener('click', function (e) {
      var it = e.target.closest('.w-sheet__item');
      if (it) done(parseInt(it.getAttribute('data-i'), 10));
    });
    mask.addEventListener('click', function (e) {
      if (e.target === mask) done(-1);
    });
  }

  /* ================= 主题（导航栏） ================= */
  function applyNavTheme(frontColor, bgColor) {
    els();
    if (navEl) {
      navEl.style.background = bgColor || 'transparent';
      navEl.style.color = frontColor || '#ffffff';
    }
    document.body.className = themeClassOf(bgColor);
  }

  /* ================= 组件渲染器 ================= */
  JY.ui = {
    /** 娱乐声明组件（components/disclaimer 的转写） */
    disclaimer: function (p) {
      p = p || {};
      var n = (JY.data && JY.data.NOTICE) || { full: '', short: '', share: '', badge: '', health: '' };
      var t = p.type || 'full';
      var text = n.full;
      if (t === 'short') text = n.short;
      if (t === 'share') text = n.share;
      var badge = t === 'short' ? n.short : (n.badge || n.short);
      var sizeCls = p.size === 'sm' ? ' dc--sm' : '';
      return '<div class="dc' + sizeCls + '">' +
        (badge ? '<div class="dc__badge">' + esc(badge) + '</div>' : '') +
        '<div class="dc__text">' + esc(text) + '</div>' +
        (p.withHealth ? '<div class="dc__health">' + esc(n.health || '') + '</div>' : '') +
        '</div>';
    },
    /** sheet-card 组件：结果页通用分区卡 */
    sheetCard: function (p) {
      p = p || {};
      return '<div class="sc">' +
        (p.title ? '<div class="sc__head"><div class="sc__title">' + esc(p.title) + '</div>' +
          (p.sub ? '<div class="sc__sub">' + esc(p.sub) + '</div>' : '') + '</div>' : '') +
        '<div class="sc__body">' + (p.body || '') + '</div></div>';
    },
    /** ph-img 组件：图片容器 + 占位回落 */
    phImg: function (p) {
      p = p || {};
      var resolve = (JY.images && JY.images.resolve) || function () { return ''; };
      var src = p.src || resolve(p.img || '');
      var parts = String(p.ratio || '1:1').split(':');
      var w = parseFloat(parts[0]) || 1;
      var h = parseFloat(parts[1]) || 1;
      var pt = ((h / w) * 100).toFixed(4) + '%';
      var insetPct = parseFloat(p.inset) || 0;
      var imgInset = insetPct.toFixed(2) + '%';
      var imgSize = (100 - insetPct * 2).toFixed(2) + '%';
      var radius = p.circle ? '50%' : (p.radius || 'var(--radius-card)');
      var mode = { aspectFill: 'cover', aspectFit: 'contain', scaleToFill: 'fill', widthFix: 'contain' }[p.mode] || 'cover';
      var phClass = src ? 'ph ph--img' : 'ph ph--' + (p.variant || 'auto');
      var imgHtml = src
        ? '<img class="ph__img" style="position:absolute;display:block;left:' + imgInset + ';top:' + imgInset +
          ';width:' + imgSize + ';height:' + imgSize + ';object-fit:' + mode + ';"' +
          ' src="' + esc(src) + '" alt=""' +
          ' onerror="if(this.parentNode)this.parentNode.className=this.parentNode.className.replace(\'ph--img\',\'ph--auto\')">'
        : '';
      var body = '<div class="ph__body" style="position:absolute;left:0;top:0;right:0;bottom:0;">' +
        (p.emoji ? '<div class="ph__emoji">' + esc(p.emoji) + '</div>' :
          '<div class="ph__mark"><div class="ph__frame"><div class="ph__sun"></div><div class="ph__slash"></div></div></div>') +
        (p.name ? '<div class="ph__name">' + esc(p.name) + '</div>' : '') +
        (p.usage ? '<div class="ph__usage">' + esc(p.usage) + '</div>' : '') +
        (p.spec ? '<div class="ph__spec">' + esc(p.spec) + ' · ' + esc(p.ratio || '1:1') + '</div>' : '') +
        '</div>';
      return '<div class="' + phClass + '" style="position:relative;overflow:hidden;padding-top:' + pt + ';border-radius:' + radius +
        (src ? ';background:transparent;border:none;' : '') + '">' +
        imgHtml + body + '</div>';
    },
    /** 星级（base 里的 u-star） */
    stars: function (n, max) {
      max = max || 5;
      var out = '<div class="u-stars">';
      for (var i = 1; i <= max; i++) {
        out += '<div class="u-star' + (i <= n ? ' u-star--on' : '') + '"></div>';
      }
      return out + '</div>';
    }
  };

  JY.saveDataUrl = function (dataUrl, filename) {
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || ('jinri-yiqian-' + Date.now() + '.png');
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 200);
    toast('分享图已生成，已开始下载');
  };

  JY.loadImage = function (src) {
    return new Promise(function (resolve, reject) {
      if (src && typeof src === 'object' && src.complete !== undefined) {
        if (src.complete) { resolve(src); return; }
        src.onload = function () { resolve(src); };
        src.onerror = function () { reject(new Error('img load fail')); };
        return;
      }
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { reject(new Error('img load fail: ' + src)); };
      im.src = src;
    });
  };

  /* ================= Canvas 兼容层 =================
   * 小程序 2D 画布参数的「记录-回放」实现：
   *  - 所有绘制操作先入队（除 measureText / createLinearGradient 等需即时值的）;
   *  - draw(reserve, cb) 时先加载 drawImage 用到的图片，再按序回放，最后回调。
   *    结构保证图片（塔罗牌面等）与文字层级与小程序一致。
   */
  var canvasSessions = {};
  function getCanvasCtx(canvasId) {
    var cv = document.getElementById(canvasId);
    if (!cv) return makeNoopCtx();
    var g = cv.getContext('2d');
    var ops = [];
    var pendingSrcs = [];
    var session = { cv: cv, g: g, ops: ops, flush: null };
    canvasSessions[canvasId] = session;

    function enq(fn) { ops.push(fn); }

    var ctx = {
      save: function () { enq(function (c, img) { c.save(); }); },
      restore: function () { enq(function (c) { c.restore(); }); },
      scale: function (x, y) { enq(function (c) { c.scale(x, y); }); },
      translate: function (x, y) { enq(function (c) { c.translate(x, y); }); },
      setGlobalAlpha: function (a) { enq(function (c) { c.globalAlpha = a; }); },
      setFillStyle: function (v) { enq(function (c) { c.fillStyle = v; }); },
      setStrokeStyle: function (v) { enq(function (c) { c.strokeStyle = v; }); },
      setLineWidth: function (v) { enq(function (c) { c.lineWidth = v; }); },
      setLineJoin: function (v) { enq(function (c) { c.lineJoin = v; }); },
      setLineCap: function (v) { enq(function (c) { c.lineCap = v; }); },
      setFontSize: function (s) { enq(function (c) { c.font = s + 'px sans-serif'; }); },
      setTextAlign: function (a) { enq(function (c) { c.textAlign = a || 'left'; }); },
      setTextBaseline: function (b) { enq(function (c) { c.textBaseline = b || 'alphabetic'; }); },
      setShadow: function (x, y, blur, color) { enq(function (c) { c.shadowColor = color; c.shadowBlur = blur; c.shadowOffsetX = x; c.shadowOffsetY = y; }); },
      fillRect: function () { var a = arguments; enq(function (c) { c.fillRect.apply(c, a); }); },
      strokeRect: function () { var a = arguments; enq(function (c) { c.strokeRect.apply(c, a); }); },
      clearRect: function () { var a = arguments; enq(function (c) { c.clearRect.apply(c, a); }); },
      fillText: function () { var a = arguments; enq(function (c) { c.fillText.apply(c, a); }); },
      beginPath: function () { enq(function (c) { c.beginPath(); }); },
      closePath: function () { enq(function (c) { c.closePath(); }); },
      moveTo: function () { var a = arguments; enq(function (c) { c.moveTo.apply(c, a); }); },
      lineTo: function () { var a = arguments; enq(function (c) { c.lineTo.apply(c, a); }); },
      arc: function () { var a = arguments; enq(function (c) { c.arc.apply(c, a); }); },
      fill: function () { enq(function (c) { c.fill(); }); },
      stroke: function () { enq(function (c) { c.stroke(); }); },
      clip: function () { enq(function (c) { c.clip(); }); },
      drawImage: function () {
        var a = arguments;
        var src = a[0];
        if (src && typeof src === 'string' && !/^data:/.test(src)) {
          pendingSrcs.push(src);
          enq(function (c, images) { c.drawImage.apply(c, [images[src]].concat(Array.prototype.slice.call(a, 1))); });
        } else {
          enq(function (c) { c.drawImage.apply(c, a); });
        }
      },
      measureText: function (t) {
        // 近似度量（中英文混排按 1 字宽 ≈ 0.52em 估算），仅用于排版
        var size = 12;
        return { width: String(t || '').length * size * 0.52 };
      },
      setLineDash: function () { var a = arguments; enq(function (c) { if (c.setLineDash) c.setLineDash.apply(c, a); }); },
      createLinearGradient: function (x0, y0, x1, y1) {
        return g.createLinearGradient(x0, y0, x1, y1);   // 画布对象长期有效，可在回放时使用
      },
      createCircularGradient: function (x, y, r) {
        return g.createRadialGradient(x, y, 0, x, y, r);
      },
      draw: function (reserve, cb) {
        if (typeof reserve === 'function') { cb = reserve; }
        var imgs = {};
        var jobs = pendingSrcs.map(function (src) {
          return JY.loadImage(src).then(function (im) { imgs[src] = im; }, function () {
            imgs[src] = new Image(); // 加载失败：给空图，保证队列继续
          });
        });
        Promise.all(jobs).then(function () {
          g.save();
          var imgArg = imgs || {};
          ops.forEach(function (op) { op(g, imgArg); });
          g.restore();
          if (typeof cb === 'function') cb();
        });
      }
    };
    session.flush = ctx.draw;
    return ctx;
  }
  function makeNoopCtx() {
    var noop = function () {};
    return {
      save: noop, restore: noop, scale: noop, translate: noop, setGlobalAlpha: noop,
      setFillStyle: noop, setStrokeStyle: noop, setLineWidth: noop, setFontSize: noop,
      setTextAlign: noop, setTextBaseline: noop, setShadow: noop, fillRect: noop,
      strokeRect: noop, clearRect: noop, fillText: noop, beginPath: noop, closePath: noop,
      moveTo: noop, lineTo: noop, arc: noop, fill: noop, stroke: noop, clip: noop,
      drawImage: noop, setLineDash: noop,
      measureText: function (t) { return { width: String(t || '').length * 6 }; },
      createLinearGradient: function () { return { addColorStop: noop }; },
      createCircularGradient: function () { return { addColorStop: noop }; },
      draw: function (r, cb) { if (typeof cb === 'function') cb(); }
    };
  }

  /* ================= wx 兼容层 ================= */
  var wx = {};
  wx.getStorageSync = function (k) { return lsGet(k); };
  wx.setStorageSync = function (k, v) { lsSet(k, v); };
  wx.removeStorageSync = function (k) { lsRemove(k); };
  wx.clearStorageSync = function () {
    try { if (window.localStorage) window.localStorage.clear(); } catch (e) {}
    memStore = {};
  };
  wx.getStorageInfoSync = function () {
    var keys = [];
    try {
      for (var i = 0; i < window.localStorage.length; i++) keys.push(window.localStorage.key(i));
    } catch (e) {}
    return { keys: keys, currentSize: 0, limitSize: 0 };
  };
  wx.navigateTo = function (o) { go(o && o.url); if (o && typeof o.success === 'function') o.success(); };
  wx.redirectTo = function (o) { go(o && o.url, true); if (o && typeof o.success === 'function') o.success(); };
  wx.reLaunch = function (o) { stack = []; go(o && o.url); if (o && typeof o.success === 'function') o.success(); };
  wx.switchTab = function (o) { wx.navigateTo(o); };
  wx.navigateBack = function (o) { back(); if (o && typeof o.success === 'function') o.success(); };
  wx.showToast = function (o) { toast((o && o.title) || '', o && o.duration); };
  wx.hideToast = function () { toast(null); };
  wx.showLoading = showLoading;
  wx.hideLoading = hideLoading;
  wx.showModal = showModal;
  wx.showActionSheet = showActionSheet;
  wx.setNavigationBarColor = function (o) {
    o = o || {};
    applyNavTheme(o.frontColor || '#ffffff', o.backgroundColor || '#0E1220');
    if (typeof o.success === 'function') o.success();
  };
  wx.setNavigationBarTitle = function (o) {
    o = o || {};
    els();
    if (navTitleEl) navTitleEl.textContent = o.title || '今日宜签';
  };
  wx.vibrateShort = function () {};
  wx.vibrateLong = function () {};
  wx.pageScrollTo = function (o) {
    try { window.scrollTo(0, (o && o.scrollTop) || 0); } catch (e) {}
  };
  wx.getSystemInfoSync = function () {
    return {
      windowWidth: window.innerWidth, windowHeight: window.innerHeight,
      screenWidth: window.screen.width, screenHeight: window.screen.height,
      pixelRatio: window.devicePixelRatio || 1, platform: 'web', system: 'Web',
      statusBarHeight: 0, brand: 'devtools', model: 'browser',
      version: '1.0.0', SDKVersion: '3.0.0', safeArea: { bottom: window.innerHeight }
    };
  };
  wx.getWindowInfo = wx.getSystemInfoSync;
  wx.getMenuButtonBoundingClientRect = function () { return { top: 0, bottom: 44, left: 0, right: 44, width: 44, height: 44 }; };
  wx.setClipboardData = function (o) {
    var text = (o && o.data) || '';
    function ok() { if (o && typeof o.success === 'function') o.success({}); }
    function fail() { if (o && typeof o.fail === 'function') o.fail({ errMsg: 'clipboard denied' }); else ok(); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, fail);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { fail(); }
      document.body.removeChild(ta);
    }
  };
  wx.createCanvasContext = function (id, inst) { return getCanvasCtx(id); };
  wx.createSelectorQuery = function () {
    // 简化 shim：只支持 select('#id') + node(cb) / exec(cb) 的同步查询，
    // 供 poster 等取 canvas 节点（返回真实 DOM canvas，直接用原生 getContext）
    var q = { sel: '', _cb: null };
    q.in = function () { return q; };
    q.select = function (sel) { q.sel = String(sel || '').replace(/^#/, ''); return q; };
    q.selectAll = function (sel) { q.sel = String(sel || '').replace(/^#/, ''); return q; };
    q.node = function (cb) { q._cb = cb; return q; };
    q.fields = function (f) { q._fields = f || {}; return q; };
    q.boundingClientRect = function (cb) {
      var el = document.getElementById(q.sel);
      cb && cb(el ? [{
        left: 0, top: 0, width: el.clientWidth || 0, height: el.clientHeight || 0
      }] : [{ left: 0, top: 0, width: 0, height: 0 }]);
      return q;
    };
    q.exec = function (cb) {
      var el = document.getElementById(q.sel);
      var res = el ? { node: el, width: el.width || 0, height: el.height || 0 } : null;
      if (q._cb) q._cb(res ? [res] : []);
      if (cb) cb(res ? [res] : []);
    };
    return q;
  };
  wx.canvasToTempFilePath = function (o) {
    o = o || {};
    var session = canvasSessions[o.canvasId];
    function done() {
      var cv = session && session.cv;
      var url = '';
      try { url = cv ? cv.toDataURL('image/png') : ''; } catch (e) {}
      if (typeof o.success === 'function') o.success({ tempFilePath: url });
      if (typeof o.complete === 'function') o.complete();
    }
    if (session && session.flush) session.flush(false, done);
    else done();
  };
  wx.cloud = { init: function () {}, callFunction: function () { return Promise.reject({ errMsg: 'no cloud in web' }); } };
  wx.getAccountInfoSync = function () { return { miniProgram: { appId: '', envVersion: 'release' } }; };
  wx.canIUse = function () { return true; };
  wx.setStorage = function (o) { wx.setStorageSync(o && o.key, o && o.data); };
  wx.getStorage = function (o) { if (o && typeof o.success === 'function') o.success({ data: wx.getStorageSync(o.key) }); };
  window.wx = wx;

  /* ================= 全局事件委托 ================= */
  function datasetOf(el, inst) {
    var out = {};
    if (!el || !el.dataset) return out;
    var d = el.dataset;
    for (var k in d) {
      var v = d[k];
      if (v && v.charAt(0) === '$') {
        var path = v.slice(1).split('.');
        var o = inst;
        for (var i = 0; i < path.length && o !== null && o !== undefined; i++) o = o[path[i]];
        v = o;
      }
      out[k] = v;
    }
    return out;
  }

  function makeEvent(el, inst) {
    return {
      type: 'tap',
      currentTarget: { dataset: datasetOf(el, inst), id: el.id || '' },
      target: { dataset: datasetOf(el, inst), id: el.id || '' },
      detail: {}
    };
  }

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var inst = current();
    if (!inst) return;
    var fn = inst[el.getAttribute('data-act')];
    if (typeof fn === 'function') {
      try { fn.call(inst, makeEvent(el, inst)); } catch (err) {
        console.error('[handler]', el.getAttribute('data-act'), err);
      }
    }
  });

  ['input', 'change'].forEach(function (type) {
    document.addEventListener(type, function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-evt]') : null;
      if (!el) return;
      var inst = current();
      if (!inst) return;
      var fn = inst[el.getAttribute('data-evt')];
      if (typeof fn === 'function') {
        var ev = makeEvent(el, inst);
        ev.type = type;
        ev.detail = { value: el.value };
        try { fn.call(inst, ev); } catch (err) {
          console.error('[input]', el.getAttribute('data-evt'), err);
        }
      }
    });
  });

  /* ================= 启机 ================= */
  function boot() {
    els();
    if (navBackEl) {
      navBackEl.addEventListener('click', function () { back(); });
    }
    try {
      // theme 等模块在本脚本之后加载：启动时补填 globalData 的类目列表
      if (JY.theme && JY.theme.CATEGORIES) app.globalData.categories = JY.theme.CATEGORIES;
      if (typeof JY.store === 'object' && typeof JY.store.init === 'function') JY.store.init(JY.app);
    } catch (e) { console.error('[store.init]', e); }
    // 返回键：监听浏览器回退
    window.addEventListener('hashchange', function () {
      if (silentHash) { silentHash = false; return; }
      hashRoute();
    });
    hashRoute();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
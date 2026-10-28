/**
 * ============================================================
 * check.js · 网页版本地自检
 * ------------------------------------------------------------
 * 不依赖浏览器：用 node vm 模拟 window/document/localStorage，
 * 依次加载 js/core.js → js/modules/** → js/pages/**，
 * 然后对全部已注册页面执行 onLoad → render（合成 data-act 检查）。
 * 用法：node scripts/check.js    （在 jinri-yiqian-web/ 目录下）
 * 退出码 0 = 通过；1 = 有失败项。
 * ============================================================
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let failCount = 0;
function report(ok, msg) {
  console.log((ok ? '  ✓ ' : '  ✗ ') + msg);
  if (!ok) failCount++;
}

/* ---------- 收集脚本：严格按 index.html 的 <script src> 顺序 ---------- */
function scriptsFromHtml() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const out = [];
  const re = /<script src="([^"]+\.js)"><\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) out.push(path.join(ROOT, m[1].replace(/\//g, path.sep)));
  if (!out.length) throw new Error('index.html 中未解析到任何 script');
  return out;
}
function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir).sort().forEach(function (name) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) { walk(p, out); return; }
    if (/\.js$/.test(name)) out.push(p);
  });
  return out;
}
function scriptsFromFs() {
  return [path.join(ROOT, 'js', 'core.js')]
    .concat(walk(path.join(ROOT, 'js', 'modules'), []))
    .concat(walk(path.join(ROOT, 'js', 'pages'), []));
}
const scripts = (function () {
  try { return scriptsFromHtml(); } catch (e) { return scriptsFromFs(); }
})();

/* ---------- 浏览器环境模拟 ---------- */
function makeEl() {
  return {
    innerHTML: '', textContent: '', style: {}, className: '',
    classList: {
      add: function () {}, remove: function () {},
      contains: function () { return false; }
    },
    dataset: {},
    setAttribute: function () {}, getAttribute: function () { return null; },
    appendChild: function () {}, removeChild: function () {},
    addEventListener: function () {}, removeEventListener: function () {},
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    closest: function () { return null; },
    parentNode: null
  };
}
const windowObj = {
  JY: {},
  wx: null,
  localStorage: {
    _m: {},
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; },
    setItem: function (k, v) { this._m[k] = String(v); },
    removeItem: function (k) { delete this._m[k]; },
    clear: function () { this._m = {}; },
    get length() { return Object.keys(this._m).length; },
    key: function (i) { return Object.keys(this._m)[i] || null; }
  },
  innerWidth: 375, innerHeight: 667,
  screen: { width: 375, height: 667 },
  devicePixelRatio: 1,
  scrollTo: function () {},
  addEventListener: function () {},
  location: { hash: '' },
  navigator: {},
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  setInterval: setInterval, clearInterval: clearInterval
};
const documentObj = {
  readyState: 'loading',
  addEventListener: function () {},
  getElementById: function () { return makeEl(); },
  createElement: function () { return makeEl(); },
  querySelector: function () { return null; },
  head: { appendChild: function () {} },
  body: Object.assign(makeEl(), { className: '', style: {} })
};
const sandbox = {
  window: windowObj,
  JY: windowObj.JY,          // 浏览器里裸标识符 JY 解析到 window.JY；vm 里显式注入同一引用
  document: documentObj,
  location: windowObj.location,
  navigator: windowObj.navigator,
  localStorage: windowObj.localStorage,
  console: console,
  Promise: Promise,
  JSON: JSON, Math: Math, Date: Date,
  Object: Object, Array: Array, String: String, Number: Number, Boolean: Boolean,
  RegExp: RegExp, Error: Error, TypeError: TypeError,
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  setInterval: setInterval, clearInterval: clearInterval,
  parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN,
  encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent
};
Object.defineProperty(sandbox, 'wx', { get: function () { return windowObj.wx; } });
Object.defineProperty(sandbox, 'getApp', { get: function () { return windowObj.getApp; } });
Object.defineProperty(sandbox, 'getCurrentPages', { get: function () { return windowObj.getCurrentPages; } });
vm.createContext(sandbox);

/* ---------- 加载 ---------- */
console.log('== 1) 加载脚本（' + scripts.length + ' 个） ==');
const loadErrors = [];
scripts.forEach(function (f) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  if (!fs.existsSync(f)) { report(false, rel + ' → 文件不存在（index.html 引用了它？）'); return; }
  try {
    vm.runInContext(fs.readFileSync(f, 'utf8'), sandbox, { filename: rel });
  } catch (e) {
    loadErrors.push({ file: rel, err: e });
    report(false, rel + ' → 加载异常: ' + e.message);
  }
});

console.log('== 2) 语法检查（node 语法层） ==');
let syntaxFail = 0;
scripts.forEach(function (f) {
  if (!fs.existsSync(f)) return;
  try { new vm.Script(fs.readFileSync(f, 'utf8'), { filename: f }); }
  catch (e) { syntaxFail++; report(false, path.relative(ROOT, f) + ' 语法错误: ' + e.message); }
});
if (!syntaxFail) console.log('  ✓ 全部通过');

/* ---------- 期望清单 ---------- */
const EXPECT_MODULES = {
  data: ['NOTICE'], content: [], hexagram: [], daily: ['getToday', 'streak', 'totalDays'],
  theme: ['ROOT', 'CATEGORIES', 'get'], store: ['init'], util: ['nav', 'back', 'toast'],
  links: ['page', 'link', 'share', 'fromOptions'], images: ['resolve'],
  assetManifest: [], sfx: [], poster: [], dbHexagrams: [], dbPoems: [], dbTarot: [],
  palmConfig: [], palmQuality: ['check'], palmVision: ['analyze', 'setProvider', 'toPreset'],
  palmMock: ['analyze'], palmCloud: ['analyze']
};
const EXPECT_PAGES = [
  'pages/index/index', 'pages/divination/index', 'pages/divination/cast',
  'pages/divination/glossary/index', 'pages/zodiac/index', 'pages/zodiac/detail',
  'pages/zodiac/match/index', 'pages/palm/index', 'pages/palm/reading',
  'pages/palm/lines/index', 'pages/daily/index', 'pages/daily/calendar',
  'pages/history/index', 'pages/about/index',
  'package-tarot/pages/tarot/index', 'package-tarot/pages/tarot/reading',
  'package-tarot/pages/tarot/cards/index'
];

console.log('== 3) 模块与页面注册 ==');
Object.keys(EXPECT_MODULES).forEach(function (name) {
  const mod = sandbox.JY && sandbox.JY[name];
  if (!mod) { report(false, 'JY.' + name + ' 缺失'); return; }
  let missing = (EXPECT_MODULES[name] || []).filter(function (k) { return !(k in mod); });
  if (missing.length === 0) console.log('  ✓ JY.' + name);
  else report(false, 'JY.' + name + ' 缺导出键: ' + missing.join(', '));
});
const pages = (sandbox.JY && sandbox.JY._pages) || {};
function findPage(route) { return pages[route] || pages['/' + route]; }
EXPECT_PAGES.forEach(function (r) {
  if (findPage(r)) console.log('  ✓ 页面 ' + r);
  else report(false, '页面 ' + r + ' 未注册');
});

console.log('== 4) 页面 onLoad / render 冒烟 ==');
EXPECT_PAGES.forEach(function (r) {
  const cfg = findPage(r);
  if (!cfg) return;
  try {
    const inst = Object.create(cfg);
    inst.data = JSON.parse(JSON.stringify(cfg.data || {}));
    inst.options = {};
    inst.route = r;
    inst.setData = function (p) {
      const self = this;
      Object.keys(p).forEach(function (k) { self.data[k] = p[k]; });
      const html = self.render.call(self);
      checkActs(html, cfg, r);
    };
    if (typeof inst.onLoad === 'function') inst.onLoad.call(inst, inst.options);
    const html = inst.render.call(inst);
    checkActs(html, cfg, r);
    if (typeof inst.onShow === 'function') inst.onShow.call(inst);
    console.log('  ✓ ' + r + ' → ' + html.length + ' 字符');
  } catch (e) {
    report(false, r + ' 冒烟失败: ' + (e && e.stack ? e.stack.split('\n')[0] + ' @' + (e.stack.split('\n')[1] || '').trim() : e));
  }
});

const actErrors = {};
function checkActs(html, cfg, route) {
  const re = /data-act="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const fn = m[1];
    if (typeof cfg[fn] !== 'function') {
      if (!actErrors[route]) actErrors[route] = [];
      if (actErrors[route].indexOf(fn) < 0) actErrors[route].push(fn);
    }
  }
}
console.log('== 5) data-act 完整性 ==');
let actTotal = 0;
Object.keys(actErrors).forEach(function (r) {
  actErrors[r].forEach(function (fn) { actTotal++; });
  report(false, r + ' 缺少方法: ' + actErrors[r].join(', '));
});
if (!actTotal) console.log('  ✓ 全部 data-act 有对应方法');

console.log('== 6) 静态风控 ==');
const bannedRe = [/alert\(/, /confirm\(/, /prompt\(/, /[0-9]rpx/];
const bannedName = ['alert(', 'confirm(', 'prompt(', '数字rpx'];
let bannedHit = 0;
scripts.forEach(function (f) {
  if (!fs.existsSync(f)) return;
  const src = fs.readFileSync(f, 'utf8');
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  bannedRe.forEach(function (re, i) {
    if (re.test(src)) {
      report(false, rel + ' 含 ' + bannedName[i]);
      bannedHit++;
    }
  });
});
if (!bannedHit) console.log('  ✓ 无 alert/confirm/prompt/rpx 残留');

console.log('== 7) 数据完整性 ==');
try {
  const JY0 = sandbox.JY;
  // 六十四卦：64 条、id 连续、卦名唯一
  const hx64 = JY0.dbHexagrams;
  report(Array.isArray(hx64) && hx64.length === 64, 'dbHexagrams 64 条（实际 ' + (hx64 && hx64.length) + '）');
  if (hx64) {
    const names = {};
    let dup = 0;
    hx64.forEach(function (h) { if (names[h.name]) dup++; names[h.name] = 1; });
    report(dup === 0, '卦名唯一（重复 ' + dup + ' 个）');
  }
  // 星座 12
  report(JY0.data && JY0.data.ZODIACS && JY0.data.ZODIACS.length === 12, 'ZODIACS 12 个（实际 ' + (JY0.data && JY0.data.ZODIACS && JY0.data.ZODIACS.length) + '）');
  // 塔罗 78（22 大 + 56 小）
  const taro = JY0.data && JY0.data.TAROT_CARDS;
  report(Array.isArray(taro) && taro.length === 78, 'TAROT_CARDS 78 张（实际 ' + (taro && taro.length) + '）');
  if (taro && taro.length) {
    const majors = taro.filter(function (c) { return /^\d+$/.test(String(c.id)); }).length;
    report(majors === 22, '大阿尔卡纳 22 张（实际 ' + majors + '）');
  }
  // 签诗 103（三情绪组合计）
  const poems = JY0.dbPoems;
  if (poems) {
    const total = ['positive', 'neutral', 'reflective'].reduce(function (s, k) {
      return s + (Array.isArray(poems[k]) ? poems[k].length : 0);
    }, 0);
    report(total === 103, '签诗合计 103 首（实际 ' + total + '）');
  } else {
    report(false, 'dbPoems 缺失');
  }
  // content 装配：64 卦全表 + 全部有专属卦辞
  const all = JY0.content && JY0.content.allHexagrams();
  report(all && all.length === 64, 'content.allHexagrams 64 条（实际 ' + (all && all.length) + '）');
  if (all) {
    const noDetail = all.filter(function (h) { return !h.hasDetail; }).length;
    report(noDetail === 0, '64 卦全部有专属卦辞（缺 ' + noDetail + '）');
  }
  // links 链接格式稳定性
  const linkTarot = JY0.links && JY0.links.link('tarot', { spread: 'triangle', auto: 1, cards: ['0', '1', '2'], rev: ['1'], q: '' });
  report(linkTarot === '/package-tarot/pages/tarot/reading?spread=triangle&auto=1&cards=0,1,2&rev=1&q=',
    'links.link 塔罗格式稳定（实际: ' + linkTarot + '）');
  const linkPage = JY0.links && JY0.links.page('/pages/history/index', { cat: 'tarot' });
  report(linkPage === '/pages/history/index?cat=tarot', 'links.page 通用格式（实际: ' + linkPage + '）');
  // 图片解析
  report(JY0.images.resolve('tarot/tarot_card_0.webp') === 'assets/tarot/tarot_card_0.webp',
    'images.resolve 塔罗路径（实际: ' + JY0.images.resolve('tarot/tarot_card_0.webp') + '）');
  report(JY0.images.resolve('brand/brand_logo.png') === 'assets/brand/brand_logo.png',
    'images.resolve 品牌路径（实际: ' + JY0.images.resolve('brand/brand_logo.png') + '）');
  // 每日一签：同日确定性（getToday 未抽时为 null 属正常语义，先抽再验）
  if (JY0.daily && typeof JY0.daily.getToday === 'function') {
    const hasDraw = typeof JY0.daily.drawToday === 'function';
    let a = JY0.daily.getToday();
    if ((a === null || a === undefined) && hasDraw) {
      try { JY0.daily.drawToday(); } catch (e) {}
      a = JY0.daily.getToday();
    }
    const b = JY0.daily.getToday();
    report(a !== null && a !== undefined, 'daily.drawToday/getToday 可抽签');
    if (a && b) report(a.signNo === b.signNo && a.level.label === b.level.label, '同日抽签确定性一致');
    if (a) {
      const shape = ['signNo', 'level', 'theme', 'poem', 'yi', 'ji', 'luck', 'xingyu'].every(function (k) { return k in a; });
      report(shape, '抽签结果结构完整（signNo/level/theme/poem/yi/ji/luck/xingyu）');
    }
  }
} catch (e) {
  report(false, '数据完整性检查异常: ' + e.message);
}

console.log('');
console.log(failCount === 0 ? '═══ 自检通过：0 失败 ═══' : '═══ 自检失败数：' + failCount + ' ═══' );
process.exit(failCount === 0 ? 0 : 1);
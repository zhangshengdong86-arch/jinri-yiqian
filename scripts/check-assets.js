/**
 * check-assets.js · 图片引用完整性
 * 对全部页面执行 render()，提取 HTML 中的 assets/ 路径，
 * 与磁盘上实际文件比对，报告：缺失引用 / 未被引用的孤儿文件。
 * 用法：node scripts/check-assets.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

/* 与 check.js 相同的沙箱 */
function makeEl() {
  return {
    innerHTML: '', textContent: '', style: {}, className: '',
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } },
    dataset: {},
    setAttribute: function () {}, getAttribute: function () { return null; },
    appendChild: function () {}, removeChild: function () {},
    addEventListener: function () {}, removeEventListener: function () {},
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    closest: function () { return null; }, parentNode: null
  };
}
const windowObj = {
  JY: {}, wx: null,
  localStorage: { _m: {}, getItem: function (k) { return this._m[k] == null ? null : this._m[k]; }, setItem: function (k, v) { this._m[k] = String(v); }, removeItem: function (k) { delete this._m[k]; }, clear: function () { this._m = {}; }, get length() { return Object.keys(this._m).length; }, key: function (i) { return Object.keys(this._m)[i] || null; } },
  innerWidth: 375, innerHeight: 667,
  screen: { width: 375, height: 667 }, devicePixelRatio: 1,
  scrollTo: function () {}, addEventListener: function () {}, location: { hash: '' },
  navigator: {}, setTimeout: setTimeout, clearTimeout: clearTimeout,
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
  window: windowObj, JY: windowObj.JY, document: documentObj,
  location: windowObj.location, navigator: windowObj.navigator,
  localStorage: windowObj.localStorage, console: console,
  Promise: Promise, JSON: JSON, Math: Math, Date: Date,
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

const htmlScripts = [];
(function () {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const re = /<script src="([^"]+\.js)"><\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) htmlScripts.push(path.join(ROOT, m[1].replace(/\//g, path.sep)));
})();
htmlScripts.forEach(function (f) {
  if (!fs.existsSync(f)) { console.log('  ✗ 缺失脚本: ' + f); return; }
  vm.runInContext(fs.readFileSync(f, 'utf8'), sandbox, { filename: path.relative(ROOT, f) });
});

/* 磁盘文件清单 */
function listFiles(dir, base, out) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(function (n) {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) listFiles(p, base, out);
    else out.push(path.relative(base, p).replace(/\\/g, '/'));
  });
}
const disk = [];
listFiles(path.join(ROOT, 'assets'), path.join(ROOT), disk);
const diskSet = {};
disk.forEach(function (f) { diskSet[f] = true; });

/* 渲染所有页面收集 assets 引用 */
const refs = {};
const pages = sandbox.JY._pages || {};
Object.keys(pages).forEach(function (r) {
  const cfg = pages[r];
  try {
    const inst = Object.create(cfg);
    inst.data = JSON.parse(JSON.stringify(cfg.data || {}));
    inst.options = {};
    inst.route = r;
    inst.setData = function (p) {
      const self = this;
      Object.keys(p).forEach(function (k) { self.data[k] = p[k]; });
      self._last = self.render.call(self);
    };
    if (typeof inst.onLoad === 'function') inst.onLoad.call(inst, inst.options);
    const html = inst._last || (typeof inst.render === 'function' ? inst.render.call(inst) : '');
    const re = /(assets\/[A-Za-z0-9_\-\/.]+)/g;
    let m;
    while ((m = re.exec(html)) !== null) refs[m[1]] = (refs[m[1]] || 0) + 1;
  } catch (e) {
    console.log('  ✗ ' + r + ' 渲染异常: ' + e.message);
  }
});

/* 比对 */
console.log('被引用清单:');
Object.keys(refs).sort().forEach(function (f) { console.log('    · ' + f + ' ×' + refs[f]); });
let missing = 0;
Object.keys(refs).sort().forEach(function (f) {
  if (!diskSet[f]) {
    console.log('  ✗ 引用缺失文件: ' + f + '（被引用 ' + refs[f] + ' 次）');
    missing++;
  }
});
let orphans = 0;
disk.forEach(function (f) {
  if (!refs[f]) { orphans++; }
  if (!refs[f] && f.split('/')[1] !== 'README.md' && false) {}
});
console.log('');
console.log('磁盘图片总数: ' + disk.length);
console.log('被引用图片数: ' + Object.keys(refs).length);
console.log('缺失引用: ' + missing);
console.log('未被引用（孤儿）: ' + orphans);
if (orphans) {
  const keepSilent = ['assets/share/', 'assets/README.md'];
  disk.filter(function (f) { return !refs[f]; }).forEach(function (f) {
    if (keepSilent.some(function (p) { return f.indexOf(p) === 0; })) return;
    console.log('    - ' + f);
  });
}
process.exit(missing === 0 ? 0 : 1);
/**
 * analytics.js · 访问统计（51.la 网站版 SDK）
 * ------------------------------------------------------------
 * 应用：今日宜签 网页版（网站类型应用）
 * 说明：SDK 脚本动态注入，加载完成后初始化；统计访客 UV/PV/来源/地域。
 *       如需更换统计应用，只改下面 LA.init 的 id/ck 即可。
 */
(function () {
  'use strict';
  var s = document.createElement('script');
  s.charset = 'UTF-8';
  s.id = 'LA_COLLECT';
  s.src = 'https://sdk.51.la/js-sdk-pro.min.js';
  s.async = true;
  s.onload = function () {
    try {
      if (window.LA && typeof window.LA.init === 'function') {
        window.LA.init({ id: '3ReswoNP8j4Tcr8F', ck: '3ReswoNP8j4Tcr8F' });
      }
    } catch (e) { /* 统计失败不影响网站功能 */ }
  };
  document.head.appendChild(s);
})();
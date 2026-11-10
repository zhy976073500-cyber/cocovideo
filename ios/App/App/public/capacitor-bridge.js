/**
 * CocoVideo iOS 封装桥接（capacitor-bridge.js）
 *
 * 作用只有一个：接管编辑器导出 .tendies 时的浏览器下载。
 * 编辑器本身用 <a download> + blob URL 触发下载，这在桌面浏览器能用，
 * 但在 iOS 的 WKWebView 里点下去什么都不会发生（没有下载管理器）。
 *
 * 本文件在检测到 Capacitor 环境时，把 .tendies 的锚点点击拦截下来，
 * 改走原生路线：Filesystem 写到 App 缓存目录 -> Share 弹出系统分享单，
 * 用户在分享单里点「存储到文件」或直接点 CocoWall 就能把包拿走。
 *
 * 注意：
 * - 只拦截 download 属性以 .tendies 结尾、且 href 是 blob: 的锚点点击，
 *   编辑器里其他点击（包括两个隐藏 file input 的点击）一律放行。
 * - 不在浏览器环境生效（没有 window.Capacitor 时直接退出），网页版行为不变。
 * - 不改编辑器自身的任何代码，只在外层包一层；编辑器升级后直接替换
 *   www/index.html 即可，本文件继续有效。
 */
(function () {
  if (!window.Capacitor || !window.Capacitor.Plugins) return;
  var Filesystem = window.Capacitor.Plugins.Filesystem;
  var Share = window.Capacitor.Plugins.Share;
  if (!Filesystem || !Share) return;

  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    var href = this.getAttribute('href') || '';
    var dl = this.getAttribute('download') || '';
    var isTendies =
      dl.slice(-8).toLowerCase() === '.tendies' && href.indexOf('blob:') === 0;
    if (!isTendies) return origClick.call(this);

    fetch(href)
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onloadend = function () {
            var dataUrl = String(reader.result || '');
            resolve(dataUrl.split(',')[1] || '');
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      })
      .then(function (b64) {
        return Filesystem.writeFile({
          path: dl,
          data: b64,
          directory: 'CACHE',
        }).then(function () {
          return Filesystem.getUri({ path: dl, directory: 'CACHE' });
        });
      })
      .then(function (ret) {
        return Share.share({
          title: dl,
          url: ret.uri,
          dialogTitle: '分享 .tendies',
        });
      })
      .catch(function (e) {
        console.warn('[bridge] .tendies 分享失败', e);
      });
    // 不再执行默认的锚点点击：WKWebView 里它本来也下不了文件。
  };
})();

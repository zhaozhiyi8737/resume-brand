/* ===== qrcode-btn.js — 二维码生成与下载 =====
 * 库：davidshimjs/qrcodejs（离线 lib/qrcode.min.js，渲染为 canvas+img）。
 *   - PNG：直接取 canvas.toDataURL。
 *   - SVG：该库不原生支持 SVG，这里读取 canvas 像素矩阵，生成等价 <rect> 矩阵的 SVG。
 *
 * 扫码行为：二维码编码的是当前页面 URL（去掉 ?admin，让访客看到纯展示页）。
 *   微信扫码 / 电脑浏览器打开的是同一 URL，由 CSS 媒体查询自动适配双端布局。
 */
(function () {
  "use strict";

  var QR_CTOR = (window.QRCode);   // davidshimjs 暴露的构造函数

  document.addEventListener("DOMContentLoaded", function () {
    var fab = document.getElementById("qrFab");
    var modal = document.getElementById("qrModal");
    if (!fab || !modal) return;

    var qrInstance = null;

    fab.addEventListener("click", openModal);
    modal.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });

    var btnPng = document.getElementById("qrDownloadPng");
    var btnSvg = document.getElementById("qrDownloadSvg");
    if (btnPng) btnPng.addEventListener("click", downloadPng);
    if (btnSvg) btnSvg.addEventListener("click", downloadSvg);

    function openModal() {
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      generate();
    }
    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = "";
    }

    function getPageUrl() {
      // 去掉 ?admin，访客扫到的是纯展示页
      var origin = location.origin;
      // file:// 协议下 origin 为 "null"，用当前完整 href（去掉 ?admin）替代
      if (!origin || origin === "null" || origin === "file://") {
        return location.href.replace(/[?&]admin(?:&|$)/, "").replace(/[?&]$/,"");
      }
      return origin + location.pathname;
    }

    function generate() {
      var container = document.getElementById("qrCanvas");
      var urlEl = document.getElementById("qrUrl");
      if (!container) return;
      container.innerHTML = "";   // 清掉旧实例
      var url = getPageUrl();
      if (urlEl) urlEl.textContent = url;

      if (!QR_CTOR) {
        container.innerHTML = '<p style="color:#fff;font-size:.85rem">二维码库加载失败，请检查 lib/qrcode.min.js</p>';
        return;
      }
      // davidshimjs 构造：new QRCode(el, { text, width, height, colorDark, colorLight })
      qrInstance = new QR_CTOR(container, {
        text: url,
        width: 220,
        height: 220,
        colorDark: "#0a0a0f",
        colorLight: "#ffffff",
        correctLevel: QR_CTOR.CorrectLevel ? QR_CTOR.CorrectLevel.H : 2
      });
    }

    /* ---------- 取渲染出的 canvas（库可能在 img 兜底，优先取 canvas）---------- */
    function getCanvas() {
      var container = document.getElementById("qrCanvas");
      if (!container) return null;
      var c = container.querySelector("canvas");
      if (c) return c;
      // 极少数浏览器无 canvas，只有 img —— 用临时 canvas 重绘
      var img = container.querySelector("img");
      if (!img) return null;
      var tmp = document.createElement("canvas");
      tmp.width = img.naturalWidth || 220;
      tmp.height = img.naturalHeight || 220;
      var ctx = tmp.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, tmp.width, tmp.height);
      ctx.drawImage(img, 0, 0, tmp.width, tmp.height);
      return tmp;
    }

    function triggerDownload(href, filename) {
      var a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    function downloadPng() {
      var c = getCanvas();
      if (!c) { RB.toast("二维码尚未生成", "error"); return; }
      triggerDownload(c.toDataURL("image/png"), "resume-qr.png");
    }

    /* ---------- 自写 SVG 导出：扫描 canvas 像素，黑块画 <rect> ---------- */
    function canvasToSvg(canvas) {
      var size = canvas.width;
      var ctx = canvas.getContext("2d");
      var data;
      try {
        data = ctx.getImageData(0, 0, size, size).data;
      } catch (e) {
        // 跨域污染时降级
        return null;
      }
      // 把模块按 1px 对齐成方块（davidshimjs 的 canvas 与模块同分辨率）。
      // 为压缩 SVG 体积，合并连续同行黑像素为一条 <rect>。
      var rects = [];
      var isDark = function (x, y) {
        var i = (y * size + x) * 4;
        // 以亮度判断（黑≈0）
        return data[i] + data[i + 1] + data[i + 2] < 384;
      };
      for (var y = 0; y < size; y++) {
        var x = 0;
        while (x < size) {
          if (isDark(x, y)) {
            var start = x;
            while (x < size && isDark(x, y)) x++;
            rects.push('<rect x="' + start + '" y="' + y + '" width="' + (x - start) + '" height="1"/>');
          } else {
            x++;
          }
        }
      }
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '">' +
        '<rect width="' + size + '" height="' + size + '" fill="#ffffff"/>' +
        '<g fill="#0a0a0f">' + rects.join("") + "</g>" +
        "</svg>"
      );
    }

    function downloadSvg() {
      var c = getCanvas();
      if (!c) { RB.toast("二维码尚未生成", "error"); return; }
      var svg = canvasToSvg(c);
      if (!svg) { RB.toast("SVG 生成失败（图片跨域）", "error"); return; }
      var blob = new Blob([svg], { type: "image/svg+xml" });
      var url = URL.createObjectURL(blob);
      triggerDownload(url, "resume-qr.svg");
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    }
  });
})();

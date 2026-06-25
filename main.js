/* ===== main.js — 入口：初始化、导航、滚动效果、汉堡菜单 =====
 * 执行顺序：移动端检测 → render 渲染 → 滚动渐入/进度条 → 导航高亮 → 汉堡菜单 → admin 初始化
 */
(function () {
  "use strict";

  /* ---------- 移动端设备检测（JS 层三重保险）---------- */
  // CSS 媒体查询 + JS 检测双重触发，覆盖微信 X5 内核、iframe 等边缘场景。
  // 三重判断：移动 UA / 屏幕物理宽度（screen.width，不受 viewport 影响）/ 视口宽度
  function detectMobile() {
    var ua = navigator.userAgent || "";
    var isMobileUA = /Mobile|Android(?!.*Tablet)|iPhone|iPod|Windows Phone|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    var isSmallScreen = (screen.width <= 768);
    var isNarrow = window.innerWidth <= 768;
    if (isMobileUA || isSmallScreen || isNarrow) {
      document.documentElement.classList.add("is-mobile");
    }
    if (/MicroMessenger/i.test(ua)) {
      document.documentElement.classList.add("is-wechat");
    }
    // 窗口大小变化时重新检测（横竖屏切换）
    window.addEventListener("resize", function () {
      if (window.innerWidth <= 768) {
        document.documentElement.classList.add("is-mobile");
      } else {
        document.documentElement.classList.remove("is-mobile");
      }
    });
  }
  // 尽早执行，在 CSS 加载后、DOMContentLoaded 前
  detectMobile();

  document.addEventListener("DOMContentLoaded", function () {
    RB.render();

    setupScrollProgress();
    setupReveal();
    setupNav();
    setupHamburger();

    // 数据变化时（admin 保存后）重新渲染
    window.addEventListener("rb:datachange", function () {
      RB.render();
    });

    // 若带 ?admin，进入后台流程（admin.js 接管）
    if (new URLSearchParams(location.search).has("admin")) {
      // 确保 admin.js 已定义 initAdmin
      if (RB.initAdmin) RB.initAdmin();
    }
  });

  /* ---------- 顶部滚动进度条 ---------- */
  function setupScrollProgress() {
    var bar = document.getElementById("scrollProgress");
    if (!bar) return;
    function update() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.width = pct + "%";
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- 滚动渐入（IntersectionObserver）---------- */
  RB.observeReveal = function () {
    var els = document.querySelectorAll(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    if (!RB._revealObserver) {
      RB._revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            RB._revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    }
    els.forEach(function (el) { RB._revealObserver.observe(el); });
  };
  function setupReveal() {
    RB.observeReveal();
  }

  /* ---------- 导航：滚动高亮当前区块 ---------- */
  function setupNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav__link"));
    var map = {};
    links.forEach(function (l) {
      var id = l.getAttribute("data-target");
      var sec = document.getElementById(id);
      if (sec) map[id] = l;
    });
    if (!("IntersectionObserver" in window)) return;
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          links.forEach(function (l) { l.classList.remove("active"); });
          var l = map[entry.target.id];
          if (l) l.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) spy.observe(sec);
    });

    // 点击导航项后，移动端自动收起菜单
    links.forEach(function (l) {
      l.addEventListener("click", function () {
        closeMenu();
      });
    });
  }

  /* ---------- 汉堡菜单（移动端）---------- */
  function setupHamburger() {
    var nav = document.getElementById("nav");
    var toggle = document.getElementById("navToggle");
    if (!nav || !toggle) return;
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // 点击页面其它处收起
    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("menu-open")) return;
      if (nav.contains(e.target)) return;
      closeMenu();
    });
    // 窗口变宽时收起
    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) closeMenu();
    });
  }
  function closeMenu() {
    var nav = document.getElementById("nav");
    var toggle = document.getElementById("navToggle");
    if (nav) nav.classList.remove("menu-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }
})();

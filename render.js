/* ===== render.js — 数据 → 展示页 DOM 渲染 =====
 * RB.render(data) 把 8 个模块渲染进对应容器。
 * 暴露 RB.render 供 main.js 与 admin.js（保存后）调用。
 */
window.RB = window.RB || {};

(function (RB) {
  "use strict";

  /* ---------- 工具：安全转义（防 XSS，纯文本字段用）---------- */
  function esc(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  // 富文本字段：做一层轻量清理，移除 <script>/on* 事件属性（防 XSS）
  function sanitizeRich(html) {
    if (!html) return "";
    var s = String(html);
    s = s.replace(/<\s*script[\s\S]*?<\/script>/gi, "");
    s = s.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
    s = s.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
    s = s.replace(/javascript:/gi, "");
    return s;
  }
  function fmtDate(d) {
    if (!d) return "";
    // 支持 "2020-09" / "2020" / 任意文本
    return esc(d);
  }
  function dateRange(start, end) {
    if (!start && !end) return "";
    if (start && end) return esc(start) + " — " + esc(end);
    return esc(start || end);
  }
  function joinNonEmpty(arr, sep) {
    return (arr || []).filter(Boolean).map(esc).join(sep || " · ");
  }

  /* ---------- Hero / 个人信息 ---------- */
  function renderHero(profile) {
    var p = profile || {};
    var c = p.contact || {};
    var avatar = p.avatar
      ? '<img class="hero__avatar" src="' + esc(p.avatar) + '" alt="' + esc(p.name || "头像") + '" />'
      : '<img class="hero__avatar" src="assets/avatar-placeholder.svg" alt="默认头像" />';

    var tags = (p.tags || []).map(function (t) {
      return '<span class="chip">' + esc(t) + "</span>";
    }).join("");

    var contacts = [];
    if (c.phone) contacts.push('<a href="tel:' + esc(c.phone) + '">' + icon("phone") + "<span>" + esc(c.phone) + "</span></a>");
    if (c.email) contacts.push('<a href="mailto:' + esc(c.email) + '">' + icon("mail") + "<span>" + esc(c.email) + "</span></a>");
    if (c.wechat) contacts.push('<span class="hero__contact-item">' + icon("chat") + "<span>微信：" + esc(c.wechat) + "</span></span>");
    (c.socials || []).forEach(function (s) {
      if (s && s.url) {
        contacts.push('<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + icon("link") + "<span>" + esc(s.name || s.url) + "</span></a>");
      }
    });

    return (
      '<div class="hero reveal">' +
        avatar +
        '<div class="hero__hello">Hello, I am</div>' +
        '<h1 class="hero__name grad-text">' + esc(p.name || "你的名字") + "</h1>" +
        (p.title ? '<div class="hero__title">' + esc(p.title) + "</div>" : "") +
        (p.bio ? '<p class="hero__bio">' + esc(p.bio) + "</p>" : "") +
        (tags ? '<div class="hero__tags">' + tags + "</div>" : "") +
        (contacts.length ? '<div class="hero__contact">' + contacts.join("") + "</div>" : "") +
      "</div>"
    );
  }

  /* ---------- 时间轴项（教育/实习/工作）---------- */
  function renderTimelineItem(rec, moduleKey) {
    var cardInner = "";
    if (moduleKey === "education") {
      cardInner =
        '<div class="card__head">' +
          '<div><div class="card__title">' + esc(rec.school) + "</div>" +
          '<div class="card__subtitle">' + joinNonEmpty([rec.major, rec.degree], " · ") + "</div></div>" +
          '<div class="card__date">' + dateRange(rec.start, rec.end) + "</div>" +
        "</div>" +
        (rec.honors ? '<div class="card__line">🏆 ' + esc(rec.honors) + "</div>" : "") +
        (rec.courses ? '<div class="card__line">课程：' + esc(rec.courses) + "</div>" : "");
    } else {
      // internships / work 结构相同
      cardInner =
        '<div class="card__head">' +
          '<div><div class="card__title">' + esc(rec.company) + "</div>" +
          '<div class="card__subtitle">' + esc(rec.position) + "</div></div>" +
          '<div class="card__date">' + dateRange(rec.start, rec.end) + "</div>" +
        "</div>" +
        (rec.description ? '<div class="card__line prose-sm">' + sanitizeRich(rec.description) + "</div>" : "");
    }
    return '<div class="timeline-item reveal">' + wrapCard(cardInner) + "</div>";
  }
  function wrapCard(inner) {
    return '<div class="card">' + inner + "</div>";
  }

  /* ---------- 项目/科研 网格卡片 ---------- */
  function renderProjectCard(rec) {
    var tech = (rec.tech || []).map(function (t) {
      return '<span class="chip">' + esc(t) + "</span>";
    }).join("");
    return (
      '<div class="card card--project reveal">' +
        '<div class="card__head">' +
          '<div><div class="card__title">' + esc(rec.name) + "</div>" +
          (rec.role ? '<div class="card__subtitle">' + esc(rec.role) + "</div>" : "") + "</div>" +
          '<div class="card__date">' + dateRange(rec.start, rec.end) + "</div>" +
        "</div>" +
        (rec.description ? '<div class="card__line">' + sanitizeRich(rec.description) + "</div>" : "") +
        (tech ? '<div class="card__tech">' + tech + "</div>" : "") +
        (rec.link ? '<a class="card__link" href="' + esc(rec.link) + '" target="_blank" rel="noopener">查看项目</a>' : "") +
      "</div>"
    );
  }
  function renderResearchCard(rec) {
    return (
      '<div class="card card--research reveal">' +
        '<div class="card__head">' +
          '<div><div class="card__title">' + esc(rec.name) + "</div>" +
          (rec.role ? '<div class="card__subtitle">' + esc(rec.role) + "</div>" : "") + "</div>" +
          '<div class="card__date">' + dateRange(rec.start, rec.end) + "</div>" +
        "</div>" +
        (rec.content ? '<div class="card__line">' + sanitizeRich(rec.content) + "</div>" : "") +
        (rec.paperLink ? '<a class="card__link" href="' + esc(rec.paperLink) + '" target="_blank" rel="noopener">查看论文 / 成果</a>' : "") +
      "</div>"
    );
  }

  /* ---------- 荣誉徽章 ---------- */
  function renderBadge(rec) {
    return (
      '<div class="badge reveal">' +
        '<div class="badge__name">' + esc(rec.name) + "</div>" +
        (rec.org || rec.date
          ? '<div class="badge__meta">' + joinNonEmpty([rec.org, rec.date], " · ") + "</div>"
          : "") +
      "</div>"
    );
  }

  /* ---------- 空状态 ---------- */
  function emptyState(text) {
    return '<div class="empty-state">' + esc(text || "暂无内容") + "</div>";
  }

  /* ---------- 页脚 ---------- */
  function renderFooter(profile) {
    var p = profile || {};
    var c = p.contact || {};
    var items = [];
    if (c.email) items.push('<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>");
    if (c.phone) items.push('<a href="tel:' + esc(c.phone) + '">' + esc(c.phone) + "</a>");
    (c.socials || []).forEach(function (s) {
      if (s && s.url) items.push('<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name || s.url) + "</a>");
    });
    var year = new Date().getFullYear();
    return (
      '<div class="footer__inner">' +
        (items.length ? '<div class="footer__contact">' + items.join('<span aria-hidden="true">·</span>') + "</div>" : "") +
        '<div class="footer__copyright">© ' + year + " " + esc(p.name || "Resume") + " · Crafted with care</div>" +
      "</div>"
    );
  }

  /* ---------- 图标（内联 SVG，零外部依赖）---------- */
  function icon(name) {
    var map = {
      phone: '<svg class="hero__contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
      mail: '<svg class="hero__contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
      chat: '<svg class="hero__contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
      link: '<svg class="hero__contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
    };
    return map[name] || "";
  }

  /* ---------- 主渲染入口 ---------- */
  RB.render = function (data) {
    var d = data || RB.getData();

    // Hero
    var heroEl = document.querySelector('[data-module="profile"]');
    if (heroEl) heroEl.innerHTML = renderHero(d.profile);

    // 各 list 模块
    function fillList(moduleKey, renderer, emptyText) {
      var body = document.querySelector('[data-list="' + moduleKey + '"]');
      if (!body) return;
      var list = d[moduleKey] || [];
      if (!list.length) {
        body.innerHTML = emptyState(emptyText);
        return;
      }
      body.innerHTML = list.map(function (rec) { return renderer(rec, moduleKey); }).join("");
    }

    fillList("education", renderTimelineItem, "暂无教育背景记录");
    fillList("internships", renderTimelineItem, "暂无实习经历");
    fillList("work", renderTimelineItem, "暂无工作经历");
    fillList("projects", renderProjectCard, "暂无项目经历");
    fillList("research", renderResearchCard, "暂无科研经历");

    // 荣誉
    var honorsBody = document.querySelector('[data-list="honors"]');
    if (honorsBody) {
      var honors = d.honors || [];
      honorsBody.innerHTML = honors.length
        ? honors.map(renderBadge).join("")
        : emptyState("暂无荣誉记录");
    }

    // 自我评价
    var selfEl = document.querySelector('[data-field="selfEval"]');
    if (selfEl) {
      selfEl.innerHTML = d.selfEval ? '<div class="reveal">' + sanitizeRich(d.selfEval) + "</div>" : emptyState("暂无自我评价");
    }

    // 页脚
    var footerEl = document.getElementById("footer");
    if (footerEl) footerEl.innerHTML = renderFooter(d.profile);

    // 重新触发滚动渐入动画
    RB.observeReveal && RB.observeReveal();

    // 通知 admin.js 注入编辑控件（若处于编辑模式）
    window.dispatchEvent(new CustomEvent("rb:rendered", { detail: d }));
  };

  // 暴露内部工具给 admin.js 复用
  RB._render = { esc: esc, sanitizeRich: sanitizeRich, fmtDate: fmtDate };
})(window.RB);

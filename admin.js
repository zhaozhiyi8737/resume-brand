/* ===== admin.js — 后台管理全部逻辑 =====
 * 入口 RB.initAdmin()（由 main.js 在 ?admin 时调用）。
 * 流程：显示登录层 → 登录成功 → 进入编辑模式（注入控件 + 工具栏）。
 *
 * 编辑模式能力：
 *   - 每个 list 记录卡片右上角：✎编辑 / 🗑删除 / ≡拖拽排序
 *   - 每个模块底部：＋新增记录
 *   - profile / selfEval：专门的编辑入口
 *   - 工具栏：导出/导入 JSON、改密码、重置、退出
 */
window.RB = window.RB || {};

(function (RB) {
  "use strict";

  /* ===================== 工具：toast ===================== */
  var toastTimer = null;
  RB.toast = function (msg, type) {
    var el = document.getElementById("toast");
    if (!el) { console.log("[toast]", msg); return; }
    el.textContent = msg;
    el.className = "toast show" + (type ? " toast--" + type : "");
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("show");
    }, 2400);
  };

  /* ===================== DOM 引用 ===================== */
  var els = {};
  function cacheEls() {
    els.gate = document.getElementById("adminGate");
    els.bar = document.getElementById("adminBar");
    els.loginForm = document.getElementById("loginForm");
    els.loginPwd = document.getElementById("loginPwd");
    els.loginErr = document.getElementById("loginErr");
    els.editor = document.getElementById("editor");
    els.editorForm = document.getElementById("editorForm");
    els.editorTitle = document.getElementById("editorTitle");
    els.toast = document.getElementById("toast");
  }

  /* ===================== 入口 ===================== */
  RB.initAdmin = function () {
    cacheEls();

    // 已登录（本次会话）→ 直接进编辑模式
    if (RB.isLoggedIn()) {
      enterEditMode();
    } else {
      showGate();
    }

    bindGate();
    bindBar();
    bindEditor();
    bindLeaveAdmin();
  };

  /* ===================== 登录层 ===================== */
  function showGate() {
    els.gate.hidden = false;
    els.bar.hidden = true;
    document.body.setAttribute("data-mode", "view");
    document.body.classList.remove("is-editing");
    setTimeout(function () { els.loginPwd && els.loginPwd.focus(); }, 50);
  }

  function bindGate() {
    els.loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var pwd = els.loginPwd.value;
      els.loginErr.hidden = true;
      RB.verifyPassword(pwd).then(function (ok) {
        if (ok) {
          RB.login();
          enterEditMode();
        } else {
          els.loginErr.textContent = "密码错误，请重试";
          els.loginErr.hidden = false;
          els.loginPwd.value = "";
          els.loginPwd.focus();
        }
      });
    });
  }

  /* ===================== 编辑模式 ===================== */
  function enterEditMode() {
    els.gate.hidden = true;
    els.bar.hidden = false;
    document.body.setAttribute("data-mode", "admin");
    document.body.classList.add("is-editing");
    RB.toast("已进入编辑模式", "success");
    injectAdminControls();
  }

  function bindLeaveAdmin() {
    document.querySelectorAll("[data-leave-admin]").forEach(function (b) {
      b.addEventListener("click", leaveAdmin);
    });
  }
  function leaveAdmin() {
    RB.logout();
    // 去掉 ?admin，回到纯展示页
    var url = location.origin + location.pathname;
    history.replaceState(null, "", url);
    location.reload();
  }

  /* ===================== 工具栏 ===================== */
  function bindBar() {
    document.getElementById("exportJson").addEventListener("click", function () {
      RB.exportJSON();
      RB.toast("已导出 JSON 文件", "success");
    });
    document.getElementById("importJson").addEventListener("click", function () {
      document.getElementById("importFile").click();
    });
    document.getElementById("importFile").addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      RB.parseImport(file).then(function (data) {
        RB.save(data);
        RB.toast("导入成功", "success");
      }).catch(function (err) {
        RB.toast(err.message, "error");
      });
      e.target.value = "";
    });
    document.getElementById("changePwd").addEventListener("click", openChangePwd);
    document.getElementById("resetData").addEventListener("click", function () {
      if (confirm("确定重置为默认数据？当前所有自定义内容将被清除。")) {
        RB.resetData();
        RB.toast("已重置为默认数据", "success");
      }
    });
  }

  /* ===================== 注入编辑控件 ===================== */
  function injectAdminControls() {
    // 先清掉旧控件（rendered 事件会重复触发）
    document.querySelectorAll("[data-admin-control]").forEach(function (n) { n.remove(); });

    // ---- Hero 编辑按钮 ----
    var hero = document.querySelector(".hero");
    if (hero && !hero.querySelector(".hero-edit-btn")) {
      var hb = document.createElement("button");
      hb.className = "adm-btn hero-edit-btn";
      hb.setAttribute("data-admin-control", "");
      hb.innerHTML = "✎";
      hb.title = "编辑个人信息";
      hb.addEventListener("click", function () { openObjectEditor("profile"); });
      hero.appendChild(hb);
    }

    // ---- 各 list 模块 ----
    ["education", "internships", "work", "projects", "research", "honors"].forEach(function (mod) {
      var body = document.querySelector('[data-list="' + mod + '"]');
      if (!body) return;
      var items = body.querySelectorAll(".card, .badge, .timeline-item");
      items.forEach(function (item, idx) {
        attachItemControls(item, mod, idx);
      });

      // 新增按钮
      var addBtn = document.createElement("button");
      addBtn.className = "add-record";
      addBtn.setAttribute("data-admin-control", "");
      addBtn.textContent = "新增" + (RB.SCHEMA[mod].labelSingular || "记录");
      addBtn.addEventListener("click", function () {
        openRecordEditor(mod, -1);   // -1 = 新增
      });
      body.appendChild(addBtn);
    });

    // ---- 自我评价编辑按钮 ----
    var selfEl = document.querySelector('[data-field="selfEval"]');
    if (selfEl && !selfEl.querySelector(".self-edit-btn")) {
      var sb = document.createElement("button");
      sb.className = "add-record self-edit-btn";
      sb.setAttribute("data-admin-control", "");
      sb.textContent = "编辑自我评价";
      sb.addEventListener("click", function () { openSelfEvalEditor(); });
      // 插在 reveal 包裹层内
      var inner = selfEl.querySelector(".reveal") || selfEl;
      inner.appendChild(sb);
    }
  }

  function attachItemControls(item, mod, idx) {
    // 找到真正承载数据的根节点（timeline-item 内含 card）
    var host = item.classList.contains("timeline-item") ? item.querySelector(".card") : item;
    if (!host) return;
    host.style.position = host.style.position || "relative";

    var ctrls = document.createElement("div");
    ctrls.className = item.classList.contains("badge") ? "badge-admin-controls" : "card-admin-controls";
    ctrls.setAttribute("data-admin-control", "");

    // 编辑
    var editBtn = document.createElement("button");
    editBtn.className = "adm-btn";
    editBtn.innerHTML = "✎";
    editBtn.title = "编辑";
    editBtn.addEventListener("click", function () { openRecordEditor(mod, idx); });
    ctrls.appendChild(editBtn);

    // 删除
    var delBtn = document.createElement("button");
    delBtn.className = "adm-btn adm-btn--del";
    delBtn.innerHTML = "🗑";
    delBtn.title = "删除";
    delBtn.addEventListener("click", function () { deleteRecord(mod, idx); });
    ctrls.appendChild(delBtn);

    // 拖拽（荣誉徽章 + 卡片都支持）
    var dragBtn = document.createElement("button");
    dragBtn.className = "adm-btn adm-btn--drag";
    dragBtn.innerHTML = "⠿";
    dragBtn.title = "拖拽排序";
    dragBtn.setAttribute("draggable", "true");
    setupDrag(dragBtn, item, mod);
    ctrls.appendChild(dragBtn);

    host.appendChild(ctrls);
  }

  /* ===================== 拖拽排序 ===================== */
  var dragState = { mod: null, fromIdx: -1, draggingEl: null };
  function setupDrag(handle, item, mod) {
    handle.addEventListener("dragstart", function (e) {
      var items = Array.prototype.slice.call(document.querySelectorAll('[data-list="' + mod + '"] > .card, [data-list="' + mod + '"] > .badge, [data-list="' + mod + '"] > .timeline-item'));
      dragState.mod = mod;
      dragState.fromIdx = items.indexOf(item);
      dragState.draggingEl = item;
      item.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      // 必须 setData 才能触发拖拽
      try { e.dataTransfer.setData("text/plain", String(dragState.fromIdx)); } catch (_) {}
    });
    handle.addEventListener("dragend", function () {
      item.classList.remove("dragging");
      document.querySelectorAll(".drag-over").forEach(function (n) { n.classList.remove("drag-over"); });
      dragState.draggingEl = null;
    });
    // 让整个 item 成为 drop 目标
    item.addEventListener("dragover", function (e) {
      if (dragState.mod !== mod) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dragState.draggingEl && dragState.draggingEl !== item) {
        item.classList.add("drag-over");
      }
    });
    item.addEventListener("dragleave", function () {
      item.classList.remove("drag-over");
    });
    item.addEventListener("drop", function (e) {
      e.preventDefault();
      item.classList.remove("drag-over");
      if (dragState.mod !== mod || dragState.fromIdx < 0) return;
      var items = Array.prototype.slice.call(document.querySelectorAll('[data-list="' + mod + '"] > .card, [data-list="' + mod + '"] > .badge, [data-list="' + mod + '"] > .timeline-item'));
      var toIdx = items.indexOf(item);
      if (toIdx < 0 || toIdx === dragState.fromIdx) return;
      moveRecord(mod, dragState.fromIdx, toIdx);
    });
  }

  function moveRecord(mod, from, to) {
    var data = RB.getData();
    var arr = data[mod];
    if (!Array.isArray(arr)) return;
    var moved = arr.splice(from, 1)[0];
    arr.splice(to, 0, moved);
    RB.save(data);
    RB.toast("已调整顺序", "success");
  }

  function deleteRecord(mod, idx) {
    var data = RB.getData();
    var arr = data[mod];
    if (!Array.isArray(arr) || !arr[idx]) return;
    if (!confirm("删除这条" + (RB.SCHEMA[mod].labelSingular || "记录") + "？")) return;
    arr.splice(idx, 1);
    RB.save(data);
    RB.toast("已删除", "success");
  }

  /* ===================== 编辑弹窗：list 记录 ===================== */
  function openRecordEditor(mod, idx) {
    var data = RB.getData();
    var arr = data[mod] || [];
    var isNew = idx < 0;
    var rec = isNew ? RB.emptyRecord(mod) : (arr[idx] ? JSON.parse(JSON.stringify(arr[idx])) : RB.emptyRecord(mod));

    els.editorTitle.textContent = (isNew ? "新增" : "编辑") + (RB.SCHEMA[mod].labelSingular || "记录");
    els.editorForm.innerHTML = "";
    RB.SCHEMA[mod].fields.forEach(function (f) {
      els.editorForm.appendChild(buildField(f, rec[f.key], rec));
    });

    // 操作按钮
    var actions = document.createElement("div");
    actions.className = "editor__actions";
    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn--ghost";
    cancel.textContent = "取消";
    cancel.addEventListener("click", closeEditor);
    var save = document.createElement("button");
    save.type = "submit";
    save.className = "btn btn--primary";
    save.textContent = "保存";
    actions.appendChild(cancel);
    actions.appendChild(save);
    els.editorForm.appendChild(actions);

    els.editorForm.onsubmit = function (e) {
      e.preventDefault();
      collectForm(els.editorForm, RB.SCHEMA[mod].fields, rec);
      var data2 = RB.getData();
      var arr2 = data2[mod] || (data2[mod] = []);
      if (isNew) arr2.push(rec);
      else arr2[idx] = rec;
      RB.save(data2);
      closeEditor();
      RB.toast(isNew ? "已新增" : "已保存", "success");
    };

    showModal();
  }

  /* ===================== 编辑弹窗：profile（object）===================== */
  function openObjectEditor(mod) {
    var data = RB.getData();
    var obj = JSON.parse(JSON.stringify(data[mod] || {}));
    els.editorTitle.textContent = "编辑个人信息";
    els.editorForm.innerHTML = "";

    RB.SCHEMA[mod].fields.forEach(function (f) {
      if (f.type === "group") {
        // contact 子组
        var fieldset = document.createElement("div");
        fieldset.className = "field";
        var label = document.createElement("div");
        label.className = "field__label";
        label.textContent = f.label;
        fieldset.appendChild(label);
        var sub = document.createElement("div");
        sub.style.display = "flex";
        sub.style.flexDirection = "column";
        sub.style.gap = "0.7rem";
        f.fields.forEach(function (sf) {
          var cur = (obj[f.key] || {})[sf.key];
          if (sf.type === "socials") {
            var val = ((obj[f.key] || {}).socials || []).map(function (s) {
              return (s.name || "") + "|" + (s.url || "");
            }).join("\n");
            sub.appendChild(buildField({
              key: "__socials__", label: sf.label, type: "long", hint: sf.hint
            }, val));
          } else {
            sub.appendChild(buildField(sf, cur, obj[f.key] || (obj[f.key] = {})));
          }
        });
        fieldset.appendChild(sub);
        els.editorForm.appendChild(fieldset);
      } else {
        els.editorForm.appendChild(buildField(f, obj[f.key], obj));
      }
    });

    var actions = document.createElement("div");
    actions.className = "editor__actions";
    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn--ghost";
    cancel.textContent = "取消";
    cancel.addEventListener("click", closeEditor);
    var save = document.createElement("button");
    save.type = "submit";
    save.className = "btn btn--primary";
    save.textContent = "保存";
    actions.appendChild(cancel);
    actions.appendChild(save);
    els.editorForm.appendChild(actions);

    els.editorForm.onsubmit = function (e) {
      e.preventDefault();
      // 先收集普通字段
      RB.SCHEMA[mod].fields.forEach(function (f) {
        if (f.type === "group") {
          f.fields.forEach(function (sf) {
            if (sf.type === "socials") {
              var ta = els.editorForm.querySelector('[data-key="__socials__"]');
              var raw = ta ? ta.value : "";
              obj[f.key].socials = raw.split("\n").map(function (line) {
                var p = line.split("|");
                return { name: (p[0] || "").trim(), url: (p[1] || "").trim() };
              }).filter(function (s) { return s.name || s.url; });
            } else {
              var input = els.editorForm.querySelector('[data-key="' + sf.key + '"]');
              if (input) obj[f.key][sf.key] = input.value.trim();
            }
          });
        } else {
          collectOneField(els.editorForm, f, obj);
        }
      });
      RB.updateModule(mod, obj);
      closeEditor();
      RB.toast("已保存", "success");
    };

    showModal();
  }

  /* ===================== 编辑弹窗：自我评价（顶层富文本）===================== */
  function openSelfEvalEditor() {
    var data = RB.getData();
    var html = data.selfEval || "";
    els.editorTitle.textContent = "编辑自我评价";
    els.editorForm.innerHTML = "";

    var f = buildField({ key: "selfEval", label: "内容", type: "rich", placeholder: "写下你的自我评价…" }, html, {});
    els.editorForm.appendChild(f);

    var actions = document.createElement("div");
    actions.className = "editor__actions";
    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn--ghost";
    cancel.textContent = "取消";
    cancel.addEventListener("click", closeEditor);
    var save = document.createElement("button");
    save.type = "submit";
    save.className = "btn btn--primary";
    save.textContent = "保存";
    actions.appendChild(cancel);
    actions.appendChild(save);
    els.editorForm.appendChild(actions);

    els.editorForm.onsubmit = function (e) {
      e.preventDefault();
      var rte = els.editorForm.querySelector('[data-key="selfEval"]');
      var val = rte ? rte.innerHTML.trim() : "";
      RB.updateModule("selfEval", val);
      closeEditor();
      RB.toast("已保存", "success");
    };

    showModal();
  }

  /* ===================== 改密码弹窗 ===================== */
  function openChangePwd() {
    els.editorTitle.textContent = "修改管理密码";
    els.editorForm.innerHTML = "";
    els.editorForm.classList.add("dialog-pwd");

    function pwdField(key, label) {
      var wrap = document.createElement("div");
      wrap.className = "field";
      wrap.innerHTML = '<label class="field__label">' + label + '</label>';
      var inp = document.createElement("input");
      inp.type = "password";
      inp.setAttribute("data-key", key);
      inp.required = true;
      inp.className = "field__input";
      inp.style.cssText = "width:100%;padding:.65rem .85rem;background:var(--bg-elev-2);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text)";
      wrap.appendChild(inp);
      return wrap;
    }
    els.editorForm.appendChild(pwdField("old", "当前密码"));
    els.editorForm.appendChild(pwdField("new", "新密码"));
    els.editorForm.appendChild(pwdField("new2", "确认新密码"));

    var actions = document.createElement("div");
    actions.className = "editor__actions";
    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn--ghost";
    cancel.textContent = "取消";
    cancel.addEventListener("click", closeEditor);
    var save = document.createElement("button");
    save.type = "submit";
    save.className = "btn btn--primary";
    save.textContent = "保存";
    actions.appendChild(cancel);
    actions.appendChild(save);
    els.editorForm.appendChild(actions);

    els.editorForm.onsubmit = function (e) {
      e.preventDefault();
      var old = els.editorForm.querySelector('[data-key="old"]').value;
      var nw = els.editorForm.querySelector('[data-key="new"]').value;
      var nw2 = els.editorForm.querySelector('[data-key="new2"]').value;
      if (nw.length < 4) { RB.toast("新密码至少 4 位", "error"); return; }
      if (nw !== nw2) { RB.toast("两次新密码不一致", "error"); return; }
      RB.verifyPassword(old).then(function (ok) {
        if (!ok) { RB.toast("当前密码错误", "error"); return; }
        RB.setPassword(nw).then(function () {
          closeEditor();
          RB.toast("密码已更新", "success");
        });
      });
    };
    showModal();
  }

  /* ===================== 字段构造器 ===================== */
  // 根据 schema.field 构造表单控件，绑定到 target[field.key]
  function buildField(f, value, target) {
    var wrap = document.createElement("div");
    wrap.className = "field" + (f.type === "image" ? " field--image" : "");

    var label = document.createElement("label");
    label.className = "field__label";
    label.textContent = f.label;
    if (f.hint) {
      label.textContent += " ";
      var hint = document.createElement("span");
      hint.className = "field__hint";
      hint.textContent = "（" + f.hint + "）";
      label.appendChild(hint);
    }
    wrap.appendChild(label);

    if (f.type === "text" || f.type === "date" || f.type === "url") {
      var inp = document.createElement("input");
      inp.type = f.type === "date" ? "month" : (f.type === "url" ? "url" : "text");
      inp.setAttribute("data-key", f.key);
      inp.value = value || "";
      if (f.placeholder) inp.placeholder = f.placeholder;
      wrap.appendChild(inp);
    } else if (f.type === "long") {
      var ta = document.createElement("textarea");
      ta.setAttribute("data-key", f.key);
      ta.value = value || "";
      if (f.placeholder) ta.placeholder = f.placeholder;
      wrap.appendChild(ta);
    } else if (f.type === "list") {
      var li = document.createElement("input");
      li.type = "text";
      li.setAttribute("data-key", f.key);
      li.value = Array.isArray(value) ? value.join(", ") : (value || "");
      li.placeholder = f.placeholder || "用逗号分隔";
      wrap.appendChild(li);
    } else if (f.type === "rich") {
      var rte = buildRichText(f.key, value, f.placeholder);
      wrap.appendChild(rte);
    } else if (f.type === "image") {
      wrap.appendChild(buildImageField(f.key, value));
    } else {
      var fallback = document.createElement("input");
      fallback.type = "text";
      fallback.setAttribute("data-key", f.key);
      fallback.value = value || "";
      wrap.appendChild(fallback);
    }
    return wrap;
  }

  /* ---------- 图片字段：预览 + 上传 + URL ----------
   * 返回 DocumentFragment，含 .img-preview（圆头像预览）+ .img-controls（URL 输入 + 上传按钮），
   * 二者由父 .field--image 的 flex 横向并排。
   */
  function buildImageField(key, value) {
    var frag = document.createDocumentFragment();

    var preview = document.createElement("img");
    preview.className = "img-preview";
    preview.src = value || "assets/avatar-placeholder.svg";
    preview.alt = "预览";
    frag.appendChild(preview);

    var controls = document.createElement("div");
    controls.className = "img-controls";

    var urlInp = document.createElement("input");
    urlInp.type = "url";
    urlInp.setAttribute("data-key", key);
    urlInp.value = value || "";
    urlInp.placeholder = "粘贴图片 URL";
    urlInp.addEventListener("input", function () {
      preview.src = urlInp.value || "assets/avatar-placeholder.svg";
    });
    controls.appendChild(urlInp);

    var upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "btn btn--ghost";
    upBtn.textContent = "上传本地图片（≤1.2MB）";
    var fileInp = document.createElement("input");
    fileInp.type = "file";
    fileInp.accept = "image/*";
    fileInp.hidden = true;
    upBtn.addEventListener("click", function () { fileInp.click(); });
    fileInp.addEventListener("change", function () {
      var file = fileInp.files[0];
      if (!file) return;
      if (file.size > 1.2 * 1024 * 1024) {
        RB.toast("图片过大（>1.2MB），建议压缩或改用 URL", "error");
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        urlInp.value = reader.result;   // base64
        preview.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    controls.appendChild(upBtn);
    controls.appendChild(fileInp);

    frag.appendChild(controls);
    return frag;
  }

  /* ---------- 富文本编辑器 ---------- */
  function buildRichText(key, value, placeholder) {
    var rte = document.createElement("div");
    rte.className = "rte";

    var toolbar = document.createElement("div");
    toolbar.className = "rte__toolbar";
    var btns = [
      { cmd: "bold", html: "<b>B</b>", title: "加粗" },
      { cmd: "italic", html: "<i>I</i>", title: "斜体" },
      { sep: true },
      { cmd: "formatBlock", arg: "h3", html: "H3", title: "标题" },
      { cmd: "formatBlock", arg: "p", html: "¶", title: "正文" },
      { sep: true },
      { cmd: "insertUnorderedList", html: "• 列表", title: "无序列表" },
      { cmd: "insertOrderedList", html: "1. 列表", title: "有序列表" },
      { cmd: "formatBlock", arg: "blockquote", html: "❝", title: "引用" },
      { sep: true },
      { action: "link", html: "🔗", title: "插入链接" },
      { action: "image", html: "🖼", title: "插入图片" }
    ];
    btns.forEach(function (b) {
      if (b.sep) {
        var sep = document.createElement("span");
        sep.className = "rte__sep";
        toolbar.appendChild(sep);
        return;
      }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rte__btn";
      btn.innerHTML = b.html;
      btn.title = b.title || "";
      btn.addEventListener("mousedown", function (e) { e.preventDefault(); }); // 不失焦
      btn.addEventListener("click", function () {
        var content = rte.querySelector(".rte__content");
        content.focus();
        if (b.cmd) {
          document.execCommand(b.cmd, false, b.arg || null);
        } else if (b.action === "link") {
          insertLink(content);
        } else if (b.action === "image") {
          insertImage(content);
        }
        syncActive();
      });
      toolbar.appendChild(btn);
    });
    rte.appendChild(toolbar);

    var content = document.createElement("div");
    content.className = "rte__content";
    content.setAttribute("contenteditable", "true");
    content.setAttribute("data-key", key);
    content.setAttribute("data-placeholder", placeholder || "在此输入…");
    content.innerHTML = value || "";
    rte.appendChild(content);

    function syncActive() {
      ["bold", "italic"].forEach(function (c) {
        var b = toolbar.querySelector('.rte__btn[data-cmd="' + c + '"]');
        if (b) b.classList.toggle("active", document.queryCommandState(c));
      });
    }
    content.addEventListener("keyup", syncActive);
    content.addEventListener("mouseup", syncActive);
    content.addEventListener("focus", syncActive);

    // 给 toolbar 按钮加 data-cmd 以便 syncActive 定位
    toolbar.querySelectorAll(".rte__btn").forEach(function (btn, i) {
      var def = btns.filter(function (x) { return !x.sep; })[i];
      if (def && def.cmd) btn.setAttribute("data-cmd", def.cmd);
    });

    return rte;
  }

  function insertLink(content) {
    var sel = window.getSelection();
    var selectedText = sel && sel.toString();
    var url = prompt("输入链接地址（含 http(s)://）：", "https://");
    if (!url) return;
    if (selectedText) {
      document.execCommand("createLink", false, url);
    } else {
      var text = prompt("链接显示文字：", url);
      if (text) {
        var a = '<a href="' + escapeAttr(url) + '" target="_blank" rel="noopener">' + escapeHtml(text) + "</a>";
        document.execCommand("insertHTML", false, a);
      }
    }
  }
  function insertImage(content) {
    var choice = confirm("确定 = 上传本地图片\n取消 = 粘贴图片 URL");
    if (choice) {
      var inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "image/*";
      inp.addEventListener("change", function () {
        var file = inp.files[0];
        if (!file) return;
        if (file.size > 1.2 * 1024 * 1024) { RB.toast("图片过大（>1.2MB）", "error"); return; }
        var r = new FileReader();
        r.onload = function () {
          document.execCommand("insertHTML", false, '<img src="' + r.result + '" alt="" />');
        };
        r.readAsDataURL(file);
      });
      inp.click();
    } else {
      var url = prompt("图片 URL：", "https://");
      if (url) document.execCommand("insertImage", false, url);
    }
  }
  function escapeHtml(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function escapeAttr(s) { return String(s).replace(/"/g, "&quot;"); }

  /* ===================== 表单收集 ===================== */
  function collectForm(form, fields, target) {
    fields.forEach(function (f) { collectOneField(form, f, target); });
  }
  function collectOneField(form, f, target) {
    var el = form.querySelector('[data-key="' + f.key + '"]');
    if (!el) return;
    if (f.type === "list") {
      target[f.key] = el.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    } else if (f.type === "rich") {
      target[f.key] = el.innerHTML.trim();
    } else if (f.type === "image") {
      target[f.key] = el.value.trim();
    } else {
      target[f.key] = el.value.trim();
    }
  }

  /* ===================== 弹窗开关 ===================== */
  function showModal() {
    els.editor.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeEditor() {
    els.editor.hidden = true;
    els.editorForm.classList.remove("dialog-pwd");
    els.editorForm.onsubmit = null;
    // 若有正在进行的文件上传等，无状态可清；仅恢复滚动
    if (!document.getElementById("qrModal") || document.getElementById("qrModal").hidden) {
      document.body.style.overflow = "";
    }
  }
  function bindEditor() {
    els.editor.addEventListener("click", function (e) {
      if (e.target.closest("[data-close-editor]")) closeEditor();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !els.editor.hidden) closeEditor();
    });
  }

  /* ===================== 监听渲染完成 → 重新注入控件 ===================== */
  window.addEventListener("rb:rendered", function () {
    if (RB.isLoggedIn()) {
      // 延迟一帧，确保 DOM 就绪
      requestAnimationFrame(injectAdminControls);
    }
  });
})(window.RB);

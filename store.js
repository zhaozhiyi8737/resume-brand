/* ===== store.js — 数据存储层 =====
 * 职责：
 *   1) localStorage 持久化（数据 + 管理密码哈希 + 登录态）
 *   2) 与默认数据合并，保证向后兼容（缺字段补默认值）
 *   3) JSON 导入 / 导出（导出整包用于重新部署）
 *   4) 简易密码哈希（SHA-256，浏览器原生 crypto.subtle；纯前端鉴权，非高安全场景）
 */
window.RB = window.RB || {};

(function (RB) {
  "use strict";

  var DATA_KEY = "rb:data:v1";
  var PWD_KEY = "rb:pwd";        // 存哈希
  var AUTH_KEY = "rb:auth";      // 本次会话登录态（sessionStorage，关页即失效，更安全）
  var DEFAULT_PWD = "admin123";

  /* ---------- 密码哈希（SHA-256 → hex）---------- */
  function sha256(str) {
    if (window.crypto && crypto.subtle) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
        .then(function (buf) {
          return Array.prototype.map.call(new Uint8Array(buf), function (b) {
            return ("0" + b.toString(16)).slice(-2);
          }).join("");
        });
    }
    // 降级：极简 hash（不支持 subtle 的旧环境，少见）
    return Promise.resolve(simpleHash(str));
  }
  function simpleHash(s) {
    var h = 5381, i = s.length;
    while (i) h = (h * 33) ^ s.charCodeAt(--i);
    return ("0000000000000000" + (h >>> 0).toString(16)).slice(-16);
  }

  /* ---------- 密码管理 ---------- */
  function getPwdHash() {
    return localStorage.getItem(PWD_KEY) || null;
  }
  // 首次使用：若未设过密码，写入默认密码哈希
  function ensurePwd() {
    if (!getPwdHash()) {
      sha256(DEFAULT_PWD).then(function (h) {
        localStorage.setItem(PWD_KEY, h);
      });
    }
  }
  RB.verifyPassword = function (input) {
    return sha256(input).then(function (h) {
      return h === getPwdHash();
    });
  };
  RB.setPassword = function (newPwd) {
    return sha256(newPwd).then(function (h) {
      localStorage.setItem(PWD_KEY, h);
    });
  };

  /* ---------- 登录态（本次会话）---------- */
  RB.login = function () { sessionStorage.setItem(AUTH_KEY, "1"); };
  RB.logout = function () { sessionStorage.removeItem(AUTH_KEY); };
  RB.isLoggedIn = function () { return sessionStorage.getItem(AUTH_KEY) === "1"; };

  /* ---------- 数据读写（带向后兼容合并）---------- */
  // 深合并：以 defaults 为骨架，把 stored 的值覆盖上去
  function deepMerge(defaults, stored) {
    if (stored == null) return defaults;
    if (typeof defaults !== "object" || Array.isArray(defaults)) {
      return stored === undefined ? defaults : stored;
    }
    if (Array.isArray(defaults)) {
      // 数组：以 stored 为准（长度可变），但用 default 首项的结构作骨架补默认字段
      // —— 保证旧数据导入后，新增的 schema 字段也有默认值。
      var src = Array.isArray(stored) ? stored : defaults;
      var skeleton = defaults[0];
      return src.map(function (item) {
        if (item && typeof item === "object" && !Array.isArray(item) && skeleton && typeof skeleton === "object") {
          return deepMerge(skeleton, item);
        }
        return item;
      });
    }
    var out = {};
    var keys = Object.keys(defaults);
    keys.forEach(function (k) {
      out[k] = deepMerge(defaults[k], stored[k]);
    });
    // 补上 stored 里多出的键
    Object.keys(stored).forEach(function (k) {
      if (!(k in out)) out[k] = stored[k];
    });
    return out;
  }

  RB.getData = function () {
    try {
      var raw = localStorage.getItem(DATA_KEY);
      if (!raw) return JSON.parse(JSON.stringify(RB.DEFAULT_DATA));
      var stored = JSON.parse(raw);
      return deepMerge(RB.DEFAULT_DATA, stored);
    } catch (e) {
      console.warn("[store] 数据解析失败，回退默认数据", e);
      return JSON.parse(JSON.stringify(RB.DEFAULT_DATA));
    }
  };

  RB.setData = function (data) {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      // 通常是 localStorage 配额超限（图片 base64 过大）
      console.error("[store] 保存失败", e);
      RB.toast && RB.toast("保存失败：本地存储空间不足（图片过大？）", "error");
      return false;
    }
  };

  // 保存并通知（render.js 会监听这个事件刷新页面）
  RB.save = function (data) {
    if (RB.setData(data)) {
      window.dispatchEvent(new CustomEvent("rb:datachange", { detail: data }));
      return true;
    }
    return false;
  };

  // 局部更新某个模块（object 类整体替换，list 类整体替换数组）
  RB.updateModule = function (moduleKey, value) {
    var data = RB.getData();
    data[moduleKey] = value;
    return RB.save(data);
  };

  RB.resetData = function () {
    localStorage.removeItem(DATA_KEY);
    window.dispatchEvent(new CustomEvent("rb:datachange", { detail: RB.DEFAULT_DATA }));
  };

  /* ---------- JSON 导入 / 导出 ---------- */
  RB.exportJSON = function () {
    var data = RB.getData();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "resume-data-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };

  // 解析导入的 JSON 文件 → 合并默认结构后返回；非法则抛错
  RB.parseImport = function (file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(reader.result);
          var merged = deepMerge(RB.DEFAULT_DATA, parsed);
          resolve(merged);
        } catch (e) {
          reject(new Error("JSON 格式错误：" + e.message));
        }
      };
      reader.onerror = function () { reject(new Error("文件读取失败")); };
      reader.readAsText(file);
    });
  };

  // 初始化
  ensurePwd();
})(window.RB);

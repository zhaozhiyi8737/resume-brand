/* ===== data.js — 数据 schema 定义 + 默认种子数据 =====
 * 全局命名空间 window.RB（Resume Brand）。
 * SCHEMA 描述每个模块的字段（供后台动态生成表单用）：
 *   { key, label, type, placeholder?, multiline?, rich?, array?(子项为标签数组) }
 *   type: 'text' | 'long'(textarea) | 'rich'(富文本) | 'date'(YYYY-MM) | 'list'(逗号分隔→数组)
 *
 * 模块分两类：
 *   - object 类（profile / selfEval）：单条对象
 *   - list 类（其余 6 个）：记录数组，可增删改排序
 */
window.RB = window.RB || {};

(function (RB) {
  "use strict";

  // ---- 字段 schema（后台表单按此渲染）----
  RB.SCHEMA = {
    profile: {
      type: "object",
      fields: [
        { key: "name", label: "姓名", type: "text", placeholder: "你的名字" },
        { key: "avatar", label: "头像（图片 URL 或上传）", type: "image", placeholder: "https://... 或点击上传" },
        { key: "title", label: "职位 / 标签语", type: "text", placeholder: "如：全栈设计工程师" },
        { key: "tags", label: "技能标签（逗号分隔）", type: "list", placeholder: "UI/UX, 前端, 动效" },
        { key: "bio", label: "个人简介", type: "long", placeholder: "一段话介绍你自己" },
        {
          key: "contact", label: "联系方式", type: "group", fields: [
            { key: "phone", label: "电话", type: "text" },
            { key: "email", label: "邮箱", type: "text" },
            { key: "wechat", label: "微信", type: "text" },
            {
              key: "socials", label: "社交链接", type: "socials",
              hint: "每行一条，格式：名称|链接"
            },
          ]
        },
      ]
    },
    education: {
      type: "list",
      labelSingular: "教育经历",
      fields: [
        { key: "school", label: "学校名称", type: "text" },
        { key: "major", label: "专业", type: "text" },
        { key: "degree", label: "学历", type: "text" },
        { key: "start", label: "开始时间", type: "date" },
        { key: "end", label: "结束时间", type: "date" },
        { key: "honors", label: "荣誉奖项", type: "long" },
        { key: "courses", label: "课程描述", type: "long" },
      ]
    },
    internships: {
      type: "list",
      labelSingular: "实习经历",
      fields: [
        { key: "company", label: "公司名称", type: "text" },
        { key: "position", label: "职位", type: "text" },
        { key: "start", label: "开始时间", type: "date" },
        { key: "end", label: "结束时间", type: "date" },
        { key: "description", label: "工作内容描述", type: "rich" },
      ]
    },
    work: {
      type: "list",
      labelSingular: "工作经历",
      fields: [
        { key: "company", label: "公司名称", type: "text" },
        { key: "position", label: "职位", type: "text" },
        { key: "start", label: "开始时间", type: "date" },
        { key: "end", label: "结束时间", type: "date" },
        { key: "description", label: "工作内容描述", type: "rich" },
      ]
    },
    projects: {
      type: "list",
      labelSingular: "项目经历",
      fields: [
        { key: "name", label: "项目名称", type: "text" },
        { key: "role", label: "角色", type: "text" },
        { key: "start", label: "开始时间", type: "date" },
        { key: "end", label: "结束时间", type: "date" },
        { key: "description", label: "项目描述", type: "rich" },
        { key: "tech", label: "技术栈 / 工具（逗号分隔）", type: "list" },
        { key: "link", label: "项目链接", type: "text" },
      ]
    },
    research: {
      type: "list",
      labelSingular: "科研经历",
      fields: [
        { key: "name", label: "项目名称", type: "text" },
        { key: "role", label: "角色", type: "text" },
        { key: "start", label: "开始时间", type: "date" },
        { key: "end", label: "结束时间", type: "date" },
        { key: "content", label: "研究内容", type: "rich" },
        { key: "paperLink", label: "成果 / 论文链接", type: "text" },
      ]
    },
    honors: {
      type: "list",
      labelSingular: "荣誉记录",
      fields: [
        { key: "name", label: "荣誉名称", type: "text" },
        { key: "org", label: "颁发机构", type: "text" },
        { key: "date", label: "获奖时间", type: "text" },
      ]
    },
    selfEval: {
      type: "rich",   // 顶层就是一段富文本
      label: "自我评价"
    }
  };

  // 模块顺序（导航 / 渲染顺序）
  RB.MODULE_ORDER = ["profile", "education", "internships", "work", "projects", "research", "honors", "selfEval"];

  // ---- 默认种子数据（与 data/sample.json 一致，内联避免首屏网络请求）----
  RB.DEFAULT_DATA = {
    version: 1,
    profile: {
      name: "林知夏",
      avatar: "",
      title: "全栈设计工程师 / 创意开发者",
      tags: ["UI/UX 设计", "前端开发", "动效", "品牌视觉"],
      bio: "相信好设计是技术与人文的交汇。5 年数字产品设计与全栈开发经验，专注于把抽象想法打磨成有温度的交互体验。",
      contact: {
        phone: "+86 138-0000-0000",
        email: "hello@example.com",
        wechat: "lin_design",
        socials: [
          { name: "GitHub", url: "https://github.com/" },
          { name: "站酷", url: "https://www.zcool.com.cn/" },
          { name: "个人站点", url: "https://example.com/" }
        ]
      }
    },
    education: [
      { school: "中央美术学院", major: "数字媒体艺术", degree: "硕士", start: "2020-09", end: "2023-06", honors: "优秀毕业生、毕业设计一等奖", courses: "交互设计研究、生成艺术、用户体验心理学、创意编程" },
      { school: "江南大学", major: "视觉传达设计", degree: "学士", start: "2016-09", end: "2020-06", honors: "国家奖学金（2018）", courses: "字体设计、品牌系统、信息可视化、动态图形" }
    ],
    internships: [
      { company: "字节跳动 · 设计中心", position: "交互设计实习生", start: "2021-06", end: "2021-09", description: "<p>参与某社交产品 0→1 的交互流程设计，产出 40+ 页面原型；推动设计规范组件化，团队复用效率提升 30%。</p>" }
    ],
    work: [
      { company: "某创意科技工作室", position: "设计工程师", start: "2023-07", end: "至今", description: "<p>主导 6 个品牌网站从设计到落地的全流程；建立团队的动效设计语言与组件库。</p><ul><li>客户官网平均停留时长提升 45%</li><li>搭建可复用的 WebGL 交互组件，缩短开发周期 50%</li></ul>" }
    ],
    projects: [
      { name: "Aurora 数据可视化平台", role: "设计 + 前端负责人", start: "2023-09", end: "2024-03", description: "<p>面向城市治理的多维数据可视化产品，支持千万级数据点实时渲染与叙事式图表。</p>", tech: ["React", "D3.js", "WebGL", "Figma"], link: "https://example.com/aurora" },
      { name: "Lumen 品牌官网", role: "独立设计与开发", start: "2023-05", end: "2023-08", description: "<p>独立设计并开发的一个新锐消费品牌的官网，强调品牌故事与沉浸式滚动叙事。</p>", tech: ["Vue", "GSAP", "Three.js"], link: "https://example.com/lumen" }
    ],
    research: [
      { name: "生成式艺术中的参数化字体研究", role: "主要研究者", start: "2022-03", end: "2023-01", content: "<p>探索用算法生成中文字体骨架的可行性，提出一种基于贝塞尔曲线的参数化建模方法。</p>", paperLink: "https://example.com/paper.pdf" }
    ],
    honors: [
      { name: "红点设计奖 · 品牌", org: "Red Dot", date: "2023" },
      { name: "Awwwards Site of the Day", org: "Awwwards", date: "2023" },
      { name: "全国大学生广告艺术大赛 金奖", org: "教育部高教司", date: "2019" }
    ],
    selfEval: "<p>我是一名<strong>设计与工程双修</strong>的创作者。既能用 Figma 打磨像素级的细节，也能用代码把交互真正跑起来。我相信：</p><ul><li>好的体验来自对真实用户的同理心</li><li>技术应该服务于表达，而非炫技</li><li>持续的微小打磨，胜过一次性的大动作</li></ul><blockquote>把热爱做成职业，再把职业做回热爱。</blockquote>"
  };

  // 为某 list 模块生成一条空记录（新增时用）
  RB.emptyRecord = function (moduleKey) {
    var schema = RB.SCHEMA[moduleKey];
    if (!schema || schema.type !== "list") return {};
    var rec = {};
    schema.fields.forEach(function (f) {
      rec[f.key] = f.type === "list" ? [] : (f.type === "rich" ? "" : "");
    });
    return rec;
  };
})(window.RB);

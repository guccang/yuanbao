"use strict";

// ---- 数学课程模块 ----
// 面向 3-6 岁宝宝，依据螺旋式课程理念设计：数感→比较→规律→运算，逐日循环递进。
// 年龄越大，数字范围越大、题目越抽象。新增活动 6-7，包含简单应用题和混合比较。

var MATH_THEMES = [
  { name: "果园数一数", emoji: "🍎", items: ["🍎", "🍐", "🍊", "🍓"] },
  { name: "海洋小队",   emoji: "🐠", items: ["🐠", "🐟", "🐙", "🦀"] },
  { name: "太空探险",   emoji: "🚀", items: ["⭐", "🌙", "🪐", "🚀"] },
  { name: "动物派对",   emoji: "🐰", items: ["🐰", "🐼", "🐻", "🦊"] },
  { name: "花园朋友",   emoji: "🌻", items: ["🌻", "🌷", "🌸", "🦋"] },
  { name: "汽车工厂",   emoji: "🚗", items: ["🚗", "🚌", "🚕", "🚙"] },
  { name: "甜点小屋",   emoji: "🧁", items: ["🧁", "🍪", "🍩", "🍰"] },
  { name: "积木王国",   emoji: "🧱", items: ["🟥", "🟦", "🟨", "🟩"] },
  { name: "恐龙世界",   emoji: "🦕", items: ["🦕", "🦖", "🐊", "🐢"] },
  { name: "天气乐园",   emoji: "🌈", items: ["☀️", "🌧️", "🌈", "⛄"] }
];

function numberOptions(answer, max, random) {
  var values = [answer];
  while (values.length < 4) {
    var n = 1 + Math.floor(random() * max);
    if (values.indexOf(n) === -1) values.push(n);
  }
  return window.SubjectUtils.shuffle(values, random);
}

function generateLesson(day, age) {
  var random = window.SubjectUtils.seeded(day * 7919 + age * 101);
  var theme = MATH_THEMES[(day - 1) % MATH_THEMES.length];
  var maxNumber = age === 3 ? 5 : age === 4 ? 8 : age === 5 ? 12 : 20;
  var item = theme.items[day % theme.items.length];

  var count = 1 + Math.floor(random() * Math.min(maxNumber, 10));
  var other = 1 + Math.floor(random() * Math.min(maxNumber, 10));
  var larger = Math.max(count, other === count ? Math.min(10, other + 1) : other);
  var smaller = count === larger ? Math.max(1, count - 1) : count;
  var seqStart = 1 + Math.floor(random() * Math.max(2, maxNumber - 3));
  var addA = 1 + Math.floor(random() * Math.min(5, maxNumber));
  var addB = 1 + Math.floor(random() * Math.min(4, maxNumber));
  var sum = addA + addB;

  var SHAPES = ["🟡 圆形", "🟦 正方形", "🔺 三角形", "🔷 菱形", "⭐ 五角星"];
  var shape = SHAPES[day % SHAPES.length];

  var activities = [
    // 活动 1：数一数
    {
      title: "数一数，有几个？",
      hint: "用小手指着，一个一个慢慢数",
      visual: repeatStr(item, count),
      answer: String(count),
      options: numberOptions(count, Math.max(5, Math.min(maxNumber, 10)), random)
    },
    // 活动 2：比多少
    {
      title: "哪一边更多？",
      hint: "看看两组小伙伴，选出数量更多的一组",
      visual: repeatStr(theme.emoji, smaller) + "  ·  " + repeatStr(theme.emoji, larger),
      answer: String(larger),
      options: window.SubjectUtils.shuffle([smaller, larger], random)
    },
    // 活动 3：数字规律
    {
      title: age <= 4 ? "下一个数字是什么？" : "找出数字规律",
      hint: "顺着数字往后数一数",
      visual: String(seqStart) + "  →  " + String(seqStart + 1) + "  →  ?",
      answer: String(seqStart + 2),
      options: numberOptions(seqStart + 2, Math.max(6, maxNumber), random)
    },
    // 活动 4：加法或形状
    age >= 5 ? {
      title: String(addA) + " + " + String(addB) + " 等于几？",
      hint: "数一数：" + repeatStr(theme.emoji, addA) + " 加上 " + repeatStr(theme.emoji, addB),
      visual: repeatStr(theme.emoji, addA) + "  +  " + repeatStr(theme.emoji, addB),
      answer: String(sum),
      options: numberOptions(sum, Math.max(6, maxNumber + 3), random)
    } : {
      title: "这是什么形状？",
      hint: "看一看，说出它的名字",
      visual: shape.split(" ")[0],
      answer: shape,
      options: window.SubjectUtils.shuffle(SHAPES, random)
    },
    // 活动 5：综合挑战
    {
      title: age >= 5 ? "哪一组少？" : "最后一个数字是几？",
      hint: age >= 5 ? "仔细观察两组数量" : "从 1 开始数",
      visual: age >= 5
        ? repeatStr(theme.emoji, Math.max(1, count - 1)) + "  ·  " + repeatStr(theme.emoji, count)
        : "1  →  2  →  3  →  ?",
      answer: age >= 5 ? String(Math.max(1, count - 1)) : "4",
      options: age >= 5
        ? numberOptions(Math.max(1, count - 1), Math.max(5, Math.min(maxNumber, 10)), random)
        : numberOptions(4, 6, random)
    },
    // 活动 6（5-6 岁）：简单应用题
    age >= 5 ? {
      title: "想一想",
      hint: "把故事变成算式",
      visual: repeatStr(theme.emoji, addA) + " + " + repeatStr(theme.emoji, addB) + " = ?",
      answer: String(sum),
      options: numberOptions(sum, Math.max(6, maxNumber + 3), random)
    } : null,
    // 活动 7（5-6 岁）：混合比较
    age >= 5 ? {
      title: "哪个数字更大？",
      hint: "比一比两个数字的大小",
      visual: String(addA) + "  vs  " + String(sum),
      answer: String(sum),
      options: window.SubjectUtils.shuffle([addA, sum], random)
    } : null
  ].filter(function(a) { return a !== null; });

  return {
    subject: "math",
    day: day,
    age: age,
    theme: theme,
    title: theme.name,
    subtitle: theme.emoji + " 数感训练 · " + age + " 岁阶段",
    activities: activities
  };
}

function repeatStr(s, n) {
  var r = "";
  for (var i = 0; i < n; i++) r += s;
  return r;
}

// 同时支持 ES 模块和全局变量
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MATH_THEMES: MATH_THEMES, generateLesson: generateLesson };
}
if (typeof window !== "undefined") {
  window.MathModule = { MATH_THEMES: MATH_THEMES, generateLesson: generateLesson };
}
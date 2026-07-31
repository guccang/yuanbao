"use strict";

// ---- 数学课程模块 ----
// 面向 3–6 岁宝宝，依据螺旋式课程理念设计：数感→比较→规律→运算，逐日循环递进。
// 年龄越大，数字范围越大、题目越抽象。

const MATH_THEMES = [
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

// 简单的伪随机数生成器（确定性，同一 day+age 产生相同课程）
function seeded(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => (value = value * 16807 % 2147483647) / 2147483647;
}

function shuffle(list, random) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function numberOptions(answer, max, random) {
  const values = new Set([answer]);
  while (values.size < 4) values.add(1 + Math.floor(random() * max));
  return shuffle([...values], random);
}

/**
 * 根据学习天数与年龄生成一节数学课（5 个活动）
 * @param {number} day - 学习天数（从 1 开始）
 * @param {number} age - 宝宝年龄（3–6）
 * @returns {object} lesson
 */
function generateLesson(day, age) {
  const random = seeded(day * 7919 + age * 101);
  const theme = MATH_THEMES[(day - 1) % MATH_THEMES.length];
  const maxNumber = age === 3 ? 5 : age === 4 ? 8 : age === 5 ? 12 : 20;
  const item = theme.items[day % theme.items.length];

  // 活动 1：数数
  const count = 1 + Math.floor(random() * Math.min(maxNumber, 10));

  // 活动 2：比多少
  const other = 1 + Math.floor(random() * Math.min(maxNumber, 10));
  const larger = Math.max(count, other === count ? Math.min(10, other + 1) : other);
  const smaller = count === larger ? Math.max(1, count - 1) : count;

  // 活动 3：数字规律
  const seqStart = 1 + Math.floor(random() * Math.max(2, maxNumber - 3));

  // 活动 4：简单加法（5–6 岁）或形状识别（3–4 岁）
  const addA = 1 + Math.floor(random() * Math.min(5, maxNumber));
  const addB = 1 + Math.floor(random() * Math.min(4, maxNumber));
  const sum = addA + addB;

  const SHAPES = ["🟡 圆形", "🟦 正方形", "🔺 三角形", "🔷 菱形", "⭐ 五角星"];
  const shape = SHAPES[day % SHAPES.length];

  const activities = [
    // 活动 1：数一数
    {
      title: "数一数，有几个？",
      hint: "用小手指着，一个一个慢慢数",
      visual: item.repeat(count),
      answer: String(count),
      options: numberOptions(count, Math.max(5, Math.min(maxNumber, 10)), random)
    },
    // 活动 2：比多少
    {
      title: "哪一边更多？",
      hint: "看看两组小伙伴，选出数量更多的一组",
      visual: `${theme.emoji.repeat(smaller)}  ·  ${theme.emoji.repeat(larger)}`,
      answer: String(larger),
      options: shuffle([smaller, larger], random)
    },
    // 活动 3：数字规律
    {
      title: age <= 4 ? "下一个数字是什么？" : "找出数字规律",
      hint: "顺着数字往后数一数",
      visual: `${seqStart}  →  ${seqStart + 1}  →  ?`,
      answer: String(seqStart + 2),
      options: numberOptions(seqStart + 2, Math.max(6, maxNumber), random)
    },
    // 活动 4：加法或形状
    age >= 5 ? {
      title: `${addA} + ${addB} 等于几？`,
      hint: `数一数：${theme.emoji.repeat(addA)} 加上 ${theme.emoji.repeat(addB)}`,
      visual: `${theme.emoji.repeat(addA)}  +  ${theme.emoji.repeat(addB)}`,
      answer: String(sum),
      options: numberOptions(sum, Math.max(6, maxNumber + 3), random)
    } : {
      title: `这是什么形状？`,
      hint: "看一看，说出它的名字",
      visual: shape.split(" ")[0],
      answer: shape,
      options: shuffle(SHAPES, random)
    },
    // 活动 5：综合挑战
    {
      title: age >= 5 ? "哪一组少？" : "最后一个数字是几？",
      hint: age >= 5 ? "仔细观察两组数量" : "从 1 开始数",
      visual: age >= 5
        ? `${theme.emoji.repeat(Math.max(1, count - 1))}  ·  ${theme.emoji.repeat(count)}`
        : `1  →  2  →  3  →  ?`,
      answer: age >= 5 ? String(Math.max(1, count - 1)) : "4",
      options: age >= 5
        ? numberOptions(Math.max(1, count - 1), Math.max(5, Math.min(maxNumber, 10)), random)
        : numberOptions(4, 6, random)
    }
  ];

  return {
    subject: "math",
    day,
    age,
    theme,
    title: `${theme.name}`,
    subtitle: `${theme.emoji} 数感训练 · ${age} 岁阶段`,
    activities
  };
}

// 同时支持 ES 模块和全局变量
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MATH_THEMES, generateLesson };
}
if (typeof window !== "undefined") {
  window.MathModule = { MATH_THEMES, generateLesson };
}
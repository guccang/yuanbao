"use strict";

// ---- 英语启蒙课程模块 ----
// 面向 3–6 岁宝宝，以主题词汇为核心，围绕"听→认→读→用"四步递进。
// 每天学习一个核心单词，通过 5 个活动从不同角度巩固。
// 词汇按主题分组，遵循幼儿认知发展：食物→动物→颜色→自然→交通→数字→身体→家庭→衣物→天气。

const WORDS = [
  // 食物
  { en: "apple",   cn: "苹果",   emoji: "🍎",  group: "食物" },
  { en: "banana",  cn: "香蕉",   emoji: "🍌",  group: "食物" },
  { en: "milk",    cn: "牛奶",   emoji: "🥛",  group: "食物" },
  { en: "cake",    cn: "蛋糕",   emoji: "🍰",  group: "食物" },
  { en: "bread",   cn: "面包",   emoji: "🍞",  group: "食物" },
  { en: "egg",     cn: "鸡蛋",   emoji: "🥚",  group: "食物" },
  { en: "water",   cn: "水",     emoji: "💧",  group: "食物" },
  { en: "rice",    cn: "米饭",   emoji: "🍚",  group: "食物" },
  // 动物
  { en: "cat",     cn: "小猫",   emoji: "🐱",  group: "动物" },
  { en: "dog",     cn: "小狗",   emoji: "🐶",  group: "动物" },
  { en: "rabbit",  cn: "兔子",   emoji: "🐰",  group: "动物" },
  { en: "fish",    cn: "小鱼",   emoji: "🐟",  group: "动物" },
  { en: "bird",    cn: "小鸟",   emoji: "🐦",  group: "动物" },
  { en: "bear",    cn: "小熊",   emoji: "🐻",  group: "动物" },
  { en: "pig",     cn: "小猪",   emoji: "🐷",  group: "动物" },
  { en: "duck",    cn: "小鸭",   emoji: "🦆",  group: "动物" },
  { en: "frog",    cn: "青蛙",   emoji: "🐸",  group: "动物" },
  { en: "lion",    cn: "狮子",   emoji: "🦁",  group: "动物" },
  { en: "monkey",  cn: "猴子",   emoji: "🐵",  group: "动物" },
  { en: "elephant",cn: "大象",   emoji: "🐘",  group: "动物" },
  // 颜色
  { en: "red",     cn: "红色",   emoji: "🔴",  group: "颜色" },
  { en: "blue",    cn: "蓝色",   emoji: "🔵",  group: "颜色" },
  { en: "yellow",  cn: "黄色",   emoji: "🟡",  group: "颜色" },
  { en: "green",   cn: "绿色",   emoji: "🟢",  group: "颜色" },
  { en: "white",   cn: "白色",   emoji: "⚪",  group: "颜色" },
  { en: "black",   cn: "黑色",   emoji: "⚫",  group: "颜色" },
  { en: "pink",    cn: "粉色",   emoji: "🩷",  group: "颜色" },
  { en: "purple",  cn: "紫色",   emoji: "🟣",  group: "颜色" },
  // 自然
  { en: "sun",     cn: "太阳",   emoji: "☀️",  group: "自然" },
  { en: "moon",    cn: "月亮",   emoji: "🌙",  group: "自然" },
  { en: "star",    cn: "星星",   emoji: "⭐",  group: "自然" },
  { en: "flower",  cn: "花朵",   emoji: "🌸",  group: "自然" },
  { en: "tree",    cn: "大树",   emoji: "🌳",  group: "自然" },
  { en: "rain",    cn: "下雨",   emoji: "🌧️",  group: "自然" },
  { en: "snow",    cn: "下雪",   emoji: "❄️",  group: "自然" },
  { en: "cloud",   cn: "云朵",   emoji: "☁️",  group: "自然" },
  // 交通
  { en: "car",     cn: "汽车",   emoji: "🚗",  group: "交通" },
  { en: "bus",     cn: "公交车", emoji: "🚌",  group: "交通" },
  { en: "train",   cn: "火车",   emoji: "🚂",  group: "交通" },
  { en: "boat",    cn: "小船",   emoji: "⛵",  group: "交通" },
  { en: "plane",   cn: "飞机",   emoji: "✈️",  group: "交通" },
  { en: "bike",    cn: "自行车", emoji: "🚲",  group: "交通" },
  // 数字
  { en: "one",     cn: "一",     emoji: "1️⃣",  group: "数字" },
  { en: "two",     cn: "二",     emoji: "2️⃣",  group: "数字" },
  { en: "three",   cn: "三",     emoji: "3️⃣",  group: "数字" },
  { en: "four",    cn: "四",     emoji: "4️⃣",  group: "数字" },
  { en: "five",    cn: "五",     emoji: "5️⃣",  group: "数字" },
  // 身体
  { en: "eye",     cn: "眼睛",   emoji: "👁️",  group: "身体" },
  { en: "ear",     cn: "耳朵",   emoji: "👂",  group: "身体" },
  { en: "nose",    cn: "鼻子",   emoji: "👃",  group: "身体" },
  { en: "mouth",   cn: "嘴巴",   emoji: "👄",  group: "身体" },
  { en: "hand",    cn: "手",     emoji: "✋",  group: "身体" },
  { en: "foot",    cn: "脚",     emoji: "🦶",  group: "身体" },
  // 家庭
  { en: "mom",     cn: "妈妈",   emoji: "👩",  group: "家庭" },
  { en: "dad",     cn: "爸爸",   emoji: "👨",  group: "家庭" },
  { en: "baby",    cn: "宝宝",   emoji: "👶",  group: "家庭" },
  { en: "home",    cn: "家",     emoji: "🏠",  group: "家庭" },
  // 衣物
  { en: "hat",     cn: "帽子",   emoji: "🧢",  group: "衣物" },
  { en: "shoe",    cn: "鞋子",   emoji: "👟",  group: "衣物" },
  { en: "sock",    cn: "袜子",   emoji: "🧦",  group: "衣物" },
  { en: "shirt",   cn: "衬衫",   emoji: "👕",  group: "衣物" },
  // 天气
  { en: "hot",     cn: "热的",   emoji: "🥵",  group: "天气" },
  { en: "cold",    cn: "冷的",   emoji: "🥶",  group: "天气" },
  { en: "windy",   cn: "有风的", emoji: "💨",  group: "天气" },
  { en: "sunny",   cn: "晴天的", emoji: "☀️",  group: "天气" },
  // 新增 形状
  { en: "circle",  cn: "圆形",   emoji: "⭕",  group: "形状" },
  { en: "square",  cn: "正方形", emoji: "🟦",  group: "形状" },
  { en: "triangle",cn: "三角形", emoji: "🔺",  group: "形状" },
  { en: "star",    cn: "星星",   emoji: "⭐",  group: "形状" },
  // 新增 动作
  { en: "jump",    cn: "跳",     emoji: "🤸",  group: "动作" },
  { en: "run",     cn: "跑",     emoji: "🏃",  group: "动作" },
  { en: "swim",    cn: "游泳",   emoji: "🏊",  group: "动作" },
  { en: "sleep",   cn: "睡觉",   emoji: "😴",  group: "动作" },
  { en: "eat",     cn: "吃",     emoji: "🍽️",  group: "动作" },
  { en: "drink",   cn: "喝",     emoji: "🥤",  group: "动作" },
  // 新增 玩具
  { en: "ball",    cn: "球",     emoji: "⚽",  group: "玩具" },
  { en: "doll",    cn: "娃娃",   emoji: "🪆",  group: "玩具" },
  { en: "block",   cn: "积木",   emoji: "🧱",  group: "玩具" },
  { en: "book",    cn: "书",     emoji: "📖",  group: "玩具" },
  { en: "puzzle",  cn: "拼图",   emoji: "🧩",  group: "玩具" }
];

/**
 * 生成一节英语课
 * 生成一节英语课（5 个活动）
 * @param {number} day - 学习天数（从 1 开始）
 * @param {number} age - 宝宝年龄（3–6）
 * @returns {object} lesson
 */
function generateLesson(day, age) {
  const random = window.SubjectUtils.seeded(day * 3719 + age * 331);
  const word = WORDS[(day - 1) % WORDS.length];
  const distractors = window.SubjectUtils.shuffle(WORDS.filter(w => w.en !== word.en), random).slice(0, 4);
  const wordOptions = window.SubjectUtils.shuffle([word, ...distractors.slice(0, 3)], random);

  const activities = [
    // 活动 1：新单词介绍
    {
      title: `今天的新单词：${word.en}`,
      hint: "点小喇叭听一听，跟着读出来",
      visual: word.emoji,
      word,
      answer: "true",
      options: ["✓ 知道了", "再听一遍"],
      learn: true
    },
    // 活动 2：听音识图
    {
      title: `哪个是 ${word.en}？`,
      hint: "听一听，选出对应的图片",
      visual: "🔊",
      word,
      answer: word.en,
      options: wordOptions.map(w => w.en),
      pictureOptions: wordOptions
    },
    // 活动 3：中译英
    {
      title: `${word.cn} 用英语怎么说？`,
      hint: "选出今天学的新单词",
      visual: word.emoji,
      word,
      answer: word.en,
      options: window.SubjectUtils.shuffle([word.en, ...distractors.slice(0, 3).map(w => w.en)], random)
    },
    // 活动 4：看词选图
    {
      title: age >= 5 ? `"${word.en}" 对应哪个？` : `"${word.en}" 是哪个？`,
      hint: "看看单词，选出正确的图片",
      visual: word.en,
      word,
      answer: word.en,
      options: wordOptions.map(w => w.en),
      pictureOptions: wordOptions
    },
    // 活动 5：复习
    {
      title: `"${word.en}" 是什么意思？`,
      hint: "想想今天学的内容",
      visual: word.emoji,
      word,
      answer: word.cn,
      options: window.SubjectUtils.shuffle([word.cn, ...distractors.slice(0, 3).map(w => w.cn)], random)
    }
  ];

  return {
    subject: "english",
    day,
    age,
    word,
    title: `${word.en} · ${word.cn}`,
    subtitle: `${word.emoji} ${word.group}单词 · ${age} 岁阶段`,
    activities
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { WORDS, generateLesson };
}
if (typeof window !== "undefined") {
  window.EnglishModule = { WORDS, generateLesson };
}
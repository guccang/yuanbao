"use strict";

// ---- 工具函数 ----

function seeded(seed) {
  var value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return function() { return (value = value * 16807 % 2147483647) / 2147483647; };
}

function shuffle(list, random) {
  var result = list.slice();
  for (var i = result.length - 1; i > 0; i--) {
    var j = Math.floor(random() * (i + 1));
    var tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

if (typeof window !== "undefined") {
  window.SubjectUtils = { seeded: seeded, shuffle: shuffle };
}
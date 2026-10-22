"use strict";

const storageKey = "goodnight-forest.sleep.v1";
const $ = selector => document.querySelector(selector);
const form = $("#sleep-form");
const bedtime = $("#bedtime");
const wakeTime = $("#wake-time");
const list = $("#record-list");
const storageStatus = $("#storage-status");
const hour = 3600000;
let records = [];

function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function localInput(date) {
  return `${localDate(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
function durationText(hours) {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`;
}
function getHours(record) {
  return (new Date(record.wake) - new Date(record.bed)) / hour;
}
function validRecord(record) {
  return record && typeof record.id === "string" && typeof record.bed === "string" &&
    typeof record.wake === "string" && Number.isFinite(new Date(record.bed).getTime()) &&
    Number.isFinite(new Date(record.wake).getTime()) && getHours(record) > 0 && getHours(record) <= 24 &&
    ["很好", "一般", "很差"].includes(record.quality) && typeof record.note === "string";
}
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
  if (!Array.isArray(saved)) throw new Error("Invalid records");
  records = saved.filter(validRecord);
  if (records.length !== saved.length) storageStatus.textContent = "部分本地记录格式异常，已跳过显示。";
} catch {
  storageStatus.textContent = "无法读取本地记录。你仍可记录睡眠，但请留意保存提示。";
}
function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(records));
    storageStatus.textContent = "";
  } catch {
    storageStatus.textContent = "浏览器未能保存记录，刷新后本次更改可能丢失。请检查存储空间或浏览器设置。";
  }
}
function evaluation(hours) {
  if (hours < 6) return { title: "睡得有点少，今晚早点休息吧", tip: "给自己多留一点睡眠时间，睡前放下屏幕，试试温水和轻柔的呼吸。" };
  if (hours < 7) return { title: "再多睡一点，能量会更充足", tip: "试着把入睡时间提前半小时，保持规律的起床时间，慢慢找回自己的节奏。" };
  if (hours <= 9) return { title: "睡眠时长刚刚好，继续温柔地坚持", tip: "多数成年人适合每晚 7–9 小时睡眠。保持规律作息，白天晒晒太阳、适度活动。" };
  return { title: "这一觉有点长，留意身体的感受", tip: "偶尔多睡一点很正常。若长期睡很久仍疲倦，或持续睡不好，可以咨询专业人士。" };
}
function preview() {
  const hours = (new Date(wakeTime.value) - new Date(bedtime.value)) / hour;
  $("#duration").textContent = Number.isFinite(hours) && hours > 0 && hours <= 24 ? durationText(hours) : "等待有效时间";
  $("#form-error").textContent = "";
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function renderRecords() {
  list.replaceChildren();
  const sorted = [...records].sort((a, b) => new Date(b.wake) - new Date(a.wake));
  sorted.forEach((record, index) => {
    const wake = new Date(record.wake);
    const bed = new Date(record.bed);
    const hours = getHours(record);
    const item = element("li", "record");
    const date = element("div", "date-tile");
    date.append(element("span", "", `${wake.getMonth() + 1}月`), element("strong", "", String(wake.getDate()).padStart(2, "0")));
    const body = element("div", "record-body");
    const top = element("div", "record-top");
    top.append(element("strong", "record-duration", durationText(hours)), element("span", "quality-tag", `睡眠${record.quality}`));
    const format = date => `${localDate(date)} ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    body.append(top, element("p", "record-times", `${format(bed)} → ${format(wake)}`));
    if (record.note) body.append(element("p", "record-note", record.note));
    const advice = evaluation(hours);
    body.append(element("p", "record-evaluation", `${advice.title}。${advice.tip}`));
    const remove = element("button", "delete-button", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", `删除 ${localDate(wake)} 的睡眠记录`);
    remove.addEventListener("click", () => {
      records = records.filter(entry => entry.id !== record.id);
      save();
      render();
      const buttons = list.querySelectorAll(".delete-button");
      (buttons[Math.min(index, buttons.length - 1)] || bedtime).focus();
    });
    item.append(date, body, remove);
    list.append(item);
  });
  $("#record-count").textContent = `${records.length} 条记录`;
  $("#empty-state").hidden = records.length > 0;
}
function weekData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - 6 + index);
    const entries = records.filter(record => localDate(new Date(record.wake)) === localDate(date));
    return { date, hours: entries.length ? entries.reduce((sum, record) => sum + getHours(record), 0) : null };
  });
}
function renderOverview() {
  const days = weekData();
  const recorded = days.filter(day => day.hours !== null);
  const average = recorded.length ? recorded.reduce((sum, day) => sum + day.hours, 0) / recorded.length : null;
  $("#average").replaceChildren(document.createTextNode(average === null ? "—" : average.toFixed(1)), element("small", "", " 小时"));
  $("#days-count").textContent = `已记录 ${recorded.length} / 7 天 · 按有记录的天数平均`;
  const shortDate = date => `${date.getMonth() + 1}.${date.getDate()}`;
  $("#week-range").textContent = `${shortDate(days[0].date)} — ${shortDate(days[6].date)}`;
  const latest = [...records].sort((a, b) => new Date(b.wake) - new Date(a.wake))[0];
  const advice = latest ? evaluation(getHours(latest)) : null;
  $("#advice-title").textContent = advice ? advice.title : "从一晚好眠开始";
  $("#advice-text").textContent = advice ? `根据最近一条记录：${advice.tip}` : "记下第一条睡眠，让小森陪你发现自己的休息节奏。";
  renderChart(days);
}
function renderChart(days) {
  const svg = $("#sleep-chart");
  const ns = "http://www.w3.org/2000/svg";
  svg.querySelectorAll(":scope > g").forEach(node => node.remove());
  const group = document.createElementNS(ns, "g");
  svg.append(group);
  const draw = (tag, attributes, text) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    group.append(node);
    return node;
  };
  const max = Math.max(12, Math.ceil(Math.max(...days.map(day => day.hours || 0)) / 4) * 4);
  const x = index => 44 + index * 86;
  const y = hours => 176 - (hours / max) * 150;
  for (let step = 0; step <= 4; step++) {
    const value = max * step / 4;
    draw("line", { x1: 44, x2: 560, y1: y(value), y2: y(value), stroke: "#e9eddf", "stroke-dasharray": "4 5" });
    draw("text", { x: 30, y: y(value) + 4, fill: "#a3ad94", "font-size": 11, "text-anchor": "end" }, `${value}h`);
  }
  let path = "";
  let connected = false;
  days.forEach((day, index) => {
    draw("text", { x: x(index), y: 204, fill: "#98a58b", "font-size": 12, "text-anchor": "middle" }, `${day.date.getMonth() + 1}/${day.date.getDate()}`);
    if (day.hours === null) { connected = false; return; }
    path += `${connected ? "L" : "M"}${x(index)},${y(day.hours)} `;
    connected = true;
  });
  draw("path", { d: path, fill: "none", stroke: "#88a372", "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" });
  days.forEach((day, index) => {
    if (day.hours === null) return;
    const circle = draw("circle", { cx: x(index), cy: y(day.hours), r: 5, fill: "#fffef9", stroke: "#88a372", "stroke-width": 3 });
    const title = document.createElementNS(ns, "title");
    title.textContent = `${localDate(day.date)}：${durationText(day.hours)}`;
    circle.append(title);
    draw("text", { x: x(index), y: y(day.hours) - 13, fill: "#718a60", "font-size": 11, "text-anchor": "middle" }, `${day.hours.toFixed(1)}h`);
  });
  if (days.every(day => day.hours === null)) draw("text", { x: 302, y: 99, "text-anchor": "middle", fill: "#9daa8d", "font-size": 13 }, "记下一晚，让好眠的轨迹慢慢出现");
  $("#chart-description").textContent = days.map(day => `${localDate(day.date)}：${day.hours === null ? "未记录" : durationText(day.hours)}`).join("；");
}
function render() { renderRecords(); renderOverview(); }

const morning = new Date();
morning.setHours(7, 0, 0, 0);
if (morning > new Date()) morning.setDate(morning.getDate() - 1);
const night = new Date(morning);
night.setDate(night.getDate() - 1);
night.setHours(23, 0, 0, 0);
bedtime.value = localInput(night);
wakeTime.value = localInput(morning);
[bedtime, wakeTime].forEach(input => input.addEventListener("input", preview));
form.addEventListener("submit", event => {
  event.preventDefault();
  const bed = new Date(bedtime.value);
  const wake = new Date(wakeTime.value);
  const hours = (wake - bed) / hour;
  const fail = message => { $("#form-error").textContent = message; };
  if (!Number.isFinite(hours) || hours <= 0) return fail("起床时间需要晚于入睡时间，请检查日期与时间。跨夜睡眠请选择次日。 ");
  if (hours > 24) return fail("单条睡眠不能超过 24 小时，请检查日期是否填写正确。");
  if (wake > new Date()) return fail("还没到起床时间呢，请记录已经结束的睡眠。");
  if (records.some(record => bed < new Date(record.wake) && wake > new Date(record.bed))) return fail("这个时间段与已有记录重叠了，请检查后再保存。");
  records.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, bed: bed.toISOString(), wake: wake.toISOString(), quality: form.elements.quality.value, note: $("#note").value.trim() });
  save();
  render();
  $("#note").value = "";
  $("#form-error").textContent = "";
});
window.addEventListener("focus", renderOverview);
preview();
render();

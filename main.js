"use strict";

const storageKey = "little-things.todos.v1";
const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const list = document.querySelector("#todo-list");
const count = document.querySelector("#count");
const summary = document.querySelector("#summary");
const emptyState = document.querySelector("#empty-state");
const notice = document.querySelector("#notice");
let todos = [];

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
  if (Array.isArray(saved)) {
    todos = saved.filter(item => item && typeof item.id === "string" &&
      typeof item.text === "string" && item.text.trim() && typeof item.completed === "boolean");
  }
} catch {
  notice.textContent = "暂时无法读取本地记录，你仍然可以使用待办清单。";
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(todos));
    notice.textContent = "";
  } catch {
    notice.textContent = "浏览器暂时无法保存，关闭页面后本次更改可能丢失。";
  }
}

function render() {
  list.replaceChildren();
  todos.forEach(todo => {
    const item = document.createElement("li");
    item.className = `todo${todo.completed ? " completed" : ""}`;
    const label = document.createElement("label");
    label.className = "task-label";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = todo.text;
    checkbox.addEventListener("change", () => {
      todo.completed = checkbox.checked;
      item.classList.toggle("completed", todo.completed);
      save();
      updateSummary();
    });
    label.append(checkbox, text);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `删除待办：${todo.text}`);
    remove.addEventListener("click", () => {
      const index = todos.indexOf(todo);
      todos.splice(index, 1);
      save();
      render();
      const next = list.children[Math.min(index, todos.length - 1)];
      (next ? next.querySelector(".delete-button") : input).focus();
    });
    item.append(label, remove);
    list.append(item);
  });
  updateSummary();
}

function updateSummary() {
  const completed = todos.filter(todo => todo.completed).length;
  count.textContent = `${todos.length - completed} 项待完成`;
  summary.textContent = todos.length ? `已完成 ${completed} / ${todos.length} 项` : "慢慢来，每一步都算数。";
  emptyState.hidden = todos.length > 0;
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    input.value = "";
    input.focus();
    return;
  }
  todos.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text, completed: false });
  save();
  render();
  form.reset();
  input.focus();
});

render();

"use strict";
const $ = selector => document.querySelector(selector);
const storageKey = "bloom-journal.periods.v1";
const reminderKey = "bloom-journal.reminded.v1";
const dayMs = 86400000;
const form = $("#period-form");
let records = [];
let displayedMonth = new Date();
displayedMonth.setDate(1);
function key(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function parse(value) { if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null; const date = new Date(`${value}T12:00:00`); return Number.isFinite(+date) && key(date) === value ? date : null; }
function today() { return parse(key(new Date())); }
function add(date, days) { const result = new Date(date); result.setDate(result.getDate()+days); return result; }
function difference(a,b) { return Math.round((Date.UTC(a.getFullYear(),a.getMonth(),a.getDate())-Date.UTC(b.getFullYear(),b.getMonth(),b.getDate()))/dayMs); }
function format(date) { return `${date.getMonth()+1}月${date.getDate()}日`; }
function sorted() { return [...records].sort((a,b)=>a.start.localeCompare(b.start)); }
function valid(record) { return record && typeof record.id === "string" && parse(record.start) && Number.isInteger(record.duration) && record.duration>=1 && record.duration<=15 && ["少","正常","多"].includes(record.flow) && ["无","轻微","中等","严重"].includes(record.pain) && typeof record.note === "string"; }
try { const saved=JSON.parse(localStorage.getItem(storageKey)||"[]"); if(!Array.isArray(saved))throw Error(); records=saved.filter(valid); if(records.length!==saved.length)$("#storage-status").textContent="部分记录格式异常，已跳过显示。"; }
catch { $("#storage-status").textContent="无法读取本地记录；请留意保存提示，避免丢失数据。"; }
function save() { try { localStorage.setItem(storageKey,JSON.stringify(records)); $("#storage-status").textContent=""; } catch { $("#storage-status").textContent="浏览器未能保存，刷新后本次更改可能丢失，请检查存储设置。"; } }
function prediction() {
 const entries=sorted(); if(!entries.length)return null;
 const intervals=entries.slice(1).map((entry,i)=>difference(parse(entry.start),parse(entries[i].start)));
 // Exclude likely missing-cycle gaps or unusually short intervals from the estimate.
 const usable=intervals.filter(days=>days>=21 && days<=45).slice(-6);
 const cycle=usable.length?Math.round(usable.reduce((sum,n)=>sum+n,0)/usable.length):28;
 const last=parse(entries.at(-1).start);
 const next=add(last,cycle); // Never silently roll an overdue prediction forward.
 const ovulation=add(next,-14);
 const duration=Math.round(entries.slice(-6).reduce((sum,r)=>sum+r.duration,0)/Math.min(entries.length,6));
 return {last,next,ovulation,fertileStart:add(ovulation,-5),fertileEnd:add(ovulation,1),cycle,duration,samples:usable.length,excluded:intervals.length-usable.length};
}
function node(tag,className,text) { const el=document.createElement(tag); if(className)el.className=className; if(text!==undefined)el.textContent=text; return el; }
function renderPrediction() {
 const p=prediction();
 $("#next-date").textContent=p?`${p.next.getFullYear()}年 ${format(p.next)}`:"等待第一条记录";
 $("#cycle").textContent=p?`${p.cycle} 天`:"—";
 $("#ovulation").textContent=p?format(p.ovulation):"—";
 $("#fertile-window").textContent=p?`估算受孕窗口：${format(p.fertileStart)} — ${format(p.fertileEnd)}（含首尾日期）`:"";
 const ranges=[];
 if(p){ const latest=sorted().at(-1);const afterPeriod=add(p.last,latest.duration);const beforeWindow=add(p.fertileStart,-1);const afterWindow=add(p.fertileEnd,1);const beforeNext=add(p.next,-1);if(afterPeriod<=beforeWindow)ranges.push(`${format(afterPeriod)}—${format(beforeWindow)}`);if(afterWindow<=beforeNext)ranges.push(`${format(afterWindow)}—${format(beforeNext)}`); }
 $("#lower-risk").textContent=p?`俗称“安全期”的估算窗口外日期：${ranges.join("、")||"暂无"}。仍可能怀孕，不可依赖此日期避孕。`:"";
 $("#prediction-basis").textContent=p?(p.samples?`依据最近 ${p.samples} 个 21–45 天的周期取平均；排卵日按下次经期前 14 天估算。`:`历史不足，暂以 28 天周期估算；有更多记录后会更新。`):"预测会随着历史记录慢慢调整。";
 if(!p)$("#countdown").textContent="记下花期，让我们一起了解你的节奏。";
 else { const days=difference(p.next,today()); $("#countdown").textContent=days>0?`预计还有 ${days} 天，提前备好温柔的小照顾。`:days===0?"预计今天开始，记得留意身体的感受。":`预测日期已过 ${-days} 天，请补充实际记录；若经期推迟且有怀孕可能，请考虑验孕或咨询医生。`; }
}
function renderCalendar() {
 $("#month-label").textContent=`${displayedMonth.getFullYear()}年 ${displayedMonth.getMonth()+1}月`;
 const calendar=$("#calendar"); calendar.replaceChildren();
 const first=parse(`${key(displayedMonth).slice(0,7)}-01`);
 const offset=(first.getDay()+6)%7;
 for(let i=0;i<offset;i++){ const blank=node("div"); blank.setAttribute("aria-hidden","true");calendar.append(blank); }
 const days=new Date(first.getFullYear(),first.getMonth()+1,0).getDate(); const p=prediction();
 for(let n=1;n<=days;n++){
  const date=add(first,n-1); let type="",label="未记录，非安全保证";
  if(p && date>=p.fertileStart && date<=p.fertileEnd){ type="fertile";label="估算受孕窗口"; }
  if(p && key(date)===key(p.ovulation)){type="ovulation";label="估算排卵日";}
  if(p && date>=p.next && date<add(p.next,p.duration)){type="predicted";label="预测经期";}
  if(records.some(r=>date>=parse(r.start)&&date<add(parse(r.start),r.duration))){type="actual";label="已记录经期";}
  const cell=node("div",`day ${type}${key(date)===key(today())?" today":""}`);
  cell.setAttribute("role","listitem"); cell.setAttribute("aria-label",`${key(date)}，${label}`);cell.title=`${key(date)} · ${label}`;
  cell.append(node("span","",String(n))); if(type)cell.append(node("small","",{actual:"经期",predicted:"预测",fertile:"受孕窗口",ovulation:"排卵日"}[type]));
  calendar.append(cell);
 }
}
function renderHistory(){
 const list=$("#record-list");list.replaceChildren();const entries=sorted().reverse();
 entries.forEach((r,index)=>{const date=parse(r.start);const li=node("li","record");const tile=node("div","date-tile");tile.append(node("span","",`${date.getMonth()+1}月`),node("strong","",String(date.getDate()).padStart(2,"0")));const body=node("div","record-body");body.append(node("h3","",`${r.start} · 持续 ${r.duration} 天`),node("div","record-meta",`出血量：${r.flow} · 痛经：${r.pain}`));if(r.note)body.append(node("p","record-note",r.note));const remove=node("button","delete-button","×");remove.type="button";remove.setAttribute("aria-label",`删除 ${r.start} 的记录`);remove.addEventListener("click",()=>{records=records.filter(item=>item.id!==r.id);save();render();checkReminder();const buttons=list.querySelectorAll("button");(buttons[Math.min(index,buttons.length-1)]||$("#start")).focus();});li.append(tile,body,remove);list.append(li);});
 $("#record-count").textContent=`${records.length} 条记录`;$("#empty-state").hidden=records.length>0;
}
function render(){renderPrediction();renderCalendar();renderHistory();}
$("#start").value=key(today());$("#start").max=key(today());
form.addEventListener("submit",event=>{
 event.preventDefault();const start=parse($("#start").value);const duration=Number($("#duration").value);const fail=text=>{$("#form-error").textContent=text;};
 if(!start||start>today())return fail("请选择今天或之前的真实经期开始日期。");
 if(!Number.isInteger(duration)||duration<1||duration>15)return fail("持续天数请填写 1–15 的整数；若出血持续异常，请咨询医生。");
 if(records.some(r=>start<add(parse(r.start),r.duration)&&add(start,duration)>parse(r.start)))return fail("这段日期与已有经期记录重叠，请检查日期和持续天数。");
 records.push({id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,start:key(start),duration,flow:form.elements.flow.value,pain:$("#pain").value,note:$("#note").value.trim()});save();render();$("#form-error").textContent="";$("#note").value="";checkReminder();
});
$("#prev-month").addEventListener("click",()=>{displayedMonth=new Date(displayedMonth.getFullYear(),displayedMonth.getMonth()-1,1);renderCalendar();});
$("#next-month").addEventListener("click",()=>{displayedMonth=new Date(displayedMonth.getFullYear(),displayedMonth.getMonth()+1,1);renderCalendar();});
function notificationStatus(){
 const button=$("#enable-reminders"),status=$("#notification-status");
 if(!("Notification" in window)){status.textContent="当前浏览器不支持网页通知。";button.disabled=true;return;}
 if(!window.isSecureContext){status.textContent="通知需要 HTTPS 或本机开发环境，请使用支持的浏览器打开。";button.disabled=true;return;}
 if(Notification.permission==="denied"){status.textContent="通知权限已被拒绝，可在浏览器网站设置中重新允许。";button.textContent="检查通知权限";}
 else if(Notification.permission==="granted"){status.textContent="已授权。页面打开时会检查预测经期前 3 天的提醒。";button.textContent="检查提醒";}
 else{status.textContent="点击按钮后，浏览器会向你请求通知权限。";button.textContent="开启浏览器提醒";}
}
function checkReminder(){
 if(!("Notification" in window)||Notification.permission!=="granted")return;
 const p=prediction();if(!p||difference(p.next,today())!==3)return;
 const id=key(p.next);try{if(localStorage.getItem(reminderKey)===id)return;}catch{}
 try{const notification=new Notification("花期将近，温柔照顾自己",{body:`预计 ${format(p.next)} 迎来下一次经期，记得备好日常用品，好好休息。预测仅供参考。`,tag:`bloom-${id}`});notification.onerror=()=>{$("#notification-status").textContent="系统未能显示通知，请检查浏览器或设备通知设置。";try{localStorage.removeItem(reminderKey);}catch{}};try{localStorage.setItem(reminderKey,id);}catch{} }
 catch{$("#notification-status").textContent="此设备未能显示通知，请检查系统设置；部分手机浏览器不支持此类通知。";}
}
$("#enable-reminders").addEventListener("click",async()=>{if(!("Notification" in window))return;try{if(Notification.permission==="default")await Notification.requestPermission();notificationStatus();checkReminder();}catch{$("#notification-status").textContent="无法请求通知权限，请检查浏览器设置。";}});
window.addEventListener("focus",()=>{render();notificationStatus();checkReminder();});
setInterval(()=>{renderPrediction();renderCalendar();checkReminder();},60000);
render();notificationStatus();checkReminder();

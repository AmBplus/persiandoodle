// Unified Motion Library — original PersianDoodle UI. No copied restricted code.
const $=(s)=>document.querySelector(s);
const escapeHtml=(s)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sourceNames={shotcraft:"شات‌کرافت",mg:"۱۵ سبک موشن",talkcraft:"تاک‌کرافت",explainer:"آموزش تصویری",onetake:"حرکت یکپارچه",native:"پرشین دودل"};
const kindNames={shot:"شات",style:"سبک",motion:"انیمیشن",explainer:"آموزشی",audio:"موسیقی/صدا",font:"فونت",example:"نمونه فارسی"};
const statuses={"rendered-persian":"رندر فارسی","available-native":"موجود در موتور","source-prompt-ready":"پرامپت آماده","original-reference":"مرجع اصلی","reference-only":"مرجع محدود","license-review":"مجوز در دست بررسی"};
const desc={
 "تایپوگرافی":"حرکتِ تایپوگرافیک؛ نسخهٔ فارسی باید با شکل‌دهی درست کل عبارت، نیم‌فاصله و خوانایی آزموده شود.",
 "داده و نمودار":"قالب متحرک داده برای نمایش عدد، روند یا مقایسه در یک روایت کوتاه.",
 "تعامل":"نمایش واکنش زنجیره‌ای عناصر رابط کاربری در پاسخ به یک کنش واقعی.",
 "حرکت پیوسته":"نمونهٔ نظری تداوم عناصر بین نماها؛ برای اجرا باید مستقلاً پیاده‌سازی شود.",
 "گفتار و موشن":"واژگان بصریِ موشن همراه گفتار؛ استفاده از پیاده‌سازی اصلی تابع مجوز محدود است.",
 "آموزش و توضیح":"مرجع طراحی و کیفیت روایت تصویری؛ فقط لینک و فراداده، نه کپی نمونه یا کد.",
 "صدا و افکت":"افکت صوتی پیشنهادی برای ضرباهنگ تصویر؛ پیش از استفادهٔ تجاری منبع هر فایل بررسی شود.",
 "موسیقی و صدا":"دارایی صوتی موجود در موتور PersianDoodle؛ برای بررسی و انتخاب در دسترس است.",
 "فونت و تایپوگرافی":"فونت داخل پروژه با مجوز اختصاصی در پوشهٔ فونت‌ها.",
 "سبک طراحی":"پرامپت مهندسی‌شده همراه مراحل تولید، قواعد حرکت، موسیقی و کنترل کیفیت؛ قابل بازنویسی برای محتوای فارسی."
};
const state={entries:[],visible:24,search:"",source:"",kind:"",status:"",focused:null};
function render(){
  const q=state.search.trim().toLowerCase();
  const filtered=state.entries.filter(x=>(!state.source||x.source===state.source)&&(!state.kind||x.kind===state.kind)&&(!state.status||x.status===state.status)&&(!q||[x.titleFa,x.name,x.category,x.title,x.tags?.join(" "),x.description,x.source].join(" ").toLowerCase().includes(q)));
  $("#resultCount").textContent=`نمایش ${Math.min(state.visible,filtered.length).toLocaleString("fa-IR")} از ${filtered.length.toLocaleString("fa-IR")} مورد`;
  const wrap=$("#cards");wrap.replaceChildren();
  for(const entry of filtered.slice(0,state.visible)){
    const el=document.createElement("article");el.className="card";el.tabIndex=0;el.setAttribute("role","button");
    el.setAttribute("aria-label","مشاهده "+(entry.titleFa||entry.name));
    const img=(entry.status==="rendered-persian"||entry.kind==="style")&&entry.preview&&/\.(jpg|png|webp)(\?|$)/i.test(entry.preview);
    el.innerHTML=`<div class="thumb">${img?`<img loading="lazy" alt="" src="${escapeHtml(entry.preview)}" onerror="this.style.display='none'">`:`<span class="thumb-fallback">${entry.kind==="audio"?"♫":entry.kind==="font"?"اب":entry.kind==="motion"?"↗":entry.kind==="style"?"◈":"پ"}</span>`}<span class="thumb-badge">${escapeHtml(statuses[entry.status]||"مرجع")}</span></div><div class="card-body"><h3>${escapeHtml(entry.titleFa||entry.name)}</h3><div class="subtitle">${escapeHtml(entry.name)}</div><p>${escapeHtml(entry.status==="rendered-persian"?entry.description:(desc[entry.category]||"الگوی مرجع برای طراحی نما و موشن فارسی؛ برای فارسی‌سازی باید بازآفرینی و تست شود."))}</p><div class="meta"><span>${escapeHtml(kindNames[entry.kind]||entry.kind)}</span><span>${escapeHtml(sourceNames[entry.source])}</span><span>${escapeHtml(entry.license)}</span></div></div>`;
    el.addEventListener("click",()=>openDetail(entry));
    el.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();openDetail(entry)}});
    wrap.append(el);
  }
  $("#more").hidden=filtered.length<=state.visible;$("#empty").hidden=filtered.length>0;
}
function openDetail(item){
 const body=$("#modalBody"),isFa=item.status==="rendered-persian";
 const path=item.kind==="style"&&item.promptPath?
   "./vendor/mg-styles-15/"+item.promptPath:null;
 const originalWarning=item.source==="talkcraft"||item.source==="explainer"||item.source==="onetake"?
   "این منبع مجوز غیرتجاری دارد. تنها ایده و پیوند آن ثبت شده؛ کد، قالب یا رسانهٔ آن منتقل نشده است.":
   item.status==="license-review"?"مجوز این فایل صوتی مستقل است؛ پیش از استفادهٔ تجاری تأیید شود.":
   !isFa&&item.source!=="native"?"پیش‌نمایش مرجع متعلق به پروژهٔ اصلی است و هنوز به فارسی بازطراحی و رندر نشده است.":"";
 let media="";
 if(item.preview&&/\.(mp4|webm)(\?|$)/i.test(item.preview)){
  media=`<video controls preload="none" playsinline src="${escapeHtml(item.preview)}"></video>`;
 } else if(item.preview&&/\.(jpg|png|webp)(\?|$)/i.test(item.preview)){
  media=`<img loading="lazy" src="${escapeHtml(item.preview)}" alt="${escapeHtml(item.titleFa)}">`;
 }
 body.innerHTML=`<span class="eyebrow">${escapeHtml(sourceNames[item.source]||"SOURCE")} / ${escapeHtml(item.category)}</span><h2 id="modalTitle">${escapeHtml(item.titleFa||item.name)}</h2><span class="en">${escapeHtml(item.name)}</span><p>${escapeHtml(isFa?item.description:(desc[item.category]||"الگوی مرجع برای حرکت و طراحی فارسی؛ نیازمند بازسازی و رندر فارسی."))}</p>${media}${originalWarning?`<p class="warning">${escapeHtml(originalWarning)}</p>`:""}<div class="tags"><span>وضعیت: ${escapeHtml(statuses[item.status])}</span><span>مجوز: ${escapeHtml(item.license)}</span><span>${escapeHtml(item.duration||kindNames[item.kind])}</span></div><div class="links">${item.sourceUrl?`<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener">مشاهدهٔ منبع ↗</a>`:""}${path?`<a href="${escapeHtml(path)}" target="_blank" rel="noopener">پرامپت اصلی ↗</a>`:""}${isFa&&item.preview?`<a href="${escapeHtml(item.preview)}" target="_blank" rel="noopener">دریافت پیش‌نمایش فارسی ↗</a>`:""}</div>`;
 if(item.kind==="audio"&&item.status==="available-native"){
  const au=document.createElement("audio");au.controls=true;au.preload="none";au.src=item.sourceUrl;au.style.width="100%";au.style.marginTop="16px";body.append(au);
 }
 $("#modal").hidden=false;$("#close").focus();
}
$("#close").addEventListener("click",()=>$("#modal").hidden=true);
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")$("#modal").hidden=true});
window.addEventListener("keydown",e=>{if(e.key==="Escape")$("#modal").hidden=true});
$("#more").addEventListener("click",()=>{state.visible+=24;render()});
for(const [selector,key] of [["#search","search"],["#sourceFilter","source"],["#typeFilter","kind"],["#statusFilter","status"]]){
 $("#"+selector.slice(1)).addEventListener(selector==="#search"?"input":"change",e=>{state[key]=e.target.value;state.visible=24;render()});
}
async function init(){
 try{
  const res=await fetch("./data/catalog.json",{cache:"no-cache"});
  if(!res.ok)throw Error("HTTP "+res.status);
  const data=await res.json();if(!Array.isArray(data.entries))throw Error("invalid catalog");
  state.entries=data.entries;$("#stat-all").textContent=data.entries.length.toLocaleString("fa-IR");
  $("#stat-rtl").textContent=data.entries.filter(x=>x.status==="rendered-persian").length.toLocaleString("fa-IR");
  for(const [field,values] of [["source",Object.keys(data.sources)],["kind",Array.from(new Set(data.entries.map(x=>x.kind)))]]) {
    const select=$(field==="source"?"#sourceFilter":"#typeFilter");
    for(const val of values){const o=document.createElement("option");o.value=val;o.textContent=(field==="source"?sourceNames:kindNames)[val]||val;select.append(o);}
  }
  render();
 }catch(e){$("#resultCount").textContent="بارگذاری فهرست ناموفق بود: "+e.message+"؛ صفحه را از یک HTTP server باز کنید."}
}
import {startWritingPreview} from "./pen-preview.js";
startWritingPreview();
init();

import {drawSignature,playSignature} from "./v2-preview.js";
import {playStudioSound,stopSound,setSoundOn,soundOn} from "./v2-sound.js";
import {mountComposer,addToScene} from "./composer.js";
import {faTitle} from "./localization.js";

const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const icons={opening:"✦",typography:"آ",entrance:"▣",camera:"◉",data:"▥",interaction:"◇",transition:"⇄",rhythm:"♫",light:"☼",outro:"✧",style:"◈",narrative:"☷",continuity:"↝",music:"♪",sound:"◌",background:"▤",font:"ف",pen:"✎"};
const labels={opening:"شروع و روایت",typography:"متن و تایپوگرافی",entrance:"ورود المان",camera:"دوربین",data:"داده و عدد",interaction:"تعامل",transition:"ترنزیشن",rhythm:"ریتم",light:"نور و افکت",outro:"پایان",style:"سبک",narrative:"روایت",continuity:"تداوم",music:"موسیقی",sound:"افکت صدا",background:"پس‌زمینه",font:"فونت",pen:"ابزار قلم"};
const explanations={
 opening:"هر مدل، روش شروع و معرفی برند را نشان می‌دهد؛ نمونهٔ فارسی در موتور به‌صورت مستقل ساخته می‌شود.",
 typography:"عنوان‌های فارسی با شکل‌دهی درست، اتصال حروف و نیم‌فاصله؛ مدل‌های این بخش از نظر ورود و ریتم متفاوت‌اند.",
 entrance:"ورود کارت، نشان و اجزای رابط به‌صورت هدفمند و قابل استفاده در سناریوی تولید.",
 camera:"حرکت‌های فضایی، زوم و پرسپکتیو برای ساخت عمق بدون آشفتگی.",
 data:"نمایش آمار، پیشرفت، اعداد و مقایسه با تقدم خوانایی بر جلوه.",
 interaction:"علت و معلول واقعی در واکنش‌های رابط کاربری و ماجراهای محصول.",
 transition:"جابه‌جایی معنادار از صحنهٔ اول به دوم با استمرار بصری.",
 rhythm:"تغییر سرعت و ضرباهنگ متناسب با موسیقی و اهمیت پیام.",
 light:"نور، بافت و تأکیدهای تصویری برای افزایش عمق و شخصیت.",
 outro:"امضای نهایی، پیام ماندگار و پایان خوش‌ساخت.",
 style:"۱۵ سبک با ویدیوی فارسی مستقل؛ روی هر سبک کلیک کن تا فیلم واقعی را با صدا ببینی.",
 narrative:"الگوهای الهام‌بخش برای روایت آموزشی، توضیح ویدئویی و گفتار تصویری.",
 continuity:"الگوهای گردش دوربین و حفظ تداوم در نماها؛ پیاده‌سازی محدود غیرتجاری منتقل نشده است.",
 music:"قطعات صوتی موجود در پروژه؛ برای شنیدن نسخهٔ اصلی روی پخش بزن.",
 sound:"صداهای تعاملی ساخته‌شده بدون وابستگی به فایل نامشخص؛ پخش با کلیک و نمونهٔ دیداری هماهنگ.",
 background:"پس‌زمینه‌ها و بافت‌های مستقل برای انتخاب در ترکیب صحنه.",
 font:"۲۵ فونت نصب‌شده را با متن واقعی فارسی امتحان کن.",
 pen:"قلم نی، خودنویس، مداد، ماژیک و قلم‌مو؛ با شکل جمع‌وجور و حالت نوشتنِ باوقار."
};
const order=["opening","typography","entrance","camera","data","interaction","transition","rhythm","light","outro","style","narrative","continuity","background","font","pen","music","sound"];
const sections=[["موشن و فیلم",0,13],["جزئیات طراحی",13,16],["صوت و موسیقی",16,18]];
const state={categories:[],catalog:new Map(),active:"typography",family:null,variant:null,search:"",playCancel:null,sound:true};
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const isNativeVideo=v=>v?.status==="rendered-persian"&&String(v?.video||"").startsWith("../assets/");
function details(v){
 return state.catalog.get(v?.id)||{id:v?.id||"",name:v?.name,titleFa:v?.label,source:v?.source,sourceUrl:v?.sourceUrl,kind:state.active==="font"?"font":state.active==="style"?"style":state.active==="music"||state.active==="sound"?"audio":"shot",status:v?.status,license:v?.source==="native"?"بررسی مجوز فایل":"ارجاع به منبع اصلی"};
}
function nav(){
 const nav=$("#categoryNav");nav.replaceChildren();const mob=$("#mobileCategories");mob.replaceChildren();
 for(const [heading,start,end] of sections){
  const cap=document.createElement("div");cap.className="nav-group-label";cap.textContent=heading;nav.append(cap);
  for(const id of order.slice(start,end)){
   const cat=state.categories.find(c=>c.id===id);if(!cat)continue;
   const el=document.createElement("button");el.type="button";el.className="nav-link"+(state.active===id?" active":"");
   el.dataset.category=id;el.setAttribute("aria-current",state.active===id?"page":"false");
   el.innerHTML=`<span class="nav-icon">${icons[id]||"◈"}</span><span>${escapeHtml(cat.title)}</span><span class="smallcount">${cat.families.length.toLocaleString("fa-IR")}</span>`;
   el.addEventListener("click",()=>selectCategory(id));nav.append(el);
   const sm=document.createElement("button");sm.type="button";sm.className=state.active===id?"active":"";sm.textContent=cat.title;sm.dataset.category=id;sm.addEventListener("click",()=>selectCategory(id));mob.append(sm);
  }
 }
}
function selectCategory(id){
 stopSound();state.playCancel?.();state.playCancel=null;
 const c=state.categories.find(c=>c.id===id);if(!c)return;
 state.active=id;state.family=null;state.variant=null;
 $("#categoryEyebrow").textContent="کتابخانهٔ حرکت / "+(labels[id]||"سبک");
 $("#categoryTitle").textContent=c.title;$("#categorySubtitle").textContent=c.subtitle;
 $("#familyCount").textContent=c.families.length.toLocaleString("fa-IR")+" خانوادهٔ منتخب";
 $("#searchFamily").value="";state.search="";
 nav();renderFamilies();
 const first=c.families.find(f=>f.variants.length);if(first)selectFamily(first,false);
 $("#explorer").scrollTop=0;
 if(window.innerWidth<690)$("#inspector").classList.remove("is-open");
}
function imgPoster(v){
 if(state.active==="style"&&v?.status==="rendered-persian")return "../assets/library/style-thumbs/"+v.name+".png";
 return null;
}
function renderFamilies(){
 const c=state.categories.find(c=>c.id===state.active);
 if(!c)return;const filtered=c.families.filter(f=>!state.search||[f.name,f.id,...f.variants.map(v=>v.label||v.name)].join(" ").toLowerCase().includes(state.search));
 const grid=$("#familyGrid");grid.replaceChildren();$("#noResults").hidden=filtered.length>0;
 for(const f of filtered){
  const card=document.createElement("article");card.className="family-card"+(state.family?.id===f.id?" active":"");card.tabIndex=0;card.role="button";
  card.setAttribute("aria-label","مشاهده خانواده "+f.name);
  const thumb=document.createElement("div");thumb.className="family-thumb";
  const v=f.variants[0],poster=imgPoster(v);
  if(poster){const img=new Image();img.loading="lazy";img.src=poster;img.alt="نمونه واقعی فارسی "+f.name;thumb.append(img)}
  else{const canvas=document.createElement("canvas");canvas.width=960;canvas.height=540;thumb.append(canvas);drawSignature(canvas,c,f,v,.78);}
  const tag=document.createElement("span");tag.className="frame-label";tag.textContent=state.active==="style"?"ویدیوی واقعی فارسی":state.active==="music"?"پخش موسیقی":"نمونهٔ تکنیک";thumb.append(tag);
  const qty=document.createElement("span");qty.className="frame-count";qty.textContent=f.variants.length.toLocaleString("fa-IR")+" مدل";thumb.append(qty);
  const info=document.createElement("div");info.className="family-info";
  info.innerHTML=`<h3>${escapeHtml(f.name)}</h3><p>${escapeHtml((explanations[c.id]||c.subtitle).slice(0,125))}</p><div class="family-actions"><span class="family-chip">${escapeHtml(c.title)}</span><span class="family-arrow">بررسی مدل‌ها ←</span></div>`;
  card.append(thumb,info);
  card.addEventListener("click",()=>selectFamily(f,true));card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectFamily(f,true)}});grid.append(card);
 }
}
function selectFamily(f,open=true){
 state.playCancel?.();state.playCancel=null;stopSound();$("#assetAudio").pause();$("#inspectVideo").pause();
 state.family=f;state.variant=f.variants[0];updateInspector();renderFamilies();
 if(open&&window.innerWidth<1031)$("#inspector").classList.add("is-open");
}
function selectVariant(v){
 stopSound();state.playCancel?.();$("#assetAudio").pause();$("#inspectVideo").pause();
 state.variant=v;updateInspector();
}
async function loadFont(v){
 const fontName=(v?.name||"").replace(/[^\w -]/g,"");
 const path="../skills/anidoodle/engine/assets/fonts/"+(v?.name||"").replace(/\.ttf$/i,"")+".ttf";
 if(!v||!v.name)return;
 const family="preview-"+fontName;
 try{const face=new FontFace(family,`url("${path}")`,/Variable/i.test(fontName)?{weight:"100 900"}:{});
 const loaded=await face.load();document.fonts.add(loaded);$("#fontRender").style.fontFamily='"'+family+'",Vazirmatn';}
 catch{$("#fontRender").style.fontFamily="Vazirmatn"}
 $("#fontRender").textContent=$("#fontSample").value;
}
function updateInspector(){
 const cat=state.categories.find(c=>c.id===state.active),f=state.family,v=state.variant;if(!f||!v)return;
 $("#inspectHeading").textContent=f.name;$("#inspectExplanation").textContent=explanations[cat.id]||cat.subtitle;
 const vid=$("#inspectVideo"),canvas=$("#inspectCanvas"),audio=$("#assetAudio"),fontBox=$("#fontOptions");
 const native=isNativeVideo(v),music=state.active==="music";
 vid.pause();vid.hidden=!native;canvas.hidden=native;
 $("#previewKind").textContent=native?"فیلم واقعیِ رندرشده با فارسی":music?"صدای اصلی موجود در مخزن":"بازآفرینیِ مفهومی فارسی";
 $("#variants").replaceChildren();
 for(const option of f.variants){
  const b=document.createElement("button");b.type="button";b.textContent=(option.label&&/[\u0600-\u06ff]/.test(option.label))?option.label:f.name;
  b.className=option.id===v.id?"active":"";b.addEventListener("click",()=>selectVariant(option));$("#variants").append(b);
 }
 if(native){vid.src=v.video;vid.muted=!state.sound;vid.volume=.9;vid.load();}
 else drawSignature(canvas,cat,f,v,.77);
 fontBox.hidden=state.active!=="font";if(!fontBox.hidden)loadFont(v);
 audio.hidden=!music;
 if(music){audio.src="../assets/audio/"+v.name;audio.volume=.75;audio.load();}
 $("#playPreview").textContent=native?"▶ تماشای فیلم با صدا":music?"▶ شنیدن موسیقی":"▶ اجرای حرکت با صدا";
 const rec=details(v);
 const limited=["talkcraft","explainer","onetake"].includes(v.source),allow=v.status==="available-native"||v.status==="rendered-persian";
 $("#inspectTags").innerHTML=`<span>${escapeHtml(allow?"داخل موتور / دارای نمونه":"الگوی مرجع")}</span><span>${escapeHtml(v.source)}</span><span>${escapeHtml(v.id)}</span>`;
 $("#inspectDisclaimer").textContent=limited?"این پروژه مجوز استفادهٔ غیرتجاری دارد. این تصویر، بازآفرینی مستقلِ مفهومی است و سورس خارجی منتقل نشده است.":native?"ویدیوی اصلیِ فارسی با موتور پروژه تولید شده است. صدا در خود فایل MP4 قرار دارد.":"این حرکت، پیش‌نمایش مستقلِ مفهومی است؛ برای اجرای دقیق دستور اصلی باید افکت در موتور ساخته و تست شود.";
 $("#promptPanel").hidden=true;
 $("#viewOriginal").href=v.sourceUrl||"https://github.com/AmBplus/persiandoodle";
}
function play(){
 const c=state.categories.find(c=>c.id===state.active),f=state.family,v=state.variant;
 if(!c||!f||!v)return;
 state.playCancel?.();stopSound();
 if(isNativeVideo(v)){const video=$("#inspectVideo");video.currentTime=0;video.muted=!state.sound;video.play().catch(()=>{});return}
 if(c.id==="music"){$("#assetAudio").currentTime=0;$("#assetAudio").muted=!state.sound;$("#assetAudio").play().catch(()=>{});return}
 state.playCancel=playSignature($("#inspectCanvas"),c,f,v,$("#playPreview"));
 playStudioSound(c,f,v);
}
function roleForCategory(id,v){
 if(id==="font")return"typography";
 if(id==="music")return"music";
 if(id==="sound")return"sound";
 if(id==="background")return"background";
 if(id==="pen")return"pen";
 if(id==="style")return"style";
 if(id==="transition")return"transition";
 if(["opening","typography","entrance"].includes(id))return"entrance";
 return"animation";
}
function addSelected(){
 if(!state.variant)return;
 const v=state.variant,c=state.categories.find(x=>x.id===state.active),orig=details(v);
 const record={...orig,id:v.id,source:v.source,kind:c.id==="font"?"font":c.id==="music"||c.id==="sound"?"audio":c.id==="style"?"style":"shot",
 titleFa:state.family.name,name:v.name,status:v.status};
 addToScene(record,roleForCategory(c.id,v));openComposer();
 $("#sceneStatus").textContent="«"+state.family.name+"» به ترکیب صحنه اضافه شد.";
}
async function prompt(){
 const v=state.variant,cat=state.categories.find(c=>c.id===state.active),f=state.family;if(!v)return;
 $("#promptPanel").hidden=false;
 const explanation=explanations[cat.id]||"";
 let source="";
 if(v.source==="mg"){
  try{source=await fetch("./vendor/mg-styles-15/prompts/"+v.name+".md").then(r=>r.ok?r.text():"");}catch{}
 }else if(v.source==="shotcraft"){
  const rec=details(v),raw=rec.sourceUrl?.replace("https://github.com/Vincentwei1021/video-shotcraft/blob/main/","");
  if(raw)try{source=await fetch("./vendor/video-shotcraft/"+raw).then(r=>r.ok?r.text():"");}catch{}
 }
 const limited=["talkcraft","onetake","explainer"].includes(v.source);
 $("#promptText").value=`هدف: اجرای یک نمونهٔ حرفه‌ای فارسی از «${f.name}» در دستهٔ ${cat.title}.
${explanation}
متن فارسی: «زیباییِ فارسی در حرکت».
الزامات: متن کاملاً فارسی و راست‌به‌چپ، تنوع حرکت واقعی، قاعدهٔ دو نمونه برای هر خانواده، موسیقی/افکت هماهنگ، نمونهٔ MP4 و مشبک فریم.
شناسه منبع: ${v.id}
وضعیت حقوقی: ${limited?"ارجاع فقط؛ پیاده‌سازی مستقل بدون کپی منبع غیرتجاری":"مطالعه مجوز منبع و بازآفرینی فارسی"}
${source?"\n--- دستور اصلی دارای مجوز بازتوزیع ---\n"+source:"\nبرای دستور کامل مرجع به لینک منبع اصلی برو؛ جزئیات دارای مجوز غیرتجاری را کپی نکن."}`;
}
function openComposer(){
 $("#composer").hidden=false;$("#drawerScrim").hidden=false;$("#composerCount").textContent=$$("#sceneSlots .chosen").filter(x=>!x.textContent.includes("انتخاب")).length.toLocaleString("fa-IR");
}
function closeComposer(){$("#composer").hidden=true;$("#drawerScrim").hidden=true;location.hash=""}
function events(){
 $("#searchFamily").addEventListener("input",e=>{state.search=e.target.value.toLowerCase();renderFamilies()});
 $("#globalSearchButton").addEventListener("click",()=>{$("#searchFamily").focus()});
 document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#searchFamily").focus()}
  if(e.key==="Escape"){closeComposer();$("#inspector").classList.remove("is-open");$("#archiveDialog").close?.()}
 });
 $("#playPreview").addEventListener("click",play);
 $("#toggleSound").addEventListener("click",()=>{
  state.sound=!state.sound;setSoundOn(state.sound);
  const b=$("#toggleSound");b.textContent=state.sound?"◖)) صدا روشن":"◖ صدا خاموش";
  b.setAttribute("aria-pressed",String(state.sound));$("#inspectVideo").muted=!state.sound;$("#assetAudio").muted=!state.sound;
 });
 $("#fontSample").addEventListener("input",e=>{$("#fontRender").textContent=e.target.value});
 $("#addSelected").addEventListener("click",addSelected);
 $("#promptSelected").addEventListener("click",prompt);
 $("#copyPrompt").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText($("#promptText").value);$("#copyPrompt").textContent="کپی شد ✓"}
  catch{$("#promptText").focus();$("#promptText").select()}
 });
 $("#closeInspector").addEventListener("click",()=>$("#inspector").classList.remove("is-open"));
 $("#composerToggle").addEventListener("click",openComposer);
 $("#closeComposer").addEventListener("click",closeComposer);
 $("#drawerScrim").addEventListener("click",closeComposer);
 $("#showAllReferences").addEventListener("click",()=>$("#archiveDialog").showModal());
}
async function init(){
 events();mountComposer();
 try{
  const [featured,raw]=await Promise.all([
   fetch("./data/featured.json",{cache:"no-cache"}).then(r=>r.json()),
   fetch("./data/catalog.json").then(r=>r.json())
  ]);
  if(!Array.isArray(featured.categories)||!raw.entries)throw Error("فهرست ناقص است");
  state.categories=featured.categories;state.catalog=new Map(raw.entries.map(x=>[x.id,x]));
  const selected=new URLSearchParams(location.search).get("category");
  selectCategory(state.categories.some(x=>x.id===selected)?selected:"typography");
 }catch(err){$("#familyGrid").innerHTML='<p class="empty">فهرست بارگذاری نشد. صفحه را دوباره بارگذاری کنید.</p>';console.error(err)}
}
init();
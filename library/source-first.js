import {faTitle,faDescription} from "./localization.js";
const $=q=>document.querySelector(q),all=q=>[...document.querySelectorAll(q)];
const t={shotcraft:"ویدیو شات‌کرافت",mg:"۱۵ سبک موشن",talkcraft:"ویدیو تاک‌کرافت",explainer:"توضیح تصویری",onetake:"وان‌تیک",native:"قلم و فونت"};
const groups={designs:"طرح‌های آماده",components:"کامپوننت‌ها"};
const catFa={all:"همهٔ مدل‌ها",typography:"تایپوگرافی",interaction:"تعامل",transitions:"ترنزیشن",camera:"دوربین",data:"داده و نمودار",entrance:"ورود عناصر",rhythm:"ریتم و تدوین",light:"نور و تأکید",opening:"شروع و هویت",outro:"پایان",effects:"افکت‌ها",style:"سبک‌های هنری",talkcraft:"موشن گفتاری",explainer:"روایت آموزشی",onetake:"حرکت پیوسته",music:"موسیقی",sound:"افکت صوتی",font:"فونت‌های فارسی",pen:"قلم و نوشتن"};
const synonyms={opening:"شروع",brand:"هویت",typography:"تایپوگرافی",text:"متن",data:"داده",camera:"دوربین",transition:"ترنزیشن",interaction:"تعامل",rhythm:"ریتم",light:"نور",outro:"پایان",ui:"رابط کاربری",shot:"نما",motion:"حرکت",effect:"افکت",style:"سبک",sfx:"افکت صوتی",bgm:"موسیقی",impact:"ضربه",whoosh:"عبور",riser:"اوج‌گیر",paper:"کاغذ",film:"فیلم",glass:"شیشه",mech:"مکانیکی",font:"فونت",audio:"صدا",writing:"نوشتن",drawing:"ترسیم",music:"موسیقی",subtitle:"زیرنویس",title:"عنوان",animated:"متحرک",camera:"دوربین",beat:"ضرباهنگ",color:"رنگ",zoom:"بزرگ‌نمایی",hand:"دست",pen:"قلم"};
// Human-readable Persian facets. Raw source tags remain unchanged for filtering.
const extraTagFa={"对比":"مقایسه","论点":"دیدگاه","列举":"فهرست‌سازی","数据":"داده","例证":"نمونه و شاهد","引用":"نقل‌قول","钩子":"قلاب آغازین","标题":"عنوان","转场":"گذار صحنه","转折":"تغییر مسیر","强调":"تأکید","章节":"فصل‌بندی","过程演示":"نمایش فرایند","自我介绍":"معرفی خود","介绍他人":"معرفی افراد","选择":"انتخاب","金句":"جملهٔ کلیدی","步骤":"مراحل","氛围":"فضاسازی","定义":"تعریف","结尾":"پایان‌بندی","空间叙事":"روایت فضایی","时间地点":"زمان و مکان","机制":"سازوکار","号召":"فراخوان","设问":"پرسش",
"effects":"افکت","ui-entrance":"ورود رابط","counter":"شمارنده","crowd":"جمعیت","fluid":"سیال","scifi":"علمی‌تخیلی","camera":"دوربین","transition":"انتقال","riser":"اوج‌گیر","mech":"مکانیکی","typography":"تایپوگرافی","interaction":"تعامل","rhythm":"ریتم","opening":"آغاز","data":"داده","outro":"پایان","bgm":"موسیقی پس‌زمینه","sfx":"افکت صوتی"};
const concepts={
"تایپوگرافی":"تمرکز بر نحوهٔ ظاهرشدن و حرکت عنوان، با حفظ شکل اتصال حروف فارسی و خوانایی.",
"داده و نمودار":"نمایش آمار و مقایسه با اندازه‌گذاری صحیح، مکث خوانا و انتقال هماهنگ.",
"تعامل":"حرکت اجزا در پاسخ به یک کنش واقعی کاربر و با رابطهٔ علت و معلول.",
"ترنزیشن":"اتصال هدفمند دو نمای مختلف از طریق عنصر مشترک، پوشش تصویر یا حرکت دوربین.",
"دوربین":"حرکت فضایی یا تغییر نقطهٔ دید همراه کنترل کادربندی و عمق.",
"سبک طراحی":"بافت، رنگ، حرکت و ویژگی‌های بصری مشخص یک خانوادهٔ هنری.",
"حرکت پیوسته":"حفظ استمرار شیء و دوربین بین چند لحظه، بدون جهش غیرمنطقی.",
"گفتار و موشن":"تاکیدهای تصویری منطبق با ریتم واژه و ساختار گفتار."
};
const escapeHtml=x=>String(x??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const norm=x=>String(x??"").normalize("NFKC").toLocaleLowerCase("en");
const prs=n=>Number(n).toLocaleString("fa-IR");
const sourceName=x=>t[x]||x;
const faTag=x=>extraTagFa[x]||synonyms[norm(x)]||x;
const modelIcon=x=>({shot:"◫",style:"◈",motion:"↝",explainer:"☷",font:"آ",pen:"✒",music:"♫",sfx:"♪"})[x.kind]||"◈";
let S={section:"designs",source:"",cat:"all",tag:"",q:"",sort:"source",visible:36,items:[],selection:[],current:null,variant:0,cache:new Map(),audio:null,renderManifest:null};
function classify(x){
 if(x.kind==="music"||x.kind==="sfx"||x.kind==="font"||x.kind==="pen"||x.source==="onetake")return"components";
 return"designs";
}
function categoryOf(x){
 if(x.kind==="music")return"music";
 if(x.kind==="sfx")return"sound";
 if(x.kind==="font")return"font";
 if(x.kind==="pen")return"pen";
 if(x.source==="mg")return"style";
 if(x.source==="talkcraft")return"talkcraft";
 if(x.source==="explainer")return"explainer";
 if(x.source==="onetake")return"onetake";
 const v=(x.category||"")+" "+(x.tags||[]).join(" ")+" "+x.name;
 if(/تایپو|typograph|title|typewriter|word|letter|font/i.test(v))return"typography";
 if(/داده|نمودار|chart|counter|gauge|axis|stat|metric/i.test(v))return"data";
 if(/ترنزیشن|transition|wipe|morph|cut/i.test(v))return"transitions";
 if(/دوربین|camera|zoom|dolly|tilt|perspective/i.test(v))return"camera";
 if(/تعامل|interaction|cursor|click|palette|input/i.test(v))return"interaction";
 if(/نور|light|glow|shine|spotlight/i.test(v))return"light";
 if(/ریتم|beat|rhythm|montage|timing/i.test(v))return"rhythm";
 if(/پایان|outro|ending/i.test(v))return"outro";
 if(/شروع|opening|brand|logo|launch/i.test(v))return"opening";
 if(/ورود|entrance|build|assemble|flyin|stack/i.test(v))return"entrance";
 return"effects";
}
function itemTitle(x){
 if(x.kind==="pen")return x.titleFa;
 if(x.kind==="music"||x.kind==="sfx"){return x.titleFa&&/[\u0600-\u06ff]/.test(x.titleFa)?x.titleFa:faTag(x.category)+" · "+x.slug.replace(/-/g," ")}
 if(x.kind==="font")return x.titleFa||x.name;
 return faTitle(x);
}
function record(x){
 const title=itemTitle(x),tags=[...new Set([...(x.tags||[]),categoryOf(x)])];
 return{...x,section:classify(x),facet:categoryOf(x),titleFaDisplay:title,tags,variants:x.styleVariants?.length?x.styleVariants.map((name,i)=>({name,url:i===0?x.preview:null})):x.variants||[{name:x.name,url:x.preview||null}]};
}
function initData(cat,audio,shots,visuals,manifest){
 S.renderManifest=manifest;
 const shotIndex=new Map(shots.items.map(item=>[item.id,item]));
 const arr=cat.entries.filter(x=>!["example","audio"].includes(x.kind)&&x.source!=="native").map(x=>{
  const visual=visuals.entries[x.id];
  if(visual)x={...x,remotePoster:visual.image,remoteVideo:visual.video};
  const upstream=shotIndex.get(x.id);
  if(!upstream)return record(x);
  return record({...x,styleVariants:[],category:x.category||upstream.category,
   tags:[...new Set([...(x.tags||[]),...(upstream.tags||[])])],
   sourceUrl:upstream.sourceUrl,promptUrl:upstream.promptUrl,
   use:upstream.use,intention:upstream.intention,duration:upstream.duration,energy:upstream.energy,
   variants:upstream.styles.map((st,i)=>({
    name:faTitle({name:st.key,kind:"shot",source:"shotcraft"})+" · "+(i+1).toLocaleString("fa-IR"),
    key:st.key,url:st.preview,poster:st.poster||null,description:st.description,
    originalName:st.name
   }))
  });
 });
 for(const x of cat.entries.filter(x=>x.kind==="font"&&x.source==="native"))arr.push(record({...x,titleFa:x.name.replace(/-(Regular|Variable)$/,""),kind:"font"}));
 for(const x of audio.tracks)arr.push(record({...x,name:x.slug,source:"shotcraft",kind:x.kind,category:x.category,tags:[...(x.tags||[]),x.category],variants:[{name:x.slug,url:x.playUrl}]}));
 for(const [slug,name] of [["qalam","قلم نی"],["fountain","خودنویس"],["pencil","مداد"],["brush","قلم‌مو"]])arr.push(record({id:"native/pen/"+slug,source:"native",kind:"pen",titleFa:name,name:slug,status:"available-native",tags:["pen","handwriting"],sourceUrl:"https://github.com/AmBplus/persiandoodle/blob/main/skills/anidoodle/engine/src/canvas-core/persianSceneKit.ts"}));
 const seen=new Set();S.items=arr.filter(x=>{const key=x.id;if(seen.has(key))return false;seen.add(key);return true});
 $("#countDesigns").textContent=prs(S.items.filter(x=>x.section==="designs").length);
 $("#countComponents").textContent=prs(S.items.filter(x=>x.section==="components").length);
}
function baseSet(){return S.items.filter(x=>x.section===S.section&&(!S.source||S.source===x.source))}
function filtered(){
 let arr=baseSet().filter(x=>(S.cat==="all"||x.facet===S.cat)&&(!S.tag||x.tags.includes(S.tag)));
 if(S.q){const q=norm(S.q);arr=arr.filter(x=>norm([x.name,x.titleFaDisplay,x.category,x.description,x.id,x.tags.join(" "),x.source,x.artist].join(" ")).includes(q))}
 if(S.sort==="title")arr.sort((a,b)=>a.titleFaDisplay.localeCompare(b.titleFaDisplay,"fa"));
 else if(S.sort==="category")arr.sort((a,b)=>a.facet.localeCompare(b.facet,"en"));
 return arr;
}
function refreshFilters(){
 const options=[...new Set(S.items.filter(x=>x.section===S.section).map(x=>x.source))];const source=$("#sourceFilter");
 source.innerHTML='<option value="">همهٔ کتابخانه‌ها</option>';
 for(const s of options){const o=document.createElement("option");o.value=s;o.textContent=sourceName(s);source.append(o)}
 if(options.includes(S.source))source.value=S.source;else{S.source="";source.value=""}
 const menu=$("#categoryNav"),mobile=$("#mobileNav");menu.replaceChildren();mobile.replaceChildren();
 const arr=baseSet(),cats=[...new Set(arr.map(x=>x.facet))];
 for(const id of ["all",...Object.keys(catFa).filter(x=>cats.includes(x))]){
  if(id!=="all"&&!cats.includes(id))continue;
  const count=id==="all"?arr.length:arr.filter(x=>x.facet===id).length;
  const item=document.createElement("button");item.type="button";item.className=S.cat===id?"selected":"";item.dataset.category=id;
  item.innerHTML='<span class="category-icon">'+(id==="all"?"▦":({typography:"آ",music:"♫",sound:"♪",camera:"◉",transitions:"⇄",font:"ف",pen:"✒"})[id]||"◈")+'</span><span>'+escapeHtml(catFa[id])+'</span><span class="cat-count">'+prs(count)+'</span>';
  item.addEventListener("click",()=>selectCat(id));menu.append(item);
  const sm=document.createElement("button");sm.type="button";sm.textContent=catFa[id];sm.dataset.category=id;sm.className=S.cat===id?"active":"";sm.addEventListener("click",()=>selectCat(id));mobile.append(sm);
 }
 if(S.cat!=="all"&&!cats.includes(S.cat))S.cat="all";
 renderTags();
}
function renderTags(){
 const tags=new Map();for(const x of baseSet().filter(x=>S.cat==="all"||x.facet===S.cat))for(const tag of x.tags)tags.set(tag,(tags.get(tag)||0)+1);
 const list=[...tags].sort((a,b)=>b[1]-a[1]).slice(0,42);const wrap=$("#tagStrip");wrap.replaceChildren();
 const vals=[["","همهٔ تگ‌ها"],...list.map(([v,n])=>[v,faTag(v)+" · "+prs(n)])];
 for(const [v,label] of vals){const b=document.createElement("button");b.type="button";b.textContent=label;b.className=S.tag===v?"active":"";
 b.addEventListener("click",()=>{S.tag=S.tag===v?"":v;S.visible=36;renderTags();renderGallery()});wrap.append(b)}
}
function selectCat(id){S.cat=id;S.tag="";S.visible=36;refreshFilters();renderGallery();}
function selectSection(section){
 S.section=section;S.source="";S.cat="all";S.tag="";S.q="";S.visible=36;$("#searchInput").value="";
 all(".tab").forEach(x=>{const active=x.dataset.section===section;x.classList.toggle("active",active);x.setAttribute("aria-selected",String(active))});
 $("#pageTitle").textContent=section==="designs"?"طرح‌های آماده و پرامپت‌ها":"کامپوننت‌ها و ابزارهای آماده";
 $("#pageDescription").textContent=section==="designs"?"تمام مدل‌های کتابخانه‌های اصلی؛ پرامپت فارسی، نسخهٔ منبع و نمونه‌های متنوع هر طرح. هیچ سقف دو مدلی وجود ندارد.":"موسیقی، افکت صوتی، فونت، قلم و تکنیک‌های قابل ترکیب؛ فیلتر منبع و تگ برای انتخاب سریع.";
 refreshFilters();renderGallery();
}
// Public playback uses only audited files within this project's media tree.
function localPath(path){
 if(typeof path!=="string"||!/^media\/[a-z0-9][a-z0-9/_-]*\.(?:mp4|webm|webp|jpg|jpeg|png|mp3|ogg)$/i.test(path)||path.includes(".."))return null;
 return "./"+path;
}
function ownedVariant(x,variant=0){
 const entry=S.renderManifest?.renders?.[x.id]?.variants?.[variant];
 return ["rendered-persian","verified","published"].includes(entry?.status) ? entry : null;
}
function localMedia(x,variant=0){return localPath(ownedVariant(x,variant)?.video)}
function audioPublished(x){return Boolean(localPath(S.renderManifest?.audio?.[x.id]?.preview))}
function originalMedia(x,variant=0){
 if(x.kind==="music"||x.kind==="sfx")return localPath(S.renderManifest?.audio?.[x.id]?.preview);
 return localMedia(x,variant);
}
function poster(x,variant=S.variant){
 return localPath(ownedVariant(x,variant)?.poster)||localPath(ownedVariant(x,variant)?.thumbnail);
}
function art(x){
 if(x.kind==="music"||x.kind==="sfx")return'<div class="cover-muted"><span class="icon">♫</span><span class="source-mark">'+escapeHtml(x.kind==="music"?"موسیقی مرجع":"افکت صوتی مرجع")+'</span></div>';
 const image=poster(x,0),video=localMedia(x,0);
 if(image)return '<img loading="lazy" alt="" src="'+escapeHtml(image)+'">';
 if(video)return '<video muted loop playsinline preload="metadata" data-preview="'+escapeHtml(video)+'" aria-label="پیش‌نمایش واقعی مدل مرجع"></video>';
 return '<div class="cover-muted"><span class="icon">'+modelIcon(x)+'</span><span class="source-mark">'+escapeHtml(sourceName(x.source))+'</span></div>';
}
function renderGallery(){
 const arr=filtered(),gallery=$("#gallery");gallery.replaceChildren();
 $("#resultCount").textContent=prs(arr.length)+" مدل";
 $("#resultSubtitle").textContent=S.source?sourceName(S.source):groups[S.section];
 $("#empty").hidden=arr.length>0;
 for(const x of arr.slice(0,S.visible)){
  const el=document.createElement("article");el.className="model"+(S.current?.id===x.id?" active":"")+(x.kind==="sfx"||x.kind==="music"?" audio-model":(x.source!=="native"&&!localMedia(x,0)&&!poster(x,0)?" reference-only":""));
  const orig=x.source!=="native";
  el.innerHTML='<div class="model-cover">'+art(x)+'<span class="badge">'+escapeHtml(x.kind==="music"||x.kind==="sfx"?(audioPublished(x)?"صدای داخلی تأییدشده":"صدای مرجع، فاقد رندر داخلی"):orig?(localMedia(x,0)?"رندر فارسی":"در انتظار رندر فارسی"):"ابزار قلم")+'</span>'+(x.variants.length>1?'<span class="variants-pill">'+prs(x.variants.length)+' مدل اجرایی</span>':"")+'</div>'+
  '<div class="model-body"><h3>'+escapeHtml(x.titleFaDisplay)+'</h3><p>'+escapeHtml(x.category||catFa[x.facet]||"")+'</p>'+((x.source!=="native"&&!localMedia(x,0)&&!poster(x,0)&&x.kind!=="music"&&x.kind!=="sfx")?'<div class="reference-summary">'+escapeHtml(String(x.variants[0]?.description||x.description||"مدل مرجع").slice(0,160))+'</div><div class="reference-label">مرجع اصلی · بدون رندر فارسی تأییدشده</div>':'')+'<div class="model-bottom"><span class="source-logo">'+escapeHtml(sourceName(x.source))+'</span><button type="button">مشاهده و انتخاب ←</button></div></div>';
  el.querySelector("button").addEventListener("click",()=>detail(x));
  const cover=el.querySelector(".model-cover"),motion=cover.querySelector("video[data-preview]");
  if(motion){
   cover.addEventListener("mouseenter",()=>{if(!motion.src)motion.src=motion.dataset.preview;motion.play().catch(()=>{})});
   cover.addEventListener("mouseleave",()=>{motion.pause();motion.currentTime=0});
   cover.addEventListener("focusin",()=>{if(!motion.src)motion.src=motion.dataset.preview;motion.play().catch(()=>{})});
   cover.addEventListener("focusout",()=>motion.pause());
  }
  cover.addEventListener("click",()=>detail(x));
  gallery.append(el);
  // Display only locally verified renders, never synthetic placeholders.
  // External sources stay as references, never imported as gallery video.
  if(motion){
   const io=new IntersectionObserver(entries=>{
    if(!entries[0].isIntersecting)return;
    io.disconnect();
    if(!motion.src)motion.src=motion.dataset.preview;
    motion.addEventListener("loadedmetadata",()=>{
     if(Number.isFinite(motion.duration)&&motion.duration>0)motion.currentTime=Math.min(.85,motion.duration*.25);
    },{once:true});
   },{rootMargin:"180px"});
   io.observe(cover);
  }
 }
 const more=$("#showMore");more.hidden=arr.length<=S.visible;
 more.textContent="نمایش "+prs(Math.min(36,arr.length-S.visible))+" مدل دیگر ↓";
}
function originalPromptPath(x){
 return S.renderManifest?.renders?.[x.id]?.variants?.[S.variant]?.originalPromptPath||null;
}
function localizationPath(x){
 return S.renderManifest?.renders?.[x.id]?.variants?.[S.variant]?.localization||null;
}
function sourceDocumentUrl(x){
 return S.renderManifest?.renders?.[x.id]?.variants?.[S.variant]?.originalPromptUrl||x.sourceUrl||"";
}
function originalRawUrl(x,index){
 const url=S.renderManifest?.renders?.[x.id]?.variants?.[index]?.originalPromptUrl||x.sourceUrl||"";
 if(!url.startsWith("https://github.com/")||![".md",".tsx",".ts",".json"].some(ext=>url.endsWith(ext)))return null;
 return url.replace("https://github.com/","https://raw.githubusercontent.com/").replace("/blob/main/","/main/");
}
async function loadExactOriginal(x,index){
 const path=S.renderManifest?.renders?.[x.id]?.variants?.[index]?.originalPromptPath;
 const url=path?"./"+path:originalRawUrl(x,index);
 if(!url)return null;
 const response=await fetch(url);
 if(!response.ok)throw Error("Original source unavailable: "+response.status);
 return response.text();
}
function variants(x){
 const holder=$("#variants");holder.replaceChildren();$("#variantCount").textContent=prs(x.variants.length)+" مدل";
 for(const [i,v] of x.variants.entries()){const b=document.createElement("button");b.type="button";b.className=i===S.variant?"active":"";
  b.textContent=(v.name||x.name).replaceAll("-"," ");b.addEventListener("click",()=>{S.variant=i;updatePreview();variants(x);$("#promptBox").hidden=true});
  holder.append(b);
 }
}
function showAudio(x){
 const el=$("#mediaAudio"),player=$("#audioPlayer"),kind=x.kind==="music"||x.kind==="sfx";
 el.hidden=!kind;player.pause();player.removeAttribute("src");player.load();
 if(!kind)return;
 const audio=originalMedia(x);if(audio){player.src=audio;player.load()}
 else player.removeAttribute("controls");
 if(audio)player.setAttribute("controls","");
  $("#rightsNote").textContent=audio?"صدای داخلی پروژه":"نسخهٔ داخلی صدا هنوز آماده نیست.";
}
async function showFont(x){
 const el=$("#fontTester");el.hidden=x.kind!=="font";
 if(el.hidden)return;
 const path="../skills/anidoodle/engine/assets/fonts/"+x.name+".ttf";
 const name="font-"+x.name.replace(/[^\w-]/g,"");const d=$("#fontDisplay");
 try{
  const face=new FontFace(name,`url("${path}")`);
  await face.load();document.fonts.add(face);if(S.current?.id===x.id)d.style.fontFamily='"'+name+'",Vazirmatn';
 }catch{d.style.fontFamily="Vazirmatn"}
 d.textContent=$("#fontText").value;
}
function updatePreview(){
 const x=S.current,v=S.variant,video=$("#previewVideo"),img=$("#previewImage"),empty=$("#previewEmpty");
 video.pause();video.removeAttribute("src");video.load();
 const media=originalMedia(x,v);
 const playable=Boolean(media)&&(x.kind!=="music"&&x.kind!=="sfx");
 const separate=$("#sampleSound"),player=$("#sampleSoundPlayer");
 player.pause();player.removeAttribute("src");player.load();
 separate.hidden=!playable;
 if(playable){player.src=media;player.load();$("#sampleSoundStatus").textContent="در این بخش فقط صدای فایل ویدیوی انتخاب‌شده پخش می‌شود؛ اگر نمونه فاقد ترک صوتی باشد، پلیر آن را نشان می‌دهد.";}

 const originalLink=$("#originalPreviewLink"),originUrl=x.variants[v]?.url||x.remoteVideo||"";
 originalLink.hidden=!/^https:\/\//.test(originUrl);if(!originalLink.hidden)originalLink.href=originUrl;
 const still=poster(x,v);
 video.hidden=!playable;img.hidden=!!playable||!still;empty.hidden=!!playable||!!still;
 if(!playable&&still)img.src=still;
 if(playable){video.src=media;video.poster=still||"";video.load();}
  $("#previewStatus").textContent=playable?"رندر فارسیِ تاییدشده":still?"پوستر فارسی داخلی":"رندر فارسی هنوز آماده نیست";
  $("#detailCaveat").textContent=playable?"نسخهٔ فارسی در خود پروژه میزبانی شده است.":"این مدل هنوز رندر فارسیِ منتشرشده ندارد؛ مرجع خارجی در سایت پخش نمی‌شود.";
}
function detail(x){
 S.current=x;S.variant=0;
 $("#detailTitle").textContent=x.titleFaDisplay;
 $("#detailCategory").textContent=sourceName(x.source)+" / "+(catFa[x.facet]||x.category||"");
 $("#detailDescription").textContent=(x.description&&/[\u0600-\u06ff]/.test(x.description))?x.description:(concepts[x.category]||catFa[x.facet]||"دستور ساخت و مدل اصلی در جزئیات مرجع موجود است.");
 const metas=[sourceName(x.source),...(x.tags||[]).slice(0,6).map(faTag)];
 $("#detailMeta").innerHTML=metas.map(v=>'<span>'+escapeHtml(v)+'</span>').join("");
 $("#promptBox").hidden=true;
 variants(x);updatePreview();showAudio(x);showFont(x);renderGallery();
 $("#detail").classList.add("open");
}
async function prompt(){
 const x=S.current;if(!x)return;
 const index=S.variant;
 $("#promptBox").hidden=false;
 const output=$("#promptText"),localization=$("#localizationText");
 const loc=localizationPath(x);
 output.value="در حال بارگذاری متن اصلی، بدون بازنویسی…";
 localization.value="در حال بارگذاری نگاشت متن داخل تصویر…";
 $("#sourceLink").href=sourceDocumentUrl(x)||"https://github.com/AmBplus/persiandoodle";
 $("#sourceLink").textContent="مشاهدهٔ سند اصلی (بدون تغییر) ↗";
 if(loc){try{const response=await fetch("./"+loc);if(!response.ok)throw Error(String(response.status));const data=await response.json();if(S.current===x&&S.variant===index)localization.value=JSON.stringify(data,null,2)}catch{if(S.current===x&&S.variant===index)localization.value="نگاشت فارسی هنوز در دسترس نیست."}}
 try{const original=await loadExactOriginal(x,index);if(S.current===x&&S.variant===index)output.value=original??"در منبع اصلی این مدل، سند متنیِ مستقل ثبت نشده است. از پیوند منبع برای بررسی رسانهٔ اصلی استفاده کنید."}
 catch{if(S.current===x&&S.variant===index)output.value="متن اصلی از سرور مرجع قابل بارگیری نبود؛ دستور حدسی تولید نشده است. از پیوند منبع اصلی استفاده کنید."}
}
function selectedRecord(x){
 return{id:x.id,name:x.titleFaDisplay,source:x.source,kind:x.kind,category:x.facet,variant:x.variants[S.variant]?.name||null,sourceUrl:x.sourceUrl||null,license:x.license||null,implementation:x.source==="native"?"native":"reference",originalPromptPath:originalPromptPath(x),originalPromptUrl:sourceDocumentUrl(x),localizationPath:localizationPath(x),audio:x.playUrl||null};
}
async function saveSelection(){
 if(!S.current)return;
 const x=S.current,index=S.variant,next=selectedRecord(x);
 if(S.selection.some(item=>item.id===next.id&&item.variant===next.variant)){openDrawer();return}
 try{next.originalPrompt=await loadExactOriginal(x,index)}catch{next.originalPrompt=null}
 const loc=localizationPath(x);
 if(loc)try{const response=await fetch("./"+loc);if(response.ok)next.onScreenLocalization=await response.json()}catch{}
 S.selection.push(next);
 $("#selectionCount").textContent=prs(S.selection.length);openDrawer();renderSelection();
}
function outputScene(){
 return{schema:"persiandoodle/source-first-scene/v2",locale:"fa-IR",direction:"rtl",title:$("#sceneTitle").value,
  selections:S.selection,needsImplementation:S.selection.filter(x=>x.implementation!=="native").map(x=>x.id),
  policy:"Original references are not yet Persian-native renders. Rebuild selected motion independently, translate all on-frame text, verify output frames and rights. Mixkit samples may not be redistributed as standalone stock assets."};
}
function renderSelection(){
 $("#sceneSelections").replaceChildren();
 for(const item of S.selection){
  const row=document.createElement("div");row.className="selection";const info=document.createElement("span");
  const title=document.createElement("b");title.textContent=item.name;
  const small=document.createElement("small");small.textContent=sourceName(item.source)+" / "+item.kind;
  info.append(title,small);const remove=document.createElement("button");remove.textContent="حذف";remove.type="button";
  remove.addEventListener("click",()=>{S.selection=S.selection.filter(x=>x!==item);$("#selectionCount").textContent=prs(S.selection.length);renderSelection()});
  row.append(info,remove);$("#sceneSelections").append(row);
 }
 $("#sceneJSON").textContent=JSON.stringify(outputScene(),null,2);
}
function openDrawer(){$("#sceneDrawer").hidden=false;$("#overlay").hidden=false;renderSelection()}
function closeDrawer(){$("#sceneDrawer").hidden=true;$("#overlay").hidden=true}
async function copy(s){try{await navigator.clipboard.writeText(s);return true}catch{return false}}
function attach(){
 all(".tab").forEach(b=>b.addEventListener("click",()=>selectSection(b.dataset.section)));
 $("#sourceFilter").addEventListener("change",e=>{S.source=e.target.value;S.cat="all";S.tag="";S.visible=36;refreshFilters();renderGallery()});
 $("#searchInput").addEventListener("input",e=>{S.q=e.target.value;S.visible=36;renderGallery()});
 $("#sortSelect").addEventListener("change",e=>{S.sort=e.target.value;renderGallery()});
 $("#resetFilters").addEventListener("click",()=>{S.source="";S.cat="all";S.tag="";S.q="";$("#searchInput").value="";S.visible=36;refreshFilters();renderGallery()});
 $("#showMore").addEventListener("click",()=>{S.visible+=36;renderGallery()});
 $("#searchButton").addEventListener("click",()=>$("#searchInput").focus());
 document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#searchInput").focus()}if(e.key==="Escape"){closeDrawer();$("#detail").classList.remove("open")}});
 $("#showPrompt").addEventListener("click",prompt);
 $("#copyPrompt").addEventListener("click",async()=>{if(await copy($("#promptText").value))$("#copyPrompt").textContent="کپی شد ✓";else{$("#promptText").focus();$("#promptText").select()}});
 $("#addToScene").addEventListener("click",saveSelection);
 $("#closeDetail").addEventListener("click",()=>$("#detail").classList.remove("open"));
 $("#fontText").addEventListener("input",e=>$("#fontDisplay").textContent=e.target.value);
 $("#openScene").addEventListener("click",openDrawer);$("#closeScene").addEventListener("click",closeDrawer);$("#overlay").addEventListener("click",closeDrawer);
 $("#sceneTitle").addEventListener("input",renderSelection);
 $("#clearScene").addEventListener("click",()=>{S.selection=[];$("#selectionCount").textContent="۰";renderSelection()});
 $("#copyScene").addEventListener("click",async()=>{if(await copy(JSON.stringify(outputScene(),null,2)))$("#copyScene").textContent="کپی شد ✓"});
 $("#downloadScene").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(outputScene(),null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="persiandoodle-scene-v2.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),500)});
 $("#copyDirector").addEventListener("click",async()=>{const scene=outputScene();await copy("صحنهٔ فارسی زیر را بساز؛ از منابع و پرامپت‌های هر مورد استفاده کن، تمام نوشته‌ها را فارسی و طبیعی بازآفرینی کن، از ویدیوهای مرجع به جای خروجی استفاده نکن، و MP4 با صدای مجاز و مشبک فریم‌های QC تحویل بده.\n"+JSON.stringify(scene,null,2))});
}
async function init(){
 attach();try{const [catalog,audio,shots,visuals,manifest]=await Promise.all([fetch("./data/catalog.json").then(r=>r.json()),fetch("./data/source-audio.json").then(r=>r.json()),fetch("./data/shotcraft-full.json").then(r=>r.json()),fetch("./data/source-visuals.json").then(r=>r.json()),fetch("./data/persian-renders.json").then(r=>r.json())]);initData(catalog,audio,shots,visuals,manifest);selectSection("designs");
 }catch(e){console.error(e);$("#resultCount").textContent="خطا در بارگذاری داده‌ها";$("#empty").hidden=false;$("#empty").textContent="بارگذاری ناموفق بود؛ صفحه را دوباره بارگذاری کنید."}
}
init();

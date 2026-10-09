// Scene composer. Every choice retains its source ID and implementation status.
// Reference-only shots are included in the director brief, NEVER silently passed
// off as already implemented engine components.
import {faTitle} from "./localization.js";
const $=s=>document.querySelector(s);
const keys=["style","typography","background","entrance","animation","transition","music","sound","pen"];
const names={style:"سبک هنری",typography:"تایپوگرافی",background:"پس‌زمینه",entrance:"نوع ظاهرشدن",animation:"حرکت عناصر",transition:"انتقال صحنه",music:"موسیقی",sound:"صدای مکمل",pen:"مدل قلم"};
const defaults={background:{id:"native/background/warm-paper",name:"کاغذ گرم",status:"available-native"},
 pen:{id:"native/pen/qalam",name:"قلم نی",status:"available-native"}};
const choices={...defaults};
const backgroundOptions=[
 ["warm-paper","کاغذ گرم"],["blueprint","نقشهٔ آبی"],["parchment","کاغذ قدیمی"],["night-ink","مرکب شب"],["washi","کاغذ بافت‌دار"]
];
const penOptions=[["qalam","قلم نی"],["fountain","خودنویس"],["pencil","مداد"],["marker","ماژیک"],["brush","قلم‌مو"],["none","بدون قلم"]];
const roleFor=x=>{
 if(x.kind==="font")return "typography";
 if(x.kind==="audio")return x.name?.match(/^(piano|nocturne|fit|sampler|bgm)/i)||x.category==="موسیقی و صدا"?"music":"sound";
 if(x.kind==="style"||x.kind==="recipe")return "style";
 if(/transition|wipe|cut|morph/.test(x.id))return "transition";
 if(/typography|opening|entrance|title|type|intro/.test(x.id))return "entrance";
 return "animation";
};
function entry(x){return{id:x.id,name:faTitle(x),status:x.status,source:x.source,sourceUrl:x.sourceUrl||"",license:x.license||""};}
const special=(role,id,title)=>({id:"native/"+role+"/"+id,name:title,status:"available-native",source:"native",license:"original",sourceUrl:""});
const supports=(x)=>x?.status==="available-native"||x?.status==="rendered-persian";
export function addToScene(item,role){
 choices[role||roleFor(item)]=entry(item);
 refresh();
 location.hash="composer";
}
function value(role,x){choices[role]=x;refresh();}
export function getSceneSpec(){
 const text=$("#writingText")?.value?.trim()||"ایده‌ها با قلم جان می‌گیرند";
 const parts=Object.fromEntries(keys.map(k=>[k,choices[k]||null]));
 const missing=keys.filter(k=>!parts[k]);
 const notNative=keys.filter(k=>parts[k]&&!supports(parts[k]));
 return{
  schema:"persiandoodle/scene-selection/v1",locale:"fa-IR",direction:"rtl",
  title:"صحنهٔ طراحی فارسی",text,durationSeconds:6,fps:30,format:{width:1280,height:720},
  selections:parts,
  implementation:{missingSlots:missing,referenceComponents:notNative,
   readyForNativeRender:!notNative.length},
  directorNotes:"از عناصر انتخابی یک صحنهٔ یکپارچه و سینمایی بساز؛ معنای متن، هم‌خوانی حرکت، کنتراست، مجوز و همگامی صدا را حفظ کن. برای موارد مرجع، یک پیاده‌سازی مستقل فارسی طراحی و تست کن؛ هرگز نمای چینی/انگلیسی یا سورس غیرتجاری را کپی نکن."
 };
}
function prompt(spec){
 const slots=keys.filter(k=>spec.selections[k]).map(k=>`• ${names[k]}: ${spec.selections[k].name} [${spec.selections[k].id}] (${supports(spec.selections[k])?"موجود":"نیازمند بازسازی"})`).join("\n");
 return `یک صحنهٔ موشن حرفه‌ای فارسی بر اساس ترکیب زیر در موتور PersianDoodle تولید کن.
متن اصلی: «${spec.text}»
زبان: فارسی ایران، راست به چپ؛ اندازه ۱۲۸۰×۷۲۰؛ ۳۰ فریم؛ شش ثانیه.
${slots}

روند اجرا: ابتدا فهرست catalog.json و پرامپت‌های انتخاب‌شده از کتابخانه را بخوان، سپس سناریوی منسجم و مسیر حرکت را تعیین کن. متن را با shaping صحیح فارسی و نیم‌فاصله بنویس. موسیقی/صدای قلم را به فریم‌های تماس واقعی سینک کن. نمونه‌های صرفاً مرجع را مستقلاً برای فارسی پیاده کن. در آخر فریم‌های میانی، نقاط، انتقال‌ها و صدای خروجی را بررسی و فیلم MP4 و contact sheet واقعی تحویل بده.
JSON مشخصات:
${JSON.stringify(spec,null,2)}`;
}
function buildSlots(){
 const el=$("#sceneSlots");el.replaceChildren();
 for(const k of keys){
  const outer=document.createElement("div");outer.className="slot";
  const label=document.createElement("strong");label.textContent=names[k];outer.append(label);
  if(["background","pen"].includes(k)){
   const select=document.createElement("select");select.setAttribute("aria-label",names[k]);
   const list=k==="pen"?penOptions:backgroundOptions;
   for(const [id,title] of list){const o=document.createElement("option");o.value=id;o.textContent=title;select.append(o);}
   select.value=choices[k]?.id?.split("/").at(-1)||list[0][0];
   select.addEventListener("change",()=>value(k,special(k,select.value,list.find(x=>x[0]===select.value)?.[1]||select.value)));
   outer.append(select);
  }else{
   const chip=document.createElement("span");chip.className="chosen";chip.textContent=choices[k]?.name||"از کارت‌های کتابخانه انتخاب کنید";
   outer.append(chip);
   if(choices[k]){
    const rm=document.createElement("button");rm.type="button";rm.title="حذف این انتخاب";rm.textContent="×";
    rm.className="remove-slot";rm.addEventListener("click",()=>{delete choices[k];refresh()});outer.append(rm);
   }
  }
  el.append(outer);
 }
}
function refresh(){
 buildSlots();
 const spec=getSceneSpec();
 $("#sceneOutput").value=JSON.stringify(spec,null,2);
 const notes=$("#sceneStatus");
 const pending=spec.implementation.referenceComponents.length;
 notes.textContent=pending?`${pending.toLocaleString("fa-IR")} جزء انتخابی هنوز فقط مرجع است؛ Agent باید پیاده‌سازی فارسی آن را انجام دهد.`:
 "ترکیب انتخابی از اجزای موجود تشکیل شده است. می‌توانید مشخصات را برای رندر تحویل دهید.";
}
const safeName=()=>"persiandoodle-scene-"+Date.now()+".json";
function download(){
 const blob=new Blob([JSON.stringify(getSceneSpec(),null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=safeName();a.click();
 setTimeout(()=>URL.revokeObjectURL(url),250);
}
export function mountComposer(){
 $("#sceneSlots").innerHTML="";
 for(const [k,o] of Object.entries(defaults))choices[k]=o;
 $("#downloadScene").addEventListener("click",download);
 $("#copySceneJSON").addEventListener("click",async()=>{
  const payload=JSON.stringify(getSceneSpec(),null,2);
  try{await navigator.clipboard.writeText(payload);
   $("#sceneStatus").textContent="JSON آماده شد؛ در GitHub Actions گزینهٔ Run workflow را بزن و در فیلد scene_json قرار بده.";
  }catch{
   $("#sceneOutput").value=payload;$("#sceneOutput").focus();$("#sceneOutput").select();
   $("#sceneStatus").textContent="JSON انتخاب شد؛ برای اجرا در GitHub Actions آن را کپی کن.";
  }
 });
 $("#copyScene").addEventListener("click",async()=>{
  const spec=getSceneSpec();
  try{await navigator.clipboard.writeText(prompt(spec));$("#sceneStatus").textContent="دستور ساخت صحنه در کلیپ‌بورد کپی شد.";}
  catch{$("#sceneOutput").value=prompt(spec);$("#sceneOutput").focus();$("#sceneOutput").select();$("#sceneStatus").textContent="متن انتخاب شد؛ آن را کپی کنید.";}
 });
 $("#resetScene").addEventListener("click",()=>{for(const k of keys)delete choices[k];Object.assign(choices,defaults);refresh()});
 $("#writingText").addEventListener("input",()=>$("#sceneOutput").value=JSON.stringify(getSceneSpec(),null,2));
 refresh();
}
export function chooseRole(item){
 const role=roleFor(item);
 addToScene(item,role);
 return names[role];
}
export {roleFor,names as roleNames};

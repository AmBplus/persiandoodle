// Eleven individually authored Persian re-imaginings of Apache-2.0 shot recipes.
// Each scene demonstrates a distinct motion *mechanism*. No upstream video
// frames are re-labelled; all typography is drawn natively, RTL in Canvas.
import type {Ctx,Env} from "./core";
import type {Film} from "./film";
import {drawPersianText} from "./persianText";
import {drawPersianTrace} from "./persianTrace";
import {persianFontFiles} from "./persianGallery";
import {paintPaper} from "./persianSceneKit";
import {styleScore} from "./persianMotionAudio";
const W=1280,H=720,SPAN=90,clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>{const p=clamp(x);return p*p*(3-2*p)};
const palettes=[["#f7f0e4","#24465a","#bc8859"],["#eaf2f7","#235879","#cf9362"],["#eef2ed","#32545a","#d0a068"],["#12283d","#f5e8d4","#dda977"]];
export const PersianShotRecipes=[{"id":"shotcraft/brand-ink-open","slug":"brand-ink-open","title":"شروع با مرکب"},{"id":"shotcraft/marker-underline-title","slug":"marker-underline-title","title":"زیرخط ماژیک"},{"id":"shotcraft/document-typewriter-reveal","slug":"document-typewriter-reveal","title":"تایپ فارسی در سند"},{"id":"shotcraft/deck-deal-flyin","slug":"deck-deal-flyin","title":"ورود کارت‌ها"},{"id":"shotcraft/crash-zoom-punch","slug":"crash-zoom-punch","title":"حرکت دوربین"},{"id":"shotcraft/odometer-digit-roll","slug":"odometer-digit-roll","title":"آمار زنده"},{"id":"shotcraft/command-palette-summon","slug":"command-palette-summon","title":"جست‌وجوی هوشمند"},{"id":"shotcraft/line-carry-transition","slug":"line-carry-transition","title":"اتصال دو نما"},{"id":"shotcraft/beat-cut-moves","slug":"beat-cut-moves","title":"ضرباهنگ سینمایی"},{"id":"shotcraft/light-play-moves","slug":"light-play-moves","title":"پرداخت نوری"},{"id":"shotcraft/outro-group-photo-launch","slug":"outro-group-photo-launch","title":"پایان هویتی"}];
const text=(c:Ctx,str:string,x:number,y:number,size:number,color:string,progress=1,weight=700)=>{
 drawPersianText(c,{text:str,x,y,size,family:"Vazirmatn",color,weight,progress,mode:"ink"});
};
const block=(c:Ctx,x:number,y:number,w:number,h:number,col:string,rad=14)=>{
 c.fillStyle=col;c.beginPath();c.roundRect(x,y,Math.max(.1,w),Math.max(.1,h),rad);c.fill();
};
const line=(c:Ctx,points:[number,number][],width:number,color:string)=>{
 c.beginPath();c.strokeStyle=color;c.lineWidth=width;c.lineCap="round";c.lineJoin="round";
 points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
};
function draw(c:Ctx,local:number,env:Env,i:number){
 c.save();c.setTransform(env.scale,0,0,env.scale,0,0);
 const [bg,ink,accent]=palettes[i%4],p=ease((local-5)/70);
 c.fillStyle=bg;c.fillRect(0,0,W,H);
 if(i===0){
  paintPaper(c,W,H,"warm-paper");
  line(c,[[1000,225],[1000-470*p,225]],5,accent);
  drawPersianTrace(c,env,{text:"نقشی که می‌ماند",family:"Vazirmatn",
    size:78,x:1070,y:382,progress:p,color:ink,pen:p<.93,penStyle:"qalam"});
  text(c,"آغاز یک هویت",1060,505,29,accent,ease((local-30)/50));
 } else if(i===1){
  text(c,"خط زیر، پیام را برجسته می‌کند",1110,326,60,ink,1,700);
  const x=1000-650*p;
  c.strokeStyle=accent;c.lineCap="round";c.lineWidth=18;c.beginPath();
  c.moveTo(990,357);c.quadraticCurveTo(690,370,x,360);c.stroke();
  text(c,"تأکیدِ دقیق و آرام",1050,465,27,ink,ease((local-25)/48),500);
 } else if(i===2){
  block(c,190,120,900,475,"#ffffff",17);
  block(c,250,176,770,46,"#e4edee",10);
  const rows=["ایده‌ها از یک جمله آغاز می‌شوند","هر تصویر، روایتی تازه می‌سازد","جملهٔ فارسی باید درست و خوانا باشد"];
  rows.forEach((t,k)=>text(c,t,1010,282+k*82,42,ink,ease((local-k*17)/50),600));
  c.fillStyle=accent;c.fillRect(1010-660*p,473,4,44);
 } else if(i===3){
  const names=["آموزش","طراحی","امتحان","گزارش"];
  for(let k=0;k<4;k++){
   const t=ease((local-k*12)/45),x=150+k*244,y=215+185*(1-t);
   block(c,x,y,208,260,k%2===0?"#e9f4f4":"#d7e7ea",14);
   block(c,x+24,y+26,160,76,accent,10);
   text(c,names[k],x+180,y+177,36,ink,1);
  }
 } else if(i===4){
  const z=.65+.35*p;
  c.save();c.translate(635,357);c.scale(z,z);
  for(let k=3;k>=0;k--){c.strokeStyle=k%2===0?accent:ink;c.lineWidth=6;
   c.strokeRect(-360+k*42,-200+k*28,720-k*84,400-k*56)}
  text(c,"تمرکز",280,32,84,ink);c.restore();
 } else if(i===5){
  const number=Math.round(4200+p*215800).toLocaleString("fa-IR");
  text(c,number,1075,350,121,ink,1);
  text(c,"کاربر فعال",1053,435,37,accent,1);
  c.fillStyle=accent;c.fillRect(190,482,900*p,9);
 } else if(i===6){
  block(c,220,170,840,365,"#ffffff",20);
  block(c,265,213,745,75,"#edf4f4",12);
  text(c,"ایدهٔ تازه را جست‌وجو کن…",950,263,33,ink,1);
  ["تولید یک پوستر فارسی","طراحی نمودار آموزشی","ساخت موشن‌گرافیک"].forEach((t,k)=>{
   const reveal=ease((local-15-k*12)/44);
   block(c,285,321+k*65,705*reveal,49,k===1?accent:"#d6e8e9",8);
   if(reveal>.15)text(c,t,930,357+k*65,27,ink,reveal,600);
  });
 } else if(i===7){
  paintPaper(c,W,H,"blueprint");
  const path:[[number,number],[number,number],[number,number],[number,number]]=[[1125,370],[930,370],[715,275],[525,275]];
  const end=1+(Math.floor(p*3));
  line(c,path.slice(0,Math.max(2,end)) as [number,number][],7,accent);
  const right=ease((local-40)/45);
  block(c,775,145,355,180,"#ffffff",17);
  block(c,160,340+(1-right)*125,355,180,"#ffffff",17);
  text(c,"صحنهٔ اول",1075,241,35,ink);
  text(c,"صحنهٔ دوم",472,439+(1-right)*125,35,ink);
 } else if(i===8){
  const phase=Math.min(3,Math.floor(local/20)),words=["شروع","ریتم","اوج","پایان"];
  c.fillStyle=["#244e64","#ca8662","#639fa6","#314c5a"][phase];c.fillRect(120,170,1040,385);
  text(c,words[phase],900,385,119,"#ffffff");
  c.fillStyle="#e8be7d";c.fillRect(120,549,1040*p,6);
 } else if(i===9){
  const grad=c.createRadialGradient(180+710*p,285,15,610,335,510);
  grad.addColorStop(0,"#f3e0b8");grad.addColorStop(.48,"#b8d5db");grad.addColorStop(1,bg);
  c.fillStyle=grad;c.fillRect(0,0,W,H);
  text(c,"از تاریکی تا روشنایی",1090,360,65,ink,1);
  c.globalAlpha=.8;c.strokeStyle=accent;c.lineWidth=3;
  c.strokeRect(230,150,820*p,365);c.globalAlpha=1;
 } else {
  paintPaper(c,W,H,"parchment");
  const radius=100*p;c.fillStyle=accent;c.beginPath();c.arc(640,327,radius,0,Math.PI*2);c.fill();
  text(c,"پ",683,367,110,ink);
  text(c,"تمامِ قصه، یک تصویر",1030,545,48,ink,ease((local-30)/45));
 }
 text(c,"پرشین دودل • نمونهٔ مستقل فارسی",1120,95,23,accent,1,600);
 const label=PersianShotRecipes[i].title;
 text(c,label,1120,651,25,ink,1,700);
 c.restore();
}
export const persianShotSampler:Film={
 meta:{title:"نمونه‌های منتخب شات‌کرافت با متن فارسی",W,H,fps:30,bpm:60,
 durationFrames:SPAN*PersianShotRecipes.length,kind:"drawing",poster:72,
 holds:PersianShotRecipes.map((_,i)=>[SPAN*i+80,SPAN*(i+1),"read"] as [number,number,string])},
 assets:{images:{},fonts:persianFontFiles},
 audio:(rate:number)=>styleScore(rate,30,SPAN*PersianShotRecipes.length),
 shots:PersianShotRecipes.map((item,i)=>({id:item.slug,start:SPAN*i,end:SPAN*(i+1),
 draw:(ctx:Ctx,local:number,env:Env)=>draw(ctx,local,env,i)})),
};

// Deterministic Persian-first reinterpretations of catalog techniques.
// Each catalog ID gets its own seeded palette, geometry, Persian title and
// time-function preview. This is a native concept visualization, not a claim
// that the exact upstream source video has been translated or cloned.
import {faTitle} from "./localization.js";
const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
function hash(s){let x=2166136261;for(const c of String(s))x=Math.imul(x^c.charCodeAt(0),16777619);return x>>>0}
function kindFor(item){
 const s=[item.name,item.category,item.id].join(" ").toLowerCase();
 if(item.kind==="font")return "font";
 if(item.kind==="audio")return "audio";
 if(/draw|sketch|ink|pencil|marker|brush|line-boil|stroke|handwriting/.test(s))return "draw";
 if(/chart|count|metric|dashboard|data|growth|stat|graph|number/.test(s))return "data";
 if(/transition|wipe|morph|flythrough|push|zoom|camera|pan|iris|turn/.test(s))return "transition";
 if(/ui|click|cursor|select|input|terminal|chat|scroll|card|grid/.test(s))return "interface";
 if(/paper|collage|sticker|frame-by-frame|washi|flat|bauhaus|pixel/.test(s))return "shapes";
 if(/title|type|typography|word|text|subtitle|letter/.test(s))return "typography";
 if(item.kind==="explainer")return "diagram";
 if(item.kind==="motion")return "shapes";
 return "typography";
}
const themes=[
 ["#f3f1e8","#1b4963","#d98d62","#dceaf0"],
 ["#e9f0f0","#244a5b","#5e9dac","#fff1d6"],
 ["#f5ede2","#593d35","#b87d4e","#d8b89a"],
 ["#0e2436","#f5e9d0","#e8ae73","#21495e"],
 ["#edf2e9","#30524c","#db9260","#b8d1c5"]
];
const txt=(c,s,x,y,font,fill,alpha=1)=>{
 c.save();c.globalAlpha=alpha;c.fillStyle=fill;c.font=font;c.direction="rtl";c.textAlign="right";
 c.fillText(s,x,y);c.restore()
};
function roundRect(c,x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,Math.max(1,w),Math.max(1,h),r);c.fill()}
function line(c,points,color,width=4,progress=1){
 c.save();c.strokeStyle=color;c.lineWidth=width;c.lineCap="round";c.lineJoin="round";
 c.beginPath();const count=Math.max(1,Math.ceil((points.length-1)*clamp(progress)));
 points.slice(0,count+1).forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.restore();
}
export function drawItemPreview(canvas,item,progress=0.72){
 const c=canvas.getContext("2d",{alpha:false});if(!c)return;
 const W=960,H=540,p=ease(progress),h=hash(item.id),bg=themes[h%themes.length];
 c.save();c.fillStyle=bg[0];c.fillRect(0,0,W,H);
 // Architectural paper/grid motif is derived independently per catalog ID.
 if(h%3===0){
   c.strokeStyle=bg[3];c.lineWidth=.7;c.beginPath();
   for(let x=0;x<W;x+=36){c.moveTo(x,0);c.lineTo(x,H)}
   for(let y=0;y<H;y+=36){c.moveTo(0,y);c.lineTo(W,y)}c.stroke();
 } else if(h%3===1){
   for(let n=0;n<48;n++){c.fillStyle=n%2?"#ffffff22":"#546b6610";c.fillRect((n*179)%W,(n*83)%H,2,2)}
 } else {c.strokeStyle=bg[3];for(let y=105;y<H;y+=76){c.beginPath();c.moveTo(32,y);c.lineTo(W-32,y);c.stroke()}}
 const type=kindFor(item),accent=bg[2],ink=bg[1],sub=bg[3];
 c.lineCap="round";c.lineJoin="round";
 if(type==="draw"){
  const points=Array.from({length:100},(_,i)=>[115+i*6.6,275+Math.sin(i*.12+h%15)*51+Math.cos(i*.041+h%7)*35]);
  line(c,points,accent,7,p);line(c,points,ink,2,p*.98);
  const index=Math.min(99,Math.floor(p*99)),pt=points[index];
  c.save();c.translate(pt[0],pt[1]);c.rotate(-.48);roundRect(c,-5,-88,12,84,3,"#986d44");roundRect(c,-4,-30,9,12,2,"#e4c18b");c.restore();
 }else if(type==="data"){
  for(let i=0;i<8;i++){const x=115+i*87,sz=60+((i*41+h)%155);roundRect(c,x,368-sz*p,53,sz*p,8,i%3===0?accent:ink)}
  line(c,Array.from({length:8},(_,i)=>[141+i*87,200+Math.sin(i*.7+h%10)*46-(i*15)*p]),accent,6,p);
 }else if(type==="transition"){
  for(let i=0;i<5;i++){c.save();c.translate(240+i*110,270);c.rotate(p*.65*(i%2?-1:1));
   roundRect(c,-64,-130,110,220,17,i%2?ink:accent);c.restore()}
  c.strokeStyle=accent;c.lineWidth=7;c.beginPath();c.arc(480,270,140,0,TAU*p);c.stroke();
 }else if(type==="interface"){
  roundRect(c,150,135,660,260,19,sub);roundRect(c,150,135,660,48,14,ink);
  for(let i=0;i<4;i++){roundRect(c,185,210+i*41,300+(i*36)%170,16,6,"#9dc4c6");}
  roundRect(c,618,220,143,109*p,12,accent);
  c.fillStyle=ink;c.beginPath();c.moveTo(410+180*p,335);c.lineTo(399+180*p,307);c.lineTo(428+180*p,327);c.fill();
 }else if(type==="shapes"){
  for(let i=0;i<6;i++){
   c.save();c.translate(190+i*110,278+Math.sin(i*1.2+p*6)*24);
   c.rotate(p*.4*(i%2?-1:1));
   if(i%2===0){c.fillStyle=accent;c.beginPath();c.arc(0,0,48*p,0,TAU);c.fill();}
   else roundRect(c,-48*p,-48*p,96*p,96*p,12,ink);
   c.restore();
  }
 }else if(type==="font"||type==="typography"){
  const title=type==="font"?"فارسیِ زیبا":"زیبایی در حرکت";
  c.save();c.beginPath();c.rect(70,170,820*p,190);c.clip();
  txt(c,title,840,305,"800 69px Vazirmatn, Tahoma",ink);c.restore();
  line(c,[[330,344],[790,344]],accent,11,p);
 }else if(type==="audio"){
  const points=Array.from({length:170},(_,i)=>{
   const amp=20+85*Math.abs(Math.sin(i*.42+h*.0001)*Math.sin(i*.09));
   return [56+i*5.0,272+Math.sin(i*3.2)*amp]
  });
  line(c,points,ink,3,p);
  c.fillStyle=accent;c.beginPath();c.arc(56+p*845,272,15,0,TAU);c.fill();
 }else{
  const nodes=[[210,262],[490,180],[710,300]];
  for(let i=0;i<nodes.length;i++){
   const [x,y]=nodes[i];roundRect(c,x-78,y-39,156,80,14,i%2?accent:ink);
   txt(c,["ایده","اجرا","نتیجه"][i],x+51,y+11,"700 26px Vazirmatn",bg[0],p);
   if(i)line(c,[nodes[i-1],nodes[i]],accent,4,p);
  }
 }
 // The actual source identifier is metadata, not rendered foreign text.
 const title=faTitle(item).slice(0,50);
 txt(c,title,880,103,"800 36px Vazirmatn, Tahoma",ink,1);
 txt(c,"نمونهٔ بازطراحی فارسی",875,474,"500 22px Vazirmatn, Tahoma",ink,.84);
 c.fillStyle=accent;c.fillRect(60,501,840*p,4);
 c.restore();
}
export function playItemPreview(canvas,item,button){
 let raf=0,start=performance.now();
 if(button)button.disabled=true;
 const frame=t=>{const p=Math.min(1,(t-start)/2600);drawItemPreview(canvas,item,p);
  if(p<1)raf=requestAnimationFrame(frame);else if(button)button.disabled=false;};
 raf=requestAnimationFrame(frame);
 return()=>cancelAnimationFrame(raf);
}

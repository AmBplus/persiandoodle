// The Persian replacement for the English default demo. Every character is
// shaped by the browser first, then its own centreline is traced by a nib.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { drawPersianText } from "./persianText";
import { drawPersianTrace } from "./persianTrace";
import { persianFontFiles } from "./persianGallery";

const W=1280,H=720,SPAN=100;
const C={paper:"#f7f3e9",paper2:"#eaf2f7",ink:"#183d56",blue:"#285f92",
  blue2:"#4f8bb7",gold:"#bc8a4c",dim:"#5f7480",white:"#ffffff"};
const ease=(a:number,b:number,v:number)=>Math.max(0,Math.min(1,(v-a)/(b-a)));
const txt=(ctx:Ctx,o:Parameters<typeof drawPersianText>[1])=>drawPersianText(ctx,o);
const trace=(ctx:Ctx,env:Env,o:Parameters<typeof drawPersianTrace>[2])=>drawPersianTrace(ctx,env,o);
const background=(c:Ctx,p:number,scene:number)=>{
  c.fillStyle=scene%2===0?C.paper:C.paper2;c.fillRect(0,0,W,H);
  c.fillStyle=scene%2===0?"#e8e2d3":"#dcebf4";
  for(let i=0;i<38;i++){c.fillRect(i*35,0,1,H);}
  c.strokeStyle="#d2d6cf";c.lineWidth=1;
  for(let y=152;y<H-30;y+=88){c.beginPath();c.moveTo(62,y);c.lineTo(W-62,y);c.stroke();}
  c.fillStyle=C.ink;c.fillRect(W-18,0,18,H);
  c.fillStyle=C.gold;c.fillRect(53,57,64,4);
  c.fillStyle=C.blue;c.fillRect(53,69,32,4);
  c.fillStyle=C.dim;
  txt(c,{text:`پرشین دودل  /  ۰${scene+1}`,family:"Vazirmatn",
    size:20,x:340,y:107,color:C.dim});
  c.fillStyle=C.blue2;c.fillRect(53,H-44,(W-110)*p,4);
};
const scene=(ctx:Ctx,l:number,env:Env,index:number)=>{
  ctx.save();ctx.setTransform(env.scale,0,0,env.scale,0,0);
  const p=ease(2,86,l);background(ctx,p,index);
  const shared={color:C.ink,penColor:C.gold,pen:true} as const;
  if(index===0){
    txt(ctx,{text:"فارسی را با قلم می‌نویسیم",family:"Vazirmatn",size:34,
      weight:650,x:1198,y:148,color:C.blue});
    trace(ctx,env,{text:"از ایده تا تصویر",family:"Vazirmatn",size:91,
      weight:700,x:1190,y:355,progress:p,...shared});
    txt(ctx,{text:"هر کلمه، خطی زنده روی کاغذ",family:"Shabnam",size:33,
      x:1184,y:515,color:C.dim,progress:ease(35,92,l)});
  }else if(index===1){
    txt(ctx,{text:"حرکت واقعی قلم روی فرم حروف",family:"Vazirmatn",
      size:34,weight:650,x:1190,y:147,color:C.blue});
    trace(ctx,env,{text:"طراحی با خط",family:"Estedad",size:100,
      weight:650,x:1160,y:333,progress:ease(0,77,l),...shared});
    trace(ctx,env,{text:"یک نوشته، هزار تصویر",family:"Gandom",size:62,
      x:1170,y:510,progress:ease(23,96,l),color:C.blue,penColor:C.gold});
  }else if(index===2){
    txt(ctx,{text:"نستعلیق؛ شکل و حرکت",family:"Vazirmatn",size:36,
      x:1190,y:144,color:C.blue,weight:700});
    trace(ctx,env,{text:"جانِ کلمات",family:"Gulzar",size:99,
      x:1160,y:352,progress:ease(0,85,l),...shared});
    trace(ctx,env,{text:"هنرِ نوشتن",family:"Noto Nastaliq Urdu",size:73,
      x:1160,y:539,progress:ease(29,96,l),color:C.blue,penColor:C.gold});
    txt(ctx,{text:"نمونهٔ اردو برای ارزیابی فرم ایرانی",family:"Vazirmatn",size:22,
      x:1168,y:615,color:C.dim});
  }else{
    txt(ctx,{text:"نمونهٔ فارسیِ آمادهٔ استفاده در موشن‌گرافیک",
      family:"Vazirmatn",size:31,x:1192,y:145,color:C.blue,weight:650});
    trace(ctx,env,{text:"اینجا قصه‌ها زنده‌اند",family:"Lalezar",size:83,
      x:1166,y:314,progress:ease(0,76,l),...shared});
    trace(ctx,env,{text:"طراحی می‌کنیم؛ فریم‌به‌فریم",family:"Vazirmatn",size:47,
      x:1168,y:460,progress:ease(24,97,l),color:C.blue,penColor:C.gold});
    txt(ctx,{text:"پایانِ هر طراحی، آغازِ یک داستان است.",family:"Samim",
      size:30,x:1168,y:572,progress:ease(45,96,l),color:C.dim});
  }
  // The same real nib that travels across the skeleton.
  // A small fixed decorative seal keeps the reading area grounded.
  ctx.strokeStyle=C.gold;ctx.lineWidth=2;ctx.beginPath();
  ctx.arc(96,615,29,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(96,615,5,0,Math.PI*2);ctx.fill();
  ctx.restore();
};
export const persianShowcase:Film={
  meta:{title:"PersianDoodle · طراحی با خط فارسی",W,H,fps:30,bpm:90,
    durationFrames:SPAN*4,kind:"drawing",poster:70,
    holds:[[90,100,"read"],[190,200,"read"],[290,300,"read"],[390,400,"end card"]]},
  assets:{images:{},fonts:persianFontFiles},
  shots:Array.from({length:4},(_,i)=>({id:`fa-scene-${i+1}`,
    start:SPAN*i,end:SPAN*(i+1),
    draw:(ctx:Ctx,local:number,env:Env)=>scene(ctx,local,env,i)})),
};

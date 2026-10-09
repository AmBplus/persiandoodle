// Original PersianDoodle Film adapter: renders a user-selected scene specification
// using the unchanged Film/Ctx/Env pipeline. A selection referring to an upstream
// recipe is interpreted as creative guidance, NOT as a claim to implement that
// recipe's exact algorithm. Verified native blocks: typography, background, nib,
// color, basic entrance, original scratch audio and line-drawn accents.
import type {Ctx,Env} from "./core";
import type {Film} from "./film";
import {drawPersianTrace} from "./persianTrace";
import {drawPersianText} from "./persianText";
import {paintPaper,type PaperStyle,type PenStyle,PALETTES} from "./persianSceneKit";
import {persianFontFiles} from "./persianGallery";
import {synthPenScore} from "./persianPenAudio";
export type ComposedConfig={
 text:string;title:string;
 durationFrames?:number;fps?:number;paper?:PaperStyle;pen?:PenStyle;
 font?:string;entrance?:"trace"|"fade"|"slide"|"pop";
 accent?:string;subtitle?:string; withSound?:boolean;
};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>{const p=clamp(x);return p*p*(3-2*p)};
export const makeComposedSceneFilm=(cfg:ComposedConfig):Film=>{
 const W=1280,H=720,fps=30,N=180;
 const paper:PaperStyle=Object.hasOwn(PALETTES,cfg.paper||"")?cfg.paper!:"warm-paper";
 const pen:PenStyle=(["fountain","qalam","pencil","marker","brush","none"] as PenStyle[]).includes(cfg.pen||"qalam")?cfg.pen!:"qalam";
 const family=cfg.font&&Object.hasOwn(persianFontFiles,cfg.font)?cfg.font:"Vazirmatn";
 const text=String(cfg.text||"ایده‌ای برای تصویر").normalize("NFC").slice(0,68);
 const tagline=String(cfg.subtitle||"حرکت، معنا و زیبایی در یک قاب").slice(0,86);
 const accent=cfg.accent||PALETTES[paper].accent,ink=PALETTES[paper].ink;
 const entrance=cfg.entrance||"trace";
 const scene=(c:Ctx,t:number,env:Env)=>{
  c.save();c.setTransform(env.scale,0,0,env.scale,0,0);
  const p=ease((t-8)/140),fx=ease((t-20)/95);
  paintPaper(c,W,H,paper,t/30);
  c.fillStyle=accent;c.fillRect(1116,0,8,H);
  // One visual thread: an expanding line carries emphasis into the title.
  c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.moveTo(150,470);
  c.lineTo(150+950*ease((t-30)/110),470);c.stroke();
  if(entrance==="trace"){
    drawPersianTrace(c,env,{text,family,size:91,x:1080,y:339,progress:p,
      color:ink,penStyle:pen,pen:pen!=="none",penColor:accent});
  }else{
    c.save();if(entrance==="fade")c.globalAlpha=fx;
    if(entrance==="slide")c.translate(0,(1-fx)*70);
    if(entrance==="pop")c.translate(0,(1-fx)*25);
    drawPersianText(c,{text,family,size:91,x:1080,y:339,
      color:ink,weight:700,progress:entrance==="pop"?fx:1});
    c.restore();
  }
  drawPersianText(c,{text:tagline,family:"Vazirmatn",size:34,x:1090,y:549,
    color:ink,progress:ease((t-98)/60)});
  drawPersianText(c,{text:cfg.title||"طراحی فارسی",family:"Vazirmatn",
    size:26,x:1080,y:122,color:accent,weight:700});
  c.restore();
 };
 const result:Film={
   meta:{title:"صحنهٔ انتخابی فارسی",W,H,fps,bpm:90,durationFrames:N,kind:"drawing",
     holds:[[165,180,"پایان خوانا"]],poster:165},
   assets:{images:{},fonts:persianFontFiles},
   shots:[{id:"scene-from-library",start:0,end:N,draw:scene}],
 };
 if(cfg.withSound!==false&&entrance==="trace"){
   result.audio=(sampleRate:number)=>synthPenScore(sampleRate,fps,N,[{from:8,to:148,texture:pen==="brush"?"brush":"nib",strength:1}]);
 }
 return result;
};

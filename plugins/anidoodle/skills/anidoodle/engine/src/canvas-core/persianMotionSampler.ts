// 15 original Persian re-imaginings of MIT mg-styles-15 style signatures.
// This DOES NOT copy the upstream rendered films; each shot is an original
// PersianDoodle Canvas composition and keeps complete RTL glyph shaping.
import type {Ctx,Env} from "./core";
import type {Film} from "./film";
import {drawPersianText} from "./persianText";
import {drawPersianTrace} from "./persianTrace";
import {persianFontFiles} from "./persianGallery";
import {paintPaper} from "./persianSceneKit";
import {styleScore} from "./persianMotionAudio";
export const PersianMotionStyles=[
 ["01-flat-vector","برداری تخت","کمتر بگو، بهتر نشان بده"],
 ["02-line-art","طراحی پیوسته با خط","یک خط، هزار داستان"],
 ["03-isometric","دنیای ایزومتریک","یک شهر از جنس ایده"],
 ["04-3d-render","فرم سه‌بعدی","به ایده‌ها حجم بده"],
 ["05-cel-boil","خطِ زنده","نقش‌ها نفس می‌کشند"],
 ["06-collage","کلاژ کاغذی","قصه‌ها را کنار هم بچین"],
 ["07-liquid","حرکت سیال","آزاد و روان"],
 ["08-morph","دگردیسی","شکل‌ها دوباره متولد می‌شوند"],
 ["09-bauhaus","هندسهٔ باوهاوس","رنگ، فرم، ریتم"],
 ["10-synthwave","سینث‌ویو","فردا از امروز آغاز می‌شود"],
 ["12-aurora-glass","شفق و شیشه","نور از دلِ شیشه"],
 ["18-hanazi","طراحی شرقی","آرامشِ نقش و فضا"],
 ["19-paperclip","بُرش کاغذ","از یک تکه کاغذ"],
 ["20-pixel","هنر پیکسلی","رویا در هر پیکسل"],
 ["22-hud","رابط آینده‌نگر","داده‌ها جان می‌گیرند"],
] as const;
const W=1280,H=720,SPAN=60;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(t:number)=>{const p=clamp(t);return p*p*(3-2*p)};
const ink=(c:Ctx,text:string,x:number,y:number,size:number,color:string,prog=1,weight:number=700)=>
 drawPersianText(c,{text,x,y,size,color,progress:prog,weight,family:"Vazirmatn",mode:"ink"});
const poly=(c:Ctx,p:number[][],fill:string)=>{c.fillStyle=fill;c.beginPath();c.moveTo(...p[0]);for(let i=1;i<p.length;i++)c.lineTo(...p[i]);c.closePath();c.fill()};
function draw(c:Ctx,env:Env,i:number,local:number){
 c.save();c.setTransform(env.scale,0,0,env.scale,0,0);
 const p=smooth(local/45),w=Math.sin(local*.085);
 const dark=[9,10,14].includes(i),bg=dark?"#0d1e34":"#f2f3ef";
 c.fillStyle=bg;c.fillRect(0,0,W,H);
 const fg=dark?"#f2e9d0":"#193d53",muted=dark?"#89b6c5":"#6d8491",gold="#e8a360",a="#418bb0";
 // Make every shot an independent 16:9 poster with readable Persian content.
 if(i===0){paintPaper(c,W,H,"blueprint");
  c.fillStyle="#e6a063";c.beginPath();c.arc(305+p*85,380,108,0,7);c.fill();
  c.fillStyle="#5d9bb3";c.fillRect(120,310,280*p,235);c.fillStyle="#eec798";c.fillRect(355,365,90,180*p);
 }else if(i===1){paintPaper(c,W,H,"warm-paper");
  drawPersianTrace(c,env,{text:"یک خط، یک جهان",family:"Vazirmatn",size:84,
   x:1125,y:385,progress:p,color:"#255274",penStyle:"qalam",penColor:gold});
  c.strokeStyle="#dcad70";c.lineWidth=4;c.beginPath();c.moveTo(140,530);c.bezierCurveTo(250,480,300,580,410,520);c.stroke();
 }else if(i===2){
  for(let n=0;n<4;n++){const x=190+n*175,y=385+(n%2)*55;
   poly(c,[[x,y-70],[x+90,y-115],[x+176,y-68],[x+85,y-21]],"#acd3e0");
   poly(c,[[x,y-70],[x+85,y-21],[x+85,y+90*p],[x,y+36*p]],"#437ca1");
   poly(c,[[x+85,y-21],[x+176,y-68],[x+176,y+38*p],[x+85,y+90*p]],"#245372");
  }
 }else if(i===3){
  const grd=c.createRadialGradient(630,300,30,670,350,450);grd.addColorStop(0,"#b7d5ea");grd.addColorStop(1,"#ecf3f4");
  c.fillStyle=grd;c.fillRect(100,170,1050,420);
  const g=c.createRadialGradient(560,240,20,690,390,230);g.addColorStop(0,"#fff9e6");g.addColorStop(.4,"#dfa975");g.addColorStop(1,"#835c54");
  c.fillStyle=g;c.beginPath();c.ellipse(610,390,180*p+20,155*p+20,-.2,0,7);c.fill();
 }else if(i===4){
  c.strokeStyle="#2b6579";c.lineWidth=5;c.lineCap="round";
  for(let j=0;j<6;j++){c.beginPath();let x=120+j*145;
   c.moveTo(x,500);c.bezierCurveTo(x+26,280+Math.sin(j+Math.floor(local/2)) *6,x+85,510,x+130,290);c.stroke();
  }
  c.fillStyle="#e89d62";c.beginPath();c.arc(260,320,42+Math.sin(local/4)*5,0,7);c.fill();
 }else if(i===5){
  c.save();c.translate(600,360);c.rotate(-.1*w);
  for(let j=0;j<5;j++){c.fillStyle=["#d4bc9a","#90b5c0","#ebad67","#a9ccad","#e7d8bf"][j];c.fillRect(-410+j*130,-155+j*25,380*p+1,180);c.strokeStyle="#ffffff77";c.strokeRect(-410+j*130,-155+j*25,380*p+1,180);}
  c.restore();
 }else if(i===6){
  c.fillStyle="#bfdeee";c.fillRect(0,240,1280,480);c.fillStyle="#2f83aa";c.beginPath();c.moveTo(0,460);
  for(let x=0;x<=1280;x+=20)c.lineTo(x,410+90*Math.sin(x/115-local*.08));c.lineTo(1280,720);c.lineTo(0,720);c.fill();
  c.fillStyle="#e5ae73";c.beginPath();c.arc(1000,300,55*p,0,7);c.fill();
 }else if(i===7){
  const mix=smooth(local/55),rad=100+mix*50;
  c.fillStyle="#79b4be";c.beginPath();
  for(let n=0;n<32;n++){const a=n/32*Math.PI*2,r=rad*(1+.22*Math.sin(5*a+mix*3));const x=600+r*Math.cos(a),y=385+r*Math.sin(a);n?c.lineTo(x,y):c.moveTo(x,y);}
  c.closePath();c.fill();
  c.fillStyle="#f4c389";c.beginPath();c.arc(600,385,35+mix*23,0,7);c.fill();
 }else if(i===8){
  c.fillStyle="#f0d1a0";c.fillRect(155,265,860,300);
  c.fillStyle="#225771";c.beginPath();c.arc(340,420,135*p,0,7);c.fill();
  c.fillStyle="#b74340";c.fillRect(500,295,145,210*p);c.fillStyle="#75aaa0";c.fillRect(690,325,230*p,85);
  c.fillStyle="#f6f2eb";c.beginPath();c.arc(750,495,72,0,7);c.fill();
 }else if(i===9){
  const sky=c.createLinearGradient(0,0,0,720);sky.addColorStop(0,"#0e1d3e");sky.addColorStop(.65,"#492b73");sky.addColorStop(1,"#ee6e85");
  c.fillStyle=sky;c.fillRect(0,0,W,H);c.fillStyle="#f0a5a1";c.beginPath();c.arc(700,280,105*p,0,7);c.fill();
  c.strokeStyle="#e8799a";c.lineWidth=2;for(let n=0;n<20;n++){const y=430+n*n*1.02;c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  for(let n=-8;n<=8;n++){c.beginPath();c.moveTo(W/2,430);c.lineTo(640+n*160,720);c.stroke();}
 }else if(i===10){
  const grd=c.createRadialGradient(600,280,10,600,300,520);grd.addColorStop(0,"#7256a9");grd.addColorStop(.55,"#2b588a");grd.addColorStop(1,"#102844");c.fillStyle=grd;c.fillRect(0,0,W,H);
  for(let j=0;j<4;j++){c.fillStyle=["#fceaca44","#ffffff31","#96b9f741","#ffbbd53b"][j];c.beginPath();c.roundRect(190+j*95,255+j*25,450*p,220,30);c.fill();}
 }else if(i===11){
  paintPaper(c,W,H,"washi");
  c.strokeStyle="#b78054";c.lineWidth=2.8;c.beginPath();c.moveTo(210,510);c.bezierCurveTo(350,360,480,520,660,310);c.stroke();
  for(let j=0;j<5;j++){c.fillStyle="#b4c2b4";c.beginPath();c.ellipse(340+j*65,370+Math.sin(j*2)*65,26*p,48*p,j/2,0,7);c.fill();}
 }else if(i===12){
  paintPaper(c,W,H,"parchment");
  for(let j=0;j<6;j++){c.save();c.translate(185+j*170,375+Math.sin(j)*35);c.rotate(Math.sin(j)*.17);c.fillStyle=j%2?"#89a2ae":"#dfb77b";c.fillRect(-65,-105,130,205*p);c.strokeStyle="#ffffff";c.strokeRect(-56,-96,112,180*p);c.restore();}
 }else if(i===13){
  const pix=29;for(let j=0;j<14;j++)for(let k=0;k<9;k++){const light=(j+k+Math.floor(local/5))%3===0;
    c.fillStyle=light?"#dfac75":"#377ba0";c.fillRect(280+j*pix,240+k*pix,pix-3,pix-3);}
  c.fillStyle="#f6e8c9";c.fillRect(475,335,80*p+20,88);
 }else if(i===14){
  c.strokeStyle="#5ce1d0";c.lineWidth=2;
  for(let j=0;j<4;j++){c.beginPath();c.arc(790,365,95+j*43,0,Math.PI*2*p);c.stroke();}
  c.beginPath();c.moveTo(340,310);c.lineTo(620,310);c.lineTo(700,360);c.stroke();
  c.fillStyle="#5ce1d0";for(let j=0;j<12;j++)c.fillRect(310+j*26,430-Math.sin(j*.56+local*.08)*35,10,25);
 }
 const [slug,title,subtitle]=PersianMotionStyles[i];
 // Full logical phrases, not per-codepoint Latin animation.
 const labelY=i===1?135:147;
 ink(c,title,1150,labelY,47,fg,1);
 ink(c,subtitle,1150,650,34,fg,smooth((local-12)/37),600);
 ink(c,"پرشین‌دودل • کتابخانهٔ حرکت",1155,71,20,muted,1,500);
 c.textAlign="left";c.direction="ltr";c.fillStyle=muted;c.font="500 19px sans-serif";
 c.fillText(String(i+1).padStart(2,"0")+" / 15",72,75);
 c.fillStyle=dark?"#ffffff":"#a0bcc7";c.globalAlpha=.6;c.fillRect(65,679,1150,3);
 c.fillStyle=gold;c.globalAlpha=1;c.fillRect(65,679,1150*p,3);
 c.restore();
}
export const persianMotionSampler:Film={
 meta:{title:"۱۵ سبک موشن با تایپوگرافی فارسی",W,H,fps:30,bpm:90,durationFrames:SPAN*15,
   kind:"drawing",poster:48,holds:Array.from({length:15},(_,i)=>[i*SPAN+53,(i+1)*SPAN,"style hold"] as [number,number,string])},
 assets:{images:{},fonts:persianFontFiles},
 audio:(sampleRate:number)=>styleScore(sampleRate,30,SPAN*15),
 shots:PersianMotionStyles.map(([slug],i)=>({id:`mg-${slug}`,start:i*SPAN,end:(i+1)*SPAN,
   draw:(ctx:Ctx,local:number,env:Env)=>draw(ctx,env,i,local)})),
};

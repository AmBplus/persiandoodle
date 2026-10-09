// Original PersianDoodle code: reusable backgrounds and pen actors.
// Canvas only, deterministic for arbitrary frame access (no image/video assets).
import type {Ctx, P} from "./core";
export type PaperStyle="warm-paper"|"blueprint"|"parchment"|"night-ink"|"washi";
export type PenStyle="fountain"|"qalam"|"pencil"|"marker"|"brush"|"none";
export const PALETTES:Record<PaperStyle,{paper:string;ink:string;accent:string;pen:string}>={
  "warm-paper":{paper:"#f5f0e5",ink:"#183d56",accent:"#a4773d",pen:"#b18a5c"},
  "blueprint":{paper:"#e8f3fc",ink:"#19527d",accent:"#318fbd",pen:"#d9a06a"},
  "parchment":{paper:"#f0dfbe",ink:"#49311e",accent:"#a56836",pen:"#805b3f"},
  "night-ink":{paper:"#0c1b2a",ink:"#e5d4ab",accent:"#85b9d3",pen:"#e2bc71"},
  "washi":{paper:"#f0efeb",ink:"#293b3c",accent:"#ae7544",pen:"#897a62"},
};
export const paintPaper=(ctx:Ctx,W:number,H:number,style:PaperStyle,time=0)=>{
  const p=PALETTES[style];
  ctx.save();ctx.fillStyle=p.paper;ctx.fillRect(0,0,W,H);
  if(style==="blueprint"||style==="night-ink"){
    ctx.strokeStyle=style==="blueprint"?"#c8e2f3":"#29465b";
    ctx.lineWidth=.7;ctx.beginPath();
    for(let x=0;x<W;x+=32){ctx.moveTo(x,0);ctx.lineTo(x,H);}
    for(let y=0;y<H;y+=32){ctx.moveTo(0,y);ctx.lineTo(W,y);}
    ctx.stroke();
  }else if(style==="warm-paper"){
    ctx.strokeStyle="#d9d7cb";ctx.lineWidth=.9;ctx.beginPath();
    for(let y=170;y<H-28;y+=92){ctx.moveTo(48,y);ctx.lineTo(W-42,y);}ctx.stroke();
  }else if(style==="parchment"){
    ctx.strokeStyle="#d6b688";ctx.lineWidth=2;ctx.strokeRect(31,25,W-62,H-50);
    ctx.strokeStyle="#e1c9a1";ctx.lineWidth=1;ctx.strokeRect(43,38,W-86,H-78);
  }else{
    ctx.fillStyle="#ffffff20";ctx.fillRect(46,40,W-92,H-80);
    ctx.strokeStyle="#c8c7c1";ctx.lineWidth=.75;ctx.strokeRect(47,40,W-94,H-80);
  }
  // Sparse paper grain, positional not animated, no per-frame randomness.
  if(style!=="night-ink")for(let i=0;i<320;i++){
    const x=(i*127.37)%W,y=(i*61.49)%H;
    ctx.fillStyle=i%2?"#987c4711":"#577b9a10";ctx.fillRect(x,y,1.1,1.1);
  }
  ctx.restore();
};
export const paintPen=(ctx:Ctx,point:P,angle:number,style:PenStyle,size=1,color="#ad824c")=>{
  if(style==="none")return;
  ctx.save();ctx.translate(point[0],point[1]);ctx.rotate(angle+Math.PI*.42);
  const k=Math.max(.72,Math.min(2,size));ctx.scale(k,k);
  // Tip always at local (0,0); body extends away from the drawn ink.
  ctx.lineJoin="round";ctx.lineCap="round";
  if(style==="pencil"){
    ctx.fillStyle="#e9bc57";ctx.strokeStyle="#6a563e";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-5,-12);ctx.lineTo(-5,-86);ctx.lineTo(7,-86);ctx.lineTo(6,-12);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle="#28282b";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-2,-6);ctx.lineTo(2,-6);ctx.closePath();ctx.fill();
  }else if(style==="brush"){
    ctx.fillStyle="#8d4e35";ctx.strokeStyle="#66462c";ctx.lineWidth=1.7;
    ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-12,-20,-5,-28);ctx.lineTo(-7,-94);ctx.lineTo(5,-94);ctx.lineTo(5,-28);ctx.quadraticCurveTo(8,-12,0,0);ctx.fill();ctx.stroke();
    ctx.fillStyle="#d2b689";ctx.fillRect(-7,-34,12,11);
  }else if(style==="marker"){
    ctx.fillStyle="#30435b";ctx.strokeStyle="#182836";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-7,-11);ctx.lineTo(-7,-88);ctx.quadraticCurveTo(0,-96,7,-88);ctx.lineTo(7,-11);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=color;ctx.fillRect(-6,-88,12,8);
  }else if(style==="qalam"){
    ctx.fillStyle="#6e4325";ctx.strokeStyle="#412b1d";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-4,-6);ctx.lineTo(-5,-91);ctx.quadraticCurveTo(0,-102,6,-91);ctx.lineTo(4,-8);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle="#be9158";ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(-1,-20);ctx.lineTo(-2,-78);ctx.stroke();
  }else{
    ctx.fillStyle="#263d50";ctx.strokeStyle="#152534";ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-6,-14);ctx.lineTo(-5,-100);ctx.lineTo(6,-100);ctx.lineTo(6,-14);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=color;ctx.fillRect(-6,-58,12,4);
    ctx.fillStyle="#d6c6a6";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-5,-14);ctx.lineTo(5,-14);ctx.closePath();ctx.fill();
  }
  ctx.restore();
};

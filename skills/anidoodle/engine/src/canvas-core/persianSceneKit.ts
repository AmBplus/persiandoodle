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
  ctx.save();
  ctx.translate(point[0],point[1]);
  // The hand keeps an elegant, mostly fixed posture. Sudden geometric
  // changes at dots or glyph junctions must NEVER rotate the pen barrel.
  ctx.rotate(Math.max(-.13,Math.min(.13,angle))-.40);
  const k=Math.max(.62,Math.min(1.23,size*.77));
  ctx.scale(k,k);
  ctx.lineJoin="round";ctx.lineCap="round";
  // A slim hand-made writing instrument; sharp tip anchored to the ink path.
  ctx.shadowColor="#17273445";ctx.shadowBlur=3;ctx.shadowOffsetX=2;ctx.shadowOffsetY=3;
  const body=(fill:string,outline:string,length=66,half=4)=>{
    ctx.fillStyle=fill;ctx.strokeStyle=outline;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-half,-11);ctx.lineTo(-half,-length);
    ctx.quadraticCurveTo(0,-length-6,half,-length);
    ctx.lineTo(half,-11);ctx.closePath();ctx.fill();ctx.stroke();
  };
  if(style==="qalam"){
    body("#774b2d","#463222",73,3.8);
    ctx.strokeStyle="#c49a64";ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(-1,-15);ctx.lineTo(-1,-65);ctx.stroke();
    ctx.fillStyle="#292522";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-3,-7);ctx.lineTo(3,-7);ctx.fill();
  }else if(style==="fountain"){
    body("#2e4450","#172731",76,5);
    ctx.fillStyle="#bfa16b";ctx.fillRect(-5,-28,10,3);ctx.fillRect(-5,-68,10,2);
    ctx.fillStyle="#d6b377";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-3,-12);ctx.lineTo(3,-12);ctx.fill();
  }else if(style==="pencil"){
    body("#d6ad60","#866641",70,4.5);
    ctx.fillStyle="#2c2d31";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-2.3,-7);ctx.lineTo(2.3,-7);ctx.fill();
    ctx.fillStyle="#c67e79";ctx.fillRect(-4,-67,8,6);
  }else if(style==="brush"){
    body("#744a33","#513628",83,3.8);
    ctx.fillStyle="#ccb796";ctx.fillRect(-4,-21,8,11);
    ctx.fillStyle="#574b43";ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-8,-10,-3,-13);
    ctx.lineTo(3,-13);ctx.quadraticCurveTo(8,-10,0,0);ctx.fill();
  }else{
    body("#465968","#233640",64,5.6);
    ctx.fillStyle=color;ctx.fillRect(-5,-61,10,5);
    ctx.fillStyle="#2b3b47";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-5,-10);ctx.lineTo(5,-10);ctx.fill();
  }
  ctx.restore();
};

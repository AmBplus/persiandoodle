// Lightweight interactive *design preview*, not the production glyph tracer.
// The video/Chromium renderer uses the canonical pixel-following PersianTrace
// implementation. This stage shapes the whole phrase before any RTL reveal.
const $=s=>document.querySelector(s);
const stage=$("#writingCanvas"),ctx=stage.getContext("2d");
let raf=0,ac=null,src=null,startAt=0,running=false,started=0;
const colors={paper:["#f5f0e5","#273c4a","#ab794c"],blueprint:["#e5f1f9","#174f75","#51a2ba"],parchment:["#eee0c0","#49341e","#a36b44"],night:["#0d1e2c","#e9d3a8","#c2a26b"],washi:["#e8ece6","#30484a","#9b826b"]};
const clamp=n=>Math.max(0,Math.min(1,n));
function background(style){
 const [paper,ink,accent]=colors[style];ctx.fillStyle=paper;ctx.fillRect(0,0,stage.width,stage.height);
 if(style==="night"||style==="blueprint"){
  ctx.strokeStyle=style==="night"?"#254055":"#c3dcea";ctx.lineWidth=1;ctx.beginPath();
  for(let x=0;x<stage.width;x+=28){ctx.moveTo(x,0);ctx.lineTo(x,stage.height)}
  for(let y=0;y<stage.height;y+=28){ctx.moveTo(0,y);ctx.lineTo(stage.width,y)}
  ctx.stroke();
 }else if(style==="paper"){
  ctx.strokeStyle="#dbd7c9";ctx.lineWidth=1;ctx.beginPath();
  for(let y=135;y<stage.height;y+=89){ctx.moveTo(30,y);ctx.lineTo(stage.width-30,y)}ctx.stroke();
 }else if(style==="parchment"){
  ctx.strokeStyle="#ceae83";ctx.lineWidth=2;ctx.strokeRect(25,25,stage.width-50,stage.height-50);
  ctx.lineWidth=1;ctx.strokeRect(38,39,stage.width-76,stage.height-78);
 }else{ctx.strokeStyle="#c2cbc2";ctx.strokeRect(22,22,stage.width-44,stage.height-44);}
 for(let i=0;i<340;i++){
  const x=(i*131.37)%stage.width,y=(i*67.21)%stage.height;
  ctx.fillStyle=style==="night"?"#ffffff0b":"#66594815";ctx.fillRect(x,y,1,1);
 }
 return {paper,ink,accent};
}
function pen(x,y,angle,type,accent){
 if(type==="none")return;
 ctx.save();ctx.translate(x,y);ctx.rotate(angle+.72);ctx.lineWidth=2;
 ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#64523c";
 if(type==="pencil"){
   ctx.fillStyle="#dfb758";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-6,-14);ctx.lineTo(-5,-99);ctx.lineTo(6,-99);ctx.lineTo(6,-14);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle="#3a312c";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-2,-9);ctx.lineTo(2,-9);ctx.fill();
 }else if(type==="qalam"){
   ctx.fillStyle="#8c5c35";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-5,-14);ctx.lineTo(-4,-94);ctx.quadraticCurveTo(0,-106,5,-94);ctx.lineTo(5,-14);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.strokeStyle="#cf9d61";ctx.beginPath();ctx.moveTo(-1,-20);ctx.lineTo(-1,-80);ctx.stroke();
 }else if(type==="brush"){
   ctx.fillStyle="#a36845";ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-14,-16,-5,-31);ctx.lineTo(-6,-103);ctx.lineTo(6,-103);ctx.lineTo(6,-31);ctx.quadraticCurveTo(11,-13,0,0);ctx.fill();ctx.stroke();
   ctx.fillStyle="#d8b984";ctx.fillRect(-6,-38,12,10);
 }else{
   ctx.fillStyle=type==="marker"?"#354c60":"#233b52";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-7,-15);ctx.lineTo(-7,-106);ctx.lineTo(7,-106);ctx.lineTo(7,-15);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle=accent;ctx.fillRect(-7,-53,14,5);
 }
 ctx.restore();
}
function frame(progress){
 const bg=$("#paperStyle").value,{ink,accent}=background(bg);
 const text=$("#writingText").value.trim()||"خط فارسی، زنده و زیبا";
 const fontSize=clamp(850/Math.max(1,text.length))*100;
 let size=Math.max(31,Math.min(70,fontSize));
 ctx.direction="rtl";ctx.textAlign="right";ctx.textBaseline="alphabetic";
 ctx.font=`700 ${size}px "Vazirmatn",Tahoma`;
 while(ctx.measureText(text).width>820&&size>28){size-=2;ctx.font=`700 ${size}px "Vazirmatn",Tahoma`;}
 const right=905,baseline=287,width=ctx.measureText(text).width;
 ctx.save();ctx.fillStyle=ink;
 const done=clamp(progress);
 ctx.beginPath();ctx.rect(right-width*done-2,baseline-size*1.7,width*done+4,size*2.6);ctx.clip();
 // Drawing the COMPLETE Unicode run preserves ligatures, joining and ZWNJ.
 ctx.fillText(text,right,baseline);ctx.restore();
 ctx.direction="rtl";ctx.textAlign="right";ctx.font='500 27px "Vazirmatn",Tahoma';
 ctx.fillStyle=accent;ctx.fillText("هر خط، داستانی برای گفتن دارد.",910,420);
 ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(905,370);ctx.lineTo(905-width*.93,370);ctx.stroke();
 const x=right-width*done;
 if(done>.005&&done<.995)pen(x,baseline-size*.28,-.35,$("#penStyle").value,accent);
 ctx.textAlign="left";ctx.direction="ltr";ctx.font="13px system-ui";
 ctx.fillStyle=accent;ctx.fillText("PERSIANDOODLE  •  LIVE STYLE PREVIEW",50,72);
 $("#progressLabel").textContent=Math.round(progress*100).toLocaleString("fa-IR")+"٪";
}
function audioBuffer(rate,dur){
 const n=Math.round(rate*dur),buffer=ac.createBuffer(2,n,rate);
 const left=buffer.getChannelData(0),right=buffer.getChannelData(1);
 let smooth=0,seed=192507;
 for(let i=0;i<n;i++){
  const t=i/rate,p=t/dur;
  seed=(Math.imul(seed,1664525)+1013904223)|0;
  const noise=(seed>>>0)/2147483648-1;
  smooth+=.055*(noise-smooth);
  const gate=Math.max(0,Math.min(1,p*28,(1-p)*20));
  const active=p<.80?1:.30*Math.pow(Math.max(0,Math.sin(p*Math.PI*175)),2);
  const tap=[.82,.86,.90,.95].reduce((a,d)=>a+Math.exp(-Math.pow((p-d)*dur/.015,2)*6),0);
  const s=(noise*.55+smooth*.45)*.034*gate*active+tap*.021*Math.sin(2*Math.PI*186*t);
  left[i]=s;right[i]=s*.94;
 }
 return buffer;
}
async function playback(){
 cancelAnimationFrame(raf);running=false;
 try{src?.stop();src?.disconnect();}catch{}src=null;
 const duration=4;
 if($("#soundMode").value==="on"){
   try{
    ac??=new(window.AudioContext||window.webkitAudioContext)();
    await ac.resume();
    const b=audioBuffer(ac.sampleRate,duration);
    src=ac.createBufferSource();src.buffer=b;
    const gain=ac.createGain();gain.gain.value=.9;
    src.connect(gain).connect(ac.destination);
    startAt=ac.currentTime+.025;src.start(startAt);
   }catch(err){console.warn("Audio disabled:",err);startAt=0;}
 }
 started=performance.now();running=true;
 const tick=()=>{
  if(!running)return;
  const elapsed=(startAt&&ac?.state==="running")?ac.currentTime-startAt:(performance.now()-started)/1000;
  const p=clamp(elapsed/duration);
  frame(p);
  if(p<1)raf=requestAnimationFrame(tick);else{running=false;$("#progressLabel").textContent="انجام شد";}
 };
 tick();
}
export function startWritingPreview(){
 let ready=false;
 const show=()=>{frame(.34);ready=true};
 const face=new FontFace("Vazirmatn",'url("../skills/anidoodle/engine/assets/fonts/Vazirmatn-Variable.ttf")',{weight:"100 900"});
 face.load().then(font=>{document.fonts.add(font);show()}).catch(show);
 $("#replay").addEventListener("click",playback);
 for(const id of ["writingText","penStyle","paperStyle"]){
  $("#"+id).addEventListener(id==="writingText"?"input":"change",()=>{
   if(!running)frame(.34);
  });
 }
 if(!ready)frame(.34);
}

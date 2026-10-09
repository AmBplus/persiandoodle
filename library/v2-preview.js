// Curated motion previews: category-specific, not 534 tinted copies.
// Each family's own compositional metaphor is rendered on a single canvas.
// Original clips remain source REFERENCES, while native Persian film videos
// are played as produced by the Anidoodle film renderer.
const PI=Math.PI,TAU=2*PI,clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{let x=clamp(n);return x*x*(3-2*x)};
const colors=[["#eef3ef","#193b4d","#bf8666","#9bc3c2"],["#e8f2f8","#1c5773","#d49c62","#86c2d2"],["#f6eddf","#4e3930","#c08058","#ddbfa0"],["#0c2334","#e7e2c7","#d8ab66","#3d738a"]];
const txt=(c,s,x,y,size,color,bold=700)=>{c.save();c.direction="rtl";c.textAlign="right";c.font=`${bold} ${size}px Vazirmatn, Tahoma`;c.fillStyle=color;c.fillText(s,x,y);c.restore();};
const rrect=(c,x,y,w,h,r,col)=>{c.fillStyle=col;c.beginPath();c.roundRect(x,y,Math.max(.01,w),Math.max(.01,h),r);c.fill()};
const stroke=(c,pts,col,width=4,p=1)=>{c.beginPath();c.strokeStyle=col;c.lineWidth=width;c.lineCap="round";c.lineJoin="round";pts.slice(0,Math.max(2,Math.ceil(pts.length*clamp(p)))).forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()};
const dots=(c,points,col,r=8)=>{c.fillStyle=col;points.forEach(([x,y])=>{c.beginPath();c.arc(x,y,r,0,TAU);c.fill()})};
function main(c,f,p,C){
 const [bg,ink,a,soft]=C;
 switch(f){
 case "ink-brand":{const len=260*ease(p);
   stroke(c,[[185,255],[185+len,255],[185+len,265]],a,6,p);stroke(c,[[770,320],[770-len,320]],ink,7,p);
   txt(c,"پرشین دودل",775,280,60,ink);txt(c,"هویت از یک خط آغاز می‌شود",780,365,24,ink,500);
   break}
 case "editorial-opening":{c.save();c.translate(480,270);c.scale(.75+.25*p,.75+.25*p);rrect(c,-240,-160,480,330,24,soft);
   rrect(c,-195,-106,390,40,8,ink);for(let i=0;i<4;i++)rrect(c,-195,-35+i*45,110+i*60,18,5,i===2?a:"#9ebcc7");c.restore();break}
 case "brand-reveal":{for(let i=0;i<9;i++){let a1=i/9*TAU+p;const x=480+190*Math.cos(a1),y=275+120*Math.sin(a1);rrect(c,x-22,y-22,44,44,10,i%2?a:soft)}txt(c,"نشان",542,307,80,ink);break}
 case "handwriting":{txt(c,"خط فارسی",765,287,71,ink);stroke(c,[[745,319],[660,332],[540,323],[403,333],[312,328]],a,9,p);
   c.save();c.translate(745-(430*p),327);c.rotate(-.38);rrect(c,-3,-56,6,56,3,"#896144");c.restore();break}
 case "typewriter":{rrect(c,245,145,510,265,15,"#fff");for(let i=0;i<5;i++)rrect(c,293,188+i*39,(i%2?315:375)*p,13,4,soft);
   txt(c,"درست نوشتن",696,230,31,ink);rrect(c,695-284*p,239,4,38,2,a);break}
 case "kinetic":{c.save();c.translate(480,272);c.rotate((1-p)*.20);c.scale(.75+.25*p,.75+.25*p);
   txt(c,"حرکت",175,21,118,ink);c.restore();rrect(c,630,330,185*p,27,4,a);break}
 case "path-type":{stroke(c,Array.from({length:65},(_,i)=>[145+i*10,300+48*Math.sin(i/10)]),a,8,p);txt(c,"روی مسیر",755,224,47,ink);break}
 case "card-motion":{for(let i=0;i<4;i++){let x=150+i*155,y=208+(1-p)*(i%2?145:-100);rrect(c,x,y,142,192,14,i%2?ink:soft);txt(c,["آغاز","روش","نتیجه","پایان"][i],x+121,y+100,22,i%2?bg:ink)}break}
 case "vector-draw":{c.strokeStyle=ink;c.lineWidth=5;c.beginPath();c.arc(485,290,125,0,TAU*p);c.stroke();
   stroke(c,[[340,290],[400,345],[490,230],[610,255]],a,8,p);break}
 case "panel-build":{for(let i=0;i<3;i++){rrect(c,140+i*245,175+(2-i)*25,217,235*p,18,i%2?soft:ink);rrect(c,170+i*245,225,110*p,11,3,a)}break}
 case "push-zoom":{for(let i=0;i<4;i++){const k=.6+(i*.15)+(p*.21);c.save();c.translate(480,270);c.scale(k,k);c.strokeStyle=i%2?a:ink;c.lineWidth=2.5;c.strokeRect(-220,-125,440,250);c.restore();}break}
 case "camera-tour":{rrect(c,140,135,680,290,16,soft);rrect(c,192+p*95,155,220,230,13,a);rrect(c,450,185+p*17,260,195,13,ink);break}
 case "spatial":{for(let i=3;i>=0;i--){const s=1-i*.17+(p*.06);c.save();c.translate(480,270);c.scale(s,s);c.strokeStyle=i%2?soft:a;c.lineWidth=17;c.strokeRect(-270,-128,540,256);c.restore()}break}
 case "number":{txt(c,(Math.round(100+24500*p)).toLocaleString("fa-IR"),745,316,118,ink);txt(c,"ثبت موفق",730,370,27,a);break}
 case "chart":{for(let i=0;i<8;i++){let H=(75+(i*91)%175)*p;rrect(c,162+i*82,408-H,47,H,6,i%2?a:ink);}break}
 case "compare":{rrect(c,140,160,680,260,12,soft);c.fillStyle=a;c.fillRect(140,160,680*p,260);c.strokeStyle=ink;c.lineWidth=5;c.beginPath();c.moveTo(140+680*p,145);c.lineTo(140+680*p,434);c.stroke();txt(c,"قبل",310,305,40,ink);txt(c,"بعد",690,305,40,bg);break}
 case "command":{rrect(c,170,155,620,240,17,soft);rrect(c,200,188,560,55,12,"#fff");txt(c,"دستور طراحی",690,226,23,ink);for(let i=0;i<3;i++){rrect(c,207,262+i*34,520*p,19,4,i%2?a:"#b9d1d2");}break}
 case "selection":{for(let i=0;i<5;i++){const x=175+i*125;rrect(c,x,234,110,106,18,i===Math.floor(p*4.99)?a:soft);txt(c,["۱","۲","۳","۴","۵"][i],x+66,304,34,ink)}break}
 case "flow":{const pts=[[215,270],[470,185],[735,280]];pts.forEach(([x,y],i)=>{rrect(c,x-70,y-45,140,90,14,i%2?a:ink);txt(c,["پرسش","پردازش","پاسخ"][i],x+49,y+10,20,bg)});
   for(let i=0;i<pts.length-1;i++)stroke(c,[pts[i],pts[i+1]],a,5,p);break}
 case "ink-wipe":{c.fillStyle=a;c.beginPath();c.arc(480,270,p*350,0,TAU);c.fill();for(let i=0;i<18;i++){c.beginPath();c.arc(480+(i%6-2.5)*65,270+(Math.floor(i/6)-1)*85,4+27*p,0,TAU);c.fill()}break}
 case "shape-morph":{c.fillStyle=a;c.beginPath();c.roundRect(480-150*p,270-118*p,300*p,236*p,100*(1-p)+14*p);c.fill();c.fillStyle=ink;c.beginPath();c.arc(480,270,85*(1-p)+24,0,TAU);c.fill();break}
 case "hard-cut":{c.fillStyle=ink;c.fillRect(90,125,770*p,280);c.fillStyle=a;c.fillRect(90,125,750*Math.max(0,p-.36),280);break}
 case "beat-motion":{for(let i=0;i<5;i++){const h=50+170*Math.abs(Math.sin(p*TAU*2+i*.9));rrect(c,190+i*125,370-h,80,h,10,i%2?a:ink)}break}
 case "timing":{const pts=Array.from({length:30},(_,i)=>[140+i*24,340-120*ease(i/29)+40*Math.sin(i*.6)*Math.sin(p*PI)]);stroke(c,pts,ink,8,p);dots(c,[[145+710*p,340-120*p]],a,16);break}
 case "lighting":{const gr=c.createRadialGradient(180+600*p,270,10,480,270,350);gr.addColorStop(0,a);gr.addColorStop(1,bg);c.fillStyle=gr;c.fillRect(0,0,960,540);txt(c,"نور",660,315,88,ink);break}
 case "feedback":{for(let i=0;i<8;i++){let a1=i*TAU/8;stroke(c,[[480+90*Math.cos(a1),270+90*Math.sin(a1)],[480+(95+135*p)*Math.cos(a1),270+(95+135*p)*Math.sin(a1)]],a,8,p)}txt(c,"تأیید",555,292,51,ink);break}
 case "texture":{for(let i=0;i<160;i++){const x=120+((i*47)%710),y=150+((i*97)%270);rrect(c,x,y,2+10*p,2+10*p,2,i%4?a:soft)}break}
 case "brand-outro":{c.fillStyle=a;c.beginPath();c.arc(480,270,125*p,0,TAU);c.fill();txt(c,"پ",518,301,96,ink);break}
 case "clean-exit":{txt(c,"پایان، آغاز بعدی",755-(1-p)*80,270,53,ink);stroke(c,[[735,308],[380,308]],a,6,p);break}
 case "explainer":{for(let i=0;i<3;i++){const x=185+i*225;dots(c,[[x+56,258]],i%2?ink:a,42);txt(c,["ایده","شیوه","نتیجه"][i],x+92,340,26,ink)}break}
 case "talking-motion":{rrect(c,155,155,650,260,16,soft);txt(c,"نکتهٔ کلیدی",715,228,44,ink);stroke(c,[[700,257],[430,257]],a,7,p);break}
 case "onetake":{stroke(c,Array.from({length:80},(_,i)=>[115+i*9,270+75*Math.sin(i*.15)]),a,9,p);dots(c,[[115+720*p,270+75*Math.sin(p*12)]],ink,17);break}
 case "camera-carry":{c.strokeStyle=ink;c.lineWidth=15;c.beginPath();c.arc(480,270,155,0,TAU*p);c.stroke();rrect(c,380+80*p,218,205,110,20,a);break}
 default:break;
 }
}
export function drawSignature(canvas,category,family,variant,progress=.82){
 const c=canvas.getContext("2d",{alpha:false});if(!c)return;
 const w=canvas.width||960,h=canvas.height||540,p=ease(progress);
 const seed=[...String(family?.id||category?.id)].reduce((n,ch)=>Math.imul(n^ch.charCodeAt(0),16777619)>>>0,2166136261);
 const C=colors[seed%colors.length];c.save();c.fillStyle=C[0];c.fillRect(0,0,960,540);
 if(["background","pen"].includes(category?.id)){
   const id=variant?.name||family?.id||"warm-paper";
   if(category.id==="background"){
     if(id==="blueprint"||id==="night-ink"){c.strokeStyle=C[3];c.lineWidth=1;for(let i=0;i<960;i+=31){c.beginPath();c.moveTo(i,0);c.lineTo(i,540);c.stroke()}for(let i=0;i<540;i+=31){c.beginPath();c.moveTo(0,i);c.lineTo(960,i);c.stroke()}}
     if(id==="parchment"){c.strokeStyle=C[2];c.lineWidth=3;c.strokeRect(70,55,820,410);c.strokeRect(82,67,795,385)}
     txt(c,"ایده‌ها جان می‌گیرند",792,285,55,C[1]);
   }else{
     txt(c,"طراحی با خط",780,290,58,C[1]);
     stroke(c,[[725,332],[620,347],[518,329],[414,344],[280,330]],C[2],9,p);
     c.save();c.translate(725-445*p,336);c.rotate(-.39);rrect(c,-4,-83,8,83,4,"#77543e");c.restore();
   }
 }else if(category.id==="font"){
   txt(c,"زیباییِ فارسی",800,310,65,C[1]);stroke(c,[[750,357],[260,357]],C[2],8,p);
 }else if(category.id==="music"||category.id==="sound"){
   for(let i=0;i<68;i++){const x=140+i*10,h=10+Math.abs(Math.sin(i*.37+seed%13)*Math.sin(i*.13+p*3))*165;rrect(c,x,266-h/2,5,h,3,i%3?C[1]:C[2])}
 }else if(category.id==="style"){
   // The real native Persian video is authoritative for these cards.
   main(c,"shapes",p,C);
 }else{
   main(c,family?.id||"",p,C);
 }
 const title=(family?.name||category?.title||"کتابخانهٔ حرکت");
 txt(c,title,875,95,40,C[1]);
 txt(c,"نمونهٔ تکنیک با متن فارسی",860,475,23,C[1],500);
 rrect(c,80,499,800*p,5,3,C[2]);c.restore();
}
export function playSignature(canvas,category,family,variant,button){
 let cancelled=false,start=performance.now();if(button)button.disabled=true;
 const tick=t=>{if(cancelled)return;const p=clamp((t-start)/2500);
 drawSignature(canvas,category,family,variant,p);
 if(p<1)requestAnimationFrame(tick);else if(button)button.disabled=false;};
 requestAnimationFrame(tick);return()=>{cancelled=true;if(button)button.disabled=false};
}
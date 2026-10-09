import {synthPenScore,showcasePenCues} from "../src/canvas-core/persianPenAudio";
import {PALETTES,paintPaper,paintPen} from "../src/canvas-core/persianSceneKit";
export const name="deterministic visual-pen and sync-sound test";
export const run=(ok:(x:boolean,m:string)=>void)=>{
  const sr=12000,fps=30,frames=400;
  const [a,b]=synthPenScore(sr,fps,frames),[again]=synthPenScore(sr,fps,frames);
  ok(a.length===160000&&b.length===a.length,"audio duration locks to exact video frame count");
  ok(a.every((v,i)=>Number.isFinite(v)&&v===again[i]),"pen soundtrack is deterministic at every PCM sample");
  const max=Math.max(...Array.from(a.filter((_,i)=>i%21===0)).map(Math.abs));
  ok(max>.008&&max<.4,"pen tip sounds audible but avoid clipping or beeps");
  const rms=(from:number,to:number)=>{
    let x=0,n=0;
    for(let i=Math.floor(from*sr);i<Math.min(a.length,Math.floor(to*sr));i++){x+=a[i]*a[i];n++;}
    return Math.sqrt(x/Math.max(1,n));
  };
  ok(rms(.5,1.2)>rms(3.1,3.2)*1.12,"writing sound energy follows a moving visual nib, not silence");
  ok(showcasePenCues.every(c=>c.from<c.to&&c.from>=0&&c.to<=400),"every audio stroke maps onto film frames");
  ok(Object.keys(PALETTES).length===5,"five reusable background looks exist");
  let methods:string[]=[];
  const ctx:any={save:()=>{},restore:()=>{},fillRect:()=>{methods.push("fillRect");},beginPath:()=>{},moveTo:()=>{},lineTo:()=>{},stroke:()=>{},strokeRect:()=>{},translate:()=>{},rotate:()=>{},scale:()=>{},quadraticCurveTo:()=>{},fill:()=>{},closePath:()=>{}};
  // SVG actors deliberately use native Canvas without host-specific APIs.
  const pens=["fountain","qalam","pencil","marker","brush","none"] as const;
  for(const p of pens)paintPen(ctx,[10,20],0,p,1);
  for(const bg of Object.keys(PALETTES) as (keyof typeof PALETTES)[])paintPaper(ctx,640,360,bg);
  ok(methods.length>0,"pens and backgrounds are portable Canvas primitives");
};

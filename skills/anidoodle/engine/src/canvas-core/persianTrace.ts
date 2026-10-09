// Font-independent traced Persian ink. The browser shapes the ENTIRE RTL run first,
// including lam-alef, ligatures, joining, ZWNJ, vowels and mixed numeric runs.
// A cached one-pixel skeleton is extracted from the alpha mask; a pen visits the
// glyphs' actual internal geometry instead of sweeping a rectangular text reveal.
// This is a centreline approximation, NOT historical Nastaliq stroke sequencing.
import type { Ctx, Env, Layer, P } from "./core";
import { normalizeIranianPersian, persianDigits } from "./persianText";
import { buildInkPlan, inkOpacity, nibPosition, type InkPlan } from "./persianInkPlan";
import { paintPen, type PenStyle } from "./persianSceneKit";

export type TraceOptions = {
  text: string; family: string; size: number; x: number; y: number;
  progress: number; weight?: string | number; color?: string;
  pen?: boolean; penColor?: string; digits?: "preserve" | "persian";
  normalize?: boolean; strokeWidth?: number; penStyle?: PenStyle; penScale?: number;
};
export type TraceSegment = { points: P[]; length: number };
export type TraceResult = { width: number; totalPath: number; pen: P | null; tracks: number; marks: number; inkPixels: number };
type Prepared = { mask: Layer; W: number; H: number; right: number; baseline: number;
  width: number; segments: TraceSegment[]; total: number;
  rgba: Uint8ClampedArray; plan: InkPlan };

// Zhang-Suen morphological thinning. Pure binary input; never guesses Unicode
// character boundaries and therefore cannot separate joined Persian forms.
export const skeletonizeInk = (pixels: Uint8Array, w: number, h: number, limit = 50): Uint8Array => {
  const bits = pixels.slice(), gone: number[] = [];
  const at = (x: number, y: number) => bits[y * w + x] ? 1 : 0;
  for (let turn = 0; turn < limit; turn++) {
    let changed = false;
    for (let pass = 0; pass < 2; pass++) {
      gone.length = 0;
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (!bits[idx]) continue;
        const v = [at(x,y-1), at(x+1,y-1), at(x+1,y), at(x+1,y+1),
          at(x,y+1), at(x-1,y+1), at(x-1,y), at(x-1,y-1)];
        const neighbors = v.reduce((a,b) => a+b, 0);
        if (neighbors < 2 || neighbors > 6) continue;
        let transitions = 0;
        for (let i = 0; i < 8; i++) if (v[i] === 0 && v[(i+1)%8] === 1) transitions++;
        if (transitions !== 1) continue;
        const [n,,e,,s,,west] = v;
        if (pass === 0 ? n*e*s || e*s*west : n*e*west || n*s*west) continue;
        gone.push(idx);
      }
      if (gone.length) changed = true;
      for (const idx of gone) bits[idx] = 0;
    }
    if (!changed) break;
  }
  return bits;
};

// A topologically complete stroke graph. The previous implementation visited
// each skeleton *pixel* once, skipping branch edges and leaving some glyph
// contours to magically fill themselves. Here we visit each EDGE exactly once.
const neighbors8: P[] = [[-1,0],[0,-1],[1,0],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
const reverse8=[2,3,0,1,7,6,5,4];
export const inkTracks = (bits: Uint8Array, w: number, h: number): TraceSegment[] => {
  const ids:number[]=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(bits[y*w+x])ids.push(y*w+x);
  const near=(id:number):{id:number;dir:number}[]=>{
    const x=id%w,y=Math.floor(id/w),out:{id:number;dir:number}[]=[];
    neighbors8.forEach(([dx,dy],dir)=>{
      const nx=x+dx,ny=y+dy;
      if(nx<0||nx>=w||ny<0||ny>=h||!bits[ny*w+nx])return;
      // Do not double-connect a diagonal if either bridging orthogonal pixel
      // exists: that creates false triangular cycles at Persian joins.
      if(dx&&dy&&(bits[y*w+nx]||bits[ny*w+x]))return;
      out.push({id:ny*w+nx,dir});
    });
    return out;
  };
  const visited=new Uint8Array(w*h);
  const edgeDone=(id:number,dir:number)=>!!(visited[id]&(1<<dir));
  const markEdge=(a:number,dir:number,b:number)=>{
    visited[a]|=1<<dir;visited[b]|=1<<reverse8[dir];
  };
  const degree=new Uint8Array(w*h);
  for(const id of ids)degree[id]=near(id).length;
  // Stroke ordering starts rightmost: the phrase remains logically RTL.
  ids.sort((a,b)=>b%w-a%w||Math.floor(a/w)-Math.floor(b/w));
  const strokes:TraceSegment[]=[];
  const push=(points:P[],length:number)=>{
    if(points.length)strokes.push({points,length:Math.max(.5,length)});
  };
  for(const from of [...ids.filter(id=>degree[id]!==2),...ids.filter(id=>degree[id]===2)]){
    if(degree[from]===0){
      if(!visited[from]){visited[from]=255;push([[from%w,Math.floor(from/w)]],.5);}
      continue;
    }
    for(const next of near(from)){
      if(edgeDone(from,next.dir))continue;
      const pts:P[]=[[from%w,Math.floor(from/w)]];
      let current=from,edge=next,length=0;
      while(true){
        const nextId=edge.id,px=current%w,py=Math.floor(current/w),
          qx=nextId%w,qy=Math.floor(nextId/w);
        if(edgeDone(current,edge.dir))break;
        markEdge(current,edge.dir,nextId);
        length+=Math.hypot(qx-px,qy-py);
        pts.push([qx,qy]);
        if(degree[nextId]!==2)break;
        const following=near(nextId).find(n=>!edgeDone(nextId,n.dir));
        if(!following)break;
        current=nextId;edge=following;
        if(pts.length>bits.length+1)throw new Error("skeleton loop did not terminate");
      }
      push(pts,length);
    }
  }
  return strokes.sort((a,b)=>{
    const ar=Math.max(...a.points.map(p=>p[0])),br=Math.max(...b.points.map(p=>p[0]));
    return br-ar || a.points[0][1]-b.points[0][1];
  });
};

const clamp = (x: number) => Number.isFinite(x) ? Math.max(0,Math.min(1,x)) : 0;
const fontCSS = (o: TraceOptions) => `${o.weight ?? 400} ${o.size}px "${o.family.replace(/"/g,"")}"`;

const prepare = (ctx: Ctx, env: Env, o: TraceOptions, text: string): Prepared => {
  ctx.save(); ctx.font=fontCSS(o); ctx.direction="rtl"; ctx.textAlign="right";
  const metrics=ctx.measureText(text), width=metrics.width; ctx.restore();
  const pad=Math.max(12,Math.ceil(o.size*.75));
  const W=Math.max(10,Math.ceil(width)+pad*2), H=Math.ceil(o.size*2.8)+pad*2;
  const right=W-pad, baseline=pad+Math.ceil(o.size*1.45);
  const mask=env.canvas(W,H), m=mask.ctx;
  m.clearRect(0,0,W,H);m.font=fontCSS(o);m.textAlign="right";m.direction="rtl";
  m.textBaseline="alphabetic";m.fillStyle=o.color??"#17496b";m.fillText(text,right,baseline);
  const rgba=m.getImageData(0,0,W,H).data, alpha=new Uint8Array(W*H);
  const skeletonInput=new Uint8Array(W*H);
  for(let i=0;i<alpha.length;i++){
    alpha[i]=rgba[4*i+3];
    skeletonInput[i]=alpha[i]>45?1:0;
  }
  const skeleton=skeletonizeInk(skeletonInput,W,H);
  const segments=inkTracks(skeleton,W,H);
  const plan=buildInkPlan(alpha,segments,W,H,o.size);
  return {mask,W,H,right,baseline,width,segments,rgba,plan,
    total:segments.reduce((a,s)=>a+s.length,0)};
};

export const drawPersianTrace = (ctx: Ctx, env: Env, o: TraceOptions): TraceResult => {
  const progress=clamp(o.progress);
  let text=o.normalize===false?o.text:o.text.normalize("NFC");
  if(o.normalize!==false)text=normalizeIranianPersian(text);
  if(o.digits==="persian")text=persianDigits(text);
  // Final color and every individual ink pixel are immutable across frames.
  // Only the ink-arrival time and the pen position depend on progress.
  const key=JSON.stringify(["persian-ink-deposit-v3",text,o.family,o.size,
    o.weight??400,o.color??"#17496b"]);
  let p=env.cache.get(key) as Prepared|undefined;
  if(!p){p=prepare(ctx,env,o,text);env.cache.set(key,p);}
  const destX=o.x-p.right,destY=o.y-p.baseline;
  if(progress>0){
    if(progress>=.99){
      // Every final ink pixel has already appeared by .987; this is pixel-identical
      // to the scheduled raster, NOT an end-frame fill/snap.
      ctx.drawImage(p.mask.canvas,destX,destY);
    }else{
      const paint=env.canvas(p.W,p.H),c=paint.ctx,im=c.createImageData(p.W,p.H);
      const d=im.data,src=p.rgba,times=p.plan.times;
      for(let i=0;i<times.length;i++){
        const a=src[4*i+3];
        if(a===0)continue;
        const opacity=inkOpacity(times[i],progress);
        if(opacity<=0)continue;
        const o4=i*4;d[o4]=src[o4];d[o4+1]=src[o4+1];
        d[o4+2]=src[o4+2];d[o4+3]=Math.round(a*opacity);
      }
      c.putImageData(im,0,0);
      ctx.drawImage(paint.canvas,destX,destY);
    }
  }
  const track=p.plan.tracks.find(t=>progress>=t.start&&progress<t.end);
  const pen=track&&o.pen!==false?nibPosition([track],progress):null;
  if(pen && track){
    const phase=(progress-track.start)/Math.max(1e-7,track.end-track.start);
    // A pen lifts between separated dots/strokes. Its body remains nearly
    // vertical in a calm writer's grip, rather than spinning with every edge.
    const fade=Math.min(1,phase*16,(1-phase)*16);
    if(fade>0){
      ctx.save();ctx.globalAlpha*=fade;
      paintPen(ctx,[destX+pen[0],destY+pen[1]],0,
        o.penStyle??"qalam",o.penScale??o.size/95,o.penColor??"#a17745");
      ctx.restore();
    }
  }
  return {width:p.width,totalPath:p.total,pen:pen?[destX+pen[0],destY+pen[1]]:null,
    tracks:p.segments.length,marks:p.plan.markComponents,inkPixels:p.plan.inkPixels};
};

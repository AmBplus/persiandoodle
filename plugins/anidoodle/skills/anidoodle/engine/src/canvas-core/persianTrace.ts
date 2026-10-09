// Font-independent traced Persian ink. The browser shapes the ENTIRE RTL run first,
// including lam-alef, ligatures, joining, ZWNJ, vowels and mixed numeric runs.
// A cached one-pixel skeleton is extracted from the alpha mask; a pen visits the
// glyphs' actual internal geometry instead of sweeping a rectangular text reveal.
// This is a centreline approximation, NOT historical Nastaliq stroke sequencing.
import type { Ctx, Env, Layer, P } from "./core";
import { normalizeIranianPersian, persianDigits } from "./persianText";

export type TraceOptions = {
  text: string; family: string; size: number; x: number; y: number;
  progress: number; weight?: string | number; color?: string;
  pen?: boolean; penColor?: string; digits?: "preserve" | "persian";
  normalize?: boolean; strokeWidth?: number;
};
export type TraceSegment = { points: P[]; length: number };
export type TraceResult = { width: number; totalPath: number; pen: P | null; tracks: number };
type Prepared = { mask: Layer; W: number; H: number; right: number; baseline: number;
  width: number; segments: TraceSegment[]; total: number };

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

const neighbors8: P[] = [[-1,0],[0,-1],[1,0],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
// Sort pen strokes RTL. Connected runs are walked along their real skeleton;
// branches and detached marks get their own strokes (pen lifts between them).
export const inkTracks = (bits: Uint8Array, w: number, h: number): TraceSegment[] => {
  const ids: number[] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (bits[y*w+x]) ids.push(y*w+x);
  const near = (id: number) => {
    const x = id % w, y = Math.floor(id / w);
    return neighbors8.map(([dx,dy]) => (y+dy)*w+x+dx)
      .filter(n => n >= 0 && n < bits.length && bits[n]);
  };
  const degree = new Map<number,number>();
  ids.forEach(id => degree.set(id,near(id).length));
  const order = ids.sort((a,b) => (b%w-a%w) || (Math.floor(a/w)-Math.floor(b/w)));
  const endpoints = order.filter(id => degree.get(id)! <= 1);
  const starts = [...endpoints,...order];
  const seen = new Uint8Array(bits.length), out: TraceSegment[] = [];
  for (const start of starts) {
    if (seen[start]) continue;
    const track: P[] = []; let here = start, prev = -1, length = 0;
    while (!seen[here]) {
      seen[here] = 1;
      const p: P = [here % w, Math.floor(here / w)];
      if (track.length) length += Math.hypot(p[0]-track[track.length-1][0], p[1]-track[track.length-1][1]);
      track.push(p);
      const candidates = near(here).filter(id => !seen[id]);
      if (!candidates.length) break;
      // Prefer continuing the stroke direction through intersections.
      candidates.sort((a,b) => {
        if (prev < 0) return (b%w-a%w) || a-b;
        const px = here%w-prev%w, py = Math.floor(here/w)-Math.floor(prev/w);
        const cost = (id: number) => {
          const dx=id%w-here%w,dy=Math.floor(id/w)-Math.floor(here/w);
          return (px*dx+py*dy)/(Math.hypot(px,py)*Math.hypot(dx,dy)||1);
        };
        return cost(b)-cost(a) || (b%w-a%w);
      });
      prev=here; here=candidates[0];
    }
    if (track.length) out.push({points:track,length:Math.max(length,0.5)});
  }
  return out;
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
  const data=m.getImageData(0,0,W,H).data, bits=new Uint8Array(W*H);
  for(let i=0;i<bits.length;i++) bits[i]=data[4*i+3]>45?1:0;
  const skeleton=skeletonizeInk(bits,W,H);
  const segments=inkTracks(skeleton,W,H);
  return {mask,W,H,right,baseline,width,segments,total:segments.reduce((a,s)=>a+s.length,0)};
};

export const drawPersianTrace = (ctx: Ctx, env: Env, o: TraceOptions): TraceResult => {
  const progress=clamp(o.progress);
  let text=o.normalize===false?o.text:o.text.normalize("NFC");
  if(o.normalize!==false)text=normalizeIranianPersian(text);
  if(o.digits==="persian")text=persianDigits(text);
  // A new cache entry for a font/weight/size/color/text combination; never reuse
  // an atlas across incompatible faces. Cache persists across timeline frames.
  const key=JSON.stringify(["persian-trace-v2",text,o.family,o.size,o.weight??400,o.color??"#17496b"]);
  let p=env.cache.get(key) as Prepared|undefined;
  if(!p){p=prepare(ctx,env,o,text);env.cache.set(key,p);}
  const destX=o.x-p.right,destY=o.y-p.baseline;
  let pen:P|null=null;
  if(progress>=1 || p.total===0){
    if(progress>0)ctx.drawImage(p.mask.canvas,destX,destY);
  }else if(progress>0){
    const paint=env.canvas(p.W,p.H), c=paint.ctx;
    c.clearRect(0,0,p.W,p.H);
    c.lineCap="round";c.lineJoin="round";c.strokeStyle="#fff";
    c.lineWidth=o.strokeWidth??Math.max(3,o.size*.25);
    let budget=p.total*progress;
    for(const seg of p.segments){
      if(budget<=0)break;
      const pts=seg.points;
      if(!pts.length)continue;
      if(pts.length===1){
        c.beginPath();c.arc(pts[0][0],pts[0][1],c.lineWidth/2,0,Math.PI*2);c.fillStyle="#fff";c.fill();
        pen=pts[0];budget-=seg.length;continue;
      }
      c.beginPath();c.moveTo(...pts[0]);
      let left=Math.min(budget,seg.length);
      for(let i=1;i<pts.length;i++){
        const [ax,ay]=pts[i-1], [bx,by]=pts[i], len=Math.hypot(bx-ax,by-ay);
        if(left<=0)break;
        if(len<=left){c.lineTo(bx,by);pen=[bx,by];left-=len;}
        else{const t=left/len;pen=[ax+(bx-ax)*t,ay+(by-ay)*t];c.lineTo(...pen);left=0;}
      }
      c.stroke();budget-=seg.length;
      if(budget<=0)break;
    }
    // Mask physically painted tracks against the completed shaped glyph contours:
    // accurate joining, diacritics, ligatures and crisp end-state with no raster sweep.
    c.globalCompositeOperation="source-in";
    c.drawImage(p.mask.canvas,0,0);
    c.globalCompositeOperation="source-over";
    ctx.drawImage(paint.canvas,destX,destY);
  }
  if(pen && o.pen!==false && progress>0 && progress<1){
    ctx.save();ctx.translate(destX+pen[0],destY+pen[1]);
    ctx.rotate(-Math.PI*.23);
    ctx.fillStyle=o.penColor??"#d39b4e";
    ctx.beginPath();ctx.ellipse(0,-3,2.5,7,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  return {width:p.width,totalPath:p.total,pen:pen?[destX+pen[0],destY+pen[1]]:null,tracks:p.segments.length};
};

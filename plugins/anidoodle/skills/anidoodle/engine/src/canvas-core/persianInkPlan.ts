// Deterministic, per-pixel ink-deposition schedule for browser-shaped Persian glyphs.
// Unlike masking a growing rectangle or thickening all previously-drawn strokes,
// each final opaque pixel gets a permanent arrival time from a nearby path sample.
// "Finished" never triggers a replacement frame: by 0.99, all ink has arrived.
import type { P } from "./core";

export type InkTrack = { points: P[]; length: number; start: number; end: number; mark: boolean };
export type InkPlan = {
  times: Uint16Array; tracks: InkTrack[]; inkPixels: number;
  bodyComponents: number; markComponents: number; lastInkTime: number;
};
type Blob = { id: number; area: number; minX: number; maxX: number; minY: number; maxY: number;
  mark: boolean; seed: number; paths: { points: P[]; length: number }[] };
const neighbors: P[] = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
export const classifyInkBlobs = (alpha: Uint8Array, w: number, h: number, em: number) => {
  const labels = new Int32Array(w*h).fill(-1), blobs: Blob[] = [];
  const stack: number[] = [];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const first=y*w+x;
    if(alpha[first]===0 || labels[first]>=0)continue;
    const id=blobs.length;
    const b:Blob={id,area:0,minX:x,maxX:x,minY:y,maxY:y,mark:false,seed:first,paths:[]};
    labels[first]=id;stack.push(first);
    while(stack.length){
      const p=stack.pop()!,px=p%w,py=Math.floor(p/w);
      b.area++;b.minX=Math.min(b.minX,px);b.maxX=Math.max(b.maxX,px);
      b.minY=Math.min(b.minY,py);b.maxY=Math.max(b.maxY,py);
      for(const [dx,dy] of neighbors){
        const qx=px+dx,qy=py+dy;
        if(qx<0||qx>=w||qy<0||qy>=h)continue;
        const next=qy*w+qx;
        if(alpha[next] && labels[next]<0){labels[next]=id;stack.push(next);}
      }
    }
    blobs.push(b);
  }
  const largest=blobs.reduce((a,b)=>Math.max(a,b.area),0);
  for(const b of blobs){
    const bw=b.maxX-b.minX+1,bh=b.maxY-b.minY+1;
    // Isolated diacritics, Persian dots and punctuation: small in BOTH axes
    // and small against the largest connected body. Tall alef is never a dot.
    // Three adjacent points or a two-dot pair often form ONE connected blob
    // that is much wider than a single dot; height and mass still mark it.
    b.mark=blobs.length>1 && bw<=em*.46 && bh<=em*.27 &&
      b.area<=Math.max(5,Math.min(em*em*.068,largest*.38));
  }
  return { labels, blobs };
};

const dist=(a:P,b:P)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
// Edge visits are deterministic and never jump across disjoint components.
// The caller may provide skeleton paths; disconnected marks remain separate.
export const buildInkPlan = (
  alpha: Uint8Array, skeletonPaths: {points:P[];length:number}[],
  w:number,h:number,em:number
):InkPlan=>{
  if(alpha.length!==w*h)throw new Error("alpha dimensions mismatch");
  const {labels,blobs}=classifyInkBlobs(alpha,w,h,em);
  for(const path of skeletonPaths){
    if(!path.points.length)continue;
    const [x,y]=path.points[0],i=Math.round(y)*w+Math.round(x);
    const id=labels[i]??-1;
    if(id>=0)blobs[id].paths.push(path);
  }
  // Nonzero ink that is too small to skeletonize still gets a nib tap.
  for(const b of blobs)if(!b.paths.length){
    const cx=b.seed%w,cy=Math.floor(b.seed/w);
    b.paths.push({points:[[cx,cy]],length:1});
  }
  const ordered=blobs.slice().sort((a,b)=>Number(a.mark)-Number(b.mark) ||
    b.maxX-a.maxX || a.minY-b.minY);
  const body=ordered.filter(b=>!b.mark), marks=ordered.filter(b=>b.mark);
  const tracks:InkTrack[]=[];
  const addTracks=(set:Blob[],start:number,end:number)=>{
    const list=set.flatMap(b=>b.paths.map(p=>({blob:b,path:p})));
    // Allocate a short measurable touch to each dot, not a one-frame flash.
    const weight=(p:{length:number})=>Math.max(5,p.length);
    const all=list.reduce((s,p)=>s+weight(p.path),0);
    let cursor=start;
    for(const {blob,path} of list){
      const fraction=all>0?weight(path)/all:0;
      const finish=cursor+(end-start)*fraction;
      tracks.push({points:path.points,length:Math.max(1,path.length),
        start:cursor,end:finish,mark:blob.mark});
      cursor=finish;
    }
  };
  addTracks(body,.012,marks.length?.80:.953);
  if(marks.length)addTracks(marks,.812,.953);
  // Integer millisecond-like buckets: multi-source geodesic ink spread.
  // Seeds are sampled from the actual traversed skeleton in drawing order,
  // and neighboring pixels appear only AFTER their closest drawn path.
  const times=new Uint16Array(w*h).fill(65535);
  const buckets:number[][]=Array.from({length:4096},()=>[]);
  const enqueue=(id:number,t:number)=>{
    if(!alpha[id]||t>=times[id]||t>=4096)return;
    times[id]=t;buckets[t].push(id);
  };
  for(const t of tracks){
    const pts=t.points;if(!pts.length)continue;
    let length=0;
    for(let k=0;k<pts.length;k++){
      if(k)length+=dist(pts[k-1],pts[k]);
      const [x,y]=pts[k],px=Math.round(x),py=Math.round(y);
      if(px<0||px>=w||py<0||py>=h)continue;
      const at=t.start+(t.end-t.start)*(t.length>0?Math.min(1,length/t.length):1);
      enqueue(py*w+px,Math.round(at*1000));
    }
  }
  for(let tick=0;tick<buckets.length;tick++){
    const bucket=buckets[tick];
    while(bucket.length){
      const id=bucket.pop()!;
      if(times[id]!==tick)continue;
      const x=id%w,y=Math.floor(id/w);
      for(const [dx,dy] of neighbors){
        const xx=x+dx,yy=y+dy;
        if(xx<0||xx>=w||yy<0||yy>=h)continue;
        enqueue(yy*w+xx,tick+(dx&&dy?3:2));
      }
    }
  }
  let max=0,inkPixels=0;
  for(let i=0;i<alpha.length;i++)if(alpha[i]){
    inkPixels++;
    if(times[i]===65535)throw new Error("ink pixel has no drawing path");
    max=Math.max(max,times[i]);
  }
  // Preserve relative per-pixel arrival and guarantee no late last-frame fill.
  if(max>979){
    const k=979/max;
    for(let i=0;i<times.length;i++)if(alpha[i])times[i]=Math.round(times[i]*k);
    max=979;
  }
  return {times,tracks,inkPixels,bodyComponents:body.length,
    markComponents:marks.length,lastInkTime:max/1000};
};

// Pure monotone coverage (a stable 8-tick antialias lead-in); full by 0.987.
// The nib and the deposited ink share the SAME global per-path clock.
export const inkOpacity=(time:number,progress:number)=>{
  const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
  if(p<=0)return 0;
  return Math.max(0,Math.min(1,(p*1000-time)/8));
};
export const nibPosition=(tracks:InkTrack[],progress:number):P|null=>{
  const p=Math.max(0,Math.min(1,progress));
  const t=tracks.find(t=>p>=t.start&&p<t.end);
  if(!t||!t.points.length)return null;const pts=t.points;
  if(pts.length===1)return pts[0];
  const want=(p-t.start)/(t.end-t.start)*t.length;
  let remaining=want;
  for(let i=1;i<pts.length;i++){
    const d=dist(pts[i-1],pts[i]);
    if(d>=remaining){
      const q=d?remaining/d:0;
      return [pts[i-1][0]+q*(pts[i][0]-pts[i-1][0]),
        pts[i-1][1]+q*(pts[i][1]-pts[i-1][1])];
    }
    remaining-=d;
  }
  return pts[pts.length-1];
};

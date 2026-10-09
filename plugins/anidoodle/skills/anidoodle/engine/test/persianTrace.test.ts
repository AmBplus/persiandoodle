import { skeletonizeInk, inkTracks } from "../src/canvas-core/persianTrace";
import { buildInkPlan, classifyInkBlobs, inkOpacity, nibPosition } from "../src/canvas-core/persianInkPlan";
import { persianShowcase } from "../src/canvas-core/persianShowcase";
import { validate } from "../src/canvas-core/film";

export const name = "RTL glyph centerline / actual pen path";
export const run = (ok: (value:boolean,label:string)=>void) => {
  const w=20,h=12,pixels=new Uint8Array(w*h);
  for(let y=2;y<=8;y++)for(let x=4;x<=8;x++)pixels[y*w+x]=1;
  for(let y=2;y<=8;y++)for(let x=12;x<=15;x++)pixels[y*w+x]=1;
  const before=pixels.reduce((n,x)=>n+x,0);
  const skeleton=skeletonizeInk(pixels,w,h);
  const after=skeleton.reduce((n,x)=>n+x,0);
  ok(after>0 && after<before,"skeleton removes interior pixels but keeps shaped strokes");
  ok(pixels.reduce((n,x)=>n+x,0)===before,"input mask is not mutated");
  const tracks=inkTracks(skeleton,w,h);
  ok(tracks.length>=2,"separate glyph-like blobs produce separate pen strokes");
  ok(tracks.every(x=>x.points.every(([px,py])=>skeleton[py*w+px]===1)),
    "every traced point sits on real ink geometry");
  ok(tracks[0].points[0][0]>tracks[tracks.length-1].points[0][0],
    "start paths proceed right-to-left");
  // Large joined body and several small *detached* dot-like components.
  const W=48,H=23,ink=new Uint8Array(W*H);
  for(let y=11;y<=16;y++)for(let x=5;x<=35;x++)ink[y*W+x]=255;
  const dots:[[number,number],[number,number],[number,number]]=[[31,5],[23,5],[15,5]];
  for(const [cx,cy] of dots)for(let y=cy-1;y<=cy+1;y++)
    for(let x=cx-1;x<=cx+1;x++)ink[y*W+x]=255;
  const {blobs}=classifyInkBlobs(ink,W,H,60);
  ok(blobs.filter(b=>b.mark).length===3 &&
    blobs.filter(b=>!b.mark).length===1,"three Persian dots are separated from the connected baseline");
  const dotSkeleton=skeletonizeInk(Uint8Array.from(ink,x=>x?1:0),W,H);
  const paths=inkTracks(dotSkeleton,W,H);
  const plan=buildInkPlan(ink,paths,W,H,60);
  ok(plan.markComponents===3 && plan.bodyComponents===1,
    "component-based scheduler distinguishes body from marks");
  ok(plan.tracks.some(x=>x.mark)&&plan.tracks.every(x=>!x.mark||x.start>=.80),
    "small detached dots are written AFTER the main letter body");
  const BW=18,BH=13,branchInk=new Uint8Array(BW*BH);
  for(let x=4;x<=12;x++)branchInk[7*BW+x]=1;
  for(let y=3;y<=10;y++)branchInk[y*BW+8]=1;
  const connected=inkTracks(branchInk,BW,BH);
  ok(connected.reduce((a,p)=>a+p.points.length-1,0)===15,
    "every skeleton edge is traced, including both arms and the branch junction");
    ok(plan.inkPixels===ink.reduce((n,v)=>n+(v?1:0),0),
    "all dots and body have scheduled ink");
  ok(plan.lastInkTime<=.979,
    "all ink arrives before the final frame, preventing the old full-fill pop");
  const fillCount=(progress:number)=>Array.from(ink).reduce((n,a,i)=>
    n+(a&&inkOpacity(plan.times[i],progress)>=1?1:0),0);
  const counts=[0,.15,.35,.55,.77,.82,.9,.97,.99,1].map(fillCount);
  ok(counts.every((v,i)=>i===0||v>=counts[i-1]),
    "individual ink pixels never unpaint or gain global width");
  ok(counts[counts.length-2]===plan.inkPixels &&
    counts[counts.length-1]===plan.inkPixels,
    "at 99% the frame already matches the 100% font exactly");
  const bodyStart=plan.tracks.find(x=>!x.mark)!;
  const pen=nibPosition(plan.tracks,(bodyStart.start+bodyStart.end)/2);
  ok(!!pen&&ink[Math.round(pen[1])*W+Math.round(pen[0])]!==0,
    "nib physically follows the shaped baseline rather than a reveal curtain");
  const firstDot=plan.tracks.find(x=>x.mark)!;
  ok(!!nibPosition(plan.tracks,(firstDot.start+firstDot.end)/2),
    "pen touches each detached dot at its own drawing time");
    ok(validate(persianShowcase).length===0,"the Persian hero is a valid deterministic film");
  ok(persianShowcase.assets.fonts?.Gulzar!==undefined &&
    persianShowcase.assets.fonts?.Vazirmatn!==undefined,
    "Persian and Nastaliq face assets declared");
};

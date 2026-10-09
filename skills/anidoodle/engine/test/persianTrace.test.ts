import { skeletonizeInk, inkTracks } from "../src/canvas-core/persianTrace";
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
  ok(validate(persianShowcase).length===0,"the Persian hero is a valid deterministic film");
  ok(persianShowcase.assets.fonts?.Gulzar!==undefined &&
    persianShowcase.assets.fonts?.Vazirmatn!==undefined,
    "Persian and Nastaliq face assets declared");
};

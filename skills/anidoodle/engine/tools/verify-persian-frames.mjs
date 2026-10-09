// Pixel-level regression gate for the exact flaw reported by users:
// the old renderer abruptly painted whole glyphs at progress=1.
// The real rendered text region of frame 98 MUST match frame 99 (repeat per scene).
// No extra npm dependencies: ffmpeg is already a required video-render backend.
import {spawnSync} from "node:child_process";
import {join} from "node:path";
const pairs=[[98,99],[198,199],[298,299],[398,399]];
const hash=(frame)=>{
  const file=join("out","persian-showcase",`persianShowcase-${frame}.png`);
  const p=spawnSync(process.env.FFMPEG??"ffmpeg",[
    "-hide_banner","-loglevel","error","-i",file,
    "-vf","crop=890:450:350:180,format=rgba",
    "-f","hash","-hash","sha256","-",
  ],{encoding:"utf8"});
  if(p.error||p.status!==0)throw new Error(`frame ${frame}: ${p.error?.message??p.stderr}`);
  const match=/SHA256=([a-f0-9]{64})/.exec(p.stdout);
  if(!match)throw new Error(`frame ${frame}: no digest: ${p.stdout}`);
  return match[1];
};
for(const [a,b] of pairs){
  const x=hash(a),y=hash(b);
  if(x!==y)throw new Error(`Late glyph fill detected: frames ${a} and ${b} differ in the text region`);
  console.log(`PASS zero late ink difference: ${a} vs ${b}, SHA256 ${x.slice(0,16)}`);
}

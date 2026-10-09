// Runs AFTER successful Chromium capture, never before. Converts only locally
// reauthored and rendered MIT style demos into "rendered-persian" catalog items.
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from "node:fs";
import {resolve,join} from "node:path";
import {spawnSync} from "node:child_process";
const root=resolve("../../.."); // from canonical skills/anidoodle/engine
const read=p=>readFileSync(join(root,p),"utf8");
const write=(p,x)=>{mkdirSync(resolve(root,p,".."),{recursive:true});writeFileSync(join(root,p),x)};
const catalog=JSON.parse(read("library/data/catalog.json"));
const out="skills/anidoodle/engine/out/";
const preview="assets/library/style-thumbs/";
const clips="assets/library/style-videos/";
mkdirSync(join(root,clips),{recursive:true});
mkdirSync(join(root,preview),{recursive:true});
const rows=catalog.entries.filter(x=>x.source==="mg"&&x.kind==="style");
if(rows.length!==15)throw Error("expected 15 MIT styles, found "+rows.length);
const styles="01-flat-vector 02-line-art 03-isometric 04-3d-render 05-cel-boil 06-collage 07-liquid 08-morph 09-bauhaus 10-synthwave 12-aurora-glass 18-hanazi 19-paperclip 20-pixel 22-hud".split(" ");
for(let i=0;i<styles.length;i++){
 const row=rows.find(r=>r.name===styles[i]);
 if(!row)throw Error("style manifest mismatch "+styles[i]);
 const frame=52+i*60;
 const from=join(root,out+"persian-motion-styles/persianMotionSampler-"+frame+".png");
 const to=join(root,preview+row.name+".png");
 if(!existsSync(from))throw Error("missing actual Persian rendered frame: "+from);
 copyFileSync(from,to);
 row.status="rendered-persian";
 row.locale="fa-IR";
 row.description="بازآفرینی مستقل فارسی با موتور PersianDoodle؛ ساختار بصری بر اساس امضای سبک اصلی.";
 row.preview="../"+preview+row.name+".png";
 const src=join(root,out+"persian-motion-styles.mp4");
 const clip=join(root,clips+row.name+".mp4");
 if(!existsSync(src))throw Error("missing rendered 15-style source video");
 const result=spawnSync("ffmpeg",["-hide_banner","-loglevel","error",
  "-ss",String(i*2),"-i",src,"-t","2.0","-c:v","libx264",
  "-preset","fast","-crf","23","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k","-movflags","+faststart","-y",clip],{stdio:"pipe"});
 if(result.status!==0)throw Error("Failed individual Persian style video "+row.name+": "+result.stderr?.toString());
 row.localizedDemo="../"+clips+row.name+".mp4";
}
const files=[
 ["persian-motion-styles-contact.jpg","assets/library/persian-motion-styles-contact.jpg"],
 ["persian-motion-styles.mp4","assets/library/persian-motion-styles.mp4"],
 ["persian-showcase-contact.jpg","assets/persian/handwriting-contact.jpg"],
 ["persian-showcase.mp4","assets/persian/handwriting-demo.mp4"],
];
for(const [from,to] of files){
 const source=join(root,out+from);if(!existsSync(source))throw Error("missing QA artifact "+source);
 mkdirSync(resolve(root,to,".."),{recursive:true});copyFileSync(source,join(root,to));
}
catalog.stats.renderedPersian=catalog.entries.filter(x=>x.status==="rendered-persian").length;
write("library/data/catalog.json",JSON.stringify(catalog,null,2)+"\n");
console.log("Published "+rows.length+" Persian style thumbnails and final film; total rendered Persian:",catalog.stats.renderedPersian);

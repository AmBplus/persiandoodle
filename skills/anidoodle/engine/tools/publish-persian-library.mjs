// Runs AFTER successful Chromium capture, never before. Converts only locally
// reauthored and rendered MIT style demos into "rendered-persian" catalog items.
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from "node:fs";
import {resolve,join} from "node:path";
const root=resolve("../../.."); // from canonical skills/anidoodle/engine
const read=p=>readFileSync(join(root,p),"utf8");
const write=(p,x)=>{mkdirSync(resolve(root,p,".."),{recursive:true});writeFileSync(join(root,p),x)};
const catalog=JSON.parse(read("library/data/catalog.json"));
const out="skills/anidoodle/engine/out/";
const preview="assets/library/style-thumbs/";
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
 row.localizedDemo="../assets/library/persian-motion-styles.mp4";
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

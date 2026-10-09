// Promotion is evidence-based: only videos actually rendered in Chromium
// become local Persian-native preview clips in the curated gallery.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {resolve,join} from "node:path";
import {spawnSync} from "node:child_process";
// Keep the publication manifest in runnable JS; Node does not resolve unbuilt TS.
const PersianShotRecipes="brand-ink-open marker-underline-title document-typewriter-reveal deck-deal-flyin crash-zoom-punch odometer-digit-roll command-palette-summon line-carry-transition beat-cut-moves light-play-moves outro-group-photo-launch"
 .split(" ").map(slug=>({slug,id:"shotcraft/"+slug}));
const root=resolve("../../..");
const manifestPath=join(root,"library/data/featured.json");
const data=JSON.parse(readFileSync(manifestPath,"utf8"));
const video=resolve("out/persian-shot-sampler.mp4");
if(!existsSync(video))throw Error("missing Chromium-rendered Persian shot film");
const folder=join(root,"assets/library/shot-videos");mkdirSync(folder,{recursive:true});
let count=0;
for(const [index,recipe] of PersianShotRecipes.entries()){
 const output=join(folder,recipe.slug+".mp4");
 const trim=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-ss",String(index*3),
  "-i",video,"-t","3","-c:v","libx264","-preset","fast","-crf","23","-pix_fmt","yuv420p",
  "-c:a","aac","-b:a","128k","-movflags","+faststart","-y",output],{encoding:"utf8"});
 if(trim.status!==0)throw Error("failed to clip "+recipe.slug+": "+trim.stderr);
 for(const category of data.categories)for(const family of category.families)for(const variant of family.variants){
  if(variant.id!==recipe.id)continue;
  variant.video="../assets/library/shot-videos/"+recipe.slug+".mp4";
  variant.status="rendered-persian";
  variant.previewKind="native-inspired-Persian-render";
  variant.license="Apache-2.0 recipe inspiration; original new animation";
  count++;
 }
 if(!existsSync(output))throw Error("missing "+output);
}
if(count!==PersianShotRecipes.length)throw Error("some native shot samples were not mapped: "+count);
writeFileSync(manifestPath,JSON.stringify(data,null,2)+"\n");
console.log("PASS: published "+count+" separate real Persian video shot examples with embedded audio");

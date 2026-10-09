import {persianShotSampler,PersianShotRecipes} from "../src/canvas-core/persianShotSampler";
import {persianMotionSampler} from "../src/canvas-core/persianMotionSampler";
import {styleScore} from "../src/canvas-core/persianMotionAudio";
import {validate} from "../src/canvas-core/film";
export const name="Native Persian shot samples and audio tracks";
export const run=(ok:(passed:boolean,label:string)=>void)=>{
 ok(PersianShotRecipes.length===11,"eleven distinct source-grounded shot mechanisms in Persian");
 ok(new Set(PersianShotRecipes.map(x=>x.id)).size===11,"every shot demo has unique source identity");
 ok(PersianShotRecipes.every(x=>/[\u0600-\u06ff]/.test(x.title)),"all shot sample titles use Persian");
 ok(validate(persianShotSampler).length===0,"shot demos conform to unmodified existing film engine");
 ok(validate(persianMotionSampler).length===0,"original 15-style Persian samples still conform");
 ok(typeof persianShotSampler.audio==="function"&&typeof persianMotionSampler.audio==="function","both native reels contain audio");
 const [a,b]=styleScore(12000,30,900),[c]=styleScore(12000,30,900);
 ok(a.length===360000&&b.length===a.length,"soundtrack matches 900 video frames exactly");
 let peak=0,energy=0;for(let i=0;i<a.length;i+=17){const v=a[i];peak=Math.max(peak,Math.abs(v));energy+=v*v;
  if(i%17000===0&&v!==c[i])throw new Error("non-deterministic PCM");}
 ok(peak>.015&&peak<.6&&energy>1,"style sound is actually audible, without clipping");
 const [long]=styleScore(12000,30,990);
 let tail=0;for(let i=long.length-12000;i<long.length;i+=100)tail+=long[i]*long[i];
 ok(tail>.0001,"shot reel music does not become silent after the 15-style montage length");
};

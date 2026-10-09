import {persianMotionSampler,PersianMotionStyles} from "../src/canvas-core/persianMotionSampler";
import {validate} from "../src/canvas-core/film";
export const name="Persian style sampler compatibility";
export const run=(ok:(pass:boolean,name:string)=>void)=>{
 ok(PersianMotionStyles.length===15,"all fifteen MIT style signatures have native Persian render samples");
 ok(validate(persianMotionSampler).length===0,"15 native Persian scenes conform to unchanged Film contract");
 ok(persianMotionSampler.shots.every(s=>s.end-s.start===60),"every scene has a stable two-second duration");
 ok(PersianMotionStyles.every(x=>/[\u0600-\u06ff]/.test(x[1])&&/[\u0600-\u06ff]/.test(x[2])),"all on-screen style labels and taglines are Persian");
};

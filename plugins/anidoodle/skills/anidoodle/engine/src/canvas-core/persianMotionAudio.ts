// Original and license-free score for the 15 Persian motion style previews.
// Each 2s segment has an intentionally different timbre/motif. The soundtrack
// contains a low-volume musical bed, beat accents and natural decay, not silence.
// Pure PCM and deterministic across repeated/offline renders.
const TAU=Math.PI*2;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const noise=(i:number)=>{let x=i|0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/2147483648-1};
const notes=[196,220,246.94,261.63,293.66,329.63,349.23,392,440];
const sets=[
[0,4,7],[1,3,6],[2,5,8],[0,3,5],[1,4,7],
[2,4,6],[0,5,8],[1,5,7],[2,3,6],[0,4,8],
[1,3,8],[0,2,5],[1,4,6],[2,5,7],[0,3,8]
];
export const styleScore=(sampleRate:number,fps=30,frames=900):[Float32Array,Float32Array]=>{
 if(!Number.isSafeInteger(sampleRate)||sampleRate<8000||sampleRate>96000)throw Error("invalid sample rate");
 const n=Math.round(sampleRate*frames/fps),left=new Float32Array(n),right=new Float32Array(n);
 const phase=[0,0,0],filter=[0,0],duration=frames/fps;
 for(let i=0;i<n;i++){
  const t=i/sampleRate,scene=Math.floor(t/2)%15,local=t%2;
  const mood=sets[scene],synthType=scene%5;
  const smooth=(f:number)=>Math.sin(TAU*f*t);
  let music=0;
  for(let j=0;j<3;j++){
   const freq=notes[mood[j]]*(j===0?.5:1);
   phase[j]+=TAU*freq/sampleRate;
   const e=Math.sin(phase[j]),soft=e*.84+Math.sin(2*phase[j])*.13;
   const bell=Math.sin(phase[j])*(.6+.4*Math.exp(-local*2));
   music+=(synthType===2?bell:soft)*(j===0?.020:.010);
  }
  const beat=(t*.5)%0.5,accent=Math.exp(-beat*24);
  const hiss=noise(i+107);
  filter[0]+=.03*(hiss-filter[0]);
  filter[1]+=.004*(hiss-filter[1]);
  const percussion=(hiss*.5+filter[0]*.5)*.018*accent;
  const thump=Math.sin(TAU*79*beat)*.025*Math.exp(-beat*17);
  const transition=Math.exp(-local*15)*.012*Math.sin(TAU*196*t);
  const fade=Math.min(1,t/.15,(duration-t)/.35);
  // Soft rhythmic sound design; scene boundaries breathe to avoid hard cuts.
  const boundary=Math.min(1,.55+local*2,(2-local)*2+.55);
  const amp=clamp(fade)*clamp(boundary);
  const total=amp*(music+percussion+thump+transition);
  left[i]=total;
  right[i]=amp*(music*.98-percussion*.35+thump*.93+filter[1]*.004);
 }
 return[left,right];
};

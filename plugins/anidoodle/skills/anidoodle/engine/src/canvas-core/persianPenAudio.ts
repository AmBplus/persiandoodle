// Portable, original, deterministic pen-on-paper audio.
// Same frame cues as Persian showcase drawing. A pen contact starts when its
// corresponding visual stroke starts; connected dots produce light touches near
// the end of each actual writing interval. No network samples or license risk.
export type PenCue={from:number;to:number;strength?:number;texture?:"paper"|"nib"|"brush"|"marker"};
export const showcasePenCues:PenCue[]=[
  {from:2,to:86,texture:"nib",strength:1},
  {from:100,to:177,texture:"nib",strength:.9},
  {from:123,to:196,texture:"paper",strength:.68},
  {from:200,to:285,texture:"brush",strength:.85},
  {from:229,to:296,texture:"nib",strength:.58},
  {from:300,to:376,texture:"marker",strength:.78},
  {from:324,to:397,texture:"nib",strength:.7},
];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const hash=(n:number)=>{let x=n|0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/2147483648-1;};
const pulse=(time:number,at:number,width:number)=>Math.exp(-Math.pow((time-at)/width,2)*3);
export const synthPenScore=(sampleRate:number,fps:number,frames:number,cues:PenCue[]=showcasePenCues):[Float32Array,Float32Array]=>{
  if(!Number.isSafeInteger(sampleRate)||sampleRate<8000||sampleRate>96000)throw Error("unsupported rate");
  const size=Math.round(frames*sampleRate/fps);
  const L=new Float32Array(size),R=new Float32Array(size);
  let filter=0;
  const fadeEnd=(frames/fps);
  for(let i=0;i<size;i++){
    const t=i/sampleRate,frame=t*fps,noise=hash(i+307);
    // A faint room tone; intentionally lower than the nib.
    const ambience=Math.sin(2*Math.PI*196*t)*.0034+
      Math.sin(2*Math.PI*246.94*t)*.0024+
      Math.sin(2*Math.PI*293.66*t)*.0018;
    let contact=0, taps=0;
    for(const c of cues){
      if(frame<c.from-5||frame>c.to+5)continue;
      const p=clamp((frame-c.from)/(c.to-c.from));
      const gate=Math.min(1,p*21,(1-p)*17);
      if(frame>=c.from&&frame<=c.to){
        // First 80%: continuous kinetic stroke; last 20%: separated dots.
        const body=p<.8?1:0;
        const marks=p>=.8? Math.pow(Math.max(0,Math.sin(p*190*Math.PI)),3)*.5:0;
        const texture=c.texture==="brush"?.55:c.texture==="marker"?.68:c.texture==="paper"?.78:1;
        contact+=Math.max(0,gate)*(body*.76+marks)*texture*(c.strength??1);
        // Each detached tip lifts and touches at a stable frame boundary.
        for(const d of [.815,.855,.895,.938])taps+=(c.strength??1)*pulse(t,(c.from+(c.to-c.from)*d)/fps,.004);
      }
      taps+=(c.strength??1)*pulse(t,c.from/fps,.003)*.3;
    }
    // Filter noise to warm physical contact rather than an electronic beep.
    filter+=.075*(noise-filter);
    const scratch=(noise*.64+filter*.36)*Math.min(1,contact)*.039;
    const tap=taps*.027*Math.sin(2*Math.PI*210*t);
    const fade=Math.min(1,t/.38,(fadeEnd-t)/.5);
    const sample=(scratch+tap+ambience)*clamp(fade);
    L[i]=sample;R[i]=sample*.94+filter*contact*.0008;
  }
  return [L,R];
};

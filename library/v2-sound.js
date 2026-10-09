// Sound is opt-in on click, not muted autoplay.
// No external samples or unclear licenses are used for demonstration cues.
// Native music records are played using their actual repo MP3 via <audio>.
let active=null,ctx=null;let enabled=true;
const TAU=2*Math.PI;const clamp=x=>Math.max(0,Math.min(1,x));
const hash=n=>{let x=n|0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/2147483648-1};
export const soundOn=()=>enabled;
export const setSoundOn=b=>{enabled=!!b;if(!enabled)stopSound()};
export function stopSound(){if(active){try{active.stop()}catch{}active.disconnect();active=null}}
export function playStudioSound(category,family,variant,duration=2.5){
 stopSound();if(!enabled)return;
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 try{
  ctx??=new AC();ctx.resume();
  const sr=ctx.sampleRate,n=Math.round(duration*sr),b=ctx.createBuffer(2,n,sr);
  const a=b.getChannelData(0),right=b.getChannelData(1);
  const group=category?.id||"typography",code=family?.id||"";
  const noiseish=/pen|handwriting|ink|draw|sound|texture/.test(group+" "+code);
  const rhythm=/rhythm|transition|light|opening/.test(group);
  const data=/data|camera|entrance/.test(group);
  const freq=noiseish?190:data?233.08:rhythm?293.66:220;
  let smooth=0;
  for(let i=0;i<n;i++){
   const t=i/sr,p=t/duration;
   const nois=hash(i+131);
   smooth+=.042*(nois-smooth);
   const beat=(t%(.5));
   const pulse=Math.exp(-beat*(rhythm?22:13));
   const envelope=clamp(t/.055)*clamp((duration-t)/.22);
   let x=0;
   if(noiseish){
    const contact=(p<.78?.68:.14);
    const tap=[.81,.87,.93].reduce((v,d)=>v+Math.exp(-Math.pow((p-d)*duration/.01,2)*2),0);
    x=(smooth*.5+nois*.5)*.11*contact+tap*.02*Math.sin(TAU*175*t);
   }else if(rhythm){
    x=.022*Math.sin(TAU*freq*t)+pulse*(nois*.035+.038*Math.sin(TAU*85*t));
   }else{
    x=.018*Math.sin(TAU*freq*t)+.012*Math.sin(TAU*freq*1.498*t)+.009*Math.sin(TAU*freq*.667*t);
    x+=data?.012*Math.sin(TAU*97*t)*pulse:0;
    x+=.009*nois*Math.exp(-beat*18);
   }
   a[i]=envelope*x;right[i]=envelope*(x*.93+smooth*.003);
  }
  active=ctx.createBufferSource();active.buffer=b;active.connect(ctx.destination);active.start();
  active.onended=()=>{active=null};
 }catch(e){console.warn("Sound preview failed:",e)}
}
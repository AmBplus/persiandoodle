import {createServer} from "node:http";
import {readFileSync,existsSync,statSync,mkdirSync} from "node:fs";
import {resolve,join,extname,sep} from "node:path";
import {chromium} from "playwright-core";

const root=resolve("../../.."),out=resolve("out");mkdirSync(out,{recursive:true});
const read=x=>JSON.parse(readFileSync(join(root,x),"utf8"));
const shots=read("library/data/shotcraft-full.json"),cat=read("library/data/catalog.json"),
  audio=read("library/data/source-audio.json"),manifest=read("library/data/persian-renders.json");
const assert=(yes,msg)=>{if(!yes)throw Error(msg)};
assert(cat.entries.length===534,"source catalog must retain 534 entries");
assert(shots.items.length===157&&shots.items.reduce((n,x)=>n+x.styles.length,0)===214,"original Shotcraft variants missing");
assert(audio.summary.music===5&&audio.summary.sfx===149,"original audio index incomplete");
assert(Object.values(manifest.renders).reduce((n,x)=>n+x.variants.length,0)===406,"original variant count changed");
const mime={".html":"text/html;charset=utf-8",".js":"text/javascript",".css":"text/css",".json":"application/json",".md":"text/plain;charset=utf-8",".jpg":"image/jpeg",".png":"image/png",".webp":"image/webp",".ttf":"font/ttf"};
const server=createServer((req,res)=>{
 try{const path=decodeURIComponent(new URL(req.url,"http://localhost").pathname);let file=resolve(root,"."+path);
  if(!file.startsWith(root+sep)&&file!==root)throw Error("bad path");
  if(existsSync(file)&&statSync(file).isDirectory())file=join(file,"index.html");
  const body=readFileSync(file);res.writeHead(200,{"content-type":mime[extname(file)]||"application/octet-stream"});res.end(body)
 }catch{res.writeHead(404);res.end("Not found")}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]}),errors=[];
try{
 const p=await browser.newPage({viewport:{width:1512,height:960}});
 p.on("pageerror",e=>errors.push(e.message));
 await p.goto(`http://127.0.0.1:${server.address().port}/library/`);
 await p.locator(".model").first().waitFor({timeout:20000});
 assert(await p.locator(".model").count()>=25,"source catalog not displayed");
 await p.screenshot({path:join(out,"source-first-desktop.png"),fullPage:true});
 await p.locator("#sourceFilter").selectOption("mg");
 assert((await p.locator("#resultCount").innerText()).includes("۱۵"),"15 MG styles missing");
 await p.locator("#searchInput").fill("05-cel-boil");
 await p.locator(".model button").first().click();
 assert(!(await p.locator("#previewVideo").isVisible()),"unverified MG style has public playable footage");
 assert((await p.locator("#previewStatus").innerText()).includes("هنوز آماده"),"honest missing-render label not visible");
 await p.locator("#showPrompt").click();
 await p.waitForFunction(()=>document.querySelector("#promptText")?.value?.includes("You are the director"),{timeout:10000});
 assert((await p.locator("#promptText").inputValue()).includes("line boil"),"original MG prompt was replaced by generic Persian prompt");
 assert((await p.locator("#localizationText").inputValue()).includes('"replacements": []'),"separate exact-text localization file missing");
 await p.locator("#addToScene").click();
 await p.locator("#sceneDrawer").waitFor({state:"visible",timeout:15000});
 const exported=await p.locator("#sceneJSON").innerText();
 assert(exported.includes("You are the director")&&exported.includes("originalPrompt"),"scene export must embed original prompt without agent lookups");
 await p.locator("#closeScene").click();
 await p.locator("#closeDetail").click();
 await p.locator("#searchInput").fill("");
 await p.locator("#sourceFilter").selectOption("shotcraft");
 await p.locator("#searchInput").fill("chart-live-moves");
 await p.locator(".model button").first().click();
 assert((await p.locator("#variants button").count())===3,"3 Shotcraft variant identities missing");
 for(let i=0;i<3;i++){
  await p.locator("#variants button").nth(i).click();
  assert(!(await p.locator("#previewVideo").isVisible()),"unreviewed Shotcraft variant played");
  await p.locator("#showPrompt").click();
  await p.waitForFunction(()=>document.querySelector("#promptText")?.value?.length>350,{timeout:10000});
  assert((await p.locator("#localizationText").inputValue()).includes('"replaceOnScreenTextOnly": true'),"source/localization contract broken")
 }
 await p.locator("#closeDetail").click();
 await p.locator('[data-section="components"]').first().click();
 await p.locator("#sourceFilter").selectOption("shotcraft");
 await p.locator('[data-category="music"]').first().click();
 assert((await p.locator("#resultCount").innerText()).includes("۵"),"5 original music records missing");
 await p.locator(".model button").first().click();
 assert(!await p.locator("#audioPlayer").getAttribute("src"),"unverified foreign music exposed as local");
 const srcs=await p.locator("video,audio,img").evaluateAll(ns=>ns.map(n=>n.getAttribute("src")||n.getAttribute("data-preview")).filter(Boolean));
 assert(!srcs.some(x=>/^https?:\/\//i.test(x)),"foreign preview masquerades as Persian media");
 const mobile=await browser.newPage({viewport:{width:390,height:844}});
 mobile.on("pageerror",e=>errors.push(e.message));
 await mobile.goto(`http://127.0.0.1:${server.address().port}/library/`);
 await mobile.locator(".model").first().waitFor({timeout:20000});
 assert(await mobile.locator("#mobileNav").isVisible(),"mobile categories inaccessible");
 await mobile.screenshot({path:join(out,"source-first-mobile.png"),fullPage:true});
 assert(errors.length===0,"browser exceptions: "+errors.join("; "));
 console.log("PASS: 406 reference variants retained, exact prompt sidecars, no synthetic local playback, source/audio filtering, responsive display");
}finally{await browser.close();await new Promise(ok=>server.close(ok))}

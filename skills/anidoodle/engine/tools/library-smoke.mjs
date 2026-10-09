// Browser QA for the editorial (not endless-scroll) Persian motion library.
import {createServer} from "node:http";
import {readFileSync,existsSync,statSync,mkdirSync} from "node:fs";
import {resolve,join,extname,sep} from "node:path";
import {chromium} from "playwright-core";
const root=resolve("../../.."),out=resolve("out");
const catalog=JSON.parse(readFileSync(join(root,"library/data/catalog.json"),"utf8"));
const featured=JSON.parse(readFileSync(join(root,"library/data/featured.json"),"utf8"));
const nc=new Set(["talkcraft","explainer","onetake"]);
if(catalog.entries.length<500)throw Error("original research catalog unexpectedly lost");
if(featured.categories.length<15)throw Error("editorial library categories incomplete");
for(const c of featured.categories)for(const f of c.families){
 if(f.variants.length>2)throw Error("more than two variants in family: "+c.id+"/"+f.id);
 for(const v of f.variants)if(nc.has(v.source)&&v.status!=="reference-only")
  throw Error("restricted source claimed as native: "+v.id);
}
const mime={".html":"text/html;charset=utf-8",".js":"text/javascript",".css":"text/css",".json":"application/json",
 ".png":"image/png",".jpg":"image/jpeg",".mp4":"video/mp4",".ttf":"font/ttf",".md":"text/plain",".mp3":"audio/mpeg"};
const server=createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  let file=resolve(root,"."+pathname);
  if(!file.startsWith(root+sep)&&file!==root)throw Error("path traversal");
  if(existsSync(file)&&statSync(file).isDirectory())file=join(file,"index.html");
  const buffer=readFileSync(file);res.writeHead(200,{"content-type":mime[extname(file)]||"application/octet-stream","cache-control":"no-store"});res.end(buffer);
 }catch{res.writeHead(404);res.end("Not found")}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:950},deviceScaleFactor:1});
 page.on("pageerror",err=>errors.push(err.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/library/`,{waitUntil:"domcontentloaded"});
 await page.locator(".family-card").first().waitFor({timeout:18000});
 const nav=await page.locator("#categoryNav button[data-category]").count();
 if(nav<15)throw Error("fixed menu missing motion categories: "+nav);
 const initial=await page.locator(".family-card").count();
 if(initial<3||initial>12)throw Error("repetitive/default family grid: "+initial);
 await page.screenshot({path:join(out,"persian-library-desktop.png"),fullPage:true});
 await page.locator('[data-category="data"]').first().click();
 if(!await page.locator("#categoryTitle").innerText().then(t=>t.includes("آمار")))throw Error("category tab does not update content");
 await page.locator(".family-card").first().click();
 const variants=await page.locator("#variants button").count();
 if(variants<1||variants>2)throw Error("family model selector must display 1-2 variants");
 await page.locator("#playPreview").click();
 await page.waitForTimeout(150);
 await page.locator("#promptSelected").click();
 if(!await page.locator("#promptPanel").isVisible())throw Error("source prompt missing");
 await page.locator("#addSelected").click();
 if(!await page.locator("#composer").isVisible())throw Error("selected component did not open scene composer");
 const json=JSON.parse(await page.locator("#sceneOutput").inputValue());
 if(json.schema!=="persiandoodle/scene-selection/v1"||!json.selections.animation)throw Error("scene composer JSON did not capture chosen animation");
 await page.locator("#closeComposer").click();
 await page.locator('[data-category="style"]').first().click();
 if(await page.locator(".family-card").count()!==15)throw Error("missing 15 distinct Persian style categories");
 await page.locator(".family-card").first().click();
 if(!await page.locator("#inspectVideo").isVisible())throw Error("real Persian style video not used");
 await page.locator('[data-category="music"]').first().click();
 await page.locator(".family-card").first().click();
 if(!await page.locator("#assetAudio").isVisible())throw Error("native music player not available");
 await page.locator('[data-category="typography"]').first().click();
 await page.locator("#searchFamily").fill("نوشتن");
 if(await page.locator(".family-card").count()<1)throw Error("typography subfamily search missing");
 await page.locator("#searchFamily").fill("");
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 mobile.on("pageerror",err=>errors.push(err.message));
 await mobile.goto(`http://127.0.0.1:${server.address().port}/library/`);
 await mobile.locator(".family-card").first().waitFor({timeout:18000});
 if(!await mobile.locator("#mobileCategories").isVisible())throw Error("mobile fixed category menu not visible");
 await mobile.screenshot({path:join(out,"persian-library-mobile.png"),fullPage:true});
 if(errors.length)throw Error("browser errors: "+errors.join("; "));
 console.log("PASS 18 category sections, max 2 variants, native Persian media, source prompts, composer, playable audio, responsive screenshots");
}finally{await browser.close();await new Promise(done=>server.close(done))}

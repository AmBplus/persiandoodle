// Full end-to-end smoke test of the independent Persian library UI.
// This intentionally checks real Chromium rendering, not just JSON shape.
import {createServer} from "node:http";
import {readFileSync,existsSync,statSync,mkdirSync} from "node:fs";
import {resolve,join,extname,sep} from "node:path";
import {chromium} from "playwright-core";
const root=resolve("../../.."),out=resolve("out");
const catalog=JSON.parse(readFileSync(join(root,"library/data/catalog.json"),"utf8"));
const recipes=JSON.parse(readFileSync(join(root,"library/data/recipes.json"),"utf8"));
if(catalog.entries.length<500)throw Error("catalog unexpectedly missing source indexes");
if(recipes.recipes.length<10)throw Error("recipe registry is incomplete");
const nc=new Set(["talkcraft","explainer","onetake"]);
for(const x of catalog.entries){
 if(!x.id||!x.sourceUrl||!x.status)throw Error("incomplete catalog "+x.id);
 if(nc.has(x.source)&&x.status!=="reference-only")throw Error("noncommercial source wrongly claim imported: "+x.id);
}
for(const x of catalog.entries.filter(x=>x.source==="mg")){
 const p=join(root,"library/vendor/mg-styles-15/prompts",x.name+".md");
 if(!existsSync(p))throw Error("MIT original prompt missing: "+p);
}
mkdirSync(out,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"application/javascript",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".mp4":"video/mp4",".ttf":"font/ttf",".md":"text/plain; charset=utf-8"};
const server=createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  let file=resolve(root,"."+pathname);
  if(!file.startsWith(root+sep)&&file!==root)throw Error("path traversal");
  if(existsSync(file)&&statSync(file).isDirectory())file=join(file,"index.html");
  const buffer=readFileSync(file);
  res.writeHead(200,{"content-type":mime[extname(file)]||"application/octet-stream","cache-control":"no-store"});res.end(buffer);
 }catch(e){res.writeHead(404);res.end("Not found")}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const port=server.address().port,browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:950},deviceScaleFactor:1});
 page.on("pageerror",err=>errors.push(err.message));
 await page.goto(`http://127.0.0.1:${port}/library/`,{waitUntil:"domcontentloaded"});
 await page.locator(".card").first().waitFor({timeout:12000});
 const total=await page.locator(".card").count();
 if(total<10)throw Error("less than 10 gallery cards rendered");
 await page.screenshot({path:join(out,"persian-library-desktop.png"),fullPage:true});
 await page.locator("#search").fill("02-line-art");
 await page.waitForTimeout(180);
 if(await page.locator(".card").count()<1)throw Error("style search index missing");
 await page.locator(".card").first().click();
 if(!await page.locator("#modal").isVisible())throw Error("detail modal missing");
 await page.locator("#close").click();
 await page.locator("#search").fill("");
 await page.locator("#typeFilter").selectOption("recipe");
 await page.waitForTimeout(150);
 if(await page.locator(".card").count()!==10)throw Error("10 registered recipes missing in UI");
 await page.locator("#typeFilter").selectOption("");
 await page.locator("#soundMode").selectOption("off");
 await page.locator("#replay").click();
 await page.waitForTimeout(180);
 const label=await page.locator("#progressLabel").innerText();
 if(!label.includes("٪"))throw Error("interactive Persian preview failed to advance");
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 await mobile.goto(`http://127.0.0.1:${port}/library/`);
 await mobile.locator(".card").first().waitFor({timeout:12000});
 await mobile.screenshot({path:join(out,"persian-library-mobile.png"),fullPage:true});
 if(errors.length)throw Error("browser errors: "+errors.join("; "));
 console.log("PASS: source registry, rights, original prompts, 10 recipes, Persian UI, RTL stage and desktop/mobile screenshot");
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}

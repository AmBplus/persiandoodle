// Batch capture: every catalog item gets an ORIGINAL Persian 960x540 still.
// This captures our own Canvas visualization; it does not download/relabel
// original-language videos, copyrighted screenshots or noncommercial code.
import {createServer} from "node:http";
import {readFileSync,writeFileSync,existsSync,statSync,mkdirSync} from "node:fs";
import {resolve,join,extname,sep} from "node:path";
import {chromium} from "playwright-core";
const root=resolve("../../..");
const catalogPath=join(root,"library/data/catalog.json");
const data=JSON.parse(readFileSync(catalogPath,"utf8"));
if(data.entries.length<500)throw Error("Catalog unexpectedly truncated");
const dir=join(root,"assets/library/previews");mkdirSync(dir,{recursive:true});
const mt={".html":"text/html;charset=utf-8",".js":"application/javascript",".json":"application/json",".css":"text/css",".ttf":"font/ttf"};
const server=createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  let file=resolve(root,"."+pathname);
  if(!file.startsWith(root+sep)&&file!==root)throw Error("bad path");
  if(existsSync(file)&&statSync(file).isDirectory())file=join(file,"index.html");
  res.writeHead(200,{"content-type":mt[extname(file)]||"application/octet-stream"});res.end(readFileSync(file));
 }catch(e){res.writeHead(404);res.end("Not found")}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
let ok=0;
try{
 const page=await browser.newPage({viewport:{width:1200,height:750},deviceScaleFactor:1});
 await page.goto(`http://127.0.0.1:${server.address().port}/library/`,{waitUntil:"domcontentloaded"});
 await page.evaluate(async()=>{
  const canvas=document.createElement("canvas");canvas.id="batchPreview";canvas.width=960;canvas.height=540;
  canvas.style="position:fixed;z-index:100;top:0;left:0;width:960px;height:540px";
  document.body.append(canvas);
  await document.fonts.load('800 36px Vazirmatn');await document.fonts.ready;
  window.__itemPainter=await import("./item-preview.js");
 });
 const shot=page.locator("#batchPreview");
 for(const [index,item] of data.entries.entries()){
  const safe=item.id.replace(/[^a-zA-Z0-9]/g,"-").slice(0,135);
  // Stable path, including original source prefix; one still per index.
  const filename=`${String(index).padStart(3,"0")}-${safe}.jpg`;
  await page.evaluate(item=>window.__itemPainter.drawItemPreview(document.querySelector("#batchPreview"),item,.78),item);
  await shot.screenshot({path:join(dir,filename),type:"jpeg",quality:80,animations:"disabled"});
  if(!existsSync(join(dir,filename)))throw Error("did not render "+item.id);
  item.persianPreview="../assets/library/previews/"+filename;
  item.previewKind="original-persian-concept-sketch";
  ok++;
  if(ok%70===0)console.log("Rendered distinct Persian cards:",ok);
 }
 if(ok!==data.entries.length)throw Error("incomplete image batch");
 data.stats.previewPersianCount=ok;
 writeFileSync(catalogPath,JSON.stringify(data,null,2)+"\n");
 console.log(`PASS: ${ok} original Persian card stills, one for every catalog entry`);
}finally{await browser.close();await new Promise(ok=>server.close(ok));}

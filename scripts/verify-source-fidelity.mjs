#!/usr/bin/env node
import {readFile, stat} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
const site=resolve(process.argv[2]||".");
const load=async p=>JSON.parse(await readFile(resolve(site,p),"utf8"));
const manifest=await load("library/data/persian-renders.json");
const sha=await load("library/data/upstream-blob-shas.json");
const shots=await load("library/data/shotcraft-full.json");
const failures=[], counts={shotcraft:0,mg:0,talkcraft:0,explainer:0,onetake:0}, publicStatuses=new Set(["rendered-persian","verified","published"]);
const gitBlobSha=bytes=>createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
let variants=0, orig=0, publicRenders=0;
for(const [id,record] of Object.entries(manifest.renders||{})){
 const source=record.source, name=id.slice(source.length+1);
 for(const [index,v] of record.variants.entries()){
  variants++;counts[source]=(counts[source]||0)+1;
  const base="library/entries/"+source+"/"+name.replace(/[^a-zA-Z0-9_.-]/g,"-")+"/v"+(index+1);
  for(const [field,file] of [["originMetadata","origin.json"],["localization","localization.fa.json"]]){
   if(v[field]!==(base.slice(8)+"/"+file))failures.push(id+"["+index+"] incorrect "+field);
   try{const obj=await load(base+"/"+file);if(obj.modelId!==id||obj.variantKey!==v.key)failures.push("invalid "+base+"/"+file);
    if(field==="localization"&&(obj.preserveOriginalPromptVerbatim!==true||obj.replaceOnScreenTextOnly!==true))failures.push("invalid text-only policy "+id);
   }catch(e){failures.push("missing "+base+"/"+file+": "+e.message)}
  }
  if(source==="shotcraft"||source==="mg"){
   if(!v.originalPromptPath){failures.push(id+" missing original prompt path");continue}
   const path="library/"+v.originalPromptPath;
   try{const bytes=await readFile(resolve(site,path));const expected=source==="shotcraft"?sha.shotcraft[name]:sha.mg[name];
    if(!expected||gitBlobSha(bytes)!==expected)failures.push("original prompt byte mismatch: "+path);
    else orig++;
   }catch(e){failures.push("original missing "+path+": "+e.message)}
  }
  if(publicStatuses.has(v.status)){
   publicRenders++;
   for(const key of ["video","poster","thumbnail","prompt","metadata","scene"])if(!v[key])failures.push("invalid published media "+id+" "+key);
   if(v.status==="published"){
    const evidence=v.sourceFidelity;
    if(evidence?.approved!==true || !Array.isArray(evidence?.comparisonFrames) || evidence.comparisonFrames.length<3
       || typeof evidence?.reviewedAt!=="string" || evidence.reviewedAt.length<10
       || typeof evidence?.sourcePromptSha!=="string" || evidence.sourcePromptSha.length!==40)
     failures.push("public render has no human-reviewed source-faithfulness evidence: "+id+"["+index+"]");
   }
  }
  else if(["video","poster","thumbnail","prompt","metadata","scene"].some(key=>v[key]!==null))failures.push("unpublished entry carries fake media "+id);
 }
}
for(const [key,val] of Object.entries({shotcraft:214,mg:15,talkcraft:108,explainer:45,onetake:24}))if(counts[key]!==val)failures.push("lost original variants in "+key+": "+counts[key]);
if(variants!==406||orig!==229||shots.items.length!==157)failures.push("expected 406 variants / 229 unchanged prompts / 157 shots; got "+JSON.stringify({variants,orig,shots:shots.items.length}));
if(failures.length){console.error(failures.slice(0,50).join("\n"));process.exit(1)}
console.log("PASS source fidelity: "+variants+" variants, "+orig+" byte-identical original prompts, "+publicRenders+" published renders");

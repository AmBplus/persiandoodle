// Run the Persian typography tests, then capture reproducible stage-by-stage frames
// and combine the REAL rendered frames into one contact sheet.
// From engine/: node tools/persian-qa.mjs
import { spawnSync } from "node:child_process";
const run = (cmd, args) => {
  console.log("\n> " + [cmd, ...args].join(" "));
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run(process.execPath, ["tools/test.mjs", "persianText", "persianTrace"]);
run(process.execPath, [
  "tools/still.mjs", "persianGallery",
  "--frames", "0,20,40,60,79,80,100,120,140,159,160,180,200,220,239,240,260,280,300,319,320,340,360,380,399",
  "--out", "out/persian-qa/",
  "--sheet", "out/persian-gallery-contact.jpg",
  "--sheet-scale", "0.45",
]);
console.log("\nQA contact sheet: out/persian-gallery-contact.jpg");

run(process.execPath, [
  "tools/still.mjs", "persianShowcase",
  "--frames", "0,20,45,70,90,100,125,150,175,190,200,225,250,275,290,300,325,350,375,399",
  "--out", "out/persian-showcase/",
  "--sheet", "out/persian-showcase-contact.jpg", "--sheet-scale", "0.5"
]);
console.log("Pen-drawn RTL demo: out/persian-showcase-contact.jpg");

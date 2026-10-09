// Persian UI-first launch demo. All example screens, CTA labels and prompts are
// localized; no English placeholder text appears on the generated frames.
import { makeLaunchFilm } from "./launchTemplate";
import type { ProductUI } from "./productUI";
import type { Film } from "./film";
import { persianFontFiles } from "./persianGallery";

const projects:ProductUI = {
  title:"نگار",nav:["پروژه‌ها","طرح‌ها","گزارش"],action:"ساخت طرح",command:"موضوع طراحی را بنویسید…",
  before:{
    stats:[{label:"طرح‌های تازه",value:8},{label:"تکمیل‌شده",value:24}],
    items:[
      {id:"a",label:"پوستر بهاری",value:"۱ طرح",tag:"پیش‌نویس"},
      {id:"b",label:"جلد کتاب",value:"۲ طرح",tag:"آماده"},
      {id:"c",label:"نقاشی طبیعت",value:"۳ طرح",tag:"در حال طراحی"},
      {id:"d",label:"تصویرسازی کودک",value:"۴ طرح",tag:"آماده"},
    ],
  },
  after:{
    stats:[{label:"طرح‌های تازه",value:12},{label:"تکمیل‌شده",value:28}],
    items:[
      {id:"b",label:"جلد کتاب",value:"۲ طرح",tag:"تکمیل شد",done:true,accent:true},
      {id:"a",label:"پوستر بهاری",value:"۱ طرح",tag:"تکمیل شد",done:true},
      {id:"c",label:"نقاشی طبیعت",value:"۳ طرح",tag:"تکمیل شد",done:true},
      {id:"d",label:"تصویرسازی کودک",value:"۴ طرح",tag:"تکمیل شد",done:true},
    ],
  },
};
const styles:ProductUI={
  title:"نگار",nav:["سبک‌ها","گالری"],action:"اجرای سبک",layout:"cards",
  before:{items:[
    {id:"s",label:"قلم‌مو",value:35,unit:"٪",bar:.35},
    {id:"b",label:"طراحی خط",value:55,unit:"٪",bar:.55},
    {id:"p",label:"مدادرنگی",value:65,unit:"٪",bar:.65},
    {id:"m",label:"مرکب",value:40,unit:"٪",bar:.40},
  ]},
  after:{items:[
    {id:"s",label:"قلم‌مو",value:100,unit:"٪",bar:1,accent:true},
    {id:"b",label:"طراحی خط",value:100,unit:"٪",bar:1},
    {id:"p",label:"مدادرنگی",value:100,unit:"٪",bar:1},
    {id:"m",label:"مرکب",value:100,unit:"٪",bar:1},
  ]},
};
const gallery:ProductUI={
  title:"نگار",nav:["گالری","پروژه‌ها"],action:"نمایش",
  before:{items:[
    {id:"a",label:"خطاطی فارسی",value:"۱۲ طرح",bar:.65},
    {id:"b",label:"تصویرسازی",value:"۸ طرح",bar:.40},
    {id:"c",label:"پوستر",value:"۹ طرح",bar:.52},
  ]},
  after:{items:[
    {id:"a",label:"خطاطی فارسی",value:"۱۶ طرح",bar:.90,tag:"به‌روز",accent:true},
    {id:"b",label:"تصویرسازی",value:"۱۲ طرح",bar:.75,tag:"آماده"},
    {id:"c",label:"پوستر",value:"۱۱ طرح",bar:.66,tag:"آماده"},
  ]},
};
const demo=makeLaunchFilm({
  title:"نگار",preset:"clean",fps:60,
  asks:[
    {kind:"ui",ui:projects,prompt:"یک پوستر فارسی با خط طراحی کن"},
    {kind:"ui",ui:styles,split:[
      {text:"سبک را انتخاب کن",style:"ink",color:"#15161a"},
      {text:"طرح را ببین",style:"ink",color:"#2f54eb"},
    ]},
    {kind:"ui",ui:gallery,split:[
      {text:"هر فریم از کد",style:"ink",color:"#15161a"},
      {text:"دوباره ساخته می‌شود",style:"ink",color:"#2f54eb"},
    ]},
  ],
  words:[[
    {text:"یک ایده",style:"ink",color:"#15161a"},
    {text:"صدها تصویر",style:"ink",color:"#2f54eb"},
  ]],
  tagline:"طراحی فارسی، زنده و تکرارپذیر",
  install:["از نوشتن تا طراحی","تماماً با کد"],
  footer:"پرشین دودل",
  bpm:90,askBeats:6,typeBeats:4,endBeats:8,claimBar:6,score:null,
});
export const launchExampleClean:Film={
  ...demo,assets:{...demo.assets,fonts:persianFontFiles},
};

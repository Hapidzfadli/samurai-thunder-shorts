// Reusable still-only design renderer. Never renders a movie.
import {bundle} from '@remotion/bundler';
import {renderStill,selectComposition,openBrowser} from '@remotion/renderer';
import {mkdir} from 'node:fs/promises';
const group=process.argv[2]??'latar';
const selection=process.argv[3]?.split(',').map(Number);
const groups={latar:[0,1,2,3,4,5],properti:[6,7,8,9],story:[0,1,2,3,4,5,6,7]};
if(!groups[group])throw new Error('group must be latar, properti, or story');
const dir='out/suntzu/'+group;await mkdir(dir,{recursive:true});
const serveUrl=await bundle({entryPoint:'src/previewSunTzu.tsx'});
const browser=await openBrowser('chrome',{chromiumOptions:{gl:'swangle'}});
try{for(const view of selection??groups[group]){
const inputProps={view,story:group==='story'};
const composition=await selectComposition({serveUrl,id:'SunTzuPreviewWorld',inputProps,browserInstance:browser});
await renderStill({composition,serveUrl,inputProps,output:dir+'/'+view+'.png',imageFormat:'png',scale:group==='story'?.4:.6,chromiumOptions:{gl:'swangle'},browserInstance:browser,timeoutInMilliseconds:90000});
console.log('STILL_OK',group,view);
}}finally{await browser.close({silent:true});}

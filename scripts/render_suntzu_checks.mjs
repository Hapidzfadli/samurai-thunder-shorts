// Still/contact-sheet QA only. Never renders a complete movie.
// node scripts/render_suntzu_checks.mjs [--fixture out/suntzu/timing-fixture.json] [--frames 1,20] [--build-only]
import {bundle} from '@remotion/bundler';
import {renderStill,selectComposition,openBrowser} from '@remotion/renderer';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const arg=(key)=>{const i=process.argv.indexOf(key);return i>=0?process.argv[i+1]:undefined};
const fixture=arg('--fixture'),path=fixture??'src/suntzu_timing.json';
const timing=JSON.parse(await readFile(path,'utf8'));
if(timing.order.length!==8||timing.fps!==30)throw Error('8 scenes / 30fps required');
let end=0;
for(const key of timing.order){const s=timing.scenes[key];if(s.startFrame!==end||s.durationInFrames<1)throw Error('Invalid contiguous scene '+key);end+=s.durationInFrames;for(const l of timing.lines[key]??[])for(const w of l.words)if(w.from<0||w.to>s.durationInFrames||w.to<w.from)throw Error('Word outside scene '+key);}
if(end!==timing.totalFrames)throw Error('Total duration mismatch');
const dir=fixture?'out/suntzu/checks-fixture':'out/suntzu/checks';await mkdir(dir,{recursive:true});
const serveUrl=await bundle({entryPoint:'src/renderSunTzu.tsx',outDir:resolve(dir,'bundle')});
console.log('BUNDLE_OK',serveUrl,'TIMING',path,timing.totalFrames);
if(process.argv.includes('--build-only'))process.exit(0);
const browser=await openBrowser('chrome',{chromiumOptions:{gl:'swangle'}});
const inputProps={timing,withAudio:false};
const fractions=[.12,.3,.85];
const frames=arg('--frames')?.split(',').map(Number)??timing.order.flatMap(k=>fractions.map(q=>timing.scenes[k].startFrame+Math.round(timing.scenes[k].durationInFrames*q)));
try{const composition=await selectComposition({serveUrl,id:'SunTzu',inputProps,browserInstance:browser});
 for(let n=0;n<frames.length;n++){const frame=frames[n];await renderStill({serveUrl,composition,inputProps,frame,output:dir+'/'+String(n).padStart(2,'0')+'.jpg',imageFormat:'jpeg',scale:.4,browserInstance:browser,chromiumOptions:{gl:'swangle'},timeoutInMilliseconds:90000});console.log('STILL_OK',n,frame)}
 await writeFile(dir+'/frames.json',JSON.stringify({timing:path,fixture:!!fixture,frames},null,2));
 const py=spawnSync('python3',['-c',"from PIL import Image,ImageDraw;import glob,math;fs=sorted(glob.glob('"+dir+"/*.jpg'));w,h=270,510;im=Image.new('RGB',(w*6,h*math.ceil(len(fs)/6)),(32,37,41));d=ImageDraw.Draw(im);[(im.paste(Image.open(p).resize((270,480)),((i%6)*w,(i//6)*h)),d.text(((i%6)*w+10,(i//6)*h+485),str(i)+' / f'+str("+JSON.stringify(frames)+"[i]),fill='white')) for i,p in enumerate(fs)];im.save('"+dir+"/contact-sheet.jpg')"],{encoding:'utf8'});if(py.status!==0)throw Error(py.stderr);console.log('CONTACT_SHEET',dir+'/contact-sheet.jpg');
}finally{await browser.close({silent:true})}

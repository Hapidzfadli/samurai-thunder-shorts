// Sun Tzu Colab worker. Uses the repo-locked Remotion API, not npx latest.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {bundle} from '@remotion/bundler';
import {ensureBrowser, openBrowser, selectComposition, renderMedia} from '@remotion/renderer';
const require = createRequire(import.meta.url);
const [action, configFile] = process.argv.slice(2);
if (!['preflight','test','full'].includes(action) || !configFile) throw Error('Usage: node scripts/colab_suntzu_render.mjs preflight|test|full config.json');
const cfg = JSON.parse(fs.readFileSync(configFile));
const root = process.cwd();
const out = path.resolve(cfg.outputDir);
fs.mkdirSync(out, {recursive:true});
const log = (s) => {console.log(s); fs.appendFileSync(path.join(out,'render.log'), new Date().toISOString()+' '+s+'\n');};
const run = (bin,args) => {
  log(JSON.stringify([bin,...args]));
  try {const data=execFileSync(bin,args,{encoding:'utf8',maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']}); return data;}
  catch(e) {log(String(e.stderr || e.message)); throw e;}
};
const json = (name,data) => fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const digest = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const must = (ok,msg) => {if(!ok) throw Error(msg);};
const probe = p => JSON.parse(run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',p]));
const fps = s => {const [a,b] = s.split('/').map(Number); return a/b;};
function validateVideo(p,frames,audio=false) {
  const info=probe(p), v=info.streams.find(s=>s.codec_type==='video'), a=info.streams.find(s=>s.codec_type==='audio');
  must(v && v.codec_name==='h264' && v.width===1080 && v.height===1920 && fps(v.avg_frame_rate)===30,'Video geometry/codec/fps mismatch: '+p);
  must(Number(v.nb_read_frames)===frames,'Frame count mismatch: '+p);
  must(Math.abs(Number(v.duration)-frames/30)<1/30,'Video duration mismatch: '+p);
  must(audio ? !!a : !a,'Audio stream mismatch: '+p);
  if(audio) must(Math.abs(Number(a.duration)-frames/30)<0.08,'Audio duration mismatch: '+p);
  run('ffmpeg',['-v','error','-xerror','-i',p,'-f','null','-']);
  return info;
}
function mux(silent,dest,start,frames) {
  const duration=frames/30;
  // Input audio decoded from time zero, then sample-accurate atrim. No -shortest.
  run('ffmpeg',['-v','error','-y','-i',silent,'-i',audioPath,'-map','0:v:0','-map','1:a:0',
    '-af','atrim=start='+start/30+':duration='+duration+',asetpts=PTS-STARTPTS',
    '-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',dest]);
  json(path.basename(dest)+'.ffprobe.json',validateVideo(dest,frames,true));
}
const entry='src/renderSunTzu.tsx', audioPath='public/audio/suntzu_master.mp3', timingPath='src/suntzu_timing.json', modelPath='public/models/suntzu-palace.glb';
const sha=run('git',['rev-parse','HEAD']).trim();
must(/^[a-f0-9]{40}$/.test(cfg.expectedSha) && sha===cfg.expectedSha,'Expected immutable SHA mismatch');
must(!run('git',['status','--porcelain','--untracked-files=no']).trim(),'Tracked files dirty; use clean checkout');
for (const p of [entry,audioPath,timingPath,modelPath,'package-lock.json']) must(fs.existsSync(p)&&fs.statSync(p).size>0,'Missing production asset: '+p);
const glb=fs.readFileSync(modelPath);
must(glb.toString('ascii',0,4)==='glTF' && glb.readUInt32LE(4)===2 && glb.readUInt32LE(8)===glb.length,'Invalid GLB header/length');
const timing=JSON.parse(fs.readFileSync(timingPath));
must(timing.fps===30 && Number.isInteger(timing.totalFrames) && timing.totalFrames>=90,'Timing requires fps=30 and integer totalFrames >=90');
const total=timing.totalFrames;
const audioProbe=probe(audioPath), audioStream=audioProbe.streams.find(s=>s.codec_type==='audio');
const audioDuration=Number(audioStream?.duration || audioProbe.format.duration);
must(audioStream && Math.abs(audioDuration-total/30)<=0.1,'Master audio/timing mismatch >100 ms; rebuild upstream (no implicit pad/shortest)');
if (timing.order && timing.scenes) {
  let at=0;
  for (const id of timing.order) {const s=timing.scenes[id]; must(s && s.startFrame===at && Number.isInteger(s.durationInFrames)&&s.durationInFrames>0,'Non-contiguous scene: '+id); at+=s.durationInFrames;}
  must(at===total,'Scene frame total mismatch');
}
let gpu='unavailable';
try {gpu=run('nvidia-smi',['--query-gpu=name,driver_version,memory.total','--format=csv,noheader']).trim();} catch {}
if(cfg.requireT4!==false) must(/T4/.test(gpu),'Select a T4 runtime first (or explicitly set requireT4=false for CPU)');
log('GPU inventory (not proof of WebGL acceleration): '+gpu);
const browserStatus=await ensureBrowser();
must('path' in browserStatus,'Browser ensure did not return executable');
const browserExecutable=browserStatus.path;
const serveUrl=await bundle({entryPoint:path.resolve(entry)});
const attempts=[];
let selected, composition;
for (const gl of ['angle-egl','angle','swangle']) {
  let browser;
  try {
    browser=await openBrowser('chrome',{browserExecutable,chromiumOptions:{gl}});
    const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
    const webgl=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');
      const gl=canvas.getContext('webgl2') || canvas.getContext('webgl');
      if(!gl) return {renderer:null,vendor:null};
      const ext=gl.getExtension('WEBGL_debug_renderer_info');
      return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR)};
    });
    await page.close();
    const hardware=/NVIDIA.*T4|Tesla T4/i.test(webgl.renderer||'') && !/swiftshader|llvmpipe|software/i.test(webgl.renderer||'');
    attempts.push({gl,...webgl,hardwareVerified:hardware});
    if(gl!=='swangle'&&!hardware) {log(gl+': hardware T4 NOT verified; trying next backend'); continue;}
    must(webgl.renderer,'WebGL unavailable');
    composition=await selectComposition({serveUrl,id:'SunTzu',inputProps:{withAudio:false},browserExecutable,puppeteerInstance:browser,chromiumOptions:{gl}});
    selected={gl,...webgl,hardwareVerified:hardware};
    break;
  } catch(e) {attempts.push({gl,error:String(e)});}
  finally {if(browser) await browser.close({silent:true});}
}
json('webgl.json',{gpu,attempts,selected});
must(selected && composition,'No usable renderer/composition; see webgl.json');
must(composition.width===1080 && composition.height===1920 && composition.fps===30 && composition.durationInFrames===total,'Production composition/timing contract mismatch');
must(Number.isInteger(cfg.concurrency)&&cfg.concurrency>=1&&cfg.concurrency<=4,'Use concurrency 1–4');
must(Number.isInteger(cfg.testStart)&&cfg.testStart>=0&&cfg.testStart+90<=total,'testStart must allow exactly 90 frames');
const settings={sha,entry,composition:'SunTzu',width:1080,height:1920,fps:30,totalFrames:total,chunkFrames:300,gl:selected.gl,renderer:selected.renderer,hardwareVerified:selected.hardwareVerified,concurrency:cfg.concurrency,crf:18,pixelFormat:'yuv420p',imageFormat:'jpeg',jpegQuality:92,remotion:require('@remotion/renderer/package.json').version,helper:hash('scripts/colab_suntzu_render.mjs'),inputs:Object.fromEntries([audioPath,timingPath,modelPath,'package-lock.json'].map(p=>[p,hash(p)]))};
const key=digest(settings);
json('preflight.json',{key,settings,composition,audioDuration,browserExecutable});
log('Backend '+selected.gl+'; '+(selected.hardwareVerified?'T4 WebGL verified':'SOFTWARE fallback; T4 not used for WebGL')+'; receipt '+key);
async function render(dest,start,end) {
  await renderMedia({serveUrl,composition,codec:'h264',outputLocation:dest,inputProps:{withAudio:false},browserExecutable,chromiumOptions:{gl:selected.gl},frameRange:[start,end],muted:true,concurrency:cfg.concurrency,crf:18,pixelFormat:'yuv420p',imageFormat:'jpeg',jpegQuality:92,overwrite:true,onProgress:({progress})=>process.stdout.write('\r'+Math.round(progress*100)+'%')});
  console.log();
  validateVideo(dest,end-start+1);
}
if(action==='test') {
  const dest=path.join(out,'test-silent.mp4'), final=path.join(out,'test.mp4');
  await render(dest,cfg.testStart,cfg.testStart+89);
  mux(dest,final,cfg.testStart,90);
  json('test-receipt.json',{key,start:cfg.testStart,frames:90,sha256:hash(final)});
  log('Watch test.mp4; full render requires explicit gate.');
}
if(action==='full') {
  const receiptPath=path.join(out,'test-receipt.json');
  must(fs.existsSync(receiptPath),'Render test first');
  const test=JSON.parse(fs.readFileSync(receiptPath));
  must(cfg.approvedTest===true && test.key===key && test.start===cfg.testStart && hash(path.join(out,'test.mp4'))===test.sha256,'Watch current test and approve it explicitly; stale test rejected');
  const chunks=[];
  for(let start=0;start<total;start+=300) {
    const end=Math.min(total-1,start+299), frames=end-start+1;
    const name='chunk-'+String(start).padStart(6,'0')+'-'+String(end).padStart(6,'0')+'.mp4';
    const dest=path.join(out,name), receipt=dest+'.json';
    let reusable=false;
    if(fs.existsSync(dest)&&fs.existsSync(receipt)) {
      try {const old=JSON.parse(fs.readFileSync(receipt)); must(old.key===key&&old.start===start&&old.end===end&&old.sha256===hash(dest),'Stale chunk'); validateVideo(dest,frames); reusable=true;} catch(e) {log('Rebuild '+name+': '+e.message);}
    }
    if(!reusable) {
      const partial=path.join(root,'out','colab-suntzu-partial.mp4');
      fs.mkdirSync(path.dirname(partial),{recursive:true});
      await render(partial,start,end);
      fs.copyFileSync(partial,dest+'.partial'); fs.renameSync(dest+'.partial',dest);
      json(name+'.json',{key,start,end,frames,sha256:hash(dest)});
    }
    chunks.push(dest); log((reusable?'Validated/resumed ':'Saved ')+name);
  }
  // Relative safe filenames avoid ffconcat path quoting issues (Drive names may contain spaces).
  const list=path.join(out,'concat.txt');
  fs.writeFileSync(list,chunks.map(p=>"file '"+path.basename(p)+"'").join('\n')+'\n');
  const silent=path.join(out,'full-silent.mp4');
  run('ffmpeg',['-v','error','-y','-f','concat','-safe','1','-i',list,'-c','copy',silent]);
  validateVideo(silent,total);
  const final=path.join(out,'sun-tzu.mp4');
  mux(silent,final,0,total);
  run('ffmpeg',['-v','error','-y','-i',final,'-vf','fps='+12/(total/30)+',scale=180:320,tile=4x3','-frames:v','1',path.join(out,'contact-sheet.jpg')]);
  const qaArgs=['-hide_banner','-i',final,'-vf','blackdetect=d=0.3,freezedetect=n=0.003:d=0.6','-af','ebur128','-f','null','-'];
  const qaResult=execFileSync('ffmpeg',qaArgs,{encoding:'utf8',maxBuffer:32*1024*1024,stdio:['ignore','pipe',fs.openSync(path.join(out,'qa.log'),'w')]});
  json('final-receipt.json',{key,settings,sha256:hash(final),frames:total,duration:total/30,status:'technical-checks-passed; human visual/audio QA still required'});
  log('DONE: '+final+'; inspect contact sheet + video. No automatic production approval.');
}

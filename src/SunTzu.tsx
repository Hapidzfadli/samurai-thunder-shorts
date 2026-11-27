import React from 'react';
import {AbsoluteFill,Audio,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {SunTzuScene} from './scenesSunTzu';
import {Timing} from './suntzu/timing';
export type SunTzuProps={withAudio?:boolean;timing?:Timing};
const Captions:React.FC<{timing:Timing}>=({timing})=>{const f=useCurrentFrame();const c=timing.captions.find(c=>f>=(c.startFrame??c.from??0)&&f<(c.endFrame??c.to??0));return c?<div style={{position:'absolute',left:65,right:65,bottom:145,textAlign:'center',fontSize:64,fontWeight:900,color:'#fff8e7',textShadow:'0 4px 0 #242c32, 3px 0 #242c32, -3px 0 #242c32',WebkitTextStroke:'2px '+(c.voice==='ara'?'#276e73':'#5a4533')}}>{c.text}</div>:null};
export const SunTzu:React.FC<SunTzuProps>=({withAudio=false,timing})=>{
 if(!timing)throw new Error('SunTzu requires timing. Production entry loads src/suntzu_timing.json; checks may inject out/ fixture.');
 return <AbsoluteFill style={{background:'#bed9dc'}}>{withAudio&&<Audio src={staticFile('audio/suntzu_master.mp3')}/>}{timing.order.map((s,i)=><Sequence key={s} from={timing.scenes[s].startFrame} durationInFrames={timing.scenes[s].durationInFrames} name={s}><SunTzuScene timing={timing} scene={s} index={i}/></Sequence>)}<Captions timing={timing}/></AbsoluteFill>;
};

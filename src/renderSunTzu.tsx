import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {SunTzu,SunTzuProps} from './SunTzu';
import {Timing} from './suntzu/timing';
// Optional webpack context keeps the production entry bundleable while audio is still generating.
// No estimated timing is written into src/. The checks tool injects an explicit out/ fixture.
declare const require:{context:(path:string,deep:boolean,filter:RegExp)=>{keys:()=>string[];(key:string):unknown}};
const ctx=require.context('.',false,/suntzu_timing\.json$/);
const raw=ctx.keys().length?ctx(ctx.keys()[0]) as Timing|{default:Timing}:undefined;
const actual:Timing|undefined=raw&&(typeof raw==='object'&&'default' in raw?raw.default:raw as Timing);
const Root:React.FC=()=> <Composition id='SunTzu' component={SunTzu} width={1080} height={1920} fps={30} durationInFrames={actual?.totalFrames??30} defaultProps={{withAudio:false,...(actual?{timing:actual}:{})}} calculateMetadata={({props})=>{const timing:Timing|undefined=(props as SunTzuProps).timing??actual;if(!timing)throw new Error('src/suntzu_timing.json belum tersedia. Gunakan checks --fixture untuk QA sementara.');if(timing.order.length!==8||timing.fps!==30)throw new Error('Expected 8 scenes and 30 fps');return {durationInFrames:timing.totalFrames,props:{...props,timing}};}}/>;
registerRoot(Root);

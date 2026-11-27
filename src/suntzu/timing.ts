/** Same local-word/global-caption contract as kelelawar_timing.json. Timing is injected by the separate entry. */
export type V=[number,number,number];
export type Word={w:string;from:number;to:number};
export type Line={voice:string;style:string;text:string;from:number;to:number;words:Word[]};
export type Timing={fps:number;totalFrames:number;order:string[];scenes:Record<string,{startFrame:number;durationInFrames:number}>;lines:Record<string,Line[]>;events:Record<string,number>;captions:Array<{text:string;from?:number;to?:number;startFrame?:number;endFrame?:number;voice:string}>};
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const smooth=(n:number)=>{const x=clamp(n);return x*x*x*(x*(x*6-15)+10)};
export const mix=(a:V,b:V,k:number):V=>a.map((x,i)=>x+(b[i]-x)*k) as V;
export const wordAt=(t:Timing,s:string,word:string,fallback:number)=>t.lines[s]?.flatMap(l=>l.words).find(w=>w.w.toLowerCase().replace(/[^a-z]/g,'').startsWith(word))?.from??fallback;
export const mouth=(t:Timing,s:string,v:string,f:number)=>{for(const l of t.lines[s]??[]){if(l.voice!==v)continue;for(const w of l.words)if(f>=w.from&&f<w.to)return .28+.7*Math.abs(Math.sin((f-w.from)*.85));}return 0};

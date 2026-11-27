import React,{useState} from 'react';
import {AbsoluteFill,useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {CameraRig} from './three/objects';
import {ToonSky} from './three/toon';
import {BeanCard,BeanParams,beanHandWorld,beanWalk} from './three/objectsBean';
import {SZ_DODI,SZ_ARA,SZ_SUN,SZ_KING,SZ_CAP_A,SZ_CAP_B,SZ_MESSENGER} from './SheetSunTzu';
import {Palace} from './suntzu/World';
import {Timing,V,smooth,clamp,mix,mouth,wordAt} from './suntzu/timing';

const titles=['UJIAN SANG AHLI STRATEGI','2 KELOMPOK • 2 PEMIMPIN','PERINTAH PERTAMA','DIJELASKAN ULANG','HARGA SEBUAH PERINTAH','RAJA MEMINTA BERHENTI','BARISAN BERUBAH','DISIPLIN ATAU KEKEJAMAN?'];
type Cam={p:V;t:V;fov:number};
// Shot interpolation follows scenesKelelawar: eased glide, distinct inserts, then pullback.
const glide=(u:number,a:V,b:V,t:V,fov=52):Cam=>({p:mix(a,b,smooth(u)),t,fov});
const curve=(points:V[],u:number):V=>new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal').getPoint(smooth(u)).toArray() as V;
const shot=(q:number,shots:Array<{end:number;a:V;b:V;t:V;fov?:number}>):Cam=>{let from=0;for(const s of shots){if(q<s.end)return glide((q-from)/(s.end-from),s.a,s.b,s.t,s.fov);from=s.end}const s=shots[shots.length-1];return glide(1,s.a,s.b,s.t,s.fov)};
const offset=(p:V,x:number,y:number,z:number):V=>[p[0]+x,p[1]+y,p[2]+z];

const Spear:React.FC<{at:V;angle?:number}>=({at,angle=0})=><group position={at} rotation={[0,angle*4,angle]}><mesh position={[0,.15,0]}><cylinderGeometry args={[.022,.026,2.25,8]}/><meshStandardMaterial color='#765033'/></mesh><mesh position={[0,1.39,0]}><coneGeometry args={[.075,.28,4]}/><meshStandardMaterial color='#aaa89d' metalness={.5} roughness={.4}/></mesh></group>;
const Stick:React.FC<{at:V;angle:number}>=({at,angle})=><group position={at} rotation={[angle,0,-.45]}><mesh position={[0,-.19,0]}><cylinderGeometry args={[.025,.025,.5,8]}/><meshStandardMaterial color='#8b613a'/></mesh><mesh position={[0,-.45,0]}><sphereGeometry args={[.075,10,8]}/><meshStandardMaterial color='#d1b98b'/></mesh></group>;

const Actor:React.FC<{p:BeanParams;at:V;f:number;cam:V;h?:number;walk?:number;voice?:string;t:Timing;s:string;spear?:boolean;turn?:number;extra?:Partial<BeanParams>}>=({p,at,f,cam,h=1.95,walk=0,voice,t,s,spear=false,turn=0,extra={}})=>{
 const talking=voice?mouth(t,s,voice,f):0,seed=p.seed??0;
 const params:BeanParams={...p,...(walk?beanWalk(f*.24,walk):{}),bob:Math.sin(f*.055+seed)*1.5,headTilt:Math.sin(f*.035+seed)*1.4,blink:(f+seed*7)%137<4,expr:p.expr??'neutral',mouthOpen:0,armR:talking?[24+Math.sin(f*.12)*13,-33]:p.armR,...extra,...(voice?{mouthOpen:talking,expr:talking?'talk':extra.expr??p.expr??'neutral'}:{})};
 const hand=beanHandWorld(params,'R',at,h,cam);
 return <><BeanCard position={at} height={h} params={params} tint='#fff6e7' faceCam={turn<.05} yaw={turn*Math.PI/2}/>{spear&&<Spear at={hand} angle={turn*.22}/>}</>;
};

/** Every small action gets its own animated hand insert, without hiding the current world. */
const HandInsert:React.FC<{kind:string;f:number;len:number}>=({kind,f,len})=>{
 const x=clamp(f/len),strike=Math.sin(clamp(x*2)*Math.PI),stop=kind==='stop';
 return <div style={{position:'absolute',left:100,right:100,top:515,height:660,border:'6px solid #3c3530',borderRadius:35,background:'#f1e5c9ee',boxShadow:'0 16px 50px #211b2b66'}}>
 <svg viewBox='0 0 800 600' width='100%' height='100%'>
 {kind==='drum'&&<><ellipse cx='440' cy='460' rx='230' ry='80' fill='#98534a' stroke='#332b29' strokeWidth='10'/><ellipse cx='440' cy='415' rx='230' ry='70' fill='#e3d6b4' stroke='#332b29' strokeWidth='9'/></>}
 {kind==='spear'&&<><path d='M570 540V70' stroke='#715134' strokeWidth='20'/><path d='M540 100L570 24L600 100Z' fill='#999b93' stroke='#332b29' strokeWidth='7'/></>}
 {kind==='bamboo'&&Array.from({length:8},(_,i)=><rect key={i} x={170+i*55} y={235} width={47} height={230} rx={6} fill='#c9a866' stroke='#46372b' strokeWidth={5}/>)}
 <g transform={'translate('+ (stop?260:kind==='left'?470:240) +' '+(kind==='drum'?80+strike*130:210)+') rotate('+(kind==='left'?-85:kind==='drum'?strike*30:stop?-15:10)+')'}>
 <path d='M-130 220L-50 105Q-25 50 30 56L100 100L76 195L0 275Z' fill='#4b6552' stroke='#302a28' strokeWidth='9'/>
 <ellipse cx='32' cy='60' rx='73' ry='69' fill='#eed1ac' stroke='#302a28' strokeWidth='8'/>
 {(stop?[0,1,2,3]:[0,1,2]).map(i=><rect key={i} x={-33+i*29} y={stop?-85:-20} width={29} height={stop?125:74} rx={15} fill='#eed1ac' stroke='#302a28' strokeWidth={5} transform={'rotate('+(stop?(i-1.5)*8:0)+' 35 50)'}/>)}
 <ellipse cx='-30' cy='75' rx='23' ry='48' fill='#eed1ac' stroke='#302a28' strokeWidth='6' transform='rotate(-35 -30 75)'/>
 {kind==='drum'&&<><path d='M35 20L200 185' stroke='#6d4930' strokeWidth='24'/><circle cx='200' cy='185' r='33' fill='#d7bc82' stroke='#302a28' strokeWidth='7'/></>}
 </g></svg><div style={{position:'absolute',bottom:28,left:25,right:25,textAlign:'center',fontSize:34,fontWeight:800,color:'#3a322c'}}>{({drum:'ANGKAT → PUKUL → PANTUL',left:'ABA-ABA: BELOK KIRI',stop:'BERHENTI',spear:'GENGGAM → TEGAKKAN',bamboo:'UJIAN SANG STRATEGI'} as Record<string,string>)[kind]}</div></div>;
};

export const SunTzuScene:React.FC<{timing:Timing;scene:string;index:number}>=({timing:t,scene:s,index:i})=>{
 const f=useCurrentFrame(),d=t.scenes[s].durationInFrames,q=clamp(f/d);
 const [anchors,setAnchors]=useState<Record<string,V>>({});
 const anchor=(name:string,fallback:V)=>anchors[name]??fallback;
 const aSun=anchor('WP_Char_SunTzu_Training',[0,.14,-1]);
 const hallSun=anchor('WP_Char_SunTzu_Hall',[0,.99,-10]);
 const training=wordAt(t,s,'tertawa',d*.48),left=wordAt(t,s,'kiri',d*.42),death=wordAt(t,s,'mati',d*.58),refuse=wordAt(t,s,'menolak',d*.69),turn=t.events.turn??wordAt(t,s,'serempak',d*.57);
 let cam:Cam;
 if(i===0&&q<.25){const pts=Array.from({length:7},(_,n)=>anchor('WP_Cam_FlyIn_'+n,[[0,2.2,23],[0,2.2,18],[0,2.2,14],[0,2.2,9],[0,2.4,-3],[0,2.6,-5.7],[0,2.6,-8]][n] as V));cam={p:curve(pts,q/.25),t:curve([[0,2,8],[0,2,-5],[0,2,-12]],q/.25),fov:52};}
 else if(i===1&&q<.22){cam={p:curve([[0,2.2,23],[0,2.2,18],[0,2.2,14],[0,2.7,10]],q/.22),t:[0,1.4,1],fov:55};}
 else if(i===0)cam=shot(q,[{end:.5,a:[.2,2.5,-5.9],b:[-.2,2.4,-6.3],t:[0,2,-10.8]},{end:.65,a:[.8,2.4,-10.6],b:[.6,2.3,-10.9],t:[0,1.6,-12.65]},{end:1,a:[.4,3,-6],b:[1.2,3.3,-4.8],t:[0,2,-11]}]);
 else if(i===5) {const mp=messenger(q);cam=shot(q,[{end:.23,a:[-13,2.5,4.5],b:[-13.2,2.3,4],t:[-13,1.6,-.7]},{end:.65,a:offset(mp,1.4,2.3,5.7),b:offset(mp,1,2,5),t:offset(mp,0,1.1,0)},{end:.77,a:offset(mp,.2,1.7,2.7),b:offset(mp,0,1.65,2.5),t:offset(mp,0,1.5,0)},{end:1,a:[1,2.9,6.5],b:[2.3,3.3,8],t:[-.8,1.4,-1]}]);}
 else if(i===7)cam=shot(q,[{end:.2,a:[2,8,16],b:[0,5,12],t:[0,1.5,1]},{end:.47,a:[-12.9,2.4,5.7],b:[-13.2,2.3,5.2],t:[-13,1.65,.1]},{end:.6,a:[-13,2.5,2.3],b:[-13.1,2.4,2.1],t:[-13.5,1.8,-.9]},{end:1,a:[-12.8,2.8,6.4],b:[-12.2,3.5,9],t:[-13,1.6,-.1]}]);
 else if(i===6&&q<.19)cam=glide(q/.19,[-15,2.9,6],[-14.7,3.2,5.5],[-16.1,2.2,-3.2],48);
 else cam=shot(q,[{end:.23,a:[.4,3.2,9],b:[0,2.8,8],t:[0,1.45,-.2]},{end:.39,a:[.5,2.6,6],b:[.2,2.5,5.7],t:[0,1.45,-.4]},{end:.59,a:[.5,3.3,10],b:[-.4,3.1,9.4],t:[0,1.3,1]},{end:.74,a:i===4?[-.55,1.95,5.7]:[-.8,2,4.1],b:i===4?[-.4,1.9,5.4]:[-.65,1.95,3.9],t:i===4?[-.5,1.7,3.4]:[-.75,1.65,1.3],fov:48},{end:1,a:[.4,3.1,9],b:[1,3.7,11],t:[0,1.4,1.4]}]);
 if(i===4&&f>=death-2&&f<death+6)cam.p[0]+=(f%2?1:-1)*.035*(1-(f-death+2)/8);
 const actor=(p:BeanParams,at:V,key:string,extra:Partial<BeanParams>={},walk=0,spear=false,voice?:string,rot=0)=><Actor key={key} p={p} at={at} f={f} cam={cam.p} t={t} s={s} extra={extra} walk={walk} spear={spear} voice={voice} turn={rot}/>;
 const laughed=(i===2||i===3)&&f>=(i===3?wordAt(t,s,'tawa',d*.5):training)-2;
 const sunArm=i===5&&f>=refuse-2?[82,-65]:i===4?[75,-55]:i===3&&f>=left-2?[-65,-10]:[36+Math.sin(f*.07)*10,-38];
 const hostBase:V=i===0?[0,.99,-9.5]:i===7?[-13,.44,.2]:[0,.14,3.6];
 const insert=i===0&&q>.5&&q<.64?'bamboo':i===2&&q>.23&&q<.37?'drum':i===3&&q>.23&&q<.34?'left':i===4&&q>.23&&q<.34?'stop':i===5&&q>.15&&q<.23?'stop':i===6&&q>.4&&q<.54?'spear':null;
 const insertStart=i===0?.5:i===5?.15:i===6?.4:.23;
 return <AbsoluteFill style={{background:'#bad5d9',fontFamily:'Inter, sans-serif'}}>
 <ThreeCanvas width={1080} height={1920} camera={{position:cam.p,fov:cam.fov,near:.05,far:280}} gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.18}}>
 <CameraRig position={cam.p} lookAt={cam.t} fov={cam.fov}/><ToonSky top={i>3?'#92b4ca':'#7db6d2'} horizon='#eedec0' bottom='#bab69a' r={220}/>
 <hemisphereLight args={['#fff0da','#8d8069',1.6]}/><directionalLight position={[-15,25,16]} color='#ffdfb2' intensity={2.6}/><directionalLight position={[0,5,15]} intensity={.65}/>
 <pointLight position={[0,3,-11]} intensity={18} distance={14} decay={1.3} color='#ffe3b7'/><pointLight position={[-13,3,-.5]} intensity={15} distance={12} color='#ffe1b5'/>
 <Palace onAnchors={setAnchors}/><Atmosphere f={f}/>
 {i===0?<>{actor(SZ_SUN,offset(hallSun,-.5,0,-.7),'sun',{headTilt:Math.sin(f*.05)*3,armR:[40,-42]})}{actor(SZ_KING,[.9,.99,-13.5],'king',{expr:'smug',armR:q>.65?[65,-45]:[15,-20]})}</>:<>
 {actor(SZ_SUN,aSun,'sun',{armR:sunArm as [number,number],armL:i===3&&f>=left-2?[65,-40]:[-15,-18],expr:i===4?'worried':'neutral'})}
 {i!==7&&Array.from({length:10},(_,n)=>{const row=Math.floor(n/2),side=n%2?1:-1;const rot=i===6?smooth((f-turn+2)/25):0;const move=i===1?1-smooth((q-.24)/.2):0;const p:V=[side*(1.65+row*.13)+move*side*.5,.14,-2.6+row*1.55];return actor({...SZ_CAP_A,robe:n%2?'#819488':'#9d8178',torso:n%2?'#819488':'#9d8178',sleeves:n%2?'#819488':'#9d8178',seed:220+n},p,'extra'+n,{headTilt:laughed?Math.sin(f*.3+n)*5:0,expr:laughed?'happy':'neutral',armR:[28,-42]},move>0&&move<1?1:rot>0&&rot<1?.6:0,true,undefined,rot)})}
 {i!==7&&[SZ_CAP_A,SZ_CAP_B].map((p,n)=>{const exit=i===6?smooth(q/.16):0,approach=i===1?1-smooth((q-.23-n*.03)/.16):0;const at:V=[(n?1:-1)*(.85+exit*4+approach*1.3),.14,n?2.45:1.1];return q<.19||i!==6?actor(p,at,'cap'+n,{expr:i>=4?'scared':laughed?'laugh':'neutral',mouthOpen:laughed?.6+.25*Math.sin(f*.35):0,headTilt:laughed?Math.sin(f*.3+n)*5:0,armR:[30,-40]},approach>0&&approach<1||exit>0&&exit<1?1:0,true):null})}
 {i===6&&q>.19&&[SZ_CAP_A,SZ_CAP_B].map((p,n)=>{const k=smooth((q-.19)/.18),rot=smooth((f-turn+2)/25);return actor({...p,sash:n?'#88c5b4':'#d5dba3',seed:260+n},[(n?1:-1)*.85,.14,(n?-.1:-1.3)+(n?2.55:2.4)*k],'replacement'+n,{expr:'worried',armR:[38+smooth((q-.4)/.14)*16,-47]},k>0&&k<1||rot>0&&rot<1?1:0,true,undefined,rot)})}
 {i===2&&<Drummer f={f} t={t} s={s} cam={cam.p} hit={wordAt(t,s,'genderang',d*.25)} actor={actor}/>}
 {(i===5||i===7)&&actor(SZ_KING,[-13.7,.44,-.9],'king',{expr:i===7?'sad':'shock',armR:i===5?[76,-56]:[12,-15],lean:i===5?Math.sin(clamp(q/.14)*Math.PI)*8:0})}
 {i===5&&actor(SZ_MESSENGER,messenger(q),'messenger',{expr:'worried',armL:q>.66?[55,-38]:[-15,-18]},q>.22&&q<.68?1:0)}
 </>}
 {(i!==5||q>.78)&&actor(SZ_DODI,offset(hostBase,-.55,0,-.2),'dodi',{expr:i>=4?'worried':'neutral'},0,false,'dodi')}
 {(i!==5||q>.78)&&actor(SZ_ARA,offset(hostBase,.62,0,-1.6),'ara',{expr:i>=4?'sad':'think',headTilt:i===7?Math.sin(f*.05)*-3:0},0,false,'ara')}
 </ThreeCanvas>
 <div style={{position:'absolute',top:90,left:70,right:70,color:'#302f31',background:'#f9eedbdc',padding:'20px 25px',borderRadius:18,border:'2px solid #b49b71',fontWeight:850,fontSize:36,lineHeight:1.2}}>{String(i+1).padStart(2,'0')} / {titles[i]}</div>
 {i===1&&<div style={{position:'absolute',top:240,left:80,right:80,color:'#393337',fontSize:25,textAlign:'center',background:'#fff2dbcc',padding:12}}>Sumber: 180 perempuan • figuran disederhanakan</div>}
 {insert&&<HandInsert kind={insert} f={f-d*insertStart} len={Math.min(60,d*.14)}/>}
 {i===6&&q>.12&&q<.2&&<AbsoluteFill style={{background:'#344449',opacity:Math.sin((q-.12)/.08*Math.PI)*.8}}/>}
 {i===7&&<div style={{position:'absolute',left:65,right:65,bottom:260,textAlign:'center',background:'#fbf1dfeb',padding:'22px',borderRadius:18,fontSize:30,fontWeight:700,color:'#3e3935'}}>Kisah dalam Shiji • Dialog didramatisasi<div style={{fontSize:22,marginTop:9}}>Catatan jauh sesudah masa Sun Tzu; bukan kepastian setiap kejadian.</div></div>}
 </AbsoluteFill>;
};

// Existing asset has hall steps but no stairs on command platform. Follow its real hall stair treads,
// then the unobstructed court route; do not pretend the 0.4m command dais has a staircase.
export const messenger=(q:number):V=>{
 if(q<.22)return [-1.8,.99,-8.2];
 const k=clamp((q-.22)/.46),pts:V[]=[[-1.8,.99,-8.2],[-1.8,.99,-6.0],[-1.8,.78,-5.61],[-1.8,.57,-5.29],[-1.8,.36,-4.97],[-1.8,.15,-4.65],[-1.5,.14,-2.1]];
 const p=k*(pts.length-1),n=Math.min(pts.length-2,Math.floor(p));return mix(pts[n],pts[n+1],smooth(p-n));
};
const Drummer:React.FC<{f:number;t:Timing;s:string;cam:V;hit:number;actor:(p:BeanParams,at:V,key:string,extra?:Partial<BeanParams>,walk?:number,spear?:boolean,voice?:string,rot?:number)=>React.ReactNode}>=({f,cam,hit,actor})=>{
 const stroke=smooth((f-hit+18)/12)-smooth((f-hit)/8);const at:V=[-7.3,.14,3.2];const p:BeanParams={...SZ_MESSENGER,armR:[32+stroke*85,-50],armL:[-12,-18]};const hand=beanHandWorld(p,'R',at,1.95,cam);
 return <>{actor(p,at,'drummer')}<Stick at={hand} angle={-.7+stroke*1.2}/></>;
};
const Atmosphere:React.FC<{f:number}>=({f})=><group>
 {[-16,9].map((x,n)=><group key={x} position={[x,2.8,-3]}>{[0,1,2,3,4].map(j=><mesh key={j} position={[j*.16,Math.sin(f*.055+j*.6+n)*.07,0]} rotation={[0,Math.sin(f*.045+j*.7)*.12,0]}><boxGeometry args={[.17,1.3,.025]}/><meshStandardMaterial color={n?'#a05e54':'#658a79'} side={THREE.DoubleSide}/></mesh>)}</group>)}
 {Array.from({length:16},(_,n)=><mesh key={n} position={[-4+(n%5)*2+Math.sin(f*.009+n)*.3,.8+(n*.31+f*.006)%3,-3+Math.floor(n/5)*3]}><sphereGeometry args={[.012,4,4]}/><meshBasicMaterial color='#ffe5ba' transparent opacity={.32}/></mesh>)}
 {[-13,3].map((x,n)=><mesh key={x} position={[x,3.5+Math.sin(f*.025+n)*.08,n?-12:-1]} scale={[.11,.65,.11]}><sphereGeometry args={[1,7,6]}/><meshBasicMaterial color='#efe4d3' transparent opacity={.08}/></mesh>)}
 </group>;

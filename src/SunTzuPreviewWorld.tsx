// Design-review stills only. GLB loader and forced redraw follow scenesNapoleon.tsx.
import React,{useEffect,useMemo,useState} from "react";
import {AbsoluteFill,cancelRender,continueRender,delayRender,staticFile} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import {useThree} from "@react-three/fiber";
import * as THREE from "three";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";
import {CameraRig} from "./three/objects";
import {ToonSky} from "./three/toon";
import {BeanCard,BeanParams} from "./three/objectsBean";
import {SZ_DODI,SZ_ARA,SZ_SUN,SZ_KING,SZ_CAP_A,SZ_CAP_B,SZ_MESSENGER} from "./SheetSunTzu";
type V=[number,number,number];
type Cam={position:V;target:V;fov:number};
const cams:Cam[]=[
 {position:[0,13,40],target:[0,2.3,-1],fov:52},
 {position:[1.1,2.6,-7.7],target:[0,1.9,-13.6],fov:52},
 {position:[4,3.6,12],target:[-.5,1.2,1],fov:55},
 {position:[-11,2.6,5],target:[-13,1.45,-1.3],fov:52},
 {position:[8.7,2,1],target:[10.5,1.5,-2.5],fov:48},
 {position:[16,11,24],target:[-3,2.2,-2],fov:55},
 {position:[-7.3,2.5,6],target:[-8,1.45,3],fov:48},
 {position:[1.1,3.5,-8.9],target:[0,1.6,-12.65],fov:52},
 {position:[10,2.1,-3],target:[12,1.6,-7],fov:48},
 {position:[-13,3.5,4.5],target:[-13,1.0,-1.7],fov:55},
];
const titles=["GERBANG & KOMPLEKS ISTANA","BALAIRUNG / INTERIOR","HALAMAN LATIHAN","PAVILIUN KOMANDO","LONCENG PERUNGGU","KOMPLEKS / SUDUT SENJA","GENDERANG & PEMUKUL","BILAH BAMBU & CAWAN","RAK TOMBAK","MEJA PERINTAH & LAMPU"];
const desc=["Pagi hangat • gerbang nyata untuk kamera masuk","Kayu bertekstur • meja rendah • tikar • sinar jendela","Tanah padat • panji • dua kelompok bertingkat","Ruang terbuka • perabot • rute utusan","Properti 3D terpisah • detail patina","Variasi grading artistik • bukan waktu kejadian pasti","Insert pukulan: angkat → kontak → pantul","Bilah terpisah • bukan gulungan kertas modern","Batang dan mata tombak dapat dipindah bersama","Bilah perintah, tongkat dan lampu minyak"];
let cached:Promise<THREE.Group>|null=null;
const load=()=>cached??(cached=new Promise<THREE.Group>((resolve,reject)=>new GLTFLoader().load(staticFile("models/suntzu-palace.glb"),g=>resolve(g.scene),undefined,reject)));
const World:React.FC=()=>{
 const [scene,setScene]=useState<THREE.Group|null>(null);
 const [handle]=useState(()=>delayRender("suntzu GLB mounted and advanced"));
 const invalidate=useThree(s=>s.invalidate),advance=useThree(s=>s.advance);
 useEffect(()=>{load().then(setScene).catch(cancelRender)},[]);
 const instance=useMemo(()=>{if(!scene)return null;const s=scene.clone(true);s.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){m.castShadow=!/Terrain|Court|Soil|Hill/.test(m.name);m.receiveShadow=true;m.frustumCulled=false}});return s},[scene]);
 useEffect(()=>{if(!instance)return;invalidate();const t=setTimeout(()=>{invalidate();advance(performance.now()/1000,true);continueRender(handle)},450);return()=>clearTimeout(t)},[instance,handle,invalidate,advance]);
 return instance?<primitive object={instance}/>:null;
};
const Clouds:React.FC=()=> <group>{[-1,0,1].map((n)=><group key={n} position={[n*37,19+Math.abs(n)*4,-49-n*7]}>{[0,1,2,3].map(j=><mesh key={j} position={[j*3.7,Math.sin(j)*1.5,0]} scale={[5.7,1.6+j%2*.5,2.2]}><sphereGeometry args={[1,10,8]}/><meshBasicMaterial color="#fff3df" transparent opacity={.85}/></mesh>)}</group>)}</group>;
const Person:React.FC<{p:BeanParams;at:V;h?:number}>=({p,at,h=1.95})=><BeanCard position={at} height={h} params={p} tint="#fff8ed"/>;
const Extras:React.FC=()=> <>{Array.from({length:6},(_,i)=><Person key={i} p={{...(i%2?SZ_CAP_A:SZ_CAP_B),robe:i%2?"#9b7862":"#708b7f",torso:i%2?"#9b7862":"#708b7f",sleeves:i%2?"#9b7862":"#708b7f",expr:"neutral",seed:210+i}} at={[-1.7+(i%2)*3.4,.14,-3.5+Math.floor(i/2)*1.5]} h={1.8}/>)}</>;
const storyCams:Cam[]=[
 {position:[.2,2.4,-7.3],target:[0,1.9,-11],fov:52},
 {position:[1.2,2.8,9],target:[0,1.35,1],fov:52},
 {position:[.5,3.0,10],target:[0,1.45,.4],fov:52},
 {position:[0,2.9,9.5],target:[0,1.5,.3],fov:52},
 {position:[0,3,10],target:[0,1.45,.3],fov:50},
 {position:[-12.5,2.5,5.5],target:[-13.1,1.5,-.4],fov:52},
 {position:[2.5,4.8,13],target:[0,1.15,2.3],fov:52},
 {position:[-13,2.7,5.7],target:[-13,1.5,-.3],fov:52},
];
const storyTitles=["01 / UJIAN RAJA","02 / DUA PEMIMPIN","03 / PERINTAH PERTAMA","04 / KESEMPATAN KEDUA","05 / HUKUMAN MENGEJUTKAN","06 / RAJA TURUN TANGAN","07 / BARISAN BERUBAH","08 / HARGA KEPATUHAN"];
const storySubs=["Fly-through luar → balairung","Fly-through gerbang → paviliun latihan","Crane turun • insert genderang • reaksi","Push-in • insert arah • pull-back","Push lebih cepat + kick pada kata pemicu","Insert tangan • tracking utusan • orbit","Cutaway tanpa kekerasan • pull-back barisan","Crane • medium pemandu • dolly mundur"];
const StoryPeople:React.FC<{v:number}>=({v})=>{
 if(v===0)return <><Person p={{...SZ_SUN,expr:"neutral"}} at={[-.5,.99,-10.7]}/><Person p={{...SZ_KING,expr:"smug"}} at={[.9,.99,-13.5]} h={1.9}/></>;
 if(v===5)return <><Person p={{...SZ_KING,expr:"shock",armR:[75,-60]}} at={[-13.8,.44,-.9]}/><Person p={{...SZ_MESSENGER,expr:"worried",armL:[45,-25]}} at={[-12.1,.44,.3]}/></>;
 if(v===7)return <><Person p={{...SZ_DODI,expr:"talk",mouthOpen:.55,armR:[55,-45]}} at={[-13.7,.44,.4]}/><Person p={{...SZ_ARA,expr:"sad",headTilt:-5}} at={[-12.3,.44,-1]}/></>;
 return <>{(v===1||v===6)&&<Extras/>}<Person p={{...SZ_SUN,expr:v===4?"angry":"neutral",armR:[v===4?70:45,-45]}} at={[0,.14,-.7]} h={2.05}/>{v!==6&&<><Person p={{...SZ_CAP_A,expr:v===4?"scared":"laugh",mouthOpen:.7}} at={[-1.1,.14,1.2]}/><Person p={{...SZ_CAP_B,expr:v===4?"worried":"laugh",mouthOpen:.6}} at={[.9,.14,2.5]}/></>}</>;
};
export const SunTzuPreviewWorld:React.FC<{view?:number;story?:boolean}>=({view=0,story=false})=>{
 const v=Math.max(0,Math.min(story?7:9,view)),c=story?storyCams[v]:cams[v];
 const sunset=!story&&v===5,interior=(!story&&(v===1||v===7))||(story&&v===0),command=(!story&&(v===3||v===9))||(story&&(v===5||v===7)),cool=story&&v>=4;
 return <AbsoluteFill style={{background:"#b9d4db",fontFamily:"Inter, sans-serif"}}>
 <ThreeCanvas width={1080} height={1920} shadows camera={{position:c.position,fov:c.fov,near:.05,far:280}} gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.15}}>
 <CameraRig position={c.position} lookAt={c.target} fov={c.fov}/>
 <ToonSky top={sunset?"#6d789a":cool?"#879bad":"#78aec7"} horizon={sunset?"#efb58d":"#e9d8b4"} bottom="#b9b295" r={220}/><Clouds/>
 <hemisphereLight args={[cool?"#d4e5f3":"#fff0d7","#7b7060",interior?1.5:1.15]}/>
 <directionalLight position={[sunset?-25:-15,25,16]} color={sunset?"#ffc590":cool?"#e5edfa":"#ffdfac"} intensity={sunset?2.3:2.8} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={35} shadow-camera-bottom={-35} shadow-camera-far={100} shadow-bias={-.001}/>
 {interior&&<><pointLight position={[0,4,-11]} intensity={14} distance={14} decay={1.4} color="#ffe5b5"/><pointLight position={[3,2,-13]} intensity={6} distance={7} color="#ffba67"/></>}
 {command&&<pointLight position={[-13,3,-.5]} intensity={16} distance={12} decay={1.25} color="#ffe0ac"/>}
 <World/>
 {story?<StoryPeople v={v}/>:v===2?<><Extras/><Person p={SZ_SUN} at={[0,.14,-1]} h={2}/></>:v===1?<Person p={SZ_KING} at={[.9,.99,-13.5]} h={1.85}/>:null}
 </ThreeCanvas>
 <div style={{position:"absolute",left:55,right:55,top:65,padding:"26px 30px",borderRadius:20,background:"rgba(248,241,222,.94)",border:"2px solid #b99a65",boxShadow:"0 12px 35px #1c1b2926"}}><div style={{fontSize:23,letterSpacing:3,color:"#8a603c",fontWeight:800}}>SUN TZU • {story?"POSE / BUKAN FRAME FINAL":"DESAIN LATAR BLENDER → GLB"}</div><div style={{fontSize:40,fontWeight:800,marginTop:12,color:"#2c292d",lineHeight:1.18}}>{story?storyTitles[v]:titles[v]}</div></div>
 <div style={{position:"absolute",left:55,right:55,bottom:90,padding:"22px 28px",borderRadius:15,background:"rgba(34,36,40,.87)",color:"#fff3db",fontSize:27,lineHeight:1.4}}>{story?storySubs[v]:desc[v]}<div style={{fontSize:20,marginTop:12,opacity:.8}}>Interpretasi artistik • bukan rekonstruksi pasti</div></div>
 </AbsoluteFill>;
};

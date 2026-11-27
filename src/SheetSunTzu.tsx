import React from "react";
import {AbsoluteFill} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import {CameraRig} from "./three/objects";
import {BeanCard, BeanParams, BeanExpr} from "./three/objectsBean";

const common: BeanParams = {skin:"#eed0aa",hair:"#251d1c",sideHair:"#251d1c",crossCollar:true,hat:"wuTopknot",robeTrim:"#d6bb88",pants:"#454049",armL:[-12,-18],armR:[18,-30]};
export const SZ_DODI: BeanParams = {...common,robe:"#274858",torso:"#274858",sleeves:"#274858",sash:"#c39550",hatColor:"#bd9050",seed:181};
export const SZ_ARA: BeanParams = {...common,skin:"#f4d8bb",hat:"sanggul",robe:"#348d8a",torso:"#348d8a",sleeves:"#348d8a",sash:"#d79a83",robeTrim:"#e9d6af",seed:182};
export const SZ_SUN: BeanParams = {...common,robe:"#4c5b43",torso:"#4c5b43",sleeves:"#4c5b43",sash:"#4d342a",hatColor:"#907347",wide:1.08,seed:183};
export const SZ_KING: BeanParams = {...common,hat:"wuCourt",robe:"#783b39",torso:"#783b39",sleeves:"#783b39",sash:"#bb9450",robeTrim:"#c5a466",wide:1.18,seed:184};
export const SZ_CAP_A: BeanParams = {...common,skin:"#f2d4b2",hat:"sanggul",robe:"#a45469",torso:"#a45469",sleeves:"#a45469",sash:"#d5b36e",seed:185};
export const SZ_CAP_B: BeanParams = {...common,skin:"#e8c9a9",hat:"sanggul",robe:"#637baf",torso:"#637baf",sleeves:"#637baf",sash:"#d5b36e",seed:186};
export const SZ_MESSENGER: BeanParams = {...common,robe:"#95724e",torso:"#95724e",sleeves:"#95724e",sash:"#403c36",hatColor:"#66503c",seed:187};
const cast = [
 ["DODI", "Pria · narator / pemandu", "Biru tinta, ikat rambut, gestur menjelaskan.", SZ_DODI],
 ["ARA", "Wanita · pertanyaan penonton", "Toska, sanggul, reaksi penasaran → prihatin.", SZ_ARA],
 ["SUN TZU", "Reka rupa tokoh sejarah · tanpa suara", "Hijau zaitun, kerah silang, wajah terbaca.", SZ_SUN],
 ["RAJA HELÜ", "Reka rupa tokoh sejarah · tanpa suara", "Merah kayu, penutup kepala seremonial stilisasi.", SZ_KING],
 ["PEMIMPIN A", "Perempuan istana · nama tidak diketahui", "Mawar kusam; tertawa → terkejut.", SZ_CAP_A],
 ["PEMIMPIN B", "Perempuan istana · nama tidak diketahui", "Biru periwinkle; tertawa → cemas.", SZ_CAP_B],
 ["UTUSAN", "Pria · figuran interpretatif", "Cokelat tanah; bergegas membawa pesan lisan.", SZ_MESSENGER],
] as const;
const ink="#282630", muted="#665d56";
const base: React.CSSProperties={fontFamily:"Inter, sans-serif",background:"linear-gradient(140deg,#faf5e9,#e9dfce)",color:ink};
const Header:React.FC<{title:string;sub:string}>=({title,sub})=><div style={{position:"absolute",top:38,left:54,right:54,borderBottom:"3px solid #b89a67",paddingBottom:18}}><div style={{fontSize:25,fontWeight:800,letterSpacing:6,color:"#966b3e"}}>SUN TZU / PRATINJAU DESAIN 01</div><div style={{fontSize:57,fontWeight:800,marginTop:10}}>{title}</div><div style={{fontSize:24,color:muted,marginTop:8}}>{sub}</div></div>;
export const SheetSunTzuKarakter:React.FC=()=> <AbsoluteFill style={base}>
 <ThreeCanvas width={2400} height={1500} camera={{fov:25,near:.1,far:100,position:[0,2,23]}}>
 <CameraRig position={[0,2,23]} lookAt={[0,2,0]} fov={25}/>
 {cast.map((c,i)=><BeanCard key={c[0]} position={[-6.4+(i%4)*4.25,i<4?2.35:-2.05,0]} height={3.5} shadow={false} params={{...c[3],expr:i===0?"talk":i===1?"think":i===3?"smug":"neutral",mouthOpen:i===0?.5:0}}/>)}
 </ThreeCanvas>
 <Header title="LEMBAR KARAKTER" sub="Kartu kartun 2D di ruang 3D • busana interpretatif era Wu, bukan potret atau rekonstruksi pasti"/>
 {cast.map((c,i)=><div key={c[0]} style={{position:"absolute",left:9+(i%4)*625,top:i<4?725:1380,width:500,textAlign:"center"}}><div style={{fontSize:31,fontWeight:800}}>{c[0]}</div><div style={{fontSize:20,color:"#8a513f",fontWeight:800,marginTop:6}}>{c[1]}</div><div style={{fontSize:19,color:muted,marginTop:8,lineHeight:1.4}}>{c[2]}</div></div>)}
 <div style={{position:"absolute",left:1835,top:925,width:455,padding:28,border:"2px solid #b99a65",borderRadius:20,background:"#f7edda"}}><div style={{fontSize:28,fontWeight:800}}>ARAH VISUAL</div><div style={{fontSize:23,lineHeight:1.65,marginTop:15}}>Garis tinta tebal<br/>Lipatan & kelim busana<br/>Mulut dan mata tidak tertutup<br/>Dodi + Ara: VoxCPM2<br/>Hukuman tidak diperlihatkan</div></div>
 </AbsoluteFill>;
const exprs:[BeanExpr,string][]=[["neutral","TENANG"],["talk","MENJELASKAN"],["think","BERTANYA"],["laugh","TERTAWA"],["shock","TERKEJUT"],["sad","PRIHATIN"]];
export const SheetSunTzuEkspresi:React.FC=()=> <AbsoluteFill style={base}>
 <ThreeCanvas width={2400} height={1450} camera={{fov:24,near:.1,far:100,position:[0,1.8,24]}}>
 <CameraRig position={[0,1.8,24]} lookAt={[0,1.8,0]} fov={24}/>
 {[SZ_DODI,SZ_ARA].map((p,row)=>exprs.map(([e],i)=><BeanCard key={row+e} position={[-7.25+i*2.9,row===0?2.5:-1.65,0]} height={3.0} shadow={false} params={{...p,expr:e,mouthOpen:e==="talk"?.65:e==="laugh"?.8:0,sweat:e==="shock",headTilt:e==="think"?-6:0,armR:e==="shock"?[70,-50]:p.armR}}/>))}
 </ThreeCanvas>
 <Header title="EKSPRESI & PERUBAHAN NADA" sub="Dodi (atas) • Ara (bawah) — humor pembuka berhenti ketika hukuman diumumkan"/>
 {[0,1].map(row=><div key={row} style={{position:"absolute",left:60,right:60,top:row?1290:705,display:"flex",justifyContent:"space-around"}}>{exprs.map(([,s])=><div key={s} style={{width:340,textAlign:"center",fontSize:25,fontWeight:800,color:muted}}>{s}</div>)}</div>)}
 <div style={{position:"absolute",left:65,bottom:25,fontSize:23,color:muted}}>Sinkron kata + kedip + gestur tangan/badan • reaksi 0–3 frame sebelum kata pemicu • tanpa komedi pada penderitaan</div>
 </AbsoluteFill>;

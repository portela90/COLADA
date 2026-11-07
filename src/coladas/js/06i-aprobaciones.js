/* ===== APROBACIONES (Coladas) =====
   Los ajustes de stock que pasan de cfg.aprob.ajuste_kg kilos necesitan el visto bueno de quien aprueba
   (cfg.aprob.quien, Cristian: Beatriz no ve Coladas). Solo lo apuntado desde cfg.aprob.desde. El ajuste cuenta desde
   el principio. Tarjeta en Consultas › Por aprobar, aviso en la campana y en el móvil. Motor: comun/aprobaciones.js. */
const aprCfgC=()=>(cfg&&cfg.aprob)||{};
function aprListaC(){const c=aprCfgC(),L=[];if(!c.quien||!c.quien.length)return L;const lim=+c.ajuste_kg||0;if(!(lim>0))return L;const desde=c.desde||"2000-01-01",S=saldos();
  todosMovs().forEach(r=>{if(r.t!=="A"||r.h||!r.f||r.f<desde)return;const kg=kgAp(r,S)||0;if(Math.abs(kg)<=lim)return;const l=lotes.find(x=>x.id===(r.o||r.d));
    L.push({k:"mov:"+r.i,txt:"Ajuste de "+(kg>0?"+":"−")+fmt(Math.abs(Math.round(kg)))+" kg"+(r.fa!=null?" ("+Math.abs(r.fa)+" f)":"")+(l?" · colada "+l.nombre:""),
      det:[l?l.nave:r.nv,r.n||null].filter(Boolean).join(" · "),f:r.f,apr:r.apr||null,r,ir:irCol("hist")});});
  return L.sort((a,b)=>(b.f||"").localeCompare(a.f||""));}
let _APRC=null;
const APRC=()=>_APRC||(_APRC=Aprob({titulo:"Por aprobar",toast:t=>toast(t),cfg:aprCfgC,lista:aprListaC,puede:()=>!!window.WEB&&!!db,alCambiar:()=>render(),soloColadas:true,
  marcar:async(x,apr)=>{await itemsPut("mov",mesDe(x.r.f),Object.assign({},x.r,{apr}));},
  nombreDe:id=>(window.__usuariosCol||{})[id]||"Cristian",
  reglasTxt:c=>"Piden el visto bueno los ajustes de stock de más de "+fmt(+c.ajuste_kg||0)+" kg.",
  campos:[{k:"ajuste_kg",t:"Ajustes de más de (kg)"}],
  guardarCfg:async c=>{cfg.aprob=c;await saveCfg();},
  avisados:{leer:async()=>{try{const sn=await db.doc("aprav/lista").get();return sn.exists?(sn.data().k||[]):[];}catch(e){return[];}},guardar:async L=>{await db.doc("aprav/lista").set({k:L});}},
  avisa:async(para,nu)=>{if(!window.sbColada)return;await window.sbColada.rpc("alm_mencionar",{p_para:para,p_titulo:"Coladas · "+(nu.length===1?"un ajuste para aprobar":nu.length+" ajustes para aprobar"),
    p_texto:nu.slice(0,3).map(x=>x.txt).join(" · ").slice(0,280),p_url:"index.html?t=hist"});}}));
async function cargaUsuCol(){window.__usuariosCol={};try{const r=await window.sbColada.from("usuarios").select("user_id,nombre");const M={};(r.data||[]).forEach(u=>{M[u.user_id]=u.nombre;});window.__usuariosCol=M;}catch(e){}}
function cardAprobCol(){try{if(!window.__usuariosCol)cargaUsuCol();return APRC().pantalla();}catch(e){return null;}}

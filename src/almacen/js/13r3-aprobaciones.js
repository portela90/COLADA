/* ===== APROBACIONES (Almacén) =====
   Necesitan el visto bueno de quien aprueba (cat.aprob.quien, Beatriz): las salidas de material que pasan de
   cat.aprob.salida_eur € y las bajas de ejes. Solo lo apuntado desde cat.aprob.desde. El apunte cuenta desde el principio.
   Pantalla: Más › Por aprobar. Avisos en la campana y en el móvil del que aprueba. El motor está en comun/aprobaciones.js. */
let ejesBaja=[];
const aprCfg=()=>cat.aprob||{};
function aprLista(){const c=aprCfg(),L=[];if(!c.quien||!c.quien.length)return L;const desde=c.desde||"2000-01-01",lim=+c.salida_eur||0;
  if(lim>0)todosMov().forEach(m=>{if(m.tipo!=="salida"||!m.f||m.f<desde)return;const a=art(m.art);if(!a)return;const eu=(+m.cant||0)*precioDe(a);if(eu<=lim)return;
    L.push({k:"mov:"+m.id,txt:"Salida de "+fmtN(+m.cant||0)+" "+(a.ud||"")+" · "+a.desc+" · "+eur(Math.round(eu)),det:m.maq?"para la "+maqN(m.maq):m.nave?"para la "+m.nave:null,
      quien:m.por||null,f:m.f,apr:m.apr||null,m,ir:()=>{if(typeof fichaProd==="function")fichaProd(a.id);}});});
  if(c.baja_eje!==false)ejesBaja.forEach(e=>{const f=e.baja||null;if(!f||f<desde)return;
    L.push({k:"eje:"+e.cod,txt:"Baja del eje "+e.cod,det:e.obs||null,quien:e.por||null,f,apr:e.apr||null,e,ir:()=>irA("ejes")});});
  return L.sort((a,b)=>(b.f||"").localeCompare(a.f||""));}
let _APR=null;
const APR=()=>_APR||(_APR=Aprob({titulo:"Por aprobar",toast:t=>toast(t),cfg:aprCfg,lista:aprLista,puede:()=>!window.SOLO_CONSULTA,alCambiar:()=>render(true),
  marcar:async(x,apr)=>{if(x.m)await patchMov(x.m,{apr});else if(x.e){await db.doc("ejes/"+x.e.id).set(Object.assign({},x.e,{apr},{id:undefined}));}},
  nombreDe:id=>{const u=(window.__usuariosAlm||{})[id];return u||"Beatriz";},
  reglasTxt:c=>"Piden el visto bueno: las salidas de más de "+eur(+c.salida_eur||0)+(c.baja_eje!==false?" y las bajas de ejes":"")+".",
  campos:[{k:"salida_eur",t:"Salidas de más de (€)"},{k:"baja_eje",t:"Las bajas de ejes",tipo:"bool"}],
  guardarCfg:async c=>{cat.aprob=c;await saveCat();},
  avisados:{leer:async()=>{try{const sn=await db.doc("aprav/lista").get();return sn.exists?(sn.data().k||[]):[];}catch(e){return[];}},guardar:async L=>{await db.doc("aprav/lista").set({k:L});}},
  avisa:async(para,nu)=>{if(!window.sbColada)return;await window.sbColada.rpc("alm_mencionar",{p_para:para,p_titulo:"Almacén · "+(nu.length===1?"un apunte para aprobar":nu.length+" apuntes para aprobar"),
    p_texto:nu.slice(0,3).map(x=>x.txt).join(" · ").slice(0,280),p_url:"almacen.html?t=aprob"});}}));
function vAprob(v){v.appendChild(APR().pantalla());if(!window.__usuariosAlm)cargaUsuAlm();}
/* nombres de los usuarios (para decir quién aprueba) */
async function cargaUsuAlm(){window.__usuariosAlm={};try{const r=await window.sbColada.from("usuarios").select("user_id,nombre");const M={};(r.data||[]).forEach(u=>{M[u.user_id]=u.nombre;});window.__usuariosAlm=M;render(true);}catch(e){}}

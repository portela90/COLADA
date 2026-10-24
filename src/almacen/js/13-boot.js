/* ---------- boot ---------- */
draft.p.resp=lsGet("alm.resp");draft.p.dest=lsGet("alm.dp");window.addEventListener("colada-refresh",()=>render());
try{const t=localStorage.getItem((window.APP_ID||"almacen")+".tab");if(t&&esTab(t))tab=t;}catch(e){}
try{const q=new URLSearchParams(location.search).get("t");if(q&&esTab(q)){tab=q;history.replaceState(null,"",location.pathname);}}catch(e){}
tabsUI();render(true);
/* usuario de solo consulta: sus pantallas propias (13a-pantallas-solo-consulta.js) */
window.addEventListener("solo-consulta",modoConsulta);
(async()=>{
  try{db=await claude.use("db");}catch(e){db=null;}
  try{assets=await claude.use("assets");}catch(e){assets=null;}
  try{downloads=await claude.use("downloads");}catch(e){downloads=null;}
  if(!db){ready=true;render(true);return;}
  let got={cat:false,mov:false,pist:false,ejes:false,rep:false};const listo=k=>{got[k]=true;if(Object.values(got).every(Boolean))ready=true;render();};
  db.doc("cat/app").onSnapshot(sn=>{catOk=true;if(sn.exists){const c=sn.data();const cp=k=>(c[k]||[]).map(a=>Object.assign({},a));cat={articulos:cp("articulos"),almacenes:cp("almacenes"),maquinas:cp("maquinas"),proveedores:cp("proveedores"),operarios:cp("operarios"),modelos:cp("modelos"),ajustes:Object.assign({},c.ajustes||{}),dot:JSON.parse(JSON.stringify(c.dot||{}))};if(c.prev)cat.prev=Object.assign({},c.prev);if(c.ejePend)cat.ejePend=JSON.parse(JSON.stringify(c.ejePend));if(c.bajarOk)cat.bajarOk=JSON.parse(JSON.stringify(c.bajarOk));if(c.pedidosBT)cat.pedidosBT=JSON.parse(JSON.stringify(c.pedidosBT));if(c.informes)cat.informes=JSON.parse(JSON.stringify(c.informes));if(c.revEjes)cat.revEjes=Object.assign({},c.revEjes);if(c.ejeRecup)cat.ejeRecup=JSON.parse(JSON.stringify(c.ejeRecup));if(c.ejeStat)cat.ejeStat=JSON.parse(JSON.stringify(c.ejeStat));if(c.fichaIny)cat.fichaIny=JSON.parse(JSON.stringify(c.fichaIny));if(c.moldes)cat.moldes=cp("moldes");if(c.contens)cat.contens=cp("contens");if(c.bajarAj)cat.bajarAj=JSON.parse(JSON.stringify(c.bajarAj));if(c.consultas)cat.consultas=JSON.parse(JSON.stringify(c.consultas));if(c.pusados)cat.pusados=JSON.parse(JSON.stringify(c.pusados));;for(const k in c)if(!(k in cat))cat[k]=JSON.parse(JSON.stringify(c[k]));}listo("cat");},()=>{listo("cat");});
  db.collection("mov").onSnapshot(sn=>{const m={};sn.docs.forEach(d=>{m[d.id]=(d.data().items)||[];});meses=m;listo("mov");},()=>listo("mov"));
  db.collection("mlog").onSnapshot(sn=>{const m={};sn.docs.forEach(d=>{m[d.id]=(d.data().items)||[];});mlogAnos=m;if(ready)render();},()=>{});
  db.collection("pist").onSnapshot(sn=>{const m={};sn.docs.forEach(d=>{m[d.id]=(d.data().items)||[];});pistAnos=m;listo("pist");},()=>listo("pist"));
  db.collection("ejes").onSnapshot(sn=>{ejes=sn.docs.map(d=>Object.assign({id:d.id},d.data())).filter(e=>e.estado!=="baja");listo("ejes");},()=>listo("ejes"));
  db.doc("notas/pend").onSnapshot(sn=>{notas=sn.exists?((sn.data()||{}).items||[]):[];render();},()=>{});
  db.collection("rep").onSnapshot(sn=>{const m={};sn.docs.forEach(d=>{m[d.id]=(d.data().items)||[];});reps=m;listo("rep");},()=>listo("rep"));
})();
})();

/* ===== QUE TODO CUADRE: busca contradicciones en ejes y reparaciones y propone cómo arreglarlas =====
   Lo usa «Hoy» (y la campana): si algo no cuadra sale una tarea «… no cuadran» con la lista y un botón para arreglar cada cosa.
   Los artículos en negativo ya salen aparte (negativos()). */
const ABIERTOS_E=["reparacion","devuelto","revisar","preparado"];
const fRep=r=>r.env||r.alta||"";
function noCuadra(){const o=[],hy=hoy();const R=todasRep(),ab={};
  R.filter(r=>!r.res).forEach(r=>(ab[r.eje]=ab[r.eje]||[]).push(r));Object.values(ab).forEach(A=>A.sort((a,b)=>fRep(a).localeCompare(fRep(b))));
  const cods={};ejes.forEach(e=>(cods[e.cod]=cods[e.cod]||[]).push(e));
  Object.entries(cods).filter(([,l])=>l.length>1).forEach(([c,l])=>o.push({t:"El eje "+c+" está dado de alta "+l.length+" veces",
    d:"Abre cada uno y quita el que sobra (Editar).",btn:"Ver",fn:()=>fichaEje(l[l.length-1])}));
  ejes.forEach(e=>{const A=ab[e.cod]||[],env=A.filter(r=>r.env);
    if(A.length>1)o.push({t:"El eje "+e.cod+" tiene "+A.length+" reparaciones abiertas",
      d:A.map(r=>(r.env?"enviado el "+fmtF(r.env):"preparado el "+fmtF(r.alta))+(r.desp?" ("+r.desp+")":"")).join(" y ")+". Seguramente la primera volvió y no se apuntó.",
      btn:"Arreglar",fn:()=>arreglarReps(e,A.slice(0,-1),A[A.length-1])});
    else if(ABIERTOS_E.includes(e.estado)&&!A.length)o.push({t:"El eje "+e.cod+" está «"+(EST_E[e.estado]||[e.estado])[0]+"» sin reparación abierta",
      d:"No hay ningún envío al taller apuntado. Ponlo donde está de verdad.",btn:"Corregir",fn:()=>corregirEstado(e,()=>render(true))});
    if(e.estado==="planta"&&env.length)o.push({t:"El eje "+e.cod+" está en planta con una reparación sin cerrar",
      d:"Enviado el "+env.map(r=>fmtF(r.env)).join(" y el ")+" y no consta que volviera.",btn:"Arreglar",fn:()=>arreglarReps(e,env,null)});
    if(e.estado==="revisar"&&A.length){const r=A[A.length-1];if(r.lleg&&dias(r.lleg,hy)>7)o.push({t:"El eje "+e.cod+" lleva "+dias(r.lleg,hy)+" días por revisar",
      d:"Llegó del taller el "+fmtF(r.lleg)+". Mientras no lo revises no cuenta en planta.",btn:"Revisar",fn:revisarLlegados});}});
  const sin=[...new Set(R.filter(r=>!r.res&&!cods[r.eje]).map(r=>r.eje))];
  if(sin.length)o.push({t:sin.length===1?"Hay una reparación abierta de un eje que no existe ("+sin[0]+")":sin.length+" reparaciones abiertas de ejes que no existen",
    d:(sin.length>1?sin.join(", ")+". ":"")+"Puede que se cambiara el código del eje: da de alta el eje con ese código o avísame.",btn:null});
  return o;}
function dlgNoCuadra(){const L=noCuadra();if(!L.length){toast("Todo cuadra");return;}
  dlg("Cosas que no cuadran",[el("p",{class:"hint",text:"La app las busca sola cada día. Arregla cada una y desaparece de la lista."}),
    el("div",{class:"lst",id:"ncLista"},L.map(x=>el("div",{class:"it",style:"cursor:default;flex-wrap:wrap"},[el("div",{class:"ppal"},[el("div",{class:"t1",text:x.t}),el("div",{class:"t2",text:x.d})]),
      x.btn?el("button",{type:"button",class:"btn peq",text:x.btn,onclick:()=>{cerrarDlgs();x.fn();}}):null])))],[{t:"Cerrar",cls:"sec"}]);}
/* cerrar reparaciones que se quedaron abiertas: volvió reparada (OK, con fecha) o no llegó a ir (anulada) */
function arreglarReps(e,viejas,queda){const st=viejas.map((r,i)=>{const sig=viejas[i+1]||queda;return{r,res:"ok",f:sig?(sig.alta||sig.env):(e.estado==="planta"?hoy():hoy())};});
  const box=el("div",{style:"display:grid;gap:10px"});
  const pinta=()=>{box.textContent="";
    if(queda)box.appendChild(el("p",{class:"hint",style:"margin:0",text:"Sigue abierta la del "+fmtF(fRep(queda))+(queda.desp?" ("+queda.desp+")":"")+", que es la última. Di qué pasó con "+(st.length===1?"la anterior":"las anteriores")+":"}));
    else box.appendChild(el("p",{class:"hint",style:"margin:0",text:"El eje está en planta, así que volvió. Di cómo se cierra:"}));
    st.forEach((x,i)=>box.appendChild(el("div",{class:"card",style:"padding:10px 12px;display:grid;gap:6px"},[el("b",{text:(x.r.env?"Enviado el "+fmtF(x.r.env):"Preparado el "+fmtF(x.r.alta))+(x.r.desp?" · "+x.r.desp:"")}),
      el("div",{class:"seg",role:"group","aria-label":"Qué pasó"},[["ok","Volvió reparado"],["anulada","No llegó a ir / anular"]].map(([k,t])=>el("button",{type:"button","data-i":i,"data-r":k,"aria-pressed":String(x.res===k),text:t,onclick:()=>{x.res=k;pinta();}}))),
      x.res==="ok"?fld("Cuándo volvió (aprox.)",inp("arF"+i,x.f,v=>x.f=v,{type:"date"})):null])));};
  pinta();
  dlg("Reparaciones de "+e.cod,[box],[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{
    try{await updReps(st.map(x=>[x.r,x.res==="ok"?{res:"ok",rec:x.f,obs:"Cerrada al revisar: no se apuntó la vuelta"}:{res:"anulada",obs:"Anulada al revisar: no llegó a ir al taller"}]));}catch(er){toast("No se pudo guardar");return false;}
    toast("Reparaciones de "+e.cod+" arregladas");render(true);}}]);}

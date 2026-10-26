/* ---------- pintar ---------- */
const TABS_ADMIN=[["hoy","Día"],["semana","Semana"],["tareas","Tareas"],["equipo","Equipo"],["avisos","Avisos"],["resumen","Resumen"]];
const ICL={hoy:'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',semana:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',tareas:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',equipo:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2c2.8.3 5 2.6 5 5.8"/>',avisos:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',resumen:'<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',mas:'<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',toolbox:'<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',encargado:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',calendario:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3"/>'};
const svgI=k=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICL[k]||"")+'</svg>';
function pinta(){const v=$("v");v.textContent="";const nav=$("nav");
  if(!S.tok||!S.yo){$("who").textContent="";$("bsalir").hidden=true;nav.hidden=true;vEntrar(v);return;}
  $("who").textContent=S.yo.nombre.split(" ")[0]+(S.verOp?" (prueba: operario)":"");$("bsalir").hidden=false;
  {const h=document.querySelector("header h1");const tt=esAdm()?((TABS_ADMIN.find(x=>x[0]===S.tab)||[])[1]||"Limpieza"):"Limpieza";if(h)h.textContent=tt;}
  if(S.yo.rol==="admin"){let bp=$("bprueba");if(!bp){bp=el("button",{id:"bprueba",class:"sec",type:"button"});$("bsalir").parentNode.insertBefore(bp,$("bsalir"));}
    bp.hidden=!S.verOp&&window.innerWidth<760;bp.textContent=S.verOp?"↩ Volver a jefe":"Probar como operario";bp.onclick=()=>{S.verOp=!S.verOp;S.tab="hoy";pinta();window.scrollTo(0,0);};}
  else{const bp=$("bprueba");if(bp)bp.hidden=true;}
  if(esAdm()){nav.hidden=false;nav.textContent="";
    /* barra de abajo: en el móvil solo 4 pestañas + «Más»; en pantallas anchas, todas */
    const ir=k=>()=>{S.tab=k;pinta();window.scrollTo(0,0);},pag=u=>()=>{location.href=u+"?v="+Date.now();};
    const T={hoy:["hoy","Día"],semana:["semana","Semana"],tareas:["tareas","Tareas"],equipo:["equipo","Equipo"],avisos:["avisos","Avisos"],resumen:["resumen","Resumen"]};
    const EXT=[["toolbox","Toolbox","toolbox.html"],["encargado","Encargado","encargado.html"],["calendario","Calendario","calendario.html"]];
    const bot=(ic,t,sel,fn)=>{const i=el("span",{class:"ic"});i.innerHTML=svgI(ic);return el("button",{"aria-selected":String(!!sel),onclick:fn},[i,el("span",{text:t})]);};
    const ancho=window.innerWidth>=760,prin=ancho?Object.keys(T):["hoy","semana","tareas","equipo"];
    prin.forEach(k=>nav.appendChild(bot(T[k][0],T[k][1],S.tab===k,ir(k))));
    if(ancho){EXT.forEach(([ic,t,u])=>nav.appendChild(bot(ic,t,false,pag(u))));nav.appendChild(bot("avisos","Errores",false,verErrores));}
    else{const resto=Object.keys(T).filter(k=>!prin.includes(k));
      nav.appendChild(bot("mas","Más",resto.includes(S.tab),()=>{let cerrar=()=>{};
        const fila=(ic,t,sub,fn)=>el("button",{type:"button",class:"btn sec",style:"display:flex;gap:12px;align-items:center;width:100%;text-align:left;margin:0 0 8px",onclick:()=>{cerrar();fn();}},[ic?el("span",{style:"font-size:24px",text:ic}):null,el("span",{style:"flex:1"},[el("b",{text:t}),sub?el("small",{style:"display:block;font-weight:400;color:var(--mut)",text:sub}):null])]);
        const EM={avisos:"",resumen:""};cerrar=dlg("Más secciones",el("div",null,[...resto.map(k=>fila(EM[k]||"",T[k][1],null,ir(k))),
          fila("","Toolbox y prevención","Toolbox, formación, EPIs y fichas",pag("toolbox.html")),
          fila("","Encargado","Instrucciones, checklist e incidencias",pag("encargado.html")),
          fila("","Calendario laboral","Festivos, vacaciones y firmas",pag("calendario.html")),
          fila("","Errores de la app","Lo que ha fallado en los móviles de cualquiera",verErrores),
          fila("","Probar como operario","Ver la app como la ve un trabajador",()=>{S.verOp=true;S.tab="hoy";pinta();window.scrollTo(0,0);})]),[{t:"Cerrar",cls:"sec"}]);}));}}
  else{nav.hidden=true;S.tab="hoy";}
  if(S.tab==="hoy"&&esSencillo())return vSencillo(v);
  ({hoy:vHoy,semana:vSemana,tareas:vTareas,equipo:vEquipo,avisos:vAvisos,resumen:vResumen})[S.tab](v);}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&S.tok&&S.tab==="hoy"&&!document.querySelector(".ov")){if(S.fecha<hoyISO())S.fecha=hoyISO();pinta();}});
try{const c=new URLSearchParams(location.search).get("el");if(c){S.elPend=c;history.replaceState(null,"",location.pathname);}}catch(e){}
try{const c=new URLSearchParams(location.search).get("pet");if(c){S.petPend=c;history.replaceState(null,"",location.pathname);}}catch(e){}
/* Toolbox HSE: si el operario tiene uno pendiente de firmar, sale un aviso arriba que lleva a toolbox.html */
let _tbN=0;const _pintaTb=pinta;pinta=function(){_pintaTb();const n=++_tbN;
  if(!S.tok||!S.yo||esAdm()||S.tab!=="hoy")return;
  rpc("prl_pendientes",{p_tok:S.tok}).then(L=>{if(n!==_tbN||!Array.isArray(L)||!L.length)return;const p=L[0];
    const MS=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    const esF=p.tipo==="formacion",esD=p.tipo==="doc",DN={epi:"Entrega de EPI",epi_col:"Entrega de EPI",info:"Entrega de información"};
    const tit=esD?(DN[p.doc]||"Documento")+" para firmar":esF?"Formación en el puesto para firmar":"Toolbox de "+MS[p.mes-1]+" para firmar";
    const b=el("a",{href:esD?"toolbox.html?d="+p.id:esF?"toolbox.html?f="+p.id:"toolbox.html?a="+p.anio+"&m="+p.mes,style:"display:flex;gap:12px;align-items:center;text-decoration:none;color:#fff;background:var(--acc);border-radius:var(--r);padding:14px 16px;margin:0 0 12px;box-shadow:0 2px 8px rgba(0,0,0,.15)"},
      [el("span",{style:"font-size:30px;line-height:1",text:""}),el("span",{style:"flex:1"},[el("b",{style:"display:block;font-size:17px",text:tit}),el("span",{style:"font-size:14px;opacity:.9",text:L.length>1?"Tienes "+L.length+" documentos pendientes. Toca para leer y firmar.":"Toca para leerlo y firmar."})]),el("span",{style:"font-size:26px",text:"›"})]);
    const v=$("v");if(v)v.prepend(b);}).catch(()=>{});};
/* Encargado: aviso de instrucciones sin leer. Jefe: incidencias abiertas */
let _enN=0;const _pintaEn=pinta;pinta=function(){_pintaEn();const n=++_enN;
  if(!S.tok||!S.yo||S.tab!=="hoy"||!(esGes()))return;
  rpc("enc_resumen",{p_tok:S.tok}).then(R=>{if(n!==_enN||!R||R.rol==="no")return;let tit=null,sub="";
    if(R.rol==="encargado"&&R.traspasos_sin_leer>0){tit=R.traspasos_sin_leer>1?"Tienes "+R.traspasos_sin_leer+" instrucciones nuevas":"Tienes instrucciones nuevas de Cristian";sub="Toca para leerlas.";}
    else if(R.rol==="admin"&&R.inc_abiertas>0){tit=R.inc_abiertas+(R.inc_abiertas>1?" incidencias abiertas":" incidencia abierta")+(R.inc_urgentes?" ("+R.inc_urgentes+" urgente"+(R.inc_urgentes>1?"s":"")+")":"");sub="Toca para verlas.";}
    if(!tit)return;
    const b=el("a",{href:"encargado.html?v="+Date.now(),style:"display:flex;gap:12px;align-items:center;text-decoration:none;color:#fff;background:"+(R.inc_urgentes&&R.rol==="admin"?"#C0392B":"#16212C")+";border-radius:var(--r);padding:12px 16px;margin:0 0 12px"},
      [el("span",{style:"font-size:26px;line-height:1",text:R.rol==="admin"?"":""}),el("span",{style:"flex:1"},[el("b",{style:"display:block;font-size:16px",text:tit}),el("span",{style:"font-size:14px;opacity:.9",text:sub})]),el("span",{style:"font-size:24px",text:"›"})]);
    const v=$("v");if(v)v.prepend(b);}).catch(()=>{});};
/* Calendario laboral pendiente de firmar (trabajadores) */
let _caN=0;const _pintaCa=pinta;pinta=function(){_pintaCa();const n=++_caN;
  if(!S.tok||!S.yo||esAdm()||S.tab!=="hoy")return;
  rpc("cal_pendientes",{p_tok:S.tok}).then(L=>{if(n!==_caN||!Array.isArray(L)||!L.length)return;const p=L[0];
    const b=el("a",{href:"calendario.html?f="+p.id,style:"display:flex;gap:12px;align-items:center;text-decoration:none;color:#fff;background:#6A3FA0;border-radius:var(--r);padding:14px 16px;margin:0 0 12px;box-shadow:0 2px 8px rgba(0,0,0,.15)"},
      [el("span",{style:"font-size:30px;line-height:1",text:""}),el("span",{style:"flex:1"},[el("b",{style:"display:block;font-size:17px",text:"Calendario laboral "+p.anio+" para firmar"}),el("span",{style:"font-size:14px;opacity:.9",text:"Toca para verlo y firmar que lo has recibido."})]),el("span",{style:"font-size:26px",text:"›"})]);
    const v=$("v");if(v)v.prepend(b);}).catch(()=>{});};
/* Problemas que se repiten (aceite, taladrina, agua, roturas en el mismo sitio): recuadro rojo arriba para el jefe y el encargado, hasta que se solucionen */
try{const c=new URLSearchParams(location.search).get("prob");if(c){S.probPend=c;history.replaceState(null,"",location.pathname);}}catch(e){}
const EST_P={pendiente:["Pendiente de actuar","bad"],en_marcha:["En marcha","warn"],solucionado:["Solucionado","ok"],descartado:["Descartado","info"],quitado:["Aviso quitado","info"]};
function fichaProblema(p,re){const nota={v:""};
  const ult=(p.historial||[]).filter(h=>h.nota).slice(-1)[0];
  const cuerpo=el("div",null,[
    el("div",{style:"display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px"},[el("span",{class:"pill "+EST_P[p.estado][1],text:p.reabierto&&p.estado==="pendiente"?"Ha vuelto a pasar":EST_P[p.estado][0]}),
      el("span",{class:"hint",style:"margin:0",text:p.veces+" veces"+(p.veces7!==p.veces?" ("+p.veces7+" en los últimos 7 días)":"")+" · desde el "+fCorta(p.primera)})]),
    el("b",{style:"display:block;margin:10px 0 4px",text:"Avisos de los trabajadores"}),
    el("div",{style:"max-height:46vh;overflow:auto;border:1px solid var(--line);border-radius:8px"},(p.ots||[]).map(o=>{const fb=el("div",{class:"fotos",style:"margin-top:6px"});
      if(o.nfotos){fb.appendChild(el("span",{class:"hint",style:"margin:0",text:"Cargando "+o.nfotos+" foto"+(o.nfotos>1?"s":"")+"…"}));
        rpc("fotos_ot",{p_tok:S.tok,p_ot:o.id}).then(L=>{fb.textContent="";L.forEach(x=>fb.appendChild(miniFoto(x,fCorta(o.fecha)+" · "+o.titulo+(x.por?" · "+x.por:""))));}).catch(e=>{fb.textContent=e.message;});}
      return el("div",{class:"ot",style:"padding:8px 10px"},[
      el("div",{class:"t",text:fCorta(o.fecha)+" · "+o.titulo}),o.descripcion?el("div",{class:"d",text:o.descripcion}):null,
      el("div",{class:"meta"},[el("span",{text:o.lugar||""}),o.creado_por_n?el("span",{text:"Avisó "+o.creado_por_n.split(" ")[0]}):null,el("span",{text:({hecha:"Limpiado",pendiente:"Sin limpiar",en_curso:"Limpiando",no_hecha:"No se pudo"})[o.estado]||o.estado}),o.nfotos?null:el("span",{text:"Sin fotos"})]),
      fb,
      p.estado!=="descartado"?el("button",{type:"button",class:"btn sec peq",style:"margin-top:6px;width:auto;min-height:32px;padding:4px 12px;font-size:13px",text:"No es lo mismo",onclick:()=>quitarDeProblema(p,o,re)}):null]);})),
    (p.historial||[]).length?el("b",{style:"display:block;margin:12px 0 4px",text:"Seguimiento"}):null,
    el("div",null,(p.historial||[]).slice().reverse().map(h=>el("div",{class:"hint",style:"margin:0 0 4px"},[el("b",{text:fCorta(String(h.f).slice(0,10))+" · "+(EST_P[h.estado]||[h.estado])[0]+(h.quien?" ("+h.quien.split(" ")[0]+")":"")+": "}),h.nota||""]))),
    fld(p.estado==="en_marcha"?"¿Qué se ha hecho? (para marcarlo como solucionado)":"¿Qué se va a hacer o qué se ha hecho?",area("",v=>nota.v=v)),
    el("p",{class:"hint",style:"margin:4px 0 0",text:"Por ejemplo: «Avisado a mantenimiento para cambiar la manguera de la F19» o «Cambiado el retén, ya no pierde»."})]);
  const guarda=est=>async()=>{if(!nota.v.trim()){toast("Escribe qué se ha hecho o qué se va a hacer");return false;}
    await rpc("problema_estado",{p_tok:S.tok,p_id:p.id,p_estado:est,p_nota:nota.v.trim()});toast(est==="solucionado"?"Marcado como solucionado":"Marcado en marcha");re&&re();};
  const bots=[{t:"Cerrar",cls:"sec"}];
  if(p.estado!=="en_marcha"&&p.estado!=="solucionado")bots.push({t:"En marcha",cls:"sec",fn:guarda("en_marcha")});
  if(p.estado!=="solucionado"&&p.estado!=="descartado")bots.push({t:"Solucionado",fn:guarda("solucionado")});
  if(p.estado==="descartado"||p.estado==="solucionado")bots.push({t:"Reabrir",cls:"sec",fn:async()=>{await rpc("problema_estado",{p_tok:S.tok,p_id:p.id,p_estado:"pendiente",p_nota:nota.v.trim()||"Reabierto"});toast("Reabierto");re&&re();}});
  const cerrar=dlg("⚠ "+p.tema+" en "+p.lugar,cuerpo,bots);
  if(p.estado!=="descartado"&&p.estado!=="solucionado")cuerpo.appendChild(el("button",{type:"button",class:"btn sec peq",style:"margin-top:10px;width:100%;color:var(--mut)",text:"Descartar: no es un problema que se repita",
    onclick:async()=>{if(!nota.v.trim()){toast("Escribe arriba por qué se descarta");return;}try{await rpc("problema_estado",{p_tok:S.tok,p_id:p.id,p_estado:"descartado",p_nota:nota.v.trim()});toast("Descartado");cerrar();re&&re();}catch(e){toast(e.message);}}}));}
/* «No es lo mismo»: se quita ese aviso del problema (con el motivo) */
function quitarDeProblema(p,o,re){const m={v:""};
  dlg("Quitar este aviso",el("div",null,[el("p",{style:"margin:0 0 8px",text:fCorta(o.fecha)+" · "+o.titulo+(o.descripcion?" — "+o.descripcion:"")}),
    fld("¿Por qué no es el mismo problema?",area("",v=>m.v=v)),el("p",{class:"hint",style:"margin:4px 0 0",text:"Por ejemplo: «Es aceite de la carretilla, no de la máquina». Si solo queda un aviso, el problema se descarta solo."})]),
    [{t:"Cancelar",cls:"sec"},{t:"Quitar",fn:async()=>{if(!m.v.trim()){toast("Escribe el motivo");return false;}
      await rpc("problema_quitar_ot",{p_tok:S.tok,p_id:p.id,p_ot:o.id,p_nota:m.v.trim()});toast("Aviso quitado");document.querySelectorAll(".ov").forEach(x=>x.remove());re&&re();}}]);}
let _prN=0;const _pintaPr=pinta;pinta=function(){_pintaPr();const n=++_prN;
  if(!S.tok||!S.yo||!esGes()||(S.tab!=="hoy"&&!S.probPend))return;
  rpc("problemas_lista",{p_tok:S.tok}).then(L=>{if(n!==_prN||!Array.isArray(L))return;
    if(S.probPend){const c=S.probPend;S.probPend=null;const x=L.find(y=>y.id===c);if(x)setTimeout(()=>fichaProblema(x,()=>pinta()),300);}
    if(!L.length||S.tab!=="hoy")return;
    const caja=el("div",{class:"card prob-rep",style:"border:2px solid var(--bad);margin:0 0 12px;overflow:hidden"},[
      el("div",{style:"background:var(--bad);color:#fff;padding:10px 14px;display:flex;gap:10px;align-items:center"},[el("span",{style:"font-size:22px;line-height:1",text:"⚠"}),
        el("span",{style:"flex:1"},[el("b",{style:"display:block;font-size:16px",text:"Problemas que se repiten ("+L.length+")"}),el("span",{style:"font-size:13px;opacity:.95",text:"Hay que actuar: toca cada uno para ver los avisos y apuntar qué se hace."})])]),
      ...L.map(p=>el("button",{class:"ot",style:"cursor:pointer;text-align:left;width:100%;border:0;border-bottom:1px solid var(--line);background:none;padding:10px 14px",onclick:()=>fichaProblema(p,()=>pinta())},[
        el("div",{style:"display:flex;gap:8px;align-items:center"},[el("span",{class:"t",style:"flex:1;font-size:16px",text:p.tema+" en "+p.lugar}),
          el("span",{class:"pill "+EST_P[p.estado][1],text:p.reabierto&&p.estado==="pendiente"?"Ha vuelto a pasar":EST_P[p.estado][0]})]),
        el("div",{class:"meta"},[el("span",{text:p.veces7+" veces en 7 días"+(p.veces>p.veces7?" ("+p.veces+" en total)":"")}),el("span",{text:"Última: "+fCorta(p.ultima)}),
          p.estado==="en_marcha"?el("span",{text:((p.historial||[]).filter(h=>h.estado==="en_marcha").slice(-1)[0]||{}).nota||""}):null])]))]);
    const v=$("v");if(v)v.prepend(caja);}).catch(()=>{});};
const _pinta0=pinta;pinta=function(){_pinta0();if(S.petPend&&S.tok&&S.yo){const c=S.petPend;S.petPend=null;if(esAdm())rpc("extra_ver",{p_tok:S.tok,p_id:c}).then(p=>{if(p.estado==="pendiente")setTimeout(()=>dlg("Pide quedarse",el("div",null,filaPet(p,()=>pinta())),[{t:"Cerrar",cls:"sec"}]),300);}).catch(()=>{});}if(S.elPend&&S.tok&&S.yo){const c=S.elPend;S.elPend=null;setTimeout(()=>c==="vaciados"?listaElementos(()=>pinta(),"vaciados"):fichaElemento(c),300);}};
pinta();if(S.tok)pushSync();else regSW();
/* si la app se cerró con una OT a medias (por la foto), se reabre con lo escrito */
if(S.tok&&S.yo){const bo=borradorOT();if(bo)setTimeout(()=>{if(!document.querySelector(".ov"))abrirOT(()=>pinta(),bo);},600);}
if(S.tok&&S.yo)rpc("yo",{p_tok:S.tok}).then(y=>{if(!y||!y.id)return;const antes=!!S.yo.encargado;S.yo=Object.assign({},S.yo,{encargado:!!y.encargado});ls.set("limp.yo",JSON.stringify(S.yo));if(antes!==!!y.encargado)pinta();}).catch(()=>{});
})();

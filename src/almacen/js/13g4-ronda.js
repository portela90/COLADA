/* ===== RONDA DE CONSUMOS (25/11/2026) =====
   La vuelta de cada mañana, paso a paso y en el orden en que se anda (Cristian):
   contadores de la Nave 1 → pistones de la Nave 1 → aluminio de la Nave 1 (Coladas) → glicol de la Nave 1 →
   contadores de la Nave 2 → sacos de granalla → glicol de la Nave 2 → pistones del almacén de la Nave 2 →
   aluminio de la Nave 2 (Coladas) → agua.
   · Cada contador se guarda solo al escribirlo (al salir de la casilla): no hace falta rellenar la nave entera, y se puede
     salir a apuntar otra cosa y volver sin perder nada. Se guarda en la lectura del día de esa nave (colección «cont»).
   · Lo hecho se sabe por los datos (lecturas de hoy, consumo de granalla de hoy, recuento de aluminio de hoy en Coladas)
     o por la marca «✓ Revisado / Ninguno», que se guarda en la colección «ronda» (un documento por año,
     items {id,f,paso,por,ts}). Las marcas también dicen «desde la última vez que miraste» en los pasos de pistones.
   · El orden se puede cambiar (cat.rondaOrden: lista de ids de paso). */
const RONDA=[
  {id:"c1",t:"cont",nave:"Nave 1",ks:["e220","ter","pre","i46"],tit:"Contadores de la Nave 1",sub:"Engrase, Térmico, Prensa e ISO 46"},
  {id:"p1",t:"pist",nv:"N1",tit:"Pistones de la Nave 1",sub:"¿Se ha cambiado alguno desde la última vez?"},
  {id:"a1",t:"alu",nave:"Nave 1",tit:"Aluminio de la Nave 1",sub:"Consumo y recuento (en Coladas)"},
  {id:"g1",t:"cont",nave:"Nave 1",ks:["gli"],tit:"Glicol de la Nave 1",sub:"Contador general de glicol"},
  {id:"c2",t:"cont",nave:"Nave 2",ks:["e220","ter","pre","i46"],tit:"Contadores de la Nave 2",sub:"Engrase, Térmico, Prensa e ISO 46"},
  {id:"gr",t:"gran",nave:"Nave 2",tit:"Sacos de granalla",sub:"Granalla de acero, sacos de 25 kg"},
  {id:"g2",t:"cont",nave:"Nave 2",ks:["gli"],tit:"Glicol de la Nave 2",sub:"Contador general de glicol"},
  {id:"p2",t:"pist",nv:"N2",tit:"Pistones del almacén de la Nave 2",sub:"¿Se ha gastado alguno desde la última vez?"},
  {id:"a2",t:"alu",nave:"Nave 2",tit:"Aluminio de la Nave 2",sub:"Consumo y recuento (en Coladas)"},
  {id:"ag",t:"agua",tit:"Contador del agua",sub:"Al terminar la ronda"}];
const SACO_KG=25;
/* pasos en el orden elegido (sin los de Coladas si la persona no entra en Coladas) */
function rondaPasos(){const ord=(cat.rondaOrden||[]).filter(id=>RONDA.some(p=>p.id===id));const L=ord.map(id=>RONDA.find(p=>p.id===id)).concat(RONDA.filter(p=>!ord.includes(p.id)));
  return L.filter(p=>p.t!=="alu"||!window.SIN_COLADAS);}
/* ---------- marcas (colección «ronda») ---------- */
let rondaAnos=null;
function rondaMarcas(){if(rondaAnos===null){rondaAnos={};try{db.collection("ronda").onSnapshot(sn=>{const m={};sn.docs.forEach(d=>{m[d.id]=(d.data().items)||[];});rondaAnos=m;render();},()=>{});}catch(e){}}
  const o=[];Object.keys(rondaAnos).forEach(y=>(rondaAnos[y]||[]).forEach(x=>o.push(x)));return o.sort((a,b)=>(a.ts||0)-(b.ts||0));}
async function rondaMarca(paso,extra){const it=Object.assign({id:uid(),f:hoy(),paso,ts:Date.now()},extra||{});const y=it.f.slice(0,4);
  rondaAnos=rondaAnos||{};rondaAnos[y]=(rondaAnos[y]||[]).concat([it]);/* se ve ya, sin esperar a la base */
  if(db.itemsAdd){await db.itemsAdd("ronda",y,[it]);return;}const ref=db.doc("ronda/"+y),sn=await ref.get();await ref.set({items:(sn.exists?(sn.data().items||[]):[]).concat([it])});}
const marcaHoy=id=>rondaMarcas().filter(x=>x.paso===id&&x.f===hoy()).pop()||null;
const marcaAntes=id=>rondaMarcas().filter(x=>x.paso===id&&x.f<hoy()).pop()||null;
/* ---------- contadores: cada uno se guarda solo ---------- */
const RLECT={};/* última lectura guardada desde la ronda (por nave y día): la base tarda un momento en devolverla */
function lectHoyDe(nave){const h=hoy(),db0=todasLect().filter(r=>r.nave===nave&&r.f===h).pop()||null,loc=RLECT[nave+"|"+h]||null;
  return loc&&(!db0||(loc.ts||0)>=(db0.ts||0))?loc:db0;}
let _rCola=Promise.resolve();
function guardaUnCont(nave,k,x){const run=async()=>{const esta=lectHoyDe(nave);const rec={f:hoy(),nave,c:Object.assign({},esta?esta.c:{},{[k]:x})};if(esta&&esta.grg)rec.grg=esta.grg;
    await guardaLect(rec,esta);RLECT[nave+"|"+rec.f]=Object.assign({y:rec.f.slice(0,4)},rec);};
  _rCola=_rCola.then(run,run);return _rCola;}
async function guardaAgua(x){const h=hoy(),esta=lectHoyDe(AGUA);const rec={f:h,nave:AGUA,c:{agua:x}};await guardaLect(rec,esta);RLECT[AGUA+"|"+h]=Object.assign({y:h.slice(0,4)},rec);}
/* ---------- cuándo está hecho cada paso ---------- */
function alumHoy(nave){const a=window._rondaAlu||{};const x=a[nave];return x&&x.ts&&new Date(x.ts).toDateString()===new Date().toDateString()?x:null;}
/* recuento de aluminio de hoy en Coladas (si la persona entra en Coladas): se lee una vez por minuto como mucho */
let _rAluT=0;function rondaLeeAlu(){if(window.SIN_COLADAS||!window.sbColada||Date.now()-_rAluT<60000)return;_rAluT=Date.now();
  Promise.resolve(window.sbColada.from("docs").select("rd:data->rdiarioN").eq("col","cfg").eq("id","app").maybeSingle()).then(r=>{if(r&&r.data&&r.data.rd){window._rondaAlu=r.data.rd;if(tab==="ronda")render();}}).catch(()=>{});}
const granArt=()=>artsActivos().find(a=>/granalla/i.test(a.desc||"")&&!/cobre/i.test(a.desc||""));
const almNave=n=>(cat.almacenes||[]).find(l=>l.id==="n"+n.replace(/\D/g,""))||(cat.almacenes||[]).find(l=>new RegExp("nave\\s*"+n.replace(/\D/g,"")+"\\b","i").test(l.nom||""))||null;
/* granalla apuntada hoy: lo que tiene fecha de hoy o lo que se ha apuntado hoy aunque sea del relevo de ayer (25/11/2026) */
const apuntadoHoy=m=>m.f===hoy()||(+m.ts>0&&new Date(+m.ts).toDateString()===new Date().toDateString());
function granHoy(nave){const a=granArt();if(!a)return[];const l=almNave(nave);return todosMov().filter(m=>m.tipo==="salida"&&m.art===a.id&&apuntadoHoy(m)&&(!l||m.alm===l.id||m.nave===nave));}
function pasoHecho(p){if(p.t==="cont"){const r=lectHoyDe(p.nave);return !!(r&&p.ks.every(k=>typeof r.c[k]==="number"));}
  if(p.t==="agua"){const r=lectHoyDe(AGUA);return !!(r&&typeof r.c.agua==="number");}
  if(p.t==="alu")return !!(marcaHoy(p.id)||alumHoy(p.nave));
  if(p.t==="gran")return !!(marcaHoy(p.id)||granHoy(p.nave).length);
  return !!marcaHoy(p.id);}
function rondaEstado(){const P=rondaPasos();const h=P.filter(pasoHecho);return{P,n:h.length,tot:P.length,sig:P.find(p=>!pasoHecho(p))||null};}
/* ---------- un paso ---------- */
function cuerpoCont(p){const box=el("div",{style:"display:grid;gap:10px"});const L=lectDe(p.nave),ant=L.filter(r=>r.f<hoy()).pop();
  p.ks.forEach(k=>{const nom=nomCont(k),pv=ant&&typeof ant.c[k]==="number"?ant.c[k]:null,hecho=lectHoyDe(p.nave);const ya=hecho&&typeof hecho.c[k]==="number"?hecho.c[k]:null;
    const out=el("div",{class:"sub",style:"min-height:18px"});const st={v:ya!=null?String(ya).replace(".",","):"",ok:ya,av:null};
    const cuenta=x=>{if(pv==null)return"";const d=Math.round((x-pv)*10)/10,lab=Math.max(1,laborables(ant.f,hoy()));return"= "+fmtL(d)+(lab>1?" en "+lab+" días":"");};
    const pinta=()=>{out.textContent="";out.className="sub";
      if(st.av){out.className="sub neg";out.appendChild(el("div",{text:st.av}));out.appendChild(el("button",{type:"button",class:"btn sec peq",style:"margin-top:4px",text:"Está bien, guardar",onclick:()=>guarda(true)}));return;}
      if(st.ok!=null){out.className="sub ok";out.textContent="✓ Guardado "+fmtN(st.ok)+" "+cuenta(st.ok);return;}
      const x=parseN(st.v);if(st.v!==""&&isFinite(x))out.textContent=cuenta(x);};
    const guarda=async forzar=>{const s=String(st.v).trim();if(!s){return;}const x=parseN(s);if(!isFinite(x)||x<0){st.av="Lectura no válida";pinta();return;}if(st.ok===x&&!forzar)return;
      if(!forzar){const AV=avisosLect(p.nave,hoy(),{[k]:x});if(AV.length){st.av=AV[0].replace(/^[^:]+: /,"");pinta();return;}}
      st.av=null;out.textContent="Guardando…";try{await guardaUnCont(p.nave,k,x);st.ok=x;toast(nom+" de la "+p.nave+" guardado");}catch(e){out.textContent="No se pudo guardar";out.className="sub neg";return;}pinta();
      /* se vuelve a pintar la pantalla solo al terminar el paso: así no se pierde la casilla en la que ya estás escribiendo */
      if(pasoHecho(p)){_rAbierto=null;rondaRepinta();}};
    const i=inp("rc"+p.id+k,st.v,v=>{st.v=v;st.av=null;if(st.ok!=null&&parseN(v)!==st.ok)st.ok=null;pinta();},{inputmode:"decimal",class:"num",autocomplete:"off",enterkeyhint:"next",placeholder:pv!=null?fmtN(pv):"lectura"});
    i.addEventListener("change",()=>guarda(false));i.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();i.blur();}});
    const fb=typeof botonFotoCont==="function"?botonFotoCont(k==="gli"?"glicol":"aceite",pv,v=>{st.v=String(v).replace(".",",");i.value=st.v;i.classList.add("leido");guarda(false);},()=>({cont:k,nave:p.nave})):null;
    box.appendChild(fld(nom+(pv!=null?" · antes "+fmtN(pv):""),el("div",{style:"display:grid;gap:2px"},[fb?el("div",{class:"con-foto"},[i,fb]):i,out])));pinta();});
  box.appendChild(el("p",{class:"hint",style:"margin:0",text:"Cada contador se guarda solo al pasar al siguiente. Los GRG se apuntan en «Apuntar lecturas» de Aceites."}));
  return box;}
function cuerpoAgua(p){const L=lectDe(AGUA),ant=L.filter(r=>r.f<hoy()).pop(),pv=ant&&typeof ant.c.agua==="number"?ant.c.agua:null,ya=lectHoyDe(AGUA);
  const st={v:ya&&typeof ya.c.agua==="number"?String(ya.c.agua).replace(".",","):"",ok:ya&&typeof ya.c.agua==="number"?ya.c.agua:null,av:null};const out=el("div",{class:"sub",style:"min-height:18px"});
  const pinta=()=>{out.textContent="";out.className="sub";if(st.av){out.className="sub neg";out.appendChild(el("div",{text:st.av}));out.appendChild(el("button",{type:"button",class:"btn sec peq",style:"margin-top:4px",text:"Está bien, guardar",onclick:()=>guarda(true)}));return;}
    if(st.ok!=null){out.className="sub ok";out.textContent="✓ Guardado "+fmtN(st.ok)+" m³"+(pv!=null?" = "+fmtM3(st.ok-pv):"");}};
  const guarda=async forzar=>{const x=parseN(String(st.v).trim());if(!String(st.v).trim())return;if(!isFinite(x)||x<0){st.av="Lectura no válida";pinta();return;}if(st.ok===x&&!forzar)return;
    if(!forzar){const a=avisoAgua(hoy(),x);if(a){st.av=a;pinta();return;}}st.av=null;try{await guardaAgua(x);st.ok=x;toast("Agua guardada");}catch(e){out.textContent="No se pudo guardar";out.className="sub neg";return;}pinta();rondaRepinta();};
  const i=inp("rcAgua",st.v,v=>{st.v=v;st.av=null;if(st.ok!=null&&parseN(v)!==st.ok)st.ok=null;pinta();},{inputmode:"decimal",class:"num",autocomplete:"off",placeholder:pv!=null?fmtN(pv):"m³"});
  i.addEventListener("change",()=>guarda(false));i.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();i.blur();}});
  const fb=typeof botonFotoCont==="function"?botonFotoCont("agua",pv,v=>{st.v=String(v).replace(".",",");i.value=st.v;guarda(false);},()=>({cont:"agua",nave:AGUA})):null;
  pinta();return el("div",{style:"display:grid;gap:6px"},[fld("Agua (m³)"+(pv!=null?" · antes "+fmtN(pv):""),el("div",{style:"display:grid;gap:2px"},[fb?el("div",{class:"con-foto"},[i,fb]):i,out]))]);}
function cuerpoPist(p){const ult=marcaAntes(p.id)||null,mh=marcaHoy(p.id);const desde=ult?ult.ts:0;
  const L=todosPist().filter(x=>puNave(x)===p.nv&&((+x.ts||0)>desde||(!x.ts&&ult&&x.f>ult.f))).slice(-30).reverse();
  return el("div",{style:"display:grid;gap:8px"},[el("p",{class:"hint",style:"margin:0",text:ult?"La última vez que miraste fue el "+fmtF(ult.f)+(ult.por?" ("+ult.por+")":"")+". Cambios apuntados desde entonces:":"Primera vez: estos son los últimos cambios apuntados."}),
    L.length?el("div",{class:"lst"},L.map(x=>el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},[el("div",{class:"t1",text:"Pistón "+(x.diam||"")+" · "+maqN(x.maq)}),el("div",{class:"t2",text:fmtF(x.f)+(x.motivo?" · "+String(x.motivo).toLowerCase():"")+(x.por?" · "+x.por:"")})])]))):el("p",{class:"sub",style:"margin:0",text:"Ninguno apuntado."}),
    el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec",text:"＋ Apuntar cambio de pistón",onclick:()=>{rondaSigue();irPist({alm:""});}}),
      el("button",{type:"button",class:"btn",text:mh?"✓ Revisado a las "+new Date(mh.ts).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}):"✓ Revisado, no falta ninguno",disabled:!!mh,onclick:async()=>{try{await rondaMarca(p.id);}catch(e){toast("No se pudo guardar");return;}rondaRepinta();}})])]);}
function cuerpoGran(p){const a=granArt(),G=granHoy(p.nave),mh=marcaHoy(p.id),l=almNave(p.nave);
  if(!a)return el("p",{class:"hint",text:"No hay ningún artículo de granalla en el catálogo."});
  const kg=G.reduce((s,m)=>s+(+m.cant||0),0);
  return el("div",{style:"display:grid;gap:8px"},[G.length?el("p",{class:"sub ok",style:"margin:0",text:"✓ Apuntado hoy: "+fmtN(kg)+" kg ("+fmtN(Math.round(kg/SACO_KG*10)/10)+" sacos)"}):null,
    el("div",{class:"acciones"},[el("button",{type:"button",class:"btn",text:G.length?"＋ Apuntar más sacos":"＋ Apuntar sacos",onclick:()=>{rondaSigue();irMov("salida",{art:a.id,alm:l?l.id:"",cant:String(SACO_KG)});}}),
      G.length?null:el("button",{type:"button",class:"btn sec",text:mh?"✓ Ninguno":"Ninguno",disabled:!!mh,onclick:async()=>{try{await rondaMarca(p.id,{nada:true});}catch(e){toast("No se pudo guardar");return;}rondaRepinta();}})]),
    el("p",{class:"hint",style:"margin:0",text:"Viene puesto "+a.desc+(l?" del almacén "+(l.nom||l.id):"")+" y un saco ("+SACO_KG+" kg): cambia la cantidad si son más (2 sacos = "+(SACO_KG*2)+" kg)."})]);}
function cuerpoAlu(p){const x=alumHoy(p.nave),mh=marcaHoy(p.id);
  return el("div",{style:"display:grid;gap:8px"},[x?el("p",{class:"sub ok",style:"margin:0",text:"✓ Recuento de la "+p.nave+" hecho hoy"+(x.hora?" a las "+x.hora:"")+"."}):null,
    el("div",{class:"acciones"},[el("button",{type:"button",class:"btn",text:"Abrir Coladas",onclick:()=>{rondaSigue();location.href="./?t=consumo&ronda=1";}}),
      x||mh?null:el("button",{type:"button",class:"btn sec",text:"✓ Hecho",onclick:async()=>{try{await rondaMarca(p.id);}catch(e){toast("No se pudo guardar");return;}rondaRepinta();}})]),
    el("p",{class:"hint",style:"margin:0",text:"Se abre Coladas en Consumo. Al terminar, pulsa «Volver a la ronda». Cuando hagas el recuento de la "+p.nave+" este paso se marca solo."})]);}
/* resumen de un paso hecho */
function resumenPaso(p){if(p.t==="cont"){const r=lectHoyDe(p.nave);return p.ks.map(k=>nomCont(k)+" "+fmtN(r.c[k])).join(" · ");}
  if(p.t==="agua")return fmtN(lectHoyDe(AGUA).c.agua)+" m³";
  if(p.t==="gran"){const G=granHoy(p.nave);return G.length?fmtN(G.reduce((s,m)=>s+(+m.cant||0),0))+" kg":"Ninguno";}
  if(p.t==="alu"){const x=alumHoy(p.nave);return x?"Recuento"+(x.hora?" a las "+x.hora:""):"Hecho";}
  const m=marcaHoy(p.id);return m?"Revisado a las "+new Date(m.ts).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}):"";}
/* ---------- la pantalla ---------- */
let _rAbierto=null;
function rondaSigue(){try{sessionStorage.setItem("alm.ronda",hoy());}catch(e){}}
function rondaActiva(){try{return sessionStorage.getItem("alm.ronda")===hoy();}catch(e){return false;}}
function rondaRepinta(){if(tab==="ronda")render(true);}
function vRonda(v){rondaSigue();rondaLeeAlu();const E=rondaEstado();if(_rAbierto&&!E.P.some(p=>p.id===_rAbierto))_rAbierto=null;
  const abierto=_rAbierto||(E.sig&&E.sig.id);
  v.appendChild(el("section",{class:"card"},el("div",{class:"bd",style:"display:grid;gap:8px"},[el("div",{style:"display:flex;align-items:center;gap:10px"},[el("b",{style:"font-size:18px",text:E.n+" de "+E.tot}),el("span",{class:"sub",text:E.sig?"Siguiente: "+E.sig.tit:"Ronda terminada ✓"})]),
    el("div",{class:"bar"},el("i",{style:"width:"+Math.round(E.n*100/Math.max(1,E.tot))+"%"})),
    el("p",{class:"hint",style:"margin:0",text:"Puedes salir a apuntar otra cosa y volver cuando quieras: lo que has hecho hoy queda guardado."})])));
  E.P.forEach((p,i)=>{const h=pasoHecho(p),ab=p.id===abierto;
    const cab=el("button",{type:"button",class:"it",style:"width:100%;text-align:left","aria-expanded":String(ab),onclick:()=>{_rAbierto=ab?"__":p.id;render(true);}},[el("span",{class:"stripe "+(h?"ok":ab?"warn":"na")}),
      el("div",{class:"ppal"},[el("div",{class:"t1",text:(i+1)+". "+p.tit}),el("div",{class:"t2",text:h?"✓ "+resumenPaso(p):p.sub})]),el("span",{class:"sub",text:h?"✓":ab?"▾":"▸"})]);
    const cuerpo=ab?el("div",{class:"bd",style:"border-top:1px solid var(--line2)"},[p.t==="cont"?cuerpoCont(p):p.t==="agua"?cuerpoAgua(p):p.t==="pist"?cuerpoPist(p):p.t==="gran"?cuerpoGran(p):cuerpoAlu(p)]):null;
    v.appendChild(el("section",{class:"card ronda-paso"+(h?" hecho":""),id:"ronda-"+p.id},[cab,cuerpo]));});
  v.appendChild(el("div",{class:"acciones",style:"margin-top:6px"},[el("button",{type:"button",class:"btn sec",text:"Cambiar el orden",onclick:formOrdenRonda}),
    el("button",{type:"button",class:"btn sec",text:"Terminar por hoy",onclick:()=>{try{sessionStorage.removeItem("alm.ronda");}catch(e){}irA("res");}})]));}
function formOrdenRonda(){let L=rondaPasos().map(p=>p.id);const box=el("div",{class:"lst"});
  const pinta=()=>{box.textContent="";L.forEach((id,i)=>{const p=RONDA.find(x=>x.id===id);box.appendChild(el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},el("div",{class:"t1",text:(i+1)+". "+p.tit})),
    el("button",{type:"button",class:"btn sec peq","aria-label":"Subir",text:"↑",disabled:i===0,onclick:()=>{[L[i-1],L[i]]=[L[i],L[i-1]];pinta();}}),
    el("button",{type:"button",class:"btn sec peq","aria-label":"Bajar",text:"↓",disabled:i===L.length-1,onclick:()=>{[L[i+1],L[i]]=[L[i],L[i+1]];pinta();}})]));});};pinta();
  dlg("Orden de la ronda",[el("p",{class:"hint",text:"Ponlos en el orden en que vas andando."}),box],[{t:"Cancelar",cls:"sec"},{t:"Volver al de siempre",cls:"sec",fn:async()=>{delete cat.rondaOrden;try{await saveCat();}catch(e){return false;}render(true);}},
    {t:"Guardar",fn:async()=>{const prev=cat.rondaOrden;cat.rondaOrden=L.slice();try{await saveCat();toast("Orden guardado");}catch(e){cat.rondaOrden=prev;return false;}render(true);}}]);}
/* barra «Volver a la ronda» en las demás pantallas mientras la ronda está empezada */
function barraRonda(v){if(window.SOLO_CONSULTA||tab==="ronda"||!rondaActiva())return;const E=rondaEstado();if(!E.sig)return;
  const b=el("button",{type:"button",class:"banner ronda-volver",style:"display:flex;align-items:center;gap:8px;width:100%;text-align:left;cursor:pointer;margin:0 0 10px",onclick:()=>irA("ronda")},
    [el("b",{text:"‹ Volver a la ronda"}),el("span",{class:"sub",style:"margin-left:auto",text:E.n+" de "+E.tot+" · sigue: "+E.sig.tit})]);
  v.insertBefore(b,v.children[1]||null);}
/* tarjeta en Hoy */
function cardRonda(){if(window.SOLO_CONSULTA)return null;const E=rondaEstado();
  return el("section",{class:"card"},el("div",{class:"bd",style:"display:flex;align-items:center;gap:12px;flex-wrap:wrap"},[el("div",{style:"flex:1;min-width:0"},[el("div",{class:"t1",style:"font-weight:700",text:"Ronda de consumos"}),
    el("div",{class:"t2",text:E.n?(E.sig?E.n+" de "+E.tot+" hechos · sigue: "+E.sig.tit:"Hecha hoy ✓"):"Contadores, pistones, granalla, aluminio y agua"})]),
    el("button",{type:"button",class:"btn"+(E.sig?"":" sec"),text:E.n&&E.sig?"Seguir ronda":E.sig?"Empezar ronda":"Ver",onclick:()=>irA("ronda")})]));}

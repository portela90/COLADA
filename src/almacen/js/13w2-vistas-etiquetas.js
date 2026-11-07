/* ===== ETIQUETAS DE COLORES y VISTAS GUARDADAS =====
   Etiquetas: «Urgente», «Revisar», «En garantía»… en artículos y máquinas. Se ponen en su ficha (arriba), salen en las
   listas y en Stock se puede filtrar por ellas. La lista de etiquetas se puede cambiar (cat.etiquetas).
   Vistas guardadas: en Stock, guardar el filtro que usas a menudo (búsqueda, familia, almacén, etiqueta) y abrirlo con un toque.
   Cada persona tiene las suyas (vistas/<usuario>). */
const ETQ_DEF=[{id:"urg",nom:"Urgente",c:"rojo"},{id:"rev",nom:"Revisar",c:"ambar"},{id:"gar",nom:"En garantía",c:"verde"},{id:"pru",nom:"En prueba",c:"azul"},{id:"obs",nom:"Obsoleto",c:"gris"}];
const ETQ_COL=["rojo","ambar","verde","azul","morado","gris"];
const etiquetas=()=>(cat.etiquetas&&cat.etiquetas.length?cat.etiquetas:ETQ_DEF);
const etqDe=id=>etiquetas().find(e=>e.id===id);
function etqPills(x){const T=(x&&x.tags||[]).map(etqDe).filter(Boolean);if(!T.length)return null;return el("span",{class:"etqs"},T.map(e=>el("span",{class:"etq "+e.c,text:e.nom})));}
function etqEd(x,guarda){const box=el("div",{class:"etq-ed"});const solo=!!window.SOLO_CONSULTA;
  const pinta=()=>{box.textContent="";const tg=new Set(x.tags||[]);
    etiquetas().forEach(e=>{if(solo&&!tg.has(e.id))return;box.appendChild(el("button",{type:"button",class:"etq "+e.c+(tg.has(e.id)?" on":" off"),"aria-pressed":String(tg.has(e.id)),text:e.nom,disabled:solo,
      onclick:async()=>{const T=new Set(x.tags||[]);T.has(e.id)?T.delete(e.id):T.add(e.id);x.tags=[...T];if(!x.tags.length)delete x.tags;pinta();try{await guarda();}catch(err){toast("No se pudo guardar la etiqueta");}}}));});
    if(!solo)box.appendChild(el("button",{type:"button",class:"btn txt peq",text:"Editar etiquetas",onclick:formEtiquetas}));};
  pinta();return box;}
function formEtiquetas(){const L=etiquetas().map(e=>Object.assign({},e));const box=el("div",{style:"display:grid;gap:8px"});
  const pinta=()=>{box.textContent="";L.forEach((e,i)=>box.appendChild(el("div",{class:"row",style:"align-items:center"},[
      inp("etN"+i,e.nom,v=>{e.nom=v;},{placeholder:"Nombre"}),sel("etC"+i,ETQ_COL.map(c=>[c,c==="ambar"?"ámbar":c]),e.c,v=>{e.c=v;}),
      el("button",{type:"button",class:"btn txt peq",text:"Quitar",onclick:()=>{L.splice(i,1);pinta();}})])));
    box.appendChild(el("button",{type:"button",class:"btn sec peq",style:"justify-self:start",text:"+ Otra etiqueta",onclick:()=>{L.push({id:uid(),nom:"",c:"azul"});pinta();}}));};
  pinta();dlg("Etiquetas",[el("p",{class:"hint",text:"Las etiquetas valen para artículos y máquinas. Si quitas una, desaparece de donde estaba puesta."}),box],[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{
    cat.etiquetas=L.filter(e=>e.nom.trim()).map(e=>({id:e.id,nom:e.nom.trim(),c:e.c}));try{await saveCat();}catch(e){return false;}toast("Etiquetas guardadas");render(true);}}]);}
/* ---- vistas guardadas (Stock) ---- */
let VISTAS=null;
const vistasRef=()=>{const id=window.yoId&&window.yoId();return id?db.doc("vistas/"+id):null;};
async function cargaVistas(){if(VISTAS)return VISTAS;const r=vistasRef();
  if(r){try{const sn=await r.get();VISTAS=sn.exists?(sn.data().stock||[]):[];}catch(e){VISTAS=[];}}
  else{try{VISTAS=JSON.parse(localStorage.getItem("alm.vistas.stock")||"[]");}catch(e){VISTAS=[];}}
  return VISTAS;}
async function guardaVistas(){const r=vistasRef();if(r)await r.set({stock:VISTAS});else{try{localStorage.setItem("alm.vistas.stock",JSON.stringify(VISTAS));}catch(e){}}}
function barraVistas(f){const box=el("div",{class:"vistas"});
  const igual=v=>(v.txt||"")===(f.txt||"")&&(v.fam||"")===(f.fam||"")&&(v.alm||"")===(f.alm||"")&&(v.tag||"")===(f.tag||"");
  const pinta=()=>{box.textContent="";const L=VISTAS||[];
    box.appendChild(el("span",{class:"sub",text:"Mis vistas:"}));
    L.forEach(v=>box.appendChild(el("span",{class:"vista"+(igual(v)?" on":"")},[el("button",{type:"button",class:"vista-b",text:v.nom,onclick:()=>{Object.assign(f,{txt:v.txt||"",fam:v.fam||"",alm:v.alm||"",tag:v.tag||""});render(true);}}),
      el("button",{type:"button",class:"vista-x","aria-label":"Quitar la vista "+v.nom,text:"✕",onclick:async()=>{VISTAS=L.filter(x=>x!==v);await guardaVistas();pinta();}})])));
    const hay=f.txt||f.fam||f.alm||f.tag;
    if(hay&&!L.some(igual))box.appendChild(el("button",{type:"button",class:"btn sec peq",text:"+ Guardar esta vista",onclick:()=>{let nom="";
      dlg("Guardar vista",[fld("Nombre de la vista",inp("vNom","",x=>{nom=x;},{placeholder:"p. ej. Pistones de la N2"}))],[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{if(!nom.trim()){toast("Pon un nombre");return false;}
        VISTAS=(VISTAS||[]).concat([{nom:nom.trim(),txt:f.txt||"",fam:f.fam||"",alm:f.alm||"",tag:f.tag||""}]);await guardaVistas();toast("Vista guardada");render(true);}}]);}}));
    if(!L.length&&!hay)box.appendChild(el("span",{class:"sub",text:"elige un filtro y guárdalo para tenerlo a mano"}));};
  if(VISTAS)pinta();else cargaVistas().then(pinta);return box;}

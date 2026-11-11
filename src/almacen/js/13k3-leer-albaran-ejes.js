/* ===== LEER EL ALBARÁN DEL TALLER: EJES REPARADOS QUE VUELVEN =====
   Foto al albarán → la IA gratuita (leer-albaran-cf, la misma de los consumibles) busca los ejes que están en el taller;
   además la app busca el código grabado de cada eje en el texto (2.8.J-4…), que es lo más seguro.
   Si la IA no puede (cupo gastado, sin conexión), lo lee el lector del móvil (Tesseract) y se buscan los códigos igual.
   Salen todos los ejes del taller (los del albarán ya marcados); los marcados quedan «Llegado, por revisar» hasta que se revisan (OK a planta o NO-OK). */
const nqEjeA=t=>String(t||"").toUpperCase();
/* el código del eje en el texto, con separadores flexibles y sin pegarse a otra cifra (2.8.J-1 no es 2.8.J-10) */
function reEje(cod){const cs=String(cod||"").toUpperCase().replace(/[^A-Z0-9]/g,"").split("");if(cs.length<3)return null;
  return new RegExp("(?:^|[^A-Z0-9])"+cs.map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("[\\s.\\-/_]*")+"(?![0-9])");}
function ejeEnTexto(t,L){const T=nqEjeA(t);let best=null;L.forEach(e=>{const r=reEje(e.cod);if(r&&r.test(T)&&(!best||e.cod.length>best.cod.length))best=e;});return best;}
async function leerAlbaranEjes(file){if(!file)return;const L=ejesTaller().sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true}));
  if(!L.length){toast("No hay ejes en el taller");return;}
  dlg("Leyendo el albarán del taller…",[el("p",{class:"hint",text:"Un momento: la IA gratuita está buscando los ejes en la foto."})],[]);
  let bl=null,D=null,ocr=false;
  try{bl=await jpegAlb(file);
    if(window.__ALB_CF_MOCK){const m=window.__ALB_CF_MOCK;if(m.error)throw new Error(m.error);D=m.datos||m;}
    else{const b64=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result).split(",")[1]);fr.onerror=rej;fr.readAsDataURL(bl);});
      const r=await llamarFn("leer-albaran-cf",{image:b64,mime:"image/jpeg",proveedores:cat.proveedores.map(p=>p.nom),hoy:hoy(),
        articulos:L.map(e=>({id:"eje:"+e.id,t:"Eje "+e.cod+" · "+ejeRef(e)+" (en reparación en el taller) · en ud"})),
        pistas:["Este albarán es del taller que repara los ejes de los pistones: cada línea es un eje reparado que vuelve a la fundición. Cada eje se reconoce por su código grabado (como «"+L[0].cod+"»): copia la línea entera en texto, con el código, y pon en art el id del eje de la lista. La cantidad suele ser 1."]});
      if(!r||r.error||!r.datos)throw new Error((r&&r.error)||"sin respuesta");D=r.datos;}}
  catch(e){/* sin IA: lector del móvil y buscar los códigos */
    try{let texto;if(window.__OCR_MOCK!=null)texto=window.__OCR_MOCK;else{const Ts=await cargarOCR(),cv=await prepFotoOCR(file);const r=await Ts.recognize(cv,"spa");texto=(r&&r.data&&r.data.text)||"";}
      const T=String(texto);const m=T.match(/alb[aá]r[aá]n[^\n\d]{0,25}?([A-Z]{0,4}[\-\/]?\d[\dA-Z\-\/]{1,})/i),fm=T.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
      let fecha="";if(fm){let y=+fm[3];if(y<100)y+=2000;fecha=y+"-"+String(+fm[2]).padStart(2,"0")+"-"+String(+fm[1]).padStart(2,"0");}
      D={albaran:m?m[1]:"",fecha,lineas:T.split("\n").map(s=>s.replace(/\s+/g," ").trim()).filter(Boolean).map(t=>({texto:t}))};ocr=true;}
    catch(e2){cerrarDlgs();toast("No se pudo leer el albarán: "+(e.message||e));return;}}
  cerrarDlgs();revisarAlbEjes(D||{},L,ocr);}
/* todos los ejes del taller: los del albarán salen ya marcados; al guardar quedan «Llegado, por revisar» (no OK todavía) */
function revisarAlbEjes(D,L,ocr){const enAlb={},sueltas=[];
  (D.lineas||[]).forEach(l=>{const t=String(l.texto||"");let e=ejeEnTexto(t,L),por="cod";
    if(!e&&typeof l.art==="string"&&l.art.startsWith("eje:")){e=L.find(x=>x.id===l.art.slice(4))||null;por="ia";}
    if(e){if(!enAlb[e.id])enAlb[e.id]={t,por};}else if(!ocr&&/\beje/i.test(t))sueltas.push(t);});
  const orden=L.slice().sort((a,b)=>(enAlb[a.id]?0:1)-(enAlb[b.id]?0:1)||a.cod.localeCompare(b.cod,"es",{numeric:true}));
  const marc=new Set(Object.keys(enAlb));
  const v={alb:String(D.albaran||"").trim(),f:/^\d{4}-\d{2}-\d{2}$/.test(D.fecha||"")?D.fecha:hoy()};
  const box=el("div",{style:"display:grid;gap:10px"});
  const pinta=()=>{box.textContent="";const nA=Object.keys(enAlb).length;
    const ya=v.alb&&todasRep().filter(r=>r.alb&&nqAlb(r.alb)===nqAlb(v.alb)&&(r.res==="ok"||r.lleg));
    if(ya&&ya.length)box.appendChild(el("div",{class:"banner b",text:"Ojo: con el albarán "+v.alb+" ya entraron "+ya.map(r=>r.eje).join(", ")+". Revisa que no lo metas dos veces."}));
    if(ocr)box.appendChild(el("div",{class:"banner w",text:"Leído sin IA (con el lector del móvil): se han buscado los códigos grabados de los ejes. Revisa la lista."}));
    box.appendChild(el("p",{class:"hint",style:"margin:0",text:(nA?"En el albarán salen "+nA+(nA===1?" eje":" ejes")+" (ya marcados). ":"No se ha reconocido ningún eje en el albarán. ")+
      "Estos son todos los que tenías en el taller: marca los que han llegado. Quedan «por revisar» hasta que los revises; no cuentan como OK ni en planta."}));
    box.appendChild(el("div",{class:"row"},[fld("Nº albarán",inp("leAlb",v.alb,x=>{v.alb=x;},{autocomplete:"off"})),fld("Fecha de llegada",inp("leF",v.f,x=>v.f=x,{type:"date"}))]));
    if(sueltas.length)box.appendChild(el("div",{class:"banner w",text:"Líneas del albarán sin un eje del taller: "+sueltas.join(" · ")}));
    box.appendChild(el("div",{class:"lst"},orden.map(e=>{const a=enAlb[e.id],ab=abiertaDe(e.cod);
      return el("label",{class:"chk it le-fila",style:"cursor:pointer"},[el("input",{type:"checkbox",id:"leC-"+e.id,checked:marc.has(e.id),onchange:ev=>{ev.target.checked?marc.add(e.id):marc.delete(e.id);}}),
        el("div",{class:"ppal"},[el("div",{class:"t1",text:e.cod+" · "+ejeRef(e)}),
          el("div",{class:"t2",text:[ab&&ab.env?"en el taller desde el "+fmtF(ab.env):null,ab&&ab.desp,e.estado==="devuelto"?"devuelto NO-OK":null].filter(Boolean).join(" · ")}),
          a?el("span",{class:"pill "+(a.por==="cod"?"ok":"warn"),style:"margin-top:3px",text:a.por==="cod"?"En el albarán":"En el albarán (lo ha elegido la IA, compruébalo)"}):null])]);})));};
  pinta();
  dlg("Albarán del taller",[box],[{t:"Cancelar",cls:"sec"},{t:"Dar entrada (por revisar)",fn:async()=>{
    const list=L.filter(e=>marc.has(e.id));if(!list.length){toast("Marca los ejes que han llegado");return false;}
    try{await llegarEjes(list,v.f,String(v.alb).trim());}catch(e){toast("No se pudo guardar");return false;}
    toast(list.length+(list.length===1?" eje ha llegado":" ejes han llegado")+": quedan por revisar");render(true);}}]);}
/* llegan del taller pero sin revisar: la reparación sigue abierta (sin OK) y el eje queda «Llegado, por revisar» */
async function llegarEjes(list,f,alb){const ups=[];for(const e of list){const ab=abiertaDe(e.cod);if(ab)ups.push([ab,{lleg:f,alb:alb||ab.alb||null}]);
    else await addRep({eje:e.cod,desp:"—",alta:f,env:f,lleg:f,alb:alb||null});}/* sin reparación abierta apuntada: se abre para poder revisarlo */
  if(ups.length)await updReps(ups);for(const e of list)await updEje(e,{estado:"revisar"});}
const ejesRevisar=()=>ejes.filter(e=>e.estado==="revisar").sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true}));
/* tarjeta en Ejes y revisión de varios a la vez: OK (a planta), NO-OK (vuelve al taller) o todavía no */
function cardRevisar(){const L=ejesRevisar();if(!L.length)return null;
  return el("section",{class:"card",id:"eRevCard"},[el("div",{class:"hd"},[el("h2",{text:"Llegados del taller, por revisar ("+L.length+")"}),el("button",{type:"button",class:"btn peq der",id:"eRevisar",text:"Revisar",onclick:revisarLlegados})]),
    el("div",{class:"lst"},L.map(e=>{const ab=abiertaDe(e.cod)||{};return el("button",{type:"button",class:"it",onclick:()=>fichaEje(e)},[el("div",{class:"ppal"},[el("div",{class:"t1",text:e.cod+" · "+ejeRef(e)}),
      el("div",{class:"t2",text:"Llegó el "+fmtF(ab.lleg)+(ab.alb?" · albarán "+ab.alb:"")+(ab.lleg?" · hace "+dias(ab.lleg,hoy())+" días":"")})])]);}))]);}
function revisarLlegados(){const L=ejesRevisar();if(!L.length){toast("No hay ejes por revisar");return;}const st={},obs={};const f={f:hoy()};
  const box=el("div",{style:"display:grid;gap:8px"});
  const pinta=()=>{box.textContent="";box.appendChild(fld("Fecha de la revisión",inp("rvF",f.f,x=>f.f=x,{type:"date"})));
    L.forEach(e=>{const ab=abiertaDe(e.cod)||{},k=st[e.id]||"";
      box.appendChild(el("div",{class:"card",style:"padding:10px 12px;display:grid;gap:6px"},[el("b",{text:e.cod+" · "+ejeRef(e)}),el("span",{class:"sub",text:"Llegó el "+fmtF(ab.lleg)+(ab.alb?" · albarán "+ab.alb:"")+(ab.desp?" · "+ab.desp:"")}),
        el("div",{class:"seg",role:"group","aria-label":"Resultado de "+e.cod},[["","Todavía no"],["ok","OK"],["nook","NO-OK"]].map(([v,t])=>el("button",{type:"button","data-e":e.id,"data-r":v,"aria-pressed":String(k===v),text:t,onclick:()=>{st[e.id]=v;pinta();}}))),
        k==="nook"?fld("Por qué es NO-OK",inp("rvO-"+e.id,obs[e.id]||"",x=>obs[e.id]=x,{autocomplete:"off"})):null]));});};
  pinta();
  dlg("Revisar los ejes llegados",[box],[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{
    const ok=L.filter(e=>st[e.id]==="ok"),no=L.filter(e=>st[e.id]==="nook");if(!ok.length&&!no.length){toast("Marca OK o NO-OK en alguno");return false;}
    if(no.some(e=>!String(obs[e.id]||"").trim())){toast("Explica por qué es NO-OK");return false;}
    try{if(ok.length)await recibir(ok,f.f,null,"ok");for(const e of no)await recibir([e],f.f,null,"nook",String(obs[e.id]).trim());}catch(er){toast("No se pudo guardar");return false;}
    toast([ok.length?ok.length+" OK a planta":null,no.length?no.length+" NO-OK al taller":null].filter(Boolean).join(" · "));if(ok.length)trasRecibir(ok);render(true);}}]);}

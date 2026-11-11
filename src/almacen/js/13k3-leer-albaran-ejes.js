/* ===== LEER EL ALBARÁN DEL TALLER: EJES REPARADOS QUE VUELVEN =====
   Foto al albarán → la IA gratuita (leer-albaran-cf, la misma de los consumibles) busca los ejes que están en el taller;
   además la app busca el código grabado de cada eje en el texto (2.8.J-4…), que es lo más seguro.
   Si la IA no puede (cupo gastado, sin conexión), lo lee el lector del móvil (Tesseract) y se buscan los códigos igual.
   Se revisa todo y al guardar los marcados quedan recibidos OK y vuelven a planta (igual que «Recibir de reparación»). */
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
function revisarAlbEjes(D,L,ocr){const vistos=new Set();
  const filas=[];(D.lineas||[]).forEach((l,i)=>{const t=String(l.texto||"");let e=ejeEnTexto(t,L),por="cod";
    if(!e&&typeof l.art==="string"&&l.art.startsWith("eje:")){e=L.find(x=>x.id===l.art.slice(4))||null;por="ia";}
    if(e&&vistos.has(e.id))return;if(e)vistos.add(e.id);
    if(!e&&(ocr||!/\beje/i.test(t)))return;/* las líneas sin eje (portes, totales…) no salen */
    filas.push({i,texto:t,eje:e?e.id:"",ok:!!e,por});});
  const v={alb:String(D.albaran||"").trim(),f:/^\d{4}-\d{2}-\d{2}$/.test(D.fecha||"")?D.fecha:hoy(),imp:""};
  const box=el("div",{style:"display:grid;gap:10px"});let n=filas.length;
  const ops=L.map(e=>[e.id,e.cod+" · "+ejeRef(e)+(e.estado==="devuelto"?" (devuelto NO-OK)":"")]);
  const pinta=()=>{box.textContent="";
    const ya=v.alb&&todasRep().filter(r=>r.alb&&nqAlb(r.alb)===nqAlb(v.alb)&&r.res==="ok");
    if(ya&&ya.length)box.appendChild(el("div",{class:"banner b",text:"Ojo: con el albarán "+v.alb+" ya se recibieron "+ya.map(r=>r.eje).join(", ")+". Revisa que no lo metas dos veces."}));
    if(ocr)box.appendChild(el("div",{class:"banner w",text:"Leído sin IA (con el lector del móvil): se han buscado los códigos grabados de los ejes. Revisa la lista."}));
    box.appendChild(el("p",{class:"hint",style:"margin:0",text:"Los ejes marcados se reciben OK y vuelven a planta. Si alguno llega mal, desmárcalo y regístralo desde su ficha como NO-OK."}));
    box.appendChild(el("div",{class:"row"},[fld("Nº albarán",inp("leAlb",v.alb,x=>{v.alb=x;},{autocomplete:"off"})),fld("Fecha de recepción",inp("leF",v.f,x=>v.f=x,{type:"date"}))]));
    box.appendChild(fld("Importe por eje en € (opcional; si no, se usa el precio del modelo)",inp("leI",v.imp,x=>v.imp=x,{inputmode:"decimal",class:"num"})));
    filas.forEach((r,k)=>{const usados=new Set(filas.filter(z=>z!==r&&z.ok&&z.eje).map(z=>z.eje));
      box.appendChild(el("div",{class:"card le-fila",style:"padding:10px 12px;display:grid;gap:6px;opacity:"+(r.ok?1:.5)},[
        el("label",{class:"chk",style:"font-size:14px;font-weight:600"},[el("input",{type:"checkbox",checked:r.ok,onchange:e=>{r.ok=e.target.checked;pinta();}}),r.texto||"Eje añadido a mano"]),
        r.ok?fld("Eje",sel("leE"+k,ops.filter(([id])=>!usados.has(id)),r.eje,x=>{r.eje=x;pinta();},"Elige el eje…")):null,
        r.ok&&r.eje&&r.por==="ia"&&r.texto?el("p",{class:"sub",style:"margin:0",text:"No se ve el código en la línea: lo ha elegido la IA, compruébalo."}):null]));});
    if(!filas.length)box.appendChild(el("p",{class:"empty",text:"No se ha encontrado ningún eje del taller en el albarán. Añádelos a mano."}));
    box.appendChild(el("button",{type:"button",class:"btn sec peq",id:"leMas",style:"justify-self:start",text:"+ Añadir otro eje",onclick:()=>{filas.push({i:n++,texto:"",eje:"",ok:true,por:"mano"});pinta();}}));};
  pinta();
  dlg("Albarán del taller",[box],[{t:"Cancelar",cls:"sec"},{t:"Recibir OK",fn:async()=>{
    const S=filas.filter(r=>r.ok);if(!S.length){toast("No hay ningún eje marcado");return false;}
    if(S.some(r=>!r.eje)){toast("Elige el eje de cada línea marcada");return false;}
    const list=[...new Set(S.map(r=>r.eje))].map(id=>ejes.find(e=>e.id===id)).filter(Boolean);
    try{await recibir(list,v.f,String(v.alb).trim(),"ok",null,parseN(v.imp));}catch(e){toast("No se pudo guardar");return false;}
    toast(list.length+(list.length===1?" eje recibido OK":" ejes recibidos OK")+" y en planta");trasRecibir(list);render(true);}}]);}

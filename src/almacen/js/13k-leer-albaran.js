/* ===== LEER UN ALBARÁN DE ENTRADA CON LA CÁMARA (función leer-albaran-almacen, con IA) =====
   Compra: cada línea se une a su artículo (lo propone la IA y lo que se corrige se recuerda en cat.albMap: texto → artículo).
   Recuperación de pistones (Meyusa): «RECUP. PISTONES DE Ø80 A Ø70» entra como Ø 70 recuperado; si cuadra con lo enviado
   a recuperar, se apunta también la recepción en Pistones usados. Antes de guardar se revisa todo; avisa si el albarán ya está. */
const nqAlb=t=>String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9ø]+/g," ").trim();
async function leerAlbaranAlm(file){if(!file)return;const espera=dlg("Leyendo el albarán…",[el("p",{class:"hint",text:"Un momento: la IA está leyendo la foto."})],[]);
  try{const bl=await comprimir(file);let datos;
    if(window.__ALB_MOCK)datos=window.__ALB_MOCK;
    else{const b64=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result).split(",")[1]);fr.onerror=rej;fr.readAsDataURL(bl);});
      const r=await llamarFn("leer-albaran-almacen",{image:b64,mime:bl.type||"image/jpeg",proveedores:cat.proveedores.map(p=>p.nom),articulos:artsActivos().filter(a=>a.fam!=="eje").map(a=>({id:a.id,t:nomArtC(a)+(a.cod?" ["+a.cod+"]":"")})),hoy:hoy()});
      datos=(r&&r.datos)||{};}
    cerrarDlgs();revisarAlbaran(datos,bl);}
  catch(e){cerrarDlgs();toast("No se pudo leer el albarán: "+(e.message||e));}}
function revisarAlbaran(D,blob){const recup=D.tipo==="recuperacion"||(D.lineas||[]).some(l=>/recup/i.test(l.texto||""));
  const prov=cat.proveedores.find(p=>nqAlb(p.nom)===nqAlb(D.proveedor))||cat.proveedores.find(p=>D.proveedor&&(nqAlb(p.nom).includes(nqAlb(D.proveedor).split(" ")[0])||nqAlb(D.proveedor).includes(nqAlb(p.nom).split(" ")[0])));
  const M=cat.albMap||{};
  const diamDe=(n,esp)=>{const d="Ø "+String(n||"").replace(/\D/g,"")+(esp?" esp":"");return DIAM.includes(d)?d:null;};
  const L=(D.lineas||[]).map((l,i)=>{const r={i,texto:l.texto||"",cant:l.cantidad!=null?String(l.cantidad).replace(".",","):"",ud:l.unidad||"",art:"",rec:recup,ok:true,desde:null};
    if(recup&&l.hasta){const h=diamDe(l.hasta,l.especial),a=h?pistArt(h):null;if(a)r.art=a.id;r.desde=diamDe(l.desde,l.especial);}
    if(!r.art){const k=nqAlb(l.texto);if(M[k]&&art(M[k]))r.art=M[k];else if(l.art&&art(l.art))r.art=l.art;}
    r.art0=r.art;return r;});
  const v={prov:prov?prov.id:"",alb:D.albaran||"",f:/^\d{4}-\d{2}-\d{2}$/.test(D.fecha||"")?D.fecha:hoy(),alm:""};
  {const a0=L.map(r=>art(r.art)).find(Boolean);v.alm=(a0&&(a0.almPpal||(a0.alms||[])[0]))||(cat.almacenes[0]||{}).id||"";}
  const box=el("div",{style:"display:grid;gap:10px"});
  const pinta=()=>{box.textContent="";const ya=v.alb&&todosMov().filter(m=>m.alb&&nqAlb(m.alb)===nqAlb(v.alb));
    if(ya&&ya.length)box.appendChild(el("div",{class:"banner b",text:"Ojo: el albarán "+v.alb+" ya está apuntado ("+ya.length+(ya.length===1?" línea":" líneas")+" del "+fmtF(ya[0].f)+"). Revisa que no lo metas dos veces."}));
    if(D.confianza==="baja")box.appendChild(el("div",{class:"banner w",text:"La foto no se lee bien: revisa cada línea."}));
    box.appendChild(el("p",{class:"hint",style:"margin:0",text:recup?"Albarán de recuperación de pistones: entran como recuperados, cada uno con el Ø al que lo han rebajado.":"Revisa que cada línea esté unida a su artículo. Lo que corrijas se recuerda para la próxima vez."}));
    box.appendChild(el("div",{class:"row"},[fld("Proveedor",sel("laProv",provOpts(),v.prov,x=>v.prov=x,"—")),fld("Nº albarán",inp("laAlb",v.alb,x=>{v.alb=x;},{autocomplete:"off"}))]));
    box.appendChild(el("div",{class:"row"},[fld("Fecha",inp("laF",v.f,x=>v.f=x,{type:"date"})),fld("Entran en el almacén",sel("laAlm",almOpts(),v.alm,x=>v.alm=x))]));
    L.forEach(r=>{const a=art(r.art);
      box.appendChild(el("div",{class:"card",style:"padding:10px 12px;display:grid;gap:6px;opacity:"+(r.ok?1:.5)},[
        el("label",{class:"chk",style:"font-size:14px;font-weight:600"},[el("input",{type:"checkbox",checked:r.ok,onchange:e=>{r.ok=e.target.checked;pinta();}}),r.texto||"(línea "+(r.i+1)+")"]),
        r.ok?el("div",{class:"row"},[fld("Artículo",sel("laA"+r.i,artOpts(x=>x.fam!=="eje"),r.art,x=>{r.art=x;pinta();},"Elige artículo…")),fld("Cantidad"+(a?" ("+a.ud+")":r.ud?" ("+r.ud+")":""),inp("laC"+r.i,r.cant,x=>r.cant=x,{inputmode:"decimal",class:"num"}))]):null,
        r.ok&&a&&a.fam==="piston"?el("div",{class:"seg",role:"group","aria-label":"Nuevos o recuperados"},[[false,"Nuevos"],[true,"Recuperados"]].map(([k,t])=>el("button",{type:"button","aria-pressed":String(r.rec===k),text:t,onclick:()=>{r.rec=k;pinta();}}))):null,
        r.ok&&r.desde&&a?el("p",{class:"sub",style:"margin:0",text:"Era "+r.desde+" → vuelve como "+a.diam}):null]));});
    if(!L.length)box.appendChild(el("p",{class:"empty",text:"No se han encontrado líneas en el albarán."}));};
  pinta();
  dlg("Albarán leído",[box],[{t:"Cancelar",cls:"sec"},{t:"Guardar entradas",fn:async()=>{
    const S=L.filter(r=>r.ok);if(!S.length){toast("No hay ninguna línea marcada");return false;}if(!v.alm){toast("Elige el almacén");return false;}
    for(const r of S){const q=parseN(r.cant);if(!art(r.art)){toast("Elige el artículo de «"+(r.texto||"línea "+(r.i+1))+"»");return false;}if(!(q>0)){toast("Cantidad no válida en «"+(r.texto||"línea "+(r.i+1))+"»");return false;}}
    let foto=null;try{if(blob&&assets){const u=await assets.upload(blob);foto=u.id;}}catch(e){}
    const movs=S.map(r=>{const a=art(r.art),m={tipo:"entrada",f:v.f,art:a.id,alm:v.alm,cant:parseN(r.cant)};if(v.prov)m.prov=v.prov;if(String(v.alb).trim())m.alb=String(v.alb).trim();if(foto)m.foto=foto;
      if(a.fam==="piston"&&r.rec){m.rec=true;m.nota=r.desde?"Recuperado por "+(provN(v.prov)||PU_REC)+" (era "+r.desde+")":"Recuperados";}return m;});
    try{await addMovs(movs);}catch(e){toast("No se pudo guardar");return false;}
    /* si es una recuperación y cuadra con lo que se mandó a recuperar, también se apunta en Pistones usados */
    let pu="";if(recup){try{const E=puEstado();const ok={},como={};S.forEach(r=>{if(r.desde&&r.rec){ok[r.desde]=(ok[r.desde]||0)+parseN(r.cant);como[r.desde]=art(r.art).diam;}});
      const cuadra=E&&Object.keys(ok).length&&Object.keys(ok).every(d=>E.S[d]&&E.S[d].M>=ok[d]);
      if(cuadra){await puGuarda({t:"recep",f:v.f,ok,como,mal:{},alb:String(v.alb).trim(),alm:v.alm,movs:movs.filter(m=>m.rec).map(m=>({id:m.id,f:m.f}))});pu=" y la recepción en Pistones usados";}
      else if(E)pu=" (no cuadra con lo enviado a "+PU_REC+": revisa Pistones usados)";}catch(e){}}
    /* aprender: texto de la línea → artículo elegido */
    const nuevo=Object.assign({},cat.albMap||{});let cambia=false;S.forEach(r=>{const k=nqAlb(r.texto);if(k&&!r.desde&&r.art&&nuevo[k]!==r.art){nuevo[k]=r.art;cambia=true;}});
    if(cambia){cat.albMap=nuevo;try{await saveCat();}catch(e){}}
    toast("Guardadas "+movs.length+(movs.length===1?" entrada":" entradas")+pu);render(true);}}]);}

/* ===== PÉRDIDAS E INCIDENCIAS =====
   Material que se pierde sin gastarlo en una máquina: robos, roturas por mala manipulación, material caducado…
   Se valora en euros y se carga a la Nave 1, a la Nave 2 o a toda la planta (nunca a una inyectora), así no se
   mezcla con el consumo de las máquinas ni sale en Desviaciones, Investigar o la previsión de mínimos.
   colección «inc», doc «lista», items {id,f,tipo,tipoO,cargo:"N1"|"N2"|"PL",t,nota,fotos:[id],
     lin:[{k:"a",art,alm,cant,pu,movId} | {k:"m",desc,cant,pu}],por,ts}
   Las líneas del catálogo crean una salida (inc:id) que baja el stock; las líneas escritas a mano solo suman euros. */
let INC=[];
const INC_TIPOS=[["robo","Robo"],["manip","Rotura por mala manipulación"],["cad","Caducado o estropeado"],["otro","Otro"]];
const INC_CARGO=[["N1","Nave 1"],["N2","Nave 2"],["PL","Toda la planta"]];
const incTipo=x=>x.tipo==="otro"&&x.tipoO?x.tipoO:(INC_TIPOS.find(t=>t[0]===x.tipo)||[0,"Otro"])[1];
const incCargo=x=>(INC_CARGO.find(c=>c[0]===x.cargo)||[0,"Toda la planta"])[1];
const incLinEur=l=>(+l.cant||0)*(+l.pu||0);
const incTotal=x=>(x.lin||[]).reduce((s,l)=>s+incLinEur(l),0);
const incLinNom=l=>l.k==="a"?(art(l.art)?nomArtC(art(l.art)):"Artículo borrado"):(l.desc||"Sin descripción");
const incLinUd=l=>l.k==="a"&&art(l.art)?(art(l.art).ud||"ud"):"ud";
const incOrd=L=>L.slice().sort((a,b)=>(b.f||"").localeCompare(a.f||"")||(b.ts||0)-(a.ts||0));
async function incGuarda(fn){INC=await listaGuarda("inc/lista",fn);}
/* para el gasto (evTodo): cada línea es un gasto de la familia «Incidencias», cargado a la nave, sin máquina */
function incEventos(){const out=[];(INC||[]).forEach(x=>(x.lin||[]).forEach(l=>{const c=+l.cant||0;if(!c)return;
  out.push({f:x.f,ts:x.ts||0,maq:null,nave:incCargo(x),ref:incLinNom(l),cant:c,ud:incLinUd(l),eur:incLinEur(l),quien:x.por||"",fam:"Incidencias",inc:x,a:null,nota:incTipo(x)+" · "+(x.t||"")});}));return out;}

/* ---------- en Consumo: la tarjeta ---------- */
function cardIncidencias(){const h=hoy(),mes=h.slice(0,7),y0=h.slice(0,4)+"-01-01";const L=incOrd(INC||[]);
  const tMes=L.filter(x=>(x.f||"").slice(0,7)===mes).reduce((s,x)=>s+incTotal(x),0),tAno=L.filter(x=>x.f>=y0).reduce((s,x)=>s+incTotal(x),0);
  const puede=!window.SOLO_CONSULTA;
  const filas=L.slice(0,5).map(x=>el("button",{type:"button",class:"it",onclick:()=>incFicha(x)},[el("span",{class:"stripe "+(x.tipo==="robo"?"bad":"warn")}),
    el("div",{class:"ppal"},[el("div",{class:"t1",text:incTipo(x)+" · "+incCargo(x)}),el("div",{class:"t2",text:fmtF(x.f)+" · "+(x.t||"")})]),
    el("div",{class:"cant num"},[el("b",{text:eur(Math.round(incTotal(x)))}),el("small",{text:(x.lin||[]).length+((x.lin||[]).length===1?" línea":" líneas")})])]));
  return el("section",{class:"card",id:"incCard"},[el("div",{class:"hd"},[el("h2",{text:"Pérdidas e incidencias"}),el("span",{class:"der sub",text:"este mes "+eur(Math.round(tMes))+" · este año "+eur(Math.round(tAno))})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[
      el("p",{class:"hint",style:"margin:0",text:"Robos, roturas por mala manipulación, material caducado… Lo que se pierde sin gastarse en una máquina. Se valora en euros y se carga a la nave o a toda la planta, aparte del consumo de las máquinas."}),
      el("div",{class:"acciones acc2"},[puede?el("button",{type:"button",class:"btn",id:"bIncNueva",text:"＋ Apuntar incidencia",onclick:()=>incForm()}):null,
        el("button",{type:"button",class:"btn sec",id:"bIncTodas",text:L.length?"Ver todas y resumen":"Resumen",onclick:()=>incResumen()})].filter(Boolean))]),
    L.length?el("div",{class:"lst"},filas):el("div",{class:"empty",text:"No hay ninguna incidencia apuntada."})]);}

/* ---------- apuntar o corregir ---------- */
function incForm(x0){const ed=!!x0;const s=ed?JSON.parse(JSON.stringify(x0)):{f:hoy(),tipo:"robo",tipoO:"",cargo:"N1",t:"",nota:"",fotos:[],lin:[]};
  if(!s.lin.some(l=>l.k==="a"))s.lin.push({k:"a",art:"",alm:"",cant:""});
  if(!s.lin.some(l=>l.k==="m"))s.lin.push({k:"m",desc:"",cant:"",pu:""});
  let files=[];const cuerpo=el("div",{class:"inc-form",style:"display:flex;flex-direction:column;gap:12px"});const totEl=el("div",{class:"inc-tot"});
  const segB=(opts,val,on,lbl)=>el("div",{class:"seg",role:"group","aria-label":lbl},opts.map(([k,t])=>el("button",{type:"button","aria-pressed":String(val===k),text:t,onclick:()=>{on(k);pinta();}})));
  const puArt=a=>precioDe(a)||0;
  const pintaTot=()=>{const L=s.lin.map(l=>l.k==="a"?Object.assign({},l,{pu:puArt(art(l.art))}):Object.assign({},l,{pu:parseN(l.pu)||0,cant:parseN(l.cant)||0}));
    const t=L.reduce((z,l)=>z+(parseN(l.cant)||0)*(+l.pu||0),0),sinP=s.lin.filter(l=>l.k==="a"&&l.art&&!puArt(art(l.art))).length;
    totEl.textContent="Valor de la incidencia: "+eur(Math.round(t*100)/100)+(sinP?" · "+sinP+(sinP===1?" artículo sin precio en el Catálogo (no suma)":" artículos sin precio en el Catálogo (no suman)"):"");};
  function pinta(){cuerpo.textContent="";
    cuerpo.appendChild(el("div",{class:"row"},[fld("Fecha",inp("incF",s.f,v=>s.f=v,{type:"date"})),fld("Qué ha pasado",inp("incT",s.t,v=>s.t=v,{placeholder:"p. ej. Robo del fin de semana en Nave 1",autocomplete:"off"}))]));
    cuerpo.appendChild(el("div",{class:"f"},[el("span",{class:"lbl",text:"Tipo"}),segB(INC_TIPOS,s.tipo,k=>s.tipo=k,"Tipo de incidencia")]));
    if(s.tipo==="otro")cuerpo.appendChild(fld("¿Qué tipo?",inp("incTO",s.tipoO,v=>s.tipoO=v,{placeholder:"p. ej. Extraviado",autocomplete:"off"})));
    cuerpo.appendChild(el("div",{class:"f"},[el("span",{class:"lbl",text:"Se carga a"}),segB(INC_CARGO,s.cargo,k=>s.cargo=k,"A quién se carga")]));
    /* material del almacén */
    const A=s.lin.filter(l=>l.k==="a");
    cuerpo.appendChild(el("h4",{class:"inc-h",text:"Material del almacén (baja el stock)"}));
    A.forEach((l,i)=>{const a=art(l.art);if(a&&!l.alm){const al=almsDe(a).find(z=>stockDe(a.id,z.id)>0)||almsDe(a)[0];if(al)l.alm=al.id;}
      cuerpo.appendChild(el("div",{class:"inc-lin"},[fld("Artículo",sel("incA"+i,artOpts(),l.art,v=>{l.art=v;l.alm="";pinta();},"Elige artículo…")),
        fld("Almacén",sel("incAl"+i,almOptsArt(a),l.alm,v=>{l.alm=v;})),
        fld("Cantidad"+(a?" ("+(a.ud||"ud")+")":""),inp("incC"+i,l.cant,v=>{l.cant=v;pintaTot();},{inputmode:"decimal",class:"num",placeholder:"0",autocomplete:"off"})),
        el("div",{class:"inc-pu sub",text:a?(puArt(a)?eur(puArt(a))+" / "+(a.ud||"ud"):"sin precio"):""}),
        A.length>1?el("button",{type:"button",class:"btn txt peq","aria-label":"Quitar esta línea",text:"Quitar",onclick:()=>{s.lin.splice(s.lin.indexOf(l),1);pinta();}}):null]));});
    cuerpo.appendChild(el("button",{type:"button",class:"btn sec peq",style:"align-self:flex-start",text:"＋ Otro artículo",onclick:()=>{s.lin.push({k:"a",art:"",alm:"",cant:""});pinta();}}));
    /* lo que no está en el catálogo */
    const M=s.lin.filter(l=>l.k==="m");
    cuerpo.appendChild(el("h4",{class:"inc-h",text:"Lo que no está en el Catálogo (escríbelo)"}));
    M.forEach((l,i)=>cuerpo.appendChild(el("div",{class:"inc-lin"},[fld("Descripción",inp("incMd"+i,l.desc,v=>l.desc=v,{placeholder:"p. ej. Taladro Makita",autocomplete:"off"})),
      fld("Cantidad",inp("incMc"+i,l.cant,v=>{l.cant=v;pintaTot();},{inputmode:"decimal",class:"num",placeholder:"0",autocomplete:"off"})),
      fld("Precio por unidad (€)",inp("incMp"+i,l.pu,v=>{l.pu=v;pintaTot();},{inputmode:"decimal",class:"num",placeholder:"€",autocomplete:"off"})),
      M.length>1?el("button",{type:"button",class:"btn txt peq","aria-label":"Quitar esta línea",text:"Quitar",onclick:()=>{s.lin.splice(s.lin.indexOf(l),1);pinta();}}):null])));
    cuerpo.appendChild(el("button",{type:"button",class:"btn sec peq",style:"align-self:flex-start",text:"＋ Otra línea",onclick:()=>{s.lin.push({k:"m",desc:"",cant:"",pu:""});pinta();}}));
    cuerpo.appendChild(fld("Nota (opcional)",(()=>{const t=el("textarea",{id:"incN",rows:2,placeholder:"Denuncia, quién lo vio, qué se ha hecho…"});t.value=s.nota||"";t.addEventListener("input",()=>s.nota=t.value);return t;})()));
    if(assets){const fi=el("input",{type:"file",accept:"image/*",multiple:true,id:"incFotos"});fi.addEventListener("change",()=>{files=[...fi.files];pintaFotos();});
      const fx=el("div",{class:"sub",id:"incFotosTxt"});const pintaFotos=()=>{const n=(s.fotos||[]).length+files.length;fx.textContent=n?n+(n===1?" foto":" fotos"):"";};pintaFotos();
      cuerpo.appendChild(fld("Fotos (opcional)",fi));cuerpo.appendChild(fx);}
    cuerpo.appendChild(totEl);pintaTot();}
  pinta();
  dlg(ed?"Corregir incidencia":"Apuntar incidencia",[cuerpo],[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{
    if(!String(s.t||"").trim()){toast("Escribe qué ha pasado");const i=$("incT");if(i)i.focus();return false;}
    if(s.tipo==="otro"&&!String(s.tipoO||"").trim()){toast("Escribe qué tipo de incidencia es");return false;}
    const lin=[];for(const l of s.lin){
      if(l.k==="a"){if(!l.art&&!String(l.cant||"").trim())continue;const a=art(l.art),q=parseN(l.cant);if(!a){toast("Elige el artículo de cada línea");return false;}
        if(!(q>0)){toast("Pon la cantidad de "+a.desc);return false;}if(!l.alm){toast("Elige de qué almacén sale "+a.desc);return false;}
        lin.push({k:"a",art:a.id,alm:l.alm,cant:q,pu:precioDe(a)||0});}
      else{const d=String(l.desc||"").trim();if(!d&&!String(l.cant||"").trim()&&!String(l.pu||"").trim())continue;const q=parseN(l.cant),p=parseN(l.pu);
        if(!d){toast("Escribe qué es cada línea escrita a mano");return false;}if(!(q>0)){toast("Pon la cantidad de «"+d+"»");return false;}
        lin.push({k:"m",desc:d,cant:q,pu:isFinite(p)&&p>0?p:0});}}
    if(!lin.length){toast("Añade al menos una línea con lo que se ha perdido");return false;}
    try{const id=ed?x0.id:uid();
      /* fotos */
      let fotos=(s.fotos||[]).slice();if(assets&&files.length){for(const f of files){try{const b=await comprimir(f);const r=await assets.upload(b);fotos.push(r.id);}catch(e){toast("Una foto no se ha podido subir");}}}
      /* si se corrige: fuera las salidas de antes */
      if(ed)for(const l of (x0.lin||[]))if(l.movId)try{await delMov(l.movId,x0.f);}catch(e){}
      const movs=[];const nota="Incidencia: "+(s.tipo==="otro"?String(s.tipoO).trim():incTipo(s))+" · "+String(s.t).trim();
      lin.filter(l=>l.k==="a").forEach(l=>{const m={id:uid(),f:s.f,tipo:"salida",art:l.art,alm:l.alm,cant:l.cant,nave:incCargo(s),inc:id,nota};l.movId=m.id;movs.push(m);});
      if(movs.length)await addMovs(movs);
      const rec={id,f:s.f,tipo:s.tipo,tipoO:s.tipo==="otro"?String(s.tipoO).trim():"",cargo:s.cargo,t:String(s.t).trim(),nota:String(s.nota||"").trim(),fotos,lin,ts:Date.now()};
      if(ed&&x0.por)rec.por=x0.por;
      await incGuarda(L=>ed?L.map(z=>z.id===id?rec:z):L.concat([rec]));
      toast(ed?"Incidencia corregida":"Incidencia apuntada: "+eur(Math.round(incTotal(rec)))+" a "+incCargo(rec));render(true);}
    catch(e){toast("No se pudo guardar la incidencia");return false;}}}]);
  const box=[...document.querySelectorAll(".dlg")].pop();if(box)box.classList.add("dlg-ancho");}

/* ---------- ficha de una incidencia ---------- */
function incFicha(x){x=(INC||[]).find(z=>z.id===x.id)||x;const puede=!window.SOLO_CONSULTA;
  const filas=(x.lin||[]).map(l=>el("tr",{},[el("td",{text:incLinNom(l)+(l.k==="m"?" (escrito a mano)":"")}),el("td",{class:"r",text:fmtN(+l.cant||0)+" "+incLinUd(l)}),
    el("td",{class:"r",text:l.pu?eur(l.pu):"sin precio"}),el("td",{class:"r",text:eur(Math.round(incLinEur(l)*100)/100)})]));
  const fotos=el("div",{class:"inc-fotos"});(x.fotos||[]).forEach(id=>{const im=el("img",{alt:"Foto de la incidencia",loading:"lazy"});Promise.resolve(window.urlFirmada?window.urlFirmada(id):fotoUrl(id)).then(u=>{if(u){im.src=u;im.onclick=()=>lightbox(u);}});fotos.appendChild(im);});
  const body=[el("dl",{class:"bd-kv"},[["Fecha",fmtF(x.f)],["Tipo",incTipo(x)],["Se carga a",incCargo(x)],["Qué ha pasado",x.t||"—"],x.nota?["Nota",x.nota]:null,x.por?["Apuntado por",x.por]:null].filter(Boolean).flatMap(([k,v])=>[el("dt",{text:k}),el("dd",{text:v})])),
    el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Qué"}),el("th",{class:"r",text:"Cantidad"}),el("th",{class:"r",text:"Precio"}),el("th",{class:"r",text:"Valor"})])),el("tbody",{},filas),
      el("tfoot",{},el("tr",{},[el("td",{colspan:"3",text:"Total"}),el("td",{class:"r",text:eur(Math.round(incTotal(x)*100)/100)})]))])),
    (x.fotos||[]).length?fotos:null].filter(Boolean);
  const acts=[{t:"Cerrar",cls:"sec"},{t:"Excel",cls:"sec",fn:async()=>{await incExcel([x],"Incidencia "+fmtF(x.f)+" "+incTipo(x));return false;}},{t:"PDF",cls:"sec",fn:()=>{incImprimir([x],incTipo(x)+" · "+fmtF(x.f));return false;}}];
  if(puede)acts.push({t:"Borrar",cls:"sec peligro",fn:()=>{setTimeout(()=>confirmar("¿Borrar esta incidencia?","Se borra la incidencia y el material del almacén vuelve al stock.","Borrar",async()=>{
      try{for(const l of (x.lin||[]))if(l.movId)try{await delMov(l.movId,x.f);}catch(e){}await incGuarda(L=>L.filter(z=>z.id!==x.id));toast("Incidencia borrada");render(true);}catch(e){toast("No se pudo borrar");return false;}}),0);}},
    {t:"Corregir",fn:()=>{setTimeout(()=>incForm(x),0);}});
  dlg(incTipo(x)+" · "+fmtF(x.f),body,acts);const box=[...document.querySelectorAll(".dlg")].pop();if(box)box.classList.add("dlg-ancho");}

/* ---------- resumen: todas, por mes, por nave, por tipo ---------- */
function incResumen(){const h=hoy();const anos=[...new Set((INC||[]).map(x=>(x.f||"").slice(0,4)).filter(Boolean).concat([h.slice(0,4)]))].sort().reverse();
  const st={ano:h.slice(0,4)};const cont=el("div",{style:"display:flex;flex-direction:column;gap:12px"});
  const pinta=()=>{cont.textContent="";const L=incOrd((INC||[]).filter(x=>st.ano==="todo"||(x.f||"").startsWith(st.ano)));const tot=L.reduce((s,x)=>s+incTotal(x),0);
    cont.appendChild(el("div",{class:"row"},[fld("Año",sel("incAno",anos.map(a=>[a,a]).concat([["todo","Todos"]]),st.ano,v=>{st.ano=v;pinta();}))]));
    cont.appendChild(el("p",{class:"bd-resp",text:L.length?L.length+(L.length===1?" incidencia":" incidencias")+" por "+eur(Math.round(tot))+(st.ano==="todo"?" en total.":" en "+st.ano+"."):"No hay incidencias"+(st.ano==="todo"?".":" en "+st.ano+".")}));
    if(!L.length)return;
    const grupo=(tit,fk,lbl)=>{const G={};L.forEach(x=>{const k=fk(x);const g=G[k]=G[k]||{n:0,e:0};g.n++;g.e+=incTotal(x);});
      return el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:tit})),el("div",{class:"lst"},Object.keys(G).sort().map(k=>el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},[el("div",{class:"t1",text:lbl(k)}),el("div",{class:"t2",text:G[k].n+(G[k].n===1?" incidencia":" incidencias")})]),el("div",{class:"cant num"},[el("b",{text:eur(Math.round(G[k].e))})])])))]);};
    cont.appendChild(el("div",{class:"inc-grupos"},[grupo("Por nave",x=>incCargo(x),k=>k),grupo("Por tipo",x=>incTipo(x),k=>k),grupo("Por mes",x=>(x.f||"").slice(0,7),k=>cap(fmtMes(k)))]));
    cont.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Incidencias"})),el("div",{class:"lst"},L.map(x=>el("button",{type:"button",class:"it",onclick:()=>incFicha(x)},[
      el("div",{class:"ppal"},[el("div",{class:"t1",text:incTipo(x)+" · "+incCargo(x)}),el("div",{class:"t2",text:fmtF(x.f)+" · "+(x.t||"")})]),el("div",{class:"cant num"},[el("b",{text:eur(Math.round(incTotal(x)))})])])))]));
    cont.appendChild(el("div",{class:"acciones acc2"},[el("button",{type:"button",class:"btn sec",text:"Excel",onclick:()=>incExcel(L,"Incidencias "+(st.ano==="todo"?"todas":st.ano))}),
      el("button",{type:"button",class:"btn sec",text:"PDF",onclick:()=>incImprimir(L,"Pérdidas e incidencias "+(st.ano==="todo"?"":st.ano))})]));};
  pinta();dlgAncho("Pérdidas e incidencias",[cont]);}

/* ---------- Excel y PDF ---------- */
async function incExcel(L,titulo){if(!downloads){toast("Esta vista no permite descargar archivos");return;}
  try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new(),r2=v=>Math.round(v*100)/100;const tot=L.reduce((s,x)=>s+incTotal(x),0);
    const res=[["Pérdidas e incidencias · MAPRI"],["",titulo],["Incidencias",L.length],["Valor total (€)",r2(tot)],[]];
    const por=(t,fk)=>{const G={};L.forEach(x=>{const k=fk(x);G[k]=(G[k]||0)+incTotal(x);});res.push([t,""]);Object.keys(G).sort().forEach(k=>res.push([k,r2(G[k])]));res.push([]);};
    por("Por nave (€)",incCargo);por("Por tipo (€)",incTipo);
    const w0=X.utils.aoa_to_sheet(res);w0["!cols"]=[{wch:34},{wch:40}];X.utils.book_append_sheet(wb,w0,"Resumen");
    X.utils.book_append_sheet(wb,X.utils.json_to_sheet(incOrd(L).map(x=>({"Fecha":fmtF(x.f),"Tipo":incTipo(x),"Se carga a":incCargo(x),"Qué ha pasado":x.t||"","Líneas":(x.lin||[]).length,"Valor (€)":r2(incTotal(x)),"Nota":x.nota||"","Apuntado por":x.por||""}))),"Incidencias");
    const det=[];incOrd(L).forEach(x=>(x.lin||[]).forEach(l=>det.push({"Fecha":fmtF(x.f),"Tipo":incTipo(x),"Se carga a":incCargo(x),"Qué ha pasado":x.t||"","Artículo":incLinNom(l),"Origen":l.k==="a"?"Almacén":"Escrito a mano","Almacén":l.k==="a"&&l.alm?((cat.almacenes.find(z=>z.id===l.alm)||{}).nom||""):"","Cantidad":+l.cant||0,"Unidad":incLinUd(l),"Precio (€)":r2(+l.pu||0),"Valor (€)":r2(incLinEur(l))})));
    X.utils.book_append_sheet(wb,X.utils.json_to_sheet(det.length?det:[{"Fecha":"Sin líneas"}]),"Detalle");
    await downloads.save({filename:titulo.replace(/[\\/:*?"<>|«»]/g,"").slice(0,70)+".xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Excel descargado");}
  catch(e){toast("No se pudo crear el Excel");}}
function incImprimir(L,titulo){const esc=t=>String(t==null?"":t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));const tot=L.reduce((s,x)=>s+incTotal(x),0);
  const html="<!doctype html><html lang='es'><head><meta charset='utf-8'><title>"+esc(titulo)+"</title><style>body{font:13px system-ui,sans-serif;color:#111;margin:24px}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:18px 0 6px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:5px 6px;text-align:left}td.r,th.r{text-align:right}.sub{color:#555}</style></head><body>"+
    "<h1>"+esc(titulo)+"</h1><div class='sub'>MAPRI · "+L.length+(L.length===1?" incidencia":" incidencias")+" · valor total "+esc(eur(Math.round(tot*100)/100))+"</div>"+
    incOrd(L).map(x=>"<h2>"+esc(fmtF(x.f)+" · "+incTipo(x)+" · "+incCargo(x))+"</h2><div>"+esc(x.t||"")+(x.nota?" — "+esc(x.nota):"")+"</div><table><tr><th>Qué</th><th class='r'>Cantidad</th><th class='r'>Precio</th><th class='r'>Valor</th></tr>"+
      (x.lin||[]).map(l=>"<tr><td>"+esc(incLinNom(l))+"</td><td class='r'>"+esc(fmtN(+l.cant||0)+" "+incLinUd(l))+"</td><td class='r'>"+esc(l.pu?eur(l.pu):"sin precio")+"</td><td class='r'>"+esc(eur(Math.round(incLinEur(l)*100)/100))+"</td></tr>").join("")+
      "<tr><th colspan='3'>Total</th><th class='r'>"+esc(eur(Math.round(incTotal(x)*100)/100))+"</th></tr></table>").join("")+"</body></html>";
  const fr=el("iframe",{style:"position:fixed;width:0;height:0;border:0;right:0;bottom:0","aria-hidden":"true"});document.body.appendChild(fr);
  const d=fr.contentWindow.document;d.open();d.write(html);d.close();setTimeout(()=>{try{fr.contentWindow.focus();fr.contentWindow.print();}catch(e){toast("No se pudo abrir la impresión");}setTimeout(()=>fr.remove(),60000);},250);}

/* en la pestaña Consumo, la tarjeta va encima de «Consumos apuntados» */
{const _vMovInc=vMov;vMov=function(v,solo){_vMovInc(v,solo);if(!solo)return;const c=cardIncidencias();
  const hs=[...v.querySelectorAll("section.card>.hd>h2")].find(h=>/Consumos apuntados/.test(h.textContent));if(hs)hs.closest("section.card").before(c);else v.appendChild(c);};}

/* ---------- Consultas: preguntas sobre pérdidas e incidencias ---------- */
function intencionInc(q){
  const clave=/\b(incidencias? de (material|almacen)|incidencias?|perdidas?|robos?|robad[oa]s?|robaron|robo|nos (han )?robado|hurtos?|mala manipulacion|mal manipulad\w*|material roto|caducad[oa]s?|estropead[oa]s?)\b/;
  if(!clave.test(q))return null;
  /* los robos y faltas apuntados como recuento tienen su propia respuesta: si se pregunta por recuentos, o si aún no hay
     ninguna incidencia apuntada, contesta esa */
  if(/\brecuentos?\b|\bdescuadr\w*|\bmermas?\b/.test(q))return null;
  if(!(INC||[]).length&&/\brob(o|os|ad[oa]s?|aron|ado)\b|\bhurt\w*|\bperdid[oa]s?\b|\bperdidas\b/.test(q))return null;
  /* «pérdida de aceite» o «incidencias del material» de una máquina no son esto */
  if(/\b(fugas?|perdidas? de (aceite|agua|taladrina|presion))\b/.test(q)&&!/\b(robo|robad|manipulacion|incidencia)\w*/.test(q))return null;
  if(/\bincidencias?\b/.test(q)&&!/\b(perdid|rob|manipul|caduc|estropead|material|almacen|cargad|valor|cuanto|cuantas|nave|planta|mes|ano|semana|todas|ultim)\w*/.test(q))return null;
  const o={};
  o.tipo=/\b(rob\w*|hurt\w*)\b/.test(q)?"robo":/\b(manipul\w*|roto|rotos|rotura\w*|romp\w*)\b/.test(q)?"manip":/\b(caducad\w*|estropead\w*)\b/.test(q)?"cad":null;
  o.cargo=/\b(toda la planta|planta entera|toda la fabrica|general)\b/.test(q)?"PL":/\bnave\s*(1a|1b|1)\b/.test(q)?"N1":/\bnave\s*2\b/.test(q)?"N2":null;
  o.ver=/\b(que articulos?|que material(es)?|que (se )?(han |ha )?(robado|roto|perdido|llevado|rompe|pierde|roba)\w*|que se (robo|rompio|perdio|llevaron)|lo que (se )?(robaron|han robado|ha robado|rompieron)|lo mas|mas (robado|roto|perdido)|que es lo que)\b/.test(q)?"art":
    /\b(por mes|cada mes|mensual\w*|al mes)\b/.test(q)?"mes":/\b(por nave|cada nave|por naves)\b/.test(q)?"nave":/\b(por tipo|de cada tipo|tipos)\b/.test(q)?"tipo":
    /\b(ultim[oa]|mas reciente)\b/.test(q)?"ult":"lista";
  o.finde=/\b(este |el |ultimo )?fin de semana\b/.test(q);
  return o;}
function pintaIncQ(I,P,ctx){const {add,frase,nota,ent,lista,it}=ctx;const h=hoy(),o=I.inc||{};
  let per=P;if(o.finde){const d=new Date(h+"T12:00:00"),dw=d.getDay();const sab=dw===6?h:dw===0?sumaDias(h,-1):sumaDias(h,-(dw+1));per={d:sab,h:sumaDias(sab,1),t:"el fin de semana ("+fmtF(sab)+" y "+fmtF(sumaDias(sab,1))+")"};}
  else if(P.def)per={d:h.slice(0,4)+"-01-01",h,t:"este año"};
  const T=o.tipo?(INC_TIPOS.find(t=>t[0]===o.tipo)||[])[1]:null,C=o.cargo?(INC_CARGO.find(c=>c[0]===o.cargo)||[])[1]:null;
  ent("pérdidas e incidencias",[T,C,per.t]);
  const L=incOrd((INC||[]).filter(x=>x.f>=per.d&&x.f<=per.h&&(!o.tipo||x.tipo===o.tipo)&&(!o.cargo||x.cargo===o.cargo)));const tot=L.reduce((s,x)=>s+incTotal(x),0);
  if(!L.length){frase("No hay "+(T?T.toLowerCase().replace(/^rotura/,"roturas").replace(/^robo$/,"robos"):"incidencias")+" apuntad"+(T==="Robo"?"os":"as")+(C?" cargad"+(T==="Robo"?"os":"as")+" a "+C:"")+" "+per.t+".");
    if(!(INC||[]).length)nota("Se apuntan en Consumo › Pérdidas e incidencias.");return;}
  const nT={};L.forEach(x=>{const k=incTipo(x);nT[k]=(nT[k]||0)+1;});
  frase((o.ver==="ult"?"La última fue el "+fmtF(L[0].f)+": "+incTipo(L[0]).toLowerCase()+" («"+(L[0].t||"")+"»), cargada a "+incCargo(L[0])+", por "+eur(Math.round(incTotal(L[0])))+". ":"")+
    L.length+(L.length===1?" incidencia":" incidencias")+" "+per.t+" por "+eur(Math.round(tot))+(Object.keys(nT).length>1?" ("+Object.entries(nT).map(([k,n])=>n+" "+k.toLowerCase()).join(", ")+")":"")+".");
  {const G={};L.forEach(x=>{const k=incCargo(x);G[k]=(G[k]||0)+incTotal(x);});if(!o.cargo&&Object.keys(G).length>1)nota("Por nave: "+Object.entries(G).map(([k,e])=>k+" "+eur(Math.round(e))).join(" · ")+".");}
  const fila=x=>it(incTipo(x)+" · "+incCargo(x),[fmtF(x.f)+" · "+(x.t||""),(x.lin||[]).slice(0,3).map(incLinNom).join(", ")+((x.lin||[]).length>3?"…":"")],eur(Math.round(incTotal(x))),null,()=>incFicha(x),x.tipo==="robo"?"bad":"warn");
  if(o.ver==="art"){const G={};L.forEach(x=>(x.lin||[]).forEach(l=>{const k=incLinNom(l);const g=G[k]=G[k]||{c:0,e:0,ud:incLinUd(l),n:0};g.c+=+l.cant||0;g.e+=incLinEur(l);g.n++;}));
    const A=Object.entries(G).sort((a,b)=>b[1].e-a[1].e||b[1].c-a[1].c);if(A.length)frase("Lo que más valor ha perdido es "+A[0][0]+": "+fmtN(A[0][1].c)+" "+A[0][1].ud+" ("+eur(Math.round(A[0][1].e))+").");
    lista("Qué se ha perdido",A.map(([k,g])=>it(k,g.n+(g.n===1?" vez":" veces"),eur(Math.round(g.e)),fmtN(g.c)+" "+g.ud)));}
  else if(o.ver==="mes"||o.ver==="nave"||o.ver==="tipo"){const fk=o.ver==="mes"?x=>(x.f||"").slice(0,7):o.ver==="nave"?incCargo:incTipo;const G={};L.forEach(x=>{const k=fk(x);const g=G[k]=G[k]||{n:0,e:0};g.n++;g.e+=incTotal(x);});
    lista(o.ver==="mes"?"Por mes":o.ver==="nave"?"Por nave":"Por tipo",Object.keys(G).sort().map(k=>it(o.ver==="mes"?cap(fmtMes(k)):k,G[k].n+(G[k].n===1?" incidencia":" incidencias"),eur(Math.round(G[k].e)))));}
  lista("Incidencias",L.slice(0,60).map(fila),L.length>60?"las 60 más recientes":null);
  {const rr=todosMov().some(m=>m.tipo==="ajuste"&&(+m.cant||0)<0&&/\brob|\bhurt/i.test(m.nota||""));if(rr&&(!o.tipo||o.tipo==="robo"))add(el("button",{type:"button",class:"btn sec",style:"margin-top:8px",text:"Ver también los robos apuntados como recuento",onclick:()=>ctx.pon("material robado en los recuentos "+(P.def?"":per.t))}));}
  add(el("div",{class:"acciones acc2",style:"margin-top:8px"},[el("button",{type:"button",class:"btn sec",text:"Excel",onclick:()=>incExcel(L,"Incidencias "+per.t)}),el("button",{type:"button",class:"btn sec",text:"PDF",onclick:()=>incImprimir(L,"Pérdidas e incidencias · "+per.t)})]));}

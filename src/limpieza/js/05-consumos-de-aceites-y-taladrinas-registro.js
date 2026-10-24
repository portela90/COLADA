/* ---------- consumos de aceites y taladrinas: registro del día e informe para Beatriz ----------
   Cada OT habitual con artículo de almacén que pasa a «hecha» deja una línea en el registro
   (servidor). Aquí solo se lee: el informe no cambia el stock. */
const kgTxt=n=>(Math.round((+n||0)*100)/100).toLocaleString("es-ES",{maximumFractionDigits:2});
const ENVIO={enviado:["Enviado al Almacén","ok"],pendiente:["Enviando…","info"],fallo:["Sin enviar al Almacén","bad"],sin_enviar:["Sin enviar al Almacén","bad"]};
const porNave=R=>{const g={};R.forEach(r=>{(g[r.nave||""]=g[r.nave||""]||[]).push(r);});return Object.keys(g).sort((a,b)=>(a||"z").localeCompare(b||"z")).map(k=>[k,g[k]]);};
function textoConsumos(C){const f=C.fecha,L=C.lineas||[];
  const T=["CONSUMOS DE ACEITES Y TALADRINAS · "+fLarga(f),""];
  if(!L.length){T.push("Hoy no se ha consumido ningún aceite ni taladrina.");return T.join("\n");}
  const G={};L.forEach(x=>{const k=x.articulo||"";const g=G[k]=G[k]||{t:0,ud:x.ud||"kg",p:[]};if(x.cant!=null)g.t+=+x.cant;
    const lug=x.lugar||x.nave||"sin lugar";g.p.push(lug+(x.fecha?" ("+fDM(x.fecha)+")":""));});
  Object.keys(G).sort().forEach(k=>{const g=G[k];T.push(k+": "+kgTxt(g.t)+" "+g.ud);[...new Set(g.p)].forEach(p=>T.push("   · "+p));});
  if(L.some(x=>x.fecha&&x.fecha<f))T.push("","Incluye consumos pendientes de días anteriores.");
  return T.join("\n");}
async function pdfConsumos(C){await libPDF();const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"mm",format:"a4"});const W=210,M=14,AZ=[31,78,121];const f=C.fecha,L=C.lineas||[],R=C.resumen||[];
  doc.setFillColor(...AZ);doc.rect(0,0,W,24,"F");doc.setTextColor(255);doc.setFont("helvetica","bold");doc.setFontSize(15);doc.text(pdfTxt("Consumos de aceites y taladrinas"),M,11);
  doc.setFont("helvetica","normal");doc.setFontSize(10);doc.text(pdfTxt("Limpieza CIE  ·  "+fLarga(f)+" de "+f.slice(0,4)),M,18);doc.setTextColor(0);let y=32;
  const tabla=(t,head,body,opt)=>{doc.setFont("helvetica","bold");doc.setFontSize(12);doc.setTextColor(...AZ);doc.text(pdfTxt(t),M,y);doc.setTextColor(0);y+=4;
    doc.autoTable(Object.assign({startY:y,head:[head],body:body.map(r=>r.map(pdfTxt)),margin:{left:M,right:M},styles:{fontSize:9,cellPadding:1.8,overflow:"linebreak"},headStyles:{fillColor:AZ,textColor:255,fontStyle:"bold"},alternateRowStyles:{fillColor:[245,248,251]}},opt||{}));y=doc.lastAutoTable.finalY+9;};
  if(!L.length){doc.setFontSize(11);doc.text(pdfTxt("Hoy no se ha registrado ningún consumo."),M,y);}
  else{const tot=R.reduce((s,r)=>s+(+r.total||0),0);
    const filas=[];porNave(R).forEach(([n,rs])=>{rs.forEach(r=>filas.push([n||"Sin nave",r.articulo,kgTxt(r.total)+" "+r.ud,String(r.tareas)]));filas.push(["Total "+(n||"sin nave"),"",kgTxt(rs.reduce((a,r)=>a+(+r.total||0),0))+" kg",String(rs.reduce((a,r)=>a+(+r.tareas||0),0))]);});
    filas.push(["TOTAL","",kgTxt(tot)+" kg",String(L.length)]);
    tabla("Resumen por nave",["Nave","Artículo","Total","Cambios"],filas,{columnStyles:{0:{cellWidth:24},2:{halign:"right"},3:{halign:"right"}},didParseCell:d=>{if(d.section==="body"&&/^Total|^TOTAL/.test(String(d.row.raw[0])))d.cell.styles.fontStyle="bold";}});
    tabla("Detalle de cada cambio",["Hora","Nave","Tarea","Artículo","Cantidad","Responsable"],L.map(x=>[hora(x.cuando),x.nave||"—",x.ot||x.tarea,x.articulo,x.cant!=null?kgTxt(x.cant)+" "+x.ud:"—",x.quien||"—"]),{columnStyles:{0:{cellWidth:13},1:{cellWidth:16},4:{halign:"right",cellWidth:20}}});}
  return doc.output("blob");}
function formDestConsumos(d,re){const x=Object.assign({nom:"",email:"",tel:""},d||{});
  dlg("¿A quién va el informe?",el("div",null,[fld("Nombre",inp(x.nom,v=>x.nom=v)),fld("Correo",inp(x.email,v=>x.email=v,{type:"email",autocomplete:"off"})),fld("Teléfono (WhatsApp)",inp(x.tel,v=>x.tel=v,{type:"tel",autocomplete:"off"}))]),
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{await rpc("consumos_dest_guardar",{p_tok:S.tok,p:x});toast("Guardado");re();}}]);}
function informeConsumos(C,re){const d=C.dest||{};const txt=textoConsumos(C);const asunto="Consumos de aceites y taladrinas · "+fDMA(C.fecha);
  const ta=el("textarea",{rows:12,style:"width:100%;font:13px/1.4 ui-monospace,Menlo,monospace"});ta.value=txt;
  const tel=String(d.tel||"").replace(/\D/g,"");const telWa=tel?(tel.length===9?"34"+tel:tel):"";
  const copiar=async()=>{try{await navigator.clipboard.writeText(ta.value);toast("Informe copiado");}catch(e){ta.focus();ta.select();toast("Selecciona el texto y cópialo");}};
  const pdf=async()=>{try{const b=await pdfConsumos(C);bajar(b,"consumos-aceites-"+C.fecha+".pdf");}catch(e){toast(e.message);}};
  dlg("Informe del día · "+fDM(C.fecha),el("div",null,[
    el("p",{class:"hint",text:"Para "+(d.nom||"(sin destinatario)")+". Solo lleva los consumos de hoy y no cambia el stock."}),ta,
    el("div",{class:"row",style:"margin-top:10px"},[
      el("button",{class:"btn",text:"Correo",onclick:()=>{location.href="mailto:"+encodeURIComponent(d.email||"")+"?subject="+encodeURIComponent(asunto)+"&body="+encodeURIComponent(ta.value);}}),
      el("button",{class:"btn",text:"WhatsApp",onclick:()=>{window.open("https://wa.me/"+telWa+"?text="+encodeURIComponent(ta.value),"_blank","noopener");}})]),
    el("div",{class:"row",style:"margin-top:8px"},[el("button",{class:"btn sec",text:"Copiar texto",onclick:copiar}),el("button",{class:"btn sec",text:"PDF",onclick:pdf})]),
    el("p",{class:"hint",style:"margin-top:8px",text:"Si cambias el texto aquí, usa «Copiar texto» y pégalo donde quieras. Los consumos que no marques como enviados se siguen arrastrando al día siguiente."})]),
    [{t:"Cerrar",cls:"sec"},{t:"Ya lo he enviado",cls:"ok",fn:async()=>{try{const n=await rpc("consumos_marcar_informado",{p_tok:S.tok,p_fecha:C.fecha});toast(n?"Informe marcado como enviado ("+n+" consumos)":"No había consumos pendientes");if(re)re();}catch(e){toast(e.message);return false;}}}]);}
async function bloqueConsumos(box,f){const re=()=>bloqueConsumos(box,f);let C;
  try{C=await rpc("consumos_dia",{p_tok:S.tok,p_fecha:f});}catch(e){box.textContent="";return;}
  box.textContent="";const L=C.lineas||[],R=C.resumen||[],hoy=f===hoyISO();
  const tot=R.reduce((s,r)=>s+(+r.total||0),0),mal=L.filter(x=>x.envio==="fallo"||x.envio==="sin_enviar");
  const fila=x=>{const[e,c]=ENVIO[x.envio]||["",""];return el("div",{class:"linea",style:"border-top:1px solid var(--line);padding:8px 0"},[
    el("span",{style:"flex:1;min-width:60%"},[el("b",{text:hora(x.cuando)+" · "+(x.ot||x.tarea)}),el("br"),el("small",{class:"hint",text:[x.nave,x.articulo,x.quien||"sin indicar"].filter(Boolean).join(" · ")})]),
    el("b",{text:x.cant!=null?kgTxt(x.cant)+" "+x.ud:"—"}),x.envio!=="enviado"?el("span",{class:"pill "+c,text:e}):null,
    x.nave?null:el("div",{style:"display:flex;gap:6px;align-items:center;width:100%"},[el("span",{class:"pill warn",text:"¿Qué nave?"}),
      ...["Nave 1","Nave 2"].map(n=>el("button",{class:"btn sec peq",text:n,onclick:async e=>{e.target.disabled=true;try{await rpc("consumo_nave",{p_tok:S.tok,p_ot:x.ot_id,p_nave:n});toast("Cargado a "+n);re();}catch(er){toast(er.message);e.target.disabled=false;}}}))])]);};
  if(L.some(x=>x.envio==="pendiente")&&!box._t)box._t=setTimeout(()=>{box._t=null;if(box.isConnected)re();},5000);
  const cuerpo=el("div",{class:"bd",style:"padding:0 14px 12px"},[
    L.length?el("table",null,[el("thead",null,el("tr",null,["Nave","Artículo","Total","Cambios"].map(h=>el("th",{text:h})))),
      el("tbody",null,R.map(r=>el("tr",null,[el("td",{text:r.nave||"¿?"}),el("td",{text:r.articulo}),el("td",{text:kgTxt(r.total)+" "+r.ud}),el("td",{text:String(r.tareas)})])))]):el("p",{class:"hint",text:hoy?"Todavía no se ha cambiado ningún bidón ni GRG hoy.":"Ese día no se registró ningún consumo."}),
    L.length?el("div",{style:"margin-top:8px"},L.filter(x=>!mal.includes(x)).map(fila)):null,
    mal.length?el("div",{style:"margin-top:10px"},[el("div",{class:"aviso"},[(mal.length===1?"1 consumo no ha llegado":mal.length+" consumos no han llegado")+" al Almacén",el("small",{text:"Están en el registro y salen en el informe, pero no han descontado stock."})]),
      mal.map(fila),hoy?el("button",{class:"btn sec peq",style:"margin-top:8px",text:"↻ Reintentar envío al Almacén",onclick:async e=>{e.target.disabled=true;try{const n=await rpc("consumos_reenviar",{p_tok:S.tok});toast(n?"Reenviados "+n:"Nada que reenviar");setTimeout(re,2500);}catch(er){toast(er.message);e.target.disabled=false;}}}):el("p",{class:"hint",text:"Solo se pueden reenviar los de hoy. Los de otros días, apúntalos a mano en el Almacén si hace falta."})]):null,
    el("div",{class:"row",style:"margin-top:12px"},[hoy?el("button",{class:"btn",text:"Generar informe del día",onclick:()=>informeConsumos(C,re)}):null,
      el("button",{class:"btn sec peq",text:"Para: "+((C.dest&&C.dest.nom)||"elegir"),onclick:()=>formDestConsumos(C.dest,re)})])]);
  const det=el("details",{class:"card",open:S.consAb?true:null,ontoggle:e=>{S.consAb=e.target.open;}},[
    el("summary",{class:"hd",style:"cursor:pointer;list-style:none"},[el("h2",{text:"Aceites y taladrinas"}),
      mal.length?el("span",{class:"pill bad",text:mal.length+" sin enviar"}):null,
      L.some(x=>!x.nave)?el("span",{class:"pill warn",text:L.filter(x=>!x.nave).length+" sin nave"}):null,
      el("span",{class:"pill"+(L.length?" ok":""),text:L.length?kgTxt(tot)+" kg · "+L.length:"0"})]),cuerpo]);
  box.appendChild(det);}
/* ---------- modo sencillo (operario con dificultades para leer) ---------- */
// Solo para este operario. Lo que sale aquí es una lista cerrada por id de catálogo.
// nave = pregunta nave · fijo = lugar ya establecido · incidencia = foto + nave + lugar
const SENCILLO_ID="761f78ab-1009-4566-87ee-51f48152dba2";
const SENCILLO_CAT=[
  ["8c1786a2-0221-42c1-8647-9a161d565352","nave"],        // Chem-Trend SU-124
  ["6d64b9b8-eee6-4e8e-ba79-8dff17ac7c29","nave"],        // Cimclean PC240
  ["c4666913-2e8f-4d09-9d02-3150b3f0145d","nave"],        // Ecocool MS 831
  ["6111caaf-e08b-4d41-bcf3-905860ae370c","nave"],        // Servol 353
  ["7d0851cf-6805-4528-9ff2-ce01357e948d","nave"],        // Bonderite C-AK
  ["922ae214-9516-466f-ac78-b2a446ad2035","nave"],        // Saca blanca
  ["8ee7a1a1-1c8f-42bc-ac75-911aafedbb29","fijo"],        // GRG Metalform V 106
  ["a18205a7-be51-4e01-802e-48013655bc04","fijo"],        // GRG Avilub HLP-M 46
  ["dc0efc54-17ec-46ce-ae7f-9932a30509fe","fijo"],        // GRG Besterm HT
  ["e581059f-19d1-4c0c-a95a-9a215477ed3f","fijo"],        // GRG Avilub Gear 220
  ["87c44988-d7c1-40fd-95da-3eb3170a95a6","fijo"],        // Vaciar retenedores
  ["711a970a-e0a0-4af3-b94d-6185ae6615d0","fijo"],        // Limpiar pasillos Nave 1
  ["e9090bee-5862-4220-9221-cd2fd7a42179","incidencia"],  // Derrame de aceite
  ["ad73e5b4-94c1-4248-a9c5-d036a007e57b","incidencia"],  // Derrame de taladrina
  ["c1d9c4cf-0182-4763-a434-f63e8545fc13","incidencia"],  // Filtración de agua
  ["d97512fc-3793-4e86-836e-d30eafefe560","incidencia"]   // Depósito desbordado
];
// Foto del icono de cada trabajo del catálogo (en img/sencillo/). Sin foto = solo texto.
const SENCILLO_FOTO={"8c1786a2-0221-42c1-8647-9a161d565352":"chem-trend.jpg","6d64b9b8-eee6-4e8e-ba79-8dff17ac7c29":"cimclean-pc240.jpg","c4666913-2e8f-4d09-9d02-3150b3f0145d":"ecocool-831.jpg","6111caaf-e08b-4d41-bcf3-905860ae370c":"servol-353.jpg","7d0851cf-6805-4528-9ff2-ce01357e948d":"bonderite-c-ak.jpg","922ae214-9516-466f-ac78-b2a446ad2035":"saca-blanca.jpg","8ee7a1a1-1c8f-42bc-ac75-911aafedbb29":"metalflow.jpg","a18205a7-be51-4e01-802e-48013655bc04":"avilub-hlp-46.jpg","dc0efc54-17ec-46ce-ae7f-9932a30509fe":"besterm.jpg","e581059f-19d1-4c0c-a95a-9a215477ed3f":"gear-avia-220.jpg","e9090bee-5862-4220-9221-cd2fd7a42179":"derrame-aceite.jpg","d97512fc-3793-4e86-836e-d30eafefe560":"deposito-desbordado.jpg","c1d9c4cf-0182-4763-a434-f63e8545fc13":"filtracion-agua.jpg","ad73e5b4-94c1-4248-a9c5-d036a007e57b":"derrame-taladrina.jpg"};
const fotoSencillo=id=>SENCILLO_FOTO[id]?el("img",{src:"img/sencillo/"+SENCILLO_FOTO[id],alt:"",style:"width:100%;max-width:100%;height:auto;max-height:200px;object-fit:contain;background:#fff;border-radius:10px;display:block;margin-bottom:8px"}):null;
function esSencillo(){return !!S.yo&&S.yo.id===SENCILLO_ID&&!S.verOp;}
async function vSencillo(v){
  const f=hoyISO();
  v.appendChild(el("h1",{style:"font-size:26px;margin:4px 0 2px",text:"Hola, "+S.yo.nombre.split(" ")[0]}));
  v.appendChild(el("p",{class:"sub",text:fLarga(f)}));
  v.appendChild(el("p",{class:"hint",text:"Modo sencillo en prueba: todavía no se guarda nada."}));
  const fb=el("div"),hb=el("div");
  v.appendChild(el("h2",{style:"font-size:20px",text:"Tareas de hoy"}));v.appendChild(fb);
  v.appendChild(el("button",{class:"btn grande",style:"width:100%;margin:14px 0",text:"+ Trabajo que he hecho",onclick:()=>catalogoSencillo()}));
  v.appendChild(el("h2",{style:"font-size:20px",text:"Lo que llevo hecho hoy"}));v.appendChild(hb);
  let R;try{R=await rpc("ots_dia",{p_tok:S.tok,p_fecha:f});}catch(e){fb.appendChild(el("div",{class:"empty",text:e.message}));return;}
  const mias=(R.dia||[]).filter(o=>!!o.todo_equipo||(o.asignados||[]).includes(S.yo.id)||(o.nombres||[]).includes(S.yo.nombre)||cubroYo(o));
  // Solo añade una foto a la OT: no cambia su estado ni el almacén
  const subirFoto=o=>el("label",{class:"btn grande sec",style:"display:block;text-align:center;cursor:pointer;margin:10px 0"},["Añadir foto",
    el("input",{type:"file",accept:"image/*",capture:"environment",style:"display:none",onchange:async e=>{const f=e.target.files[0];if(!f)return;try{await guardarFoto(o.id,await comprime(f));toast("Foto guardada");}catch(er){toast(er.message);}}})]);
  const linea=o=>el("div",{class:"ot",style:"cursor:pointer",onclick:()=>dlg(o.titulo,el("div",null,[fotoSencillo(o.habitual_id),el("p",{text:[o.descripcion,o.lugar,o.minutos_est?durTxt(o.minutos_est):""].filter(Boolean).join(" · ")}),subirFoto(o)].filter(Boolean)),[...(o.estado!=="hecha"?[{t:"Hecha",fn:async()=>{await rpc("terminar_ot",{p_tok:S.tok,p_ot:o.id,p_minutos:o.minutos_est||30,p_nota:null});toast("Hecha");pinta();}}]:[]),{t:"Volver",cls:"sec"}])},
    [fotoSencillo(o.habitual_id),el("div",{class:"t",text:o.titulo}),el("div",{class:"d",text:(o.minutos_est?durTxt(o.minutos_est)+" · ":"")+(o.lugar||"")+(cubroYo(o)?" · cubres a "+cubroYo(o).split(" ")[0]:"")})].filter(Boolean));
  const pend=mias.filter(o=>o.estado!=="hecha"),hech=mias.filter(o=>o.estado==="hecha");
  fb.appendChild(pend.length?el("div",{class:"card"},pend.map(linea)):el("div",{class:"empty",text:"Hoy no tienes tareas pendientes."}));
  hb.appendChild(hech.length?el("div",{class:"card"},hech.map(linea)):el("div",{class:"empty",text:"Todavía no has hecho nada hoy."}));
}
async function catalogoSencillo(){
  const H=(await habituales(true).catch(()=>[]))||[];
  const items=SENCILLO_CAT.map(([id,m])=>({m,h:H.find(x=>x.id===id)})).filter(x=>x.h);
  const grid=el("div",{style:"display:grid;grid-template-columns:1fr 1fr;gap:10px"},items.map(x=>el("button",{class:"btn grande sec",style:"text-align:left;white-space:normal;min-height:88px;font-size:17px",onclick:()=>{cerrarTodo();setTimeout(()=>pasoSencillo(x,{}),0);}},[fotoSencillo(x.h.id),el("span",{text:x.h.titulo})].filter(Boolean))));
  dlg("¿Qué has hecho?",el("div",null,[grid]),[{t:"Cerrar",cls:"sec"}]);
}
async function pasoSencillo(x,st){
  const m=x.m,h=x.h,cont=el("div");
  const Z=m==="incidencia"?((await zonasL().catch(()=>[]))||[]):[];
  const botonNave=n=>el("button",{class:"btn grande"+(st.nave===n?"":" sec"),style:"width:100%;margin:4px 0",text:n,onclick:()=>{cerrarTodo();setTimeout(()=>pasoSencillo(x,Object.assign({},st,{nave:n})),0);}});
  if(fotoSencillo(h.id))cont.appendChild(fotoSencillo(h.id));
  if(h.minutos_est)cont.appendChild(el("p",{class:"hint",text:durTxt(h.minutos_est)}));
  if(m==="fijo")cont.appendChild(el("p",{text:"Lugar: "+(h.lugar||"")}));
  if(m==="nave"||m==="incidencia"){cont.appendChild(el("p",{class:"hint",text:(m==="incidencia"?"2. ":"")+"¿En qué nave?"}));cont.appendChild(el("div",null,[botonNave("Nave 1"),botonNave("Nave 2")]));}
  if(m==="incidencia"){
    cont.appendChild(el("p",{class:"hint",text:"1. Foto (obligatoria)"}));
    cont.appendChild(el("label",{class:"btn grande sec",style:"display:block;text-align:center;cursor:pointer"},[st.file?"Foto hecha ✓":"Hacer foto",
      el("input",{type:"file",accept:"image/*",capture:"environment",style:"display:none",onchange:e=>{const f=e.target.files[0];if(f){cerrarTodo();setTimeout(()=>pasoSencillo(x,Object.assign({},st,{file:f})),0);}}})]));
    cont.appendChild(el("p",{class:"hint",text:"3. ¿En qué lugar de la nave?"}));
    const zl=el("div",{style:"max-height:40vh;overflow:auto;display:grid;grid-template-columns:1fr 1fr;gap:6px"});
    [...new Set(Z.map(z=>z.grupo))].forEach(g=>{
      zl.appendChild(el("p",{class:"hint",style:"grid-column:1/3;margin:6px 0 0",text:g}));
      Z.filter(z=>z.grupo===g).forEach(z=>zl.appendChild(el("button",{class:"btn "+(st.lugar===z.nombre?"":"sec"),style:"margin:0;font-size:16px;padding:12px 6px",text:z.nombre,onclick:()=>{cerrarTodo();setTimeout(()=>pasoSencillo(x,Object.assign({},st,{lugar:z.nombre})),0);}})));
    });
    cont.appendChild(zl);
    if(!Z.length)cont.appendChild(el("p",{class:"hint",text:"No se han cargado las zonas. Cierra y vuelve a intentarlo."}));
  }
  if(m==="nave"&&st.nave)cont.appendChild(el("p",{class:"hint",text:"Nave elegida: "+st.nave}));
  dlg(h.titulo,cont,[{t:"Guardar",fn:()=>guardarSencillo(x,st)},{t:"Volver",cls:"sec"}]);
}
// Guarda el trabajo ya hecho con las mismas funciones que la app (ot_abrir y foto_add)
async function guardarSencillo(x,st){
  const m=x.m,h=x.h;
  const completo=m==="fijo"||(m==="nave"?!!st.nave:(!!st.nave&&!!st.file&&!!st.lugar));
  if(!completo){toast(m==="incidencia"?"Faltan la foto, la nave o el lugar":"Elige la nave");return false;}
  const p={habitual_id:h.id,hecha:true,nave:st.nave||null,lugar:m==="fijo"?(h.lugar||null):(m==="nave"?st.nave:st.lugar)};
  let r;try{r=await rpc("ot_abrir",{p_tok:S.tok,p:p});}catch(e){toast(e.message);return false;}
  if(st.file){try{await guardarFoto(r.id,await comprime(st.file));}catch(e){toast("Guardado, pero la foto no: "+e.message);}}
  toast("Guardado");S.fecha=hoyISO();pinta();
}


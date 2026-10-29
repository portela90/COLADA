/* ---------------- CHECKLIST FIN DE SEMANA ---------------- */
let CK_FECHA=null;
async function vCheck(v){if(IR.c){CK_FECHA=IR.c;IR.c=null;}const f=CK_FECHA||(dow(hoyISO())%6===0?hoyISO():sabado());CK_FECHA=f;
  const fI=el("input",{type:"date",class:"x",value:f,onchange:()=>{if(fI.value){CK_FECHA=fI.value;pinta();}}});
  v.appendChild(el("div",{class:"row",style:"margin:0 0 10px;align-items:center"},[el("b",{style:"flex:2",text:fLarga(f)}),fI]));
  if(dow(f)%6!==0)v.appendChild(el("p",{class:"hint",text:"Ojo: este día no es fin de semana."}));
  const box=el("div",null,el("div",{class:"card"},el("div",{class:"empty",text:"Cargando…"})));v.appendChild(box);
  let R;try{R=await rpc("enc_check_ver",{p_tok:S.tok,p_fecha:f});}catch(e){box.textContent=e.message;return;}
  box.textContent="";
  const prev=R.check;const prevIt={};((prev&&prev.items)||[]).forEach(i=>prevIt[i.id]=i);
  /* puntos activos + los que ya se guardaron ese día aunque luego se quitaran */
  const items=R.puntos.map(p=>Object.assign({id:p.id,grupo:p.grupo,texto:p.texto,tipo:p.tipo||"ok",ayuda:p.ayuda,minimo:p.minimo,foto_si_mal:!!p.foto_si_mal,estado:null,valor:"",nota:"",foto:null},
    prevIt[p.id]?{estado:prevIt[p.id].estado,valor:prevIt[p.id].valor==null?"":String(prevIt[p.id].valor),nota:prevIt[p.id].nota||"",foto:prevIt[p.id].foto||null}:{}));
  ((prev&&prev.items)||[]).forEach(i=>{if(!items.some(x=>x.id===i.id))items.push(Object.assign({tipo:"ok",valor:"",nota:""},i,{valor:i.valor==null?"":String(i.valor),nota:i.nota||""}));});
  const oblig=items.filter(i=>i.tipo!=="txt");
  let nota=(prev&&prev.nota)||"";let cambiado=false;
  if(prev)box.appendChild(el("div",{class:"meta",style:"margin:0 0 8px"},[el("span",{class:"pill "+(prev.cerrado?"ok":"warn"),text:prev.cerrado?"Terminado":"A medias (guardado)"}),el("span",{text:"Por "+nom1(prev.hecho_por_n)+" · "+cuando(prev.actualizado)})]));
  if(!items.length){box.appendChild(el("div",{class:"card"},el("div",{class:"empty",text:esJefe()?"Todavía no hay puntos. Ponlos en Ajustes.":"Todavía no hay puntos en el checklist."})));return;}
  const bar=el("i",{style:"width:0%"}),cnt=el("span");
  const prog=()=>{const n=oblig.filter(i=>i.estado).length;bar.style.width=Math.round(n*100/Math.max(1,oblig.length))+"%";const m=items.filter(i=>i.estado==="mal").length;cnt.textContent=n+" de "+oblig.length+" revisados"+(m?" · "+m+" con problema":"");};
  box.appendChild(el("div",{class:"prog"},[el("div",{class:"bar"},bar),el("div",{class:"meta",style:"margin-top:4px"},cnt)]));
  const card=el("div",{class:"card"});box.appendChild(card);let g=null;
  items.forEach(it=>{if(it.grupo!==g){g=it.grupo;card.appendChild(el("div",{class:"grp",text:g}));}card.appendChild(punto(it,()=>{cambiado=true;prog();}));});
  prog();
  box.appendChild(el("div",{class:"card"},el("div",{class:"bd"},fld("Nota general (opcional)",area(nota,x=>{nota=x;cambiado=true;},3)))));
  const guarda=async cerrar=>{const falta=oblig.filter(i=>!i.estado);
    if(cerrar&&falta.length){toast("Falta por marcar: "+falta[0].texto);return;}
    const sinExp=items.find(i=>i.estado==="mal"&&i.tipo==="ok"&&!i.nota.trim()&&!i.foto);if(cerrar&&sinExp){toast("Explica qué pasa o pon una foto: "+sinExp.texto);return;}
    const sinFoto=items.find(i=>i.estado==="mal"&&i.foto_si_mal&&!i.foto);if(cerrar&&sinFoto){toast("Pon una foto: "+sinFoto.texto);return;}
    try{await rpc("enc_check_guardar",{p_tok:S.tok,p_fecha:f,p_items:items.filter(i=>i.estado).map(i=>({id:i.id,grupo:i.grupo,texto:i.texto,tipo:i.tipo,estado:i.estado,valor:i.tipo==="ok"?null:(i.tipo==="num"?Number(i.valor):i.valor.trim()),minimo:i.minimo==null?null:i.minimo,nota:i.nota.trim()||null,foto:i.foto||null})),p_nota:nota,p_cerrar:!!cerrar});
      cambiado=false;toast(cerrar?(esJefe()?"Guardado":"Enviado a Cristian "):"Guardado. Puedes seguir luego.");re();}catch(e){toast(e.message);}};
  box.appendChild(el("div",{class:"row",style:"margin:0 0 14px"},[el("button",{class:"btn sec",text:"Guardar y seguir luego",onclick:()=>guarda(false)}),el("button",{class:"btn ok",text:"Terminar y enviar",onclick:()=>guarda(true)})]));
  window.onbeforeunload=()=>cambiado?"":undefined;
  /* historial */
  const hist=el("details",{class:"card"},[el("summary",{class:"hd",style:"cursor:pointer"},el("h2",{text:"Checklists anteriores"})),el("div",{class:"empty",text:"Cargando…"})]);box.appendChild(hist);
  rpc("enc_checks",{p_tok:S.tok}).then(H=>{hist.lastChild.remove();if(!H.length){hist.appendChild(el("div",{class:"empty",text:"Todavía no hay ninguno."}));return;}
    H.forEach(c=>hist.appendChild(el("button",{class:"linea",onclick:()=>{CK_FECHA=c.fecha;pinta();window.scrollTo(0,0);}},[el("span",{style:"flex:1",text:fCorta(c.fecha)+" · "+nom1(c.hecho_por_n)}),
      c.mal?el("span",{class:"pill bad",text:c.mal+" mal"}):null,el("span",{class:"pill "+(c.cerrado?"ok":"warn"),text:c.cerrado?c.ok+"/"+c.total+" bien":"a medias"})])));}).catch(e=>hist.lastChild.textContent=e.message);}
function punto(it,cambio){const w=el("div",{class:"pt"+(it.estado==="mal"?" mal":"")});
  const extra=el("div",{style:"display:grid;gap:6px"});
  const ayuda=it.ayuda||it.tipo==="num"&&it.minimo!=null?el("div",{class:"hint",style:"margin:-4px 0 0",text:[it.ayuda,it.tipo==="num"&&it.minimo!=null?"Mínimo: "+it.minimo:null].filter(Boolean).join(" · ")}):null;
  if(it.tipo==="txt"){w.append(...[el("b",{text:it.texto}),ayuda,el("textarea",{class:"x",rows:2,oninput:e=>{it.valor=e.target.value;it.estado=it.valor.trim()?"ok":null;cambio();}},[])].filter(Boolean));w.querySelector("textarea").value=it.valor||"";return w;}
  const pintaExtra=()=>{extra.textContent="";w.className="pt"+(it.estado==="mal"?" mal":"");if(it.estado!=="mal")return;
    const ft=el("div",{class:"fotos"});if(it.foto)ft.appendChild(el("img",{src:it.foto,alt:"foto",onclick:()=>verFoto(it.foto)}));
    if(it.tipo==="num")extra.appendChild(el("div",{style:"color:var(--bad);font-weight:700;font-size:14px",text:"Por debajo del mínimo ("+it.minimo+")"}));
    extra.appendChild(el("input",{class:"x",placeholder:it.tipo==="num"?"Nota (opcional)":"¿Qué pasa?"+(it.foto_si_mal?" (y pon una foto)":""),value:it.nota,oninput:e=>{it.nota=e.target.value;cambio();}}));
    extra.appendChild(el("div",{class:"row"},[botonFoto(it.foto?"Cambiar foto":"Foto",d=>{it.foto=d;cambio();pintaExtra();}),it.foto?el("button",{class:"btn sec peq",text:"Quitar foto",onclick:()=>{it.foto=null;cambio();pintaExtra();}}):null,
      el("button",{class:"btn sec peq",text:"Crear incidencia",onclick:()=>formInc({tipo:tipoDe(it),texto:(it.texto+(it.nota?": "+it.nota:"")),foto:it.foto})})]));
    extra.appendChild(ft);};
  if(it.tipo==="num"){const n=el("input",{class:"x",type:"number",inputmode:"decimal",min:"0",placeholder:"Escribe el número",value:it.valor,style:"max-width:220px;font-size:20px;font-weight:700",
      oninput:()=>{it.valor=n.value;it.estado=n.value===""?null:(it.minimo!=null&&Number(n.value)<Number(it.minimo)?"mal":"ok");cambio();pintaExtra();}});
    w.append(...[el("b",{text:it.texto}),ayuda,n,extra].filter(Boolean));pintaExtra();return w;}
  const seg=el("div",{class:"seg"});const B=[["ok","Bien","v-ok"],["mal","Mal","v-mal"],["na","No aplica","v-na"]].map(([k,t,c])=>el("button",{type:"button",class:c,"aria-pressed":String(it.estado===k),text:t,onclick:()=>{it.estado=k;B.forEach(b=>b.setAttribute("aria-pressed",String(b===B.find(x=>x.textContent===t))));cambio();pintaExtra();}}));
  B.forEach(b=>seg.appendChild(b));
  w.append(...[el("b",{text:it.texto}),ayuda,seg,extra].filter(Boolean));pintaExtra();return w;}
const tipoDe=it=>/m[aá]quina|fregadora|barredora|aspirador|plataforma|carretilla/i.test(it.texto+it.grupo)?"Máquina averiada":/guante|gafa|mascarilla|tap[oó]n|epi|botiqu/i.test(it.texto)?"Faltan EPIs":/papel|jab[oó]n|bolsa|producto|absorbente/i.test(it.texto)?"Falta material":/extintor|salida|derrame|pasillo|seguridad/i.test(it.texto+it.grupo)?"Seguridad":"Otro";

/* ---------------- INCIDENCIAS ---------------- */
const TIPOS=[["Faltan EPIs",""],["Falta material",""],["Máquina averiada",""],["Derrame / limpieza urgente",""],["Seguridad",""],["Instalaciones (luz, agua, puertas…)",""],["Otro",""]];
const EST_I={abierta:["Abierta","bad"],en_proceso:["En proceso","warn"],resuelta:["Resuelta","ok"]};
async function vInc(v){
  if(!esJefe())v.appendChild(el("button",{class:"btn grande bad",text:"Avisar de un problema",onclick:()=>formInc({})}));
  else v.appendChild(el("p",{class:"hint",text:"Las incidencias que avisa el encargado. Cuando la soluciones, márcala como resuelta y le llega el aviso."}));
  const box=el("div",{class:"card"},el("div",{class:"empty",text:"Cargando…"}));v.appendChild(box);
  let L;try{L=await rpc("enc_incidencias",{p_tok:S.tok});}catch(e){box.firstChild.textContent=e.message;return;}
  box.textContent="";const ab=L.filter(x=>x.estado!=="resuelta"),re_=L.filter(x=>x.estado==="resuelta");
  box.appendChild(el("div",{class:"hd"},el("h2",{text:"Abiertas ("+ab.length+")"})));
  if(!ab.length)box.appendChild(el("div",{class:"empty",text:"No hay incidencias abiertas "}));
  ab.forEach(x=>box.appendChild(tarjetaI(x)));
  if(re_.length)v.appendChild(el("details",{class:"card"},[el("summary",{class:"hd",style:"cursor:pointer"},el("h2",{text:"Resueltas ("+re_.length+")"})),re_.map(tarjetaI)]));
  if(IR.i){const id=IR.i;IR.i=null;const x=L.find(y=>y.id===id);if(x)detalleI(x);}}
function tarjetaI(x){const [et,ec]=EST_I[x.estado]||[x.estado,""];const ic=(TIPOS.find(t=>t[0]===x.tipo)||["",""])[1];
  return el("button",{class:"linea",style:"display:grid;gap:4px"+(x.urgente&&x.estado!=="resuelta"?";box-shadow:inset 4px 0 0 var(--bad)":""),onclick:()=>detalleI(x)},[
    el("div",{style:"display:flex;gap:8px;align-items:center"},[el("b",{style:"flex:1;font-size:16px",text:ic+" "+x.tipo}),x.urgente&&x.estado!=="resuelta"?el("span",{class:"pill bad",text:"Urgente"}):null,el("span",{class:"pill "+ec,text:et})]),
    el("div",{class:"meta"},[x.lugar?el("span",{text:""+x.lugar}):null,el("span",{text:cuando(x.creado)+" · "+nom1(x.creado_por_n)}),x.tiene_foto?el("span",{text:"Fotos"}):null]),
    x.texto?el("div",{style:"font-size:14px",text:x.texto}):null,x.nota_res?el("div",{class:"meta",text:""+x.nota_res}):null]);}
function detalleI(x){const ft=el("div",{class:"fotos"});const conv=el("div",{style:"margin-top:12px"});cargarConv(x,conv);
  if(x.tiene_foto)rpc("enc_incidencia_foto",{p_tok:S.tok,p_id:x.id}).then(d=>{if(d)ft.appendChild(el("img",{src:d,alt:"foto",onclick:()=>verFoto(d)}));}).catch(()=>{});
  let nota="";const bot=[{t:"Cerrar",cls:"sec"}];
  const est=async e=>{await rpc("enc_incidencia_estado",{p_tok:S.tok,p_id:x.id,p_estado:e,p_nota:nota});toast(EST_I[e][0]);re();};
  if(esJefe()){if(x.estado!=="en_proceso"&&x.estado!=="resuelta")bot.push({t:"En proceso",cls:"sec",fn:()=>est("en_proceso")});
    if(x.estado!=="resuelta")bot.push({t:"Resuelta",cls:"ok",fn:()=>est("resuelta")});else bot.push({t:"Reabrir",cls:"sec",fn:()=>est("abierta")});}
  const [et,ec]=EST_I[x.estado]||[x.estado,""];
  dlg(x.tipo,el("div",null,[el("div",{class:"meta",style:"margin:0 0 8px"},[el("span",{class:"pill "+ec,text:et}),x.urgente?el("span",{class:"pill bad",text:"Urgente"}):null]),
    x.lugar?el("p",{style:"margin:0 0 6px",text:""+x.lugar}):null,x.texto?el("p",{style:"margin:0 0 6px;white-space:pre-wrap",text:x.texto}):null,
    el("p",{class:"hint",text:"Avisó "+(x.creado_por_n||"")+" · "+cuando(x.creado)+(x.resuelta_en?" · Resuelta por "+nom1(x.resuelta_por_n)+" "+cuando(x.resuelta_en):"")}),
    x.nota_res?el("p",{text:""+x.nota_res}):null,ft,conv,
    esJefe()?fld("Respuesta para el encargado (opcional)",inp("",v=>nota=v,{placeholder:"p. ej. Pedidos guantes, llegan el lunes"})):null,
    esJefe()?el("button",{class:"btn sec peq",style:"margin-top:6px",text:"Borrar incidencia",onclick:async()=>{if(!confirm("¿Borrar esta incidencia?"))return;try{await rpc("enc_incidencia_borrar",{p_tok:S.tok,p_id:x.id});document.querySelector(".ov").remove();toast("Borrada");re();}catch(e){toast(e.message);}}}):null]),bot);}
function formInc(x0){const x=Object.assign({tipo:"",lugar:"",texto:"",urgente:false,foto:null},x0);
  const tipos=el("div",{class:"chips"});const pt=()=>{tipos.textContent="";TIPOS.forEach(([t,i])=>tipos.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(x.tipo===t),text:i+" "+t,onclick:()=>{x.tipo=t;pt();}})));};pt();
  const ft=el("div",{class:"fotos"});const pf=()=>{ft.textContent="";if(x.foto)ft.appendChild(el("img",{src:x.foto,alt:"foto",onclick:()=>verFoto(x.foto)}));};pf();
  dlg("Avisar de un problema",el("div",null,[el("div",{class:"f"},[el("span",{text:"¿Qué pasa?"}),tipos]),
    fld("¿Dónde?",inp(x.lugar,v=>x.lugar=v,{placeholder:"p. ej. Nave 2, F28, vestuario…"})),
    fld("Explica un poco",area(x.texto,v=>x.texto=v,3)),
    el("label",{style:"display:flex;gap:10px;align-items:center;margin:0 0 10px;font-weight:700;color:var(--bad)"},[el("input",{type:"checkbox",checked:x.urgente,style:"width:22px;height:22px",onchange:e=>x.urgente=e.target.checked}),"Es urgente (hay que solucionarlo ya)"]),
    el("div",{class:"row",style:"margin:0 0 8px"},[botonFoto("Añadir foto",d=>{x.foto=d;pf();})]),ft,
    el("p",{class:"hint",text:"A Cristian le llega un aviso al móvil al momento."})]),
    [{t:"Cancelar",cls:"sec"},{t:"Enviar aviso",cls:"bad",fn:async()=>{if(!x.tipo){toast("Elige qué pasa");return false;}
      await rpc("enc_incidencia_nueva",{p_tok:S.tok,p:{tipo:x.tipo,lugar:x.lugar,texto:x.texto,urgente:x.urgente,foto:x.foto}});toast("Aviso enviado ");S.tab="inc";ls.set("enc.tab","inc");re();}}]);}

/* ---------------- AJUSTES (solo jefe) ---------------- */
const aplicaTiene=a=>!!a&&((a.habituales&&a.habituales.length)||(a.codigos||"").trim());
const resumenAplica=a=>{const p=[];if((a.codigos||"").trim())p.push(a.codigos.trim());if(a.habituales&&a.habituales.length)p.push(a.habituales.length+" tarea"+(a.habituales.length>1?"s":"")+" habitual"+(a.habituales.length>1?"es":""));return (p.join(" · ")||"falta elegir trabajos")+((a.excluir||"").trim()?" (menos: "+a.excluir.trim()+")":"");};
const TIPO_P={ok:"Bien / Mal",num:"Número",txt:"Texto"};
async function vAjustes(v){
  /* puntos del checklist, por grupos */
  const card=el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Checklists"})),el("div",{class:"empty",text:"Cargando…"})]);v.appendChild(card);
  const card2=el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Encargado"})),el("div",{class:"empty",text:"Cargando…"})]);v.appendChild(card2);
  let P;try{P=(await rpc("enc_puntos",{p_tok:S.tok})).filter(p=>p.activo);}catch(e){card.lastChild.textContent=e.message;return;}
  card.lastChild.remove();
  let G=[];const aGrupos=L=>{const out=[];L.forEach(p=>{let g=out.find(x=>x.nombre===p.grupo);if(!g){g={nombre:p.grupo,items:[],donde:p.donde||"encargado",aplica:Object.assign({habituales:[],codigos:"",excluir:""},p.aplica||{})};out.push(g);}g.items.push(Object.assign({},p));});return out;};G=aGrupos(P);
  let sucio=false;const lista=el("div");
  const bGuardar=el("button",{class:"btn ok",style:"width:100%",text:"Guardar cambios",disabled:true,onclick:async()=>{
    const items=[];const sinReglas=G.find(g=>g.donde==="trabajos"&&g.items.length&&!aplicaTiene(g.aplica));if(sinReglas){toast("Elige a qué trabajos se adjunta «"+sinReglas.nombre+"»");dondeG(sinReglas);return;}
    G.forEach(g=>g.items.forEach(p=>items.push({id:p.id||null,grupo:g.nombre.trim()||"General",texto:p.texto,tipo:p.tipo||"ok",minimo:p.tipo==="num"&&p.minimo!==""&&p.minimo!=null?p.minimo:null,ayuda:p.ayuda||null,foto_si_mal:!!p.foto_si_mal,donde:g.donde,aplica:g.donde==="trabajos"?g.aplica:{}})));
    try{P=(await rpc("enc_puntos_guardar",{p_tok:S.tok,p_items:items})).filter(p=>p.activo);G=aGrupos(P);marca(false);dib();toast("Checklist guardado ");}catch(e){toast(e.message);}}});
  const marca=x=>{sucio=x;bGuardar.disabled=!x;bGuardar.textContent=x?"Guardar cambios":"Todo guardado";};marca(false);
  const mueve=(L,i,d)=>{const j=i+d;if(j<0||j>=L.length)return;[L[i],L[j]]=[L[j],L[i]];marca(true);dib();};
  const editar=(g,p)=>{const x=Object.assign({texto:"",tipo:"ok",minimo:"",ayuda:"",foto_si_mal:false},p||{});let gr=g.nombre;
    const minF=fld("Mínimo (si baja de aquí, cuenta como problema)",inp(x.minimo==null?"":x.minimo,v=>x.minimo=v,{type:"number",inputmode:"decimal",placeholder:"p. ej. 3"}));
    const fotoF=el("label",{style:"display:flex;gap:10px;align-items:center;margin:0 0 10px;font-size:15px"},[el("input",{type:"checkbox",checked:x.foto_si_mal,style:"width:22px;height:22px",onchange:e=>x.foto_si_mal=e.target.checked}),"Pedir foto obligatoria si está mal"]);
    const tipos=el("div",{class:"chips"});const pt=()=>{tipos.textContent="";Object.entries(TIPO_P).forEach(([k,t])=>tipos.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(x.tipo===k),text:t,onclick:()=>{x.tipo=k;pt();}})));minF.hidden=x.tipo!=="num";fotoF.hidden=x.tipo!=="ok";};
    const gS=el("select",null,G.map(z=>el("option",{value:z.nombre,text:z.nombre})));gS.value=gr;gS.onchange=()=>gr=gS.value;
    pt();
    dlg(p?"Cambiar punto":"Nuevo punto en «"+g.nombre+"»",el("div",null,[fld("Qué hay que revisar",inp(x.texto,v=>x.texto=v,{placeholder:"p. ej. Canaleta de la F28 limpia"})),
      el("div",{class:"f"},[el("span",{text:"Tipo de respuesta"}),tipos]),
      el("p",{class:"hint",text:"Bien / Mal: lo normal. Número: para contar (cajas de guantes, sacas…). Texto: para que escriba algo."}),
      minF,fotoF,fld("Ayuda para el encargado (opcional)",inp(x.ayuda,v=>x.ayuda=v,{placeholder:"p. ej. Mirar también debajo de la máquina"})),
      p?fld("Grupo",gS):null]),
      [{t:"Cancelar",cls:"sec"},{t:p?"Aceptar":"＋ Añadir",cls:"ok",fn:()=>{if(!x.texto.trim()){toast("Escribe qué hay que revisar");return false;}
        x.texto=x.texto.trim();
        if(p){Object.assign(p,x);if(gr!==g.nombre){g.items.splice(g.items.indexOf(p),1);G.find(z=>z.nombre===gr).items.push(p);}}
        else g.items.push(x);
        marca(true);dib();}}]);};
  /* ¿dónde sale el grupo? en la checklist del encargado o al terminar ciertos trabajos */
  let HAB=null;
  const dondeG=(g,luego)=>{const a=JSON.parse(JSON.stringify(g.aplica||{}));a.habituales=a.habituales||[];a.codigos=a.codigos||"";a.excluir=a.excluir||"";let dn=g.donde||"encargado";
    const opc=el("div",{class:"chips"});const zona=el("div");
    const prev=el("div",{class:"prevw"});let tPrev=null;
    const verPrev=()=>{clearTimeout(tPrev);if(!aplicaTiene(a)){prev.textContent="Elige alguna tarea habitual o escribe una máquina o palabra.";return;}prev.textContent="Buscando…";
      tPrev=setTimeout(async()=>{try{const R=await rpc("check_prueba",{p_tok:S.tok,p_aplica:a});prev.textContent="";
        prev.appendChild(el("b",{text:R.length?"Saldría en estos trabajos (últimos 60 días):":"No ha coincidido con ningún trabajo de los últimos 60 días."}));
        R.forEach(r=>prev.appendChild(el("div",{text:"• "+r.titulo+(r.n>1?" ("+r.n+")":"")})));}catch(e){prev.textContent=e.message;}},400);};
    const habBox=el("div",{class:"chips"});
    const pintaHab=()=>{habBox.textContent="";if(!HAB){habBox.textContent="Cargando…";return;}if(!HAB.length){habBox.textContent="No hay tareas habituales.";return;}
      HAB.forEach(h=>habBox.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(a.habituales.includes(h.id)),text:h.titulo,onclick:e=>{const i=a.habituales.indexOf(h.id);if(i>=0)a.habituales.splice(i,1);else a.habituales.push(h.id);e.target.setAttribute("aria-pressed",String(i<0));verPrev();}})));};
    const pintaZona=()=>{zona.textContent="";if(dn!=="trabajos")return;
      zona.append(fld("Máquinas o palabras del nombre del trabajo",inp(a.codigos,v=>{a.codigos=v;verPrev();},{placeholder:"p. ej. M3-M11  ·  F*  ·  F28, F30  ·  robot"})),
        el("p",{class:"hint",style:"margin:-4px 0 10px",text:"Separa con comas. F* = cualquier F con número. M3-M11 = de la M3 a la M11. Una palabra = el nombre del trabajo la lleva."}),
        fld("Menos si el nombre lleva (opcional)",inp(a.excluir,v=>{a.excluir=v;verPrev();},{placeholder:"p. ej. horno, derrame"})),
        el("details",{class:"f",open:a.habituales.length>0},[el("summary",{style:"cursor:pointer;font-weight:700;margin-bottom:8px",text:"Tareas habituales"+(a.habituales.length?" ("+a.habituales.length+")":"")}),habBox]),prev);
      pintaHab();verPrev();
      if(!HAB)rpc("habituales",{p_tok:S.tok}).then(H=>{HAB=H.filter(h=>h.activo!==false);pintaHab();}).catch(e=>habBox.textContent=e.message);};
    const pOpc=()=>{opc.textContent="";[["encargado","En la checklist del encargado"],["trabajos","Al terminar ciertos trabajos"]].forEach(([k,t])=>opc.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(dn===k),text:t,onclick:()=>{dn=k;pOpc();pintaZona();}})));};
    pOpc();pintaZona();
    dlg("¿Dónde sale «"+g.nombre+"»?",el("div",null,[el("div",{class:"f"},[el("span",{text:"Sale…"}),opc]),zona]),
      [{t:"Cancelar",cls:"sec"},{t:"Aceptar",cls:"ok",fn:()=>{if(dn==="trabajos"&&!aplicaTiene(a)){toast("Elige a qué trabajos se adjunta");return false;}
        g.donde=dn;g.aplica=dn==="trabajos"?a:{habituales:[],codigos:"",excluir:""};marca(true);dib();if(luego)setTimeout(luego,50);}}]);};
  const dib=()=>{lista.textContent="";
    G.forEach((g,gi)=>{
      const nomI=el("input",{class:"x",value:g.nombre,style:"font-weight:700",oninput:e=>{g.nombre=e.target.value;marca(true);}});
      lista.appendChild(el("div",{class:"grp",style:"display:flex;gap:6px;align-items:center;text-transform:none;letter-spacing:0;padding:8px 10px"},[nomI,
        el("button",{class:"btn sec peq","aria-label":"Subir grupo",text:"▲",disabled:gi===0,onclick:()=>mueve(G,gi,-1)}),
        el("button",{class:"btn sec peq","aria-label":"Bajar grupo",text:"▼",disabled:gi===G.length-1,onclick:()=>mueve(G,gi,1)}),
        el("button",{class:"btn sec peq","aria-label":"Borrar grupo",text:"Quitar",onclick:()=>{if(g.items.length&&!confirm("¿Borrar el grupo «"+g.nombre+"» y sus "+g.items.length+" puntos?"))return;G.splice(gi,1);marca(true);dib();}})]));
      lista.appendChild(el("button",{type:"button",class:"dondeg"+(g.donde==="trabajos"&&!aplicaTiene(g.aplica)?" falta":""),onclick:()=>dondeG(g)},[el("span",{text:g.donde==="trabajos"?"Sale al terminar: "+resumenAplica(g.aplica):"Sale en la checklist del encargado"}),el("b",{text:"Cambiar"})]));
      g.items.forEach((p,i)=>lista.appendChild(el("div",{class:"ed"},[
        el("button",{type:"button",style:"all:unset;cursor:pointer;display:grid;gap:3px",onclick:()=>editar(g,p)},[el("span",{text:p.texto}),
          el("span",{class:"meta"},[p.tipo&&p.tipo!=="ok"?el("span",{class:"pill",text:TIPO_P[p.tipo]+(p.tipo==="num"&&p.minimo!=null&&p.minimo!==""?" · mín. "+p.minimo:"")}):null,p.foto_si_mal&&p.tipo==="ok"?el("span",{class:"pill",text:"foto si mal"}):null,p.ayuda?el("span",{text:""+p.ayuda}):null])]),
        el("div",{class:"bs"},[el("button",{class:"btn sec peq","aria-label":"Subir",text:"▲",disabled:i===0,onclick:()=>mueve(g.items,i,-1)}),
          el("button",{class:"btn sec peq","aria-label":"Bajar",text:"▼",disabled:i===g.items.length-1,onclick:()=>mueve(g.items,i,1)}),
          el("button",{class:"btn sec peq","aria-label":"Cambiar",text:"Corregir",onclick:()=>editar(g,p)}),
          el("button",{class:"btn sec peq","aria-label":"Quitar",text:"✕",onclick:()=>{if(!confirm("¿Quitar «"+p.texto+"»?"))return;g.items.splice(i,1);marca(true);dib();}})])])));
      lista.appendChild(el("div",{style:"padding:6px 14px 12px"},el("button",{class:"btn sec peq",text:"＋ Añadir punto aquí",onclick:()=>editar(g,null)})));});};
  dib();
  card.append(el("p",{class:"hint",style:"padding:10px 14px 0",text:"Toca un punto para cambiarlo. Cada grupo puede salir en la checklist del encargado o al terminar ciertos trabajos (toca la línea de debajo del nombre para elegir). Al terminar, pulsa «Guardar cambios». Los checklists ya hechos no cambian."}),lista,
    el("div",{class:"bd",style:"display:grid;gap:8px;position:sticky;bottom:64px;background:var(--surf);border-top:1px solid var(--line)"},[
      el("button",{class:"btn sec",text:"＋ Nuevo grupo",onclick:()=>{let n="";dlg("Nuevo grupo",fld("Nombre del grupo",inp("",v=>n=v,{placeholder:"p. ej. Nave 2"})),[{t:"Cancelar",cls:"sec"},{t:"Crear",cls:"ok",fn:()=>{n=n.trim();if(!n){toast("Pon un nombre");return false;}if(G.some(z=>z.nombre===n)){toast("Ya hay un grupo con ese nombre");return false;}G.push({nombre:n,items:[],donde:"encargado",aplica:{habituales:[],codigos:"",excluir:""}});marca(true);dib();setTimeout(()=>{const g=G[G.length-1];dondeG(g,()=>editar(g,null));},50);}}]);}}),
      bGuardar]));
  window.onbeforeunload=()=>sucio?"":undefined;
  /* quién es encargado */
  try{const [E,T]=await Promise.all([rpc("enc_encargados",{p_tok:S.tok}),rpc("trabajadores_gestor",{p_tok:S.tok})]);card2.lastChild.remove();
    const ids=new Set(E.map(e=>e.id));const ch=el("div",{class:"chips"});
    T.filter(w=>w.rol!=="admin").forEach(w=>ch.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(ids.has(w.id)),text:w.nombre,onclick:async e=>{const si=!ids.has(w.id);
      try{await rpc("enc_encargado_poner",{p_tok:S.tok,p_id:w.id,p_si:si});if(si)ids.add(w.id);else ids.delete(w.id);e.target.setAttribute("aria-pressed",String(si));toast(si?w.nombre.split(" ")[0]+" es encargado":"Quitado");}catch(er){toast(er.message);}}})));
    card2.append(el("div",{class:"bd"},[el("p",{class:"hint",style:"margin-top:0",text:"El encargado puede ver los trabajos de todos, crear y asignar trabajos, poner faltas, hacer el checklist y avisar de incidencias. No puede borrar trabajos ni ver datos personales u horas. Lo notará la próxima vez que abra la app."}),ch]));}
  catch(e){card2.lastChild.textContent=e.message;}}

pinta();
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!document.querySelector(".ov")&&S.tab!=="check"&&S.tab!=="ajustes"&&S.tab!=="excel")pinta();});
/* ---- Conversación de la incidencia: los dos (encargado y jefe) escriben y ven los mensajes, con foto opcional ---- */
async function cargarConv(x,box){
  let M; try{ M=await rpc("enc_incidencia_msgs",{p_tok:S.tok,p_id:x.id}); }catch(e){ box.textContent=e.message; return; }
  box.textContent="";
  box.appendChild(el("div",{class:"hd"},el("h2",{text:"Mensajes"})));
  if(!M.length) box.appendChild(el("p",{class:"hint",text:"Todavía no hay mensajes. Escribe lo que haga falta (y una foto si ayuda)."}));
  M.forEach(m=>{ const f=el("div",{class:"fotos"});
    if(m.tiene_foto) rpc("enc_incidencia_msg_foto",{p_tok:S.tok,p_id:m.id}).then(d=>{ if(d) f.appendChild(el("img",{src:d,alt:"foto",onclick:()=>verFoto(d)})); }).catch(()=>{});
    box.appendChild(el("div",{class:"linea",style:"display:grid;gap:4px"},[el("div",{class:"meta",text:nom1(m.quien_n)+" · "+cuando(m.creado)}),m.texto?el("div",{style:"white-space:pre-wrap",text:m.texto}):null,f])); });
  let txt="", foto=null;
  const ft=el("div",{class:"fotos"});
  const pf=()=>{ ft.textContent=""; if(foto) ft.appendChild(el("img",{src:foto,alt:"foto",onclick:()=>verFoto(foto)})); };
  const ta=area("",v=>txt=v,2); ta.placeholder="Escribe un mensaje…";
  const enviar=el("button",{class:"btn sec peq",text:"Enviar",onclick:async e=>{ const b=e.currentTarget;
    if(!txt.trim()&&!foto){ toast("Escribe algo o añade una foto"); return; }
    busy(b,true);
    try{ await rpc("enc_incidencia_responder",{p_tok:S.tok,p_id:x.id,p:{texto:txt,foto:foto}}); toast("Enviado"); cargarConv(x,box); }
    catch(err){ busy(b,false); toast(err.message,true); } }});
  box.appendChild(ta); box.appendChild(ft);
  box.appendChild(el("div",{class:"row",style:"margin:6px 0 0"},[botonFoto("Añadir foto",d=>{ foto=d; pf(); }),enviar]));
}
})();

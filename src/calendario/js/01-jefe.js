/* ---------------- JEFE ---------------- */
async function vJefe(){ls.set("cal.anio",String(A.anio));ls.set("cal.eq",A.eq);
  const y0=window.scrollY;v.textContent="";
  const otroEq=A.eq==="Semana"?"Finde":"Semana",nEq=e=>e==="Finde"?"fin de semana":"semana";
  v.appendChild(el("div",{class:"barra"},[
    el("div",{class:"seg"},[el("button",{"aria-label":"Año anterior",text:"◀",onclick:()=>{A.anio--;vJefe();}}),el("button",{"aria-pressed":"true",text:String(A.anio)}),el("button",{"aria-label":"Año siguiente",text:"▶",onclick:()=>{A.anio++;vJefe();}})]),
    el("div",{class:"seg"},["Semana","Finde"].map(e=>el("button",{"aria-pressed":String(A.eq===e),text:e==="Finde"?"Equipo fin de semana":"Equipo semana",onclick:()=>{A.eq=e;A.modo=false;A.ini=null;vJefe();}})))]));
  const cont=el("div",null,el("div",{class:"empty",text:"Cargando…"}));v.appendChild(cont);
  try{A.R=await rpc("cal_admin_ver",{p_tok:S.tok,p_anio:A.anio,p_equipo:A.eq});}catch(e){cont.firstChild.textContent=e.message;return;}
  cont.textContent="";const R=A.R;A.mapa={};R.dias.forEach(d=>A.mapa[d.fecha]=d);
  const Rs=resumen(A.anio,A.eq,A.mapa,[]);
  cont.appendChild(el("div",{class:"res"},[["Días de trabajo",Rs.lab],["Festivos",Rs.fes],["Cierre fábrica",Rs.cie],["Con jornada intensiva",Rs.int]].map(([a,b])=>el("div",null,[el("b",{text:String(b)}),el("small",{text:a})]))));
  /* herramientas */
  cont.appendChild(el("div",{class:"row",style:"margin:0 0 10px"},[
    el("button",{class:"btn "+(A.modo?"on":"sec"),text:A.modo?"✋ Marcando varios días…":"✋ Marcar varios días",onclick:()=>{A.modo=!A.modo;A.ini=null;vJefe();}}),
    el("button",{class:"btn sec",text:"Festivos nacionales",onclick:()=>festivosNac()}),
    el("button",{class:"btn sec",text:"Copiar del equipo de "+nEq(otroEq),onclick:async()=>{if(!R.otro){toast("El equipo de "+nEq(otroEq)+" no tiene días marcados en "+A.anio);return;}
      if(!confirm("Se borran los días marcados de este equipo en "+A.anio+" y se copian los "+R.otro+" del equipo de "+nEq(otroEq)+". ¿Seguir?"))return;
      try{const n=await rpc("cal_copiar",{p_tok:S.tok,p_anio:A.anio,p_de:otroEq,p_a:A.eq});toast(n+" días copiados");vJefe();}catch(e){toast(e.message);}}})]));
  if(A.modo)cont.appendChild(el("div",{class:"modo"},[el("span",{text:A.ini?"Ahora toca el último día (empezaste el "+fTxt(A.ini)+")":"Toca el primer día y luego el último (por ejemplo, todo agosto)"}),el("button",{class:"btn sec peq",text:"Cancelar",onclick:()=>{A.modo=false;A.ini=null;vJefe();}})]));
  else cont.appendChild(el("p",{class:"hint",style:"margin:0 0 8px",text:"Toca un día para marcarlo como festivo, cierre, jornada intensiva u horario especial."}));
  cont.appendChild(el("div",{class:"hoja"},[hoja(A.anio,A.eq,A.mapa,[],{tap:f=>{
      if(!A.modo)return editarDias([f]);
      if(!A.ini){A.ini=f;vJefe();return;}const a=A.ini;A.ini=null;A.modo=false;editarDias(rango(a,f));},sel:f=>f===A.ini}),leyenda(false)]));
  /* lista de días */
  const it=listaDias(R.dias);
  cont.appendChild(el("div",{class:"card",style:"margin-top:12px"},[el("div",{class:"hd"},[el("h2",{text:"Días marcados"}),el("span",{class:"meta",text:R.dias.length+" días"})]),
    it.length?it.map(x=>el("button",{class:"linea",onclick:()=>editarDias(rango(x.desde,x.hasta).filter(f=>A.mapa[f]))},[el("i",{style:"width:14px;height:14px;border-radius:4px;background:"+TIPOS[x.tipo][1]}),
      el("span",{style:"flex:1",text:tramoTxt(x)+" · "+TIPOS[x.tipo][0]+(x.nombre?": "+x.nombre:"")+(x.horario?" ("+x.horario+")":"")}),el("span",{class:"meta",text:"Corregir"})])):el("div",{class:"empty",text:"Todavía no hay días marcados. Empieza por «Festivos nacionales» y luego añade los de la fábrica."})]));
  /* vacaciones */
  cont.appendChild(vacCard());
  /* envío y firmas */
  cont.appendChild(firmasCard());
  window.scrollTo(0,y0);}

function editarDias(fechas){if(!fechas.length)return;const una=fechas.length===1,x0=A.mapa[fechas[0]]||{};
  const otroEq=A.eq==="Semana"?"fin de semana":"semana";
  const s={tipo:x0.tipo||"festivo",nombre:x0.nombre||"",horario:x0.horario||"",ambos:false,soloLab:false};
  const nomI=inp(s.nombre,x=>s.nombre=x),horF=fld("Horario de esos días",inp(s.horario,x=>s.horario=x,{placeholder:"p. ej. 07:00-14:00"}));
  const solo=el("label",{style:"display:flex;gap:10px;align-items:center;margin:0 0 10px;font-size:15px"},[el("input",{type:"checkbox",style:"width:22px;height:22px",onchange:e=>s.soloLab=e.target.checked}),"Solo los días que trabaja este equipo"]);
  const PH={festivo:"p. ej. Fiesta local",cierre:"p. ej. Vacaciones de verano",intensiva:"p. ej. Jornada de verano",especial:"p. ej. Inventario"};
  const tipos=el("div",{class:"chips"});const pt=()=>{tipos.textContent="";Object.entries(TIPOS).forEach(([k,[t,bg]])=>tipos.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(s.tipo===k),style:s.tipo===k?"":"border-left:6px solid "+bg,text:t,onclick:()=>{s.tipo=k;pt();}})));
    horF.hidden=!(s.tipo==="intensiva"||s.tipo==="especial");nomI.placeholder=PH[s.tipo];};pt();
  const marcados=fechas.filter(f=>A.mapa[f]).length;
  const titulo=una?fLarga(fechas[0]):"Del "+fTxt(fechas[0])+" al "+fTxt(fechas[fechas.length-1])+" ("+fechas.length+" días)";
  const bot=[{t:"Cancelar",cls:"sec"}];
  if(marcados)bot.push({t:"Quitar marca",cls:"bad",fn:async()=>{await rpc("cal_dia_guardar",{p_tok:S.tok,p_equipo:A.eq,p_fechas:fechas,p_tipo:"",p_nombre:null,p_horario:null,p_ambos:s.ambos});toast("Quitado");vJefe();}});
  bot.push({t:"Guardar",cls:"ok",fn:async()=>{const F=s.soloLab?fechas.filter(f=>trabajaEq(A.eq,f)):fechas;if(!F.length){toast("Ninguno de esos días lo trabaja este equipo");return false;}
    await rpc("cal_dia_guardar",{p_tok:S.tok,p_equipo:A.eq,p_fechas:F,p_tipo:s.tipo,p_nombre:s.nombre,p_horario:s.horario,p_ambos:s.ambos});toast("Guardado");vJefe();}});
  dlg(titulo,el("div",null,[el("div",{class:"f"},[el("span",{text:"¿Qué es?"}),tipos]),fld("Nombre (sale en la lista y en el PDF)",nomI),horF,
    una?null:solo,
    el("label",{style:"display:flex;gap:10px;align-items:center;margin:0 0 4px;font-size:15px"},[el("input",{type:"checkbox",style:"width:22px;height:22px",onchange:e=>s.ambos=e.target.checked}),"Aplicar también al equipo de "+otroEq])]),bot);}

function festivosNac(){const L=nacionales(A.anio);const sel=new Set(L.map(x=>x[0]).filter(f=>!A.mapa[f]));let ambos=true;
  const box=el("div");L.forEach(([f,n])=>box.appendChild(el("label",{style:"display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)"},[
    el("input",{type:"checkbox",checked:sel.has(f),style:"width:22px;height:22px",onchange:e=>{if(e.target.checked)sel.add(f);else sel.delete(f);}}),el("span",{style:"flex:1"},[el("b",{text:fLarga(f)}),el("br"),el("small",{text:n+(A.mapa[f]?" · ya marcado":"")})])])));
  dlg("Festivos nacionales "+A.anio,el("div",null,[el("p",{class:"hint",style:"margin-top:0",text:"Son los nacionales que caen en toda España. Los autonómicos y locales (y si la Comunidad cambia alguno, como Jueves Santo o Lunes de Pascua) añádelos después, o pásame el calendario de la fábrica y los cargo yo."}),box,
    el("label",{style:"display:flex;gap:10px;align-items:center;margin:10px 0 0;font-size:15px"},[el("input",{type:"checkbox",checked:true,style:"width:22px;height:22px",onchange:e=>ambos=e.target.checked}),"Para los dos equipos"])]),
    [{t:"Cancelar",cls:"sec"},{t:"Marcar",cls:"ok",fn:async()=>{const F=L.filter(x=>sel.has(x[0]));if(!F.length)return;
      for(const [f,n] of F)await rpc("cal_dia_guardar",{p_tok:S.tok,p_equipo:A.eq,p_fechas:[f],p_tipo:"festivo",p_nombre:n,p_horario:null,p_ambos:ambos});toast(F.length+" festivos marcados");vJefe();}}]);}

function vacCard(){const R=A.R;const card=el("div",{class:"card"},el("div",{class:"hd"},[el("h2",{text:"Vacaciones de cada uno"})]));
  if(!R.trabajadores.length){card.appendChild(el("div",{class:"empty",text:"No hay trabajadores en este equipo."}));return card;}
  R.trabajadores.forEach(w=>{const V=R.vac.filter(x=>x.trabajador===w.id);let dias=0;V.forEach(x=>rango(x.desde<iso(A.anio,0,1)?iso(A.anio,0,1):x.desde,x.hasta>iso(A.anio,11,31)?iso(A.anio,11,31):x.hasta).forEach(f=>{if(trabajaEq(A.eq,f)&&!(A.mapa[f]&&(A.mapa[f].tipo==="festivo"||A.mapa[f].tipo==="cierre")))dias++;}));
    card.appendChild(el("div",{class:"linea",style:"flex-wrap:wrap"},[el("b",{style:"flex:1;min-width:150px",text:w.nombre}),dias?el("span",{class:"pill ok",text:dias+" días de trabajo"}):null,
      el("button",{class:"btn sec peq",text:"＋ Vacaciones",onclick:()=>formVac({trabajador:w.id},w.nombre)}),
      V.length?el("div",{class:"chips",style:"flex-basis:100%"},V.map(x=>el("button",{type:"button",class:"chip",style:"background:"+VAC[1]+";color:"+VAC[2]+";border-color:transparent",text:tramoTxt(x)+(x.nota?" · "+x.nota:""),onclick:()=>formVac(x,w.nombre)}))):null]));});
  card.appendChild(el("p",{class:"hint",style:"padding:0 14px",text:"Salen en verde solo en el calendario de esa persona."}));
  return card;}
function formVac(x0,nombre){const x=Object.assign({desde:iso(A.anio,7,1),hasta:iso(A.anio,7,15),nota:""},x0);
  const bot=[{t:"Cancelar",cls:"sec"}];
  if(x.id)bot.push({t:"Quitar",cls:"bad",fn:async()=>{await rpc("cal_vac_borrar",{p_tok:S.tok,p_id:x.id});toast("Quitadas");vJefe();}});
  bot.push({t:"Guardar",cls:"ok",fn:async()=>{if(x.hasta<x.desde){toast("Las fechas están al revés");return false;}await rpc("cal_vac_guardar",{p_tok:S.tok,p:{id:x.id||null,trabajador:x.trabajador,desde:x.desde,hasta:x.hasta,nota:x.nota}});toast("Guardado");vJefe();}});
  dlg("Vacaciones · "+nombre,el("div",null,[el("div",{class:"row"},[fld("Desde",inp(x.desde,v=>x.desde=v,{type:"date"})),fld("Hasta",inp(x.hasta,v=>x.hasta=v,{type:"date"}))]),fld("Nota (opcional)",inp(x.nota,v=>x.nota=v,{placeholder:"p. ej. 1ª quincena"}))]),bot);}

function firmasCard(){const R=A.R;const card=el("div",{class:"card"},el("div",{class:"hd"},el("h2",{text:"Enviar a firmar"})));
  const ult={};R.firmas.forEach(f=>{if(!ult[f.trabajador])ult[f.trabajador]=f;});
  const bd=el("div",{class:"bd"});card.appendChild(bd);
  bd.appendChild(el("p",{class:"hint",style:"margin-top:0",text:"Cada trabajador recibe un aviso en el móvil, ve su calendario (con sus vacaciones) y firma «Recibido y conforme». Si cambias algo después, vuelve a enviarlo: el que no haya firmado verá el nuevo."}));
  R.trabajadores.forEach(w=>{const f=ult[w.id];
    bd.appendChild(el("div",{class:"linea",style:"padding:8px 0;flex-wrap:wrap"},[el("span",{style:"flex:1;min-width:150px",text:w.nombre}),
      !f?el("span",{class:"pill",text:"Sin enviar"}):!f.firmado_en?el("span",{class:"pill warn",text:"Enviado "+cuando(f.enviado).split(",")[0]+" · sin firmar"}):el("span",{class:"pill "+(f.conforme?"ok":"bad"),text:(f.conforme?"Conforme":"Con observaciones")+" · "+cuando(f.firmado_en).split(",")[0]}),
      f&&f.firmado_en?el("button",{class:"btn sec peq",text:"PDF",onclick:async()=>{try{const D=await rpc("cal_firmas_datos",{p_tok:S.tok,p_ids:[f.id]});guardaPDF(await pdfDe(D),"Calendario-"+A.anio+"-"+limpio(w.nombre)+".pdf");}catch(e){toast(e.message);}}}):null,
      f&&!f.conforme&&f.comentario?el("div",{style:"flex-basis:100%;font-size:14px;color:var(--bad)",text:""+f.comentario}):null]));});
  const firmados=Object.values(ult).filter(f=>f.firmado_en);
  bd.appendChild(el("div",{class:"row",style:"margin-top:10px"},[
    el("button",{class:"btn ok",text:"Enviar a firmar",onclick:()=>enviar(ult)}),
    el("button",{class:"btn sec",text:"PDF de todos los firmados ("+firmados.length+")",disabled:!firmados.length,onclick:async()=>{try{const D=await rpc("cal_firmas_datos",{p_tok:S.tok,p_ids:firmados.map(f=>f.id)});
      D.sort((a,b)=>(a.datos.nombre||"").localeCompare(b.datos.nombre||""));guardaPDF(await pdfDe(D),"Calendarios-"+A.anio+"-"+A.eq+".pdf");}catch(e){toast(e.message);}}})]));
  return card;}
function enviar(ult){const R=A.R;if(!R.dias.length&&!confirm("No hay ningún día marcado en "+A.anio+". ¿Enviarlo igualmente?"))return;
  const sel=new Set(R.trabajadores.filter(w=>!(ult[w.id]&&ult[w.id].firmado_en)).map(w=>w.id));
  const box=el("div");R.trabajadores.forEach(w=>{const f=ult[w.id];box.appendChild(el("label",{style:"display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)"},[
    el("input",{type:"checkbox",checked:sel.has(w.id),style:"width:22px;height:22px",onchange:e=>{if(e.target.checked)sel.add(w.id);else sel.delete(w.id);}}),
    el("span",{style:"flex:1",text:w.nombre}),f&&f.firmado_en?el("span",{class:"pill ok",text:"ya firmó"}):null]));});
  dlg("Enviar el calendario "+A.anio,el("div",null,[el("p",{class:"hint",style:"margin-top:0",text:"Se manda tal y como está ahora, con las vacaciones de cada uno. Si alguien ya firmó y se lo vuelves a mandar, tendrá que firmar otra vez."}),box]),
    [{t:"Cancelar",cls:"sec"},{t:"Enviar",cls:"ok",fn:async()=>{if(!sel.size){toast("Elige al menos a uno");return false;}const n=await rpc("cal_enviar",{p_tok:S.tok,p_anio:A.anio,p_equipo:A.eq,p_trab:[...sel]});toast("Enviado a "+n+" trabajador"+(n>1?"es":""));vJefe();}}]);}
})();

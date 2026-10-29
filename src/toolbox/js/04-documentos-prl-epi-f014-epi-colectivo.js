// ====== DOCUMENTOS PRL: EPI (F014), EPI colectivo (F072), Información (F022), Botiquín (F018) ======
const DOC_INFO = {
  epi:      {t:'Entrega de EPI', c:'SH-CORP-SP-FO-014', pdf:'plantillas/SH-CORP-SP-FO-014.pdf', firma:true},
  epi_col:  {t:'EPI de uso colectivo (altura)', c:'SH-CORP-SP-FO-072', pdf:'plantillas/SH-CORP-SP-FO-072.pdf', firma:true},
  info:     {t:'Entrega de información', c:'SH-CORP-SP-FP-022', pdf:'plantillas/SH-CORP-SP-FP-022.pdf', firma:true},
  botiquin: {t:'Revisión del botiquín', c:'SH-CORP-SP-FO-018', pdf:'plantillas/SH-CORP-SP-FO-018.pdf', firma:false},
  autoriz:  {t:'Autorización de uso de maquinaria', c:'AUTORIZ.', pdf:null, firma:true}
};
const MAQUINAS=['Carretilla elevadora','Plataforma elevadora móvil de personal (PEMP)','Puente grúa','Grúa autocargante','Transpaleta eléctrica','Apilador eléctrico','Barredora / fregadora con conductor','Hidrolimpiadora de alta presión','Escalera / andamio móvil'];
const AUT_TXT=['Ha recibido la formación e información adecuadas sobre los riesgos derivados de su utilización y las medidas preventivas a adoptar.',
  'Utilizará los equipos conforme a las instrucciones del fabricante, las normas de seguridad del centro y solo para las tareas para las que han sido diseñados.',
  'Revisará el equipo antes de cada uso y comunicará de inmediato a su responsable cualquier anomalía o deterioro, sin utilizarlo hasta su reparación.',
  'Esta autorización es personal e intransferible y podrá ser revocada por la empresa en cualquier momento.'];
// F014: [clave, texto, lado, y0, y1, categorías]
const EPI_L = { unit:[289.4,319.5], cat2:[[319.5,366.6],[366.6,435.2]], cat3:[[320.8,361.4],[363.4,407.2],[407.2,435.2]] };
const EPI_R = { unit:[600.3,631], cat3:[[631,675.6],[675.6,719.4],[719.4,755.5]] };
const EPI_ITEMS = [
  ['gafas','Gafas de protección (EN 166)','L',132.2,150,['Partículas','Salpicadura']],
  ['gafas_sold','Gafas para soldadura (EN 166)','L',150,168],
  ['pantalla','Pantalla facial (EN 166; EN 169)','L',168,184.5],
  ['tapon_cordon','Tapón auditivo con cordón (EN 352-2)','L',184.5,202.5],
  ['tapones','Tapones auditivos desechables (EN 352-2)','L',202.5,220],
  ['orejeras','Orejeras (EN 352-1)','L',220,237],
  ['orejeras_casco','Orejeras para cascos (EN 352-3)','L',237,256],
  ['arnes','Arnés de seguridad anticaída (EN 361; EN 354)','L',256,273],
  ['mosqueton','Mosquetón (EN 361; EN 354)','L',273,291],
  ['cuerda','Cuerda de amarre (EN 362; EN 354)','L',291,307.5],
  ['mascarilla','Mascarilla autofiltrante (EN 149)','L',314,329.5,['Vapores','Partículas']],
  ['media_mascara','Media máscara (EN 405:2001)','L',329.5,350.5],
  ['mascara','Máscara completa (EN 136; EN 140)','L',350.5,370],
  ['filtros','Filtros (EN 140)','L',370,388.5],
  ['casco','Casco de seguridad (EN 397; EN 50365)','L',388.5,414.2],
  ['zapato','Zapato (EN ISO 20345)','L',420.5,438,['Puntera','Anti-perfo','Agua']],
  ['bota','Bota (EN ISO 20345)','L',438,459.2,['Puntera','Anti-perfo','Agua']],
  ['guantes_quim','Guantes química (EN 388; EN 374)','R',132.2,150,['Nitrilo','Neopreno','Látex']],
  ['guantes_mec','Guantes mecánica (EN 388)','R',150,168],
  ['guantes_corte','Guantes anticorte (EN 388; EN 1082)','R',168,184.5],
  ['guantes_term','Guantes térmica (EN 511 / EN 407)','R',184.5,202.5],
  ['guantes_diel','Guantes dieléctrica (EN 60903)','R',202.5,220],
  ['guantes_sold','Guantes soldadura (EN 388; EN 407)','R',220,237],
  ['parka','Parka frío (EN 342)','R',237,256],
  ['traje_agua','Traje de agua 2 piezas (EN 343)','R',256,273],
  ['delantal','Delantal (EN 343)','R',273,291],
  ['chaleco','Chaleco reflectante (EN 20471)','R',291,307.5],
  ['tyvek','Traje buzo tipo Tyvek (EN 13034)','R',307.5,329.5],
  ['unif_refl','Uniformidad reflectante (EN 20471)','R',329.5,350.5],
  ['ignifugo','Vestuario ignífugo / antiestático','R',350.5,370]
];
const MOTIVOS_EPI=['Primera entrega','Reposición: rotura','Reposición: pérdida o extravío','Reposición: desgaste','Cambio de talla','Otro'];
// Texto del motivo tal como se imprime («Otro» se sustituye por lo que se escribe)
const motivoTxt=v=>!v||!v.motivo?'':(v.motivo==='Otro'?(v.mtxt||'Otro'):v.motivo);
const EPI_OTROS_Y = [[370,388.5],[388.5,414.2],[414.2,438],[438,459.2]];
const EPI_GRUPOS = [['Protección ocular y facial',['gafas','gafas_sold','pantalla']],['Protección auditiva',['tapon_cordon','tapones','orejeras','orejeras_casco']],
  ['Anticaídas',['arnes','mosqueton','cuerda']],['Protección respiratoria',['mascarilla','media_mascara','mascara','filtros']],['Cabeza y pies',['casco','zapato','bota']],
  ['Manos',['guantes_quim','guantes_mec','guantes_corte','guantes_term','guantes_diel','guantes_sold']],['Otros elementos de protección',['parka','traje_agua','delantal','chaleco','tyvek','unif_refl','ignifugo']]];
const EPI_DECL = ['Ha recibido el equipo arriba mencionado. Este material es propiedad de la empresa, por lo que el trabajador lo recibe en depósito. En caso de pérdida, rotura o extravío deberá notificarlo inmediatamente a su responsable.',
  'Ha sido formado e informado y conoce el correcto uso y mantenimiento de los equipos de protección entregados.','Se compromete a utilizarlos debidamente en la realización de las tareas que así los requieran.'];
// F072
const COL_ITEMS = [
  ['arnes','Arnés de seguridad anticaída (EN 361; EN 354)',137.5,165],['amarre_simple','Cuerda amarre simple + absorbedor (EN 355, EN 362)',165,196],
  ['mosqueton','Mosquetón (EN 362; EN 354)',196,226.5],['amarre_y','Cuerda amarre "Y" + absorbedor A85 (EN 355; EN 362)',226.5,259],
  ['regulable','Cuerda simple regulable + absorbedor (EN 355; EN 362)',259,292],['retractil','Anticaídas retráctil de reposición automática (EN 360)',292,331],
  ['movil','Dispositivo anticaídas móvil (EN 353-2)',331,375.5],['rocker','Anticaídas Rocker (EN 353-2; EN 358; EN 12841-A)',375.5,413.5],
  ['cintas','Cintas de anclaje (EN 795B - EN 354)',413.5,447.5]
];
const COL_DECL = ['Ha recibido el equipo arriba mencionado, habiéndolo revisado previo al uso. Este material es propiedad de la empresa, por lo que el trabajador lo recibe en depósito.',
  'En caso de pérdida, rotura o extravío deberá notificarlo inmediatamente a su responsable.','Ha sido formado e informado y conoce el correcto uso y mantenimiento de los equipos de protección entregados.',
  'Se compromete a utilizarlos debidamente en la realización de las tareas que así los requieran.'];
// F022
const INFO_DOCS = ['Fichas de información de riesgos laborales para el trabajador, correspondientes a su puesto de trabajo.','Manual de Seguridad (Handbook).',
  'Política de Calidad, Medio Ambiente, Seguridad y Salud Laboral y Responsabilidad Corporativa.','¡Bienvenido a la gran familia de ISS!'];
const INFO_URL = 'https://brand.issworld.com/web/5326a00fea1a5898/pol-ticas-iss---colaboradores/';
// F018: [texto, mínimo, y0, y1]
const BOT_ITEMS = [
  ['Desinfectante: botella de agua oxigenada',1,222.8,237],['Antiséptico: povidona yodada',1,237,251.2],['Algodón',1,251.2,265.5],['Caja de bandas protectoras / tiritas',1,265.5,279.8],
  ['Vendas',5,279.8,294],['Esparadrapo',1,294,308.2],['Gasa 20 × 20 cm (sobre 5 u)',3,308.2,322.5],['Tijera de cirugía',1,322.5,336.8],['Pinza de disección',1,336.8,351],
  ['Par de guantes de látex/nitrilo',2,351,365.2],['Botella de alcohol',1,365.2,379.5],['Venda elástica Crepe',1,379.5,393.8],['Suero fisiológico 5 ml',0,393.8,408]
];
const BOT_PREG = [['repuesto','¿Has podido reponer los productos marcados con NO del stock de reserva?',444.2,475.5],['conserv','Conservación del armario/maletín en adecuadas condiciones',504,518.2],
  ['ident','Identificación de la Mutua y teléfono de la línea asistencial 24 h en el exterior de la puerta',518.2,541],['ubicado','Correctamente ubicado y fácilmente accesible para el personal',541,555.2]];

const fLarga2 = d => { if(!d) return ''; const [y,m,dd]=d.split('-'); return `${+dd} de ${MESES[+m-1].toLowerCase()} de ${y}`; };
function docTitulo(d){ return DOC_INFO[d.tipo].t + (d.tipo==='botiquin' && d.datos.ubicacion ? ' · '+d.datos.ubicacion : ''); }
function docEstado(d){
  if(d.tipo==='botiquin'){ const ok=(d.tiene_firma||d.datos.usar_mi_firma); return ok&&d.tiene_firma2?['Completa','ok']:['Faltan firmas','warn']; }
  if(d.tiene_firma) return ['Firmado','ok']; if(d.enviada_en) return ['Pendiente de firma','blue']; return ['Sin enviar','warn'];
}

// Selector de motivo (se muestra solo cuando el equipo está marcado)
function motivoHTML(cls,attr,v,visible){ const sel=(v&&v.motivo)||'Primera entrega'; const otro=sel==='Otro';
  return `<span class="${cls}w" ${attr} style="display:${visible?'flex':'none'};gap:6px;flex-wrap:wrap;width:100%;padding-left:32px"><select class="inp ${cls}" ${attr} style="flex:1;min-width:200px;min-height:38px">${MOTIVOS_EPI.map(m=>`<option ${m===sel?'selected':''}>${esc(m)}</option>`).join('')}</select><input class="inp ${cls}t" ${attr} placeholder="Escribe el motivo" value="${esc(v&&v.mtxt||'')}" style="flex:1;min-width:160px;min-height:38px;display:${otro?'block':'none'}"></span>`; }
// ---- lo que lee el trabajador
function htmlDoc(d){
  const x=d.datos||{}; let h=`<div class="card"><div class="small muted">${esc(DOC_INFO[d.tipo].c)}</div><div class="tema" style="margin:4px 0 8px">${esc(DOC_INFO[d.tipo].t)}</div>
    <div class="li"><span class="grow small muted">Trabajador</span><b>${esc(d.nombre||'')}</b></div>
    <div class="li"><span class="grow small muted">Fecha</span><b>${fmtF(d.fecha)}</b></div>${d.puesto?`<div class="li"><span class="grow small muted">Puesto</span><b>${esc(d.puesto)}</b></div>`:''}</div>`;
  if(d.tipo==='epi'){
    const its=x.items||{}; const filas=EPI_ITEMS.filter(i=>its[i[0]]).map(i=>{ const v=its[i[0]]; return `<li><b>${esc(i[1])}</b>${v.u?` · ${esc(v.u)} ud.`:''}${(v.cat||[]).length?` · ${esc(v.cat.join(', '))}`:''}${motivoTxt(v)?` · <i>${esc(motivoTxt(v))}</i>`:''}</li>`; });
    (x.otros||[]).filter(o=>o&&o.t).forEach(o=>filas.push(`<li><b>${esc(o.t)}</b>${o.u?` · ${esc(o.u)} ud.`:''}${o.c?` · ${esc(o.c)}`:''}${motivoTxt(o)?` · <i>${esc(motivoTxt(o))}</i>`:''}</li>`));
    h+=`<div class="card read"><div class="tema">Equipos que recibes</div><ul>${filas.join('')||'<li>—</li>'}</ul></div>
      <div class="card read"><p>En cumplimiento del artículo 17.2 de la Ley de Prevención de Riesgos Laborales es obligatorio el uso de equipos de protección individual. La empresa pone a tu disposición los equipos indicados.</p><b>Al firmar declaras que:</b><ol>${EPI_DECL.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></div>`;
  } else if(d.tipo==='epi_col'){
    const its=x.items||{}; const filas=COL_ITEMS.filter(i=>its[i[0]]).map(i=>`<li><b>${esc(i[1])}</b>${its[i[0]].serie?` · Nº serie ${esc(its[i[0]].serie)}`:''}</li>`);
    if(x.otros) filas.push(`<li><b>${esc(x.otros)}</b></li>`);
    h+=`<div class="card read"><div class="tema">Equipos de trabajo en altura que recibes</div><p class="small muted">Entrega temporal · ${fmtF(d.fecha)}${x.hora?' a las '+esc(x.hora):''}</p><ul>${filas.join('')||'<li>—</li>'}</ul></div>
      <div class="card read"><b>Al firmar declaras que:</b><ol>${COL_DECL.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></div>`;
  } else if(d.tipo==='autoriz'){
    h+=`<div class="card read"><p>La empresa <b>${esc(x.empresa||'')}</b> autoriza a <b>${esc(d.nombre||'')}</b> a utilizar los siguientes equipos de trabajo${x.hasta?` hasta el <b>${fmtF(x.hasta)}</b>`:''}:</p>
      <ul>${(x.maquinas||[]).map(m=>`<li><b>${esc(m)}</b></li>`).join('')||'<li>—</li>'}</ul>${x.obs?`<p class="small">${esc(x.obs)}</p>`:''}<b>El trabajador declara y se compromete a que:</b><ol>${AUT_TXT.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></div>`;
  } else if(d.tipo==='info'){
    h+=`<div class="card read"><p>En base a lo dispuesto en el artículo 18 de la Ley de Prevención de Riesgos Laborales (Ley 31/1995), se te entrega la siguiente información, disponible en <a href="${INFO_URL}" target="_blank" rel="noopener">la web de ISS</a>:</p><ul>${INFO_DOCS.map(t=>`<li><b>${esc(t)}</b></li>`).join('')}</ul>
      <p>Con la firma de este documento te comprometes a leer atentamente la información facilitada y, como consecuencia de ello, a cumplir con las obligaciones detalladas en el art. 29 de la Ley 31/1995 en materia de prevención.</p>
      <a class="btn sec" href="${INFO_URL}" target="_blank" rel="noopener" style="width:100%;text-decoration:none">Abrir la información de ISS</a></div>`;
  }
  return h;
}
function textoDoc(d){ const div=document.createElement('div'); div.innerHTML=htmlDoc(d); return div.innerText.replace(/\s+/g,' '); }

// ---- trabajador: leer y firmar
async function pantallaDocLeer(id){
  view(barra('Documento para firmar', `<button class="ib" id="bk">‹</button>`, `<button class="ib" id="voz">Escuchar</button>`) + `<div class="wrap" id="w"><div class="empty"><span class="spin dk"></span></div></div>`);
  $('#bk').onclick=()=>{ pararVoz(); S.yo.rol==='admin'?pantallaDocDetalle(id):pantallaOperario(); };
  let d; try{ d=await rpc('prl_doc_ver',{p_tok:S.tok,p_id:id}); }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  $('#voz').onclick=e=>hablar(e.currentTarget, textoDoc(d));
  let h=htmlDoc(d);
  if(!d.tiene_firma && S.yo.rol==='admin'){ h+=`<div class="card small muted">Así lo ve el trabajador. Para recoger su firma en tu móvil usa “Firmar aquí” en la ficha.</div>`; $('#w').innerHTML=h; return; }
  if(d.tiene_firma){ h+=`<div class="card done"><div class="big">✓</div><h3 style="margin:10px 0 4px">Firmado</h3><div class="muted small">${fmtFH(d.firmado_en)}</div>${d.firma?`<img src="${d.firma}" style="max-height:70px;margin-top:10px">`:''}</div>`; $('#w').innerHTML=h; return; }
  h+=`<div class="card"><b>Tu firma</b><label class="check"><input type="checkbox" id="leido"><span>${d.tipo==='info'?'He recibido esta información y me comprometo a leerla.':d.tipo==='autoriz'?'He leído la autorización y me comprometo a cumplir estas normas.':'He recibido los equipos y conozco su uso correcto.'}</span></label>
    <div class="sigbox" id="sb"><canvas></canvas><div class="sigline"></div><div class="ph">Firma aquí con el dedo</div></div>
    <div class="row" style="margin-top:8px"><span class="small muted grow">${esc(d.nombre||'')}</span><button class="btn ghost" id="borra">Borrar</button></div></div><div style="height:70px"></div>
    <div class="sticky-act"><div><button class="btn big ok" id="firmar" disabled>Firmar</button></div></div>`;
  $('#w').innerHTML=h;
  const pad=sigPad($('#sb')); const upd=()=>{ $('#firmar').disabled=!($('#leido').checked&&!pad.vacio()); };
  pad.onchange=upd; $('#leido').onchange=upd; $('#borra').onclick=()=>{pad.limpiar();upd();};
  $('#firmar').onclick=async e=>{ const b=e.currentTarget; busy(b,true);
    try{ await rpc('prl_doc_firmar',{p_tok:S.tok,p_id:id,p_firma:pad.png(),p_cual:1}); pararVoz(); toast('¡Firmado! Gracias.'); pantallaDocLeer(id); }catch(err){ busy(b,false); toast(err.message,true); } };
}

// ---- jefe: lista
async function pantallaDocumentos(){
  pararVoz(); S.seccion='docs';
  view(barra('Toolbox HSE', `<button class="ib" id="out">‹ Limpieza</button>`, `<button class="ib" id="cfg" title="Ajustes">Ajustes</button>`) +
    `<div class="wrap">${tabsSeccion()}<div class="row" style="margin-bottom:12px"><button class="btn sec" id="prev">‹</button><b class="grow" style="text-align:center;font-size:20px;color:var(--navy)">${S.anio}</b><button class="btn sec" id="next">›</button></div>
    <button class="btn big sec" id="fichas" style="margin-bottom:14px">Fichas por trabajador (registro de EPI y ropa)</button>
    <div class="h2" style="margin-top:0">Nuevo documento</div>
    <div class="months" style="margin-bottom:6px">${Object.entries(DOC_INFO).map(([k,v])=>`<button class="mcard" data-nuevo="${k}" style="min-height:auto"><span class="mn" style="font-size:15px">＋ ${esc(v.t)}</span><span class="tt">${esc(v.c)}</span></button>`).join('')}</div>
    <div id="w" class="empty"><span class="spin dk"></span></div></div>`);
  $('#out').onclick=volverLimpieza; $('#cfg').onclick=pantallaAjustes; enlazarSeccion();
  $('#prev').onclick=()=>{S.anio--; pantallaDocumentos();}; $('#next').onclick=()=>{S.anio++; pantallaDocumentos();};
  document.querySelectorAll('[data-nuevo]').forEach(b=>b.onclick=()=>pantallaDocEditar(b.dataset.nuevo));
  $('#fichas').onclick=pantallaFichas;
  let L; try{ L=await rpc('prl_doc_lista',{p_tok:S.tok,p_anio:S.anio}); }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  if(!L.length){ $('#w').outerHTML=`<div id="w" class="card empty">Todavía no hay documentos en ${S.anio}.</div>`; return; }
  let h=''; const pend=L.filter(d=>d.tipo!=='botiquin'&&!d.tiene_firma&&d.enviada_en);
  if(pend.length) h+=`<button class="btn sec" id="recAll" style="width:100%;margin:8px 0">Recordar a los ${pend.length} que faltan por firmar</button>`;
  for(const [k,v] of Object.entries(DOC_INFO)){
    const ds=L.filter(d=>d.tipo===k); if(!ds.length) continue;
    const firm=ds.filter(d=>k==='botiquin'?true:d.tiene_firma);
    h+=`<div class="row" style="margin:18px 2px 8px"><div class="h2 grow" style="margin:0">${esc(v.t)}</div>${firm.length?`<button class="btn ghost" data-pdft="${k}">PDF de todos (${firm.length})</button>`:''}</div><div class="card">`+
      ds.map(d=>{ const [t,c]=docEstado(d); const sub = k==='botiquin' ? `Revisión ${fmtF(d.fecha)} · próxima ${fmtF(sumaMeses(d.fecha,3))}` : fmtF(d.fecha);
        return `<div class="li" data-id="${esc(d.id)}" style="cursor:pointer"><span class="dot ${c==='ok'?'ok':''}"></span><span class="grow"><span class="nm">${esc(k==='botiquin'?(d.datos.ubicacion||'Botiquín'):d.nombre)}</span><br><span class="small muted">${sub}</span></span><span class="chip ${c}">${t}</span></div>`; }).join('')+`</div>`;
    S['docs_'+k]=firm.map(d=>d.id);
  }
  $('#w').outerHTML=`<div id="w">${h}</div>`;
  document.querySelectorAll('[data-id]').forEach(el=>el.onclick=()=>pantallaDocDetalle(el.dataset.id));
  document.querySelectorAll('[data-pdft]').forEach(b=>b.onclick=e=>pdfDocs(S['docs_'+b.dataset.pdft], `${DOC_INFO[b.dataset.pdft].c} ${DOC_INFO[b.dataset.pdft].t} ${S.anio}.pdf`, e.currentTarget));
  if($('#recAll')) $('#recAll').onclick=async e=>{ const b=e.currentTarget; busy(b,true); try{ const r=await rpc('prl_doc_enviar',{p_tok:S.tok,p_ids:pend.map(d=>d.id)}); toast(`Aviso enviado a ${r.avisados}`); }catch(err){ toast(err.message,true); } busy(b,false); };
}
function sumaMeses(f,n){ const d=new Date(f+'T12:00:00'); d.setMonth(d.getMonth()+n); return d.toISOString().slice(0,10); }

// ---- jefe: nuevo / editar
async function pantallaDocEditar(tipo, d){
  pararVoz(); const nuevo=!d; d=d||{datos:{}}; tipo=tipo||d.tipo; const x=JSON.parse(JSON.stringify(d.datos||{}));
  view(barra((nuevo?'Nuevo: ':'Editar: ')+DOC_INFO[tipo].t, `<button class="ib" id="bk">‹</button>`) + `<div class="wrap" id="w"><div class="empty"><span class="spin dk"></span></div></div>`);
  $('#bk').onclick=()=> nuevo? docsVolver() : docVer(d.id);
  try{ S.trabX=await rpc('prl_trab_lista',{p_tok:S.tok}); S.cfg=S.yo.rol==='admin'? await rpc('prl_config_leer',{p_tok:S.tok}) : {}; }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  const ops=S.trabX.filter(t=>t.rol==='operario');
  let h='';
  if(tipo!=='botiquin'){
    h+= nuevo ? `<div class="card"><b>Trabajadores</b><div class="small muted">Se crea un documento para cada uno.</div>
      <div class="row" style="margin:8px 0"><button class="btn ghost" id="todos">Todos</button><button class="btn ghost" id="ninguno">Ninguno</button></div>
      ${ops.map(t=>`<label class="li" style="cursor:pointer"><input type="checkbox" class="tw" value="${esc(t.id)}" style="width:22px;height:22px"><span class="grow nm">${esc(t.nombre)}</span><span class="small ${t.dni?'muted':''}" style="${t.dni?'':'color:var(--warn)'}">${t.dni?esc(t.dni):'sin DNI'}</span></label>`).join('')}
      <p class="small muted" style="margin-bottom:0">El DNI y el puesto se ponen en Ajustes → Trabajadores.</p></div>` : `<div class="card"><b>${esc(d.nombre)}</b></div>`;
  }
  h+=`<div class="card"><label class="f">Fecha</label><input class="inp" type="date" id="d_fec" value="${esc(d.fecha||hoyISO())}">`;
  if(tipo==='epi'||tipo==='info'||tipo==='autoriz') h+=`<label class="f">Lugar (para “En …, a … de …”)</label><input class="inp" id="d_lug" value="${esc(x.lugar??(S.cfg.lugar||''))}">`;
  if(tipo==='info') h+=`<label class="f">Empresa</label><input class="inp" id="d_emp" value="${esc(x.empresa??(S.cfg.empresa||''))}">`;
  if(tipo==='autoriz') h+=`<label class="f">Empresa</label><input class="inp" id="a_emp" value="${esc(x.empresa??(S.cfg.empresa||''))}">
    <label class="f">Válida hasta (opcional)</label><input class="inp" type="date" id="a_hasta" value="${esc(x.hasta||'')}">
    <label class="f">Autoriza (nombre y cargo)</label><input class="inp" id="a_por" value="${esc(x.autoriza??((S.cfg.formador||S.yo.nombre)+' · Responsable'))}">`;
  if(tipo==='epi_col') h+=`<label class="f">Hora de entrega</label><input class="inp" type="time" id="d_hora" value="${esc(x.hora||new Date().toTimeString().slice(0,5))}">`;
  if(tipo==='botiquin') h+=`<label class="f">Empresa Grupo ISS</label><input class="inp" id="b_emp" value="${esc(x.empresa??(S.cfg.empresa||''))}">
    <label class="f">Ubicación</label><input class="inp" id="b_ubi" placeholder="ej. Nave 1, vestuario" value="${esc(x.ubicacion||'')}">
    <label class="f">Centro</label><input class="inp" id="b_cen" value="${esc(x.centro??(S.cfg.centro||''))}">`;
  h+=`</div>`;
  if(tipo==='epi'){
    const its=x.items||{};
    h+=EPI_GRUPOS.map(([g,keys])=>`<div class="card"><b>${esc(g)}</b>${keys.map(k=>{ const it=EPI_ITEMS.find(i=>i[0]===k), v=its[k]; return `
      <div class="li" style="flex-wrap:wrap"><label style="display:flex;gap:10px;align-items:center;flex:1;min-width:200px;cursor:pointer"><input type="checkbox" class="ei" data-k="${k}" ${v?'checked':''} style="width:22px;height:22px"><span>${esc(it[1])}</span></label>
      <input class="inp eu" data-k="${k}" type="number" min="1" placeholder="Ud." value="${esc(v&&v.u||'')}" style="width:76px;min-height:38px">
      ${motivoHTML('em',`data-k="${k}"`,v,!!v)}
      ${it[5]?`<div style="width:100%;padding-left:32px" class="row">${it[5].map(c=>`<label class="chip" style="cursor:pointer"><input type="checkbox" class="ec" data-k="${k}" value="${esc(c)}" ${v&&(v.cat||[]).includes(c)?'checked':''}> ${esc(c)}</label>`).join('')}</div>`:''}</div>`; }).join('')}</div>`).join('');
    const ot=x.otros||[];
    h+=`<datalist id="ropa">${['Pantalón de trabajo','Camiseta','Polo','Camisa','Chaqueta','Forro polar','Chaleco','Sudadera','Bata','Gorra','Calcetines'].map(r=>`<option value="${r}">`).join('')}</datalist><div class="card"><b>Ropa de trabajo y otros elementos</b><div class="small muted">Escribe o elige la prenda (pantalón, camiseta, polo…).</div>${[0,1,2,3].map(i=>`<div class="row" style="margin-top:6px"><input class="inp eo grow" list="ropa" data-i="${i}" placeholder="Prenda o elemento" value="${esc(ot[i]&&ot[i].t||'')}"><input class="inp eou" data-i="${i}" type="number" min="1" placeholder="Ud." value="${esc(ot[i]&&ot[i].u||'')}" style="width:76px">${motivoHTML('eom',`data-i="${i}"`,ot[i],!!(ot[i]&&ot[i].t))}</div>`).join('')}</div>`;
  }
  if(tipo==='epi_col'){
    const its=x.items||{};
    h+=`<div class="card"><b>Equipos que se entregan</b>${COL_ITEMS.map(([k,t])=>`<div class="li" style="flex-wrap:wrap"><label style="display:flex;gap:10px;align-items:center;flex:1;min-width:200px;cursor:pointer"><input type="checkbox" class="ci" data-k="${k}" ${its[k]?'checked':''} style="width:22px;height:22px"><span>${esc(t)}</span></label><input class="inp cs" data-k="${k}" placeholder="Nº serie" value="${esc(its[k]&&its[k].serie||'')}" style="width:130px;min-height:38px"></div>`).join('')}
      <label class="f">Otros EPI</label><input class="inp" id="c_otros" value="${esc(x.otros||'')}"></div>`;
  }
  if(tipo==='autoriz'){
    const ms=new Set(x.maquinas||[]); const otras=(x.maquinas||[]).filter(m=>!MAQUINAS.includes(m));
    h+=`<div class="card"><b>Equipos que puede utilizar</b>${MAQUINAS.map(m=>`<label class="li" style="cursor:pointer"><input type="checkbox" class="am" value="${esc(m)}" ${ms.has(m)?'checked':''} style="width:22px;height:22px"><span class="grow">${esc(m)}</span></label>`).join('')}
      <label class="f">Otros equipos (separados por comas)</label><input class="inp" id="a_otras" value="${esc(otras.join(', '))}">
      <label class="f">Observaciones / limitaciones</label><textarea class="inp" id="a_obs">${esc(x.obs||'')}</textarea>
      <p class="small muted" style="margin-bottom:0">Antes de autorizar, comprueba en su ficha que tiene el curso correspondiente en vigor.</p></div>`;
  }
  if(tipo==='botiquin'){
    const its=x.items||[];
    h+=`<div class="card"><b>Material del botiquín</b><div class="small muted">Cantidad actual y si está en buen estado y sin caducar.</div>${BOT_ITEMS.map(([t,min],i)=>{ const v=its[i]||{}; return `
      <div class="li" style="flex-wrap:wrap"><span class="grow" style="min-width:180px">${esc(t)} <span class="small muted">(mín. ${min})</span></span>
      <input class="inp ba" data-i="${i}" type="number" min="0" placeholder="Actual" value="${esc(v.a??'')}" style="width:80px;min-height:38px">
      <span class="row" style="gap:4px"><button class="btn ${v.ok===true?'ok':'sec'} bs" data-i="${i}" data-v="1" style="min-height:38px;padding:6px 12px">SÍ</button><button class="btn ${v.ok===false?'':'sec'} bs" data-i="${i}" data-v="0" style="min-height:38px;padding:6px 12px;${v.ok===false?'background:var(--bad);color:#fff':''}">NO</button></span></div>`; }).join('')}
      <label class="f">Otros productos aprobados por el SPM</label><div class="row"><input class="inp grow" id="b_otros" value="${esc(x.otros||'')}"><input class="inp" id="b_otros_a" type="number" min="0" placeholder="Actual" value="${esc(x.otros_a??'')}" style="width:80px"></div></div>
      <div class="card"><b>Comprobaciones</b>${BOT_PREG.map(([k,t])=>`<div class="li" style="flex-wrap:wrap"><span class="grow" style="min-width:180px">${esc(t)}</span><span class="row" style="gap:4px"><button class="btn ${x[k]===true?'ok':'sec'} bp" data-k="${k}" data-v="1" style="min-height:38px;padding:6px 12px">SÍ</button><button class="btn ${x[k]===false?'':'sec'} bp" data-k="${k}" data-v="0" style="min-height:38px;padding:6px 12px;${x[k]===false?'background:var(--bad);color:#fff':''}">NO</button></span></div>`).join('')}
      <div class="row" style="margin-top:8px"><div class="grow"><label class="f">Nº botiquines completos necesarios</label><input class="inp" id="b_nb" type="number" min="0" value="${esc(x.n_bot??'')}"></div><div class="grow"><label class="f">Nº reposiciones necesarias</label><input class="inp" id="b_nr" type="number" min="0" value="${esc(x.n_rep??'')}"></div></div></div>
      <div class="card"><label class="f">Quién realiza el control</label><input class="inp" id="b_rea" value="${esc(x.realiza??S.yo.nombre)}">
      <label class="check"><input type="checkbox" id="b_mia" ${x.usar_mi_firma!==false?'checked':''}><span>Usar mi firma guardada (Ajustes)</span></label>
      <label class="f">Supervisado por (Gestor de Servicios)</label><input class="inp" id="b_sup" value="${esc(x.supervisa||S.cfg.resp_nombre||'')}"></div>`;
  }
  h+=`<div class="row">${nuevo&&DOC_INFO[tipo].firma?`<button class="btn sec grow" id="g1">Guardar</button><button class="btn grow" id="g2">Guardar y enviar</button>`:`<button class="btn grow" id="g1">Guardar</button>`}</div>`;
  $('#w').innerHTML=h;
  if($('#todos')){ $('#todos').onclick=()=>document.querySelectorAll('.tw').forEach(c=>c.checked=true); $('#ninguno').onclick=()=>document.querySelectorAll('.tw').forEach(c=>c.checked=false); }
  // SÍ/NO
  const sino=(sel,set)=>document.querySelectorAll(sel).forEach(b=>b.onclick=()=>{ const v=b.dataset.v==='1'; set(b,v);
    b.parentNode.querySelectorAll('button').forEach(o=>{ const on=(o.dataset.v==='1')===v; o.className=o.className.replace(/\b(ok|sec)\b/g,'').trim()+' '+(on?(v?'ok':''):'sec'); o.style.background=on&&!v?'var(--bad)':''; o.style.color=on&&!v?'#fff':''; }); });
  if(tipo==='botiquin'){ x.items=x.items||[]; sino('.bs',(b,v)=>{ const i=+b.dataset.i; x.items[i]=x.items[i]||{}; x.items[i].ok=v; }); sino('.bp',(b,v)=>{ x[b.dataset.k]=v; }); }
  document.querySelectorAll('.eu').forEach(i=>i.oninput=()=>{ const c=document.querySelector(`.ei[data-k="${i.dataset.k}"]`); if(i.value){ c.checked=true; const w=document.querySelector(`.emw[data-k="${i.dataset.k}"]`); if(w) w.style.display='flex'; } });
  document.querySelectorAll('.ec').forEach(i=>i.onchange=()=>{ if(i.checked) document.querySelector(`.ei[data-k="${i.dataset.k}"]`).checked=true; });
  document.querySelectorAll('.cs').forEach(i=>i.oninput=()=>{ if(i.value) document.querySelector(`.ci[data-k="${i.dataset.k}"]`).checked=true; });
  const leerMotivo=(cls,sel)=>{ const m=document.querySelector(`select.${cls}${sel}`); const mv=m?m.value:'Primera entrega'; const t=document.querySelector(`input.${cls}t${sel}`); return mv==='Otro'?{motivo:'Otro',mtxt:(t?t.value.trim():'')}:{motivo:mv}; };
  document.querySelectorAll('.ei').forEach(c=>c.onchange=()=>{ const w=document.querySelector(`.emw[data-k="${c.dataset.k}"]`); if(w) w.style.display=c.checked?'flex':'none'; });
  document.querySelectorAll('select.em,select.eom').forEach(sl=>sl.onchange=()=>{ const t=sl.parentNode.querySelector('input'); if(t) t.style.display=sl.value==='Otro'?'block':'none'; });
  const recoger=()=>{
    const p={tipo, fecha:$('#d_fec').value, datos:{}}; const D=p.datos;
    if($('#d_lug')) D.lugar=$('#d_lug').value.trim(); if($('#d_emp')) D.empresa=$('#d_emp').value.trim(); if($('#d_hora')) D.hora=$('#d_hora').value;
    if(tipo==='epi'){ D.items={}; document.querySelectorAll('.ei:checked').forEach(c=>{ const k=c.dataset.k; D.items[k]={u:document.querySelector(`.eu[data-k="${k}"]`).value||'', cat:[...document.querySelectorAll(`.ec[data-k="${k}"]:checked`)].map(e=>e.value), ...leerMotivo('em',`[data-k="${k}"]`)}; });
      D.otros=[0,1,2,3].map(i=>({t:document.querySelector(`.eo[data-i="${i}"]`).value.trim(), u:document.querySelector(`.eou[data-i="${i}"]`).value, ...leerMotivo('eom',`[data-i="${i}"]`)})).filter(o=>o.t);
      if(!Object.keys(D.items).length && !D.otros.length) throw new Error('Marca al menos un equipo'); }
    if(tipo==='epi_col'){ D.items={}; document.querySelectorAll('.ci:checked').forEach(c=>{ D.items[c.dataset.k]={serie:document.querySelector(`.cs[data-k="${c.dataset.k}"]`).value.trim()}; }); D.otros=$('#c_otros').value.trim();
      if(!Object.keys(D.items).length && !D.otros) throw new Error('Marca al menos un equipo'); }
    if(tipo==='autoriz'){ D.empresa=$('#a_emp').value.trim(); D.hasta=$('#a_hasta').value; D.autoriza=$('#a_por').value.trim(); D.obs=$('#a_obs').value.trim();
      D.maquinas=[...document.querySelectorAll('.am:checked')].map(c=>c.value).concat($('#a_otras').value.split(',').map(s=>s.trim()).filter(Boolean));
      if(!D.maquinas.length) throw new Error('Marca al menos un equipo'); }
    if(tipo==='botiquin'){ Object.assign(D,{empresa:$('#b_emp').value.trim(),ubicacion:$('#b_ubi').value.trim(),centro:$('#b_cen').value.trim(),otros:$('#b_otros').value.trim(),otros_a:$('#b_otros_a').value,
        n_bot:$('#b_nb').value,n_rep:$('#b_nr').value,realiza:$('#b_rea').value.trim(),supervisa:$('#b_sup').value.trim(),usar_mi_firma:$('#b_mia').checked});
      D.items=BOT_ITEMS.map((_,i)=>({a:document.querySelector(`.ba[data-i="${i}"]`).value, ok:(x.items[i]||{}).ok}));
      BOT_PREG.forEach(([k])=>{ if(x[k]!==undefined) D[k]=x[k]; }); }
    if(!nuevo) p.id=d.id; else if(tipo!=='botiquin'){ p.trabajadores=[...document.querySelectorAll('.tw:checked')].map(c=>c.value); if(!p.trabajadores.length) throw new Error('Elige al menos un trabajador'); }
    return p;
  };
  const guardar=async(enviar,btn)=>{ let p; try{ p=recoger(); }catch(e){ toast(e.message,true); return; }
    busy(btn,true);
    try{ const r=await rpc('prl_doc_guardar',{p_tok:S.tok,p});
      if(enviar){ const e=await rpc('prl_doc_enviar',{p_tok:S.tok,p_ids:r.ids}); toast(`Guardado y enviado a ${e.avisados}`); } else toast('Guardado');
      nuevo && r.ids.length>1 ? docsVolver() : docVer(r.ids[0]); }
    catch(err){ busy(btn,false); toast(err.message,true); } };
  $('#g1').onclick=e=>guardar(false,e.currentTarget); if($('#g2')) $('#g2').onclick=e=>guardar(true,e.currentTarget);
}

// ---- jefe: detalle
async function pantallaDocDetalle(id){
  pararVoz();
  view(barra('Documento', `<button class="ib" id="bk">‹</button>`, `<button class="ib" id="pdf">PDF</button>`) + `<div class="wrap" id="w"><div class="empty"><span class="spin dk"></span></div></div>`);
  $('#bk').onclick=pantallaDocumentos;
  let d; try{ [d,S.cfg]=await Promise.all([rpc('prl_doc_ver',{p_tok:S.tok,p_id:id}), rpc('prl_config_leer',{p_tok:S.tok})]); }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  S.anio=+d.fecha.slice(0,4);
  $('#pdf').onclick=e=>pdfDocs([d.id], `${DOC_INFO[d.tipo].c} ${d.nombre||d.datos.ubicacion||''} ${d.fecha}.pdf`, e.currentTarget);
  const [t,c]=docEstado(d), x=d.datos||{};
  let h=`<div class="card"><div class="row"><b class="grow" style="font-size:18px">${esc(d.tipo==='botiquin'?(x.ubicacion||'Botiquín'):d.nombre)}</b><span class="chip ${c}">${t}</span></div>
    <div class="small muted" style="margin-top:4px">${esc(DOC_INFO[d.tipo].t)} · ${fmtF(d.fecha)}${d.tipo!=='botiquin'?` · DNI ${d.dni?esc(d.dni):'<span style="color:var(--warn)">sin poner</span>'}`:''}</div></div>`;
  if(d.tipo==='botiquin'){
    const malos=(x.items||[]).map((v,i)=>v&&v.ok===false?BOT_ITEMS[i][0]:null).filter(Boolean);
    h+=`<div class="card small">${malos.length?`<b style="color:var(--bad)">Con NO:</b> ${esc(malos.join(', '))}`:'Todo el material marcado en buen estado.'}<br>Próxima revisión (trimestral): <b>${fmtF(sumaMeses(d.fecha,3))}</b></div>
      <div class="card"><b>Firmas</b>
      <div class="li"><span class="grow">Realiza: ${esc(x.realiza||'')}</span>${d.tiene_firma?`<img class="sg" src="${d.firma}">`:x.usar_mi_firma&&S.cfg.firma_formador?`<img class="sg" src="${S.cfg.firma_formador}">`:`<button class="btn ghost" data-sig="1">Firmar aquí</button>`}</div>
      <div class="li"><span class="grow">Supervisa: ${esc(x.supervisa||'—')}</span>${d.tiene_firma2?`<img class="sg" src="${d.firma2}"><button class="btn ghost" data-qf="2">✕</button>`:`<button class="btn ghost" data-sig="2">Firmar aquí</button>`}</div></div>`;
  } else {
    h+=`<div class="card"><b>Firma del trabajador</b>${d.tiene_firma?`<div class="row" style="margin-top:8px"><img src="${d.firma}" style="max-height:60px;max-width:60%"><span class="grow small muted" style="text-align:right">${fmtFH(d.firmado_en)}<br><a href="#" data-qf="1">Borrar firma</a></span></div>`
      :`<div class="small muted" style="margin:6px 0 10px">${d.enviada_en?'Enviado '+fmtFH(d.enviada_en)+'. Esperando a que firme.':'Todavía no se lo has enviado.'}</div><div class="row"><button class="btn grow" id="env">${d.enviada_en?'Recordar':'Enviar al trabajador'}</button><button class="btn sec grow" data-sig="1">Firmar aquí</button></div>`}</div>
      <button class="btn sec" id="ver" style="width:100%;margin-bottom:10px">Ver lo que lee el trabajador</button>`;
  }
  h+=`<div class="row"><button class="btn sec grow" id="edit">Editar</button><button class="btn bad grow" id="del">Borrar</button></div>
    ${d.tipo!=='botiquin'&&!S.cfg.sello?`<p class="small" style="color:var(--warn)"> Falta el sello/firma de la empresa para el PDF. <a href="#" id="gocfg">Añádelo en Ajustes</a>.</p>`:''}`;
  $('#w').innerHTML=h;
  if($('#env')) $('#env').onclick=async e=>{ const b=e.currentTarget; busy(b,true); try{ const r=await rpc('prl_doc_enviar',{p_tok:S.tok,p_ids:[id]}); toast(r.avisados?'Aviso enviado':'Ya estaba firmado'); pantallaDocDetalle(id); }catch(err){ busy(b,false); toast(err.message,true); } };
  document.querySelectorAll('[data-sig]').forEach(b=>b.onclick=()=>{ const cual=+b.dataset.sig;
    const quien = d.tipo==='botiquin' ? (cual===1?x.realiza:x.supervisa)||'Firma' : d.nombre;
    hojaFirma(quien, esc(DOC_INFO[d.tipo].t)+' del '+fmtF(d.fecha), async png=>{ await rpc('prl_doc_firmar',{p_tok:S.tok,p_id:id,p_firma:png,p_cual:cual}); toast('Firma guardada'); pantallaDocDetalle(id); }); });
  document.querySelectorAll('[data-qf]').forEach(a=>a.onclick=async e=>{ e.preventDefault(); if(!confirm('¿Borrar esta firma?')) return; try{ await rpc('prl_doc_quitar_firma',{p_tok:S.tok,p_id:id,p_cual:+a.dataset.qf}); pantallaDocDetalle(id); }catch(err){ toast(err.message,true); } });
  if($('#ver')) $('#ver').onclick=()=>pantallaDocLeer(id);
  $('#edit').onclick=()=>pantallaDocEditar(d.tipo,d);
  $('#del').onclick=async()=>{ if(!confirm('¿Borrar este documento?')) return; try{ await rpc('prl_doc_borrar',{p_tok:S.tok,p_id:id}); toast('Borrado'); pantallaDocumentos(); }catch(err){ toast(err.message,true); } };
  if($('#gocfg')) $('#gocfg').onclick=e=>{ e.preventDefault(); pantallaAjustes(); };
}

// ---- Ajustes: DNI y puesto
async function pantallaTrabajadoresDNI(){
  view(barra('Trabajadores: DNI y puesto', `<button class="ib" id="bk">‹</button>`) + `<div class="wrap" id="w"><div class="empty"><span class="spin dk"></span></div></div>`);
  $('#bk').onclick=pantallaAjustes;
  let L; try{ L=await rpc('prl_trab_lista',{p_tok:S.tok}); }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  $('#w').innerHTML=`<p class="small muted">Se usan en las entregas de EPI y de información. Solo los ves tú.</p>`+L.map(t=>`<div class="card"><b>${esc(t.nombre)}</b>
    <div class="row"><div class="grow"><label class="f">DNI / NIE</label><input class="inp td" data-id="${esc(t.id)}" value="${esc(t.dni||'')}" autocapitalize="characters"></div>
    <div class="grow"><label class="f">Puesto de trabajo</label><input class="inp tp" data-id="${esc(t.id)}" value="${esc(t.puesto||'')}" placeholder="${esc(t.categoria||'')}"></div></div></div>`).join('')+
    `<button class="btn big" id="gd">Guardar</button>`;
  $('#gd').onclick=async e=>{ const b=e.currentTarget; busy(b,true);
    try{ for(const t of L){ const dni=document.querySelector(`.td[data-id="${t.id}"]`).value.trim(), pu=document.querySelector(`.tp[data-id="${t.id}"]`).value.trim();
        if((dni||'')!==(t.dni||'')||(pu||'')!==(t.puesto||'')) await rpc('prl_trab_guardar',{p_tok:S.tok,p_id:t.id,p_dni:dni,p_puesto:pu}); }
      toast('Guardado'); pantallaAjustes(); }catch(err){ busy(b,false); toast(err.message,true); } };
}
function selloDeFoto(file){ // conserva el color, quita el fondo blanco
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>{ const im=new Image(); im.onload=()=>{
    const k=Math.min(1,500/im.width,260/im.height), c=document.createElement('canvas'); c.width=Math.round(im.width*k); c.height=Math.round(im.height*k);
    const g=c.getContext('2d'); g.drawImage(im,0,0,c.width,c.height); const dd=g.getImageData(0,0,c.width,c.height), p=dd.data;
    for(let i=0;i<p.length;i+=4){ if(p[i+3]>0 && p[i]>215&&p[i+1]>215&&p[i+2]>215) p[i+3]=0; }
    g.putImageData(dd,0,0); res(c.toDataURL('image/png')); }; im.onerror=()=>rej(new Error('No se ha podido leer la imagen')); im.src=r.result; }; r.readAsDataURL(file); });
}

// ---- PDF
async function generarAutoriz(PDFLib, d, cfg){
  const { PDFDocument, StandardFonts, rgb } = PDFLib; const x=d.datos||{};
  const doc=await PDFDocument.create(); const pg=doc.addPage([595.28,841.89]); const H=841.89, L=60, R=535;
  const font=await doc.embedFont(StandardFonts.Helvetica), bold=await doc.embedFont(StandardFonts.HelveticaBold), NAVY=rgb(0.09,0.13,0.35), INK=rgb(0.1,0.1,0.1);
  const wrap=(s,size,f,max)=>{ const out=[]; let cur=''; for(const w of String(s).split(' ')){ const t=cur?cur+' '+w:w; if(f.widthOfTextAtSize(t,size)>max&&cur){ out.push(cur); cur=w; } else cur=t; } if(cur) out.push(cur); return out; };
  let y=70; const par=(s,size=10.5,f=font,c=INK,ind=0)=>{ for(const l of wrap(s,size,f,R-L-ind)){ pg.drawText(l,{x:L+ind,y:H-y,size,font:f,color:c}); y+=size*1.45; } };
  pg.drawRectangle({x:0,y:H-50,width:595.28,height:50,color:NAVY});
  pg.drawText('AUTORIZACIÓN DE USO DE EQUIPOS DE TRABAJO',{x:L,y:H-32,size:15,font:bold,color:rgb(1,1,1)});
  y=85; par('Real Decreto 1215/1997 y Ley 31/1995 de Prevención de Riesgos Laborales',9,font,rgb(0.4,0.4,0.4)); y+=12;
  const fila=(k,v)=>{ pg.drawText(k,{x:L,y:H-y,size:10,font:bold,color:INK}); pg.drawText(String(v||'—'),{x:L+120,y:H-y,size:10.5,font,color:INK}); y+=17; };
  fila('Empresa:',x.empresa||cfg.empresa); fila('Centro:',cfg.centro); fila('Trabajador/a:',d.nombre); fila('DNI / NIE:',d.dni); fila('Puesto:',d.puesto); y+=10;
  par(`La empresa AUTORIZA al trabajador/a arriba indicado a utilizar los siguientes equipos de trabajo${x.hasta?', con validez hasta el '+fmtF(x.hasta):''}:`); y+=4;
  for(const m of (x.maquinas||[])){ pg.drawText('•',{x:L+8,y:H-y,size:11,font:bold,color:NAVY}); par(m,10.5,bold,INK,22); }
  if(x.obs){ y+=4; par('Observaciones / limitaciones: '+x.obs,10); }
  y+=10; par('El trabajador/a declara y se compromete a que:',10.5,bold);
  AUT_TXT.forEach((t,i)=>{ pg.drawText((i+1)+'.',{x:L+4,y:H-y,size:10,font:bold,color:INK}); par(t,10,font,INK,20); y+=2; });
  y+=14; par(`En ${x.lugar||cfg.lugar||'…………'}, a ${fLarga2(d.fecha)}`,10.5);
  const yb=Math.max(y+20,620); const box=(x0,t1,t2)=>{ pg.drawText(t1,{x:x0,y:H-yb,size:9.5,font:bold,color:INK}); if(t2) pg.drawText(t2,{x:x0,y:H-yb-12,size:8.5,font,color:rgb(0.35,0.35,0.35)}); pg.drawRectangle({x:x0,y:H-yb-100,width:210,height:80,borderColor:rgb(0.75,0.75,0.75),borderWidth:0.8}); };
  box(L,'Por la empresa',x.autoriza||''); box(R-210,'El trabajador/a',d.nombre||'');
  const img=async(u,x0,y0,w,h)=>{ if(!u) return; const b=Uint8Array.from(atob(u.split(',')[1]),c=>c.charCodeAt(0)); const im=/^data:image\/png/.test(u)?await doc.embedPng(b):await doc.embedJpg(b); const k=Math.min(w/im.width,h/im.height); pg.drawImage(im,{x:x0+(w-im.width*k)/2,y:H-y0-h+(h-im.height*k)/2,width:im.width*k,height:im.height*k}); };
  await img(cfg.sello||cfg.firma_formador, L+5, yb+22, 200, 74);
  await img(d.firma, R-205, yb+22, 200, 74);
  if(d.firmado_en) pg.drawText('Firmado digitalmente '+fmtFH(d.firmado_en),{x:R-210,y:H-yb-110,size:7,font,color:rgb(0.45,0.45,0.45)});
  return doc;
}
async function rellenarDoc(PDFLib, plantilla, d, cfg, extra){
  if(d.tipo==='autoriz') return generarAutoriz(PDFLib, d, cfg);
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const doc=await PDFDocument.load(plantilla); const font=await doc.embedFont(StandardFonts.Helvetica), bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const pg=doc.getPage(0), H=pg.getHeight(), ink=rgb(0.05,0.1,0.3), x=d.datos||{};
  const fit=(t,size,fnt,maxW)=>{ t=String(t??''); while(t && fnt.widthOfTextAtSize(t,size)>maxW) t=t.slice(0,-1); return t; };
  const txt=(t,X,yb,size=9,fnt=font,maxW=400)=>{ t=fit(t,size,fnt,maxW); if(t) pg.drawText(t,{x:X,y:H-yb,size,font:fnt,color:ink}); };
  const ctr=(t,x0,x1,y0,y1,size=8,fnt=font)=>{ t=fit(t,size,fnt,x1-x0-2); if(!t) return; const w=fnt.widthOfTextAtSize(t,size); pg.drawText(t,{x:(x0+x1)/2-w/2,y:H-((y0+y1)/2+size*0.35),size,font:fnt,color:ink}); };
  const X=(x0,x1,y0,y1)=>{ const cx=(x0+x1)/2, cy=H-(y0+y1)/2, s=Math.min(x1-x0,y1-y0)*0.28; pg.drawLine({start:{x:cx-s,y:cy-s},end:{x:cx+s,y:cy+s},thickness:1.3,color:ink}); pg.drawLine({start:{x:cx-s,y:cy+s},end:{x:cx+s,y:cy-s},thickness:1.3,color:ink}); };
  const ring=(x0,x1,y0,y1)=>{ pg.drawEllipse({x:(x0+x1)/2,y:H-(y0+y1)/2,xScale:(x1-x0)/2-3,yScale:(y1-y0)/2-1.5,borderColor:ink,borderWidth:1.3}); };
  const blanco=(x0,y0,x1,y1)=>pg.drawRectangle({x:x0,y:H-y1,width:x1-x0,height:y1-y0,color:rgb(1,1,1)});
  const cache={}; const img=async(u,x0,y0,x1,y1)=>{ if(!u) return; let im=cache[u]; if(!im){ const b=Uint8Array.from(atob(u.split(',')[1]),c=>c.charCodeAt(0)); im=cache[u]=/^data:image\/png/.test(u)?await doc.embedPng(b):await doc.embedJpg(b); }
    const w=x1-x0,h=y1-y0,k=Math.min(w/im.width,h/im.height); pg.drawImage(im,{x:x0+(w-im.width*k)/2,y:H-y1+(h-im.height*k)/2,width:im.width*k,height:im.height*k}); };
  const mini=(t,X,yb)=>pg.drawText(t,{x:X,y:H-yb,size:5,font,color:rgb(0.45,0.45,0.45)});
  if(d.tipo==='epi'){
    txt(d.nombre,323,99.6,9,bold,280); txt(d.puesto,323,111.6,9,bold,280); txt(d.dni,628,99.6,9,bold,125);
    const its=x.items||{};
    for(const [k,_,lado,y0,y1,cats] of EPI_ITEMS){ const v=its[k]; if(!v) continue; const L=lado==='L'?EPI_L:EPI_R;
      ctr(v.u||'1',L.unit[0],L.unit[1],y0,y1,9,bold);
      if(cats&&(v.cat||[]).length){ const cols = lado==='R'?L.cat3:(cats.length===3?L.cat3:L.cat2); cats.forEach((c,i)=>{ if(v.cat.includes(c)) X(cols[i][0],cols[i][1],y0,y1); }); } }
    (x.otros||[]).slice(0,4).forEach((o,i)=>{ const [y0,y1]=EPI_OTROS_Y[i]; txt(o.t,466,(y0+y1)/2+3,8,font,130); ctr(o.u||'',EPI_R.unit[0],EPI_R.unit[1],y0,y1,9,bold); if(o.c) txt(o.c,634,(y0+y1)/2+3,7,font,118); });
    // Motivos de cada equipo (la plantilla no tiene columna para ello): texto pequeño bajo la declaración
    const mot=[...EPI_ITEMS.filter(i=>its[i[0]]&&motivoTxt(its[i[0]])).map(i=>i[1].replace(/\s*\(.*\)$/,'')+': '+motivoTxt(its[i[0]])),...(x.otros||[]).filter(o=>o&&o.t&&motivoTxt(o)).map(o=>o.t+': '+motivoTxt(o))];
    if(mot.length){ const lin=[]; let cur=''; for(const m of mot){ const tst=cur?cur+'   ·   '+m:m; if(font.widthOfTextAtSize(tst,6)>440&&cur){ lin.push(cur); cur=m; } else cur=tst; } if(cur) lin.push(cur);
      lin.slice(0,2).forEach((l,i)=>txt((i?'':'Motivo: ')+l,86,578+i*6.5,6,font,440)); }
    blanco(518,507,641.5,524); txt('En '+(x.lugar||'')+',',521,514.5,7,font,118); txt('a '+fLarga2(d.fecha),521,521.5,7,font,118);
    await img(d.firma,522,546,638,580); if(d.firmado_en) mini('Firmado digitalmente '+fmtFH(d.firmado_en),522,580.5);
    await img(cfg.sello,646,518,752,579);
  } else if(d.tipo==='epi_col'){
    // varias entregas del mismo trabajador: hasta 4 por hoja (Día / Hora / Firma)
    const lista=extra||[d]; const p0=lista[0];
    txt(p0.nombre,181,99.8,9,bold,440); txt(p0.dni,672,99.8,9,bold,150); txt(p0.puesto,147,114.5,9,bold,300);
    for(let s=0;s<lista.length;s++){ const e=lista[s], ex=e.datos||{}, off=142*s; const its=ex.items||{};
      for(const [k,_,y0,y1] of COL_ITEMS){ const v=its[k]; if(!v) continue;
        if(v.serie) ctr(v.serie,226,264,y0,y1,7);
        ctr(fmtF(e.fecha),264+off,304+off,y0,y1,7.5,bold); ctr(ex.hora||'',304+off,343.5+off,y0,y1,7.5,bold);
        await img(e.firma,345+off,y0+1.5,405+off,y1-1.5); }
      if(ex.otros){ txt(ex.otros,108,465,8,font,115); ctr(fmtF(e.fecha),264+off,304+off,447.5,476,7.5,bold); ctr(ex.hora||'',304+off,343.5+off,447.5,476,7.5,bold); await img(e.firma,345+off,449,405+off,474.5); } }
    await img(cfg.sello,646,512,790,590);
  } else if(d.tipo==='info'){
    txt(x.empresa||cfg.empresa||'',142,140,10,bold,370);
    ctr(d.nombre,86,304.5,515.5,560,10,bold); ctr(d.dni,304.5,418,515.5,560,10,bold);
    await img(d.firma,421,518,529,566); if(d.firmado_en) mini('Firmado digitalmente '+fmtFH(d.firmado_en),421,570);
    await img(cfg.sello,192,635,404,686);
    blanco(84,757,512,776); txt(`En ${x.lugar||'…………'}, a ${fLarga2(d.fecha)}`,86,770,11,font,420);
  } else if(d.tipo==='botiquin'){
    txt(x.empresa,108,116,9,bold,155); txt(x.ubicacion,324,115,9,bold,156); txt(x.centro,108,137.5,9,bold,155); txt(fmtF(d.fecha),108,158,9,bold,155);
    (x.items||[]).forEach((v,i)=>{ if(!v) return; const [_,__,y0,y1]=BOT_ITEMS[i]; if(v.a!==''&&v.a!=null) ctr(v.a,324.2,374,y0,y1,9,bold); if(v.ok===true) ring(374,431,y0,y1); if(v.ok===false) ring(431,483.8,y0,y1); });
    if(x.otros){ txt(x.otros,60,428,8,font,200); if(x.otros_a!==''&&x.otros_a!=null) ctr(x.otros_a,324.2,374,408,444.2,9,bold); }
    BOT_PREG.forEach(([k,_,y0,y1])=>{ if(x[k]===true) ring(374,431,y0,y1); if(x[k]===false) ring(431,483.8,y0,y1); });
    if(x.n_bot!==''&&x.n_bot!=null) txt(x.n_bot,253,585,10,bold,20); if(x.n_rep!==''&&x.n_rep!=null) txt(x.n_rep,468,585,10,bold,20);
    txt(x.realiza,56,631,8.5,bold,205); txt(x.supervisa,271,631,8.5,bold,205);
    await img(d.firma || (x.usar_mi_firma?cfg.firma_formador:null),60,635,256,675); await img(d.firma2,276,635,474,675);
  }
  return doc;
}
async function pdfDocs(ids, nombre, btn){
  busy(btn,true);
  try{
    const [PDFLib, lista, cfg] = await Promise.all([cargarPdfLib(), rpc('prl_doc_varios',{p_tok:S.tok,p_ids:ids}), rpc('prl_config_leer',{p_tok:S.tok})]);
    const plantillas={}; const salida=await PDFLib.PDFDocument.create();
    const getP=async t=>!DOC_INFO[t].pdf?null:plantillas[t]||(plantillas[t]=await fetch(DOC_INFO[t].pdf).then(r=>{ if(!r.ok) throw new Error('No se encuentra la plantilla'); return r.arrayBuffer(); }));
    // EPI colectivo: se agrupan por trabajador (4 entregas por hoja)
    const grupos=[]; const col={};
    for(const d of lista){ if(d.tipo==='epi_col'){ const g=col[d.trabajador]||(col[d.trabajador]=[]); if(!g.length||g[g.length-1].length===4){ const n=[]; g.push(n); grupos.push(n); } g[g.length-1].push(d); } else grupos.push(d); }
    for(const g of grupos){ const d=Array.isArray(g)?g[0]:g; const doc=await rellenarDoc(PDFLib, await getP(d.tipo), d, cfg, Array.isArray(g)?g:null);
      (await salida.copyPages(doc, doc.getPageIndices())).forEach(p=>salida.addPage(p)); }
    const blob=new Blob([await salida.save()],{type:'application/pdf'}); const file=new File([blob],nombre,{type:'application/pdf'});
    if(navigator.canShare && navigator.canShare({files:[file]}) && /Android|iPhone|iPad/i.test(navigator.userAgent)){ try{ await navigator.share({files:[file],title:nombre}); }catch(e){ if(e.name!=='AbortError') throw e; } }
    else { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=nombre; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},4000); }
  }catch(e){ toast(e.message,true); }
  busy(btn,false);
}


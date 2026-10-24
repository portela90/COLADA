// ====== FORMACIÓN PRÁCTICA EN EL PUESTO (F40R304) ======
const F_ITEMS = {
  1:'NORMAS BÁSICAS Y GENERALES', 2:'ÚTILES Y PRODUCTOS', 3:'LIMPIEZA Y CONSERVACIÓN DE MAQUINARIA',
  4:'CONDICIONES DE SEGURIDAD Y ERGONOMÍA', 5:'MEDIO AMBIENTE', 6:'OTROS'
};
// Texto del reverso del F40R304 (lo que el trabajador lee antes de firmar)
const F_REVERSO = {
  1:{intro:'Para ISS es muy importante que los trabajadores cuiden la imagen profesional, procurando ser discretos, educados y apliquen normas básicas de limpieza.',
     g:[['Imagen profesional - uniformidad',['Correcto empleo del uniforme establecido por ISS: limpio y planchado.','Pelo recogido y ausencia de elementos que interfieran en las tareas (pulseras, piercings…).','Trato correcto y respetuoso hacia el cliente.']],
        ['Normas generales de limpieza',['Limpiaremos de arriba abajo, de dentro hacia fuera y de más limpio a sucio.','Observa la zona a tratar, piensa la forma más efectiva de realizar la tarea y actúa para que la limpieza sea satisfactoria.','Orden y limpieza en mi puesto de trabajo.']]]},
  2:{intro:'Identificar y explicar los diferentes útiles y productos en cada centro, definiendo el uso correcto, utilidad de cada uno de ellos y dosificación correcta de uso.',
     g:[['Equipos, útiles y productos',['Identificación y utilización segura de los equipos y útiles para llevar a cabo la limpieza en el centro (carros, código de colores de bayetas, maquinaria a emplear, etc.).','Identificación y utilización segura de los productos químicos para llevar a cabo la limpieza en el centro.','Principales características y condiciones de uso seguro de equipos, útiles y productos químicos.','Dosificación establecida (indicar responsables si procede).','Solicitar etiquetas homologadas.','Correcta utilización y conservación de los útiles.','Comunicación inmediata de cualquier incidencia o anomalía en el uso de equipos, útiles y productos al responsable.']],
        ['Almacenaje',['Las fichas técnicas y de seguridad de los productos deben estar a disposición de la plantilla.','No utilizar botellas de agua para contener productos de limpieza.','Revisión del área destinada al depósito de productos: mostrar ubicación, envases empleados y trasladar las funciones del etiquetaje de seguridad en cada caso.','Revisar normas básicas de almacenaje e incompatibilidad de almacenamiento.','Identificar y clasificar correctamente los productos en el almacén.']]]},
  3:{intro:'Identificar y explicar los diferentes tipos de máquinas y el correcto mantenimiento preventivo de las mismas.',
     g:[['Tareas preventivas diarias',['Verificación de puntos críticos (carcasas colocadas, cableado bien conservado, funciones de paro y accionamiento correctas).','Limpieza de la carcasa.','Vaciado y limpieza de bandejas, tanque de agua y bayeta de secado.','Mantener en buen estado general y de limpieza el equipo.']],
        ['Tareas preventivas semanales',['Limpieza de filtros.','Rellenar niveles.','Limpiar ruedas.','Como norma general se limpiarán las máquinas paradas y bloqueadas. Si fuera imprescindible la limpieza de algún equipo en movimiento, mi responsable me lo tendrá que comunicar previamente y durante la realización de los trabajos mantendré una distancia de seguridad de al menos 1 m, con el fin de evitar accidentes por atrapamiento, haciendo uso de alargadores tipo lanza u otros elementos complementarios que garanticen en todo momento la seguridad.']]]},
  4:{intro:'La seguridad en el trabajo se puede definir como el conjunto de técnicas, actuaciones y procedimientos que tienen por objeto detectar o disminuir el riesgo de accidente o minimizar sus consecuencias.',
     g:[['Normas básicas',['Normas de seguridad en las instalaciones del cliente.','Actuación ante una emergencia y/o accidente laboral.','Identificación de recorridos de evacuación, salidas de emergencia, ubicación de extintores y punto de emergencia o de reunión.','Escaleras portátiles: identificación de las escaleras disponibles, su emplazamiento y tareas donde pueden usarse. Colocación y uso seguro. Revisión visual antes de su utilización. Verificación de puntos críticos: zapatas antideslizantes, estado de peldaños, limitador de apertura.','Electricidad: identificación de los elementos eléctricos en la instalación (enchufes, cuadros eléctricos, etc.) y elementos de seguridad para evitar el contacto eléctrico. Precauciones a adoptar durante las tareas de limpieza.','Posturas forzadas y manejo de cargas: identificación de las actividades diarias que pueden conllevar la manipulación de objetos voluminosos o pesados. Medidas preventivas para evitar sobreesfuerzos (mantener la espalda recta, utilizar ayudas mecánicas, evitar giros del tronco, mantener la carga cerca del centro de gravedad, etc.).','Equipos de protección individual (EPI): identificación de los equipos de protección individual que debe emplear. Utilización y mantenimiento de los equipos de protección proporcionados.']]]},
  5:{intro:'Explicar las acciones necesarias para preservar el medio ambiente, utilizando buenas prácticas de gestión.',
     g:[['Respetemos el medioambiente',['Gestionar los residuos según indicaciones del cliente.','No dejar correr el agua en grifos y cisternas más tiempo del necesario. Notificaremos averías de inmediato.','Debemos seguir las indicaciones de las fichas técnicas para dosificar correctamente los productos químicos.','Aprovechar la luz natural, cuando sea posible, para la realización de tareas de limpieza.','Seguir las instrucciones de actuación en caso de vertido o derrame accidental (por ejemplo, cómo recoger y gestionar un producto químico derramado).','Realizar el apagado y encendido de las luces según instrucciones del cliente.']]]}
};
const PLANTILLA_F40 = 'plantillas/F40R304.pdf';

function fEstado(f){
  if(f.tiene_firma) return f.eval_eficaz===true?['Firmada · eficaz','ok']:f.eval_eficaz===false?['Firmada · no eficaz','bad']:['Firmada','ok'];
  if(f.enviada_en) return ['Pendiente de firma','blue'];
  return ['Sin enviar','warn'];
}
function htmlFormacion(f, conDatos=true){
  const items=(f.items||[]);
  let h='';
  if(conDatos) h+=`<div class="card"><div class="small muted">REGISTRO DE FORMACIÓN PRÁCTICA EN EL PUESTO DE TRABAJO</div>
    <div class="li"><span class="grow small muted">Trabajador</span><b>${esc(f.nombre)}</b></div>
    <div class="li"><span class="grow small muted">Fecha</span><b>${fmtF(f.fecha)}</b></div>
    ${f.duracion?`<div class="li"><span class="grow small muted">Duración</span><b>${esc(f.duracion)}</b></div>`:''}
    ${f.direccion?`<div class="li"><span class="grow small muted">Dirección de servicio</span><b>${esc(f.direccion)}</b></div>`:''}
    ${f.impartida?`<div class="li"><span class="grow small muted">Impartida por</span><b>${esc(f.impartida)}</b></div>`:''}
    <p class="small" style="margin:10px 0 0">Se muestran las instalaciones y equipos, se describen in situ las tareas a realizar y cómo realizarlas de forma segura (pautas preventivas básicas).</p></div>`;
  for(const n of items){
    if(n===6){ h+=`<div class="card read"><div class="tema">6. Otros</div><p>${esc(f.otros6||'')}</p></div>`; continue; }
    const r=F_REVERSO[n]; if(!r) continue;
    h+=`<div class="card read"><div class="tema">${n}. ${esc(F_ITEMS[n].charAt(0)+F_ITEMS[n].slice(1).toLowerCase())}</div><p>${esc(r.intro)}</p>`+
      r.g.map(([t,l])=>`<b style="display:block;margin:8px 0 4px;color:var(--navy)">${esc(t)}</b><ul>${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`).join('')+
      (n===1&&f.otros1?`<p><b>Otros:</b> ${esc(f.otros1)}</p>`:'')+`</div>`;
  }
  return h;
}
function textoFormacion(f){
  const p=['Formación práctica en el puesto de trabajo.','Se muestran las instalaciones y equipos, se describen las tareas a realizar y cómo realizarlas de forma segura.'];
  for(const n of (f.items||[])){
    if(n===6){ if(f.otros6) p.push('Otros. '+f.otros6); continue; }
    const r=F_REVERSO[n]; if(!r) continue;
    p.push(F_ITEMS[n]+'. '+r.intro); r.g.forEach(([t,l])=>{ p.push(t+'. '+l.join(' ')); });
  }
  return p.join(' ');
}

// ---- Operario: leer y firmar
async function pantallaFormLeer(id){
  view(barra('Formación en el puesto', `<button class="ib" id="bk">‹</button>`, `<button class="ib" id="voz">Escuchar</button>`) + `<div class="wrap" id="w"><div class="empty"><span class="spin dk"></span></div></div>`);
  $('#bk').onclick=()=>{ pararVoz(); S.yo.rol==='admin'?pantallaFormaciones():pantallaOperario(); };
  let f; try{ f=await rpc('prl_form_ver',{p_tok:S.tok,p_id:id}); }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  $('#voz').onclick=e=>hablar(e.currentTarget, textoFormacion(f));
  let h=htmlFormacion(f);
  if(!f.tiene_firma && S.yo.rol==='admin'){ h+=`<div class="card small muted">Así lo ve el trabajador. Para recoger su firma en tu móvil usa “Firmar aquí” en la ficha.</div>`; $('#w').innerHTML=h; return; }
  if(f.tiene_firma){
    h+=`<div class="card done"><div class="big">✓</div><h3 style="margin:10px 0 4px">Firmada</h3><div class="muted small">${fmtFH(f.firmado_en)}</div>${f.firma?`<img src="${f.firma}" style="max-height:70px;margin-top:10px">`:''}</div>`;
    $('#w').innerHTML=h; return;
  }
  h+=`<div class="card"><b>Tu firma</b>
    <label class="check"><input type="checkbox" id="leido"><span>Me han enseñado las instalaciones, los equipos y las tareas, y cómo hacerlas de forma segura. Lo he entendido.</span></label>
    <div class="sigbox" id="sb"><canvas></canvas><div class="sigline"></div><div class="ph">Firma aquí con el dedo</div></div>
    <div class="row" style="margin-top:8px"><span class="small muted grow">${esc(f.nombre)}</span><button class="btn ghost" id="borra">Borrar</button></div>
  </div><div style="height:70px"></div>
  <div class="sticky-act"><div><button class="btn big ok" id="firmar" disabled>Firmar</button></div></div>`;
  $('#w').innerHTML=h;
  const pad=sigPad($('#sb'));
  const upd=()=>{ $('#firmar').disabled = !($('#leido').checked && !pad.vacio()); };
  pad.onchange=upd; $('#leido').onchange=upd; $('#borra').onclick=()=>{pad.limpiar(); upd();};
  $('#firmar').onclick=async e=>{ const b=e.currentTarget; busy(b,true);
    try{ await rpc('prl_form_firmar',{p_tok:S.tok,p_id:id,p_firma:pad.png()}); pararVoz(); toast('¡Firmado! Gracias.'); pantallaFormLeer(id); }
    catch(err){ busy(b,false); toast(err.message,true); } };
}

// ---- Jefe: lista del año
async function pantallaFormaciones(){
  pararVoz(); S.seccion='form';
  view(barra('Toolbox HSE', `<button class="ib" id="out">‹ Limpieza</button>`, `<button class="ib" id="cfg" title="Ajustes">Ajustes</button>`) +
    `<div class="wrap">${tabsSeccion()}<div class="row" style="margin-bottom:12px"><button class="btn sec" id="prev">‹</button><b class="grow" style="text-align:center;font-size:20px;color:var(--navy)">${S.anio}</b><button class="btn sec" id="next">›</button></div>
    <button class="btn big" id="nueva" style="margin-bottom:12px">＋ Nueva formación</button><div id="w" class="empty"><span class="spin dk"></span></div></div>`);
  $('#out').onclick=volverLimpieza; $('#cfg').onclick=pantallaAjustes; enlazarSeccion();
  $('#prev').onclick=()=>{S.anio--; pantallaFormaciones();}; $('#next').onclick=()=>{S.anio++; pantallaFormaciones();};
  $('#nueva').onclick=()=>pantallaFormEditar();
  let L; try{ L=await rpc('prl_form_lista',{p_tok:S.tok,p_anio:S.anio}); }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  S.formLista=L;
  if(!L.length){ $('#w').outerHTML=`<div id="w" class="card empty">Todavía no hay formaciones en ${S.anio}.<br>Pulsa “Nueva formación” para registrar la primera.</div>`; return; }
  const porMes={}; L.forEach(f=>{ const m=+f.fecha.slice(5,7); (porMes[m]=porMes[m]||[]).push(f); });
  const pend=L.filter(f=>!f.tiene_firma), sinEval=L.filter(f=>f.tiene_firma&&f.eval_eficaz==null);
  let h=`<div class="card row"><div class="grow"><b>${L.length}</b> <span class="muted">formaciones</span></div>${pend.length?`<span class="chip blue">${pend.length} sin firmar</span>`:''}${sinEval.length?`<span class="chip warn">${sinEval.length} sin evaluar</span>`:''}</div>`;
  if(pend.some(f=>f.enviada_en)) h+=`<button class="btn sec" id="recAll" style="width:100%;margin-bottom:12px">Recordar a todos los que faltan por firmar</button>`;
  for(const m of Object.keys(porMes).map(Number).sort((a,b)=>b-a)){
    const fs=porMes[m], firmadas=fs.filter(f=>f.tiene_firma);
    h+=`<div class="row" style="margin:18px 2px 8px"><div class="h2 grow" style="margin:0">${MESES[m-1]}</div>${firmadas.length?`<button class="btn ghost" data-pdfmes="${m}">PDF del mes (${firmadas.length})</button>`:''}</div><div class="card">`+
      fs.map(f=>{ const [t,c]=fEstado(f); return `<div class="li" data-id="${esc(f.id)}" style="cursor:pointer"><span class="dot ${f.tiene_firma?'ok':''}"></span><span class="grow"><span class="nm">${esc(f.nombre)}</span><br><span class="small muted">${fmtF(f.fecha)} · ${(f.items||[]).map(n=>n).join(', ')||'—'}</span></span><span class="chip ${c}">${t}</span></div>`; }).join('')+`</div>`;
  }
  $('#w').outerHTML=`<div id="w">${h}</div>`;
  document.querySelectorAll('[data-id]').forEach(el=>el.onclick=()=>pantallaFormDetalle(el.dataset.id));
  document.querySelectorAll('[data-pdfmes]').forEach(b=>b.onclick=e=>{ const m=+b.dataset.pdfmes; pdfFormaciones(porMes[m].filter(f=>f.tiene_firma).map(f=>f.id), `F40R304 Formacion en el puesto ${MESES[m-1]} ${S.anio}.pdf`, e.currentTarget); });
  if($('#recAll')) $('#recAll').onclick=async e=>{ const b=e.currentTarget; busy(b,true);
    try{ const r=await rpc('prl_form_enviar',{p_tok:S.tok,p_ids:pend.map(f=>f.id)}); toast(`Aviso enviado a ${r.avisados}`); }catch(err){ toast(err.message,true); } busy(b,false); };
}

// ---- Jefe: nueva / editar
async function pantallaFormEditar(f){
  pararVoz();
  const nueva=!f; f=f||{};
  view(barra(nueva?'Nueva formación':'Editar formación', `<button class="ib" id="bk">‹</button>`) + `<div class="wrap" id="w"><div class="empty"><span class="spin dk"></span></div></div>`);
  $('#bk').onclick=()=> nueva? pantallaFormaciones() : pantallaFormDetalle(f.id);
  try{ if(!S.trab.length) S.trab=await rpc('prl_trabajadores',{p_tok:S.tok}); S.cfg=await rpc('prl_config_leer',{p_tok:S.tok}); }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  const its=new Set(f.items||[1,2,3,4,5]);
  const ops=S.trab.filter(t=>t.rol==='operario');
  $('#w').innerHTML=`
   ${nueva?`<div class="card"><b>Trabajadores</b><div class="small muted">Puedes elegir varios: se crea un registro para cada uno.</div>
     <div class="row" style="margin:8px 0"><button class="btn ghost" id="todos">Todos</button><button class="btn ghost" id="ninguno">Ninguno</button></div>
     ${ops.map(t=>`<label class="li" style="cursor:pointer"><input type="checkbox" class="tw" value="${esc(t.id)}" style="width:22px;height:22px"><span class="grow nm">${esc(t.nombre)}</span><span class="small muted">${esc(t.categoria||'')}</span></label>`).join('')}</div>`
   :`<div class="card"><b>${esc(f.nombre)}</b></div>`}
   <div class="card">
    <label class="f">Dirección de servicio</label><input class="inp" id="f_dir" value="${esc(f.direccion??(S.cfg.direccion||S.cfg.centro||''))}">
    <div class="row"><div class="grow"><label class="f">Fecha de la formación</label><input class="inp" type="date" id="f_fec" value="${esc(f.fecha||hoyISO())}"></div>
      <div style="width:130px"><label class="f">Duración</label><input class="inp" id="f_dur" placeholder="ej. 2 h" value="${esc(f.duracion||'')}"></div></div>
    <label class="f">Formación impartida por</label><input class="inp" id="f_imp" value="${esc(f.impartida??(S.cfg.formador||S.yo.nombre))}">
   </div>
   <div class="card"><b>Formación en</b>
    ${[1,2,3,4,5,6].map(n=>`<label class="li" style="cursor:pointer;align-items:flex-start"><input type="checkbox" class="it" value="${n}" ${its.has(n)?'checked':''} style="width:22px;height:22px;margin-top:2px"><span class="grow"><span class="nm">${n}. ${F_ITEMS[n]}</span>${n===1?'<br><span class="small muted">Imagen profesional, normas básicas y generales, limpieza de superficies, baños, suelos y cristales</span>':''}</span></label>
      ${n===1?`<input class="inp" id="f_o1" placeholder="Otros (punto 1, opcional)" value="${esc(f.otros1||'')}" style="margin:0 0 6px">`:''}
      ${n===6?`<input class="inp" id="f_o6" placeholder="¿Qué otra formación?" value="${esc(f.otros6||'')}" style="margin:0 0 6px">`:''}`).join('')}
   </div>
   <div class="row">${nueva?`<button class="btn sec grow" id="g1">Guardar</button><button class="btn grow" id="g2">Guardar y enviar</button>`:`<button class="btn grow" id="g1">Guardar cambios</button>`}</div>`;
  if(nueva){ $('#todos').onclick=()=>document.querySelectorAll('.tw').forEach(c=>c.checked=true); $('#ninguno').onclick=()=>document.querySelectorAll('.tw').forEach(c=>c.checked=false); }
  const guardar=async(enviar,btn)=>{
    const p={fecha:$('#f_fec').value, duracion:$('#f_dur').value, direccion:$('#f_dir').value, impartida:$('#f_imp').value,
      items:[...document.querySelectorAll('.it:checked')].map(c=>c.value), otros1:$('#f_o1').value, otros6:$('#f_o6').value};
    if(!nueva) p.id=f.id; else p.trabajadores=[...document.querySelectorAll('.tw:checked')].map(c=>c.value);
    if(nueva && !p.trabajadores.length){ toast('Elige al menos un trabajador',true); return; }
    if(!p.items.length){ toast('Marca al menos un punto de “Formación en”',true); return; }
    busy(btn,true);
    try{
      const r=await rpc('prl_form_guardar',{p_tok:S.tok,p});
      if(enviar){ const e=await rpc('prl_form_enviar',{p_tok:S.tok,p_ids:r.ids}); toast(`Guardado y enviado a ${e.avisados}`); } else toast('Guardado');
      nueva && r.ids.length>1 ? pantallaFormaciones() : pantallaFormDetalle(r.ids[0]);
    }catch(err){ busy(btn,false); toast(err.message,true); }
  };
  $('#g1').onclick=e=>guardar(false,e.currentTarget);
  if($('#g2')) $('#g2').onclick=e=>guardar(true,e.currentTarget);
}

// ---- Jefe: detalle
async function pantallaFormDetalle(id){
  pararVoz();
  view(barra('Formación en el puesto', `<button class="ib" id="bk">‹</button>`, `<button class="ib" id="pdf">PDF</button>`) + `<div class="wrap" id="w"><div class="empty"><span class="spin dk"></span></div></div>`);
  $('#bk').onclick=pantallaFormaciones;
  let f; try{ [f,S.cfg]=await Promise.all([rpc('prl_form_ver',{p_tok:S.tok,p_id:id}), rpc('prl_config_leer',{p_tok:S.tok})]); }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  if(!S.anio || +f.fecha.slice(0,4)!==S.anio) S.anio=+f.fecha.slice(0,4);
  $('#pdf').onclick=e=>pdfFormaciones([f.id], `F40R304 ${f.nombre} ${f.fecha}.pdf`, e.currentTarget);
  const [t,c]=fEstado(f);
  let h=`<div class="card"><div class="row"><b class="grow" style="font-size:18px">${esc(f.nombre)}</b><span class="chip ${c}">${t}</span></div>
    <div class="small muted" style="margin-top:4px">${fmtF(f.fecha)}${f.duracion?' · '+esc(f.duracion):''}${f.impartida?' · '+esc(f.impartida):''}</div>
    <div class="small" style="margin-top:8px">${(f.items||[]).map(n=>`${n}. ${F_ITEMS[n]}`).join('<br>')}${f.otros6?`<br><span class="muted">Otros: ${esc(f.otros6)}</span>`:''}</div></div>
  <div class="card"><b>Firma del trabajador</b>
    ${f.tiene_firma?`<div class="row" style="margin-top:8px"><img src="${f.firma}" style="max-height:60px;max-width:60%"><span class="grow small muted" style="text-align:right">${fmtFH(f.firmado_en)}<br><a href="#" id="qf">Borrar firma</a></span></div>`
      :`<div class="small muted" style="margin:6px 0 10px">${f.enviada_en?'Enviada '+fmtFH(f.enviada_en)+'. Esperando a que firme.':'Todavía no se la has enviado.'}</div>
        <div class="row"><button class="btn grow" id="env">${f.enviada_en?'Recordar':'Enviar al trabajador'}</button><button class="btn sec grow" id="aqui">Firmar aquí</button></div>`}
  </div>
  <div class="card"><b>Evaluación de la eficacia</b><div class="small muted">Una vez consolidado el servicio en el puesto, evalúa si la formación ha sido eficaz.</div>
    <div class="row"><div class="grow"><label class="f">Fecha de evaluación</label><input class="inp" type="date" id="e_fec" value="${esc(f.eval_fecha||'')}"></div></div>
    <div class="row" style="margin-top:10px"><button class="btn ${f.eval_eficaz===true?'ok':'sec'} grow" data-ef="true">Sí, eficaz</button><button class="btn ${f.eval_eficaz===false?'':'sec'} grow" data-ef="false" style="${f.eval_eficaz===false?'background:var(--bad);color:#fff':''}">No eficaz</button></div>
    <div id="nf" ${f.eval_eficaz===false?'':'hidden'}><label class="f">Fecha nueva formación</label><input class="inp" type="date" id="e_nf" value="${esc(f.nueva_fecha||'')}"></div>
    <button class="btn" id="e_save" style="margin-top:12px;width:100%">Guardar evaluación</button>
  </div>
  <div class="row"><button class="btn sec grow" id="ver">Ver lo que lee el trabajador</button></div>
  <div class="row" style="margin-top:10px"><button class="btn sec grow" id="edit">Editar</button><button class="btn bad grow" id="del">Borrar</button></div>
  ${!S.cfg.firma_resp?`<p class="small" style="color:var(--warn)"> Falta la firma del responsable de centro para el PDF. <a href="#" id="gocfg">Añádela en Ajustes</a>.</p>`:''}
  ${!S.cfg.firma_formador?`<p class="small" style="color:var(--warn)"> Falta tu firma de formador. <a href="#" id="gocfg2">Añádela en Ajustes</a>.</p>`:''}`;
  $('#w').innerHTML=h;
  let ef=f.eval_eficaz;
  document.querySelectorAll('[data-ef]').forEach(b=>b.onclick=()=>{ ef = b.dataset.ef==='true'; document.querySelectorAll('[data-ef]').forEach(x=>{ const on=(x.dataset.ef==='true')===ef; x.className='btn grow '+(on?(ef?'ok':''):'sec'); x.style.cssText=on&&!ef?'background:var(--bad);color:#fff':''; }); $('#nf').hidden=ef!==false; if(!$('#e_fec').value) $('#e_fec').value=hoyISO(); });
  $('#e_save').onclick=async e=>{ const b=e.currentTarget; busy(b,true);
    try{ await rpc('prl_form_evaluar',{p_tok:S.tok,p_id:id,p:{eval_fecha:$('#e_fec').value,eval_eficaz:ef==null?'':String(ef),nueva_fecha:ef===false?$('#e_nf').value:''}}); toast('Evaluación guardada'); pantallaFormDetalle(id); }
    catch(err){ busy(b,false); toast(err.message,true); } };
  if($('#env')) $('#env').onclick=async e=>{ const b=e.currentTarget; busy(b,true);
    try{ const r=await rpc('prl_form_enviar',{p_tok:S.tok,p_ids:[id]}); toast(r.avisados?'Aviso enviado':'Ya estaba firmada'); pantallaFormDetalle(id); }catch(err){ busy(b,false); toast(err.message,true); } };
  if($('#aqui')) $('#aqui').onclick=()=>hojaFirma(f.nombre, 'Formación práctica en el puesto del '+fmtF(f.fecha)+'.<br>Al firmar confirma que ha recibido esta formación.', async png=>{
    await rpc('prl_form_firmar',{p_tok:S.tok,p_id:id,p_firma:png}); toast('Firma guardada'); pantallaFormDetalle(id); });
  if($('#qf')) $('#qf').onclick=async e=>{ e.preventDefault(); if(!confirm('¿Borrar la firma? Tendrá que volver a firmar.')) return; try{ await rpc('prl_form_quitar_firma',{p_tok:S.tok,p_id:id}); pantallaFormDetalle(id); }catch(err){ toast(err.message,true); } };
  $('#ver').onclick=()=>pantallaFormLeer(id);
  $('#edit').onclick=()=>pantallaFormEditar(f);
  $('#del').onclick=async()=>{ if(!confirm('¿Borrar esta formación?')) return; try{ await rpc('prl_form_borrar',{p_tok:S.tok,p_id:id}); toast('Borrada'); pantallaFormaciones(); }catch(err){ toast(err.message,true); } };
  ['gocfg','gocfg2'].forEach(k=>{ if($('#'+k)) $('#'+k).onclick=e=>{ e.preventDefault(); pantallaAjustes(); }; });
}

// ---- Firma desde una foto (fondo blanco -> transparente)
function firmaDeFoto(file){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>{ const im=new Image(); im.onload=()=>{
    const k=Math.min(1,500/im.width,240/im.height), c=document.createElement('canvas'); c.width=Math.round(im.width*k); c.height=Math.round(im.height*k);
    const x=c.getContext('2d'); x.drawImage(im,0,0,c.width,c.height); const d=x.getImageData(0,0,c.width,c.height), p=d.data;
    for(let i=0;i<p.length;i+=4){ const l=(p[i]*0.3+p[i+1]*0.59+p[i+2]*0.11); if(l>170){ p[i+3]=0; } else { p[i]=p[i+1]=Math.round(l*0.3); p[i+2]=Math.round(l*0.5); p[i+3]=255; } }
    x.putImageData(d,0,0); res(c.toDataURL('image/png')); }; im.onerror=()=>rej(new Error('No se ha podido leer la imagen')); im.src=r.result; }; r.readAsDataURL(file); });
}

// ---- PDF: rellena la plantilla oficial F40R304
let _pdfLib=null;
function cargarPdfLib(){
  if(window.PDFLib) return Promise.resolve(window.PDFLib);
  if(_pdfLib) return _pdfLib;
  _pdfLib=new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'; s.onload=()=>res(window.PDFLib); s.onerror=()=>{ _pdfLib=null; rej(new Error('No se ha podido cargar el generador de PDF. Revisa la conexión.')); }; document.head.appendChild(s); });
  return _pdfLib;
}
async function rellenarF40(PDFLib, plantillaBytes, f, cfg){
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const doc=await PDFDocument.load(plantillaBytes);
  const font=await doc.embedFont(StandardFonts.Helvetica), bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const pg=doc.getPage(0), H=pg.getHeight(), ink=rgb(0.05,0.1,0.3);
  const txt=(t,x,yTop,size=10,fnt=font,maxW=330)=>{ t=String(t||''); while(t && fnt.widthOfTextAtSize(t,size)>maxW) t=t.slice(0,-1); if(t) pg.drawText(t,{x,y:H-yTop,size,font:fnt,color:ink}); };
  const X=(x0,x1,yTop,yBot)=>{ const cx=(x0+x1)/2, cy=H-(yTop+yBot)/2, s=Math.min(x1-x0,yBot-yTop)*0.32; pg.drawLine({start:{x:cx-s,y:cy-s},end:{x:cx+s,y:cy+s},thickness:1.4,color:ink}); pg.drawLine({start:{x:cx-s,y:cy+s},end:{x:cx+s,y:cy-s},thickness:1.4,color:ink}); };
  const img=async(dataUrl,x0,yTop,x1,yBot)=>{ if(!dataUrl) return; const bytes=Uint8Array.from(atob(dataUrl.split(',')[1]),c=>c.charCodeAt(0));
    const im=/^data:image\/png/.test(dataUrl)?await doc.embedPng(bytes):await doc.embedJpg(bytes); const w=x1-x0, h=yBot-yTop, k=Math.min(w/im.width,h/im.height);
    pg.drawImage(im,{x:x0+(w-im.width*k)/2,y:H-yBot+(h-im.height*k)/2,width:im.width*k,height:im.height*k}); };
  // Cabecera
  txt(f.direccion,200,173.3,10.5,bold); txt(f.nombre,200,201,10.5,bold); txt(fmtF(f.fecha),200,228.2,10.5,bold);
  txt(f.duracion,200,257.7,10.5,bold); txt(f.impartida,200,286.6,10.5,bold);
  // Casillas "Formación en"
  const filas={1:[355,365],2:[406,420.5],3:[428.5,442.5],4:[460.5,475],5:[483,497.5],6:[507.5,520.5]};
  for(const n of (f.items||[])) if(filas[n]) X(511,538.5,filas[n][0],filas[n][1]);
  if(f.otros1) txt(f.otros1,212,390,8,font,290);
  if(f.otros6){ const w=f.otros6; txt(w,215,516.5,9,font,285); }
  // Firmas
  await img(cfg.firma_resp, 49,596, 161,643);
  await img(cfg.firma_formador, 221,596, 363,643);
  await img(f.firma, 404,596, 536,643);
  if(f.firmado_en){ pg.drawText('Firmado digitalmente '+fmtFH(f.firmado_en),{x:404,y:H-652,size:5.5,font,color:rgb(0.45,0.45,0.45)}); }
  // Evaluación de la eficacia
  if(f.eval_fecha) txt(fmtF(f.eval_fecha),120,739.5,9,bold);
  if(f.eval_eficaz===true) X(279,296.5,745.5,758.5);
  if(f.eval_eficaz===false){ X(335,349,745.5,758.5); if(f.nueva_fecha) txt(fmtF(f.nueva_fecha),484,755.5,8.5,bold); }
  return doc;
}
async function pdfFormaciones(ids, nombre, btn){
  busy(btn,true);
  try{
    const [PDFLib, plantilla, lista, cfg] = await Promise.all([
      cargarPdfLib(),
      fetch(PLANTILLA_F40).then(r=>{ if(!r.ok) throw new Error('No se encuentra la plantilla del F40R304'); return r.arrayBuffer(); }),
      rpc('prl_form_firmas',{p_tok:S.tok,p_ids:ids}),
      rpc('prl_config_leer',{p_tok:S.tok})
    ]);
    const salida = await PDFLib.PDFDocument.create();
    for(const f of lista){
      const d = await rellenarF40(PDFLib, plantilla, f, cfg);
      const pags = await salida.copyPages(d, d.getPageIndices());
      pags.forEach(p=>salida.addPage(p));
    }
    const bytes = await salida.save();
    const blob = new Blob([bytes],{type:'application/pdf'});
    const file = new File([blob], nombre, {type:'application/pdf'});
    if(navigator.canShare && navigator.canShare({files:[file]}) && /Android|iPhone|iPad/i.test(navigator.userAgent)){
      try{ await navigator.share({files:[file], title:nombre}); } catch(e){ if(e.name!=='AbortError') throw e; }
    } else {
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=nombre; document.body.appendChild(a); a.click();
      setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();}, 4000);
    }
  }catch(e){ toast(e.message,true); }
  busy(btn,false);
}


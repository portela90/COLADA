// ====== Firma (canvas) ======
function sigPad(box){
  const cv=box.querySelector('canvas'), ph=box.querySelector('.ph');
  const ctx=cv.getContext('2d'); let drawing=false, last=null, n=0;
  const api={ onchange:null };
  function size(){
    const r=cv.getBoundingClientRect(), dpr=Math.max(1,window.devicePixelRatio||1);
    const old = n? cv.toDataURL(): null;
    cv.width=Math.round(r.width*dpr); cv.height=Math.round(r.height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#0d1b4a'; ctx.lineWidth=2.4;
    if(old){ const im=new Image(); im.onload=()=>ctx.drawImage(im,0,0,r.width,r.height); im.src=old; }
  }
  size(); window.addEventListener('resize', size);
  const pos=e=>{ const r=cv.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top}; };
  cv.addEventListener('pointerdown',e=>{ e.preventDefault(); cv.setPointerCapture(e.pointerId); drawing=true; last=pos(e); ctx.beginPath(); ctx.arc(last.x,last.y,1.1,0,7); ctx.fillStyle='#0d1b4a'; ctx.fill(); n++; ph.style.display='none'; });
  cv.addEventListener('pointermove',e=>{ if(!drawing) return; e.preventDefault(); const p=pos(e); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last=p; n++; });
  const fin=()=>{ if(drawing){ drawing=false; api.onchange&&api.onchange(); } };
  cv.addEventListener('pointerup',fin); cv.addEventListener('pointercancel',fin); cv.addEventListener('pointerleave',fin);
  api.vacio=()=>n<6;
  api.limpiar=()=>{ ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height); ctx.restore(); n=0; ph.style.display=''; };
  api.png=()=>{ // recorta y reduce
    const w=cv.width,h=cv.height,data=ctx.getImageData(0,0,w,h).data;
    let x0=w,y0=h,x1=0,y1=0;
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ if(data[(y*w+x)*4+3]>10){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
    if(x1<=x0||y1<=y0){ x0=0;y0=0;x1=w;y1=h; }
    const pad=10; x0=Math.max(0,x0-pad); y0=Math.max(0,y0-pad); x1=Math.min(w,x1+pad); y1=Math.min(h,y1+pad);
    const cw=x1-x0, ch=y1-y0, k=Math.min(1, 160/ch, 520/cw);
    const o=document.createElement('canvas'); o.width=Math.max(1,Math.round(cw*k)); o.height=Math.max(1,Math.round(ch*k));
    o.getContext('2d').drawImage(cv,x0,y0,cw,ch,0,0,o.width,o.height);
    return o.toDataURL('image/png');
  };
  return api;
}
function hojaFirma(titulo, sub, onOk){
  const el=document.createElement('div'); el.className='sheet';
  el.innerHTML=`<div><div class="row"><b class="grow" style="font-size:18px">${esc(titulo)}</b><button class="btn ghost" data-x>Cerrar</button></div>
    ${sub?`<div class="muted small" style="margin-bottom:10px">${sub}</div>`:''}
    <div class="sigbox"><canvas></canvas><div class="sigline"></div><div class="ph">Firma aquí con el dedo</div></div>
    <div class="row" style="margin-top:12px"><button class="btn ghost" data-b>Borrar</button><span class="grow"></span><button class="btn ok" data-ok disabled>Guardar firma</button></div></div>`;
  document.body.appendChild(el);
  const pad=sigPad(el.querySelector('.sigbox'));
  const ok=el.querySelector('[data-ok]');
  pad.onchange=()=>{ ok.disabled=pad.vacio(); };
  el.querySelector('[data-b]').onclick=()=>{pad.limpiar(); ok.disabled=true;};
  el.querySelector('[data-x]').onclick=()=>el.remove();
  ok.onclick=async()=>{ busy(ok,true); try{ await onOk(pad.png()); el.remove(); }catch(e){ busy(ok,false); toast(e.message,true); } };
}

// ====== ADMIN: año ======
function tabsSeccion(){ return `<div class="tabs"><button data-sec="toolbox" class="${S.seccion==='toolbox'?'on':''}">Toolbox</button><button data-sec="form" class="${S.seccion==='form'?'on':''}">Formación</button><button data-sec="docs" class="${S.seccion==='docs'?'on':''}">Documentos</button></div>`; }
function enlazarSeccion(){ document.querySelectorAll('[data-sec]').forEach(b=>b.onclick=()=>{ S.seccion=b.dataset.sec; ls.set('tb.sec',S.seccion); S.seccion==='form'?pantallaFormaciones():S.seccion==='docs'?pantallaDocumentos():pantallaAnio(); }); }
async function pantallaAnio(){
  pararVoz();
  if(S.seccion==='form') return pantallaFormaciones();
  if(S.seccion==='docs') return pantallaDocumentos();
  view(barra('Toolbox HSE', `<button class="ib" id="out">‹ Limpieza</button>`, `<button class="ib" id="cfg" title="Ajustes">Ajustes</button>`) +
    `<div class="wrap">${tabsSeccion()}<div class="row" style="margin-bottom:12px"><button class="btn sec" id="prev">‹</button><b class="grow" style="text-align:center;font-size:20px;color:var(--navy)">${S.anio}</b><button class="btn sec" id="next">›</button></div><div id="w" class="empty"><span class="spin dk"></span></div></div>`);
  $('#out').onclick=volverLimpieza; $('#cfg').onclick=pantallaAjustes; enlazarSeccion();
  $('#prev').onclick=()=>{S.anio--; pantallaAnio();}; $('#next').onclick=()=>{S.anio++; pantallaAnio();};
  try{
    S.meses = await rpc('prl_meses',{p_tok:S.tok,p_anio:S.anio});
    const now=new Date(), esteAnio=now.getFullYear()===S.anio;
    const hechos=S.meses.filter(m=>m.estado==='cerrada').length, conTema=S.meses.filter(m=>m.hay_tema).length;
    let h=`<div class="card row"><div class="grow"><b>${hechos} de ${conTema}</b> <span class="muted">meses cerrados</span></div>${conTema?`<div style="width:40%" class="bar"><b style="width:${Math.round(hechos/conTema*100)}%"></b></div>`:''}</div><div class="months">`;
    h += S.meses.map(m=>{
      let chip='', extra='';
      if(!m.hay_tema){ chip='<span class="chip">Sin Toolbox</span>'; }
      else if(m.estado==='cerrada'){ chip='<span class="chip ok">Cerrado</span>'; extra=`<span class="small muted">${m.firmas} firmas</span>`; }
      else if(m.enviada_en){ const pc=m.previstos?Math.round(Math.min(m.firmas,m.previstos)/m.previstos*100):0; chip=`<span class="chip ${m.firmas>=m.previstos&&m.previstos?'ok':'blue'}">${m.firmas}/${m.previstos} firmas</span>`; extra=`<div class="bar"><b style="width:${pc}%"></b></div>`; }
      else { chip='<span class="chip warn">Sin enviar</span>'; }
      const isNow = esteAnio && now.getMonth()+1===m.mes;
      return `<button class="mcard ${m.hay_tema?'':'off'} ${isNow?'now':''}" data-m="${m.mes}"><span class="row"><span class="mn grow">${MESES[m.mes-1]}</span>${chip}</span><span class="tt">${esc(m.hay_tema?(m.tema||m.compromiso):'Toca para añadir el contenido')}</span>${extra}</button>`;
    }).join('') + `</div>`;
    $('#w').outerHTML = `<div id="w">${h}</div>`;
    document.querySelectorAll('.mcard').forEach(b=>b.onclick=()=>{ const m=S.meses[+b.dataset.m-1]; m.hay_tema? pantallaMes(m.mes) : pantallaEditor(m.mes); });
  }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)} <button class="btn sec" onclick="pantallaAnio()">Reintentar</button></div>`; }
}

// ====== ADMIN: mes ======
async function cargarMes(mes){
  const [d, trab, cfg] = await Promise.all([
    rpc('prl_mes',{p_tok:S.tok,p_anio:S.anio,p_mes:mes}),
    S.trab.length?Promise.resolve(S.trab):rpc('prl_trabajadores',{p_tok:S.tok}),
    rpc('prl_config_leer',{p_tok:S.tok})
  ]);
  S.mes=mes; S.data=d; S.trab=trab; S.cfg=cfg;
}
async function pantallaMes(mes, tab){
  pararVoz();
  if(tab) S.tab=tab;
  view(barra(`${MESES[mes-1]} ${S.anio}`, `<button class="ib" id="bk">‹</button>`, `<button class="ib" id="pdf">PDF</button>`) + `<div class="wrap" id="w"><div class="empty"><span class="spin dk"></span></div></div>`);
  $('#bk').onclick=pantallaAnio;
  try{ await cargarMes(mes); }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  $('#pdf').onclick=e=>descargarPDF(e.currentTarget);
  pintarMes();
}
// ---- Envío a prevención (al cerrar el mes)
function avisoPrevencion(s){
  const correo=S.cfg.correo_prl;
  if(!correo) return `<div class="small muted" style="margin-top:10px">Para que al cerrar el mes se envíe solo al responsable de prevención, <a href="#" id="prevCfg">pon su correo en Ajustes</a>.</div>`;
  let t;
  if(s.prev_enviado_en) t=`<span class="chip ok">Enviado a prevención ${fmtFH(s.prev_enviado_en)}</span> <span class="small muted">${esc(s.prev_destino||correo)}</span>`;
  else if(s.prev_error) t=`<span class="chip warn">No se pudo enviar a prevención</span> <span class="small muted">${esc(s.prev_error)}</span>`;
  else t=`<span class="chip warn">Sin enviar a prevención</span>`;
  return `<div style="margin-top:12px;padding-top:10px;border-top:1px solid #e6e9ef"><div style="display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;min-width:0;overflow-wrap:anywhere">${t}</div>
    <button class="btn ${s.prev_enviado_en?'ghost':'sec'}" id="prevEnv" style="width:100%;margin-top:8px">${s.prev_enviado_en?'Volver a enviar a prevención':'Enviar a prevención'}</button></div>`;
}
const aB64 = bytes => { const u=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes); let s=''; for(let i=0;i<u.length;i+=0x8000) s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000)); return btoa(s); };
async function enviarPrevencion(btn){
  const mes=S.mes, anio=S.anio;
  busy(btn,true); toast('Preparando los documentos para prevención…');
  try{
    if(!window.jspdf) throw new Error('No se ha podido cargar el generador de PDF. Revisa la conexión.');
    const archivos=[];
    const { doc, nombre } = await construirPDF();
    archivos.push({nombre, b64:doc.output('datauristring').split(',')[1]});
    const L=(await rpc('prl_form_lista',{p_tok:S.tok,p_anio:anio})).filter(f=>+f.fecha.slice(5,7)===mes);
    const firm=L.filter(f=>f.tiene_firma);
    if(firm.length) archivos.push({nombre:`F40R304 Formacion en el puesto ${MESES[mes-1]} ${anio}.pdf`, b64:aB64(await bytesFormaciones(firm.map(f=>f.id)))});
    const s=sesionDe(), fz=new Set(S.data.firmas.map(f=>f.trabajador));
    const prev=s.previstos||[];
    const resumen={toolbox:true, tema:S.data.toolbox.tema||S.data.toolbox.compromiso||'', previstos:prev.length, firmados:prev.filter(id=>fz.has(id)).length,
      faltan:prev.filter(id=>!fz.has(id)).map(id=>(S.trab.find(t=>t.id===id)||{}).nombre).filter(Boolean),
      formaciones:firm.length, formSinFirmar:L.length-firm.length};
    let r, j={};
    try{ r=await fetch(`${SB_URL}/functions/v1/envio-prevencion`,{method:'POST',headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({tok:S.tok,anio,mes,archivos,resumen})}); }
    catch(e){ throw new Error('Sin conexión. Se ha cerrado el mes, pero no se ha enviado. Pulsa «Enviar a prevención» cuando tengas cobertura.'); }
    try{ j=await r.json(); }catch(e){}
    if(!r.ok||!j.ok){ const m=j.error||('Error '+r.status); throw new Error(m==='SIN_CORREO'?'Falta el correo del responsable de prevención en Ajustes.':ERR[m]||m); }
    toast(`Enviado a ${j.destino}`);
  }catch(e){ toast(e.message,true); }
  try{ if(S.mes===mes){ await cargarMes(mes); pintarMes(); } }catch(e){}
  busy(btn,false);
}
function sesionDe(){ return S.data.sesion || {estado:'abierta', previstos:S.trab.filter(t=>t.rol==='operario').map(t=>t.id), enviada_en:null}; }
function pintarMes(){
  const d=S.data, s=sesionDe(), cerrada=s.estado==='cerrada';
  const firmadas=new Map(d.firmas.map(f=>[f.trabajador,f]));
  const prev=new Set(s.previstos||[]);
  const nPrev=prev.size, nOk=[...prev].filter(id=>firmadas.has(id)).length;
  let estado;
  if(cerrada) estado=`<span class="chip ok">Cerrado ${fmtFH(s.cerrada_en)}</span>`;
  else if(s.enviada_en) estado=`<span class="chip blue">Enviado ${fmtFH(s.enviada_en)}</span>`;
  else estado=`<span class="chip warn">Sin enviar</span>`;
  let h=`<div class="card"><div class="row"><b class="grow" style="color:var(--blue)">${esc(d.toolbox.tema||d.toolbox.compromiso)}</b>${estado}</div>
    <div class="row" style="margin-top:10px"><div class="grow"><b style="font-size:22px">${nOk}/${nPrev}</b> <span class="muted">han firmado</span></div></div>
    <div class="bar" style="margin:8px 0 12px"><b style="width:${nPrev?Math.round(nOk/nPrev*100):0}%"></b></div>
    <div class="row">${cerrada?`<button class="btn sec grow" id="reabrir">Reabrir mes</button>`:
      `<button class="btn grow" id="enviar">${s.enviada_en?'Recordar a los que faltan':'Enviar a los trabajadores'}</button><button class="btn sec" id="cerrar">Cerrar mes</button>`}</div>
    ${cerrada?avisoPrevencion(s):''}
    ${!S.cfg.firma_formador?`<div class="small" style="margin-top:10px;color:var(--warn)"> Falta tu firma de formador. <a href="#" id="gofirma">Añádela en Ajustes</a>.</div>`:''}
  </div>
  <div class="tabs"><button data-t="firmas" class="${S.tab==='firmas'?'on':''}">Firmas</button><button data-t="datos" class="${S.tab==='datos'?'on':''}">Datos</button><button data-t="contenido" class="${S.tab==='contenido'?'on':''}">Contenido</button></div><div id="tab"></div>`;
  $('#w').innerHTML=h;
  document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{S.tab=b.dataset.t; pintarMes();});
  if($('#gofirma')) $('#gofirma').onclick=e=>{e.preventDefault(); pantallaAjustes();};
  if($('#enviar')) $('#enviar').onclick=async e=>{
    const b=e.currentTarget; busy(b,true);
    try{ const r=await rpc('prl_enviar',{p_tok:S.tok,p_anio:S.anio,p_mes:S.mes}); toast(r.avisados?`Aviso enviado a ${r.avisados} trabajador${r.avisados>1?'es':''}`:'Ya han firmado todos'); await cargarMes(S.mes); pintarMes(); }
    catch(err){ busy(b,false); toast(err.message,true); }
  };
  if($('#cerrar')) $('#cerrar').onclick=async e=>{
    const falt=nPrev-nOk, correo=S.cfg.correo_prl;
    const txt=(falt>0?`Faltan ${falt} por firmar.\n\n`:'')+(correo?`Al cerrar el mes se enviarán el Toolbox y las formaciones en el puesto de ${MESES[S.mes-1]} a ${correo}.\n\n¿Cerrar el mes y enviarlo?`:'¿Cerrar el mes?');
    if((falt>0||correo) && !confirm(txt)) return;
    const b=e.currentTarget; busy(b,true);
    try{ await rpc('prl_cerrar',{p_tok:S.tok,p_anio:S.anio,p_mes:S.mes,p_cerrar:true}); await cargarMes(S.mes); }
    catch(err){ busy(b,false); toast(err.message,true); return; }
    if(!correo){ pintarMes(); toast('Mes cerrado. Para que se envíe solo a prevención, pon su correo en Ajustes.'); return; }
    pintarMes(); await enviarPrevencion($('#prevEnv'));
  };
  if($('#prevEnv')) $('#prevEnv').onclick=e=>enviarPrevencion(e.currentTarget);
  if($('#prevCfg')) $('#prevCfg').onclick=e=>{ e.preventDefault(); pantallaAjustes(); };
  if($('#reabrir')) $('#reabrir').onclick=async e=>{
    const b=e.currentTarget; busy(b,true);
    try{ await rpc('prl_cerrar',{p_tok:S.tok,p_anio:S.anio,p_mes:S.mes,p_cerrar:false}); await cargarMes(S.mes); pintarMes(); }
    catch(err){ busy(b,false); toast(err.message,true); }
  };
  if(S.tab==='firmas') tabFirmas(firmadas, prev, cerrada);
  else if(S.tab==='datos') tabDatos(cerrada);
  else tabContenido();
}
function tabFirmas(firmadas, prev, cerrada){
  const lista = S.trab.filter(t=>prev.has(t.id) || firmadas.has(t.id));
  const fuera = S.trab.filter(t=>!prev.has(t.id) && !firmadas.has(t.id));
  // firmas de gente ya inactiva
  const extra = S.data.firmas.filter(f=>!S.trab.some(t=>t.id===f.trabajador));
  let h=`<div class="card">`;
  if(!lista.length && !extra.length) h+=`<div class="empty">No hay nadie convocado.</div>`;
  h += lista.map(t=>{ const f=firmadas.get(t.id);
    return `<div class="li"><span class="dot ${f?'ok':''}"></span><span class="grow"><span class="nm">${esc(t.nombre)}</span><br><span class="small muted">${f?('Firmó '+fmtFH(f.firmado_en)):(t.categoria?esc(t.categoria):'Pendiente')}</span></span>
      ${f?`<img class="sg" src="${f.firma}" alt="">${cerrada?'':`<button class="btn ghost" data-del="${f.id}" title="Borrar firma">✕</button>`}`:
        (cerrada?'':`<button class="btn ghost" data-sig="${t.id}">Firmar aquí</button><button class="btn ghost" data-quit="${t.id}" title="No convocar">−</button>`)}</div>`; }).join('');
  h += extra.map(f=>`<div class="li"><span class="dot ok"></span><span class="grow"><span class="nm">${esc(f.nombre)}</span><br><span class="small muted">Firmó ${fmtFH(f.firmado_en)}</span></span><img class="sg" src="${f.firma}" alt=""></div>`).join('');
  h += `</div>`;
  if(!cerrada && fuera.length){
    h += `<div class="h2">No convocados</div><div class="card">` + fuera.map(t=>`<div class="li"><span class="dot"></span><span class="grow"><span class="nm">${esc(t.nombre)}</span>${t.rol==='admin'?' <span class="chip">admin</span>':''}</span><button class="btn ghost" data-add="${t.id}">+ Convocar</button></div>`).join('') + `</div>`;
  }
  h += `<p class="small muted">“Firmar aquí” sirve para recoger la firma en tu móvil o tablet cuando el trabajador está contigo (por ejemplo, si no usa la app).</p>`;
  $('#tab').innerHTML=h;
  const setPrev = async (ids)=>{ try{ await rpc('prl_sesion_guardar',{p_tok:S.tok,p_anio:S.anio,p_mes:S.mes,p:{previstos:ids}}); await cargarMes(S.mes); pintarMes(); }catch(e){ toast(e.message,true); } };
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>setPrev([...prev, b.dataset.add]));
  document.querySelectorAll('[data-quit]').forEach(b=>b.onclick=()=>setPrev([...prev].filter(x=>x!==b.dataset.quit)));
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{
    if(!confirm('¿Borrar esta firma? El trabajador tendrá que volver a firmar.')) return;
    try{ await rpc('prl_firma_borrar',{p_tok:S.tok,p_id:b.dataset.del}); await cargarMes(S.mes); pintarMes(); }catch(e){ toast(e.message,true); }
  });
  document.querySelectorAll('[data-sig]').forEach(b=>b.onclick=()=>{
    const t=S.trab.find(x=>x.id===b.dataset.sig);
    hojaFirma(t.nombre, `Toolbox de ${MESES[S.mes-1]}: ${esc(S.data.toolbox.compromiso)}<br>Al firmar confirma que ha recibido esta formación.`, async png=>{
      await rpc('prl_firmar',{p_tok:S.tok,p_anio:S.anio,p_mes:S.mes,p_trab:t.id,p_puesto:t.categoria,p_firma:png});
      toast('Firma guardada'); await cargarMes(S.mes); pintarMes();
    });
  });
}
function tabDatos(cerrada){
  const s=sesionDe(), dis=cerrada?'disabled':'';
  const v=(k,def)=>esc(s[k]!=null?s[k]:(def??''));
  $('#tab').innerHTML=`<div class="card">
    <label class="f">Denominación de la acción formativa</label><input class="inp" id="d_den" ${dis} value="${v('denominacion','Toolbox Talk HSE '+MESES[S.mes-1]+' '+String(S.anio).slice(2))}">
    <div class="row"><div class="grow"><label class="f">Fecha</label><input class="inp" type="date" id="d_fec" ${dis} value="${v('fecha')}"></div>
    <div style="width:120px"><label class="f">Duración (min)</label><input class="inp" type="number" min="1" id="d_dur" ${dis} value="${v('duracion',S.cfg.duracion)}"></div></div>
    <label class="f">Centro de trabajo / lugar</label><input class="inp" id="d_cen" ${dis} value="${v('centro',S.cfg.centro)}">
    <label class="f">Formador</label><input class="inp" id="d_for" ${dis} value="${v('formador',S.cfg.formador||S.yo.nombre)}">
    <label class="f">Comentarios adicionales / Observaciones</label><textarea class="inp" id="d_obs" ${dis}>${v('observaciones')}</textarea>
    ${cerrada?'':`<button class="btn" id="d_save" style="margin-top:14px;width:100%">Guardar datos</button>`}
  </div>`;
  if(!cerrada) $('#d_save').onclick=async e=>{
    const b=e.currentTarget; busy(b,true);
    const p={denominacion:$('#d_den').value, fecha:$('#d_fec').value, duracion:$('#d_dur').value, centro:$('#d_cen').value, formador:$('#d_for').value, observaciones:$('#d_obs').value};
    try{ await rpc('prl_sesion_guardar',{p_tok:S.tok,p_anio:S.anio,p_mes:S.mes,p}); toast('Guardado'); await cargarMes(S.mes); pintarMes(); }
    catch(err){ busy(b,false); toast(err.message,true); }
  };
}
function tabContenido(){
  $('#tab').innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn sec" id="voz">Escuchar</button><span class="grow"></span><button class="btn ghost" id="edit">Editar contenido</button></div>` + htmlLectura(S.data.toolbox);
  $('#voz').onclick=e=>hablar(e.currentTarget, textoLectura(S.data.toolbox));
  $('#edit').onclick=()=>pantallaEditor(S.mes, S.data.toolbox);
}


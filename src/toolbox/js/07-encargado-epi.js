// ====== ENCARGADO: entregas de EPI y firmas en persona ======
// El encargado ve y crea las entregas de EPI y EPI colectivo de todos los trabajadores,
// y recoge la firma de cada uno en su móvil (la firma la pone el trabajador con su nombre).
// NUNCA ve: fichas, reconocimiento médico, certificados, formación ni ajustes (eso lo bloquea la base de datos).
function docsVolver(){ return S.yo.rol==='admin' ? pantallaDocumentos() : pantallaEncargado(); }
function docVer(id){ return S.yo.rol==='admin' ? pantallaDocDetalle(id) : pantallaEncDoc(id); }

async function pantallaEncargado(){
  pararVoz(); S.anio = S.anio || new Date().getFullYear();
  view(barra('Toolbox · EPI', `<button class="ib" id="out">‹ Limpieza</button>`) +
    `<div class="wrap"><div class="row" style="margin-bottom:12px"><button class="btn sec" id="prev">‹</button><b class="grow" style="text-align:center;font-size:20px;color:var(--navy)">${S.anio}</b><button class="btn sec" id="next">›</button></div>
    <div class="h2" style="margin-top:0">Nueva entrega</div>
    <div class="months" style="margin-bottom:14px">
      <button class="mcard" data-nuevo="epi" style="min-height:auto"><span class="mn" style="font-size:15px">＋ Entrega de EPI</span><span class="tt">SH-CORP-SP-FO-014</span></button>
      <button class="mcard" data-nuevo="epi_col" style="min-height:auto"><span class="mn" style="font-size:15px">＋ EPI de uso colectivo</span><span class="tt">SH-CORP-SP-FO-072</span></button>
    </div>
    <div id="tbx"></div>
    <div id="w" class="empty"><span class="spin dk"></span></div></div>`);
  $('#out').onclick=volverLimpieza; cargarTbxEnc();
  $('#prev').onclick=()=>{S.anio--; pantallaEncargado();}; $('#next').onclick=()=>{S.anio++; pantallaEncargado();};
  document.querySelectorAll('[data-nuevo]').forEach(b=>b.onclick=()=>pantallaDocEditar(b.dataset.nuevo));
  let L; try{ L=await rpc('prl_doc_lista',{p_tok:S.tok,p_anio:S.anio}); }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  const pend=L.filter(d=>!d.tiene_firma).length;
  $('#w').innerHTML = (L.length
      ? `<div class="card small">${L.length} entregas en ${S.anio}${pend?` · <b style="color:var(--warn)">${pend} sin firmar</b>`:''}</div>`
      : `<div class="card muted">No hay entregas de EPI en ${S.anio}.</div>`) +
    L.map(d=>`<button class="card mcard" style="width:100%" data-d="${esc(d.id)}">
      <span class="row"><span class="mn grow">${esc(d.nombre||'')}</span><span class="chip ${d.tiene_firma?'ok':'warn'}">${d.tiene_firma?'Firmado':'Sin firmar'}</span></span>
      <span class="tt">${esc(DOC_INFO[d.tipo].t)} · ${fmtF(d.fecha)}</span></button>`).join('');
  document.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>pantallaEncDoc(b.dataset.d));
}

async function pantallaEncDoc(id){
  pararVoz();
  view(barra('Entrega de EPI', `<button class="ib" id="bk">‹</button>`) + `<div class="wrap" id="w"><div class="empty"><span class="spin dk"></span></div></div>`);
  $('#bk').onclick=()=>pantallaEncargado();
  let d; try{ d=await rpc('prl_doc_ver',{p_tok:S.tok,p_id:id}); }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  if(d.trabajador===S.yo.id) return pantallaDocLeer(id); // su propio documento: lo firma él con su login
  let h=htmlDoc(d);
  if(d.tiene_firma){
    h+=`<div class="card done"><div class="big">✓</div><h3 style="margin:10px 0 4px">Firmado</h3><div class="muted small">${fmtFH(d.firmado_en)}</div>${d.firma?`<img src="${d.firma}" style="max-height:70px;margin-top:10px">`:''}</div>`;
  } else {
    h+=`<div class="card"><b>Firma de ${esc(d.nombre||'')}</b>
      <label class="check" style="margin-top:8px"><input type="checkbox" id="leido"><span>He recibido los equipos y conozco su uso correcto.</span></label>
      <div class="small muted" style="margin:8px 0 12px">Pásale el móvil: firma el propio trabajador con su nombre.</div>
      <button class="btn big ok" id="firmar" disabled>Recoger firma</button></div>`;
  }
  h+=`<div class="row" style="margin-top:12px"><button class="btn sec grow" id="edit">Editar</button></div>`;
  $('#w').innerHTML=h;
  if($('#firmar')){
    $('#leido').onchange=()=>{ $('#firmar').disabled=!$('#leido').checked; };
    $('#firmar').onclick=()=>hojaFirma(d.nombre||'Trabajador', esc(DOC_INFO[d.tipo].t)+' del '+fmtF(d.fecha), async png=>{
      await rpc('prl_doc_firmar_enc',{p_tok:S.tok,p_id:id,p_firma:png}); toast('Firma guardada'); pantallaEncDoc(id); });
  }
  $('#edit').onclick=()=>pantallaDocEditar(d.tipo,d);
}

/* ---- Toolbox del mes: el encargado recoge en su móvil las firmas de los operarios convocados ---- */
async function cargarTbxEnc(){
  const hoy=new Date(), y=hoy.getFullYear(), m=hoy.getMonth()+1;
  const cand=[[y,m],[m===1?y-1:y,m===1?12:m-1]];   // mes actual y el anterior (por si aún está abierto)
  for(const [a,mes] of cand){
    let d; try{ d=await rpc('prl_mes',{p_tok:S.tok,p_anio:a,p_mes:mes}); }catch(e){ continue; }
    if(!d.sesion||!d.sesion.enviada_en||d.sesion.estado==='cerrada') continue;
    const convocados=(d.sesion.previstos||[]).length, firmados=d.firmas.filter(f=>(d.sesion.previstos||[]).includes(f.trabajador)).length;
    const box=$('#tbx'); if(!box) return;
    box.innerHTML=`<div class="card"><b>Toolbox de ${MESES[mes-1]}</b><div class="small muted" style="margin:4px 0 10px">${firmados} de ${convocados} firmas</div><button class="btn big" id="tbxgo">Recoger firmas del Toolbox</button></div>`;
    $('#tbxgo').onclick=()=>pantallaEncToolbox(a,mes);
    return;
  }
}

async function pantallaEncToolbox(a,mes){
  pararVoz();
  view(barra(`Toolbox de ${MESES[mes-1]}`, `<button class="ib" id="bk">‹</button>`) + `<div class="wrap" id="w"><div class="empty"><span class="spin dk"></span></div></div>`);
  $('#bk').onclick=()=>pantallaEncargado();
  let d, trab;
  try{ [d,trab]=await Promise.all([rpc('prl_mes',{p_tok:S.tok,p_anio:a,p_mes:mes}), rpc('prl_trabajadores',{p_tok:S.tok})]); }
  catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  const tr=id=>trab.find(t=>t.id===id)||{id,nombre:'(sin nombre)',categoria:''};
  const lista=(d.sesion.previstos||[]).map(tr);
  let h=htmlLectura(d.toolbox)+`<div class="card"><label class="check"><input type="checkbox" id="leido"><span>El trabajador ha leído (o le he explicado) este Toolbox y lo ha entendido.</span></label>
    <div class="small muted" style="margin-top:6px">Marca esto antes de recoger cada firma.</div></div>`;
  h+=`<div class="h2">Firmas</div><div class="card">`+(lista.map(t=>{ const f=d.firmas.find(x=>x.trabajador===t.id);
    return `<div class="li"><span class="dot ${f?'ok':''}"></span><span class="grow"><span class="nm">${esc(t.nombre)}</span><br><span class="small muted">${f?'Firmó '+fmtFH(f.firmado_en):esc(t.categoria||'Pendiente')}</span></span>${f?`<img class="sg" src="${f.firma}" alt="">`:`<button class="btn ghost" data-sig="${esc(t.id)}" disabled>Firmar</button>`}</div>`; }).join('')||`<div class="empty">Nadie convocado.</div>`)+`</div>`;
  $('#w').innerHTML=h;
  $('#leido').onchange=()=>document.querySelectorAll('[data-sig]').forEach(b=>b.disabled=!$('#leido').checked);
  document.querySelectorAll('[data-sig]').forEach(b=>b.onclick=()=>{ const t=tr(b.dataset.sig);
    hojaFirma(t.nombre, `Toolbox de ${MESES[mes-1]}: ${esc(d.toolbox.compromiso||'')}<br>Al firmar confirma que ha recibido esta formación.`, async png=>{
      await rpc('prl_firmar',{p_tok:S.tok,p_anio:a,p_mes:mes,p_trab:t.id,p_puesto:t.categoria||'',p_firma:png});
      toast('Firma guardada'); pantallaEncToolbox(a,mes); }); });
}

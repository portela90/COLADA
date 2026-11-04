// ====== TALLAS DE ROPA Y BOTAS ======
// Pestaña «Tallas y EPI» de la ficha, formulario del trabajador («Mis tallas») y Excel para el jefe.
// TALLAS_N (06) son las 6 prendas. El trabajador propone; el admin acepta o rechaza.

// Qué entrega cuenta como cada prenda (texto de la entrega o EPI de la lista)
const TALLA_BUSCA={
  camiseta_larga:t=>/camiseta/i.test(t)&&/larga/i.test(t),
  camiseta_corta:t=>/camiseta/i.test(t)&&!/larga/i.test(t),
  pantalon:t=>/pantal/i.test(t),
  chaqueta:t=>/chaqueta|polar/i.test(t),
  bota_agua:t=>/bota/i.test(t)&&/agua/i.test(t),
  bota_seguridad:t=>(/bota|zapato/i.test(t))&&!/agua/i.test(t),
};
const ORIG_TAL={admin:'Editado por el admin',aceptada:'Propuesta del trabajador aceptada',rechazada:'Propuesta del trabajador rechazada'};
const fDMY=s=>s?s.split('-').reverse().join('/'):'';

// Última entrega firmada de cada prenda: { clave: {fecha, nombre} }
function ultimasEntregas(F){
  const r={};
  for(const d of (F.docs||[])){
    if(!d.tiene_firma||!(d.tipo==='epi'||d.tipo==='epi_col')) continue;
    const x=d.datos||{}, nombres=[];
    (x.otros||[]).filter(o=>o&&o.t).forEach(o=>nombres.push(o.t));
    Object.keys(x.items||{}).forEach(k=>{ const it=EPI_ITEMS.find(i=>i[0]===k); if(it&&x.items[k]) nombres.push(it[1]); });
    for(const k of Object.keys(TALLA_BUSCA)){
      const n=nombres.find(TALLA_BUSCA[k]);
      if(n&&(!r[k]||d.fecha>r[k].fecha)) r[k]={fecha:d.fecha,nombre:n.replace(/\s*\(.*\)$/,'')};
    }
  }
  return r;
}

function tabsFicha(id,tab){
  return `<div style="display:flex;gap:6px;margin:0 0 12px">`+[['ficha','Ficha'],['tallas','Tallas y EPI']].map(([k,n])=>
    `<button class="btn ${tab===k?'':'ghost'}" data-tab="${k}" data-id="${esc(id)}" style="flex:1;margin:0">${n}</button>`).join('')+`</div>`;
}
function enlazaTabs(id){
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>pantallaFicha(b.dataset.id,b.dataset.tab));
}

function pintaTallas(F,id){
  const t=F.trabajador, tl=t.tallas||{}, pend=t.tallas_pend||null, ult=ultimasEntregas(F);
  const fila=k=>{
    const u=ult[k], propone=pend&&pend[k]&&pend[k]!==tl[k];
    return `<div class="li"><span class="grow"><span class="nm">${esc(TALLAS_N[k])}</span><br>
      <span class="small muted">${u?'Última entrega: '+fDMY(u.fecha)+' ('+esc(u.nombre)+')':'Sin entregas registradas'}</span>
      ${propone?`<br><span class="small" style="color:var(--warn)">Propone: <b>${esc(pend[k])}</b></span>`:''}</span>
      <b style="text-align:right">${tl[k]?esc(tl[k]):'<span class="muted">—</span>'}</b></div>`;
  };
  $('#w').innerHTML=tabsFicha(id,'tallas')+
    (pend?`<div class="card" style="border:2px solid var(--warn)"><b>Cambios pendientes de tu revisión</b>
      <div class="small muted">Enviados el ${fDMY((t.tallas_pend_en||'').slice(0,10))}. Tu ficha no cambia hasta que los aceptes.</div>
      <div class="row" style="margin-top:8px"><button class="btn grow" id="pacep">Aceptar cambios</button><button class="btn sec grow" id="prech">Rechazar</button></div></div>`:'')+
    `<div class="card"><b style="font-size:17px">${esc(t.nombre)}</b><div class="small muted">Talla de cada prenda y su última entrega.</div>
      <div class="small muted">Última confirmación de tallas: <b>${t.tallas_rev_en?fDMY(String(t.tallas_rev_en).slice(0,10)):'nunca'}</b></div></div>
    <div class="card">${Object.keys(TALLAS_N).map(fila).join('')}</div>
    <div class="row" style="margin:12px 2px"><button class="btn sec grow" id="etal">Editar tallas</button><button class="btn grow" id="xtal">Descargar Excel</button></div>
    <div class="h2">Historial de tallas</div><div class="card" id="htal"><div class="empty"><span class="spin dk"></span></div></div>`;
  enlazaTabs(id);
  if($('#pacep')) $('#pacep').onclick=async()=>{ try{ await rpc('prl_tallas_resolver',{p_tok:S.tok,p_trab:t.id,p_aceptar:true}); toast('Tallas actualizadas'); pantallaFicha(id,'tallas'); }catch(e){ toast(e.message,true); } };
  if($('#prech')) $('#prech').onclick=async()=>{ if(!confirm('¿Rechazar los cambios de tallas que ha propuesto?')) return; try{ await rpc('prl_tallas_resolver',{p_tok:S.tok,p_trab:t.id,p_aceptar:false}); toast('Propuesta rechazada'); pantallaFicha(id,'tallas'); }catch(e){ toast(e.message,true); } };
  $('#etal').onclick=()=>pantallaDatosTrab(t);
  $('#xtal').onclick=e=>excelTallas([F],e.currentTarget);
  rpc('prl_tallas_historial',{p_tok:S.tok,p_trab:t.id}).then(H=>{
    $('#htal').innerHTML=H.length?H.map(h=>`<div class="li"><span class="grow"><span class="nm">${esc(ORIG_TAL[h.origen]||h.origen)}</span><br>
      <span class="small muted">${fDMY(String(h.cuando).slice(0,10))}${h.quien?' · '+esc(h.quien):''}</span></span>
      <span class="small" style="text-align:right">${Object.keys(TALLAS_N).filter(k=>h.tallas&&h.tallas[k]).map(k=>esc(TALLAS_N[k])+' '+esc(h.tallas[k])).join(' · ')||'—'}</span></div>`).join(''):'<div class="empty">Sin cambios registrados.</div>';
  }).catch(e=>{ $('#htal').textContent=e.message; });
}

// ---------- Excel (una fila por trabajador) ----------
let XLSX_P=null;
function cargaXLSX(){
  if(window.XLSX) return Promise.resolve();
  if(!XLSX_P) XLSX_P=new Promise((ok,ko)=>{ const s=document.createElement('script'); s.src='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    s.onload=ok; s.onerror=()=>{ XLSX_P=null; ko(new Error('No se pudo cargar la librería del Excel. Revisa la conexión.')); }; document.head.appendChild(s); });
  return XLSX_P;
}
function filaTallas(F){
  const t=F.trabajador, tl=t.tallas||{}, pend=t.tallas_pend||{}, ult=ultimasEntregas(F), f={Trabajador:t.nombre,DNI:t.dni||'',Puesto:t.puesto||''};
  Object.keys(TALLAS_N).forEach(k=>f[TALLAS_N[k]]=tl[k]||'');
  Object.keys(TALLAS_N).forEach(k=>f['Última entrega: '+TALLAS_N[k]]=ult[k]?fDMY(ult[k].fecha):'');
  f['Propuesta pendiente']=Object.keys(TALLAS_N).filter(k=>pend[k]&&pend[k]!==tl[k]).map(k=>TALLAS_N[k]+': '+pend[k]).join('; ');
  return f;
}
async function excelTallas(Fs,btn,nombre){
  if(btn) busy(btn,true);
  try{
    await cargaXLSX();
    const filas=Fs.map(filaTallas), wb=XLSX.utils.book_new(), ws=XLSX.utils.json_to_sheet(filas);
    ws['!cols']=Object.keys(filas[0]||{}).map(k=>({wch:Math.max(12,Math.min(40,k.length+2))}));
    XLSX.utils.book_append_sheet(wb,ws,'Tallas y EPI');
    XLSX.writeFile(wb,(nombre||'tallas-y-epi')+'-'+hoyISO()+'.xlsx');
  }catch(e){ toast(e.message,true); }
  finally{ if(btn) busy(btn,false); }
}
async function excelTodos(btn){
  busy(btn,true);
  try{
    const L=(await rpc('prl_fichas',{p_tok:S.tok})).filter(t=>t.activo);
    if(!L.length){ toast('No hay trabajadores activos'); return; }
    const Fs=[]; for(const t of L) Fs.push(await rpc('prl_ficha',{p_tok:S.tok,p_trab:t.id}));
    busy(btn,false);
    await excelTallas(Fs,null,'tallas-y-epi-todos');
  }catch(e){ toast(e.message,true); }
  finally{ busy(btn,false); }
}

// En la lista de fichas (admin): Excel de todos y aviso para que revisen sus tallas
function enlazaTallasFichas(){
  $('#w').insertAdjacentHTML('afterbegin',`<div class="row" style="margin:0 0 12px"><button class="btn sec grow" id="xtodos">Excel tallas y EPI (todos)</button><button class="btn sec grow" id="avtal">Avisar a quien no ha revisado sus tallas (180 días)</button><button class="btn sec grow" id="pedido">Pedido de ropa (Excel)</button></div>`);
  $('#xtodos').onclick=e=>excelTodos(e.currentTarget);
  $('#pedido').onclick=e=>excelPedido(e.currentTarget);
  $('#avtal').onclick=async e=>{
    if(!confirm('¿Avisar a los trabajadores que no han revisado sus tallas en los últimos 180 días?')) return;
    const b=e.currentTarget; busy(b,true);
    try{ const r=await rpc('prl_tallas_avisar',{p_tok:S.tok,p_dias:180}); toast('Aviso enviado a '+r.avisados+' trabajadores'); }
    catch(er){ toast(er.message,true); } finally{ busy(b,false); }
  };
}

// ---------- Trabajador: «Mis tallas» ----------
async function pantallaMisTallas(){
  pararVoz();
  view(barra('Mis tallas', `<button class="ib" id="bk">‹</button>`) + `<div class="wrap" id="w"><div class="empty"><span class="spin dk"></span></div></div>`);
  $('#bk').onclick=pantallaOperario;
  let M; try{ M=await rpc('prl_tallas_mias',{p_tok:S.tok}); }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  const tl=M.tallas||{};
  $('#w').innerHTML=`<div class="card"><b>Tu ropa y botas</b>
      <div class="small muted">Escribe la talla de cada prenda. Cristian lo revisa y lo aprueba antes de que cambie en tu ficha. Si dejas una casilla vacía, se queda como está.</div></div>
    ${M.pend?`<div class="card" style="border:2px solid var(--warn)"><b>Pendiente de revisar</b><div class="small muted">Enviado el ${fDMY(String(M.pend_en||'').slice(0,10))}.</div></div>`:''}
    <div class="card">${Object.keys(TALLAS_N).map(k=>`<div style="margin:10px 0"><label class="f">${esc(TALLAS_N[k])}</label><input class="inp tm" data-k="${k}" value="${esc(tl[k]||'')}" placeholder="Talla"></div>`).join('')}</div>
    <button class="btn" id="env" style="width:100%">Enviar cambios</button>`;
  $('#env').onclick=async e=>{
    const p={}; document.querySelectorAll('.tm').forEach(i=>{ const v=i.value.trim(); if(v&&v!==(tl[i.dataset.k]||'')) p[i.dataset.k]=v; });
    if(!Object.keys(p).length){ toast('No has cambiado ninguna talla',true); return; }
    const b=e.currentTarget; busy(b,true);
    try{ await rpc('prl_tallas_pedir',{p_tok:S.tok,p:p}); toast('Enviado. Cristian lo revisará.'); pantallaMisTallas(); }
    catch(er){ toast(er.message==='SIN_CAMBIOS'?'No has cambiado ninguna talla':er.message,true); busy(b,false); }
  };
}

// ---------- Pedido de ropa: cuántas personas necesitan cada prenda y en qué talla (solo admin) ----------
// Unidades que se piden por persona: camisetas y pantalón, 2; chaqueta y botas, 1
const UDS_PEDIDO={camiseta_larga:2,camiseta_corta:2,pantalon:2,chaqueta:1,bota_agua:1,bota_seguridad:1};
async function excelPedido(btn){
  busy(btn,true);
  try{
    const L=(await rpc('prl_fichas',{p_tok:S.tok})).filter(t=>t.activo);
    if(!L.length){ toast('No hay trabajadores activos'); return; }
    const Fs=[]; for(const t of L) Fs.push(await rpc('prl_ficha',{p_tok:S.tok,p_trab:t.id}));
    const orden=Object.keys(TALLAS_N), mapa={};
    Fs.forEach(F=>{ const t=F.trabajador; orden.forEach(k=>{ const v=(t.tallas||{})[k]; if(!v) return;
      const c=mapa[k+'|'+v]||(mapa[k+'|'+v]={k,v,n:0,nombres:[]}); c.n++; c.nombres.push(t.nombre); }); });
    const filas=Object.values(mapa)
      .sort((a,b)=>orden.indexOf(a.k)-orden.indexOf(b.k)||String(a.v).localeCompare(String(b.v),'es',{numeric:true}))
      .map(c=>({Prenda:TALLAS_N[c.k],Talla:c.v,'Uds. por persona':UDS_PEDIDO[c.k],'Nº personas':c.n,'Uds. a pedir':c.n*UDS_PEDIDO[c.k],Personas:c.nombres.join(', ')}));
    if(!filas.length){ toast('Aún no hay tallas registradas'); return; }
    await cargaXLSX();
    const wb=XLSX.utils.book_new(), ws=XLSX.utils.json_to_sheet(filas);
    ws['!cols']=[{wch:40},{wch:12},{wch:16},{wch:14},{wch:14},{wch:70}];
    XLSX.utils.book_append_sheet(wb,ws,'Pedido');
    XLSX.writeFile(wb,'pedido-ropa-'+hoyISO()+'.xlsx');
  }catch(e){ toast(e.message,true); }
  finally{ busy(btn,false); }
}

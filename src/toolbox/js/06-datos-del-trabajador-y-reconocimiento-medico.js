// ====== DATOS DEL TRABAJADOR Y RECONOCIMIENTO MÉDICO ======
const TALLAS_N={camiseta:'Camiseta',pantalon:'Pantalón',chaqueta:'Chaqueta',calzado:'Calzado',guantes:'Guantes'};
/* Reconocimiento médico: OCULTO hasta que la empresa (DPO / prevención) lo autorice.
   Para volver a mostrarlo, poner RM_ACTIVO=true. Los datos que hubiera no se borran. */
const RM_ACTIVO=false;
const RM_N={apto:'Apto',apto_restr:'Apto con limitaciones',no_apto:'No apto',renuncia:'Renuncia firmada'};
function rmPlano(t){ if(!t.rm_resultado) return 'Sin datos'; return RM_N[t.rm_resultado]+(t.rm_fecha?' ('+fmtF(t.rm_fecha)+')':'')+(t.rm_proximo?' · próximo '+fmtF(t.rm_proximo):''); }
function rmTexto(t){
  if(!t.rm_resultado) return '<span style="color:var(--warn)">sin datos</span>';
  const cad=t.rm_proximo&&t.rm_proximo<hoyISO(), pronto=!cad&&t.rm_proximo&&t.rm_proximo<=sumaDias(hoyISO(),60);
  const cl=t.rm_resultado==='no_apto'?'bad':t.rm_resultado==='apto_restr'?'warn':cad?'bad':pronto?'warn':'ok';
  return `<span class="chip ${cl}">${esc(RM_N[t.rm_resultado])}</span><br><span class="small muted">${t.rm_fecha?fmtF(t.rm_fecha):''}${t.rm_proximo?' · próximo '+fmtF(t.rm_proximo)+(cad?' (caducado)':''):''}</span>${t.rm_limitacion?`<br><span class="small">${esc(t.rm_limitacion)}</span>`:''}`;
}
function avisosFicha(F){
  const t=F.trabajador, a=[]; const info=F.docs.filter(d=>d.tipo==='info'&&d.tiene_firma).map(d=>d.fecha).sort()[0];
  const form=F.formaciones.filter(f=>f.tiene_firma).map(f=>f.fecha).sort()[0];
  if(!info) a.push('No tiene firmada la entrega de información de riesgos (F022).');
  else if(t.fecha_alta && info>t.fecha_alta) a.push(`La información de riesgos se firmó el ${fmtF(info)}, después del alta (${fmtF(t.fecha_alta)}).`);
  if(!form) a.push('No tiene firmada la formación práctica en el puesto.');
  else if(t.fecha_alta && form>sumaDias(t.fecha_alta,30)) a.push(`La formación en el puesto es del ${fmtF(form)}, más de un mes después del alta.`);
  if(RM_ACTIVO&&t.rm_resultado==='no_apto') a.push('Reconocimiento médico: NO APTO.');
  return a;
}
async function pantallaDatosTrab(t){
  pararVoz();
  view(barra('Datos del trabajador', `<button class="ib" id="bk">‹</button>`) + `<div class="wrap" id="w"></div>`);
  $('#bk').onclick=()=>pantallaFicha(t.id);
  const tl=t.tallas||{};
  $('#w').innerHTML=`<div class="card"><b>${esc(t.nombre)}</b><div class="small muted">Solo lo ves tú.</div></div>
   <div class="card"><b>Identificación</b>
    <div class="row"><div class="grow"><label class="f">DNI / NIE</label><input class="inp" id="t_dni" value="${esc(t.dni||'')}" autocapitalize="characters"></div><div class="grow"><label class="f">Puesto de trabajo</label><input class="inp" id="t_pue" value="${esc(t.puesto_propio||'')}" placeholder="${esc(t.categoria||'')}"></div></div>
    <div class="row"><div class="grow"><label class="f">Fecha de alta</label><input class="inp" type="date" id="t_alta" value="${esc(t.fecha_alta||'')}"></div><div class="grow"><label class="f">Fecha de baja</label><input class="inp" type="date" id="t_baja" value="${esc(t.fecha_baja||'')}"></div></div>
    <label class="f">Motivo de baja (si ya no trabaja aquí)</label><select class="inp" id="t_mot"><option value="">— No aplica —</option>${MOTIVOS_BAJA.map(m=>`<option ${t.motivo_baja===m?'selected':''}>${esc(m)}</option>`).join('')}</select>
    <label class="f">Idioma que mejor entiende</label><input class="inp" id="t_idi" list="idiomas" value="${esc(t.idioma||'')}"><datalist id="idiomas">${['Castellano','Árabe','Francés','Inglés','Rumano','Portugués','Bambara','Wolof','Ucraniano'].map(i=>`<option value="${i}">`).join('')}</datalist></div>
   <div class="card"><b>Contacto</b>
    <label class="f">Teléfono del trabajador</label><input class="inp" type="tel" id="t_tel" value="${esc(t.telefono||'')}">
    <div class="row"><div class="grow"><label class="f">Contacto de emergencia (nombre)</label><input class="inp" id="t_en" value="${esc(t.emerg_nombre||'')}"></div><div class="grow"><label class="f">Teléfono de emergencia</label><input class="inp" type="tel" id="t_et" value="${esc(t.emerg_tel||'')}"></div></div></div>
   <div class="card"><b>Tallas</b><div class="row">${Object.entries(TALLAS_N).map(([k,n])=>`<div style="width:30%;min-width:90px"><label class="f">${n}</label><input class="inp tt" data-k="${k}" value="${esc(tl[k]||'')}"></div>`).join('')}</div></div>
   <div class="card"${RM_ACTIVO?'':' hidden'}><b>Reconocimiento médico</b><div class="small muted">Solo el resultado de aptitud y las fechas. Nunca diagnósticos ni el motivo de una limitación.</div>
    <label class="f">Resultado</label><select class="inp" id="t_rm"><option value="">— Sin datos —</option>${Object.entries(RM_N).map(([k,n])=>`<option value="${k}" ${t.rm_resultado===k?'selected':''}>${n}</option>`).join('')}</select>
    <div class="row"><div class="grow"><label class="f">Fecha del reconocimiento</label><input class="inp" type="date" id="t_rmf" value="${esc(t.rm_fecha||'')}"></div><div class="grow"><label class="f">Próximo reconocimiento</label><input class="inp" type="date" id="t_rmp" value="${esc(t.rm_proximo||'')}"></div></div>
    <div class="row" style="margin-top:6px"><button class="btn ghost" id="t_rm1">Próximo: +1 año</button></div>
    <div id="t_limw" ${t.rm_resultado==='apto_restr'?'':'hidden'}><label class="f">Limitación laboral (solo lo que afecta al trabajo)</label><input class="inp" id="t_lim" placeholder="ej. No manipular cargas de más de 15 kg" value="${esc(t.rm_limitacion||'')}"></div></div>
   <button class="btn big" id="t_save">Guardar</button>`;
  $('#t_rm').onchange=()=>{ $('#t_limw').hidden=$('#t_rm').value!=='apto_restr'; };
  $('#t_rm1').onclick=()=>{ const f=$('#t_rmf').value; if(!f){ toast('Pon antes la fecha del reconocimiento',true); return; } const d=new Date(f+'T12:00:00'); d.setFullYear(d.getFullYear()+1); $('#t_rmp').value=d.toISOString().slice(0,10); };
  $('#t_save').onclick=async e=>{ const b=e.currentTarget; busy(b,true);
    const tallas={}; document.querySelectorAll('.tt').forEach(i=>{ if(i.value.trim()) tallas[i.dataset.k]=i.value.trim(); });
    const p={dni:$('#t_dni').value,puesto:$('#t_pue').value,fecha_alta:$('#t_alta').value,fecha_baja:$('#t_baja').value,motivo_baja:$('#t_mot').value,idioma:$('#t_idi').value,telefono:$('#t_tel').value,
      emerg_nombre:$('#t_en').value,emerg_tel:$('#t_et').value,tallas,rm_resultado:$('#t_rm').value,rm_fecha:$('#t_rmf').value,rm_proximo:$('#t_rmp').value,rm_limitacion:$('#t_rm').value==='apto_restr'?$('#t_lim').value:''};
    try{ await rpc('prl_trab_datos_guardar',{p_tok:S.tok,p_id:t.id,p}); toast('Guardado'); pantallaFicha(t.id); }catch(err){ busy(b,false); toast(err.message,true); } };
}

inicio();

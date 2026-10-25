// ====== ADMIN: editor de contenido (para nuevos años) ======
function pantallaEditor(mes, tb){
  pararVoz();
  tb = tb || {};
  view(barra(`${tb.compromiso?'Editar':'Añadir'} Toolbox · ${MESES[mes-1]} ${S.anio}`, `<button class="ib" id="bk">‹</button>`) + `<div class="wrap"><div class="card">
    <p class="small muted" style="margin-top:0">Copia el texto del Word del Toolbox. Una línea por cada punto.</p>
    <label class="f">Compromiso (título en azul)</label><textarea class="inp" id="e_c" style="min-height:60px">${esc(tb.compromiso)}</textarea>
    <label class="f">Texto</label><textarea class="inp" id="e_b" style="min-height:140px">${esc(tb.cuerpo)}</textarea>
    <label class="f">Puntos para discusión (uno por línea)</label><textarea class="inp" id="e_p">${esc((tb.puntos||[]).join('\n'))}</textarea>
    <label class="f">Tema del recuadro</label><input class="inp" id="e_t" value="${esc(tb.tema)}">
    <label class="f">Introducción del recuadro (opcional)</label><textarea class="inp" id="e_i" style="min-height:60px">${esc(tb.tema_intro)}</textarea>
    <label class="f">Puntos del recuadro (uno por línea)</label><textarea class="inp" id="e_tp" style="min-height:140px">${esc((tb.tema_puntos||[]).join('\n'))}</textarea>
    <label class="f">Foto</label>${tb.imagen?`<img src="${tb.imagen}" class="hero" id="e_prev" style="margin-bottom:8px">`:'<img class="hero" id="e_prev" style="display:none;margin-bottom:8px">'}
    <input type="file" accept="image/*" id="e_img">
    <button class="btn" id="e_save" style="margin-top:16px;width:100%">Guardar</button></div></div>`);
  $('#bk').onclick=()=> tb.compromiso? pantallaMes(mes) : pantallaAnio();
  let img; // undefined = no cambia
  $('#e_img').onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=()=>{ const im=new Image(); im.onload=()=>{
      const k=Math.min(1,640/im.width), c=document.createElement('canvas'); c.width=Math.round(im.width*k); c.height=Math.round(im.height*k);
      c.getContext('2d').drawImage(im,0,0,c.width,c.height); img=c.toDataURL('image/jpeg',.72); $('#e_prev').src=img; $('#e_prev').style.display='block';
    }; im.src=r.result; }; r.readAsDataURL(f);
  };
  const lines = s => s.split('\n').map(x=>x.replace(/^[\s•·\-–]+/,'').trim()).filter(Boolean);
  $('#e_save').onclick=async e=>{
    const p={anio:S.anio, mes, compromiso:$('#e_c').value.trim().replace(/\s*\n\s*/g,' '), cuerpo:$('#e_b').value.trim(), puntos:lines($('#e_p').value),
      tema:$('#e_t').value.trim(), tema_intro:$('#e_i').value.trim(), tema_puntos:lines($('#e_tp').value)};
    if(img!==undefined) p.imagen=img;
    if(!p.compromiso){ toast('Falta el compromiso',true); return; }
    const b=e.currentTarget; busy(b,true);
    try{ await rpc('prl_toolbox_guardar',{p_tok:S.tok,p}); toast('Guardado'); pantallaMes(mes,'contenido'); }
    catch(err){ busy(b,false); toast(err.message,true); }
  };
}

// ====== ADMIN: ajustes ======
async function pantallaAjustes(){
  pararVoz();
  view(barra('Ajustes', `<button class="ib" id="bk">‹</button>`) + `<div class="wrap" id="w"><div class="empty"><span class="spin dk"></span></div></div>`);
  $('#bk').onclick=()=> S.seccion==='docs' ? pantallaDocumentos() : S.seccion==='form' ? pantallaFormaciones() : (S.mes && S.data ? pantallaMes(S.mes) : pantallaAnio());
  try{ S.cfg = await rpc('prl_config_leer',{p_tok:S.tok}); }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  const c=S.cfg;
  $('#w').innerHTML=`<div class="card"><b>Valores por defecto</b><div class="small muted">Se ponen solos en cada mes nuevo.</div>
    <label class="f">Centro de trabajo / lugar</label><input class="inp" id="c_cen" value="${esc(c.centro)}">
    <label class="f">Formador</label><input class="inp" id="c_for" value="${esc(c.formador||S.yo.nombre)}">
    <label class="f">Duración Toolbox (min)</label><input class="inp" type="number" min="1" id="c_dur" value="${esc(c.duracion)}">
    <label class="f">Dirección de servicio (formación en el puesto)</label><input class="inp" id="c_dir" value="${esc(c.direccion||c.centro)}">
    <button class="btn" id="c_save" style="margin-top:14px;width:100%">Guardar</button></div>
    <div class="card"><b>Firma del formador</b><div class="small muted">Se pone sola en la casilla FIRMA de cada PDF.</div>
    <div style="margin:12px 0;min-height:70px;display:flex;align-items:center;justify-content:center;background:#f6f7fa;border-radius:12px">${c.firma_formador?`<img src="${c.firma_formador}" style="max-height:80px">`:'<span class="muted small">Sin firma</span>'}</div>
    <button class="btn sec" id="c_sig" style="width:100%">${c.firma_formador?'Cambiar firma':'Añadir firma'}</button></div>
    <div class="card"><b>Firma del responsable de centro</b><div class="small muted">Para la casilla FIRMA RESP. CENTRO de la formación en el puesto. Puede firmar aquí o puedes subir una foto de su firma.</div>
    <div style="margin:12px 0;min-height:70px;display:flex;align-items:center;justify-content:center;background:#f6f7fa;border-radius:12px">${c.firma_resp?`<img src="${c.firma_resp}" style="max-height:80px">`:'<span class="muted small">Sin firma</span>'}</div>
    <div class="row"><button class="btn sec grow" id="c_rsig">Firmar aquí</button><label class="btn sec grow" style="cursor:pointer">Subir foto<input type="file" accept="image/*" id="c_rimg" hidden></label>${c.firma_resp?'<button class="btn ghost" id="c_rdel">Quitar</button>':''}</div></div>
    <div class="card"><b>Documentos (EPI, información, botiquín)</b>
    <label class="f">Empresa</label><input class="inp" id="c_emp" value="${esc(c.empresa||'')}">
    <label class="f">Lugar (para “En …, a … de …”)</label><input class="inp" id="c_lug" value="${esc(c.lugar||'')}">
    <button class="btn sec" id="c_save2" style="margin-top:12px;width:100%">Guardar</button>
    <button class="btn sec" id="c_dni" style="margin-top:8px;width:100%">Trabajadores: DNI y puesto</button></div>
    <div class="card"><b>Firma y sello de la empresa</b><div class="small muted">Para las entregas de EPI y de información. Sube una foto o imagen del sello.</div>
    <div style="margin:12px 0;min-height:70px;display:flex;align-items:center;justify-content:center;background:#f6f7fa;border-radius:12px">${c.sello?`<img src="${c.sello}" style="max-height:90px">`:'<span class="muted small">Sin sello</span>'}</div>
    <div class="row"><label class="btn sec grow" style="cursor:pointer">Subir imagen<input type="file" accept="image/*" id="c_sello" hidden></label>${c.sello?'<button class="btn ghost" id="c_sdel">Quitar</button>':''}</div></div>
    <div class="card"><b>Responsable de prevención</b><div class="small muted">Al pulsar «Cerrar mes» se le envían solos por correo el PDF del Toolbox y el de las formaciones en el puesto de ese mes. Te llega una copia a ti.</div>
    <label class="f">Nombre</label><input class="inp" id="c_pnom" value="${esc(c.correo_prl_nombre||'')}" placeholder="Por ejemplo: Ana">
    <label class="f">Correo</label><input class="inp" type="email" inputmode="email" autocomplete="email" id="c_pcor" value="${esc(c.correo_prl||'')}" placeholder="prevencion@empresa.com">
    <div class="small muted" style="margin-top:4px">Si son varios, sepáralos con una coma (máximo 3).</div>
    <button class="btn sec" id="c_save3" style="margin-top:12px;width:100%">Guardar</button></div>
    <div class="card small muted">Sesión: ${esc(S.yo.nombre)} (la misma que en la app de limpieza)</div>`;
  $('#c_save').onclick=async e=>{
    const b=e.currentTarget; busy(b,true);
    try{ S.cfg=await rpc('prl_config_guardar',{p_tok:S.tok,p:{centro:$('#c_cen').value.trim(),formador:$('#c_for').value.trim(),duracion:$('#c_dur').value,direccion:$('#c_dir').value.trim()}}); toast('Guardado'); busy(b,false); }
    catch(err){ busy(b,false); toast(err.message,true); }
  };
  $('#c_sig').onclick=()=>hojaFirma('Tu firma de formador','',async png=>{ S.cfg=await rpc('prl_config_guardar',{p_tok:S.tok,p:{firma_formador:png}}); toast('Firma guardada'); pantallaAjustes(); });
  $('#c_rsig').onclick=()=>hojaFirma('Firma del responsable de centro','',async png=>{ S.cfg=await rpc('prl_config_guardar',{p_tok:S.tok,p:{firma_resp:png}}); toast('Firma guardada'); pantallaAjustes(); });
  if($('#c_rdel')) $('#c_rdel').onclick=async()=>{ try{ S.cfg=await rpc('prl_config_guardar',{p_tok:S.tok,p:{firma_resp:''}}); pantallaAjustes(); }catch(e){ toast(e.message,true); } };
  $('#c_save3').onclick=async e=>{ const b=e.currentTarget; busy(b,true);
    try{ S.cfg=await rpc('prl_config_guardar',{p_tok:S.tok,p:{correo_prl:$('#c_pcor').value.trim(),correo_prl_nombre:$('#c_pnom').value.trim()}}); toast(S.cfg.correo_prl?'Guardado. Se enviará al cerrar cada mes.':'Guardado'); }catch(err){ toast(err.message,true); } busy(b,false); };
  $('#c_save2').onclick=async e=>{ const b=e.currentTarget; busy(b,true); try{ S.cfg=await rpc('prl_config_guardar',{p_tok:S.tok,p:{empresa:$('#c_emp').value.trim(),lugar:$('#c_lug').value.trim()}}); toast('Guardado'); }catch(err){ toast(err.message,true); } busy(b,false); };
  $('#c_dni').onclick=pantallaTrabajadoresDNI;
  $('#c_sello').onchange=async e=>{ const f=e.target.files[0]; if(!f) return; try{ const png=await selloDeFoto(f); S.cfg=await rpc('prl_config_guardar',{p_tok:S.tok,p:{sello:png}}); toast('Sello guardado'); pantallaAjustes(); }catch(err){ toast(err.message,true); } };
  if($('#c_sdel')) $('#c_sdel').onclick=async()=>{ try{ S.cfg=await rpc('prl_config_guardar',{p_tok:S.tok,p:{sello:''}}); pantallaAjustes(); }catch(e){ toast(e.message,true); } };
  $('#c_rimg').onchange=async e=>{ const f=e.target.files[0]; if(!f) return;
    try{ const png=await firmaDeFoto(f); S.cfg=await rpc('prl_config_guardar',{p_tok:S.tok,p:{firma_resp:png}}); toast('Firma guardada'); pantallaAjustes(); }catch(err){ toast(err.message,true); } };
}

// ====== PDF (formato SH-CORP-FO-IB-031) ======
// Convierte una imagen por ruta (img/toolbox/...) en dataURL para el PDF
function aDataURL(src){ if(!src || /^data:/.test(src)) return Promise.resolve(src);
  return new Promise(res=>{ const i=new Image(); i.onload=()=>{ try{ const c=document.createElement('canvas'); c.width=i.naturalWidth; c.height=i.naturalHeight; c.getContext('2d').drawImage(i,0,0); res(c.toDataURL('image/jpeg',.85)); }catch(e){ res(null); } }; i.onerror=()=>res(null); i.src=src; }); }
function imgSize(src){ return new Promise(res=>{ const i=new Image(); i.onload=()=>res({w:i.naturalWidth,h:i.naturalHeight}); i.onerror=()=>res(null); i.src=src; }); }
async function construirPDF(){
  const { jsPDF } = window.jspdf;
  const d=S.data, tb=d.toolbox, s=sesionDe();
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const W=210, H=297, L=15, R=195, CW=R-L;
  const NAVY=[15,28,77], LBL=[0,51,102], BLUE=[0,112,192], GREY=[242,242,242], BORDER=[191,191,191], TXT=[30,30,30];
  const nombreMes = MESES[S.mes-1];
  const codigo = `SH-CORP-FO-IB-031 Toolbox Talk HSE_${nombreMes} ${String(S.anio).slice(2)}`;
  const FOOT_TOP = H-42;
  const ic = await imgSize(ICONOS), lg = await imgSize(LOGO);
  const sizes = {};
  for(const f of d.firmas){ if(f.firma) sizes[f.id]=await imgSize(f.firma); }
  const formSig = S.cfg.firma_formador ? await imgSize(S.cfg.firma_formador) : null;
  const tbSrc = await aDataURL(tb.imagen); const tbImg = tbSrc ? await imgSize(tbSrc) : null;
  const fmt = src => /^data:image\/png/.test(src)?'PNG':'JPEG';
  const fit = (src, sz, x, y, w, h, align='center') => { if(!src||!sz) return; const k=Math.min(w/sz.w, h/sz.h); const iw=sz.w*k, ih=sz.h*k; const ox = align==='left'?0:(w-iw)/2; doc.addImage(src, fmt(src), x+ox, y+(h-ih)/2, iw, ih); };
  const color = c => doc.setTextColor(c[0],c[1],c[2]);

  function cabecera(){
    doc.setFont('helvetica','bold'); doc.setFontSize(14); color(NAVY);
    doc.text('TOOLBOX TALK / TEAMBOARD / REUNIÓN PERIÓDICA', W/2, 17, {align:'center'});
    doc.text('HSE', W/2, 22.5, {align:'center'});
    doc.setFillColor(GREY[0],GREY[1],GREY[2]); doc.rect(L+10, 26, CW-20, 4, 'F');
    return 36;
  }
  function pie(){
    if(ic) { const w=150, h=w*ic.h/ic.w; doc.addImage(ICONOS,'JPEG',(W-w)/2,FOOT_TOP+2,w,h); }
    doc.setFontSize(6.3); color(TXT);
    const lines=[
      [['Todos los asistentes que firman el presente documento han participado en la actividad formativa (Toolbox Talk) indicada, la cual ha sido',0]],
      [['realizada durante la reunión mensual de ',0],['Team Board (TB)',1],['. En aquellos casos donde ',0],['no es de aplicación el TB',1],[', la actividad formativa se',0]],
      [['ha realizado durante las ',0],['reuniones periódicas de Seguridad y Salud o Medioambiente',1],['.',0]]
    ];
    let y=H-21;
    for(const ln of lines){
      let tw=0; for(const [t,b] of ln){ doc.setFont('helvetica',b?'bold':'normal'); tw+=doc.getTextWidth(t); }
      let x=(W-tw)/2; for(const [t,b] of ln){ doc.setFont('helvetica',b?'bold':'normal'); doc.text(t,x,y); x+=doc.getTextWidth(t); }
      y+=2.9;
    }
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(0,112,192); doc.text('PEOPLE MAKE PLACES', L-5, H-8);
    color(TXT); doc.setFontSize(8); doc.text(String(doc.internal.getCurrentPageInfo().pageNumber), W/2, H-9, {align:'center'});
    doc.setFontSize(6.5); doc.text(codigo, R+5, H-6, {align:'right'});
    if(lg) doc.addImage(LOGO,'PNG',R-17,H-16.5,10,10*lg.h/lg.w);
  }
  // ---- Página 1
  let y=cabecera();
  doc.setFontSize(7.6);
  const lbl=(t,x,yy)=>{ doc.setFont('helvetica','bold'); color(LBL); doc.text(t,x,yy); return x+doc.getTextWidth(t)+2; };
  const val=(t,x,yy,maxW)=>{ doc.setFont('helvetica','normal'); color(TXT); doc.text(doc.splitTextToSize(String(t||''),maxW)[0]||'',x,yy); };
  let x=lbl('DENOMINACIÓN DE LA ACCIÓN FORMATIVA:',L+5,y); val(s.denominacion||('Toolbox Talk HSE '+nombreMes+' '+String(S.anio).slice(2)),x,y,128-x);
  x=lbl('FECHA:',132,y); val(fmtF(s.fecha)||('  /'+String(S.mes).padStart(2,'0')+'/'+String(S.anio).slice(2)),x+3,y,40);
  y+=4.3;
  x=lbl('CENTRO DE TRABAJO/LUGAR REALIZACIÓN:',L+5,y); val(s.centro||S.cfg.centro,x,y,128-x);
  x=lbl('DURACIÓN:',134,y); val((s.duracion||S.cfg.duracion||'')+'  MIN',x+3,y,40);
  y+=4.3;
  x=lbl('FORMADOR:',L+5,y); val(s.formador||S.cfg.formador||'',x,y,110);
  y+=6;
  lbl('FIRMA:',L+5,y+3.5);
  doc.setFillColor(GREY[0],GREY[1],GREY[2]); doc.rect(L+18,y-1,62,11,'F');
  fit(S.cfg.firma_formador, formSig, L+20, y-0.5, 58, 10);
  y+=15;

  // ---- Contenidos (se ajusta el tamaño de letra para que quepa en la página 1)
  const COLW_L=92, COLW_R=CW-COLW_L, P=3;
  const espacioMax = FOOT_TOP - y - 6 - 30 - 36; // cabecera contenidos + comentarios + 2 filas
  function medir(k, draw, y0){
    let yl=y0+P+1, yr=y0+P+1;
    const fsT=11*k, fsB=7.4*k, lh=fsB*0.42, lhT=fsT*0.43;
    // izquierda
    doc.setFont('helvetica','bold'); doc.setFontSize(fsT); doc.setTextColor(BLUE[0],BLUE[1],BLUE[2]);
    let ls=doc.splitTextToSize(tb.compromiso, COLW_L-2*P);
    if(draw) doc.text(ls, L+P, yl+lhT*0.8, {lineHeightFactor:1.15}); yl+=ls.length*lhT+3;
    doc.setFont('helvetica','normal'); doc.setFontSize(fsB); color(TXT);
    for(const par of (tb.cuerpo||'').split('\n').filter(Boolean)){ ls=doc.splitTextToSize(par, COLW_L-2*P); if(draw) doc.text(ls, L+P, yl+lh*0.8, {lineHeightFactor:1.15}); yl+=ls.length*lh+1.6; }
    if((tb.puntos||[]).length){
      yl+=1; doc.setFont('helvetica','bold'); if(draw) doc.text('Puntos para discusión:', L+P, yl+lh*0.8); yl+=lh+0.6; doc.setFont('helvetica','normal');
      for(const q of tb.puntos){ ls=doc.splitTextToSize(q, COLW_L-2*P); if(draw) doc.text(ls, L+P, yl+lh*0.8, {lineHeightFactor:1.15}); yl+=ls.length*lh+0.8; }
    }
    // derecha
    const xr=L+COLW_L+P, wr=COLW_R-2*P;
    if(tbSrc && tbImg){ const ih=Math.min(30*k, wr*tbImg.h/tbImg.w); if(draw) fit(tbSrc, tbImg, xr, yr, wr, ih, 'left'); yr+=ih+3; }
    if(tb.tema){ doc.setFont('helvetica','bold'); doc.setFontSize(fsT*0.95); doc.setTextColor(BLUE[0],BLUE[1],BLUE[2]); ls=doc.splitTextToSize(tb.tema, wr); if(draw) doc.text(ls, xr, yr+lhT*0.8, {lineHeightFactor:1.15}); yr+=ls.length*lhT+2.5; }
    doc.setFont('helvetica','normal'); doc.setFontSize(fsB); color(TXT);
    for(const par of (tb.tema_intro||'').split('\n').filter(Boolean)){ ls=doc.splitTextToSize(par, wr); if(draw) doc.text(ls, xr, yr+lh*0.8, {lineHeightFactor:1.15}); yr+=ls.length*lh+1.4; }
    for(const it of (tb.tema_puntos||[])){ ls=doc.splitTextToSize(it, wr-3.5); if(draw){ doc.text('•', xr, yr+lh*0.8); doc.text(ls, xr+3.5, yr+lh*0.8, {lineHeightFactor:1.15}); } yr+=ls.length*lh+0.9; }
    return Math.max(yl,yr)-y0+P;
  }
  let k=1, hC=medir(k,false,y);
  while(hC>espacioMax && k>0.7){ k-=0.03; hC=medir(k,false,y); }
  // cabecera CONTENIDOS
  doc.setDrawColor(BORDER[0],BORDER[1],BORDER[2]); doc.setLineWidth(0.25);
  doc.rect(L,y,CW,6); doc.setFont('helvetica','bold'); doc.setFontSize(8); color(LBL); doc.text('CONTENIDOS', L+2.5, y+4.2);
  y+=6;
  doc.rect(L,y,COLW_L,hC); doc.rect(L+COLW_L,y,COLW_R,hC);
  medir(k,true,y);
  y+=hC+5;

  // ---- Comentarios / observaciones
  doc.setFillColor(GREY[0],GREY[1],GREY[2]); doc.rect(L,y,CW,5,'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(8); color(LBL); doc.text('Comentarios adicionales / Observaciones', L+2, y+3.6);
  y+=5;
  doc.setFont('helvetica','normal'); doc.setFontSize(7.6); color(TXT);
  const obs = doc.splitTextToSize(s.observaciones||'', CW-6);
  const hObs = Math.max(14, obs.length*3.4+5);
  doc.rect(L,y,CW,hObs); if(obs.length) doc.text(obs, L+3, y+4.5, {lineHeightFactor:1.3});
  y+=hObs+6;

  // ---- Asistentes
  const CN=88, CP=52, CF=CW-CN-CP, RH=13;
  function cabTabla(){
    doc.setFillColor(GREY[0],GREY[1],GREY[2]); doc.rect(L,y,CW,9,'F'); doc.setDrawColor(BORDER[0],BORDER[1],BORDER[2]);
    doc.rect(L,y,CN,9); doc.rect(L+CN,y,CP,9); doc.rect(L+CN+CP,y,CF,9); doc.line(L,y+4.6,L+CN,y+4.6);
    color(LBL); doc.setFont('helvetica','bold'); doc.setFontSize(7.4);
    doc.text('DATOS DE LOS ASISTENTES', L+CN/2, y+3.4, {align:'center'});
    doc.setFont('helvetica','normal'); doc.text('NOMBRE Y APELLIDOS', L+CN/2, y+7.8, {align:'center'});
    doc.setFont('helvetica','bold'); doc.text('PUESTO DE TRABAJO', L+CN+CP/2, y+5.6, {align:'center'}); doc.text('FIRMA', L+CN+CP+CF/2, y+5.6, {align:'center'});
    y+=9;
  }
  const firmas = d.firmas.filter(f=>f.firma).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  const filas = firmas.length ? firmas : [null,null];
  if(y+9+RH > FOOT_TOP){ pie(); doc.addPage(); y=cabecera(); }
  cabTabla();
  for(const f of filas){
    if(y+RH > FOOT_TOP){ pie(); doc.addPage(); y=cabecera(); cabTabla(); }
    doc.setDrawColor(BORDER[0],BORDER[1],BORDER[2]); doc.rect(L,y,CN,RH); doc.rect(L+CN,y,CP,RH); doc.rect(L+CN+CP,y,CF,RH);
    if(f){
      doc.setFont('helvetica','normal'); doc.setFontSize(8.4); color(TXT);
      doc.text(doc.splitTextToSize(f.nombre, CN-6)[0], L+3, y+RH/2+1.3);
      doc.setFontSize(7.6); doc.text(doc.splitTextToSize(f.puesto||'', CP-4)[0]||'', L+CN+2.5, y+RH/2+1.2);
      fit(f.firma, sizes[f.id], L+CN+CP+2, y+0.8, CF-4, RH-4.2);
      doc.setFontSize(4.8); doc.setTextColor(120,120,120); doc.text('Firmado digitalmente '+fmtFH(f.firmado_en), L+CN+CP+CF/2, y+RH-0.9, {align:'center'});
    }
    y+=RH;
  }
  pie();
  return { doc, nombre: codigo + '.pdf' };
}
async function descargarPDF(btn){
  busy(btn,true);
  try{
    if(!window.jspdf) throw new Error('No se ha podido cargar el generador de PDF. Revisa la conexión.');
    const { doc, nombre } = await construirPDF();
    const blob = doc.output('blob');
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


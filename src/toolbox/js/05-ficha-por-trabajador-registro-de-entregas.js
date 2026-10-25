// ====== FICHA POR TRABAJADOR (registro de entregas de EPI y ropa para inspección) ======
// Motivo para el resumen (no se muestra «Primera entrega», que es lo normal)
const motivoExtra=v=>{ const t=motivoTxt(v); return t&&t!=='Primera entrega'?t:null; };
// Historial: cada entrega con sus equipos y motivos
const motivosDoc=d=>{ const x=d.datos||{}; const its=x.items||{}; const a=EPI_ITEMS.filter(i=>its[i[0]]).map(i=>i[1].replace(/\s*\(.*\)$/,'')+(motivoTxt(its[i[0]])?' ('+motivoTxt(its[i[0]])+')':''));
  (x.otros||[]).filter(o=>o&&o.t).forEach(o=>a.push(o.t+(motivoTxt(o)?' ('+motivoTxt(o)+')':''))); return a; };
function resumenEntregas(docs){
  const m={};
  const add=(clave,etq,u,fecha,extra)=>{ const r=m[clave]||(m[clave]={etq,u:0,veces:0,ult:null,primera:null,extra:new Set()}); r.u+=(+u||1); r.veces++; if(!r.ult||fecha>r.ult) r.ult=fecha; if(!r.primera||fecha<r.primera) r.primera=fecha; (extra||[]).forEach(e=>e&&r.extra.add(e)); };
  for(const d of docs){ if(!d.tiene_firma) continue; const x=d.datos||{};
    if(d.tipo==='epi'){ for(const it of EPI_ITEMS){ const v=(x.items||{})[it[0]]; if(v) add('e_'+it[0],it[1],v.u,d.fecha,[...(v.cat||[]),motivoExtra(v)]); } (x.otros||[]).forEach(o=>{ if(o&&o.t) add('o_'+o.t.toLowerCase(),o.t,o.u,d.fecha,[motivoExtra(o)]); }); }
    if(d.tipo==='epi_col'){ for(const it of COL_ITEMS){ const v=(x.items||{})[it[0]]; if(v) add('c_'+it[0],it[1]+' (uso colectivo)',1,d.fecha,v.serie?['nº '+v.serie]:[]); } if(x.otros) add('co_'+x.otros.toLowerCase(),x.otros+' (uso colectivo)',1,d.fecha); }
  }
  return Object.values(m).sort((a,b)=>b.ult.localeCompare(a.ult)||a.etq.localeCompare(b.etq));
}
async function pantallaFichas(){
  pararVoz();
  view(barra('Fichas por trabajador', `<button class="ib" id="bk">‹</button>`) + `<div class="wrap" id="w"><div class="empty"><span class="spin dk"></span></div></div>`);
  $('#bk').onclick=pantallaDocumentos;
  let L; try{ L=await rpc('prl_fichas',{p_tok:S.tok}); }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  $('#w').innerHTML=`<p class="small muted" style="margin-top:0">Todo lo entregado y firmado por cada trabajador. Desde su ficha puedes sacar el expediente completo en PDF para una inspección.</p><div class="card">`+
    L.map(t=>`<div class="li" data-t="${esc(t.id)}" style="cursor:pointer"><span class="dot ${t.epis?'ok':''}"></span><span class="grow"><span class="nm">${esc(t.nombre)}</span>${t.activo?'':' <span class="chip">de baja</span>'}<br>
      <span class="small muted">${t.epis?`${t.epis} entrega${t.epis>1?'s':''} de EPI · última ${fmtF(t.ult_epi)}`:'Sin entregas de EPI'}${t.dni?'':' · <span style="color:var(--warn)">sin DNI</span>'}</span></span>
      <span style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">${t.sin_firmar?`<span class="chip blue">${t.sin_firmar} sin firmar</span>`:''}${!t.info?'<span class="chip warn">sin info. PRL</span>':''}${!t.formacion?'<span class="chip warn">sin formación</span>':''}${t.caducados?`<span class="chip bad">${t.caducados} curso caducado</span>`:''}${!RM_ACTIVO?'':!t.rm_resultado?'<span class="chip warn">sin reconoc. médico</span>':t.rm_proximo&&t.rm_proximo<hoyISO()?'<span class="chip bad">reconoc. médico caducado</span>':''}${t.por_caducar?`<span class="chip warn">${t.por_caducar} caduca pronto</span>`:''}</span></div>`).join('')+`</div>`;
  document.querySelectorAll('[data-t]').forEach(el=>el.onclick=()=>pantallaFicha(el.dataset.t));
}
async function pantallaFicha(id){
  pararVoz();
  view(barra('Ficha del trabajador', `<button class="ib" id="bk">‹</button>`) + `<div class="wrap" id="w"><div class="empty"><span class="spin dk"></span></div></div>`);
  $('#bk').onclick=pantallaFichas;
  let F; try{ F=await rpc('prl_ficha',{p_tok:S.tok,p_trab:id}); }catch(e){ $('#w').innerHTML=`<div class="card">${esc(e.message)}</div>`; return; }
  const t=F.trabajador, res=resumenEntregas(F.docs);
  const hist=[...F.docs.map(d=>({f:d.fecha,k:'d',id:d.id,t:DOC_INFO[d.tipo].t,ok:d.tiene_firma,sub:d.tipo==='epi'||d.tipo==='epi_col'?resumenEntregas([{...d,tiene_firma:true}]).map(r=>r.etq.replace(/ \(.*\)$/,'')).join(', '):''})),
    ...F.formaciones.map(f=>({f:f.fecha,k:'f',id:f.id,t:'Formación práctica en el puesto',ok:f.tiene_firma,sub:(f.items||[]).map(n=>F_ITEMS[n]).join(', ')})),
    ...F.toolbox.map(b=>({f:(b.firmado_en||'').slice(0,10),k:'t',t:`Toolbox ${MESES[b.mes-1]} ${b.anio}`,ok:true,sub:b.tema||''}))].sort((a,b)=>b.f.localeCompare(a.f));
  $('#w').innerHTML=`<div class="card"><b style="font-size:19px">${esc(t.nombre)}</b>${t.activo?'':' <span class="chip">de baja</span>'}
      <div class="small muted" style="margin-top:4px">DNI: ${t.dni?esc(t.dni):'<span style="color:var(--warn)">sin poner</span>'} · ${esc(t.puesto||'')}</div>
      <div class="row" style="margin-top:12px"><button class="btn grow" id="exp">Expediente PDF</button><button class="btn sec grow" id="nepi">＋ Entrega de EPI</button></div></div>
    <div class="row" style="margin:20px 2px 8px"><div class="h2 grow" style="margin:0">Datos del trabajador</div><button class="btn ghost" id="edatos">Editar</button></div>
    <div class="card">
      <div class="li"><span class="grow small muted">Fecha de alta</span><b>${t.fecha_alta?fmtF(t.fecha_alta):'<span style="color:var(--warn)">sin poner</span>'}</b></div>
      ${t.fecha_baja?`<div class="li"><span class="grow small muted">Fecha de baja</span><b>${fmtF(t.fecha_baja)}</b></div>`:''}
      <div class="li"><span class="grow small muted">Teléfono</span><b>${esc(t.telefono||'—')}</b></div>
      <div class="li"><span class="grow small muted">Contacto de emergencia</span><b style="text-align:right">${t.emerg_nombre||t.emerg_tel?esc((t.emerg_nombre||'')+' '+(t.emerg_tel||'')):'—'}</b></div>
      <div class="li"><span class="grow small muted">Idioma</span><b>${esc(t.idioma||'—')}</b></div>
      <div class="li"><span class="grow small muted">Tallas</span><b style="text-align:right">${Object.entries(t.tallas||{}).filter(([k,v])=>v).map(([k,v])=>esc(TALLAS_N[k]||k)+' '+esc(v)).join(' · ')||'—'}</b></div>
      ${RM_ACTIVO?`<div class="li"><span class="grow small muted">Reconocimiento médico</span><span style="text-align:right">${rmTexto(t)}</span></div>`:''}
      ${avisosFicha(F).map(a=>`<div class="small" style="color:var(--warn);padding-top:8px"> ${a}</div>`).join('')}
    </div>
    <div class="row" style="margin:20px 2px 8px"><div class="h2 grow" style="margin:0">Formación y cursos</div><button class="btn ghost" id="ncurso">＋ Curso / certificado</button></div>
    <div class="card">${(F.certs||[]).map(c=>{ const [et,cl]=estadoCad(c); return `<div class="li" data-curso="${esc(c.id)}" style="cursor:pointer"><span class="dot ${cl==='ok'?'ok':''}"></span><span class="grow"><span class="nm">${esc(c.tipo)}</span>${c.titulo?`<br><span class="small">${esc(c.titulo)}</span>`:''}<br><span class="small muted">${c.fecha?fmtF(c.fecha):'sin fecha'}${c.entidad?' · '+esc(c.entidad):''}${c.caduca?' · caduca '+fmtF(c.caduca):''} · ${c.archivos.length?'Adjuntos: '+c.archivos.length:'<span style="color:var(--warn)">sin certificado</span>'}</span></span>${cl?`<span class="chip ${cl}">${et}</span>`:''}</div>`; }).join('')}
      ${F.formaciones.map(f=>`<div class="li" data-form="${esc(f.id)}" style="cursor:pointer"><span class="dot ${f.tiene_firma?'ok':''}"></span><span class="grow"><span class="nm">Formación práctica en el puesto</span><br><span class="small muted">${fmtF(f.fecha)}${f.impartida?' · '+esc(f.impartida):''} · ${(f.items||[]).map(n=>n).join(', ')}</span></span>${f.tiene_firma?(f.eval_eficaz===true?'<span class="chip ok">Eficaz</span>':f.eval_eficaz===false?'<span class="chip bad">No eficaz</span>':'<span class="chip">Sin evaluar</span>'):'<span class="chip blue">Sin firmar</span>'}</div>`).join('')}
      ${!(F.certs||[]).length&&!F.formaciones.length?'<div class="empty">Sin formaciones ni cursos todavía.</div>':''}</div>
    <div class="h2">EPI y ropa entregados</div>
    <div class="card">${res.length?res.map(r=>`<div class="li"><span class="grow"><span class="nm">${esc(r.etq)}</span>${r.extra.size?`<br><span class="small muted">${esc([...r.extra].join(', '))}</span>`:''}</span>
        <span style="text-align:right"><b>${r.u}</b> <span class="small muted">ud.</span><br><span class="small muted">última ${fmtF(r.ult)}</span></span></div>`).join(''):'<div class="empty">Todavía no hay entregas firmadas.</div>'}</div>
    <div class="h2">Historial</div>
    <div class="card">${hist.length?hist.map(h=>`<div class="li" ${h.k!=='t'?`data-k="${h.k}" data-id="${esc(h.id)}" style="cursor:pointer"`:''}><span class="dot ${h.ok?'ok':''}"></span><span class="grow"><span class="nm">${esc(h.t)}</span><br><span class="small muted">${fmtF(h.f)}${h.sub?' · '+esc(h.sub):''}</span></span>${h.ok?'':'<span class="chip blue">Sin firmar</span>'}</div>`).join(''):'<div class="empty">Nada todavía.</div>'}</div>`;
  document.querySelectorAll('[data-k]').forEach(el=>el.onclick=()=> el.dataset.k==='d'?pantallaDocDetalle(el.dataset.id):pantallaFormDetalle(el.dataset.id));
  $('#nepi').onclick=()=>pantallaDocEditar('epi');
  $('#ncurso').onclick=()=>pantallaCurso(t.id,t.nombre);
  $('#edatos').onclick=()=>pantallaDatosTrab(t);
  document.querySelectorAll('[data-curso]').forEach(el=>el.onclick=()=>pantallaCurso(t.id,t.nombre,F.certs.find(c=>c.id===el.dataset.curso)));
  document.querySelectorAll('[data-form]').forEach(el=>el.onclick=()=>pantallaFormDetalle(el.dataset.form));
  $('#exp').onclick=e=>expedientePDF(F, e.currentTarget);
}
async function expedientePDF(F, btn){
  busy(btn,true);
  try{
    const PDFLib=await cargarPdfLib(); const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const cfg=await rpc('prl_config_leer',{p_tok:S.tok}); const t=F.trabajador;
    const out=await PDFDocument.create(); const font=await out.embedFont(StandardFonts.Helvetica), bold=await out.embedFont(StandardFonts.HelveticaBold);
    const NAVY=rgb(0.09,0.13,0.35), GRIS=rgb(0.45,0.45,0.45), LINEA=rgb(0.8,0.82,0.86);
    let pg, y; const W=595.28, H=841.89, L=50, R=545;
    const nueva=()=>{ pg=out.addPage([W,H]); y=60; };
    const cortar=(s,size,f,max)=>{ s=String(s??''); const words=s.split(' '); const lines=[]; let cur=''; for(const w of words){ const tst=cur?cur+' '+w:w; if(f.widthOfTextAtSize(tst,size)>max&&cur){ lines.push(cur); cur=w; } else cur=tst; } if(cur) lines.push(cur); return lines.length?lines:['']; };
    const t1=(s,x,size=10,f=font,c=rgb(0.1,0.1,0.1))=>pg.drawText(String(s??''),{x,y:H-y,size,font:f,color:c});
    const sitio=h=>{ if(y+h>H-50) nueva(); };
    nueva();
    pg.drawRectangle({x:0,y:H-90,width:W,height:90,color:NAVY});
    pg.drawText('REGISTRO DE ENTREGAS DE EPI Y DOCUMENTACIÓN PRL',{x:L,y:H-48,size:15,font:bold,color:rgb(1,1,1)});
    pg.drawText('Ficha del trabajador · generada el '+fmtFH(new Date().toISOString()),{x:L,y:H-68,size:9.5,font,color:rgb(0.85,0.88,0.95)});
    y=125; t1('Trabajador:',L,10,bold); t1(t.nombre,L+90,11,bold,NAVY); y+=18; t1('DNI / NIE:',L,10,bold); t1(t.dni||'—',L+90,10); y+=18; t1('Puesto:',L,10,bold); t1(t.puesto||'—',L+90,10);
    y+=18; t1('Empresa:',L,10,bold); t1(cfg.empresa||'',L+90,10); y+=18; t1('Centro:',L,10,bold); t1(cfg.centro||'',L+90,10);
    y+=18; t1('Fecha de alta:',L,10,bold); t1(t.fecha_alta?fmtF(t.fecha_alta):'—',L+90,10); if(t.fecha_baja){ t1('Fecha de baja:',L+230,10,bold); t1(fmtF(t.fecha_baja),L+320,10); }
    if(t.idioma){ y+=18; t1('Idioma:',L,10,bold); t1(t.idioma,L+90,10); }
    if(RM_ACTIVO){ y+=18; t1('Vigilancia salud:',L,10,bold); t1(rmPlano(t),L+90,10); }
    if(RM_ACTIVO&&t.rm_limitacion){ y+=16; t1('Limitación laboral: '+t.rm_limitacion,L+90,9,font,rgb(0.3,0.3,0.3)); }
    const tabla=(titulo,cab,xs,filas)=>{ y+=28; sitio(40); t1(titulo,L,12,bold,NAVY); y+=8; pg.drawLine({start:{x:L,y:H-y},end:{x:R,y:H-y},thickness:1,color:NAVY}); y+=14;
      cab.forEach((c,i)=>t1(c,xs[i],8.5,bold,GRIS)); y+=6;
      if(!filas.length){ y+=12; t1('Sin registros.',L,9.5,font,GRIS); return; }
      for(const f of filas){ const ls=f.map((c,i)=>cortar(c,9,font,(xs[i+1]||R)-xs[i]-8)); const h=Math.max(...ls.map(l=>l.length))*11+6; sitio(h+4);
        pg.drawLine({start:{x:L,y:H-y},end:{x:R,y:H-y},thickness:0.5,color:LINEA}); y+=12;
        ls.forEach((l,i)=>l.forEach((s,j)=>pg.drawText(s,{x:xs[i],y:H-(y+j*11),size:9,font,color:rgb(0.1,0.1,0.1)}))); y+=h-12; } };
    const res=resumenEntregas(F.docs);
    tabla('Resumen de EPI y ropa entregados',['Equipo / prenda','Uds. total','Entregas','Primera','Última'],[L,330,390,440,495],
      res.map(r=>[r.etq+(r.extra.size?' ('+[...r.extra].join(', ')+')':''),String(r.u),String(r.veces),fmtF(r.primera),fmtF(r.ult)]));
    tabla('Formación y cursos',['Curso','Fecha','Horas','Caduca','Estado'],[L,300,360,400,460],
      [...(F.certs||[]).map(c=>[c.tipo+(c.titulo?' · '+c.titulo:'')+(c.entidad?' ('+c.entidad+')':''),c.fecha?fmtF(c.fecha):'—',c.horas?String(c.horas):'—',c.caduca?fmtF(c.caduca):'—',estadoCad(c)[0]+(c.archivos.length?' · certificado adjunto':'')]),
       ...F.formaciones.map(f=>['Formación práctica en el puesto (F40R304)'+(f.impartida?' · '+f.impartida:''),fmtF(f.fecha),f.duracion||'—','—',f.tiene_firma?(f.eval_eficaz===true?'Firmada · eficaz':f.eval_eficaz===false?'Firmada · no eficaz':'Firmada'):'Pendiente de firma'])]);
    const hist=[...F.docs.map(d=>[d.fecha,DOC_INFO[d.tipo].c.replace('SH-CORP-SP-',''),DOC_INFO[d.tipo].t+(d.tipo.startsWith('epi')?': '+(d.tipo==='epi'?motivosDoc(d).join(', '):resumenEntregas([{...d,tiene_firma:true}]).map(r=>r.etq.replace(/ \(.*\)$/,'')).join(', ')):''),d.tiene_firma?'Firmado '+fmtFH(d.firmado_en):'PENDIENTE DE FIRMA']),
      ...F.formaciones.map(f=>[f.fecha,'F40R304','Formación práctica en el puesto'+((f.items||[]).length?': '+(f.items||[]).map(n=>n).join(', '):'')+(f.eval_eficaz===true?' · eficaz':f.eval_eficaz===false?' · no eficaz':''),f.tiene_firma?'Firmado '+fmtFH(f.firmado_en):'PENDIENTE DE FIRMA']),
      ...F.toolbox.map(b=>[(b.firmado_en||'').slice(0,10),'FO-IB-031','Toolbox Talk '+MESES[b.mes-1]+' '+b.anio+(b.tema?': '+b.tema:''),'Firmado '+fmtFH(b.firmado_en)])].sort((a,b)=>b[0].localeCompare(a[0]));
    tabla('Historial de documentos',['Fecha','Documento','Contenido','Estado'],[L,105,170,440],hist.map(h=>[fmtF(h[0]),h[1],h[2],h[3]]));
    y+=24; sitio(40); pg.drawText('A continuación se adjuntan los documentos firmados digitalmente por el trabajador y los certificados de sus cursos.',{x:L,y:H-y,size:9,font,color:GRIS});
    // documentos firmados
    const ids=F.docs.filter(d=>d.tiene_firma).map(d=>d.id), fids=F.formaciones.filter(f=>f.tiene_firma).map(f=>f.id);
    const [docs,forms]=await Promise.all([ids.length?rpc('prl_doc_varios',{p_tok:S.tok,p_ids:ids}):[], fids.length?rpc('prl_form_firmas',{p_tok:S.tok,p_ids:fids}):[]]);
    const pl={}; const getP=async u=>!u?null:pl[u]||(pl[u]=await fetch(u).then(r=>{ if(!r.ok) throw new Error('No se encuentra la plantilla'); return r.arrayBuffer(); }));
    const pegar=async d=>(await out.copyPages(d,d.getPageIndices())).forEach(p=>out.addPage(p));
    const cols=docs.filter(d=>d.tipo==='epi_col'); for(let i=0;i<cols.length;i+=4){ const g=cols.slice(i,i+4); await pegar(await rellenarDoc(PDFLib, await getP(DOC_INFO.epi_col.pdf), g[0], cfg, g)); }
    for(const d of docs.filter(d=>d.tipo!=='epi_col')) await pegar(await rellenarDoc(PDFLib, await getP(DOC_INFO[d.tipo].pdf), d, cfg));
    for(const f of forms) await pegar(await rellenarF40(PDFLib, await getP(PLANTILLA_F40), f, cfg));
    await anexarCertificados(PDFLib, out, F, font, bold);
    const nombre=`Expediente PRL ${t.nombre}.pdf`;
    const blob=new Blob([await out.save()],{type:'application/pdf'}); const file=new File([blob],nombre,{type:'application/pdf'});
    if(navigator.canShare && navigator.canShare({files:[file]}) && /Android|iPhone|iPad/i.test(navigator.userAgent)){ try{ await navigator.share({files:[file],title:nombre}); }catch(e){ if(e.name!=='AbortError') throw e; } }
    else { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=nombre; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},4000); }
  }catch(e){ toast(e.message,true); }
  busy(btn,false);
}

// ====== CURSOS Y CERTIFICADOS (grúa, PEMP, carretilla…) ======
const CURSOS = ['Carretilla elevadora','Plataforma elevadora (PEMP)','Puente grúa','Grúa móvil / autocargante','Trabajos en altura','Espacios confinados','Riesgo eléctrico',
  'PRL nivel básico (60 h)','PRL 20 h / 6 h oficio (TPC)','Primeros auxilios','Extinción de incendios / emergencias','Manipulación de productos químicos','Manipulación manual de cargas','Otro'];
function estadoCad(c){ if(!c.caduca) return ['Sin caducidad','']; const hoy=hoyISO(); if(c.caduca<hoy) return ['Caducado','bad']; if(c.caduca<=sumaDias(hoy,60)) return ['Caduca pronto','warn']; return ['Vigente','ok']; }
function sumaDias(f,n){ const d=new Date(f+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function archivoADataURL(file){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onerror=()=>rej(new Error('No se ha podido leer el archivo'));
    if(file.type==='application/pdf'){ if(file.size>5.5e6) return rej(new Error('El PDF es demasiado grande (máx. 5 MB). Prueba a hacerle una foto.')); r.onload=()=>res(r.result); r.readAsDataURL(file); return; }
    if(!/^image\//.test(file.type)) return rej(new Error('Solo fotos o PDF'));
    r.onload=()=>{ const im=new Image(); im.onload=()=>{ const k=Math.min(1,1700/Math.max(im.width,im.height)); const c=document.createElement('canvas'); c.width=Math.round(im.width*k); c.height=Math.round(im.height*k);
      c.getContext('2d').drawImage(im,0,0,c.width,c.height); res(c.toDataURL('image/jpeg',.8)); }; im.onerror=()=>rej(new Error('No se ha podido leer la imagen')); im.src=r.result; };
    r.readAsDataURL(file); });
}
async function pantallaCurso(trab, nombreTrab, c){
  pararVoz(); const nuevo=!c; c=c||{archivos:[]};
  view(barra(nuevo?'Nuevo curso':'Curso', `<button class="ib" id="bk">‹</button>`) + `<div class="wrap" id="w"></div>`);
  $('#bk').onclick=()=>pantallaFicha(trab);
  const enLista=CURSOS.includes(c.tipo);
  $('#w').innerHTML=`<div class="card"><b>${esc(nombreTrab)}</b></div><div class="card">
    <label class="f">Tipo de curso</label><select class="inp" id="k_tipo">${CURSOS.map(k=>`<option ${(c.tipo===k||(!enLista&&c.tipo&&k==='Otro'))?'selected':''}>${esc(k)}</option>`).join('')}</select>
    <label class="f">Nombre del curso / detalle</label><input class="inp" id="k_tit" placeholder="ej. Operador de carretillas elevadoras" value="${esc(c.titulo||(!enLista?c.tipo||'':''))}">
    <label class="f">Entidad que lo imparte</label><input class="inp" id="k_ent" value="${esc(c.entidad||'')}">
    <div class="row"><div class="grow"><label class="f">Fecha del curso</label><input class="inp" type="date" id="k_fec" value="${esc(c.fecha||'')}"></div><div style="width:110px"><label class="f">Horas</label><input class="inp" type="number" min="0" step="0.5" id="k_hor" value="${esc(c.horas??'')}"></div></div>
    <label class="f">Caduca / renovar antes de</label><input class="inp" type="date" id="k_cad" value="${esc(c.caduca||'')}">
    <div class="row" style="margin-top:6px">${[1,3,5].map(n=>`<button class="btn ghost" data-anios="${n}">+${n} año${n>1?'s':''}</button>`).join('')}<span class="small muted">desde la fecha del curso</span></div>
    <label class="f">Notas</label><textarea class="inp" id="k_not">${esc(c.notas||'')}</textarea></div>
    ${nuevo?'':`<div class="card"><b>Certificado / diploma</b><div class="small muted">Foto o PDF. Se añade al expediente PDF del trabajador.</div>
      <div id="arch">${c.archivos.map(a=>`<div class="li"><span class="grow">${a.mime==='application/pdf'?'PDF':'Foto'} ${esc(a.nombre||'archivo')} <span class="small muted">${Math.round((a.tam||0)/1024)} KB</span></span><button class="btn ghost" data-ver="${esc(a.id)}">Ver</button><button class="btn ghost" data-qa="${esc(a.id)}">✕</button></div>`).join('')||'<div class="small muted" style="padding:8px 0">Sin archivos todavía.</div>'}</div>
      <label class="btn sec" style="cursor:pointer;width:100%;margin-top:8px">Adjuntar foto o PDF<input type="file" accept="image/*,application/pdf" id="k_file" hidden multiple></label></div>`}
    <div class="row"><button class="btn grow" id="k_save">${nuevo?'Guardar y adjuntar certificado':'Guardar'}</button>${nuevo?'':'<button class="btn bad" id="k_del">Borrar</button>'}</div>`;
  document.querySelectorAll('[data-anios]').forEach(b=>b.onclick=()=>{ const f=$('#k_fec').value; if(!f){ toast('Pon antes la fecha del curso',true); return; } const d=new Date(f+'T12:00:00'); d.setFullYear(d.getFullYear()+(+b.dataset.anios)); $('#k_cad').value=d.toISOString().slice(0,10); });
  $('#k_save').onclick=async e=>{ const b=e.currentTarget; busy(b,true);
    const p={trabajador:trab,tipo:$('#k_tipo').value,titulo:$('#k_tit').value,entidad:$('#k_ent').value,fecha:$('#k_fec').value,horas:$('#k_hor').value,caduca:$('#k_cad').value,notas:$('#k_not').value};
    if(!nuevo) p.id=c.id;
    try{ const r=await rpc('prl_cert_guardar',{p_tok:S.tok,p}); toast('Guardado'); pantallaCurso(trab,nombreTrab,r); }catch(err){ busy(b,false); toast(err.message,true); } };
  if(nuevo) return;
  $('#k_del').onclick=async()=>{ if(!confirm('¿Borrar este curso y sus archivos?')) return; try{ await rpc('prl_cert_borrar',{p_tok:S.tok,p_id:c.id}); toast('Borrado'); pantallaFicha(trab); }catch(e){ toast(e.message,true); } };
  $('#k_file').onchange=async e=>{ const files=[...e.target.files]; if(!files.length) return; const lab=e.target.parentNode; lab.style.opacity=.5;
    try{ for(const f of files){ const data=await archivoADataURL(f); await rpc('prl_cert_arch_add',{p_tok:S.tok,p_cert:c.id,p_nombre:f.name||'certificado',p_data:data}); }
      toast('Adjuntado'); const F=await rpc('prl_ficha',{p_tok:S.tok,p_trab:trab}); pantallaCurso(trab,nombreTrab,F.certs.find(x=>x.id===c.id)); }
    catch(err){ lab.style.opacity=1; toast(err.message,true); } };
  document.querySelectorAll('[data-qa]').forEach(b=>b.onclick=async()=>{ if(!confirm('¿Quitar este archivo?')) return; try{ await rpc('prl_cert_arch_borrar',{p_tok:S.tok,p_id:b.dataset.qa}); c.archivos=c.archivos.filter(a=>a.id!==b.dataset.qa); pantallaCurso(trab,nombreTrab,c); }catch(e){ toast(e.message,true); } });
  document.querySelectorAll('[data-ver]').forEach(b=>b.onclick=async()=>{ try{ const [a]=await rpc('prl_cert_arch_datos',{p_tok:S.tok,p_ids:[b.dataset.ver]});
    const bin=Uint8Array.from(atob(a.data.split(',')[1]),ch=>ch.charCodeAt(0)); const url=URL.createObjectURL(new Blob([bin],{type:a.mime})); window.open(url,'_blank'); setTimeout(()=>URL.revokeObjectURL(url),60000); }catch(e){ toast(e.message,true); } });
}
// Añade los certificados al final del expediente
async function anexarCertificados(PDFLib, out, F, font, bold){
  const certs=(F.certs||[]); const ids=certs.flatMap(c=>c.archivos.map(a=>a.id)); if(!ids.length) return;
  const datos=await rpc('prl_cert_arch_datos',{p_tok:S.tok,p_ids:ids}); const { rgb } = PDFLib;
  for(const c of certs){ for(const a of c.archivos){ const d=datos.find(x=>x.id===a.id); if(!d) continue;
    const bytes=Uint8Array.from(atob(d.data.split(',')[1]),ch=>ch.charCodeAt(0));
    if(d.mime==='application/pdf'){ try{ const src=await PDFLib.PDFDocument.load(bytes,{ignoreEncryption:true}); (await out.copyPages(src,src.getPageIndices())).forEach(p=>out.addPage(p)); }catch(e){ console.warn('PDF no anexado',e); } continue; }
    const im=d.mime==='image/png'?await out.embedPng(bytes):await out.embedJpg(bytes);
    const pg=out.addPage([595.28,841.89]); pg.drawText(`${c.tipo}${c.titulo?' · '+c.titulo:''}`.slice(0,90),{x:40,y:805,size:11,font:bold,color:rgb(0.09,0.13,0.35)});
    pg.drawText(`${F.trabajador.nombre}${c.fecha?' · '+fmtF(c.fecha):''}${c.caduca?' · caduca '+fmtF(c.caduca):''}`,{x:40,y:790,size:9,font,color:rgb(0.4,0.4,0.4)});
    const k=Math.min(515/im.width,730/im.height); pg.drawImage(im,{x:40+(515-im.width*k)/2,y:40+(730-im.height*k)/2,width:im.width*k,height:im.height*k}); } }
}



/* ===== MOVIMIENTOS ===== */
function almOptsArt(a,excl){const mk=l=>el("option",{value:l.id,text:l.nom+(a?" ("+fmtN(stockDe(a.id,l.id))+")":"")});const all=cat.almacenes.filter(l=>l.id!==excl);
  if(!a)return all.map(l=>[l.id,l.nom]);const si=new Set(almsDe(a).map(l=>l.id));const dn=all.filter(l=>si.has(l.id)),ot=all.filter(l=>!si.has(l.id));
  return(dn.length?[el("optgroup",{label:"Donde está este artículo"},dn.map(mk))]:[]).concat(ot.length?[el("optgroup",{label:"Otros almacenes"},ot.map(mk))]:[]);}
function almDefecto(){const d=draft.m,a=art(d.art);if(!a)return;const al=almsDe(a),ids=al.map(l=>l.id),pp=ppalDe(a);const prod=al.filter(l=>l.tipo==="produccion");
  if(d.tipo==="entrada")d.alm=pp;
  else if(d.tipo==="salida"){if(!(ids.includes(d.alm)&&stockDe(a.id,d.alm)>0)){const c=prod.find(l=>stockDe(a.id,l.id)>0)||al.find(l=>stockDe(a.id,l.id)>0);d.alm=c?c.id:pp;}}
  else if(d.tipo==="traslado"){d.alm=pp;const c=prod.find(l=>l.id!==pp)||al.find(l=>l.id!==pp);d.dest=c?c.id:"";}
  else if(!ids.includes(d.alm))d.alm=pp;}
function vMov(v){const d=draft.m;
  if(!cat.articulos.length||!cat.almacenes.length){v.appendChild(el("div",{class:"banner",text:"Añade al menos un almacén y un artículo en Catálogo para registrar movimientos."}));}
  if(!d.alm&&cat.almacenes[0])d.alm=cat.almacenes[0].id;
  const t=d.tipo;
  const calc=el("div",{class:"calc",id:"mCalc"});
  const fileI=el("input",{id:"mFoto",type:"file",accept:"image/*"});fileI.addEventListener("change",()=>{draft.mFile=fileI.files[0]||null;});
  const form=el("form",{},[
    el("div",{class:"seg",role:"group","aria-label":"Tipo de movimiento"},Object.entries(TIPOS).map(([k,l])=>el("button",{type:"button","aria-pressed":String(t===k),text:l,onclick:()=>{d.tipo=k;almDefecto();render(true);}}))),
    el("div",{class:"row"},[fld("Fecha",inp("mF",d.f,x=>d.f=x,{type:"date"})),fld("Artículo",sel("mArt",artOpts(),d.art,x=>{d.art=x;almDefecto();render(true);},"Elige artículo…"))]),
    el("div",{class:"row"},[fld(t==="traslado"?"Desde":"Almacén",sel("mAlm",almOptsArt(art(d.art)),d.alm,x=>{d.alm=x;if(d.dest===x)d.dest="";if(t==="traslado")render(true);else pintaCalc();})),
      t==="traslado"?fld("Hasta",sel("mDest",almOptsArt(art(d.art),d.alm),d.dest,x=>{d.dest=x;pintaCalc();},"Destino…")):null,
      fld(t==="ajuste"?"Cantidad contada":"Cantidad",inp("mCant",d.cant,x=>{d.cant=x;pintaCalc();},{inputmode:"decimal",class:"num",autocomplete:"off",placeholder:"0"}))]),
    t==="salida"?el("div",{class:"row"},[fld("Para (inyectora o nave, opcional)",sel("mMaq",paraOpts(),d.maq,x=>d.maq=x,"—"))]):null,
    t==="entrada"&&!window.SOLO_CONSULTA?(()=>{const fi=el("input",{type:"file",accept:"image/*",capture:"environment",style:"display:none",id:"mLeerAlb"});fi.addEventListener("change",()=>{const f=fi.files[0];fi.value="";leerAlbaranAlm(f);});
      return el("div",{style:"display:grid;gap:4px"},[fi,el("button",{type:"button",class:"btn sec",text:"📷 Leer albarán con la cámara",onclick:()=>fi.click()}),el("p",{class:"hint",style:"margin:0",text:"Haz la foto del albarán y la app rellena las entradas para que las revises."})]);})():null,
    t==="entrada"&&art(d.art)&&art(d.art).fam==="piston"?el("div",{class:"seg",role:"group","aria-label":"Pistones nuevos o recuperados"},[[false,"Nuevos"],[true,"Recuperados"]].map(([r,l])=>el("button",{type:"button","aria-pressed":String(!!d.pRec===r),text:l,onclick:()=>{d.pRec=r;render(true);}}))):null,
    t==="entrada"&&art(d.art)&&art(d.art).fam==="piston"?el("p",{class:"hint",style:"margin:0",text:d.pRec?"Precio de recuperado: "+(precioRecDe(art(d.art))?eur(precioRecDe(art(d.art)))+" cada uno":"sin poner (en la ficha del pistón)"):"Precio de nuevo: "+(precioDe(art(d.art))?eur(precioDe(art(d.art)))+" cada uno":"sin poner (en la ficha del pistón)")}):null,
    t==="entrada"?el("div",{class:"row"},[fld("Proveedor",sel("mProv",provOpts(),d.prov,x=>d.prov=x,"—")),fld("Nº albarán",inp("mAlb",d.alb,x=>d.alb=x,{autocomplete:"off"}))]):null,
    t==="entrada"&&assets?fld("Foto del albarán (hazla o elige una de la galería)",fileI):null,
    t==="entrada"&&draft.mFile?el("p",{class:"hint",text:"Foto elegida: "+draft.mFile.name}):null,
    fld("Nota",inp("mNota",d.nota,x=>d.nota=x,{autocomplete:"off",placeholder:t==="ajuste"?"Recuento físico":""})),
    calc,
    el("button",{type:"submit",class:"btn",id:"mBtn",text:"Guardar "+TIPOS[t].toLowerCase()})]);
  form.addEventListener("submit",e=>{e.preventDefault();guardarMov();});
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Registrar movimiento"})),el("div",{class:"bd"},form)]));
  pintaCalc();
  vHist(v);}
function pintaCalc(){const c=$("mCalc");if(!c)return;const d=draft.m,a=art(d.art),q=parseN(d.cant);c.textContent="";c.className="calc";
  if(!a||!d.alm){c.appendChild(el("span",{text:"Elige artículo y almacén"}));return;}
  const st=stockDe(a.id,d.alm),u=" "+a.ud;
  const par=(lbl,x)=>[el("span",{text:lbl}),el("b",{class:"num",text:fmtN(x)+u})];
  if(d.tipo==="ajuste"){const st=stockA(a.id,d.alm,d.f);par("Teórico en "+almN(d.alm)+(d.f&&d.f<hoy()?" el "+fmtF(d.f):""),st).forEach(n=>c.appendChild(n));if(isFinite(q)){const df=q-st;c.appendChild(el("span",{text:"Ajuste"}));c.appendChild(el("b",{class:"num",text:(df>=0?"+":"−")+fmtN(Math.abs(df))+u}));}return;}
  const nuevo=isFinite(q)?(d.tipo==="entrada"?st+q:st-q):null;
  par(almN(d.alm)+" ahora",st).forEach(n=>c.appendChild(n));
  if(nuevo!=null){par("Después",nuevo).forEach(n=>c.appendChild(n));if(nuevo<0){c.className="calc mal";}}
  if(d.tipo==="traslado"&&d.dest&&isFinite(q)){par(almN(d.dest)+" después",stockDe(a.id,d.dest)+q).forEach(n=>c.appendChild(n));}}
async function guardarMov(){const d=draft.m,a=art(d.art),q=parseN(d.cant);
  if(!db){toast("No se puede guardar en esta vista");return;}
  if(!a){toast("Elige un artículo");return;}if(!d.alm){toast("Elige un almacén");return;}if(!d.f){toast("Pon la fecha");return;}
  if(!isFinite(q)||(d.tipo!=="ajuste"&&q<=0)||q<0){toast("Escribe una cantidad válida");return;}
  if(d.tipo==="traslado"&&(!d.dest||d.dest===d.alm)){toast("Elige un almacén de destino distinto");return;}
  const rec={f:d.f,tipo:d.tipo,art:a.id,alm:d.alm,cant:q,nota:d.nota.trim()||null};
  if(d.tipo==="ajuste"){const st=stockA(a.id,d.alm,d.f);rec.cant=Math.round((q-st)*1000)/1000;rec.contado=q;rec.teorico=st;if(rec.cant===0){rec.nota=rec.nota||"Recuento sin diferencias";}}
  if(d.tipo==="traslado")rec.dest=d.dest;
  if(d.tipo==="salida")ponPara(rec,d.maq);
  if(d.tipo==="entrada"){if(d.prov)rec.prov=d.prov;if(d.alb.trim())rec.alb=d.alb.trim();if(a.fam==="piston"&&d.pRec)rec.rec=true;}
  const b=$("mBtn");if(b){b.disabled=true;b.textContent="Guardando…";}
  try{
    if(d.tipo==="entrada"&&draft.mFile&&assets){const blob=await comprimir(draft.mFile);const r=await assets.upload(blob);rec.foto=r.id;}
    await addMov(rec);
    if(d.tipo==="entrada"&&a.pedido){aplicarPedido(art(a.id),null);await saveCat();}
    toast(TIPOS[d.tipo]+" guardado: "+a.desc);
    Object.assign(d,{cant:"",nota:"",alb:""});draft.mFile=null;
  }catch(e){toast("No se pudo guardar: "+(e&&e.message||"error"));}
  render(true);}
function comprimir(file){return new Promise(res=>{const img=new Image(),u=URL.createObjectURL(file);
  img.onload=()=>{const k=Math.min(1,1600/Math.max(img.width,img.height)),cv=document.createElement("canvas");cv.width=Math.round(img.width*k);cv.height=Math.round(img.height*k);
    cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);URL.revokeObjectURL(u);
    /* WebP si el móvil lo sabe hacer (ocupa menos); si no, JPEG */cv.toBlob(b=>{if(b&&b.type==="image/webp")res(b);else cv.toBlob(j=>res(j||file),"image/jpeg",.72);},"image/webp",.72);};
  img.onerror=()=>{URL.revokeObjectURL(u);res(file);};img.src=u;});}
function vHist(v){const h=draft.hm;const ms=Object.keys(meses).filter(k=>meses[k].length).sort().reverse();
  if(!h.mes||!ms.includes(h.mes))h.mes=ms.includes(mesDe(hoy()))?mesDe(hoy()):(ms[0]||mesDe(hoy()));
  const list=(meses[h.mes]||[]).filter(m=>!h.tipo||m.tipo===h.tipo).slice().sort((x,y)=>(y.f+"|"+y.ts).localeCompare(x.f+"|"+x.ts));
  const card=el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Historial"}),
      el("div",{class:"der",style:"display:flex;gap:8px"},[sel("hMes",(ms.length?ms:[h.mes]).map(k=>[k,fmtMes(k)]),h.mes,x=>{h.mes=x;render(true);}),
        sel("hTipo",Object.entries(TIPOS),h.tipo,x=>{h.tipo=x;render(true);},"Todos")])]),
    list.length?el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Fecha"}),el("th",{text:"Artículo"}),el("th",{class:"r",text:"Cant."}),el("th",{text:"Dónde"}),el("th",{text:""})])),
      el("tbody",{},list.map(m=>{const a=art(m.art);return el("tr",{},[el("td",{class:"num",text:fmtF(m.f)}),
        el("td",{},[el("div",{text:a?a.desc:"(borrado)"}),el("div",{class:"sub",text:[TIPOS[m.tipo],m.tipo==="ajuste"&&m.contado!=null?"contado "+fmtN(m.contado):null,provN(m.prov),m.alb?"Alb. "+m.alb:null,m.nota].filter(Boolean).join(" · ")}),
          m.foto?el("img",{class:"thumb",src:fotoUrl(m.foto),alt:"Albarán",loading:"lazy",onclick:()=>lightbox(fotoUrl(m.foto))}):null]),
        el("td",{class:"r num",text:signo(m)+(a?" "+a.ud:"")}),el("td",{text:dondeTxt(m)}),
        el("td",{style:"white-space:nowrap"},[el("button",{type:"button",class:"btn txt peq","aria-label":"Modificar movimiento",text:"Modificar",onclick:()=>editMov(m)}),el("button",{type:"button",class:"btn txt peq","aria-label":"Borrar movimiento",text:"Borrar",onclick:()=>confirmar("¿Borrar este movimiento?",(TIPOS[m.tipo])+" de "+fmtN(Math.abs(m.cant))+" · "+(a?a.desc:"")+" del "+fmtF(m.f)+". El stock se recalcula."+txtBorraMov(m),"Borrar",async()=>{await borraMov(m);toast("Movimiento borrado");})})])]);}))])):el("div",{class:"empty",text:"Sin movimientos en "+fmtMes(h.mes)+"."})]);
  v.appendChild(card);}

/* ===== PISTONES ===== */
function todosPist(){const out=[];Object.keys(pistAnos).forEach(k=>pistAnos[k].forEach(p=>out.push(p)));return out.sort((a,b)=>(a.f+"|"+a.ts).localeCompare(b.f+"|"+b.ts));}
function pistArt(d){return artsActivos().find(a=>a.fam==="piston"&&a.diam===d);}
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1).toLowerCase():"";
const sumaDias=(f,n)=>{const d=new Date(f+"T12:00:00");d.setDate(d.getDate()+Math.round(n));return d.toISOString().slice(0,10);};
function ultimoConteo(artId){let f="";todosMov().forEach(m=>{if(m.art===artId&&m.tipo==="ajuste"&&m.contado!=null&&m.f>f)f=m.f;});return f;}
function almPara(maqId,artId){const m=cat.maquinas.find(x=>x.id===maqId);if(m&&m.nave){const ls=cat.almacenes.filter(a=>a.nave===m.nave||a.nom===m.nave||a.nom==="Almacén "+m.nave);const l=ls.find(a=>stockDe(artId,a.id)>0);if(l)return l.id;}return almDe(artId);}
function almDe(artId){let best="",mx=-Infinity;cat.almacenes.forEach(l=>{const s=stockDe(artId,l.id);if(s>mx){mx=s;best=l.id;}});return best||(cat.almacenes[0]||{}).id||"";}
function plazoDe(a){return (a&&plazoArt(a))||28;}
function almPist(){const ids=DIAM.map(pistArt).filter(Boolean).map(a=>a.id);const r=cat.almacenes.filter(l=>ids.some(id=>stockDe(id,l.id)));return r.length?r:cat.almacenes.slice(0,1);}
function statsPist(){const hy=hoy(),all=todosPist();const first=all.length?all[0].f:hy;const desde=sumaDias(hy,-60);const ini=first>desde?first:desde;const nd=Math.max(1,dias(ini,hy)+1);
  const out={};DIAM.forEach(d=>{const a=pistArt(d);const st=a?stockDe(a.id):0;const sal=all.filter(p=>p.diam===d&&p.f>=ini).reduce((s,p)=>s+(+p.cant||1),0);const dia=sal/nd;
    const uc=a?ultimoConteo(a.id):"";const desdeC=all.filter(p=>p.diam===d&&p.f>uc);
    const min=a?+a.min||0:0;
    out[d]={a,st,min,niv:!a?"na":nivel(a),mes:dia*30,cob:dia>0?st/dia:null,agot:dia>0?sumaDias(hy,st/dia):null,sug:dia>0?Math.ceil(dia*plazoDe(a)*1.5):null,uc,
      usados:desdeC.filter(p=>p.dest===DESTINOS[0]).reduce((s,p)=>s+(+p.cant||1),0),agarr:desdeC.filter(p=>p.dest===DESTINOS[1]).reduce((s,p)=>s+(+p.cant||1),0)};});
  return out;}
const NIVP={bad:"Crítico",warn:"Ajustado",ok:"OK",na:"—"};
/* ===== PISTONES USADOS: zona → seleccionar → para recuperar (MEYUSA) o cajón de chatarra =====
   Se guarda en cat.pusados.ev. Los cambios de pistón con destino «Zona de pistones usados» entran solos en «Sin seleccionar»
   desde el primer recuento. Cuentas: Z sin seleccionar, R para recuperar, M en MEYUSA, C cajón de chatarra. */
const PU_REC="MEYUSA",PU_B=[["Z","Sin seleccionar"],["R","Para recuperar"],["M","En "+PU_REC],["C","Cajón chatarra"]];
const puEv=()=>((cat.pusados&&cat.pusados.ev)||[]);
/* al recuperarlos, MEYUSA los rebaja al diámetro inferior. Sin destino = no se recuperan (van a chatarra) */
const PU_N=["Ø 60","Ø 70","Ø 80","Ø 90","Ø 100"];
/* a qué diámetros puede volver: cualquiera más pequeño (normalmente el inmediato inferior); el 100 esp solo a 90 esp */
const puOpc=d=>d==="Ø 100 esp"?["Ø 90 esp"]:PU_N.includes(d)?PU_N.slice(0,PU_N.indexOf(d)).reverse():[];
const puRecup=d=>puOpc(d)[0]||null;
const puFalta=d=>{const a=pistArt(d);if(!a)return"";const n=nivel(a);return n==="bad"?"bajo mín.":n==="warn"?"pedir":"";};
/* al enviar: primero el diámetro más grande de los que faltan; si no falta ninguno, uno menos */
const puOpcEnv=d=>{const o=puOpc(d);const f=o.filter(x=>puFalta(x));return f.length?[f[0]].concat(o.filter(x=>x!==f[0])):o;};
/* al recibir: primero lo que se pidió en el último envío de ese diámetro */
const puOpcRec=d=>{const o=puOpc(d);const e=puEv().filter(x=>x.t==="envio"&&x.a&&x.a[d]).sort((a,b)=>b.f.localeCompare(a.f)||b.ts-a.ts)[0];const p=e&&e.a[d];return p&&o.includes(p)?[p].concat(o.filter(x=>x!==p)):o;};
function puEstado(){const ev=puEv();const c0=ev.filter(e=>e.t==="cuenta").sort((a,b)=>a.f.localeCompare(b.f)||a.ts-b.ts)[0];if(!c0)return null;
  const S={};DIAM.forEach(d=>S[d]={Z:0,R:0,M:0,C:0});const add=(b,o,sg)=>Object.entries(o||{}).forEach(([d,n])=>{if(S[d])S[d][b]+=sg*(+n||0);});
  const cams=todosPist().filter(p=>p.dest===DESTINOS[0]&&(p.f>c0.f||(p.f===c0.f&&(+p.ts||0)>c0.ts))).map(p=>({t:"cambio",f:p.f,ts:+p.ts||0,d:p.diam,n:+p.cant||1}));
  ev.concat(cams).slice().sort((a,b)=>a.f.localeCompare(b.f)||(a.ts||0)-(b.ts||0)).forEach(e=>{
    if(e.t==="cuenta")PU_B.forEach(([b])=>{if(e.b&&e.b[b])DIAM.forEach(d=>{if(e.b[b][d]!=null)S[d][b]=+e.b[b][d]||0;});});
    else if(e.t==="cambio"){if(S[e.d])S[e.d].Z+=e.n;}
    else if(e.t==="clasif"){if(e.esp){add("Z",e.esp,-1);}else{add("Z",e.rec,-1);add("Z",e.des,-1);}add("R",e.rec,1);add("C",e.des,1);}
    else if(e.t==="envio"){add("R",e.c,-1);add("M",e.c,1);}
    else if(e.t==="recep"){add("M",e.ok,-1);add("M",e.mal,-1);add("C",e.mal,1);}
    else if(e.t==="chat"){add("C",e.c,-1);}});
  const tot={Z:0,R:0,M:0,C:0};DIAM.forEach(d=>PU_B.forEach(([b])=>tot[b]+=S[d][b]));return{S,tot,desde:c0.f};}
/* cambios de pistón que dicen haber dejado el usado en la zona desde la última retirada (o desde el primer recuento) */
function puCambiosZona(){const ev=puEv();const marca=ev.filter(e=>e.t==="cuenta"||(e.t==="clasif"&&e.esp)).sort((a,b)=>b.f.localeCompare(a.f)||b.ts-a.ts)[0];if(!marca)return[];
  return todosPist().filter(p=>p.dest===DESTINOS[0]&&(p.f>marca.f||(p.f===marca.f&&(+p.ts||0)>marca.ts))).sort((a,b)=>a.f.localeCompare(b.f)||(+a.ts||0)-(+b.ts||0));}
function puFaltasAno(){const y=hoy().slice(0,4);let n=0;puEv().forEach(e=>{if(e.t==="clasif"&&e.falta&&String(e.f).startsWith(y))Object.values(e.falta).forEach(x=>{if(x>0)n+=x;});});return n;}
function puUrge(E){const out=[];DIAM.forEach(d=>{const a=pistArt(d);if(!a)return;const n=nivel(a);if(n!=="bad"&&n!=="warn")return;
    const fuentes=DIAM.filter(src=>puOpc(src).includes(d)&&(E.S[src].Z+E.S[src].R)>0).map(src=>({src,u:E.S[src].Z+E.S[src].R}));if(fuentes.length)out.push({d,a,fuentes});});return out;}
async function puGuarda(e){e.id=uid();e.ts=Date.now();e.por=(window.yoNombre&&window.yoNombre())||"";const prev=cat.pusados;cat.pusados={ev:puEv().concat([e])};
  try{await saveCat();}catch(er){cat.pusados=prev;throw er;}render(true);}
/* formulario con una fila por diámetro y una o varias columnas de cantidades */
function puForm(titulo,intro,cols,extra,boton,onOk){const E=puEstado();const val={};cols.forEach(c=>val[c.k]={});
  const filas=DIAM.filter(d=>cols[0].mostrar?cols[0].mostrar(E,d):true);
  const tb=el("tbody",{},filas.map(d=>el("tr",{},[el("td",{},[el("b",{text:d}),null]),el("td",{class:"r num sub",text:cols[0].info?cols[0].info(E,d):""})].concat(cols.map(c=>{const pre=c.pre?c.pre(E,d):"";if(pre)val[c.k][d]=pre;
    if(c.no&&c.no(d))return el("td",{class:"sub",style:"font-size:12px",text:"no se recupera"});
    if(c.opc){const o=c.opc(d);val[c.k][d]=o[0]||"";const lb=x=>x.replace("Ø ","")+(c.falta&&puFalta(x)?" · "+puFalta(x):"");return el("td",{},o.length>1?sel("pu"+c.k+d.replace(/\W/g,""),o.map(x=>[x,lb(x)]),o[0],x=>val[c.k][d]=x):el("span",{text:o[0]?lb(o[0]):"—"}));}
    return el("td",{},inp("pu"+c.k+d.replace(/\W/g,""),pre?String(pre):"",v=>{const n=parseN(v);if(isFinite(n)&&n>0)val[c.k][d]=n;else delete val[c.k][d];},{inputmode:"numeric",class:"num",placeholder:"0",style:"width:64px;padding:7px 8px;font-size:16px"}));})))));
  dlg(titulo,[intro?el("p",{class:"hint",text:intro}):null,
    filas.length?el("div",{class:"tw"},el("table",{class:"pu"},[el("thead",{},el("tr",{},[el("th",{text:"Ø"}),el("th",{class:"r",text:cols[0].infoT||""})].concat(cols.map(c=>el("th",{text:c.t}))))),tb])):el("p",{class:"empty",text:"No hay pistones en este paso."}),
    ...(extra||[]).map(x=>x.node)],[{t:"Cancelar",cls:"sec"},{t:boton,fn:async()=>{const tot=cols.filter(c=>!c.opc).reduce((t,c)=>t+Object.values(val[c.k]).reduce((a,b)=>a+b,0),0);if(!tot){toast("Pon alguna cantidad");return false;}
      const err=await onOk(val,E,true);if(err){toast(err);return false;}try{await onOk(val,E,false);toast("Guardado");}catch(e){return false;}}}]);}
const puFecha=()=>{const o={v:hoy()};o.node=fld("Fecha",inp("puF",o.v,x=>o.v=x,{type:"date"}));return o;};
const puTxt=(l,ph,extra)=>{const o={v:""};o.node=fld(l,inp("puT"+l.replace(/\W/g,""),"",x=>o.v=x,Object.assign({autocomplete:"off",placeholder:ph||""},extra||{})));return o;};
const supera=(val,k,E,b,txt)=>{for(const d in val[k]){if(val[k][d]>E.S[d][b])return"En "+d+" solo hay "+E.S[d][b]+" "+txt+". Si no cuadra, haz un recuento.";}return"";};
function puClasif(){const E=puEstado();const F=puFecha();const hay={};const filas=DIAM.filter(d=>E.S[d].Z>0||d!=="Ø 50");
  const cam=puCambiosZona();const esp=d=>E.S[d].Z;const totE=DIAM.reduce((t,d)=>t+Math.max(0,esp(d)),0);
  const dif=el("td",{class:"r num"});const totH=el("td",{class:"r num"});
  const pinta=()=>{let th=0,cnt=0;filas.forEach(d=>{const c=document.getElementById("pudf"+d.replace(/\W/g,""));const h=hay[d];if(h!=null){th+=h;cnt++;}
      if(c){const df=h==null?null:h-esp(d);c.textContent=df==null?"":df===0?"✓":(df>0?"+":"−")+Math.abs(df);c.className="r num"+(df<0?" neg":df>0?" warn":"");}});
    totH.textContent=fmtN(th);const df=th-totE;dif.textContent=cnt?(df===0?"✓":(df>0?"+":"−")+Math.abs(df)):"";dif.className="r num"+(df<0&&cnt?" neg":"");};
  const tb=el("tbody",{},filas.map(d=>el("tr",{},[el("td",{},el("b",{text:d})),el("td",{class:"r num",text:esp(d)>0?String(esp(d)):"·"}),
    el("td",{},inp("puh"+d.replace(/\W/g,""),"",v=>{const n=parseN(v);if(isFinite(n)&&n>=0)hay[d]=n;else delete hay[d];pinta();},{inputmode:"numeric",class:"num",placeholder:esp(d)>0?"?":"0"})),
    el("td",{id:"pudf"+d.replace(/\W/g,""),class:"r num"})])));
  const lista=cam.length?el("details",{},[el("summary",{class:"hint",style:"cursor:pointer;font-weight:600",text:"De dónde salen los que debe haber ("+cam.length+" cambio"+(cam.length===1?"":"s")+")"}),
    el("div",{class:"tw"},el("table",{class:"pu"},[el("thead",{},el("tr",{},["Fecha","Iny.","Ø","Responsable"].map(t=>el("th",{text:t})))),
      el("tbody",{},cam.map(p=>el("tr",{},[el("td",{text:fmtF(p.f).slice(0,5)}),el("td",{text:maqN(p.maq)}),el("td",{text:p.diam.replace("Ø ","")+((+p.cant||1)>1?" ×"+p.cant:"")}),el("td",{text:p.resp?respTxt(p.resp):"—"})])))]))]):
    el("p",{class:"hint",text:"No hay cambios de pistón con destino a la zona desde la última retirada."});
  dlg("Retirar de la zona · 1/2 contar",[el("p",{class:"hint",text:"Cuenta lo que hay de verdad en la zona de pistones usados y apúntalo en «Hay» (pon 0 si no hay ninguno). La diferencia sale sola: en rojo los que faltan."}),
    el("div",{class:"tw"},el("table",{class:"pu"},[el("thead",{},el("tr",{},[el("th",{text:"Ø"}),el("th",{class:"r",text:"Debe haber"}),el("th",{text:"Hay"}),el("th",{class:"r",text:"Dif."})])),tb,
      el("tfoot",{},el("tr",{},[el("td",{},el("b",{text:"Total"})),el("td",{class:"r num"},el("b",{text:String(totE)})),totH,dif]))])),lista,F.node],
    [{t:"Cancelar",cls:"sec"},{t:"Siguiente",fn:()=>{const sin=filas.filter(d=>esp(d)>0&&hay[d]==null);if(sin.length){toast("Pon cuántos hay de "+sin.join(", ")+" (0 si no hay)");return false;}
      const tot=Object.values(hay).reduce((a,b)=>a+b,0);const falta={};let nf=0;filas.forEach(d=>{const df=(hay[d]||0)-Math.max(0,esp(d));if(df){falta[d]=-df;if(df<0)nf-=df;}});
      setTimeout(()=>puClasif2(F.v,hay,falta,nf,tot),0);}}]);}
function puClasif2(f,hay,falta,nf,tot){const ds=DIAM.filter(d=>hay[d]>0);const rec={},des={};
  const tb=el("tbody",{},ds.map(d=>{const k=d.replace(/\W/g,"");const pr=puRecup(d)?0:hay[d];rec[d]=0;des[d]=hay[d];
    const cD=el("td",{class:"r num",text:String(des[d])});
    return el("tr",{},[el("td",{},el("b",{text:d})),el("td",{class:"r num",text:String(hay[d])}),
      el("td",{},puRecup(d)?inp("pur"+k,"",v=>{let n=parseN(v);if(!(isFinite(n)&&n>=0))n=0;if(n>hay[d]){n=hay[d];}rec[d]=n;des[d]=hay[d]-n;cD.textContent=String(des[d]);},{inputmode:"numeric",class:"num",placeholder:"0"}):el("span",{class:"sub",style:"font-size:12px",text:"no se recupera"})),cD]);}));
  const resumen=nf?el("div",{class:"banner",style:"background:var(--bad-bg);color:var(--ink)"},[el("b",{text:(nf===1?"Falta 1 pistón: ":"Faltan "+nf+" pistones: ")}),Object.entries(falta).filter(([,n])=>n>0).map(([d,n])=>n+" de "+d).join(", ")+". Quedará apuntado como desvío."]):
    el("p",{class:"hint",text:"Cuadra con lo que debía haber."+(Object.values(falta).some(n=>n<0)?" (Hay alguno de más: se suma igual.)":"")});
  dlg("Retirar de la zona · 2/2 separar",[resumen,el("p",{class:"hint",text:"De los "+tot+" que has encontrado, ¿cuántos van a recuperar ("+PU_REC+")? El resto va al cajón de chatarra."}),
    ds.length?el("div",{class:"tw"},el("table",{class:"pu"},[el("thead",{},el("tr",{},[el("th",{text:"Ø"}),el("th",{class:"r",text:"Hay"}),el("th",{text:"Recuperar"}),el("th",{class:"r",text:"Chatarra"})])),tb])):el("p",{class:"empty",text:"No has encontrado ninguno."})],
    [{t:"Atrás",cls:"sec",fn:()=>{setTimeout(puClasif,0);}},{t:"Guardar retirada",fn:async()=>{const E=puEstado();const esp={};DIAM.forEach(d=>{if(E.S[d].Z>0)esp[d]=E.S[d].Z;});
      const R0={},D0={};Object.keys(rec).forEach(d=>{if(rec[d])R0[d]=rec[d];if(des[d])D0[d]=des[d];});
      try{await puGuarda({t:"clasif",f,esp,enc:hay,falta,rec:R0,des:D0});toast(nf?"Guardado · faltaban "+nf:"Guardado · cuadra");}catch(e){return false;}}}]);}
function puEnvio(){const F=puFecha(),A=puTxt("Nº de albarán (opcional)");puForm("Enviar a "+PU_REC,"Viene puesto todo lo que tienes para recuperar. En «Rebajar a» elige el diámetro que le pides a "+PU_REC+": sale primero el que te falta. Si de un mismo diámetro quieres unos a un tamaño y otros a otro, regístralo en dos envíos.",
  [{k:"c",t:"Enviar",infoT:"Para recup.",info:(E,d)=>E.S[d].R||"·",pre:(E,d)=>E.S[d].R>0?E.S[d].R:"",mostrar:(E,d)=>E.S[d].R>0},{k:"a",t:"Rebajar a",opc:puOpcEnv,falta:true}],[F,A],"Registrar envío",
  (v,E,chk)=>{if(chk)return supera(v,"c",E,"R","para recuperar");const a={};Object.keys(v.c).forEach(d=>a[d]=v.a[d]||puRecup(d));return puGuarda({t:"envio",f:F.v,c:v.c,a,alb:A.v.trim()});});}
function puRecep(){const F=puFecha(),A=puTxt("Nº de albarán (opcional)");const pa=pistArt("Ø 80");const L={v:(pa&&almDe(pa.id))||(cat.almacenes[0]||{}).id||""};L.node=fld("Entran en el almacén",sel("puAlm",almOpts(),L.v,x=>L.v=x));
  puForm("Recibir de "+PU_REC,"Los que vuelven bien entran en el stock con el diámetro al que los han rebajado (viene puesto el que pediste al enviarlos; cámbialo solo si te los devuelven distintos). Si de un mismo diámetro vuelven unos a un tamaño y otros a otro, regístralo en dos veces. Los que no se han podido recuperar pasan al cajón de chatarra.",
  [{k:"ok",t:"Vuelven bien",infoT:"En "+PU_REC,info:(E,d)=>E.S[d].M||"·",pre:(E,d)=>E.S[d].M>0?E.S[d].M:"",mostrar:(E,d)=>E.S[d].M>0},{k:"como",t:"Vuelven a",opc:puOpcRec},{k:"mal",t:"No sirven"}],[F,A,L],"Registrar recepción",
  async(v,E,chk)=>{if(chk){for(const d of DIAM){const n=(v.ok[d]||0)+(v.mal[d]||0);if(n>E.S[d].M)return"De "+d+" solo hay "+E.S[d].M+" en "+PU_REC+".";if(v.ok[d]&&!puRecup(d))return d+" no se puede recuperar.";if(v.ok[d]&&!pistArt(v.como[d]||puRecup(d)))return"No hay artículo de pistón "+(v.como[d]||puRecup(d))+" en el catálogo.";}return"";}
    const movs=Object.entries(v.ok).map(([d,n])=>({tipo:"entrada",f:F.v,art:pistArt(v.como[d]||puRecup(d)).id,alm:L.v,cant:n,rec:true,alb:A.v.trim()||undefined,nota:"Recuperado por "+PU_REC+" (era "+d+")"}));
    if(movs.length)await addMovs(movs);const como={};Object.keys(v.ok).forEach(d=>como[d]=v.como[d]||puRecup(d));return puGuarda({t:"recep",f:F.v,ok:v.ok,como,mal:v.mal,alb:A.v.trim(),alm:L.v,movs:movs.map(m=>({id:m.id,f:m.f}))});});}
function puChat(){const F=puFecha(),K=puTxt("Kilos (opcional)","",{inputmode:"decimal"}),I=puTxt("Importe que pagan, € (opcional)","",{inputmode:"decimal"});
  puForm("Llevar a la chatarrería","Viene puesto todo lo que hay en el cajón.",[{k:"c",t:"Se llevan",infoT:"En cajón",info:(E,d)=>E.S[d].C||"·",pre:(E,d)=>E.S[d].C>0?E.S[d].C:"",mostrar:(E,d)=>E.S[d].C>0}],[F,K,I],"Registrar",
  (v,E,chk)=>chk?supera(v,"c",E,"C","en el cajón"):puGuarda({t:"chat",f:F.v,c:v.c,kg:parseN(K.v)||null,eur:parseN(I.v)||null}));}
function puCuenta(){const E=puEstado();const F=puFecha();const b={};PU_B.forEach(([k])=>b[k]={});
  const tb=el("tbody",{},DIAM.map(d=>el("tr",{},[el("td",{},el("b",{text:d}))].concat(PU_B.map(([k])=>{const pre=E?E.S[d][k]:"";if(E)b[k][d]=pre;
    return el("td",{},inp("puc"+k+d.replace(/\W/g,""),pre===""?"":String(pre),v=>{const n=parseN(v);b[k][d]=isFinite(n)&&n>=0?n:0;},{inputmode:"numeric",class:"num",placeholder:"0",style:"width:54px;padding:7px 6px;font-size:16px"}));})))));
  dlg(E?"Recuento de pistones usados":"Primer recuento de pistones usados",[el("p",{class:"hint",text:E?"Corrige lo que no cuadre. Lo que pongas aquí sustituye a lo que calcula la app.":"Cuenta lo que hay ahora en cada sitio. A partir de aquí, los cambios de pistón con destino «Zona de pistones usados» se suman solos en «Sin seleccionar»."}),
    el("div",{class:"tw"},el("table",{class:"pu"},[el("thead",{},el("tr",{},[el("th",{text:"Ø"})].concat(["Sin selec.","Recup.",PU_REC,"Chatarra"].map(t=>el("th",{text:t}))))),tb])),F.node],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar recuento",fn:async()=>{PU_B.forEach(([k])=>DIAM.forEach(d=>{if(b[k][d]==null)b[k][d]=0;}));try{await puGuarda({t:"cuenta",f:F.v,b});toast("Recuento guardado");}catch(e){return false;}}}]);}
function puTxtEv(e){const s=o=>Object.entries(o||{}).filter(([,n])=>n).map(([d,n])=>d+" ×"+n).join(", ")||"—";
  return e.t==="cuenta"?"Recuento":e.t==="clasif"?(e.esp?"Retirada de la zona"+(Object.values(e.falta||{}).some(n=>n>0)?" · FALTABAN "+Object.entries(e.falta).filter(([,n])=>n>0).map(([d,n])=>d+" ×"+n).join(", "):" · cuadra")+" · recuperar: "+s(e.rec)+" · chatarra: "+s(e.des):"Selección · recuperar: "+s(e.rec)+" · chatarra: "+s(e.des)):e.t==="envio"?"Enviado a "+PU_REC+": "+Object.entries(e.c||{}).filter(([,n])=>n).map(([d,n])=>d+"→"+((e.a||{})[d]||"?").replace("Ø ","")+" ×"+n).join(", ")+(e.alb?" · alb. "+e.alb:""):
    e.t==="recep"?"Recibido de "+PU_REC+" · bien: "+Object.entries(e.ok||{}).filter(([,n])=>n).map(([d,n])=>d+"→"+((e.como||{})[d]||puRecup(d)||"?")+" ×"+n).join(", ")+(Object.keys(e.mal||{}).length?" · no sirven: "+s(e.mal):"")+(e.alb?" · alb. "+e.alb:""):"Chatarrería: "+s(e.c)+(e.kg?" · "+fmtN(e.kg)+" kg":"")+(e.eur?" · "+fmtN(e.eur)+" €":"");}
async function puBorra(e){const prev=cat.pusados;cat.pusados={ev:puEv().filter(x=>x.id!==e.id)};try{await saveCat();for(const m of e.movs||[])await delMov(m.id,m.f);toast("Deshecho");}catch(er){cat.pusados=prev;}render(true);}
function cardUsados(){const E=puEstado();
  if(!E)return el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Pistones usados"})),el("div",{class:"bd",style:"display:grid;gap:10px"},[
    el("p",{class:"hint",style:"margin:0",text:"Lleva la cuenta de los usados: los que esperan a ser seleccionados, los que van a "+PU_REC+" para recuperar y los del cajón de chatarra. Para empezar, cuenta lo que hay ahora."}),
    el("button",{type:"button",class:"btn",text:"Contar pistones usados",onclick:puCuenta})])]);
  const U=puUrge(E),ev=puEv().slice().sort((a,b)=>b.f.localeCompare(a.f)||b.ts-a.ts);
  const filas=DIAM.filter(d=>PU_B.some(([b])=>E.S[d][b]));
  return el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Pistones usados"}),el("span",{class:"der sub",text:E.tot.Z+E.tot.R+E.tot.M+E.tot.C+" en total"})]),
    el("div",{class:"bd",style:"padding-bottom:0"},[el("div",{class:"sub",style:"font-size:12px;font-weight:600"},"Debe haber en la zona de usados"),
      el("div",{style:"font-size:17px;font-weight:600;margin-top:2px"},E.tot.Z>0?DIAM.filter(d=>E.S[d].Z>0).map(d=>d+": "+E.S[d].Z).join(" · ")+" · Total "+E.tot.Z:"Nada (vacía)"),
      el("div",{class:"sub",style:"font-size:12px;margin-top:2px"},"Según los cambios de pistón apuntados"+(puCambiosZona().length?" ("+puCambiosZona().length+" desde la última retirada)":"")+"."+(puFaltasAno()?" En las retiradas de este año han faltado "+puFaltasAno()+(puFaltasAno()===1?" pistón.":" pistones."):""))]),
    U.length?el("div",{class:"banner",style:"margin:10px 14px 0"},[el("b",{text:"Urge recuperar: "}),U.map(x=>x.d+" está "+(nivel(x.a)==="bad"?"bajo mínimo":"para pedir")+" (quedan "+fmtN(stockDe(x.a.id))+", mín "+fmtN(+x.a.min||0)+"): puedes recuperar "+x.fuentes.map(f=>f.u+" de "+f.src).join(" y ")).join(" · ")]):null,
    filas.length?el("div",{class:"tw"},el("table",{class:"pu"},[el("thead",{},el("tr",{},[el("th",{text:"Ø"})].concat(["Sin selec.","Recuperar",PU_REC,"Chatarra"].map(t=>el("th",{class:"r",text:t}))))),
      el("tbody",{},filas.map(d=>el("tr",{style:U.some(x=>x.fuentes.some(f=>f.src===d))?"background:var(--bad-bg)":""},[el("td",{},[el("b",{text:d}),el("div",{class:"sub",style:"font-size:11px",text:puRecup(d)?"→ "+puRecup(d).replace("Ø ","")+(puOpc(d).length>1?"…":""):"no recup."})])].concat(PU_B.map(([b])=>el("td",{class:"r num"+(E.S[d][b]<0?" neg":""),text:E.S[d][b]?fmtN(E.S[d][b]):"·"})))))),
      el("tfoot",{},el("tr",{},[el("td",{},el("b",{text:"Total"}))].concat(PU_B.map(([b])=>el("td",{class:"r num"},el("b",{text:fmtN(E.tot[b])}))))))])):el("div",{class:"empty",text:"No hay pistones usados."}),
    el("div",{class:"bd"},el("div",{class:"acciones acc2"},[el("button",{type:"button",class:"btn",text:"Retirar de la zona",onclick:puClasif}),
      el("button",{type:"button",class:"btn sec",text:"Enviar a "+PU_REC,disabled:!E.tot.R,onclick:puEnvio}),el("button",{type:"button",class:"btn sec",text:"Recibir de "+PU_REC,disabled:!E.tot.M,onclick:puRecep}),
      el("button",{type:"button",class:"btn sec",text:"Llevar a chatarrería",disabled:!E.tot.C,onclick:puChat}),el("button",{type:"button",class:"btn sec",text:"Recuento",onclick:puCuenta})])),
    ev.length?el("details",{style:"border-top:1px solid var(--line2)"},[el("summary",{class:"gh",style:"cursor:pointer",text:"Movimientos de usados ("+ev.length+")"}),el("div",{class:"lst"},ev.slice(0,30).map(e=>el("div",{class:"it",style:"cursor:default"},[
      el("div",{class:"ppal"},[el("div",{class:"t1",style:"font-weight:500",text:puTxtEv(e)}),el("div",{class:"t2",text:fmtF(e.f)+(e.por?" · "+e.por:"")})]),
      el("button",{type:"button",class:"btn txt peq",text:"Deshacer",onclick:()=>confirmar("¿Deshacer?",puTxtEv(e)+(e.movs&&e.movs.length?". También se quita la entrada de esos pistones en el stock.":""),"Deshacer",()=>puBorra(e))})])))]):null]);}
function textoUsados(){const E=puEstado();if(!E)return"PISTONES USADOS: sin recuento todavía.";const L=["PISTONES USADOS (a "+fmtF(hoy())+"):"];
  DIAM.forEach(d=>{const x=E.S[d];if(x.Z||x.R||x.M||x.C)L.push("- Pistón "+d+": "+[x.Z?x.Z+" sin seleccionar":"",x.R?x.R+" para recuperar":"",x.M?x.M+" en "+PU_REC:"",x.C?x.C+" en chatarra":""].filter(Boolean).join(" · "));});
  L.push("Total: "+E.tot.Z+" sin seleccionar · "+E.tot.R+" para recuperar · "+E.tot.M+" en "+PU_REC+" · "+E.tot.C+" en chatarra");return L.join("\n");}
function vPist(v){const d=draft.p;
  {const u=(cat.ajustes||{}).ultInfPist;const pend=pistPend();if(pend.length)v.appendChild(el("div",{class:"banner",style:"display:flex;gap:10px;align-items:center;flex-wrap:wrap"},[el("span",{style:"flex:1;min-width:180px",text:pend.reduce((a,p)=>a+(+p.cant||1),0)+" pistones consumidos sin informar a "+destPist().nom.split(" ")[0]+(u?" desde el "+fmtF(sumaDias(u,1)):"")}),el("button",{type:"button",class:"btn peq",text:"Preparar informe",onclick:informePist})]));}
  const S=statsPist();
  v.appendChild(el("div",{class:"acciones acc2",id:"pAcc"},[pistPend().length?null:el("button",{type:"button",class:"btn sec",text:"Informe diario para "+destPist().nom.split(" ")[0],onclick:informePist}),
    el("button",{type:"button",class:"btn sec",text:"Repartir por almacén",onclick:formReparto}),
    el("button",{type:"button",class:"btn sec",text:"Recuento de fin de mes",onclick:formRecuento}),
    el("button",{type:"button",class:"btn sec",text:"Entrada de pistones",onclick:()=>{Object.assign(draft.m,{tipo:"entrada",art:(pistArt("Ø 80")||{}).id||"",cant:""});irA("mov");}})]));
  v.appendChild(el("section",{class:"card",id:"pStockCard"},[el("div",{class:"hd"},[el("h2",{text:"Stock de pistones"}),el("span",{class:"der sub",text:"Consumo: últimos 60 días"})]),
    el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Ø"}),el("th",{class:"r",text:"Total"})].concat(almPist().map(l=>el("th",{class:"r",text:l.nom}))).concat([el("th",{class:"r",text:"Mín."}),el("th",{text:"Estado"}),el("th",{class:"r",text:"Cons./mes"}),el("th",{class:"r",text:"Cobertura"}),el("th",{text:"Se agota"}),el("th",{class:"r",text:"Mín. sugerido"}),el("th",{class:"r",text:"Usados"}),el("th",{class:"r",text:"En eje"})]))),
      el("tbody",{},DIAM.map(x=>{const s=S[x];return el("tr",{},[el("td",{},el("b",{text:x})),el("td",{class:"r num"+(s.st<0?" neg":"")},el("b",{text:fmtN(s.st)}))].concat(almPist().map(l=>{const q=s.a?stockDe(s.a.id,l.id):0;return el("td",{class:"r num"+(q<0?" neg":""),text:q?fmtN(q):"·"});})).concat([el("td",{class:"r num",text:fmtN(s.min)}),
        el("td",{},el("span",{class:"pill "+s.niv,text:NIVP[s.niv]})),el("td",{class:"r num",text:s.mes?fmtN(Math.round(s.mes*10)/10):"—"}),el("td",{class:"r num",text:s.cob!=null?Math.round(s.cob)+" d":"—"}),
        el("td",{class:"num",text:s.agot?fmtF(s.agot):"—"}),el("td",{class:"r num",text:s.sug!=null?s.sug:"—"}),el("td",{class:"r num",text:s.usados||"—"}),el("td",{class:"r num",text:s.agarr||"—"})]));}))])),
    el("p",{class:"hint",style:"padding:0 14px 12px",text:"Desliza la tabla a la derecha para ver cada almacén y el consumo. En rojo, lo que sale en negativo: no cuadra, hay que contarlo. Mínimo sugerido: consumo durante el plazo de entrega del proveedor (4 semanas si no está puesto) + 50 % de margen. Usados y En eje cuentan desde el último recuento."})]));
  if(!cat.maquinas.length)v.appendChild(el("div",{class:"banner",text:"Añade las inyectoras en Catálogo para registrar cambios de pistón."}));
  const pa=pistArt(d.diam);if(pa&&!d.alm)d.alm=almPara(d.maq,pa.id);
  const resp=inp("pResp",d.resp,x=>d.resp=x,{autocomplete:"off",list:"lOper",placeholder:"Nº o nombre"});
  const dl=el("datalist",{id:"lOper"},responsables().map(r=>el("option",{value:r})));
  const form=el("form",{id:"pForm"},[
    el("div",{class:"row"},[fld("Fecha",inp("pF",d.f,x=>d.f=x,{type:"date"})),fld("Inyectora",sel("pMaq",maqOpts(),d.maq,x=>{d.maq=x;d.alm="";const u=ultimoPist(x);if(u&&!d.diam)d.diam=u.diam;render(true);},"Elige…"))]),
    el("div",{class:"row"},[fld("Diámetro",sel("pDiam",DIAM.map(x=>[x,x]),d.diam,x=>{d.diam=x;d.alm="";render(true);},"Ø…")),fld("Cantidad",inp("pCant",d.cant,x=>d.cant=x,{inputmode:"numeric",class:"num"}))]),
    el("div",{class:"row"},[fld("Motivo del cambio",sel("pMot",MOTIVOS.map(m=>[m,cap(m)]),d.motivo,x=>d.motivo=x)),fld("Responsable",resp),dl]),
    fld("Destino del pistón usado",sel("pDest",DESTINOS.map(m=>[m,cap(m)]),d.dest,x=>d.dest=x,"Elige…")),
    fld("Observaciones",inp("pNota",d.nota,x=>d.nota=x,{autocomplete:"off"})),
    pa?el("div",{class:"row"},[el("label",{class:"chk"},[el("input",{type:"checkbox",id:"pDesc",checked:d.desc,onchange:e=>{d.desc=e.target.checked;}}),"Descontar del stock"]),
        fld("De almacén",sel("pAlm",almOpts(),d.alm,x=>d.alm=x))]):(d.diam?el("p",{class:"hint",text:"No hay artículo de pistón "+d.diam+" en el catálogo, así que no se descuenta stock."}):null),
    el("button",{type:"submit",class:"btn",id:"pBtn",text:"Registrar cambio"})]);
  form.addEventListener("submit",e=>{e.preventDefault();guardarPist();});
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Cambio de pistón"})),el("div",{class:"bd"},form)]));
  ["#pAcc","#pStockCard"].forEach(q=>{const sc=v.querySelector(q);if(sc)v.appendChild(sc);});
  v.appendChild(cardUsados());
  const all=todosPist(),hy=hoy();
  /* análisis por inyectora, últimos 3 meses */
  const d3=sumaDias(hy,-91);const cnt={};all.filter(p=>p.f>=d3).forEach(p=>{cnt[p.maq]=(cnt[p.maq]||0)+(+p.cant||1);});
  const ks=Object.keys(cnt);const media=ks.length?ks.reduce((s,k)=>s+cnt[k],0)/ks.length:0;
  const porMaq={};all.forEach(p=>{(porMaq[p.maq]=porMaq[p.maq]||[]).push(p);});
  const filas=Object.keys(porMaq).map(k=>{const ps=porMaq[k],u=ps[ps.length-1];let tot=0;for(let i=1;i<ps.length;i++)tot+=dias(ps[i-1].f,ps[i].f);
    const c3=cnt[k]||0;const al=c3>=4&&media>0?(c3>=media*1.5?"bad":c3>=media*1.2?"warn":""):"";
    return{maq:k,u,n:ps.length,c3,al,dd:dias(u.f,hy),hh:laborables(u.f,hy)*24,media:ps.length>1?tot/(ps.length-1):null};}).sort((a,b)=>(b.al==="bad")-(a.al==="bad")||(b.al==="warn")-(a.al==="warn")||b.c3-a.c3||a.dd-b.dd);
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Por inyectora"}),el("span",{class:"der sub",text:"Media planta 3 meses: "+fmtN(Math.round(media*10)/10)+" cambios"})]),
    filas.length?el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Inyectora"}),el("th",{class:"r",text:"3 meses"}),el("th",{text:"Aviso"}),el("th",{text:"Último"}),el("th",{text:"Ø"}),el("th",{class:"r",text:"Días"}),el("th",{class:"r",text:"Horas est."}),el("th",{class:"r",text:"Media días"})])),
      el("tbody",{},filas.map(r=>el("tr",{},[el("td",{},el("b",{text:maqN(r.maq)})),el("td",{class:"r num",text:r.c3}),el("td",{},r.al?el("span",{class:"pill "+r.al,text:r.al==="bad"?"Alto":"Vigilar"}):""),
        el("td",{class:"num",text:fmtF(r.u.f)}),el("td",{text:r.u.diam}),el("td",{class:"r num",text:r.dd}),el("td",{class:"r num",text:fmtN(r.hh)}),el("td",{class:"r num",text:r.media!=null?fmtN(Math.round(r.media)):"—"})])))])):el("div",{class:"empty",text:"Aún no hay cambios registrados."}),
    el("p",{class:"hint",style:"padding:0 14px 12px",text:"«Alto»: 1,5 veces la media de la planta; «Vigilar»: 1,2 veces (con 4 cambios o más). Horas: días laborables L–V × 24 h."})]));
  v.appendChild(cardComprasPist(()=>render(true)));
  /* consumo por mes */
  const pids=DIAM.map(pistArt).filter(Boolean).map(a=>a.id);const entP=todosMov().filter(m=>m.tipo==="entrada"&&pids.includes(m.art));
  const anos=Array.from(new Set([hy.slice(0,4)].concat(all.map(p=>p.f.slice(0,4))).concat(entP.map(m=>m.f.slice(0,4))))).sort().reverse();
  if(!draft.pAno||!anos.includes(draft.pAno))draft.pAno=hy.slice(0,4);const ano=draft.pAno;
  const pm={},em={};all.filter(p=>p.f.startsWith(ano)).forEach(p=>{const m=+p.f.slice(5,7);(pm[m]=pm[m]||{})[p.diam]=((pm[m]||{})[p.diam]||0)+(+p.cant||1);});
  entP.filter(m=>m.f.startsWith(ano)).forEach(m=>{const k=+m.f.slice(5,7);em[k]=(em[k]||0)+(+m.cant||0);});
  const mesAct=ano===hy.slice(0,4)?+hy.slice(5,7):12;
  const tot={},totE=Object.values(em).reduce((a,b)=>a+b,0);DIAM.forEach(x=>{tot[x]=Object.values(pm).reduce((a,r)=>a+(r[x]||0),0);});const totT=DIAM.reduce((a,x)=>a+tot[x],0);
  const filaMes=m=>{const r=pm[m]||{};const t=DIAM.reduce((a,x)=>a+(r[x]||0),0);const fut=m>mesAct;
    return el("tr",{style:fut?"opacity:.4":null},[el("td",{text:cap(MESES[m-1])})].concat(DIAM.map(x=>el("td",{class:"r num",text:fut?"":String(r[x]||0)}))).concat([el("td",{class:"r num"},el("b",{text:fut?"":String(t)})),el("td",{class:"r num",text:fut?"":String(em[m]||0)})]));};
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Consumo por mes"}),el("div",{class:"der"},sel("pAno",anos.map(a=>[a,a]),ano,x=>{draft.pAno=x;render(true);}))]),
    el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Mes"})].concat(DIAM.map(x=>el("th",{class:"r",text:x.replace("Ø ","")}))).concat([el("th",{class:"r",text:"Total"}),el("th",{class:"r",text:"Entradas"})]))),
      el("tbody",{},[1,2,3,4,5,6,7,8,9,10,11,12].map(filaMes).concat([el("tr",{style:"border-top:2px solid var(--line)"},[el("td",{},el("b",{text:"Total "+ano}))].concat(DIAM.map(x=>el("td",{class:"r num"},el("b",{text:String(tot[x])})))).concat([el("td",{class:"r num"},el("b",{text:String(totT)})),el("td",{class:"r num"},el("b",{text:String(totE)}))]))]))])),
    el("p",{class:"hint",style:"padding:0 14px 12px",text:"Pistones cambiados por mes y diámetro. Los meses que aún no han llegado salen en gris."})]));
  const ult=all.slice().reverse().slice(0,40);
  if(ult.length)v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Últimos cambios"})),
    el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Fecha"}),el("th",{text:"Iny."}),el("th",{text:"Ø"}),el("th",{text:"Motivo"}),el("th",{text:"Responsable"}),el("th",{text:""})])),
      el("tbody",{},ult.map(p=>el("tr",{},[el("td",{class:"num",text:fmtF(p.f)}),el("td",{text:maqN(p.maq)}),el("td",{text:p.diam+((+p.cant||1)>1?" ×"+p.cant:"")}),
        el("td",{},[el("div",{text:cap(p.motivo)}),(p.dest||p.nota)?el("div",{class:"sub",text:[p.dest?cap(p.dest):null,p.nota].filter(Boolean).join(" · ")}):null]),
        el("td",{text:p.resp||"—"}),
        el("td",{},el("button",{type:"button",class:"btn txt peq",text:"Borrar",onclick:()=>confirmar("¿Borrar este cambio?","Cambio de "+p.diam+" en "+maqN(p.maq)+" del "+fmtF(p.f)+(p.movId?". El pistón vuelve al stock.":"."),"Borrar",async()=>{await delPist(p);toast("Cambio borrado");})}))])))]))]));}
function responsables(){const s=new Set();(cat.operarios||[]).forEach(o=>{if(o.nom&&o.num)s.add(o.num+" "+o.nom);else if(o.nom)s.add(o.nom);else if(o.num)s.add(String(o.num));});todosPist().forEach(p=>{if(p.resp)s.add(String(p.resp));});return Array.from(s).sort();}
function ultimoPist(maq){const ps=todosPist().filter(p=>p.maq===maq);return ps[ps.length-1];}
async function guardarPist(){const d=draft.p;if(!db){toast("No se puede guardar en esta vista");return;}
  const q=parseInt(d.cant,10);
  if(!d.maq){toast("Elige la inyectora");return;}if(!d.diam){toast("Elige el diámetro");return;}if(!d.f){toast("Pon la fecha");return;}if(!(q>0)){toast("Pon la cantidad");return;}
  if(!d.dest){toast("Indica qué se ha hecho con el pistón usado");return;}
  const b=$("pBtn");if(b){b.disabled=true;b.textContent="Guardando…";}
  try{const rec={f:d.f,maq:d.maq,diam:d.diam,cant:q,motivo:d.motivo,dest:d.dest,resp:d.resp.trim()||null,nota:d.nota.trim()||null};
    const pa=pistArt(d.diam);
    if(pa&&d.desc&&d.alm){const m=await addMov({f:d.f,tipo:"salida",art:pa.id,alm:d.alm,cant:q,maq:d.maq,nota:"Cambio de pistón · "+cap(d.motivo)});rec.movId=m.id;}
    await addPist(rec);
    try{await ejePendDe([rec]);}catch(e){}toast("Cambio registrado en "+maqN(d.maq));if(d.resp.trim())lsSet("alm.resp",d.resp.trim());lsSet("alm.dp",d.dest);Object.assign(d,{nota:"",cant:"1"});
  }catch(e){toast("No se pudo guardar: "+(e&&e.message||"error"));}
  render(true);}
async function addMovs(list){const g={};list.forEach(r=>{r.id=r.id||uid();r.ts=Date.now();(g[mesDe(r.f)]=g[mesDe(r.f)]||[]).push(r);});
  for(const k of Object.keys(g)){if(db.itemsAdd){await db.itemsAdd("mov",k,g[k]);continue;}const ref=db.doc("mov/"+k),sn=await ref.get();const items=sn.exists?(sn.data().items||[]).slice():[];await ref.set({items:items.concat(g[k])});}}
function formRecuento(){const f={f:hoy(),alm:(cat.almacenes[0]||{}).id||"",c:{}};
  const almS=sel("rAlm",almOpts(),f.alm,x=>{f.alm=x;pinta();});
  const tb=el("tbody");
  function pinta(){tb.textContent="";DIAM.forEach(x=>{const a=pistArt(x);if(!a)return;const l=f.alm||almDe(a.id);const t=stockDe(a.id,l);const c=parseN(f.c[x]);const df=isFinite(c)?c-t:null;
    const grande=df!=null&&c>0&&Math.abs(df)/c>0.1;
    const i=inp("rc"+x.replace(/\W/g,""),f.c[x],v=>{f.c[x]=v;const n=parseN(v);const cel=i.closest("tr").lastChild;const dd=isFinite(n)?n-t:null;cel.textContent=dd==null?"—":(dd>=0?"+":"−")+fmtN(Math.abs(dd));cel.className="r num"+(dd!=null&&n>0&&Math.abs(dd)/n>0.1?" bad":"");},{inputmode:"numeric",class:"num",style:"width:80px;padding:7px 8px;font-size:16px"});
    tb.appendChild(el("tr",{},[el("td",{},el("b",{text:x})),el("td",{class:"r num",text:fmtN(t)}),el("td",{},i),el("td",{class:"r num"+(grande?" bad":""),text:df==null?"—":(df>=0?"+":"−")+fmtN(Math.abs(df))})]));});}
  pinta();
  dlg("Recuento de pistones",[fld("Fecha del recuento",inp("rF",f.f,v=>f.f=v,{type:"date"})),cat.almacenes.length>1?fld("Almacén",almS):null,
    el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Ø"}),el("th",{class:"r",text:"Teórico"}),el("th",{text:"Contado"}),el("th",{class:"r",text:"Dif."})])),tb])),
    el("p",{class:"hint",text:"Cuenta solo lo que hay en el almacén elegido. Deja en blanco los que no cuentes. La diferencia queda como ajuste, no como consumo. En rojo, diferencias de más del 10 %. Para repartir pistones entre almacenes sin cambiar el total, usa «Repartir por almacén»."})],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar recuento",fn:async()=>{if(!db){toast("No se puede guardar");return false;}if(!f.f){toast("Pon la fecha");return false;}
      const list=[];DIAM.forEach(x=>{const a=pistArt(x);const c=parseN(f.c[x]);if(!a||!isFinite(c)||c<0)return;const l=f.alm||almDe(a.id);const t=stockA(a.id,l,f.f);
        list.push({f:f.f,tipo:"ajuste",art:a.id,alm:l,cant:Math.round((c-t)*1000)/1000,contado:c,teorico:t,nota:"Recuento de fin de mes"});});
      if(!list.length){toast("No has escrito ningún recuento");return false;}
      try{await addMovs(list);toast("Recuento guardado ("+list.length+" diámetros)");}catch(e){toast("No se pudo guardar");return false;}}}]);}

function formReparto(){const gen=cat.almacenes[0];const otros=cat.almacenes.slice(1);
  if(!gen||!otros.length){toast("Hace falta más de un almacén en Catálogo");return;}
  const f={f:hoy(),c:{}};const tb=el("tbody");const aviso=el("p",{class:"hint"});
  const filas=DIAM.map(x=>({x,a:pistArt(x)})).filter(r=>r.a);
  function genDe(r){let g=stockDe(r.a.id);otros.forEach(l=>{const v=parseN((f.c[r.x]||{})[l.id]);g-=isFinite(v)?v:stockDe(r.a.id,l.id);});return g;}
  function pinta(){tb.textContent="";let mal=0;filas.forEach(r=>{const g=genDe(r);if(g<0)mal++;
    tb.appendChild(el("tr",{},[el("td",{},el("b",{text:r.x})),el("td",{class:"r num",text:fmtN(stockDe(r.a.id))})].concat(otros.map(l=>{
      const i=inp("rp"+r.x.replace(/\W/g,"")+l.id,(f.c[r.x]||{})[l.id],v=>{(f.c[r.x]=f.c[r.x]||{})[l.id]=v;const g2=genDe(r);const c=i.closest("tr").lastChild;c.textContent=fmtN(g2);c.className="r num"+(g2<0?" bad":"");},{inputmode:"numeric",class:"num",placeholder:fmtN(stockDe(r.a.id,l.id)),style:"width:58px;padding:7px 6px;font-size:16px"});
      return el("td",{},i);})).concat([el("td",{class:"r num"+(g<0?" bad":""),text:fmtN(g)})])));});}
  pinta();
  dlg("Repartir pistones por almacén",[el("p",{text:"Escribe cuántos hay en cada nave. Lo que pongas se pasa desde "+gen.nom+" (o vuelve a él): el total no cambia, solo se reparte."}),
    fld("Fecha",inp("rpF",f.f,v=>f.f=v,{type:"date"})),
    el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Ø"}),el("th",{class:"r",text:"Total"})].concat(otros.map(l=>el("th",{text:l.nom}))).concat([el("th",{class:"r",text:gen.nom})]))),tb])),
    el("p",{class:"hint",text:"En gris, lo que hay ahora; déjalo en blanco si no cambia. Si "+gen.nom+" sale en negativo es que en total hay más pistones de los que marca la app: haz primero un recuento."}),aviso],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar reparto",fn:async()=>{if(!db){toast("No se puede guardar");return false;}if(!f.f){toast("Pon la fecha");return false;}
      const list=[];let neg=false;
      filas.forEach(r=>{if(genDe(r)<0)neg=true;otros.forEach(l=>{const v=parseN((f.c[r.x]||{})[l.id]);if(!isFinite(v)||v<0)return;const df=Math.round((v-stockDe(r.a.id,l.id))*1000)/1000;if(!df)return;
        list.push(df>0?{f:f.f,tipo:"traslado",art:r.a.id,alm:gen.id,dest:l.id,cant:df,nota:"Reparto por almacén"}:{f:f.f,tipo:"traslado",art:r.a.id,alm:l.id,dest:gen.id,cant:-df,nota:"Reparto por almacén"});});});
      if(neg){toast("Algún diámetro deja "+gen.nom+" en negativo. Revisa las cantidades");return false;}
      if(!list.length){toast("No hay cambios que guardar");return false;}
      try{await addMovs(list);toast("Reparto guardado ("+list.length+" traslados)");}catch(e){toast("No se pudo guardar");return false;}render(true);}}]);}


/* compras de pistones: lo que entra nuevo y lo que vuelve recuperado, cada uno con su precio */
function datosComprasPist(d0,d1){const pids={};DIAM.forEach(x=>{const a=pistArt(x);if(a)pids[a.id]=a;});const G={};let tN=0,tR=0,eN=0,eR=0,ahorro=0;const sinP=new Set();
  todosMov().forEach(m=>{if(m.tipo!=="entrada"||!pids[m.art]||m.f<d0||m.f>d1)return;const a=pids[m.art],c=+m.cant||0,r=esEntRec(m),p=r?precioRecDe(a):precioDe(a);const g=G[a.diam]=G[a.diam]||{n:0,r:0,en:0,er:0};
    if(!p)sinP.add(a.diam+(r?" (recuperado)":" (nuevo)"));if(r){g.r+=c;g.er+=c*p;tR+=c;eR+=c*p;if(precioDe(a)&&p)ahorro+=c*(precioDe(a)-p);}else{g.n+=c;g.en+=c*p;tN+=c;eN+=c*p;}});
  return{G,tN,tR,eN,eR,ahorro,sinP:[...sinP]};}
function cardComprasPist(re){const h=hoy(),k=draft.cpP||"mes";const y=h.slice(0,4),mAnt=(()=>{const d=new Date(+y,+h.slice(5,7)-2,1,12);return d.toISOString().slice(0,7);})();
  const P={mes:[h.slice(0,7)+"-01",h,"Este mes"],mesant:[mAnt+"-01",finMes(mAnt+"-01"),"Mes anterior"],ano:[y+"-01-01",h,"Este año"],"12m":[sumaDias(h,-365),h,"12 meses"]}[k];const D=datosComprasPist(P[0],P[1]);
  const ds=DIAM.filter(x=>D.G[x]);
  return el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Compras de pistones"}),el("span",{class:"der sub",text:"nuevos y recuperados"})]),
    el("div",{class:"bd",style:"display:grid;gap:10px"},[
      el("div",{class:"seg",role:"group","aria-label":"Periodo"},[["mes","Este mes"],["mesant","Mes anterior"],["ano","Este año"],["12m","12 meses"]].map(([kk,t])=>el("button",{type:"button","aria-pressed":String(k===kk),text:t,onclick:()=>{draft.cpP=kk;re();}}))),
      el("dl",{class:"kpis num"},[["Nuevos",fmtN(D.tN)+" · "+eur(D.eN)],["Recuperados",fmtN(D.tR)+" · "+eur(D.eR)],["Total compras",eur(D.eN+D.eR)],["Ahorro por recuperar",eur(D.ahorro)]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))),
      D.sinP.length?el("div",{class:"banner w",text:"Sin precio: "+D.sinP.join(", ")+". Ponlo en la ficha del pistón (precio de nuevo y de recuperado)."}):null,
      ds.length?cTabla(["Ø","Nuevos","€ nuevos","Recuperados","€ recuperados"],ds.map(x=>{const g=D.G[x];return[x,fmtN(g.n),eur(g.en),fmtN(g.r),eur(g.er)];}),[1,2,3,4]):el("p",{class:"hint",style:"margin:0",text:"No ha entrado ningún pistón en "+P[2].toLowerCase()+"."}),
      el("p",{class:"hint",style:"margin:0",text:"Al apuntar una entrada de pistones eliges si son nuevos o recuperados. Los que llegan de la recuperación (Pistones usados › Recibido) cuentan solos como recuperados. Ahorro = lo que costarían nuevos − lo que ha costado recuperarlos."})])]);}

/* modificar un movimiento ya apuntado (fecha, artículo, almacén, cantidad, para quién, proveedor, albarán, nota y, en pistones, nuevos o recuperados) */
async function patchMov(m,pt){if(db.itemsPatchId){await db.itemsPatchId("mov",mesDe(m.f),[Object.assign({},pt,{id:m.id})]);return;}
  const ref=db.doc("mov/"+mesDe(m.f)),sn=await ref.get();if(!sn.exists)return;await ref.set({items:(sn.data().items||[]).map(x=>x.id===m.id?Object.assign({},x,pt):x)});}
function editMov(m0){const m=Object.assign({},m0),a0=art(m.art),ligado=!!pistDeMov(m.id)||!!m.trep;const v={f:m.f,art:m.art,alm:m.alm,dest:m.dest||"",cant:String(m.tipo==="ajuste"?(m.contado!=null?m.contado:""):m.cant),maq:m.maq||(m.nave?"nave:"+m.nave:""),prov:m.prov||"",alb:m.alb||"",nota:m.nota||"",rec:esEntRec(m)};
  const box=el("div",{style:"display:grid;gap:10px"});
  const pinta=()=>{box.textContent="";const a=art(v.art);
    if(ligado)box.appendChild(el("div",{class:"banner w",text:m.trep?"Viene de la vuelta de tolvas del taller: aquí solo se cambian el albarán y la nota.":"Es un cambio de pistón: aquí solo se cambian la nota y el albarán. Si está mal la máquina, la medida o la cantidad, bórralo y apúntalo de nuevo."}));
    if(!ligado){box.appendChild(el("div",{class:"row"},[fld("Fecha",inp("emF",v.f,x=>v.f=x,{type:"date"})),m.tipo==="ajuste"?null:fld("Artículo",sel("emArt",artOpts(),v.art,x=>{v.art=x;pinta();}))]));
      box.appendChild(el("div",{class:"row"},[m.tipo==="ajuste"?null:fld(m.tipo==="traslado"?"Desde":"Almacén",sel("emAlm",almOptsArt(a),v.alm,x=>v.alm=x)),m.tipo==="traslado"?fld("Hasta",sel("emDest",almOptsArt(a,v.alm),v.dest,x=>v.dest=x,"Destino…")):null,
        m.tipo==="ajuste"?null:fld("Cantidad",inp("emCant",v.cant,x=>v.cant=x,{inputmode:"decimal",class:"num"}))]));
      if(m.tipo==="salida")box.appendChild(fld("Para (inyectora o nave)",sel("emMaq",paraOpts(),v.maq,x=>v.maq=x,"—")));}
    if(m.tipo==="entrada"&&a&&a.fam==="piston")box.appendChild(el("div",{class:"seg",role:"group","aria-label":"Pistones nuevos o recuperados"},[[false,"Nuevos"],[true,"Recuperados"]].map(([r,l])=>el("button",{type:"button","aria-pressed":String(v.rec===r),text:l,onclick:()=>{v.rec=r;pinta();}}))));
    if(m.tipo==="entrada")box.appendChild(el("div",{class:"row"},[ligado?null:fld("Proveedor",sel("emProv",provOpts(),v.prov,x=>v.prov=x,"—")),fld("Nº albarán",inp("emAlb",v.alb,x=>v.alb=x,{autocomplete:"off"}))]));
    box.appendChild(fld("Nota",inp("emNota",v.nota,x=>v.nota=x,{autocomplete:"off"})));};
  pinta();
  dlg("Modificar "+(TIPOS[m.tipo]||"movimiento").toLowerCase(),[el("p",{class:"hint",text:(a0?a0.desc:"")+" · "+fmtF(m.f)+". El stock se recalcula solo."}),box],[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{
    const pt={nota:String(v.nota).trim()||null};const a=art(v.art);
    if(m.tipo==="entrada"){pt.alb=String(v.alb).trim()||null;if(a&&a.fam==="piston")pt.rec=!!v.rec;}
    if(!ligado){if(!v.f){toast("Pon la fecha");return false;}if(m.tipo!=="ajuste"){const q=parseN(v.cant);if(!a){toast("Elige el artículo");return false;}if(!v.alm){toast("Elige el almacén");return false;}if(!(isFinite(q)&&q>0)){toast("Escribe una cantidad válida");return false;}
        if(m.tipo==="traslado"&&(!v.dest||v.dest===v.alm)){toast("Elige un destino distinto");return false;}Object.assign(pt,{art:v.art,alm:v.alm,cant:q});if(m.tipo==="traslado")pt.dest=v.dest;
        if(m.tipo==="salida"){pt.maq=null;pt.nave=null;ponPara(pt,v.maq);}if(m.tipo==="entrada")pt.prov=v.prov||null;}
      pt.f=v.f;}
    try{if(pt.f&&mesDe(pt.f)!==mesDe(m.f)){const nu=Object.assign({},m0,pt);Object.keys(nu).forEach(k=>{if(nu[k]==null)delete nu[k];});await delMov(m.id,m.f);await addMovs([nu]);}
      else await patchMov(m,pt);}catch(e){toast("No se pudo guardar");return false;}
    toast("Movimiento modificado");render(true);}}]);}

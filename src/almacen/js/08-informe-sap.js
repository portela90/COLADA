/* ===== INFORME SAP ===== */
/* ---------- elegir qué incluir en un informe (se recuerda en este dispositivo, por informe) ---------- */
function incluirSel(id,ops){let g={};const s={};ops.forEach(o=>{if(o[0]==="#")return;s[o[0]]=o[0] in g?!!g[o[0]]:o[2]!==false;});return s;}
function incluirChips(id,ops,onch,titulo){return{node:document.createElement("span"),sel:incluirSel(id,ops)};const s=incluirSel(id,ops);const box=document.createElement("div");box.className="inc";
  const lab=document.createElement("div");lab.className="inc-t";lab.textContent=titulo||"Qué incluir (toca para quitar o poner):";box.appendChild(lab);
  let row=null;const fila=()=>{row=document.createElement("div");row.className="inc-r";box.appendChild(row);};fila();
  ops.forEach(o=>{if(o[0]==="#"){const g=document.createElement("div");g.className="inc-g";g.textContent=o[1];box.appendChild(g);fila();return;}
    const b=document.createElement("button");b.type="button";b.className="chip";b.textContent=o[1];b.setAttribute("aria-pressed",String(s[o[0]]));
    b.onclick=()=>{s[o[0]]=!s[o[0]];b.setAttribute("aria-pressed",String(s[o[0]]));let g={};try{g=JSON.parse(localStorage.getItem("inf."+id)||"{}");}catch(e){}g[o[0]]=s[o[0]];try{localStorage.setItem("inf."+id,JSON.stringify(g));}catch(e){}if(onch)onch(s);};row.appendChild(b);});
  return{node:box,sel:s};}
const OPS_PIST=[["res","Resumen por diámetro"],["det","Detalle de cada cambio"],["#","En el detalle"],["mot","Motivo"],["resp","Responsable"],["dest","Pistón usado"],["alm","Almacén de salida"],["obs","Observaciones"]];

function datosInforme(desde,hasta){const en=f=>f>=desde&&f<=hasta;const cam=todosPist().filter(p=>en(p.f));
  const pids=DIAM.map(pistArt).filter(Boolean);const ids=pids.map(a=>a.id);
  const aj=todosMov().filter(m=>m.tipo==="ajuste"&&ids.includes(m.art)&&en(m.f)&&m.cant);const ent=todosMov().filter(m=>m.tipo==="entrada"&&ids.includes(m.art)&&en(m.f));
  const porD={};cam.forEach(p=>{porD[p.diam]=(porD[p.diam]||0)+(+p.cant||1);});return{cam,aj,ent,porD,pids};}
function respTxt(r){if(!r)return"sin indicar";const t=String(r).trim();const o=(cat.operarios||[]).find(x=>(x.num&&String(x.num)===t)||(x.nom&&norm(x.nom)===norm(t)));if(o&&o.num&&o.nom)return"Nº "+o.num+" · "+o.nom;return /^\d+$/.test(t)?"Nº "+t:t;}
function almDeCambio(p){if(!p.movId)return"";const m=todosMov().find(x=>x.id===p.movId);return m?almN(m.alm):"";}
function textoInforme(desde,hasta,s,u){const t=textoInforme0(desde,hasta,s);return u?t+"\n\n"+textoUsados():t;}
function textoInforme0(desde,hasta,s){s=s||incluirSel("pist",OPS_PIST);const{cam,porD}=datosInforme(desde,hasta);const tot=Object.values(porD).reduce((a,b)=>a+b,0);
  const L=["CAMBIOS DE PISTÓN · MAPRI",desde===hasta?"Día "+fmtF(desde):"Del "+fmtF(desde)+" al "+fmtF(hasta),""];
  if(!cam.length){L.push("No se ha cambiado ningún pistón en este periodo.");return L.join("\n");}
  if(s.res){L.push("RESUMEN ("+tot+" pistones):");DIAM.forEach(x=>{if(porD[x]){const a=pistArt(x);L.push("- "+(a&&a.cod?"["+a.cod+"] ":"")+"Pistón "+x+": "+porD[x]+" ud");}});}
  else L.push("Total: "+tot+" pistones");
  if(!s.det)return L.join("\n");
  L.push("","DETALLE DE CADA CAMBIO:");
  cam.forEach((p,i)=>{const mq=cat.maquinas.find(z=>z.id===p.maq);const a=pistArt(p.diam);
    L.push("",""+(i+1)+". "+fmtF(p.f)+" · Inyectora "+maqN(p.maq)+(mq&&mq.nave?" ("+mq.nave+")":""));
    L.push("   Pistón "+p.diam+(a&&a.cod?" ["+a.cod+"]":"")+" · "+(+p.cant||1)+" ud");
    if(s.mot)L.push("   Motivo: "+cap(p.motivo||"—"));
    if(s.resp)L.push("   Responsable: "+respTxt(p.resp));
    if(s.dest&&p.dest)L.push("   Pistón usado: "+cap(p.dest));
    const al=s.alm?almDeCambio(p):"";if(al)L.push("   Salió de: "+al);
    if(s.obs&&p.nota)L.push("   Observaciones: "+p.nota);});
  return L.join("\n");}
/* destinataria del informe diario de pistones (se cambia en Catálogo > Informe de pistones) */
const destPist=()=>Object.assign({nom:"Beatriz Arrizabalaga",email:"",tel:""},(cat.ajustes||{}).infP||{});
function formDestPist(despues){const x=destPist();
  dlg("Informe de pistones: a quién se envía",[fld("Nombre",inp("dpN",x.nom,v=>x.nom=v,{autocomplete:"off"})),fld("Correo",inp("dpE",x.email,v=>x.email=v,{type:"email",autocomplete:"off",inputmode:"email"})),fld("Teléfono / WhatsApp (opcional)",inp("dpT",x.tel,v=>x.tel=v,{type:"tel",autocomplete:"off"}))],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{cat.ajustes=Object.assign({},cat.ajustes,{infP:{nom:(x.nom||"").trim()||"Beatriz Arrizabalaga",email:(x.email||"").trim(),tel:(x.tel||"").trim()}});try{await saveCat();toast("Guardado");}catch(e){return false;}render(true);if(despues)setTimeout(despues,0);}}]);}
/* Cambios de pistón sin informar: con fecha posterior al último informe, o apuntados después de enviarlo
   aunque lleven una fecha anterior (p. ej. un cambio de ayer que se apunta hoy). */
function pistPend(){const aj=cat.ajustes||{},u=aj.ultInfPist,uts=+aj.ultInfPistTs||0;return todosPist().filter(p=>!u||p.f>u||(uts&&(+p.ts||0)>uts));}
function informePist(){const aj=cat.ajustes||{};const hy=hoy();const f={desde:aj.ultInfPist&&aj.ultInfPist<hy?sumaDias(aj.ultInfPist,1):hy,hasta:hy};
  const tarde=pistPend().filter(p=>aj.ultInfPist&&p.f<=aj.ultInfPist);if(tarde.length){const mn=tarde.map(p=>p.f).sort()[0];if(mn<f.desde)f.desde=mn;}
  const D=destPist(),pn=(D.nom||"").split(" ")[0];
  const ta=el("textarea",{id:"ipTxt",readonly:true,style:"min-height:280px;font-family:'IBM Plex Mono',monospace;font-size:12.5px"});
  const mail=el("a",{class:"btn",target:"_blank",rel:"noopener",style:"text-align:center;text-decoration:none",text:"Enviar por correo a "+pn});
  const wa=el("a",{class:"btn sec",target:"_blank",rel:"noopener",style:"text-align:center;text-decoration:none",text:"Enviar por WhatsApp"+(D.tel?" a "+pn:"")});
  const chP=incluirChips("pist",OPS_PIST,()=>pinta());
  const usC=el("input",{type:"checkbox",onchange:()=>pinta()});const usL=el("label",{class:"chk"},[usC," Añadir los pistones usados (zona, "+PU_REC+" y chatarra)"]);
  const pinta=()=>{if(f.desde>f.hasta)f.desde=f.hasta;ta.value=textoInforme(f.desde,f.hasta,chP.sel,usC.checked);
    const per=f.desde===f.hasta?fmtF(f.desde):fmtF(f.desde)+" al "+fmtF(f.hasta);
    mail.href="mailto:"+encodeURIComponent(D.email||"")+"?subject="+encodeURIComponent("Consumo de pistones MAPRI · "+per)+"&body="+encodeURIComponent("Hola "+pn+",\n\nTe paso el consumo de pistones"+(f.desde===f.hasta?" del "+fmtF(f.desde):" del "+per)+".\n\n"+ta.value+"\n\nUn saludo.");
    wa.href="https://wa.me/"+(telWA(D.tel)||"")+"?text="+encodeURIComponent(ta.value);};pinta();
  const acts=[{t:"Copiar",cls:"sec",fn:async()=>{try{await navigator.clipboard.writeText(ta.value);toast("Informe copiado");}catch(e){ta.focus();ta.select();toast("Selecciona el texto y cópialo");}return false;}}];
  if(downloads)acts.push({t:"Excel para SAP",cls:"sec",fn:async()=>{await excelInforme(f.desde,f.hasta);return false;}});
  acts.push({t:"Marcar como enviado",fn:async()=>{cat.ajustes=Object.assign({},cat.ajustes,{ultInfPist:f.hasta>(aj.ultInfPist||"")?f.hasta:aj.ultInfPist,ultInfPistTs:Date.now()});try{await saveCat();toast("Informado hasta el "+fmtF(f.hasta));}catch(e){return false;}render(true);}});
  acts.push({t:"Cerrar",cls:"sec"});
  let cerrar=null;
  cerrar=dlg("Informe diario de pistones",[el("p",{class:"sub"},["Para: ",el("b",{text:D.nom}),D.email?" · "+D.email:" · sin correo guardado"," ",el("button",{type:"button",class:"btn txt peq",style:"color:var(--acc)",text:"Cambiar",onclick:()=>{if(cerrar)cerrar();formDestPist(informePist);}})]),
    el("div",{class:"row"},[fld("Desde",inp("ipD",f.desde,v=>{f.desde=v;pinta();},{type:"date"})),fld("Hasta",inp("ipH",f.hasta,v=>{f.hasta=v;pinta();},{type:"date"}))]),
    el("p",{class:"hint",text:aj.ultInfPist?"Último informe enviado: hasta el "+fmtF(aj.ultInfPist)+". Por defecto empieza el día siguiente para no dejar huecos ni repetir."+(tarde.length?" Ojo: hay "+tarde.length+" cambio"+(tarde.length===1?"":"s")+" apuntado"+(tarde.length===1?"":"s")+" después del último envío con fecha "+[...new Set(tarde.map(p=>fmtF(p.f)))].join(", ")+", por eso empieza en esa fecha.":""):"Es el primer informe: elige desde qué día."}),
    chP.node,usL,ta,mail,wa,
    el("p",{class:"hint",text:"«Enviar por correo» abre tu aplicación de correo con el informe ya escrito"+(D.email?" para "+D.email:"; como no hay correo guardado tendrás que ponerlo tú (guárdalo con «Cambiar»)")+". Después pulsa «Marcar como enviado» para que el siguiente informe empiece donde acaba este."}),
    el("p",{class:"hint",text:"Si los pistones tienen el código de material de SAP en su ficha (campo Código), sale entre corchetes."})],acts);}
async function excelInforme(desde,hasta){try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();const{cam,porD}=datosInforme(desde,hasta);
  const res=DIAM.filter(x=>porD[x]).map(x=>{const a=pistArt(x);return{"Código material":a&&a.cod||"","Descripción":"Pistón "+x,"Cantidad":porD[x],"Unidad":"ud","Desde":desde,"Hasta":hasta};});
  X.utils.book_append_sheet(wb,X.utils.json_to_sheet(res.length?res:[{"Sin consumos":""}]),"Consumo por material");
  X.utils.book_append_sheet(wb,X.utils.json_to_sheet(cam.length?cam.map(p=>{const a=pistArt(p.diam);const mq=cat.maquinas.find(z=>z.id===p.maq);return{"Fecha":p.f,"Código material":a&&a.cod||"","Descripción":"Pistón "+p.diam,"Cantidad":+p.cant||1,"Unidad":"ud","Inyectora":maqN(p.maq),"Nave":mq&&mq.nave||"","Motivo":cap(p.motivo),"Responsable":p.resp?respTxt(p.resp):"","Pistón usado":cap(p.dest||""),"Salió de":almDeCambio(p),"Observaciones":p.nota||""};}):[{"Sin consumos":""}]),"Detalle");
  await downloads.save({filename:"Consumo_pistones_"+desde+(desde!==hasta?"_a_"+hasta:"")+".xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Excel descargado");
}catch(e){toast(e&&e.code==="declined"?"Descarga cancelada":"No se pudo crear el Excel");}}

/* ===== INFORMES DE CONSUMO POR PERSONA (aceites, taladrinas y consumibles; los pistones tienen su informe) ===== */
const PERS_INF=[{k:"marta",nom:"Marta"},{k:"beatriz",nom:"Beatriz"}];
const persInf=k=>PERS_INF.find(p=>p.k===k)||{k,nom:k};
const artsDe=k=>artsActivos().filter(a=>a.inf===k&&a.fam!=="piston");
function formInfArts(){const cont=el("div",{class:"lst"});
  const pinta=()=>{cont.textContent="";
    cat.articulos.filter(a=>a.activo!==false&&a.fam!=="piston").sort((a,b)=>a.desc.localeCompare(b.desc,"es",{numeric:true})).forEach(a=>cont.appendChild(el("div",{class:"it",style:"display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap"},[
      el("span",{style:"flex:1;min-width:160px",text:a.desc}),
      el("div",{style:"display:flex;gap:6px"},PERS_INF.map(p=>el("button",{type:"button",class:"chip","aria-pressed":String(a.inf===p.k),text:p.nom,onclick:async()=>{a.inf=a.inf===p.k?"":p.k;try{await saveCat();}catch(e){toast("No se pudo guardar");}pinta();}})))])));};
  pinta();
  dlg("Qué lleva cada persona",[el("p",{class:"hint",text:"Toca el nombre para marcar el producto; si lo tocas otra vez se quita. Los pistones van en su informe de pistones."}),cont],[{t:"Cerrar",cls:"sec"}]);}
function textoInfPers(k,desde,hasta){const set=new Set(artsDe(k).map(a=>a.id));const en=f=>f>=desde&&f<=hasta;
  const movs=todosMov().filter(m=>m.tipo==="salida"&&en(m.f)&&set.has(m.art)).sort((a,b)=>(a.f+"|"+a.ts).localeCompare(b.f+"|"+b.ts));
  if(!movs.length)return "Sin consumos en este periodo.";
  const nomA=id=>{const a=cat.articulos.find(x=>x.id===id);return a?a.desc:id;};const udA=id=>{const a=cat.articulos.find(x=>x.id===id);return a&&a.ud||"";};
  const tot={};movs.forEach(m=>{tot[m.art]=(tot[m.art]||0)+(+m.cant||0);});
  const L=["RESUMEN"];Object.keys(tot).forEach(id=>L.push("- "+nomA(id)+": "+fmtN(tot[id])+" "+udA(id)));
  L.push("","DETALLE");movs.forEach(m=>L.push(fmtF(m.f)+" · "+nomA(m.art)+" · "+fmtN(+m.cant||0)+" "+udA(m.art)+(m.nota?" · "+m.nota:"")));
  return L.join("\n");}
function informePersona(k){const P=persInf(k),aj=cat.ajustes||{};const ult=(aj.ultInfPers||{})[k]||"";const hy=hoy();
  const f={desde:ult&&ult<hy?sumaDias(ult,1):hy,hasta:hy};
  const ta=el("textarea",{readonly:true,style:"min-height:260px;font-family:'IBM Plex Mono',monospace;font-size:12.5px"});
  const mail=el("a",{class:"btn",target:"_blank",rel:"noopener",style:"text-align:center;text-decoration:none",text:"Enviar por correo a "+P.nom});
  const pinta=()=>{if(f.desde>f.hasta)f.desde=f.hasta;const t=textoInfPers(k,f.desde,f.hasta);ta.value=t;
    const per=f.desde===f.hasta?fmtF(f.desde):fmtF(f.desde)+" al "+fmtF(f.hasta);
    mail.href="mailto:?subject="+encodeURIComponent("Consumo de materiales MAPRI · "+per)+"&body="+encodeURIComponent("Hola "+P.nom+",\n\nTe paso el consumo de "+per+".\n\n"+t+"\n\nUn saludo.");};
  pinta();
  const acts=[{t:"Copiar",cls:"sec",fn:async()=>{try{await navigator.clipboard.writeText(ta.value);toast("Informe copiado");}catch(e){ta.focus();ta.select();toast("Selecciona el texto y cópialo");}return false;}},
    {t:"Marcar como enviado",fn:async()=>{cat.ajustes=Object.assign({},cat.ajustes,{ultInfPers:Object.assign({},(cat.ajustes||{}).ultInfPers||{},{[k]:f.hasta})});try{await saveCat();toast("Informado hasta el "+fmtF(f.hasta));}catch(e){return false;}render(true);}},
    {t:"Cerrar",cls:"sec"}];
  dlg("Informe para "+P.nom,[el("p",{class:"hint",text:ult?"Último informe enviado: hasta el "+fmtF(ult)+". Por defecto empieza el día siguiente para no dejar huecos ni repetir.":"Es el primer informe: elige desde qué día."}),
    el("div",{class:"row"},[fld("Desde",inp("ipPD",f.desde,v=>{f.desde=v;pinta();},{type:"date"})),fld("Hasta",inp("ipPH",f.hasta,v=>{f.hasta=v;pinta();},{type:"date"}))]),
    ta,mail,el("p",{class:"hint",text:"«Enviar por correo» abre tu correo con el informe escrito; pon tú la dirección de "+P.nom+"."})],acts);}

/* ===== INVENTARIO ===== */
function formInventario(pre){const f=Object.assign({f:hoy(),alm:(cat.almacenes[0]||{}).id||"",fam:"",c:{}},pre||{});const tb=el("tbody");const res=el("p",{class:"hint"});
  const lista=()=>artsActivos().filter(a=>(!f.fam||a.fam===f.fam)&&(f.todo||almsDe(a).some(l=>l.id===f.alm))).sort((a,b)=>(a.ubic||"~").localeCompare(b.ubic||"~","es",{numeric:true})||a.desc.localeCompare(b.desc,"es",{numeric:true}));
  function resumen(){let n=0,d=0;lista().forEach(a=>{const c=parseN(f.c[a.id]);if(isFinite(c)){n++;if(c!==stockDe(a.id,f.alm))d++;}});res.textContent=n+" contados · "+d+" con diferencia";}
  function pinta(){tb.textContent="";lista().forEach(a=>{const t=stockDe(a.id,f.alm);
    const cel=el("td",{class:"r num",text:"—"});const upd=v=>{const n=parseN(v);const df=isFinite(n)?n-t:null;cel.textContent=df==null?"—":(df>=0?"+":"−")+fmtN(Math.abs(df));cel.className="r num"+(df&&(n===0||Math.abs(df)/Math.max(n,1)>0.1)?" bad":"");};
    const i=inp("iv"+a.id,f.c[a.id],v=>{f.c[a.id]=v;upd(v);resumen();},{inputmode:"decimal",class:"num",style:"width:64px;padding:7px 6px;font-size:16px"});upd(f.c[a.id]);
    tb.appendChild(el("tr",{},[el("td",{},[el("div",{text:a.desc}),el("div",{class:"sub",text:[a.ubic,a.ud].filter(Boolean).join(" · ")})]),el("td",{class:"r num",text:fmtN(t)}),el("td",{},i),cel]));});resumen();}
  pinta();
  dlg("Inventario de almacén",[el("div",{class:"row"},[fld("Almacén",sel("ivAlm",almOpts(),f.alm,v=>{f.alm=v;f.c={};pinta();})),fld("Fecha",inp("ivF",f.f,v=>f.f=v,{type:"date"}))]),
    el("div",{class:"chips"},[["","Todo"]].concat(Object.entries(FAM)).map(([k,t])=>{const b=el("button",{type:"button",class:"chip","aria-pressed":String(f.fam===k),text:t});b.onclick=()=>{f.fam=k;b.parentNode.querySelectorAll("button").forEach(z=>z.setAttribute("aria-pressed",String(z===b)));pinta();};return b;})),
    el("label",{class:"chk"},[el("input",{type:"checkbox",id:"ivTodo",onchange:e=>{f.todo=e.target.checked;pinta();}}),"Ver también artículos que no están asignados a este almacén"]),
    el("p",{class:"hint",text:"Recorre el almacén por ubicación y escribe lo que cuentas. Deja en blanco lo que no cuentes. La diferencia queda como ajuste, no como consumo. En rojo, diferencias de más del 10 %."}),
    el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Artículo"}),el("th",{class:"r",text:"Teórico"}),el("th",{text:"Contado"}),el("th",{class:"r",text:"Dif."})])),tb])),res],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar inventario",fn:async()=>{if(!db){toast("No se puede guardar");return false;}if(!f.alm||!f.f){toast("Elige almacén y fecha");return false;}
      const list=[];artsActivos().forEach(a=>{const c=parseN(f.c[a.id]);if(!isFinite(c)||c<0)return;const t=stockA(a.id,f.alm,f.f);list.push({f:f.f,tipo:"ajuste",art:a.id,alm:f.alm,cant:Math.round((c-t)*1000)/1000,contado:c,teorico:t,nota:"Inventario de "+almN(f.alm)});});
      if(!list.length){toast("No has contado nada");return false;}
      try{await addMovs(list);toast("Inventario guardado ("+list.length+" artículos)");}catch(e){toast("No se pudo guardar");return false;}render(true);}}]);}

/* ===== PEDIDOS Y COPIA ===== */
function formAjustes(){const x=Object.assign({},cat.ajustes||{});
  dlg("Responsable de pedidos",[fld("Nombre",inp("ajR",x.resp,v=>x.resp=v,{autocomplete:"off"})),fld("Correo",inp("ajE",x.email,v=>x.email=v,{type:"email",autocomplete:"off"})),fld("Teléfono / WhatsApp",inp("ajT",x.tel,v=>x.tel=v,{type:"tel",autocomplete:"off"}))],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{cat.ajustes=Object.assign({},cat.ajustes,{resp:(x.resp||"").trim()||null,email:(x.email||"").trim()||null,tel:(x.tel||"").trim()||null});try{await saveCat();toast("Guardado");}catch(e){return false;}render(true);}}]);}
function cantPedir(a){return Math.max(0,Math.ceil((+a.min||0)+consPlazo(a)-stockDe(a.id)));}
const OPS_PED=[["art","Artículos a pedir"],["calc","Cálculo (stock, mínimo, plazo)"],["eje","Ejes en el mínimo"]];
function textoPedido(s){s=s||incluirSel("pedido",OPS_PED);const hy=hoy();const arts=artsActivos().filter(a=>cantPedir(a)>0).sort((a,b)=>a.fam.localeCompare(b.fam)||a.desc.localeCompare(b.desc,"es",{numeric:true}));
  const L=["PEDIDO DE MATERIAL · MAPRI · "+fmtF(hy),""];
  if(s.art&&arts.length){const g={};arts.forEach(a=>{const k=provN(a.prov)||"SIN PROVEEDOR ASIGNADO";(g[k]=g[k]||[]).push(a);});
    Object.keys(g).sort((x,y)=>(x==="SIN PROVEEDOR ASIGNADO")-(y==="SIN PROVEEDOR ASIGNADO")||x.localeCompare(y)).forEach(k=>{const pv=cat.proveedores.find(x=>x.nom===k);
      L.push("PROVEEDOR: "+k.toUpperCase()+(pv&&pv.plazo?" (plazo "+pv.plazo+" días)":""));g[k].forEach(a=>{
    L.push("- "+a.desc+(a.cod?" ["+a.cod+"]":"")+": pedir "+fmtN(cantPedir(a))+" "+a.ud+(s.calc?" (stock "+fmtN(stockDe(a.id))+", mínimo "+fmtN(+a.min||0)+(consPlazo(a)>0?", consumo en "+plazoArt(a)+" días de plazo: "+fmtN(Math.round(consPlazo(a)*10)/10):"")+")":"")+(nivel(a)==="bad"?" · URGENTE":"")+(a.pedido?" · ya pedido el "+fmtF(a.pedido):""));});L.push("");});}
  const bajos=(cat.modelos||[]).map(m=>({m,p:plantaG(m),f:ejes.filter(e=>grupoEje(m).some(g=>g.cod===e.mod)&&e.estado!=="planta").length})).filter(x=>+x.m.min>0&&x.p<=+x.m.min).filter(unoPorGrupo);
  if(s.eje&&bajos.length){L.push("EJES EN EL MÍNIMO (en planta / mínimo):");bajos.forEach(({m,p,f})=>L.push("- "+grupoNom(m)+": "+p+" / "+m.min+(f?" · "+f+" fuera en reparación":"")));L.push("");}
  if((!s.art||!arts.length)&&(!s.eje||!bajos.length))L.push(!arts.length&&!bajos.length?"Todo por encima del mínimo. No hace falta pedir nada.":"No has elegido nada que incluir.");
  return{txt:L.join("\n").trim(),arts};}
function listaPedido(){const{txt,arts}=textoPedido();const aj=cat.ajustes||{};
  const ta=el("textarea",{id:"lpTxt",readonly:true,style:"min-height:260px;font-family:'IBM Plex Mono',monospace;font-size:13px",value:txt});
  let waA=null;const chPd=incluirChips("pedido",OPS_PED,sl=>{ta.value=textoPedido(sl).txt;if(waA)waA.href="https://wa.me/"+(telWA(aj.tel)||"")+"?text="+encodeURIComponent(ta.value);});
  const acts=[{t:"Copiar texto",fn:async()=>{try{await navigator.clipboard.writeText(ta.value);toast("Lista copiada");}catch(e){ta.focus();ta.select();toast("Selecciona el texto y cópialo");}return false;}}];
  const pend=arts.filter(a=>!a.pedido);
  if(pend.length)acts.push({t:"Marcar como pedido ("+pend.length+")",cls:"sec",fn:async()=>{pend.forEach(a=>{const x=art(a.id);if(x)aplicarPedido(x,hoy());});try{await saveCat();toast("Marcado como pedido");}catch(e){return false;}render(true);}});
  acts.push({t:"Cerrar",cls:"sec"});
  dlg("Lista de pedido",[aj.resp||aj.email?el("p",{class:"sub"},["Para: ",el("b",{text:[aj.resp,aj.email].filter(Boolean).join(" · ")})]):el("p",{class:"hint",text:"Pon el responsable de pedidos en Catálogo > Pedidos."}),chPd.node,ta,
    waA=el("a",{class:"btn sec",href:"https://wa.me/"+(telWA(aj.tel)||"")+"?text="+encodeURIComponent(ta.value),target:"_blank",rel:"noopener",style:"text-align:center;text-decoration:none",text:"Enviar por WhatsApp"+(aj.resp?" a "+aj.resp.split(" ")[0]:"")}),
    el("p",{class:"hint",text:"Cantidad a pedir = mínimo + lo que se gasta durante el plazo de entrega − stock actual. Así, cuando llegue el pedido, sigues teniendo el mínimo."})],acts);}
const PLANT=["Descripción","Código","Familia","Unidad","Almacén","Cantidad","Stock mínimo","Punto de pedido","Proveedor","Plazo (días)","Ubicación","Nº plano","Inyectoras"];
async function descargarPlantilla(btn){if(!downloads){toast("Esta vista no permite descargar archivos");return;}btn.disabled=true;
  try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();
    const ej=[{"Descripción":"Manguera reforzada agua y aire 1/2\"","Código":"MAN-12","Familia":"Consumible","Unidad":"m","Almacén":(cat.almacenes[1]||cat.almacenes[0]||{}).nom||"Nave 1","Cantidad":50,"Stock mínimo":20,"Punto de pedido":"","Proveedor":(cat.proveedores[0]||{}).nom||"","Plazo (días)":7,"Ubicación":"E1-B2"},
      {"Descripción":"Guantes anticorte talla 9","Código":"","Familia":"Consumible","Unidad":"ud","Almacén":(cat.almacenes[0]||{}).nom||"Almacén general","Cantidad":24,"Stock mínimo":10,"Punto de pedido":"","Proveedor":"","Plazo (días)":"","Ubicación":"E2-B1"}];
    const ws=X.utils.json_to_sheet(ej,{header:PLANT});ws["!cols"]=PLANT.map(h=>({wch:h==="Descripción"?36:14}));X.utils.book_append_sheet(wb,ws,"Artículos");
    const inf=[["Cómo rellenarla"],["Una fila por artículo y almacén. Solo la Descripción es obligatoria."],["Si pones Cantidad, se registra como recuento en ese almacén: el stock queda exactamente en esa cantidad."],["Si el artículo ya existe (mismo código o misma descripción), se actualizan sus datos."],["Borra las dos filas de ejemplo antes de importar."],[""],["Almacenes válidos:"]].concat(cat.almacenes.map(l=>[l.nom])).concat([[""],["Familias: Consumible, Pistón, Barra expulsora, Tornillo tope, Eje, Repuesto, Otro"],["Inyectoras (para barras y tornillos): separadas por comas, p. ej. F53, F54, F63 (o F54-63)"],["Unidades: "+UDS.join(", ")]]);
    X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(inf),"Instrucciones");
    await downloads.save({filename:"Plantilla_articulos_almacen.xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Plantilla descargada");
  }catch(e){toast(e&&e.code==="declined"?"Descarga cancelada":"No se pudo crear la plantilla");}btn.disabled=false;}
const norm=t=>String(t==null?"":t).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
async function importarExcel(file){try{await cargarXLSX();}catch(e){toast("No se pudo cargar el lector de Excel");return;}
  let rows;try{const X=window.XLSX;const wb=X.read(await file.arrayBuffer());rows=X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});}catch(e){toast("No se pudo leer el archivo");return;}
  const col=(r,keys)=>{for(const k of Object.keys(r)){const n=norm(k);if(keys.some(x=>n.startsWith(x)))return r[k];}return"";};
  const plan=[],errs=[],provNue={};
  rows.forEach((r,i)=>{const desc=String(col(r,["descrip","articulo","nombre"])).trim();if(!desc)return;
    const cod=String(col(r,["codigo","ref"])).trim()||null;const fm=norm(col(r,["famil"]));const fam=fm.startsWith("pist")?"piston":fm.startsWith("barr")?"barra":fm.startsWith("torn")?"tornillo":fm.startsWith("rep")?"repuesto":fm.startsWith("eje")?"eje":fm.startsWith("otr")?"otro":"consumible";
    const udR=norm(col(r,["unid"]));const ud=UDS.includes(udR)?udR:(udR.startsWith("metro")?"m":udR.startsWith("litro")?"l":udR.startsWith("kilo")?"kg":"ud");
    const almR=norm(col(r,["almacen"]));const alm=almR?cat.almacenes.find(l=>norm(l.nom)===almR||norm(l.nom).includes(almR)||almR.includes(norm(l.nom))):null;
    const num=v=>{const n=parseN(v);return isFinite(n)&&n>=0?n:null;};const cant=num(col(r,["cantidad","stock actual","existencia"]));
    const provR=String(col(r,["provee"])).trim();let prov=null;if(provR){const pv=cat.proveedores.find(x=>norm(x.nom)===norm(provR));if(pv)prov=pv.id;else{provNue[norm(provR)]=provNue[norm(provR)]||{id:uid(),nom:provR};prov=provNue[norm(provR)].id;}}
    const ex=cat.articulos.find(a=>(cod&&a.cod&&norm(a.cod)===norm(cod))||norm(a.desc)===norm(desc))||plan.find(p=>(cod&&p.cod&&norm(p.cod)===norm(cod))||norm(p.desc)===norm(desc));
    if(cant!=null&&!alm){errs.push("Fila "+(i+2)+": «"+desc+"» tiene cantidad pero el almacén «"+(col(r,["almacen"])||"vacío")+"» no existe");return;}
    plan.push({fila:i+2,ex:ex&&!ex.fila?ex:null,dup:ex&&ex.fila?ex:null,desc,cod,fam,ud,alm:alm?alm.id:null,cant,min:num(col(r,["stock min","minimo","min"])),pp:num(col(r,["punto"])),plazo:num(col(r,["plazo"])),prov,ubic:String(col(r,["ubica"])).trim()||null,plano:String(col(r,["n plano","nº plano","plano"])).trim()||null,
      iny:(()=>{const t=String(col(r,["inyect","maquina"])).toUpperCase().replace(/\s/g,"");if(!t)return null;const out=[];t.split(/[,;\/]+/).forEach(g=>{g.split("-").forEach(x=>{const c=x.startsWith("F")?x:"F"+x;const m=cat.maquinas.find(z=>z.cod.toUpperCase()===c);if(m)out.push(m.id);});});return out;})()});});
  if(!plan.length){toast(errs.length?errs[0]:"No hay filas con descripción");return;}
  const nuevos=plan.filter(p=>!p.ex&&!p.dup).length,act=plan.length-nuevos,conCant=plan.filter(p=>p.cant!=null).length;
  const tb=el("tbody",{},plan.slice(0,40).map(p=>el("tr",{},[el("td",{},[el("div",{text:p.desc}),el("div",{class:"sub",text:[p.cod,p.ubic].filter(Boolean).join(" · ")})]),el("td",{text:p.alm?almN(p.alm):"—"}),el("td",{class:"r num",text:p.cant!=null?fmtN(p.cant):"—"}),el("td",{class:"r num",text:p.min!=null?fmtN(p.min):"—"}),el("td",{},el("span",{class:"pill "+(p.ex||p.dup?"info":"ok"),text:p.ex||p.dup?"Actualiza":"Nuevo"}))])));
  dlg("Importar "+plan.length+" filas",[el("p",{text:nuevos+" artículos nuevos · "+act+" ya existentes (se actualizan) · "+conCant+" con cantidad (se registran como recuento)"+(Object.keys(provNue).length?" · proveedores nuevos: "+Object.values(provNue).map(x=>x.nom).join(", "):"")}),
    errs.length?el("div",{class:"banner"},[el("b",{text:errs.length+" filas no se importarán:"}),el("div",{style:"font-size:13px;margin-top:4px"},errs.slice(0,8).map(t=>el("div",{text:t})))]):null,
    el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Artículo"}),el("th",{text:"Almacén"}),el("th",{class:"r",text:"Cant."}),el("th",{class:"r",text:"Mín."}),el("th",{text:""})])),tb])),
    plan.length>40?el("p",{class:"hint",text:"… y "+(plan.length-40)+" filas más."}):null],
    [{t:"Cancelar",cls:"sec"},{t:"Importar",fn:async()=>{if(!db){toast("No se puede guardar");return false;}
      Object.values(provNue).forEach(x=>cat.proveedores.push({id:x.id,nom:x.nom,tel:null,email:null}));
      const movs=[];const hy=hoy();
      plan.forEach(p=>{let a=p.ex||(p.dup&&cat.articulos.find(z=>z.id===p.dup.id));
        if(!a){a={id:uid(),almPpal:p.alm||null,alms:p.alm?[p.alm]:[],desc:p.desc,cod:p.cod,fam:p.fam,ud:p.ud,diam:null,min:p.min||0,pp:p.pp||0,plazo:p.plazo||null,prov:p.prov,ubic:p.ubic,plano:p.plano,iny:p.iny||[],activo:true};cat.articulos.push(a);p.id=a.id;}
        else{if(p.alm){a.alms=Array.from(new Set((a.alms||[]).concat([p.alm])));if(!a.almPpal)a.almPpal=p.alm;}if(p.cod)a.cod=p.cod;if(p.min!=null)a.min=p.min;if(p.pp!=null)a.pp=p.pp;if(p.plazo!=null)a.plazo=p.plazo;if(p.prov)a.prov=p.prov;if(p.ubic)a.ubic=p.ubic;if(p.plano)a.plano=p.plano;if(p.iny&&p.iny.length)a.iny=Array.from(new Set((a.iny||[]).concat(p.iny)));a.activo=true;}
        p.id=a.id;});
      const acum={};plan.filter(p=>p.cant!=null).forEach(p=>{const k=p.id+"|"+p.alm;acum[k]=(acum[k]||0)+(+p.cant||0);});Object.keys(acum).forEach(k=>{const[id,alm]=k.split("|");const c=acum[k];const t=stockDe(id,alm);movs.push({f:hy,tipo:"ajuste",art:id,alm,cant:Math.round((c-t)*1000)/1000,contado:c,teorico:t,nota:"Importado desde Excel"});});
      try{await saveCat();if(movs.length)await addMovs(movs);toast("Importados "+plan.length+" artículos");}catch(e){toast("No se pudo importar");return false;}render(true);}}]);}
function cargarXLSX(){return window.XLSX?Promise.resolve():new Promise((res,rej)=>{const sc=document.createElement("script");sc.src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";sc.onload=()=>res();sc.onerror=()=>rej(new Error("no se pudo cargar el generador de Excel"));document.head.appendChild(sc);});}
async function exportarExcel(btn){if(!downloads){toast("Esta vista no permite descargar archivos");return;}
  btn.disabled=true;const t0=btn.textContent;btn.textContent="Preparando…";
  try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();
    const add=(n,rows)=>X.utils.book_append_sheet(wb,X.utils.json_to_sheet(rows.length?rows:[{"Sin datos":""}]),n);
    add("Stock",artsActivos().map(a=>{const r={"Artículo":a.desc,"Código":a.cod||"","Familia":FAM[a.fam]||a.fam,"Unidad":a.ud,"Ubicación":a.ubic||"","Almacén principal":almN(ppalDe(a)),"Proveedor":provN(a.prov)};cat.almacenes.forEach(l=>{r[l.nom]=stockDe(a.id,l.id);});r["Total"]=stockDe(a.id);r["Mínimo"]=+a.min||0;r["Consumo/día"]=Math.round(consDia(a)*100)/100;r["Plazo (días)"]=plazoArt(a)||"";r["Pedir al llegar a"]=Math.ceil(puntoPedido(a));r["Pedir ahora"]=cantPedir(a);r["Estado"]=NIV[nivel(a)];r["Pedido el"]=a.pedido||"";r["Cantidad pedida"]=a.pedCant||"";r["Llegada prevista"]=a.prevista||"";return r;}));
    add("Movimientos",todosMov().slice().sort((a,b)=>(a.f+"|"+a.ts).localeCompare(b.f+"|"+b.ts)).map(m=>{const a=art(m.art);return{"Fecha":m.f,"Tipo":TIPOS[m.tipo]||m.tipo,"Artículo":a?a.desc:m.art,"Cantidad":(m.tipo==="salida"?-1:1)*(+m.cant||0),"Almacén":almN(m.alm),"Destino":m.dest?almN(m.dest):"","Inyectora":m.maq?maqN(m.maq):"","Nave":m.nave||(m.maq?((cat.maquinas.find(x=>x.id===m.maq)||{}).nave||""):""),"Proveedor":provN(m.prov),"Albarán":m.alb||"","Contado":m.contado!=null?m.contado:"","Nota":m.nota||""};}));
    add("Cambios pistón",todosPist().map(p=>{const mq=cat.maquinas.find(x=>x.id===p.maq);return{"Fecha":p.f,"Inyectora":maqN(p.maq),"Nave":mq&&mq.nave||"","Diámetro":p.diam,"Cantidad":+p.cant||1,"Motivo":p.motivo||"","Destino del pistón usado":p.dest||"","Responsable":p.resp||"","Observaciones":p.nota||""};}));
    add("Ejes",ejes.slice().sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true})).map(e=>{const ab=abiertaDe(e.cod);return{"Código eje":e.cod,"Modelo":e.mod,"Referencia":ejeRef(e),"Estado":(EST_E[e.estado]||[e.estado])[0],"Marcado":e.marcado?"Sí":"No","Último albarán":ultAlb(e.cod)||"","Observaciones":e.obs||"","Desperfecto abierto":ab?ab.desp||"":"","Enviado":ab&&ab.env||"","Días laborables":ab&&ab.env?diasAb(ab):""};}));
    add("Reparaciones",todasRep().sort((a,b)=>(a.env||a.alta||"").localeCompare(b.env||b.alta||"")).map(r=>{const e=ejes.find(z=>z.cod===r.eje);return{"Código eje":r.eje,"Referencia":e?ejeRef(e):"","Desperfecto":r.desp||"","Enviado":r.env||"","Recibido":r.rec||"","Albarán":r.alb||"","Resultado":r.res==="ok"?"OK":r.res==="anulada"?"Anulada":r.res?"Cerrada":"Abierta","NO-OK":r.nook?"Sí":"","Devuelto a reparar":r.dev||"","Observación":r.obs||""};}));
    add("Modelos eje",(cat.modelos||[]).map(m=>({"Código":m.cod,"Referencia":m.ref,"Longitud":m.long||"","Inyectoras":m.iny||"","Rosca":m.rosca||"","Ø pistón":m.diamP||"","Nº plano":m.plano||"","Plano subido":(m.docs||[]).length?"Sí":"No","Notas":m.notas||"","Stock mínimo":+m.min||0,"En planta":ejes.filter(e=>e.mod===m.cod&&e.estado==="planta").length,"Total":ejes.filter(e=>e.mod===m.cod).length})));
    add("Inyectoras",cat.maquinas.map(m=>({"Inyectora":m.cod,"Nave":m.nave||""})));
    add("Dotación almacenes",[].concat(...lineas().map(l=>faltas(l.id).map(f=>({"Almacén":l.nom,"Artículo":f.a.desc,"Debe haber":f.obj,"Hay":f.st,"Falta":f.falta})))));
    add("Proveedores",cat.proveedores.map(p=>({"Nombre":p.nom,"Suministra":p.sum||"","CIF":p.cif||"","Nº cliente":p.codCli||"","Contacto":p.contacto||"","Teléfono":p.tel||"","WhatsApp":p.wa||"","Email":p.email||"","Dirección":p.dir||"","Plazo (días)":p.plazo||"","Pedido mínimo":p.pedMin||"","Notas":p.notas||""})));
    add("Operarios",(cat.operarios||[]).map(o=>({"Nº":o.num||"","Nombre":o.nom||""})));
    const out=X.write(wb,{bookType:"xlsx",type:"array"});
    await downloads.save({filename:"Almacen_MAPRI_"+hoy()+".xlsx",data:new Blob([out])});toast("Copia descargada");
  }catch(e){toast(e&&e.code==="declined"?"Descarga cancelada":"No se pudo crear el Excel: "+(e&&(e.message||e.code)||"error"));}
  btn.disabled=false;btn.textContent=t0;}


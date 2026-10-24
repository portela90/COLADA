/* ===== GENERADOR DE INFORMES (común a Colada y Almacén) =====
   Cada app define window.INF = {app, bloques, base, lista(), guardar(lista), excel(hojas), descargar(nombre,datos), correo?(asunto,texto,nombre,datos), perDef?}
   bloque: {id, grupo, nom, per:true|false, opts:[[clave,etiqueta,porDefecto]], texto(P,o)->[líneas], hoja?(P,o)->{nombre,filas:[{...}]}} */
const IE=(t,a,k)=>{const n=document.createElement(t);if(a)for(const p in a){const v=a[p];if(v==null||v===false)continue;
    if(p==="class")n.className=v;else if(p==="text")n.textContent=v;else if(p.startsWith("on")&&typeof v==="function")n.addEventListener(p.slice(2),v);
    else if(p==="value")n.value=v;else if(p==="checked")n.checked=!!v;else n.setAttribute(p,v===true?"":v);}
  if(k)(Array.isArray(k)?k:[k]).forEach(c=>{if(c==null||c===false)return;n.appendChild(typeof c==="object"?c:document.createTextNode(String(c)));});return n;};
const iF=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const iDmy=f=>f?f.slice(8,10)+"/"+f.slice(5,7)+"/"+f.slice(0,4):"";
const INFP=[["hoy","Hoy"],["ayer","Ayer"],["sem","Esta semana"],["s7","Últimos 7 días"],["mes","Este mes"],["mesant","Mes pasado"],["m30","Últimos 30 días"],["ano","Este año"]];
function infPer(k){const t=new Date(),d=n=>{const x=new Date(t);x.setDate(x.getDate()-n);return iF(x);};
  if(window.INF&&INF.perExtra){const r=INF.perExtra(k);if(r)return r;}
  if(k==="hoy")return{d:d(0),h:d(0)};if(k==="ayer")return{d:d(1),h:d(1)};
  if(k==="sem"){const w=(t.getDay()+6)%7;return{d:d(w),h:d(0)};}if(k==="s7")return{d:d(6),h:d(0)};
  if(k==="mes")return{d:iF(t).slice(0,8)+"01",h:d(0)};
  if(k==="mesant"){const a=new Date(t.getFullYear(),t.getMonth(),0);return{d:iF(a).slice(0,8)+"01",h:iF(a)};}
  if(k==="ano")return{d:iF(t).slice(0,5)+"01-01",h:d(0)};
  return{d:d(29),h:d(0)};}
const infOpts=(b,def)=>{const o={};(b.opts||[]).forEach(([k,,v])=>o[k]=v!==false);return Object.assign(o,((def.opts||{})[b.id])||{});};
const infBl=def=>INF.bloques.filter(b=>def.bloques.includes(b.id));
function infTexto(def,P){const bl=infBl(def);const ahora=new Date();
  const L=[(def.nom||"Informe").toUpperCase()+" · "+INF.app];
  if(bl.some(b=>b.per))L.push(P.d===P.h?"Día "+iDmy(P.d):"Del "+iDmy(P.d)+" al "+iDmy(P.h));
  if(!bl.length){L.push("","(No has elegido ningún campo)");return L.join("\n");}
  bl.forEach(b=>{let ls;try{ls=b.texto(P,infOpts(b,def))||[];}catch(e){ls=["(no se pudo calcular)"];console.error(e);}
    L.push("",(b.tit||b.nom).toUpperCase()+(b.per?"":" (a "+iDmy(iF(ahora))+")"));ls.forEach(x=>L.push(x));});
  return L.join("\n");}
function infHojas(def,P){const hs=[{nombre:"Informe",lineas:infTexto(def,P).split("\n")}];
  infBl(def).forEach(b=>{if(!b.hoja)return;try{const h=b.hoja(P,infOpts(b,def));if(h&&h.filas&&h.filas.length)hs.push(h);}catch(e){console.error(e);}});
  const vistos={};hs.forEach(h=>{let n=String(h.nombre).replace(/[\\\/\?\*\[\]:]/g," ").slice(0,28);while(vistos[n])n=n.slice(0,25)+" "+(++vistos[n]);vistos[n]=1;h.nombre=n;});return hs;}
function infModal(titulo,cuerpo,pie){const cerrar=()=>{ov.remove();document.removeEventListener("keydown",tec);};const tec=e=>{if(e.key==="Escape"&&ov===[...document.querySelectorAll(".dlg-ov")].pop())cerrar();};
  const ov=IE("div",{class:"dlg-ov",role:"dialog","aria-modal":"true","aria-label":titulo,onclick:e=>{if(e.target===ov)cerrar();}},IE("div",{class:"dlg inf-dlg"},[IE("h3",{text:titulo})].concat(cuerpo).concat([IE("div",{class:"dlg-b"},pie)])));
  document.addEventListener("keydown",tec);document.body.appendChild(ov);return cerrar;}
function infToast(t){if(typeof toast==="function")toast(t);}
function infBtn(t,fn,cls){return IE("button",{type:"button",class:"btn "+(cls||""),text:t,onclick:fn});}
/* ventana 1: elegir informe */
function generarInforme(){let cerrar=null;const esp=INF.lista()||[];
  const item=(def,esEsp)=>IE("button",{type:"button",class:"inf-it",onclick:()=>{cerrar();infEditor(def,esEsp);}},[IE("b",{text:def.nom}),IE("span",{text:(def.desc?def.desc+" · ":"")+infBl(def).map(b=>b.nom).join(", ")})]);
  cerrar=infModal("Generar informe",[
    IE("p",{class:"hint",text:"Elige un informe. En la siguiente ventana marcas los campos que quieres, el periodo, y lo copias, envías o descargas."}),
    IE("div",{class:"inf-gh",text:"Informes"}),IE("div",{class:"inf-l"},INF.base.map(d=>item(d,false))),
    IE("div",{class:"inf-gh",text:"Mis informes especiales"}),esp.length?IE("div",{class:"inf-l"},esp.map(d=>item(d,true))):IE("p",{class:"hint",text:"Todavía no tienes ninguno. Crea uno con los campos que quieras y se guarda para la próxima vez."}),
    infBtn("＋ Crear informe especial",()=>{cerrar();infEditor({id:null,nom:"",bloques:[],opts:{},per:INF.perDef||"mes"},true);},"sec")],
    [infBtn("Cerrar",()=>cerrar(),"sec")]);}
/* ventana 2: campos, periodo, vista previa y envío */
function infEditor(def0,esEsp){const def=JSON.parse(JSON.stringify(def0));def.opts=def.opts||{};const nuevo=esEsp&&!def.id;
  let P=infPer(def.per||INF.perDef||"mes");let cerrar=null;
  const ta=IE("textarea",{readonly:true,class:"inf-ta","aria-label":"Vista previa"});
  const wa=IE("a",{class:"btn sec",target:"_blank",rel:"noopener",text:"WhatsApp"}),mail=IE("a",{class:"btn sec",target:"_blank",rel:"noopener",text:"Correo"});
  const perBox=IE("div",{class:"inf-per"}),campos=IE("div",{class:"inf-campos"});
  const nomI=esEsp?IE("input",{type:"text",value:def.nom||"",placeholder:"Nombre del informe (p. ej. Informe para gerencia)",oninput:e=>{def.nom=e.target.value;pre();}}):null;
  const dI=IE("input",{type:"date",value:P.d,"aria-label":"Desde",onchange:e=>{P.d=e.target.value||P.d;if(P.d>P.h)P.h=P.d;def.per="";pintaPer();pre();}});
  const hI=IE("input",{type:"date",value:P.h,"aria-label":"Hasta",onchange:e=>{P.h=e.target.value||P.h;if(P.d>P.h)P.d=P.h;def.per="";pintaPer();pre();}});
  function pintaPer(){perBox.textContent="";const usa=infBl(def).some(b=>b.per);perBox.hidden=!usa;dI.value=P.d;hI.value=P.h;
    perBox.appendChild(IE("div",{class:"inf-gh",text:"Periodo"}));
    perBox.appendChild(IE("div",{class:"inf-r"},(INF.periodos||INFP).map(([k,t])=>IE("button",{type:"button",class:"chip","aria-pressed":String(def.per===k),text:t,onclick:()=>{def.per=k;P=infPer(k);pintaPer();pre();}}))));
    perBox.appendChild(IE("div",{class:"inf-fe"},[IE("label",{},["Desde",dI]),IE("label",{},["Hasta",hI])]));}
  function pintaCampos(){campos.textContent="";campos.appendChild(IE("div",{class:"inf-gh",text:"Campos del informe"}));const gs=[...new Set(INF.bloques.map(b=>b.grupo))];
    gs.forEach(g=>{campos.appendChild(IE("div",{class:"inf-g",text:g}));
      INF.bloques.filter(b=>b.grupo===g).forEach(b=>{const on=def.bloques.includes(b.id);
        const cb=IE("input",{type:"checkbox",checked:on,onchange:e=>{if(e.target.checked){if(!def.bloques.includes(b.id))def.bloques.push(b.id);}else def.bloques=def.bloques.filter(x=>x!==b.id);
          def.bloques.sort((x,y)=>INF.bloques.findIndex(z=>z.id===x)-INF.bloques.findIndex(z=>z.id===y));pintaCampos();pintaPer();pre();}});
        campos.appendChild(IE("label",{class:"inf-ck"},[cb,IE("span",{text:b.nom+(b.per?"":" (situación actual)")})]));
        if(on&&b.opts&&b.opts.length){const o=infOpts(b,def);campos.appendChild(IE("div",{class:"inf-r inf-sub"},b.opts.map(([k,t])=>IE("button",{type:"button",class:"chip","aria-pressed":String(!!o[k]),text:t,onclick:()=>{def.opts[b.id]=Object.assign(infOpts(b,def),{[k]:!o[k]});pintaCampos();pre();}}))));}});});}
  function pre(){const t=infTexto(def,P);ta.value=t;const asunto=(def.nom||"Informe")+" · "+(P.d===P.h?iDmy(P.d):iDmy(P.d)+" a "+iDmy(P.h));
    wa.href="https://wa.me/?text="+encodeURIComponent(t);mail.href="mailto:?subject="+encodeURIComponent(asunto)+"&body="+encodeURIComponent(t.length>1800?t.slice(0,1800)+"\n…(texto completo en el Excel)":t);}
  const nomFich=()=>(def.nom||"Informe").replace(/[^\wáéíóúñÁÉÍÓÚÑ ]+/g,"").trim().replace(/\s+/g,"_")+"_"+P.d+(P.d!==P.h?"_a_"+P.h:"")+".xlsx";
  const copiar=async()=>{try{await navigator.clipboard.writeText(ta.value);infToast("Informe copiado");}catch(e){ta.removeAttribute("readonly");ta.select();try{document.execCommand("copy");infToast("Informe copiado");}catch(e2){infToast("Selecciona el texto y cópialo");}ta.setAttribute("readonly","");}};
  const excel=async e=>{const b=e.currentTarget;b.disabled=true;try{const buf=await INF.excel(infHojas(def,P));await INF.descargar(nomFich(),buf);}catch(er){if(!(er&&er.code==="declined"))infToast("No se pudo crear el Excel");}b.disabled=false;};
  const correoYo=INF.correo?async e=>{const b=e.currentTarget,t0=b.textContent;b.disabled=true;b.textContent="Enviando…";try{const buf=await INF.excel(infHojas(def,P));const to=await INF.correo((def.nom||"Informe")+" · "+(P.d===P.h?iDmy(P.d):iDmy(P.d)+" a "+iDmy(P.h)),ta.value,nomFich(),buf);infToast("Enviado a "+(to||"tu correo"));}catch(er){infToast("No se pudo enviar: "+(er.message||er));}b.disabled=false;b.textContent=t0;}:null;
  const guardar=async()=>{if(!(def.nom||"").trim()){infToast("Ponle un nombre");if(nomI)nomI.focus();return;}if(!def.bloques.length){infToast("Marca al menos un campo");return;}
    const L=(INF.lista()||[]).slice();const x={id:def.id||"u"+Date.now().toString(36),nom:def.nom.trim(),desc:def.desc||"",bloques:def.bloques,opts:def.opts,per:def.per||""};
    const i=L.findIndex(z=>z.id===x.id);if(i>=0)L[i]=x;else L.push(x);try{await INF.guardar(L);def.id=x.id;infToast("Informe «"+x.nom+"» guardado");cerrar();infEditor(x,true);}catch(e){infToast("No se pudo guardar");}};
  const borrar=async()=>{const L=(INF.lista()||[]).filter(z=>z.id!==def.id);try{await INF.guardar(L);infToast("Informe borrado");cerrar();generarInforme();}catch(e){infToast("No se pudo borrar");}};
  const borrarB=IE("button",{type:"button",class:"btn txt peq",text:"Borrar este informe",onclick:e=>{const b=e.currentTarget;if(b.dataset.ok){borrar();return;}b.dataset.ok="1";b.textContent="Toca otra vez para borrarlo";}});
  pintaPer();pintaCampos();pre();
  cerrar=infModal(nuevo?"Nuevo informe especial":def.nom,[
    nomI?IE("label",{},["Nombre",nomI]):null,
    perBox,campos,IE("div",{class:"inf-gh",text:"Vista previa"}),ta,
    IE("div",{class:"inf-acc"},[infBtn("Copiar",copiar),wa,mail,infBtn("Excel",excel,"sec"),correoYo?infBtn("A mi correo con Excel",correoYo,"sec"):null]),
    IE("div",{class:"inf-acc"},[infBtn(esEsp?(nuevo?"Guardar informe especial":"Guardar cambios"):"Guardar como informe especial",esEsp?guardar:()=>{cerrar();infEditor(Object.assign({},def,{id:null,nom:"",desc:""}),true);},"sec"),esEsp&&!nuevo?borrarB:null])],
    [infBtn("← Otros",()=>{cerrar();generarInforme();},"sec"),infBtn("Cerrar",()=>cerrar(),"sec"),infBtn("Copiar",copiar)]);}
/* ===== INFORMES DEL ALMACÉN: campos disponibles e informes de serie ===== */
const iEn=(f,P)=>f&&f>=P.d&&f<=P.h;
const iN=n=>fmtN(Math.round((+n||0)*100)/100);
function iPist(P){return todosPist().filter(p=>iEn(p.f,P));}
function iCuenta(list,kf){const o={};list.forEach(p=>{const k=kf(p);o[k]=(o[k]||0)+(+p.cant||1);});return Object.entries(o).sort((a,b)=>b[1]-a[1]);}
function iSal(P,fil){const o={};todosMov().forEach(m=>{if(m.tipo!=="salida"||!iEn(m.f,P))return;const a=art(m.art);if(!a||(fil&&!fil(a)))return;const x=o[a.id]=o[a.id]||{a,q:0,alm:{}};x.q+=+m.cant||0;x.alm[m.alm]=(x.alm[m.alm]||0)+(+m.cant||0);});
  return Object.values(o).sort((x,y)=>x.a.fam.localeCompare(y.a.fam)||x.a.desc.localeCompare(y.a.desc,"es",{numeric:true}));}
function iBT(f,P,o){const C=todosMov().filter(m=>m.tipo==="salida"&&iEn(m.f,P)&&(art(m.art)||{}).fam===f);const t=C.reduce((s,m)=>s+(+m.cant||0),0);if(!t)return["Ningún cambio en el periodo."];
  const L=["Total: "+iN(t)+" ud"];const g=kf=>{const x={};C.forEach(m=>{const k=kf(m);x[k]=(x[k]||0)+(+m.cant||0);});return Object.entries(x).sort((a,b)=>b[1]-a[1]);};
  L.push(...g(m=>art(m.art)?nomBT(art(m.art)):"?").map(([k,n])=>"- "+k+": "+iN(n)));
  if(o.maq)L.push("Por máquina: "+g(m=>paraTxt(m)||"sin máquina").map(([k,n])=>k+" "+iN(n)).join(" · "));
  if(o.mot)L.push("Por motivo: "+g(m=>cap(m.motivo||"sin motivo")).map(([k,n])=>k+" "+iN(n)).join(" · "));
  if(o.det)C.sort((a,b)=>a.f.localeCompare(b.f)).forEach(m=>L.push("  · "+fmtF(m.f)+" "+paraTxt(m)+" · "+((art(m.art)||{}).desc||"")+" ×"+iN(m.cant)+(m.motivo?" · "+cap(m.motivo):"")+(m.resp?" · "+respTxt(m.resp):"")));
  return L;}
const iBTh=(f,P)=>({nombre:"Cambios "+(f==="barra"?"barras":"tornillos"),filas:todosMov().filter(m=>m.tipo==="salida"&&iEn(m.f,P)&&(art(m.art)||{}).fam===f).map(m=>({"Fecha":fmtF(m.f),"Inyectora":m.maq?maqN(m.maq):"","Referencia":(art(m.art)||{}).desc||"","Cantidad":+m.cant||0,"Motivo":cap(m.motivo||""),"Responsable":m.resp||"","Almacén":almN(m.alm)}))});
const INF_ALM=[
 {id:"p_res",grupo:"Pistones",nom:"Cambios de pistón por diámetro",per:true,
  texto:P=>{const c=iCuenta(iPist(P),p=>p.diam);const t=c.reduce((s,x)=>s+x[1],0);if(!t)return["Ningún cambio de pistón."];
    return["Total: "+t+" pistones"].concat(DIAM.filter(d=>c.some(x=>x[0]===d)).map(d=>{const a=pistArt(d);return"- Pistón "+d+(a&&a.cod?" ["+a.cod+"]":"")+": "+c.find(x=>x[0]===d)[1]+" ud";}));},
  hoja:P=>({nombre:"Pistones por diámetro",filas:iCuenta(iPist(P),p=>p.diam).map(([d,n])=>{const a=pistArt(d);return{"Diámetro":d,"Código":a&&a.cod||"","Cantidad":n};})})},
 {id:"p_maq",grupo:"Pistones",nom:"Cambios de pistón por máquina",per:true,opts:[["mot","Con los motivos",true]],
  texto:(P,o)=>{const ps=iPist(P);const c=iCuenta(ps,p=>maqN(p.maq));if(!c.length)return["Ningún cambio de pistón."];
    return c.map(([k,n])=>{let t="- "+k+": "+n;if(o.mot){const m=iCuenta(ps.filter(p=>maqN(p.maq)===k),p=>cap(p.motivo||"—")).map(([x,y])=>x+" "+y).join(", ");t+=" ("+m+")";}return t;});},
  hoja:P=>({nombre:"Pistones por máquina",filas:iCuenta(iPist(P),p=>maqN(p.maq)).map(([k,n])=>({"Inyectora":k,"Pistones":n}))})},
 {id:"p_mot",grupo:"Pistones",nom:"Cambios de pistón por motivo",per:true,
  texto:P=>{const c=iCuenta(iPist(P),p=>cap(p.motivo||"—"));return c.length?c.map(([k,n])=>"- "+k+": "+n):["Ningún cambio de pistón."];},
  hoja:P=>({nombre:"Pistones por motivo",filas:iCuenta(iPist(P),p=>cap(p.motivo||"—")).map(([k,n])=>({"Motivo":k,"Pistones":n}))})},
 {id:"p_det",grupo:"Pistones",nom:"Detalle de cada cambio de pistón",per:true,opts:[["mot","Motivo"],["resp","Responsable"],["dest","Pistón usado"],["alm","Almacén de salida"],["obs","Observaciones"]],
  texto:(P,o)=>{const ps=iPist(P);if(!ps.length)return["Ningún cambio de pistón."];
    return ps.map((p,i)=>{const mq=cat.maquinas.find(z=>z.id===p.maq);return(i+1)+". "+fmtF(p.f)+" · "+maqN(p.maq)+(mq&&mq.nave?" ("+mq.nave+")":"")+" · "+p.diam+" ×"+(+p.cant||1)+
      [o.mot?" · "+cap(p.motivo||"—"):"",o.resp?" · "+respTxt(p.resp):"",o.dest&&p.dest?" · usado: "+cap(p.dest):"",o.alm&&almDeCambio(p)?" · de "+almDeCambio(p):"",o.obs&&p.nota?" · "+p.nota:""].join("");});},
  hoja:(P,o)=>({nombre:"Cambios de pistón",filas:iPist(P).map(p=>{const r={"Fecha":fmtF(p.f),"Inyectora":maqN(p.maq),"Diámetro":p.diam,"Cantidad":+p.cant||1};if(o.mot)r["Motivo"]=cap(p.motivo||"");if(o.resp)r["Responsable"]=respTxt(p.resp);if(o.dest)r["Pistón usado"]=cap(p.dest||"");if(o.alm)r["Salió de"]=almDeCambio(p);if(o.obs)r["Observaciones"]=p.nota||"";return r;})})},
 {id:"p_stk",grupo:"Pistones",nom:"Stock de pistones",per:false,opts:[["alm","Por almacén",false],["dias","Días que aguanta",true]],
  texto:(P,o)=>{const S=prevDatos();return artsActivos().filter(a=>a.fam==="piston").sort((a,b)=>DIAM.indexOf(a.diam)-DIAM.indexOf(b.diam)).map(a=>{const st=stockDe(a.id),r=(S.art[a.id]||{}).rate;
    return"- "+(a.diam||a.desc)+": "+iN(st)+" ud"+(o.dias&&r>0?" (para "+Math.floor(st/r)+" días)":"")+(o.alm?" · "+cat.almacenes.filter(l=>stockDe(a.id,l.id)).map(l=>corto(l)+" "+iN(stockDe(a.id,l.id))).join(", "):"");});},
  hoja:()=>({nombre:"Stock de pistones",filas:artsActivos().filter(a=>a.fam==="piston").map(a=>Object.assign({"Pistón":a.diam||a.desc,"Total":stockDe(a.id)},Object.fromEntries(cat.almacenes.map(l=>[l.nom,stockDe(a.id,l.id)]))))})},
 {id:"bt_bar",grupo:"Barras y tornillos",nom:"Cambios de barras expulsoras",per:true,opts:[["maq","Por máquina",true],["mot","Por motivo",true],["det","Detalle de cada cambio",false]],texto:(P,o)=>iBT("barra",P,o),hoja:P=>iBTh("barra",P)},
 {id:"bt_tor",grupo:"Barras y tornillos",nom:"Cambios de tornillos tope",per:true,opts:[["maq","Por máquina",true],["mot","Por motivo",true],["det","Detalle de cada cambio",false]],texto:(P,o)=>iBT("tornillo",P,o),hoja:P=>iBTh("tornillo",P)},
 {id:"bt_rev",grupo:"Barras y tornillos",nom:"Modificaciones de planos",per:true,
  texto:P=>{const L=[];cat.articulos.concat(cat.modelos||[]).forEach(a=>revsDe(a).filter(r=>r.n>1&&iEn(r.f,P)).forEach(r=>L.push({a,r})));L.sort((x,y)=>x.r.f.localeCompare(y.r.f));return L.length?L.map(({a,r})=>"- "+fmtF(r.f)+" · "+revNom(a)+" "+revTxt(r.n)+": "+r.cambio+(r.motivo?" ("+r.motivo+")":"")+(r.by?" · "+r.by:"")+" · quedaban "+iN(r.stock)+" de la "+revTxt(r.antes)):["Ningún plano modificado en el periodo."];}},
 {id:"bt_stk",grupo:"Barras y tornillos",nom:"Stock de barras y tornillos",per:false,opts:[["maq","Máquinas donde van",false]],
  texto:(P,o)=>{const L=[];["barra","tornillo"].forEach(f=>{const A=artsBT(f);if(!A.length)return;L.push(BT[f].nom+":");A.forEach(a=>L.push("- "+nomBT(a)+": "+iN(stockDe(a.id))+" ud"+(+a.min>0?" (mín "+iN(+a.min)+")":"")+(o.maq&&maqsArt(a).length?" · "+maqsArt(a).join(", "):"")));});return L.length?L:["No hay barras ni tornillos dados de alta."];}},
 {id:"m_cons",grupo:"Material",nom:"Consumo de material",per:true,opts:[["pist","Incluir pistones",false],["alm","Por almacén",false]],
  texto:(P,o)=>{const L=iSal(P,a=>o.pist||a.fam!=="piston");return L.length?L.map(x=>"- "+x.a.desc+": "+iN(x.q)+" "+x.a.ud+(o.alm?" ("+Object.entries(x.alm).map(([l,q])=>corto(almById(l)||{nom:l})+" "+iN(q)).join(", ")+")":"")):["Sin consumos en el periodo."];},
  hoja:(P,o)=>({nombre:"Consumo de material",filas:iSal(P,a=>o.pist||a.fam!=="piston").map(x=>({"Artículo":x.a.desc,"Código":x.a.cod||"","Familia":FAM[x.a.fam]||"","Cantidad":x.q,"Unidad":x.a.ud}))})},
 {id:"m_ent",grupo:"Material",nom:"Entradas de material",per:true,opts:[["prov","Proveedor y albarán",true]],
  texto:(P,o)=>{const E=todosMov().filter(m=>m.tipo==="entrada"&&iEn(m.f,P)).sort((a,b)=>a.f.localeCompare(b.f));return E.length?E.map(m=>{const a=art(m.art);return"- "+fmtF(m.f)+" · "+(a?a.desc:"?")+": "+iN(m.cant)+" "+(a?a.ud:"")+(o.prov&&(m.prov||m.alb)?" · "+[provN(m.prov),m.alb?"alb. "+m.alb:null].filter(Boolean).join(" · "):"");}):["Sin entradas en el periodo."];},
  hoja:P=>({nombre:"Entradas",filas:todosMov().filter(m=>m.tipo==="entrada"&&iEn(m.f,P)).map(m=>{const a=art(m.art);return{"Fecha":fmtF(m.f),"Artículo":a?a.desc:"","Cantidad":+m.cant||0,"Unidad":a?a.ud:"","Almacén":almN(m.alm),"Proveedor":provN(m.prov),"Albarán":m.alb||""};})})},
 {id:"m_bajo",grupo:"Material",nom:"Artículos para pedir (bajo mínimo)",per:false,opts:[["calc","Stock y mínimo",true],["prov","Agrupar por proveedor",true]],
  texto:(P,o)=>{const A=artsActivos().filter(a=>cantPedir(a)>0);if(!A.length)return["Todo por encima del mínimo."];
    const lin=a=>"- "+a.desc+(a.cod?" ["+a.cod+"]":"")+": pedir "+iN(cantPedir(a))+" "+a.ud+(o.calc?" (hay "+iN(stockDe(a.id))+", mínimo "+iN(+a.min||0)+")":"")+(nivel(a)==="bad"?" · URGENTE":"")+(a.pedido?" · ya pedido el "+fmtF(a.pedido):"");
    if(!o.prov)return A.map(lin);const g={};A.forEach(a=>{const k=provN(a.prov)||"Sin proveedor";(g[k]=g[k]||[]).push(a);});return[].concat(...Object.keys(g).sort().map(k=>[k.toUpperCase()+":"].concat(g[k].map(lin))));},
  hoja:()=>({nombre:"Para pedir",filas:artsActivos().filter(a=>cantPedir(a)>0).map(a=>({"Artículo":a.desc,"Código":a.cod||"","Proveedor":provN(a.prov),"Pedir":cantPedir(a),"Unidad":a.ud,"Stock":stockDe(a.id),"Mínimo":+a.min||0,"Ya pedido":a.pedido?fmtF(a.pedido):""}))})},
 {id:"m_ped",grupo:"Material",nom:"Pedidos en curso",per:false,
  texto:()=>{const A=artsActivos().filter(a=>a.pedido);const hy=hoy();return A.length?A.map(a=>"- "+a.desc+": pedido el "+fmtF(a.pedido)+(a.pedCant?" ("+iN(a.pedCant)+" "+a.ud+")":"")+(a.prevista?(a.prevista<hy?" · RETRASADO "+dias(a.prevista,hy)+" días":" · llega "+fmtF(a.prevista)):"")):["Ningún pedido en curso."];}},
 {id:"m_stk",grupo:"Material",nom:"Stock de todos los artículos",per:false,opts:[["alm","Por almacén",false],["cero","Incluir los que están a cero",false]],
  texto:(P,o)=>artsActivos().filter(a=>o.cero||stockDe(a.id)).sort((x,y)=>x.desc.localeCompare(y.desc,"es",{numeric:true})).map(a=>"- "+a.desc+": "+iN(stockDe(a.id))+" "+a.ud+(o.alm?" ("+cat.almacenes.filter(l=>stockDe(a.id,l.id)).map(l=>corto(l)+" "+iN(stockDe(a.id,l.id))).join(", ")+")":"")),
  hoja:()=>({nombre:"Stock",filas:artsActivos().map(a=>Object.assign({"Artículo":a.desc,"Código":a.cod||"","Unidad":a.ud,"Total":stockDe(a.id),"Mínimo":+a.min||0},Object.fromEntries(cat.almacenes.map(l=>[l.nom,stockDe(a.id,l.id)]))))})},
 {id:"e_est",grupo:"Ejes",nom:"Ejes por modelo (planta y taller)",per:false,opts:[["maq","Puestos y repuestos",true]],
  texto:(P,o)=>{const R=prevTodo();return R.E.L.map(x=>"- "+x.nom+": "+x.pl+" en planta"+(o.maq?" ("+x.maq+" puestos + "+x.rep+" repuesto)":"")+(x.tal?" · "+x.tal+" en taller":"")+(x.prep?" · "+x.prep+" preparados":"")+(x.pend?" · "+x.pend+" quitados sin número":""));},
  hoja:()=>({nombre:"Ejes por modelo",filas:prevTodo().E.L.map(x=>({"Modelo":x.G.map(g=>g.cod).join(" + "),"Referencia":x.G.map(g=>g.ref).join(" + "),"Máquinas":x.maq,"En planta":x.pl,"Repuestos":x.rep,"En taller":x.tal,"Preparados":x.prep,"Mínimo":x.min}))})},
 {id:"e_tal",grupo:"Ejes",nom:"Ejes en el taller",per:false,opts:[["desp","Desperfecto",true],["dias","Días fuera",true]],
  texto:(P,o)=>{const T=ejes.filter(e=>e.estado==="reparacion"||e.estado==="devuelto").sort(porCod);return T.length?T.map(e=>{const ab=abiertaDe(e.cod);return"- "+e.cod+(o.dias&&ab&&ab.env?" · "+dias(ab.env,hoy())+" días":"")+(o.desp&&ab&&ab.desp?" · "+ab.desp:"")+(ab&&ab.traer?" · pedido traer":"");}):["Ninguno en el taller."];},
  hoja:()=>({nombre:"Ejes en taller",filas:ejes.filter(e=>e.estado==="reparacion"||e.estado==="devuelto").map(e=>{const ab=abiertaDe(e.cod);return{"Eje":e.cod,"Referencia":ejeRef(e),"Enviado":ab&&ab.env?fmtF(ab.env):"","Días fuera":ab&&ab.env?dias(ab.env,hoy()):"","Desperfecto":ab?ab.desp||"":""};})})},
 {id:"e_mov",grupo:"Ejes",nom:"Ejes enviados y recibidos",per:true,opts:[["lista","Con la lista de ejes",false]],
  texto:(P,o)=>{const R=todasRep().filter(r=>r.res!=="anulada"&&!r.recuento);const env=R.filter(r=>iEn(r.env,P)),rec=R.filter(r=>r.res==="ok"&&iEn(r.rec,P));
    const L=["Enviados a reparar: "+env.length,"Recibidos reparados: "+rec.length];if(o.lista){if(env.length)L.push("Enviados: "+env.map(r=>r.eje).join(", "));if(rec.length)L.push("Recibidos: "+rec.map(r=>r.eje).join(", "));}return L;},
  hoja:P=>({nombre:"Ejes enviados y recibidos",filas:todasRep().filter(r=>r.res!=="anulada"&&(iEn(r.env,P)||iEn(r.rec,P))).map(r=>({"Eje":r.eje,"Desperfecto":r.desp||"","Enviado":r.env?fmtF(r.env):"","Recibido":r.rec&&r.res==="ok"?fmtF(r.rec):"","Albarán":r.alb||""}))})},
 {id:"e_cost",grupo:"Ejes",nom:"Coste de reparación y ahorro",per:true,opts:[["mod","Por modelo",true]],
  texto:(P,o)=>{const reps=todasRep().filter(r=>r.res==="ok"&&iEn(r.rec,P)),recu=ejeRecup().filter(x=>iEn(x.f,P));const c=reps.reduce((t,r)=>t+costeRep(r).v,0),ah=recu.reduce((t,x)=>t+precioMod((x.mods||[])[0]),0);
    const L=["Reparados: "+reps.length+" · coste "+eur(c),"Recuperados en planta: "+recu.length+" · ahorro "+eur(ah)];
    if(!(cat.modelos||[]).some(m=>+m.precioRep>0))L.push("(Faltan los precios de reparación: Ejes → Precios de reparación)");
    if(o.mod){const g={};reps.forEach(r=>{const k=modeloDeEje(r.eje);const x=g[k]=g[k]||{n:0,c:0};x.n++;x.c+=costeRep(r).v;});Object.keys(g).sort().forEach(k=>L.push("- "+k+": "+g[k].n+" reparados · "+eur(g[k].c)));}return L;}},
 {id:"e_pend",grupo:"Ejes",nom:"Ejes en cuarentena (sin número)",per:false,texto:()=>{const L=ejePend();return L.length?L.map(p=>"- "+p.maq+" · "+((p.mods||[]).join("/")||"?")+" · "+motTxt(p).toLowerCase()+" el "+fmtF(p.f)):["Ninguno."];}},
 {id:"v_ped",grupo:"Previsión",nom:"Pedido previsto hasta fin del mes siguiente",per:false,opts:[["rango","Previsión y stock",true]],
  texto:(P,o)=>{const R=prevTodo();const A=R.arts.filter(x=>x.pedir>0);return A.length?A.map(x=>"- "+x.a.desc+": "+iN(x.pedir)+" "+x.a.ud+(o.rango?" (previsión "+nomMes(R.S.mesSig)+" "+fmtR(x.mes.lo,x.cont)+"–"+fmtR(x.mes.hi,x.cont)+", hay "+iN(x.st)+")":"")):["Todo cubierto hasta final de "+nomMes(R.S.mesSig)+"."];},
  hoja:()=>{const R=prevTodo();return{nombre:"Pedido previsto",filas:R.arts.filter(x=>x.pedir>0).map(x=>({"Artículo":x.a.desc,"Pedir":x.pedir,"Unidad":x.a.ud,"Stock":x.st,"Previsión mín":x.mes.lo,"Previsión máx":x.mes.hi,"Mínimo sugerido":x.min}))};}},
 {id:"v_eje",grupo:"Previsión",nom:"Ejes a pedir al taller",per:false,
  texto:()=>{const L=prevTodo().E.L.filter(x=>x.pedir>0||x.faltan>0);return L.length?L.map(x=>"- "+x.nom+": "+(x.pedir?"traer "+x.pedir:"")+(x.faltan?(x.pedir?" · ":"")+"faltan "+x.faltan:"")+" (en planta "+x.pl+", mínimo "+x.min+")"):["No hace falta pedir ninguno."];}},
 {id:"v_pis",grupo:"Previsión",nom:"Previsión de pistones del mes siguiente",per:false,
  texto:()=>{const R=prevTodo();return R.arts.filter(x=>x.a.fam==="piston").sort((a,b)=>DIAM.indexOf(a.a.diam)-DIAM.indexOf(b.a.diam)).map(x=>"- "+x.a.diam+": "+fmtR(x.mes.lo,true)+"–"+fmtR(x.mes.hi,true)+" (lo normal "+fmtR(x.mes.mu,true)+")");}}
];
const INF_ALM_BASE=[
 {id:"b_dia",nom:"Pistones del día",desc:"Para SAP / compras",bloques:["p_res","p_det"],per:"hoy"},
 {id:"b_sem",nom:"Resumen semanal",bloques:["p_res","p_maq","bt_bar","bt_tor","m_cons","m_bajo","e_tal"],per:"sem"},
 {id:"b_bt",nom:"Barras y tornillos",bloques:["bt_bar","bt_tor","bt_rev","bt_stk"],per:"mes"},
 {id:"b_mes",nom:"Informe mensual",desc:"Para gerencia",bloques:["p_res","p_mot","m_cons","e_mov","e_cost","v_ped"],per:"mesant"},
 {id:"b_ped",nom:"Lista de pedido",bloques:["m_bajo","m_ped","v_eje"],per:"hoy"},
 {id:"b_eje",nom:"Estado de los ejes",bloques:["e_est","e_tal","e_pend","v_eje"],per:"hoy"},
 {id:"b_stk",nom:"Inventario",bloques:["p_stk","bt_stk","m_stk"],per:"hoy"}
];
window.INF={app:"MAPRI · Almacén",bloques:INF_ALM,base:INF_ALM_BASE,perDef:"mes",
  lista:()=>cat.informes||[],guardar:async L=>{cat.informes=L;await saveCat();},
  excel:async hs=>{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();hs.forEach(h=>{const ws=h.lineas?X.utils.aoa_to_sheet(h.lineas.map(x=>[x])):X.utils.json_to_sheet(h.filas);if(h.lineas)ws["!cols"]=[{wch:110}];X.utils.book_append_sheet(wb,ws,h.nombre);});return new Blob([X.write(wb,{bookType:"xlsx",type:"array"})]);},
  descargar:async(n,b)=>{if(!downloads){toast("Esta vista no permite descargar");return;}await downloads.save({filename:n,data:b});toast("Excel descargado");},
  correo:async(asunto,texto,fn,blob)=>{if(!window.sbColada)throw new Error("solo desde la web");const u8=new Uint8Array(await blob.arrayBuffer());let bin="";for(let i=0;i<u8.length;i+=0x8000)bin+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));
    const r=await window.sbColada.functions.invoke("enviar-cierre",{body:{asunto,texto,filename:fn,excel:btoa(bin)}});let err=r.error?(r.error.message||"error"):null;if(r.error&&r.error.context&&r.error.context.json){try{const j=await r.error.context.json();err=j.error||err;}catch(e){}}if(err)throw new Error(err);return r.data&&r.data.to;}};

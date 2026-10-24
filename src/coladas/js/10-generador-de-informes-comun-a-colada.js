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
/* ===== INFORMES DE COLADA: campos disponibles e informes de serie ===== */
const cEn=(f,P)=>f&&f>=P.d&&f<=P.h;
function cInfo(r){const l=lotes.find(x=>x.id===(r.o||r.d));return{nave:l?l.nave:(r.nv||""),mat:l?l.material:(r.ml||""),lote:l,colada:l?l.nombre:(r.n||""),prov:(l&&l.proveedor)||r.p||""};}
const cMat=m=>MAT[m]?MAT[m].nom:m||"—";
function cGrupo(P,t){const S=saldos();const o={};movs().forEach(r=>{if(r.t!==t||!cEn(r.f,P))return;const i=cInfo(r);const k=i.nave+"|"+i.mat;const x=o[k]=o[k]||{nave:i.nave,mat:i.mat,kg:0,fa:0,n:0};
  x.kg+=Math.abs(kgAp(r,S));x.fa+=typeof r.fa==="number"?Math.abs(r.fa):0;x.n++;});return Object.values(o).sort((a,b)=>(a.nave+a.mat).localeCompare(b.nave+b.mat));}
const cLin=(x,o)=>"- "+x.nave+" · "+cMat(x.mat)+": "+[o.fa!==false?fmt(x.fa)+" fardos":null,o.kg!==false?fmt(x.kg)+" kg":null].filter(Boolean).join(" · ");
const cTot=(L,o)=>L.length>1?["  Total: "+[o.fa!==false?fmt(L.reduce((s,x)=>s+x.fa,0))+" fardos":null,o.kg!==false?fmt(L.reduce((s,x)=>s+x.kg,0))+" kg":null].filter(Boolean).join(" · ")]:[];
const INF_COL=[
 {id:"c_cons",grupo:"Aluminio",nom:"Consumo por nave y aleación",per:true,opts:[["fa","Fardos"],["kg","Kilos"]],
  texto:(P,o)=>{const L=cGrupo(P,"C");return L.length?L.map(x=>cLin(x,o)).concat(cTot(L,o)):["Sin consumo en el periodo."];},
  hoja:P=>({nombre:"Consumo",filas:cGrupo(P,"C").map(x=>({"Nave":x.nave,"Aleación":cMat(x.mat),"Fardos":x.fa,"Kg":Math.round(x.kg)}))})},
 {id:"c_dia",grupo:"Aluminio",nom:"Consumo día a día",per:true,
  texto:P=>{const S=saldos(),o={};movs().forEach(r=>{if(r.t!=="C"||!cEn(r.f,P))return;const i=cInfo(r);const k=r.f;const x=o[k]=o[k]||{};const kk=i.nave+" "+cMat(i.mat);x[kk]=(x[kk]||0)+(typeof r.fa==="number"?r.fa:0);});
    const ds=Object.keys(o).sort();return ds.length?ds.map(d=>"- "+dmyA(d)+": "+Object.entries(o[d]).map(([k,v])=>k+" "+fmt(v)+" f").join(" · ")):["Sin consumo en el periodo."];},
  hoja:P=>{const S=saldos();return{nombre:"Consumo por día",filas:movs().filter(r=>r.t==="C"&&cEn(r.f,P)).map(r=>{const i=cInfo(r);return{"Fecha":dmyA(r.f),"Relevo":r.u||"","Nave":i.nave,"Aleación":cMat(i.mat),"Colada":i.colada,"Fardos":typeof r.fa==="number"?r.fa:"","Kg":Math.round(Math.abs(kgAp(r,S)))};}).sort((a,b)=>a.Fecha.split("/").reverse().join("").localeCompare(b.Fecha.split("/").reverse().join("")))};}},
 {id:"c_rel",grupo:"Aluminio",nom:"Consumo por relevo",per:true,
  texto:P=>{const S=saldos(),o={};movs().forEach(r=>{if(r.t!=="C"||!cEn(r.f,P))return;const k=r.u||"Sin relevo";const x=o[k]=o[k]||{fa:0,kg:0};x.fa+=typeof r.fa==="number"?r.fa:0;x.kg+=Math.abs(kgAp(r,S));});
    const ks=Object.keys(o);return ks.length?ks.map(k=>"- "+k+": "+fmt(o[k].fa)+" fardos · "+fmt(o[k].kg)+" kg"):["Sin consumo en el periodo."];}},
 {id:"c_ent",grupo:"Aluminio",nom:"Entradas de aluminio",per:true,opts:[["det","Detalle de cada entrada",false]],
  texto:(P,o)=>{const L=cGrupo(P,"E");if(!L.length)return["Sin entradas en el periodo."];const out=L.map(x=>cLin(x,{})+" ("+x.n+" entradas)").concat(cTot(L,{}));
    if(o.det){const S=saldos();movs().filter(r=>r.t==="E"&&cEn(r.f,P)).sort((a,b)=>a.f.localeCompare(b.f)).forEach(r=>{const i=cInfo(r);out.push("  · "+dmyA(r.f)+" "+i.nave+" "+cMat(i.mat)+" · "+i.colada+(i.prov?" · "+i.prov:"")+(r.a?" · alb. "+r.a:"")+" · "+fmt(kgAp(r,S))+" kg");});}return out;},
  hoja:P=>{const S=saldos();return{nombre:"Entradas",filas:movs().filter(r=>r.t==="E"&&cEn(r.f,P)).map(r=>{const i=cInfo(r);return{"Fecha":dmyA(r.f),"Nave":i.nave,"Aleación":cMat(i.mat),"Colada":i.colada,"Proveedor":i.prov,"Albarán":r.a||"","Fardos":typeof r.fa==="number"?r.fa:"","Kg":Math.round(kgAp(r,S))};})};}},
 {id:"c_aj",grupo:"Aluminio",nom:"Ajustes por recuento",per:true,
  texto:P=>{const S=saldos();const A=movs().filter(r=>r.t==="A"&&cEn(r.f,P));return A.length?A.map(r=>{const i=cInfo(r),sg=(r.o&&!r.d)?-1:1;return"- "+dmyA(r.f)+" "+i.nave+" "+cMat(i.mat)+" · "+i.colada+": "+(sg<0?"−":"+")+fmt(Math.abs(kgAp(r,S)))+" kg"+(r.n?" · "+r.n:"");}):["Sin ajustes en el periodo."];}},
 {id:"c_stk",grupo:"Aluminio",nom:"Stock al final del periodo",per:true,opts:[["ne","Nave / externo"],["dias","Días de material"]],
  texto:(P,o)=>{const B=conCorte(P.h,()=>bloques(P.h).B);return Object.values(B).filter(b=>b.fa>0||b.kg>0).map(b=>"- "+b.nave+" · "+cMat(b.mat)+": "+fmt(b.fa)+" f · "+fmt(b.kg)+" kg"+(o.ne?" (nave "+fmt(b.faN)+" f · externo "+fmt(b.faE)+" f)":"")+(o.dias&&b.dias!=null?" · para "+b.dias+" días":""));},
  hoja:P=>{const B=conCorte(P.h,()=>bloques(P.h).B);return{nombre:"Stock",filas:Object.values(B).map(b=>({"Nave":b.nave,"Aleación":cMat(b.mat),"Fardos":b.fa,"Kg":Math.round(b.kg),"Fardos en nave":b.faN,"Fardos externo":b.faE,"Días de material":b.dias==null?"":b.dias}))};}},
 {id:"c_gran",grupo:"Granalla de cobre",nom:"Granalla de cobre",per:true,opts:[["nave","Por nave"],["queda","Lo que queda"]],
  texto:(P,o)=>{let con=0,ent=0;const nv={};movs().forEach(r=>{if(r.t!=="G"||r.aj||!cEn(r.f,P)||typeof r.kg!=="number")return;if(r.kg<0){con-=r.kg;const n=r.nv||"Sin nave";nv[n]=(nv[n]||0)-r.kg;}else ent+=r.kg;});
    const L=["Consumida: "+f2(con)+" kg"+(o.nave&&Object.keys(nv).length?" ("+Object.keys(nv).sort().map(n=>n+" "+f2(nv[n])).join(" · ")+")":""),"Entradas: "+f2(ent)+" kg"];if(o.queda)L.push("Quedan: "+f2(conCorte(P.h,()=>granallaKg()))+" kg");return L;}},
 {id:"c_cie",grupo:"Cierre",nom:"Cierre del mes (el mes de la fecha «hasta»)",per:true,
  texto:P=>{const m=P.h.slice(0,7);const s={alu:true,val:true,gran:true,cua:true};return textoCierre(informeMes(m),s).split("\n").slice(1);}}
];
const INF_COL_BASE=[
 {id:"b_parte",nom:"Parte diario",desc:"Para el jefe cada mañana",bloques:["c_cons","c_stk","c_gran"],per:"ud"},
 {id:"b_sem",nom:"Resumen semanal",bloques:["c_cons","c_ent","c_gran","c_stk"],per:"sem"},
 {id:"b_mes",nom:"Resumen del mes",desc:"Consumo, entradas y ajustes",bloques:["c_cons","c_ent","c_aj","c_gran","c_stk"],per:"mesant"},
 {id:"b_cie",nom:"Cierre de mes",bloques:["c_cie"],per:"mesant"},
 {id:"b_ent",nom:"Entradas de aluminio",bloques:["c_ent"],opts:{c_ent:{det:true}},per:"mes"}
];
window.INF={app:"MAPRI · Colada",bloques:INF_COL,base:INF_COL_BASE,perDef:"ud",
  periodos:[["ud","Último parte"]].concat(INFP),perExtra:k=>{if(k==="ud"){const d=diaParte()||hoy();return{d,h:d};}return null;},
  lista:()=>cfg.informes||[],guardar:async L=>{cfg.informes=L;await saveCfg();},
  excel:async hs=>{const X=await cargarExcelJS(),wb=new X.Workbook();hs.forEach(h=>{const ws=wb.addWorksheet(h.nombre);
      if(h.lineas){h.lineas.forEach(x=>ws.addRow([x]));ws.getColumn(1).width=110;ws.getRow(1).font={bold:true,size:13};return;}
      const ks=Object.keys(h.filas[0]||{});const hr=ws.addRow(ks);hr.font={bold:true};h.filas.forEach(f=>ws.addRow(ks.map(k=>f[k])));ks.forEach((k,i)=>ws.getColumn(i+1).width=Math.max(10,Math.min(40,k.length+4)));});
    return wb.xlsx.writeBuffer();},
  descargar:async(n,buf)=>{const dl=await claude.use("downloads");if(!dl){toast("La descarga no está disponible aquí");return;}await dl.save({filename:n,data:buf});toast("Excel descargado");},
  correo:async(asunto,texto,fn,buf)=>{if(!window.sbColada)throw new Error("solo desde la web");const u8=new Uint8Array(buf);let bin="";for(let i=0;i<u8.length;i+=0x8000)bin+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));
    const r=await window.sbColada.functions.invoke("enviar-cierre",{body:{asunto,texto,filename:fn,excel:btoa(bin)}});let err=r.error?(r.error.message||"error"):null;if(r.error&&r.error.context&&r.error.context.json){try{const j=await r.error.context.json();err=j.error||err;}catch(e){}}if(err)throw new Error(err);return r.data&&r.data.to;}};

function render(){
  const a=document.activeElement,mn=document.querySelector("main");
  const fid=a&&a.id&&$("view").contains(a)?a.id:null;
  let s0=null,s1=null;if(fid){try{s0=a.selectionStart;s1=a.selectionEnd;}catch(e){}}
  const sc=mn?mn.scrollTop:0;
  pinta();
  if(fichaRefresca){try{fichaRefresca();}catch(e){}}
  if(albRefresca){try{albRefresca();}catch(e){}}
  if(mn)mn.scrollTop=sc;
  if(fid){const n=$(fid);if(n&&n!==document.activeElement){try{n.focus({preventScroll:true});}catch(e){n.focus();}
    if(s0!=null){try{n.setSelectionRange(s0,s1);}catch(e){}}}}
}
/* números clave para la página Inicio (inicio.html): se guardan solo si cambian, como mucho cada 20 s */
let _kpiT=null,_kpiU="";
function kpiInicio(){if(!ready||!db)return;clearTimeout(_kpiT);_kpiT=setTimeout(async()=>{try{const R=bloques();const nv={};
  Object.values(R.B).forEach(b=>{const x=nv[b.nave]=nv[b.nave]||{kg:0,fa:0,kgN:0,kgE:0,cUd:0};x.kg+=b.kg;x.fa+=b.fa;x.kgN+=b.kgN;x.kgE+=b.kgE;x.cUd+=b.cUd;});
  Object.values(nv).forEach(x=>{for(const k in x)x[k]=Math.round(x[k]);});
  const k={sinAlb:sinAlbaran().length,naves:nv,kg:Object.values(nv).reduce((t,x)=>t+x.kg,0),fa:Object.values(nv).reduce((t,x)=>t+x.fa,0),ud:R.ud||null};
  const u=JSON.stringify(k);if(u===_kpiU)return;_kpiU=u;await db.doc("kpi/inicio").set(Object.assign(k,{ts:Date.now()}));}catch(e){}},20000);}
function pinta(){
  const v=$("view");v.textContent="";v.classList.toggle("estrecha",tab==="consumo"||tab==="entrada"||tab==="precios");
  if(!ready){v.appendChild(el("div",{class:"card"},[el("div",{class:"empty",text:"Cargando…"})]));return;}
  if(!db){v.appendChild(el("div",{class:"card"},[el("div",{class:"empty",text:"No se pueden cargar los datos. Comprueba la conexión y vuelve a abrir la app."})]));return;}
  if(!window.WEB)v.appendChild(el("div",{class:"banner b",text:"Esta Colada ya no se usa: los datos se apuntan en la aplicación web (portela90.github.io/COLADA). Aquí solo se puede consultar."}));
  const S=saldos();let k=0,f=0;for(const i in S){k+=S[i].kg;f+=S[i].fa;}
  $("tKg").textContent=fmt(k);$("tFa").textContent=fmt(f);kpiInicio();
  if(tab==="stock"||tab==="hist")v.appendChild(el("div",{style:"display:flex;justify-content:flex-end"},[el("button",{type:"button",class:"btn",text:"Generar informe",onclick:()=>generarInforme()})]));
  (tab==="stock"?vStock():tab==="consumo"?vConsumo():tab==="entrada"?vEntrada():tab==="lotes"?vLotes():tab==="hist"?vConsultas():tab==="precios"?vPrecios():vPlan()).forEach(n=>n&&v.appendChild(n));
}
function tabsUI(){const n=$("tabs");n.textContent="";
  TABS.forEach(([id,t])=>{const b=el("button",{type:"button","aria-selected":String(tab===id),onclick:()=>{tab=id;try{localStorage.setItem("colada.tab",id);}catch(e){}tabsUI();render();document.querySelector("main").scrollTop=0;}});
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICO_T[id]||"")+"</svg>";b.appendChild(el("span",{text:t}));n.appendChild(b);});}
/* iconos de las pestañas */
const ICO_T={stock:'<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',consumo:'<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.3 3 2.5 3 0-3-1-5.5 0-8z"/>',
  entrada:'<path d="M2 7h11v9H2zM13 10h4l4 3.5V16h-8z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',lotes:'<path d="M4 6h16M4 12h16M4 18h10"/>',
  hist:'<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',precios:'<path d="M17.5 6.5A6.5 6.5 0 1 0 17.5 17.5"/><path d="M4 10.5h9M4 13.5h9"/>',
  plan:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'};
try{const t=localStorage.getItem("colada.tab");if(t&&TABS.some(x=>x[0]===t))tab=t;}catch(e){}
try{const q=new URLSearchParams(location.search).get("t");if(q&&TABS.some(x=>x[0]===q)){tab=q;history.replaceState(null,"",location.pathname);}}catch(e){}
tabsUI();render();
window.addEventListener("colada-refresh",()=>render());
window.descCambio=(col,it)=>{if(col==="mov"){const T={C:"Consumo",E:"Entrada",A:"Ajuste",G:"Granalla de cobre",T:"Traslado"};const l=lotes.find(x=>x.id===it.o);
  return[T[it.t]||it.t,it.fa!=null?it.fa+" f":null,it.kg!=null?(Math.round(it.kg*10)/10).toLocaleString("es-ES")+" kg":null,l?"colada "+l.nombre:it.n?"colada "+it.n:null,it.nv||null,it.u||null,it.f?it.f.split("-").reverse().join("/"):null].filter(Boolean).join(" · ");}
  if(col==="maq")return["Inyectora "+it.m,it.u||null,it.f?it.f.split("-").reverse().join("/"):null].filter(Boolean).join(" · ");return null;};
window.descDoc=(col,id,a,d)=>{if(col==="lotes"){const x=d||a;return"Colada "+(x.nombre||id)+(!a?" (nueva)":!d?" (borrada)":" (datos cambiados)");}if(col==="cfg")return"Configuración (precios, plan, calendario, cierres…)";return null;};

$("lupa").addEventListener("click",()=>{if(!ready||!db){toast("Espera a que carguen los datos");return;}abrirBuscador();});
(async function(){
  try{db=await claude.use("db");}catch(e){db=null;}
  if(!db){ready=true;render();return;}
  /* fuera de la web (la Colada de Claude) queda en solo lectura */
  if(!window.WEB){const d0=db,no=async()=>{toast("Solo consulta: apunta en la aplicación web");throw new Error("solo lectura");};
    db={collection:c=>d0.collection(c),doc:p=>{const r=d0.doc(p);return{get:()=>r.get(),onSnapshot:(a,b)=>r.onSnapshot(a,b),set:no,update:no};},itemsAdd:no,itemsPut:no,itemsDel:no};}
  db.collection("lotes").onSnapshot(sn=>{lotes=sn.docs.map(d=>Object.assign({id:d.id},d.data()));ready=true;render();},()=>{ready=true;render();});
  db.collection("maq").onSnapshot(sn=>{const m={};sn.docs.forEach(d=>{m[d.id]=(d.data().items)||[];});maqEv=m;render();},()=>{});
  db.collection("mov").onSnapshot(sn=>{const m={};sn.docs.forEach(d=>{m[d.id]=(d.data().items)||[];});meses=m;ready=true;render();},()=>{});
  db.doc("cfg/app").onSnapshot(sn=>{if(sn.exists){const c=sn.data();cfg={minimos:c.minimos||{},granalla:c.granalla||{inicial:0,min:0},proveedores:c.proveedores||[],precios:c.precios||{},plan:c.plan||{},paros:c.paros||[],calendario:c.calendario||{},cargador:c.cargador||{},cierres:c.cierres||{},informes:c.informes||[]};}render();},()=>{});
})();
})();

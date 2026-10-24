/* ===== Pantallas de los usuarios de «solo consulta» (Marta, Beatriz…) =====
   Ven lo que se ha consumido, dónde y por qué, lo que ha entrado, lo que queda de cada producto y cómo están los ejes.
   No hay ningún botón para cambiar nada (la base de datos tampoco les deja). */
const TABS_C=[["cRes","Resumen"],["cCons","Consumos"],["cEnt","Entradas"],["cStock","Stock"],["cEjes","Ejes"]];
Object.assign(ICO,{cRes:'<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',cCons:'<path d="M12 20V8M7 13l5-5 5 5"/><path d="M5 4h14"/>',
  cEnt:'<path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/>',cStock:'<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  cEjes:'<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>'});
const CQ={mes:mesDe(hoy()),donde:"",fam:"",motivo:"",txt:"",vista:"det",prov:"",estado:"",alm:""};
/* registros de consumo y de entrada con la misma forma que el informe de Looker */
const nomArt=a=>a?(TEC(a.fam)?nomBT(a):a.desc):"(artículo borrado)";
function cMotivo(m){if(m.motivo)return cap(m.motivo);const n=String(m.nota||"");
  if(/^Cambio de pistón · /.test(n))return cap(n.split(" · ")[1]||"Cambio de pistón");if(/^Horno /.test(n))return"Cambio en horno";
  if(/^Limpieza:/.test(n))return n.replace(/^Limpieza:\s*/,"");if(/^Cambio de pistón/.test(n))return"Cambio de pistón";return"Sin indicar";}
function cDonde(m){if(m.maq)return maqCod(m.maq);if(m.nave)return m.nave;if(/^(Limpieza:|Horno )/.test(m.nota||""))return"Limpieza";return"Sin indicar";}
function cConsumos(){return todosMov().filter(m=>m.tipo==="salida").map(m=>{const a=art(m.art),c=+m.cant||0;
  return{f:m.f,prod:nomArt(a),artId:m.art,fam:a?FAM[a.fam]||"":"",cant:c,ud:a?a.ud||"ud":"ud",donde:cDonde(m),motivo:cMotivo(m),quien:m.resp?respTxt(m.resp):"",
    sale:almN(m.alm),queda:a?stockDe(a.id):null,eur:c*precioDe(a),nota:m.nota||""};});}
function cEntradas(){return todosMov().filter(m=>m.tipo==="entrada").map(m=>{const a=art(m.art);
  return{f:m.f,prod:nomArt(a),artId:m.art,fam:a?FAM[a.fam]||"":"",cant:+m.cant||0,ud:a?a.ud||"ud":"ud",alm:almN(m.alm),
    prov:provN(m.prov)||(String(m.nota||"").match(/^Proveedor:\s*(.*)$/)||[])[1]||"Sin indicar",alb:m.alb||"",foto:m.foto||null,quien:m.resp?respTxt(m.resp):"",nota:m.nota||""};});}
/* --- piezas de pantalla --- */
const cCard=(t,sub,kids)=>el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:t}),sub?el("span",{class:"sub",style:"margin-left:auto",text:sub}):null]),...kids]);
const cKpis=L=>el("dl",{class:"kpis num"},L.map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})])));
/* clsR: columnas de números (a la derecha); anchas: columnas que en el móvil ocupan toda la ficha */
function cTabla(cab,filas,clsR,anchas){const cl=i=>[(clsR||[]).includes(i)?"r num":"",(anchas||[]).includes(i)?"tm-ancha cw":""].join(" ").trim();
  return el("div",{class:"tw"},[el("table",{class:"ct"},[el("thead",{},[el("tr",{},cab.map((c,i)=>el("th",{class:(clsR||[]).includes(i)?"r":"",text:c})))]),
  el("tbody",{},filas.map(f=>el("tr",{},f.map((x,i)=>x&&x.nodeType?el("td",{class:cl(i),"data-l":cab[i]},[x]):el("td",{class:cl(i),"data-l":cab[i],text:x==null?"":String(x)})))))])]);}
const cMeses=L=>{const s=new Set(L.map(x=>mesDe(x.f)));s.add(mesDe(hoy()));return[...s].filter(Boolean).sort().reverse();};
function cSelMes(L,re){return fld("Mes",sel("cqMes",[["todo","Todo"]].concat(cMeses(L).map(m=>[m,cap(fmtMes(m))])),CQ.mes,v=>{CQ.mes=v;re();}));}
const cEnMes=x=>CQ.mes==="todo"||mesDe(x.f)===CQ.mes;
const cTxtMes=()=>CQ.mes==="todo"?"todo el histórico":fmtMes(CQ.mes);
function cBuscar(re,ph){const i=inp("cqTxt",CQ.txt,null,{type:"search",placeholder:ph||"Buscar producto…",autocomplete:"off"});
  i.addEventListener("change",()=>{CQ.txt=i.value.trim();re();});return fld("Buscar",i);}
const cNorm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const cPasaTxt=(x,campos)=>!CQ.txt||cNorm(campos.map(k=>x[k]).join(" ")).includes(cNorm(CQ.txt));
const cOpts=(L,k)=>[...new Set(L.map(x=>x[k]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es",{numeric:true})).map(x=>[x,x]);
function cAgrupa(L,k){const G={};L.forEach(x=>{const g=G[x[k]]=G[x[k]]||{k:x[k],n:0,cant:0,eur:0,ud:x.ud,uds:new Set()};g.n++;g.cant+=x.cant;g.eur+=x.eur||0;g.uds.add(x.ud);});
  return Object.values(G).sort((a,b)=>b.n-a.n||String(a.k).localeCompare(String(b.k),"es"));}
async function cExcel(nombre,filas,btn){if(!downloads){toast("Esta vista no permite descargar archivos");return;}btn.disabled=true;
  try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();X.utils.book_append_sheet(wb,X.utils.json_to_sheet(filas),nombre.slice(0,30));
    await downloads.save({filename:nombre.replace(/[\\/:*?"<>|«»]/g,"")+".xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Excel descargado");}
  catch(e){toast("No se pudo crear el Excel");}btn.disabled=false;}
const conEur=L=>L.some(x=>x.eur>0);
const cBarras=(titulo,R,campo)=>{const box=el("div",{style:"padding:4px 10px 10px"});
  if(window.GRAF&&R.length)setTimeout(()=>GRAF.barras(box,{x:R.map(r=>r.k),series:[{name:titulo,data:R.map(r=>Math.round((r[campo]||0)*100)/100)}],horizontal:true,fmt:campo==="eur"?"eur":"n"}),0);
  return box;};
/* --- Resumen --- */
function vCRes(v){const re=()=>render(true);const C=cConsumos(),E=cEntradas();
  const Cm=C.filter(cEnMes),Em=E.filter(cEnMes);
  const arts=artsActivos(),bad=arts.filter(a=>!a.pedido&&nivel(a)==="bad"),warn=arts.filter(a=>!a.pedido&&nivel(a)==="warn"),ped=arts.filter(a=>a.pedido);
  const pist=Cm.filter(x=>/^Cambio de pistón/.test(x.nota)).reduce((t,x)=>t+x.cant,0);
  const taller=ejes.filter(e=>e.estado==="reparacion"||e.estado==="devuelto").length;
  v.appendChild(el("p",{class:"hint",style:"margin:0",text:"Aquí ves lo que se ha consumido y dónde, lo que ha entrado y lo que queda. Es solo para consultar: no se puede cambiar nada."}));
  v.appendChild(el("div",{class:"card"},[el("div",{class:"bd frm"},[cSelMes(C.concat(E),re)])]));
  v.appendChild(cKpis([["Consumos",fmtN(Cm.length)],["Entradas",fmtN(Em.length)],["Pistones cambiados",fmtN(pist)],["Gasto",conEur(Cm)?eur(Cm.reduce((t,x)=>t+x.eur,0)):"—"]]));
  const porProd=cAgrupa(Cm,"prod").slice(0,8),porDonde=cAgrupa(Cm,"donde").slice(0,8),porMot=cAgrupa(Cm,"motivo").slice(0,8);
  const lista=(R,vacio)=>R.length?el("div",{class:"lst"},R.map(r=>el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},[el("div",{class:"t1",text:r.k}),el("div",{class:"t2",text:r.n+(r.n===1?" vez":" veces")})]),
    el("div",{class:"cant num"},[el("b",{text:fmtN(r.cant)}),el("small",{text:r.uds.size===1?r.ud:"uds"})])]))):el("p",{class:"empty",text:vacio});
  const ir=(t,extra)=>el("div",{class:"bd",style:"padding-top:0"},[el("button",{type:"button",class:"btn sec peq",text:t,onclick:()=>{Object.assign(CQ,extra||{});irA("cCons");}})]);
  v.appendChild(el("div",{class:"dosc"},[
    el("div",{class:"col"},[cCard("Lo más consumido",cTxtMes(),[lista(porProd,"Nada consumido en "+cTxtMes()+"."),ir("Ver todos los consumos",{vista:"det"})]),
      cCard("Por motivo",null,[lista(porMot,"—"),ir("Ver por motivo",{vista:"motivo"})])]),
    el("div",{class:"col"},[cCard("Dónde ha ido",null,[porDonde.length?cBarras("Veces",porDonde,"n"):el("p",{class:"empty",text:"—"}),ir("Ver por máquina o destino",{vista:"donde"})]),
      cCard("Stock",null,[el("div",{class:"lst"},[["Bajo mínimo",bad,"bad"],["Para pedir",warn,"warn"],["Pedidos en curso",ped,"info"]].map(([t,L,c])=>
        el("button",{type:"button",class:"it",onclick:()=>{CQ.estado=c==="info"?"ped":c;irA("cStock");}},[el("div",{class:"ppal"},[el("div",{class:"t1",text:t}),
          el("div",{class:"t2",text:L.slice(0,4).map(a=>nomArt(a)).join(" · ")+(L.length>4?" …":"")||"ninguno"})]),el("span",{class:"pill "+(L.length?c:"ok"),text:String(L.length)})])))]),
      cCard("Ejes",null,[el("div",{class:"lst"},[el("button",{type:"button",class:"it",onclick:()=>irA("cEjes")},[el("div",{class:"ppal"},[el("div",{class:"t1",text:"En el taller"}),el("div",{class:"t2",text:"en reparación o devueltos"})]),el("span",{class:"pill "+(taller?"warn":"ok"),text:String(taller)})]),
        el("button",{type:"button",class:"it",onclick:()=>irA("cEjes")},[el("div",{class:"ppal"},[el("div",{class:"t1",text:"En cuarentena"}),el("div",{class:"t2",text:"rotos o agarrotados, pendientes"})]),el("span",{class:"pill "+(ejePend().length?"bad":"ok"),text:String(ejePend().length)})])])])])]));}
/* --- Consumos --- */
function vCCons(v){const re=()=>render(true);const T=cConsumos();
  const L=T.filter(x=>cEnMes(x)&&(!CQ.donde||x.donde===CQ.donde)&&(!CQ.fam||x.fam===CQ.fam)&&(!CQ.motivo||x.motivo===CQ.motivo)&&cPasaTxt(x,["prod","donde","motivo","quien","nota"]))
    .sort((a,b)=>b.f.localeCompare(a.f));
  const Tm=T.filter(cEnMes);
  v.appendChild(el("div",{class:"card"},[el("div",{class:"bd frm cfil",style:"gap:10px"},[
    el("div",{class:"row"},[cSelMes(T,re),fld("Dónde",sel("cqDonde",cOpts(Tm,"donde"),CQ.donde,x=>{CQ.donde=x;re();},"Todo"))]),
    el("div",{class:"row"},[fld("Motivo",sel("cqMot",cOpts(Tm,"motivo"),CQ.motivo,x=>{CQ.motivo=x;re();},"Todos")),fld("Familia",sel("cqFam",cOpts(Tm,"fam"),CQ.fam,x=>{CQ.fam=x;re();},"Todas"))]),
    cBuscar(re,"Producto, máquina, persona…"),
    el("div",{class:"seg",role:"group","aria-label":"Cómo verlo"},[["det","Uno a uno"],["prod","Por producto"],["donde","Por dónde"],["motivo","Por motivo"]].map(([k,t])=>
      el("button",{type:"button","aria-pressed":String(CQ.vista===k),text:t,onclick:()=>{CQ.vista=k;re();}})))])]));
  const eurOk=conEur(L);
  v.appendChild(cKpis([["Consumos",fmtN(L.length)],["Productos",fmtN(new Set(L.map(x=>x.prod)).size)],["Sitios",fmtN(new Set(L.map(x=>x.donde)).size)],["Gasto",eurOk?eur(L.reduce((t,x)=>t+x.eur,0)):"—"]]));
  const xl=el("button",{type:"button",class:"btn sec",text:"Descargar Excel",onclick:e=>cExcel("Consumos "+cTxtMes(),L.map(x=>({"Fecha":x.f,"Producto":x.prod,"Familia":x.fam,"Cantidad":x.cant,"Unidad":x.ud,"Dónde":x.donde,"Motivo":x.motivo,"Quién":x.quien,"Sale de":x.sale,"Queda ahora":x.queda,"Importe (€)":Math.round(x.eur*100)/100,"Nota":x.nota})),e.currentTarget)});
  v.appendChild(el("div",{class:"acciones"},[xl]));
  if(!L.length){v.appendChild(el("p",{class:"empty",text:"No hay consumos con estos filtros en "+cTxtMes()+"."}));return;}
  if(CQ.vista==="det"){v.appendChild(cCard("Consumos ("+L.length+")",cTxtMes(),[cTabla(["Fecha","Producto","Cantidad","Dónde","Motivo","Quién","Queda"],
    L.slice(0,400).map(x=>[fmtF(x.f),x.prod,fmtN(x.cant)+" "+x.ud,x.donde,x.motivo,x.quien||"—",x.queda==null?"—":fmtN(x.queda)]),[2,6]),
    L.length>400?el("p",{class:"hint",style:"padding:8px 14px",text:"Se ven los 400 más recientes; el Excel lleva todos."}):null]));return;}
  const nom={prod:"producto",donde:"máquina o destino",motivo:"motivo"}[CQ.vista];const R=cAgrupa(L,CQ.vista);
  v.appendChild(cCard("Por "+nom+" ("+R.length+")",cTxtMes(),[cBarras("Veces",R.slice(0,12),"n"),
    cTabla([cap(nom),"Veces","Cantidad"].concat(eurOk?["Gasto"]:[]),R.map(r=>[r.k,fmtN(r.n),fmtN(r.cant)+" "+(r.uds.size===1?r.ud:"uds")].concat(eurOk?[r.eur?eur(r.eur):"—"]:[])),[1,2,3])]));}
/* --- Entradas --- */
function vCEnt(v){const re=()=>render(true);const T=cEntradas();
  const L=T.filter(x=>cEnMes(x)&&(!CQ.prov||x.prov===CQ.prov)&&(!CQ.fam||x.fam===CQ.fam)&&cPasaTxt(x,["prod","prov","alb","alm","nota"])).sort((a,b)=>b.f.localeCompare(a.f));
  const Tm=T.filter(cEnMes);
  v.appendChild(el("div",{class:"card"},[el("div",{class:"bd frm cfil",style:"gap:10px"},[
    el("div",{class:"row"},[cSelMes(T,re),fld("Proveedor",sel("cqProv",cOpts(Tm,"prov"),CQ.prov,x=>{CQ.prov=x;re();},"Todos"))]),
    el("div",{class:"row"},[fld("Familia",sel("cqFamE",cOpts(Tm,"fam"),CQ.fam,x=>{CQ.fam=x;re();},"Todas")),cBuscar(re,"Producto, albarán…")])])]));
  v.appendChild(cKpis([["Entradas",fmtN(L.length)],["Productos",fmtN(new Set(L.map(x=>x.prod)).size)],["Proveedores",fmtN(new Set(L.map(x=>x.prov)).size)]]));
  v.appendChild(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec",text:"Descargar Excel",onclick:e=>cExcel("Entradas "+cTxtMes(),L.map(x=>({"Fecha":x.f,"Producto":x.prod,"Familia":x.fam,"Cantidad":x.cant,"Unidad":x.ud,"Entra en":x.alm,"Proveedor":x.prov,"Albarán":x.alb,"Quién":x.quien,"Nota":x.nota})),e.currentTarget)})]));
  if(!L.length){v.appendChild(el("p",{class:"empty",text:"No hay entradas con estos filtros en "+cTxtMes()+"."}));return;}
  v.appendChild(cCard("Entradas ("+L.length+")",cTxtMes(),[cTabla(["Fecha","Producto","Cantidad","Entra en","Proveedor","Albarán"],
    L.slice(0,400).map(x=>[fmtF(x.f),x.prod,fmtN(x.cant)+" "+x.ud,x.alm,x.prov,x.foto?el("button",{type:"button",class:"btn txt peq",text:x.alb||"Ver foto",onclick:()=>lightbox(fotoUrl(x.foto))}):(x.alb||"—")]),[2])]));}
/* --- Stock --- */
const C_EST={bad:["Bajo mínimo","bad",0],warn:["Para pedir","warn",1],ped:["Pedido","info",2],ok:["Bien","ok",3],na:["Sin mínimo","na",4]};
function vCStock(v){const re=()=>render(true);
  const T=artsActivos().map(a=>{const n=a.pedido?"ped":nivel(a);const x=SM[a.id]||{};
    return{a,prod:nomArt(a),fam:FAM[a.fam]||"",est:n,queda:stockDe(a.id),ud:a.ud||"ud",min:+a.min||0,
      donde:Object.entries(x).filter(([,c])=>c).map(([l,c])=>almN(l)+" "+fmtN(c)).join(" · "),alms:Object.keys(x).filter(l=>x[l])};});
  const L=T.filter(x=>(!CQ.estado||x.est===CQ.estado)&&(!CQ.fam||x.fam===CQ.fam)&&(!CQ.alm||x.alms.includes(CQ.alm))&&cPasaTxt(x,["prod","fam","donde"]))
    .sort((p,q)=>C_EST[p.est][2]-C_EST[q.est][2]||p.prod.localeCompare(q.prod,"es",{numeric:true}));
  const cuenta=k=>T.filter(x=>x.est===k).length;
  v.appendChild(el("div",{class:"card"},[el("div",{class:"bd frm cfil",style:"gap:10px"},[
    el("div",{class:"chips chips-per",role:"group","aria-label":"Estado"},[["","Todo"],["bad","Bajo mínimo"],["warn","Para pedir"],["ped","Pedido"],["ok","Bien"]].map(([k,t])=>
      el("button",{type:"button",class:"chip","aria-pressed":String(CQ.estado===k),text:t+(k?" ("+cuenta(k)+")":""),onclick:()=>{CQ.estado=k;re();}}))),
    el("div",{class:"row"},[fld("Familia",sel("cqFamS",cOpts(T,"fam"),CQ.fam,x=>{CQ.fam=x;re();},"Todas")),fld("Almacén",sel("cqAlm",cat.almacenes.map(a=>[a.id,a.nom]),CQ.alm,x=>{CQ.alm=x;re();},"Todos"))]),
    cBuscar(re)])]));
  v.appendChild(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec",text:"Descargar Excel",onclick:e=>cExcel("Stock "+fmtF(hoy()).replace(/\//g,"-"),L.map(x=>({"Producto":x.prod,"Familia":x.fam,"Queda":x.queda,"Unidad":x.ud,"Mínimo":x.min||"","Estado":C_EST[x.est][0],"Dónde está":x.donde,"Pedido el":x.a.pedido||"","Llega":x.a.prevista||""})),e.currentTarget)})]));
  if(!L.length){v.appendChild(el("p",{class:"empty",text:"Ningún producto con estos filtros."}));return;}
  v.appendChild(cCard("Lo que queda ("+L.length+")","a día de hoy",[cTabla(["Producto","Queda","Mínimo","Estado","Dónde está"],
    L.map(x=>[x.prod,fmtN(x.queda)+" "+x.ud,x.min?fmtN(x.min):"—",el("span",{class:"pill "+C_EST[x.est][1],text:C_EST[x.est][0]+(x.est==="ped"&&x.a.prevista?" · llega "+fmtF(x.a.prevista):"")}),x.donde||"—"]),[1,2],[4])]));}
/* --- Ejes --- */
function vCEjes(v){const vivos=ejes.filter(e=>e.estado!=="baja");const n=k=>vivos.filter(e=>e.estado===k).length;const P=ejePend();
  v.appendChild(cKpis([["En planta",fmtN(n("planta"))],["Para enviar",fmtN(n("preparado"))],["En el taller",fmtN(n("reparacion")+n("devuelto"))],["Cuarentena",fmtN(P.length)]]));
  if(P.length)v.appendChild(cCard("En cuarentena ("+P.length+")","rotos o agarrotados",[cTabla(["Máquina","Modelo","Motivo","Desde"],
    P.slice().sort((a,b)=>a.f.localeCompare(b.f)).map(p=>[p.maq,(p.mods||[]).join(" / ")||"sin saber",motTxt(p)+(p.nota&&p.motivo!=="OTRO"?" · "+p.nota:""),fmtF(p.f)]),null,[2])]));
  const fuera=vivos.filter(e=>e.estado!=="planta").map(e=>{const ab=abiertaDe(e.cod);return{e,desde:ab?(ab.env||ab.alta||""):""};}).sort((a,b)=>(a.desde||"9").localeCompare(b.desde||"9"));
  v.appendChild(cCard("Fuera de planta ("+fuera.length+")","preparados y en el taller",[fuera.length?cTabla(["Eje","Modelo","Estado","Desde","Motivo"],
    fuera.map(({e,desde})=>{const ab=abiertaDe(e.cod),[t,c]=EST_E[e.estado]||["—","na"];return[e.cod,ejeRef(e),el("span",{class:"pill "+c,text:t}),desde?fmtF(desde):"—",ab&&ab.desp?ab.desp:"—"];}),null,[4]):el("p",{class:"empty",text:"Todos los ejes están en planta."})]));
  const mods=[...new Set(vivos.map(e=>e.mod))].sort((a,b)=>String(a).localeCompare(String(b),"es",{numeric:true}));
  v.appendChild(cCard("Por modelo",null,[cTabla(["Modelo","En planta","Fuera","Total"],mods.map(m=>{const es=vivos.filter(e=>e.mod===m);const pl=es.filter(e=>e.estado==="planta").length;
    const md=(cat.modelos||[]).find(x=>x.cod===m);return[md&&md.ref?md.ref+" ("+m+")":m,fmtN(pl),fmtN(es.length-pl),fmtN(es.length)];}),[1,2,3])]));}
const VC={cRes:vCRes,cCons:vCCons,cEnt:vCEnt,cStock:vCStock,cEjes:vCEjes};
/* al saber que el usuario es de solo consulta: cambian las pestañas */
function modoConsulta(){TABS.splice(0,TABS.length,...TABS_C);let t=null;try{t=localStorage.getItem("almacen.tabC");}catch(e){}
  tab=VC[t]?t:"cRes";tabsUI();render(true);}

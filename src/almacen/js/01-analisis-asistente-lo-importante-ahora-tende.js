/* ===== ANÁLISIS: asistente + lo importante ahora + tendencias ===== */
const sumaN=(L,f)=>L.reduce((t,x)=>t+(f?f(x):x),0);
/* alertas que se calculan solas con los datos */
function alertasAnalisis(){const hy=hoy(),d30=sumaDias(hy,-30),d120=sumaDias(hy,-120),d365=sumaDias(hy,-365),out=[];
  const P=qHechos("pist");const porM={};P.forEach(h=>{if(!h.maq)return;const x=porM[h.maq]=porM[h.maq]||{u30:0,ant:0,rot:0,d90:0};if(h.f>=d30){x.u30+=h.cant;if(/rotura|agarrot/i.test(h.motivo))x.rot+=h.cant;}else if(h.f>=d120)x.ant+=h.cant;if(h.f>=sumaDias(hy,-90))x.d90+=h.cant;});
  const v90=Object.values(porM).map(x=>x.d90).filter(n=>n>0).sort((a,b)=>a-b);const med=v90.length?v90[Math.floor(v90.length/2)]:0;
  Object.entries(porM).forEach(([m,x])=>{const ritmo=x.ant/3;
    if(x.u30>=3&&x.u30>=2*Math.max(ritmo,0.5))out.push({niv:"bad",t:m+" gasta pistones de más",d:x.u30+" pistones en 30 días; antes llevaba "+fmtN(Math.round(ritmo*10)/10)+" al mes",q:{que:"pist",per:"3m",maq:m,grp:"motivo",ord:"cant"}});
    else if(med&&x.d90>=4&&x.d90>=2.5*med)out.push({niv:"warn",t:m+" muy por encima del resto",d:x.d90+" pistones en 3 meses; la máquina típica lleva "+med,q:{que:"pist",per:"3m",maq:m,grp:"motivo",ord:"cant"}});
    if(x.rot>=2)out.push({niv:"bad",t:m+": "+x.rot+" roturas o agarrotados en 30 días",d:"Revisar eje, refrigeración y pistonwax de esa máquina",q:{que:"pist",per:"3m",maq:m,grp:"det",ord:"n"}});});
  const R=qHechos("rep").filter(h=>h.f>=d365);const porE={};R.forEach(h=>{(porE[h.eje]=porE[h.eje]||[]).push(h.f);});
  Object.entries(porE).filter(([,fs])=>fs.length>=3).sort((a,b)=>b[1].length-a[1].length).slice(0,5).forEach(([e,fs])=>{fs.sort();const int=Math.round(dias(fs[0],fs[fs.length-1])/(fs.length-1));
    out.push({niv:"warn",t:"El eje "+e+" vuelve al taller cada "+int+" días",d:fs.length+" reparaciones en 12 meses. Puede que no se repare bien o que la máquina lo castigue",q:{que:"rep",per:"12m",txt:e,grp:"det",ord:"clave"}});});
  const tall=todasRep().filter(r=>r.env&&!r.res&&r.res!=="anulada").map(r=>({r,d:dias(r.env,hy)})).filter(x=>x.d>30).sort((a,b)=>b.d-a.d);
  if(tall.length)out.push({niv:"warn",t:tall.length+(tall.length===1?" eje lleva":" ejes llevan")+" más de 30 días en el taller",d:tall.slice(0,6).map(x=>x.r.eje+" ("+x.d+" d)").join(", "),ir:"ejes"});
  const cu=ejePend().filter(p=>dias(p.f,hy)>7);if(cu.length)out.push({niv:"warn",t:cu.length+(cu.length===1?" eje en cuarentena":" ejes en cuarentena")+" desde hace más de una semana",d:cu.map(p=>p.maq+" ("+dias(p.f,hy)+" d)").join(", "),ir:"ejes"});
  artsActivos().filter(a=>["piston","horno","barra","tornillo","consumible"].includes(a.fam)&&!a.limp).forEach(a=>{const c=consDia(a),st=stockDe(a.id);if(!(c>0))return;const cob=Math.floor(st/c),pl=plazoDe(a);
    if(cob<pl)out.push({niv:st<=0?"bad":"warn",t:(TEC(a.fam)?nomBT(a):a.desc)+(st<=0?": no queda":": se acaba en "+cob+" días"),d:"Hay "+fmtN(st)+" "+a.ud+", se gasta "+fmtN(Math.round(c*300)/10)+" al mes y el proveedor tarda "+pl+" días"+(a.pedido?" · ya pedido el "+fmtF(a.pedido):""),ir:"stock"});});
  return out.sort((a,b)=>(a.niv==="bad"?0:1)-(b.niv==="bad"?0:1));}
function tendencias(){const hy=hoy(),m0=hy.slice(0,7);const meses=[];let d=m0+"-01";for(let i=0;i<12;i++){meses.unshift(d.slice(0,7));d=sumaDias(d,-1).slice(0,7)+"-01";}
  const P=qHechos("pist"),R=qHechos("rep"),M=qHechos("mat");const by=(L,f)=>meses.map(m=>sumaN(L.filter(h=>h.f.slice(0,7)===m),f));
  return{meses,pist:by(P,h=>h.cant),rep:by(R,()=>1),eur:meses.map((m,i)=>sumaN(P.concat(R,M).filter(h=>h.f.slice(0,7)===m),h=>h.eur))};}
function barras(meses,vals,fmt){const mx=Math.max(...vals,1);return el("div",{style:"display:grid;grid-template-columns:repeat("+meses.length+",1fr);gap:3px;align-items:end;height:110px;padding:6px 2px 0"},
  meses.map((m,i)=>el("div",{title:cap(fmtMes(m))+": "+fmt(vals[i]),style:"display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:2px"},[
    el("div",{class:"num",style:"font-size:10px;color:var(--ink2)",text:vals[i]?fmt(vals[i]):""}),
    el("div",{style:"width:100%;border-radius:3px 3px 0 0;background:var(--acc,#2F5D46);opacity:"+(i===meses.length-1?".55":".85")+";height:"+Math.max(vals[i]?3:0,Math.round(vals[i]/mx*80))+"px"}),
    el("div",{style:"font-size:10px;color:var(--ink2)",text:MESES[+m.slice(5)-1].slice(0,3)})])));}
/* lo que sale debajo del buscador de Consultas: lo importante, la tendencia y la consulta a mano (plegada) */
function vAnalisis(v){const re=()=>render(true);
  /* lo importante ahora */
  const AL=alertasAnalisis(),nAL=draft.alTodas?15:5;
  v.appendChild(el("section",{class:"card"+(AL.some(a=>a.niv==="bad")?" alerta":"")},[el("div",{class:"hd"},[el("h2",{text:"Lo importante ahora ("+AL.length+")"}),AL.length>5?el("button",{type:"button",class:"btn txt peq der",text:draft.alTodas?"Ver menos":"Ver todas",onclick:()=>{draft.alTodas=!draft.alTodas;re();}}):null]),
    AL.length?el("div",{class:"lst"},AL.slice(0,nAL).map(a=>el("button",{type:"button",class:"it",onclick:()=>{if(a.ir){irA(a.ir);return;}draft.q=Object.assign(Q0(),a.q);draft.qAb=true;const b=document.getElementById("qBuilder");render(true);setTimeout(()=>{const x=document.getElementById("qBuilder");if(x)x.scrollIntoView({behavior:"smooth"});},50);}},[
      el("span",{class:"stripe "+a.niv}),el("div",{class:"ppal"},[el("div",{class:"t1",text:a.t}),el("div",{class:"t2",text:a.d})]),el("div",{class:"cant"},el("small",{text:"ver ›"}))]))):el("p",{class:"hint",style:"padding:10px 14px",text:"Nada fuera de lo normal."})]));
  /* tendencias */
  const T=tendencias(),n=T.meses.length-1,hy=hoy();const dm=+hy.slice(8),dmes=new Date(+hy.slice(0,4),+hy.slice(5,7),0).getDate();const proy=Math.round(T.pist[n]/Math.max(1,dm)*dmes);
  v.appendChild(el("dl",{class:"kpis num"},[["Pistones este mes",fmtN(T.pist[n])+" (va a ~"+proy+")"],["Mes pasado",fmtN(T.pist[n-1])],["Ejes al taller este mes",fmtN(T.rep[n])],["Gasto este mes",T.eur[n]?eur(T.eur[n]):"—"]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))));
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Tendencia · 12 meses"})),el("div",{class:"bd",style:"display:grid;gap:14px"},[
    el("div",{},[el("div",{class:"sub",text:"Pistones cambiados por mes"}),barras(T.meses,T.pist,fmtN)]),
    el("div",{},[el("div",{class:"sub",text:"Ejes mandados al taller por mes"}),barras(T.meses,T.rep,fmtN)]),
    T.eur.some(x=>x)?el("div",{},[el("div",{class:"sub",text:"Gasto por mes (lo que tiene precio)"}),barras(T.meses,T.eur,x=>Math.round(x)+"")]):null])]));
  /* consultas a mano */
  const det=el("details",{class:"card qmano"});if(draft.qAb||draft.qPre)det.open=true;det.addEventListener("toggle",()=>{draft.qAb=det.open;});
  det.appendChild(el("summary",{class:"hd",style:"cursor:pointer"},el("h2",{text:"Consulta a mano (filtros, guardadas y Excel)"})));
  const box=el("div",{id:"qBuilder",style:"padding:0 0 4px"});det.appendChild(box);v.appendChild(det);vConsultas(box);}
/* ---------- asistente: Claude hace el plan, la app calcula ---------- */
function ctxConsulta(){const H=qHechos("gasto");return{
  maquinas:cat.maquinas.map(m=>({cod:m.cod,zona:zonaDe(m),horno:hornoTxt(m)||"",modeloMaq:valFicha(m,"c-maq")||""})),
  modelosEje:(cat.modelos||[]).map(x=>({cod:x.cod,ref:x.ref,maquinas:inyDe(x).join(",")})),
  motivos:[...new Set(H.map(h=>h.motivo))].filter(x=>x&&x!=="—").slice(0,80),
  articulos:artsActivos().map(a=>(TEC(a.fam)?nomBT(a):a.desc)).slice(0,250),
  diametros:DIAM,zonas:[...new Set(cat.maquinas.map(zonaDe))],
  datosDesde:H.reduce((m,h)=>h.f&&h.f<m?h.f:m,hoy()),precios:{pistones:DIAM.some(d=>precioDe(pistArt(d))),reparacionesEje:(cat.modelos||[]).some(x=>+x.precioRep>0)}};}
function qPaso(p){/* ejecuta un paso del plan con el motor local */
  if(p.que==="stock"){const t=norm(p.buscar||"");const L=artsActivos().filter(a=>!a.limp&&(!t||norm(a.desc+" "+(a.cod||"")+" "+(a.diam||"")).includes(t))&&(!p.familia||a.fam===p.familia)).map(a=>{const c=consDia(a),st=stockDe(a.id);const cob=c>0?Math.floor(st/c):null;
      return{"Artículo":TEC(a.fam)?nomBT(a):a.desc,"Stock":st,"Gasto al mes":Math.round(c*30*10)/10,"Días que dura":cob==null?"sin consumo":cob,"Se acaba el":cob==null?"—":fmtF(sumaDias(hoy(),cob)),"Plazo proveedor (días)":plazoDe(a),"Pedido":a.pedido?fmtF(a.pedido):""};}).sort((x,y)=>(typeof x["Días que dura"]==="number"?x["Días que dura"]:1e9)-(typeof y["Días que dura"]==="number"?y["Días que dura"]:1e9));
    return{cols:Object.keys(L[0]||{"Artículo":0}),rows:L.slice(0,p.top||60),total:L.length};}
  if(p.que==="taller"){const hy=hoy();const L=todasRep().filter(r=>r.res!=="anulada"&&!r.res).map(r=>({"Eje":r.eje,"Modelo":(modelo(modeloDeEje(r.eje))||{}).ref||modeloDeEje(r.eje),"Estado":r.env?"En el taller":"Preparado","Desde":fmtF(r.env||r.alta),"Días":dias(r.env||r.alta,hy),"Desperfecto":r.desp||""})).sort((a,b)=>b["Días"]-a["Días"]);return{cols:Object.keys(L[0]||{"Eje":0}),rows:L.slice(0,p.top||60),total:L.length};}
  const q={que:["pist","rep","mat","gasto"].includes(p.que)?p.que:"gasto",per:"rango",d:p.desde||"2000-01-01",h:p.hasta||hoy(),maq:"",zona:p.zona||"",motivo:"",txt:p.buscar||""};
  let L=qFiltra(q);const ms=(p.maq||[]).filter(Boolean),mo=(p.motivo||[]).map(norm).filter(Boolean),zs=(p.zonas||[]).filter(Boolean);
  if(ms.length)L=L.filter(h=>ms.includes(h.maq)||(h.varias&&h.maq.split("/").some(x=>ms.includes(x))));
  if(mo.length)L=L.filter(h=>mo.some(m=>norm(h.motivo).includes(m)));if(zs.length)L=L.filter(h=>zs.includes(h.zona));
  const G=(p.agrupar||[]).filter(g=>Q_GRP[g]&&g!=="det").slice(0,2);const med=["n","cant","eur"].includes(p.medida)?p.medida:"cant";
  if(!G.length){const D=L.slice().sort((a,b)=>p.orden==="asc"?a.f.localeCompare(b.f):(b[med]-a[med])||b.f.localeCompare(a.f));
    return{cols:["Fecha","Tipo","Máquina","Qué","Motivo","Cantidad","Gasto €"],rows:D.slice(0,p.top||60).map(h=>({"Fecha":fmtF(h.f),"Tipo":h.tipo,"Máquina":h.maq||h.zona,"Qué":h.eje?h.eje+" · "+h.art:h.art,"Motivo":h.motivo,"Cantidad":h.cant,"Gasto €":Math.round(h.eur*100)/100})),total:L.length,
      resumen:{registros:L.length,cantidad:sumaN(L,h=>h.cant),gasto:Math.round(sumaN(L,h=>h.eur)),sinPrecio:L.filter(h=>h.sinP).length}};}
  const R={};L.forEach(h=>{const ks=G.map(g=>qClave(h,g));const k=ks.join(" · ");const x=R[k]=R[k]||{ks,n:0,cant:0,eur:0};x.n++;x.cant+=h.cant;x.eur+=h.eur;});
  let rows=Object.values(R);const c=p.condicion;if(c&&["n","cant","eur"].includes(c.medida)&&isFinite(+c.valor)){const v=+c.valor,op=c.op;rows=rows.filter(r=>op===">"?r[c.medida]>v:op===">="?r[c.medida]>=v:op==="<"?r[c.medida]<v:op==="<="?r[c.medida]<=v:r[c.medida]===v);}
  rows.sort((a,b)=>p.orden==="clave"?a.ks.join("|").localeCompare(b.ks.join("|"),"es",{numeric:true}):p.orden==="asc"?a[med]-b[med]:b[med]-a[med]);
  return{cols:G.map(g=>Q_GRP[g]).concat(["Veces","Cantidad","Gasto €"]),rows:rows.slice(0,p.top||60).map(r=>{const o={};G.forEach((g,i)=>o[Q_GRP[g]]=g==="mes"?cap(fmtMes(r.ks[i])):r.ks[i]);o["Veces"]=r.n;o["Cantidad"]=Math.round(r.cant*100)/100;o["Gasto €"]=Math.round(r.eur*100)/100;return o;}),total:rows.length,
    resumen:{registros:L.length,cantidad:sumaN(L,h=>h.cant),gasto:Math.round(sumaN(L,h=>h.eur)),sinPrecio:L.filter(h=>h.sinP).length}};}
async function preguntarIA(){const A=draft.ia;const pr=(A.preg||"").trim();if(!pr){toast("Escribe una pregunta");return;}A.cargando=true;A.err="";render(true);
  try{const plan=await llamarFn("consulta-almacen",{modo:"plan",pregunta:pr,hoy:hoy(),contexto:ctxConsulta()});
    const pasos=(plan.pasos||[]).slice(0,5).map(p=>{let r;try{r=qPaso(p);}catch(e){r={cols:["Error"],rows:[{"Error":"No se pudo calcular"}],total:0};}return{p,r};});
    let txt="";try{const ex=await llamarFn("consulta-almacen",{modo:"respuesta",pregunta:pr,hoy:hoy(),entendido:plan.entendido||"",resultados:pasos.map(x=>({titulo:x.p.titulo,filtros:x.p,total:x.r.total,resumen:x.r.resumen||null,filas:x.r.rows.slice(0,40)})),precios:ctxConsulta().precios});txt=ex.respuesta||"";}catch(e){txt="";}
    A.res={preg:pr,entendido:plan.entendido||"",pasos,txt,aviso:plan.aviso||""};}
  catch(e){A.err="No se pudo responder: "+(e&&e.message||"error");}
  A.cargando=false;render(true);}
function respIA(R){return el("div",{style:"display:grid;gap:10px;margin-top:6px"},[
  R.txt?el("div",{style:"white-space:pre-wrap;line-height:1.45;padding:12px;border-radius:8px;background:var(--surf2)",text:R.txt}):null,
  R.aviso?el("p",{class:"hint",text:R.aviso}):null,
  ...R.pasos.map(({p,r})=>el("details",{class:"card",open:R.pasos.length===1},[el("summary",{class:"gh",style:"cursor:pointer",text:(p.titulo||"Datos")+" · "+r.total+(r.total===1?" fila":" filas")}),
    r.rows.length?el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},r.cols.map(c=>el("th",{text:c})))),el("tbody",{},r.rows.map(o=>el("tr",{},r.cols.map(c=>el("td",{class:typeof o[c]==="number"?"r num":"",text:typeof o[c]==="number"?fmtN(o[c]):String(o[c]==null?"":o[c])})))))])):el("p",{class:"hint",style:"padding:8px 14px",text:"Sin datos."}),
    el("div",{class:"acciones",style:"padding:6px 10px"},el("button",{type:"button",class:"btn sec peq",text:"Excel",onclick:e=>excelPaso(p,r,e.currentTarget)}))])),
  el("p",{class:"hint",text:"Entendido como: "+(R.entendido||R.preg)})]);}
async function excelPaso(p,r,btn){if(!downloads){toast("Esta vista no permite descargar archivos");return;}btn.disabled=true;try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();X.utils.book_append_sheet(wb,X.utils.json_to_sheet(r.rows.length?r.rows:[{"Sin datos":""}]),"Datos");
  await downloads.save({filename:(p.titulo||"Consulta").replace(/[\\/:*?"<>|«»]/g,"").slice(0,60)+".xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Excel descargado");}catch(e){toast("No se pudo crear el Excel");}btn.disabled=false;}

/* números clave para la página Inicio (inicio.html): se guardan solo si cambian, como mucho cada 20 s */
let _kpiT=null,_kpiU="";
function kpiInicio(){if(!ready||!catOk||!db)return;clearTimeout(_kpiT);_kpiT=setTimeout(async()=>{try{
  let bajar=0,uds=0;lineas().forEach(l=>faltas(l.id).forEach(f=>{if(f.falta>0&&f.org){bajar++;uds+=f.falta;}}));
  const A=artsActivos().filter(a=>!a.pedido),bad=A.filter(a=>nivel(a)==="bad").length,warn=A.filter(a=>nivel(a)==="warn").length;
  const ped=artsActivos().filter(a=>a.pedido).length;
  const pl=ejes.filter(e=>e.estado==="planta").length-ejePend().length,tall=ejes.filter(e=>e.estado==="reparacion"||e.estado==="devuelto").length;
  const mes=hoy().slice(0,7),pm=todosPist().filter(p=>p.f.startsWith(mes)).reduce((t,p)=>t+(+p.cant||1),0);
  const E=puEstado();const k={bajar,uds,pedir:bad+warn,bajoMin:bad,pedidos:ped,ejesTot:ejes.filter(e=>e.estado!=="baja").length,prep:ejes.filter(e=>e.estado==="preparado").length,ejesPlanta:pl,ejesTaller:tall,cuarentena:ejePend().length,
    pistMes:pm,usadosZona:E?E.tot.Z:null,urgeRecup:E?puUrge(E).length:0,iny:(cat.maquinas||[]).length};
  const u=JSON.stringify(k);if(u===_kpiU)return;_kpiU=u;await db.doc("kpi/inicio").set(Object.assign(k,{ts:Date.now()}));}catch(e){}},20000);}
function vMas(v){
  const D={pist:"Cambios, stock por Ø, informe para Beatriz y gasto",ejes:"Modelos y planos, dónde está cada eje, cuarentena, taller y costes",cont:"Estantería, inventario y qué lleva cada máquina",
    btb:"Stock, cambios y qué máquinas las llevan",btt:"Stock, cambios y qué máquinas los llevan",bth:"Conos, tubos, juntas, resistencias… y lo cambiado desde Limpieza",
    quim:"Stock en kg y envases, consumo y días que quedan",iny:"Plano de las naves y la ficha completa de cada máquina",mol:"Moldes y el Ø de pistón que usa cada uno",
    desv:"Gasto que se sale de lo normal por máquina y material, causas e informe del mes",bd:"Pregunta lo que necesites, lo importante ahora, tendencias y consultas a mano",mov:"Entradas con albarán, traslados y conteos",consultas:"Pregúntale a la app, alertas y tendencias",cat:"Artículos, almacenes, máquinas y copias"};
  const av={};try{const np=pistPend().length;if(np)av.pist=[np+" sin informar",""];const nq=ejePend().length;if(nq)av.ejes=[nq+" en cuarentena","bad"];}catch(e){}
  try{const sr=CT_TIPOS.filter(t=>{const c=cuentaTipo(t);return c.tot&&!c.est;}).length;if(sr)av.cont=[sr+" sin repuesto","bad"];}catch(e){}
  try{Object.entries({btb:"barra",btt:"tornillo",bth:"horno"}).forEach(([k,f])=>{const n=artsBT(f).filter(a=>nivel(a)==="bad").length;if(n)av[k]=[n+" bajo mínimo","bad"];});
    const nq=artsActivos().filter(a=>GRUPOS_Q.includes(grupoDe(a))&&nivel(a)==="bad").length;if(nq)av.quim=[nq+" bajo mínimo","bad"];}catch(e){}
  try{const nd=calcDesv().L.filter(d=>!d.just);if(nd.length)av.desv=[nd.length+(nd.length===1?" desviación":" desviaciones"),nd.some(d=>d.niv==="bad")?"bad":""];}catch(e){}
  const nom=Object.fromEntries(SUB);
  SUB_G.forEach(([g,ids])=>{v.appendChild(el("div",{class:"gh mas-g",text:g}));
    v.appendChild(el("div",{class:"tiles"},ids.map(id=>el("button",{type:"button",class:"tile",onclick:()=>irA(id)},[el("span",{class:"tt",text:nom[id]}),el("span",{class:"td",text:D[id]||""}),av[id]?el("span",{class:"tav "+av[id][1],text:av[id][0]}):null]))));});
}

/* ===== RESUMEN: todo de un vistazo para decidir rápido ===== */
/* Ajustes de la lista «Bajar a planta» de HOY: cantidad cambiada o artículo quitado. Se borran solos al día siguiente. */
function ajBajarHoy(){const B=cat.bajarAj;return(B&&B.dia===hoy()&&B.m)?B.m:{};}
function guardaBajar(k,val){const hy=hoy();const cur=cat.bajarAj&&cat.bajarAj.dia===hy?cat.bajarAj.m:{};cat.bajarAj={dia:hy,m:Object.assign({},cur,{[k]:val})};return saveCat();}
function cambiarBajar(f){const campo=el("input",{type:"text",inputmode:"numeric",value:String(f.falta),"aria-label":"Cantidad a reponer"});
  dlg("Cantidad a reponer",el("div",null,[el("p",{class:"hint",text:f.a.desc+" · "+corto(f.l)}),campo]),[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const n=parseInt(campo.value,10);if(!(n>=0)){toast("Pon un número (0 o más)");return false;}await guardaBajar(f.k,{cant:n});render(true);toast("Cantidad guardada");}}]);}
function quitarBajar(f){confirmar("Quitar de la lista",f.a.desc+" · "+corto(f.l)+": ahora hay "+fmtN(f.st)+". Deja de salir para bajar y no vuelve hasta que se gaste alguno más; entonces sale solo lo que se haya gastado.","Quitar",async()=>{cat.bajarOk=Object.assign({},cat.bajarOk,{[f.k]:{st:f.st,f:hoy(),ts:Date.now()}});await saveCat();render(true);toast("Quitado: vuelve si se gasta más");});}
function hayTxt(st){return st<0?"no cuadra ("+fmtN(st)+"), cuéntalo":"hay "+fmtN(st);}
function negativos(){const L=[];(cat.almacenes||[]).forEach(al=>artsActivos().forEach(a=>{let st;try{st=stockDe(a.id,al.id);}catch(e){return;}if(st<0)L.push({a,al,st});}));return L;}
function bajarEditor(L){return el("div",{style:"margin-top:6px"},L.map(f=>el("div",{class:"bj"},[
  el("div",{class:"bjt"},[el("b",{text:f.a.desc}),el("small",{class:f.st<0?"neg":null,text:"a "+corto(f.l)+" · "+hayTxt(f.st)+" de "+fmtN(f.obj)})]),
  el("button",{type:"button",class:"bjq num","aria-label":"Cambiar cantidad de "+f.a.desc,text:fmtN(f.falta),onclick:()=>cambiarBajar(f)}),
  el("button",{type:"button",class:"bjx","aria-label":"No bajar "+f.a.desc,text:"✕",onclick:()=>quitarBajar(f)})])));}
function vRes(v){const hy=hoy(),R=prevTodo(),S=R.S;const ir=(t,fn)=>()=>{irA(t);if(fn)setTimeout(fn,0);};
  /* --- qué hacer hoy --- */
  const tareas=[];const T=(niv,txt,det,btn,fn,extra)=>tareas.push({niv,txt,det,btn,fn,extra});
  const crit=artsActivos().filter(a=>!a.pedido&&nivel(a)==="bad"),pedir=artsActivos().filter(a=>!a.pedido&&nivel(a)==="warn");
  {const tp=crit.concat(pedir),n=tp.length;if(n)T(crit.length?"bad":"warn",n+(n===1?" artículo":" artículos")+" para pedir"+(crit.length?" ("+crit.length+" bajo mínimo)":""),tp.slice(0,4).map(a=>a.desc).join(", ")+(n>4?"…":""),"Lista de pedido",listaPedido);}
  {const ng=negativos();if(ng.length)T("bad",ng.length+(ng.length===1?" artículo no cuadra":" artículos no cuadran")+" (sale en negativo)",ng.slice(0,4).map(x=>x.a.desc+" en "+corto(x.al)+" "+fmtN(x.st)).join(", ")+(ng.length>4?"…":"")+". Se ha apuntado más gasto del que había: cuenta lo que hay y apúntalo.","Contar",()=>{const x=ng[0];Object.assign(draft.m,{tipo:"ajuste",art:x.a.id,alm:x.al.id,cant:""});irA("mov");});}
  const retr=artsActivos().filter(a=>a.pedido&&a.prevista&&a.prevista<hy);
  if(retr.length)T("bad",retr.length+" pedidos retrasados",retr.map(a=>a.desc+" ("+dias(a.prevista,hy)+" d)").slice(0,4).join(", "),"Ver pedidos",ir("stock"));
  const AJ=ajBajarHoy();const bajar=[];
  lineas().forEach(l=>faltas(l.id).forEach(f=>{if(!(f.falta>0&&f.org))return;const k=l.id+"|"+f.a.id,x=AJ[k]||{};if(x.quitar)return;
    const cant=x.cant!=null?x.cant:f.falta;if(cant>0)bajar.push(Object.assign({l,k},f,{falta:cant}));}));
  {const nq=Object.keys(okBajar()).length;if(nq)T("info",nq+" artículo"+(nq===1?"":"s")+" quitado"+(nq===1?"":"s")+" de «Bajar a planta»","Vuelven solos si se gasta más. Si quieres que vuelvan a contar desde ya, pulsa el botón.","Volver a mostrar",()=>confirmar("Volver a mostrar",Object.keys(okBajar()).map(k=>{const[l,id]=k.split("|");const a=art(id),al=almById(l);return(a?a.desc:"?")+" · "+(al?corto(al):"?");}).join(", "),"Mostrar todos",async()=>{cat.bajarOk={};await saveCat();render(true);toast("Vuelven a contar todos");}));}
  if(bajar.length)T("warn","Bajar "+bajar.length+(bajar.length===1?" artículo":" artículos")+" a planta","A "+[...new Set(bajar.map(f=>corto(f.l)))].join(", "),"Reponer",ir("repo",()=>{draft.rv="hoy";render(true);}),bajarEditor(bajar));
  const pend=ejePend();if(pend.length)T("bad",pend.length+(pend.length===1?" eje":" ejes")+" en cuarentena sin número",pend.map(p=>p.maq).join(", "),"Poner número",ir("ejes"));
  const prep=ejes.filter(e=>e.estado==="preparado");if(prep.length)T("warn",prep.length+(prep.length===1?" eje preparado":" ejes preparados")+" sin enviar",prep.map(e=>e.cod).slice(0,6).join(", "),"Enviar",()=>{irA("ejes");setTimeout(envioMultiple,0);});
  const ejP=R.E.L.filter(x=>x.pedir>0||x.faltan>0);if(ejP.length)T(ejP.some(x=>x.faltan)?"bad":"warn","Pedir "+ejP.reduce((t,x)=>t+x.pedir,0)+" ejes al taller",ejP.map(x=>x.m.cod+(x.pedir?" ×"+x.pedir:"")+(x.faltan?" (faltan "+x.faltan+")":"")).join(", "),"Ver previsión",ir("repo",()=>{draft.rv="prev";render(true);}));
  const prevP=R.arts.filter(x=>x.pedir>0&&!(x.a.pedido));if(prevP.length)T("info","Pedido previsto hasta fin de "+nomMes(S.mesSig)+": "+prevP.length+" artículos",prevP.slice(0,4).map(x=>x.a.desc+" "+fmtN(x.pedir)).join(", ")+(prevP.length>4?"…":""),"Ver previsión",ir("repo",()=>{draft.rv="prev";render(true);}));
  {const fl=faltaLectHoy();if(fl.length&&new Date().getHours()>=10)T("warn","Falta la lectura de los contadores de aceite",fl.join(" y ")+" · hoy","Apuntar",()=>formLect(fl[0]));
    cotejoResumen().filter(x=>x.niv==="bad").forEach(x=>T("bad","Desfase entre cambios de aceite y contadores",x.t,"Ver",()=>dlg("Cotejo con los cambios de GRG",[cotejoUI()],[{t:"Cerrar",cls:"sec"}])));
    const RC=rarosCont(3);if(RC.length)T("bad","Consumo raro de aceite o glicol",RC.map(t=>nomCont(t.k)+" "+t.n+(t.raro==="baja"?" (el contador baja)":" ("+fmtL(t.lpd)+"/día)")).join(", "),"Ver",()=>informeCont());}
  try{const DV=calcDesv(),nd=DV.L.filter(d=>!d.just);guardaDesvSemana(DV);if(nd.length)T(nd.some(d=>d.niv==="bad")?"bad":"warn",nd.length+(nd.length===1?" desviación de consumo":" desviaciones de consumo")+" la "+semTxt(DV.W0),nd.slice(0,4).map(d=>d.tit+" ("+TIPO_D[d.tipo][0].toLowerCase()+")").join(", ")+(nd.length>4?"…":""),"Ver",ir("desv"));}catch(e){}
  const nN=(typeof notas!=="undefined"&&notas)?notas.length:0;if(nN)T("info",nN+" notas sin procesar","Apuntadas durante el día","Procesar",ir("rap"));
  const ord={bad:0,warn:1,info:2};tareas.sort((a,b)=>ord[a.niv]-ord[b.niv]);
  v.appendChild(el("section",{class:"card"+(tareas.some(t=>t.niv==="bad")?" alerta":"")},[el("div",{class:"hd"},[el("h2",{text:"Qué hacer hoy"}),el("span",{class:"der sub",text:fmtF(hy)})]),
    tareas.length?el("div",{class:"lst"},tareas.map(t=>el("div",{class:"it",style:"cursor:default;flex-wrap:wrap"},[el("span",{class:"stripe "+(t.niv==="info"?"":t.niv)}),el("div",{class:"ppal"},[el("div",{class:"t1",text:t.txt}),t.det?el("div",{class:"t2",text:t.det}):null]),
      el("button",{type:"button",class:"btn peq"+(t.niv==="info"?" sec":""),text:t.btn,onclick:t.fn}),t.extra?el("div",{style:"flex-basis:100%;min-width:0"},t.extra):null]))):el("div",{class:"empty",text:"Todo en orden. No hay nada urgente."})]));
  /* --- cifras clave --- */
  const mes=hy.slice(0,7),mesAnt=sumaDias(mes+"-01",-1).slice(0,7),dmes=+hy.slice(8,10);
  const ps=todosPist(),pMes=ps.filter(p=>p.f.startsWith(mes)).reduce((t,p)=>t+(+p.cant||1),0),pAnt=ps.filter(p=>p.f.startsWith(mesAnt)).reduce((t,p)=>t+(+p.cant||1),0);
  const diasAnt=+sumaDias(mes+"-01",-1).slice(8,10),ritmo=dmes?pMes/dmes:0,ritmoAnt=diasAnt?pAnt/diasAnt:0;
  const tot=ejes.length,enPl=ejes.filter(e=>e.estado==="planta").length-pend.length,tall=ejes.filter(e=>e.estado==="reparacion"||e.estado==="devuelto");
  const fuera=tall.map(e=>{const ab=abiertaDe(e.cod);return ab&&ab.env?dias(ab.env,hy):0;});const dMed=fuera.length?Math.round(fuera.reduce((a,b)=>a+b,0)/fuera.length):0;
  const C=datosIC("mes");const sinPr=!(cat.modelos||[]).some(m=>+m.precioRep>0);
  const kpi=(t,val,sub,niv,fn)=>el(fn?"button":"div",Object.assign({class:"rk"+(niv?" "+niv:"")},fn?{type:"button",onclick:fn}:{}),[el("div",{class:"rk-t",text:t}),el("div",{class:"rk-v num",text:val}),sub?el("div",{class:"rk-s",text:sub}):null]);
  const flecha=ritmoAnt&&dmes>=7?(ritmo>ritmoAnt*1.15?"▲ más que ":ritmo<ritmoAnt*0.85?"▼ menos que ":"≈ igual que "):"";
  v.appendChild(el("div",{class:"rks"},[
    kpi("Pistones este mes",String(pMes),flecha?flecha.replace("más que","más ritmo que").replace("menos que","menos ritmo que")+cap(MESES[+mesAnt.slice(5,7)-1])+" ("+pAnt+")":cap(MESES[+mesAnt.slice(5,7)-1])+": "+pAnt,flecha.startsWith("▲")?"warn":"",ir("pist")),
    kpi("Ejes en planta",tot?Math.round(enPl/tot*100)+" %":"—",enPl+" en planta · "+tall.length+" en taller",tot&&enPl/tot<0.7?"warn":"",ir("ejes")),
    kpi("Días medios en taller",String(dMed),tall.length?"de los "+tall.length+" que están fuera":"ninguno fuera","",ir("ejes")),
    kpi("Artículos en rojo",String(crit.length),pedir.length+" para pedir · "+artsActivos().length+" en total",crit.length?"bad":"",ir("stock")),
    kpi("Coste taller "+MESES[+mes.slice(5,7)-1],sinPr?"—":eur(C.coste),sinPr?"Pon los precios de reparación":C.recib.length+" reparados"+(C.ahorro?" · ahorro "+eur(C.ahorro):""),"",ir("ejes",()=>{draft.icOpen=true;render(true);})),
    kpi("En taller (a pagar)",sinPr?"—":eur(C.costeTaller),C.taller.length+" ejes","",ir("ejes",()=>{draft.icOpen=true;render(true);}))]));
  /* --- pistones: cuántos días cubre el stock --- */
  const pis=artsActivos().filter(a=>a.fam==="piston").sort((a,b)=>DIAM.indexOf(a.diam)-DIAM.indexOf(b.diam));
  if(pis.length){const filas=pis.map(a=>{const s=S.art[a.id],r=s?s.rate:0,st=stockDe(a.id);const d=r>0?Math.floor(st/r):null;return{a,st,r,d};});
    const max=60;v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Pistones · días que aguanta el stock"}),el("span",{class:"der sub",text:"al ritmo actual"})]),
      el("div",{class:"bd",style:"display:grid;gap:8px"},filas.map(f=>{const niv=f.d==null?"":f.d<14?"bad":f.d<30?"warn":"ok";const w=f.d==null?0:Math.min(100,f.d/max*100);
        return el("div",{class:"cob"},[el("span",{class:"cob-n",text:f.a.diam||f.a.desc}),el("div",{class:"cob-b"},el("div",{class:"cob-f "+niv,style:"width:"+w+"%"})),
          el("span",{class:"cob-d num",text:f.d==null?(f.st?"sin consumo":"0"):f.d>=365?"+1 año":f.d+" d"}),el("span",{class:"cob-s num",text:fmtN(f.st)+" ud"})]);})),
      el("p",{class:"hint",style:"padding:0 14px 10px",text:"Rojo: menos de 2 semanas · ámbar: menos de un mes. La barra llega hasta 60 días."})]));}
  /* --- máquinas que más pistones gastan (30 días) --- */
  const d30=sumaDias(hy,-30),pm={};ps.filter(p=>p.f>=d30).forEach(p=>{const k=maqN(p.maq);const x=pm[k]=pm[k]||{n:0,mot:{}};x.n+=(+p.cant||1);x.mot[p.motivo]=(x.mot[p.motivo]||0)+1;});
  const top=Object.entries(pm).sort((a,b)=>b[1].n-a[1].n).slice(0,6);
  if(top.length){const mx=top[0][1].n;v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Máquinas que más pistones gastan"}),el("span",{class:"der sub",text:"últimos 30 días"})]),
    el("div",{class:"bd",style:"display:grid;gap:8px"},top.map(([k,x])=>{const mo=Object.entries(x.mot).sort((a,b)=>b[1]-a[1]).map(([m,n])=>cap(m)+" "+n).join(" · ");const m=cat.maquinas.find(z=>z.cod===k);
      return el("button",{type:"button",class:"cob",style:"appearance:none;border:0;background:none;padding:0;text-align:left;font:inherit;color:inherit;cursor:"+(m?"pointer":"default"),onclick:()=>{if(m)fichaIny(m);}},[el("span",{class:"cob-n",text:k}),el("div",{class:"cob-b"},el("div",{class:"cob-f "+(x.n>=mx*0.75&&x.n>=4?"warn":"ok"),style:"width:"+Math.round(x.n/mx*100)+"%"})),el("span",{class:"cob-d num",text:String(x.n)}),el("span",{class:"cob-s",text:mo})]);})),
    el("p",{class:"hint",style:"padding:0 14px 10px",text:"Toca una máquina para ver su ficha. Si una gasta mucho más que las demás, conviene revisarla."})]));}
  /* --- ejes: modelos más justos --- */
  const ej=R.E.L.filter(x=>x.lam>0||x.pend).map(x=>Object.assign({marg:x.pl-x.min},x)).sort((a,b)=>a.marg-b.marg||b.lam-a.lam).slice(0,6);
  if(ej.length)v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Ejes · modelos más justos"}),el("span",{class:"der sub",text:"repuestos sobre el mínimo"})]),
    el("div",{class:"lst"},ej.map(x=>{const niv=x.marg<0?"bad":x.marg===0?"warn":"ok";return el("button",{type:"button",class:"it",onclick:()=>detEje(x,R.P)},[el("span",{class:"stripe "+niv}),
      el("div",{class:"ppal"},[el("div",{class:"t1",text:x.nom}),el("div",{class:"t2",text:x.rep+" de repuesto · "+x.tal+" en taller · "+fmtN(Math.round(x.lam*304)/10)+" a reparar/mes"})]),
      el("div",{class:"cant num"},[el("b",{text:(x.marg>0?"+":"")+x.marg}),el("small",{text:x.marg<0?"bajo mínimo":x.marg===0?"en el mínimo":"sobre mínimo"})])]);}))]));
  v.appendChild(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec",text:"Generar informe",onclick:()=>generarInforme()})]));
  v.appendChild(el("p",{class:"hint",text:"Se actualiza solo con cada movimiento. Toca cualquier recuadro para ir al detalle."}));}


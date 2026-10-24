/* ===== Pantallas de los usuarios de «solo consulta» (Marta, Beatriz…) =====
   Ven lo que se ha consumido (separado por grupos: aceites, taladrinas, jabones, pistones…), dónde y por qué,
   lo que ha entrado, lo que queda de cada producto, y los pistones y ejes.
   No hay ningún botón para cambiar nada (la base de datos tampoco les deja). */

/* ---------- grupos de productos (para los informes) ----------
   Cada artículo tiene su grupo: el que se elige en el Catálogo o, si no, el que sale de su familia y su nombre.
   liq: se gasta en kg y viene en envases (bidón, GRG…). */
const GRUPOS=[["aceite","Aceites",1],["desmold","Desmoldeantes y Pistonwax",1],["taladrina","Taladrinas",1],["jabon","Jabones",1],
  ["piston","Pistones",0],["bt","Barras y tornillos",0],["horno","Recambios de horno",0],["manguera","Mangueras",0],
  ["util","Útiles de fundición",0],["varios","Limpieza y varios",0]];
const GRUPO_N=Object.fromEntries(GRUPOS.map(g=>[g[0],g[1]])),GRUPO_LIQ=new Set(GRUPOS.filter(g=>g[2]).map(g=>g[0]));
const gNorm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
function grupoAuto(a){if(!a)return"varios";const f=a.fam,d=gNorm(a.desc);
  if(f==="piston")return"piston";if(f==="barra"||f==="tornillo")return"bt";if(f==="horno")return"horno";
  if(/taladrina/.test(d))return"taladrina";if(/pistonwax|chem.?trend|desmold/.test(d))return"desmold";if(/aceite|lubric|grasa/.test(d))return"aceite";
  if(/jabon|bonderite|cimclean|detergente/.test(d))return"jabon";if(/manguera/.test(d))return"manguera";
  if(/cazo|espumadera|canaleta|manta ceramica|insular|crisol/.test(d))return"util";return"varios";}
const grupoDe=a=>a&&a.grupo&&GRUPO_N[a.grupo]?a.grupo:grupoAuto(a);

const TABS_C=[["cRes","Resumen"],["cCons","Consumos"],["cPist","Pistones y ejes"],["cEnt","Entradas"],["cStock","Stock"]];
Object.assign(ICO,{cRes:'<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',cCons:'<path d="M12 20V8M7 13l5-5 5 5"/><path d="M5 4h14"/>',
  cEnt:'<path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/>',cStock:'<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  cPist:'<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>'});
const CQ={mes:mesDe(hoy()),g:"",donde:"",motivo:"",txt:"",vista:"det",prov:"",estado:"",alm:"",pe:"pist",pMaq:"",pMot:"",pDiam:"",pVista:"det"};

/* ---------- registros con la misma forma que el informe de Looker ---------- */
const nomArt=a=>a?(TEC(a.fam)?nomBT(a):a.desc):"(artículo borrado)";
function cMotivo(m){if(m.motivo)return cap(m.motivo);const n=String(m.nota||"");
  if(/^Cambio de pistón · /.test(n))return cap(n.split(" · ")[1]||"Cambio de pistón");if(/^Horno /.test(n))return"Cambio en horno";
  if(/^Limpieza:/.test(n))return n.replace(/^Limpieza:\s*/,"");if(/^Cambio de pistón/.test(n))return"Cambio de pistón";return"Sin indicar";}
function cDonde(m){if(m.maq)return maqCod(m.maq);if(m.nave)return m.nave;if(/^(Limpieza:|Horno )/.test(m.nota||""))return"Limpieza";return"Sin indicar";}
const cEnv=(a,c)=>a&&a.peso>0?{n:c/a.peso,t:(a.envase||"envase").toLowerCase()}:null;
/* quién: en los cambios de pistón, el responsable apuntado en el cambio; en lo de Limpieza, su equipo; en lo demás, quien lo apuntó */
function cQuien(m,PM){const p=PM[m.id];const resp=p&&p.resp?respTxt(p.resp):m.resp?respTxt(m.resp):"";
  const por=m.por||(/^(Limpieza:|Horno )/.test(m.nota||"")?"Equipo de limpieza":"");return{resp,por,quien:resp||por};}
function cConsumos(){const PM={};todosPist().forEach(p=>{if(p.movId)PM[p.movId]=p;});
  return todosMov().filter(m=>m.tipo==="salida").map(m=>{const a=art(m.art),c=+m.cant||0;
  return Object.assign({f:m.f,prod:nomArt(a),cod:a&&a.cod||"",artId:m.art,g:grupoDe(a),cant:c,ud:a?a.ud||"ud":"ud",env:cEnv(a,c),donde:cDonde(m),motivo:cMotivo(m),
    sale:almN(m.alm),queda:a?stockDe(a.id):null,eur:c*precioDe(a),nota:m.nota||""},cQuien(m,PM));});}
function cEntradas(){return todosMov().filter(m=>m.tipo==="entrada").map(m=>{const a=art(m.art),c=+m.cant||0;
  return{f:m.f,prod:nomArt(a),artId:m.art,g:grupoDe(a),cant:c,ud:a?a.ud||"ud":"ud",env:cEnv(a,c),alm:almN(m.alm),
    prov:provN(m.prov)||(String(m.nota||"").match(/^Proveedor:\s*(.*)$/)||[])[1]||"Sin indicar",alb:m.alb||"",foto:m.foto||null,quien:m.resp?respTxt(m.resp):(m.por||""),nota:m.nota||""};});}

/* ---------- piezas de pantalla ---------- */
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
const mesAnt=m=>{const d=new Date(+m.slice(0,4),+m.slice(5,7)-2,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");};
function cBuscar(re,ph){const i=inp("cqTxt",CQ.txt,null,{type:"search",placeholder:ph||"Buscar producto…",autocomplete:"off"});
  i.addEventListener("change",()=>{CQ.txt=i.value.trim();re();});return fld("Buscar",i);}
const cPasaTxt=(x,campos)=>!CQ.txt||gNorm(campos.map(k=>x[k]).join(" ")).includes(gNorm(CQ.txt));
const cOpts=(L,k)=>[...new Set(L.map(x=>x[k]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),"es",{numeric:true})).map(x=>[x,x]);
function cAgrupa(L,k){const G={};L.forEach(x=>{const kk=typeof k==="function"?k(x):x[k];const g=G[kk]=G[kk]||{k:kk,n:0,cant:0,eur:0,env:0,envT:"",ud:x.ud,uds:new Set()};
  g.n++;g.cant+=x.cant||0;g.eur+=x.eur||0;if(x.env){g.env+=x.env.n;g.envT=x.env.t;}g.uds.add(x.ud);});
  return Object.values(G).sort((a,b)=>b.n-a.n||String(a.k).localeCompare(String(b.k),"es",{numeric:true}));}
const cCant=r=>fmtN(r.cant)+" "+(r.uds.size===1?r.ud:"uds");
const cEnvTxt=e=>e&&e.n?"≈ "+fmtN(Math.round(e.n*10)/10)+" "+e.t+(Math.round(e.n*10)/10===1?"":"s"):"—";
async function cExcel(nombre,filas,btn){if(!downloads){toast("Esta vista no permite descargar archivos");return;}btn.disabled=true;
  try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();X.utils.book_append_sheet(wb,X.utils.json_to_sheet(filas),nombre.slice(0,30));
    await downloads.save({filename:nombre.replace(/[\\/:*?"<>|«»]/g,"")+".xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Excel descargado");}
  catch(e){toast("No se pudo crear el Excel");}btn.disabled=false;}
const conEur=L=>L.some(x=>x.eur>0);
const cBarras=(titulo,R,campo,fmt)=>{const box=el("div",{style:"padding:4px 10px 10px"});
  if(window.GRAF&&R.length)setTimeout(()=>GRAF.barras(box,{x:R.map(r=>r.k),series:[{name:titulo,data:R.map(r=>Math.round((r[campo]||0)*100)/100)}],horizontal:true,fmt:fmt||(campo==="eur"?"eur":"n")}),0);
  return box;};
/* fila de grupos: «Todos» y cada grupo con cuántos hay este mes */
function cChipsGrupo(L,re,alPulsar){const n=k=>L.filter(x=>x.g===k).length;
  return el("div",{class:"chips chips-per",role:"group","aria-label":"Grupo"},[["","Todos"]].concat(GRUPOS.map(g=>[g[0],g[1]])).map(([k,t])=>
    el("button",{type:"button",class:"chip","aria-pressed":String(CQ.g===k),text:t+(k?" ("+n(k)+")":""),style:k&&!n(k)?"opacity:.55":"",onclick:()=>{if(alPulsar&&alPulsar(k))return;CQ.g=k;CQ.donde="";CQ.motivo="";re();}})));}
const irGrupo=k=>{if(k==="piston"){CQ.pe="pist";irA("cPist");return true;}return false;};

/* ---------- Resumen ---------- */
function vCRes(v){const re=()=>render(true);const C=cConsumos(),E=cEntradas();
  const Cm=C.filter(cEnMes),Em=E.filter(cEnMes),ant=CQ.mes==="todo"?null:C.filter(x=>mesDe(x.f)===mesAnt(CQ.mes));
  const arts=artsActivos(),bad=arts.filter(a=>!a.pedido&&nivel(a)==="bad"),warn=arts.filter(a=>!a.pedido&&nivel(a)==="warn"),ped=arts.filter(a=>a.pedido);
  const P=todosPist().filter(cEnMes),taller=ejes.filter(e=>e.estado==="reparacion"||e.estado==="devuelto").length;
  v.appendChild(el("div",{style:"display:flex;gap:10px;align-items:center;flex-wrap:wrap"},[el("p",{class:"hint",style:"margin:0;flex:1;min-width:220px",text:"Lo que entra, lo que se consume, lo que queda y cómo están los ejes, al momento. Es solo para consultar: no se puede cambiar nada. Toca un producto o una máquina para ver su ficha."}),
    window.panelAvisos?el("button",{type:"button",class:"btn sec peq",text:"Avisos al móvil",onclick:()=>window.panelAvisos()}):null]));
  v.appendChild(el("div",{class:"card"},[el("div",{class:"bd frm"},[cSelMes(C.concat(E),re)])]));
  v.appendChild(cKpis([["Consumos",fmtN(Cm.length)],["Entradas",fmtN(Em.length)],["Pistones cambiados",fmtN(P.reduce((t,p)=>t+(+p.cant||1),0))],["Gasto",conEur(Cm)?eur(Cm.reduce((t,x)=>t+x.eur,0)):"—"]]));
  /* una línea por grupo: cuánto se ha gastado y cómo va respecto al mes anterior */
  const filaG=([k,t,liq])=>{const L=Cm.filter(x=>x.g===k),A=ant?ant.filter(x=>x.g===k):null;const q=L.reduce((s,x)=>s+x.cant,0),qa=A?A.reduce((s,x)=>s+x.cant,0):null;
    const ud=liq?"kg":(new Set(L.map(x=>x.ud)).size===1&&L[0]?L[0].ud:"uds");const pct=qa>0?Math.round((q-qa)/qa*100):null;
    return el("button",{type:"button",class:"it",onclick:()=>{if(irGrupo(k))return;CQ.g=k;CQ.vista="det";irA("cCons");}},[el("div",{class:"ppal"},[el("div",{class:"t1",text:t}),
      el("div",{class:"t2",text:L.length?(L.length+(L.length===1?" consumo":" consumos")+" · "+new Set(L.map(x=>x.donde)).size+(new Set(L.map(x=>x.donde)).size===1?" sitio":" sitios")):"nada este mes"})]),
      el("div",{class:"cant num"},[el("b",{text:L.length?fmtN(q):"—"}),el("small",{text:L.length?ud+(pct==null?"":" · "+(pct>0?"+":"")+pct+" %"):""})])]);};
  v.appendChild(el("div",{class:"dosc"},[
    el("div",{class:"col"},[cardFeed(),cCard("Consumo por grupo",cTxtMes()+(ant?" · comparado con "+fmtMes(mesAnt(CQ.mes)):""),[el("div",{class:"lst"},GRUPOS.map(filaG))])]),
    el("div",{class:"col"},[
      cCard("Stock",null,[el("div",{class:"lst"},[["Bajo mínimo",bad,"bad"],["Para pedir",warn,"warn"],["Pedidos en curso",ped,"info"]].map(([t,L,c])=>
        el("button",{type:"button",class:"it",onclick:()=>{CQ.estado=c==="info"?"ped":c;CQ.g="";irA("cStock");}},[el("div",{class:"ppal"},[el("div",{class:"t1",text:t}),
          el("div",{class:"t2",text:L.slice(0,4).map(a=>nomArt(a)).join(" · ")+(L.length>4?" …":"")||"ninguno"})]),el("span",{class:"pill "+(L.length?c:"ok"),text:String(L.length)})])))]),
      cCard("Pistones y ejes",null,[el("div",{class:"lst"},[
        ["Pistones cambiados",cTxtMes(),P.length,"info","pist"],["Ejes en el taller","en reparación o devueltos",taller,taller?"warn":"ok","ejes"],["Ejes en cuarentena","rotos o agarrotados",ejePend().length,ejePend().length?"bad":"ok","ejes"]]
        .map(([t,s,n,c,pe])=>el("button",{type:"button",class:"it",onclick:()=>{CQ.pe=pe;irA("cPist");}},[el("div",{class:"ppal"},[el("div",{class:"t1",text:t}),el("div",{class:"t2",text:s})]),el("span",{class:"pill "+c,text:String(n)})])))])])]));}

/* ---------- Consumos (por grupos) ---------- */
function cColumnas(g){
  const P=x=>lnkProd(x.artId,x.prod),M=x=>lnkMaq(x.donde);
  if(GRUPO_LIQ.has(g))return{cab:["Fecha","Producto","Kg","Envases","Máquina / sitio","Motivo","Quién"],fila:x=>[fmtF(x.f),P(x),fmtN(x.cant)+" "+x.ud,cEnvTxt(x.env),M(x),x.motivo,x.quien||"—"],r:[2,3]};
  if(g==="bt")return{cab:["Fecha","Código","Cantidad","Máquina","Motivo","Quién"],fila:x=>[fmtF(x.f),P(x),fmtN(x.cant)+" "+x.ud,M(x),x.motivo,x.quien||"—"],r:[2]};
  if(g==="horno")return{cab:["Fecha","Horno","Pieza","Cantidad","Cambio"],fila:x=>[fmtF(x.f),M(x),P(x),fmtN(x.cant)+" "+x.ud,x.nota||x.motivo],r:[3],anchas:[4]};
  return{cab:["Fecha","Producto","Cantidad","Dónde","Motivo","Quién"],fila:x=>[fmtF(x.f),P(x),fmtN(x.cant)+" "+x.ud,M(x),x.motivo,x.quien||"—"],r:[2]};}
function vCCons(v){const re=()=>render(true);const T=cConsumos(),Tm=T.filter(cEnMes);
  if(CQ.g==="piston")CQ.g="";
  v.appendChild(el("div",{class:"card"},[el("div",{class:"bd frm cfil",style:"gap:10px"},[cSelMes(T,re),cChipsGrupo(Tm,re,irGrupo)])]));
  /* «Todos»: una línea por grupo para entrar en cada uno */
  if(!CQ.g){const R=GRUPOS.map(([k,t,liq])=>{const L=Tm.filter(x=>x.g===k);return{k,t,liq,L};}).filter(x=>x.L.length);
    v.appendChild(cKpis([["Consumos",fmtN(Tm.length)],["Grupos",fmtN(R.length)],["Sitios",fmtN(new Set(Tm.map(x=>x.donde)).size)],["Gasto",conEur(Tm)?eur(Tm.reduce((t,x)=>t+x.eur,0)):"—"]]));
    if(!R.length){v.appendChild(el("p",{class:"empty",text:"Nada consumido en "+cTxtMes()+"."}));return;}
    v.appendChild(cCard("Elige un grupo",cTxtMes(),[el("div",{class:"lst"},R.map(({k,t,liq,L})=>{const q=L.reduce((s,x)=>s+x.cant,0);const top=cAgrupa(L,"prod").slice(0,3).map(r=>r.k).join(" · ");
      return el("button",{type:"button",class:"it",onclick:()=>{if(irGrupo(k))return;CQ.g=k;CQ.vista="det";re();}},[el("div",{class:"ppal"},[el("div",{class:"t1",text:t}),el("div",{class:"t2",text:L.length+(L.length===1?" consumo · ":" consumos · ")+top})]),
        el("div",{class:"cant num"},[el("b",{text:fmtN(q)}),el("small",{text:liq?"kg":(new Set(L.map(x=>x.ud)).size===1?L[0].ud:"uds")})])]);}))]));return;}
  const liq=GRUPO_LIQ.has(CQ.g),G=Tm.filter(x=>x.g===CQ.g);
  const L=G.filter(x=>(!CQ.donde||x.donde===CQ.donde)&&(!CQ.motivo||x.motivo===CQ.motivo)&&cPasaTxt(x,["prod","donde","motivo","quien","nota"])).sort((a,b)=>b.f.localeCompare(a.f));
  v.appendChild(el("div",{class:"card"},[el("div",{class:"bd frm cfil",style:"gap:10px"},[
    el("div",{class:"row"},[fld(CQ.g==="horno"?"Horno":"Máquina o sitio",sel("cqDonde",cOpts(G,"donde"),CQ.donde,x=>{CQ.donde=x;re();},"Todos")),fld("Motivo",sel("cqMot",cOpts(G,"motivo"),CQ.motivo,x=>{CQ.motivo=x;re();},"Todos"))]),
    cBuscar(re,"Producto, máquina, persona…"),
    el("div",{class:"seg",role:"group","aria-label":"Cómo verlo"},[["det","Uno a uno"],["prod","Por producto"],["donde",CQ.g==="horno"?"Por horno":"Por máquina"],["mes","Por mes"]].map(([k,t])=>
      el("button",{type:"button","aria-pressed":String(CQ.vista===k),text:t,onclick:()=>{CQ.vista=k;re();}})))])]));
  const q=L.reduce((s,x)=>s+x.cant,0),env=L.reduce((s,x)=>s+(x.env?x.env.n:0),0),eurOk=conEur(L);
  v.appendChild(cKpis([["Consumos",fmtN(L.length)],[liq?"Kg gastados":"Cantidad",fmtN(q)+(liq?" kg":"")],liq?["Envases",env?"≈ "+fmtN(Math.round(env*10)/10):"—"]:["Productos",fmtN(new Set(L.map(x=>x.prod)).size)],["Gasto",eurOk?eur(L.reduce((t,x)=>t+x.eur,0)):"—"]]));
  v.appendChild(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec",text:"Descargar Excel",onclick:e=>cExcel(GRUPO_N[CQ.g]+" "+cTxtMes(),L.map(x=>({"Fecha":x.f,"Grupo":GRUPO_N[x.g],"Producto":x.prod,"Cantidad":x.cant,"Unidad":x.ud,"Envases (aprox.)":x.env?Math.round(x.env.n*100)/100:"","Dónde":x.donde,"Motivo":x.motivo,"Responsable":x.resp,"Apuntado por":x.por,"Sale de":x.sale,"Queda ahora":x.queda,"Importe (€)":Math.round(x.eur*100)/100,"Nota":x.nota})),e.currentTarget)})]));
  const tit=GRUPO_N[CQ.g];
  if(!L.length){v.appendChild(el("p",{class:"empty",text:"No hay consumos de "+tit.toLowerCase()+" con estos filtros en "+cTxtMes()+"."}));return;}
  if(CQ.vista==="det"){const c=cColumnas(CQ.g);v.appendChild(cCard(tit+" ("+L.length+")",cTxtMes(),[cTabla(c.cab,L.slice(0,400).map(c.fila),c.r,c.anchas),
    L.length>400?el("p",{class:"hint",style:"padding:8px 14px",text:"Se ven los 400 más recientes; el Excel lleva todos."}):null]));return;}
  if(CQ.vista==="mes"){/* los últimos 12 meses del grupo, sin el filtro de mes */
    const meses=[];let m=mesDe(hoy());for(let i=0;i<12;i++){meses.unshift(m);m=mesAnt(m);}
    const GT=T.filter(x=>x.g===CQ.g&&(!CQ.donde||x.donde===CQ.donde)&&(!CQ.motivo||x.motivo===CQ.motivo)&&cPasaTxt(x,["prod","donde","motivo","quien","nota"]));
    const R=meses.map(mm=>{const LL=GT.filter(x=>mesDe(x.f)===mm);return{k:cap(fmtMes(mm)),cant:LL.reduce((s,x)=>s+x.cant,0),n:LL.length,eur:LL.reduce((s,x)=>s+x.eur,0)};});
    const box=el("div",{style:"padding:4px 10px 10px"});if(window.GRAF)setTimeout(()=>GRAF.barras(box,{x:R.map(r=>r.k),series:[{name:liq?"Kg":"Cantidad",data:R.map(r=>Math.round(r.cant*100)/100)}],fmt:liq?"kg":"n"}),0);
    v.appendChild(cCard(tit+" · últimos 12 meses",null,[box,cTabla(["Mes","Consumos",liq?"Kg":"Cantidad"],R.slice().reverse().map(r=>[r.k,fmtN(r.n),fmtN(r.cant)]),[1,2])]));return;}
  const nom={prod:"producto",donde:CQ.g==="horno"?"horno":"máquina o sitio"}[CQ.vista];const R=cAgrupa(L,CQ.vista);
  v.appendChild(cCard(tit+" por "+nom+" ("+R.length+")",cTxtMes(),[cBarras(liq?"Kg":"Cantidad",R.slice(0,12),"cant",liq?"kg":"n"),
    cTabla([cap(nom),"Veces",liq?"Kg":"Cantidad"].concat(liq?["Envases"]:[]).concat(eurOk?["Gasto"]:[]),
      R.map(r=>[CQ.vista==="donde"?lnkMaq(r.k):lnkProd((L.find(z=>z.prod===r.k)||{}).artId,r.k),fmtN(r.n),cCant(r)].concat(liq?[cEnvTxt({n:r.env,t:r.envT})]:[]).concat(eurOk?[r.eur?eur(r.eur):"—"]:[])),[1,2,3,4])]));}

/* ---------- Pistones y ejes ---------- */
function vCPist(v){const re=()=>render(true);
  v.appendChild(el("div",{class:"seg",role:"tablist","aria-label":"Pistones o ejes",style:"display:grid;grid-template-columns:1fr 1fr;gap:6px"},[["pist","Pistones"],["ejes","Ejes"]].map(([k,t])=>
    el("button",{type:"button","aria-pressed":String(CQ.pe===k),text:t,onclick:()=>{CQ.pe=k;re();}}))));
  if(CQ.pe==="ejes"){cEjes(v,re);return;}
  const T=todosPist().map(p=>({f:p.f,maq:p.maq?maqCod(p.maq):"Sin indicar",diam:p.diam||"—",motivo:cap(p.motivo||"")||"Sin indicar",resp:p.resp?respTxt(p.resp):"",
    cant:+p.cant||1,dest:p.dest?cap(p.dest):"—",nota:p.nota||"",ud:"ud"})),Tm=T.filter(cEnMes);
  const L=Tm.filter(x=>(!CQ.pMaq||x.maq===CQ.pMaq)&&(!CQ.pMot||x.motivo===CQ.pMot)&&(!CQ.pDiam||x.diam===CQ.pDiam)).sort((a,b)=>b.f.localeCompare(a.f));
  v.appendChild(el("div",{class:"card"},[el("div",{class:"bd frm cfil",style:"gap:10px"},[
    el("div",{class:"row"},[cSelMes(T,re),fld("Máquina",sel("cqPMaq",cOpts(Tm,"maq"),CQ.pMaq,x=>{CQ.pMaq=x;re();},"Todas"))]),
    el("div",{class:"row"},[fld("Motivo",sel("cqPMot",cOpts(Tm,"motivo"),CQ.pMot,x=>{CQ.pMot=x;re();},"Todos")),fld("Diámetro",sel("cqPDiam",cOpts(Tm,"diam"),CQ.pDiam,x=>{CQ.pDiam=x;re();},"Todos"))]),
    el("div",{class:"seg",role:"group","aria-label":"Cómo verlo"},[["det","Uno a uno"],["motivo","Por motivo"],["maq","Por máquina"],["diam","Por diámetro"]].map(([k,t])=>
      el("button",{type:"button","aria-pressed":String(CQ.pVista===k),text:t,onclick:()=>{CQ.pVista=k;re();}})))])]));
  const top=cAgrupa(L,"motivo")[0];
  v.appendChild(cKpis([["Cambios",fmtN(L.reduce((s,x)=>s+x.cant,0))],["Máquinas",fmtN(new Set(L.map(x=>x.maq)).size)],["Motivo principal",top?top.k:"—"]]));
  v.appendChild(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec",text:"Descargar Excel",onclick:e=>cExcel("Pistones "+cTxtMes(),L.map(x=>({"Fecha":x.f,"Máquina":x.maq,"Diámetro":x.diam,"Motivo":x.motivo,"Responsable":x.resp,"Cantidad":x.cant,"Pistón usado":x.dest,"Nota":x.nota})),e.currentTarget)})]));
  if(!L.length){v.appendChild(el("p",{class:"empty",text:"No hay cambios de pistón con estos filtros en "+cTxtMes()+"."}));return;}
  if(CQ.pVista==="det"){v.appendChild(cCard("Cambios de pistón ("+L.length+")",cTxtMes(),[cTabla(["Fecha","Máquina","Ø","Motivo","Responsable","Pistón usado"],
    L.map(x=>[fmtF(x.f),lnkMaq(x.maq),x.diam,x.motivo,x.resp||"—",x.dest]),null,[5])]));return;}
  const nom={motivo:"motivo",maq:"máquina",diam:"diámetro"}[CQ.pVista];const R=cAgrupa(L,CQ.pVista);
  v.appendChild(cCard("Por "+nom+" ("+R.length+")",cTxtMes(),[cBarras("Cambios",R.slice(0,12),"cant"),cTabla([cap(nom),"Cambios"],R.map(r=>[CQ.pVista==="maq"?lnkMaq(r.k):r.k,fmtN(r.cant)]),[1])]));}
function cEjes(v,re){const vivos=ejes.filter(e=>e.estado!=="baja");const n=k=>vivos.filter(e=>e.estado===k).length;const P=ejePend();
  const reps=todasRep().filter(r=>r.res!=="anulada"&&!r.recuento);
  /* días que suele tardar el taller: por modelo si hay datos, y si no la media de todos */
  const vuelta=reps.filter(r=>r.env&&r.rec&&r.res==="ok").map(r=>({m:modeloDeEje(r.eje),d:dias(r.env,r.rec)})).filter(x=>x.d>=0);
  const media=L=>L.length?Math.round(L.reduce((s,x)=>s+x.d,0)/L.length):null,mediaG=media(vuelta);
  const normal=mod=>{const L=vuelta.filter(x=>x.m===mod);return L.length>=2?media(L):mediaG;};
  /* un renglón por grupo de modelos intercambiables (los que valen para las mismas máquinas) */
  const mods=(cat.modelos||[]).filter(m=>vivos.some(e=>grupoEje(m).some(g=>g.cod===e.mod))||+m.min>0).filter((m,i,a)=>a.findIndex(y=>grupoKey(y)===grupoKey(m))===i);
  const cortos=mods.filter(m=>+m.min>0&&plantaG(m)<=+m.min);
  v.appendChild(cKpis([["En planta",fmtN(n("planta"))],["Para enviar",fmtN(n("preparado"))],["En el taller",fmtN(n("reparacion")+n("devuelto"))],["Cuarentena",fmtN(P.length)]]));
  if(cortos.length)v.appendChild(el("div",{class:"banner",text:"Modelos con pocos ejes en planta: "+cortos.map(m=>(m.ref||m.cod)+" ("+plantaG(m)+" de mínimo "+m.min+")").join(" · ")+"."}));
  /* por modelo: en planta frente al mínimo */
  v.appendChild(cCard("Ejes por modelo",mediaG!=null?"el taller tarda de media "+mediaG+" días":null,[cTabla(["Modelo","En planta","Mínimo","Fuera","Total","Estado"],
    mods.slice().sort((p,q)=>(cortos.includes(q)-cortos.includes(p))||String(p.cod).localeCompare(String(q.cod),"es",{numeric:true})).map(m=>{const cs=grupoEje(m).map(x=>x.cod);const es=vivos.filter(e=>cs.includes(e.mod));
      const pl=plantaG(m),corto=+m.min>0&&pl<=+m.min;return[grupoNom(m),fmtN(pl),+m.min>0?fmtN(+m.min):"—",fmtN(es.filter(e=>e.estado!=="planta").length),fmtN(es.length),
        el("span",{class:"pill "+(corto?"bad":"ok"),text:corto?"Corto":"Bien"})];}),[1,2,3,4])]));
  if(P.length)v.appendChild(cCard("En cuarentena ("+P.length+")","rotos o agarrotados",[cTabla(["Máquina","Modelo","Motivo","Desde"],
    P.slice().sort((a,b)=>a.f.localeCompare(b.f)).map(p=>[lnkMaq(p.maq),(p.mods||[]).join(" / ")||"sin saber",motTxt(p)+(p.nota&&p.motivo!=="OTRO"?" · "+p.nota:""),fmtF(p.f)+" · "+dias(p.f,hoy())+" días"]),null,[2])]));
  /* fuera de planta: cuántos días llevan y si pasan de lo normal */
  const fuera=vivos.filter(e=>e.estado!=="planta").map(e=>{const ab=abiertaDe(e.cod),desde=ab?(ab.env||ab.alta||""):"",d=desde?dias(desde,hoy()):null,nm=normal(e.mod);
    return{e,ab,desde,d,nm,tarde:e.estado!=="preparado"&&d!=null&&nm!=null&&d>Math.max(nm*1.3,nm+7)};}).sort((a,b)=>(b.d||0)-(a.d||0));
  const tardes=fuera.filter(x=>x.tarde).length;
  v.appendChild(cCard("Fuera de planta ("+fuera.length+")",tardes?tardes+" tardan más de lo normal":"preparados y en el taller",[fuera.length?cTabla(["Eje","Modelo","Estado","Desde","Lleva","Daño"],
    fuera.map(({e,ab,desde,d,nm,tarde})=>{const[t,c]=EST_E[e.estado]||["—","na"];return[e.cod,ejeRef(e),el("span",{class:"pill "+c,text:t}),desde?fmtF(desde):"—",
      d==null?"—":el("span",{style:tarde?"color:var(--bad);font-weight:600":"",text:d+" días"+(tarde?" (normal "+nm+")":"")}),ab&&ab.desp?ab.desp:"—"];}),null,[5]):el("p",{class:"empty",text:"Todos los ejes están en planta."})]));
  /* lo enviado y lo recibido en el mes elegido */
  const conF=reps.filter(r=>r.env||r.alta||r.rec);
  v.appendChild(el("div",{class:"card"},[el("div",{class:"bd frm cfil"},[cSelMes(conF.map(r=>({f:r.env||r.alta||r.rec})).concat(conF.filter(r=>r.rec).map(r=>({f:r.rec}))),re)])]));
  const enMes=f=>f&&(CQ.mes==="todo"||mesDe(f)===CQ.mes);
  const row=r=>{const md=modelo(modeloDeEje(r.eje)),c=costeRep(r);return{f:r.env||r.alta,eje:r.eje,mod:md?md.ref:(modeloDeEje(r.eje)||"—"),maq:r.maq?maqCod(r.maq):"—",desp:cap(String(r.desp||"").trim())||"—",
    rec:r.rec||"",est:r.res==="ok"?"Reparado":r.res?cap(r.res):r.env?"En el taller":"Preparado",eur:c.v};};
  const Env=reps.filter(r=>enMes(r.env)).map(row).sort((a,b)=>b.f.localeCompare(a.f)),Rec=reps.filter(r=>enMes(r.rec)).map(row).sort((a,b)=>b.rec.localeCompare(a.rec));
  const cE=conEur(Env.concat(Rec));
  v.appendChild(cKpis([["Enviados",fmtN(Env.length)],["Recibidos",fmtN(Rec.length)],["Coste recibidos",cE?eur(Rec.reduce((s,x)=>s+x.eur,0)):"—"]]));
  v.appendChild(el("div",{class:"dosc"},[el("div",{class:"col"},[cCard("Enviados al taller ("+Env.length+")",cTxtMes(),[Env.length?cTabla(["Enviado","Eje","Modelo","Máquina","Daño","Estado"],
      Env.map(x=>[fmtF(x.f),x.eje,x.mod,lnkMaq(x.maq),x.desp,x.est]),null,[4]):el("p",{class:"empty",text:"Ninguno en "+cTxtMes()+"."})])]),
    el("div",{class:"col"},[cCard("Recibidos del taller ("+Rec.length+")",cTxtMes(),[Rec.length?cTabla(["Vuelve","Eje","Modelo","Tardó","Resultado"].concat(cE?["Coste"]:[]),
      Rec.map(x=>[fmtF(x.rec),x.eje,x.mod,x.f?dias(x.f,x.rec)+" días":"—",x.est].concat(cE?[x.eur?eur(x.eur):"—"]:[])),cE?[5]:null):el("p",{class:"empty",text:"Ninguno en "+cTxtMes()+"."})])])]));}

/* ---------- Entradas ---------- */
function vCEnt(v){const re=()=>render(true);const T=cEntradas(),Tm=T.filter(cEnMes);
  const L=Tm.filter(x=>(!CQ.g||x.g===CQ.g)&&(!CQ.prov||x.prov===CQ.prov)&&cPasaTxt(x,["prod","prov","alb","alm","nota"])).sort((a,b)=>b.f.localeCompare(a.f));
  v.appendChild(el("div",{class:"card"},[el("div",{class:"bd frm cfil",style:"gap:10px"},[
    el("div",{class:"row"},[cSelMes(T,re),fld("Proveedor",sel("cqProv",cOpts(Tm,"prov"),CQ.prov,x=>{CQ.prov=x;re();},"Todos"))]),
    cChipsGrupo(Tm,re),cBuscar(re,"Producto, albarán…")])]));
  v.appendChild(cKpis([["Entradas",fmtN(L.length)],["Productos",fmtN(new Set(L.map(x=>x.prod)).size)],["Proveedores",fmtN(new Set(L.map(x=>x.prov)).size)]]));
  v.appendChild(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec",text:"Descargar Excel",onclick:e=>cExcel("Entradas "+cTxtMes(),L.map(x=>({"Fecha":x.f,"Grupo":GRUPO_N[x.g],"Producto":x.prod,"Cantidad":x.cant,"Unidad":x.ud,"Envases (aprox.)":x.env?Math.round(x.env.n*100)/100:"","Entra en":x.alm,"Proveedor":x.prov,"Albarán":x.alb,"Quién":x.quien,"Nota":x.nota})),e.currentTarget)})]));
  if(!L.length){v.appendChild(el("p",{class:"empty",text:"No hay entradas con estos filtros en "+cTxtMes()+"."}));return;}
  /* separadas por grupo */
  GRUPOS.forEach(([k,t,liq])=>{const LL=L.filter(x=>x.g===k);if(!LL.length)return;
    v.appendChild(cCard(t+" ("+LL.length+")",cTxtMes(),[cTabla(["Fecha","Producto","Cantidad"].concat(liq?["Envases"]:[]).concat(["Entra en","Proveedor","Albarán"]),
      LL.slice(0,300).map(x=>[fmtF(x.f),lnkProd(x.artId,x.prod),fmtN(x.cant)+" "+x.ud].concat(liq?[cEnvTxt(x.env)]:[]).concat([x.alm,x.prov,x.foto?el("button",{type:"button",class:"btn txt peq",text:x.alb||"Ver foto",onclick:()=>lightbox(fotoUrl(x.foto))}):(x.alb||"—")])),liq?[2,3]:[2])]));});}

/* ---------- Stock (por grupos) ---------- */
const C_EST={bad:["Bajo mínimo","bad",0],warn:["Para pedir","warn",1],ped:["Pedido","info",2],ok:["Bien","ok",3],na:["Sin mínimo","na",4]};
function vCStock(v){const re=()=>render(true);
  const T=artsActivos().map(a=>{const n=a.pedido?"ped":nivel(a);const x=SM[a.id]||{};const q=stockDe(a.id);
    return{a,prod:nomArt(a),g:grupoDe(a),est:n,queda:q,ud:a.ud||"ud",env:cEnv(a,q),min:+a.min||0,dq:diasQuedan(a),tarde:!!(a.pedido&&a.prevista&&a.prevista<hoy()),
      donde:Object.entries(x).filter(([,c])=>c).map(([l,c])=>almN(l)+" "+fmtN(c)).join(" · "),alms:Object.keys(x).filter(l=>x[l])};});
  const L=T.filter(x=>(!CQ.estado||x.est===CQ.estado)&&(!CQ.g||x.g===CQ.g)&&(!CQ.alm||x.alms.includes(CQ.alm))&&cPasaTxt(x,["prod","donde"]))
    .sort((p,q)=>C_EST[p.est][2]-C_EST[q.est][2]||p.prod.localeCompare(q.prod,"es",{numeric:true}));
  const cuenta=k=>T.filter(x=>x.est===k).length;
  v.appendChild(el("div",{class:"card"},[el("div",{class:"bd frm cfil",style:"gap:10px"},[
    el("div",{class:"chips chips-per",role:"group","aria-label":"Estado"},[["","Todo"],["bad","Bajo mínimo"],["warn","Para pedir"],["ped","Pedido"],["ok","Bien"]].map(([k,t])=>
      el("button",{type:"button",class:"chip","aria-pressed":String(CQ.estado===k),text:t+(k?" ("+cuenta(k)+")":""),onclick:()=>{CQ.estado=k;re();}}))),
    el("div",{class:"row"},[fld("Grupo",sel("cqGS",GRUPOS.map(g=>[g[0],g[1]]),CQ.g,x=>{CQ.g=x;re();},"Todos")),fld("Almacén",sel("cqAlm",cat.almacenes.map(a=>[a.id,a.nom]),CQ.alm,x=>{CQ.alm=x;re();},"Todos"))]),
    cBuscar(re)])]));
  v.appendChild(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec",text:"Descargar Excel",onclick:e=>cExcel("Stock "+fmtF(hoy()).replace(/\//g,"-"),L.map(x=>({"Grupo":GRUPO_N[x.g],"Producto":x.prod,"Queda":x.queda,"Unidad":x.ud,"Envases (aprox.)":x.env?Math.round(x.env.n*100)/100:"","Para (días)":x.dq==null?"":x.dq,"Mínimo":x.min||"","Estado":C_EST[x.est][0]+(x.tarde?" (con retraso)":""),"Dónde está":x.donde,"Pedido el":x.a.pedido||"","Llega":x.a.prevista||""})),e.currentTarget)})]));
  if(!L.length){v.appendChild(el("p",{class:"empty",text:"Ningún producto con estos filtros."}));return;}
  /* un bloque por grupo; se abren solos los que tienen algo bajo mínimo o para pedir */
  GRUPOS.forEach(([k,t,liq])=>{const LL=L.filter(x=>x.g===k);if(!LL.length)return;const mal=LL.filter(x=>x.est==="bad"||x.est==="warn").length;
    const tabla=cTabla(["Producto","Queda"].concat(liq?["Envases"]:[]).concat(["Para","Mínimo","Estado","Dónde está"]),
      LL.map(x=>[lnkProd(x.a.id,x.prod),fmtN(x.queda)+" "+x.ud].concat(liq?[cEnvTxt(x.env)]:[]).concat([el("span",{style:x.dq!=null&&x.dq<=7?"color:var(--bad);font-weight:600":"",text:diasTxt(x.dq)}),x.min?fmtN(x.min):"—",
        el("span",{class:"pill "+(x.tarde?"bad":C_EST[x.est][1]),text:C_EST[x.est][0]+(x.est==="ped"&&x.a.prevista?(x.tarde?" · con retraso (llegaba "+fmtF(x.a.prevista)+")":" · llega "+fmtF(x.a.prevista)):"")}),x.donde||"—"])),liq?[1,2,4]:[1,3],[liq?6:5]);
    v.appendChild(el("details",{class:"card cgrp",open:mal||CQ.g||CQ.estado||L.length<=25?"":null},[el("summary",{class:"hd"},[el("h2",{text:t}),
      el("span",{class:"sub",style:"margin-left:auto",text:LL.length+(LL.length===1?" producto":" productos")}),mal?el("span",{class:"pill "+(LL.some(x=>x.est==="bad")?"bad":"warn"),text:mal+" para pedir"}):null]),tabla]));});}

const VC={cRes:vCRes,cCons:vCCons,cPist:vCPist,cEnt:vCEnt,cStock:vCStock};
/* al saber que el usuario es de solo consulta: cambian las pestañas */
function modoConsulta(){TABS.splice(0,TABS.length,...TABS_C);let t=null;try{t=localStorage.getItem("almacen.tabC");}catch(e){}
  tab=VC[t]?t:"cRes";tabsUI();render(true);}

/* ---------- enlaces a las fichas de producto y de máquina ---------- */
const esMaq=cod=>cat.maquinas.some(m=>m.cod===cod);
const lnkProd=(id,t)=>id&&art(id)?el("button",{type:"button",class:"lnk",text:t,onclick:()=>fichaProd(id)}):t;
const lnkMaq=cod=>cod&&esMaq(cod)?el("button",{type:"button",class:"lnk",text:cod,onclick:()=>fichaMaq(cod)}):cod;
function dlgAncho(t,body){dlg(t,body,[{t:"Cerrar",cls:"sec"}]);const d=[...document.querySelectorAll(".dlg")].pop();if(d)d.classList.add("dlg-ancho");}
const ult12=()=>{const M=[];let m=mesDe(hoy());for(let i=0;i<12;i++){M.unshift(m);m=mesAnt(m);}return M;};
function barras12(L,campo,fmt){const M=ult12(),box=el("div",{style:"padding:4px 0 8px"});
  if(window.GRAF)setTimeout(()=>GRAF.barras(box,{x:M.map(m=>cap(fmtMes(m)).slice(0,3)),series:[{name:"Consumo",data:M.map(m=>Math.round(L.filter(x=>mesDe(x.f)===m).reduce((s,x)=>s+(x[campo]||0),0)*100)/100)}],fmt:fmt||"n",alto:180}),0);
  return box;}
/* cuántos días quedan con el gasto de los últimos 60 días */
const diasQuedan=a=>{const c=consDia(a),q=stockDe(a.id);return c>0&&q>0?Math.floor(q/c):(q<=0?0:null);};
const diasTxt=d=>d==null?"—":d===0?"agotado":d>365?"más de un año":"unos "+d+(d===1?" día":" días");

/* ficha de un producto: lo que queda, dónde, y toda su historia */
function fichaProd(id){const a=art(id);if(!a)return;const g=grupoDe(a),q=stockDe(a.id),n=a.pedido?"ped":nivel(a),x=SM[a.id]||{};
  const C=cConsumos().filter(z=>z.artId===id),E=cEntradas().filter(z=>z.artId===id);
  const desde=ult12()[0]+"-01",C12=C.filter(z=>z.f>=desde);
  const body=[el("p",{class:"hint",style:"margin:0",text:GRUPO_N[g]+(a.cod?" · "+a.cod:"")+(envTxt(a)?" · "+envTxt(a):"")}),
    cKpis([["Queda",fmtN(q)+" "+(a.ud||"ud")],["Para",diasTxt(diasQuedan(a))],["Mínimo",a.min?fmtN(a.min):"—"],["Estado",C_EST[n][0]]]),
    a.pedido?el("div",{class:"banner"},[el("span",{text:"Pedido el "+fmtF(a.pedido)+(a.prevista?(a.prevista<hoy()?" · iba a llegar el "+fmtF(a.prevista)+" (con retraso)":" · llega el "+fmtF(a.prevista)):"")})]):null,
    el("h4",{style:"margin:10px 0 4px",text:"Dónde está"}),
    Object.keys(x).filter(l=>x[l]).length?cTabla(["Almacén","Cantidad"],Object.entries(x).filter(([,c])=>c).map(([l,c])=>[almN(l),fmtN(c)+" "+(a.ud||"ud")]),[1]):el("p",{class:"empty",text:"No queda en ningún almacén."}),
    el("h4",{style:"margin:10px 0 4px",text:"Consumo de los últimos 12 meses"}),barras12(C12,"cant",GRUPO_LIQ.has(g)?"kg":"n"),
    C12.length?cTabla(["A dónde ha ido","Veces","Cantidad"],cAgrupa(C12,"donde").map(r=>[lnkMaq(r.k),fmtN(r.n),cCant(r)]),[1,2]):null,
    el("h4",{style:"margin:10px 0 4px",text:"Últimos movimientos"}),
    cTabla(["Fecha","Qué","Cantidad","Dónde / proveedor","Quién"],C.map(z=>({f:z.f,t:"Consumo",c:z.cant,d:z.donde+(z.motivo&&z.motivo!=="Sin indicar"?" · "+z.motivo:""),w:z.quien}))
      .concat(E.map(z=>({f:z.f,t:"Entrada",c:z.cant,d:z.prov+" → "+z.alm,w:z.quien}))).sort((p,r)=>r.f.localeCompare(p.f)).slice(0,40)
      .map(z=>[fmtF(z.f),z.t,(z.t==="Entrada"?"+":"−")+fmtN(z.c)+" "+(a.ud||"ud"),z.d,z.w||"—"]),[2],[3])];
  dlgAncho(nomArt(a),body.filter(Boolean));}

/* ficha de una máquina: todo lo que ha gastado */
function fichaMaq(cod){const desde=ult12()[0]+"-01";
  const C=cConsumos().filter(z=>z.donde===cod&&z.f>=desde),P=todosPist().filter(p=>maqCod(p.maq)===cod&&p.f>=desde);
  const R=todasRep().filter(r=>r.res!=="anulada"&&!r.recuento&&r.maq&&maqCod(r.maq)===cod&&(r.env||r.alta||"")>=desde);
  const puestos=ejes.filter(e=>e.estado==="planta"&&e.maq&&maqCod(e.maq)===cod);
  const body=[cKpis([["Consumos",fmtN(C.length)],["Pistones",fmtN(P.reduce((s,p)=>s+(+p.cant||1),0))],["Ejes reparados",fmtN(R.length)],["Gasto",conEur(C)?eur(C.reduce((s,z)=>s+z.eur,0)):"—"]]),
    el("p",{class:"hint",style:"margin:0",text:"Últimos 12 meses."+(puestos.length?" Eje puesto ahora: "+puestos.map(e=>e.cod).join(", ")+".":"")})];
  GRUPOS.forEach(([k,t,liq])=>{const L=C.filter(z=>z.g===k);if(!L.length)return;
    body.push(el("h4",{style:"margin:10px 0 4px",text:t}),cTabla(["Producto","Veces",liq?"Kg":"Cantidad"].concat(liq?["Envases"]:[]),cAgrupa(L,"prod").map(r=>[lnkProd((L.find(z=>z.prod===r.k)||{}).artId,r.k),fmtN(r.n),cCant(r)].concat(liq?[cEnvTxt({n:r.env,t:r.envT})]:[])),[1,2,3]));});
  if(P.length)body.push(el("h4",{style:"margin:10px 0 4px",text:"Pistones por motivo"}),cTabla(["Motivo","Cambios"],cAgrupa(P.map(p=>({motivo:cap(p.motivo||"")||"Sin indicar",cant:+p.cant||1,ud:"ud"})),"motivo").map(r=>[r.k,fmtN(r.cant)]),[1]));
  if(R.length)body.push(el("h4",{style:"margin:10px 0 4px",text:"Ejes enviados a reparar"}),cTabla(["Enviado","Eje","Daño","Vuelve"],R.sort((p,r)=>(r.env||r.alta).localeCompare(p.env||p.alta)).map(r=>[fmtF(r.env||r.alta),r.eje,cap(String(r.desp||"").trim())||"—",r.rec?fmtF(r.rec):"en el taller"]),null,[2]));
  if(!C.length&&!P.length&&!R.length)body.push(el("p",{class:"empty",text:"Nada apuntado para esta máquina en los últimos 12 meses."}));
  dlgAncho("Máquina "+cod,body);}

/* ---------- «Ahora mismo»: lo último que ha pasado, de todo ---------- */
function cuando(f,ts){if(ts){const d=new Date(ts);const l=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");if(l===f)return{t:ts,hora:true};}
  return{t:Date.parse(f+"T12:00:00"),hora:false};}
function cuandoTxt(w,f){const hy=hoy(),ay=sumaDias(hy,-1),hh=w.hora?new Date(w.t).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}):"";
  if(f===hy){if(w.hora){const m=Math.round((Date.now()-w.t)/6e4);if(m<1)return"ahora";if(m<60)return"hace "+m+" min";return"hoy "+hh;}return"hoy";}
  if(f===ay)return"ayer"+(hh?" "+hh:"");return fmtF(f);}
function cFeed(){const PM={};todosPist().forEach(p=>{if(p.movId)PM[p.movId]=p;});const E=[];
  todosMov().forEach(m=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(m.f||""))return;const a=art(m.art),c=fmtN(+m.cant||0)+" "+(a?a.ud||"ud":"ud"),w=cuando(m.f,m.ts);
    if(m.tipo==="entrada")E.push({w,f:m.f,tipo:"Entrada",cls:"ok",t:nomArt(a)+" · +"+c,s:[provN(m.prov)||null,"a "+almN(m.alm),m.por].filter(Boolean).join(" · "),art:m.art});
    else if(m.tipo==="salida"){const p=PM[m.id];E.push({w,f:m.f,tipo:p?"Cambio de pistón":"Consumo",cls:p?"info":"warn",t:nomArt(a)+" · −"+c,
      s:[cDonde(m),cMotivo(m)!=="Sin indicar"?cMotivo(m):null,cQuien(m,PM).quien||null].filter(Boolean).join(" · "),art:m.art,maq:cDonde(m)});}
    else if(m.tipo==="traslado")E.push({w,f:m.f,tipo:"Traslado",cls:"na",t:nomArt(a)+" · "+c,s:almN(m.alm)+" → "+almN(m.dest),art:m.art});});
  todasRep().filter(r=>r.res!=="anulada"&&!r.recuento).forEach(r=>{const md=modelo(modeloDeEje(r.eje)),mt=md?md.ref:"";
    if(r.env)E.push({w:cuando(r.env,null),f:r.env,tipo:"Eje al taller",cls:"warn",t:r.eje+(mt?" · "+mt:""),s:cap(String(r.desp||"").trim())||""});
    if(r.rec)E.push({w:cuando(r.rec,null),f:r.rec,tipo:"Eje vuelve",cls:"ok",t:r.eje+(mt?" · "+mt:""),s:r.res==="ok"?"reparado":(r.res?cap(r.res):"")});});
  ejePend().forEach(p=>{if(p.f)E.push({w:cuando(p.f,null),f:p.f,tipo:"Eje en cuarentena",cls:"bad",t:"Eje de la "+p.maq,s:motTxt(p),maq:p.maq});});
  return E.filter(e=>e.f<=hoy()).sort((a,b)=>b.w.t-a.w.t);}
function cardFeed(){const E=cFeed(),N=CQ.feedN||12;const ult=E.find(e=>e.w.hora);
  const it=e=>el(e.art?"button":"div",{type:e.art?"button":null,class:"it",style:e.art?"":"cursor:default",onclick:e.art?()=>fichaProd(e.art):null},[el("span",{class:"stripe "+e.cls}),
    el("div",{class:"ppal"},[el("div",{class:"t1",text:e.t}),el("div",{class:"t2",text:[e.tipo,e.s].filter(Boolean).join(" · ")})]),el("div",{class:"cant",style:"white-space:nowrap"},[el("small",{text:cuandoTxt(e.w,e.f)})])]);
  return cCard("Lo último que ha pasado",ult?"se actualiza solo · último apunte "+cuandoTxt(ult.w,ult.f):"se actualiza solo",[
    E.length?el("div",{class:"lst"},E.slice(0,N).map(it)):el("p",{class:"empty",text:"Todavía no hay nada apuntado."}),
    E.length>N?el("div",{class:"bd",style:"padding-top:0"},[el("button",{type:"button",class:"btn sec peq",text:"Ver más",onclick:()=>{CQ.feedN=N+20;render(true);}})]):null]);}

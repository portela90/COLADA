/* ===== PREVISIÓN: mínimos, dotación de planta, ejes y pedido del mes siguiente ===== */
const PREV0={nivel:95,plazo:7,cob:7,taller:7};
const prevCfg=()=>Object.assign({},PREV0,cat.prev||{});
const ZN={90:1.2816,95:1.6449,99:2.3263};
const CONTABLE=a=>a.ud!=="kg"&&a.ud!=="l"&&a.ud!=="m";
const redU=(x,cont)=>cont?Math.ceil(x-1e-9):Math.ceil(x*10-1e-9)/10;
function poisQ(mu,p){if(!(mu>0))return 0;if(mu>60)return Math.ceil(mu+(ZN[Math.round(p*100)]||1.6449)*Math.sqrt(mu));let k=0,t=Math.exp(-mu),c=t;while(c<p&&k<2000){k++;t*=mu/k;c+=t;}return k;}
/* cantidad que cubre la demanda con la seguridad elegida (media mu, varianza vr) */
function cuantil(mu,vr,cont,niv){if(!(mu>0))return 0;const z=ZN[niv]||1.6449;
  if(cont&&vr<=mu*1.3)return poisQ(mu,niv/100);
  return redU(mu+z*Math.sqrt(Math.max(vr,cont?mu:0)),cont);}
const finMes=f=>{const d=new Date(f+"T12:00:00");return new Date(d.getFullYear(),d.getMonth()+1,0,12).toISOString().slice(0,10);};
function prevDatos(){const hy=hoy();const ms=todosMov().filter(m=>m.tipo==="salida"&&m.f<=hy);
  const sig1=sumaDias(finMes(hy),1),sigFin=finMes(sig1);const base={hy,mesSig:mesDe(sig1),dm:dias(sig1,sigFin)+1,H:dias(hy,sigFin)};
  if(!ms.length)return Object.assign(base,{D:0,art:{},alm:{}});
  const ini0=ms.map(m=>m.f).sort()[0],lim=sumaDias(hy,-182);const ini=ini0<lim?lim:ini0;const D=Math.max(1,dias(ini,hy)+1),W=Math.floor(D/7);
  const art={},alm={};
  ms.forEach(m=>{if(m.f<ini)return;const c=+m.cant||0;const s=art[m.art]=art[m.art]||{tot:0,sem:new Array(Math.max(W,1)).fill(0)};s.tot+=c;
    const w=Math.floor(dias(m.f,hy)/7);if(w<W)s.sem[w]+=c;if(m.alm){const k=m.art+"|"+m.alm;alm[k]=(alm[k]||0)+c;}});
  Object.values(art).forEach(s=>{s.rate=s.tot/D;let vrd=0;if(W>=2){const mw=s.sem.reduce((p,c)=>p+c,0)/W;vrd=s.sem.reduce((p,c)=>p+(c-mw)*(c-mw),0)/(W-1)/7;}s.vrd=vrd;});
  Object.keys(alm).forEach(k=>alm[k]=alm[k]/D);
  return Object.assign(base,{D,ini,art,alm});}
function sugArt(a,P,S){const s=S.art[a.id];if(!s||!(s.rate>0))return null;const cont=CONTABLE(a),z=ZN[P.nivel]||1.6449;
  const disp=s.rate>0?Math.max(cont?1:0,s.vrd/s.rate):0;/* dispersión: 1 = como el azar */
  const plA=plazoArt(a),pl=plA||P.plazo;const muL=s.rate*pl,qL=cuantil(muL,s.vrd*pl,cont,P.nivel);
  const min=plA?Math.max(0,redU(qL-muL,cont)):qL;
  const muM=s.rate*S.dm,sdM=Math.sqrt(Math.max(s.vrd,cont?s.rate:0)*S.dm);
  const mes={mu:muM,lo:Math.max(0,cont?Math.floor(muM-z*sdM):Math.round((muM-z*sdM)*10)/10),hi:cuantil(muM,s.vrd*S.dm,cont,P.nivel)};
  const st=stockDe(a.id),pend=a.pedido?(+a.pedCant||0):0;
  const pedir=Math.max(0,redU(s.rate*S.H+min-st-pend,cont));
  const dot={};lineas().forEach(l=>{const r=S.alm[a.id+"|"+l.id];if(r>0)dot[l.id]=Math.max(cont?1:0,cuantil(r*P.cob,disp*r*P.cob,cont,P.nivel));});
  return{a,s,cont,pl,plA,min,muL,mes,st,pend,pedir,dot,mesUd:s.rate*30.4};}
function modeloDeEje(cod){const e=ejes.find(x=>x.cod===cod);return e?e.mod:String(cod||"").replace(/-\d+$/,"");}
function sugEjes(P,S){const hy=hoy();const rs=todasRep().filter(r=>r.res!=="anulada"&&!r.recuento&&(r.alta||r.env));if(!rs.length)return{D:0,L:[]};
  const f0=rs.map(r=>r.alta||r.env).sort()[0],lim=sumaDias(hy,-365);const ini=f0<lim?lim:f0;const D=Math.max(1,dias(ini,hy)+1);
  const vistos=new Set();const L=[];(cat.modelos||[]).forEach(m=>{const k=grupoKey(m);if(vistos.has(k))return;vistos.add(k);const G=grupoEje(m),cs=G.map(x=>x.cod);
    const pd=pendDeGrupo(m),pend=pd.length;const n=rs.filter(r=>(r.alta||r.env)>=ini&&cs.includes(modeloDeEje(r.eje))).length+pd.reduce((t,p)=>t+pesoPend(p),0);const lam=n/D;const maq=maqG(m);
    const es=ejes.filter(e=>cs.includes(e.mod));const pl=Math.max(0,es.filter(e=>e.estado==="planta").length-pend),tal=es.filter(e=>e.estado==="reparacion"||e.estado==="devuelto").length,prep=es.filter(e=>e.estado==="preparado").length;
    const min=maq+poisQ(lam*P.taller,P.nivel/100),ideal=Math.max(min+(lam>0?1:0),maq+poisQ(lam*(P.taller+30),P.nivel/100));
    const ped=es.filter(e=>(e.estado==="reparacion"||e.estado==="devuelto")&&(abiertaDe(e.cod)||{}).traer).length;
    const bajo=pl<=min;const pedir=bajo?Math.max(0,Math.min(tal,Math.max(0,ideal-pl))-ped):0;const faltan=bajo?Math.max(0,ideal-pl-tal):0;
    const ahora=Math.max(0,...G.map(x=>+x.min||0));
    L.push({m,G,pend,ped,nom:grupoNom(m),n,lam,maq,pl,rep:Math.max(0,pl-maq),tal,prep,tot:es.length,min,ideal,bajo,pedir,faltan,ahora,mes:lam*S.dm});});
  return{D,ini,L};}
function prevTodo(){const P=prevCfg(),S=prevDatos();const arts=artsActivos().map(a=>sugArt(a,P,S)).filter(Boolean);return{P,S,arts,E:sugEjes(P,S)};}
const fmtR=(x,cont)=>cont?String(Math.round(x)):fmtN(Math.round(x*10)/10);
const nomMes=m=>MESES[+m.slice(5,7)-1];
function vPrev(v){const R=prevTodo(),{P,S,arts,E}=R;const mesN=nomMes(S.mesSig);
  if(!S.D&&!E.D){v.appendChild(el("div",{class:"banner",text:"Todavía no hay consumos ni reparaciones registrados. La previsión sale en cuanto haya datos."}));return;}
  const aPedir=arts.filter(x=>x.pedir>0),ejP=E.L.filter(x=>x.pedir>0||x.faltan>0);
  v.appendChild(el("dl",{class:"kpis num"},[["Datos de consumo",S.D+" días"],["Datos de ejes",E.D+" días"],["Artículos a pedir",String(aPedir.length)],["Ejes a pedir al taller",String(ejP.reduce((p,x)=>p+x.pedir,0))]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))));
  if(S.D&&S.D<90)v.appendChild(el("div",{class:"banner",text:"Solo hay "+S.D+" días de consumos (desde el "+fmtF(S.ini)+"). Las cifras son orientativas y se afinan solas cada semana que pasa."}));
  v.appendChild(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn",text:"Aplicar lo sugerido",onclick:()=>aplicarPrev(R)}),
    el("button",{type:"button",class:"btn sec",text:"Copiar pedido previsto",onclick:async()=>{const t=textoPrev(R);try{await navigator.clipboard.writeText(t);toast("Pedido copiado");}catch(e){dlg("Pedido previsto",el("textarea",{readonly:true,style:"min-height:260px;font-family:'IBM Plex Mono',monospace;font-size:13px",value:t}),[{t:"Cerrar",cls:"sec"}]);}}}),
    el("button",{type:"button",class:"btn sec",text:"Ajustes",onclick:()=>formPrev()})]));
  v.appendChild(incluirChips("previsto",OPS_PRV,null,"Qué incluir al copiar el pedido previsto (se recuerda):").node);
  /* ejes */
  if(E.L.length){const Ls=E.L.slice().sort((a,b)=>(b.faltan+b.pedir>0)-(a.faltan+a.pedir>0)||b.lam-a.lam);
    v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Ejes de inyección"}),el("span",{class:"der sub",text:"mínimo en planta por modelo"})]),
      el("div",{class:"lst"},Ls.map(x=>{const niv=x.faltan?"bad":x.pedir?"warn":"ok";
        return el("button",{type:"button",class:"it",onclick:()=>detEje(x,P)},[el("span",{class:"stripe "+niv}),el("div",{class:"ppal"},[el("div",{class:"t1",text:x.nom}),
          el("div",{class:"t2",text:["en planta "+x.pl+": "+x.maq+(x.maq===1?" puesto":" puestos")+" en máquina + "+x.rep+" de repuesto"+(x.pend?" · "+x.pend+" quitado sin número":"")+(x.tal?" · "+x.tal+" en taller":"")+(x.ped?" ("+x.ped+" ya pedido"+(x.ped>1?"s":"")+")":""),"mínimo "+x.min+(x.ahora!==x.min?" (ahora "+x.ahora+")":""),"ideal "+x.ideal,x.lam>0?fmtN(Math.round(x.lam*304)/10)+" a reparar/mes":"ninguno a reparar"].join(" · ")})]),
          x.faltan?el("div",{class:"cant num"},[el("b",{text:"+"+x.faltan}),el("small",{text:"faltan ejes"})]):x.pedir?el("div",{class:"cant num"},[el("b",{text:x.pedir}),el("small",{text:"pedir al taller"})]):el("span",{class:"pill ok",text:"OK"})]);})),
      el("p",{class:"hint",style:"padding:8px 14px",text:"Cada inyectora tiene siempre un eje puesto, que cuenta como «en planta». Si varios modelos van en las mismas máquinas (p. ej. 2.1.A y 2.1.A\" en F23 y F24), se cuentan juntos. Mínimo = los puestos en máquina + los que pueden tener que ir a reparar (por cualquier desperfecto) mientras el taller trae uno ("+P.taller+" días). Cuando en planta quedan el mínimo o menos, pide al taller hasta llegar al ideal (para aguantar un mes)."})]));}
  /* artículos */
  const fila=x=>{const niv=x.pedir>0?(x.st<x.min?"bad":"warn"):"ok";const ud=x.a.ud;
    return el("button",{type:"button",class:"it",onclick:()=>detArt(x,P,S)},[el("span",{class:"stripe "+niv}),el("div",{class:"ppal"},[el("div",{class:"t1",text:x.a.desc}),
      el("div",{class:"t2",text:[mesN+": "+fmtR(x.mes.lo,x.cont)+"–"+fmtR(x.mes.hi,x.cont)+" "+ud,"hay "+fmtN(x.st)+(x.pend?" (+"+fmtN(x.pend)+" pedido)":""),"mínimo "+fmtN(x.min)+(+x.a.min!==x.min?" (ahora "+fmtN(+x.a.min||0)+")":""),Object.keys(x.dot).length?"planta "+Object.keys(x.dot).map(k=>corto(almById(k))+" "+fmtN(x.dot[k])).join(", "):null].filter(Boolean).join(" · ")})]),
      x.pedir>0?el("div",{class:"cant num"},[el("b",{text:fmtN(x.pedir)}),el("small",{text:"pedir "+ud})]):el("span",{class:"pill ok",text:"Cubierto"})]);};
  const ord=(a,b)=>(b.pedir>0)-(a.pedir>0)||b.mesUd-a.mesUd;
  const pis=arts.filter(x=>x.a.fam==="piston").sort((a,b)=>DIAM.indexOf(a.a.diam)-DIAM.indexOf(b.a.diam)||ord(a,b)),otros=arts.filter(x=>x.a.fam!=="piston").sort(ord);
  if(pis.length)v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Pistones"}),el("span",{class:"der sub",text:"previsión de "+mesN})]),el("div",{class:"lst"},pis.map(fila))]));
  if(otros.length)v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Consumibles y recambios ("+otros.length+")"}),el("span",{class:"der sub",text:"previsión de "+mesN})]),el("div",{class:"lst"},otros.map(fila))]));
  const sin=artsActivos().filter(a=>!arts.some(x=>x.a.id===a.id));
  if(sin.length)v.appendChild(el("details",{class:"card"},[el("summary",{class:"gh",style:"cursor:pointer",text:sin.length+" artículos sin consumos registrados (sin previsión)"}),el("p",{class:"hint",style:"padding:8px 14px",text:sin.map(a=>a.desc).sort((a,b)=>a.localeCompare(b,"es")).join(" · ")})]));
  v.appendChild(el("p",{class:"hint",text:"Se calcula con los consumos reales (últimos 6 meses como máximo) y las ejes mandados a reparar en el último año (por cualquier desperfecto), con una seguridad del "+P.nivel+" %. «Pedir» = lo que se gastará hasta final de "+mesN+" + el mínimo − el stock − lo ya pedido. «Planta» = lo que conviene tener en cada almacén de producción para "+P.cob+" días."}));}
function detArt(x,P,S){const a=x.a,ud=a.ud,mesN=nomMes(S.mesSig);
  const filas=[["Gasta de media",fmtN(Math.round(x.mesUd*10)/10)+" "+ud+"/mes"],["Previsión de "+mesN,fmtR(x.mes.lo,x.cont)+" a "+fmtR(x.mes.hi,x.cont)+" "+ud+" (lo normal "+fmtR(x.mes.mu,x.cont)+")"],
    ["Plazo de entrega",x.pl+" días"+(x.plA?"":" (no tiene plazo puesto; uso "+P.plazo+")")],["Stock mínimo sugerido",fmtN(x.min)+" "+ud+" (ahora "+fmtN(+a.min||0)+")"],
    ["Hay ahora",fmtN(x.st)+" "+ud+(x.pend?" + "+fmtN(x.pend)+" pedido":"")],["Pedir para llegar a fin de "+mesN,fmtN(x.pedir)+" "+ud]]
    .concat(lineas().map(l=>[corto(l)+" (planta)",x.dot[l.id]!=null?fmtN(x.dot[l.id])+" "+ud+" (ahora "+fmtN(+(((cat.dot||{})[l.id]||{})[a.id])||0)+", hay "+fmtN(stockDe(a.id,l.id))+")":"no se gasta desde aquí"]));
  dlg(a.desc,[el("dl",{class:"kpis num"},filas.map(([k,t])=>el("div",{},[el("dt",{text:k}),el("dd",{style:"font-size:15px",text:t})]))),
    el("p",{class:"hint",text:x.plA?"El mínimo es el colchón para los días malos: la app ya suma aparte lo que se gasta durante el plazo de entrega para avisarte de pedir.":"Como no tiene plazo de entrega, el mínimo incluye lo que se gasta en "+P.plazo+" días más el colchón. Pon el plazo en su ficha y el cálculo se ajusta."})],
    [{t:"Cerrar",cls:"sec"}]);}
function detEje(x,P){const filas=[["Inyectoras",[...new Set([].concat(...x.G.map(inyDe)))].join(", ")||"—"],["Mandados a reparar en el último año",fmtN(Math.round(x.n*10)/10)],["Previstos a reparar en el mes",fmtN(Math.round(x.mes*10)/10)],
  ["En planta",x.pl+" de "+x.tot],["Puestos en máquina",String(x.maq)],["De repuesto",String(x.rep)],["En el taller",String(x.tal)],["Preparados para enviar",String(x.prep)],["Mínimo en planta (con los puestos)",x.min+" (ahora "+x.ahora+")"],["Ideal en planta",String(x.ideal)]];
  dlg(x.nom,[el("dl",{class:"kpis num"},filas.map(([k,t])=>el("div",{},[el("dt",{text:k}),el("dd",{style:"font-size:15px",text:t})]))),
    x.faltan?el("div",{class:"banner",text:"Aunque traigas todos los del taller no llegas al ideal: faltan "+x.faltan+" eje(s) de este modelo."}):null,
    el("p",{class:"hint",text:x.bajo?(x.pedir?"Estás en el mínimo o por debajo: pide "+x.pedir+" al taller"+(x.ped?" (ya tienes "+x.ped+" pedido"+(x.ped>1?"s":"")+")":"")+".":x.ped?"Estás en el mínimo, pero ya has pedido "+x.ped+" al taller: espera a que lleguen.":"Estás en el mínimo o por debajo."):"Por encima del mínimo: no hace falta pedir al taller todavía."})],[{t:"Cerrar",cls:"sec"}]);}
const OPS_PRV=[["art","Artículos a pedir"],["rango","Previsión y stock de cada uno"],["eje","Ejes a pedir al taller"]];
function textoPrev(R,s){s=s||incluirSel("previsto",OPS_PRV);const{S,arts,E}=R;const mesN=nomMes(S.mesSig);const L=["PREVISIÓN DE PEDIDO HASTA FIN DE "+mesN.toUpperCase()+" · "+fmtF(hoy()),""];
  const ps=s.art?arts.filter(x=>x.pedir>0):[];if(ps.length){const g={};ps.forEach(x=>{const k=provN(x.a.prov)||"SIN PROVEEDOR ASIGNADO";(g[k]=g[k]||[]).push(x);});
    Object.keys(g).sort().forEach(k=>{L.push("PROVEEDOR: "+k.toUpperCase());g[k].sort((a,b)=>a.a.desc.localeCompare(b.a.desc,"es",{numeric:true})).forEach(x=>L.push("- "+x.a.desc+(x.a.cod?" ["+x.a.cod+"]":"")+": "+fmtN(x.pedir)+" "+x.a.ud+(s.rango?" (previsión "+mesN+" "+fmtR(x.mes.lo,x.cont)+"–"+fmtR(x.mes.hi,x.cont)+", stock "+fmtN(x.st)+")":"")));L.push("");});}
  const ej=s.eje?E.L.filter(x=>x.pedir>0||x.faltan>0):[];if(ej.length){L.push("EJES A PEDIR AL TALLER:");ej.forEach(x=>L.push("- "+x.nom+": "+(x.pedir?"traer "+x.pedir:"")+(x.faltan?(x.pedir?" · ":"")+"faltan "+x.faltan+" (no hay más en el taller)":"")+" · en planta "+x.pl+", mínimo "+x.min));L.push("");}
  if(!ps.length&&!ej.length)L.push(s.art||s.eje?"Con el stock actual está todo cubierto hasta final de "+mesN+".":"No has elegido nada que incluir.");
  return L.join("\n").trim();}
function aplicarPrev(R){const{arts,E}=R;
  const cMin=arts.filter(x=>(+x.a.min||0)!==x.min),cEje=E.L.filter(x=>x.G.some(m=>(+m.min||0)!==x.min));
  const cDot=[];arts.forEach(x=>!x.a.limp&&Object.keys(x.dot).forEach(l=>{const ah=+(((cat.dot||{})[l]||{})[x.a.id])||0;if(ah!==x.dot[l])cDot.push({x,l,v:x.dot[l]});}));
  const op={min:cMin.length>0,eje:cEje.length>0,dot:cDot.length>0};
  const ck=(k,t,n)=>el("label",{style:"display:flex;gap:10px;align-items:center;flex-direction:row"},[el("input",{type:"checkbox",checked:op[k]&&n>0,disabled:!n,style:"width:22px;height:22px;flex:none",onchange:e=>op[k]=e.target.checked}),el("span",{text:t+" ("+(n?n+" cambian":"sin cambios")+")"})]);
  dlg("Aplicar lo sugerido",[ck("min","Stock mínimo de cada artículo",cMin.length),ck("eje","Mínimo en planta de cada modelo de eje",cEje.length),ck("dot","Lo que tiene que haber en cada almacén de producción",cDot.length),
    el("p",{class:"hint",text:"Con esto los avisos de «Reponer», la lista de pedido y los avisos de ejes usan los valores calculados. Se puede deshacer desde el Historial. Conviene repetirlo una vez al mes."})],
    [{t:"Cancelar",cls:"sec"},{t:"Aplicar",fn:async()=>{if(!op.min&&!op.eje&&!op.dot){toast("Marca algo");return false;}
      if(op.min)cMin.forEach(x=>{const a=art(x.a.id);if(a)a.min=x.min;});
      if(op.eje)cEje.forEach(x=>x.G.forEach(g=>{const m=(cat.modelos||[]).find(z=>z.cod===g.cod);if(m)m.min=x.min;}));
      if(op.dot){cat.dot=cat.dot||{};cDot.forEach(({x,l,v})=>{(cat.dot[l]=cat.dot[l]||{})[x.a.id]=v;});}
      try{await saveCat();toast("Aplicado");}catch(e){return false;}render(true);}}]);}
function formPrev(){const x=prevCfg();
  const num=(id,lab,k,hint)=>fld(lab,inp(id,x[k],v=>{const n=parseN(v);if(n>0)x[k]=Math.round(n);},{inputmode:"numeric",class:"num"}));
  const seg=el("div",{class:"seg",role:"group","aria-label":"Seguridad"},[90,95,99].map(n=>{const b=el("button",{type:"button","aria-pressed":String(x.nivel===n),text:n+" %"});b.onclick=()=>{x.nivel=n;seg.querySelectorAll("button").forEach(z=>z.setAttribute("aria-pressed",String(z===b)));};return b;}));
  dlg("Ajustes de la previsión",[el("div",{},[el("div",{class:"sub",style:"margin-bottom:6px",text:"Seguridad (cuanto más alta, menos riesgo de quedarse corto y más stock)"}),seg]),
    num("pvPl","Plazo de entrega si el artículo no tiene (días)","plazo"),num("pvCob","Cada cuántos días se repone la planta","cob"),num("pvTa","Días que tarda el taller en traer un eje cuando lo pides","taller")],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{cat.prev=x;try{await saveCat();toast("Guardado");}catch(e){return false;}render(true);}}]);}

/* ===== EJES ===== */
const modelo=cod=>(cat.modelos||[]).find(m=>m.cod===cod);
/* modelos que se montan en las mismas inyectoras (p. ej. 2.1.A y 2.1.A" en F23/F24): cuentan juntos */
function grupoEje(m){const ms=cat.modelos||[];const S=new Set([m]);let ch=true;while(ch){ch=false;ms.forEach(x=>{if(S.has(x))return;const ix=inyDe(x);if(ix.length&&[...S].some(y=>inyDe(y).some(c=>ix.includes(c)))){S.add(x);ch=true;}});}return ms.filter(x=>S.has(x)).concat(S.has(m)&&!ms.includes(m)?[m]:[]);}
const grupoKey=m=>grupoEje(m).map(x=>x.cod).join("+");
const grupoNom=m=>grupoEje(m).map(x=>x.ref+" ("+x.cod+")").join(" + ");
function plantaG(m){const cs=grupoEje(m).map(x=>x.cod);return Math.max(0,ejes.filter(e=>cs.includes(e.mod)&&e.estado==="planta").length-pendDeGrupo(m).length);}
const maqG=m=>[...new Set([].concat(...grupoEje(m).map(inyDe)))].length;
const unoPorGrupo=(x,i,a)=>a.findIndex(y=>grupoKey(y.m)===grupoKey(x.m))===i;
function todasRep(){const o=[];Object.keys(reps).forEach(y=>(reps[y]||[]).forEach(r=>o.push(Object.assign({y},r))));return o;}
function repsDe(cod){return todasRep().filter(r=>r.eje===cod).sort((a,b)=>(a.env||a.alta||"").localeCompare(b.env||b.alta||""));}
function abiertaDe(cod){const r=repsDe(cod).filter(x=>!x.res);return r[r.length-1];}
async function addRep(rec,pendId){rec.id=uid();rec.ts=Date.now();if(!rec.maq){const e=ejes.find(x=>x.cod===rec.eje);if(e&&e.maq)rec.maq=e.maq;}const y=(rec.env||rec.alta).slice(0,4);if(db.itemsAdd)await db.itemsAdd("rep",y,[rec]);else{const ref=db.doc("rep/"+y),sn=await ref.get();const items=sn.exists?(sn.data().items||[]).slice():[];items.push(rec);await ref.set({items});}
  if(!rec.recuento)try{await resolverPend(rec.eje,pendId);}catch(e){}}
/* --- ejes rotos sin identificar: un cambio de pistón por ROTURA en una máquina deja un eje de su modelo pendiente de preparar --- */
const MOT_EJE=["ROTURA","PISTÓN AGARROTADO"];
const AGARR="PISTÓN AGARROTADO";
/* de los agarrotados, qué parte se recupera en planta (empieza en 30 % y aprende de lo que vas marcando) */
const tasaRecup=()=>{const x=(cat.ejeStat||{}).agarr||{};return((+x.rec||0)+3)/((+x.rec||0)+(+x.rep||0)+10);};
async function contarAgarr(k){const st=cat.ejeStat=Object.assign({},cat.ejeStat||{});const a=st.agarr=Object.assign({rec:0,rep:0},st.agarr||{});a[k]=(+a[k]||0)+1;}
const pesoPend=p=>p.motivo===AGARR?1-tasaRecup():1;
const ejePend=()=>cat.ejePend||[];
const modsMaq=cod=>(cat.modelos||[]).filter(m=>inyDe(m).includes(cod));
function pendDeGrupo(m){const cs=grupoEje(m).map(x=>x.cod);return ejePend().filter(p=>(p.mods||[]).some(c=>cs.includes(c)));}
const MOT_CUAR=[["ROTURA","Rotura de pistón"],[AGARR,"Pistón agarrotado"],["POSTIZO ROTO","Postizo roto"],["FUGA DE AGUA","Fuga de agua"],["OTRO","Otro"]];
const motTxt=p=>p.motivo===AGARR?"Pistón agarrotado":(!p.motivo||p.motivo==="ROTURA")?"Rotura de pistón":p.motivo==="OTRO"?(p.nota||"Otro motivo"):cap(p.motivo);
/* poner a mano un eje en cuarentena sin saber su número */
function formCuarentena(maqId){const m0=maqId?cat.maquinas.find(x=>x.id===maqId):null;const f={maq:m0?m0.id:"",mot:"ROTURA",f:hoy(),nota:""};
  const info=el("p",{class:"hint"});const pintaInfo=()=>{const m=cat.maquinas.find(x=>x.id===f.maq);if(!m){info.textContent="";return;}const ms=modsMaq(m.cod);
    info.textContent=ms.length?"Eje de esa máquina: "+ms.map(x=>x.ref+" ("+x.cod+")").join(" o ")+". Contará un eje menos en planta.":"Esta máquina no tiene modelo de eje en su ficha: se apunta igual, pero no descuenta de ningún modelo.";};
  const motB=el("div",{style:"display:flex;flex-wrap:wrap;gap:6px"});const pintaMot=()=>{motB.textContent="";MOT_CUAR.forEach(([k,t])=>motB.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(f.mot===k),text:t,onclick:()=>{f.mot=k;pintaMot();}})));};pintaMot();pintaInfo();
  dlg("Poner eje en cuarentena",[el("p",{class:"sub",text:"Sin saber todavía qué eje es. Cuando lo sepas, en Ejes › Ejes en cuarentena pones su número y lo preparas para enviar."}),
    fld("Inyectora",sel("cuM",maqOpts(),f.maq,v=>{f.maq=v;pintaInfo();},"Elige…")),info,
    el("div",{style:"display:flex;flex-direction:column;gap:6px"},[el("div",{style:"font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2)",text:"Motivo"}),motB]),
    el("div",{class:"row"},[fld("Fecha",inp("cuF",f.f,v=>f.f=v,{type:"date"})),fld("Nota (opcional)",inp("cuN",f.nota,v=>f.nota=v,{autocomplete:"off",placeholder:"qué le pasa"}))])],
   [{t:"Cancelar",cls:"sec"},{t:"Poner en cuarentena",fn:async()=>{const m=cat.maquinas.find(x=>x.id===f.maq);if(!m){toast("Elige la inyectora");return false;}
     if(f.mot==="OTRO"&&!f.nota.trim()){toast("Escribe el motivo en la nota");return false;}
     cat.ejePend=ejePend().concat([{id:uid(),f:f.f||hoy(),maq:m.cod,mods:modsMaq(m.cod).map(x=>x.cod),pist:null,diam:null,motivo:f.mot,nota:f.nota.trim()||null,manual:true}]);
     try{await saveCat();toast("Eje de la "+m.cod+" en cuarentena");}catch(e){return false;}render(true);}}]);}
const QUEDA_EJE=DESTINOS[1];/* «queda puesto en el eje»: el eje no se puede usar hasta sacarle el pistón */
async function ejePendDe(recs){const nue=(recs||[]).filter(r=>r&&r.maq&&(MOT_EJE.includes(r.motivo)||r.dest===QUEDA_EJE)).map(r=>{const cod=maqN(r.maq);return{id:uid(),f:r.f,maq:cod,mods:modsMaq(cod).map(m=>m.cod),pist:r.id||null,diam:r.diam||null,motivo:MOT_EJE.includes(r.motivo)?r.motivo:AGARR};});
  if(!nue.length)return;cat.ejePend=ejePend().concat(nue);await saveCat();setTimeout(()=>toast("Eje de "+nue.map(p=>p.maq).join(", ")+" apuntado para preparar (falta poner su número)"),2700);}
async function resolverPend(ejeCod,pendId){const L=ejePend();if(!L.length)return;let i=pendId?L.findIndex(p=>p.id===pendId):-1;
  if(i<0&&ejeCod){const mo=modelo(modeloDeEje(ejeCod));if(!mo)return;const cs=grupoEje(mo).map(x=>x.cod);i=L.map((p,k)=>[p,k]).filter(([p])=>(p.mods||[]).some(c=>cs.includes(c))).sort((a,b)=>a[0].f.localeCompare(b[0].f)).map(x=>x[1])[0];if(i==null)i=-1;}
  if(i<0)return;if(L[i].motivo===AGARR)await contarAgarr("rep");cat.ejePend=L.filter((_,k)=>k!==i);await saveCat();}
async function quitarPendPist(pistId){if(!pistId||!ejePend().some(p=>p.pist===pistId))return;cat.ejePend=ejePend().filter(p=>p.pist!==pistId);await saveCat();}
function prepararPend(p){const cs=new Set();(p.mods||[]).forEach(c=>{const m=modelo(c);if(m)grupoEje(m).forEach(x=>cs.add(x.cod));});
  const lista=ejes.filter(e=>e.estado==="planta"&&(!cs.size||cs.has(e.mod))).sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true}));
  const ag=p.motivo===AGARR;const puesto=ejeEnMaq(p.maq);const f={eje:puesto?puesto.cod:"",desp:ag?"":(!p.motivo||p.motivo==="ROTURA")?"ROTURA DE PISTÓN":p.motivo==="OTRO"?String(p.nota||"").toUpperCase():p.motivo+(p.nota?" ("+String(p.nota).toUpperCase()+")":"")};
  const cuenta={};todasRep().forEach(r=>{const d=String(r.desp||"").trim().toUpperCase();if(d&&d!=="—")cuenta[d]=(cuenta[d]||0)+1;});
  const dlD=el("datalist",{id:"lPendD"},Object.keys(cuenta).sort((a,b)=>cuenta[b]-cuenta[a]).slice(0,40).map(d=>el("option",{value:d})));const dl=el("datalist",{id:"lPendE"},lista.map(e=>el("option",{value:e.cod})));
  dlg((p.manual?"Eje en cuarentena de la ":ag?"Eje con pistón agarrotado de la ":"Eje roto de la ")+p.maq,[el("p",{class:"sub",text:(p.manual?"En cuarentena desde el "+fmtF(p.f)+" por "+motTxt(p).toLowerCase():"Cambio de pistón por "+(ag?"pistón agarrotado":"rotura")+" el "+fmtF(p.f)+(p.diam?" ("+p.diam+")":""))+". Modelo: "+((p.mods||[]).map(c=>{const m=modelo(c);return m?m.ref+" ("+c+")":c;}).join(" o ")||"no se sabe (la máquina no tiene eje en la ficha)")+"."}),
    puesto?el("p",{class:"hint",text:"La app tenía apuntado que en la "+p.maq+" estaba el "+puesto.cod+". Cámbialo si no es ese."}):null,fld("Número del eje que se ha quitado",inp("pdE",f.eje,v=>f.eje=v.trim(),{list:"lPendE",autocomplete:"off",placeholder:lista[0]?"p. ej. "+lista[0].cod:"código del eje"})),dl,
    fld("Desperfecto",inp("pdD",f.desp,v=>f.desp=v,{autocomplete:"off",list:"lPendD",placeholder:"p. ej. NO SE PUEDE SACAR EL PISTÓN, FUGA DE AGUA, POROS…"})),dlD],
    [{t:"Cancelar",cls:"sec"},{t:"Preparar para enviar",fn:async()=>{const e=ejes.find(x=>norm(x.cod)===norm(f.eje));if(!e){toast("Ese eje no existe");return false;}
      if(e.estado!=="planta"){toast(e.cod+" no está en planta");return false;}if(!f.desp.trim()){toast("Pon el desperfecto");return false;}
      await addRep({eje:e.cod,desp:f.desp.trim().toUpperCase(),alta:p.f||hoy(),env:null,maq:p.maq||null},p.id);await updEje(e,{estado:"preparado"});toast(e.cod+" preparado para enviar");}}]);}
function tarjetaPend(){const L=ejePend();if(!L.length)return null;
  return el("section",{class:"card alerta"},[el("div",{class:"hd"},el("h2",{text:"Ejes en cuarentena ("+L.length+")"})),
    el("div",{class:"lst"},L.slice().sort((a,b)=>a.f.localeCompare(b.f)).map(p=>el("div",{class:"it",style:"cursor:default;flex-wrap:wrap"},[el("span",{class:"stripe "+(p.motivo===AGARR?"warn":"bad")}),
      el("div",{class:"ppal"},[el("div",{class:"t1",text:p.maq+" · "+((p.mods||[]).join(" / ")||"modelo sin saber")}),el("div",{class:"t2",text:motTxt(p)+(p.nota&&p.motivo!=="OTRO"?" · "+p.nota:"")+" · desde el "+fmtF(p.f)+(p.manual?" · sin número todavía":" · ya se ha puesto otro eje de planta")})]),
      el("div",{style:"display:flex;gap:6px;width:100%;margin-top:4px;justify-content:flex-end"},[el("button",{type:"button",class:"btn sec peq",text:"No hay que repararlo",onclick:()=>confirmar("¿Quitar de la lista?","El eje de la "+p.maq+" no se manda a reparar y vuelve a contar como disponible en planta. No cuenta como recuperado.","Quitar",async()=>{cat.ejePend=ejePend().filter(x=>x.id!==p.id);await saveCat();render(true);})}),el("button",{type:"button",class:"btn sec peq",text:"Recuperado en planta",onclick:()=>confirmar("¿Recuperado en planta?","El eje de la "+p.maq+" se ha arreglado aquí: vuelve a contar como disponible y suma en «Recuperados en planta» (ahorro).","Recuperado",async()=>{if(p.motivo===AGARR)await contarAgarr("rec");cat.ejeRecup=ejeRecup().concat([{id:uid(),f:hoy(),fPist:p.f,maq:p.maq,mods:p.mods||[],motivo:p.motivo||null}]);cat.ejePend=ejePend().filter(x=>x.id!==p.id);await saveCat();render(true);})}),
        el("button",{type:"button",class:"btn peq",text:"Poner número y preparar",onclick:()=>prepararPend(p)})])]))),
    el("details",{style:"padding:8px 14px"},[el("summary",{class:"hint",style:"cursor:pointer;font-weight:600",text:"¿Cómo funciona la cuarentena?"}),el("p",{class:"hint",text:"Los pones tú con «Poner eje en cuarentena» o salen solos al apuntar un cambio de pistón por rotura, por pistón agarrotado o cuando el pistón queda puesto en el eje. Mientras estén aquí cuentan como un eje menos en planta. De los agarrotados se recupera en planta un "+Math.round(tasaRecup()*100)+" % (se va ajustando con lo que marcas)."})])]);}
async function updReps(list){const g={};list.forEach(([r,p])=>{(g[r.y]=g[r.y]||[]).push([r.id,p]);});
  for(const y of Object.keys(g)){if(db.itemsPatchId){await db.itemsPatchId("rep",y,g[y].map(([id,pt])=>Object.assign({},pt,{id})));continue;}const ref=db.doc("rep/"+y),sn=await ref.get();if(!sn.exists)continue;const m=new Map(g[y]);
    await ref.set({items:(sn.data().items||[]).map(x=>m.has(x.id)?Object.assign({},x,m.get(x.id)):x)});}}
async function updEje(e,patch){if(patch&&patch.estado&&patch.estado!=="planta")patch=Object.assign({},patch,{maq:null});const c=Object.assign({},e,patch);delete c.id;await db.doc("ejes/"+e.id).set(c);}
const ejeRef=e=>{const m=modelo(e.mod);return m?m.ref:e.mod;};
const diasAb=r=>r.env?laborables(r.env,hoy()):null;
function pillDias(n){if(n==null)return el("span",{class:"pill info",text:"Sin enviar"});return el("span",{class:"pill na",text:n+" días"});}
function vEjes(v){const tot=ejes.length,c=k=>ejes.filter(e=>e.estado===k).length;
  const disp=tot?Math.round(c("planta")/tot*100):0;
  v.appendChild(el("dl",{class:"kpis num"},[["Total",tot],["En planta",c("planta")],["En reparación",c("reparacion")],["Preparados",c("preparado")],["Devueltos",c("devuelto")],["Disponible",disp+" %"]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))));
  const prep=ejes.filter(e=>e.estado==="preparado"),fuera=ejes.filter(e=>e.estado==="reparacion"||e.estado==="devuelto");
  {const LP=listaPedir();if(LP.length)v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Para pedir al taller ("+LP.length+")"})]),
    el("div",{class:"lst"},LP.map(e=>el("button",{type:"button",class:"it",onclick:()=>fichaEje(e)},[el("div",{class:"ppal"},[el("div",{class:"t1",text:e.cod+" · "+ejeRef(e)}),el("div",{class:"t2",text:"En el taller desde el "+fmtF((abiertaDe(e.cod)||{}).env)})])]))),
    el("div",{class:"bd"},el("button",{type:"button",class:"btn",style:"width:100%",text:"Enviar WhatsApp al taller",onclick:dlgListaPedir}))]));}
  v.appendChild(el("div",{class:"acciones acc2"},[prep.length?el("button",{type:"button",class:"btn",text:"Enviar preparados ("+prep.length+")",onclick:envioMultiple}):null,
    fuera.length?el("button",{type:"button",class:"btn sec",text:"Pedir al taller que traiga",onclick:pedirTraer}):null,
    fuera.length?el("button",{type:"button",class:"btn sec",text:"Recibir de reparación",onclick:recepcionMultiple}):null,
    el("button",{type:"button",class:"btn sec",text:"Poner eje en cuarentena",onclick:()=>formCuarentena()}),el("button",{type:"button",class:"btn sec",text:"Revisar ejes",onclick:()=>revisionEjes()}),
    el("button",{type:"button",class:"btn sec",text:"Nuevo eje",onclick:()=>formEje()})]));
  const bus=inp("eBus",draft.eb,x=>{draft.eb=x;pintaBus();},{type:"search",placeholder:"Buscar eje (p. ej. 2.3.C-3)",autocomplete:"off"});
  v.appendChild(bus);v.appendChild(el("div",{id:"eRes"}));
  const tp=tarjetaPend();if(tp)v.appendChild(tp);
  /* modelos bajo mínimo */
  const bajos=(cat.modelos||[]).map(m=>({m,p:plantaG(m)})).filter(x=>+x.m.min>0&&x.p<=+x.m.min).filter(unoPorGrupo);
  if(bajos.length)v.appendChild(el("section",{class:"card alerta"},[el("div",{class:"hd"},el("h2",{text:"Modelos en el mínimo ("+bajos.length+")"})),
    el("div",{class:"lst"},bajos.map(({m,p})=>{const tall=ejesTaller(m.cod);const sinPed=tall.filter(e=>{const ab=abiertaDe(e.cod);return!(ab&&ab.traer);});
      return el("div",{class:"it",style:"cursor:default;flex-wrap:wrap"},[el("span",{class:"stripe "+(p<+m.min?"bad":"warn")}),el("button",{type:"button",class:"ppal linkish",style:"all:unset;flex:1;min-width:0;cursor:pointer",onclick:()=>fichaModelo(m)},[el("div",{class:"t1",text:m.ref}),
        el("div",{class:"t2",text:m.cod+" · "+(tall.length?tall.length+" en el taller"+(tall.length-sinPed.length?" ("+(tall.length-sinPed.length)+" ya pedidos)":""):"ninguno en el taller")})]),
        el("div",{class:"cant num"},[el("b",{text:p}),el("small",{text:"en planta · mín "+m.min})]),
        sinPed.length?el("button",{type:"button",class:"btn peq",style:"width:100%;margin-top:4px",text:"Pedir al taller ("+sinPed.length+")",onclick:()=>pedirTraer(m.cod)}):null]);}))]));
  /* sin marcar */
  const sinM=ejes.filter(e=>!e.marcado).sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true}));
  if(sinM.length)v.appendChild(el("details",{class:"card plg"},[el("summary",{class:"hd",style:"cursor:pointer"},[el("h2",{text:"Sin el código grabado ("+sinM.length+")"}),el("span",{class:"der sub",text:"Toca para ver"})]),
    el("p",{class:"hint",style:"padding:8px 14px 0;margin:0",text:"Cuando le grabes el código a un eje, pulsa «Ya grabado»."}),
    el("div",{class:"lst"},sinM.map(e=>{const[t,c]=EST_E[e.estado]||["—","na"];return el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},[el("div",{class:"t1",text:e.cod}),el("div",{class:"t2",text:ejeRef(e)+" · "+t})]),
      el("button",{type:"button",class:"btn sec peq",text:"Ya grabado",onclick:async ev=>{ev.target.disabled=true;try{await updEje(e,{marcado:true});toast(e.cod+": código grabado");}catch(er){ev.target.disabled=false;toast("No se pudo guardar");}}})]);}))]));
  /* pendientes */
  const ab=todasRep().filter(r=>!r.res&&ejes.some(e=>e.cod===r.eje)).map(r=>({r,n:diasAb(r)})).sort((a,b)=>(b.n==null?-1:b.n)-(a.n==null?-1:a.n));
  const enviadas=ab.filter(x=>x.r.env),sinEnv=ab.filter(x=>!x.r.env);
  const fila=({r,n})=>el("button",{type:"button",class:"it",onclick:()=>{const e=ejes.find(z=>z.cod===r.eje);if(e)fichaEje(e);}},[el("div",{class:"ppal"},[el("div",{class:"t1",text:r.eje+" · "+(ejeRef(ejes.find(z=>z.cod===r.eje)||{mod:""}))}),
    el("div",{class:"t2",text:[r.desp,r.env?"Enviado "+fmtF(r.env):null,r.nook?"NO-OK, devuelto "+fmtF(r.dev):null].filter(Boolean).join(" · ")})]),el("div",{style:"display:flex;flex-direction:column;align-items:flex-end;gap:4px"},[pillDias(n),r.traer?el("span",{class:"pill info",text:"Pedido "+fmtF(r.traer)}):null])]);
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"En reparación ("+enviadas.length+")"}),el("span",{class:"der sub",text:"Días laborables desde el envío · vuelven cuando tú los pidas"})]),
    enviadas.length?el("div",{class:"lst"},enviadas.map(fila)):el("div",{class:"empty",text:"No hay ejes en reparación."}),
    sinEnv.length?el("div",{class:"gh",text:"Preparados para enviar ("+sinEnv.length+")"}):null,sinEnv.length?el("div",{class:"lst"},sinEnv.map(fila)):null]));
  /* modelos */
  const mods=(cat.modelos||[]).slice().sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true}));
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Modelos ("+mods.length+")"})),
    mods.length?el("div",{class:"lst"},mods.map(m=>{const es=ejes.filter(e=>e.mod===m.cod);const p=es.filter(e=>e.estado==="planta").length;const pg=plantaG(m);const niv=+m.min>0?(pg<+m.min?"bad":pg===+m.min?"warn":"ok"):"";
      return el("button",{type:"button",class:"it",onclick:()=>fichaModelo(m)},[el("span",{class:"stripe "+niv}),el("div",{class:"ppal"},[el("div",{class:"t1",text:m.ref}),
        el("div",{class:"t2",text:[m.cod,m.iny,es.filter(e=>e.estado!=="planta").length?es.filter(e=>e.estado!=="planta").length+" fuera":null].filter(Boolean).join(" · ")})]),
        el("div",{class:"cant num"},[el("b",{text:p+"/"+es.length}),el("small",{text:"en planta"+(+m.min>0?" · mín "+m.min:"")})])]);})):el("div",{class:"empty",text:"Sin modelos. Añádelos en Catálogo."})]));
  v.appendChild(informeCostes());
  v.appendChild(analisisEjes());
  pintaBus();}
function pintaBus(){const box=$("eRes");if(!box)return;box.textContent="";const q=(draft.eb||"").trim().toLowerCase();if(!q)return;
  const arr=ejes.filter(e=>(e.cod+" "+ejeRef(e)).toLowerCase().includes(q)).sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true})).slice(0,30);
  box.appendChild(el("section",{class:"card"},arr.length?el("div",{class:"lst"},arr.map(itemEje)):el("div",{class:"empty",text:"Ningún eje coincide."})));}
function obsE(e){const u=ultAlb(e.cod);let o=e.obs||"";if(u)o=o.replace(/\s*·?\s*Últ\. albarán \S+/,"").trim();return o||null;}
function ultAlb(cod){const r=repsDe(cod).filter(x=>x.alb&&x.res==="ok");return r.length?r[r.length-1].alb:null;}
function itemEje(e){const[t,c]=EST_E[e.estado]||["—","na"];const ab=abiertaDe(e.cod);
  return el("button",{type:"button",class:"it",onclick:()=>fichaEje(e)},[el("div",{class:"ppal"},[el("div",{class:"t1",text:e.cod+(e.marcado?"":" · sin marcar")}),el("div",{class:"t2",text:[ejeRef(e),e.estado==="planta"&&e.maq?"puesto en "+e.maq:null,ab&&ab.desp?ab.desp:null,ultAlb(e.cod)?"Alb. "+ultAlb(e.cod):null,obsE(e)].filter(Boolean).join(" · ")})]),el("span",{class:"pill "+c,text:t})]);}
function inyDe(m){const t=String(m.iny||"").replace(/\s/g,"");if(!t)return[];const parts=t.split("-");return parts.map(x=>x.startsWith("F")?x:"F"+x).filter(x=>/^F\d+$/.test(x));}
function fichaModelo(m0){const m=(cat.modelos||[]).find(x=>x.id===m0.id)||m0;const es=ejes.filter(e=>e.mod===m.cod).sort((a,b)=>(+a.num||0)-(+b.num||0));
  const c=k=>es.filter(e=>e.estado===k).length;const docs=m.docs||[];
  const reps=todasRep().filter(r=>es.some(e=>e.cod===r.eje)&&r.env&&r.res!=="anulada");
  const ok=reps.filter(r=>r.res==="ok"&&r.rec);const dm=ok.length?Math.round(ok.reduce((a,r)=>a+dias(r.env,r.rec),0)/ok.length):null;
  const dcnt={};reps.forEach(r=>{const k=String(r.desp||"").trim().toUpperCase();if(k&&k!=="—")dcnt[k]=(dcnt[k]||0)+1;});const top=Object.entries(dcnt).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const iny=inyDe(m);const inyTxt=iny.length?iny.map(x=>{const q=cat.maquinas.find(z=>z.cod===x);return x+(q&&q.nave?" ("+q.nave.replace("Nave ","N")+")":"");}).join(", "):(m.iny||"—");
  const dato=(k,v)=>v?[el("dt",{text:k}),el("dd",{text:String(v)})]:[];
  const docBox=el("div",{style:"display:flex;flex-wrap:wrap;gap:10px"});
  docs.forEach(d=>docBox.appendChild(docThumb(d,async()=>{const x=(cat.modelos||[]).find(z=>z.id===m.id);x.docs=(x.docs||[]).filter(z=>z.id!==d.id);await saveCat();toast("Archivo quitado");cerrarDlgs();fichaModelo(m);})));
  if(!docs.length)docBox.appendChild(el("p",{class:"hint",text:"Sin otros documentos (fotos, manuales…)."}));
  const up=subirDoc(async d=>{const x=(cat.modelos||[]).find(z=>z.id===m.id);x.docs=(x.docs||[]).concat([d]);await saveCat();toast("Documento guardado");cerrarDlgs();fichaModelo(m);},"Subir otro documento (PDF o imagen)");
  dlg(m.ref+" · "+m.cod,[
    el("dl",{class:"kpis num"},[["En planta",c("planta")+" / "+es.length],["En reparación",c("reparacion")+c("devuelto")],["Preparados",c("preparado")],["Mínimo",+m.min||0]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))),
    revBox(m),el("div",{class:"gh",style:"border-radius:6px",text:"Otros documentos"}),docBox,up,
    el("div",{class:"gh",style:"border-radius:6px",text:"Datos del modelo"}),
    el("dl",{class:"datos"},[].concat(dato("Código",m.cod),dato("Referencia",m.ref),dato("Longitud",m.long),dato("Rosca",m.rosca),dato("Ø pistón",m.diamP),dato("Nº plano / rev.",m.plano),dato("Inyectoras",inyTxt),dato("Notas",m.notas))),
    el("div",{class:"gh",style:"border-radius:6px",text:"Reparaciones del modelo"}),
    el("p",{class:"sub",text:reps.length+" reparaciones registradas"+(dm!=null?" · "+dm+" días de media en el taller":"")}),
    top.length?el("div",{class:"lst"},top.map(([k,n])=>el("div",{class:"it",style:"cursor:default;padding:6px 0"},[el("div",{class:"ppal"},el("div",{class:"t2",style:"color:var(--ink)",text:cap(k)})),el("span",{class:"pill na",text:n+"×"})]))):null,
    el("div",{class:"gh",style:"border-radius:6px",text:"Ejes ("+es.length+")"}),
    el("div",{class:"card"},es.length?el("div",{class:"lst"},es.map(itemEje)):el("div",{class:"empty",text:"Sin ejes de este modelo."}))],
    [{t:"Editar datos",cls:"sec",fn:()=>{setTimeout(()=>formSimple("modelos",m),0);}},{t:"Nuevo eje",cls:"sec",fn:()=>{setTimeout(()=>formEje(null,m.cod),0);}},{t:"Cerrar",cls:"sec"}]);}
function sigNum(mod){return ejes.filter(e=>e.mod===mod).reduce((mx,e)=>Math.max(mx,+e.num||0),0)+1;}
function formEje(e,mod){const x=e?Object.assign({},e):{mod:mod||"",num:"",marcado:true,obs:""};if(!e&&x.mod)x.num=String(sigNum(x.mod));
  const numI=inp("eNum",x.num,v=>x.num=v,{inputmode:"numeric",class:"num"});
  const body=[fld("Modelo",sel("eMod",(cat.modelos||[]).map(m=>[m.cod,m.ref+" · "+m.cod]),x.mod,v=>{x.mod=v;if(!e){x.num=String(sigNum(v));numI.value=x.num;}},"Elige modelo…")),
    fld("Nº (ID)",numI),el("label",{class:"chk"},[el("input",{type:"checkbox",id:"eMar",checked:x.marcado,onchange:ev=>x.marcado=ev.target.checked}),"Eje marcado"]),
    fld("Observaciones",inp("eObs",x.obs,v=>x.obs=v,{autocomplete:"off"}))];
  if(e)body[0].querySelector("select").disabled=true,numI.disabled=true;
  dlg(e?"Editar eje "+e.cod:"Nuevo eje",body,[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{
    if(!db){toast("No se puede guardar");return false;}
    if(e){try{await updEje(e,{marcado:!!x.marcado,obs:(x.obs||"").trim()||null});toast("Eje guardado");}catch(er){toast("No se pudo guardar");return false;}return;}
    const n=parseInt(x.num,10);if(!x.mod){toast("Elige el modelo");return false;}if(!(n>0)){toast("Pon el número");return false;}
    const cod=x.mod+"-"+n;if(ejes.some(z=>z.cod===cod)){toast("Ya existe el eje "+cod);return false;}
    try{await db.doc("ejes/"+docId(cod)).set({cod,mod:x.mod,num:n,estado:"planta",marcado:!!x.marcado,obs:(x.obs||"").trim()||null,alta:hoy()});toast("Eje "+cod+" dado de alta");}catch(er){toast("No se pudo guardar");return false;}}}]);}
const docId=cod=>"e-"+cod.replace(/"/g,"q").replace(/[^A-Za-z0-9_\-.~:@+]/g,"_");
function fichaEje(e){const f={f:hoy(),desp:"",alb:"",res:"ok",obs:""};const ab=abiertaDe(e.cod);const[et,ec]=EST_E[e.estado]||["—","na"];
  const body=[el("div",{},[el("span",{class:"pill "+ec,text:et})," ",el("span",{class:"sub",text:[ejeRef(e),e.marcado?"Código grabado":"Sin grabar",ultAlb(e.cod)?"Albarán de la última reparación: "+ultAlb(e.cod):null,obsE(e)].filter(Boolean).join(" · ")})])];
  const acts=[];const re=()=>{const z=ejes.find(q=>q.id===e.id);if(z)setTimeout(()=>fichaEje(z),350);};
  body.push(el("div",{style:"display:flex;gap:6px;flex-wrap:wrap;align-items:center"},[el("span",{class:"sub",style:"flex:1 1 100%",text:e.estado==="planta"?(e.maq?"Puesto en la "+e.maq+(e.maqF?" (desde "+fmtF(e.maqF)+")":""):"De repuesto o sin saber en qué máquina está"):"No está en planta"}),
    e.estado==="planta"?el("button",{type:"button",class:"btn sec peq",text:e.maq?"Cambiar máquina":"Puesto en máquina…",onclick:()=>{cerrarDlgs();elegirMaq(e,re);}}):null,
    el("button",{type:"button",class:"btn sec peq",text:"Mover (planta / taller)…",onclick:()=>{cerrarDlgs();corregirEstado(e,re);}})]));
  const fecha=()=>fld("Fecha",inp("efF",f.f,v=>f.f=v,{type:"date"}));
  if(e.estado==="planta"){body.push(fld("Desperfecto detectado",inp("efD","",v=>f.desp=v,{autocomplete:"off"})));
    acts.push({t:"Preparar para enviar",fn:async()=>{if(!f.desp.trim()){toast("Describe el desperfecto");return false;}await addRep({eje:e.cod,desp:f.desp.trim(),alta:hoy(),env:null});await updEje(e,{estado:"preparado"});toast(e.cod+" preparado para enviar");}});}
  else if(e.estado==="preparado"){body.push(ab?el("p",{text:"Desperfecto: "+ab.desp}):null,fecha());
    acts.push({t:"Enviar a reparar",fn:async()=>{await enviar([e],f.f);toast(e.cod+" enviado a reparar");}},
      {t:"Vuelve a planta",cls:"sec",fn:async()=>{if(ab&&!ab.env){await updReps([[ab,{res:"anulada",rec:f.f}]]);}await updEje(e,{estado:"planta"});toast(e.cod+" en planta");}});}
  else{if(ab&&ab.traer)acts.push({t:"Quitar «pedido traer»",cls:"sec",fn:async()=>{await updReps([[ab,{traer:null}]]);toast("Marca quitada");}});
    body.push(ab?el("p",{text:"Enviado "+fmtF(ab.env)+" · "+(diasAb(ab)||0)+" días · "+ab.desp+(ab.traer?" · Pedido traer el "+fmtF(ab.traer):"")}):null,
      ab?el("div",{style:"display:flex;gap:6px;flex-wrap:wrap"},[el("button",{type:"button",class:ab.apedir?"btn sec":"btn",text:ab.apedir?"✓ En la lista para pedir · quitar":"Añadir a la lista para pedir al taller",onclick:async()=>{
          const nu=ab.apedir?null:hoy();try{await updReps([[ab,{apedir:nu}]]);}catch(er){toast("No se pudo guardar");return;}ab.apedir=nu;toast(nu?"Añadido a la lista ("+listaPedir().length+")":"Quitado de la lista");cerrarDlgs();re();}}),
        listaPedir().length?el("button",{type:"button",class:"btn sec",text:"Ver la lista y enviar ("+listaPedir().length+")",onclick:()=>dlgListaPedir()}):null]):null,
      fecha(),fld("Albarán de recepción",inp("efA","",v=>f.alb=v,{autocomplete:"off"})),
      el("div",{class:"seg",role:"group","aria-label":"Resultado"},[["ok","OK"],["nook","NO-OK"]].map(([k,l])=>{const b=el("button",{type:"button","aria-pressed":String(f.res===k),text:l});b.onclick=()=>{f.res=k;b.parentNode.querySelectorAll("button").forEach(z=>z.setAttribute("aria-pressed",String(z===b)));obsF.hidden=k!=="nook";};return b;})));
    const obsF=fld("Observación NO-OK",inp("efO","",v=>f.obs=v,{autocomplete:"off"}),true);body.push(obsF);
    acts.push({t:"Registrar recepción",fn:async()=>{if(f.res==="nook"&&!f.obs.trim()){toast("Explica por qué es NO-OK");return false;}await recibir([e],f.f,f.alb,f.res,f.obs);toast(e.cod+(f.res==="ok"?" recibido OK":" devuelto a reparar"));if(f.res==="ok")trasRecibir([e]);}});}
  const hist=repsDe(e.cod).slice().reverse();
  const repN=[hist.length?el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Enviado"}),el("th",{text:"Recibido"}),el("th",{text:"Desperfecto"}),el("th",{text:"Albarán"}),el("th",{text:""})])),
    el("tbody",{},hist.map(r=>el("tr",{},[el("td",{class:"num",text:fmtF(r.env)}),el("td",{class:"num",text:r.res?fmtF(r.rec):(r.rec?"prev. "+fmtF(r.rec):"—")}),el("td",{},[el("div",{text:r.desp||"—"}),r.nook?el("div",{class:"sub",text:"NO-OK "+fmtF(r.dev)+(r.obs?": "+r.obs:"")}):null]),el("td",{class:"num",text:r.alb||"—"}),
      el("td",{},r.res==="ok"?el("span",{class:"pill ok",text:"OK"}):r.res==="anulada"?el("span",{class:"pill na",text:"Anulada"}):r.res?el("span",{class:"pill na",text:"Cerrada"}):el("span",{class:"pill warn",text:"Abierta"}))])))])):el("p",{class:"hint",text:"Sin reparaciones."})];
  acts.unshift({t:"Editar",cls:"sec",fn:()=>{setTimeout(()=>formEje(e),0);}});acts.forEach(x=>{if(x.cls==="sec"||x.t==="Editar")return;});
  const coste=hist.reduce((t,r)=>t+(r.res==="ok"?(costeRep(r).v||0):0),0);const m=modelo(e.mod);
  objPage({tipo:"Eje",ruta:["Ejes",m?m.ref:e.mod],titulo:e.cod,sub:[ejeRef(e),e.estado==="planta"&&e.maq?"Puesto en la "+e.maq:null].filter(Boolean).join(" · "),estado:[et,ec],
    kpis:ab&&ab.env?[["Días en el taller",String(diasAb(ab)||0),(diasAb(ab)||0)>30?"neg":""],["Esta reparación",costeRep(ab).v?eur(costeRep(ab).v)+(+ab.imp>0?"":" (aprox.)"):"sin precio"],["Reparaciones hechas",String(hist.filter(r=>r.res==="ok").length)],["Coste total hecho",coste?eur(coste):"0 €"]]
      :[["Reparaciones hechas",String(hist.filter(r=>r.res==="ok").length)],["Coste total",coste?eur(coste):"0 €"],["Máquina",e.maq||"—"],["Código grabado",e.marcado?"Sí":"No"]],
    tabs:[["General",[el("section",{class:"card"},el("div",{class:"bd",style:"display:grid;gap:12px"},body))]],["Reparaciones ("+hist.length+")",[el("section",{class:"card"},repN)]]],acts});}
async function enviar(list,f){const ups=[];for(const e of list){const ab=abiertaDe(e.cod);if(ab&&!ab.env)ups.push([ab,{env:f}]);else await addRep({eje:e.cod,desp:"—",alta:f,env:f});}
  if(ups.length)await updReps(ups);for(const e of list)await updEje(e,{estado:"reparacion"});}
function trasRecibir(list){const cs=new Set();list.forEach(e=>{const m=modelo(e.mod);(m?grupoEje(m):[{cod:e.mod}]).forEach(x=>cs.add(x.cod));});
  const ids=new Set(list.map(e=>e.id));const quedan=ejesTaller().filter(e=>cs.has(e.mod)&&!ids.has(e.id)&&(abiertaDe(e.cod)||{}).traer);
  if(!quedan.length)return;setTimeout(()=>dlg("¿Siguen pedidos?",[el("p",{text:"Estos ejes del mismo modelo siguen marcados como «pedido al taller»:"}),
    el("ul",{},quedan.map(e=>el("li",{text:e.cod+" · pedido el "+fmtF(abiertaDe(e.cod).traer)}))),el("p",{class:"hint",text:"Si el taller te ha traído otro en su lugar y ya no los esperas, quita la marca."})],
    [{t:"Siguen pedidos",cls:"sec"},{t:"Quitar la marca",fn:async()=>{try{await updReps(quedan.map(e=>[abiertaDe(e.cod),{traer:null}]));toast("Marca quitada");}catch(er){toast("No se pudo guardar");return false;}}}]),700);}
async function recibir(list,f,alb,res,obs,imp){const ups=[];list.forEach(e=>{const ab=abiertaDe(e.cod);if(!ab)return;
  if(res==="ok")ups.push([ab,Object.assign({res:"ok",rec:f,alb:alb||ab.alb||null},imp>0?{imp}:{})]);else ups.push([ab,{nook:true,dev:f,obs:obs||null,alb:alb||ab.alb||null}]);});
  if(ups.length)await updReps(ups);for(const e of list)await updEje(e,{estado:res==="ok"?"planta":"devuelto"});}
function checkList(list,marc){const sel0=new Set(marc instanceof Set?Array.from(marc):marc?list.map(e=>e.id):[]);
  const box=el("div",{class:"card"},el("div",{class:"lst"},list.map(e=>{const ab=abiertaDe(e.cod);return el("label",{class:"chk it",style:"cursor:pointer"},[el("input",{type:"checkbox",checked:sel0.has(e.id),onchange:ev=>{ev.target.checked?sel0.add(e.id):sel0.delete(e.id);}}),
    el("div",{class:"ppal"},[el("div",{class:"t1",text:e.cod}),el("div",{class:"t2",text:[ejeRef(e),ab&&ab.desp,ab&&ab.env?diasAb(ab)+" días":null,ab&&ab.traer?"ya pedido el "+fmtF(ab.traer):null].filter(Boolean).join(" · ")}),modBajo(e.mod)?el("span",{class:"pill bad",style:"margin-top:3px",text:"Modelo en el mínimo"}):null])]);})));
  return{box,sel:()=>list.filter(e=>sel0.has(e.id))};}
function telWA(t){let d=String(t||"").replace(/\D/g,"");if(d.startsWith("00"))d=d.slice(2);if(d.length===9)d="34"+d;return d;}
function modBajo(cod){const m=modelo(cod);return!!(m&&+m.min>0&&plantaG(m)<=+m.min);}
function ejesTaller(mod){return ejes.filter(e=>(e.estado==="reparacion"||e.estado==="devuelto")&&(!mod||e.mod===mod));}
function pedirTraer(mod){if(typeof mod!=="string")mod=null;
  const bajo=new Set((cat.modelos||[]).filter(m=>+m.min>0&&plantaG(m)<=+m.min).map(m=>m.cod));
  const envD=e=>{const ab=abiertaDe(e.cod);return ab&&ab.env||"9";};
  const list=ejesTaller(mod).sort((a,b)=>(bajo.has(b.mod)-bajo.has(a.mod))||envD(a).localeCompare(envD(b))||a.cod.localeCompare(b.cod,"es",{numeric:true}));
  const pre=new Set(mod?list.filter(e=>{const ab=abiertaDe(e.cod);return!(ab&&ab.traer);}).map(e=>e.id):[]);
  const f={prov:(cat.ajustes||{}).taller||(cat.proveedores[0]||{}).id||""};const cl=checkList(list,pre);
  dlg("Pedir al taller que traiga",[fld("Taller",sel("ptProv",provOpts(),f.prov,v=>f.prov=v,"—")),el("p",{class:"hint",text:mod?"Ya van marcados los ejes de "+((modelo(mod)||{}).ref||mod)+" que están en el taller y no has pedido. Desmarca los que no quieras.":"Marca los ejes que quieres que te traigan. Arriba salen los de modelos que están en el mínimo."}),cl.box],
    [{t:"Cancelar",cls:"sec"},{t:"Preparar mensaje",fn:async()=>{const sel0=cl.sel();if(!sel0.length){toast("Marca al menos un eje");return false;}
      const hy=hoy();const ups=[];sel0.forEach(e=>{const ab=abiertaDe(e.cod);if(ab)ups.push([ab,{traer:hy}]);});
      try{if(ups.length)await updReps(ups);if(f.prov&&(cat.ajustes||{}).taller!==f.prov){cat.ajustes=Object.assign({},cat.ajustes,{taller:f.prov});await saveCat();}}catch(e){toast("No se pudo guardar");return false;}
      setTimeout(()=>mensajeTaller(sel0,f.prov),0);}}]);}
/* ejes marcados para pedir al taller que los traiga: se van juntando y se envían todos en un WhatsApp */
function listaPedir(){return ejes.filter(e=>(e.estado==="reparacion"||e.estado==="devuelto")&&(abiertaDe(e.cod)||{}).apedir).sort(porCod);}
function dlgListaPedir(){const L=listaPedir();if(!L.length){toast("La lista está vacía");return;}
  const f={prov:(cat.ajustes||{}).taller||(cat.proveedores[0]||{}).id||""};
  dlg("Para pedir al taller ("+L.length+")",[fld("Taller",sel("lpProv",provOpts(),f.prov,v=>f.prov=v,"—")),
    el("div",{class:"lst"},L.map(e=>{const ab=abiertaDe(e.cod);return el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},[el("div",{class:"t1",text:e.cod+" · "+ejeRef(e)}),el("div",{class:"t2",text:"En el taller desde el "+fmtF(ab.env)+" · "+(diasAb(ab)||0)+" días lab."})]),
      el("button",{type:"button",class:"btn txt peq",text:"Quitar","aria-label":"Quitar "+e.cod,onclick:async()=>{try{await updReps([[ab,{apedir:null}]]);}catch(er){toast("No se pudo");return;}ab.apedir=null;cerrarDlgs();render(true);if(listaPedir().length)setTimeout(dlgListaPedir,250);}})]);})),
    el("p",{class:"hint",text:"Pulsa «Preparar WhatsApp», envíalo y luego «Ya lo he enviado»: se apuntan como pedidos y la lista se vacía."})],
    [{t:"Cerrar",cls:"sec"},{t:"Preparar WhatsApp",fn:async()=>{if(f.prov&&(cat.ajustes||{}).taller!==f.prov){cat.ajustes=Object.assign({},cat.ajustes,{taller:f.prov});try{await saveCat();}catch(e){}}
      setTimeout(()=>mensajeTaller(L,f.prov,async()=>{const hy=hoy();const R=L.map(e=>abiertaDe(e.cod)).filter(Boolean);try{await updReps(R.map(r=>[r,{traer:hy,apedir:null}]));}catch(er){toast("No se pudo guardar");return false;}R.forEach(r=>{r.traer=hy;r.apedir=null;});toast(L.length+(L.length===1?" eje pedido al taller":" ejes pedidos al taller"));render(true);}),0);}}]);}
function mensajeTaller(list,provId,alEnviar){const pv=cat.proveedores.find(x=>x.id===provId)||{};
  const L=["Hola, buenos días.","Desde MAPRI necesitamos que nos traigáis estos ejes reparados:"];
  list.forEach(e=>{const ab=abiertaDe(e.cod);L.push("- "+e.cod+" · "+ejeRef(e)+(ab&&ab.env?" (enviado el "+fmtF(ab.env)+")":""));});
  L.push("","Gracias. Un saludo.");const txt=L.join("\n");
  const tel=telWA(pv.wa||pv.tel);const url="https://wa.me/"+(tel||"")+"?text="+encodeURIComponent(txt);
  const ta=el("textarea",{id:"mtTxt",style:"min-height:200px;font-size:14px",value:txt});
  dlg("Mensaje para "+(pv.nom||"el taller"),[ta,
    el("a",{class:"btn",href:url,target:"_blank",rel:"noopener",style:"text-align:center;text-decoration:none",text:"Abrir en WhatsApp"}),
    el("p",{class:"hint",text:tel?"Se abre WhatsApp con el mensaje escrito para "+(pv.nom||"el taller")+" ("+(pv.wa||pv.tel)+"); solo tienes que pulsar enviar.":"No hay teléfono del taller: WhatsApp te pedirá elegir el contacto. Ponlo en Catálogo > Proveedores para que vaya directo."}),
    el("p",{class:"hint",text:"Si cambias el texto aquí, usa «Copiar» y pégalo en WhatsApp."})],
    [{t:"Copiar",cls:"sec",fn:async()=>{try{await navigator.clipboard.writeText(ta.value);toast("Mensaje copiado");}catch(e){ta.focus();ta.select();toast("Selecciona el texto y cópialo");}return false;}},{t:"Cerrar",cls:"sec"}].concat(alEnviar?[{t:"Ya lo he enviado",fn:alEnviar}]:[]));}
function envioMultiple(){const list=ejes.filter(e=>e.estado==="preparado").sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true}));const f={f:hoy()};const cl=checkList(list,true);
  dlg("Enviar a reparar",[fld("Fecha de envío",inp("emF",f.f,v=>f.f=v,{type:"date"})),el("p",{class:"hint",text:"Desmarca los que no quieras enviar todavía: se quedan como «Preparado para enviar» para otro día."}),cl.box],
    [{t:"Cancelar",cls:"sec"},{t:"Enviar",fn:async()=>{const s=cl.sel();if(!s.length){toast("Marca al menos un eje");return false;}try{await enviar(s,f.f);toast(s.length+" ejes enviados a reparar");}catch(er){toast("No se pudo guardar");return false;}}}]);}
function recepcionMultiple(){const list=ejes.filter(e=>e.estado==="reparacion"||e.estado==="devuelto").sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true}));const f={f:hoy(),alb:"",imp:""};const cl=checkList(list,false);
  dlg("Recibir de reparación",[fld("Fecha de recepción",inp("rmF",f.f,v=>f.f=v,{type:"date"})),fld("Albarán",inp("rmA","",v=>f.alb=v,{autocomplete:"off"})),fld("Importe por eje en € (opcional; si no, se usa el precio del modelo)",inp("rmI","",v=>f.imp=v,{inputmode:"decimal",class:"num"})),el("p",{class:"hint",text:"Marca los ejes que llegan bien (OK). Si alguno llega mal, regístralo desde su ficha como NO-OK."}),cl.box],
    [{t:"Cancelar",cls:"sec"},{t:"Recibir OK",fn:async()=>{const s=cl.sel();if(!s.length){toast("Marca al menos un eje");return false;}try{await recibir(s,f.f,f.alb,"ok",null,parseN(f.imp));toast(s.length+" ejes recibidos OK");}catch(er){toast("No se pudo guardar");return false;}trasRecibir(s);}}]);}
function analisisEjes(){const all=todasRep().filter(r=>r.env&&r.res!=="anulada"),hy=hoy(),ano=hy.slice(0,4);
  const pm={};all.forEach(r=>{if(r.env.startsWith(ano)){const m=+r.env.slice(5,7);(pm[m]=pm[m]||{e:0,r:0}).e++;}if(r.res==="ok"&&r.rec&&r.rec.startsWith(ano)){const m=+r.rec.slice(5,7);(pm[m]=pm[m]||{e:0,r:0}).r++;}});
  const pe={};all.forEach(r=>{const x=pe[r.eje]=pe[r.eje]||{n:0,d:0,u:""};x.n++;x.d+=dias(r.env,r.res&&r.rec?r.rec:hy);if(r.env>x.u)x.u=r.env;});
  const top=Object.entries(pe).sort((a,b)=>b[1].n-a[1].n||b[1].d-a[1].d).slice(0,10);
  const pa={};all.filter(r=>r.alb&&r.res).forEach(r=>{const x=pa[r.alb]=pa[r.alb]||{n:0,d:0,nk:0,f:""};x.n++;x.d+=dias(r.env,r.rec||r.env);if(r.nook)x.nk++;if((r.rec||"")>x.f)x.f=r.rec||"";});
  const albs=Object.entries(pa).sort((a,b)=>b[1].f.localeCompare(a[1].f)).slice(0,15);
  const t=(h,rows)=>el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},h.map(([x,r])=>el("th",{class:r?"r":null,text:x})))),el("tbody",{},rows)]));
  const ms=Object.keys(pm).map(Number).sort((a,b)=>a-b);
  return el("details",{class:"card"},[el("summary",{class:"hd",style:"cursor:pointer"},el("h2",{text:"Análisis de reparaciones"})),
    el("div",{class:"gh",text:"Envíos y recepciones OK · "+ano}),t([["Mes"],["Enviados",1],["Recibidos OK",1]],ms.map(m=>el("tr",{},[el("td",{text:cap(MESES[m-1])}),el("td",{class:"r num",text:pm[m].e}),el("td",{class:"r num",text:pm[m].r})]))),
    el("div",{class:"gh",text:"Ejes con más reparaciones"}),t([["Eje"],["Ref."],["Reparaciones",1],["Días fuera",1],["Último envío"]],top.map(([k,x])=>{const e=ejes.find(z=>z.cod===k);return el("tr",{},[el("td",{},el("b",{text:k})),el("td",{text:e?ejeRef(e):"—"}),el("td",{class:"r num",text:x.n}),el("td",{class:"r num",text:x.d}),el("td",{class:"num",text:fmtF(x.u)})]);})),
    el("div",{class:"gh",text:"Plazo y calidad por albarán"}),t([["Albarán"],["Ejes",1],["Días medios",1],["NO-OK",1]],albs.map(([k,x])=>el("tr",{},[el("td",{class:"num",text:k}),el("td",{class:"r num",text:x.n}),el("td",{class:"r num",text:fmtN(Math.round(x.d/x.n*10)/10)}),el("td",{class:"r num",text:x.nk?x.nk+" ("+Math.round(x.nk/x.n*100)+" %)":"—"})])))]);}


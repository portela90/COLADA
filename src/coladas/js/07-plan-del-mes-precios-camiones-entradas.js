/* ---------- Plan del mes: precios, camiones, entradas previstas y proyección ----------
   La proyección cuenta SOLO los fardos que están en fábrica. Lo del almacén
   externo no entra hasta que se marca una traída (la "B" del calendario). */
const KG_CAM=25000, FA_CAM=37;
/* Tamaño real de un camión, aprendido de lo que llega: cada entrada registrada
   y las coladas del externo del inventario (que están enteras). Por aleación y,
   si hay al menos 3, por proveedor. Si no hay datos, 37 f / 25.000 kg. */
function mediaCamion(mat,prov){
  const m=[];
  todosMovs().forEach(r=>{if(r.t==="E"&&!r.h&&!r.ke&&r.fa>0){const l=lotes.find(x=>x.id===r.d);if(l)m.push({mat:l.material,p:nrm(l.proveedor||r.p||""),fa:r.fa,kg:r.kg||0});}});
  lotes.forEach(l=>{if(l.donde==="externo"&&l.fardosInv>0&&!/^Parte de/.test(l.obs||""))m.push({mat:l.material,p:nrm(l.proveedor||""),fa:l.fardosInv,kg:l.kgInv||0});});
  const med=a=>a.length?{fa:a.reduce((s,x)=>s+x.fa,0)/a.length,kg:a.reduce((s,x)=>s+x.kg,0)/a.length,n:a.length}:null;
  const pp=prov?med(m.filter(x=>x.mat===mat&&x.p===nrm(prov))):null;if(pp&&pp.n>=3)return pp;
  const pm=mat?med(m.filter(x=>x.mat===mat)):null;if(pm&&pm.n>=3)return pm;
  return med(m)||{fa:FA_CAM,kg:KG_CAM,n:0};
}
const LINEAS=[["Nave 1","L-2630"],["Nave 1","L-2521-B"],["Nave 2","L-2630"],["Nave 2","L-2521-B"]];
function mesPlan(){return planMes||mesDe(hoy());}
/* ---------- Precios del aluminio ----------
   Se meten y se ven en €/kg; se guardan en €/tonelada (así se hacen las cuentas). Se meten por mes, proveedor y aleación. Si un mes no tiene
   precio para un proveedor se usa el último mes anterior que lo tenga.
   Guardado en cfg.precios[mes] = {prov:{PROV:€ AlSi9}, provAz:{PROV:€ AlSi12}, azul:€ AlSi12 general}. */
let precMes=null;
function precioDe(mes,prov,mat){const P=cfg.precios||{},k=(prov||"").toUpperCase();
  const ms=Object.keys(P).filter(m=>m<=mes).sort().reverse();
  for(const m of ms){const p=P[m]||{};
    if(mat==="L-2521-B"){const v=(p.provAz||{})[k];if(v>0)return{v,m};}
    else{const v=(p.prov||{})[k];if(v>0)return{v,m};}}
  if(mat==="L-2521-B")for(const m of ms){const v=(P[m]||{}).azul;if(v>0)return{v,m};}
  return{v:0,m:null};}
/* entradas del mes (también las anteriores a la app) con su proveedor */
function entradasMes(mes){return todosMovs().filter(r=>r.t==="E"&&r.f&&r.f.slice(0,7)===mes).map(r=>{
  const l=lotes.find(x=>x.id===r.d);return{r,prov:(l&&l.proveedor)||r.p||"",mat:l?l.material:r.ml,nave:l?l.nave:r.nv,kg:typeof r.kg==="number"?r.kg:0,fa:r.fa||0};});}
/* precio del mes para valorar el cierre: media de lo que ha entrado ese mes,
   cada camión a su precio de proveedor. Si no entró nada, media de la tarifa. */
function precioMedio(mes,mat){
  let k=0,e=0,n=0,sin=0;entradasMes(mes).filter(x=>x.mat===mat).forEach(x=>{const p=precioDe(mes,x.prov,mat).v;if(p>0&&x.kg>0){k+=x.kg;e+=x.kg*p;n++;}else sin++;});
  if(k>0)return{v:e/k,fuente:"entradas",n,sin};
  const ps=(cfg.proveedores||[]).map(p=>precioDe(mes,p,mat).v).filter(v=>v>0);
  if(ps.length)return{v:ps.reduce((a,b)=>a+b,0)/ps.length,fuente:"tarifa",n:ps.length,sin};
  return{v:0,fuente:"",n:0,sin};}
async function setPrecio(mes,prov,mat,val){
  const c=Object.assign({},cfg.precios||{}),p=Object.assign({prov:{},provAz:{},azul:0},c[mes]||{});
  if(prov==="*"){p.azul=val;}
  else{const f=mat==="L-2521-B"?"provAz":"prov";p[f]=Object.assign({},p[f]||{});if(val>0)p[f][prov.toUpperCase()]=val;else delete p[f][prov.toUpperCase()];}
  c[mes]=p;cfg.precios=c;await saveCfg();}
const eurT=v=>(Math.round(v*100)/100).toLocaleString("es-ES",{minimumFractionDigits:1,maximumFractionDigits:2});
/* precios en € por kg (se guardan en €/t): 2787,5 €/t → 2,7875 €/kg */
const eurKg=v=>(v/1000).toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:4});
const kgTxt=v=>v?String(Math.round(v*10)/10000).replace(".",","):"";
/* lo que se escribe en €/kg → €/t para guardar. Si alguien pone el de la tonelada (más de 100), se entiende como €/t */
const deKg=t=>{const v=numES(t);if(!(v>0))return v;return Math.round((v>100?v:v*1000)*100)/100;};
function vPrecios(){
  const act=mesDe(hoy()),m=precMes||act;
  const ms=new Set([act]);Object.keys(cfg.precios||{}).forEach(x=>ms.add(x));Object.keys(meses).forEach(x=>ms.add(x));
  {const[y,mo]=act.split("-").map(Number);const d=new Date(y,mo,1);ms.add(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));}
  const selM=el("select",{id:"pr-mes",onchange:e=>{precMes=e.target.value;render();}},[...ms].sort().reverse().map(v=>{const o=el("option",{value:v,text:Mayus(nomMes(v))+(v===act?" (este mes)":"")});if(v===m)o.selected=true;return o;}));
  const provs=(cfg.proveedores||[]).slice().sort((a,b)=>a.localeCompare(b,"es"));
  const propio=(prov,mat)=>{const p=(cfg.precios||{})[m]||{},k=prov.toUpperCase();return mat==="L-2521-B"?((p.provAz||{})[k]||0):((p.prov||{})[k]||0);};
  const celda=(prov,mat)=>{const own=propio(prov,mat),her=own?null:precioDe(m,prov,mat);
    return el("td",{},[el("input",{class:"num",type:"text",inputmode:"decimal",style:"font-size:15px;padding:7px 9px",value:kgTxt(own),
      placeholder:her&&her.v?eurKg(her.v)+(her.m!==m?" ("+nomMes(her.m).slice(0,3)+")":""):"€/kg","aria-label":prov+" "+MAT[mat].nom+" €/kg",
      onchange:async e=>{const t=e.target.value.trim(),v=t===""?0:deKg(t);if(t!==""&&!(v>0)){toast("Pon el precio en € por kg, por ejemplo 2,7875");return;}
        try{await setPrecio(m,prov,mat,v);toast(v?"Precio guardado":"Precio quitado: se usa el del mes anterior");render();}catch(err){toast("No se pudo guardar");}}})]);};
  const general=(()=>{const p=(cfg.precios||{})[m]||{},own=p.azul||0,her=own?null:precioDe(m,"*","L-2521-B");
    return el("tr",{},[el("td",{},[document.createTextNode("Otros"),el("div",{class:"sub",text:"AlSi12 de un proveedor sin precio propio"})]),el("td",{class:"sub",text:"—"}),
      el("td",{},[el("input",{class:"num",type:"text",inputmode:"decimal",style:"font-size:15px;padding:7px 9px",value:kgTxt(own),placeholder:her&&her.v?eurKg(her.v):"€/kg",
        onchange:async e=>{const t=e.target.value.trim(),v=t===""?0:deKg(t);if(t!==""&&!(v>0))return;try{await setPrecio(m,"*","L-2521-B",v);toast("Precio guardado");render();}catch(err){toast("No se pudo guardar");}}})])]);})();
  const med=Object.keys(MAT).map(mt=>{const x=precioMedio(m,mt);
    return el("tr",{},[el("td",{},[el("span",{class:"tagm",style:"background:"+MAT[mt].col}),document.createTextNode(MAT[mt].nom)]),
      el("td",{class:"r num",style:"font-weight:600",text:x.v?eurKg(x.v)+" €/kg":"—"}),
      el("td",{class:"sub",text:x.fuente==="entradas"?"media de "+x.n+" camión(es) de este mes"+(x.sin?" · "+x.sin+" sin precio":""):x.fuente==="tarifa"?"sin entradas: media de la tarifa":"sin precios"})]);});
  /* entradas del mes sin precio */
  const sinP=entradasMes(m).filter(x=>!(precioDe(m,x.prov,x.mat).v>0));
  return [
    el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Precios del aluminio"}),el("div",{style:"margin-left:auto;min-width:175px"},[selM])]),
      el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:12px"},[
        el("p",{class:"hint",text:"En € por kg (por ejemplo 2,7875). Lo que dejes vacío toma el precio del mes anterior (sale en gris). Solo cambia los que suban o bajen."}),
        el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},[el("th",{text:"Proveedor"}),el("th",{text:"AlSi9 €/kg"}),el("th",{text:"AlSi12 azul €/kg"})])]),
          el("tbody",{},provs.map(p=>el("tr",{},[el("td",{text:p}),celda(p,"L-2630"),celda(p,"L-2521-B")])).concat([general]))])]),
        sinP.length?el("div",{class:"banner w",text:sinP.length+" entrada(s) de este mes sin precio: "+[...new Set(sinP.map(x=>(x.prov||"sin proveedor")+" "+(MAT[x.mat]?MAT[x.mat].nom:"")))].join(", ")+"."}):null])]),
    el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Precio para el cierre"})]),
      el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[
        el("p",{class:"hint",text:"El cierre valora todo (stock inicial, entradas, consumo y stock final) al precio del mes: la media de los camiones que han entrado, cada uno a su precio de proveedor."}),
        el("div",{class:"tw"},[el("table",{},[el("tbody",{},med)])])])])
  ];
}
function plmes(){const p=(cfg.plan||{})[mesPlan()]||{};return{camiones:p.camiones||[],consumo:p.consumo||{},entradas:p.entradas||[]};}
function precioLote(l){return precioDe(mesPlan(),l.proveedor,l.material).v;}
async function setPlan(patch){
  const c=Object.assign({},cfg.plan||{}),m=mesPlan();
  c[m]=Object.assign({camiones:[],consumo:{},entradas:[]},c[m]||{},patch);cfg.plan=c;await saveCfg();}
function diasMes(mes){const[y,mm]=mes.split("-").map(Number),out=[],fin=new Date(y,mm,0).getDate();
  for(let d=1;d<=fin;d++)out.push(mes+"-"+String(d).padStart(2,"0"));return out;}
function diasHabiles(mes){return diasMes(mes).filter(f=>relevosDia(f)>0);}
async function setRelevos(f,n){const c=Object.assign({},cfg.calendario||{});if(n===relevosBase(f))delete c[f];else c[f]=n;cfg.calendario=c;await saveCfg();}
/* tarjeta con el calendario del mes: se toca un día para cambiar los relevos */
function calendarioCard(mes){
  const dias=diasMes(mes),w0=(new Date(+mes.slice(0,4),+mes.slice(5,7)-1,1).getDay()+6)%7;
  const txt=n=>n===3?"3 relevos":n===2?"sin noche":n===1?"1 relevo":"no trabaja";
  const celdas=[];for(let i=0;i<w0;i++)celdas.push(el("div",{}));
  dias.forEach(f=>{const n=relevosDia(f),cambiado=typeof (cfg.calendario||{})[f]==="number";
    celdas.push(el("button",{type:"button",class:"cal-d r"+n+(cambiado?" cambio":"")+(f===hoy()?" hoy":""),title:dmyA(f)+": "+txt(n)+" (toca para cambiar)",
      onclick:async()=>{const sig=n===3?2:n===2?1:n===1?0:3;try{await setRelevos(f,sig);toast(dmyA(f)+": "+txt(sig));render();}catch(e){toast("No se pudo guardar");}}},
      [el("b",{text:String(+f.slice(8))}),el("span",{text:n===3?"":n===2?"sin N":n===1?"1 rel.":"—"})]));});
  const eq=laborables(dias[0],dias[dias.length-1]),nd=dias.filter(f=>relevosDia(f)>0).length,fies=dias.filter(f=>relevosBase(f)>0&&relevosDia(f)===0).length;
  return el("div",{class:"card"},[
    el("div",{class:"hd"},[el("h2",{text:"Días de trabajo"}),el("span",{class:"sub",style:"margin-left:auto",text:nd+" días · equivale a "+eq.toLocaleString("es-ES")+" días completos"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[
      el("div",{class:"cal"},["L","M","X","J","V","S","D"].map(t=>el("div",{class:"cal-h",text:t})).concat(celdas)),
      el("p",{class:"hint",text:"Toca un día para cambiarlo: 3 relevos → sin noche → 1 relevo → no trabaja. Por defecto los viernes van sin noche y el fin de semana no se trabaja."+(fies?" Este mes hay "+fies+" día(s) laborable(s) marcados sin trabajo.":"")+" La previsión gasta en cada día según los relevos que se trabajan."})])]);
}
const eur=n=>(Math.round((n||0)*100)/100).toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
const nomMes=mes=>{const[y,mo]=mes.split("-");return["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][+mo-1]+" "+y;};
const etiqLinea=k=>{const[n,m]=k.split("|");return n+" · "+MAT[m].nom;};

function vPlan(){
  const m=mesPlan(),PL=plmes(),bl=bloques(),B=bl.B,S=bl.S;
  const provs=(cfg.proveedores||[]).slice().sort((a,b)=>a.localeCompare(b,"es"));
  const selMes=el("select",{id:"p-mes",onchange:e=>{planMes=e.target.value;render();}},
    [0,1,2,-1,-2].map(k=>{const[y,mo]=mesDe(hoy()).split("-").map(Number);const d=new Date(y,mo-1+k,1);
      const v=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
      const o=el("option",{value:v,text:nomMes(v)});if(v===m)o.selected=true;return o;}));

  /* --- valor del stock --- */
  let vTot=0,vNave=0,vExt=0;const vPorNave={};
  NAVES.forEach(n=>vPorNave[n]=0);
  lotes.forEach(l=>{const s=S[l.id];if(!s)return;const v=(s.kg/1000)*precioLote(l);
    vTot+=v;vPorNave[l.nave]=(vPorNave[l.nave]||0)+v;if(l.donde==="externo")vExt+=v;else vNave+=v;});
  const sinPrecio=lotes.filter(l=>{const s=S[l.id];return s&&s.kg>0&&!precioLote(l);});

  /* --- camiones contratados --- */
  const cams=PL.camiones,totCam=cams.reduce((a,c)=>a+(c.n||0),0);
  const totEur=cams.reduce((a,c)=>a+(c.n||0)*(KG_CAM/1000)*precioDe(m,c.p,c.m).v,0);
  const filasC=cams.map((c,idx)=>el("tr",{},[
    el("td",{},[el("span",{class:"tagm",style:"background:"+(MAT[c.m]?MAT[c.m].col:"var(--mut)")}),document.createTextNode(c.p||"—"),
      el("div",{class:"sub",text:MAT[c.m]?MAT[c.m].nom:c.m})]),
    el("td",{},[el("input",{class:"num",type:"text",min:"0",step:"1",inputmode:"numeric",style:"font-size:15px;padding:7px 9px",value:c.n||0,
      onchange:async e=>{const v=parseInt(e.target.value,10);const nc=cams.slice();nc[idx]=Object.assign({},c,{n:isNaN(v)?0:v});
        try{await setPlan({camiones:nc});}catch(err){toast("No se pudo guardar");}}})]),
    el("td",{class:"r num",text:fmt((c.n||0)*KG_CAM/1000)+" Ton"}),
    el("td",{class:"r num",text:eur((c.n||0)*(KG_CAM/1000)*precioDe(m,c.p,c.m).v)}),
    el("td",{class:"r"},[el("button",{class:"btn sec",type:"button",style:"font-size:13px;padding:5px 10px",text:"Quitar",onclick:async()=>{
      try{await setPlan({camiones:cams.filter((_,i)=>i!==idx)});toast("Quitado");}catch(err){toast("No se pudo");}}})])
  ]));
  const nc=draft.plan;
  const addCam=el("form",{onsubmit:async e=>{e.preventDefault();if(!nc.p||!nc.m||!(parseInt(nc.n,10)>0))return;
    try{await setPlan({camiones:cams.concat([{p:nc.p,m:nc.m,n:parseInt(nc.n,10)}])});draft.plan={p:nc.p,m:nc.m,n:""};toast("Añadido");render();}catch(err){toast("No se pudo guardar");}}},[
    el("div",{class:"row"},[
      el("label",{text:"Proveedor"},[el("select",{id:"pc-p",onchange:e=>{nc.p=e.target.value;render();}},
        [el("option",{value:"",text:"—"})].concat(provs.map(p=>{const o=el("option",{value:p,text:p});if(nc.p===p)o.selected=true;return o;})))]),
      el("label",{text:"Aleación"},[el("select",{id:"pc-m",onchange:e=>{nc.m=e.target.value;render();}},
        [el("option",{value:"",text:"—"})].concat(Object.keys(MAT).map(k=>{const o=el("option",{value:k,text:MAT[k].nom});if(nc.m===k)o.selected=true;return o;})))]),
      el("label",{text:"Camiones"},[el("input",{id:"pc-n",class:"num",type:"text",min:"1",step:"1",inputmode:"numeric",value:nc.n||"",oninput:e=>{nc.n=e.target.value;render();}})])
    ]),
    el("button",{class:"btn sec",type:"submit",text:"Añadir al plan",disabled:(nc.p&&nc.m&&parseInt(nc.n,10)>0)?null:"disabled"})
  ]);

  /* --- entradas previstas: camiones colocados en el calendario y traídas del externo --- */
  const ents=PL.entradas.slice().sort((a,b)=>(a.f||"").localeCompare(b.f||""));
  const colocados=ents.filter(x=>x.o!=="B").length;
  const MC=mediaCamion("L-2630"),faDef=String(Math.round(MC.fa));const ne=draft.ent2;if(!ne.fa)ne.fa=faDef;if(!ne.o)ne.o="C";
  const bpPlan={};ents.forEach(x=>{if(x.o==="B"&&x.k)bpPlan[x.k]=(bpPlan[x.k]||0)+x.fa;});
  const faExt=k=>{const[n,mm]=k.split("|");return B[key(n,mm)].faE;};
  /* El material del almacén externo ya está facturado a su nave: un BP sólo
     puede entrar en esa nave. Los camiones del proveedor sí se pueden desviar. */
  const lineasBP=LINEAS.filter(([n,mm])=>B[key(n,mm)].faE>0).map(([n,mm])=>key(n,mm));
  const opcDestino=(o,actual)=>{
    if(o==="B"){const ks=lineasBP.slice();if(actual&&ks.indexOf(actual)<0)ks.push(actual);
      return ks.map(k=>{const op=el("option",{value:k,text:etiqLinea(k)});if(actual===k)op.selected=true;return op;});}
    return [el("option",{value:"",text:"Por decidir"})].concat(LINEAS.map(([n,mm])=>{const k=key(n,mm);
      const op=el("option",{value:k,text:etiqLinea(k)});if(actual===k)op.selected=true;return op;}));};
  const addEnt=el("form",{onsubmit:async e=>{e.preventDefault();
    const fa=parseInt(ne.fa,10);if(!ne.f||!(fa>0))return;
    try{await setPlan({entradas:ents.concat([{f:ne.f,k:ne.k||"",fa:fa,o:ne.o}])});
      draft.ent2={f:ne.f,k:ne.k,fa:faDef,o:ne.o};toast("Añadida");render();}catch(err){toast("No se pudo guardar");}}},[
    el("div",{class:"row"},[
      el("label",{text:"Día"},[el("input",{id:"pe-f",type:"date",value:ne.f||"",onchange:e=>{ne.f=e.target.value;render();}})]),
      el("label",{text:"Destino"},[el("select",{id:"pe-k",onchange:e=>{ne.k=e.target.value;render();}},opcDestino(ne.o,ne.k))]),
      el("label",{text:"Fardos"},[el("input",{id:"pe-fa",class:"num",type:"text",min:"1",step:"1",inputmode:"numeric",value:ne.fa,oninput:e=>{ne.fa=e.target.value;render();}})])
    ]),
    el("label",{text:"De dónde viene"},[el("div",{class:"seg"},[["C","Camión del proveedor"],["B","Del almacén externo (BP)"]].map(([v,t])=>
      el("button",{type:"button","aria-pressed":String(ne.o===v),text:t,onclick:()=>{ne.o=v;if(v==="B"&&(!ne.k||lineasBP.indexOf(ne.k)<0))ne.k=lineasBP[0]||"";render();}})))]),
    ne.o==="B"?(lineasBP.length?el("p",{class:"hint",text:"El material del externo ya está facturado a su nave, así que sólo puede entrar ahí. Disponibles ahora: "+lineasBP.map(k=>etiqLinea(k)+" "+fmt(faExt(k))+" f").join(" · ")+"."}):el("div",{class:"banner w",text:"No hay nada en el almacén externo que traer."})):null,
    (ne.o==="B"&&ne.k&&parseInt(ne.fa,10)>0&&(bpPlan[ne.k]||0)+parseInt(ne.fa,10)>faExt(ne.k))?
      el("div",{class:"banner b",text:"Te pasas: en el externo hay "+fmt(faExt(ne.k))+" fardos de "+etiqLinea(ne.k)+" y con esta llevarías "+fmt((bpPlan[ne.k]||0)+parseInt(ne.fa,10))+" planificados."}):null,
    el("button",{class:"btn sec",type:"submit",text:"Añadir al calendario",disabled:(ne.f&&parseInt(ne.fa,10)>0&&(ne.o!=="B"||ne.k))?null:"disabled"})
  ]);
  /* qué línea aguanta menos: es donde conviene meter un camión que esté por decidir */
  const PM=primerEvMaq()?prevision():null,base=k=>PM&&PM.lineas[k]?Math.round(PM.lineas[k].dia*10)/10:B[k].medio;
  const urgencia=LINEAS.map(([n,mm])=>{const k=key(n,mm),c=(PL.consumo[k]!=null?PL.consumo[k]:base(k));
      return{k,dias:c>0?Math.round(B[k].faN/c):null};})
    .filter(x=>x.dias!=null).sort((a,b)=>a.dias-b.dias);
  const sinAsignar=ents.filter(x=>!x.k).length;
  const filasE=ents.map((x,idx)=>el("tr",{},[
    el("td",{class:"num",text:dmy(x.f)}),
    el("td",{},[el("select",{style:"font-size:14px;padding:6px 8px",onchange:async e=>{
        const ne2=ents.slice();ne2[idx]=Object.assign({},x,{k:e.target.value});
        try{await setPlan({entradas:ne2});toast(e.target.value?"Movida a "+etiqLinea(e.target.value):"Queda sin asignar");}catch(err){toast("No se pudo guardar");}}},
      opcDestino(x.o,x.k)),
      x.o==="B"?el("div",{class:"sub",text:"fijo: ya facturado a esa nave"}):null]),
    el("td",{},[x.o==="B"?el("span",{class:"pill warn",text:"BP externo"}):el("span",{class:"pill "+(x.extra?"bad":"ok"),text:x.extra?"Camión extra":"Camión"}),x.p?el("div",{class:"sub",text:x.p}):null]),
    el("td",{class:"r"},x.rec?[el("span",{class:"num",text:"+"+fmt(x.fa)})]:[
      el("input",{class:"num",type:"text",inputmode:"numeric","aria-label":"Fardos previstos",value:String(x.fa),style:"width:64px;font-size:14px;padding:5px 7px;text-align:right",
        onchange:async e=>{const v=parseInt(e.target.value,10);if(!(v>0)){e.target.value=x.fa;return;}const ne2=ents.slice();ne2[idx]=Object.assign({},x,{fa:v});
          try{await setPlan({entradas:ne2});toast("Fardos cambiados");}catch(err){toast("No se pudo guardar");}}}),
      (()=>{const mm=x.k?x.k.split("|")[1]:"L-2630",mc=mediaCamion(mm);return (x.o!=="B"&&mc.n&&Math.abs(x.fa-mc.fa)>=2)?el("div",{class:"sub",text:"media real "+Math.round(mc.fa)+" f"}):null;})()]),
    el("td",{class:"r acc"},[
      x.rec?el("span",{},[el("span",{class:"pill ok",text:x.o==="B"?(x.rec.parte?"Traído "+(x.rec.f?dmy(x.rec.f):""):"Traído"):"Recibido"+(x.rec.f?" "+dmy(x.rec.f):"")}),
          (x.rec.k&&x.k&&x.rec.k!==x.k)?el("div",{class:"sub",text:"desviado a "+etiqLinea(x.rec.k)}):null]):
        el("span",{},[x.f<hoy()?el("span",{class:"pill bad",style:"margin-right:6px",text:"Retrasado"}):null,
          x.o==="B"?el("button",{class:"btn sec",type:"button",style:"font-size:13px;padding:5px 10px",text:"Traído",onclick:async()=>{
              if(!(await confirmar("¿Marcar como traído el BP del "+dmy(x.f)+"?\n\nEl traslado de fardos se hace en Lotes → «Traer a nave». Esto sólo lo quita de la previsión.",{titulo:"BP traído",ok:"Marcar"})))return;
              try{await marcarPlan(Object.assign({mes:m},x),{f:hoy()});toast("Marcado como traído");}catch(err){toast("No se pudo");}}}):null,
          x.o==="B"?el("button",{class:"btn",type:"button",style:"font-size:13px;padding:5px 10px;margin-left:6px",text:"Traído en parte",onclick:()=>bpEnParte(x,m)}):
            el("button",{class:"btn",type:"button",style:"font-size:13px;padding:5px 10px",text:"Ha llegado",onclick:()=>llegaCamion(Object.assign({mes:m},x))})]),
      el("button",{class:"btn sec",type:"button",style:"font-size:13px;padding:5px 10px",text:"Quitar",onclick:async()=>{
      try{await setPlan({entradas:ents.filter((_,i)=>i!==idx)});toast("Quitada");}catch(err){toast("No se pudo");}}})])
  ]));

  /* --- consumo previsto por línea --- */
  const cons={};LINEAS.forEach(([n,mm])=>{const k=key(n,mm);
    cons[k]=PL.consumo[k]!=null?PL.consumo[k]:base(k);});
  const filasCon=LINEAS.map(([n,mm])=>{const k=key(n,mm),real=B[k].medio;
    return el("tr",{},[
      el("td",{},[el("span",{class:"tagm",style:"background:"+MAT[mm].col}),document.createTextNode(etiqLinea(k))]),
      el("td",{},[el("input",{class:"num",type:"text",min:"0",step:"0.1",inputmode:"decimal",style:"font-size:15px;padding:7px 9px",
        value:PL.consumo[k]!=null?PL.consumo[k]:"",placeholder:String(base(k)).replace(".",","),
        onchange:async e=>{const v=numES(e.target.value),c=Object.assign({},PL.consumo);
          if(isNaN(v))delete c[k];else c[k]=v;try{await setPlan({consumo:c});toast("Guardado");}catch(err){toast("No se pudo guardar");}}})]),
      el("td",{class:"r num sub",text:real.toLocaleString("es-ES")})
    ]);});

  /* --- proyección: sólo lo que hay en fábrica --- */
  const dh=diasHabiles(m).filter(d=>d>=hoy());const frac=d=>relevosDia(d)/3;const SIp=stockInicio(m,cons,B);
  const proy=LINEAS.map(([n,mm])=>{
    const k=key(n,mm);let f=SIp.ini[k];const filas=[];let corte=null;
    dh.forEach(d=>{
      const dia=ents.filter(x=>x.f===d&&x.k===k&&!x.rec);
      const ent=dia.reduce((a,x)=>a+x.fa,0),bp=dia.some(x=>x.o==="B");
      const con=Math.round((cons[k]||0)*frac(d)*10)/10,ini=f;f=f+ent-con;
      if(corte===null&&f<0)corte=d;
      filas.push({d,ini,ent,bp,con,rel:relevosDia(d),fin:Math.round(f*10)/10});
    });
    return{k,nave:n,mat:mm,filas,corte,ini:Math.round(SIp.ini[k]),ext:SIp.ext[k]};
  }).filter(p=>p.ini>0||p.ext>0||p.filas.some(f=>f.ent>0));

  return [
    el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Plan del mes"}),el("div",{style:"margin-left:auto;min-width:175px"},[selMes])])]),
    calendarioCard(m),
    el("div",{class:"banner",style:"display:flex;gap:10px;align-items:center;flex-wrap:wrap"},[el("span",{style:"flex:1",text:"Los precios del aluminio por proveedor se meten en la pestaña Precios."}),
      el("button",{type:"button",class:"btn sec peq",text:"Ir a Precios",onclick:()=>{tab="precios";precMes=m;try{localStorage.setItem("colada.tab",tab);}catch(e){}tabsUI();render();}})]),
    el("div",{class:"card"},[
      el("div",{class:"hd"},[el("h2",{text:"Valor del stock"}),el("span",{class:"num",style:"margin-left:auto;font-weight:600",text:eur(vTot)})]),
      el("div",{class:"tw"},[el("table",{},[el("tbody",{},
        NAVES.map(n=>el("tr",{},[el("td",{text:n}),el("td",{class:"r num",text:eur(vPorNave[n]||0)})]))
        .concat([el("tr",{},[el("td",{class:"sub",text:"En las naves"}),el("td",{class:"r num sub",text:eur(vNave)})]),
                 el("tr",{},[el("td",{class:"sub",text:"En el almacén externo"}),el("td",{class:"r num sub",text:eur(vExt)})])]))])]),
      sinPrecio.length?el("div",{class:"bd"},[el("div",{class:"banner w",text:sinPrecio.length+" colada(s) sin precio este mes: "+sinPrecio.slice(0,4).map(l=>l.nombre+(l.proveedor?" ("+l.proveedor+")":" (sin proveedor)")).join(", ")+(sinPrecio.length>4?"…":"")+". No suman al valor."})]):null
    ]),
    el("div",{class:"card"},[
      el("div",{class:"hd"},[el("h2",{text:"Camiones contratados"}),el("span",{class:"num",style:"margin-left:auto",text:totCam+" camiones · "+fmt(totCam*KG_CAM/1000)+" Ton · "+eur(totEur)})]),
      cams.length?el("div",{class:"tw"},[el("table",{},[
        el("thead",{},[el("tr",{},[el("th",{text:"Proveedor"}),el("th",{text:"Camiones"}),el("th",{class:"r",text:"Toneladas"}),el("th",{class:"r",text:"Importe"}),el("th",{})])]),
        el("tbody",{},filasC)])]):el("div",{class:"empty",text:"Todavía no has metido el plan de este mes."}),
      el("div",{class:"bd"},[addCam])
    ]),
    el("div",{class:"card"},[
      el("div",{class:"hd"},[el("h2",{text:"Calendario de entradas"}),
        el("span",{class:"sub",style:"margin-left:auto",text:colocados+" de "+totCam+" camiones colocados"+(sinAsignar?" · "+sinAsignar+" por decidir":"")})]),
      el("div",{class:"bd",style:"display:flex;gap:8px;flex-wrap:wrap;padding-bottom:0"},[
        el("button",{type:"button",class:"btn",text:"Completar plan automáticamente",onclick:()=>verPropuesta(m,cons,B,false)}),
        el("button",{type:"button",class:"btn sec",text:"Rehacer desde mañana",onclick:()=>verPropuesta(m,cons,B,true)})]),
      ents.length?el("div",{class:"tw"},[el("table",{class:"plan-ent"},[
        el("thead",{},[el("tr",{},[el("th",{text:"Día"}),el("th",{text:"Destino"}),el("th",{text:"Origen"}),el("th",{class:"r",text:"Fardos"}),el("th",{})])]),
        el("tbody",{},filasE)])]):el("div",{class:"empty",text:"Sin entradas colocadas. La proyección sólo restará consumo."}),
      urgencia.length?el("div",{class:"bd"},[el("div",{class:"banner "+(urgencia[0].dias<=5?"b":"w"),
        text:(sinAsignar?"Tienes "+sinAsignar+" llegada(s) por decidir. ":"")+"La que antes se queda corta es "+etiqLinea(urgencia[0].k)+": "+urgencia[0].dias+" día"+(urgencia[0].dias===1?"":"s")+" de material en fábrica"+(urgencia[1]?", seguida de "+etiqLinea(urgencia[1].k)+" con "+urgencia[1].dias:"")+"."})]):null,
      el("div",{class:"bd"},[addEnt,el("p",{class:"hint",text:(MC.n?"Un camión trae de media "+(Math.round(MC.fa*10)/10).toLocaleString("es-ES")+" fardos ("+fmt(MC.kg)+" kg), según los "+MC.n+" camiones registrados; se afina con cada entrada.":"Un camión son "+FA_CAM+" fardos de media ("+fmt(KG_CAM)+" kg).")+" Puedes dejar el destino en «Por decidir» y asignarlo el día que llegue: hasta entonces no cuenta en ninguna proyección. Marca «Del almacén externo» los días que en el planning ponga BP."})])
    ]),
    el("div",{class:"card"},[
      el("div",{class:"hd"},[el("h2",{text:"Consumo previsto por día"})]),
      el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},[el("th",{text:"Línea"}),el("th",{text:"Fardos/día"}),el("th",{class:"r",text:"Real medido"})])]),el("tbody",{},filasCon)])]),
      el("div",{class:"bd"},[el("p",{class:"hint",text:(PM?"En blanco usa la previsión según las máquinas en marcha (pestaña Stock). ":"En blanco usa el consumo real medido. ")+"Escribe un número para forzar el de la previsión."})])
    ]),
    pedidoCard(m,cons,B)
  ].concat(proy.map(p=>el("div",{class:"card"},[
    el("div",{class:"hd"},[el("span",{class:"tagm",style:"background:"+MAT[p.mat].col}),el("h2",{text:etiqLinea(p.k)}),
      p.corte?el("span",{class:"pill bad",style:"margin-left:auto",text:"Se acaba el "+dmy(p.corte)}):el("span",{class:"pill ok",style:"margin-left:auto",text:"Llega a fin de mes"})]),
    el("div",{class:"gh"},[el("span",{text:"Empieza con "+fmt(p.ini)+" fardos en fábrica"}),
      el("span",{class:"num",text:p.ext?fmt(p.ext)+" fardos esperando en el externo":"nada en el externo"})]),
    p.filas.length?el("div",{class:"tw"},[el("table",{},[
      el("thead",{},[el("tr",{},[el("th",{text:"Día"}),el("th",{class:"r",text:"Empieza"}),el("th",{class:"r",text:"Entra"}),el("th",{class:"r",text:"Gasta"}),el("th",{class:"r",text:"Queda"})])]),
      el("tbody",{},p.filas.map(f=>el("tr",{},[
        el("td",{class:"num"},[document.createTextNode(diaSem(f.d)+" "+dmy(f.d)),f.rel<3?el("div",{class:"sub",text:f.rel===2?"sin noche":f.rel+" relevo"}):null]),
        el("td",{class:"r num",text:fmt(f.ini)}),
        el("td",{class:"r num"},[f.ent?document.createTextNode("+"+fmt(f.ent)):document.createTextNode("—"),f.bp?el("span",{class:"pill warn",style:"margin-left:6px",text:"BP"}):null]),
        el("td",{class:"r num",text:"−"+f.con.toLocaleString("es-ES")}),
        el("td",{class:"r num",style:f.fin<0?"color:var(--bad);font-weight:600":"",text:f.fin.toLocaleString("es-ES")})
      ])))])]):el("div",{class:"empty",text:"No quedan días hábiles este mes."})
  ])));
}
/* Stock con el que empieza un mes futuro: lo de hoy + lo que falta por llegar
   de los planes hasta entonces − el consumo previsto de esos días (nunca por
   debajo de 0). Para el mes en curso es el stock de hoy. También el externo
   que queda libre quitando las BP planificadas antes. */
function pendPlan(){const out=[];Object.keys(cfg.plan||{}).forEach(mm=>((cfg.plan[mm]||{}).entradas||[]).forEach(x=>{if(!x.rec&&x.k)out.push(x);}));return out;}
function stockInicio(m,cons,B){
  const h=hoy(),d1=m+"-01",ini={},ext={},pend=pendPlan().map(x=>x.f<h?Object.assign({},x,{f:h}):x);
  LINEAS.forEach(([n,mm])=>{const k=key(n,mm);ini[k]=B[k].faN;ext[k]=B[k].faE;});
  if(d1<=h)return{ini,ext,futuro:false};
  for(let d=h;d<d1;d=diaSig(d)){
    pend.filter(x=>x.f===d).forEach(x=>{if(ini[x.k]!=null)ini[x.k]+=x.fa;if(x.o==="B"&&ext[x.k]!=null)ext[x.k]=Math.max(0,ext[x.k]-x.fa);});
    Object.keys(ini).forEach(k=>{ini[k]=Math.max(0,ini[k]-(cons[k]||0)*relevosDia(d)/3);});}
  Object.keys(ini).forEach(k=>ini[k]=Math.round(ini[k]*10)/10);
  return{ini,ext,futuro:true};
}

/* ===== PRESUPUESTO DE GASTO POR MES =====
   Se pone cuánto se quiere gastar al mes en cada familia (pistones, reparación de ejes, aceites…) y la app dice
   cómo va el mes: lo gastado, el % del presupuesto y la previsión a fin de mes al ritmo que llevamos.
   El gasto es el de los consumos apuntados en la app al precio del catálogo (lo mismo que «cuánto hemos gastado»).
   No toca SAP ni los pedidos. Se guarda en el catálogo: cat.presu = {familia: euros al mes}. */
function presuMeses(h,n){const out=[];let d=h.slice(0,7)+"-01";for(let i=0;i<n;i++){d=sumaDias(d,-1).slice(0,7)+"-01";out.push(d.slice(0,7));}return out;}
function presuDatos(h){h=h||hoy();const mes=h.slice(0,7),d1=mes+"-01",dd=+h.slice(8,10),dm=+finMes(d1).slice(8,10);
  const EV=evTodo(),P=cat.presu||{},G={},M3={},prev=presuMeses(h,3);
  EV.forEach(e=>{if(!e.f||!e.eur)return;const fam=e.fam||"Otros";if(e.f>=d1&&e.f<=h)G[fam]=(G[fam]||0)+e.eur;
    const m=e.f.slice(0,7);if(prev.includes(m))M3[fam]=(M3[fam]||0)+e.eur/3;});
  const fams=[...new Set(Object.keys(P).filter(k=>+P[k]>0).concat(Object.keys(G)).concat(Object.keys(M3)))];
  const L=fams.map(fam=>{const g=G[fam]||0,p=+P[fam]||0,pr=dd?g/dd*dm:g;return{fam,g,p,pr,media:M3[fam]||0,pct:p?g/p*100:null,
    niv:!p?"":g>p?"bad":dd>=7&&pr>p*1.05?"warn":"ok"};}).sort((a,b)=>(b.p>0)-(a.p>0)||b.p-a.p||b.g-a.g);
  const C=L.filter(x=>x.p>0),tot={g:C.reduce((s,x)=>s+x.g,0),p:C.reduce((s,x)=>s+x.p,0)};tot.pr=dd?tot.g/dd*dm:tot.g;
  return{mes,dd,dm,L,C,tot,hay:C.length>0};}
/* avisos para «Qué hacer hoy» */
function presuAvisos(){try{const D=presuDatos();if(!D.hay)return[];const out=[];
  const pas=D.C.filter(x=>x.niv==="bad"),van=D.C.filter(x=>x.niv==="warn");
  if(pas.length)out.push({niv:"bad",txt:"Presupuesto superado en "+pas.map(x=>x.fam.toLowerCase()).join(", "),det:pas.map(x=>x.fam+": "+eur(x.g)+" de "+eur(x.p)).join(" · ")});
  if(van.length)out.push({niv:"warn",txt:"Al ritmo de este mes te pasarás del presupuesto en "+van.map(x=>x.fam.toLowerCase()).join(", "),det:van.map(x=>x.fam+": previsión "+eur(Math.round(x.pr))+" de "+eur(x.p)).join(" · ")});
  return out;}catch(e){return[];}}
function presuBarra(x,dd,dm){const w=x.p?Math.min(100,x.g/x.p*100):0,hoyP=dd/dm*100;
  return el("div",{class:"pre-b",title:"La raya marca dónde deberías ir hoy si gastas lo mismo cada día"},[el("div",{class:"pre-f "+x.niv,style:"width:"+w+"%"}),el("span",{class:"pre-hoy",style:"left:"+hoyP+"%"})]);}
function cardPresupuesto(){let D;try{D=presuDatos();}catch(e){return null;}const puede=!window.SOLO_CONSULTA;
  const btn=puede?el("button",{type:"button",class:"btn peq"+(D.hay?" sec":""),text:D.hay?"Cambiar presupuesto":"Poner presupuesto",onclick:editarPresupuesto}):null;
  const hd=el("div",{class:"hd"},[el("h2",{text:"Presupuesto del mes"}),el("span",{class:"der sub",text:D.hay?eur(Math.round(D.tot.g))+" de "+eur(D.tot.p)+" · "+Math.round(D.tot.g/D.tot.p*100)+" %":"sin poner"})]);
  if(!D.hay)return el("section",{class:"card",id:"presu"},[hd,el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[
    el("p",{class:"hint",style:"margin:0",text:"Pon cuánto quieres gastar al mes en pistones, ejes, aceites… y la app te dirá cómo vas y te avisará si a este ritmo te vas a pasar."}),btn])]);
  const fila=x=>el("div",{class:"pre-it"},[el("div",{class:"pre-t"},[el("b",{text:x.fam}),el("span",{class:"num",text:eur(Math.round(x.g))+(x.p?" de "+eur(x.p):"")}),
      x.p?el("span",{class:"pill "+(x.niv==="ok"?"ok":x.niv),text:Math.round(x.pct)+" %"}):el("span",{class:"sub",text:"sin presupuesto"})]),
    x.p?presuBarra(x,D.dd,D.dm):null,
    x.p?el("div",{class:"sub",text:x.niv==="bad"?"Ya te has pasado en "+eur(Math.round(x.g-x.p))+".":"Previsión a fin de mes: "+eur(Math.round(x.pr))+(x.niv==="warn"?" · te pasarías en "+eur(Math.round(x.pr-x.p)):" · vas bien")}):null]);
  const T=D.tot,nT=T.g>T.p?"bad":D.dd>=7&&T.pr>T.p*1.05?"warn":"ok";
  return el("section",{class:"card"+(D.C.some(x=>x.niv==="bad")?" alerta":""),id:"presu"},[hd,el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:14px"},[
    el("div",{class:"sub",text:cap(nomMes(D.mes))+" · día "+D.dd+" de "+D.dm}),
    el("div",{class:"pre-it pre-tot"},[el("div",{class:"pre-t"},[el("b",{text:"Total"}),el("span",{class:"num",text:eur(Math.round(T.g))+" de "+eur(T.p)}),el("span",{class:"pill "+nT,text:Math.round(T.g/T.p*100)+" %"})]),
      presuBarra(Object.assign({niv:nT},T),D.dd,D.dm),el("div",{class:"sub",text:"Previsión a fin de mes: "+eur(Math.round(T.pr))})]),
    el("div",{class:"pre-lst"},D.L.filter(x=>x.p||x.g).map(fila)),
    el("p",{class:"hint",style:"margin:0",text:"Gasto de los consumos apuntados en la app, al precio del catálogo. La raya de cada barra marca dónde deberías ir hoy si gastas lo mismo cada día."}),btn])]);}
function editarPresupuesto(){let D;try{D=presuDatos();}catch(e){toast("No se pudo calcular el gasto");return;}const P=cat.presu||{};
  const fams=[...new Set(Object.keys(P).concat(D.L.map(x=>x.fam)))].sort((a,b)=>((D.L.find(x=>x.fam===b)||{}).media||0)-((D.L.find(x=>x.fam===a)||{}).media||0));
  const ins={};const filas=fams.map(f=>{const x=D.L.find(y=>y.fam===f)||{media:0};const i=el("input",{type:"number",inputmode:"decimal",min:"0",step:"10",class:"num","aria-label":"Presupuesto de "+f,placeholder:"—",value:+P[f]>0?String(P[f]):null});ins[f]=i;
    return el("div",{class:"pre-ed"},[el("span",{},[el("b",{text:f}),el("small",{text:x.media?"media últimos 3 meses: "+eur(Math.round(x.media))+"/mes":"sin gasto los últimos 3 meses"})]),el("span",{class:"pre-ed-i"},[i,el("span",{text:"€/mes"})])]);});
  dlg("Presupuesto de gasto al mes",[el("p",{class:"hint",text:"Pon cuánto quieres gastar cada mes en cada familia. Déjalo vacío si no quieres presupuesto para esa familia. Como referencia sale lo que se ha gastado de media los últimos 3 meses."}),
    el("div",{class:"pre-eds"},filas)],[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const N={};fams.forEach(f=>{const v=parseN(ins[f].value);if(v>0)N[f]=Math.round(v*100)/100;});
      const ant=cat.presu;cat.presu=N;try{await saveCat();}catch(e){cat.presu=ant;return false;}toast("Presupuesto guardado");render(true);}}]);}

/* ---------- Buscador: preguntas de dinero, comparar, lo que falta, planificación, coladas y máquinas ----------
   intencionC(q) reconoce la pregunta y pintaIntencion(E,res,pon) escribe la respuesta: primero una frase y debajo el detalle. */
const NAVE_RE=/\bnave\s*(1|2|uno|dos)\b/,AL9_RE=/\b(alsi\s*9|l-?2630|blanc[oa]s?)\b/,AL12_RE=/\b(alsi\s*12|l-?2521(-b)?|azul(es)?)\b/;
const naveQ=q=>{const m=q.match(NAVE_RE);return m?"Nave "+(m[1]==="uno"?"1":m[1]==="dos"?"2":m[1]):null;};
const matQ=q=>AL9_RE.test(q)?"L-2630":AL12_RE.test(q)?"L-2521-B":null;
const provQ=q=>(cfg.proveedores||[]).find(p=>reC(raizC(nqC(p))).test(" "+q+" "))||null;
const diaLargo=f=>{const d=new Date(+f.slice(0,4),+f.slice(5,7)-1,+f.slice(8,10));return d.toLocaleDateString("es-ES",{weekday:"long"})+" "+dmyA(f);};
const elDia=f=>f===hoy()?"hoy":f===diaSig(hoy())?"mañana ("+diaLargo(f)+")":"el "+diaLargo(f);
const pc=(a,b)=>b?Math.round((a-b)/b*100):null;
const eurE=v=>Math.round(v).toLocaleString("es-ES")+" €";
/* «el lunes», «el 12/10», «ayer», «hoy»: un día concreto (para máquinas) */
function diaQ(q){const h=hoy();if(/\bayer\b/.test(q))return diaAntes(h);if(/\bantes de ayer|anteayer\b/.test(q))return diaAntes(diaAntes(h));
  const ds=["domingo","lunes","martes","miercoles","jueves","viernes","sabado"],i=ds.findIndex(d=>new RegExp("\\b"+d+"\\b").test(q));
  if(i>=0){let f=h;for(let n=0;n<7;n++){if(new Date(+f.slice(0,4),+f.slice(5,7)-1,+f.slice(8,10)).getDay()===i)return f;f=diaAntes(f);}}
  const m=q.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);if(m){const y=m[3]?(m[3].length===2?"20"+m[3]:m[3]):h.slice(0,4);return y+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");}
  return h;}
function intencionC(q){const o={nave:naveQ(q),mat:matQ(q),prov:provQ(q),q};
  const M=(modo,x)=>Object.assign(o,{modo},x||{});
  /* lo que hay que revisar, todo junto */
  if(/\b(que (hay que|tengo que|falta) revisar|que va mal|algo mal|algun problema|problemas|avisos|que falla)\b/.test(q))return M("revisar");
  if(/\bnegativ\w*|\ben rojo\b|\bmenos de cero\b/.test(q))return M("negativo");
  if(/\b(no se (han|ha) apuntado|sin apuntar|falta(n)? (por )?apuntar|huecos?|que relevos? faltan?|relevos? sin)\b/.test(q))return M("huecos",{per:periodoC(q)});
  if(/\bsin albaran(es)?\b|\b(falta(n)?|quedan?) por completar\b|\bsin completar\b|\bpor completar\b|\balbaran(es)? pendientes?\b/.test(q))return M("sinalb");
  if(/\bminimos?\b/.test(q))return M("minimo");
  /* dinero */
  if(/\b(cuanto vale|valor de|valor del|valorad\w*|cuanto dinero hay)\b.*\b(stock|tengo|hay|almacen|externo|aluminio)\b|\bvalor del stock\b/.test(q))return M("valor");
  if(/\b(mas barat\w*|mas car[oa]s?|mejor precio|peor precio|precio mas bajo|precio mas alto)\b/.test(q))return M("barato",{sup:/car|peor|alto/.test(q)?"car":"bar"});
  if(/\b(costado|coste|costes|gastado en (euros|dinero)|cuanto dinero|euros)\b/.test(q)&&!/\bprecio\b/.test(q))return M("coste",{per:periodoC(q)});
  /* comparar */
  if(/\b(pesa|peso)\b.*\bfardos?\b|\bkg (por|cada|de cada) fardo\b|\bkilos (por|cada|de cada) fardo\b/.test(q))return M("peso");
  if(/\bcompar\w*\b|\bfrente al?\b|\brespecto (al?|del)\b|\bcontra el\b|\bvs\b|\bque el (mes|ano) pasado\b|\bque la semana pasada\b/.test(q))return M("comp",{tipo:/\b(entrad\w*|camion\w*)\b/.test(q)?"E":"C",sem:/\bsemana\b/.test(q)});
  /* planificación */
  if(/\bcuando (tengo|hay|tenemos|debo|debemos) que pedir\b|\bcuando pido\b|\bpedir (un |otro )?camion\b|\bcuando se (acaba|termina)\b|\bcuando me quedo sin\b|\bcuando (baja|bajo|bajamos) del minimo\b|\bcuando (necesito|hace falta) (un |otro )?camion\b/.test(q))return M("pedir");
  if(/\b(acabo|acabamos|termino|terminamos|cierro|cerramos|acabare|quedara|quedare|tendre) (el |a final de |al final del? )?mes\b|\bfin(al)? de(l)? mes\b|\bstock (final|al final)\b/.test(q))return M("finmes");
  if(/\bcuantos camiones\b|\bcamiones? (contratados|por traer|que quedan|que faltan|quedan|faltan)\b|\b(quedan|faltan) por traer\b/.test(q)&&!/\b(manana|hoy|pasado)\b/.test(q))return M("camq");
  /* coladas y externo */
  if(/\b(que|cual|cuales) coladas? (toca|tocan|hay que|tengo que|tenemos que|se debe|debo) (gastar|usar|consumir|meter|fundir)\b|\bsiguiente colada\b|\bcolada que toca\b|\bfifo\b|\bque toca gastar\b/.test(q))return M("fifo");
  if(/\b(cuanto tiempo|cuantos dias|desde cuando) (lleva|llevan|esta|estan)\b|\b(llevan|lleva) mas tiempo\b|\bmas antiguas?\b/.test(q)){const cod=lotes.find(l=>reC(nqC(l.nombre)).test(" "+q+" "));return M("antig",{lote:cod||null,ext:/\bexterno\b/.test(q)});}
  /* máquinas */
  const fm=q.match(/\bf\s?(\d{1,2})\b/);const maqCod=fm&&Object.values(MAQ).some(L=>L.includes("F"+fm[1]))?"F"+fm[1]:null;
  if(/\bmaquinas?\b|\binyectoras?\b|\bparad[oa]s?\b|\ben marcha\b|\bfuncionando\b/.test(q)||(maqCod&&/\b(esta|estaba|como|historial|cambios|lleva|parad|marcha)\b/.test(q)))
    return M("maq",{f:diaQ(q),u:/\bnoche\b/.test(q)?"Noche":/\btarde\b/.test(q)?"Tarde":/\b(relevo de |turno de |por la )manana\b/.test(q)?"Mañana":null,maqCod,
      que:/\bparad\w*\b|\bno funcionan?\b/.test(q)?"paradas":/\bcobre|granalla\b/.test(q)?"cobre":/\b(azul|alsi\s*12)\b/.test(q)?"azul":/\b(marcha|funcionando|trabajando)\b/.test(q)?"marcha":null});
  return null;}

/* ---------- simulación de los próximos días por línea (para fin de mes y «cuándo pedir») ---------- */
function simLineas(hasta){const {B}=bloques(),h=hoy(),PM=primerEvMaq()?prevision():null;
  const dia=k=>PM&&PM.lineas[k]?(PM.lineas[k].diaAhora!=null?PM.lineas[k].diaAhora:PM.lineas[k].dia):B[k].medio;
  const hoyC={};movs().forEach(r=>{if(r.t==="C"&&r.f===h){const l=lotes.find(x=>x.id===r.o);if(l){const k=key(l.nave,l.material);hoyC[k]=(hoyC[k]||0)+(r.fa||0);}}});
  const pend=[];Object.keys(cfg.plan||{}).forEach(mm=>((cfg.plan[mm]||{}).entradas||[]).forEach(x=>{if(!x.rec&&x.k&&x.f)pend.push(Object.assign({},x,{f:x.f<h?h:x.f}));}));
  const out={};LINEAS.forEach(([n,m])=>{const k=key(n,m),b=B[k];let faN=b.faN,faE=b.faE;const d=dia(k)||0,min=minimoDe(k),dias=[];
    for(let f=h;f<=hasta;f=diaSig(f)){pend.filter(x=>x.f===f&&x.k===k).forEach(x=>{faN+=x.fa;if(x.o==="B")faE=Math.max(0,faE-x.fa);});
      let g=d*relevosDia(f)/3;if(f===h)g=Math.max(0,g-(hoyC[k]||0));faN=Math.max(0,faN-g);dias.push({f,faN,faE,g});}
    out[k]={k,b,dia:d,min,dias,pend:pend.filter(x=>x.k===k)};});
  return out;}

function pintaIntencion(E,res,pon){const h=hoy(),S=saldos();
  const add=n=>{if(n)res.appendChild(n);return n;},frase=t=>add(el("p",{class:"bq-resp",text:t})),nota=t=>add(el("p",{class:"hint",text:t}));
  const ent=(t,extra)=>add(el("div",{class:"bq-ent"},[el("span",{class:"sub",text:"Buscando en "}),el("b",{text:t})].concat((extra||[]).filter(Boolean).map(x=>el("span",{class:"chip-sel on",text:x})))));
  const card=(tit,nodos,sub)=>add(el("div",{class:"card"},[tit?el("div",{class:"hd"},[el("h2",{text:tit}),sub?el("span",{class:"sub",style:"margin-left:auto",text:sub}):null]):null].concat(nodos)));
  const it=(t1,t2,der,der2,on)=>el(on?"button":"div",{type:on?"button":null,class:"bq-it",style:on?null:"cursor:default",onclick:on||null},[el("div",{class:"bq-p"},[el("b",{text:t1})].concat((Array.isArray(t2)?t2:[t2]).filter(Boolean).map(x=>el("span",{class:"sub",text:x})))),
    der!=null?el("div",{class:"bq-c num"},[el("b",{text:der}),der2?el("span",{class:"sub",text:der2}):null]):null]);
  const tabla=(cab,filas,der)=>el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},cab.map((c,i)=>el("th",{class:(der||[]).includes(i)?"r":"",text:c})))]),
    el("tbody",{},filas.map(f=>el("tr",{},f.map((c,i)=>el("td",{class:(der||[]).includes(i)?"r num":"","data-l":cab[i]},c&&c.nodeType?[c]:[document.createTextNode(c==null?"":String(c))])))))])]);
  const lineas=()=>LINEAS.filter(([n,m])=>(!E.nave||n===E.nave)&&(!E.mat||m===E.mat)).map(([n,m])=>key(n,m));
  const filtros=[E.nave,E.mat?MAT[E.mat].nom:null,E.prov];
  const irTab=t=>{tab=t;try{localStorage.setItem("colada.tab",t);}catch(e){}tabsUI();render();};
  const lnk=(t,fn)=>el("button",{type:"button",class:"btn sec",style:"margin-top:8px",text:t,onclick:fn});

  if(E.modo==="revisar"){ent("todo lo que hay que revisar");const {B}=bloques(),hu=huecos(),sa=sinAlbaran();
    const neg=lotes.filter(l=>S[l.id]&&(S[l.id].fa<0||S[l.id].kg<-1));const bajo=Object.keys(B).filter(k=>{const e=estado(B[k],(cfg.minimos||{})[k])[0];return e==="bad"||e==="warn";});
    const atras=[];Object.keys(cfg.plan||{}).forEach(mm=>((cfg.plan[mm]||{}).entradas||[]).forEach(x=>{if(!x.rec&&x.f&&x.f<h)atras.push(x);}));
    const nH=hu.reduce((a,d)=>a+d.falta.length,0);
    const L=[[nH,nH===1?"relevo sin apuntar":"relevos sin apuntar","relevos sin apuntar en los últimos 14 días","huecos"],[sa.length,sa.length===1?"entrada sin albarán":"entradas sin albarán","entradas por completar","sin albarán"],[bajo.length,bajo.length===1?"línea bajo o cerca del mínimo":"líneas bajo o cerca del mínimo","líneas bajo o cerca del mínimo","mínimos"],
      [neg.length,neg.length===1?"colada en negativo":"coladas en negativo","coladas en negativo","negativo"],[atras.length,"entradas planificadas de días pasados sin recibir","entradas planificadas sin recibir de días pasados","qué camiones tienen que entrar hoy"]];
    const malos=L.filter(x=>x[0]>0);frase(malos.length?"Hay "+malos.length+(malos.length===1?" cosa":" cosas")+" que revisar.":"Todo en orden: no hay huecos, entradas sin albarán, mínimos, negativos ni camiones atrasados.");
    card(null,[el("div",{class:"bq-lst"},L.map(x=>it((x[0]?x[0]+" ":"Sin ")+(x[0]?x[1]:x[2]),x[0]?"Toca para verlo":null,x[0]?"⚠":"✓",null,x[0]?()=>pon(x[3]):null)))]);return;}

  if(E.modo==="negativo"){ent("coladas y líneas en negativo");const {B}=bloques();const neg=lotes.filter(l=>S[l.id]&&(S[l.id].fa<0||S[l.id].kg<-1));const ln=Object.keys(B).filter(k=>B[k].fa<0||B[k].kg<0);
    frase(neg.length||ln.length?"Hay "+neg.length+(neg.length===1?" colada":" coladas")+" en negativo"+(ln.length?" y "+ln.length+(ln.length===1?" línea":" líneas")+" ("+ln.map(etiqLinea).join(", ")+")":"")+".":"No hay nada en negativo.");
    if(neg.length)card("Coladas en negativo",[el("div",{class:"bq-lst"},neg.map(l=>it(l.nombre,[l.nave+" · "+MAT[l.material].nom+" · "+(l.donde==="externo"?"externo":"nave"),"Toca para ver su historia y corregirla"],fmt(S[l.id].fa)+" fardos",fmt(S[l.id].kg)+" kg",()=>abrirFicha(l.id))))]);
    if(neg.length)nota("Suele ser un consumo apuntado en la colada equivocada o una entrada sin apuntar. Un recuento (pestaña Lotes) lo deja bien.");return;}

  if(E.modo==="huecos"){const hu=huecos().filter(d=>!E.per||(d.f>=E.per.d&&d.f<=E.per.h)).map(d=>Object.assign({},d,{falta:d.falta.filter(x=>!E.nave||x.n===E.nave)})).filter(d=>d.falta.length);
    ent("relevos sin apuntar",[E.per?E.per.t:"últimos 14 días",E.nave]);const n=hu.reduce((a,d)=>a+d.falta.length,0);
    frase(n?"Faltan por apuntar "+n+(n===1?" relevo":" relevos")+" en "+hu.length+(hu.length===1?" día.":" días."):"No falta ningún relevo por apuntar"+(E.per?" "+perTxt(E.per):" en los últimos 14 días")+".");
    if(n)card(null,[el("div",{class:"bq-lst"},hu.slice().reverse().map(d=>it(Mayus(diaLargo(d.f)),d.falta.map(x=>(x.g?"Granalla de cobre · ":"Aluminio · ")+x.n+" · "+x.t))))]);
    if(n)add(lnk("Apuntar en Consumo",()=>irTab("consumo")));
    nota("No cuentan los relevos marcados como paro ni los días sin trabajo del calendario. Si un relevo no se trabajó, márcalo como paro en Stock › Sin apuntar.");return;}

  if(E.modo==="sinalb"){const L=sinAlbaran();ent("entradas sin albarán");frase(L.length?"Hay "+L.length+(L.length===1?" entrada":" entradas")+" metidas sin albarán, con los kilos estimados.":"No hay ninguna entrada pendiente de completar.");
    if(L.length){card(null,[el("div",{class:"bq-lst"},L.map(({r,l})=>it(l.nombre,[diaLargo(r.f)+" · "+l.nave+" · "+MAT[l.material].nom,(l.proveedor||"Sin proveedor")+" · "+fmt(r.fa)+" fardos"],"≈ "+fmt(r.kg)+" kg","estimados",()=>abrirFicha(l.id))))]);add(lnk("Completarlas en Entrada",()=>irTab("entrada")));}return;}

  if(E.modo==="minimo"){const {B}=bloques();const ks=lineas().filter(k=>B[k].fa>0||minimoDe(k)>0);ent("mínimos",[E.nave,E.mat?MAT[E.mat].nom:null]);
    const est=ks.map(k=>({k,e:estado(B[k],(cfg.minimos||{})[k]),b:B[k],m:minimoDe(k)}));const mal=est.filter(x=>x.e[0]==="bad"),cerca=est.filter(x=>x.e[0]==="warn");
    frase(mal.length?"Bajo mínimo: "+mal.map(x=>etiqLinea(x.k)+" ("+fmt(x.b.faN)+" de "+fmt(x.m)+" fardos)").join(", ")+".":cerca.length?"Nada bajo mínimo, pero cerca: "+cerca.map(x=>etiqLinea(x.k)).join(", ")+".":"Ninguna línea está bajo mínimo ni cerca.");
    card(null,[el("div",{class:"bq-lst"},est.map(x=>it(etiqLinea(x.k),[x.m?"Mínimo "+fmt(x.m)+" fardos en nave":"Sin mínimo puesto",x.e[1]],fmt(x.b.faN)+" fardos","en nave · "+(x.e[0]==="bad"?"⚠ bajo":x.e[0]==="warn"?"cerca":"bien"))))]);nota("Los mínimos se cambian en Stock › Mínimos.");return;}

  if(E.modo==="valor"){const mes=mesDe(h);let tot=0,sin=0;const G={};
    lotes.forEach(l=>{const s=S[l.id];if(!s||!(s.kg>0))return;if(E.nave&&l.nave!==E.nave)return;if(E.mat&&l.material!==E.mat)return;if(E.prov&&nqC(l.proveedor||"")!==nqC(E.prov))return;if(/\bexterno\b/.test(E.q)&&l.donde!=="externo")return;
      const p=precioDe(mes,l.proveedor,l.material).v||precioMedio(mes,l.material).v;if(!p){sin+=s.kg;return;}const v=s.kg*p/1000;tot+=v;
      const k=l.nave+" · "+MAT[l.material].nom+(l.donde==="externo"?" · externo":" · en nave");const g=G[k]=G[k]||{v:0,kg:0};g.v+=v;g.kg+=s.kg;});
    ent("valor del stock",filtros.concat([/\bexterno\b/.test(E.q)?"externo":null]));frase("Lo que hay vale unos "+eurE(tot)+" a los precios de "+nomMes(mes)+".");
    card(null,[el("div",{class:"bq-lst"},Object.entries(G).sort((a,b)=>b[1].v-a[1].v).map(([k,g])=>it(k,fmt(g.kg)+" kg",eurE(g.v),null)))]);
    nota("Cada colada a su precio de proveedor del mes (si no lo tiene, la media del mes)."+(sin?" Sin precio: "+fmt(sin)+" kg, que no se han contado.":""));return;}

  if(E.modo==="barato"){const mes=mesDe(h);ent("precios de "+nomMes(mes));const mats=E.mat?[E.mat]:Object.keys(MAT);const blo=[];
    mats.forEach(m=>{const L=(cfg.proveedores||[]).map(p=>({p,pr:precioDe(mes,p,m)})).filter(x=>x.pr.v>0).sort((a,b)=>E.sup==="car"?b.pr.v-a.pr.v:a.pr.v-b.pr.v);if(!L.length)return;
      blo.push(MAT[m].nom+": "+(E.sup==="car"?"el más caro es ":"el más barato es ")+L[0].p+" ("+eurKg(L[0].pr.v)+" €/kg)"+(L[1]?", luego "+L[1].p+" ("+eurKg(L[1].pr.v)+")":""));
      card(MAT[m].nom,[el("div",{class:"bq-lst"},L.map((x,i)=>it(x.p,i?"+"+eurKg(Math.abs(x.pr.v-L[0].pr.v))+" €/kg que "+L[0].p:(E.sup==="car"?"el más caro":"el más barato"),eurKg(x.pr.v)+" €/kg",x.pr.m!==mes?"precio de "+nomMes(x.pr.m):null)))]);});
    if(!blo.length){frase("No hay precios puestos para "+nomMes(mes)+". Se meten en la pestaña Precios.");return;}
    res.insertBefore(el("p",{class:"bq-resp",text:blo.join(". ")+"."}),res.children[1]||null);
    const ahorro=(()=>{const L=(cfg.proveedores||[]).map(p=>precioDe(mes,p,"L-2630").v).filter(v=>v>0).sort((a,b)=>a-b);return L.length>1?(L[L.length-1]-L[0])*KG_CAM/1000:0;})();
    if(ahorro&&mats.includes("L-2630"))nota("Entre el más barato y el más caro de AlSi9 hay unos "+eurE(ahorro)+" por camión de "+fmt(KG_CAM/1000)+" t.");return;}

  if(E.modo==="coste"){const P=E.per||{d:mesDe(h)+"-01",h,t:"este mes"};const C=movs().filter(r=>r.t==="C"&&r.f&&r.f>=P.d&&r.f<=P.h);let tot=0,kgT=0,sin=0;const G={};
    C.forEach(r=>{const l=lotes.find(x=>x.id===r.o)||(r.h&&r.nv&&r.ml?{nave:r.nv,material:r.ml}:null);if(!l||!MAT[l.material])return;if(E.nave&&l.nave!==E.nave)return;if(E.mat&&l.material!==E.mat)return;const kg=Math.abs(kgAp(r,S)),p=precioMedio(r.f.slice(0,7),l.material).v;if(!p){sin+=kg;return;}
      const v=kg*p/1000;tot+=v;kgT+=kg;const k=l.nave+" · "+MAT[l.material].nom;const g=G[k]=G[k]||{v:0,kg:0};g.v+=v;g.kg+=kg;});
    ent("coste del aluminio consumido",[P.t,E.nave,E.mat?MAT[E.mat].nom:null]);
    frase(Mayus(perTxt(P))+" el aluminio consumido"+donde([E.nave?{t:nqC(E.nave)}:null,E.mat?{t:E.mat==="L-2630"?"alsi9":"alsi12"}:null].filter(Boolean))+" ha costado unos "+eurE(tot)+" ("+fmt(kgT)+" kg"+(kgT?", "+eurKg(tot/kgT*1000)+" €/kg de media":"")+").");
    if(Object.keys(G).length)card("Por línea",[el("div",{class:"bq-lst"},Object.entries(G).sort((a,b)=>b[1].v-a[1].v).map(([k,g])=>it(k,fmt(g.kg)+" kg · "+(tot?Math.round(g.v/tot*100):0)+" %",eurE(g.v),null)))]);
    nota("Se valora como en el cierre: cada mes al precio medio de lo que entró ese mes (si no entró nada, la media de la tarifa)."+(sin?" "+fmt(sin)+" kg sin precio no se han contado.":""));return;}

  if(E.modo==="peso"){const G={};todosMovs().forEach(r=>{if(r.t!=="E"||r.h||r.ke||r.sa||!(r.fa>0)||!(r.kg>0))return;const l=lotes.find(x=>x.id===r.d);if(!l)return;
      if(E.mat&&l.material!==E.mat)return;const p=l.proveedor||r.p||"Sin proveedor";if(E.prov&&nqC(p)!==nqC(E.prov))return;const k=p+"|"+l.material;const g=G[k]=G[k]||{p,m:l.material,kg:0,fa:0,n:0};g.kg+=r.kg;g.fa+=r.fa;g.n++;});
    const L=Object.values(G).sort((a,b)=>b.kg/b.fa-a.kg/a.fa);ent("peso de los fardos",[E.prov,E.mat?MAT[E.mat].nom:null]);
    if(!L.length){frase("No hay entradas con kilos y fardos para calcularlo.");return;}
    if(L.length===1)frase("Un fardo de "+L[0].p+" ("+MAT[L[0].m].nom+") pesa de media "+fmt(L[0].kg/L[0].fa)+" kg, según "+L[0].n+(L[0].n===1?" entrada.":" entradas."));
    else{const mx=L[0],mn=L[L.length-1];frase("Los fardos más pesados son los de "+mx.p+" ("+fmt(mx.kg/mx.fa)+" kg) y los más ligeros los de "+mn.p+" ("+fmt(mn.kg/mn.fa)+" kg).");}
    card(null,[el("div",{class:"bq-lst"},L.map(g=>it(g.p+" · "+MAT[g.m].nom,g.n+(g.n===1?" entrada":" entradas")+" · "+fmt(g.fa)+" fardos · "+fmt(g.kg/g.n)+" kg por camión",fmt(g.kg/g.fa)+" kg","por fardo")))]);
    nota("Solo entradas con albarán (kilos reales), sin las de kilos estimados.");return;}

  if(E.modo==="comp"){let P1=periodoC(E.q),P0;const sum=(d,hh)=>{const o={};let tot=0,fa=0;const dias=new Set();
      movs().forEach(r=>{if(r.t!==E.tipo||!r.f||r.f<d||r.f>hh)return;const l=lotes.find(x=>x.id===(r.o||r.d))||(r.h&&r.nv&&r.ml?{nave:r.nv,material:r.ml}:null);if(!l||!MAT[l.material])return;if(E.nave&&l.nave!==E.nave)return;if(E.mat&&l.material!==E.mat)return;
        const kg=Math.abs(kgAp(r,S)),k=l.nave+" · "+MAT[l.material].nom;o[k]=o[k]||{kg:0,fa:0};o[k].kg+=kg;o[k].fa+=r.fa||0;tot+=kg;fa+=r.fa||0;dias.add(r.f);});return{o,tot,fa,dias:dias.size};};
    if(E.sem&&!P1){const w=(new Date().getDay()+6)%7;P1={d:ymd(new Date(Date.now()-w*864e5)),h,t:"esta semana"};}
    if(!P1)P1={d:mesDe(h)+"-01",h,t:"este mes"};
    const len=Math.round((new Date(P1.h)-new Date(P1.d))/864e5);
    if(/^\d{4}-\d\d-01$/.test(P1.d)&&!E.sem){const y=+P1.d.slice(0,4),m=+P1.d.slice(5,7),a=m===1?y-1:y,b=m===1?12:m-1,mm=a+"-"+String(b).padStart(2,"0");P0={d:mm+"-01",h:finDeMes(mm),t:Mayus(nomMes(mm))};}
    else{const d0=new Date(P1.d);d0.setDate(d0.getDate()-len-1);const h0=new Date(P1.d);h0.setDate(h0.getDate()-1);P0={d:ymd(d0),h:ymd(h0),t:E.sem?"la semana pasada":"el periodo anterior"};}
    const A=sum(P1.d,P1.h),Bp=sum(P0.d,P0.h),tN=E.tipo==="E"?"entrado":"consumido";
    const m1=A.dias?A.tot/A.dias:0,m0=Bp.dias?Bp.tot/Bp.dias:0,cm=pc(m1,m0);
    ent((E.tipo==="E"?"entradas":"consumo")+": "+P1.t+" frente a "+P0.t.toLowerCase(),[E.nave,E.mat?MAT[E.mat].nom:null]);
    frase(Mayus(P1.t)+" se ha"+(E.tipo==="E"?"n ":" ")+tN+" "+fmt(A.tot)+" kg y "+P0.t.toLowerCase()+" "+fmt(Bp.tot)+" kg."+(E.tipo==="C"&&cm!=null?" Por día de trabajo, "+fmt(m1)+" kg frente a "+fmt(m0)+" kg: "+(cm>0?"un "+cm+" % más.":cm<0?"un "+(-cm)+" % menos.":"lo mismo."):""));
    const ks=[...new Set(Object.keys(A.o).concat(Object.keys(Bp.o)))].sort();
    card("Por línea",[tabla(["Línea",Mayus(P1.t),P0.t,E.tipo==="C"?"Por día ahora":"Fardos ahora",E.tipo==="C"?"Por día antes":"Fardos antes","Cambio"],ks.map(k=>{const a=A.o[k]||{kg:0,fa:0},b=Bp.o[k]||{kg:0,fa:0};
      const x=E.tipo==="C"?(A.dias?a.kg/A.dias:0):a.fa,y=E.tipo==="C"?(Bp.dias?b.kg/Bp.dias:0):b.fa,c=pc(x,y);return[k,fmt(a.kg)+" kg",fmt(b.kg)+" kg",fmt(x),fmt(y),c==null?"—":(c>0?"+":"")+c+" %"];}),[1,2,3,4,5])]);
    if(E.tipo==="C")nota("Por día = kilos entre los días con consumo apuntado ("+A.dias+" ahora, "+Bp.dias+" antes). Así se puede comparar un mes a medias con uno entero.");return;}

  if(E.modo==="finmes"){const fin=finDeMes(mesDe(h)),SM=simLineas(fin);const ks=lineas().filter(k=>SM[k].b.fa>0||SM[k].dia>0||SM[k].pend.length);ent("stock a final de mes ("+dmyA(fin)+")",[E.nave,E.mat?MAT[E.mat].nom:null]);
    const R=ks.map(k=>{const s=SM[k],u=s.dias[s.dias.length-1]||{faN:s.b.faN,faE:s.b.faE},bajo=s.dias.find(x=>s.min&&x.faN<s.min),cero=s.dias.find(x=>x.faN<=0&&x.g>0);return{k,s,u,bajo,cero};});
    const malos=R.filter(x=>x.cero||x.bajo);frase(malos.length?"A final de mes "+malos.map(x=>etiqLinea(x.k)+(x.cero?" se queda sin material "+elDia(x.cero.f):" baja del mínimo "+elDia(x.bajo.f))).join("; ")+".":"Con lo planificado, todas las líneas llegan a final de mes por encima del mínimo.");
    card(null,[el("div",{class:"bq-lst"},R.map(x=>{const ent_=x.s.pend.filter(p=>p.f<=fin&&p.o!=="B").reduce((a,p)=>a+p.fa,0);
      return it(etiqLinea(x.k),["Ahora "+fmt(x.s.b.faN)+" en nave"+(x.s.b.faE?" + "+fmt(x.s.b.faE)+" en externo":""),"Gasta ≈ "+fmt(x.s.dia)+" fardos al día"+(ent_?" · entran "+fmt(ent_)+" planificados":""),x.s.min?"Mínimo "+fmt(x.s.min):null],fmt(x.u.faN)+" fardos","en nave el "+dmy(fin)+(x.u.faE?" · "+fmt(x.u.faE)+" externo":""));}))]);
    nota("Previsión con el gasto de ahora (máquinas en marcha) y los relevos del calendario, sumando las entradas planificadas del Plan que aún no se han recibido.");add(lnk("Abrir el Plan",()=>irTab("plan")));return;}

  if(E.modo==="pedir"){const lim=ymd(new Date(Date.now()+60*864e5)),SM=simLineas(lim);const ks=lineas().filter(k=>SM[k].dia>0);ent("cuándo hace falta camión",[E.nave,E.mat?MAT[E.mat].nom:null]);
    const R=ks.map(k=>{const s=SM[k],bajo=s.dias.find(x=>x.faN<(s.min||0.001)),cero=s.dias.find(x=>x.faN<=0&&x.g>0);let tope=null;
      if(bajo){let f=diaAntes(bajo.f);for(let n=0;n<10&&f>=h;n++){if(diaDescarga(f)){tope=f;break;}f=diaAntes(f);}}return{k,s,bajo,cero,tope};}).sort((a,b)=>(a.bajo?a.bajo.f:"9")<(b.bajo?b.bajo.f:"9")?-1:1);
    const r0=R.find(x=>x.bajo);
    frase(!r0?"Con lo que hay y lo planificado no hace falta ningún camión en los próximos 60 días.":etiqLinea(r0.k)+" es la primera que lo necesita: baja "+(r0.s.min?"del mínimo ("+fmt(r0.s.min)+" fardos)":"a cero")+" "+elDia(r0.bajo.f)+(r0.tope?". El camión tendría que descargar como tarde "+elDia(r0.tope)+".":r0.bajo.f<=h?": hace falta cuanto antes.":"."));
    card(null,[el("div",{class:"bq-lst"},R.map(x=>it(etiqLinea(x.k),[x.bajo?(x.s.min?"Baja del mínimo el ":"Se acaba el ")+diaLargo(x.bajo.f):"Aguanta más de 60 días",x.tope?"Descargar como tarde el "+diaLargo(x.tope):null,x.cero&&x.bajo&&x.cero.f!==x.bajo.f?"Sin material el "+diaLargo(x.cero.f):null,
      x.s.pend.length?"Ya cuenta "+x.s.pend.length+(x.s.pend.length===1?" entrada planificada":" entradas planificadas"):"Sin entradas planificadas",x.bajo&&x.s.b.faE>0?"En el externo hay "+fmt(x.s.b.faE)+" fardos: puedes subir una BP en vez de pedir camión":null],x.bajo?dmy(x.bajo.f):"—",x.bajo?"baja del mínimo":"")))]);
    nota("Los viernes y los días sin trabajo no se descarga. Se cuentan las entradas que ya hay en el Plan; si pides un camión, colócalo allí y esto se recalcula.");add(lnk("Abrir el Plan",()=>irTab("plan")));return;}

  if(E.modo==="camq"){const mes=mesDe(h),cam=((cfg.plan||{})[mes]||{}).camiones||[],ents=entradasMes(mes).filter(x=>!x.r.h&&x.r.t==="E");
    const L=cam.filter(c=>(!E.prov||nqC(c.p)===nqC(E.prov))&&(!E.mat||c.m===E.mat)).map(c=>{const ll=ents.filter(x=>nqC(x.prov)===nqC(c.p)&&x.mat===c.m).length;
      const col=((cfg.plan[mes]||{}).entradas||[]).filter(x=>!x.rec&&x.o!=="B"&&x.f>=h).length;return{c,ll,q:Math.max(0,(c.n||0)-ll),col};});
    ent("camiones contratados de "+nomMes(mes),[E.prov,E.mat?MAT[E.mat].nom:null]);
    if(!L.length){frase("No hay camiones contratados apuntados"+(E.prov?" de "+E.prov:"")+" para "+nomMes(mes)+". Se apuntan en la pestaña Plan.");return;}
    const tq=L.reduce((a,x)=>a+x.q,0),tn=L.reduce((a,x)=>a+(x.c.n||0),0),col=((cfg.plan[mes]||{}).entradas||[]).filter(x=>!x.rec&&x.o!=="B"&&x.f>=h).length;
    frase("Quedan por traer "+tq+(tq===1?" camión":" camiones")+" de "+tn+" contratados"+(E.prov?" de "+E.prov:"")+" este mes."+(!E.prov&&col?" En el calendario hay "+col+" colocados de aquí a fin de mes.":""));
    card(null,[el("div",{class:"bq-lst"},L.map(x=>it(x.c.p+" · "+MAT[x.c.m].nom,"Contratados "+x.c.n+" · han entrado "+x.ll,String(x.q),x.q===1?"queda":"quedan")))]);
    nota("«Han entrado» cuenta las entradas del mes de ese proveedor y aleación.");return;}

  if(E.modo==="fifo"){const ks=lineas();ent("qué colada toca gastar",[E.nave,E.mat?MAT[E.mat].nom:null]);const R=ks.map(k=>{const[n,m]=k.split("|");return{k,L:fifoLista(n,m,S)};}).filter(x=>x.L.length);
    if(!R.length){frase("No hay coladas con stock en la nave"+(E.nave?" en "+E.nave:"")+".");return;}
    frase(R.map(x=>etiqLinea(x.k)+": "+x.L[0].nombre).join(" · ")+".");
    R.forEach(x=>card(etiqLinea(x.k),[el("div",{class:"bq-lst"},x.L.slice(0,4).map((l,i)=>it((i?i+1+"ª · ":"Toca ahora · ")+l.nombre,["Entró el "+(l.entrada?dmyA(l.entrada):"—")+(l.proveedor?" · "+l.proveedor:"")],fmt(S[l.id].fa)+" fardos",fmt(S[l.id].kg)+" kg",()=>abrirFicha(l.id))))],x.L.length+(x.L.length===1?" colada en nave":" coladas en nave")));
    nota("Orden de entrada: primero la más antigua que hay en la nave (las del externo no cuentan hasta que se suben).");return;}

  if(E.modo==="antig"){const dd=f=>f?Math.round((new Date(h)-new Date(f))/864e5):null;
    const entExt=l=>{const t=todosMovs().filter(r=>r.t==="T"&&r.d===l.id&&r.o!==l.id).map(r=>r.f).sort().pop();return t||l.entrada;};
    if(E.lote){const l=E.lote,s=S[l.id],ex=l.donde==="externo",f=ex?entExt(l):l.entrada;ent("antigüedad de la colada",[l.nombre]);
      frase("La colada "+l.nombre+(ex?" lleva "+fmt(dd(f))+" días en el almacén externo":" está en "+l.nave+(f?"; entró hace "+fmt(dd(f))+" días":""))+(f?" (desde el "+diaLargo(f)+")":"")+". Le quedan "+fmt(s?s.fa:0)+" fardos.");
      add(lnk("Ver la colada",()=>abrirFicha(l.id)));return;}
    const L=lotes.filter(l=>S[l.id]&&S[l.id].fa>0&&(!E.ext||l.donde==="externo")&&(!E.nave||l.nave===E.nave)&&(!E.mat||l.material===E.mat)&&(!E.prov||nqC(l.proveedor||"")===nqC(E.prov))).map(l=>({l,f:l.donde==="externo"?entExt(l):l.entrada})).filter(x=>x.f).sort((a,b)=>a.f.localeCompare(b.f));
    ent("coladas más antiguas"+(E.ext?" del externo":""),[E.nave,E.mat?MAT[E.mat].nom:null,E.prov]);
    if(!L.length){frase("No hay coladas con stock que cumplan eso.");return;}
    frase("La más antigua es "+L[0].l.nombre+": lleva "+fmt(dd(L[0].f))+" días"+(L[0].l.donde==="externo"?" en el externo":" en "+L[0].l.nave)+".");
    card(null,[el("div",{class:"bq-lst"},L.slice(0,20).map(x=>it(x.l.nombre,[x.l.nave+" · "+MAT[x.l.material].nom+" · "+(x.l.donde==="externo"?"externo":"nave")+(x.l.proveedor?" · "+x.l.proveedor:""),"Desde el "+dmyA(x.f)],fmt(dd(x.f))+" días",fmt(S[x.l.id].fa)+" fardos",()=>abrirFicha(x.l.id))))]);return;}

  if(E.modo==="maq"){if(!primerEvMaq()){frase("Todavía no hay estado de máquinas apuntado. Se apunta en Stock › Máquinas.");return;}
    if(E.maqCod&&!/\b(cuantas|cuales|que maquinas)\b/.test(E.q)){const ev=maqEventos().filter(e=>e.m===E.maqCod).slice().reverse(),st=estadoMaq(h)[E.maqCod];ent("máquina",[E.maqCod]);
      const tx=x=>x.on?"en marcha · "+(x.az?"AlSi12":"AlSi9")+(x.cu?" · con cobre":""):"parada";
      frase(E.maqCod+" ("+st.nave+") está ahora "+tx(st)+"."+(ev[0]?" Último cambio: "+diaLargo(ev[0].f)+", relevo de "+(ev[0].u||"").toLowerCase()+".":" No tiene cambios apuntados: cuenta en marcha con AlSi9."));
      if(ev.length)card("Cambios apuntados",[el("div",{class:"bq-lst"},ev.slice(0,15).map(e=>it(Mayus(diaLargo(e.f)),"Relevo de "+(e.u||"").toLowerCase(),tx(e),null)))]);return;}
    const u=E.u||(E.f===h?turnoAhora():null),st=estadoMaq(E.f,u||undefined),naves=E.nave?[E.nave]:NAVES;const cuando=(E.f===h?"Ahora":Mayus(diaLargo(E.f)))+(u&&E.f!==h?", relevo de "+u.toLowerCase():"");
    ent("máquinas",[E.f===h?"ahora":dmyA(E.f),u&&E.f!==h?u:null,E.nave]);
    const ms=n=>MAQ[n].map(m=>Object.assign({m},st[m]));const fil=x=>E.que==="paradas"?!x.on:E.que==="cobre"?x.on&&x.cu:E.que==="azul"?x.on&&x.az:E.que==="marcha"?x.on:true;
    const fr=naves.map(n=>{const c=cuentaMaq(st,n),par=MAQ[n].length-c.on;const L=ms(n).filter(fil);
      if(E.que==="paradas")return n+": "+(L.length?L.length+(L.length===1?" parada (":" paradas (")+L.map(x=>x.m).join(", ")+")":"ninguna parada");
      if(E.que==="cobre")return n+": "+(L.length?L.length+" con cobre ("+L.map(x=>x.m).join(", ")+")":"ninguna con cobre");
      if(E.que==="azul")return n+": "+(L.length?L.length+" con AlSi12 ("+L.map(x=>x.m).join(", ")+")":"ninguna con AlSi12");
      return n+": "+c.on+" en marcha ("+c.b+" AlSi9, "+c.a+" AlSi12, "+c.c+" con cobre) y "+par+(par===1?" parada":" paradas");});
    frase(cuando+". "+fr.join(". ")+".");
    naves.forEach(n=>card(n,[el("div",{class:"bq-lst"},ms(n).filter(fil).map(x=>it(x.m,x.on?(x.az?"AlSi12":"AlSi9")+(x.cu?" · con cobre":""):"Parada",x.on?"●":"○",x.on?"en marcha":"parada",()=>pon("cómo está la "+x.m))))]));
    nota("Sale del estado de máquinas que se apunta en Stock › Máquinas. Toca una máquina para ver sus cambios.");return;}
}

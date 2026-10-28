/* ===== QUÉ LLEVA CADA MÁQUINA, CONSUMIBLES SIN ASIGNAR Y MATERIAL JUSTO ===== */
const precioDe=a=>{const p=parseN(a&&a.precio);return isFinite(p)&&p>0?p:0;};

const ORDEN_FAM=["piston","barra","tornillo","horno","consumible","repuesto","otro","eje"];
/* lista de lo que lleva una máquina: pistón, eje y artículos asignados, con cuántas lleva y el stock */
function queLleva(m){const out=[];const dm=diamDe(m),pa=dm?pistArt(dm):null;
  if(dm)out.push({g:"Pistón",t:"Pistón "+dm+(m.diam?"":" (según el último cambio)"),n:null,st:pa?stockDe(pa.id):null,ud:pa?pa.ud:"ud",a:pa});
  (cat.modelos||[]).filter(x=>inyDe(x).includes(m.cod)).forEach(x=>{const es=ejes.filter(e=>e.mod===x.cod);const ep=ejeEnMaq(m.cod);
    out.push({g:"Eje",t:"Eje "+x.ref+" ("+x.cod+")"+(ep&&ep.mod===x.cod?" · puesto "+ep.cod:""),n:1,st:es.filter(e=>e.estado==="planta").length,ud:"en planta",mod:x});});
  artsActivos().filter(a=>(a.iny||[]).includes(m.id)).sort((a,b)=>ORDEN_FAM.indexOf(a.fam)-ORDEN_FAM.indexOf(b.fam)||(GRUPOS_H.indexOf(a.grupo)-GRUPOS_H.indexOf(b.grupo))||String(a.cod||a.desc).localeCompare(String(b.cod||b.desc),"es",{numeric:true}))
    .forEach(a=>out.push({g:a.fam==="horno"?(a.grupo||"Horno"):FAM[a.fam],t:(TEC(a.fam)?nomBT(a):a.desc+(a.cod&&!a.desc.includes(a.cod)?" · "+a.cod:"")),n:+a.porMaq>0?+a.porMaq:(a.fam==="barra"?4:1),st:stockDe(a.id),ud:a.ud,a}));
  return out;}
function textoQueLleva(m){const L=queLleva(m);return"Inyectora "+m.cod+(valFicha(m,"c-maq")?" ("+valFicha(m,"c-maq")+")":"")+"\n"+L.map(x=>"• "+x.t+(x.n?" × "+x.n:"")).join("\n");}
async function enviarQueLleva(m){const t=textoQueLleva(m);
  try{if(navigator.share){await navigator.share({title:"Inyectora "+m.cod,text:t});return;}}catch(e){if(e&&e.name==="AbortError")return;}
  try{await navigator.clipboard.writeText(t);toast("Copiado: pégalo en WhatsApp o en un correo");}catch(e){window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank");}}
function bloqueQueLleva(m){const L=queLleva(m);if(!L.length)return el("p",{class:"hint",text:"Todavía no tiene nada asignado."});let g="";const filas=[];
  L.forEach(x=>{if(x.g!==g){g=x.g;filas.push(el("div",{class:"gh",style:"border-radius:6px;margin-top:4px",text:g}));}
    filas.push(el("button",{type:"button",class:"it",onclick:()=>{cerrarDlgs();if(x.mod)fichaModelo(x.mod);else if(x.a)ficha(x.a);}},[el("div",{class:"ppal"},[el("div",{class:"t1",text:x.t}),x.a&&x.a.medidas?el("div",{class:"t2",text:x.a.medidas}):null]),
      el("div",{class:"cant num"},[el("b",{text:x.n?"× "+x.n:""}),el("small",{text:x.st==null?"":"hay "+fmtN(x.st)+(x.ud==="en planta"?" en planta":"")})])]));});
  return el("div",{class:"card"},el("div",{class:"lst"},filas));}
/* consumibles sacados para una máquina que no tiene asignados */
function sinAsignar(m,dias0){const des=sumaDias(hoy(),-(dias0||180));const g={};
  todosMov().filter(x=>x.tipo==="salida"&&x.maq===m.id&&x.f>=des&&!/^Cambio de pistón/.test(x.nota||"")).forEach(x=>{const a=art(x.art);if(!a||a.fam==="piston"||(a.iny||[]).includes(m.id))return;g[a.id]=(g[a.id]||0)+(+x.cant||0);});
  return Object.keys(g).map(id=>({a:art(id),c:g[id]})).filter(x=>x.a&&x.a.activo!==false).sort((p,q)=>q.c-p.c);}
async function asignarArt(a,maqIds){const x=art(a.id);x.iny=Array.from(new Set((x.iny||[]).concat(maqIds)));await saveCat();toast(x.desc+": asignado a "+maqIds.map(maqN).join(", "));}
/* propuesta general: para cada consumible, las máquinas para las que se ha sacado */
function propuestasAsignar(){const des=sumaDias(hoy(),-180);const P={};
  todosMov().filter(x=>x.tipo==="salida"&&x.maq&&x.f>=des&&!/^Cambio de pistón/.test(x.nota||"")).forEach(x=>{const a=art(x.art);if(!a||a.fam==="piston"||(a.iny||[]).includes(x.maq))return;
    const p=P[a.id]=P[a.id]||{a,maqs:{}};p.maqs[x.maq]=(p.maqs[x.maq]||0)+(+x.cant||0);});
  return Object.values(P).sort((p,q)=>p.a.desc.localeCompare(q.a.desc));}
/* material justo: lo que hace falta según las máquinas y el consumo real */
function materialJusto(){let R;try{R=prevTodo();}catch(e){R={arts:[],S:{H:30}};}const X={};R.arts.forEach(x=>{X[x.a.id]=x;});const H=(R.S&&R.S.H)||30;
  return artsActivos().filter(a=>a.fam!=="eje").map(a=>{const x=X[a.id],st=stockDe(a.id),nm=a.fam==="piston"?cat.maquinas.filter(m=>diamDe(m)===a.diam).length:(a.iny||[]).length,pm=+a.porMaq>0?+a.porMaq:(a.fam==="barra"?4:1);
    const r={a,st,nm,puestas:nm*pm,pend:a.pedido?(+a.pedCant||0):0,precio:precioDe(a)};
    if(x){r.min=x.min;r.max=Math.max(x.min,Math.ceil(x.s.rate*H+x.min));r.mes=x.mesUd;
      r.est=st<r.min?"falta":st>r.max?"sobra":"justo";r.dif=r.est==="falta"?r.min-st:r.est==="sobra"?st-r.max:0;}
    else{r.est="sin";r.dif=0;}
    return r;}).sort((p,q)=>["falta","sobra","justo","sin"].indexOf(p.est)-["falta","sobra","justo","sin"].indexOf(q.est)||q.dif*(q.precio||1)-p.dif*(p.precio||1)||p.a.desc.localeCompare(q.a.desc));}
function vMat(v){draft.mf=draft.mf||"";const L=materialJusto();const n=k=>L.filter(r=>r.est===k);
  const exU=n("sobra").reduce((t,r)=>t+r.dif,0),exE=n("sobra").reduce((t,r)=>t+r.dif*r.precio,0),hayP=L.some(r=>r.precio);
  const valor=L.reduce((t,r)=>t+r.st*r.precio,0);
  v.appendChild(el("dl",{class:"kpis num"},[["Faltan",String(n("falta").length)],["Sobran",String(n("sobra").length)+(exE?" · "+eur(exE):"")],["Justos",String(n("justo").length)],[hayP?"Valor del stock":"Sin datos de consumo",hayP?eur(valor):String(n("sin").length)]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))));
  v.appendChild(el("p",{class:"hint",text:"Mínimo = lo que se gasta mientras llega un pedido más un margen; máximo = mínimo + lo que se gasta hasta final del mes que viene. Se calcula con lo que se saca de verdad para las máquinas, así que mejora con el tiempo."+(hayP?"":" Cuando metas precios en los artículos, aquí saldrá también el dinero que hay de más.")}));
  v.appendChild(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn",text:"Fijar estos mínimos",onclick:()=>{try{aplicarPrev(prevTodo());}catch(e){toast("No hay datos suficientes todavía");}}}),el("button",{type:"button",class:"btn sec",text:"Ir a Reponer",onclick:()=>irA("repo")})]));
  v.appendChild(el("div",{class:"chips"},[["","Todo"],["falta","Faltan"],["sobra","Sobran"],["justo","Justos"],["sin","Sin datos"]].map(([k,t])=>el("button",{type:"button",class:"chip","aria-pressed":String(draft.mf===k),text:t,onclick:()=>{draft.mf=k;render(true);}}))));
  const EST={falta:["Falta","bad"],sobra:["Sobra","warn"],justo:["Justo","ok"],sin:["Sin datos",""]};
  const F=L.filter(r=>!draft.mf||r.est===draft.mf);
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Material justo ("+F.length+")"}),el("span",{class:"der sub",text:exU?"de más: "+fmtN(exU)+" ud":""})]),
    F.length?el("div",{class:"lst"},F.map(r=>{const[t,c]=EST[r.est];return el("button",{type:"button",class:"it",onclick:()=>ficha(r.a)},[el("span",{class:"stripe "+c}),
      el("div",{class:"ppal"},[el("div",{class:"t1",text:TEC(r.a.fam)?nomBT(r.a):r.a.desc}),el("div",{class:"t2",text:[r.nm?"en "+r.nm+" máquina"+(r.nm>1?"s":"")+(r.a.fam==="piston"?" ahora":"")+(r.puestas>r.nm&&r.a.fam!=="piston"?" ("+r.puestas+" puestas)":""):(r.a.fam==="piston"?"ninguna máquina lo lleva ahora":"sin máquina asignada"),r.mes!=null?"gasta ~"+fmtN(Math.round(r.mes*10)/10)+"/mes":"sin consumo registrado",r.min!=null?"mín "+fmtN(r.min)+" · máx "+fmtN(r.max):null,r.pend?"pedidas "+fmtN(r.pend):null,r.precio?eur(r.precio)+"/"+r.a.ud:null].filter(Boolean).join(" · ")})]),
      el("div",{class:"cant num"},[el("b",{text:fmtN(r.st)}),el("small",{text:r.est==="falta"?"faltan "+fmtN(r.dif):r.est==="sobra"?"sobran "+fmtN(r.dif)+(r.precio?" · "+eur(r.dif*r.precio):""):t})])]);})):el("div",{class:"empty",text:"Nada en este filtro."})]));
  const P=propuestasAsignar();
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Consumibles sin asignar a máquina ("+P.length+")"}),el("span",{class:"der sub",text:"según lo sacado en 6 meses"})]),
    P.length?el("div",{class:"lst"},P.map(p=>{const ids=Object.keys(p.maqs).sort((x,y)=>p.maqs[y]-p.maqs[x]);return el("div",{class:"it",style:"cursor:default;flex-wrap:wrap"},[el("div",{class:"ppal"},[el("div",{class:"t1",text:p.a.desc}),el("div",{class:"t2",text:"Sacado para "+ids.map(id=>maqN(id)+" ("+fmtN(p.maqs[id])+")").join(", ")})]),
      el("button",{type:"button",class:"btn sec peq",text:"Asignar",onclick:async()=>{try{await asignarArt(p.a,ids);render(true);}catch(e){}}})]);})):el("p",{class:"hint",style:"padding:10px 14px",text:"Todo lo que se ha sacado para una máquina ya está asignado a esa máquina."})]));}
/* ===== FICHA DE INYECTORA (campos y opciones configurables) ===== */
const maqDe=id=>cat.maquinas.find(x=>x.id===id);
const tipoCan=a=>a&&a.cod?(/k$/i.test(a.cod)?"K":/c$/i.test(a.cod)?"C":""):"";
function diamDe(m){if(m.diam)return m.diam;const u=ultimoPist(m.id);return u?u.diam:"";}
/* campos que se rellenan con datos de otras partes: ejes (modelos), pistón, barras y tornillos (artículos) */
const AUTO={eje:"Modelos de eje: se marca qué modelos lleva",piston:"Ø de pistón habitual",barra:"Barras expulsoras del almacén",tornillo:"Tornillos tope del almacén",horno:"Recambios de horno del almacén"};
const autoTxt=(c,m)=>autoVal(c,m).map(id=>c.auto==="eje"?((cat.modelos||[]).find(x=>x.id===id)||{}).cod:c.auto==="piston"?id.replace("Ø ",""):(art(id)||{}).desc).filter(Boolean).join(", ");
const codsIny=cs=>cs.slice().sort((a,b)=>a.localeCompare(b,"es",{numeric:true})).map((c,i)=>i?c.replace(/^F/i,""):c).join("-");
function autoVal(c,m){if(c.auto==="eje")return(cat.modelos||[]).filter(x=>inyDe(x).includes(m.cod)).map(x=>x.id);
  if(c.auto==="piston")return m.diam?[m.diam]:[];return artsActivos().filter(a=>a.fam===c.auto&&(a.iny||[]).includes(m.id)).map(a=>a.id);}
function autoOps(c){if(c.auto==="eje")return(cat.modelos||[]).slice().sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true})).map(x=>({id:x.id,t:x.ref+" ("+x.cod+")"}));
  if(c.auto==="piston")return DIAM.map(d=>({id:d,t:d}));return artsActivos().filter(a=>a.fam===c.auto).map(a=>({id:a.id,t:a.desc,art:a.id}));}
/* plantilla: [{id,nom,multi,ops:[{id,t,art}]} | {id,nom,auto}]; la primera vez se propone una */
function plantilla(){if(cat.fichaIny&&Array.isArray(cat.fichaIny.campos))return cat.fichaIny.campos;return PLANT_INI();}
/* opciones que dependen del horno: si el nombre lleva marca o medida de horno, solo valen para ese horno */
function hornoSel(P,val){const sel=id=>{const c=P.find(x=>x.id===id);const o=c&&(val[id]||[]).map(i=>c.ops.find(z=>z.id===i)).filter(Boolean)[0];return o?norm(o.t):"";};
  const lista=id=>{const c=P.find(x=>x.id===id);return c&&c.ops?c.ops.map(o=>norm(o.t)).filter(Boolean):[];};return{marca:sel("c-horno"),medida:sel("c-hmed"),marcas:lista("c-horno"),medidas:lista("c-hmed")};}
const wrd=(txt,w)=>new RegExp("(^|[^a-z0-9])"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"([^a-z0-9]|$)").test(txt);
function cuadra(o,h){const t=norm(o.t);const mm=h.marcas.filter(x=>wrd(t,x)),md=h.medidas.filter(x=>wrd(t,x));return(!h.marca||!mm.length||mm.includes(h.marca))&&(!h.medida||!md.length||md.includes(h.medida));}
const especifica=(o,h)=>{const t=norm(o.t);return h.marcas.some(x=>wrd(t,x))||h.medidas.some(x=>wrd(t,x));};
function PLANT_INI(){
  const can=artsActivos().filter(a=>/canalet/i.test(a.desc)),cc=artsActivos().filter(a=>/cazo de carga/i.test(a.desc));
  const ops=ts=>ts.map((t,i)=>({id:"o-"+norm(t).replace(/[^a-z0-9]+/g,"")+"-"+i,t,art:null}));const v=(id,nom,multi)=>({id,nom,multi:!!multi,ops:[]});
  return[{id:"c-maq",nom:"Modelo de máquina",multi:false,ops:ops(["IDRA","BÜHLER","STP"])},{id:"c-horno",nom:"Modelo Horno",multi:false,ops:ops(["Krown","Westofen"])},v("c-hcap","Capacidad horno"),
    v("c-canll","Canaleta llenado"),{id:"c-can",nom:"Canaleta",multi:false,ops:can.map(a=>({id:"o-can-"+a.id,t:tipoCan(a)?"De la "+tipoCan(a):a.desc,art:a.id})).concat([{id:"o-can-no",t:"Sin canaleta",art:null}])},
    {id:"c-cazoc",nom:"Cazo de carga",multi:false,ops:cc.map(a=>({id:"o-cc-"+a.id,t:a.desc.replace(/^cazo de carga\s*/i,"").replace(/(\d)\s*kg/i,"$1 kg")||a.desc,art:a.id})).concat([{id:"o-cc-no",t:"Sin cazo de carga",art:null}])},
    v("c-tubo","Tubo dosificador"),v("c-cont","Contenedor"),{id:"x-eje",nom:"Eje de inyección",auto:"eje"},v("c-cono","Cono de llenado"),v("c-jcono","Junta cono"),v("c-jdos","Junta dosificador"),
    {id:"c-dosif",nom:"Dosificador",multi:false,segunHorno:true,ops:ops(["Krown 18","Krown 21","Krown 24","Westofen 18","Westofen 21","Westofen 24"])},
    v("c-resis","Resistencias",true),v("c-centr","Centradores",true),{id:"x-piston",nom:"Pistón",auto:"piston"},{id:"x-barra",nom:"Barras expulsoras",auto:"barra"},{id:"x-tornillo",nom:"Tornillos tope",auto:"tornillo"},
    v("c-conex","Conexión"),v("c-conexe","Conexión estrella"),v("c-jpuerta","Junta puerta limpieza horno"),v("c-jtapa","Junta tapa"),v("c-jsonda","Junta sonda temperatura")];}
function valoresDe(m){if(m.ficha)return m.ficha;const v={};const P=plantilla();
  const pon=(cid,f)=>{const c=P.find(x=>x.id===cid);const o=c&&c.ops.find(f);if(o)v[cid]=[o.id];};
  if(m.canaleta)pon("c-can",o=>o.art===m.canaleta);if(m.cazo)pon("c-cazo",o=>o.art===m.cazo);if(m.alea)pon("c-alea",o=>o.t===m.alea);return v;}
function lineasFicha(m,conStock){const v=valoresDe(m);return plantilla().map(c=>{
  if(c.auto){const ids=autoVal(c,m);let txt;if(c.auto==="piston"){const d=diamDe(m);if(!d)return null;const pa=pistArt(d);txt=d+(m.diam?"":" (último cambio)")+(conStock&&pa?" · hay "+fmtN(stockDe(pa.id)):"");}
    else if(c.auto==="eje"){if(!ids.length)return null;txt=ids.map(id=>{const x=(cat.modelos||[]).find(z=>z.id===id);const es=ejes.filter(e=>e.mod===x.cod);return x.ref+(conStock?" · "+es.filter(e=>e.estado==="planta").length+"/"+es.length+" en planta":"");}).join(", ");}
    else{if(!ids.length)return null;txt=ids.map(id=>{const a=art(id);return a.desc+(conStock?" · hay "+fmtN(stockDe(a.id))+" "+a.ud:"");}).join(", ");}
    return{c,ops:[],txt};}
  const ops=(v[c.id]||[]).map(id=>c.ops.find(o=>o.id===id)).filter(Boolean);if(!ops.length)return null;
  return{c,ops,txt:ops.map(o=>{const a=o.art&&art(o.art);return o.t+(conStock&&a?" · hay "+fmtN(stockDe(a.id))+" "+a.ud:"");}).join(", ")};}).filter(Boolean);}
const resumenFicha=m=>lineasFicha(m).map(l=>l.c.nom+": "+l.txt);
function fichaIny(m0,tab0){const m=maqDe(m0.id)||m0;const hy=hoy();const abre=fn=>()=>{OP_VOLVER=m.cod;fn();setTimeout(()=>{OP_VOLVER=null;},0);};
  const reabre=t=>()=>{cerrarDlgs();setTimeout(()=>fichaIny(m,t),60);};
  const mods=(cat.modelos||[]).filter(x=>inyDe(x).includes(m.cod));const all=todosPist().filter(p=>p.maq===m.id);const ps=all.slice(-8).reverse();
  const c3=all.filter(p=>p.f>=sumaDias(hy,-91)).reduce((s,p)=>s+(+p.cant||1),0);const u=all[all.length-1];
  const dm=diamDe(m),pa=dm?pistArt(dm):null;
  const asign0=artsActivos().filter(a=>(a.iny||[]).includes(m.id)).sort((a,b)=>a.fam.localeCompare(b.fam)||a.desc.localeCompare(b.desc));
  const asign=asign0.filter(a=>a.fam!=="horno"),hornoA=asign0.filter(a=>a.fam==="horno").sort((a,b)=>GRUPOS_H.indexOf(a.grupo)-GRUPOS_H.indexOf(b.grupo)||a.desc.localeCompare(b.desc,"es",{numeric:true}));
  const d60=sumaDias(hy,-60),cons={};todosMov().filter(x=>x.maq===m.id&&x.tipo==="salida"&&x.f>=d60&&!/^Cambio de pistón/.test(x.nota||"")).forEach(x=>{cons[x.art]=(cons[x.art]||0)+(+x.cant||0);});
  const lista=(arr,fn)=>el("div",{class:"card"},el("div",{class:"lst"},arr.map(fn)));
  const gh=t=>el("div",{class:"gh",style:"border-radius:6px",text:t});
  const itArt=(a,extra)=>el("button",{type:"button",class:"it",onclick:abre(()=>ficha(a))},[el("div",{class:"ppal"},[el("div",{class:"t1",text:TEC(a.fam)?nomBT(a):a.desc}),
    el("div",{class:"t2",text:[FAM[a.fam],TEC(a.fam)?(revVig(a)?"plano "+revTxt(revVig(a).n):"sin plano"):(a.plano?"plano "+a.plano:null),!TEC(a.fam)&&(a.docs||[]).length?"con plano":null,extra].filter(Boolean).join(" · ")})]),
    el("div",{class:"cant num"},[el("b",{text:fmtN(stockDe(a.id))}),el("small",{text:a.ud})])]);
  const lf=lineasFicha(m,true).filter(l=>l.c.auto!=="horno");const datos=[].concat(...lf.map(l=>[el("dt",{text:l.c.nom}),el("dd",{text:l.txt})]));
  if(m.notas)datos.push(el("dt",{text:"Notas"}),el("dd",{text:m.notas}));
  const docs=m.docs||[];
  const B=[
    el("p",{class:"sub",text:(()=>{const t=lf.filter(l=>["c-zona","c-maq","c-horno","c-hmed"].includes(l.c.id)).map(l=>l.txt);if(!t.length)t.push(...lf.slice(0,2).map(l=>l.txt));if(m.nave&&!t.some(x=>x.startsWith(m.nave)))t.unshift(m.nave);return t.join(" · ")||"—";})()}),
    el("dl",{class:"kpis num"},[["Ø pistón",dm||"—"],["Pistones 3 meses",String(c3)],["Último cambio",u?"hace "+dias(u.f,hy)+" d":"—"],["Stock de ese Ø",pa?fmtN(stockDe(pa.id)):"—"]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))),
    gh("Hoy"),(()=>{const h=hoyDe(m),mo=moldeDe(h.molde),co=contDe(h.cont);const hm=todosMlog().filter(x=>x.maq===m.id).slice(-6).reverse();
      return el("div",{style:"display:grid;gap:8px"},[el("dl",{class:"datos"},[el("dt",{text:"Molde"}),el("dd",{text:mo?moldeTxt(mo)+(h.moldeF?" · desde "+fmtF(h.moldeF):""):"sin apuntar"}),el("dt",{text:"Pistón"}),el("dd",{text:dm||"—"}),el("dt",{text:"Contenedor"}),el("dd",{text:co?co.cod+(h.contF?" · desde "+fmtF(h.contF):""):"sin apuntar"})]),
        el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec peq",text:"Cambio de molde",onclick:()=>{cerrarDlgs();cambioHoy(m,"molde");}}),el("button",{type:"button",class:"btn sec peq",text:"Cambio de contenedor",onclick:()=>{cerrarDlgs();cambioHoy(m,"cont");}})]),
        hm.length?el("p",{class:"sub",text:"Últimos: "+hm.map(x=>fmtF(x.f)+" "+(x.tipo==="molde"?"molde "+((moldeDe(x.val)||{}).cod||"?"):"contenedor "+((contDe(x.val)||{}).cod||"?"))).join(" · ")}):null]);})(),
    gh("Lo que monta"),datos.length?el("dl",{class:"datos"},datos):el("p",{class:"hint",text:"Sin rellenar. Pulsa «Editar ficha» y marca lo que lleva esta máquina."}),
    gh("Ejes · "+(mods.length?mods.length+" modelo"+(mods.length>1?"s":""):"ninguno")),
    mods.length?(()=>{const ep=ejeEnMaq(m.cod);return el("div",{style:"display:flex;justify-content:space-between;align-items:center;gap:8px;padding:4px 2px"},[el("span",{},["Eje puesto: ",el("b",{text:ep?ep.cod:"sin saber"}),ep&&ep.maqF?el("span",{class:"sub",text:" · desde "+fmtF(ep.maqF)}):null]),
      el("button",{type:"button",class:"btn sec peq",text:ep?"Cambiar":"Indicar",onclick:()=>{cerrarDlgs();elegirEjeMaq(m,()=>setTimeout(()=>fichaIny(m),350));}})]);})():null,
    mods.length?lista(mods,x=>{const es=ejes.filter(e=>e.mod===x.cod);const p=es.filter(e=>e.estado==="planta").length;return el("button",{type:"button",class:"it",onclick:abre(()=>fichaModelo(x))},[
      el("span",{class:"stripe "+(+x.min>0?(p<+x.min?"bad":p===+x.min?"warn":"ok"):"")}),el("div",{class:"ppal"},[el("div",{class:"t1",text:x.ref}),
        el("div",{class:"t2",text:[x.cod,x.long,x.rosca?"rosca "+x.rosca:null,(x.docs||[]).length?"con plano":"sin plano",es.length-p?(es.length-p)+" fuera de planta":null].filter(Boolean).join(" · ")})]),
      el("div",{class:"cant num"},[el("b",{text:p+"/"+es.length}),el("small",{text:"en planta"})])]);}):el("p",{class:"hint",text:"Ningún modelo de eje tiene puesta esta inyectora (se pone en el modelo de eje, campo Inyectoras)."}),
    el("div",{class:"gh",style:"border-radius:6px;display:flex;justify-content:space-between;align-items:center"},[el("span",{text:"Qué lleva"}),el("button",{type:"button",class:"btn sec peq",text:"Enviar lista",onclick:()=>enviarQueLleva(m)})]),
    bloqueQueLleva(m),
    (()=>{const sa=sinAsignar(m);return sa.length?el("div",{class:"banner",style:"display:grid;gap:6px"},[el("span",{text:"Se ha sacado para esta máquina y no está en su lista:"}),el("div",{style:"display:flex;flex-wrap:wrap;gap:6px"},sa.map(x=>el("button",{type:"button",class:"chip",text:"＋ "+x.a.desc+" ("+fmtN(x.c)+")",onclick:async()=>{try{await asignarArt(x.a,[m.id]);cerrarDlgs();fichaIny(m);}catch(e){}}})))]):null;})(),
    Object.keys(cons).length?gh("Material gastado en esta máquina · 60 días"):null,
    Object.keys(cons).length?lista(Object.keys(cons).map(art).filter(Boolean),a=>el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},el("div",{class:"t1",text:a.desc})),el("div",{class:"cant num"},[el("b",{text:fmtN(cons[a.id])}),el("small",{text:a.ud})])])):null,
    gh("Últimos cambios de pistón"),
    ps.length?el("div",{class:"tw"},el("table",{},el("tbody",{},ps.map(p=>el("tr",{},[el("td",{class:"num",text:fmtF(p.f)}),el("td",{text:p.diam}),el("td",{text:cap(p.motivo)}),el("td",{text:p.resp?respTxt(p.resp):""})]))))):el("p",{class:"hint",text:"Sin cambios registrados."}),
    gh("Fotos y documentos"),
    el("div",{style:"display:flex;flex-wrap:wrap;gap:10px"},docs.length?docs.map(d=>docThumb(d,async()=>{const x=maqDe(m.id);x.docs=(x.docs||[]).filter(z=>z.id!==d.id);await saveCat();toast("Archivo quitado");cerrarDlgs();fichaIny(m);})):[el("p",{class:"hint",text:"Placa de la máquina, manual, fotos del horno o de la canaleta…"})]),
    subirDoc(async d=>{const x=maqDe(m.id);x.docs=(x.docs||[]).concat([d]);await saveCat();toast("Guardado");cerrarDlgs();fichaIny(m);},"Subir foto o documento (PDF o imagen)")];
  const C=(...ix)=>[el("section",{class:"card"},el("div",{class:"bd",style:"display:grid;gap:10px"},ix.map(i=>B[i]).filter(Boolean)))];
  /* --- Ahora: lo que monta, cada línea lleva a su pieza --- */
  const h=hoyDe(m),mo=moldeDe(h.molde),co=contDe(h.cont),ep=ejeEnMaq(m.cod),epM=ep?modelo(ep.mod):null;
  const bar=asign.filter(a=>a.fam==="barra"),tor=asign.filter(a=>a.fam==="tornillo");
  const linea=(k,v,sub,ir,cambiar,cls)=>el("div",{class:"mq-l"+(cls?" "+cls:"")},[
    el(ir?"button":"div",Object.assign({class:"mq-lp"},ir?{type:"button",onclick:abre(ir),"aria-label":k+": "+v}:{}),[el("span",{class:"mq-lk",text:k}),el("b",{text:v||"sin apuntar"}),sub?el("small",{text:sub}):null,ir?el("span",{class:"mq-lg","aria-hidden":"true",text:"›"}):null]),
    cambiar?el("button",{type:"button",class:"btn sec peq",text:"Cambiar",onclick:cambiar}):null]);
  const ct=co?tipoCont(co):"",dpN=diamPist(m);
  const ahora=el("div",{class:"mq-ls"},[
    linea("Molde",mo?moldeTxt(mo):"",mo?[mo.diam?"pistón "+mo.diam:null,h.moldeF?"desde "+fmtF(h.moldeF):null].filter(Boolean).join(" · "):null,mo?()=>formMolde(mo,()=>reabre(0)()):null,()=>{cerrarDlgs();cambioHoy(m,"molde");},mo?"":"mut"),
    linea("Pistón",dm||"",pa?"hay "+fmtN(stockDe(pa.id))+" de ese Ø · "+c3+(c3===1?" cambio":" cambios")+" en 3 meses":null,pa?()=>ficha(pa):null,()=>{cerrarDlgs();Object.assign(draft.p,{maq:m.id,diam:dm||draft.p.diam,alm:""});irA("pist");},dm?(pa&&nivel(pa)==="bad"?"warn":""):"mut"),
    linea("Eje",ep?ep.cod:"",ep?[epM?epM.ref:ep.mod,ep.maqF?"desde "+fmtF(ep.maqF):null].filter(Boolean).join(" · "):mods.length?"no se sabe cuál lleva":"ningún modelo para esta máquina",ep?()=>fichaEje(ep):null,mods.length?()=>{cerrarDlgs();elegirEjeMaq(m,()=>setTimeout(()=>fichaIny(m),350));}:null,ep?"":"mut"),
    linea("Contenedor",co?co.cod:"",co?[ct?CT_L[ct[0]].mm+" mm · Ø"+CT_D[ct[1]]:null,h.contF?"desde "+fmtF(h.contF):null,dpN&&ct&&CT_D[ct[1]]!==dpN?"¡no es el Ø del pistón!":null].filter(Boolean).join(" · "):letraMaq(m)?"lleva largo "+letraMaq(m)+" ("+CT_L[letraMaq(m)].mm+" mm)":null,co?()=>fichaCont(co,()=>reabre(0)()):null,()=>{cerrarDlgs();cambioCont(m,{volver:true});},co?(dpN&&ct&&CT_D[ct[1]]!==dpN?"warn":""):"mut"),
    ...(bar.length?bar:[null]).map(a=>linea("Barras expulsoras",a?nomBT(a):"",a?"hay "+fmtN(stockDe(a.id))+" "+a.ud+(revVig(a)?" · plano "+revTxt(revVig(a).n):""):null,a?()=>ficha(a):null,null,a?(nivel(a)==="bad"?"warn":""):"mut")),
    ...(tor.length?tor:[null]).map(a=>linea("Tornillo tope",a?nomBT(a):"",a?"hay "+fmtN(stockDe(a.id))+" "+a.ud:null,a?()=>ficha(a):null,null,a?(nivel(a)==="bad"?"warn":""):"mut")),
    linea("Horno",hornoTxt(m)||"",hornoA.length?hornoA.length+" recambios en su lista (pestaña Consumibles)":null,null,null,hornoTxt(m)?"":"mut")]);
  /* --- Historial: todo lo que ha pasado en la máquina, en una sola lista --- */
  const H=[];todosMlog().filter(x=>x.maq===m.id).forEach(x=>H.push({f:x.f,ts:x.ts||0,t:x.tipo==="molde"?"Molde":"Contenedor",d:x.tipo==="molde"?"Se pone el "+(((moldeDe(x.val)||{}).cod)||"?"):(x.val?"Se pone el "+(((contDe(x.val)||{}).cod)||"?"):"Se quita")+(x.antes?" · sale el "+((x.tipo==="molde"?(moldeDe(x.antes)||{}).cod:(contDe(x.antes)||{}).cod)||"?")+(x.destino?" ("+((CT_EST[x.destino]||[x.destino])[0]).toLowerCase()+")":""):""),q:x.by,ir:x.tipo==="cont"&&contDe(x.val||x.antes)?()=>fichaCont(contDe(x.val||x.antes)):null}));
  all.forEach(p=>H.push({f:p.f,ts:p.ts||0,t:"Pistón",d:p.diam+" · "+cap(p.motivo||"")+((+p.cant||1)>1?" · "+p.cant+" pistones":""),q:p.resp?respTxt(p.resp):p.por||""}));
  todosMov().filter(x=>x.maq===m.id&&x.tipo==="salida"&&!/^Cambio de pistón/.test(x.nota||"")).forEach(x=>{const a=art(x.art);H.push({f:x.f,ts:x.ts||0,t:a&&a.fam==="horno"?"Horno":a&&TEC(a.fam)?FAM[a.fam]:"Material",d:(a?(TEC(a.fam)?nomBT(a):a.desc):"?")+" × "+fmtN(+x.cant||0)+(x.nota?" · "+x.nota:""),q:x.por||(x.resp?respTxt(x.resp):""),ir:a?()=>ficha(a):null});});
  H.sort((a,b)=>(b.f+"|"+String(b.ts).padStart(15,"0")).localeCompare(a.f+"|"+String(a.ts).padStart(15,"0")));
  const hist=H.length?el("div",{class:"lst"},H.slice(0,80).map(x=>el(x.ir?"button":"div",Object.assign({class:"it"},x.ir?{type:"button",onclick:abre(x.ir)}:{style:"cursor:default"}),[el("span",{class:"mq-ht",text:x.t}),el("div",{class:"ppal"},[el("div",{class:"t1",text:x.d}),el("div",{class:"t2",text:[fmtF(x.f),x.q].filter(Boolean).join(" · ")})])]))):el("p",{class:"hint",text:"Todavía no hay nada apuntado en esta máquina."});
  /* --- Gasto: pistones y material, este mes, el anterior y el año --- */
  const gastoDe=desde=>{const ps=all.filter(p=>p.f>=desde),ms=todosMov().filter(x=>x.maq===m.id&&x.tipo==="salida"&&x.f>=desde&&!/^Cambio de pistón/.test(x.nota||""));
    const R={},sinP=new Map(),add=(k,n,e,a)=>{const r=R[k]=R[k]||{n:0,e:0,sp:0};r.n+=n;r.e+=e;if(!e&&n){r.sp+=n;if(a)sinP.set(a.id,a);}};
    ps.forEach(p=>{const a=pistArt(p.diam),c=+p.cant||1;add("Pistones",c,c*precioDe(a),a);});
    todasRep().filter(r=>r.res==="ok"&&r.rec&&r.rec>=desde&&(r.maq===m.cod||r.maq===m.id)).forEach(r=>{const v=costeRep(r).v;add("Reparación de ejes",1,v,null);});
    ms.forEach(x=>{const a=art(x.art);const k=a?(a.fam==="horno"?"Horno":TEC(a.fam)?"Barras y tornillos":"Consumibles"):"Otros";const c=+x.cant||0;add(k,c,c*precioDe(a),a);});
    return{R,sinP,pist:ps.reduce((t,p)=>t+(+p.cant||1),0),tot:Object.values(R).reduce((a,r)=>a+r.e,0)};};
  const mes0=hy.slice(0,8)+"01",ano0=hy.slice(0,5)+"01-01";const GM=gastoDe(mes0),GA=gastoDe(ano0),G12=gastoDe(sumaDias(hy,-365));
  const FILAS=["Pistones","Reparación de ejes","Consumibles","Barras y tornillos","Horno","Otros"],celda=(G,k)=>{const r=G.R[k];if(!r||!r.n)return"—";return r.e?eur(r.e)+(r.sp?" + "+fmtN(r.sp)+" sin precio":""):fmtN(r.n)+(k==="Reparación de ejes"?(r.n===1?" rep.":" rep."):" ud")+" · sin precio";};
  const sinPA=[...G12.sinP.values()];
  const gasto=el("div",{style:"display:grid;gap:10px"},[el("dl",{class:"kpis num"},[["Este mes",eur(GM.tot)],["Este año",eur(GA.tot)],["Últimos 12 meses",eur(G12.tot)],["Pistones en el año",String(GA.pist)]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))),
    el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},["","Este mes","Este año","12 meses"].map((t,i)=>el("th",{class:i?"r":"",text:t})))),
      el("tbody",{},FILAS.filter(k=>G12.R[k]&&G12.R[k].n).map(k=>el("tr",{},[el("td",{text:k}),el("td",{class:"r num",text:celda(GM,k)}),el("td",{class:"r num",text:celda(GA,k)}),el("td",{class:"r num",text:celda(G12,k)})]))),
      el("tfoot",{},el("tr",{},[el("td",{},el("b",{text:"Total"})),el("td",{class:"r num"},el("b",{text:eur(GM.tot)})),el("td",{class:"r num"},el("b",{text:eur(GA.tot)})),el("td",{class:"r num"},el("b",{text:eur(G12.tot)}))]))])),
    sinPA.length?el("div",{class:"banner w"},[el("div",{text:sinPA.length+(sinPA.length===1?" artículo usado en esta máquina no tiene precio":" artículos usados en esta máquina no tienen precio")+", así que su gasto no suma en euros."}),
      el("button",{type:"button",class:"btn sec peq",style:"margin-top:8px",text:"Poner precios",onclick:()=>preciosArts(sinPA,reabre(4))})]):null,
    el("p",{class:"hint",text:"Las reparaciones de eje cuentan cuando el eje vuelve del taller, al precio de reparación de su modelo."})]);
  /* --- Documentos: los de la máquina y los planos de lo que monta --- */
  const planos=[];mods.forEach(x=>{if((x.docs||[]).length)planos.push({t:"Eje "+x.ref,s:(x.docs||[]).length+" plano"+((x.docs||[]).length>1?"s":""),ir:()=>fichaModelo(x)});});
  asign0.filter(a=>TEC(a.fam)&&revVig(a)).forEach(a=>planos.push({t:FAM[a.fam]+" "+nomBT(a),s:"plano "+revTxt(revVig(a).n),ir:()=>ficha(a)}));
  asign0.filter(a=>!TEC(a.fam)&&(a.docs||[]).length).forEach(a=>planos.push({t:a.desc,s:(a.docs||[]).length+" documento"+((a.docs||[]).length>1?"s":""),ir:()=>ficha(a)}));
  if(mo&&(mo.docs||[]).length)planos.push({t:"Molde "+mo.cod,s:(mo.docs||[]).length+" documento(s)",ir:()=>formMolde(mo)});
  const docsPl=planos.length?el("div",{class:"lst"},planos.map(x=>el("button",{type:"button",class:"it",onclick:abre(x.ir)},[el("div",{class:"ppal"},[el("div",{class:"t1",text:x.t}),el("div",{class:"t2",text:x.s})])]))):el("p",{class:"hint",text:"Ninguna pieza de esta máquina tiene planos todavía (se suben en la ficha del modelo de eje o de la barra)."});
  const S=(t,...kids)=>el("section",{class:"card"},[t?el("div",{class:"hd"},el("h2",{text:t})):null,el("div",{class:"bd",style:"display:grid;gap:10px"},kids.filter(Boolean))]);
  objPage({tipo:"Inyectora",ruta:["Máquinas",m.nave||"Planta"],titulo:m.cod,sub:B[0]&&B[0].textContent,
    kpis:[["Ø pistón",dm||"—"],["Pistones 3 meses",String(c3)],["Último cambio",u?"hace "+dias(u.f,hy)+" d":"—"],["Stock de ese Ø",pa?fmtN(stockDe(pa.id)):"—",pa&&nivel(pa)==="bad"?"neg":""]],
    tab:tab0||0,
    tabs:[["Ahora",[S("Lo que monta ahora",ahora,avisosMaq(m).length?el("div",{class:"banner w",text:avisosMaq(m).join(" · ")}):null),S("Ficha técnica",B[5])]],
      ["Consumibles",C(9,10,11,12,13)],["Ejes",C(6,7,8)],["Historial",[S(null,hist)]],["Gasto",[S(null,gasto,B[14],B[15])]],
      ["Documentos",[S("De la máquina",B[17],B[18]),S("Planos de lo que monta",docsPl)]]],
    acts:[{t:"Editar ficha",cls:"sec",fn:()=>{setTimeout(()=>formMaquina(m),0);}},{t:"Eje en cuarentena",cls:"sec",fn:()=>{setTimeout(()=>formCuarentena(m.id),0);}},
      {t:"Cambio de pistón",fn:()=>{Object.assign(draft.p,{maq:m.id,diam:dm||draft.p.diam,alm:""});setTimeout(()=>{irA("pist");const f=document.getElementById("pForm");if(f)f.scrollIntoView();},0);}}]});}
/* editar lo que monta una máquina: en cada campo se tocan las opciones */
function formMaquina(m0){const m=m0?Object.assign({},m0):{};const ex=!!m0;const P=JSON.parse(JSON.stringify(plantilla()));let tocada=false;
  const val=JSON.parse(JSON.stringify(ex?valoresDe(m0):{}));
  const enUso=ex&&(todosMov().some(x=>x.maq===m.id)||todosPist().some(p=>p.maq===m.id));
  const codI=inp("mqCod",m.cod,v=>m.cod=v,{autocomplete:"off"});if(enUso)codI.disabled=true;
  const campos=el("div",{class:"frm",style:"gap:14px"});
  const verTodo={},tocadoC={};const av={};P.filter(c=>c.auto).forEach(c=>{av[c.id]=ex?autoVal(c,m0):[];});const nuevosArt=[];
  const pinta=()=>{campos.textContent="";P.forEach(c=>{
    if(c.auto==="horno"){const sel0=new Set(av[c.id]);const h=hornoSel(P,val);const mc=h.marca||"";
      /* solo los recambios de la marca del horno (y los que no son de ninguna marca); lo ya marcado siempre se ve */
      const deOtra=a=>{const t=norm(a.desc);return mc&&h.marcas.some(x=>x!==mc&&wrd(t,x))&&!wrd(t,mc);};
      const todos=artsActivos().filter(a=>a.fam==="horno");const ver=todos.filter(a=>verTodo[c.id]||sel0.has(a.id)||!deOtra(a));const ocu=todos.length-ver.length;
      const gs=[...new Set(ver.map(a=>a.grupo||"Otros"))].sort((x,y)=>(GRUPOS_H.indexOf(x)+99)%99-(GRUPOS_H.indexOf(y)+99)%99);
      const chip=a=>el("button",{type:"button",class:"chip","aria-pressed":String(sel0.has(a.id)),text:a.desc.replace(/^Tubo dosificador\s+/i,"")+(a.cod&&!a.desc.includes(a.cod)?" · "+a.cod:""),
        onclick:()=>{if(sel0.has(a.id))sel0.delete(a.id);else{/* tubo dosificador: solo uno */if(a.grupo==="Tubos dosificadores")todos.filter(z=>z.grupo==="Tubos dosificadores").forEach(z=>sel0.delete(z.id));sel0.add(a.id);}av[c.id]=Array.from(sel0);pinta();}});
      campos.appendChild(el("div",{style:"display:flex;flex-direction:column;gap:8px"},[el("div",{style:"font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2)",text:c.nom+(mc?" · "+cap(mc):" · elige antes el modelo de horno para filtrar")}),
        ...gs.map(g=>el("div",{style:"display:flex;flex-direction:column;gap:4px"},[el("div",{class:"sub",text:g}),el("div",{style:"display:flex;flex-wrap:wrap;gap:6px"},ver.filter(a=>(a.grupo||"Otros")===g).sort((x,y)=>x.desc.localeCompare(y.desc,"es",{numeric:true})).map(chip))])),
        ocu?el("div",{},el("button",{type:"button",class:"chip",style:"border-style:dotted",text:"ver los "+ocu+" de la otra marca",onclick:()=>{verTodo[c.id]=true;pinta();}})):null]));return;}
    if(c.auto){const sel0=new Set(av[c.id]);const multi=c.auto!=="piston";
      const chips=autoOps(c).concat(nuevosArt.filter(a=>a.fam===c.auto).map(a=>({id:a.id,t:a.desc}))).map(o=>el("button",{type:"button",class:"chip","aria-pressed":String(sel0.has(o.id)),text:o.t,onclick:()=>{if(sel0.has(o.id))sel0.delete(o.id);else{if(!multi)sel0.clear();sel0.add(o.id);}av[c.id]=Array.from(sel0);pinta();}}));
      if(c.auto==="barra"||c.auto==="tornillo")chips.push(el("button",{type:"button",class:"chip",style:"border-style:dashed",text:"＋ otra",onclick:()=>{const t=(prompt("Nombre de la nueva "+(c.auto==="barra"?"barra expulsora":"tornillo tope")+":")||"").trim();if(!t)return;
        let a=cat.articulos.concat(nuevosArt).find(z=>norm(z.desc)===norm(t));if(!a){a={id:uid(),desc:t,almPpal:(origenRepo()||{}).id||null,alms:[(origenRepo()||{}).id].filter(Boolean),ubic:null,cod:null,fam:c.auto,ud:"ud",diam:null,min:0,pp:0,plazo:null,prov:null,activo:true,iny:[]};nuevosArt.push(a);}
        sel0.add(a.id);av[c.id]=Array.from(sel0);pinta();}}));
      campos.appendChild(el("div",{style:"display:flex;flex-direction:column;gap:6px"},[el("div",{style:"font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2)",text:c.nom+(multi?" · puedes marcar varias":"")}),
        el("div",{style:"display:flex;flex-wrap:wrap;gap:6px"},chips.length?chips:[el("span",{class:"hint",text:c.auto==="eje"?"No hay modelos de eje en el catálogo.":"Nada en el catálogo todavía."})])]));return;}
    let lista=c.ops,ocultas=0;
    if(c.segunHorno){const h=hornoSel(P,val);if(h.marca||h.medida){const ok=c.ops.filter(o=>cuadra(o,h));
      if(!verTodo[c.id]){const antes=(val[c.id]||[]).map(id=>c.ops.find(o=>o.id===id)).filter(Boolean);const s=(val[c.id]||[]).filter(id=>ok.some(o=>o.id===id));
      if(!s.length&&antes.length){/* cambia el horno: se busca la misma medida en el nuevo */antes.forEach(a=>{const resto=norm(a.t).split(/[^a-z0-9,.]+/).filter(w=>w&&!h.marcas.includes(w));const o=ok.find(z=>especifica(z,h)&&resto.every(w=>wrd(norm(z.t),w)));if(o&&!s.includes(o.id))s.push(o.id);});}
      if(!s.length&&!tocadoC[c.id]){const esp=ok.filter(o=>especifica(o,h));if(esp.length===1)s.push(esp[0].id);}val[c.id]=s;ocultas=c.ops.length-ok.length;lista=ok;}}}
    const sel0=new Set(val[c.id]||[]);
    const chips=lista.map(o=>el("button",{type:"button",class:"chip","aria-pressed":String(sel0.has(o.id)),text:o.t,onclick:()=>{tocadoC[c.id]=true;if(sel0.has(o.id))sel0.delete(o.id);else{if(!c.multi)sel0.clear();sel0.add(o.id);}val[c.id]=Array.from(sel0);pinta();}}));
    if(ocultas)chips.push(el("button",{type:"button",class:"chip",style:"border-style:dotted",text:"ver las otras "+ocultas,onclick:()=>{verTodo[c.id]=true;pinta();}}));
    chips.push(el("button",{type:"button",class:"chip",style:"border-style:dashed",text:"＋ otra",onclick:()=>{const t=(prompt("Nueva opción para «"+c.nom+"»:")||"").trim();if(!t)return;
      let o=c.ops.find(z=>norm(z.t)===norm(t));if(!o){o={id:"o"+uid(),t,art:null};c.ops.push(o);tocada=true;}if(!c.multi)sel0.clear();sel0.add(o.id);val[c.id]=Array.from(sel0);pinta();}}));
    campos.appendChild(el("div",{style:"display:flex;flex-direction:column;gap:6px"},[el("div",{style:"font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2)",text:c.nom+(c.segunHorno?" · según el horno":"")+(c.multi?" · puedes marcar varias":"")}),
      el("div",{style:"display:flex;flex-wrap:wrap;gap:6px"},chips)]));});
    if(!P.length)campos.appendChild(el("p",{class:"hint",text:"No hay campos. Créalos en Catálogo > Ficha de inyectoras > Configurar campos."}));};
  pinta();
  dlg(ex?"Ficha de la "+m0.cod:"Nueva inyectora",[
    el("div",{class:"row"},[fld("Código (p. ej. F53)",codI),fld("Nave",sel("mqNave",[["Nave 1","Nave 1"],["Nave 2","Nave 2"]],m.nave,v=>m.nave=v,"—"))]),
    el("p",{class:"hint",text:"Toca lo que monta esta máquina. Vuelve a tocar para quitarlo. Si falta una opción, «＋ otra»."}),campos,
    fld("Notas",inp("mqNot",m.notas,v=>m.notas=v,{autocomplete:"off"}))],
   [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const cod=String(m.cod||"").trim().toUpperCase();if(!cod){toast("Pon el código");return false;}
     if(cat.maquinas.some(z=>z.id!==m.id&&z.cod.toUpperCase()===cod)){toast("Ya existe "+cod);return false;}
     const ficha={};Object.keys(val).forEach(k=>{if((val[k]||[]).length)ficha[k]=val[k];});
     const nue=Object.assign({},m0||{},{id:ex?m0.id:cod,cod,nave:m.nave||null,notas:String(m.notas||"").trim()||null,ficha});
     ["modelo","cierre","horno","hornoKg","canaleta","cazo","alea","molde"].forEach(k=>delete nue[k]);
     const i=cat.maquinas.findIndex(z=>z.id===nue.id);if(i>=0)cat.maquinas[i]=nue;else cat.maquinas.push(nue);
     /* lo automático se guarda donde vive: modelos de eje, artículos y Ø de pistón */
     P.filter(c=>c.auto).forEach(c=>{const S=new Set(av[c.id]||[]);
       if(c.auto==="piston"){nue.diam=[...S][0]||null;return;}
       if(c.auto==="eje"){(cat.modelos||[]).forEach(x=>{const cs=inyDe(x);const tiene=cs.includes(cod),quiere=S.has(x.id);if(tiene===quiere)return;x.iny=codsIny(quiere?cs.concat([cod]):cs.filter(z=>z!==cod));});return;}
       nuevosArt.filter(a=>S.has(a.id)&&!cat.articulos.includes(a)).forEach(a=>cat.articulos.push(a));
       cat.articulos.filter(a=>a.fam===c.auto).forEach(a=>{const tiene=(a.iny||[]).includes(nue.id),quiere=S.has(a.id);if(tiene===quiere)return;a.iny=quiere?(a.iny||[]).concat([nue.id]):(a.iny||[]).filter(z=>z!==nue.id);});});
     if(tocada||!cat.fichaIny)cat.fichaIny={campos:P};
     try{await saveCat();toast("Guardado");}catch(e){return false;}render(true);setTimeout(()=>fichaIny(nue),0);}}]);
  const bx=document.querySelectorAll(".dlg");if(bx.length)bx[bx.length-1].style.maxWidth="620px";}
/* configurar los campos de la ficha y sus opciones */
function formPlantilla(){const P=JSON.parse(JSON.stringify(plantilla()));const box=el("div",{class:"frm",style:"gap:14px"});
  const artSel=o=>{const s=el("select",{style:"font-size:14px;padding:6px 8px;width:auto;max-width:190px"},[el("option",{value:"",text:"— sin artículo —"})].concat(artsActivos().slice().sort((a,b)=>a.desc.localeCompare(b.desc)).map(a=>el("option",{value:a.id,text:a.desc}))));s.value=o.art||"";s.onchange=()=>{o.art=s.value||null;};return s;};
  const pinta=()=>{box.textContent="";P.forEach((c,ci)=>{
    const nom=el("input",{value:c.nom,style:"font-weight:600"});nom.oninput=()=>{c.nom=nom.value;};
    if(c.auto){box.appendChild(el("div",{class:"card",style:"box-shadow:none"},el("div",{class:"bd frm",style:"gap:8px"},[
      el("div",{style:"display:flex;gap:6px;align-items:center"},[nom,el("button",{type:"button",class:"btn sec peq",text:"↑","aria-label":"Subir",disabled:ci===0,onclick:()=>{P.splice(ci-1,0,P.splice(ci,1)[0]);pinta();}}),
        el("button",{type:"button",class:"btn txt peq",text:"Quitar",onclick:()=>{P.splice(ci,1);pinta();}})]),
      el("p",{class:"hint",text:"Automático: "+AUTO[c.auto]+". Sus opciones salen solas del catálogo."})])));return;}
    const ops=el("div",{style:"display:flex;flex-direction:column;gap:6px"},c.ops.map((o,oi)=>{const t=el("input",{value:o.t,placeholder:"Opción",style:"font-size:15px;padding:7px 9px"});t.oninput=()=>{o.t=t.value;};
      return el("div",{style:"display:flex;gap:6px;align-items:center"},[t,artSel(o),el("button",{type:"button",class:"btn txt peq","aria-label":"Quitar opción",text:"✕",onclick:()=>{c.ops.splice(oi,1);pinta();}})]);}));
    box.appendChild(el("div",{class:"card",style:"box-shadow:none"},el("div",{class:"bd frm",style:"gap:8px"},[
      el("div",{style:"display:flex;gap:6px;align-items:center"},[nom,el("button",{type:"button",class:"btn sec peq",text:"↑","aria-label":"Subir",disabled:ci===0,onclick:()=>{P.splice(ci-1,0,P.splice(ci,1)[0]);pinta();}}),
        el("button",{type:"button",class:"btn txt peq",text:"Borrar",onclick:()=>{if(confirm("¿Borrar el campo «"+c.nom+"»? Se quita de todas las fichas."))P.splice(ci,1);pinta();}})]),
      el("label",{class:"chk",style:"font-size:14px"},[el("input",{type:"checkbox",checked:!!c.multi,onchange:e=>{c.multi=e.target.checked;}}),"Se pueden marcar varias opciones a la vez"]),
      el("label",{class:"chk",style:"font-size:14px"},[el("input",{type:"checkbox",checked:!!c.segunHorno,onchange:e=>{c.segunHorno=e.target.checked;}}),"Depende del horno (se proponen las opciones que llevan la marca y medida del horno de la máquina)"]),
      ops,el("button",{type:"button",class:"btn sec peq",style:"align-self:flex-start",text:"＋ Añadir opción",onclick:()=>{c.ops.push({id:"o"+uid(),t:"",art:null});pinta();}})])));});
    box.appendChild(el("button",{type:"button",class:"btn sec",text:"＋ Añadir campo",onclick:()=>{P.push({id:"c"+uid(),nom:"Nuevo campo",multi:false,ops:[]});pinta();}}));
    const faltan=Object.keys(AUTO).filter(k=>!P.some(c=>c.auto===k));
    if(faltan.length)box.appendChild(el("div",{class:"acciones"},faltan.map(k=>el("button",{type:"button",class:"btn sec peq",text:"＋ "+({eje:"Eje de inyección",piston:"Pistón",barra:"Barras expulsoras",tornillo:"Tornillos tope"})[k]+" (automático)",onclick:()=>{P.push({id:"x-"+k,nom:({eje:"Eje de inyección",piston:"Pistón",barra:"Barras expulsoras",tornillo:"Tornillos tope"})[k],auto:k});pinta();}}))));};
  pinta();
  dlg("Campos de la ficha de inyectora",[el("p",{class:"hint",text:"Cada campo es una cosa que puede montar una máquina (canaleta, cazo, horno…) y sus opciones son lo que se elige. Si enlazas una opción con un artículo del almacén, en la ficha se ve cuántos hay."}),box],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{P.forEach(c=>{c.nom=(c.nom||"").trim()||"Sin nombre";if(c.auto)return;c.ops=c.ops.filter(o=>(o.t||"").trim()).map(o=>Object.assign(o,{t:o.t.trim()}));});
      P.forEach(c=>{if(c.auto)delete c.ops;});cat.fichaIny={campos:P};try{await saveCat();toast("Campos guardados");}catch(e){return false;}render(true);}}]);
  const bx=document.querySelectorAll(".dlg");if(bx.length)bx[bx.length-1].style.maxWidth="640px";}
/* fichas de todas las inyectoras en Excel */
async function excelMaquinas(btn){if(!downloads){toast("Esta vista no permite descargar archivos");return;}btn.disabled=true;
  try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();const P=plantilla();const H=["Inyectora","Nave"].concat(P.map(c=>c.nom)).concat(["Notas"]);
    const rows=cat.maquinas.slice().sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true})).map(m=>{const v=valoresDe(m);const r={"Inyectora":m.cod,"Nave":m.nave||""};
      P.forEach(c=>{r[c.nom]=c.auto?autoTxt(c,m):(v[c.id]||[]).map(id=>(c.ops.find(o=>o.id===id)||{}).t).filter(Boolean).join(", ");});r["Notas"]=m.notas||"";return r;});
    const ws=X.utils.json_to_sheet(rows,{header:H});ws["!cols"]=H.map(()=>({wch:18}));X.utils.book_append_sheet(wb,ws,"Inyectoras");
    X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([["Cómo rellenarla"],["Una fila por inyectora. En cada columna escribe la opción tal cual (si son varias, separadas por comas)."],["Si escribes una opción que no existe, se crea."],["Si añades una columna nueva, se crea como campo nuevo de la ficha."],["Lo que dejes en blanco se quita de la ficha, salvo eje, pistón, barras y tornillos, que en blanco se dejan como están."],[""],["Opciones que hay:"]].concat(P.map(c=>[c.nom+": "+(c.auto?(c.auto==="eje"?"códigos de modelo de eje (p. ej. 2.3.C)":c.auto==="piston"?"80, 90 esp…":"nombre del artículo tal cual (si no existe, se crea)"):c.ops.map(o=>o.t).join(" | "))]))),"Opciones");
    await downloads.save({filename:"Fichas_inyectoras.xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Excel descargado");
  }catch(e){toast(e&&e.code==="declined"?"Descarga cancelada":"No se pudo crear el Excel");}btn.disabled=false;}
async function importarMaquinas(file){try{await cargarXLSX();}catch(e){toast("No se pudo cargar el lector de Excel");return;}
  let rows;try{const X=window.XLSX;const wb=X.read(await file.arrayBuffer());rows=X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});}catch(e){toast("No se pudo leer el archivo");return;}
  const P=JSON.parse(JSON.stringify(plantilla()));const nuevasOps=[],cambios=[],autoX=[],camposNuevos=[];
  /* una columna que no es ningún campo se convierte en campo nuevo de la ficha */
  const cabs=[];rows.forEach(r=>Object.keys(r).forEach(k=>{if(!cabs.includes(k))cabs.push(k);}));
  cabs.forEach(k=>{const n=norm(k);if(!n||/^__empty/.test(n)||["inyectora","nave","notas"].includes(n)||P.some(c=>norm(c.nom)===n))return;
    const c={id:"c"+uid(),nom:k.trim(),multi:false,ops:[]};P.push(c);camposNuevos.push(c.nom);});
  const val=(r,nom)=>{for(const k of Object.keys(r))if(norm(k)===norm(nom))return String(r[k]).trim();return null;};
  rows.forEach(r=>{let c=String(val(r,"Inyectora")||"").toUpperCase().replace(/\s/g,"");if(!c)return;if(/^\d+$/.test(c))c="F"+c;
    const m=cat.maquinas.find(z=>z.cod.toUpperCase()===c);const ficha={};const antes=m?valoresDe(m):{};
    P.forEach(cp=>{const t=val(r,cp.nom);if(cp.auto){const sk=x=>String(x||"").split(/\s*[,;]\s*/).filter(Boolean).map(norm).sort().join("|");if(t&&(!m||sk(t)!==sk(autoTxt(cp,m))))autoX.push({c,cp,t});return;}if(t==null){if(antes[cp.id])ficha[cp.id]=antes[cp.id];return;}
      const ids=t.split(/\s*[,;]\s*/).filter(Boolean).map(x=>{let o=cp.ops.find(z=>norm(z.t)===norm(x));if(!o){o={id:"o"+uid(),t:x,art:null};cp.ops.push(o);nuevasOps.push(cp.nom+": "+x);}return o.id;});
      if(ids.length)ficha[cp.id]=cp.multi?ids:[ids[0]];});
    const nv=val(r,"Nave"),nt=val(r,"Notas");
    const nue={nave:nv!=null?(/2/.test(nv)?"Nave 2":nv?"Nave 1":null):(m&&m.nave)||null,notas:nt!=null?nt||null:(m&&m.notas)||null,ficha};
    if(!m||JSON.stringify(valoresDe(m))!==JSON.stringify(ficha)||m.nave!==nue.nave||(m.notas||null)!==nue.notas)cambios.push({c,m,nue});});
  if(!cambios.length&&!nuevasOps.length&&!autoX.length&&!camposNuevos.length){toast("No hay cambios");return;}
  dlg("Importar fichas de inyectoras",[el("p",{text:(n=>n===1?"1 inyectora cambia":n+" inyectoras cambian")(new Set(cambios.filter(x=>x.m).map(x=>x.c).concat(autoX.map(x=>x.c))).size)+(cambios.some(x=>!x.m)?" · nuevas: "+cambios.filter(x=>!x.m).map(x=>x.c).join(", "):"")}),
    camposNuevos.length?el("div",{class:"banner"},[el("b",{text:"Campos nuevos en la ficha: "}),camposNuevos.join(" · ")]):null,
    nuevasOps.length?el("div",{class:"banner"},[el("b",{text:"Opciones nuevas: "}),nuevasOps.slice(0,15).join(" · ")+(nuevasOps.length>15?"…":"")]):null],
    [{t:"Cancelar",cls:"sec"},{t:"Importar",fn:async()=>{cambios.forEach(({c,m,nue})=>{if(m){Object.assign(m,nue);["modelo","cierre","horno","hornoKg","canaleta","cazo","alea","molde"].forEach(k=>delete m[k]);}else cat.maquinas.push(Object.assign({id:c,cod:c},nue));});
      autoX.forEach(({c,cp,t})=>{const m=cat.maquinas.find(z=>z.cod.toUpperCase()===c);if(!m)return;const xs=t.split(/\s*[,;]\s*/).filter(Boolean);
        if(cp.auto==="piston"){const d=xs[0]?"Ø "+xs[0].replace(/ø/i,"").trim().toLowerCase().replace(/\s*(especial|esp|e)$/," esp"):null;m.diam=d&&DIAM.includes(d)?d:null;return;}
        if(cp.auto==="eje"){const S=new Set(xs.map(x=>{const mo=(cat.modelos||[]).find(z=>norm(z.cod)===norm(x)||norm(z.ref)===norm(x));return mo&&mo.id;}).filter(Boolean));
          (cat.modelos||[]).forEach(x=>{const cs=inyDe(x);const tiene=cs.includes(m.cod),quiere=S.has(x.id);if(tiene!==quiere)x.iny=codsIny(quiere?cs.concat([m.cod]):cs.filter(z=>z!==m.cod));});return;}
        const S=new Set(xs.map(x=>{let a=cat.articulos.find(z=>z.fam===cp.auto&&norm(z.desc)===norm(x));if(!a){a={id:uid(),desc:x,almPpal:(origenRepo()||{}).id||null,alms:[(origenRepo()||{}).id].filter(Boolean),ubic:null,cod:null,fam:cp.auto,ud:"ud",diam:null,min:0,pp:0,plazo:null,prov:null,activo:true,iny:[]};cat.articulos.push(a);}return a.id;}));
        cat.articulos.filter(a=>a.fam===cp.auto).forEach(a=>{const tiene=(a.iny||[]).includes(m.id),quiere=S.has(a.id);if(tiene!==quiere)a.iny=quiere?(a.iny||[]).concat([m.id]):(a.iny||[]).filter(z=>z!==m.id);});});
      cat.fichaIny={campos:P};try{await saveCat();toast("Fichas importadas");}catch(e){return false;}render(true);}}]);}
function cerrarDlgs(){document.querySelectorAll(".dlg-ov,.bus-ov").forEach(o=>o.remove());}
/* búsqueda: «F-54», «F 54», «F054» y «F54» son lo mismo; un código de máquina busca la máquina exacta (F5 no saca F54) */
const nfq=t=>norm(String(t||"")).replace(/\bf[\s\-]*0*(\d{1,3})\b/g,"f$1");
const tokQ=raw=>nfq(raw).split(/\s+/).filter(Boolean);
const casa=(hay,toks)=>{const n=nfq(hay);return toks.every(t=>/^f\d+$/.test(t)?new RegExp("\\b"+t+"\\b").test(n):n.includes(t));};
function abrirBuscador(){cerrarDlgs();const ov=el("div",{class:"bus-ov",role:"dialog","aria-label":"Buscar"});const res=el("div",{class:"bus-res"});
  const q=el("input",{type:"search",id:"busQ",placeholder:"Artículo, eje, modelo, plano, albarán, inyectora…",autocomplete:"off",value:draft.bq||""});
  const cerrar=()=>{ov.remove();document.removeEventListener("keydown",esc);};const esc=e=>{if(e.key==="Escape")cerrar();};document.addEventListener("keydown",esc);
  const ir=fn=>()=>{cerrar();fn();};
  function marca(txt,toks){const n=el("span");let t=String(txt||"");if(!toks.length){n.textContent=t;return n;}
    const re=new RegExp("("+toks.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")+")","gi");t.split(re).forEach((part,i)=>n.appendChild(i%2?el("mark",{text:part}):document.createTextNode(part)));return n;}
  function pinta(){draft.bq=q.value;res.textContent="";const raw=q.value.trim();const toks=tokQ(raw);
    const wrap=el("div",{class:"wrap"});res.appendChild(wrap);
    if(!toks.length){wrap.appendChild(el("p",{class:"hint",text:"Escribe lo que buscas: «manguera», «2.3.C-3», «IDRA 550», «001150A26», «F53», «Ø 80», «E3-B2»…"}));return;}
    const ok=h=>casa(h,toks);
    const grupo=(tit,items)=>{if(!items.length)return;wrap.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:tit+" ("+items.length+")"})),el("div",{class:"lst"},items.slice(0,12))]));};
    const oTok=raw.split(/\s+/).filter(Boolean);
    grupo("Artículos",artsActivos().filter(a=>ok([a.desc,a.cod,a.ubic,FAM[a.fam],a.diam,provN(a.prov),a.plano,a.notas,(a.iny||[]).map(maqN).join(" "),(a.docs||[]).map(d=>d.nombre).join(" ")].join(" "))).map(a=>el("button",{type:"button",class:"it",onclick:ir(()=>ficha(a))},[el("div",{class:"ppal"},[el("div",{class:"t1"},marca(a.desc,oTok)),el("div",{class:"t2"},marca([a.cod,a.ubic?""+a.ubic:null,cat.almacenes.map(l=>[l.nom,stockDe(a.id,l.id)]).filter(x=>x[1]).map(x=>x[0]+" "+fmtN(x[1])).join(" · ")].filter(Boolean).join(" · "),oTok))]),el("div",{class:"cant num"},[el("b",{text:fmtN(stockDe(a.id))}),el("small",{text:a.ud})])])));
    grupo("Modelos de eje y planos",(cat.modelos||[]).filter(m=>ok([m.ref,m.cod,m.long,m.iny,m.diamP,m.plano,m.notas,(m.docs||[]).map(d=>d.nombre).join(" ")].join(" "))).map(m=>el("button",{type:"button",class:"it",onclick:ir(()=>fichaModelo(m))},[el("div",{class:"ppal"},[el("div",{class:"t1"},marca(m.ref,oTok)),el("div",{class:"t2"},marca([m.cod,m.iny,m.plano?"plano "+m.plano:null].filter(Boolean).join(" · "),oTok))]),el("span",{class:"pill "+((m.docs||[]).length?"ok":"na"),text:(m.docs||[]).length?"Con plano":"Sin plano"})])));
    grupo("Ejes",ejes.filter(e=>ok([e.cod,ejeRef(e),e.mod,obsE(e),ultAlb(e.cod)].join(" "))).sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true})).map(e=>{const[t,c]=EST_E[e.estado]||["—","na"];return el("button",{type:"button",class:"it",onclick:ir(()=>fichaEje(e))},[el("div",{class:"ppal"},[el("div",{class:"t1"},marca(e.cod+" · "+ejeRef(e),oTok)),el("div",{class:"t2"},marca([ultAlb(e.cod)?"Alb. "+ultAlb(e.cod):null,obsE(e)].filter(Boolean).join(" · "),oTok))]),el("span",{class:"pill "+c,text:t})]);}));
    const AL=albaranes();grupo("Albaranes",Object.keys(AL).filter(ok).sort().reverse().map(k=>el("button",{type:"button",class:"it",onclick:ir(()=>fichaAlbaran(k,AL[k]))},[el("div",{class:"ppal"},[el("div",{class:"t1"},marca(k,oTok)),el("div",{class:"t2",text:AL[k].reps.length+" ejes · "+AL[k].movs.length+" entradas"})])])));
    grupo("Moldes",moldes().filter(x=>ok([x.cod,x.pieza,x.diam,x.notas].join(" "))).map(x=>el("button",{type:"button",class:"it",onclick:ir(()=>formMolde(x))},[el("div",{class:"ppal"},[el("div",{class:"t1"},marca(moldeTxt(x),oTok)),el("div",{class:"t2",text:[x.diam?"pistón "+x.diam:null,cat.maquinas.filter(m=>hoyDe(m).molde===x.id).map(m=>"puesto en "+m.cod).join(", ")].filter(Boolean).join(" · ")})])])));
    grupo("Contenedores",contens().filter(x=>ok([x.cod,tipoCont(x)?txtTipo(tipoCont(x)):"",txtDonde(x),x.grab,x.notas].join(" "))).map(x=>el("button",{type:"button",class:"it",onclick:ir(()=>fichaCont(x))},[el("div",{class:"ppal"},[el("div",{class:"t1"},marca(x.cod,oTok)),el("div",{class:"t2",text:[tipoCont(x)?txtTipo(tipoCont(x)):null,txtDonde(x)].filter(Boolean).join(" · ")})])])));
    grupo("Inyectoras",cat.maquinas.filter(m=>ok(hayMaq(m))).sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true})).map(m=>el("button",{type:"button",class:"it",onclick:ir(()=>fichaIny(m))},[el("div",{class:"ppal"},[el("div",{class:"t1"},marca(m.cod,oTok)),el("div",{class:"t2",text:[m.nave].concat(lineasFicha(m).map(l=>l.txt)).concat([(cat.modelos||[]).filter(x=>inyDe(x).includes(m.cod)).map(x=>x.ref).join(", ")]).filter(Boolean).join(" · ")})])])));
    grupo("Proveedores",cat.proveedores.filter(p=>ok([p.nom,p.sum,p.contacto,p.tel,p.email,p.cif,p.codCli].join(" "))).map(p=>el("button",{type:"button",class:"it",onclick:ir(()=>formSimple("proveedores",p))},[el("div",{class:"ppal"},[el("div",{class:"t1"},marca(p.nom,oTok)),el("div",{class:"t2",text:[p.sum,p.contacto,p.tel].filter(Boolean).join(" · ")})])])));
    if(!wrap.children.length)wrap.appendChild(el("div",{class:"empty",text:"No hay nada que coincida con «"+raw+"»."}));}
  q.addEventListener("input",pinta);
  ov.appendChild(el("div",{class:"bus-top"},[q,el("button",{type:"button",class:"btn sec peq",text:"Cerrar",onclick:cerrar})]));ov.appendChild(res);document.body.appendChild(ov);pinta();setTimeout(()=>q.focus(),30);}
document.getElementById("lupa").addEventListener("click",abrirBuscador);


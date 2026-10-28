/* ---------- Buscador: «todo sobre la colada…», lo raro, previsión de coste y cruces con el Almacén ----------
   Los cruces (pistones y ejes por tonelada, resumen del mes) leen los datos del Almacén de la misma base de datos. */
function intencionC2(q){const o={q,nave:naveQ(q),mat:matQ(q),prov:provQ(q),modo2:true};const M=(modo,x)=>Object.assign(o,{modo},x||{});
  if(/\bresumen (del|de este|de) mes\b|\bresumen mensual\b|\bcomo (ha ido|va) el mes\b/.test(q))return M("resumen",{per:periodoC(q)});
  if(/\bpor tonelada\b|\bpor cada tonelada\b|\bpor (cada )?(1000|mil) kg\b|\bpor tn\b/.test(q))return M(/\b(gasta|gastan|dinero|euros|coste|cuesta)\b/.test(q)?"gastotn":"pisttn",{per:periodoC(q)});
  if(/\b(todo (sobre|de)|ficha (de|completa)|historia de|informacion (de|sobre)|dime todo)\b/.test(q)){const l=lotes.find(x=>reC(nqC(x.nombre)).test(" "+q+" "));return M("todocol",{lote:l||null});}
  if(/\brelevos?\b.*\b(mas de lo normal|anormal\w*|raro|se ha disparado|fuera de lo normal|demasiado)\b|\b(mas de lo normal|demasiado)\b.*\brelevos?\b/.test(q))return M("relraro");
  if(/\bmenos kilos\b|\bkilos de menos\b|\bfaltan kilos\b|\bfalta(n)? (aluminio|material|fardos)\b|\bdiferencias?\b.*\b(albaran|proveedor|recuento)\b|\b(no cuadra|descuadre)\b/.test(q))return M("descuadre");
  if(/\bpor maquina\b.*\b(en marcha|funcionando)?\b|\bpor cada maquina\b|\brendimiento\b|\bkg por maquina\b|\bkilos por maquina\b/.test(q)&&/\b(aluminio|kg|kilos|fardos|gasta|gastan|consum\w*|rendimiento)\b/.test(q))return M("kgmaq");
  if(/\b(cuanto|que) (me |nos )?(va|van) a costar\b|\bcoste previsto\b|\bprevision de coste\b|\bcuanto (voy|vamos) a gastar\b/.test(q))return M("costemes");
  return null;}

/* datos del Almacén para los cruces (se leen una vez cada 5 minutos) */
let ALM_C=null;
async function almDatos(){if(ALM_C&&Date.now()-ALM_C.t<3e5)return ALM_C;const sb=window.sbColada;if(!sb||!sb.from)return null;
  const r=await sb.from("docs").select("col,id,data").in("col",["alm_cat","alm_pist","alm_rep","alm_ejes","alm_mov"]);if(r.error)throw r.error;
  const D={t:Date.now(),cat:{},pist:[],rep:[],ejes:[],mov:[]};(r.data||[]).forEach(x=>{const it=(x.data&&x.data.items)||[];
    if(x.col==="alm_cat"&&x.id==="app")D.cat=x.data||{};else if(x.col==="alm_pist")D.pist=D.pist.concat(it);else if(x.col==="alm_rep")D.rep=D.rep.concat(it);else if(x.col==="alm_mov")D.mov=D.mov.concat(it);else if(x.col==="alm_ejes")D.ejes.push(x.data||{});});
  const ms=D.cat.maquinas||[],arts=D.cat.articulos||[],mods=D.cat.modelos||[];const num=v=>{const n=parseFloat(String(v==null?"":v).replace(",","."));return isFinite(n)&&n>0?n:0;};
  const naveCod=c=>NAVES.find(n=>MAQ[n].includes(c))||null;
  D.naveDe=x=>{if(!x)return null;const m=ms.find(z=>z.id===x)||ms.find(z=>z.cod===x);const c=m?m.cod:x;return naveCod(c)||(m&&/nave\s*2/i.test(m.nave||"")?"Nave 2":m&&/nave\s*1/i.test(m.nave||"")?"Nave 1":null);};
  D.precioPist=d=>{const a=arts.find(z=>z.fam==="piston"&&z.diam===d);return a?num(a.precio):0;};
  D.costeRep=r=>{if(!(r.res==="ok"&&r.rec))return 0;const e=D.ejes.find(z=>z.cod===r.eje);const m=e&&mods.find(z=>z.cod===e.mod);return m?num(m.precioRep):0;};
  D.salidas=()=>D.mov.filter(m=>m.tipo==="salida"&&!/^Cambio de pistón/.test(m.nota||"")).map(m=>{const a=arts.find(z=>z.id===m.art);return{f:m.f,nave:D.naveDe(m.maq)||(/2/.test(m.nave||"")?"Nave 2":/1/.test(m.nave||"")?"Nave 1":null),eur:(+m.cant||0)*(a?num(a.precio):0)};});
  ALM_C=D;return D;}

function pintaIntC2(E,res,pon){const h=hoy(),S=saldos();
  const add=n=>{if(n)res.appendChild(n);return n;},frase=t=>add(el("p",{class:"bq-resp",text:t})),nota=t=>add(el("p",{class:"hint",text:t}));
  const ent=(t,extra)=>add(el("div",{class:"bq-ent"},[el("span",{class:"sub",text:"Buscando en "}),el("b",{text:t})].concat((extra||[]).filter(Boolean).map(x=>el("span",{class:"chip-sel on",text:x})))));
  const card=(tit,nodos)=>add(el("div",{class:"card"},[tit?el("div",{class:"hd"},[el("h2",{text:tit})]):null].concat(nodos)));
  const it=(t1,t2,der,der2,on)=>el(on?"button":"div",{type:on?"button":null,class:"bq-it",style:on?null:"cursor:default",onclick:on||null},[el("div",{class:"bq-p"},[el("b",{text:t1})].concat((Array.isArray(t2)?t2:[t2]).filter(Boolean).map(x=>el("span",{class:"sub",text:x})))),
    der!=null?el("div",{class:"bq-c num"},[el("b",{text:der}),der2?el("span",{class:"sub",text:der2}):null]):null]);
  const tabla=(cab,filas,der)=>el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},cab.map((c,i)=>el("th",{class:(der||[]).includes(i)?"r":"",text:c})))]),
    el("tbody",{},filas.map(f=>el("tr",{},f.map((c,i)=>el("td",{class:(der||[]).includes(i)?"r num":"","data-l":cab[i],text:c==null?"":String(c)})))))])]);
  const copiar=(t,txt)=>add(el("button",{type:"button",class:"btn sec",style:"margin-top:8px",text:t,onclick:async()=>{try{await navigator.clipboard.writeText(txt);toast("Copiado: pégalo donde quieras");}catch(e){toast("No se pudo copiar");}}}));
  const consNave=(d,hh)=>{const o={};movs().forEach(r=>{if(r.t!=="C"||!r.f||r.f<d||r.f>hh)return;const l=lotes.find(x=>x.id===r.o);if(!l)return;o[l.nave]=(o[l.nave]||0)+Math.abs(kgAp(r,S));});return o;};
  const mesesAtras=n=>{const out=[];for(let i=n-1;i>=0;i--){const d=new Date(+h.slice(0,4),+h.slice(5,7)-1-i,1);out.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));}return out;};

  if(E.modo==="todocol"){const l=E.lote;if(!l){ent("todo sobre una colada");frase("Dime el código de la colada, por ejemplo «todo sobre la colada C25073».");return;}
    const s=S[l.id]||{kg:0,fa:0},ms=todosMovs().filter(r=>r.o===l.id||r.d===l.id).sort((a,b)=>(a.f||"").localeCompare(b.f||""));const C=ms.filter(r=>r.t==="C"&&r.o===l.id),en=ms.find(r=>r.t==="E"&&r.d===l.id);
    const pr=precioDe((l.entrada||h).slice(0,7),l.proveedor,l.material),kgC=C.reduce((a,r)=>a+Math.abs(kgAp(r,S)),0),faC=C.reduce((a,r)=>a+(r.fa||0),0);
    const dias_=new Set(C.map(r=>r.f)),ult=C.length?C[C.length-1].f:null;ent("todo sobre la colada",[l.nombre]);
    frase("La colada "+l.nombre+" ("+MAT[l.material].nom+", "+l.nave+") "+(s.fa>0?"tiene "+fmt(s.fa)+" fardos ("+fmt(s.kg)+" kg)"+(l.donde==="externo"?" en el almacén externo":" en la nave"):"está gastada")+". Se han consumido "+fmt(faC)+" fardos ("+fmt(kgC)+" kg) en "+dias_.size+(dias_.size===1?" día.":" días."));
    card("Datos",[tabla(["Dato","Valor"],[["Entrada",l.entrada?dmyA(l.entrada):"—"],["Proveedor",l.proveedor||"—"],["Albarán",l.albaran||(en&&en.a)||"—"],["Entró",(en?fmt(en.fa||0)+" fardos · "+fmt(en.kg||0)+" kg":fmt(l.fardosInv||0)+" fardos · "+fmt(l.kgInv||0)+" kg (inventario)")],
      ["Peso por fardo",S[l.id]&&S[l.id].ratio?fmt(S[l.id].ratio)+" kg":"—"],["Precio",pr.v?eurKg(pr.v)+" €/kg · vale "+eurE(s.kg*pr.v/1000)+" lo que queda":"sin precio"],["Último consumo",ult?dmyA(ult):"—"]])]);
    const R={};C.forEach(r=>{const k=r.f+"|"+(r.u||"");R[k]=(R[k]||0)+(r.fa||0);});
    if(C.length)card("Consumos",[el("div",{class:"bq-lst"},Object.entries(R).reverse().slice(0,40).map(([k,fa])=>{const[f,u]=k.split("|");return it(Mayus(diaLargo(f)),u?"Relevo de "+u.toLowerCase():null,fmt(fa)+(fa===1?" fardo":" fardos"),null);}))]);
    const otros=ms.filter(r=>r.t==="T"||r.t==="A");if(otros.length)card("Traslados y recuentos",[el("div",{class:"bq-lst"},otros.map(r=>it((r.t==="T"?"Traslado":"Recuento")+" · "+dmyA(r.f),r.n||null,(r.fa>0?"+":"")+fmt(r.fa||0)+" fardos",null)))]);
    add(el("button",{type:"button",class:"btn",style:"margin-top:8px",text:"Abrir la ficha de la colada",onclick:()=>abrirFicha(l.id)}));return;}

  if(E.modo==="relraro"){if(!primerEvMaq()){frase("Hace falta el estado de las máquinas (Stock › Máquinas) para comparar relevos con las mismas máquinas.");return;}
    const d30=ymd(new Date(Date.now()-30*864e5)),C=movs().filter(r=>r.t==="C"&&r.f&&r.f>=d30&&r.f<h&&r.u),R={};
    C.forEach(r=>{const l=lotes.find(x=>x.id===r.o);if(!l)return;if(E.nave&&l.nave!==E.nave)return;const k=r.f+"|"+r.u+"|"+l.nave+"|"+l.material;R[k]=(R[k]||0)+(r.fa||0);});
    const X=Object.entries(R).map(([k,fa])=>{const[f,u,n,m]=k.split("|"),c=cuentaMaq(estadoMaq(f,u),n),mq=m==="L-2521-B"?c.a:c.b;return{f,u,n,m,fa,mq,por:mq>0?fa/mq:null};}).filter(x=>x.por!=null);
    const med={};X.forEach(x=>{const k=x.n+"|"+x.m;(med[k]=med[k]||[]).push(x.por);});const mm=k=>{const v=med[k];return v.reduce((a,b)=>a+b,0)/v.length;};
    const raros=X.filter(x=>med[x.n+"|"+x.m].length>=6&&x.por>mm(x.n+"|"+x.m)*1.5).sort((a,b)=>b.por/mm(b.n+"|"+b.m)-a.por/mm(a.n+"|"+a.m));
    ent("relevos que gastan más de lo normal",["últimos 30 días",E.nave]);
    frase(raros.length?raros.length+(raros.length===1?" relevo ha gastado":" relevos han gastado")+" más de 1,5 veces lo normal por máquina en marcha. El que más: "+diaLargo(raros[0].f)+", "+raros[0].u.toLowerCase()+" en "+raros[0].n+" ("+fmt(raros[0].fa)+" fardos con "+raros[0].mq+" máquinas).":"Ningún relevo de los últimos 30 días se sale de lo normal.");
    const porT={};X.forEach(x=>{const k=x.n+" · "+MAT[x.m].nom+"|"+x.u;(porT[k]=porT[k]||[]).push(x.por);});
    if(raros.length)card(null,[el("div",{class:"bq-lst"},raros.slice(0,20).map(x=>it(Mayus(diaLargo(x.f))+" · "+x.u,x.n+" · "+MAT[x.m].nom+" · "+x.mq+" máquinas · lo normal "+(Math.round(mm(x.n+"|"+x.m)*x.mq*10)/10).toLocaleString("es-ES")+" fardos",fmt(x.fa),"fardos")))]);
    card("Media por máquina en marcha y relevo",[tabla(["Línea","Relevo","Fardos por máquina"],Object.entries(porT).sort().map(([k,v])=>{const[a,u]=k.split("|");return[a,u,(Math.round(v.reduce((s,x)=>s+x,0)/v.length*100)/100).toLocaleString("es-ES")];}),[2])]);
    nota("Se compara cada relevo con la media de su línea, dividiendo por las máquinas que estaban en marcha. Un relevo con el cargador de bebederos roto gasta más.");return;}

  if(E.modo==="descuadre"){const A=todosMovs().filter(r=>r.t==="A"&&!r.h&&r.f),G={};
    A.forEach(r=>{const l=lotes.find(x=>x.id===(r.o||r.d));if(!l)return;const p=l.proveedor||"Sin proveedor",sg=r.o&&!r.d?-1:1,g=G[p]=G[p]||{p,fa:0,kg:0,n:0,col:new Set()};g.fa+=sg*(r.fa||0);g.kg+=sg*Math.abs(kgAp(r,S));g.n++;g.col.add(l.nombre);});
    const L=Object.values(G).sort((a,b)=>a.kg-b.kg);ent("diferencias en los recuentos, por proveedor");
    if(!L.length){frase("No hay ajustes de recuento apuntados, así que no hay diferencias que comparar.");return;}
    const neg=L.filter(x=>x.kg<0);frase(neg.length?"Donde más falta al contar es en el material de "+neg[0].p+": "+fmt(-neg[0].kg)+" kg ("+fmt(-neg[0].fa)+" fardos) de menos en "+neg[0].col.size+(neg[0].col.size===1?" colada.":" coladas."):"En los recuentos no ha faltado material de ningún proveedor.");
    card(null,[el("div",{class:"bq-lst"},L.map(x=>it(x.p,x.n+(x.n===1?" ajuste":" ajustes")+" · "+[...x.col].slice(0,6).join(", ")+(x.col.size>6?"…":""),(x.kg>0?"+":"")+fmt(x.kg)+" kg",(x.fa>0?"+":"")+fmt(x.fa)+" fardos")))]);
    nota("Los kilos de cada colada salen de su albarán, así que la única forma de ver si un proveedor manda de menos es al contar: aquí salen los ajustes de los recuentos (negativo = faltaba). Para el peso de los fardos pregunta «cuánto pesa de media un fardo».");return;}

  if(E.modo==="kgmaq"){if(!primerEvMaq()){frase("Hace falta el estado de las máquinas (Stock › Máquinas) para repartir el consumo entre las que estaban en marcha.");return;}
    const d30=ymd(new Date(Date.now()-30*864e5)),C=movs().filter(r=>r.t==="C"&&r.f&&r.f>=d30&&r.f<h&&r.u),R={};
    C.forEach(r=>{const l=lotes.find(x=>x.id===r.o);if(!l)return;const k=r.f+"|"+r.u+"|"+l.nave+"|"+l.material;R[k]=(R[k]||0)+Math.abs(kgAp(r,S));});
    const G={};Object.entries(R).forEach(([k,kg])=>{const[f,u,n,m]=k.split("|"),c=cuentaMaq(estadoMaq(f,u),n),mq=m==="L-2521-B"?c.a:c.b;if(!(mq>0))return;const g=G[n+"|"+m]=G[n+"|"+m]||{v:[],kg:0};g.v.push(kg/mq);g.kg+=kg;});
    const L=Object.entries(G).filter(([k])=>(!E.nave||k.startsWith(E.nave))&&(!E.mat||k.endsWith(E.mat))).map(([k,g])=>({k,m:g.v.reduce((a,b)=>a+b,0)/g.v.length,n:g.v.length}));ent("aluminio por máquina en marcha",["últimos 30 días",E.nave,E.mat?MAT[E.mat].nom:null]);
    if(!L.length){frase("No hay relevos con consumo y máquinas en marcha para calcularlo.");return;}
    frase(L.map(x=>etiqLinea(x.k)+": "+fmt(x.m)+" kg por máquina y relevo").join(" · ")+".");
    card(null,[el("div",{class:"bq-lst"},L.map(x=>it(etiqLinea(x.k),x.n+" relevos medidos",fmt(x.m)+" kg","por máquina y relevo")))]);
    nota("Kilos de cada relevo divididos entre las máquinas en marcha con esa aleación. Sirve para comparar naves y ver si una gasta más por máquina.");return;}

  if(E.modo==="costemes"){const mes=mesDe(h),fin=finDeMes(mes),d1=mes+"-01";let ya=0;const G={};
    movs().forEach(r=>{if(r.t!=="C"||!r.f||r.f<d1||r.f>h)return;const l=lotes.find(x=>x.id===r.o);if(!l)return;const v=Math.abs(kgAp(r,S))*precioMedio(mes,l.material).v/1000;ya+=v;const k=key(l.nave,l.material);G[k]=G[k]||{ya:0,fal:0};G[k].ya+=v;});
    const SM=simLineas(fin);let falta=0;Object.values(SM).forEach(s=>{const[,m]=s.k.split("|"),M=mediaCamion(m),kgFa=M&&M.fa?M.kg/M.fa:(KG_CAM/FA_CAM),g=s.dias.filter(x=>x.f>h).reduce((a,x)=>a+x.g,0)*kgFa,v=g*precioMedio(mes,m).v/1000;falta+=v;G[s.k]=G[s.k]||{ya:0,fal:0};G[s.k].fal+=v;});
    ent("coste del aluminio de "+nomMes(mes));frase("Este mes el aluminio costará unos "+eurE(ya+falta)+": "+eurE(ya)+" ya consumidos y unos "+eurE(falta)+" de aquí a fin de mes.");
    card("Por línea",[tabla(["Línea","Ya","Falta","Total"],Object.entries(G).filter(([,g])=>g.ya+g.fal>0).map(([k,g])=>[etiqLinea(k),eurE(g.ya),eurE(g.fal),eurE(g.ya+g.fal)]),[1,2,3])]);
    nota("Lo que falta sale de la previsión de consumo (máquinas en marcha y relevos del calendario), al precio medio del mes.");return;}

  /* --- cruces con el Almacén --- */
  const cargando=el("p",{class:"hint",text:"Cargando los datos del Almacén…"});res.appendChild(cargando);
  almDatos().then(D=>{cargando.remove();if(!D){frase("Esto cruza con los datos del Almacén y solo funciona en la app publicada (con sesión iniciada).");return;}
    if(E.modo==="pisttn"||E.modo==="gastotn"){const meses_=E.per?[E.per.d.slice(0,7)]:mesesAtras(6),din=E.modo==="gastotn";
      const filas=[];const tot={};meses_.forEach(m=>{const d=m+"-01",hh=m===mesDe(h)?h:finDeMes(m),al=consNave(d,hh);
        NAVES.filter(n=>!E.nave||n===E.nave).forEach(n=>{const ps=D.pist.filter(p=>p.f>=d&&p.f<=hh&&D.naveDe(p.maq)===n),np=ps.reduce((a,p)=>a+(+p.cant||1),0),ep=ps.reduce((a,p)=>a+(+p.cant||1)*D.precioPist(p.diam),0);
          const rp=D.rep.filter(r=>r.rec&&r.rec>=d&&r.rec<=hh&&D.naveDe(r.maq)===n),er=rp.reduce((a,r)=>a+D.costeRep(r),0),es=D.salidas().filter(x=>x.f>=d&&x.f<=hh&&x.nave===n).reduce((a,x)=>a+x.eur,0);
          const t=(al[n]||0)/1000;filas.push({m,n,t,np,ep,er,es});const T=tot[n]=tot[n]||{t:0,np:0,eu:0};T.t+=t;T.np+=np;T.eu+=ep+er+es;});});
      ent(din?"gasto del almacén por tonelada de aluminio":"pistones por tonelada de aluminio",[E.per?E.per.t:"últimos 6 meses",E.nave]);
      frase(Object.entries(tot).map(([n,T])=>n+": "+(T.t?(din?eurE(T.eu/T.t)+" por tonelada":(Math.round(T.np/T.t*100)/100).toLocaleString("es-ES")+" pistones por tonelada"):"sin consumo de aluminio")+" ("+fmt(T.t)+" t)").join(" · ")+".");
      card("Por mes",[tabla(din?["Mes","Nave","Toneladas","Pistones €","Ejes €","Consumibles €","€ por t"]:["Mes","Nave","Toneladas","Pistones","Por tonelada"],
        filas.filter(x=>x.t||x.np||x.ep||x.er||x.es).map(x=>din?[Mayus(nomMes(x.m)),x.n,fmt(x.t),eurE(x.ep),eurE(x.er),eurE(x.es),x.t?eurE((x.ep+x.er+x.es)/x.t):"—"]:[Mayus(nomMes(x.m)),x.n,fmt(x.t),fmt(x.np),x.t?(Math.round(x.np/x.t*100)/100).toLocaleString("es-ES"):"—"]),din?[2,3,4,5,6]:[2,3,4])]);
      nota("El aluminio se apunta por nave, no por máquina, así que el cruce es por nave: pistones y gasto del Almacén de las máquinas de cada nave entre las toneladas de aluminio consumidas en ella.");return;}
    if(E.modo==="resumen"){const P=E.per||{d:mesDe(h)+"-01",h,t:"este mes"},al=consNave(P.d,P.h);const {B}=bloques();
      const ent_=movs().filter(r=>r.t==="E"&&r.f&&r.f>=P.d&&r.f<=P.h).reduce((a,r)=>a+Math.abs(kgAp(r,S)),0);let coste=0;movs().forEach(r=>{if(r.t!=="C"||!r.f||r.f<P.d||r.f>P.h)return;const l=lotes.find(x=>x.id===r.o);if(l)coste+=Math.abs(kgAp(r,S))*precioMedio(r.f.slice(0,7),l.material).v/1000;});
      const gr=movs().filter(r=>r.t==="G"&&!r.aj&&r.f&&r.f>=P.d&&r.f<=P.h&&typeof r.kg==="number"&&r.kg<0).reduce((a,r)=>a-r.kg,0);
      const ps=D.pist.filter(p=>p.f>=P.d&&p.f<=P.h),np=ps.reduce((a,p)=>a+(+p.cant||1),0),ep=ps.reduce((a,p)=>a+(+p.cant||1)*D.precioPist(p.diam),0),rp=D.rep.filter(r=>r.rec&&r.rec>=P.d&&r.rec<=P.h),er=rp.reduce((a,r)=>a+D.costeRep(r),0);
      const es=D.salidas().filter(x=>x.f>=P.d&&x.f<=P.h).reduce((a,x)=>a+x.eur,0),tal=D.ejes.filter(e=>e.estado==="reparacion").length,tT=Object.values(al).reduce((a,b)=>a+b,0)/1000;
      const lin=["RESUMEN "+Mayus(P.t).toUpperCase()+" (a "+dmyA(h)+")","","ALUMINIO","- Consumido: "+fmt(tT*1000)+" kg ("+NAVES.map(n=>n+" "+fmt(al[n]||0)+" kg").join(" · ")+")","- Entrado: "+fmt(ent_)+" kg","- Coste del consumido: "+eurE(coste),
        "- Stock ahora: "+Object.keys(B).filter(k=>B[k].fa>0).map(k=>etiqLinea(k)+" "+fmt(B[k].faN)+" f nave"+(B[k].faE?" + "+fmt(B[k].faE)+" f externo":"")).join(" · "),"- Granalla de cobre: "+fmt(gr)+" kg consumidos · quedan "+fmt(granallaKg())+" kg","",
        "ALMACÉN","- Pistones cambiados: "+fmt(np)+" · "+eurE(ep)+(tT?" ("+(Math.round(np/tT*100)/100).toLocaleString("es-ES")+" por tonelada)":""),"- Reparaciones de eje recibidas: "+rp.length+" · "+eurE(er)+" · "+tal+" ejes en el taller ahora","- Otros consumibles: "+eurE(es),
        "","TOTAL: "+eurE(coste+ep+er+es)+" (aluminio + almacén)"];
      ent("resumen",[P.t]);frase(Mayus(P.t)+": "+fmt(tT)+" t de aluminio ("+eurE(coste)+"), "+fmt(np)+(np===1?" pistón y ":" pistones y ")+rp.length+(rp.length===1?" reparación de eje":" reparaciones de eje")+". Total "+eurE(coste+ep+er+es)+".");
      add(el("div",{class:"card"},[el("pre",{style:"white-space:pre-wrap;font:inherit;margin:0;padding:12px 14px",text:lin.join("\n")})]));copiar("Copiar el resumen",lin.join("\n"));return;}
  }).catch(e=>{cargando.remove();frase("No se han podido leer los datos del Almacén ("+(e&&e.message||"error")+").");});}

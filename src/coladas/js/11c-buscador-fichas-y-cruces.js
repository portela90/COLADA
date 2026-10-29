/* ---------- Buscador: «todo sobre la colada…», lo raro, previsión de coste y cruces con el Almacén ----------
   Los cruces (pistones y ejes por tonelada, resumen del mes) leen los datos del Almacén de la misma base de datos. */
function intencionC2(q){const o={q,nave:/\bnave\s*(1|uno)\b/.test(q)&&/\bnave\s*(2|dos)\b|\by (la )?(2|dos)\b/.test(q)?null:naveQ(q),mat:matQ(q),prov:provQ(q),modo2:true};const M=(modo,x)=>Object.assign(o,{modo},x||{});
  if(/\b(camion(es)?|cargas?|viajes?|bp)\b/.test(q)&&!/\b(quedan?|faltan?|por traer|contratad\w*|tiene que|tienen que|va a|van a|previst\w*|planificad\w*|manana|pasado manana|proxim\w*|pedir|pido)\b/.test(q)&&(/\b(cuantos|cuantas|entrad\w*|entrado|llegad\w*|llegado|venido|traid\w*|externo|proveedor(es)?|bp|subid\w*)\b/.test(q)||o.prov||periodoC(q))&&!/\bultim[oa]\b/.test(q))return M("camiones",{per:periodoC(q)});
  {const c=[/\b(tengo|tenemos|hay|stock|queda|quedan|existencias)\b/,/\b(entrad\w*|entrado|llegad\w*|recibid\w*)\b/,/\b(consum\w*|gastad\w*|gasto)\b/].filter(re=>re.test(q)).length;
    if(c>=2||/\b(informe|balance|movimiento) (de|del|por) (cada )?naves?\b|\b(informe|balance) (del )?aluminio\b|\bcada nave\b.*\b(informe|balance)\b/.test(q))return M("balance",{per:periodoC(q)});}
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

  if(E.modo==="camiones"){const P=E.per||{d:mesDe(h)+"-01",h,t:"este mes"},hh=P.h>h?h:P.h,Sf=conCorte(hh,saldos);
    const V=[];todosMovs().forEach(r=>{if(r.h||!r.f||r.f<P.d||r.f>hh)return;const l=lotes.find(x=>x.id===(r.t==="E"?r.d:r.o));if(!l||!MAT[l.material])return;if(E.nave&&l.nave!==E.nave)return;if(E.mat&&l.material!==E.mat)return;
      if(r.t==="E"){if(E.prov&&nqC(l.proveedor||r.p||"")!==nqC(E.prov))return;V.push({t:"P",f:r.f,nave:l.nave,mat:l.material,fa:Math.abs(r.fa||0),kg:Math.abs(kgAp(r,Sf)),prov:l.proveedor||r.p||"Sin proveedor",ext:dondeEn(l,r.f)==="externo",col:l.nombre,alb:r.a||l.albaran||""});}
      else if(r.t==="T"&&!E.prov){const n=Math.abs(r.fa||0)||+((String(r.n||"").match(/(\d+) fardos/)||[])[1]||0),rt=(Sf[l.id]&&Sf[l.id].ratio)||0;V.push({t:"B",f:r.f,nave:l.nave,mat:l.material,fa:n,kg:Math.abs(r.kg||0)||Math.round(n*rt),col:l.nombre});}});
    const pv=V.filter(x=>x.t==="P"),aN=pv.filter(x=>!x.ext),aE=pv.filter(x=>x.ext),bp=V.filter(x=>x.t==="B");
    ent("camiones que han entrado",[P.t,E.nave,E.mat?MAT[E.mat].nom:null,E.prov]);
    if(!V.length){frase("No ha entrado ningún camión "+perTxt(P)+".");return;}
    const sumF=L=>L.reduce((a,x)=>a+x.fa,0),sumK=L=>L.reduce((a,x)=>a+x.kg,0),cam=n=>n+(n===1?" camión":" camiones"),porNave=L=>NAVES.map(n=>[n,L.filter(x=>x.nave===n)]).filter(z=>z[1].length);
    if(E.prov)frase(Mayus(perTxt(P))+" han llegado "+cam(pv.length)+" de "+E.prov+" ("+porNave(pv).map(([n,L])=>n+": "+L.length).join(" · ")+")"+(aE.length?", "+aE.length+" de ellos directos al externo":"")+".");else
    frase(Mayus(perTxt(P))+" han llegado "+(E.nave?"a "+E.nave+" ":"a las naves ")+cam(aN.length+bp.length)+": "+aN.length+" del proveedor y "+bp.length+" del almacén externo"+(aE.length?". Además, "+cam(aE.length)+" del proveedor fueron directos al externo":"")+".");
    add(el("div",{class:"card"},[tabla(["","Del proveedor","Del externo (BP)","Total a nave"],porNave(aN.concat(bp)).map(([n,L])=>{const a=L.filter(x=>x.t==="P"),b=L.filter(x=>x.t==="B");return[n,cam(a.length)+" · "+fmt(sumF(a))+" f",cam(b.length)+" · "+fmt(sumF(b))+" f",cam(L.length)+" · "+fmt(sumK(L))+" kg"];}).concat([["Total",cam(aN.length)+" · "+fmt(sumF(aN))+" f",cam(bp.length)+" · "+fmt(sumF(bp))+" f",cam(aN.length+bp.length)+" · "+fmt(sumK(aN.concat(bp)))+" kg"]]),[1,2,3])]));
    if(aE.length)card("Del proveedor directos al externo",[el("div",{class:"bq-lst"},aE.map(x=>it(x.col+" · "+dmyA(x.f),x.nave+" · "+MAT[x.mat].nom+" · "+x.prov,fmt(x.fa)+" f",fmt(x.kg)+" kg")))]);
    const GP={};pv.forEach(x=>{const g=GP[x.prov]=GP[x.prov]||{n:0,fa:0,kg:0};g.n++;g.fa+=x.fa;g.kg+=x.kg;});
    if(pv.length)card("Del proveedor, por proveedor",[el("div",{class:"bq-lst"},Object.entries(GP).sort((a,b)=>b[1].n-a[1].n).map(([p,g])=>it(p,fmt(g.fa)+" fardos · "+fmt(g.kg)+" kg",cam(g.n),null)))]);
    card("Cada camión",[el("div",{class:"bq-lst"},V.slice().sort((a,b)=>b.f.localeCompare(a.f)).map(x=>it(Mayus(diaLargo(x.f))+" · "+(x.t==="B"?"del externo (BP)":x.ext?"proveedor → externo":"proveedor"),[x.nave+" · "+MAT[x.mat].nom+" · "+x.col,x.t==="P"?x.prov+(x.alb?" · albarán "+x.alb:""):null],fmt(x.fa)+" f",fmt(x.kg)+" kg")))]);
    copiar("Copiar",["CAMIONES · "+Mayus(P.t)+" ("+dmyA(P.d)+" a "+dmyA(hh)+")"].concat(porNave(aN.concat(bp)).map(([n,L])=>{const a=L.filter(x=>x.t==="P"),b=L.filter(x=>x.t==="B");return"- "+n+": "+cam(L.length)+" ("+a.length+" del proveedor, "+b.length+" del externo)";})).concat(["TOTAL a nave: "+cam(aN.length+bp.length)+" ("+aN.length+" del proveedor · "+bp.length+" del externo)",aE.length?"Del proveedor al externo: "+cam(aE.length):null].filter(Boolean)).join("\n"));
    nota("Cada entrada con su albarán cuenta como un camión del proveedor; cada subida del almacén externo a la nave, como un camión del externo (BP).");return;}
  if(E.modo==="balance"){const P=E.per||{d:mesDe(h)+"-01",h,t:"este mes"},hh=P.h>h?h:P.h,d0=diaAntes(P.d);const Si=conCorte(d0,saldos),Sf=conCorte(hh,saldos);
    const R={};LINEAS.forEach(([n,m])=>{R[key(n,m)]={n,m,ini:{N:0,E:0,kgN:0,kgE:0},fin:{N:0,E:0,kgN:0,kgE:0},ent:{fa:0,kg:0},sub:{fa:0,kg:0},con:{fa:0,kg:0},aju:{fa:0,kg:0}};});
    const suma=(o,SS,f)=>lotes.forEach(l=>{const x=SS[l.id],y=R[key(l.nave,l.material)];if(!x||!y||(!x.fa&&Math.abs(x.kg)<1))return;const t=y[o];if(dondeEn(l,f)==="externo"){t.E+=x.fa;t.kgE+=x.kg;}else{t.N+=x.fa;t.kgN+=x.kg;}});
    suma("ini",Si,d0);suma("fin",Sf,hh);
    todosMovs().forEach(r=>{if(r.h||!r.f||r.f<P.d||r.f>hh)return;const l=lotes.find(x=>x.id===(r.o||r.d));if(!l)return;const y=R[key(l.nave,l.material)];if(!y)return;
      const fa=Math.abs(typeof r.fa==="number"?r.fa:0),kg=Math.abs(kgAp(r,Sf));
      if(r.t==="E"){y.ent.fa+=fa;y.ent.kg+=kg;}else if(r.t==="C"){y.con.fa+=fa;y.con.kg+=kg;}else if(r.t==="A"){const sg=r.d?1:-1;y.aju.fa+=sg*fa;y.aju.kg+=sg*kg;}
      else if(r.t==="T"){const n=fa||+((String(r.n||"").match(/(\d+) fardos/)||[])[1]||0),rt=(Sf[l.id]&&Sf[l.id].ratio)||(Si[l.id]&&Si[l.id].ratio)||0;y.sub.fa+=n;y.sub.kg+=kg||Math.round(n*rt);}});
    const L=Object.values(R).filter(x=>(!E.nave||x.n===E.nave)&&(!E.mat||x.m===E.mat)&&(x.ini.N||x.ini.E||x.fin.N||x.fin.E||x.ent.kg||x.con.kg||x.sub.fa));
    const ahora=hh===h,ftx=ahora?"ahora":"el "+dmyA(hh);ent("aluminio por nave",[P.t,E.nave,E.mat?MAT[E.mat].nom:null]);
    if(!L.length){frase("No hay movimientos ni stock de aluminio "+perTxt(P)+".");return;}
    const porN={};L.forEach(x=>{const g=porN[x.n]=porN[x.n]||{N:0,E:0,kgN:0,kgE:0,ent:0,entF:0,con:0,conF:0,sub:0};g.N+=x.fin.N;g.E+=x.fin.E;g.kgN+=x.fin.kgN;g.kgE+=x.fin.kgE;g.ent+=x.ent.kg;g.entF+=x.ent.fa;g.con+=x.con.kg;g.conF+=x.con.fa;g.sub+=x.sub.fa;});
    const fr=Object.entries(porN).map(([n,g])=>n+": "+(ahora?"tiene ":"tenía ")+fmt(g.kgN)+" kg ("+fmt(g.N)+" fardos) en la nave"+(g.E?" y "+fmt(g.kgE)+" kg ("+fmt(g.E)+" f) en el externo":"")+"; "+perTxt(P)+" han entrado "+fmt(g.ent)+" kg ("+fmt(g.entF)+" f)"+(g.sub?", se han subido "+fmt(g.sub)+" f del externo":"")+" y ha consumido "+fmt(g.con)+" kg ("+fmt(g.conF)+" f)");
    fr.forEach(t=>frase(t+"."));
    const c=(kg,fa)=>fmt(kg)+" kg · "+fmt(fa)+" f";
    L.forEach(x=>card(etiqLinea(key(x.n,x.m)),[tabla(["","Kilos · fardos"],[["Al empezar ("+dmyA(P.d)+")",c(x.ini.kgN+x.ini.kgE,x.ini.N+x.ini.E)],["Ha entrado",c(x.ent.kg,x.ent.fa)],x.sub.fa?["Subido del externo",c(x.sub.kg,x.sub.fa)]:null,["Consumido",c(x.con.kg,x.con.fa)],
      (x.aju.kg||x.aju.fa)?["Ajustes de recuento",(x.aju.kg>0?"+":"")+c(x.aju.kg,x.aju.fa)]:null,["En la nave "+ftx,c(x.fin.kgN,x.fin.N)],x.fin.E||x.ini.E?["En el externo "+ftx,c(x.fin.kgE,x.fin.E)]:null].filter(Boolean),[1])]));
    const tx=["ALUMINIO POR NAVE · "+Mayus(P.t)+" ("+dmyA(P.d)+" a "+dmyA(hh)+")",""].concat(...L.map(x=>[etiqLinea(key(x.n,x.m)).toUpperCase(),"- Al empezar: "+c(x.ini.kgN+x.ini.kgE,x.ini.N+x.ini.E),"- Ha entrado: "+c(x.ent.kg,x.ent.fa),x.sub.fa?"- Subido del externo: "+c(x.sub.kg,x.sub.fa):null,"- Consumido: "+c(x.con.kg,x.con.fa),
      (x.aju.kg||x.aju.fa)?"- Ajustes: "+c(x.aju.kg,x.aju.fa):null,"- En la nave "+ftx+": "+c(x.fin.kgN,x.fin.N),x.fin.E?"- En el externo "+ftx+": "+c(x.fin.kgE,x.fin.E):null,""].filter(v=>v!==null)));
    copiar("Copiar el informe",tx.join("\n"));nota("«Ha entrado» son los camiones del proveedor; lo que se sube del almacén externo a la nave va aparte porque ya estaba en stock.");return;}
  if(E.modo==="todocol"){const l=E.lote;if(!l){ent("todo sobre una colada");frase("Dime el código de la colada, por ejemplo «todo sobre la colada C25073».");return;}
    const s=S[l.id]||{kg:0,fa:0},ms=todosMovs().filter(r=>r.o===l.id||r.d===l.id).sort((a,b)=>(a.f||"").localeCompare(b.f||""));const C=ms.filter(r=>r.t==="C"&&r.o===l.id),en=ms.find(r=>r.t==="E"&&r.d===l.id);
    const pr=precioDe((l.entrada||h).slice(0,7),l.proveedor,l.material),kgC=C.reduce((a,r)=>a+Math.abs(kgAp(r,S)),0),faC=C.reduce((a,r)=>a+(r.fa||0),0);
    const dias_=new Set(C.map(r=>r.f)),ult=C.length?C[C.length-1].f:null;ent("todo sobre la colada",[l.nombre]);
    frase("La colada "+l.nombre+" ("+MAT[l.material].nom+", "+l.nave+") "+(s.fa>0?"tiene "+fmt(s.fa)+" fardos ("+fmt(s.kg)+" kg)"+(l.donde==="externo"?" en el almacén externo":" en la nave"):"está gastada")+". Se han consumido "+fmt(faC)+" fardos ("+fmt(kgC)+" kg) en "+dias_.size+(dias_.size===1?" día.":" días."));
    card("Datos",[tabla(["Dato","Valor"],[["Entrada",l.entrada?dmyA(l.entrada):"—"],["Proveedor",l.proveedor||"—"],["Albarán",l.albaran||(en&&en.a)||"—"],["Entró",(en?fmt(en.fa||0)+" fardos · "+fmt(en.kg||0)+" kg":fmt(l.fardosInv||0)+" fardos · "+fmt(l.kgInv||0)+" kg (inventario)")],
      ["Peso por fardo",S[l.id]&&S[l.id].ratio?fmt(S[l.id].ratio)+" kg":"—"],["Precio",pr.v?eurKg(pr.v)+" €/kg"+(s.kg>1?" · vale "+eurE(s.kg*pr.v/1000)+" lo que queda":""):"sin precio"],["Último consumo",ult?dmyA(ult):"—"]])]);
    const R={};C.forEach(r=>{const k=r.f+"|"+(r.u||"");R[k]=(R[k]||0)+(r.fa||0);});
    if(C.length)card("Consumos",[el("div",{class:"bq-lst"},Object.entries(R).reverse().slice(0,40).map(([k,fa])=>{const[f,u]=k.split("|");return it(Mayus(diaLargo(f)),u?"Relevo de "+u.toLowerCase():null,fmt(fa)+(fa===1?" fardo":" fardos"),null);}))]);
    const otros=ms.filter(r=>r.t==="T"||r.t==="A");if(otros.length)card("Traslados y recuentos",[el("div",{class:"bq-lst"},otros.map(r=>it((r.t==="T"?"Traslado":"Recuento")+" · "+dmyA(r.f),r.n||null,(r.fa>0?"+":"")+fmt(r.fa||0)+" fardos",null)))]);
    add(el("button",{type:"button",class:"btn",style:"margin-top:8px",text:"Abrir la ficha de la colada",onclick:()=>abrirFicha(l.id)}));return;}

  if(E.modo==="relraro"){if(!primerEvMaq()){frase("Hace falta el estado de las máquinas (Stock › Máquinas) para comparar relevos con las mismas máquinas.");return;}
    const d30=ymd(new Date(Date.now()-30*864e5)),C=movs().filter(r=>r.t==="C"&&r.f&&r.f>=d30&&r.f<h&&r.u),R={};
    C.forEach(r=>{const l=lotes.find(x=>x.id===r.o);if(!l)return;if(E.nave&&l.nave!==E.nave)return;const k=r.f+"|"+r.u+"|"+l.nave+"|"+l.material;R[k]=(R[k]||0)+(r.fa||0);});
    const X=Object.entries(R).map(([k,fa])=>{const[f,u,n,m]=k.split("|"),c=cuentaMaq(estadoMaq(f,u),n),mq=m==="L-2521-B"?c.a:c.b;return{f,u,n,m,fa,mq,por:mq>0?fa/mq:null};}).filter(x=>x.por!=null);
    const med={};X.forEach(x=>{const k=x.n+"|"+x.m;(med[k]=med[k]||[]).push(x.por);});const mm=k=>{const v=med[k];return v.reduce((a,b)=>a+b,0)/v.length;};
    const raros=X.filter(x=>med[x.n+"|"+x.m].length>=6&&x.por>mm(x.n+"|"+x.m)*1.5&&x.fa-mm(x.n+"|"+x.m)*x.mq>=2).sort((a,b)=>b.por/mm(b.n+"|"+b.m)-a.por/mm(a.n+"|"+a.m));
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
      if(din&&!Object.values(tot).some(T=>T.eu>0))nota("Sale 0 € porque los artículos del Almacén aún no tienen precio (pistones, consumibles…) y las reparaciones de eje no tienen máquina apuntada. En cuanto pongas precios en el Almacén, saldrá aquí.");
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

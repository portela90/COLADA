/* ---------- Pedido propuesto para el mes siguiente ----------
   Stock con el que se acaba este mes (lo que hay + lo que falta por llegar
   del plan − el consumo previsto según el calendario), consumo del mes
   siguiente con sus días de trabajo, y un colchón al final (mínimo + 2 días de
   consumo) para aguantar hasta el primer camión del mes de después. Lo que se
   traiga del externo se resta de lo que hay que pedir. Reparto por proveedor
   en la misma proporción que los camiones contratados de este mes. */
const mesSig=m=>{const d=new Date(+m.slice(0,4),+m.slice(5,7),1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");};
function pedidoSiguiente(m,cons,B,bpUsar){
  const PL=plmes(),h=hoy(),sig=mesSig(m),dSig=laborables(sig+"-01",finDeMes(sig));
  const minimo=k=>((cfg.minimos||{})[k]||{}).fardosNave||0;
  const quedanDias=diasMes(m).filter(d=>d>=h),SI=stockInicio(m,cons,B);
  const filas=LINEAS.map(([n,mt])=>{const k=key(n,mt),c=cons[k]||0;
    const llega=PL.entradas.filter(x=>!x.rec&&x.k===k).reduce((a,x)=>a+x.fa,0);
    const finPlan=SI.ini[k]+llega-quedanDias.reduce((a,d)=>a+c*relevosDia(d)/3,0);
    /* con el plan tal cual: si se queda corto se avisa, y el mes siguiente empieza en 0 */
    const corto=finPlan<minimo(k),fin=Math.max(0,finPlan);
    const extPlan=PL.entradas.filter(x=>!x.rec&&x.k===k&&x.o==="B").reduce((a,x)=>a+x.fa,0);
    const extLibre=Math.max(0,SI.ext[k]-extPlan);
    const consSig=c*dSig,colchon=minimo(k)+2*c;
    const necesita=Math.max(0,consSig+colchon-fin);
    const bp=Math.min(bpUsar[k]||0,extLibre);
    const mc=mediaCamion(mt),cam=necesita-bp>0?Math.ceil((necesita-bp)/mc.fa):0;
    return{k,n,mt,c,fin,finPlan,corto,consSig,colchon,necesita,extLibre,bp,cam,faCam:mc.fa,kgCam:mc.kg};})
    .filter(x=>x.c>0||x.fin>0);
  /* reparto por proveedor según los contratados de este mes */
  const reparto={};Object.keys(MAT).forEach(mt=>{const tot=filas.filter(x=>x.mt===mt).reduce((a,x)=>a+x.cam,0);if(!tot)return;
    const base={};(PL.camiones||[]).filter(c=>c.m===mt).forEach(c=>base[c.p]=(base[c.p]||0)+(c.n||0));
    const sb=Object.values(base).reduce((a,b)=>a+b,0);
    if(!sb){reparto[mt]=[{p:"Por decidir",n:tot}];return;}
    const r=Object.keys(base).map(p=>({p,x:tot*base[p]/sb}));r.forEach(o=>{o.n=Math.floor(o.x);});
    let falta=tot-r.reduce((a,o)=>a+o.n,0);r.slice().sort((a,b)=>(b.x-b.n)-(a.x-a.n)).forEach(o=>{if(falta>0){o.n++;falta--;}});
    reparto[mt]=r.filter(o=>o.n>0).sort((a,b)=>b.n-a.n);});
  return{sig,dSig,filas,reparto};
}
function pedidoCard(m,cons,B){
  draft.bpSig=draft.bpSig||{};
  const P=pedidoSiguiente(m,cons,B,draft.bpSig),sig=P.sig,f1=v=>(Math.round(v*10)/10).toLocaleString("es-ES");
  const pr=mt=>precioMedio(sig,mt).v||precioMedio(m,mt).v;
  const filas=P.filas.map(x=>el("tr",{},[
    el("td",{},[el("span",{class:"tagm",style:"background:"+MAT[x.mt].col}),document.createTextNode(x.n),el("div",{class:"sub",text:MAT[x.mt].nom+" · "+f1(x.c)+" f/día"})]),
    el("td",{class:"r num"},[el("div",{text:fmt(Math.round(x.fin))}),x.corto?el("div",{class:"sub",style:"color:var(--bad)",text:"bajo mínimo"}):null]),
    el("td",{class:"r num",text:fmt(Math.round(x.consSig))}),
    el("td",{class:"r num",text:fmt(Math.round(x.colchon))}),
    el("td",{class:"r"},[x.extLibre>0?el("input",{class:"num",type:"text",inputmode:"numeric","aria-label":"Fardos del externo a traer",style:"width:64px;font-size:14px;padding:5px 7px;text-align:right",
      value:draft.bpSig[x.k]?String(draft.bpSig[x.k]):"",placeholder:"0",onchange:e=>{const v=parseInt(e.target.value,10);draft.bpSig[x.k]=v>0?v:0;render();}}):el("span",{class:"sub",text:"—"}),
      x.extLibre>0?el("div",{class:"sub",text:"hay "+fmt(x.extLibre)+" f"}):null]),
    el("td",{class:"r num"},[el("div",{style:"font-weight:700",text:String(x.cam)}),el("div",{class:"sub",text:"≈ "+fmt(Math.round(x.cam*x.faCam))+" f"})])]));
  const tot={};P.filas.forEach(x=>{tot[x.mt]=tot[x.mt]||{cam:0,kg:0};tot[x.mt].cam+=x.cam;tot[x.mt].kg+=x.cam*x.kgCam;});
  const resumen=Object.keys(tot).filter(mt=>tot[mt].cam).map(mt=>el("div",{class:"calc"},[el("b",{text:tot[mt].cam+" camiones"}),
    el("span",{text:MAT[mt].nom+" · ≈ "+fmt(tot[mt].kg/1000)+" t"+(pr(mt)?" · ≈ "+eur(tot[mt].kg/1000*pr(mt)):"")}),
    el("div",{class:"sub",style:"width:100%",text:(P.reparto[mt]||[]).map(o=>o.p+": "+o.n).join(" · ")})]));
  const yaHay=((cfg.plan||{})[sig]||{}).camiones||[];
  const pasar=async()=>{const nuevos=[];Object.keys(P.reparto).forEach(mt=>P.reparto[mt].forEach(o=>{if(o.p!=="Por decidir")nuevos.push({p:o.p,m:mt,n:o.n});}));
    if(yaHay.length&&!(await confirmar("En "+nomMes(sig)+" ya hay "+yaHay.reduce((a,c)=>a+(c.n||0),0)+" camiones contratados. ¿Los sustituyo por este pedido?",{titulo:"Pasar el pedido",ok:"Sustituir"})))return;
    try{const c=Object.assign({},cfg.plan||{});c[sig]=Object.assign({camiones:[],consumo:{},entradas:[]},c[sig]||{},{camiones:nuevos});cfg.plan=c;await saveCfg();toast("Pedido pasado a "+nomMes(sig));render();}catch(e){toast("No se pudo guardar");}};
  const cortos=P.filas.filter(x=>x.corto);
  return el("div",{class:"card"},[
    el("div",{class:"hd"},[el("h2",{text:"Pedido para "+nomMes(sig)}),el("span",{class:"sub",style:"margin-left:auto",text:P.dSig.toLocaleString("es-ES")+" días de trabajo"})]),
    el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},[el("th",{text:"Línea"}),el("th",{class:"r",text:"Acaba "+nomMes(m).split(" ")[0]}),el("th",{class:"r",text:"Gasto "+nomMes(sig).split(" ")[0]}),el("th",{class:"r",text:"Colchón"}),el("th",{class:"r",text:"Del externo"}),el("th",{class:"r",text:"Camiones"})])]),
      el("tbody",{},filas)])]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},(cortos.length?[el("div",{class:"banner w",text:"Con el plan de "+nomMes(m).split(" ")[0]+", "+cortos.map(x=>etiqLinea(x.k)+" acaba con "+fmt(Math.round(x.finPlan))+" f").join(" y ")+" (por debajo del mínimo). El pedido de "+nomMes(sig).split(" ")[0]+" ya cubre ese hueco desde el día 1."})]:[]).concat(resumen).concat([
      el("p",{class:"hint",text:"Acaba = fardos en fábrica a fin de mes con el plan actual. Gasto = consumo previsto con las máquinas de ahora y los días de trabajo de "+nomMes(sig)+" (marca sus fiestas cambiando el mes de arriba). Colchón = mínimo + 2 días de gasto, para aguantar hasta el primer camión del mes siguiente. Si piensas traer BP del externo, pon los fardos y se descuentan. El reparto por proveedor sigue la proporción de los contratados de este mes."}),
      el("button",{type:"button",class:"btn sec",text:"Pasar a camiones contratados de "+nomMes(sig),onclick:pasar})]))]);
}
const minimoDe=k=>((cfg.minimos||{})[k]||{}).fardosNave||0;
/* ---------- Planificador automático de cargas ----------
   Simula el mes día a día con el consumo previsto (según los relevos del
   calendario) y coloca una carga el último día de descarga posible antes de
   que una línea baje de su mínimo. Reglas de descarga: días laborables menos
   los viernes (se trabaja hasta las 14h); como mucho 2 cargas de AlSi9 y 1 de
   AlSi12 al día (las BP del externo también cuentan). Origen: primero los
   camiones contratados del mes (por proveedor); si se acaban, BP del externo
   de esa línea (la colada más antigua); si tampoco hay, camión extra a pedir. */
const MAXDIA={"L-2630":2,"L-2521-B":1};
const diaDescarga=f=>{const w=new Date(+f.slice(0,4),+f.slice(5,7)-1,+f.slice(8,10)).getDay();return w!==5&&relevosDia(f)>0;};
function planificar(m,cons,B,desdeCero){
  const PL=plmes(),h=hoy(),dias=diasMes(m).filter(d=>d>=h);
  const minimo=k=>((cfg.minimos||{})[k]||{}).fardosNave||0;
  /* lo que se respeta del plan actual: lo recibido, lo de hoy o antes, y (si no es desde cero) todo lo pendiente */
  const fijas=PL.entradas.filter(x=>x.rec||x.f<=h||!desdeCero);
  const pend=fijas.filter(x=>!x.rec&&x.k).map(x=>x.f<h?Object.assign({},x,{f:h}):x);/* las retrasadas cuentan como que llegan hoy */
  /* camiones contratados que quedan por colocar, por material y proveedor */
  const quedan={};(PL.camiones||[]).forEach(c=>{(quedan[c.m]=quedan[c.m]||{});quedan[c.m][c.p]=(quedan[c.m][c.p]||0)+(c.n||0);});
  fijas.filter(x=>x.o!=="B").forEach(x=>{const mt=x.k?x.k.split("|")[1]:"L-2630",q=quedan[mt]||{};
    const p=x.p&&q[x.p]>0?x.p:Object.keys(q).sort((a,b)=>q[b]-q[a])[0];if(p&&q[p]>0)q[p]--;});
  /* coladas del externo por línea, la más antigua primero, sin lo ya planificado como BP */
  const S=saldos(),ext={};
  lotes.filter(l=>l.donde==="externo").forEach(l=>{const b=S[l.id];if(b&&b.fa>0)(ext[key(l.nave,l.material)]=ext[key(l.nave,l.material)]||[]).push({l,fa:b.fa});});
  Object.values(ext).forEach(a=>a.sort((x,y)=>(x.l.entrada||"").localeCompare(y.l.entrada||"")));
  /* BP pendientes de este mes y de meses anteriores ya tienen su colada reservada */
  fijas.filter(x=>x.o==="B"&&!x.rec&&x.k).concat(pendPlan().filter(x=>x.o==="B"&&x.f<m+"-01")).forEach(x=>{let r=x.fa;const a=ext[x.k]||[];while(r>0&&a.length){const t=Math.min(r,a[0].fa);a[0].fa-=t;r-=t;if(a[0].fa<=0)a.shift();}});
  const stock={},ks=LINEAS.map(([n,mm])=>key(n,mm)).filter(k=>(cons[k]||0)>0||B[k].faN>0);
  const SI=stockInicio(m,cons,B);ks.forEach(k=>stock[k]=SI.ini[k]);
  const nuevas=[],uso={};const usado=(d,mt)=>(uso[d+mt]||0);
  fijas.filter(x=>!x.rec&&x.k).forEach(x=>{uso[x.f+x.k.split("|")[1]]=(uso[x.f+x.k.split("|")[1]]||0)+1;});
  const llega=d=>pend.concat(nuevas).filter(x=>x.f===d);
  const gasto=(k,d)=>(cons[k]||0)*relevosDia(d)/3;
  const sigDescarga=i=>{for(let j=i+1;j<dias.length;j++)if(diaDescarga(dias[j])&&dias[j]>h)return j;return dias.length;};
  dias.forEach((d,i)=>{
    llega(d).forEach(x=>{if(stock[x.k]!=null)stock[x.k]+=x.fa;});
    if(d>h&&diaDescarga(d)){
      const nx=sigDescarga(i);
      /* stock más bajo hasta la próxima descarga posible (o fin de mes), contando lo que ya viene */
      const bajo=k=>{let s0=stock[k],lo=Infinity;for(let j=i;j<nx;j++){if(j>i)llega(dias[j]).forEach(x=>{if(x.k===k)s0+=x.fa;});s0-=gasto(k,dias[j]);lo=Math.min(lo,s0);}return lo;};
      let otra=true;
      while(otra){otra=false;
        const cand=ks.map(k=>({k,lo:bajo(k)})).filter(x=>x.lo<minimo(x.k)&&usado(d,x.k.split("|")[1])<MAXDIA[x.k.split("|")[1]]).sort((a,b)=>(a.lo-minimo(a.k))-(b.lo-minimo(b.k)));
        if(!cand.length)break;
        const k=cand[0].k,mt=k.split("|")[1],q=quedan[mt]||{};
        const prov=Object.keys(q).filter(p=>q[p]>0).sort((a,b)=>q[b]-q[a])[0];
        let e;
        if(prov){q[prov]--;e={f:d,k,o:"C",p:prov,fa:Math.round(mediaCamion(mt,prov).fa)};}
        else if((ext[k]||[]).length){const c=ext[k].shift();e={f:d,k,o:"B",fa:Math.round(c.fa),col:c.l.nombre};}
        else e={f:d,k,o:"C",fa:Math.round(mediaCamion(mt).fa),extra:true};
        nuevas.push(e);stock[k]+=e.fa;uso[d+mt]=usado(d,mt)+1;otra=true;}
    }
    ks.forEach(k=>stock[k]-=gasto(k,d));
  });
  const sobran={};Object.keys(quedan).forEach(mt=>Object.keys(quedan[mt]).forEach(p=>{if(quedan[mt][p]>0)sobran[p+" "+MAT[mt].nom]=quedan[mt][p];}));
  return{nuevas,fijas,fin:stock,ks,sobran,extra:nuevas.filter(x=>x.extra).length,minimo};
}
/* ventana con la propuesta para revisarla antes de guardarla */
function verPropuesta(m,cons,B,desdeCero){
  const R=planificar(m,cons,B,desdeCero);
  const fil=R.nuevas.map(x=>el("tr",{},[el("td",{class:"num",text:diaSem(x.f)+" "+dmy(x.f)}),el("td",{text:etiqLinea(x.k)}),
    el("td",{},[x.o==="B"?el("span",{class:"pill warn",text:"BP "+(x.col||"")}):x.extra?el("span",{class:"pill bad",text:"Camión extra"}):el("span",{class:"pill ok",text:x.p})]),
    el("td",{class:"r num",text:fmt(x.fa)})]));
  const res=[];
  if(!R.nuevas.length)res.push(el("p",{text:"Con lo que ya tienes colocado llegas a fin de mes sin bajar de los mínimos. No hace falta añadir nada."}));
  if(R.extra)res.push(el("div",{class:"banner b",text:"Faltan "+R.extra+" camión(es) que no están contratados ni hay en el externo: habría que pedirlos."}));
  const sb=Object.keys(R.sobran);if(sb.length)res.push(el("div",{class:"banner w",text:"Contratados que no hacen falta este mes: "+sb.map(k=>R.sobran[k]+" de "+k).join(", ")+". Se pueden aplazar o dejar como reserva."}));
  res.push(el("p",{class:"hint",text:"A fin de mes quedarían en fábrica: "+R.ks.map(k=>etiqLinea(k)+" "+fmt(Math.round(R.fin[k]))+" f (mínimo "+R.minimo(k)+")").join(" · ")+"."}));
  const ov=el("div",{class:"dlg-ov"});
  const cerrar=()=>ov.remove();
  const box=el("div",{class:"dlg",role:"dialog","aria-modal":"true",style:"max-width:620px"},[
    el("h3",{text:(desdeCero?"Plan nuevo":"Completar el plan")+" · "+nomMes(m)}),
    el("p",{class:"hint",text:"Descargas de lunes a jueves laborables (los viernes no), máximo 2 de AlSi9 y 1 de AlSi12 al día. Primero camiones contratados; si se acaban, BP del externo (la colada más antigua). Cada carga se pone el último día posible antes de bajar del mínimo."+(desdeCero?" Se quitan las cargas pendientes desde mañana y se colocan de nuevo.":" Se respeta todo lo que ya tienes colocado.")}),
    R.nuevas.length?el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},[el("th",{text:"Día"}),el("th",{text:"Destino"}),el("th",{text:"Origen"}),el("th",{class:"r",text:"Fardos"})])]),el("tbody",{},fil)])]):null,
    ...res,
    el("div",{class:"dlg-b"},[el("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:cerrar}),
      R.nuevas.length||desdeCero?el("button",{type:"button",class:"btn",text:"Guardar en el plan",onclick:async e=>{e.currentTarget.disabled=true;
        const out=R.fijas.concat(R.nuevas.map(x=>{const y={f:x.f,k:x.k,fa:x.fa,o:x.o,auto:true};if(x.p)y.p=x.p;if(x.extra)y.extra=true;return y;}));
        try{await setPlan({entradas:out});toast("Plan guardado: "+R.nuevas.length+" carga(s) añadidas");cerrar();render();}catch(err){toast("No se pudo guardar");e.currentTarget.disabled=false;}}}):null])]);
  ov.appendChild(box);ov.addEventListener("click",e=>{if(e.target===ov)cerrar();});document.body.appendChild(ov);
}

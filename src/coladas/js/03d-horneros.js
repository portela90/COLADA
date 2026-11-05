/* ---------- Horneros de cada relevo ----------
   Quién estaba en cada relevo de cada nave, para cruzarlo en Consultas con el consumo, el FIFO, lo que cuadra la hoja
   y las averías. Se pone una semana y las siguientes salen solas por la rotación: el de mañana pasa a noche,
   el de noche a tarde y el de tarde a mañana. Las bajas y sustituciones se ponen como cambio de un día.
   cfg.horn = {lista:[{id,n,baja}], sem:{"lunes":{"Nave 1|Mañana":[id]}}, dia:{"fecha|Nave 1|Mañana":[id]}} */
const ROT_SIG={"Mañana":"Noche","Noche":"Tarde","Tarde":"Mañana"},ROT_ANT={"Noche":"Mañana","Tarde":"Noche","Mañana":"Tarde"};
let hornSem="";
const hornCfg=()=>{const h=cfg.horn||{};return{lista:h.lista||[],sem:h.sem||{},dia:h.dia||{}};};
const lunesH=f=>{const d=new Date(+f.slice(0,4),+f.slice(5,7)-1,+f.slice(8,10));d.setDate(d.getDate()-((d.getDay()+6)%7));return ymd(d);};
const semMas=(l,n)=>{const d=new Date(+l.slice(0,4),+l.slice(5,7)-1,+l.slice(8,10)+7*n);return ymd(d);};
const nomHorn=id=>{const x=hornCfg().lista.find(z=>z.id===id);return x?x.n:"?";};
/* quién está en una semana: la guardada o, si no, la última guardada antes girada tantas semanas como haga falta */
function semanaHorn(lun){const H=hornCfg();if(H.sem[lun])return{g:H.sem[lun],de:lun,rot:0};
  const prev=Object.keys(H.sem).filter(x=>x<lun).sort().pop();if(!prev)return{g:{},de:null,rot:0};
  let g=H.sem[prev],k=0;for(let w=prev;w<lun;w=semMas(w,1)){const n={};Object.keys(g).forEach(c=>{const[nv,u]=c.split("|");n[nv+"|"+ROT_SIG[u]]=g[c];});g=n;k++;}
  return{g,de:prev,rot:k};}
function quienEn(f,nave,u){const H=hornCfg(),d=H.dia[f+"|"+nave+"|"+u];if(d)return d;return(semanaHorn(lunesH(f)).g[nave+"|"+u])||[];}
async function guardaHorn(patch){cfg.horn=Object.assign({},hornCfg(),patch);await saveCfg();}
async function nuevoHornero(){const n=await dialogo({titulo:"Nuevo hornero",texto:"Nombre como lo quieres ver (por ejemplo «Juan P.» o su número).",input:true,teclado:"text",ok:"Añadir"});
  if(!n||!String(n).trim())return null;const H=hornCfg(),x={id:uid("h"),n:String(n).trim()};await guardaHorn({lista:H.lista.concat([x])});return x.id;}
/* elegir personas (varias) */
function elegirHorn(titulo,sel,alGuardar){const H=hornCfg(),s=new Set(sel||[]);const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)ov.remove();}}),cerrar=()=>ov.remove();
  const lst=el("div",{class:"hn-lst"});const pinta=()=>{lst.textContent="";hornCfg().lista.filter(x=>!x.baja||s.has(x.id)).forEach(x=>lst.appendChild(el("label",{class:"chk hn-chk"},[
    el("input",{type:"checkbox",checked:s.has(x.id)?"":null,onchange:e=>{if(e.target.checked)s.add(x.id);else s.delete(x.id);}}),el("span",{text:x.n})])));
    if(!hornCfg().lista.length)lst.appendChild(el("p",{class:"hint",text:"Todavía no hay horneros: añade el primero."}));};pinta();
  ov.appendChild(el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":titulo},[el("h3",{text:titulo}),lst,
    el("button",{type:"button",class:"btn sec peq",style:"align-self:flex-start",text:"+ Hornero nuevo",onclick:async()=>{const id=await nuevoHornero();if(id){s.add(id);pinta();}}}),
    el("div",{class:"dlg-b"},[el("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:cerrar}),el("button",{type:"button",class:"btn",id:"hn-ok",text:"Guardar",onclick:async()=>{try{await alGuardar([...s]);cerrar();render();}catch(e){toast("No se pudo guardar");}}})])]));
  document.body.appendChild(ov);}
function vHorneros(){const h=hoy(),lun=hornSem||lunesH(h),S=semanaHorn(lun),H=hornCfg(),dom=semMas(lun,1);
  const fin=ymd(new Date(+dom.slice(0,4),+dom.slice(5,7)-1,+dom.slice(8,10)-1));
  const cab=el("div",{class:"sd-sel"},[el("button",{type:"button",class:"btn sec peq","aria-label":"Semana anterior",text:"‹",onclick:()=>{hornSem=semMas(lun,-1);render();}}),
    el("b",{class:"hn-sem",text:"Semana del "+dmy(lun)+" al "+dmy(fin)}),
    el("button",{type:"button",class:"btn sec peq","aria-label":"Semana siguiente",text:"›",onclick:()=>{hornSem=semMas(lun,1);render();}}),
    lun!==lunesH(h)?el("button",{type:"button",class:"chip",text:"Esta semana",onclick:()=>{hornSem="";render();}}):null]);
  const origen=H.sem[lun]?el("p",{class:"hint",style:"margin:0",text:"Semana guardada. Toca una casilla para cambiarla."}):
    S.de?el("div",{class:"banner",text:"Sale sola por la rotación desde la semana del "+dmy(S.de)+" (mañana → noche → tarde → mañana). Si esta semana es distinta, toca una casilla y se guarda."}):
    el("div",{class:"banner w",text:"Pon quién está en cada relevo esta semana. Las semanas siguientes saldrán solas por la rotación."});
  const guardaCelda=(c,ids)=>{const g=Object.assign({},S.g);g[c]=ids;const sem=Object.assign({},H.sem,{[lun]:g});return guardaHorn({sem});};
  const tabla=el("div",{class:"tw"},[el("table",{class:"hn-t"},[el("thead",{},[el("tr",{},[el("th",{text:"Relevo"})].concat(NAVES.map(n=>el("th",{text:n}))))]),
    el("tbody",{},TURNOS.map(u=>el("tr",{},[el("td",{},[el("b",{text:u})])].concat(NAVES.map(n=>{const c=n+"|"+u,ids=S.g[c]||[];
      return el("td",{},[el("button",{type:"button",class:"hn-cel","aria-label":"Quién está "+n+" "+u,onclick:()=>elegirHorn(n+" · "+u+" · semana del "+dmy(lun),ids,v=>guardaCelda(c,v))},
        ids.length?ids.map(id=>el("span",{class:"hn-n",text:nomHorn(id)})):[el("span",{class:"sub",text:"Elegir…"})])]);})))))])]);
  /* cambios de un día */
  const cambios=Object.keys(H.dia).filter(k=>{const f=k.split("|")[0];return f>=lun&&f<=fin;}).sort();
  const listaC=cambios.length?el("div",{class:"bq-lst"},cambios.map(k=>{const[f,n,u]=k.split("|");return el("div",{class:"bq-it",style:"cursor:default"},[el("div",{class:"bq-p"},[el("b",{text:diaSem(f)+" "+dmy(f)+" · "+n+" · "+u}),
    el("span",{class:"sub",text:H.dia[k].map(nomHorn).join(", ")+" (en vez de "+((S.g[n+"|"+u]||[]).map(nomHorn).join(", ")||"nadie")+")"})]),
    el("button",{type:"button",class:"btn sec peq",text:"Quitar",onclick:async()=>{const d=Object.assign({},H.dia);delete d[k];try{await guardaHorn({dia:d});render();}catch(e){toast("No se pudo");}}})]);})):el("p",{class:"hint",style:"margin:0",text:"Sin cambios esta semana."});
  const dCambio=()=>{const st={f:h>=lun&&h<=fin?h:lun,n:NAVES[0],u:TURNOS[0]};const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)ov.remove();}}),cerrar=()=>ov.remove();
    ov.appendChild(el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"Cambio de un día"},[el("h3",{text:"Cambio de un día (baja o sustitución)"}),
      el("label",{text:"Día"},[el("input",{id:"hn-f",type:"date",value:st.f,onchange:e=>{st.f=e.target.value;}})]),
      el("label",{text:"Nave"},[el("div",{class:"seg"},NAVES.map(n=>el("button",{type:"button","aria-pressed":String(st.n===n),text:n,onclick:e=>{st.n=n;[...e.target.parentNode.children].forEach(b=>b.setAttribute("aria-pressed",String(b===e.target)));}})))]),
      el("label",{text:"Relevo"},[el("div",{class:"seg"},TURNOS.map(u=>el("button",{type:"button","aria-pressed":String(st.u===u),text:u,onclick:e=>{st.u=u;[...e.target.parentNode.children].forEach(b=>b.setAttribute("aria-pressed",String(b===e.target)));}})))]),
      el("div",{class:"dlg-b"},[el("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:cerrar}),el("button",{type:"button",class:"btn",id:"hn-sig",text:"Elegir quién estuvo",onclick:()=>{cerrar();
        elegirHorn(diaSem(st.f)+" "+dmy(st.f)+" · "+st.n+" · "+st.u,quienEn(st.f,st.n,st.u),v=>guardaHorn({dia:Object.assign({},hornCfg().dia,{[st.f+"|"+st.n+"|"+st.u]:v})}));}})])]));
    document.body.appendChild(ov);};
  /* lista de horneros */
  const lst=el("div",{class:"hn-todos"},H.lista.map(x=>el("span",{class:"hn-n"+(x.baja?" baja":"")},[document.createTextNode(x.n),
    el("button",{type:"button",class:"hn-x","aria-label":(x.baja?"Volver a poner a ":"Quitar a ")+x.n,text:x.baja?"↺":"×",onclick:async()=>{const L=H.lista.map(z=>z.id===x.id?Object.assign({},z,{baja:!z.baja}):z);try{await guardaHorn({lista:L});render();}catch(e){toast("No se pudo");}}})])).concat([
    el("button",{type:"button",class:"btn sec peq",text:"+ Hornero",onclick:async()=>{if(await nuevoHornero())render();}})]));
  return[el("div",{class:"card"},[el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[cab,origen,tabla])]),
    el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Cambios de un día"}),el("button",{type:"button",class:"btn sec peq",style:"margin-left:auto",text:"+ Baja o sustitución",onclick:dCambio})]),el("div",{class:"bd"},[listaC])]),
    el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Horneros"})]),el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:8px"},[lst,
      el("p",{class:"hint",style:"margin:0",text:"Con × quitas a alguien de las listas sin borrar lo que ya hizo. En Consultas puedes preguntar «consumo por hornero», «quién no sigue el FIFO», «qué hornero apunta mal la hoja» o «averías por hornero»."})])])];}

/* ---------- datos por hornero para Consultas ---------- */
function statsHorneros(d0,d1,nave){const S=saldos(),ms=movs().filter(r=>!r.h&&r.f&&r.f>=d0&&r.f<=d1),R={},P={};
  const lin=id=>{const l=lotes.find(x=>x.id===id);return l?l.nave:null;};
  const add=(id,k,v)=>{const p=P[id]=P[id]||{id,rel:0,relC:0,mqC:0,fa:0,kg:0,mq:0,fuera:0,desc:0,descFa:0,recs:0,aver:0};p[k]+=v;};
  for(let f=d0;f<=d1;f=diaSig(f))TURNOS.slice(0,relevosDia(f)).forEach(u=>NAVES.forEach(n=>{if(nave&&n!==nave)return;const ids=quienEn(f,n,u);if(!ids.length)return;
    const C=ms.filter(r=>r.t==="C"&&r.f===f&&r.u===u&&lin(r.o)===n),fa=C.reduce((a,r)=>a+(r.fa||0),0),kg=C.reduce((a,r)=>a+Math.abs(kgAp(r,S)),0);
    let mq=0;try{if(primerEvMaq())mq=cuentaMaq(estadoMaq(f,u),n).on;}catch(e){}
    const fuera=C.some(r=>/fuera de fifo/i.test(r.n||""));
    ids.forEach(id=>{add(id,"rel",1);if(fa>0){add(id,"relC",1);add(id,"mqC",mq);}add(id,"fa",fa);add(id,"kg",kg);add(id,"mq",mq);if(fuera)add(id,"fuera",1);});R[f+"|"+u+"|"+n]=ids;}));
  /* recuentos con descuadre: el ajuste lleva los relevos que cubría */
  ms.filter(r=>r.t==="A"&&Array.isArray(r.rel)&&/^Recuento diario/.test(r.n||"")).forEach(r=>{const n=lin(r.o||r.d);if(!n||(nave&&n!==nave))return;
    const ids=new Set();r.rel.forEach(x=>(R[x+"|"+n]||quienEn(x.split("|")[0],n,x.split("|")[1])).forEach(i=>ids.add(i)));ids.forEach(id=>{add(id,"desc",1);add(id,"descFa",r.fa||0);});});
  return Object.values(P).filter(p=>p.rel>0);}
function pintaHorn(E,H){const {frase,nota,ent,card,tabla}=H;const per=E.per;
  if(!hornCfg().lista.length){ent("horneros");frase("Todavía no hay horneros apuntados. Ponlos en Consumo › Horneros (una semana basta: las siguientes salen por la rotación).");return;}
  const L=statsHorneros(per.d,per.h,E.nave);ent("horneros",[per.t,E.nave]);
  if(!L.length){frase("No hay relevos con horneros apuntados en "+per.t+".");return;}
  const fpr=p=>p.relC?p.fa/p.relC:0,fpm=p=>p.mqC?p.fa/p.mqC:0,LC=L.filter(p=>p.relC),med=LC.length?LC.reduce((a,p)=>a+fpr(p),0)/LC.length:0;
  const met=E.met;
  if(met==="fifo"){const o=L.slice().sort((a,b)=>b.fuera/b.rel-a.fuera/a.rel);const t=o.filter(p=>p.fuera>0);
    frase(t.length?"Fuera de FIFO en "+per.t+": "+t.slice(0,3).map(p=>nomHorn(p.id)+" "+p.fuera+" de "+p.rel+" relevos").join(" · ")+".":"En "+per.t+" ningún relevo con horneros apuntados se ha salido del FIFO.");
    card("FIFO por hornero",[tabla(["Hornero","Relevos","Fuera de FIFO","%"],o.map(p=>[nomHorn(p.id),String(p.rel),String(p.fuera),Math.round(p.fuera/p.rel*100)+" %"]),[1,2,3])]);
    nota("Cuenta los relevos en los que se gastó de una colada que no era la más antigua (lo marca el recuento diario o el consumo por relevo).");return;}
  if(met==="hoja"){const o=L.slice().sort((a,b)=>b.descFa-a.descFa);const t=o.filter(p=>p.desc>0);
    frase(t.length?"Descuadres entre la hoja y el recuento en "+per.t+": "+t.slice(0,3).map(p=>nomHorn(p.id)+" "+p.desc+" vez/veces ("+p.descFa+" f)").join(" · ")+".":"En "+per.t+" los recuentos han cuadrado con las hojas de todos los horneros apuntados.");
    card("La hoja frente al recuento",[tabla(["Hornero","Relevos","Recuentos con descuadre","Fardos de diferencia"],o.map(p=>[nomHorn(p.id),String(p.rel),String(p.desc),String(p.descFa)]),[1,2,3])]);
    nota("Cuando el recuento diario no cuadra con las hojas, la diferencia se reparte entre los horneros de los relevos de ese recuento (no se sabe de cuál de ellos es).");return;}
  if(met==="aver"){frase("Buscando las averías de Almacén…");
    almDatos().then(D=>{if(!D){frase("No puedo leer los datos de Almacén desde aquí.");return;}
      const A=(D.pist||[]).filter(x=>x.f>=per.d&&x.f<=per.h);const C={};
      A.forEach(x=>{const n=D.naveDe(x.maq);if(!n||(E.nave&&n!==E.nave))return;const ids=new Set();TURNOS.forEach(u=>quienEn(x.f,n,u).forEach(i=>ids.add(i)));ids.forEach(id=>{C[id]=(C[id]||0)+(+x.cant||1);});});
      const o=L.map(p=>({p,a:C[p.id]||0})).sort((a,b)=>b.a-a.a);
      frase("Cambios de pistón en su nave los días que trabajaron ("+per.t+"): "+o.filter(x=>x.a).slice(0,3).map(x=>nomHorn(x.p.id)+" "+x.a).join(" · ")+(o.some(x=>x.a)?".":"ninguno."));
      card("Averías por hornero",[tabla(["Hornero","Relevos","Cambios de pistón ese día en su nave"],o.map(x=>[nomHorn(x.p.id),String(x.p.rel),String(x.a)]),[1,2])]);
      nota("Las averías de Almacén se apuntan por día, no por relevo: cuentan para todos los horneros que trabajaron ese día en esa nave. Sirve para ver tendencias, no para culpar a nadie de una en concreto.");}).catch(()=>frase("No he podido leer las averías de Almacén."));return;}
  const o=L.slice().sort((a,b)=>(fpm(b)||fpr(b))-(fpm(a)||fpr(a)));
  frase("Consumo por hornero en "+per.t+": "+o.slice(0,3).map(p=>nomHorn(p.id)+" "+(Math.round(fpr(p)*10)/10).toLocaleString("es-ES")+" f por relevo"+(p.mqC?" ("+(Math.round(fpm(p)*100)/100).toLocaleString("es-ES")+" por máquina)":"")).join(" · ")+". Media "+(Math.round(med*10)/10).toLocaleString("es-ES")+" f por relevo.");
  card("Consumo por hornero",[tabla(["Hornero","Relevos (con consumo)","Fardos","Kilos","Fardos por relevo","Por máquina en marcha"],o.map(p=>[nomHorn(p.id),p.rel+" ("+p.relC+")",fmt(p.fa),fmt(p.kg),(Math.round(fpr(p)*10)/10).toLocaleString("es-ES"),p.mqC?(Math.round(fpm(p)*100)/100).toLocaleString("es-ES"):"—"]),[1,2,3,4,5])]);
  nota("Para comparar de verdad mira «por máquina en marcha»: quien tiene más máquinas funcionando gasta más sin que sea culpa suya. Por relevo cuenta solo los relevos con consumo apuntado. Si en un relevo hay dos horneros, el consumo cuenta para los dos.");}

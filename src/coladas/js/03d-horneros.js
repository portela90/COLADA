/* ---------- Horneros de cada relevo ----------
   Quién estaba en cada relevo de cada nave, para cruzarlo en Consultas con el consumo, el FIFO, lo que cuadra la hoja
   y las averías. Se pone una semana y las siguientes salen solas por la rotación: el de mañana pasa a noche,
   el de noche a tarde y el de tarde a mañana. Las bajas y sustituciones se ponen como cambio de un día.
   Dos puestos por relevo: el que carga el horno (clave «Nave 1|Mañana») y el de la cuchara de reparto («Nave 1|Mañana|cuchara»).
   cfg.horn = {lista:[{id,n,baja}], sem:{"lunes":{"Nave 1|Mañana":[id],"Nave 1|Mañana|cuchara":[id]}}, dia:{"fecha|Nave 1|Mañana[|cuchara]":[id]}} */
const PUESTOS=[["carga","Horno"],["cuchara","Cuchara"]];
const rk=(n,u,rol)=>n+"|"+u+(rol==="cuchara"?"|cuchara":"");
const ROT_SIG={"Mañana":"Noche","Noche":"Tarde","Tarde":"Mañana"},ROT_ANT={"Noche":"Mañana","Tarde":"Noche","Mañana":"Tarde"};
let hornSem="";
const hornCfg=()=>{const h=cfg.horn||{};return{lista:h.lista||[],sem:h.sem||{},dia:h.dia||{}};};
const lunesH=f=>{const d=new Date(+f.slice(0,4),+f.slice(5,7)-1,+f.slice(8,10));d.setDate(d.getDate()-((d.getDay()+6)%7));return ymd(d);};
const semMas=(l,n)=>{const d=new Date(+l.slice(0,4),+l.slice(5,7)-1,+l.slice(8,10)+7*n);return ymd(d);};
const nomHorn=id=>{const x=hornCfg().lista.find(z=>z.id===id);return x?x.n:"?";};
/* quién está en una semana: la guardada o, si no, la última guardada antes girada tantas semanas como haga falta */
function semanaHorn(lun){const H=hornCfg();if(H.sem[lun])return{g:H.sem[lun],de:lun,rot:0};
  const prev=Object.keys(H.sem).filter(x=>x<lun).sort().pop();if(!prev)return{g:{},de:null,rot:0};
  let g=H.sem[prev],k=0;for(let w=prev;w<lun;w=semMas(w,1)){const n={};Object.keys(g).forEach(c=>{const p=c.split("|");p[1]=ROT_SIG[p[1]];n[p.join("|")]=g[c];});g=n;k++;}
  return{g,de:prev,rot:k};}
function quienEn(f,nave,u,rol){const H=hornCfg(),k=rk(nave,u,rol),d=H.dia[f+"|"+k];if(d)return d;return(semanaHorn(lunesH(f)).g[k])||[];}
const quienTodos=(f,n,u)=>[...new Set(PUESTOS.flatMap(([r])=>quienEn(f,n,u,r)))];
const quienTxt=(f,n,u)=>PUESTOS.map(([r,t])=>{const x=quienEn(f,n,u,r);return x.length?t.toLowerCase()+" "+x.map(nomHorn).join(", "):"";}).filter(Boolean).join(" · ");
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
    el("tbody",{},TURNOS.map(u=>el("tr",{},[el("td",{},[el("b",{text:u})])].concat(NAVES.map(n=>el("td",{},[el("div",{class:"hn-pues"},PUESTOS.map(([rol,t])=>{const c=rk(n,u,rol),ids=S.g[c]||[];
      return el("button",{type:"button",class:"hn-cel","aria-label":(rol==="cuchara"?"Cuchara ":"Quién está ")+n+" "+u,onclick:()=>elegirHorn((rol==="cuchara"?"Cuchara de reparto":"Carga el horno")+" · "+n+" · "+u+" · semana del "+dmy(lun),ids,v=>guardaCelda(c,v))},
        [el("small",{class:"hn-rol",text:t})].concat(ids.length?ids.map(id=>el("span",{class:"hn-n",text:nomHorn(id)})):[el("span",{class:"sub",text:"Elegir…"})]));}))]))))))])]);
  /* cambios de un día */
  const cambios=Object.keys(H.dia).filter(k=>{const f=k.split("|")[0];return f>=lun&&f<=fin;}).sort();
  const listaC=cambios.length?el("div",{class:"bq-lst"},cambios.map(k=>{const[f,n,u,r]=k.split("|");return el("div",{class:"bq-it",style:"cursor:default"},[el("div",{class:"bq-p"},[el("b",{text:diaSem(f)+" "+dmy(f)+" · "+n+" · "+u+" · "+(r==="cuchara"?"cuchara":"horno")}),
    el("span",{class:"sub",text:H.dia[k].map(nomHorn).join(", ")+" (en vez de "+((S.g[rk(n,u,r)]||[]).map(nomHorn).join(", ")||"nadie")+")"})]),
    el("button",{type:"button",class:"btn sec peq",text:"Quitar",onclick:async()=>{const d=Object.assign({},H.dia);delete d[k];try{await guardaHorn({dia:d});render();}catch(e){toast("No se pudo");}}})]);})):el("p",{class:"hint",style:"margin:0",text:"Sin cambios esta semana."});
  const dCambio=()=>{const st={f:h>=lun&&h<=fin?h:lun,n:NAVES[0],u:TURNOS[0],r:"carga"};const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)ov.remove();}}),cerrar=()=>ov.remove();
    ov.appendChild(el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"Cambio de un día"},[el("h3",{text:"Cambio de un día (baja o sustitución)"}),
      el("label",{text:"Día"},[el("input",{id:"hn-f",type:"date",value:st.f,onchange:e=>{st.f=e.target.value;}})]),
      el("label",{text:"Nave"},[el("div",{class:"seg"},NAVES.map(n=>el("button",{type:"button","aria-pressed":String(st.n===n),text:n,onclick:e=>{st.n=n;[...e.target.parentNode.children].forEach(b=>b.setAttribute("aria-pressed",String(b===e.target)));}})))]),
      el("label",{text:"Relevo"},[el("div",{class:"seg"},TURNOS.map(u=>el("button",{type:"button","aria-pressed":String(st.u===u),text:u,onclick:e=>{st.u=u;[...e.target.parentNode.children].forEach(b=>b.setAttribute("aria-pressed",String(b===e.target)));}})))]),
      el("label",{text:"Puesto"},[el("div",{class:"seg"},[["carga","Carga el horno"],["cuchara","Cuchara de reparto"]].map(([r,t])=>el("button",{type:"button","aria-pressed":String(st.r===r),text:t,onclick:e=>{st.r=r;[...e.target.parentNode.children].forEach(b=>b.setAttribute("aria-pressed",String(b===e.target)));}})))]),
      el("div",{class:"dlg-b"},[el("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:cerrar}),el("button",{type:"button",class:"btn",id:"hn-sig",text:"Elegir quién estuvo",onclick:()=>{cerrar();
        elegirHorn(diaSem(st.f)+" "+dmy(st.f)+" · "+st.n+" · "+st.u+" · "+(st.r==="cuchara"?"cuchara":"horno"),quienEn(st.f,st.n,st.u,st.r),v=>guardaHorn({dia:Object.assign({},hornCfg().dia,{[st.f+"|"+rk(st.n,st.u,st.r)]:v})}));}})])]));
    document.body.appendChild(ov);};
  /* lista de horneros */
  const renombrar=async x=>{const n=await dialogo({titulo:"Cambiar el nombre",texto:"Se cambia en todas las semanas y en las consultas (lo que hizo sigue siendo suyo).",input:true,teclado:"text",valor:x.n,ok:"Guardar"});
    if(n==null||!String(n).trim()||String(n).trim()===x.n)return;const L=H.lista.map(z=>z.id===x.id?Object.assign({},z,{n:String(n).trim()}):z);try{await guardaHorn({lista:L});toast("Nombre cambiado");render();}catch(e){toast("No se pudo guardar");}};
  const lst=el("div",{class:"hn-todos"},H.lista.map(x=>el("span",{class:"hn-n"+(x.baja?" baja":"")},[el("button",{type:"button",class:"hn-ed","aria-label":"Cambiar el nombre de "+x.n,title:"Toca para cambiar el nombre",text:x.n+" ✎",onclick:()=>renombrar(x)}),
    el("button",{type:"button",class:"hn-x","aria-label":(x.baja?"Volver a poner a ":"Quitar a ")+x.n,text:x.baja?"↺":"×",onclick:async()=>{const L=H.lista.map(z=>z.id===x.id?Object.assign({},z,{baja:!z.baja}):z);try{await guardaHorn({lista:L});render();}catch(e){toast("No se pudo");}}})])).concat([
    el("button",{type:"button",class:"btn sec peq",text:"+ Hornero",onclick:async()=>{if(await nuevoHornero())render();}})]));
  return[el("div",{class:"card"},[el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[cab,origen,tabla])]),
    el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Cambios de un día"}),el("button",{type:"button",class:"btn sec peq",style:"margin-left:auto",text:"+ Baja o sustitución",onclick:dCambio})]),el("div",{class:"bd"},[listaC])]),
    el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Horneros"})]),el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:8px"},[lst,
      el("p",{class:"hint",style:"margin:0",text:"En cada relevo hay dos puestos: «Horno» (el que lo carga) y «Cuchara» (el de la cuchara de reparto); los dos giran igual. Toca un nombre para cambiarlo. Con × quitas a alguien de las listas sin borrar lo que ya hizo. En Consultas puedes preguntar «consumo por hornero», «quién no sigue el FIFO», «qué hornero apunta mal la hoja» o «averías por hornero» (añade «cuchara» para el de la cuchara de reparto, por ejemplo «averías por cuchara»)."})])])];}

/* ---------- datos por hornero para Consultas ----------
   Coladas: consumo, FIFO y lo que cuadra la hoja. Almacén (cruce): cambios de tolva y de pistón de las máquinas de la nave.
   Un apunte del Almacén va a su relevo si lo lleva (campo «Relevo») o si se apuntó ese mismo día (por la hora);
   si no, cuenta para todos los del día en esa nave (se dice como «aprox.»). Todo se compara por cada 10 relevos trabajados. */
const turnoDeHora=h=>h>=6&&h<14?"Mañana":h>=14&&h<22?"Tarde":"Noche";
function relevoDeAp(r){if(r&&TURNOS.includes(r.u))return r.u;if(r&&r.ts&&r.f){const d=new Date(+r.ts);if(ymd(d)===r.f)return turnoDeHora(d.getHours());}return null;}
function statsHorneros(d0,d1,nave,rol,A){const S=saldos(),ms=movs().filter(r=>!r.h&&r.f&&r.f>=d0&&r.f<=d1),R={},P={};
  const lin=id=>{const l=lotes.find(x=>x.id===id);return l?l.nave:null;};
  const add=(id,k,v)=>{const p=P[id]=P[id]||{id,rel:0,relC:0,mqC:0,fa:0,kg:0,mq:0,fuera:0,desc:0,descFa:0,tol:0,tolA:0,pis:0,pisA:0,rot:0};p[k]+=v;};
  for(let f=d0;f<=d1;f=diaSig(f))TURNOS.slice(0,relevosDia(f)).forEach(u=>NAVES.forEach(n=>{if(nave&&n!==nave)return;const ids=quienEn(f,n,u,rol);if(!ids.length)return;
    const C=ms.filter(r=>r.t==="C"&&r.f===f&&r.u===u&&lin(r.o)===n),fa=C.reduce((a,r)=>a+(r.fa||0),0),kg=C.reduce((a,r)=>a+Math.abs(kgAp(r,S)),0);
    let mq=0;try{if(primerEvMaq())mq=cuentaMaq(estadoMaq(f,u),n).on;}catch(e){}
    const fuera=C.some(r=>/fuera de fifo/i.test(r.n||""));
    ids.forEach(id=>{add(id,"rel",1);if(fa>0){add(id,"relC",1);add(id,"mqC",mq);}add(id,"fa",fa);add(id,"kg",kg);add(id,"mq",mq);if(fuera)add(id,"fuera",1);});R[f+"|"+u+"|"+n]=ids;}));
  ms.filter(r=>r.t==="A"&&Array.isArray(r.rel)&&/^Recuento diario/.test(r.n||"")).forEach(r=>{const n=lin(r.o||r.d);if(!n||(nave&&n!==nave))return;
    const ids=new Set();r.rel.forEach(x=>(R[x+"|"+n]||quienEn(x.split("|")[0],n,x.split("|")[1],rol)).forEach(i=>ids.add(i)));ids.forEach(id=>{add(id,"desc",1);add(id,"descFa",r.fa||0);});});
  /* cruce con el Almacén */
  if(A){const tolv=new Set(((A.cat&&A.cat.articulos)||[]).filter(a=>a.fam==="horno"&&(/tolva/i.test(a.desc||"")||/tolva/i.test(a.grupo||""))).map(a=>a.id));
    const reparte=(ev,k,kA,cant)=>{if(!ev.f||ev.f<d0||ev.f>d1)return;const n=A.naveDe(ev.maq);if(!n||(nave&&n!==nave))return;const u=relevoDeAp(ev);
      if(u){quienEn(ev.f,n,u,rol).forEach(id=>{if(P[id])add(id,k,cant);});return;}
      const ids=new Set();TURNOS.slice(0,Math.max(1,relevosDia(ev.f))).forEach(uu=>quienEn(ev.f,n,uu,rol).forEach(i=>ids.add(i)));ids.forEach(id=>{if(P[id])add(id,kA,cant);});};
    (A.mov||[]).filter(m=>m.tipo==="salida"&&tolv.has(m.art)).forEach(m=>reparte(m,"tol","tolA",+m.cant||1));
    (A.pist||[]).forEach(x=>{reparte(x,"pis","pisA",+x.cant||1);if(/rotur|agarrot/i.test(x.motivo||""))reparte(x,"rot","rot",+x.cant||1);});}
  return Object.values(P).filter(p=>p.rel>0);}
const r10=(v,rel)=>rel?Math.round(v/rel*100)/10:0;
const fmt1=v=>(Math.round(v*10)/10).toLocaleString("es-ES");
function hornQ(q){const H=hornCfg();return H.lista.filter(x=>{const w=nqC?nqC(x.n):x.n.toLowerCase();return w&&new RegExp("\\b"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b").test(q);});}
function pintaHorn(E,H){const {frase,nota,ent,card,tabla}=H;const per=E.per,rol=E.rol||"carga",nomRol=rol==="cuchara"?"cuchara de reparto":"carga del horno";
  if(!hornCfg().lista.length){ent("horneros");frase("Todavía no hay horneros apuntados. Ponlos en Consumo › Horneros (una semana basta: las siguientes salen por la rotación).");return;}
  const conAlm=["tolvas","pist","aver","ficha","todo"].includes(E.met);
  const pinta=A=>{const L=statsHorneros(per.d,per.h,E.nave,rol,A);
    if(!L.length){frase("No hay relevos con "+(rol==="cuchara"?"la cuchara":"horneros")+" apuntados en "+per.t+".");return;}
    const fpr=p=>p.relC?p.fa/p.relC:0,fpm=p=>p.mqC?p.fa/p.mqC:0,LC=L.filter(p=>p.relC),med=LC.length?LC.reduce((a,p)=>a+fpr(p),0)/LC.length:0;
    const medR=k=>{const T=L.reduce((a,p)=>a+p[k],0),Rr=L.reduce((a,p)=>a+p.rel,0);return r10(T,Rr);};
    const met=E.met;
    if(met==="ficha"){const yo=L.find(p=>p.id===E.quien);ent((rol==="cuchara"?"cuchara: ":"horno: ")+nomHorn(E.quien),[per.t,E.nave]);
      if(!yo){frase(nomHorn(E.quien)+" no tiene relevos apuntados "+(rol==="cuchara"?"con la cuchara ":"")+"en "+per.t+".");return;}
      const fila=(t,v,m,u)=>[t,v,m,u];
      frase(nomHorn(E.quien)+" ("+nomRol+") en "+per.t+": "+yo.rel+" relevos · "+fmt1(fpr(yo))+" f por relevo (media "+fmt1(med)+") · fuera de FIFO "+yo.fuera+" · descuadres de hoja "+yo.desc+(A?" · "+fmt1(r10(yo.tol+yo.tolA,yo.rel))+" tolvas y "+fmt1(r10(yo.pis+yo.pisA,yo.rel))+" pistones por cada 10 relevos":"")+".");
      card("Frente a la media",[tabla(["Dato",nomHorn(E.quien),"Media"],[
        ["Fardos por relevo",fmt1(fpr(yo)),fmt1(med)],["Por máquina en marcha",yo.mqC?fmt1(fpm(yo)):"—","—"],
        ["Fuera de FIFO (por 10 relevos)",fmt1(r10(yo.fuera,yo.rel)),fmt1(medR("fuera"))],["Descuadres de la hoja (por 10 relevos)",fmt1(r10(yo.desc,yo.rel)),fmt1(medR("desc"))]].concat(A?[
        ["Cambios de tolva (por 10 relevos)",fmt1(r10(yo.tol+yo.tolA,yo.rel)),fmt1((medR("tol")+medR("tolA")))],["Cambios de pistón (por 10 relevos)",fmt1(r10(yo.pis+yo.pisA,yo.rel)),fmt1((medR("pis")+medR("pisA")))],
        ["Pistones rotos o agarrotados (por 10 relevos)",fmt1(r10(yo.rot,yo.rel)),fmt1(medR("rot"))]]:[]),[1,2])]);
      nota("Comparado siempre por cada 10 relevos trabajados, para que no salga peor quien ha trabajado más.");return;}
    if(met==="fifo"){const o=L.slice().sort((a,b)=>b.fuera/b.rel-a.fuera/a.rel);const t=o.filter(p=>p.fuera>0);ent("FIFO · "+nomRol,[per.t,E.nave]);
      frase(t.length?"Quien menos sigue el FIFO en "+per.t+": "+t.slice(0,3).map(p=>nomHorn(p.id)+" "+p.fuera+" de "+p.rel+" relevos").join(" · ")+".":"En "+per.t+" ningún relevo con horneros apuntados se ha salido del FIFO.");
      card("FIFO por persona",[tabla(["Persona","Relevos","Fuera de FIFO","%"],o.map(p=>[nomHorn(p.id),String(p.rel),String(p.fuera),Math.round(p.fuera/p.rel*100)+" %"]),[1,2,3])]);
      nota("Cuenta los relevos en los que se gastó de una colada que no era la más antigua (lo marca el recuento diario o el consumo por relevo).");return;}
    if(met==="hoja"){const o=L.slice().sort((a,b)=>b.descFa-a.descFa);const t=o.filter(p=>p.desc>0);ent("la hoja frente al recuento · "+nomRol,[per.t,E.nave]);
      frase(t.length?"Quien más descuadra la hoja en "+per.t+": "+t.slice(0,3).map(p=>nomHorn(p.id)+" "+p.desc+(p.desc===1?" vez":" veces")+" ("+p.descFa+" f)").join(" · ")+".":"En "+per.t+" los recuentos han cuadrado con las hojas de todos.");
      card("La hoja frente al recuento",[tabla(["Persona","Relevos","Recuentos con descuadre","Fardos de diferencia"],o.map(p=>[nomHorn(p.id),String(p.rel),String(p.desc),String(p.descFa)]),[1,2,3])]);
      nota("Cuando el recuento diario no cuadra con las hojas, la diferencia se reparte entre los de los relevos de ese recuento (no se sabe de cuál de ellos es).");return;}
    if(met==="tolvas"||met==="pist"||met==="aver"){const k=met==="tolvas"?"tol":met==="pist"?"pis":"rot",kA=met==="tolvas"?"tolA":met==="pist"?"pisA":null;
      const v=p=>p[k]+(kA?p[kA]:0),o=L.slice().sort((a,b)=>r10(v(b),b.rel)-r10(v(a),a.rel)),T=L.reduce((a,p)=>a+v(p),0),Rr=L.reduce((a,p)=>a+p.rel,0),mR=r10(T,Rr);
      const que=met==="tolvas"?"cambios de tolva":met==="pist"?"cambios de pistón":"pistones rotos o agarrotados";ent(que+" · "+nomRol,[per.t,E.nave]);
      if(!o.some(p=>v(p)>0)){frase("En "+per.t+" no hay "+que+" en los relevos con "+(rol==="cuchara"?"cuchara":"horneros")+" apuntados.");return;}
      const top=o[0],x=mR?r10(v(top),top.rel)/mR:0;
      frase("Por cada 10 relevos ("+nomRol+", "+per.t+"): "+o.slice(0,4).map(p=>nomHorn(p.id)+" "+fmt1(r10(v(p),p.rel))).join(" · ")+". Media "+fmt1(mR)+"."+(x>=1.5&&top.rel>=5?" Con "+nomHorn(top.id)+" salen "+fmt1(x)+" veces más que la media.":""));
      card(que.charAt(0).toUpperCase()+que.slice(1)+" por persona",[tabla(["Persona","Relevos","Seguros (su relevo)"].concat(kA?["Del día (aprox.)"]:[]).concat(["Por cada 10 relevos"]),o.map(p=>[nomHorn(p.id),String(p.rel),String(p[k])].concat(kA?[String(p[kA])]:[]).concat([fmt1(r10(v(p),p.rel))])),kA?[1,2,3,4]:[1,2,3])]);
      nota("Sale del Almacén: los "+que+" de las máquinas de la nave. «Seguros» = el apunte lleva su relevo (campo Relevo, o se apuntó ese mismo día); «del día» = no se sabe el relevo y cuenta para todos los que trabajaron ese día. Para que sea fiable, pon el relevo al apuntarlos en el Almacén. Sirve para ver tendencias, no para culpar a nadie de un caso concreto.");return;}
    if(met==="todo"){ent("resumen por persona · "+nomRol,[per.t,E.nave]);
      frase("Resumen por persona ("+nomRol+", "+per.t+"). Todo por cada 10 relevos salvo el consumo, que es por relevo.");
      card("Por persona",[tabla(["Persona","Relevos","F por relevo","Fuera de FIFO","Descuadres","Tolvas","Pistones"],L.slice().sort((a,b)=>b.rel-a.rel).map(p=>[nomHorn(p.id),String(p.rel),fmt1(fpr(p)),fmt1(r10(p.fuera,p.rel)),fmt1(r10(p.desc,p.rel)),A?fmt1(r10(p.tol+p.tolA,p.rel)):"—",A?fmt1(r10(p.pis+p.pisA,p.rel)):"—"]).concat([["Media","",fmt1(med),fmt1(medR("fuera")),fmt1(medR("desc")),A?fmt1(medR("tol")+medR("tolA")):"—",A?fmt1(medR("pis")+medR("pisA")):"—"]]),[1,2,3,4,5,6])]);
      nota("Pregunta por una persona («cómo trabaja Juan») para verla frente a la media.");return;}
    const o=L.slice().sort((a,b)=>(fpm(b)||fpr(b))-(fpm(a)||fpr(a)));ent("consumo · "+nomRol,[per.t,E.nave]);
    frase("Quien más aluminio gasta en "+per.t+": "+o.slice(0,3).map(p=>nomHorn(p.id)+" "+fmt1(fpr(p))+" f por relevo"+(p.mqC?" ("+(Math.round(fpm(p)*100)/100).toLocaleString("es-ES")+" por máquina)":"")).join(" · ")+". Media "+fmt1(med)+" f por relevo.");
    card("Consumo por persona",[tabla(["Persona","Relevos (con consumo)","Fardos","Kilos","Fardos por relevo","Por máquina en marcha"],o.map(p=>[nomHorn(p.id),p.rel+" ("+p.relC+")",fmt(p.fa),fmt(p.kg),fmt1(fpr(p)),p.mqC?(Math.round(fpm(p)*100)/100).toLocaleString("es-ES"):"—"]),[1,2,3,4,5])]);
    nota("Para comparar de verdad mira «por máquina en marcha»: quien tiene más máquinas funcionando gasta más sin que sea culpa suya. Por relevo cuenta solo los relevos con consumo apuntado. Si en un relevo hay dos personas, el consumo cuenta para las dos.");};
  if(!conAlm){pinta(null);return;}
  const espera=frase("Cruzando con el Almacén…");
  almDatos().then(A=>{if(espera)espera.remove();pinta(A);}).catch(()=>{if(espera)espera.remove();pinta(null);nota("No he podido leer el Almacén: salen solo los datos de Coladas.");});}

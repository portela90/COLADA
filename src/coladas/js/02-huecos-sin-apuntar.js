/* ---------- Huecos sin apuntar ----------
   Días laborables (y cualquier día con algo apuntado) de las dos últimas
   semanas, hasta ayer: cada nave debe tener consumo en cada relevo, y la
   granalla en las naves que la usan. Un relevo sin producción se marca como
   "No hubo consumo" y deja de avisar. */
const diaSig=f=>{const d=new Date(+f.slice(0,4),+f.slice(5,7)-1,+f.slice(8,10)+1);return ymd(d);};
const DSEM=["dom","lun","mar","mié","jue","vie","sáb"];
const diaSem=f=>DSEM[new Date(+f.slice(0,4),+f.slice(5,7)-1,+f.slice(8,10)).getDay()];
function huecos(){
  const ms=todosMovs().filter(r=>!r.h&&r.f),cons=ms.filter(r=>r.t==="C"&&r.u),gran=ms.filter(r=>r.t==="G"&&!r.aj&&r.kg<0&&r.u);
  if(!cons.length)return[];
  const ini=cons.map(r=>r.f).sort()[0],lim=ymd(new Date(Date.now()-14*864e5)),desde=ini>lim?ini:lim,ayer=diaAntes(hoy());
  const paros=new Set(cfg.paros||[]),conDatos=new Set(ms.map(r=>r.f));
  const gIni=gran.length?gran.map(r=>r.f).sort()[0]:null,gNaves=NAVES.filter(n=>gran.some(r=>r.nv===n));
  const naveDe=r=>{const l=lotes.find(x=>x.id===r.o);return l?l.nave:r.nv;};
  const out=[];
  for(let f=desde;f<=ayer;f=diaSig(f)){
    const w=new Date(+f.slice(0,4),+f.slice(5,7)-1,+f.slice(8,10)).getDay();
    let nr=relevosDia(f);if(!nr){if(!conDatos.has(f))continue;nr=w===5?2:3;}
    const falta=[],f0=primerEvMaq();
    TURNOS.forEach((t,ti)=>{if(ti>=nr)return; /* relevos que no se trabajan ese día (viernes sin noche, fiestas) */
      const stD=f0&&f>=f0?cuentaMaq.bind(null,estadoMaq(f,t)):null;
      NAVES.forEach(n=>{const k=f+"|"+n+"|"+t;if(paros.has(k))return;if(stD&&!stD(n).on)return;
        if(!cons.some(r=>r.f===f&&r.u===t&&naveDe(r)===n))falta.push({f,t,n,g:false,k});});
      (stD?NAVES.filter(n=>stD(n).c>0):(gIni&&f>=gIni?gNaves:[])).forEach(n=>{const k=f+"|G|"+n+"|"+t;if(paros.has(k)||paros.has(f+"|"+n+"|"+t))return;
        if(!gran.some(r=>r.f===f&&r.u===t&&r.nv===n))falta.push({f,t,n,g:true,k});});
    });
    if(falta.length)out.push({f,falta});
  }
  return out;
}
function vHuecos(){
  const H=huecos(),lim=ymd(new Date(Date.now()-30*864e5));
  /* marcados "no hubo consumo" del último mes, para poder deshacerlos */
  const P=(cfg.paros||[]).filter(k=>k.slice(0,10)>=lim).sort().reverse();
  if(!H.length&&!P.length)return null;
  const tot=H.reduce((a,d)=>a+d.falta.length,0);
  const txtParo=k=>{const p=k.split("|"),g=p[1]==="G",n=g?p[2]:p[1],t=g?p[3]:p[2];return diaSem(p[0])+" "+dmy(p[0])+" · "+(g?"Granalla de cobre "+n:n)+" · "+t.toLowerCase();};
  const deshacer=async k=>{if(!(await confirmar("¿Quitar la marca «no hubo consumo» de "+txtParo(k)+"?\n\nVolverá a salir como pendiente si no tiene consumo apuntado.",{titulo:"Deshacer",ok:"Quitar marca"})))return;
    cfg.paros=(cfg.paros||[]).filter(x=>x!==k);try{await saveCfg();toast("Marca quitada");}catch(e){toast("No se pudo guardar");}};
  const bloqueP=P.length?el("details",{class:"paros"},[
    el("summary",{text:"Marcados como «no hubo consumo» ("+P.length+")"}),
    el("div",{class:"paros-lista"},P.map(k=>el("div",{class:"paro"},[el("span",{text:txtParo(k)}),
      el("button",{type:"button",class:"btn sec del edit",text:"Deshacer",onclick:()=>deshacer(k)})])))]):null;
  const pulsar=async x=>{
    const que=(x.g?"Granalla de cobre · "+x.n:x.n)+" · "+diaSem(x.f)+" "+dmy(x.f)+" · "+x.t;
    const v=await dialogo({titulo:que,texto:"No hay "+(x.g?"consumo de granalla de cobre":"ningún consumo")+" apuntado en este relevo.\n\nSi hubo producción, apúntalo ahora. Si la línea estuvo parada, márcalo y dejará de avisar.",
      ok:"Apuntar ahora",extra:{text:"No hubo consumo",valor:"paro"}});
    if(v===true){consModo="relevo";draft.rel={fecha:x.f,turno:x.t,L:{},g:{}};tab="consumo";try{localStorage.setItem("colada.tab",tab);}catch(e){}tabsUI();render();document.querySelector("main").scrollTop=0;}
    else if(v==="paro"){cfg.paros=(cfg.paros||[]).concat([x.k]);try{await saveCfg();toast("Marcado: no hubo consumo");}catch(e){toast("No se pudo guardar");}}
  };
  return el("div",{class:"card"},[
    el("div",{class:"hd"},[el("h2",{text:"Falta por apuntar"}),tot?el("span",{class:"pill warn",style:"margin-left:auto",text:tot+" relevo"+(tot===1?"":"s")}):el("span",{class:"pill ok",style:"margin-left:auto",text:"Todo apuntado"})]),
    el("div",{class:"bd hueco-lista"},H.map(d=>el("div",{class:"hueco-dia"},[
      el("b",{class:"num",text:diaSem(d.f)+" "+dmy(d.f)}),
      el("div",{class:"hueco-chips"},d.falta.map(x=>el("button",{type:"button",class:"chip"+(x.g?" cobre":""),text:(x.g?"Granalla de cobre "+x.n.replace("Nave ","N"):x.n)+" · "+x.t.toLowerCase(),onclick:()=>pulsar(x)})))]))
      .concat([tot?el("p",{class:"hint",text:"Toca un relevo para apuntarlo o para marcar que no hubo consumo. Se revisan las dos últimas semanas hasta ayer, de lunes a viernes."}):null,bloqueP]))
  ]);
}
/* ---------- Máquinas y previsión ---------- */
function maqEventos(){const o=[];for(const m in maqEv)for(const r of(maqEv[m]||[]))o.push(r);
  return o.sort((a,b)=>(a.f||"").localeCompare(b.f||"")||(TI(a.u)-TI(b.u))||(a.i||"").localeCompare(b.i||""));}
const primerEvMaq=()=>{const e=maqEventos();return e.length?e[0].f:null;};
/* estado de cada máquina en el día f y relevo u (sin u: al final del día).
   Un cambio vale desde su relevo en adelante, hasta el siguiente cambio.
   Sin ningún cambio: en marcha, AlSi9 y sin granalla de cobre. */
function estadoMaq(f,u){const st={};NAVES.forEach(n=>MAQ[n].forEach(m=>{st[m]={nave:n,on:true,cu:false,az:false};}));
  maqEventos().forEach(e=>{if(!st[e.m])return;if(e.f<f||(e.f===f&&(u==null||TI(e.u)<=TI(u))))st[e.m]={nave:st[e.m].nave,on:!!e.on,cu:!!e.cu,az:!!e.az};});return st;}
function cuentaMaq(st,n){const c={on:0,b:0,a:0,c:0};MAQ[n].forEach(m=>{const x=st[m];if(!x||!x.on)return;c.on++;if(x.az)c.a++;else c.b++;if(x.cu)c.c++;});return c;}
/* ---------- Cargador de bebederos ----------
   Con el cargador roto no se mete ninguna caja de bebederos al horno: se
   funde solo lingote y el consumo de fardos se dispara. Al arreglarlo hay
   muchos bebederos acumulados y el consumo de fardos baja mucho. Se apunta
   como un evento más de máquinas (m = "CARG|Nave"), on=false = roto. Esos
   relevos (y los de recuperación tras arreglarlo) no se usan para aprender
   el consumo normal. */
const CARG=n=>"CARG|"+n;
const antesOIgual=(e,f,u)=>e.f<f||(e.f===f&&(u==null||TI(e.u)<=TI(u)));
function evCarg(n){return maqEventos().filter(e=>e.m===CARG(n));}
function cargadorRoto(f,u,n){let r=false;evCarg(n).forEach(e=>{if(antesOIgual(e,f,u))r=!e.on;});return r;}
/* relevos trabajados desde (f1,u1) incluido hasta (f2,u2) sin incluir */
function relevosEntre(f1,u1,f2,u2){let n=0;for(let f=f1;f<=f2;f=diaSig(f)){const nr=relevosDia(f)||0;
  TURNOS.forEach((t,ti)=>{if(ti>=nr)return;if(f===f1&&ti<TI(u1))return;if(f===f2&&ti>=TI(u2))return;n++;});}return n;}
/* fase en un relevo: ok, roto, o recupera (tras arreglarlo, tantos relevos como estuvo roto, entre 2 y 6) */
function faseCargador(f,u,n){const ev=evCarg(n).filter(e=>antesOIgual(e,f,u));if(!ev.length)return"ok";
  const ult=ev[ev.length-1];if(!ult.on)return"roto";
  const roto=[...ev].reverse().find(e=>!e.on&&(e.f<ult.f||(e.f===ult.f&&TI(e.u)<TI(ult.u))));if(!roto)return"ok";
  const dur=relevosEntre(roto.f,roto.u,ult.f,ult.u),ven=Math.max(2,Math.min(6,dur));
  return relevosEntre(ult.f,ult.u,f,u)<ven?"recupera":"ok";}
function desdeCargador(n){const ev=evCarg(n);const u=ev[ev.length-1];return u&&!u.on?u:null;}
async function addMaqEv(evs){const g={};evs.forEach(r=>{const m=mesDe(r.f);(g[m]=g[m]||[]).push(r);});
  for(const m in g)await itemsAdd("maq",m,g[m]);}
/* ---------- Calendario de la fábrica ----------
   Relevos que se trabajan cada día: de lunes a jueves 3, los viernes 2 (el de
   noche no trabaja), sábados y domingos 0. Las fiestas y los cambios se guardan
   en cfg.calendario[fecha] = nº de relevos (0 a 3). */
const relevosBase=f=>{const w=new Date(+f.slice(0,4),+f.slice(5,7)-1,+f.slice(8,10)).getDay();return w===0||w===6?0:(w===5?2:3);};
const relevosDia=f=>{const c=(cfg.calendario||{})[f];return typeof c==="number"?c:relevosBase(f);};
/* días de trabajo equivalentes (un día completo = 3 relevos) */
const laborables=(desde,hasta)=>{let n=0;for(let f=desde;f<=hasta;f=diaSig(f))n+=relevosDia(f)/3;return Math.round(n*100)/100;};
/* Aprende el gasto por máquina y día: en cada día con consumo apuntado (y con
   estado de máquinas conocido), fardos gastados / máquinas en marcha con ese
   material. Mientras no hay días suficientes, parte del gasto medio real
   repartido entre las máquinas que hay ahora. */
function prevision(){
  const f0=primerEvMaq(),h=hoy(),lim=ymd(new Date(Date.now()-60*864e5));
  const ms=todosMovs().filter(r=>!r.h&&r.f&&r.u);
  const lot={};lotes.forEach(l=>{lot[l.id]=l;});
  /* se aprende por relevo: fardos del relevo / máquinas en marcha en ese relevo */
  const rel=[...new Set(ms.filter(r=>r.t==="C").map(r=>r.f+"|"+r.u))].filter(x=>{const f=x.slice(0,10);return f<h&&f>=lim&&f0&&f>=f0;}).sort();
  /* muestras (máquinas en marcha, gasto) de cada relevo: el gasto de lingote NO
     es proporcional a las máquinas (con máquinas paradas hay menos bebederos
     que refundir y se gasta más lingote), así que se ajusta una recta
     gasto = a + b·máquinas con los datos reales */
  const A={},X={};const acc=(k,v,md,fase)=>{if(fase&&fase!=="ok"){(X[k]=X[k]||[]).push([md,v,fase]);return;}(A[k]=A[k]||[]).push([md,v]);};
  rel.forEach(x=>{const f=x.slice(0,10),u=x.slice(11),st=estadoMaq(f,u);
    NAVES.forEach(n=>{const c=cuentaMaq(st,n);
      [["L-2630",c.b],["L-2521-B",c.a]].forEach(([mt,cnt])=>{
        const fa=ms.filter(r=>r.t==="C"&&r.f===f&&r.u===u&&lot[r.o]&&lot[r.o].nave===n&&lot[r.o].material===mt).reduce((a,r)=>a+(r.fa||0),0);
        if(cnt>0||fa>0)acc(key(n,mt),fa,cnt,faseCargador(f,u,n));});
      const g=ms.filter(r=>r.t==="G"&&!r.aj&&r.kg<0&&r.f===f&&r.u===u&&r.nv===n).reduce((a,r)=>a-r.kg,0);
      if(c.c>0||g>0)acc("G|"+n,g,c.c);});});
  const dias=[...new Set(rel.map(x=>x.slice(0,10)))];
  /* arranque: gasto medio real por día con consumo */
  const {B}=bloques(),stH=estadoMaq(h);
  const gDias={};ms.filter(r=>r.t==="G"&&!r.aj&&r.kg<0).forEach(r=>{const k=r.nv||"";gDias[k]=gDias[k]||{kg:0,d:new Set()};gDias[k].kg-=r.kg;gDias[k].d.add(r.f);});
  /* modelo por relevo: con 8+ relevos y al menos 3 cantidades distintas de
     máquinas, recta a+b·máq; con 6+ relevos, la media por relevo; si no, la
     media diaria real. Cero máquinas con ese material = no se gasta. */
  const modelo=(sm,cnt,medDia)=>{const T=TURNOS.length;
    if(!(cnt>0))return{dia:0,fuente:sm&&sm.length>=6?"datos":"media",pend:null,n:sm?sm.length:0};
    if(sm&&sm.length>=8&&new Set(sm.map(x=>x[0])).size>=3){
      const n=sm.length,mx=sm.reduce((a,x)=>a+x[0],0)/n,my=sm.reduce((a,x)=>a+x[1],0)/n;
      const vx=sm.reduce((a,x)=>a+(x[0]-mx)**2,0),cv=sm.reduce((a,x)=>a+(x[0]-mx)*(x[1]-my),0),b=vx>0?cv/vx:0,a0=my-b*mx;
      return{dia:Math.max(0,a0+b*cnt)*T,fuente:"recta",pend:b,n};}
    if(sm&&sm.length>=6){const my=sm.reduce((a,x)=>a+x[1],0)/sm.length;return{dia:my*T,fuente:"datos",pend:null,n:sm.length};}
    return{dia:medDia,fuente:"media",pend:null,n:sm?sm.length:0};};
  const out={lineas:{},gran:{},diasDatos:dias.length,relevos:rel.length,desde:f0};
  NAVES.forEach(n=>{const c=cuentaMaq(stH,n);
    [["L-2630",c.b],["L-2521-B",c.a]].forEach(([mt,cnt])=>{const k=key(n,mt),m=modelo(A[k],cnt,B[k]?B[k].medio:0);
      /* cuánto cambia el gasto con el cargador roto o recuperándose, comparado con lo normal */
      const fr=(fase)=>{const xs=(X[k]||[]).filter(x=>x[2]===fase);if(xs.length<2||!(m.dia>0))return null;
        const pr=xs.reduce((a,x)=>a+(m.pend!=null?Math.max(0,(m.dia/TURNOS.length)+m.pend*(x[0]-cnt)):m.dia/TURNOS.length),0);
        return pr>0?xs.reduce((a,x)=>a+x[1],0)/pr:null;};
      /* sin datos de otras veces se usa el % que se haya puesto a mano en Mínimos */
      const cg=cfg.cargador||{},fase=faseCargador(h,turnoAhora(),n),rR=fr("roto")||(cg.roto>0?1+cg.roto/100:null),rC=fr("recupera")||(cg.recup>0?1-cg.recup/100:null);
      const diaAhora=fase==="roto"&&rR?m.dia*rR:fase==="recupera"&&rC?m.dia*rC:m.dia;
      out.lineas[k]=Object.assign({nave:n,mat:mt,maq:cnt,fase,rRoto:rR,rRecup:rC,diaAhora},m);});
    const gd=gDias[n],m=modelo(A["G|"+n],c.c,gd&&gd.d.size?gd.kg/gd.d.size:0);
    out.gran[n]=Object.assign({maq:c.c},m);});
  return out;
}
function vPrevision(){
  const P=prevision(),{B}=bloques(),h=hoy(),mes=mesDe(h),fin=finDeMes(mes);
  const w=new Date(+h.slice(0,4),+h.slice(5,7)-1,+h.slice(8,10)).getDay();
  const hayHoy=todosMovs().some(r=>r.t==="C"&&r.f===h&&!r.h);
  const restan=Math.max(0,Math.round((laborables(h,fin)-(hayHoy?relevosDia(h)/3:0))*100)/100);
  const sig=(()=>{const d=new Date(+mes.slice(0,4),+mes.slice(5,7),1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");})();
  const diasSig=laborables(sig+"-01",finDeMes(sig));
  const PL=((cfg.plan||{})[mes]||{}),ents=(PL.entradas||[]).filter(x=>x.k&&x.f>h&&!x.rec);
  const filas=LINEAS.filter(([n,mt])=>pasaF(n,mt)).map(([n,mt])=>{const k=key(n,mt),x=P.lineas[k],b=B[k];
      const mc=mediaCamion(mt),kgf=b&&b.fa>0?b.kg/b.fa:(mc.kg&&mc.fa?mc.kg/mc.fa:KG_CAM/FA_CAM),prev=ents.filter(e=>e.k===k).reduce((a,e)=>a+e.fa,0);
      return Object.assign({k,b,kgf,prev,resto:x.dia*restan,sig:x.dia*diasSig},x);})
    .filter(x=>x.maq>0||(x.b&&x.b.fa>0));
  const f1=v=>(Math.round(v*10)/10).toLocaleString("es-ES");
  const cam=(f,mt)=>f>0?" ≈ "+(Math.round(f/mediaCamion(mt).fa*10)/10).toLocaleString("es-ES")+" cam.":"";
  const avisos=[];
  filas.forEach(x=>{const disp=(x.b?x.b.fa:0)+x.prev,falta=x.resto-disp;
    if(falta>0.5)avisos.push(etiqLinea(x.k)+": para acabar el mes faltan unos "+fmt(Math.ceil(falta))+" fardos"+cam(falta,x.mat)+" (tienes "+fmt(x.b?x.b.fa:0)+" en nave y externo"+(x.prev?" + "+fmt(x.prev)+" previstos":"")+").");});
  NAVES.filter(n=>!fStk.nave||fStk.nave===n).forEach(n=>{const e=desdeCargador(n);if(!e)return;
    const ls=filas.filter(x=>x.nave===n&&x.rRoto);
    avisos.unshift(n+": cargador de bebederos ROTO desde el "+dmy(e.f)+" ("+e.u.toLowerCase()+"). Se funde solo lingote"+(ls.length?": ahora "+ls.map(x=>MAT[x.mat].nom+" "+f1(x.diaAhora)+" f/día ("+(x.rRoto>=1?"+":"")+Math.round((x.rRoto-1)*100)+"%)").join(", "):"; cuando haya datos de otras veces, la app calculará cuánto sube")+". Esos relevos no cuentan para el consumo normal.");});
  NAVES.filter(n=>!fStk.nave||fStk.nave===n).forEach(n=>{const ls=filas.filter(x=>x.nave===n&&x.fase==="recupera");if(!ls.length)return;
    avisos.unshift(n+": cargador arreglado, se están metiendo los bebederos acumulados; el consumo de lingote estará más bajo unos relevos y tampoco cuenta para el consumo normal.");});
  const gk=granallaKg();
  const gTot=fStk.mat?0:NAVES.filter(n=>!fStk.nave||fStk.nave===n).reduce((a,n)=>a+P.gran[n].dia,0),gMaq=fStk.mat?0:NAVES.filter(n=>!fStk.nave||fStk.nave===n).reduce((a,n)=>a+P.gran[n].maq,0);
  if(gTot>0&&gk<gTot*restan)avisos.push("Granalla de cobre: para acabar el mes faltan unos "+fmt(gTot*restan-gk)+" kg.");
  const nuevo=filas.some(x=>x.fuente==="media")||NAVES.some(n=>P.gran[n].maq>0&&P.gran[n].fuente==="media");
  return el("div",{class:"card"},[
    el("div",{class:"hd"},[el("h2",{text:"Previsión de gasto"}),el("span",{class:"sub",style:"margin-left:auto",text:"quedan "+restan.toLocaleString("es-ES")+" día"+(restan===1?"":"s")+" de trabajo"})]),
    el("div",{class:"tw"},[el("table",{},[
      el("thead",{},[el("tr",{},[el("th",{text:"Línea"}),el("th",{class:"r",text:"Máquinas"}),el("th",{class:"r",text:"Al día"}),el("th",{class:"r",text:"Días en nave"}),el("th",{class:"r",text:"Resto del mes"}),el("th",{class:"r",text:Mayus(nomMes(sig).split(" ")[0])})])]),
      el("tbody",{},filas.map(x=>el("tr",{},[
        el("td",{},[el("span",{class:"tagm",style:"background:"+MAT[x.mat].col}),document.createTextNode(x.nave),el("div",{class:"sub",text:MAT[x.mat].nom+(x.fuente==="recta"&&x.pend!=null?" · "+(x.pend<0?"cada máquina parada suma "+f1(-x.pend*TURNOS.length)+" f/día":"cada máquina en marcha suma "+f1(x.pend*TURNOS.length)+" f/día"):"")})]),
        el("td",{class:"r num",text:String(x.maq)}),
        el("td",{class:"r num"},[el("div",{style:"font-weight:600",text:f1(x.diaAhora)+" f"}),el("div",{class:"sub",text:fmt(x.diaAhora*x.kgf)+" kg"}),
          x.fase!=="ok"?el("div",{class:"sub",style:"color:var(--warn)",text:(x.fase==="roto"?"cargador roto":"recuperando bebederos")+((x.fase==="roto"?x.rRoto:x.rRecup)?"":" · normal "+f1(x.dia)+" f")}):null]),
        el("td",{class:"r num",text:x.diaAhora>0&&x.b?String(Math.floor(x.b.faN/x.diaAhora)):"—"}),
        el("td",{class:"r num"},[el("div",{text:fmt(Math.ceil(x.resto))+" f"}),el("div",{class:"sub",text:fmt(x.resto*x.kgf)+" kg"})]),
        el("td",{class:"r num"},[el("div",{text:fmt(Math.ceil(x.sig))+" f"}),el("div",{class:"sub",text:fmt(x.sig*x.kgf/1000)+" t"+cam(x.sig,x.mat)})])]))
      .concat(gMaq>0||gTot>0?[el("tr",{},[
        el("td",{},[el("span",{class:"tagm",style:"background:var(--cobre)"}),document.createTextNode("Granalla de cobre"),el("div",{class:"sub",text:NAVES.filter(n=>P.gran[n].maq).map(n=>n+" "+f1(P.gran[n].dia)+" kg/día").join(" · ")})]),
        el("td",{class:"r num",text:String(gMaq)}),
        el("td",{class:"r num"},[el("div",{style:"font-weight:600",text:f1(gTot)+" kg"})]),
        el("td",{class:"r num",text:gTot>0?String(Math.floor(gk/gTot)):"—"}),
        el("td",{class:"r num",text:fmt(gTot*restan)+" kg"}),
        el("td",{class:"r num",text:fmt(gTot*diasSig)+" kg"})])]:[]))])]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:8px"},avisos.map(t=>el("div",{class:"banner w",text:t})).concat([
      el("p",{class:"hint",text:(nuevo?"Estimación inicial con el gasto medio real. ":"")+
        (P.relevos?"Aprendido de "+P.relevos+" relevo"+(P.relevos===1?"":"s")+" con consumo y máquinas registradas. ":"")+
        "Con 8 relevos y distintas cantidades de máquinas en marcha, la app calcula cuánto cambia el gasto de lingote al parar o arrancar máquinas (con máquinas paradas hay menos bebederos y se funde más lingote)."+
        " Los días cuentan según el calendario de Plan (viernes sin noche, fines de semana y fiestas sin trabajo). El mes siguiente equivale a "+diasSig.toLocaleString("es-ES")+" días completos."})]))
  ]);
}
function vMaquinas(){
  if(!mqFecha||mqFecha>hoy())mqFecha=hoy();if(!mqTurno)mqTurno=turnoAhora();
  const st=estadoMaq(mqFecha,mqTurno),sinDatos=!primerEvMaq();
  const cambia=async(ms,patch,txt)=>{const evs=ms.map(m=>{const x=Object.assign({},st[m],patch(st[m]));return{i:uid("q"),f:mqFecha,u:mqTurno,m,on:x.on,cu:x.cu,az:x.az};});
    try{await addMaqEv(evs);if(txt)toast(txt);}catch(e){toast("No se pudo guardar");}};
  const seccion=n=>{const c=cuentaMaq(st,n),roto=cargadorRoto(mqFecha,mqTurno,n),fz=faseCargador(mqFecha,mqTurno,n);
    return el("div",{class:"maq-nave"},[
      el("div",{class:"carg"+(roto?" roto":"")},[el("span",{},[el("b",{text:"Cargador de bebederos: "}),document.createTextNode(roto?"ROTO (solo lingote)":fz==="recupera"?"funciona · recuperando bebederos":"funciona")]),
        el("button",{type:"button",class:"btn sec peq",text:roto?"Ya funciona":"Marcar roto",onclick:async()=>{
          try{await addMaqEv([{i:uid("q"),f:mqFecha,u:mqTurno,m:CARG(n),on:roto}]);toast(n+": cargador "+(roto?"arreglado":"roto")+" desde "+dmy(mqFecha)+" "+mqTurno.toLowerCase());}catch(e){toast("No se pudo guardar");}}})]),
      el("div",{class:"maq-tit"},[el("b",{text:n}),el("span",{class:"sub",text:c.on+" en marcha · "+c.c+" con granalla de cobre · "+c.a+" AlSi12"}),
        el("button",{type:"button",class:"btn sec del edit",text:"Todas en marcha",onclick:()=>cambia(MAQ[n].filter(m=>!st[m].on),()=>({on:true}),n+": todas en marcha")}),
        el("button",{type:"button",class:"btn sec del",text:"Todas paradas",onclick:()=>cambia(MAQ[n].filter(m=>st[m].on),()=>({on:false}),n+": todas paradas")})]),
      el("div",{class:"maq-grid"},MAQ[n].map(m=>{const x=st[m];
        return el("div",{class:"maq"+(x.on?" on":"")},[
          el("button",{type:"button",class:"maq-on","aria-pressed":String(x.on),"aria-label":m+(x.on?" en marcha":" parada"),onclick:()=>cambia([m],y=>({on:!y.on}))},[
            el("b",{text:m}),el("span",{text:x.on?"En marcha":"Parada"})]),
          el("div",{class:"maq-op"},[
            el("button",{type:"button",class:"cu","aria-pressed":String(x.cu),title:"Con granalla de cobre","aria-label":m+" con granalla de cobre",onclick:()=>cambia([m],y=>({cu:!y.cu}))},[document.createTextNode("Granalla")]),
            el("button",{type:"button",class:"az","aria-pressed":String(x.az),title:"Material AlSi12","aria-label":m+" con AlSi12",onclick:()=>cambia([m],y=>({az:!y.az}))},[document.createTextNode("AlSi12")])])]);}))]);};
  const tot=NAVES.reduce((a,n)=>{const c=cuentaMaq(st,n);a.on+=c.on;a.c+=c.c;a.a+=c.a;return a;},{on:0,c:0,a:0});
  return el("details",{class:"card maqs",open:maqAbierto?"":null,ontoggle:e=>{maqAbierto=e.currentTarget.open;}},[
    el("summary",{class:"hd"},[el("h2",{text:"Máquinas"}),el("span",{class:"sub",style:"margin-left:auto",text:tot.on+" en marcha · "+tot.c+" granalla de cobre · "+tot.a+" AlSi12"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:14px"},[
      el("div",{class:"row"},[
        el("label",{text:"Fecha"},[el("input",{id:"mq-f",type:"date",max:hoy(),value:mqFecha,onchange:e=>{mqFecha=e.target.value||hoy();render();}})]),
        el("label",{text:"Relevo"},[el("div",{class:"seg"},TURNOS.map(t=>el("button",{type:"button","aria-pressed":String(mqTurno===t),text:t,onclick:()=>{mqTurno=t;render();}})))])]),
      sinDatos?el("div",{class:"banner w",text:"Marca qué máquinas están paradas y cuáles llevan granalla de cobre o trabajan con AlSi12. Mientras no marques nada, todas cuentan en marcha con AlSi9 y sin granalla de cobre."}):null,
      el("p",{class:"hint",text:"Toca el nombre para ponerla en marcha o pararla, y «Granalla» o «AlSi12» para lo que lleva (las demás trabajan con AlSi9). Cada cambio se guarda con la fecha de arriba"+(mqFecha!==hoy()?" ("+dmy(mqFecha)+")":" (hoy)")+" y el relevo elegido, y sigue igual en los relevos siguientes hasta que la vuelvas a cambiar. Si una máquina para por la tarde y arranca por la noche, marca cada cambio en su relevo."}),
      ...NAVES.filter(n=>!fStk.nave||fStk.nave===n).map(seccion)])]);
}
/* Ajuste de granalla por recuento: se apunta la diferencia como ajuste
   (cambia el stock pero no cuenta como consumo ni en la previsión) */
async function ajustarGranalla(){
  const gk=granallaKg();
  const r=await preguntar("La app tiene "+(Math.round(gk*100)/100).toLocaleString("es-ES")+" kg de granalla de cobre.\n\n¿Cuántos kg hay de verdad?",String(Math.round(gk*100)/100).replace(".",","),{titulo:"Ajustar granalla de cobre",ok:"Siguiente",teclado:"decimal"});
  if(r===null)return;
  const n=numES(r);if(!(n>=0)){toast("Pon un número de kilos");return;}
  const dif=Math.round((n-gk)*1000)/1000;if(!dif){toast("Cuadra, no hace falta ajuste");return;}
  const sg=dif>0?"+":"−";
  if(!(await confirmar("Ajuste de "+sg+Math.abs(dif).toLocaleString("es-ES")+" kg de granalla de cobre.\n\nQuedará en "+n.toLocaleString("es-ES")+" kg. ¿Lo apunto?",{titulo:"Confirmar ajuste",ok:"Apuntar"})))return;
  try{await addMov({i:uid("m"),t:"G",aj:true,f:hoy(),kg:dif,n:"Ajuste por recuento: "+n.toLocaleString("es-ES")+" kg (la app tenía "+(Math.round(gk*100)/100).toLocaleString("es-ES")+")"});toast("Ajuste apuntado");}
  catch(e){toast("No se pudo apuntar el ajuste");}
}
/* filtro de la pestaña Stock: nave y aleación (se recuerda en este aparato) */
let fStk={nave:"",mat:"",ubi:""};try{const x=JSON.parse(localStorage.getItem("colada.fstk")||"{}");fStk={nave:x.nave||"",mat:x.mat||"",ubi:x.ubi||""};}catch(e){}
const pasaF=(n,m)=>(!fStk.nave||fStk.nave===n)&&(!fStk.mat||fStk.mat===m);
function filtroStock(B){
  const pon=(k,v)=>{fStk[k]=v;try{localStorage.setItem("colada.fstk",JSON.stringify(fStk));}catch(e){}render();};
  const grupo=(k,ops)=>el("div",{class:"seg",role:"group"},ops.map(([v,t])=>el("button",{type:"button","aria-pressed":String(fStk[k]===v),text:t,onclick:()=>pon(k,v)})));
  const ls=LINEAS.filter(([n,m])=>pasaF(n,m)).map(([n,m])=>B[key(n,m)]);
  const t=ls.reduce((a,b)=>{a.faN+=b.faN;a.kgN+=b.kgN;a.faE+=b.faE;a.kgE+=b.kgE;return a;},{faN:0,kgN:0,faE:0,kgE:0});
  const mezcla=!fStk.mat&&new Set(ls.filter(b=>b.fa>0).map(b=>b.mat)).size>1;
  const resumen=mezcla?"":fStk.ubi==="nave"?": en nave "+fmt(t.faN)+" f ("+fmt(t.kgN)+" kg)":fStk.ubi==="externo"?": en externo "+fmt(t.faE)+" f ("+fmt(t.kgE)+" kg)":
    ": en nave "+fmt(t.faN)+" f ("+fmt(t.kgN)+" kg) · externo "+fmt(t.faE)+" f ("+fmt(t.kgE)+" kg) · total "+fmt(t.faN+t.faE)+" f ("+fmt(t.kgN+t.kgE)+" kg)";
  return el("div",{class:"card"},[el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[
    el("div",{class:"row"},[
      el("label",{text:"Nave"},[grupo("nave",[["","Todas"]].concat(NAVES.map(n=>[n,n])))]),
      el("label",{text:"Aleación"},[grupo("mat",[["","Todas"]].concat(Object.keys(MAT).map(m=>[m,MAT[m].nom])))]),
      el("label",{text:"Dónde"},[grupo("ubi",[["","Todo"],["nave","En nave"],["externo","Externo"]])])]),
    (fStk.nave||fStk.mat||fStk.ubi)?el("p",{class:"hint",style:"margin:0",text:(fStk.nave||"Las dos naves")+" · "+(fStk.mat?MAT[fStk.mat].nom:"todas las aleaciones")+(fStk.ubi?" · "+(fStk.ubi==="nave"?"en nave":"en externo"):"")+resumen}):null])]);
}
/* coladas con existencias, filtradas por nave, aleación y dónde están; la más antigua primero (FIFO) */
function coladasStock(){
  const {S}=bloques(),out=[];
  const filas=lotes.map(l=>({l,b:S[l.id]})).filter(x=>x.b&&x.b.fa>0&&pasaF(x.l.nave,x.l.material)&&(!fStk.ubi||x.l.donde===fStk.ubi));
  const grupos=[];LINEAS.forEach(([n,m])=>{const its=filas.filter(x=>x.l.nave===n&&x.l.material===m)
    .sort((a,c)=>(a.l.donde===c.l.donde?0:(a.l.donde==="nave"?-1:1))||(a.l.entrada||"").localeCompare(c.l.entrada||""));if(its.length)grupos.push({n,m,its});});
  if(!grupos.length)return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Coladas"})]),el("div",{class:"empty",text:"No hay coladas con existencias con este filtro."})]);
  const tb=[];grupos.forEach(g=>{
    tb.push(el("tr",{class:"grp"},[el("td",{colspan:"5"},[el("span",{class:"tagm",style:"background:"+MAT[g.m].col}),el("b",{text:g.n+" · "+MAT[g.m].nom})])]));
    let f=0,k=0;g.its.forEach(({l,b})=>{const kg=kgVis(b);f+=b.fa;k+=kg;const ext=l.donde==="externo";
      tb.push(el("tr",{class:ext?"ext":""},[
        el("td",{},[el("button",{type:"button",class:"linkcol",text:l.nombre,onclick:()=>abrirFicha(l.id)}),el("div",{class:"sub",text:[l.proveedor,l.albaran].filter(Boolean).join(" · ")})]),
        el("td",{text:ext?"Externo":"Nave"}),
        el("td",{class:"num",text:l.entrada?dmyA(l.entrada):"—"}),
        el("td",{class:"r num",style:"font-weight:600",text:fmt(b.fa)}),
        el("td",{class:"r num",text:fmt(kg)})]));});
    tb.push(el("tr",{class:"sub-tot"},[el("td",{colspan:"3",text:"Total "+g.n+" · "+MAT[g.m].nom}),el("td",{class:"r num",text:fmt(f)}),el("td",{class:"r num",text:fmt(k)})]));});
  const tot={};filas.forEach(({l,b})=>{const t=tot[l.material]=tot[l.material]||{f:0,k:0};t.f+=b.fa;t.k+=kgVis(b);});
  return el("div",{class:"card"},[
    el("div",{class:"hd"},[el("h2",{text:"Coladas"}),el("span",{class:"sub",style:"margin-left:auto",text:filas.length+" con existencias · la más antigua primero"})]),
    el("div",{class:"tw"},[el("table",{class:"col-stk"},[el("thead",{},[el("tr",{},[el("th",{text:"Colada"}),el("th",{text:"Dónde"}),el("th",{text:"Entrada"}),el("th",{class:"r",text:"Fardos"}),el("th",{class:"r",text:"Kg"})])]),el("tbody",{},tb)])]),
    Object.keys(tot).length>1||grupos.length>1?el("div",{class:"bd"},[el("p",{class:"hint",style:"margin:0",text:"Total por aleación: "+Object.keys(MAT).filter(m=>tot[m]).map(m=>MAT[m].nom+" "+fmt(tot[m].f)+" f · "+fmt(tot[m].k)+" kg").join("  ·  ")})]):null]);
}
function dosCol(a,b,cl){const c=x=>el("div",{class:"col"},x.filter(Boolean));return el("div",{class:"dosc"+(cl?" "+cl:"")},[c(a),c(b)]);}
function vStock(){
  const {B,dias}=bloques();
  if(parteDia&&parteDia>hoy())parteDia="";
  const ud=parteDia||diaParte(),P=ud?conCorte(ud,()=>bloques(ud).B):B;
  const parte=conCorte(ud,()=>vParte(P,ud,B));
  const g=el("div",{class:"stock"});
  [["Nave 1","L-2630"],["Nave 1","L-2521-B"],["Nave 2","L-2630"],["Nave 2","L-2521-B"]].filter(([n,m])=>pasaF(n,m)).forEach(([n,m])=>{
    const b=B[key(n,m)],mn=cfg.minimos[key(n,m)]||{},[st,tx]=estado(b,mn);
    g.appendChild(el("div",{class:"sc s-"+st},[
      el("div",{class:"stripe"}),
      el("div",{class:"top"},[el("span",{class:"dot",style:"background:"+MAT[m].col}),el("span",{class:"nm",text:n}),el("span",{class:"al",text:MAT[m].nom}),el("span",{class:"pill "+st,text:tx,style:"margin-left:auto"})]),
      el("div",{class:"dias"},[
        el("b",{class:"num",text:b.dias==null?"—":String(b.dias)}),
        el("i",{text:b.dias==null?"sin consumo registrado":(b.dias===1?"día de material en la nave":"días de material en la nave")})
      ]),
      el("div",{class:"split"},[
        el("div",{},[el("dt",{text:"En la nave"}),el("dd",{class:"num"},[document.createTextNode(fmt(b.faN)+" "),el("small",{text:"fardos · "+fmt(b.kgN)+" kg"})])]),
        el("div",{},[el("dt",{text:"En el externo"}),el("dd",{class:"num"},[document.createTextNode(fmt(b.faE)+" "),el("small",{text:"fardos · "+fmt(b.kgE)+" kg"})])])
      ]),
      el("div",{class:"foot"},[
        el("span",{},[document.createTextNode("Mínimo "),el("b",{class:"num",text:(mn.fardosNave||0)+" f"})]),
        el("span",{},[document.createTextNode("Gasto "),el("b",{class:"num",text:b.medio.toLocaleString("es-ES")+" f/día"})]),
        el("span",{},[document.createTextNode("Último día "),el("b",{class:"num",text:fmt(P[key(n,m)].cUd)+" kg"})])
      ])
    ]));
  });
  const gk=granallaKg(),gm=(cfg.granalla&&cfg.granalla.min)||0,gst=gk<gm?"bad":(gk<gm*1.35?"warn":"ok");
  if(!fStk.mat)g.appendChild(el("div",{class:"sc s-"+(gm>0?gst:"na")},[
    el("div",{class:"stripe"}),
    el("div",{class:"top"},[el("span",{class:"dot",style:"background:var(--cobre)"}),el("span",{class:"nm",text:"Granalla de cobre"}),gm>0?el("span",{class:"pill "+gst,text:gk<gm?"Bajo mínimo":"OK",style:"margin-left:auto"}):el("span",{class:"pill na",text:"Sin mínimo",style:"margin-left:auto"})]),
    el("div",{class:"dias"},[el("b",{class:"num",text:fmt(gk)}),el("i",{text:"kg en total"})]),
    el("div",{class:"split"},[el("div",{},[el("dt",{text:"Mínimo"}),el("dd",{class:"num",text:fmt(gm)+" kg"})]),el("div",{},[el("dt",{text:"Margen"}),el("dd",{class:"num",text:fmt(gk-gm)+" kg"})])]),
    el("div",{class:"foot"},[el("button",{type:"button",class:"btn sec",style:"font-size:13px;padding:5px 10px",text:"Ajustar por recuento",onclick:ajustarGranalla})])
  ]));
  const alerta=Object.keys(B).filter(k=>{const b=B[k];return b.dias!=null&&b.dias<=5&&pasaF(b.nave,b.mat);}).map(k=>B[k]);
  const der=[vHuecos(),vPrevision(),vMaquinas(),g];
  if(alerta.length)der.push(el("div",{class:"banner b",text:"Queda material para "+alerta.map(b=>b.nave+" "+MAT[b.mat].nom+": "+b.dias+" día"+(b.dias===1?"":"s")).join(" · ")+". Conviene traer del almacén externo o pedir."}));
  der.push(vMin());
  /* en el ordenador: coladas y parte a la izquierda, el resto a la derecha; en el móvil, una cosa debajo de otra como siempre */
  const out=[avisoCierre(),filtroStock(B),dosCol([coladasStock(),parte],der,"ancha-izq")].filter(Boolean);
  out.push(el("p",{class:"hint",text:"El gasto medio sale de "+dias+" días distintos con consumo registrado. Los días de material cuentan sólo los fardos que están en la nave: lo del almacén externo no se puede fundir hasta traerlo."}));
  return out;
}


/* ---------- Recuento diario ----------
   Cada mañana: 1) de las hojas, los fardos que ha gastado cada relevo desde el último recuento
   (o los kilos de cada fardo, separados por espacios); 2) los fardos que se cuentan en nave de cada colada.
   La app compara las dos cosas, avisa si no cuadran, apunta los consumos de cada relevo en las coladas
   que han bajado (aunque no sigan el FIFO) y deja cada colada en lo contado con un ajuste si hace falta.
   Después da el parte para compras: consumo del día anterior y lo que queda de cada colada en nave y externo.
   Los relevos ya apuntados (p. ej. la parte de la mañana de ayer que entró en el recuento de ayer)
   se restan solos: en cada relevo se escribe el total de la hoja. */
const RD_MAX=12;
const NOMDIA=["dom","lun","mar","mié","jue","vie","sáb"],NOMDIAL=["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
const fDate=f=>new Date(+f.slice(0,4),+f.slice(5,7)-1,+f.slice(8,10));
const fMas=(f,n)=>{const d=fDate(f);d.setDate(d.getDate()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const nomLote=id=>(lotes.find(l=>l.id===id)||{}).nombre||"?";
/* relevos desde el del último recuento hasta el de ahora */
/* el relevo en marcha: de 0 a 6 h todavía es la noche del día anterior */
function relevoAhora(){const d=new Date();if(d.getHours()<6){d.setDate(d.getDate()-1);return{f:d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"),u:"Noche"};}return{f:hoy(),u:turnoAhora()};}
/* cada nave lleva su recuento: se cuenta primero una y luego la otra */
const rdDe=n=>{const x=(cfg.rdiarioN||{})[n];return x&&x.f?x:(cfg.rdiario&&cfg.rdiario.f&&!cfg.rdiario.nave?cfg.rdiario:null);};
const rdHoyN=n=>{const x=(cfg.rdiarioN||{})[n];return !!(x&&x.ts&&new Date(x.ts).toDateString()===new Date().toDateString());};
function relevosRD(nave){const RA=relevoAhora(),h=RA.f,ta=TURNOS.indexOf(RA.u),R=[];
  const ult=rdDe(nave);
  let f=ult?ult.f:fMas(h,-1),i0=ult?Math.max(0,TURNOS.indexOf(ult.u)):0;
  if(!ult){let k=0;while(relevosDia(f)===0&&k<10){f=fMas(f,-1);k++;}}
  for(let k=0;k<40&&f<=h;k++,f=fMas(f,1),i0=0){const n=relevosDia(f);
    for(let t=i0;t<n;t++){if(f===h&&t>ta)break;R.push({f,u:TURNOS[t]});}}
  /* los relevos ya apuntados no se vuelven a pedir: se empieza en el último que tiene consumo
     (puede estar a medias) y se siguen los que faltan */
  const ms=todosMovs().filter(r=>r.t==="C"&&!r.h&&(!nave||(lotes.find(l=>l.id===r.o)||{}).nave===nave));let j=-1;
  R.forEach((r,i)=>{if(ms.some(x=>x.f===r.f&&x.u===r.u))j=i;});
  return R.slice(Math.max(0,j)).slice(-RD_MAX);}
/* fardos gastados que no salen en la hoja porque la etiqueta no está pegada (o se ha perdido): se apuntan como
   consumo «pendiente de etiqueta» (pe) en el relevo en que se gastaron, sin ajuste. Cuando la hoja de ese relevo ya
   trae la etiqueta, el pendiente se cierra solo (no se vuelve a contar); si no, se cierra a mano: pegada o perdida */
const PE_N=" · falta la etiqueta en la hoja";
const pendientesEt=nave=>todosMovs().filter(r=>r.t==="C"&&r.pe&&!r.h&&(!nave||(lotes.find(l=>l.id===r.o)||{}).nave===nave)).sort((a,b)=>(a.f+a.u).localeCompare(b.f+b.u));
const relTxt=r=>NOMDIA[fDate(r.f).getDay()]+" "+dmy(r.f)+" "+String(r.u||"").toLowerCase();
async function cierraPend(r,como,kg){const nu=Object.assign({},r);delete nu.pe;nu.n=String(r.n||"").replace(PE_N,"")+(como==="perdida"?" · etiqueta perdida":" · etiqueta pegada después");
  if(kg>0){nu.kg=Math.round(kg*100)/100;nu.pk=[nu.kg];}await guardarMov(r,nu);}
function dlgPend(r){const l=lotes.find(x=>x.id===r.o)||{};let kg="";
  const cerrar=()=>ov.remove();
  const ki=el("input",{id:"pe-kg",class:"num",type:"text",inputmode:"decimal",placeholder:"Opcional: kilos de la etiqueta",oninput:e=>{kg=e.target.value;}});
  const va=async(b,como)=>{const k=Number(String(kg).replace(",","."));if(como==="pegada"&&String(kg).trim()&&!(k>0)){toast("Los kilos no son un número");return;}
    b.disabled=true;try{await cierraPend(r,como,como==="pegada"?k:0);cerrar();toast(como==="perdida"?"Cerrado: etiqueta perdida":"Cerrado: etiqueta pegada");render();}catch(x){b.disabled=false;if(!x.candado)toast("No se pudo guardar");}};
  const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)cerrar();}},[el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"Fardo pendiente de etiqueta"},[
    el("h3",{text:"Fardo pendiente de etiqueta"}),
    el("p",{class:"sub",text:(l.nombre||"?")+" · "+(l.nave||"")+" · "+relTxt(r)+" · "+fmt(r.fa||0)+" f"+(r.kg?" · "+fmt(r.kg)+" kg (peso medio)":"")}),
    el("p",{class:"hint",text:"Ya cuenta como consumo de ese relevo. Si ya han pegado la etiqueta en la hoja, ciérralo (y si quieres, pon los kilos de la etiqueta). Si la etiqueta se ha perdido, ciérralo como perdida: se queda con el peso medio."}),
    el("label",{text:"Kilos de la etiqueta"},[ki]),
    el("div",{class:"dlg-b"},[el("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:cerrar}),
      el("button",{type:"button",class:"btn sec",id:"pe-perdida",text:"Etiqueta perdida",onclick:e=>va(e.currentTarget,"perdida")}),
      el("button",{type:"button",class:"btn",id:"pe-pegada",text:"Etiqueta pegada",onclick:e=>va(e.currentTarget,"pegada")})])])]);
  document.body.appendChild(ov);}
function cardPendientes(nave){const P=pendientesEt(nave);if(!P.length)return null;
  return el("div",{class:"card",id:"rd-pend"},[el("div",{class:"hd"},[el("h2",{text:"Fardos pendientes de etiqueta"}),el("span",{class:"der pill warn",text:P.reduce((a,r)=>a+(r.fa||0),0)+" f"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:8px"},[
      el("p",{class:"hint",style:"margin:0",text:"Gastados pero sin etiqueta en la hoja. Ya cuentan como consumo. Cuando escribas el total de la hoja de su relevo con la etiqueta ya pegada, se cierran solos; si no, tócalos para cerrarlos."}),
      el("div",{class:"hueco-chips"},P.map(r=>{const d=Math.round((fDate(hoy())-fDate(r.f))/864e5);return el("button",{type:"button",class:"chip"+(d>7?" warn":""),text:nomLote(r.o)+" · "+relTxt(r)+" · "+fmt(r.fa)+" f"+(d>0?" · hace "+d+(d===1?" día":" días"):""),onclick:()=>dlgPend(r)});}))])]);}
/* lo escrito en un relevo: un número pequeño = fardos; números de cientos = kilos de cada fardo; uno muy grande = kilos totales */
function leerRD(t,media){t=String(t||"").trim();if(!t)return null;
  const nums=numsFardos(t);
  if(!nums.length)return null;if(nums.some(n=>!(n>=0)))return{error:"Hay algo que no es un número."};
  if(nums.length===1&&nums[0]<100){if(!Number.isInteger(nums[0]))return{error:"Los fardos van sin decimales."};return{fa:nums[0],k:[]};}
  if(nums.length===1&&nums[0]>1500){const fa=media>0?Math.max(1,Math.round(nums[0]/media)):0;return fa?{fa,kgT:nums[0],k:[]}:{error:"No sé cuántos fardos son esos kilos."};}
  if(nums.some(n=>n<100))return{error:"Mezcla de fardos y kilos: escribe o el número de fardos o los kilos de cada fardo."};
  return{fa:nums.length,k:nums};}
function vRecuentoDiario(){
  const d=draft.rd=draft.rd||{};if(!d.R)d.R={};if(!d.C)d.C={};if(!d.K)d.K={};if(!d.M)d.M={};if(!d.PR)d.PR={};
  const {S}=bloques(),h=hoy();
  const navesL=NAVES.filter(n=>LINEAS.some(([a,m])=>a===n&&fifoLista(a,m,S).length));
  if(!navesL.includes(d.nave))d.nave=navesL.find(n=>!rdHoyN(n))||navesL[0]||NAVES[0];
  const nave=d.nave,R=relevosRD(nave);
  const lineas=LINEAS.filter(([n,m])=>n===nave&&fifoLista(n,m,S).length);
  const ms=todosMovs();
  const yaDe=(r,n,m)=>ms.filter(x=>x.t==="C"&&x.f===r.f&&x.u===r.u&&x.o&&(()=>{const l=lotes.find(y=>y.id===x.o);return l&&l.nave===n&&l.material===m;})());
  const vivos=[];
  const calc=()=>{let err=0,avisos=0,algo=false;const out={};
    lineas.forEach(([n,m])=>{const k=key(n,m),lista=fifoLista(n,m,S),media=lista.length?mediaCol(S[lista[0].id]):0;
      const rel=R.map((r,j)=>{const ya=yaDe(r,n,m),yaFa=ya.reduce((a,x)=>a+(x.fa||0),0);const p=leerRD((d.R[k]||{})[j],media);
        const o={r,ya,yaFa,p,nuevo:0,kNuevo:[]};
        if(p&&p.error){o.err=p.error;err++;}
        else if(p){const peL=ya.filter(x=>x.pe),pend=peL.reduce((a,x)=>a+(x.fa||0),0),min=yaFa-pend;
          if(p.fa<min){o.err="Ya hay "+min+" f apuntados en este relevo: escribe el total de la hoja (como mínimo "+min+").";err++;}
          else{o.nuevo=Math.max(0,p.fa-yaFa);o.cierra=cubrePend(peL,p.fa-min);o.kNuevo=p.k.length?p.k.slice(yaFa):[];if(p.kgT){o.kgT=p.kgT;}if(o.nuevo)algo=true;}}
        /* pesos por colada (cuando han bajado varias): mandan sobre la casilla del relevo */
        const K=((d.K[k]||{})[j])||{},ids=lista.map(l=>l.id).filter(id=>String(K[id]||"").trim());
        if(ids.length&&!(p&&p.error)){const por=[];let tf=0,mal="";
          ids.forEach(id=>{const q=leerRD(K[id],mediaCol(S[id]));if(!q)return;if(q.error){mal=nomLote(id)+": "+q.error;return;}
            const yl=ya.filter(x=>x.o===id).reduce((a,x)=>a+(x.fa||0),0),peL=ya.filter(x=>x.o===id&&x.pe),yp=peL.reduce((a,x)=>a+(x.fa||0),0);if(q.fa<yl-yp){mal=nomLote(id)+": ya hay "+(yl-yp)+" f apuntados de esta colada en este relevo.";return;}
            tf+=q.fa;por.push({id,cierra:cubrePend(peL,q.fa-(yl-yp)),nuevo:Math.max(0,q.fa-yl),kNuevo:q.k.length?q.k.slice(yl):[],kgT:q.kgT?q.kgT*(q.fa-yl)/q.fa:0});});
          const yaSin=yaFa-ya.filter(x=>x.pe).reduce((a,x)=>a+(x.fa||0),0);
          if(!mal&&tf<yaSin)mal="La suma por colada ("+tf+" f) es menos que lo ya apuntado en este relevo ("+yaSin+" f).";
          if(!mal&&p&&p.fa!==tf)mal="La casilla del relevo dice "+p.fa+" f y la suma por colada "+tf+" f.";
          if(mal){o.err=mal;err++;o.nuevo=0;o.kNuevo=[];}
          else{o.por=por;o.porFa=tf;o.cierra=por.flatMap(x=>x.cierra);o.nuevo=por.reduce((a,x)=>a+x.nuevo,0);o.kNuevo=[];o.kgT=0;if(o.nuevo)algo=true;}}
        return o;});
      const tRel=rel.reduce((a,o)=>a+o.nuevo,0);
      const exp={};fifoReparto(lista,tRel,S).forEach(x=>{if(x.lote)exp[x.lote]=(exp[x.lote]||0)+numES(x.fa);});
      const C=lista.map(l=>{const s=S[l.id].fa,t=(d.C[l.id]==null?"":String(d.C[l.id])).trim(),c=t===""?NaN:Number(t.replace(",","."));
        const fifo=s-(exp[l.id]||0);const o={l,s,fifo,c,vacio:t===""};
        if(t!==""&&!(c>=0&&Number.isInteger(c))){o.err="Escribe un número entero de fardos.";err++;}
        else if(t===""){err++;}else{o.gas=s-c;algo=true;}
        return o;});
      const tCnt=C.reduce((a,o)=>a+(o.gas||0),0);
      const msg=[];
      const faltan=C.filter(o=>o.vacio).length;if(faltan)msg.push(["i","Falta contar "+faltan+" colada"+(faltan===1?"":"s")+". Si no ha cambiado, pulsa su número «Por FIFO»."]);
      C.forEach(o=>{if(o.gas<0){msg.push(["b",o.l.nombre+": has contado "+o.c+" y en la app quedaban "+o.s+". Si es así se apunta un ajuste de +"+(-o.gas)+" f; si ha subido algo del externo, apunta antes el traslado."]);avisos++;}});
      if(!faltan&&!C.some(o=>o.err)&&!rel.some(o=>o.err)){
        if(tCnt!==tRel){avisos++;msg.push(["w","Las hojas dicen "+tRel+" fardos y el recuento dice que se han gastado "+tCnt+(tCnt>tRel?": en las hojas falta"+(tCnt-tRel===1?" 1 fardo":"n "+(tCnt-tRel)+" fardos"):": en las hojas sobra"+(tRel-tCnt===1?" 1 fardo":"n "+(tRel-tCnt)+" fardos"))+(d.M[k]==="pend"&&tCnt>tRel?". Se guarda lo contado y la diferencia queda como fardo pendiente de etiqueta, sin ajuste.":". Se guarda lo contado y la diferencia queda como ajuste.")]);}
        else if(tRel)msg.push(["ok","Cuadra: "+tRel+" fardo"+(tRel===1?"":"s")+" en las hojas y en el recuento."]);
        {const ce=rel.reduce((a,o)=>a+(o.cierra||[]).reduce((b,r)=>b+(r.fa||0),0),0);if(ce)msg.push(["ok","Etiqueta pegada: "+(ce===1?"el fardo pendiente se cierra":ce+" fardos pendientes se cierran")+" (ya contaba"+(ce===1?"":"n")+" como consumo, no se suma otra vez)."]);}
        const usadas=C.filter(o=>o.gas>0);const fuera=usadas.length>1||(usadas.some(o=>o.gas>(exp[o.l.id]||0))&&C.some(o=>(exp[o.l.id]||0)>0&&(o.gas||0)<exp[o.l.id]));
        if(usadas.length&&fuera)msg.push(["i","No han seguido el FIFO: se ha gastado de "+usadas.map(o=>o.l.nombre+" ("+o.gas+")").join(", ")+". Se apunta así, en las coladas que han bajado."]);}
      rel.forEach(o=>{if(o.err)msg.push(["b",dmy(o.r.f)+" "+o.r.u.toLowerCase()+": "+o.err]);});
      out[k]={n,m,lista,media,rel,tRel,C,tCnt,msg};});
    return{out,err,avisos,algo};};
  /* reparto: los fardos nuevos de cada relevo, por orden, a las coladas que han bajado (más antigua primero);
     si las hojas dicen más, lo que sobra va por FIFO; luego cada colada se deja en lo contado con un ajuste */
  /* motivo de los ajustes de una línea: si sobra en una colada y falta en otra, se apuntó en otra colada; si no, las hojas apuntaron mal el consumo */
  /* los pendientes de etiqueta que ya salen en la hoja (el total de la hoja pasa de lo apuntado sin ellos) */
  function cubrePend(L,q){const out=[];for(const r of L){if(q<=0)break;if((r.fa||0)<=q){out.push(r);q-=r.fa||0;}}return out;}
  const motAuto=A=>A.some(r=>r.o)&&A.some(r=>r.d)?"colada":"con";
  const plan=C=>{const recs=[],aj=[];
    Object.values(C.out).forEach(o=>{const cap={};o.C.forEach(x=>{cap[x.l.id]=Math.max(0,x.gas||0);});const asig={};
      const orden=o.C.map(x=>x.l.id);
      o.rel.forEach(rr=>{let rem=rr.nuevo,kk=rr.kNuevo.slice();if(!rem)return;const tomar=(id,q,lst,kgT,tot)=>{const pk=(lst||kk).splice(0,q);
          const r={i:uid("m"),t:"C",f:rr.r.f,u:rr.r.u,o:id,fa:q,n:"Recuento diario"};
          /* fuera de FIFO: se gasta de esta colada quedando fardos de una más antigua */
          const iO=orden.indexOf(id);if(iO>0&&orden.slice(0,iO).some(j=>(S[j].fa-(asig[j]||0))>0))r.n+=" · Fuera de FIFO";
          if(pk.length===q&&q){r.pk=pk;r.kg=Math.round(pk.reduce((a,b)=>a+b,0)*100)/100;}
          else if(kgT!=null?kgT:rr.kgT){r.kg=Math.round((kgT!=null?kgT:rr.kgT)*q/(tot||rr.nuevo));r.n+=" · kilos totales del relevo";}
          recs.push(r);asig[id]=(asig[id]||0)+q;cap[id]=Math.max(0,(cap[id]||0)-q);rem-=q;};
        if(rr.por){rr.por.forEach(x=>{if(x.nuevo>0)tomar(x.id,x.nuevo,x.kNuevo.slice(),x.kgT||null,x.nuevo);});return;}
        for(const id of orden){if(rem<=0)break;const q=Math.min(rem,cap[id]);if(q>0)tomar(id,q);}
        for(const id of orden){if(rem<=0)break;const libre=(S[id].fa-(asig[id]||0));const q=Math.min(rem,Math.max(0,libre));if(q>0)tomar(id,q);}
        if(rem>0&&orden.length)tomar(orden[orden.length-1],rem);});
      o.C.forEach(x=>{const queda=x.s-(asig[x.l.id]||0),df=queda-x.c;if(!df)return;const rx=S[x.l.id].rx||S[x.l.id].ratio||0;
        const r={i:uid("m"),t:"A",f:relevoAhora().f,u:relevoAhora().u,fa:Math.abs(df),kg:Math.round(Math.abs(df)*rx),n:"Recuento diario: "+(df>0?"faltan ":"sobran ")+Math.abs(df)+" f frente a las hojas",rel:R.map(z=>z.f+"|"+z.u)};
        if(df>0)r.o=x.l.id;else r.d=x.l.id;aj.push(r);});
      {const mia=aj.filter(r=>o.C.some(x=>x.l.id===(r.o||r.d)));const mk=d.M[key(o.n,o.m)]||motAuto(mia);
        if(mk==="pend"&&mia.some(r=>r.o)){const j=d.PR[key(o.n,o.m)],rr=R[j!=null&&R[j]?j:R.length-1]||relevoAhora();
          mia.forEach(r=>{if(r.o){recs.push({i:r.i,t:"C",f:rr.f,u:rr.u,o:r.o,fa:r.fa,kg:r.kg,pe:1,n:"Recuento diario"+PE_N});aj.splice(aj.indexOf(r),1);}else r.mot="con";});}
        else mia.forEach(r=>{r.mot=mk==="pend"?"con":mk;});}});
    return{recs,aj};};
  const relLbl=(r,j)=>NOMDIA[fDate(r.f).getDay()]+" "+dmy(r.f)+" "+r.u.toLowerCase();
  const relSub=(r,j)=>r.f===relevoAhora().f&&r.u===relevoAhora().u?"hasta ahora":j===0&&rdDe(nave)&&rdDe(nave).f===r.f&&rdDe(nave).u===r.u?"entera, de la hoja":"";
  const resumen=[];
  const cards=lineas.map(([n,m])=>{const k=key(n,m),lista=fifoLista(n,m,S);d.R[k]=d.R[k]||{};
    const pill=el("span",{style:"margin-left:auto"}),res=el("div",{style:"display:flex;flex-direction:column;gap:6px"});
    const rels=R.map((r,j)=>{const ya=yaDe(r,n,m),yaFa=ya.reduce((a,x)=>a+(x.fa||0),0),sub=relSub(r,j),info=el("span",{class:"rd-ya"});
      vivos.push(C=>{const o=C.out[k].rel[j];info.textContent=o.por&&!o.err?"por colada: "+o.porFa+" f":o.p&&!o.err&&o.p.k.length?o.p.fa+" f · "+fmt(o.p.k.reduce((a,b)=>a+b,0))+" kg":o.p&&o.p.kgT?"≈ "+o.p.fa+" f":yaFa?"ya apuntados "+yaFa+" f":"";
        info.className="rd-ya"+(o.err?" mal":"");});
      const quien=quienTxt(r.f,n,r.u);
      return el("label",{class:"rd-rel"},[el("span",{class:"rd-rl"},[document.createTextNode(relLbl(r,j)),sub?el("small",{text:" ("+sub+")"}):null,quien?el("small",{class:"rd-quien",text:" · "+quien}):null]),
        el("input",{id:"rdr-"+k+"-"+j,class:"num",type:"text",inputmode:"decimal",autocomplete:"off",spellcheck:"false",placeholder:yaFa?String(yaFa):"0",value:d.R[k][j]||"",
          "aria-label":"Fardos "+relLbl(r,j)+" "+n+" "+MAT[m].nom,oninput:e=>{d.R[k][j]=e.target.value;refresca();}}),info]);});
    const filas=lista.map(l=>{const fifo=el("button",{type:"button",class:"rd-fifo num",title:"Poner este número en «Contados»"}),inp=el("input",{id:"rdc-"+l.id,class:"num",type:"text",inputmode:"numeric",autocomplete:"off",value:d.C[l.id]==null?"":d.C[l.id],
        "aria-label":"Fardos contados de "+l.nombre,oninput:e=>{d.C[l.id]=e.target.value;refresca();}});
      fifo.onclick=()=>{inp.value=fifo.dataset.v;d.C[l.id]=fifo.dataset.v;refresca();};
      const gas=el("span",{class:"rd-gas num"});
      vivos.push(C=>{const x=C.out[k].C.find(z=>z.l.id===l.id);fifo.textContent=String(x.fifo);fifo.dataset.v=String(x.fifo);gas.textContent=x.gas>0?"−"+x.gas:x.gas<0?"+"+(-x.gas):x.gas===0?"0":"";gas.className="rd-gas num"+(x.gas<0?" mal":"");inp.classList.toggle("mal",!!x.err||x.gas<0);});
      return el("div",{class:"rd-col"},[el("span",{class:"rd-n"},[el("b",{text:l.nombre}),el("small",{text:" · en la app "+fmt(S[l.id].fa)+" f"})]),fifo,inp,gas]);});
    vivos.push(C=>{const o=C.out[k];res.textContent="";o.msg.forEach(([t,x])=>res.appendChild(el("div",{class:t==="i"?"hint":"banner "+(t==="ok"?"ok":t),text:x})));
      const bad=o.msg.some(z=>z[0]==="b"),w=o.msg.some(z=>z[0]==="w"),ok=o.msg.some(z=>z[0]==="ok");pill.innerHTML="";
      pill.appendChild(el("span",{class:"pill "+(bad?"bad":w?"warn":ok?"ok":"na"),text:bad?"Revisar":w?"Descuadre":ok?"Cuadra":o.tRel?o.tRel+" f":"Sin datos"}));});
    const totA=el("b",{class:"num"}),totB=el("b",{class:"num"});
    vivos.push(C=>{const o=C.out[k];totA.textContent=o.tRel+" f";totB.textContent=o.C.some(x=>x.vacio)?"—":o.tCnt+" f";});
    /* resumen de la línea arriba del todo */
    const rp=el("span",{class:"pill na"}),rt=el("span",{class:"rd-rs-t num"});
    resumen.push(el("div",{class:"rd-rs"},[el("span",{class:"tagm",style:"background:"+MAT[m].col}),el("b",{text:n+" · "+MAT[m].nom}),rt,rp]));
    vivos.push(C=>{const o=C.out[k],bad=o.msg.some(z=>z[0]==="b"),w=o.msg.some(z=>z[0]==="w"),ok=o.msg.some(z=>z[0]==="ok"),vac=o.C.some(x=>x.vacio);
      rt.textContent="hojas "+o.tRel+" f · contado "+(vac?"—":o.tCnt+" f");rp.className="pill "+(bad?"bad":w?"warn":ok?"ok":"na");
      rp.textContent=bad?"Revisar":w?(o.tCnt>o.tRel?"Faltan "+(o.tCnt-o.tRel)+" f":"Sobran "+(o.tRel-o.tCnt)+" f"):ok?"Cuadra":vac?"Falta contar":"Sin datos";});
    return el("div",{class:"card"},[el("div",{class:"hd"},[el("span",{class:"tagm",style:"background:"+MAT[m].col}),el("h2",{text:n+" · "+MAT[m].nom}),pill]),
      el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:12px"},[
        el("div",{class:"rd-2col"},[
          el("div",{class:"rd-ca"},[el("div",{class:"rd-sec",text:"1 · Fardos de cada relevo (total de la hoja)"}),el("div",{class:"rd-rels"},rels),
            el("div",{class:"rd-tot"},[el("span",{text:"Nuevos según las hojas"}),totA])]),
          el("div",{class:"rd-cb"},[el("div",{class:"rd-sec",text:"2 · Fardos que cuentas ahora en nave"}),
            el("div",{class:"rd-col hdr"},[el("span",{text:"Colada"}),el("span",{text:"Por FIFO"}),el("span",{text:"Contados"}),el("span",{text:"Gasto"})])].concat(filas,[
            el("div",{class:"rd-tot"},[el("span",{text:"Gastado según el recuento"}),totB])]))]),
        accionesRD(n,m,S),varias(k,lista,n,m),res,motivoRD(k)])]);});
  /* ¿por qué no cuadra? Se guarda con cada ajuste (r.mot) y el cierre de mes los separa */
  function motivoRD(k){const kid=k.replace(/[^A-Za-z0-9]/g,"");
    const opP=el("option",{value:"pend",text:"Falta la etiqueta en la hoja (queda pendiente)"});
    const sl=el("select",{id:"rdm-"+kid,"aria-label":"Motivo del ajuste",onchange:e=>{d.M[k]=e.target.value;refresca();}},
      [["con","Las hojas apuntaron mal el consumo (cuenta como consumo)"],["colada","Se apuntó en otra colada (el total no cambia)"],["ent","Error en una entrada (camión)"],["nose","No se sabe"]].map(([v,t])=>el("option",{value:v,text:t})).concat([opP]));
    /* con «falta la etiqueta»: en qué relevo se gastó (es la hoja donde la pegarán) */
    const sr=el("select",{id:"rdp-"+kid,"aria-label":"Relevo en que se gastó",onchange:e=>{d.PR[k]=+e.target.value;}},R.map((r,j)=>el("option",{value:String(j),text:relLbl(r,j)})));
    const wr=el("label",{class:"rd-pe",style:"display:flex;flex-direction:column;gap:4px"},[el("span",{class:"rd-sec",text:"¿En qué relevo se gastó? (en su hoja pegarán la etiqueta)"}),sr]);
    const w=el("div",{class:"rd-mot",style:"display:flex;flex-direction:column;gap:8px"},[el("label",{style:"display:flex;flex-direction:column;gap:4px"},[el("span",{class:"rd-sec",text:"¿Por qué no cuadra?"}),sl]),wr]);w.hidden=true;
    vivos.push(C=>{const o=C.out[k];const pe=C.P&&C.P.recs.some(r=>r.pe&&o.C.some(x=>x.l.id===r.o));
      const A=C.P?C.P.aj.filter(r=>o.C.some(x=>x.l.id===(r.o||r.d))):[];w.hidden=!A.length&&!pe;
      const falta=pe||A.some(r=>r.o);opP.hidden=opP.disabled=!falta;
      if(!w.hidden)sl.value=d.M[k]&&(d.M[k]!=="pend"||falta)?d.M[k]:motAuto(A);
      wr.hidden=sl.value!=="pend";if(d.PR[k]==null||!R[d.PR[k]])d.PR[k]=R.length-1;sr.value=String(d.PR[k]);});
    return w;}
  /* si han bajado dos o más coladas, los pesos de cada una en cada relevo (opcional) */
  function varias(k,lista,n,m){d.K[k]=d.K[k]||{};
    const caja=el("div",{class:"rd-var"});caja.hidden=true;
    const grupos=R.map((r,j)=>{d.K[k][j]=d.K[k][j]||{};const ya=yaDe(r,n,m);
      const filas=lista.map(l=>{const yl=ya.filter(x=>x.o===l.id).reduce((a,x)=>a+(x.fa||0),0);
        const inp=el("input",{id:"rdk-"+k+"-"+j+"-"+l.id,class:"num",type:"text",inputmode:"decimal",autocomplete:"off",spellcheck:"false",placeholder:yl?String(yl):"",value:d.K[k][j][l.id]||"",
          "aria-label":"Pesos de "+l.nombre+" en "+relLbl(r,j),oninput:e=>{d.K[k][j][l.id]=e.target.value;refresca();}});
        const tot=el("span",{class:"rd-ya"});
        const fila=el("div",{class:"rd-vf"},[el("span",{class:"rd-n",text:l.nombre}),inp,tot]);
        return{l,fila,inp,tot,yl};});
      const g=el("div",{class:"rd-vg"},[el("div",{class:"rd-rl",text:relLbl(r,j)})].concat(filas.map(x=>x.fila)));
      return{g,filas,j};});
    caja.appendChild(el("div",{class:"rd-sec",text:"3 · Pesos de cada colada (han bajado varias)"}));
    caja.appendChild(el("p",{class:"hint",style:"margin:0",text:"Opcional. Para que cada peso vaya a su colada, escribe en cada relevo los kilos de los fardos de cada una («700,769») o solo sus fardos. Si lo dejas vacío, los pesos de la casilla del relevo se reparten empezando por la más antigua."}));
    grupos.forEach(x=>caja.appendChild(x.g));
    vivos.push(C=>{const o=C.out[k],usadas=new Set(o.C.filter(x=>x.gas>0).map(x=>x.l.id));let alguno=false;
      grupos.forEach(G=>{let vis=false;const ro=o.rel[G.j],hay=!!(ro.p&&ro.p.fa>ro.yaFa)||G.filas.some(x=>String(d.K[k][G.j][x.l.id]||"").trim());G.filas.forEach(x=>{const v=String(d.K[k][G.j][x.l.id]||"").trim();const show=hay&&(usadas.size>1&&usadas.has(x.l.id)||!!v);x.fila.hidden=!show;if(show)vis=true;
        const q=v?leerRD(v,mediaCol(S[x.l.id])):null;x.tot.textContent=q&&!q.error?(q.k.length?q.fa+" f · "+fmt(q.k.reduce((a,b)=>a+b,0))+" kg":q.fa+" f"):x.yl?"ya "+x.yl+" f":"";});
        G.g.hidden=!vis;if(vis)alguno=true;});
      caja.hidden=!alguno;});
    return caja;}
  const goBtn=el("button",{id:"rd-go",class:"btn",type:"button",text:"Guardar recuento de "+nave});
  const barTxt=el("span",{class:"rd-bar-t"});
  const refresca=()=>{const C=calc();try{C.P=C.err?null:plan(C);}catch(e){C.P=null;}vivos.forEach(f=>f(C));goBtn.disabled=C.err>0||!lineas.length;
    const O=Object.values(C.out),nOk=O.filter(o=>o.msg.some(z=>z[0]==="ok")&&!o.msg.some(z=>z[0]==="b"||z[0]==="w")).length,nW=O.filter(o=>o.msg.some(z=>z[0]==="w")).length,nB=O.filter(o=>o.msg.some(z=>z[0]==="b")).length,nV=O.filter(o=>o.C.some(x=>x.vacio)).length;
    barTxt.textContent=nave+" · "+O.length+(O.length===1?" línea":" líneas")+(nOk?" · "+nOk+" cuadra"+(nOk===1?"":"n"):"")+(nW?" · "+nW+" con descuadre":"")+(nB?" · "+nB+" para revisar":"")+(nV?" · "+nV+" sin contar":"");};
  goBtn.onclick=async e=>{const b=e.currentTarget,C=calc();if(C.err)return;const P=plan(C);
    const res=[];Object.values(C.out).forEach(o=>{const c=P.recs.filter(r=>{const l=lotes.find(y=>y.id===r.o);return l&&l.nave===o.n&&l.material===o.m;}),a=P.aj.filter(r=>{const l=lotes.find(y=>y.id===(r.o||r.d));return l&&l.nave===o.n&&l.material===o.m;});
      const cp=c.filter(r=>r.pe).reduce((s,r)=>s+r.fa,0),ce=o.rel.flatMap(x=>x.cierra||[]).filter(r=>(lotes.find(y=>y.id===r.o)||{}).material===o.m).reduce((s,r)=>s+(r.fa||0),0);
      res.push(o.n+" · "+MAT[o.m].nom+": "+(c.length?c.reduce((s,r)=>s+r.fa,0)+" f de consumo"+(cp?" ("+cp+" pendiente"+(cp===1?"":"s")+" de etiqueta)":""):"sin consumo nuevo")+(ce?" · "+ce+" f de etiqueta pegada (ya contaban)":"")+(a.length?" · ajustes: "+a.map(r=>(r.o?"−":"+")+r.fa+" f "+nomLote(r.o||r.d)).join(", "):""));});
    const txt=res.join("\n")+(C.avisos?"\n\nHay descuadre con las hojas. Se guarda lo que has contado como lo correcto.":"");
    if(!(await confirmar(txt,{titulo:"Guardar recuento de "+nave,ok:C.avisos?"Lo contado es lo correcto":"Guardar"})))return;
    b.disabled=true;
    try{const todo=P.recs.concat(P.aj);if(todo.length)await addMovs(todo);
      for(const r of Object.values(C.out).flatMap(o=>o.rel.flatMap(x=>x.cierra||[])))await cierraPend(r,"pegada",0);
      const cont={};Object.values(C.out).forEach(o=>o.C.forEach(x=>{cont[x.l.id]=x.c;}));
      const reg={f:relevoAhora().f,u:relevoAhora().u,ts:Date.now(),hora:new Date().toTimeString().slice(0,5),c:cont,nave};
      cfg.rdiarioN=Object.assign({},cfg.rdiarioN||{},{[nave]:reg});cfg.rdiario=reg;await saveCfg();
      lineas.forEach(([n,m])=>{const k=key(n,m);delete d.R[k];delete d.K[k];fifoLista(n,m,S).forEach(l=>{delete d.C[l.id];});});
      const falta=navesL.find(n=>n!==nave&&!rdHoyN(n));
      toast(nave+" guardada"+(todo.length?": "+todo.length+" apunte"+(todo.length===1?"":"s"):"")+(falta?". Ahora la "+falta:""));
      if(falta)d.nave=falta;render();if(!falta)setTimeout(()=>ventanaParteCompras(),60);}
    catch(err){toast("No se pudo guardar");b.disabled=false;}};
  const ult=rdDe(nave);
  const selN=navesL.length>1?el("div",{class:"seg",role:"group","aria-label":"Nave"},navesL.map(n=>el("button",{type:"button","aria-pressed":String(n===nave),text:n+(rdHoyN(n)?" ✓":""),onclick:()=>{d.nave=n;render();}}))):null;
  const out=[selN,el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Desde el último recuento · "+nave}),el("span",{class:"sub",style:"margin-left:auto",text:ult?"último: "+dmy(ult.f)+" "+(ult.hora||ult.u.toLowerCase()):"primera vez"})]),
    el("div",{class:"bd"},[el("p",{class:"hint",style:"margin:0",text:"En cada relevo escribe el total de fardos de la hoja (lo ya apuntado se resta solo) o los kilos de cada fardo separados por comas: «700,769,682». Luego cuenta los fardos de cada colada en nave. Si has subido algo del externo, apunta antes el traslado."})])]),cardPendientes(nave)]
    .concat(resumen.length>1?[el("div",{class:"rd-resumen"},resumen)]:[],lineas.length?cards:[el("div",{class:"empty",text:"No hay coladas en nave."})],[el("div",{class:"rd-bar"},[barTxt,el("button",{type:"button",class:"btn sec",text:"Ver parte",onclick:()=>ventanaParteCompras()}),goBtn])]);
  refresca();
  return out.filter(Boolean);}
/* ---------- parte para compras ---------- */
function diaAnterior(f){let x=fMas(f,-1),k=0;while(relevosDia(x)===0&&k<10){x=fMas(x,-1);k++;}return x;}
function textoParteCompras(){const {S}=bloques(),h=hoy(),fa=diaAnterior(h),ms=todosMovs();
  const d=fDate(h),L=["PARTE DE ALUMINIO · "+NOMDIAL[d.getDay()]+" "+h.split("-").reverse().join("/")];
  {const hs=NAVES.filter(rdHoyN).map(n=>n+" a las "+cfg.rdiarioN[n].hora);if(hs.length)L.push("(recuento: "+hs.join(", ")+")");}
  LINEAS.forEach(([n,m])=>{const lt=lotes.filter(l=>l.nave===n&&l.material===m);
    const cons=ms.filter(r=>r.t==="C"&&r.f===fa&&lt.some(l=>l.id===r.o));
    const nave=lt.filter(l=>l.donde!=="externo"&&S[l.id]&&S[l.id].fa>0).sort((a,b)=>(a.entrada||"").localeCompare(b.entrada||"")),ext=lt.filter(l=>l.donde==="externo"&&S[l.id]&&S[l.id].fa>0).sort((a,b)=>(a.entrada||"").localeCompare(b.entrada||""));
    if(!cons.length&&!nave.length&&!ext.length)return;
    const sum=a=>a.reduce((s,l)=>s+S[l.id].fa,0),sumK=a=>a.reduce((s,l)=>s+S[l.id].kg,0);
    L.push("");L.push(n.toUpperCase()+" · "+MAT[m].nom.toUpperCase());
    const cf=cons.reduce((s,r)=>s+(r.fa||0),0),ck=cons.reduce((s,r)=>s+Math.abs(kgAp(r,S)),0);
    const porT=TURNOS.map(u=>[u,cons.filter(r=>r.u===u).reduce((s,r)=>s+(r.fa||0),0)]).filter(x=>x[1]);
    L.push("Consumo del "+NOMDIAL[fDate(fa).getDay()]+" "+dmy(fa)+": "+fmt(cf)+" fardos · "+fmt(ck)+" kg"+(porT.length?" ("+porT.map(([u,v])=>u.toLowerCase()+" "+v).join(", ")+")":""));
    const pc={};cons.forEach(r=>{pc[r.o]=(pc[r.o]||0)+(r.fa||0);});const pcL=Object.keys(pc).map(id=>nomLote(id)+" "+pc[id]+" f");
    if(pcL.length)L.push("  Por colada: "+pcL.join(", "));
    L.push("Queda en nave: "+fmt(sum(nave))+" f · "+fmt(sumK(nave))+" kg");nave.forEach(l=>L.push("  "+l.nombre+": "+fmt(S[l.id].fa)+" f · "+fmt(S[l.id].kg)+" kg"));
    L.push("Queda en externo: "+fmt(sum(ext))+" f · "+fmt(sumK(ext))+" kg");ext.forEach(l=>L.push("  "+l.nombre+": "+fmt(S[l.id].fa)+" f · "+fmt(S[l.id].kg)+" kg"));
    L.push("Total "+n+" · "+MAT[m].nom+": "+fmt(sum(nave)+sum(ext))+" f · "+fmt(sumK(nave)+sumK(ext))+" kg");});
  try{const gk=granallaKg();L.push("");L.push("GRANALLA DE COBRE");const gc=ms.filter(r=>r.t==="G"&&!r.aj&&r.f===fa&&typeof r.kg==="number"&&r.kg<0).reduce((s,r)=>s-r.kg,0);
    L.push("Consumo del "+NOMDIAL[fDate(fa).getDay()]+" "+dmy(fa)+": "+fmt(gc)+" kg");L.push("Quedan: "+fmt(gk)+" kg");}catch(e){}
  return L.join("\n");}
function ventanaParteCompras(){const ta=el("textarea",{readonly:"",style:"min-height:300px;font-family:'IBM Plex Mono',monospace;font-size:12.5px;width:100%"});ta.value=textoParteCompras();
  const cerrar=()=>{ov.remove();document.removeEventListener("keydown",tec);};const tec=e=>{if(e.key==="Escape")cerrar();};
  const copiar=async()=>{const t=ta.value;try{await navigator.clipboard.writeText(t);toast("Parte copiado");cerrar();}
    catch(e){ta.removeAttribute("readonly");ta.select();try{document.execCommand("copy");toast("Parte copiado");cerrar();}catch(e2){toast("Selecciona el texto y cópialo");}}};
  const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)cerrar();}},[el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"Parte para compras"},[
    el("h3",{text:"Parte para compras"}),ta,botonesEnviar(()=>ta.value,()=>"Parte de aluminio "+dmy(hoy())),el("div",{class:"dlg-b"},[el("button",{type:"button",class:"btn sec",text:"Cerrar",onclick:cerrar}),el("button",{id:"rd-copiar",type:"button",class:"btn",text:"Copiar parte",onclick:copiar})])])]);
  document.addEventListener("keydown",tec);document.body.appendChild(ov);}
/* ---------- enviar el parte con un toque ----------
   WhatsApp abre el chat con el parte ya escrito (si se ha guardado el móvil del destinatario, directo a su chat);
   Correo abre el correo con asunto y texto. «Para quién» se guarda en la configuración (cfg.envioParte). */
function destParte(){return cfg.envioParte||{};}
async function ponerDestParte(){const d=destParte();
  const tel=await dialogo({titulo:"¿A quién se manda el parte?",texto:"Móvil para WhatsApp (con prefijo, p. ej. 34600111222). Déjalo vacío para elegir el chat cada vez.",input:true,teclado:"tel",valor:d.tel||"",ok:"Siguiente"});if(tel===null)return false;
  const em=await dialogo({titulo:"¿A quién se manda el parte?",texto:"Correo del destinatario (puedes poner varios separados por comas). Déjalo vacío para elegirlo cada vez.",input:true,teclado:"email",valor:d.email||"",ok:"Guardar"});if(em===null)return false;
  cfg.envioParte={tel:String(tel).replace(/[^\d]/g,""),email:String(em).trim()};try{await saveCfg();toast("Destinatario guardado");}catch(e){toast("No se pudo guardar");}return true;}
function botonesEnviar(texto,asunto){
  const wa=el("button",{type:"button",class:"btn sec env-wa",text:"WhatsApp",onclick:()=>{const t=texto(),d=destParte();window.open("https://wa.me/"+(d.tel||"")+"?text="+encodeURIComponent(t),"_blank","noopener");}});
  const ml=el("button",{type:"button",class:"btn sec env-ml",text:"Correo",onclick:()=>{const t=texto(),d=destParte();location.href="mailto:"+encodeURIComponent(d.email||"").replace(/%2C/gi,",").replace(/%40/g,"@")+"?subject="+encodeURIComponent(asunto())+"&body="+encodeURIComponent(t);}});
  const sh=navigator.share?el("button",{type:"button",class:"btn sec",text:"Compartir…",onclick:async()=>{try{await navigator.share({title:asunto(),text:texto()});}catch(e){}}}):null;
  const dq=destParte(),para=el("button",{type:"button",class:"btn txt peq env-para",text:dq.tel||dq.email?"Para: "+[dq.tel?"+"+dq.tel:"",dq.email].filter(Boolean).join(" · ")+" (cambiar)":"Elegir a quién se manda",onclick:async()=>{if(await ponerDestParte()){const x=destParte();para.textContent=x.tel||x.email?"Para: "+[x.tel?"+"+x.tel:"",x.email].filter(Boolean).join(" · ")+" (cambiar)":"Elegir a quién se manda";}}});
  return el("div",{class:"env-row"},[el("div",{class:"env-bt"},[wa,ml,sh].filter(Boolean)),para]);}

/* ---------- desde el recuento: lo que ha subido del externo y los camiones que han llegado ----------
   Sin salir del recuento. Del externo solo salen las coladas de esa misma nave y aleación (ya están facturadas a su nave).
   Un camión del proveedor es una colada nueva: se abre la entrada ya rellena con el camión del calendario y al guardar se vuelve aquí. */
function accionesRD(n,m,S){const k=key(n,m),h=hoy();
  const ext=lotes.filter(l=>l.nave===n&&l.material===m&&l.donde==="externo"&&S[l.id]&&S[l.id].fa>0).sort((a,b)=>(a.entrada||"").localeCompare(b.entrada||""));
  const cam=pendientesPlan().filter(x=>x.k===k&&x.f<=fMas(h,1));
  const bs=[];
  if(ext.length)bs.push(el("button",{type:"button",class:"btn sec peq",text:"Ha subido del externo ("+ext.length+")",onclick:()=>subidaRD(n,m,ext,S)}));
  bs.push(el("button",{type:"button",class:"btn sec peq",text:"Ha llegado un camión"+(cam.length?" ("+cam.length+" previsto"+(cam.length===1?"":"s")+")":""),onclick:()=>camionRD(n,m,cam)}));
  return el("div",{class:"rd-acc"},[el("span",{class:"sub",text:"¿Hay fardos que no salen en la lista?"})].concat(bs));}
function subidaRD(n,m,ext,S){const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)ov.remove();}}),cerrar=()=>ov.remove();
  const st={id:ext[0].id,modo:"entera",n:""};const cuerpo=el("div",{style:"display:flex;flex-direction:column;gap:10px"});
  const pinta=()=>{cuerpo.textContent="";const l=lotes.find(x=>x.id===st.id),b=S[st.id];
    cuerpo.appendChild(el("div",{class:"rd-ext"},ext.map((x,i)=>el("button",{type:"button",class:"rd-ext-b","aria-pressed":String(st.id===x.id),onclick:()=>{st.id=x.id;pinta();}},[
      el("b",{text:x.nombre}),el("span",{class:"num sub",text:fmt(S[x.id].fa)+" f · "+fmt(S[x.id].kg)+" kg"+(i===0?" · la más antigua":"")})]))));
    cuerpo.appendChild(el("div",{class:"seg",role:"group","aria-label":"Cuánto ha subido"},[["entera","Entera ("+fmt(b.fa)+" f)"],["parte","Solo una parte"]].map(([v,t])=>el("button",{type:"button","aria-pressed":String(st.modo===v),text:t,onclick:()=>{st.modo=v;pinta();}}))));
    if(st.modo==="parte")cuerpo.appendChild(el("label",{text:"Fardos que han subido"},[el("input",{id:"rd-sub-n",class:"num",type:"text",inputmode:"numeric",value:st.n,oninput:e=>{st.n=e.target.value;}})]));
    if(ext[0].id!==st.id)cuerpo.appendChild(el("div",{class:"banner w",text:"Por FIFO tocaría subir antes "+ext[0].nombre+"."}));};
  pinta();
  const ok=el("button",{type:"button",class:"btn",id:"rd-sub-ok",text:"Apuntar subida",onclick:async()=>{const l=lotes.find(x=>x.id===st.id),b=S[st.id],nf=st.modo==="entera"?b.fa:parseInt(st.n,10);
    if(!(nf>0)){toast("Pon cuántos fardos han subido");return;}if(nf>b.fa){toast("En el externo solo hay "+fmt(b.fa)+" fardos");return;}
    ok.disabled=true;try{await subirExterno(l,b,nf);toast(fmt(nf)+" f de "+l.nombre+" subidos a "+n+": ya salen en el recuento");cerrar();render();}catch(e){toast("No se pudo guardar");ok.disabled=false;}}});
  ov.appendChild(el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"Ha subido del externo"},[el("h3",{text:"Ha subido del externo · "+n+" · "+MAT[m].nom}),
    el("p",{class:"hint",text:"Solo salen las coladas del externo de esta nave y aleación."}),cuerpo,el("div",{class:"dlg-b"},[el("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:cerrar}),ok])]));
  document.body.appendChild(ov);}
function camionRD(n,m,cam){const ir=x=>{if(x)llegaCamion(x);else{draft.ent={fecha:hoy(),nave:n,mat:m,donde:"nave"};tab="entrada";try{localStorage.setItem("colada.tab",tab);}catch(e){}tabsUI();render();}
    draft.ent.volver="rdiario";render();};
  if(!cam.length){ir(null);return;}
  const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)ov.remove();}}),cerrar=()=>ov.remove();
  ov.appendChild(el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"Ha llegado un camión"},[el("h3",{text:"¿Qué camión ha llegado? · "+n+" · "+MAT[m].nom}),
    el("div",{class:"rd-ext"},cam.map(x=>el("button",{type:"button",class:"rd-ext-b",onclick:()=>{cerrar();ir(x);}},[el("b",{text:(x.p||"Proveedor sin poner")+" · "+fmt(x.fa)+" f"}),
      el("span",{class:"sub",text:"previsto el "+diaSem(x.f)+" "+dmy(x.f)+(x.f<hoy()?" · con retraso":"")})])).concat([el("button",{type:"button",class:"rd-ext-b",onclick:()=>{cerrar();ir(null);}},[el("b",{text:"Otro camión"}),el("span",{class:"sub",text:"no estaba en el calendario"})])])),
    el("p",{class:"hint",text:"Se abre la entrada ya rellena: pon el número de colada y los kilos del albarán (o léelo con la cámara). Al guardar vuelves al recuento."}),
    el("div",{class:"dlg-b"},[el("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:cerrar})])]));
  document.body.appendChild(ov);}

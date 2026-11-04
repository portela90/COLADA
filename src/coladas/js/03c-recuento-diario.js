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
/* lo escrito en un relevo: un número pequeño = fardos; números de cientos = kilos de cada fardo; uno muy grande = kilos totales */
function leerRD(t,media){t=String(t||"").trim();if(!t)return null;
  const nums=t.split(/[\s+\/;]+/).map(x=>x.replace(/^[,.]+|[,.]+$/g,"")).filter(Boolean).map(x=>{if(/^\d{1,3}\.\d{3}$/.test(x))x=x.replace(".","");return Number(x.replace(",","."));});
  if(!nums.length)return null;if(nums.some(n=>!(n>=0)))return{error:"Hay algo que no es un número."};
  if(nums.length===1&&nums[0]<100){if(!Number.isInteger(nums[0]))return{error:"Los fardos van sin decimales."};return{fa:nums[0],k:[]};}
  if(nums.length===1&&nums[0]>1500){const fa=media>0?Math.max(1,Math.round(nums[0]/media)):0;return fa?{fa,kgT:nums[0],k:[]}:{error:"No sé cuántos fardos son esos kilos."};}
  if(nums.some(n=>n<100))return{error:"Mezcla de fardos y kilos: escribe o el número de fardos o los kilos de cada fardo."};
  return{fa:nums.length,k:nums};}
function vRecuentoDiario(){
  const d=draft.rd=draft.rd||{};if(!d.R)d.R={};if(!d.C)d.C={};if(!d.K)d.K={};
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
        else if(p){if(p.fa<yaFa){o.err="Ya hay "+yaFa+" f apuntados en este relevo: escribe el total de la hoja (como mínimo "+yaFa+").";err++;}
          else{o.nuevo=p.fa-yaFa;o.kNuevo=p.k.length?p.k.slice(yaFa):[];if(p.kgT){o.kgT=p.kgT;}if(o.nuevo)algo=true;}}
        /* pesos por colada (cuando han bajado varias): mandan sobre la casilla del relevo */
        const K=((d.K[k]||{})[j])||{},ids=lista.map(l=>l.id).filter(id=>String(K[id]||"").trim());
        if(ids.length&&!(p&&p.error)){const por=[];let tf=0,mal="";
          ids.forEach(id=>{const q=leerRD(K[id],mediaCol(S[id]));if(!q)return;if(q.error){mal=nomLote(id)+": "+q.error;return;}
            const yl=ya.filter(x=>x.o===id).reduce((a,x)=>a+(x.fa||0),0);if(q.fa<yl){mal=nomLote(id)+": ya hay "+yl+" f apuntados de esta colada en este relevo.";return;}
            tf+=q.fa;por.push({id,nuevo:q.fa-yl,kNuevo:q.k.length?q.k.slice(yl):[],kgT:q.kgT?q.kgT*(q.fa-yl)/q.fa:0});});
          if(!mal&&tf<yaFa)mal="La suma por colada ("+tf+" f) es menos que lo ya apuntado en este relevo ("+yaFa+" f).";
          if(!mal&&p&&p.fa!==tf)mal="La casilla del relevo dice "+p.fa+" f y la suma por colada "+tf+" f.";
          if(mal){o.err=mal;err++;o.nuevo=0;o.kNuevo=[];}
          else{o.por=por;o.porFa=tf;o.nuevo=por.reduce((a,x)=>a+x.nuevo,0);o.kNuevo=[];o.kgT=0;if(o.nuevo)algo=true;}}
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
        if(tCnt!==tRel){avisos++;msg.push(["w","Las hojas dicen "+tRel+" fardos y el recuento dice que se han gastado "+tCnt+(tCnt>tRel?": en las hojas falta"+(tCnt-tRel===1?" 1 fardo":"n "+(tCnt-tRel)+" fardos"):": en las hojas sobra"+(tRel-tCnt===1?" 1 fardo":"n "+(tRel-tCnt)+" fardos"))+". Se guarda lo contado y la diferencia queda como ajuste."]);}
        else if(tRel)msg.push(["ok","Cuadra: "+tRel+" fardo"+(tRel===1?"":"s")+" en las hojas y en el recuento."]);
        const usadas=C.filter(o=>o.gas>0);const fuera=usadas.length>1||(usadas.some(o=>o.gas>(exp[o.l.id]||0))&&C.some(o=>(exp[o.l.id]||0)>0&&(o.gas||0)<exp[o.l.id]));
        if(usadas.length&&fuera)msg.push(["i","No han seguido el FIFO: se ha gastado de "+usadas.map(o=>o.l.nombre+" ("+o.gas+")").join(", ")+". Se apunta así, en las coladas que han bajado."]);}
      rel.forEach(o=>{if(o.err)msg.push(["b",dmy(o.r.f)+" "+o.r.u.toLowerCase()+": "+o.err]);});
      out[k]={n,m,lista,media,rel,tRel,C,tCnt,msg};});
    return{out,err,avisos,algo};};
  /* reparto: los fardos nuevos de cada relevo, por orden, a las coladas que han bajado (más antigua primero);
     si las hojas dicen más, lo que sobra va por FIFO; luego cada colada se deja en lo contado con un ajuste */
  const plan=C=>{const recs=[],aj=[];
    Object.values(C.out).forEach(o=>{const cap={};o.C.forEach(x=>{cap[x.l.id]=Math.max(0,x.gas||0);});const asig={};
      const orden=o.C.map(x=>x.l.id);
      o.rel.forEach(rr=>{let rem=rr.nuevo,kk=rr.kNuevo.slice();if(!rem)return;const tomar=(id,q,lst,kgT,tot)=>{const pk=(lst||kk).splice(0,q);
          const r={i:uid("m"),t:"C",f:rr.r.f,u:rr.r.u,o:id,fa:q,n:"Recuento diario"};
          if(pk.length===q&&q){r.pk=pk;r.kg=Math.round(pk.reduce((a,b)=>a+b,0)*100)/100;}
          else if(kgT!=null?kgT:rr.kgT){r.kg=Math.round((kgT!=null?kgT:rr.kgT)*q/(tot||rr.nuevo));r.n+=" · kilos totales del relevo";}
          recs.push(r);asig[id]=(asig[id]||0)+q;cap[id]=Math.max(0,(cap[id]||0)-q);rem-=q;};
        if(rr.por){rr.por.forEach(x=>{if(x.nuevo>0)tomar(x.id,x.nuevo,x.kNuevo.slice(),x.kgT||null,x.nuevo);});return;}
        for(const id of orden){if(rem<=0)break;const q=Math.min(rem,cap[id]);if(q>0)tomar(id,q);}
        for(const id of orden){if(rem<=0)break;const libre=(S[id].fa-(asig[id]||0));const q=Math.min(rem,Math.max(0,libre));if(q>0)tomar(id,q);}
        if(rem>0&&orden.length)tomar(orden[orden.length-1],rem);});
      o.C.forEach(x=>{const queda=x.s-(asig[x.l.id]||0),df=queda-x.c;if(!df)return;const rx=S[x.l.id].rx||S[x.l.id].ratio||0;
        const r={i:uid("m"),t:"A",f:relevoAhora().f,u:relevoAhora().u,fa:Math.abs(df),kg:Math.round(Math.abs(df)*rx),n:"Recuento diario: "+(df>0?"faltan ":"sobran ")+Math.abs(df)+" f frente a las hojas"};
        if(df>0)r.o=x.l.id;else r.d=x.l.id;aj.push(r);});});
    return{recs,aj};};
  const relLbl=(r,j)=>NOMDIA[fDate(r.f).getDay()]+" "+dmy(r.f)+" "+r.u.toLowerCase();
  const relSub=(r,j)=>r.f===relevoAhora().f&&r.u===relevoAhora().u?"hasta ahora":j===0&&rdDe(nave)&&rdDe(nave).f===r.f&&rdDe(nave).u===r.u?"entera, de la hoja":"";
  const cards=lineas.map(([n,m])=>{const k=key(n,m),lista=fifoLista(n,m,S);d.R[k]=d.R[k]||{};
    const pill=el("span",{style:"margin-left:auto"}),res=el("div",{style:"display:flex;flex-direction:column;gap:6px"});
    const rels=R.map((r,j)=>{const ya=yaDe(r,n,m),yaFa=ya.reduce((a,x)=>a+(x.fa||0),0),sub=relSub(r,j),info=el("span",{class:"rd-ya"});
      vivos.push(C=>{const o=C.out[k].rel[j];info.textContent=o.por&&!o.err?"por colada: "+o.porFa+" f":o.p&&!o.err&&o.p.k.length?o.p.fa+" f · "+fmt(o.p.k.reduce((a,b)=>a+b,0))+" kg":o.p&&o.p.kgT?"≈ "+o.p.fa+" f":yaFa?"ya apuntados "+yaFa+" f":"";
        info.className="rd-ya"+(o.err?" mal":"");});
      return el("label",{class:"rd-rel"},[el("span",{class:"rd-rl"},[document.createTextNode(relLbl(r,j)),sub?el("small",{text:" ("+sub+")"}):null]),
        el("input",{id:"rdr-"+k+"-"+j,class:"num",type:"text",inputmode:"text",autocomplete:"off",spellcheck:"false",placeholder:yaFa?String(yaFa):"0",value:d.R[k][j]||"",
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
    return el("div",{class:"card"},[el("div",{class:"hd"},[el("span",{class:"tagm",style:"background:"+MAT[m].col}),el("h2",{text:n+" · "+MAT[m].nom}),pill]),
      el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:12px"},[
        el("div",{class:"rd-sec",text:"1 · Fardos de cada relevo (total de la hoja)"}),el("div",{class:"rd-rels"},rels),
        el("div",{class:"rd-sec",text:"2 · Fardos que cuentas ahora en nave"}),
        el("div",{class:"rd-col hdr"},[el("span",{text:"Colada"}),el("span",{text:"Por FIFO"}),el("span",{text:"Contados"}),el("span",{text:"Gasto"})])].concat(filas,[varias(k,lista,n,m),res]))]);});
  /* si han bajado dos o más coladas, los pesos de cada una en cada relevo (opcional) */
  function varias(k,lista,n,m){d.K[k]=d.K[k]||{};
    const caja=el("div",{class:"rd-var"});caja.hidden=true;
    const grupos=R.map((r,j)=>{d.K[k][j]=d.K[k][j]||{};const ya=yaDe(r,n,m);
      const filas=lista.map(l=>{const yl=ya.filter(x=>x.o===l.id).reduce((a,x)=>a+(x.fa||0),0);
        const inp=el("input",{id:"rdk-"+k+"-"+j+"-"+l.id,class:"num",type:"text",inputmode:"text",autocomplete:"off",spellcheck:"false",placeholder:yl?String(yl):"",value:d.K[k][j][l.id]||"",
          "aria-label":"Pesos de "+l.nombre+" en "+relLbl(r,j),oninput:e=>{d.K[k][j][l.id]=e.target.value;refresca();}});
        const tot=el("span",{class:"rd-ya"});
        const fila=el("div",{class:"rd-vf"},[el("span",{class:"rd-n",text:l.nombre}),inp,tot]);
        return{l,fila,inp,tot,yl};});
      const g=el("div",{class:"rd-vg"},[el("div",{class:"rd-rl",text:relLbl(r,j)})].concat(filas.map(x=>x.fila)));
      return{g,filas,j};});
    caja.appendChild(el("div",{class:"rd-sec",text:"3 · Pesos de cada colada (han bajado varias)"}));
    caja.appendChild(el("p",{class:"hint",style:"margin:0",text:"Opcional. Para que cada peso vaya a su colada, escribe en cada relevo los kilos de los fardos de cada una («700 769») o solo sus fardos. Si lo dejas vacío, los pesos de la casilla del relevo se reparten empezando por la más antigua."}));
    grupos.forEach(x=>caja.appendChild(x.g));
    vivos.push(C=>{const o=C.out[k],usadas=new Set(o.C.filter(x=>x.gas>0).map(x=>x.l.id));let alguno=false;
      grupos.forEach(G=>{let vis=false;const ro=o.rel[G.j],hay=!!(ro.p&&ro.p.fa>ro.yaFa)||G.filas.some(x=>String(d.K[k][G.j][x.l.id]||"").trim());G.filas.forEach(x=>{const v=String(d.K[k][G.j][x.l.id]||"").trim();const show=hay&&(usadas.size>1&&usadas.has(x.l.id)||!!v);x.fila.hidden=!show;if(show)vis=true;
        const q=v?leerRD(v,mediaCol(S[x.l.id])):null;x.tot.textContent=q&&!q.error?(q.k.length?q.fa+" f · "+fmt(q.k.reduce((a,b)=>a+b,0))+" kg":q.fa+" f"):x.yl?"ya "+x.yl+" f":"";});
        G.g.hidden=!vis;if(vis)alguno=true;});
      caja.hidden=!alguno;});
    return caja;}
  const goBtn=el("button",{id:"rd-go",class:"btn",type:"button",text:"Guardar recuento de "+nave});
  const refresca=()=>{const C=calc();vivos.forEach(f=>f(C));goBtn.disabled=C.err>0||!lineas.length;};
  goBtn.onclick=async e=>{const b=e.currentTarget,C=calc();if(C.err)return;const P=plan(C);
    const res=[];Object.values(C.out).forEach(o=>{const c=P.recs.filter(r=>{const l=lotes.find(y=>y.id===r.o);return l&&l.nave===o.n&&l.material===o.m;}),a=P.aj.filter(r=>{const l=lotes.find(y=>y.id===(r.o||r.d));return l&&l.nave===o.n&&l.material===o.m;});
      res.push(o.n+" · "+MAT[o.m].nom+": "+(c.length?c.reduce((s,r)=>s+r.fa,0)+" f de consumo":"sin consumo nuevo")+(a.length?" · ajustes: "+a.map(r=>(r.o?"−":"+")+r.fa+" f "+nomLote(r.o||r.d)).join(", "):""));});
    const txt=res.join("\n")+(C.avisos?"\n\nHay descuadre con las hojas. Se guarda lo que has contado como lo correcto.":"");
    if(!(await confirmar(txt,{titulo:"Guardar recuento de "+nave,ok:C.avisos?"Lo contado es lo correcto":"Guardar"})))return;
    b.disabled=true;
    try{const todo=P.recs.concat(P.aj);if(todo.length)await addMovs(todo);
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
    el("div",{class:"bd"},[el("p",{class:"hint",style:"margin:0",text:"En cada relevo escribe el total de fardos de la hoja (lo ya apuntado se resta solo) o los kilos de cada fardo separados por espacios: «700 769 682». Luego cuenta los fardos de cada colada en nave. Si has subido algo del externo, apunta antes el traslado."})])])]
    .concat(lineas.length?cards:[el("div",{class:"empty",text:"No hay coladas en nave."})],[el("div",{style:"display:flex;gap:8px;flex-wrap:wrap"},[goBtn,el("button",{type:"button",class:"btn sec",text:"Ver parte para compras",onclick:()=>ventanaParteCompras()})])]);
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

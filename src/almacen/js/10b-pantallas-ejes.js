/* ===== PANTALLAS DE EJES (con el estilo del prototipo) =====
   Gasto y ahorro, En el taller, ficha de un modelo y la historia de un eje.
   Son pantallas completas (objPage): se toca algo y se baja a más detalle; con «‹» o el atrás del móvil se vuelve.
   Si los datos cambian mientras están abiertas, se vuelven a pintar solas (ov._repinta, desde render). */

/* máquina de una reparación: la apuntada al mandarla; si no, la única máquina donde va su modelo */
function maqRep(r){const c=String(r.maq||"").trim();if(c){const q=cat.maquinas.find(m=>m.id===c||String(m.cod).toUpperCase()===c.toUpperCase());return q?q.cod:c.toUpperCase();}
  const md=modelo(modeloDeEje(r.eje));const iy=md?inyDe(md):[];return iy.length===1?iy[0]:"";}
const despTxt=d=>{const t=String(d||"").trim();return t&&t!=="—"?cap(t):"Sin indicar";};
const plu=(n,a,b)=>fmtN(n)+" "+(n===1?a:b);
const pzChapa=(t,cls)=>el("span",{class:"pz-chapa"+(cls?" "+cls:""),text:t});
/* franja de cifras: [título, valor, debajo, nivel (ok/warn/bad), al tocar] */
function pzCifras(L){return el("div",{class:"pz-cifras"},L.filter(Boolean).map(([t,v,s,niv,fn])=>el(fn?"button":"div",Object.assign({class:"pz-cifra"+(niv?" "+niv:"")},fn?{type:"button",onclick:fn}:{}),
  [el("span",{class:"t",text:t}),el("b",{class:"v num",text:String(v)}),s?el("span",{class:"s",text:s}):null])));}
function pzPan(tit,der,kids,id){return el("section",{class:"pz-pan",id:id||null},[el("div",{class:"pz-pan-cab"},[el("h2",{text:tit}),der?el("span",{class:"der",text:der}):null])].concat(kids||[]));}
const pzVacio=t=>el("div",{class:"pz-vacio",text:t});
const pzBarra=(n,mx)=>el("span",{class:"pz-pista","aria-hidden":"true"},el("i",{style:"width:"+Math.round(n/Math.max(1,mx)*100)+"%"}));
const abreEje=cod=>{const e=ejes.find(z=>z.cod===cod);if(e)fichaEje(e);};
/* días fuera de la planta (naturales): enviado → vuelta, o hasta hoy si sigue allí */
const diasFuera=r=>r.env?dias(r.env,r.res==="ok"&&r.rec?r.rec:hoy()):null;

/* tabla de reparaciones (en el móvil, cada una en dos líneas) */
function pzTablaReps(L){const hy=hoy();
  return el("div",{class:"pz-tabla"},[el("div",{class:"cabt","aria-hidden":"true"},[["Eje"],["Máquina"],["Qué tenía"],["Enviado"],["Vuelta"],["Días",1],["Coste",1]].map(([t,r])=>el("span",{class:r?"r":null,text:t})))].concat(L.map(r=>{
    const ab=!r.res,d=diasFuera(r),c=costeRep(r).v,e=ejes.find(z=>z.cod===r.eje);
    const vuelta=ab?el("span",{class:"pill "+(r.lleg?"info":"warn")},[r.lleg?"Llegado, por revisar":"En el taller",r.lleg?null:el("span",{class:"pref",text:" desde el "+fmtF(r.env)})]):r.res==="ok"?el("span",{},[el("span",{class:"pref",text:"Vuelta "}),fmtF(r.rec)]):el("span",{class:"pill na",text:r.res==="anulada"?(r.recup?"Recuperado aquí":"No fue"):"Cerrada"});
    return el(e?"button":"div",Object.assign({class:"ft"},e?{type:"button",onclick:()=>fichaEje(e)}:{}),[el("span",{class:"eje",text:r.eje}),el("span",{class:"maqc",text:maqRep(r)||"—"}),
      el("span",{class:"desp",text:despTxt(r.desp)}),el("span",{class:"env",text:fmtF(r.env||r.alta)}),el("span",{class:"rec"},vuelta),
      el("span",{class:"dias r"+(d!=null&&d>60?" mal":""),text:d==null?"—":d+" d"}),el("span",{class:"coste r",text:c?eur(c)+(ab?" al volver":""):"sin precio"})]);})));}

/* agrupar y contar: [[clave, n, euros]] de más a menos */
function pzGrupo(L,f,v){const o={};L.forEach(r=>{const k=f(r);if(!k)return;const x=o[k]=o[k]||[k,0,0];x[1]++;x[2]+=v?v(r):0;});return Object.values(o).sort((a,b)=>b[1]-a[1]||b[2]-a[2]);}

/* ---------- Gasto y ahorro ---------- */
const PER_G=[["ano","Este año"],["anoant","Año pasado"],["12m","12 meses"]];
function pantGasto(f0){const F=Object.assign({per:draft.icPer||"ano",mes:null,mod:null,mot:null,todo:false},f0||{});const box=el("div",{class:"pz"});
  const pon=(k,v)=>{F[k]=F[k]===v?null:v;F.todo=false;pinta();};
  function pinta(){box.textContent="";const D=datosIC(F.per),P=D.P;
    const recib=D.recib.map(r=>Object.assign(r,{mot:motivoRep(r.desp),mes:r.rec.slice(0,7)}));
    const enMes=recib.filter(r=>!F.mes||r.mes===F.mes);
    const lista=enMes.filter(r=>(!F.mod||r.mod===F.mod)&&(!F.mot||r.mot===F.mot)).sort((a,b)=>b.rec.localeCompare(a.rec));
    const g=lista.reduce((t,r)=>t+r.c.v,0);
    const okM=x=>!F.mes||String(x.f||"").slice(0,7)===F.mes,okMod=x=>!F.mod||x.mod===F.mod;
    const recu=D.recu.filter(x=>okM(x)&&okMod(x)),sal=D.sal.filter(okM),perd=D.perd.filter(x=>okM(x)&&okMod(x));
    const nomM=F.mes?cap(fmtMes(F.mes)):null;
    box.appendChild(el("div",{class:"pz-barra"},[el("div",{class:"seg",role:"group","aria-label":"Periodo"},PER_G.map(([k,t])=>el("button",{type:"button","aria-pressed":String(F.per===k),text:t,onclick:()=>{F.per=k;draft.icPer=k;F.mes=null;pinta();}}))),
      el("div",{class:"pz-acc"},[el("button",{type:"button",class:"btn sec",text:"Copiar resumen",onclick:async()=>{const tx=textoIC(D);try{await navigator.clipboard.writeText(tx);toast("Resumen copiado");}catch(er){dlg("Resumen",el("textarea",{readonly:true,style:"min-height:240px;font-size:13px",value:tx}),[{t:"Cerrar",cls:"sec"}]);}}}),
        el("button",{type:"button",class:"btn sec",text:"Precios",title:"Precios de reparación de cada modelo",onclick:formPrecios}),
        el("button",{type:"button",class:"btn",text:"Descargar Excel",onclick:ev=>excelIC(D,ev.currentTarget)})])]));
    box.appendChild(pzCifras([
      [nomM?"Gastado en "+nomM.toLowerCase():"Gastado en el taller",eur(g),plu(lista.length,"reparación recibida","reparaciones recibidas"),"",()=>{const t=box.querySelector("#pzReps");if(t)t.scrollIntoView({behavior:"smooth",block:"start"});}],
      ["Ahorrado en planta",eur(recu.reduce((t,x)=>t+x.ah,0)),plu(recu.length,"eje recuperado","ejes recuperados")+" sin mandarlo al taller","ok"],
      (()=>{const nE=D.env.filter(r=>r.env&&(!F.mes||r.env.slice(0,7)===F.mes)&&(!F.mod||modeloDeEje(r.eje)===F.mod)).length,t=recu.length+nE;
        return["Arreglados en planta",t?fmtN(Math.round(recu.length/t*1000)/10)+" %":"—",t?recu.length+" de "+t+" ejes estropeados no fueron al taller":"sin datos en el periodo",t&&recu.length?"ok":""];})(),
      ["Pistones salvados",fmtN(sal.reduce((t,x)=>t+x.n,0)),"sacados de ejes agarrotados · "+eur(sal.reduce((t,x)=>t+x.eur,0)),"ok"],
      ["Perdidos en el taller",String(perd.length),"pistones que no vuelven · "+eur(perd.reduce((t,x)=>t+x.eur,0)),perd.length?"bad":""],
      ["En el taller ahora",plu(D.taller.length,"eje","ejes"),eur(D.costeTaller)+" cuando vuelvan","",()=>pantTaller()]]));
    if(D.sinPrecio.length)box.appendChild(el("div",{class:"banner w",text:"Sin precio de reparación: "+D.sinPrecio.join(", ")+". Esas reparaciones no suman. Ponlo en «Precios de reparación»."}));
    const chips=[F.mes?["mes",nomM]:null,F.mod?["mod",F.mod+" · "+ejeRef({mod:F.mod})]:null,F.mot?["mot",F.mot]:null].filter(Boolean);
    if(chips.length)box.appendChild(el("div",{class:"pz-filtros"},[el("span",{class:"sub",text:"Mirando solo:"})].concat(chips.map(([k,t])=>el("button",{type:"button",class:"pz-quita","aria-label":"Quitar el filtro "+t,onclick:()=>{F[k]=null;pinta();}},[t," ✕"])),
      [el("button",{type:"button",class:"btn txt peq",text:"Quitar todo",onclick:()=>{F.mes=F.mod=F.mot=null;pinta();}})])));
    /* por mes: los 12 meses del periodo */
    const M=[];if(F.per==="12m"){let d=new Date(+hoy().slice(0,4),+hoy().slice(5,7)-1,1);for(let i=0;i<12;i++){M.unshift(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));d=new Date(d.getFullYear(),d.getMonth()-1,1);}}
    else{const y=P.d.slice(0,4);for(let i=1;i<=12;i++)M.push(y+"-"+String(i).padStart(2,"0"));}
    const base=recib.filter(r=>(!F.mod||r.mod===F.mod)&&(!F.mot||r.mot===F.mot));
    const vm=m=>{const L=base.filter(r=>r.mes===m);return{n:L.length,e:L.reduce((t,r)=>t+r.c.v,0)};};const VM=M.map(vm);const mxE=Math.max(1,...VM.map(x=>x.e||x.n));
    box.appendChild(pzPan("Gasto del taller por mes","Toca un mes para ver solo ese mes",[el("div",{class:"pz-graf"+(F.mes?" filtrada":"")},M.map((m,i)=>{const x=VM[i],h=x.n?Math.max(6,Math.round((x.e||x.n)/mxE*160)):2;
      return el("button",{type:"button",class:"pz-mesb","aria-pressed":String(F.mes===m),"aria-label":cap(fmtMes(m))+": "+plu(x.n,"reparación","reparaciones")+", "+eur(x.e),onclick:()=>pon("mes",m)},
        [el("span",{class:"val",text:x.n?eur(x.e):""}),el("span",{class:"col",style:"height:"+h+"px"}),el("span",{class:"et",text:cap(MESES[+m.slice(5,7)-1].slice(0,3))})]);}))]));
    /* por modelo y por motivo */
    const gm=pzGrupo(enMes.filter(r=>!F.mot||r.mot===F.mot),r=>r.mod,r=>r.c.v),mxm=gm.length?gm[0][1]:1;
    const bm=enMes.filter(r=>!F.mod||r.mod===F.mod),gt=pzGrupo(bm,r=>r.mot),mxt=gt.length?gt[0][1]:1;
    const md=F.mod?modelo(F.mod):null;
    box.appendChild(el("div",{class:"pz-fila2"},[pzPan("Por modelo","Toca uno para filtrar",gm.length?gm.map(([k,n,e])=>{const m=modelo(k);
        return el("button",{type:"button",class:"pz-hb","aria-pressed":String(F.mod===k),onclick:()=>pon("mod",k)},[pzChapa(k),el("span",{class:"ref",text:(m?m.ref:"")+(m&&inyDe(m).length?" · "+inyDe(m).join(" "):"")}),pzBarra(n,mxm),el("span",{class:"r f",text:String(n)}),el("span",{class:"r sub",text:eur(e)})]);}):[pzVacio("Ninguna reparación recibida en este periodo.")]),
      el("div",{class:"pz-col"},[md?el("button",{type:"button",class:"pz-pan pz-ir",onclick:()=>fichaModelo(md)},[el("b",{text:"Abrir la ficha del "+md.cod}),el("span",{class:"sub",text:"Sus ejes, dónde están y cada reparación"})]):null,
        pzPan("Por qué van al taller",null,gt.length?gt.map(([t,n])=>el("button",{type:"button",class:"pz-mot","aria-pressed":String(F.mot===t),onclick:()=>pon("mot",t)},
          [el("span",{class:"l"},[el("span",{text:t}),el("b",{text:String(n)}),el("span",{class:"p",text:Math.round(n/Math.max(1,bm.length)*100)+" %"})]),pzBarra(n,mxt)])):[pzVacio("Nada todavía.")])])]));
    const media=lista.length?Math.round(lista.reduce((t,r)=>t+(diasFuera(r)||0),0)/lista.length):0;const ver=F.todo?lista:lista.slice(0,15);
    box.appendChild(pzPan("Reparaciones recibidas",plu(lista.length,"reparación","reparaciones")+" · "+eur(g)+(lista.length?" · "+media+" días fuera de media":""),
      lista.length?[pzTablaReps(ver),lista.length>ver.length?el("button",{type:"button",class:"pz-mas",text:"Ver las "+(lista.length-ver.length)+" que faltan",onclick:()=>{F.todo=true;pinta();}}):null]:[pzVacio("No hay reparaciones con estos filtros.")],"pzReps"));
    box.appendChild(el("details",{class:"pz-nota"},[el("summary",{text:"Cómo se cuenta y qué sale al copiar o descargar"}),
      el("p",{class:"hint",text:"Coste = importe del albarán si lo pusiste al recibir; si no, el precio de reparación del modelo. Ahorro = precio de reparación de cada eje que se arregla aquí («Recuperado en planta»). Pistones salvados = los sacados de un eje agarrotado: se quedan en la fábrica. Perdidos en el taller = ejes mandados con el pistón agarrotado dentro: el pistón no vuelve."}),
      incluirChips("costes",OPS_IC,null,"Qué incluir al copiar o descargar (se recuerda):").node]));}
  const per=PER_G.find(x=>x[0]===F.per);
  const cerrar=objPage({ruta:["Almacén","Piezas","Ejes"],titulo:"Gasto y ahorro en ejes",sub:"Lo que cuesta el taller y lo que se ahorra arreglando aquí. Toca un mes, un modelo o un motivo para ver solo eso.",volver:"Ejes",tabs:[[per?per[1]:"Gasto",[box]]]});
  const ov=[...document.querySelectorAll(".op-ov")].pop();if(ov)ov._repinta=pinta;pinta();return cerrar;}

/* ---------- En el taller ---------- */
function pantTaller(){const F={tramo:null,mot:null};const box=el("div",{class:"pz"});
  function pinta(){box.textContent="";const hy=hoy();
    const T=todasRep().filter(r=>r.env&&!r.res&&ejes.some(e=>e.cod===r.eje)).map(r=>Object.assign({},r,{d:dias(r.env,hy),mot:motivoRep(r.desp)})).sort((a,b)=>b.d-a.d);
    const tramo=x=>x.d>60?"60":x.d>30?"30":"0";const gt=pzGrupo(T,r=>r.mot);
    const L=T.filter(x=>(!F.tramo||tramo(x)===F.tramo)&&(!F.mot||x.mot===F.mot));const pon=(k,v)=>{F[k]=F[k]===v?null:v;pinta();};
    const n60=T.filter(x=>tramo(x)==="60").length,ped=T.filter(x=>x.traer).length,costeT=T.reduce((t,r)=>t+costeRep(r).v,0);
    box.appendChild(el("div",{class:"pz-barra"},[el("span",{class:"sub",text:plu(T.length,"eje","ejes")+" · "+eur(costeT)+" cuando vuelvan · "+plu(ped,"pedido","pedidos")+" para que lo traigan"}),
      el("div",{class:"pz-acc"},[el("button",{type:"button",class:"btn sec",text:"Copiar la lista",onclick:async()=>{const tx=["EJES EN EL TALLER · "+fmtF(hy),""].concat(L.map(r=>"- "+r.eje+" · "+ejeRef({mod:modeloDeEje(r.eje)})+(maqRep(r)?" · "+maqRep(r):"")+" · desde el "+fmtF(r.env)+" ("+r.d+" días) · "+despTxt(r.desp))).join("\n");
          try{await navigator.clipboard.writeText(tx);toast("Lista copiada");}catch(er){dlg("Lista",el("textarea",{readonly:true,style:"min-height:240px;font-size:13px",value:tx}),[{t:"Cerrar",cls:"sec"}]);}}}),
        el("button",{type:"button",class:"btn sec",text:"Pedir al taller que traiga",onclick:()=>pedirTraer()}),
        el("button",{type:"button",class:"btn",text:"Recibir del taller",onclick:()=>recepcionMultiple()})])]));
    box.appendChild(pzCifras([["Más de 60 días",String(n60),n60?"pregunta al taller por ellos":"ninguno",n60?"bad":"ok",()=>pon("tramo","60")],
      ["Entre 30 y 60 días",String(T.filter(x=>tramo(x)==="30").length),"todavía en plazo normal","",()=>pon("tramo","30")],
      ["Menos de 30 días",String(T.filter(x=>tramo(x)==="0").length),"enviados hace poco","",()=>pon("tramo","0")],
      gt.length?["Lo que más llevan",gt[0][0],gt[0][1]+" de "+T.length,"",()=>pon("mot",gt[0][0])]:null]));
    const chips=[F.tramo?["tramo",F.tramo==="60"?"Más de 60 días":F.tramo==="30"?"Entre 30 y 60 días":"Menos de 30 días"]:null,F.mot?["mot",F.mot]:null].filter(Boolean);
    if(chips.length)box.appendChild(el("div",{class:"pz-filtros"},[el("span",{class:"sub",text:"Mirando solo:"})].concat(chips.map(([k,t])=>el("button",{type:"button",class:"pz-quita","aria-label":"Quitar el filtro "+t,onclick:()=>{F[k]=null;pinta();}},[t," ✕"])))));
    box.appendChild(pzPan("Primero los que más llevan",plu(L.length,"eje","ejes"),L.length?[pzTablaReps(L)]:[pzVacio(T.length?"Ninguno con estos filtros.":"No hay ningún eje en el taller.")]));
    if(gt.length>1)box.appendChild(pzPan("Qué tienen","Toca uno para ver solo esos",gt.map(([t,n])=>el("button",{type:"button",class:"pz-mot","aria-pressed":String(F.mot===t),onclick:()=>pon("mot",t)},
        [el("span",{class:"l"},[el("span",{text:t}),el("b",{text:String(n)}),el("span",{class:"p",text:Math.round(n/T.length*100)+" %"})]),pzBarra(n,gt[0][1])]))));}
  const cerrar=objPage({ruta:["Almacén","Piezas","Ejes"],titulo:"Ejes en el taller",sub:"Cuántos días lleva cada uno fuera, en qué máquina iba y qué tenía. Toca uno para ver su historia.",volver:"Ejes",tabs:[["Taller",[box]]]});
  const ov=[...document.querySelectorAll(".op-ov")].pop();if(ov)ov._repinta=pinta;pinta();return cerrar;}

/* ---------- Historia de un eje (para su ficha) ---------- */
function historiaEje(e){const ev=[];const hy=hoy();
  repsDe(e.cod).forEach(r=>{const mq=maqRep(r),ag=/agarr/i.test(r.desp||"");
    if(r.res==="anulada"){if(r.alta)ev.push({f:r.alta,t:"Preparado para el taller: "+despTxt(r.desp).toLowerCase(),d:mq?"Sale de la "+mq:"",c:"esta"});if(r.rec)ev.push({f:r.rec,t:r.recup?"Arreglado aquí: no va al taller":"Al final no va al taller",d:r.recup?"Cuenta como ahorro":"",c:""});return;}
    if(r.env)ev.push({f:r.env,t:"Al taller: "+despTxt(r.desp).toLowerCase(),d:[mq?"Sale de la "+mq:null,ag?"Se mandó con el pistón dentro: no vuelve":null,!r.res?"Sigue allí: lleva "+dias(r.env,hy)+" días":null].filter(Boolean).join(" · "),c:r.res?"va":"esta"});
    else if(r.alta)ev.push({f:r.alta,t:"Preparado para enviar: "+despTxt(r.desp).toLowerCase(),d:mq?"Sale de la "+mq:"",c:"esta"});
    if(r.lleg&&!(r.res==="ok"&&r.rec===r.lleg))ev.push({f:r.lleg,t:"Llega del taller"+(r.res?"":", por revisar"),d:r.alb?"Albarán "+r.alb:"",c:""});
    if(r.nook&&r.dev)ev.push({f:r.dev,t:"Revisado NO-OK: vuelve al taller",d:r.obs||"",c:"va"});
    if(r.res==="ok"&&r.rec){const c=costeRep(r).v;ev.push({f:r.rec,t:"Vuelve reparado",d:[diasFuera(r)+" días fuera",c?eur(c):null,r.alb?"albarán "+r.alb:null].filter(Boolean).join(" · "),c:"ok"});}});
  if(e.estado==="planta"&&e.maq&&e.maqF)ev.push({f:e.maqF,t:"Puesto en la "+e.maq,d:"",c:"ok"});
  if(e.alta)ev.push({f:e.alta,t:"Alta en la app",d:"",c:""});
  return ev.filter(x=>x.f).sort((a,b)=>b.f.localeCompare(a.f));}
/* volvió al taller poco después de llegar reparado: puede entrar en la garantía */
function vueltasRapidas(e){const R=repsDe(e.cod).filter(r=>r.res!=="anulada");const out=[];
  R.filter(r=>r.res==="ok"&&r.rec).forEach(r=>{const sig=R.map(x=>x.env||x.alta).filter(f=>f&&f>=r.rec&&f!==r.env).sort()[0];if(sig&&dias(r.rec,sig)<=15)out.push([r.rec,sig,dias(r.rec,sig)]);});return out;}
function pzHistoria(e){const ev=historiaEje(e);const av=vueltasRapidas(e);
  return[].concat(av.map(([v,s,n])=>el("section",{class:"pz-aviso"},[el("h3",{text:"Volvió al taller a los "+plu(n,"día","días")}),el("p",{text:"Llegó reparado el "+fmtF(v)+" y el "+fmtF(s)+" se mandó otra vez. Merece la pena preguntar al taller si entra en la garantía de la reparación anterior."})])),
    [pzPan("Su historia","Lo último arriba",ev.length?[el("ol",{class:"pz-hist"},ev.map(x=>el("li",{},[el("span",{class:"f num",text:fmtF(x.f)}),el("span",{class:"punto "+x.c,"aria-hidden":"true"}),el("span",{},[el("span",{class:"t1",text:x.t}),x.d?el("span",{class:"t2",text:x.d}):null])])))]:[pzVacio("Todavía no tiene nada apuntado.")])]);}

/* ---------- Ficha de un modelo ---------- */
function fichaModelo(m0){const m=(cat.modelos||[]).find(x=>x.id===m0.id||x.cod===m0.cod)||m0;const es=ejes.filter(e=>e.mod===m.cod&&e.estado!=="baja").sort((a,b)=>(+a.num||0)-(+b.num||0));
  const y=hoy().slice(0,4),docs=m.docs||[];
  const reps=todasRep().filter(r=>es.some(e=>e.cod===r.eje)&&(r.env||r.alta)&&r.res!=="anulada").sort((a,b)=>(b.env||b.alta).localeCompare(a.env||a.alta));
  const ab=reps.filter(r=>!r.res&&r.env),ano=reps.filter(r=>r.res==="ok"&&r.rec&&r.rec.slice(0,4)===y);
  const pl=es.filter(e=>e.estado==="planta").length,pg=plantaG(m),min=+m.min||0,dif=pg-min;
  const gm=pzGrupo(reps,r=>motivoRep(r.desp));const gasto=ano.reduce((t,r)=>t+costeRep(r).v,0);
  const iny=inyDe(m);const inyTxt=iny.length?iny.map(x=>{const q=cat.maquinas.find(z=>z.cod===x);return x+(q&&q.nave?" ("+q.nave.replace("Nave ","N")+")":"");}).join(", "):(m.iny||"—");
  const masLargo=ab.length?Math.max(...ab.map(r=>dias(r.env,hoy()))):0;
  const okR=reps.filter(r=>r.res==="ok"&&r.rec&&r.env),dMed=okR.length?Math.round(okR.reduce((t,r)=>t+dias(r.env,r.rec),0)/okR.length):null;
  const recuM=ejeRecup().filter(x=>(x.mods||[]).includes(m.cod)),recuA=recuM.filter(x=>(x.f||"").slice(0,4)===y);
  const repsDeEje=cod=>ano.filter(r=>r.eje===cod).length;
  /* sus ejes, en tejas */
  const tejas=el("div",{class:"pz-tejas"},es.map(e=>{const a=abiertaDe(e.cod);const[t]=EST_E[e.estado]||["—"];const fuera=e.estado!=="planta";
    return el("button",{type:"button",class:"pz-teja"+(fuera?" fuera":""),onclick:()=>fichaEje(e)},[el("b",{text:e.cod}),
      el("span",{class:"e "+(fuera?"warn":"ok"),text:e.estado==="planta"?(e.maq?"Puesto en la "+e.maq:"En planta, de repuesto"):t+(a&&a.env&&!a.res?" desde el "+fmtF(a.env):"")}),
      el("span",{class:"s",text:repsDeEje(e.cod)?plu(repsDeEje(e.cod),"reparación","reparaciones")+" en "+y:"Sin reparaciones en "+y})]);}));
  const dato=(k,v)=>v?[el("dt",{text:k}),el("dd",{text:String(v)})]:[];
  const docBox=el("div",{style:"display:flex;flex-wrap:wrap;gap:10px;padding:0 16px 12px"});
  docs.forEach(d=>docBox.appendChild(docThumb(d,async()=>{const x=(cat.modelos||[]).find(z=>z.id===m.id);x.docs=(x.docs||[]).filter(z=>z.id!==d.id);await saveCat();toast("Archivo quitado");cerrarDlgs();fichaModelo(m);})));
  if(!docs.length)docBox.appendChild(el("p",{class:"hint",style:"margin:0",text:"Sin otros documentos (fotos, manuales…)."}));
  const up=subirDoc(async d=>{const x=(cat.modelos||[]).find(z=>z.id===m.id);x.docs=(x.docs||[]).concat([d]);await saveCat();toast("Documento guardado");cerrarDlgs();fichaModelo(m);},"Subir otro documento (PDF o imagen)");
  objPage({tipo:"Modelo de eje",ruta:["Ejes","Modelos"],titulo:m.ref,sub:"Modelo "+m.cod+" · va en "+inyTxt+" · mínimo en planta: "+plu(min,"eje","ejes")+(precioMod(m.cod)?" · reparación "+eur(precioMod(m.cod)):"")+(dMed!=null?" · en el taller tardan "+dMed+" días de media":"")+(recuM.length?" · arreglados en planta: "+recuM.length+(recuA.length?" ("+recuA.length+" en "+y+", "+eur(recuA.length*precioMod(m.cod))+" ahorrados)":""):""),
    estado:min?(dif<0?["Por debajo del mínimo","bad"]:dif===0?["Justo en el mínimo","warn"]:["Bien","ok"]):null,volver:"Ejes",
    kpis:[["En planta",pl+" de "+es.length,dif<0?"neg":""],["En el taller",ab.length+(ab.length?" · el que más, "+masLargo+" d":""),masLargo>60?"neg":""],["Gastado en "+y,eur(gasto)+" · "+ano.length+" rep."],["Lo que más le pasa",gm.length?gm[0][0]:"—"]],
    tabs:[["Ejes ("+es.length+")",[es.length?pzPan("Sus "+es.length+" ejes","Toca uno para ver su historia",[tejas]):pzVacio("Sin ejes de este modelo.")]],
      ["Reparaciones ("+reps.length+")",[el("div",{class:"pz-fila2"},[pzPan("Reparaciones","Las que están en el taller y las anteriores",reps.length?[pzTablaReps(reps.slice(0,60))]:[pzVacio("Sin reparaciones.")]),
        el("div",{class:"pz-col"},[pzPan("Por qué van al taller",null,gm.length?gm.map(([t,n])=>el("div",{class:"pz-mot"},[el("span",{class:"l"},[el("span",{text:t}),el("b",{text:String(n)})]),pzBarra(n,gm[0][1])])):[pzVacio("Nada todavía.")])])])]],
      ["Plano y datos",[el("section",{class:"card"},el("div",{class:"bd",style:"display:grid;gap:10px"},[revBox(m)])),
        pzPan("Datos del modelo",null,[el("dl",{class:"pz-datos"},[].concat(dato("Código",m.cod),dato("Referencia",m.ref),dato("Longitud",m.long),dato("Rosca",m.rosca),dato("Ø pistón",m.diamP),dato("Nº plano / rev.",m.plano),dato("Inyectoras",inyTxt),dato("Mínimo en planta",min||null),dato("Precio de reparación",precioMod(m.cod)?eur(precioMod(m.cod)):null),dato("Notas",m.notas)))]),
        pzPan("Otros documentos",null,[docBox,up?el("div",{style:"padding:0 16px 14px"},up):null])]]],
    acts:[{t:"Editar datos",cls:"sec",fn:()=>{setTimeout(()=>formSimple("modelos",m),0);}},{t:"Nuevo eje",cls:"sec",fn:()=>{setTimeout(()=>formEje(null,m.cod),0);}}]});}

/* ---------- Un albarán del taller: los ejes que venían en él (27/11/2026) ----------
   Desde «Plazo y calidad por albarán» se toca un albarán y se ve cada eje: cuándo se mandó, cuándo volvió,
   cuántos días estuvo fuera, si volvió bien o NO-OK y lo que costó. Tocando un eje se va a su historia. */
function pantAlbaranEjes(alb){const box=el("div",{class:"pz"});
  function pinta(){box.textContent="";const R=todasRep().filter(r=>r.alb===alb&&r.res!=="anulada").sort((a,b)=>(a.eje||"").localeCompare(b.eje||"","es",{numeric:true}));
    const ok=R.filter(r=>r.res==="ok"),nk=R.filter(r=>r.nook),dd=R.filter(r=>r.env&&(r.rec||r.lleg)),dm=dd.length?Math.round(dd.reduce((t,r)=>t+dias(r.env,r.rec||r.lleg),0)/dd.length*10)/10:null;
    const coste=ok.reduce((t,r)=>t+costeRep(r).v,0),imp=R.filter(r=>+r.imp>0).length;
    const lleg=R.map(r=>r.lleg||r.rec).filter(Boolean).sort()[0];
    box.appendChild(pzCifras([["Ejes en el albarán",String(R.length),lleg?"llegaron el "+fmtF(lleg):"",""],["Días fuera de media",dm!=null?fmtN(dm):"—","desde que se mandaron hasta que volvieron",dm!=null&&dm>60?"warn":""],
      ["Volvieron NO-OK",String(nk.length),nk.length?"hubo que devolverlos al taller":"todos bien a la primera",nk.length?"bad":"ok"],
      ["Coste",eur(coste),imp?(imp===R.length?"importe del albarán":"en parte con el precio del modelo"):"con el precio de cada modelo",""]]));
    if(!R.length){box.appendChild(pzPan("Ejes",null,[pzVacio("No hay ningún eje con este albarán.")]));return;}
    box.appendChild(pzPan("Los ejes de este albarán","toca uno para ver su historia",[pzTablaReps(R)]));
    if(nk.length)box.appendChild(pzPan("Los que volvieron NO-OK",null,nk.map(r=>el("button",{type:"button",class:"pz-ln pz-ln3",onclick:()=>abreEje(r.eje)},[el("span",{class:"pz-ln-tx"},[el("b",{text:r.eje+" · "+ejeRef({mod:modeloDeEje(r.eje)})}),el("span",{class:"sub",text:"Devuelto el "+fmtF(r.dev)+(r.obs?" · "+r.obs:"")})]),pzPill("NO-OK","bad"),el("span",{})]))));}
  pinta();objPage({ruta:["Ejes","Análisis","Albaranes del taller"],titulo:"Albarán "+alb,sub:"Lo que vino del taller en este albarán.",volver:"Análisis",tabs:[["Ejes",[box]]]});
  const ov=[...document.querySelectorAll(".op-ov")].pop();if(ov)ov._repinta=pinta;}
/* ---------- Un mes: lo que se mandó al taller y lo que volvió ---------- */
function pantRepsMes(m){const box=el("div",{class:"pz"});const nom=cap(fmtMes(m));
  function pinta(){box.textContent="";const A=todasRep().filter(r=>r.res!=="anulada");const env=A.filter(r=>(r.env||"").slice(0,7)===m).sort((a,b)=>a.env.localeCompare(b.env)),rec=A.filter(r=>r.res==="ok"&&(r.rec||"").slice(0,7)===m).sort((a,b)=>a.rec.localeCompare(b.rec));
    box.appendChild(pzCifras([["Mandados al taller",String(env.length),"en "+nom.toLowerCase(),""],["Volvieron bien",String(rec.length),eur(rec.reduce((t,r)=>t+costeRep(r).v,0)),""],
      ["Arreglados en planta",String(ejeRecup().filter(x=>(x.f||"").slice(0,7)===m).length),"sin mandarlos al taller","ok"]]));
    box.appendChild(pzPan("Mandados al taller en "+nom.toLowerCase(),plu(env.length,"eje","ejes"),env.length?[pzTablaReps(env)]:[pzVacio("Ninguno.")]));
    box.appendChild(pzPan("Volvieron bien en "+nom.toLowerCase(),plu(rec.length,"eje","ejes"),rec.length?[pzTablaReps(rec)]:[pzVacio("Ninguno.")]));}
  pinta();objPage({ruta:["Ejes","Análisis"],titulo:"Reparaciones de "+nom.toLowerCase(),sub:"Toca un eje para ver su historia.",volver:"Análisis",tabs:[["Mes",[box]]]});
  const ov=[...document.querySelectorAll(".op-ov")].pop();if(ov)ov._repinta=pinta;}

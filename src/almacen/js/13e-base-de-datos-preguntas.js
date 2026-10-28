/* ===== BASE DE DATOS: preguntas que se contestan con una frase =====
   Lo que va mal, para cuántos días hay, cuándo pedir, dinero, comparar, cuánto dura un pistón o un eje,
   ejes y pistones, contenedores, moldes. intencionA(q) reconoce la pregunta; pintaIntA la contesta. */
const QM_STOP=new Set("cuantos cuantas cuanto dias dia tengo tenemos hay queda quedan quede acabar acaba acabara antes va van se dura duran aguanta pedir pido cuando que de del para la el los las en un una me nos lo con por y a al sin mas menos agotar terminar bajo minimo minimos cerca punto esta estan falta faltan revisar vale valen valor valorado".split(" "));
const codQ=q=>{const m=q.match(/\b([fm]\d{1,3})\b/);return m?m[1].toUpperCase():null;};
const maqDeQ=q=>{const c=codQ(q);return c?cat.maquinas.find(x=>nq(x.cod)===nq(c))||null:null;};
const mqEv=e=>cat.maquinas.find(x=>x.id===e.maq)||cat.maquinas.find(x=>x.cod===e.maq)||null;
const naveQA=q=>{const m=q.match(/\bnave\s*(1a|1b|1|2)\b/);return m?"nave "+m[1]:null;};
const enNave=(m,n)=>!n||(m&&(" "+nq(zonaDe(m))+" ").includes(" "+n));
const dSem=f=>{const d=new Date(f+"T12:00:00");return d.toLocaleDateString("es-ES",{weekday:"long"})+" "+fmtF(f);};
const hace=n=>n===0?"hoy":n===1?"ayer":"hace "+fmtN(n)+" días";
const famLbl=a=>!a?"Otros":a.fam==="piston"?"Pistones":["barra","tornillo","horno","eje"].includes(a.fam)?FAM[a.fam]+(a.fam==="barra"?"s":a.fam==="tornillo"?"s":a.fam==="horno"?"":"s"):(GRUPO_N[grupoDe(a)]||FAM[a.fam]||"Otros");
/* qué artículos: por familia y por palabras (Ø 60, taladrina, un código…) */
function artsQ(q){let rest=" "+q+" ";const F=[];
  [[/\bpiston(es)?\b/,a=>a.fam==="piston"],[/\bbarras?( expulsoras?)?\b/,a=>a.fam==="barra"],[/\btornillos?( tope)?\b/,a=>a.fam==="tornillo"],[/\b(recambios? de hornos?|hornos?)\b/,a=>a.fam==="horno"],
   [/\baceites?\b/,a=>grupoDe(a)==="aceite"],[/\btaladrinas?\b/,a=>grupoDe(a)==="taladrina"],[/\bjabon(es)?\b/,a=>grupoDe(a)==="jabon"],[/\b(desmoldeantes?|pistonwax)\b/,a=>grupoDe(a)==="desmold"]]
    .forEach(([re,f])=>{if(re.test(rest)){F.push(f);rest=rest.replace(re," ");}});
  let L=artsActivos().filter(a=>a.fam!=="eje"&&(!F.length||F.some(f=>f(a))));const txt=a=>" "+nq([a.desc,a.cod,a.diam,GRUPO_N[grupoDe(a)],FAM[a.fam]].join(" "))+" ";
  const ign=[];rest.split(" ").filter(w=>w&&!QSTOP.has(w)&&!QM_STOP.has(w)&&w.length>1&&!/^(nave|1a|1b|recambios?|articulos?|material(es)?|productos?|cosas?|almacen|stock|euros?|dinero)$/.test(w)).forEach(w=>{const a0=raiz(w);const L2=L.filter(a=>reQ(a0).test(txt(a)));if(L2.length)L=L2;else ign.push(w);});
  return{L,ign,fam:F.length>0};}
function evTodo(){const L=SECC.pist.ev().map(e=>Object.assign({fam:"Pistones"},e)).concat(SECC.ejes.ev().map(e=>Object.assign({fam:"Reparación de ejes"},e)));
  todosMov().forEach(x=>{if(x.tipo!=="salida"||/^Cambio de pistón/.test(x.nota||""))return;const a=art(x.art);if(!a)return;const c=+x.cant||0;
    L.push({f:x.f,ts:x.ts||0,maq:x.maq||null,nave:x.nave||null,ref:nomArtC(a),cant:c,ud:a.ud||"ud",eur:c*precioDe(a),quien:x.por||(x.resp?respTxt(x.resp):""),fam:famLbl(a),a});});
  return L.filter(e=>e.f);}
function famEvQ(q){const M=[[/\bpiston(es)?\b/,"Pistones"],[/\bejes?\b/,"Reparación de ejes"],[/\bbarras?\b/,"Barras expulsoras"],[/\btornillos?\b/,"Tornillos tope"],[/\bhornos?\b/,"Recambio de horno"],[/\baceites?\b/,"Aceite"],[/\btaladrinas?\b/,"Taladrina"],[/\bjabon(es)?\b/,"Jabón"]];
  const r=M.filter(([re])=>re.test(q)).map(x=>x[1]);return r.length?r:null;}
const famCasa=(e,fs)=>!fs||fs.some(f=>nq(e.fam).startsWith(nq(f).slice(0,6)));

function intencionA(q){const o={q,maq:maqDeQ(q),cod:codQ(q),nave:naveQA(q)};const M=(modo,x)=>Object.assign(o,{modo},x||{});
  if(/\b(que hay que revisar|que tengo que revisar|que va mal|algo mal|algun problema|problemas|avisos|que falla)\b/.test(q))return M("revisar");
  if(/\busad[oa]s?\b|\bchatarra\b|\bpara recuperar\b|\brecuperad\w*\b/.test(q)&&!QCO.test(q.replace(/\busad[oa]s?\b/g,"")))return M("usados",{d:(q.match(/\b(50|60|70|80|90|100)( esp)?\b/)||[])[0]||null});
  if(/\bbeatriz\b|\binforme de pistones\b|\b(sin|por|falta(n)? por) (mandar|enviar)\b/.test(q))return M("beatriz");
  /* contenedores: «tipo B3», «dónde están los A1» → la base de datos de contenedores */
  const ct=q.match(/\b([a-e])\s?([1-5])\b/);if(ct&&(/\bcontenedor(es)?\b|\btipo\b|\bdonde (esta|estan)\b|\bcuantos\b/.test(q)))return M("rew",{rew:"contenedores "+ct[1]+ct[2]+(/\bdonde\b/.test(q)?" por dónde está":"")});
  if(/\bmoldes?\b/.test(q)&&(o.cod||/\b(en que|que) maquina\b|\bdonde esta\b/.test(q))&&!QCO.test(q))return M("molde");
  if(/\b(cuanto|cuantos dias) (dura|duran|aguanta|aguantan)\b.*\b(de media|cada uno|un piston|un eje)\b|\bde media\b.*\b(dura|duran)\b|\bduracion\b|\bcada cuanto\b.*\b(cambia|cambian|repara|reparan)\b|\bvida (media|util)\b/.test(q))return M("dura",{eje:/\bejes?\b/.test(q)});
  if(/\b(llevan?|lleva) mas tiempo sin (cambiar|cambio|cambios)\b|\bsin cambiar (el )?piston\b|\bhace cuanto (que )?no se cambia\b|\bultimo cambio de piston de cada\b/.test(q))return M("sincambio");
  if(/\bejes?\b/.test(q)&&o.cod&&/\b(valen|vale|sirven?|sirve|montan?|monta|lleva|para)\b/.test(q)&&!QCO.test(q))return M("ejesmaq");
  if(/\bdonde (esta|estan)\b.*\beje\b|\beje\b.*\bdonde (esta|estan)\b|\bcomo esta el eje\b/.test(q))return M("dondeeje",{cod:q.replace(/.*\beje\b/,"").replace(/\b(donde|esta|estan|como|el|la|ahora)\b/g," ").trim()});
  if(/\bejes?\b/.test(q)&&/\b(pendientes?|por reparar|sin reparar|en (el )?taller|reparando|en reparacion|sin enviar|preparados?|devueltos?)\b/.test(q)&&!/\b(cuantas reparaciones|este ano|ano pasado|por mes)\b/.test(q))return M("ejespend");
  if(/\bpedidos?\b|\bsin llegar\b|\bpendientes? de llegar\b|\bno (ha|han) llegado\b/.test(q)&&!/\bcuando\b/.test(q))return M("pedidos",{n:+((q.match(/\b(\d+) dias\b/)||[])[1]||0)});
  if(/\bno se (mueve|mueven|usa|usan|gasta|gastan)\b|\bsin (movimiento|moverse|movimientos|salidas|consumo)\b|\bstock (muerto|parado)\b|\bparad[oa]s? en el almacen\b/.test(q))return M("parado",{meses:+((q.match(/\b(\d+) meses\b/)||[])[1]||6)});
  if(/\bcuando (tengo|hay|tenemos|debo) que pedir\b|\bcuando pido\b|\bcuando (hay que )?pedir\b|\bcuando se pide\b/.test(q))return M("cuandopedir");
  if(/\bbajo (el )?minimo\b|\bcerca del minimo\b|\bpara pedir\b|\bque (hay que|tengo que) pedir\b|\bque falta\b/.test(q))return M("minimo");
  if(/\b(para )?cuantos dias\b|\bcuanto (me |nos )?(dura|duran|aguanta|aguantan|queda|quedan)\b|\bse (va a |van a )?(acabar|terminar|agotar)\b|\bse acaba(n)? antes\b/.test(q))return M("dias");
  if(/\b(cuanto vale|valor (de|del)|valorad\w*|cuanto dinero hay)\b/.test(q))return M("valor");
  if(/\bcompar\w*\b|\bfrente al?\b|\brespecto al?\b|\bque el mes pasado\b|\bcontra el mes\b/.test(q))return M("comp");
  if(/\b(por|a la|cada) semana\b|\bsemanal\w*\b/.test(q)&&/\b(cambia|cambian|cambios?|gasta|gastan|consum\w*)\b/.test(q))return M("ritmo");
  if(/\b(cuanto (hemos |se ha |han |se han |nos hemos )?(gastado|costado)|cuanto dinero|en euros|cuanto (nos )?cuesta|cuanto cuestan|costes?|mas dinero|gasto en dinero|gastamos)\b/.test(q))return M("dinero",{porMaq:/\b(cada (inyectora|maquina)|por maquina|que maquina|que inyectora|maquinas)\b/.test(q),alMes:/\b(al mes|cada mes|por mes|mensual\w*)\b/.test(q)});
  return null;}

function pintaIntA(I,res,pon){const h=hoy(),q=I.q;
  const add=n=>{if(n)res.appendChild(n);return n;},frase=t=>add(el("p",{class:"bd-resp",text:t})),nota=t=>add(el("p",{class:"hint",style:"margin:8px 2px",text:t}));
  const ent=(t,extra)=>add(el("div",{class:"bd-ent"},[el("span",{class:"sub",text:"Buscando en "}),el("b",{text:t})].concat((extra||[]).filter(Boolean).map(x=>el("span",{class:"pill info",text:x})))));
  const lista=(tit,items,sub)=>add(el("section",{class:"card"},[tit?el("div",{class:"hd"},[el("h2",{text:tit}),sub?el("span",{class:"der sub",text:sub}):null]):null,el("div",{class:"lst"},items)]));
  const it=(t1,t2,b,small,on,stripe)=>el(on?"button":"div",{type:on?"button":null,class:"it",style:on?null:"cursor:default",onclick:on||null},[stripe?el("span",{class:"stripe "+stripe}):null,
    el("div",{class:"ppal"},[el("div",{class:"t1",text:t1})].concat((Array.isArray(t2)?t2:[t2]).filter(Boolean).map(x=>el("div",{class:"t2",text:x})))),b!=null?el("div",{class:"cant num"},[el("b",{text:b}),small?el("small",{text:small}):null]):null]);
  const ign=L=>{if(L&&L.length)nota("No he encontrado «"+L.join("», «")+"», así que no lo he tenido en cuenta.");};
  const P=periodoQ(q);

  if(I.modo==="revisar"){ent("todo lo que hay que revisar");const A=artsActivos();
    const bajo=A.filter(a=>!a.pedido&&nivel(a)==="bad"),pedir=A.filter(a=>!a.pedido&&nivel(a)==="warn"),atr=A.filter(a=>a.pedido&&dias(a.pedido,h)>Math.max(15,plazoArt(a)));
    const ejP=ejes.filter(e=>e.estado==="preparado"||e.estado==="devuelto"),ejT=ejes.filter(e=>e.estado==="reparacion"&&(()=>{const r=abiertaDe(e.cod);return r&&diasAb(r)>AMBAR;})());
    const d30=sumaDias(h,-30),sinM=todosMov().filter(m=>m.tipo==="salida"&&m.f>=d30&&!m.maq&&!m.nave&&!/^(Limpieza:|Horno )/.test(m.nota||"")),neg=negativos(),bz=pistPend();
    const R=[[bajo.length,"bajo mínimo sin pedir","qué está bajo mínimo"],[pedir.length,"para pedir (en el punto de pedido)","qué está bajo mínimo"],[atr.length,"pedidos que tardan más de lo normal","qué pedidos llevan más de 15 días sin llegar"],
      [ejP.length,"ejes preparados o devueltos sin enviar al taller","qué ejes están pendientes de reparar"],[ejT.length,"ejes más de "+AMBAR+" días laborables en el taller","qué ejes están pendientes de reparar"],
      [sinM.length,"consumos de los últimos 30 días sin máquina ni nave","movimientos este mes"],[neg.length,"artículos con stock en negativo","stock negativo"],[bz.length,"cambios de pistón sin mandar a Beatriz","cuántos cambios de pistón faltan por mandar a Beatriz"]];
    const malos=R.filter(x=>x[0]>0);frase(malos.length?"Hay "+malos.length+(malos.length===1?" cosa":" cosas")+" que revisar.":"Todo en orden.");
    lista(null,R.map(x=>it(x[0]?x[0]+" "+x[1]:"Sin "+x[1].replace(/^(bajo|para|pedidos|ejes|consumos|artículos|cambios)/,m=>m),x[0]?"Toca para verlo":null,x[0]?"⚠":"✓",null,x[0]?()=>x[2]==="stock negativo"?irA("res"):pon(x[2]):null,x[0]?"warn":"ok")));return;}

  if(I.modo==="usados"){const E=puEstado();ent("pistones usados",[I.d?"Ø "+I.d:null]);
    if(!E){frase("Todavía no se ha hecho el primer recuento de pistones usados. Se hace en Pistones › Pistones usados › «Contar pistones usados».");return;}
    const ds=DIAM.filter(d=>!I.d||nq(d)===nq("Ø "+I.d)),t=b=>ds.reduce((s,d)=>s+(E.S[d][b]||0),0),lin=b=>ds.filter(d=>E.S[d][b]).map(d=>d+": "+E.S[d][b]).join(" · ");
    const Z=t("Z"),Rr=t("R"),Mm=t("M"),C=t("C");
    frase(Z?"En la zona de pistones usados debe haber "+Z+(Z===1?" pistón":" pistones")+(I.d?"":" ("+lin("Z")+")")+".":"La zona de pistones usados debería estar vacía"+(I.d?" de Ø "+I.d:"")+".");
    lista(null,[it("En la zona de usados (sin seleccionar)",Z?lin("Z"):null,String(Z),"uds"),it("Seleccionados para recuperar",Rr?lin("R"):null,String(Rr),"uds"),
      it("En "+PU_REC+" (recuperándose)",Mm?lin("M"):null,String(Mm),"uds"),it("En el cajón de chatarra",C?lin("C"):null,String(C),"uds")]);
    nota("Sale de los cambios de pistón apuntados desde la última retirada de la zona"+(puCambiosZona().length?" ("+puCambiosZona().length+" cambios)":"")+". Si al contar no cuadra, haz un recuento en Pistones › Pistones usados.");
    add(el("button",{type:"button",class:"btn sec",style:"margin-top:8px",text:"Ir a pistones usados",onclick:()=>irA("pist")}));return;}
  if(I.modo==="beatriz"){const L=pistPend(),aj=cat.ajustes||{};ent("cambios de pistón para el informe de "+destPist().nom.split(" ")[0]);
    frase(L.length?"Faltan por mandar "+L.length+(L.length===1?" cambio de pistón":" cambios de pistón")+(aj.ultInfPist?" (el último informe llegaba hasta el "+fmtF(aj.ultInfPist)+")":"")+".":"No falta ningún cambio de pistón por mandar"+(aj.ultInfPist?": el último informe llegaba hasta el "+fmtF(aj.ultInfPist):"")+".");
    if(L.length){const G={};L.forEach(p=>{G[p.diam]=(G[p.diam]||0)+(+p.cant||1);});nota("Por Ø: "+Object.entries(G).sort((a,b)=>String(a[0]).localeCompare(String(b[0]),"es",{numeric:true})).map(([d,n])=>d+": "+n).join(" · "));
      lista(null,L.slice().reverse().map(p=>it(p.diam+" · "+maqN(p.maq),[dSem(p.f)+(p.motivo?" · "+cap(p.motivo):""),p.resp?"Lo hizo "+respTxt(p.resp):null],String(+p.cant||1),"ud")));
      add(el("button",{type:"button",class:"btn",style:"margin-top:8px",text:"Preparar el informe",onclick:()=>informePist()}));}return;}

  if(I.modo==="molde"){const m=I.maq;if(I.cod&&!m){ent("molde puesto",[I.cod]);frase("No encuentro la máquina "+I.cod+".");return;}if(m){const x=moldeDe(hoyDe(m).molde);ent("molde puesto",[m.cod]);frase(x?m.cod+" lleva el molde "+moldeTxt(x)+".":m.cod+" no tiene molde apuntado.");if(x)add(el("button",{type:"button",class:"btn sec",text:"Ver el molde",onclick:()=>formMolde(x)}));return;}
    const w=q.replace(/\b(en|que|maquina|donde|esta|el|molde|la|de|del)\b/g," ").trim().split(" ").filter(Boolean);const L=moldes().filter(x=>w.every(t=>reQ(raiz(t)).test(" "+nq(x.cod+" "+(x.pieza||""))+" ")));
    ent("moldes",w);if(!L.length){frase("No encuentro ese molde.");return;}
    frase(L.slice(0,3).map(x=>{const ms=cat.maquinas.filter(m=>hoyDe(m).molde===x.id).map(m=>m.cod);return"El molde "+x.cod+(ms.length?" está en la "+ms.join(", "):" no está puesto en ninguna máquina");}).join(". ")+".");return;}

  if(I.modo==="dura"){if(I.eje){const R=todasRep().filter(r=>r.env&&r.res!=="anulada"&&!r.recuento).sort((a,b)=>a.env.localeCompare(b.env));const per={};
      ejes.forEach(e=>{const rs=R.filter(r=>r.eje===e.cod);for(let i=1;i<rs.length;i++){const a=rs[i-1];if(a.res==="ok"&&a.rec&&a.rec<rs[i].env){const md=modelo(e.mod),k=md?md.ref:e.mod;(per[k]=per[k]||[]).push(dias(a.rec,rs[i].env));}}});
      const L=Object.entries(per).map(([k,v])=>({k,n:v.length,m:v.reduce((s,x)=>s+x,0)/v.length})).sort((a,b)=>a.m-b.m);ent("cuánto dura un eje entre reparaciones");
      if(!L.length){frase("Todavía no hay ningún eje que haya vuelto del taller y haya vuelto a ir: hace falta más historia para calcularlo.");return;}
      const tot=L.reduce((s,x)=>s+x.m*x.n,0)/L.reduce((s,x)=>s+x.n,0);frase("Un eje aguanta de media "+fmtN(Math.round(tot))+" días en planta desde que vuelve del taller hasta que vuelve a ir.");
      lista("Por modelo (los que menos aguantan, primero)",L.map(x=>it(x.k,x.n+(x.n===1?" vez medida":" veces medidas"),fmtN(Math.round(x.m)),"días")));return;}
    const P2=todosPist().filter(p=>p.maq&&p.f);const M2={};P2.forEach(p=>{(M2[p.maq]=M2[p.maq]||new Set()).add(p.f);});
    const vida=id=>{const fs=[...(M2[id]||[])].sort();const iv=[];for(let i=1;i<fs.length;i++)iv.push(dias(fs[i-1],fs[i]));return{fs,iv,m:iv.length?iv.reduce((s,x)=>s+x,0)/iv.length:null};};
    if(I.maq){const v=vida(I.maq.id);ent("cuánto dura un pistón",[I.maq.cod]);if(v.m==null){frase(v.fs.length?"En la "+I.maq.cod+" solo hay un cambio apuntado ("+fmtF(v.fs[0])+"): hace falta otro para calcularlo.":"En la "+I.maq.cod+" no hay cambios de pistón apuntados.");return;}
      frase("En la "+I.maq.cod+" un pistón dura de media "+fmtN(Math.round(v.m))+" días (entre "+fmtN(Math.min(...v.iv))+" y "+fmtN(Math.max(...v.iv))+"), según "+v.fs.length+" cambios desde el "+fmtF(v.fs[0])+".");
      const ult=v.fs[v.fs.length-1];nota("El último cambio fue el "+fmtF(ult)+" ("+hace(dias(ult,h))+")"+(dias(ult,h)>v.m?": ya lleva más de lo normal.":"."));return;}
    const L=cat.maquinas.filter(m=>enNave(m,I.nave)).map(m=>{const v=vida(m.id);return{m,fs:v.fs,iv:v.iv,md:v.m};}).filter(x=>x.md!=null).sort((a,b)=>a.md-b.md);ent("cuánto dura un pistón en cada máquina",[I.nave]);
    if(!L.length){frase("Hacen falta al menos dos cambios en la misma máquina para calcularlo.");return;}
    if(I.cod&&!I.maq)nota("No encuentro la máquina "+I.cod+"; salen todas.");
    frase("Donde menos dura es la "+L[0].m.cod+" ("+fmtN(Math.round(L[0].md))+" días de media) y donde más, la "+L[L.length-1].m.cod+" ("+fmtN(Math.round(L[L.length-1].md))+" días).");
    lista("Días de media entre cambios",L.map(x=>it(x.m.cod,x.fs.length+" cambios · último "+fmtF(x.fs[x.fs.length-1]),fmtN(Math.round(x.md)),"días",()=>pon("cuánto dura de media un pistón en la "+x.m.cod))));return;}

  if(I.modo==="sincambio"){const L=cat.maquinas.filter(m=>enNave(m,I.nave)&&(diamDe(m)||ultimoPist(m.id))).map(m=>{const u=ultimoPist(m.id);return{m,u,d:u?dias(u.f,h):null};}).sort((a,b)=>(b.d==null?1e9:b.d)-(a.d==null?1e9:a.d));
    ent("máquinas sin cambiar pistón",[I.nave]);const con=L.filter(x=>x.u);if(!con.length){frase("No hay cambios de pistón apuntados.");return;}
    frase("La que más tiempo lleva sin cambiar pistón es la "+con[0].m.cod+": "+hace(con[0].d)+" ("+fmtF(con[0].u.f)+").");
    lista(null,L.map(x=>it(x.m.cod,x.u?"Último: "+fmtF(x.u.f)+" · "+x.u.diam:"Ningún cambio apuntado",x.d==null?"—":fmtN(x.d),"días",()=>pon("cuánto dura de media un pistón en la "+x.m.cod))));return;}

  if(I.modo==="ejesmaq"){const cod=I.maq?I.maq.cod:I.cod,L=ejes.filter(e=>e.estado!=="baja"&&maqsDeEje(e).includes(cod)).sort(porCod);const mods=[...new Set(L.map(ejeRef))];ent("ejes que valen para",[cod]);
    if(!L.length){frase("No hay ningún eje dado de alta que valga para la "+cod+".");return;}
    const pl=L.filter(e=>e.estado==="planta");frase("Para la "+cod+" valen "+L.length+(L.length===1?" eje":" ejes")+" ("+mods.join(", ")+"): "+pl.length+" en planta"+(ejeEnMaq(cod)?", y el puesto ahora es el "+ejeEnMaq(cod).cod:"")+".");
    lista(null,L.map(e=>it(e.cod+" · "+ejeRef(e),(EST_E[e.estado]||[e.estado])[0]+(e.maq?" · puesto en la "+e.maq:""),null,null,()=>fichaEje(e),e.estado==="planta"?"ok":"warn")));return;}

  if(I.modo==="dondeeje"){const w=I.cod.split(" ").filter(Boolean);const L=ejes.filter(e=>e.estado!=="baja"&&w.length&&w.every(t=>reQ(t).test(" "+nq(e.cod+" "+ejeRef(e))+" ")));ent("ejes",w);
    if(!L.length){frase("No encuentro ese eje. Escribe su número o código, por ejemplo «dónde está el eje 12».");return;}
    const tx=e=>{const r=abiertaDe(e.cod);return e.estado==="planta"?(e.maq?"está puesto en la "+e.maq:"está en planta, de reserva"):e.estado==="reparacion"?"está en el taller"+(r&&r.env?" desde el "+fmtF(r.env)+" ("+diasAb(r)+" días laborables)":""):e.estado==="preparado"?"está preparado para enviar al taller":e.estado==="devuelto"?"lo han devuelto a reparar":(EST_E[e.estado]||[e.estado])[0];};
    frase(L.slice(0,3).map(e=>"El eje "+e.cod+" ("+ejeRef(e)+") "+tx(e)).join(". ")+".");lista(null,L.map(e=>it(e.cod+" · "+ejeRef(e),tx(e),null,null,()=>fichaEje(e))));return;}

  if(I.modo==="ejespend"){const L=ejes.filter(e=>["preparado","reparacion","devuelto"].includes(e.estado)).map(e=>{const r=abiertaDe(e.cod);return{e,r,d:r&&r.env?diasAb(r):null};}).sort((a,b)=>(b.d==null?-1:b.d)-(a.d==null?-1:a.d));
    ent("ejes pendientes de reparar");const sin=L.filter(x=>x.e.estado!=="reparacion"),tal=L.filter(x=>x.e.estado==="reparacion");
    if(!L.length){frase("No hay ningún eje pendiente: todos están en planta.");return;}
    frase(tal.length+(tal.length===1?" eje en el taller":" ejes en el taller")+(tal.length&&tal[0].d!=null?" (el que más lleva, el "+tal[0].e.cod+": "+tal[0].d+" días laborables)":"")+" y "+sin.length+(sin.length===1?" sin enviar.":" sin enviar."));
    lista(null,L.map(x=>it(x.e.cod+" · "+ejeRef(x.e),[(EST_E[x.e.estado]||[x.e.estado])[0]+(x.r&&x.r.env?" desde el "+fmtF(x.r.env):""),x.r&&x.r.desp?motivoRep(x.r.desp):null],x.d==null?"—":String(x.d),x.d==null?"sin enviar":"días lab.",()=>fichaEje(x.e),x.d!=null&&x.d>ROJO?"bad":x.d!=null&&x.d>AMBAR?"warn":"")));return;}

  if(I.modo==="pedidos"){const L=artsActivos().filter(a=>a.pedido).map(a=>({a,d:dias(a.pedido,h),pl:plazoArt(a)})).filter(x=>!I.n||x.d>I.n).sort((a,b)=>b.d-a.d);ent("pedidos sin llegar",[I.n?"más de "+I.n+" días":null]);
    if(!L.length){frase(I.n?"No hay pedidos de más de "+I.n+" días sin llegar.":"No hay nada pedido pendiente de llegar.");return;}
    const tarde=L.filter(x=>x.d>(x.pl||15));frase(L.length+(L.length===1?" pedido":" pedidos")+" sin llegar"+(tarde.length?"; "+tarde.length+" tardan más de lo normal (el que más, "+tarde[0].a.desc+": "+tarde[0].d+" días).":"."));
    lista(null,L.map(x=>it(x.a.desc,["Pedido el "+fmtF(x.a.pedido)+(provN(x.a.prov)?" · "+provN(x.a.prov):""),x.pl?"Plazo normal: "+x.pl+" días":null],String(x.d),"días",()=>ficha(x.a),x.d>(x.pl||15)?"bad":"")));return;}

  if(I.modo==="parado"){const lim=sumaDias(h,-30*I.meses),ult={};todosMov().forEach(m=>{if(m.tipo==="ajuste")return;if(!ult[m.art]||m.f>ult[m.art])ult[m.art]=m.f;});
    const L=artsActivos().filter(a=>a.fam!=="eje"&&stockDe(a.id)>0&&(!ult[a.id]||ult[a.id]<lim)).map(a=>({a,f:ult[a.id]||null,v:stockDe(a.id)*precioDe(a)})).sort((a,b)=>b.v-a.v);
    ent("artículos sin movimiento",["más de "+I.meses+" meses"]);const v=L.reduce((s,x)=>s+x.v,0);
    frase(L.length?L.length+(L.length===1?" artículo con stock no se ha movido":" artículos con stock no se han movido")+" en "+I.meses+" meses"+(v?": unos "+eur(v)+" parados.":"."):"Todo lo que tiene stock se ha movido en los últimos "+I.meses+" meses.");
    if(L.length)lista(null,L.slice(0,60).map(x=>it(nomArt(x.a),[(x.f?"Último movimiento: "+fmtF(x.f):"Nunca se ha movido")+" · "+fmtN(stockDe(x.a.id))+" "+(x.a.ud||"ud")],x.v?eur(x.v):"—",null,()=>ficha(x.a))));
    nota("Los recuentos no cuentan como movimiento. Cambia los meses escribiendo, por ejemplo, «sin movimiento 12 meses».");return;}

  if(I.modo==="dias"||I.modo==="cuandopedir"||I.modo==="minimo"){const S=artsQ(q);
    if(I.modo==="minimo"){const L=S.L.filter(a=>nivel(a)==="bad"||nivel(a)==="warn").sort((a,b)=>(nivel(a)==="bad"?0:1)-(nivel(b)==="bad"?0:1)||stockDe(a.id)/(+a.min||1)-stockDe(b.id)/(+b.min||1));ent("lo que está bajo mínimo o para pedir");ign(S.ign);
      const bad=L.filter(a=>nivel(a)==="bad"),sinP=L.filter(a=>!a.pedido);
      frase(L.length?bad.length+" bajo mínimo y "+(L.length-bad.length)+" para pedir"+(L.length-sinP.length?" ("+(L.length-sinP.length)+" ya pedidos).":"."):"Nada bajo mínimo ni para pedir.");
      if(L.length)lista(null,L.map(a=>it(nomArt(a),["Mínimo "+fmtN(+a.min||0)+" · punto de pedido "+fmtN(Math.round(puntoPedido(a)*10)/10),a.pedido?"Pedido el "+fmtF(a.pedido):"Sin pedir",diasQuedan(a)!=null?"Para "+diasTxt(diasQuedan(a)):null],fmtN(Math.round(stockDe(a.id)*10)/10),a.ud||"ud",()=>ficha(a),nivel(a)==="bad"?"bad":"warn")));return;}
    const L=S.L.filter(a=>consDia(a)>0||stockDe(a.id)>0).map(a=>{const c=consDia(a),st=stockDe(a.id),pp=puntoPedido(a);return{a,c,st,d:diasQuedan(a),dp:c>0?Math.floor((st-pp)/c):null};});
    if(I.modo==="cuandopedir"){const R=L.filter(x=>x.c>0&&puntoPedido(x.a)>0).sort((a,b)=>a.dp-b.dp);ent("cuándo hay que pedir");ign(S.ign);
      if(!R.length){frase("No hay consumo ni mínimos para calcularlo"+(S.ign.length?"":" en eso")+".");return;}
      const x=R[0],t=x=>x.a.pedido?"ya está pedido (el "+fmtF(x.a.pedido)+")":x.dp<=0?"hay que pedirlo ya":"hay que pedirlo "+(x.dp===1?"mañana":"en unos "+x.dp+" días, hacia el "+dSem(sumaDias(h,x.dp)));
      frase((R.length===1?nomArt(x.a)+": ":"El primero es "+nomArt(x.a)+": ")+t(x)+".");
      lista(null,R.slice(0,40).map(x=>it(nomArt(x.a),["Quedan "+fmtN(Math.round(x.st*10)/10)+" · punto de pedido "+fmtN(Math.round(puntoPedido(x.a)*10)/10)+" · gasta "+fmtN(Math.round(x.c*100)/100)+" al día",t(x)],x.a.pedido?"pedido":x.dp<=0?"ya":fmtF(sumaDias(h,x.dp)).slice(0,5),null,()=>ficha(x.a),x.a.pedido?"":x.dp<=0?"bad":x.dp<=7?"warn":"")));
      nota("Punto de pedido = mínimo + lo que se gasta mientras llega el pedido (plazo del proveedor). El gasto es el de los últimos 60 días.");return;}
    const R=L.filter(x=>x.c>0).sort((a,b)=>a.d-b.d);ent(S.fam||S.L.length<artsActivos().length?"para cuántos días hay":"qué se va a acabar antes");ign(S.ign);
    if(!R.length){frase("No hay consumo en los últimos 60 días para calcularlo.");return;}
    if(R.length===1)frase(nomArt(R[0].a)+": hay "+fmtN(Math.round(R[0].st*10)/10)+" "+(R[0].a.ud||"ud")+", para "+diasTxt(R[0].d)+" (gasta "+fmtN(Math.round(R[0].c*100)/100)+" al día).");
    else frase("Lo que antes se acaba es "+nomArt(R[0].a)+": para "+diasTxt(R[0].d)+".");
    lista(null,R.slice(0,40).map(x=>it(nomArt(x.a),["Hay "+fmtN(Math.round(x.st*10)/10)+" "+(x.a.ud||"ud")+" · gasta "+fmtN(Math.round(x.c*100)/100)+" al día",x.a.pedido?"Pedido el "+fmtF(x.a.pedido):null],x.d===0?"0":fmtN(x.d),"días",()=>ficha(x.a),x.d<=7?"bad":x.d<=20?"warn":"ok")));
    nota("Días al ritmo de los últimos 60 días.");return;}

  if(I.modo==="valor"){const S=artsQ(q);const G={};let tot=0,sinP=0;S.L.forEach(a=>{const st=stockDe(a.id);if(!(st>0))return;const p=precioDe(a);if(!p){sinP++;return;}const v=st*p,k=famLbl(a);G[k]=(G[k]||0)+v;tot+=v;});
    ent("valor del almacén");ign(S.ign);frase("Lo que hay en el almacén vale unos "+eur(tot)+".");
    lista(null,Object.entries(G).sort((a,b)=>b[1]-a[1]).map(([k,v])=>it(k,Math.round(v/tot*100)+" %",eur(v),null)));if(sinP)nota(sinP+" artículos con stock no tienen precio y no se han contado.");return;}

  /* lo que se ha gastado: dinero, comparar y ritmo */
  const fs=famEvQ(q);let E0=evTodo().filter(e=>famCasa(e,fs)&&(!I.maq||(mqEv(e)&&mqEv(e).id===I.maq.id))&&(!I.nave||enNave(mqEv(e),I.nave)||(e.nave&&nq(e.nave).startsWith(I.nave))));
  const etq=[fs?fs.join(", "):null,I.maq?I.maq.cod:null,I.nave];
  const porMaq=L=>{const G={};L.forEach(e=>{const m=mqEv(e),k=m?m.cod:(e.nave||"Sin máquina");const g=G[k]=G[k]||{n:0,c:0,eu:0,m};g.n++;g.c+=e.cant;g.eu+=e.eur;});return G;};

  if(I.modo==="comp"){let P1=P.def?{d:h.slice(0,7)+"-01",h,t:"este mes"}:P;const y=+P1.d.slice(0,4),mo=+P1.d.slice(5,7),yy=mo===1?y-1:y,mm=mo===1?12:mo-1,m0=yy+"-"+String(mm).padStart(2,"0");
    const P0={d:m0+"-01",h:finMes(m0+"-01"),t:cap(fmtMes(m0))};const A=E0.filter(e=>e.f>=P1.d&&e.f<=P1.h),B=E0.filter(e=>e.f>=P0.d&&e.f<=P0.h);
    const n=L=>L.reduce((s,e)=>s+(contable(e.ud)?e.cant:1),0),eu=L=>L.reduce((s,e)=>s+e.eur,0),pc=(a,b)=>b?Math.round((a-b)/b*100):null;
    ent(cap(P1.t)+" frente a "+P0.t.toLowerCase(),etq);const c=pc(eu(A),eu(B));
    frase(cap(P1.t)+": "+fmtN(n(A))+(fs&&fs.length===1&&fs[0]==="Pistones"?" pistones":" apuntes")+" · "+eur(eu(A))+". "+P0.t+": "+fmtN(n(B))+" · "+eur(eu(B))+"."+(c!=null?" En dinero, "+(c>0?"un "+c+" % más.":c<0?"un "+(-c)+" % menos.":"lo mismo."):""));
    if(P1.t==="este mes")nota("Ojo: este mes aún no ha terminado (va por el día "+(+h.slice(8,10))+").");
    const GA=porMaq(A),GB=porMaq(B),ks=[...new Set(Object.keys(GA).concat(Object.keys(GB)))].sort((a,b)=>((GA[b]||{eu:0}).eu-(GA[a]||{eu:0}).eu));
    add(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Por máquina"})),cTabla(["Máquina",cap(P1.t),P0.t,"€ ahora","€ antes"],ks.map(k=>[k,fmtN((GA[k]||{n:0}).n),fmtN((GB[k]||{n:0}).n),eur((GA[k]||{eu:0}).eu),eur((GB[k]||{eu:0}).eu)]))]));return;}

  if(I.modo==="ritmo"){const per=P.def?{d:sumaDias(h,-84),h,t:"últimas 12 semanas"}:P;const L=E0.filter(e=>e.f>=per.d&&e.f<=per.h),sem=Math.max(1,dias(per.d,per.h)/7);const G=porMaq(L);
    const R=Object.entries(G).sort((a,b)=>b[1].c-a[1].c);ent("cambios por semana",etq.concat([per.t]));if(!R.length){frase("No hay nada apuntado en "+per.t+".");return;}
    frase("La que más cambia es la "+R[0][0]+": "+fmtN(Math.round(R[0][1].c/sem*10)/10)+" por semana ("+fmtN(R[0][1].c)+" en "+per.t+").");
    lista("Por semana",R.map(([k,g])=>it(k,fmtN(g.c)+" en total"+(g.eu?" · "+eur(g.eu):""),fmtN(Math.round(g.c/sem*10)/10),"/semana")));return;}

  if(I.modo==="dinero"){const per=P.def&&!I.alMes?{d:h.slice(0,7)+"-01",h,t:"este mes"}:P;const L=E0.filter(e=>e.f>=per.d&&e.f<=per.h),tot=L.reduce((s,e)=>s+e.eur,0);
    const meses_=Math.max(1,Math.round(dias(per.d,per.h)/30.4));ent("dinero gastado",etq.concat([per.t]));
    frase((/^últimos/.test(per.t)?"En los "+per.t:/^el año/.test(per.t)?"En "+per.t.slice(3):/^[A-Z]/.test(per.t)?"En "+per.t.toLowerCase():cap(per.t))+" se han gastado "+eur(tot)+(I.maq?" en la "+I.maq.cod:"")+(fs?" en "+fs.join(", ").toLowerCase():"")+(I.alMes&&meses_>1?": unos "+eur(tot/meses_)+" al mes.":"."));
    const G={};if(I.porMaq){Object.entries(porMaq(L)).forEach(([k,g])=>{G[k]={eu:g.eu,n:g.n,m:g.m};});}else L.forEach(e=>{const g=G[e.fam]=G[e.fam]||{eu:0,n:0};g.eu+=e.eur;g.n++;});
    const R=Object.entries(G).filter(x=>x[1].eu>0).sort((a,b)=>b[1].eu-a[1].eu);
    if(I.porMaq&&R.length)res.insertBefore(el("div",{class:"banner",text:"La que más: "+R[0][0]+" ("+eur(R[0][1].eu)+(I.alMes&&meses_>1?", "+eur(R[0][1].eu/meses_)+" al mes":"")+")."}),res.children[2]||null);
    lista(I.porMaq?"Por máquina":"Por tipo",R.map(([k,g])=>it(k,g.n+(g.n===1?" apunte":" apuntes")+(tot?" · "+Math.round(g.eu/tot*100)+" %":""),eur(I.alMes&&meses_>1?g.eu/meses_:g.eu),I.alMes&&meses_>1?"al mes":null,g.m?()=>fichaIny(g.m):null)));
    const sinP=L.filter(e=>!e.eur&&e.fam!=="Reparación de ejes").length;if(sinP)nota(sinP+" apuntes son de artículos sin precio y no suman dinero.");return;}
}

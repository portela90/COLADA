/* ===== BASE DE DATOS: «todo sobre…», lo raro, personas y planificar =====
   intencionA2(q) va antes que intencionA; pintaIntA2 contesta. */
/* almacenes de los que habla: «en nave 2», «en la nave 1A», «en el almacén general», «en producción N1B» */
function almsQ(q){const C=cat.almacenes||[];let m=q.match(/\b(?:en|de) (?:la )?nave\s*(1a|1b|1|2)\b/);
  if(m){const n=m[1];const L=C.filter(a=>{const t=nq(a.nom+" "+(a.nave||""));return n==="1a"||n==="1b"?new RegExp("\\bn"+n+"\\b").test(t):n==="1"?/\bnave 1\b|\bn1/.test(t):/\bnave 2\b|\bn2\b/.test(t);});return L.length?{L,t:"Nave "+n.toUpperCase()}:null;}
  m=q.match(/\b(?:en|del?) (?:el )?almacen (?:de )?([a-z0-9 ]+?)(?:\s+(?:de|del|que|hay|tengo|tenemos)\b|$)/)||q.match(/\ben (?:el )?(general|produccion\s*n?\s*(?:1a|1b|2)|consumibles(?: n1)?|baldas)\b/);
  if(m){const w=nq(m[1]).split(" ").filter(x=>x&&!QSTOP.has(x));const L=C.filter(a=>w.length&&w.every(t=>reQ(raiz(t)).test(" "+nq(a.nom)+" ")));return L.length?{L,t:L.length===1?L[0].nom:L.map(a=>a.nom).join(", ")}:null;}
  return null;}
/* periodos que vienen: «para noviembre», «el mes que viene», «las próximas 3 semanas», «lo que queda de mes/año» */
function periodoFutA(q){const hy=hoy(),y=+hy.slice(0,4),mo=+hy.slice(5,7);const ini=(yy,mm)=>yy+"-"+String(mm).padStart(2,"0")+"-01",fin=(yy,mm)=>{const d=new Date(yy,mm,0);return yy+"-"+String(mm).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};let m;
  if(/\b(el )?mes que viene\b|\b(el )?(proximo|siguiente) mes\b/.test(q)){const yy=mo===12?y+1:y,mm=mo===12?1:mo+1;return{d:ini(yy,mm),h:fin(yy,mm),t:cap(MESES_Q[mm-1])+(yy!==y?" "+yy:""),re:/\b(el )?mes que viene\b|\b(el )?(proximo|siguiente) mes\b/};}
  if((m=q.match(/\b(?:las |los )?(?:proxim[oa]s|siguientes) (\d+) (dias?|semanas?|meses|mes)\b/))){const n=+m[1],u=m[2][0];return{d:hy,h:sumaDias(hy,u==="d"?n:u==="s"?n*7:n*30),t:"los próximos "+n+" "+(u==="d"?"días":u==="s"?"semanas":"meses"),re:/\b(las |los )?(proxim[oa]s|siguientes) \d+ (dias?|semanas?|meses|mes)\b/};}
  if(/\b(la )?(semana que viene|proxima semana|siguiente semana)\b/.test(q)){const w=(new Date(hy+"T12:00:00").getDay()+6)%7,d=sumaDias(hy,7-w);return{d,h:sumaDias(d,6),t:"la semana que viene",re:/\b(la )?(semana que viene|proxima semana|siguiente semana)\b/};}
  if(/\b(lo que queda de|resto del?|hasta (el )?fin(al)? de) (este )?mes\b|\bfin de mes\b/.test(q))return{d:hy,h:fin(y,mo),t:"lo que queda de mes",re:/\b(lo que queda de|resto del?|hasta (el )?fin(al)? de) (este )?mes\b|\bfin de mes\b/};
  if(/\b(lo que queda de|resto del?|hasta (el )?fin(al)? de) (este )?ano\b|\bfin de ano\b/.test(q))return{d:hy,h:y+"-12-31",t:"lo que queda de año",re:/\b(lo que queda de|resto del?|hasta (el )?fin(al)? de) (este )?ano\b|\bfin de ano\b/};
  if(/\b(el )?ano que viene\b|\b(el )?proximo ano\b/.test(q))return{d:(y+1)+"-01-01",h:(y+1)+"-12-31",t:"el año "+(y+1),re:/\b(el )?ano que viene\b|\b(el )?proximo ano\b/};
  const mi=MESES_Q.findIndex(x=>new RegExp("\\b"+x+"\\b").test(q));
  if(mi>=0){const ya=q.match(/\b(20\d\d)\b/);const yy=ya?+ya[1]:(mi+1<mo?y+1:y);if(yy<y||(yy===y&&mi+1<mo))return null;const d=yy===y&&mi+1===mo?hy:ini(yy,mi+1);
    return{d,h:fin(yy,mi+1),t:cap(MESES_Q[mi])+(yy!==y?" "+yy:""),re:new RegExp("\\b(en |de |para )?"+MESES_Q[mi]+"( de)?( 20\\d\\d)?\\b")};}
  return null;}
function intencionA2(q){const o={q,maq:maqDeQ(q),cod:codQ(q),nave:naveQA(q)};const M=(modo,x)=>Object.assign(o,{modo},x||{});
  if(/\bcompar\w*|\bfrente (al?|a los?)\b|\brespecto (al?|a los?)\b|\bcontra (el|la|los)\b|\bdesviaci\w*|\bdesvi[oa]\w*|\bmes a mes\b|\bevolucion\b|\bcon (los )?meses anteriores\b|\bcon la media\b|\bque el mes pasado\b|\b(mas|menos) que (el|la|los) (mes|meses|media|ano)\b|\bse (ha )?(disparado|desviado)\b/.test(q))return M("comparar");
  if(/\b(que|cuanto|cuantos|cuantas) (tengo|hay|tenemos|debo|debemos|necesito|necesitamos|hace falta|haria falta|habria) (que )?(pedir|comprar|traer)\b|\bque (necesito|necesitamos|hace falta|me hace falta|nos hace falta) (pedir |comprar )?(de|para)\b|\b(pedido|compras?) (de|para)\b/.test(q)){const P=periodoFutA(q);if(P)return M("pedirpara",{per:P});}
  if(/\bresumen (del|de este|de) mes\b|\bresumen mensual\b|\bcomo (ha ido|va) el mes\b/.test(q))return M("resumen");
  {const A=almsQ(q);if(A&&!QCO.test(q)&&!/\b(ultim|primer|cuando|quien)\b/.test(q)&&(!/\b(hornos?|maquinas?|inyectoras?|ejes?|modelos?|contenedor(es)?|moldes?)\b/.test(q)||/\b(recambios?|repuestos?|piezas?) de hornos?\b/.test(q)))return M("stockalm",{alms:A.L,almT:A.t});}
  if(/\bpresupuesto\b|\bcuanto (cuesta|costaria|costarian|vale|valdria|valdrian|sale|saldria)n? (un pedido|pedir|comprar|traer)\b|\bcuanto (cuestan|costarian|valen|valdrian) \d+/.test(q))return M("presupuesto");
  if(/\bejes?\b/.test(q)&&/\b(importe|coste|costes|valor|cuesta|cuestan|costara|costaran|dinero|euros|presupuesto|cuanto (vale|valen|va|van))\b/.test(q)&&/\b(taller|reparacion\w*|reparar|pendientes?|arreglar)\b/.test(q))return M("tallereur");
  if(/\b(precio|precios) (de|del|de los|de las)\b|\bcuanto (cuesta|cuestan|vale|valen) (un|una|el|la|los|las)\b/.test(q)&&!/\bstock\b|\bque (tengo|hay|tenemos)\b/.test(q))return M("precioart");
  if(/\brob(o|os|ad[oa]s?|aron|ado)\b|\bhurt\w*|\bdesaparecid\w*|\bperdid[oa]s?\b|\bperdidas\b|\bmermas?\b|\bdescuadres?\b|\bfaltaba\w*\b.*\brecuento|\brecuentos?\b.*\b(falta\w*|menos)\b/.test(q))return M("perdidas",{robo:/\brob|\bhurt/.test(q)});
  if(/\b(todo (sobre|de|lo de)|ficha (de|completa)|informacion (de|sobre)|dime todo|resumen de)\b/.test(q)){
    if(/\bejes?\b/.test(q))return M("todoeje",{txt:q.replace(/.*\beje\b/,"").trim()});
    if(o.cod)return M("todomaq");
    return M("todoart");}
  if(/\b(mas de lo normal|mas que de costumbre|se ha disparado|anormal\w*|fuera de lo normal|raro)\b/.test(q))return M("anomalia");
  if(/\b(antes de tiempo|duran? poco|se rompen? pronto|cambiad\w* muy pronto)\b/.test(q))return M("prematuro");
  if(/\bejes?\b.*\b(vuelven?|repiten?|se repite|otra vez|por lo mismo)\b|\bmismo (motivo|fallo|desperfecto)\b/.test(q))return M("repite");
  if(/\bsin (responsable|nombre|quien|motivo|maquina)\b|\bno consta (quien|el motivo)\b/.test(q))return M("sindato",{que:/\bmotivo\b/.test(q)?"motivo":/\bmaquina\b/.test(q)?"maquina":"resp"});
  if(/\bquien (cambia|cambio|hace|ha hecho|saca|ha sacado|gasta|repara|apunta) mas\b/.test(q))return M("rewev",{rewev:q.replace(/\bquien\b/," ")+" por quien"});
  if(/\b(que ha hecho|que hizo|lo que ha hecho|que ha apuntado|que ha sacado|que ha cambiado)\b/.test(q))return M("persona",{nom:q.replace(/\b(que|ha|hecho|hizo|lo|apuntado|sacado|cambiado|este|esta|mes|semana|hoy|ayer|ano|el|la|pasado|en|de|por)\b/g," ").replace(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|20\d\d)\b/g," ").trim()});
  if(/\bque (tengo|hay|tenemos) que pedir\b|\bque pido\b|\blista (de|para) (compras|pedir|pedido)\b|\bpedido (de la|esta) semana\b/.test(q))return M("pedirsemana");
  if(/\b(cuanto|que) (me |nos )?(voy|vamos|va) a gastar\b|\bmes que viene\b|\bproximo mes\b|\bprevision de gasto\b/.test(q))return M("mesquviene");
  if(/\bejes?\b.*\b(faltar|faltan|van a faltar|me faltan|pocos|reserva)\b/.test(q))return M("ejesfaltan");
  return null;}

function pintaIntA2(I,res,pon){const h=hoy(),q=I.q,P=periodoQ(q);
  const add=n=>{if(n)res.appendChild(n);return n;},frase=t=>add(el("p",{class:"bd-resp",text:t})),nota=t=>add(el("p",{class:"hint",style:"margin:8px 2px",text:t}));
  const ent=(t,extra)=>add(el("div",{class:"bd-ent"},[el("span",{class:"sub",text:"Buscando en "}),el("b",{text:t})].concat((extra||[]).filter(Boolean).map(x=>el("span",{class:"pill info",text:x})))));
  const lista=(tit,items,sub)=>add(el("section",{class:"card"},[tit?el("div",{class:"hd"},[el("h2",{text:tit}),sub?el("span",{class:"der sub",text:sub}):null]):null,el("div",{class:"lst"},items)]));
  const it=(t1,t2,b,small,on,stripe)=>el(on?"button":"div",{type:on?"button":null,class:"it",style:on?null:"cursor:default",onclick:on||null},[stripe?el("span",{class:"stripe "+stripe}):null,
    el("div",{class:"ppal"},[el("div",{class:"t1",text:t1})].concat((Array.isArray(t2)?t2:[t2]).filter(Boolean).map(x=>el("div",{class:"t2",text:x})))),b!=null?el("div",{class:"cant num"},[el("b",{text:b}),small?el("small",{text:small}):null]):null]);
  const ign=L=>{if(L&&L.length)nota("No he encontrado «"+L.join("», «")+"», así que no lo he tenido en cuenta.");};
  const kv=(tit,filas)=>add(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:tit})),el("div",{class:"bd"},el("dl",{class:"bd-kv"},[].concat(...filas.filter(Boolean).map(([k,v])=>[el("dt",{text:k}),el("dd",{text:v})]))))]));
  const copiar=(t,txt)=>add(el("button",{type:"button",class:"btn sec",style:"margin-top:8px",text:t,onclick:async e=>{try{await navigator.clipboard.writeText(txt);toast("Copiado: pégalo donde quieras");}catch(er){dlg("Para copiar",[el("textarea",{style:"width:100%;min-height:220px",text:txt})],[{t:"Cerrar",cls:"sec"}]);}}}));
  const y0=h.slice(0,4)+"-01-01",ano=e=>e.f>=y0;const EV=evTodo();
  const pistM=id=>todosPist().filter(p=>p.maq===id);

  const copiarT=(t,txt)=>add(el("button",{type:"button",class:"btn",style:"margin-top:8px",text:t,onclick:async()=>{try{await navigator.clipboard.writeText(txt);toast("Copiado: pégalo en el correo");}catch(e){dlg(t,[el("textarea",{style:"width:100%;min-height:240px",text:txt})],[{t:"Cerrar",cls:"sec"}]);}}}));
  const ponPrecio=(L,msg)=>add(el("div",{class:"banner w"},[el("div",{text:msg}),el("button",{type:"button",class:"btn sec peq",style:"margin-top:8px",text:"Poner precios",onclick:()=>preciosArts(L,()=>setTimeout(()=>pon(q,true),300))})]));
  if(I.modo==="stockalm"){const ids=new Set(I.alms.map(a=>a.id)),q2=q.replace(/\b(?:en|de) (?:la )?nave\s*(1a|1b|1|2)\b/," ").replace(/\b(almacen|general|produccion|n1a|n1b|n2|n1|consumibles|baldas)\b/g," ").replace(/\bespecial(es)?\b/g,"esp");
    const S=artsQ(q2),L=S.L.map(a=>{const x=SM[a.id]||{},por=I.alms.map(al=>[al,x[al.id]||0]).filter(z=>Math.abs(z[1])>0.001),st=por.reduce((s,z)=>s+z[1],0);return{a,st,por,va:(a.alms||[]).some(id=>ids.has(id))};})
      .filter(x=>Math.abs(x.st)>0.001||(S.fam&&x.va)).sort((a,b)=>String(a.a.diam||a.a.desc).localeCompare(String(b.a.diam||b.a.desc),"es",{numeric:true}));
    ent("lo que hay en "+I.almT,[S.fam?[...new Set(S.L.map(famLbl))].slice(0,3).join(", "):null]);ign(S.ign);
    if(!L.length){frase("En "+I.almT+" no hay nada de eso.");return;}
    const pist=L.every(x=>x.a.fam==="piston"),tot=L.reduce((s,x)=>s+Math.max(0,x.st),0);
    if(!(tot>0)){frase("En "+I.almT+" no hay "+(pist?"ningún pistón"+(L.length<=3?" de "+L.map(x=>x.a.diam).join(", "):""):"nada de eso")+".");}else
    frase("En "+I.almT+(pist?" hay "+fmtN(tot)+(tot===1?" pistón":" pistones")+": "+L.filter(x=>x.st>0).map(x=>x.a.diam+": "+fmtN(x.st)).join(" · ")+(L.some(x=>x.st<=0)?". Sin ninguno: "+L.filter(x=>x.st<=0).map(x=>x.a.diam).join(", "):""):" hay "+L.filter(x=>x.st>0).length+" artículos con stock")+".");
    lista(null,L.map(x=>it(nomArt(x.a),[I.alms.length>1&&x.por.length?x.por.map(([al,n])=>al.nom.replace(/^Almacén (de )?/,"")+": "+fmtN(Math.round(n*10)/10)).join(" · "):null,"En total (todos los almacenes): "+fmtN(Math.round(stockDe(x.a.id)*10)/10)],fmtN(Math.round(x.st*10)/10),x.a.ud||"ud",()=>ficha(x.a),x.st<=0?"bad":nivel(x.a)==="bad"?"warn":"")));
    if(L.some(x=>x.st<0))nota("Un número negativo quiere decir que se ha sacado más de lo que constaba en ese almacén: falta apuntar un traslado o un recuento.");return;}
  if(I.modo==="presupuesto"){const q2=q.replace(/\bespecial(es)?\b/g,"esp").replace(/\b(presupuesto|dame|dime|hazme|haz|un|una|unos|unas|de|del|para|pedido|pedir|comprar|traer|cuanto|cuesta|cuestan|costaria|costarian|vale|valen|valdria|valdrian|sale|saldria|aproximadamente|mas o menos|sobre)\b/g," ");
    const trozos=q2.split(/\s(?:y|,|mas)\s|,/).map(t=>t.trim()).filter(Boolean),L=[],mal=[];
    trozos.forEach(t=>{const m=t.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(pistones|piston|uds?|unidades|kg|kilos|litros|l|bidones|cajas|rollos|pares)?(?=\s|$)/);let n=null,rest=t;
      if(m){const cand=t.match(/(\d+(?:[.,]\d+)?)\s*(pistones|piston|uds?|unidades|kg|kilos|litros|bidones|cajas|rollos|pares)\b/);const pick=cand||m;n=parseN(pick[1]);rest=t.replace(pick[0]," "+(pick[2]&&/piston/.test(pick[2])?"piston":"")+" ");}
      const S=artsQ(rest);if(n>0&&S.L.length===1)L.push({a:S.L[0],n});else mal.push({t,n,L:S.L});});
    ent("presupuesto");
    if(!L.length){frase("Dime qué y cuánto, por ejemplo «presupuesto de 15 pistones de 100 especial» o «presupuesto de 20 kg de taladrina y 10 guantes».");
      mal.filter(x=>x.L.length>1&&x.L.length<=10).forEach(x=>add(el("div",{class:"chips"},x.L.map(a=>el("button",{type:"button",class:"chip",text:nomArt(a),onclick:()=>pon("presupuesto de "+(x.n||1)+" "+nomArt(a))})))));return;}
    const tot=L.reduce((s,x)=>s+x.n*precioDe(x.a),0),sinP=L.filter(x=>!precioDe(x.a));
    frase("Presupuesto: "+(tot?eur(tot):"sin valorar")+(sinP.length&&tot?" (falta el precio de "+sinP.length+")":"")+", sin IVA.");
    lista(null,L.map(x=>{const p=precioDe(x.a),c=consDia(x.a),st=stockDe(x.a.id);return it(fmtN(x.n)+" × "+nomArt(x.a),[p?eur(p)+" / "+(x.a.ud||"ud"):"Sin precio",(provN(x.a.prov)?provN(x.a.prov)+" · ":"")+(plazoArt(x.a)?"plazo "+plazoArt(x.a)+" días · ":"")+"hay "+fmtN(Math.round(st*10)/10)+(c>0?" · con el pedido, para "+diasTxt(Math.floor((st+x.n)/c)):"")],p?eur(x.n*p):"—",null,()=>ficha(x.a),p?"":"warn");}),tot?eur(tot):null);
    if(mal.length)nota("No he sabido qué es «"+mal.map(x=>x.t).join("», «")+"»: escribe la cantidad y el artículo, por ejemplo «10 de 80».");
    if(sinP.length)ponPrecio(sinP.map(x=>x.a),"Sin precio: "+sinP.map(x=>nomArt(x.a)).join(", ")+".");
    copiarT("Copiar el presupuesto",["PRESUPUESTO · "+fmtF(h)].concat(L.map(x=>{const p=precioDe(x.a);return"- "+fmtN(x.n)+" "+(x.a.ud||"ud")+" "+nomArt(x.a)+(x.a.cod?" ["+x.a.cod+"]":"")+" × "+(p?eur(p):"sin precio")+" = "+(p?eur(x.n*p):"—")+(provN(x.a.prov)?" · "+provN(x.a.prov):"");})).concat(["TOTAL (sin IVA): "+(tot?eur(tot):"—")]).join("\n"));
    nota("Con los precios del catálogo. Si el proveedor te ha dado otro precio, cámbialo en la ficha del artículo.");return;}
  if(I.modo==="tallereur"){const L=ejes.filter(e=>["reparacion","devuelto","preparado"].includes(e.estado)).map(e=>{const md=modelo(e.mod),p=md?+md.precioRep||0:0,r=abiertaDe(e.cod);return{e,md,p,r,d:r&&r.env?diasAb(r):null};}).sort((a,b)=>b.p-a.p);
    const tal=L.filter(x=>x.e.estado!=="preparado"),pre=L.filter(x=>x.e.estado==="preparado"),sT=tal.reduce((s,x)=>s+x.p,0),sP=pre.reduce((s,x)=>s+x.p,0);ent("importe de los ejes en reparación");
    if(!L.length){frase("No hay ningún eje en el taller ni preparado para enviar.");return;}
    frase(tal.length+(tal.length===1?" eje en el taller: ":" ejes en el taller: ")+eur(sT)+(pre.length?" · "+pre.length+(pre.length===1?" preparado para enviar: ":" preparados para enviar: ")+eur(sP)+" · total "+eur(sT+sP):"")+".");
    const G={};L.forEach(x=>{const k=x.md?x.md.ref:x.e.mod;const g=G[k]=G[k]||{n:0,v:0,p:x.p};g.n++;g.v+=x.p;});
    lista("Por modelo",Object.entries(G).sort((a,b)=>b[1].v-a[1].v).map(([k,g])=>it(k,g.n+(g.n===1?" eje":" ejes")+" × "+(g.p?eur(g.p):"sin precio"),eur(g.v),null)));
    lista("Cada eje",L.map(x=>it(x.e.cod+" · "+(x.md?x.md.ref:x.e.mod),[(EST_E[x.e.estado]||[x.e.estado])[0]+(x.r&&x.r.env?" desde el "+fmtF(x.r.env)+" ("+x.d+" días lab.)":""),x.r&&x.r.desp?motivoRep(x.r.desp):null],x.p?eur(x.p):"—",null,()=>fichaEje(x.e),x.d!=null&&x.d>ROJO?"bad":x.d!=null&&x.d>AMBAR?"warn":"")));
    copiarT("Copiar el informe",["EJES EN REPARACIÓN · "+fmtF(h)].concat(L.map(x=>"- "+x.e.cod+" ("+(x.md?x.md.ref:x.e.mod)+") · "+(EST_E[x.e.estado]||[x.e.estado])[0]+(x.r&&x.r.env?" desde "+fmtF(x.r.env):"")+" · "+(x.p?eur(x.p):"sin precio"))).concat(["En el taller: "+tal.length+" · "+eur(sT),pre.length?"Preparados para enviar: "+pre.length+" · "+eur(sP):null,"TOTAL: "+eur(sT+sP)].filter(Boolean)).join("\n"));
    nota("Importe al precio de reparación de cada modelo (Ejes › modelo). La factura real puede variar.");return;}
  if(I.modo==="precioart"){const S=artsQ(q.replace(/\bespecial(es)?\b/g,"esp").replace(/\b(precio|precios|cuanto|cuesta|cuestan|vale|valen)\b/g," "));ent("precios");
    if(!S.L.length||S.L.length===artsActivos().filter(a=>a.fam!=="eje").length){frase("Dime de qué, por ejemplo «precio de los pistones» o «cuánto cuesta un pistón de 80».");return;}
    const L=S.L.slice(0,40),sinP=L.filter(a=>!precioDe(a));
    frase(L.length===1?nomArt(L[0])+": "+(precioDe(L[0])?eur(precioDe(L[0]))+" / "+(L[0].ud||"ud")+(provN(L[0].prov)?" ("+provN(L[0].prov)+")":"")+".":"no tiene precio puesto."):L.length+" artículos"+(sinP.length?", "+sinP.length+" sin precio":"")+".");
    lista(null,L.map(a=>it(nomArt(a),provN(a.prov)||null,precioDe(a)?eur(precioDe(a)):"—",precioDe(a)?"/ "+(a.ud||"ud"):"sin precio",()=>ficha(a),precioDe(a)?"":"warn")));
    if(sinP.length)ponPrecio(sinP,sinP.length===1?"No tiene precio.":"Hay "+sinP.length+" sin precio.");return;}
  if(I.modo==="perdidas"){const per=P.def?{d:"0000-00-00",h,t:"todo el historial"}:P,fs=artsQ(q),ids=new Set(fs.fam?fs.L.map(a=>a.id):artsActivos().map(a=>a.id));
    const L=todosMov().filter(m=>m.tipo==="ajuste"&&(+m.cant||0)<0&&m.f>=per.d&&m.f<=per.h&&ids.has(m.art)&&(!I.robo||/\brob|\bhurt/i.test(m.nota||""))).map(m=>{const a=art(m.art),c=-(+m.cant||0),p=precioDe(a);return{m,a,c,p,v:c*p,inc:(m.nota||"Recuento").replace(/\s*\(.*\)\s*$/,"")+"|"+m.f};});
    const tit=I.robo?"pistones y material robado":"lo que ha faltado en los recuentos";ent(tit,[per.t,fs.fam?"solo "+[...new Set(fs.L.map(famLbl))].join(", "):null]);
    if(!L.length){frase(I.robo?"No hay ningún robo apuntado"+(per.todo||P.def?"":" en "+per.t)+". Para que salga aquí, apúntalo como recuento con la nota «Robo» (lo que había y lo que queda).":"En los recuentos no ha faltado nada en "+per.t+".");return;}
    const tot=L.reduce((s,x)=>s+x.v,0),uds=L.reduce((s,x)=>s+x.c,0),sinP=L.filter(x=>!x.p),inc={};L.forEach(x=>{(inc[x.inc]=inc[x.inc]||[]).push(x);});
    frase((I.robo?"Robado: ":"Ha faltado: ")+fmtN(uds)+" unidades"+(tot?" con un valor de "+eur(tot):"")+(sinP.length?(tot?" (más ":" (")+sinP.length+(sinP.length===1?" artículo sin precio)":" artículos sin precio)"):"")+", en "+Object.keys(inc).length+(Object.keys(inc).length===1?" vez.":" veces."));
    const txt=["INFORME · "+(I.robo?"MATERIAL ROBADO":"MATERIAL QUE HA FALTADO EN RECUENTOS"),"Fecha del informe: "+fmtF(h)+" · Periodo: "+per.t,""];
    Object.entries(inc).sort((a,b)=>b[0].split("|")[1].localeCompare(a[0].split("|")[1])).forEach(([k,xs])=>{const[nt,f]=k.split("|"),v=xs.reduce((s,x)=>s+x.v,0),n=xs.reduce((s,x)=>s+x.c,0);
      lista(nt+" · "+fmtF(f),xs.sort((a,b)=>b.v-a.v||b.c-a.c).map(x=>it(nomArt(x.a),[almN(x.m.alm)+" · había "+fmtN(x.m.teorico!=null?x.m.teorico:x.c)+", quedan "+fmtN(x.m.contado!=null?x.m.contado:0),x.p?eur(x.p)+" / "+(x.a.ud||"ud"):"sin precio"],fmtN(x.c),x.p?eur(x.v):(x.a.ud||"ud"),()=>ficha(x.a),x.p?"bad":"warn")),fmtN(n)+" uds"+(v?" · "+eur(v):""));
      txt.push(nt.toUpperCase()+" ("+fmtF(f)+")");xs.forEach(x=>txt.push("- "+nomArt(x.a)+(x.a.cod?" ["+x.a.cod+"]":"")+": "+fmtN(x.c)+" "+(x.a.ud||"ud")+" × "+(x.p?eur(x.p):"sin precio")+" = "+(x.p?eur(x.v):"—")+" · "+almN(x.m.alm)));txt.push("  Subtotal: "+fmtN(n)+" uds"+(v?" · "+eur(v):""),"");});
    txt.push("TOTAL: "+fmtN(uds)+" unidades"+(tot?" · "+eur(tot):"")+(sinP.length?" (sin valorar: "+sinP.map(x=>nomArt(x.a)).join(", ")+")":""));
    if(sinP.length)add(el("div",{class:"banner w"},[el("div",{text:"Hay "+sinP.length+(sinP.length===1?" artículo sin precio: ":" artículos sin precio: ")+"su valor no se suma."}),el("button",{type:"button",class:"btn sec peq",style:"margin-top:8px",text:"Poner precios",onclick:()=>preciosArts([...new Map(sinP.map(x=>[x.a.id,x.a])).values()],()=>setTimeout(()=>pon(q,true),300))})]));
    add(el("div",{class:"acciones",style:"margin-top:8px"},[el("button",{type:"button",class:"btn",text:"Copiar el informe",onclick:async()=>{try{await navigator.clipboard.writeText(txt.join("\n"));toast("Informe copiado: pégalo en el correo");}catch(e){dlg("Informe",[el("textarea",{style:"width:100%;min-height:260px",text:txt.join("\n")})],[{t:"Cerrar",cls:"sec"}]);}}}),
      el("button",{type:"button",class:"btn sec",text:"Excel",onclick:async e=>{const b=e.currentTarget;if(!downloads){toast("Esta vista no permite descargar archivos");return;}b.disabled=true;try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();
        X.utils.book_append_sheet(wb,X.utils.json_to_sheet(L.map(x=>({"Fecha":x.m.f,"Motivo":x.inc.split("|")[0],"Artículo":nomArt(x.a),"Código":x.a.cod||"","Almacén":almN(x.m.alm),"Cantidad":x.c,"Unidad":x.a.ud||"ud","Precio (€)":x.p||"","Valor (€)":x.p?Math.round(x.v*100)/100:""}))),I.robo?"Robado":"Faltas");
        await downloads.save({filename:(I.robo?"Robo":"Faltas")+"_"+h+".xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Excel descargado");}catch(er){toast(er&&er.code==="declined"?"Descarga cancelada":"No se pudo crear el Excel");}b.disabled=false;}})]));
    nota("Sale de los recuentos que dejan menos de lo que había. Para un robo, apúntalo como recuento y escribe «Robo» en la nota: así se separa de los descuadres normales. El valor es al precio actual del catálogo.");return;}
  if(I.modo==="todomaq"){const m=I.maq;if(!m){ent("máquina",[I.cod]);frase("No encuentro la máquina "+I.cod+".");return;}
    const hd=hoyDe(m),ej=ejeEnMaq(m.cod),ps=pistM(m.id).filter(p=>p.f>=y0),u=ultimoPist(m.id),fs=[...new Set(pistM(m.id).map(p=>p.f))].sort(),iv=fs.slice(1).map((f,i)=>dias(fs[i],f));
    const E=EV.filter(e=>{const x=mqEv(e);return x&&x.id===m.id;}),Ea=E.filter(ano),eu=Ea.reduce((s,e)=>s+e.eur,0),G={};Ea.forEach(e=>{G[e.fam]=(G[e.fam]||0)+e.eur;});
    const reps=todasRep().filter(r=>r.env&&r.res!=="anulada"&&(r.maq===m.cod||r.maq===m.id)),repA=reps.filter(r=>r.env>=y0);
    const ultQ=E.slice().sort((a,b)=>(b.f+String(b.ts).padStart(15,"0")).localeCompare(a.f+String(a.ts).padStart(15,"0"))).find(e=>e.quien);
    ent("todo sobre",[m.cod]);frase(m.cod+" ("+zonaDe(m)+"): este año lleva "+ps.length+(ps.length===1?" cambio de pistón":" cambios de pistón")+", "+repA.length+(repA.length===1?" reparación de eje":" reparaciones de eje")+" y "+eur(eu)+" gastados.");
    kv("Lo que monta ahora",[["Molde",moldeTxt(moldeDe(hd.molde))||"—"],["Contenedor",(contDe(hd.cont)||{}).cod||"—"],["Eje",ej?ej.cod+" · "+ejeRef(ej):"—"],["Pistón",diamDe(m)||"—"],["Horno",[hornoTxt(m),hornoFabTxt(m)].filter(Boolean).join(" · ")||"—"]]);
    kv("Pistones",[["Último cambio",u?fmtF(u.f)+" ("+hace(dias(u.f,h))+") · "+u.diam+(u.resp?" · "+respTxt(u.resp):""):"—"],["Dura de media",iv.length?fmtN(Math.round(iv.reduce((s,x)=>s+x,0)/iv.length))+" días":"—"],["Cambios este año",String(ps.length)]]);
    lista("Gasto de este año",Object.entries(G).sort((a,b)=>b[1]-a[1]).map(([k,v])=>it(k,null,eur(v),null)),eur(eu));
    if(reps.length)lista("Reparaciones de eje",reps.slice(-6).reverse().map(r=>it(r.eje+" · "+fmtF(r.env),[motivoRep(r.desp),r.res==="ok"&&r.rec?"Volvió el "+fmtF(r.rec):"En el taller"],null,null)));
    if(ultQ)nota("Lo último apuntado en esta máquina: "+ultQ.ref+" el "+fmtF(ultQ.f)+", por "+ultQ.quien+".");
    add(el("button",{type:"button",class:"btn",style:"margin-top:8px",text:"Abrir la ficha de la "+m.cod,onclick:()=>fichaIny(m)}));return;}

  if(I.modo==="todoeje"){const w=I.txt.replace(/\b(de|del|la|el|sobre|todo)\b/g," ").split(" ").filter(Boolean);const e=ejes.find(x=>w.length&&w.every(t=>reQ(t).test(" "+nq(x.cod)+" ")))||ejes.find(x=>w.length&&w.every(t=>reQ(t).test(" "+nq(x.cod+" "+ejeRef(x))+" ")));
    ent("todo sobre el eje",w);if(!e){frase("No encuentro ese eje. Escribe su código, por ejemplo «todo sobre el eje 2.8.J-2».");return;}
    const rs=repsDe(e.cod).filter(r=>r.res!=="anulada"&&!r.recuento),iv=[];for(let i=1;i<rs.length;i++){const a=rs[i-1];if(a.rec&&rs[i].env&&a.rec<rs[i].env)iv.push(dias(a.rec,rs[i].env));}
    const eu=rs.reduce((s,r)=>s+(r.res==="ok"&&r.rec?costeRep(r).v:0),0),maqs=[...new Set(rs.map(r=>r.maq).concat([e.maq]).filter(Boolean).map(x=>(cat.maquinas.find(m=>m.id===x)||{}).cod||x))];
    frase("El eje "+e.cod+" ("+ejeRef(e)+") "+(e.estado==="planta"?(e.maq?"está puesto en la "+e.maq:"está en planta, de reserva"):"está "+(EST_E[e.estado]||[e.estado])[0].toLowerCase())+". Ha ido "+rs.length+(rs.length===1?" vez":" veces")+" al taller"+(eu?" ("+eur(eu)+")":"")+".");
    kv("Datos",[["Modelo",ejeRef(e)],["Vale para",maqsDeEje(e).join(", ")||"—"],["Ha estado en",maqs.join(", ")||"—"],["Aguanta entre reparaciones",iv.length?fmtN(Math.round(iv.reduce((s,x)=>s+x,0)/iv.length))+" días de media":"—"]]);
    if(rs.length)lista("Reparaciones",rs.slice().reverse().map(r=>it(fmtF(r.env)+(r.rec?" → "+fmtF(r.rec):""),[motivoRep(r.desp),(r.desp||"").trim()&&gNorm(r.desp)!==gNorm(motivoRep(r.desp))?r.desp:null,r.por?"Lo apuntó "+r.por:null],r.res==="ok"&&r.rec?eur(costeRep(r).v):"—",r.res==="ok"?"":r.res?cap(r.res):"en taller")));
    add(el("button",{type:"button",class:"btn",style:"margin-top:8px",text:"Abrir la ficha del eje",onclick:()=>fichaEje(e)}));return;}

  if(I.modo==="todoart"){const S=artsQ(q);const L=S.L;ent("todo sobre",S.ign.length?null:[]);
    if(!L.length||L.length>6){frase(L.length?"Hay "+L.length+" artículos que encajan: afina un poco más (por ejemplo «todo sobre el pistón de 80»).":"No encuentro ese artículo.");if(L.length)add(el("div",{class:"chips"},L.slice(0,12).map(a=>el("button",{type:"button",class:"chip",text:nomArt(a),onclick:()=>pon("todo sobre "+nomArt(a))}))));return;}
    L.forEach(a=>{const st=stockDe(a.id),dq=diasQuedan(a),c=consDia(a),porAlm=Object.entries(SM[a.id]||{}).filter(x=>Math.abs(x[1])>0.001);
      const sal=todosMov().filter(m=>m.tipo==="salida"&&m.art===a.id&&m.f>=sumaDias(h,-365)),G={};sal.forEach(m=>{const k=m.maq?maqN(m.maq):(m.nave||"Sin máquina");G[k]=(G[k]||0)+(+m.cant||0);});
      const U=a.fam==="piston"?puEstado():null,ud=a.ud||"ud";
      frase(nomArt(a)+": hay "+fmtN(Math.round(st*10)/10)+" "+ud+(dq!=null?", para "+diasTxt(dq):"")+(a.pedido?"; pedido el "+fmtF(a.pedido):"")+".");
      kv(nomArt(a),[["Estado",nivTxt(a)],["Mínimo / punto de pedido",fmtN(+a.min||0)+" / "+fmtN(Math.round(puntoPedido(a)*10)/10)],["Gasta",c?fmtN(Math.round(c*30.4*10)/10)+" "+ud+" al mes":"sin consumo en 60 días"],
        ["Precio",precioDe(a)?eur(precioDe(a))+" · stock "+eur(st*precioDe(a)):"sin precio"],["Proveedor",provN(a.prov)||"—"],U&&a.diam&&U.S[a.diam]?["Usados",["Z","R","M","C"].map(b=>({Z:"zona ",R:"recuperar ",M:PU_REC+" ",C:"chatarra "}[b])+U.S[a.diam][b]).join(" · ")]:null]);
      if(porAlm.length)lista("Por almacén",porAlm.sort((x,y)=>y[1]-x[1]).map(([al,n])=>it(almN(al),null,fmtN(Math.round(n*10)/10),ud)));
      const GL=Object.entries(G).sort((x,y)=>y[1]-x[1]);if(GL.length)lista("Dónde se ha gastado (12 meses)",GL.slice(0,10).map(([k,n])=>it(k,null,fmtN(Math.round(n*10)/10),ud)));
      add(el("button",{type:"button",class:"btn",style:"margin:8px 0",text:"Abrir la ficha",onclick:()=>ficha(a)}));});return;}

  if(I.modo==="anomalia"){const mes=h.slice(0,7),dHoy=+h.slice(8,10),prev=[];for(let i=1;i<=6;i++){const d=new Date(+mes.slice(0,4),+mes.slice(5,7)-1-i,1);prev.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));}
    const fs=famEvQ(q),E=EV.filter(e=>famCasa(e,fs));const G={};E.forEach(e=>{const m=mqEv(e);if(!m)return;const k=m.cod,mm=e.f.slice(0,7);const g=G[k]=G[k]||{m,act:0,ant:{}};const v=e.eur||(contable(e.ud)?e.cant:0);if(mm===mes)g.act+=v;else if(prev.includes(mm))g.ant[mm]=(g.ant[mm]||0)+v;});
    const R=Object.values(G).map(g=>{const med=prev.reduce((s,mm)=>s+(g.ant[mm]||0),0)/6,esp=med*dHoy/30.4;return Object.assign(g,{med,esp,ratio:esp>0?g.act/esp:(g.act>0?9:0)});}).filter(g=>g.act>0&&g.ratio>=1.5&&g.act-g.esp>(fs?0:50)).sort((a,b)=>b.ratio-a.ratio);
    ent("máquinas que gastan más de lo normal",[fs?fs.join(", "):null,"este mes"]);
    frase(R.length?R.length+(R.length===1?" máquina gasta":" máquinas gastan")+" este mes más de lo normal. La que más, la "+R[0].m.cod+": "+eur(R[0].act)+" cuando lo normal a estas alturas sería "+eur(R[0].esp)+".":"Ninguna máquina está gastando este mes más de lo normal.");
    if(R.length)lista(null,R.map(g=>it(g.m.cod,["Normal a día "+dHoy+": "+eur(g.esp)+" (media de 6 meses: "+eur(g.med)+"/mes)"],"×"+fmtN(Math.round(g.ratio*10)/10),eur(g.act),()=>pon("todo sobre la "+g.m.cod),g.ratio>=2.5?"bad":"warn")));
    nota("Se compara lo de este mes con la media de los 6 meses anteriores, en proporción a los días que van de mes. Cuenta euros (pistones, reparaciones de eje y consumibles con precio).");return;}

  if(I.modo==="prematuro"){const R=[];cat.maquinas.forEach(m=>{const fs=[...new Set(pistM(m.id).map(p=>p.f))].sort();if(fs.length<4)return;const iv=fs.slice(1).map((f,i)=>({f,d:dias(fs[i],f)}));const med=iv.reduce((s,x)=>s+x.d,0)/iv.length;
      iv.forEach(x=>{if(x.f>=sumaDias(h,-365)&&x.d<med*0.5){const p=pistM(m.id).find(z=>z.f===x.f);R.push({m,f:x.f,d:x.d,med,p});}});});
    R.sort((a,b)=>b.f.localeCompare(a.f));ent("pistones cambiados antes de tiempo",["12 meses"]);
    frase(R.length?R.length+(R.length===1?" cambio se ha hecho":" cambios se han hecho")+" en menos de la mitad de lo que dura normalmente un pistón en esa máquina.":"Ningún pistón se ha cambiado mucho antes de lo normal en los últimos 12 meses.");
    if(R.length)lista(null,R.slice(0,40).map(x=>it(x.m.cod+" · "+fmtF(x.f),[(x.p?x.p.diam+" · ":"")+(x.p&&x.p.motivo?cap(x.p.motivo):"sin motivo")+(x.p&&x.p.resp?" · "+respTxt(x.p.resp):""),"Lo normal ahí: "+fmtN(Math.round(x.med))+" días"],fmtN(x.d),x.d===1?"día":"días",()=>pon("todo sobre la "+x.m.cod),"warn")));
    nota("Solo máquinas con 4 cambios o más, para que la media sirva.");return;}

  if(I.modo==="repite"){const G={};todasRep().filter(r=>r.env&&r.res!=="anulada"&&!r.recuento).forEach(r=>{const k=r.eje+"|"+motivoRep(r.desp);(G[k]=G[k]||[]).push(r);});
    const R=Object.entries(G).filter(x=>x[1].length>=2&&!/sin indicar|otros/i.test(x[0].split("|")[1])).sort((a,b)=>b[1].length-a[1].length);ent("ejes que vuelven al taller por lo mismo");
    frase(R.length?R.length+(R.length===1?" eje ha vuelto":" ejes han vuelto")+" al taller por el mismo motivo. El que más: el "+R[0][0].split("|")[0]+" ("+R[0][1].length+" veces por «"+R[0][0].split("|")[1].toLowerCase()+"»).":"Ningún eje ha vuelto al taller dos veces por el mismo motivo.");
    if(R.length)lista(null,R.map(([k,rs])=>{const[cod,mot]=k.split("|"),e=ejes.find(x=>x.cod===cod);return it(cod+" · "+mot,rs.map(r=>fmtF(r.env)).join(", "),String(rs.length),"veces",e?()=>pon("todo sobre el eje "+cod):null,rs.length>=3?"bad":"warn");}));return;}

  if(I.modo==="sindato"){const per=P.def?{d:sumaDias(h,-90),h,t:"últimos 90 días"}:P;const L=I.que==="maquina"?EV.filter(e=>e.fam!=="Reparación de ejes"&&!e.maq&&!e.nave):I.que==="motivo"?SECC.pist.ev().map(e=>Object.assign({fam:"Pistones"},e)).filter(e=>!e.txt||e.txt==="—"):EV.filter(e=>!e.quien);
    const R=L.filter(e=>e.f>=per.d&&e.f<=per.h).sort((a,b)=>b.f.localeCompare(a.f));const que={resp:"sin responsable",motivo:"cambios de pistón sin motivo",maquina:"consumos sin máquina ni nave"}[I.que];
    ent("apuntes "+que,[per.t]);frase(R.length?R.length+(R.length===1?" apunte ":" apuntes ")+que+" en "+per.t+".":"Ningún apunte "+que+" en "+per.t+".");
    if(R.length){const G={};R.forEach(e=>{G[e.fam]=(G[e.fam]||0)+1;});nota("Por tipo: "+Object.entries(G).map(([k,n])=>k+" "+n).join(" · "));
      lista(null,R.slice(0,80).map(e=>it(e.ref+" · "+fmtF(e.f),[e.fam,mqEv(e)?mqEv(e).cod:e.nave||null],fmtN(e.cant),e.ud,e.ir||null)));}return;}

  if(I.modo==="persona"){const w=nq(I.nom).split(" ").filter(x=>x.length>1);const per=P.def?{d:h.slice(0,7)+"-01",h,t:"este mes"}:P;
    const ents=cEntradas().map(x=>({f:x.f,ref:x.prod,cant:x.cant,ud:x.ud,eur:0,quien:x.quien,fam:"Entradas"}));const L=EV.concat(ents).filter(e=>e.f>=per.d&&e.f<=per.h&&e.quien&&w.length&&w.every(t=>reQ(t).test(" "+nq(e.quien)+" ")));
    ent("lo que ha hecho",[I.nom||null,per.t]);if(!w.length){frase("Dime el nombre, por ejemplo «qué ha hecho Josu este mes».");return;}
    if(!L.length){const nombres=[...new Set(EV.map(e=>e.quien).filter(Boolean))].slice(0,12);frase("No hay nada apuntado por «"+I.nom+"» en "+per.t+".");if(nombres.length)add(el("div",{class:"chips"},nombres.map(n=>el("button",{type:"button",class:"chip",text:n,onclick:()=>pon("qué ha hecho "+n+" "+per.t)}))));return;}
    const G={};L.forEach(e=>{const g=G[e.fam]=G[e.fam]||{n:0,c:0,ud:e.ud};g.n++;g.c+=e.cant;});
    frase(cap(L[0].quien)+" ha apuntado "+L.length+(L.length===1?" cosa":" cosas")+" en "+per.t+": "+Object.entries(G).map(([k,g])=>g.n+" "+k.toLowerCase()).join(", ")+".");
    lista(null,L.sort((a,b)=>b.f.localeCompare(a.f)).slice(0,80).map(e=>it(e.ref,[fmtF(e.f)+" · "+e.fam,mqEv(e)?mqEv(e).cod:e.nave||null],fmtN(e.cant),e.ud,e.ir||null)));return;}

  if(I.modo==="comparar"){compararA(I,res,pon,{add,frase,nota,ent,lista,it,ign});return;}

  if(I.modo==="pedirpara"){const per=I.per,S0=prevDatos(),pc=prevCfg();
    const q2=" "+q.replace(per.re," ").replace(/\b(que|cuanto|cuantos|cuantas|tengo|hay|tenemos|debo|debemos|necesito|necesitamos|hace|haria|falta|habria|pedir|comprar|traer|pedido|compras?|para|todo|todos|todas|con|y|me|nos|el|la|los|las|de|del|mes|semana|ano)\b/g," ")+" ";
    const S=artsQ(q2.replace(/\s+/g," ").trim()),todo=!S.fam&&!S.ign.length&&S.L.length===artsActivos().filter(a=>a.fam!=="eje").length;
    const dA=Math.max(0,dias(h,per.d)),dP=dias(per.d>h?per.d:h,per.h)+1;
    const F1={};todosMov().forEach(m=>{if(m.f&&(!F1[m.art]||m.f<F1[m.art]))F1[m.art]=m.f;});
    /* ritmo de los últimos 6 meses, contando desde que existe el artículo (si es nuevo, no se diluye) */
    const R=S.L.map(a=>{const PA=typeof PREV_AC!=="undefined"?PREV_AC[a.id]:null,s0=S0.art[a.id];const i0=S0.ini&&F1[a.id]&&F1[a.id]>S0.ini?F1[a.id]:S0.ini;
      const r=PA&&PA.porCont?consDia(a):(s0?s0.tot/Math.max(1,dias(i0,h)+1):consDia(a));
      const st=stockDe(a.id),pend=a.pedido?(+a.pedCant||0):0,mn=+a.min||0,antes=r*dA,gasto=r*dP,need=antes+gasto+mn-st-pend;
      let ped=0,env=null;if(need>0){if(PA){ped=Math.ceil(need/PA.grg-1e-9)*PA.grg;env=Math.round(ped/PA.grg)+" GRG";}else if(a.peso>0){const n=Math.ceil(need/a.peso-1e-9);ped=n*a.peso;env=n+" "+(a.envase||"envase").toLowerCase()+(n===1?"":"s");}else ped=redU(need,CONTABLE(a));}
      const pl=plazoArt(a)||pc.plazo,tMin=r>0?(st+pend-mn)/r:Infinity,dPed=Math.floor(Math.min(tMin,dA)-pl);
      return{a,r,st,pend,mn,antes,gasto,ped,env,pl,dPed,eu:ped*precioDe(a),queda:st+pend-antes};}).filter(x=>x.r>0||x.ped>0);
    const Pd=R.filter(x=>x.ped>0).sort((a,b)=>a.dPed-b.dPed),ud=x=>x.a.ud||"ud",n1=x=>fmtN(Math.round(x*10)/10);
    const cuando=x=>x.a.pedido?"ya hay un pedido en curso":x.dPed<=0?"hay que pedirlo ya":"pídelo antes del "+fmtF(sumaDias(h,x.dPed))+" (tarda "+x.pl+" días)";
    ent("qué hay que pedir",[per.t]);ign(S.ign);
    if(!R.length){frase("No hay consumo de eso para calcular lo que hará falta en "+per.t.toLowerCase()+".");return;}
    const tot=Pd.reduce((t,x)=>t+x.eu,0);
    if(R.length===1){const x=R[0];frase(x.ped>0?"Para "+per.t.toLowerCase()+" de "+nomArt(x.a)+" tienes que pedir "+n1(x.ped)+" "+ud(x)+(x.env?" ("+x.env+")":"")+": se gastarán unos "+n1(x.gasto)+" en "+per.t.toLowerCase()+(x.antes>0.05?" y "+n1(x.antes)+" de aquí a entonces":"")+"; hay "+n1(x.st)+(x.pend?" y "+n1(x.pend)+" pedidos":"")+(x.mn?" y la reserva mínima es "+n1(x.mn):"")+". "+cap(cuando(x))+"."+(x.eu?" Unos "+eur(x.eu)+".":"")
      :"Para "+per.t.toLowerCase()+" no hace falta pedir "+nomArt(x.a)+": hay "+n1(x.st)+(x.pend?" (+"+n1(x.pend)+" pedidos)":"")+" y se gastarán unos "+n1(x.antes+x.gasto)+" hasta final de "+per.t.toLowerCase()+(x.mn?", sin bajar de la reserva ("+n1(x.mn)+")":"")+".");}
    else frase(Pd.length?"Para "+per.t.toLowerCase()+" hay que pedir "+Pd.length+(Pd.length===1?" artículo":" artículos")+(tot?", unos "+eur(tot):"")+(Pd.some(x=>x.dPed<=0&&!x.a.pedido)?". "+Pd.filter(x=>x.dPed<=0&&!x.a.pedido).length+" hay que pedirlos ya.":".")+(R.length>Pd.length?" Con lo demás ("+(R.length-Pd.length)+") llega lo que hay.":""):"Para "+per.t.toLowerCase()+" no hace falta pedir nada: con lo que hay llega.");
    if(Pd.length){const porP={};Pd.forEach(x=>{const p=provN(x.a.prov)||"Sin proveedor";(porP[p]=porP[p]||[]).push(x);});
      Object.entries(porP).forEach(([p,xs])=>lista(p,xs.map(x=>it(nomArt(x.a),["Gasto previsto en "+per.t.toLowerCase()+": "+n1(x.gasto)+(x.antes>0.05?" (+"+n1(x.antes)+" antes)":"")+" · hay "+n1(x.st)+(x.pend?" + "+n1(x.pend)+" pedidos":"")+(x.mn?" · reserva "+n1(x.mn):""),cap(cuando(x))+(x.eu?" · "+eur(x.eu):"")],n1(x.ped),x.env||ud(x),()=>ficha(x.a),x.dPed<=0&&!x.a.pedido?"bad":"warn")),xs.length+(xs.length===1?" artículo":" artículos")));
      copiar("Copiar la lista para compras",["PEDIDO PARA "+per.t.toUpperCase()+" ("+fmtF(h)+")"].concat(...Object.entries(porP).map(([p,xs])=>["",p.toUpperCase()].concat(xs.map(x=>"- "+nomArt(x.a)+(x.a.cod?" ("+x.a.cod+")":"")+": "+n1(x.ped)+" "+ud(x)+(x.env?" ("+x.env+")":""))))).concat(tot?["","Importe aproximado: "+eur(tot)]:[]).join("\n"));}
    if(R.length>1&&R.length>Pd.length&&R.length-Pd.length<=40)lista("Con lo que hay llega",R.filter(x=>!(x.ped>0)).map(x=>it(nomArt(x.a),"Se gastarán unos "+n1(x.antes+x.gasto)+" · hay "+n1(x.st)+(x.pend?" + "+n1(x.pend)+" pedidos":""),n1(x.queda-x.gasto),"quedarán",()=>ficha(x.a),"ok")));
    if(todo){const E=sugEjes(pc,S0).L.filter(x=>x.lam>0);if(E.length){const ex=E.map(x=>({x,n:x.lam*dP})).filter(z=>z.n>=0.3||z.x.pedir>0||z.x.faltan>0).sort((a,b)=>b.n-a.n);
      if(ex.length)lista("Ejes",ex.map(z=>it(z.x.G.map(m=>m.ref).join(" / "),["Reparaciones esperadas en "+per.t.toLowerCase()+": "+fmtN(Math.round(z.n*10)/10)+" · en planta "+z.x.pl+" / mínimo "+z.x.min,z.x.pedir?"Pide al taller que traigan "+z.x.pedir:z.x.faltan?"Faltan "+z.x.faltan+" ejes nuevos":null],fmtN(Math.round(z.n*10)/10),"rep.",()=>fichaModelo(z.x.m),z.x.bajo?"bad":"ok")),"según las reparaciones del último año");}}
    nota("Cantidad = lo que se gastará hasta final de "+per.t.toLowerCase()+" + la reserva mínima − lo que hay − lo ya pedido. Gasto al ritmo de los últimos 6 meses (los aceites, con sus contadores cuando haya 2 semanas de lecturas). Se redondea a GRG o envases enteros.");return;}

  if(I.modo==="pedirsemana"){const PT=prevTodo(),SA={};PT.arts.forEach(x=>{SA[x.a.id]=x;});
    const L=artsActivos().filter(a=>a.fam!=="eje"&&!a.pedido).map(a=>{const c=consDia(a),st=stockDe(a.id),pp=puntoPedido(a),dp=c>0?(st-pp)/c:null,x=SA[a.id];const cont=CONTABLE(a);
      const cant=Math.max(x?x.pedir:0,redU(pp+c*14-st,cont));return{a,st,pp,dp,cant,n:nivel(a)};}).filter(x=>(x.n==="bad"||x.n==="warn"||(x.dp!=null&&x.dp<=7))&&x.cant>0)
      .sort((a,b)=>(a.n==="bad"?0:1)-(b.n==="bad"?0:1)||(a.dp==null?0:a.dp)-(b.dp==null?0:b.dp));
    ent("lo que hay que pedir esta semana");frase(L.length?"Esta semana hay que pedir "+L.length+(L.length===1?" artículo.":" artículos.")+(L.some(x=>x.n==="bad")?" "+L.filter(x=>x.n==="bad").length+" ya están bajo mínimo.":""):"Esta semana no hace falta pedir nada.");
    if(L.length){const porP={};L.forEach(x=>{const p=provN(x.a.prov)||"Sin proveedor";(porP[p]=porP[p]||[]).push(x);});
      Object.entries(porP).forEach(([p,xs])=>lista(p,xs.map(x=>it(nomArt(x.a),["Hay "+fmtN(Math.round(x.st*10)/10)+" · punto de pedido "+fmtN(Math.round(x.pp*10)/10),x.st<=0?"Agotado":x.n==="bad"?"Bajo mínimo":x.dp!=null&&x.dp>0?"Llega al punto de pedido en "+Math.ceil(x.dp)+" días":"En el punto de pedido"],fmtN(x.cant),x.a.ud||"ud",()=>ficha(x.a),x.n==="bad"?"bad":"warn")),fmtN(xs.length)+" artículos"));
      copiar("Copiar la lista para compras",["PEDIDO SEMANA "+fmtF(h)].concat(...Object.entries(porP).map(([p,xs])=>["",p.toUpperCase()].concat(xs.map(x=>"- "+nomArt(x.a)+(x.a.cod?" ("+x.a.cod+")":"")+": "+fmtN(x.cant)+" "+(x.a.ud||"ud"))))).join("\n"));}
    nota("Cantidad = lo que falta para llegar al punto de pedido más dos semanas de consumo (o la sugerencia de Previsión, si es mayor).");return;}

  if(I.modo==="mesquviene"){const PT=prevTodo(),G={};let tot=0;PT.arts.forEach(x=>{const v=x.mes.mu*precioDe(x.a);if(!v)return;const k=famLbl(x.a);G[k]=(G[k]||0)+v;tot+=v;});
    PT.E.L.forEach(x=>{const pr=Math.max(0,...x.G.map(m=>+m.precioRep||0));const v=x.mes*pr;if(v){G["Reparación de ejes"]=(G["Reparación de ejes"]||0)+v;tot+=v;}});
    const ms=cap(fmtMes(PT.S.mesSig));ent("previsión de gasto",[ms]);frase("En "+ms.toLowerCase()+" se gastarán unos "+eur(tot)+", al ritmo de los últimos 6 meses.");
    lista(null,Object.entries(G).sort((a,b)=>b[1]-a[1]).map(([k,v])=>it(k,Math.round(v/tot*100)+" %",eur(v),null)));nota("Sale de la Previsión (consumo medio de cada artículo por su precio, y reparaciones de eje esperadas por su precio de reparación). Lo que no tiene precio no suma.");return;}

  if(I.modo==="ejesfaltan"){const PT=prevTodo(),L=PT.E.L.filter(x=>x.tot>0).sort((a,b)=>(b.bajo-a.bajo)||(a.pl-a.min)-(b.pl-b.min));const B=L.filter(x=>x.bajo);ent("ejes que van a faltar");
    frase(B.length?B.length+(B.length===1?" modelo de eje se queda":" modelos de eje se quedan")+" con menos reserva de la necesaria: "+B.map(x=>x.G.map(m=>m.ref).join("/")).join(", ")+".":"Todos los modelos de eje tienen la reserva que hace falta.");
    lista(null,L.map(x=>it(x.G.map(m=>m.ref).join(" / "),["En planta "+x.pl+" (para "+x.maq+(x.maq===1?" máquina":" máquinas")+") · en el taller "+x.tal+(x.prep?" · preparados "+x.prep:""),x.bajo?(x.pedir?"Pide que traigan "+x.pedir+" del taller":"")+(x.faltan?(x.pedir?" y ":"")+"faltan "+x.faltan+" ejes nuevos":""):null],x.pl+"/"+x.min,"en planta / mínimo",()=>fichaModelo(x.m),x.bajo?"bad":"ok")));
    nota("El mínimo sale de la Previsión: las máquinas que lo llevan más las reparaciones que suelen pasar mientras un eje está en el taller.");return;}

  if(I.modo==="resumen"){const per=P.def?{d:h.slice(0,7)+"-01",h,t:"este mes"}:P;const L=EV.filter(e=>e.f>=per.d&&e.f<=per.h);const ps=L.filter(e=>e.fam==="Pistones"),rp=L.filter(e=>e.fam==="Reparación de ejes"),ot=L.filter(e=>e.fam!=="Pistones"&&e.fam!=="Reparación de ejes");
    const eu=L.reduce((s,e)=>s+e.eur,0),A=artsActivos(),bajo=A.filter(a=>!a.pedido&&nivel(a)==="bad").length,ped=A.filter(a=>a.pedido).length,tal=ejes.filter(e=>e.estado==="reparacion").length;
    const GD={};ps.forEach(e=>{GD[e.ref]=(GD[e.ref]||0)+e.cant;});
    const lin=["RESUMEN ALMACÉN · "+cap(per.t)+" (a "+fmtF(h)+")","- Pistones cambiados: "+fmtN(ps.reduce((s,e)=>s+e.cant,0))+" ("+Object.entries(GD).sort().map(([d,n])=>d+": "+n).join(" · ")+") · "+eur(ps.reduce((s,e)=>s+e.eur,0)),
      "- Reparaciones de eje: "+rp.length+" · "+eur(rp.reduce((s,e)=>s+e.eur,0)),"- Otros consumos: "+ot.length+" apuntes · "+eur(ot.reduce((s,e)=>s+e.eur,0)),"- Gasto total: "+eur(eu),
      "- Ahora: "+bajo+" bajo mínimo sin pedir · "+ped+" pedidos sin llegar · "+tal+" ejes en el taller · "+pistPend().length+" cambios de pistón sin mandar a "+destPist().nom.split(" ")[0]];
    ent("resumen",[per.t]);frase(cap(per.t)+": "+eur(eu)+" gastados, "+fmtN(ps.reduce((s,e)=>s+e.cant,0))+" pistones y "+rp.length+" reparaciones de eje.");
    add(el("section",{class:"card"},el("pre",{class:"bd",style:"white-space:pre-wrap;font:inherit;margin:0",text:lin.join("\n")})));copiar("Copiar el resumen",lin.join("\n"));
    nota("El resumen con aluminio y cobre está en la app de Coladas (Consultas › «resumen del mes»).");return;}
}

/* ===== COMPARAR GASTO: material, familia, máquina o nave; mes contra mes, contra la media o año contra año =====
   Sirve para ver desviaciones: el mes que corre se proyecta a mes completo y se compara con la media y la dispersión de los 6 anteriores. */
const mesK=f=>f.slice(0,7),mesMas=(m,n)=>{const d=new Date(+m.slice(0,4),+m.slice(5,7)-1+n,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");};
const diasMes=m=>new Date(+m.slice(0,4),+m.slice(5,7),0).getDate();
/* periodos en el orden en que salen en la pregunta */
function periodosCmp(q){const h=hoy(),y=+h.slice(0,4),mAct=mesK(h),o=[];const pon=(i,x)=>o.push(Object.assign({i},x));let m;
  const reM=new RegExp("\\b("+MESES_Q.join("|")+")( de)?( (20\\d\\d))?\\b","g");
  while((m=reM.exec(q))){const mi=MESES_Q.indexOf(m[1]),yy=m[4]?+m[4]:(mi+1>+h.slice(5,7)?y-1:y);const k=yy+"-"+String(mi+1).padStart(2,"0");pon(m.index,{tipo:"mes",m:k,t:cap(MESES_Q[mi])+(yy!==y?" "+yy:"")});}
  if((m=/\beste mes\b|\bmes (actual|en curso|que corre)\b/.exec(q)))pon(m.index,{tipo:"mes",m:mAct,t:"este mes"});
  if((m=/\b(el )?(mes pasado|ultimo mes|mes anterior)\b/.exec(q))&&!/\bmeses anteriores\b/.test(q))pon(m.index,{tipo:"mes",m:mesMas(mAct,-1),t:cap(fmtMes(mesMas(mAct,-1))).replace(/ \d{4}$/,"")});
  if((m=/\b(este|el) ano\b(?! pasado)|\ben lo que va de ano\b/.exec(q)))pon(m.index,{tipo:"ano",y,t:"este año"});
  if((m=/\b(el )?ano pasado\b/.exec(q)))pon(m.index,{tipo:"ano",y:y-1,t:"el año "+(y-1)});
  const vistos=new Set();return o.sort((a,b)=>a.i-b.i).filter(x=>{const k=x.tipo+(x.m||x.y);if(vistos.has(k))return false;vistos.add(k);return true;});}
function compararA(I,res,pon,U){const {add,frase,nota,ent,lista,it,ign}=U;const q=I.q,h=hoy(),mAct=mesK(h),dHoy=+h.slice(8,10);
  /* qué se compara */
  const fs=famEvQ(q);const PS=periodosCmp(q);
  let resto=(" "+q+" ").replace(new RegExp("\\b("+MESES_Q.join("|")+")( de)?( 20\\d\\d)?\\b","g")," ").replace(/\b20\d\d\b/g," ")
    .replace(/\bcompar\w*|\bfrente\b|\brespecto\b|\bcontra\b|\bdesviaci\w*|\bdesvi\w*|\bmes(es)?\b|\ba mes\b|\bevolucion\b|\banteriores?\b|\bmedia\b|\bpasado\b|\bultimo\b|\bactual\b|\ben curso\b|\bque corre\b|\bano\b|\beste\b|\besta\b|\bgasto\w*|\bconsum\w*|\bgasta\w*|\bdisparad\w*|\bdesviad\w*|\bnormal\b|\bdinero\b|\beuros?\b|\bmaquinas?\b|\binyectoras?\b|\bmaterial(es)?\b|\btodo\b|\bdetect\w*|\bdesviaciones\b/g," ");
  if(I.cod)resto=resto.replace(new RegExp("\\b"+I.cod.toLowerCase()+"\\b","g")," ");resto=resto.replace(/\bnave\s*(1a|1b|1|2)\b/g," ");
  [/\bpiston(es)?\b/,/\bejes?\b/,/\bbarras?( expulsoras?)?\b/,/\btornillos?( tope)?\b/,/\b(recambios? de )?hornos?\b/,/\baceites?\b/,/\btaladrinas?\b/,/\bjabon(es)?\b/].forEach(re=>{resto=resto.replace(re," ");});
  const pals=resto.split(/\s+/).filter(w=>w&&w.length>1&&!QSTOP.has(w)&&!QM_STOP.has(w)&&!/^(con|los|las|del|que|cual|cuanto|cuantos|como|ha|han|hay|va|van|lo|le|mas|menos|por|para|entre|sobre|cada|uno|una|ver|dame|dime|quiero|saber|sale|salen)$/.test(w));
  const txtE=e=>" "+nq([e.ref,e.a?e.a.desc:"",e.a?e.a.cod:"",e.fam].join(" "))+" ";
  let E=evTodo().filter(e=>e.fam!=="Contenedores"&&famCasa(e,fs)&&(!I.maq||(mqEv(e)&&mqEv(e).id===I.maq.id))&&(!I.nave||enNave(mqEv(e),I.nave)||(e.nave&&nq(e.nave).startsWith(I.nave))));
  const ignW=[];pals.forEach(w=>{const r=reQ(raiz(w));const E2=E.filter(e=>r.test(txtE(e)));if(E2.length)E=E2;else ignW.push(w);});
  const sujeto=[fs?fs.join(", "):null,pals.filter(w=>!ignW.includes(w)).join(" ")||null,I.maq?I.maq.cod:null,I.nave?cap(I.nave).toUpperCase().replace("NAVE","Nave"):null].filter(Boolean);
  const uds=[...new Set(E.map(e=>e.ud))],unaUd=uds.length===1?uds[0]:null,hayEur=E.filter(e=>e.eur>0).length>=0.8*E.length;
  /* desde qué mes hay datos de lo que se pregunta (antes no se apuntaba: no cuenta como cero) */
  const IN=typeof iniDatos==="function"?iniDatos():{};const fIni=[...new Set(E.map(e=>e.fam==="Pistones"?IN.pist:e.fam==="Reparación de ejes"?IN.rep:IN.mov))].filter(Boolean).sort().pop()||null;
  const mIni=fIni?(+fIni.slice(8,10)<=5?fIni.slice(0,7):mesMas(fIni.slice(0,7),1)):"0000-00";
  const V=L=>({eu:L.reduce((s,e)=>s+e.eur,0),c:L.reduce((s,e)=>s+e.cant,0),n:L.length});
  const med=x=>unaUd?x.c:hayEur?x.eu:x.n,fmtV=v=>unaUd?fmtN(Math.round(v*10)/10)+" "+unaUd:hayEur?eur(v):fmtN(Math.round(v))+" apuntes",fmtV2=x=>(unaUd?fmtN(Math.round(x.c*10)/10)+" "+unaUd:fmtN(x.n)+" apuntes")+(x.eu?" · "+eur(x.eu):"");
  const pct=(a,b)=>b>0?Math.round((a-b)/b*100):(a>0?null:0),pTxt=p=>p==null?"(antes no había)":p>0?"+"+p+" %":p+" %";
  ent("comparar gasto",sujeto.concat(PS.map(p=>p.t)));ign(ignW);
  if(!E.length){frase("No hay ningún gasto apuntado de eso para comparar.");return;}
  const porMes={};E.forEach(e=>{const k=mesK(e.f);(porMes[k]=porMes[k]||[]).push(e);});const VM=k=>V(porMes[k]||[]);
  /* desglose: por máquina si se pregunta por un material; por artículo si se pregunta por una máquina o una familia */
  const grpCmp=e=>I.maq||(!pals.length&&fs&&fs.length===1&&fs[0]!=="Pistones"&&fs[0]!=="Reparación de ejes")?(e.a?nomArtC(e.a):e.ref):(mqEv(e)?mqEv(e).cod:(e.nave?e.nave+" (general)":"Sin máquina"));
  const desglose=(LA,LB,nB,titA,titB,proy)=>{const G={};const sum=(L,c,f)=>L.forEach(e=>{const k=grpCmp(e);const g=G[k]=G[k]||{k,a:{eu:0,c:0,n:0},b:{eu:0,c:0,n:0},m:mqEv(e),art:e.a};g[c].eu+=e.eur*f;g[c].c+=e.cant*f;g[c].n+=f;});
    sum(LA,"a",proy||1);sum(LB,"b",1/(nB||1));const R=Object.values(G).map(g=>Object.assign(g,{d:med(g.a)-med(g.b),p:pct(med(g.a),med(g.b))})).sort((x,y)=>y.d-x.d);
    const sube=R.filter(g=>g.d>0&&(g.p==null||g.p>=20)),baja=R.filter(g=>g.d<0&&g.p<=-20);
    const fila=g=>it(g.k,[titA+": "+fmtV(med(g.a))+" · "+titB+": "+fmtV(med(g.b)),g.p==null?"Antes no gastaba":(g.d>0?"Gasta "+fmtV(g.d)+" más":"Gasta "+fmtV(-g.d)+" menos")],pTxt(g.p),null,g.m?()=>pon("todo sobre la "+g.m.cod):g.art?()=>ficha(g.art):null,g.d>0?(g.p==null||g.p>=50?"bad":"warn"):"ok");
    if(sube.length)lista("Lo que más se ha desviado al alza",sube.slice(0,15).map(fila),sube.length===1?"1 sube":sube.length+" suben");
    if(baja.length)lista("Lo que ha bajado",baja.slice(0,8).map(fila));
    if(!sube.length&&!baja.length)nota("En el desglose nada se ha movido más de un 20 %.");
    if(R.length>1)add(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Detalle"})),cTabla(["",titA,titB,"Diferencia"],R.slice(0,40).map(g=>[g.k,fmtV(med(g.a)),fmtV(med(g.b)),pTxt(g.p)]),[1,2,3])]));};
  /* el mismo gasto por tonelada de aluminio (Coladas): así una desviación no es solo producir más */
  const scopeT=I.maq?I.maq.cod:I.nave?"Nave "+I.nave.replace(/^nave\s*/,"").replace(/[ab]$/,""):null;
  const porTon=(LA,LB,tA,tB)=>{if(typeof PROD==="undefined"||!PROD)return;LA=LA.filter(([m])=>tonMes(m,scopeT)>0);LB=LB.filter(([m])=>tonMes(m,scopeT)>0);const tt=L=>L.reduce((s,[m])=>s+tonMes(m,scopeT),0),vv=L=>L.reduce((s,[,v])=>s+v,0);const ta=tt(LA),tb=tt(LB);if(!(ta>0&&tb>0))return;
    const ra=vv(LA)/ta,rb=vv(LB)/tb,p=pct(ra,rb);
    add(el("p",{class:"bd-resp",text:"Por tonelada de aluminio"+(scopeT?" ("+scopeT+")":"")+": "+tA+" "+fmtV(ra*100)+" por cada 100 t (con "+fmtN(Math.round(ta))+" t); "+tB+" "+fmtV(rb*100)+" por cada 100 t. "+(p==null?"":p>=25?"Gasta un "+p+" % más por tonelada: es una desviación de verdad, no solo más producción.":p<=-25?"Gasta un "+(-p)+" % menos por tonelada.":"Por tonelada está en lo normal ("+pTxt(p)+"): la diferencia se explica por lo producido.")}));};
  /* gráfica y tabla de los últimos 12 meses */
  const serie=fin=>{const ms=[];for(let i=11;i>=0;i--)ms.push(mesMas(fin,-i));const vs=ms.map(k=>med(VM(k)));
    add(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Mes a mes"}),el("span",{class:"der sub",text:unaUd?unaUd:hayEur?"euros":"apuntes"})]),el("div",{class:"bd",style:"display:grid;gap:8px"},[barras(ms,vs,v=>unaUd?String(Math.round(v)):hayEur?Math.round(v)+"":String(v)),
      cTabla(["Mes","Gasto","Frente al anterior"],ms.slice().reverse().map((k,i,arr)=>{const v=med(VM(k)),pv=arr[i+1]?med(VM(arr[i+1])):null;return[cap(fmtMes(k))+(k===mAct?" (va por el día "+dHoy+")":""),fmtV2(VM(k)),pv==null?"—":pTxt(pct(v,pv))];}),[1,2])])]));};
  /* 1) dos periodos dichos: A frente a B */
  if(PS.length>=2){const [A,B]=PS;const rng=p=>p.tipo==="mes"?{d:p.m+"-01",h:p.m+"-"+String(diasMes(p.m)).padStart(2,"0")}:p.y===+h.slice(0,4)?{d:p.y+"-01-01",h}:{d:p.y+"-01-01",h:p.y+"-12-31"};
    let rA=rng(A),rB=rng(B);if(A.tipo==="ano"&&B.tipo==="ano"&&(A.y===+h.slice(0,4)||B.y===+h.slice(0,4))){const md=h.slice(5);rA={d:A.y+"-01-01",h:A.y+"-"+md};rB={d:B.y+"-01-01",h:B.y+"-"+md};}
    const LA=E.filter(e=>e.f>=rA.d&&e.f<=rA.h),LB=E.filter(e=>e.f>=rB.d&&e.f<=rB.h),va=V(LA),vb=V(LB),p=pct(med(va),med(vb));
    const enCurso=A.tipo==="mes"&&A.m===mAct,proy=enCurso?diasMes(mAct)/dHoy:1;
    frase(cap(A.t)+": "+fmtV2(va)+". "+cap(B.t)+": "+fmtV2(vb)+". "+(p==null?"Antes no había gasto.":p>0?"Un "+p+" % más.":p<0?"Un "+(-p)+" % menos.":"Lo mismo.")+(enCurso&&dHoy<diasMes(mAct)?" A este ritmo "+A.t+" acabaría en "+fmtV(med(va)*proy)+" ("+pTxt(pct(med(va)*proy,med(vb)))+").":"")
      +(A.tipo==="ano"&&B.tipo==="ano"&&rA.h.slice(5)!=="12-31"?" (Comparando el mismo periodo: del 1 de enero al "+fmtF(rA.h).slice(0,5)+".)":""));
    if(A.tipo==="mes"&&B.tipo==="mes")porTon([[A.m,med(va)]],[[B.m,med(vb)]],cap(A.t),cap(B.t));
    desglose(LA,LB,1,cap(A.t),cap(B.t),enCurso&&dHoy>=5?proy:1);if(enCurso&&dHoy>=5)nota("En el desglose, "+A.t+" va proyectado a mes completo (va por el día "+dHoy+").");
    serie(A.tipo==="mes"?(A.m>(B.m||"")?A.m:B.m||A.m):mAct);return;}
  /* 2) un mes (por defecto el que corre) frente a la media de los 6 anteriores */
  const T=PS.length===1&&PS[0].tipo==="mes"?PS[0]:{m:mAct,t:"este mes"};const enCurso=T.m===mAct,dm=diasMes(T.m),f=enCurso?dm/Math.max(dHoy,1):1;
  const prev=[1,2,3,4,5,6].map(i=>mesMas(T.m,-i)).filter(k=>k>=mIni),nP=prev.length;
  if(!nP){frase(cap(T.t)+": "+fmtV2(VM(T.m))+". Todavía no hay ningún mes completo anterior con datos para comparar.");serie(T.m);return;}
  const pv=prev.map(k=>med(VM(k)));const mTxt=nP===1?"el mes anterior":"los "+nP+" meses anteriores";
  const media=pv.reduce((s,v)=>s+v,0)/nP,sd=nP>1?Math.sqrt(pv.reduce((s,v)=>s+(v-media)*(v-media),0)/(nP-1)):media*0.3,act=med(VM(T.m)),proyT=act*f,ant=med(VM(prev[0])),p=pct(proyT,media),pA=pct(proyT,ant);
  const nivelD=p==null?"bad":p>=60&&proyT-media>sd?"bad":p>=25?"warn":p<=-40?"low":"ok";
  frase(cap(T.t)+": "+fmtV2(VM(T.m))+(enCurso&&dHoy<dm?" en "+dHoy+" días; a este ritmo acabaría en "+fmtV(proyT):"")+". "+(nP===1?cap(fmtMes(prev[0])).replace(/ \d{4}$/,"")+" fue "+fmtV(ant)+" ("+pTxt(pA)+").":"La media de "+mTxt+" es "+fmtV(media)+" ("+pTxt(p)+") y "+cap(fmtMes(prev[0])).replace(/ \d{4}$/,"").toLowerCase()+" fue "+fmtV(ant)+" ("+pTxt(pA)+")."));
  if(nP<3)nota("Solo hay "+nP+(nP===1?" mes completo":" meses completos")+" de datos antes: la comparación se irá afinando.");
  porTon([[T.m,act]],prev.map(k=>[k,med(VM(k))]),cap(T.t),nP===1?cap(fmtMes(prev[0])).replace(/ \d{4}$/,""):"la media de "+mTxt);
  add(el("div",{class:"banner "+(nivelD==="bad"?"b":nivelD==="warn"?"w":""),text:nivelD==="bad"?"Desviación fuerte: "+T.t.toLowerCase()+" va muy por encima de lo normal.":nivelD==="warn"?"Desviación: "+T.t.toLowerCase()+" va por encima de lo normal.":nivelD==="low"?"Va bastante por debajo de lo normal.":"Dentro de lo normal (entre "+fmtV(Math.max(0,media-sd))+" y "+fmtV(media+sd)+" al mes)."}));
  if(enCurso&&dHoy<5)nota("Llevamos solo "+dHoy+" días de mes: la proyección todavía es poco fiable.");
  desglose(porMes[T.m]||[],[].concat(...prev.map(k=>porMes[k]||[])),nP,cap(T.t)+(enCurso&&dHoy<dm?" (proyectado)":""),nP===1?cap(fmtMes(prev[0])).replace(/ \d{4}$/,""):"Media "+nP+" meses",enCurso&&dHoy>=5?f:1);
  serie(T.m);
  nota("Se compara "+T.t.toLowerCase()+(enCurso?" (proyectado a mes completo)":"")+" con la media de "+mTxt+" (los meses desde que se apunta). Puedes preguntar también «octubre frente a septiembre», «este año con el año pasado», o por una máquina, una nave, una familia o un artículo.");}

/* ===== MÁS PREGUNTAS PARA CONSULTAS =====
   Ejes y taller, barras para recuperar, conclusiones, recuentos, horno de Limpieza, precios, proveedores,
   máquinas sin nada apuntado y coste de mantener una máquina. intencionMas(q,o) decide; pintaMas contesta. */
function diasQ(q,def){const m=q.match(/\b(\d+) (dias?|semanas?|meses|mes)\b/);if(!m)return def;const n=+m[1];return m[2][0]==="s"?n*7:m[2][0]==="m"?n*30:n;}
function intencionMas(q,o){const R=x=>Object.assign({mas:x},{maq:o.maq});
  const ejes=/\bejes?\b/.test(q),maqP=/\b(maquinas?|inyectoras?)\b/.test(q);
  /* 1 · cuarentena */
  if(/\bcuarentena\b/.test(q))return R("cuar");
  /* 2 · taller: cuánto tarda */
  if(ejes&&/\b(tarda|tardan|tardo|tardaron|tarde|dias)\b/.test(q)&&/\b(taller|reparar|reparacion\w*|devolver|volver|vuelven?)\b/.test(q))return R("taller");
  /* 3 · agarrotados recuperados en planta */
  if(/\bagarrotad\w*\b/.test(q)&&/\b(recuper\w*|planta|ahorr\w*|porcentaje|cuantos)\b/.test(q))return R("agarr");
  /* 4 · coste de los ejes de una máquina */
  if(ejes&&o.maq&&/\b(cuant\w*|coste\w*|cuesta\w*|costad\w*|dinero|euros|gast\w*)\b/.test(q))return R("ejesmaqeur");
  /* 5 · barras para recuperar (Meyusa) */
  if((/\bmeyusa\b/.test(q)&&!/\b(comprad\w*|compra\w*|le hemos)\b/.test(q))||(/\bbarras?\b/.test(q)&&/\brecuper\w*\b/.test(q)))return R("brec");
  /* 6 · conclusiones */
  if(/\bconclusion\w*\b/.test(q)||/\bacciones?\b.*\b(funcionad\w*|funciona\w*|comprobar|revisar)\b/.test(q)||/\bque (ha|han) funcionado\b/.test(q))return R("concl");
  /* 7 · qué toca contar */
  if(/\b(que|cuanto) (toca|hay que|tengo que|tenemos que) contar\b|\brecuentos? (de (esta|la) semana|pendientes?|que tocan?)\b|\bque (toca|hay que) (hacer )?recuento\b/.test(q))return R("contar");
  /* 8 · lo que más descuadra en los recuentos (faltas y sobras) */
  if(/\bdescuadr\w*\b/.test(q)&&/\b(mas|que|cuales|articulos?|ranking)\b/.test(q))return R("descuadre");
  /* 9 · cambios de horno de Limpieza por revisar */
  if(/\blimpieza\b/.test(q)&&/\b(revisar|sin revisar|por revisar|horno|cambios?)\b/.test(q))return R("limp");
  /* 11 · subidas de precio */
  if(/\b(ha|han) (subido|bajado|cambiado) de precio\b|\bsubidas? de precio\b|\bcambios? de precio\b|\b(que|cuales) (ha|han) subido\b|\bprecios? (que )?(ha|han) subido\b/.test(q))return R("precios");
  /* 12 · compras a un proveedor */
  {const P=(cat.proveedores||[]).filter(p=>p.nom&&nq(p.nom).length>=3&&new RegExp("\\b"+nq(p.nom).split(" ")[0].replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b").test(q));
   if(P.length&&/\b(compra\w*|comprad\w*|pedido\w*|cuanto|gast\w*|entrad\w*|traid\w*|que le)\b/.test(q))return Object.assign(R("prov"),{prov:P[0]});
   if(/\b(a que|que) proveedor\w*\b.*\b(mas|compramos|compra)\b|\bcompras por proveedor\b|\bcuanto (le )?(hemos )?comprado a cada\b/.test(q))return R("provs");}
  /* 13 · máquinas sin nada apuntado */
  if(maqP&&/\b(no tienen?|sin) (nada )?(apuntad\w*|apuntar|registr\w*|consumos?)\b|\bmaquinas? (que )?no (se )?apunta\w*\b|\bno (se )?(ha|han) apuntado nada\b/.test(q))return Object.assign(R("sinapunt"),{dias:diasQ(q,30)});
  /* 10 · qué máquina cambia más X */
  {const m=q.match(/\b(?:que|cual|cuales) (?:maquinas?|inyectoras?) (?:cambia|cambian|rompe|rompen) mas (.+)$/);
   if(m&&!/\b(dinero|euros|en (dinero|euros)|piston\w*|de todo|todo)\b/.test(m[1])){const S=artsQ(m[1]);if(S.L.length&&!S.ign.length&&S.L.length<artsActivos().filter(a=>a.fam!=="eje").length)return Object.assign(R("masx"),{txt:m[1]});}}
  /* 14 · coste de mantener una máquina */
  if(o.maq&&/\bmantener\b|\bmantenimiento\b/.test(q))return R("mantener");
  if(!o.maq&&/\b(que|cual) (maquina|inyectora) (cuesta|nos cuesta|sale) mas (cara|caro)? ?(de )?mantener\b|\bcoste de mantenimiento por maquina\b/.test(q))return R("mantener");
  return null;}

function pintaMas(I,P,H){const {add,frase,nota,ent,lista,it,pon,ign}=H,h=hoy(),y0=h.slice(0,4)+"-01-01",m=I.maq;
  const perD=()=>P.def?{d:P.d,h:P.h,t:"los últimos 12 meses"}:P;
  const media=L=>L.length?Math.round(L.reduce((s,x)=>s+x,0)/L.length):null,mediana=L=>{if(!L.length)return null;const s=L.slice().sort((a,b)=>a-b);return s[Math.floor(s.length/2)];};
  const nD=n=>n+(n===1?" día":" días");
  const btn=(t,fn,cls)=>add(el("div",{class:"acciones",style:"margin-top:8px"},[el("button",{type:"button",class:"btn"+(cls?" "+cls:""),text:t,onclick:fn})]));
  const consulta=!!window.SOLO_CONSULTA;

  if(I.mas==="cuar"){const L=ejePend().slice().sort((a,b)=>a.f.localeCompare(b.f));ent("ejes en cuarentena");
    if(!L.length){frase("No hay ningún eje en cuarentena.");return;}
    const viejo=L[0],nV=L.filter(p=>dias(p.f,h)>=7).length;
    frase("Hay "+L.length+(L.length===1?" eje":" ejes")+" en cuarentena. El que más lleva: "+viejo.maq+" ("+nD(dias(viejo.f,h))+", "+motTxt(viejo).toLowerCase()+")."+(nV?" "+nV+(nV===1?" lleva":" llevan")+" una semana o más: conviene decidir si se repara, se recupera en planta o no hay que repararlo.":""));
    lista(null,L.map(p=>{const a=typeof aveDePend==="function"?aveDePend(p):null,d=dias(p.f,h);return it(p.maq+" · "+((p.mods||[]).join(" / ")||"modelo sin saber"),[motTxt(p)+" · desde el "+fmtF(p.f)+(p.manual?" · sin número todavía":""),a?"En la avería "+avNom(a):"Sin avería"],nD(d).split(" ")[0],d===1?"día":"días",()=>irA("ejes"),d>=14?"bad":d>=7?"warn":"ok");}));
    nota("Se resuelven en Más › Ejes › «Ejes en cuarentena»: poner número y preparar, recuperado en planta o no hay que repararlo.");return;}

  if(I.mas==="taller"){const per=perD(),R0=todasRep().filter(r=>r.env&&!r.recuento&&r.res!=="anulada"),V=R0.filter(r=>r.rec&&r.rec>=per.d&&r.rec<=per.h).map(r=>Object.assign({d:dias(r.env,r.rec)},r)).filter(r=>r.d>=0),A=R0.filter(r=>!r.rec&&!r.res);
    ent("lo que tarda el taller",[per.t]);
    if(!V.length&&!A.length){frase("No hay ejes que hayan vuelto del taller en "+per.t+".");return;}
    const ds=V.map(r=>r.d);
    frase((V.length?cap(per.t)+" han vuelto "+V.length+(V.length===1?" eje":" ejes")+": el taller tarda "+nD(media(ds))+" de media (la mitad en menos de "+nD(mediana(ds))+"). El que más tardó: "+V.slice().sort((a,b)=>b.d-a.d)[0].eje+" ("+nD(Math.max(...ds))+").":"")+(A.length?" Ahora hay "+A.length+" en el taller; el que más lleva, "+A.slice().sort((a,b)=>a.env.localeCompare(b.env))[0].eje+" ("+nD(dias(A.slice().sort((a,b)=>a.env.localeCompare(b.env))[0].env,h))+").":""));
    if(A.length){const md=media(ds);lista("Ahora en el taller",A.slice().sort((a,b)=>a.env.localeCompare(b.env)).map(r=>{const d=dias(r.env,h);return it(r.eje,[(r.desp||"")+" · enviado el "+fmtF(r.env),md&&d>md?"Ya pasa de lo normal ("+nD(md)+")":null],String(d),"días",()=>{const e=ejes.find(x=>x.cod===r.eje);if(e&&typeof fichaEje==="function")fichaEje(e);else irA("ejes");},md&&d>md*1.5?"bad":md&&d>md?"warn":"ok");}));}
    if(V.length){const G={};V.forEach(r=>{const k=r.env.slice(0,7);(G[k]=G[k]||[]).push(r.d);});const K=Object.keys(G).sort();if(K.length>1)lista("Por mes de envío",K.map(k=>it(cap(MESES_Q[+k.slice(5)-1])+" "+k.slice(0,4),G[k].length+(G[k].length===1?" eje":" ejes"),String(media(G[k])),"días de media")));
      lista("Han vuelto ("+per.t+")",V.slice().sort((a,b)=>b.d-a.d).slice(0,40).map(r=>it(r.eje,[(r.desp||"")+" · "+fmtF(r.env)+" → "+fmtF(r.rec)],String(r.d),"días")));}
    return;}

  if(I.mas==="agarr"){const per=perD(),RC=ejeRecup().filter(x=>x.f>=per.d&&x.f<=per.h),RP=todasRep().filter(r=>!r.recuento&&r.res!=="anulada"&&(r.alta||r.env||"")>=per.d&&(r.alta||r.env||"")<=per.h&&/AGARR/i.test(r.desp||""));
    const SR=(cat.ejeSinRep||[]).filter(x=>x.f>=per.d&&x.f<=per.h),tot=RC.length+RP.length,ah=RC.reduce((s,x)=>s+((x.mods||[]).map(c=>precioMod(c)).find(v=>v>0)||0),0);
    ent("ejes agarrotados",[per.t]);
    if(!tot){frase("No hay ejes agarrotados apuntados en "+per.t+". Cuentan los recuperados en planta y los mandados al taller por pistón agarrotado.");return;}
    frase(cap(per.t)+": "+tot+(tot===1?" eje agarrotado":" ejes agarrotados")+". Se han recuperado en planta "+RC.length+" ("+Math.round(RC.length/tot*100)+" %) y han ido al taller "+RP.length+"."+(ah?" Recuperarlos ha ahorrado unos "+eur(ah)+" en reparaciones.":"")+(SR.length?" Además, "+SR.length+(SR.length===1?" no hacía":" no hacían")+" falta repararlo.":""));
    nota("La app usa este porcentaje para calcular cuántos ejes faltarán: ahora cuenta con recuperar un "+Math.round(tasaRecup()*100)+" % de los agarrotados.");
    if(RC.length)lista("Recuperados en planta",RC.slice().sort((a,b)=>b.f.localeCompare(a.f)).map(x=>{const pr=(x.mods||[]).map(c=>precioMod(c)).find(v=>v>0)||0;return it((x.maq||"")+" · "+((x.mods||[]).join(" / ")||"modelo sin saber"),fmtF(x.f)+(x.eje?" · eje "+x.eje:""),pr?eur(pr):"—",pr?"ahorrado":null,null,"ok");}));
    if(RP.length)lista("Al taller por agarrotado",RP.slice().sort((a,b)=>(b.alta||b.env).localeCompare(a.alta||a.env)).map(r=>it(r.eje,[(r.maq?r.maq+" · ":"")+fmtF(r.alta||r.env),r.res==="ok"?"Reparado":r.res?r.res:"En curso"],eur(costeRep(r).v),null,null,"warn")));return;}

  if(I.mas==="ejesmaqeur"){const per=perD("ano"),cod=m.cod,R0=todasRep().filter(r=>!r.recuento&&r.res!=="anulada"&&(r.maq===cod||r.maq===m.id||maqN(r.maq)===cod)&&(r.rec||r.env||r.alta||"")>=per.d&&(r.rec||r.env||r.alta||"")<=per.h);
    const RC=ejeRecup().filter(x=>(x.maq===cod||x.maq===m.id)&&x.f>=per.d&&x.f<=per.h),Q=ejePend().filter(p=>p.maq===cod);
    const c=R0.reduce((s,r)=>s+costeRep(r).v,0),est=R0.filter(r=>!(+r.imp>0)).length;
    const otras=cat.maquinas.map(x=>todasRep().filter(r=>!r.recuento&&r.res!=="anulada"&&(r.maq===x.cod||r.maq===x.id)&&(r.rec||r.env||r.alta||"")>=per.d&&(r.rec||r.env||r.alta||"")<=per.h).reduce((s,r)=>s+costeRep(r).v,0)).filter(v=>v>0);
    ent("ejes de la "+cod,[per.t]);
    frase(cap(per.t)+", los ejes de la "+cod+" han costado "+eur(c)+" en "+R0.length+(R0.length===1?" reparación":" reparaciones")+(est?" ("+est+" con el precio del modelo, sin factura todavía)":"")+"."+(RC.length?(RC.length===1?" Se ha recuperado 1":" Se han recuperado "+RC.length)+" en planta sin pasar por el taller.":"")+(Q.length?" Ahora hay "+Q.length+" en cuarentena.":"")+(otras.length>1&&c?" La media de las máquinas con reparaciones es "+eur(otras.reduce((s,v)=>s+v,0)/otras.length)+".":""));
    if(R0.length)lista("Reparaciones",R0.slice().sort((a,b)=>(b.rec||b.env||b.alta).localeCompare(a.rec||a.env||a.alta)).map(r=>{const k=costeRep(r);return it(r.eje,[(r.desp||"")+" · "+fmtF(r.env||r.alta)+(r.rec?" → "+fmtF(r.rec):" · en curso"),k.o==="albarán"?null:k.o],eur(k.v),null,null,r.rec?"ok":"warn");}));
    return;}

  if(I.mas==="brec"){const per=perD(),L=BREC.slice(),G=L.filter(b=>brecPend(b).guard>0),T=L.filter(b=>brecPend(b).taller>0);
    const V=[];L.forEach(b=>(b.vuelta||[]).forEach(v=>{if(v.f>=per.d&&v.f<=per.h)V.push({b,v,d:b.env&&b.env.f?dias(b.env.f,v.f):null,ah:precioDe(art(v.art))>0?Math.max(0,(+v.cant||0)*precioDe(art(v.art))-(+v.eur||0)):0});}));
    const ch=[];L.forEach(b=>(b.chat||[]).forEach(c=>{if(c.f>=per.d&&c.f<=per.h)ch.push(c);}));
    ent("barras para recuperar",[per.t]);
    if(!L.length){frase("No hay ninguna barra rota guardada para recuperar. Se guardan al apuntar el cambio de una barra rota (Más › Barras expulsoras).");return;}
    const nG=G.reduce((s,b)=>s+brecPend(b).guard,0),nT=T.reduce((s,b)=>s+brecPend(b).taller,0),ds=V.map(x=>x.d).filter(x=>x!=null),ah=V.reduce((s,x)=>s+x.ah,0),nV=V.reduce((s,x)=>s+(+x.v.cant||0),0);
    frase("Guardadas para recuperar: "+nG+". En Meyusa: "+nT+(T.length?" (la que más lleva, "+nD(Math.max(...T.map(b=>dias(b.env.f,h))))+")":"")+". "+cap(per.t)+" han vuelto "+nV+(nV===1?" recuperada":" recuperadas")+(ds.length?", Meyusa tarda "+nD(media(ds))+" de media":"")+(ah?" y se han ahorrado unos "+eur(ah)+" frente a comprarlas nuevas":"")+"."+(ch.length?" A chatarra: "+ch.reduce((s,c)=>s+(+c.cant||0),0)+".":""));
    if(G.length)lista("Guardadas",G.map(b=>it(nomArt(art(b.art)||{desc:"?"}),[maqN(b.maq)+" · rota el "+fmtF(b.f)],String(brecPend(b).guard),"uds",()=>irA("btb"),dias(b.f,h)>90?"warn":null)));
    if(T.length)lista("En Meyusa",T.map(b=>it(nomArt(art(b.art)||{desc:"?"}),["Enviada el "+fmtF(b.env.f)+(b.env.alb?" · albarán "+b.env.alb:"")],String(dias(b.env.f,h)),"días",()=>irA("btb"),ds.length&&dias(b.env.f,h)>media(ds)*1.5?"bad":"warn")));
    if(V.length)lista("Han vuelto ("+per.t+")",V.sort((a,b)=>b.v.f.localeCompare(a.v.f)).map(x=>it(nomArt(art(x.v.art)||{desc:"?"}),[fmtF(x.v.f)+(x.d!=null?" · tardó "+nD(x.d):"")+(+x.v.eur?" · pagado "+eur(+x.v.eur):"")],String(+x.v.cant||0),"uds",null,"ok")));
    return;}

  if(I.mas==="concl"){const L=INV.slice(),ab=L.filter(c=>c.estado==="abierta"),toca=ab.filter(c=>c.rev&&c.rev<=h),esp=ab.filter(c=>!(c.rev&&c.rev<=h)),fu=L.filter(c=>c.estado==="funciono"),no=L.filter(c=>c.estado==="no");
    ent("conclusiones");
    if(!L.length){frase("Todavía no hay conclusiones. Se apuntan desde 🔎 Investigar: la causa, la acción y cuándo comprobar si ha funcionado.");return;}
    frase((toca.length?toca.length+(toca.length===1?" toca comprobar ya":" tocan comprobar ya")+". ":"No hay ninguna por comprobar hoy. ")+(esp.length?esp.length+" esperando su fecha. ":"")+"Cerradas: "+fu.length+" han funcionado y "+no.length+" no."+(fu.length+no.length?" ("+Math.round(fu.length/(fu.length+no.length)*100)+" % de acierto)":""));
    const fila=(c,st)=>{const E=c.estado==="abierta"?evalConclusion(c):null;return it(c.t+" · "+c.causa,[c.accion?"Acción: "+c.accion:null,c.estado==="abierta"?(c.rev?"Comprobar el "+fmtF(c.rev):"Sin fecha")+(E&&E.dias?" · de momento: "+resConcTxt(c,E).toLowerCase():""):(c.estado==="funciono"?"Ha funcionado":c.estado==="no"?"No ha funcionado":"Cerrada")+(c.res&&c.res.pct!=null?" ("+(c.res.pct>0?"+":"")+c.res.pct+" %)":""),c.resp?"Se encarga: "+c.resp:null],null,null,()=>fichaConclusion(c),st);};
    if(toca.length)lista("Toca comprobar",toca.sort((a,b)=>a.rev.localeCompare(b.rev)).map(c=>fila(c,"warn")));
    if(esp.length)lista("Esperando",esp.sort((a,b)=>(a.rev||"9").localeCompare(b.rev||"9")).map(c=>fila(c)));
    if(fu.length)lista("Han funcionado",fu.sort((a,b)=>b.f.localeCompare(a.f)).map(c=>fila(c,"ok")));
    if(no.length)lista("No han funcionado",no.sort((a,b)=>b.f.localeCompare(a.f)).map(c=>fila(c,"bad")));return;}

  if(I.mas==="contar"){const S=recuentoSemana(),Pn=recuentoPendiente();ent("recuentos de la semana");
    if(!S.length){frase("Esta semana no toca contar nada: todo está contado a tiempo según su clase (A cada 4 semanas, B cada 8, C cada 16).");return;}
    const neg=S.filter(x=>x.neg).length;
    frase("Esta semana tocan "+S.length+(S.length===1?" recuento":" recuentos")+(Pn.length>S.length?" (hay "+Pn.length+" pendientes; se hacen "+RC_SEMANA+" por semana)":"")+"."+(neg?" "+neg+" están en negativo: esos van primero.":""));
    lista(null,S.map(x=>it(nomArt(x.a),[almN(x.l.id)+" · clase "+x.cl,x.neg?"En negativo":x.u?"Contado el "+fmtF(x.u):"Sin contar nunca"],fmtN(x.st),x.a.ud||"ud",()=>ficha(x.a),x.neg?"bad":x.cl==="A"?"warn":null)));
    if(!consulta)btn("Contar ahora",()=>formRecuento(S));return;}

  if(I.mas==="descuadre"){const per=P.def?{d:sumaDias(h,-364),h,t:"los últimos 12 meses"}:P,G={};let nR=0;
    todosMov().forEach(x=>{if(x.tipo!=="ajuste"||x.contado==null||x.f<per.d||x.f>per.h)return;const a=art(x.art);if(!a)return;nR++;const c=+x.cant||0;const g=G[a.id]=G[a.id]||{a,n:0,mal:0,falta:0,sobra:0,eur:0};g.n++;if(Math.abs(c)>1e-9){g.mal++;if(c<0)g.falta+=-c;else g.sobra+=c;g.eur+=Math.abs(c)*precioDe(a);}});
    const L=Object.values(G).filter(g=>g.mal).sort((a,b)=>b.eur-a.eur||b.mal-a.mal);ent("lo que más descuadra en los recuentos",[per.t]);
    if(!nR){frase("No hay recuentos en "+per.t+".");return;}
    if(!L.length){frase("En "+per.t+" todos los recuentos ("+nR+") han cuadrado.");return;}
    const nC=Object.values(G).length,eT=L.reduce((s,g)=>s+g.eur,0);
    frase("De "+nC+(nC===1?" artículo contado":" artículos contados")+" en "+per.t+", "+L.length+(L.length===1?" no ha cuadrado":" no han cuadrado")+" alguna vez ("+eur(eT)+" de diferencia en total, contando faltas y sobras). El que más: "+nomArt(L[0].a)+" ("+L[0].mal+" de "+L[0].n+(L[0].n===1?" recuento":" recuentos")+").");
    lista(null,L.slice(0,40).map(g=>it(nomArt(g.a),[g.mal+" de "+g.n+(g.n===1?" recuento":" recuentos")+" sin cuadrar",[g.falta?"faltaron "+fmtN(g.falta):null,g.sobra?"sobraron "+fmtN(g.sobra):null].filter(Boolean).join(" · ")+" "+(g.a.ud||"ud")],precioDe(g.a)?eur(g.eur):fmtN(g.falta+g.sobra),precioDe(g.a)?null:g.a.ud||"ud",()=>ficha(g.a),g.mal/g.n>=0.5?"bad":"warn")));
    nota("Si algo descuadra siempre, suele ser que no se apunta al sacarlo o que se cuenta en otro almacén. Para ver solo lo que ha faltado y su valor: «lo que ha faltado en los recuentos».");return;}

  if(I.mas==="limp"){const G=limpPorRevisar();ent("cambios de horno de Limpieza por revisar");
    if(!G.length){frase("No hay cambios de horno de Limpieza por revisar.");return;}
    frase("Hay "+G.length+(G.length===1?" cambio de horno de Limpieza":" cambios de horno de Limpieza")+" por revisar: hay que decir si son por una avería o no.");
    lista(null,G.map(g=>it(g.maq+" · "+g.que,[fmtF(g.f)+" · "+(g.orig||g.mot||"sin motivo")+(g.quien?" · "+respTxt(g.quien):""),g.L.map(x=>{const a=art(x.art);return(a?nomArt(a):"?")+" × "+fmtN(+x.cant||0);}).join(", ")],null,null,null,"warn")));
    if(!consulta)btn("Revisar ahora",()=>revisarLimpieza());return;}

  if(I.mas==="masx"){const per=perD(),S=artsQ(I.txt),ids=new Set(S.L.map(a=>a.id));ent("qué máquina cambia más",[I.txt,per.t]);
    if(!S.L.length||S.L.length===artsActivos().filter(a=>a.fam!=="eje").length){frase("No sé qué artículo es «"+I.txt+"». Prueba con el nombre como sale en el almacén, por ejemplo «qué máquina cambia más resistencias».");return;}
    const G={};todosMov().forEach(x=>{if(x.tipo!=="salida"||!ids.has(x.art)||x.f<per.d||x.f>per.h)return;const k=x.maq?maqN(x.maq):null;if(!k)return;const a=art(x.art),c=+x.cant||0;const g=G[k]=G[k]||{k,c:0,eur:0,n:0,ud:a.ud||"ud",u:""};g.c+=c;g.eur+=c*precioDe(a);g.n++;if(x.f>g.u)g.u=x.f;});
    const L=Object.values(G).sort((a,b)=>b.c-a.c||b.eur-a.eur);
    if(!L.length){frase("No hay salidas de «"+I.txt+"» con máquina en "+per.t+".");return;}
    const tot=L.reduce((s,g)=>s+g.c,0),med=tot/L.length;
    frase(cap(per.t)+": la que más cambia es la "+L[0].k+" ("+fmtN(L[0].c)+" "+L[0].ud+(L[0].eur?", "+eur(L[0].eur):"")+"), "+(med?(L[0].c/med).toFixed(1).replace(".",",")+" veces la media":"")+" de las "+L.length+" máquinas que han cambiado.");
    lista(null,L.map(g=>it(g.k,[g.n+(g.n===1?" vez":" veces")+" · la última el "+fmtF(g.u)],fmtN(g.c),g.ud+(g.eur?" · "+eur(g.eur):""),()=>pon("todo sobre la "+g.k),g.c>=med*2&&L.length>2?"bad":g.c>med*1.3&&L.length>2?"warn":null)));
    ign(S.ign);return;}

  if(I.mas==="precios"){const per=perD("ano"),L=[];artsActivos().forEach(a=>(a.ph||[]).forEach(x=>{if(x.f>=per.d&&x.f<=per.h&&+x.de>0&&+x.a>0&&+x.de!==+x.a)L.push({a,x,pct:Math.round((+x.a/+x.de-1)*1000)/10});}));
    ent("cambios de precio",[per.t]);
    if(!L.length){frase("No hay cambios de precio guardados en "+per.t+". La app guarda el precio anterior cada vez que se cambia el de un artículo (en su ficha, al poner precios o al leer un albarán), así que irán saliendo aquí.");return;}
    const S=L.filter(x=>x.pct>0),B=L.filter(x=>x.pct<0);
    frase(cap(per.t)+": "+S.length+(S.length===1?" subida":" subidas")+" y "+B.length+(B.length===1?" bajada":" bajadas")+" de precio."+(S.length?" La que más: "+nomArt(S.sort((a,b)=>b.pct-a.pct)[0].a)+" (+"+String(S[0].pct).replace(".",",")+" %).":""));
    if(S.length)lista("Han subido",S.map(x=>it(nomArt(x.a),[fmtF(x.x.f)+" · de "+eur(+x.x.de)+" a "+eur(+x.x.a)+(x.x.por?" · "+x.x.por:"")],"+"+String(x.pct).replace(".",",")+" %",null,()=>ficha(x.a),x.pct>=10?"bad":"warn")));
    if(B.length)lista("Han bajado",B.sort((a,b)=>a.pct-b.pct).map(x=>it(nomArt(x.a),[fmtF(x.x.f)+" · de "+eur(+x.x.de)+" a "+eur(+x.x.a)],String(x.pct).replace(".",",")+" %",null,()=>ficha(x.a),"ok")));return;}

  if(I.mas==="prov"||I.mas==="provs"){const per=perD("ano"),G={};
    todosMov().forEach(x=>{if(x.tipo!=="entrada"||x.f<per.d||x.f>per.h)return;const a=art(x.art);if(!a)return;const pid=x.prov||a.prov||"";const g=G[pid]=G[pid]||{pid,n:0,eur:0,arts:{},sinP:0,alb:new Set(),u:""};const c=+x.cant||0,p=precioDe(a);g.n++;g.eur+=c*p;if(!p)g.sinP++;if(x.alb)g.alb.add(x.alb);if(x.f>g.u)g.u=x.f;const r=g.arts[a.id]=g.arts[a.id]||{a,c:0,eur:0};r.c+=c;r.eur+=c*p;});
    if(I.mas==="prov"){const g=G[I.prov.id];ent("compras a "+I.prov.nom,[per.t]);
      if(!g){frase("No hay entradas de "+I.prov.nom+" en "+per.t+".");return;}
      frase(cap(per.t)+" se le ha comprado a "+I.prov.nom+" por unos "+eur(g.eur)+" en "+g.n+(g.n===1?" entrada":" entradas")+(g.alb.size?" ("+g.alb.size+(g.alb.size===1?" albarán":" albaranes")+")":"")+". La última, el "+fmtF(g.u)+"."+(g.sinP?" "+g.sinP+(g.sinP===1?" línea sin precio, no suma.":" líneas sin precio, no suman."):""));
      lista("Qué se le ha comprado",Object.values(g.arts).sort((a,b)=>b.eur-a.eur||b.c-a.c).map(r=>it(nomArt(r.a),null,fmtN(r.c),(r.a.ud||"ud")+(r.eur?" · "+eur(r.eur):""),()=>ficha(r.a))));
      nota("El importe se calcula con el precio actual de cada artículo (las entradas no guardan el precio de la factura).");return;}
    const L=Object.values(G).sort((a,b)=>b.eur-a.eur);ent("compras por proveedor",[per.t]);
    if(!L.length){frase("No hay entradas en "+per.t+".");return;}
    const tot=L.reduce((s,g)=>s+g.eur,0);
    const LP=L.filter(g=>g.pid),sp=L.find(g=>!g.pid);
    frase(cap(per.t)+": "+eur(tot)+" en compras"+(LP.length?" a "+LP.length+(LP.length===1?" proveedor":" proveedores")+". El que más: "+provN(LP[0].pid)+" ("+eur(LP[0].eur)+(tot?", "+Math.round(LP[0].eur/tot*100)+" %":"")+").":".")+(sp?" Hay "+eur(sp.eur)+" en entradas sin proveedor apuntado: si se pone el proveedor en la entrada o en la ficha del artículo, saldrá bien repartido.":""));
    lista(null,L.map(g=>it(provN(g.pid)||"Sin proveedor apuntado",[g.n+(g.n===1?" entrada":" entradas")+" · la última el "+fmtF(g.u)],eur(g.eur),tot?Math.round(g.eur/tot*100)+" %":null,g.pid?()=>pon("cuánto le hemos comprado a "+provN(g.pid)+" "+per.t):null)));
    nota("Importes con el precio actual de cada artículo.");return;}

  if(I.mas==="sinapunt"){const D=I.dias||30,d0=sumaDias(h,-D),U={};evTodo().forEach(e=>{const mq=mqEv(e);if(!mq)return;if(!U[mq.id]||e.f>U[mq.id])U[mq.id]=e.f;});
    ejePend().forEach(p=>{const mq=cat.maquinas.find(x=>x.cod===p.maq);if(mq&&(!U[mq.id]||p.f>U[mq.id]))U[mq.id]=p.f;});
    const L=cat.maquinas.filter(x=>!x.baja&&!x.inactiva).map(x=>({m:x,u:U[x.id]||""})).filter(x=>!x.u||x.u<d0).sort((a,b)=>(a.u||"").localeCompare(b.u||""));
    ent("máquinas sin nada apuntado",["más de "+nD(D)]);
    if(!L.length){frase("Todas las máquinas tienen algo apuntado (pistones, barras, horno, aceite…) en los últimos "+nD(D)+".");return;}
    frase(L.length+(L.length===1?" máquina no tiene":" máquinas no tienen")+" nada apuntado desde hace más de "+nD(D)+". Si estaban trabajando, es que no se están apuntando los cambios; si estaban paradas, es normal.");
    lista(null,L.map(x=>it(x.m.cod,[x.m.nave||null,x.u?"Lo último, el "+fmtF(x.u):"Nunca se ha apuntado nada"],x.u?String(dias(x.u,h)):"—",x.u?"días":null,()=>pon("todo sobre la "+x.m.cod),!x.u||dias(x.u,h)>D*2?"bad":"warn")));
    nota("Cuenta cualquier cosa apuntada a la máquina: cambios de pistón, ejes, barras, tornillos, horno, aceites. Puedes cambiar los días: «máquinas sin nada apuntado en 15 días».");return;}

  if(I.mas==="mantener"){const per=perD("ano"),EV=evTodo().filter(e=>e.f>=per.d&&e.f<=per.h),porM={};
    EV.forEach(e=>{const mq=mqEv(e);if(!mq)return;const g=porM[mq.id]=porM[mq.id]||{m:mq,eur:0,fam:{}};const v=+e.eur||0;g.eur+=v;g.fam[e.fam]=(g.fam[e.fam]||0)+v;});
    const L=Object.values(porM).filter(g=>g.eur>0).sort((a,b)=>b.eur-a.eur),med=L.length?L.reduce((s,g)=>s+g.eur,0)/L.length:0;
    if(!m){ent("coste de mantener cada máquina",[per.t]);if(!L.length){frase("No hay gasto con máquina en "+per.t+".");return;}
      frase(cap(per.t)+": la más cara de mantener es la "+L[0].m.cod+" ("+eur(L[0].eur)+", "+(med?(L[0].eur/med).toFixed(1).replace(".",","):"—")+" veces la media de "+eur(med)+").");
      lista(null,L.map(g=>it(g.m.cod,Object.entries(g.fam).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>k+" "+eur(v)).join(" · "),eur(g.eur),null,()=>pon("cuánto cuesta mantener la "+g.m.cod+" "+per.t),g.eur>med*1.5?"bad":g.eur>med?"warn":null)));
      nota("Suma pistones, reparaciones de ejes, barras, tornillos, horno, aceites y lo demás que sale con máquina, a precio de cada artículo.");return;}
    const g=porM[m.id]||{eur:0,fam:{}},pos=L.findIndex(x=>x.m.id===m.id)+1,AV=AVER.filter(a=>(a.maq===m.id||a.maq===m.cod)&&a.f>=per.d&&a.f<=per.h);
    ent("coste de mantener la "+m.cod,[per.t]);
    if(!g.eur){frase("La "+m.cod+" no tiene gasto apuntado en "+per.t+".");return;}
    frase(cap(per.t)+", mantener la "+m.cod+" ha costado "+eur(g.eur)+(med?": "+(g.eur>med?(g.eur/med).toFixed(1).replace(".",",")+" veces la media de las máquinas ("+eur(med)+")":"por debajo de la media de las máquinas ("+eur(med)+")"):"")+(pos?". Es la "+pos+"ª de "+L.length:"")+"."+(AV.length?" De eso, "+eur(AV.reduce((s,a)=>s+avCoste(a),0))+" son de "+AV.length+(AV.length===1?" avería":" averías")+(AV.filter(a=>a.evit===true).length?" ("+eur(AV.filter(a=>a.evit===true).reduce((s,a)=>s+avCoste(a),0))+" evitables)":"")+".":""));
    const famMed={};L.forEach(x=>Object.entries(x.fam).forEach(([k,v])=>{famMed[k]=(famMed[k]||0)+v/L.length;}));
    lista("En qué se va",Object.entries(g.fam).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>it(k,famMed[k]?"Media de las máquinas: "+eur(famMed[k]):null,eur(v),null,()=>pon(k.toLowerCase()+" de la "+m.cod+" "+per.t),famMed[k]&&v>famMed[k]*1.5?"bad":famMed[k]&&v>famMed[k]?"warn":"ok")));
    if(AV.length)lista("Averías",AV.sort((a,b)=>b.f.localeCompare(a.f)).map(a=>it(a.t,[fmtF(a.f)+" · "+(a.causa||"sin causa")],eur(avCoste(a)),null,()=>fichaAveria(a),a.evit===true?"bad":a.estado==="abierta"?"warn":"ok")));return;}
}

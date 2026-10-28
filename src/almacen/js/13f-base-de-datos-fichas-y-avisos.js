/* ===== BASE DE DATOS: «todo sobre…», lo raro, personas y planificar =====
   intencionA2(q) va antes que intencionA; pintaIntA2 contesta. */
function intencionA2(q){const o={q,maq:maqDeQ(q),cod:codQ(q),nave:naveQA(q)};const M=(modo,x)=>Object.assign(o,{modo},x||{});
  if(/\bresumen (del|de este|de) mes\b|\bresumen mensual\b|\bcomo (ha ido|va) el mes\b/.test(q))return M("resumen");
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
  const kv=(tit,filas)=>add(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:tit})),el("div",{class:"bd"},el("dl",{class:"bd-kv"},[].concat(...filas.filter(Boolean).map(([k,v])=>[el("dt",{text:k}),el("dd",{text:v})]))))]));
  const copiar=(t,txt)=>add(el("button",{type:"button",class:"btn sec",style:"margin-top:8px",text:t,onclick:async e=>{try{await navigator.clipboard.writeText(txt);toast("Copiado: pégalo donde quieras");}catch(er){dlg("Para copiar",[el("textarea",{style:"width:100%;min-height:220px",text:txt})],[{t:"Cerrar",cls:"sec"}]);}}}));
  const y0=h.slice(0,4)+"-01-01",ano=e=>e.f>=y0;const EV=evTodo();
  const pistM=id=>todosPist().filter(p=>p.maq===id);

  if(I.modo==="todomaq"){const m=I.maq;if(!m){ent("máquina",[I.cod]);frase("No encuentro la máquina "+I.cod+".");return;}
    const hd=hoyDe(m),ej=ejeEnMaq(m.cod),ps=pistM(m.id).filter(p=>p.f>=y0),u=ultimoPist(m.id),fs=[...new Set(pistM(m.id).map(p=>p.f))].sort(),iv=fs.slice(1).map((f,i)=>dias(fs[i],f));
    const E=EV.filter(e=>{const x=mqEv(e);return x&&x.id===m.id;}),Ea=E.filter(ano),eu=Ea.reduce((s,e)=>s+e.eur,0),G={};Ea.forEach(e=>{G[e.fam]=(G[e.fam]||0)+e.eur;});
    const reps=todasRep().filter(r=>r.env&&r.res!=="anulada"&&(r.maq===m.cod||r.maq===m.id)),repA=reps.filter(r=>r.env>=y0);
    const ultQ=E.slice().sort((a,b)=>(b.f+String(b.ts).padStart(15,"0")).localeCompare(a.f+String(a.ts).padStart(15,"0"))).find(e=>e.quien);
    ent("todo sobre",[m.cod]);frase(m.cod+" ("+zonaDe(m)+"): este año lleva "+ps.length+(ps.length===1?" cambio de pistón":" cambios de pistón")+", "+repA.length+(repA.length===1?" reparación de eje":" reparaciones de eje")+" y "+eur(eu)+" gastados.");
    kv("Lo que monta ahora",[["Molde",moldeTxt(moldeDe(hd.molde))||"—"],["Contenedor",(contDe(hd.cont)||{}).cod||"—"],["Eje",ej?ej.cod+" · "+ejeRef(ej):"—"],["Pistón",diamDe(m)||"—"],["Horno",hornoTxt?hornoTxt(m)||"—":"—"]]);
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

  if(I.modo==="pedirsemana"){const PT=prevTodo(),SA={};PT.arts.forEach(x=>{SA[x.a.id]=x;});
    const L=artsActivos().filter(a=>a.fam!=="eje"&&!a.pedido).map(a=>{const c=consDia(a),st=stockDe(a.id),pp=puntoPedido(a),dp=c>0?(st-pp)/c:null,x=SA[a.id];const cont=CONTABLE(a);
      const cant=Math.max(x?x.pedir:0,redU(pp+c*14-st,cont));return{a,st,pp,dp,cant,n:nivel(a)};}).filter(x=>(x.n==="bad"||x.n==="warn"||(x.dp!=null&&x.dp<=7))&&x.cant>0)
      .sort((a,b)=>(a.n==="bad"?0:1)-(b.n==="bad"?0:1)||(a.dp==null?0:a.dp)-(b.dp==null?0:b.dp));
    ent("lo que hay que pedir esta semana");frase(L.length?"Esta semana hay que pedir "+L.length+(L.length===1?" artículo.":" artículos.")+(L.some(x=>x.n==="bad")?" "+L.filter(x=>x.n==="bad").length+" ya están bajo mínimo.":""):"Esta semana no hace falta pedir nada.");
    if(L.length){const porP={};L.forEach(x=>{const p=provN(x.a.prov)||"Sin proveedor";(porP[p]=porP[p]||[]).push(x);});
      Object.entries(porP).forEach(([p,xs])=>lista(p,xs.map(x=>it(nomArt(x.a),["Hay "+fmtN(Math.round(x.st*10)/10)+" · punto de pedido "+fmtN(Math.round(x.pp*10)/10),x.n==="bad"?"Bajo mínimo":x.dp!=null&&x.dp>0?"Llega al punto de pedido en "+Math.ceil(x.dp)+" días":"En el punto de pedido"],fmtN(x.cant),x.a.ud||"ud",()=>ficha(x.a),x.n==="bad"?"bad":"warn")),fmtN(xs.length)+" artículos"));
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

/* ===== ANÁLISIS ABC E INVENTARIO CÍCLICO (como en SAP) =====
   ABC: con el gasto de los últimos 12 meses, A = los pocos artículos que suman el 80 % del gasto, B = hasta el 95 %, C = el resto.
   Inventario cíclico: cada artículo se cuenta en cada almacén donde está cada cierto tiempo según su clase (A 4 semanas, B 8, C 16);
   cada semana la app propone unos pocos (primero los que no cuadran, luego los A) para que el stock cuadre sin recuentos grandes. */
const ABC_DIAS={A:28,B:56,C:112},RC_SEMANA=12;
function datosABC(){const h=hoy(),d0=sumaDias(h,-364),G={};
  todosMov().forEach(m=>{if(m.tipo!=="salida"||m.inc||m.f<d0)return;const a=art(m.art);if(!a||a.fam==="eje")return;const g=G[a.id]=G[a.id]||{a,cant:0,eur:0};const c=+m.cant||0;g.cant+=c;g.eur+=c*precioDe(a);});
  const L=artsActivos().filter(a=>a.fam!=="eje").map(a=>G[a.id]||{a,cant:0,eur:0}).sort((x,y)=>y.eur-x.eur||y.cant-x.cant);const tot=L.reduce((s,x)=>s+x.eur,0);let ac=0;
  L.forEach(x=>{const prev=ac;ac+=x.eur;x.pct=tot?x.eur/tot*100:0;x.clase=!tot||!(x.eur>0)?"C":prev<tot*0.8?"A":prev<tot*0.95?"B":"C";});
  const R={A:{n:0,eur:0},B:{n:0,eur:0},C:{n:0,eur:0}};L.forEach(x=>{R[x.clase].n++;R[x.clase].eur+=x.eur;});const M={};L.forEach(x=>M[x.a.id]=x.clase);
  return{L,tot,R,M,sinP:L.filter(x=>x.cant>0&&!precioDe(x.a)).length};}
function ultConteoAlm(artId,almId){let f="";todosMov().forEach(m=>{if(m.art===artId&&m.alm===almId&&m.tipo==="ajuste"&&m.contado!=null&&m.f>f)f=m.f;});return f;}
/* qué toca contar: pares artículo + almacén vencidos según su clase; los que no cuadran (en negativo) siempre */
function recuentoPendiente(){const A=datosABC(),h=hoy(),out=[];
  artsActivos().filter(a=>a.fam!=="eje").forEach(a=>{const cl=A.M[a.id]||"C";almsDe(a).forEach(l=>{const st=stockDe(a.id,l.id),u=ultConteoAlm(a.id,l.id),neg=st<0;
    const vence=u?sumaDias(u,ABC_DIAS[cl]):null;if(!neg&&vence&&vence>h)return;if(!neg&&!u&&st===0)return;
    out.push({a,l,cl,st,u,neg,atraso:u?dias(vence,h):9999});});});
  const ord={A:0,B:1,C:2};return out.sort((x,y)=>(y.neg-x.neg)||ord[x.cl]-ord[y.cl]||y.atraso-x.atraso);}
const recuentoSemana=()=>recuentoPendiente().slice(0,RC_SEMANA);
function formRecuento(L){if(!L.length){toast("No hay nada que contar");return;}const c={},f={f:hoy()};const tb=el("tbody");
  L.forEach(x=>{const k=x.a.id+"|"+x.l.id,cel=el("td",{class:"r num",text:"—"});const upd=v=>{const n=parseN(v);const df=isFinite(n)?n-x.st:null;cel.textContent=df==null?"—":(df>=0?"+":"−")+fmtN(Math.abs(df));cel.className="r num"+(df&&(n===0||Math.abs(df)/Math.max(n,1)>0.1)?" bad":"");};
    tb.appendChild(el("tr",{},[el("td",{},[el("div",{text:(TEC(x.a.fam)?nomBT(x.a):x.a.desc)}),el("div",{class:"sub",text:[x.l.nom,x.a.ubic,"clase "+x.cl,x.u?"contado el "+fmtF(x.u):"nunca contado"].filter(Boolean).join(" · ")})]),el("td",{class:"r num",text:fmtN(x.st)}),
      el("td",{},inp("rc"+k.replace(/\W/g,""),"",v=>{c[k]=v;upd(v);},{inputmode:"decimal",class:"num",style:"width:64px;padding:7px 6px;font-size:16px"})),cel]));});
  dlg("Recuento",[fld("Fecha",inp("rcF",f.f,v=>f.f=v,{type:"date",max:hoy()})),el("p",{class:"hint",style:"margin:0",text:"Cuenta lo que hay de verdad y escríbelo. Deja en blanco lo que no puedas contar. La diferencia queda como ajuste, no como consumo."}),
    el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Artículo"}),el("th",{class:"r",text:"Teórico"}),el("th",{text:"Contado"}),el("th",{class:"r",text:"Dif."})])),tb]))],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar recuento",fn:async()=>{if(!db){toast("No se puede guardar");return false;}const list=[];
      L.forEach(x=>{const n=parseN(c[x.a.id+"|"+x.l.id]);if(!isFinite(n)||n<0)return;const t=stockA(x.a.id,x.l.id,f.f);list.push({f:f.f,tipo:"ajuste",art:x.a.id,alm:x.l.id,cant:Math.round((n-t)*1000)/1000,contado:n,teorico:t,nota:"Recuento cíclico (clase "+x.cl+")"});});
      if(!list.length){toast("No has contado nada");return false;}try{await addMovs(list);}catch(e){toast("No se pudo guardar");return false;}const dif=list.filter(r=>r.cant).length;toast("Recuento guardado: "+list.length+" contados, "+dif+" con diferencia");render(true);}}]);}
function vABC(v){const A=datosABC(),P=recuentoPendiente(),S=P.slice(0,RC_SEMANA);const h=hoy();
  v.appendChild(el("dl",{class:"kpis num"},[["Gasto 12 meses",eur(A.tot)],["Clase A",A.R.A.n+" art. · "+(A.tot?Math.round(A.R.A.eur/A.tot*100):0)+" %"],["Clase B",A.R.B.n+" art."],["Clase C",A.R.C.n+" art."]].map(([x,z])=>el("div",{},[el("dt",{text:x}),el("dd",{text:z})]))));
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Recuento de esta semana"}),el("span",{class:"der sub",text:P.length+" pendientes en total"})]),
    el("div",{class:"bd",style:"display:grid;gap:10px"},[S.length?el("div",{class:"lst"},S.map(x=>el("div",{class:"it",style:"cursor:default"},[el("span",{class:"stripe "+(x.neg?"bad":x.cl==="A"?"warn":"")}),el("div",{class:"ppal"},[el("div",{class:"t1",text:(TEC(x.a.fam)?nomBT(x.a):x.a.desc)}),el("div",{class:"t2",text:[x.l.nom,"clase "+x.cl,x.neg?"no cuadra (en negativo)":x.u?"contado el "+fmtF(x.u):"nunca contado"].join(" · ")})]),el("div",{class:"cant num"},[el("b",{text:fmtN(x.st)}),el("small",{text:x.a.ud||"ud"})])]))):el("p",{class:"hint",style:"margin:0",text:"Todo está contado a tiempo. ¡Bien!"}),
      S.length?el("div",{class:"acciones"},[el("button",{type:"button",class:"btn",text:"Contar ahora",onclick:()=>formRecuento(S)})]):null,
      el("p",{class:"hint",style:"margin:0",text:"Cada semana salen hasta "+RC_SEMANA+": primero los que no cuadran, luego los A. Cada artículo se cuenta en cada almacén: los A cada 4 semanas, los B cada 8 y los C cada 16."})])]));
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Análisis ABC (12 meses)"}),el("span",{class:"der sub",text:"dónde se va el dinero"})]),
    A.L.filter(x=>x.eur>0).length?cTabla(["","Clase","Gasto","% del total","Último recuento"],A.L.filter(x=>x.eur>0).slice(0,60).map(x=>{const us=almsDe(x.a).map(l=>ultConteoAlm(x.a.id,l.id)).filter(Boolean).sort();return[(TEC(x.a.fam)?nomBT(x.a):x.a.desc),x.clase,eur(x.eur),fmtN(Math.round(x.pct*10)/10)+" %",us.length?fmtF(us[0]):"nunca"];}),[2,3]):el("p",{class:"hint",style:"padding:10px 14px",text:"Todavía no hay gasto con precio en los últimos 12 meses."}),
    A.sinP?el("div",{class:"banner w",style:"margin:10px 14px",text:A.sinP+" artículos se gastan pero no tienen precio: cuentan como C. Ponles precio en su ficha para que el ABC sea real."}):null,
    el("p",{class:"hint",style:"padding:0 14px 12px",text:"A: los pocos artículos que se llevan el 80 % del gasto (vigílalos y cuéntalos a menudo). B: hasta el 95 %. C: el resto, muchos artículos que valen poco."})]));}

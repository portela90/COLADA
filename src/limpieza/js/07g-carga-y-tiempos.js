/* ===== Investigar · carga de cada trabajador, trabajos que se pueden pasar a otro y tiempos que se ajustan solos =====
   (Cristian, 18/11/2026)
   - Tiempos: para cada trabajo (fijo, habitual o aviso) la mediana de las últimas 20 veces con «Empezar» y «Terminar»
     (sin las que pasan del triple de lo normal). El tiempo propuesto mezcla tu estimado con lo real:
     propuesto = (5 × tu estimado + n × real) / (5 + n). Con pocas veces pesa más lo tuyo; con muchas, lo real.
     Nada cambia sin ti: «Aplicar» guarda el propuesto en la tarea.
   - Pasar trabajos: a quien pase del 85 % se le buscan trabajos fijos que pueda hacer otro del mismo equipo, que trabaje
     esos días, en su turno, y que después del cambio no pase del 85 %. Mejor quien ya lo ha hecho y lo hace más rápido. */
const INV_LIM=85,INV_K=5,INV_ULT=20;
const invMed=a=>{const b=a.slice().sort((x,y)=>x-y),n=b.length;return n?(n%2?b[(n-1)/2]:(b[n/2-1]+b[n/2])/2):null;};
const invTKey=o=>o.tarea_id?"f:"+o.tarea_id:o.habitual_id?"h:"+o.habitual_id:"a:"+invClave(o);
const invDiasTarea=t=>(t.dias||[]).includes("todos")?(t.equipo==="Finde"?["sabado","domingo"]:["lunes","martes","miercoles","jueves","viernes"]):(t.dias||[]);
const invDiasTxt=t=>(t.dias||[]).includes("todos")?"Todos":(t.dias||[]).map(d=>(DIAS_N[d]||d).slice(0,3)).join(", ");

/* tiempos de cada trabajo: tu estimado, lo real y lo propuesto */
function invTiempos(O,TF,HB){const G={};
  O.forEach(o=>{if(o.borrado)return;const k=invTKey(o);const g=G[k]=G[k]||{k,tipo:k[0]==="f"?"fija":k[0]==="h"?"habitual":"aviso",titulo:String(o.titulo||"").replace(/\s*·.*$/,""),tot:0,hechas:0,real:0,R:[],E:{}};
    g.tot++;if(o.estado!=="hecha")return;g.hechas++;if(+o.minutos_est>0)g.E[+o.minutos_est]=(g.E[+o.minutos_est]||0)+1;
    if(invReal(o)&&+o.minutos>0&&+o.minutos<=480){g.real++;g.R.push({f:o.fecha+(o.inicio||""),m:+o.minutos,n:o.hecho_por_n});}});
  const T={};Object.values(G).forEach(g=>{
    g.ref=g.tipo==="fija"?(TF||[]).find(t=>"f:"+t.id===g.k):g.tipo==="habitual"?(HB||[]).find(h=>"h:"+h.id===g.k):null;if(g.ref)g.titulo=g.ref.titulo;
    /* tu estimado: el de la tarea; en los avisos, el que más se repite */
    g.est=g.ref?(+g.ref.minutos_est||null):(Object.entries(g.E).sort((a,b)=>b[1]-a[1])[0]||[null])[0];g.est=g.est?+g.est:null;
    g.R.sort((a,b)=>b.f.localeCompare(a.f));const ult=g.R.slice(0,INV_ULT),m0=invMed(ult.map(x=>x.m));const R=ult.filter(x=>x.m<=3*m0);
    g.n=R.length;g.med=invMed(R.map(x=>x.m));
    g.prop=g.n?(g.est?Math.round((INV_K*g.est+g.n*g.med)/(INV_K+g.n)):(g.n>=3?Math.round(g.med):null)):null;
    /* por persona (todas sus veces, sin las disparatadas) */
    const P={};g.R.filter(x=>x.n&&x.m<=3*m0).forEach(x=>{(P[x.n]=P[x.n]||[]).push(x.m);});g.P={};Object.entries(P).forEach(([n,a])=>{if(a.length>=3)g.P[n]={c:a.length,med:invMed(a)};});
    T[g.k]=g;});
  return T;}
/* el tiempo propuesto sirve para contar los trabajos hechos sin «Empezar» que no tienen tiempo estimado */
function invUsaTiempos(T){Object.keys(INV_TPROP).forEach(k=>delete INV_TPROP[k]);Object.values(T).forEach(g=>{if(g.prop)INV_TPROP[g.k]=g.prop;});}

/* trabajos fijos de una persona que podría hacer otra */
function invPasar(p,ctx){const{X,J,F,O,TF,T,W}=ctx;const w=(J[p.n]||{}).w;if(!w||!p.jor)return[];
  const satDe=n=>X.sat.find(q=>q.n===n);const enP=o=>o.fecha>=F.d0&&o.fecha<=F.d1;
  const dur=t=>{const g=T["f:"+t.id];return(g&&g.prop)||+t.minutos_est||0;};
  const turnoDe=(c,t)=>t.equipo==="Finde"?c.turno_finde:c.turno_semana;
  return(TF||[]).filter(t=>t.activo!==false&&!t.todo_equipo&&(t.asignados||[]).includes(w.id)).map(t=>{
    const veces=O.filter(o=>o.tarea_id===t.id&&enP(o)&&!o.no_se_hace&&(o.asignados||[]).includes(w.id)).length;const m=veces*dur(t);
    const cands=(W||[]).filter(c=>c.id!==w.id&&c.activo!==false&&c.rol!=="admin"&&c.jornada!=="externo"&&(c.equipos||[]).includes(t.equipo)&&!(t.asignados||[]).includes(c.id)
        &&invDiasTarea(t).every(d=>((c.horario||{})[d]||[]).length)&&(!t.turno||!turnoDe(c,t)||turnoDe(c,t)===t.turno))
      .map(c=>{const q=satDe(c.nombre);const sin=!q||!q.nt||!q.jor;const g=T["f:"+t.id];
        return{c,sin,antes:sin?null:invPct(q.cont,q.jor),despues:sin?null:invPct(q.cont+m,q.jor),hecho:O.filter(o=>o.tarea_id===t.id&&o.hecho_por_n===c.nombre&&o.estado==="hecha").length,med:g&&g.P[c.nombre]?g.P[c.nombre].med:null};})
      .filter(x=>x.sin||x.despues<=INV_LIM)
      .sort((a,b)=>(a.sin-b.sin)||((b.hecho>0)-(a.hecho>0))||((a.med||1e9)-(b.med||1e9))||(a.despues-b.despues));
    return{t,veces,m,cands,antes:invPct(p.cont,p.jor),despues:invPct(Math.max(0,p.cont-m),p.jor)};}).filter(x=>x.m>0).sort((a,b)=>b.m-a.m);}
const invCandTxt=x=>x.c.nombre+(x.sin?" (sin datos: no tiene nada apuntado)":": del "+x.antes+" % al "+x.despues+" %")+(x.hecho?" · ya lo ha hecho "+x.hecho+(x.hecho===1?" vez":" veces")+(x.med?" ("+invH(x.med)+" de media)":""):"");
/* cambiar la persona de un trabajo fijo (desde hoy, todos los días que le toque) */
function invHacerPasar(t,de,a,re){
  dlg("Pasar un trabajo fijo",el("div",null,[el("p",{style:"margin-top:0",text:"Desde hoy, «"+t.titulo+"» ("+invDiasTxt(t)+") lo hará "+a.nombre+" en vez de "+de.nombre+"."}),
    el("p",{class:"hint",text:"Cambian también los trabajos de esta tarea que aún están pendientes. Los ya hechos no se tocan. Si te arrepientes, lo cambias en Tareas."})]),
    [{t:"Cancelar",cls:"sec"},{t:"Pasar",fn:async()=>{const p={id:t.id,titulo:t.titulo,minutos_est:t.minutos_est||null,tipo:t.tipo,descripcion:t.descripcion,activo:t.activo,dias:t.dias,equipo:t.equipo,turno:t.turno,
      asignados:(t.asignados||[]).map(x=>x===de.id?a.id:x),todo_equipo:t.todo_equipo,alm_art:t.alm_art||""};
      await rpc("tarea_guardar",{p_tok:S.tok,p});toast("Pasado a "+a.nombre);if(re)re();}}]);}
/* lista de propuestas (en la ficha y en la tarjeta) */
function invPasarLista(p,ctx,cerrar){const L=invPasar(p,ctx);const w=(ctx.J[p.n]||{}).w;
  if(!L.length)return el("p",{class:"hint",text:"No tiene trabajos fijos con tiempo que se puedan pasar en este periodo."});
  /* las que hacen falta para bajar del 85 % van primero */
  let resto=p.cont;const nec=new Set();L.forEach(x=>{if(invPct(resto,p.jor)>INV_LIM&&x.cands.some(c=>!c.sin)){nec.add(x.t.id);resto-=x.m;}});
  return el("div",null,L.map(x=>{const best=x.cands.find(c=>!c.sin),otros=x.cands.filter(c=>c!==best);
    return el("div",{class:"ot",style:"margin:0 0 8px"},[el("div",{class:"t",text:x.t.titulo+(nec.has(x.t.id)?"":" (opcional)")}),
      el("div",{class:"d",text:invDiasTxt(x.t)+" · "+x.veces+(x.veces===1?" vez":" veces")+" en el periodo · "+invH(x.m)+". "+p.n+" bajaría del "+x.antes+" % al "+x.despues+" %."}),
      best?el("div",{class:"row",style:"align-items:center;gap:8px;margin-top:6px"},[el("span",{style:"flex:1;min-width:0",text:"Mejor opción: "+invCandTxt(best)}),
        el("button",{class:"btn peq",type:"button",text:"Pasar",onclick:()=>invHacerPasar(x.t,w,best.c,()=>{if(cerrar)cerrar();if(ctx.re)ctx.re();})})]):
        el("p",{class:"hint",style:"margin:6px 0 0",text:"Nadie del equipo que trabaje esos días tiene hueco para esto sin pasar del "+INV_LIM+" %."}),
      otros.length?el("small",{class:"hint",style:"display:block;margin-top:4px",text:"Otras opciones: "+otros.slice(0,3).map(invCandTxt).join(" · ")}):null]);}));}

/* ficha de un trabajador: su saturación día a día y todos sus trabajos */
function invFichaPersona(p){const ctx=S.invX;if(!ctx)return;const{X,F,TF,T,J}=ctx;const w=(J[p.n]||{}).w||{};const pc=p.jor?invPct(p.cont,p.jor):null;
  const D=Object.entries(p.D||{}).sort((a,b)=>a[0].localeCompare(b[0]));
  const fijas=(TF||[]).filter(t=>t.activo!==false&&(t.todo_equipo?(w.equipos||[]).includes(t.equipo):(t.asignados||[]).includes(w.id)));
  const G={};X.H.filter(o=>o.hecho_por_n===p.n).forEach(o=>{const k=invTKey(o);const g=G[k]=G[k]||{t:String(o.titulo||"").replace(/\s*·.*$/,""),fija:!!o.tarea_id,n:0,min:0,real:0,L:[]};g.n++;g.min+=invMin(o);if(invReal(o))g.real++;g.L.push(o);});
  const hechos=Object.values(G).sort((a,b)=>b.min-a.min);let cerrar=null;
  const tab=(cols,filas,click)=>el("div",{style:"overflow:auto"},el("table",{class:"g-tab"},[el("thead",null,el("tr",null,cols.map(h=>el("th",{text:h})))),
    el("tbody",null,filas.map((f,i)=>el("tr",click?{style:"cursor:pointer",onclick:()=>click(i)}:null,f.map((v,j)=>j===0&&click?el("td",null,el("span",{style:"color:var(--acc);font-weight:600",text:String(v)+" ›"})):el("td",{text:String(v)})))))]));
  const cuerpo=el("div",null,[
    el("p",{style:"margin-top:0;font-weight:600",text:F.t.charAt(0).toUpperCase()+F.t.slice(1)+": "+(pc==null?"sin horas de jornada":pc+" % de saturación ("+invH(p.cont)+" de "+invH(p.jor)+" de jornada)")+". "+p.nt+(p.nt===1?" trabajo":" trabajos")+(p.nt?", "+invPct(p.real,p.nt)+" % con tiempo real":"")+"."}),
    !p.nt?el("div",{class:"aviso",text:"No tiene ningún trabajo apuntado a su nombre: su saturación no se puede saber. Si trabaja sin apuntarlo, dale código para entrar o que pulse «Empezar» y «Terminar»."}):null,
    pc!=null&&pc>=INV_LIM?el("div",{style:"margin:10px 0"},[el("b",{text:"Trabajos que podría hacer otro"}),invPasarLista(p,ctx,()=>cerrar&&cerrar())]):null,
    el("b",{text:"Cada día"}),D.length?tab(["Día","Jornada","Ocupado","Saturación"],D.map(([f,x])=>[fCorta(f),invH(x.jor),invH(x.cont),x.jor?invPct(x.cont,x.jor)+" %":"—"])):el("p",{class:"hint",text:"Sin días con jornada en el periodo."}),
    el("b",{style:"display:block;margin-top:12px",text:"Sus trabajos fijos"}),fijas.length?tab(["Trabajo","Días","Tiempo previsto","Propuesto"],fijas.map(t=>{const g=T["f:"+t.id];return[t.titulo+(t.todo_equipo?" (todo el equipo)":""),invDiasTxt(t),t.minutos_est?invH(t.minutos_est):"sin tiempo",g&&g.prop&&g.prop!==t.minutos_est?invH(g.prop):"—"];})):el("p",{class:"hint",text:"No tiene trabajos fijos asignados."}),
    el("b",{style:"display:block;margin-top:12px",text:"Lo que ha hecho en el periodo"}),hechos.length?tab(["Trabajo","Veces","Tiempo","Media","Con «Empezar»"],hechos.map(g=>[g.t+(g.fija?"":" (aviso)"),g.n,invH(g.min),invH(g.min/g.n),g.real+" de "+g.n]),i=>invLista(hechos[i].t+" · "+p.n,hechos[i].L,F.t)):el("p",{class:"hint",text:"Nada hecho a su nombre en el periodo."})]);
  cerrar=dlg(p.n,cuerpo,[{t:"Cerrar",cls:"sec"}]);}

/* tarjeta: trabajos que se pueden pasar a otro (de quien pasa del 85 %) */
function invCardPasar(ctx){const P=ctx.X.sat.filter(p=>p.jor&&p.nt&&invPct(p.cont,p.jor)>=INV_LIM);
  return el("div",{class:"card",id:"invPasar"},[el("div",{class:"hd"},[el("h2",{text:"Trabajos que se pueden pasar a otro"}),el("span",{class:"der sub",text:P.length?P.length+(P.length===1?" persona muy cargada":" personas muy cargadas"):"nadie pasa del "+INV_LIM+" %"})]),el("div",{class:"bd"},[
    el("p",{class:"hint",style:"margin-top:0",text:"Para quien pasa del "+INV_LIM+" %: sus trabajos fijos que puede hacer otra persona del mismo equipo que trabaja esos días, en su turno, y que con el cambio no pasa del "+INV_LIM+" %. Primero quien ya lo ha hecho y lo hace más rápido. «Pasar» cambia la tarea fija desde hoy, después de confirmarlo."}),
    P.length?el("div",null,P.map(p=>el("div",{style:"margin:0 0 12px"},[el("b",{text:p.n+" · "+invPct(p.cont,p.jor)+" %"}),invPasarLista(p,ctx)]))):el("p",{class:"hint",text:"Nadie con trabajos apuntados pasa del "+INV_LIM+" % en este periodo."})])]);}

/* tarjeta: tiempos de cada trabajo (propuestos para aprobar), los que no tienen tiempo fiable y quién tarda mucho más */
function invCardTiempos(ctx){const T=Object.values(ctx.T).filter(g=>g.hechas>0);
  const cambia=g=>g.ref&&g.prop&&g.n>=3&&Math.abs(g.prop-(g.est||0))>=2;
  const L=T.filter(g=>g.n>0).sort((a,b)=>(cambia(b)-cambia(a))||(Math.abs((b.prop||0)-(b.est||0))-Math.abs((a.prop||0)-(a.est||0))));const ap=L.filter(cambia);
  const aplicar=async g=>{if(g.tipo==="fija"){const t=g.ref;await rpc("tarea_guardar",{p_tok:S.tok,p:{id:t.id,titulo:t.titulo,minutos_est:g.prop,tipo:t.tipo,descripcion:t.descripcion,activo:t.activo,dias:t.dias,equipo:t.equipo,turno:t.turno,asignados:t.asignados,todo_equipo:t.todo_equipo,alm_art:t.alm_art||""}});}
    else{const h=g.ref;await rpc("habitual_guardar",{p_tok:S.tok,p:{id:h.id,titulo:h.titulo,descripcion:h.descripcion,lugar:h.lugar,minutos_est:g.prop,activo:h.activo}});}g.ref.minutos_est=g.prop;g.est=g.prop;};
  const fila=g=>el("tr",null,[el("td",null,[el("b",{text:g.titulo}),el("small",{class:"hint",style:"display:block;margin:0",text:g.tipo==="fija"?"Fija":g.tipo==="habitual"?"Habitual":"Aviso"})]),
    el("td",{text:g.est?invH(g.est):"—"}),el("td",{text:g.med?invH(g.med)+" ("+g.n+")":"—"}),
    el("td",null,[el("b",{text:g.prop?invH(g.prop):"—"}),g.prop&&g.est&&g.prop!==g.est?el("small",{class:"hint",style:"display:block;margin:0",text:(g.prop>g.est?"+":"")+(g.prop-g.est)+" min"}):null]),
    el("td",null,cambia(g)?el("button",{class:"btn sec peq",type:"button",text:"Aplicar",onclick:async e=>{e.target.disabled=true;try{await aplicar(g);toast("Guardado: "+invH(g.prop));e.target.replaceWith(el("span",{class:"pill ok",text:"Aplicado"}));}catch(er){toast(er.message);e.target.disabled=false;}}}):
      g.tipo==="aviso"&&g.prop?el("small",{class:"hint",text:"se usa al calcular"}):null)]);
  /* trabajos sin tiempo fiable: se hacen a menudo y casi nunca con «Empezar» */
  const SF=T.filter(g=>g.hechas>=5&&g.real/g.hechas<0.3).sort((a,b)=>b.hechas-a.hechas);
  /* quién tarda mucho más que los demás en el mismo trabajo */
  const QM=[];T.forEach(g=>{const P=Object.entries(g.P);if(P.length<2)return;P.forEach(([n,x])=>{const otros=g.R.filter(r=>r.n!==n).map(r=>r.m);const mo=invMed(otros);if(mo&&x.med>=1.5*mo&&x.med-mo>=5)QM.push({g,n,x,mo});});});
  QM.sort((a,b)=>(b.x.med-b.mo)*b.x.c-(a.x.med-a.mo)*a.x.c);
  return el("details",{class:"card",id:"invTiempos"},[el("summary",{class:"hd",style:"cursor:pointer"},[el("h2",{text:"Tiempos de cada trabajo"}),el("span",{class:"der sub",text:ap.length?ap.length+" para ajustar":"al día"})]),el("div",{class:"bd"},[
    el("p",{class:"hint",style:"margin-top:0",text:"«Real» es el tiempo del medio de las últimas "+INV_ULT+" veces con «Empezar» y «Terminar» (sin las que pasan del triple de lo normal). «Propuesto» mezcla tu estimado con lo real: con pocas veces pesa más lo tuyo y con muchas lo real (con "+INV_K+" veces, mitad y mitad). Nada cambia hasta que pulsas «Aplicar». Los avisos sin estimado usan el propuesto al calcular la saturación."}),
    ap.length?el("div",{class:"row",style:"margin:0 0 8px"},el("button",{class:"btn",type:"button",text:"Aplicar todos ("+ap.length+")",onclick:async e=>{e.target.disabled=true;let ok=0;for(const g of ap){try{await aplicar(g);ok++;}catch(er){toast(g.titulo+": "+er.message);}}toast(ok+" tiempos guardados");if(ctx.re)ctx.re();}})):null,
    L.length?el("div",{style:"overflow:auto"},el("table",{class:"g-tab"},[el("thead",null,el("tr",null,["Trabajo","Tu estimado","Real (veces)","Propuesto",""].map(h=>el("th",{text:h})))),el("tbody",null,L.slice(0,80).map(fila))])):
      el("p",{class:"hint",text:"Todavía no hay trabajos con tiempo real (con «Empezar» y «Terminar»)."}),
    el("p",{style:"font-weight:600;margin:14px 0 6px",text:"Trabajos sin tiempo fiable"}),
    SF.length?el("div",null,[el("p",{class:"hint",style:"margin-top:0",text:"Se hacen a menudo pero casi nunca con «Empezar» y «Terminar»: su tiempo es una suposición. Son los primeros en los que insistir al equipo."}),
      el("div",{style:"overflow:auto"},el("table",{class:"g-tab"},[el("thead",null,el("tr",null,["Trabajo","Hechos","Con «Empezar»"].map(h=>el("th",{text:h})))),el("tbody",null,SF.slice(0,30).map(g=>el("tr",null,[el("td",{text:g.titulo}),el("td",{text:String(g.hechas)}),el("td",{text:g.real+" ("+invPct(g.real,g.hechas)+" %)"})])))]))]):
      el("p",{class:"hint",text:"Ninguno: los trabajos que más se repiten tienen tiempo real."}),
    el("p",{style:"font-weight:600;margin:14px 0 6px",text:"Quién tarda mucho más en un trabajo"}),
    QM.length?el("div",null,[el("p",{class:"hint",style:"margin-top:0",text:"Personas que tardan al menos la mitad más que los demás en el mismo trabajo (con 3 veces o más). Puede ser formación, material o que le toca la zona peor: mejor preguntar antes de sacar conclusiones."}),
      el("div",{style:"overflow:auto"},el("table",{class:"g-tab"},[el("thead",null,el("tr",null,["Trabajo","Persona","Su tiempo","Los demás"].map(h=>el("th",{text:h})))),el("tbody",null,QM.slice(0,30).map(q=>el("tr",null,[el("td",{text:q.g.titulo}),el("td",{text:q.n}),el("td",{text:invH(q.x.med)+" ("+q.x.c+" veces)"}),el("td",{text:invH(q.mo)})])))]))]):
      el("p",{class:"hint",text:"Nadie tarda mucho más que los demás en el mismo trabajo (con los datos que hay)."})])]);}

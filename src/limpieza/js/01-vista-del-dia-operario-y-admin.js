/* ---------- vista del día (operario y admin) ---------- */
async function vHoy(v){const admin=esAdm();const f=S.fecha;
  /* operario viendo lo suyo: pantalla «Siguiente trabajo» */
  const nuevo=!admin&&S.soloMios!==false&&!S.resp;const prog=el("div");
  if(nuevo)v.appendChild(prog);else v.appendChild(el("div",{class:"datebar"},[el("button",{class:"btn sec peq","aria-label":"Día anterior",text:"◀",onclick:()=>{S.fecha=sumaD(f,-1);pinta();}}),el("b",{text:f===hoyISO()?"Hoy · "+fLarga(f):fLargaM(f)}),el("button",{class:"btn sec peq","aria-label":"Día siguiente",text:"▶",onclick:()=>{S.fecha=sumaD(f,1);pinta();}})]));
  const re=()=>pinta();
  if(admin)v.appendChild(el("button",{class:"btn grande",text:"＋ Abrir OT",onclick:()=>abrirOT(re)}));
  else if(!nuevo){/* operario: dos botones grandes: abrir un trabajo, y ver solo los suyos o todos */
    const soloM=S.soloMios!==false;
    v.appendChild(el("div",{class:"row",style:"margin-bottom:10px"},[el("button",{class:"btn grande",text:"＋ Abrir trabajo",onclick:()=>abrirOT(re)}),
      el("button",{class:"btn grande sec",text:soloM?"Ver todos":"Solo mis trabajos",onclick:()=>{S.soloMios=!soloM;pinta();}})]));}
  if(!admin&&!nuevo)v.appendChild(el("button",{class:"btn sec",style:"width:100%;margin:-4px 0 12px",text:"Inyectoras y hornos mantenedores",onclick:()=>listaElementos(re)}));
  const avp=el("div");v.appendChild(avp);bloqueAvisos(avp);
  if(admin){const cb=el("div");v.appendChild(cb);bloqueConsumos(cb,f);}
  const pbx=el("div");v.appendChild(pbx);
  const avs=el("div");v.appendChild(avs);rpc("avisos_activos",{p_tok:S.tok}).then(A=>A.forEach(a=>avs.appendChild(el("div",{class:"aviso"},[a.titulo,a.descripcion?el("small",{text:a.descripcion}):null])))).catch(()=>{});
  const box=el("div",null,el("div",{class:"card"},el("div",{class:"empty",text:"Cargando…"})));v.appendChild(box);
  let R,HD=[],PE=[],RS=null;try{[R,HD,PE,RS]=await Promise.all([rpc("ots_dia",{p_tok:S.tok,p_fecha:f}),admin?rpc("horas_dia_leer",{p_tok:S.tok,p_fecha:f}).catch(()=>[]):Promise.resolve([]),rpc("extra_lista",{p_tok:S.tok,p_fecha:f}).catch(()=>[]),admin?Promise.resolve(null):rpc("resp_hornos_yo",{p_tok:S.tok}).catch(()=>null)]);S.resp=RS&&RS.operarios&&RS.operarios.length?RS:null;}catch(e){box.textContent="";box.appendChild(el("div",{class:"card"},el("div",{class:"empty",text:e.message})));return;}
  S.pet={};(PE||[]).slice().reverse().forEach(p=>S.pet[p.ot_id]=p);if(admin)bloquePeticiones(pbx,PE||[],re);else respuestasPet(PE||[]);
  box.textContent="";const D=R.dia,A=R.atrasadas,AU=R.ausencias||[];if(f===hoyISO()){S.miHor=R.mi_horario;S.diaD=D;setTimeout(revisaJornada,1200);}const esMio=o=>!!o.todo_equipo||(o.asignados||[]).includes(S.yo.id)||(o.nombres||[]).includes(S.yo.nombre)||cubroYo(o);
  /* el responsable de hornos ya recibe solo los trabajos de su operario (lo filtra el servidor): los ve todos */
  const Df=admin?D.filter(pasaFiltro):((S.soloMios!==false&&!S.resp)?D.filter(esMio):D),Af=admin?A.filter(pasaFiltro):((S.soloMios!==false&&!S.resp)?A.filter(esMio):A);
  if(admin&&R.plantilla){try{const EXT=await externos();R.plantilla=R.plantilla.filter(x=>!EXT.has(x.id));}catch(e){}}
  S.plant=null;if(R.plantilla){S.plant={};R.plantilla.forEach(x=>S.plant[x.nombre]=x.tramos);}
  if(!admin&&!nuevo)box.appendChild(el("p",{class:"mihor",text:R.mi_horario==null?"":R.mi_horario.length?"Tu horario: "+horTxt(R.mi_horario):"Hoy libras"}));
  if(admin){const n=k=>D.filter(o=>o.estado===k).length;
    if(R.espacio!=null&&R.espacio>=80)box.appendChild(el("div",{class:"aviso"},["La base de datos está al "+R.espacio+" %",el("small",{text:"Haz una copia en Resumen y libera espacio."})]));
    box.appendChild(el("div",{class:"kpis"},[["Total",D.length],["Por hacer",n("pendiente")],["En curso",n("en_curso")],["Hechas",n("hecha")]].map(([a,b])=>el("div",null,[el("b",{text:String(b)}),el("small",{text:a})]))));
    box.appendChild(el("div",{class:"herr"},[el("button",{class:"btn sec",text:"＋ Planificar",onclick:()=>formOT({fecha:f,equipo:finde(f)?"Finde":"Semana"},re)}),el("button",{class:"btn sec",text:"＋ Falta",onclick:()=>formSust({desde:f,hasta:f},re)}),el("button",{class:"btn sec",text:"Horas del día",onclick:()=>formHorasDia(f,re)}),el("button",{class:"btn sec",text:"WhatsApp",onclick:()=>enviarDiaWA(D,f)}),el("button",{class:"btn sec",text:"Inyectoras y hornos",onclick:()=>listaElementos(re)})]));
    box.appendChild(hayFiltro()?barraFiltros(D,A,re):el("details",{class:"fpleg"},[el("summary",{text:"Filtrar por persona, estado o tipo"}),barraFiltros(D,A,re)]));
    if(R.plantilla){const fal=new Set(AU.filter(x=>x.motivo!=="Horas extra").map(x=>x.ausente)),exH={},exN={};
      (R.extras||[]).forEach(x=>{exH[x.trabajador]=(exH[x.trabajador]||0)+(+x.horas||0);if(x.nota)exN[x.trabajador]=x.nota;});
      (HD||[]).forEach(x=>{if(+x.extra_mano>0&&!(x.id in exH)){exH[x.id]=+x.extra_mano;if(x.nota)exN[x.id]=x.nota;}});
      AU.filter(x=>x.motivo==="Horas extra").forEach(x=>{const k=x.sustituto||x.ausente;if(k&&!(k in exH))exH[k]=0;});
      const ex=Object.keys(exH);const exTxt=id=>exH[id]?"+"+String(exH[id]).replace(".",",")+" h extra":"horas extra";
      const carga={};D.forEach(o=>{if(!o.minutos_est||o.todo_equipo)return;(o.nombres||[]).forEach(n=>{const c=(o.cubre||[]).find(x=>x.ausente===n&&x.sustituto);const k=c?c.sustituto:n;carga[k]=(carga[k]||0)+o.minutos_est;});});
      const jornada=tr=>(tr||[]).reduce((t,r)=>{const[a,b]=r.map(x=>{const[h,m]=x.split(":");return +h*60+ +m;});return t+(b-a);},0);
      const tr=R.plantilla.filter(x=>(x.tramos&&x.tramos.length)||ex.includes(x.id)),li=R.plantilla.filter(x=>x.tramos&&!x.tramos.length&&!ex.includes(x.id)),sh=R.plantilla.filter(x=>x.tramos==null&&!ex.includes(x.id));
      box.appendChild(el("details",{class:"card plant"},[el("summary",{class:"hd"},[el("h2",{text:"Quién trabaja ("+tr.filter(x=>!fal.has(x.id)).length+")"}),el("span",{class:"mas",text:"▾"})]),el("div",{class:"bd"},[
        tr.map(x=>el("div",{class:"linea"+(fal.has(x.id)?" tach":"")},[el("span",{style:"flex:1"},[x.nombre,exN[x.id]&&ex.includes(x.id)?el("small",{class:"hint",style:"display:block;margin:0",text:exN[x.id]}):null,carga[x.nombre]?el("small",{class:"carga"+(jornada(x.tramos)&&carga[x.nombre]>jornada(x.tramos)?" mucha":""),text:" "+durTxt(carga[x.nombre])+" de trabajo"+(jornada(x.tramos)?" / "+durTxt(jornada(x.tramos))+" de jornada":"")}):null]),el("span",{class:"pill "+(fal.has(x.id)?"bad":ex.includes(x.id)?"warn":"info"),text:fal.has(x.id)?"Falta":(x.tramos&&x.tramos.length?horTxt(x.tramos):"")+(ex.includes(x.id)?(x.tramos&&x.tramos.length?" · ":"")+exTxt(x.id):"")})])),
        li.length?el("p",{class:"hint",text:"Libran: "+li.map(x=>x.nombre.split(" ")[0]).join(", ")}):null,
        sh.length?el("p",{class:"hint",text:"Sin horario puesto: "+sh.map(x=>x.nombre.split(" ")[0]).join(", ")+" (ponlo en Equipo)"}):null])]));}
    if(AU.length)box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Faltas y sustituciones"})),el("div",{class:"bd"},AU.map(x=>el("button",{class:"linea",onclick:()=>formSust(x,re)},[
      el("span",{style:"flex:1",text:x.motivo==="Horas extra"?""+x.sustituto_n+" hace los trabajos de "+x.ausente_n:""+x.ausente_n+" · "+(x.motivo||"Falta")+(x.hasta!==x.desde?" hasta "+fCorta(x.hasta):"")}),
      x.motivo==="Horas extra"?null:el("span",{class:"pill "+(x.sustituto?"ok":"bad"),text:x.sustituto?"lo cubre "+x.sustituto_n.split(" ")[0]:"sin cubrir"})])))]));
    const SA=Df.filter(sinAsignar);if(SA.length)box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Sin asignar ("+SA.length+")"})),SA.map(o=>tarjeta(o,re))]));}
  else{
    if(esEnc()){/* encargado: planificar, poner faltas y su apartado */
      box.appendChild(el("a",{class:"btn grande",href:"encargado.html?v="+Date.now(),style:"display:block;text-align:center;text-decoration:none;margin:0 0 10px",text:"Encargado: instrucciones, checklist e incidencias"}));
      box.appendChild(el("div",{class:"row",style:"margin:0 0 12px"},[el("button",{class:"btn sec",text:"＋ Planificar trabajo",onclick:()=>formOT({fecha:f,equipo:finde(f)?"Finde":"Semana"},re)}),el("button",{class:"btn sec",text:"＋ Falta",onclick:()=>formSust({desde:f,hasta:f},re)})]));
      const AUf=AU.filter(x=>x.motivo!=="Horas extra");
      if(AUf.length)box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Faltas de hoy"})),el("div",{class:"bd"},AUf.map(x=>el("button",{class:"linea",onclick:()=>formSust(x,re)},[
        el("span",{style:"flex:1",text:x.ausente_n+" · "+(x.motivo||"Falta")+(x.hasta!==x.desde?" hasta "+fCorta(x.hasta):"")}),
        el("span",{class:"pill "+(x.sustituto?"ok":"bad"),text:x.sustituto?"lo cubre "+x.sustituto_n.split(" ")[0]:"sin cubrir"})])))]));
      const SA=D.filter(sinAsignar);if(SA.length)box.appendChild(el("div",{class:"card",style:"border-color:var(--warn)"},[el("div",{class:"hd"},el("h2",{text:"Para repartir ("+SA.length+")"})),el("p",{class:"hint",style:"padding:0 14px",text:"Solo los ves tú. Toca «Asignar» para dárselo a alguien."}),SA.map(o=>tarjeta(o,re))]));}
    AU.filter(x=>x.sustituto===S.yo.id).forEach(x=>box.appendChild(el("div",{class:"aviso"},["Hoy haces también los trabajos de "+x.ausente_n,el("small",{text:x.motivo&&x.motivo!=="Horas extra"?"Motivo: "+x.motivo:"Te salen abajo con su nombre."})])));
    /* carga del que cubre: sus trabajos propios + los de la persona que falta */
    if(AU.some(x=>x.sustituto===S.yo.id)){const sum=L=>L.reduce((t,o)=>t+(o.minutos_est||0),0);
      const propios=D.filter(o=>!o.todo_equipo&&(o.nombres||[]).includes(S.yo.nombre)&&!(o.cubre||[]).some(c=>c.ausente===S.yo.nombre&&c.sustituto)),
        cubiertos=D.filter(o=>(o.cubre||[]).some(c=>c.sustituto===S.yo.nombre));
      const tp=sum(propios),tc=sum(cubiertos);
      if(tp+tc>0)box.appendChild(el("div",{class:"aviso"},["Hoy tienes "+durTxt(tp+tc)+" de trabajo: "+durTxt(tp)+" tuyos y "+durTxt(tc)+" de los que cubres.",el("small",{text:"Si no te da tiempo, avisa a tu encargado para que reparta tus trabajos propios."})]));}}
  if(nuevo)return vOperario(v,box,prog,f,R,Df,Af,re);
  if(Af.length)box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Atrasadas ("+Af.length+")"})]),Af.map(o=>tarjeta(o,re))]));
  const vis=(admin||esEnc())?Df.filter(o=>!sinAsignar(o)):Df;
  const cur=vis.filter(o=>o.estado==="en_curso"),pend=vis.filter(o=>o.estado==="pendiente"),hechas=vis.filter(o=>o.estado==="hecha"||o.estado==="no_hecha");
  if(cur.length)box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"En curso ("+cur.length+")"})),cur.map(o=>tarjeta(o,re))]));
  box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:(admin?"Por hacer":"Mis trabajos")+" ("+pend.length+")"})),pend.length?pend.map(o=>tarjeta(o,re)):el("div",{class:"empty",text:admin&&hayFiltro()?"Nada con este filtro.":D.length?"Nada pendiente ":"No hay trabajos para este día."})]));
  if(hechas.length)box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Terminadas ("+hechas.length+")"})),hechas.map(o=>tarjeta(o,re))]));}
/* Pantalla del operario: progreso del día, el trabajo que toca ahora en grande y el resto en una lista corta */
function vOperario(v,box,prog,f,R,Df,Af,re){
  const hechas=Df.filter(o=>o.estado==="hecha"||o.estado==="no_hecha");
  const cur=Df.filter(o=>o.estado==="en_curso");
  const ordP=(a,b)=>(a.prioridad==="alta"?0:1)-(b.prioridad==="alta"?0:1);
  const cola=cur.concat(Af.filter(o=>o.estado==="pendiente"||o.estado==="en_curso").filter(o=>!cur.includes(o)).sort(ordP),Df.filter(o=>o.estado==="pendiente").sort(ordP));
  const tot=Df.length,nh=hechas.length,pct=tot?Math.round(nh*100/tot):0;
  /* cabecera: fecha, progreso y turno */
  prog.appendChild(el("div",{class:"card prog"},[el("div",{class:"prog-f"},[el("button",{class:"btn sec peq","aria-label":"Día anterior",text:"◀",onclick:()=>{S.fecha=sumaD(f,-1);pinta();}}),
      el("b",{text:f===hoyISO()?"Hoy · "+fLarga(f):fLargaM(f)}),el("button",{class:"btn sec peq","aria-label":"Día siguiente",text:"▶",onclick:()=>{S.fecha=sumaD(f,1);pinta();}})]),
    el("div",{class:"prog-n"},[el("span",{text:R.mi_horario==null?"":R.mi_horario.length?"Tu turno: "+horTxt(R.mi_horario):"Hoy libras"}),el("b",{text:tot?nh+" de "+tot+" hechos":"Sin trabajos"})]),
    el("div",{class:"prog-b",role:"progressbar","aria-valuenow":String(pct),"aria-valuemin":"0","aria-valuemax":"100"},el("i",{style:"width:"+pct+"%"}))]));
  /* el trabajo que toca */
  if(cola.length){const o=cola[0];
    box.appendChild(el("div",{class:"card ahora"},[el("div",{class:"ahk",text:o.estado==="en_curso"?"Estás con":"Siguiente trabajo"}),tarjeta(o,re)]));}
  else box.appendChild(el("div",{class:"card ahora vacio"},[el("div",{class:"ahk",text:"Siguiente trabajo"}),el("div",{class:"empty",text:tot?"Has terminado tus trabajos de hoy.":"Hoy no tienes trabajos asignados."}),
    el("p",{class:"hint",style:"padding:0 16px 14px;text-align:center",text:"Si haces algo más, apúntalo con «Abrir trabajo»."})]));
  /* después */
  const resto=cola.slice(1);
  if(resto.length)box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Después ("+resto.length+")"})),...resto.map((o,i)=>{
    const [et,ec]=EST[o.estado]||["?",""];const row=el("button",{type:"button",class:"sig"},[el("span",{class:"sig-n",text:String(i+2)}),
      el("span",{class:"sig-m"},[el("b",{text:o.titulo}),el("small",{text:[o.fecha!==S.fecha?"Atrasada · "+fCorta(o.fecha):null,o.lugar,o.minutos_est?"unos "+durTxt(o.minutos_est):null].filter(Boolean).join(" · ")})]),
      el("span",{class:"pill "+(o.prioridad==="alta"?"bad":ec),text:o.prioridad==="alta"?"Urgente":et})]);
    row.onclick=()=>{row.replaceWith(tarjeta(o,re));};return row;})]));
  /* hechos */
  if(hechas.length)box.appendChild(el("details",{class:"card"},[el("summary",{class:"hd",style:"cursor:pointer"},[el("h2",{text:"Hechos hoy ("+hechas.length+")"}),el("span",{class:"mas",text:"▾"})]),...hechas.map(o=>tarjeta(o,re))]));
  /* botones fijos abajo */
  v.appendChild(el("div",{class:"pie"},[el("button",{class:"btn sec",text:"Máquinas",title:"Inyectoras y hornos mantenedores",onclick:()=>listaElementos(re)}),
    el("button",{class:"btn sec",text:"Ver todos",onclick:()=>{S.soloMios=false;pinta();}}),el("button",{class:"btn",text:"＋ Abrir trabajo",onclick:()=>abrirOT(re)})]));}
/* abrir OT: pensado para el móvil, 3 toques. Con las tareas habituales arriba para no escribir */
/* ---------- zonas (lista desplegable de «Dónde») ---------- */
let ZONAS=null;async function zonasL(force){if(!ZONAS||force){try{ZONAS=await rpc("zonas",{p_tok:S.tok});}catch(e){ZONAS=ZONAS||[];}}return ZONAS;}
const GRUPOS_Z=[["Inyectoras","Inyectoras"],["Moldes","Centros de mecanizado"],["Otras","Otras zonas"]];
function selZona(v,on){const s=el("select",{class:"zsel"});s.appendChild(el("option",{value:"",text:"— Elige una zona —"}));
  GRUPOS_Z.forEach(([g,t])=>{const L=(ZONAS||[]).filter(z=>z.grupo===g);if(!L.length)return;const og=el("optgroup",{label:t});L.forEach(z=>og.appendChild(el("option",{value:z.nombre,text:z.nombre})));s.appendChild(og);});
  s.value=(ZONAS||[]).some(z=>z.nombre===v)?v:"";s.onchange=()=>on(s.value);return s;}
function zonasCard(){let G="Otras";const nom=el("input",{type:"text",placeholder:"p. ej. F68 o M12",enterkeyhint:"done"});const lista=el("div");
  const pintaL=()=>{lista.textContent="";if(!(ZONAS||[]).length){lista.appendChild(el("p",{class:"hint",text:"Aún no hay zonas."}));return;}
    GRUPOS_Z.forEach(([g,t])=>{const L=ZONAS.filter(z=>z.grupo===g);if(!L.length)return;lista.appendChild(el("div",{class:"hint",style:"margin:8px 0 2px;font-weight:600",text:t+" ("+L.length+")"}));
      L.forEach(z=>lista.appendChild(el("div",{class:"linea"},[el("span",{style:"flex:1",text:z.nombre}),el("button",{class:"btn sec peq",text:"Quitar",onclick:async()=>{if(!confirm("¿Quitar «"+z.nombre+"» de la lista?"))return;try{await rpc("zona_borrar",{p_tok:S.tok,p_id:z.id});await zonasL(true);pintaL();toast("Quitada");}catch(e){toast(e.message);}}})])));});};
  pintaL();
  const add=async()=>{const n=nom.value.trim();if(!n){toast("Escribe el nombre de la zona");nom.focus();return;}
    try{await rpc("zona_guardar",{p_tok:S.tok,p:{nombre:n,grupo:G}});nom.value="";await zonasL(true);pintaL();toast("Añadida");}catch(e){toast(e.message);}};
  return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Zonas (salen en «Dónde»)"}),el("span",{class:"der sub",text:(ZONAS||[]).length+" zonas"})]),
    el("div",{style:"padding:0 14px 12px"},[el("p",{class:"hint",style:"margin:0 0 8px",text:"Lo que añadas aquí sale en la lista desplegable al abrir o crear una OT. Quitar una zona no toca las OT ya hechas."}),
      el("div",{class:"row"},[nom,sel(GRUPOS_Z,"Otras",v=>G=v),el("button",{class:"btn",text:"＋ Añadir",onclick:add})]),lista])]);}
let HAB=null;async function habituales(force){if(!HAB||force){try{HAB=await rpc("habituales",{p_tok:S.tok});}catch(e){HAB=HAB||[];}}return HAB;}
async function abrirOT(re){await zonasL();await elementosL().catch(()=>{});await trabajadores().catch(()=>{});await habituales(true).catch(()=>{});const admin=esAdm();const o={titulo:"",lugar:"",descripcion:"",urgente:false,yo:true,habitual_id:null};const fotos=[];let hSel=null;
  const tit=inp("",x=>{o.titulo=x;if(hSel&&x!==hSel.titulo){hSel=null;o.habitual_id=null;ph();}},{placeholder:"p. ej. Derrame de aceite",enterkeyhint:"next"});
  const lug=inp("",x=>{o.lugar=x;pl();},{placeholder:"p. ej. F28, pasillo Nave 2…"});
  const dl=el("datalist",{id:"lugares-dl"});const lchips=el("div",{class:"chips",style:"margin:-4px 0 10px"});let LUG=[];
  const pl=()=>{lchips.textContent="";LUG.slice(0,8).forEach(x=>lchips.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(o.lugar===x),text:x,onclick:()=>{o.lugar=x;lug.value=x;pl();}})));};
  rpc("lugares",{p_tok:S.tok}).then(L=>{LUG=L;L.forEach(x=>dl.appendChild(el("option",{value:x})));pl();}).catch(()=>{});
  const selH=el("select",null,[el("option",{value:"",text:"— Elige el horno —"})].concat((ELS||[]).filter(x=>x.tipo==="horno"&&x.activo&&!x.borrado).sort(ordEl).map(x=>el("option",{value:x.id,text:x.codigo+" · "+x.nombre}))));
  selH.onchange=()=>{o.elemento_id=selH.value||null;};const hornoWrap=fld("¿Qué horno se limpia?",selH);hornoWrap.hidden=true;
  /* tareas habituales: una lista desplegable (solo las que puede hacer esta persona) */
  const hsel=el("select",{"aria-label":"Tarea habitual"}),hinfo=el("p",{class:"hint",style:"margin:4px 0 0"});const hwrap=fld("¿Es una tarea habitual?",el("div",null,[hsel,hinfo]));hwrap.hidden=true;
  const navWrap=el("div");const pnav=()=>{navWrap.textContent="";navWrap.hidden=!(hSel&&hSel.alm_art);if(navWrap.hidden)return;
    navWrap.appendChild(fld("¿En qué nave? (obligatorio: el coste se carga ahí)",seg([["Nave 1","Nave 1"],["Nave 2","Nave 2"]],o.nave,x=>{o.nave=x;})));};
  const ph=()=>{hsel.textContent="";hsel.appendChild(el("option",{value:"",text:"— No, la escribo yo —"}));
    (HAB||[]).filter(h=>h.activo).forEach(h=>hsel.appendChild(el("option",{value:h.id,text:h.titulo+(h.minutos_est?" · "+durTxt(h.minutos_est):"")})));
    hsel.value=hSel?hSel.id:"";
    hinfo.textContent=hSel?(hSel.minutos_est?"Tiempo de esta tarea: "+durTxt(hSel.minutos_est)+". Si ya la has hecho, pulsa «Ya lo he hecho».":"Esta tarea no tiene tiempo puesto."):"";hornoWrap.hidden=!(hSel&&/limpieza horno/i.test(hSel.titulo));pnav();};
  hsel.onchange=()=>{const h=(HAB||[]).find(x=>x.id===hsel.value);if(!h){hSel=null;o.habitual_id=null;}else{hSel=h;o.habitual_id=h.id;o.titulo=h.titulo;tit.value=h.titulo;if(h.lugar){o.lugar=h.lugar;lug.value=h.lugar;pl();}if(h.alm_art){const l=String(h.lugar||"");o.nave=/nave\s*1\b/i.test(l)&&!/nave\s*2\b|\by\s*2\b/i.test(l)?"Nave 1":/nave\s*2\b/i.test(l)&&!/nave\s*1\b/i.test(l)?"Nave 2":"";}}ph();};
  habituales().then(H=>{hwrap.hidden=!H.some(h=>h.activo);ph();});
  const seg=(ops,v,on)=>{const b=ops.map(([k,t])=>el("button",{type:"button","aria-pressed":String(v===k),text:t,onclick:()=>{on(k);b.forEach((x,i)=>x.setAttribute("aria-pressed",String(ops[i][0]===k)));}}));return el("div",{class:"seg sel"},b);};
  const fbox=el("div",{class:"fotos"});
  /* la OT se crea una sola vez: si una foto falla, al reintentar solo se suben las fotos que faltan (no se duplica la OT) */
  let creada=null;
  const guardar=async hecha=>{if(!o.titulo.trim()){toast("Escribe qué hay que hacer o toca una tarea habitual");tit.focus();return false;}
    if(esProblema(o.titulo,o.descripcion)&&!(o.lugar||"").trim()){toast(MSG_LUG);(sim?zsel:lug).focus();lug.classList.add("falta");return false;}
    if(hSel&&hSel.alm_art&&!/^Nave [12]$/.test(o.nave||"")){toast("Elige si es Nave 1 o Nave 2: el coste se carga en esa nave");navWrap.scrollIntoView({block:"center"});return false;}
    const esHorno=!!(hSel&&/limpieza horno/i.test(hSel.titulo));if(esHorno&&!o.elemento_id){toast("Elige qué horno se limpia");selH.focus();return false;}
    const auto=!!admin&&o.yo===false&&!o.elegir;if(auto&&(!o.turno||!o.nave)){toast("Elige el relevo y la nave");return false;}
    if(o.elegir&&!chQ.val().length){toast("Elige a quién se la das");return false;}
    if(!creada)creada=await rpc("ot_abrir",{p_tok:S.tok,p:Object.assign({},o,{hecha,auto,elemento_id:esHorno?o.elemento_id:null,asignados:(sim&&S.resp&&!hecha&&asgR)?[asgR]:(o.elegir&&!hecha?chQ.val():null)})});
    const r=creada;
    for(const d of [...fotos]){ try{ await guardarFoto(r.id,d); fotos.splice(fotos.indexOf(d),1); }catch(er){ toast("La OT ya está guardada, pero la foto no se ha subido: "+(er.message||"error")+". Pulsa otra vez para reintentar la foto."); return false; } }
    toast(hecha?"Apuntado como hecho"+(r.minutos!=null?" ("+durTxt(r.minutos)+")":""):auto?(r.asignados&&r.asignados.length?"Trabajo abierto y asignado al del relevo y nave":"Trabajo abierto: no hay nadie en ese relevo y nave, queda sin asignar"):o.elegir?"Trabajo abierto y asignado":o.yo||admin?"Trabajo abierto y apuntado a tu nombre":"Trabajo abierto: el jefe lo asignará");S.fecha=hoyISO();re();};
  const fLug=fld("¿Dónde?",lug);const marcaLug=()=>{const ob=esProblema(o.titulo,o.descripcion);fLug.firstChild.textContent=ob?"¿Dónde? (obligatorio)":"¿Dónde?";if(!ob||(o.lugar||"").trim())lug.classList.remove("falta");};
  tit.addEventListener("input",marcaLug);lug.addEventListener("input",marcaLug);
  const zsel=selZona(o.lugar,z=>{if(!z)return;o.lugar=z;lug.value=z;pl();marcaLug();});lug.addEventListener("input",()=>{zsel.value=(ZONAS||[]).some(z=>z.nombre===lug.value)?lug.value:"";});
  const fZ=fld("Zona (elige de la lista)",zsel);
  const chQ=chipsTrab(TRAB?TRAB.filter(w=>w.activo):[],[],true),quienBox=fld("¿Quién lo hace?",chQ);quienBox.hidden=true;
  const relRow=admin?el("div",{class:"row"},[fld("Relevo",sel([["","—"]].concat(TURNOS_S.concat(TURNOS_F).map(t=>[t,t])),"",v=>o.turno=v)),fld("Nave",sel([["","—"],["Nave 1","Nave 1"],["Nave 2","Nave 2"]],"",v=>o.nave=v))]):null;if(relRow)relRow.hidden=true;
  /* operarios: pantalla sencilla (sin «quién lo hace», sin «dónde» aparte: la zona es el sitio; detalles y foto plegados) */
  const sim=!admin;
  /* responsable de hornos: puede dar la OT a uno de sus operarios de hornos */
  let asgR=(S.resp&&S.resp.operarios[0])?S.resp.operarios[0].id:null;
  const quienR=(S.resp&&sim)?fld("¿Quién lo hace?",(()=>{const c=el("div",{class:"chips"});const pc=()=>{c.textContent="";S.resp.operarios.forEach(x=>c.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(asgR===x.id),text:x.nombre,onclick:()=>{asgR=x.id;pc();}})));};pc();return c;})()):null;
  const fotoBtn=el("label",{class:"btn sec",style:"display:block;text-align:center;cursor:pointer"},["Añadir foto",el("input",{type:"file",accept:"image/*",style:"display:none",onchange:async e=>{const f=e.target.files[0];if(!f)return;let d;try{d=await comprime(f);}catch(er){toast("Esa foto no se ha podido leer. Prueba con otra.");return;}fotos.push(d);fbox.appendChild(el("img",{src:d,alt:"foto"}));}})]);
  const urgente=fld("¿Es urgente?",seg([[false,"No"],[true,"Sí, urgente"]],false,x=>o.urgente=x));
  /* incidencias frecuentes: un toque rellena qué ha pasado y la urgencia */
  const INC_FREC=[["Derrame de aceite",true],["Derrame de taladrina",true],["Filtración de agua",true],["Desbordamiento de depósito",true],["Manguera rota (agua o aceite)",true],["Contenedor de basura lleno",false],["Suelo resbaladizo",false]];
  const incBox=el("div",{class:"chips",style:"margin:-4px 0 10px"},INC_FREC.map(([t,u])=>el("button",{type:"button",class:"chip",text:t+(u?" ":""),onclick:()=>{hSel=null;o.habitual_id=null;ph();o.titulo=t;tit.value=t;o.urgente=u;urgente.querySelectorAll("button").forEach((b,i)=>b.setAttribute("aria-pressed",String(i===(u?1:0))));marcaLug();}})));
  /* el responsable de hornos no ve las incidencias de limpieza (derrames, filtraciones…) */
  const incFld=S.resp?null:fld("Lo más frecuente",incBox);
  if(sim)fZ.firstChild.textContent="¿Dónde?";
  const masOp=el("details",{class:"mas-op"},[el("summary",{text:"＋ Detalles o foto (opcional)"}),fld("Detalles",area("",x=>o.descripcion=x)),fotoBtn,fbox]);
  const cuerpo=sim?[incFld,hwrap,navWrap,hornoWrap,fld("¿Qué hay que hacer?",tit),fZ,quienR,urgente,masOp]
    :[incFld,hwrap,navWrap,hornoWrap,fld("¿Qué hay que hacer?",tit),fZ,fLug,urgente,fld("¿Quién lo hace?",seg([[true,"Lo hago yo"],["elegir","Elegir persona"],[false,"Que lo haga el del relevo y nave"]],true,x=>{o.yo=x===true;o.elegir=x==="elegir";quienBox.hidden=!o.elegir;if(relRow)relRow.hidden=x!==false;})),quienBox,
      relRow,fld("Detalles (opcional)",area("",x=>o.descripcion=x)),fotoBtn,fbox];
  dlg("Abrir OT",el("div",null,cuerpo),[{t:"Cancelar",cls:"sec"},{t:"Ya lo he hecho",cls:"ok",fn:()=>guardar(true)},{t:"Abrir OT",fn:()=>guardar(false)}]);
  setTimeout(()=>{if(!(HAB||[]).length)tit.focus();},50);}
/* tareas habituales: no tienen día fijo, pero se hacen a menudo */
async function formHabitual(h0,re){await trabajadores().catch(()=>{});const h=Object.assign({activo:true},JSON.parse(JSON.stringify(h0)));const bot=[{t:"Cancelar",cls:"sec"}];
  const quien=chipsTrab((TRAB||[]).filter(w=>w.activo),h.solo_para||[],true);
  /* grupo: limpieza o hornos (cada grupo ve solo sus tareas) */
  h.grupo=h.grupo||"limpieza";const grp=el("div",{class:"seg sel"});const pg=()=>{grp.textContent="";[["limpieza","Limpieza"],["hornos","Hornos"]].forEach(([k,t])=>grp.appendChild(el("button",{type:"button","aria-pressed":String(h.grupo===k),text:t,onclick:()=>{h.grupo=k;pg();}})));};pg();
  if(h.id)bot.push({t:"Borrar",cls:"bad",fn:async()=>{if(!confirm("¿Borrar esta tarea habitual? Los trabajos ya hechos se conservan."))return false;await rpc("habitual_borrar",{p_tok:S.tok,p_id:h.id});HAB=null;toast("Borrada");re();}});
  bot.push({t:"Guardar",fn:async()=>{if(!(h.titulo||"").trim()){toast("Pon el nombre de la tarea");return false;}
    await rpc("habitual_guardar",{p_tok:S.tok,p:{id:h.id||null,titulo:h.titulo,lugar:h.lugar,descripcion:h.descripcion,minutos_est:h.minutos_est||null,activo:h.activo,solo_para:quien.val(),grupo:h.grupo}});HAB=null;toast("Guardada");re();}});
  dlg(h.id?"Editar tarea habitual":"Nueva tarea habitual",el("div",null,[el("p",{class:"hint",text:"Sale como botón al abrir una OT. Al marcarla como hecha se apunta este tiempo aunque no hayan pulsado «Empezar»."}),
    fld("Nombre",inp(h.titulo,v=>h.titulo=v,{placeholder:"p. ej. Vaciar contenedor de viruta"})),fld("Tiempo que lleva hacerla",campoTiempo(h.minutos_est,v=>h.minutos_est=v)),
    fld("Dónde (opcional)",inp(h.lugar,v=>h.lugar=v)),fld("Descripción (opcional)",area(h.descripcion,v=>h.descripcion=v)),
    fld("¿De qué grupo es?",grp),fld("¿Quién la hace? (si no marcas a nadie, la ve todo el mundo de su grupo)",quien),
    el("label",{style:"display:flex;gap:8px;align-items:center"},[el("input",{type:"checkbox",checked:h.activo,onchange:e=>h.activo=e.target.checked}),"Activa (si la quitas, deja de salir)"])]),bot);}
/* filtros del panel del jefe */
const ESTF=[["","Todos los estados"],["pendiente","Por hacer"],["en_curso","En curso"],["hecha","Hechas"],["no_hecha","No se pudieron"]];
const TIPF=[["","Todos los tipos"],["fija","Tareas fijas"],["habitual","Habituales"],["rapida","Abiertas por trabajadores"],["urgente","Urgentes"],["manual","Puestas por el jefe"]];
/* sustituciones: si este trabajo es de alguien que falta y lo cubro yo, devuelve su nombre */
function cubroYo(o){const c=(o.cubre||[]).find(x=>x.sustituto&&x.sustituto===S.yo.nombre&&(o.nombres||[]).includes(x.ausente));return c?c.ausente:null;}
function quienes(o){const r=new Set();(o.nombres||[]).forEach(n=>{const c=(o.cubre||[]).find(x=>x.ausente===n&&x.sustituto);r.add(c?c.sustituto:n);});if(o.hecho_por_n)r.add(o.hecho_por_n);return r;}
function pasaFiltro(o){const F=S.fil||{};if(F.est&&o.estado!==F.est)return false;
  if(F.tipo==="fija"&&o.origen!=="fija")return false;if(F.tipo==="habitual"&&!o.habitual_id)return false;if(F.tipo==="rapida"&&(o.origen!=="rapida"||o.habitual_id))return false;
  if(F.tipo==="urgente"&&o.prioridad!=="alta")return false;if(F.tipo==="manual"&&o.origen!=="manual")return false;
  if(F.quien){if(F.quien==="__sin")return sinAsignar(o);if(F.quien==="__equipo")return!!o.todo_equipo;if(!quienes(o).has(F.quien))return false;}
  return true;}
const hayFiltro=()=>{const F=S.fil||{};return!!(F.est||F.tipo||F.quien);};
function barraFiltros(D,A,re){S.fil=S.fil||{};const F=S.fil;const nombres=new Set();D.concat(A).forEach(o=>quienes(o).forEach(n=>nombres.add(n)));
  const pers=[["","Todas las personas"]].concat(Array.from(nombres).sort().map(n=>[n,n])).concat([["__sin","Sin asignar"],["__equipo","Todo el equipo"]]);
  const sQ=sel(pers,F.quien||"",v=>{F.quien=v;re();}),sE=sel(ESTF,F.est||"",v=>{F.est=v;re();}),sT=sel(TIPF,F.tipo||"",v=>{F.tipo=v;re();});
  [sQ,sE,sT].forEach((s,i)=>s.setAttribute("aria-label",["Filtrar por persona","Filtrar por estado","Filtrar por tipo"][i]));
  const n=D.concat(A).filter(pasaFiltro).length,t=D.length+A.length;
  return el("div",{class:"filtros"+(hayFiltro()?" on":"")},[el("div",{class:"fsel"},[sQ,sE,sT]),
    hayFiltro()?el("div",{class:"finfo"},[el("span",{text:"Mostrando "+n+" de "+t}),el("button",{class:"btn sec peq",text:"Quitar filtros",onclick:()=>{S.fil={};re();}})]):null]);}

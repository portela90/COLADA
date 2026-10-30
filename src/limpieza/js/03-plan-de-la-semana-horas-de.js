/* ---------- plan de la semana: horas de trabajo asignadas frente a la jornada de cada uno ---------- */
const minDe=x=>{const[h,m]=String(x).split(":");return +h*60+ +m;};
const jornadaMin=tr=>(tr||[]).reduce((t,r)=>t+Math.max(0,minDe(r[1])-minDe(r[0])),0);
const hCorta=m=>{m=Math.round(m||0);if(!m)return"0";const h=Math.floor(m/60),r=m%60;return h?(r?h+"h"+String(r).padStart(2,"0"):h+"h"):r+"'";};
function planSemana(R,lun){const dias=[0,1,2,3,4,5,6].map(i=>sumaD(lun,i));
  const enRango=(x,f)=>f>=x.desde&&f<=x.hasta;
  const sust=(aid,f)=>{const s=R.faltas.find(x=>x.ausente===aid&&x.sustituto&&enRango(x,f));return s?s.sustituto:null;};
  const P={};R.gente.forEach(w=>{P[w.id]={w,d:{}};dias.forEach(f=>{const tr=(w.horario||{})[diaClave(f)];const fal=R.faltas.find(x=>x.ausente===w.id&&x.motivo!=="Horas extra"&&enRango(x,f));
    const ex=R.extras.find(x=>x.trabajador===w.id&&x.fecha===f);
    P[w.id].d[f]={tr,fal,ex,jor:fal?0:jornadaMin(tr)+(ex&&ex.horas?Math.round(ex.horas*60):0),carga:0,n:0,sinT:0,hechas:0,ots:[]};});});
  const libre={},equipo={};dias.forEach(f=>{libre[f]={n:0,min:0,ots:[]};equipo[f]={n:0,min:0,ots:[]};});
  R.ots.forEach(o=>{const f=o.fecha;if(!libre[f])return;
    if(o.todo_equipo){equipo[f].n++;equipo[f].min+=o.minutos_est||0;equipo[f].ots.push(o);return;}
    if(!(o.asignados||[]).length){libre[f].n++;libre[f].min+=o.minutos_est||0;libre[f].ots.push(o);return;}
    o.asignados.forEach(aid=>{const id=sust(aid,f)||aid;const c=P[id]&&P[id].d[f];if(!c)return;c.n++;c.ots.push(o);if(o.estado==="hecha")c.hechas++;if(o.minutos_est)c.carga+=o.minutos_est;else c.sinT++;});});
  return{dias,P,libre,equipo};}
function nivelCelda(c){if(c.fal)return c.n?"bad":"falta";if(c.tr&&!c.tr.length&&!c.ex)return c.n?"bad":"libra";if(!c.jor)return c.n?"sinh":"vacio";const r=c.carga/c.jor;return r>1?"bad":r>=.8?"warn":"ok";}
async function vSemana(v){S.semP=S.semP||lunesDe(hoyISO());const lun=S.semP;const re=()=>pinta();
  v.appendChild(el("div",{class:"datebar"},[el("button",{class:"btn sec peq","aria-label":"Semana anterior",text:"◀",onclick:()=>{S.semP=sumaD(lun,-7);pinta();}}),
    el("b",{style:"text-transform:none",text:"Semana "+numSemana(lun)+" · "+fDM(lun)+" al "+fDM(sumaD(lun,6))}),
    el("button",{class:"btn sec peq","aria-label":"Semana siguiente",text:"▶",onclick:()=>{S.semP=sumaD(lun,7);pinta();}})]));
  const box=el("div",null,el("div",{class:"card"},el("div",{class:"empty",text:"Cargando…"})));v.appendChild(box);
  let R;try{R=await rpc("semana",{p_tok:S.tok,p_lunes:lun});}catch(e){box.textContent=e.message;return;}
  try{const EXT=await externos();R.gente=(R.gente||[]).filter(w=>!EXT.has(w.id));}catch(e){}
  const X=planSemana(R,lun),hoy=hoyISO();box.textContent="";
  const tot=Object.values(X.P).reduce((a,p)=>{Object.values(p.d).forEach(c=>{a.c+=c.carga;a.j+=c.jor;a.s+=c.sinT;a.r+=nivelCelda(c)==="bad"?1:0;});return a;},{c:0,j:0,s:0,r:0});
  const libT=Object.values(X.libre).reduce((t,x)=>t+x.n,0);
  box.appendChild(el("div",{class:"kpis"},[["Trabajo asignado",hCorta(tot.c)],["Jornadas",hCorta(tot.j)],["Ocupación",tot.j?Math.round(tot.c*100/tot.j)+" %":"—"],["Días pasados de horas",String(tot.r)]].map(([a,b])=>el("div",null,[el("b",{text:b}),el("small",{text:a})]))));
  if(libT||tot.s)box.appendChild(el("p",{class:"hint",text:[libT?libT+" trabajos sin asignar esta semana (fila de abajo).":null,tot.s?tot.s+" trabajos sin tiempo estimado: no cuentan en las horas.":null].filter(Boolean).join(" ")}));
  const DL=["L","M","X","J","V","S","D"];
  const celda=(w,f)=>{const c=X.P[w.id].d[f];const nv=nivelCelda(c);const pct=c.jor?Math.min(100,Math.round(c.carga*100/c.jor)):0;
    const txt=c.fal?"Falta":nv==="libra"?"Libra":nv==="vacio"?"·":c.jor?hCorta(c.carga)+"/"+hCorta(c.jor):hCorta(c.carga);
    return el("td",{class:"c "+nv+(f===hoy?" hoy":"")},el("button",{class:"cel","aria-label":w.nombre+" "+fLarga(f)+": "+(c.fal?"falta":nv==="libra"?"libra":hCorta(c.carga)+" de trabajo de "+hCorta(c.jor)+" de jornada"),onclick:()=>diaPersona(w,f,c,re)},[
      el("span",{class:"tx",text:txt}),c.jor&&!c.fal?el("i",{class:"bar"},el("i",{style:"width:"+pct+"%"})):null,c.n?el("small",{text:c.n+(c.n>1?" trab.":" trab.")+(c.sinT?" ·"+c.sinT+"?":"")}):null]));};
  const filaExtra=(nom,M,cls)=>el("tr",{class:cls},[el("th",{text:nom})].concat(X.dias.map(f=>{const x=M[f];return el("td",{class:"c "+(x.n?cls:"vacio")},x.n?el("button",{class:"cel",onclick:()=>listaOTs(nom+" · "+fLarga(f),x.ots,re)},[el("span",{class:"tx",text:String(x.n)}),x.min?el("small",{text:hCorta(x.min)}):null]):el("span",{class:"tx",text:"·"}));})));
  box.appendChild(el("div",{class:"card"},[el("div",{class:"tw-sem"},el("table",{class:"sem"},[el("thead",null,el("tr",null,[el("th",{text:""})].concat(X.dias.map((f,i)=>el("th",{class:f===hoy?"hoy":"",text:DL[i]+" "+f.slice(8,10)}))))),
    el("tbody",null,R.gente.map(w=>el("tr",null,[el("th",{text:w.nombre.split(" ")[0]+(w.nombre.split(" ")[1]?" "+w.nombre.split(" ")[1][0]+".":"")})].concat(X.dias.map(f=>celda(w,f))))).concat([filaExtra("Sin asignar",X.libre,"libre"),filaExtra("Todo el equipo",X.equipo,"equipo")]))])),
    el("div",{class:"ley"},[["ok","Le sobra tiempo"],["warn","Casi lleno (80 %+)"],["bad","Se pasa de su jornada"],["libra","Libra"],["sinh","Sin horario puesto"]].map(([k,t])=>el("span",null,[el("i",{class:"c "+k}),t])))]));
  box.appendChild(el("details",{class:"ayuda"},[el("summary",{text:"¿Cómo se lee esta tabla?"}),el("p",{class:"hint",text:"Cada casilla: horas de trabajo asignado / horas de jornada (según su horario y las horas extra). Solo cuentan los trabajos con tiempo estimado. Toca una casilla para ver sus trabajos y pasarlos a otra persona."})]));}
function listaOTs(tit,L,re){dlg(tit,el("div",null,L.length?L.map(o=>el("div",{class:"linea"},[el("span",{style:"flex:1"},[el("b",{text:o.titulo}),el("small",{class:"hint",style:"display:block;margin:0",text:[(EST[o.estado]||[o.estado])[0],o.minutos_est?""+durTxt(o.minutos_est):"sin tiempo",quienTxt(o)].filter(Boolean).join(" · ")})]),
  o.estado==="hecha"?null:el("button",{class:"btn sec peq",text:"Cambiar",onclick:()=>{document.querySelectorAll(".ov").forEach(x=>x.remove());formOT(o,re);}})])):el("p",{class:"empty",text:"Nada."})));}
function diaPersona(w,f,c,re){const L=c.ots;
  dlg(w.nombre+" · "+fLarga(f),el("div",null,[el("p",{class:"hint",text:c.fal?"Falta este día ("+(c.fal.motivo||"falta")+")"+(L.length?": pasa sus trabajos a otra persona o pon quién le cubre en «＋ Falta».":"."):(c.tr==null?"Sin horario puesto para este día.":!c.tr.length?"Libra este día.":"Jornada: "+horTxt(c.tr)+(c.ex?" + horas extra":""))+(c.jor&&!c.fal?" · Trabajo asignado: "+durTxt(c.carga)+" de "+durTxt(c.jor)+(c.carga>c.jor?" (se pasa "+durTxt(c.carga-c.jor)+")":" (le quedan "+durTxt(c.jor-c.carga)+")"):"")}),
    L.length?el("div",null,L.map(o=>el("div",{class:"linea"},[el("span",{style:"flex:1"},[el("b",{text:o.titulo}),el("small",{class:"hint",style:"display:block;margin:0",text:[(EST[o.estado]||[o.estado])[0],o.minutos_est?""+durTxt(o.minutos_est):"sin tiempo estimado",o.origen==="fija"?"tarea fija":null].filter(Boolean).join(" · ")})]),
      o.estado==="hecha"?null:el("button",{class:"btn sec peq",text:"Pasar a otro",onclick:()=>{document.querySelectorAll(".ov").forEach(x=>x.remove());formOT(o,re);}})]))):el("p",{class:"empty",text:"No tiene trabajos asignados."})]),
    [{t:"＋ Darle trabajo",fn:()=>{setTimeout(()=>formOT({fecha:f,equipo:finde(f)?"Finde":"Semana",asignados:[w.id]},re),0);}},{t:"Ver el día",cls:"sec",fn:()=>{S.fecha=f;S.tab="hoy";S.fil={quien:w.nombre};pinta();}},{t:"Cerrar",cls:"sec"}]);}
/* ---------- corregir y borrar ---------- */
const puedoEditar=o=>esAdm()||(esEnc()&&o.estado!=="hecha")||(o.creado_por===S.yo.id&&o.fecha>=sumaD(hoyISO(),-1)&&o.estado!=="hecha");
const puedoTiempo=o=>o.estado==="hecha"&&(esAdm()||o.hecho_por===S.yo.id);
function cerrarTodo(){document.querySelectorAll(".ov").forEach(x=>x.remove());}
function editarOT(o,re){if(esAdm()){formOT(o,re);return;}const x={titulo:o.titulo,lugar:o.lugar||"",descripcion:o.descripcion||"",urgente:o.prioridad==="alta",fecha:o.fecha};
  /* el encargado puede cambiar el día en que se hace (p. ej. pasar un trabajo del sábado al domingo) */
  dlg("Corregir la OT",el("div",null,[fld("¿Qué hay que hacer?",inp(x.titulo,v=>x.titulo=v)),...(esEnc()&&o.estado!=="hecha"?[fld("Día en que se hace",inp(x.fecha,v=>x.fecha=v,{type:"date"}))]:[]),fld("¿Dónde?",inp(x.lugar,v=>x.lugar=v)),fld("Detalles",area(x.descripcion,v=>x.descripcion=v)),
    el("label",{style:"display:flex;gap:8px;align-items:center"},[el("input",{type:"checkbox",checked:x.urgente,onchange:e=>x.urgente=e.target.checked}),"Urgente"])]),
    [{t:"Borrar",cls:"bad",fn:async()=>{if(!confirm("¿Borrar este trabajo? Se quita de la lista."))return false;await rpc("ot_mia_borrar",{p_tok:S.tok,p_ot:o.id});toast("Borrada");re();}},
     {t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{if(!o.habitual_id&&esProblema(x.titulo,x.descripcion)&&!(x.lugar||"").trim()){toast(MSG_LUG);return false;}await rpc("ot_mia_editar",{p_tok:S.tok,p_ot:o.id,p:x});toast("Corregida");re();}}]);}
function corregirTiempo(o,re){const w=preguntaTiempo(Object.assign({},o,{minutos_est:o.minutos||o.minutos_est,inicio:null}));
  w.querySelector("b").textContent="¿Cuánto se tardó de verdad?";w.querySelector("p").textContent="Ahora pone "+(o.minutos!=null?durTxt(o.minutos):"sin tiempo")+". Elige el tiempo correcto.";
  dlg("Corregir tiempo · "+o.titulo,w,[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{if(!w.val()){toast("Elige el tiempo");return false;}await rpc("tiempo_corregir",{p_tok:S.tok,p_ot:o.id,p_minutos:w.val()});toast("Tiempo corregido: "+durTxt(w.val()));re();}}]);}
/* ---------- moldes y hornos mantenedores con código QR ---------- */
const TIPOS_EL=[["inyectora","Inyectora","","Inyectoras"],["molde","Molde","","Moldes"],["horno","Horno mantenedor","","Hornos mantenedores"],["otro","Otro","","Otros"]];
const tipoEl=k=>TIPOS_EL.find(x=>x[0]===k)||TIPOS_EL.find(x=>x[0]==="otro");
const urlEl=c=>APP_URL+"?el="+encodeURIComponent(c);
function estadoEl(e){const d=e.ultima?Math.floor((new Date(hoyISO()+"T12:00:00")-new Date(diaDe(e.ultima)+"T12:00:00"))/864e5):null;
  const nunca=e.ult_otra?"Sin limpieza registrada":"Nunca limpiado";
  if(!e.frecuencia_dias)return{k:"sin",d,t:e.ultima?(d===0?"Limpiado hoy":"Limpiado hace "+d+" día"+(d>1?"s":"")):nunca};
  if(d==null)return{k:"bad",d,t:nunca};
  if(d>e.frecuencia_dias)return{k:"bad",d,t:"Atrasado "+(d-e.frecuencia_dias)+" día"+(d-e.frecuencia_dias>1?"s":"")};
  if(d===e.frecuencia_dias)return{k:"warn",d,t:"Toca hoy"};
  return{k:"ok",d,t:d===0?"Limpiado hoy":"Al día · toca en "+(e.frecuencia_dias-d)+" d"};}
/* vaciado preventivo de hornos mantenedores (mínimo 1 vez al año para no tapar cono y tolva) */
const fAnio=f=>new Date(f+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"numeric",year:"numeric"});
function vaciadoEl(e){if(e.tipo!=="horno"||!e.vaciado_dias)return null;
  if(e.vaciado_excepcion)return{k:"sin",t:"Excepción"+(e.vaciado_nota?": "+e.vaciado_nota:"")};
  if(e.vaciado_abierto)return{k:"info",t:"Vaciado en marcha"};
  if(!e.ult_vaciado)return{k:"warn",t:"Vaciado: sin fecha"};
  const d=Math.floor((new Date(hoyISO()+"T12:00:00")-new Date(e.ult_vaciado+"T12:00:00"))/864e5),rest=e.vaciado_dias-d,lim=sumaD(e.ult_vaciado,e.vaciado_dias);
  if(rest<0)return{k:"bad",t:"Vaciado atrasado "+(-rest)+" d",d,lim};
  if(rest<=30)return{k:"warn",t:"Vaciar antes del "+fAnio(lim),d,lim};
  return{k:"ok",t:"Vaciado hace "+(d<60?d+" d":Math.round(d/30)+" meses"),d,lim};}
let ELS=null;const ordEl=(a,b)=>a.tipo.localeCompare(b.tipo)||a.codigo.localeCompare(b.codigo,"es",{numeric:true});async function elementosL(force){if(!ELS||force)ELS=(await rpc("elementos",{p_tok:S.tok})).sort(ordEl);return ELS;}
async function listaElementos(re,filtro0){let L;try{L=await elementosL(true);}catch(e){toast(e.message);return;}
  if(!L.length){dlg("Inyectoras y hornos",el("p",{class:"empty",text:esAdm()?"Todavía no hay ninguno. Añádelos en Tareas.":"Todavía no hay ninguno dado de alta."}));return;}
  let q="",tp="",vac=filtro0==="vaciados";const box=el("div",{class:"lst-el"});const ORD={bad:0,warn:1,info:2,sin:2,ok:3};
  const ordV=e=>{const v=vaciadoEl(e);return v?ORD[v.k]:3;};
  const pin=()=>{box.textContent="";const F=L.filter(e=>e.activo&&(!tp||e.tipo===tp)&&(!vac||(vaciadoEl(e)&&["bad","warn"].includes(vaciadoEl(e).k)))&&(!q||(e.codigo+" "+e.nombre+" "+(e.lugar||"")).toLowerCase().includes(q.toLowerCase())))
      .sort((a,b)=>vac?(ordV(a)-ordV(b)||(a.ult_vaciado||"").localeCompare(b.ult_vaciado||"")):(Math.min(ORD[estadoEl(a).k],ordV(a))-Math.min(ORD[estadoEl(b).k],ordV(b))||a.codigo.localeCompare(b.codigo,"es",{numeric:true})));
    if(!F.length)box.appendChild(el("p",{class:"empty",text:"Nada con esa búsqueda."}));
    F.forEach(e=>{const s=estadoEl(e);box.appendChild(el("button",{class:"linea elx",onclick:()=>{cerrarTodo();fichaElemento(e.codigo,re);}},[el("span",{class:"ico",text:tipoEl(e.tipo)[2]}),
      el("span",{style:"flex:1;min-width:0"},[el("b",{text:e.nombre}),el("small",{class:"hint",style:"display:block;margin:0",text:e.codigo+(e.lugar?" · "+e.lugar:"")+(e.ultima_por?" · último: "+e.ultima_por.split(" ")[0]:"")+(e.ult_otra?" · "+(ACC_HORNO[e.ult_otra_accion]||"Vaciado")+" "+fCorta(diaDe(e.ult_otra))+(e.ult_otra_por?" ("+e.ult_otra_por.split(" ")[0]+")":""):"")})]),el("span",{style:"display:flex;flex-direction:column;gap:3px;align-items:flex-end"},[el("span",{class:"pill "+(s.k==="sin"?"":s.k),text:s.t}),(v=>v?el("span",{class:"pill "+(v.k==="sin"?"":v.k),text:v.t}):null)(vaciadoEl(e))])]));});};
  const tps=el("div",{class:"chips",style:"margin:8px 0"});const pt=()=>{tps.textContent="";[["","Todos"]].concat(TIPOS_EL.filter(t=>L.some(e=>e.tipo===t[0])).map(t=>[t[0],t[2]+" "+t[3]])).forEach(([k,t])=>tps.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(tp===k&&!vac),text:t,onclick:()=>{tp=k;vac=false;pt();pin();}})));
    if(L.some(e=>e.tipo==="horno"))tps.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(vac),text:"Toca vaciar ("+L.filter(e=>e.activo&&vaciadoEl(e)&&["bad","warn"].includes(vaciadoEl(e).k)).length+")",onclick:()=>{vac=!vac;tp="";pt();pin();}}));};pt();
  const bus=el("input",{type:"search",placeholder:"Buscar por código o nombre",class:"bus","aria-label":"Buscar"});bus.oninput=()=>{q=bus.value;pin();};
  dlg("Inyectoras y hornos",el("div",null,[escanerBtn(re),(esAdm()||S.resp)&&L.some(e=>e.tipo==="horno")?el("button",{class:"btn sec",style:"width:100%;margin:0 0 8px",text:"Gasto de hornos",onclick:()=>gastoHornos()}):null,bus,tps,box]));pin();}
function escanerBtn(re){return ESC.disponible()?el("button",{class:"btn grande",style:"background:var(--acc)",text:"Escanear código QR",onclick:()=>{cerrarTodo();escanear(re);}}):el("p",{class:"hint",text:"Para escanear: abre la cámara del móvil y apunta al código QR del molde u horno. Se abre la app solo. O búscalo aquí abajo."});}
/* escáner: funciona en Android y en iPhone (escaner.js) */
function escanear(re){ESC.abrir({titulo:"Escanear",texto:"Apunta al código QR de la máquina, el horno o el molde",alLeer:txt=>{let cod=txt;try{const u=new URL(txt);cod=u.searchParams.get("el")||txt;}catch(e){}fichaElemento(cod,re);}});}
function datosHorno(e){if(e.tipo!=="horno")return null;const L=[];
  if(e.modelo)L.push(el("p",{style:"margin:0 0 4px"},[el("b",{text:"Modelo: "}),e.modelo]));
  if(e.capacidad_kg)L.push(el("p",{style:"margin:0 0 4px"},[el("b",{text:"Capacidad: "}),e.capacidad_kg+" kg"]));
  const C=(e.consumibles||[]).filter(c=>c&&c.nombre);
  if(hornoCerrado(e)||C.length){L.push(el("b",{text:"Consumibles"}));
  L.push(C.length?el("ul",{class:"hist"},C.map(c=>el("li",null,[el("b",{text:c.nombre}),(c.cant?" · "+c.cant+" por cambio":""),(c.donde?" · "+c.donde:"")]))):el("p",{class:"hint",text:"Sin consumibles puestos. Los pone el admin en Editar."}));}
  if(!hornoCerrado(e))L.push(el("p",{class:"hint",style:"margin:8px 0 0",text:"Horno abierto: no lleva cono, tolva ni dosificador, así que sus cambios no descuentan nada del almacén."}));
  return el("div",{class:"card",style:"padding:10px 12px;margin:0 0 10px"},L);}
/* lo que se descuenta en cada cambio y lo gastado en este horno */
const eur=n=>n==null?"—":(+n).toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:n>=100?0:2});
const DESDE_G=[["mes","Este mes"],["ano","Este año"],["todo","Todo"]];
const desdeG=k=>{const d=new Date();if(k==="mes")return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-01";if(k==="ano")return d.getFullYear()+"-01-01";return null;};
async function gastoHorno(e,box,per){if(!hornoCerrado(e))return;per=per||"ano";let G;try{G=await rpc("horno_gasto",{p_tok:S.tok,p_el:e.id,p_desde:desdeG(per)});}catch(er){box.textContent="";return;}
  box.textContent="";const V=G.ver_precios,RC=G.recambios||{},C=G.cambios||{};
  const pz=L=>L.length?L.map(p=>(p.cant>1?p.cant+" × ":"")+p.nombre+(V&&p.precio!=null?" ("+eur(p.precio)+")":"")).join(" · "):"—";
  box.appendChild(el("div",{class:"card",style:"padding:10px 12px;margin:0 0 10px"},[el("b",{text:"Qué se descuenta del almacén en cada cambio"}),
    el("ul",{class:"hist"},[["cambio_cono","Cambio de cono"],["cambio_tolva","Cambio de tolva (la que elijas; si se cambia solo la tolva, pregunta qué juntas se han gastado)"],["cambio_dosificador","Cambio de dosificador"],
      ["cambio_resistencia","Cambio de resistencia (pregunta cuántas)"],["cambio_centrador","Cambio de centrador (pregunta cuántos)"],["cambio_con_estrella","Cambio de conexión estrella (pregunta cuántas)"],["cambio_con_fase","Cambio de conexión fase (pregunta cuántas)"]]
      .filter(([k])=>(RC[k]||[]).length||!PIEZA_H[k]).map(([k,t])=>el("li",null,[el("b",{text:t+": "}),pz(RC[k]||[])]))
      .concat((G.otras||[]).length?[el("li",null,[el("b",{text:"Cambio de otras piezas: "}),"eliges cuáles y cuántas de las "+G.otras.length+" piezas de este horno"])]:[])),
    el("p",{class:"hint",style:"margin:4px 0 0",text:"Si se cambian tolva y cono a la vez, se descuentan los dos."})]));
  const ch=el("div",{class:"chips",style:"margin:6px 0"},DESDE_G.map(([k,t])=>el("button",{type:"button",class:"chip","aria-pressed":String(per===k),text:t,onclick:()=>gastoHorno(e,box,k)})));
  const P=G.piezas||[],U=G.ultimos||[],nc=(C.cambio_cono||0)+(C.cambio_tolva_cono||0),nt=(C.cambio_tolva||0)+(C.cambio_tolva_cono||0),nd=C.cambio_dosificador||0;
  const mal=U.reduce((s,u)=>s+(+u.mal||0),0);
  box.appendChild(el("div",{class:"card",style:"padding:10px 12px;margin:0 0 10px"},[el("b",{text:"Gasto de este horno"}),ch,
    el("div",{class:"g-kpi"},[["Conos",nc],["Tolvas",nt],["Dosificadores",nd]].concat([["Resistencias","cambio_resistencia"],["Centradores","cambio_centrador"],["Con. estrella","cambio_con_estrella"],["Con. fase","cambio_con_fase"],["Otras piezas","cambio_otra"]].filter(([,k])=>C[k]).map(([t,k])=>[t,C[k]])).map(([t,n])=>el("div",null,[el("small",{text:t}),el("b",{text:String(n)})])).concat(V?[el("div",null,[el("small",{text:"Gasto"}),el("b",{text:eur(G.total)})])]:[])),
    P.length?el("table",{class:"g-tab"},[el("thead",null,el("tr",null,["Pieza","Uds."].concat(V?["Importe"]:[]).map(h=>el("th",{text:h})))),
      el("tbody",null,P.map(p=>el("tr",null,[el("td",{text:p.nombre}),el("td",{text:String(+p.cant)})].concat(V?[el("td",{text:p.precio==null?"sin precio":eur(p.importe)})]:[]))))]):el("p",{class:"hint",text:"Ningún cambio apuntado en este periodo."}),
    V&&G.sin_precio?el("p",{class:"hint",text:G.sin_precio+" pieza"+(G.sin_precio>1?"s":"")+" sin precio en el Almacén: no suman en el gasto. Pon el precio en el Almacén y se actualiza solo (cada hora)."}):null,
    U.length?el("div",null,[el("b",{style:"display:block;margin-top:8px",text:"Últimos cambios"}),el("ol",{class:"hist"},U.map(u=>el("li",null,[el("b",{text:fCorta(diaDe(u.cuando))+" · "+(ACC_HORNO[u.accion]||u.accion)}),
      " · "+(u.quien||"")+" · "+u.piezas.map(p=>(p.cant>1?p.cant+" × ":"")+p.nombre+(p.envio==="enviado"?"":p.envio==="pendiente"?" (enviando…)":" (no ha llegado"+(p.info?": "+p.info:"")+")")).join(", ")+(V&&u.importe!=null?" · "+eur(u.importe):"")])))]):null,
    mal&&esAdm()?el("button",{class:"btn sec peq",style:"margin-top:8px",text:"Reintentar envío al Almacén",onclick:async ev=>{ev.target.disabled=true;try{const n=await rpc("consumos_horno_reenviar",{p_tok:S.tok});toast(n?"Reenviados "+n:"Nada que reenviar");setTimeout(()=>gastoHorno(e,box,per),2500);}catch(er){toast(er.message);ev.target.disabled=false;}}}):null]));}
/* ranking de gasto de todos los hornos */
async function gastoHornos(per){per=per||"ano";let G;try{G=await rpc("horno_gasto",{p_tok:S.tok,p_el:null,p_desde:desdeG(per)});}catch(er){toast(er.message);return;}
  const V=G.ver_precios,H=G.hornos||[];const tot=H.reduce((s,h)=>s+(+h.total||0),0);
  cerrarTodo();
  dlg("Gasto de hornos",el("div",null,[el("div",{class:"chips",style:"margin:0 0 8px"},DESDE_G.map(([k,t])=>el("button",{type:"button",class:"chip","aria-pressed":String(per===k),text:t,onclick:()=>gastoHornos(k)}))),
    el("div",{class:"g-kpi"},[["Hornos con cambios",H.length],["Cambios",H.reduce((s,h)=>s+(+h.cambios||0),0)]].map(([t,n])=>el("div",null,[el("small",{text:t}),el("b",{text:String(n)})])).concat(V?[el("div",null,[el("small",{text:"Gasto total"}),el("b",{text:eur(tot)})])]:[])),
    G.mal?el("div",{class:"aviso"},[G.mal+" pieza"+(G.mal>1?"s":"")+" no ha"+(G.mal>1?"n":"")+" llegado al Almacén",el("small",{text:"Ábrelo en la ficha del horno para ver cuál y reintentarlo."})]):null,
    H.length>1&&window.GRAF?(()=>{const g=el("div");const T=H.slice(0,15);setTimeout(()=>GRAF.barras(g,V&&T.some(h=>+h.total>0)?
        {x:T.map(h=>h.codigo.replace(/^H-/,"")),horizontal:true,fmt:"eur",series:[{name:"Gasto",data:T.map(h=>Math.round(+h.total||0))}],alClick:i=>{cerrarTodo();fichaElemento(T[i].codigo);}}:
        {x:T.map(h=>h.codigo.replace(/^H-/,"")),horizontal:true,apilado:true,fmt:"n",series:[["Conos","conos"],["Tolvas","tolvas"],["Dosificadores","dosificadores"],["Resistencias","resistencias"],["Centradores","centradores"],["Conexiones","conexiones"],["Otras","otras"]].map(([n,k])=>({name:n,data:T.map(h=>+h[k]||0)})),alClick:i=>{cerrarTodo();fichaElemento(T[i].codigo);}}),0);
      return el("div",{style:"margin:6px 0 10px"},[g]);})():null,
    H.length?el("table",{class:"g-tab"},[el("thead",null,el("tr",null,["Horno","Conos","Tolvas","Dosif.","Resist.","Centr.","Conex.","Otras"].concat(V?["Gasto"]:[]).map(h=>el("th",{text:h})))),
      el("tbody",null,H.map(h=>el("tr",{style:"cursor:pointer",onclick:()=>{cerrarTodo();fichaElemento(h.codigo);}},[el("td",null,[el("b",{text:h.codigo.replace(/^H-/,"")}),el("small",{class:"hint",style:"display:block;margin:0",text:h.modelo||""})]),
        el("td",{text:String(h.conos)}),el("td",{text:String(h.tolvas)}),el("td",{text:String(h.dosificadores)}),el("td",{text:String(+h.resistencias||0)}),el("td",{text:String(+h.centradores||0)}),el("td",{text:String(+h.conexiones||0)}),el("td",{text:String(+h.otras||0)})].concat(V?[el("td",{text:eur(h.total)+(h.sin_precio?" *":"")})]:[]))))]):el("p",{class:"empty",text:"Ningún cambio de piezas del horno en este periodo."}),
    V&&H.some(h=>h.sin_precio)?el("p",{class:"hint",text:"* Hay piezas sin precio en el Almacén: no suman."}):null,
    el("p",{class:"hint",text:"Conos, tolvas y dosificadores: número de cambios. Resistencias, centradores, conexiones y otras: piezas cambiadas. Cuenta lo apuntado desde que se activó el descuento automático. Toca un horno para ver el detalle."})]),[{t:"Cerrar",cls:"sec"}]);}
async function fichaElemento(cod,re){re=re||(()=>pinta());let e;try{e=await rpc("elemento_ficha",{p_tok:S.tok,p_cod:cod});}catch(er){toast(er.message);return;}
  if(e.tipo==="inyectora"){fichaIny(e,re);return;}
  const s=estadoEl(e),T=tipoEl(e.tipo);
  const hist=(e.historial||[]).length?el("ol",{class:"hist"},e.historial.map(h=>el("li",null,[el("b",{text:fCorta(diaDe(h.fin))+" "+hora(h.fin)}),
    (h.accion&&h.accion!=="limpieza"?" · "+ACC_HORNO[h.accion]:"")+" · "+h.quien+(h.min!=null?" · "+durTxt(h.min):"")+(h.motivo?" · motivo: "+h.motivo:"")+(h.nota?" · "+h.nota:"")+(h.nfotos?" · Fotos"+h.nfotos:"")]))):el("p",{class:"hint",text:"Todavía no se ha limpiado nunca con la app."});
  const bots=[];
  if(e.abierta)bots.push({t:"Terminar limpieza",cls:"ok",fn:()=>{setTimeout(()=>terminar(Object.assign({},e.abierta,{puntos:e.puntos}),()=>{fichaElemento(e.codigo,re);re();}),0);}});
  else if(e.tipo==="horno"){bots.push({t:"＋ Abrir OT",cls:"ok",fn:()=>{setTimeout(()=>elegirTipoOT(e,re),0);}});
    bots.push({t:"Registrar en el horno",fn:()=>{setTimeout(()=>elegirAccionHorno(e,re),0);}});}
  else{bots.push({t:"Empezar",fn:async()=>{await rpc("limpieza_abrir",{p_tok:S.tok,p_el:e.id,p_hecha:false,p_minutos:null,p_nota:null,p_checks:null});toast("Empezado: cuando acabes, vuelve a escanear y pulsa «Terminar»");re();}});
    bots.push({t:"Ya está limpio",cls:"ok",fn:()=>{setTimeout(()=>yaLimpio(e,re),0);}});}
  if(esAdm())bots.push({t:"Editar",cls:"sec",fn:()=>{setTimeout(()=>formElemento(e,re),0);}});
  bots.push({t:"Cerrar",cls:"sec"});
  const gbox=el("div");if(e.tipo==="horno")setTimeout(()=>gastoHorno(e,gbox),0);
  dlg(T[2]+" "+e.nombre,el("div",null,[datosHorno(e),el("div",{class:"meta",style:"margin:0 0 8px"},[el("span",{class:"pill info",text:T[1]+" · "+e.codigo}),e.lugar?el("span",{text:e.lugar}):null,el("span",{class:"pill "+(s.k==="sin"?"":s.k),text:s.t}),
      e.frecuencia_dias?el("span",{text:"Cada "+e.frecuencia_dias+" día"+(e.frecuencia_dias>1?"s":"")}):null,e.minutos_est?el("span",{text:durTxt(e.minutos_est)}):null]),
    e.abierta?el("div",{class:"aviso"},[(e.abierta.estado==="pendiente"?"Hay un trabajo para hoy: "+e.abierta.titulo:"Limpieza empezada a las "+hora(e.abierta.inicio)),el("small",{text:e.abierta.estado==="pendiente"?"Cuando acabes pulsa «Terminar limpieza» y se apunta en ese trabajo.":"Cuando acabes pulsa «Terminar limpieza»."})]):null,
    e.tipo==="horno"&&vaciadoEl(e)?(v=>el("div",{class:"aviso"+(v.k==="bad"?" mal":""),style:v.k==="ok"||v.k==="sin"||v.k==="info"?"background:var(--surf2);color:var(--ink)":""},[v.t,
      el("small",{text:(e.ult_vaciado?"Último vaciado: "+fAnio(e.ult_vaciado)+(v.lim?" · hay que vaciarlo antes del "+fAnio(v.lim):""):"No consta ningún vaciado. "+(esAdm()?"Pon la fecha del último en «Editar».":"Díselo al encargado."))+
        " · Vaciarlo al menos cada "+(e.vaciado_dias>=365?"año":e.vaciado_dias+" días")+" evita que se tapen el cono y la tolva."+(e.cambios_365?" Cambios de tolva/cono en el último año: "+e.cambios_365+".":"")})]))(vaciadoEl(e)):null,
    e.tipo==="horno"?el("div",null,[el("h4",{text:"Último registro"}),el("div",{class:"chk"},[linUltHorno(e,re,"limpieza","Limpieza"),linUltHorno(e,re,"vaciado","Vaciado"),linUltHorno(e,re,"cambio_tolva","Cambio de tolva"),linUltHorno(e,re,"cambio_cono","Cambio de cono"),linUltHorno(e,re,"cambio_dosificador","Cambio de tubo dosificador")].concat(Object.keys(PIEZA_H).filter(k=>e.recambios&&e.recambios[PIEZA_H[k]]).map(k=>linUltHorno(e,re,k,ACC_HORNO[k]))))]):null,
    gbox,
    el("h4",{text:e.tipo==="horno"?"Historial":"Últimas limpiezas"}),hist]),bots);}
/* ficha de una inyectora: primero los datos y el historial; apuntar la limpieza es un botón aparte */
/* detalle de una limpieza ya apuntada: checklist, nota, fotos y, si puede, corregir la fecha */
const ERR_FECHA={FECHA_MAL:"La fecha no puede ser futura",NO_PERMISO:"No puedes cambiar esta limpieza",NO_ADMIN:"Solo el admin puede editar el registro",NO_HECHA:"Esta limpieza todavía no está terminada",NO_EXISTE:"No se encuentra esta limpieza",NO_CAMBIO:"Este registro no es un cambio de piezas",PIEZAS_PENDIENTES:"Antes quita las piezas que tiene apuntadas",ACCION_MAL:"Ese tipo de registro no existe"};
const errFecha=m=>{const k=Object.keys(ERR_FECHA).find(x=>String(m).includes(x));return k?ERR_FECHA[k]:m;};
function detalleLimpieza(h,e,re){
  const box=el("div",null,el("div",{class:"empty",text:"Cargando…"}));
  const cerrar=dlg("Limpieza · "+e.nombre,box,[{t:"Cerrar",cls:"sec"}]);
  rpc("limpieza_detalle",{p_tok:S.tok,p_ot:h.id}).then(D=>{
    box.textContent="";
    const mins=D.inicio&&D.fin?Math.round((new Date(D.fin)-new Date(D.inicio))/60000):null;
    const pts=Object.entries(D.checklist||{});
    box.appendChild(el("div",{class:"hint",style:"margin:0 0 8px",text:(D.accion&&D.accion!=="limpieza"?(TXT_HORNO[D.accion]||ACC_HORNO[D.accion]||D.accion)+" · ":"")+fCorta(diaDe(D.fin))+" · "+hora(D.fin)+" · "+(D.quien||"")+(mins!=null?" · "+durTxt(mins):"")}));
    if(D.resultado) box.appendChild(el("span",{class:"pill "+(D.resultado==="OK"?"ok":"bad"),text:D.resultado==="OK"?"Checklist OK":"Checklist con fallos"}));
    box.appendChild(el("h4",{text:"Checklist"}));
    box.appendChild(pts.length?el("div",{class:"chk"},pts.map(([k,v])=>el("div",{class:"linea",style:"display:flex;justify-content:space-between;gap:8px"},[el("span",{text:k}),el("b",{class:v==="OK"?"":"bad",text:v==="OK"?"OK":"NO-OK"})]))):el("p",{class:"hint",text:"Esta limpieza se apuntó sin checklist."}));
    if(D.nota) box.appendChild(el("p",{style:"margin:8px 0 0",text:"Nota: "+D.nota}));
    box.appendChild(el("button",{type:"button",class:"btn sec",style:"width:100%;margin:10px 0 0",text:"Ver fotos"+(h.nfotos?" ("+h.nfotos+")":""),onclick:()=>{cerrar();setTimeout(()=>verFotos({id:h.id,titulo:e.nombre+" · "+fCorta(diaDe(D.fin))},()=>{}),0);}}));
    const cambios=D.cambios||[];
    if(cambios.length) box.appendChild(el("div",null,[el("h4",{text:"Cambios de fecha"}),el("ul",{class:"hist"},cambios.map(c=>el("li",{text:cuandoLim(c.cuando)+" · "+(c.quien||"")+" · "+c.detalle}) ))]));
    if(D.puede_corregir) box.appendChild(el("button",{type:"button",class:"btn sec",style:"width:100%;margin:10px 0 0",text:"Corregir fecha y hora",onclick:()=>{cerrar();setTimeout(()=>corregirFechaLimpieza(h,e,D,re),0);}}));
    if(D.puede_editar) box.appendChild(el("button",{type:"button",class:"btn sec",style:"width:100%;margin:8px 0 0",text:"Editar registro (quién, qué se hizo, piezas)",onclick:()=>{cerrar();setTimeout(()=>editorRegistro(h,e,D,re),0);}}));
  }).catch(er=>{box.textContent="";box.appendChild(el("p",{class:"empty",text:errFecha(er.message)}));});
}
/* admin: corregir quién lo hizo, qué se hizo y qué piezas se cambiaron, o anular el registro entero */
function editorRegistro(h,e,D,re){
  const accIni=D.accion||"limpieza", esCambio=accIni.indexOf("cambio")===0;
  const f={quien:D.hecho_por||"",accion:accIni};
  let P=null;
  const selQ=el("select",null,[el("option",{value:"",text:"— Sin cambios —"})]);
  trabajadores().then(L=>{(L||[]).slice().sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre),"es")).forEach(t=>selQ.appendChild(el("option",{value:t.id,text:t.nombre})));selQ.value=f.quien;}).catch(()=>{});
  selQ.onchange=()=>{f.quien=selQ.value;};
  const piezasBox=el("div");
  const pintaPiezas=()=>{piezasBox.textContent="";
    if(f.accion.indexOf("cambio")!==0){piezasBox.appendChild(el("p",{class:"hint",text:"Las piezas solo aplican a los cambios."}));return;}
    if(!P){piezasBox.appendChild(el("p",{class:"hint",text:"Cargando piezas…"}));return;}
    if(!P.length){piezasBox.appendChild(el("p",{class:"hint",text:"No hay piezas descontadas en este registro."}));return;}
    P.forEach(p=>{const cb=el("input",{type:"checkbox"});cb.checked=p.usada;cb.addEventListener("change",()=>{p.usada=cb.checked;});
      piezasBox.appendChild(el("label",{class:"chk"},[cb,el("span",{text:" "+p.nombre+" × "+String(p.cant).replace(".",",")})]));});};
  if(esCambio) rpc("horno_piezas_ot",{p_tok:S.tok,p_ot:h.id}).then(L=>{P=(L||[]).map(p=>Object.assign({usada:true,orig:true},p));pintaPiezas();}).catch(er=>{piezasBox.textContent=errFecha(er.message);});
  const cuerpo=[fld("Quién lo hizo",selQ)];
  if(e.tipo==="horno"){
    const selA=el("select",null,Object.keys(TXT_HORNO).filter(k=>k!=="cambio_tolva_cono").map(k=>el("option",{value:k,text:TXT_HORNO[k]})));
    selA.value=accIni;
    selA.onchange=()=>{f.accion=selA.value;
      if(f.accion.indexOf("cambio")!==0){if(P)P.forEach(p=>{p.usada=false;});}   /* no es un cambio: no quedan piezas */
      else if(!P)P=[];                                                            /* cambio sin piezas apuntadas todavía */
      pintaPiezas();};
    cuerpo.push(fld("Qué se hizo",selA));
  }
  cuerpo.push(piezasBox);
  cuerpo.push(el("p",{class:"hint",text:"Si el cambio no se hizo, usa «Anular registro»: quita del Almacén todas sus piezas y el registro deja de contar."}));
  dlg("Editar registro · "+e.nombre,el("div",null,cuerpo),[
    {t:"Cancelar",cls:"sec"},
    {t:"Anular registro",cls:"sec",fn:async()=>{
      if(!window.confirm("Se anula este registro y se quitan del Almacén sus piezas. ¿Seguro?"))return false;
      try{await rpc("horno_registro_editar",{p_tok:S.tok,p_ot:h.id,p_quien:null,p_accion:null,p_piezas:null,p_anular:true});}
      catch(er){toast(errFecha(er.message));return false;}
      toast("Registro anulado"); if(re) re(); fichaElemento(e.codigo,re);}},
    {t:"Guardar",cls:"ok",fn:async()=>{
      const quienCambio=f.quien&&f.quien!==(D.hecho_por||"")?f.quien:null;
      const accCambio=f.accion!==accIni?f.accion:null;
      let piezas=null;
      if(P&&esCambio){
        const sel=P.filter(p=>p.usada).map(p=>({art:p.art,cant:p.cant}));
        const cambiadas=P.some(p=>p.usada!==p.orig);
        if(cambiadas){
          if(!sel.length&&f.accion.indexOf("cambio")===0){toast("Si no se cambió nada, usa «Anular registro»");return false;}
          piezas=sel;
        }
      }
      if(!quienCambio&&!accCambio&&piezas===null){toast("No hay nada que cambiar");return false;}
      try{await rpc("horno_registro_editar",{p_tok:S.tok,p_ot:h.id,p_quien:quienCambio,p_accion:accCambio,p_piezas:piezas,p_anular:false});}
      catch(er){toast(errFecha(er.message));return false;}
      toast("Registro corregido"); if(re) re(); fichaElemento(e.codigo,re);}}]);
}
const cuandoLim=ts=>new Date(ts).toLocaleString("es-ES",{day:"numeric",month:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"});
function corregirFechaLimpieza(h,e,D,re){
  const d=new Date(D.fin);
  const f={dia:d.toLocaleDateString("sv-SE"),hora:d.toTimeString().slice(0,5)};
  dlg("Corregir fecha · "+e.nombre,el("div",null,[
    el("p",{class:"hint",text:"Pon la fecha y la hora en que se hizo esta limpieza. La duración se mantiene."}),
    fld("Día",inp(f.dia,v=>f.dia=v,{type:"date",max:hoyISO()})),
    fld("Hora de fin",inp(f.hora,v=>f.hora=v,{type:"time"}))]),
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",cls:"ok",fn:async()=>{
      if(!f.dia||!f.hora){toast("Pon el día y la hora");return false;}
      const iso=new Date(f.dia+"T"+f.hora+":00").toISOString();
      try{await rpc("limpieza_fecha_corregir",{p_tok:S.tok,p_ot:h.id,p_fin:iso});}
      catch(er){toast(errFecha(er.message));return false;}
      toast("Fecha corregida");
      if(re) re();
      fichaElemento(e.codigo,re);
    }}]);
}
function fichaIny(e,re){const s=estadoEl(e);const H=e.historial||[];
  const dato=(k,v)=>el("div",{class:"fdato"},[el("small",{text:k}),el("b",{text:v})]);
  const ult=H[0];
  const res=r=>r==="OK"?el("span",{class:"pill ok",text:"Checklist OK"}):r==="NO-OK"?el("span",{class:"pill bad",text:"Checklist con fallos"}):null;
  const cab=el("div",{class:"fgrid"},[dato("Nave",e.lugar||"—"),dato("Estado",s.t),dato("Última limpieza",ult?fCorta(diaDe(ult.fin))+" "+hora(ult.fin):"Nunca"),dato("Hecha por",ult?ult.quien:"—"),
    dato("Tiempo",ult&&ult.min!=null?durTxt(ult.min):"—"),dato("Limpiezas (90 días)",String(e.n90||0)),e.frecuencia_dias?dato("Frecuencia","Cada "+e.frecuencia_dias+" días"):null,e.minutos_est?dato("Tiempo normal",durTxt(e.minutos_est)):null].filter(Boolean));
  const hist=H.length?el("div",{class:"lst"},H.map(h=>el("button",{class:"linea",style:"cursor:pointer",onclick:()=>detalleLimpieza(h,e,re)},[
      el("span",{style:"flex:1;min-width:0"},[el("b",{text:fCorta(diaDe(h.fin))+" · "+hora(h.fin)}),el("small",{class:"hint",style:"display:block;margin:0",text:[h.quien,h.min!=null?durTxt(h.min):null,h.nota?""+h.nota:null].filter(Boolean).join(" · ")})]),
      el("span",{style:"display:flex;flex-direction:column;gap:3px;align-items:flex-end"},[res(h.resultado),h.nfotos?el("span",{class:"pill",text:"Fotos: "+h.nfotos}):null])]))):el("p",{class:"empty",text:"Todavía no hay ninguna limpieza apuntada."});
  const bots=[];
  if(e.abierta)bots.push({t:"Terminar limpieza",cls:"ok",fn:()=>{setTimeout(()=>terminar(Object.assign({},e.abierta,{puntos:e.puntos}),()=>{fichaElemento(e.codigo,re);re();}),0);}});
  else bots.push({t:"Apuntar limpieza",cls:"ok",fn:()=>{setTimeout(()=>dlg("Limpieza de la "+e.nombre,el("p",{class:"hint",text:"¿La vas a empezar ahora o ya está hecha?"}),[
      {t:"Empezar ahora",fn:async()=>{try{await rpc("limpieza_abrir",{p_tok:S.tok,p_el:e.id,p_hecha:false,p_minutos:null,p_nota:null,p_checks:null});toast("Empezada: cuando acabes, vuelve a la ficha y pulsa «Terminar»");re();}catch(er){toast(er.message);}}},
      {t:"Ya está limpia",cls:"ok",fn:()=>{setTimeout(()=>yaLimpio(e,re),0);}},{t:"Cancelar",cls:"sec"}]),0);}});
  if(esAdm())bots.push({t:"Editar",cls:"sec",fn:()=>{setTimeout(()=>formElemento(e,re),0);}});
  bots.push({t:"Cerrar",cls:"sec"});
  dlg("Inyectora "+e.nombre,el("div",null,[
    e.abierta?el("div",{class:"aviso"},[e.abierta.estado==="pendiente"?"Hay un trabajo para hoy: "+e.abierta.titulo:"Limpieza empezada a las "+hora(e.abierta.inicio),el("small",{style:"display:block;font-weight:400",text:"Cuando acabes pulsa «Terminar limpieza»."})]):null,
    cab,el("h4",{text:"Historial de limpiezas"}),hist]),bots);}
function yaLimpio(e,re,GP){if(GP===undefined&&!(e.puntos&&e.puntos.length)){rpc("check_el_puntos",{p_tok:S.tok,p_el:e.id}).then(r=>yaLimpio(e,re,Array.isArray(r)?r:[])).catch(()=>yaLimpio(e,re,[]));return;}const gp=GP&&GP.length?GP:null;const w=preguntaTiempo({minutos_est:e.minutos_est,inicio:null});w.querySelector("p").textContent=e.minutos_est?"Viene marcado el tiempo normal (★); cámbialo si has tardado más o menos.":"Toca el tiempo que más se parezca.";
  let nota="";const fotos=[];const fbox=el("div",{class:"fotos"});const pts=(e.puntos&&e.puntos.length)?e.puntos.slice():null;const ck={};
  dlg("Limpio: "+e.nombre,el("div",null,[w,pts?el("div",null,[el("b",{text:"Puntos de la limpieza (quita o añade los que hagan falta)"}),puntosEd(pts,ck)]):gp?el("div",null,[el("b",{text:"Marca cómo ha quedado cada punto"}),el("div",{class:"chk"},gp.map(p=>puntoTrab(p,ck)))]):null,fld("Nota (opcional)",area("",x=>nota=x)),
    el("label",{class:"btn sec",style:"display:block;text-align:center;cursor:pointer"},["Añadir foto",el("input",{type:"file",accept:"image/*",style:"display:none",onchange:async ev=>{const f=ev.target.files[0];if(!f)return;let d;try{d=await comprime(f);}catch(er){toast("Esa foto no se ha podido leer. Prueba con otra.");return;}fotos.push(d);fbox.appendChild(el("img",{src:d,alt:"foto"}));}})]),fbox]),
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",cls:"ok",fn:async()=>{if(!w.val()){toast("Marca cuánto has tardado");return false;}
      if(pts&&pts.some(k=>!ck[k])){toast("Falta marcar: "+pts.find(k=>!ck[k]));return false;}
      if(gp){const f=gp.find(x=>x.tipo!=="txt"&&!ck[x.texto]);if(f){toast("Falta marcar: "+f.texto);return false;}const sf=!fotos.length&&gp.find(x=>x.foto_si_mal&&ck[x.texto]==="NO-OK");if(sf){toast("Pon una foto de cómo ha quedado: "+sf.texto);return false;}}
      const o=await rpc("limpieza_abrir",{p_tok:S.tok,p_el:e.id,p_hecha:true,p_minutos:w.val(),p_nota:nota||null,p_checks:pts?Object.fromEntries(pts.map(k=>[k,ck[k]])):(gp?ck:null)});for(const d of fotos)await guardarFoto(o.id,d);
      toast("Apuntado: "+e.nombre+" limpio ("+durTxt(w.val())+")");re();}}]);}
/* hornos mantenedores: qué se ha hecho (limpieza con checklist; vaciado y cambios de tolva sin checklist) */
const ACC_HORNO={limpieza:"Limpieza",vaciado:"Vaciado",cambio_tolva:"Cambio de tolva",cambio_cono:"Cambio de cono",cambio_dosificador:"Cambio de tubo dosificador",cambio_tolva_cono:"Cambio de tolva y cono",
  cambio_resistencia:"Cambio de resistencia",cambio_centrador:"Cambio de centrador",cambio_con_estrella:"Cambio de conexión estrella",cambio_con_fase:"Cambio de conexión fase",cambio_otra:"Cambio de otras piezas"};
/* piezas eléctricas del horno: cada cambio descuenta la suya del Almacén (la que lleva ese horno) y pregunta cuántas */
const PIEZA_H={cambio_resistencia:"resistencia",cambio_centrador:"centrador",cambio_con_estrella:"con_estrella",cambio_con_fase:"con_fase"};
const NOM_PIEZA={cambio_resistencia:["resistencia","resistencias"],cambio_centrador:["centrador","centradores"],cambio_con_estrella:["conexión estrella","conexiones estrella"],cambio_con_fase:["conexión fase","conexiones fase"]};
const MOT_ELEC=["Rota o quemada","No calienta o da fallo","Cambio preventivo"],MOT_OTRA=["Rota o desgastada","Fuga o pérdida","Cambio preventivo"];
const accsDe=e=>ORDEN_HORNO.filter(k=>k==="cambio_otra"?!!(e&&e.recambios&&(e.recambios.otras||[]).length):!PIEZA_H[k]||(e&&e.recambios&&e.recambios[PIEZA_H[k]]));
const motivosDe=accs=>{const c=accs.filter(a=>a.indexOf("cambio")===0),L=[];
  if(c.some(a=>!PIEZA_H[a]&&a!=="cambio_otra"))L.push(...MOT_TOLVA);if(c.some(a=>PIEZA_H[a]))L.push(...MOT_ELEC);if(c.includes("cambio_otra"))L.push(...MOT_OTRA);return[...new Set(L)];};
/* «Cambio de otras piezas»: se elige cuáles de las piezas de ese horno y cuántas */
function selOtras(e,f){if(!f.accs||!f.accs.includes("cambio_otra"))return null;f.ot=f.ot||{};const box=el("div"),lst=el("div");let N=(e.recambios.otras||[]).map(a=>({art:a,nombre:a}));
  const pl=()=>{lst.textContent="";N.forEach(j=>{const n=f.ot[j.art]||0;
    lst.appendChild(el("div",{class:"linea",style:"display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--line)"+(n?";background:var(--surf2)":"")},[el("span",{style:"flex:1;min-width:0"},[el("b",{text:j.nombre})]),
      el("button",{type:"button",class:"btn sec peq","aria-label":"Una menos de "+j.nombre,text:"−",onclick:()=>{f.ot[j.art]=Math.max(0,n-1);pl();}}),el("b",{style:"min-width:24px;text-align:center",text:String(n)}),
      el("button",{type:"button",class:"btn sec peq","aria-label":"Una más de "+j.nombre,text:"+",onclick:()=>{f.ot[j.art]=Math.min(20,n+1);pl();}})]));});};pl();
  rpc("horno_gasto",{p_tok:S.tok,p_el:e.id,p_desde:null}).then(G=>{if((G.otras||[]).length){N=G.otras.map(x=>({art:x.art,nombre:x.nombre}));pl();}}).catch(()=>{});
  box.appendChild(el("p",{class:"hint",style:"margin:8px 0 0",text:"¿Qué otras piezas se han cambiado? Marca cuántas de cada una."}));box.appendChild(lst);return box;}
const otrasDe=f=>Object.entries(f.ot||{}).filter(([,c])=>c>0).map(([art,cant])=>({art,cant}));
const otrasMal=(accs,f)=>accs.includes("cambio_otra")&&!otrasDe(f).length?"Marca qué otras piezas se han cambiado":null;
function selCantPiezas(e,accs,f){f.cant=f.cant||{};const A=accs.filter(a=>PIEZA_H[a]);if(!A.length)return null;const box=el("div");
  const pl=()=>{box.textContent="";A.forEach(a=>{const n=f.cant[a]||1;const[u,pl_]=NOM_PIEZA[a];
    box.appendChild(el("div",{class:"linea",style:"display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--line)"},[el("span",{style:"flex:1;min-width:0"},[el("b",{text:"¿Cuántas "+pl_+"?"})]),
      el("button",{type:"button",class:"btn sec peq","aria-label":"Una menos",text:"−",onclick:()=>{f.cant[a]=Math.max(1,n-1);pl();}}),el("b",{style:"min-width:24px;text-align:center",text:String(n)}),
      el("button",{type:"button",class:"btn sec peq","aria-label":"Una más",text:"+",onclick:()=>{f.cant[a]=Math.min(20,n+1);pl();}})]));});};pl();
  return box;}
const piezasDe=(e,acc,f)=>PIEZA_H[acc]&&e.recambios&&e.recambios[PIEZA_H[acc]]?[{art:e.recambios[PIEZA_H[acc]],cant:(f.cant&&f.cant[acc])||1}]:null;
const MOT_TOLVA=["Tolva atascada","Desbordamiento de material","Tubo dosificador atascado o desgastado","Cambio preventivo"];
const ORDEN_HORNO=["limpieza","vaciado","cambio_tolva","cambio_cono","cambio_dosificador","cambio_resistencia","cambio_centrador","cambio_con_estrella","cambio_con_fase","cambio_otra"];/* si se cambian tolva y cono, se marcan los dos (cambio_tolva_cono queda solo para registros antiguos) */
const TXT_HORNO={limpieza:"Limpieza de horno",vaciado:"Vaciado de horno",cambio_tolva:"Cambio de tolva",cambio_cono:"Cambio de cono",cambio_dosificador:"Cambio de tubo dosificador",cambio_tolva_cono:"Cambio de tolva y cono",
  cambio_resistencia:"Cambio de resistencia",cambio_centrador:"Cambio de centrador",cambio_con_estrella:"Cambio de conexión estrella",cambio_con_fase:"Cambio de conexión fase",cambio_otra:"Cambio de otras piezas"};
/* hornos cerrados (Krown, Westofen): llevan cono, tolva y dosificador, y cada cambio descuenta sus piezas del Almacén */
const hornoCerrado=e=>!!(e&&e.recambios&&Object.keys(e.recambios).length);
const llevaTolva=(e,accs)=>hornoCerrado(e)&&accs.some(a=>a==="cambio_tolva"||a==="cambio_tolva_cono");
function selTolva(f){const b=el("div",{class:"seg sel"});const p=()=>{b.textContent="";[["hierro","De hierro"],["refractario","Refractaria"]].forEach(([k,t])=>b.appendChild(el("button",{type:"button","aria-pressed":String(f.tolva===k),text:t,onclick:()=>{f.tolva=k;p();}})));};p();
  return fld("¿Qué tolva se pone?",b);}
/* errores que les han salido a los usuarios (registro en app_errores) */
async function verErrores(){let L;try{L=await rpc("errores_listar",{p_tok:S.tok,p_dias:30});}catch(e){toast(e.message);return;}
  const nv=L.filter(e=>!e.visto).length;
  const fila=e=>el("details",{class:"card",style:"padding:8px 12px;margin:0 0 8px"+(e.visto?";opacity:.65":"")},[
    el("summary",{style:"cursor:pointer"},[el("b",{text:e.msg}),el("small",{class:"hint",style:"display:block;margin:2px 0 0",text:[e.app,e.n>1?e.n+" veces":"1 vez",new Date(e.ultimo).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}),e.usuario].filter(Boolean).join(" · ")+(e.visto?"":" · nuevo")})]),
    el("pre",{style:"white-space:pre-wrap;font-size:12px;margin:6px 0 0;max-height:220px;overflow:auto",text:[e.url,e.ua,"versión "+(e.build||"?"),e.stack].filter(Boolean).join("\n")})]);
  dlg("Errores de la app",el("div",null,[el("p",{class:"hint",text:L.length?(nv?nv+" sin revisar. ":"")+"Últimos 30 días. Toca uno para ver el detalle.":"Ningún error en los últimos 30 días."}),...L.map(fila)]),
    [{t:"Cerrar",cls:"sec"}].concat(nv?[{t:"Marcar todo como visto",fn:async()=>{try{await rpc("errores_visto",{p_tok:S.tok,p_firma:"*"});toast("Marcados como vistos");}catch(e){toast(e.message);return false;}}}]:[]));}
/* cambio SOLO de tolva: ¿se cambia también alguna junta? y cuántas */
const soloTolva=(e,accs)=>hornoCerrado(e)&&accs.includes("cambio_tolva")&&!accs.includes("cambio_cono")&&!accs.includes("cambio_tolva_cono");
function selJuntas(e,f){f.jc=f.jc||{};const J=(e.recambios.juntas_cono||[]).map(j=>({art:j.art,cant:+j.cant||1,nombre:j.art}));
  const box=el("div"),lst=el("div");
  const pl=()=>{lst.textContent="";if(f.juntasSi!==true)return;J.forEach(j=>{const n=f.jc[j.art]||0;
    lst.appendChild(el("div",{class:"linea",style:"display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--line)"},[el("span",{style:"flex:1;min-width:0"},[el("b",{text:j.nombre}),el("small",{class:"hint",style:"display:block;margin:0",text:"En un cambio de cono van "+j.cant})]),
      el("button",{type:"button",class:"btn sec peq","aria-label":"Una menos",text:"−",onclick:()=>{f.jc[j.art]=Math.max(0,n-1);pl();}}),el("b",{style:"min-width:24px;text-align:center",text:String(n)}),
      el("button",{type:"button",class:"btn sec peq","aria-label":"Una más",text:"+",onclick:()=>{f.jc[j.art]=Math.min(20,n+1);pl();}})]));});};
  const sb=el("div",{class:"seg sel"});const ps=()=>{sb.textContent="";[[false,"No"],[true,"Sí"]].forEach(([k,t])=>sb.appendChild(el("button",{type:"button","aria-pressed":String(f.juntasSi===k),text:t,onclick:()=>{f.juntasSi=k;if(k&&!Object.values(f.jc).some(x=>x>0))J.forEach(j=>f.jc[j.art]=j.cant);ps();pl();}})));};ps();
  box.appendChild(fld("¿Se cambia también alguna junta?",sb));box.appendChild(lst);
  /* nombres de las juntas */
  rpc("horno_gasto",{p_tok:S.tok,p_el:e.id,p_desde:null}).then(G=>{const N={};((G.recambios||{}).cambio_cono||[]).forEach(x=>N[x.art]=x.nombre);J.forEach(j=>{if(N[j.art])j.nombre=N[j.art];});pl();}).catch(()=>{});
  return box;}
function juntasDe(f){return f.juntasSi===true?Object.entries(f.jc||{}).filter(([a,c])=>c>0).map(([art,cant])=>({art,cant})):null;}
function juntasMal(e,accs,f){if(!soloTolva(e,accs))return null;if(f.juntasSi==null)return"Dime si se cambia también alguna junta";if(f.juntasSi&&!juntasDe(f).length)return"Pon cuántas juntas se han gastado (o marca «No»)";return null;}
function elegirTipoOT(e,re){const sel=new Set();const box=el("div",null);
  const pb=()=>{box.textContent="";accsDe(e).forEach(k=>box.appendChild(el("button",{type:"button",class:"btn grande sec",style:"width:100%;margin:6px 0"+(sel.has(k)?";background:var(--acc);color:#fff":""),"aria-pressed":String(sel.has(k)),text:(sel.has(k)?"":"")+TXT_HORNO[k],onclick:()=>{sel.has(k)?sel.delete(k):sel.add(k);pb();}})));};
  pb();
  dlg("Abrir trabajo en "+e.nombre,el("div",null,[el("p",{class:"hint",text:"Marca todo lo que se va a hacer en este horno."}),box]),
    [{t:"Cancelar",cls:"sec"},{t:"Siguiente",cls:"ok",fn:()=>{if(!sel.size){toast("Marca al menos una acción");return false;}const accs=accsDe(e).filter(k=>sel.has(k));cerrarTodo();setTimeout(()=>formAbrirOTsHorno(e,accs,re),0);}}]);}
function formAbrirOTsHorno(e,accs,re){const f={motivo:"",nota:"",accs};let asg=(S.resp&&S.resp.operarios[0])?S.resp.operarios[0].id:null;
  /* el responsable de hornos elige a qué operario de hornos se asigna */
  const opsR=S.resp?el("div",null,[el("p",{class:"hint",text:"¿Quién lo hace?"}),(()=>{const c=el("div",{class:"chips"});const pc=()=>{c.textContent="";S.resp.operarios.forEach(o=>c.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(asg===o.id),text:o.nombre,onclick:()=>{asg=o.id;pc();}})));};pc();return c;})()]):null;const tols=accs.some(a=>a.indexOf("cambio")===0);const mots=el("div",{class:"seg sel"});
  const pm=()=>{mots.textContent="";motivosDe(accs).forEach(m=>mots.appendChild(el("button",{type:"button","aria-pressed":String(f.motivo===m),text:m,onclick:()=>{f.motivo=m;pm();}})));};if(tols)pm();
  const tv=llevaTolva(e,accs);
  dlg("Abrir "+accs.length+" trabajos en "+e.nombre,el("div",null,[el("p",{class:"hint",text:accs.map(a=>ACC_HORNO[a]).join(" + ")}),opsR,tols?fld("¿Por qué se cambia?",mots):null,tv?selTolva(f):null,soloTolva(e,accs)?selJuntas(e,f):null,selCantPiezas(e,accs,f),selOtras(e,f),fld("Nota (opcional)",area("",x=>f.nota=x))]),
    [{t:"Cancelar",cls:"sec"},{t:"Abrir",cls:"ok",fn:async()=>{if(tols&&!f.motivo){toast("Elige el motivo");return false;}if(tv&&!f.tolva){toast("Elige si la tolva es de hierro o refractaria");return false;}{const m=juntasMal(e,accs,f)||otrasMal(accs,f);if(m){toast(m);return false;}}
      try{for(const acc of accs){const tol=acc.indexOf("cambio")===0;await rpc("ot_abrir",{p_tok:S.tok,p:{titulo:ACC_HORNO[acc]+" · "+e.nombre,lugar:e.lugar||null,descripcion:f.nota.trim()||null,urgente:false,yo:true,habitual_id:null,elemento_id:e.id,accion_horno:acc,motivo:tol?f.motivo:null,tolva:(acc==="cambio_tolva"||acc==="cambio_tolva_cono")?(f.tolva||null):null,juntas:acc==="cambio_tolva"?juntasDe(f):acc==="cambio_otra"?otrasDe(f):piezasDe(e,acc,f),hecha:false,auto:false,asignados:asg?[asg]:null}});}
        toast(accs.length===1?"Trabajo abierto: dale a Empezar cuando empieces":accs.length+" trabajos abiertos: dale a Empezar en cada uno cuando empieces");re();}catch(er){toast(er.message);return false;}}}]);}
function linUltHorno(e,re,k,t){const U=(e&&e.ult)||{};let u=U[k];const j=U.cambio_tolva_cono;/* los registros antiguos de «tolva y cono» cuentan para los dos */
  let esJ=false;if((k==="cambio_tolva"||k==="cambio_cono")&&j&&(!u||String(j.fin||"")>String(u.fin||""))){u=j;esJ=true;}
  const fila=el("div",{class:"it"},[el("b",{text:t}),el("span",{text:u?fCorta(diaDe(u.fin))+" · "+u.quien+(u.motivo?" · motivo: "+u.motivo:"")+(u.nota?" · "+u.nota:""):"Nunca"})]);
  /* tocar el último registro abre su detalle (y, si es admin, «Editar registro») */
  const hh=u?(e.historial||[]).find(h=>h.accion===(esJ?"cambio_tolva_cono":k)||(esJ&&(h.accion==="cambio_tolva"||h.accion==="cambio_cono"))):null;
  if(hh){fila.style.cursor="pointer";fila.setAttribute("role","button");fila.onclick=()=>detalleLimpieza(hh,e,re);}
  return fila;}
function elegirAccionHorno(e,re){const sel=new Set();const box=el("div",null);
  const pb=()=>{box.textContent="";accsDe(e).filter(k=>k!=="limpieza").forEach(k=>box.appendChild(el("button",{type:"button",class:"btn grande sec",style:"width:100%;margin:6px 0"+(sel.has(k)?";background:var(--acc);color:#fff":""),"aria-pressed":String(sel.has(k)),text:(sel.has(k)?"":"")+TXT_HORNO[k],onclick:()=>{sel.has(k)?sel.delete(k):sel.add(k);pb();}})));};
  pb();
  dlg("¿Qué se ha hecho en "+e.nombre+"?",el("div",null,[
    el("button",{type:"button",class:"btn grande sec",style:"width:100%;margin:6px 0",text:"Limpieza ya hecha",onclick:()=>{cerrarTodo();setTimeout(()=>yaLimpio(e,re),0);}}),
    el("p",{class:"hint",text:"Marca todo lo que se ha hecho en este horno (es un único trabajo y un único tiempo)."}),box]),
    [{t:"Cancelar",cls:"sec"},{t:"Siguiente",cls:"ok",fn:()=>{if(!sel.size){toast("Marca al menos una acción");return false;}const accs=accsDe(e).filter(k=>sel.has(k));cerrarTodo();setTimeout(()=>formHornoAcciones(e,accs,re),0);}}]);}
function formHornoAcciones(e,accs,re){const f={fecha:hoyISO(),motivo:"",nota:"",accs};const tols=accs.some(a=>a!=="vaciado");const mots=el("div",{class:"seg sel"});const w=preguntaTiempo({minutos_est:null,inicio:null});
  const pm=()=>{mots.textContent="";motivosDe(accs).forEach(m=>mots.appendChild(el("button",{type:"button","aria-pressed":String(f.motivo===m),text:m,onclick:()=>{f.motivo=m;pm();}})));};if(tols)pm();
  dlg(accs.map(a=>ACC_HORNO[a]).join(" + ")+" · "+e.nombre,el("div",null,[
    fld("¿Qué día se hizo?",inp(f.fecha,v=>f.fecha=v,{type:"date",max:hoyISO()})),
    tols?fld("¿Por qué se cambió?",mots):null,
    llevaTolva(e,accs)?selTolva(f):null,
    soloTolva(e,accs)?selJuntas(e,f):null,
    selCantPiezas(e,accs,f),
    selOtras(e,f),
    w,
    fld("Nota (opcional)",area("",x=>f.nota=x))]),
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",cls:"ok",fn:async()=>{if(!w.val()){toast("Marca cuánto has tardado");return false;}if(tols&&!f.motivo){toast("Elige el motivo");return false;}if(llevaTolva(e,accs)&&!f.tolva){toast("Elige si la tolva es de hierro o refractaria");return false;}{const m=juntasMal(e,accs,f)||otrasMal(accs,f);if(m){toast(m);return false;}}
      try{for(let i=0;i<accs.length;i++){const acc=accs[i];await rpc("horno_registrar",{p_tok:S.tok,p_el:e.id,p_accion:acc,p_fecha:f.fecha||null,p_motivo:acc!=="vaciado"?f.motivo:null,p_nota:f.nota.trim()||null,p_minutos:i===0?w.val():null,p_tolva:(acc==="cambio_tolva"||acc==="cambio_tolva_cono")?(f.tolva||null):null,p_juntas:acc==="cambio_tolva"?juntasDe(f):acc==="cambio_otra"?otrasDe(f):piezasDe(e,acc,f)});}
        toast(accs.map(a=>ACC_HORNO[a]).join(" + ")+" apuntado en "+e.nombre);re();}catch(er){toast(er.message);return false;}}}]);}

/* administración */
function sigCodigo(tipo,L){const pre={inyectora:"F",molde:"M",horno:"H",contenedor:"C",otro:"X"}[tipo]+"-";let n=1;const usados=new Set((L||[]).map(e=>e.codigo));while(usados.has(pre+n))n++;return pre+n;}
function formElemento(e0,re){const e=Object.assign({tipo:"horno",activo:true},JSON.parse(JSON.stringify(e0||{})));if(!e.codigo)e.codigo=sigCodigo(e.tipo,ELS);
  const cod=inp(e.codigo,v=>e.codigo=v.toUpperCase(),{autocapitalize:"characters"});
  const tb=el("div",{class:"seg sel"});const pt=()=>{tb.textContent="";TIPOS_EL.forEach(([k,t,i])=>tb.appendChild(el("button",{type:"button","aria-pressed":String(e.tipo===k),text:i+" "+t,onclick:()=>{e.tipo=k;if(!e.id){e.codigo=sigCodigo(k,ELS);cod.value=e.codigo;}pt();if(typeof vacBox!=="undefined")vacBox.hidden=k!=="horno";}})));};pt();
  const fb=el("div",{class:"chips"});const pf=()=>{fb.textContent="";[[null,"Sin fijar"],[1,"Cada día"],[7,"Semanal"],[14,"Cada 2 semanas"],[30,"Mensual"]].forEach(([k,t])=>fb.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String((e.frecuencia_dias||null)===k),text:t,onclick:()=>{e.frecuencia_dias=k;pf();}})));};pf();
  if(e.tipo==="horno"&&e.vaciado_dias==null)e.vaciado_dias=180;
  const vd=el("div",{class:"chips"});const pvd=()=>{vd.textContent="";[[180,"Cada 6 meses"],[270,"Cada 9 meses"],[365,"Cada año"]].forEach(([k,t])=>vd.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(e.vaciado_dias===k),text:t,onclick:()=>{e.vaciado_dias=k;pvd();}})));};pvd();
  const notaV=fld("¿Por qué? (sale en la lista)",inp(e.vaciado_nota,v=>e.vaciado_nota=v,{placeholder:"p. ej. Fuera de servicio"}));notaV.hidden=!e.vaciado_excepcion;
  const vacBox=el("div",{style:"border:1px solid var(--line);border-radius:12px;padding:10px 12px 2px;margin:0 0 10px"},[el("b",{text:"Vaciado preventivo"}),
    el("p",{class:"hint",style:"margin:2px 0 8px",text:"Vaciarlo a tiempo evita residuos que tapan el cono y la tolva. Un cambio de tolva o cono también cuenta como vaciado. Solo para hornos."}),
    fld("Vaciarlo como mínimo",vd),fld("Último vaciado conocido (si se hizo antes de usar la app)",inp(e.vaciado_ref,v=>e.vaciado_ref=v,{type:"date"})),
    el("label",{style:"display:flex;gap:8px;align-items:center;margin:0 0 8px"},[el("input",{type:"checkbox",checked:!!e.vaciado_excepcion,onchange:ev=>{e.vaciado_excepcion=ev.target.checked;notaV.hidden=!e.vaciado_excepcion;}}),"Excepción: no avisar de este horno"]),notaV]);
  vacBox.hidden=e.tipo!=="horno";
  /* datos del horno: modelo, capacidad y consumibles con su ubicación */
  const consL=el("div",null);
  const pcons=()=>{consL.textContent="";(e.consumibles||[]).forEach((c,i)=>consL.appendChild(el("div",{class:"ot",style:"cursor:default"},[el("div",{class:"row"},[fld("Qué es",inp(c.nombre,v=>c.nombre=v,{placeholder:"p. ej. Cono"})),fld("Cuántos por cambio",inp(c.cant,v=>c.cant=v,{inputmode:"decimal"}))]),fld("Dónde están",inp(c.donde,v=>c.donde=v,{placeholder:"p. ej. Estantería 3, Nave 1"})),el("button",{type:"button",class:"btn sec peq",text:"Quitar",onclick:()=>{e.consumibles.splice(i,1);pcons();}})])));};
  pcons();
  const hornoBox=el("div",{style:"border:1px solid var(--line);border-radius:12px;padding:10px 12px 2px;margin:0 0 10px"},[el("b",{text:"Datos del horno"}),
    el("div",{class:"row"},[fld("Modelo",inp(e.modelo,v=>e.modelo=v,{placeholder:"p. ej. Krown"})),fld("Capacidad (kg)",inp(e.capacidad_kg,v=>e.capacidad_kg=v,{inputmode:"decimal"}))]),
    el("p",{class:"hint",style:"margin:2px 0 8px",text:"Consumibles que lleva el horno (conos, juntas…) y dónde están guardados."}),consL,
    el("button",{type:"button",class:"btn sec peq",style:"margin:0 0 10px",text:"＋ Añadir consumible",onclick:()=>{e.consumibles=(e.consumibles||[]).concat([{nombre:"",cant:"",donde:""}]);pcons();}})]);
  hornoBox.hidden=e.tipo!=="horno";
  const bot=[{t:"Cancelar",cls:"sec"}];
  if(e.id)bot.unshift({t:"Borrar",cls:"bad",fn:async()=>{if(!confirm("¿Borrar "+e.nombre+"? Su historial de limpiezas se conserva."))return false;await rpc("elemento_borrar",{p_tok:S.tok,p_id:e.id});ELS=null;toast("Borrado");re();}});
  bot.push({t:"Guardar",fn:async()=>{if(!(e.nombre||"").trim()){toast("Pon el nombre");return false;}const r=await rpc("elemento_guardar",{p_tok:S.tok,p:{id:e.id||null,tipo:e.tipo,modelo:e.modelo||null,capacidad_kg:e.capacidad_kg||null,consumibles:(e.consumibles||[]).filter(c=>(c.nombre||"").trim()),codigo:e.codigo,nombre:e.nombre,lugar:e.lugar,frecuencia_dias:e.frecuencia_dias||null,minutos_est:e.minutos_est||null,activo:e.activo,puntos:e.puntos||[],vaciado_dias:e.tipo==="horno"?(e.vaciado_dias||180):null,vaciado_ref:e.vaciado_ref||null,vaciado_excepcion:!!e.vaciado_excepcion,vaciado_nota:e.vaciado_nota||null}});ELS=null;toast("Guardado · código "+r.codigo);re();}});
  dlg(e.id?"Editar "+e.nombre:"Nuevo molde u horno mantenedor",el("div",null,[fld("Tipo",tb),el("div",{class:"row"},[fld("Código (va en el QR)",cod),fld("Nombre",inp(e.nombre,v=>e.nombre=v,{placeholder:"p. ej. Horno mantenedor F28"}))]),
    fld("Dónde está (opcional)",inp(e.lugar,v=>e.lugar=v,{placeholder:"p. ej. Nave 2"})),fld("Cada cuánto hay que limpiarlo",fb),vacBox,hornoBox,fld("Tiempo que lleva limpiarlo",campoTiempo(e.minutos_est,v=>e.minutos_est=v)),fld("Puntos de la checklist (uno por línea; los puedes cambiar al limpiar)",area((e.puntos||[]).join("\n"),v=>e.puntos=v.split("\n").map(x=>x.trim()).filter(Boolean))),
    el("label",{style:"display:flex;gap:8px;align-items:center"},[el("input",{type:"checkbox",checked:e.activo,onchange:ev=>e.activo=ev.target.checked}),"Activo"])]),bot);}
function variosElementos(re){let tipo="horno",txt="";const tb=el("div",{class:"seg sel"});const pt=()=>{tb.textContent="";TIPOS_EL.forEach(([k,t,i])=>tb.appendChild(el("button",{type:"button","aria-pressed":String(tipo===k),text:i+" "+t,onclick:()=>{tipo=k;pt();}})));};pt();
  dlg("Añadir varios de golpe",el("div",null,[fld("Tipo",tb),fld("Uno por línea",area("",v=>txt=v)),el("p",{class:"hint",text:"Escribe solo el nombre (p. ej. «Horno mantenedor F28») y el código se pone solo. Si quieres un código concreto, ponlo delante con punto y coma: «M-120; Molde tapa 120»."})]),
    [{t:"Cancelar",cls:"sec"},{t:"Añadir",fn:async()=>{const ls=txt.split("\n").map(x=>x.trim()).filter(Boolean);if(!ls.length){toast("Escribe al menos uno");return false;}let n=0;const L=await elementosL(true);
      for(const l of ls){const [a,b]=l.includes(";")?l.split(";").map(x=>x.trim()):[null,l];const c=a||sigCodigo(tipo,L);try{const r=await rpc("elemento_guardar",{p_tok:S.tok,p:{tipo,codigo:c,nombre:b}});L.push(r);n++;}catch(e){toast(l+": "+e.message);}}
      ELS=null;toast(n+" añadidos");re();}}]);}
async function imprimirQR(lista){try{await cargaLib(["https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js","https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"],()=>!!window.qrcode,"los códigos QR");}catch(e){toast(e.message);return;}
  const area=el("div",{id:"printArea"});lista.forEach(e=>{const q=qrcode(0,"M");q.addData(urlEl(e.codigo));q.make();const T=tipoEl(e.tipo);
    area.appendChild(el("div",{class:"etq"},[el("div",{class:"qr",html:q.createSvgTag({cellSize:4,margin:0,scalable:true})}),el("b",{text:e.nombre}),el("span",{text:T[1]+" · "+e.codigo}),el("small",{text:"Escanéame cuando lo limpies"})]));});
  const ov=el("div",{class:"ov printov"},el("div",{class:"dlg",style:"max-width:900px"},[el("div",{class:"row noprint",style:"margin:0 0 10px"},[el("button",{class:"btn",text:"Imprimir",onclick:()=>window.print()}),el("button",{class:"btn sec",text:"Cerrar",onclick:()=>ov.remove()})]),
    el("p",{class:"hint noprint",text:"Imprime en papel adhesivo o plastifica la hoja. Cada etiqueta lleva su código QR: al escanearlo con el móvil se abre la ficha para apuntar la limpieza."}),area]));document.body.appendChild(ov);}
async function bloqueElementos(re){const box=el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Inyectoras y hornos mantenedores"})),el("div",{class:"empty",text:"Cargando…"})]);
  elementosL(true).then(L=>{box.lastChild.remove();box.appendChild(el("div",{class:"bd"},[el("div",{class:"row",style:"margin:0 0 10px"},[el("button",{class:"btn peq",text:"＋ Nuevo",onclick:()=>formElemento({},re)}),el("button",{class:"btn sec peq",text:"＋ Varios",onclick:()=>variosElementos(re)}),
      L.length?el("button",{class:"btn sec peq",text:"Imprimir QR",onclick:()=>imprimirQR(L.filter(e=>e.activo))}):null]),
    L.length?el("div",null,L.map(e=>{const s=estadoEl(e);return el("button",{class:"linea elx",onclick:()=>formElemento(e,re)},[el("span",{class:"ico",text:tipoEl(e.tipo)[2]}),el("span",{style:"flex:1;min-width:0"},[el("b",{text:e.nombre+(e.activo?"":" (no activo)")}),el("small",{class:"hint",style:"display:block;margin:0",text:e.codigo+(e.lugar?" · "+e.lugar:"")+(e.frecuencia_dias?" · cada "+e.frecuencia_dias+" d":"")+(e.n90?" · "+e.n90+" limpiezas en 3 meses":"")})]),el("span",{class:"pill "+(s.k==="sin"?"":s.k),text:s.t})]);}))
      :el("details",{class:"ayuda"},[el("summary",{text:"¿Para qué sirve esto?"}),el("p",{class:"hint",text:"Da de alta cada molde u horno mantenedor que se limpia. Luego imprime los códigos QR y pégalos en cada uno: el trabajador lo escanea al limpiarlo y queda apuntado quién, cuándo y cuánto tardó."})])]));}).catch(e=>{box.lastChild.textContent=e.message;});
  return box;}

/* ---------- avisos en el móvil (Web Push) ---------- */
const esIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const instalada=()=>window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const pushPosible=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
let REG=null;
async function regSW(){if(!("serviceWorker" in navigator))return null;if(REG)return REG;try{REG=await navigator.serviceWorker.register("sw-limpieza.js",{scope:"./limpieza.html"});await navigator.serviceWorker.ready;}catch(e){REG=null;}return REG;}
if("serviceWorker" in navigator)navigator.serviceWorker.addEventListener("message",e=>{if(e.data&&e.data.tipo==="recargar"&&S.tok&&!document.querySelector(".ov"))pinta();});
const b64u=s=>{const p="=".repeat((4-s.length%4)%4),b=atob((s+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(b,c=>c.charCodeAt(0));};
async function subActual(){const r=await regSW();return r&&r.pushManager?r.pushManager.getSubscription():null;}
/* al entrar: si ya tiene avisos en este móvil, se apuntan a quien ha entrado */
async function pushSync(){try{if(!pushPosible()||Notification.permission!=="granted")return;const s=await subActual();if(s)await rpc("push_alta",{p_tok:S.tok,p:s.toJSON()});}catch(e){}}
async function activarAvisos(){
  if(esIOS&&!instalada()){dlg("Avisos en iPhone",el("div",null,[el("p",{text:"En iPhone los avisos solo funcionan con la app en la pantalla de inicio:"}),
    el("ol",{class:"pasos"},[el("li",{text:"Abre esta página en Safari."}),el("li",{text:"Toca el botón Compartir (el cuadrado con la flecha hacia arriba)."}),el("li",{text:"Elige «Añadir a pantalla de inicio»."}),el("li",{text:"Abre la app desde el icono nuevo y pulsa otra vez «Activar avisos»."})])]));return;}
  if(!pushPosible()){toast("Este móvil o navegador no admite avisos. Prueba con Chrome.");return;}
  try{const per=await Notification.requestPermission();if(per!=="granted"){toast(per==="denied"?"Los avisos están bloqueados. Actívalos en los ajustes del navegador para esta web.":"No has dado permiso");pinta();return;}
    const r=await regSW();if(!r)throw new Error("No se pudo preparar el móvil");
    const clave=await rpc("push_clave");if(!clave)throw new Error("Los avisos aún no están listos");
    let s=await r.pushManager.getSubscription();if(!s)s=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(clave)});
    await rpc("push_alta",{p_tok:S.tok,p:s.toJSON()});ls.set("limp.avisos","1");toast("Avisos activados ");pinta();}
  catch(e){toast(e.message||"No se pudieron activar los avisos");}}
async function bloqueAvisos(v){if(ls.get("limp.avisos.no")===hoyISO())return;
  let falta=false;try{falta=!pushPosible()?esIOS&&!instalada():(Notification.permission!=="granted"||!(await subActual()));}catch(e){}
  if(!falta)return;
  v.appendChild(el("div",{class:"avisos-on"},[el("span",{class:"ic",text:""}),el("div",{style:"flex:1"},[el("b",{text:"Activa los avisos"}),el("small",{text:"Te llegará un aviso al móvil cuando te pongan un trabajo nuevo o te quede algo por hacer."})]),
    el("div",{class:"col"},[el("button",{class:"btn peq",text:"Activar",onclick:activarAvisos}),el("button",{class:"btn sec peq",text:"Ahora no",onclick:()=>{ls.set("limp.avisos.no",hoyISO());pinta();}})])]));}
/* ---------- WhatsApp: el mensaje sale escrito, tú solo pulsas enviar ---------- */
const APP_URL="https://portela90.github.io/COLADA/limpieza.html";
function telWA(t){let d=String(t||"").replace(/[^0-9+]/g,"");if(!d)return"";if(d.startsWith("+"))d=d.slice(1);else if(d.startsWith("00"))d=d.slice(2);else if(d.length===9)d="34"+d;return d;}
const waLink=(tel,txt)=>"https://wa.me/"+(tel?telWA(tel):"")+"?text="+encodeURIComponent(txt);
const abrirWA=(tel,txt)=>window.open(waLink(tel,txt),"_blank");
const lineaOT=o=>"• "+o.titulo+(o.lugar?" ("+o.lugar+")":"")+(o.turno?" · "+o.turno:"")+(o.prioridad==="alta"?" URGENTE":"");
/* quién tiene que hacer cada trabajo ese día (contando sustituciones y «todo el equipo») */
function repartoDia(D,L){const P={};const add=(id,o)=>{(P[id]=P[id]||[]).push(o);};
  D.filter(o=>o.estado==="pendiente"||o.estado==="en_curso").forEach(o=>{
    if(o.todo_equipo){L.filter(w=>w.activo&&w.rol!=="admin"&&(w.equipos||[]).includes(o.equipo)).forEach(w=>add(w.id,o));return;}
    (o.nombres||[]).forEach(n=>{const w=L.find(x=>x.nombre===n);const c=(o.cubre||[]).find(x=>x.ausente===n&&x.sustituto);const s=c&&L.find(x=>x.nombre===c.sustituto);const t=s||w;if(t)add(t.id,o);});});
  return P;}
async function enviarDiaWA(D,f){const L=await trabajadores();const P=repartoDia(D,L);const dia=(f===hoyISO()?"de hoy ":"del ")+fLarga(f);
  const txtDe=w=>"Hola "+w.nombre.split(" ")[0]+", tus trabajos "+dia+":\n"+P[w.id].map(lineaOT).join("\n")+"\n\nMárcalos en la app: "+APP_URL;
  const gente=L.filter(w=>P[w.id]);
  const grupo="Trabajos "+dia+":\n\n"+gente.map(w=>"*"+w.nombre+"*\n"+P[w.id].map(lineaOT).join("\n")).join("\n\n")+"\n\nApp: "+APP_URL;
  dlg("Enviar por WhatsApp",el("div",null,[el("p",{class:"hint",text:"Se abre WhatsApp con el mensaje ya escrito. Solo tienes que pulsar enviar."}),
    gente.length?el("div",{class:"lst-wa"},gente.map(w=>el("div",{class:"linea"},[el("span",{style:"flex:1"},[el("b",{text:w.nombre}),el("small",{class:"hint",style:"display:block;margin:0",text:P[w.id].length+" trabajo"+(P[w.id].length>1?"s":"")+(w.telefono?"":" · sin teléfono: elegirás el chat")})]),
      el("button",{class:"btn wa peq",text:"WhatsApp",onclick:()=>abrirWA(w.telefono,txtDe(w))})]))):el("p",{class:"empty",text:"No hay trabajos pendientes este día."}),
    gente.length?el("button",{class:"btn sec",style:"width:100%;margin-top:10px",text:"Enviar la lista entera a un grupo",onclick:()=>abrirWA("",grupo)}):null,
    L.some(w=>w.activo&&!w.telefono)?el("p",{class:"hint",text:"Pon los teléfonos en Equipo para que se abra directo el chat de cada uno."}):null]));}
async function enviarOTWA(o){const L=await trabajadores();const P=repartoDia([o],L);const ids=Object.keys(P);
  const txt=w=>"Hola "+w.nombre.split(" ")[0]+", tienes este trabajo"+(o.fecha===hoyISO()?" hoy":" el "+fLarga(o.fecha))+":\n"+lineaOT(Object.assign({},o,{estado:"pendiente"}))+(o.descripcion?"\n"+o.descripcion:"")+"\n\nMárcalo en la app: "+APP_URL;
  if(!ids.length){abrirWA("",txt({nombre:""}).replace("Hola , t","T"));return;}
  if(ids.length===1){const w=L.find(x=>x.id===ids[0]);abrirWA(w.telefono,txt(w));return;}
  dlg("¿A quién?",el("div",null,ids.map(id=>{const w=L.find(x=>x.id===id);return el("div",{class:"linea"},[el("b",{style:"flex:1",text:w.nombre}),el("button",{class:"btn wa peq",text:"WhatsApp",onclick:()=>abrirWA(w.telefono,txt(w))})]);})));}
/* ---------- horarios ---------- */
const DIAS_C={lunes:"L",martes:"M",miercoles:"X",jueves:"J",viernes:"V",sabado:"S",domingo:"D"};
const DIAS_N={lunes:"Lunes",martes:"Martes",miercoles:"Miércoles",jueves:"Jueves",viernes:"Viernes",sabado:"Sábado",domingo:"Domingo"};
const diaClave=f=>["domingo","lunes","martes","miercoles","jueves","viernes","sabado"][new Date(f+"T12:00:00").getDay()];
const hh=t=>String(t||"").replace(/^0(\d)/,"$1");
const tramoTxt=r=>hh(r[0])+"–"+hh(r[1]);
function horTxt(tr){if(tr==null)return"";if(!tr.length)return"Libra";return tr.map(tramoTxt).join(" y ");}
/* resumen semanal: «L, X, V 8:00–14:00 · S, D libra» */
function horSemana(h){h=h||{};const g=[];Object.keys(DIAS_C).forEach(d=>{if(!(d in h))return;const t=horTxt(h[d]);const x=g.find(y=>y.t===t);if(x)x.d.push(DIAS_C[d]);else g.push({t,d:[DIAS_C[d]]});});
  return g.map(x=>x.d.join(", ")+" "+(x.t==="Libra"?"libra":x.t)).join(" · ");}
function editorHorario(h0){const h=JSON.parse(JSON.stringify(h0||{}));const box=el("div",{class:"hor"});
  const fila=d=>{const tr=h[d];const modo=tr==null?"":!tr.length?"libre":tr.length>1?"partido":"uno";
    const set=m=>{if(m==="")delete h[d];else if(m==="libre")h[d]=[];else if(m==="uno")h[d]=[(h[d]&&h[d][0])||["08:00","14:00"]];else h[d]=[(h[d]&&h[d][0])||["08:00","13:00"],(h[d]&&h[d][1])||["15:00","18:00"]];pin();};
    const t=(i,j)=>{const x=el("input",{type:"time",value:h[d][i][j],"aria-label":DIAS_N[d]+(j?" hasta":" desde")});x.onchange=()=>{h[d][i][j]=x.value;};return x;};
    return el("div",{class:"hrow"},[el("b",{text:DIAS_N[d]}),el("div",{class:"chips"},[["","Sin poner"],["libre","Libra"],["uno","Trabaja"],["partido","Partido"]].map(([k,txt])=>el("button",{type:"button",class:"chip","aria-pressed":String(modo===k),text:txt,onclick:()=>set(k)}))),
      modo==="uno"||modo==="partido"?el("div",{class:"tramos"},h[d].map((r,i)=>el("span",{class:"tramo"},[t(i,0),"–",t(i,1)]))):null]);};
  const pin=()=>{box.textContent="";Object.keys(DIAS_C).forEach(d=>box.appendChild(fila(d)));
    box.appendChild(el("div",{class:"row",style:"margin-top:6px"},[el("button",{type:"button",class:"btn sec peq",text:"Copiar el lunes de martes a viernes",onclick:()=>{if(!("lunes" in h)){toast("Pon primero el lunes");return;}["martes","miercoles","jueves","viernes"].forEach(d=>h[d]=JSON.parse(JSON.stringify(h.lunes)));pin();}})]));};
  pin();box.val=()=>{for(const d in h)for(const r of h[d]){if(!r[0]||!r[1]||r[0]>=r[1])throw new Error(DIAS_N[d]+": la hora de salida tiene que ser después de la de entrada");}return h;};return box;}
/* ---------- problemas que se repiten (OT que abren los trabajadores) ---------- */
/* solo cuentan los problemas (cosas que no deberían pasar); el trabajo normal (basuras, fregar, viruta…) no sale aunque lo abran como OT */
const TEMAS=[["Aceite",/(aceite|hidraulic|taladrin)/],["Derrames",/derram/],["Fugas",/(fuga|pierde|perdida|gotea|goteo)/],
  ["Agua / filtraciones",/(filtrac|lluvia|gotera|charco|inund|humedad)/],["Roturas / averías",/(roto|rota|rotura|averia|averiad|estropead|no funciona)/]];
const sinAcento=t=>String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const VACIAS=new Set("de la el los las del en por con para y o a al un una se que hay muy mas zona nave".split(" "));
function temasDe(o){const t=sinAcento(o.titulo+" "+(o.descripcion||""));const r=TEMAS.filter(([,re])=>re.test(t)).map(([n])=>n);
  return r;}
function problemasRepetidos(O,min){const G={};
  O.filter(o=>o.origen==="rapida"&&!o.habitual_id&&!o.elemento_id).forEach(o=>temasDe(o).forEach(t=>{const g=G[t]=G[t]||{tema:t,n:0,lug:{},ult:"",ots:[],quien:{}};g.n++;g.ots.push(o);
    const l=(o.lugar||"").trim();if(l)g.lug[l]=(g.lug[l]||0)+1;if(o.fecha>g.ult)g.ult=o.fecha;if(o.creado_por_n)g.quien[o.creado_por_n]=1;}));
  return Object.values(G).filter(g=>g.n>=(min||2)).map(g=>Object.assign(g,{zmax:Math.max(0,...Object.values(g.lug))})).sort((a,b)=>b.zmax-a.zmax||b.n-a.n||b.ult.localeCompare(a.ult));}
const esProblema=(t,d)=>temasDe({titulo:t||"",descripcion:d||""}).length>0;
const MSG_LUG="Es un problema (aceite, derrame, fuga, agua o rotura): pon dónde es, por ejemplo F30 o Nave 1.";
const lugTxt=g=>Object.entries(g.lug).sort((a,b)=>b[1]-a[1]).map(([l,n])=>l+(n>1?" ×"+n:"")).join(", ");
const zonaRep=g=>{const z=Object.entries(g.lug).sort((a,b)=>b[1]-a[1])[0];return z&&z[1]>=2?z:null;};
function bloqueRepetidos(O,dias){const L=problemasRepetidos(O);
  return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Problemas que se repiten ("+L.length+")"}),el("span",{class:"der sub",text:"OT abiertas por los trabajadores"})]),
    L.length?el("div",null,L.map(g=>el("button",{class:"ot",style:"cursor:pointer;text-align:left;width:100%;border:0;border-bottom:1px solid var(--line);background:none",onclick:()=>listaOTs(g.tema+" · "+g.n+" veces",g.ots,()=>pinta())},[
      el("div",{style:"display:flex;gap:8px;align-items:center"},[el("span",{class:"t",style:"flex:1",text:g.tema}),el("span",{class:"pill "+(g.n>=4?"bad":"warn"),text:g.n+" veces"})]),
      zonaRep(g)?el("div",{class:"aviso-t",style:"margin:0",text:"Se repite en el mismo sitio: "+zonaRep(g)[0]+" ("+zonaRep(g)[1]+" veces)"}):null,
      el("div",{class:"meta"},[lugTxt(g)?el("span",{text:lugTxt(g)}):el("span",{text:"Sin sitio apuntado"}),el("span",{text:"Última: "+fCorta(g.ult)}),el("span",{text:"Avisado por "+Object.keys(g.quien).map(n=>n.split(" ")[0]).join(", ")})])]))):
      el("div",{class:"empty",text:"Ningún problema repetido en estos "+dias+" días."}),
    L.length?el("p",{class:"hint",style:"padding:6px 14px 10px",text:"Solo salen los problemas que avisan los trabajadores (aceite, derrames, fugas, agua, roturas), no el trabajo normal como las basuras. Lo más importante: lo que se repite en el mismo sitio. Toca uno para ver cada aviso."}):null]);}
/* ---------- informe semanal para el jefe: PDF + Excel ---------- */
async function cargaLib(urls,listo,nom){if(listo())return;for(const u of urls){try{await new Promise((ok,ko)=>{const s=document.createElement("script");s.src=u;s.onload=ok;s.onerror=ko;document.head.appendChild(s);});if(listo())return;}catch(e){}}throw new Error("No se pudo cargar "+nom+". Revisa internet.");}
const libPDF=async()=>{await cargaLib(["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js","https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"],()=>!!window.jspdf,"el PDF");
  await cargaLib(["https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js","https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js"],()=>!!window.jspdf.jsPDF.API.autoTable,"las tablas del PDF");};
const libXLSX=()=>cargaLib(["https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js","https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"],()=>!!window.XLSX,"el Excel");
const lunesDe=f=>{const d=new Date(f+"T12:00:00");return sumaD(f,-((d.getDay()+6)%7));};
const fDM=f=>f.slice(8,10)+"/"+f.slice(5,7);const fDMA=f=>fDM(f)+"/"+f.slice(0,4);
const numSemana=f=>{const d=new Date(f+"T12:00:00");d.setDate(d.getDate()+3-((d.getDay()+6)%7));const y=new Date(d.getFullYear(),0,4);return 1+Math.round(((d-y)/864e5-3+((y.getDay()+6)%7))/7);};
const pdfTxt=t=>String(t==null?"":t).replace(/[^\x20-\x7E -ÿ–—‘’“”•€]/g,"").trim();
const durPDF=m=>m==null||m===""?"":durTxt(m);
/* reparte cada trabajo hecho a quien lo hizo; los demás, a quien le tocaba */
function quienDe(o){if((o.estado==="hecha"||o.estado==="no_hecha")&&o.hecho_por_n)return[o.hecho_por_n];if(o.todo_equipo)return["Equipo "+(o.equipo||"")];
  return(o.nombres&&o.nombres.length?o.nombres.map(n=>{const c=(o.cubre||[]).find(x=>x.ausente===n&&x.sustituto);return c?c.sustituto:n;}):["Sin asignar"]);}
function datosInforme(O){const hechas=O.filter(o=>o.estado==="hecha"),noh=O.filter(o=>o.estado==="no_hecha"),sin=O.filter(o=>o.estado==="pendiente"||o.estado==="en_curso");
  const P={};O.forEach(o=>quienDe(o).forEach(n=>{const p=P[n]=P[n]||{t:0,h:0,no:0,min:0,nm:0};p.t++;if(o.estado==="hecha"){p.h++;if(o.minutos!=null){p.min+=o.minutos;if(!o.tiempo_auto)p.nm++;}}if(o.estado==="no_hecha")p.no++;}));
  const T={};O.filter(o=>o.origen==="fija").forEach(o=>{const t=T[o.titulo]=T[o.titulo]||{n:0,h:0,s:0,nm:0,est:null};t.n++;if(o.estado==="hecha"){t.h++;if(o.minutos!=null&&!o.tiempo_auto){t.s+=o.minutos;t.nm++;}}if(o.minutos_est)t.est=o.minutos_est;});
  const D={};O.forEach(o=>{const d=D[o.fecha]=D[o.fecha]||{t:0,h:0};d.t++;if(o.estado==="hecha")d.h++;});
  return{hechas,noh,sin,P,T,D,inc:O.filter(o=>o.origen==="rapida"),min:hechas.reduce((t,o)=>t+(o.minutos||0),0)};}
function achica(src,M,q){return new Promise(ok=>{const im=new Image();if(/^https?:/.test(src))im.crossOrigin="anonymous";im.onload=()=>{const k=Math.min(1,M/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  c.getContext("2d").drawImage(im,0,0,c.width,c.height);ok({src:c.toDataURL("image/jpeg",q),w:c.width,h:c.height});};im.onerror=()=>ok(null);im.src=src;});}
/* Horas de la semana para el PDF: horas trabajadas, extra a mano, fuera de presupuesto y bolsa, con motivos y trabajos de cada día */
async function horasSemana(desde,hasta,O){
  let W,R,FE;try{[W,R,FE]=await Promise.all([trabajadores(true),rpc("horas_rango",{p_tok:S.tok,p_desde:desde,p_hasta:hasta}),rpc("festivos_listar",{p_tok:S.tok})]);}catch(e){return null;}
  const FES=new Set(FE.map(x=>x.fecha));const RH={};R.forEach(x=>RH[x.trabajador+"|"+x.fecha]=x);
  const dias=[];for(let f=desde<BOLSA_DESDE?BOLSA_DESDE:desde;f<=hasta;f=sumaD(f,1))dias.push(f);
  const cerrada=hasta<=hoyISO();const filas=[],fueraL=[];
  W.filter(w=>w.activo&&w.rol!=="admin"&&w.jornada!=="externo").sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).forEach(w=>{
    const c=w.horas_contrato!=null&&w.horas_contrato!==""?+w.horas_contrato:35;
    let Wt=0,paid=0,exc=0,fu=0;
    dias.forEach(f=>{const x=RH[w.id+"|"+f];const esF=FES.has(f);const esp=horasTramos((w.horario||{})[diaClave(f)]||[]);
      const def=esF?0:esp;const fa=x?x.falta:null;const h=fa?0:(x&&x.trabajadas!=null?+x.trabajadas:def);
      const em=x&&x.extra_mano!=null?Math.min(h,+x.extra_mano):0;const fz=x?(+x.fuera||0):0;
      if(fa==="baja"||fa==="vacaciones"||(esF&&h===0))exc+=esp;
      Wt+=h;paid+=em;fu+=fz;
      if(fz>0||em>0){const tr=O.filter(o=>o.fecha===f&&o.estado==="hecha"&&o.hecho_por_n===w.nombre).map(o=>o.titulo+(o.minutos!=null?" ("+durTxt(o.minutos)+")":"")).join(" · ");
        fueraL.push([fCorta(f),w.nombre,dec(fz),dec(em),(x&&x.nota)||"",tr||"—"]);}});
    const dl=(w.jornada==="completa"&&cerrada&&dias.length&&desde>=BOLSA_INICIO)?dec(Wt-paid-(c*dias.length/7-exc)):"—";
    filas.push([w.nombre,w.jornada==="parcial"?"Parcial":w.jornada==="completa"?"Completa":"Sin poner",dec(Wt),dec(paid),dec(fu),dl]);});
  return{filas,fueraL};}
async function hacerPDF(O,X,desde,hasta,pr){await libPDF();const H=await horasSemana(desde,hasta,O);const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"mm",format:"a4"});const W=210,M=14;let y=0;
  const AZ=[31,78,121],GR=[92,107,122];
  const cab=()=>{doc.setFillColor(...AZ);doc.rect(0,0,W,24,"F");doc.setTextColor(255);doc.setFont("helvetica","bold");doc.setFontSize(16);doc.text("Informe semanal de limpieza",M,11);
    doc.setFont("helvetica","normal");doc.setFontSize(10);doc.text(pdfTxt("CIE Inyectametal  ·  Semana "+numSemana(desde)+"  ·  del "+fDMA(desde)+" al "+fDMA(hasta)),M,18);doc.setTextColor(0);y=32;};
  const titulo=t=>{if(y>262){doc.addPage();y=18;}doc.setFont("helvetica","bold");doc.setFontSize(12);doc.setTextColor(...AZ);doc.text(pdfTxt(t),M,y);doc.setDrawColor(...AZ);doc.line(M,y+1.5,W-M,y+1.5);doc.setTextColor(0);y+=6;};
  const tabla=(head,body,opt)=>{doc.autoTable(Object.assign({startY:y,head:[head],body:body.map(r=>r.map(pdfTxt)),margin:{left:M,right:M},styles:{fontSize:8.5,cellPadding:1.6,overflow:"linebreak"},
    headStyles:{fillColor:AZ,textColor:255,fontStyle:"bold"},alternateRowStyles:{fillColor:[245,248,251]}},opt||{}));y=doc.lastAutoTable.finalY+8;};
  cab();
  // resumen
  const tot=O.length,pc=tot?Math.round(X.hechas.length*100/tot):0;
  const kp=[["Trabajos",String(tot)],["Hechos",String(X.hechas.length)],["Cumplimiento",pc+" %"],["No se pudieron",String(X.noh.length)],["Sin hacer",String(X.sin.length)],["Tiempo trabajado",durTxt(X.min)||"0 min"],["Incidencias",String(X.inc.length)]];
  const bw=(W-2*M-3*4)/4;kp.forEach((k,i)=>{const cx=M+(i%4)*(bw+4),cy=y+Math.floor(i/4)*20;doc.setFillColor(238,242,246);doc.roundedRect(cx,cy,bw,17,2,2,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(14);doc.setTextColor(...(k[0]==="No se pudieron"&&X.noh.length||k[0]==="Sin hacer"&&X.sin.length?[179,38,30]:[22,33,44]));doc.text(pdfTxt(k[1]),cx+bw/2,cy+8,{align:"center"});
    doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(...GR);doc.text(k[0],cx+bw/2,cy+13.5,{align:"center"});});doc.setTextColor(0);y+=44;
  titulo("Por persona");tabla(["Persona","Trabajos","Hechos","No se pudo","Tiempo total","Tiempo medio"],Object.keys(X.P).sort().map(n=>{const p=X.P[n];return[n,p.t,p.h,p.no,durPDF(p.min)||"-",p.nm?durTxt(p.min/p.nm):"-"];}));
  if(H){titulo("Horas de la semana");tabla(["Persona","Jornada","Horas trabajadas","Extra a mano","Fuera de presupuesto","Bolsa de la semana (h)"],H.filas);
    if(H.fueraL.length){titulo("Horas fuera de presupuesto y extra, con motivo y trabajos");tabla(["Día","Persona","Fuera (h)","Extra a mano (h)","Motivo","Trabajos hechos ese día"],H.fueraL);}
    else{doc.setFont("helvetica","normal");doc.setFontSize(9);doc.text(pdfTxt("Esta semana no hay horas fuera de presupuesto ni extra a mano."),M,y);y+=8;}}
  titulo("Por día");tabla(["Día","Trabajos","Hechos","Cumplimiento"],Object.keys(X.D).sort().map(f=>{const d=X.D[f];return[fCorta(f),d.t,d.h,(d.t?Math.round(d.h*100/d.t):0)+" %"];}));
  if(Object.keys(X.T).length){titulo("Tareas fijas");tabla(["Tarea","Veces","Hechas","Tiempo estimado","Tiempo medio real"],Object.keys(X.T).sort().map(k=>{const t=X.T[k];return[k,t.n,t.h,t.est?durTxt(t.est):"-",t.nm?durTxt(t.s/t.nm):"-"];}));}
  if(X.noh.length||X.sin.length){titulo("No se pudieron hacer / quedaron sin hacer");tabla(["Día","Trabajo","Quién","Estado","Motivo / nota"],X.noh.concat(X.sin).sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(o=>[fCorta(o.fecha),o.titulo,quienDe(o).join(", "),(EST[o.estado]||[o.estado])[0],o.nota||""]),{columnStyles:{4:{cellWidth:60}}});}
  const RP=problemasRepetidos(O);if(RP.length){titulo("Problemas que se repiten");tabla(["Problema","Veces","Dónde","Última vez","Avisado por"],RP.map(g=>[g.tema,g.n,(zonaRep(g)?"MISMO SITIO: ":"")+(lugTxt(g)||"-"),fCorta(g.ult),Object.keys(g.quien).join(", ")]),{columnStyles:{2:{cellWidth:50}}});}
  // incidencias con fotos
  titulo("Incidencias abiertas por los trabajadores ("+X.inc.length+")");
  if(!X.inc.length){doc.setFontSize(9);doc.setTextColor(...GR);doc.text("No se abrió ninguna esta semana.",M,y);doc.setTextColor(0);y+=8;}
  let ni=0;for(const o of X.inc.sort((a,b)=>(a.creado||a.fecha).localeCompare(b.creado||b.fecha))){ni++;pr&&pr("Preparando incidencia "+ni+" de "+X.inc.length+"…",20+60*ni/X.inc.length);
    if(y>(o.nfotos?195:250)){doc.addPage();y=18;}
    doc.setFont("helvetica","bold");doc.setFontSize(10);const tl=doc.splitTextToSize(pdfTxt((o.prioridad==="alta"?"[URGENTE] ":"")+o.titulo),W-2*M);doc.text(tl,M,y);y+=tl.length*4.6;
    doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor(...GR);
    const info=[fCorta(o.fecha)+(o.creado?" "+hora(o.creado):""),o.lugar?"Dónde: "+o.lugar:null,"Abierta por: "+(o.creado_por_n||"-"),"Estado: "+(EST[o.estado]||[o.estado])[0]+(o.hecho_por_n&&o.estado!=="pendiente"?" ("+o.hecho_por_n+(o.minutos!=null?", "+durTxt(o.minutos):"")+")":"")].filter(Boolean).join("   ·   ");
    const il=doc.splitTextToSize(pdfTxt(info),W-2*M);doc.text(il,M,y);y+=il.length*4;
    if(o.descripcion||o.nota){const dl=doc.splitTextToSize(pdfTxt([o.descripcion,o.nota?"Nota: "+o.nota:null].filter(Boolean).join("  —  ")),W-2*M);doc.setTextColor(40);doc.text(dl,M,y);y+=dl.length*4;}
    doc.setTextColor(0);y+=1.5;
    if(o.nfotos){let F=[];try{F=(await rpc("fotos_ot",{p_tok:S.tok,p_ot:o.id})).filter(f=>f.data);}catch(e){}
      const fw=(W-2*M-6)/2;let col=0,rowH=0;
      for(const f of F){const im=await achica(f.data,900,.62);if(!im)continue;let w=fw,h=w*im.h/im.w;if(h>70){h=70;w=h*im.w/im.h;}
        if(col===0&&y+h>285){doc.addPage();y=18;}
        doc.addImage(im.src,"JPEG",M+col*(fw+6)+(fw-w)/2,y,w,h);rowH=Math.max(rowH,h);col++;if(col===2){col=0;y+=rowH+4;rowH=0;}}
      if(col)y+=rowH+4;
      const lib=(o.nfotos||0)-F.length;if(lib>0){doc.setFontSize(8);doc.setTextColor(...GR);doc.text(lib+" foto(s) guardadas en una copia de seguridad, no incluidas.",M,y);doc.setTextColor(0);y+=5;}}
    doc.setDrawColor(214,222,230);doc.line(M,y,W-M,y);y+=6;}
  // detalle
  doc.addPage();y=18;titulo("Detalle de todos los trabajos");
  tabla(["Día","Trabajo","Quién","Estado","Empezó","Terminó","Tiempo"],O.slice().sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.titulo.localeCompare(b.titulo)).map(o=>[fCorta(o.fecha),o.titulo+(o.lugar?" ("+o.lugar+")":""),quienDe(o).join(", "),(EST[o.estado]||[o.estado])[0],o.inicio?hora(o.inicio):"",o.fin?hora(o.fin):"",durPDF(o.minutos)]),{columnStyles:{1:{cellWidth:55}}});
  const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(7.5);doc.setTextColor(...GR);doc.text(pdfTxt("Generado el "+fDMA(hoyISO())+" por "+S.yo.nombre+" · App Limpieza CIE"),M,292);doc.text("Página "+i+" de "+n,W-M,292,{align:"right"});}
  return doc.output("blob");}
async function hacerXLSX(O,X,desde,hasta){await libXLSX();const wb=XLSX.utils.book_new();
  const res=[["Informe semanal de limpieza - CIE"],["Semana "+numSemana(desde)+", del "+fDMA(desde)+" al "+fDMA(hasta)],[],["Trabajos",O.length],["Hechos",X.hechas.length],["Cumplimiento",O.length?X.hechas.length/O.length:0],["No se pudieron",X.noh.length],["Sin hacer",X.sin.length],["Minutos trabajados",X.min],["Incidencias abiertas por trabajadores",X.inc.length],[],
    ["Persona","Trabajos","Hechos","No se pudo","Minutos totales","Minutos de media"]].concat(Object.keys(X.P).sort().map(n=>{const p=X.P[n];return[n,p.t,p.h,p.no,p.min,p.nm?Math.round(p.min/p.nm):""];}));
  const ws1=XLSX.utils.aoa_to_sheet(res);ws1["!cols"]=[{wch:34},{wch:12},{wch:10},{wch:12},{wch:16},{wch:16}];if(ws1.B6)ws1.B6.z="0%";XLSX.utils.book_append_sheet(wb,ws1,"Resumen");
  const fila=o=>({"Fecha":o.fecha,"Trabajo":o.titulo,"Dónde":o.lugar||"","Quién":quienDe(o).join(", "),"Estado":(EST[o.estado]||[o.estado])[0],"Empezó":o.inicio?hora(o.inicio):"","Terminó":o.fin?hora(o.fin):"",
    "Minutos":o.minutos==null?"":o.minutos,"Minutos estimados":o.minutos_est||"","Urgente":o.prioridad==="alta"?"Sí":"","Origen":({fija:"Tarea fija",manual:"Jefe",rapida:"Abierta por trabajador",excel:"Excel"})[o.origen]||o.origen,"Abierta por":o.origen==="rapida"?(o.creado_por_n||""):"","Fotos":o.nfotos||0,"Nota":o.nota||"","Descripción":o.descripcion||""});
  const add=(L,nom)=>{const ws=XLSX.utils.json_to_sheet(L.length?L.map(fila):[{"Fecha":"","Trabajo":"Ninguno"}]);ws["!cols"]=[12,32,16,24,11,8,8,9,10,8,20,18,6,36,36].map(w=>({wch:w}));if(L.length)ws["!autofilter"]={ref:ws["!ref"]};XLSX.utils.book_append_sheet(wb,ws,nom);};
  const ord=L=>L.slice().sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.titulo.localeCompare(b.titulo));
  add(ord(O),"Trabajos");add(ord(X.inc),"Incidencias");
  {const RP=problemasRepetidos(O);const ws=XLSX.utils.json_to_sheet(RP.length?RP.map(g=>({"Problema":g.tema,"Veces":g.n,"Dónde":lugTxt(g),"Última vez":g.ult,"Avisado por":Object.keys(g.quien).join(", "),"Avisos":g.ots.map(o=>o.fecha+" "+o.titulo).join(" | ")})):[{"Problema":"Nada repetido"}]);
   ws["!cols"]=[{wch:24},{wch:7},{wch:30},{wch:12},{wch:30},{wch:80}];XLSX.utils.book_append_sheet(wb,ws,"Repetidos");}
  return new Blob([XLSX.write(wb,{type:"array",bookType:"xlsx"})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});}
function bajar(blob,nombre){
  /* 1) menú de compartir del móvil (en iPhone: "Guardar en Archivos"); 2) abrir en pestaña nueva; 3) descarga clásica */
  const f=blob instanceof File?blob:new File([blob],nombre,{type:blob.type});
  try{if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f]}).catch(e=>{if(e.name!=="AbortError")abrirNueva();});return;}}catch(e){}
  abrirNueva();
  function abrirNueva(){const u=URL.createObjectURL(f);const w=window.open(u,"_blank");
    if(!w){const a=el("a",{href:u,download:nombre});document.body.appendChild(a);a.click();a.remove();}
    setTimeout(()=>URL.revokeObjectURL(u),120000);}}
async function informe(desde,que){const hasta=sumaD(desde,6);const msg=el("p",{class:"hint",style:"font-size:15px",text:"Leyendo los trabajos…"});const bar=el("div",{class:"bar"},el("i",{style:"width:3%"}));
  const cerrar=dlg("Preparando el informe",el("div",null,[msg,bar]),[]);const pr=(t,p)=>{msg.textContent=t;bar.firstChild.style.width=Math.round(p)+"%";};
  try{const O=await rpc("ots_rango",{p_tok:S.tok,p_desde:desde,p_hasta:hasta});const X=datosInforme(O);const base="informe-limpieza-semana-"+numSemana(desde)+"-"+desde;
    if(!O.length){cerrar();dlg("Sin trabajos esa semana",el("p",{class:"hint",style:"font-size:15px",text:"Esa semana no tiene trabajos. Usa las flechas ◀ del informe para elegir otra semana. Los datos empiezan el 05/10."}),[{t:"Cerrar",cls:"sec"}]);return;}
    const files=[];
    if(que!=="xlsx"){pr("Montando el PDF…",15);files.push(new File([await hacerPDF(O,X,desde,hasta,pr)],base+".pdf",{type:"application/pdf"}));}
    if(que!=="pdf"){pr("Montando el Excel…",90);files.push(new File([await hacerXLSX(O,X,desde,hasta)],base+".xlsx",{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));}
    cerrar();
    if(que==="compartir"){if(navigator.canShare&&navigator.canShare({files})){try{await navigator.share({files});}catch(e){if(e.name!=="AbortError")toast("No se pudo compartir");}return;}
      toast("Este móvil no deja compartir archivos: se descargan");}
    /* en el móvil la descarga automática después de cargar no siempre funciona: cada archivo se guarda con un toque */
    dlg("Informe listo",el("div",null,[el("p",{class:"hint",text:"Toca cada archivo: en el móvil se abre el menú para guardarlo (en el iPhone: «Guardar en Archivos»)."})]),
      files.map(f=>({t:""+f.name,cls:"ok",fn:()=>{bajar(f,f.name);return false;}})).concat([{t:"Cerrar",cls:"sec"}]));}
  catch(e){cerrar();dlg("No se pudo hacer el informe",el("p",{class:"hint",style:"font-size:15px",text:String(e.message||e)}),[{t:"Cerrar",cls:"sec"}]);}}
function bloqueInforme(){S.semInf=S.semInf||sumaD(lunesDe(hoyISO()),-7);const lun=S.semInf;const actual=lunesDe(hoyISO());
  const comp=!!(navigator.canShare&&window.File&&(()=>{try{return navigator.canShare({files:[new File(["x"],"x.pdf",{type:"application/pdf"})]});}catch(e){return false;}})());
  return el("div",{class:"card",id:"informe"},[el("div",{class:"hd"},el("h2",{text:"Informe semanal para el jefe"})),el("div",{class:"bd"},[
    el("div",{class:"datebar",style:"margin:0 0 10px"},[el("button",{class:"btn sec peq","aria-label":"Semana anterior",text:"◀",onclick:()=>{S.semInf=sumaD(lun,-7);pinta();}}),
      el("b",{style:"text-transform:none",text:"Semana "+numSemana(lun)+" · "+fDM(lun)+" al "+fDM(sumaD(lun,6))+(lun===actual?" (en curso)":"")}),
      el("button",{class:"btn sec peq","aria-label":"Semana siguiente",text:"▶",disabled:lun>=actual,onclick:()=>{S.semInf=sumaD(lun,7);pinta();}})]),
    el("p",{class:"hint",text:"PDF con el resumen, lo hecho por cada persona, lo que no se pudo hacer y las incidencias de los trabajadores con sus fotos. El Excel lleva el detalle de cada trabajo."}),
    el("div",{class:"row"},[comp?el("button",{class:"btn",text:"Enviar PDF + Excel",onclick:()=>informe(lun,"compartir")}):null,el("button",{class:"btn"+(comp?" sec":""),text:"Descargar PDF + Excel",onclick:()=>informe(lun,"ambos")})]),
    el("div",{class:"row",style:"margin-top:8px"},[el("button",{class:"btn sec peq",text:"Solo PDF",onclick:()=>informe(lun,"pdf")}),el("button",{class:"btn sec peq",text:"Solo Excel",onclick:()=>informe(lun,"xlsx")})])])]);}

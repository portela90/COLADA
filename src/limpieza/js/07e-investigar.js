/* ===== INVESTIGAR (solo el jefe) =====
   Para justificar las horas del equipo y demostrar los problemas que se repiten:
   - Saturación: horas de jornada de cada uno (como en «Horas del día») frente al tiempo registrado en sus trabajos.
   - Tiempo perdido en problemas: fugas y derrames de aceite o taladrina, agua, desbordamientos, suelo resbaladizo, roturas.
   - Sitios que se repiten: máquina o zona, cuántas veces, cada cuántos días y si sigue pasando. Ficha con todas las veces.
   - Informes en PDF y Excel. Solo tiempo, sin euros. Sale de los trabajos y las horas: no cambia nada. */
const INV_CAT=[["aceite","Fugas y derrames de aceite"],["taladrina","Fugas y derrames de taladrina"],["agua","Agua y filtraciones"],["desborde","Desbordamientos"],
  ["resbala","Suelo resbaladizo"],["rotura","Roturas y averías"],["otro","Otros problemas"]];
const invCatN=k=>(INV_CAT.find(x=>x[0]===k)||[k,k])[1];
const INV_PROB=/(derram|fuga|pierd|perdid|gotea|goteo|charco|mancha|desbord|rebos|filtrac|gotera|inund|humedad|resbal|roto|rota|rotura|averi|estropead|no funciona)/;
/* tipo de problema de un trabajo (null = trabajo normal) */
function invCat(o){const t=sinAcento((o.titulo||"")+" "+(o.descripcion||""));if(!INV_PROB.test(t))return null;
  if(/(aceite|hidraulic)/.test(t))return"aceite";if(/taladrin/.test(t))return"taladrina";if(/(desbord|rebos)/.test(t))return"desborde";
  if(/(agua|filtrac|lluvia|gotera|inund|humedad)/.test(t))return"agua";if(/resbal/.test(t))return"resbala";
  if(/(roto|rota|rotura|averi|estropead|no funciona)/.test(t))return"rotura";return"otro";}
/* dónde: la máquina si el lugar empieza por ella (F19, H-F66 → F66, M3, «F29 · Nave 1» → F29); si no, el lugar tal cual
   (sin mayúsculas de más: «MORIZ» = «Moriz»); sin lugar, la máquina que se nombre en el título, y si no, la nave */
const invCod=m=>m[1].toUpperCase()+(+m[2]);
function invSitio(o){const l=String(o.lugar||"").trim().replace(/\s+/g," ");let m=l.match(/^(?:H-)?([FM])\s?-?(\d{1,3})\b/i);if(m)return invCod(m);
  if(l){const t=l.toLowerCase();return t.charAt(0).toUpperCase()+t.slice(1);}
  m=[o.titulo,o.descripcion].filter(Boolean).join(" ").match(/\b(?:H-)?([FM])\s?-?(\d{1,3})\b/);if(m)return invCod(m);return o.nave||"Sin lugar";}
/* para juntar el mismo trabajo escrito de formas distintas («Derrame taladrina» = «Derrame de taladrina») */
const invClave=o=>sinAcento(String(o.titulo||"").replace(/\s*·.*$/,"")).replace(/[^a-z0-9ñ ]/g," ").split(/\s+/).filter(w=>w&&!VACIAS.has(w)).join(" ");
const invMin=o=>o.estado!=="hecha"?0:(o.minutos!=null&&+o.minutos>=0?+o.minutos:(+o.minutos_est||0));
const invReal=o=>o.estado==="hecha"&&o.minutos!=null&&!o.tiempo_auto;
const invDias=(a,b)=>Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/864e5);
const invH=m=>{m=Math.round(m||0);const h=Math.floor(m/60),r=m%60;return h?(r?h+" h "+r+" min":h+" h"):r+" min";};
const invPct=(a,b)=>b?Math.round(a*100/b):null;
const DIAS_INV=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

/* periodos */
function invPeriodo(k){const h=hoyISO(),y=h.slice(0,4),m=+h.slice(5,7);
  if(k==="mesant"){const pm=m===1?12:m-1,py=m===1?+y-1:+y;const ini=py+"-"+String(pm).padStart(2,"0")+"-01";return{d0:ini,d1:sumaD(h.slice(0,8)+"01",-1),t:"el mes pasado"};}
  if(k==="3m")return{d0:sumaD(h,-89),d1:h,t:"los últimos 3 meses"};
  if(k==="ano")return{d0:y+"-01-01",d1:h,t:"este año"};
  if(k==="sem")return{d0:lunesDe(h),d1:h,t:"esta semana"};
  return{d0:h.slice(0,8)+"01",d1:h,t:"este mes"};}
const invAnterior=(d0,d1)=>{const n=invDias(d0,d1)+1;return{d0:sumaD(d0,-n),d1:sumaD(d0,-1)};};

/* horas de jornada de cada uno, día a día (las mismas que «Horas del día» y el Excel del mes) */
function invJornadas(W,R,FE,SU,d0,d1){const FES=new Set((FE||[]).map(x=>x.fecha)),RH={};(R||[]).forEach(x=>RH[x.trabajador+"|"+x.fecha]=x);
  const lim=d1<hoyISO()?d1:hoyISO();const out={};
  W.filter(w=>w.activo&&w.rol!=="admin"&&w.jornada!=="externo").forEach(w=>{const o=out[w.nombre]={w,min:0,dias:0,faltas:0,D:{}};
    for(let f=d0;f<=lim;f=sumaD(f,1)){const x=RH[w.id+"|"+f],esF=FES.has(f),own=horasTramos((w.horario||{})[diaClave(f)]||[]),su=sustDe(SU,W,w.id,f);
      const h=x&&x.falta?0:(x&&x.trabajadas!=null?+x.trabajadas:(esF?0:Math.max(own,su?su.h:0)));o.min+=h*60;if(h>0)o.dias++;if(x&&x.falta)o.faltas++;o.D[f]=h*60;}});
  return out;}

/* todos los cálculos del periodo */
function invDatos(O,J,d0,d1,Oant){
  const en=o=>o.fecha>=d0&&o.fecha<=d1&&!o.borrado;const L=O.filter(en);
  const H=L.filter(o=>o.estado==="hecha");
  /* saturación */
  const per={};Object.keys(J).forEach(n=>per[n]={n,jor:J[n].min,dias:J[n].dias,faltas:J[n].faltas,min:0,prob:0,plan:0,otros:0,nt:0,real:0});
  H.forEach(o=>{const n=o.hecho_por_n;if(!n||!per[n])return;const p=per[n],m=invMin(o);p.min+=m;p.nt++;if(invReal(o))p.real++;
    if(invCat(o))p.prob+=m;else if(o.origen==="fija")p.plan+=m;else p.otros+=m;});
  const sat=Object.values(per).filter(p=>p.jor>0||p.nt>0).sort((a,b)=>(invPct(b.min,b.jor)||0)-(invPct(a.min,a.jor)||0));
  /* problemas */
  const P=L.filter(o=>invCat(o));const Pant=(Oant||[]).filter(o=>invCat(o));
  const tipos=INV_CAT.map(([k,t])=>{const X=P.filter(o=>invCat(o)===k);return{k,t,n:X.length,min:X.reduce((s,o)=>s+invMin(o),0),ant:Pant.filter(o=>invCat(o)===k).length,
    sitios:new Set(X.map(invSitio)).size};}).filter(x=>x.n||x.ant);
  /* sitios que se repiten: mismo sitio y mismo tipo de problema */
  const G={};P.forEach(o=>{const k=invSitio(o)+"|"+invCat(o);const g=G[k]=G[k]||{sitio:invSitio(o),cat:invCat(o),L:[],min:0};g.L.push(o);g.min+=invMin(o);});
  const hoy=hoyISO();
  const rep=Object.values(G).filter(g=>g.L.length>=2).map(g=>{g.L.sort((a,b)=>(a.fecha+(a.creado||"")).localeCompare(b.fecha+(b.creado||"")));
    const pri=g.L[0].fecha,ult=g.L[g.L.length-1].fecha;g.n=g.L.length;g.pri=pri;g.ult=ult;g.cada=g.n>1?invDias(pri,ult)/(g.n-1):null;g.sigue=invDias(ult,hoy)<=14;
    g.ant=Pant.filter(o=>invSitio(o)===g.sitio&&invCat(o)===g.cat).length;return g;})
    .sort((a,b)=>b.n-a.n||b.min-a.min);
  /* qué trabajos se llevan el tiempo */
  const T={};H.forEach(o=>{const k=invClave(o)||"(sin título)";const t=T[k]=T[k]||{nom:{},n:0,min:0,max:0,real:0,prob:!!invCat(o),plan:o.origen==="fija"};t.nom[o.titulo]=(t.nom[o.titulo]||0)+1;
    const m=invMin(o);t.n++;t.min+=m;t.max=Math.max(t.max,m);if(invReal(o))t.real++;});
  const trab=Object.values(T).map(t=>Object.assign(t,{t:Object.entries(t.nom).sort((a,b)=>b[1]-a[1])[0][0].replace(/\s*·.*$/,"")})).sort((a,b)=>b.min-a.min);
  /* cuándo pasan los problemas */
  const dia=[0,0,0,0,0,0,0];P.forEach(o=>{dia[new Date(o.fecha+"T12:00:00").getDay()]++;});
  const tot={jor:sat.reduce((s,p)=>s+p.jor,0),min:sat.reduce((s,p)=>s+p.min,0),prob:P.reduce((s,o)=>s+invMin(o),0),np:P.length,nt:H.length,real:H.filter(invReal).length};
  return{L,H,sat,tipos,rep,trab,dia,tot,P};}

const invNivel=p=>p==null?"":p>=85?"bad":p>=60?"ok":"warn";
const invNivelTxt=p=>p==null?"":p>=85?"muy cargado":p>=60?"normal":"poco registrado";

async function vInvestigar(v){S.inv=S.inv||Object.assign({k:"mes"},invPeriodo("mes"));const F=S.inv;const re=()=>pinta();
  const chips=el("div",{class:"chips",style:"margin:0 0 8px"},[["sem","Esta semana"],["mes","Este mes"],["mesant","Mes pasado"],["3m","3 meses"],["ano","Este año"]].map(([k,t])=>
    el("button",{type:"button",class:"chip","aria-pressed":String(F.k===k),text:t,onclick:()=>{S.inv=Object.assign({k},invPeriodo(k));re();}})));
  const fechas=el("div",{class:"row",style:"margin:0 0 12px"},[fld("Desde",inp(F.d0,x=>{if(x){S.inv=Object.assign({},F,{k:"",d0:x,t:"del "+fDM(x)+" al "+fDM(F.d1)});re();}},{type:"date"})),
    fld("Hasta",inp(F.d1,x=>{if(x){S.inv=Object.assign({},F,{k:"",d1:x,t:"del "+fDM(F.d0)+" al "+fDM(x)});re();}},{type:"date"}))]);
  v.appendChild(el("div",{class:"card"},[el("div",{class:"bd"},[el("p",{class:"hint",style:"margin-top:0",text:"Saturación del equipo, tiempo que se va en fugas y derrames, y las máquinas o zonas donde se repiten. Solo lo ves tú."}),chips,fechas])]));
  const box=el("div",null,el("div",{class:"card"},el("div",{class:"empty",text:"Cargando…"})));v.appendChild(box);
  if(F.d0>F.d1){box.textContent="";box.appendChild(el("div",{class:"empty",text:"La fecha «desde» es después de «hasta»."}));return;}
  const A=invAnterior(F.d0,F.d1);let O,W,R,FE,SU;
  try{[O,W,R,FE,SU]=await Promise.all([rpc("ots_rango",{p_tok:S.tok,p_desde:A.d0,p_hasta:F.d1}),trabajadores(true),rpc("horas_rango",{p_tok:S.tok,p_desde:F.d0,p_hasta:F.d1}),rpc("festivos_listar",{p_tok:S.tok}),sustRango(F.d0,F.d1)]);}
  catch(e){box.textContent="";box.appendChild(el("div",{class:"empty",text:e.message}));return;}
  const J=invJornadas(W,R,FE,SU,F.d0,F.d1);const Oant=O.filter(o=>o.fecha>=A.d0&&o.fecha<=A.d1&&!o.borrado);
  const X=invDatos(O,J,F.d0,F.d1,Oant);S.invX={X,F,A};box.textContent="";
  const T=X.tot;
  box.appendChild(el("div",{class:"kpis"},[["Saturación del equipo",T.jor?invPct(T.min,T.jor)+" %":"—"],["Horas de jornada",invH(T.jor)],["Horas en trabajos",invH(T.min)],["Perdidas en problemas",invH(T.prob)]].map(([a,b])=>el("div",null,[el("b",{text:String(b)}),el("small",{text:a})]))));
  box.appendChild(el("div",{class:"row",style:"margin:0 0 12px"},[el("button",{class:"btn",text:"Informe PDF",onclick:async e=>{e.target.disabled=true;try{bajar(await invPDF(X,F,A),"investigacion-limpieza-"+F.d0+"_"+F.d1+".pdf");}catch(er){toast(er.message);}e.target.disabled=false;}}),
    el("button",{class:"btn sec",text:"Excel",onclick:async e=>{e.target.disabled=true;try{bajar(await invXLSX(X,F),"investigacion-limpieza-"+F.d0+"_"+F.d1+".xlsx");}catch(er){toast(er.message);}e.target.disabled=false;}})]));
  /* saturación */
  box.appendChild(el("div",{class:"card",id:"invSat"},[el("div",{class:"hd"},[el("h2",{text:"Saturación de cada trabajador"}),el("span",{class:"der sub",text:F.t})]),el("div",{class:"bd"},[
    el("p",{class:"hint",style:"margin-top:0",text:"Tiempo registrado en trabajos (de «Empezar» a «Terminar») frente a sus horas de jornada. Por debajo del 60 % suele ser que no se apunta todo (desplazamientos, preparar material, trabajos sin abrir), no que no se trabaje."}),
    X.sat.length?el("table",{class:"g-tab"},[el("thead",null,el("tr",null,["Persona","Jornada","En trabajos","Saturación","En problemas","Trabajos"].map(h=>el("th",{text:h})))),
      el("tbody",null,X.sat.map(p=>{const pc=invPct(p.min,p.jor);return el("tr",null,[el("td",null,[el("b",{text:p.n}),el("div",{class:"bar"+(pc>=85?" llena":""),style:"margin-top:4px"},el("i",{style:"width:"+Math.min(100,pc||0)+"%"}))]),
        el("td",{text:invH(p.jor)}),el("td",{text:invH(p.min)}),el("td",null,pc==null?"—":el("span",{class:"pill "+invNivel(pc),text:pc+" %"})),el("td",{text:p.prob?invH(p.prob):"—"}),
        el("td",{text:p.nt+(p.nt&&p.real<p.nt?" ("+invPct(p.real,p.nt)+" % con tiempo real)":"")})]);}))]):el("p",{class:"hint",text:"Nadie tiene horas ni trabajos en este periodo."}),
    el("p",{class:"hint",text:"Rojo: 85 % o más (muy cargado). Los trabajos sin «Empezar» cuentan con su tiempo estimado."})])]));
  /* tiempo perdido por tipo */
  box.appendChild(el("div",{class:"card",id:"invTipos"},[el("div",{class:"hd"},[el("h2",{text:"Tiempo perdido en problemas"}),el("span",{class:"der sub",text:X.P.length+" avisos"})]),el("div",{class:"bd"},[
    X.tipos.length?el("table",{class:"g-tab"},[el("thead",null,el("tr",null,["Problema","Veces","Tiempo","Media","Sitios","Antes"].map(h=>el("th",{text:h})))),
      el("tbody",null,X.tipos.map(t=>el("tr",null,[el("td",{text:t.t}),el("td",{text:String(t.n)}),el("td",{text:invH(t.min)}),el("td",{text:t.n?invH(t.min/t.n):"—"}),el("td",{text:String(t.sitios)}),
        el("td",null,el("span",{class:"pill "+(t.n>t.ant?"bad":t.n<t.ant?"ok":""),text:t.ant+(t.n>t.ant?" ↑":t.n<t.ant?" ↓":" =")}))])))]):el("p",{class:"hint",text:"Ningún problema (fugas, derrames, agua, roturas…) en este periodo."}),
    el("p",{class:"hint",text:"«Antes»: las veces del periodo anterior de la misma duración ("+fDM(A.d0)+" al "+fDM(A.d1)+")."})])]));
  /* sitios que se repiten */
  box.appendChild(el("div",{class:"card",id:"invRep"},[el("div",{class:"hd"},[el("h2",{text:"Máquinas y zonas donde se repite"}),el("span",{class:"der sub",text:X.rep.length?X.rep.length+" sitios":""})]),el("div",{class:"bd"},[
    X.rep.length?el("div",null,X.rep.map(g=>el("button",{type:"button",class:"ot",style:"display:block;width:100%;text-align:left;cursor:pointer",onclick:()=>invFicha(g,F)},[
      el("div",{class:"t",text:g.sitio+" · "+invCatN(g.cat)}),
      el("div",{class:"d",text:g.n+" veces · "+invH(g.min)+" de limpieza"+(g.cada!=null?" · una cada "+String(Math.round(g.cada*10)/10).replace(".",",")+" días":"")+" · última "+fCorta(g.ult)}),
      el("div",{class:"meta"},[g.sigue?el("span",{class:"pill bad",text:"Sigue pasando"}):el("span",{class:"pill ok",text:"Hace "+invDias(g.ult,hoyISO())+" días que no"}),
        g.ant?el("span",{class:"pill",text:"Antes: "+g.ant}):null,el("span",{class:"pill info",text:"Ver todas y sacar informe ›"})])]))):el("p",{class:"hint",text:"Ningún problema se ha repetido en el mismo sitio en este periodo."}),
    el("p",{class:"hint",text:"El sitio sale de la máquina que se nombra (F19, H-F66…) o del lugar que se apunta. Para que cuadre, que se apunte siempre en qué máquina es."})])]));
  /* qué trabajos se llevan el tiempo */
  box.appendChild(el("details",{class:"card",id:"invTrab"},[el("summary",{class:"hd",style:"cursor:pointer"},[el("h2",{text:"En qué se va el tiempo"}),el("span",{class:"der sub",text:X.trab.length+" trabajos distintos"})]),el("div",{class:"bd"},[
    X.trab.length?el("table",{class:"g-tab"},[el("thead",null,el("tr",null,["Trabajo","Veces","Tiempo","Media","Máx."].map(h=>el("th",{text:h})))),
      el("tbody",null,X.trab.slice(0,25).map(t=>el("tr",null,[el("td",null,[t.t,t.prob?el("span",{class:"pill bad",style:"margin-left:6px",text:"problema"}):t.plan?el("span",{class:"pill",style:"margin-left:6px",text:"fija"}):null]),
        el("td",{text:String(t.n)}),el("td",{text:invH(t.min)}),el("td",{text:invH(t.min/t.n)}),el("td",{text:invH(t.max)})])))]):el("p",{class:"hint",text:"Ningún trabajo hecho en este periodo."})])]));
  /* cuándo pasan */
  if(X.P.length)box.appendChild(el("details",{class:"card",id:"invDia"},[el("summary",{class:"hd",style:"cursor:pointer"},el("h2",{text:"Qué días pasan más los problemas"})),el("div",{class:"bd"},[
    el("table",{class:"g-tab"},[el("thead",null,el("tr",null,["Día","Avisos",""].map(h=>el("th",{text:h})))),el("tbody",null,[1,2,3,4,5,6,0].filter(d=>X.dia[d]).map(d=>el("tr",null,[el("td",{text:DIAS_INV[d]}),el("td",{text:String(X.dia[d])}),
      el("td",{style:"width:45%"},el("div",{class:"bar"},el("i",{style:"width:"+Math.round(X.dia[d]*100/Math.max(...X.dia))+"%"})))])))])])]));}

/* ficha de un sitio: todas las veces, para llevársela a mantenimiento */
function invFrase(g){const s=g.sitio,n=g.n;return s+" ha tenido "+n+" "+(g.cat==="aceite"?"fugas o derrames de aceite":g.cat==="taladrina"?"fugas o derrames de taladrina":invCatN(g.cat).toLowerCase())+
  " entre el "+fDMA(g.pri)+" y el "+fDMA(g.ult)+(g.cada!=null?": una cada "+String(Math.round(g.cada*10)/10).replace(".",",")+" días de media":"")+". Se han empleado "+invH(g.min)+" en limpiarlas."+
  (g.sigue?" La última fue hace "+invDias(g.ult,hoyISO())+" días: sigue pasando.":"");}
function invFicha(g,F){const fila=o=>el("tr",null,[el("td",{text:fCorta(o.fecha)+(o.creado?" "+hora(o.creado):"")}),el("td",null,[el("b",{text:o.titulo}),o.descripcion?el("div",{class:"hint",style:"margin:2px 0 0",text:o.descripcion}):null]),
    el("td",{text:o.hecho_por_n||o.creado_por_n||"—"}),el("td",{text:o.estado==="hecha"?invH(invMin(o))+(invReal(o)?"":" (est.)"):EST[o.estado]?EST[o.estado][0]:o.estado}),el("td",{text:o.nfotos?String(o.nfotos):"—"})]);
  dlg(g.sitio+" · "+invCatN(g.cat),el("div",null,[el("p",{style:"margin-top:0;font-weight:600",text:invFrase(g)}),
    el("div",{style:"overflow:auto"},el("table",{class:"g-tab"},[el("thead",null,el("tr",null,["Cuándo","Qué","Quién","Tiempo","Fotos"].map(h=>el("th",{text:h})))),el("tbody",null,g.L.slice().reverse().map(fila))])),
    el("p",{class:"hint",text:"Periodo: "+F.t+". Las fotos están en cada trabajo (pantalla del día)."})]),
    [{t:"Cerrar",cls:"sec"},{t:"Excel",cls:"sec",fn:async()=>{try{bajar(await invXLSXSitio(g,F),"repeticiones-"+g.sitio.replace(/\W+/g,"_")+"-"+g.cat+".xlsx");}catch(e){toast(e.message);}return false;}},
     {t:"Informe PDF",fn:async()=>{try{bajar(await invPDFSitio(g,F),"repeticiones-"+g.sitio.replace(/\W+/g,"_")+"-"+g.cat+".pdf");}catch(e){toast(e.message);}return false;}}]);}

/* ---------- PDF ---------- */
async function invDoc(tit,sub){await libPDF();const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"mm",format:"a4"});const W=210,M=14,AZ=[31,78,121];
  doc.setFillColor(...AZ);doc.rect(0,0,W,24,"F");doc.setTextColor(255);doc.setFont("helvetica","bold");doc.setFontSize(15);doc.text(pdfTxt(tit),M,11);
  doc.setFont("helvetica","normal");doc.setFontSize(10);doc.text(pdfTxt(sub),M,18);doc.setTextColor(0);
  const o={doc,y:32,M,AZ,W};
  o.titulo=t=>{if(o.y>260){doc.addPage();o.y=18;}doc.setFont("helvetica","bold");doc.setFontSize(12);doc.setTextColor(...AZ);doc.text(pdfTxt(t),M,o.y);doc.setTextColor(0);o.y+=4;};
  o.texto=t=>{doc.setFont("helvetica","normal");doc.setFontSize(10);const L=doc.splitTextToSize(pdfTxt(t),W-2*M);if(o.y+L.length*5>280){doc.addPage();o.y=18;}doc.text(L,M,o.y+2);o.y+=L.length*5+4;};
  o.tabla=(head,body,opt)=>{doc.autoTable(Object.assign({startY:o.y,head:[head],body:body.map(r=>r.map(x=>pdfTxt(String(x)))),margin:{left:M,right:M},styles:{fontSize:9,cellPadding:1.8,overflow:"linebreak"},
    headStyles:{fillColor:AZ,textColor:255,fontStyle:"bold"},alternateRowStyles:{fillColor:[245,248,251]}},opt||{}));o.y=doc.lastAutoTable.finalY+9;};
  return o;}
async function invPDF(X,F,A){const o=await invDoc("Investigación de Limpieza","Limpieza CIE · "+fDMA(F.d0)+" al "+fDMA(F.d1));const T=X.tot;
  o.texto("Horas de jornada del equipo: "+invH(T.jor)+". Tiempo registrado en trabajos: "+invH(T.min)+(T.jor?" ("+invPct(T.min,T.jor)+" % de saturación)":"")+". Tiempo empleado en problemas (fugas, derrames, agua, roturas…): "+invH(T.prob)+" en "+T.np+" avisos.");
  o.titulo("Saturación de cada trabajador");
  o.tabla(["Persona","Jornada","En trabajos","Saturación","En problemas","Planificado","Otros","Trabajos","Días trabajados"],X.sat.map(p=>[p.n,invH(p.jor),invH(p.min),p.jor?invPct(p.min,p.jor)+" %":"—",invH(p.prob),invH(p.plan),invH(p.otros),p.nt,p.dias]));
  o.texto("Saturación = tiempo registrado en trabajos (de «Empezar» a «Terminar», sin pausas) / horas de jornada. Los trabajos sin tiempo real cuentan con su tiempo estimado.");
  if(X.tipos.length){o.titulo("Tiempo perdido en problemas");o.tabla(["Problema","Veces","Tiempo","Media por vez","Sitios distintos","Periodo anterior"],X.tipos.map(t=>[t.t,t.n,invH(t.min),t.n?invH(t.min/t.n):"—",t.sitios,t.ant]));}
  if(X.rep.length){o.titulo("Máquinas y zonas donde se repite");o.tabla(["Sitio","Problema","Veces","Tiempo","Cada (días)","Primera","Última","Sigue"],X.rep.map(g=>[g.sitio,invCatN(g.cat),g.n,invH(g.min),g.cada!=null?String(Math.round(g.cada*10)/10).replace(".",","):"—",fDMA(g.pri),fDMA(g.ult),g.sigue?"Sí":"No"]));
    X.rep.slice(0,5).forEach(g=>o.texto("· "+invFrase(g)));}
  if(X.trab.length){o.titulo("En qué se va el tiempo (los 15 que más)");o.tabla(["Trabajo","Veces","Tiempo","Media","Máximo"],X.trab.slice(0,15).map(t=>[t.t+(t.prob?" (problema)":""),t.n,invH(t.min),invH(t.min/t.n),invH(t.max)]));}
  return o.doc.output("blob");}
async function invPDFSitio(g,F){const o=await invDoc(g.sitio+" · "+invCatN(g.cat),"Limpieza CIE · repeticiones · "+fDMA(F.d0)+" al "+fDMA(F.d1));
  o.texto(invFrase(g));
  o.tabla(["Fecha","Hora","Qué","Descripción","Quién","Tiempo","Fotos"],g.L.map(x=>[fDMA(x.fecha),x.creado?hora(x.creado):"",x.titulo,x.descripcion||"",x.hecho_por_n||x.creado_por_n||"",x.estado==="hecha"?invH(invMin(x))+(invReal(x)?"":" (est.)"):x.estado,x.nfotos||0]),
    {columnStyles:{0:{cellWidth:20},1:{cellWidth:12},5:{cellWidth:18},6:{cellWidth:12}}});
  o.texto("Cada fila es un aviso apuntado en la app de Limpieza, con su hora y quién lo atendió. Las fotos están guardadas en cada aviso.");
  return o.doc.output("blob");}
/* ---------- Excel ---------- */
const invLibro=()=>XLSX.utils.book_new();
const invHoja=(wb,nom,filas)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(filas.length?filas:[{"":"Nada en este periodo"}]),nom);
const invHd=m=>Math.round((m||0)/6)/10;
async function invXLSX(X,F){await libXLSX();const wb=invLibro();
  invHoja(wb,"Saturación",X.sat.map(p=>({"Persona":p.n,"Jornada (h)":invHd(p.jor),"En trabajos (h)":invHd(p.min),"Saturación (%)":p.jor?invPct(p.min,p.jor):null,"En problemas (h)":invHd(p.prob),"Planificado (h)":invHd(p.plan),"Otros (h)":invHd(p.otros),"Trabajos":p.nt,"Con tiempo real":p.real,"Días trabajados":p.dias,"Faltas":p.faltas})));
  invHoja(wb,"Problemas",X.tipos.map(t=>({"Problema":t.t,"Veces":t.n,"Tiempo (h)":invHd(t.min),"Media (min)":t.n?Math.round(t.min/t.n):null,"Sitios":t.sitios,"Periodo anterior":t.ant})));
  invHoja(wb,"Repetidos",X.rep.map(g=>({"Sitio":g.sitio,"Problema":invCatN(g.cat),"Veces":g.n,"Tiempo (h)":invHd(g.min),"Cada (días)":g.cada!=null?Math.round(g.cada*10)/10:null,"Primera":g.pri,"Última":g.ult,"Sigue pasando":g.sigue?"Sí":"No","Periodo anterior":g.ant})));
  invHoja(wb,"Avisos de problemas",X.P.map(o=>({"Fecha":o.fecha,"Hora":o.creado?hora(o.creado):"","Sitio":invSitio(o),"Problema":invCatN(invCat(o)),"Trabajo":o.titulo,"Descripción":o.descripcion||"","Quién lo atendió":o.hecho_por_n||"","Estado":o.estado,"Minutos":o.estado==="hecha"?Math.round(invMin(o)):null,"Tiempo real":invReal(o)?"Sí":"Estimado"})));
  invHoja(wb,"Trabajos",X.trab.map(t=>({"Trabajo":t.t,"Tipo":t.prob?"Problema":t.plan?"Fija":"Otro","Veces":t.n,"Tiempo (h)":invHd(t.min),"Media (min)":Math.round(t.min/t.n),"Máximo (min)":Math.round(t.max)})));
  return new Blob([XLSX.write(wb,{type:"array",bookType:"xlsx"})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});}
async function invXLSXSitio(g,F){await libXLSX();const wb=invLibro();
  invHoja(wb,"Repeticiones",g.L.map(o=>({"Fecha":o.fecha,"Hora":o.creado?hora(o.creado):"","Sitio":g.sitio,"Problema":invCatN(g.cat),"Trabajo":o.titulo,"Descripción":o.descripcion||"","Quién lo atendió":o.hecho_por_n||o.creado_por_n||"","Minutos":o.estado==="hecha"?Math.round(invMin(o)):null,"Tiempo real":invReal(o)?"Sí":"Estimado","Fotos":o.nfotos||0})));
  invHoja(wb,"Resumen",[{"Resumen":invFrase(g)}]);
  return new Blob([XLSX.write(wb,{type:"array",bookType:"xlsx"})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});}

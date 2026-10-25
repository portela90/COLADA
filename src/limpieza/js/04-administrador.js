/* ---------- administrador ---------- */
function campoTiempo(v,on){let val=v||"";const i=el("input",{type:"number",inputmode:"numeric",min:"1",max:"1440",placeholder:"minutos",value:val});
  const ch=el("div",{class:"chips",style:"margin-top:6px"});const pc=()=>{ch.textContent="";[15,30,45,60,90,120].forEach(m=>ch.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(+val===m),text:durTxt(m),onclick:()=>{val=m;i.value=m;on(m);pc();}})));};
  i.oninput=()=>{val=i.value;on(i.value?parseInt(i.value,10):null);pc();};pc();return el("div",null,[i,ch]);}

/* faltas, bajas y sustituciones */
const MOTIVOS=["Baja","Vacaciones","Permiso","Otro"];
async function formSust(s0,re){const L=await trabajadores();const s=Object.assign({motivo:"Baja",desde:hoyISO(),hasta:hoyISO()},JSON.parse(JSON.stringify(s0)));
  const chA=chipsTrab(L,s.ausente?[s.ausente]:[],false),chS=chipsTrab(L,s.sustituto?[s.sustituto]:[],false);
  const mot=el("div",{class:"chips"});const pm=()=>{mot.textContent="";MOTIVOS.concat(s.motivo==="Horas extra"?["Horas extra"]:[]).forEach(k=>mot.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(s.motivo===k),text:k,onclick:()=>{s.motivo=k;pm();}})));};pm();
  const bot=[{t:"Cancelar",cls:"sec"}];
  if(s.id)bot.push({t:"Quitar",cls:"bad",fn:async()=>{if(!confirm("¿Quitar esta falta?"))return false;await rpc("sust_borrar",{p_tok:S.tok,p_id:s.id});toast("Quitada");re();}});
  bot.push({t:"Guardar",fn:async()=>{const a=chA.val()[0],b=chS.val()[0]||null;if(!a){toast("Elige quién falta");return false;}if(a===b){toast("No puede cubrirse a sí mismo");return false;}
    if(s.hasta<s.desde){toast("La fecha «hasta» es antes que «desde»");return false;}
    await rpc("sust_guardar",{p_tok:S.tok,p:{id:s.id||null,ausente:a,sustituto:b,desde:s.desde,hasta:s.hasta,motivo:s.motivo,nota:s.nota||null}});toast(b?"Guardado: sus trabajos le salen a quien le cubre":"Guardado");re();}});
  dlg(s.id?"Editar falta":"Alguien falta",el("div",null,[el("p",{class:"hint",text:"Los trabajos de la persona que falta le salen a quien le cubre, esos días. Puedes elegir a cualquiera, también de otro equipo."}),
    fld("¿Quién falta?",chA),fld("Motivo",mot),
    el("div",{class:"row"},[fld("Desde",inp(s.desde,x=>s.desde=x,{type:"date"})),fld("Hasta",inp(s.hasta,x=>s.hasta=x,{type:"date"}))]),
    fld("¿Quién le cubre? (si no hay nadie, déjalo sin marcar)",chS),fld("Nota (opcional)",inp(s.nota,x=>s.nota=x))]),bot);}
/* copia de seguridad: ZIP con fotos + Excel de todos los trabajos */
function cargaJS(src,glob){return window[glob]?Promise.resolve():new Promise((ok,ko)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=()=>ko(new Error("No se pudo cargar "+glob+". Revisa internet."));document.head.appendChild(s);});}
const limpio=t=>String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40);
async function hacerCopia(info){const msg=el("p",{class:"hint",style:"font-size:15px",text:"Preparando…"});const bar=el("div",{class:"bar"},el("i",{style:"width:0%"}));
  const cerrar=dlg("Haciendo copia",el("div",null,[msg,bar,el("p",{class:"hint",text:"No cierres la app hasta que termine."})]),[]);
  const pr=(t,p)=>{msg.textContent=t;bar.firstChild.style.width=Math.round(p)+"%";};
  try{await Promise.all([cargaJS("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js","JSZip"),cargaJS("https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js","XLSX")]);
    pr("Leyendo trabajos…",3);const [O,F]=await Promise.all([rpc("ots_export",{p_tok:S.tok}),rpc("fotos_lista",{p_tok:S.tok})]);
    const zip=new JSZip();const nomF={},cuenta={};
    F.forEach(f=>{const b=f.fecha+"_"+limpio(f.titulo);cuenta[b]=(cuenta[b]||0)+1;nomF[f.id]="fotos/"+f.fecha.slice(0,7)+"/"+b+"_"+cuenta[b]+".jpg";});
    const fotosDe={};F.forEach(f=>(fotosDe[f.ot]=fotosDe[f.ot]||[]).push(nomF[f.id].split("/").pop()));
    const filas=O.map(o=>({"Fecha":o.fecha,"Trabajo":o.titulo,"Descripción":o.descripcion||"","Dónde":o.lugar||"","Tipo":o.tipo||"","Equipo":o.equipo||"","Turno":o.turno||"",
      "Asignado a":o.todo_equipo?"Todo el equipo":(o.nombres||[]).join(", "),"Estado":(EST[o.estado]||[o.estado])[0],"Empezó":o.inicio?hora(o.inicio):"","Terminó":o.fin?hora(o.fin):"","Minutos":o.minutos==null?"":o.minutos,
      "Hecho por":o.hecho_por_n||"","Checklist":o.resultado||"","Detalle checklist":Object.entries(Object.assign({},o.checklist||{},o.checklist_final||{})).map(([k,v])=>k+": "+v).join("; "),
      "Nota":o.nota||"","Origen":({fija:"Tarea fija",manual:"Jefe",rapida:"Abierta por operario",excel:"Excel"})[o.origen]||o.origen,"Abierta por":o.creado_por_n||"","Urgente":o.prioridad==="alta"?"Sí":"","Fotos":(fotosDe[o.id]||[]).join(", ")}));
    const wb=XLSX.utils.book_new();const ws=XLSX.utils.json_to_sheet(filas);ws["!cols"]=[12,30,30,14,12,10,12,24,10,8,8,8,18,10,40,30,18,18,8,40].map(w=>({wch:w}));ws["!autofilter"]={ref:ws["!ref"]};
    XLSX.utils.book_append_sheet(wb,ws,"Trabajos");zip.file("trabajos.xlsx",XLSX.write(wb,{type:"array",bookType:"xlsx"}));
    const ids=F.map(f=>f.id);let hechas=0;
    for(let i=0;i<ids.length;i+=10){const D=await rpc("fotos_datos",{p_tok:S.tok,p_ids:ids.slice(i,i+10)});
      for(const d of D){if(!d.data)continue;if(/^https?:/.test(d.data)){try{zip.file(nomF[d.id],await (await fetch(d.data)).blob());}catch(e){}}else zip.file(nomF[d.id],d.data.split(",")[1],{base64:true});}hechas+=D.length;pr("Descargando fotos "+hechas+" de "+ids.length+"…",5+85*hechas/Math.max(1,ids.length));}
    pr("Creando el archivo…",92);const blob=await zip.generateAsync({type:"blob"});
    const nombre="limpieza-copia-"+hoyISO()+".zip";const a=el("a",{href:URL.createObjectURL(blob),download:nombre});document.body.appendChild(a);a.click();a.remove();
    S.copiados=ids;ls.set("limp.copia",hoyISO());cerrar();
    dlg("Copia hecha ",el("div",null,[el("p",{text:"Se ha descargado «"+nombre+"» con "+O.length+" trabajos y "+ids.length+" fotos."}),
      el("details",{class:"ayuda"},[el("summary",{text:"¿Qué hago con la copia?"}),el("p",{class:"hint",text:"Guárdalo en tu ordenador, un pendrive o tu Google Drive. Cuando lo tengas guardado, ya puedes liberar espacio: se borran de la app solo las fotos que van en esta copia. Los trabajos se quedan."})])]),
      [{t:"Ahora no",cls:"sec"},{t:"Liberar espacio",cls:"bad",fn:()=>liberar()}]);}
  catch(e){cerrar();toast(e.message);}}
async function liberar(){const ids=S.copiados||[];if(!ids.length){toast("Primero haz la copia");return false;}
  if(!confirm("¿Has guardado el archivo de la copia? Se borrarán "+ids.length+" fotos de la app (siguen en tu copia)."))return false;
  let n=0;for(let i=0;i<ids.length;i+=200)n+=await rpc("fotos_liberar",{p_tok:S.tok,p_ids:ids.slice(i,i+200)});
  S.copiados=null;toast("Espacio liberado: "+n+" fotos");pinta();}
/* pasar las fotos antiguas (guardadas dentro de la base de datos) al almacén de fotos */
async function moverFotos(){let ids;try{ids=await rpc("fotos_por_mover",{p_tok:S.tok});}catch(e){toast(e.message);return;}
  if(!ids.length){toast("No queda ninguna foto por mover");return;}
  if(!confirm("Se van a pasar "+ids.length+" fotos al almacén. Tarda unos minutos: no cierres la app. ¿Seguimos?"))return;
  const msg=el("p",{class:"hint",style:"font-size:15px",text:"Empezando…"}),bar=el("div",{class:"bar"},el("i",{style:"width:0%"}));
  const cerrar=dlg("Moviendo fotos",el("div",null,[msg,bar,el("p",{class:"hint",text:"No cierres la app hasta que termine."})]),[]);
  let ok=0,mal=0,ult="";
  for(const id of ids){try{const r=await rpc("foto_mover_reservar",{p_tok:S.tok,p_id:id});await subirAlmacen(r.ruta,await (await fetch(r.data)).blob());ok+=await rpc("foto_mover_ok",{p_tok:S.tok,p_id:id});}catch(e){mal++;ult=e.message;}
    msg.textContent="Movidas "+ok+" de "+ids.length+(mal?" · "+mal+" con error":"");bar.firstChild.style.width=Math.round((ok+mal)*100/ids.length)+"%";}
  cerrar();dlg(mal?"Terminado con errores":"Fotos movidas ",el("p",{text:ok+" fotos pasadas al almacén."+(mal?" "+mal+" no se pudieron ("+ult+"). Siguen dentro de la base de datos y puedes volver a intentarlo.":" La base de datos ya no las guarda dentro.")}),[{t:"Vale",cls:"ok",fn:()=>{pinta();}}]);}
function bloqueCopia(){const box=el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Copia de seguridad"})),el("div",{class:"empty",text:"Cargando…"})]);
  rpc("espacio",{p_tok:S.tok}).then(E=>{box.lastChild.remove();const pct=Math.round(E.total*100/E.limite);const ult=ls.get("limp.copia");
    box.appendChild(el("div",{class:"bd"},[el("p",{style:"margin:0 0 6px",text:"Espacio usado: "+pct+" % ("+Math.round(E.total/1048576)+" MB de "+Math.round(E.limite/1048576)+" MB)"}),
      el("div",{class:"bar"+(pct>=80?" llena":"")},el("i",{style:"width:"+Math.min(100,pct)+"%"})),
      E.almacen!=null?el("p",{class:"hint",style:"margin:0 0 4px",text:"Almacén de fotos: "+E.almacen+" fotos, "+Math.round(E.almacen_bytes/1048576)+" MB de "+Math.round(E.almacen_limite/1048576)+" MB"}):null,
      el("p",{class:"hint",text:E.fotos+" fotos dentro de la base de datos ("+Math.round(E.fotos_bytes/1048576)+" MB)"+(E.liberadas?" · "+E.liberadas+" ya guardadas en copias":"")+(ult?" · última copia desde este móvil: "+fCorta(ult):"")}),
      E.almacen!=null&&E.fotos>0?el("button",{class:"btn ok",style:"width:100%;margin:0 0 8px",text:"Mover "+E.fotos+" fotos al almacén",onclick:()=>moverFotos()}):null,
      el("div",{class:"row"},[el("button",{class:"btn",text:"Hacer copia",onclick:()=>hacerCopia(E)}),S.copiados&&S.copiados.length?el("button",{class:"btn bad",text:"Liberar espacio ("+S.copiados.length+" fotos)",onclick:()=>liberar()}):null])]));}).catch(e=>{box.lastChild.textContent=e.message;});
  return box;}

async function externos(){return new Set((await trabajadores()).filter(w=>w.jornada==="externo").map(w=>w.id));}
let TRAB=null;async function trabajadores(force){if(!TRAB||force)TRAB=await rpc(esAdm()?"trabajadores_admin":"trabajadores_gestor",{p_tok:S.tok});return TRAB;}
function chipsTrab(L,sel0,multi){const s=new Set(sel0||[]);const box=el("div",{class:"chips"});const pint=()=>{box.textContent="";L.filter(w=>w.activo).forEach(w=>box.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(s.has(w.id)),text:w.nombre,onclick:()=>{if(s.has(w.id))s.delete(w.id);else{if(!multi)s.clear();s.add(w.id);}pint();}})));};pint();box.val=()=>Array.from(s);return box;}
async function formOT(o0,re){const [L,H]=await Promise.all([trabajadores(),habituales(),zonasL()]);const o=Object.assign({fecha:hoyISO(),equipo:"Semana",prioridad:"normal",asignados:[],todo_equipo:false},o0);
  const ch=chipsTrab(L,o.asignados,true);
  let cerrarF=()=>{};const hab=!o.id&&H.some(h=>h.activo)?fld("Rellenar con una tarea habitual",el("div",{class:"chips hab"},H.filter(h=>h.activo).map(h=>el("button",{type:"button",class:"chip","aria-pressed":String(o.habitual_id===h.id),text:h.titulo+(h.minutos_est?" · "+durTxt(h.minutos_est):""),
    onclick:()=>{cerrarF();formOT(Object.assign({},o,{titulo:h.titulo,lugar:h.lugar||o.lugar,descripcion:h.descripcion||o.descripcion,minutos_est:h.minutos_est,habitual_id:h.id,asignados:ch.val()}),re);}})))):null;
  const lugF=inp(o.lugar,v=>{o.lugar=v;zsF.value=(ZONAS||[]).some(z=>z.nombre===v)?v:"";},{placeholder:"p. ej. F28, pasillo Nave 2…"});
  const zsF=selZona(o.lugar,z=>{if(!z)return;o.lugar=z;lugF.value=z;});
  const cuerpo=el("div",null,[hab,fld("Título",inp(o.titulo,v=>o.titulo=v)),fld("Zona (elige de la lista)",zsF),fld("Dónde (o escríbelo)",lugF),fld("Tiempo estimado (opcional)",campoTiempo(o.minutos_est,v=>o.minutos_est=v)),fld("Descripción",area(o.descripcion,v=>o.descripcion=v)),
    el("div",{class:"row"},[fld("Fecha",inp(o.fecha,v=>o.fecha=v,{type:"date"})),fld("Equipo",sel([["Semana","Semana"],["Finde","Finde"]],o.equipo,v=>o.equipo=v))]),
    el("div",{class:"row"},[fld("Turno",sel([["","—"]].concat(TURNOS_S.concat(TURNOS_F).map(t=>[t,t])),o.turno,v=>o.turno=v)),fld("Prioridad",sel([["normal","Normal"],["alta","Urgente"]],o.prioridad,v=>o.prioridad=v))]),
    fld("Quién lo hace",ch),el("label",{style:"display:flex;gap:8px;align-items:center;margin:0 0 10px"},[el("input",{type:"checkbox",checked:o.todo_equipo,onchange:e=>o.todo_equipo=e.target.checked}),"Lo ve todo el equipo"])]);
  const bot=[{t:"Cancelar",cls:"sec"}];
  if(o.id&&esAdm())bot.push({t:"Borrar",cls:"bad",fn:async()=>{if(!confirm("¿Borrar este trabajo?"))return false;await rpc("ot_borrar",{p_tok:S.tok,p_ot:o.id});toast("Borrada");re();}});
  bot.push({t:"Guardar",fn:async()=>{const p={id:o.id||null,habitual_id:o.habitual_id||null,titulo:o.titulo,lugar:o.lugar,minutos_est:o.minutos_est||null,descripcion:o.descripcion,tipo:o.tipo,fecha:o.fecha,equipo:o.equipo,turno:o.turno,prioridad:o.prioridad,asignados:ch.val(),todo_equipo:o.todo_equipo};
    if(!p.asignados.length&&!p.todo_equipo){toast("Elige quién lo hace");return false;}if(!o.id&&esProblema(p.titulo,p.descripcion)&&!(p.lugar||"").trim()){toast(MSG_LUG);return false;}await rpc("ot_guardar",{p_tok:S.tok,p});toast("Guardada");re();}});
  cerrarF=dlg(o.id?(sinAsignar(o)?"Asignar trabajo":"Editar trabajo"):"Nuevo trabajo",cuerpo,bot);}
/* ---------- horas del día y del mes (solo administrador) ---------- */
const HM=t=>{const p=String(t).split(":");return +p[0]*60+ +(p[1]||0);};
const horasTramos=tr=>(tr||[]).reduce((t,r)=>t+(HM(r[1])-HM(r[0]))/60,0);
const FALTAS_H=[["","Ninguna"],["baja","Baja"],["vacaciones","Vacaciones"],["permiso","Permiso"],["otro","Otra falta"]];
const numH=s=>{const n=parseFloat(String(s==null?"":s).replace(",","."));return isFinite(n)?n:null;};
/* Una fila por persona: lo guardado, o su horario normal si no hay nada guardado */
async function formHorasDia(f,re){let L,FE;try{[L,FE]=await Promise.all([rpc("horas_dia_leer",{p_tok:S.tok,p_fecha:f}),rpc("festivos_listar",{p_tok:S.tok})]);}catch(e){toast(e.message);return;}
  try{const EXT=new Set((await trabajadores()).filter(w=>w.jornada==="externo").map(w=>w.id));L=L.filter(x=>!EXT.has(x.id));}catch(e){}
  const esFes=FE.some(x=>x.fecha===f);
  const filas=L.map(x=>{const hor=x.horario||[];const def=esFes?0:horasTramos(hor);
    return{id:x.id,nombre:x.nombre,hor:hor.length?horTxt(hor):"Libra",cambio:x.trabajadas!=null,
      tra:String(x.trabajadas!=null?x.trabajadas:def),fu:String(x.fuera||0),fa:x.falta||"",em:x.extra_mano!=null?String(x.extra_mano):"",bc:"",nota:x.nota||""};});
  const fila=r=>el("div",{class:"ot"},[el("div",{class:"t",text:r.nombre}),el("div",{class:"d",text:"Horario: "+r.hor}),
    el("div",{class:"row"},[fld("Horas trabajadas",inp(r.tra,v=>{r.tra=v;r.cambio=true;},{inputmode:"decimal"})),fld("De ellas, fuera de presupuesto",inp(r.fu,v=>r.fu=v,{inputmode:"decimal"}))]),
    fld("Extra a mano (opcional)",inp(r.em,v=>r.em=v,{inputmode:"decimal"})),
    fld("Motivo de las horas fuera de presupuesto o extra (para tu jefa). Obligatorio si pones horas",inp(r.nota,v=>r.nota=v)),
    fld("Falta (si no ha venido)",sel(FALTAS_H,r.fa,v=>r.fa=v))]);
  const cuerpo=el("div",null,[el("p",{class:"hint",text:(esFes?"Es festivo: lo que pase de sus horas normales cuenta como extra festivo. ":"")+"«Extra a mano»: horas que se pagan como extra. Lo que pase de 35 h a la semana va a la bolsa sola, y un día libre sin baja ni vacaciones resta de la bolsa. "+"Aparecen sus horas de horario (en festivo, 0 h). Cambia solo a quien haya trabajado distinto. Lo trabajado en festivo cuenta como extra. «Fuera de presupuesto» son horas de ese día que no paga el servicio."}),...filas.map(fila)]);
  dlg("Horas del día · "+fLarga(f),cuerpo,[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const items=[];
    for(const r of filas){let tra=numH(r.tra);const fu=numH(r.fu)||0;const fa=r.fa||null;
      if(fa&&tra==null)tra=0;
      if((tra!=null&&(tra<0||tra>24))||fu<0||fu>24){toast("Revisa las horas de "+r.nombre);return false;}
      if(tra!=null&&fu>tra){toast("Lo de fuera de presupuesto no puede ser más que lo trabajado ("+r.nombre+")");return false;}
      if((fu>0||(numH(r.em)||0)>0)&&!(r.nota||"").trim()){toast("Escribe el motivo de las horas fuera de presupuesto o extra ("+r.nombre+")");return false;}
      items.push({id:r.id,trabajadas:(r.cambio||fa)?tra:null,fuera:fu,falta:fa,nota:null,extra_mano:numH(r.em),banco:null,nota:(r.nota||"").trim()||null});}
    try{await rpc("horas_dia_guardar",{p_tok:S.tok,p_fecha:f,p_items:items});}catch(e){toast(e.message);return false;}
    toast("Guardado");re();}}]);}
const csvCel=v=>{const s=v==null?"":String(v);return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
const dec=n=>(Math.round(n*100)/100).toString().replace(".",",");
/* Detalle para justificar: cada día con horas fuera de presupuesto o extra a mano, con el motivo y los trabajos hechos ese día */
async function horasDetalleCSV(mes){const[y,m]=mes.slice(0,7).split("-").map(Number);const ym=y+"-"+String(m).padStart(2,"0");
  const nd=new Date(y,m,0).getDate();const ini=ym+"-01",fin=ym+"-"+String(nd).padStart(2,"0");const lim=fin<hoyISO()?fin:hoyISO();
  let W,R,O;try{[W,R,O]=await Promise.all([trabajadores(true),rpc("horas_rango",{p_tok:S.tok,p_desde:ini,p_hasta:lim}),rpc("ots_rango",{p_tok:S.tok,p_desde:ini,p_hasta:lim})]);}catch(e){toast(e.message);return;}
  const RH={};R.forEach(x=>RH[x.trabajador+"|"+x.fecha]=x);
  const TR={};O.filter(o=>o.estado==="hecha"&&o.hecho_por_n).forEach(o=>{const k=o.fecha+"|"+o.hecho_por_n;(TR[k]=TR[k]||[]).push(o.titulo+(o.minutos!=null?" ("+durTxt(o.minutos)+")":""));});
  const filas=[["Fecha","Nombre","Jornada","Horas trabajadas","Fuera de presupuesto (h)","Extra a mano (h)","Motivo","Trabajos hechos ese día"]];
  for(let f=ini;f<=lim;f=(()=>{const d=new Date(f+"T12:00:00");d.setDate(d.getDate()+1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");})()){
    W.filter(w=>w.activo&&w.rol!=="admin"&&w.jornada!=="externo").forEach(w=>{const x=RH[w.id+"|"+f];if(!x)return;
      const fu=+x.fuera||0,em=+x.extra_mano||0;if(!fu&&!em)return;
      const def=horasTramos((w.horario||{})[diaClave(f)]||[]);const h=x.falta?0:(x.trabajadas!=null?+x.trabajadas:def);
      filas.push([f,w.nombre,w.jornada==="parcial"?"Parcial":w.jornada==="completa"?"Completa":"Sin poner",dec(h),dec(fu),dec(em),x.nota||"",(TR[f+"|"+w.nombre]||[]).join(" · ")]);});}
  const txt="﻿"+filas.map(r=>r.map(csvCel).join(";")).join("\r\n");
  const a=el("a",{href:URL.createObjectURL(new Blob([txt],{type:"text/csv;charset=utf-8"})),download:"horas_detalle_"+ym+".csv"});
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);}
/* Excel mensual. Jornada completa: bolsa de horas. Cada semana (lunes a domingo) se compara lo trabajado, menos lo pagado como extra a mano,
   con sus 35 h (menos las bajas y vacaciones de ese periodo). Lo que sobra va a la bolsa y lo que falta resta. Saldo inicial 0 el 5/10/2026.
   Una semana se cuenta en el mes de su domingo. Jornada parcial: de momento sin bolsa ni extras. */
const BOLSA_DESDE="2026-10-01";/* desde aquí se cuentan las horas extra */
const BOLSA_INICIO="2026-10-05";/* la bolsa empieza el lunes con saldo 0; la semana de transición no resta */
async function horasMesExcel(mes){const[y,m]=mes.slice(0,7).split("-").map(Number);const ym=y+"-"+String(m).padStart(2,"0");
  const nd=new Date(y,m,0).getDate();const ini=ym+"-01",fin=ym+"-"+String(nd).padStart(2,"0");
  let W,R,FE;try{[W,R,FE]=await Promise.all([trabajadores(true),rpc("horas_rango",{p_tok:S.tok,p_desde:ini<BOLSA_DESDE?ini:BOLSA_DESDE,p_hasta:fin}),rpc("festivos_listar",{p_tok:S.tok})]);}catch(e){toast(e.message);return;}
  const FES=new Set(FE.map(x=>x.fecha));const RH={};R.forEach(x=>RH[x.trabajador+"|"+x.fecha]=x);
  const addDia=(f,n)=>{const d=new Date(f+"T12:00:00");d.setDate(d.getDate()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
  const dd=(w,f)=>{const x=RH[w.id+"|"+f];const esF=FES.has(f);const def=esF?0:horasTramos((w.horario||{})[diaClave(f)]||[]);const fa=x?x.falta:null;
    const h=fa?0:(x&&x.trabajadas!=null?+x.trabajadas:def);const em=x&&x.extra_mano!=null?Math.min(h,+x.extra_mano):0;
    return{x,esF,def,esp:horasTramos((w.horario||{})[diaClave(f)]||[]),fa,h,em,fu:x?(+x.fuera||0):0,dow:new Date(f+"T12:00:00").getDay()};};
  const lim=fin<hoyISO()?fin:hoyISO();/* solo días ya pasados: no se cuentan los que faltan por llegar */
  const diasDesde=[];for(let f=BOLSA_DESDE;f<=lim;f=addDia(f,1))diasDesde.push(f);
  const filas=[["Nombre","Jornada","Horas de contrato","Horas trabajadas","Horas normales","Extra a mano entre semana","Extra a mano sábado","Extra a mano festivo y domingo","Fuera de presupuesto (h)","Bolsa al inicio del mes (h)","Variación de la bolsa (h)","Bolsa al final del mes (h)","Días de baja","Días de vacaciones","Días de permiso","Días de otra falta"]];
  W.filter(w=>w.activo&&w.rol!=="admin"&&w.jornada!=="externo").sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).forEach(w=>{
    const thr=w.horas_contrato!=null&&w.horas_contrato!==""?+w.horas_contrato:null;
    if(w.jornada!=="completa"){let Wp=0,fu=0,bj=0,vc=0,pm=0,ot=0;
      for(let f=ini;f<=lim;f=addDia(f,1)){const d=dd(w,f);Wp+=d.h;fu+=d.fu;if(d.fa==="baja")bj++;else if(d.fa==="vacaciones")vc++;else if(d.fa==="permiso")pm++;else if(d.fa==="otro")ot++;}
      filas.push([w.nombre,"Parcial",thr==null?"":thr,dec(Wp),dec(Wp),"—","—","—",dec(fu),"—","—","—",bj,vc,pm,ot]);return;}
    const c=thr==null?35:thr;let bolsa=0;const M={W:0,nor:0,ew:0,sa:0,fes:0,fu:0,dl:0,ini:null,bj:0,vc:0,pm:0,ot:0};let wk=null;
    const cierra=f=>{const cap=c*wk.n/7-wk.exc;const neto=wk.W-wk.paid;const dl=wk.ini<BOLSA_INICIO?0:neto-cap;const antes=bolsa;bolsa+=dl;
      if(f.slice(0,7)===ym){M.W+=wk.W;M.nor+=Math.min(neto,cap);M.ew+=wk.ew;M.sa+=wk.sa;M.fes+=wk.fes;M.fu+=wk.fu;M.dl+=dl;M.bj+=wk.b;M.vc+=wk.v;M.pm+=wk.p;M.ot+=wk.o;if(M.ini===null)M.ini=antes;}
      wk=null;};
    diasDesde.forEach(f=>{const d=dd(w,f);
      if(!wk)wk={ini:f,W:0,n:0,paid:0,exc:0,ew:0,sa:0,fes:0,fu:0,b:0,v:0,p:0,o:0};wk.n++;
      if(d.fa==="baja"||d.fa==="vacaciones"||(d.esF&&d.h===0))wk.exc+=d.esp;/* bajas, vacaciones y festivo sin trabajar no restan */
      if(d.fa==="baja")wk.b++;else if(d.fa==="vacaciones")wk.v++;else if(d.fa==="permiso")wk.p++;else if(d.fa==="otro")wk.o++;
      wk.W+=d.h;wk.paid+=d.em;wk.fu+=d.fu;
      if(d.em>0){if(d.esF||d.dow===0)wk.fes+=d.em;else if(d.dow===6)wk.sa+=d.em;else wk.ew+=d.em;}
      if(d.dow===0)cierra(f);});
    filas.push([w.nombre,"Completa",c,dec(M.W),dec(M.nor),dec(M.ew),dec(M.sa),dec(M.fes),dec(M.fu),dec(M.ini==null?bolsa:M.ini),dec(M.dl),dec(bolsa),M.bj,M.vc,M.pm,M.ot]);});
  const txt="﻿"+filas.map(r=>r.map(csvCel).join(";")).join("\r\n");
  const a=el("a",{href:URL.createObjectURL(new Blob([txt],{type:"text/csv;charset=utf-8"})),download:"horas_"+ym+".csv"});
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);}

async function vTareas(v){const box=el("div",null,el("div",{class:"empty",text:"Cargando…"}));v.appendChild(el("details",{class:"ayuda",style:"margin:0 0 12px"},[el("summary",{style:"cursor:pointer;font-weight:600;color:var(--acc);padding:6px 0",text:"¿Qué es una tarea fija y una habitual?"}),el("p",{class:"hint",text:"Tareas fijas: se convierten solas en trabajos cada día que les toca («Todos» = de lunes a viernes en Semana, sábado y domingo en Finde). Tareas habituales: no tienen día; salen como botón al abrir una OT."})]));
  v.appendChild(el("div",{class:"row",style:"margin:0 0 12px"},[el("button",{class:"btn",text:"＋ Nueva tarea fija",onclick:()=>formTarea({},()=>pinta())}),el("button",{class:"btn sec",text:"＋ Nueva tarea habitual",onclick:()=>formHabitual({},()=>pinta())})]));v.appendChild(box);
  v.insertBefore(await bloqueElementos(()=>pinta()),box);
  try{const [T,H]=await Promise.all([rpc("tareas",{p_tok:S.tok}),habituales(true),zonasL(true)]);box.textContent="";box.appendChild(zonasCard());
    box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Tareas habituales ("+H.length+")"}),el("span",{class:"der sub",text:"sin día fijo"})]),H.length?H.map(h=>el("div",{class:"ot",style:"cursor:pointer",onclick:()=>formHabitual(h,()=>pinta())},[el("div",{class:"t",text:h.titulo+(h.grupo==="hornos"?" · Hornos":"")+(h.activo?"":" (no activa)")}),h.descripcion?el("div",{class:"d",text:h.descripcion}):null,
      el("div",{class:"meta"},[h.minutos_est?el("span",{class:"pill info",text:durTxt(h.minutos_est)}):el("span",{class:"pill warn",text:"Sin tiempo estimado"}),h.lugar?el("span",{text:h.lugar}):null,el("span",{text:h.veces?"Hecha "+h.veces+" "+(h.veces>1?"veces":"vez")+" en 3 meses":"Aún no se ha usado"})])])):el("div",{class:"empty",text:"Pon aquí las tareas que se hacen a menudo pero sin día fijo (vaciar un contenedor, limpiar un derrame…). Salen como botón al abrir una OT y llevan su tiempo."})]));["Semana","Finde"].forEach(eq=>{const X=T.filter(t=>t.equipo===eq);
    box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:eq+" ("+X.length+")"})),X.length?X.map(t=>el("div",{class:"ot",style:"cursor:pointer",onclick:()=>formTarea(t,()=>pinta())},[el("div",{class:"t",text:t.titulo+(t.activo?"":" (pausada)")}),t.descripcion?el("div",{class:"d",text:t.descripcion}):null,
      el("div",{class:"meta"},[t.minutos_est?el("span",{class:"pill info",text:durTxt(t.minutos_est)}):el("span",{class:"pill warn",text:"Sin tiempo estimado"}),el("span",{text:(t.dias.includes("todos")?"Todos":t.dias.map(d=>(DIAS.find(x=>x[0]===d)||[d,d])[0].slice(0,3)).join(", "))}),t.turno?el("span",{text:"Turno: "+t.turno}):null,el("span",{text:(t.todo_equipo?"Todo el equipo":(t.nombres||[]).join(", ")||"—")})])])):el("div",{class:"empty",text:"Ninguna"})]));});}
  catch(e){box.textContent=e.message;}}
async function formTarea(t0,re){const L=await trabajadores();const t=Object.assign({dias:["todos"],equipo:"Semana",activo:true,asignados:[],todo_equipo:false},JSON.parse(JSON.stringify(t0)));const ch=chipsTrab(L,t.asignados,true);
  const dbox=el("div",{class:"chips"});const pd=()=>{dbox.textContent="";[["todos","Todos"]].concat(DIAS.map(d=>[d[0],d[0].slice(0,3)])).forEach(([k,txt])=>dbox.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(t.dias.includes(k)),text:txt,onclick:()=>{if(k==="todos")t.dias=["todos"];else{t.dias=t.dias.filter(x=>x!=="todos");t.dias=t.dias.includes(k)?t.dias.filter(x=>x!==k):t.dias.concat([k]);if(!t.dias.length)t.dias=["todos"];}pd();}})));};pd();
  const bot=[{t:"Cancelar",cls:"sec"}];
  if(t.id)bot.push({t:"Borrar",cls:"bad",fn:async()=>{if(!confirm("¿Borrar esta tarea fija? Los trabajos ya hechos se conservan."))return false;await rpc("tarea_borrar",{p_tok:S.tok,p_id:t.id});toast("Borrada");re();}});
  bot.push({t:"Guardar",fn:async()=>{const p={id:t.id||null,titulo:t.titulo,minutos_est:t.minutos_est||null,tipo:t.tipo,descripcion:t.descripcion,activo:t.activo,dias:t.dias,equipo:t.equipo,turno:t.turno,asignados:ch.val(),todo_equipo:t.todo_equipo};
    if(!p.asignados.length&&!p.todo_equipo){toast("Elige quién la hace");return false;}await rpc("tarea_guardar",{p_tok:S.tok,p});toast("Guardada");re();}});
  dlg(t.id?"Editar tarea fija":"Nueva tarea fija",el("div",null,[fld("Título",inp(t.titulo,v=>t.titulo=v)),fld("Tiempo que lleva hacerla",campoTiempo(t.minutos_est,v=>t.minutos_est=v)),fld("Descripción",area(t.descripcion,v=>t.descripcion=v)),fld("Días",dbox),
    el("div",{class:"row"},[fld("Equipo",sel([["Semana","Semana"],["Finde","Finde"]],t.equipo,v=>t.equipo=v)),fld("Turno",sel([["","—"]].concat(TURNOS_S.concat(TURNOS_F).map(x=>[x,x])),t.turno,v=>t.turno=v))]),
    fld("Quién la hace",ch),el("label",{style:"display:flex;gap:8px;align-items:center;margin:0 0 8px"},[el("input",{type:"checkbox",checked:t.todo_equipo,onchange:e=>t.todo_equipo=e.target.checked}),"Todo el equipo"]),
    el("label",{style:"display:flex;gap:8px;align-items:center"},[el("input",{type:"checkbox",checked:t.activo,onchange:e=>t.activo=e.target.checked}),"Activa (si la quitas, se pausa)"])]),bot);}
function formFestivo(re){let f="",n="";
  dlg("Añadir festivo",el("div",null,[fld("Día",el("input",{type:"date",oninput:e=>f=e.target.value,onchange:e=>f=e.target.value})),fld("Nombre (por ejemplo, Fiesta local)",inp("",v=>n=v))]),
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{try{await rpc("festivo_guardar",{p_tok:S.tok,p_fecha:f,p_nombre:n});}catch(e){toast(e.message);return false;}toast("Guardado");re();}}]);}
async function vEquipo(v){const box=el("div",null,el("div",{class:"empty",text:"Cargando…"}));v.appendChild(el("div",{class:"row",style:"margin:0 0 12px"},[el("button",{class:"btn",text:"＋ Alguien falta",onclick:()=>formSust({},()=>pinta())}),el("button",{class:"btn sec",text:"＋ Nuevo compañero",onclick:()=>formTrab({},()=>pinta())})]));v.appendChild(box);
  try{const [L,SU,FE]=await Promise.all([trabajadores(true),rpc("sust_lista",{p_tok:S.tok}),rpc("festivos_listar",{p_tok:S.tok})]);box.textContent="";const hoy=hoyISO();
    const act=SU.filter(x=>x.hasta>=hoy&&x.motivo!=="Horas extra");
    box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Faltas y sustituciones ("+act.length+")"})),act.length?act.map(x=>el("div",{class:"ot",style:"cursor:pointer",onclick:()=>formSust(x,()=>pinta())},[el("div",{class:"t",text:x.ausente_n+" · "+(x.motivo||"Falta")}),
      el("div",{class:"meta"},[el("span",{text:(x.desde===x.hasta?fCorta(x.desde):fCorta(x.desde)+" → "+fCorta(x.hasta))}),x.desde<=hoy?el("span",{class:"pill warn",text:"Falta hoy"}):el("span",{class:"pill",text:"Próximamente"}),
        el("span",{class:"pill "+(x.sustituto?"ok":"bad"),text:x.sustituto?"Lo cubre "+x.sustituto_n:"Sin cubrir"}),x.nota?el("span",{text:"Nota: "+x.nota}):null])])):el("div",{class:"empty",text:"Nadie falta. Si alguien está de baja o de vacaciones, pulsa «＋ Alguien falta» y elige quién le cubre."})]));
    const festC=el("details",{class:"card"},[el("summary",{class:"hd",style:"cursor:pointer"},[el("h2",{text:"Festivos ("+FE.filter(x=>x.fecha>=hoy).length+" por venir)"}),el("span",{class:"mas",text:"▾"})]),FE.length?FE.map(x=>el("div",{class:"linea"},[el("span",{style:"flex:1",text:fCorta(x.fecha)+" · "+x.nombre}),el("button",{class:"btn sec peq",text:"Quitar",onclick:()=>confirma("¿Quitar este festivo?",fCorta(x.fecha)+" · "+x.nombre+". Ese día se volverán a generar los trabajos de las tareas fijas.","Quitar",async()=>{try{await rpc("festivo_quitar",{p_tok:S.tok,p_fecha:x.fecha});toast("Quitado");pinta();}catch(e){toast(e.message);return false;}})})])):el("div",{class:"empty",text:"No hay festivos marcados. En un festivo no se generan trabajos de tareas fijas."}),el("button",{class:"btn sec",text:"＋ Añadir festivo",onclick:()=>formFestivo(()=>pinta())})]);
    const repC=cardReparto(L);
    const faltaHoy=new Set(SU.filter(x=>x.desde<=hoy&&x.hasta>=hoy&&x.motivo!=="Horas extra").map(x=>x.ausente));box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Compañeros"})),L.map(w=>el("div",{class:"ot",style:"cursor:pointer",onclick:()=>formTrab(w,()=>pinta())},[el("div",{class:"t",text:w.nombre+(w.rol==="admin"?" · administrador":"")+(w.activo?"":" (ya no trabaja)")}),
    el("div",{class:"meta"},[faltaHoy.has(w.id)?el("span",{class:"pill warn",text:"Falta hoy"}):null,el("span",{text:w.equipos.join(" y ")}),w.turno_semana?el("span",{text:"Turno: "+w.turno_semana}):null,w.turno_finde?el("span",{text:w.turno_finde}):null,el("span",{class:"pill "+(w.tiene_pin?"ok":"warn"),text:w.tiene_pin?"Ya ha entrado":"Aún no ha entrado"}),w.activo?el("span",{class:"pill "+(w.avisos?"ok":""),text:w.avisos?"Avisos":"Sin avisos"}):null,w.telefono?el("span",{text:w.telefono}):null,w.activo&&w.rol!=="admin"?el("span",{class:Object.keys(w.horario||{}).length?"":"pill warn",text:Object.keys(w.horario||{}).length?""+horSemana(w.horario):"Sin horario"}):null])]))]));
    box.appendChild(repC);box.appendChild(festC);}
  catch(e){box.textContent=e.message;}}
/* Reparto automático: quién puede hacer hornos y qué ha hecho la app */
function cardReparto(L){const card=el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Reparto automático"})),el("div",{class:"empty",text:"Cargando…"})]);
  rpc("auto_estado",{p_tok:S.tok}).then(E=>{card.lastChild.remove();const H=new Set(E.hornos);
    const ch=el("div",{class:"chips"});L.filter(w=>w.activo&&w.rol!=="admin").forEach(w=>ch.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(H.has(w.id)),text:w.nombre,onclick:async e=>{const si=!H.has(w.id);
      try{await rpc("auto_habilidad",{p_tok:S.tok,p_trab:w.id,p_hab:"hornos",p_si:si});if(si)H.add(w.id);else H.delete(w.id);e.target.setAttribute("aria-pressed",String(si));toast(si?w.nombre.split(" ")[0]+" ya puede recibir trabajos de hornos":"Quitado");}catch(er){toast(er.message);}}})));
    const fecha=f=>f===hoyISO()?"hoy":fCorta(f);
    card.appendChild(el("div",{class:"bd"},[
      el("p",{class:"hint",style:"margin-top:0",text:"Si alguien libra, falta sin sustituto o está de vacaciones, la app pasa sus trabajos de hoy y de mañana a un compañero del mismo equipo que trabaje ese día y tenga menos carga. Si vuelve, se los devuelve. Te avisa al móvil cada vez."}),
      el("b",{text:"Pueden hacer trabajos de hornos"}),el("p",{class:"hint",style:"margin:2px 0 6px",text:"Los trabajos de hornos y escoria solo se pasan a estas personas."}),ch,
      E.sin_nadie.length?el("div",{class:"aviso",style:"margin:12px 0 0"},["Sin nadie disponible",el("small",{text:E.sin_nadie.map(x=>x.titulo+" ("+fecha(x.fecha)+")").join(" · ")+". Asígnalos tú o marca a más gente para hornos."})]):null,
      el("h4",{text:"Lo que ha repartido la app (últimos 7 días)"}),
      E.ultimos.length?el("div",null,E.ultimos.map(x=>el("div",{class:"linea",style:"cursor:default"},[el("span",{style:"flex:1",text:x.titulo+" · "+fecha(x.fecha)}),el("small",{class:"hint",style:"margin:0",text:x.detalle.replace("Automático: ","→ ")})]))):el("p",{class:"hint",text:"Todavía no ha tenido que repartir nada."})]));}).catch(e=>{card.lastChild.textContent=e.message;});
  return card;}
async function codigoAlta(w){dlg(w.tiene_pin?"¿Darle un código nuevo a "+w.nombre+"?":"Código de alta de "+w.nombre,el("p",{class:"hint",text:w.tiene_pin?"Su PIN actual deja de valer y se cierra su sesión. Entrará con el código y pondrá un PIN nuevo.":"Se genera un código de 6 números que vale 7 días y una sola vez."}),[{t:"Cancelar",cls:"sec"},{t:"Generar",fn:async()=>{
  try{const r=await rpc("trabajador_codigo_alta",{p_tok:S.tok,p_trab:w.id});w.tiene_pin=false;TRAB=null;
    dlg("Código de alta",el("div",null,[el("p",{class:"hint",text:"Dáselo a "+r.nombre+" en persona o por mensaje privado. Vale hasta el "+fCorta(String(r.hasta).slice(0,10))+" y una sola vez."}),el("div",{style:"font-size:40px;font-weight:700;letter-spacing:.2em;text-align:center;font-variant-numeric:tabular-nums;margin:10px 0",text:r.codigo}),el("p",{class:"hint",text:"Al entrar en la app toca su nombre, escribe este código y luego inventa su PIN."})]),[{t:"Hecho"}]);}
  catch(e){toast(e.message);}}}]);}
async function formTrab(w0,re){const w=Object.assign({equipos:["Semana"],rol:"operario",activo:true},JSON.parse(JSON.stringify(w0)));let reset=false;const ed=editorHorario(w.horario);
  /* responsable de hornos: a qué operarios de hornos puede asignar OT (solo admin) */
  const TODOS=await trabajadores().catch(()=>[]);const RL=await rpc("resp_hornos_admin",{p_tok:S.tok}).catch(()=>[]);
  let opsR=new Set((RL||[]).filter(x=>w.id&&x.resp===w.id).map(x=>x.operario));
  const rchips=el("div",{class:"chips"});const pr=()=>{rchips.textContent="";TODOS.filter(x=>x.activo&&x.rol==="operario"&&x.id!==w.id).forEach(x=>rchips.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(opsR.has(x.id)),text:x.nombre,onclick:()=>{opsR.has(x.id)?opsR.delete(x.id):opsR.add(x.id);pr();}})));};pr();
  const nvb=el("div",{class:"chips"});const pn=()=>{nvb.textContent="";["Nave 1","Nave 2"].forEach(k=>nvb.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String((w.naves||[]).includes(k)),text:k,onclick:()=>{w.naves=(w.naves||[]).includes(k)?w.naves.filter(x=>x!==k):(w.naves||[]).concat([k]);pn();}})));};pn();
  const eqb=el("div",{class:"chips"});const pe=()=>{eqb.textContent="";["Semana","Finde"].forEach(k=>eqb.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(w.equipos.includes(k)),text:k,onclick:()=>{w.equipos=w.equipos.includes(k)?w.equipos.filter(x=>x!==k):w.equipos.concat([k]);if(!w.equipos.length)w.equipos=[k];pe();}})));};pe();
  dlg(w.id?w.nombre:"Nuevo compañero",el("div",null,[fld("Nombre",inp(w.nombre,v=>w.nombre=v)),fld("Teléfono (para WhatsApp)",inp(w.telefono,v=>w.telefono=v,{type:"tel",inputmode:"tel",placeholder:"612 345 678"})),fld("Correo electrónico",inp(w.email,v=>w.email=v,{type:"email",inputmode:"email",autocomplete:"off"})),
    el("div",{class:"row"},[fld("Categoría",inp(w.categoria,v=>w.categoria=v)),fld("Jornada",sel([["","—"],["completa","Completa"],["parcial","Parcial"],["externo","De otra empresa (no cuenta horas)"]],w.jornada||"",v=>w.jornada=v))]),
    fld("Horas de contrato a la semana",inp(w.horas_contrato,v=>w.horas_contrato=v,{type:"number",inputmode:"decimal",min:"0",max:"60"})),
    fld("Notas (solo las ves tú)",area(w.notas||"",v=>w.notas=v)),fld("Equipos",eqb),fld("Naves donde trabaja (para las OT de relevo)",nvb),fld("Responsable de hornos: a qué operarios puede asignar OT de hornos (vacío = no es responsable)",rchips),
    el("div",{class:"row"},[fld("Turno entre semana",sel([["","—"]].concat(TURNOS_S.map(x=>[x,x])),w.turno_semana,v=>w.turno_semana=v)),fld("Turno finde",sel([["","—"]].concat(TURNOS_F.map(x=>[x,x])),w.turno_finde,v=>w.turno_finde=v))]),
    fld("Horario de cada día",ed),
    fld("Papel",sel([["operario","Operario"],["admin","Administrador"]],w.rol,v=>w.rol=v)),
    el("label",{style:"display:flex;gap:8px;align-items:center;margin:0 0 8px"},[el("input",{type:"checkbox",checked:w.activo,onchange:e=>w.activo=e.target.checked}),"En activo"]),
    w.id?el("div",{style:"display:flex;flex-direction:column;gap:6px;margin:4px 0 0"},[el("button",{type:"button",class:"btn sec",text:w.tiene_pin?"Ha olvidado el PIN: darle un código nuevo":"Darle el código de alta",onclick:()=>codigoAlta(w)}),
      el("p",{class:"hint",style:"margin:0",text:w.tiene_pin?"El PIN actual deja de valer y tendrá que entrar con el código.":"Sin el código nadie puede entrar con su nombre. Vale 7 días y una sola vez."})]):el("p",{class:"hint",text:"Al guardarlo, vuelve a abrir su ficha y dale el código de alta."})]),
   [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{await rpc("trabajador_guardar",{p_tok:S.tok,p:{id:w.id||null,nombre:w.nombre,equipos:w.equipos,naves:w.naves||[],turno_semana:w.turno_semana,turno_finde:w.turno_finde,rol:w.rol,activo:w.activo,telefono:w.telefono||null,horario:ed.val(),reset_pin:reset,categoria:w.categoria||null,jornada:w.jornada||null,horas_contrato:w.horas_contrato||null,email:w.email||null,notas:w.notas||null}});toast("Guardado");TRAB=null;if(!w.id){const nu=(await trabajadores(true).catch(()=>[])).find(x=>x.nombre===w.nombre);if(nu)w.id=nu.id;}if(w.id)await rpc("resp_hornos_guardar",{p_tok:S.tok,p_resp:w.id,p_operarios:[...opsR]}).catch(e=>toast(e.message));re();}}]);}
async function vAvisos(v){const box=el("div",null,el("div",{class:"empty",text:"Cargando…"}));v.appendChild(el("button",{class:"btn",style:"width:100%;margin:0 0 12px",text:"＋ Nuevo aviso",onclick:()=>formAviso({},()=>pinta())}));v.appendChild(box);
  try{const A=await rpc("avisos_todos",{p_tok:S.tok});box.textContent="";box.appendChild(el("div",{class:"card"},A.length?A.map(a=>el("div",{class:"ot",style:"cursor:pointer",onclick:()=>formAviso(a,()=>pinta())},[el("div",{class:"t",text:a.titulo}),a.descripcion?el("div",{class:"d",text:a.descripcion}):null,el("div",{class:"meta"},[el("span",{text:fCorta(a.fecha)}),el("span",{class:"pill "+(a.activo?"ok":""),text:a.activo?"Visible":"Oculto"})])])):el("div",{class:"empty",text:"Sin avisos. Los avisos salen arriba en la pantalla de todos."})));}catch(e){box.textContent=e.message;}}
function formAviso(a0,re){const a=Object.assign({fecha:hoyISO(),activo:true},a0);const bot=[{t:"Cancelar",cls:"sec"}];
  if(a.id)bot.push({t:"Borrar",cls:"bad",fn:async()=>{await rpc("aviso_borrar",{p_tok:S.tok,p_id:a.id});re();}});
  bot.push({t:"Guardar",fn:async()=>{await rpc("aviso_guardar",{p_tok:S.tok,p:{id:a.id||null,titulo:a.titulo,descripcion:a.descripcion,fecha:a.fecha,activo:a.activo}});toast("Guardado");re();}});
  dlg(a.id?"Editar aviso":"Nuevo aviso",el("div",null,[fld("Título",inp(a.titulo,v=>a.titulo=v)),fld("Texto",area(a.descripcion,v=>a.descripcion=v)),fld("Hasta el día",inp(a.fecha,v=>a.fecha=v,{type:"date"})),
    el("label",{style:"display:flex;gap:8px;align-items:center"},[el("input",{type:"checkbox",checked:a.activo,onchange:e=>a.activo=e.target.checked}),"Visible"])]),bot);}
async function vResumen(v){S.rs=S.rs||7;const des=sumaD(hoyISO(),-(S.rs-1)),has=hoyISO();v.appendChild(bloqueInforme());
  v.appendChild(el("div",{class:"chips",style:"margin:0 0 12px"},[[7,"7 días"],[30,"30 días"]].map(([k,t])=>el("button",{class:"chip","aria-pressed":String(S.rs===k),text:t,onclick:()=>{S.rs=k;pinta();}}))));
  const box=el("div",null,el("div",{class:"empty",text:"Cargando…"}));v.appendChild(box);v.appendChild(bloqueCopia());
  try{const [O,X]=await Promise.all([rpc("ots_rango",{p_tok:S.tok,p_desde:des,p_hasta:has}),Promise.resolve(null)]);box.textContent="";
    const P={};O.forEach(o=>{const ns=(o.estado==="hecha"||o.estado==="no_hecha")&&o.hecho_por_n?[o.hecho_por_n]:o.todo_equipo?["Equipo "+(o.equipo||"")]:(o.nombres&&o.nombres.length?o.nombres.map(n=>{const c=(o.cubre||[]).find(x=>x.ausente===n&&x.sustituto);return c?c.sustituto:n;}):["Sin asignar"]);ns.forEach(n=>{const p=P[n]=P[n]||{t:0,h:0,no:0,mal:0,min:0,nm:0};p.t++;if(o.estado==="hecha"){p.h++;if(o.minutos!=null){p.min+=o.minutos;if(!o.tiempo_auto)p.nm++;}}if(o.estado==="no_hecha")p.no++;if(o.resultado==="NO-OK")p.mal++;});});
    const tot=O.length,hech=O.filter(o=>o.estado==="hecha").length;
    box.appendChild(el("div",{class:"kpis"},[["Trabajos",tot],["Hechos",hech],["% hecho",tot?Math.round(hech*100/tot)+"%":"—"],["Checklist NO-OK",O.filter(o=>o.resultado==="NO-OK").length]].map(([a,b])=>el("div",null,[el("b",{text:String(b)}),el("small",{text:a})]))));
    box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Por persona"})),el("table",null,[el("thead",null,el("tr",null,["Persona","Hechos","No hechos","NO-OK","Tiempo medio",""].map(h=>el("th",{text:h})))),
      el("tbody",null,Object.keys(P).sort().map(n=>{const p=P[n];return el("tr",null,[el("td",{text:n}),el("td",{text:p.h+"/"+p.t}),el("td",{text:String(p.no)}),el("td",{text:String(p.mal)}),el("td",{text:p.nm?durTxt(p.min/p.nm):"—"}),el("td",{style:"width:22%"},el("div",{class:"bar"},el("i",{style:"width:"+(p.t?Math.round(p.h*100/p.t):0)+"%"})))]);}))])]));
    box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Horas del mes"})),el("p",{class:"hint",text:"Horas normales, extras (entre semana, sábado y domingo) y fuera de presupuesto de cada persona. Se descarga un archivo para abrir con Excel."}),el("button",{class:"btn",text:"Descargar horas del mes",onclick:()=>horasMesExcel(has)}),el("button",{class:"btn sec",text:"Detalle para justificar",onclick:()=>horasDetalleCSV(has)})]));
    const TT={};O.filter(o=>o.estado==="hecha"&&o.minutos!=null&&!o.tiempo_auto).forEach(o=>{const t=TT[o.titulo]=TT[o.titulo]||{n:0,s:0,mn:1e9,mx:0,est:null};if(o.minutos_est)t.est=o.minutos_est;t.n++;t.s+=o.minutos;t.mn=Math.min(t.mn,o.minutos);t.mx=Math.max(t.mx,o.minutos);});
    box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Cuánto tarda cada trabajo"})),Object.keys(TT).length?el("table",null,[el("thead",null,el("tr",null,["Trabajo","Estimado","Media real","Veces","Mín – Máx"].map(h=>el("th",{text:h})))),
      el("tbody",null,Object.keys(TT).sort((a,b)=>TT[b].s/TT[b].n-TT[a].s/TT[a].n).map(k=>{const t=TT[k];return el("tr",null,[el("td",{text:k}),el("td",{text:t.est?durTxt(t.est):"—"}),el("td",{class:t.est&&t.s/t.n>t.est*1.25?"tarde":"",text:durTxt(t.s/t.n)}),el("td",{text:String(t.n)}),el("td",{text:durTxt(t.mn)+" – "+durTxt(t.mx)})]);}))]):el("div",{class:"empty",text:"Todavía no hay tiempos. Salen cuando los trabajos se empiezan con «Empezar» y se terminan con «Terminar»."})]));
    {const sg=el("div");box.appendChild(sg);rpc("problemas_lista",{p_tok:S.tok,p_solucionados:true}).then(L=>{if(!L.length)return;
      sg.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Seguimiento de problemas repetidos ("+L.length+")"}),el("span",{class:"der sub",text:"abiertos y solucionados en 30 días"})]),
        ...L.map(p=>{const u=(p.historial||[]).filter(h=>h.quien).slice(-1)[0];return el("button",{class:"ot",style:"cursor:pointer;text-align:left;width:100%;border:0;border-bottom:1px solid var(--line);background:none",onclick:()=>fichaProblema(p,()=>pinta())},[
          el("div",{style:"display:flex;gap:8px;align-items:center"},[el("span",{class:"t",style:"flex:1",text:p.tema+" en "+p.lugar}),el("span",{class:"pill "+EST_P[p.estado][1],text:EST_P[p.estado][0]})]),
          el("div",{class:"meta"},[el("span",{text:p.veces+" veces"}),el("span",{text:"Última: "+fCorta(p.ultima)}),u?el("span",{text:u.quien.split(" ")[0]+": "+(u.nota||"")}):el("span",{text:"Nadie ha apuntado nada todavía"})])]);})]));}).catch(()=>{});}
    box.appendChild(bloqueRepetidos(O,S.rs));
    const noh=O.filter(o=>o.estado==="no_hecha"||o.resultado==="NO-OK");
    if(noh.length)box.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Problemas ("+noh.length+")"})),noh.map(o=>el("div",{class:"ot"},[el("div",{class:"t",text:fCorta(o.fecha)+" · "+o.titulo}),el("div",{class:"d",text:[o.estado==="no_hecha"?"No hecha":"Checklist NO-OK",o.nota,o.hecho_por_n].filter(Boolean).join(" · ")})]))]));}
  catch(e){box.textContent=e.message;}}


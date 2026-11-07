/* ---------- Registro de jornada (fichaje) ----------
   Arriba del Día, si el jefe lo ha activado: «Fichar entrada», «Pausa», «Volver de la pausa» y «Fichar salida».
   La hora la pone el servidor, no el móvil. Cada uno ve sus fichajes del mes; el jefe, los de todos, con las horas y
   las correcciones (nunca se borra nada: se anula con su motivo y queda a la vista). Se descarga en Excel con el botón de la tabla. */
const hm=ts=>{const d=new Date(ts);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");};
const hmin=m=>{m=Math.round(m||0);return Math.floor(m/60)+" h "+String(m%60).padStart(2,"0")+" min";};
const TF={entrada:"Entrada",salida:"Salida",pausa_ini:"Pausa",pausa_fin:"Vuelta de la pausa"};
function cajaFichaje(R,re){const est=R.estado,L=(R.fichajes||[]).filter(x=>!x.anulado);
  const fichar=async(t,b)=>{b.disabled=true;try{const r=await rpc("fichar",{p_tok:S.tok,p_tipo:t});toast(TF[t]+" fichada a las "+hm(Date.now()));re(r);}catch(e){toast(e.message);b.disabled=false;}};
  const bot=(t,txt,cls)=>{const b=el("button",{class:"btn "+(cls||""),text:txt});b.onclick=()=>fichar(t,b);return b;};
  const acc=est==="fuera"?[bot("entrada",L.length?"Volver a fichar entrada":"Fichar entrada")]:est==="pausa"?[bot("pausa_fin","Volver de la pausa"),bot("salida","Fichar salida","sec")]:[bot("salida","Fichar salida"),bot("pausa_ini","Pausa","sec")];
  return el("div",{class:"card fich "+est},[el("div",{class:"fich-hd"},[el("div",{style:"flex:1;min-width:0"},[el("b",{text:est==="dentro"?"Estás trabajando":est==="pausa"?"Estás en pausa":L.length?"Has fichado la salida":"Sin fichar hoy"}),
      el("div",{class:"meta",text:L.length?L.map(x=>TF[x.tipo]+" "+hm(x.cuando)).join(" · "):"Ficha al llegar y al irte"})]),
      el("div",{class:"fich-h"},[el("b",{text:hmin(R.minutos)}),el("small",{text:"hoy"})])]),
    el("div",{class:"row fich-acc"},acc.concat([el("button",{class:"btn sec",text:"Mis fichajes",onclick:()=>misFichajes()})]))]);}
async function misFichajes(){const d=new Date();let a=d.getFullYear(),m=d.getMonth()+1;const box=el("div",null,el("p",{class:"hint",text:"Cargando…"}));
  const carga=async()=>{box.textContent="";try{const R=await rpc("fichajes_mes",{p_tok:S.tok,p_anio:a,p_mes:m});const T=(R.trabajadores||[])[0];
    box.appendChild(el("div",{class:"row",style:"align-items:center;margin-bottom:8px"},[el("button",{class:"btn sec peq",text:"◀",onclick:()=>{m--;if(!m){m=12;a--;}carga();}}),el("b",{style:"flex:1;text-align:center",text:MESES_F[m-1]+" "+a}),el("button",{class:"btn sec peq",text:"▶",onclick:()=>{m++;if(m>12){m=1;a++;}carga();}})]));
    box.appendChild(tablaJornada(T?T.dias:[],false));}catch(e){box.appendChild(el("p",{class:"hint",text:e.message}));}};
  carga();dlg("Mis fichajes",box,[{t:"Cerrar",cls:"sec"}]);}
const MESES_F=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function tablaJornada(D,jefe,trab,re){if(!D||!D.length)return el("p",{class:"hint",text:"Sin fichajes este mes."});
  const tot=D.reduce((s,d)=>s+(d.minutos||0),0);
  return el("div",{class:"tw"},el("table",{class:"tabla"},[el("thead",null,el("tr",null,["Día","Entrada","Salida","Pausas","Horas"].concat(jefe?[""]:[]).map(t=>el("th",{text:t})))),
    el("tbody",null,D.map(d=>{const L=(d.fichajes||[]),ok=L.filter(x=>!x.anulado),q=t=>ok.filter(x=>x.tipo===t).map(x=>hm(x.cuando)+(x.origen==="corregido"?"*":"")).join(", ");
      const an=L.filter(x=>x.anulado);
      return el("tr",null,[el("td",{text:fCorta(d.fecha)}),el("td",{text:q("entrada")||"—"}),el("td",{text:q("salida")||"—"}),el("td",{text:ok.filter(x=>x.tipo==="pausa_ini").length?ok.filter(x=>x.tipo==="pausa_ini").length+"":"—"}),
        el("td",{text:hmin(d.minutos)+(an.length?" · "+an.length+" anulado"+(an.length>1?"s":""):"")}),jefe?el("td",null,el("button",{class:"btn sec peq",text:"Corregir",onclick:()=>corregirDia(trab,d,re)})):null]);})
      .concat([el("tr",null,[el("td",{text:"Total"}),el("td",null,""),el("td",null,""),el("td",null,""),el("td",{text:hmin(tot)})].concat(jefe?[el("td",null,"")]:[]))])),
  ]));}
function corregirDia(trab,d,re){const L=d.fichajes||[];const f={tipo:"entrada",hora:"",motivo:"",anula:""};
  const lista=el("div",null,L.map(x=>el("div",{class:"meta",style:"padding:4px 0;"+(x.anulado?"text-decoration:line-through":"")},[TF[x.tipo]+" "+hm(x.cuando)+(x.origen==="corregido"?" (corregido)":"")+(x.anulado?" · anulado: "+(x.motivo||""):"")])));
  const selA=el("select",null,[el("option",{value:"",text:"— No anular ninguno —"})].concat(L.filter(x=>!x.anulado).map(x=>el("option",{value:x.id,text:TF[x.tipo]+" "+hm(x.cuando)}))));selA.onchange=()=>{f.anula=selA.value;};
  const selT=el("select",null,Object.entries(TF).map(([k,t])=>el("option",{value:k,text:t})));selT.onchange=()=>{f.tipo=selT.value;};
  const hor=inp("",v=>{f.hora=v;},{type:"time"});
  dlg("Corregir el "+fCorta(d.fecha)+" · "+trab.nombre,el("div",null,[lista,fld("Anular este fichaje",selA),fld("Añadir fichaje",selT),fld("Hora",hor),fld("Motivo (obligatorio)",area("",v=>{f.motivo=v;})),
    el("p",{class:"hint",text:"Nada se borra: el fichaje anulado queda tachado con su motivo y el nuevo sale marcado con *."})]),
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{if(!f.motivo.trim())throw new Error("Escribe el motivo");if(!f.anula&&!f.hora)throw new Error("Anula un fichaje o pon la hora de uno nuevo");
      const cuando=f.hora?new Date(d.fecha+"T"+f.hora+":00").toISOString():null;
      await rpc("fichaje_corregir",{p_tok:S.tok,p_trab:trab.trabajador,p_tipo:f.hora?f.tipo:null,p_cuando:cuando,p_motivo:f.motivo.trim(),p_anula:f.anula||null});toast("Corregido");re&&re();}}]);}
function cardJornada(){const d=new Date();let a=d.getFullYear(),m=d.getMonth()+1;const box=el("div",null,el("div",{class:"empty",text:"Cargando…"}));
  const card=el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Registro de jornada"})),box]);
  const carga=async()=>{let R;try{R=await rpc("fichajes_mes",{p_tok:S.tok,p_anio:a,p_mes:m});}catch(e){box.textContent="";box.appendChild(el("div",{class:"empty",text:e.message}));return;}
    box.textContent="";
    box.appendChild(el("div",{style:"padding:10px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"},[
      el("span",{style:"flex:1;min-width:200px",class:"meta",text:R.activo?"El fichaje está activado: a cada uno le sale arriba del Día.":"El fichaje está apagado: nadie lo ve todavía."}),
      el("button",{class:"btn "+(R.activo?"sec":""),text:R.activo?"Apagar fichaje":"Activar fichaje",onclick:()=>{if(R.activo)return rpc("fichaje_config",{p_tok:S.tok,p_activo:false}).then(carga);
        dlg("Activar el fichaje",el("div",null,[el("p",{text:"A cada trabajador le saldrá arriba del Día el botón para fichar la entrada, las pausas y la salida. La hora la pone el servidor."}),
          el("p",{class:"hint",text:"Antes de usarlo como registro de jornada oficial, confírmalo con la empresa (RRHH): la ley pide que se guarde 4 años, que cada trabajador pueda consultar el suyo y que no se pueda cambiar sin dejar rastro. La app guarda todo y las correcciones quedan con su motivo."})]),
          [{t:"Cancelar",cls:"sec"},{t:"Activar",fn:async()=>{await rpc("fichaje_config",{p_tok:S.tok,p_activo:true});carga();}}]);}})]));
    box.appendChild(el("div",{class:"row",style:"align-items:center;padding:0 14px 8px"},[el("button",{class:"btn sec peq",text:"◀",onclick:()=>{m--;if(!m){m=12;a--;}carga();}}),el("b",{style:"flex:1;text-align:center",text:MESES_F[m-1]+" "+a}),el("button",{class:"btn sec peq",text:"▶",onclick:()=>{m++;if(m>12){m=1;a++;}carga();}})]));
    const T=R.trabajadores||[];if(!T.length){box.appendChild(el("div",{class:"empty",text:"Nadie ha fichado este mes."}));return;}
    T.forEach(t=>{const tot=(t.dias||[]).reduce((s,d)=>s+(d.minutos||0),0);
      box.appendChild(el("details",{class:"fich-trab"},[el("summary",null,[el("b",{text:t.nombre}),el("span",{class:"meta",text:" · "+(t.dias||[]).length+" días · "+hmin(tot)})]),tablaJornada(t.dias,true,t,carga)]));});};
  carga();return card;}
/* el recuadro de fichar, arriba del Día (para cada uno, si está activado) */
let _fiN=0;const _pintaFi=pinta;pinta=function(){_pintaFi();const n=++_fiN;
  if(!S.tok||!S.yo||S.tab!=="hoy"||(S.fecha&&S.fecha!==hoyISO()))return;
  rpc("fichaje_hoy",{p_tok:S.tok}).then(R=>{if(n!==_fiN||!R||!R.activo)return;const v=$("v");if(!v)return;
    let c=null;const re=r=>{const nw=cajaFichaje(r,re);if(c)c.replaceWith(nw);c=nw;};c=cajaFichaje(R,re);
    const hd=v.querySelector(":scope>.pg-hd");if(hd)hd.after(c);else v.prepend(c);}).catch(()=>{});};

/* ---------- Coste de cada trabajo (Resumen del jefe) ---------- */
function cardCostes(){let per="mes";const box=el("div",null,el("div",{class:"empty",text:"Cargando…"}));
  const card=el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Coste de cada trabajo"}),el("span",{class:"meta",style:"margin-left:auto",text:"por máquina o zona"})]),box]);
  const eur=n=>n==null?"—":(Math.round(n*100)/100).toLocaleString("es-ES",{minimumFractionDigits:0,maximumFractionDigits:2})+" €";
  const carga=async()=>{const h=hoyISO(),d=new Date(h+"T12:00:00");let d0,d1;
    if(per==="mes"){d0=h.slice(0,8)+"01";d1=h;}else if(per==="ant"){const x=new Date(d.getFullYear(),d.getMonth()-1,1),y=new Date(d.getFullYear(),d.getMonth(),0);d0=x.toLocaleDateString("en-CA");d1=y.toLocaleDateString("en-CA");}else{d0=sumaD(h,-89);d1=h;}
    let R;try{R=await rpc("limp_costes",{p_tok:S.tok,p_desde:d0,p_hasta:d1});}catch(e){box.textContent="";box.appendChild(el("div",{class:"empty",text:e.message}));return;}
    box.textContent="";const F=R.filas||[],ch=R.coste_hora;
    box.appendChild(el("div",{style:"padding:10px 14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"},[
      el("div",{class:"seg sel"},[["mes","Este mes"],["ant","Mes pasado"],["90","90 días"]].map(([k,t])=>el("button",{"aria-pressed":String(per===k),text:t,onclick:()=>{per=k;carga();}}))),
      el("span",{style:"flex:1"}),el("span",{class:"meta",text:ch?"Mano de obra a "+eur(ch)+"/hora":"Sin precio de la hora"}),
      el("button",{class:"btn sec peq",text:ch?"Cambiar €/hora":"Poner €/hora",onclick:()=>{let v=ch?String(ch):"";dlg("Coste de la hora",el("div",null,[fld("€ por hora de trabajo (con todo incluido)",inp(v,x=>{v=x;},{inputmode:"decimal"})),
        el("p",{class:"hint",text:"Se multiplica por los minutos de cada trabajo y por las personas que lo hacen. Déjalo vacío para no contar la mano de obra."})]),
        [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{await rpc("limp_coste_hora",{p_tok:S.tok,p_v:parseFloat(String(v).replace(",","."))||null});carga();}}]);}})]));
    if(!F.length){box.appendChild(el("div",{class:"empty",text:"No hay trabajos hechos en este periodo."}));return;}
    const T=F.reduce((s,x)=>({n:s.n+x.n,min:s.min+x.min,mo:s.mo+(x.eur_mo||0),pr:s.pr+x.eur_prod,tot:s.tot+x.total}),{n:0,min:0,mo:0,pr:0,tot:0});
    box.appendChild(el("div",{class:"tw"},el("table",{class:"tabla"},[el("thead",null,el("tr",null,["Máquina o zona","Trabajos","Tiempo","Mano de obra","Productos","Total"].map(t=>el("th",{text:t})))),
      el("tbody",null,F.slice(0,60).map(x=>el("tr",null,[el("td",{text:x.nombre+(x.clave!==x.nombre?" ("+x.clave+")":"")}),el("td",{text:String(x.n)+(x.n_est?" ("+x.n_est+" sin hora)":"")}),el("td",{text:hmin(x.min)}),
        el("td",{text:eur(x.eur_mo)}),el("td",{text:eur(x.eur_prod)+(x.sin_precio?" *":"")}),el("td",{text:eur(x.total)})]))
        .concat([el("tr",null,[el("td",{text:"Total"}),el("td",{text:String(T.n)}),el("td",{text:hmin(T.min)}),el("td",{text:ch?eur(T.mo):"—"}),el("td",{text:eur(T.pr)}),el("td",{text:eur(T.tot)})])]))])));
    box.appendChild(el("p",{class:"hint",style:"padding:0 14px 12px",text:"Tiempo: de «Empezar» a «Terminar» quitando las pausas, por cada persona del trabajo (si no se empezó, el estimado). * algún producto sin precio en el almacén."}));};
  carga();return card;}
{const _vR=vResumen;vResumen=async function(v){await _vR(v);try{v.appendChild(cardCostes());}catch(e){}};
 const _vE=vEquipo;vEquipo=async function(v){await _vE(v);try{v.appendChild(cardJornada());}catch(e){}};}

(function(){
/* App de hornos (solo lectura por ahora): trabajos de hornos de hoy y ficha de cada horno (con QR).
   Usa la misma sesión que la app de limpieza (mismo móvil y mismo navegador) y las mismas funciones de la base de datos.
   Los registros (limpieza, vaciado, cambios de piezas) siguen en la app de limpieza hasta que esta página esté probada. */
const URL_SB="https://uddejncrjcyyaxjocbpj.supabase.co",KEY="sb_publishable_UqnQLvLkCI0kk_y1KDt94Q_ccYmLw2i";
const $=id=>document.getElementById(id);
function el(t,a,k){const e=document.createElement(t);if(a)for(const x in a){const v=a[x];if(v==null||v===false)continue;if(x==="text")e.textContent=v;else if(x.startsWith("on"))e[x]=v;else e.setAttribute(x,v===true?"":v);}
  (Array.isArray(k)?k:k!=null?[k]:[]).flat(9).forEach(c=>{if(c==null||c===false)return;e.appendChild(typeof c==="string"?document.createTextNode(c):c);});return e;}
const ls={get:k=>{try{return localStorage.getItem(k);}catch(e){return null;}}};
function toast(t){const d=el("div",{class:"toast",text:t});document.body.appendChild(d);setTimeout(()=>d.remove(),2600);}
const hoyISO=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10);};
const fCorta=f=>new Date(f+"T12:00:00").toLocaleDateString("es-ES",{weekday:"short",day:"numeric",month:"numeric"});
const hora=ts=>ts?new Date(ts).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}):"";
const nom1=n=>(n||"").split(" ")[0];
const ACC={limpieza:"Limpieza",vaciado:"Vaciado",cambio_tolva:"Cambio de tolva",cambio_cono:"Cambio de cono",cambio_dosificador:"Cambio de tubo dosificador",cambio_tolva_cono:"Cambio de tolva y cono",cambio_resistencia:"Cambio de resistencia",cambio_centrador:"Cambio de centrador",cambio_con_estrella:"Cambio de conexión estrella",cambio_con_fase:"Cambio de conexión fase",cambio_otra:"Cambio de otras piezas"};
const EST={pendiente:["Pendiente","warn"],en_curso:["En curso","warn"],hecha:["Hecha","ok"],no_hecha:["No hecha","bad"]};

async function rpc(fn,args){
  const r=await fetch(URL_SB+"/rest/v1/rpc/"+fn,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:JSON.stringify(args||{})});
  const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null;}catch(e){}
  if(!r.ok){throw new Error((j&&j.message)||txt||("Error "+r.status));}
  return j;
}

const S={tok:ls.get("limp.tok"),yo:null,ELS:null};
try{S.yo=JSON.parse(ls.get("limp.yo")||"null");}catch(e){}

async function elementos(){
  if(!S.ELS) S.ELS=(await rpc("elementos",{p_tok:S.tok})).filter(e=>e.tipo==="horno"&&!e.borrado);
  return S.ELS;
}

function sinSesion(){
  $("v").textContent="";
  $("v").appendChild(el("div",{class:"card"},[el("b",{text:"Primero entra en la app de limpieza con tu nombre y tu PIN."}),
    el("a",{class:"btn",href:"limpieza.html",text:"Ir a la app de limpieza"})]));
}

/* ---------- Inicio: trabajos de hornos de hoy + acceso a un horno ---------- */
async function inicio(){
  const v=$("v");v.textContent="";
  v.appendChild(el("div",{class:"h2",style:"margin-top:0",text:"Hoy · "+fCorta(hoyISO())}));
  const box=el("div",null,el("div",{class:"empty",text:"Cargando…"}));
  v.appendChild(box);
  let H,D;
  try{ [H,D]=await Promise.all([elementos(),rpc("ots_dia",{p_tok:S.tok,p_fecha:hoyISO()})]); }
  catch(e){ box.textContent="";box.appendChild(el("div",{class:"aviso",text:e.message})); return; }
  box.textContent="";
  const ids=new Set(H.map(h=>h.id));
  const ots=(D.dia||[]).filter(o=>o.elemento_id&&ids.has(o.elemento_id));
  box.appendChild(el("h2",{text:"Trabajos de hornos de hoy"}));
  if(!ots.length) box.appendChild(el("div",{class:"empty",text:"Hoy no hay trabajos de hornos."}));
  ots.forEach(o=>{
    const h=H.find(x=>x.id===o.elemento_id), s=EST[o.estado]||[o.estado||"",""];
    box.appendChild(el("div",{class:"card"},[
      el("div",{style:"display:flex;gap:8px;align-items:flex-start;justify-content:space-between"},[el("b",{text:o.titulo||"Trabajo"}),el("span",{class:"pill "+s[1],text:s[0]})]),
      el("div",{class:"meta",text:(h?h.codigo+" · "+h.nombre:"")+(o.nombres&&o.nombres.length?" · "+o.nombres.join(", "):"")}),
      el("a",{class:"btn sec",href:"#",text:"Ver horno",onclick:e=>{e.preventDefault();ficha(h.codigo);}})
    ]));
  });

  box.appendChild(el("h2",{text:"Hornos"}));
  if(ESC_OK()) box.appendChild(el("button",{class:"btn",type:"button",text:"Escanear código QR del horno",onclick:()=>escanear()}));
  const sel=el("select",null,[el("option",{value:"",text:"— Elige un horno —"})].concat(H.filter(h=>h.activo).sort((a,b)=>a.codigo.localeCompare(b.codigo,"es",{numeric:true}))
    .map(h=>el("option",{value:h.codigo,text:h.codigo+" · "+h.nombre}))));
  sel.onchange=()=>{if(sel.value)ficha(sel.value);};
  box.appendChild(sel);
}

/* ---------- Ficha de un horno ---------- */
async function ficha(cod){
  const v=$("v");v.textContent="";
  v.appendChild(el("a",{href:"#",text:"‹ Hornos",style:"display:inline-block;margin:0 0 8px;color:var(--acc)",onclick:e=>{e.preventDefault();history.replaceState(null,"",location.pathname);inicio();}}));
  const box=el("div",null,el("div",{class:"empty",text:"Cargando…"}));v.appendChild(box);
  let e;
  try{ e=await rpc("elemento_ficha",{p_tok:S.tok,p_cod:cod}); }
  catch(er){ box.textContent="";box.appendChild(el("div",{class:"aviso",text:er.message})); return; }
  box.textContent="";
  box.appendChild(el("h2",{style:"margin-top:0",text:e.codigo+" · "+e.nombre}));
  box.appendChild(el("div",{class:"meta",text:e.lugar||""}));
  const ult=e.ult||{};
  const lineas=["limpieza","vaciado"].concat(Object.keys(ACC).filter(k=>!["limpieza","vaciado"].includes(k))).filter(k=>ult[k]);
  box.appendChild(el("h2",{text:"Último registro"}));
  box.appendChild(el("div",{class:"card"},lineas.length?lineas.map(k=>el("div",{text:ACC[k]+": "+fCorta(String(ult[k]).slice(0,10))+" "+hora(ult[k])})):[el("div",{class:"meta",text:"Todavía no hay registros en la app."})]));
  box.appendChild(el("h2",{text:"Historial"}));
  const H=e.historial||[];
  box.appendChild(H.length?el("ol",{class:"hist"},H.slice(0,20).map(h=>el("li",null,[
    el("b",{text:fCorta(String(h.fin).slice(0,10))+" "+hora(h.fin)}),
    " · "+(h.accion&&h.accion!=="limpieza"?(ACC[h.accion]||h.accion)+" · ":"")+(h.quien||"")+(h.min!=null?" · "+h.min+" min":"")+(h.motivo?" · motivo: "+h.motivo:"")+(h.nota?" · "+h.nota:"")]))):el("div",{class:"empty",text:"Sin historial."}));
  box.appendChild(el("div",{class:"aviso",style:"margin-top:16px",text:"Por ahora los registros (limpieza, vaciado y cambios de piezas) se apuntan en la app de limpieza."}));
}

/* ---------- Escáner QR ---------- */
function ESC_OK(){try{return !!(window.ESC&&ESC.disponible());}catch(e){return false;}}
function escanear(){
  ESC.abrir({titulo:"Escanear",texto:"Apunta al código QR del horno",alLeer:txt=>{let cod=txt;try{const u=new URL(txt);cod=u.searchParams.get("el")||txt;}catch(e){}ficha(cod.trim());}});
}

/* ---------- arranque ---------- */
async function arranque(){
  if(!S.tok||!S.yo){sinSesion();return;}
  $("who").textContent=nom1(S.yo.nombre);
  try{ await elementos(); }
  catch(e){ $("v").textContent="";$("v").appendChild(el("div",{class:"aviso",text:"No puedes entrar en la app de hornos. "+(e.message||"")})); return; }
  const Q=new URLSearchParams(location.search), cod=Q.get("el");
  if(cod) ficha(cod); else inicio();
}
arranque();
})();

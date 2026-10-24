
/* ===== Colada web: datos en Supabase en lugar del almacén de Claude ===== */
(function(){
const SB_URL="https://whemhkcrgwyjucpaswrm.supabase.co",SB_KEY="sb_publishable_hcFf66q2-0X6pR1gq5YKpw_u4G6HriG";
const sb=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const P=window.DB_PREFIX||"";/* "" = Colada, "alm_" = Almacén */
window.sbColada=sb;window.WEB=true;
const h=(tag,props,kids)=>{const e=document.createElement(tag);for(const k in props||{}){const v=props[k];if(v==null)continue;if(k==="text")e.textContent=v;else if(k.startsWith("on"))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v);}(kids||[]).forEach(c=>c&&e.appendChild(typeof c==="string"?document.createTextNode(c):c));return e;};
let yo=null;/* fila de usuarios del que ha entrado */
window.yoNombre=()=>yo?(yo.nombre||yo.email||""):"";

/* ---------- acceso ---------- */
function pantallaAcceso(msg){return new Promise(res=>{
  let modo="entrar";const ov=h("div",{class:"lg-ov"});
  const pinta=()=>{ov.textContent="";
    const em=h("input",{type:"email",autocomplete:"username",placeholder:"correo",inputmode:"email"}),pw=h("input",{type:"password",autocomplete:modo==="entrar"?"current-password":"new-password",placeholder:"contraseña"}),
      nom=modo==="alta"?h("input",{type:"text",placeholder:"nombre (como te llaman)"}):null,err=h("div",{class:"err",text:msg||""});msg="";
    const go=h("button",{class:"btn",type:"submit",text:modo==="entrar"?"Entrar":"Crear cuenta"});
    const f=h("form",{class:"lg",onsubmit:async e=>{e.preventDefault();err.textContent="";go.disabled=true;
      try{const email=em.value.trim(),password=pw.value;
        if(modo==="alta"){if(password.length<6)throw new Error("La contraseña tiene que tener al menos 6 caracteres.");
          const r=await sb.auth.signUp({email,password,options:{data:{nombre:(nom.value||"").trim()}}});if(r.error)throw r.error;}
        const r=await sb.auth.signInWithPassword({email,password});if(r.error)throw r.error;
        ov.remove();res(r.data.session);
      }catch(x){err.textContent=/Invalid login/i.test(x.message||"")?"Correo o contraseña incorrectos.":/registered/i.test(x.message||"")?"Ese correo ya tiene cuenta: entra con él.":(x.message||"No se pudo");go.disabled=false;}}},[
      h("h2",{text:"Colada"}),h("p",{class:"hint",text:modo==="entrar"?"Control de coladas MAPRI. Entra con tu correo.":"Crea tu cuenta. El administrador tiene que darte acceso antes de que veas los datos."}),
      nom,em,pw,err,go,h("a",{onclick:()=>{modo=modo==="entrar"?"alta":"entrar";pinta();},text:modo==="entrar"?"No tengo cuenta: crearla":"Ya tengo cuenta: entrar"})]);
    ov.appendChild(f);};
  pinta();document.body.appendChild(ov);});}
function pantallaEspera(){const ov=h("div",{class:"lg-ov"},[h("div",{class:"lg"},[h("h2",{text:"Colada"}),
  h("p",{text:"Tu cuenta ("+(yo&&yo.email||"")+") está creada pero todavía no tiene acceso. Pide al administrador que te dé acceso y vuelve a entrar."}),
  h("button",{class:"btn sec",type:"button",text:"Volver a comprobar",onclick:()=>location.reload()}),
  h("button",{class:"btn sec",type:"button",text:"Salir",onclick:async()=>{await sb.auth.signOut();location.reload();}})])]);document.body.appendChild(ov);}
function pantallaSoloConsulta(){document.body.appendChild(h("div",{class:"lg-ov"},[h("div",{class:"lg"},[h("h2",{text:"Solo consulta"}),
  h("p",{text:"Tu usuario ("+(yo.email||"")+") es de solo consulta del Almacén. Aquí no tienes acceso."}),
  h("button",{class:"btn",type:"button",text:"Ir al Almacén",onclick:()=>{location.href="almacen.html";}}),
  h("button",{class:"btn sec",type:"button",text:"Salir",onclick:async()=>{await sb.auth.signOut();location.reload();}})])]));}
const SOLO_MSG="Tu usuario es de solo consulta: puedes ver todo, pero no cambiar nada.";
const noConsulta=()=>{if(yo&&yo.consulta)throw new Error(SOLO_MSG);};
let listo=null;
function acceso(){if(listo)return listo;listo=(async()=>{
  let {data:{session}}=await sb.auth.getSession();
  if(!session)session=await pantallaAcceso();
  const r=await sb.from("usuarios").select("*").eq("user_id",session.user.id).maybeSingle();
  const kY="mapri.yo."+session.user.id;
  if(r.error&&OFF.esRed(r.error)){try{yo=JSON.parse(localStorage.getItem(kY)||"null");}catch(e){yo=null;}OFF.red(false);}
  else{yo=r.data;try{if(yo)localStorage.setItem(kY,JSON.stringify(yo));}catch(e){}}
  yo=yo||{email:session.user.email,activo:false};
  if(!yo.activo){pantallaEspera();return new Promise(()=>{});}
  /* usuario de solo consulta: ve el Almacén pero no puede cambiar nada ni entrar en Coladas */
  window.SOLO_CONSULTA=!!yo.consulta;
  if(yo.consulta){document.documentElement.classList.add("solo-consulta");
    if(!P&&window.APP_ID!=="inicio"){pantallaSoloConsulta();return new Promise(()=>{});}
    setTimeout(()=>window.dispatchEvent(new Event("solo-consulta")),0);}
  ponUsuario();
  /* base vacía: ofrecer importar la copia de la Colada */
  if(!P){const c=await sb.from("docs").select("col",{count:"exact",head:true});
  if(!c.error&&(c.count||0)===0||/[?&]importar/.test(location.search))await pantallaImportar((c.count||0)===0);}
  return true;})();return listo;}

/* ---------- importar la copia descargada del artefacto ---------- */
function pantallaImportar(vacia){return new Promise(res=>{
  const err=h("div",{class:"err"}),est=h("p",{class:"hint"});
  const fi=h("input",{type:"file",accept:".json,application/json"});
  const go=h("button",{class:"btn",type:"button",text:"Importar",onclick:async()=>{err.textContent="";const f=fi.files&&fi.files[0];if(!f){err.textContent="Elige el archivo colada-copia-….json";return;}
    go.disabled=true;try{const J=JSON.parse(await f.text());if(J.app!=="colada"||!J.docs)throw new Error("Ese archivo no es una copia de la Colada.");
      const rows=[];for(const col in J.docs)for(const id in J.docs[col])rows.push({col,id,data:J.docs[col][id]});
      est.textContent="Guardando "+rows.length+" documentos…";
      for(let i=0;i<rows.length;i+=50){const r=await sb.from("docs").upsert(rows.slice(i,i+50));if(r.error)throw r.error;}
      const fot=Object.entries(J.fotos||{});let n=0;
      for(const [id,du] of fot){est.textContent="Subiendo fotos "+(++n)+"/"+fot.length+"…";
        const bl=await (await fetch(du)).blob();const r=await sb.storage.from("albaranes").upload(id,bl,{upsert:true,contentType:bl.type||"image/jpeg"});if(r.error)console.warn(r.error);}
      est.textContent="Hecho.";ov.remove();if(/[?&]importar/.test(location.search))history.replaceState(null,"",location.pathname);res();
    }catch(x){err.textContent=x.message||"No se pudo importar";go.disabled=false;}}});
  const ov=h("div",{class:"lg-ov"},[h("div",{class:"lg"},[h("h2",{text:"Pasar los datos"}),
    h("p",{text:vacia?"La base de datos está vacía. En la Colada de Claude, pestaña Consultas, pulsa «Descargar copia completa» y elige aquí ese archivo.":"Esto SUSTITUYE los datos por los de la copia. Úsalo solo si sabes lo que haces."}),
    fi,est,err,go,vacia?null:h("button",{class:"btn sec",type:"button",text:"Cancelar",onclick:()=>{ov.remove();history.replaceState(null,"",location.pathname);res();}})])]);
  document.body.appendChild(ov);});}

/* ---------- usuario en la cabecera y gestión de usuarios ---------- */
function ponUsuario(){const hd=document.querySelector("header");if(!hd||document.getElementById("usr-btn"))return;
  const n=String(yo.nombre||yo.email||"?").trim(),ini=n.split(/[\s@.]+/).filter(Boolean).map(x=>x[0]).slice(0,2).join("").toUpperCase();
  const av=h("button",{id:"usr-btn",class:"usr-av",type:"button",title:n,"aria-label":"Menú de "+n+": otras apps, historial y usuario",text:ini,onclick:menuUsuario});const lu=hd.querySelector(".lupa");if(lu)lu.after(av);else hd.appendChild(av);
  if(yo.consulta)av.before(h("span",{class:"solo-c",title:SOLO_MSG,text:"Solo consulta",style:"align-self:center;flex:none;font-size:12px;font-weight:600;padding:4px 8px;border-radius:6px;background:var(--info-bg,#E1F4FF);color:var(--info,#0064D9);white-space:nowrap"}));}
function menuUsuario(){const APP=window.APP_ID||(P?"almacen":"colada");
  const box=h("div",{class:"dlg",role:"dialog"}),ov=h("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)ov.remove();}},[box]);
  const fila=(t,sub,fn)=>h("button",{type:"button",class:"usr-fila",onclick:()=>{ov.remove();fn();}},[h("b",{text:t}),sub?h("small",{text:sub}):null]);
  box.appendChild(h("h3",{text:yo.nombre||yo.email||""}));
  [["inicio","inicio.html","Inicio","Resumen de todo en mosaicos"],["colada","./","Coladas","Stock y consumo de aluminio"],["almacen","almacen.html","Almacén","Consumibles, pistones y ejes"],["iny","almacen.html?t=iny","Inyectoras","Fichas de las máquinas"]].filter(x=>x[0]!==APP&&!(APP==="almacen"&&x[0]==="iny")&&!(yo.consulta&&x[0]==="colada"))
    .forEach(([k,u,t,s])=>box.appendChild(fila("Ir a "+t,s,()=>{location.href=u;})));
  if(P==="alm_")box.appendChild(fila("Avisos al móvil","Bajo mínimo, pedidos retrasados y ejes en cuarentena",panelAvisos));
  if(!yo.consulta)box.appendChild(fila("Historial y deshacer","Últimos cambios, con opción de deshacerlos",panelHist));
  box.appendChild(fila("Mi usuario","Mis datos, usuarios y cerrar sesión",panelUsuario));
  box.appendChild(h("button",{type:"button",class:"btn sec",style:"width:100%",text:"Cerrar",onclick:()=>ov.remove()}));
  document.body.appendChild(ov);}
async function panelUsuario(){
  const box=h("div",{class:"dlg",role:"dialog"}),ov=h("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)ov.remove();}},[box]);
  box.appendChild(h("h3",{text:(yo.nombre||"")+" · "+yo.email}));
  if(yo.admin){box.appendChild(h("p",{class:"hint",text:"Usuarios. Los nuevos se dan de alta solos desde la pantalla de entrada; aquí les das o quitas el acceso. «Solo consulta» ve todo el Almacén pero no puede cambiar nada, y no entra en Coladas."}));
    const lst=h("div",{class:"usr-list"});box.appendChild(lst);
    const carga=async()=>{lst.textContent="";const r=await sb.from("usuarios").select("*").order("creado");(r.data||[]).forEach(u=>{
      const bt=(t,cambio)=>h("button",{class:"btn sec",type:"button",style:"font-size:13px;padding:5px 10px",text:t,onclick:async()=>{const r=await sb.from("usuarios").update(cambio).eq("user_id",u.user_id);if(r.error)alert("No se pudo: "+r.error.message);carga();}});
      const otro=u.user_id!==yo.user_id;
      lst.appendChild(h("div",{class:"usr-row"},[h("span",{text:(u.nombre||"")+" · "+u.email+(u.admin?" · admin":"")+(u.activo&&u.consulta?" · SOLO CONSULTA del Almacén":"")+(u.activo?"":" · SIN ACCESO")}),
        otro?bt(u.activo?"Quitar acceso":"Dar acceso completo",u.activo?{activo:false}:{activo:true,consulta:false}):null,
        otro&&!u.activo?bt("Dar acceso solo consulta",{activo:true,consulta:true,admin:false}):null,
        otro&&u.activo&&!u.admin?bt(u.consulta?"Pasar a acceso completo":"Pasar a solo consulta",{consulta:!u.consulta}):null,
        otro&&u.activo&&!u.consulta?bt(u.admin?"Quitar admin":"Hacer admin",{admin:!u.admin}):null]));});};
    carga();
    box.appendChild(h("button",{class:"btn sec",type:"button",text:"Importar copia de la Colada…",onclick:()=>{ov.remove();pantallaImportar(false).then(()=>location.reload());}}));}
  box.appendChild(h("div",{class:"dlg-b"},[h("button",{class:"btn sec",type:"button",text:"Cerrar",onclick:()=>ov.remove()}),
    h("button",{class:"btn",type:"button",text:"Salir",onclick:async()=>{await sb.auth.signOut();location.reload();}})]));
  document.body.appendChild(ov);}

/* ---------- almacén de documentos (misma forma que el de Claude) ---------- */
const snap=rows=>({docs:rows.map(r=>({id:r.id,data:()=>r.data}))});
const subs={};
function canal(col,fn){col=P+col;(subs[col]=subs[col]||[]).push(fn);
  if(subs[col].length===1)sb.channel("docs-"+col).on("postgres_changes",{event:"*",schema:"public",table:"docs",filter:"col=eq."+col},p=>{subs[col].forEach(f=>f(p));}).subscribe(st=>{if(st==="SUBSCRIBED")subs[col].forEach(f=>f(null));});}
/* lecturas: si no hay red se usa la última copia guardada en el móvil (con los cambios pendientes ya puestos) */
async function leeCol(col){const C=P+col,k="c:"+C;
  try{if(!navigator.onLine)throw new TypeError("offline");const r=await sb.from("docs").select("id,data").eq("col",C);if(r.error)throw r.error;const d=r.data||[];OFF.guarda(k,d);OFF.red(true);return OFF.aplicaCol(C,d);}
  catch(e){if(!OFF.esRed(e))throw e;OFF.red(false);const d=await OFF.lee(k);if(!d)throw e;return OFF.aplicaCol(C,d);}}
async function leeDoc(col,id){const C=P+col,k="d:"+C+"/"+id,ap=d=>d?{data:OFF.aplicaDoc(C,id,d.data)}:(OFF.cola().some(o=>o.col===C&&o.id===id)?{data:OFF.aplicaDoc(C,id,{})}:null);
  try{if(!navigator.onLine)throw new TypeError("offline");const r=await sb.from("docs").select("data").eq("col",C).eq("id",id).maybeSingle();if(r.error)throw r.error;OFF.guarda(k,r.data||null);OFF.red(true);return ap(r.data);}
  catch(e){if(!OFF.esRed(e))throw e;OFF.red(false);let d=await OFF.lee(k);if(d===undefined){const L=await OFF.lee("c:"+C);const x=(L||[]).find(z=>z.id===id);d=x?{data:x.data}:undefined;}
    if(d===undefined&&!OFF.cola().some(o=>o.col===C&&o.id===id))throw e;return ap(d||null);}}
const rpc=async(f,a)=>{noConsulta();const r=await sb.rpc(f,a);if(r.error)throw r.error;};
/* apuntes (añadir, quitar o cambiar líneas): sin red se guardan en la cola y se envían al volver */
const rpcQ=async(f,a)=>{noConsulta();try{if(!navigator.onLine)throw new TypeError("offline");await rpc(f,a);OFF.red(true);}
  catch(e){if(!OFF.esRed(e)){if(window.reportarError)reportarError(e,"guardar "+f+" "+a.p_col);throw e;}OFF.red(false);await OFF.encola({fn:f,args:a,col:a.p_col,id:a.p_id,desc:sinP(a.p_col)+" "+a.p_id});recargar([a.p_col]);}};
const sinRed=()=>new Error("Sin conexión: esto se podrá guardar cuando vuelva la red. Los consumos y apuntes sí se guardan sin red.");
const escribe=async fn=>{noConsulta();if(!navigator.onLine)throw sinRed();try{const r=await fn();if(r&&r.error)throw r.error;OFF.red(true);return r;}catch(e){if(OFF.esRed(e)){OFF.red(false);throw sinRed();}if(window.reportarError)reportarError(e,"guardar documento");throw e;}};
OFF.ejecutor=op=>rpc(op.fn,op.args);OFF.alVaciar=cols=>recargar(cols);
const db={
  /* en el Almacén cada apunte guarda quién lo ha hecho («por») */
  itemsAdd:(col,id,items)=>{if(P==="alm_"&&yo&&Array.isArray(items)){const n=(yo.nombre||yo.email||"").trim();if(n)items.forEach(it=>{if(it&&typeof it==="object"&&!Array.isArray(it)&&!it.por)it.por=n;});}
    return rpcQ("docs_items_add",{p_col:P+col,p_id:id,p_items:items});},
  itemsDelId:(col,id,ids)=>rpcQ("docs_items_del_id",{p_col:P+col,p_id:id,p_ids:ids}),
  itemsPatchId:(col,id,items)=>rpcQ("docs_items_patch_id",{p_col:P+col,p_id:id,p_items:items}),
  itemsPut:(col,id,item)=>rpc("docs_items_put",{p_col:P+col,p_id:id,p_item:item}),
  itemsDel:(col,id,i)=>rpc("docs_items_del",{p_col:P+col,p_id:id,p_i:i}),
  collection:col=>({onSnapshot:(cb,er)=>{const go=()=>leeCol(col).then(rows=>cb(snap(rows))).catch(e=>er&&er(e));go();canal(col,go);return()=>{};}}),
  doc:path=>{const [col,id]=path.split("/");return{
    get:async()=>{const d=await leeDoc(col,id);return{exists:!!d,data:()=>d?d.data:undefined};},
    set:async data=>{await escribe(()=>sb.from("docs").upsert({col:P+col,id,data}));},
    update:async patch=>{if(!navigator.onLine)throw sinRed();const d=await leeDoc(col,id);await escribe(()=>sb.from("docs").upsert({col:P+col,id,data:Object.assign({},d?d.data:{},patch)}));},
    onSnapshot:(cb,er)=>{const go=()=>leeDoc(col,id).then(d=>cb({exists:!!d,data:()=>d?d.data:undefined})).catch(e=>er&&er(e));go();canal(col,p=>{if(!p||(p.new&&p.new.id===id)||(p.old&&p.old.id===id))go();});return()=>{};}};}
};
/* ---------- historial de cambios y deshacer ---------- */
const sinP=col=>P&&col.startsWith(P)?col.slice(P.length):col;
const keyIt=it=>it&&typeof it==="object"?(it.id!=null?"id:"+it.id:it.i!=null?"i:"+it.i:JSON.stringify(it)):String(it);
const hayItems=d=>d&&Array.isArray(d.items);
function difItems(a,b){const A=new Map(((a&&a.items)||[]).map(x=>[keyIt(x),x])),B=new Map(((b&&b.items)||[]).map(x=>[keyIt(x),x]));const add=[],del=[],chg=[];
  B.forEach((v,k)=>{if(!A.has(k))add.push(v);else if(JSON.stringify(A.get(k))!==JSON.stringify(v))chg.push([A.get(k),v]);});A.forEach((v,k)=>{if(!B.has(k))del.push(v);});return{add,del,chg};}
function descIt(col,it){try{const f=window.descCambio&&window.descCambio(sinP(col),it);if(f)return f;}catch(e){}
  const o=Object.assign({},it);delete o.id;delete o.i;delete o.ts;return JSON.stringify(o).replace(/[{}"]/g,"").slice(0,90);}
function descDoc(col,id,antes,despues){try{const f=window.descDoc&&window.descDoc(sinP(col),id,antes,despues);if(f)return f;}catch(e){}return sinP(col)+" · "+id;}
const fechaH=s=>{const d=new Date(s),hoyD=new Date();const hh=d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});
  const dias=Math.round((new Date(hoyD.toDateString())-new Date(d.toDateString()))/864e5);return(dias===0?"hoy":dias===1?"ayer":d.toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit"}))+" "+hh;};
async function cargaHist(){
  let q=sb.from("docs_hist").select("h,col,id,data,op,at,by").order("h",{ascending:false}).limit(200);
  q=P?q.like("col",P+"%"):q.not("col","like","alm_%");
  const r=await q;if(r.error)throw r.error;const rows=(r.data||[]).filter(x=>x.col!=="zz"&&x.col!==P+"notas");
  const cur={};for(const c of [...new Set(rows.map(x=>x.col))]){const ids=[...new Set(rows.filter(x=>x.col===c).map(x=>x.id))];
    for(let i=0;i<ids.length;i+=100){const d=await sb.from("docs").select("id,data").eq("col",c).in("id",ids.slice(i,i+100));if(d.error)throw d.error;(d.data||[]).forEach(z=>{cur[c+"\u0001"+z.id]=z.data;});}}
  const sig={},vistos=new Set(),ch=[];
  rows.forEach(x=>{const k=x.col+"\u0001"+x.id;const despues=vistos.has(k)?sig[k]:(k in cur?cur[k]:null);const ultimo=!vistos.has(k);vistos.add(k);sig[k]=x.data;
    const antes=x.data;if(JSON.stringify(antes)===JSON.stringify(despues))return;
    let lineas;if(hayItems(antes)||hayItems(despues)){const d=difItems(antes,despues);
      lineas=d.add.map(v=>"＋ "+descIt(x.col,v)).concat(d.del.map(v=>"✕ "+descIt(x.col,v)+" (borrado)")).concat(d.chg.map(([a,b])=>"✎ "+descIt(x.col,b)));
      if(!lineas.length)return;}
    else lineas=[(antes==null?"＋ ":despues==null?"✕ ":"✎ ")+descDoc(x.col,x.id,antes,despues)];
    ch.push({x,k,antes,despues,ultimo,lineas});});
  /* lo que se guardó a la vez (mismo usuario, segundos de diferencia) es una sola acción */
  const grupos=[];ch.forEach(c=>{const g=grupos[grupos.length-1];const t=Date.parse(c.x.at);
    if(g&&g.by===c.x.by&&Math.abs(g.t0-t)<2000&&!g.cambios.some(z=>z.k===c.k)){g.cambios.push(c);g.t0=t;}else grupos.push({by:c.x.by,at:c.x.at,t0:t,cambios:[c]});});
  return grupos;}
async function deshacerGrupo(g){noConsulta();
  const avisos=g.cambios.filter(c=>!c.ultimo&&!(hayItems(c.antes)||hayItems(c.despues)));
  if(avisos.length&&!confirm("Después de este cambio hubo otros en "+avisos.map(c=>descDoc(c.x.col,c.x.id,c.antes,c.despues)).join(", ")+". Si lo deshaces, esa parte vuelve entera a como estaba antes y se pierden esos cambios posteriores. ¿Seguir?"))return false;
  for(const c of g.cambios){const col=c.x.col,id=c.x.id;
    const r=await sb.from("docs").select("data").eq("col",col).eq("id",id).maybeSingle();if(r.error)throw r.error;const ahora=r.data?r.data.data:null;
    if(hayItems(c.antes)||hayItems(c.despues)){const d=difItems(c.antes,c.despues);const quitar=new Set(d.add.map(keyIt));const viejo=new Map(d.chg.map(([a])=>[keyIt(a),a]));
      let items=((ahora&&ahora.items)||[]).filter(it=>!quitar.has(keyIt(it))).map(it=>viejo.has(keyIt(it))?viejo.get(keyIt(it)):it);
      const hay=new Set(items.map(keyIt));d.del.forEach(it=>{if(!hay.has(keyIt(it)))items.push(it);});
      const w=await sb.from("docs").upsert({col,id,data:Object.assign({},ahora||c.antes||{},{items})});if(w.error)throw w.error;}
    else if(c.antes==null){const w=await sb.from("docs").delete().eq("col",col).eq("id",id);if(w.error)throw w.error;}
    else{const w=await sb.from("docs").upsert({col,id,data:c.antes});if(w.error)throw w.error;}}
  recargar(g.cambios.map(c=>c.x.col));return true;}
/* vuelve a leer de la base de datos lo que muestra la pantalla (por si el aviso en directo no llega) */
function recargar(cols){[...new Set(cols||Object.keys(subs))].forEach(c=>(subs[c]||[]).forEach(f=>{try{f(null);}catch(e){}}));}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)recargar();});
async function panelHist(){
  const box=h("div",{class:"dlg",role:"dialog","aria-label":"Historial de cambios"}),ov=h("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)ov.remove();}},[box]);
  const lst=h("div",{class:"usr-list"},[h("p",{class:"hint",text:"Cargando…"})]);
  box.appendChild(h("h3",{text:"Historial de cambios"}));
  box.appendChild(h("p",{class:"hint",text:"Lo que se ha guardado, lo más nuevo arriba (últimos 60 días). «Deshacer» quita solo ese cambio: lo que hiciste después se mantiene."}));
  box.appendChild(lst);box.appendChild(h("div",{class:"dlg-b"},[h("button",{class:"btn sec",type:"button",text:"Cerrar",onclick:()=>ov.remove()})]));
  document.body.appendChild(ov);
  let nombres={};try{const u=await sb.from("usuarios").select("user_id,nombre,email");(u.data||[]).forEach(z=>{nombres[z.user_id]=(z.nombre||z.email||"").split(" ")[0];});}catch(e){}
  const pinta=async()=>{lst.textContent="";lst.appendChild(h("p",{class:"hint",text:"Cargando…"}));let gs;
    try{gs=await cargaHist();}catch(e){lst.textContent="";lst.appendChild(h("p",{class:"err",text:"No se pudo cargar: "+(e.message||e)}));return;}
    lst.textContent="";if(!gs.length){lst.appendChild(h("p",{class:"hint",text:"Todavía no hay cambios guardados."}));return;}
    gs.slice(0,60).forEach(g=>{const L=[].concat(...g.cambios.map(c=>c.lineas));const det=h("div",{style:"font-size:14px;line-height:1.4;overflow-wrap:anywhere"},L.slice(0,6).map(t=>h("div",{text:t})).concat(L.length>6?[h("div",{class:"hint",text:"… y "+(L.length-6)+" más"})]:[]));
      const b=h("button",{class:"btn sec",type:"button",style:"font-size:13px;padding:5px 10px;align-self:flex-start",text:"Deshacer",onclick:async()=>{b.disabled=true;b.textContent="Deshaciendo…";
        try{const ok=await deshacerGrupo(g);if(ok){ov.remove();const t=document.createElement("div");t.id="toast";t.setAttribute("role","status");t.textContent="Deshecho";const o=document.getElementById("toast");if(o)o.remove();document.body.appendChild(t);setTimeout(()=>t.remove(),2600);}else{b.disabled=false;b.textContent="Deshacer";}}catch(e){alert("No se pudo deshacer: "+(e.message||e));b.disabled=false;b.textContent="Deshacer";}}});
      lst.appendChild(h("div",{class:"usr-row",style:"flex-direction:column;align-items:stretch;gap:6px"},[h("div",{class:"hint",style:"margin:0",text:fechaH(g.at)+(nombres[g.by]?" · "+nombres[g.by]:"")}),det,b]));});};
  pinta();}
/* ---------- avisos al móvil (Web Push) ---------- */
const b64u=s=>{const p="=".repeat((4-s.length%4)%4),b=atob((s+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(b,c=>c.charCodeAt(0));};
async function subAvisos(){if(!("serviceWorker" in navigator)||!("PushManager" in window))return null;const r=await navigator.serviceWorker.register("sw.js");await navigator.serviceWorker.ready;return{r,s:await r.pushManager.getSubscription()};}
async function panelAvisos(){const box=h("div",{class:"dlg",role:"dialog"}),ov=h("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)ov.remove();}},[box]);document.body.appendChild(ov);
  const pinta=async(msg)=>{box.textContent="";box.appendChild(h("h3",{text:"Avisos al móvil"}));
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent),solo=(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone;
    const p=t=>box.appendChild(h("p",{class:"hint",text:t}));
    p("Te llega un aviso al móvil, los días laborables hacia las 7:30 y las 13:30, cuando haya algo nuevo: artículos bajo mínimo, pedidos que ya deberían haber llegado o ejes que llevan más de una semana en cuarentena. Cada cosa avisa una sola vez.");
    if(!("PushManager" in window)||!("serviceWorker" in navigator)){p(ios&&!solo?"En iPhone primero hay que instalar la app: en Safari toca Compartir › «Añadir a pantalla de inicio», ábrela desde ese icono y vuelve aquí.":"Este navegador no permite avisos.");}
    else{let st=null;try{st=await subAvisos();}catch(e){}const on=!!(st&&st.s)&&Notification.permission==="granted";
      if(msg)box.appendChild(h("div",{class:"banner",text:msg}));
      box.appendChild(h("p",{style:"font-weight:600",text:on?"Activados en este móvil.":Notification.permission==="denied"?"Los avisos están bloqueados para esta web en los ajustes del móvil.":"Desactivados en este móvil."}));
      const b=h("button",{class:"btn",type:"button",text:on?"Desactivar en este móvil":"Activar en este móvil",onclick:async()=>{b.disabled=true;
        try{if(on){await sb.rpc("alm_push_baja",{p_endpoint:st.s.endpoint});await st.s.unsubscribe();pinta("Avisos desactivados.");return;}
          const perm=await Notification.requestPermission();if(perm!=="granted"){pinta("Sin permiso no se pueden mandar avisos.");return;}
          const k=await sb.rpc("alm_push_clave");if(k.error||!k.data)throw new Error("No hay clave de avisos");
          const s2=await st.r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(k.data)});const j=s2.toJSON();
          const a=await sb.rpc("alm_push_alta",{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth});if(a.error)throw a.error;
          try{new Notification("Avisos activados",{body:"Te avisaremos aquí de lo importante del almacén.",icon:"icon-192.png"});}catch(e){}
          pinta("Avisos activados.");}catch(e){if(window.reportarError)reportarError(e,"activar avisos");pinta("No se pudo: "+(e.message||e));}}});
      box.appendChild(b);}
    box.appendChild(h("button",{class:"btn sec",type:"button",style:"width:100%;margin-top:8px",text:"Cerrar",onclick:()=>ov.remove()}));};
  pinta();}
/* ---------- fotos de albaranes en Storage ---------- */
const urls={},pidiendo=new Set();
window.fotoUrlWeb=id=>{if(urls[id])return urls[id];if(!pidiendo.has(id)){pidiendo.add(id);
  sb.storage.from("albaranes").createSignedUrl(id,3600*12).then(r=>{if(r.data&&r.data.signedUrl){urls[id]=r.data.signedUrl;window.dispatchEvent(new Event("colada-refresh"));}});}
  return "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";};
window.urlFirmada=async id=>{if(urls[id])return urls[id];const r=await sb.storage.from("albaranes").createSignedUrl(id,3600*12);if(r.data&&r.data.signedUrl){urls[id]=r.data.signedUrl;return urls[id];}return null;};
const assets={upload:async blob=>{noConsulta();const id=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,"0")).join("");
  const r=await sb.storage.from("albaranes").upload(id,blob,{contentType:blob.type||"image/jpeg"});if(r.error)throw r.error;return{id,contentType:blob.type||"image/jpeg"};},
  delete:async id=>{await sb.storage.from("albaranes").remove([id]);}};
/* ---------- descargas ---------- */
const downloads={save:async({filename,data})=>{const bl=data instanceof Blob?data:new Blob([data],{type:/\.json$/.test(filename)?"application/json":/\.csv$/.test(filename)?"text/csv":/\.xlsx$/.test(filename)?"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"application/octet-stream"});
  const u=URL.createObjectURL(bl),a=h("a",{href:u,download:filename});document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);a.remove();},4000);}};

window.claude={use:async n=>{if(n==="db"){await acceso();return db;}if(n==="assets"){await acceso();return assets;}if(n==="downloads")return downloads;return null;}};
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
})();

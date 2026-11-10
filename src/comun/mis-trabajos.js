/* ===== MIS TRABAJOS (tablero privado) =====
   Un tablero de columnas (Pendiente · En marcha · Esperando · Hecho) para apuntar tus cosas: tareas, ideas y mejoras
   de las apps. Es privado de verdad: se guarda en la tabla mis_tareas, que la base de datos solo deja leer y escribir
   a su dueño (nadie más lo ve, ni el administrador desde la app). Los trabajos de Limpieza y las averías no cambian.
   window.MisTrabajos.resumen() → tarjeta para Inicio; .abrir() → el tablero a pantalla completa. */
(function(){
const COLS=[["pend","Pendiente"],["marcha","En marcha"],["espera","Esperando"],["hecho","Hecho"]];
const APPS=["Coladas","Almacén","Limpieza","Inicio","Hornos","Toolbox","Otra"];
const PRIO=[[0,"Normal"],[1,"Alta"],[2,"Urgente"]];
const E=(t,a,k)=>{const n=document.createElement(t);if(a)for(const x in a){const v=a[x];if(v==null||v===false)continue;if(x==="text")n.textContent=v;else if(x==="class")n.className=v;
  else if(x.slice(0,2)==="on")n.addEventListener(x.slice(2),v);else if(x==="value")n.value=v;else n.setAttribute(x,v===true?"":v);}
  (k==null?[]:[].concat(k)).forEach(c=>{if(c!=null&&c!==false)n.appendChild(typeof c==="string"?document.createTextNode(c):c);});return n;};
const hoyI=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const fF=f=>f?f.slice(8)+"/"+f.slice(5,7):"";
const toast=m=>{try{if(typeof window.toast==="function")return window.toast(m);}catch(e){}const t=E("div",{class:"mt-toast",text:m});document.body.appendChild(t);setTimeout(()=>t.remove(),2200);};
let L=null,err=null;const subs=new Set();
const sb=()=>window.sbColada;
async function carga(){if(!sb()){err="Se ve en la app conectada.";aviso();return;}
  try{const r=await sb().from("mis_tareas").select("*").order("orden",{ascending:true});if(r.error)throw r.error;L=r.data||[];err=null;}catch(e){err="No se pudieron cargar tus trabajos.";}aviso();}
/* si algo falla se dice por qué y queda en el registro de errores */
function fallo(e,ctx){const m=String((e&&(e.message||e.msg))||e||"error");toast("No se pudo guardar: "+m);try{if(window.reportarError)window.reportarError(e instanceof Error?e:new Error(m),ctx);}catch(_){}}
const aviso=()=>subs.forEach(f=>{try{f();}catch(e){}});
async function guarda(t,pt){const antes=Object.assign({},t);Object.assign(t,pt);aviso();
  try{const r=await sb().from("mis_tareas").update(pt).eq("id",t.id);if(r&&r.error)throw r.error;}catch(e){Object.assign(t,antes);aviso();fallo(e,"mis trabajos: cambiar");}}
async function nueva(x){try{if(!sb())throw new Error("sin conexión con la base de datos");if(!L)L=[];const r=await sb().from("mis_tareas").insert(x).select();if(r.error)throw r.error;L.push(r.data[0]);aviso();}catch(e){fallo(e,"mis trabajos: añadir");}}
async function borra(t){try{const r=await sb().from("mis_tareas").delete().eq("id",t.id);if(r&&r.error)throw r.error;L=L.filter(x=>x.id!==t.id);aviso();toast("Borrado");}catch(e){fallo(e,"mis trabajos: borrar");}}
const de=c=>(L||[]).filter(t=>t.col===c).sort((a,b)=>c==="hecho"?String(b.hecho_en||"").localeCompare(String(a.hecho_en||"")):(b.prio-a.prio)||(a.orden-b.orden));
const vence=t=>t.col!=="hecho"&&t.limite&&t.limite<=hoyI();
/* mover a otra columna (al final de esa columna) */
function mover(t,c){if(t.col===c)return;const D=de(c);guarda(t,{col:c,orden:(D.length?Math.max(...D.map(x=>x.orden)):Date.now()/1000)+1});}
/* ---- ventana para cambiar un trabajo ---- */
function editar(t){const d=Object.assign({},t);let ov;const cerrar=()=>ov.remove();
  const sel=(id,ops,v,on)=>{const s=E("select",{id,class:"rgx-sel",onchange:e=>on(e.target.value)},ops.map(([k,x])=>E("option",{value:String(k),text:x})));s.value=String(v==null?"":v);return s;};
  const campo=(t2,c)=>E("label",{class:"rgx-campo"},[E("span",{class:"rgx-et",text:t2}),c]);
  let bor=0;const bB=E("button",{type:"button",class:"btn sec",text:"Borrar",onclick:async()=>{if(!bor){bor=1;bB.textContent="¿Seguro? Toca otra vez";return;}cerrar();await borra(t);}});
  ov=E("div",{class:"dlg-ov mt-ov2",onclick:e=>{if(e.target===ov)cerrar();}},[E("div",{class:"dlg rgx-dlg",role:"dialog","aria-modal":"true","aria-label":"Trabajo"},[
    E("h3",{class:"rgx-h",text:"Trabajo"}),E("div",{class:"rgx-form"},[
      campo("Qué hay que hacer",E("input",{id:"mtT",type:"text",class:"rgx-num",value:d.titulo,oninput:e=>{d.titulo=e.target.value;}})),
      campo("Notas",E("textarea",{id:"mtN",class:"rgx-num mt-ta",rows:"4",oninput:e=>{d.nota=e.target.value;}},d.nota||"")),
      E("div",{class:"rgx-fila"},[campo("App",sel("mtA",[["","—"]].concat(APPS.map(a=>[a,a])),d.app||"",v=>{d.app=v||null;})),
        campo("Prioridad",sel("mtP",PRIO,d.prio,v=>{d.prio=+v;})),
        campo("Para cuándo",E("input",{id:"mtL",type:"date",class:"rgx-num",value:d.limite||"",onchange:e=>{d.limite=e.target.value||null;}})),
        campo("Columna",sel("mtC",COLS,d.col,v=>{d.col=v;}))])]),
    E("div",{class:"rgx-pieb"},[bB,E("span",{style:"flex:1"}),E("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:cerrar}),
      E("button",{type:"button",class:"btn",text:"Guardar",onclick:async()=>{if(!String(d.titulo||"").trim()){toast("Escribe qué hay que hacer");return;}cerrar();
        const pt={titulo:d.titulo.trim(),nota:(d.nota||"").trim()||null,app:d.app||null,prio:d.prio||0,limite:d.limite||null};
        if(d.col!==t.col){const D=de(d.col);pt.col=d.col;pt.orden=(D.length?Math.max(...D.map(x=>x.orden)):Date.now()/1000)+1;}await guarda(t,pt);}})])])]);
  document.body.appendChild(ov);setTimeout(()=>{try{ov.querySelector("#mtT").focus();}catch(e){}},50);}
/* ---- el tablero ---- */
let arrastra=null;
function tarjeta(t){const i=COLS.findIndex(c=>c[0]===t.col);
  const n=E("div",{class:"mt-c"+(t.prio===2?" urg":t.prio===1?" alta":"")+(vence(t)?" vence":""),draggable:"true",tabindex:"0","data-id":t.id,
    ondragstart:e=>{arrastra=t;n.classList.add("arr");try{e.dataTransfer.setData("text/plain",t.id);e.dataTransfer.effectAllowed="move";}catch(_){}},ondragend:()=>{arrastra=null;n.classList.remove("arr");},
    onclick:e=>{if(e.target.closest("button"))return;editar(t);},onkeydown:e=>{if(e.key==="Enter")editar(t);}},[
    E("div",{class:"mt-t",text:t.titulo}),t.nota?E("div",{class:"mt-n",text:t.nota.length>110?t.nota.slice(0,108)+"…":t.nota}):null,
    E("div",{class:"mt-m"},[t.app?E("span",{class:"mt-app",text:t.app}):null,t.prio?E("span",{class:"mt-pr",text:PRIO[t.prio][1]}):null,
      t.limite&&t.col!=="hecho"?E("span",{class:"mt-lim",text:(vence(t)?(t.limite<hoyI()?"Vencido ":"Hoy "):"Para el ")+fF(t.limite)}):null,
      t.col==="hecho"&&t.hecho_en?E("span",{class:"mt-lim ok",text:"Hecho el "+fF(String(t.hecho_en).slice(0,10))}):null,
      E("span",{class:"mt-mv"},[i>0?E("button",{type:"button",class:"mt-b","aria-label":"Pasar a "+COLS[i-1][1],title:"Pasar a "+COLS[i-1][1],text:"‹",onclick:()=>mover(t,COLS[i-1][0])}):null,
        i<COLS.length-1?E("button",{type:"button",class:"mt-b","aria-label":"Pasar a "+COLS[i+1][1],title:"Pasar a "+COLS[i+1][1],text:"›",onclick:()=>mover(t,COLS[i+1][0])}):null])])]);
  return n;}
function tablero(){const box=E("div",{class:"mt-tab"});let verHecho=false;
  const pinta=()=>{box.textContent="";if(err){box.appendChild(E("p",{class:"hint",text:err}));return;}if(!L){box.appendChild(E("p",{class:"hint",text:"Cargando…"}));return;}
    COLS.forEach(([c,t])=>{let D=de(c);const tot=D.length;if(c==="hecho"&&!verHecho)D=D.slice(0,15);
      const lst=E("div",{class:"mt-l"},D.map(tarjeta));
      /* se añade con el botón «Añadir» o con Intro (en el iPhone/iPad, la tecla «Intro» o «Ir» del teclado) */
      const inp=E("input",{type:"text",class:"mt-in",placeholder:"+ Añadir trabajo","aria-label":"Añadir trabajo en "+t,enterkeyhint:"done"});
      const add=async()=>{const v=inp.value.trim();if(!v){inp.focus();toast("Escribe el trabajo");return;}inp.value="";
        await nueva({titulo:v,col:c,orden:(de(c).length?Math.max(...de(c).map(x=>x.orden)):Date.now()/1000)+1});setTimeout(()=>{const x=box.querySelector('.mt-col[data-c="'+c+'"] .mt-in');if(x)x.focus();},30);};
      const fm=E("form",{class:"mt-add",onsubmit:e=>{e.preventDefault();add();}},[inp,E("button",{type:"submit",class:"btn peq mt-addb","aria-label":"Añadir en "+t,text:"Añadir"})]);
      const col=E("section",{class:"mt-col","data-c":c,ondragover:e=>{if(arrastra){e.preventDefault();col.classList.add("sobre");}},ondragleave:()=>col.classList.remove("sobre"),
        ondrop:e=>{e.preventDefault();col.classList.remove("sobre");if(arrastra)mover(arrastra,c);}},[
        E("div",{class:"mt-ch"},[E("h3",{text:t}),E("span",{class:"mt-cn",text:String(tot)})]),lst,
        c==="hecho"&&tot>15?E("button",{type:"button",class:"btn sec peq",text:verHecho?"Ver menos":"Ver todos ("+tot+")",onclick:()=>{verHecho=!verHecho;pinta();}}):null,
        c!=="hecho"?fm:null]);
      box.appendChild(col);});};
  subs.add(pinta);pinta();box.quita=()=>subs.delete(pinta);return box;}
function abrir(){let ov;const tb=tablero();const cerrar=()=>{tb.quita();ov.remove();document.removeEventListener("keydown",esc);try{history.replaceState(null,"",location.pathname);}catch(e){}};
  const esc=e=>{if(e.key==="Escape"&&!document.querySelector(".mt-ov2"))cerrar();};
  ov=E("div",{class:"mt-ov",role:"dialog","aria-modal":"true","aria-label":"Mis trabajos"},[E("div",{class:"mt-top"},[E("div",null,[E("h2",{text:"Mis trabajos"}),E("p",{class:"mt-sub",text:"Solo lo ves tú. Arrastra las tarjetas o usa ‹ › para cambiarlas de columna."})]),
    E("button",{type:"button",class:"btn sec peq",text:"Cerrar",onclick:cerrar})]),tb]);
  document.body.appendChild(ov);document.addEventListener("keydown",esc);if(!L)carga();}
/* resumen para Inicio */
function resumen(){const card=E("section",{class:"card mt-res"});
  const pinta=()=>{card.textContent="";const n=c=>de(c).length,V=(L||[]).filter(vence);
    card.appendChild(E("div",{class:"hd"},[E("h2",{text:"Mis trabajos"}),E("span",{class:"mt-pv",text:"🔒 solo lo ves tú"})]));
    const bd=E("div",{class:"bd mt-rbd"});card.appendChild(bd);
    if(err){bd.appendChild(E("p",{class:"hint",text:err}));return;}
    if(!L){bd.appendChild(E("p",{class:"hint",text:"Cargando…"}));return;}
    bd.appendChild(E("div",{class:"mt-cifras"},COLS.slice(0,3).map(([c,t])=>E("div",{class:"mt-cif"},[E("b",{text:String(n(c))}),E("span",{text:t})])).concat(V.length?[E("div",{class:"mt-cif mal"},[E("b",{text:String(V.length)}),E("span",{text:"para hoy o vencidos"})])]:[])));
    const top=de("marcha").concat(de("pend")).slice(0,3);
    if(top.length)bd.appendChild(E("ul",{class:"mt-top3"},top.map(t=>E("li",{class:vence(t)?"vence":""},[t.titulo,t.limite?E("span",{class:"mt-lim",text:" · "+fF(t.limite)}):null]))));
    else bd.appendChild(E("p",{class:"hint",text:"Apunta aquí tus tareas e ideas para las apps."}));
    bd.appendChild(E("button",{type:"button",class:"btn",text:"Abrir el tablero",onclick:abrir}));};
  subs.add(()=>{if(!card.isConnected&&card.dataset.puesto)return;pinta();});pinta();card.dataset.puesto="1";if(!L)carga();return card;}
window.MisTrabajos={abrir,resumen,recarga:carga,vencidos:()=>(L||[]).filter(vence)};
})();

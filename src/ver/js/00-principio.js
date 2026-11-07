/* ===== INFORME COMPARTIDO (página pública, sin usuario) =====
   Abre la copia de un informe que alguien ha compartido con «Enlace para compartir». El enlace lleva la clave detrás
   de # (no llega a ningún servidor salvo a la base de datos), y la base de datos solo devuelve esa copia si no ha
   caducado ni se ha anulado (función informe_publico). Todo se pinta como texto: nada del informe se ejecuta. */
(function(){
const SB="https://whemhkcrgwyjucpaswrm.supabase.co",KEY="sb_publishable_hcFf66q2-0X6pR1gq5YKpw_u4G6HriG";
const $=id=>document.getElementById(id);
const E=(t,a,k)=>{const n=document.createElement(t);if(a)for(const x in a){const v=a[x];if(v==null||v===false)continue;if(x==="text")n.textContent=v;else if(x==="class")n.className=v;else if(x.slice(0,2)==="on")n.addEventListener(x.slice(2),v);else n.setAttribute(x,v);}
  (k==null?[]:[].concat(k)).forEach(c=>{if(c!=null&&c!==false)n.appendChild(typeof c==="string"?document.createTextNode(c):c);});return n;};
const fD=s=>{const d=new Date(s);return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear();};
const fN=v=>{if(typeof v!=="number")return String(v==null?"":v);const [e,d]=String(Math.round(Math.abs(v)*100)/100).split(".");return(v<0?"−":"")+e.replace(/\B(?=(\d{3})+(?!\d))/g,".")+(d?","+d:"");};
const APP={coladas:"Coladas",almacen:"Almacén",Colada:"Coladas","Almacén":"Almacén"};
function error(t,d){const v=$("view");v.textContent="";v.appendChild(E("div",{class:"ver-err"},[E("h2",{text:t}),E("p",{text:d})]));}
async function carga(){const k=(new URLSearchParams(location.hash.slice(1))).get("k")||"";
  if(!/^[0-9a-f]{20,}$/.test(k)){error("Enlace no válido","Comprueba que has copiado el enlace entero.");return;}
  let r;try{const res=await (window.__fetchInforme||fetch)(SB+"/rest/v1/rpc/informe_publico",{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY,Authorization:"Bearer "+KEY},body:JSON.stringify({p_token:k})});
    if(!res.ok)throw new Error("HTTP "+res.status);r=await res.json();}catch(e){error("No se pudo abrir el informe","Comprueba la conexión y vuelve a intentarlo.");return;}
  if(!r||r.error){error(r&&r.error==="caducado"?"Este enlace ha caducado":r&&r.error==="anulado"?"Este enlace se ha anulado":"Este informe no existe",
    r&&r.error==="caducado"?"Caducó el "+fD(r.caduca)+". Pide a quien te lo mandó que te pase uno nuevo.":"Pide a quien te lo mandó que te pase uno nuevo.");return;}
  pinta(r);}
function pinta(r){const v=$("view");v.textContent="";const c=r.contenido||{};document.title=(r.titulo||"Informe")+" · MAPRI";
  v.appendChild(E("div",{class:"ver-cab"},[E("h2",{text:r.titulo||"Informe"}),E("p",{text:[APP[r.app]||r.app,r.periodo].filter(Boolean).join(" · ")}),
    E("p",{text:"Copia del "+fD(r.creado)+". El enlace caduca el "+fD(r.caduca)+"."})]));
  if(c.texto)v.appendChild(E("section",{class:"card"},[E("div",{class:"hd"},E("h2",{text:"Informe"})),E("div",{class:"bd"},E("pre",{class:"ver-txt",text:c.texto}))]));
  (c.hojas||[]).forEach(h=>{if(!h.filas||!h.filas.length)return;
    v.appendChild(E("section",{class:"card"},[E("div",{class:"hd"},E("h2",{text:h.nombre||"Tabla"})),E("div",{class:"tbl-wrap"},E("table",{class:"tbl"},[
      E("thead",null,E("tr",null,(h.cols||[]).map(t=>E("th",{text:String(t)})))),
      E("tbody",null,h.filas.map(f=>E("tr",null,f.map(x=>E("td",{class:typeof x==="number"?"num":null,text:fN(x)})))))]))]));});
  v.appendChild(E("p",{class:"ver-pie",text:"Copia de solo lectura compartida desde las apps de MAPRI."}));
  const b=$("bImp");b.hidden=false;b.onclick=()=>window.print();}
carga();window.addEventListener("hashchange",carga);
})();

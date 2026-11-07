/* ===== ENLACE PARA COMPARTIR UN INFORME =====
   Desde el generador de informes: «Enlace para compartir». Se guarda una copia del informe tal como está ahora
   (texto y tablas) en informes_compartidos y se da un enlace a informe.html#k=… que se abre sin usuario.
   El enlace solo enseña esa copia (no da acceso a la app), caduca cuando elijas y se puede anular.
   window.Compartir.dialogo({app, titulo, periodo, texto, hojas:[{nombre, filas|lineas}]}) */
(function(){
const E=(t,a,k)=>{const n=document.createElement(t);if(a)for(const x in a){const v=a[x];if(v==null||v===false)continue;if(x==="text")n.textContent=v;else if(x==="class")n.className=v;
  else if(x.slice(0,2)==="on")n.addEventListener(x.slice(2),v);else if(x==="value")n.value=v;else n.setAttribute(x,v===true?"":v);}
  (k==null?[]:[].concat(k)).forEach(c=>{if(c!=null&&c!==false)n.appendChild(typeof c==="string"?document.createTextNode(c):c);});return n;};
const toast=m=>{try{if(typeof window.toast==="function")return window.toast(m);}catch(e){}};
const fD=s=>{const d=new Date(s);return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear();};
const urlDe=tok=>{const b=location.href.split("#")[0].split("?")[0].replace(/[^/]*$/,"");return b+"informe.html#k="+tok;};
/* tablas: solo texto y números, como mucho 2.000 filas por tabla */
function limpia(h){const o={nombre:String(h.nombre||"Tabla").slice(0,60)};
  if(h.lineas)o.lineas=h.lineas.slice(0,3000).map(x=>String(x));
  if(h.filas){const F=h.filas.slice(0,2000);const cols=[];F.forEach(f=>Object.keys(f).forEach(k=>{if(!cols.includes(k))cols.push(k);}));
    o.cols=cols;o.filas=F.map(f=>cols.map(k=>{const v=f[k];return v==null?"":typeof v==="number"?v:String(v);}));}
  return o;}
function dialogo(inf){const sb=window.sbColada;if(!sb){toast("Solo se puede compartir desde la app conectada");return;}
  let dias=30,ov;const cerrar=()=>ov.remove();
  const res=E("div",{class:"cmp-res"}),mios=E("div",{class:"cmp-mios"});
  const chips=E("div",{class:"cmp-chips",role:"group","aria-label":"Caduca en"});
  const pintaChips=()=>{chips.textContent="";[[1,"1 día"],[7,"7 días"],[30,"30 días"],[90,"90 días"]].forEach(([d,t])=>chips.appendChild(E("button",{type:"button",class:"chip","aria-pressed":String(dias===d),text:t,onclick:()=>{dias=d;pintaChips();}})));};
  const crear=E("button",{type:"button",class:"btn",text:"Crear el enlace",onclick:async()=>{crear.disabled=true;
    const fila={app:inf.app||null,titulo:String(inf.titulo||"Informe").slice(0,200),periodo:inf.periodo||null,
      contenido:{texto:String(inf.texto||"").slice(0,200000),hojas:(inf.hojas||[]).filter(h=>h&&(h.filas||[]).length).slice(0,12).map(limpia)},
      caduca:new Date(Date.now()+dias*864e5).toISOString()};
    try{const r=await sb.from("informes_compartidos").insert(fila).select("token,caduca");if(r.error)throw r.error;const x=r.data[0];muestra(x.token,x.caduca);carga();}
    catch(e){toast("No se pudo crear el enlace");}crear.disabled=false;}});
  function muestra(tok,cad){const u=urlDe(tok);res.textContent="";
    const inp=E("input",{type:"text",readonly:true,class:"cmp-url",value:u,"aria-label":"Enlace",onclick:e=>e.target.select()});
    res.appendChild(E("p",{class:"cmp-ok",text:"✓ Enlace creado. Caduca el "+fD(cad)+"."}));res.appendChild(inp);
    res.appendChild(E("div",{class:"cmp-acc"},[E("button",{type:"button",class:"btn",text:"Copiar enlace",onclick:async()=>{try{await navigator.clipboard.writeText(u);toast("Enlace copiado");}catch(e){inp.select();try{document.execCommand("copy");toast("Enlace copiado");}catch(e2){}}}}),
      E("a",{class:"btn sec",target:"_blank",rel:"noopener",href:"https://wa.me/?text="+encodeURIComponent((inf.titulo||"Informe")+": "+u),text:"WhatsApp"}),
      E("a",{class:"btn sec",target:"_blank",rel:"noopener",href:"mailto:?subject="+encodeURIComponent(inf.titulo||"Informe")+"&body="+encodeURIComponent("Te paso el informe: "+u+"\n\nEl enlace caduca el "+fD(cad)+"."),text:"Correo"})]));}
  async function carga(){mios.textContent="";let L=[];
    try{const r=await sb.from("informes_compartidos").select("id,token,titulo,periodo,creado,caduca,anulado,vistas").order("creado",{ascending:false}).limit(20);if(r.error)throw r.error;L=r.data||[];}catch(e){return;}
    if(!L.length)return;const ahora=Date.now();
    mios.appendChild(E("div",{class:"inf-gh",text:"Tus enlaces"}));
    mios.appendChild(E("ul",{class:"cmp-l"},L.map(x=>{const vivo=!x.anulado&&Date.parse(x.caduca)>ahora;
      return E("li",{class:vivo?"":"muerto"},[E("div",{class:"cmp-tx"},[E("b",{text:x.titulo+(x.periodo?" · "+x.periodo:"")}),
        E("span",{text:(x.anulado?"anulado":Date.parse(x.caduca)<ahora?"caducado el "+fD(x.caduca):"caduca el "+fD(x.caduca))+" · "+(x.vistas||0)+(x.vistas===1?" vez abierto":" veces abierto")})]),
        vivo?E("span",{class:"cmp-b"},[E("button",{type:"button",class:"btn sec peq",text:"Copiar",onclick:async()=>{try{await navigator.clipboard.writeText(urlDe(x.token));toast("Enlace copiado");}catch(e){}}}),
          E("button",{type:"button",class:"btn sec peq",text:"Anular",onclick:async()=>{try{const r=await sb.from("informes_compartidos").update({anulado:new Date().toISOString()}).eq("id",x.id);if(r&&r.error)throw r.error;toast("Enlace anulado: ya no se puede abrir");carga();}catch(e){toast("No se pudo anular");}}})]):null]);})));}
  pintaChips();
  ov=E("div",{class:"dlg-ov cmp-ov",onclick:e=>{if(e.target===ov)cerrar();}},[E("div",{class:"dlg rgx-dlg",role:"dialog","aria-modal":"true","aria-label":"Enlace para compartir"},[
    E("h3",{class:"rgx-h",text:"Enlace para compartir"}),
    E("p",{class:"hint",text:"Se guarda una copia de «"+(inf.titulo||"Informe")+"»"+(inf.periodo?" ("+inf.periodo+")":"")+" tal como está ahora. Quien tenga el enlace la ve sin usuario, pero no entra en la app ni ve nada más."}),
    E("div",{class:"rgx-campo"},[E("span",{class:"rgx-et",text:"El enlace caduca en"}),chips]),crear,res,mios,
    E("div",{class:"rgx-pieb"},[E("button",{type:"button",class:"btn sec",text:"Cerrar",onclick:cerrar})])])]);
  document.body.appendChild(ov);carga();}
window.Compartir={dialogo};
})();

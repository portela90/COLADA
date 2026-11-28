/* ===== NAVEGAR COMO EN ALMACÉN (28/11/2026) =====
   Lo que se hizo en Almacén, para las demás apps (Coladas, Limpieza, Inicio):
   1. Atrás del móvil: cierra la ficha o ventana que esté abierta encima, en vez de salir de la app.
   2. Los apartados plegados (con ▸) se abren en una pantalla entera, con «‹» para volver.
   3. Lo que se nombra en tablas y listas (una colada, un albarán, una máquina…) se puede tocar y lleva a su ficha.
   Cada app dice qué cosas se pueden tocar con window.NAV_CFG = {vista:"#view", enlaces:()=>[[texto, tipo, abrir], …]}.
   Las pantallas usan las mismas clases que las fichas de Almacén (op-…), así se ven igual (planta.css). */
(function(){
  const E=(t,a,k)=>{const n=document.createElement(t);if(a)for(const p in a){const v=a[p];if(v==null||v===false)continue;
      if(p==="class")n.className=v;else if(p==="text")n.textContent=v;else if(p.startsWith("on")&&typeof v==="function")n.addEventListener(p.slice(2),v);else n.setAttribute(p,v===true?"":v);}
    (Array.isArray(k)?k:k!=null?[k]:[]).forEach(c=>{if(c==null||c===false)return;n.appendChild(typeof c==="object"?c:document.createTextNode(String(c)));});return n;};
  const cfg=()=>window.NAV_CFG||{};

  /* ---------- 1. atrás del móvil ---------- */
  let ign=0,nId=0;const arriba=()=>{try{return history.state&&history.state.nv;}catch(e){return null;}};
  const esOv=x=>x&&x.nodeType===1&&x.parentNode===document.body&&x.matches(".ficha-ov,.dlg-ov,.ov,.nv-ov,.bus-ov,.rc-ov")&&!x.matches(".lightbox");
  function cerrarOv(x){if(x._cerrar){x._cerrar();return;}
    const bs=[...x.querySelectorAll("button")];
    const b=x.querySelector(".op-back,[data-cerrar],button[aria-label='Cerrar'],button[aria-label='Volver']")||bs.find(z=>/^(cancelar|cerrar|volver|‹|←|✕|×)/i.test((z.textContent||"").trim()));
    if(b){b.click();if(!x.isConnected)return;}
    document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));if(x.isConnected)x.remove();}
  const obsOv=new MutationObserver(R=>{let quit=[],pon=[];R.forEach(r=>{r.removedNodes.forEach(x=>{if(x._nvId)quit.push(x._nvId);});r.addedNodes.forEach(x=>{if(esOv(x)&&!x._nvId&&!pon.includes(x))pon.push(x);});});
    pon=pon.filter(x=>x.isConnected);const top=arriba(),quitoTop=quit.includes(top);
    /* lo que se abre encima tiene que verse encima: si su capa (z-index) es más baja que la de lo ya abierto, se sube */
    pon.forEach(x=>{try{let m=0;for(const o of document.body.children){if(o===x)break;if(esOv(o))m=Math.max(m,+getComputedStyle(o).zIndex||0);}
      if((+getComputedStyle(x).zIndex||0)<=m)x.style.zIndex=String(m+1);}catch(e){}});
    try{if(quitoTop&&pon.length){const x=pon.shift();x._nvId=++nId;history.replaceState({nv:x._nvId},"");}
      else if(quitoTop){ign++;history.back();}
      pon.forEach(x=>{x._nvId=++nId;history.pushState({nv:x._nvId},"");});}catch(e){}});
  window.addEventListener("popstate",()=>{if(ign>0){ign--;return;}
    const L=[...document.body.children].filter(x=>x._nvId);const x=L.pop();if(x){x._nvId=null;cerrarOv(x);}});

  /* ---------- pantalla entera (como las fichas de Almacén) ---------- */
  function abrePantalla(o){const ov=E("div",{class:"nv-ov",role:"dialog","aria-modal":"true","aria-label":o.titulo});
    const tabs=(o.tabs||[]).filter(t=>t&&t[1]&&t[1].length);let cur=Math.min(o.tab||0,Math.max(0,tabs.length-1));
    const body=E("div",{class:"op-body"}),tb=E("div",{class:"op-tabs",role:"tablist"});
    const pinta=()=>{tb.querySelectorAll("button").forEach((b,i)=>b.setAttribute("aria-selected",String(i===cur)));body.textContent="";(tabs[cur]?tabs[cur][1]:[]).forEach(n=>{if(n)body.appendChild(n);});};
    tabs.forEach(([t],i)=>tb.appendChild(E("button",{type:"button",role:"tab",text:t,onclick:()=>{cur=i;pinta();}})));
    const cerrar=()=>{ov.remove();document.removeEventListener("keydown",esc);if(o.alCerrar)setTimeout(o.alCerrar,0);};
    const esc=e=>{if(e.key==="Escape"&&[...document.body.children].filter(x=>x._nvId||x.classList.contains("nv-ov")).pop()===ov)cerrar();};
    ov.appendChild(E("div",{class:"op-pg"},[E("div",{class:"op-bar"},[E("button",{type:"button",class:"op-back","aria-label":"Volver",onclick:cerrar},"‹ "+(o.volver||"Volver"))]),
      E("div",{class:"op-scroll"},[E("div",{class:"op-hd"},[o.ruta&&o.ruta.length?E("div",{class:"op-ruta",text:o.ruta.join("  ›  ")}):null,E("div",{class:"op-tit"},E("h2",{text:o.titulo})),o.sub?E("div",{class:"op-sub",text:o.sub}):null]),
        tabs.length>1?tb:null,body])]));
    ov._cerrar=cerrar;document.addEventListener("keydown",esc);document.body.appendChild(ov);pinta();return{ov,cerrar,irTab:i=>{cur=i;pinta();}};}
  window.abrePantalla=abrePantalla;

  /* ---------- 2. apartados plegados → pantalla ---------- */
  const tituloVista=()=>{const h=document.querySelector(".pg-h,#view h1,main h1");return h?(h.textContent||"").replace(/\s*\?\s*$/,"").trim():"";};
  function partes(d){const sm=d.querySelector(":scope>summary");if(!sm)return null;const h=sm.querySelector("h2,h3,b,strong");
    const tit=((h||sm).textContent||"").replace(/\s+/g," ").replace(/^[▸▾›]\s*/,"").trim();if(!tit)return null;
    const so=sm.querySelector(".der,.sub,small");const sub=so&&so!==h?(so.textContent||"").trim():"";
    return{tit,sub,kids:[...d.childNodes].filter(n=>n!==sm)};}
  function convDetalles(raiz){if(!raiz)return;
    raiz.querySelectorAll("details:not([data-nv])").forEach(d=>{d.setAttribute("data-nv","1");
      /* solo los que están cerrados (los abiertos ya se ven) y que no son filtros, ayudas de un campo o cosas de un formulario */
      if(d.open||d.matches(".filtro-pl,.nv-no,.ejs")||d.closest("form,.dlg,.ov,.nv-ov,.ficha-ov,.dlg-ov,.stk-det"))return;
      const P=partes(d);if(!P)return;const vista=tituloVista(),clave=vista+"|"+P.tit;
      const ab=[...document.querySelectorAll(".nv-ov")].find(o=>o._clave===clave);
      if(ab&&ab._box){ab._box.textContent="";P.kids.forEach(n=>ab._box.appendChild(n));}
      const b=E("button",{type:"button",class:"abre-pant"+(d.classList.contains("card")?" card":""),"aria-haspopup":"dialog",onclick:()=>{
          const box=E("div",{class:"abre-cont"});P.kids.forEach(n=>box.appendChild(n));box.querySelectorAll("details").forEach(z=>{z.open=true;z.setAttribute("data-nv","1");});
          const p=abrePantalla({titulo:P.tit,sub:P.sub&&P.sub!==P.tit?P.sub:null,ruta:[cfg().nombre||"",vista].filter(Boolean),volver:vista||"Volver",tabs:[["Todo",[box]]],alCerrar:()=>{try{(cfg().repinta||(()=>{}))();}catch(e){}}});
          p.ov._clave=clave;p.ov._box=box;}},
        [E("span",{class:"abre-tx"},[E("b",{text:P.tit}),P.sub&&P.sub!==P.tit?E("span",{class:"sub",text:P.sub}):null]),E("span",{class:"abre-fl","aria-hidden":"true",text:"›"})]);
      if(d.id)b.id=d.id;[...d.classList].filter(c=>c!=="card").forEach(c=>b.classList.add(c));d.replaceWith(b);});}

  /* ---------- 3. lo que se nombra se puede tocar ---------- */
  let mapa=null,firma="";
  function mapaEnl(){const f=cfg().firma?String(cfg().firma()):"";if(mapa&&mapa.size&&f===firma)return mapa;
    const M=new Map();try{(cfg().enlaces?cfg().enlaces():[]).forEach(([t,tipo,ir])=>{const k=String(t||"").replace(/\s+/g," ").trim().toLowerCase();if(k.length>=2&&!M.has(k))M.set(k,{t:tipo,ir});});}catch(e){}
    mapa=M;firma=f;return M;}
  function enlazar(raiz){if(!raiz)return;const M=mapaEnl();if(!M.size)return;
    raiz.querySelectorAll("td:not([data-enl]),.it:not(button):not(a) .t1:not([data-enl]),.linea:not(button) .t1:not([data-enl])").forEach(c=>{try{c.setAttribute("data-enl","1");
      if(c.closest("form,button,a,label,.fila-link,[onclick],thead,.dlg-b,.op-hd"))return;if(c.querySelector("button,a,input,select,textarea"))return;
      /* si la fila entera ya hace algo al tocarla (se nota en que el ratón sale como una mano), no se pone enlace */
      const tr=c.closest("tr,.it,.linea");if(tr&&(tr.onclick||tr.classList.contains("fila-link")||getComputedStyle(tr).cursor==="pointer"))return;
      const busca=t=>{t=(t||"").replace(/\s+/g," ").trim();if(!t||t.length>80)return null;const k=t.toLowerCase();if(M.has(k))return M.get(k);
        if(/ · /.test(t)){const ps=t.split(" · ").map(z=>z.trim().toLowerCase());for(const z of [ps[0],ps[ps.length-1]])if(M.has(z))return M.get(z);}return null;};
      const nodos=[c].concat([...c.children].filter(n=>!n.matches(".pill,.sub,small")));
      for(const n of nodos){const x=busca(n.textContent);if(!x)continue;
        const b=E("button",{type:"button",class:"enl",title:"Abrir "+String(x.t||"").toLowerCase(),onclick:ev=>{ev.stopPropagation();x.ir();}});[...n.childNodes].forEach(z=>b.appendChild(z));
        n.textContent="";n.appendChild(b);return;}}catch(e){}});}
  window.enlazarNav=enlazar;

  /* se pasa un poco después de cada cambio en la pantalla o en lo que se abre encima */
  let pend=0;const pasa=()=>{pend=0;try{const v=document.querySelector(cfg().vista||"#view");convDetalles(v);enlazar(v);
      document.querySelectorAll(".nv-ov .op-body,.ficha-ov,.dlg-ov .dlg,.ov").forEach(enlazar);}catch(e){}};
  const arranca=()=>{obsOv.observe(document.body,{childList:true});new MutationObserver(()=>{if(!pend)pend=setTimeout(pasa,60);}).observe(document.body,{childList:true,subtree:true});pasa();};
  if(document.body)arranca();else document.addEventListener("DOMContentLoaded",arranca);
})();

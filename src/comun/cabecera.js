/* Cabecera de cada pantalla (como en los programas de gestión): ruta, icono con el color del apartado, título,
   una frase de qué es y los botones principales de esa pantalla. Pone el color del apartado en toda la página
   (html[data-sec]) y, al cambiar de pantalla, hace entrar el contenido con una pequeña animación.
   Uso: vista.appendChild(cabeceraPg({ruta:["Coladas"],titulo:"Consumo",sub:"…",color:"naranja",icono:"<svg…>",acciones:[{t,fn,sec}],vista}))
   Colores: azul, naranja, verde, morado, turquesa, ambar, indigo, rosa, gris. */
(function(){
  let ultima=null;
  function nodo(t,cls,txt){const e=document.createElement(t);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
  window.cabeceraPg=function(o){o=o||{};
    document.documentElement.setAttribute("data-sec",o.color||"azul");
    const h=nodo("section","pg-hd");h.setAttribute("aria-label",o.titulo||"");
    const ruta=(o.ruta||[]).filter(Boolean);
    if(ruta.length){const r=nodo("div","pg-ruta");ruta.forEach((x,i)=>{const t=typeof x==="string"?{t:x}:x;
        const s=t.fn?nodo("button","pg-ruta-b",t.t):nodo("span",null,t.t);if(t.fn){s.type="button";s.onclick=t.fn;}r.appendChild(s);r.appendChild(nodo("span","pg-ruta-s","/"));});
      r.appendChild(nodo("b",null,o.titulo||""));h.appendChild(r);}
    const f=nodo("div","pg-fila");
    if(o.icono){const i=nodo("span","pg-ico");i.innerHTML=o.icono;i.setAttribute("aria-hidden","true");f.appendChild(i);}
    const tt=nodo("div","pg-tit");tt.appendChild(nodo("h1","pg-h",o.titulo||""));if(o.sub)tt.appendChild(nodo("p","pg-sub",o.sub));f.appendChild(tt);
    const acc=(o.acciones||[]).filter(Boolean);
    if(acc.length){const a=nodo("div","pg-acc");acc.forEach(x=>{const b=nodo("button","btn"+(x.sec?" sec":""),x.t);b.type="button";if(x.id)b.id=x.id;b.onclick=x.fn;a.appendChild(b);});f.appendChild(a);}
    h.appendChild(f);
    if(o.extra)h.appendChild(o.extra);
    /* animación solo al cambiar de pantalla, no cada vez que se repinta con datos nuevos */
    const k=ruta.map(x=>typeof x==="string"?x:x.t).join("/")+"/"+(o.titulo||"");
    if(o.vista&&k!==ultima){const v=o.vista;v.classList.remove("pg-entra");void v.offsetWidth;v.classList.add("pg-entra");
      setTimeout(()=>v.classList.remove("pg-entra"),450);}
    ultima=k;
    return h;};
  /* buscador grande en la barra de arriba (en el iPad y el ordenador): el botón «Buscar» pasa a parecer un campo de búsqueda */
  const LUPA={coladas:"Busca una colada, un camión, un albarán…",almacen:"Busca un artículo, una máquina, un eje…"};
  function lupaLarga(){const b=document.getElementById("lupa");if(!b||b.querySelector(".lupa-l"))return;const sc=document.querySelector("script[data-app]");const app=sc&&sc.getAttribute("data-app");
    if(!LUPA[app])return;const s=document.createElement("span");s.className="lupa-l";s.textContent=LUPA[app];b.appendChild(s);b.classList.add("lupa-campo");}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",lupaLarga);else lupaLarga();
  window.svgPg=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
})();

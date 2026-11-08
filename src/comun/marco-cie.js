/* ===== MARCO COMÚN DE LAS PÁGINAS DE CIE (Toolbox, Encargado, Calendario, Hornos) =====
   Para que se vean igual que Limpieza: en el ordenador y el iPad, el mismo menú azul oscuro a la izquierda (Día, Semana,
   Tareas, Equipo, Avisos, Resumen, Toolbox, Encargado, Calendario) con la página en la que estás marcada. En el móvil no
   cambia nada (allí ya tienen la cabecera azul oscuro y su barra de abajo). Solo para el jefe y el encargado. */
(function(){
  const sc=document.querySelector("script[data-app]");const app=sc&&sc.getAttribute("data-app");
  if(!["toolbox","encargado","calendario","hornos"].includes(app))return;
  let yo=null;try{yo=JSON.parse(localStorage.getItem("limp.yo")||"null");}catch(e){}
  const jefe=!!(yo&&yo.rol==="admin"),enc=!!(yo&&yo.encargado);
  if(!jefe&&!enc)return;
  const ICL={hoy:'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',semana:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',tareas:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',equipo:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2c2.8.3 5 2.6 5 5.8"/>',avisos:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',resumen:'<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',mas:'<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',toolbox:'<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',encargado:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',calendario:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3"/>'};
  const L=jefe?[["hoy","Día","limpieza.html"],["semana","Semana","limpieza.html?ir=semana"],["tareas","Tareas","limpieza.html?ir=tareas"],["equipo","Equipo","limpieza.html?ir=equipo"],
      ["avisos","Avisos","limpieza.html?ir=avisos"],["resumen","Resumen","limpieza.html?ir=resumen"],["toolbox","Toolbox","toolbox.html"],["encargado","Encargado","encargado.html"],["calendario","Calendario","calendario.html"]]
    :[["hoy","Día","limpieza.html"],["toolbox","Toolbox EPI","toolbox.html"],["encargado","Encargado","encargado.html"]];
  function pon(){if(document.getElementById("cie-side"))return;const n=document.createElement("nav");n.id="cie-side";n.className="cie-side";n.setAttribute("aria-label","Apartados de Limpieza");
    L.forEach(([k,t,u])=>{const a=document.createElement("a");a.href=u;if(k===app)a.setAttribute("aria-current","page");
      a.innerHTML='<span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICL[k]||"")+'</svg></span>';
      const s=document.createElement("span");s.textContent=t;a.appendChild(s);n.appendChild(a);});
    document.body.appendChild(n);document.documentElement.classList.add("con-cie-side");
    /* Encargado: sus apartados (Hoy, Instrucciones, Trabajos, Checklist, Incidencias…) salen desplegados debajo en el menú,
       en vez de en la barra de abajo */
    if(app==="encargado"){const sub=document.createElement("div");sub.className="cie-sub";const ya=n.querySelector('a[aria-current="page"]');if(ya)ya.after(sub);else n.appendChild(sub);
      const copia=()=>{const nav=document.getElementById("nav");sub.textContent="";if(!nav)return;
        [...nav.querySelectorAll(":scope>button")].forEach(b=>{const x=document.createElement("button");x.type="button";
          x.textContent=[...b.querySelectorAll("span")].map(z=>z.textContent).filter(t=>t&&t.trim().length>1).pop()||b.textContent.trim();
          const nb=b.querySelector("b.n");if(nb&&nb.textContent.trim()){const c=document.createElement("b");c.className="n";c.textContent=nb.textContent;x.appendChild(c);}
          if(b.getAttribute("aria-selected")==="true")x.setAttribute("aria-current","true");x.onclick=()=>b.click();sub.appendChild(x);});};
      const nav=document.getElementById("nav");if(nav){new MutationObserver(copia).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:["aria-selected"]});copia();}}}
  if(document.body)pon();else document.addEventListener("DOMContentLoaded",pon);
  /* Toolbox: cabecera de cada apartado como en las demás apps (Toolbox, Formación, Documentos) */
  if(app==="toolbox"&&window.cabeceraPg){const SEC={toolbox:["turquesa","Toolbox","Charlas del mes, firmas y envío a prevención"],form:["verde","Formación","Formación práctica en el puesto"],
      docs:["indigo","Documentos","EPIs, fichas y documentos de prevención"]};
    const ICO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(ICL.toolbox||"")+'</svg>';
    const pone=()=>{const w=document.querySelector("#app .wrap");const t=document.querySelector("#app .tabs button.on[data-sec]");if(!w||!t||w.querySelector(":scope>.pg-hd"))return;
      const k=t.getAttribute("data-sec"),C=SEC[k]||[ "turquesa",t.textContent.trim(),""];
      const h=cabeceraPg({ruta:["Toolbox HSE"],titulo:C[1],sub:C[2],color:C[0],icono:ICO,vista:w});w.insertBefore(h,w.firstChild);};
    const ob=new MutationObserver(()=>pone());const go=()=>{const a=document.getElementById("app");if(a){ob.observe(a,{childList:true,subtree:true});pone();}};
    if(document.body)go();else document.addEventListener("DOMContentLoaded",go);}
})();

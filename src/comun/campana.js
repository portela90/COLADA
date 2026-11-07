/* Campana de avisos (como en los programas de gestión): todo lo pendiente de la app en un sitio, con un número.
   Cada app pone sus avisos con campana.pon("origen",[{niv:"bad"|"warn"|"info",t:"texto",d:"detalle",fn:()=>…}]).
   El número cuenta lo urgente y lo que hay que hacer (rojo y ámbar); lo informativo sale en la lista pero no suma.
   La campana va en la cabecera de arriba, al lado de Buscar o de Salir. */
(function(){
  const F={};let btn=null,pan=null;
  const nodo=(t,cls,txt)=>{const e=document.createElement(t);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;};
  const ICO='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';
  function todos(){const o=[];Object.keys(F).forEach(k=>(F[k]||[]).forEach(x=>o.push(x)));const ord={bad:0,warn:1,info:2};return o.sort((a,b)=>(ord[a.niv]??2)-(ord[b.niv]??2));}
  function sitio(){const h=document.querySelector("#app>header")||document.querySelector("body>header");if(!h)return null;
    return{h,antes:h.querySelector(".lupa:not([style*='hidden'])")||h.querySelector("#bprueba")||h.querySelector("#bsalir")||null};}
  function pintaBoton(){const s=sitio();if(!s)return;
    if(!btn||!btn.isConnected){btn=nodo("button","campana");btn.type="button";btn.innerHTML=ICO;btn.appendChild(nodo("span","campana-n"));btn.onclick=abrir;
      if(s.antes&&s.antes.parentNode===s.h)s.h.insertBefore(btn,s.antes);else s.h.appendChild(btn);}
    const L=todos(),n=L.filter(x=>x.niv!=="info").length,b=btn.querySelector(".campana-n");
    b.textContent=n>99?"99+":String(n);b.hidden=!n;btn.classList.toggle("hay-bad",L.some(x=>x.niv==="bad"));
    btn.setAttribute("aria-label",n?"Avisos: "+n+" pendientes":"Avisos: nada pendiente");btn.title=btn.getAttribute("aria-label");
    if(pan&&pan.isConnected)lista(pan.querySelector(".campana-l"));}
  function lista(box){box.textContent="";const L=todos();
    if(!L.length){box.appendChild(nodo("p","campana-vacia","Todo al día. No hay nada pendiente."));return;}
    L.forEach(x=>{const it=nodo("button","campana-it "+(x.niv||"info"));it.type="button";
      it.appendChild(nodo("span","campana-p"));const tx=nodo("span","campana-tx");tx.appendChild(nodo("b",null,x.t));if(x.d)tx.appendChild(nodo("small",null,x.d));it.appendChild(tx);
      it.appendChild(nodo("span","campana-fl","›"));
      it.onclick=()=>{cerrar();try{if(x.fn)x.fn();else if(x.href)location.href=x.href;}catch(e){}};box.appendChild(it);});}
  function cerrar(){if(pan){pan.remove();pan=null;}document.removeEventListener("keydown",esc);}
  function esc(e){if(e.key==="Escape")cerrar();}
  function abrir(){if(pan){cerrar();return;}
    pan=nodo("div","campana-ov");pan.addEventListener("click",e=>{if(e.target===pan)cerrar();});
    const p=nodo("div","campana-pan");p.setAttribute("role","dialog");p.setAttribute("aria-label","Avisos");
    const hd=nodo("div","campana-hd");hd.appendChild(nodo("b",null,"Avisos"));const L=todos(),n=L.filter(x=>x.niv!=="info").length;
    hd.appendChild(nodo("span",null,n?n+(n===1?" pendiente":" pendientes"):"todo al día"));const x=nodo("button","campana-x","✕");x.type="button";x.setAttribute("aria-label","Cerrar");x.onclick=cerrar;hd.appendChild(x);
    p.appendChild(hd);const l=nodo("div","campana-l");p.appendChild(l);lista(l);pan.appendChild(p);document.body.appendChild(pan);document.addEventListener("keydown",esc);}
  window.campana={pon(k,L){F[k]=(L||[]).filter(x=>x&&x.t);pintaBoton();},quita(k){delete F[k];pintaBoton();},abrir,lista:todos,repinta:pintaBoton};
})();

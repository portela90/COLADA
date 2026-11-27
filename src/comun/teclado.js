/* ===== Con el teclado del móvil abierto, que se vea lo que escribes (27/11/2026) =====
   En el móvil, al escribir en una casilla el teclado tapa media pantalla. Lo que va pegado abajo (la barra de
   pestañas, «Volver a la ronda», la barra de «Guardar recuento») se quedaba encima del teclado y no dejaba ver
   nada. Mientras escribes, eso se esconde (o deja de ir pegado) y la casilla se coloca a la vista.
   Al salir de la casilla vuelve todo. Solo en pantallas táctiles: en el ordenador no cambia nada. */
(function(){
  try{if(!window.matchMedia||!matchMedia("(pointer:coarse)").matches)return;}catch(e){return;}
  var st=document.createElement("style");
  st.textContent="html.teclado nav#tabs,html.teclado .ronda-volver,html.teclado .bar-teclado{display:none!important}"+
    "html.teclado .rd-bar{position:static!important;box-shadow:none!important}"+
    "html.teclado #app{padding-bottom:0!important}";
  document.head.appendChild(st);
  var escribe=function(n){if(!n||!n.tagName)return false;var t=n.tagName;if(t==="TEXTAREA")return true;if(t==="SELECT")return false;
    if(t!=="INPUT")return !!n.isContentEditable;var ty=(n.type||"text").toLowerCase();return ["checkbox","radio","button","submit","reset","file","range","color","date","time","datetime-local","month","week"].indexOf(ty)<0;};
  var quita=null;
  document.addEventListener("focusin",function(e){if(!escribe(e.target))return;if(quita){clearTimeout(quita);quita=null;}
    document.documentElement.classList.add("teclado");
    var n=e.target;setTimeout(function(){try{n.scrollIntoView({block:"center",behavior:"smooth"});}catch(x){}},300);});
  document.addEventListener("focusout",function(e){if(!escribe(e.target))return;
    /* espera un poco: si pasas a la casilla siguiente, el teclado no se cierra */
    quita=setTimeout(function(){quita=null;if(!escribe(document.activeElement))document.documentElement.classList.remove("teclado");},250);});
})();

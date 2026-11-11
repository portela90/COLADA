/* ===== «¿No cuadra?»: el usuario cuenta lo que ve mal y se apunta en app_errores con lo que mostraba la pantalla
   (qué pantalla o colada, sus números) para revisarlo después con el caso exacto. No cambia nada en los datos. */
function avisoNoCuadraC(ctx){let t="";const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)ov.remove();}});
  const ta=el("textarea",{id:"ncTxt",rows:4,style:"width:100%",placeholder:"p. ej. dice que quedan 12 fardos y hay 10",oninput:e=>t=e.target.value});
  ov.appendChild(el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"¿Qué no cuadra?"},[el("h3",{text:"¿Qué no cuadra?"}),
    el("p",{class:"sub",text:ctx.titulo+": cuéntalo con tus palabras (qué ves y qué debería salir). Se guarda con los datos de esta pantalla para revisarlo."}),ta,
    el("div",{class:"dlg-b"},[el("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:()=>ov.remove()}),el("button",{type:"button",class:"btn",id:"ncEnviar",text:"Enviar",onclick:()=>{
      t=String(t).trim();if(!t){toast("Escribe qué no cuadra");return;}
      const c=Object.assign({},ctx,{quien:(window.yoNombre&&window.yoNombre())||""});
      try{if(window.__NC_MOCK)window.__NC_MOCK.push({t,ctx:c});else if(window.reportarError)window.reportarError(new Error("Aviso de usuario: "+t.slice(0,300)),JSON.stringify(c).slice(0,1500));}catch(e){}
      ov.remove();toast("Apuntado. Lo revisamos con los datos de esta pantalla");}})])]));
  document.body.appendChild(ov);setTimeout(()=>ta.focus(),50);}
const txtVista=n=>String((n&&n.innerText)||"").replace(/\s+/g," ").trim().slice(0,900);
/* al pie de cada pantalla */
function pieNoCuadra(){const v=$("view");if(!v||!ready||!db||v.querySelector(".nc-pie"))return;
  v.appendChild(el("div",{class:"nc-pie"},el("button",{type:"button",class:"btn txt peq",id:"ncPie",text:"¿Algo no cuadra en esta pantalla?",onclick:()=>{
    const nb=[...document.querySelectorAll("#tabs button")].find(b=>b.classList.contains("on")||b.getAttribute("aria-current")==="page"||b.getAttribute("aria-selected")==="true");
    avisoNoCuadraC({tipo:"Pantalla",titulo:(nb&&nb.textContent.trim())||tab||"Pantalla",pant:typeof tab!=="undefined"?tab:"",
      tarjetas:[...v.querySelectorAll(".card h2")].map(h=>h.textContent.trim()).slice(0,12),ve:txtVista(v)});}})));}
/* en la ficha de una colada */
function botonNoCuadraFicha(l,body){return el("button",{type:"button",class:"btn txt peq",id:"ncFicha",style:"margin-left:auto",text:"¿No cuadra?",onclick:()=>{
  avisoNoCuadraC({tipo:"Colada",titulo:"Colada "+(l.nombre||"?"),lote:l.id,nave:l.nave||"",material:l.material||"",ve:txtVista(body)});}});}

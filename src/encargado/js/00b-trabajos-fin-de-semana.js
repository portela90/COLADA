/* ---------------- TRABAJOS DEL FIN DE SEMANA (encargado) ----------------
   El jefe sube el Excel. El encargado ve los trabajos del sábado y del domingo para revisarlos
   a primera hora y, si hace falta, cambiarles el día. */
async function vTrabFinde(v){
  const sab=sabadoObj(), dom=sumaD(sab,1);
  v.appendChild(el("p",{class:"hint",text:"Trabajos del fin de semana. Revísalos a primera hora: si hace falta, cambia el día de cualquiera."}));
  const box=el("div",null,el("div",{class:"empty",text:"Cargando…"}));
  v.appendChild(box);
  const cargar=async()=>{
    let A,B;
    try{ [A,B]=await Promise.all([rpc("ots_dia",{p_tok:S.tok,p_fecha:sab}),rpc("ots_dia",{p_tok:S.tok,p_fecha:dom})]); }
    catch(e){ box.textContent=""; box.appendChild(el("div",{class:"empty",text:e.message})); return; }
    box.textContent="";
    [["Sábado",sab,A.dia||[]],["Domingo",dom,B.dia||[]]].forEach(([nom,f,lista])=>{
      box.appendChild(el("div",{class:"h2",text:nom+" · "+fCorta(f)}));
      if(!lista.length){ box.appendChild(el("div",{class:"empty",text:"Sin trabajos este día."})); return; }
      lista.forEach(o=>box.appendChild(tarjetaFinde(o,sab,dom,cargar)));
    });
  };
  await cargar();
}

function tarjetaFinde(o,sab,dom,recargar){
  const hecha=o.estado==="hecha";
  const quien=(o.nombres||[]).length?o.nombres.join(", "):"Sin persona (lo reparte el encargado)";
  const elegir=el("div",{class:"chips",style:"margin-top:8px"},[
    ...[["Sábado",sab],["Domingo",dom]].map(([t,f])=>el("button",{type:"button",class:"chip","aria-pressed":String(o.fecha===f),text:t,
      onclick:async()=>{ if(o.fecha===f) return;
        try{ await rpc("ot_mia_editar",{p_tok:S.tok,p_ot:o.id,p:{titulo:o.titulo,lugar:o.lugar,descripcion:o.descripcion,urgente:o.prioridad==="alta",fecha:f}});
          toast("Cambiado a "+(f===sab?"sábado":"domingo")); recargar(); }
        catch(e){ toast(e.message); } }}))]);
  return el("div",{class:"card"},el("div",{class:"bd"},[
    el("div",{class:"row",style:"justify-content:space-between;align-items:flex-start;gap:8px"},[
      el("b",{style:"overflow-wrap:anywhere",text:o.titulo}),
      el("span",{class:"pill"+(hecha?" ok":""),text:hecha?"Hecha":(o.estado==="en_curso"?"En curso":"Pendiente")})]),
    o.lugar?el("div",{class:"meta",text:"Lugar: "+o.lugar}):null,
    o.descripcion?el("div",{class:"meta",text:o.descripcion}):null,
    el("div",{class:"meta",text:"Persona: "+quien}),
    hecha?null:elegir
  ]));
}

/* ---------------- HOY (pantalla de inicio del encargado) ---------------- */
async function vHoy(v){
  const h=hoyISO();
  v.appendChild(el("div",{class:"h2",style:"margin-top:0",text:"Hoy · "+fCorta(h)}));
  const bloque=(titulo,texto,fn,aviso)=>el("button",{class:"card",type:"button",style:"width:100%;text-align:left;display:grid;gap:4px;margin:0 0 10px;cursor:pointer",onclick:fn},[
    el("div",{style:"display:flex;gap:8px;align-items:center"},[el("b",{style:"flex:1;font-size:17px",text:titulo}),aviso?el("span",{class:"pill warn",text:aviso}):null]),
    el("span",{class:"meta",text:texto})]);
  const ir=t=>()=>{S.tab=t;ls.set("enc.tab",t);pinta();window.scrollTo(0,0);};
  v.appendChild(bloque("Trabajos del fin de semana","Revísalos a primera hora y cambia el día si hace falta",ir("excel")));
  v.appendChild(bloque("Checklist de hoy","Lo que hay que revisar en la nave",ir("check")));
  const ab=S.res.inc_abiertas||0, ur=S.res.inc_urgentes||0;
  v.appendChild(bloque("Problemas abiertos",ab?(ab+" sin resolver"+(ur?" · "+ur+" urgente"+(ur>1?"s":""):"")):"No hay ninguno abierto",ir("inc"),ur?"Urgente":null));
  const sin=S.res.traspasos_sin_leer||0;
  v.appendChild(bloque("Instrucciones de Cristian",sin?(sin+" sin leer"):"Al día",ir("inicio"),sin?"Nuevo":null));
}

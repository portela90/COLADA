/* ---------- Entradas sin albarán: se meten con lo que se sabe y se completan después ---------- */
function sinAlbaran(){const o=[];todosMovs().forEach(r=>{if(r.t==="E"&&r.sa&&!r.h){const l=lotes.find(x=>x.id===r.d);if(l)o.push({r,l});}});return o.sort((a,b)=>a.r.f.localeCompare(b.r.f));}
function cardSinAlb(){const L=sinAlbaran();if(!L.length)return null;
  return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Sin albarán ("+L.length+")"}),el("span",{class:"sub",style:"margin-left:auto",text:"complétalas cuando llegue"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},L.map(({r,l})=>el("div",{class:"sa-row"},[
      el("div",{style:"flex:1;min-width:0"},[el("b",{text:l.nombre||"Coladas por saber"}),
        el("div",{class:"sub",text:dmy(r.f)+" · "+l.nave+" · "+MAT[l.material].nom+" · "+fmt(r.fa)+" f · "+fmt(r.kg)+" kg"+(r.ke?" (estimados)":"")+(l.proveedor?" · "+l.proveedor:"")})]),
      el("button",{type:"button",class:"btn",text:"Completar",onclick:()=>completarAlb(r,l)})])))]);}
function completarAlb(r,l){const v={a:r.a||l.albaran||"",col:l.nombre||"",kg:r.ke?"":String(r.kg).replace(".",","),fa:String(r.fa),obs:l.obs||"",foto:null};
  const inp=(lab,k,o)=>el("label",{text:lab},[el("input",Object.assign({type:"text",value:v[k],oninput:e=>{v[k]=e.target.value;}},o||{}))]);
  const err=el("div",{class:"banner b",hidden:""});
  const cerrar=()=>ov.remove();
  const guardar=async e=>{const kg=numES(v.kg),fa=numES(v.fa),mal=[];
    if(!v.a.trim())mal.push("Pon el nº de albarán.");if(!v.col.trim())mal.push("Pon las coladas.");
    if(!(kg>0))mal.push("Pon los kilos del albarán.");if(!(fa>0))mal.push("Los fardos tienen que ser mayor que 0.");
    if(mal.length){err.textContent=mal.join(" ");err.hidden=false;return;}
    const b=e.currentTarget;b.disabled=true;b.textContent="Guardando…";
    try{let ft=r.ft||null;if(v.foto){try{ft=await subirFoto(v.foto);}catch(x){toast("La foto no se pudo subir");}}
      const n=Object.assign({},r,{kg,fa,a:v.a.trim(),ed:hoy()});delete n.sa;delete n.ke;if(ft)n.ft=ft;if(v.obs.trim())n.n=v.obs.trim();
      await guardarMov(r,n);
      await db.doc("lotes/"+l.id).update({nombre:v.col.trim(),albaran:v.a.trim(),obs:v.obs.trim(),sinAlb:null});
      cerrar();toast("Entrada completada con el albarán "+v.a.trim());
    }catch(x){b.disabled=false;b.textContent="Guardar";err.textContent="No se pudo guardar. Inténtalo otra vez.";err.hidden=false;}};
  const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)cerrar();}},[el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"Completar con el albarán"},[
    el("h3",{text:"Completar con el albarán"}),
    el("p",{class:"sub",text:"Llegó el "+dmy(r.f)+" · "+l.nave+" · "+MAT[l.material].nom+(r.ke?" · se apuntaron "+fmt(r.kg)+" kg estimados":"")}),
    el("form",{onsubmit:e=>e.preventDefault()},[inp("Nº albarán","a"),inp("Coladas (todas)","col",{placeholder:"C25058-C25066",autocapitalize:"characters",autocomplete:"off",spellcheck:"false"}),
      el("div",{class:"row"},[inp("Kilos del albarán","kg",{class:"num",inputmode:"decimal"}),inp("Fardos","fa",{class:"num",inputmode:"numeric"})]),
      inp("Observaciones","obs",{placeholder:"desglose de coladas…"}),
      el("label",{text:"Foto del albarán (opcional)"},[el("input",{type:"file",accept:"image/*",onchange:e=>{v.foto=e.target.files&&e.target.files[0]||null;}})]),
      el("p",{class:"hint",text:"Los consumos que ya se hayan apuntado de esta entrada se quedan como están; los kilos por fardo se recalculan con los reales."}),err]),
    el("div",{class:"dlg-b"},[el("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:cerrar}),el("button",{type:"button",class:"btn",text:"Guardar",onclick:guardar})])])]);
  document.body.appendChild(ov);}
function vEntrada(){
  const d=draft.ent;if(!d.fecha)d.fecha=hoy();if(!d.donde)d.donde="nave";
  const provs=(cfg.proveedores||[]).slice().sort((a,b)=>a.localeCompare(b,"es"));
  const selP=el("select",{id:"e-prov",onchange:e=>{d.prov=e.target.value;const pe=$("e-prec");if(pe)pe.textContent=txtPrecio();}},
    [el("option",{value:"",text:"— proveedor —"})].concat(provs.map(p=>{const o=el("option",{value:p,text:p});if(d.prov===p)o.selected=true;return o;})));
  /* sin albarán: si no se saben los kilos se calculan con los kg/fardo medios de esa aleación */
  const kgFa=()=>{if(!d.mat)return null;const mc=mediaCamion(d.mat,d.prov);return mc&&mc.fa>0&&mc.kg>0?mc.kg/mc.fa:null;};
  const kgEst=()=>{const nf=numES(d.fardos||""),r=kgFa();return d.sinAlb&&!(numES(d.kg||"")>0)&&nf>0&&r?Math.round(nf*r):null;};
  const valida=()=>{const nk=numES(d.kg||""),nf=numES(d.fardos||"");
    return !!d.nave&&!!d.mat&&!!d.fecha&&((!isNaN(nk)&&nk>0)||kgEst()>0)&&!isNaN(nf)&&nf>0&&!!(d.colada||"").trim();};
  const nk=numES(d.kg||""),nf=numES(d.fardos||"");
  const ok=valida();
  /* Al escribir sólo se actualizan el botón y los kg/fardo: redibujar entero
     cortaba la escritura en el iPad (autocorrector) y borraba lo tecleado. */
  const vivo=()=>{const b=$("e-go");if(b&&b.textContent==="Registrar entrada")b.disabled=!valida();
    const k=numES(d.kg||""),f=numES(d.fardos||""),c=$("e-calc");
    if(c){const hay=!isNaN(k)&&!isNaN(f)&&f>0;c.hidden=!hay;if(hay)c.firstChild.textContent=(Math.round(k/f*100)/100).toLocaleString("es-ES");}
    const pe=$("e-prec");if(pe)pe.textContent=txtPrecio();
    const ke=$("e-kgest");if(ke){const x=kgEst();ke.hidden=!d.sinAlb;ke.textContent=x?"Sin kilos: se apuntan "+fmt(x)+" kg estimados ("+(Math.round(kgFa()*10)/10).toLocaleString("es-ES")+" kg/fardo de media). Los cambias por los reales al completar con el albarán.":d.sinAlb?"Si no sabes los kilos déjalos en blanco: se calculan con los fardos.":"";}};
  /* precio que se aplicará a esta entrada: el del proveedor en el mes del albarán */
  const txtPrecio=()=>{if(!d.prov||!d.mat)return"Elige proveedor y aleación para ver el precio.";
    const pr=precioDe(mesDe(d.fecha),d.prov,d.mat),k=numES(d.kg||"");
    if(!pr.v)return"Sin precio para "+d.prov+" "+MAT[d.mat].nom+" en "+nomMes(mesDe(d.fecha))+". Mételo en la pestaña Precios.";
    return"Precio "+d.prov+" "+MAT[d.mat].nom+": "+eurT(pr.v)+" €/t"+(pr.m!==mesDe(d.fecha)?" (de "+nomMes(pr.m)+")":"")+(k>0?" · importe "+eur(k/1000*pr.v):"");};
  const form=el("form",{onsubmit:async e=>{e.preventDefault();if(!valida())return;const est=kgEst(),nk=est||numES(d.kg||""),nf=numES(d.fardos||"");const b=$("e-go");b.disabled=true;
    try{
      let ft=null;
      if(d.foto){b.textContent="Subiendo la foto…";
        try{ft=await subirFoto(d.foto);}catch(err){toast("La foto no se pudo subir; guardo la entrada sin ella");}}
      b.textContent="Guardando…";
      const col=(d.colada||"").trim(),id=uid("l");
      await db.doc("lotes/"+id).set({nombre:col,material:d.mat,nave:d.nave,donde:d.donde,kgInv:0,fardosInv:0,
        albaran:(d.alb||"").trim(),proveedor:d.prov||"",entrada:d.fecha,obs:(d.obs||"").trim(),sinAlb:d.sinAlb?true:null});
      const rec={i:uid("m"),t:"E",f:d.fecha,d:id,kg:nk,fa:nf};if(d.sinAlb)rec.sa=1;if(est)rec.ke=1;
      if(d.prov)rec.p=d.prov;if((d.alb||"").trim())rec.a=(d.alb||"").trim();if((d.obs||"").trim())rec.n=(d.obs||"").trim();
      if(ft)rec.ft=ft;
      await addMov(rec);toast("Entrada registrada"+(d.sinAlb?" sin albarán":"")+(ft?" con foto":"")+": "+fmt(nk)+" kg"+(est?" estimados":""));
      if(d.plan){try{await marcarPlan(d.plan,{l:id,f:d.fecha,k:key(d.nave,d.mat)});toast("Entrada registrada y camión del plan marcado como recibido");}catch(e){toast("Entrada registrada, pero no se pudo marcar el camión del plan");}}
      else{/* sin elegir el camión del plan: se busca el previsto de esa nave y aleación más cercano (±4 días) y se marca recibido */
        const k=key(d.nave,d.mat),dist=f=>Math.abs((new Date(f)-new Date(d.fecha))/864e5);
        const c=pendientesPlan().filter(x=>(x.k===k||!x.k)&&dist(x.f)<=4).sort((a,b)=>(a.k===k?0:1)-(b.k===k?0:1)||dist(a.f)-dist(b.f))[0];
        if(c){try{await marcarPlan(c,{l:id,f:d.fecha,k});toast("Entrada registrada · camión previsto del "+dmy(c.f)+" marcado como recibido");}catch(e){}}}
      draft.ent={nave:d.nave,mat:d.mat,donde:d.donde,fecha:d.fecha,prov:d.prov};render();/* el formulario queda limpio (también los datos leídos) */
    }catch(err){toast("No se pudo guardar");b.disabled=false;b.textContent="Registrar entrada";}}},[
    el("label",{class:"chk-sa"},[el("input",{type:"checkbox",checked:d.sinAlb?"":null,onchange:e=>{d.sinAlb=e.target.checked;render();}}),
      el("span",{},[el("b",{text:"No tengo el albarán todavía"}),el("small",{text:"Mete lo que sepas (fardos y las coladas que veas). Queda pendiente y lo completas cuando llegue el albarán."})])]),
    el("div",{class:"row"},[el("label",{text:"Proveedor"},[selP]),el("label",{text:"Nº albarán"+(d.sinAlb?" (si lo sabes)":"")},[el("input",{id:"e-alb",value:d.alb||"",oninput:e=>{d.alb=e.target.value;}})])]),
    el("label",{text:d.sinAlb?"Coladas que sepas":"Nº de colada"},[el("input",{id:"e-col",value:d.colada||"",placeholder:d.sinAlb?"C25070, C25071… (las que veas)":"C25058-C25066",autocomplete:"off",autocorrect:"off",autocapitalize:"characters",spellcheck:"false",oninput:e=>{d.colada=e.target.value;vivo();}})]),
    el("label",{text:"Nave a la que pertenece"},[el("div",{class:"seg"},NAVES.map(n=>el("button",{type:"button","aria-pressed":String(d.nave===n),text:n,onclick:()=>{d.nave=n;render();}})))]),
    el("label",{text:"Aleación"},[el("div",{class:"seg"},Object.keys(MAT).map(m=>el("button",{type:"button","aria-pressed":String(d.mat===m),text:MAT[m].nom,onclick:()=>{d.mat=m;render();}})))]),
    el("label",{text:"Dónde se descarga"},[el("div",{class:"seg"},[["nave","En la nave"],["externo","Almacén externo"]].map(([v,t])=>el("button",{type:"button","aria-pressed":String(d.donde===v),text:t,onclick:()=>{d.donde=v;render();}})))]),
    el("div",{class:"row"},[
      el("label",{text:d.sinAlb?"Kilos (si los sabes)":"Kilos"},[el("input",{id:"e-kg",class:"num",type:"text",inputmode:"decimal",min:"0",step:"any",value:d.kg||"",oninput:e=>{d.kg=e.target.value;vivo();}})]),
      el("label",{text:"Fardos"},[el("input",{id:"e-fa",class:"num",type:"text",inputmode:"numeric",min:"0",step:"1",value:d.fardos||"",oninput:e=>{d.fardos=e.target.value;vivo();}})]),
      el("label",{text:d.sinAlb?"Día que llegó":"Fecha albarán"},[el("input",{id:"e-f",type:"date",value:d.fecha,onchange:e=>{d.fecha=e.target.value;render();}})])
    ]),
    el("label",{text:"Observaciones"},[el("input",{id:"e-obs",value:d.obs||"",placeholder:"desglose de coladas, matrícula, pedido…",oninput:e=>{d.obs=e.target.value;}})]),
    el("label",{text:"Foto del albarán"},[
      el("input",{id:"e-foto",type:"file",accept:"image/*",onchange:e=>{d.foto=e.target.files&&e.target.files[0]?e.target.files[0]:null;d.leido=null;render();}}),
      d.foto?el("p",{class:"hint",text:"Elegida: "+d.foto.name+" ("+Math.round(d.foto.size/1024)+" KB). Se sube al guardar."}):
             el("p",{class:"hint",text:"Opcional. En el iPad puedes hacerla con la cámara en el momento."+(window.sbColada?" Con la foto, la app puede rellenar sola los datos del albarán.":"")}),
      (d.foto&&window.sbColada)?el("button",{type:"button",class:"btn",id:"e-leer",text:"Leer datos del albarán",onclick:()=>leerAlbaran(d)}):null,
      d.leido?el("div",{class:"banner "+(d.leido.confianza==="alta"?"":"w"),text:"Datos leídos de la foto"+(d.leido.confianza&&d.leido.confianza!=="alta"?" (confianza "+d.leido.confianza+")":"")+". Revísalos antes de registrar"+(d.leido.notas?": "+d.leido.notas:".")}):null
    ]),
    el("div",{id:"e-calc",class:"calc num",hidden:(!isNaN(nk)&&!isNaN(nf)&&nf>0)?null:""},[el("b",{text:(!isNaN(nk)&&!isNaN(nf)&&nf>0)?(Math.round(nk/nf*100)/100).toLocaleString("es-ES"):""}),el("span",{text:"kg por fardo"})]),
    el("p",{id:"e-kgest",class:"hint",hidden:d.sinAlb?null:"",text:""}),
    el("p",{id:"e-prec",class:"hint",text:txtPrecio()}),
    el("button",{id:"e-go",class:"btn",type:"submit",text:"Registrar entrada",disabled:ok?null:"disabled"})
  ]);
  setTimeout(vivo,0);
  return [
    cardSinAlb(),
    (()=>{const pend=pendientesPlan().filter(x=>x.f<=diaSig(diaSig(hoy())));
      if(d.plan){return el("div",{class:"banner w",style:"display:flex;gap:10px;align-items:center;flex-wrap:wrap"},[
        el("span",{style:"flex:1",text:"Camión previsto del "+dmy(d.plan.f)+(d.plan.k?" para "+etiqLinea(d.plan.k):"")+" ("+fmt(d.plan.fa)+" f). "+
          ((d.nave&&d.mat&&d.plan.k&&key(d.nave,d.mat)!==d.plan.k)?"Lo estás metiendo en "+etiqLinea(key(d.nave,d.mat))+": quedará como desviado. ":"Si hay que meterlo en otra nave, cámbiala abajo. ")+
          "Al registrar quedará marcado como recibido en el Plan."}),
        el("button",{type:"button",class:"btn sec del",text:"No es ese",onclick:()=>{delete d.plan;render();}})]);}
      if(!pend.length)return null;
      return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Camiones previstos"}),el("span",{class:"sub",style:"margin-left:auto",text:"toca el que ha llegado"})]),
        el("div",{class:"bd hueco-chips"},pend.map(x=>el("button",{type:"button",class:"chip"+(x.f<hoy()?" tarde":""),onclick:()=>llegaCamion(x),
          text:dmy(x.f)+" · "+(x.k?etiqLinea(x.k):"por decidir")+" · "+fmt(x.fa)+" f"+(x.f<hoy()?" · retrasado":"")})))]);})(),
    el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Registrar entrada"})]),el("div",{class:"bd"},[form])]),
    el("p",{class:"hint",text:"Si el albarán trae varias coladas se crea un solo lote con todas (C25058-C25066) y el desglose va en observaciones. BP o BASQUEPACK significa almacén externo. La fecha es la que escribes a boli."}),
    granCard("E")
  ];
}

/* granalla de cobre: la misma tarjeta en las dos pestañas, siempre en positivo */
function granCard(modo){
  const d=modo==="E"?draft.granE:draft.granC;
  if(modo==="C"){if(!d.turno)d.turno=TURNOS[0];if(!d.nave)d.nave=NAVES[0];}
  const v=numES(d.kg||""),ok=!isNaN(v)&&v>0;
  const vivo=()=>{const b=$("g-go-"+modo),x=numES(d.kg||"");if(b)b.disabled=!(!isNaN(x)&&x>0);};
  const f=el("form",{onsubmit:async e=>{e.preventDefault();
    const v=numES(d.kg||"");if(!(v>0))return;
    try{const rec={i:uid("m"),t:"G",f:d.fecha||hoy(),kg:(modo==="E"?v:-v),n:(d.nota||"")};
      if(modo==="C"){rec.u=d.turno;rec.nv=d.nave;}
      await addMov(rec);
      if(modo==="E")draft.granE={};else draft.granC={turno:d.turno,nave:d.nave,fecha:d.fecha};
      toast(modo==="E"?"Granalla de cobre recibida: "+fmt(v)+" kg":"Granalla de cobre consumida: "+fmt(v)+" kg");render();
    }catch(err){toast("No se pudo guardar");}}},[
    el("div",{class:"row"},[
      el("label",{text:modo==="E"?"Kilos recibidos":"Kilos consumidos"},[el("input",{id:"g-kg-"+modo,class:"num",type:"text",min:"0",step:"any",inputmode:"decimal",value:d.kg||"",oninput:e=>{d.kg=e.target.value;vivo();}})]),
      el("label",{text:"Fecha"},[el("input",{id:"g-f-"+modo,type:"date",value:d.fecha||hoy(),onchange:e=>{d.fecha=e.target.value;}})]),
      el("label",{text:modo==="E"?"Albarán o nota":"Nota"},[el("input",{id:"g-n-"+modo,value:d.nota||"",oninput:e=>{d.nota=e.target.value;}})])
    ]),
    modo==="C"?el("label",{text:"Nave"},[el("div",{class:"seg"},NAVES.map(n=>el("button",{type:"button","aria-pressed":String(d.nave===n),text:n,onclick:()=>{d.nave=n;render();}})))]):null,
    modo==="C"?el("label",{text:"Relevo"},[el("div",{class:"seg"},TURNOS.map(t=>el("button",{type:"button","aria-pressed":String(d.turno===t),text:t,onclick:()=>{d.turno=t;render();}})))]):null,
    el("button",{id:"g-go-"+modo,class:"btn sec",type:"submit",text:modo==="E"?"Registrar entrada de granalla de cobre":"Registrar consumo de granalla de cobre",disabled:ok?null:"disabled"})
  ]);
  return el("div",{class:"card"},[
    el("div",{class:"hd"},[el("span",{class:"tagm",style:"background:var(--cobre)"}),el("h2",{text:"Granalla de cobre"}),el("span",{class:"num sub",style:"margin-left:auto",text:"quedan "+fmt(granallaKg())+" kg"}),
      el("button",{type:"button",class:"btn sec",style:"font-size:13px;padding:5px 10px",text:"Ajustar",onclick:ajustarGranalla})]),
    el("div",{class:"bd"},[f])
  ]);
}

/* Ajuste por recuento físico: se pone lo que hay de verdad y se apunta la
   diferencia como ajuste (no cuenta como consumo ni en el consumo medio). */
async function ajustarLote(l,b){
  const r=await preguntar("Recuento de "+l.nombre+" ("+l.nave+", "+MAT[l.material].nom+")\n\nLa app tiene "+fmt(b.fa)+" fardos. ¿Cuántos hay de verdad?",String(b.fa),{titulo:"Ajustar colada",ok:"Siguiente"});
  if(r===null)return;
  const n=parseInt(String(r).trim(),10);
  if(!(n>=0)||String(n)!==String(r).trim()){toast("Pon un número entero de fardos");return;}
  const dif=n-b.fa;
  if(dif===0){toast("Cuadra, no hace falta ajuste");return;}
  const kg=Math.round(Math.abs(dif)*(b.ratio||0));
  const sg=dif>0?"+":"−";
  if(!(await confirmar("Ajuste de "+sg+fmt(Math.abs(dif))+" fardos ("+sg+fmt(kg)+" kg) en "+l.nombre+".\n\nQuedará en "+fmt(n)+" fardos. ¿Lo apunto?",{titulo:"Confirmar ajuste",ok:"Apuntar"})))return;
  const rec={i:uid("m"),t:"A",f:hoy(),kg,fa:Math.abs(dif),n:"Ajuste por recuento físico: "+n+" fardos (la app tenía "+b.fa+")"};
  if(dif>0)rec.d=l.id;else rec.o=l.id;
  try{await addMov(rec);toast("Ajuste apuntado");}catch(e){toast("No se pudo apuntar el ajuste");}
}

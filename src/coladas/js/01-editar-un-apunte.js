/* ---------- Editar un apunte ----------
   Se cambia en su sitio (mismo id): fecha, relevo, colada, fardos, kilos… */
function editarApunte(r){
  if(!r||r.h||r.t==="T")return;
  const S=saldos(),l=lotes.find(x=>x.id===(r.o||r.d));
  const T={C:"consumo",E:"entrada",A:"ajuste",G:"granalla de cobre"};
  const v={f:r.f||hoy(),u:r.u||TURNOS[0],lote:r.o||r.d||"",fa:typeof r.fa==="number"?String(Math.abs(r.fa)):"",kg:typeof r.kg==="number"?String(Math.abs(r.kg)).replace(".",","):"",a:r.a||(l&&r.t==="E"?l.albaran:"")||"",nv:r.nv||NAVES[0]};
  const campos=[];
  const inp=(lab,key,o)=>el("label",{text:lab},[el("input",Object.assign({class:"num",type:"text",value:v[key],oninput:e=>{v[key]=e.target.value;}},o||{}))]);
  campos.push(el("label",{text:"Fecha"},[el("input",{type:"date",max:hoy(),value:v.f,onchange:e=>{v.f=e.target.value;}})]));
  if(r.t==="C"||(r.t==="G"&&!r.aj)){const seg=el("div",{class:"seg"});const pin=()=>{seg.textContent="";TURNOS.forEach(t=>seg.appendChild(el("button",{type:"button","aria-pressed":String(v.u===t),text:t,onclick:()=>{v.u=t;pin();}})));};pin();
    campos.push(el("label",{text:"Relevo"},[seg]));}
  if(r.t==="G"&&!r.aj&&r.kg<0){const seg=el("div",{class:"seg"});const pin=()=>{seg.textContent="";NAVES.forEach(n=>seg.appendChild(el("button",{type:"button","aria-pressed":String(v.nv===n),text:n,onclick:()=>{v.nv=n;pin();}})));};pin();
    campos.push(el("label",{text:"Nave"},[seg]));}
  if(r.t==="C"&&l){
    const cand=lotes.filter(x=>x.nave===l.nave&&x.material===l.material&&x.donde==="nave"&&((S[x.id]&&S[x.id].fa>0)||x.id===l.id))
      .sort((a,b)=>(a.entrada||"").localeCompare(b.entrada||"")||a.nombre.localeCompare(b.nombre,"es"));
    campos.push(el("label",{text:"Colada ("+l.nave+" · "+MAT[l.material].nom+")"},[el("select",{onchange:e=>{v.lote=e.target.value;}},
      cand.map(x=>{const o=el("option",{value:x.id,text:x.nombre+" · "+fmt(S[x.id]?S[x.id].fa:0)+" f"+(x.id===l.id?" (la actual)":"")});if(x.id===v.lote)o.selected=true;return o;}))]));}
  if(r.t!=="G")campos.push(inp("Fardos","fa",{inputmode:"numeric"}));
  if(r.t==="C")campos.push(inp("Kilos (opcional, en blanco se calculan)","kg",{inputmode:"decimal"}));
  if(r.t==="E"||r.t==="G")campos.push(inp("Kilos","kg",{inputmode:"decimal"}));
  if(r.t==="E")campos.push(el("label",{text:"Nº albarán"},[el("input",{type:"text",value:v.a,oninput:e=>{v.a=e.target.value;}})]));
  /* foto del albarán: se puede adjuntar o cambiar después */
  if(r.t==="E"){const st=el("p",{class:"hint",text:r.ft?"Ya tiene foto. Si eliges otra, la cambia.":"Sin foto. Puedes hacerla ahora con la cámara o elegirla de la galería."});
    campos.push(el("label",{text:"Foto del albarán"},[
      r.ft?el("img",{class:"thumb",src:fotoUrl(r.ft),alt:"Albarán",style:"max-width:120px;cursor:pointer",onclick:()=>verFoto(r.ft)}):null,
      el("input",{type:"file",accept:"image/*",onchange:e=>{v.foto=e.target.files&&e.target.files[0]||null;st.textContent=v.foto?"Elegida: "+v.foto.name+". Se sube al guardar.":(r.ft?"Ya tiene foto.":"Sin foto.");}}),st]));}
  const err=el("div",{class:"banner b",hidden:""});
  const cerrar=()=>{ov.remove();document.removeEventListener("keydown",tec);};
  const guardar=async e=>{
    const fa=numES(v.fa),kg=numES(v.kg),n=Object.assign({},r,{f:v.f});const mal=[];
    if(!v.f)mal.push("Pon la fecha.");
    if(r.t!=="G"&&!(fa>0))mal.push("Los fardos tienen que ser un número mayor que 0.");
    if((r.t==="E"||r.t==="G")&&!(kg>0))mal.push("Los kilos tienen que ser un número mayor que 0.");
    if(r.t==="C"&&v.kg.trim()!==""&&!(kg>0))mal.push("Los kilos no son un número válido.");
    if(mal.length){err.textContent=mal.join(" ");err.hidden=false;return;}
    if(r.t==="C"){n.u=v.u;n.o=v.lote;n.fa=fa;
      const kgOrig=typeof r.kg==="number"?String(Math.abs(r.kg)).replace(".",","):"";
      if(v.kg.trim()===""||(v.lote!==r.o&&v.kg===kgOrig))delete n.kg;else n.kg=kg;}
    if(r.t==="G"){n.kg=r.kg<0?-kg:kg;if(!r.aj){n.u=v.u;if(r.kg<0)n.nv=v.nv;}}
    if(r.t==="E"){n.fa=fa;n.kg=kg;if(v.a.trim()){n.a=v.a.trim();delete n.sa;}else delete n.a;delete n.ke;}
    if(r.t==="A"){n.fa=fa;const b=S[r.o||r.d];n.kg=Math.round(fa*((b&&b.ratio)||0));}
    n.ed=hoy();
    const b=e.currentTarget;b.disabled=true;
    try{if(r.t==="E"&&v.foto){b.textContent="Subiendo la foto…";try{n.ft=await subirFoto(v.foto);}catch(x){toast("La foto no se pudo subir; guardo lo demás");}b.textContent="Guardar";}
      await guardarMov(r,n);
      if(r.t==="E"&&l){const up={};if(l.entrada!==v.f)up.entrada=v.f;if((l.albaran||"")!==(n.a||""))up.albaran=n.a||"";if(l.sinAlb&&n.a)up.sinAlb=null;if(Object.keys(up).length)await db.doc("lotes/"+l.id).update(up);}
      cerrar();toast("Apunte corregido");
    }catch(x){b.disabled=false;err.textContent="No se pudo guardar. Inténtalo otra vez.";err.hidden=false;}};
  const tec=e=>{if(e.key==="Escape")cerrar();};
  const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)cerrar();}},[el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"Editar apunte"},[
    el("h3",{text:"Editar "+(T[r.t]||"apunte")}),
    el("p",{class:"sub",text:(l?l.nombre+" · "+l.nave:(r.t==="G"?"Granalla de cobre":""))}),
    el("form",{onsubmit:e=>e.preventDefault()},campos.concat([err])),
    el("div",{class:"dlg-b"},[el("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:cerrar}),el("button",{type:"button",class:"btn",text:"Guardar",onclick:guardar})])])]);
  document.addEventListener("keydown",tec);document.body.appendChild(ov);
}
async function borrarApunte(r,i,kg,fa){
  const T={C:"consumo",E:"entrada",A:"ajuste",G:"apunte de granalla de cobre",T:"traslado"};
  const tipo=T[r.t]||"apunte";
  let txt="¿Borrar este "+tipo+"?\n\n"+dmy(r.f)+(r.u?" · "+r.u:"")+"\n"+(i.colada||"")+(i.nave?" · "+i.nave:"")+"\n"+(fa?fmt(Math.abs(fa))+" fardos · ":"")+fmt(Math.abs(kg))+" kg";
  let lote=null,otros=[];
  if(r.t==="E"){const id=r.d||r.o;lote=lotes.find(x=>x.id===id)||null;
    otros=todosMovs().filter(x=>x.i!==r.i&&(x.o===id||x.d===id));
    if(otros.length)txt+="\n\nOjo: esta colada ya tiene "+otros.length+" apunte(s) más (consumos, traslados…). Si borras la entrada, su stock puede quedar en negativo.";}
  txt+="\n\nEl stock se recalcula.";
  if(!(await confirmar(txt,{titulo:"Borrar apunte",ok:"Borrar",peligro:true})))return false;
  await delMov(r.i,r.f);
  if(lote&&!otros.length&&!(lote.kgInv>0)&&!(lote.fardosInv>0)){try{await db.doc("lotes/"+lote.id).delete();}catch(e){}}
  return true;
}
async function saveCfg(){await db.doc("cfg/app").set(cfg);}

/* ---------- vistas ---------- */
/* Parte diario: una línea por nave Y aleación, nunca mezcladas.
   Es lo que Cristian le pasa a su jefe cada mañana. */
function vParte(B,ud,ahora){
  const gk=granallaKg();
  /* granalla consumida ese día, por nave */
  const gc={tot:0};movs().forEach(r=>{if(r.t==="G"&&!r.aj&&r.f===ud&&typeof r.kg==="number"&&r.kg<0){const n=r.nv||"Sin nave";gc[n]=(gc[n]||0)-r.kg;gc.tot-=r.kg;}});
  const gcNaves=NAVES.filter(n=>gc[n]).map(n=>n+" "+fmt(gc[n])+" kg").concat(gc["Sin nave"]?["sin nave "+fmt(gc["Sin nave"])+" kg"]:[]);
  const filas=LINEAS.map(([n,mm])=>{const k=key(n,mm),b=B[k];
      return{k,nave:n,mat:mm,cKg:b.cUd,cFa:b.cUdFa,kg:b.kg,fa:b.fa,kgN:b.kgN,faN:b.faN,kgE:b.kgE,faE:b.faE,dias:b.dias};})
    .filter(x=>x.fa>0||x.kg>0||x.cFa>0);
  /* en pantalla se aplica el filtro de Stock; «Copiar parte» siempre lleva todo */
  const filasV=filas.filter(x=>tab!=="stock"||pasaF(x.nave,x.mat));
  const opsP=[["#","Datos"],["con","Consumido"],["stk","En nave / externo"],["tot","Total"],["dias","Días de material"],["gran","Granalla de cobre"],["#","Naves"]].concat([...new Set(filas.map(x=>x.nave))].map(n=>["nv:"+n,n]));
  const texto=s=>{s=s||incluirSel("parte",opsP);
    const L=["PARTE "+(ud?dmy(ud):"—")];
    filas.filter(x=>s["nv:"+x.nave]!==false).forEach(x=>{
      L.push("");L.push(x.nave.toUpperCase()+" · "+MAT[x.mat].nom);
      if(s.con)L.push("  Consumido: "+fmt(x.cFa)+" fardos  ("+fmt(x.cKg)+" kg)");
      if(s.stk)L.push("  En nave: "+fmt(x.faN)+" f ("+fmt(x.kgN)+" kg)  ·  Externo: "+fmt(x.faE)+" f ("+fmt(x.kgE)+" kg)");
      if(s.tot)L.push("  Total: "+fmt(x.fa)+" fardos  ("+fmt(x.kg)+" kg)");
      if(s.dias&&x.dias!=null)L.push("  Material en nave para "+x.dias+" día"+(x.dias===1?"":"s"));
    });
    if(s.gran){L.push("");L.push("GRANALLA DE COBRE");
    L.push("  Consumido: "+fmt(gc.tot)+" kg"+(gcNaves.length>1?"  ("+gcNaves.join(" · ")+")":""));
    L.push("  Quedan: "+fmt(gk)+" kg");}
    return L.join("\n");
  };
  const ventanaParte=()=>{const ta=el("textarea",{readonly:"",style:"min-height:220px;font-family:'IBM Plex Mono',monospace;font-size:12.5px;width:100%"});
    const ch=incluirChips("parte",opsP,s=>{ta.value=texto(s);});ta.value=texto(ch.sel);
    const cerrar=()=>{ov.remove();document.removeEventListener("keydown",tec);};const tec=e=>{if(e.key==="Escape")cerrar();};
    const copiarP=async()=>{const t=ta.value;try{await navigator.clipboard.writeText(t);toast("Parte copiado");cerrar();}
        catch(e){ta.removeAttribute("readonly");ta.select();try{document.execCommand("copy");toast("Parte copiado");cerrar();}catch(e2){toast("Selecciona el texto y cópialo");}}};
    const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)cerrar();}},[el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"Copiar parte"},[
      el("h3",{text:"Parte del "+(ud?dmy(ud):"—")}),ch.node,ta,
      el("div",{class:"dlg-b"},[el("button",{type:"button",class:"btn sec",text:"Cerrar",onclick:cerrar}),el("button",{type:"button",class:"btn",text:"Copiar",onclick:copiarP})])])]);
    document.addEventListener("keydown",tec);document.body.appendChild(ov);};
  const dual=(fa,kg,fuerte)=>el("td",{class:"r num"},[
    el("div",{style:fuerte?"font-weight:600":"",text:fmt(fa)+" f"}),
    el("div",{class:"sub",text:fmt(kg)+" kg"})]);
  return el("div",{class:"card"},[
    el("div",{class:"hd",style:"flex-wrap:wrap"},[el("h2",{text:"Parte del "+(ud?dmy(ud):"—")}),
      el("input",{id:"parte-f",type:"date",max:hoy(),value:ud||"","aria-label":"Día del parte",style:"width:auto;font-size:14px;padding:5px 8px;margin-left:auto",
        onchange:e=>{parteDia=e.target.value||"";render();}}),
      parteDia?el("button",{class:"btn sec",type:"button",style:"font-size:13px;padding:6px 12px",text:"Último día",onclick:()=>{parteDia="";render();}}):null,
      el("button",{class:"btn sec",type:"button",style:"font-size:13px;padding:6px 12px",text:"Copiar parte",onclick:ventanaParte})]),
    /* el parte es al cierre de ese día: si después se ha apuntado algo, se
       enseña también lo que hay en nave ahora para que no parezca descuadre */
    (ahora&&ud&&ud<hoy()&&todosMovs().some(r=>!r.h&&r.f>ud&&(r.t==="C"||r.t==="A"||r.t==="E"||r.t==="T")))?el("div",{class:"bd",style:"padding-bottom:0"},[el("div",{class:"banner",
      text:"Este parte es al cierre del "+dmy(ud)+". Con lo apuntado después, en nave hay ahora: "+LINEAS.filter(([n,m])=>(tab!=="stock"||pasaF(n,m))&&ahora[key(n,m)]&&(ahora[key(n,m)].faN||B[key(n,m)].faN)).map(([n,m])=>n+" "+MAT[m].nom+" "+fmt(ahora[key(n,m)].faN)+" f").join(" · ")+"."})]):null,
    (ud===hoy())?el("div",{class:"bd",style:"padding-bottom:0"},[el("div",{class:"banner w",text:"Hoy aún no ha terminado: el consumo y el stock son los apuntados hasta ahora."})]):null,
    filasV.length?el("div",{class:"tw"},[el("table",{class:"parte-t"},[
      el("thead",{},[el("tr",{},[el("th",{text:"Nave y aleación"}),el("th",{class:"r",text:"Consumido"}),el("th",{class:"r",text:"En nave"}),el("th",{class:"r",text:"En externo"}),el("th",{class:"r",text:"Total"}),el("th",{class:"r",text:"Días"})])]),
      el("tbody",{},filasV.map(x=>el("tr",{},[
        el("td",{},[el("span",{class:"tagm",style:"background:"+MAT[x.mat].col}),document.createTextNode(x.nave),
          el("div",{class:"sub",text:MAT[x.mat].nom})]),
        dual(x.cFa,x.cKg,true),
        dual(x.faN,x.kgN),
        dual(x.faE,x.kgE),
        (()=>{const c=dual(x.fa,x.kg);c.appendChild(el("div",{class:"sub solo-movil",text:"nave "+fmt(x.faN)+" · ext. "+fmt(x.faE)}));return c;})(),
        el("td",{class:"r num",text:x.dias!=null?String(x.dias):"—"})
      ])).concat(fStk.mat&&tab==="stock"?[]:[el("tr",{},[
        el("td",{},[el("span",{class:"tagm",style:"background:var(--cobre)"}),document.createTextNode("Granalla de cobre"),
          gcNaves.length?el("div",{class:"sub",text:gcNaves.join(" · ")}):null]),
        el("td",{class:"r num"},[el("div",{style:"font-weight:600",text:fmt(gc.tot)+" kg"})]),
        el("td",{class:"r num sub",text:"—"}),el("td",{class:"r num sub",text:"—"}),
        el("td",{class:"r num"},[el("div",{text:fmt(gk)+" kg"}),el("div",{class:"sub",text:"quedan"})]),
        el("td",{class:"r num sub",text:"—"})])]))
    ])]):el("div",{class:"empty",text:"Sin existencias."}),
    el("div",{class:"bd"},[el("p",{class:"hint",text:"Cada nave con su aleación por separado, sin mezclar. Arriba los fardos, debajo los kilos. Un camión son 37 fardos (25.000 kg). «Copiar parte» lo deja listo para pegarlo en un correo o en WhatsApp."})])
  ]);
}

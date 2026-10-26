/* ===== CONTENEDORES (cámara de inyección) =====
   Código como en el panel de la pared: letra = largo (y qué máquinas lo llevan), número = Ø interior.
   A1 = 250 mm Ø60 … E5 = 520 mm Ø100. Cada contenedor lleva su número grabado: D5-04.
   Se guardan en cat.contens: {id, cod, tipo, num, estado:"estanteria"|"taller"|"baja", peg:"verde"|"naranja"|"", grab, notas, alta}.
   Si una máquina lo tiene puesto (hoy.cont), está «en la máquina» aunque su estado diga otra cosa. */
const CT_L={A:{mm:250,col:"#F2E32B",maqs:[23,24]},B:{mm:315,col:"#9DB4E8",maqs:[10,15,16,31,34,51,52,54,55,62,63,67]},
  C:{mm:385,col:"#8CC63F",maqs:[19,20,21,22,26,27,30,32,33,53,56,61]},D:{mm:470,col:"#F4B223",maqs:[4,28,29,65,66]},E:{mm:520,col:"#B7B4BC",maqs:[25,64]}};
const CT_D={1:60,2:70,3:80,4:90,5:100};
const CT_TIPOS=["A1","A2","A3","B1","B2","B3","B4","C2","C3","C4","C5","D3","D4","D5","E4","E5"];
const CT_EST={estanteria:["En la estantería","ok"],maquina:["Puesto","info"],taller:["En el taller","warn"],baja:["De baja","bad"]};
const numMaqCod=c=>+String(c||"").replace(/\D/g,"")||0;
const letraMaq=m=>{const n=numMaqCod(m&&m.cod);return Object.keys(CT_L).find(k=>CT_L[k].maqs.includes(n))||null;};
const maqsLetra=l=>cat.maquinas.filter(m=>letraMaq(m)===l).sort((a,b)=>numMaqCod(a.cod)-numMaqCod(b.cod));
const tipoCont=x=>x.tipo||((String(x.cod||"").toUpperCase().match(/^([A-E][1-5])/)||[])[1])||"";
const diamTipo=t=>CT_D[String(t).slice(1)]||null;
const txtTipo=t=>t+" · "+CT_L[t[0]].mm+" mm · Ø"+CT_D[t[1]];
const diamPist=m=>{const d=String(diamDe(m)||"").match(/\d+/);return d?+d[0]:null;};
const maqDeCont=x=>cat.maquinas.find(m=>hoyDe(m).cont===x.id)||null;
const dondeCont=x=>{const m=maqDeCont(x);return m?{k:"maquina",m}:{k:x.estado&&x.estado!=="maquina"?x.estado:"estanteria"};};
const txtDonde=x=>{const d=dondeCont(x);return d.k==="maquina"?"Puesto en "+d.m.cod:CT_EST[d.k][0];};
const contsTipo=t=>contens().filter(x=>tipoCont(x)===t);
const vivosCont=()=>contens().filter(x=>dondeCont(x).k!=="baja");
function cuentaTipo(t){const L=contsTipo(t).map(dondeCont);return{tot:L.filter(d=>d.k!=="baja").length,est:L.filter(d=>d.k==="estanteria").length,maq:L.filter(d=>d.k==="maquina").length,tal:L.filter(d=>d.k==="taller").length};}
function histCont(x){return todosMlog().filter(r=>r.tipo==="cont"&&(r.val===x.id||r.antes===x.id)).slice().reverse();}
async function guardaCont(nue){cat.contens=(cat.contens||[]).filter(z=>z.id!==nue.id).concat([nue]);await saveCat();}

/* la cuadrícula del panel: letras (largo) × Ø; solo lectura si ro */
function gridCont(ro){const box=el("div",{class:"ct-grid",role:"table","aria-label":"Contenedores por largo y diámetro"});
  box.appendChild(el("div",{class:"ct-h"},""));Object.keys(CT_D).forEach(n=>box.appendChild(el("div",{class:"ct-h",text:"Ø"+CT_D[n]})));
  Object.keys(CT_L).forEach(l=>{const L=CT_L[l];
    box.appendChild(el("div",{class:"ct-l",style:"background:"+L.col},[el("b",{text:l}),el("small",{text:L.mm+" mm"})]));
    Object.keys(CT_D).forEach(n=>{const t=l+n;
      if(!CT_TIPOS.includes(t)){box.appendChild(el("div",{class:"ct-c ct-no",text:"····"}));return;}
      const c=cuentaTipo(t),cls=!c.tot?"ct-vacio":!c.est?"ct-sin":"";
      box.appendChild(el(ro?"div":"button",Object.assign({class:"ct-c "+cls,"aria-label":t+": "+c.est+" en la estantería, "+c.maq+" puestos, "+c.tal+" en el taller"},ro?{}:{type:"button",onclick:()=>dlgTipo(t)}),[
        el("b",{text:t}),el("span",{class:"ct-n",text:c.tot?String(c.est):"—"}),el("small",{text:c.tot?(c.maq?c.maq+" puesto"+(c.maq>1?"s":""):"")+(c.tal?(c.maq?" · ":"")+c.tal+" taller":""):"sin alta"})]));});});
  return box;}
const notaGrid=()=>el("p",{class:"hint",style:"margin:8px 2px 0",text:"El número grande es cuántos hay en la estantería. En rojo: no queda ninguno de repuesto. La letra es el largo y dice qué máquinas lo llevan; arriba, el Ø interior."});
function maquinasLetras(){return el("div",{class:"ct-maqs"},Object.keys(CT_L).map(l=>el("div",{},[el("b",{style:"background:"+CT_L[l].col,text:l}),el("span",{text:CT_L[l].maqs.map(n=>"F"+String(n).padStart(2,"0")).join(" ")})])));}

function vCont(v){draft.ctq=draft.ctq||"";
  const V=vivosCont(),D=V.map(dondeCont);
  v.appendChild(el("dl",{class:"kpis num"},[["Contenedores",String(V.length)],["En la estantería",String(D.filter(d=>d.k==="estanteria").length)],["Puestos en máquina",String(D.filter(d=>d.k==="maquina").length)],["En el taller",String(D.filter(d=>d.k==="taller").length)]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))));
  const sinRep=CT_TIPOS.filter(t=>{const c=cuentaTipo(t);return c.tot&&!c.est;});
  if(sinRep.length)v.appendChild(el("div",{class:"banner w",text:"Sin ninguno de repuesto en la estantería: "+sinRep.join(", ")+"."}));
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Estantería"}),el("button",{type:"button",class:"btn sec peq der",text:"Inventario rápido",onclick:()=>inventarioCont()})]),
    el("div",{style:"padding:10px 12px 12px"},[gridCont(false),notaGrid()])]));
  if(!V.length)v.appendChild(el("div",{class:"card"},el("p",{class:"hint",style:"padding:12px 14px",text:"Todavía no hay contenedores dados de alta. Pulsa «Inventario rápido», elige el tipo (por ejemplo D5) y marca los números que hay grabados (D5-01, D5-02…)."})));
  /* puestos en cada máquina */
  const sinCont=cat.maquinas.filter(m=>!hoyDe(m).cont&&letraMaq(m)).length;
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Qué lleva cada máquina"}),el("span",{class:"der sub",text:sinCont?sinCont+" sin apuntar":"todas apuntadas"})]),
    el("div",{class:"lst"},Object.keys(CT_L).map(l=>maqsLetra(l)).flat().map(m=>{const x=contDe(hoyDe(m).cont),dp=diamPist(m),mal=x&&dp&&diamTipo(tipoCont(x))!==dp;
      return el("button",{type:"button",class:"it",onclick:()=>cambioCont(m)},[el("span",{class:"stripe "+(mal?"warn":x?"ok":"")}),el("div",{class:"ppal"},[el("div",{class:"t1",text:m.cod+" · "+(x?x.cod:"sin apuntar")}),
        el("div",{class:"t2",text:["largo "+letraMaq(m)+" ("+CT_L[letraMaq(m)].mm+" mm)",dp?"pistón Ø"+dp:null,mal?"el contenedor es Ø"+diamTipo(tipoCont(x))+" y el pistón Ø"+dp:null,x&&hoyDe(m).contF?"desde "+fmtF(hoyDe(m).contF):null].filter(Boolean).join(" · ")})])]);}))]));
  /* todos, para buscar */
  const q=inp("ctQ",draft.ctq,z=>{draft.ctq=z;pl();},{type:"search",placeholder:"Busca: D5-04, Ø90, taller, F28…",autocomplete:"off"});
  const lst=el("div",{class:"lst"});
  const pl=()=>{lst.textContent="";const toks=tokQ(draft.ctq);const L=contens().filter(x=>!toks.length||casa([x.cod,txtTipo(tipoCont(x)||"A1"),txtDonde(x),x.notas,x.grab,x.peg].join(" "),toks));
    if(!L.length){lst.appendChild(el("p",{class:"hint",style:"padding:10px 14px",text:toks.length?"Ninguno coincide.":"Sin contenedores."}));return;}
    L.forEach(x=>lst.appendChild(itCont(x)));};
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Todos los contenedores"})),el("div",{style:"padding:8px 12px 0"},q),lst]));pl();
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Qué largo lleva cada máquina"})),el("div",{style:"padding:8px 12px 12px"},maquinasLetras())]));}
function itCont(x,despues){const d=dondeCont(x),t=tipoCont(x);
  return el("button",{type:"button",class:"it",onclick:()=>fichaCont(x,despues)},[el("span",{class:"stripe "+(d.k==="taller"?"warn":d.k==="baja"?"bad":"")}),
    el("div",{class:"ppal"},[el("div",{class:"t1",text:x.cod}),el("div",{class:"t2",text:[t?CT_L[t[0]].mm+" mm · Ø"+CT_D[t[1]]:null,x.grab,x.peg?"pegatina "+x.peg:null,x.notas].filter(Boolean).join(" · ")})]),
    el("span",{class:"pill "+CT_EST[d.k][1],text:d.k==="maquina"?d.m.cod:CT_EST[d.k][0]})]);}
function dlgTipo(t){const L=contsTipo(t),c=cuentaTipo(t);
  dlg(txtTipo(t),[el("p",{class:"sub",text:"Lo llevan: "+maqsLetra(t[0]).map(m=>m.cod).join(", ")}),
    el("p",{class:"sub",text:c.tot?c.est+" en la estantería · "+c.maq+" puestos · "+c.tal+" en el taller":"Todavía no hay ninguno dado de alta."}),
    L.length?el("div",{class:"lst",style:"border:1px solid var(--line);border-radius:8px"},L.map(x=>itCont(x,()=>dlgTipo(t)))):null],
    [{t:"Cerrar",cls:"sec"},{t:"＋ Dar de alta",fn:()=>{setTimeout(()=>inventarioCont(t),0);}}]);}

/* inventario rápido: eliges el tipo y marcas los números grabados que hay */
function inventarioCont(t0){const x={t:t0||"",nue:new Set(),extra:""};const box=el("div",{style:"display:grid;gap:10px"});
  const pinta=()=>{box.textContent="";
    box.appendChild(el("div",{},[el("div",{class:"sub",style:"margin-bottom:6px",text:"1. ¿Qué tipo? (lo que pone en el panel)"}),
      el("div",{style:"display:flex;flex-wrap:wrap;gap:6px"},CT_TIPOS.map(t=>el("button",{type:"button",class:"btn peq "+(x.t===t?"":"sec"),style:"min-width:52px;border-left:6px solid "+CT_L[t[0]].col,text:t,onclick:()=>{x.t=t;x.nue=new Set();pinta();}})))]));
    if(!x.t)return;
    const ya=new Map(contsTipo(x.t).map(c=>[String(c.num||(String(c.cod).split("-")[1]||"")).padStart(2,"0"),c]));
    const max=Math.max(12,...[...ya.keys()].map(Number).filter(n=>n>0).map(n=>n+3));
    box.appendChild(el("div",{},[el("div",{class:"sub",style:"margin-bottom:6px",text:"2. Toca los números que hay grabados ("+txtTipo(x.t)+"). Los que ya están dados de alta salen en gris."}),
      el("div",{style:"display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px"},Array.from({length:max},(_,i)=>String(i+1).padStart(2,"0")).map(n=>{const e=ya.get(n);
        return el("button",{type:"button",class:"btn peq "+(e?"sec":x.nue.has(n)?"":"sec"),disabled:!!e,style:e?"opacity:.55":"","aria-pressed":String(!!e||x.nue.has(n)),text:x.t+"-"+n,
          onclick:()=>{x.nue.has(n)?x.nue.delete(n):x.nue.add(n);pinta();}});}))]));
    box.appendChild(fld("Otro número (si pasa de "+max+")",inp("ctX",x.extra,z=>x.extra=z,{inputmode:"numeric",placeholder:"p. ej. 15",autocomplete:"off"})));
    box.appendChild(el("p",{class:"hint",text:x.nue.size?"Se darán de alta "+x.nue.size+": "+[...x.nue].sort().map(n=>x.t+"-"+n).join(", ")+". Quedan en la estantería; si alguno está puesto en una máquina, apúntalo después en «Qué lleva cada máquina».":"Marca uno o varios."}));};
  pinta();
  dlg("Inventario rápido de contenedores",[box],[{t:"Cerrar",cls:"sec"},{t:"Dar de alta",fn:async()=>{if(!x.t){toast("Elige el tipo");return false;}
    const ex=parseInt(x.extra,10);if(ex>0)x.nue.add(String(ex).padStart(2,"0"));
    const ya=new Set(contsTipo(x.t).map(c=>String(c.num||(String(c.cod).split("-")[1]||"")).padStart(2,"0")));const L=[...x.nue].filter(n=>!ya.has(n)).sort();
    if(!L.length){toast("Marca algún número");return false;}
    const nuevos=L.map(n=>({id:uid(),cod:x.t+"-"+n,tipo:x.t,num:n,estado:"estanteria",peg:"",grab:null,notas:null,alta:hoy()}));
    cat.contens=(cat.contens||[]).concat(nuevos);try{await saveCat();}catch(e){toast("No se pudo guardar");return false;}
    toast(nuevos.length+" contenedor"+(nuevos.length>1?"es":"")+" dado"+(nuevos.length>1?"s":"")+" de alta");render(true);}}]);}

/* ficha de un contenedor (también para crear uno suelto) */
function fichaCont(x0,despues){const nuevo=!x0;const x=x0?Object.assign({},x0):{id:uid(),cod:"",tipo:"",num:"",estado:"estanteria",peg:"",grab:null,notas:null,alta:hoy()};
  if(!x.tipo)x.tipo=tipoCont(x);if(!x.num)x.num=(String(x.cod).split("-")[1]||"");
  const d=dondeCont(x);const H=nuevo?[]:histCont(x);
  const segEst=el("div",{class:"seg",role:"group","aria-label":"Dónde está"},[["estanteria","Estantería"],["taller","Taller"],["baja","Baja"]].map(([k,t])=>{const b=el("button",{type:"button","aria-pressed":String((x.estado||"estanteria")===k),text:t});
    b.onclick=()=>{x.estado=k;segEst.querySelectorAll("button").forEach(z=>z.setAttribute("aria-pressed",String(z===b)));};return b;}));
  const segPeg=el("div",{class:"seg",role:"group","aria-label":"Pegatina"},[["","Sin pegatina"],["verde","Verde"],["naranja","Naranja"]].map(([k,t])=>{const b=el("button",{type:"button","aria-pressed":String((x.peg||"")===k),text:t});
    b.onclick=()=>{x.peg=k;segPeg.querySelectorAll("button").forEach(z=>z.setAttribute("aria-pressed",String(z===b)));};return b;}));
  const cuerpo=[
    fld("Tipo",sel("cfT",CT_TIPOS.map(t=>[t,txtTipo(t)]),x.tipo,z=>x.tipo=z,"Elige…")),
    fld("Número grabado",inp("cfN",x.num,z=>x.num=z,{inputmode:"numeric",placeholder:"p. ej. 04",autocomplete:"off"})),
    d.k==="maquina"?el("div",{class:"banner",text:"Puesto en la "+d.m.cod+(hoyDe(d.m).contF?" desde el "+fmtF(hoyDe(d.m).contF):"")+". Para quitarlo, haz el cambio de contenedor en esa máquina."}):el("div",{},[el("div",{class:"sub",style:"margin-bottom:6px",text:"Dónde está"}),segEst]),
    el("div",{},[el("div",{class:"sub",style:"margin-bottom:6px",text:"Pegatina"}),segPeg]),
    fld("Lo que lleva grabado (fecha, marcas…)",inp("cfG",x.grab||"",z=>x.grab=z,{placeholder:"p. ej. TE 12/24",autocomplete:"off"})),
    fld("Notas",inp("cfO",x.notas||"",z=>x.notas=z,{autocomplete:"off"}))];
  if(!nuevo&&d.k!=="maquina"&&x.tipo)cuerpo.push(el("button",{type:"button",class:"btn sec peq",style:"justify-self:start",text:"Ponerlo en una máquina",onclick:()=>{cerrarDlgs();elegirMaqCont(x0);}}));
  if(H.length)cuerpo.push(el("div",{},[el("div",{class:"sub",style:"margin:6px 0 4px",text:"Historial"}),el("div",{class:"lst",style:"border:1px solid var(--line);border-radius:8px;max-height:30vh;overflow:auto"},H.map(r=>el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},[
    el("div",{class:"t1",text:fmtF(r.f)+" · "+(r.val===x.id?"puesto en ":"quitado de ")+maqN(r.maq)}),el("div",{class:"t2",text:[r.by,r.val===x.id&&r.antes?"quitó el "+((contDe(r.antes)||{}).cod||"?"):null,r.antes===x.id&&r.val?"se puso el "+((contDe(r.val)||{}).cod||"?"):null,r.destino?"fue a: "+(CT_EST[r.destino]||[r.destino])[0].toLowerCase():null].filter(Boolean).join(" · ")})])])))]));
  dlg(nuevo?"Nuevo contenedor":"Contenedor "+x0.cod,cuerpo,[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{
    if(!x.tipo){toast("Elige el tipo");return false;}const n=String(x.num||"").replace(/\D/g,"");if(!n){toast("Pon el número grabado");return false;}
    const cod=x.tipo+"-"+n.padStart(2,"0");if((cat.contens||[]).some(z=>z.id!==x.id&&String(z.cod).toUpperCase()===cod)){toast("Ya existe el "+cod);return false;}
    const nue={id:x.id,cod,tipo:x.tipo,num:n.padStart(2,"0"),estado:d.k==="maquina"?(x0.estado||"estanteria"):(x.estado||"estanteria"),peg:x.peg||"",grab:String(x.grab||"").trim()||null,notas:String(x.notas||"").trim()||null,alta:x.alta||hoy()};
    try{await guardaCont(nue);toast("Guardado");}catch(e){toast("No se pudo guardar");return false;}if(despues)setTimeout(()=>despues(nue),60);else render(true);}}]);}
function elegirMaqCont(x){const t=tipoCont(x),ms=maqsLetra(t[0]);
  dlg("¿En qué máquina se pone el "+x.cod+"?",[el("div",{style:"display:flex;gap:6px;flex-wrap:wrap"},ms.map(m=>{const ya=contDe(hoyDe(m).cont);
    return el("button",{type:"button",class:"btn sec peq",text:m.cod+(ya?" (ahora "+ya.cod+")":""),onclick:()=>{cerrarDlgs();cambioCont(m,{val:x.id});}});})),
    el("p",{class:"hint",text:"Solo salen las máquinas de largo "+t[0]+" ("+CT_L[t[0]].mm+" mm)."})],[{t:"Cancelar",cls:"sec"}]);}

/* cambio de contenedor en una máquina: solo los de su largo; el que se quita va a la estantería o al taller */
function cambioCont(m0,pre){const m=maqDe(m0.id)||m0;const l=letraMaq(m),dp=diamPist(m);const antes=contDe(hoyDe(m).cont);
  const d=Object.assign({f:hoy(),val:"",by:quienSoy(),dest:"estanteria"},pre||{});const box=el("div",{style:"display:grid;gap:10px"});
  const lista=()=>vivosCont().filter(x=>!l||tipoCont(x)[0]===l).filter(x=>!antes||x.id!==antes.id)
    .sort((a,b)=>{const pa=dp&&diamTipo(tipoCont(a))===dp?0:1,pb=dp&&diamTipo(tipoCont(b))===dp?0:1;const ka=dondeCont(a).k==="estanteria"?0:1,kb=dondeCont(b).k==="estanteria"?0:1;return pa-pb||ka-kb||String(a.cod).localeCompare(String(b.cod),"es",{numeric:true});});
  const pinta=()=>{box.textContent="";const x=contDe(d.val);const dn=x?dondeCont(x):null;
    box.appendChild(el("p",{class:"sub",text:(l?"La "+m.cod+" lleva largo "+l+" ("+CT_L[l].mm+" mm)":"Esta máquina no está en el panel")+(dp?" · pistón Ø"+dp:"")+(antes?" · ahora tiene el "+antes.cod:"")}));
    box.appendChild(fld("Fecha",inp("ccF",d.f,z=>d.f=z,{type:"date"})));
    const L=lista();
    box.appendChild(fld("Contenedor que se pone",sel("ccV",L.map(c=>[c.id,c.cod+" · Ø"+diamTipo(tipoCont(c))+" · "+txtDonde(c).toLowerCase()]),d.val,z=>{d.val=z;pinta();},L.length?"Elige…":"No hay ninguno de largo "+(l||"?")+" dado de alta")));
    box.appendChild(el("button",{type:"button",class:"btn sec peq",style:"justify-self:start",text:"＋ Dar de alta otro",onclick:()=>{cerrarDlgs();inventarioCont(l&&dp?l+Object.keys(CT_D).find(k=>CT_D[k]===dp):"");}}));
    if(x&&dp&&diamTipo(tipoCont(x))!==dp)box.appendChild(el("div",{class:"banner w",text:"Ojo: el "+x.cod+" es Ø"+diamTipo(tipoCont(x))+" y la máquina lleva pistón Ø"+dp+"."}));
    if(dn&&dn.k==="maquina")box.appendChild(el("div",{class:"banner",text:"El "+x.cod+" está apuntado en la "+dn.m.cod+": se quitará de allí."}));
    if(dn&&dn.k==="taller")box.appendChild(el("div",{class:"banner",text:"La app lo tenía en el taller: pasa a estar puesto."}));
    if(antes){const sg=el("div",{class:"seg",role:"group","aria-label":"El que se quita"},[["estanteria","A la estantería"],["taller","Al taller"],["baja","De baja"]].map(([k,t])=>{const b=el("button",{type:"button","aria-pressed":String(d.dest===k),text:t});
        b.onclick=()=>{d.dest=k;sg.querySelectorAll("button").forEach(z=>z.setAttribute("aria-pressed",String(z===b)));};return b;}));
      box.appendChild(el("div",{},[el("div",{class:"sub",style:"margin-bottom:6px",text:"El que se quita ("+antes.cod+") va:"}),sg]));}
    box.appendChild(fld("Quién lo apunta",inp("ccB",d.by,z=>d.by=z,{autocomplete:"off"})));};
  pinta();
  const bots=[{t:"Cancelar",cls:"sec"}];
  if(antes)bots.push({t:"Solo quitar el "+antes.cod,cls:"sec",fn:async()=>{const mm=maqDe(m.id);mm.hoy=Object.assign({},mm.hoy||{},{cont:null,contF:d.f});
    antes.estado=d.dest;try{await saveCat();await addMlog({f:d.f,maq:m.id,tipo:"cont",val:null,antes:antes.id,destino:d.dest,by:(d.by||"").trim()||null});toast(antes.cod+" quitado");}catch(e){return false;}render(true);}});
  bots.push({t:"Guardar",fn:async()=>{if(!d.val){toast("Elige el contenedor");return false;}const x=contDe(d.val);const dn=dondeCont(x);const mm=maqDe(m.id);
    if(dn.k==="maquina"&&dn.m.id!==mm.id){dn.m.hoy=Object.assign({},dn.m.hoy||{},{cont:null,contF:d.f});}
    mm.hoy=Object.assign({},mm.hoy||{},{cont:x.id,contF:d.f});x.estado="estanteria";if(antes)antes.estado=d.dest;
    try{await saveCat();await addMlog({f:d.f,maq:m.id,tipo:"cont",val:x.id,antes:antes?antes.id:null,destino:antes?d.dest:null,by:(d.by||"").trim()||null});toast(x.cod+" puesto en "+m.cod);}catch(e){toast("No se pudo guardar");return false;}
    render(true);}});
  dlg("Cambio de contenedor · "+m.cod,[box],bots);}

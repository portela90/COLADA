/* ===== GESTORES DE CADA RELEVO =====
   Como los horneros de Coladas: se pone una semana quién está en cada relevo (2 gestores por relevo, toda la planta) y las
   siguientes salen solas por la rotación (mañana → noche → tarde → mañana). Las bajas y sustituciones, como cambio de un día.
   Al apuntar un cambio o consumo de pistón se elige el gestor y la app pone el relevo en que estaba ese día.
   cat.gest = {lista:[{id,n,baja}], sem:{"lunes":{"Mañana":[id],"Tarde":[id],"Noche":[id]}}, dia:{"fecha|Mañana":[id]}} */
const G_SIG={"Mañana":"Noche","Noche":"Tarde","Tarde":"Mañana"};
let gestSem="";
const gCfg=()=>{const g=cat.gest||{};return{lista:g.lista||[],sem:g.sem||{},dia:g.dia||{}};};
const lunesG=f=>lunesA(f);
const semMasG=(l,n)=>sumaDias(l,7*n);
const nomGest=id=>{const x=gCfg().lista.find(z=>z.id===id);return x?x.n:"?";};
function semanaGest(lun){const G=gCfg();if(G.sem[lun])return{g:G.sem[lun],de:lun};
  const prev=Object.keys(G.sem).filter(x=>x<lun).sort().pop();if(!prev)return{g:{},de:null};
  let g=G.sem[prev];for(let w=prev;w<lun;w=semMasG(w,1)){const n={};Object.keys(g).forEach(u=>{n[G_SIG[u]]=g[u];});g=n;}
  return{g,de:prev};}
function gestEn(f,u){const G=gCfg(),d=G.dia[f+"|"+u];if(d)return d;return(semanaGest(lunesG(f)).g[u])||[];}
/* en qué relevo estaba un gestor ese día */
function relevoDeGest(id,f){for(const u of RELEVOS_A)if(gestEn(f,u).includes(id))return u;return null;}
const gestTxt=(f,u)=>gestEn(f,u).map(nomGest).join(" y ");
async function guardaGest(patch){cat.gest=Object.assign({},gCfg(),patch);await saveCat();}
function nuevoGestor(alHacer){let n="";dlg("Nuevo gestor",[fld("Nombre como lo quieres ver (o su número)",inp("gNom","",x=>n=x,{autocomplete:"off"}))],
  [{t:"Cancelar",cls:"sec"},{t:"Añadir",fn:async()=>{n=String(n).trim();if(!n){toast("Pon el nombre");return false;}const x={id:uid(),n};
    try{await guardaGest({lista:gCfg().lista.concat([x])});}catch(e){toast("No se pudo guardar");return false;}if(alHacer)alHacer(x.id);else render(true);}}]);}
function elegirGest(titulo,sel0,alGuardar){const s=new Set(sel0||[]);const lst=el("div",{class:"g-lst"});
  const pinta=()=>{lst.textContent="";gCfg().lista.filter(x=>!x.baja||s.has(x.id)).forEach(x=>lst.appendChild(el("label",{class:"chk"},[
    el("input",{type:"checkbox",checked:s.has(x.id),onchange:e=>{if(e.target.checked)s.add(x.id);else s.delete(x.id);}}),x.n])));
    if(!gCfg().lista.length)lst.appendChild(el("p",{class:"hint",text:"Todavía no hay gestores: añade el primero."}));};pinta();
  dlg(titulo,[lst,el("button",{type:"button",class:"btn sec peq",style:"justify-self:start",text:"+ Gestor nuevo",onclick:()=>nuevoGestor(id=>{s.add(id);pinta();})})],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{try{await alGuardar([...s]);}catch(e){toast("No se pudo guardar");return false;}render(true);}}]);}
function vGest(v){const h=hoy(),lun=gestSem||lunesG(h),S=semanaGest(lun),G=gCfg(),fin=sumaDias(lun,6);
  const cab=el("div",{style:"display:flex;gap:8px;align-items:center;flex-wrap:wrap"},[
    el("button",{type:"button",class:"btn sec peq","aria-label":"Semana anterior",text:"‹",onclick:()=>{gestSem=semMasG(lun,-1);render(true);}}),
    el("b",{id:"gSem",text:"Semana del "+fmtF(lun)+" al "+fmtF(fin)}),
    el("button",{type:"button",class:"btn sec peq","aria-label":"Semana siguiente",text:"›",onclick:()=>{gestSem=semMasG(lun,1);render(true);}}),
    lun!==lunesG(h)?el("button",{type:"button",class:"btn txt peq",text:"Esta semana",onclick:()=>{gestSem="";render(true);}}):null]);
  const origen=G.sem[lun]?el("p",{class:"hint",style:"margin:0",text:"Semana guardada. Toca un relevo para cambiarlo."}):
    S.de?el("div",{class:"banner",text:"Sale sola por la rotación desde la semana del "+fmtF(S.de)+" (mañana → noche → tarde → mañana). Si esta semana es distinta, toca un relevo y se guarda."}):
    el("div",{class:"banner w",text:"Pon quién está en cada relevo esta semana. Las semanas siguientes saldrán solas por la rotación."});
  const guardaCelda=(u,ids)=>{const g=Object.assign({},S.g,{[u]:ids});return guardaGest({sem:Object.assign({},G.sem,{[lun]:g})});};
  const filas=el("div",{class:"g-rel"},RELEVOS_A.map(u=>{const ids=S.g[u]||[];return el("button",{type:"button",class:"g-cel",id:"gCel"+u,"aria-label":"Gestores de "+u,
    onclick:()=>elegirGest("Gestores · "+u+" · semana del "+fmtF(lun),ids,v=>guardaCelda(u,v))},[el("b",{text:u}),
    el("span",{class:"g-ns"},ids.length?ids.map(id=>el("span",{class:"g-n",text:nomGest(id)})):[el("span",{class:"sub",text:"Elegir…"})])]);}));
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Gestores de cada relevo"})),el("div",{class:"bd",style:"display:grid;gap:10px"},[cab,origen,filas])]));
  /* cambios de un día */
  const camb=Object.keys(G.dia).filter(k=>{const f=k.split("|")[0];return f>=lun&&f<=fin;}).sort();
  const dCambio=()=>{const st={f:h>=lun&&h<=fin?h:lun,u:relevoAhoraA()};
    dlg("Cambio de un día (baja o sustitución)",[fld("Día",inp("gcF",st.f,x=>st.f=x,{type:"date"})),fld("Relevo",sel("gcU",RELEVOS_A.map(r=>[r,r]),st.u,x=>st.u=x))],
      [{t:"Cancelar",cls:"sec"},{t:"Elegir quién estuvo",fn:()=>{setTimeout(()=>elegirGest(fmtF(st.f)+" · "+st.u,gestEn(st.f,st.u),v=>guardaGest({dia:Object.assign({},gCfg().dia,{[st.f+"|"+st.u]:v})})),50);}}]);};
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Cambios de un día"}),el("button",{type:"button",class:"btn sec peq der",text:"+ Baja o sustitución",onclick:dCambio})]),
    el("div",{class:"bd"},camb.length?el("div",{class:"lst"},camb.map(k=>{const[f,u]=k.split("|");return el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},[
      el("div",{class:"t1",text:fmtF(f)+" · "+u+": "+(G.dia[k].map(nomGest).join(" y ")||"nadie")}),el("div",{class:"t2",text:"en vez de "+((S.g[u]||[]).map(nomGest).join(" y ")||"nadie")})]),
      el("button",{type:"button",class:"btn sec peq",text:"Quitar",onclick:async()=>{const d=Object.assign({},gCfg().dia);delete d[k];try{await guardaGest({dia:d});render(true);}catch(e){toast("No se pudo guardar");}}})]);})):
      el("p",{class:"hint",style:"margin:0",text:"Sin cambios esta semana."}))]));
  /* lista de gestores */
  const renombrar=x=>{let n=x.n;dlg("Cambiar el nombre",[el("p",{class:"hint",text:"Se cambia en todas las semanas y en lo ya apuntado."}),fld("Nombre",inp("gRen",n,y=>n=y,{autocomplete:"off"}))],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{n=String(n).trim();if(!n){toast("Pon el nombre");return false;}try{await guardaGest({lista:gCfg().lista.map(z=>z.id===x.id?Object.assign({},z,{n}):z)});}catch(e){toast("No se pudo guardar");return false;}render(true);}}]);};
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Gestores"})),el("div",{class:"bd",style:"display:grid;gap:8px"},[
    el("div",{class:"g-todos"},G.lista.map(x=>el("span",{class:"g-n"+(x.baja?" baja":"")},[el("button",{type:"button",class:"g-ed","aria-label":"Cambiar el nombre de "+x.n,text:x.n+" ✎",onclick:()=>renombrar(x)}),
      el("button",{type:"button",class:"g-x","aria-label":(x.baja?"Volver a poner a ":"Quitar a ")+x.n,text:x.baja?"↺":"×",onclick:async()=>{try{await guardaGest({lista:gCfg().lista.map(z=>z.id===x.id?Object.assign({},z,{baja:!z.baja}):z)});render(true);}catch(e){toast("No se pudo guardar");}}})]))
      .concat([el("button",{type:"button",class:"btn sec peq",id:"gNuevo",text:"+ Gestor",onclick:()=>nuevoGestor()})])),
    el("p",{class:"hint",style:"margin:0",text:"Toca un nombre para cambiarlo. Con × lo quitas de las listas sin borrar lo que ya está apuntado con él. Al apuntar un cambio de pistón, elige el gestor y el relevo se pone solo."})])]));}
/* casilla «Gestor» en los formularios de pistones: al elegirlo, el relevo del día */
function selGestor(id,d,relId){const L=gCfg().lista.filter(x=>!x.baja||x.id===d.gest);if(!L.length)return null;
  const f=d.f||hoy();
  return fld("Gestor",sel(id,L.map(x=>{const u=relevoDeGest(x.id,f);return[x.id,x.n+(u?" ("+u.toLowerCase()+")":"")];}),d.gest||"",x=>{d.gest=x||"";
    const u=x?relevoDeGest(x,d.f||hoy()):null;if(u){d.u=u;const r=$(relId);if(r)r.value=u;}},"—"));}
window.relevoDeGest=relevoDeGest;window.gestEn=gestEn;

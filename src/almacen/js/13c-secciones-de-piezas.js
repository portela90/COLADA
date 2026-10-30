/* ===== CADA PIEZA CON LAS MISMAS PESTAÑAS =====
   Resumen (la pantalla de siempre) · Cambios · Por máquina · Gasto · Referencias · Más cosas
   «Más cosas» sirve para ir añadiendo lo que se nos ocurra sin tocar el programa:
   avisos fijos, documentos y fotos, enlaces, listas de comprobación e ideas para la app.
   Se guarda en cat.secc[pieza] = {avisos:[], docs:[], enlaces:[], listas:[]} y cat.ideas = []. */
const SECC_T=[["res","Resumen"],["cam","Cambios"],["maq","Por máquina"],["gas","Gasto"],["ref","Referencias"],["mas","Más cosas"]];
const nomArtC=a=>a?(TEC(a.fam)?nomBT(a):a.desc):"?";
/* consumo sin máquina apuntada: se saca de la nota («Horno H-F25: …») o, si el artículo solo está asignado a una máquina, de esa */
function maqDeSalida(x,a){const m=String(x.nota||"").match(/\bH-?([FM]\d{1,3})\b|\b([FM]\d{1,3})\b/i);if(m){const c=(m[1]||m[2]).toUpperCase(),q=cat.maquinas.find(z=>z.cod.toUpperCase()===c);if(q)return q.id;}
  if(a&&(a.iny||[]).length===1&&cat.maquinas.some(z=>z.id===a.iny[0]))return a.iny[0];return null;}
const salidasFam=fs=>todosMov().filter(x=>x.tipo==="salida"&&!/^Cambio de pistón/.test(x.nota||"")).filter(x=>{const a=art(x.art);return a&&fs(a);})
  .map(x=>{const a=art(x.art),c=+x.cant||0;return{f:x.f,ts:x.ts||0,maq:x.maq||maqDeSalida(x,a),nave:x.nave||null,fam:typeof famLbl==="function"?famLbl(a):"",ref:nomArtC(a),cant:c,ud:a.ud||"ud",eur:c*precioDe(a),quien:x.por||(x.resp?respTxt(x.resp):""),txt:x.motivo?cap(x.motivo):(x.nota||""),ir:()=>ficha(a)};});
/* lo que cada pieza aporta: sus cambios (para Cambios, Por máquina y Gasto) y sus referencias */
/* el desperfecto de una reparación, en pocos tipos (está escrito a mano y cada vez de una forma) */
const MOT_REP=[["Postizo roto",/postizo/],["Pistón agarrotado",/agarrot/],["Pistón roto",/rotura de piston|piston roto|se suelta el piston/],["Rosca",/rosca/],["Enchufes o racores de agua",/enchufe|racor/],
  ["Fuga de agua",/fuga/],["Poros",/poro/],["Refrigeración (no circula el agua)",/circula|refrigera|obstru|conducto|tubo interior/],["Rajado o grieta",/rajad|grieta|fisura/],["Galleta",/galleta/]];
const motivoRep=d=>{const t=gNorm(d);if(!t.trim())return"Sin indicar";const m=MOT_REP.find(([,re])=>re.test(t));return m?m[0]:"Otros";};
const SECC={
  pist:{nom:"Pistones",base:v=>vPist(v),uno:"pistón",unos:"pistones",
    ev:()=>todosPist().map(p=>{const c=+p.cant||1,a=pistArt(p.diam);return{f:p.f,ts:p.ts||0,maq:p.maq,ref:p.diam,cant:c,ud:"ud",eur:c*precioDe(a),quien:p.resp?respTxt(p.resp):(p.por||""),txt:cap(p.motivo||""),ir:a?()=>ficha(a):null};}),
    refs:()=>artsActivos().filter(a=>a.fam==="piston").sort((a,b)=>String(a.diam).localeCompare(String(b.diam),"es",{numeric:true})).map(a=>({t:a.desc,s:"hay "+fmtN(stockDe(a.id))+" "+a.ud+(a.min?" · mínimo "+fmtN(a.min):""),ir:()=>ficha(a),n:nivel(a)}))},
  ejes:{nom:"Ejes",base:v=>vEjes(v),uno:"reparación",unos:"reparaciones",
    ev:()=>todasRep().filter(r=>r.res!=="anulada"&&!r.recuento&&r.env).map(r=>{const e=ejes.find(z=>z.cod===r.eje),ok=r.res==="ok"&&r.rec;
      const md=modelo(modeloDeEje(r.eje));
      return{f:ok?r.rec:r.env,ts:r.ts||0,maq:r.maq||(e&&e.maq)||null,ref:r.eje,mod:md?md.ref:"",cant:1,ud:"rep.",eur:ok?costeRep(r).v:0,quien:r.por||"",txt:motivoRep(r.desp),det:(r.desp||"").trim(),
        est:ok?"Reparado (vuelve el "+fmtF(r.rec)+")":r.res?cap(r.res):"En el taller desde el "+fmtF(r.env),ir:e?()=>fichaEje(e):null};}),
    refs:()=>(cat.modelos||[]).slice().sort((a,b)=>String(a.cod).localeCompare(String(b.cod),"es",{numeric:true})).map(x=>{const es=ejes.filter(e=>e.mod===x.cod);return{t:x.ref+" ("+x.cod+")",s:es.filter(e=>e.estado==="planta").length+"/"+es.length+" en planta"+((x.docs||[]).length?" · con plano":" · sin plano")+(+x.precioRep>0?" · reparación "+eur(+x.precioRep):""),ir:()=>fichaModelo(x)};})},
  cont:{nom:"Contenedores",base:v=>vCont(v),uno:"cambio",
    ev:()=>todosMlog().filter(x=>x.tipo==="cont").map(x=>{const c=contDe(x.val||x.antes);return{f:x.f,ts:x.ts||0,maq:x.maq,ref:c?c.cod:"?",cant:1,ud:"cambio",eur:0,quien:x.by||"",txt:x.val?"Se pone"+(x.antes?" (sale el "+((contDe(x.antes)||{}).cod||"?")+")":""):"Se quita",ir:c?()=>fichaCont(c):null};}),
    refs:()=>CT_TIPOS.map(t=>{const c=cuentaTipo(t);return{t:txtTipo(t),s:c.tot?c.est+" en la estantería · "+c.maq+" puestos · "+c.tal+" en el taller":"sin alta",ir:()=>dlgTipo(t),n:c.tot&&!c.est?"bad":""};})},
  btb:{nom:"Barras expulsoras",base:v=>vBT(v,"barra"),uno:"cambio",ev:()=>salidasFam(a=>a.fam==="barra"),refs:()=>refsBT("barra")},
  btt:{nom:"Tornillos tope",base:v=>vBT(v,"tornillo"),uno:"cambio",ev:()=>salidasFam(a=>a.fam==="tornillo"),refs:()=>refsBT("tornillo")},
  bth:{nom:"Horno",base:v=>vBT(v,"horno"),uno:"cambio",ev:()=>salidasFam(a=>a.fam==="horno"),refs:()=>refsBT("horno")},
  quim:{nom:"Aceites, taladrinas y jabones",base:v=>vQuim(v),uno:"consumo",unos:"consumos",ev:()=>salidasFam(a=>GRUPOS_Q.includes(grupoDe(a))),
    refs:()=>artsActivos().filter(a=>GRUPOS_Q.includes(grupoDe(a))).sort((a,b)=>a.desc.localeCompare(b.desc,"es")).map(a=>({t:a.desc,s:[GRUPO_N[grupoDe(a)],envTxt(a),"hay "+fmtN(Math.round(stockDe(a.id)))+" "+(a.ud||"kg")].filter(Boolean).join(" · "),ir:()=>ficha(a),n:nivel(a)}))}};
function refsBT(f){return artsBT(f).map(a=>({t:nomBT(a),s:["hay "+fmtN(stockDe(a.id))+" "+a.ud,revVig(a)?"plano "+revTxt(revVig(a).n):(a.docs||[]).length?"con documentos":"sin plano",maqsArt(a).length?maqsArt(a).join(", "):null].filter(Boolean).join(" · "),ir:()=>ficha(a),n:nivel(a)}));}
const seccDe=id=>{cat.secc=cat.secc||{};const s=cat.secc[id]=cat.secc[id]||{};["avisos","docs","enlaces","listas"].forEach(k=>{if(!Array.isArray(s[k]))s[k]=[];});return s;};
const PER_S=[["30","30 días"],["90","3 meses"],["365","1 año"],["todo","Todo"]];
const desdePer=k=>k==="todo"?"0000":sumaDias(hoy(),-(+k));
const maqTxt=e=>e.maq?maqN(e.maq):e.nave||"Sin máquina";

function vSecc(id,v){const S=SECC[id];draft.st=draft.st||{};const t=draft.st[id]||"res";
  v.appendChild(el("div",{class:"op-tabs secc-tabs",role:"tablist","aria-label":S.nom},SECC_T.map(([k,n])=>el("button",{type:"button",role:"tab","aria-selected":String(t===k),text:n+(k==="mas"&&nExtras(id)?" ("+nExtras(id)+")":""),onclick:()=>{draft.st[id]=k;render(true);}}))));
  const sc=seccDe(id);
  if(t==="res"){sc.avisos.forEach(a=>v.appendChild(el("div",{class:"banner"+(a.nivel==="bad"?" b":a.nivel==="warn"?" w":""),text:a.txt})));return S.base(v);}
  if(t==="mas")return vExtras(id,v);
  if(t==="ref")return vRefs(id,v);
  draft.sp=draft.sp||{};const per=draft.sp[id]||(t==="gas"?"365":"90");const des=desdePer(per);
  v.appendChild(el("div",{class:"chips"},PER_S.map(([k,n])=>el("button",{type:"button",class:"chip","aria-pressed":String(per===k),text:n,onclick:()=>{draft.sp[id]=k;render(true);}}))));
  const E=S.ev().filter(e=>e.f&&e.f>=des).sort((a,b)=>(b.f+String(b.ts).padStart(15,"0")).localeCompare(a.f+String(a.ts).padStart(15,"0")));
  const hayE=E.some(e=>e.eur>0),tot=E.reduce((s,e)=>s+e.cant,0),eu=E.reduce((s,e)=>s+e.eur,0);
  if(t==="cam")return vCamS(S,E,v,hayE,tot,eu);
  if(t==="maq")return vMaqS(S,E,v,hayE);
  if(t==="gas")return vGasS(S,E,v,hayE,eu,per);}
const nExtras=id=>{const s=(cat.secc||{})[id];return s?["avisos","docs","enlaces","listas"].reduce((t,k)=>t+((s[k]||[]).length),0):0;};

function vCamS(S,E,v,hayE,tot,eu){draft.sq=draft.sq||"";
  v.appendChild(el("dl",{class:"kpis num"},[["Apuntes",fmtN(E.length)],["Cantidad",fmtN(Math.round(tot*10)/10)],["Máquinas",String(new Set(E.filter(e=>e.maq).map(e=>e.maq)).size)],[hayE?"Gasto":"Último",hayE?eur(eu):(E[0]?fmtF(E[0].f):"—")]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))));
  const q=inp("sQ",draft.sq,z=>{draft.sq=z;pl();},{type:"search",placeholder:"Busca: referencia, máquina, motivo, quién…",autocomplete:"off"});const lst=el("div",{class:"lst"});
  const pl=()=>{lst.textContent="";const toks=tokQ(draft.sq);const L=E.filter(e=>!toks.length||casa([e.ref,maqTxt(e),e.txt,e.quien].join(" "),toks));
    if(!L.length){lst.appendChild(el("p",{class:"hint",style:"padding:10px 14px",text:"No hay nada apuntado en este periodo."}));return;}
    L.slice(0,250).forEach(e=>lst.appendChild(el(e.ir?"button":"div",Object.assign({class:"it"},e.ir?{type:"button",onclick:e.ir}:{style:"cursor:default"}),[el("div",{class:"ppal"},[el("div",{class:"t1",text:e.ref+" · "+maqTxt(e)}),
      el("div",{class:"t2",text:[fmtF(e.f),e.txt,e.quien].filter(Boolean).join(" · ")})]),el("div",{class:"cant num"},[el("b",{text:fmtN(e.cant)}),el("small",{text:e.ud+(e.eur?" · "+eur(e.eur):"")})])])));
    if(L.length>250)lst.appendChild(el("p",{class:"hint",style:"padding:8px 14px",text:"Salen los 250 últimos. Acota con el buscador o el periodo."}));};
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Cambios de "+S.nom.toLowerCase()})),el("div",{style:"padding:8px 12px 0"},q),lst]));pl();}

function vMaqS(S,E,v,hayE){const G={};E.forEach(e=>{const k=e.maq||("n:"+(e.nave||""));const g=G[k]=G[k]||{k,maq:e.maq,nom:maqTxt(e),n:0,cant:0,eur:0,ult:"",refs:{}};g.n++;g.cant+=e.cant;g.eur+=e.eur;if(e.f>g.ult)g.ult=e.f;g.refs[e.ref]=(g.refs[e.ref]||0)+e.cant;});
  const L=Object.values(G).sort((a,b)=>b.cant-a.cant||b.eur-a.eur);const mx=Math.max(1,...L.map(g=>g.cant));
  const media=L.filter(g=>g.maq).length?L.filter(g=>g.maq).reduce((s,g)=>s+g.cant,0)/L.filter(g=>g.maq).length:0;
  v.appendChild(el("p",{class:"hint",text:"Ordenadas por la que más "+(S.unos||S.uno+"s")+" lleva en el periodo. En naranja: más del doble de la media."}));
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:S.nom+" por máquina"}),el("span",{class:"der sub",text:L.length+" sitio"+(L.length===1?"":"s")})]),
    L.length?el("div",{class:"lst"},L.map(g=>{const m=g.maq?maqDe(g.maq):null;return el(m?"button":"div",Object.assign({class:"it"},m?{type:"button",onclick:()=>fichaIny(m)}:{style:"cursor:default"}),[el("span",{class:"stripe "+(g.maq&&media&&g.cant>media*2?"warn":"")}),
      el("div",{class:"ppal"},[el("div",{class:"t1",text:g.nom}),el("div",{class:"t2",text:[Object.entries(g.refs).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([r,c])=>r+" ×"+fmtN(c)).join(", "),"último "+fmtF(g.ult)].join(" · ")}),
        el("div",{class:"sbar",style:"margin-top:6px"},el("i",{style:"width:"+Math.round(g.cant/mx*100)+"%"}))]),
      el("div",{class:"cant num"},[el("b",{text:fmtN(Math.round(g.cant*10)/10)}),el("small",{text:hayE?eur(g.eur):g.n+" apunte"+(g.n===1?"":"s")})])]);})):el("p",{class:"hint",style:"padding:10px 14px",text:"No hay nada apuntado en este periodo."})]));}

function vGasS(S,E,v,hayE,eu,per){const mes=hoy().slice(0,7),ant=(()=>{const d=new Date(+mes.slice(0,4),+mes.slice(5,7)-2,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");})();
  const enM=m=>E.filter(e=>e.f.slice(0,7)===m),val=L=>hayE?L.reduce((s,e)=>s+e.eur,0):L.reduce((s,e)=>s+e.cant,0),fmtV=x=>hayE?eur(x):fmtN(Math.round(x*10)/10);
  const ms=[...new Set(E.map(e=>e.f.slice(0,7)))].sort();const med=ms.length?val(E)/ms.length:0;
  v.appendChild(el("dl",{class:"kpis num"},[["Este mes",fmtV(val(enM(mes)))],["Mes anterior",fmtV(val(enM(ant)))],["En el periodo",fmtV(val(E))],["Media al mes",fmtV(med)]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))));
  if(!hayE)v.appendChild(el("div",{class:"banner",text:"Sin precios todavía: se cuenta en unidades. Cuando los artículos"+(S===SECC.ejes?" (o los modelos de eje)":"")+" tengan precio, saldrá en euros."}));
  const M=[];{let d=new Date(+mes.slice(0,4),+mes.slice(5,7)-1,1);for(let i=0;i<12;i++){M.unshift(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));d=new Date(d.getFullYear(),d.getMonth()-1,1);}}
  const box=el("div",{style:"padding:4px 8px 8px;min-height:190px"});
  if(window.GRAF)setTimeout(()=>{try{GRAF.barras(box,{x:M.map(m=>cap(fmtMes(m)).slice(0,3)),series:[{name:hayE?"Gasto":"Cantidad",data:M.map(m=>Math.round(val(S.ev().filter(e=>e.f&&e.f.slice(0,7)===m))*100)/100)}],fmt:hayE?"eur":"n",alto:180});}catch(e){}},0);
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Últimos 12 meses"}),el("span",{class:"der sub",text:hayE?"en euros":"en unidades"})]),box]));
  const R={};E.forEach(e=>{const r=R[e.ref]=R[e.ref]||{ref:e.ref,cant:0,eur:0,ud:e.ud,ir:e.ir};r.cant+=e.cant;r.eur+=e.eur;});
  const RL=Object.values(R).sort((a,b)=>hayE?b.eur-a.eur:b.cant-a.cant);
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Por referencia"})),RL.length?el("div",{class:"lst"},RL.map(r=>el(r.ir?"button":"div",Object.assign({class:"it"},r.ir?{type:"button",onclick:r.ir}:{style:"cursor:default"}),[el("div",{class:"ppal"},[el("div",{class:"t1",text:r.ref}),el("div",{class:"t2",text:fmtN(Math.round(r.cant*10)/10)+" "+r.ud})]),
    el("div",{class:"cant num"},[el("b",{text:hayE?eur(r.eur):fmtN(Math.round(r.cant*10)/10)}),el("small",{text:hayE&&eu?Math.round(r.eur/eu*100)+" %":r.ud})])]))):el("p",{class:"hint",style:"padding:10px 14px",text:"Nada en este periodo."})]));}

function vRefs(id,v){const S=SECC[id],sc=seccDe(id),R=S.refs();
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:id==="ejes"?"Modelos de eje":id==="cont"?"Tipos (como el panel)":"Referencias"}),el("span",{class:"der sub",text:String(R.length)})]),
    R.length?el("div",{class:"lst"},R.map(x=>el("button",{type:"button",class:"it",onclick:x.ir},[el("span",{class:"stripe "+(x.n==="bad"?"bad":x.n==="warn"?"warn":"")}),el("div",{class:"ppal"},[el("div",{class:"t1",text:x.t}),el("div",{class:"t2",text:x.s})])]))):el("p",{class:"hint",style:"padding:10px 14px",text:"Todavía no hay referencias."})]));
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Documentos y fotos de "+S.nom.toLowerCase()})),el("div",{class:"bd",style:"display:grid;gap:10px"},[
    el("div",{style:"display:flex;flex-wrap:wrap;gap:10px"},sc.docs.length?sc.docs.map(d=>docThumb(d,async()=>{sc.docs=sc.docs.filter(z=>z.id!==d.id);await saveCat();toast("Archivo quitado");render(true);})):[el("p",{class:"hint",text:"Catálogos del proveedor, fichas técnicas, fotos de cómo se monta… Lo de cada pieza concreta va en su ficha."})]),
    subirDoc(async d=>{sc.docs.push(d);await saveCat();toast("Guardado");render(true);},"Subir foto o documento (PDF o imagen)")].filter(Boolean))]));
  if(sc.enlaces.length)v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Enlaces"})),el("div",{class:"lst"},sc.enlaces.map(x=>el("a",{class:"it",href:x.url,target:"_blank",rel:"noopener"},[el("div",{class:"ppal"},[el("div",{class:"t1",text:x.t}),el("div",{class:"t2",text:x.url})])])))]));}

/* ---------- Más cosas: lo que se vaya necesitando ---------- */
const TIPOS_X=[["aviso","Aviso fijo","Una nota que sale arriba del Resumen de "],["doc","Documento o foto","Se guarda en Referencias, junto a "],["enlace","Enlace","Una web o archivo de fuera (proveedor, manual…) para "],["lista","Lista de comprobación","Casillas para marcar, por ejemplo una revisión periódica de "],["idea","Idea para la app","Algo que te gustaría que hiciera la app con "]];
function vExtras(id,v){const S=SECC[id],sc=seccDe(id);
  v.appendChild(el("div",{class:"card"},el("div",{class:"bd",style:"display:grid;gap:10px"},[el("p",{class:"hint",style:"margin:0",text:"Aquí vas añadiendo lo que se os ocurra para "+S.nom.toLowerCase()+" según uséis la app. Las ideas quedan apuntadas para mejorarla."}),
    el("button",{type:"button",class:"btn",text:"＋ Añadir",onclick:()=>elegirExtra(id)})])));
  const card=(t,kids)=>v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:t})),...kids]));
  if(sc.avisos.length)card("Avisos fijos",[el("div",{class:"lst"},sc.avisos.map(a=>el("div",{class:"it",style:"cursor:default"},[el("span",{class:"stripe "+(a.nivel||"")}),el("div",{class:"ppal"},[el("div",{class:"t1",text:a.txt}),el("div",{class:"t2",text:[fmtF(a.f),a.por].filter(Boolean).join(" · ")})]),
    el("button",{type:"button",class:"btn sec peq",text:"Quitar",onclick:()=>confirmar("Quitar aviso",a.txt,"Quitar",async()=>{sc.avisos=sc.avisos.filter(z=>z.id!==a.id);await saveCat();render(true);})})])))]);
  sc.listas.forEach(L=>{const hechos=L.items.filter(i=>i.ok).length;
    card(L.t+" ("+hechos+"/"+L.items.length+")",[el("div",{class:"lst"},L.items.map(i=>el("label",{class:"it",style:"cursor:pointer;gap:10px"},[el("input",{type:"checkbox",checked:!!i.ok,style:"width:22px;height:22px;flex:none",onchange:async e=>{i.ok=e.target.checked?{f:hoy(),por:quienSoy()}:null;await saveCat();render(true);}}),
      el("div",{class:"ppal"},[el("div",{class:"t1",text:i.t}),i.ok?el("div",{class:"t2",text:"Hecho el "+fmtF(i.ok.f)+(i.ok.por?" · "+i.ok.por:"")}):null])]))),
      el("div",{class:"acciones",style:"padding:8px 12px 12px"},[el("button",{type:"button",class:"btn sec peq",text:"Empezar de nuevo",onclick:()=>confirmar("Empezar de nuevo",L.t+": se desmarcan todas las casillas.","Desmarcar",async()=>{L.hist=(L.hist||[]).concat([{f:hoy(),hechos,de:L.items.length}]).slice(-24);L.items.forEach(i=>i.ok=null);await saveCat();render(true);})}),
        el("button",{type:"button",class:"btn sec peq",text:"Quitar lista",onclick:()=>confirmar("Quitar lista",L.t,"Quitar",async()=>{sc.listas=sc.listas.filter(z=>z.id!==L.id);await saveCat();render(true);})}),
        (L.hist||[]).length?el("span",{class:"sub",text:"Última vez: "+fmtF(L.hist[L.hist.length-1].f)+" ("+L.hist[L.hist.length-1].hechos+"/"+L.hist[L.hist.length-1].de+")"}):null])]);});
  if(sc.enlaces.length)card("Enlaces",[el("div",{class:"lst"},sc.enlaces.map(x=>el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},[el("a",{class:"t1",href:x.url,target:"_blank",rel:"noopener",text:x.t}),el("div",{class:"t2",text:x.url})]),
    el("button",{type:"button",class:"btn sec peq",text:"Quitar",onclick:()=>confirmar("Quitar enlace",x.t,"Quitar",async()=>{sc.enlaces=sc.enlaces.filter(z=>z.id!==x.id);await saveCat();render(true);})})])))]);
  if(sc.docs.length)card("Documentos y fotos",[el("div",{class:"bd",style:"display:flex;flex-wrap:wrap;gap:10px"},sc.docs.map(d=>docThumb(d,async()=>{sc.docs=sc.docs.filter(z=>z.id!==d.id);await saveCat();render(true);})))]);
  const ideas=(cat.ideas||[]).filter(x=>x.secc===id);
  if(ideas.length)card("Ideas apuntadas",[el("div",{class:"lst"},ideas.slice().reverse().map(x=>el("div",{class:"it",style:"cursor:default"},[el("span",{class:"stripe "+(x.hecha?"ok":"")}),el("div",{class:"ppal"},[el("div",{class:"t1",text:x.txt}),el("div",{class:"t2",text:[fmtF(x.f),x.por,x.hecha?"hecha":"pendiente"].filter(Boolean).join(" · ")})])])))]);}
function elegirExtra(id){const S=SECC[id];
  dlg("¿Qué quieres añadir?",[el("div",{class:"lst"},TIPOS_X.map(([k,t,s])=>el("button",{type:"button",class:"it",onclick:()=>{cerrarDlgs();formExtra(id,k);}},[el("div",{class:"ppal"},[el("div",{class:"t1",text:t}),el("div",{class:"t2",text:s+S.nom.toLowerCase()+"."})])])))],[{t:"Cancelar",cls:"sec"}]);}
function formExtra(id,k){const S=SECC[id],sc=seccDe(id),x={txt:"",t:"",url:"",items:"",nivel:""};const por=quienSoy();
  if(k==="doc"){const up=subirDoc(async d=>{sc.docs.push(d);await saveCat();toast("Guardado");cerrarDlgs();render(true);},"Elegir foto o documento (PDF o imagen)");
    dlg("Documento o foto · "+S.nom,[up||el("p",{class:"hint",text:"No se pueden subir archivos ahora mismo (sin conexión)."})],[{t:"Cerrar",cls:"sec"}]);return;}
  const C={aviso:[fld("Qué tiene que salir",inp("xA",x.txt,z=>x.txt=z,{placeholder:"p. ej. Los D5 se piden a … con 3 semanas de plazo",autocomplete:"off"})),
      el("div",{},[el("div",{class:"sub",style:"margin-bottom:6px",text:"Color"}),(()=>{const sg=el("div",{class:"seg",role:"group"},[["","Normal"],["warn","Importante"],["bad","Urgente"]].map(([n,t])=>{const b=el("button",{type:"button","aria-pressed":String(x.nivel===n),text:t});b.onclick=()=>{x.nivel=n;sg.querySelectorAll("button").forEach(z=>z.setAttribute("aria-pressed",String(z===b)));};return b;}));return sg;})()])],
    enlace:[fld("Nombre",inp("xT",x.t,z=>x.t=z,{placeholder:"p. ej. Catálogo del proveedor",autocomplete:"off"})),fld("Dirección (https://…)",inp("xU",x.url,z=>x.url=z,{type:"url",inputmode:"url",placeholder:"https://",autocomplete:"off"}))],
    lista:[fld("Nombre de la lista",inp("xL",x.t,z=>x.t=z,{placeholder:"p. ej. Revisión mensual de contenedores",autocomplete:"off"})),
      fld("Casillas (una por línea)",(()=>{const a=el("textarea",{rows:5,placeholder:"Mirar desgaste interior\nComprobar pegatina\nLimpiar"});a.oninput=()=>x.items=a.value;return a;})())],
    idea:[fld("Qué te gustaría",(()=>{const a=el("textarea",{rows:4,placeholder:"p. ej. Que avise cuando un contenedor lleve más de 3 meses puesto"});a.oninput=()=>x.txt=a.value;return a;})()),
      el("p",{class:"hint",text:"Queda apuntada aquí y en Catálogo › Ideas, para ir mejorando la app."})]}[k];
  const nom=(TIPOS_X.find(z=>z[0]===k)||[])[1];
  dlg(nom+" · "+S.nom,C,[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const id2=uid(),f=hoy();
    if(k==="aviso"){if(!x.txt.trim()){toast("Escribe el aviso");return false;}sc.avisos.push({id:id2,txt:x.txt.trim(),nivel:x.nivel,f,por});}
    if(k==="enlace"){const u=x.url.trim();if(!/^https?:\/\/\S+\.\S+/.test(u)){toast("Pon una dirección que empiece por https://");return false;}sc.enlaces.push({id:id2,t:x.t.trim()||u,url:u,f,por});}
    if(k==="lista"){const it=x.items.split("\n").map(s=>s.trim()).filter(Boolean);if(!x.t.trim()||!it.length){toast("Pon el nombre y al menos una casilla");return false;}sc.listas.push({id:id2,t:x.t.trim(),items:it.map(t=>({id:uid(),t,ok:null})),f,por});}
    if(k==="idea"){if(!x.txt.trim()){toast("Escribe la idea");return false;}cat.ideas=(cat.ideas||[]).concat([{id:id2,secc:id,txt:x.txt.trim(),f,por,hecha:false}]);}
    try{await saveCat();toast("Guardado");}catch(e){toast("No se pudo guardar");return false;}draft.st=draft.st||{};draft.st[id]="mas";render(true);}}]);}

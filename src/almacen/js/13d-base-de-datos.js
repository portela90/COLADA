/* ===== BASE DE DATOS: todo lo de la fábrica, conectado, para consultar por tipo =====
   Hornos, máquinas, modelos de eje, ejes, contenedores, moldes, pistones, barras, tornillos,
   recambios de horno, aceites/taladrinas/jabones y demás consumibles.
   Cada tipo se puede agrupar por cualquiera de sus datos («¿qué modelos de horno tenemos?»),
   filtrar tocando un grupo, buscar, abrir la ficha (que enlaza con lo demás) y bajar a Excel. */
const sinD="Sin dato";
const vf=(m,c)=>valFicha(m,c)||"";
const maqsTxt=ids=>ids.map(id=>maqN(id)).filter(x=>x&&x!=="—").sort((a,b)=>a.localeCompare(b,"es",{numeric:true})).join(", ");
const nivTxt=a=>a.pedido?"Pedido":(C_EST[nivel(a)]||["—"])[0];
const artBD=(nom,fs,extra)=>({nom,filas:()=>artsActivos().filter(fs).sort((a,b)=>(a.cod||a.desc).localeCompare(b.cod||b.desc,"es",{numeric:true})),
  cols:[["Artículo",a=>TEC(a.fam)?nomBT(a):a.desc],["Código",a=>a.cod||""]].concat(extra||[]).concat([["Stock",a=>fmtN(Math.round(stockDe(a.id)*10)/10)+" "+(a.ud||"ud")],["Estado",nivTxt],["Proveedor",a=>provN(a.prov)||sinD],["Máquinas",a=>maqsTxt(a.iny||[])||"—"],["Precio",a=>precioDe(a)?eur(precioDe(a)):"—"]]),
  grupos:["Estado","Proveedor"].concat((extra||[]).map(x=>x[0])),abrir:a=>ficha(a)});
function tiposBD(){
  const maqs=()=>cat.maquinas.slice().sort((a,b)=>numMaqCod(a.cod)-numMaqCod(b.cod));
  const camposMaq=plantilla().filter(c=>!c.auto&&c.ops&&c.ops.length&&c.id!=="c-oper").map(c=>[c.nom,m=>vf(m,c.id)||sinD]);
  return{
  hornos:{nom:"Hornos",uno:"horno",filas:maqs,
    cols:[["Máquina",m=>m.cod],["Modelo de horno",m=>{const t=vf(m,"c-htipo"),mc=vf(m,"c-horno"),k=vf(m,"c-hmed");return mc?(mc+(k?" "+k:"")):(t==="Abierto"?"Abierto"+(k?" "+k:""):sinD);}],
      ["Marca",m=>vf(m,"c-horno")||(vf(m,"c-htipo")==="Abierto"?"Abierto (sin marca)":sinD)],["Capacidad",m=>vf(m,"c-hmed")||sinD],["Tipo",m=>vf(m,"c-htipo")||sinD],
      ["Zona",m=>zonaDe(m)],["Modelo de máquina",m=>vf(m,"c-maq")||sinD],["Recambios en su lista",m=>String(artsActivos().filter(a=>a.fam==="horno"&&(a.iny||[]).includes(m.id)).length)]],
    grupos:["Modelo de horno","Marca","Capacidad","Tipo","Zona"],abrir:m=>fichaIny(m)},
  maquinas:{nom:"Máquinas",uno:"máquina",filas:maqs,
    cols:[["Máquina",m=>m.cod],["Zona",m=>zonaDe(m)]].concat(camposMaq.filter(c=>c[0]!=="Zona")).concat([["Ø pistón",m=>diamDe(m)||sinD],["Largo de contenedor",m=>letraMaq(m)?letraMaq(m)+" · "+CT_L[letraMaq(m)].mm+" mm":sinD],
      ["Contenedor puesto",m=>(contDe(hoyDe(m).cont)||{}).cod||"—"],["Molde puesto",m=>(moldeDe(hoyDe(m).molde)||{}).cod||"—"],["Eje puesto",m=>(ejeEnMaq(m.cod)||{}).cod||"—"],
      ["Modelos de eje",m=>(cat.modelos||[]).filter(x=>inyDe(x).includes(m.cod)).map(x=>x.ref).join(", ")||"—"]]),
    grupos:["Zona"].concat(camposMaq.filter(c=>c[0]!=="Zona").map(c=>c[0])).concat(["Ø pistón","Largo de contenedor"]),abrir:m=>fichaIny(m)},
  modelos:{nom:"Modelos de eje",uno:"modelo",filas:()=>(cat.modelos||[]).slice().sort((a,b)=>String(a.cod).localeCompare(String(b.cod),"es",{numeric:true})),
    cols:[["Referencia",x=>x.ref||x.cod],["Código",x=>x.cod],["Largo",x=>x.long||sinD],["Rosca",x=>x.rosca||sinD],["Máquinas",x=>inyDe(x).join(", ")||"—"],
      ["En planta",x=>{const es=ejes.filter(e=>e.mod===x.cod&&e.estado!=="baja");return es.filter(e=>e.estado==="planta").length+" de "+es.length;}],["Mínimo",x=>+x.min>0?String(x.min):"—"],["Plano",x=>(x.docs||[]).length?"Sí":"No"],["Precio reparación",x=>+x.precioRep>0?eur(+x.precioRep):"—"]],
    grupos:["Largo","Rosca","Plano"],abrir:x=>fichaModelo(x)},
  ejes:{nom:"Ejes",uno:"eje",filas:()=>ejes.filter(e=>e.estado!=="baja").slice().sort(porCod),
    cols:[["Eje",e=>e.cod],["Modelo",e=>{const x=modelo(e.mod);return x?x.ref:e.mod;}],["Dónde está",e=>(EST_E[e.estado]||[e.estado])[0]],["Máquina",e=>e.maq?(maqDe(e.maq)?maqDe(e.maq).cod:e.maq):"—"]],
    grupos:["Dónde está","Modelo","Máquina"],abrir:e=>fichaEje(e)},
  contenedores:{nom:"Contenedores",uno:"contenedor",filas:()=>contens(),
    cols:[["Contenedor",x=>x.cod],["Tipo",x=>tipoCont(x)||sinD],["Largo",x=>{const t=tipoCont(x);return t?CT_L[t[0]].mm+" mm":sinD;}],["Ø interior",x=>{const t=tipoCont(x);return t?"Ø"+CT_D[t[1]]:sinD;}],["Dónde está",x=>txtDonde(x)],["Pegatina",x=>x.peg?cap(x.peg):"Sin pegatina"]],
    grupos:["Tipo","Largo","Ø interior","Dónde está","Pegatina"],abrir:x=>fichaCont(x)},
  moldes:{nom:"Moldes",uno:"molde",filas:()=>moldes(),
    cols:[["Molde",x=>x.cod],["Pieza",x=>x.pieza||"—"],["Ø pistón",x=>x.diam||sinD],["Puesto en",x=>cat.maquinas.filter(m=>hoyDe(m).molde===x.id).map(m=>m.cod).join(", ")||"Sin máquina"]],
    grupos:["Ø pistón","Puesto en"],abrir:x=>formMolde(x)},
  pistones:artBD("Pistones",a=>a.fam==="piston",[["Ø",a=>a.diam||sinD]]),
  barras:artBD("Barras expulsoras",a=>a.fam==="barra",[["Plano",a=>revVig(a)?revTxt(revVig(a).n):"Sin plano"]]),
  tornillos:artBD("Tornillos tope",a=>a.fam==="tornillo"),
  rhorno:artBD("Recambios de horno",a=>a.fam==="horno",[["Grupo",a=>a.grupo||"Otros"]]),
  quim:artBD("Aceites, taladrinas y jabones",a=>GRUPOS_Q.includes(grupoDe(a)),[["Grupo",a=>GRUPO_N[grupoDe(a)]],["Envase",a=>envTxt(a)||sinD]]),
  otros:artBD("Otros consumibles",a=>!["piston","barra","tornillo","horno","eje"].includes(a.fam)&&!GRUPOS_Q.includes(grupoDe(a)),[["Grupo",a=>GRUPO_N[grupoDe(a)]||"Varios"],["Familia",a=>FAM[a.fam]||a.fam]])};}

function vBD(v){const T=tiposBD();draft.bd=draft.bd||{t:"hornos",g:"",f:"",q:""};const B=draft.bd;if(!T[B.t])B.t="hornos";const D=T[B.t];
  if(!D.grupos.includes(B.g))B.g=D.grupos[0];
  v.appendChild(el("p",{class:"hint",text:"Todo lo de la fábrica en un sitio. Elige qué quieres consultar, agrúpalo por el dato que te interese y toca un grupo para ver cuáles son. Cada ficha enlaza con lo demás (el horno con su máquina, la máquina con sus ejes y consumibles…)."}));
  v.appendChild(el("div",{class:"chips bd-tipos"},Object.keys(T).map(k=>el("button",{type:"button",class:"chip","aria-pressed":String(B.t===k),text:T[k].nom+" ("+T[k].filas().length+")",onclick:()=>{B.t=k;B.g="";B.f="";B.q="";render(true);}}))));
  const L=D.filas(),col=n=>D.cols.find(c=>c[0]===n),gcol=col(B.g);
  /* resumen agrupado */
  const G={};L.forEach(x=>{const k=gcol?String(gcol[1](x)):"";(G[k]=G[k]||[]).push(x);});
  const GL=Object.entries(G).sort((a,b)=>(a[0]===sinD)-(b[0]===sinD)||b[1].length-a[1].length||a[0].localeCompare(b[0],"es",{numeric:true}));const mx=Math.max(1,...GL.map(g=>g[1].length));
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:D.nom+" por "+B.g.toLowerCase()}),el("span",{class:"der sub",text:L.length+" en total · "+GL.length+" distintos"})]),
    el("div",{style:"padding:8px 12px 0"},fld("Agrupar por",sel("bdG",D.grupos.map(g=>[g,g]),B.g,z=>{B.g=z;B.f="";render(true);}))),
    el("div",{class:"lst"},GL.map(([k,xs])=>el("button",{type:"button",class:"it"+(B.f===k?" sel":""),"aria-pressed":String(B.f===k),onclick:()=>{B.f=B.f===k?"":k;render(true);}},[
      el("div",{class:"ppal"},[el("div",{class:"t1",text:k||sinD}),el("div",{class:"t2",text:xs.slice(0,8).map(x=>String(D.cols[0][1](x))).join(", ")+(xs.length>8?"…":"")}),el("div",{class:"sbar",style:"margin-top:6px"},el("i",{style:"width:"+Math.round(xs.length/mx*100)+"%"}))]),
      el("div",{class:"cant num"},[el("b",{text:String(xs.length)}),el("small",{text:xs.length===1?D.uno||"":D.nom.toLowerCase()})])])))]));
  /* lista con todos sus datos */
  const q=inp("bdQ",B.q,z=>{B.q=z;pl();},{type:"search",placeholder:"Buscar en "+D.nom.toLowerCase()+"…",autocomplete:"off"});
  const box=el("div");const tit=el("h2");
  const pl=()=>{box.textContent="";const toks=tokQ(B.q);
    const R=L.filter(x=>(!B.f||String(gcol[1](x))===B.f)&&(!toks.length||casa(D.cols.map(c=>c[1](x)).join(" "),toks)));
    tit.textContent=(B.f?D.nom+" · "+B.g.toLowerCase()+": "+B.f:"Todos")+" ("+R.length+")";
    if(!R.length){box.appendChild(el("p",{class:"hint",style:"padding:10px 14px",text:"Nada coincide."}));return;}
    box.appendChild(cTabla(D.cols.map(c=>c[0]),R.map(x=>D.cols.map((c,i)=>i===0?el("button",{type:"button",class:"lnk",text:String(c[1](x)),onclick:()=>D.abrir(x)}):c[1](x)))));};
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[tit,B.f?el("button",{type:"button",class:"btn sec peq der",text:"Quitar filtro",onclick:()=>{B.f="";render(true);}}):null]),
    el("div",{style:"padding:8px 12px;display:grid;gap:8px"},[q,el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec peq",text:"Descargar Excel",onclick:e=>excelBD(T,e.currentTarget)})])]),box]));pl();}

async function excelBD(T,btn){if(!downloads){toast("Esta vista no permite descargar archivos");return;}btn.disabled=true;
  try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();const B=draft.bd;
    /* primero lo que se está viendo; luego una hoja por cada tipo */
    const orden=[B.t].concat(Object.keys(T).filter(k=>k!==B.t));
    orden.forEach(k=>{const D=T[k];const rows=D.filas().map(x=>Object.fromEntries(D.cols.map(c=>[c[0],c[1](x)])));
      const ws=X.utils.json_to_sheet(rows.length?rows:[{[D.cols[0][0]]:"Sin datos"}]);ws["!cols"]=D.cols.map(c=>({wch:Math.min(40,Math.max(10,c[0].length+2))}));
      X.utils.book_append_sheet(wb,ws,D.nom.slice(0,31).replace(/[\\/?*[\]:]/g,""));});
    await downloads.save({filename:"Base_de_datos_fabrica_"+hoy()+".xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Excel descargado");
  }catch(e){toast(e&&e.code==="declined"?"Descarga cancelada":"No se pudo crear el Excel");}btn.disabled=false;}

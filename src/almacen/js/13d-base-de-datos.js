/* ===== BASE DE DATOS: todo lo de la fábrica, conectado, para consultar por tipo =====
   Hornos, máquinas, modelos de eje, ejes, contenedores, moldes, pistones, barras, tornillos,
   recambios de horno, aceites/taladrinas/jabones y demás consumibles.
   Cada tipo se puede agrupar por cualquiera de sus datos («¿qué modelos de horno tenemos?»),
   filtrar tocando un grupo, buscar, abrir la ficha (que enlaza con lo demás) y bajar a Excel. */
const sinD="Sin dato";
const vf=(m,c)=>valFicha(m,c)||"";
const maqsTxt=ids=>ids.map(id=>maqN(id)).filter(x=>x&&x!=="—").sort((a,b)=>a.localeCompare(b,"es",{numeric:true})).join(", ");
const nivTxt=a=>a.pedido?"Pedido":(C_EST[nivel(a)]||["—"])[0];
const artBD=(nom,fs,extra)=>({nom,uno:"artículo",filas:()=>artsActivos().filter(fs).sort((a,b)=>(a.cod||a.desc).localeCompare(b.cod||b.desc,"es",{numeric:true})),
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
    cols:[["Eje",e=>e.cod],["Modelo",e=>{const x=modelo(e.mod);return x?x.ref:e.mod;}],["Dónde está",e=>(EST_E[e.estado]||[e.estado])[0]],["Máquina",e=>e.maq?(maqDe(e.maq)?maqDe(e.maq).cod:e.maq):"—"],["Vale para",e=>{const x=modelo(e.mod);return x?inyDe(x).join(", "):"—";}]],
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

/* ---------- el buscador: entiende la pregunta con las palabras de siempre ---------- */
const nq=t=>String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ø/g,"").replace(/[^a-z0-9ñ\s.-]/g," ").replace(/\b([fm])\s*-\s*(\d)/g,"$1$2").replace(/\s+/g," ").trim();
const raiz=w=>w.length>4&&/es$/.test(w)&&!/(ces|ses)$/.test(w)?w.slice(0,-2):w.length>3&&/s$/.test(w)?w.slice(0,-1):w;
/* qué se busca: palabras → tipo (el orden importa: «recambios de horno» antes que «horno») */
const QE=[["rhorno",/\b(recambios? de hornos?|piezas? de hornos?|repuestos? de hornos?)\b/],["modelos",/\bmodelos? de ejes?\b/],["hornos",/\bhornos?\b/],["maquinas",/\b(maquinas?|inyectoras?)\b/],
  ["ejes",/\bejes?\b/],["contenedores",/\bcontenedor(es)?\b/],["moldes",/\bmoldes?\b/],["pistones",/\bpiston(es)?\b/],["barras",/\bbarras?( expulsoras?)?\b/],["tornillos",/\btornillos?( tope)?\b/],
  ["quim",/\b(aceites?|taladrinas?|jabon(es)?|desmoldeantes?|pistonwax|liquidos?)\b/],["otros",/\bconsumibles?\b/]];
/* palabras que no filtran */
const QSTOP=new Set("que qu cual cuales cuantos cuantas cuanto hay tenemos tiene tienen de del la el los las lo con en y a al por para son es esta estan dame dime ver ensena muestrame lista listado todos todas todo un una unos unas se sus su me fabrica planta kg mm recambios recambio expulsoras expulsora tope inyectoras inyectora maquinas maquina hornos horno ejes eje contenedores contenedor moldes molde pistones piston barras barra tornillos tornillo consumibles consumible piezas pieza repuestos repuesto".split(" "));
/* quiere un recuento por grupos */
const QGR=/\b(que|cuantos|cuantas|cuanto|tipos?|modelos?|marcas?|capacidades|clases|distintos|por)\b/;
/* frases de estado con su texto en la app */
const QSIN=[[/\bnave\s*(1a|1b|1|2)\b/,"@nave"],[/\bbajo (el )?minimo\b/,"bajo minimo"],[/\b(para )?pedir\b/,"para pedir"],[/\b(en )?(el )?taller\b|\breparac/,"taller|reparacion"],[/\bsin plano\b/,"sin plano"],[/\bcon plano\b/,"plano si"],[/\ben planta\b/,"en planta"],[/\bestanteria\b/,"estanteria"],[/\bpuestos?\b/,"puesto"],[/\bde baja\b/,"baja"]];
/* una palabra casa con el principio de una palabra del dato; un número, solo con ese número entero */
const reQ=a=>new RegExp("(^|[\\s/,.(])"+a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+(/\d$/.test(a)?"(?![0-9])":""));
function entender(q0,T){const q=nq(q0);const out={q,t:null,grupo:null,filtros:[],ignoradas:[]};if(!q)return out;
  let rest=" "+q+" ";
  {let best=null,bi=1e9;for(const [k,re] of QE){const m=rest.match(re);if(m){if(m.index<bi){bi=m.index;best=k;}if(k!=="quim")rest=rest.replace(re,s0=>" ".repeat(s0.length));}}out.t=best;rest=rest.replace(/\s+/g," ");}
  QSIN.forEach(([re,v])=>{const m=rest.match(re);if(m){const t=v==="@nave"?"nave "+m[1]:v.split("|")[0];out.filtros.push({t,alt:v==="@nave"?[t]:v.split("|")});rest=rest.replace(re," ");}});
  const quiereG=QGR.test(" "+q+" ");
  /* agrupar por: si nombra un dato (marca, capacidad, zona, modelo…) */
  const pal=rest.split(" ").filter(Boolean);
  const words=pal.filter(w=>!QSTOP.has(w)&&!/^(tipos?|modelos?|marcas?|capacidades?|clases?|distintos?|zonas?|estados?|grupos?|proveedor(es)?|diametros?|largos?)$/.test(w));
  /* si no dijo qué busca, el tipo donde más casan las palabras */
  const casaFila=(D,x,ws)=>{const txt=" "+nq(D.cols.map(c=>c[1](x)).join(" "))+" ";return ws.every(w=>w.alt.some(a=>reQ(a).test(txt)));};
  const fl=words.map(w=>({t:w,alt:[raiz(w)]}));
  if(!out.t){let best=null,bn=0;["maquinas"].concat(Object.keys(T).filter(k=>k!=="maquinas")).forEach(k=>{const D=T[k];const n=D.filas().filter(x=>casaFila(D,x,fl)).length;if(n>bn){bn=n;best=k;}});out.t=best||"maquinas";}
  const D=T[out.t];
  /* palabras que no casan con nada de ese tipo: se dejan fuera y se avisa */
  fl.forEach(f=>{if(D.filas().some(x=>casaFila(D,x,[f])))out.filtros.push(f);else out.ignoradas.push(f.t);});
  out.filtros=out.filtros.filter(f=>{const ok=D.filas().some(x=>casaFila(D,x,[f]));if(!ok&&!out.ignoradas.includes(f.t))out.ignoradas.push(f.t);return ok;});
  if(quiereG){const G=D.grupos.map(g=>[g,nq(g)]);const m=/\b(marcas?)\b/.test(q)?"marca":/\bcapacidad/.test(q)?"capacidad":/\bzonas?\b|\bnaves?\b/.test(q)?"zona":/\b(estado|donde)\b/.test(q)?"donde":/\bproveedor/.test(q)?"proveedor":/\bdiametro|\bø\b/.test(q)?"o":/\blargo/.test(q)?"largo":/\bmodelos?\b/.test(q)?"modelo":/\btipos?\b/.test(q)?"tipo":null;
    let g=m&&(G.find(([g,n])=>n.startsWith(m))||G.find(([g,n])=>n.includes(m))||[])[0];
    if(!g&&out.filtros.length){const f=out.filtros[out.filtros.length-1];g=D.grupos.find(gn=>{const c=D.cols.find(c=>c[0]===gn);return c&&D.filas().some(x=>f.alt.some(a=>(" "+nq(c[1](x))).includes(" "+a)));});}
    out.grupo=g||D.grupos[0];
    /* «qué modelos de horno»: si el grupo coincide con un filtro, no filtrar por él */}
  out.casa=x=>casaFila(D,x,out.filtros);return out;}
const plGrupo=g=>{const w=g.toLowerCase().split(" ");w[0]=/[aeiou]$/.test(w[0])?w[0]+"s":/ø/.test(w[0])?w[0]:w[0]+"es";return w.join(" ");};
/* lo que se sugiere mientras se escribe */
function sugerencias(q0,T){const q=nq(q0);if(!q)return["qué modelos de horno tenemos","hornos westofen","máquinas con horno krown de 900","cuántas STP hay","ejes en taller","contenedores D5","taladrinas bajo mínimo","barras sin plano"];
  const ult=q.split(" ").pop();if(ult.length<2)return[];const vistos=new Set(),S=[];
  const base=q.slice(0,q.length-ult.length);
  Object.keys(T).forEach(k=>{const D=T[k];if(nq(D.nom).startsWith(ult)&&!vistos.has(D.nom)){vistos.add(D.nom);S.push(base+D.nom.toLowerCase());}});
  Object.keys(T).forEach(k=>{const D=T[k];D.filas().forEach(x=>D.cols.forEach(c=>{const v=String(c[1](x));nq(v).split(" ").forEach((w,i,arr)=>{if(w.startsWith(ult)&&w!==ult&&S.length<8){const sug=v.length<28?v:arr.slice(i,i+2).join(" ");const k2=nq(sug);if(!vistos.has(k2)){vistos.add(k2);S.push(base+sug.toLowerCase());}}});}));});
  return S.slice(0,6);}

function vBD(v){const T=tiposBD();draft.bd=draft.bd||{};const B=draft.bd;if(typeof B.q!=="string")B.q="";
  const caja=el("div",{class:"bd-caja"});const res=el("div",{id:"bdRes"});
  const q=inp("bdQ",B.q,z=>{B.q=z;B.f="";pinta();},{type:"search",placeholder:"¿Qué quieres saber?",autocomplete:"off",enterkeyhint:"search","aria-label":"Pregunta"});
  const sug=el("div",{class:"chips bd-sug"});
  caja.appendChild(el("div",{class:"bd-q"},[(()=>{const l=el("span",{class:"bd-lupa","aria-hidden":"true"});l.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';return l;})(),q]));
  caja.appendChild(sug);v.appendChild(caja);v.appendChild(res);
  const pon=t=>{B.q=t;B.f="";q.value=t;pinta();q.focus();};
  function pinta(){sug.textContent="";res.textContent="";const S=sugerencias(B.q,T);
    sug.classList.toggle("bd-ej",!nq(B.q));if(!nq(B.q)&&S.length)sug.appendChild(el("span",{class:"sub",text:"Prueba con:"}));
    if(S.length)S.forEach(t=>sug.appendChild(el("button",{type:"button",class:"chip",text:t,onclick:()=>pon(t)})));
    if(!nq(B.q)){res.appendChild(el("p",{class:"hint",style:"margin:4px 2px",text:"Escribe lo que quieras consultar: hornos, máquinas, ejes, contenedores, moldes, pistones, barras, tornillos, recambios de horno, aceites y taladrinas… Puedes añadir una marca, una capacidad, una máquina (F28), una zona o un estado (taller, bajo mínimo)."}));return;}
    const E=entender(B.q,T),D=T[E.t];const L=D.filas().filter(E.casa);
    /* lo que ha entendido */
    res.appendChild(el("div",{class:"bd-ent"},[el("span",{class:"sub",text:"Buscando en "}),el("b",{text:D.nom}),
      ...E.filtros.map(f=>el("span",{class:"pill info",text:f.t})),E.grupo?el("span",{class:"sub",text:" · agrupado por "+E.grupo.toLowerCase()}):null]));
    if(E.ignoradas.length)res.appendChild(el("p",{class:"hint",style:"margin:4px 2px",text:"No he encontrado «"+E.ignoradas.join("», «")+"» en "+D.nom.toLowerCase()+", así que no lo he tenido en cuenta."}));
    /* en qué otros sitios sale lo mismo */
    if(E.filtros.length){const otros=Object.keys(T).filter(k=>k!==E.t).map(k=>{const D2=T[k];const f2=E.filtros;const n=D2.filas().filter(x=>{const txt=" "+nq(D2.cols.map(c=>c[1](x)).join(" "))+" ";return f2.every(w=>w.alt.some(a=>reQ(a).test(txt)));}).length;return[k,n];}).filter(x=>x[1]);
      if(otros.length)res.appendChild(el("div",{class:"chips",style:"margin:4px 0 10px"},[el("span",{class:"sub",text:"También en:"})].concat(otros.map(([k,n])=>el("button",{type:"button",class:"chip",text:T[k].nom+" ("+n+")",onclick:()=>pon(T[k].nom.toLowerCase()+" "+E.filtros.map(f=>f.t).join(" "))})))));}
    if(!L.length){res.appendChild(el("div",{class:"card"},el("p",{class:"hint",style:"padding:12px 14px",text:"No hay ninguno que cumpla todo eso. Prueba con menos palabras."})));return;}
    /* respuesta agrupada */
    if(E.grupo){const gc=D.cols.find(c=>c[0]===E.grupo);const G={};L.forEach(x=>{const k=String(gc[1](x));(G[k]=G[k]||[]).push(x);});
      const GL=Object.entries(G).sort((a,b)=>(a[0]===sinD)-(b[0]===sinD)||b[1].length-a[1].length||a[0].localeCompare(b[0],"es",{numeric:true}));const mx=Math.max(1,...GL.map(g=>g[1].length));
      const dist=GL.filter(g=>g[0]!==sinD).length;
      res.appendChild(el("p",{class:"bd-resp",text:"Hay "+dist+" "+(dist===1?E.grupo.toLowerCase():plGrupo(E.grupo)+" distint"+(/^(marca|capacidad|zona)/i.test(E.grupo)?"as":"os"))+" entre "+L.length+" "+(L.length===1?D.uno:D.nom.toLowerCase())+"."}));
      res.appendChild(el("section",{class:"card"},[el("div",{class:"lst"},GL.map(([k,xs])=>el("button",{type:"button",class:"it"+(B.f===k?" sel":""),"aria-pressed":String(B.f===k),onclick:()=>{B.f=B.f===k?"":k;pinta();}},[
        el("div",{class:"ppal"},[el("div",{class:"t1",text:k}),el("div",{class:"t2",text:xs.slice(0,10).map(x=>String(D.cols[0][1](x))).join(", ")+(xs.length>10?"…":"")}),el("div",{class:"sbar",style:"margin-top:6px"},el("i",{style:"width:"+Math.round(xs.length/mx*100)+"%"}))]),
        el("div",{class:"cant num"},[el("b",{text:String(xs.length)}),el("small",{text:xs.length===1?D.uno:D.nom.toLowerCase()})])])))]));}
    else res.appendChild(el("p",{class:"bd-resp",text:L.length+" "+(L.length===1?D.uno:D.nom.toLowerCase())+"."}));
    /* la lista con todos sus datos */
    const gc=E.grupo&&D.cols.find(c=>c[0]===E.grupo);const R=B.f&&gc?L.filter(x=>String(gc[1](x))===B.f):L;
    if(!E.grupo||B.f)res.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:(B.f?B.f+" · ":"")+R.length+" "+(R.length===1?D.uno:D.nom.toLowerCase())}),
        el("button",{type:"button",class:"btn sec peq der",text:"Excel",onclick:e=>excelBD(T,e.currentTarget,{t:E.t,filas:R})})]),
      cTabla(D.cols.map(c=>c[0]),R.map(x=>D.cols.map((c,i)=>i===0?el("button",{type:"button",class:"lnk",text:String(c[1](x)),onclick:()=>D.abrir(x)}):c[1](x))))]));
    else res.appendChild(el("p",{class:"hint",style:"margin:6px 2px",text:"Toca un grupo para ver la lista con todos sus datos."}));}
  pinta();setTimeout(()=>{try{if(!B.q)q.focus();}catch(e){}},50);}

async function excelBD(T,btn,sel){if(!downloads){toast("Esta vista no permite descargar archivos");return;}btn.disabled=true;
  try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();
    /* primero lo que se está viendo; luego una hoja por cada tipo */
    const t0=sel&&sel.t||"hornos",orden=[t0].concat(Object.keys(T).filter(k=>k!==t0));
    orden.forEach(k=>{const D=T[k];const rows=(sel&&k===t0?sel.filas:D.filas()).map(x=>Object.fromEntries(D.cols.map(c=>[c[0],c[1](x)])));
      const ws=X.utils.json_to_sheet(rows.length?rows:[{[D.cols[0][0]]:"Sin datos"}]);ws["!cols"]=D.cols.map(c=>({wch:Math.min(40,Math.max(10,c[0].length+2))}));
      X.utils.book_append_sheet(wb,ws,D.nom.slice(0,31).replace(/[\\/?*[\]:]/g,""));});
    await downloads.save({filename:"Base_de_datos_fabrica_"+hoy()+".xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Excel descargado");
  }catch(e){toast(e&&e.code==="declined"?"Descarga cancelada":"No se pudo crear el Excel");}btn.disabled=false;}

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
      ["Zona",m=>zonaDe(m)],["Modelo de máquina",m=>vf(m,"c-maq")||sinD],["Fabricación",m=>m.hornoFab?m.hornoFab.slice(5)+"/"+m.hornoFab.slice(0,4):sinD],["Años",m=>{const t=hornoFabTxt(m).match(/\((.*)\)/);return t?t[1]:sinD;}],["Recambios en su lista",m=>String(artsActivos().filter(a=>a.fam==="horno"&&(a.iny||[]).includes(m.id)).length)]],
    grupos:["Modelo de horno","Marca","Capacidad","Tipo","Zona","Años"],abrir:m=>fichaIny(m)},
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
const QSTOP=new Set("han ha hemos he sido llevamos lleva llevan llevado hecho hizo hicieron mucho mas menos que qu cual cuales cuantos cuantas cuanto hay tenemos tiene tienen de del la el los las lo con en y a al por para son es esta estan dame dime ver ensena muestrame lista listado todos todas todo un una unos unas se sus su me fabrica planta kg mm recambios recambio expulsoras expulsora tope inyectoras inyectora maquinas maquina hornos horno ejes eje contenedores contenedor moldes molde pistones piston barras barra tornillos tornillo consumibles consumible piezas pieza repuestos repuesto".split(" "));
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
/* ---------- consumos, cambios y gasto: lo que ha pasado ---------- */
const QCO=/\b(consum\w*|gast\w*|saco|sacaron|sacamos|cambios?|cambiad\w*|cambia|cambiaron|puso|pusieron|reparo|repararon|reparacion\w*|reparad\w*|salidas?|sacad\w*|usad\w*|historial|movimientos?)\b/;
const MESES_Q=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const relTs=ts=>{if(!ts)return"";const hh=new Date(+ts).getHours();return hh>=6&&hh<14?"Mañana":hh>=14&&hh<22?"Tarde":"Noche";};
const naveEv=e=>{const m=cat.maquinas.find(x=>x.id===e.maq)||cat.maquinas.find(x=>x.cod===e.maq);return m?zonaDe(m):(e.nave||"");};
const evCols=[["Fecha",e=>fmtF(e.f)],["Mes",e=>cap(fmtMes(e.f.slice(0,7)))],["Pieza",e=>e.ref],["Modelo",e=>e.mod||""],["Máquina",e=>maqTxt(e)],["Cantidad",e=>fmtN(Math.round(e.cant*10)/10)+" "+e.ud],["Importe",e=>e.eur?eur(e.eur):"—"],["Motivo",e=>e.txt||"—"],["Detalle",e=>e.det||""],["Estado",e=>e.est||""],["Quién",e=>e.quien||"—"],["Tipo",e=>e.fam||""],["Nave",naveEv],["Relevo",e=>relTs(e.ts)]];
const evColsDe=L=>evCols.filter(c=>c[0]!=="Mes"&&(c[0]!=="Nave"||L.some(e=>!e.maq&&e.nave))&&(c[0]!=="Tipo"||new Set(L.map(e=>e.fam)).size>1)&&(c[0]!=="Relevo"||L.__rel)&&(!["Modelo","Detalle","Estado"].includes(c[0])||L.some(e=>c[1](e))));
function evTipos(){const otros=()=>salidasFam(a=>!["piston","barra","tornillo","horno"].includes(a.fam)&&!GRUPOS_Q.includes(grupoDe(a)));
  const mk=(nom,uno,unos,f,ref,ult,pri)=>({nom,uno,unos,filas:f,ref,ult,pri});
  return{pist:mk("Cambios de pistón","pistón","pistones",()=>SECC.pist.ev(),"Ø",["El último cambio de pistón","El primer cambio de pistón"]),ejes:mk("Reparaciones de ejes","reparación","reparaciones",()=>SECC.ejes.ev(),"eje",["La última reparación de eje","La primera reparación de eje"]),cont:mk("Cambios de contenedor","cambio","cambios",()=>SECC.cont.ev(),"contenedor",["El último cambio de contenedor","El primer cambio de contenedor"]),
    btb:mk("Cambios de barras expulsoras","barra","barras",()=>SECC.btb.ev(),"barra",["El último cambio de barra expulsora","El primer cambio de barra expulsora"]),btt:mk("Cambios de tornillos tope","tornillo","tornillos",()=>SECC.btt.ev(),"tornillo",["El último cambio de tornillo tope","El primer cambio de tornillo tope"]),bth:mk("Recambios de horno gastados","pieza","piezas",()=>SECC.bth.ev(),"pieza",["El último recambio de horno","El primer recambio de horno"]),
    quim:mk("Consumo de aceites, taladrinas y jabones","consumo","consumos",()=>SECC.quim.ev(),"producto",["El último consumo","El primer consumo"]),otros:mk("Otros consumibles gastados","consumo","consumos",otros,"producto",["El último consumo","El primer consumo"]),
    ent:mk("Entradas","entrada","entradas",()=>cEntradas().map(x=>{const a=art(x.artId);return{f:x.f,ts:0,maq:null,nave:null,ref:x.prod,cant:x.cant,ud:x.ud,eur:x.cant*precioDe(a),quien:x.quien||"",txt:x.prov,det:x.alb?"Albarán "+x.alb:"",alb:x.alb||"",ir:a?()=>ficha(a):null};}),"pieza",["La última entrada","La primera entrada"]),
    todo:mk("Todo lo gastado","apunte","apuntes",()=>SECC.pist.ev().map(e=>Object.assign({fam:"Pistones"},e)).concat(salidasFam(()=>true),SECC.ejes.ev().map(e=>Object.assign({fam:"Reparación de ejes"},e))),"pieza",["Lo último apuntado","Lo primero apuntado"])};}
function periodoQ(q){const hy=hoy(),y=+hy.slice(0,4),mo=+hy.slice(5,7);const ini=(yy,mm)=>yy+"-"+String(mm).padStart(2,"0")+"-01",fin=(yy,mm)=>{const d=new Date(yy,mm,0);return yy+"-"+String(mm).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
  let m;
  if(/\bhoy\b/.test(q))return{d:hy,h:hy,t:"hoy",re:/\bhoy\b/};
  if(/\bayer\b/.test(q)){const a=sumaDias(hy,-1);return{d:a,h:a,t:"ayer",re:/\bayer\b/};}
  if(/\besta semana\b/.test(q))return{d:sumaDias(hy,-((new Date().getDay()+6)%7)),h:hy,t:"esta semana",re:/\besta semana\b/};
  if(/\beste mes\b/.test(q))return{d:ini(y,mo),h:hy,t:"este mes",re:/\beste mes\b/};
  if(/\b(el )?(mes pasado|ultimo mes|mes anterior)\b/.test(q)){const yy=mo===1?y-1:y,mm=mo===1?12:mo-1;return{d:ini(yy,mm),h:fin(yy,mm),t:cap(fmtMes(ini(yy,mm).slice(0,7))),re:/\b(el )?(mes pasado|ultimo mes|mes anterior)\b/};}
  if(/\b(este|el) ano\b|\ben lo que va de ano\b/.test(q)&&!/ano pasado/.test(q))return{d:y+"-01-01",h:hy,t:"este año",re:/\b(en lo que va de|este|el) ano\b/};
  if(/\b(el )?ano pasado\b/.test(q))return{d:(y-1)+"-01-01",h:(y-1)+"-12-31",t:"el año "+(y-1),re:/\b(el )?ano pasado\b/};
  if((m=q.match(/\bultim[oa]s? (\d+) (dias?|semanas?|meses|mes)\b/))){const n=+m[1],u=m[2][0];return{d:sumaDias(hy,-(u==="d"?n:u==="s"?n*7:n*30)),h:hy,t:"últimos "+n+" "+(u==="d"?"días":u==="s"?"semanas":"meses"),re:/\bultim[oa]s? \d+ (dias?|semanas?|meses|mes)\b/};}
  const mi=MESES_Q.findIndex(x=>new RegExp("\\b"+x+"\\b").test(q));
  if(mi>=0){const ya=q.match(/\b(20\d\d)\b/);const yy=ya?+ya[1]:(mi+1>mo?y-1:y);return{d:ini(yy,mi+1),h:fin(yy,mi+1),t:cap(MESES_Q[mi])+" "+yy,re:new RegExp("\\b(en |de )?"+MESES_Q[mi]+"( de)?( 20\\d\\d)?\\b")};}
  if((m=q.match(/\b(20\d\d)\b/)))return{d:m[1]+"-01-01",h:m[1]+"-12-31",t:"el año "+m[1],re:/\b(en |el )?20\d\d\b/};
  return{d:sumaDias(hy,-365),h:hy,t:"últimos 12 meses",re:null,def:true};}
function entenderEv(q0){const q=nq(q0),EV=evTipos();const out={q,ev:true,filtros:[],ignoradas:[]};let rest=" "+q+" ";
  out.ultimo=(/\b(ultim[oa]|ultima vez|mas reciente|cuando)\b/.test(q)||(/\bquien\b/.test(q)&&!/\bmas\b|\bpor quien\b|\bquienes\b/.test(q)))&&!/\bultim[oa]s? \d+/.test(q)&&!/\bultimo mes\b/.test(q);out.primero=/\b(primer[oa]?|primera vez|mas antigu[oa])\b/.test(q);
  let P=periodoQ(q);if(P.def&&(out.ultimo||out.primero))P={d:"0000-00-00",h:hoy(),t:"todo el historial",re:null,def:false,todo:true};out.per=P;if(P.re)rest=rest.replace(P.re," ");
  rest=rest.replace(/\b(ultim[oa]|ultima vez|mas reciente|cuando|primer[oa]?|primera vez|mas antigu[oa]|vez)\b/g," ");
  const mapa={pistones:"pist",ejes:"ejes",modelos:"ejes",contenedores:"cont",barras:"btb",tornillos:"btt",rhorno:"bth",hornos:"bth",quim:"quim",otros:"otros",maquinas:"todo",moldes:"todo"};
  let best=null,bi=1e9;for(const [k,re] of QE){const m=rest.match(re);if(m){if(m.index<bi){bi=m.index;best=k;}if(k!=="quim")rest=rest.replace(re,s0=>" ".repeat(s0.length));}}
  out.t=best?mapa[best]:"todo";if(/\b(entradas?|llegad\w*|llegado|llego|recibid\w*|albaran(es)?)\b/.test(q))out.t="ent";const D=EV[out.t];out.D=D;
  {const mn=rest.match(/\bnave\s*(1a|1b|1|2)\b/);if(mn){out.filtros.push({t:"nave "+mn[1],alt:["nave "+mn[1]]});rest=rest.replace(mn[0]," ");}}
  {const mr=rest.match(/\b(relevo|turno) de (la )?(manana|tarde|noche)\b|\bpor la (manana|tarde|noche)\b|\bde noche\b/);if(mr){const t=(mr[3]||mr[4]||"noche");out.filtros.push({t,alt:[t]});out.rel=true;rest=rest.replace(mr[0]," ");}}
  rest=rest.replace(QCO," ").replace(new RegExp(QCO.source,"g")," ").replace(/\b(entradas?|llegad\w*|llegado|llego|han|recibid\w*|material(es)?|cosas?|relevos?|turnos?)\b/g," ");
  const g=/\bpor tipos?\b|\bpor familias?\b/.test(q)?"Tipo":/\bpor naves?\b|\bque nave\b|\bcada nave\b/.test(q)?"Nave":/\bpor mes(es)?\b|\bmensual|\bcada mes\b/.test(q)?"Mes":/\bpor maquinas?\b|\bque maquinas?\b|\bdonde\b|\ben que maquinas?\b/.test(q)?"Máquina":/\bpor motivos?\b|\bmotivos?\b|\bpor que\b|\bdesperfectos?\b|\baverias?\b/.test(q)?"Motivo":/\bpor quien\b/.test(q)||(/\bquien\b/.test(q)&&!/\b(ultim|primer|cuando)/.test(q))?"Quién":/\bpor modelos?\b/.test(q)?"Modelo":"Pieza";
  out.grupo=g;rest=rest.replace(/\bpor (mes(es)?|maquinas?|motivos?|quien|modelos?)\b|\bcada mes\b|\bmensual\w*\b|\bdesperfectos?\b|\baverias?\b/g," ");
  const words=rest.split(" ").filter(w=>w&&!QSTOP.has(w)&&!/^(fue|fueron|ultimo|ultima|quien|quienes|cambio|puso|pusieron|hizo|apunto|vez|veces|cuando|tipos?|modelos?|cuanto|cuantos|cuantas|total|gastado|euros?|dinero|coste|precio|veces|donde|motivos?|quien|meses|mes|dias|ano|anos|mas|menos|mayor|menor|tiene|tienen|lleva|llevan|cual|cuales|cuanta|cuanto|material|materiales|relevo|turno)$/.test(w));
  const E0=D.filas().filter(e=>e.f&&e.f>=P.d&&e.f<=P.h);const txt=e=>" "+nq(evCols.map(c=>c[1](e)).join(" "))+" ";
  words.forEach(w=>{const f={t:w,alt:[raiz(w)]};if(E0.some(e=>f.alt.some(a=>reQ(a).test(txt(e))))||(/^[fm]\d{1,3}$/.test(w)&&cat.maquinas.some(m=>nq(m.cod)===w)))out.filtros.push(f);else out.ignoradas.push(w);});
  out.filas=E0.filter(e=>out.filtros.every(f=>f.alt.some(a=>reQ(a).test(txt(e))))).sort((a,b)=>(b.f+String(b.ts||0).padStart(15,"0")).localeCompare(a.f+String(a.ts||0).padStart(15,"0")));
  return out;}
const contable=u=>["ud","rep.","cambio","uds"].includes(u);
function pintaEv(E,res,B,pon){const D=E.D,L0=E.filas;if(E.rel)L0.__rel=true;
  const ef=(B.ef||[]).filter(f=>evCols.some(c=>c[0]===f.g));const L=L0.filter(e=>ef.every(f=>String(evCols.find(c=>c[0]===f.g)[1](e))===f.v));
  const regrupa=g=>{B.gEv=g;pon(B.q,true);};if(B.gEv)E.grupo=B.gEv;const uds=[...new Set(L.map(e=>e.ud))];const tot=L.reduce((s,e)=>s+e.cant,0),eu=L.reduce((s,e)=>s+e.eur,0);
  const maq=E.filtros.find(f=>/^[fm]\d+$/.test(f.t));
  res.appendChild(el("div",{class:"bd-ent"},[el("span",{class:"sub",text:"Buscando en "}),el("b",{text:D.nom}),el("span",{class:"pill info",text:E.per.t}),...E.filtros.map(f=>el("span",{class:"pill info",text:/\d/.test(f.t)&&/^[a-z0-9.\-]+$/.test(f.t)?f.t.toUpperCase():f.t})),el("span",{class:"sub",text:" · por "+E.grupo.toLowerCase()})]));
  if(ef.length)res.appendChild(el("div",{class:"chips",style:"margin:2px 0 8px"},[el("span",{class:"sub",text:"Solo:"})].concat(ef.map((f,i)=>el("button",{type:"button",class:"chip","aria-pressed":"true",text:f.v+"  ✕","aria-label":"Quitar "+f.v,onclick:()=>{B.ef=ef.filter((_,j)=>j!==i);pon(B.q,true);}})))));
  if(E.ignoradas.length)res.appendChild(el("p",{class:"hint",style:"margin:4px 2px",text:"No he encontrado «"+E.ignoradas.join("», «")+"» en "+D.nom.toLowerCase()+" ("+E.per.t+"), así que no lo he tenido en cuenta."}));
  if(E.per.def)res.appendChild(el("div",{class:"chips",style:"margin:2px 0 8px"},[el("span",{class:"sub",text:"Periodo:"})].concat(["este mes","el mes pasado","este año"].map(t=>el("button",{type:"button",class:"chip",text:t,onclick:()=>pon(B.q+" "+t)})))));
  if(!L.length){res.appendChild(el("div",{class:"card"},el("p",{class:"hint",style:"padding:12px 14px",text:(D.unos&&E.t!=="todo"?"No hay "+D.nom.toLowerCase()+" apuntados":"No hay nada apuntado")+(maq?" en la "+maq.t.toUpperCase():"")+(/^(hoy|ayer|esta|este)/.test(E.per.t)?" ":" en ")+E.per.t+"."})));return;}
  if((E.ultimo||E.primero)&&D.ult){const e=E.primero?L[L.length-1]:L[0];const otros=E.filtros.filter(f=>f!==maq).map(f=>/\d/.test(f.t)&&/^[a-z0-9.\-]+$/.test(f.t)?f.t.toUpperCase():f.t);
    const dias_=dias(e.f,hoy());
    res.appendChild(el("div",{class:"bd-ult"},[el("div",{class:"sub",text:(E.primero?D.ult[1]:D.ult[0])+(maq?" de la "+maq.t.toUpperCase():"")+(otros.length?" ("+otros.join(", ")+")":"")}),
      el("b",{class:"bd-ult-f",text:fmtF(e.f)+(dias_===0?" · hoy":dias_===1?" · ayer":" · hace "+dias_+" días")}),
      el("div",{class:"bd-ult-d",text:[e.ref,e.mod,!maq&&e.maq?maqTxt(e):null,e.cant!==1||!contable(e.ud)?fmtN(e.cant)+" "+e.ud:null,e.txt&&e.txt!=="—"?e.txt:null,e.det&&gNorm(e.det)!==gNorm(e.txt)?e.det:null,e.est||null].filter(Boolean).join(" · ")}),
      el("div",{class:"bd-ult-q"},["Lo hizo: ",el("b",{text:e.quien||"no consta"})]),
      e.ir?el("button",{type:"button",class:"btn sec peq",style:"justify-self:start;margin-top:6px",text:"Ver la ficha",onclick:e.ir}):null]));
    res.appendChild(el("p",{class:"hint",style:"margin:10px 2px 6px",text:"Todo lo apuntado ("+E.per.t+"):"}));}
  const cantTxt=uds.length===1?fmtN(Math.round(tot*10)/10)+" "+(contable(uds[0])?(tot===1?D.uno:D.unos):uds[0]):L.length+" "+(L.length===1?D.uno:D.unos);
  res.appendChild(el("p",{class:"bd-resp",text:(maq?maq.t.toUpperCase()+" · ":"")+ef.map(f=>f.v+" · ").join("")+cap(E.per.t)+": "+cantTxt+(eu?" · "+eur(eu):"")+(uds.length===1&&L.length!==tot?" en "+L.length+" "+(L.length===1?"apunte":"apuntes"):"")+"."}));
  /* reparto */
  const gc=evCols.find(c=>c[0]===E.grupo);const G={};L.forEach(e=>{const k=String(gc[1](e));const g=G[k]=G[k]||{n:0,c:0,eu:0,ult:"",ud:e.ud};g.n++;g.c+=e.cant;g.eu+=e.eur;if(e.f>g.ult)g.ult=e.f;});
  const porN=/\b(mas|menos|veces)\b/.test(E.q)||E.t==="ejes";
  const GL=Object.entries(G).sort((a,b)=>E.grupo==="Mes"?0:porN?(uds.length>1?(b[1].n-a[1].n):(b[1].c-a[1].c))||(b[1].eu-a[1].eu):(b[1].eu-a[1].eu)||(b[1].c-a[1].c));if(E.grupo==="Mes")GL.sort((a,b)=>b[1].ult.localeCompare(a[1].ult));else{const rk=k=>k==="Sin máquina"||k==="—"?2:/\(general\)$/.test(k)?1:0;GL.sort((a,b)=>rk(a[0])-rk(b[0]));}
  const mx=Math.max(1,...GL.map(g=>eu&&!porN?g[1].eu:g[1].c));
  const GLb=GL.filter(g=>g[0]!=="—"&&g[0]!=="Sin máquina"&&!/\(general\)$/.test(g[0]));if(/\bmas\b/.test(E.q)&&GLb.length&&E.grupo!=="Mes"&&!ef.length&&GLb.filter(g=>(uds.length>1?g[1].n===GLb[0][1].n:g[1].c===GLb[0][1].c)).length<GLb.length){const top=GLb[0],emp=GLb.filter(g=>(uds.length>1?g[1].n===top[1].n:g[1].c===top[1].c)).map(g=>g[0]);
    res.appendChild(el("div",{class:"banner",text:(emp.length>1?"Los que más: "+emp.join(", "):"El que más: "+top[0])+" ("+(uds.length>1?fmtN(top[1].n)+(top[1].n===1?" apunte":" apuntes"):fmtN(top[1].c)+" "+(contable(top[1].ud)?(top[1].c===1?D.uno:D.unos):top[1].ud))+(top[1].eu?" · "+eur(top[1].eu):"")+")."}));}
  res.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Por "+(E.grupo==="Pieza"&&D.ref==="Ø"?"Ø":E.grupo.toLowerCase())}),el("div",{class:"der",style:"display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"},["Tipo","Pieza","Modelo","Mes","Máquina","Nave","Motivo","Quién"].filter(x=>x!==E.grupo&&!ef.some(f=>f.g===x)&&(x!=="Modelo"||L.some(e=>e.mod))&&(x!=="Quién"||L.some(e=>e.quien))&&(x!=="Tipo"||new Set(L.map(e=>e.fam)).size>1)).map(x=>el("button",{type:"button",class:"btn sec peq",text:"Por "+(x==="Pieza"&&D.ref==="Ø"?"Ø":x.toLowerCase()),onclick:()=>regrupa(x)})))]),
    el("div",{class:"lst"},GL.map(([k,g])=>el("button",{type:"button",class:"it","aria-label":"Ver solo "+k,onclick:()=>{B.ef=ef.concat([{g:E.grupo,v:k}]);const sig={Nave:new Set(L.map(e=>e.fam)).size>1?"Tipo":"Pieza",Pieza:"Motivo",Modelo:"Pieza",Mes:"Pieza",Máquina:new Set(L.map(e=>e.fam)).size>1?"Tipo":"Pieza",Motivo:"Pieza",Quién:"Pieza",Tipo:"Pieza"}[E.grupo];B.gEv=sig;pon(B.q,true);}},[el("div",{class:"ppal"},[el("div",{class:"t1",text:k}),el("div",{class:"t2",text:g.n+(g.n===1?" apunte":" apuntes")+" · último "+fmtF(g.ult)+" · toca para ver solo estos"}),
      el("div",{class:"sbar",style:"margin-top:6px"},el("i",{style:"width:"+Math.round((eu&&!porN?g.eu:g.c)/mx*100)+"%"}))]),el("div",{class:"cant num"},uds.length>1?[el("b",{text:fmtN(g.n)}),el("small",{text:(g.n===1?"apunte":"apuntes")+(g.eu?" · "+eur(g.eu):"")})]:[el("b",{text:fmtN(Math.round(g.c*10)/10)}),el("small",{text:(contable(g.ud)?(g.c===1?D.uno:D.unos):g.ud)+(g.eu?" · "+eur(g.eu):"")})])])))]));
  /* cada apunte */
  res.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:L.length+(L.length===1?" apunte":" apuntes")}),el("button",{type:"button",class:"btn sec peq der",text:"Excel",onclick:e=>excelEv(D,L,e.currentTarget)})]),
    (()=>{const CS=evColsDe(L);return cTabla(CS.map(c=>c[0]),L.slice(0,300).map(e=>{const fila=CS.map(c=>c[0]==="Pieza"&&e.ir?el("button",{type:"button",class:"lnk",text:String(c[1](e)),onclick:e.ir}):c[0]==="Detalle"&&e.alb?el("button",{type:"button",class:"lnk",text:String(c[1](e)),onclick:()=>{const d=albaranes()[e.alb];if(d)fichaAlbaran(e.alb,d);}}):c[0]==="Máquina"&&e.maq&&maqDe(e.maq)?el("button",{type:"button",class:"lnk",text:String(c[1](e)),onclick:()=>fichaIny(maqDe(e.maq))}):c[1](e));if(e.ir)fila.__ir=e.ir;else if(e.alb){const d=albaranes()[e.alb];if(d)fila.__ir=()=>fichaAlbaran(e.alb,d);}return fila;}));})(),
    L.length>300?el("p",{class:"hint",style:"padding:8px 14px",text:"Salen los 300 últimos; en el Excel van todos."}):null]));}
async function excelEv(D,L,btn){if(!downloads){toast("Esta vista no permite descargar archivos");return;}btn.disabled=true;
  try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();const rows=L.map(e=>({"Fecha":e.f,"Pieza":e.ref,"Modelo":e.mod||"","Máquina":maqTxt(e),"Cantidad":Math.round(e.cant*100)/100,"Unidad":e.ud,"Importe (€)":e.eur?Math.round(e.eur*100)/100:"","Motivo":e.txt||"","Detalle":e.det||"","Estado":e.est||"","Quién":e.quien||""}));
    X.utils.book_append_sheet(wb,X.utils.json_to_sheet(rows.length?rows:[{"Fecha":"Sin datos"}]),D.nom.slice(0,31));
    await downloads.save({filename:D.nom.replace(/[^\wáéíóúñ]+/gi,"_")+"_"+hoy()+".xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Excel descargado");}
  catch(e){toast(e&&e.code==="declined"?"Descarga cancelada":"No se pudo crear el Excel");}btn.disabled=false;}
const plGrupo=g=>{const w=g.toLowerCase().split(" ");w[0]=/[aeiou]$/.test(w[0])?w[0]+"s":/ø/.test(w[0])?w[0]:w[0]+"es";return w.join(" ");};
/* lo que se sugiere mientras se escribe */
function sugerencias(q0,T){const q=nq(q0);if(!q)return["todo sobre la F25","qué máquina está gastando más de lo normal","qué tengo que pedir esta semana","resumen del mes","qué hay que revisar","qué está bajo mínimo","para cuántos días tengo pistones de 60","qué se va a acabar antes","cuándo tengo que pedir taladrina","qué pedidos llevan más de 15 días sin llegar","qué ejes están pendientes de reparar","cuánto hemos gastado este mes","qué máquina gasta más dinero en pistones","cuánto vale lo que hay en el almacén","consumo de pistones de este mes comparado con el pasado","cuánto dura de media un pistón en la F15","qué máquinas llevan más tiempo sin cambiar pistón","cuántos cambios de pistón faltan por mandar a Beatriz","cuántos pistones hay en la zona de usados","dónde están los contenedores A1","qué entradas han llegado hoy","quién cambió el último pistón de la F62","qué modelos de horno tenemos"];
  const ult=q.split(" ").pop();if(ult.length<2)return[];const vistos=new Set(),S=[];
  const base=q.slice(0,q.length-ult.length);
  Object.keys(T).forEach(k=>{const D=T[k];if(nq(D.nom).startsWith(ult)&&!vistos.has(D.nom)){vistos.add(D.nom);S.push(base+D.nom.toLowerCase());}});
  Object.keys(T).forEach(k=>{const D=T[k];D.filas().forEach(x=>D.cols.forEach(c=>{const v=String(c[1](x));nq(v).split(" ").forEach((w,i,arr)=>{if(w.startsWith(ult)&&w!==ult&&S.length<8){const sug=v.length<28?v:arr.slice(i,i+2).join(" ");const k2=nq(sug);if(!vistos.has(k2)){vistos.add(k2);S.push(base+sug.toLowerCase());}}});}));});
  return S.slice(0,6);}

const EJ_ALM=[["Lo importante",["informe del valor de los pistones robados","qué hay que revisar","qué tengo que pedir esta semana","resumen del mes","qué máquina está gastando más de lo normal"]],
  ["Stock",["qué pistones tengo en nave 2","qué hay en el almacén general","qué está bajo mínimo","para cuántos días tengo pistones de 60","qué se va a acabar antes","cuántos pistones hay en la zona de usados"]],
  ["Máquinas y ejes",["todo sobre la F25","quién cambió el último pistón de la F62","cuánto dura de media un pistón en la F15","qué ejes están pendientes de reparar"]],
  ["Dinero",["valor del stock de pistones de 80","importe de los ejes que hay en el taller","presupuesto de 15 pistones de 100 especial","cuánto hemos gastado este mes","qué máquina gasta más dinero en pistones","cuánto vale lo que hay en el almacén","cuánto me voy a gastar el mes que viene"]],
  ["Catálogo",["qué modelos de horno tenemos","dónde están los contenedores A1","qué ejes valen para la F28","qué molde lleva la F30"]]];
function ejemplosA(pon,st){const d=el("details",{class:"ejs"});if(st.ejAb)d.open=true;d.addEventListener("toggle",()=>{st.ejAb=d.open;});
  d.appendChild(el("summary",{text:"Ver ejemplos de preguntas"}));
  EJ_ALM.forEach(([t,L])=>d.appendChild(el("div",{class:"ejs-g"},[el("div",{class:"ejs-t",text:t})].concat(L.map(q=>el("button",{type:"button",class:"ejs-q",text:q,onclick:()=>pon(q)}))))));return d;}
function vBD(v){const T=tiposBD();draft.bd=draft.bd||{};const B=draft.bd;if(typeof B.q!=="string")B.q="";
  const caja=el("div",{class:"bd-caja"});const res=el("div",{id:"bdRes"});
  const q=inp("bdQ",B.q,z=>{B.q=z;B.f="";B.ef=[];B.gEv=null;pinta();},{type:"search",placeholder:"¿Qué quieres saber?",autocomplete:"off",enterkeyhint:"search","aria-label":"Pregunta"});
  const sug=el("div",{class:"chips bd-sug"});
  caja.appendChild(el("div",{class:"bd-q"},[(()=>{const l=el("span",{class:"bd-lupa","aria-hidden":"true"});l.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';return l;})(),q]));
  caja.appendChild(sug);v.appendChild(caja);v.appendChild(res);const resto=el("div",{id:"bdResto"});v.appendChild(resto);try{vAnalisis(resto);}catch(e){console.warn(e);}
  const pon=(t,mantener)=>{if(!mantener){B.ef=[];B.gEv=null;}B.q=t;B.f="";q.value=t;pinta();if(!mantener)q.focus();};
  function pinta(){pinta0();if(window.BuscaAprende&&nq(B.q))BuscaAprende.tras("almacen",res,B.q,["pistones","ejes","taladrina","aceite","jabón","consumo","stock","nave 1","nave 2"],()=>pinta());}
  function pinta0(){const QQ=window.BuscaAprende?BuscaAprende.aplicar("almacen",B.q):B.q;sug.textContent="";res.textContent="";resto.hidden=!!nq(B.q);const S=sugerencias(B.q,T);
    sug.classList.toggle("bd-ej",!nq(B.q));if(!nq(B.q)){const tp=window.BuscaAprende&&BuscaAprende.topUI(pon);if(tp)sug.appendChild(tp);sug.appendChild(ejemplosA(pon,B));}
    else if(S.length)S.forEach(t=>sug.appendChild(el("button",{type:"button",class:"chip",text:t,onclick:()=>pon(t)})));
    if(!nq(B.q))return;
    {const qa=nq(B.q).replace(/\s+/g,""),AL=albaranes(),hit=Object.keys(AL).filter(k=>{const z=nq(k).replace(/\s+/g,"");return z.length>=4&&qa.includes(z);}).slice(0,3);
      if(hit.length)res.appendChild(el("div",{class:"bd-ult"},[el("div",{class:"sub",text:hit.length===1?"Albarán encontrado":"Albaranes encontrados"})].concat(hit.map(k=>{const d=AL[k],f=[].concat(d.movs.map(m=>m.f),d.reps.map(r=>r.rec||r.env)).filter(Boolean).sort().pop();
        return el("button",{type:"button",class:"btn",style:"justify-self:start;margin-top:6px",text:"Abrir el albarán "+k+(f?" · "+fmtF(f):"")+" ("+(d.movs.length+d.reps.length)+(d.movs.length+d.reps.length===1?" línea)":" líneas)"),onclick:()=>fichaAlbaran(k,d)});}))));}
    {const I0=intencionA2(nq(QQ));if(I0&&I0.rewev){pintaEv(entenderEv(I0.rewev),res,B,pon);return;}if(I0){pintaIntA2(I0,res,pon);return;}}
    {const I=intencionA(nq(QQ));if(I&&I.modo!=="rew"){pintaIntA(I,res,pon);return;}}
    {const qn=" "+nq(QQ)+" ";if(QCO.test(qn)||/\b(entradas?|han llegado|ha llegado|llegaron)\b/.test(qn)||(/\b(ultim[oa]|cuando|primera vez|ultima vez)\b/.test(qn)&&!/\bultim[oa]s? \d+/.test(qn))||periodoQ(nq(QQ)).re){pintaEv(entenderEv(QQ),res,B,pon);return;}}
    const I2=intencionA(nq(QQ)),E=entender(I2&&I2.rew?I2.rew:QQ,T),D=T[E.t];const L=D.filas().filter(E.casa);
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
      cTabla(D.cols.map(c=>c[0]),R.map(x=>{const fila=D.cols.map((c,i)=>i===0?el("button",{type:"button",class:"lnk",text:String(c[1](x)),onclick:()=>D.abrir(x)}):c[1](x));fila.__ir=()=>D.abrir(x);return fila;}))]));
    else res.appendChild(el("p",{class:"hint",style:"margin:6px 2px",text:"Toca un grupo para ver la lista con todos sus datos."}));}
  pinta();if(window.BuscaAprende)BuscaAprende.cargar("almacen").then(()=>{if(!nq(B.q))pinta();});setTimeout(()=>{try{if(!B.q)q.focus();}catch(e){}},50);}

async function excelBD(T,btn,sel){if(!downloads){toast("Esta vista no permite descargar archivos");return;}btn.disabled=true;
  try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();
    /* primero lo que se está viendo; luego una hoja por cada tipo */
    const t0=sel&&sel.t||"hornos",orden=[t0].concat(Object.keys(T).filter(k=>k!==t0));
    orden.forEach(k=>{const D=T[k];const rows=(sel&&k===t0?sel.filas:D.filas()).map(x=>Object.fromEntries(D.cols.map(c=>[c[0],c[1](x)])));
      const ws=X.utils.json_to_sheet(rows.length?rows:[{[D.cols[0][0]]:"Sin datos"}]);ws["!cols"]=D.cols.map(c=>({wch:Math.min(40,Math.max(10,c[0].length+2))}));
      X.utils.book_append_sheet(wb,ws,D.nom.slice(0,31).replace(/[\\/?*[\]:]/g,""));});
    await downloads.save({filename:"Base_de_datos_fabrica_"+hoy()+".xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Excel descargado");
  }catch(e){toast(e&&e.code==="declined"?"Descarga cancelada":"No se pudo crear el Excel");}btn.disabled=false;}

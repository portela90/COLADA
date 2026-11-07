/* ===== ACTIVIDAD RECIENTE (Limpieza) =====
   Lo último que ha pasado en los trabajos: quién empezó, terminó, reasignó o subió fotos, y las incidencias del encargado.
   Lo ven el administrador y el encargado (lo comprueba la base de datos: limp_actividad). Sale en Equipo. */
const ACC_L={creada:"Trabajo nuevo",en_curso:"Empezado",hecha:"Terminado",no_hecha:"No se ha podido hacer",pendiente:"Vuelto a pendiente",borrada:"Trabajo borrado",
  foto:"Foto",editada:"Trabajo cambiado",editado:"Trabajo cambiado",reasignada:"Reasignado",checklist:"Checklist",tiempo:"Tiempo",ayudante:"Abierto por la ayudante",incidencia:"Incidencia"};
function haceL(at){const m=Math.round((Date.now()-Date.parse(at))/60000);if(m<1)return"ahora";if(m<60)return"hace "+m+" min";const h=Math.round(m/60);if(h<24)return"hace "+h+" h";const d=Math.round(h/24);return d===1?"ayer":"hace "+d+" días";}
function juntaL(L){const o=[];L.forEach(x=>{const p=o[o.length-1];if(p&&p.acc===x.acc&&p.quien===x.quien&&p.ot&&p.ot===x.ot&&Math.abs(Date.parse(p.at)-Date.parse(x.at))<600000){p.n++;return;}o.push(Object.assign({n:1},x));});return o;}
function txtL(x){const a=ACC_L[x.acc]||x.acc,t=x.tit||"";
  if(x.acc==="foto")return(x.n>1?x.n+" fotos":/borrada/.test(x.det||"")?"Foto borrada":"Foto")+" en «"+t+"»";
  if(x.acc==="reasignada")return"«"+t+"» reasignado a "+(x.det||"");
  if(x.acc==="incidencia")return(x.urg?"Incidencia urgente":"Incidencia")+(x.lugar?" en "+x.lugar:"")+(x.det?": "+x.det:"");
  return a+": «"+t+"»"+(x.det&&["no_hecha","tiempo","creada","hecha"].includes(x.acc)&&x.det!=="todo ok"?" · "+x.det:"");}
function cardActividadL(){let L=null,err=null,todo=false;const box=el("div",null,el("div",{class:"empty",text:"Cargando…"}));
  const card=el("div",{class:"card act"},[el("div",{class:"hd"},[el("h2",{text:"Actividad reciente"}),el("span",{class:"act-der",text:"últimos 30 días"})]),box]);
  const pinta=()=>{box.textContent="";if(err){box.appendChild(el("div",{class:"empty",text:err}));return;}const G=juntaL(L||[]);
    if(!G.length){box.appendChild(el("div",{class:"empty",text:"Nada en los últimos 30 días."}));return;}const V=todo?G:G.slice(0,12);
    box.appendChild(el("ul",{class:"act-l"},V.map(x=>el("li",null,el("div",{class:"act-it"+(x.acc==="borrada"||x.acc==="no_hecha"||x.urg?" baja":"")},[
      el("span",{class:"act-av","aria-hidden":"true",text:String(x.quien||"?").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase()}),
      el("span",{class:"act-tx"},[el("span",{class:"act-t",text:txtL(x)}),el("span",{class:"act-s",text:(x.quien||"—")+" · "+haceL(x.at)})])])))));
    if(G.length>12)box.appendChild(el("button",{type:"button",class:"sec act-mas",text:todo?"Ver menos":"Ver más ("+(G.length-12)+")",onclick:()=>{todo=!todo;pinta();}}));};
  (async()=>{try{L=await rpc("limp_actividad",{p_tok:S.tok,p_lim:150});}catch(e){err=e.message;}pinta();})();return card;}
{const _vE2=vEquipo;vEquipo=async function(v){await _vE2(v);try{if(esAdm()||esEnc())v.appendChild(cardActividadL());}catch(e){}};}

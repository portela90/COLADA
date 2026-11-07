/* ===== ACTIVIDAD RECIENTE (como el muro de actividad de los programas de gestión) =====
   Lo último que ha pasado en Coladas y Almacén, contado en palabras: quién, qué y hace cuánto.
   Sale del registro de cambios de la base de datos (función actividad_reciente). Cada uno ve solo lo de las apps
   a las que tiene acceso (lo filtra la propia base de datos). Los apuntes hechos de golpe (un recuento, una entrada
   con varias líneas) se juntan en una sola línea.
   window.Actividad.caja({lim, cols}) → tarjeta que se carga sola y se refresca cada 2 minutos. */
(function(){
const E=(t,a,k)=>{const n=document.createElement(t);if(a)for(const x in a){const v=a[x];if(v==null||v===false)continue;if(x==="text")n.textContent=v;else if(x==="class")n.className=v;
  else if(x.slice(0,2)==="on")n.addEventListener(x.slice(2),v);else n.setAttribute(x,v);}
  (k==null?[]:[].concat(k)).forEach(c=>{if(c!=null&&c!==false)n.appendChild(typeof c==="string"?document.createTextNode(c):c);});return n;};
const fN=v=>(Math.round((+v||0)*10)/10).toLocaleString("es-ES");
const fF=f=>/^\d{4}-\d\d-\d\d$/.test(f||"")?f.slice(8)+"/"+f.slice(5,7):"";
function hace(at){const m=Math.round((Date.now()-Date.parse(at))/60000);if(m<1)return"ahora";if(m<60)return"hace "+m+" min";const h=Math.round(m/60);if(h<24)return"hace "+h+" h";
  const d=Math.round(h/24);return d===1?"ayer":"hace "+d+" días";}
const EST={planta:"en planta",preparado:"preparado para enviar",reparacion:"en reparación",devuelto:"devuelto a reparar"};
const TC={C:"Consumo",E:"Entrada",A:"Ajuste",G:"Granalla de cobre",T:"Traslado"};
const APP={mov:"Coladas",lotes:"Coladas",alm_mov:"Almacén",alm_pist:"Almacén",alm_rep:"Almacén",alm_ejes:"Almacén",alm_aver:"Almacén",alm_cont:"Almacén",alm_fnotas:"Almacén"};
const URL={mov:x=>"index.html?t="+({C:"consumo",E:"entrada"}[x.d.t]||"hist"),lotes:()=>"index.html?t=lotes",alm_mov:x=>"almacen.html?t=mov",alm_pist:()=>"almacen.html?t=pist",
  alm_rep:()=>"almacen.html?t=ejes",alm_ejes:()=>"almacen.html?t=ejes",alm_aver:()=>"almacen.html?t=aver",alm_cont:()=>"almacen.html?t=cont",alm_fnotas:()=>"almacen.html?t=res"};
/* qué ha pasado, en una frase; .g es la clave para juntar apuntes iguales hechos de golpe */
function txt(x){const d=x.d||{},A=x.antes||{},op=x.op,art=x.art_nom||"un artículo",mq=x.maq_cod;
  const pre=op==="baja"?"Borrado: ":op==="cambio"?"Cambiado: ":"";
  switch(x.col){
    case"alm_mov":{const q=fN(d.cant);const b={salida:"Salida de "+q+" · "+art+(mq?" para la "+mq:d.nave?" para la "+d.nave:""),entrada:"Entrada de "+q+" · "+art+(d.alb?" (albarán "+d.alb+")":""),
        ajuste:"Ajuste de stock · "+art+(d.contado!=null?" (contado "+fN(d.contado)+")":""),traslado:"Traslado de "+q+" · "+art}[d.tipo]||("Movimiento · "+art);
      return{t:pre+b,g:"alm_mov|"+op+"|"+d.tipo,n:d.tipo==="ajuste"?"ajustes de stock":d.tipo==="entrada"?"entradas":d.tipo==="salida"?"salidas":"movimientos"};}
    case"alm_pist":return{t:pre+"Cambio de pistón "+(d.diam||"")+(mq?" en la "+mq:"")+(d.motivo?" · "+String(d.motivo).toLowerCase():""),g:"alm_pist|"+op,n:"cambios de pistón"};
    case"alm_rep":{const e=d.eje||"";if(op==="alta")return{t:"Eje "+e+" apuntado para reparar"+(d.desp?" · "+String(d.desp).toLowerCase():"")};
      if(d.rec&&!A.rec)return{t:"El eje "+e+" ha vuelto del taller"};if(d.env&&!A.env)return{t:"El eje "+e+" se ha enviado al taller"+(d.alb?" (albarán "+d.alb+")":"")};
      return{t:pre+"reparación del eje "+e};}
    case"alm_ejes":{const c=d.cod||String(x.doc||"").replace(/^e-/,"");if(op==="alta")return{t:"Eje nuevo "+c};if(op==="baja")return{t:"Eje "+c+" dado de baja"};
      return{t:"Eje "+c+(d.estado?": "+(EST[d.estado]||d.estado):" actualizado")+(d.maq?" · en la "+d.maq:"")};}
    case"alm_aver":{const w=(mq?"la "+mq:"una máquina")+(d.t?": "+d.t:"");if(op==="alta")return{t:"Avería en "+w};
      if(d.estado==="cerrada"&&A.estado!=="cerrada")return{t:"Avería cerrada en "+w};if(op==="baja")return{t:"Avería borrada en "+w};return{t:"Avería actualizada en "+w};}
    case"alm_cont":return{t:pre+"Lectura de contadores"+(d.nave?" · "+d.nave:"")};
    case"alm_fnotas":return{t:"Nota en una ficha"+(d.txt?": "+String(d.txt).slice(0,70):"")};
    case"mov":{const co=x.lote_nom?" · colada "+x.lote_nom:"";const k=d.kg!=null?" · "+fN(Math.abs(d.kg))+" kg":"";const fa=d.fa!=null?fN(Math.abs(d.fa))+" fardos":"";
      return{t:pre+(TC[d.t]||"Apunte")+(fa?" de "+fa:"")+k+co+(d.u?" · relevo "+d.u:"")+(d.f?" · "+fF(d.f):""),g:"mov|"+op+"|"+d.t,n:{C:"consumos",E:"entradas",A:"ajustes"}[d.t]||"apuntes"};}
    case"lotes":{const n=d.nombre||x.lote_nom||"";if(op==="alta")return{t:"Colada nueva "+n+(d.nave?" en la "+d.nave:"")};if(op==="baja")return{t:"Colada borrada "+n};
      return{t:"Colada "+(n||"")+(d.donde?": ahora "+(d.donde==="externo"?"en el almacén de fuera":"en la nave"):" actualizada")};}}
  return{t:pre+(APP[x.col]||"")};}
function quien(x){return x.quien||(x.d&&typeof x.d.por==="string"&&x.d.por)||"Directo en la base de datos";}
/* junta los apuntes iguales hechos a la vez por la misma persona */
function juntar(L){const out=[];L.forEach(x=>{const t=txt(x),q=quien(x),p=out[out.length-1];
  if(p&&t.g&&p.g===t.g&&p.q===q&&Math.abs(Date.parse(p.at)-Date.parse(x.at))<120000){p.n++;return;}
  out.push({at:x.at,q,g:t.g,t:t.t,nom:t.n,n:1,app:APP[x.col]||"",u:(URL[x.col]||(()=>null))(x),op:x.op});});return out;}
const ini=s=>String(s||"?").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase();
window.Actividad={txt,juntar,caja(o){o=o||{};const lim=o.lim||80;let L=null,err=null,todo=false;
  const bd=E("div",{class:"act-bd"}),cuenta=E("span",{class:"act-der"});
  const card=E("section",{class:"card act"},[E("div",{class:"hd"},[E("h2",{text:"Actividad reciente"}),cuenta]),bd]);
  const pinta=()=>{bd.textContent="";if(err){bd.appendChild(E("p",{class:"hint act-p",text:err}));return;}if(!L){bd.appendChild(E("p",{class:"hint act-p",text:"Cargando…"}));return;}
    const G=juntar(L);cuenta.textContent=G.length?"últimos 30 días":"";
    if(!G.length){bd.appendChild(E("p",{class:"hint act-p",text:"Todavía no hay nada apuntado en los últimos 30 días."}));return;}
    const V=todo?G:G.slice(0,o.ver||12);
    bd.appendChild(E("ul",{class:"act-l"},V.map(g=>E("li",null,E(g.u?"a":"div",{class:"act-it"+(g.op==="baja"?" baja":""),href:g.u||null},[
      E("span",{class:"act-av","aria-hidden":"true",text:ini(g.q)}),
      E("span",{class:"act-tx"},[E("span",{class:"act-t",text:g.t+(g.n>1?" y "+(g.n-1)+" "+(g.nom||"más")+" más":"")}),
        E("span",{class:"act-s",text:g.q+" · "+hace(g.at)+(g.app?" · "+g.app:"")})])])))));
    if(G.length>V.length||todo)bd.appendChild(E("button",{type:"button",class:"btn sec peq act-mas",text:todo?"Ver menos":"Ver más ("+(G.length-V.length)+")",onclick:()=>{todo=!todo;pinta();}}));};
  const carga=async()=>{const sb=window.sbColada;if(!sb||!sb.rpc){err="La actividad se ve en la app conectada.";pinta();return;}
    try{const r=await sb.rpc("actividad_reciente",{p_lim:lim});if(r.error)throw r.error;L=(r.data||[]).filter(x=>!o.cols||o.cols.includes(x.col));err=null;}catch(e){if(!L)err="No se pudo cargar la actividad.";}pinta();};
  pinta();carga();const t=setInterval(()=>{if(!card.isConnected){clearInterval(t);return;}carga();},120000);
  card.recarga=carga;return card;}};
})();

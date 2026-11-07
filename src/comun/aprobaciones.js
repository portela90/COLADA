/* ===== APROBACIONES (común a Almacén y Coladas) =====
   Algunos apuntes necesitan el visto bueno de alguien (en Almacén, Beatriz; en Coladas, Cristian): salidas caras,
   bajas de ejes, ajustes grandes de stock. El apunte cuenta desde el principio (el stock es el real); la aprobación
   es un visto bueno que queda guardado en el propio apunte: apr = {est:"ok"|"no"|"corr", por, uid, ts, mot}.
   Si se rechaza, queda marcado «a corregir» hasta que alguien lo corrige y lo marca.
   Cada app da: lista() → [{k, txt, det, quien, f, apr, ir}], cfg() → {quien:[user_id], desde, …límites},
   marcar(item, apr) para guardar, y avisa(nuevos) para mandar el aviso al móvil del que aprueba. */
(function(){
const E=(t,a,k)=>{const n=document.createElement(t);if(a)for(const x in a){const v=a[x];if(v==null||v===false)continue;if(x==="text")n.textContent=v;else if(x==="class")n.className=v;
  else if(x.slice(0,2)==="on")n.addEventListener(x.slice(2),v);else if(x==="value")n.value=v;else n.setAttribute(x,v===true?"":v);}
  (k==null?[]:[].concat(k)).forEach(c=>{if(c!=null&&c!==false)n.appendChild(typeof c==="string"?document.createTextNode(c):c);});return n;};
const fF=f=>/^\d{4}-\d\d-\d\d$/.test(f||"")?f.slice(8)+"/"+f.slice(5,7)+"/"+f.slice(2,4):"";
const fT=ts=>{if(!ts)return"";const d=new Date(ts);return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");};
window.Aprob=function(o){
  const toast=o.toast||(()=>{}),yo=()=>(window.yoId&&window.yoId())||null,nom=()=>(window.yoNombre&&window.yoNombre())||"";
  const soyAprob=()=>{const c=o.cfg()||{};return!!yo()&&(c.quien||[]).includes(yo());};
  const todos=()=>{try{return o.lista()||[];}catch(e){return[];}};
  const pend=()=>todos().filter(x=>!x.apr);
  const rech=()=>todos().filter(x=>x.apr&&x.apr.est==="no");
  async function marca(x,est,mot){const apr={est,por:nom(),uid:yo(),ts:Date.now()};if(mot)apr.mot=mot;
    if(x.apr&&x.apr.est==="no"&&est==="corr")Object.assign(apr,{rech:x.apr});
    try{await o.marcar(x,apr);}catch(e){toast("No se pudo guardar");return false;}
    toast(est==="ok"?"Aprobado":est==="no"?"Rechazado: queda marcado para corregir":"Marcado como corregido");if(o.alCambiar)o.alCambiar();return true;}
  /* avisos para la campana: al que aprueba, lo pendiente; a todos, lo rechazado */
  function campana(ir){const L=[];const P=pend();
    if(soyAprob()&&P.length)L.push({niv:"warn",t:P.length+(P.length===1?" apunte pendiente de aprobar":" apuntes pendientes de aprobar"),d:P.slice(0,2).map(x=>x.txt).join(" · "),fn:ir});
    const R=rech();if(R.length&&o.puede&&o.puede())L.push({niv:"bad",t:R.length+(R.length===1?" apunte rechazado":" apuntes rechazados")+": hay que corregir",d:R.slice(0,2).map(x=>x.txt+(x.apr.mot?" ("+x.apr.mot+")":"")).join(" · "),fn:ir});
    return L;}
  /* aviso al móvil del que aprueba, una vez por apunte (lo manda el primero que lo ve que no es el que aprueba) */
  let _av=false;async function avisaNuevos(){if(_av||!o.avisados||soyAprob())return;const P=pend();if(!P.length)return;_av=true;
    try{const ya=await o.avisados.leer();const nu=P.filter(x=>!ya.includes(x.k));if(!nu.length)return;
      await o.avisados.guardar(ya.concat(nu.map(x=>x.k)).slice(-400));
      const c=o.cfg()||{};if(o.avisa&&(c.quien||[]).length)await o.avisa(c.quien,nu);}catch(e){}finally{_av=false;}}
  function pantalla(){const P=pend(),R=rech(),ok=todos().filter(x=>x.apr&&x.apr.est!=="no").sort((a,b)=>(b.apr.ts||0)-(a.apr.ts||0)).slice(0,10);
    const yoA=soyAprob(),puede=o.puede?o.puede():true,c=o.cfg()||{};
    const card=E("section",{class:"card apr"},[E("div",{class:"hd"},[E("h2",{text:o.titulo||"Por aprobar"}),E("span",{class:"apr-der",text:P.length?P.length+" pendiente"+(P.length===1?"":"s"):"nada pendiente"})])]);
    card.appendChild(E("p",{class:"hint apr-p",text:(o.reglasTxt?o.reglasTxt(c):"")+(c.quien&&c.quien.length?" Aprueba: "+(o.nombreDe?c.quien.map(o.nombreDe).join(", "):"")+".":" Todavía no hay nadie puesto para aprobar.")+" El apunte cuenta desde el principio; esto es el visto bueno."}));
    const fila=(x,botones,cls)=>E("div",{class:"apr-it "+(cls||"")},[E("div",{class:"apr-tx"},[E("div",{class:"apr-t",text:x.txt}),E("div",{class:"apr-s",text:[x.det,x.quien,fF(x.f)].filter(Boolean).join(" · ")}),
      x.apr&&x.apr.est==="no"?E("div",{class:"apr-mot",text:"Rechazado por "+(x.apr.por||"?")+" el "+fT(x.apr.ts)+(x.apr.mot?": «"+x.apr.mot+"»":"")}):null,
      x.apr&&x.apr.est!=="no"?E("div",{class:"apr-s",text:(x.apr.est==="ok"?"Aprobado por ":"Corregido por ")+(x.apr.por||"?")+" el "+fT(x.apr.ts)}):null]),
      botones?E("div",{class:"apr-acc"},botones):null]);
    const sec=(t,L,fn)=>{if(!L.length)return;card.appendChild(E("div",{class:"apr-sec"},[E("h3",{text:t}),E("div",{class:"apr-l"},L.map(fn))]));};
    sec("Pendientes",P,x=>{let b=null;if(yoA){const mot=E("input",{type:"text",class:"apr-in",placeholder:"Por qué no (opcional)","aria-label":"Motivo del rechazo"});
        let paso=0;const bn=E("button",{type:"button",class:"btn sec peq",text:"Rechazar",onclick:async()=>{if(!paso){paso=1;mot.hidden=false;mot.focus();bn.textContent="Confirmar rechazo";return;}await marca(x,"no",mot.value.trim());}});mot.hidden=true;
        b=[E("button",{type:"button",class:"btn peq",text:"Aprobar",onclick:()=>marca(x,"ok")}),bn,mot];}
      else b=[E("span",{class:"apr-esp",text:"Esperando el visto bueno"}),x.ir?E("button",{type:"button",class:"btn sec peq",text:"Ver",onclick:x.ir}):null];
      return fila(x,b);});
    if(!P.length)card.appendChild(E("p",{class:"apr-p apr-ok",text:"✓ No hay nada pendiente de aprobar."}));
    sec("Rechazados: hay que corregir",R,x=>fila(x,puede?[x.ir?E("button",{type:"button",class:"btn sec peq",text:"Ver",onclick:x.ir}):null,E("button",{type:"button",class:"btn peq",text:"Ya está corregido",onclick:()=>marca(x,"corr")})]:null,"no"));
    sec("Últimos vistos",ok,x=>fila(x,null,"ok"));
    if(o.campos&&window.yoAdmin&&window.yoAdmin())card.appendChild(E("div",{class:"apr-p"},E("button",{type:"button",class:"btn sec peq",text:"Cambiar límites y quién aprueba",onclick:ajustes})));
    setTimeout(avisaNuevos,500);
    return card;}
  /* ajustes (solo el administrador): los límites y quién aprueba */
  async function ajustes(){const c=JSON.parse(JSON.stringify(o.cfg()||{}));c.quien=c.quien||[];let U=[];
    try{const r=await window.sbColada.from("usuarios").select("user_id,nombre,activo,consulta,coladas");U=(r.data||[]).filter(u=>u.activo&&!u.consulta&&(!o.soloColadas||u.coladas));}catch(e){}
    let ov;const cerrar=()=>ov.remove();
    const campos=o.campos.map(f=>f.tipo==="bool"?E("label",{class:"apr-ck"},[E("input",{type:"checkbox",id:"aprC_"+f.k,checked:c[f.k]!==false?true:null,onchange:e=>{c[f.k]=e.target.checked;}}),f.t])
      :E("label",{class:"rgx-campo"},[E("span",{class:"rgx-et",text:f.t}),E("input",{type:"text",inputmode:"decimal",id:"aprC_"+f.k,class:"rgx-num",value:String(c[f.k]==null?"":c[f.k]),oninput:e=>{const v=parseFloat(String(e.target.value).replace(",","."));c[f.k]=isFinite(v)?v:null;}})]));
    const quien=E("div",{class:"apr-quien"},U.map(u=>E("label",{class:"apr-ck"},[E("input",{type:"checkbox",checked:c.quien.includes(u.user_id)?true:null,onchange:e=>{c.quien=c.quien.filter(x=>x!==u.user_id);if(e.target.checked)c.quien.push(u.user_id);}}),u.nombre||"(sin nombre)"])));
    ov=E("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)cerrar();}},[E("div",{class:"dlg rgx-dlg",role:"dialog","aria-modal":"true","aria-label":"Aprobaciones"},[E("h3",{class:"rgx-h",text:"Aprobaciones"}),
      E("div",{class:"rgx-form"},campos.concat([E("div",{class:"rgx-campo"},[E("span",{class:"rgx-et",text:"Quién aprueba"}),U.length?quien:E("p",{class:"hint",text:"No se pudo leer la lista de usuarios."})])])),
      E("div",{class:"rgx-pieb"},[E("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:cerrar}),E("button",{type:"button",class:"btn",text:"Guardar",onclick:async()=>{try{await o.guardarCfg(c);}catch(e){toast("No se pudo guardar");return;}toast("Guardado");cerrar();if(o.alCambiar)o.alCambiar();}})])])]);
    document.body.appendChild(ov);}
  return{pend,rech,campana,pantalla,soyAprob,avisaNuevos,marca,ajustes};};
})();

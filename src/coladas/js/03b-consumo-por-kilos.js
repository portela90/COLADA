/* ---------- Consumo por kilos ----------
   Como «Por relevo», pero para cada colada se escriben de una vez los kilos de cada fardo
   (los de la hoja del hornero), separados por comas: «700,769,682» (o con espacios). La app cuenta los fardos,
   suma los kilos y guarda el consumo con esos kilos (r.kg) y la lista de pesos (r.pk).
   Un solo número grande se toma como el total de kilos (los fardos se calculan con la media).
   Al acabarse una colada pesada así, casi siempre sobran o faltan unos kilos frente al albarán:
   se avisa y se puede apuntar el ajuste con un botón. */
const KIL_TOL=0.06;
const mediaCol=b=>b?(b.rx||b.ratio||0):0;
/* los números de una casilla de fardos: se separan con espacio, coma o punto (así basta el teclado numérico:
   «700,769,682» o «700.769.682»). Un número de miles con un solo separador («10.326», «10,326») es un total de kilos. */
function numsFardos(t){return String(t||"").trim().split(/[\s+\/;]+/).filter(Boolean).flatMap(x=>{x=x.replace(/^[,.]+|[,.]+$/g,"");if(!x)return[];
  if(/^\d{1,2}[.,]\d{3}$/.test(x))return[Number(x.replace(/[.,]/,""))];return x.split(/[.,]+/).filter(Boolean).map(Number);});}
function leerKilos(t,b){t=String(t||"").trim();if(!t)return{k:[],kg:0,fa:0};const m=mediaCol(b);
  const nums=numsFardos(t);
  if(nums.some(n=>!(n>0)))return{error:"Hay algo que no es un número. Escribe los kilos de cada fardo separados por comas.",k:[],kg:0,fa:0};
  if(nums.length===1&&m>0&&nums[0]>m*1.5)return{total:true,k:[],kg:nums[0],fa:Math.max(1,Math.round(nums[0]/m))};
  return{k:nums,kg:nums.reduce((a,b2)=>a+b2,0),fa:nums.length};}
const kgRaro=(v,b)=>{const m=mediaCol(b);return m>0&&Math.abs(v-m)/m>KIL_TOL;};
/* coladas ya acabadas (0 fardos) que tienen consumos con kilos reales y les sobran o faltan kilos */
function coladasConResto(){const S=saldos(),ms=todosMovs();
  return lotes.filter(l=>{const b=S[l.id];return b&&b.fa===0&&Math.abs(b.kg)>=1&&ms.some(r=>r.t==="C"&&r.o===l.id&&Array.isArray(r.pk));})
    .map(l=>({l,kg:Math.round(S[l.id].kg)}));}
async function ajustarResto(x){const sobra=x.kg>0;
  const ok=await confirmar(x.l.nombre+" ya no tiene fardos, pero en la app le "+(sobra?"sobran ":"faltan ")+fmt(Math.abs(x.kg))+" kg: los fardos pesados "+(sobra?"suman menos":"suman más")+" que el albarán.\n\nSe apunta un ajuste de "+(sobra?"−":"+")+fmt(Math.abs(x.kg))+" kg para dejarla a cero. Así la diferencia queda registrada.",{titulo:"Ajustar "+x.l.nombre,ok:"Apuntar ajuste"});
  if(!ok)return;const r={i:uid("m"),t:"A",f:hoy(),fa:0,kg:Math.abs(x.kg),n:"Diferencia de peso al acabar la colada ("+(sobra?"los fardos pesaron ":"los fardos pesaron ")+fmt(Math.abs(x.kg))+" kg "+(sobra?"menos":"más")+" que el albarán)"};
  if(sobra)r.o=x.l.id;else r.d=x.l.id;
  try{await addMovs([r]);toast("Ajuste apuntado");}catch(e){toast("No se pudo guardar");}}
function cardRestos(){const L=coladasConResto();if(!L.length)return null;
  return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Coladas acabadas con diferencia de peso"})]),el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:8px"},
    L.map(x=>el("div",{class:"sa-row"},[el("div",{style:"flex:1;min-width:0"},[el("b",{text:x.l.nombre}),el("div",{class:"sub",text:x.l.nave+" · "+MAT[x.l.material].nom+" · "+(x.kg>0?"sobran ":"faltan ")+fmt(Math.abs(x.kg))+" kg frente al albarán"})]),
      el("button",{type:"button",class:"btn sec",text:"Apuntar ajuste",onclick:()=>ajustarResto(x)})])).concat([el("p",{class:"hint",style:"margin:0",text:"Los fardos se han pesado uno a uno y no suman lo mismo que el albarán. Con el ajuste la colada queda a cero."})]))]);}

function vKilos(){
  const d=draft.kil=draft.kil||{};if(!d.fecha)d.fecha=hoy();if(!d.turno)d.turno=TURNOS[0];if(!d.L)d.L={};if(!d.g)d.g={};
  const {S}=bloques();
  const lineas=LINEAS.filter(([n,m])=>fifoLista(n,m,S).length||(d.L[key(n,m)]||[]).some(x=>x.t));
  const ya=todosMovs().filter(r=>(r.t==="C"||(r.t==="G"&&!r.aj&&r.kg<0))&&r.f===d.fecha&&r.u===d.turno);
  const vivos=[];/* para refrescar sin volver a pintar todo al escribir */
  const goBtn=el("button",{id:"k-go",class:"btn",type:"button",text:"Registrar relevo"});
  const resTabla=el("div",{class:"tw"}),resPill=el("span",{style:"margin-left:auto"});
  const calc=()=>{const out=[];let err=0,algo=false;
    lineas.forEach(([n,m])=>{const k=key(n,m),rows=d.L[k]||[],lista=fifoLista(n,m,S);
      const P=rows.map(x=>{const b=S[x.lote];const p=leerKilos(x.t,b);return Object.assign({x,b},p);});
      const tot=P.reduce((a,p)=>a+p.fa,0);const esperado=tot>0?fifoReparto(lista,tot,S):[];const exp={},uso={};
      esperado.forEach(r=>{if(r.lote)exp[r.lote]=(exp[r.lote]||0)+numES(r.fa);});P.forEach(p=>{if(p.x.lote&&p.fa)uso[p.x.lote]=(uso[p.x.lote]||0)+p.fa;});
      const tocaban=Object.keys(exp).filter(id=>(uso[id]||0)<exp[id]).map(id=>(lotes.find(l=>l.id===id)||{}).nombre).filter(Boolean);
      P.forEach(p=>{p.fuera=!!(p.x.lote&&p.fa&&tocaban.length&&(uso[p.x.lote]||0)>(exp[p.x.lote]||0));p.tocaban=tocaban;
        p.pasa=p.b&&p.fa>p.b.fa?p.fa-p.b.fa:0;if(p.error)err++;if(p.fa&&!p.x.lote)err++;if(p.fa)algo=true;});
      out.push({n,m,k,P,tot,kg:P.reduce((a,p)=>a+p.kg,0)});});
    NAVES.forEach(n=>{const s=d.g[n]||"",v=numES(s);if(v>0)algo=true;if(s!==""&&!(v>=0))err++;});
    return{out,err,algo};};
  const refresca=()=>{const C=calc();vivos.forEach(f=>f(C));
    let html="<table><thead><tr><th>Colada</th><th class='r'>Fardos</th><th class='r'>Kilos reales</th><th class='r'>Con la media</th><th class='r'>Diferencia</th></tr></thead><tbody>";let tf=0,tk=0,tm=0,raros=0;
    C.out.forEach(o=>o.P.forEach(p=>{if(!p.fa||!p.b)return;const km=p.fa*mediaCol(p.b),df=p.kg-km;tf+=p.fa;tk+=p.kg;tm+=km;raros+=p.k.filter(v=>kgRaro(v,p.b)).length;
      html+="<tr><td>"+escH((lotes.find(l=>l.id===p.x.lote)||{}).nombre||"?")+"<div class='sub'>"+escH(o.n+" · "+MAT[o.m].nom)+"</div></td><td class='r num'>"+p.fa+"</td><td class='r num'>"+fmt(p.kg)+"</td><td class='r num'>"+fmt(km)+"</td><td class='r num'>"+(df>0?"+":"")+fmt(df)+"</td></tr>";}));
    NAVES.forEach(n=>{const v=numES(d.g[n]||"");if(v>0)html+="<tr><td>Granalla de cobre<div class='sub'>"+n+"</div></td><td class='r num'>—</td><td class='r num'>"+v.toLocaleString("es-ES")+"</td><td class='r num'>—</td><td class='r num'>—</td></tr>";});
    if(tf){const df=tk-tm;html+="<tr style='font-weight:700'><td>Total</td><td class='r num'>"+tf+"</td><td class='r num'>"+fmt(tk)+"</td><td class='r num'>"+fmt(tm)+"</td><td class='r num'>"+(df>0?"+":"")+fmt(df)+"</td></tr>";}
    if(!C.algo)html+="<tr><td colspan='5' class='sub'>Escribe los kilos de los fardos de alguna colada.</td></tr>";
    resTabla.innerHTML=html+"</tbody></table>";
    resPill.innerHTML=raros?"<span class='pill warn'>"+raros+" peso"+(raros===1?"":"s")+" raro"+(raros===1?"":"s")+"</span>":tf?"<span class='pill ok'>Todo normal</span>":"";
    goBtn.disabled=!C.algo||C.err>0;};
  const escH=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const cards=lineas.map(([n,m])=>{const k=key(n,m),lista=fifoLista(n,m,S);
    const rows=d.L[k]=d.L[k]&&d.L[k].length?d.L[k]:[{lote:lista.length?lista[0].id:"",t:""}];
    const totS=el("span",{class:"sub",style:"margin-left:auto"});
    vivos.push(C=>{const o=C.out.find(z=>z.k===k);totS.textContent=o&&o.tot?fmt(o.tot)+" f · "+fmt(o.kg)+" kg":"";});
    const filas=rows.map((x,i)=>{
      const opts=[el("option",{value:"",text:"— elige la colada —"})].concat(lista.map((l,j)=>{const o=el("option",{value:l.id,text:(j===0?"⬅ ":"")+l.nombre+" · "+fmt(S[l.id].fa)+" f"});if(x.lote===l.id)o.selected=true;return o;}));
      const inp=el("input",{id:"kk-"+k+"-"+i,class:"num",type:"text",inputmode:"decimal",autocomplete:"off",autocapitalize:"off",spellcheck:"false",placeholder:"Kilos de los fardos: 700,769,682","aria-label":"Kilos de los fardos",value:x.t||"",style:"font-size:18px;width:100%",oninput:e=>{x.t=e.target.value;refresca();}});
      const chips=el("div",{class:"kil-chips"}),pie=el("div",{class:"kil-pie"}),av=el("div");
      vivos.push(C=>{const o=C.out.find(z=>z.k===k),p=o&&o.P[i];if(!p)return;chips.textContent="";av.textContent="";av.className="";
        p.k.forEach((v,j)=>chips.appendChild(el("span",{class:"kil-f num"+(kgRaro(v,p.b)?" raro":""),title:kgRaro(v,p.b)?"Lo normal en esta colada son unos "+fmt(mediaCol(p.b))+" kg":""},[el("small",{text:"F"+(j+1)}),document.createTextNode(fmt(v))])));
        chips.hidden=!p.k.length;
        pie.textContent=(p.fa?fmt(p.fa)+" fardo"+(p.fa===1?"":"s")+" · "+fmt(p.kg)+" kg"+(p.total?" (total)":""):"")+(p.b?(p.fa?" · ":"")+"media de la colada "+(Math.round(mediaCol(p.b)*10)/10).toLocaleString("es-ES")+" kg":"");
        const malos=p.k.filter(v=>kgRaro(v,p.b)),msg=[];
        if(p.error)msg.push(p.error);
        if(p.fa&&!x.lote)msg.push("Elige la colada.");
        if(p.pasa)msg.push("No hay tantos: a la colada le quedan "+fmt(p.b.fa)+" fardos.");
        if(malos.length)msg.push(malos.map(fmt).join(", ")+" kg se sale de lo normal en esta colada (unos "+fmt(mediaCol(p.b))+" kg). Compruébalo con la etiqueta.");
        if(p.total)msg.push("Un solo número grande: se toma como el total, unos "+p.fa+" fardos a la media de la colada.");
        if(p.fuera)msg.push("Fuera de FIFO: tocaba "+p.tocaban.join(", ")+".");
        if(msg.length){av.className=p.error||(p.fa&&!x.lote)?"banner b":p.total?"hint":"banner w";av.textContent=msg.join(" ");}});
      return el("div",{class:"kil-col"},[
        el("div",{class:"kil-hd"},[el("select",{id:"ks-"+k+"-"+i,"aria-label":"Colada",onchange:e=>{x.lote=e.target.value;render();}},opts),
          el("button",{type:"button",class:"btn sec quita","aria-label":"Quitar esta colada",text:"✕",onclick:()=>{rows.splice(i,1);render();}})]),
        inp,chips,pie,av]);});
    return el("div",{class:"card"},[el("div",{class:"hd"},[el("span",{class:"tagm",style:"background:"+MAT[m].col}),el("h2",{text:n+" · "+MAT[m].nom}),totS]),
      el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:12px"},filas.concat([el("button",{type:"button",class:"btn sec",style:"align-self:flex-start",text:"+ Otra colada",onclick:()=>{const usados=new Set(rows.map(r=>r.lote));const sig=lista.find(l=>!usados.has(l.id));rows.push({lote:sig?sig.id:"",t:""});render();}})]))]);});
  const gIn=NAVES.map(n=>el("label",{text:"Granalla de cobre "+n+" (kg)"},[el("input",{id:"kg-"+n,class:"num",type:"text",inputmode:"decimal",value:d.g[n]||"",oninput:e=>{d.g[n]=e.target.value;refresca();}})]));
  goBtn.onclick=async e=>{const b=e.currentTarget,C=calc();if(C.err||!C.algo)return;const recs=[],resumen=[];
    C.out.forEach(o=>{const pp=o.P.filter(p=>p.fa&&p.x.lote);if(!pp.length)return;
      resumen.push(o.n+" "+MAT[o.m].nom+": "+pp.map(p=>fmt(p.fa)+" f de "+((lotes.find(l=>l.id===p.x.lote)||{}).nombre||"?")+" ("+fmt(p.kg)+" kg)"+(p.fuera?" fuera de FIFO":"")).join(" + "));
      pp.forEach(p=>{const r={i:uid("m"),t:"C",f:d.fecha,u:d.turno,o:p.x.lote,fa:p.fa,kg:Math.round(p.kg*100)/100};if(p.k.length)r.pk=p.k.slice();else r.n="Kilos totales del relevo";
        if(p.fuera)r.n=(r.n?r.n+" · ":"")+"Fuera de FIFO"+(p.tocaban.length?" (tocaba "+p.tocaban.join(", ")+")":"");recs.push(r);});});
    NAVES.forEach(n=>{const v=numES(d.g[n]||"");if(v>0){recs.push({i:uid("m"),t:"G",f:d.fecha,kg:-v,n:"",u:d.turno,nv:n});resumen.push("Granalla de cobre "+n+": "+v.toLocaleString("es-ES")+" kg");}});
    if(!recs.length)return;
    let modo="sumar";
    if(ya.length){const v=await dialogo({titulo:"Este relevo ya tiene consumo",texto:dmy(d.fecha)+" · "+d.turno+" ya tiene "+ya.length+" apunte(s):\n"+ya.map(r=>r.t==="G"?"granalla de cobre "+fmt(-r.kg)+" kg":fmt(r.fa)+" f de "+((lotes.find(l=>l.id===r.o)||{}).nombre||"?")).join("\n")+"\n\n¿Lo nuevo se suma a eso o lo sustituye (se borran esos apuntes y quedan solo los nuevos)?",ok:"Sumar",extra:{text:"Sustituir",valor:"sust"}});
      if(v===null||v===false)return;modo=v==="sust"?"sust":"sumar";}
    else if(!(await confirmar(dmy(d.fecha)+" · "+d.turno+"\n\n"+resumen.join("\n"),{titulo:"Registrar relevo",ok:"Registrar"})))return;
    b.disabled=true;
    try{if(modo==="sust")for(const r of ya)await delMov(r.i,r.f);
      await addMovs(recs);toast("Relevo registrado: "+recs.length+" apunte"+(recs.length===1?"":"s")+(modo==="sust"?" (sustituyendo lo que había)":""));
      const[f2,t2]=sigTurno(d.fecha,d.turno);draft.kil={fecha:f2>hoy()?d.fecha:f2,turno:f2>hoy()?d.turno:t2,L:{},g:{}};render();}
    catch(err){toast("No se pudo guardar");b.disabled=false;}};
  const out=[
    el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Consumo del relevo por kilos"})]),el("div",{class:"bd"},[
      el("div",{class:"row"},[
        el("label",{text:"Fecha"},[el("input",{id:"k-f",type:"date",max:hoy(),value:d.fecha,onchange:e=>{d.fecha=e.target.value||hoy();render();}})]),
        el("label",{text:"Relevo"},[el("div",{class:"seg"},TURNOS.map(t=>el("button",{type:"button","aria-pressed":String(d.turno===t),text:t,onclick:()=>{d.turno=t;render();}})))])]),
      ya.length?el("div",{class:"banner w",style:"margin-top:12px",text:"Este relevo ya tiene "+ya.length+" apunte(s): "+ya.map(r=>r.t==="G"?"granalla de cobre "+fmt(-r.kg)+" kg":fmt(r.fa)+" f de "+((lotes.find(l=>l.id===r.o)||{}).nombre||"?")+(typeof r.kg==="number"?" ("+fmt(r.kg)+" kg)":"")).join(" · ")+". Al registrar te pregunto si sumar o sustituir."}):null,
      el("p",{class:"hint",style:"margin-top:10px",text:"Copia de la hoja del hornero los kilos de cada fardo, separados por comas: «700,769,682» (o con espacios). La app cuenta los fardos y suma los kilos."})])]),
    cardRestos()].concat(cards).concat([
    el("div",{class:"card"},[el("div",{class:"hd"},[el("span",{class:"tagm",style:"background:var(--cobre)"}),el("h2",{text:"Granalla de cobre"})]),el("div",{class:"bd"},[el("div",{class:"row"},gIn)])]),
    el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Resumen del relevo"}),resPill]),el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[resTabla,
      el("p",{class:"hint",style:"margin:0",text:"«Con la media» es lo que se apuntaría con «Por relevo» (fardos × media de la colada)."})])]),
    goBtn]);
  refresca();
  return out.filter(Boolean);
}

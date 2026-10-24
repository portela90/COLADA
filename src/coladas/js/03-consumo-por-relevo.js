/* ---------- Consumo por relevo ----------
   Se escribe el total de fardos de cada línea y la app lo reparte por FIFO.
   Si el operario cogió otra colada, se cambia en el desplegable antes de
   registrar; queda marcado "fuera de FIFO" en la nota del apunte. */
const sigTurno=(f,t)=>{const i=TURNOS.indexOf(t);if(i<TURNOS.length-1)return[f,TURNOS[i+1]];
  const d=new Date(+f.slice(0,4),+f.slice(5,7)-1,+f.slice(8,10)+1);return[ymd(d),TURNOS[0]];};
function fifoReparto(lista,tot,S){const rows=[];let rem=tot;
  for(const l of lista){if(rem<=0)break;const t=Math.min(rem,S[l.id].fa);if(t>0){rows.push({lote:l.id,fa:String(t)});rem-=t;}}
  if(rem>0){if(rows.length)rows[rows.length-1].fa=String(numES(rows[rows.length-1].fa)+rem);else rows.push({lote:"",fa:String(tot)});}
  return rows;}
function modoConsumo(){return el("div",{class:"seg",role:"group","aria-label":"Forma de apuntar"},[["relevo","Por relevo"],["suelto","Apunte suelto"]].map(([v,t])=>
  el("button",{type:"button","aria-pressed":String(consModo===v),text:t,onclick:()=>{consModo=v;render();}})));}
function vRelevo(){
  const d=draft.rel;if(!d.fecha)d.fecha=hoy();if(!d.turno)d.turno=TURNOS[0];if(!d.L)d.L={};if(!d.g)d.g={};
  const {S}=bloques();
  const lineas=LINEAS.filter(([n,m])=>fifoLista(n,m,S).length||(d.L[key(n,m)]&&d.L[key(n,m)].tot));
  const ya=todosMovs().filter(r=>(r.t==="C"||(r.t==="G"&&!r.aj&&r.kg<0))&&r.f===d.fecha&&r.u===d.turno);
  const plan=[];let errores=0,hayAlgo=false;
  const cards=lineas.map(([n,m])=>{
    const k=key(n,m),x=d.L[k]||(d.L[k]={tot:"",rows:[],manual:false});
    const tot=numES(x.tot),lista=fifoLista(n,m,S);
    if(!x.manual)x.rows=tot>0?fifoReparto(lista,tot,S):[];
    const esperado=tot>0?fifoReparto(lista,tot,S):[],setEsp=new Set(esperado.map(r=>r.lote));
    const suma=x.rows.reduce((a,r)=>a+(numES(r.fa)>0?numES(r.fa):0),0);
    const errs=[];
    if(x.tot!==""&&!(tot>=0))errs.push("El total no es un número.");
    if(tot>0&&suma!==tot)errs.push("El reparto suma "+fmt(suma)+" y el total es "+fmt(tot)+".");
    x.rows.forEach(r=>{if(numES(r.fa)>0&&!r.lote)errs.push("Falta elegir la colada de "+r.fa+" fardos.");});
    if(tot>0)hayAlgo=true;errores+=errs.length;
    /* fuera de FIFO: se dejó sin tocar (o se usó menos de) una colada que tocaba,
       y en su lugar se cogió otra o más de otra */
    const exp={},uso={};esperado.forEach(r=>{if(r.lote)exp[r.lote]=(exp[r.lote]||0)+numES(r.fa);});
    x.rows.forEach(r=>{const f=numES(r.fa);if(r.lote&&f>0)uso[r.lote]=(uso[r.lote]||0)+f;});
    const tocaban=Object.keys(exp).filter(id=>(uso[id]||0)<exp[id]).map(id=>(lotes.find(l=>l.id===id)||{}).nombre).filter(Boolean);
    const filas=x.rows.map((r,i)=>{
      const b=S[r.lote],fa=numES(r.fa),queda=b?b.fa-(uso[r.lote]||0):null,fuera=!!(r.lote&&fa>0&&tocaban.length&&(uso[r.lote]||0)>(exp[r.lote]||0));
      if(r.lote&&fa>0)plan.push({k,lote:r.lote,fa,fuera,tocaban});
      const opts=[el("option",{value:"",text:"— elige la colada —"})].concat(lista.map((l,j)=>{const o=el("option",{value:l.id,text:(j===0?"⬅ ":"")+l.nombre+" · "+fmt(S[l.id].fa)+" f"});if(r.lote===l.id)o.selected=true;return o;}));
      if(r.lote&&!lista.some(l=>l.id===r.lote)){const l=lotes.find(y=>y.id===r.lote);if(l){const o=el("option",{value:l.id,text:l.nombre+" · 0 f"});o.selected=true;opts.push(o);}}
      return el("div",{class:"rel-row"},[
        el("select",{id:"rs-"+k+"-"+i,"aria-label":"Colada",onchange:e=>{x.manual=true;r.lote=e.target.value;render();}},opts),
        el("input",{id:"rf-"+k+"-"+i,class:"num",type:"text",inputmode:"numeric","aria-label":"Fardos de esta colada",value:r.fa,oninput:e=>{x.manual=true;r.fa=e.target.value;render();}}),
        x.rows.length>1?el("button",{type:"button",class:"btn sec quita","aria-label":"Quitar esta colada",text:"✕",onclick:()=>{x.manual=true;x.rows.splice(i,1);render();}}):el("span"),
        el("div",{class:"rel-info"},[
          fuera?el("span",{class:"pill warn",text:"Fuera de FIFO"}):null,
          queda!=null&&fa>0?el("span",{class:"sub",style:queda<0?"color:var(--bad);font-weight:600":"",text:queda<0?"No hay tantos: faltan "+fmt(-queda):(queda===0?"se acaba":"quedarán "+fmt(queda))}):null])]);});
    return el("div",{class:"card"},[
      el("div",{class:"hd"},[el("span",{class:"tagm",style:"background:"+MAT[m].col}),el("h2",{text:n+" · "+MAT[m].nom}),
        el("label",{class:"rel-tot"},[document.createTextNode("Total"),el("input",{id:"rt-"+k,class:"num",type:"text",inputmode:"numeric",placeholder:"0",value:x.tot,oninput:e=>{x.tot=e.target.value;x.manual=false;render();}})])]),
      tot>0?el("div",{class:"bd"},[
        el("div",{class:"rel-rows"},filas),
        el("div",{class:"seg",style:"margin-top:10px"},[
          el("button",{type:"button",text:"+ Añadir otra colada",onclick:()=>{x.manual=true;x.rows.push({lote:"",fa:""});render();}}),
          x.manual?el("button",{type:"button",text:"Volver a repartir por FIFO",onclick:()=>{x.manual=false;render();}}):null]),
        tocaban.length?el("p",{class:"hint",style:"margin-top:8px",text:"Por FIFO tocaba: "+tocaban.join(", ")+"."}):null,
        errs.length?el("div",{class:"banner b",style:"margin-top:8px",text:errs.join(" ")}):null
      ]):null]);
  });
  const gIn=NAVES.map(n=>{const v=numES(d.g[n]||"");if(v>0)hayAlgo=true;if((d.g[n]||"")!==""&&!(v>=0))errores++;
    return el("label",{text:"Granalla de cobre "+n+" (kg)"},[el("input",{id:"rg-"+n,class:"num",type:"text",inputmode:"decimal",value:d.g[n]||"",oninput:e=>{d.g[n]=e.target.value;render();}})]);});
  const ok=hayAlgo&&!errores;
  const registrar=async e=>{const b=e.currentTarget;
    const recs=[],resumen=[];
    lineas.forEach(([n,m])=>{const k=key(n,m),ps=[];
      plan.filter(p=>p.k===k).forEach(p=>{const q=ps.find(y=>y.lote===p.lote);if(q)q.fa+=p.fa;else ps.push(Object.assign({},p));});
      if(!ps.length)return;
      resumen.push(n+" "+MAT[m].nom+": "+ps.map(p=>fmt(p.fa)+" de "+(lotes.find(l=>l.id===p.lote)||{}).nombre+(p.fuera?" (fuera de FIFO)":"")).join(" + "));
      ps.forEach(p=>{const r={i:uid("m"),t:"C",f:d.fecha,u:d.turno,o:p.lote,fa:p.fa};
        if(p.fuera)r.n="Fuera de FIFO"+(p.tocaban.length?" (tocaba "+p.tocaban.join(", ")+")":"");recs.push(r);});});
    NAVES.forEach(n=>{const v=numES(d.g[n]||"");if(v>0){recs.push({i:uid("m"),t:"G",f:d.fecha,kg:-v,n:"",u:d.turno,nv:n});resumen.push("Granalla de cobre "+n+": "+v.toLocaleString("es-ES")+" kg");}});
    if(!recs.length)return;
    if(!(await confirmar(dmy(d.fecha)+" · "+d.turno+"\n\n"+resumen.join("\n")+(ya.length?"\n\nOjo: este relevo ya tenía "+ya.length+" apunte(s); estos se suman.":""),{titulo:"Registrar relevo",ok:"Registrar"})))return;
    b.disabled=true;
    try{await addMovs(recs);toast("Relevo registrado: "+recs.length+" apunte"+(recs.length===1?"":"s"));
      const[f2,t2]=sigTurno(d.fecha,d.turno);draft.rel={fecha:f2>hoy()?d.fecha:f2,turno:f2>hoy()?d.turno:t2,L:{},g:{}};render();}
    catch(err){toast("No se pudo guardar");b.disabled=false;}};
  return [
    el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Consumo del relevo"})]),el("div",{class:"bd"},[
      el("div",{class:"row"},[
        el("label",{text:"Fecha"},[el("input",{id:"r-f",type:"date",max:hoy(),value:d.fecha,onchange:e=>{d.fecha=e.target.value||hoy();render();}})]),
        el("label",{text:"Relevo"},[el("div",{class:"seg"},TURNOS.map(t=>el("button",{type:"button","aria-pressed":String(d.turno===t),text:t,onclick:()=>{d.turno=t;render();}})))])]),
      ya.length?el("div",{class:"banner w",style:"margin-top:12px",text:"Este relevo ya tiene "+ya.length+" apunte(s): "+ya.map(r=>r.t==="G"?"granalla de cobre "+fmt(-r.kg)+" kg":fmt(r.fa)+" f de "+((lotes.find(l=>l.id===r.o)||{}).nombre||"?")).join(" · ")+". Lo que registres ahora se suma."}):null,
      el("p",{class:"hint",style:"margin-top:10px",text:"Escribe el total de fardos de cada línea: se reparte solo por FIFO. Si el operario cogió otra colada, cámbiala en el desplegable antes de registrar."})])]),
  ].concat(cards).concat([
    el("div",{class:"card"},[el("div",{class:"hd"},[el("span",{class:"tagm",style:"background:var(--cobre)"}),el("h2",{text:"Granalla de cobre"})]),el("div",{class:"bd"},[el("div",{class:"row"},gIn)])]),
    el("button",{id:"r-go",class:"btn",type:"button",text:"Registrar relevo",disabled:ok?null:"disabled",onclick:registrar})
  ]);
}

function vConsumo(){
  if(consModo==="relevo")return [modoConsumo()].concat(vRelevo());
  const d=draft.cons;if(!d.fecha)d.fecha=hoy();if(!d.turno)d.turno=TURNOS[0];
  const {S}=bloques();
  const cand=lotes.filter(l=>(!d.nave||l.nave===d.nave)&&(!d.mat||l.material===d.mat)&&l.donde==="nave"&&S[l.id]&&S[l.id].fa>0)
                  .sort((a,b)=>(a.entrada||"").localeCompare(b.entrada||"")||a.nombre.localeCompare(b.nombre,"es"));
  if(d.lote&&!cand.some(l=>l.id===d.lote))d.lote="";
  const primero=cand.length?cand[0].id:null;
  const sel=el("select",{id:"c-lote",onchange:e=>{d.lote=e.target.value;render();}},
    [el("option",{value:"",text:cand.length?"— elige la colada —":"— no hay coladas en la nave —"})].concat(
      cand.map((l,i)=>{const b=S[l.id];const o=el("option",{value:l.id,text:(i===0?"⬅ ":"")+l.nombre+"  ·  "+fmt(b.fa)+" f  ·  "+dmy(l.entrada)});if(d.lote===l.id)o.selected=true;return o;})));
  const lot=lotes.find(l=>l.id===d.lote),ratio=lot&&S[lot.id]?S[lot.id].ratio:0;
  const nf=numES(d.fardos||""),nk=(d.kg!==""&&d.kg!=null)?numES(d.kg):NaN;
  const kgFin=!isNaN(nk)?nk:(!isNaN(nf)&&ratio>0?Math.round(nf*ratio):NaN);
  const ok=!!lot&&!isNaN(nf)&&nf>0&&!!d.fecha&&!isNaN(kgFin);
  const avisos=[];
  if(lot&&primero&&lot.id!==primero){const p=lotes.find(l=>l.id===primero);avisos.push(["w","FIFO: hay una colada más antigua en la nave — "+p.nombre+", entró el "+dmy(p.entrada)+". Consume esa primero salvo que tengas motivo."]);}
  if(lot&&!isNaN(nf)&&S[lot.id].fa-nf<0)avisos.push(["b","No hay tantos fardos: la colada se quedaría en negativo."]);
  if(lot&&ratio<=0)avisos.push(["w","Esta colada no tiene kilos por fardo: escribe los kilos a mano."]);
  const form=el("form",{onsubmit:async e=>{e.preventDefault();if(!ok)return;const b=$("c-go");b.disabled=true;
    try{const rec={i:uid("m"),t:"C",f:d.fecha,u:d.turno,o:lot.id,fa:nf};if(!isNaN(nk))rec.kg=nk;
      await addMov(rec);toast("Consumo registrado: "+fmt(kgFin)+" kg");
      draft.cons={nave:d.nave,mat:d.mat,turno:d.turno,fecha:d.fecha,fardos:"",kg:""};render();
    }catch(err){toast("No se pudo guardar");b.disabled=false;}}},[
    el("label",{text:"Nave"},[el("div",{class:"seg"},NAVES.map(n=>el("button",{type:"button","aria-pressed":String(d.nave===n),text:n,onclick:()=>{d.nave=d.nave===n?"":n;render();}})))]),
    el("label",{text:"Aleación"},[el("div",{class:"seg"},Object.keys(MAT).map(m=>el("button",{type:"button","aria-pressed":String(d.mat===m),text:MAT[m].nom,onclick:()=>{d.mat=d.mat===m?"":m;render();}})))]),
    el("label",{text:"Colada — la de arriba es la más antigua"},[sel]),
    el("div",{class:"row"},[
      el("label",{text:"Fardos consumidos"},[el("input",{id:"c-fa",class:"num",type:"text",inputmode:"numeric",min:"0",step:"1",value:d.fardos||"",oninput:e=>{d.fardos=e.target.value;render();}})]),
      el("label",{text:"Kilos (opcional)"},[el("input",{id:"c-kg",class:"num",type:"text",inputmode:"decimal",min:"0",step:"any",placeholder:ratio>0?"se calculan":"",value:d.kg||"",oninput:e=>{d.kg=e.target.value;render();}})])
    ]),
    el("div",{class:"row"},[
      el("label",{text:"Fecha"},[el("input",{id:"c-f",type:"date",value:d.fecha,onchange:e=>{d.fecha=e.target.value;render();}})]),
      el("label",{text:"Turno"},[el("div",{class:"seg"},TURNOS.map(t=>el("button",{type:"button","aria-pressed":String(d.turno===t),text:t,onclick:()=>{d.turno=t;render();}})))])
    ]),
    el("div",{class:"calc num"},[el("b",{text:isNaN(kgFin)?"—":fmt(kgFin)}),el("span",{text:"kg que se descontarán"}),ratio>0?el("span",{text:"· "+ratio.toLocaleString("es-ES")+" kg por fardo"}):null]),
    el("button",{id:"c-go",class:"btn",type:"submit",text:"Registrar consumo",disabled:ok?null:"disabled"})
  ]);
  const out=[modoConsumo(),el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Registrar consumo"})]),el("div",{class:"bd"},[form])])];
  avisos.forEach(([c,t])=>out.push(el("div",{class:"banner "+c,text:t})));
  out.push(granCard("C"));
  return out;
}

/* ---------- Camión previsto → entrada ----------
   Los camiones colocados en el calendario del Plan se pueden dar por llegados:
   se abre Entradas ya rellenado y, al registrar, queda marcado "recibido"
   (y deja de sumarse en la proyección, porque ya es stock real). */
/* Subir n fardos de una colada del almacén externo a su nave. Entera: la colada pasa a «en nave».
   Una parte: la colada se parte en dos y queda el traslado apuntado. b = saldo de la colada (saldos()). */
async function subirExterno(l,b,n){const hay=b.fa;
  /* si ya se subió antes una parte de esta colada, lo que llega se junta en esa misma línea de la nave */
  const yaEnNave=lotes.find(x=>x.id!==l.id&&x.nombre===l.nombre&&x.nave===l.nave&&x.material===l.material&&x.donde==="nave");
  if(n===hay&&!yaEnNave){
    await db.doc("lotes/"+l.id).update({donde:"nave"});
    await addMov({i:uid("m"),t:"T",f:hoy(),o:l.id,d:l.id,kg:0,fa:0,n:"Subida entera del almacén externo ("+hay+" fardos)"});
  }else{
    let dest=yaEnNave;
    let did=dest?dest.id:uid("l");
    if(!dest)await db.doc("lotes/"+did).set({nombre:l.nombre,material:l.material,nave:l.nave,donde:"nave",
      kgInv:0,fardosInv:0,albaran:l.albaran||"",proveedor:l.proveedor||"",entrada:l.entrada||hoy(),
      obs:"Parte de "+l.nombre+" subida del almacén externo"});
    await addMov({i:uid("m"),t:"T",f:hoy(),o:l.id,d:did,kg:n===hay?Math.round(b.kg):Math.round(n*(b.ratio||0)),fa:n,n:n===hay?"Subida del almacén externo (resto, "+n+" fardos)":"Subida del almacén externo"});
  }}
/* BP del Plan que llega en parte: se suben a nave los fardos que han llegado (de las coladas
   que digas, la más antigua primero) y en el calendario queda pendiente solo lo que falta. */
function bpEnParte(x,mes){
  const [nv,mt]=(x.k||"|").split("|"),S=saldos();
  const L=lotes.filter(l=>l.nave===nv&&l.material===mt&&l.donde==="externo"&&S[l.id]&&S[l.id].fa>0)
    .sort((a,b)=>(a.entrada||"").localeCompare(b.entrada||"")||a.nombre.localeCompare(b.nombre,"es"));
  if(!L.length){toast("No hay coladas de "+(nv||"esa nave")+" en el almacén externo");return;}
  const v={};const tot=()=>Object.values(v).reduce((a,n)=>a+(n>0?n:0),0);
  const err=el("div",{class:"banner b",hidden:""}),info=el("p",{class:"hint"});
  const pinfo=()=>{const t=tot();info.textContent=t?("Llegan "+fmt(t)+" de "+fmt(x.fa)+" fardos previstos"+(t<x.fa?". Quedan pendientes "+fmt(x.fa-t)+".":t>x.fa?" (más de lo previsto).":".")):"Escribe cuántos fardos han llegado de cada colada.";};
  const filas=L.map((l,i)=>el("div",{class:"rel-row",style:"grid-template-columns:1fr 84px"},[
    el("div",{},[el("b",{text:l.nombre}),el("div",{class:"sub",text:"hay "+fmt(S[l.id].fa)+" f en el externo"+(i===0?" · la más antigua":"")})]),
    el("input",{class:"num",type:"text",inputmode:"numeric",placeholder:"0","aria-label":"Fardos de "+l.nombre,oninput:e=>{const n=parseInt(e.target.value,10);v[l.id]=n>0?n:0;pinfo();}})]));
  pinfo();
  const cerrar=()=>ov.remove();
  const guardar=async e=>{const t=tot();const mal=L.filter(l=>v[l.id]>S[l.id].fa);
    if(!t){err.textContent="Pon los fardos que han llegado.";err.hidden=false;return;}
    if(mal.length){err.textContent=mal.map(l=>l.nombre+": solo hay "+fmt(S[l.id].fa)).join(" · ");err.hidden=false;return;}
    const b=e.currentTarget;b.disabled=true;
    try{for(const l of L)if(v[l.id]>0)await subirExterno(l,S[l.id],v[l.id]);
      const c=Object.assign({},cfg.plan||{}),p=Object.assign({camiones:[],consumo:{},entradas:[]},c[mes]||{});let hecho=false;const nuevas=[];
      (p.entradas||[]).forEach(y=>{if(!hecho&&!y.rec&&y.f===x.f&&(y.k||"")===(x.k||"")&&y.fa===x.fa&&y.o===x.o){hecho=true;
          nuevas.push(Object.assign({},y,{fa:t,rec:{f:hoy(),parte:true}}));
          if(t<x.fa)nuevas.push(Object.assign({},y,{fa:x.fa-t}));}else nuevas.push(y);});
      if(hecho){p.entradas=nuevas;c[mes]=p;cfg.plan=c;await saveCfg();}
      cerrar();toast(fmt(t)+" fardos subidos a "+nv+(t<x.fa?" · quedan "+fmt(x.fa-t)+" pendientes":""));render();
    }catch(er){b.disabled=false;err.textContent="No se pudo guardar. Revisa en Lotes qué se ha subido antes de repetir.";err.hidden=false;}};
  const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)cerrar();}},[el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"BP traído en parte"},[
    el("h3",{text:"BP traído en parte · "+etiqLinea(x.k)}),
    el("p",{class:"sub",text:"Previsto el "+dmy(x.f)+": "+fmt(x.fa)+" fardos. Pon lo que ha llegado de cada colada; se sube a "+nv+" y el resto sigue en el calendario."}),
    el("div",{},filas),info,err,
    el("div",{class:"dlg-b"},[el("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:cerrar}),el("button",{type:"button",class:"btn",text:"Subir a nave",onclick:guardar})])])]);
  document.body.appendChild(ov);setTimeout(()=>{const i=ov.querySelector("input");if(i)i.focus();},30);}
function pendientesPlan(){const out=[];Object.keys(cfg.plan||{}).forEach(m=>{((cfg.plan[m]||{}).entradas||[]).forEach(x=>{if(!x.rec&&x.o!=="B")out.push(Object.assign({mes:m},x));});});
  return out.sort((a,b)=>(a.f||"").localeCompare(b.f||""));}
async function marcarPlan(ref,rec){
  const c=Object.assign({},cfg.plan||{}),p=Object.assign({camiones:[],consumo:{},entradas:[]},c[ref.mes]||{});
  let hecho=false;p.entradas=(p.entradas||[]).map(x=>{if(!hecho&&!x.rec&&x.f===ref.f&&(x.k||"")===(ref.k||"")&&x.fa===ref.fa&&x.o===ref.o){hecho=true;return Object.assign({},x,{rec});}return x;});
  if(!hecho)return false;c[ref.mes]=p;cfg.plan=c;await saveCfg();return true;}
function llegaCamion(x){
  const [n,mt]=(x.k||"|").split("|"),P=(cfg.plan||{})[x.mes]||{};
  const provs=[...new Set((P.camiones||[]).filter(c=>!mt||c.m===mt).map(c=>c.p).filter(Boolean))];
  draft.ent={fecha:hoy(),nave:n||"",mat:mt||"",donde:"nave",fardos:String(x.fa||""),prov:provs.length===1?provs[0]:"",
    plan:{mes:x.mes,f:x.f,k:x.k||"",fa:x.fa,o:x.o}};
  tab="entrada";try{localStorage.setItem("colada.tab",tab);}catch(e){}tabsUI();render();document.querySelector("main").scrollTop=0;
}
/* Leer el albarán de la foto con IA (función leer-albaran de Supabase) y rellenar el formulario */
async function leerAlbaran(d){const b=$("e-leer");if(b){b.disabled=true;b.textContent="Leyendo el albarán…";}
  try{const bl=await comprimir(d.foto,1800);
    const b64=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result).split(",")[1]);fr.onerror=rej;fr.readAsDataURL(bl);});
    const r=await window.sbColada.functions.invoke("leer-albaran",{body:{image:b64,mime:bl.type||"image/jpeg",proveedores:cfg.proveedores||[],hoy:hoy()}});
    let err=r.error?(r.error.message||"error"):null;if(r.error&&r.error.context&&r.error.context.json){try{const j=await r.error.context.json();err=j.error||err;}catch(e){}}
    if(err)throw new Error(err);
    const x=(r.data&&r.data.datos)||{};
    const prov=(cfg.proveedores||[]).find(p=>nrm(p)===nrm(x.proveedor||""));if(prov)d.prov=prov;
    if(x.albaran)d.alb=String(x.albaran);
    if(x.fecha&&/^\d{4}-\d{2}-\d{2}$/.test(x.fecha))d.fecha=x.fecha;
    if(x.nave&&NAVES.indexOf(x.nave)>=0)d.nave=x.nave;
    if(x.aleacion)d.mat=/12/.test(x.aleacion)?"L-2521-B":"L-2630";
    d.donde=x.externo?"externo":"nave";
    if(x.kg>0)d.kg=String(x.kg).replace(".",",");
    if(x.fardos>0)d.fardos=String(x.fardos);
    const cols=[...new Set((x.coladas||[]).map(c=>String(c.colada||"").trim()).filter(Boolean))];
    if(cols.length)d.colada=cols.join("-");
    const obs=[];if(cols.length>1)obs.push((x.coladas||[]).map(c=>c.colada+(c.kg?" "+fmt(c.kg)+" kg":"")+(c.fardos?" / "+c.fardos+" f":"")).join(" · "));
    if(x.sap)obs.push("SAP "+x.sap);if(x.fecha_albaran&&x.fecha_albaran!==x.fecha)obs.push("Albarán del "+dmyA(x.fecha_albaran));
    if(obs.length)d.obs=obs.join(" · ");
    d.leido={confianza:x.confianza||"",notas:[!prov&&x.proveedor?"proveedor «"+x.proveedor+"» no está en la lista":"",!(x.fardos>0)?"no se ven los fardos, ponlos a mano":"",x.notas||""].filter(Boolean).join(" · ")};
    toast("Albarán leído: revisa los datos");render();
  }catch(e){toast("No se pudo leer: "+(e.message||e));if(b){b.disabled=false;b.textContent="Leer datos del albarán";}}}

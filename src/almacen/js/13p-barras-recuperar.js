/* ===== BARRAS ROTAS PARA RECUPERAR =====
   Una barra rota puede ir a chatarra o guardarse para recuperar. Se mandan al taller (Meyusa) cuando hace falta, no al momento,
   y vuelven convertidas en otro modelo (otra referencia de barra); si no se puede recuperar, va a chatarra.
   colección «brec», doc «lista», items {id,f,art,maq,cant,mov,env:{f,prov,alb}|null,vuelta:[{f,cant,art,eur,alb,mov}],chat:[{f,cant}],ts} */
let BREC=[];
const brecSum=(L,k)=>(L||[]).reduce((s,x)=>s+(+x[k]||0),0);
function brecPend(b){const v=brecSum(b.vuelta,"cant"),c=brecSum(b.chat,"cant"),q=+b.cant||0;return b.env?{guard:0,taller:Math.max(0,q-v-c)}:{guard:Math.max(0,q-c),taller:0};}
async function brecGuarda(fn){const ref=db.doc("brec/lista"),sn=await ref.get();const N=fn(((sn.exists&&sn.data().items)||[]).slice());await ref.set({items:N});BREC=N;}
const brecCambia=(id,fn)=>brecGuarda(L=>L.map(b=>b.id===id?fn(JSON.parse(JSON.stringify(b))):b));
const provMeyusa=()=>(cat.proveedores.find(p=>/meyusa/i.test(p.nom||""))||{}).id||"";
function formEnviarBrec(){const G=BREC.filter(b=>brecPend(b).guard>0);if(!G.length){toast("No hay barras guardadas");return;}const sel0={};G.forEach(b=>sel0[b.id]=true);const v={f:hoy(),prov:provMeyusa(),alb:""};
  dlg("Mandar barras a recuperar",[el("p",{class:"hint",style:"margin:0",text:"Marca las que se mandan."}),el("div",{class:"lst"},G.map(b=>{const a=art(b.art);return el("label",{class:"it",style:"cursor:pointer;gap:10px"},[el("input",{type:"checkbox",checked:true,style:"width:22px;height:22px;flex:none",onchange:e=>{sel0[b.id]=e.target.checked;}}),
      el("div",{class:"ppal"},[el("div",{class:"t1",text:(a?nomBT(a):"?")+" × "+brecPend(b).guard}),el("div",{class:"t2",text:"Rota el "+fmtF(b.f)+(b.maq?" en la "+maqN(b.maq):"")})])]);})),
    el("div",{class:"row"},[fld("Fecha",inp("brF",v.f,x=>v.f=x,{type:"date",max:hoy()})),fld("Taller",sel("brP",provOpts(),v.prov,x=>v.prov=x,"—")),fld("Nº albarán (opcional)",inp("brA","",x=>v.alb=x,{autocomplete:"off"}))])],
    [{t:"Cancelar",cls:"sec"},{t:"Mandar",fn:async()=>{const ids=G.filter(b=>sel0[b.id]).map(b=>b.id);if(!ids.length){toast("Marca alguna");return false;}
      try{await brecGuarda(L=>L.map(b=>{if(!ids.includes(b.id))return b;const c=brecSum(b.chat,"cant"),q=+b.cant||0;return Object.assign({},b,{cant:q,env:{f:v.f,prov:v.prov||null,alb:String(v.alb).trim()||null},chat:b.chat||[]});}));}catch(e){toast("No se pudo guardar");return false;}
      toast("Mandadas a recuperar");render(true);}}]);}
function formVueltaBrec(b){const a0=art(b.art),falta=brecPend(b).taller,B=artsBT("barra");const v={f:hoy(),art:"",n:String(falta),eur:"",alb:"",chat:"0",alm:(a0&&ppalDe(a0))||(cat.almacenes[0]||{}).id||""};
  dlg("Han vuelto del taller",[el("p",{class:"hint",style:"margin:0",text:(a0?nomBT(a0):"Barra")+": "+falta+" en el taller desde el "+fmtF(b.env.f)+". Vuelven convertidas en otro modelo; las que no se pueden recuperar van a chatarra."}),
    el("div",{class:"row"},[fld("Fecha",inp("bvF",v.f,x=>v.f=x,{type:"date",max:hoy()})),fld("Convertidas en",sel("bvA",B.map(x=>[x.id,nomBT(x)]),v.art,x=>v.art=x,"Elige el modelo…"))]),
    el("div",{class:"row"},[fld("Cuántas vuelven",inp("bvN",v.n,x=>v.n=x,{inputmode:"numeric",class:"num"})),fld("A chatarra (no se pudieron recuperar)",inp("bvC",v.chat,x=>v.chat=x,{inputmode:"numeric",class:"num"}))]),
    el("div",{class:"row"},[fld("Importe del albarán (€)",inp("bvE","",x=>v.eur=x,{inputmode:"decimal",class:"num",placeholder:"€ de la recuperación"})),fld("Nº albarán",inp("bvAl","",x=>v.alb=x,{autocomplete:"off"}))]),
    fld("Entran en el almacén",sel("bvAlm",almOpts(),v.alm,x=>v.alm=x))],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const n=parseInt(v.n,10)||0,ch=parseInt(v.chat,10)||0;if(n<0||ch<0||n+ch<1||n+ch>falta){toast("Entre las que vuelven y las de chatarra tienen que sumar como mucho "+falta);return false;}
      if(n&&!v.art){toast("Elige en qué modelo se han convertido");return false;}const e=String(v.eur).trim()===""?null:parseN(v.eur);if(e!=null&&!(e>=0)){toast("Importe no válido");return false;}
      try{let mid=null;if(n){const m={tipo:"entrada",f:v.f,art:v.art,alm:v.alm,cant:n,prov:b.env.prov||undefined,alb:String(v.alb).trim()||undefined,rec:true,nota:"Recuperada de "+(a0?nomBT(a0):"barra rota")+" (rota el "+fmtF(b.f)+")",brec:b.id};await addMovs([m]);mid=m.id;}
        await brecCambia(b.id,x=>{if(n)x.vuelta=(x.vuelta||[]).concat([{f:v.f,cant:n,art:v.art,eur:e,alb:String(v.alb).trim()||null,mov:mid}]);if(ch)x.chat=(x.chat||[]).concat([{f:v.f,cant:ch}]);return x;});}catch(er){toast("No se pudo guardar");return false;}
      toast((n?n+" vuelven al almacén":"")+(n&&ch?" · ":"")+(ch?ch+" a chatarra":""));render(true);}}]);}
async function brecChatarra(b){const g=brecPend(b).guard;if(!g)return;try{await brecCambia(b.id,x=>{x.chat=(x.chat||[]).concat([{f:hoy(),cant:g}]);return x;});}catch(e){toast("No se pudo guardar");return;}toast("A chatarra");render(true);}
function cardBrec(){const G=BREC.filter(b=>brecPend(b).guard>0),T=BREC.filter(b=>brecPend(b).taller>0),y=hoy().slice(0,4);if(!BREC.length)return null;
  const nG=G.reduce((s,b)=>s+brecPend(b).guard,0),nT=T.reduce((s,b)=>s+brecPend(b).taller,0);let eu=0,nv=0,ahorro=0;
  BREC.forEach(b=>(b.vuelta||[]).forEach(v=>{if(v.f.slice(0,4)!==y)return;nv+=+v.cant||0;eu+=+v.eur||0;const a1=art(v.art);if(a1&&precioDe(a1))ahorro+=(+v.cant||0)*precioDe(a1)-(+v.eur||0);}));
  const falta=artsBT("barra").some(a=>{const n=nivel(a);return n==="bad"||n==="warn";});
  const fila=(b,txt,btns,cls)=>{const a=art(b.art);return el("div",{class:"it",style:"cursor:default;flex-wrap:wrap"},[el("span",{class:"stripe "+cls}),el("div",{class:"ppal"},[el("div",{class:"t1",text:(a?nomBT(a):"?")}),el("div",{class:"t2",text:txt})]),el("div",{style:"display:flex;gap:6px"},btns)]);};
  return el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Barras rotas para recuperar"}),el("span",{class:"der sub",text:nG+" guardadas · "+nT+" en el taller"})]),
    el("div",{class:"bd",style:"display:grid;gap:10px"},[el("dl",{class:"kpis num"},[["Guardadas",String(nG)],["En el taller",String(nT)],["Recuperadas este año",String(nv)],["Gasto en recuperar",eur(eu)]].concat(ahorro>0?[["Ahorro frente a nuevas",eur(ahorro)]]:[]).map(([p,q])=>el("div",{},[el("dt",{text:p}),el("dd",{text:q})]))),
      falta&&nG?el("div",{class:"banner w",style:"margin:0",text:"Faltan barras y hay "+nG+" guardadas: puede ser el momento de mandarlas a recuperar."}):null,
      G.length?el("div",{class:"lst"},G.map(b=>fila(b,"× "+brecPend(b).guard+" · rota el "+fmtF(b.f)+(b.maq?" en la "+maqN(b.maq):""),[el("button",{type:"button",class:"btn sec peq",text:"Chatarra",onclick:()=>brecChatarra(b)})],"warn"))):null,
      T.length?el("div",{class:"lst"},T.map(b=>fila(b,"× "+brecPend(b).taller+" en "+(provN(b.env.prov)||"el taller")+" desde el "+fmtF(b.env.f)+" ("+dias(b.env.f,hoy())+" días)",[el("button",{type:"button",class:"btn sec peq",text:"Han vuelto",onclick:()=>formVueltaBrec(b)})],""))):null,
      G.length?el("div",{class:"acciones"},[el("button",{type:"button",class:"btn",text:"Mandar a recuperar",onclick:formEnviarBrec})]):null])]);}

/* ===== ACEITES, TALADRINAS Y JABONES (con desmoldeantes y Pistonwax): todo junto =====
   Se gastan en kg y vienen en envases (bidón, GRG…). Por grupo: lo que queda, lo que se ha gastado
   en 30 días, para cuántos días hay y los últimos consumos con dónde y quién. */
const GRUPOS_Q=["aceite","taladrina","jabon","desmold"];
function vQuim(v){const hy=hoy(),d30=sumaDias(hy,-30);
  const A=artsActivos().filter(a=>GRUPOS_Q.includes(grupoDe(a)));
  const C=cConsumos().filter(c=>GRUPOS_Q.includes(c.g));const C30=C.filter(c=>c.f>=d30);
  const g30={};C30.forEach(c=>{g30[c.artId]=(g30[c.artId]||0)+c.cant;});
  const bajos=A.filter(a=>!a.pedido&&nivel(a)==="bad"),pedidos=A.filter(a=>a.pedido);
  v.appendChild(cardContadores());v.appendChild(cardPrevAceites());
  v.appendChild(el("dl",{class:"kpis num"},[["Productos",String(A.length)],["Gastado en 30 días",fmtN(Math.round(C30.reduce((s,c)=>s+c.cant,0)))+" kg"],["Bajo mínimo",String(bajos.length)],["Pedidos",String(pedidos.length)]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))));
  if(bajos.length)v.appendChild(el("div",{class:"banner w",text:"Bajo mínimo: "+bajos.map(a=>a.desc).join(", ")+"."}));
  v.appendChild(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn",text:"Apuntar consumo",onclick:()=>irA("rap")}),
    el("button",{type:"button",class:"btn sec",text:"Entrada",onclick:()=>{Object.assign(draft.m,{tipo:"entrada",art:A[0]?A[0].id:"",cant:""});irA("mov");}})]));
  GRUPOS_Q.forEach(g=>{const L=A.filter(a=>grupoDe(a)===g).sort((a,b)=>a.desc.localeCompare(b.desc,"es",{numeric:true}));if(!L.length)return;
    v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:GRUPO_N[g]}),el("span",{class:"der sub",text:L.length+" producto"+(L.length>1?"s":"")})]),
      el("div",{class:"lst"},L.map(a=>{const q=stockDe(a.id),n=a.pedido?"ped":nivel(a),e=cEnv(a,q),dq=diasQuedan(a);
        return el("button",{type:"button",class:"it",onclick:()=>ficha(a)},[el("span",{class:"stripe "+(n==="bad"?"bad":n==="warn"?"warn":n==="ok"?"ok":"")}),
          el("div",{class:"ppal"},[el("div",{class:"t1",text:a.desc}),el("div",{class:"t2",text:[e?"≈ "+fmtN(Math.round(e.n*10)/10)+" "+e.t+(Math.round(e.n*10)/10===1?"":"s"):null,"30 días: "+fmtN(Math.round(g30[a.id]||0))+" "+(a.ud||"kg"),dq!=null?"para "+diasTxt(dq):null,a.pedido?"pedido el "+fmtF(a.pedido):C_EST[n][0]].filter(Boolean).join(" · ")})]),
          el("div",{class:"cant num"},[el("b",{text:fmtN(Math.round(q))}),el("small",{text:a.ud||"kg"})])]);}))]));});
  const ult=C.slice().sort((a,b)=>b.f.localeCompare(a.f)).slice(0,15);
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Últimos consumos"})),
    ult.length?el("div",{class:"lst"},ult.map(c=>el("button",{type:"button",class:"it",onclick:()=>{const a=art(c.artId);if(a)ficha(a);}},[el("div",{class:"ppal"},[el("div",{class:"t1",text:c.prod}),
      el("div",{class:"t2",text:[fmtF(c.f),c.donde,c.motivo!=="Sin indicar"?c.motivo:null,c.quien].filter(Boolean).join(" · ")})]),el("div",{class:"cant num"},[el("b",{text:fmtN(c.cant)}),el("small",{text:c.ud})])]))):el("p",{class:"hint",style:"padding:10px 14px",text:"Todavía no hay consumos apuntados."})]));}

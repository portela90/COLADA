/* ===== AVERÍAS (como la orden de avería de SAP PM) =====
   Una avería es una máquina + qué se ha roto + por qué (causa) + lo que se ha cambiado por ella (pistones, barras, ejes, consumibles).
   colección «aver», doc «lista», items {id,n,maq,f,t,causa,evit,resp,nota,estado:"abierta"|"cerrada",fc,links:[{k:"p"|"m"|"r"|"q",id,f}],por,ts}
   k: p = cambio de pistón, m = salida de material, r = reparación de eje, q = eje en cuarentena (cuando se le pone número, la reparación lleva pend=id) */
let AVER=[];
const CAUSAS_AV=[["Refrigeración mal puesta o sin agua",true],["Trabajando sin pistonwax",true],["Mal montaje o mal ajuste",true],["Desgaste normal",false],["Fallo de la reparación anterior",null],["Molde o pieza",null],["Otra",null]];
const esOtraCausa=c=>!!c&&!CAUSAS_AV.some(x=>x[0]===c&&c!=="Otra");
const evitDe=c=>{const x=CAUSAS_AV.find(z=>z[0]===c);return x?x[1]:null;};
const avMaq=a=>cat.maquinas.find(m=>m.id===a.maq||m.cod===a.maq)||null;
const avNom=a=>(avMaq(a)||{cod:a.maq||"?"}).cod+" · "+a.t;
async function avGuarda(fn){const ref=db.doc("aver/lista"),sn=await ref.get();const L=(sn.exists&&sn.data().items)||[];const N=fn(L.slice());await ref.set({items:N});AVER=N;}
const avCambia=(id,fn)=>avGuarda(L=>L.map(a=>a.id===id?fn(Object.assign({},a)):a));
/* lo que cuelga de cada avería, con su coste */
function avLinks(a){const E=evInv(),out=[];(a.links||[]).forEach(l=>{
    if(l.k==="q"){const rs=E.filter(e=>e.k==="r"&&e.r.pend===l.id);if(rs.length)rs.forEach(e=>out.push(e));else{const p=ejePend().find(x=>x.id===l.id);out.push(ejeEstim(p,l));}return;}
    const e=E.find(x=>x.k===l.k&&x.r.id===l.id);if(e)out.push(e);
    if(l.k==="m"&&typeof BREC!=="undefined")BREC.filter(b=>b.mov===l.id).forEach(b=>{const a0=art(b.art),nm=a0?nomBT(a0):"barra";(b.vuelta||[]).forEach(v=>{const a1=art(v.art);out.push({k:"b",f:v.f,ref:"Recuperada "+nm+" → "+(a1?nomBT(a1):"?")+" × "+v.cant+(+v.eur>0?" por "+eur(+v.eur):"")+" (vuelve al stock)",cant:v.cant,ud:"ud",eur:0,info:true,mot:"",quien:""});});
      const pd=brecPend(b);if(pd.guard)out.push({k:"b",f:b.f,ref:nm+" × "+pd.guard+" guardada para recuperar",cant:pd.guard,ud:"ud",eur:0,mot:"",quien:""});if(pd.taller)out.push({k:"b",f:b.env.f,ref:nm+" × "+pd.taller+" en "+(provN(b.env.prov)||"el taller")+" recuperándose",cant:pd.taller,ud:"ud",eur:0,mot:"",quien:""});});
    if(l.k==="p"){const R=E.filter(x=>x.k==="r"&&x.r.pendPist===l.id);R.forEach(x=>out.push(x));if(!R.length){const p=ejePend().find(x=>x.pist===l.id);if(p)out.push(ejeEstim(p,{f:p.f}));}}});
  out.forEach(e=>{if(e.k==="r"&&!(e.eur>0)){const c=costeRep(e.r).v;if(c){e.eur=c;e.aprox=!(+e.r.imp>0);}else e.sinP=true;}});
  const vis=new Set();return out.filter(e=>{const k=e.k+":"+(e.r?e.r.id:e.ref+e.f);if(vis.has(k))return false;vis.add(k);return true;});}
/* eje roto que aún no tiene reparación apuntada: se cuenta ya al precio de reparación de su modelo */
function ejeEstim(p,l){const mods=(p&&p.mods)||(l&&l.mods)||[];const pr=mods.map(c=>precioMod(c)).find(x=>x>0)||0;const mo=mods[0]?modelo(mods[0]):null;
  return{k:"q",f:(l&&l.f)||(p&&p.f),ref:"Eje "+(mo?mo.ref+" ":"")+"roto (en cuarentena, sin número todavía)",cant:1,ud:"eje",eur:pr,aprox:pr>0,sinP:!pr,mot:p?cap(p.motivo||""):"",quien:""};}
const avCoste=a=>avLinks(a).reduce((s,e)=>s+(e.eur||0),0);
const avLinkSet=()=>{const S={};AVER.forEach(a=>(a.links||[]).forEach(l=>{S[l.k+":"+l.id]=a;}));return S;};
/* ¿es por una avería? (al apuntar una rotura) */
function preguntaAveria(maqId,link0,que,causa0){if(window.SOLO_CONSULTA||!db||!maqId)return;const LK=[].concat(link0).filter(Boolean),link=LK[0];if(!link)return;const m=cat.maquinas.find(x=>x.id===maqId||x.cod===maqId);if(!m)return;
  const ab=AVER.filter(a=>a.estado==="abierta"&&(a.maq===m.id||a.maq===m.cod));
  const nueva=async()=>{const n=AVER.reduce((s,a)=>Math.max(s,+a.n||0),0)+1;const a={id:uid(),n,maq:m.id,f:link.f||hoy(),t:que,causa:causa0||"",evit:causa0?evitDe(causa0):null,resp:null,nota:null,estado:"abierta",links:LK,por:(window.yoNombre&&window.yoNombre())||"",ts:Date.now()};
    try{await avGuarda(L=>L.concat([a]));}catch(e){toast("No se pudo guardar");return false;}toast("Avería abierta: "+m.cod+" · "+que);render(true);setTimeout(()=>fichaAveria(a),0);};
  const anade=async a=>{try{await avCambia(a.id,x=>{x.links=(x.links||[]).concat(LK);return x;});}catch(e){toast("No se pudo guardar");return false;}toast("Añadido a la avería "+avNom(a));render(true);};
  dlg("¿Es por una avería?",[el("p",{class:"hint",style:"margin:0",text:m.cod+": "+que+". Si es una avería, todo lo que se cambie por ella suma a su coste y luego se puede poner la causa (por ejemplo, sin refrigeración o sin pistonwax)."}),
    ab.length?el("div",{class:"lst"},ab.map(a=>el("button",{type:"button",class:"it",onclick:()=>{cierraDlgs();anade(a);}},[el("span",{class:"stripe warn"}),el("div",{class:"ppal"},[el("div",{class:"t1",text:"Añadir a: "+avNom(a)}),el("div",{class:"t2",text:"Abierta el "+fmtF(a.f)+(a.causa?" · "+a.causa:"")})])]))):null],
    [{t:"No, es desgaste normal",cls:"sec"},{t:"Abrir avería nueva",fn:nueva}]);}
/* la ficha de una avería */
function fichaAveria(a0){const a=Object.assign({},AVER.find(x=>x.id===a0.id)||a0);const m=avMaq(a),L=avLinks(a),tot=L.reduce((s,e)=>s+(e.eur||0),0),h=hoy();
  const v={t:a.t||"",causa:a.causa||"",evit:a.evit,resp:a.resp||"",nota:a.nota||""};const box=el("div",{style:"display:grid;gap:10px;max-height:64vh;overflow:auto"});
  const guarda=async extra=>{const pt=Object.assign({t:String(v.t).trim()||a.t,causa:v.causa,evit:v.evit,resp:String(v.resp).trim()||null,nota:String(v.nota).trim()||null},extra||{});
    try{await avCambia(a.id,x=>Object.assign(x,pt));}catch(e){toast("No se pudo guardar");return false;}toast(extra&&extra.estado==="cerrada"?"Avería cerrada":extra&&extra.estado==="abierta"?"Avería abierta de nuevo":"Guardado");render(true);};
  const pinta=()=>{box.textContent="";
    box.appendChild(el("dl",{class:"bd-kv"},[].concat(...[["Máquina",m?m.cod+" ("+zonaDe(m)+")":a.maq],["Abierta",fmtF(a.f)+(a.estado==="abierta"?" · "+hace(dias(a.f,h)):"")],a.fc?["Cerrada",fmtF(a.fc)+" · duró "+(dias(a.f,a.fc)+1)+" días"]:null,["Coste",eur(tot)+(L.some(e=>e.aprox)?" (los ejes, al precio de reparación de su modelo hasta que llegue el albarán)":"")+(L.some(e=>e.sinP)?" · falta precio de algo: ponlo en la ficha del artículo o del modelo":"")],a.por?["Abierta por",a.por]:null]
      .filter(Boolean).map(([k,x])=>[el("dt",{text:k}),el("dd",{text:x})]))));
    box.appendChild(fld("Qué se ha roto",inp("avT",v.t,x=>v.t=x,{autocomplete:"off"})));
    box.appendChild(el("div",{},[el("div",{class:"sub",style:"margin-bottom:6px",text:"Causa: ¿por qué se ha roto?"}),el("div",{class:"chips"},[["","Sin saber todavía"]].concat(CAUSAS_AV.map(c=>[c[0],c[0]])).map(([k,t])=>{const otra=k==="Otra",on=otra?esOtraCausa(v.causa):v.causa===k;return el("button",{type:"button",class:"chip","aria-pressed":String(on),text:t,onclick:()=>{v.causa=otra?(esOtraCausa(v.causa)?v.causa:"Otra"):k;if(k&&!otra)v.evit=evitDe(k);pinta();if(otra)setTimeout(()=>{const i=$("avOtra");if(i)i.focus();},0);}});}))].concat(esOtraCausa(v.causa)?[fld("Escribe la causa",inp("avOtra",v.causa==="Otra"?"":v.causa,x=>{v.causa=String(x).trim()||"Otra";},{autocomplete:"off",placeholder:"Por ejemplo: golpe con la pinza, material sucio…"}))]:[])));
    if(v.causa)box.appendChild(el("div",{style:"display:grid;gap:6px;justify-items:start"},[el("span",{class:"sub",text:"¿Se podía haber evitado?"}),el("div",{class:"seg",role:"group","aria-label":"Evitable"},[[true,"Sí"],[false,"No"],[null,"No sé"]].map(([k,t])=>el("button",{type:"button","aria-pressed":String(v.evit===k),text:t,onclick:()=>{v.evit=k;pinta();}})))]));
    box.appendChild(el("div",{class:"row"},[fld("Turno o responsable (opcional)",inp("avR",v.resp,x=>v.resp=x,{autocomplete:"off",list:"lOperAv"})),el("datalist",{id:"lOperAv"},responsables().map(r=>el("option",{value:r}))),fld("Nota",inp("avN",v.nota,x=>v.nota=x,{autocomplete:"off"}))]));
    box.appendChild(el("div",{style:"display:grid;gap:4px"},[el("div",{class:"sub",style:"font-weight:600",text:"Lo que se ha cambiado por esta avería"}),
      L.length?el("div",{class:"lst"},L.map(e=>el("div",{class:"it",style:"cursor:default"},[el("span",{class:"stripe "+(e.sinP?"warn":"ok")}),el("div",{class:"ppal"},[el("div",{class:"t1",text:e.ref}),el("div",{class:"t2",text:[fmtF(e.f),e.mot?cap(e.mot):null,e.quien||null,e.k==="r"?(e.r.res==="ok"&&e.r.rec?"volvió el "+fmtF(e.r.rec):"en el taller"):null].filter(Boolean).join(" · ")})]),el("div",{class:"num",style:"font-weight:600;white-space:nowrap",text:e.info?"":e.eur?eur(e.eur)+(e.aprox?" (precio de reparación)":""):"—"})]))):el("p",{class:"hint",style:"margin:0",text:"Nada todavía."}),
      el("button",{type:"button",class:"btn sec peq",style:"justify-self:start",text:"Añadir un cambio de la "+(m?m.cod:"máquina"),onclick:()=>{cierraDlgs();elegirParaAveria(a);}})]));
    const rep=AVER.filter(x=>x.id!==a.id&&x.maq===a.maq&&Math.abs(dias(x.f,a.f))<=60&&nq(x.t)===nq(a.t));if(rep.length)box.appendChild(el("div",{class:"banner w",style:"margin:0",text:"Se repite: la "+(m?m.cod:"máquina")+" tuvo «"+a.t+"» también el "+rep.map(x=>fmtF(x.f)).join(", ")+"."}));};
  pinta();
  const F={t:(m?m.cod:"")+" · avería",maq:m?m.id:null,d0:sumaDias(a.f,-60),d1:a.fc||h,per:"desde 2 meses antes de la avería"};
  dlg("Avería "+(a.n?"Nº "+a.n+" · ":"")+avNom(a),[box],[{t:"Cancelar",cls:"sec"},{t:"Investigar",cls:"sec",fn:()=>{setTimeout(()=>investigar(F),0);}},
    {t:"Apuntar acción",cls:"sec",fn:async()=>{await guarda();setTimeout(()=>formConclusion(F,datosInv(F),{sug:(v.causa||"Avería")+" · "+v.t}),0);}},
    a.estado==="abierta"?{t:"Cerrar avería",cls:"sec",fn:()=>{if(!v.causa&&!a._ok){a._ok=true;toast("No tiene causa. Si quieres cerrarla igual, pulsa otra vez «Cerrar avería» (la causa se puede poner después).");return false;}return guarda({estado:"cerrada",fc:h});}}:{t:"Abrir de nuevo",cls:"sec",fn:()=>guarda({estado:"abierta",fc:null})},
    {t:"Guardar",fn:()=>guarda()}]);}
/* añadir a mano un cambio de esa máquina (últimos 60 días, que no esté ya en otra avería) */
function elegirParaAveria(a){const m=avMaq(a),S=avLinkSet(),h=hoy(),d0=sumaDias(a.f,-15);
  const L=evInv().filter(e=>e.r&&e.r.id&&maqInv(e)&&m&&maqInv(e).id===m.id&&e.f>=d0&&e.f<=h&&!S[e.k+":"+e.r.id]).sort((x,y)=>y.f.localeCompare(x.f)).slice(0,40);
  dlg("Añadir a la avería",[el("p",{class:"hint",style:"margin:0",text:"Cambios de la "+(m?m.cod:"máquina")+" desde el "+fmtF(d0)+" que no están en ninguna avería."}),
    L.length?el("div",{class:"lst"},L.map(e=>el("button",{type:"button",class:"it",onclick:async()=>{cierraDlgs();try{await avCambia(a.id,x=>{x.links=(x.links||[]).concat([{k:e.k,id:e.r.id,f:e.f}]);return x;});}catch(er){toast("No se pudo guardar");return;}toast("Añadido");render(true);fichaAveria(a);}},
      [el("span",{class:"stripe ok"}),el("div",{class:"ppal"},[el("div",{class:"t1",text:fmtF(e.f)+" · "+e.ref}),el("div",{class:"t2",text:[e.mot?cap(e.mot):null,e.quien||null].filter(Boolean).join(" · ")})]),el("div",{class:"num",text:fmtN(e.cant)})]))):el("p",{class:"hint",text:"No hay cambios sueltos en esas fechas."})],
    [{t:"Volver",cls:"sec",fn:()=>{setTimeout(()=>fichaAveria(a),0);}}]);}
function nuevaAveriaMano(maqId){const v={maq:maqId||"",t:""};dlg("Abrir avería",[fld("Inyectora",sel("avM",maqOpts(),v.maq,x=>v.maq=x,"Elige…")),fld("Qué se ha roto",inp("avQ","",x=>v.t=x,{autocomplete:"off",placeholder:"Eje roto, barras rotas, fuga…"})),
    el("div",{class:"chips"},["Eje roto","Barras rotas","Pistón agarrotado","Fuga de agua","Postizo roto"].map(c=>el("button",{type:"button",class:"chip",text:c,onclick:()=>{v.t=c;const i=$("avQ");if(i)i.value=c;}})))],
  [{t:"Cancelar",cls:"sec"},{t:"Abrir",fn:async()=>{if(!v.maq){toast("Elige la inyectora");return false;}if(!String(v.t).trim()){toast("Escribe qué se ha roto");return false;}const n=AVER.reduce((s,a)=>Math.max(s,+a.n||0),0)+1;
    const a={id:uid(),n,maq:v.maq,f:hoy(),t:String(v.t).trim(),causa:"",evit:null,resp:null,nota:null,estado:"abierta",links:[],por:(window.yoNombre&&window.yoNombre())||"",ts:Date.now()};
    try{await avGuarda(L=>L.concat([a]));}catch(e){toast("No se pudo guardar");return false;}render(true);setTimeout(()=>fichaAveria(a),0);}}]);}
/* números */
function datosAverias(d0,d1){const L=AVER.filter(a=>a.f>=d0&&a.f<=d1).map(a=>({a,eur:avCoste(a)}));const G=(f)=>{const o={};L.forEach(x=>{const k=f(x.a);const g=o[k]=o[k]||{k,n:0,eur:0};g.n++;g.eur+=x.eur;});return Object.values(o).sort((p,q)=>q.eur-p.eur||q.n-p.n);};
  return{L,tot:L.reduce((s,x)=>s+x.eur,0),evit:L.filter(x=>x.a.evit===true).reduce((s,x)=>s+x.eur,0),nEvit:L.filter(x=>x.a.evit===true).length,causa:G(a=>a.causa||"Sin saber todavía"),maq:G(a=>(avMaq(a)||{cod:a.maq}).cod),que:G(a=>cap(a.t)),sinC:L.filter(x=>!x.a.causa).length};}
const avSinCausa=()=>AVER.filter(a=>!a.causa&&dias(a.f,hoy())>=1);
function vAver(v){const h=hoy(),k=draft.avP||"ano",y=h.slice(0,4),P={mes:[h.slice(0,7)+"-01",h,"este mes"],ano:[y+"-01-01",h,"este año"],"12m":[sumaDias(h,-364),h,"12 meses"]}[k],D=datosAverias(P[0],P[1]);
  const ab=AVER.filter(a=>a.estado==="abierta").sort((p,q)=>p.f.localeCompare(q.f));
  v.appendChild(el("dl",{class:"kpis num"},[["Abiertas",String(ab.length)],["Averías "+P[2],String(D.L.length)],["Coste "+P[2],eur(D.tot)],["Evitables",eur(D.evit)+(D.nEvit?" ("+D.nEvit+")":"")]].map(([x,z])=>el("div",{},[el("dt",{text:x}),el("dd",{text:z})]))));
  v.appendChild(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn",text:"Abrir avería",onclick:()=>nuevaAveriaMano()}),el("div",{class:"seg",role:"group","aria-label":"Periodo"},[["mes","Este mes"],["ano","Este año"],["12m","12 meses"]].map(([kk,t])=>el("button",{type:"button","aria-pressed":String(k===kk),text:t,onclick:()=>{draft.avP=kk;render(true);}})))]));
  if(D.sinC)v.appendChild(el("div",{class:"banner w",text:D.sinC+(D.sinC===1?" avería no tiene":" averías no tienen")+" causa. Ábrelas y pon por qué se rompió: es lo que permite saber cuánto cuestan las evitables."}));
  const fila=a=>{const c=avCoste(a);return el("button",{type:"button",class:"it",onclick:()=>fichaAveria(a)},[el("span",{class:"stripe "+(a.estado==="abierta"?"warn":a.evit?"bad":"ok")}),el("div",{class:"ppal"},[el("div",{class:"t1",text:avNom(a)}),el("div",{class:"t2",text:[fmtF(a.f)+(a.estado==="abierta"?" · abierta, "+(dias(a.f,h)===1?"1 día":dias(a.f,h)+" días"):" · cerrada"),a.causa||"sin causa",a.evit===true?"evitable":null].filter(Boolean).join(" · ")})]),el("div",{class:"num",style:"font-weight:600",text:eur(c)})]);};
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Abiertas"})),ab.length?el("div",{class:"lst"},ab.map(fila)):el("p",{class:"hint",style:"padding:10px 14px",text:"No hay ninguna avería abierta."})]));
  if(D.L.length){const tab=(tit,G)=>el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:tit})),cTabla(["","Averías","Coste"],G.map(g=>[g.k,fmtN(g.n),eur(g.eur)]),[1,2])]);
    v.appendChild(tab("Por causa ("+P[2]+")",D.causa));v.appendChild(tab("Por máquina ("+P[2]+")",D.maq));v.appendChild(tab("Qué se rompe ("+P[2]+")",D.que));
    v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Todas ("+P[2]+")"})),el("div",{class:"lst"},D.L.map(x=>x.a).sort((p,q)=>q.f.localeCompare(p.f)).map(fila))]));}
  else v.appendChild(el("p",{class:"hint",text:"Sin averías "+P[2]+". Se abren solas al apuntar una rotura (eje, barra o pistón roto o agarrotado) si dices que es por una avería, o con «Abrir avería»."}));}

/* ===== CAMBIOS DE HORNO QUE MANDA LIMPIEZA =====
   Llegan solos al cerrar la orden en Limpieza (id «hor_<orden>_…», nota «Horno H-F55: …», con motivo y quién).
   Los de rotura, atasco, fallo, fuga u otro (o sin motivo) se revisan aquí: ¿es por una avería? Se marcan rev:true. */
const LIMP_REV_DESDE="2026-10-01",MOT_REV=/^(ROTURA|ATASCO|FALLO|FUGA|OTRO|DOBLADA)$/;
function limpPorRevisar(){const S=avLinkSet(),G={};
  todosMov().forEach(m=>{if(m.tipo!=="salida"||!/^hor_/.test(m.id||"")||!m.maq||m.rev||m.f<LIMP_REV_DESDE||S["m:"+m.id])return;if(m.motivo&&!MOT_REV.test(m.motivo))return;
    const k=String(m.id).replace(/_(c\d+_)?\d+$/,"");const g=G[k]=G[k]||{k,maq:maqN(m.maq)||m.maq,maqId:m.maq,f:m.f,L:[],mot:m.motivo||"",orig:m.motOrig||"",quien:m.resp||""};g.L.push(m);});
  return Object.values(G).map(g=>{const a=art(g.L[0].art);g.que=a?queAveria(a,g.mot||"ROTURA"):"Pieza de horno";return g;}).sort((a,b)=>a.f.localeCompare(b.f));}
async function marcaRevLimp(g){for(const m of g.L)try{await patchMov(m,{rev:true});m.rev=true;}catch(e){}}
function revisarLimpieza(){const G=limpPorRevisar();if(!G.length){toast("No hay nada por revisar");return;}
  dlg("Cambios de horno de Limpieza",[el("p",{class:"hint",style:"margin:0",text:"Los ha cambiado el equipo de Limpieza. Decide si cada uno es por una avería (suma su coste y luego se pone la causa) o no."}),
    el("div",{class:"lst"},G.map(g=>el("div",{class:"it",style:"cursor:default;flex-wrap:wrap"},[el("span",{class:"stripe warn"}),
      el("div",{class:"ppal"},[el("div",{class:"t1",text:g.maq+" · "+g.L.map(m=>{const a=art(m.art);return(a?(TEC(a.fam)?nomBT(a):a.desc):"?")+" × "+fmtN(+m.cant||0);}).join(", ")}),
        el("div",{class:"t2",text:[fmtF(g.f),g.orig||(g.mot?cap(g.mot):"sin motivo"),g.quien||null].filter(Boolean).join(" · ")})]),
      el("div",{style:"display:flex;gap:6px"},[el("button",{type:"button",class:"btn sec peq",text:"No es avería",onclick:async()=>{await marcaRevLimp(g);toast("Revisado");cierraDlgs();render(true);if(limpPorRevisar().length)setTimeout(revisarLimpieza,200);}}),
        el("button",{type:"button",class:"btn peq",text:"Es avería",onclick:async()=>{await marcaRevLimp(g);cierraDlgs();render(true);preguntaAveria(g.maqId,g.L.map(m=>({k:"m",id:m.id,f:m.f})),g.que,g.mot==="ATASCO"||g.mot==="FALLO"?"":"");}})])])))],
    [{t:"Cerrar",cls:"sec"}]);}

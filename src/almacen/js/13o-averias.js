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
async function avGuarda(fn){AVER=await listaGuarda("aver/lista",fn);}
const avCambia=(id,fn)=>avGuarda(L=>L.map(a=>a.id===id?fn(Object.assign({},a)):a));
/* lo que cuelga de cada avería, con su coste */
function avLinks(a){const E=evInv(),out=[];(a.links||[]).forEach(l=>{
    if(l.k==="q"){const rs=E.filter(e=>e.k==="r"&&e.r.pend===l.id);if(rs.length)rs.forEach(e=>out.push(e));else{const x=ejeSinTaller({pend:l.id});if(x)out.push(x);else{const p=ejePend().find(z=>z.id===l.id);out.push(ejeEstim(p,l));}}return;}
    const e=E.find(x=>x.k===l.k&&x.r.id===l.id);if(e)out.push(e);
    if(l.k==="m"&&typeof BREC!=="undefined")BREC.filter(b=>b.mov===l.id).forEach(b=>{const a0=art(b.art),nm=a0?nomBT(a0):"barra";(b.vuelta||[]).forEach(v=>{const a1=art(v.art);out.push({k:"b",f:v.f,ref:"Recuperada "+nm+" → "+(a1?nomBT(a1):"?")+" × "+v.cant+(+v.eur>0?" por "+eur(+v.eur):"")+" (vuelve al stock)",cant:v.cant,ud:"ud",eur:0,info:true,mot:"",quien:""});});
      const pd=brecPend(b);if(pd.guard)out.push({k:"b",f:b.f,ref:nm+" × "+pd.guard+" guardada para recuperar",cant:pd.guard,ud:"ud",eur:0,mot:"",quien:""});if(pd.taller)out.push({k:"b",f:b.env.f,ref:nm+" × "+pd.taller+" en "+(provN(b.env.prov)||"el taller")+" recuperándose",cant:pd.taller,ud:"ud",eur:0,mot:"",quien:""});});
    if(l.k==="p"){const R=E.filter(x=>x.k==="r"&&x.r.pendPist===l.id);R.forEach(x=>out.push(x));if(!R.length){const x=ejeSinTaller({pist:l.id});if(x)out.push(x);else{const p=ejePend().find(z=>z.pist===l.id);if(p)out.push(ejeEstim(p,{f:p.f}));}}}});
  out.forEach(e=>{if(e.k==="r"&&!(e.eur>0)){const c=costeRep(e.r).v;if(c){e.eur=c;e.aprox=!(+e.r.imp>0);}else e.sinP=true;}});
  const vis=new Set();return out.filter(e=>{const k=e.k+":"+(e.r?e.r.id:e.ref+e.f);if(vis.has(k))return false;vis.add(k);return true;});}
/* eje que al final no fue al taller: recuperado en planta, «no hay que repararlo» o reparación anulada → no cuesta reparación */
function ejeSinTaller(q){const k=q.pend?"pend":"pist",id=q.pend||q.pist;
  const rc=(cat.ejeRecup||[]).find(x=>x[k]===id);if(rc){const pr=(rc.mods||[]).map(c=>precioMod(c)).find(x=>x>0)||0;return{k:"q",f:rc.f,ref:"Eje recuperado en planta el "+fmtF(rc.f)+" (no fue al taller"+(pr?"; se ahorró unos "+eur(pr):"")+")",cant:1,ud:"eje",eur:0,info:true,mot:"",quien:""};}
  const sr=(cat.ejeSinRep||[]).find(x=>x[k==="pend"?"id":"pist"]===id);if(sr)return{k:"q",f:sr.f,ref:"Eje: no hubo que repararlo",cant:1,ud:"eje",eur:0,info:true,mot:"",quien:""};
  const an=todasRep().find(r=>r.res==="anulada"&&(k==="pend"?r.pend===id:r.pendPist===id));if(an)return{k:"q",f:an.rec||an.alta,ref:"Eje "+an.eje+": volvió a planta sin ir al taller",cant:1,ud:"eje",eur:0,info:true,mot:"",quien:""};
  return null;}
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
    {const P=pistasAveria(a);if(P.length)box.appendChild(el("div",{style:"display:grid;gap:4px"},[el("div",{class:"sub",style:"font-weight:600",text:"Pistas (salen solas de lo apuntado)"})].concat(P.map(x=>el("div",{class:"banner"+(x.w?" w":""),style:"margin:0",text:x.t})))));}
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
  dlg("Avería "+(a.n?"Nº "+a.n+" · ":"")+avNom(a),[box],[{t:"Cancelar",cls:"sec"},{t:"Borrar",cls:"sec",fn:()=>{setTimeout(()=>borrarAveria(a),0);}},{t:"Investigar",cls:"sec",fn:()=>{setTimeout(()=>investigar(F),0);}},
    {t:"Apuntar acción",cls:"sec",fn:async()=>{await guarda();setTimeout(()=>formConclusion(F,datosInv(F),{sug:(v.causa||"Avería")+" · "+v.t}),0);}},
    a.estado==="abierta"?{t:"Cerrar avería",cls:"sec",fn:()=>{if(!v.causa&&!a._ok){a._ok=true;toast("No tiene causa. Si quieres cerrarla igual, pulsa otra vez «Cerrar avería» (la causa se puede poner después).");return false;}return guarda({estado:"cerrada",fc:h});}}:{t:"Abrir de nuevo",cls:"sec",fn:()=>guarda({estado:"abierta",fc:null})},
    {t:"Guardar",fn:()=>guarda()}]);}
/* añadir a mano un cambio de esa máquina (últimos 60 días, que no esté ya en otra avería) */
function elegirParaAveria(a){const m=avMaq(a),S=avLinkSet(),h=hoy(),d0=sumaDias(a.f,-15);
  const L=evInv().filter(e=>e.r&&e.r.id&&maqInv(e)&&m&&maqInv(e).id===m.id&&e.f>=d0&&e.f<=h&&!S[e.k+":"+e.r.id]).sort((x,y)=>y.f.localeCompare(x.f)).slice(0,40);
  if(m)ejePend().filter(p=>(p.maq===m.cod||p.maq===m.id)&&!S["q:"+p.id]&&!(p.pist&&S["p:"+p.pist])&&!(p.pist&&L.some(e=>e.k==="p"&&e.r.id===p.pist))).forEach(p=>L.unshift({k:"q",r:{id:p.id},f:p.f,ref:"Eje en cuarentena · "+(p.motivo?cap(p.motivo):"sin motivo"),mot:"",quien:"",cant:1,mods:p.mods||[]}));
  dlg("Añadir a la avería",[el("p",{class:"hint",style:"margin:0",text:"Cambios de la "+(m?m.cod:"máquina")+" desde el "+fmtF(d0)+" que no están en ninguna avería."}),
    L.length?el("div",{class:"lst"},L.map(e=>el("button",{type:"button",class:"it",onclick:async()=>{cierraDlgs();try{await avCambia(a.id,x=>{x.links=(x.links||[]).concat([Object.assign({k:e.k,id:e.r.id,f:e.f},e.k==="q"?{mods:e.mods}:{})]);return x;});}catch(er){toast("No se pudo guardar");return;}toast("Añadido");render(true);fichaAveria(a);}},
      [el("span",{class:"stripe ok"}),el("div",{class:"ppal"},[el("div",{class:"t1",text:fmtF(e.f)+" · "+e.ref}),el("div",{class:"t2",text:[e.mot?cap(e.mot):null,e.quien||null].filter(Boolean).join(" · ")})]),el("div",{class:"num",text:fmtN(e.cant)})]))):el("p",{class:"hint",text:"No hay cambios sueltos en esas fechas."})],
    [{t:"Volver",cls:"sec",fn:()=>{setTimeout(()=>fichaAveria(a),0);}}]);}
function nuevaAveriaMano(maqId){const v={maq:maqId||"",t:"",f:hoy()};dlg("Abrir avería",[el("div",{class:"row"},[fld("Inyectora",sel("avM",maqOpts(),v.maq,x=>v.maq=x,"Elige…")),fld("Fecha de la avería",inp("avF",v.f,x=>v.f=x,{type:"date",max:hoy()}))]),fld("Qué se ha roto",inp("avQ","",x=>v.t=x,{autocomplete:"off",placeholder:"Eje roto, barras rotas, fuga…"})),
    el("div",{class:"chips"},["Eje roto","Barras rotas","Pistón agarrotado","Fuga de agua","Postizo roto"].map(c=>el("button",{type:"button",class:"chip",text:c,onclick:()=>{v.t=c;const i=$("avQ");if(i)i.value=c;}})))],
  [{t:"Cancelar",cls:"sec"},{t:"Abrir",fn:async()=>{if(!v.maq){toast("Elige la inyectora");return false;}if(!String(v.t).trim()){toast("Escribe qué se ha roto");return false;}const n=AVER.reduce((s,a)=>Math.max(s,+a.n||0),0)+1;
    const a={id:uid(),n,maq:v.maq,f:v.f||hoy(),t:String(v.t).trim(),causa:"",evit:null,resp:null,nota:null,estado:"abierta",links:[],por:(window.yoNombre&&window.yoNombre())||"",ts:Date.now()};
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
  const fila=a=>{const c=avCoste(a);return el("button",{type:"button",class:"it",onclick:()=>fichaAveria(a)},[el("span",{class:"stripe "+(a.estado==="abierta"?"warn":a.evit?"bad":"ok")}),el("div",{class:"ppal"},[el("div",{class:"t1",text:avNom(a)}),el("div",{class:"t2",text:[fmtF(a.f)+(a.estado==="abierta"?" · abierta "+(dias(a.f,h)===0?"desde hoy":dias(a.f,h)===1?"desde ayer":"hace "+dias(a.f,h)+" días"):" · cerrada"),a.causa||"sin causa",a.evit===true?"evitable":null].filter(Boolean).join(" · ")})]),el("div",{class:"num",style:"font-weight:600",text:eur(c)})]);};
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

/* borrar una avería (por ejemplo, una de prueba): solo la avería; lo apuntado sigue en el almacén */
function borrarAveria(a){confirmar("¿Borrar la avería?","Se borra solo la avería «"+avNom(a)+"». Los cambios que tenía (pistones, barras, ejes, piezas) siguen apuntados en el almacén; si también eran de prueba, bórralos en Más › Movimientos.","Borrar",async()=>{
  try{await avGuarda(L=>L.filter(x=>x.id!==a.id));}catch(e){toast("No se pudo borrar");return false;}toast("Avería borrada");render(true);});}

/* pistas para decidir la causa, sacadas de lo que ya se apunta (sin fotos ni trabajo extra) */
const ROT_P=/^(ROTURA|PISTÓN AGARROTADO)$/;
function pistasAveria(a){const out=[],m=avMaq(a);if(!m)return out;const P=todosPist().filter(p=>p.maq===m.id||p.maq===m.cod).sort((x,y)=>x.f.localeCompare(y.f));
  const lp=(a.links||[]).find(l=>l.k==="p"),pr=lp?P.find(p=>p.id===lp.id):null;
  /* 1) cuánto duró el pistón frente a lo normal en esa máquina */
  if(pr){const i=P.indexOf(pr),ant=i>0?P[i-1]:null;const fs=[...new Set(P.map(p=>p.f))].sort(),iv=fs.slice(1).map((f,k)=>dias(fs[k],f)).filter(x=>x>0).sort((x,y)=>x-y);const med=iv.length>=3?iv[Math.floor(iv.length/2)]:null;
    if(ant){const d=dias(ant.f,pr.f);out.push({w:med&&d<0.5*med,t:"El pistón duró "+(d===1?"1 día":d+" días")+(med?"; en la "+m.cod+" suelen durar unos "+med+" días"+(d<0.5*med?". Mucho menos de lo normal: suele ser cómo se ha trabajado, no desgaste.":d>1.5*med?". Más de lo normal: puede ser desgaste.":"."):".")});}}
  /* 2) roturas y averías de esa máquina en los últimos 2 meses */
  const h=hoy(),d60=sumaDias(a.f,-60),rot=P.filter(p=>p.f>=d60&&p.f<=a.f&&ROT_P.test(p.motivo||"")&&(!pr||p.id!==pr.id)).length,avs=AVER.filter(x=>x.id!==a.id&&(x.maq===a.maq)&&x.f>=d60&&x.f<=a.f).length;
  if(rot||avs)out.push({w:rot+avs>=2,t:"En los 2 meses anteriores la "+m.cod+" tuvo "+[rot?rot+(rot===1?" pistón roto o agarrotado":" pistones rotos o agarrotados"):null,avs?avs+(avs===1?" avería":" averías"):null].filter(Boolean).join(" y ")+"."+(rot+avs>=2?" Se repite en la máquina: mira refrigeración, eje y molde.":"")});
  else out.push({w:false,t:"La "+m.cod+" no tuvo roturas ni averías en los 2 meses anteriores."});
  /* 3) el responsable de ese cambio frente a los demás (90 días) */
  const quien=pr&&pr.resp?respTxt(pr.resp):"";if(quien){const d90=sumaDias(a.f,-90),T=todosPist().filter(p=>p.f>=d90&&p.f<=a.f),suyo=T.filter(p=>p.resp&&respTxt(p.resp)===quien);
    if(suyo.length>=3){const r1=suyo.filter(p=>ROT_P.test(p.motivo||"")).length/suyo.length,s1=suyo.filter(p=>!String(p.motivo||"").trim()).length;const otros=T.filter(p=>!(p.resp&&respTxt(p.resp)===quien)),r0=otros.length?otros.filter(p=>ROT_P.test(p.motivo||"")).length/otros.length:0;
      const alto=r1>=0.4&&r1>=2*Math.max(r0,0.05);out.push({w:alto||s1>=2,t:quien+": "+suyo.length+" cambios en 90 días, "+Math.round(r1*100)+" % por rotura o agarrotado (los demás, "+Math.round(r0*100)+" %)"+(s1?"; "+s1+" sin motivo":"")+"."+(alto?" Por encima de lo normal.":"")});}}
  return out;}

/* pestaña «Averías» en la ficha de la inyectora: su historial, coste, evitables, cada cuánto se avería y la causa que más se repite */
function tabAveriasMaq(m){const L=AVER.filter(a=>a.maq===m.id||a.maq===m.cod).sort((a,b)=>b.f.localeCompare(a.f)),h=hoy(),y=h.slice(0,4),LA=L.filter(a=>a.f.slice(0,4)===y);
  const cA=LA.reduce((s,a)=>s+avCoste(a),0),ev=LA.filter(a=>a.evit===true).reduce((s,a)=>s+avCoste(a),0);const fs=L.map(a=>a.f).sort(),iv=fs.slice(1).map((f,i)=>dias(fs[i],f));const cada=iv.length?Math.round(iv.reduce((s,x)=>s+x,0)/iv.length):null;
  const C={};L.forEach(a=>{const k=a.causa||"";if(k)C[k]=(C[k]||0)+1;});const top=Object.entries(C).sort((p,q)=>q[1]-p[1])[0];
  return el("section",{class:"card"},[el("div",{class:"bd",style:"display:grid;gap:10px"},[
    el("dl",{class:"kpis num"},[["Averías este año",String(LA.length)],["Coste este año",eur(cA)],["Evitable",eur(ev)],["Se avería cada",cada!=null?cada+" días":"—"]].map(([p,q])=>el("div",{},[el("dt",{text:p}),el("dd",{text:q})]))),
    top?el("p",{class:"sub",style:"margin:0",text:"Causa que más se repite: "+top[0]+" ("+top[1]+(top[1]===1?" vez":" veces")+")."}):null,
    L.length?el("div",{class:"lst"},L.map(a=>el("button",{type:"button",class:"it",onclick:()=>fichaAveria(a)},[el("span",{class:"stripe "+(a.estado==="abierta"?"warn":a.evit?"bad":"ok")}),el("div",{class:"ppal"},[el("div",{class:"t1",text:a.t}),el("div",{class:"t2",text:[fmtF(a.f),a.estado==="abierta"?"abierta":"cerrada",a.causa||"sin causa",a.evit===true?"evitable":null].filter(Boolean).join(" · ")})]),el("div",{class:"num",style:"font-weight:600",text:eur(avCoste(a))})]))):el("p",{class:"hint",style:"margin:0",text:"Esta máquina no tiene averías apuntadas."}),
    el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec",text:"Abrir avería",onclick:()=>nuevaAveriaMano(m.id)})])])]);}

/* desde la cuarentena: meter un eje en una avería (si vino de un cambio de pistón, entra el cambio y el eje con él) */
function aveDePend(p){const S=avLinkSet();return S["q:"+p.id]||(p.pist?S["p:"+p.pist]:null)||null;}
function averiaDesdePend(p){const ya=aveDePend(p);if(ya){fichaAveria(ya);return;}const m=cat.maquinas.find(x=>x.cod===p.maq||x.id===p.maq);if(!m){toast("No encuentro la máquina "+p.maq);return;}
  const lk=p.pist?{k:"p",id:p.pist,f:p.f}:{k:"q",id:p.id,f:p.f,mods:p.mods||[]};preguntaAveria(m.id,lk,p.motivo==="PISTÓN AGARROTADO"?"Pistón agarrotado y eje":p.motivo==="ROTURA"?"Pistón roto y eje":"Eje: "+String(p.motivo||"roto").toLowerCase());}

/* ===== PREGUNTAS SOBRE AVERÍAS (Consultas) =====
   «averías abiertas», «averías sin causa», «cuánto nos han costado las averías este año», «qué máquina tiene más averías»,
   «averías de la F21», «se repiten las averías», «por qué se rompen los ejes», «averías por pistonwax», «averías evitables»,
   «quién tiene más averías evitables». intencionAv(q,o) decide; pintaAveriasQ contesta. */
const CAUSA_Q=[[/\bpistonwax|pistowax|piston wax\b/,"Trabajando sin pistonwax"],[/\brefrigera\w*|\bsin agua\b|\bagua\b/,"Refrigeración mal puesta o sin agua"],[/\bmontaje|\bmal ajust\w*|\bajuste\b/,"Mal montaje o mal ajuste"],[/\bdesgaste\b/,"Desgaste normal"],[/\breparacion anterior\b|\bmal reparad\w*/,"Fallo de la reparación anterior"],[/\bmolde\b/,"Molde o pieza"]];
const TIPO_AV=[["eje",/\bejes?\b/],["piston",/\bpiston\w*\b/],["barra",/\bbarras?\b/],["tornillo",/\btornillos?\b/],["horno",/\bhornos?\b|\btolvas?\b|\btubos?\b|\bresistencias?\b/]];
function tiposAv(a){const t=nq(a.t||""),S=new Set();(a.links||[]).forEach(l=>{if(l.k==="q")S.add("eje");if(l.k==="p")S.add("piston");if(l.k==="brec")S.add("barra");});TIPO_AV.forEach(([k,re])=>{if(re.test(t))S.add(k);});return S;}
function intencionAv(q){const av=/\baverias?\b|\baveriad\w*/.test(q),rompe=/\bpor que se (rompen?|rompio|rompieron|agarrotan?|agarroto|estropean?|estropeo)\b/.test(q),ev=/\bevitables?\b/.test(q);
  if(!av&&!rompe&&!(ev&&/\b(cuant\w*|quien|que|coste|cuesta|cuestan|costado)\b/.test(q)))return null;
  const r={tipo:(TIPO_AV.find(([k,re])=>re.test(q))||[])[0]||null,causa:(CAUSA_Q.find(([re])=>re.test(q))||[])[1]||null};
  if(/\bquien(es)?\b|\bresponsables?\b|\boperari\w*|\bculpa\b/.test(q))r.que="resp";
  else if(/\bsin causa\b|\bsin (poner|saber) (la )?causa\b|\bfalta (la )?causa\b/.test(q))r.que="sincausa";
  else if(/\babiertas?\b|\bpendientes?\b|\bsin cerrar\b|\bpor cerrar\b/.test(q))r.que="abiertas";
  else if(/\brepit\w*|\brepite\w*|\botra vez\b|\bmisma (causa|averia)\b|\bvuelven?\b/.test(q))r.que="repite";
  else if(ev)r.que="evit";
  else if(r.causa)r.que="lista";
  else if(rompe||/\bpor que\b|\bcausas?\b|\bmotivos?\b/.test(q))r.que="causas";
  else if(/\b(que|cual|cuales) (maquinas?|inyectoras?)\b|\bmas averias\b|\bmaquinas? con (mas )?averias\b|\branking\b/.test(q))r.que="maqs";
  else if(/\bcuant\w*|\bcoste\w*|\bcuesta\w*|\bcostad\w*|\bdinero\b|\beuros\b|\bgast\w*|\bimporte\b/.test(q))r.que="coste";
  else r.que="resumen";
  return r;}
function listaAvDlg(tit,L){dlg(tit,[el("div",{class:"lst"},L.slice().sort((a,b)=>b.f.localeCompare(a.f)).map(a=>el("button",{type:"button",class:"it",onclick:()=>{cierraDlgs();fichaAveria(a);}},[el("span",{class:"stripe "+(a.estado==="abierta"?"warn":a.evit?"bad":"ok")}),el("div",{class:"ppal"},[el("div",{class:"t1",text:avNom(a)}),el("div",{class:"t2",text:[fmtF(a.f),a.estado==="abierta"?"abierta":"cerrada",a.causa||"sin causa",a.resp?"resp. "+a.resp:null].filter(Boolean).join(" · ")})]),el("div",{class:"num",style:"font-weight:600",text:eur(avCoste(a))})])))],[{t:"Cerrar",cls:"sec"}]);}
function pintaAveriasQ(I,P,H){const {add,frase,nota,ent,lista,it,pon}=H,h=hoy(),y0=h.slice(0,4)+"-01-01",m=I.maq;
  const per=P.def?{d:P.d,h:P.h,t:"los últimos 12 meses"}:P;
  const deMaq=a=>!m||a.maq===m.id||a.maq===m.cod,deTipo=a=>!I.tipo||tiposAv(a).has(I.tipo),deCausa=a=>!I.causa||a.causa===I.causa;
  const base=AVER.filter(a=>deMaq(a)&&deTipo(a)&&deCausa(a)),L=base.filter(a=>a.f>=per.d&&a.f<=per.h);
  const sufTipo=I.tipo?" de "+{eje:"ejes",piston:"pistones",barra:"barras",tornillo:"tornillos",horno:"horno"}[I.tipo]:"",sufM=m?" en la "+m.cod:"";
  const fila=a=>it(avNom(a),[[fmtF(a.f),a.estado==="abierta"?"abierta "+(dias(a.f,h)<=0?"desde hoy":"hace "+dias(a.f,h)+(dias(a.f,h)===1?" día":" días")):"cerrada",a.causa||"sin causa",a.evit===true?"evitable":null].filter(Boolean).join(" · "),a.resp?"Responsable: "+a.resp:null],eur(avCoste(a)),null,()=>fichaAveria(a),a.estado==="abierta"?"warn":a.evit?"bad":"ok");
  const sum=X=>X.reduce((s,a)=>s+avCoste(a),0),grupo=(X,f)=>{const o={};X.forEach(a=>{const k=f(a);if(k==null)return;const g=o[k]=o[k]||{k,L:[],eur:0};g.L.push(a);g.eur+=avCoste(a);});return Object.values(o).sort((p,q)=>q.L.length-p.L.length||q.eur-p.eur);};
  const nA=n=>n+(n===1?" avería":" averías");
  if(!AVER.length){ent("averías");frase("Todavía no hay ninguna avería apuntada. Se abren al apuntar una rotura (pistón, eje, barra, horno) si dices que es por una avería, o en Más › Averías › «Abrir avería».");return;}
  if(I.que==="abiertas"){const X=base.filter(a=>a.estado==="abierta").sort((a,b)=>a.f.localeCompare(b.f));ent("averías abiertas"+sufTipo+sufM);
    frase(X.length?"Hay "+nA(X.length)+" abierta"+(X.length===1?"":"s")+sufTipo+sufM+" ("+eur(sum(X))+" hasta ahora)."+(X.filter(a=>!a.causa).length?" "+X.filter(a=>!a.causa).length+" sin causa.":""):"No hay ninguna avería abierta"+sufTipo+sufM+".");
    if(X.length)lista(null,X.map(fila));if(X.length)nota("Ciérrala cuando tenga la causa y no quede nada pendiente. Si un eje sigue en el taller, el coste se actualiza solo cuando llegue la factura.");return;}
  if(I.que==="sincausa"){const X=base.filter(a=>!a.causa).sort((a,b)=>a.f.localeCompare(b.f));ent("averías sin causa"+sufTipo+sufM);
    frase(X.length?nA(X.length)+" sin causa"+sufTipo+sufM+" ("+eur(sum(X))+"). Mientras no tengan causa no se sabe si eran evitables.":"Todas las averías"+sufTipo+sufM+" tienen la causa puesta.");
    if(X.length){lista(null,X.map(fila));nota("Pulsa en una para poner la causa.");}return;}
  if(I.que==="repite"){ent("averías que se repiten",[sufTipo.trim()||null,m?m.cod:null,per.t]);
    const G=grupo(L,a=>(avMaq(a)||{cod:a.maq}).cod+"|"+((a.causa||(tiposAv(a).size?"sin causa, "+{eje:"eje",piston:"pistón",barra:"barra",tornillo:"tornillo",horno:"horno"}[[...tiposAv(a)][0]]:"")))).filter(g=>g.L.length>=2&&g.k.split("|")[1]);
    if(!G.length){frase("En "+per.t+" ninguna máquina ha tenido dos averías por la misma causa"+sufTipo+sufM+".");const M2=grupo(L,a=>(avMaq(a)||{cod:a.maq}).cod).filter(g=>g.L.length>=2);if(M2.length)nota("Con más de una avería (por causas distintas o sin causa): "+M2.map(g=>g.k+" ("+g.L.length+")").join(", ")+".");return;}
    frase(G.length+(G.length===1?" máquina repite":" máquinas repiten")+" avería por lo mismo en "+per.t+". La que más: "+G[0].k.replace("|"," · ")+" ("+G[0].L.length+" veces, "+eur(G[0].eur)+").");
    lista("Misma máquina y misma causa",G.map(g=>{const [mc,c]=g.k.split("|"),fs=g.L.map(a=>a.f).sort(),iv=fs.slice(1).map((f,i)=>dias(fs[i],f));return it(mc+" · "+c,[fs.map(fmtF).join(" · "),iv.length?"Cada "+Math.round(iv.reduce((s,x)=>s+x,0)/iv.length)+" días de media":null],String(g.L.length),"veces",()=>listaAvDlg(mc+" · "+c,g.L),g.L.length>=3?"bad":"warn");}));
    nota("Si una avería se repite, mira las pistas de la ficha (cuánto duró el pistón, quién estaba) y apunta una conclusión con 🔎 Investigar.");return;}
  if(I.que==="resp"){const X=L.filter(a=>a.causa);ent("averías por responsable",[I.causa||null,sufTipo.trim()||null,m?m.cod:null,per.t]);
    const G=grupo(X,a=>a.resp?cap(String(a.resp).trim()):"Sin responsable");const tE=X.filter(a=>a.evit===true).length;
    if(!X.length){frase("En "+per.t+" no hay averías con la causa puesta"+sufTipo+sufM+". Pon la causa y el responsable en cada avería para poder verlo.");return;}
    const R=G.map(g=>Object.assign(g,{ev:g.L.filter(a=>a.evit===true),eEur:g.L.filter(a=>a.evit===true).reduce((s,a)=>s+avCoste(a),0)})).sort((p,q)=>q.ev.length-p.ev.length||q.eEur-p.eEur);
    const top=R.find(g=>g.k!=="Sin responsable"&&g.ev.length);
    frase(cap(per.t)+": "+nA(X.length)+" con causa, "+tE+" evitable"+(tE===1?"":"s")+"."+(top?" Quien más tiene: "+top.k+" ("+top.ev.length+" de "+tE+", "+Math.round(top.ev.length/Math.max(1,tE)*100)+" % de las evitables, "+eur(top.eEur)+").":" Ninguna evitable tiene responsable puesto."));
    lista("Por responsable",R.map(g=>it(g.k,[g.ev.length+" evitable"+(g.ev.length===1?"":"s")+" de "+g.L.length+" · "+eur(g.eEur)+" evitable",tE?Math.round(g.ev.length/tE*100)+" % de todas las evitables":null],String(g.ev.length),"evitables",()=>listaAvDlg(g.k,g.L),g.ev.length&&g.k!=="Sin responsable"&&g.ev.length/Math.max(1,tE)>=0.4?"bad":g.ev.length?"warn":"ok")));
    nota("Solo cuentan las averías con causa. El responsable se pone en la ficha de cada avería; sirve para ver dónde hace falta formación, no para culpar a nadie por una sola avería.");return;}
  if(I.que==="evit"){const E=L.filter(a=>a.evit===true),Nc=L.filter(a=>a.causa).length;ent("averías evitables",[sufTipo.trim()||null,m?m.cod:null,per.t]);
    frase(cap(per.t)+": "+nA(E.length)+" evitable"+(E.length===1?"":"s")+sufTipo+sufM+" de "+L.length+" ("+eur(sum(E))+" de "+eur(sum(L))+")."+(L.length-Nc?" "+(L.length-Nc)+" no tienen causa todavía, así que no se sabe.":""));
    if(E.length){lista("Por causa",grupo(E,a=>a.causa).map(g=>it(g.k,null,eur(g.eur),g.L.length+(g.L.length===1?" avería":" averías"),()=>listaAvDlg(g.k,g.L),"bad")));lista("Evitables",E.sort((a,b)=>b.f.localeCompare(a.f)).map(fila));}return;}
  if(I.que==="lista"){ent("averías por "+I.causa.toLowerCase(),[sufTipo.trim()||null,m?m.cod:null,per.t]);
    frase(L.length?cap(per.t)+": "+nA(L.length)+" por «"+I.causa+"»"+sufTipo+sufM+", "+eur(sum(L))+".":"No hay averías por «"+I.causa+"»"+sufTipo+sufM+" en "+per.t+".");
    if(L.length){const G=grupo(L,a=>(avMaq(a)||{cod:a.maq}).cod);if(!m&&G.length>1)lista("Por máquina",G.map(g=>it(g.k,null,eur(g.eur),nA(g.L.length),()=>listaAvDlg(g.k+" · "+I.causa,g.L))));lista(null,L.sort((a,b)=>b.f.localeCompare(a.f)).map(fila));}return;}
  if(I.que==="causas"){ent("causas de las averías",[sufTipo.trim()||null,m?m.cod:null,per.t]);if(!L.length){frase("No hay averías"+sufTipo+sufM+" en "+per.t+".");return;}
    const G=grupo(L,a=>a.causa||"Sin saber todavía"),G1=G.filter(g=>g.k!=="Sin saber todavía");
    frase(cap(per.t)+", "+nA(L.length)+sufTipo+sufM+"."+(G1.length?" La causa que más se repite: "+G1[0].k+" ("+G1[0].L.length+", "+eur(G1[0].eur)+").":" Ninguna tiene la causa puesta todavía."));
    lista("Por causa",G.map(g=>it(g.k,evitDe(g.k)===true?"Evitable":evitDe(g.k)===false?"No evitable":null,String(g.L.length),"· "+eur(g.eur),()=>listaAvDlg(g.k,g.L),g.k==="Sin saber todavía"?"warn":evitDe(g.k)===true?"bad":"ok")));
    if(!I.tipo){const T=grupo(L,a=>cap(a.t));if(T.length>1)lista("Qué se rompe",T.slice(0,10).map(g=>it(g.k,null,String(g.L.length),"· "+eur(g.eur),()=>listaAvDlg(g.k,g.L))));}return;}
  if(I.que==="maqs"&&!m){ent("máquinas con más averías",[sufTipo.trim()||null,I.causa||null,per.t]);if(!L.length){frase("No hay averías"+sufTipo+" en "+per.t+".");return;}
    const G=grupo(L,a=>(avMaq(a)||{cod:a.maq}).cod);frase(cap(per.t)+": la que más averías"+sufTipo+" tiene es la "+G[0].k+" ("+G[0].L.length+", "+eur(G[0].eur)+"). La que más ha costado: "+G.slice().sort((p,q)=>q.eur-p.eur)[0].k+".");
    lista("Por máquina",G.map(g=>it(g.k,[g.L.filter(a=>a.evit===true).length?g.L.filter(a=>a.evit===true).length+" evitable"+(g.L.filter(a=>a.evit===true).length===1?"":"s"):null,(grupo(g.L,a=>a.causa||null)[0]||{}).k?"Causa más repetida: "+grupo(g.L,a=>a.causa||null)[0].k:null].filter(Boolean),String(g.L.length),"· "+eur(g.eur),()=>pon("averías de la "+g.k+" "+per.t))));return;}
  /* coste, resumen y averías de una máquina */
  ent(m?"averías de la "+m.cod:"averías",[sufTipo.trim()||null,I.causa||null,per.t]);
  if(!L.length){frase("No hay averías"+sufTipo+sufM+" en "+per.t+"."+(m&&base.length?" La última fue el "+fmtF(base.map(a=>a.f).sort().pop())+".":""));return;}
  const E=L.filter(a=>a.evit===true),ab=L.filter(a=>a.estado==="abierta");
  frase(cap(per.t)+": "+nA(L.length)+sufTipo+sufM+", "+eur(sum(L))+" en total"+(E.length?" ("+E.length+(E.length===1?" evitable, ":" evitables, ")+eur(sum(E))+")":"")+"."+(ab.length?" "+ab.length+" sigue"+(ab.length===1?"":"n")+" abierta"+(ab.length===1?"":"s")+".":"")+(L.filter(a=>!a.causa).length?" "+L.filter(a=>!a.causa).length+" sin causa.":""));
  if(!m){const G=grupo(L,a=>(avMaq(a)||{cod:a.maq}).cod).sort((p,q)=>q.eur-p.eur);if(G.length>1)lista("Por máquina",G.slice(0,12).map(g=>it(g.k,null,eur(g.eur),nA(g.L.length),()=>pon("averías de la "+g.k+" "+per.t))));}
  {const G=grupo(L,a=>a.causa||"Sin saber todavía").sort((p,q)=>q.eur-p.eur);if(G.length>1||m)lista("Por causa",G.map(g=>it(g.k,null,eur(g.eur),nA(g.L.length),()=>listaAvDlg(g.k,g.L),g.k==="Sin saber todavía"?"warn":evitDe(g.k)===true?"bad":null)));}
  lista(m?"Averías":"Todas",L.sort((a,b)=>b.f.localeCompare(a.f)).slice(0,60).map(fila));
  if(m)add(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec",text:"Abrir avería en la "+m.cod,onclick:()=>nuevaAveriaMano(m.id)})].filter(()=>!window.SOLO_CONSULTA)));}

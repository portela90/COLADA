/* ===== BARRAS EXPULSORAS Y TORNILLOS TOPE ===== */
const porMaqDe=a=>+a.porMaq>0?+a.porMaq:(a.fam==="barra"?4:1);
const BT={barra:{nom:"Barras expulsoras",uno:"barra expulsora",corto:"Barra"},tornillo:{nom:"Tornillos tope",uno:"tornillo tope",corto:"Tornillo"},horno:{nom:"Horno",uno:"pieza de horno",corto:"Pieza"}};
const MOT_BT=["ROTURA","DESGASTE","DOBLADA","CAMBIO DE REFERENCIA","PREVENTIVO","OTRO"];
const PREF_BT={barra:"BE"};
const artsBT=f=>artsActivos().filter(a=>a.fam===f).sort((x,y)=>(x.cod||"~"+x.desc).localeCompare(y.cod||"~"+y.desc,"es",{numeric:true}));
function sigCodBT(f){const p=PREF_BT[f];if(!p)return"";const re=new RegExp("^"+p+"-(\\d+)$","i");let mx=0;cat.articulos.forEach(a=>{const m=re.exec(String(a.cod||"").trim());if(m)mx=Math.max(mx,+m[1]);});return p+"-"+String(mx+1).padStart(2,"0");}
const nomBT=a=>{if(!a.cod)return a.desc;const d=String(a.desc||"").replace(a.cod,"").replace(/^(barra expulsora|tornillo tope)\s*/i,"").replace(/^[\s·\-]+|[\s·\-]+$/g,"");return d?a.cod+" · "+d:a.cod;};
const cambiosBT=(f,desde)=>todosMov().filter(m=>m.tipo==="salida"&&(!desde||m.f>=desde)&&(art(m.art)||{}).fam===f).sort((a,b)=>(b.f+(b.ts||0)).localeCompare(a.f+(a.ts||0)));
const maqsArt=a=>(a.iny||[]).map(id=>maqN(id)).filter(x=>x&&x!=="—").sort((p,q)=>p.localeCompare(q,"es",{numeric:true}));
const GRUPOS_H=["Tubos dosificadores","Conos","Juntas de cono","Juntas de tubo dosificador","Resistencias","Conexiones estrella","Conexiones fase","Centradores","Juntas de puerta y tapa","Juntas de termopar"];
function gruposH(A){const g={};A.forEach(a=>{const k=a.grupo||"Otros";(g[k]=g[k]||[]).push(a);});return Object.keys(g).sort((x,y)=>{const i=GRUPOS_H.indexOf(x),j=GRUPOS_H.indexOf(y);return(i<0?99:i)-(j<0?99:j);}).map(k=>[k,g[k]]);}
function vBT(v,fijo){if(fijo&&draft.bt!==fijo){draft.bt=fijo;draft.btMaq="";}draft.bt=draft.bt||"barra";const f=draft.bt,N=BT[f],hy=hoy();
  const A=artsBT(f),C30=cambiosBT(f,sumaDias(hy,-30));const PR={};try{prevTodo().arts.forEach(x=>{PR[x.a.id]=x;});}catch(e){}
  const bajo=A.filter(a=>{const n=nivel(a);return n==="bad"||n==="warn";});
  v.appendChild(el("dl",{class:"kpis num"},[["Referencias",String(A.length)],["En stock",fmtN(A.reduce((t,a)=>t+stockDe(a.id),0))+" ud"],["Para pedir",String(bajo.length)],["Cambios 30 días",fmtN(C30.reduce((t,m)=>t+(+m.cant||0),0))]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))));
  v.appendChild(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn",text:"Registrar cambio",onclick:()=>cambioBT(f)}),
    el("button",{type:"button",class:"btn sec",text:"Entrada",onclick:()=>{Object.assign(draft.m,{tipo:"entrada",art:A[0]?A[0].id:"",cant:""});irA("mov");}}),
    el("button",{type:"button",class:"btn sec",text:"Contar",onclick:()=>{const al=(A[0]&&ppalDe(A[0]))||(cat.almacenes[0]||{}).id;formInventario({fam:f,alm:al});}}),
    el("button",{type:"button",class:"btn sec",text:"Pedido al proveedor",onclick:()=>pedidoBT(f)}),
    el("button",{type:"button",class:"btn sec",text:"Nueva referencia",onclick:()=>formArticulo(null,{fam:f,ud:"ud"})})]));
  /* referencias */
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:N.nom+" ("+A.length+")"}),el("span",{class:"der sub",text:"stock y dónde van"})]),
    A.length?el("div",{class:"lst"},[].concat(...(f==="horno"?gruposH(A):[[null,A]]).map(([gN,GA])=>[gN?el("div",{class:"gh",text:gN+" ("+GA.length+")"}):null].concat(GA.map(a=>{const st=stockDe(a.id),n=nivel(a),ms=maqsArt(a),c90=cambiosBT(f,sumaDias(hy,-90)).filter(m=>m.art===a.id).reduce((t,m)=>t+(+m.cant||0),0);
      if(f==="horno")return el("button",{type:"button",class:"it",onclick:()=>ficha(a)},[el("span",{class:"stripe "+(n==="na"?"":n)}),el("div",{class:"ppal"},[el("div",{class:"t1",text:a.desc+(a.cod&&!a.desc.includes(a.cod)?" · "+a.cod:"")+(a.codProv&&a.codProv===a.cod?" (código provisional)":"")}),
        el("div",{class:"t2",text:[a.medidas||null,ms.length?"va en "+ms.join(", "):"sin máquinas asignadas",a.pendiente||null,a.pedido?"pedida el "+fmtF(a.pedido):null,c90?"cambios en 3 meses: "+c90:null].filter(Boolean).join(" · ")})]),
        el("div",{class:"cant num"},[el("b",{text:fmtN(st)}),el("small",{text:+a.min>0?"mín "+fmtN(+a.min):a.ud})])]);
      return el("button",{type:"button",class:"it",onclick:()=>ficha(a)},[el("span",{class:"stripe "+(n==="na"?"":n)}),el("div",{class:"ppal"},[el("div",{class:"t1",text:nomBT(a)}),
        el("div",{class:"t2",text:[revVig(a)?"plano "+revTxt(revVig(a).n):"sin plano",a.pedido?"pedida el "+fmtF(a.pedido)+(a.pedCant?" ("+fmtN(a.pedCant)+")":""):null,ms.length?"va en "+ms.join(", ")+" ("+porMaqDe(a)+" por máquina = "+porMaqDe(a)*ms.length+" puestas)":"sin máquinas asignadas",PR[a.id]?"gasta ~"+fmtN(Math.round(PR[a.id].mesUd*10)/10)+"/mes · mínimo sugerido "+fmtN(PR[a.id].min):null,c90?"cambios en 3 meses: "+c90:null].filter(Boolean).join(" · ")})]),
        el("div",{class:"cant num"},[el("b",{text:fmtN(st)}),el("small",{text:+a.min>0?"mín "+fmtN(+a.min):a.ud})])]);}))))):el("div",{class:"empty"},["Todavía no hay ninguna "+N.uno+". ",el("button",{type:"button",class:"btn peq",text:"Añadir la primera",onclick:()=>formArticulo(null,{fam:f,ud:"ud"})})])]));
  /* por máquina */
  const maqs=cat.maquinas.slice().sort((p,q)=>p.cod.localeCompare(q.cod,"es",{numeric:true}));const sinAsig=maqs.filter(m=>!A.some(a=>(a.iny||[]).includes(m.id)));
  const selMq=sel("btMaq",maqOpts(),draft.btMaq||"",x=>{draft.btMaq=x;render(true);},"Elige una inyectora…");
  const m=draft.btMaq?cat.maquinas.find(z=>z.id===draft.btMaq):null;
  let det=null;if(m){const lleva=A.filter(a=>(a.iny||[]).includes(m.id));const ult=cambiosBT(f).filter(x=>x.maq===m.id).slice(0,5);
    det=el("div",{style:"display:grid;gap:8px;margin-top:8px"},[lleva.length?el("div",{class:"lst"},lleva.map(a=>el("button",{type:"button",class:"it",onclick:()=>ficha(a)},[el("div",{class:"ppal"},[el("div",{class:"t1",text:nomBT(a)}),el("div",{class:"t2",text:[maqsArt(a).length>1?"también en "+maqsArt(a).filter(c=>c!==m.cod).join(", "):null].filter(Boolean).join(" · ")})]),el("div",{class:"cant num"},[el("b",{text:fmtN(stockDe(a.id))}),el("small",{text:"en stock"})])]))):el("p",{class:"hint",text:"La "+m.cod+" no tiene ninguna "+N.uno+" asignada. Ábrela en su ficha (Editar) y marca la "+m.cod+" en «Inyectoras donde va»."}),
      ult.length?el("p",{class:"sub",text:"Últimos cambios: "+ult.map(x=>fmtF(x.f)+" "+(art(x.art)?nomBT(art(x.art)):"")+(x.motivo?" ("+cap(x.motivo)+")":"")).join(" · ")}):el("p",{class:"hint",text:"Sin cambios registrados en esta máquina."}),
      el("button",{type:"button",class:"btn sec peq",style:"justify-self:start",text:"Registrar cambio en la "+m.cod,onclick:()=>cambioBT(f,m.id)})]);}
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Por inyectora"}),el("span",{class:"der sub",text:sinAsig.length?sinAsig.length+" sin "+N.uno+" asignada":"todas asignadas"})]),el("div",{class:"bd"},[selMq,det])]));
  /* últimos cambios */
  const ult=cambiosBT(f,sumaDias(hy,-60)).slice(0,25);
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Últimos cambios"}),el("span",{class:"der sub",text:"60 días"})]),
    ult.length?el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Fecha"}),el("th",{text:"Inyectora"}),el("th",{text:N.corto}),el("th",{class:"r",text:"Cant."}),el("th",{text:"Motivo"})])),
      el("tbody",{},ult.map(x=>el("tr",{},[el("td",{class:"num",text:fmtF(x.f)}),el("td",{text:x.maq?maqN(x.maq):"—"}),el("td",{text:art(x.art)?(art(x.art).cod||art(x.art).desc):"?"}),el("td",{class:"r num",text:fmtN(+x.cant||0)}),el("td",{text:x.motivo?cap(x.motivo):(x.nota||"—")})])))])):el("p",{class:"hint",style:"padding:10px 14px",text:"Sin cambios en los últimos 60 días."})]));
  const mods=[];A.forEach(a=>revsDe(a).filter(r=>r.n>1).forEach(r=>mods.push({a,r})));mods.sort((x,y)=>(y.r.ts||0)-(x.r.ts||0));
  if(mods.length)v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Modificaciones de planos"})),el("div",{class:"lst"},mods.slice(0,10).map(({a,r})=>el("button",{type:"button",class:"it",onclick:()=>histRev(a)},[el("div",{class:"ppal"},[el("div",{class:"t1",text:(a.cod||a.desc)+" · "+revTxt(r.n)+" · "+fmtF(r.f)}),el("div",{class:"t2",text:[r.cambio,r.by?"por "+r.by:null,"quedaban "+fmtN(r.stock)+" de la "+revTxt(r.antes)].filter(Boolean).join(" · ")})])])))]));
  const P=pedidosBT().filter(p=>p.lin.some(l=>(art(l.art)||{}).fam===f)).slice(-10).reverse();
  if(P.length)v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Pedidos al proveedor"})),el("div",{class:"lst"},P.map(p=>el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},[el("div",{class:"t1",text:fmtF(p.f)+" · "+(provN(p.prov)||"—")}),el("div",{class:"t2",text:p.lin.map(l=>l.cod+" ×"+fmtN(l.cant)+(l.rev?" ("+revTxt(l.rev)+")":" (sin plano)")).join(" · ")+(p.by?" · "+p.by:"")})])])))]));}
function cambioBT(f,maqId){const N=BT[f];const d={f:hoy(),maq:maqId||"",art:"",cant:"1",motivo:"ROTURA",alm:"",resp:(typeof lsGet==="function"?lsGet("alm.resp"):"")||"",nota:""};
  const box=el("div",{style:"display:grid;gap:10px"});
  const pinta=()=>{box.textContent="";const A=artsBT(f);const m=d.maq?cat.maquinas.find(z=>z.id===d.maq):null;
    const suyas=m?A.filter(a=>(a.iny||[]).includes(m.id)):[];const otras=A.filter(a=>!suyas.includes(a));
    if(!d.art&&suyas.length===1)d.art=suyas[0].id;
    const a=art(d.art);if(a&&!d.alm){const con=cat.almacenes.filter(l=>stockDe(a.id,l.id)>0);d.alm=(con.find(l=>l.tipo==="produccion")||con[0]||{}).id||ppalDe(a);}
    box.appendChild(el("div",{class:"row"},[fld("Fecha",inp("btF",d.f,v=>d.f=v,{type:"date"})),fld("Inyectora",sel("btM",maqOpts(),d.maq,v=>{d.maq=v;d.art="";d.alm="";pinta();},"Elige…"))]));
    const opts=[].concat(suyas.length?[el("optgroup",{label:"Las de la "+(m?m.cod:"máquina")},suyas.map(x=>el("option",{value:x.id,text:nomBT(x)+" · hay "+fmtN(stockDe(x.id))})))]:[]).concat(otras.length?[el("optgroup",{label:suyas.length?"Otras":N.nom},otras.map(x=>el("option",{value:x.id,text:nomBT(x)+" · hay "+fmtN(stockDe(x.id))})))]:[]);
    const s=el("select",{id:"btA"},[el("option",{value:"",text:A.length?"Elige…":"No hay referencias: créala primero"})].concat(opts));s.value=d.art;s.onchange=()=>{d.art=s.value;d.alm="";pinta();};
    box.appendChild(fld(cap(N.uno),s));
    const pm=a?porMaqDe(a):4;if(+d.cant>pm)d.cant=String(pm);
    box.appendChild(el("div",{},[el("div",{class:"sub",style:"margin-bottom:6px",text:"Cuántas se cambian"+(a?" (la máquina lleva "+pm+")":"")}),el("div",{class:"inf-r"},Array.from({length:pm},(_,i)=>String(i+1)).map(k=>el("button",{type:"button",class:"chip","aria-pressed":String(d.cant===k),style:"min-width:48px",text:k===String(pm)&&pm>1?k+" (todas)":k,onclick:()=>{d.cant=k;pinta();}})))]));
    if(m&&!suyas.length&&A.length)box.appendChild(el("p",{class:"hint",text:"La "+m.cod+" no tiene ninguna asignada: si eliges una, se le asigna sola para la próxima vez."}));
    box.appendChild(el("div",{},[el("div",{class:"sub",style:"margin-bottom:6px",text:"Motivo"}),el("div",{class:"inf-r"},MOT_BT.map(k=>el("button",{type:"button",class:"chip","aria-pressed":String(d.motivo===k),text:cap(k),onclick:()=>{d.motivo=k;pinta();}})))]));
    box.appendChild(el("div",{class:"row"},[fld("Sale de",sel("btAl",almOpts().map(([id,t])=>[id,t+(a?" (hay "+fmtN(stockDe(a.id,id))+")":"")]),d.alm,v=>d.alm=v,"Elige…")),fld("Responsable",inp("btR",d.resp,v=>d.resp=v,{autocomplete:"off"}))]));
    box.appendChild(fld("Observaciones",inp("btN",d.nota,v=>d.nota=v,{autocomplete:"off"})));};
  pinta();
  dlg("Cambio de "+N.uno,[box],[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const a=art(d.art),q=parseN(d.cant);
    if(!d.maq){toast("Elige la inyectora");return false;}if(!a){toast("Elige la "+N.uno);return false;}if(!(q>0)){toast("Pon la cantidad");return false;}if(!d.alm){toast("Elige de qué almacén sale");return false;}
    const neg=stockDe(a.id,d.alm)-q<0;try{await addMov({f:d.f||hoy(),tipo:"salida",art:a.id,alm:d.alm,cant:q,maq:d.maq,motivo:d.motivo,resp:(d.resp||"").trim()||null,nota:"Cambio de "+N.uno+" · "+cap(d.motivo)+(d.nota.trim()?" · "+d.nota.trim():"")});
      if(!(a.iny||[]).includes(d.maq)){const x=art(a.id);x.iny=(x.iny||[]).concat([d.maq]);await saveCat();}
      if(d.resp.trim()&&typeof lsSet==="function")lsSet("alm.resp",d.resp.trim());
      toast("Cambio registrado en "+maqN(d.maq)+(neg?" · ¡no había stock en ese almacén, revisa!":""));}catch(e){toast("No se pudo guardar");return false;}render(true);}}]);}
/* ===== PLANOS CON HISTORIAL DE REVISIONES (barras, tornillos y modelos de eje) ===== */
const revsDe=a=>((a&&a.revs)||[]).slice().sort((x,y)=>x.n-y.n);
const revVig=a=>{const r=revsDe(a);return r[r.length-1]||null;};
const revTxt=n=>"Rev. "+String(n).padStart(2,"0");
const quienSoy=()=>(window.yoNombre&&window.yoNombre())||"";
const revObj=id=>art(id)||(cat.modelos||[]).find(m=>m.id===id);
const esModelo=o=>!o.fam;
const revNom=o=>esModelo(o)?o.cod+" · "+o.ref:(o.cod||o.desc);
const revUd=o=>esModelo(o)?"ejes":o.ud;
const revStock=o=>esModelo(o)?ejes.filter(e=>e.mod===o.cod&&e.estado!=="baja").length:stockDe(o.id);
const reabreRev=o=>{cerrarDlgs();setTimeout(()=>{const z=revObj(o.id);if(!z)return;esModelo(z)?fichaModelo(z):ficha(z);},60);};
const cotasTxt=cs=>(cs||[]).filter(c=>c.n).map(c=>c.n+(c.v?" "+c.v:"")).join(" · ");
function revBox(a){const R=revsDe(a),v=R[R.length-1],hy=hoy();
  const iny=esModelo(a)?inyDe(a):(a.iny||[]).map(maqN).filter(x=>x!=="—");
  const reciente=v&&v.n>1&&dias(v.f,hy)<=30;
  return el("div",{style:"display:flex;flex-direction:column;gap:8px"},[
    el("div",{class:"gh",style:"border-radius:6px",text:"Plano"+(v?" · "+revTxt(v.n)+" vigente":" · sin subir")+(a.plano?" · nº "+a.plano:"")}),
    !esModelo(a)&&iny.length?el("p",{class:"sub",text:"Va en: "+iny.join(", ")}):null,!esModelo(a)&&a.notas?el("p",{class:"sub",text:a.notas}):null,
    reciente?el("div",{class:"banner",text:"Modificado hace "+dias(v.f,hy)+" días ("+fmtF(v.f)+"): "+v.cambio}):null,
    v?el("div",{style:"display:flex;gap:10px;align-items:center;flex-wrap:wrap"},[v.gen?miniGen(a,v):v.doc?docThumb(v.doc):null,el("div",{class:"sub",text:revTxt(v.n)+" · "+fmtF(v.f)+(v.by?" · "+v.by:"")+(v.n>1?" · "+v.cambio:"")})]):el("p",{class:"hint",text:"Todavía no hay plano. Súbelo como Rev. 01."}),
    v&&(v.cotas||[]).length?el("p",{class:"sub",text:"Cotas críticas: "+cotasTxt(v.cotas)}):null,
    el("div",{class:"acciones"},[(v&&v.gen)||(!v&&a.geo)?el("button",{type:"button",class:"btn sec peq",text:v?"Cambiar medidas (nueva revisión)":"Crear plano con las medidas",onclick:()=>{cerrarDlgs();formGeo(a,()=>reabreRev(a));}}):null,
      assets?el("button",{type:"button",class:"btn sec peq",text:v?(v.gen?"Marcar o subir otro plano":"Modificar plano (nueva revisión)"):"Subir plano (Rev. 01)",onclick:()=>{cerrarDlgs();formRev(a,()=>reabreRev(a));}}):null,
      R.length>1?el("button",{type:"button",class:"btn sec peq",text:"Historial ("+R.length+")",onclick:()=>{cerrarDlgs();histRev(a);}}):null])]);}
function formRev(a0,despues){const a=revObj(a0.id);const R=revsDe(a),v=R[R.length-1],n=v?v.n+1:1;const st=revStock(a);
  const x={doc:null,cambio:v?"":"Plano inicial",motivo:"",by:quienSoy(),cotas:JSON.parse(JSON.stringify((v&&v.cotas)||[]))};
  const estado=el("p",{class:"sub",text:v?"Elige cómo hacer la nueva revisión:":"Todavía no has subido el archivo."});
  const sube=subirDoc(async d=>{x.doc=d;estado.textContent="✓ "+d.nombre+" subido";},v?"…o sube un plano nuevo (PDF o foto)":"Plano (PDF o foto)");
  const marcar=v&&(v.doc||v.gen)?el("button",{type:"button",class:"btn",text:"✎ Modificar sobre el plano actual",onclick:async e=>{const b=e.currentTarget;b.disabled=true;
      const blob=await editarPlano(v.gen?{blobFn:()=>blobPlano(a,v,"image/png"),nombre:"plano.png"}:v.doc,()=>[revTxt(n)+" · "+fmtF(hoy())+" · "+(x.by||"").trim(),(x.cambio||"").trim()].filter(Boolean));b.disabled=false;if(!blob)return;
      estado.textContent="Subiendo el plano modificado…";try{const r=await assets.upload(blob);x.doc={id:r.id,nombre:(a.cod||"plano")+"_"+revTxt(n).replace(". ","")+".jpg",tipo:"image/jpeg",fecha:hoy()};estado.textContent="✓ Plano modificado listo ("+revTxt(n)+")";}
      catch(er){estado.textContent="No se pudo subir: "+((er&&er.message)||"error");}}}):null;
  const cot=el("div",{style:"display:grid;gap:6px"});
  const pintaCot=()=>{cot.textContent="";const ant=(v&&v.cotas)||[];x.cotas.forEach((c,i)=>{const prev=ant.find(z=>z.n===c.n);const cambia=v&&(!prev||prev.v!==c.v);
    cot.appendChild(el("div",{style:"display:flex;gap:6px;align-items:center"},[inp("ctN"+i,c.n,z=>{c.n=z;},{placeholder:"Cota (p. ej. Ø46)",autocomplete:"off",style:"flex:1;min-width:0"}),
      inp("ctV"+i,c.v,z=>{c.v=z;},{placeholder:"Valor (p. ej. -0.03/-0.06)",autocomplete:"off",style:"flex:1.3;min-width:0"+(cambia?";border-color:var(--warn)":"")}),
      el("button",{type:"button",class:"btn txt peq",text:"✕","aria-label":"Quitar cota",onclick:()=>{x.cotas.splice(i,1);pintaCot();}})]));});
    cot.appendChild(el("button",{type:"button",class:"btn sec peq",style:"justify-self:start",text:"＋ Cota crítica",onclick:()=>{x.cotas.push({n:"",v:""});pintaCot();}}));};pintaCot();
  dlg((v?"Modificar plano · ":"Plano · ")+revNom(a)+" · "+revTxt(n),[
    v?el("p",{class:"sub",text:"Ahora está vigente la "+revTxt(v.n)+" ("+fmtF(v.f)+"). La nueva será la "+revTxt(n)+"; la anterior queda en el historial."}):null,
    v?fld("Qué cambia",inp("rvC","",z=>x.cambio=z,{autocomplete:"off",placeholder:"p. ej. cota 790 → 795 ±0.5"})):null,
    v?fld("Por qué (opcional)",inp("rvM","",z=>x.motivo=z,{autocomplete:"off",placeholder:"p. ej. se agarrotaba el pistón"})):null,
    fld("Quién lo modifica",inp("rvB",x.by,z=>x.by=z,{autocomplete:"off"})),
    estado,marcar,sube,
    el("div",{class:"gh",style:"border-radius:6px",text:"Cotas críticas (las que garantiza el proveedor)"}),cot,
    el("div",{class:"banner",style:"background:var(--surf2);color:inherit",text:"Ahora hay "+fmtN(st)+" "+revUd(a)+(v?" de la "+revTxt(v.n):"")+". Se apunta en la revisión para que conste cuántas había antes del cambio."})],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar "+revTxt(n),fn:async()=>{if(!x.doc){toast(v?"Modifica el plano o sube uno nuevo":"Sube el archivo del plano");return false;}if(v&&!x.cambio.trim()){toast("Escribe qué cambia");return false;}if(!x.by.trim()){toast("Pon quién lo modifica");return false;}
      const z=revObj(a.id);const alm={};if(!esModelo(z))cat.almacenes.forEach(l=>{const q=stockDe(z.id,l.id);if(q)alm[l.id]=q;});
      const cotas=x.cotas.filter(c=>(c.n||"").trim()).map(c=>({n:c.n.trim(),v:(c.v||"").trim()}));
      z.revs=(z.revs||[]).concat([{n,f:hoy(),ts:Date.now(),by:x.by.trim(),cambio:x.cambio.trim(),motivo:(x.motivo||"").trim()||null,doc:x.doc,stock:st,stockAlm:alm,antes:v?v.n:null,cotas}]);
      try{await saveCat();toast(revTxt(n)+" guardada");}catch(e){return false;}if(despues)despues();}}]);}
function difCotas(a,b){const o=[];(b||[]).forEach(c=>{const p=(a||[]).find(z=>z.n===c.n);if(!p)o.push(c.n+": nueva "+c.v);else if(p.v!==c.v)o.push(c.n+": "+p.v+" → "+c.v);});(a||[]).forEach(c=>{if(!(b||[]).some(z=>z.n===c.n))o.push(c.n+": quitada");});return o;}
function histRev(a0){const a=revObj(a0.id);const A=revsDe(a);const R=A.slice().reverse();
  dlg("Historial del plano · "+revNom(a),[el("div",{class:"lst"},R.map((r,i)=>{const prev=A.find(z=>z.n===r.antes);const dc=prev?difCotas(prev.cotas,r.cotas):[];
    return el("div",{class:"it",style:"cursor:default;flex-wrap:wrap;align-items:flex-start"},[el("span",{class:"stripe "+(i===0?"ok":"")}),
    el("div",{class:"ppal"},[el("div",{class:"t1",text:revTxt(r.n)+(i===0?" · vigente":" · obsoleta")+" · "+fmtF(r.f)}),
      el("div",{class:"t2",text:[r.by?"por "+r.by:null,r.n>1?"Cambio: "+r.cambio:"Plano inicial",r.motivo?"Motivo: "+r.motivo:null,dc.length?"Cotas: "+dc.join("; "):null,r.antes!=null?"Había "+fmtN(r.stock)+" "+revUd(a)+" de la "+revTxt(r.antes):"Al subirlo había "+fmtN(r.stock)+" "+revUd(a)].filter(Boolean).join(" · ")})]),
    r.gen?el("button",{type:"button",class:"btn sec peq",text:"Ver plano",onclick:()=>verPlanoGen(a,r)}):r.doc?el("button",{type:"button",class:"btn sec peq",text:"Ver plano",onclick:()=>abrirDoc(r.doc)}):null]);})),
    el("p",{class:"hint",text:"Las revisiones no se borran: así siempre se puede consultar qué plano había y cuándo cambió."})],[{t:"Cerrar",cls:"sec"}]);}
/* ===== GENERADOR DE PLANOS DE BARRAS EXPULSORAS (se dibuja a partir de las medidas) ===== */
const EXT_T={M16i:"Rosca interior M16",M20i:"Rosca interior M20",M16e:"Espárrago M16 × 140"};
const geoDef=g=>Object.assign({d:30,L:400,ext:"M16i",lr:25,ec:25,rd:"M20",nota:""},g||{});
const geoTot=g=>(+g.L||0)+(+g.lr||0);
function cotasGeo(g){g=geoDef(g);return[{n:"Longitud importante",v:g.L+" ±0.2"},{n:"Longitud total",v:String(geoTot(g))},{n:"Ø cuerpo",v:"Ø"+g.d+" ±0.25"},{n:"Rosca punta",v:g.rd+" × "+g.lr},{n:"Entrecaras",v:"e/c "+g.ec},{n:"Extremo",v:EXT_T[g.ext]||g.ext}];}
function difGeo(a,b){const o=[],A=geoDef(a),B=geoDef(b);[["L","Longitud importante"],["d","Ø cuerpo"],["lr","Largo rosca punta"],["ec","Entrecaras"],["rd","Rosca punta"]].forEach(([k,t])=>{if(String(A[k])!==String(B[k]))o.push(t+" "+A[k]+" → "+B[k]);});
  if(A.ext!==B.ext)o.push("Extremo: "+(EXT_T[A.ext]||A.ext)+" → "+(EXT_T[B.ext]||B.ext));if((A.nota||"")!==(B.nota||""))o.push("Nota cambiada");return o;}
function svgBarra(a,rev,hist){const g=geoDef(rev.gen),esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
  const L=+g.L,lr=+g.lr,tot=L+lr,d=+g.d,ec=+g.ec,stud=g.ext==="M16e"?140:0;
  const IZ=300,DE=Math.min(70,Math.max(20,L-IZ-10)),GAP=16;const roto=L>IZ+DE+10;
  const anch=stud+(roto?IZ+DE+lr+GAP/0.5:L+lr);const s=Math.min(0.52,215/anch);
  const x0=22+stud*s,y=104,r=d/2*s,f=ec/2*s,xr=roto?x0+IZ*s+GAP:x0;
  const X=p=>!roto||p<=IZ?x0+p*s:xr+(p-(L-DE))*s;
  const F=n=>n.toFixed(2);
  const ln=(x1,y1,x2,y2,c)=>'<line x1="'+F(x1)+'" y1="'+F(y1)+'" x2="'+F(x2)+'" y2="'+F(y2)+'"'+(c?' class="'+c+'"':'')+'/>';
  const tx=(x,yy,t,c,an)=>'<text x="'+F(x)+'" y="'+F(yy)+'" text-anchor="'+(an||"middle")+'"'+(c?' class="'+c+'"':'')+'>'+esc(t)+'</text>';
  const txV=(x,yy,t,c)=>'<text transform="translate('+F(x)+' '+F(yy)+') rotate(-90)" text-anchor="middle"'+(c?' class="'+c+'"':'')+'>'+esc(t)+'</text>';
  /* cota horizontal con líneas de referencia desde la pieza */
  const cotaH=(x1,x2,yy,t,yref)=>ln(x1,yref,x1,yy+1.2,"fino")+ln(x2,yref,x2,yy+1.2,"fino")+ln(x1,yy,x2,yy,"cota")+tx((x1+x2)/2,yy-0.9,t,"num");
  const cotaV=(xx,y1,y2,t,xref,lado)=>ln(xref,y1,xx-(lado||1)*1.2,y1,"fino")+ln(xref,y2,xx-(lado||1)*1.2,y2,"fino")+ln(xx,y1,xx,y2,"cota")+txV(xx-0.9,(y1+y2)/2,t,"num");
  let S="";
  /* contorno con los rebajes de las entrecaras */
  const tramos=[[0,50,r],[50,80,f],[80,250,r],[250,280,f],[280,roto?IZ:L,r]].filter(t=>t[0]<(roto?IZ:L));if(roto)tramos.push([L-DE,L,r]);
  tramos.forEach(([a1,a2,rr],i)=>{const p1=X(a1),p2=X(a2);S+=ln(p1,y-rr,p2,y-rr,"g")+ln(p1,y+rr,p2,y+rr,"g");
    const prev=tramos[i-1];if(!prev||prev[1]!==a1)S+=(a1===0||a1===L-DE&&roto?"":"")+(a1===0?ln(p1,y-rr,p1,y+rr,"g"):"");else S+=ln(p1,y-Math.max(rr,prev[2]),p1,y-Math.min(rr,prev[2]),"g")+ln(p1,y+Math.min(rr,prev[2]),p1,y+Math.max(rr,prev[2]),"g");
    if(rr===f&&a2-a1===30){const m=0.9;S+='<rect x="'+F(p1+m)+'" y="'+F(y-f+m)+'" width="'+F(p2-p1-2*m)+'" height="'+F(2*f-2*m)+'" class="fino"/>'+ln(p1+m,y-f+m,p2-m,y+f-m,"fino")+ln(p1+m,y+f-m,p2-m,y-f+m,"fino");}});
  /* rotura: curva en S con media luna rayada */
  if(roto){const lun=(bx,k)=>{const top='M'+F(bx)+' '+F(y-r)+' C '+F(bx+4*k)+' '+F(y-r*0.55)+', '+F(bx+4*k)+' '+F(y-r*0.1)+', '+F(bx)+' '+F(y)+' C '+F(bx-1.6*k)+' '+F(y-r*0.25)+', '+F(bx-1.6*k)+' '+F(y-r*0.75)+', '+F(bx)+' '+F(y-r)+' Z';
      const bot='M'+F(bx)+' '+F(y)+' C '+F(bx-4*k)+' '+F(y+r*0.1)+', '+F(bx-4*k)+' '+F(y+r*0.55)+', '+F(bx)+' '+F(y+r)+' C '+F(bx+1.6*k)+' '+F(y+r*0.75)+', '+F(bx+1.6*k)+' '+F(y+r*0.25)+', '+F(bx)+' '+F(y)+' Z';
      return '<path d="'+top+'" class="rayado"/><path d="'+bot+'" class="rayado"/>';};
    S+=lun(X(IZ),1)+lun(xr,-1);}
  const xL=X(L);S+=ln(xL,y-r,xL,y+r,"g");
  /* rosca de la punta (M20 por defecto) */
  const rt=(g.rd==="M16"?8:10)*s,xe=xL+lr*s,ch=0.9;S+=ln(xL,y-rt,xe-ch,y-rt,"g")+ln(xL,y+rt,xe-ch,y+rt,"g")+ln(xe-ch,y-rt,xe,y-rt+ch,"g")+ln(xe-ch,y+rt,xe,y+rt-ch,"g")+ln(xe,y-rt+ch,xe,y+rt-ch,"g")+ln(xL+0.4,y-rt*0.82,xe-ch,y-rt*0.82,"fino")+ln(xL+0.4,y+rt*0.82,xe-ch,y+rt*0.82,"fino");
  S+=cotaV(xe+6,y-rt,y+rt,g.rd,xe+0.5);
  /* extremo izquierdo */
  if(g.ext==="M16e"){const rs=8*s,xs=x0-140*s;S+=ln(xs+ch,y-rs,x0,y-rs,"g")+ln(xs+ch,y+rs,x0,y+rs,"g")+ln(xs,y-rs+ch,xs+ch,y-rs,"g")+ln(xs,y+rs-ch,xs+ch,y+rs,"g")+ln(xs,y-rs+ch,xs,y+rs-ch,"g")+ln(xs+ch,y-rs*0.82,x0,y-rs*0.82,"fino")+ln(xs+ch,y+rs*0.82,x0,y+rs*0.82,"fino")+ln(x0,y-r,x0,y+r,"g");
    S+=cotaV(xs-4,y-rs,y+rs,"M16",xs-0.5)+cotaH(xs,x0,y+r+12,"140",y+rs+1);
    S+=cotaV(X(22),y-r,y+r,"Ø"+d+" ±0.25",X(22));}
  else{const ri=(g.ext==="M20i"?10:8)*s,pr=g.ext==="M20i"?35:30;S+=ln(x0,y-ri,x0+pr*s,y-ri,"oculta")+ln(x0,y+ri,x0+pr*s,y+ri,"oculta");
    if(g.ext==="M16i"){S+=ln(x0+30*s,y-ri,x0+35*s,y,"oculta")+ln(x0+30*s,y+ri,x0+35*s,y,"oculta")+ln(x0,y-ri*0.8,x0+30*s,y-ri*0.8,"fino")+ln(x0,y+ri*0.8,x0+30*s,y+ri*0.8,"fino");
      S+=cotaH(x0,x0+30*s,y-r-9,"30",y-r)+cotaH(x0,x0+35*s,y-r-17,"35",y-r);}
    else{S+=ln(x0+pr*s,y-ri,x0+pr*s,y+ri,"oculta")+cotaH(x0,x0+pr*s,y-r-10,String(pr),y-r);}
    S+=cotaV(x0-13,y-r,y+r,"Ø"+d+" ±0.25",x0-0.5)+cotaV(x0-5,y-ri,y+ri,g.ext==="M20i"?"M20":"M16",x0-0.5);}
  /* eje */
  S+=ln((g.ext==="M16e"?x0-140*s:x0)-5,y,xe+3,y,"eje");
  /* cotas de longitud, como en los planos de CIE */
  const yb=y+r;S+=cotaH(X(0),X(50),yb+13,"50",yb+0.5)+cotaH(X(50),X(80),yb+13,"30",yb+0.5)+cotaH(X(0),X(250),yb+23,"250",yb+0.5)+cotaH(X(250),X(280),yb+23,"30",yb+0.5)
    +cotaH(X(0),xL,yb+32,L+" ±0.2",yb+0.5)+cotaH(X(0),xe,yb+41,String(tot),yb+0.5)+cotaH(xL,xe,yb+13,String(lr),y+rt+0.5);
  /* vista de la punta con su entrecaras */
  const cx=276,R=Math.max(r,8.5),Ri=R*0.42;S+='<circle cx="'+cx+'" cy="'+y+'" r="'+F(R)+'" class="g"/><circle cx="'+cx+'" cy="'+y+'" r="'+F(R*0.78)+'" class="fino"/><circle cx="'+cx+'" cy="'+y+'" r="'+F(Ri)+'" class="g"/><circle cx="'+cx+'" cy="'+y+'" r="'+F(Ri*0.85)+'" class="fino"/>'
    +ln(cx-R-3,y,cx+R+3,y,"eje")+ln(cx,y-R-3,cx,y+R+3,"eje")+cotaH(cx-R*0.75,cx+R*0.75,y-R-6,"e/c"+ec,y-R*0.66);
  /* marcado: nube y máquinas sobre la barra */
  const maqs=(a.iny||[]).map(id=>maqN(id)).filter(z=>z&&z!=="—").map(z=>"F-"+z.replace(/^F/,""));
  const mtxt=maqs.join(",")||a.cod||"";const xm=X(95),cxn=Math.min(Math.max(X(160),82),200),cyn=y-r-30,wn=104,hn=17;
  S+=nube(cxn-wn/2,cyn-hn/2,wn,hn)+tx(cxn,cyn+2.6,"Marcar en todas las barras","iso");
  const tyM=y+(r>8?-1.2:-r-1.5);S+=ln(cxn-wn/2+22,cyn+hn/2+0.5,xm+3,tyM-5.2,"fino")+tx(xm,tyM,mtxt,"isoM","start");
  /* nota (tornillos…) */
  if(g.nota){const m=/^(.*?deben tener)\s+(.*)$/i.exec(g.nota);if(m){S+=tx(16,26,m[1],"isoN","start")+'<rect x="16" y="31" width="'+F(Math.max(70,m[2].length*3.15))+'" height="12" class="g"/>'+tx(19,39.5,cap(m[2]),"isoN","start");}else S+=tx(16,26,g.nota,"isoN","start");}
  /* cajetín como el de CIE Inyectametal */
  const cx0=164,cy0=158,W=125,c1=7,c2=60,c3=92;const H1=4.2;let C="";
  const row=(yy,h)=>'<rect x="'+cx0+'" y="'+F(yy)+'" width="'+W+'" height="'+F(h)+'" class="c"/>';
  C+=row(cy0,H1)+row(cy0+H1,H1);[c1,c2,c3].forEach(c=>{C+=ln(cx0+c,cy0,cx0+c,cy0+2*H1,"c");});
  C+=tx(cx0+3.5,cy0+3.2,"1","isoC")+tx(cx0+c1+2,cy0+3.2,"Barra de expulsion","isoC","start")+tx(cx0+c2+2,cy0+3.2,"Fe-510b","isoC","start")+tx(cx0+c3+1.5,cy0+3.1,(a.cod||"")+" · "+revTxt(rev.n),"isoR","start");
  C+=tx(cx0+3.5,cy0+H1+3.2,"N.º","isoS")+tx(cx0+c1+2,cy0+H1+3.2,"Denominación","isoS","start")+tx(cx0+c2+2,cy0+H1+3.2,"Material","isoS","start")+tx(cx0+c3+2,cy0+H1+3.2,"Observaciones","isoS","start");
  const yB=cy0+2*H1,hB=14;C+='<rect x="'+cx0+'" y="'+F(yB)+'" width="'+W+'" height="'+hB+'" class="c"/>';
  const g1=16,g2=27,g3=38,g4=50;C+=ln(cx0+g1,yB,cx0+g1,yB+hB,"c")+ln(cx0+g2,yB,cx0+g2,yB+hB,"c")+ln(cx0+g3,yB,cx0+g3,yB+hB,"c")+ln(cx0+g4,yB,cx0+g4,yB+hB,"c")+ln(cx0,yB+4,cx0+g4,yB+4,"c")+ln(cx0,yB+9,cx0+g4,yB+9,"c");
  C+=tx(cx0+g1+5.5,yB+2.9,"Proyectado","isoXS")+tx(cx0+g2+5.5,yB+2.9,"Dibujado","isoXS")+tx(cx0+g3+6,yB+2.9,"Comprobado","isoXS");
  C+=tx(cx0+1.5,yB+7.6,"Fechas","isoS","start")+tx(cx0+1.5,yB+12.6,"Firmas","isoS","start")+tx(cx0+g2+5.5,yB+7.6,(rev.by||"").slice(0,12),"isoXS")+tx(cx0+g2+5.5,yB+12.6,fmtF(rev.f),"isoXS");
  const xr0=cx0+97;C+=ln(xr0,yB,xr0,yB+hB,"c")+ln(xr0+4,yB,xr0+4,yB+hB,"c")+ln(xr0+4,yB+hB/3,cx0+W,yB+hB/3,"c")+ln(xr0+4,yB+2*hB/3,cx0+W,yB+2*hB/3,"c")+txV(xr0+2.9,yB+hB/2,"Referencia","isoXS");
  C+=tx(xr0+5,yB+3.6,a.cod||"","isoS","start")+tx(xr0+5,yB+8.3,revTxt(rev.n),"isoS","start")+tx(xr0+5,yB+13,(g.tipo||a.tipoIny||"").slice(0,14),"isoXS","start");
  const lx=cx0+g4+6,ly=yB+hB/2;C+='<circle cx="'+F(lx)+'" cy="'+F(ly)+'" r="3.3" style="fill:#333;stroke:none"/><circle cx="'+F(lx+1.3)+'" cy="'+F(ly)+'" r="1.9" style="fill:#fff;stroke:none"/><rect x="'+F(lx+1.3)+'" y="'+F(ly-0.7)+'" width="2.4" height="1.4" style="fill:#fff;stroke:none"/>'+tx(lx+5,ly+1.4,"CIE Inyectametal","isoC","start");
  const yC=yB+hB,hC=14;C+='<rect x="'+cx0+'" y="'+F(yC)+'" width="'+W+'" height="'+hC+'" class="c"/>'+ln(cx0+16,yC,cx0+16,yC+hC,"c")+ln(xr0,yC,xr0,yC+hC,"c")+ln(xr0,yC+hC/2,cx0+W,yC+hC/2,"c");
  C+=tx(cx0+1.5,yC+3.6,"Escala:","isoS","start")+tx(cx0+8,yC+10.8,"S/E","isoT")+tx(cx0+19,yC+9.6,"Barra expulsion "+mtxt,"isoT","start");
  C+=tx(xr0+1.5,yC+4.6,"N.º "+(a.cod||""),"isoS","start")+tx(xr0+1.5,yC+11.6,rev.antes?"Anula al "+revTxt(rev.antes):"Anula al —","isoS","start");
  /* historial corto de revisiones encima del cajetín */
  const H=(hist||[]).filter(h=>h.n>1).slice(-3);let Rv="";if(H.length){let yy=cy0-3-H.length*4.6;Rv+='<rect x="'+cx0+'" y="'+F(yy-3.6)+'" width="'+W+'" height="'+F(H.length*4.6+1.6)+'" class="c"/>';H.forEach((h,i)=>{Rv+=tx(cx0+1.5,yy+i*4.6,revTxt(h.n)+" · "+fmtF(h.f)+" · "+(h.cambio||"").slice(0,62),"isoS","start");});}
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210" width="297mm" height="210mm" font-family="\'Arial Narrow\', Arial, Helvetica, sans-serif" font-size="3.2"><style>line,path,circle,rect{stroke:#222;stroke-width:0.22;fill:none}.g{stroke-width:0.5;stroke:#111}.fino{stroke-width:0.17}.cota{stroke-width:0.17;marker-start:url(#fl);marker-end:url(#fl)}.oculta{stroke-dasharray:1.4 0.7;stroke-width:0.25}.eje{stroke-dasharray:7 1 1 1;stroke-width:0.16}.c{stroke-width:0.3}.rayado{fill:url(#ray);stroke-width:0.3}.nube{stroke-width:0.25}text{fill:#111;stroke:none}.num{font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:3}.iso,.isoM,.isoN,.isoC,.isoS,.isoXS,.isoT,.isoR{font-style:italic;font-family:\'Century Gothic\',\'Segoe UI\',Arial,sans-serif;font-weight:300}.iso{font-size:6.2;letter-spacing:0.4}.isoM{font-size:5.2;letter-spacing:0.2}.isoN{font-size:5.6;letter-spacing:0.3}.isoC{font-size:3.3}.isoS{font-size:2.8}.isoXS{font-size:2}.isoT{font-size:5}.isoR{font-size:3;fill:#b00;font-weight:bold}</style><defs><marker id="fl" viewBox="0 0 8 6" refX="8" refY="3" markerWidth="4.5" markerHeight="3.4" orient="auto-start-reverse"><path d="M0 0.6 L8 3 L0 5.4 z" style="fill:#111;stroke:none"/></marker><pattern id="ray" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.4" style="stroke:#111;stroke-width:0.25"/></pattern></defs><rect x="0" y="0" width="297" height="210" style="fill:#fff;stroke:none"/><rect x="8" y="8" width="281" height="194" class="c"/>'+S+Rv+C+'</svg>';}
/* nube de revisión con lóbulos, como las de AutoCAD */
function nube(x,y,w,h){const st=6.2,P=[];const add=(x1,y1,x2,y2)=>{const Ld=Math.hypot(x2-x1,y2-y1),n=Math.max(1,Math.round(Ld/st));for(let i=0;i<n;i++)P.push([x1+(x2-x1)*i/n,y1+(y2-y1)*i/n]);};
  add(x,y,x+w,y);add(x+w,y,x+w,y+h);add(x+w,y+h,x,y+h);add(x,y+h,x,y);let dd="M"+P[0][0].toFixed(2)+" "+P[0][1].toFixed(2);
  for(let i=1;i<=P.length;i++){const q=P[i%P.length],p=P[i-1];const rr=Math.hypot(q[0]-p[0],q[1]-p[1])*0.62;dd+=" A "+rr.toFixed(2)+" "+rr.toFixed(2)+" 0 0 1 "+q[0].toFixed(2)+" "+q[1].toFixed(2);}
  return '<path d="'+dd+'" class="nube"/>';}
function blobPlano(a,rev,tipo){const svg=genDe(a).svg(a,rev,revsDe(a).filter(r=>r.n<=rev.n));return new Promise((ok,ko)=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");c.width=3508;c.height=2480;const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);c.toBlob(b=>b?ok(b):ko(new Error("no se pudo dibujar")),tipo||"image/png");};img.onerror=()=>ko(new Error("no se pudo dibujar el plano"));img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);});}
function verPlanoGen(a,rev){const svg=genDe(a).svg(a,rev,revsDe(a).filter(r=>r.n<=rev.n));let z=1;
  const cont=el("div",{class:"pv-c"});cont.innerHTML=svg;const sv=cont.querySelector("svg");sv.removeAttribute("width");sv.removeAttribute("height");
  const zoom=k=>{z=Math.max(1,Math.min(4,z*k));sv.style.width=(z*100)+"%";};zoom(1);
  const cerrar=()=>{if(!ov.isConnected)return;ov.remove();document.removeEventListener("keydown",tec);window.removeEventListener("popstate",atras);document.body.classList.remove("pv-print");if(history.state&&history.state.pv)history.back();};
  const atras=()=>{if(ov.isConnected){ov.remove();document.removeEventListener("keydown",tec);window.removeEventListener("popstate",atras);}};
  const tec=e=>{if(e.key==="Escape")cerrar();};
  const ov=el("div",{class:"pv",role:"dialog","aria-modal":"true","aria-label":"Plano "+(a.cod||"")},[
    el("div",{class:"pv-bar"},[el("button",{type:"button",class:"pv-b pv-x",text:"✕ Cerrar",onclick:cerrar}),el("span",{class:"pv-t",text:(a.cod||"")+" · "+revTxt(rev.n)}),
      el("button",{type:"button",class:"pv-b",text:"−","aria-label":"Alejar",onclick:()=>zoom(1/1.4)}),el("button",{type:"button",class:"pv-b",text:"+","aria-label":"Acercar",onclick:()=>zoom(1.4)}),
      downloads?el("button",{type:"button",class:"pv-b",text:"Descargar",onclick:async()=>{try{const b=await blobPlano(a,rev,"image/png");await downloads.save({filename:(a.cod||"plano")+"_"+revTxt(rev.n).replace(". ","")+".png",data:b});toast("Plano descargado");}catch(e){toast("No se pudo descargar");}}}):null,
      el("button",{type:"button",class:"pv-b",text:"Imprimir",onclick:()=>{document.body.classList.add("pv-print");setTimeout(()=>{window.print();setTimeout(()=>document.body.classList.remove("pv-print"),500);},50);}})]),cont]);
  document.body.appendChild(ov);document.addEventListener("keydown",tec);try{history.pushState({pv:1},"");}catch(e){}window.addEventListener("popstate",atras);}
function miniGen(a,rev){const d=el("div",{style:"width:180px;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:#fff;cursor:zoom-in",onclick:()=>verPlanoGen(a,rev),title:"Abrir plano"});d.innerHTML=genDe(a).svg(a,rev,revsDe(a).filter(r=>r.n<=rev.n));const s=d.querySelector("svg");s.removeAttribute("width");s.removeAttribute("height");s.style.width="100%";s.style.height="auto";return d;}
function camposBarra(g,pinta){const num=(id,lab,k)=>fld(lab,inp(id,g[k],z=>{const q=parseN(z);if(isFinite(q)&&q>0){g[k]=q;pinta();}},{inputmode:"decimal",class:"num"}));
  const extS=sel("gfE",Object.entries(EXT_T),g.ext,z=>{g.ext=z;pinta();});
  return[el("div",{class:"row"},[num("gfL","Longitud importante (±0.2)","L"),num("gfD","Ø cuerpo (±0.25)","d")]),
    el("div",{class:"row"},[num("gfR","Largo rosca punta","lr"),num("gfEC","Entrecaras (e/c)","ec")]),
    el("div",{class:"row"},[fld("Extremo",extS),fld("Rosca punta",sel("gfRD",[["M20","M20"],["M16","M16"]],g.rd,z=>{g.rd=z;pinta();}))]),
    fld("Nota en el plano (opcional)",inp("gfN",g.nota,z=>{g.nota=z;pinta();},{autocomplete:"off",placeholder:"p. ej. Tornillos DIN912 M20x120"}))];}
const genDe=a=>esModelo(a)?{def:geoEjeDef,svg:svgEje,cotas:cotasEje,dif:difEje,campos:camposEje}:{def:geoDef,svg:svgBarra,cotas:cotasGeo,dif:difGeo,campos:camposBarra};
/* formulario: cambiar medidas → nueva revisión dibujada */
function formGeo(a0,despues){const a=revObj(a0.id);const R=revsDe(a),v=R[R.length-1];const n=v?v.n+1:1;const G=genDe(a);const g=G.def(JSON.parse(JSON.stringify((v&&v.gen)||a.geo||{})));const x={by:quienSoy(),cambio:"",motivo:"",tocado:false};const st=revStock(a);
  const prev=el("div",{style:"background:#fff;border:1px solid var(--line);border-radius:8px;overflow:hidden"});const dif=el("p",{class:"sub"});
  const pinta=()=>{prev.innerHTML=G.svg(a,{n,f:hoy(),by:x.by,gen:g},R.concat([{n,f:hoy(),cambio:x.cambio||"(sin describir)"}]));const s=prev.querySelector("svg");s.removeAttribute("width");s.removeAttribute("height");s.style.width="100%";s.style.height="auto";
    const ds=v&&v.gen?G.dif(v.gen,g):[];dif.textContent=ds.length?"Cambios: "+ds.join(" · "):(v?"Todavía no has cambiado ninguna medida.":"");if(!x.tocado){x.cambio=ds.join(" · ");const ci=document.getElementById("gfC");if(ci)ci.value=x.cambio;}};
  const campos=G.campos(g,pinta);pinta();
  dlg((v?"Modificar medidas · ":"Plano · ")+(a.cod||a.desc)+" · "+revTxt(n),[
    ...campos,prev,dif,
    v?fld("Qué cambia (se rellena solo; puedes completarlo)",inp("gfC",x.cambio,z=>{x.cambio=z;x.tocado=true;},{autocomplete:"off"})):null,
    v?fld("Por qué (opcional)",inp("gfM","",z=>x.motivo=z,{autocomplete:"off"})):null,
    fld("Quién lo modifica",inp("gfB",x.by,z=>{x.by=z;pinta();},{autocomplete:"off"})),
    el("div",{class:"banner",style:"background:var(--surf2);color:inherit",text:"Ahora hay "+fmtN(st)+" "+revUd(a)+(v?" de la "+revTxt(v.n):"")+". Se apunta en la revisión."})],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar "+revTxt(n),fn:async()=>{const ds=v&&v.gen?G.dif(v.gen,g):["x"];if(v&&!ds.length){toast("No has cambiado ninguna medida");return false;}if(v&&!(x.cambio||"").trim()){toast("Escribe qué cambia");return false;}if(!(x.by||"").trim()){toast("Pon quién lo modifica");return false;}
      const z=revObj(a.id);const alm={};if(!esModelo(z))cat.almacenes.forEach(l=>{const q=stockDe(z.id,l.id);if(q)alm[l.id]=q;});
      z.revs=(z.revs||[]).concat([{n,f:hoy(),ts:Date.now(),by:x.by.trim(),cambio:v?x.cambio.trim():"Plano inicial",motivo:(x.motivo||"").trim()||null,gen:Object.assign({},g),doc:null,stock:st,stockAlm:alm,antes:v?v.n:null,cotas:G.cotas(g)}]);z.geo=Object.assign({},g);
      try{await saveCat();toast(revTxt(n)+" guardada");}catch(e){return false;}if(despues)despues();}}]);}


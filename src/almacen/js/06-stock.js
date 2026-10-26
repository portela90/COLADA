/* ===== STOCK ===== */
function vStock(v){
  v.appendChild(el("div",{class:"acc3"},[el("button",{type:"button",class:"btn peq",text:"Lista de pedido",onclick:listaPedido}),el("button",{type:"button",class:"btn sec peq",text:"Informe",onclick:()=>generarInforme()}),el("button",{type:"button",class:"btn sec peq",text:"Inventario",onclick:formInventario})]));
  const enCurso=artsActivos().filter(a=>a.pedido).sort((a,b)=>(a.prevista||"9").localeCompare(b.prevista||"9"));
  if(enCurso.length){const hy=hoy();v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Pedidos en curso ("+enCurso.length+")"}),el("span",{class:"der sub",text:enCurso.filter(a=>a.prevista&&a.prevista<hy).length+" retrasados"})]),
    el("div",{class:"lst"},enCurso.map(a=>{const ret=a.prevista&&a.prevista<hy?dias(a.prevista,hy):0;
      return el("div",{class:"it",style:"cursor:default;flex-wrap:wrap"},[el("span",{class:"stripe "+(ret?"bad":"ok")}),el("div",{class:"ppal"},[el("div",{class:"t1",text:a.desc}),
        el("div",{class:"t2",text:["Pedido "+fmtF(a.pedido),a.pedCant?fmtN(a.pedCant)+" "+a.ud:null,provN(a.prov),a.prevista?"llega "+fmtF(a.prevista):"sin plazo de entrega"].filter(Boolean).join(" · ")})]),
        el("span",{class:"pill "+(ret?"bad":"info"),text:ret?"Retrasado "+ret+" d":a.prevista?"En plazo":"Pedido"}),
        el("div",{style:"display:flex;gap:8px;width:100%;margin-top:6px"},[el("button",{type:"button",class:"btn peq",text:"Ha llegado",onclick:()=>{Object.assign(draft.m,{tipo:"entrada",art:a.id,alm:draft.m.alm||(cat.almacenes[0]||{}).id||"",cant:a.pedCant?String(a.pedCant):"",prov:a.prov||""});irA("mov");}}),
          el("button",{type:"button",class:"btn sec peq",text:"Anular pedido",onclick:()=>confirmar("¿Anular el pedido?",a.desc+": deja de figurar como pedido.","Anular",()=>marcarPedido(a,null))})])]);}))]));}
  if(!cat.articulos.length){v.appendChild(el("div",{class:"card"},el("div",{class:"empty"},["Aún no hay artículos. ",el("button",{type:"button",class:"btn peq",text:"Añadir en Catálogo",onclick:()=>irA("cat")})])));return;}
  const alertas=artsActivos().map(a=>({a,n:nivel(a)})).filter(x=>!x.a.pedido&&(x.n==="bad"||x.n==="warn")).sort((x,y)=>(x.n==="bad"?0:1)-(y.n==="bad"?0:1)||x.a.desc.localeCompare(y.a.desc));
  if(alertas.length){v.appendChild(el("section",{class:"card alerta"},[el("div",{class:"hd"},[el("h2",{text:"Para pedir ("+alertas.length+")"})]),
    el("div",{class:"lst"},alertas.map(({a,n})=>{const st=stockDe(a.id);const pedir=cantPedir(a);
      return el("div",{class:"it",style:"cursor:default"},[el("span",{class:"stripe "+n}),
        el("div",{class:"ppal"},[el("div",{class:"t1",text:a.desc}),el("div",{class:"t2",text:(Math.ceil(puntoPedido(a))>(+a.min||0)?"Mín "+fmtN(+a.min||0)+" · pedir al llegar a "+fmtN(Math.ceil(puntoPedido(a))):"Mínimo "+fmtN(+a.min||0))+(provN(a.prov)?" · "+provN(a.prov):"")}),
          a.pedido?el("div",{class:"t2"},[el("span",{class:"pill info",text:"Pedido "+fmtF(a.pedido)})," ",el("button",{type:"button",class:"btn txt peq",text:"Quitar",onclick:()=>marcarPedido(a,null)})])
                  :el("div",{style:"margin-top:6px"},el("button",{type:"button",class:"btn sec peq",text:"Marcar pedido"+(pedir?" ("+fmtN(pedir)+" "+a.ud+")":""),onclick:()=>marcarPedido(a,hoy())}))]),
        el("div",{class:"cant num"},[el("b",{text:fmtN(st)}),el("small",{text:a.ud+" · "+NIV[n]})])]);}))]));}
  const f=draft.fs;
  const buscar=inp("fsTxt",f.txt,x=>{f.txt=x;pintarLista();},{type:"search",placeholder:"Buscar artículo o código",autocomplete:"off"});
  v.appendChild(el("div",{class:"frm",style:"gap:10px"},[buscar,
    el("div",{class:"chips"},[["","Todos"]].concat(Object.entries(FAM)).map(([k,t])=>el("button",{type:"button",class:"chip","aria-pressed":String(f.fam===k),text:t,onclick:()=>{f.fam=k;render(true);}}))),
    cat.almacenes.length>1?el("div",{class:"chips"},[["","Todos los almacenes"]].concat(almOpts()).map(([k,t])=>el("button",{type:"button",class:"chip","aria-pressed":String(f.alm===k),text:t,onclick:()=>{f.alm=k;render(true);}}))):null]));
  const card=el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Existencias"+(f.alm?" · "+almN(f.alm):"")})]),el("div",{class:"lst",id:"lstStock"})]);
  v.appendChild(card);pintarLista();}
function pintarLista(){const box=$("lstStock");if(!box)return;box.textContent="";const f=draft.fs,q=tokQ(f.txt);
  const arr=artsActivos().filter(a=>(!f.fam||a.fam===f.fam)&&(!q.length||casa([a.desc,a.cod,a.diam,a.ubic,a.grupo,(a.iny||[]).map(maqN).join(" ")].join(" "),q)))
    .sort((a,b)=>a.fam.localeCompare(b.fam)||a.desc.localeCompare(b.desc,"es",{numeric:true}));
  if(!arr.length){box.appendChild(el("div",{class:"empty",text:"Ningún artículo coincide."}));return;}
  let fam="";arr.forEach(a=>{if(a.fam!==fam&&!f.fam){fam=a.fam;box.appendChild(el("div",{class:"gh",text:FAM[fam]}));}
    const n=nivel(a),st=f.alm?stockDe(a.id,f.alm):stockDe(a.id);
    const rep=almsDe(a).map(l=>corto(l)+" "+fmtN(stockDe(a.id,l.id))).join(" · ");
    box.appendChild(el("button",{type:"button",class:"it",onclick:()=>ficha(a)},[el("span",{class:"stripe "+(n==="na"?"":n)}),
      el("div",{class:"ppal"},[el("div",{class:"t1",text:a.desc}),el("div",{class:"t2",text:[a.cod,envTxt(a),(a.iny||[]).length?"Iny. "+a.iny.map(maqN).join(", "):null,a.ubic?""+a.ubic:null,rep||"Sin existencias"].filter(Boolean).join(" · ")})]),
      el("div",{class:"cant num"},[el("b",{text:fmtN(st)}),el("small",{text:a.ud})])]));});}
function aplicarPedido(x,f){if(f){const q=cantPedir(x);x.pedido=f;x.pedCant=q||null;const pl=plazoArt(x);x.prevista=pl?sumaDias(f,pl):null;}else{delete x.pedido;delete x.pedCant;delete x.prevista;}}
async function marcarPedido(a,f){const x=art(a.id);if(!x)return;aplicarPedido(x,f);try{await saveCat();toast(f?"Marcado como pedido":"Marca quitada");}catch(e){}render(true);}
/* planos y documentos (PDF o foto) */
function abrirDoc(d){const w=window.open("","_blank");Promise.resolve(window.urlFirmada?window.urlFirmada(d.id):fotoUrl(d.id)).then(u=>{if(!u){if(w)w.close();toast("No se pudo abrir");return;}if(w)w.location=u;else location.href=u;});}
function docThumb(d,quitar){const esImg=/^image\//.test(d.tipo||"");let img=null;
  if(esImg){img=el("img",{alt:d.nombre,style:"width:130px;height:100px;object-fit:cover;border-radius:8px;border:1px solid var(--line);cursor:zoom-in;background:#fff",onclick:()=>{Promise.resolve(window.urlFirmada?window.urlFirmada(d.id):fotoUrl(d.id)).then(u=>{if(u)lightbox(u);});}});
    Promise.resolve(window.urlFirmada?window.urlFirmada(d.id):fotoUrl(d.id)).then(u=>{if(u)img.src=u;});}
  return el("div",{style:"display:flex;flex-direction:column;align-items:flex-start;gap:4px;max-width:140px"},[esImg?img:el("button",{type:"button",class:"btn sec peq",text:"Abrir PDF",onclick:()=>abrirDoc(d)}),
    el("span",{class:"sub",style:"overflow-wrap:anywhere",text:d.nombre}),quitar&&assets?el("button",{type:"button",class:"btn txt peq",style:"padding:0",text:"Quitar",onclick:()=>confirmar("¿Quitar "+d.nombre+"?","Se quita el archivo de la ficha.","Quitar",quitar)}):null]);}
function subirDoc(onDoc,txt){if(!assets)return null;const up=el("input",{type:"file",accept:"image/*,application/pdf",style:"font-size:14px"});
  up.addEventListener("change",async()=>{const f=up.files[0];if(!f)return;up.disabled=true;toast("Subiendo "+f.name+"…");
    try{const blob=/^image\//.test(f.type)&&f.size>3e6?await comprimir(f):f;const r=await assets.upload(blob);await onDoc({id:r.id,nombre:f.name,tipo:f.type||r.contentType,fecha:hoy()});}
    catch(e){up.disabled=false;toast("No se pudo subir: "+(e&&(e.message||e.code)||"error"));}});
  return fld(txt||"Subir plano o foto (PDF o imagen)",up);}
function planoBox(a){const docs=a.docs||[];const iny=(a.iny||[]).map(maqN).filter(x=>x!=="—");
  if(!docs.length&&!iny.length&&!a.plano&&!a.notas&&!TEC(a.fam))return null;
  const reabre=()=>{cerrarDlgs();ficha(art(a.id));};
  const box=el("div",{style:"display:flex;flex-wrap:wrap;gap:10px"},docs.length?docs.map(d=>docThumb(d,async()=>{const x=art(a.id);x.docs=(x.docs||[]).filter(z=>z.id!==d.id);await saveCat();toast("Archivo quitado");reabre();})):[el("p",{class:"hint",text:"Todavía no hay plano."})]);
  return el("div",{style:"display:flex;flex-direction:column;gap:8px"},[el("div",{class:"gh",style:"border-radius:6px",text:"Plano"+(a.plano?" · nº "+a.plano:"")}),
    iny.length?el("p",{class:"sub",text:"Va en: "+iny.join(", ")}):null,a.notas?el("p",{class:"sub",text:a.notas}):null,box,
    subirDoc(async d=>{const x=art(a.id);x.docs=(x.docs||[]).concat([d]);await saveCat();toast("Plano guardado");reabre();})]);}
function ficha(a){const n=nivel(a);const movs=todosMov().filter(m=>m.art===a.id).sort((x,y)=>(y.f+y.ts).localeCompare(x.f+x.ts));
  let close=()=>{};const ir=t=>{Object.assign(draft.m,{tipo:t,art:a.id,alm:draft.m.alm||(cat.almacenes[0]||{}).id||"",cant:""});close();irA("mov");};
  const st=stockDe(a.id),cd=consDia(a),cob=cd>0?Math.floor(st/cd):null;const NV={bad:["Bajo mínimo","bad"],warn:["Para pedir","warn"],ok:["Correcto","ok"],na:["Sin mínimo",""]};
  const dato=(k,v)=>v==null||v===""?null:[el("dt",{text:k}),el("dd",{text:String(v)})];
  const datos=[dato("Código",a.cod),dato("Familia",FAM[a.fam]),dato("Diámetro",a.diam),dato("Unidad",a.ud),dato("Envase",envTxt(a)),dato("Ubicación",a.ubic),dato("Proveedor",provN(a.prov)),
    dato("Plazo de entrega",plazoArt(a)?plazoArt(a)+" días":null),dato("Mínimo",fmtN(+a.min||0)),dato("Pedir al llegar a",fmtN(Math.ceil(puntoPedido(a)))),dato("Pedir ahora",cantPedir(a)?fmtN(cantPedir(a))+" "+a.ud:"—"),
    dato("Consumo al día",cd?fmtN(Math.round(cd*100)/100)+" "+a.ud:"—"),a.pedido?dato("Pedido",fmtF(a.pedido)+(a.prevista?" · llega "+fmtF(a.prevista):"")):null].filter(Boolean);
  const alms=cat.almacenes.filter(l=>stockDe(a.id,l.id)||almsDe(a).some(x=>x.id===l.id));
  const gen=[el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Datos"})),el("dl",{class:"datos",style:"padding:12px 14px;margin:0"},[].concat(...datos))]),
    el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Stock por almacén"})),alms.length?el("div",{class:"lst"},alms.map(l=>el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},el("div",{class:"t1",text:l.nom})),el("div",{class:"cant num"},[el("b",{text:fmtN(stockDe(a.id,l.id))}),el("small",{text:a.ud})])]))):el("div",{class:"empty",text:"Sin stock en ningún almacén."})])];
  const tabM=[movs.length?el("section",{class:"card"},el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Fecha"}),el("th",{text:"Tipo"}),el("th",{class:"r",text:"Cant."}),el("th",{text:"Dónde"})])),
      el("tbody",{},movs.slice(0,60).map(m=>el("tr",{},[el("td",{class:"num",text:fmtF(m.f)}),el("td",{text:TIPOS[m.tipo]}),el("td",{class:"r num",text:signo(m)}),el("td",{text:dondeTxt(m)})])))]))):el("p",{class:"hint",text:"Sin movimientos todavía."})];
  /* consumo por mes (12 meses) y por destino (90 días) */
  const hy=hoy(),pm={},pd={};const d90=sumaDias(hy,-90);movs.filter(m=>m.tipo==="salida").forEach(m=>{const k=m.f.slice(0,7);pm[k]=(pm[k]||0)+(+m.cant||0);if(m.f>=d90){const t=paraTxt(m)||almN(m.alm);pd[t]=(pd[t]||0)+(+m.cant||0);}});
  const meses=[];for(let i=11;i>=0;i--){const d=new Date(hy.slice(0,7)+"-01T12:00:00");d.setMonth(d.getMonth()-i);meses.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));}
  const mx=Math.max(1,...meses.map(k=>pm[k]||0));
  const tabC=[el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Consumo por mes"})),el("div",{class:"bd",style:"display:grid;gap:6px"},meses.map(k=>el("div",{class:"cob"},[el("span",{class:"cob-n",text:cap(MESES[+k.slice(5,7)-1]).slice(0,3)+" "+k.slice(2,4)}),el("div",{class:"cob-b"},el("div",{class:"cob-f",style:"width:"+((pm[k]||0)/mx*100)+"%"})),el("span",{class:"cob-d num",text:pm[k]?fmtN(pm[k]):"·"})])))]),
    Object.keys(pd).length?el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Para dónde"}),el("span",{class:"der sub",text:"últimos 90 días"})]),el("div",{class:"lst"},Object.entries(pd).sort((x,y)=>y[1]-x[1]).map(([t,c])=>el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},el("div",{class:"t1",text:t})),el("div",{class:"cant num"},[el("b",{text:fmtN(c)}),el("small",{text:a.ud})])])))]):null];
  const tabD=[TEC(a.fam)?revBox(a):planoBox(a),TEC(a.fam)&&(a.docs||[]).length?planoBox(a):null];
  close=objPage({tipo:"Artículo",ruta:["Stock",FAM[a.fam]||"Artículo"],titulo:a.desc,sub:[a.cod,a.ubic?"Ubicación "+a.ubic:null,provN(a.prov)].filter(Boolean).join(" · "),estado:NV[n]||null,
    kpis:[["Stock",fmtN(st)+" "+a.ud,n==="bad"?"neg":""],["Mínimo",fmtN(+a.min||0)],["Dura",cob==null?"—":cob>365?"+1 año":cob+" días",cob!=null&&cob<14?"neg":""],["Pedir ahora",cantPedir(a)?fmtN(cantPedir(a)):"—"]],
    tabs:[["General",gen],["Movimientos ("+movs.length+")",tabM],["Consumo",tabC],["Planos y documentos",tabD]],
    acts:[{t:"Editar",cls:"sec",fn:()=>{setTimeout(()=>formArticulo(a),0);}},{t:"Contar",cls:"sec",fn:()=>ir("ajuste")},{t:"Entrada",cls:"sec",fn:()=>ir("entrada")},{t:"Consumo",fn:()=>ir("salida")}]});}
function signo(m){const c=+m.cant||0;if(m.tipo==="entrada")return"+"+fmtN(c);if(m.tipo==="salida")return"−"+fmtN(c);if(m.tipo==="ajuste")return(c>=0?"+":"−")+fmtN(Math.abs(c));return fmtN(c);}
/* Consumos de limpieza: la nave va en la nota («Limpieza: <tarea> · Nave 2») */
const naveDeNota=m=>{const r=/·\s*(Nave\s[^·]+?)\s*$/i.exec(m&&m.nota||"");return r?r[1]:"";};
function dondeTxt(m){return m.tipo==="traslado"?almN(m.alm)+" → "+almN(m.dest):almN(m.alm)+((paraTxt(m)||naveDeNota(m))?" · "+(paraTxt(m)||naveDeNota(m)):"");}

/* ===== Ficha de objeto a pantalla completa (estilo SAP «Object Page») =====
   o={tipo, ruta:[...], titulo, sub, estado:[texto,clase], kpis:[[etiqueta,valor,clase]], tabs:[[titulo,[nodos]]], acts:[{t,cls,fn}], tab} */
function objPage(o){const ov=el("div",{class:"dlg-ov op-ov"});let pg;
  const close=()=>{ov.remove();document.removeEventListener("keydown",esc);};const esc=e=>{if(e.key==="Escape"&&document.querySelectorAll(".dlg-ov").length&&document.querySelectorAll(".dlg-ov")[document.querySelectorAll(".dlg-ov").length-1]===ov)close();};
  const tabs=(o.tabs||[]).filter(t=>t&&t[1]&&t[1].filter(Boolean).length);let cur=Math.min(o.tab||0,Math.max(0,tabs.length-1));
  const body=el("div",{class:"op-body"});const tb=el("div",{class:"op-tabs",role:"tablist"});
  const pinta=()=>{tb.querySelectorAll("button").forEach((b,i)=>b.setAttribute("aria-selected",String(i===cur)));body.textContent="";(tabs[cur]?tabs[cur][1]:[]).forEach(n=>{if(n)body.appendChild(n);});};
  tabs.forEach(([t],i)=>tb.appendChild(el("button",{type:"button",role:"tab",text:t,onclick:()=>{cur=i;pinta();const sc=pg.querySelector(".op-scroll");const tp=tb.offsetTop;if(sc.scrollTop>tp)sc.scrollTop=tp;}})));
  const foot=(o.acts||[]).length?el("div",{class:"op-foot"},o.acts.map(a=>{const b=el("button",{type:"button",class:"btn "+(a.cls||""),text:a.t});b.onclick=async()=>{if(a.fn){b.disabled=true;let r;try{r=await a.fn();}catch(e){r=false;}b.disabled=false;if(r===false)return;}close();};return b;})):null;
  pg=el("div",{class:"op-pg dlg",role:"dialog","aria-modal":"true","aria-label":(o.tipo?o.tipo+" ":"")+o.titulo},[
    el("div",{class:"op-bar"},[el("button",{type:"button",class:"op-back","aria-label":"Volver",onclick:close},"‹ Volver"),el("span",{class:"op-tipo",text:o.tipo||""})]),
    el("div",{class:"op-scroll"},[el("div",{class:"op-hd"},[
      o.ruta&&o.ruta.length?el("div",{class:"op-ruta",text:o.ruta.join("  ›  ")}):null,
      el("div",{class:"op-tit"},[el("h2",{text:o.titulo}),o.estado?el("span",{class:"pill "+(o.estado[1]||""),text:o.estado[0]}):null]),
      o.sub?el("div",{class:"op-sub",text:o.sub}):null,
      (o.kpis||[]).length?el("div",{class:"op-kpis"},o.kpis.filter(Boolean).map(([l,v,c])=>el("div",{},[el("small",{text:l}),el("b",{class:c||"",text:v})]))):null]),
      tabs.length>1?tb:null,body]),foot]);
  ov.appendChild(pg);document.addEventListener("keydown",esc);document.body.appendChild(ov);pinta();return close;}
/* ===== REPOSICIÓN ===== */
const corto=l=>l.nom.replace(/^Almac[eé]n (de )?(producci[oó]n )?/i,"").replace(/^./,c=>c.toUpperCase());
const origenRepo=()=>{const a=cat.ajustes||{};return cat.almacenes.find(l=>l.id===a.origenRepo)||cat.almacenes[0]||null;};
const lineas=()=>{const o=origenRepo();const pr=cat.almacenes.filter(l=>l.tipo==="produccion"&&(!o||l.id!==o.id));return pr.length?pr:cat.almacenes.filter(l=>!o||l.id!==o.id);};
function almsDe(a){const S=new Set(a.alms||[]);const pp=a.almPpal;if(pp)S.add(pp);Object.keys(cat.dot||{}).forEach(l=>{if((cat.dot[l]||{})[a.id])S.add(l);});cat.almacenes.forEach(l=>{if(stockDe(a.id,l.id))S.add(l.id);});return cat.almacenes.filter(l=>S.has(l.id));}
function ppalDe(a){if(a.almPpal&&cat.almacenes.some(l=>l.id===a.almPpal))return a.almPpal;const al=almsDe(a);const c=al.filter(l=>l.tipo!=="produccion");const pool=c.length?c:al;let best=null,mx=-Infinity;pool.forEach(l=>{const s=stockDe(a.id,l.id);if(s>mx){mx=s;best=l.id;}});return best||(origenRepo()||{}).id||(cat.almacenes[0]||{}).id||"";}
const almById=id=>cat.almacenes.find(l=>l.id===id);
/* a.limp: lo consume la app de Limpieza directamente de su almacén (aceites, taladrinas, sacas): no se baja a planta */
/* «Quitar» de la lista de bajar: se guarda cuánto había en planta ese día. No vuelve a salir mientras
   no se gaste más; si se gasta, sale solo lo gastado desde entonces. */
const okBajar=()=>cat.bajarOk||{};
/* un «Quitar» deja de valer en cuanto entra material a ese almacén (se ha repuesto): desde ahí vuelve a contar la dotación normal */
function okVigente(ok,almId,artId){if(!ok)return null;const des=x=>ok.ts?(+x.ts||0)>ok.ts:x.f>ok.f;
  const entra=todosMov().some(x=>x.art===artId&&des(x)&&((x.tipo==="entrada"&&x.alm===almId)||(x.tipo==="traslado"&&x.dest===almId)||(x.tipo==="ajuste"&&x.alm===almId&&(+x.cant||0)>0)));return entra?null:ok;}
function faltas(almId){const d=(cat.dot||{})[almId]||{};const OK=okBajar();return Object.keys(d).map(id=>{const a=art(id);if(!a||a.activo===false||a.limp)return null;const obj=+d[id]||0;const st=stockDe(id,almId);const org=ppalDe(a);
  let falta=Math.max(0,Math.ceil(obj-st));const ok=okVigente(OK[almId+"|"+id],almId,id);if(ok&&falta>0)falta=Math.max(0,Math.min(falta,Math.ceil((+ok.st||0)-st)));
  {const x=ajBajarHoy()[almId+"|"+id];if(x&&x.quitar)falta=0;else if(x&&x.cant!=null)falta=Math.max(0,Math.min(falta,+x.cant||0));}
  return{a,obj,st,org:org!==almId?org:null,falta,quitado:!!ok};}).filter(Boolean);}
function vRepo(v){draft.rv=draft.rv||"hoy";
  v.appendChild(el("div",{class:"seg",role:"group","aria-label":"Vista"},[["hoy","Reponer hoy"],["dot","Qué va en cada almacén"],["prev","Previsión"]].map(([k,t])=>el("button",{type:"button","aria-pressed":String(draft.rv===k),text:t,onclick:()=>{draft.rv=k;render(true);}}))));
  if(draft.rv==="dot"){vDotacion(v);return;}
  if(draft.rv==="prev"){vPrev(v);return;}
  const ls=lineas();
  if(!ls.length){v.appendChild(el("div",{class:"banner",text:"Marca al menos un almacén como «de producción» en Catálogo > Almacenes."}));return;}
  const todas=[];ls.forEach(l=>faltas(l.id).forEach(f=>{if(f.falta>0&&f.org)todas.push(Object.assign({l},f));}));
  const uds=todas.reduce((s,f)=>s+f.falta,0);
  v.appendChild(el("dl",{class:"kpis num"},[["Para bajar",todas.length+" art."],["Unidades",fmtN(uds)]].concat(ls.filter(l=>faltas(l.id).length).map(l=>[corto(l)+" · a bajar",faltas(l.id).filter(f=>f.falta>0&&f.org).length+" de "+faltas(l.id).length])).map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))));
  /* hoja de carga, agrupada por almacén de origen */
  if(todas.length){const porO={};todas.forEach(f=>{const g=porO[f.org]=porO[f.org]||{};const k=f.a.id;(g[k]=g[k]||{a:f.a,tot:0,det:[]});g[k].tot+=f.falta;g[k].det.push(corto(f.l)+" "+fmtN(f.falta));});
    const T=["BAJAR · "+fmtF(hoy())];const secs=[];
    Object.keys(porO).forEach(oid=>{const o=almById(oid);const filas=Object.values(porO[oid]).sort((x,y)=>(x.a.ubic||"~").localeCompare(y.a.ubic||"~","es",{numeric:true})||x.a.desc.localeCompare(y.a.desc));
      T.push("","DESDE "+(o?o.nom:"?").toUpperCase()+":");filas.forEach(r=>T.push("- "+r.a.desc+": "+fmtN(r.tot)+" "+r.a.ud+" ("+r.det.join(", ")+")"+(r.a.ubic?" · "+r.a.ubic:"")));
      secs.push(el("div",{class:"gh",text:"Desde "+(o?o.nom:"?")+" ("+filas.length+")"}));
      secs.push(el("div",{class:"lst"},filas.map(r=>{const disp=stockDe(r.a.id,oid);const falt=disp<r.tot;return el("div",{class:"it",style:"cursor:default"},[el("span",{class:"stripe "+(falt?"bad":"ok")}),
        el("div",{class:"ppal"},[el("div",{class:"t1",text:r.a.desc}),el("div",{class:"t2",text:[r.a.ubic?""+r.a.ubic:null,r.det.join(" · "),falt?"¡Solo hay "+fmtN(disp)+"!":"hay "+fmtN(disp)].filter(Boolean).join(" · ")})]),
        el("div",{class:"cant num"},[el("b",{text:fmtN(r.tot)}),el("small",{text:r.a.ud})])]);})));});
    const txt=T.join("\n");
    v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Hoja de carga ("+todas.length+")"}),el("button",{type:"button",class:"btn sec peq der",text:"Copiar",onclick:async()=>{try{await navigator.clipboard.writeText(txt);toast("Lista copiada");}catch(e){toast("No se pudo copiar");}}})])].concat(secs)));}
  /* por almacén */
  ls.forEach(l=>{const fs=faltas(l.id).sort((x,y)=>(y.falta>0)-(x.falta>0)||(x.a.ubic||"~").localeCompare(y.a.ubic||"~","es",{numeric:true})||x.a.desc.localeCompare(y.a.desc));
    const pend=fs.filter(f=>f.falta>0&&f.org),propios=fs.filter(f=>f.falta>0&&!f.org),ok=fs.filter(f=>!f.falta);const sel0=new Set(pend.map(f=>f.a.id));const cant0=new Map(pend.map(f=>[f.a.id,f.falta]));
    const fila=f=>{const cb=f.falta&&f.org?el("input",{type:"checkbox",checked:true,style:"width:22px;height:22px;flex:none",onchange:e=>{e.target.checked?sel0.add(f.a.id):sel0.delete(f.a.id);},"aria-label":"Reponer "+f.a.desc}):null;const o=f.org?almById(f.org):null;
      return el("div",{class:"it",style:"cursor:default;flex-wrap:wrap"},[cb||el("span",{class:"stripe "+(f.falta?"warn":"ok")}),el("div",{class:"ppal"},[el("div",{class:"t1",text:f.a.desc}),el("div",{class:"t2",text:[hayTxt(f.st)+" de "+fmtN(f.obj)+" "+f.a.ud,o?"se baja de "+corto(o):"solo está aquí: va a la lista de pedido",f.a.ubic].filter(Boolean).join(" · ")})]),
        f.falta&&f.org?el("div",{class:"cant num",style:"display:flex;align-items:center;gap:4px"},[inp("rq"+f.a.id,cant0.get(f.a.id),v=>{const n=parseN(v);cant0.set(f.a.id,isFinite(n)?Math.max(0,Math.min(n,f.falta)):0);},{inputmode:"decimal",class:"num","aria-label":"Cantidad a bajar de "+f.a.desc,style:"width:70px;padding:7px 6px;font-size:16px"}),el("small",{text:"de "+fmtN(f.falta)+" "+f.a.ud})]):f.falta?el("div",{class:"cant num"},[el("b",{text:"+"+fmtN(f.falta)}),el("small",{text:"falta"})]):el("span",{class:"pill ok",text:"Completo"}),
        el("div",{style:"display:flex;gap:6px;width:100%;margin-top:4px;justify-content:flex-end"},[el("button",{type:"button",class:"btn sec peq",text:"Consumo",onclick:()=>{Object.assign(draft.m,{tipo:"salida",art:f.a.id,alm:l.id,cant:""});irA("mov");}}),
          f.falta&&o?el("button",{type:"button",class:"btn peq",text:"Repuesto",onclick:e=>{const q=cant0.get(f.a.id);if(!(q>0)){toast("Pon una cantidad");return;}e.currentTarget.disabled=true;reponer(l,[Object.assign({},f,{falta:q})]);}}):null])]);};
    v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:corto(l)+(!fs.length?" · sin dotación":pend.length?" · faltan "+pend.length:" · completo")}),el("button",{type:"button",class:"btn sec peq der",text:"Dotación",onclick:()=>formDotacion(l)})]),
      fs.length?null:el("div",{class:"empty",text:"Sin dotación. Pulsa «Dotación» y pon lo que tiene que haber en "+l.nom+"."}),
      pend.length?el("div",{class:"lst"},pend.map(fila)):null,
      pend.length?el("div",{class:"bd",style:"padding-top:6px"},el("button",{type:"button",class:"btn",style:"width:100%",text:"Reponer marcados en "+corto(l),onclick:e=>{const s2=pend.filter(f=>sel0.has(f.a.id)&&cant0.get(f.a.id)>0).map(f=>Object.assign({},f,{falta:cant0.get(f.a.id)}));if(!s2.length){toast("Marca algo y pon una cantidad");return;}e.currentTarget.disabled=true;reponer(l,s2);}})):null,
      propios.length?el("div",{class:"gh",text:"Solo están en "+corto(l)+" (no se bajan de otro almacén)"}):null,propios.length?el("div",{class:"lst"},propios.map(fila)):null,
      ok.length?el("details",{},[el("summary",{class:"gh",style:"cursor:pointer",text:ok.length+" completos"}),el("div",{class:"lst"},ok.map(fila))]):null]));});
  v.appendChild(el("p",{class:"hint",text:"Cada artículo se baja desde su almacén principal (se elige en su ficha del Catálogo). Los que solo están en un almacén de producción no se reponen desde otro: cuando faltan salen en la lista de pedido."}));}
async function reponer(l,fs){if(!db){toast("No se puede guardar");render(true);return;}const list=[],cortos=[];
  fs.forEach(f=>{if(!f.org)return;const disp=Math.max(0,stockDe(f.a.id,f.org));const q=Math.min(f.falta,disp);if(q<f.falta)cortos.push(f.a.desc+" (solo "+fmtN(disp)+" en "+corto(almById(f.org))+")");if(q>0)list.push({f:hoy(),tipo:"traslado",art:f.a.id,alm:f.org,dest:l.id,cant:q,nota:"Reposición "+corto(l)});});
  if(!list.length){toast("No hay stock en el almacén de origen para reponer eso");render(true);return;}
  try{await addMovs(list);toast("Repuesto en "+corto(l)+(cortos.length?". Faltó: "+cortos.join(", "):""));
    const B=cat.bajarAj;if(B&&B.m){const ks=list.map(m=>l.id+"|"+m.art).filter(k=>B.m[k]);if(ks.length){ks.forEach(k=>delete B.m[k]);try{await saveCat();}catch(e){}}}}catch(e){toast("No se pudo guardar");}render(true);}
function formDotacion(l){const d=Object.assign({},(cat.dot||{})[l.id]||{});const f={q:""};const tb=el("tbody");
  function pinta(){tb.textContent="";const q=norm(f.q);artsActivos().filter(a=>!q||norm(a.desc+" "+(a.cod||"")+" "+(a.ubic||"")).includes(q)).sort((a,b)=>(d[b.id]!=null)-(d[a.id]!=null)||a.desc.localeCompare(b.desc,"es",{numeric:true})).forEach(a=>{
    tb.appendChild(el("tr",{},[el("td",{},[el("div",{text:a.desc}),el("div",{class:"sub",text:"hay "+fmtN(stockDe(a.id,l.id))+" "+a.ud})]),el("td",{},inp("dt"+a.id,d[a.id]!=null?d[a.id]:"",v=>{const n=parseN(v);if(isFinite(n)&&n>0)d[a.id]=n;else delete d[a.id];},{inputmode:"decimal",class:"num",placeholder:"—",style:"width:70px;padding:7px 6px;font-size:16px"}))]));});}
  pinta();
  dlg("Dotación de "+l.nom,[el("p",{class:"hint",text:"Escribe cuánto tiene que haber de cada artículo en "+l.nom+". Deja en blanco los que no van en este almacén."}),
    inp("dtQ","",v=>{f.q=v;pinta();},{type:"search",placeholder:"Buscar artículo",autocomplete:"off"}),
    el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Artículo"}),el("th",{text:"Debe haber"})])),tb]))],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar dotación",fn:async()=>{cat.dot=Object.assign({},cat.dot,{[l.id]:d});try{await saveCat();toast("Dotación de "+l.nom+" guardada ("+Object.keys(d).length+" artículos)");}catch(e){return false;}render(true);}}]);}

function vDotacion(v){const ls=lineas();const o=origenRepo();draft.dq=draft.dq||"";draft.df=draft.df==null?"consumible":draft.df;
  const cambios=draft.dc=draft.dc||{};const guardar=el("button",{type:"button",class:"btn",style:"width:100%",text:"Guardar cambios",disabled:true});
  const marcar=()=>{const n=Object.keys(cambios).length;guardar.disabled=!n;guardar.textContent=n?"Guardar cambios ("+n+")":"Guardar cambios";};
  guardar.onclick=async()=>{const dot=JSON.parse(JSON.stringify(cat.dot||{}));Object.values(cambios).forEach(([l,a,n])=>{dot[l]=dot[l]||{};if(n>0)dot[l][a]=n;else delete dot[l][a];});cat.dot=dot;
    guardar.disabled=true;try{await saveCat();draft.dc={};toast("Dotación guardada");}catch(e){guardar.disabled=false;return;}render(true);};
  v.appendChild(el("p",{class:"hint",text:"Pon cuánto tiene que haber de cada consumible en cada almacén de producción. En blanco = no va en ese almacén. Se repone desde "+(o?o.nom:"el almacén central")+"."}));
  v.appendChild(inp("dq",draft.dq,x=>{draft.dq=x;pinta();},{type:"search",placeholder:"Buscar consumible",autocomplete:"off"}));
  v.appendChild(el("div",{class:"chips"},[["","Todos"]].concat(Object.entries(FAM)).map(([k,t])=>el("button",{type:"button",class:"chip","aria-pressed":String(draft.df===k),text:t,onclick:()=>{draft.df=k;render(true);}}))));
  const tb=el("tbody");
  v.appendChild(el("section",{class:"card"},el("div",{class:"tw"},el("table",{class:"mtx"},[el("thead",{},el("tr",{},[el("th",{text:"Consumible"})].concat(ls.map(l=>el("th",{class:"r",text:corto(l)}))))),tb]))));
  v.appendChild(guardar);
  function pinta(){tb.textContent="";const q=norm(draft.dq);const d=cat.dot||{};
    artsActivos().filter(a=>(!draft.df||a.fam===draft.df)&&(!q||norm(a.desc+" "+(a.cod||"")+" "+(a.ubic||"")).includes(q))).sort((a,b)=>a.desc.localeCompare(b.desc,"es",{numeric:true})).forEach(a=>{
      tb.appendChild(el("tr",{},[el("td",{},[el("div",{text:a.desc}),el("div",{class:"sub",text:a.ud+(a.ubic?" · "+a.ubic:"")})])].concat(ls.map(l=>{const k=l.id+"|"+a.id;const cur=cambios[k]?cambios[k][2]:((d[l.id]||{})[a.id]);
        const i=el("input",{id:"dm"+l.id+a.id,value:cur!=null&&cur!==0?cur:"",inputmode:"decimal",class:"num",placeholder:"—",style:"width:52px;padding:7px 5px;font-size:16px;text-align:right"});
        i.addEventListener("input",()=>{const n=parseN(i.value);cambios[k]=[l.id,a.id,isFinite(n)&&n>0?n:0];marcar();});
        return el("td",{class:"r"},i);}))));});
    if(!tb.children.length)tb.appendChild(el("tr",{},el("td",{colspan:ls.length+1,class:"empty",text:"Ningún artículo coincide."})));}
  pinta();marcar();}


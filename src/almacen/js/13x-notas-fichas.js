/* ===== NOTAS Y ARCHIVOS EN CADA FICHA (máquina, eje, artículo y proveedor) =====
   En la pestaña «Notas y archivos» de cada ficha se apunta lo que ha pasado («se cambió la junta», «el proveedor
   avisa de retraso»…) con fotos o PDF. Cada nota queda con la fecha, la hora y quién la escribió, de la más nueva a la más vieja.
   Se guarda en la colección fnotas (alm_fnotas), un documento por ficha: fnotas/<tipo>_<id> = {L:[{id,ts,f,por,txt,docs}]}.
   Quitar una nota no borra sus archivos del almacén de fotos (por si hacen falta). */
const yoN=()=>(window.yoNombre&&window.yoNombre())||"";
const nom1=n=>String(n||"").trim().split(/\s+/)[0]||"";
/* usuarios de la app (para «Avisar a») */
let USU_ALM=null,_usuP=null;
function cargaUsuAlm(){if(USU_ALM)return Promise.resolve(USU_ALM);if(_usuP)return _usuP;const sb=window.sbColada;if(!sb){USU_ALM=[];return Promise.resolve(USU_ALM);}
  _usuP=Promise.resolve(sb.from("usuarios").select("user_id,nombre,activo,consulta").then(r=>{USU_ALM=((r&&r.data)||[]).filter(u=>u.activo!==false&&u.nombre);return USU_ALM;},()=>{USU_ALM=[];return USU_ALM;}));return _usuP;}
/* aviso a las personas nombradas: en su campana (menc/<id>) y al móvil si tiene los avisos activados */
async function avisarMenc(M,n,clave,titulo){const de=yoN();
  for(const u of M){try{const r=db.doc("menc/"+u.user_id),sn=await r.get(),L0=sn.exists?(sn.data().L||[]):[];
    await r.set({L:L0.filter(x=>!x.leido||Date.now()-x.ts<30*864e5).concat([{id:n.id,ts:n.ts,de,txt:(n.txt||"").slice(0,300),clave,titulo:titulo||"",leido:false}]).slice(-100)});}catch(e){}}
  try{if(window.sbColada)await window.sbColada.rpc("alm_mencionar",{p_para:M.map(u=>u.user_id),p_titulo:de+" te avisa · "+(titulo||"Almacén"),p_texto:(n.txt||"").slice(0,280),p_url:"almacen.html?ficha="+encodeURIComponent(clave)});}catch(e){}}
/* abrir una ficha por su clave (desde un aviso al móvil o desde la campana), en la pestaña de notas */
let ABRIR_NOTAS=false,PEND_FICHA=null;
try{const c=new URLSearchParams(location.search).get("ficha");if(c)PEND_FICHA=c;}catch(e){}
function abrirFichaClave(c){const m=String(c||"").match(/^(maq|eje|art|prov)_(.+)$/);if(!m)return;ABRIR_NOTAS=true;
  try{if(m[1]==="maq"){const x=maqDe(m[2]);if(x)return fichaIny(x);}
    if(m[1]==="eje"){const x=ejes.find(e=>e.cod===m[2]);if(x)return fichaEje(x);}
    if(m[1]==="art"){if(art(m[2]))return fichaProd(m[2]);}
    if(m[1]==="prov"){const x=(cat.proveedores||[]).find(p=>p.id===m[2]);if(x)return fichaProv(x);}}catch(e){}
  ABRIR_NOTAS=false;toast("No encuentro esa ficha");}
/* menciones para mí (campana) */
let MENC_L=[];
function escuchaMenc(){const id=window.yoId&&window.yoId();if(!id||!db||escuchaMenc.ok)return;escuchaMenc.ok=true;
  db.doc("menc/"+id).onSnapshot(sn=>{MENC_L=sn.exists?(sn.data().L||[]):[];if(typeof campanaAlm==="function")campanaAlm();},()=>{});}
async function leidaMenc(idN){const id=window.yoId&&window.yoId();if(!id)return;try{const r=db.doc("menc/"+id),sn=await r.get();if(!sn.exists)return;
  await r.set({L:(sn.data().L||[]).map(x=>x.id===idN?Object.assign({},x,{leido:true}):x)});}catch(e){}}
function itemsMenc(){return MENC_L.filter(x=>!x.leido).sort((a,b)=>b.ts-a.ts).map(x=>({niv:"warn",t:x.de+" te avisa en "+(x.titulo||"una ficha"),d:x.txt,fn:()=>{leidaMenc(x.id);abrirFichaClave(x.clave);}}));}
function cajaNotas(clave,titulo){const box=el("div",{class:"card fn-box"},[el("div",{class:"bd"},el("p",{class:"hint",text:"Cargando notas…"}))]);
  const ref=()=>db.doc("fnotas/"+clave);let L=[];
  const pinta=()=>{box.textContent="";const nuevo={txt:"",docs:[]};const ta=el("textarea",{rows:"3",placeholder:"Escribe lo que ha pasado, lo que hay que tener en cuenta…","aria-label":"Nota",oninput:e=>{nuevo.txt=e.target.value;}});
    const adj=el("div",{class:"fn-adj"});const pintaAdj=()=>{adj.textContent="";nuevo.docs.forEach(d=>adj.appendChild(docThumb(d,()=>{nuevo.docs=nuevo.docs.filter(x=>x.id!==d.id);pintaAdj();})));};
    const solo=!!window.SOLO_CONSULTA;nuevo.menc=new Set();
    const chipsU=el("div",{class:"fn-menc"});const pintaU=()=>{chipsU.textContent="";const U=(USU_ALM||[]).filter(u=>u.user_id!==(window.yoId&&window.yoId()));if(!U.length)return;
      chipsU.appendChild(el("span",{class:"sub",text:"Avisar a:"}));U.forEach(u=>chipsU.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(nuevo.menc.has(u.user_id)),text:"@"+nom1(u.nombre),
        onclick:()=>{nuevo.menc.has(u.user_id)?nuevo.menc.delete(u.user_id):nuevo.menc.add(u.user_id);pintaU();}})));};
    cargaUsuAlm().then(pintaU);
    const sinT=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    ta.addEventListener("input",()=>{const tx=sinT(ta.value);(USU_ALM||[]).forEach(u=>{if(tx.includes("@"+sinT(nom1(u.nombre)))&&!nuevo.menc.has(u.user_id)){nuevo.menc.add(u.user_id);pintaU();}});});
    const form=solo?null:el("div",{class:"fn-form"},[ta,adj,chipsU,el("div",{class:"fn-acc"},[subirDoc(async d=>{nuevo.docs.push(d);pintaAdj();toast("Archivo añadido a la nota");},"Añadir foto o PDF"),
      el("button",{type:"button",class:"btn",text:"Guardar nota",onclick:async e=>{const t=nuevo.txt.trim();if(!t&&!nuevo.docs.length){toast("Escribe algo o añade un archivo");return;}
        const b=e.currentTarget;b.disabled=true;try{const sn=await ref().get();const srv=sn.exists?(sn.data().L||[]):[];
          const M=(USU_ALM||[]).filter(u=>nuevo.menc.has(u.user_id));
          const n={id:uid(),ts:Date.now(),f:hoy(),por:yoN(),txt:t,docs:nuevo.docs,menc:M.map(u=>({id:u.user_id,nom:nom1(u.nombre)}))};if(!n.menc.length)delete n.menc;
          await ref().set({L:srv.concat([n]),titulo:titulo||""});L=srv.concat([n]);
          if(M.length){await avisarMenc(M,n,clave,titulo);toast("Nota guardada y avisado: "+M.map(u=>nom1(u.nombre)).join(", "));}else toast("Nota guardada");pinta();}
        catch(err){b.disabled=false;toast("No se pudo guardar: "+(err&&err.message||"error"));}}})])]);
    const lista=L.slice().sort((a,b)=>b.ts-a.ts);
    box.appendChild(el("div",{class:"hd"},[el("h2",{text:"Notas y archivos"}),el("span",{class:"der sub",text:lista.length?lista.length+(lista.length===1?" nota":" notas"):"ninguna todavía"})]));
    box.appendChild(el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:14px"},[form,
      lista.length?el("div",{class:"fn-lst"},lista.map(n=>{const d=new Date(n.ts);const hora=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
        return el("div",{class:"fn-it"},[el("div",{class:"fn-hd"},[el("span",{class:"fn-av",text:(n.por||"?").trim().charAt(0).toUpperCase()}),
            el("div",{style:"flex:1;min-width:0"},[el("b",{text:n.por||"Sin nombre"}),el("span",{class:"sub",text:" · "+fmtF(n.f)+" "+hora})]),
            !solo&&n.por===yoN()?el("button",{type:"button",class:"btn txt peq",text:"Quitar",onclick:()=>confirmar("¿Quitar esta nota?","Se quita de la ficha (los archivos no se borran).","Quitar",async()=>{
              const sn=await ref().get();const srv=sn.exists?(sn.data().L||[]):[];L=srv.filter(x=>x.id!==n.id);await ref().set({L,titulo:titulo||""});toast("Nota quitada");pinta();})}):null]),
          n.txt?el("p",{class:"fn-tx",text:n.txt}):null,
          (n.menc||[]).length?el("div",{class:"sub",text:"Avisado: "+n.menc.map(x=>x.nom).join(", ")}):null,
          (n.docs||[]).length?el("div",{class:"fn-adj"},n.docs.map(x=>docThumb(x))):null]);}))
        :el("p",{class:"hint",style:"margin:0",text:"Todavía no hay notas. Apunta aquí lo que pase con "+(titulo||"esta ficha")+": arreglos, avisos del proveedor, fotos…"})].filter(Boolean)));};
  (db?ref().get():Promise.reject(new Error("sin conexión"))).then(sn=>{L=sn.exists?(sn.data().L||[]):[];pinta();}).catch(()=>{L=[];pinta();});
  return box;}

/* ===== FICHA DE PROVEEDOR: datos, lo que nos sirve, lo que se le ha comprado, precios y notas ===== */
function fichaProv(p){const hy=hoy(),d12=sumaDias(hy,-365);
  const A=artsActivos().filter(a=>a.prov===p.id).sort((a,b)=>a.desc.localeCompare(b.desc));
  const E=todosMov().filter(x=>x.tipo==="entrada"&&x.prov===p.id).sort((a,b)=>(b.f||"").localeCompare(a.f||"")||(b.ts||0)-(a.ts||0));
  const E12=E.filter(x=>x.f>=d12),eur12=E12.reduce((s,x)=>{const a=art(x.art);return s+(a?(+x.cant||0)*precioDe(a):0);},0);
  const dato=(t,v)=>v?[el("dt",{text:t}),el("dd",{text:String(v)})]:[];
  const gen=el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Datos"})),el("div",{class:"bd"},el("dl",{class:"datos"},[].concat(
    dato("Qué suministra",p.sum),dato("CIF",p.cif),dato("Nº de cliente",p.codCli),dato("Contacto",p.contacto),dato("Teléfono",p.tel),dato("Correo",p.email),dato("Plazo de entrega",+p.plazo>0?p.plazo+" días":""))))]);
  const filaA=a=>{const ph=(a.ph||[]).slice(-1)[0];return el("div",{class:"it",style:"cursor:pointer",onclick:()=>{setTimeout(()=>fichaProd?fichaProd(a.id):null,0);}},[
    el("div",{class:"ppal"},[el("div",{class:"t1",text:a.desc}),el("div",{class:"t2",text:[a.cod,a.codProv?"ref. proveedor "+a.codProv:null,ph?"precio "+(ph.a>ph.de?"subió":"bajó")+" el "+fmtF(ph.f)+" ("+eur(ph.de)+" → "+eur(ph.a)+")":null].filter(Boolean).join(" · ")})]),
    el("div",{class:"num",style:"text-align:right"},[el("b",{text:precioDe(a)?eur(precioDe(a)):"—"}),el("div",{class:"sub",text:"stock "+fmtN(stockDe(a.id))+" "+(a.ud||"")})])]);};
  const tArt=el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Lo que nos sirve"}),el("span",{class:"der sub",text:A.length+(A.length===1?" artículo":" artículos")})]),
    A.length?el("div",{class:"lst"},A.map(filaA)):el("div",{class:"bd"},el("p",{class:"hint",style:"margin:0",text:"Ningún artículo del catálogo tiene puesto este proveedor."}))]);
  const tEnt=el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Lo que se le ha comprado"}),el("span",{class:"der sub",text:"últimas "+Math.min(100,E.length)})]),
    E.length?el("div",{class:"tw"},el("table",null,[el("thead",null,el("tr",null,["Fecha","Artículo","Cantidad","Albarán","Quién"].map(t=>el("th",{text:t})))),
      el("tbody",null,E.slice(0,100).map(x=>{const a=art(x.art);return el("tr",null,[el("td",{text:fmtF(x.f)}),el("td",{text:a?a.desc:"(borrado)"}),el("td",{class:"num",text:fmtN(+x.cant||0)+" "+(a&&a.ud||"")}),el("td",{text:x.alb||""}),el("td",{text:x.por||(x.resp&&typeof respTxt==="function"?respTxt(x.resp):"")})]);}))]))
      :el("div",{class:"bd"},el("p",{class:"hint",style:"margin:0",text:"No hay entradas apuntadas con este proveedor."}))]);
  objPage({notas:"prov_"+p.id,cambios:q=>q.or("item.eq."+qv("proveedores/"+p.id)+",despues->>prov.eq."+qv(p.id)+",antes->>prov.eq."+qv(p.id)),tipo:"Proveedor",ruta:["Catálogo","Proveedores"],titulo:p.nom,sub:p.sum||"",
    kpis:[["Artículos",String(A.length)],["Entradas 12 meses",String(E12.length)],["Comprado 12 meses",eur(Math.round(eur12))],["Última entrada",E[0]?fmtF(E[0].f):"—"]],
    tabs:[["General",[gen]],["Lo que nos sirve ("+A.length+")",[tArt]],["Compras ("+E.length+")",[tEnt]]],
    acts:[{t:"Editar datos",cls:"sec",fn:()=>{setTimeout(()=>formSimple("proveedores",p),0);}}].concat(p.tel?[{t:"Llamar",cls:"sec",fn:()=>{location.href="tel:"+String(p.tel).replace(/\s+/g,"");return false;}}]:[])});}

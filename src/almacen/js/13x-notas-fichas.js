/* ===== NOTAS Y ARCHIVOS EN CADA FICHA (máquina, eje, artículo y proveedor) =====
   En la pestaña «Notas y archivos» de cada ficha se apunta lo que ha pasado («se cambió la junta», «el proveedor
   avisa de retraso»…) con fotos o PDF. Cada nota queda con la fecha, la hora y quién la escribió, de la más nueva a la más vieja.
   Se guarda en la colección fnotas (alm_fnotas), un documento por ficha: fnotas/<tipo>_<id> = {L:[{id,ts,f,por,txt,docs}]}.
   Quitar una nota no borra sus archivos del almacén de fotos (por si hacen falta). */
const yoN=()=>(window.yoNombre&&window.yoNombre())||"";
function cajaNotas(clave,titulo){const box=el("div",{class:"card fn-box"},[el("div",{class:"bd"},el("p",{class:"hint",text:"Cargando notas…"}))]);
  const ref=()=>db.doc("fnotas/"+clave);let L=[];
  const pinta=()=>{box.textContent="";const nuevo={txt:"",docs:[]};const ta=el("textarea",{rows:"3",placeholder:"Escribe lo que ha pasado, lo que hay que tener en cuenta…","aria-label":"Nota",oninput:e=>{nuevo.txt=e.target.value;}});
    const adj=el("div",{class:"fn-adj"});const pintaAdj=()=>{adj.textContent="";nuevo.docs.forEach(d=>adj.appendChild(docThumb(d,()=>{nuevo.docs=nuevo.docs.filter(x=>x.id!==d.id);pintaAdj();})));};
    const solo=!!window.SOLO_CONSULTA;
    const form=solo?null:el("div",{class:"fn-form"},[ta,adj,el("div",{class:"fn-acc"},[subirDoc(async d=>{nuevo.docs.push(d);pintaAdj();toast("Archivo añadido a la nota");},"Añadir foto o PDF"),
      el("button",{type:"button",class:"btn",text:"Guardar nota",onclick:async e=>{const t=nuevo.txt.trim();if(!t&&!nuevo.docs.length){toast("Escribe algo o añade un archivo");return;}
        const b=e.currentTarget;b.disabled=true;try{const sn=await ref().get();const srv=sn.exists?(sn.data().L||[]):[];
          const n={id:uid(),ts:Date.now(),f:hoy(),por:yoN(),txt:t,docs:nuevo.docs};await ref().set({L:srv.concat([n]),titulo:titulo||""});L=srv.concat([n]);toast("Nota guardada");pinta();}
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
  objPage({notas:"prov_"+p.id,tipo:"Proveedor",ruta:["Catálogo","Proveedores"],titulo:p.nom,sub:p.sum||"",
    kpis:[["Artículos",String(A.length)],["Entradas 12 meses",String(E12.length)],["Comprado 12 meses",eur(Math.round(eur12))],["Última entrada",E[0]?fmtF(E[0].f):"—"]],
    tabs:[["General",[gen]],["Lo que nos sirve ("+A.length+")",[tArt]],["Compras ("+E.length+")",[tEnt]]],
    acts:[{t:"Editar datos",cls:"sec",fn:()=>{setTimeout(()=>formSimple("proveedores",p),0);}}].concat(p.tel?[{t:"Llamar",cls:"sec",fn:()=>{location.href="tel:"+String(p.tel).replace(/\s+/g,"");return false;}}]:[])});}

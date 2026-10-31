/* ===== APUNTAR RÁPIDO: escribir o dictar, la IA lo rellena, se revisa y se guarda de una vez ===== */
const TIPO_R={piston:"Cambio de pistón",consumo:"Consumo",entrada:"Entrada",traslado:"Traslado",conteo:"Conteo",eje_prep:"Eje: preparar para reparar",eje_env:"Eje: enviado a reparar",eje_rec:"Eje: recibido de reparar"};
const ejeKey=c=>norm(c).replace(/"/g,"q").replace(/[^a-z0-9]/g,"");
function ejeDe(c){if(!c)return null;const k=ejeKey(c);return ejes.find(e=>ejeKey(e.cod)===k)||null;}
let notas=[];
const DIAS_S=["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
const rq={txt:"",acc:null,dudas:[],cargando:false,ult:"",lote:null,ia:false,notasProc:null};
function lsGet(k){try{return localStorage.getItem(k)||"";}catch(e){return"";}}
function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition||null;
function ctxIA(){return{articulos:artsActivos().map(a=>({id:a.id,desc:a.desc+((a.iny||[]).length?" [va en "+a.iny.map(maqN).join(",")+"]":""),cod:a.cod||"",ud:a.ud,fam:a.fam,diam:a.diam||""})),
  almacenes:cat.almacenes.map(l=>({id:l.id,nom:l.nom,nave:l.nave||"",tipo:l.tipo||""})),maquinas:cat.maquinas.map(m=>({id:m.id,cod:m.cod,nave:m.nave||""})),
  proveedores:cat.proveedores.map(p=>({id:p.id,nom:p.nom})),ejes:ejes.map(e=>e.cod+" ("+e.estado+")"),operarios:responsables(),diametros:DIAM,motivos:MOTIVOS,destinos:DESTINOS};}
function almSug(r){if(r.tipo==="piston"){const p=pistArt(r.diam);if(p&&r.maq&&!r.alm){r.alm=almPara(r.maq,p.id);r.auto.alm=1;}return;}
  const a=art(r.art);if(!a)return;
  if(r.tipo==="consumo"&&r.maq&&!r.alm){const l=almPara(r.maq,a.id);if(l&&stockDe(a.id,l)>0){r.alm=l;r.auto.alm=1;return;}}
  const tmp={tipo:r.tipo==="consumo"?"salida":r.tipo==="conteo"?"ajuste":r.tipo,art:a.id,alm:r.alm,dest:r.dest};
  const sv=draft.m;draft.m=tmp;try{almDefecto();}finally{draft.m=sv;}
  if(!r.alm&&tmp.alm){r.alm=tmp.alm;r.auto.alm=1;}if(r.tipo==="traslado"&&!r.dest&&tmp.dest){r.dest=tmp.dest;r.auto.dest=1;}}
function normAcc(x){const t=TIPO_R[x.tipo]?x.tipo:"consumo";const ok=(arr,id)=>id&&arr.some(z=>z.id===id)?id:"";
  const r={k:uid(),tipo:t,f:/^\d{4}-\d\d-\d\d$/.test(x.fecha||"")?x.fecha:hoy(),art:ok(cat.articulos,x.articulo),cant:x.cantidad!=null&&isFinite(+x.cantidad)?String(x.cantidad):"",
    alm:ok(cat.almacenes,x.almacen),dest:ok(cat.almacenes,x.destino),maq:ok(cat.maquinas,x.maquina),diam:DIAM.includes(x.diametro)?x.diametro:"",
    motivo:MOTIVOS.includes(x.motivo)?x.motivo:"",dp:DESTINOS.includes(x.destino_piston)?x.destino_piston:"",resp:x.responsable?String(x.responsable):"",
    prov:ok(cat.proveedores,x.proveedor),alb:x.albaran||"",nota:x.nota||"",txt:x.texto||"",auto:{},eje:(ejeDe(x.eje)||{}).cod||(x.eje||""),desp:x.desperfecto||""};
  if(t.startsWith("eje_"))return r;
  if(t==="piston"){if(!r.cant)r.cant="1";if(!r.diam&&r.maq){const u=ultimoPist(r.maq);if(u){r.diam=u.diam;r.auto.diam=1;}}
    if(!r.dp){r.dp=lsGet("alm.dp")||DESTINOS[0];r.auto.dp=1;}
    if(!r.resp&&lsGet("alm.resp")){r.resp=lsGet("alm.resp");r.auto.resp=1;}}
  if(!r.art&&t!=="piston")r.sug=x.nombre_sugerido||sugNombre(x.texto||"");
  almSug(r);return r;}
function faltaR(r){const f=[],q=parseN(r.cant);if(!r.f)f.push("fecha");
  if(r.tipo.startsWith("eje_")){const e=ejeDe(r.eje);if(!e){f.push(r.eje?"no existe el eje "+r.eje:"eje");return f;}const est=(EST_E[e.estado]||[e.estado])[0];
    if(r.tipo==="eje_prep"){if(e.estado!=="planta")f.push("el eje está «"+est+"», no en planta");if(!(r.desp||"").trim())f.push("desperfecto");}
    if(r.tipo==="eje_env"&&!(e.estado==="planta"||e.estado==="preparado"))f.push("el eje ya está «"+est+"»");
    if(r.tipo==="eje_rec"&&!(e.estado==="reparacion"||e.estado==="devuelto"))f.push("el eje está «"+est+"», no en reparación");return f;}
  if(r.tipo==="piston"){if(!r.maq)f.push("inyectora");if(!r.diam)f.push("diámetro");if(!(q>0)||Math.round(q)!==q)f.push("cantidad");if(!r.motivo)f.push("motivo");if(!r.dp)f.push("qué se hace con el usado");return f;}
  if(!r.art)f.push("artículo");if(!r.alm)f.push(r.tipo==="traslado"?"desde":"almacén");
  if(r.tipo==="conteo"?!(q>=0):!(q>0))f.push("cantidad");if(r.tipo==="traslado"&&(!r.dest||r.dest===r.alm))f.push("hasta");return f;}
function infoR(r){const q=parseN(r.cant);
  if(r.tipo.startsWith("eje_")){const e=ejeDe(r.eje);if(!e)return"";const ab=abiertaDe(e.cod);return ejeRef(e)+" · ahora: "+(EST_E[e.estado]||[e.estado])[0]+(ab&&ab.desp&&r.tipo!=="eje_prep"?" · "+ab.desp:"");}
  if(r.tipo==="piston"){const p=pistArt(r.diam);if(!p)return r.diam?"No hay pistón "+r.diam+" en el catálogo: no se descuenta stock.":"";if(!r.alm)return"No se descuenta del stock.";
    const st=stockDe(p.id,r.alm);return"Hay "+fmtN(st)+" en "+almN(r.alm)+(isFinite(q)?" → quedan "+fmtN(st-q):"");}
  const a=art(r.art);if(!a||!r.alm)return"";const st=stockDe(a.id,r.alm),u=" "+a.ud;
  if(r.tipo==="conteo")return"La app dice "+fmtN(st)+u+" en "+almN(r.alm)+(isFinite(q)?" → ajuste "+(q-st>=0?"+":"−")+fmtN(Math.abs(q-st)):"");
  if(r.tipo==="entrada")return"Hay "+fmtN(st)+u+" en "+almN(r.alm)+(isFinite(q)?" → "+fmtN(st+q):"");
  return"Hay "+fmtN(st)+u+" en "+almN(r.alm)+(isFinite(q)?" → quedan "+fmtN(st-q):"");}
function filaR(r){const a=art(r.art);let box;
  const re=()=>{const n=filaR(r);box.replaceWith(n);pintaPie();};
  const lab=(l,k)=>l+(r.auto[k]?" · auto":"");
  const S=(l,k,opts,ph,after)=>fld(lab(l,k),sel("r"+k+r.k,opts,r[k],v=>{r[k]=v;delete r.auto[k];if(after)after(v);re();},ph));
  const T=(l,k,extra)=>fld(lab(l,k),inp("r"+k+r.k,r[k],v=>{r[k]=v;delete r.auto[k];pintaPie();},extra));
  const F=()=>fld("Fecha",inp("rf"+r.k,r.f,v=>{r.f=v;pintaPie();},{type:"date"}));
  const C=l=>T(l||"Cantidad","cant",{inputmode:"decimal",class:"num",autocomplete:"off",placeholder:"0"});
  const artS=()=>S("Artículo","art",artOpts(),"Elige artículo…",()=>{r.alm="";r.dest="";almSug(r);});
  const pistAlm=()=>{r.alm="";almSug(r);};
  let campos;
  if(r.tipo==="piston")campos=[el("div",{class:"row"},[S("Inyectora","maq",maqOpts(),"Elige…",()=>{if(!r.diam){const u=ultimoPist(r.maq);if(u){r.diam=u.diam;r.auto.diam=1;}}pistAlm();}),S("Diámetro","diam",DIAM.map(x=>[x,x]),"Ø…",pistAlm),C()]),
      el("div",{class:"row"},[S("Motivo","motivo",MOTIVOS.map(m=>[m,cap(m)]),"Elige…"),S("Pistón usado","dp",DESTINOS.map(m=>[m,cap(m)]),"Elige…")]),
      el("div",{class:"row"},[T("Responsable","resp",{autocomplete:"off",list:"lOperR",placeholder:"Nº o nombre"}),pistArt(r.diam)?S("Sale de","alm",almOpts(),"No descontar"):null,F()])];
  else if(r.tipo==="consumo")campos=[el("div",{class:"row"},[artS(),C(),S("Almacén","alm",almOptsArt(a),"Elige…")]),el("div",{class:"row"},[S("Para (inyectora o nave)","maq",paraOpts(),"—"),F()])];
  else if(r.tipo==="entrada")campos=[el("div",{class:"row"},[artS(),C(),S("Almacén","alm",almOptsArt(a),"Elige…")]),el("div",{class:"row"},[S("Proveedor","prov",provOpts(),"—"),T("Nº albarán","alb",{autocomplete:"off"}),F()])];
  else if(r.tipo==="traslado")campos=[el("div",{class:"row"},[artS(),C()]),el("div",{class:"row"},[S("Desde","alm",almOptsArt(a),"Elige…"),S("Hasta","dest",almOptsArt(a,r.alm),"Elige…"),F()])];
  else if(r.tipo.startsWith("eje_"))campos=[el("div",{class:"row"},[T("Eje (código)","eje",{list:"lEjesR",autocomplete:"off",placeholder:"p. ej. 2.3.C-3"}),r.tipo==="eje_prep"?T("Desperfecto","desp",{autocomplete:"off"}):null,r.tipo==="eje_rec"?T("Albarán","alb",{autocomplete:"off"}):null,F()])];
  else campos=[el("div",{class:"row"},[artS(),C("Cantidad contada"),S("Almacén","alm",almOptsArt(a),"Elige…"),F()])];
  const tipoS=sel("rt"+r.k,Object.entries(TIPO_R),r.tipo,v=>{r.tipo=v;if(v==="piston"&&!r.cant)r.cant="1";if(v==="piston"&&!r.dp){r.dp=lsGet("alm.dp")||DESTINOS[0];r.auto.dp=1;}r.alm="";r.dest="";almSug(r);re();});
  r._info=el("p",{class:"hint",text:infoR(r)});r._fl=el("p",{class:"hint",style:"color:var(--bad);font-weight:600"});
  box=el("section",{class:"card"},[el("div",{class:"hd"},[tipoS,r.txt?el("span",{class:"sub",style:"flex:1;min-width:120px",text:"«"+r.txt+"»"}):null,
      el("button",{type:"button",class:"btn txt peq der",text:"Quitar",onclick:()=>{rq.acc=rq.acc.filter(x=>x!==r);render(true);}})]),
    el("div",{class:"bd frm",style:"gap:10px"},campos.concat([
      ["consumo","entrada","traslado","conteo"].includes(r.tipo)&&!r.art?el("div",{class:"acciones"},[el("button",{type:"button",class:"btn peq",text:"＋ Crear artículo"+(r.sug?" «"+r.sug+"»":""),onclick:()=>crearArtR(r)}),el("span",{class:"hint",style:"align-self:center",text:"si no está en el catálogo"})]):null,
      r._info,r._fl]))]);
  return box;}
/* ---- crear un artículo desde una nota ---- */
const QUITA=new Set("de del la el los las un una unos unas en a al para y con por he ha han hemos se lo le que hoy ayer ya otro otra mas tambien almacen nave".split(" "));
const VERBO=/^(cambi|baj|repon|repus|dej|gast|consum|entr|lleg|recib|cont|pas|sub|met|sac|llev|traslad|necesit|cog|pues|usad|traid|traen|quedan|hay)/;
const UNID=/^(kg|kilos?|m|metros?|l|litros?|ud|uds|unidad(es)?|cajas?|rollos?|sacos?|bolsas?|piezas?|pzas?)$/;
function sugNombre(txt){const ali=new Set();aliasAlm().forEach(({al})=>al.forEach(a=>a.split(" ").forEach(w=>ali.add(w))));
  const out=[];let emp=false;
  String(txt||"").replace(/[.,;:«»"]+/g," ").split(/\s+/).filter(Boolean).forEach(w=>{const n=norm(w);if(!n)return;
    if(!emp&&(/^\d+([.,]\d+)?(kg|m|l)?$/.test(n)||QUITA.has(n)||VERBO.test(n)||UNID.test(n)||NUMW[n]))return;
    if(ali.has(n))return;emp=true;out.push(w);});
  while(out.length&&QUITA.has(norm(out[out.length-1])))out.pop();
  const s=out.join(" ").trim();return s?s.charAt(0).toUpperCase()+s.slice(1):"";}
function udSug(t){t=norm(t||"");return /\d\s*kg\b|\bkilos?\b/.test(t)?"kg":/\bmetros?\b|\d\s*m\b/.test(t)?"m":/\blitros?\b|\d\s*l\b/.test(t)?"l":/\bcajas?\b/.test(t)?"caja":/\brollos?\b/.test(t)?"rollo":"ud";}
function crearArtR(r){const grupo=rq.acc.filter(z=>z===r||(!z.art&&r.sug&&z.sug&&norm(z.sug)===norm(r.sug)));
  const x={desc:r.sug||"",ud:udSug(grupo.map(z=>z.txt).join(" ")),fam:"consumible",ppal:(origenRepo()||{}).id||(cat.almacenes[0]||{}).id||"",min:""};
  dlg("Nuevo artículo",[fld("Descripción",inp("naDesc",x.desc,v=>x.desc=v,{autocomplete:"off"})),
    el("div",{class:"row"},[fld("Unidad",sel("naUd",UDS.map(u=>[u,u]),x.ud,v=>x.ud=v)),fld("Familia",sel("naFam",Object.entries(FAM).filter(([k])=>k!=="piston"),x.fam,v=>x.fam=v))]),
    el("div",{class:"row"},[fld("Almacén principal",sel("naAlm",almOpts(),x.ppal,v=>x.ppal=v)),fld("Stock mínimo (opcional)",inp("naMin",x.min,v=>x.min=v,{inputmode:"decimal",class:"num",placeholder:"0"}))]),
    el("p",{class:"hint",text:"Se da de alta en el catálogo y se pone en "+(grupo.length>1?"las "+grupo.length+" tarjetas que lo nombran":"esta tarjeta")+". El resto de datos (código, proveedor, ubicación…) los puedes completar luego en Catálogo."})],
    [{t:"Cancelar",cls:"sec"},{t:"Crear y usar",fn:async()=>{const d=(x.desc||"").trim();if(!d){toast("Pon un nombre");return false;}
      let a=cat.articulos.find(z=>norm(z.desc)===norm(d));const ya=!!a;
      if(!a){const alms=new Set([x.ppal]);grupo.forEach(z=>[z.alm,z.dest].forEach(v=>{if(v)alms.add(v);}));const mn=parseN(x.min);
        a={id:uid(),desc:d,almPpal:x.ppal||null,alms:[...alms].filter(Boolean),ubic:null,cod:null,fam:x.fam,ud:x.ud,diam:null,min:isFinite(mn)&&mn>=0?mn:0,pp:0,plazo:null,prov:null,activo:true};
        cat.articulos.push(a);try{await saveCat();}catch(e){cat.articulos=cat.articulos.filter(z=>z!==a);return false;}}
      const toks=new Set(norm(d).split(/\s+/));
      grupo.forEach(z=>{z.art=a.id;const q=parseN(z.cant);if(isFinite(q)&&toks.has(String(q))){z.cant="";z._cantNombre=true;}if(z.tipo!=="traslado"&&z.auto.alm){z.alm="";delete z.auto.alm;}almSug(z);});
      /* la tarjeta que solo nombraba el artículo («reponer el pistonwax duo 15») sobra si hay otras con cantidad */
      rq.acc=rq.acc.filter(z=>!(z._cantNombre&&!z.cant&&rq.acc.some(o=>o!==z&&o.art===z.art&&o.cant)));
      if(r.sug)rq.dudas=(rq.dudas||[]).filter(t=>!t.includes("«"+r.sug+"»"));
      toast(ya?"Ya existía «"+a.desc+"»: puesto en las notas":"Artículo creado: "+a.desc);render(true);}}]);}
function pintaPie(){const p=$("rPie");if(!p||!rq.acc)return;p.textContent="";let mal=0;
  rq.acc.forEach(r=>{const fl=faltaR(r);if(fl.length)mal++;if(r._fl)r._fl.textContent=fl.length?"Falta: "+fl.join(", "):"";if(r._info){r._info.textContent=infoR(r);r._info.style.color=/quedan −/.test(r._info.textContent)?"var(--bad)":"";}});
  p.appendChild(el("button",{type:"button",class:"btn",style:"flex:1",id:"rSave",text:mal?"Faltan datos en "+mal+" de "+rq.acc.length:"Guardar todo ("+rq.acc.length+")",disabled:!!mal,onclick:guardarR}));
  p.appendChild(el("button",{type:"button",class:"btn sec",text:"Descartar",onclick:()=>{rq.acc=null;rq.dudas=[];rq.notasProc=null;render(true);}}));}
async function llamarFn(fn,body){if(!window.sbColada)throw new Error("Solo funciona en la app web");const r=await window.sbColada.functions.invoke(fn,{body});
  if(r.error){let m=r.error.message;try{const j=await r.error.context.json();if(j&&j.error)m=j.error;}catch(e){}throw new Error(m);}return r.data;}
/* ---- lector GRATIS (sin IA): entiende las frases típicas con el catálogo ---- */
const NUMW={un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,quince:15,veinte:20,treinta:30,cuarenta:40,cincuenta:50,cien:100};
const STOPW=new Set(["de","del","la","el","los","las","en","para","con","por","y","a","al","un","una","uno","mm","ud","uds","m","kg","l"]);
const sing=w=>w.length>4&&/es$/.test(w)&&!/[aeiou]es$/.test(w.slice(0,-1))?w.slice(0,-2):w.length>3&&/s$/.test(w)?w.slice(0,-1):w;
function fechaTxt(t,base){const d=new Date(base+"T12:00:00");const iso=x=>x.toISOString().slice(0,10);
  if(/\banteayer\b/.test(t)){d.setDate(d.getDate()-2);return iso(d);}if(/\bayer\b/.test(t)){d.setDate(d.getDate()-1);return iso(d);}if(/\bhoy\b/.test(t))return base;
  const DS=["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];for(let i=0;i<7;i++)if(new RegExp("\\b"+DS[i]+"\\b").test(t)){while(d.getDay()!==i)d.setDate(d.getDate()-1);return iso(d);}
  const m=t.match(/\b(\d{1,2})\s*[\/-]\s*(\d{1,2})(?:\s*[\/-]\s*(\d{2,4}))?\b/);if(m){const y=m[3]?(m[3].length===2?"20"+m[3]:m[3]):base.slice(0,4);const f=y+"-"+String(m[2]).padStart(2,"0")+"-"+String(m[1]).padStart(2,"0");if(!isNaN(Date.parse(f)))return f;}
  return null;}
function trozos(txt){return txt.split(/\.+(?=\s|$)|[;\n]+|\s+y\s+(?=(?:\d(?!\s*[.,]\s*\d)|un\b|una\b|dos\b|tres\b|cuatro\b|cinco\b|seis\b|siete\b|ocho\b|nueve\b|diez\b|otr|cambi|consum|gast|entr|lleg|baj|pas|cont|hay\b))|,\s*(?=otr[oa]\b|tambien\b)|\b(?:otro|otra)\s+(?=cambio)/).map(x=>(x||"").trim()).filter(x=>x.length>1);}
function aliasAlm(){return cat.almacenes.map(l=>{const n=norm(l.nom);const al=[];const ult=n.split(/\s+/).pop();if(ult&&ult.length<=4)al.push(ult);const nv=ult&&ult.match(/^n(\d)([a-z]?)$/);if(nv&&l.tipo==="produccion"){al.push("nave "+nv[1]+nv[2],"nave "+nv[1]+(nv[2]?" "+nv[2]:""));if(!nv[2])al.push("n "+nv[1]);}
  if(l.tipo==="central"&&/general|central/.test(n))al.push("general","central");if(/consumible/.test(n))al.push("consumibles","consumible");al.push(n.replace(/^almacen (de )?(produccion )?/,""));return{l,al:Array.from(new Set(al.filter(Boolean)))};});}
function buscaAlms(t){const out=[];aliasAlm().forEach(({l,al})=>{al.forEach(a=>{const re=new RegExp("\\b"+a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","g");let m;while((m=re.exec(t)))out.push({id:l.id,i:m.index,len:a.length});});});
  out.sort((a,b)=>a.i-b.i||b.len-a.len);const res=[];out.forEach(o=>{if(!res.some(r=>o.i<r.i+r.len&&r.i<o.i+o.len))res.push(o);});return res;}
function buscaArt(t,soloPist){const toks=t.split(/[^a-z0-9ñ,]+/).filter(Boolean).map(sing);let best=null,bs=0,bf=0,emp=false;
  artsActivos().filter(a=>soloPist?a.fam==="piston":a.fam!=="piston").forEach(a=>{if(a.cod&&new RegExp("\\b"+norm(a.cod)+"\\b").test(t)){best=a;bs=99;bf=1;emp=false;return;}
    const dt=norm(a.desc).split(/[^a-z0-9ñ,]+/).filter(w=>w&&!STOPW.has(w)).map(sing);if(!dt.length)return;
    let sc=0;dt.forEach(w=>{if(toks.some(x=>x===w||(w.length>=4&&x.length>=4&&(x.startsWith(w)||w.startsWith(x)))))sc++;});
    if(!sc||!dt.some(w=>/[a-zñ]{3,}/.test(w)&&toks.some(x=>x===w||(w.length>=4&&x.length>=4&&(x.startsWith(w)||w.startsWith(x))))))return;
    const fr=sc/dt.length;if(sc>bs||(sc===bs&&fr>bf)){best=a;bs=sc;bf=fr;emp=false;}else if(sc===bs&&fr===bf)emp=true;});
  return emp?null:best;}
function leerLocal(txt){const base=hoy();let fUlt=null,lastEje={},prev=null;const acc=[],dudas=[];
  const OPS=(cat.operarios||[]);
  trozos(txt).forEach(orig=>{let t=" "+norm(orig).replace(/ø/g," diam ").replace(/\s+/g," ")+" ";const x={texto:orig.trim()};
    const f=fechaTxt(t,base);if(f)fUlt=f;x.fecha=fUlt;t=t.replace(/\b(\d{1,2})\s*[\/-]\s*(\d{1,2})(\s*[\/-]\s*\d{2,4})?\b/g," ");
    /* ejes */
    const ER=/\b(\d)\s*[.,]\s*(\d)\s*[.,]\s*([a-j])\s*(q|")?\s*[-–]?\s*(\d{1,2})\b/g,ER2=/\b(\d)\s*[.,\s]\s*(\d)\s*[.,\s]\s*([a-j])\s*(q|")?\s*[-–\s]?\s*(\d{1,2})\b/g;
    let codes=[],m2;const er=/\beje/.test(t)?ER2:ER;let lastEnd=0;
    while((m2=er.exec(t))){codes.push(m2[1]+"."+m2[2]+"."+m2[3].toUpperCase()+(m2[4]?'"':"")+"-"+m2[5]);lastEnd=m2.index+m2[0].length;}
    if(codes.length){let tp=/recib|llegad|vuelt|venid|ha venido|han venido|traid/.test(t)?"eje_rec":/envi|mandad|mande|mandamos|se van|se lleva/.test(t)?"eje_env":/prepar|desperf|para (enviar|reparar|el taller)|rot[oa]|mal\b|fuga|agarrot|poros|machac|no entra|no circula/.test(t)?"eje_prep":(lastEje.tipo||"eje_prep");
      let alb=null;const ab=t.match(/\balbaran\s*(?:n\w*\s*)?([a-z0-9\-\/]{3,})/)||t.match(/\b(\d{5,6}a\d{2})\b/);if(ab)alb=ab[1].toUpperCase();else if(tp==="eje_rec"&&lastEje.tipo==="eje_rec")alb=lastEje.alb;
      let desp=tp==="eje_prep"?t.slice(lastEnd).replace(/\b(preparad[oa]s?|para (enviar|reparar|el taller)|por|porque|que|tiene|con|esta|eje|desperfecto|:)\b/g," ").replace(/[,.:;]+/g," ").replace(/\s+/g," ").trim():"";
      if(tp==="eje_prep"&&!desp&&lastEje.tipo==="eje_prep")desp=lastEje.desp||"";
      lastEje={tipo:tp,alb,desp};
      codes.forEach(c=>{if(!ejeDe(c))dudas.push("No existe el eje "+c);acc.push({tipo:tp,eje:c,fecha:x.fecha,desperfecto:desp?desp.toUpperCase():null,albaran:alb,texto:orig.trim()});});
      return;}
    if(/\beje/.test(t)&&!/\bpiston/.test(t)&&!/\bf\s*-?\s*\d{1,2}\b|\b(?:la|maquina|inyectora)\s+\d{1,2}\b/.test(t)){dudas.push("No encuentro el código del eje en «"+orig.trim()+"» (escríbelo así: 2.3.C-3)");return;}
    const hayMaq=/\bf\s*-?\s*\d{1,2}\b|\b(?:la|maquina|inyectora|iny)\s+\d{1,2}\b/.test(t)&&cat.maquinas.length;
    const esPist=/\bpiston(es)?\b/.test(t);
    const T_ENT=/\b(entrada|llegad[oa]s?|ha llegado|han llegado|recibid[oa]s?|recibo|recibimos|traen|traido|trajeron)\b/,T_CON=/\b(contad[oa]s?|conte|contamos|recuento|inventario)\b/,
      T_TRA=/\b(traslad\w*|baj(o|ar|ado|amos|e)|sub(o|ir|ido|imos|e)|pasad[oa]s?|pas(o|ar|amos)|llevad[oa]s?|llev(o|ar|amos)|repu(s|es)\w*|repon\w*|dej(o|ar|ado|amos|e)|meter|metid[oa]s?|met(o|emos))\b/,
      T_CONS=/\b(cambiad[oa]s?|cambi(o|amos|e|ar)|gast\w*|consum\w*|sacad[oa]s?|sac(o|ar|amos)|usad[oa]s? en|pues(to|tos|ta|tas)|cog\w*|necesit\w*)\b/;
    let tipo=(hayMaq&&(esPist||(/\bcambi/.test(t)&&!/\b(barra|tornillo)/.test(t))))?"piston":T_ENT.test(t)?"entrada":T_CON.test(t)?"conteo":(T_TRA.test(t)&&!/\ben el eje\b/.test(t))?"traslado":esPist&&hayMaq?"piston":T_CONS.test(t)?"consumo":null;
    const expl=!!tipo,propio=sugNombre(orig);if(!tipo)tipo=prev&&prev.tipo!=="piston"&&!propio?prev.tipo:(esPist&&!hayMaq?"traslado":"consumo");
    /* inyectora */
    let maq=null;const mq=t.match(/\bf\s*-?\s*(\d{1,2})\b/)||t.match(/\b(?:la|maquina|inyectora|iny|en)\s+(\d{1,2})\b/);
    if(mq){const m=cat.maquinas.find(z=>norm(z.cod)==="f"+mq[1]);if(m){maq=m.id;t=t.replace(mq[0]," ");}}
    /* «uno de 70», «2 del 80 esp»: cantidad y diámetro juntos */
    let diam=null,cant=null;
    const nd=t.match(/\b(\d+|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(?:pist\w*\s+)?(?:de\s+|del\s+|de\s+diam\w*\s+)?(50|60|70|80|90|100)\b(\s*esp\w*|\s*e\b)?/);
    if(nd&&(esPist||(prev&&prev.diametro)||/\bdel?\s+(50|60|70|80|90|100)\b/.test(nd[0]))){const d="Ø "+nd[2]+(nd[3]?" esp":"");if(DIAM.includes(d)){diam=d;cant=/^\d+$/.test(nd[1])?+nd[1]:NUMW[nd[1]];t=t.replace(nd[0]," ");}}
    if(!diam){const dm=t.match(/\b(?:diam\w*\s*|del\s+|de\s+)?(50|60|70|80|90|100)\b\s*(esp\w*|e\b)?/);
      if(dm&&(tipo==="piston"||esPist)){const d="Ø "+dm[1]+(dm[2]?" esp":"");if(DIAM.includes(d)){diam=d;t=t.replace(dm[0]," ");}}}
    /* motivo y destino del usado */
    const MOT=[[/desgast|gastad/,"DESGASTE"],[/\broto\b|rotura|rompi/,"ROTURA"],[/fuga|agua/,"FUGA DE AGUA"],[/agarrot|clavad/,"PISTÓN AGARROTADO"],[/cambio de ref|cambio ref|\bref\b|referencia/,"CAMBIO REF"],[/preventiv/,"CAMBIO PREVENTIVO"],[/prueba/,"PRUEBAS"],[/sin pistonwax|sin wax/,"TRABAJANDO SIN PISTONWAX"]];
    const DST=[[/en el eje|queda puesto|se queda/,"QUEDA PUESTO EN EL EJE (AGARROTADO)"],[/usados|a la zona|zona de pist/,"ZONA DE PISTONES USADOS"],[/desech|basura|tirad/,"DESECHADO"],[/no esta|ni en eje|perdid/,"NO ESTÁ EN LA ZONA PISTONES USADO NI EN EJE"]];
    if(tipo==="piston"){const dp=DST.find(([re])=>re.test(t));if(dp)x.destino_piston=dp[1];
      const mo=MOT.find(([re])=>re.test(dp&&dp[1].startsWith("QUEDA")?t.replace(/agarrot\w*/,""):t));if(mo)x.motivo=mo[1];
      /* responsable */
      let rm=t.match(/\b(?:el|resp\w*|operario|oper|numero|num|nº|n)\s*(\d{2,3})\b/);
      if(!rm){const nums=(t.match(/\b\d{2,3}\b/g)||[]);const o=nums.find(n=>OPS.some(z=>String(z.num)===n));if(o)rm=[o,o];}
      if(rm){x.responsable=rm[1];t=t.replace(rm[0]," ");}
      else{const o=responsables().filter(z=>/[a-zñ]{3,}/i.test(norm(z))).sort((p,q)=>q.length-p.length).find(z=>new RegExp("\\b"+norm(z).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b").test(t));if(o){x.responsable=o;t=t.replace(norm(o)," ");}}}
    /* almacenes */
    const als=buscaAlms(t),t0=t;als.forEach(a=>{t=t.slice(0,a.i)+" ".repeat(a.len)+t.slice(a.i+a.len);});
    if(tipo==="traslado"){if(als.length>=2){x.almacen=als[0].id;x.destino=als[1].id;}else if(als.length===1){const pre=t0.slice(0,als[0].i).replace(/\s*\b(del\s+|de\s+la\s+|de\s+|la\s+|el\s+)?(almacen|nave)(\s+de)?(\s+la|\s+el)?\s*$/,"").trim();if(/\b(de|desde|del)$/.test(pre))x.almacen=als[0].id;else x.destino=als[0].id;}}
    else if(als.length)x.almacen=als[0].id;
    /* proveedor y albarán */
    if(tipo==="entrada"){const p=cat.proveedores.find(z=>new RegExp("\\b"+norm(z.nom)+"\\b").test(t));if(p){x.proveedor=p.id;t=t.replace(norm(p.nom)," ");}
      const ab=t.match(/\balbaran\s*(?:n\w*\s*)?([a-z0-9\-\/]{3,})/);if(ab){x.albaran=ab[1].toUpperCase();t=t.replace(ab[0]," ");}}
    /* artículo (antes que la cantidad, para que «Duo 15» o «2kg» cuenten como parte del nombre) */
    let a=null;
    if(tipo!=="piston"){a=diam?pistArt(diam):buscaArt(t,false);
      const ft=/\bbarra/.test(t)?"barra":/\btornillo/.test(t)?"tornillo":null;
      if(ft&&maq&&(!a||a.fam===ft)){const cs=artsActivos().filter(z=>z.fam===ft&&(z.iny||[]).includes(maq));if(cs.length===1)a=cs[0];else if(cs.length>1&&!(a&&cs.includes(a)))a=null;}
      if(a&&!diam){norm(a.desc).split(/[^a-z0-9ñ,]+/).filter(w=>w&&!STOPW.has(w)).forEach(w=>{const b=sing(w);t=t.replace(new RegExp("\\b"+b.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(es|s)?\\b")," ");});if(a.cod)t=t.replace(new RegExp("\\b"+norm(a.cod)+"\\b")," ");}}
    /* cantidad */
    if(cant==null){const cm=t.match(/(\d+(?:[.,]\d+)?)(?!\d|[.,]\d)/);
      if(cm){cant=parseN(cm[1]);t=t.replace(cm[0]," ");}else{const w=Object.keys(NUMW).find(k=>new RegExp("\\b"+k+"\\b").test(t));if(w){cant=NUMW[w];t=t.replace(new RegExp("\\b"+w+"\\b")," ");}}}
    x.cantidad=cant;
    /* lo que no se dice se toma de la nota anterior («… y 220 en nave 2», «y 2 de 80») */
    const hereda=prev&&prev.tipo===tipo&&tipo!=="piston"&&!propio&&(!expl||!a);
    if(tipo==="piston"){x.tipo="piston";x.maquina=maq;x.diametro=diam;if(!maq)x._duda="No sé en qué inyectora: «"+orig.trim()+"»";}
    else{x.tipo=tipo;if(maq)x.maquina=maq;
      if(!a&&hereda&&prev.articulo&&!diam)a=art(prev.articulo);
      x.articulo=a?a.id:null;if(diam)x.diametro=diam;if(x.cantidad==null&&a&&TEC(a.fam))x.cantidad=1;
      if(hereda){if(tipo==="traslado"){if(!x.almacen&&prev.almacen&&x.destino!==prev.almacen)x.almacen=prev.almacen;if(!x.destino&&prev.destino&&x.almacen!==prev.destino)x.destino=prev.destino;}else if(!x.almacen&&prev.almacen)x.almacen=prev.almacen;
        if(prev.cantidad==null&&prev.articulo===x.articulo&&!prev._usada){const k=acc.indexOf(prev);if(k>=0)acc.splice(k,1);}
        prev._usada=true;}
      if(!a){x.nombre_sugerido=(hereda&&prev&&prev.nombre_sugerido)||sugNombre(orig);x._duda="No está en el catálogo: «"+(x.nombre_sugerido||orig.trim())+"». Pulsa «Crear artículo» en su tarjeta";}}
    acc.push(x);prev=x;});
  acc.forEach(x=>{if(x._duda&&!dudas.includes(x._duda))dudas.push(x._duda);delete x._duda;delete x._usada;});
  return{acciones:acc,dudas};}
async function addNota(t){const it={id:uid(),t,f:hoy(),ts:Date.now()};if(db.itemsAdd)await db.itemsAdd("notas","pend",[it]);else{const ref=db.doc("notas/pend"),sn=await ref.get();await ref.set({items:(sn.exists?(sn.data().items||[]):[]).concat([it])});}}
async function delNotas(ids){if(db.itemsDelId){await db.itemsDelId("notas","pend",ids);return;}const S=new Set(ids);const ref=db.doc("notas/pend"),sn=await ref.get();if(!sn.exists)return;await ref.set({items:(sn.data().items||[]).filter(n=>!S.has(n.id))});}
async function guardarNota(){const t=rq.txt.trim();if(!t){toast("Escribe o dicta la nota");return;}if(!db){toast("No se puede guardar");return;}
  try{await addNota(t);rq.txt="";toast("Nota guardada");}catch(e){toast("No se pudo guardar la nota");}render(true);}
function procesarNotas(ia){if(!notas.length)return;const hy=hoy();rq.txt=notas.map(n=>(n.f&&n.f!==hy?fmtF(n.f).slice(0,5)+" ":"")+n.t).join(". ");rq.notasProc=notas.map(n=>n.id);entender(ia);}
async function entender(ia){const t=(ia&&!rq.txt.trim()?rq.ult:rq.txt).trim();if(!t){toast("Escribe o dicta lo que ha pasado");return;}
  const quitarLote=ia&&!rq.txt.trim()&&rq.lote;
  rq.cargando=ia?"ia":"local";rq.ofrecerIA=false;render(true);
  try{const d=ia?await llamarFn("interpretar-almacen",{texto:t,hoy:hoy(),dia:DIAS_S[new Date().getDay()],contexto:ctxIA()}):leerLocal(t);
    const lote=uid();const acc=(d.acciones||[]).map(x=>{const r=normAcc(x);r.lote=lote;return r;});
    if(quitarLote)rq.acc=(rq.acc||[]).filter(r=>r.lote!==quitarLote);
    rq.dudas=d.dudas||[];rq.acc=(rq.acc||[]).concat(acc);rq.ia=!!ia;
    if(acc.length){rq.ult=t;rq.lote=lote;rq.txt="";}else{toast("No he encontrado nada que apuntar");if(!ia)rq.ofrecerIA=true;}}
  catch(e){toast("No se pudo: "+(e&&e.message||e));}
  rq.cargando=false;render(true);}
async function guardarR(){const L=rq.acc||[];if(!L.length)return;if(L.some(r=>faltaR(r).length)){toast("Completa lo que falta");return;}
  if(!db){toast("No se puede guardar");return;}const b=$("rSave");if(b){b.disabled=true;b.textContent="Guardando…";}
  const movs=[],pists=[];
  L.forEach(r=>{if(r.tipo.startsWith("eje_"))return;const q=parseN(r.cant),nota=(r.nota||"").trim()||null;
    if(r.tipo==="piston"){const n=Math.round(q);const rec={id:uid(),f:r.f,maq:r.maq,diam:r.diam,cant:n,motivo:r.motivo,dest:r.dp,resp:(r.resp||"").trim()||null,nota};
      const pa=pistArt(r.diam);if(pa&&r.alm){const m={id:uid(),f:r.f,tipo:"salida",art:pa.id,alm:r.alm,cant:n,maq:r.maq,nota:"Cambio de pistón · "+cap(r.motivo)};movs.push(m);rec.movId=m.id;}pists.push(rec);}
    else if(r.tipo==="conteo"){const st=stockA(r.art,r.alm,r.f);movs.push({f:r.f,tipo:"ajuste",art:r.art,alm:r.alm,cant:Math.round((q-st)*1000)/1000,contado:q,teorico:st,nota:nota||"Recuento"});}
    else{const m={f:r.f,tipo:r.tipo==="consumo"?"salida":r.tipo,art:r.art,alm:r.alm,cant:q,nota};if(r.tipo==="traslado")m.dest=r.dest;if(r.tipo==="consumo")ponPara(m,r.maq);
      if(r.tipo==="entrada"){if(r.prov)m.prov=r.prov;if((r.alb||"").trim())m.alb=r.alb.trim();}movs.push(m);}});
  try{if(movs.length)await addMovs(movs);if(pists.length){await addPists(pists);try{await ejePendDe(pists);}catch(e){}}
    for(const r of L.filter(x=>x.tipo.startsWith("eje_"))){const e=ejeDe(r.eje);if(!e)continue;
      if(r.tipo==="eje_prep"){await addRep({eje:e.cod,desp:r.desp.trim().toUpperCase(),alta:r.f,env:null});await updEje(e,{estado:"preparado"});}
      else if(r.tipo==="eje_env")await enviar([e],r.f);else await recibir([e],r.f,(r.alb||"").trim(),"ok");}
    if(rq.notasProc&&rq.notasProc.length){await delNotas(rq.notasProc);rq.notasProc=null;}
    let cc=false;L.filter(r=>r.tipo==="entrada").forEach(r=>{const x=art(r.art);if(x&&x.pedido){aplicarPedido(x,null);cc=true;}});if(cc)await saveCat();
    const pr=L.filter(r=>r.tipo==="piston");if(pr.length){const u=pr[pr.length-1];if((u.resp||"").trim())lsSet("alm.resp",u.resp.trim());lsSet("alm.dp",u.dp);}
    toast("Guardado: "+L.length+" apunte"+(L.length>1?"s":""));rq.acc=null;rq.dudas=[];
  }catch(e){toast("No se pudo guardar: "+(e&&e.message||"error"));}
  render(true);}
function dictar(btn,ta){if(!SR){ta.focus();toast("Pulsa el micrófono del teclado");return;}
  let rec;try{rec=new SR();}catch(e){ta.focus();toast("Pulsa el micrófono del teclado");return;}
  rec.lang="es-ES";rec.interimResults=true;rec.continuous=false;const base=ta.value.trim()?ta.value.trim()+" ":"";
  rec.onresult=e=>{let s="";for(const x of e.results)s+=x[0].transcript;ta.value=base+s;rq.txt=ta.value;};
  rec.onerror=e=>{if(e.error!=="no-speech"&&e.error!=="aborted")toast("Micrófono: "+e.error);};
  rec.onend=()=>{btn.textContent="Dictar";btn.disabled=false;};
  btn.textContent="Escuchando…";btn.disabled=true;try{rec.start();}catch(e){btn.textContent="Dictar";btn.disabled=false;}}
function vRap(v){
  const ta=el("textarea",{id:"rTxt",placeholder:"Ej.: cambio de pistón del 90 especial en la 66 por desgaste, a usados, el 211. Y 3 escobas en N1A",style:"font-size:17px;min-height:104px"});
  ta.value=rq.txt;ta.addEventListener("input",()=>{rq.txt=ta.value;});
  const go=el("button",{type:"button",class:"btn",style:"flex:1",text:rq.cargando==="local"?"Leyendo…":"Entender",disabled:!!rq.cargando,onclick:()=>entender(false)});
  const goIA=rq.ofrecerIA?el("div",{class:"banner",style:"display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0"},[el("span",{style:"flex:1;min-width:160px",text:"No lo he entendido. La IA lo lee mejor (medio céntimo)."}),el("button",{type:"button",class:"btn peq",text:rq.cargando==="ia"?"Pensando…":"Probar con IA",disabled:!!rq.cargando,onclick:()=>entender(true)})]):null;
  const goNota=el("button",{type:"button",class:"btn sec",style:"flex:1",text:"＋ Guardar como nota",onclick:guardarNota});
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Apuntar rápido"}),el("span",{class:"der sub",text:"Escríbelo o díctalo como lo dirías"})]),
    el("div",{class:"bd frm",style:"gap:10px"},[ta,el("div",{class:"acciones"},[SR?el("button",{type:"button",class:"btn sec",text:"Dictar",onclick:e=>dictar(e.currentTarget,ta)}):null,goNota]),el("div",{class:"acciones"},[go]),goIA,
      el("details",{},[el("summary",{class:"hint",style:"cursor:pointer;font-weight:600",text:"¿Qué frases entiende?"}),el("p",{class:"hint",text:"Durante el día ve guardando notas y al final procésalas todas juntas. O pulsa «Entender» para hacerlo al momento. «Entender» es gratis: entiende frases como «pistón 90 esp en la 66 desgaste el 211», «3 escobas N1A», «bajado 2 pistones del 80 de general a N2», «entrada 20 m manguera Eguiber», «eje 2.3.C-3 postizo roto», «recibidos 3.1.A-9 y 2.2.B-4 albarán 001400A26». Si no lo entiende bien, «Con IA» lo lee mejor (medio céntimo cada vez; si pones varias cosas juntas, se paga una sola vez). Antes de guardar lo ves todo y lo puedes corregir."})])])]));
  v.appendChild(el("datalist",{id:"lOperR"},responsables().map(x=>el("option",{value:x}))));
  v.appendChild(el("datalist",{id:"lEjesR"},ejes.map(e=>el("option",{value:e.cod}))));
  if(notas.length){const hy=hoy();v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Notas pendientes ("+notas.length+")"}),el("span",{class:"der sub",text:"Se procesan todas de una vez"})]),
    el("div",{class:"lst"},notas.slice().sort((a,b)=>a.ts-b.ts).map(n=>el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},[el("div",{class:"t1",style:"font-weight:500",text:n.t}),el("div",{class:"t2",text:(n.f!==hy?fmtF(n.f)+" · ":"")+new Date(n.ts).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})})]),
      el("button",{type:"button",class:"btn txt peq","aria-label":"Borrar nota",text:"✕",onclick:async()=>{try{await delNotas([n.id]);}catch(e){toast("No se pudo borrar");}}})]))),
    el("div",{class:"bd acciones"},[el("button",{type:"button",class:"btn",style:"flex:1",text:rq.cargando==="local"?"Leyendo…":"Procesar todas (gratis)",disabled:!!rq.cargando||!!(rq.acc&&rq.acc.length),onclick:()=>procesarNotas(false)}),
      el("button",{type:"button",class:"btn sec",text:rq.cargando==="ia"?"Pensando…":"Todas con IA (½ cént.)",disabled:!!rq.cargando||!!(rq.acc&&rq.acc.length),onclick:()=>procesarNotas(true)})])]));}
  if(rq.dudas&&rq.dudas.length)v.appendChild(el("div",{class:"banner"},[el("b",{text:"Revisa: "}),rq.dudas.join(" · ")]));
  if(rq.acc&&rq.acc.length&&!rq.ia&&rq.lote&&rq.acc.some(r=>r.lote===rq.lote&&faltaR(r).length))v.appendChild(el("div",{class:"acciones"},[el("span",{class:"hint",style:"flex:1;align-self:center",text:"¿No lo ha entendido bien?"}),el("button",{type:"button",class:"btn sec peq",text:"Probar con IA (½ cént.)",disabled:!!rq.cargando,onclick:()=>{rq.txt="";entender(true);}})]));
  if(rq.acc&&rq.acc.length){rq.acc.forEach(r=>v.appendChild(filaR(r)));v.appendChild(el("div",{id:"rPie",class:"acciones",style:"position:sticky;bottom:0;background:var(--bg);padding:8px 0"}));pintaPie();}
  apuntesHoy(v);}
function apuntesHoy(v){const hy=hoy();
  const ps=todosPist().filter(p=>p.f===hy).reverse();const ids=new Set(ps.map(p=>p.movId).filter(Boolean));
  const ms=todosMov().filter(m=>m.f===hy&&!ids.has(m.id)).sort((a,b)=>(b.ts||0)-(a.ts||0));
  const rows=ps.map(p=>el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},[el("div",{class:"t1",text:"Pistón "+p.diam+((+p.cant||1)>1?" ×"+p.cant:"")+" · "+maqN(p.maq)}),
      el("div",{class:"t2",text:[cap(p.motivo),cap(p.dest||""),p.resp?respTxt(p.resp):null].filter(Boolean).join(" · ")})]),
      el("button",{type:"button",class:"btn txt peq",text:"Borrar",onclick:()=>confirmar("¿Borrar este cambio?","Cambio de "+p.diam+" en "+maqN(p.maq)+(p.movId?". El pistón vuelve al stock.":"."),"Borrar",async()=>{await delPist(p);toast("Borrado");})})]))
    .concat(ms.map(m=>{const a=art(m.art);return el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},[el("div",{class:"t1",text:a?a.desc:"(borrado)"}),el("div",{class:"t2",text:TIPOS[m.tipo]+" · "+dondeTxt(m)})]),
      el("b",{class:"num",text:signo(m)}),el("button",{type:"button",class:"btn txt peq",text:"Borrar",onclick:()=>confirmar("¿Borrar este movimiento?",TIPOS[m.tipo]+" · "+(a?a.desc:"")+"."+txtBorraMov(m),"Borrar",async()=>{await borraMov(m);toast("Borrado");})})]);}));
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Apuntado hoy ("+rows.length+")"})),rows.length?el("div",{class:"lst"},rows):el("div",{class:"empty",text:"Nada todavía."})]));}

/* descripciones para el historial de cambios */
window.descCambio=(col,it)=>{if(col==="mov"){const a=art(it.art);return TIPOS[it.tipo]+" "+signo(it)+(a?" "+a.ud+" "+a.desc:"")+" · "+dondeTxt(it)+" · "+fmtF(it.f);}
  if(col==="pist")return"Cambio de pistón "+it.diam+((+it.cant||1)>1?" ×"+it.cant:"")+" en "+maqN(it.maq)+" · "+cap(it.motivo||"")+" · "+fmtF(it.f);
  if(col==="rep")return"Eje "+it.eje+": "+(it.res==="ok"?"recibido OK "+fmtF(it.rec):it.nook?"devuelto NO-OK":it.env?"enviado a reparar "+fmtF(it.env):"preparado para enviar")+(it.desp?" · "+it.desp:"");
  if(col==="notas")return"Nota: "+it.t;return null;};
window.descDoc=(col,id,a,d)=>{if(col==="ejes"){const x=d||a;const e=s=>(EST_E[s]||[s])[0];return"Eje "+x.cod+": "+(a&&d&&a.estado!==d.estado?e(a.estado)+" → "+e(d.estado):!a?"dado de alta":!d?"borrado":"datos cambiados");}
  if(col==="cat")return"Catálogo (artículos, almacenes, inyectoras, proveedores…)";return null;};

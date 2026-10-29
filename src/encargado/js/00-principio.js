
(function(){
const URL_SB="https://uddejncrjcyyaxjocbpj.supabase.co",KEY="sb_publishable_UqnQLvLkCI0kk_y1KDt94Q_ccYmLw2i";
const ERR={DEMASIADAS:"Demasiados trabajos de golpe (máximo 300)",SESION:"Tu sesión ha caducado. Vuelve a entrar en la app.",NO_ADMIN:"Esto solo lo puede hacer el jefe",FALTA_TITULO:"Pon un título",FALTA_TIPO:"Elige qué pasa",FECHAS_MAL:"Las fechas están al revés",ARCHIVO_TIPO:"La foto no vale",ARCHIVO_GRANDE:"Demasiadas fotos: quita alguna"};
const $=id=>document.getElementById(id);
function el(t,a,k){const e=document.createElement(t);if(a)for(const x in a){const v=a[x];if(v==null||v===false)continue;if(x==="text")e.textContent=v;else if(x.startsWith("on"))e[x]=v;else e.setAttribute(x,v===true?"":v);}
  (Array.isArray(k)?k:k!=null?[k]:[]).flat(9).forEach(c=>{if(c==null||c===false)return;e.appendChild(typeof c==="string"?document.createTextNode(c):c);});return e;}
const ls={get:k=>{try{return localStorage.getItem(k);}catch(e){return null;}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch(e){}}};
function toast(t){const d=el("div",{class:"toast",text:t});document.body.appendChild(d);setTimeout(()=>d.remove(),2600);}
async function rpc(fn,args){const r=await fetch(URL_SB+"/rest/v1/rpc/"+fn,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:JSON.stringify(args||{})});
  const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null;}catch(e){}
  if(!r.ok){const m=(j&&j.message)||txt||("Error "+r.status);const k=Object.keys(ERR).find(x=>m.includes(x));if(!k&&r.status!==401&&window.reportarError)reportarError(new Error("rpc "+fn+": "+String(m).slice(0,300)),"args: "+Object.keys(args||{}).join(","));throw new Error(k?ERR[k]:m);}return j;}
function dlg(titulo,cuerpo,botones){const ov=el("div",{class:"ov"});const cerrar=()=>ov.remove();
  const bs=(botones||[{t:"Cerrar",cls:"sec"}]).map(b=>el("button",{class:"btn "+(b.cls||""),text:b.t,onclick:async e=>{if(!b.fn){cerrar();return;}e.target.disabled=true;try{const r=await b.fn();if(r!==false)cerrar();}catch(er){toast(er.message);}e.target.disabled=false;}}));
  ov.appendChild(el("div",{class:"dlg",role:"dialog","aria-modal":"true"},[el("h3",{text:titulo}),cuerpo,el("div",{class:"row",style:"margin-top:12px"},bs)]));
  ov.onclick=e=>{if(e.target===ov)cerrar();};document.body.appendChild(ov);return cerrar;}
const fld=(l,c)=>el("label",{class:"f"},[el("span",{text:l}),c]);
function inp(v,on,a){const i=el("input",Object.assign({value:v==null?"":v},a||{}));i.oninput=()=>on(i.value);return i;}
function area(v,on,rows){const i=el("textarea",{rows:rows||4});i.value=v||"";i.oninput=()=>on(i.value);return i;}
const hoyISO=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10);};
const sumaD=(f,n)=>{const d=new Date(f+"T12:00:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
const dow=f=>new Date(f+"T12:00:00").getDay();
const fLarga=f=>{const t=new Date(f+"T12:00:00").toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});return t.charAt(0).toUpperCase()+t.slice(1);};
const fCorta=f=>new Date(f+"T12:00:00").toLocaleDateString("es-ES",{weekday:"short",day:"numeric",month:"numeric"});
const cuando=ts=>new Date(ts).toLocaleString("es-ES",{weekday:"short",day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"});
const nom1=n=>(n||"").split(" ")[0];
/* sábado de este fin de semana (o el próximo) */
const sabado=()=>{const h=hoyISO(),d=dow(h);return d===6?h:d===0?sumaD(h,-1):sumaD(h,6-d);};
function comprime(f){return new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const M=1000,k=Math.min(1,M/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);let q=.6,d=c.toDataURL("image/jpeg",q);while(d.length>200000&&q>.3){q-=.08;d=c.toDataURL("image/jpeg",q);}ok(d);};im.onerror=ko;im.src=r.result;};r.onerror=ko;r.readAsDataURL(f);});}
function verFoto(src){const v=el("div",{class:"visor",onclick:()=>v.remove()},el("img",{src,alt:"foto"}));document.body.appendChild(v);}
function botonFoto(txt,on){return el("label",{class:"btn sec peq",style:"cursor:pointer"},[txt,el("input",{type:"file",accept:"image/*",style:"display:none",onchange:async e=>{const f=e.target.files[0];if(!f)return;try{on(await comprime(f));}catch(er){toast("Esa foto no se ha podido leer");}e.target.value="";}})]);}

const S={tok:ls.get("limp.tok"),yo:JSON.parse(ls.get("limp.yo")||"null"),tab:ls.get("enc.tab")||"inicio",rol:null,res:null};
const Q=new URLSearchParams(location.search);const IR={t:Q.get("t"),c:Q.get("c"),i:Q.get("i")};
if(IR.t)S.tab="inicio";if(IR.c)S.tab="check";if(IR.i)S.tab="inc";
if(Q.toString())history.replaceState(null,"",location.pathname);
const esJefe=()=>S.rol==="admin";

const TABS=[["inicio","","Instrucciones"],["excel","","Trabajos"],["check","","Checklist"],["inc","","Incidencias"]];
function pintaNav(){const n=$("nav");n.hidden=false;n.textContent="";
  const L=TABS.concat(esJefe()?[["ajustes","","Ajustes"]]:[]);
  L.forEach(([k,i,t])=>{const cnt=k==="inicio"&&!esJefe()?S.res.traspasos_sin_leer:k==="inc"?S.res.inc_abiertas:0;
    n.appendChild(el("button",{"aria-selected":String(S.tab===k),onclick:()=>{S.tab=k;ls.set("enc.tab",k);pinta();window.scrollTo(0,0);}},[el("span",{text:i}),t,cnt?el("b",{class:"n",text:String(cnt)}):null]));});}

async function pinta(){const v=$("v");v.textContent="";
  if(!S.tok||!S.yo){v.appendChild(el("div",{class:"card"},el("div",{class:"bd"},[el("p",{text:"Primero entra en la app de limpieza con tu nombre y tu PIN."}),el("a",{class:"btn",href:"limpieza.html",text:"Ir a la app"})])));return;}
  $("who").textContent=nom1(S.yo.nombre);
  try{S.res=await rpc("enc_resumen",{p_tok:S.tok});}catch(e){v.appendChild(el("div",{class:"empty",text:e.message}));return;}
  S.rol=S.res.rol;
  if(S.rol==="no"){v.appendChild(el("div",{class:"card"},el("div",{class:"bd"},[el("p",{text:"Este apartado es solo para el encargado y el jefe."}),el("a",{class:"btn",href:"limpieza.html",text:"Volver a la app"})])));return;}
  if(S.tab==="ajustes"&&!esJefe())S.tab="inicio";
  pintaNav();
  ({inicio:vInicio,excel:vExcel,check:vCheck,inc:vInc,ajustes:vAjustes})[S.tab](v);}
const re=()=>pinta();

/* ---------------- INSTRUCCIONES ---------------- */
async function vInicio(v){
  if(esJefe())v.appendChild(el("button",{class:"btn grande",text:"＋ Dejar instrucciones al encargado",onclick:()=>formTraspaso({})}));
  else v.appendChild(el("p",{class:"hint",text:"Aquí te salen las instrucciones que te deja Cristian cuando no está. Léelas y pulsa «Leído» para que sepa que las tienes."}));
  const box=el("div",{class:"card"},el("div",{class:"empty",text:"Cargando…"}));v.appendChild(box);
  let L;try{L=await rpc("enc_traspasos",{p_tok:S.tok});}catch(e){box.firstChild.textContent=e.message;return;}
  box.textContent="";const h=hoyISO();
  const act=L.filter(x=>x.hasta>=h),pas=L.filter(x=>x.hasta<h);
  box.appendChild(el("div",{class:"hd"},el("h2",{text:"Para estos días ("+act.length+")"})));
  if(!act.length)box.appendChild(el("div",{class:"empty",text:esJefe()?"No has dejado instrucciones pendientes.":"No hay instrucciones nuevas "}));
  act.forEach(x=>box.appendChild(tarjetaT(x)));
  if(pas.length)v.appendChild(el("details",{class:"card"},[el("summary",{class:"hd",style:"cursor:pointer"},el("h2",{text:"Anteriores ("+pas.length+")"})),pas.map(x=>tarjetaT(x))]));
  if(IR.t){const id=IR.t;IR.t=null;const n=document.getElementById("t-"+id);if(n)setTimeout(()=>n.scrollIntoView({behavior:"smooth",block:"center"}),200);}}
function tarjetaT(x){const sinLeer=!x.leido_en;
  const fechas=x.desde===x.hasta?fLarga(x.desde):"Del "+fCorta(x.desde)+" al "+fCorta(x.hasta);
  const acc=[];
  if(!esJefe()&&sinLeer)acc.push(el("button",{class:"btn ok",text:"Leído",onclick:async()=>{try{await rpc("enc_traspaso_leido",{p_tok:S.tok,p_id:x.id});toast("Cristian ya sabe que lo has leído");re();}catch(e){toast(e.message);}}}));
  if(esJefe()){acc.push(el("button",{class:"btn sec peq",text:"Cambiar",onclick:()=>formTraspaso(x)}));
    acc.push(el("button",{class:"btn sec peq",text:"Quitar",onclick:async()=>{if(!confirm("¿Quitar estas instrucciones?"))return;try{await rpc("enc_traspaso_borrar",{p_tok:S.tok,p_id:x.id});toast("Quitadas");re();}catch(e){toast(e.message);}}}));}
  return el("div",{class:"it"+(sinLeer&&!esJefe()?" nuevo":""),id:"t-"+x.id},[el("div",{class:"t",text:x.titulo}),
    el("div",{class:"meta"},[el("span",{text:""+fechas}),esJefe()?el("span",{class:"pill "+(sinLeer?"warn":"ok"),text:sinLeer?"Sin leer todavía":"Leído por "+nom1(x.leido_por_n)+" · "+cuando(x.leido_en)}):(sinLeer?el("span",{class:"pill warn",text:"Nuevo"}):el("span",{class:"pill ok",text:"Leído"}))]),
    x.texto?el("div",{class:"tx",text:x.texto}):null,acc.length?el("div",{class:"row"},acc):null]);}
function formTraspaso(x0){const x=Object.assign({desde:sabado(),hasta:sumaD(sabado(),1),titulo:"",texto:""},x0);
  const dI=inp(x.desde,v=>x.desde=v,{type:"date"}),hI=inp(x.hasta,v=>x.hasta=v,{type:"date"});
  const rap=(t,d,h)=>el("button",{type:"button",class:"chip",text:t,onclick:()=>{x.desde=d;x.hasta=h;dI.value=d;hI.value=h;}});
  const h=hoyISO();
  dlg(x.id?"Cambiar instrucciones":"Instrucciones para el encargado",el("div",null,[
    el("div",{class:"chips",style:"margin:0 0 10px"},[rap("Este fin de semana",sabado(),sumaD(sabado(),1)),rap("Hoy",h,h),rap("Mañana",sumaD(h,1),sumaD(h,1)),rap("Toda la semana",h,sumaD(h,6))]),
    el("div",{class:"row"},[fld("Desde",dI),fld("Hasta",hI)]),
    fld("Título",inp(x.titulo,v=>x.titulo=v,{placeholder:"p. ej. Fin de semana 24-25: limpieza F28"})),
    fld("Qué tiene que hacer o tener en cuenta",area(x.texto,v=>x.texto=v,7)),
    el("p",{class:"hint",text:"Le llega un aviso al móvil. Cuando lo lea, aquí verás «Leído»."+(x.id?" Si lo cambias, tendrá que volver a leerlo.":"")})]),
    [{t:"Cancelar",cls:"sec"},{t:x.id?"Guardar":"Enviar",cls:"ok",fn:async()=>{if(!x.titulo.trim()){toast("Pon un título");return false;}if(x.hasta<x.desde){toast("Las fechas están al revés");return false;}
      await rpc("enc_traspaso_guardar",{p_tok:S.tok,p:{id:x.id||null,desde:x.desde,hasta:x.hasta,titulo:x.titulo,texto:x.texto}});toast("Enviado al encargado");re();}}]);}


/* ---------------- IMPORTAR TRABAJOS DEL FIN DE SEMANA DESDE EXCEL ---------------- */
function cargaJS(src,glob){return window[glob]?Promise.resolve():new Promise((ok,ko)=>{const x=document.createElement("script");x.src=src;x.onload=ok;x.onerror=()=>ko(new Error("No se pudo cargar el lector de Excel. Revisa internet."));document.head.appendChild(x);});}
const norm=t=>String(t==null?"":t).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
const CAMPOS=[["titulo","Trabajo",/^(trabajos?|tareas?|actividad(es)?|puntos?|superficies?|que hacer|operacion(es)?|descripcion|puntos y superficies|elementos?)\b|trabajo a realizar|a limpiar/],["lugar","Dónde",/^(zona|lugar|maquina|ubicacion|nave|sitio|area|linea)s?\b/],["fecha","Día",/^(dia|fecha)s?\b/],
  ["quien","Quién",/^(quien|operari[oa]s?|responsables?|asignad[oa]s?|personas?|trabajador(es)?|nombres?)\b/],["descripcion","Notas",/^(observaciones?|notas?|detalles?|comentarios?|instrucciones?)\b/],["minutos","Tiempo",/^(tiempo|horas?|minutos?|duracion)\b/],["urgente","Urgente",/^(urgente|prioridad)\b/]];
const EX={trab:null};
async function vExcel(v){
  if(!esJefe()) return vTrabFinde(v); /* el encargado no sube el Excel: revisa los trabajos */
  v.appendChild(el("p",{class:"hint",text:"Sube el Excel con los trabajos del fin de semana. Elige el día de cada uno y, si quieres, quién lo hace. Los que no tengan persona solo los verá el encargado."}));
  const inpF=el("input",{type:"file",accept:".xlsx,.xls,.csv,.ods",style:"display:none",onchange:e=>{const f=e.target.files[0];if(f)leerExcel(f,v);e.target.value="";}});
  v.appendChild(el("label",{class:"btn grande",style:"text-align:center;cursor:pointer"},["Subir el Excel del fin de semana",inpF]));
  v.appendChild(el("div",{id:"exbox"}));}
/* la zona del Excel: si la pantalla se ha vuelto a pintar (al volver del selector de archivos del móvil), se espera a que esté */
async function cajaExcel(){for(let i=0;i<40;i++){const b=$("exbox");if(b)return b;await new Promise(r=>setTimeout(r,100));}
  if(S.tab!=="excel"){S.tab="excel";await pinta();}return $("exbox");}
async function leerExcel(file,v){const box=await cajaExcel();if(!box){toast("Vuelve a la pestaña Excel y sube el archivo otra vez");return;}box.textContent="";box.appendChild(el("div",{class:"empty",text:"Leyendo «"+file.name+"»…"}));
  try{await cargaJS("https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js","XLSX");
    const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
    if(!EX.trab)EX.trab=await rpc("trabajadores_gestor",{p_tok:S.tok});
    EX.wb=wb;EX.hoja=wb.SheetNames.find(n=>XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,blankrows:false}).length>1)||wb.SheetNames[0];EX.nombre=file.name;EX.cab=null;EX.map=null;EX.sab=null;EX.sabFijo=false;EX.sabDelExcel=false;
    pintaExcel();}catch(e){const b=$("exbox")||box;b.textContent="";b.appendChild(el("div",{class:"empty",text:"No he podido leer el archivo: "+e.message}));}}
function sabadoObj(){const h=hoyISO(),d=dow(h);return d===6?h:d===0?sumaD(h,6):sumaD(h,6-d);}
function aFecha(x,sab){if(x instanceof Date&&!isNaN(x)){const d=new Date(x.getTime()-x.getTimezoneOffset()*60000);return d.toISOString().slice(0,10);}
  const t=norm(x);if(!t)return null;
  const m=t.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);if(m){let y=m[3]?+m[3]:+sab.slice(0,4);if(y<100)y+=2000;const f=y+"-"+String(+m[2]).padStart(2,"0")+"-"+String(+m[1]).padStart(2,"0");if(!isNaN(new Date(f)))return f;}
  if(/sab/.test(t))return sab;if(/dom/.test(t))return sumaD(sab,1);if(/ambos|los dos|sab.*dom|fin de semana|finde/.test(t))return"ambos";return null;}
function quienes(x){const t=norm(x);if(!t)return{ids:[],mal:[]};const ids=[],mal=[];
  t.split(/[,;\/+\n]| y /).map(z=>z.trim()).filter(Boolean).forEach(tok=>{if(/todos|equipo/.test(tok))return;
    const W=EX.trab.filter(w=>w.rol!=="admin");const nn=w=>norm(w.nombre);
    const w=W.find(w=>nn(w)===tok)||W.find(w=>nn(w).split(" ")[0]===tok)||W.find(w=>nn(w).split(" ").some(p=>p.length>3&&p===tok))||W.find(w=>nn(w).startsWith(tok))||W.find(w=>tok.length>3&&tok.includes(nn(w).split(" ")[0]));
    if(w){if(!ids.includes(w.id))ids.push(w.id);}else mal.push(tok);});return{ids,mal};}
function pintaExcel(){const box=$("exbox");if(!box)return;box.textContent="";const ws=EX.wb.Sheets[EX.hoja];
  const filas=XLSX.utils.sheet_to_json(ws,{header:1,blankrows:false,defval:""});
  if(!filas.length){box.appendChild(el("div",{class:"empty",text:"Esa hoja está vacía."}));return;}
  /* fila de cabecera: la primera (de las 15 primeras) con más textos que coinciden con los nombres de columna */
  if(EX.cab==null){let best=0,bi=0;filas.slice(0,15).forEach((r,i)=>{const n=r.filter(c=>typeof c==="string"&&c.trim().length<=40&&CAMPOS.some(([,,rx])=>rx.test(norm(c)))).length;if(n>best){best=n;bi=i;}});EX.cab=bi;
    /* «Fin de semana 17-18 OCTUBRE» → sábado 17 */
    if(!EX.sabFijo){const tx=norm(filas.slice(0,Math.max(1,EX.cab)).map(r=>r.join(" ")).join(" ")+" "+EX.nombre);const MES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
      const m=tx.match(/(\d{1,2})\s*(?:-|y|al|a)\s*(\d{1,2})\s*(?:de\s*)?([a-z]+)/);const mi=m?MES.findIndex(x=>m[3].startsWith(x.slice(0,3))):-1;
      if(mi>=0){const hoy=hoyISO();let y=+hoy.slice(0,4);let f=y+"-"+String(mi+1).padStart(2,"0")+"-"+String(+m[1]).padStart(2,"0");if(f<sumaD(hoy,-60)){y++;f=y+"-"+String(mi+1).padStart(2,"0")+"-"+String(+m[1]).padStart(2,"0");}
        if(dow(f)===6){EX.sab=f;EX.sabDelExcel=true;}}}}
  const cab=(filas[EX.cab]||[]).map(c=>String(c||"").trim());const ncol=Math.max(...filas.map(r=>r.length));
  if(!EX.map){EX.map={};const usadas=new Set();CAMPOS.forEach(([k,,rx])=>{const i=cab.findIndex((c,j)=>!usadas.has(j)&&rx.test(norm(c)));if(i>=0){EX.map[k]=i;usadas.add(i);}});
    if(EX.map.titulo==null){/* si no hay cabecera clara, la columna con más texto */let bi=0,bl=0;for(let j=0;j<ncol;j++){const l=filas.slice(EX.cab+1).reduce((a,r)=>a+String(r[j]||"").length,0);if(l>bl){bl=l;bi=j;}}EX.map.titulo=bi;}}
  EX.sab=EX.sab||sabadoObj();
  const colSel=k=>{const s=el("select",{class:"x"},[el("option",{value:"",text:"— ninguna —"})].concat(Array.from({length:ncol},(_,j)=>el("option",{value:String(j),text:(cab[j]||"Columna "+String.fromCharCode(65+j))}))));s.value=EX.map[k]==null?"":String(EX.map[k]);s.onchange=()=>{EX.map[k]=s.value===""?null:+s.value;pintaExcel();};return s;};
  /* ajustes de columnas: escondidos, solo si algo sale mal */
  const ajustes=el("details",{class:"card"},[el("summary",{class:"hd",style:"cursor:pointer"},el("h2",{style:"text-transform:none;letter-spacing:0;font-size:14px",text:"Si falta algún trabajo o sale algo raro, toca aquí"})),el("div",{class:"bd"},[
    EX.wb.SheetNames.length>1?el("label",{class:"f"},[el("span",{text:"Hoja"}),(()=>{const s=el("select",{class:"x"},EX.wb.SheetNames.map(n=>el("option",{value:n,text:n})));s.value=EX.hoja;s.onchange=()=>{EX.hoja=s.value;EX.cab=null;EX.map=null;pintaExcel();};return s;})()]):null,
    el("p",{class:"hint",style:"margin-top:0",text:"Qué columna del Excel es cada cosa."}),
    el("div",{style:"display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px"},CAMPOS.map(([k,t])=>el("label",{class:"f"},[el("span",{text:t+(k==="titulo"?" *":"")}),colSel(k)]))),
    el("label",{class:"f"},[el("span",{text:"Fila de títulos"}),(()=>{const s=el("select",{class:"x"},filas.slice(0,15).map((r,i)=>el("option",{value:String(i),text:"Fila "+(i+1)+": "+r.filter(Boolean).slice(0,3).join(" · ").slice(0,50)})));s.value=String(EX.cab);s.onchange=()=>{EX.cab=+s.value;EX.map=null;pintaExcel();};return s;})()])])]);
  /* filas */
  const M=EX.map,val=(r,k)=>M[k]==null?"":r[M[k]];const dom=sumaD(EX.sab,1);
  const items=[];filas.slice(EX.cab+1).forEach((r,ix)=>{const tit=String(val(r,"titulo")||"").trim();if(!tit||norm(tit)===norm(cab[M.titulo]))return;
    let f=M.fecha!=null?aFecha(val(r,"fecha"),EX.sab):null;if(f!==EX.sab&&f!==dom)f=EX.sab;
    const q=quienes(val(r,"quien"));const mn=parseFloat(String(val(r,"minutos")).replace(",","."));
    const minutos=isNaN(mn)?null:(mn<=12&&/hora|h$/i.test(cab[M.minutos]||"")?Math.round(mn*60):Math.round(mn));
    let lug=String(val(r,"lugar")||"").trim(),titF=tit;
    if(/^\d+$/.test(lug))lug="Nave "+lug;                              /* columna Nave con 1 o 2 */
    const cm=tit.match(/^([FM])\s*-?\s*(\d{1,3})$/i);                    /* «F-30» → «Limpieza F30» en la zona F30 */
    if(cm){const z=cm[1].toUpperCase()+cm[2];titF="Limpieza "+z;lug=z;}
    items.push({titulo:titF,lugar:lug,descripcion:String(val(r,"descripcion")||"").trim(),quien:q.ids[0]||"",mal:q.mal,minutos_est:minutos,urgente:/^(si|sí|x|1|urgente|alta)$/i.test(String(val(r,"urgente")).trim()),fecha:f,ok:true,fila:ix});});
  EX.items=items;
  const nFilas=filas.slice(EX.cab+1).filter(r=>r.some(c=>String(c).trim())).length;
  /* cabecera: fin de semana + recuento */
  box.appendChild(el("div",{class:"card"},el("div",{class:"bd",style:"display:grid;gap:8px"},[
    el("div",{class:"row",style:"align-items:center"},[el("b",{style:"flex:2",text:"Sáb "+fCorta(EX.sab).split(" ").pop()+" y dom "+fCorta(dom).split(" ").pop()+(EX.sabDelExcel?" (del Excel)":"")}),
      el("input",{type:"date",class:"x","aria-label":"Cambiar el fin de semana",value:EX.sab,onchange:e=>{if(e.target.value){EX.sabFijo=true;EX.sabDelExcel=false;EX.sab=dow(e.target.value)===6?e.target.value:sumaD(e.target.value,(6-dow(e.target.value)+7)%7);pintaExcel();}}})]),
    el("p",{class:"hint",style:"margin:0;"+(items.length<nFilas?"color:var(--warn);font-weight:700":""),text:""+EX.nombre+" · "+items.length+" trabajo"+(items.length!==1?"s":"")+(items.length<nFilas?" de "+nFilas+" filas: revisa los ajustes de abajo":"")}),
    el("p",{class:"hint",style:"margin:0",text:"Sin persona: solo lo ve el encargado, que lo reparte. Con persona: lo ven esa persona y el encargado."})])));
  const card=el("div",{class:"card"});box.appendChild(card);
  if(!items.length){card.appendChild(el("div",{class:"empty",text:"No encuentro trabajos. Toca «» de abajo y elige la columna de los trabajos."}));box.appendChild(ajustes);return;}
  const finde=EX.trab.filter(w=>w.rol!=="admin"&&(w.equipos||[]).includes("Finde")),otros=EX.trab.filter(w=>w.rol!=="admin"&&!(w.equipos||[]).includes("Finde"));
  const selQuien=it=>{const s=el("select",{class:"selq",onchange:e=>{it.quien=e.target.value;}},[el("option",{value:"",text:"Encargado"}),
      el("optgroup",{label:"Fin de semana"},finde.map(w=>el("option",{value:w.id,text:w.nombre}))),otros.length?el("optgroup",{label:"Otros"},otros.map(w=>el("option",{value:w.id,text:w.nombre}))):null]);s.value=it.quien||"";return s;};
  const segDia=it=>{const B=[[EX.sab,"Sáb"],[dom,"Dom"]].map(([f,t])=>el("button",{type:"button",class:"chip","aria-pressed":String(it.fecha===f),text:t,style:"padding:7px 14px",onclick:()=>{it.fecha=f;B.forEach(b=>b.setAttribute("aria-pressed",String(b.textContent===t)));}}));return el("div",{class:"chips",style:"flex-wrap:nowrap"},B);};
  const btn=el("button",{class:"btn ok grande",style:"margin:12px 14px;width:calc(100% - 28px)"});
  const cuenta=()=>{const n=items.filter(i=>i.ok).length;btn.textContent="Crear "+n+" trabajo"+(n!==1?"s":"");btn.disabled=!n;};
  card.appendChild(el("div",{class:"linea",style:"background:var(--surf2);flex-wrap:wrap"},[el("span",{style:"flex:1;font-size:14px;font-weight:600",text:"Poner todos en:"}),
    el("button",{class:"btn sec peq",text:"Sábado",onclick:()=>{items.forEach(i=>i.fecha=EX.sab);pintaFilas();}}),el("button",{class:"btn sec peq",text:"Domingo",onclick:()=>{items.forEach(i=>i.fecha=dom);pintaFilas();}})]));
  const lista=el("div");card.appendChild(lista);card.appendChild(btn);
  const pintaFilas=()=>{lista.textContent="";items.forEach(it=>{const fila=el("div",{class:"linea",style:"align-items:flex-start;gap:10px;"+(it.ok?"":"opacity:.5")},[
      el("input",{type:"checkbox",checked:it.ok,"aria-label":"Crear este trabajo",style:"width:24px;height:24px;margin-top:2px",onchange:e=>{it.ok=e.target.checked;fila.style.opacity=it.ok?"":".5";cuenta();}}),
      el("div",{style:"flex:1;min-width:0;display:grid;gap:6px"},[el("b",{style:"overflow-wrap:anywhere",text:it.titulo}),
        (it.lugar||it.descripcion||it.dup||it.mal.length)?el("span",{class:"meta"},[it.lugar?el("span",{text:""+it.lugar}):null,it.descripcion?el("span",{text:""+it.descripcion}):null,
          it.dup?el("span",{class:"pill warn",text:"Ya está creado"}):null,it.mal.length?el("span",{class:"pill warn",text:"No conozco a: "+it.mal.join(", ")}):null]):null,
        el("div",{style:"display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;align-items:center"},[segDia(it),selQuien(it)])])]);lista.appendChild(fila);});cuenta();};
  pintaFilas();
  rpc("ots_existentes",{p_tok:S.tok,p_desde:EX.sab,p_hasta:dom}).then(X=>{let c=false;items.forEach(it=>{it.dup=X.some(x=>(x.fecha===EX.sab||x.fecha===dom)&&x.titulo===norm(it.titulo).replace(/\s+/g," ")&&x.lugar===norm(it.lugar));if(it.dup){it.ok=false;c=true;}});if(c)pintaFilas();}).catch(()=>{});
  btn.onclick=async()=>{const sel=items.filter(i=>i.ok);if(!sel.length)return;btn.disabled=true;
    try{const r=await rpc("ots_importar",{p_tok:S.tok,p_reparto:"sin",p_items:sel.map(i=>({titulo:i.titulo,lugar:i.lugar,descripcion:i.descripcion,fecha:i.fecha,asignados:i.quien?[i.quien]:[],minutos_est:i.minutos_est,urgente:i.urgente}))});
      const sinP=sel.filter(i=>!i.quien).length;
      $("exbox").textContent="";$("exbox").appendChild(el("div",{class:"card"},el("div",{class:"bd"},[el("p",{style:"margin:0 0 6px;font-size:18px;font-weight:700;color:var(--ok)",text:""+r.creadas+" trabajos creados"+(r.repetidas?" · "+r.repetidas+" ya existían":"")}),
        el("p",{class:"hint",text:(sinP?sinP+" sin persona: los ve solo el encargado para repartirlos. ":"")+(sel.length-sinP?"A los que tienen persona les ha llegado un aviso.":"")}),el("a",{class:"btn sec",href:"limpieza.html",text:"Ver en la app"})])));}
    catch(e){toast(e.message);btn.disabled=false;}};
  box.appendChild(ajustes);}


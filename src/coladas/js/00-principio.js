
(function(){
"use strict";
const TABS=[["stock","Stock"],["consumo","Consumo"],["entrada","Entrada"],["lotes","Lotes"],["hist","Consultas"],["precios","Precios"],["plan","Plan"]];
const MAT={"L-2630":{nom:"AlSi9",al:"blanca blanco",col:"var(--blanca)"},"L-2521-B":{nom:"AlSi12",al:"azul",col:"var(--azul)"}};
const NAVES=["Nave 1","Nave 2"];
const TURNOS=["Mañana","Tarde","Noche"];
let db=null,ready=false,lotes=[],meses={},cfg={minimos:{},granalla:{inicial:0,min:0},proveedores:[],precios:{},plan:{},paros:[],calendario:{}},tab="stock";
const draft={cons:{},ent:{},granE:{},granC:{},plan:{},ent2:{},rel:{},bpSig:{}};
let consModo="relevo";
let planMes=null,parteDia="";
/* máquinas de cada nave; su estado (marcha/parada, cobre, azul) se guarda como
   cambios con fecha en la colección "maq", para saber qué había cada día */
const MAQ={"Nave 1":["F4","F10","F15","F16","F19","F20","F21","F22","F25","F26","F27","F28","F29","F30","F31","F32","F33","F34"],
  "Nave 2":["F51","F52","F53","F54","F55","F56","F61","F62","F63","F64","F65","F66","F67"]};
let maqEv={},mqFecha="",mqTurno="",maqAbierto=true;
const TI=t=>TURNOS.indexOf(t);
/* relevo según la hora: mañana 6-14, tarde 14-22, noche 22-6 */
const turnoAhora=()=>{const h=new Date().getHours();return h>=6&&h<14?"Mañana":(h>=14&&h<22?"Tarde":"Noche");};
let filtro={desde:"",hasta:"",tipo:"",nave:"",mat:"",turno:"",texto:""};
const $=id=>document.getElementById(id);
function el(t,a,k){const n=document.createElement(t);if(a)for(const p in a){if(p==="class")n.className=a[p];else if(p==="text")n.textContent=a[p];else if(p.slice(0,2)==="on")n.addEventListener(p.slice(2),a[p]);else if(a[p]!=null)n.setAttribute(p,a[p]);}if(k)(Array.isArray(k)?k:[k]).forEach(c=>c&&n.appendChild(c));return n;}
/* números escritos a la española: admite coma o punto decimal */
const numES=v=>parseFloat(String(v==null?"":v).replace(/\s/g,"").replace(",","."));
const fmt=n=>(Math.round(n||0)).toLocaleString("es-ES");
const hoy=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const mesDe=f=>(f||hoy()).slice(0,7);
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const key=(n,m)=>n+"|"+m;
const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const dmy=f=>f?f.slice(8,10)+"/"+f.slice(5,7):"—";
function toast(m){const o=$("toast");if(o)o.remove();const t=el("div",{id:"toast",text:m});document.body.appendChild(t);setTimeout(()=>t.parentNode&&t.remove(),2600);}
let CORTE=null;
function movs(){const o=[];for(const m in meses)for(const r of(meses[m]||[]))if(!CORTE||!r.f||r.f<=CORTE)o.push(r);return o;}
function conCorte(f,fn){const o=CORTE;CORTE=f;try{return fn();}finally{CORTE=o;}}
/* El parte es del último día COMPLETO con consumo: lo que se va apuntando
   hoy no entra hasta mañana. Si solo hay consumos de hoy, se usa hoy. */
function diaParte(){const h=hoy(),f=movs().filter(r=>r.t==="C"&&!r.h&&r.f).map(r=>r.f).sort();
  const a=f.filter(x=>x<h);return a.length?a[a.length-1]:(f.length?f[f.length-1]:null);}

/* ---------- fotos de albarán ---------- */
const fotoUrl=id=>window.fotoUrlWeb?window.fotoUrlWeb(id):"/_blob/"+id;
function verFoto(id){
  const ov=el("div",{class:"lightbox",onclick:e=>{if(e.target===e.currentTarget)e.currentTarget.remove();}},[
    el("img",{src:fotoUrl(id),alt:"Albarán"}),
    el("button",{class:"btn sec",type:"button",text:"Cerrar",onclick:e=>e.currentTarget.parentNode.remove()})
  ]);
  document.body.appendChild(ov);
}
/* Se reduce antes de subir: una foto de iPad son 4-5 MB y no hace falta tanto
   para leer un albarán, pero sí la suficiente para que se lea la letra. */
function comprimir(file,maxLado){
  return new Promise((res,rej)=>{
    const u=URL.createObjectURL(file),i=new Image();
    i.onload=()=>{
      try{
        const esc=Math.min(1,maxLado/Math.max(i.width,i.height));
        if(esc>=1&&file.size<3500000){URL.revokeObjectURL(u);return res(file);}
        const c=document.createElement("canvas");
        c.width=Math.round(i.width*esc);c.height=Math.round(i.height*esc);
        c.getContext("2d").drawImage(i,0,0,c.width,c.height);
        c.toBlob(b=>{URL.revokeObjectURL(u);res(b||file);},"image/jpeg",0.88);
      }catch(e){URL.revokeObjectURL(u);res(file);}
    };
    i.onerror=()=>{URL.revokeObjectURL(u);res(file);};
    i.src=u;
  });
}
async function subirFoto(file){
  const a=await claude.use("assets");
  if(!a)throw new Error("sin assets");
  const b=await comprimir(file,3000);
  const r=await a.upload(b);
  return r.id;
}

/* ---------- cálculo ---------- */
function saldos(){
  const act=movs().filter(r=>!r.h);
  const res={};
  lotes.forEach(l=>{
    const ent=act.filter(r=>r.d===l.id),sal=act.filter(r=>r.o===l.id);
    let kN=l.kgInv||0,fN=l.fardosInv||0;
    ent.forEach(r=>{if(typeof r.kg==="number")kN+=r.kg;if(typeof r.fa==="number")fN+=r.fa;});
    res[l.id]={l,ent,sal,ratio:fN>0?Math.round(kN/fN*100)/100:0};
  });
  for(const id in res){
    const s=res[id],ap=r=>typeof r.kg==="number"?r.kg:(r.t==="C"&&typeof r.fa==="number"&&r.o&&res[r.o]?Math.round(r.fa*res[r.o].ratio):0);
    let kg=s.l.kgInv||0,fa=s.l.fardosInv||0;
    s.ent.forEach(r=>{kg+=ap(r);fa+=(typeof r.fa==="number"?r.fa:0);});
    s.sal.forEach(r=>{kg-=ap(r);fa-=(typeof r.fa==="number"?r.fa:0);});
    s.kg=kg;s.fa=fa;
  }
  return res;
}
function kgAp(r,S){return typeof r.kg==="number"?r.kg:(r.t==="C"&&typeof r.fa==="number"&&r.o&&S[r.o]?Math.round(r.fa*S[r.o].ratio):0);}
/* consumo medio = fardos consumidos / nº de días distintos con consumo (tu fórmula del Excel) */
function diasConConsumo(){const d={};movs().forEach(r=>{if(r.t==="C"&&r.f)d[r.f]=1;});return Object.keys(d).length;}
function bloques(diaFijo){
  const S=saldos(),dias=diasConConsumo()||1,mesAct=mesDe(hoy());
  const ud=diaFijo||(()=>{const f=movs().filter(r=>r.t==="C"&&!r.h&&r.f).map(r=>r.f).sort();return f.length?f[f.length-1]:null;})();
  const B={};
  NAVES.forEach(n=>Object.keys(MAT).forEach(m=>{B[key(n,m)]={nave:n,mat:m,kg:0,fa:0,kgN:0,faN:0,kgE:0,faE:0,cFa:0,cUd:0,cUdFa:0,eMes:0};}));
  lotes.forEach(l=>{const s=S[l.id];if(!s)return;const b=B[key(l.nave,l.material)];if(!b)return;
    b.kg+=s.kg;b.fa+=s.fa;if(l.donde==="externo"){b.kgE+=s.kg;b.faE+=s.fa;}else{b.kgN+=s.kg;b.faN+=s.fa;}});
  movs().forEach(r=>{
    const l=lotes.find(x=>x.id===(r.o||r.d));
    const nv=l?l.nave:r.nv, ml=l?l.material:r.ml;
    if(!nv||!ml)return;const b=B[key(nv,ml)];if(!b)return;
    if(r.t==="C"){b.cFa+=(typeof r.fa==="number"?r.fa:0);if(r.f===ud){b.cUd+=Math.abs(kgAp(r,S));b.cUdFa+=(typeof r.fa==="number"?r.fa:0);}}
    if(r.t==="E"&&!r.h&&r.f&&r.f.slice(0,7)===mesAct)b.eMes+=kgAp(r,S);
  });
  for(const k in B){const b=B[k];b.medio=Math.round(b.cFa/dias*100)/100;b.dias=b.medio>0?Math.round(b.faN/b.medio):null;}
  return {S,B,ud,dias};
}
function granallaKg(){let k=(cfg.granalla&&cfg.granalla.inicial)||0;movs().forEach(r=>{if(r.t==="G"&&typeof r.kg==="number")k+=r.kg;});return k;}
function estado(b,mn){
  if(b.kg<0||b.fa<0)return["bad","Negativo"];
  const m=(mn&&mn.fardosNave)||0;
  if(m<=0)return["na","Sin mínimo"];
  if(b.faN<m)return["bad","Bajo mínimo"];
  if(b.faN<m*1.35)return["warn","Cerca del mínimo"];
  return["ok","OK"];
}
/* FIFO: la colada más antigua en nave de esa nave+aleación */
function fifoLista(nave,mat,S){
  return lotes.filter(l=>l.nave===nave&&l.material===mat&&l.donde==="nave"&&S[l.id]&&S[l.id].fa>0)
              .sort((a,b)=>(a.entrada||"").localeCompare(b.entrada||"")||a.nombre.localeCompare(b.nombre,"es"));
}

/* ---------- escritura ---------- */
/* Apuntes dentro del documento de cada mes. En la web se hace en la base de
   datos en una sola operación (dos personas a la vez no se pisan). */
async function itemsAdd(col,id,items){if(db.itemsAdd)return db.itemsAdd(col,id,items);
  const ref=db.doc(col+"/"+id),sn=await ref.get();const it=sn.exists?((sn.data().items)||[]).slice():[];await ref.set({items:it.concat(items)});}
async function itemsPut(col,id,item){if(db.itemsPut)return db.itemsPut(col,id,item);
  const ref=db.doc(col+"/"+id),sn=await ref.get();await ref.set({items:((sn.exists&&sn.data().items)||[]).map(r=>r.i===item.i?item:r)});}
async function itemsDel(col,id,i){if(db.itemsDel)return db.itemsDel(col,id,i);
  const ref=db.doc(col+"/"+id),sn=await ref.get();if(!sn.exists)return;await ref.set({items:((sn.data().items)||[]).filter(r=>r.i!==i)});}
async function addMov(rec){await itemsAdd("mov",mesDe(rec.f),[rec]);}
/* varios apuntes de golpe: una sola escritura por mes */
async function addMovs(recs){const g={};recs.forEach(r=>{const m=mesDe(r.f);(g[m]=g[m]||[]).push(r);});
  for(const m in g)await itemsAdd("mov",m,g[m]);}
/* guardar un apunte editado (mismo id). Si cambia de mes, primero se escribe
   en el mes nuevo y luego se quita del viejo, para no perderlo nunca. */
async function guardarMov(orig,nuevo){
  const mO=mesDe(orig.f),mN=mesDe(nuevo.f);
  if(mO===mN)await itemsPut("mov",mO,nuevo);
  else{await addMov(nuevo);await delMov(orig.i,orig.f);}
}
async function delMov(id,f){await itemsDel("mov",mesDe(f),id);}
/* Borrar un apunte de consumo o entrada con aviso claro. Si es la entrada que
   creó la colada y no tiene nada más, también se quita la colada vacía. */
/* Ventanas propias: la página publicada bloquea confirm() y prompt() del
   navegador (devuelven "cancelar" sin mostrarse), por eso no se podía borrar. */
function dialogo(o){return new Promise(res=>{
  const prev=document.activeElement;
  const inp=o.input?el("input",{type:"text",inputmode:o.teclado||"numeric",value:o.valor||"",class:"num",autocomplete:"off"}):null;
  let hecho=false;const fin=v=>{if(hecho)return;hecho=true;ov.remove();document.removeEventListener("keydown",tec);try{prev&&prev.focus&&prev.focus();}catch(e){}res(v);};
  const bOk=el("button",{type:"button",class:"btn"+(o.peligro?" peligro":""),text:o.ok||"Aceptar",onclick:()=>fin(inp?inp.value:true)});
  const bNo=el("button",{type:"button",class:"btn sec",text:o.cancel||"Cancelar",onclick:()=>fin(null)});
  const bEx=o.extra?el("button",{type:"button",class:"btn sec",text:o.extra.text,onclick:()=>fin(o.extra.valor)}):null;
  const box=el("div",{class:"dlg",role:"dialog","aria-modal":"true"},[
    o.titulo?el("h3",{text:o.titulo}):null,
    ...String(o.texto||"").split("\n\n").map(t=>el("p",{},t.split("\n").flatMap((l,k)=>k?[el("br",{}),document.createTextNode(l)]:[document.createTextNode(l)]))),
    inp?el("label",{},[inp]):null,
    el("div",{class:"dlg-b"},[bNo,bEx,bOk])]);
  const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)fin(null);}},[box]);
  const tec=e=>{if(e.key==="Escape")fin(null);else if(e.key==="Enter"&&inp&&document.activeElement===inp)fin(inp.value);};
  document.addEventListener("keydown",tec);document.body.appendChild(ov);
  setTimeout(()=>{if(inp){inp.focus();inp.select();}else bOk.focus();},30);
});}
const confirmar=(texto,o)=>dialogo(Object.assign({texto},o||{})).then(v=>v===true);
const preguntar=(texto,valor,o)=>dialogo(Object.assign({texto,input:true,valor},o||{}));


(function(){
const URL_SB="https://uddejncrjcyyaxjocbpj.supabase.co",KEY="sb_publishable_UqnQLvLkCI0kk_y1KDt94Q_ccYmLw2i";
const ERR={SESION:"Tu sesión ha caducado. Vuelve a entrar en la app.",NO_ADMIN:"Esto solo lo puede hacer el jefe",NO_PERMISO:"No tienes permiso",NO_EXISTE:"Ese calendario ya no existe (puede que te hayan mandado uno nuevo)",YA_FIRMADO:"Ya estaba firmado",FIRMA_MAL:"La firma no vale, repítela",FALTA_COMENTARIO:"Escribe qué no te parece bien",FECHAS_MAL:"Las fechas están al revés",DEMASIADAS:"Demasiados días a la vez"};
const $=id=>document.getElementById(id);
function el(t,a,k){const e=document.createElement(t);if(a)for(const x in a){const v=a[x];if(v==null||v===false)continue;if(x==="text")e.textContent=v;else if(x.startsWith("on"))e[x]=v;else e.setAttribute(x,v===true?"":v);}
  (Array.isArray(k)?k:k!=null?[k]:[]).flat(9).forEach(c=>{if(c==null||c===false)return;e.appendChild(typeof c==="string"?document.createTextNode(c):c);});return e;}
const ls={get:k=>{try{return localStorage.getItem(k);}catch(e){return null;}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch(e){}}};
function toast(t){const d=el("div",{class:"toast",text:t});document.body.appendChild(d);setTimeout(()=>d.remove(),2800);}
async function rpc(fn,args){const r=await fetch(URL_SB+"/rest/v1/rpc/"+fn,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:JSON.stringify(args||{})});
  const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null;}catch(e){}
  if(!r.ok){const m=(j&&j.message)||txt||("Error "+r.status);const k=Object.keys(ERR).find(x=>m.includes(x));if(!k&&r.status!==401&&window.reportarError)reportarError(new Error("rpc "+fn+": "+String(m).slice(0,300)),"args: "+Object.keys(args||{}).join(","));throw new Error(k?ERR[k]:m);}return j;}
function dlg(titulo,cuerpo,botones){const ov=el("div",{class:"ov"});const cerrar=()=>ov.remove();
  const bs=(botones||[{t:"Cerrar",cls:"sec"}]).map(b=>el("button",{class:"btn "+(b.cls||""),text:b.t,onclick:async e=>{if(!b.fn){cerrar();return;}e.target.disabled=true;try{const r=await b.fn();if(r!==false)cerrar();}catch(er){toast(er.message);}e.target.disabled=false;}}));
  ov.appendChild(el("div",{class:"dlg",role:"dialog","aria-modal":"true"},[el("h3",{text:titulo}),cuerpo,el("div",{class:"row",style:"margin-top:12px"},bs)]));
  ov.onclick=e=>{if(e.target===ov)cerrar();};document.body.appendChild(ov);return cerrar;}
const fld=(l,c)=>el("label",{class:"f"},[el("span",{text:l}),c]);
function inp(v,on,a){const i=el("input",Object.assign({value:v==null?"":v},a||{}));i.oninput=()=>on(i.value);return i;}
function cargaJS(src,glob){return window[glob]?Promise.resolve():new Promise((ok,ko)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=()=>ko(new Error("No se pudo cargar. Revisa internet."));document.head.appendChild(s);});}

/* ---------- fechas (todo en UTC para que no baile la hora) ---------- */
const iso=(y,m,d)=>new Date(Date.UTC(y,m,d)).toISOString().slice(0,10);
const dowI=f=>new Date(f+"T00:00:00Z").getUTCDay(); /* 0=domingo */
const sumaD=(f,n)=>{const d=new Date(f+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const rango=(a,b)=>{const o=[];if(b<a)[a,b]=[b,a];for(let f=a;f<=b;f=sumaD(f,1))o.push(f);return o;};
const MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const fTxt=f=>{const d=new Date(f+"T00:00:00Z");return d.getUTCDate()+" "+MESES[d.getUTCMonth()].slice(0,3);};
const fLarga=f=>new Date(f+"T00:00:00Z").toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"});
const cuando=ts=>new Date(ts).toLocaleString("es-ES",{day:"numeric",month:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"});
const hoyISO=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10);};
const nom1=n=>(n||"").split(" ")[0];
/* días que trabaja cada equipo */
const trabajaEq=(eq,f)=>{const d=dowI(f);return eq==="Finde"?(d===0||d===6):(d>=1&&d<=5);};
const TIPOS={festivo:["Festivo","#FAD4D1","#A3201A"],cierre:["Cierre de fábrica","#CFD8DC","#37474F"],intensiva:["Jornada intensiva","#FDE9B6","#8A5A00"],especial:["Horario especial","#D6E7FA","#1F4E79"]};
const VAC=["Vacaciones","#CDEFD9","#17663A"];
/* Domingo de Pascua (algoritmo de Gauss/Meeus) */
function pascua(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mes=Math.floor((h+l-7*m+114)/31),dia=((h+l-7*m+114)%31)+1;return iso(y,mes-1,dia);}
const nacionales=y=>[[iso(y,0,1),"Año Nuevo"],[iso(y,0,6),"Epifanía del Señor (Reyes)"],[sumaD(pascua(y),-2),"Viernes Santo"],[iso(y,4,1),"Fiesta del Trabajo"],[iso(y,7,15),"Asunción de la Virgen"],[iso(y,9,12),"Fiesta Nacional de España"],[iso(y,10,1),"Todos los Santos"],[iso(y,11,6),"Día de la Constitución"],[iso(y,11,8),"Inmaculada Concepción"],[iso(y,11,25),"Navidad"]];
const DIAS_H=[["lunes","L"],["martes","M"],["miercoles","X"],["jueves","J"],["viernes","V"],["sabado","S"],["domingo","D"]];
function horarioTxt(h){if(!h)return"";const g=[];DIAS_H.forEach(([k,l])=>{const t=(h[k]||[]).map(r=>r.join("-")).join(" y ");if(!t)return;const u=g[g.length-1];if(u&&u.t===t)u.d.push(l);else g.push({t,d:[l]});});
  return g.map(x=>(x.d.length>2?x.d[0]+"-"+x.d[x.d.length-1]:x.d.join(", "))+": "+x.t).join(" · ");}
function enVac(vac,f){return (vac||[]).find(v=>f>=v.desde&&f<=v.hasta);}

/* ---------- hoja anual (pantalla) ---------- */
function hoja(anio,eq,mapa,vac,op){op=op||{};const h=hoyISO();
  const box=el("div",{class:"meses"});
  for(let m=0;m<12;m++){const g=el("div",{class:"g"});"LMXJVSD".split("").forEach(x=>g.appendChild(el("div",{class:"ds",text:x})));
    const prim=iso(anio,m,1);const off=(dowI(prim)+6)%7;for(let i=0;i<off;i++)g.appendChild(el("span"));
    const nd=new Date(Date.UTC(anio,m+1,0)).getUTCDate();
    for(let d=1;d<=nd;d++){const f=iso(anio,m,d);const x=mapa[f],v=enVac(vac,f);
      const cls=["d"];if(!trabajaEq(eq,f))cls.push("nolab");if(x)cls.push(x.tipo);if(v&&!x)cls.push("vac");if(f===h)cls.push("hoy");if(op.sel&&op.sel(f))cls.push("sel");if(op.tap)cls.push("tap");
      const tit=[x?TIPOS[x.tipo][0]+(x.nombre?": "+x.nombre:"")+(x.horario?" ("+x.horario+")":""):null,v?"Vacaciones":null].filter(Boolean).join(" · ");
      g.appendChild(el(op.tap?"button":"span",{class:cls.join(" "),title:tit||null,"aria-label":fLarga(f)+(tit?": "+tit:""),text:String(d),onclick:op.tap?()=>op.tap(f):null}));}
    box.appendChild(el("div",{class:"mes"},[el("h4",{text:MESES[m]}),g]));}
  return box;}
function leyenda(conVac){return el("div",{class:"ley"},Object.values(TIPOS).concat(conVac?[VAC]:[]).map(([t,bg])=>el("span",null,[el("i",{style:"background:"+bg}),t])).concat([el("span",null,[el("i",{style:"background:#fff;border:1px solid #D6DEE6"}),"Libra (no trabaja el equipo)"])]));}
function resumen(anio,eq,mapa,vac){let lab=0,fes=0,cie=0,int=0,vacN=0;
  rango(iso(anio,0,1),iso(anio,11,31)).forEach(f=>{const x=mapa[f];if(!trabajaEq(eq,f))return;
    if(x&&x.tipo==="festivo")fes++;else if(x&&x.tipo==="cierre")cie++;else if(enVac(vac,f))vacN++;else{lab++;if(x&&x.tipo==="intensiva")int++;}});
  return {lab,fes,cie,int,vac:vacN};}
function listaDias(dias){/* agrupa días seguidos con la misma marca */
  const out=[];dias.forEach(d=>{const u=out[out.length-1];if(u&&u.tipo===d.tipo&&(u.nombre||"")===(d.nombre||"")&&(u.horario||"")===(d.horario||"")&&rango(u.hasta,d.fecha).length<=4&&d.tipo!=="festivo"){u.hasta=d.fecha;}else out.push({tipo:d.tipo,nombre:d.nombre,horario:d.horario,desde:d.fecha,hasta:d.fecha});});return out;}
const tramoTxt=x=>x.desde===x.hasta?fTxt(x.desde):fTxt(x.desde)+" – "+fTxt(x.hasta);

/* ---------- PDF (A4 apaisado, 1 página por trabajador) ---------- */
async function pdfDe(lista){await cargaJS("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js","jspdf");
  const {jsPDF}=window.jspdf;const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
  const hex=c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
  lista.forEach((F,pi)=>{if(pi)doc.addPage();const D=F.datos,anio=D.anio,eq=D.equipo;const mapa={};(D.dias||[]).forEach(d=>mapa[d.fecha]=d);const vac=D.vac||[];
    doc.setFont("helvetica","bold");doc.setFontSize(15);doc.setTextColor(31,78,121);doc.text("Calendario laboral "+anio,12,13);
    doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(60,70,80);
    doc.text([D.empresa,D.centro].filter(Boolean).join(" · ")+" · Equipo "+(eq==="Finde"?"fin de semana":"de semana"),12,18.5);
    doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(22,33,44);doc.text(D.nombre||"",285,13,{align:"right"});
    doc.setFont("helvetica","normal");doc.setFontSize(8);const ht=horarioTxt(D.horario);if(ht)doc.text("Horario habitual: "+ht,285,18.5,{align:"right",maxWidth:150});
    /* 12 meses en 4 columnas x 3 filas */
    const X0=12,Y0=23,W=68.25,H=43,cw=W/7.4,ch=5.0;
    for(let m=0;m<12;m++){const cx=X0+(m%4)*(W+0.7),cy=Y0+Math.floor(m/4)*(H+1.5);
      doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(31,78,121);doc.text(MESES[m].charAt(0).toUpperCase()+MESES[m].slice(1),cx+1,cy+4);
      doc.setFontSize(6.5);doc.setTextColor(122,136,150);"LMXJVSD".split("").forEach((l,i)=>doc.text(l,cx+1+i*cw+cw/2,cy+8.2,{align:"center"}));
      const prim=iso(anio,m,1),off=(dowI(prim)+6)%7,nd=new Date(Date.UTC(anio,m+1,0)).getUTCDate();
      for(let d=1;d<=nd;d++){const p=off+d-1,col=p%7,fil=Math.floor(p/7),f=iso(anio,m,d),x=mapa[f],v=enVac(vac,f);
        const bx=cx+1+col*cw,by=cy+9.5+fil*ch;const t=x?TIPOS[x.tipo]:(v?VAC:null);
        if(t){doc.setFillColor(...hex(t[1]));doc.roundedRect(bx+0.3,by+0.25,cw-0.6,ch-0.5,0.8,0.8,"F");}
        doc.setFont("helvetica",t?"bold":"normal");doc.setFontSize(7);
        if(t)doc.setTextColor(...hex(t[2]));else if(!trabajaEq(eq,f))doc.setTextColor(170,178,187);else doc.setTextColor(22,33,44);
        doc.text(String(d),bx+cw/2,by+ch/2+1.1,{align:"center"});}}
    /* leyenda */
    let ly=Y0+3*(H+1.5)+2;doc.setFontSize(7.5);let lx=12;
    Object.values(TIPOS).concat([VAC]).forEach(([t,bg])=>{doc.setFillColor(...hex(bg));doc.roundedRect(lx,ly-2.6,3.4,3.4,0.6,0.6,"F");doc.setTextColor(40,50,60);doc.setFont("helvetica","normal");doc.text(t,lx+4.6,ly);lx+=doc.getTextWidth(t)+10;});
    doc.setTextColor(150,158,167);doc.text("Gris: el equipo no trabaja ese día",lx,ly);
    /* lista de días marcados y vacaciones */
    ly+=5;const items=listaDias(D.dias||[]).map(x=>tramoTxt(x)+" · "+TIPOS[x.tipo][0]+(x.nombre?": "+x.nombre:"")+(x.horario?" ("+x.horario+")":""));
    vac.forEach(x=>items.push(tramoTxt(x)+" · Vacaciones"+(x.nota?": "+x.nota:"")));
    doc.setFontSize(6.8);doc.setTextColor(40,50,60);const colW=60;let col=0,yy=ly;
    items.forEach(t=>{const ln=doc.splitTextToSize(t,colW-3);if(yy+ln.length*2.9>206&&col<2){col++;yy=ly;}doc.text(ln,12+col*colW,yy);yy+=ln.length*2.9+0.8;});
    /* firma */
    const sx=196,sy=ly-2;doc.setDrawColor(200,208,216);doc.roundedRect(sx,sy,89,207-sy,2,2,"S");
    doc.setFontSize(8);doc.setFont("helvetica","bold");doc.setTextColor(22,33,44);
    if(F.firmado_en){doc.text(F.conforme?"Recibido y conforme":"Recibido, con observaciones",sx+3,sy+5);
      doc.setFont("helvetica","normal");doc.setFontSize(7);doc.text("Firmado el "+cuando(F.firmado_en),sx+3,sy+9);
      if(!F.conforme&&F.comentario)doc.text("Observaciones: "+F.comentario,sx+3,sy+13,{maxWidth:83});
      if(F.firma){try{const ip=doc.getImageProperties(F.firma);const hh=Math.min(16,207-sy-(F.comentario?24:16)),ww=Math.min(60,ip.width*hh/ip.height);doc.addImage(F.firma,"PNG",sx+86-ww,207-hh-4,ww,hh);}catch(e){}}
      doc.text(D.nombre||"",sx+3,205);}
    else{doc.text("Recibido y conforme:",sx+3,sy+5);doc.setFont("helvetica","normal");doc.setFontSize(7);doc.text("Pendiente de firma",sx+3,sy+9);}});
  return doc;}
function guardaPDF(doc,nombre){const a=el("a",{href:URL.createObjectURL(doc.output("blob")),download:nombre});document.body.appendChild(a);a.click();a.remove();}
const limpio=t=>String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40);

/* ---------- firma ---------- */
function sigPad(box){const cv=box.querySelector("canvas"),ph=box.querySelector(".ph");const ctx=cv.getContext("2d");let dib=false,last=null,n=0;
  function size(){const r=cv.getBoundingClientRect(),dpr=Math.max(1,window.devicePixelRatio||1);cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#0d1b4a";ctx.lineWidth=2.4;n=0;ph.style.display="";}
  setTimeout(size,0);
  const pos=e=>{const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
  cv.addEventListener("pointerdown",e=>{e.preventDefault();cv.setPointerCapture(e.pointerId);dib=true;last=pos(e);ctx.beginPath();ctx.arc(last.x,last.y,1.1,0,7);ctx.fillStyle="#0d1b4a";ctx.fill();n++;ph.style.display="none";});
  cv.addEventListener("pointermove",e=>{if(!dib)return;e.preventDefault();const p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;n++;});
  ["pointerup","pointercancel","pointerleave"].forEach(t=>cv.addEventListener(t,()=>dib=false));
  return{vacio:()=>n<6,limpiar:()=>{ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.restore();n=0;ph.style.display="";},
    png:()=>{const w=cv.width,h=cv.height,data=ctx.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=0,y1=0;
      for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){if(data[(y*w+x)*4+3]>10){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}
      if(x1<=x0||y1<=y0){x0=0;y0=0;x1=w;y1=h;}const p=10;x0=Math.max(0,x0-p);y0=Math.max(0,y0-p);x1=Math.min(w,x1+p);y1=Math.min(h,y1+p);
      const cw=x1-x0,ch=y1-y0,k=Math.min(1,160/ch,520/cw);const o=document.createElement("canvas");o.width=Math.max(1,Math.round(cw*k));o.height=Math.max(1,Math.round(ch*k));
      o.getContext("2d").drawImage(cv,x0,y0,cw,ch,0,0,o.width,o.height);return o.toDataURL("image/png");}};}

/* ================================================================== */
const S={tok:ls.get("limp.tok"),yo:JSON.parse(ls.get("limp.yo")||"null")};
const Q=new URLSearchParams(location.search);
const v=$("v");
const esJefe=()=>S.yo&&S.yo.rol==="admin";
const A={anio:null,eq:"Semana",R:null,mapa:{},modo:false,ini:null};

(async function inicio(){
  if(!S.tok||!S.yo){v.appendChild(el("div",{class:"card"},el("div",{class:"bd"},[el("p",{text:"Primero entra en la app de limpieza con tu nombre y tu PIN."}),el("a",{class:"btn",href:"limpieza.html",text:"Ir a la app"})])));return;}
  $("who").textContent=nom1(S.yo.nombre);
  if(Q.get("f"))return verFirma(Q.get("f"));
  if(esJefe()){const y=new Date().getFullYear(),m=new Date().getMonth();
    A.anio=+Q.get("a")||+ls.get("cal.anio")||(m>=9?y+1:y);A.eq=Q.get("e")||ls.get("cal.eq")||"Semana";
    if(Q.toString())history.replaceState(null,"",location.pathname);return vJefe();}
  return vMios();})();

/* ---------------- TRABAJADOR ---------------- */
async function vMios(){v.textContent="";let L;try{L=await rpc("cal_mios",{p_tok:S.tok});}catch(e){v.appendChild(el("div",{class:"empty",text:e.message}));return;}
  if(!L.length){v.appendChild(el("div",{class:"card"},el("div",{class:"empty",text:"Todavía no te han mandado ningún calendario."})));return;}
  if(L.length===1||(L[0]&&!L[0].firmado_en))return verFirma(L[0].id,L.length>1);
  v.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Mis calendarios"})),L.map(x=>el("button",{class:"linea",onclick:()=>verFirma(x.id,true)},[el("b",{style:"flex:1",text:"Calendario "+x.anio}),el("span",{class:"pill "+(x.firmado_en?"ok":"warn"),text:x.firmado_en?"Firmado":"Por firmar"})]))]));}
async function verFirma(id,volver){v.textContent="";v.appendChild(el("div",{class:"empty",text:"Cargando…"}));
  let F;try{F=await rpc("cal_ver",{p_tok:S.tok,p_id:id});}catch(e){v.textContent="";v.appendChild(el("div",{class:"card"},el("div",{class:"bd"},[el("p",{text:e.message}),el("button",{class:"btn sec",text:"Ver mis calendarios",onclick:vMios})])));return;}
  v.textContent="";const D=F.datos,mapa={};(D.dias||[]).forEach(d=>mapa[d.fecha]=d);const vac=D.vac||[];
  if(volver)v.appendChild(el("button",{class:"btn sec peq",style:"margin:0 0 10px",text:"← Mis calendarios",onclick:vMios}));
  v.appendChild(el("h2",{style:"margin:0 0 4px",text:"Calendario laboral "+D.anio}));
  v.appendChild(el("p",{class:"hint",style:"margin:0 0 10px",text:D.nombre+" · Equipo "+(D.equipo==="Finde"?"fin de semana":"de semana")+(horarioTxt(D.horario)?" · Tu horario: "+horarioTxt(D.horario):"")}));
  const R=resumen(D.anio,D.equipo,mapa,vac);
  v.appendChild(el("div",{class:"res"},[["Días de trabajo",R.lab],["Festivos",R.fes],["Cierre fábrica",R.cie],["Vacaciones",R.vac]].map(([a,b])=>el("div",null,[el("b",{text:String(b)}),el("small",{text:a})]))));
  v.appendChild(el("div",{class:"hoja"},[hoja(D.anio,D.equipo,mapa,vac),leyenda(true)]));
  const it=listaDias(D.dias||[]);
  v.appendChild(el("div",{class:"card",style:"margin-top:12px"},[el("div",{class:"hd"},el("h2",{text:"Días señalados"})),
    it.length||vac.length?[it.map(x=>el("div",{class:"linea"},[el("i",{style:"width:14px;height:14px;border-radius:4px;background:"+TIPOS[x.tipo][1]}),el("span",{style:"flex:1",text:tramoTxt(x)+" · "+TIPOS[x.tipo][0]+(x.nombre?": "+x.nombre:"")+(x.horario?" ("+x.horario+")":"")})])),
      vac.map(x=>el("div",{class:"linea"},[el("i",{style:"width:14px;height:14px;border-radius:4px;background:"+VAC[1]}),el("b",{style:"flex:1",text:tramoTxt(x)+" · Tus vacaciones"+(x.nota?": "+x.nota:"")})]))]:el("div",{class:"empty",text:"No hay días señalados."})]));
  if(F.firmado_en){
    v.appendChild(el("div",{class:"card"},el("div",{class:"bd"},[el("p",{style:"margin:0 0 6px;font-weight:700;color:var(--ok)",text:"Firmado el "+cuando(F.firmado_en)+(F.conforme?" · Recibido y conforme":" · Con observaciones")}),
      F.comentario?el("p",{style:"margin:0 0 8px",text:"Observaciones: "+F.comentario}):null,
      el("button",{class:"btn sec",text:"Descargar PDF",onclick:async()=>{try{guardaPDF(await pdfDe([F]),"Calendario-"+D.anio+"-"+limpio(D.nombre)+".pdf");}catch(e){toast(e.message);}}})])));return;}
  if(!F.mio)return;
  /* firmar */
  let conforme=true,coment="";
  const sb=el("div",{class:"sigbox"},[el("canvas"),el("div",{class:"ph",text:"Firma aquí con el dedo"})]);
  const obs=el("div",{hidden:true},fld("¿Qué no te parece bien?",inp("",x=>coment=x,{placeholder:"Escríbelo aquí"})));
  const bC=el("button",{type:"button",class:"chip","aria-pressed":"true",text:"Recibido y conforme",onclick:()=>{conforme=true;bC.setAttribute("aria-pressed","true");bO.setAttribute("aria-pressed","false");obs.hidden=true;}});
  const bO=el("button",{type:"button",class:"chip","aria-pressed":"false",text:"Recibido, con observaciones",onclick:()=>{conforme=false;bO.setAttribute("aria-pressed","true");bC.setAttribute("aria-pressed","false");obs.hidden=false;}});
  v.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Firmar"})),el("div",{class:"bd"},[
    el("p",{class:"hint",style:"margin-top:0",text:"Revisa el calendario. Si estás de acuerdo, firma «Recibido y conforme». Si algo no está bien, elige «con observaciones» y explícalo."}),
    el("div",{class:"chips",style:"margin:0 0 10px"},[bC,bO]),obs,sb,
    el("div",{class:"row",style:"margin-top:10px"},[el("button",{class:"btn sec",text:"Borrar firma",onclick:()=>pad.limpiar()}),
      el("button",{class:"btn ok",text:"Firmar y enviar",onclick:async e=>{if(pad.vacio()){toast("Firma en el recuadro");return;}if(!conforme&&!coment.trim()){toast("Escribe qué no te parece bien");return;}
        e.target.disabled=true;try{await rpc("cal_firmar",{p_tok:S.tok,p_id:F.id,p_conforme:conforme,p_comentario:coment,p_firma:pad.png()});toast("Firmado Gracias");verFirma(F.id,volver);}catch(er){toast(er.message);e.target.disabled=false;}}})])])]));
  const pad=sigPad(sb);}


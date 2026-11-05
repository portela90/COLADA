/* ---------- Stock de un día ----------
   Se elige un día (o se toca una barra de la gráfica) y sale cómo quedó cada nave y aleación al final de ese día:
   cada colada con sus fardos y kilos, en nave o en el externo, lo que entró y lo que se consumió ese día por relevo.
   Todo se calcula con los apuntes hasta ese día (conCorte), así que sirve para cualquier fecha pasada. */
let sdF="";/* día que se está mirando (vacío = hoy) */
const NDIAL=["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
const fdt=f=>new Date(+f.slice(0,4),+f.slice(5,7)-1,+f.slice(8,10));
function irDia(f){sdF=f>hoy()?hoy():f;render();}
function diaLab(f,paso){let x=f;for(let k=0;k<12;k++){x=paso>0?diaSig(x):diaAntes(x);if(relevosDia(x)>0||x>=hoy())break;}return x;}
function vStockDia(){const h=hoy(),f=sdF||h,S=conCorte(f,saldos),ms=todosMovs();
  const lineaDe=id=>{const l=lotes.find(x=>x.id===id);return l?key(l.nave,l.material):null;};
  /* cabecera: elegir el día */
  const sel=el("div",{class:"sd-sel"},[
    el("button",{type:"button",class:"btn sec peq","aria-label":"Día anterior",text:"‹",onclick:()=>irDia(diaLab(f,-1))}),
    el("input",{id:"sd-f",type:"date",max:h,value:f,onchange:e=>{if(e.target.value)irDia(e.target.value);}}),
    el("button",{type:"button",class:"btn sec peq","aria-label":"Día siguiente",text:"›",disabled:f>=h?"disabled":null,onclick:()=>irDia(diaLab(f,1))}),
    el("div",{class:"chips sd-atajos"},[["Hoy",h],["Ayer",diaLab(h,-1)],["Hace una semana",fMas(h,-7)],["Fin del mes pasado",diaAntes(h.slice(0,8)+"01")]].map(([t,v])=>
      el("button",{type:"button",class:"chip","aria-pressed":String(f===v),text:t,onclick:()=>irDia(v)})))]);
  const tit=el("p",{class:"sd-tit"},[el("b",{text:NDIAL[fdt(f).getDay()]+" "+f.split("-").reverse().join("/")}),document.createTextNode(f===h?" · ahora":" · al acabar el día")]);
  /* gráfica: fardos en fábrica los 30 días hasta ese día; tocar una barra va a ese día */
  const dias=[];for(let x=f,k=0;k<30;k++,x=diaAntes(x))dias.unshift(x);
  const Sd={};dias.forEach(d=>{Sd[d]=conCorte(d,saldos);});
  const lin=LINEAS.map(([n,m])=>key(n,m)).filter(k=>lotes.some(l=>key(l.nave,l.material)===k&&((S[l.id]||{}).fa>0||dias.some(d=>(Sd[d][l.id]||{}).fa>0))));
  const faNave=(SS,k,d)=>lotes.filter(l=>key(l.nave,l.material)===k&&dondeEn(l,d)!=="externo").reduce((a,l)=>a+Math.max(0,(SS[l.id]||{}).fa||0),0);
  const cards=lin.map(k=>{const [n,m]=k.split("|"),col=MAT[m].col;
    const L=lotes.filter(l=>key(l.nave,l.material)===k&&(S[l.id]||{}).fa>0).sort((a,b)=>(a.entrada||"").localeCompare(b.entrada||"")||a.nombre.localeCompare(b.nombre,"es"));
    const nave=L.filter(l=>dondeEn(l,f)!=="externo"),ext=L.filter(l=>dondeEn(l,f)==="externo");
    const sF=a=>a.reduce((s,l)=>s+S[l.id].fa,0),sK=a=>a.reduce((s,l)=>s+S[l.id].kg,0);
    const cons=ms.filter(r=>r.t==="C"&&!r.h&&r.f===f&&lineaDe(r.o)===k),cF=cons.reduce((a,r)=>a+(r.fa||0),0),cK=cons.reduce((a,r)=>a+Math.abs(kgAp(r,S)),0);
    const porT=TURNOS.map(u=>[u,cons.filter(r=>r.u===u).reduce((a,r)=>a+(r.fa||0),0)]).filter(x=>x[1]);
    const ents=ms.filter(r=>r.t==="E"&&!r.h&&r.f===f&&lineaDe(r.d)===k);
    const consL={};cons.forEach(r=>{consL[r.o]=(consL[r.o]||0)+(r.fa||0);});
    /* barra con las coladas: el ancho es lo que tiene cada una; rayado = externo */
    const tot=sF(L)||1;
    const barra=el("div",{class:"sd-bar",role:"img","aria-label":"Reparto por coladas: "+L.map(l=>l.nombre+" "+S[l.id].fa+" f").join(", ")},nave.concat(ext).map((l,i)=>{const pc=S[l.id].fa/tot*100,ex=dondeEn(l,f)==="externo";
      return el("div",{class:"sd-seg"+(ex?" ext":"")+(i%2?" alt":""),style:"width:"+pc+"%;--c:"+col,title:l.nombre+": "+fmt(S[l.id].fa)+" f · "+fmt(S[l.id].kg)+" kg"+(ex?" (externo)":"")},pc>9?[el("span",{text:l.nombre.length>12?l.nombre.slice(0,11)+"…":l.nombre})]:[]);}));
    /* gráfica de 30 días */
    const vals=dias.map(d=>faNave(Sd[d],k,d)),mx=Math.max(1,...vals);
    const graf=el("div",{class:"sd-graf","aria-label":"Fardos en nave los últimos 30 días"},dias.map((d,i)=>el("button",{type:"button",class:"sd-gb"+(d===f?" on":"")+(relevosDia(d)===0?" libre":""),style:"--h:"+Math.max(3,vals[i]/mx*100)+"%;--c:"+col,title:dmy(d)+": "+fmt(vals[i])+" f en nave",onclick:()=>irDia(d)})));
    const fila=(l,ex)=>el("tr",{},[el("td",{},[el("button",{type:"button",class:"sd-lnk",text:l.nombre,onclick:()=>abrirFicha(l.id)})]),
      el("td",{class:"sub",text:ex?"Externo":"Nave"}),el("td",{class:"r num",text:fmt(S[l.id].fa)}),el("td",{class:"r num",text:fmt(S[l.id].kg)}),
      el("td",{class:"r num",text:consL[l.id]?"−"+consL[l.id]:""})]);
    const gastadas=Object.keys(consL).filter(id=>!L.some(l=>l.id===id));/* coladas que se acabaron ese día */
    return el("div",{class:"card"},[
      el("div",{class:"hd"},[el("span",{class:"tagm",style:"background:"+col}),el("h2",{text:n+" · "+MAT[m].nom}),el("span",{class:"sub num",style:"margin-left:auto",text:fmt(sF(L))+" f · "+fmt(sK(L))+" kg"})]),
      el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[
        el("div",{class:"sd-kpis"},[
          el("div",{},[el("small",{text:"En nave"}),el("b",{class:"num",text:fmt(sF(nave))+" f"}),el("span",{class:"num",text:fmt(sK(nave))+" kg"})]),
          el("div",{},[el("small",{text:"En el externo"}),el("b",{class:"num",text:fmt(sF(ext))+" f"}),el("span",{class:"num",text:fmt(sK(ext))+" kg"})]),
          el("div",{},[el("small",{text:"Consumido ese día"}),el("b",{class:"num",text:cF?"−"+fmt(cF)+" f":"—"}),el("span",{class:"num",text:cF?fmt(cK)+" kg"+(porT.length?" · "+porT.map(([u,v])=>u.toLowerCase()+" "+v).join(", "):""):""})]),
          el("div",{},[el("small",{text:"Entró ese día"}),el("b",{class:"num",text:ents.length?"+"+fmt(ents.reduce((a,r)=>a+(r.fa||0),0))+" f":"—"}),el("span",{text:ents.map(r=>nomLote(r.d)+(r.p?" ("+r.p+")":"")).join(", ")})])]),
        L.length?barra:el("div",{class:"empty",text:"No quedaba nada."}),
        L.length?el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},[el("th",{text:"Colada"}),el("th",{text:"Dónde"}),el("th",{class:"r",text:"Fardos"}),el("th",{class:"r",text:"Kilos"}),el("th",{class:"r",text:"Gastado ese día"})])]),
          el("tbody",{},nave.map(l=>fila(l,false)).concat(ext.map(l=>fila(l,true))).concat(gastadas.map(id=>el("tr",{class:"sub"},[el("td",{text:nomLote(id)}),el("td",{text:"se acabó"}),el("td",{class:"r num",text:"0"}),el("td",{class:"r num",text:"0"}),el("td",{class:"r num",text:"−"+consL[id]})]))))])]):null,
        el("div",{},[el("div",{class:"sub",style:"margin-bottom:4px",text:"Fardos en nave, últimos 30 días (toca un día para verlo)"}),graf])])]);});
  let gran=null;try{gran=conCorte(f,granallaKg);}catch(e){}
  return [el("div",{class:"card"},[el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:8px"},[sel,tit])])]
    .concat(cards.length?cards:[el("div",{class:"empty",text:"No hay datos de ese día."})])
    .concat(gran!=null?[el("div",{class:"card"},[el("div",{class:"hd"},[el("span",{class:"tagm",style:"background:var(--cobre)"}),el("h2",{text:"Granalla de cobre"}),el("span",{class:"sub num",style:"margin-left:auto",text:fmt(gran)+" kg"})])])]:[]);}

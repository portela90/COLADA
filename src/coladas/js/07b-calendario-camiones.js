/* ---------- Calendario de camiones (como la hoja del mes) ----------
   Un cuadro por día con lo que habrá en fábrica de cada línea al empezar el día y los camiones que llegan
   («+37», del color de su proveedor; «B» = traída del almacén externo). Se toca un camión para moverlo de día,
   de nave o de proveedor, o se arrastra a otro día o a otra nave en el ordenador. Tocar un hueco añade un camión.
   Usa los mismos datos que «Calendario de entradas» (cfg.plan[mes].entradas) y la misma proyección. */
/* «pincel»: se toca un proveedor de arriba y luego los camiones, y cada uno toma ese proveedor (un toque por camión) */
let pincelProv=null;
const PROV_COL=["#2D6FA8","#1F7A4D","#B03A3A","#9A6B14","#6B4FA0","#2A7F86","#A6497C"];
function colProv(p,provs){if(!p)return"var(--mut)";const i=provs.indexOf(p);return PROV_COL[(i<0?provs.length:i)%PROV_COL.length];}
const mesDeF=f=>f.slice(0,7);
async function guardarEntradas(mes,lista){const c=Object.assign({},cfg.plan||{});c[mes]=Object.assign({camiones:[],consumo:{},entradas:[]},c[mes]||{},{entradas:lista});cfg.plan=c;await saveCfg();}
/* mover una entrada (de día, de línea o de proveedor); si cambia de mes pasa al plan de ese mes */
async function moverEntrada(m,ents,idx,cambio){const x=ents[idx],nx=Object.assign({},x,cambio);
  if(nx.o==="B"&&cambio.k&&x.k&&cambio.k.split("|")[0]!==x.k.split("|")[0]){toast("Lo del externo ya está facturado a su nave: no se puede pasar a la otra");return false;}
  const m2=mesDeF(nx.f);
  if(m2===m){const L=ents.slice();L[idx]=nx;await guardarEntradas(m,L.sort((a,b)=>(a.f||"").localeCompare(b.f||"")));}
  else{const L=ents.filter((_,i)=>i!==idx),P2=((cfg.plan||{})[m2]||{}).entradas||[];await guardarEntradas(m,L);await guardarEntradas(m2,P2.concat([nx]).sort((a,b)=>(a.f||"").localeCompare(b.f||"")));}
  return true;}
function dlgCamion(m,ents,idx,provs,nuevo){const x=nuevo||ents[idx],f={f:x.f,k:x.k||"",p:x.p||"",fa:String(x.fa||Math.round(mediaCamion((x.k||"|L-2630").split("|")[1]).fa))};
  const esB=x.o==="B";
  const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)ov.remove();}});const cerrar=()=>ov.remove();
  const lin=LINEAS.filter(([n])=>!esB||!x.k||n===x.k.split("|")[0]).map(([n,mm])=>{const k=key(n,mm);const o=el("option",{value:k,text:etiqLinea(k)});if(f.k===k)o.selected=true;return o;});
  const err=el("div");
  const guardar=async()=>{const fa=parseInt(f.fa,10);if(!f.f||!(fa>0)){err.className="banner b";err.textContent="Pon el día y los fardos.";return;}
    try{if(nuevo){const L=ents.concat([{f:f.f,k:f.k,fa,o:"C",p:f.p||undefined}]);if(mesDeF(f.f)===m)await guardarEntradas(m,L.sort((a,b)=>(a.f||"").localeCompare(b.f||"")));else{const P2=((cfg.plan||{})[mesDeF(f.f)]||{}).entradas||[];await guardarEntradas(mesDeF(f.f),P2.concat([{f:f.f,k:f.k,fa,o:"C",p:f.p||undefined}]));}toast("Camión añadido el "+dmy(f.f));}
      else{const c={f:f.f,k:f.k,fa};if(!esB)c.p=f.p||undefined;if(!(await moverEntrada(m,ents,idx,c)))return;toast("Camión movido: "+diaSem(f.f)+" "+dmy(f.f)+" · "+etiqLinea(f.k));}
      cerrar();render();}catch(e){toast("No se pudo guardar");}};
  const box=el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"Camión"},[
    el("h3",{text:nuevo?"Añadir camión":esB?"Traída del externo (B)":"Camión"+(x.p?" de "+x.p:"")}),
    el("label",{text:"Día"},[el("input",{id:"cm-f",type:"date",value:f.f,onchange:e=>{f.f=e.target.value;}})]),
    el("label",{text:"Entra en"},[el("select",{id:"cm-k",onchange:e=>{f.k=e.target.value;}},(esB?[]:[(()=>{const o=el("option",{value:"",text:"Por decidir"});if(!f.k)o.selected=true;return o;})()]).concat(lin))]),
    esB?el("p",{class:"hint",text:"Lo del externo ya está facturado a su nave: solo se puede cambiar de día."}):
      el("label",{text:"Proveedor"},[el("select",{id:"cm-p",onchange:e=>{f.p=e.target.value;}},[el("option",{value:"",text:"—"})].concat(provs.map(p=>{const o=el("option",{value:p,text:p});if(f.p===p)o.selected=true;return o;})))]),
    el("label",{text:"Fardos"},[el("input",{id:"cm-fa",class:"num",type:"text",inputmode:"numeric",value:f.fa,oninput:e=>{f.fa=e.target.value;}})]),
    err,
    el("div",{class:"dlg-b",style:"flex-wrap:wrap"},[
      nuevo?null:el("button",{type:"button",class:"btn sec",text:"Quitar",onclick:async()=>{if(!(await confirmar("¿Quitar este camión del calendario?",{titulo:"Quitar camión",ok:"Quitar"})))return;try{await guardarEntradas(m,ents.filter((_,i)=>i!==idx));toast("Quitado");cerrar();render();}catch(e){toast("No se pudo");}}}),
      nuevo||esB?null:el("button",{type:"button",class:"btn sec",text:"Ha llegado",onclick:()=>{cerrar();llegaCamion(Object.assign({mes:m},x));}}),
      el("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:cerrar}),
      el("button",{type:"button",class:"btn",id:"cm-ok",text:nuevo?"Añadir":"Guardar",onclick:guardar})])]);
  ov.appendChild(box);document.body.appendChild(ov);}
function calCamionesCard(o){const {m,ents,cons,SIp,B,cams}=o,h=hoy();
  const provs=[...new Set(cams.map(c=>c.p).concat(ents.map(x=>x.p)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
  const dias=diasMes(m),w0=(new Date(+m.slice(0,4),+m.slice(5,7)-1,1).getDay()+6)%7;
  /* líneas que se pintan: las que tienen algo en fábrica o algún camión este mes */
  const lin=LINEAS.map(([n,mm])=>key(n,mm)).filter(k=>(SIp.ini[k]||0)>0||ents.some(x=>x.k===k));
  /* stock al empezar cada día (desde hoy), con la misma cuenta que la proyección */
  const ini={};lin.forEach(k=>{let f=SIp.ini[k]||0;ini[k]={};dias.forEach(d=>{if(d<h)return;ini[k][d]=Math.round(f);
    const ent=ents.filter(x=>x.f===d&&x.k===k&&!x.rec).reduce((a,x)=>a+x.fa,0);f=f+ent-(cons[k]||0)*relevosDia(d)/3;});});
  const mins=k=>((cfg.minimos||{})[k]||{}).fardosNave||0;
  let arrastra=null;
  const chip=(x,i)=>{const esB=x.o==="B",c=esB?"var(--warn)":colProv(x.p,provs);
    const b=el("button",{type:"button",class:"cc-chip"+(x.rec?" rec":"")+(esB?" b":""),style:"--cc:"+c,draggable:x.rec?null:"true",
      title:(esB?"Traída del externo":"Camión"+(x.p?" de "+x.p:""))+" · "+fmt(x.fa)+" f"+(x.rec?" · ya ha llegado":" · toca para moverlo"),
      onclick:async e=>{e.stopPropagation();if(x.rec){toast("Este camión ya ha llegado");return;}
        if(pincelProv&&!esB){if(x.p===pincelProv)return;try{await moverEntrada(m,ents,i,{p:pincelProv});toast(dmy(x.f)+": camión de "+pincelProv);render();}catch(er){toast("No se pudo guardar");}return;}
        dlgCamion(m,ents,i,provs);},
      ondragstart:e=>{arrastra=i;try{e.dataTransfer.setData("text/plain",String(i));e.dataTransfer.effectAllowed="move";}catch(er){}}},
      [document.createTextNode((x.rec?"✓ ":"+")+fmt(x.fa)),esB?el("small",{text:" B"}):null]);return b;};
  const soltar=(d,k)=>async e=>{e.preventDefault();e.currentTarget.classList.remove("over");const i=arrastra!=null?arrastra:parseInt(e.dataTransfer.getData("text/plain"),10);arrastra=null;if(!(i>=0))return;
    const x=ents[i];if(!x||(x.f===d&&x.k===k))return;try{if(await moverEntrada(m,ents,i,{f:d,k}))toast("Camión movido: "+diaSem(d)+" "+dmy(d)+" · "+etiqLinea(k));render();}catch(er){toast("No se pudo guardar");}};
  const celdas=[];for(let i=0;i<w0;i++)celdas.push(el("div",{class:"cc-d vacio"+(i>=5?" finde":"")}));
  dias.forEach((d,di)=>{const rel=relevosDia(d),pas=d<h,fin=(w0+di)%7>=5;
    const filas=lin.map(k=>{const [n,mm]=k.split("|"),v=ini[k][d],mn=mins(k);
      const est=v==null?"":v<0?" neg":mn&&v<mn?" bajo":"";
      const chips=ents.map((x,i)=>[x,i]).filter(([x])=>x.f===d&&x.k===k).map(([x,i])=>chip(x,i));
      return el("div",{class:"cc-l",style:"--lc:"+MAT[mm].col,"data-k":k,ondragover:e=>{e.preventDefault();e.currentTarget.classList.add("over");},ondragleave:e=>e.currentTarget.classList.remove("over"),ondrop:soltar(d,k),
        onclick:()=>{if(pas){toast("Ese día ya ha pasado");return;}dlgCamion(m,ents,-1,provs,{f:d,k,o:"C"});},title:etiqLinea(k)+(v!=null?": "+fmt(v)+" f al empezar el día":"")},
        [el("span",{class:"cc-n",text:n.replace("Nave ","N")+(mm==="L-2521-B"?"·12":"")}),el("b",{class:"num cc-v"+est,text:v==null?"":fmt(v)})].concat(chips));});
    celdas.push(el("div",{class:"cc-d"+(fin?" finde":"")+(rel===0?" libre":"")+(d===h?" hoy":"")+(pas?" pasado":"")},[el("div",{class:"cc-dn",text:String(+d.slice(8))+(rel===2?" · sin N":rel===1?" · 1 rel.":"")})].concat(rel===0&&!ents.some(x=>x.f===d)?[]:filas)));});
  /* resumen por proveedor: contratados, colocados y lo que falta por colocar */
  const res=provs.map(p=>{const n=cams.filter(c=>c.p===p).reduce((a,c)=>a+(c.n||0),0),col=ents.filter(x=>x.o!=="B"&&x.p===p).length,lleg=ents.filter(x=>x.o!=="B"&&x.p===p&&x.rec).length;
    return el("button",{type:"button",class:"cc-prov"+(pincelProv===p?" on":""),"aria-pressed":String(pincelProv===p),style:"--cc:"+colProv(p,provs),title:"Toca y luego toca los camiones de "+p,onclick:()=>{pincelProv=pincelProv===p?null:p;render();}},[el("span",{class:"cc-dot"}),el("b",{text:p}),el("span",{class:"num",text:(n?col+" de "+n:col+"")+((n||col)===1?" camión":" camiones")+(n?" · "+fmt(n*KG_CAM)+" kg":"")+(lleg?" · "+lleg+" llegados":"")})]);});
  const sinP=ents.filter(x=>x.o!=="B"&&!x.p).length,bp=ents.filter(x=>x.o==="B").length;
  if(sinP)res.push(el("div",{class:"cc-prov",style:"--cc:var(--mut)"},[el("span",{class:"cc-dot"}),el("b",{text:"Sin proveedor"}),el("span",{class:"num",text:sinP+" camiones"})]));
  if(bp)res.push(el("div",{class:"cc-prov",style:"--cc:var(--warn)"},[el("span",{class:"cc-dot"}),el("b",{text:"B · del externo"}),el("span",{class:"num",text:bp+(bp===1?" traída":" traídas")})]));
  const totC=cams.reduce((a,c)=>a+(c.n||0),0),colocados=ents.filter(x=>x.o!=="B").length;
  return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Calendario de camiones"}),el("span",{class:"sub",style:"margin-left:auto",text:colocados+" de "+totC+" camiones colocados"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[
      pincelProv?el("div",{class:"banner w cc-pincel"},[el("span",{text:"Poniendo «"+pincelProv+"»: toca cada camión que sea de "+pincelProv+"."}),el("button",{type:"button",class:"btn peq",text:"Terminar",onclick:()=>{pincelProv=null;render();}})]):
        provs.length?el("p",{class:"hint",style:"margin:0",text:"Para poner el proveedor rápido: toca un proveedor de aquí abajo y luego toca sus camiones en el calendario."}):null,
      res.length?el("div",{class:"cc-provs"},res):el("p",{class:"hint",style:"margin:0",text:"Mete los camiones contratados del mes (ventana «Camiones contratados») y colócalos aquí."}),
      el("div",{class:"tw cc-tw"},[el("div",{class:"cc"},["L","M","X","J","V","S","D"].map((t,i)=>el("div",{class:"cc-h"+(i>=5?" finde":""),text:t})).concat(celdas))]),
      el("p",{class:"hint",style:"margin:0",text:"Cada día: los fardos que habrá en fábrica de cada nave al empezar (en rojo si se acaba, en amarillo bajo el mínimo) y los camiones que llegan, del color de su proveedor. Toca un camión para cambiarlo de día, de nave o de proveedor, o arrástralo en el ordenador. Toca un hueco para añadir uno."})])]);}

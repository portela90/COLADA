/* ---------- Consumo del mes, comparado con el mes pasado ----------
   Mosaico del panel de Consumo: lo gastado este mes hasta hoy frente al mes pasado hasta el mismo día
   (para comparar lo mismo con lo mismo), con una gráfica de los últimos 6 meses. Al abrirlo, el detalle por nave y aleación. */
const MESC3=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
function consumoCmp(){const PC=perCmp(hoy()),S=saldos(),M=todosMovs().filter(r=>!r.h&&r.t==="C"&&r.f);
  const L={},tot={a:0,b:0,serie:PC.meses.map(()=>0)};
  M.forEach(r=>{const l=lotes.find(x=>x.id===r.o);if(!l)return;const kg=Math.abs(kgAp(r,S)||0),k=key(l.nave,l.material);
    const o=L[k]=L[k]||{nave:l.nave,mat:l.material,a:0,b:0,serie:PC.meses.map(()=>0)};
    if(r.f>=PC.d1&&r.f<=PC.h){o.a+=kg;tot.a+=kg;}if(r.f>=PC.a1&&r.f<=PC.ah){o.b+=kg;tot.b+=kg;}
    const i=PC.meses.indexOf(r.f.slice(0,7));if(i>=0){o.serie[i]+=kg;tot.serie[i]+=kg;}});
  return{PC,tot,lineas:Object.values(L).filter(x=>x.a||x.b||x.serie.some(Boolean)).sort((x,y)=>(x.nave+x.mat).localeCompare(y.nave+y.mat))};}
const pctCmp=(a,b)=>b?Math.round((a-b)/b*100):null;
function cmpTxt(a,b){const p=pctCmp(a,b);return p==null?(a?"el mes pasado a esta fecha no había":"igual"):(p>0?"▲ ":p<0?"▼ ":"= ")+(p?Math.abs(p)+" %":"igual");}
function sparkC(v,meses){if(!v||!v.some(x=>x>0))return null;const W=120,H=28,mx=Math.max(...v)||1,bw=W/v.length,ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
  svg.setAttribute("viewBox","0 0 "+W+" "+H);svg.setAttribute("class","tspark");svg.setAttribute("aria-hidden","true");svg.setAttribute("preserveAspectRatio","none");
  v.forEach((x,i)=>{const r=document.createElementNS(ns,"rect"),h=Math.max(2,x/mx*(H-2));r.setAttribute("x",i*bw+2);r.setAttribute("width",bw-4);r.setAttribute("y",H-h);r.setAttribute("height",h);r.setAttribute("rx",2);if(i===v.length-1)r.setAttribute("class","act");svg.appendChild(r);});
  return el("div",{class:"tspk"},[svg,el("div",{class:"tspk-m"},(meses||[]).map(m=>el("i",{text:MESC3[+m.slice(5,7)-1]})))]);}
function tileConsumoMes(){let C;try{C=consumoCmp();}catch(e){return null;}const t=C.tot,dd=+hoy().slice(8,10),ma=MESC3[+C.PC.a1.slice(5,7)-1];
  return{v:"mes",t:"Consumo del mes",big:fmt(t.a),u:"kg",cmp:{txt:t.b?cmpTxt(t.a,t.b):(t.a?"sin consumo el mes pasado a esta fecha":"igual que el mes pasado"),sub:t.b?"vs. mes pasado":"",title:"Comparado con el 1–"+(+C.PC.ah.slice(8,10))+" de "+ma},spark:sparkC(t.serie,C.PC.meses),
    sub:"del 1 al "+dd+" de "+MESC3[+hoy().slice(5,7)-1],nodes:()=>[cardConsumoMes(C)]};}
function cardConsumoMes(C){const PC=C.PC,ma=MESC3[+PC.a1.slice(5,7)-1],me=MESC3[+PC.d1.slice(5,7)-1],dA=+PC.h.slice(8,10),dB=+PC.ah.slice(8,10);
  const fila=(n,x)=>{const p=pctCmp(x.a,x.b);return el("tr",null,[el("td",{text:n}),el("td",{class:"num",style:"text-align:right",text:fmt(x.a)}),el("td",{class:"num",style:"text-align:right",text:fmt(x.b)}),
    el("td",{class:"num",style:"text-align:right;font-weight:600",text:p==null?"—":(p>0?"+":"")+p+" %"})]);};
  const th=t=>el("th",{style:t==="Línea"?"":"text-align:right",text:t});
  const tabla=el("div",{class:"tbl-wrap",style:"overflow-x:auto"},[el("table",{class:"tbl"},[el("thead",null,[el("tr",null,["Línea","1–"+dA+" "+me,"1–"+dB+" "+ma,"Diferencia"].map(th))]),
    el("tbody",null,C.lineas.map(x=>fila(x.nave+" · "+(MAT[x.mat]?MAT[x.mat].nom:x.mat),x)).concat([fila("Total",C.tot)]))])]);
  const meses=el("div",{class:"tbl-wrap",style:"overflow-x:auto"},[el("table",{class:"tbl"},[el("thead",null,[el("tr",null,[el("th",{text:"Línea"})].concat(PC.meses.map((m,i)=>el("th",{style:"text-align:right",text:MESC3[+m.slice(5,7)-1]+(i===PC.meses.length-1?" (en curso)":"")}))))]),
    el("tbody",null,C.lineas.map(x=>el("tr",null,[el("td",{text:x.nave+" · "+(MAT[x.mat]?MAT[x.mat].nom:x.mat)})].concat(x.serie.map(v=>el("td",{class:"num",style:"text-align:right",text:fmt(v)}))))))])]);
  return el("div",{class:"card",id:"cons-mes"},[el("div",{class:"hd"},[el("h2",{text:"Consumo del mes"}),el("span",{class:"der sub",text:"en kilos"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:12px"},[
      el("p",{class:"hint",style:"margin:0",text:"Este mes hasta hoy frente al mes pasado hasta el mismo día, para comparar lo mismo con lo mismo. Sale de los consumos apuntados en la app."}),
      tabla,sparkC(C.tot.serie,PC.meses),el("h3",{style:"margin:6px 0 0;font-size:15px",text:"Últimos 6 meses"}),meses])]);}

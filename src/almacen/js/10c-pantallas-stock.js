/* ===== PANTALLAS DE STOCK, PEDIDO Y PISTONES (fase 4, estilo del prototipo) =====
   Lista de pedido como pantalla (agrupada por proveedor, en envases completos) y Cambios de pistón con filtros.
   Usa las piezas de 10b-pantallas-ejes.js (pzCifras, pzPan, pzBarra…). */

const NIV_P={bad:["Bajo mínimo","bad"],warn:["Para pedir","warn"],ok:["Bien","ok"],na:["Sin mínimo","na"]};
const pzPill=(t,c)=>el("span",{class:"pill "+(c||""),text:t});
async function copiarTxt(tx,que){try{await navigator.clipboard.writeText(tx);toast((que||"Texto")+" copiado");}catch(e){dlg(que||"Texto",el("textarea",{readonly:true,style:"min-height:240px;font-size:13px",value:tx}),[{t:"Cerrar",cls:"sec"}]);}}

/* ---------- Lista de pedido ---------- */
function listaPedido(){const aj=cat.ajustes||{};const box=el("div",{class:"pz"});
  function pinta(){box.textContent="";const{txt,arts}=textoPedido();const pend=arts.filter(a=>!a.pedido);
    const ta=el("textarea",{id:"lpTxt",readonly:true,class:"pz-txt",value:txt});
    const wa=el("a",{class:"btn sec",href:"https://wa.me/"+(telWA(aj.tel)||"")+"?text="+encodeURIComponent(txt),target:"_blank",rel:"noopener",text:"Enviar por WhatsApp"+(aj.resp?" a "+aj.resp.split(" ")[0]:"")});
    box.appendChild(el("div",{class:"pz-barra"},[el("span",{class:"sub",text:aj.resp||aj.email?"Para: "+[aj.resp,aj.email].filter(Boolean).join(" · "):"Pon el responsable de pedidos en Catálogo › Pedidos."}),
      el("div",{class:"pz-acc"},[el("button",{type:"button",class:"btn sec",text:"Copiar la lista",onclick:()=>copiarTxt(ta.value,"Lista")}),wa,
        pend.length?el("button",{type:"button",class:"btn",text:"Marcar todo como pedido ("+pend.length+")",onclick:async()=>{pend.forEach(a=>{const x=art(a.id);if(x)aplicarPedido(x,hoy());});try{await saveCat();toast("Marcado como pedido");}catch(e){}render(true);}}):null])]));
    const provs=[...new Set(arts.map(a=>provN(a.prov)||""))];
    box.appendChild(pzCifras([["Para pedir",String(arts.length),arts.length?"en envases completos":"nada que pedir",""],
      ["Bajo mínimo",String(arts.filter(a=>nivel(a)==="bad").length),"lo más urgente",arts.some(a=>nivel(a)==="bad")?"bad":"ok"],
      ["Ya pedidos",String(arts.filter(a=>a.pedido).length),"esperando a que lleguen",""],
      ["Proveedores",provs.filter(Boolean).length?String(provs.filter(Boolean).length):"—",provs.includes("")?(provs.filter(Boolean).length?"y algunos sin proveedor":"ninguno asignado todavía"):"a los que pedir",""]]));
    if(!arts.length)box.appendChild(pzPan("Todo bien",null,[pzVacio("Todo está por encima de lo que hay que tener. No hace falta pedir nada.")]));
    const g={};arts.forEach(a=>{const k=provN(a.prov)||"";(g[k]=g[k]||[]).push(a);});
    Object.keys(g).sort((x,y)=>(x==="")-(y==="")||x.localeCompare(y,"es")).forEach(k=>{const pv=cat.proveedores.find(x=>x.nom===k);
      box.appendChild(pzPan(k||"Sin proveedor",[plu(g[k].length,"artículo","artículos"),pv&&pv.plazo?"tarda "+pv.plazo+" días":null].filter(Boolean).join(" · "),g[k].map(a=>{const n=nivel(a),q=cantPedir(a),P=NIV_P[n]||NIV_P.na;
        return el("div",{class:"pz-ln"},[pzPill(a.pedido?"Pedido "+fmtF(a.pedido):P[0],a.pedido?"info":P[1]),
          el("button",{type:"button",class:"pz-ln-tx",onclick:()=>ficha(a)},[el("b",{text:a.desc}),el("span",{class:"sub",text:["hay "+fmtN(stockDe(a.id))+" "+a.ud+(puestoDe(a)>0?" + "+fmtN(Math.round(puestoDe(a)))+" puesto":""),"mínimo "+fmtN(+a.min||0),consPlazo(a)>0?"en "+plazoArt(a)+" días se gastan "+fmtN(Math.round(consPlazo(a)*10)/10):null,avisaDe(a)?null:"no avisa"].filter(Boolean).join(" · ")})]),
          el("b",{class:"pz-ln-q num",text:pedTxt(a,q)}),
          el("button",{type:"button",class:"btn "+(a.pedido?"txt":"sec")+" peq",text:a.pedido?"Quitar":"Pedido",onclick:()=>marcarPedido(a,a.pedido?null:hoy())})]);})));});
    const ch=incluirChips("pedido",OPS_PED,sl=>{ta.value=textoPedido(sl).txt;wa.href="https://wa.me/"+(telWA(aj.tel)||"")+"?text="+encodeURIComponent(ta.value);});
    box.appendChild(el("details",{class:"pz-nota"},[el("summary",{text:"El texto que se envía"}),el("div",{style:"display:grid;gap:10px;margin-top:10px"},[ch.node,ta])]));
    box.appendChild(el("p",{class:"hint",style:"margin:0",text:"Cantidad a pedir = mínimo + lo que se gasta durante el plazo de entrega − lo que hay (contando lo que ya está puesto en el punto de consumo), redondeado a envases completos (GRG, bidón…). Así, cuando llegue el pedido, sigues teniendo el mínimo."}));}
  const cerrar=objPage({ruta:["Almacén","Stock"],titulo:"Lista de pedido",sub:"Agrupada por proveedor, en envases completos.",volver:"Stock",tabs:[["Pedido",[box]]]});
  const ov=[...document.querySelectorAll(".op-ov")].pop();if(ov)ov._repinta=pinta;pinta();return cerrar;}

/* artículos con stock que no se han gastado en 60 días */
const sinGasto60=()=>{const d0=sumaDias(hoy(),-60),con=new Set(todosMov().filter(m=>m.tipo==="salida"&&m.f>=d0).map(m=>m.art));return artsActivos().filter(a=>stockDe(a.id)>0&&!con.has(a.id));};
function pantQuietos(){const L=sinGasto60().sort((a,b)=>stockDe(b.id)*precioDe(b)-stockDe(a.id)*precioDe(a)||a.desc.localeCompare(b.desc,"es"));const tot=L.reduce((t,a)=>t+stockDe(a.id)*precioDe(a),0);
  objPage({ruta:["Almacén","Stock"],titulo:"Sin gastarse en 60 días",sub:"Hay stock pero no ha salido nada en dos meses"+(tot?" · "+eur(tot)+" parados":"")+". Primero lo que más dinero tiene parado.",volver:"Stock",
    tabs:[["Artículos",[pzPan(plu(L.length,"artículo","artículos"),null,L.length?L.map(a=>el("button",{type:"button",class:"pz-ln pz-ln3",onclick:()=>ficha(a)},[el("span",{class:"pz-ln-tx"},[el("b",{text:a.desc}),el("span",{class:"sub",text:[FAM[a.fam],(()=>{const u=todosMov().filter(m=>m.art===a.id&&m.tipo==="salida").map(m=>m.f).sort().pop();return u?"último consumo "+fmtF(u):"nunca ha salido";})()].filter(Boolean).join(" · ")})]),
      el("b",{class:"pz-ln-q num",text:fmtN(stockDe(a.id))+" "+a.ud}),el("span",{class:"sub num",text:precioDe(a)?eur(stockDe(a.id)*precioDe(a)):""})])):[pzVacio("Todo lo que hay se ha movido en los últimos 60 días.")])]]]});}

/* ---------- Cambios de pistón ---------- */
function pantPist(f0){const F=Object.assign({diam:null,maq:null,mot:null,per:"90",todo:false},f0||{});const box=el("div",{class:"pz"});
  const pon=(k,v)=>{F[k]=F[k]===v?null:v;F.todo=false;pinta();};
  function pinta(){box.textContent="";const hy=hoy(),d0=F.per==="todo"?"0000":sumaDias(hy,-(+F.per));
    const A=todosPist().filter(p=>p.f&&p.f>=d0).map(p=>Object.assign({},p,{n:+p.cant||1,mq:maqN(p.maq),mt:p.motivo?cap(p.motivo):"Sin motivo"}));
    const ok=(p,sin)=>(sin==="diam"||!F.diam||p.diam===F.diam)&&(sin==="maq"||!F.maq||p.mq===F.maq)&&(sin==="mot"||!F.mot||p.mt===F.mot);
    const L=A.filter(p=>ok(p)).sort((a,b)=>(b.f+String(b.ts||0).padStart(15,"0")).localeCompare(a.f+String(a.ts||0).padStart(15,"0")));const n=L.reduce((t,p)=>t+p.n,0);
    const mes=hy.slice(0,7),ant=sumaDias(mes+"-01",-1).slice(0,7),todos=todosPist().filter(p=>ok(p));const nMes=todos.filter(p=>(p.f||"").slice(0,7)===mes).reduce((t,p)=>t+(+p.cant||1),0),nAnt=todos.filter(p=>(p.f||"").slice(0,7)===ant).reduce((t,p)=>t+(+p.cant||1),0);
    const sem=Math.max(1,(F.per==="todo"?(A.length?dias(A.map(p=>p.f).sort()[0],hy):7):+F.per)/7);
    const gD=pzGrupo(A.filter(p=>ok(p,"diam")),p=>p.diam,p=>p.n),gM=pzGrupo(A.filter(p=>ok(p,"maq")),p=>p.mq,p=>p.n),gT=pzGrupo(A.filter(p=>ok(p,"mot")),p=>p.mt,p=>p.n);
    const pedirP=artsActivos().filter(a=>a.fam==="piston"&&["bad","warn"].includes(nivel(a)));
    box.appendChild(el("div",{class:"pz-barra"},[el("div",{class:"seg",role:"group","aria-label":"Periodo"},[["30","30 días"],["90","3 meses"],["365","1 año"],["todo","Todo"]].map(([k,t])=>el("button",{type:"button","aria-pressed":String(F.per===k),text:t,onclick:()=>{F.per=k;pinta();}}))),
      el("div",{class:"pz-acc"},[el("button",{type:"button",class:"btn",text:"Apuntar cambio de pistón",onclick:()=>{cerrarDlgs();irPist({});}})])]));
    box.appendChild(pzCifras([["Cambiados en "+MESES[+mes.slice(5,7)-1],String(nMes),(nMes>=nAnt?"+":"−")+Math.abs(nMes-nAnt)+" respecto a "+MESES[+ant.slice(5,7)-1]+" ("+nAnt+")",""],
      ["En el periodo",fmtN(n),"≈ "+fmtN(Math.round(n/sem*10)/10)+" a la semana",""],
      gD.length?["El que más se gasta",gD[0][0],gD[0][2]+" de "+fmtN(A.filter(p=>ok(p,"diam")).reduce((t,p)=>t+p.n,0))+" cambios","",()=>pon("diam",gD[0][0])]:null,
      ["Para pedir",String(pedirP.length),pedirP.length?pedirP.map(a=>a.diam||a.desc).join(", "):"ninguno",pedirP.length?"bad":"ok",pedirP.length?()=>listaPedido():null]]));
    const chips=[F.diam?["diam",F.diam]:null,F.maq?["maq",F.maq]:null,F.mot?["mot",F.mot]:null].filter(Boolean);
    if(chips.length)box.appendChild(el("div",{class:"pz-filtros"},[el("span",{class:"sub",text:"Mirando solo:"})].concat(chips.map(([k,t])=>el("button",{type:"button",class:"pz-quita","aria-label":"Quitar el filtro "+t,onclick:()=>{F[k]=null;pinta();}},[t," ✕"])),
      [el("button",{type:"button",class:"btn txt peq",text:"Quitar todo",onclick:()=>{F.diam=F.maq=F.mot=null;pinta();}})])));
    /* por semana (las últimas 13) */
    const S=[];{let d=sumaDias(hy,-((new Date(hy+"T12:00:00").getDay()+6)%7));for(let i=0;i<13;i++){S.unshift(d);d=sumaDias(d,-7);}}
    const VS=S.map((s,i)=>L.filter(p=>p.f>=s&&p.f<(S[i+1]||"9999")).reduce((t,p)=>t+p.n,0)),mxS=Math.max(1,...VS);
    box.appendChild(pzPan("Cambios por semana","las últimas 13 semanas",[el("div",{class:"pz-graf pz-graf13"},S.map((s,i)=>el("div",{class:"pz-mesb",title:"Semana del "+fmtF(s)+": "+VS[i]},[el("span",{class:"val",text:VS[i]?String(VS[i]):""}),el("span",{class:"col",style:"height:"+(VS[i]?Math.max(6,Math.round(VS[i]/mxS*150)):2)+"px"}),el("span",{class:"et",text:s.slice(8,10)+"/"+s.slice(5,7)})])))]));
    const barras=(G,k)=>G.length?G.map(([t,c,u])=>el("button",{type:"button",class:"pz-mot","aria-pressed":String(F[k]===t),onclick:()=>pon(k,t)},[el("span",{class:"l"},[el("span",{text:t}),el("b",{text:fmtN(u)})]),pzBarra(u,G[0][2])])):[pzVacio("Nada en el periodo.")];
    box.appendChild(el("div",{class:"pz-fila2 pz-tres"},[pzPan("Por diámetro","toca para filtrar",barras(gD,"diam")),pzPan("Por máquina",gM.length>8?"las 8 que más":"toca para filtrar",barras(gM.slice(0,8),"maq")),pzPan("Por motivo",null,barras(gT,"mot"))]));
    const ver=F.todo?L:L.slice(0,20);
    box.appendChild(pzPan("Cambios apuntados",plu(n,"pistón","pistones"),L.length?[el("div",{class:"pz-tabla pz-tp"},[el("div",{class:"cabt","aria-hidden":"true"},["Fecha","Máquina","Ø","Motivo","Pistón usado","Quién"].map(t=>el("span",{text:t})))].concat(ver.map(p=>{const a=pistArt(p.diam);
        return el(a?"button":"div",Object.assign({class:"ft"},a?{type:"button",onclick:()=>ficha(a)}:{}),[el("span",{class:"env",text:fmtF(p.f)}),el("span",{class:"eje",text:p.mq}),el("span",{class:"maqc",text:p.diam+(p.n>1?" ×"+p.n:"")}),el("span",{class:"desp",text:p.mt}),el("span",{class:"rec",text:p.dest?cap(p.dest):"—"}),el("span",{class:"coste",text:[p.resp||null,p.gest&&typeof gCfg==="function"?((gCfg().lista.find(g=>g.id===p.gest)||{}).n||null):null].filter(Boolean).join(" · ")||"—"})]);}))),
      L.length>ver.length?el("button",{type:"button",class:"pz-mas",text:"Ver los "+(L.length-ver.length)+" que faltan",onclick:()=>{F.todo=true;pinta();}}):null]:[pzVacio("No hay cambios con estos filtros.")]));}
  const cerrar=objPage({ruta:["Almacén","Piezas","Pistones"],titulo:"Cambios de pistón",sub:"Cuántos se cambian, en qué máquinas y por qué. Toca un diámetro, una máquina o un motivo para ver solo eso.",volver:"Pistones",tabs:[["Cambios",[box]]]});
  const ov=[...document.querySelectorAll(".op-ov")].pop();if(ov)ov._repinta=pinta;pinta();return cerrar;}

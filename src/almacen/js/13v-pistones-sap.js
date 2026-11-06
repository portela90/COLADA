/* ===== CONSUMO DE PISTONES Y SAP =====
   En Pistones: consultar los cambios de pistón de un día o de una franja (desde / hasta) y marcar
   los que ya se han metido en SAP, para no meter dos veces el mismo consumo.
   SAP registra el consumo con la fecha del día en que se mete, así que se guarda esa fecha
   (sap:{f,ts,por}) dentro del propio cambio de pistón. Desmarcar deja sap:null. */
const enSAP=p=>!!(p&&p.sap&&p.sap.f);
const sapTxt=p=>enSAP(p)?"metido en SAP el "+fmtF(p.sap.f)+(p.sap.por?" por "+String(p.sap.por).split(" ")[0]:""):"";
/* aviso para los diálogos de borrar */
const avisoSAPBorrar=p=>enSAP(p)?" Ojo: este cambio ya está "+sapTxt(p)+". Si lo borras aquí, hay que anularlo también en SAP.":"";
async function patchPists(list){const g={};list.forEach(([p,pt])=>{const y=p.f.slice(0,4);(g[y]=g[y]||[]).push(Object.assign({},pt,{id:p.id}));});
  for(const y of Object.keys(g)){if(db.itemsPatchId){await db.itemsPatchId("pist",y,g[y]);continue;}
    const ref=db.doc("pist/"+y),sn=await ref.get();if(!sn.exists)continue;const m=new Map(g[y].map(x=>[x.id,x]));
    await ref.set({items:(sn.data().items||[]).map(x=>m.has(x.id)?Object.assign({},x,m.get(x.id)):x)});}}
async function marcaSAP(L,si){if(!db||!db.doc&&!db.itemsPatchId){toast("No se puede guardar en esta vista");return false;}
  const sap=si?{f:hoy(),ts:Date.now(),por:(window.yoNombre&&window.yoNombre())||""}:null;
  try{await patchPists(L.map(p=>[p,{sap}]));L.forEach(p=>{p.sap=sap;});return true;}catch(e){toast("No se pudo guardar: "+(e&&e.message||"error"));return false;}}
function cardPistSAP(re){const h=hoy();const F=draft.psap=draft.psap||{d0:h.slice(0,7)+"-01",d1:h,t:"este mes",est:"pend",maq:"",diam:""};
  const all=todosPist();const enPer=p=>p.f>=F.d0&&p.f<=F.d1;
  const base=all.filter(p=>enPer(p)&&(!F.maq||p.maq===F.maq)&&(!F.diam||p.diam===F.diam));
  const L=base.filter(p=>F.est==="todo"||(F.est==="sap")===enSAP(p)).sort((a,b)=>(b.f+"|"+b.ts).localeCompare(a.f+"|"+a.ts));
  const pend=base.filter(p=>!enSAP(p)),nP=pend.reduce((s,p)=>s+(+p.cant||1),0),nT=base.reduce((s,p)=>s+(+p.cant||1),0);
  const fuera=all.filter(p=>!enSAP(p)&&!enPer(p));
  const maqs=[...new Set(all.filter(enPer).map(p=>p.maq))].map(id=>[id,maqN(id)]).sort((a,b)=>String(a[1]).localeCompare(String(b[1]),"es",{numeric:true}));
  const box=el("section",{class:"card",id:"pSapCard"});
  const per=selPeriodo(F.d0,F.d1,(d0,d1,t)=>{Object.assign(F,{d0,d1,t});re();});
  const seg=el("div",{class:"seg",role:"group","aria-label":"Qué ver"},[["pend","Pendientes de SAP"],["sap","Ya en SAP"],["todo","Todos"]].map(([k,t])=>
    el("button",{type:"button","aria-pressed":String(F.est===k),text:t,onclick:()=>{F.est=k;re();}})));
  const porD={};L.forEach(p=>{porD[p.diam]=(porD[p.diam]||0)+(+p.cant||1);});
  const fila=p=>{const cb=el("input",{type:"checkbox","aria-label":"En SAP: "+p.diam+" en "+maqN(p.maq)+" del "+fmtF(p.f)});cb.checked=enSAP(p);
    cb.addEventListener("change",async()=>{const si=cb.checked;if(!si){cb.checked=true;confirmar("¿Quitar la marca de SAP?","El cambio de "+p.diam+" en "+maqN(p.maq)+" del "+fmtF(p.f)+" volverá a salir como pendiente de meter en SAP.","Quitar marca",async()=>{if(await marcaSAP([p],false)){toast("Vuelve a estar pendiente de SAP");re();}});return;}
      cb.disabled=true;if(await marcaSAP([p],true)){toast("Marcado como metido en SAP");re();}else{cb.checked=false;cb.disabled=false;}});
    return el("tr",{},[el("td",{},el("label",{class:"chk",style:"margin:0"},[cb,el("span",{class:"sub",text:" SAP"})])),el("td",{class:"num",text:fmtF(p.f)}),el("td",{},el("b",{text:maqN(p.maq)})),
      el("td",{text:p.diam+((+p.cant||1)>1?" ×"+p.cant:"")}),el("td",{text:cap(p.motivo||"")||"—"}),
      el("td",{},enSAP(p)?el("span",{class:"pill ok",text:"En SAP "+fmtF(p.sap.f)+(p.sap.por?" · "+String(p.sap.por).split(" ")[0]:"")}):el("span",{class:"pill warn",text:"Pendiente"}))]);};
  const vistosPend=L.filter(p=>!enSAP(p));
  const acc=el("div",{class:"acciones"},[vistosPend.length?el("button",{type:"button",class:"btn",id:"pSapTodos",text:"Marcar "+(vistosPend.length===1?"este cambio":"los "+vistosPend.length+" cambios")+" como metidos en SAP",
      onclick:()=>confirmar("¿Marcar como metidos en SAP?",vistosPend.length+(vistosPend.length===1?" cambio":" cambios")+" de pistón ("+vistosPend.reduce((s,p)=>s+(+p.cant||1),0)+" pistones) quedan como metidos en SAP con fecha de hoy, "+fmtF(hoy())+". Si alguno no lo has metido, desmárcalo luego.","Marcar",async()=>{if(await marcaSAP(vistosPend,true)){toast("Marcados como metidos en SAP");re();}})}):null,
    L.length?el("button",{type:"button",class:"btn sec",text:"Descargar Excel",onclick:e=>cExcel("Pistones "+F.t,L.map(p=>({"Fecha":p.f,"Máquina":maqN(p.maq),"Diámetro":p.diam,"Cantidad":+p.cant||1,"Motivo":cap(p.motivo||""),"Responsable":p.resp||"","Relevo":p.u||"","Pistón usado":p.dest?cap(p.dest):"","Nota":p.nota||"","En SAP":enSAP(p)?"Sí":"No","Fecha SAP":enSAP(p)?p.sap.f:"","Metido por":enSAP(p)?(p.sap.por||""):""})),e.currentTarget)}):null].filter(Boolean));
  box.append(el("div",{class:"hd"},[el("h2",{text:"Consumo de pistones y SAP"}),el("span",{class:"der sub",text:nT+(nT===1?" pistón":" pistones")+" "+F.t+" · "+nP+" sin meter en SAP"})]),
    el("div",{class:"bd frm",style:"display:grid;gap:10px"},[per,
      el("div",{class:"row"},[fld("Máquina",sel("pSapMaq",maqs,F.maq,x=>{F.maq=x;re();},"Todas")),fld("Diámetro",sel("pSapDiam",DIAM.map(x=>[x,x]),F.diam,x=>{F.diam=x;re();},"Todos"))]),seg,
      fuera.length&&F.est!=="sap"?el("div",{class:"banner",style:"display:flex;gap:10px;align-items:center;flex-wrap:wrap"},[el("span",{style:"flex:1;min-width:180px",text:fuera.length+(fuera.length===1?" cambio de pistón sin meter en SAP queda":" cambios de pistón sin meter en SAP quedan")+" fuera de este periodo (el más antiguo, del "+fmtF(fuera.reduce((m,p)=>p.f<m?p.f:m,fuera[0].f))+")."}),
        el("button",{type:"button",class:"btn sec peq",text:"Verlos",onclick:()=>{Object.assign(F,{d0:fuera.reduce((m,p)=>p.f<m?p.f:m,fuera[0].f),d1:h,est:"pend"});F.t="del "+fmtF(F.d0)+" al "+fmtF(h);re();}})]):null,
      Object.keys(porD).length?el("div",{class:"chips"},DIAM.filter(d=>porD[d]).map(d=>el("span",{class:"pill",text:d+": "+porD[d]}))):null,acc,
      L.length?el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},["SAP","Fecha","Máquina","Ø","Motivo","Estado"].map(t=>el("th",{text:t})))),el("tbody",{},L.map(fila))]))
        :el("div",{class:"empty",text:F.est==="pend"?"No queda nada pendiente de meter en SAP "+F.t+".":F.est==="sap"?"Nada metido en SAP "+F.t+".":"No hay cambios de pistón "+F.t+"."}),
      el("p",{class:"hint",text:"Marca la casilla SAP al meter cada consumo (máquina y pistón). SAP lo registra con la fecha de hoy, y esa fecha es la que se guarda. Si borras un cambio que ya está en SAP, la app te avisa."})].filter(Boolean)));
  return box;}

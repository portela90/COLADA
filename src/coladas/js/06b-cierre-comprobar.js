/* ---------- Cierre: comprobar antes de cerrar y comparar con la fábrica ----------
   «Antes de cerrar»: relevos sin consumo, entradas sin albarán o sin foto, recuentos que han
   movido mucho y recuento de cierre (último día del mes) de cada nave y almacén externo.
   «Comparar con el cierre de la fábrica»: se escriben sus cifras (inicio, entradas, consumo y
   final por nave y aleación) y la app dice en qué línea está la diferencia y por qué puede ser.
   Se guarda en cfg.fab[mes][nave|aleación] = {ini,ent,con,fin} (kg). */
const AJ_GRANDE=1400; /* kg: unos 2 fardos */
/* recuento de cierre: del antepenúltimo día del mes al 3 del mes siguiente */
function ventanaCierre(I){const d=new Date(+I.dn.slice(0,4),+I.dn.slice(5,7)-1,+I.dn.slice(8,10));const a=new Date(d),b=new Date(d);a.setDate(a.getDate()-2);b.setDate(b.getDate()+3);return[ymd(a),ymd(b)];}
function recuentoCierre(I){const [a,b]=ventanaCierre(I),Sf=conCorte(I.dn,saldos),out=[];
  NAVES.forEach(n=>["nave","externo"].forEach(dn=>{
    const ls=lotes.filter(l=>l.nave===n&&dondeEn(l,I.dn)===dn&&Sf[l.id]&&Sf[l.id].fa>0);if(!ls.length)return;
    const ids=new Set(ls.map(l=>l.id));
    const marca=(cfg.recuentos||[]).filter(r=>r.nave===n&&r.donde===dn&&r.f>=a&&r.f<=b).sort((x,y)=>y.f.localeCompare(x.f))[0];
    const aj=todosMovs().filter(r=>r.t==="A"&&!r.h&&r.f>=a&&r.f<=b&&(ids.has(r.o)||ids.has(r.d)));
    out.push({nave:n,donde:dn,n:ls.length,hecho:marca?marca.f:(aj.length?aj.map(r=>r.f).sort().pop():null),parcial:marca&&marca.n<marca.de?marca.n+" de "+marca.de:null});}));
  return out;}
function checksCierre(I){const out=[],h=hoy(),acabado=I.dn<h;
  /* 1 · relevos sin consumo */
  let H=[];try{H=huecos(I.d1,I.dn);}catch(e){}
  const nH=H.reduce((a,d)=>a+d.falta.length,0);
  out.push({id:"huecos",ok:!nH,t:nH?nH+(nH===1?" relevo sin consumo apuntado":" relevos sin consumo apuntado"):"Todos los relevos tienen consumo apuntado",
    det:nH?"Si se trabajó, falta consumo y el stock sale de más. Si estuvo parado, márcalo como «no hubo consumo».":null,
    chips:H.flatMap(d=>d.falta.map(x=>({t:(x.g?"Granalla "+x.n.replace("Nave ","N"):x.n)+" · "+diaSem(x.f)+" "+dmy(x.f)+" · "+x.t.toLowerCase(),fn:()=>pulsarHueco(x)})))});
  /* 2 · entradas sin albarán o sin foto */
  const SA=sinAlbaran().filter(x=>x.r.f>=I.d1&&x.r.f<=I.dn),SF=I.entradas.filter(x=>!x.h&&!x.r.sa&&!x.r.ft);
  out.push({id:"alb",ok:!SA.length,aviso:!SA.length&&SF.length>0,t:SA.length?SA.length+(SA.length===1?" entrada sin albarán":" entradas sin albarán")+" (kilos estimados)":"Todas las entradas tienen albarán"+(SF.length?" ("+SF.length+" sin foto)":""),
    det:SA.length?"Los kilos son estimados hasta que se completan con el albarán: la fábrica tendrá los del albarán.":SF.length?"Sin foto no se puede comprobar el albarán si hay dudas con la fábrica.":null,
    chips:SA.map(({r,l})=>({t:(l.nombre||"Coladas por saber")+" · "+dmy(r.f)+" · "+fmt(r.kg)+" kg",fn:()=>completarAlb(r,l)})).concat(SF.slice(0,8).map(x=>({t:(x.l.nombre||"?")+" · "+dmy(x.r.f)+" · sin foto",fn:()=>{try{abrirFicha(x.l.id);}catch(e){}}})))});
  /* 3 · recuentos que han movido mucho */
  const AJ=todosMovs().filter(r=>r.t==="A"&&!r.h&&r.f>=I.d1&&r.f<=I.dn&&Math.abs(+r.kg||0)>=AJ_GRANDE).sort((a,b)=>a.f.localeCompare(b.f));
  const lote=id=>lotes.find(x=>x.id===id)||{};
  out.push({id:"aj",ok:true,aviso:AJ.length>0,t:AJ.length?AJ.length+(AJ.length===1?" ajuste de recuento grande":" ajustes de recuento grandes")+" (2 fardos o más)":"Ningún recuento ha movido mucho el stock",
    det:AJ.length?"La fábrica no siempre los tiene: si su final no coincide, compara la diferencia con estos ajustes.":null,
    chips:AJ.map(r=>{const l=lote(r.o||r.d);return{t:(l.nombre||"?")+" · "+(l.nave||"")+" · "+dmy(r.f)+" · "+(r.d?"+":"−")+fmt(r.kg)+" kg",fn:()=>{try{abrirFicha(l.id);}catch(e){}}};})});
  /* coladas pesadas fardo a fardo que se han acabado con kilos sueltos */
  {const RS=typeof coladasConResto==="function"?coladasConResto():[];
   out.push({id:"resto",ok:!RS.length,t:RS.length?RS.length+(RS.length===1?" colada acabada con diferencia de peso":" coladas acabadas con diferencia de peso"):"Ninguna colada acabada con kilos sueltos",
     det:RS.length?"Sus fardos pesados no suman lo mismo que el albarán. Apunta el ajuste para dejarlas a cero; si no, el cierre no cuadra.":null,
     chips:RS.map(x=>({t:x.l.nombre+" · "+(x.kg>0?"sobran ":"faltan ")+fmt(Math.abs(x.kg))+" kg",fn:()=>ajustarResto(x)}))});}
  /* 4 · recuento de cierre */
  const RC=recuentoCierre(I),falta=RC.filter(x=>!x.hecho),[va,vb]=ventanaCierre(I);
  out.push({id:"rc",ok:!falta.length,pend:!acabado&&h<va,t:falta.length?(!acabado&&h<va?"Recuento de cierre: hazlo el "+dmy(I.dn)+" (o hasta el "+dmy(vb)+")":"Falta el recuento de cierre en "+falta.map(x=>x.nave+(x.donde==="externo"?" externo":" nave")).join(", ")):"Recuento de cierre hecho en todo",
    det:"Contar todas las coladas el último día del mes (nave y almacén externo). Ese número es el final de este mes y el inicio del siguiente, para la app y para la fábrica.",
    chips:RC.map(x=>({t:x.nave+" · "+(x.donde==="externo"?"externo":"nave")+(x.hecho?" ✓ "+dmy(x.hecho)+(x.parcial?" ("+x.parcial+")":""):" · contar"),ok:!!x.hecho,fn:()=>abrirRecuento(x.nave,x.donde)}))});
  return out;}
function bloqueAntesCierre(I){const C=checksCierre(I),mal=C.filter(c=>!c.ok&&!c.pend).length;
  return el("div",{class:"card",style:"margin:0"},[
    el("div",{class:"hd"},[el("h2",{text:"Antes de cerrar"}),el("span",{class:"der pill "+(mal?"warn":"ok"),text:mal?mal+" por revisar":"✓ Todo listo"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:12px"},C.map(c=>el("div",{class:"chk-cierre",id:"chk-"+c.id},[
      el("div",{style:"display:flex;gap:8px;align-items:flex-start"},[el("span",{class:"pill "+(c.ok&&!c.aviso?"ok":c.pend?"":"warn"),style:"flex:none",text:c.ok&&!c.aviso?"✓":c.pend?"…":"!"}),
        el("div",{style:"min-width:0"},[el("b",{text:c.t}),c.det?el("div",{class:"sub",text:c.det}):null])]),
      c.chips&&c.chips.length?el("div",{class:"hueco-chips",style:"margin:6px 0 0 34px"},c.chips.slice(0,12).map(x=>el("button",{type:"button",class:"chip",style:x.ok?"opacity:.75":null,text:x.t,onclick:x.fn})).concat(c.chips.length>12?[el("span",{class:"sub",style:"align-self:center",text:"y "+(c.chips.length-12)+" más"})]:[])):null])))]);}

/* ---------- comparar con el cierre de la fábrica ---------- */
function bloqueFabrica(I){const m=I.m,F=((cfg.fab||{})[m])||{},ed={};const filas=I.filas;
  if(!filas.length)return null;
  const num=v=>{if(v==null||v==="")return null;let t=String(v).replace(/\s|kg/gi,"");if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t))t=t.replace(/\./g,"");const n=numES(t);return isFinite(n)?n:null;};
  const app=x=>({ini:x.ini.kg,ent:x.ent.kg,con:(x.conTot||x.con).kg,fin:x.fin.kg,aju:x.aju.kg});
  const COLS=[["ini","Inicio"],["ent","Entradas"],["con","Consumo"],["fin","Final"]];
  const res=el("div",{style:"display:flex;flex-direction:column;gap:10px"});
  const pinta=()=>{res.textContent="";const G=((cfg.fab||{})[m])||{};const hay=filas.some(x=>G[key(x.nave,x.mat)]);if(!hay)return;
    filas.forEach(x=>{const f=G[key(x.nave,x.mat)];if(!f)return;const a=app(x),d={};COLS.forEach(([k])=>{d[k]=f[k]==null?null:a[k]-f[k];});
      const tol=Math.max(50,(x.ini.kg+x.ent.kg)*0.001),mal=k=>d[k]!=null&&Math.abs(d[k])>tol,ex=[];
      if(mal("ini"))ex.push("Empezáis de distinto stock ("+(d.ini>0?"la app tiene ":"la app tiene ")+fmt(Math.abs(d.ini))+" kg "+(d.ini>0?"más":"menos")+"). Viene del cierre anterior: otro inventario u otra fecha. Esa diferencia se arrastra al final.");
      if(mal("ent")){const E=I.entradas.filter(e=>e.l&&e.l.nave===x.nave&&e.l.material===x.mat);ex.push("Entradas distintas ("+(d.ent>0?"+":"−")+fmt(Math.abs(d.ent))+" kg). Comprueba los albaranes del mes: "+(E.length?E.map(e=>(e.l.nombre||"?")+" "+dmy(e.r.f)+" "+fmt(e.kg)+" kg"+(e.r.sa?" (estimado)":"")).join(" · "):"no hay entradas en la app")+".");}
      if(mal("con")){let nh=0;try{nh=huecos(I.d1,I.dn).reduce((s,dd)=>s+dd.falta.filter(z=>!z.g&&z.n===x.nave).length,0);}catch(e){}
        ex.push("Consumo distinto ("+(d.con>0?"la app tiene ":"la app tiene ")+fmt(Math.abs(d.con))+" kg "+(d.con>0?"más":"menos")+")."+(nh&&d.con<0?" Hay "+nh+(nh===1?" relevo":" relevos")+" sin consumo apuntado en "+x.nave+".":"")+(Math.abs(Math.abs(d.con)-Math.abs(a.aju))<=tol&&a.aju?" Coincide con los ajustes de recuento ("+fmt(a.aju)+" kg): puede que la fábrica los cuente como consumo.":""));}
      if(mal("fin")){const esp=(d.ini||0)+(d.ent||0)-(d.con||0);
        if(a.aju&&Math.abs(d.fin-a.aju-esp)<=tol&&!mal("ini")&&!mal("ent")&&!mal("con"))ex.push("La diferencia del final es justo la de los ajustes de recuento de la app ("+(a.aju>0?"+":"")+fmt(a.aju)+" kg): la fábrica no los tiene.");
        else if(!mal("ini")&&!mal("ent")&&!mal("con"))ex.push("Inicio, entradas y consumo coinciden pero el final no: revisa los ajustes ("+(a.aju>0?"+":"")+fmt(a.aju)+" kg en la app) y si la fábrica ha hecho otro recuento.");}
      const ok=!COLS.some(([k])=>mal(k));
      res.appendChild(el("div",{class:"banner"+(ok?"":" w"),style:"margin:0"},[el("b",{text:x.nave+" · "+MAT[x.mat].nom+(ok?": cuadra con la fábrica":": no cuadra")}),
        el("div",{class:"sub",style:"margin-top:4px",text:COLS.filter(([k])=>d[k]!=null).map(([k,t])=>t+" "+(Math.abs(d[k])<=tol?"igual":(d[k]>0?"+":"−")+fmt(Math.abs(d[k]))+" kg")).join(" · ")})].concat(ex.map(t=>el("div",{style:"margin-top:4px",text:"• "+t})))));});};
  const inp=(x,k)=>{const kk=key(x.nave,x.mat),v=(F[kk]||{})[k];return el("input",{class:"num rc-in",type:"text",inputmode:"decimal",style:"width:100%;min-width:70px","aria-label":k+" de la fábrica "+x.nave+" "+MAT[x.mat].nom,id:"fab-"+kk.replace(/[^A-Za-z0-9]/g,"")+"-"+k,value:v==null?"":String(v),oninput:e=>{(ed[kk]=ed[kk]||{})[k]=e.target.value;}});};
  const tabla=el("div",{class:"tw"},[el("table",{},[
    el("thead",{},[el("tr",{},[el("th",{text:"kg de la fábrica"})].concat(COLS.map(([k,t])=>el("th",{class:"r",text:t}))))]),
    el("tbody",{},filas.map(x=>{const a=app(x);return el("tr",{},[el("td",{},[el("span",{class:"tagm",style:"background:"+MAT[x.mat].col}),document.createTextNode(x.nave),el("div",{class:"sub",text:MAT[x.mat].nom})])]
      .concat(COLS.map(([k])=>el("td",{class:"r"},[inp(x,k),el("div",{class:"sub",text:"app "+fmt(a[k])})]))));}))])]);
  const guardar=async()=>{const G=Object.assign({},((cfg.fab||{})[m])||{});
    for(const x of filas){const kk=key(x.nave,x.mat);if(!ed[kk])continue;const o=Object.assign({},G[kk]||{});
      for(const [k] of COLS){if(!(k in ed[kk]))continue;const s=String(ed[kk][k]).trim();if(s===""){delete o[k];continue;}const n=num(s);if(n==null){toast("Número no válido en "+x.nave+" "+MAT[x.mat].nom);return;}o[k]=n;}
      if(Object.keys(o).length)G[kk]=o;else delete G[kk];}
    cfg.fab=Object.assign({},cfg.fab,{[m]:G});try{await saveCfg();toast("Cifras de la fábrica guardadas");Object.keys(ed).forEach(k=>delete ed[k]);pinta();}catch(e){toast("No se pudo guardar");}};
  pinta();
  return el("details",{class:"card",style:"margin:0",open:Object.keys(F).length>0?"":null},[
    el("summary",{class:"hd",style:"cursor:pointer"},[el("h2",{text:"Comparar con el cierre de la fábrica"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[
      el("p",{class:"hint",style:"margin:0",text:"Escribe los kilos del cierre que hacéis en la fábrica. La app dice en qué línea está la diferencia y por qué puede ser. Deja en blanco lo que no tengas."}),
      tabla,el("div",{class:"seg"},[el("button",{type:"button",class:"btn",text:"Comparar",onclick:guardar})]),res])]);}

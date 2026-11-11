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
  /* entradas con el peso de báscula distinto del albarán */
  {const BD=difBascula(I.d1,I.dn);
   out.push({id:"bas",ok:!BD.length,t:BD.length?BD.length+(BD.length===1?" entrada con la báscula distinta del albarán":" entradas con la báscula distinta del albarán"):"Báscula y albaranes coinciden"+(I.entradas.some(x=>!x.h&&typeof x.r.kb==="number")?"":" (no hay pesadas apuntadas)"),
     det:BD.length?"La fábrica cuenta los kilos del albarán. Si la báscula da menos, puede faltar material: reclámalo o apúntalo.":null,
     chips:BD.map(x=>({t:(x.l.nombre||"?")+" · "+dmy(x.r.f)+" · albarán "+fmt(x.r.kg)+" / báscula "+fmt(x.r.kb)+" ("+(x.d>0?"+":"−")+fmt(Math.abs(x.d))+")",fn:()=>{try{editarApunte(x.r);}catch(e){}}}))});}
  /* 4 · recuento de cierre */
  const RC=recuentoCierre(I),falta=RC.filter(x=>!x.hecho),[va,vb]=ventanaCierre(I);
  out.push({id:"rc",ok:!falta.length,pend:!acabado&&h<va,t:falta.length?(!acabado&&h<va?"Recuento de cierre: hazlo el "+dmy(I.dn)+" (o hasta el "+dmy(vb)+")":"Falta el recuento de cierre en "+falta.map(x=>x.nave+(x.donde==="externo"?" externo":" nave")).join(", ")):"Recuento de cierre hecho en todo",
    det:"Contar todas las coladas el último día del mes (nave y almacén externo). Ese número es el final de este mes y el inicio del siguiente, para la app y para la fábrica.",
    chips:(falta.length&&h>=va?[{t:"▶ Empezar el recuento de cierre guiado",fn:()=>recuentoGuiado(I)}]:[]).concat(RC.map(x=>({t:x.nave+" · "+(x.donde==="externo"?"externo":"nave")+(x.hecho?" ✓ "+dmy(x.hecho)+(x.parcial?" ("+x.parcial+")":""):" · contar"),ok:!!x.hecho,fn:()=>abrirRecuento(x.nave,x.donde)})))});
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

/* ---------- cuadre al estilo de la fábrica ----------
   La fábrica calcula el consumo como inicio + entradas − recuento final. Si su final del mes anterior está
   guardado (cfg.fab[mes anterior].fin), este mes se parte de ahí: con las mismas entradas y el mismo recuento
   final, el consumo sale igual por pura cuenta. La app lo desglosa: lo apuntado en las hojas, los ajustes de
   recuento (por motivo) y la diferencia de arranque (lo que la app tenía de más o de menos al empezar). */
const AJ_MOT={con:"Las hojas apuntaron mal el consumo",colada:"Se apuntó en otra colada",ent:"Error en una entrada",nose:"No se sabe",sin:"Sin motivo"};
const mesPrevDe=m=>{const y=+m.slice(0,4),mo=+m.slice(5,7)-1;return mo?y+"-"+String(mo).padStart(2,"0"):(y-1)+"-12";};
function cuadreFab(I){const P=((cfg.fab||{})[mesPrevDe(I.m)])||{};
  return I.filas.map(x=>{const f=P[key(x.nave,x.mat)];if(!f||f.fin==null)return null;
    const ini=f.fin,arr=x.ini.kg-ini,con=(x.conTot||x.con).kg,fab=ini+x.ent.kg-x.fin.kg;
    return{x,ini,arr,con,aju:x.aju.kg,fab,ajuM:x.ajuM||{}};}).filter(Boolean);}
function bloqueArrastre(I){const L=cuadreFab(I);if(!L.length)return null;const mp=mesPrevDe(I.m),nm=typeof nomMes==="function"?nomMes(mp):mp;
  const fila=(t,v,cls)=>el("div",{style:"display:flex;justify-content:space-between;gap:10px"},[el("span",{class:cls||"",text:t}),el("b",{class:"num",text:(v>0?"":v<0?"−":"")+fmt(Math.abs(Math.round(v)))+" kg"})]);
  return el("div",{class:"card",style:"margin:0"},[
    el("div",{class:"hd"},[el("h2",{text:"Consumo como lo calcula la fábrica"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:12px"},[
      el("p",{class:"hint",style:"margin:0",text:"Se parte del final de la fábrica de "+nm+". Inicio de la fábrica + entradas − lo que queda contado a fin de mes = consumo. Si la fábrica cuenta lo mismo el último día, su consumo te tiene que salir igual que este."}),
      ...L.map(c=>el("div",{class:"banner",style:"margin:0;display:flex;flex-direction:column;gap:4px"},[
        el("b",{text:c.x.nave+" · "+MAT[c.x.mat].nom+": "+fmt(Math.round(c.fab))+" kg de consumo"}),
        el("div",{class:"sub",text:"Inicio fábrica "+fmt(c.ini)+" + entradas "+fmt(Math.round(c.x.ent.kg))+" − final "+fmt(Math.round(c.x.fin.kg))+(I.dn>=hoy()?" (el de hoy: el mes no ha terminado)":"")}),
        fila("Apuntado en las hojas",c.con),
        ...Object.keys(c.ajuM).filter(k=>Math.round(c.ajuM[k])).map(k=>fila("Ajustes de recuento · "+(AJ_MOT[k]||k),-c.ajuM[k],"sub")),
        Math.round(c.arr)?fila("Diferencia de arranque (la app empezó con "+fmt(Math.abs(Math.round(c.arr)))+" kg "+(c.arr>0?"más":"menos")+")",-c.arr,"sub"):null]))])]);}

/* ---------- báscula: diferencias con el albarán (más de 50 kg y del 0,5 %) ---------- */
function difBascula(d1,dn){return todosMovs().filter(r=>r.t==="E"&&!r.h&&typeof r.kb==="number"&&typeof r.kg==="number"&&r.f>=d1&&r.f<=dn).map(r=>({r,l:lotes.find(x=>x.id===r.d)||{},d:r.kb-r.kg}))
  .filter(x=>Math.abs(x.d)>Math.max(50,x.r.kg*0.005)).sort((a,b)=>a.r.f.localeCompare(b.r.f));}

/* ---------- recuento de cierre guiado: nave 1, nave 2 y el externo, uno detrás de otro ---------- */
function pasosCierre(I){const ord={"nave":0,"externo":1};return recuentoCierre(I).slice().sort((a,b)=>ord[a.donde]-ord[b.donde]||a.nave.localeCompare(b.nave));}
function recuentoGuiado(I){const P=pasosCierre(I),pend=P.filter(x=>!x.hecho);
  if(!pend.length){toast("El recuento de cierre ya está hecho en todos los sitios");return;}
  const sig=()=>{const I2=informeMes(I.m),Q=pasosCierre(I2).filter(x=>!x.hecho);render();
    if(!Q.length){toast("Recuento de cierre completo: ya puedes cerrar el mes");return;}
    const x=Q[0],n=P.length-Q.length+1;setTimeout(()=>abrirRecuento(x.nave,x.donde,{paso:n+" de "+P.length,sig}),300);};
  const x=pend[0];abrirRecuento(x.nave,x.donde,{paso:(P.length-pend.length+1)+" de "+P.length,sig});}

/* ---------- candado del mes ---------- */
function bloqueCandado(I){const act=mesDe(hoy()),C=(cfg.candado||{})[I.m];
  if(I.m>=act&&!C)return null;
  const RC=pasosCierre(I),falta=RC.filter(x=>!x.hecho);
  const cerrar=async()=>{let ok=true;
    if(falta.length)ok=await confirmar("Falta el recuento de cierre en "+falta.map(x=>x.nave+(x.donde==="externo"?" externo":" nave")).join(", ")+". Sin él, el final de "+nomMes(I.m)+" puede no coincidir con el de la fábrica.\n\n¿Cerrar igualmente?",{titulo:"Cerrar "+nomMes(I.m),ok:"Cerrar igualmente"});
    else ok=await confirmar("Cuando "+nomMes(I.m)+" esté cerrado no se podrá apuntar, cambiar ni borrar nada con fecha de ese mes. Las correcciones se apuntan con fecha de hoy. Se puede reabrir si hace falta.",{titulo:"Cerrar "+nomMes(I.m),ok:"Cerrar el mes"});
    if(!ok)return;cfg.candado=Object.assign({},cfg.candado,{[I.m]:{ts:new Date().toISOString(),por:(window.yoNombre&&window.yoNombre())||""}});
    try{await saveCfg();toast(Mayus(nomMes(I.m))+" cerrado");render();}catch(e){toast("No se pudo guardar");}};
  const abrir=async()=>{if(!(await confirmar("Al reabrir "+nomMes(I.m)+" se podrán cambiar sus apuntes, y el cierre que pasaste a la fábrica puede dejar de coincidir. Hazlo solo para corregir un error, y vuelve a cerrarlo después.",{titulo:"Reabrir "+nomMes(I.m),ok:"Reabrir"})))return;
    const c=Object.assign({},cfg.candado);delete c[I.m];cfg.candado=c;try{await saveCfg();toast(Mayus(nomMes(I.m))+" reabierto");render();}catch(e){toast("No se pudo guardar");}};
  return el("div",{class:"banner"+(C?" ok":""),style:"margin:0;display:flex;gap:10px;align-items:center;flex-wrap:wrap"},[
    el("span",{style:"flex:1;min-width:200px"},C?[el("b",{text:"🔒 "+Mayus(nomMes(I.m))+" cerrado"}),document.createTextNode(" el "+dmyA(C.ts.slice(0,10))+(C.por?" por "+C.por:"")+". No se puede apuntar ni cambiar nada con fecha de este mes.")]
      :[el("b",{text:"Mes sin cerrar. "}),document.createTextNode(falta.length?"Antes de cerrarlo, haz el recuento de cierre ("+falta.length+" de "+RC.length+" sitios sin contar).":"El recuento de cierre está hecho: ya lo puedes cerrar.")]),
    C?el("button",{type:"button",class:"btn sec peq",text:"Reabrir",onclick:abrir}):el("button",{type:"button",class:"btn peq",id:"c-candado",text:"Cerrar el mes",onclick:cerrar})]);}

/* ---------- repaso de la semana: lo que conviene arreglar antes de que llegue el cierre ---------- */
let repSem=0;
function lunesDe(f){const d=fDate(f),w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return ymd(d);}
function vRepaso(){if(typeof huecos!=="function")return null;
  const h=hoy(),l0=lunesDe(h),d1=ymd((()=>{const d=fDate(l0);d.setDate(d.getDate()-7*repSem);return d;})()),d7=ymd((()=>{const d=fDate(d1);d.setDate(d.getDate()+6);return d;})()),dn=d7<h?d7:h;
  const it=[];
  let H=[];try{H=huecos(d1,dn);}catch(e){}const nH=H.reduce((a,d)=>a+d.falta.length,0);
  it.push({ok:!nH,t:nH?nH+(nH===1?" relevo sin consumo apuntado":" relevos sin consumo apuntado"):"Todos los relevos tienen consumo",chips:H.flatMap(d=>d.falta.map(x=>({t:(x.g?"Granalla "+x.n.replace("Nave ","N"):x.n)+" · "+diaSem(x.f)+" "+dmy(x.f)+" · "+x.t.toLowerCase(),fn:()=>pulsarHueco(x)})))});
  const AJ=todosMovs().filter(r=>r.t==="A"&&!r.h&&r.f>=d1&&r.f<=dn),sinM=AJ.filter(r=>!r.mot);
  it.push({ok:!sinM.length,t:sinM.length?sinM.length+(sinM.length===1?" ajuste sin motivo":" ajustes sin motivo"):(AJ.length?"Todos los ajustes tienen motivo":"Sin ajustes esta semana"),
    det:sinM.length?"Toca uno para decir por qué no cuadraba: así el cierre separa el consumo mal apuntado de los fardos cambiados de colada.":null,
    chips:sinM.map(r=>{const l=lotes.find(x=>x.id===(r.o||r.d))||{};return{t:(l.nombre||"?")+" · "+dmy(r.f)+" · "+(r.d?"+":"−")+fmt(r.fa||0)+" f",fn:()=>motivoAjuste(r)};})});
  /* entradas sin el peso de la báscula todavía */
  {const PB=pendBascula();it.push({ok:!PB.length,t:PB.length?PB.length+(PB.length===1?" entrada pendiente de pesar":" entradas pendientes de pesar"):"Todas las entradas tienen su peso de báscula (o no se pesan)",
    det:PB.length?"Pon el peso de la báscula de la fábrica para que el cierre compare con el albarán.":null,chips:PB.map(({r,l})=>({t:(l.nombre||"?")+" · "+dmy(r.f)+" · "+fmt(r.kg)+" kg",fn:()=>ponerBascula(r,l)}))});}
  /* camiones previstos unidos a una entrada que no es suya (otra nave o material) o dos camiones con la misma entrada */
  {const P=(cfg&&cfg.plan)||{},mal=[],usa={};Object.keys(P).forEach(m=>((P[m]||{}).entradas||[]).forEach(x=>{if(!x.rec||!x.rec.l)return;(usa[x.rec.l]=usa[x.rec.l]||[]).push({m,x});}));
   Object.values(usa).forEach(L=>L.forEach(({m,x},i)=>{const l=lotes.find(z=>z.id===x.rec.l);
     const mot=!l?"su entrada ya no existe":(x.k&&x.k!==key(l.nave,l.material))?"está unido a "+(l.nombre||"?")+" de "+etiqLinea(key(l.nave,l.material)):L.length>1&&i>0?"la entrada "+(l.nombre||"?")+" también está unida a otro camión":null;
     if(mot)mal.push({m,x,mot});}));
   it.push({ok:!mal.length,t:mal.length?mal.length+(mal.length===1?" camión unido a una entrada que no es suya":" camiones unidos a una entrada que no es suya"):"Cada camión recibido está unido a su entrada",
     det:mal.length?"Toca uno y elige con qué entrada llegó de verdad («Ya está metido»).":null,
     chips:mal.map(({m,x,mot})=>({t:dmy(x.f)+" · "+(x.k?etiqLinea(x.k):"?")+": "+mot,fn:()=>yaMetido(Object.assign({mes:m},x))}))});}
  /* fardos pendientes de etiqueta con más de una semana */
  {const PV=pendientesEt().filter(r=>r.f<fMas(hoy(),-7));
   it.push({ok:!PV.length,t:PV.length?PV.length+(PV.length===1?" fardo pendiente de etiqueta":" fardos pendientes de etiqueta")+" desde hace más de una semana":"Ningún fardo lleva más de una semana sin etiqueta",
     det:PV.length?"Mira si ya han pegado la etiqueta en la hoja de ese relevo o si se ha perdido, y ciérralo.":null,
     chips:PV.map(r=>({t:nomLote(r.o)+" · "+relTxt(r)+" · "+fmt(r.fa)+" f",fn:()=>dlgPend(r)}))});}
  /* en qué línea se abre diferencia: ajustes frente al consumo apuntado */
  const L={};todosMovs().filter(r=>!r.h&&r.f>=d1&&r.f<=dn&&(r.t==="C"||r.t==="A")).forEach(r=>{const l=lotes.find(x=>x.id===(r.o||r.d));if(!l)return;const k=key(l.nave,l.material),x=L[k]=L[k]||{n:l.nave,m:l.material,c:0,a:0,fifo:0};
    const kg=Math.abs(typeof r.kg==="number"?r.kg:(r.fa||0)*((saldos()[l.id]||{}).ratio||0));if(r.t==="C"){x.c+=kg;if(/Fuera de FIFO/.test(r.n||""))x.fifo++;}else x.a+=r.d?kg:-kg;});
  const Ls=Object.values(L),malL=Ls.filter(x=>x.c&&Math.abs(x.a)/x.c>0.02);
  it.push({ok:!malL.length,t:malL.length?"Se abre diferencia en "+malL.map(x=>x.n+" "+MAT[x.m].nom).join(", "):"Ninguna línea se desvía más del 2 %",
    det:Ls.map(x=>x.n+" "+MAT[x.m].nom+": consumo "+fmt(Math.round(x.c))+" kg · ajustes "+(x.a>0?"+":x.a<0?"−":"")+fmt(Math.abs(Math.round(x.a)))+" kg"+(x.c?" ("+(Math.round(Math.abs(x.a)/x.c*1000)/10).toString().replace(".",",")+" %)":"")+(x.fifo?" · "+x.fifo+" fuera de FIFO":"")).join(" · ")||null});
  {const RS=typeof coladasConResto==="function"?coladasConResto():[];it.push({ok:!RS.length,t:RS.length?RS.length+(RS.length===1?" colada acabada con kilos sueltos":" coladas acabadas con kilos sueltos"):"Ninguna colada acabada con kilos sueltos",
    chips:RS.map(x=>({t:x.l.nombre+" · "+(x.kg>0?"sobran ":"faltan ")+fmt(Math.abs(x.kg))+" kg",fn:()=>ajustarResto(x)}))});}
  {const SA=(typeof sinAlbaran==="function"?sinAlbaran():[]).filter(x=>x.r.f>=d1&&x.r.f<=dn),BD=difBascula(d1,dn);
   it.push({ok:!SA.length&&!BD.length,t:SA.length||BD.length?[SA.length?SA.length+" sin albarán":null,BD.length?BD.length+" con la báscula distinta del albarán":null].filter(Boolean).join(" · ")+" en las entradas":"Entradas con albarán y sin diferencias de báscula",
     chips:SA.map(({r,l})=>({t:(l.nombre||"?")+" · "+dmy(r.f)+" · sin albarán",fn:()=>completarAlb(r,l)})).concat(BD.map(x=>({t:(x.l.nombre||"?")+" · báscula "+(x.d>0?"+":"−")+fmt(Math.abs(x.d))+" kg",fn:()=>{try{editarApunte(x.r);}catch(e){}}})))});}
  const mal=it.filter(x=>!x.ok).length;
  return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Repaso de la semana"}),el("span",{class:"der pill "+(mal?"warn":"ok"),text:mal?mal+" por revisar":"✓ Todo en orden"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:12px"},[
      el("div",{class:"seg"},[["0","Esta semana"],["1","La pasada"]].map(([v,t])=>el("button",{type:"button","aria-pressed":String(String(repSem)===v),text:t,onclick:()=>{repSem=+v;render();}}))),
      el("p",{class:"hint",style:"margin:0",text:"Del "+dmyA(d1)+" al "+dmyA(dn)+". Dos minutos cada lunes: lo que se arregla en la semana no llega descuadrado al cierre."}),
      ...it.map(c=>el("div",{class:"chk-cierre"},[el("div",{style:"display:flex;gap:8px;align-items:flex-start"},[el("span",{class:"pill "+(c.ok?"ok":"warn"),style:"flex:none",text:c.ok?"✓":"!"}),
        el("div",{style:"min-width:0"},[el("b",{text:c.t}),c.det?el("div",{class:"sub",text:c.det}):null])]),
        c.chips&&c.chips.length?el("div",{class:"hueco-chips",style:"margin:6px 0 0 34px"},c.chips.slice(0,12).map(x=>el("button",{type:"button",class:"chip",text:x.t,onclick:x.fn})).concat(c.chips.length>12?[el("span",{class:"sub",style:"align-self:center",text:"y "+(c.chips.length-12)+" más"})]:[])):null]))])]);}
/* poner el motivo a un ajuste ya guardado */
function motivoAjuste(r){const l=lotes.find(x=>x.id===(r.o||r.d))||{};let v=r.mot||"con";
  const sl=el("select",{id:"aj-mot","aria-label":"Motivo",onchange:e=>{v=e.target.value;}},Object.keys(AJ_MOT).filter(k=>k!=="sin").map(k=>{const o=el("option",{value:k,text:AJ_MOT[k]});if(k===v)o.selected=true;return o;}));
  const cerrar=()=>ov.remove();
  const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)cerrar();}},[el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"Motivo del ajuste"},[
    el("h3",{text:"¿Por qué no cuadraba?"}),el("p",{class:"sub",text:(l.nombre||"?")+" · "+(l.nave||"")+" · "+dmy(r.f)+" · "+(r.d?"sobraban ":"faltaban ")+fmt(r.fa||0)+" f"}),el("label",{text:"Motivo"},[sl]),
    el("div",{class:"dlg-b"},[el("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:cerrar}),el("button",{type:"button",class:"btn",text:"Guardar",onclick:async e=>{e.currentTarget.disabled=true;
      try{await guardarMov(r,Object.assign({},r,{mot:v}));cerrar();toast("Motivo guardado");render();}catch(x){e.currentTarget.disabled=false;if(!x.candado)toast("No se pudo guardar");}}})])])]);
  document.body.appendChild(ov);}

/* ===== CONTADORES DE ACEITE Y GLICOL =====
   En cada nave hay 4 grifos con contador (Engrase 220, Térmico, Prensa, ISO 46) y un contador general de glicol.
   Se apunta la lectura cada día laborable; los litros consumidos son la diferencia con la lectura anterior.
   Guardado en la colección «cont» (un documento por año, items {id,f,nave,c:{e220,ter,pre,i46,gli},grg:{k:{ab}},por,ts}). No toca el stock. */
const CONT=[["e220","Engrase 220"],["ter","Térmico"],["pre","Prensa"],["i46","ISO 46"],["gli","Glicol"]];
const NAVES_CT=["Nave 1","Nave 2"];
const CONT_GRG=CONT.filter(c=>c[0]!=="gli");
let contAnos={};
function todasLect(){const o=[];Object.keys(contAnos).forEach(y=>(contAnos[y]||[]).forEach(r=>{if(!r.dep)o.push(Object.assign({y},r));}));return o.sort((a,b)=>(a.f+String(a.ts||0).padStart(15,"0")).localeCompare(b.f+String(b.ts||0).padStart(15,"0")));}
const lectDe=n=>todasLect().filter(r=>r.nave===n);
/* depósito de glicol (uno para las dos naves, lo recarga una cisterna): items {id,f,dep:"gli",tipo:"recarga"|"nivel",l,antes,despues,n,alb,nota,ts} */
function todosDep(){const o=[];Object.keys(contAnos).forEach(y=>(contAnos[y]||[]).forEach(r=>{if(r.dep)o.push(Object.assign({y},r));}));return o.sort((a,b)=>(a.f+String(a.ts||0).padStart(15,"0")).localeCompare(b.f+String(b.ts||0).padStart(15,"0")));}
/* tramos entre dos lecturas seguidas de un contador: litros, días laborables y litros por día */
function tramos(n,k){const L=lectDe(n).filter(r=>r.c&&typeof r.c[k]==="number");const out=[];
  for(let i=1;i<L.length;i++){const a=L[i-1],b=L[i],dif=Math.round((b.c[k]-a.c[k])*10)/10,lab=Math.max(1,laborables(a.f,b.f));out.push({n,k,f0:a.f,f:b.f,dif,lab,lpd:dif/lab,por:b.por||"",r:b});}
  out.forEach((t,i)=>{const prev=out.slice(Math.max(0,i-20),i).filter(x=>x.dif>=0).map(x=>x.lpd).sort((x,y)=>x-y);const med=prev.length?prev[Math.floor(prev.length/2)]:null;
    t.normal=med;t.raro=t.dif<0?"baja":(prev.length>=5&&med!=null&&t.lpd>Math.max(med*2,med+20)&&t.dif>10)?"alto":"";});
  return out;}
const nomCont=k=>(CONT.find(c=>c[0]===k)||[k,k])[1];
const fmtL=v=>(Math.round(v*10)/10).toLocaleString("es-ES")+" l";
const faltaLectHoy=()=>{const h=hoy(),w=new Date(h+"T12:00:00").getDay();if(w===0||w===6)return[];return NAVES_CT.filter(n=>lectDe(n).length&&!lectDe(n).some(r=>r.f===h));};
function rarosCont(dias){const lim=sumaDias(hoy(),-(dias||7)),o=[];NAVES_CT.forEach(n=>CONT.forEach(([k])=>tramos(n,k).forEach(t=>{if(t.raro&&t.f>=lim)o.push(t);})));return o;}

async function guardaLect(rec,viejo){const y=rec.f.slice(0,4);rec.id=rec.id||uid();rec.ts=Date.now();
  if(viejo){if(db.itemsDelId)await db.itemsDelId("cont",viejo.y||viejo.f.slice(0,4),[viejo.id]);else{const r0=db.doc("cont/"+(viejo.y||viejo.f.slice(0,4))),s0=await r0.get();if(s0.exists)await r0.set({items:(s0.data().items||[]).filter(x=>x.id!==viejo.id)});}}
  if(db.itemsAdd){await db.itemsAdd("cont",y,[rec]);return;}
  const ref=db.doc("cont/"+y),sn=await ref.get();await ref.set({items:(sn.exists?(sn.data().items||[]):[]).concat([rec])});}

/* apuntar las lecturas de una nave (o corregir las de un día) */
function formLect(nave0,f0){const f={f:f0||hoy(),nave:nave0||(faltaLectHoy()[0]||NAVES_CT[0]),v:{}};
  const box=el("div",{style:"display:grid;gap:10px"});
  const pinta=()=>{box.textContent="";const L=lectDe(f.nave),esta=L.find(r=>r.f===f.f),ant=L.filter(r=>r.f<f.f).pop();
    if(esta&&!f.cargada){CONT.forEach(([k])=>{if(typeof esta.c[k]==="number")f.v[k]=String(esta.c[k]).replace(".",",");});f.cargada=true;}
    box.appendChild(el("div",{class:"seg",role:"group","aria-label":"Nave"},NAVES_CT.map(n=>{const b=el("button",{type:"button","aria-pressed":String(f.nave===n),text:n});b.onclick=()=>{f.nave=n;f.v={};f.cargada=false;f.g={};f.gcarg=false;pinta();};return b;})));
    box.appendChild(el("p",{class:"hint",style:"margin:0",text:ant?"Lectura anterior: "+fmtF(ant.f)+(ant.por?" ("+ant.por+")":"")+". Escribe lo que marca ahora cada contador.":"Primera lectura de "+f.nave+": a partir de la siguiente ya se calculan los litros."}));
    if(esta)box.appendChild(el("div",{class:"banner w",text:"Ya hay lectura de "+f.nave+" el "+fmtF(f.f)+": si guardas, se corrige."}));
    CONT.forEach(([k,nom])=>{const pv=ant&&typeof ant.c[k]==="number"?ant.c[k]:null;const out=el("div",{class:"sub",style:"min-height:18px"});
      const calc=()=>{const x=parseN(f.v[k]);out.textContent="";out.className="sub";if(!(isFinite(x)&&f.v[k]!==""&&f.v[k]!=null)||pv==null)return;const d=Math.round((x-pv)*10)/10,lab=Math.max(1,laborables(ant.f,f.f));
        const T=tramos(f.nave,k).filter(t=>t.dif>=0).slice(-20).map(t=>t.lpd).sort((a,b)=>a-b),med=T.length?T[Math.floor(T.length/2)]:null;
        if(d<0){out.textContent="Marca menos que antes ("+fmtN(pv)+"): ¿error al leer o contador cambiado?";out.className="sub neg";return;}
        out.textContent="= "+fmtL(d)+(lab>1?" en "+lab+" días ("+fmtL(d/lab)+"/día)":"")+(med!=null&&T.length>=5&&d/lab>Math.max(med*2,med+20)&&d>10?" · mucho más de lo normal ("+fmtL(med)+"/día)":"");
        if(med!=null&&T.length>=5&&d/lab>Math.max(med*2,med+20)&&d>10)out.className="sub neg";};
      const i=inp("ct"+k,f.v[k]||"",v=>{f.v[k]=v;calc();},{inputmode:"decimal",class:"num",autocomplete:"off",placeholder:pv!=null?fmtN(pv):"lectura"});
      box.appendChild(fld(nom+(pv!=null?" · antes "+fmtN(pv):""),el("div",{style:"display:grid;gap:2px"},[i,out])));calc();});
    /* GRG: cambio del de arriba (nivel del de abajo) o solo apuntar cuánto hay (arriba y abajo), p. ej. el primer día */
    if(esta&&esta.grg&&!f.gcarg){f.g={};Object.keys(esta.grg).forEach(k=>{const g=esta.grg[k];f.g[k]={m:g.ar!=null?"n":"c",ab:String(g.ab).replace(".",","),ar:g.ar!=null?String(g.ar).replace(".",","):""};});f.gcarg=true;}
    f.g=f.g||{};
    if(f.nave!==NAVE_GRG){box.appendChild(el("p",{class:"hint",style:"margin:0",text:"Los GRG de aceite están en la "+NAVE_GRG+": los cambios y el nivel de los GRG se apuntan en las lecturas de la "+NAVE_GRG+"."}));return;}
    const gb=el("div",{class:"card",style:"padding:10px 12px;display:grid;gap:8px"});
    const sinNivel=CONT_GRG.filter(([k])=>!notasGRG(k).length);
    gb.appendChild(el("div",{class:"sub",style:"font-weight:600",text:"GRG (están en la "+NAVE_GRG+" y sirven a las dos naves): ¿se ha cambiado alguno o quieres apuntar cuánto hay?"}));
    if(sinNivel.length&&!Object.keys(f.g).length)gb.appendChild(el("p",{class:"hint",style:"margin:0",text:"Primera vez: toca cada aceite, elige «Solo apunto el nivel» y pon lo que hay arriba y abajo. Así el cotejo es exacto desde hoy."}));
    gb.appendChild(el("div",{class:"chips",style:"flex-wrap:wrap;overflow:visible"},CONT_GRG.map(([k,nom])=>el("button",{type:"button",class:"chip","aria-pressed":String(f.g[k]!=null),text:nom,onclick:()=>{if(f.g[k]!=null)delete f.g[k];else f.g[k]={m:sinNivel.some(c=>c[0]===k)?"n":"c",ab:"",ar:""};pinta();}}))));
    const nivel=(k,campo,lab,cap)=>{const g=f.g[k];const i=inp("ctG"+campo+k,g[campo],v=>{g[campo]=v;},{inputmode:"decimal",class:"num",autocomplete:"off",placeholder:"litros"});
      return fld(lab,el("div",{style:"display:grid;gap:6px"},[i,el("div",{class:"chips",style:"flex-wrap:wrap;overflow:visible"},[["Lleno",1],["¾",.75],["½",.5],["¼",.25]].concat(campo==="ar"?[["Vacío",0]]:[]).map(([t,x])=>el("button",{type:"button",class:"chip",text:t,onclick:()=>{g[campo]=String(Math.round(cap*x));i.value=g[campo];}})))]));};
    CONT_GRG.filter(([k])=>f.g[k]!=null).forEach(([k,nom])=>{const cap=cfgCot(k).cap,g=f.g[k];
      const w=el("div",{style:"display:grid;gap:8px;border-top:1px solid var(--line);padding-top:8px"},[el("div",{class:"sub",style:"font-weight:600",text:nom}),
        el("div",{class:"seg",role:"group"},[["c","Se ha cambiado"],["n","Solo apunto el nivel"]].map(([m,t])=>{const b=el("button",{type:"button","aria-pressed":String(g.m===m),text:t});b.onclick=()=>{g.m=m;pinta();};return b;}))]);
      if(g.m==="n")w.appendChild(nivel(k,"ar","GRG de arriba",cap));
      w.appendChild(nivel(k,"ab","GRG de abajo",cap));gb.appendChild(w);});
    if(Object.keys(f.g).length)gb.appendChild(el("p",{class:"hint",style:"margin:0",text:"Mira la escala del lateral de cada GRG. Si se ha cambiado, solo hace falta el de abajo (el de arriba se cambia vacío)."}));
    box.appendChild(gb);};
  pinta();
  dlg("Lectura de contadores",[fld("Fecha",inp("ctF",f.f,v=>{f.f=v;f.cargada=false;f.v={};f.g={};f.gcarg=false;pinta();},{type:"date",max:hoy()})),box],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const c={};let n=0;for(const [k,nom] of CONT){const s=String(f.v[k]==null?"":f.v[k]).trim();if(!s)continue;const x=parseN(s);if(!isFinite(x)||x<0){toast("Lectura no válida en "+nom);return false;}c[k]=x;n++;}
      if(!n){toast("Escribe al menos una lectura");return false;}
      const grg={};for(const k of Object.keys(f.g||{})){const g=f.g[k],cap=cfgCot(k).cap,lee=v=>{const t=String(v==null?"":v).trim(),x=parseN(t);return t===""||!isFinite(x)||x<0||x>cap*1.2?null:x;};
        const ab=lee(g.ab);if(ab==null){toast("Pon cuánto tiene el GRG de abajo de "+nomCont(k)+" (en litros)");return false;}grg[k]={ab};
        if(g.m==="n"){const ar=lee(g.ar);if(ar==null){toast("Pon cuánto tiene el GRG de arriba de "+nomCont(k)+" (en litros)");return false;}grg[k].ar=ar;}}
      const esta=lectDe(f.nave).find(r=>r.f===f.f),rec={f:f.f,nave:f.nave,c};if(Object.keys(grg).length)rec.grg=grg;try{await guardaLect(rec,esta);}catch(e){toast("No se pudo guardar");return false;}
      toast("Lecturas de "+f.nave+" guardadas");const otra=faltaLectHoy().filter(x=>x!==f.nave)[0];if(otra&&f.f===hoy())setTimeout(()=>confirmar("¿Seguimos con "+otra+"?","Falta apuntar hoy los contadores de "+otra+".","Apuntar "+otra,()=>formLect(otra)),400);render(true);}}]);}

/* tarjeta en Aceites, taladrinas y jabones */
function cardContadores(){const h=hoy(),m0=h.slice(0,7)+"-01",falta=faltaLectHoy(),R=rarosCont(7);
  const filas=[];NAVES_CT.forEach(n=>{const L=lectDe(n),u=L[L.length-1];
    CONT.forEach(([k,nom])=>{const T=tramos(n,k),t=T[T.length-1],mes=T.filter(x=>x.f>=m0&&x.dif>0).reduce((s,x)=>s+x.dif,0);
      filas.push([n,nom,u&&typeof u.c[k]==="number"?fmtN(u.c[k]):"—",t?(t.dif<0?"¿?":fmtL(t.dif)+(t.lab>1?" ("+t.lab+" d)":"")):"—",mes?fmtL(mes):"—",t&&t.raro?(t.raro==="baja"?"⚠ baja":"⚠ alto"):""]);});});
  const ult=n=>{const L=lectDe(n),u=L[L.length-1];return u?fmtF(u.f)+(u.f===h?" (hoy)":""):"nunca";};
  return el("section",{class:"card"+(R.length?" alerta":"")},[el("div",{class:"hd"},[el("h2",{text:"Contadores de aceite y glicol"}),el("span",{class:"der sub",text:NAVES_CT.map(n=>n.replace("Nave ","N")+": "+ult(n)).join(" · ")})]),
    el("div",{class:"bd",style:"display:grid;gap:10px"},[
      falta.length?el("div",{class:"banner w",text:"Falta la lectura de hoy de "+falta.join(" y ")+"."}):null,
      R.length?el("div",{class:"banner b",text:"Consumo raro: "+R.map(t=>nomCont(t.k)+" "+t.n+" el "+fmtF(t.f)+" ("+(t.raro==="baja"?"el contador marca menos que antes":fmtL(t.lpd)+"/día, lo normal "+fmtL(t.normal)+"/día")+")").join(" · ")}):null,
      (()=>{const CR=cotejoResumen();return CR.length?el("div",{class:"banner "+(CR.some(x=>x.niv==="bad")?"b":"w"),text:CR.map(x=>x.t).join(" · ")}):null;})(),
      el("div",{class:"acciones acc2"},[el("button",{type:"button",class:"btn",text:"Apuntar lecturas",onclick:()=>formLect()}),el("button",{type:"button",class:"btn sec",text:"Informe y gráficas",onclick:()=>informeCont()}),el("button",{type:"button",class:"btn sec",text:"Cotejo con los cambios",onclick:()=>dlg("Cotejo con los cambios de GRG",[cotejoUI()],[{t:"Cerrar",cls:"sec"}])}),el("button",{type:"button",class:"btn sec",text:"Recarga de glicol",onclick:()=>formGli()})]),
      cTabla(["Nave","Contador","Última lectura","Último consumo","Este mes",""],filas,[2,3,4])])]);}

/* informe: litros por día y por mes, por nave y contador */
function informeCont(){const st=draft.ict=draft.ict||{nave:"Nave 1",k:"todos"};const box=el("div",{style:"display:grid;gap:12px"});
  const pinta=()=>{box.textContent="";
    box.appendChild(el("div",{class:"seg",role:"group"},NAVES_CT.concat(["Las dos"]).map(n=>{const b=el("button",{type:"button","aria-pressed":String(st.nave===n),text:n});b.onclick=()=>{st.nave=n;pinta();};return b;})));
    box.appendChild(el("div",{class:"chips"},[["todos","Todos"]].concat(CONT).map(([k,nom])=>el("button",{type:"button",class:"chip","aria-pressed":String(st.k===k),text:nom,onclick:()=>{st.k=k;pinta();}}))));
    const ns=st.nave==="Las dos"?NAVES_CT:[st.nave],ks=st.k==="todos"?CONT.map(c=>c[0]):[st.k];const T=[];ns.forEach(n=>ks.forEach(k=>tramos(n,k).forEach(t=>{if(t.dif>=0)T.push(t);})));
    if(!T.length){box.appendChild(el("p",{class:"hint",text:"Todavía no hay dos lecturas seguidas para calcular consumos."}));return;}
    const meses=[];for(let i=11;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);meses.push(d.toISOString().slice(0,7));}
    const porMes=meses.map(m=>T.filter(t=>t.f.slice(0,7)===m).reduce((s,t)=>s+t.dif,0));
    box.appendChild(el("div",{},[el("div",{class:"sub",text:"Litros por mes · "+(st.k==="todos"?"todos los contadores":nomCont(st.k))+" · "+st.nave}),barras(meses,porMes,v=>Math.round(v)+"")]));
    const h=hoy(),mes=h.slice(0,7),tot=CONT.filter(([k])=>ks.includes(k)).map(([k,nom])=>{const L=T.filter(t=>t.k===k);const m=L.filter(t=>t.f.slice(0,7)===mes).reduce((s,t)=>s+t.dif,0),d30=L.filter(t=>t.f>=sumaDias(h,-30));
      const dl=d30.reduce((s,t)=>s+t.dif,0),dd=d30.reduce((s,t)=>s+t.lab,0);return[nom,fmtL(m),dd?fmtL(dl/dd):"—",fmtL(L.reduce((s,t)=>s+t.dif,0))];});
    box.appendChild(cTabla(["Contador","Este mes","Media por día (30 d)","Total apuntado"],tot,[1,2,3]));
    const dias=[...new Set(T.map(t=>t.f))].sort().reverse().slice(0,40);
    box.appendChild(el("div",{},[el("div",{class:"sub",text:"Por día (lo consumido desde la lectura anterior)"}),cTabla(["Fecha"].concat(ns.length>1?["Nave"]:[]).concat(CONT.filter(([k])=>ks.includes(k)).map(c=>c[1])),
      [].concat(...dias.map(f=>ns.map(n=>{const fila=[fmtF(f)].concat(ns.length>1?[n]:[]).concat(CONT.filter(([k])=>ks.includes(k)).map(([k])=>{const t=T.find(x=>x.f===f&&x.n===n&&x.k===k);return t?fmtL(t.dif)+(t.raro?" ⚠":""):"";}));return fila;}))).filter(fl=>fl.slice(ns.length>1?2:1).some(Boolean)),
      CONT.map((_,i)=>i+(ns.length>1?2:1)))]));
    box.appendChild(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec",text:"Excel",onclick:e=>excelCont(e.currentTarget)}),el("button",{type:"button",class:"btn sec",text:"Corregir una lectura",onclick:()=>{cerrarDlgs();formLect(ns[0],todasLect().filter(r=>ns.includes(r.nave)).map(r=>r.f).pop());}})]));};
  pinta();dlg("Consumo de aceite y glicol",[box],[{t:"Cerrar",cls:"sec"}]);}
async function excelCont(btn){if(!downloads){toast("Esta vista no permite descargar archivos");return;}btn.disabled=true;
  try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();
    X.utils.book_append_sheet(wb,X.utils.json_to_sheet(todasLect().map(r=>Object.assign({Fecha:r.f,Nave:r.nave},Object.fromEntries(CONT.map(([k,n])=>[n,typeof r.c[k]==="number"?r.c[k]:""])),{Quién:r.por||""}))),"Lecturas");
    const T=[];NAVES_CT.forEach(n=>CONT.forEach(([k])=>tramos(n,k).forEach(t=>T.push({Desde:t.f0,Hasta:t.f,Nave:n,Contador:nomCont(k),Litros:t.dif,"Días laborables":t.lab,"Litros por día":Math.round(t.lpd*10)/10,Aviso:t.raro==="baja"?"El contador baja":t.raro==="alto"?"Mucho más de lo normal":""}))));
    X.utils.book_append_sheet(wb,X.utils.json_to_sheet(T.length?T:[{Desde:"Sin datos"}]),"Consumos");
    await downloads.save({filename:"Contadores_aceite_"+hoy()+".xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Excel descargado");}
  catch(e){toast(e&&e.code==="declined"?"Descarga cancelada":"No se pudo crear el Excel");}btn.disabled=false;}
/* para Consultas: cada tramo es un «consumo» con litros */
const evCont=()=>{const o=[];NAVES_CT.forEach(n=>CONT.forEach(([k,nom])=>tramos(n,k).forEach(t=>{if(t.dif<0)return;o.push({f:t.f,ts:t.r.ts||0,maq:null,nave:n,ref:nom,cant:t.dif,ud:"l",eur:0,quien:t.por,txt:t.raro?"Consumo raro":"",det:t.lab>1?"en "+t.lab+" días laborables":"",fam:"Contadores"});})));return o;};

/* ===== COTEJO: cambios de GRG/bidón (salidas del almacén) frente a lo que marcan los contadores =====
   Cada cambio mete un GRG en el grifo; lo que marcan los contadores hasta el siguiente cambio tendría que ser lo que traía (en litros).
   Cada contador va unido a un artículo y a una densidad (kg por litro) que se pueden cambiar en «Ajustes del cotejo». */
const DENS0={e220:0.89,ter:0.87,pre:0.80,i46:0.87,gli:1.06};
const ART_RE={e220:/\b(iso\s*220|engrase)\b/i,ter:/t[eé]rmico/i,pre:/prensa/i,i46:/\b46\b/,gli:/glicol/i};
function cfgCot(k){const c=((cat.contCfg||{})[k])||{};const art0=c.art!==undefined?c.art:((artsActivos().find(a=>ART_RE[k].test(a.desc))||{}).id||null);return{art:art0,dens:+c.dens>0?+c.dens:DENS0[k],cap:+c.cap>0?+c.cap:1000};}
/* En cada grifo hay dos GRG: el de arriba (el que se cambia, siempre vacío) y el de abajo (siempre puesto, del que se consume).
   Al cambiar el de arriba se apunta en la lectura cuánto tiene el de abajo (rec.grg[k]={ab:litros}).
   Gastado entre dos cambios = lo que traía el nuevo + lo que tenía abajo en el cambio − lo que tiene abajo en el cambio siguiente. */
const msD=x=>Date.parse(x+"T12:00:00");
/* los GRG de los aceites están todos en la Nave 2 y dan servicio a las dos naves: un apunte por día (el último) */
const NAVE_GRG="Nave 2";
function notasGRG(k){const o={};todasLect().forEach(r=>{const g=r.grg&&r.grg[k];if(g&&typeof g.ab==="number")o[r.f]={f:r.f,nave:null,ab:g.ab,ar:typeof g.ar==="number"?g.ar:null,r};});return Object.values(o).sort((a,b)=>a.f.localeCompare(b.f));}
function cotejo(k){const C=cfgCot(k);const N=notasGRG(k),usada=new Set();
  const cam=(C.art?todosMov().filter(m=>m.tipo==="salida"&&m.art===C.art&&m.f):[]).map(m=>{const nv=String(m.nota||"").match(/\bnave\s*(1a|1b|1|2)\b/i);return{f:m.f,kg:+m.cant||0,l:(+m.cant||0)/C.dens,nave:null,m};}).sort((a,b)=>a.f.localeCompare(b.f));
  /* une cada cambio del almacén con la nota de la lectura (misma nave si se sabe, hasta 3 días de diferencia) */
  N.filter(x=>x.ar!=null).forEach(x=>usada.add(x));
  cam.forEach(c=>{const cand=N.filter(x=>!usada.has(x)&&x.ar==null&&(!c.nave||x.nave===c.nave)&&Math.abs(msD(x.f)-msD(c.f))<=3*864e5).sort((a,b)=>Math.abs(msD(a.f)-msD(c.f))-Math.abs(msD(b.f)-msD(c.f)))[0];
    if(cand){usada.add(cand);c.ab=cand.ab;c.nave=c.nave||cand.nave;c.fl=cand.f;}});
  const sueltas=N.filter(x=>!usada.has(x));
  /* «solo apunto el nivel»: punto de control con lo que hay arriba y abajo (no es un cambio) */
  N.filter(x=>x.ar!=null).forEach(x=>cam.push({f:x.f,fl:x.f,nave:x.nave,ab:x.ab,ar:x.ar,l:x.ar,kg:null,nivel:true}));cam.sort((a,b)=>(a.fl||a.f).localeCompare(b.fl||b.f));
  const conL=NAVES_CT.filter(nv=>lectDe(nv).some(r=>r.c&&typeof r.c[k]==="number"));
  const lit=(n,d0,d1)=>{const ns=n?[n]:conL;let s=0,cub=ns.length>0;ns.forEach(nv=>{const T=tramos(nv,k);const L=lectDe(nv).filter(r=>typeof r.c[k]==="number");if(!L.length||L[0].f>d0)cub=false;
    T.forEach(t=>{if(!(t.dif>0))return;const a=Math.max(msD(t.f0),msD(d0)),z=Math.min(msD(t.f),d1?msD(d1):Infinity),tot=msD(t.f)-msD(t.f0);if(z<=a||tot<=0)return;s+=t.dif*(z-a)/tot;});});return{s,cub};};
  const iv=cam.map((c,i)=>{const sig=cam.slice(i+1).find(x=>!c.nave||!x.nave||x.nave===c.nave);const d0=c.fl||c.f,d1=sig?(sig.fl||sig.f):null,r=lit(c.nave,d0,d1);
    /* lo que había al empezar (arriba + abajo) − lo que había al llegar al siguiente (abajo, y arriba si es un punto de control); si falta el de abajo, se supone igual */
    const exacto=!!sig&&c.ab!=null&&sig.ab!=null,abI=c.ab!=null?c.ab:(sig&&sig.ab!=null?sig.ab:0),abJ=sig?(sig.ab!=null?sig.ab:abI):0;
    const esp=sig?c.l+abI-((sig.nivel?sig.ar:0)+abJ):null,des=sig?r.s-esp:null;
    return Object.assign({},c,{hasta:sig?sig.f:null,cont:r.s,cub:r.cub,esp,exacto,des,pct:sig&&esp?Math.round(des/esp*100):null,queda:sig?null:Math.max(0,c.l-r.s)});});
  /* acumulado desde el primer cambio con lecturas hasta el último cerrado: se va diluyendo el error del GRG de abajo */
  const cer=iv.filter(x=>x.hasta&&x.cub);let acu=null;
  if(cer.length>=2){const p=cer[0],u=cer[cer.length-1];const esp=cer.reduce((t,x)=>t+x.esp,0),cont=cer.reduce((t,x)=>t+x.cont,0);acu={n:cer.length,desde:p.f,hasta:u.hasta,esp,cont,des:cont-esp,pct:esp?Math.round((cont-esp)/esp*100):0,exacto:cer.every(x=>x.exacto)};}
  /* aviso: con el nivel de abajo apuntado basta un cambio; sin él, dos cambios seguidos con el mismo desfase, o el acumulado */
  const malos=[];cer.forEach((x,i)=>{if(Math.abs(x.pct)<10)return;if(x.exacto)malos.push(x);else{const y=cer[i-1];if(y&&!y.exacto&&Math.abs(y.pct)>=10&&Math.sign(y.pct)===Math.sign(x.pct))malos.push(x);}});
  const acuMal=acu&&Math.abs(acu.pct)>=10&&(acu.exacto||acu.n>=5);
  return{C,cambios:cam,iv,acu,malos,acuMal,sueltas};}
function cotejoUI(){const box=el("div",{style:"display:grid;gap:10px"});
  CONT_GRG.forEach(([k,nom])=>{const R=cotejo(k);const a=R.C.art?art(R.C.art):null;
    const filas=R.iv.slice(-6).reverse().map(x=>[fmtF(x.f)+(x.nave?" · "+x.nave:"")+(x.nivel?" · nivel":""),x.nivel?"arriba "+fmtL(x.ar)+" · abajo "+fmtL(x.ab):fmtN(Math.round(x.kg))+" kg ≈ "+fmtL(x.l)+(x.ab!=null?" · abajo "+fmtL(x.ab):""),x.cub?fmtL(x.cont):"sin lecturas",
      x.hasta?(x.cub?(x.des>=0?"+":"")+fmtL(x.des)+" ("+(x.pct>0?"+":"")+x.pct+" %)"+(x.exacto?"":" aprox."):"—"):(x.cub?"en uso · quedan arriba ≈ "+fmtL(x.queda):"en uso")]);
    const A=R.acu;
    box.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:nom}),el("span",{class:"der sub",text:a?nomArt(a)+" · "+R.C.dens+" kg/l":"sin artículo unido"})]),
      el("div",{class:"bd",style:"display:grid;gap:8px"},[!a?el("p",{class:"hint",style:"margin:0",text:"Une este contador con su artículo en «Ajustes del cotejo» para poder comparar."}):!R.iv.length?el("p",{class:"hint",style:"margin:0",text:"Todavía no hay ningún cambio de "+nomArt(a)+" ni ningún nivel apuntado."}):null,
        R.malos.length||R.acuMal?el("div",{class:"banner b",text:(R.malos.length?"Desfase de más del 10 % en "+R.malos.length+(R.malos.length===1?" cambio":" cambios"):"El acumulado se desvía un "+A.pct+" %")+": revisa si se apuntó bien el cambio o si hay una fuga o un contador que no marca."}):null,
        R.sueltas.length?el("div",{class:"banner w",text:"Hay "+R.sueltas.length+(R.sueltas.length===1?" cambio apuntado":" cambios apuntados")+" en las lecturas sin salida del almacén ("+R.sueltas.map(x=>fmtF(x.f)+" "+x.nave).join(", ")+"): falta apuntar el GRG en el almacén."}):null,
        filas.length?cTabla(["Cambio o nivel","Había","Marcan los contadores","Desfase"],filas,[1,2,3]):null,
        A?el("p",{class:"sub",style:"margin:0",text:"Acumulado desde el "+fmtF(A.desde)+" ("+A.n+" cambios): traían "+fmtL(A.esp)+", los contadores marcan "+fmtL(A.cont)+" → "+(A.des>=0?"+":"")+fmtL(A.des)+" ("+(A.pct>0?"+":"")+A.pct+" %)"+(A.exacto?"":" · sin el nivel de abajo puede variar hasta un GRG")}):null])]));});
  box.appendChild(cotejoGliUI());
  box.appendChild(el("p",{class:"hint",text:"Los GRG están en la "+NAVE_GRG+" y dan servicio a las dos naves, así que se compara con los contadores de Nave 1 + Nave 2. Lo gastado entre un cambio y el siguiente = lo que traía el GRG nuevo + lo que tenía el de abajo al cambiar − lo que tiene el de abajo en el cambio siguiente. Para que salga exacto, el primer día apunta con las lecturas el nivel de arriba y de abajo («Solo apunto el nivel»), y cada día de cambio el nivel del de abajo. Sin ese dato sale «aprox.» y solo avisa si el desfase se repite."}));
  box.appendChild(el("button",{type:"button",class:"btn sec",style:"justify-self:start",text:"Ajustes del cotejo",onclick:()=>ajustesCotejo()}));
  return box;}
function ajustesCotejo(){const val={};CONT_GRG.forEach(([k])=>{const c=cfgCot(k);val[k]={art:c.art||"",dens:String(c.dens).replace(".",","),cap:String(c.cap)};});
  const ops=[["","— sin unir —"]].concat(artsActivos().filter(a=>a.fam!=="eje"&&a.fam!=="piston").sort((x,y)=>x.desc.localeCompare(y.desc)).map(a=>[a.id,nomArt(a)]));
  dlg("Ajustes del cotejo",[el("p",{class:"hint",text:"Une cada contador con el artículo que se cambia en su grifo, pon la densidad de su ficha técnica (kg por litro) y los litros que caben en el GRG. Las densidades que vienen puestas son aproximadas."})].concat(CONT_GRG.map(([k,nom])=>el("div",{class:"row"},[
    fld(nom,sel("cfA"+k,ops,val[k].art,v=>val[k].art=v)),fld("kg/l",inp("cfD"+k,val[k].dens,v=>val[k].dens=v,{inputmode:"decimal",class:"num"})),fld("GRG (l)",inp("cfC"+k,val[k].cap,v=>val[k].cap=v,{inputmode:"numeric",class:"num"}))]))),
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const o=Object.assign({},cat.contCfg||{});for(const [k,nom] of CONT_GRG){const d=parseN(val[k].dens),c=parseN(val[k].cap);if(!(d>0.5&&d<2)){toast("Densidad no válida en "+nom);return false;}if(!(c>=50&&c<=5000)){toast("Litros del GRG no válidos en "+nom);return false;}o[k]={art:val[k].art||null,dens:d,cap:c};}
      cat.contCfg=o;try{await saveCat();}catch(e){return false;}toast("Ajustes guardados");}}]);}
/* resumen corto para la tarjeta: cómo va el GRG que está puesto y los desfases */
function cotejoResumen(){const out=[];cotejoGliResumen().forEach(x=>out.push(x));CONT_GRG.forEach(([k,nom])=>{const R=cotejo(k),u=R.iv[R.iv.length-1];if(!u)return;
  if(R.malos.length){const m=R.malos[R.malos.length-1];out.push({niv:"bad",t:nom+": desfase de "+(m.pct>0?"+":"")+m.pct+" % en el cambio del "+fmtF(m.f)});}
  else if(R.acuMal)out.push({niv:"bad",t:nom+": desde el "+fmtF(R.acu.desde)+" los contadores se desvían un "+(R.acu.pct>0?"+":"")+R.acu.pct+" % de lo que traían los GRG"});
  else if(u.cub&&!u.hasta&&u.l>0&&u.queda/u.l<0.15)out.push({niv:"warn",t:nom+": al GRG de arriba del "+fmtF(u.f)+" le quedan ≈ "+fmtL(u.queda)});
  if(R.sueltas.length&&R.C.art)out.push({niv:"warn",t:nom+": cambio de GRG apuntado el "+fmtF(R.sueltas[R.sueltas.length-1].f)+" sin salida en el almacén"});});return out;}

/* ===== GLICOL: depósito grande para las dos naves; una cisterna lo recarga (más o menos una vez al mes) =====
   Lo gastado entre dos apuntes = nivel después del primero − nivel antes del siguiente; tiene que ser lo que marcan los contadores de glicol de Nave 1 + Nave 2.
   Además se compara lo que dice el albarán de la cisterna con lo que sube el nivel. */
function cotejoGli(){const D=todosDep().filter(r=>r.dep==="gli");
  const ev=D.map(r=>r.tipo==="nivel"?{r,f:r.f,tipo:"nivel",antes:r.n,desp:r.n}:{r,f:r.f,tipo:"recarga",l:+r.l||0,antes:r.antes!=null?r.antes:null,desp:r.despues!=null?r.despues:(r.antes!=null?r.antes+(+r.l||0):null)});
  const conL=NAVES_CT.filter(nv=>lectDe(nv).some(x=>x.c&&typeof x.c.gli==="number"));
  const lit=(d0,d1)=>{let s=0,cub=conL.length>0;conL.forEach(nv=>{const L=lectDe(nv).filter(x=>typeof x.c.gli==="number");if(L[0].f>d0)cub=false;
    tramos(nv,"gli").forEach(t=>{if(!(t.dif>0))return;const a=Math.max(msD(t.f0),msD(d0)),z=Math.min(msD(t.f),d1?msD(d1):Infinity),tot=msD(t.f)-msD(t.f0);if(z<=a||tot<=0)return;s+=t.dif*(z-a)/tot;});});return{s,cub};};
  const iv=ev.map((e,i)=>{const sig=ev[i+1],r=lit(e.f,sig?sig.f:null);
    const exacto=!!sig&&e.desp!=null&&sig.antes!=null;let esp=null;
    if(sig){if(exacto)esp=e.desp-sig.antes;else if(sig.tipo==="recarga")esp=sig.l;}/* sin niveles: se supone que se recarga lo gastado */
    const des=esp!=null?r.s-esp:null;
    const albDes=e.tipo==="recarga"&&e.r.antes!=null&&e.r.despues!=null&&e.l?Math.round((e.r.despues-e.r.antes-e.l)/e.l*100):null;
    return Object.assign({},e,{hasta:sig?sig.f:null,cont:r.s,cub:r.cub,esp,exacto,des,pct:esp?Math.round(des/esp*100):null,albDes,queda:sig?null:(e.desp!=null?Math.max(0,e.desp-r.s):null)});});
  const cer=iv.filter(x=>x.hasta&&x.cub&&x.esp!=null);
  const malos=cer.filter(x=>Math.abs(x.pct)>=10&&(x.exacto||cer.filter(y=>!y.exacto&&Math.sign(y.pct)===Math.sign(x.pct)&&Math.abs(y.pct)>=10).length>=2));
  const albMal=iv.filter(x=>x.albDes!=null&&Math.abs(x.albDes)>=5);
  /* días que quedan: media de los últimos 30 días de las dos naves */
  const h=hoy(),d30=sumaDias(h,-30);let l30=0,lab=0;conL.forEach(nv=>{const T=tramos(nv,"gli").filter(t=>t.f>d30&&t.dif>=0);l30+=T.reduce((a,t)=>a+t.dif,0);});lab=Math.max(1,laborables(d30,h));
  const lpd=l30/lab,u=iv[iv.length-1],dias=u&&u.queda!=null&&lpd>0?Math.floor(u.queda/lpd):null;
  return{iv,cer,malos,albMal,lpd,dias,u};}
function cotejoGliUI(){const R=cotejoGli();
  const filas=R.iv.slice(-8).reverse().map(x=>[fmtF(x.f)+(x.tipo==="recarga"?" · recarga"+(x.r.alb?" (alb. "+x.r.alb+")":""):" · nivel"),
    x.tipo==="recarga"?"metió "+(x.r.kg?fmtN(x.r.kg)+" kg ≈ ":"")+fmtL(x.l)+(x.r.antes!=null&&x.r.despues!=null?" · "+fmtN(x.r.antes)+" → "+fmtN(x.r.despues)+(x.albDes!=null&&Math.abs(x.albDes)>=5?" ⚠":""):""):"había "+fmtL(x.antes),
    x.cub?fmtL(x.cont):"sin lecturas",
    x.hasta?(x.cub&&x.esp!=null?(x.des>=0?"+":"")+fmtL(x.des)+" ("+(x.pct>0?"+":"")+x.pct+" %)"+(x.exacto?"":" aprox."):"—"):(x.queda!=null?"quedan ≈ "+fmtL(x.queda)+(R.dias!=null?" (unos "+R.dias+" días)":""):"en uso")]);
  return el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Glicol · depósito"}),el("span",{class:"der sub",text:"Nave 1 + Nave 2"})]),
    el("div",{class:"bd",style:"display:grid;gap:8px"},[
      R.malos.length?el("div",{class:"banner b",text:"Desfase de más del 10 % entre el nivel del depósito y lo que marcan los contadores: revisa si hay una fuga o un contador que no marca."}):null,
      R.albMal.length?el("div",{class:"banner w",text:R.albMal.map(x=>"Recarga del "+fmtF(x.f)+": el albarán dice "+(x.r.kg?fmtN(x.r.kg)+" kg ≈ ":"")+fmtL(x.l)+" y el nivel subió "+fmtL(x.r.despues-x.r.antes)+" ("+(x.albDes>0?"+":"")+x.albDes+" %)").join(" · ")}):null,
      filas.length?cTabla(["Recarga o nivel","Depósito","Marcan los contadores","Desfase"],filas,[1,2,3]):el("p",{class:"hint",style:"margin:0",text:"Todavía no hay ninguna recarga ni ningún nivel del depósito apuntado."}),
      el("p",{class:"hint",style:"margin:0",text:"Lo gastado entre dos apuntes = nivel del depósito después del primero − nivel antes del siguiente. Para empezar exacto, apunta hoy el nivel del depósito; en cada recarga, los litros del albarán y el nivel antes y después."}),
      el("button",{type:"button",class:"btn sec",style:"justify-self:start",text:"Recarga o nivel del glicol",onclick:()=>formGli()})])]);}
function cotejoGliResumen(){const R=cotejoGli(),o=[];if(R.malos.length){const m=R.malos[R.malos.length-1];o.push({niv:"bad",t:"Glicol: desfase de "+(m.pct>0?"+":"")+m.pct+" % entre el depósito y los contadores (desde el "+fmtF(m.f)+")"});}
  if(R.albMal.length){const m=R.albMal[R.albMal.length-1];o.push({niv:"warn",t:"Glicol: en la recarga del "+fmtF(m.f)+" el nivel no sube lo que dice el albarán ("+(m.albDes>0?"+":"")+m.albDes+" %)"});}
  if(R.dias!=null&&R.dias<7)o.push({niv:"warn",t:"Glicol: quedan ≈ "+fmtL(R.u.queda)+" en el depósito (unos "+R.dias+" días)"});return o;}
/* apuntar una recarga de la cisterna o solo el nivel del depósito */
function formGli(){const f={f:hoy(),tipo:todosDep().some(r=>r.dep==="gli")?"recarga":"nivel",kg:"",dens:String(cfgCot("gli").dens).replace(".",","),antes:"",despues:"",n:"",alb:""};const box=el("div",{style:"display:grid;gap:10px"});
  const pinta=()=>{box.textContent="";
    box.appendChild(el("div",{class:"seg",role:"group"},[["recarga","Recarga de cisterna"],["nivel","Solo apunto el nivel"]].map(([t,x])=>{const b=el("button",{type:"button","aria-pressed":String(f.tipo===t),text:x});b.onclick=()=>{f.tipo=t;pinta();};return b;})));
    box.appendChild(fld("Fecha",inp("glF",f.f,v=>f.f=v,{type:"date",max:hoy()})));
    if(f.tipo==="recarga"){const eq=el("div",{class:"sub",style:"min-height:18px"});const calc=()=>{const k=parseN(f.kg),d=parseN(f.dens);eq.textContent=k>0&&d>0.5&&d<2?"≈ "+fmtL(k/d):"";};
      box.appendChild(el("div",{class:"row"},[fld("Kg del albarán",el("div",{style:"display:grid;gap:2px"},[inp("glKg",f.kg,v=>{f.kg=v;calc();},{inputmode:"decimal",class:"num",autocomplete:"off"}),eq])),fld("Nº de albarán",inp("glAlb",f.alb,v=>f.alb=v,{autocomplete:"off"}))]));
      box.appendChild(fld("Densidad del glicol (kg por litro, la del albarán o la ficha técnica)",inp("glDens",f.dens,v=>{f.dens=v;calc();},{inputmode:"decimal",class:"num",autocomplete:"off"})));calc();
      box.appendChild(el("div",{class:"row"},[fld("Nivel antes (l)",inp("glA",f.antes,v=>f.antes=v,{inputmode:"decimal",class:"num",autocomplete:"off"})),fld("Nivel después (l)",inp("glD",f.despues,v=>f.despues=v,{inputmode:"decimal",class:"num",autocomplete:"off"}))]));
      box.appendChild(el("p",{class:"hint",style:"margin:0",text:"El nivel antes de que empiece a descargar la cisterna y el nivel cuando termina, en litros, como lo marca el indicador del depósito."}));}
    else{box.appendChild(fld("Nivel del depósito (l)",inp("glN",f.n,v=>f.n=v,{inputmode:"decimal",class:"num",autocomplete:"off"})));
      box.appendChild(el("p",{class:"hint",style:"margin:0",text:"Apúntalo el mismo día que lees los contadores. El primer día sirve de punto de partida."}));}
    const D=todosDep().filter(r=>r.dep==="gli").slice(-5).reverse();
    if(D.length)box.appendChild(el("div",{},[el("div",{class:"sub",text:"Últimos apuntes"}),el("div",{class:"lst"},D.map(r=>el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},[el("div",{class:"t1",text:fmtF(r.f)+" · "+(r.tipo==="recarga"?"recarga "+(r.kg?fmtN(r.kg)+" kg ≈ ":"")+fmtL(+r.l||0):"nivel "+fmtL(+r.n||0))}),
      el("div",{class:"t2",text:r.tipo==="recarga"?[r.antes!=null&&r.despues!=null?"nivel "+fmtN(r.antes)+" → "+fmtN(r.despues):null,r.alb?"alb. "+r.alb:null,r.por].filter(Boolean).join(" · "):r.por||""})]),
      el("button",{type:"button",class:"btn sec peq",text:"Quitar",onclick:()=>confirmar("¿Quitar este apunte del glicol?",fmtF(r.f),"Quitar",async()=>{try{await quitaDep(r);toast("Quitado");cerrarDlgs();formGli();}catch(e){toast("No se pudo quitar");}})})])))]));};
  pinta();
  dlg("Glicol: recarga o nivel del depósito",[box],[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const n=v=>{const t=String(v==null?"":v).trim();if(t==="")return null;const x=parseN(t);return isFinite(x)&&x>=0?x:NaN;};
    let rec;if(f.tipo==="recarga"){const kg=n(f.kg),dn=n(f.dens),a=n(f.antes),d=n(f.despues);if(!(kg>0)){toast("Pon los kg del albarán");return false;}if(!(dn>0.5&&dn<2)){toast("Densidad no válida");return false;}const l=Math.round(kg/dn*10)/10;if(Number.isNaN(a)||Number.isNaN(d)){toast("Nivel no válido");return false;}
      if(a!=null&&d!=null&&d<a){toast("El nivel después tiene que ser mayor que el de antes");return false;}rec={f:f.f,dep:"gli",tipo:"recarga",kg,dens:dn,l,antes:a,despues:d,alb:String(f.alb||"").trim()||null};
      if(dn!==cfgCot("gli").dens){cat.contCfg=Object.assign({},cat.contCfg||{},{gli:Object.assign({},(cat.contCfg||{}).gli||{},{dens:dn})});try{await saveCat();}catch(e){}}}
    else{const x=n(f.n);if(x==null||Number.isNaN(x)){toast("Pon el nivel del depósito");return false;}rec={f:f.f,dep:"gli",tipo:"nivel",n:x};}
    try{await guardaLect(rec,null);}catch(e){toast("No se pudo guardar");return false;}toast("Apuntado");render(true);}}]);}
async function quitaDep(r){const y=r.y||r.f.slice(0,4);if(db.itemsDelId){await db.itemsDelId("cont",y,[r.id]);return;}const r0=db.doc("cont/"+y),s0=await r0.get();if(s0.exists)await r0.set({items:(s0.data().items||[]).filter(x=>x.id!==r.id)});}

/* ===== PREVISIÓN Y PEDIDO DE ACEITES con el gasto real de los contadores =====
   Gasto por día natural = litros que marcan los contadores de las dos naves (últimos 60 días) × densidad → kg (el stock va en kg).
   Con 14 días o más de lecturas, ese gasto sustituye al de las salidas del almacén (que van a saltos de un GRG).
   Mínimo = 1 GRG de reserva; punto de pedido = mínimo + gasto diario × plazo de entrega. Si el artículo está en «automático»
   (por defecto), mínimo y punto de pedido se recalculan solos con el gasto: así se afinan según lo que se gaste. */
const PLAZO0=7;
function grgKg(k,a){const C=cfgCot(k);const q=todosMov().filter(m=>m.tipo==="salida"&&m.art===a.id&&+m.cant>=100).map(m=>+m.cant).sort((x,y)=>x-y);return q.length?q[Math.floor(q.length/2)]:Math.round(C.cap*C.dens);}
function gastoCont(k){const ns=NAVES_CT.filter(nv=>lectDe(nv).some(r=>r.c&&typeof r.c[k]==="number"));if(!ns.length)return null;
  const h=hoy(),d0=sumaDias(h,-60);let l=0,ini=null,fin=null;
  ns.forEach(nv=>{const L=lectDe(nv).filter(r=>typeof r.c[k]==="number");const a=L[0].f>d0?L[0].f:d0,z=L[L.length-1].f;if(!ini||a<ini)ini=a;if(!fin||z>fin)fin=z;
    tramos(nv,k).forEach(t=>{if(!(t.dif>0))return;const x=Math.max(msD(t.f0),msD(d0)),y=msD(t.f),tot=y-msD(t.f0);if(y<=x||tot<=0)return;l+=t.dif*(y-x)/tot;});});
  const dd=ini&&fin?Math.round((msD(fin)-msD(ini))/864e5):0;return{l,dias:dd,lpd:dd>0?l/dd:0,ok:dd>=14};}
let PREV_AC={};
function ajustaAceites(){PREV_AC={};CONT_GRG.forEach(([k,nom])=>{const C=cfgCot(k);if(!C.art)return;const a=art(C.art);if(!a)return;
  const g=gastoCont(k),porCont=!!(g&&g.ok);if(porCont)CONS[a.id]=g.lpd*C.dens;
  const kd=consDia(a),grg=grgKg(k,a),pl=plazoArt(a)||PLAZO0,auto=a.ppAuto!==false;
  if(auto){a.min=grg;a.pp=Math.ceil(grg+kd*pl);}
  /* lo que queda puesto en la instalación (GRG de arriba y de abajo) */
  const R=cotejo(k),u=R.iv[R.iv.length-1];const instL=u&&!u.hasta&&u.cub?(u.queda||0)+(u.ab!=null?u.ab:0):null;
  PREV_AC[a.id]={k,nom,a,g,porCont,kd,ld:kd/C.dens,grg,pl,plDef:!plazoArt(a),auto,instKg:instL!=null?instL*C.dens:null};});}
function cardPrevAceites(){const L=Object.values(PREV_AC);if(!L.length)return el("div");const h=hoy();
  const filas=L.map(P=>{const a=P.a,st=stockDe(a.id),tot=st+(P.instKg||0),dias=P.kd>0?Math.floor(tot/P.kd):null,pp=puntoPedido(a);
    const dPed=P.kd>0?Math.floor((st-pp)/P.kd):null;
    return{P,st,dias,pp,dPed,f:[P.nom,P.kd>0?fmtL(P.ld)+" · "+fmtN(Math.round(P.kd*10)/10)+" kg"+(P.porCont?"":" *"):"—",fmtN(Math.round(st))+" kg ("+fmtN(Math.round(st/P.grg*10)/10)+" GRG)",dias!=null?dias+" d":"—",
      fmtN(Math.round(+a.min||0))+" / "+fmtN(Math.ceil(pp))+" kg",a.pedido?"pedido":dPed==null?"—":dPed<=0?"¡ya!":fmtF(sumaDias(h,dPed))]};});
  const ya=filas.filter(x=>!x.P.a.pedido&&x.dPed!=null&&x.dPed<=0),pronto=filas.filter(x=>!x.P.a.pedido&&x.dPed!=null&&x.dPed>0&&x.dPed<=7);
  return el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Previsión y pedido de aceites"}),el("span",{class:"der sub",text:"1 GRG de reserva"})]),
    el("div",{class:"bd",style:"display:grid;gap:10px"},[
      ya.length?el("div",{class:"banner b",text:"Hay que pedir ya: "+ya.map(x=>x.P.nom).join(", ")+"."}):null,
      pronto.length?el("div",{class:"banner w",text:"Esta semana toca pedir: "+pronto.map(x=>x.P.nom+" ("+fmtF(sumaDias(h,x.dPed))+")").join(", ")+"."}):null,
      cTabla(["Aceite","Gasto por día","En el almacén","Dura (con lo puesto)","Mínimo / pedir al llegar a","Pedir el"],filas.map(x=>x.f),[1,2,3,4]),
      L.some(P=>!P.porCont)?el("p",{class:"hint",style:"margin:0",text:"* Con menos de 14 días de lecturas el gasto sale de las salidas del almacén. En cuanto haya 2 semanas de contadores, se usa el gasto real."}):null,
      L.some(P=>P.plDef)?el("div",{class:"banner w",text:"Falta el plazo de entrega de "+L.filter(P=>P.plDef).map(P=>P.nom).join(", ")+": de momento cuento "+PLAZO0+" días."}):null,
      el("p",{class:"sub",style:"margin:0",text:"Gasto previsto al mes: "+L.filter(P=>P.kd>0).map(P=>P.nom+" "+fmtL(P.ld*30)+" ≈ "+fmtN(Math.round(P.kd*30))+" kg ≈ "+fmtN(Math.round(P.kd*30/P.grg*10)/10)+" GRG").join(" · ")}),
      el("button",{type:"button",class:"btn sec",style:"justify-self:start",text:"Plazos y reserva",onclick:()=>formPlazosAc()})])]);}
function formPlazosAc(){const L=Object.values(PREV_AC),val={};L.forEach(P=>{val[P.a.id]={pl:String(plazoArt(P.a)||""),auto:P.auto};});
  dlg("Plazos de entrega y reserva",[el("p",{class:"hint",text:"Plazo: días desde que se pide hasta que llega. Con «Automático», el mínimo es 1 GRG y el punto de pedido se recalcula solo según lo que se gaste."})].concat(L.map(P=>{const v=val[P.a.id];
    const ck=el("input",{type:"checkbox",id:"paA"+P.a.id});ck.checked=v.auto;ck.addEventListener("change",()=>v.auto=ck.checked);
    return el("div",{class:"row",style:"align-items:end"},[fld(P.nom+" · plazo (días)",inp("paP"+P.a.id,v.pl,x=>v.pl=x,{inputmode:"numeric",class:"num",placeholder:String(PLAZO0)})),el("label",{style:"display:flex;gap:6px;align-items:center;padding-bottom:12px"},[ck,"Automático"])]);})),
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{for(const P of L){const v=val[P.a.id],n=String(v.pl).trim()===""?null:parseN(v.pl);if(n!=null&&!(n>=0&&n<=120)){toast("Plazo no válido en "+P.nom);return false;}
      const a=art(P.a.id);if(n)a.plazo=n;else delete a.plazo;a.ppAuto=v.auto;}
      ajustaAceites();try{await saveCat();}catch(e){return false;}toast("Guardado");render(true);}}]);}

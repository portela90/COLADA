/* ===== CONTADORES DE ACEITE Y GLICOL =====
   En cada nave hay 4 grifos con contador (Engrase 220, Térmico, Prensa, ISO 46) y un contador general de glicol.
   Se apunta la lectura cada día laborable; los litros consumidos son la diferencia con la lectura anterior.
   Guardado en la colección «cont» (un documento por año, items {id,f,nave,c:{e220,ter,pre,i46,gli},grg:{k:{ab}},por,ts}). No toca el stock. */
const CONT=[["e220","Engrase 220"],["ter","Térmico"],["pre","Prensa"],["i46","ISO 46"],["gli","Glicol"]];
const NAVES_CT=["Nave 1","Nave 2"];
let contAnos={};
function todasLect(){const o=[];Object.keys(contAnos).forEach(y=>(contAnos[y]||[]).forEach(r=>o.push(Object.assign({y},r))));return o.sort((a,b)=>(a.f+String(a.ts||0).padStart(15,"0")).localeCompare(b.f+String(b.ts||0).padStart(15,"0")));}
const lectDe=n=>todasLect().filter(r=>r.nave===n);
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
    /* cambio del GRG de arriba: nivel del de abajo */
    if(esta&&esta.grg&&!f.gcarg){f.g={};Object.keys(esta.grg).forEach(k=>{f.g[k]=String(esta.grg[k].ab).replace(".",",");});f.gcarg=true;}
    f.g=f.g||{};const gb=el("div",{class:"card",style:"padding:10px 12px;display:grid;gap:8px"});
    gb.appendChild(el("div",{class:"sub",style:"font-weight:600",text:"¿Hoy se ha cambiado algún GRG?"}));
    gb.appendChild(el("div",{class:"chips",style:"flex-wrap:wrap;overflow:visible"},CONT.map(([k,nom])=>el("button",{type:"button",class:"chip","aria-pressed":String(f.g[k]!=null),text:nom,onclick:()=>{if(f.g[k]!=null)delete f.g[k];else f.g[k]="";pinta();}}))));
    CONT.filter(([k])=>f.g[k]!=null).forEach(([k,nom])=>{const cap=cfgCot(k).cap;const i=inp("ctG"+k,f.g[k],v=>{f.g[k]=v;},{inputmode:"decimal",class:"num",autocomplete:"off",placeholder:"litros"});
      gb.appendChild(fld("Nivel del GRG de abajo · "+nom,el("div",{style:"display:grid;gap:6px"},[i,el("div",{class:"chips"},[["Lleno",1],["¾",.75],["½",.5],["¼",.25]].map(([t,x])=>el("button",{type:"button",class:"chip",text:t,onclick:()=>{f.g[k]=String(Math.round(cap*x));i.value=f.g[k];}})))])));});
    if(Object.keys(f.g).length)gb.appendChild(el("p",{class:"hint",style:"margin:0",text:"Mira la escala del lateral del GRG de abajo y pon los litros que tiene justo al cambiar el de arriba."}));
    box.appendChild(gb);};
  pinta();
  dlg("Lectura de contadores",[fld("Fecha",inp("ctF",f.f,v=>{f.f=v;f.cargada=false;f.v={};f.g={};f.gcarg=false;pinta();},{type:"date",max:hoy()})),box],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const c={};let n=0;for(const [k,nom] of CONT){const s=String(f.v[k]==null?"":f.v[k]).trim();if(!s)continue;const x=parseN(s);if(!isFinite(x)||x<0){toast("Lectura no válida en "+nom);return false;}c[k]=x;n++;}
      if(!n){toast("Escribe al menos una lectura");return false;}
      const grg={};for(const k of Object.keys(f.g||{})){const x=parseN(String(f.g[k]).trim());if(String(f.g[k]).trim()===""||!isFinite(x)||x<0||x>cfgCot(k).cap*1.2){toast("Pon el nivel del GRG de abajo de "+nomCont(k)+" (en litros)");return false;}grg[k]={ab:x};}
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
      el("div",{class:"acciones acc2"},[el("button",{type:"button",class:"btn",text:"Apuntar lecturas",onclick:()=>formLect()}),el("button",{type:"button",class:"btn sec",text:"Informe y gráficas",onclick:()=>informeCont()}),el("button",{type:"button",class:"btn sec",text:"Cotejo con los cambios",onclick:()=>dlg("Cotejo con los cambios de GRG",[cotejoUI()],[{t:"Cerrar",cls:"sec"}])})]),
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
function notasGRG(k){const o=[];todasLect().forEach(r=>{const g=r.grg&&r.grg[k];if(g&&typeof g.ab==="number")o.push({f:r.f,nave:r.nave,ab:g.ab,r});});return o;}
function cotejo(k){const C=cfgCot(k);const N=notasGRG(k),usada=new Set();
  const cam=(C.art?todosMov().filter(m=>m.tipo==="salida"&&m.art===C.art&&m.f):[]).map(m=>{const nv=String(m.nota||"").match(/\bnave\s*(1a|1b|1|2)\b/i);return{f:m.f,kg:+m.cant||0,l:(+m.cant||0)/C.dens,nave:nv?(/^1/.test(nv[1])?"Nave 1":"Nave 2"):null,m};}).sort((a,b)=>a.f.localeCompare(b.f));
  /* une cada cambio del almacén con la nota de la lectura (misma nave si se sabe, hasta 3 días de diferencia) */
  cam.forEach(c=>{const cand=N.filter(x=>!usada.has(x)&&(!c.nave||x.nave===c.nave)&&Math.abs(msD(x.f)-msD(c.f))<=3*864e5).sort((a,b)=>Math.abs(msD(a.f)-msD(c.f))-Math.abs(msD(b.f)-msD(c.f)))[0];
    if(cand){usada.add(cand);c.ab=cand.ab;c.nave=c.nave||cand.nave;c.fl=cand.f;}});
  const sueltas=N.filter(x=>!usada.has(x));
  const conL=NAVES_CT.filter(nv=>lectDe(nv).some(r=>r.c&&typeof r.c[k]==="number"));
  const lit=(n,d0,d1)=>{const ns=n?[n]:conL;let s=0,cub=ns.length>0;ns.forEach(nv=>{const T=tramos(nv,k);const L=lectDe(nv).filter(r=>typeof r.c[k]==="number");if(!L.length||L[0].f>d0)cub=false;
    T.forEach(t=>{if(!(t.dif>0))return;const a=Math.max(msD(t.f0),msD(d0)),z=Math.min(msD(t.f),d1?msD(d1):Infinity),tot=msD(t.f)-msD(t.f0);if(z<=a||tot<=0)return;s+=t.dif*(z-a)/tot;});});return{s,cub};};
  const iv=cam.map((c,i)=>{const sig=cam.slice(i+1).find(x=>!c.nave||!x.nave||x.nave===c.nave);const d0=c.fl||c.f,d1=sig?(sig.fl||sig.f):null,r=lit(c.nave,d0,d1);
    const exacto=!!sig&&c.ab!=null&&sig.ab!=null,esp=sig?c.l+(exacto?c.ab-sig.ab:0):null,des=sig?r.s-esp:null;
    return Object.assign({},c,{hasta:sig?sig.f:null,cont:r.s,cub:r.cub,esp,exacto,des,pct:sig&&esp?Math.round(des/esp*100):null,queda:sig?null:Math.max(0,c.l-r.s)});});
  /* acumulado desde el primer cambio con lecturas hasta el último cerrado: se va diluyendo el error del GRG de abajo */
  const cer=iv.filter(x=>x.hasta&&x.cub);let acu=null;
  if(cer.length>=2){const p=cer[0],u=cer[cer.length-1],sig=iv.find(x=>x.f===u.hasta&&x!==u)||{};const ext=p.ab!=null&&sig.ab!=null;
    const esp=cer.reduce((s,x)=>s+x.l,0)+(ext?p.ab-sig.ab:0),cont=cer.reduce((s,x)=>s+x.cont,0);acu={n:cer.length,desde:p.f,hasta:u.hasta,esp,cont,des:cont-esp,pct:esp?Math.round((cont-esp)/esp*100):0,exacto:ext};}
  /* aviso: con el nivel de abajo apuntado basta un cambio; sin él, dos cambios seguidos con el mismo desfase, o el acumulado */
  const malos=[];cer.forEach((x,i)=>{if(Math.abs(x.pct)<10)return;if(x.exacto)malos.push(x);else{const y=cer[i-1];if(y&&!y.exacto&&Math.abs(y.pct)>=10&&Math.sign(y.pct)===Math.sign(x.pct))malos.push(x);}});
  const acuMal=acu&&Math.abs(acu.pct)>=10&&(acu.exacto||acu.n>=5);
  return{C,cambios:cam,iv,acu,malos,acuMal,sueltas};}
function cotejoUI(){const box=el("div",{style:"display:grid;gap:10px"});
  CONT.forEach(([k,nom])=>{const R=cotejo(k);const a=R.C.art?art(R.C.art):null;
    const filas=R.iv.slice(-6).reverse().map(x=>[fmtF(x.f)+(x.nave?" · "+x.nave:""),fmtN(Math.round(x.kg))+" kg ≈ "+fmtL(x.l)+(x.ab!=null?" · abajo "+fmtL(x.ab):""),x.cub?fmtL(x.cont):"sin lecturas",
      x.hasta?(x.cub?(x.des>=0?"+":"")+fmtL(x.des)+" ("+(x.pct>0?"+":"")+x.pct+" %)"+(x.exacto?"":" aprox."):"—"):(x.cub?"en uso · quedan arriba ≈ "+fmtL(x.queda):"en uso")]);
    const A=R.acu;
    box.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:nom}),el("span",{class:"der sub",text:a?nomArt(a)+" · "+R.C.dens+" kg/l":"sin artículo unido"})]),
      el("div",{class:"bd",style:"display:grid;gap:8px"},[!a?el("p",{class:"hint",style:"margin:0",text:"Une este contador con su artículo en «Ajustes del cotejo» para poder comparar."}):!R.iv.length?el("p",{class:"hint",style:"margin:0",text:"Todavía no hay ningún cambio de "+nomArt(a)+" apuntado como salida del almacén."}):null,
        R.malos.length||R.acuMal?el("div",{class:"banner b",text:(R.malos.length?"Desfase de más del 10 % en "+R.malos.length+(R.malos.length===1?" cambio":" cambios"):"El acumulado se desvía un "+A.pct+" %")+": revisa si se apuntó bien el cambio o si hay una fuga o un contador que no marca."}):null,
        R.sueltas.length?el("div",{class:"banner w",text:"Hay "+R.sueltas.length+(R.sueltas.length===1?" cambio apuntado":" cambios apuntados")+" en las lecturas sin salida del almacén ("+R.sueltas.map(x=>fmtF(x.f)+" "+x.nave).join(", ")+"): falta apuntar el GRG en el almacén."}):null,
        filas.length?cTabla(["Cambio","Traía","Marcan los contadores","Desfase"],filas,[1,2,3]):null,
        A?el("p",{class:"sub",style:"margin:0",text:"Acumulado desde el "+fmtF(A.desde)+" ("+A.n+" cambios): traían "+fmtL(A.esp)+", los contadores marcan "+fmtL(A.cont)+" → "+(A.des>=0?"+":"")+fmtL(A.des)+" ("+(A.pct>0?"+":"")+A.pct+" %)"+(A.exacto?"":" · sin el nivel de abajo puede variar hasta un GRG")}):null])]));});
  box.appendChild(el("p",{class:"hint",text:"Lo gastado entre un cambio y el siguiente = lo que traía el GRG nuevo + lo que tenía el de abajo al cambiar − lo que tiene el de abajo en el cambio siguiente. Para que salga exacto, al apuntar las lecturas del día del cambio marca «Hoy se ha cambiado el GRG» y pon el nivel del de abajo. Sin ese dato sale «aprox.» y solo avisa si el desfase se repite."}));
  box.appendChild(el("button",{type:"button",class:"btn sec",style:"justify-self:start",text:"Ajustes del cotejo",onclick:()=>ajustesCotejo()}));
  return box;}
function ajustesCotejo(){const val={};CONT.forEach(([k])=>{const c=cfgCot(k);val[k]={art:c.art||"",dens:String(c.dens).replace(".",","),cap:String(c.cap)};});
  const ops=[["","— sin unir —"]].concat(artsActivos().filter(a=>a.fam!=="eje"&&a.fam!=="piston").sort((x,y)=>x.desc.localeCompare(y.desc)).map(a=>[a.id,nomArt(a)]));
  dlg("Ajustes del cotejo",[el("p",{class:"hint",text:"Une cada contador con el artículo que se cambia en su grifo, pon la densidad de su ficha técnica (kg por litro) y los litros que caben en el GRG. Las densidades que vienen puestas son aproximadas."})].concat(CONT.map(([k,nom])=>el("div",{class:"row"},[
    fld(nom,sel("cfA"+k,ops,val[k].art,v=>val[k].art=v)),fld("kg/l",inp("cfD"+k,val[k].dens,v=>val[k].dens=v,{inputmode:"decimal",class:"num"})),fld("GRG (l)",inp("cfC"+k,val[k].cap,v=>val[k].cap=v,{inputmode:"numeric",class:"num"}))]))),
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const o={};for(const [k,nom] of CONT){const d=parseN(val[k].dens),c=parseN(val[k].cap);if(!(d>0.5&&d<2)){toast("Densidad no válida en "+nom);return false;}if(!(c>=50&&c<=5000)){toast("Litros del GRG no válidos en "+nom);return false;}o[k]={art:val[k].art||null,dens:d,cap:c};}
      cat.contCfg=o;try{await saveCat();}catch(e){return false;}toast("Ajustes guardados");}}]);}
/* resumen corto para la tarjeta: cómo va el GRG que está puesto y los desfases */
function cotejoResumen(){const out=[];CONT.forEach(([k,nom])=>{const R=cotejo(k),u=R.iv[R.iv.length-1];if(!u)return;
  if(R.malos.length){const m=R.malos[R.malos.length-1];out.push({niv:"bad",t:nom+": desfase de "+(m.pct>0?"+":"")+m.pct+" % en el cambio del "+fmtF(m.f)});}
  else if(R.acuMal)out.push({niv:"bad",t:nom+": desde el "+fmtF(R.acu.desde)+" los contadores se desvían un "+(R.acu.pct>0?"+":"")+R.acu.pct+" % de lo que traían los GRG"});
  else if(u.cub&&!u.hasta&&u.l>0&&u.queda/u.l<0.15)out.push({niv:"warn",t:nom+": al GRG de arriba del "+fmtF(u.f)+" le quedan ≈ "+fmtL(u.queda)});
  if(R.sueltas.length&&R.C.art)out.push({niv:"warn",t:nom+": cambio de GRG apuntado el "+fmtF(R.sueltas[R.sueltas.length-1].f)+" sin salida en el almacén"});});return out;}

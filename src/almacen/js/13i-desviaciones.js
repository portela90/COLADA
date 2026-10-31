/* ===== DESVIACIONES DE CONSUMO =====
   Cada semana (lunes a domingo) se mira lo gastado por cada máquina, cada familia de cada máquina, cada artículo y cada contador de aceite.
   - Por tonelada: con los kilos de aluminio de Coladas (doc «prod/resumen», solo para usuarios con acceso completo) el gasto se divide entre las
     toneladas producidas; sin esos datos se compara tal cual.
   - Paradas: las semanas en que la máquina no ha producido no cuentan.
   - Molde: si la máquina lleva un molde distinto, se compara con las semanas que llevaba ese mismo molde.
   - Límites de control: media y dispersión de las 12 semanas anteriores. Avisa de un pico (más de 2 desviaciones por encima),
     de una tendencia (3 semanas subiendo por encima de lo normal) y de una bajada rara (2 semanas sin nada cuando siempre hay).
   - Pistones: si uno dura menos de la mitad de lo normal en esa máquina, o se disparan las roturas.
   - Causas: cada desviación se puede justificar (colección «desv», doc «causas»); justificada, deja de avisar 4 semanas.
   - El resumen de la semana se guarda en «desv/semana» para el aviso al móvil (alm_alertas_desv). */
let PROD=null,PROD_EST="";let DESV_DOCS={};let _desvC=null;
async function cargaProd(){if(window.__PROD){PROD=window.__PROD;PROD_EST="ok";return;}const sb=window.sbColada;if(!sb||!sb.from){PROD_EST="sin";return;}
  try{const r=await sb.from("docs").select("data").eq("col","prod").eq("id","resumen").maybeSingle();if(r.error||!r.data||!r.data.data){PROD_EST="sin";return;}PROD=r.data.data;PROD_EST="ok";}catch(e){PROD_EST="sin";}}
const lunesA=f=>{const d=new Date(f+"T12:00:00"),w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return d.toISOString().slice(0,10);};
const semTxt=w=>"semana del "+fmtF(w).slice(0,5);
const causasDesv=()=>((DESV_DOCS.causas||{}).items)||[];
const tonSem=(w,cod)=>{if(!PROD)return 1;const s=(PROD.sem||{})[w];if(!s)return 0;if(cod&&cod.startsWith("Nave"))return ((s.n||{})[cod]||0)/1000;if(cod)return ((s.m||{})[cod]||0)/1000;return Object.values(s.n||{}).reduce((a,b)=>a+b,0)/1000;};
const tonMes=(m,cod)=>{if(!PROD)return 0;const s=(PROD.mes||{})[m];if(!s)return 0;if(cod&&cod.startsWith("Nave"))return ((s.n||{})[cod]||0)/1000;if(cod)return ((s.m||{})[cod]||0)/1000;return Object.values(s.n||{}).reduce((a,b)=>a+b,0)/1000;};
function moldeEn(maqId,f){let v=null;todosMlog().forEach(x=>{if(x.tipo==="molde"&&x.maq===maqId&&x.f<=f)v=x.val||null;});return v;}
/* series semanales de todo lo que se mide */
function seriesDesv(){const h=hoy(),W0=sumaDias(lunesA(h),-7),ws=[];for(let i=13;i>=0;i--)ws.push(sumaDias(W0,-7*i));ws.push(lunesA(h));
  const w0=ws[0],S={};const ser=(key,o)=>S[key]=S[key]||Object.assign({key,v:{}},o);const add=(x,w,v)=>{x.v[w]=(x.v[w]||0)+v;};
  evTodo().forEach(e=>{if(e.f<w0||e.f>h)return;const w=lunesA(e.f),m=mqEv(e);const a=e.a||(e.fam==="Pistones"?pistArt(e.ref):null);const u=contable(e.ud)?e.cant:0;
    if(m){const x=ser("maq:"+m.cod,{tipo:"maq",tit:m.cod,sub:"todo lo que gasta",cod:m.cod,m,eur:true});add(x,w,e.eur);if(!x.u)x.u={};x.u[w]=(x.u[w]||0)+u;
      const fam=e.fam;const y=ser("mf:"+m.cod+"|"+fam,{tipo:"mf",tit:m.cod+" · "+fam,sub:fam,cod:m.cod,m,fam,ud:fam==="Pistones"?"ud":null,eur:fam!=="Pistones"});add(y,w,fam==="Pistones"?e.cant:e.eur);if(!y.u)y.u={};y.u[w]=(y.u[w]||0)+u;}
    if(a){const z=ser("art:"+a.id,{tipo:"art",tit:nomArtC(a),sub:famLbl(a),a,ud:a.ud||"ud",eur:false});add(z,w,e.cant);}});
  /* contadores de aceite por nave (litros), si los hay */
  if(typeof tramos==="function")NAVES_CT.forEach(nv=>CONT.forEach(([k,nom])=>{const T=tramos(nv,k);if(!T.length)return;const x=ser("cont:"+nv+"|"+k,{tipo:"cont",tit:nom+" · "+nv,sub:"contador",cod:nv,ud:"l",eur:false});
    T.forEach(t=>{if(!(t.dif>0))return;const a=msD(t.f0),b=msD(t.f),tot=b-a;if(tot<=0)return;ws.forEach(w=>{const x0=Math.max(a,msD(w)),x1=Math.min(b,msD(sumaDias(w,7)));if(x1>x0)add(x,w,t.dif*(x1-x0)/tot);});});}));
  /* las series de euros sin ningún precio pasan a unidades */
  Object.values(S).forEach(x=>{if(x.eur&&!Object.values(x.v).some(v=>v>0)&&x.u){x.v=x.u;x.eur=false;x.ud=x.tipo==="mf"?null:"ud";}});
  /* desde cuándo hay datos de cada cosa: antes de eso las semanas no cuentan (no es que no se gastara, es que no se apuntaba) */
  const ini=iniDatos();Object.values(S).forEach(x=>{x.ini=x.tipo==="cont"?(lectDe(x.cod)[0]||{}).f:x.tipo==="art"?(x.a.fam==="piston"?ini.pist:ini.mov):x.tipo==="mf"?(x.fam==="Pistones"?ini.pist:x.fam==="Reparación de ejes"?ini.rep:ini.mov):[ini.pist,ini.rep,ini.mov].filter(Boolean).sort().pop();});
  return{S,ws,W0,Wc:ws[ws.length-1]};}
function iniDatos(){const pr=L=>L.map(x=>x.f).filter(Boolean).sort()[0]||null;return{pist:pr(todosPist()),rep:pr(todasRep().map(r=>({f:r.env||r.alta}))),mov:pr(todosMov().filter(m=>m.tipo==="salida"))};}
const fmtDV=(x,v)=>x.eur?eur(v):fmtN(Math.round(v*10)/10)+(x.ud?" "+x.ud:"");
function evalDesv(x,ws,W0){const i0=ws.indexOf(W0);const ton=w=>x.tipo==="maq"||x.tipo==="mf"?tonSem(w,x.cod):x.tipo==="cont"?tonSem(w,x.cod):tonSem(w,null);
  const pts=ws.slice(0,i0+1).map(w=>({w,v:x.v[w]||0,t:ton(w),mo:x.m?moldeEn(x.m.id,sumaDias(w,6)):null}));const p0=pts[i0];if(!(p0.t>0))return null;
  const wIni=x.ini?lunesA(x.ini):null;let base=pts.slice(Math.max(0,i0-12),i0).filter(p=>p.t>0&&(!wIni||p.w>wIni));let moldeNuevo=false;
  if(x.m&&p0.mo){const igual=base.filter(p=>p.mo===p0.mo);if(igual.length>=4)base=igual;else if(base.filter(p=>p.mo&&p.mo!==p0.mo).length>base.length/2)moldeNuevo=true;}
  if(base.length<6||!base.some(p=>p.v>0))return null;
  const T=base.reduce((s,p)=>s+p.t,0),mu=base.reduce((s,p)=>s+p.v,0)/T;const sd=Math.sqrt(base.reduce((s,p)=>s+p.t*Math.pow(p.v/p.t-mu,2),0)/T);const sg=Math.max(sd,0.3*mu);
  const r=p=>p&&p.t>0?p.v/p.t:null,r0=r(p0),r1=r(pts[i0-1]),r2=r(pts[i0-2]),esp=mu*p0.t,exc=p0.v-esp;
  const cont=x.ud==="ud"||(!x.eur&&!x.ud),thr=x.eur?40:cont?1.5:Math.max(0.5*esp,1);
  let tipo=null;
  if(r0>mu+(moldeNuevo?3:2)*sg&&exc>=thr&&exc>=0.5*esp)tipo="pico";
  else if(!moldeNuevo&&r1!=null&&r2!=null&&r0>r1&&r1>r2&&r0>mu+sg&&r1>mu&&exc>=thr*0.5)tipo="tend";
  else if(p0.v===0&&pts[i0-1]&&pts[i0-1].t>0&&(pts[i0-1].v||0)===0&&esp>=(x.eur?100:cont?3:Math.max(5,0))&&base.filter(p=>p.v>0).length>=base.length*0.8)tipo="baja";
  return{x,tipo,mu,sg,esp,exc,v0:p0.v,t0:p0.t,r0,moldeNuevo,mo:p0.mo,serie:pts.slice(-13).map(p=>({w:p.w,r:p.t>0?p.v/p.t:null}))};}
/* pistones que duran poco y roturas */
function desvPist(){const h=hoy(),o=[],lim=sumaDias(h,-365);
  const tonEntre=(cod,d0,d1)=>{if(!PROD)return null;let t=0;Object.keys(PROD.sem||{}).forEach(w=>{const a=Math.max(msD(w),msD(d0)),b=Math.min(msD(sumaDias(w,7)),msD(d1));if(b>a)t+=((PROD.sem[w].m||{})[cod]||0)/1000*(b-a)/(7*864e5);});return t;};
  cat.maquinas.forEach(m=>{const P=todosPist().filter(p=>p.maq===m.id&&p.f>=lim);const fs=[...new Set(P.map(p=>p.f))].sort();if(fs.length<5)return;
    const iv=fs.slice(1).map((f,i)=>{const t=tonEntre(m.cod,fs[i],f);return{f,d:dias(fs[i],f),t};});const porT=PROD&&iv.every(z=>z.t!=null);const val=z=>porT?z.t:z.d;
    const prev=iv.slice(0,-1).map(val).sort((a,b)=>a-b),med=prev[Math.floor(prev.length/2)],u=iv[iv.length-1];
    if(u.f>=sumaDias(h,-14)&&med>0&&val(u)<0.5*med)o.push({clave:"dur:"+m.cod+":"+u.f,tipo:"dur",key:"dur:"+m.cod,niv:val(u)<0.3*med?"bad":"warn",tit:m.cod+" · Pistones",m,
      txt:"El último pistón (cambiado el "+fmtF(u.f)+") ha durado "+(porT?fmtN(Math.round(u.t*10)/10)+" t":u.d+" días")+"; lo normal en esta máquina es "+(porT?fmtN(Math.round(med*10)/10)+" t":Math.round(med)+" días")+".",eu:0});
    const rot=p=>/rot|romp|parti|agriet|fisur/i.test(p.motivo||"");const d60=sumaDias(h,-60),R60=P.filter(p=>p.f>=d60),Rant=P.filter(p=>p.f<d60);
    const n60=R60.filter(rot).length,s60=R60.length?n60/R60.length:0,sAnt=Rant.length?Rant.filter(rot).length/Rant.length:0;
    if(n60>=2&&s60>=Math.max(0.3,2*sAnt))o.push({clave:"rot:"+m.cod+":"+lunesA(h),tipo:"rot",key:"rot:"+m.cod,niv:"warn",tit:m.cod+" · Roturas de pistón",m,txt:n60+" de los "+R60.length+" cambios de los últimos 60 días han sido por rotura ("+Math.round(s60*100)+" %); antes era un "+Math.round(sAnt*100)+" %.",eu:0});});
  return o;}
const TIPO_D={pico:["Pico","bad"],tend:["Tendencia","warn"],baja:["Bajada rara","warn"],dur:["Duración","warn"],rot:["Roturas","warn"]};
/* todo junto, con las causas apuntadas */
function calcDesv(){if(_desvC&&_desvC.k===JSON.stringify([hoy(),todosMov().length,todosPist().length,todosMlog().length,PROD_EST,causasDesv().length,Object.keys(contAnos||{}).length]))return _desvC.r;
  const {S,ws,W0}=seriesDesv();const L=[];
  Object.values(S).forEach(x=>{const E=evalDesv(x,ws,W0);if(!E||!E.tipo)return;
    const pr=x.a?precioDe(x.a):x.tipo==="mf"&&x.fam==="Pistones"?precioDe(pistArt(((todosPist().filter(p=>p.maq===x.m.id).slice(-1)[0])||{}).diam)):0;
    const eu=x.eur?Math.max(0,E.exc):Math.max(0,E.exc)*pr;const porT=PROD_EST==="ok";
    const txt=E.tipo==="baja"?"Ni la "+semTxt(W0)+" ni la anterior hay nada apuntado y lo normal serían unos "+fmtDV(x,E.esp)+" por semana. ¿Se está apuntando?"
      :"La "+semTxt(W0)+": "+fmtDV(x,E.v0)+(porT?" para "+fmtN(Math.round(E.t0*10)/10)+" t":"")+"; lo normal serían unos "+fmtDV(x,E.esp)+" ("+(E.exc>=0?"+":"")+fmtDV(x,E.exc)+")."+(E.tipo==="tend"?" Lleva 3 semanas subiendo.":"")+(E.moldeNuevo?" Lleva un molde con poca historia en esta máquina.":"");
    L.push({clave:E.tipo+":"+x.key+":"+W0,tipo:E.tipo,key:x.key,niv:TIPO_D[E.tipo][1],tit:x.tit,txt,x,E,eu,m:x.m||null,a:x.a||null});});
  desvPist().forEach(d=>L.push(d));
  /* si salta la máquina entera y una familia suya, se queda la familia (es más concreta) salvo que la máquina sea más grave */
  const out=L.filter(d=>!(d.x&&d.x.tipo==="maq"&&L.some(o=>o.x&&o.x.tipo==="mf"&&o.x.cod===d.x.cod&&o.tipo===d.tipo)));
  const C=causasDesv(),lim=sumaDias(W0,-21);out.forEach(d=>{const c=C.filter(z=>z.key===d.key&&(z.sem||"")>=lim).pop();if(c)d.just=c;});
  const ord={bad:0,warn:1};out.sort((a,b)=>(a.just?1:0)-(b.just?1:0)||ord[a.niv]-ord[b.niv]||(b.eu||0)-(a.eu||0));
  const r={W0,ws,L:out};_desvC={k:JSON.stringify([hoy(),todosMov().length,todosPist().length,todosMlog().length,PROD_EST,causasDesv().length,Object.keys(contAnos||{}).length]),r};return r;}
/* guarda el resumen para el aviso al móvil (solo si cambia y el usuario puede escribir) */
let _desvG="";
function guardaDesvSemana(R){if(window.SOLO_CONSULTA||!db)return;const it=R.L.filter(d=>!d.just).map(d=>({clave:d.clave,txt:d.tit+" ("+TIPO_D[d.tipo][0].toLowerCase()+")"}));const u=JSON.stringify({sem:R.W0,it});
  const ya=DESV_DOCS.semana;if(u===_desvG||(ya&&JSON.stringify({sem:ya.sem,it:ya.items||[]})===u))return;_desvG=u;db.doc("desv/semana").set({sem:R.W0,items:it,ts:Date.now()}).catch(()=>{});}
function apuntarCausa(d,despues){let t="";
  dlg("Causa de la desviación",[el("p",{class:"hint",text:d.tit+": "+d.txt}),fld("¿Qué ha pasado?",inp("dvCausa","",v=>t=v,{autocomplete:"off",placeholder:"Molde nuevo, avería, prueba, fallo de apunte…"})),
    el("div",{class:"chips"},["Molde nuevo","Avería","Prueba","Error al apuntar","Más producción","Cambio de proveedor"].map(c=>el("button",{type:"button",class:"chip",text:c,onclick:()=>{const i=$("dvCausa");i.value=c;t=c;}})))],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{if(!String(t).trim()){toast("Escribe la causa");return false;}const R=calcDesv();
      const rec={id:uid(),key:d.key,tipo:d.tipo,sem:R.W0,tit:d.tit,txt:d.txt,causa:String(t).trim(),eu:Math.round(d.eu||0),f:hoy(),ts:Date.now()};
      try{const ref=db.doc("desv/causas"),sn=await ref.get();await ref.set({items:((sn.exists&&sn.data().items)||[]).concat([rec])});}catch(e){toast("No se pudo guardar");return false;}
      _desvC=null;toast("Causa apuntada");if(despues)despues();}}]);}
function sparkDesv(E){const vs=E.serie.map(p=>p.r||0),mx=Math.max(...vs,E.mu+2*E.sg,1e-9);
  return el("div",{"aria-hidden":"true",style:"display:grid;grid-template-columns:repeat("+vs.length+",1fr);gap:2px;align-items:end;height:42px;position:relative"},
    E.serie.map((p,i)=>el("div",{title:fmtF(p.w),style:"height:"+Math.max(2,Math.round((p.r||0)/mx*40))+"px;border-radius:2px;background:"+(i===vs.length-1?(p.r>E.mu+2*E.sg?"var(--bad)":"var(--warn)"):p.r==null?"var(--line)":"var(--acc)")+";opacity:"+(i===vs.length-1?1:.55)})));}
function vDesv(v){const R=calcDesv(),act=R.L.filter(d=>!d.just),jus=R.L.filter(d=>d.just);guardaDesvSemana(R);
  v.appendChild(el("dl",{class:"kpis num"},[["Semana",fmtF(R.W0).slice(0,5)+" – "+fmtF(sumaDias(R.W0,6)).slice(0,5)],["Desviaciones",String(act.length)],["De más (aprox.)",eur(act.reduce((s,d)=>s+(d.eu||0),0))],["Justificadas",String(jus.length)]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))));
  if(PROD_EST!=="ok")v.appendChild(el("div",{class:"banner",text:window.SIN_COLADAS?"Se compara el gasto sin tener en cuenta lo producido.":"Sin los datos de producción de Coladas: se compara sin dividir por toneladas. Se cargan solos cuando se abre Coladas."}));
  else v.appendChild(el("p",{class:"hint",text:"Gasto por tonelada de aluminio, comparado con las 12 semanas anteriores (sin las semanas paradas y, si cambia el molde, con las semanas de ese molde)."}));
  v.appendChild(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec",text:"Informe del mes",onclick:()=>informeDesv()})]));
  const card=d=>{const tp=TIPO_D[d.tipo];return el("section",{class:"card"+(d.just?"":d.niv==="bad"?" alerta":"")},[el("div",{class:"hd"},[el("h2",{text:d.tit}),el("span",{class:"pill "+(d.just?"ok":d.niv==="bad"?"bad":"warn"),text:d.just?"Justificada":tp[0]})]),
    el("div",{class:"bd",style:"display:grid;gap:8px"},[el("p",{style:"margin:0",text:d.txt}),d.eu?el("p",{class:"sub",style:"margin:0",text:"Gasto de más: unos "+eur(d.eu)}):null,d.E?sparkDesv(d.E):null,
      d.just?el("p",{class:"sub",style:"margin:0",text:"Causa: "+d.just.causa+" (apuntada el "+fmtF(d.just.f)+(d.just.por?" por "+d.just.por:"")+")"}):null,
      el("div",{class:"acciones"},[d.just?null:el("button",{type:"button",class:"btn sec peq",text:"Apuntar causa",onclick:()=>apuntarCausa(d,()=>render(true))}),
        d.m?el("button",{type:"button",class:"btn sec peq",text:"Ficha de la "+d.m.cod,onclick:()=>fichaIny(d.m)}):d.a?el("button",{type:"button",class:"btn sec peq",text:"Ficha",onclick:()=>ficha(d.a)}):null,
        d.x?el("button",{type:"button",class:"btn sec peq",text:"Comparar meses",onclick:()=>{draft.bd=draft.bd||{};draft.bd.q="compara el gasto de "+(d.x.tipo==="art"?nomArtC(d.x.a).toLowerCase():d.x.tipo==="mf"?d.x.fam.toLowerCase()+" de la "+d.x.cod:d.x.tipo==="cont"?"aceites":"la "+d.x.cod)+" este mes con los meses anteriores";irA("bd");}}):null])])]);};
  if(!act.length)v.appendChild(el("div",{class:"banner",text:"La "+semTxt(R.W0)+" no se ha salido nada de lo normal."}));
  act.forEach(d=>v.appendChild(card(d)));
  if(jus.length){v.appendChild(el("h3",{class:"sub",style:"margin:14px 2px 6px",text:"Justificadas (no vuelven a avisar en 4 semanas)"}));jus.forEach(d=>v.appendChild(card(d)));}}
/* informe del mes: gasto de cada máquina y artículo frente a lo normal (por tonelada, media de los 6 meses anteriores) y las causas apuntadas */
function datosInformeDesv(mes){const ms=[1,2,3,4,5,6].map(i=>mesMas(mes,-i)),G={};const add=(k,o,mm,eu,u)=>{const g=G[k]=G[k]||Object.assign({k,v:{}},o);const x=g.v[mm]=g.v[mm]||{eu:0,u:0};x.eu+=eu;x.u+=u;};
  evTodo().forEach(e=>{const mm=e.f.slice(0,7);if(mm!==mes&&!ms.includes(mm))return;const m=mqEv(e),a=e.a||(e.fam==="Pistones"?pistArt(e.ref):null);
    if(m)add("maq:"+m.cod,{tit:m.cod,cod:m.cod,tipo:"maq"},mm,e.eur,contable(e.ud)?e.cant:0);if(a)add("art:"+a.id,{tit:nomArtC(a),tipo:"art",a,ud:a.ud||"ud"},mm,e.eur,e.cant);});
  const ton=(g,mm)=>PROD?tonMes(mm,g.tipo==="maq"?g.cod:null):1;const ini=iniDatos();const mIni=g=>{const f=g.tipo==="art"&&g.a.fam==="piston"?ini.pist:g.tipo==="art"?ini.mov:[ini.pist,ini.rep,ini.mov].filter(Boolean).sort().pop();return f?mesMas(f.slice(0,7),1):"0000-00";};const C=causasDesv().filter(c=>(c.sem||"").slice(0,7)===mes||sumaDias(c.sem||"2000-01-01",6).slice(0,7)===mes);
  const R=Object.values(G).map(g=>{const val=mm=>(g.v[mm]||{eu:0,u:0}),usaEu=Object.values(g.v).some(x=>x.eu>0);const q=mm=>usaEu?val(mm).eu:val(mm).u;
    const b=ms.filter(mm=>ton(g,mm)>0&&mm>=mIni(g));const T=b.reduce((s,mm)=>s+ton(g,mm),0);if(b.length<1||!T)return null;const mu=b.reduce((s,mm)=>s+q(mm),0)/T,t=ton(g,mes);if(!(t>0))return null;
    const esp=mu*t,v=q(mes),exc=v-esp,pr=g.a?precioDe(g.a):0,eu=usaEu?exc:exc*pr;return Object.assign(g,{nb:b.length,usaEu,esp,v,exc,eu,pct:esp>0?Math.round(exc/esp*100):null,causas:C.filter(c=>c.key===g.k||c.key.startsWith("mf:"+(g.cod||"#")+"|")).map(c=>c.causa)});})
    .filter(g=>g&&g.exc>0&&g.pct!=null&&g.pct>=25&&(g.usaEu?g.exc>=50:g.exc>=(g.ud==="ud"?2:5))).sort((a,b)=>(b.eu||0)-(a.eu||0));
  return{R,C,ms};}
function informeDesv(){const h=hoy();const meses=[0,1,2,3,4,5].map(i=>mesMas(h.slice(0,7),-i));let mes=meses[+h.slice(8,10)<10?1:0];const box=el("div",{style:"display:grid;gap:10px"});
  const fv=g=>g.usaEu?eur(g.v):fmtN(Math.round(g.v*10)/10)+" "+(g.ud||"ud"),fe=g=>g.usaEu?eur(g.esp):fmtN(Math.round(g.esp*10)/10)+" "+(g.ud||"ud");
  const pinta=()=>{box.textContent="";const D=datosInformeDesv(mes);
    box.appendChild(fld("Mes",sel("dvMes",meses.map(m=>[m,cap(fmtMes(m))]),mes,v=>{mes=v;pinta();})));
    const tot=D.R.reduce((s,g)=>s+Math.max(0,g.eu||0),0);
    box.appendChild(el("p",{class:"bd-resp",text:D.R.length?cap(fmtMes(mes))+": "+D.R.length+(D.R.length===1?" desviación":" desviaciones")+(tot?", unos "+eur(tot)+" de más":"")+".":"En "+fmtMes(mes)+" nada se ha salido de lo normal."}));
    if(D.R.length)box.appendChild(cTabla(["","Gastado","Lo normal","Diferencia","Causa"],D.R.map(g=>[g.tit,fv(g),fe(g),(g.pct!=null?"+"+g.pct+" %":"nuevo")+(g.eu?" · "+eur(g.eu):""),g.causas.join("; ")||"—"]),[1,2,3]));
    if(D.R.some(g=>g.nb<3))box.appendChild(el("div",{class:"banner w",text:"Todavía hay pocos meses de referencia (hay datos de producción desde hace poco): tómalo como orientativo. Se afina solo cada mes."}));
    box.appendChild(el("p",{class:"hint",style:"margin:0",text:"Lo normal = gasto medio "+(PROD?"por tonelada ":"")+"de los 6 meses anteriores (solo los meses completos desde que se apunta cada cosa)"+(PROD?" × toneladas de este mes":"")+". Solo salen las que pasan de un 25 % y de 50 € (o 2 unidades)."}));
    const txt=["DESVIACIONES DE CONSUMO · "+fmtMes(mes).toUpperCase()].concat(D.R.map(g=>"- "+g.tit+": "+fv(g)+" (normal "+fe(g)+", "+(g.pct!=null?"+"+g.pct+" %":"nuevo")+(g.eu?", "+eur(g.eu)+" de más":"")+")"+(g.causas.length?" · Causa: "+g.causas.join("; "):""))).concat(tot?["","Total de más: "+eur(tot)]:[]).join("\n");
    box.appendChild(el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec",text:"Copiar",onclick:async()=>{try{await navigator.clipboard.writeText(txt);toast("Copiado");}catch(e){dlg("Para copiar",[el("textarea",{style:"width:100%;min-height:220px",text:txt})],[{t:"Cerrar",cls:"sec"}]);}}}),
      el("button",{type:"button",class:"btn sec",text:"Excel",onclick:e=>cExcel("Desviaciones "+fmtMes(mes),D.R.length?D.R.map(g=>({"Máquina o artículo":g.tit,"Gastado":Math.round(g.v*100)/100,"Lo normal":Math.round(g.esp*100)/100,"Unidad":g.usaEu?"€":(g.ud||"ud"),"Diferencia %":g.pct,"De más (€)":Math.round((g.eu||0)*100)/100,"Causa":g.causas.join("; ")})):[{"Máquina o artículo":"Sin desviaciones"}],e.currentTarget)})]));};
  pinta();dlg("Informe de desviaciones",[box],[{t:"Cerrar",cls:"sec"}]);}

/* ===== INVESTIGAR: el mismo panel para cualquier número de la app =====
   Una base de apuntes (cambios de pistón, consumos y reparaciones de eje) con lo mismo en todos: fecha, qué, cuánto, €, máquina, motivo y quién.
   Un filtro F = {t, d0, d1, arts:[id], maq:id, nave, fam, eje} dice qué apuntes forman ese número; el panel los reparte
   por motivo, máquina, artículo y quién, lo compara con lo normal (las 12 semanas anteriores), señala lo que llama la atención
   y deja completar lo que falta (motivo, responsable). Cada reparto se puede pulsar para bajar más. */
function evInv(){const L=[];
  todosPist().forEach(p=>{const c=+p.cant||1,a=pistArt(p.diam);L.push({k:"p",r:p,f:p.f,maq:p.maq,a,ref:"Pistón "+(p.diam||"?").replace(/^Ø\s*/,"Ø "),fam:"Pistones",cant:c,ud:"ud",eur:c*precioDe(a),mot:String(p.motivo||"").trim(),quien:p.resp?respTxt(p.resp):"",por:p.por||"",nota:p.nota||""});});
  todosMov().forEach(z=>{if(z.tipo!=="salida"||/^Cambio de pist/.test(z.nota||""))return;const a=art(z.art);if(!a)return;const c=+z.cant||0;
    L.push({k:"m",r:z,f:z.f,maq:z.maq||null,nave:z.nave||null,a,ref:nomArt(a),fam:famLbl(a),cant:c,ud:a.ud||"ud",eur:c*precioDe(a),mot:String(z.motivo||"").trim(),quien:z.resp?respTxt(z.resp):"",por:z.por||"",nota:z.nota||""});});
  todasRep().forEach(r=>{if(!r.env||r.res==="anulada"||r.recuento)return;const ok=r.res==="ok"&&r.rec;
    L.push({k:"r",r,f:r.env,maq:r.maq||null,a:null,ref:"Eje "+r.eje,eje:r.eje,fam:"Reparación de ejes",cant:1,ud:"eje",eur:ok?costeRep(r).v:0,mot:String(r.desp||"").trim()?motivoRep(r.desp):"",quien:r.por||"",por:r.por||"",nota:r.obs||""});});
  return L.filter(e=>e.f);}
const maqInv=e=>e.maq?(cat.maquinas.find(x=>x.id===e.maq||x.cod===e.maq)||null):null;
function casaInv(F,e){if(F.arts&&!(e.a&&F.arts.includes(e.a.id)))return false;if(F.fam&&e.fam!==F.fam)return false;if(F.eje&&e.eje!==F.eje)return false;
  if(F.maq){const m=maqInv(e);if(!m||m.id!==F.maq)return false;}
  if(F.nave){const m=maqInv(e);const z=m?zonaDe(m):(e.nave||"");if(!(" "+nq(z)+" ").includes(" "+nq(F.nave)))return false;}return true;}
function datosInv(F){const E=evInv().filter(e=>casaInv(F,e)),d0=F.d0,d1=F.d1,len=Math.max(1,dias(d0,d1)+1),B0=sumaDias(d0,-84),kB=len/84;
  const en=E.filter(e=>e.f>=d0&&e.f<=d1).sort((a,b)=>b.f.localeCompare(a.f)),base=E.filter(e=>e.f>=B0&&e.f<d0);
  /* en qué se mide: unidades si todo es lo mismo; si no, euros (si hay precios); si no, apuntes */
  const uds=[...new Set(en.concat(base).map(e=>e.ud))],conEur=en.concat(base).filter(e=>e.eur>0).length;
  const modo=uds.length===1?"u":conEur>=0.8*en.concat(base).length&&conEur>0?"e":"n";const val=e=>modo==="u"?e.cant:modo==="e"?e.eur:1;const ud=modo==="u"?uds[0]:modo==="e"?"€":"apuntes";
  const fmt=v=>modo==="e"?eur(v):fmtN(Math.round(v*10)/10)+(modo==="u"?" "+ud:"");
  const grupo=(f,X)=>{const G={};X.forEach(e=>{const k=f(e);if(k==null)return;const g=G[k]=G[k]||{k,v:0,n:0,L:[]};g.v+=val(e);g.n++;g.L.push(e);});return G;};
  const reparte=f=>{const A=grupo(f,en),B=grupo(f,base);return Object.values(A).map(g=>Object.assign(g,{normal:(B[g.k]?B[g.k].v:0)*kB})).concat(Object.values(B).filter(g=>!A[g.k]).map(g=>({k:g.k,v:0,n:0,L:[],normal:g.v*kB}))).filter(g=>g.v>0||g.normal>=0.5).sort((a,b)=>b.v-a.v||b.normal-a.normal);};
  const tot=en.reduce((s,e)=>s+val(e),0),totB=base.reduce((s,e)=>s+val(e),0)*kB,eurT=en.reduce((s,e)=>s+e.eur,0);
  const mot=reparte(e=>e.mot?cap(e.mot):"Sin motivo"),maq=F.maq?[]:reparte(e=>{const m=maqInv(e);return m?m.cod:(e.nave||"Sin máquina");}),
    artG=F.arts&&F.arts.length===1?[]:reparte(e=>e.ref),qui=reparte(e=>e.quien||"Sin responsable");
  /* cuándo: semanas (o meses si el periodo es largo) */
  const largo=len>70,claves=[];if(largo){let m=d1.slice(0,7);for(let i=0;i<12;i++){claves.unshift(m);m=sumaDias(m+"-01",-1).slice(0,7);}}else{let w=lunesA(d1);for(let i=0;i<14;i++){claves.unshift(w);w=sumaDias(w,-7);}}
  const kOf=f=>largo?f.slice(0,7):lunesA(f),serie=claves.map(k=>({k,v:0}));const ix={};serie.forEach((s,i)=>ix[s.k]=i);E.forEach(e=>{const k=kOf(e.f);if(ix[k]!=null)serie[ix[k]].v+=val(e);});
  /* lo que llama la atención */
  const hint=[];const pct=totB>0?Math.round((tot/totB-1)*100):null;
  if(pct!=null&&Math.abs(pct)>=30&&Math.abs(tot-totB)>=(modo==="e"?20:1.5))hint.push({niv:pct>0?"bad":"ok",t:(pct>0?"Un "+pct+" % más":"Un "+(-pct)+" % menos")+" de lo normal ("+fmt(tot)+" frente a unos "+fmt(totB)+")."});
  const hayBase=base.length>0;if(!hayBase&&tot>0)hint.push({niv:"info",t:"En las 12 semanas de antes no hay nada apuntado, así que no se puede comparar con lo normal."});
  if(hayBase)mot.filter(g=>g.k!=="Sin motivo"&&g.n>=2&&g.v>=2*Math.max(g.normal,0.5)).slice(0,2).forEach(g=>hint.push({niv:"bad",t:"Se ha disparado «"+g.k.toLowerCase()+"»: "+fmt(g.v)+(g.normal>=0.05?" cuando lo normal serían unos "+fmt(g.normal):" y antes no había ninguno")+"."}));
  if(maq.length>1&&tot>0){const g=maq[0];if(g.v/tot>=0.5&&g.n>=2)hint.push({niv:"warn",t:"El "+Math.round(g.v/tot*100)+" % es de la "+g.k+(!hayBase?"":g.normal>=0.05?" (lo normal ahí serían unos "+fmt(g.normal)+")":" (antes no gastaba)")+"."});}
  artG.filter(g=>g.v>0&&g.normal<0.01&&base.length).slice(0,3).forEach(g=>hint.push({niv:"warn",t:g.k+": antes no se gastaba y ahora "+fmt(g.v)+"."}));
  if(qui.length>1&&en.length>=4){const g=qui[0];if(g.k!=="Sin responsable"&&g.n/en.length>=0.6)hint.push({niv:"info",t:g.n+" de "+en.length+" apuntes son de "+g.k+"."});}
  const ms=[...new Set(en.map(e=>maqInv(e)).filter(Boolean))];if(ms.length&&ms.length<=3)ms.forEach(m=>{const ch=todosMlog().filter(x=>x.tipo==="molde"&&x.maq===m.id&&x.f>=sumaDias(d0,-14)&&x.f<=d1);
    if(ch.length){const u=ch[ch.length-1];hint.push({niv:"info",t:"La "+m.cod+" cambió de molde el "+fmtF(u.f)+(u.val?" (pone el "+(moldeTxt(moldeDe(u.val))||u.val)+")":"")+": puede explicar el cambio de gasto."});}});
  const sm=en.filter(e=>!e.mot&&e.k!=="m").length+en.filter(e=>e.k==="m"&&!e.mot&&e.a&&["barra","tornillo","horno"].includes(e.a.fam)).length,sr=en.filter(e=>!e.quien).length,sp=modo==="e"?en.filter(e=>!(e.eur>0)).length:0,sq=en.filter(e=>!maqInv(e)&&!e.nave&&e.k!=="r").length;
  const falta=[sm?sm+" sin motivo":null,sr?sr+" sin responsable":null,sq?sq+" sin máquina":null,sp?sp+" sin precio":null].filter(Boolean);
  return{F,en,tot,totB,eurT,fmt,ud,modo,mot,maq,artG,qui,serie,largo,hint,falta,len};}
function sugInv(D){if(!D.tot)return"";const t=D.mot.find(g=>g.k!=="Sin motivo"&&g.v>0),m=D.maq[0];
  return [t?fmtN(t.n)+" de "+fmtN(D.en.length)+" por "+t.k.toLowerCase():null,m&&m.k!=="Sin máquina"&&D.tot&&m.v/D.tot>=0.4?"sobre todo en la "+m.k:null].filter(Boolean).join(", ");}
const perInvTxt=F=>F.per||("del "+fmtF(F.d0)+" al "+fmtF(F.d1));
/* el panel; o = {intro, acciones:[{t,fn}], prev} */
function investigar(F,o){o=o||{};const D=datosInv(F),reabre=()=>investigar(F,o);
  const fila=(t1,t2,b,on,cls)=>el(on?"button":"div",{type:on?"button":null,class:"it",style:on?null:"cursor:default",onclick:on||null},[el("span",{class:"stripe "+(cls||"ok")}),el("div",{class:"ppal"},[el("div",{class:"t1",text:t1}),t2?el("div",{class:"t2",text:t2}):null]),b!=null?el("div",{class:"num",style:"font-weight:600;white-space:nowrap",text:b}):null]);
  const bloque=(tit,rows)=>rows.length?el("div",{style:"display:grid;gap:4px"},[el("div",{class:"sub",style:"font-weight:600",text:tit}),el("div",{class:"lst"},rows)]):null;
  const baja=extra=>()=>{cierraDlgs();investigar(Object.assign({},F,extra),{prev:reabre});};
  const normalTxt=g=>g.normal>=0.05?"Lo normal: "+D.fmt(g.normal):(D.totB>0?"Antes no había":null);
  const nivG=g=>g.k==="Sin motivo"||g.k==="Sin responsable"?"warn":g.v>Math.max(1,2*g.normal)&&g.n>=2?"bad":g.v<0.5*g.normal?"ok":"ok";
  const mx=Math.max(...D.serie.map(s=>s.v),1e-9),ult=D.largo?D.F.d1.slice(0,7):lunesA(D.F.d1);
  const barras=el("div",{"aria-hidden":"true",style:"display:grid;grid-template-columns:repeat("+D.serie.length+",1fr);gap:2px;align-items:end;height:46px"},
    D.serie.map(s=>el("div",{title:(D.largo?fmtMes(s.k):"Semana del "+fmtF(s.k))+": "+D.fmt(s.v),style:"height:"+Math.max(2,Math.round(s.v/mx*44))+"px;border-radius:2px;background:"+(s.k>=(D.largo?D.F.d0.slice(0,7):lunesA(D.F.d0))&&s.k<=ult?"var(--warn)":"var(--acc)")+";opacity:"+(s.k<=ult?1:.35)})));
  const body=[o.intro?el("p",{class:"hint",style:"margin:0",text:o.intro}):null,
    el("p",{style:"margin:0;font-weight:600",text:D.en.length?D.fmt(D.tot)+" en "+perInvTxt(F)+(D.modo!=="n"?" ("+D.en.length+(D.en.length===1?" apunte":" apuntes")+")":"")+(D.modo==="u"&&D.eurT>0?" · "+eur(D.eurT):"")+".":"No hay nada apuntado en "+perInvTxt(F)+"."}),
    D.hint.length?el("div",{style:"display:grid;gap:4px"},[el("div",{class:"sub",style:"font-weight:600",text:"Lo que llama la atención"})].concat(D.hint.map(h=>el("div",{class:"banner"+(h.niv==="bad"?" w":""),style:"margin:0",text:h.t})))):null,
    D.falta.length?el("div",{class:"banner w",style:"margin:0",text:"Falta información: "+D.falta.join(", ")+". Pulsa en cada apunte para completarlo."}):null,
    el("div",{style:"display:grid;gap:4px"},[el("div",{class:"sub",style:"font-weight:600",text:"Cuándo ("+(D.largo?"por meses":"por semanas")+"; en naranja, el periodo que miras)"}),barras]),
    bloque("Por motivo",D.mot.map(g=>fila(g.k,normalTxt(g),D.fmt(g.v),null,nivG(g)))),
    bloque("Por máquina (pulsa para ver solo esa)",D.maq.map(g=>{const m=cat.maquinas.find(x=>x.cod===g.k);return fila(g.k,normalTxt(g),D.fmt(g.v),m?baja({maq:m.id,t:F.t+" · "+m.cod}):null,nivG(g));})),
    bloque("Por artículo (pulsa para ver solo ese)",D.artG.map(g=>{const e=g.L[0]||{};return fila(g.k,normalTxt(g),D.fmt(g.v),e.a?baja({arts:[e.a.id],t:g.k+(F.maq?" · "+maqN(F.maq):"")}):null,nivG(g));})),
    bloque("Quién",D.qui.filter(g=>g.v>0).map(g=>fila(g.k,g.n+(g.n===1?" apunte":" apuntes"),D.fmt(g.v),null,g.k==="Sin responsable"?"warn":"ok"))),
    bloque("Cada apunte (pulsa para completar o abrir)",D.en.slice(0,80).map(e=>{const pide=e.k!=="r"&&(!e.quien||(!e.mot&&(e.k==="p"||(e.a&&["barra","tornillo","horno"].includes(e.a.fam)))));
      return fila(fmtF(e.f)+" · "+(maqInv(e)?maqInv(e).cod:(e.nave||"—"))+" · "+e.ref,[e.mot?cap(e.mot):(e.k==="m"&&!(e.a&&["barra","tornillo","horno"].includes(e.a.fam))?null:"sin motivo"),e.quien||"sin responsable",e.por&&!e.quien?"lo apuntó "+e.por:null,e.nota&&!/^Cambio de /.test(e.nota)?e.nota:null].filter(Boolean).join(" · "),
        fmtN(e.cant)+(e.ud&&e.ud!=="ud"?" "+e.ud:""),e.k==="r"?()=>{const x=ejes.find(z=>z.cod===e.eje);if(x){cierraDlgs();fichaEje(x);}}:()=>{cierraDlgs();completarCambio(e.r,e.k==="p",{sinMot:e.k==="m"&&!(e.a&&["barra","tornillo","horno"].includes(e.a.fam)),despues:reabre});},pide?"warn":"ok");}))];
  dlg("Investigar: "+F.t,[el("div",{class:"inv",style:"display:grid;gap:12px;max-height:64vh;overflow:auto"},body)],
    (o.prev?[{t:"‹ Atrás",cls:"sec",fn:()=>{setTimeout(o.prev,0);}}]:[]).concat([{t:"Cerrar",cls:"sec"}]).concat((o.acciones||[{t:"Apuntar conclusión",fn:D=>formConclusion(F,D)}]).map(a=>({t:a.t,fn:()=>{setTimeout(()=>a.fn(D),0);}}))));}
/* «Investigar esto» debajo de una pregunta de Consultas: saca máquina, artículos, nave y periodo de lo que se ha escrito */
function filtroInvQ(q){const F={};const m=maqDeQ(q);if(m)F.maq=m.id;const nv=naveQA(q);if(nv&&!m)F.nave=nv;
  if(/\b(reparacion\w* de ejes?|ejes? (al|en el) taller)\b/.test(q))F.fam="Reparación de ejes";
  else{const A=artsQ(q),tot=artsActivos().filter(a=>a.fam!=="eje").length;if(A.L.length&&A.L.length<tot&&A.L.length<=60)F.arts=A.L.map(a=>a.id);}
  if(!F.maq&&!F.nave&&!F.arts&&!F.fam)return null;
  const P=periodoQ(q),h=hoy();if(P&&P.re&&P.d){F.d0=P.d;F.d1=P.h>h?h:P.h;F.per=P.t;}else{F.d0=sumaDias(h,-29);F.d1=h;F.per="los últimos 30 días";}
  if(F.d0>F.d1)return null;
  const art1=F.arts&&F.arts.length===1?nomArt(art(F.arts[0])):F.arts?(()=>{const fs=[...new Set(F.arts.map(id=>famLbl(art(id))))];return fs.length===1?fs[0]:F.arts.length+" artículos";})():F.fam||null;
  F.t=[art1,m?m.cod:null,F.nave?cap(F.nave):null].filter(Boolean).join(" · ");return F;}
function botonInvQ(res,q){const F=filtroInvQ(nq(q));if(!F)return;const b=el("button",{type:"button",class:"btn sec",style:"justify-self:start;margin:6px 0",text:"🔎 Investigar esto ("+F.t+", "+F.per+")",onclick:()=>investigar(F)});
  const ent=res.querySelector(".bd-ent");if(ent&&ent.nextSibling)res.insertBefore(b,ent.nextSibling);else res.appendChild(b);}
/* ===== CONCLUSIONES: causa + acción + comprobación a las semanas ===== 
   colección «inv», doc «lista», items {id,f,t,F,causa,accion,resp,rev,antes:{pd,modo,ud,per},estado:"abierta"|"cerrada"|"funciono"|"no",res:{f,pd,pct},por,ts,desv} */
let INV=[];
const filtroSinFechas=F=>{const o={};["t","arts","maq","nave","fam","eje"].forEach(k=>{if(F[k]!=null)o[k]=F[k];});return o;};
async function invGuarda(fn){const ref=db.doc("inv/lista"),sn=await ref.get();const L=(sn.exists&&sn.data().items)||[];await ref.set({items:fn(L.slice())});}
function formConclusion(F,D,o){o=o||{};if(window.SOLO_CONSULTA||!db){toast("Desde aquí no se puede apuntar");return;}
  const v={causa:o.sug!=null?o.sug:sugInv(D),accion:"",resp:"",sem:"4"};
  const box=el("div",{style:"display:grid;gap:10px"});const pinta=()=>{box.textContent="";
    box.appendChild(el("p",{class:"hint",style:"margin:0",text:F.t+" · "+perInvTxt(F)+(D.tot?": "+D.fmt(D.tot)+(D.totB>0?" (lo normal, unos "+D.fmt(D.totB)+")":""):"")}));
    box.appendChild(fld("Causa: ¿qué ha pasado?",inp("cnCausa",v.causa,x=>v.causa=x,{autocomplete:"off",placeholder:"Molde nuevo, avería, fallo de apunte…"})));
    box.appendChild(el("div",{class:"chips"},["Molde nuevo","Avería","Prueba","Error al apuntar","Más producción","Cambio de proveedor"].map(c=>el("button",{type:"button",class:"chip",text:c,onclick:()=>{v.causa=c;pinta();}}))));
    box.appendChild(fld("Acción (opcional): ¿qué se va a hacer?",inp("cnAcc",v.accion,x=>v.accion=x,{autocomplete:"off",placeholder:"Revisar la refrigeración, hablar con el turno…"})));
    box.appendChild(el("div",{class:"chips"},["Revisar la máquina","Revisar refrigeración","Hablar con el turno","Cambiar de proveedor","Apuntar mejor"].map(c=>el("button",{type:"button",class:"chip",text:c,onclick:()=>{v.accion=c;pinta();}}))));
    if(String(v.accion).trim()){box.appendChild(fld("Quién se encarga (opcional)",inp("cnResp",v.resp,x=>v.resp=x,{autocomplete:"off"})));
      box.appendChild(el("div",{},[el("div",{class:"sub",style:"margin-bottom:6px",text:"Comprobar si ha funcionado dentro de"}),el("div",{class:"seg",role:"group","aria-label":"Comprobar en"},[["2","2 semanas"],["4","4 semanas"],["8","8 semanas"]].map(([k,t])=>el("button",{type:"button","aria-pressed":String(v.sem===k),text:t,onclick:()=>{v.sem=k;pinta();}})))]));
      box.appendChild(el("p",{class:"hint",style:"margin:0",text:"Ese día la app compara el gasto de después con el de ahora y te avisa en Hoy."}));}};
  pinta();
  dlg(o.desv?"Causa y acción":"Conclusión",[box],[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const causa=String(v.causa).trim(),acc=String(v.accion).trim();if(!causa){toast("Escribe la causa");return false;}
    const h=hoy(),rec={id:uid(),f:h,t:F.t,F:filtroSinFechas(F),causa,accion:acc||null,resp:String(v.resp).trim()||null,rev:acc?sumaDias(h,7*(+v.sem)):null,
      antes:{pd:D.tot/Math.max(1,D.len),modo:D.modo,ud:D.ud,per:perInvTxt(F),tot:D.tot,normal:D.totB},estado:acc?"abierta":"cerrada",por:(window.yoNombre&&window.yoNombre())||"",ts:Date.now()};
    if(o.desv)rec.desv=o.desv.clave||o.desv.key;
    try{await invGuarda(L=>L.concat([rec]));if(o.desv)await guardaCausaDesv(o.desv,causa+(acc?" · Acción: "+acc:""));}catch(e){toast("No se pudo guardar");return false;}
    const i=INV.findIndex(x=>x.id===rec.id);if(i<0)INV.push(rec);
    toast(acc?"Guardado. Se comprobará el "+fmtF(rec.rev):"Conclusión guardada");render(true);}}]);}
/* comprobar: gasto al día desde que se apuntó, frente al gasto al día del periodo investigado */
function evalConclusion(c){const h=hoy(),d1=c.rev&&c.rev<h?c.rev:h,d0=sumaDias(c.f,1);if(d0>d1)return{pend:true,pd:0,pct:null,dias:0};
  const D=datosInv(Object.assign({},c.F,{d0,d1})),n=Math.max(1,dias(d0,d1)+1),pd=D.tot/n,a=c.antes&&c.antes.pd||0;
  return{pend:!c.rev||c.rev>h,pd,pct:a>0?Math.round((pd/a-1)*100):null,dias:n,fmt:D.fmt,D};}
const resConcTxt=(c,E)=>E.pct==null?"No se puede comparar (antes no había gasto)":E.pct<=-20?"Ha bajado un "+(-E.pct)+" %: parece que ha funcionado":E.pct>=20?"Ha subido un "+E.pct+" %: no ha funcionado":"Sigue más o menos igual ("+(E.pct>0?"+":"")+E.pct+" %)";
async function cierraConclusion(c,estado,E){try{await invGuarda(L=>L.map(x=>x.id===c.id?Object.assign({},x,estado==="mas"?{rev:sumaDias(hoy(),28)}:{estado,res:{f:hoy(),pd:E?E.pd:null,pct:E?E.pct:null}}):x));}catch(e){toast("No se pudo guardar");return false;}
  toast(estado==="mas"?"Se vuelve a comprobar en 4 semanas":"Guardado");render(true);}
function fichaConclusion(c){const E=evalConclusion(c),h=hoy();const F={...c.F,d0:sumaDias(h,-27),d1:h,per:"los últimos 28 días"};
  const L=[["Investigado",fmtF(c.f)+" · "+(c.antes&&c.antes.per||"")],["Causa",c.causa],["Acción",c.accion||"—"],["Se encarga",c.resp||"—"],c.rev?["Comprobar",fmtF(c.rev)]:null,
    c.res?["Resultado",(c.estado==="funciono"?"Ha funcionado":c.estado==="no"?"No ha funcionado":"—")+(c.res.pct!=null?" ("+(c.res.pct>0?"+":"")+c.res.pct+" %)":"")+" · "+fmtF(c.res.f)]:null,c.por?["Apuntado por",c.por]:null].filter(Boolean);
  const body=[el("dl",{class:"bd-kv"},[].concat(...L.map(([a,b])=>[el("dt",{text:a}),el("dd",{text:b})])))];
  if(c.estado==="abierta"&&E.dias)body.push(el("div",{class:"banner"+(E.pct!=null&&E.pct>=20?" w":""),style:"margin:0",text:"Desde que se apuntó ("+E.dias+" días): "+resConcTxt(c,E)+"."+(E.pend?" Aún no ha llegado la fecha de comprobar.":"")}));
  const acts=[{t:"Cerrar",cls:"sec"},{t:"Investigar ahora",cls:"sec",fn:()=>{setTimeout(()=>investigar(F),0);}}];
  if(c.estado==="abierta")acts.push({t:"No ha funcionado",cls:"sec",fn:()=>cierraConclusion(c,"no",E)},{t:"4 semanas más",cls:"sec",fn:()=>cierraConclusion(c,"mas",E)},{t:"Ha funcionado",fn:()=>cierraConclusion(c,"funciono",E)});
  dlg(c.t,body,acts);}
const invPorComprobar=()=>INV.filter(c=>c.estado==="abierta"&&c.rev&&c.rev<=hoy());
function cardConclusiones(){if(!INV.length)return null;const ab=INV.filter(c=>c.estado==="abierta").sort((a,b)=>(a.rev||"").localeCompare(b.rev||"")),ce=INV.filter(c=>c.estado!=="abierta").sort((a,b)=>b.f.localeCompare(a.f)).slice(0,10),h=hoy();
  const fila=c=>el("button",{type:"button",class:"it",onclick:()=>fichaConclusion(c)},[el("span",{class:"stripe "+(c.estado==="abierta"?(c.rev<=h?"bad":"warn"):c.estado==="funciono"?"ok":c.estado==="no"?"bad":"")}),
    el("div",{class:"ppal"},[el("div",{class:"t1",text:c.t}),el("div",{class:"t2",text:[c.causa,c.accion?"Acción: "+c.accion:null,c.estado==="abierta"?(c.rev<=h?"toca comprobar":"comprobar el "+fmtF(c.rev)):c.estado==="funciono"?"funcionó":c.estado==="no"?"no funcionó":null].filter(Boolean).join(" · ")})]),el("div",{class:"cant"},el("small",{text:fmtF(c.f)}))]);
  return el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Investigaciones y acciones"}),el("span",{class:"der sub",text:ab.length?ab.length+" en marcha":""})]),
    ab.length?el("div",{class:"lst"},ab.map(fila)):null,ce.length?el("details",{},[el("summary",{class:"sub",style:"padding:8px 14px;cursor:pointer",text:"Cerradas ("+INV.filter(c=>c.estado!=="abierta").length+")"}),el("div",{class:"lst"},ce.map(fila))]):null]);}
function concDelMes(mes){return INV.filter(c=>c.f.slice(0,7)===mes||(c.res&&c.res.f.slice(0,7)===mes)).sort((a,b)=>a.f.localeCompare(b.f));}
const concTxt=c=>c.t+": "+c.causa+(c.accion?" · Acción: "+c.accion+(c.resp?" ("+c.resp+")":""):"")+" · "+(c.estado==="abierta"?"comprobar el "+fmtF(c.rev):c.estado==="funciono"?"funcionó":c.estado==="no"?"no funcionó":"sin acción");
/* desde las fichas */
function invArt(a){const h=hoy(),st=stockDe(a.id),c=consDia(a),pl=plazoDe(a);
  const intro="Hay "+fmtN(st)+" "+a.ud+(+a.min?" (mínimo "+fmtN(+a.min)+")":"")+". Se gastan unos "+fmtN(Math.round(c*300)/10)+" al mes"+(c>0?" (da para "+Math.floor(st/c)+" días)":"")+"; el proveedor tarda "+pl+" días"+(a.pedido?". Pedido el "+fmtF(a.pedido)+(a.prevista?", llega el "+fmtF(a.prevista)+(a.prevista<h?" (con retraso)":""):""):". No hay pedido en marcha")+".";
  investigar({t:TEC(a.fam)?nomBT(a):a.desc,arts:[a.id],d0:sumaDias(h,-89),d1:h,per:"los últimos 90 días"},{intro});}
function introEje(e){const R=todasRep().filter(r=>r.eje===e.cod&&r.env&&r.res!=="anulada"&&!r.recuento).sort((a,b)=>a.env.localeCompare(b.env));if(!R.length)return"Este eje no ha ido nunca al taller.";
  const T=R.filter(r=>r.rec&&r.res).map(r=>dias(r.env,r.rec)),iv=[];for(let i=1;i<R.length;i++)if(R[i-1].rec)iv.push(dias(R[i-1].rec,R[i].env));
  return R.length+(R.length===1?" vez":" veces")+" al taller"+(T.length?"; tarda de media "+Math.round(T.reduce((s,x)=>s+x,0)/T.length)+" días en volver":"")+(iv.length?"; aguanta en planta unos "+Math.round(iv.reduce((s,x)=>s+x,0)/iv.length)+" días entre reparaciones":"")+".";}

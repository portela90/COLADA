/* ===== CONSULTAS POR RELEVO Y POR GESTOR =====
   Cambios y roturas de pistones, barras expulsoras, tornillos tope, tolvas y recambios de horno, repartidos por relevo
   (mañana, tarde, noche) o por gestor. El relevo sale del apunte (casilla «Relevo») o, si no la tiene y se apuntó el mismo
   día, de la hora. El gestor sale del apunte (casilla «Gestor») o, si no se eligió, de los gestores de ese relevo
   («Gestores y relevos»): entonces cuenta para los dos. Para comparar justo, se da también por cada 10 relevos trabajados. */
const RQ_TURNO=h=>h>=6&&h<14?"Mañana":h>=14&&h<22?"Tarde":"Noche";
function relevoRec(r){if(r&&RELEVOS_A.includes(r.u))return r.u;if(r&&r.ts&&r.f){const d=new Date(+r.ts);const f=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");if(f===r.f)return RQ_TURNO(d.getHours());}return null;}
function gestoresRec(r,u){if(r.gest)return[r.gest];if(!u||typeof gestEn!=="function")return[];return gestEn(r.f,u);}
const RQ_CATS=[["pist","Pistones"],["barra","Barras expulsoras"],["tornillo","Tornillos tope"],["tolva","Tolvas"],["horno","Recambios de horno"]];
/* todos los cambios (un evento por apunte) */
function eventosCambio(d0,d1){const E=[];
  todosPist().forEach(p=>{if(!p.f||p.f<d0||p.f>d1)return;E.push({f:p.f,ts:p.ts,u:p.u,gest:p.gest,maq:p.maq,cant:+p.cant||1,mot:String(p.motivo||"").toUpperCase(),cat:"pist",que:"Pistón "+(p.diam||""),resp:p.resp});});
  todosMov().forEach(m=>{if(m.tipo!=="salida"||m.inc||!m.f||m.f<d0||m.f>d1)return;const a=art(m.art);if(!a||!["barra","tornillo","horno"].includes(a.fam))return;
    const cat=a.fam==="horno"&&(/tolva/i.test(a.desc||"")||/tolva/i.test(a.grupo||""))?"tolva":a.fam;
    E.push({f:m.f,ts:m.ts,u:m.u,gest:m.gest,maq:m.maq,cant:+m.cant||1,mot:String(m.motivo||"").toUpperCase(),cat,que:a.desc,resp:m.resp});});
  return E;}
function intencionRel(q){
  const dimG=/\bgestor(es)?\b/.test(q),dimR=/\b(relevos?|turnos?)\b/.test(q);
  const G=(typeof gCfg==="function"?gCfg().lista:[]).filter(x=>{const w=norm(x.n);return w&&new RegExp("(^|\\s)"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(\\s|$)").test(q);});
  const R=(q.match(/\b(manana|tarde|noche)\b/)||[])[1];
  if(!dimG&&!dimR&&!G.length)return null;
  const cosa=/\b(piston\w*|barras?|expulsor\w*|tornillos?|tolvas?|horno|resistencias?|cambios?|cambia\w*|roturas?|rompe\w*|rot[oa]s?|agarrot\w*|desgaste|fugas?|preventiv\w*)\b/.test(q);
  if(!cosa)return null;
  if(G.length&&!dimG&&!dimR&&/\b(que ha hecho|que hizo)\b/.test(q))return null;
  const o={dim:dimG?"gest":dimR?"rel":null,gests:G.map(x=>x.id),relevo:R?{manana:"Mañana",tarde:"Tarde",noche:"Noche"}[R]:null};
  o.cat=/\bpiston\w*/.test(q)?"pist":/\b(barras?|expulsor\w*)\b/.test(q)?"barra":/\btornillos?\b/.test(q)?"tornillo":/\btolvas?\b/.test(q)?"tolva":/\b(horno|resistencias?)\b/.test(q)?"horno":null;
  o.mot=/\b(roturas?|rompe\w*|rot[oa]s?)\b/.test(q)?"ROTURA":/\bagarrot\w*/.test(q)?"AGARROT":/\bdesgaste\b/.test(q)?"DESGASTE":/\bfugas?\b/.test(q)?"FUGA":/\bpreventiv\w*/.test(q)?"PREVENTIVO":null;
  o.porMaq=/\b(por maquinas?|por inyectoras?|y maquinas?|y inyectoras?|en que maquina|que maquinas?|que inyectoras?)\b/.test(q);
  o.porMot=/\b(por motivo|motivos?|por que)\b/.test(q);
  return o;}
function pintaRelQ(I,P,ctx){const {add,frase,nota,ent,lista,it}=ctx;const h=hoy(),o=I.rel||{};
  const per=P.def?{d:h.slice(0,7)+"-01",h,t:"este mes"}:P;
  const catT=o.cat?(RQ_CATS.find(c=>c[0]===o.cat)||[])[1]:"Cambios (pistones, barras, tornillos, tolvas y horno)";
  const motT=o.mot==="ROTURA"?"roturas":o.mot==="AGARROT"?"agarrotados":o.mot?o.mot.toLowerCase():null;
  ent("cambios por "+(o.dim==="gest"||o.gests.length?"gestor":"relevo"),[o.cat?catT:null,motT,o.relevo?o.relevo.toLowerCase():null,o.gests.length?o.gests.map(nomGest).join(", "):null,per.t]);
  let E=eventosCambio(per.d,per.h).filter(e=>(!o.cat||e.cat===o.cat)&&(!o.mot||(o.mot==="ROTURA"?/ROTUR|ROT[OA]|DOBLAD/.test(e.mot):e.mot.includes(o.mot))));
  E.forEach(e=>{e.rel=relevoRec(e);e.gs=gestoresRec(e,e.rel);});
  if(o.relevo)E=E.filter(e=>e.rel===o.relevo);
  if(o.gests.length)E=E.filter(e=>e.gs.some(g=>o.gests.includes(g)));
  const qty=L=>L.reduce((s,e)=>s+e.cant,0),nom=(o.mot?motT:o.cat==="pist"?"cambios de pistón":"cambios");
  if(!E.length){frase("No hay "+nom+(o.cat&&o.cat!=="pist"?" de "+catT.toLowerCase():"")+(o.relevo?" en el relevo de "+o.relevo.toLowerCase():"")+(o.gests.length?" con "+o.gests.map(nomGest).join(" o "):"")+" "+per.t+".");
    if(o.dim==="gest"&&!(typeof gCfg==="function"&&Object.keys(gCfg().sem).length))nota("Pon los gestores de cada relevo en Más › Gestión › Gestores y relevos.");return;}
  /* relevos trabajados en el periodo (para comparar por cada 10) */
  const dias=[];for(let f=per.d;f<=per.h&&f<=h;f=sumaDias(f,1))dias.push(f);
  const relTrab=u=>dias.length,gestTrab=id=>dias.reduce((s,f)=>s+RELEVOS_A.filter(u=>gestEn(f,u).includes(id)).length,0);
  const r10=(n,rel)=>rel?(Math.round(n/rel*100)/10).toString().replace(".",","):"—";
  const motTop=L=>{const M={};L.forEach(e=>{const k=e.mot?cap(e.mot):"Sin motivo";M[k]=(M[k]||0)+e.cant;});return Object.entries(M).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,n])=>k+" "+n).join(" · ");};
  const maqTop=L=>{const M={};L.forEach(e=>{const k=e.maq?maqN(e.maq):"sin máquina";M[k]=(M[k]||0)+e.cant;});return Object.entries(M).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,n])=>k+" "+n).join(" · ");};
  const sinRel=E.filter(e=>!e.rel);
  if(o.dim==="gest"||(o.gests.length&&!o.dim)){
    const G={};E.forEach(e=>e.gs.forEach(g=>{(G[g]=G[g]||[]).push(e);}));
    const filas=Object.keys(G).map(id=>({id,n:nomGest(id),L:G[id],q:qty(G[id]),rel:gestTrab(id)})).filter(x=>!o.gests.length||o.gests.includes(x.id)).sort((a,b)=>(b.rel?b.q/b.rel:0)-(a.rel?a.q/a.rel:0)||b.q-a.q);
    if(!filas.length){frase("No se puede repartir por gestor: falta poner qué gestores están en cada relevo.");nota("Más › Gestión › Gestores y relevos.");return;}
    const top=filas[0];
    frase(qty(E)+" "+nom+" "+per.t+". "+(filas.length>1?"Con más "+nom+" por relevo trabajado: "+top.n+" ("+top.q+" en "+top.rel+" relevos, "+r10(top.q,top.rel)+" por cada 10)":top.n+": "+top.q+" en "+top.rel+" relevos ("+r10(top.q,top.rel)+" por cada 10)")+".");
    lista("Por gestor",filas.map(x=>it(x.n,[motTop(x.L),"Máquinas: "+maqTop(x.L)],String(x.q),r10(x.q,x.rel)+" / 10 rel.")));
    if(E.some(e=>!e.gest&&e.gs.length))nota("Cuando al apuntar no se eligió gestor, el cambio cuenta para los gestores que estaban en ese relevo.");}
  else if(o.relevo){
    frase(qty(E)+" "+nom+" en el relevo de "+o.relevo.toLowerCase()+" "+per.t+".");
    const M={};E.forEach(e=>{const k=e.mot?cap(e.mot):"Sin motivo";(M[k]=M[k]||[]).push(e);});
    lista("Por motivo",Object.entries(M).sort((a,b)=>qty(b[1])-qty(a[1])).map(([k,L])=>it(k,"Máquinas: "+maqTop(L),String(qty(L)))));}
  else{
    const R={};E.forEach(e=>{if(e.rel)(R[e.rel]=R[e.rel]||[]).push(e);});
    const filas=RELEVOS_A.map(u=>({u,L:R[u]||[],q:qty(R[u]||[]),rel:relTrab(u)}));const ord=filas.slice().sort((a,b)=>b.q-a.q);
    const conDatos=filas.filter(x=>x.q);
    frase(qty(E)+" "+nom+" "+per.t+(conDatos.length?". El relevo con más es "+ord[0].u.toLowerCase()+" ("+ord[0].q+(qty(E)?", el "+Math.round(ord[0].q/Math.max(1,qty(E)-qty(sinRel))*100)+" %":"")+")":"")+".");
    lista("Por relevo",filas.map(x=>it(x.u,x.L.length?[motTop(x.L),"Máquinas: "+maqTop(x.L)]:"Ninguno",String(x.q),x.L.length?r10(x.q,x.rel)+" / 10 rel.":null)));
    if(o.porMaq){const M={};E.forEach(e=>{if(!e.rel)return;const k=e.maq?maqN(e.maq):"sin máquina";const g=M[k]=M[k]||{Mañana:0,Tarde:0,Noche:0,t:0};g[e.rel]+=e.cant;g.t+=e.cant;});
      lista("Por máquina y relevo",Object.entries(M).sort((a,b)=>b[1].t-a[1].t).slice(0,25).map(([k,g])=>it(k,"Mañana "+g.Mañana+" · Tarde "+g.Tarde+" · Noche "+g.Noche,String(g.t))));}}
  if(sinRel.length)nota(qty(sinRel)+" sin relevo: se apuntaron sin la casilla «Relevo» y otro día. Al apuntar, elige el gestor o el relevo para que cuenten.");}
/* ===== ¿QUIÉN ESTÁ? Gestores de un relevo, un día o una semana ===== */
const DIAS_Q=["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
function fechaGQ(q){const h=hoy();let m;
  if((m=q.match(/\b(\d{1,2})[ .-](\d{1,2})(?:[ .-](\d{2,4}))?\b/))&&+m[2]>=1&&+m[2]<=12&&+m[1]>=1&&+m[1]<=31){const y=m[3]?(m[3].length===2?2000+ +m[3]:+m[3]):+h.slice(0,4);return y+"-"+String(+m[2]).padStart(2,"0")+"-"+String(+m[1]).padStart(2,"0");}
  if((m=q.match(new RegExp("\\b(\\d{1,2}) de ("+MESES_Q.join("|")+")\\b"))))return h.slice(0,4)+"-"+String(MESES_Q.indexOf(m[2])+1).padStart(2,"0")+"-"+String(+m[1]).padStart(2,"0");
  if(/\bpasado manana\b/.test(q))return sumaDias(h,2);
  if(/\bayer\b/.test(q))return sumaDias(h,-1);
  /* «mañana» es el día de mañana salvo que sea el relevo («de mañana», «turno de mañana») */
  if(/\b(para|y|el dia de|hay|quien esta|quienes estan|estan|esta|gestores) manana\b|^manana\b|\bmanana (por la|de|a la|en)\b/.test(q.replace(/\b(de|turno de|relevo de|el de) manana\b/g,"")))return sumaDias(h,1);
  for(let i=0;i<7;i++)if(new RegExp("\\b(el |este |el proximo |)"+DIAS_Q[i]+"\\b").test(q)){const dw=new Date(h+"T12:00:00").getDay();let k=(i-dw+7)%7;if(/\b(pasado|anterior)\b/.test(q)&&k>0)k-=7;return sumaDias(h,k);}
  if(/\b(hoy|ahora)\b/.test(q))return h;
  return null;}
function semanaGQ(q){const h=hoy(),l=lunesG(h);
  if(/\b(semana que viene|proxima semana|siguiente semana)\b/.test(q))return semMasG(l,1);
  if(/\bsemana pasada\b/.test(q))return semMasG(l,-1);
  if(/\b(dentro de|en) (\d+) semanas\b/.test(q))return semMasG(l,+q.match(/\b(?:dentro de|en) (\d+) semanas\b/)[1]);
  return null;}
function intencionGQ(q){if(typeof gCfg!=="function"||!gCfg().lista.length)return null;
  const G=gCfg().lista.filter(x=>{const w=norm(x.n);return w&&new RegExp("(^|\\s)"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(\\s|$)").test(q);});
  const gw=/\bgestor(es)?\b/.test(q)||(/\bquien(es)? (esta|estan|trabaja|trabajan|toca|tocan|le toca|les toca|hay|va|van)\b/.test(q)&&/\b(de (manana|tarde|noche)|relevos?|turnos?)\b/.test(q));
  if(!gw&&!G.length)return null;
  if(/\b(piston\w*|barras?|tornillos?|tolvas?|cambios?|roturas?|rompe\w*|agarrot\w*|averias?|consumo|gasto|apunt\w*)\b/.test(q))return null;
  if(!gw&&!/\b(esta|estan|toca|tocan|trabaja|trabajan|turno|relevo|de (manana|tarde|noche)|semana|hoy|manana|cuando)\b/.test(q))return null;
  const R=(q.match(/\b(?:de|el de|turno de|relevo de|la) (manana|tarde|noche)\b/)||q.match(/\b(tarde|noche)\b/)||[])[1];
  return{gests:G.map(x=>x.id),relevo:R?{manana:"Mañana",tarde:"Tarde",noche:"Noche"}[R]:null,f:fechaGQ(q),lun:semanaGQ(q),cuando:/\bcuando\b/.test(q)};}
function pintaGQ(I,ctx){const {frase,nota,ent,lista,it}=ctx;const o=I.gq,h=hoy();const N=ids=>ids.length?ids.map(nomGest).join(" y "):"nadie";
  const sinSem=!Object.keys(gCfg().sem).length;if(sinSem){ent("gestores y relevos");frase("Todavía no está puesto qué gestores hay en cada relevo.");nota("Ponlo en Más › Gestión › Gestores y relevos.");return;}
  /* cuándo le toca a un gestor un relevo: las próximas 8 semanas */
  if(o.cuando&&o.gests.length){const id=o.gests[0];ent("gestores y relevos",[nomGest(id),o.relevo?o.relevo.toLowerCase():null]);
    const L=[];for(let k=0;k<8;k++){const l=semMasG(lunesG(h),k),u=RELEVOS_A.find(x=>(semanaGest(l).g[x]||[]).includes(id));if(!o.relevo||u===o.relevo)L.push({l,u});}
    if(!L.length){frase(nomGest(id)+" no está "+(o.relevo?"de "+o.relevo.toLowerCase()+" ":"")+"en las próximas 8 semanas.");return;}
    frase(o.relevo?"A "+nomGest(id)+" le toca de "+o.relevo.toLowerCase()+" la semana del "+fmtF(L[0].l)+".":nomGest(id)+" esta semana está de "+(L[0].u||"—").toLowerCase()+".");
    lista("Próximas semanas",L.map(x=>it("Semana del "+fmtF(x.l)+" al "+fmtF(sumaDias(x.l,6)),x.l===lunesG(h)?"esta semana":null,x.u||"—")));
    nota("Sale de la rotación; los cambios de un día (bajas y sustituciones) se ven preguntando por ese día.");return;}
  /* un día concreto */
  if(o.f&&!o.lun){const f=o.f,dn=DIAS_Q[new Date(f+"T12:00:00").getDay()];ent("gestores y relevos",[dn+" "+fmtF(f),o.relevo?o.relevo.toLowerCase():null]);
    const us=o.relevo?[o.relevo]:RELEVOS_A;
    if(o.gests.length){const id=o.gests[0],u=relevoDeGest(id,f);frase(u?nomGest(id)+" está de "+u.toLowerCase()+" el "+dn+" "+fmtF(f)+".":nomGest(id)+" no está en ningún relevo el "+dn+" "+fmtF(f)+".");return;}
    frase(us.map(u=>u+": "+N(gestEn(f,u))).join(" · ")+" ("+dn+" "+fmtF(f)+").");
    const ch=us.filter(u=>gCfg().dia[f+"|"+u]);if(ch.length)nota("Ese día hay cambio (baja o sustitución) en "+ch.map(u=>u.toLowerCase()).join(" y ")+".");return;}
  /* una semana (esta si no se dice) */
  const l=o.lun||(o.f?lunesG(o.f):lunesG(h)),S=semanaGest(l),tS=l===lunesG(h)?"esta semana":l===semMasG(lunesG(h),1)?"la semana que viene":l===semMasG(lunesG(h),-1)?"la semana pasada":"la semana del "+fmtF(l);
  ent("gestores y relevos",[tS,o.relevo?o.relevo.toLowerCase():null,o.gests.length?o.gests.map(nomGest).join(", "):null]);
  if(o.gests.length){const id=o.gests[0],u=RELEVOS_A.find(x=>(S.g[x]||[]).includes(id));frase(u?nomGest(id)+" está de "+u.toLowerCase()+" "+tS+(u?" (con "+N((S.g[u]||[]).filter(x=>x!==id))+")":"")+".":nomGest(id)+" no está en ningún relevo "+tS+".");}
  else if(o.relevo)frase("De "+o.relevo.toLowerCase()+" "+tS+": "+N(S.g[o.relevo]||[])+".");
  else frase(cap(tS)+": "+RELEVOS_A.map(u=>u.toLowerCase()+" "+N(S.g[u]||[])).join(" · ")+".");
  lista("Semana del "+fmtF(l)+" al "+fmtF(sumaDias(l,6)),RELEVOS_A.map(u=>it(u,N(S.g[u]||[]))));
  const ch=Object.keys(gCfg().dia).filter(k=>{const f=k.split("|")[0];return f>=l&&f<=sumaDias(l,6);}).sort();
  if(ch.length)lista("Cambios de un día",ch.map(k=>{const[f,u]=k.split("|");return it(fmtF(f)+" · "+u,N(gCfg().dia[k]));}));
  if(!S.de)nota("Esa semana no tiene gestores puestos ni hay una semana anterior de la que salga la rotación.");}

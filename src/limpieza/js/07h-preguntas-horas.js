/* ===== «Pregúntale» · preguntas de horas de las personas (21/11/2026) =====
   Sin tarjeta nueva: «Pregúntale» entiende preguntas de días trabajados, horas fuera de presupuesto, extra, sustitución,
   faltas y bolsa, con los mismos cálculos que el Excel mensual de horas (horasMesExcel):
   - cada día: lo guardado en el registro de horas o, si no hay nada, su horario (y la jornada del que sustituye si es más larga);
     festivo sin apuntar = 0; con falta = 0;
   - extra a mano: lo apuntado (nunca más que lo trabajado), separado en entre semana, sábado y festivo/domingo;
   - bolsa (jornada completa): cada semana (lunes a domingo) lo trabajado menos lo pagado como extra, frente a sus horas de
     contrato; empieza a contar el BOLSA_INICIO con saldo 0. */
/* el orden importa: gana la primera que casa (21/11: más formas de preguntar lo mismo) */
const INV_HQ=[["fuera",/(fuera de presupuesto|presupuesto)/],["extra",/\bextras?\b/],["sust",/(sustitu|justificad)/],
  ["falta",/(\b(faltas?|faltado|bajas?|vacacion|vacaciones|permisos?|ausencias?|ausente|libranzas?)\b|\bcompens|no (ha |han )?venido|no vino|no vinieron|de baja\b)/,/(que falta|lo que falta|faltan? por|falta(n)? para|ha bajado|han bajado)/],
  ["bolsa",/(\bbolsa\b|(le |les )?(debe|debemos|deben) horas|horas (que )?(le |les )?(debe|debemos|deben)|a deber)/],
  ["festivo",/\bfestivos?\b/],
  ["exceso",/(horas de mas|horas de menos|por encima de su|por debajo de su|mas (horas )?de su (jornada|horario)|menos (horas )?de su (jornada|horario)|\bexceso\b|no (ha |han )?cumplid|se ha pasado de|se han pasado de)/],
  ["horario",/(que horario|su horario|horario de|horarios|que turno tiene|en que turno (esta|trabaja)|turno de cada)/],
  ["dias",/(dias? (ha |han |he )?trabaj|cuantos dias|ha trabajado|han trabajado|horas trabajadas|que dias (ha |han )?(venido|trabajado)|jornadas? trabajad|\b(ha|han|a|an|he) trabajad|\brefuerzos?\b|\btrabaj(a|an|o) (los|el|en) (finde|fines|fin de semana|sabados?|domingos?)|cuantos (sabados|domingos|findes|fines de semana)|(horas|dias) de (manana finde|manana|tarde|noche|partido))/]];
function invHorasQ(t){const x=INV_HQ.find(([,re,no])=>re.test(t)&&!(no&&no.test(t)));return x?x[0]:null;}
const INV_FALTA_N={baja:"Baja",vacaciones:"Vacaciones",permiso:"Permiso",compensa:"Compensa horas (bolsa)",otro:"Otra falta"};
/* «octubre» → «en octubre»; «este mes», «el 12/11/2026», «desde el…» se quedan igual */
const invEnP=t=>/^(el|la|los|las|este|esta|estos|del|desde|hoy|ayer)\b/.test(t)?t:"en "+t;
const invHd1=h=>{const v=Math.round((h||0)*10)/10;return String(v).replace(".",",")+" h";};
/* las horas de cada persona y día entre d0 y d1 (sin pasar de hoy) */
function invHorasDias(C,d0,d1){const ck=d0+"|"+d1;C._hd=C._hd||{};if(C._hd[ck])return C._hd[ck];const FES=new Set((C.FE||[]).map(x=>x.fecha)),RH={};(C.RH||[]).forEach(x=>RH[x.trabajador+"|"+x.fecha]=x);
  const lim=d1<hoyISO()?d1:hoyISO();const W=(C.W||[]).filter(w=>w.activo!==false&&w.rol!=="admin"&&w.jornada!=="externo");const out={};
  W.forEach(w=>{const L=out[w.nombre]={w,D:[]};for(let f=d0;f<=lim;f=sumaD(f,1)){const x=RH[w.id+"|"+f],esF=FES.has(f),own=horasTramos((w.horario||{})[diaClave(f)]||[]),su=sustDe(C.SUH||[],C.W,w.id,f);
    const def=esF?0:Math.max(own,su?su.h:0),fa=x&&x.falta||null,h=fa?0:(x&&x.trabajadas!=null?+x.trabajadas:def),em=x&&x.extra_mano!=null?Math.min(h,+x.extra_mano):0;
    const dw=new Date(f+"T12:00:00").getDay(),tu=((dw===0||dw===6)?w.turno_finde:w.turno_semana)||w.turno_semana||"";
    L.D.push({f,dow:dw,tu,esF,own,def,fa,h,em,fu:x?(+x.fuera||0):0,sj:horasPorSust(own,su,esF,h),su,nota:x&&x.nota||""});}});
  return C._hd[ck]=out;}
/* saldo de la bolsa al cerrar la última semana que acaba (domingo) antes o el día «hasta» */
function invBolsa(C,w,hasta){if(w.jornada!=="completa")return null;const c=w.horas_contrato!=null&&w.horas_contrato!==""?+w.horas_contrato:35;
  const P=invHorasDias(C,BOLSA_DESDE,hasta)[w.nombre];if(!P)return null;let bolsa=0,wk=null;
  P.D.forEach(d=>{if(!wk)wk={ini:d.f,W:0,n:0,paid:0,exc:0};wk.n++;if(d.fa==="baja"||d.fa==="vacaciones"||(d.esF&&d.h===0))wk.exc+=d.own;wk.W+=d.h;wk.paid+=d.em;
    if(d.dow===0){const cap=c*wk.n/7-wk.exc;bolsa+=wk.ini<BOLSA_INICIO?0:(wk.W-wk.paid)-cap;wk=null;}});
  return bolsa;}
/* contestar una pregunta de horas */
function invHorasContesta(E,C,r){const{d0,d1}=E.per,A=invAnterior(d0,d1);const hq=E.hq;
  /* días de la semana pedidos («los sábados», «el finde») */
  const fD=D=>E.dsem?D.filter(d=>E.dsem.includes(d.dow)):D;
  let P=Object.values(invHorasDias(C,d0,d1)).map(p=>({w:p.w,D:fD(p.D)}));if(E.pers.length)P=P.filter(p=>E.pers.includes(p.w.nombre));
  const Pa=E.comp?invHorasDias(C,A.d0,A.d1):{};const sum=(L,k)=>L.reduce((s,d)=>s+(d[k]||0),0);
  const quien=P.length===1?P[0].w.nombre:"el equipo";const antes=(n,f)=>E.comp&&Pa[n]?f(fD(Pa[n].D)):null;
  r.cols=null;r.filas=[];r.L=[];r.rowL=null;r.extra=[];
  if(!P.length){r.frase="No encuentro a nadie con horas "+invEnP(E.per.t)+".";return r;}
  if(hq==="dias"){/* con un turno («horas de refuerzo», «turno de tarde»), solo los días de ese turno (21/11: Ahmed hace Refuerzo entre semana y Mañana finde) */
    /* «¿cuántos días ha trabajado y cuántos han sido de refuerzo?»: todos los días, con el reparto por turno */
    const tf=E.turno&&!/\by cuant/.test(E.t)?E.turno:null;
    const deT=d=>!tf||sinAcento(d.tu||"").toLowerCase().startsWith(tf);const nT=tf?" de "+tf:"";
    const F=P.map(p=>{const T=p.D.filter(d=>d.h>0&&deT(d));const tu={};T.forEach(d=>{const k=d.tu||"Sin turno";tu[k]=(tu[k]||0)+1;});
        return{n:p.w.nombre,T,dias:T.length,se:T.filter(d=>d.dow>0&&d.dow<6).length,fs:T.filter(d=>d.dow===0||d.dow===6).length,tu,h:sum(T,"h"),prev:sum(p.D.filter(d=>!d.fa&&deT(d)),"own"),a:antes(p.w.nombre,D=>D.filter(d=>d.h>0&&deT(d)).length)};})
      .filter(x=>x.dias||E.pers.length).sort((a,b)=>{const v=/\bhoras\b/.test(E.t)?(b.h-a.h)||(b.dias-a.dias):(b.dias-a.dias)||(b.h-a.h);return E.menos?-v:v;});
    const TU=[...new Set(F.flatMap(x=>Object.keys(x.tu)))].filter(k=>k!=="Sin turno").sort();
    const reparto=x=>{const L=Object.entries(x.tu).filter(([k])=>k!=="Sin turno");return L.length?L.map(([k,n])=>n+" de "+k.toLowerCase()).join(" y "):x.se+" entre semana y "+x.fs+" en fin de semana";};
    r.cols=["Persona","Días trabajados"].concat(TU.length?TU:["Entre semana","Fin de semana"]).concat(["Horas trabajadas","Su horario"]).concat(E.comp?["Días antes"]:[]);
    r.filas=F.map(x=>[x.n,x.dias].concat(TU.length?TU.map(k=>x.tu[k]||0):[x.se,x.fs]).concat([invHd1(x.h),invHd1(x.prev)]).concat(E.comp?[x.a==null?"—":x.a]:[]));
    r.frase=!F.length?"Nadie ha trabajado"+nT+" "+invEnP(E.per.t)+".":F.length===1?F[0].n+" ha trabajado "+F[0].dias+(F[0].dias===1?" día":" días")+nT+" "+invEnP(E.per.t)+(tf?"":" ("+reparto(F[0])+")")+": "+invHd1(F[0].h)+"."+(E.comp&&F[0].a!=null?" En el periodo anterior: "+F[0].a+" días.":"")+" Los días, abajo.":
      "Días trabajados"+nT+" "+invEnP(E.per.t)+": "+F.reduce((s,x)=>s+x.dias,0)+" entre "+F.length+" personas ("+invHd1(F.reduce((s,x)=>s+x.h,0))+"). "+(E.menos?"Quien menos":"Quien más")+": "+F[0].n+", "+F[0].dias+" días ("+invHd1(F[0].h)+").";
    r.extra=[{titulo:F.length===1?"Días que ha trabajado "+F[0].n.split(" ")[0]+nT:"Día a día",cols:["Día","Persona","Turno","Horas","Nota"],
      filas:P.flatMap(p=>p.D.filter(d=>(d.h>0||d.fa)&&deT(d)).map(d=>[fCorta(d.f),p.w.nombre,d.tu||"—",d.fa?(INV_FALTA_N[d.fa]||d.fa):invHd1(d.h),d.nota||(d.su&&d.sj?sustTxt(d.su):"")])).slice(0,300)}];return r;}
  if(hq==="fuera"||hq==="extra"){const k=hq==="fuera"?"fu":"em";
    const F=P.map(p=>{const D=p.D.filter(d=>d[k]>0);const o={n:p.w.nombre,t:sum(D,k),dias:D.length,D,a:antes(p.w.nombre,X=>sum(X,k))};
      if(hq==="extra"){o.se=sum(D.filter(d=>!d.esF&&d.dow>0&&d.dow<6),"em");o.sa=sum(D.filter(d=>!d.esF&&d.dow===6),"em");o.fe=sum(D.filter(d=>d.esF||d.dow===0),"em");}return o;}).filter(x=>x.t>0||E.pers.length)
      .sort((a,b)=>E.menos?a.t-b.t:b.t-a.t);
    const tot=F.reduce((s,x)=>s+x.t,0),ta=E.comp?Object.values(Pa).filter(p=>!E.pers.length||E.pers.includes(p.w.nombre)).reduce((s,p)=>s+sum(p.D,k),0):null;
    const nom=hq==="fuera"?"fuera de presupuesto":"extra";
    r.cols=hq==="fuera"?["Persona","Horas fuera de presupuesto","Días"].concat(E.comp?["Antes"]:[]):["Persona","Extra entre semana","Extra sábado","Extra festivo y domingo","Total extra","Días"].concat(E.comp?["Antes"]:[]);
    r.filas=F.map(x=>(hq==="fuera"?[x.n,invHd1(x.t),x.dias]:[x.n,invHd1(x.se),invHd1(x.sa),invHd1(x.fe),invHd1(x.t),x.dias]).concat(E.comp?[x.a==null?"—":invHd1(x.a)]:[]));
    r.frase=!tot?"No hay horas "+nom+" "+invEnP(E.per.t)+(E.pers.length?" de "+E.pers.join(" y "):"")+"."+(ta?" En el periodo anterior hubo "+invHd1(ta)+".":""):
      "Horas "+nom+" "+invEnP(E.per.t)+(P.length===1?" de "+quien:"")+": "+invHd1(tot)+(F.length>1?" entre "+F.length+" personas. "+(E.menos?"Quien menos":"Quien más")+": "+F[0].n+", "+invHd1(F[0].t)+".":" en "+F[0].dias+(F[0].dias===1?" día.":" días."))+
      (ta!=null?" En el periodo anterior: "+invHd1(ta)+(ta!==tot?" ("+(tot>ta?"ha subido":"ha bajado")+").":"."):"")+" Los motivos, abajo.";
    r.extra=[{titulo:"Día a día, con el motivo",cols:["Día","Persona",hq==="fuera"?"Fuera de presupuesto":"Extra","Motivo"],filas:F.flatMap(x=>x.D.map(d=>[fCorta(d.f),x.n,invHd1(d[k]),d.nota||"(sin motivo)"])).slice(0,300)}];return r;}
  if(hq==="sust"){const F=P.map(p=>{const D=p.D.filter(d=>d.sj>0);return{n:p.w.nombre,t:sum(D,"sj"),dias:D.length,D,a:[...new Set(D.map(d=>d.su&&d.su.aus).filter(Boolean))]};}).filter(x=>x.t>0||E.pers.length).sort((a,b)=>b.t-a.t);
    const tot=F.reduce((s,x)=>s+x.t,0);r.cols=["Persona","Horas por sustitución","Días","A quién sustituye"];r.filas=F.map(x=>[x.n,invHd1(x.t),x.dias,x.a.join(", ")||"—"]);
    r.frase=tot?"Horas por sustitución (justificadas) "+invEnP(E.per.t)+": "+invHd1(tot)+(F.length>1?" entre "+F.length+" personas. Quien más: "+F[0].n+", "+invHd1(F[0].t)+".":" ("+F[0].n+", "+F[0].dias+(F[0].dias===1?" día).":" días).")):"No hay horas por sustitución "+invEnP(E.per.t)+".";
    r.extra=[{titulo:"Día a día",cols:["Día","Persona","Horas","Sustituye a"],filas:F.flatMap(x=>x.D.map(d=>[fCorta(d.f),x.n,invHd1(d.sj),d.su?sustTxt(d.su):""]))}];return r;}
  if(hq==="falta"){const tipo=/\bbajas?\b/.test(E.t)?"baja":/vacacion/.test(E.t)?"vacaciones":/permiso/.test(E.t)?"permiso":/compens/.test(E.t)?"compensa":null;
    const F=P.map(p=>{const D=p.D.filter(d=>d.fa&&(!tipo||d.fa===tipo));const c=k=>D.filter(d=>d.fa===k).length;return{n:p.w.nombre,t:D.length,b:c("baja"),v:c("vacaciones"),p:c("permiso"),cb:c("compensa"),o:c("otro"),D,a:antes(p.w.nombre,X=>X.filter(d=>d.fa&&(!tipo||d.fa===tipo)).length)};})
      .filter(x=>x.t>0||E.pers.length).sort((a,b)=>b.t-a.t);
    const tot=F.reduce((s,x)=>s+x.t,0),nom=tipo==="compensa"?"compensar horas de la bolsa":tipo?(INV_FALTA_N[tipo]||tipo).toLowerCase():"faltas";
    r.cols=["Persona","Baja","Vacaciones","Permiso","Compensa bolsa","Otra falta","Total días"].concat(E.comp?["Antes"]:[]);r.filas=F.map(x=>[x.n,x.b,x.v,x.p,x.cb,x.o,x.t].concat(E.comp?[x.a==null?"—":x.a]:[]));
    r.frase=tot?"Días de "+nom+" "+invEnP(E.per.t)+": "+tot+(F.length>1?" entre "+F.length+" personas. Quien más: "+F[0].n+", "+F[0].t+(F[0].t===1?" día.":" días."):" ("+F[0].n+")."):"No hay días de "+nom+" "+invEnP(E.per.t)+(E.pers.length?" de "+E.pers.join(" y "):"")+".";
    r.extra=[{titulo:"Día a día",cols:["Día","Persona","Falta","Nota"],filas:F.flatMap(x=>x.D.map(d=>[fCorta(d.f),x.n,INV_FALTA_N[d.fa]||d.fa,d.nota||""]))}];return r;}
  if(hq==="bolsa"){const ini=sumaD(d0,-1),fin=d1<hoyISO()?d1:hoyISO();
    const F=P.filter(p=>p.w.jornada==="completa").map(p=>{const a=invBolsa(C,p.w,ini)||0,b=invBolsa(C,p.w,fin)||0;return{n:p.w.nombre,a,b,dl:b-a};}).sort((x,y)=>y.b-x.b);
    r.cols=["Persona","Bolsa al empezar","Variación","Bolsa ahora"];r.filas=F.map(x=>[x.n,invHd1(x.a),(x.dl>0?"+":"")+invHd1(x.dl),invHd1(x.b)]);
    r.frase=F.length?(F.length===1?"Bolsa de horas de "+F[0].n+": "+invHd1(F[0].b)+" (al empezar "+invEnP(E.per.t)+", "+invHd1(F[0].a)+")."
      :"Bolsa de horas al cerrar la última semana "+invEnP(E.per.t)+": quien más tiene, "+F[0].n+" ("+invHd1(F[0].b)+"); quien menos, "+F[F.length-1].n+" ("+invHd1(F[F.length-1].b)+").")+
      " Se calcula por semanas completas (de lunes a domingo), como en el Excel mensual de horas.":"La bolsa de horas solo la tienen las personas de jornada completa.";
    return r;}
  /* trabajo en festivo */
  if(hq==="festivo"){const F=P.map(p=>{const D=p.D.filter(d=>d.esF&&d.h>0);return{n:p.w.nombre,D,dias:D.length,h:sum(D,"h")};}).filter(x=>x.dias||E.pers.length).sort((a,b)=>b.h-a.h);
    const fs=P[0]?P[0].D.filter(d=>d.esF).length:0;
    r.cols=["Persona","Festivos trabajados","Horas"];r.filas=F.map(x=>[x.n,x.dias,invHd1(x.h)]);
    r.frase=F.some(x=>x.dias)?"Trabajo en festivo "+invEnP(E.per.t)+": "+F.filter(x=>x.dias).map(x=>x.n+" "+x.dias+(x.dias===1?" día":" días")+" ("+invHd1(x.h)+")").join(", ")+".":
      (fs?"Nadie ha trabajado en los "+fs+" festivos ":"No hay festivos ")+invEnP(E.per.t)+".";
    r.extra=[{titulo:"Día a día",cols:["Día","Persona","Horas","Nota"],filas:F.flatMap(x=>x.D.map(d=>[fCorta(d.f),x.n,invHd1(d.h),d.nota||""]))}];return r;}
  /* horas de más (o de menos) frente a su horario de cada día; las faltas no cuentan */
  if(hq==="exceso"){const menos=/(menos|debajo|no (ha |han )?cumplid)/.test(E.t);
    const F=P.map(p=>{const D=p.D.filter(d=>!d.fa&&(menos?d.own>0&&d.h<d.own:d.h>d.own));const dif=D.reduce((s,d)=>s+Math.abs(d.h-d.own),0);return{n:p.w.nombre,D,dias:D.length,dif};})
      .filter(x=>x.dias||E.pers.length).sort((a,b)=>b.dif-a.dif);const tot=F.reduce((s,x)=>s+x.dif,0),nom=menos?"de menos":"de más";
    r.cols=["Persona","Días","Horas "+nom];r.filas=F.map(x=>[x.n,x.dias,invHd1(x.dif)]);
    r.frase=tot?"Horas "+nom+" frente a su horario "+invEnP(E.per.t)+": "+invHd1(tot)+(F.length>1?" entre "+F.length+" personas. Quien más: "+F[0].n+", "+invHd1(F[0].dif)+" en "+F[0].dias+(F[0].dias===1?" día.":" días."):" ("+F[0].n+", "+F[0].dias+(F[0].dias===1?" día).":" días)."))+
      (menos?"":" Incluye las fuera de presupuesto, las extra y las de sustitución: para cada una, pregunta por ella."):"Nadie ha hecho horas "+nom+" frente a su horario "+invEnP(E.per.t)+".";
    r.extra=[{titulo:"Día a día",cols:["Día","Persona","Su horario","Trabajadas","Diferencia","Nota"],filas:F.flatMap(x=>x.D.map(d=>[fCorta(d.f),x.n,invHd1(d.own),invHd1(d.h),(d.h>d.own?"+":"−")+invHd1(Math.abs(d.h-d.own)),d.nota||(d.su&&d.sj?sustTxt(d.su):"")]))}];return r;}
  /* horario y turno de cada uno (de su ficha) */
  if(hq==="horario"){const ab={lunes:"L",martes:"M",miercoles:"X",jueves:"J",viernes:"V",sabado:"S",domingo:"D"};
    const hTxt=w=>Object.keys(ab).map(k=>{const T=(w.horario||{})[k]||[];return T.length?ab[k]+" "+T.map(t=>t[0].replace(/^0/,"")+"–"+t[1].replace(/^0/,"")).join(" y "):null;}).filter(Boolean).join(" · ")||"sin horario";
    const hS=w=>Object.keys(ab).reduce((s,k)=>s+horasTramos((w.horario||{})[k]||[]),0);
    r.cols=["Persona","Turno entre semana","Turno fin de semana","Horario","Horas a la semana"];r.filas=P.map(p=>[p.w.nombre,p.w.turno_semana||"—",p.w.turno_finde||"—",hTxt(p.w),invHd1(hS(p.w))]);
    r.frase=P.length===1?P[0].w.nombre+": "+[P[0].w.turno_semana?"entre semana, "+P[0].w.turno_semana.toLowerCase():null,P[0].w.turno_finde?"el fin de semana, "+P[0].w.turno_finde.toLowerCase():null].filter(Boolean).join("; ")+". Horario: "+hTxt(P[0].w)+" ("+invHd1(hS(P[0].w))+" a la semana).":
      "Horario y turno de cada persona, según su ficha.";return r;}
  return r;}

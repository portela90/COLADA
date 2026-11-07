/* ===== REGLAS AUTOMÁTICAS (constructor de reglas) =====
   Tú montas la regla como una frase (qué miro · de qué · cuándo · a partir de cuánto) y la app avisa sola en
   «Qué hacer hoy» y en la campana, con un botón para actuar. El constructor está en comun/reglas.js; aquí van
   las cosas que se pueden mirar en Almacén. Se guardan en el catálogo (cat.reglas) y valen para todos.
   Las reglas antiguas (tipo pistDura, stockPunto…) se convierten solas al leerlas. */
const RG_ANT={pistDura:r=>({m:"pist_dura",f:{maq:r.maq},op:"<",niv:"bad"}),stockPunto:r=>({m:"stock",f:{art:r.art,alm:r.alm},op:"<"}),
  ejeTaller:()=>({m:"dias_taller",op:">"}),gastoMaq:r=>({m:"gasto_maq",f:{maq:r.maq},p:"mes",op:">"}),
  sinCambio:r=>({m:"dias_sin_cambio",f:{maq:r.maq},op:">",niv:"info"}),consSem:r=>({m:"consumo",f:{art:r.art},p:"7d",op:">"})};
function reglaNueva(r){if(!r||!r.tipo||r.m)return r;const c=RG_ANT[r.tipo];if(!c)return r;const x=c(r);const f={};Object.keys(x.f||{}).forEach(k=>{if(x.f[k])f[k]=x.f[k];});
  return{id:r.id,m:x.m,f,p:x.p,op:x.op,n:+r.n||0,niv:x.niv||"warn",activa:r.activa!==false};}
const leerReglas=()=>(cat.reglas||[]).map(reglaNueva);
const navesMaq=()=>[...new Set((cat.maquinas||[]).map(m=>m.nave).filter(Boolean))].sort();
const mqOk=(f,m)=>!!m&&(!f.maq||m.id===f.maq)&&(!f.nave||m.nave===f.nave);
const artOk=(f,a)=>!!a&&(!f.art||a.id===f.art)&&(!f.fam||a.fam===f.fam);
const udArt=f=>{const a=f.art?art(f.art):null;return a?(a.ud||"uds"):"uds";};
const PER_T=["7d","30d","mes","mesant","hoy"];
const RG_F={
  maq:{e:"Máquina",todos:"Cualquiera",opts:()=>maqOpts(),txt:v=>" de la "+maqN(v)},
  nave:{e:"Nave",todos:"Todas",opts:()=>navesMaq().map(n=>[n,n]),txt:v=>" en la "+v},
  art:{e:"Artículo",todos:"Cualquiera",opts:()=>artsActivos().slice().sort((a,b)=>a.desc.localeCompare(b.desc)).map(a=>[a.id,a.desc,FAM[a.fam]||"Otro"]),txt:v=>{const a=art(v);return" de "+(a?a.desc:"(artículo)");}},
  fam:{e:"Familia",todos:"Todas",opts:()=>Object.keys(FAM).map(k=>[k,FAM[k]]),txt:v=>" (familia "+(FAM[v]||v).toLowerCase()+")"},
  alm:{e:"Almacén o punto",todos:"Todos",opts:()=>(cat.almacenes||[]).map(a=>[a.id,a.nom]),txt:v=>{const a=(cat.almacenes||[]).find(x=>x.id===v);return" en "+(a?a.nom:"(almacén)");}},
  motivo:{e:"Motivo",todos:"Cualquiera",opts:()=>MOTIVOS.map(m=>[m,cap(m)]),txt:v=>" por "+v.toLowerCase()}};
const verMaq=id=>()=>{const m=maqDe(id);if(m)fichaIny(m);};
const RG_M={
  pist_dura:{g:"Pistones",e:"Lo que dura un pistón (por máquina)",d:"Días entre los dos últimos cambios de pistón de cada máquina (si el último es de las dos últimas semanas).",
    s:"lo que ha durado el último pistón",t:"el último pistón ha durado",u:"días",f:["maq","nave"],cada:" en alguna máquina",cadaF:"maq",op:"<",def:10,
    calc:(f,P)=>{const G={};todosPist().forEach(p=>{if(!p.maq||!p.f)return;if(!mqOk(f,maqDe(p.maq)))return;(G[p.maq]=G[p.maq]||new Set()).add(p.f);});
      return Object.entries(G).map(([mq,S])=>{const fs=[...S].sort();if(fs.length<2)return null;const u=fs[fs.length-1],a=fs[fs.length-2];if(dias(u,P.hoy)>14)return null;
        return{nom:maqN(mq),v:dias(a,u),det:"cambiado el "+fmtF(a)+" y otra vez el "+fmtF(u),btn:"Abrir avería",fn:()=>{if(typeof nuevaAveriaMano==="function")nuevaAveriaMano(mq);}};});}},
  dias_sin_cambio:{g:"Pistones",e:"Días sin cambiar pistón (por máquina)",s:"los días sin cambiar pistón",pl:true,t:"días sin cambiar pistón",u:"días",f:["maq","nave"],cada:" de alguna máquina",cadaF:"maq",op:">",def:90,
    calc:(f,P)=>(cat.maquinas||[]).filter(m=>mqOk(f,m)).map(m=>{const u=ultimoPist(m.id);return u?{nom:m.cod,v:dias(u.f,P.hoy),det:"último cambio el "+fmtF(u.f),btn:"Ver máquina",fn:verMaq(m.id)}:null;})},
  pist_cambios:{g:"Pistones",e:"Cambios de pistón de una máquina",d:"Cuántos pistones se han cambiado en cada máquina en ese tiempo. Con «Motivo» puedes contar solo las roturas, fugas…",
    s:"el número de cambios de pistón",t:"cambios de pistón",u:"cambios",f:["maq","nave","motivo"],cada:" de alguna máquina",cadaF:"maq",per:["30d","7d","mes","mesant","hoy"],op:">",def:3,
    calc:(f,P)=>{const G={};todosPist().forEach(p=>{if(!p.maq||!p.f||p.f<P.d0||p.f>P.d1)return;if(f.motivo&&p.motivo!==f.motivo)return;if(!mqOk(f,maqDe(p.maq)))return;G[p.maq]=(G[p.maq]||0)+(+p.cant||1);});
      return Object.entries(G).map(([id,n])=>({nom:maqN(id),v:n,btn:"Ver máquina",fn:verMaq(id)}));}},
  pist_total:{g:"Pistones",e:"Cambios de pistón en total",s:"el total de cambios de pistón",t:"cambios de pistón en total",u:"cambios",f:["nave","motivo"],per:["mes","7d","30d","mesant","hoy"],op:">",def:20,
    calc:(f,P)=>{let n=0;todosPist().forEach(p=>{if(!p.f||p.f<P.d0||p.f>P.d1)return;if(f.motivo&&p.motivo!==f.motivo)return;if(f.nave){const m=maqDe(p.maq);if(!m||m.nave!==f.nave)return;}n+=(+p.cant||1);});
      return[{v:n,btn:"Ver pistones",fn:()=>irA("pist")}];}},
  consumo:{g:"Material",e:"Lo que se gasta de un artículo",d:"Salidas de material en ese tiempo, artículo por artículo.",s:"lo gastado",t:"gastado",u:udArt,f:["art","fam","alm","maq"],cada:" de algún artículo",cadaF:"art",per:PER_T,op:">",def:20,
    calc:(f,P)=>{const G={};todosMov().forEach(m=>{if(m.tipo!=="salida"||!m.f||m.f<P.d0||m.f>P.d1)return;if(f.alm&&m.alm!==f.alm)return;if(f.maq&&m.maq!==f.maq)return;if(!artOk(f,art(m.art)))return;G[m.art]=(G[m.art]||0)+(+m.cant||0);});
      return Object.entries(G).map(([id,c])=>{const a=art(id);return{nom:a.desc,v:c,btn:"Ver",fn:()=>fichaProd(id)};});}},
  entradas:{g:"Material",e:"Lo que entra de un artículo",s:"lo que ha entrado",t:"ha entrado",u:udArt,f:["art","fam","alm"],cada:" de algún artículo",cadaF:"art",per:PER_T,op:">",def:50,
    calc:(f,P)=>{const G={};todosMov().forEach(m=>{if(m.tipo!=="entrada"||!m.f||m.f<P.d0||m.f>P.d1)return;if(f.alm&&m.alm!==f.alm)return;if(!artOk(f,art(m.art)))return;G[m.art]=(G[m.art]||0)+(+m.cant||0);});
      return Object.entries(G).map(([id,c])=>{const a=art(id);return{nom:a.desc,v:c,btn:"Ver",fn:()=>fichaProd(id)};});}},
  stock:{g:"Material",e:"Stock de un artículo",d:"Lo que queda ahora, en un almacén o punto o en todos.",s:"el stock",t:"stock",u:udArt,f:["art","alm","fam"],cada:" de algún artículo",cadaF:"art",op:"<",def:10,
    calc:f=>{if(!f.art&&!f.fam)return[];return artsActivos().filter(a=>artOk(f,a)).map(a=>({nom:a.desc+(f.alm?"":" (todos los almacenes)"),v:stockDe(a.id,f.alm||undefined),btn:"Reponer",fn:()=>irA("repo")}));}},
  bajo_min:{g:"Material",e:"Artículos por debajo del mínimo",s:"el número de artículos bajo mínimo",t:"artículos bajo mínimo",u:"artículos",f:["fam"],op:">",def:0,
    calc:f=>[{v:artsActivos().filter(a=>artOk(f,a)&&nivel(a)==="bad").length,btn:"Reponer",fn:()=>irA("repo")}]},
  dias_sin_contar:{g:"Material",e:"Días sin contar un artículo",d:"Días desde el último recuento de cada artículo que tiene stock.",s:"los días sin contar",pl:true,t:"días sin contar",u:"días",f:["art","fam"],cada:" de algún artículo",cadaF:"art",op:">",def:90,
    calc:(f,P)=>artsActivos().filter(a=>artOk(f,a)&&stockDe(a.id)>0).map(a=>{const u=ultimoConteo(a.id);return u?{nom:a.desc,v:dias(u,P.hoy),det:"contado el "+fmtF(u),btn:"Ver",fn:()=>fichaProd(a.id)}:null;})},
  gasto_maq:{g:"Gasto",e:"Gasto de una máquina (€)",d:"Pistones, ejes y material que ha llevado cada máquina, en euros.",s:"el gasto",t:"gasto",u:"€",f:["maq","nave"],cada:" de alguna máquina",cadaF:"maq",per:["mes","mesant","30d","7d"],op:">",def:500,
    calc:(f,P)=>{const G={};evTodo().forEach(e=>{if(!e.f||e.f<P.d0||e.f>P.d1)return;const m=mqEv(e);if(!mqOk(f,m))return;G[m.id]=(G[m.id]||0)+(e.eur||0);});
      return Object.entries(G).map(([id,eu])=>({nom:maqN(id),v:Math.round(eu),btn:"Ver máquina",fn:verMaq(id)}));}},
  gasto_total:{g:"Gasto",e:"Gasto total (€)",s:"el gasto total",t:"gasto total",u:"€",f:["nave"],per:["mes","mesant","30d","7d"],op:">",def:5000,
    calc:(f,P)=>{let s=0;evTodo().forEach(e=>{if(!e.f||e.f<P.d0||e.f>P.d1)return;if(f.nave){const m=mqEv(e);if(!(m&&m.nave===f.nave)&&e.nave!==f.nave)return;}s+=(e.eur||0);});return[{v:Math.round(s),btn:"Ver gasto",fn:()=>irA("bd")}];}},
  dias_taller:{g:"Ejes",e:"Días de un eje en el taller",s:"los días en el taller",pl:true,t:"días en el taller",u:"días",cada:" de algún eje",op:">",def:30,
    calc:(f,P)=>ejes.filter(e=>e.estado==="reparacion"||e.estado==="devuelto").map(e=>{const ab=abiertaDe(e.cod);if(!ab||!ab.env)return null;
      return{nom:"eje "+e.cod,v:dias(ab.env,P.hoy),det:"enviado el "+fmtF(ab.env)+(ab.alb?" · albarán "+ab.alb:""),btn:"Ver eje",fn:()=>fichaEje(e)};})},
  ejes_fuera:{g:"Ejes",e:"Ejes en reparación",s:"el número de ejes en reparación",t:"ejes en reparación",u:"ejes",op:">",def:5,
    calc:()=>[{v:ejes.filter(e=>e.estado==="reparacion"||e.estado==="devuelto").length,btn:"Ver ejes",fn:()=>irA("ejes")}]},
  averias_abiertas:{g:"Averías",e:"Averías abiertas",s:"el número de averías abiertas",t:"averías abiertas",u:"averías",f:["maq","nave"],op:">",def:3,
    calc:f=>[{v:(typeof AVER!=="undefined"?AVER:[]).filter(a=>a.estado==="abierta"&&mqOk(f,avMaq(a))).length,btn:"Ver averías",fn:()=>irA("aver")}]},
  dias_averia:{g:"Averías",e:"Días que lleva abierta una avería",s:"los días que lleva abierta una avería",pl:true,t:"días abierta",u:"días",f:["maq","nave"],op:">",def:7,
    calc:(f,P)=>(typeof AVER!=="undefined"?AVER:[]).filter(a=>a.estado==="abierta"&&a.f&&mqOk(f,avMaq(a))).map(a=>({nom:"avería "+avNom(a),v:dias(a.f,P.hoy),det:"abierta el "+fmtF(a.f),btn:"Ver averías",fn:()=>irA("aver")}))}};
const RG_EJ=[{nom:"Un pistón dura menos de 10 días",r:{m:"pist_dura",op:"<",n:10,niv:"bad"}},
  {nom:"Más de 2 roturas de pistón en una máquina en 30 días",r:{m:"pist_cambios",f:{motivo:"ROTURA"},p:"30d",op:">",n:2,niv:"bad"}},
  {nom:"Máquina más de 90 días sin cambiar pistón",r:{m:"dias_sin_cambio",op:">",n:90,niv:"info"}},
  {nom:"Una máquina gasta más de 500 € en el mes",r:{m:"gasto_maq",p:"mes",op:">",n:500}},
  {nom:"Gasto total del mes de más de 5.000 €",r:{m:"gasto_total",p:"mes",op:">",n:5000}},
  {nom:"Queda poco de un artículo",r:{m:"stock",op:"<",n:10}},
  {nom:"Algún artículo por debajo del mínimo",r:{m:"bajo_min",op:">",n:0}},
  {nom:"Artículo sin contar en 90 días",r:{m:"dias_sin_contar",op:">",n:90,niv:"info"}},
  {nom:"Un eje lleva más de 30 días en el taller",r:{m:"dias_taller",op:">",n:30}},
  {nom:"Avería abierta más de 7 días",r:{m:"dias_averia",op:">",n:7}}];
let _RG=null;
const RG=()=>_RG||(_RG=Reglas({M:RG_M,F:RG_F,ejemplos:RG_EJ,hoy:()=>hoy(),toast:t=>toast(t),puede:()=>!window.SOLO_CONSULTA,
  leer:leerReglas,guardar:async L=>{cat.reglas=L;await saveCat();},alCambiar:()=>render(true),
  pie:"Las reglas se miran cada vez que se abre la app. Lo que salta sale en «Qué hacer hoy» y en la campana de todos."}));
/* lo que salta ahora: [{r, niv, txt, det, btn, fn}] (para «Qué hacer hoy» y la campana) */
function evalReglas(){try{return RG().evaluar();}catch(e){return[];}}
/* pantalla: Más → Reglas automáticas */
function vReglas(v){v.appendChild(RG().pantalla());}

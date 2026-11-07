/* ===== REGLAS AUTOMÁTICAS (Coladas) =====
   El mismo constructor de reglas que Almacén (comun/reglas.js): tú montas la regla como una frase y la app avisa sola
   en la campana. Aquí van las cosas que se pueden mirar en Coladas. Se guardan en los ajustes (cfg.reglas) y valen para todos.
   La tarjeta sale en Consultas › Reglas automáticas. */
const irCol=(t,v)=>()=>{tab=t;try{localStorage.setItem("colada.tab",t);}catch(e){}if(v&&typeof PANV!=="undefined"&&t in PANV)PANV[t]=v;tabsUI();render();try{document.querySelector("main").scrollTop=0;}catch(e){}};
const nomBl=(n,m)=>n+" · "+(MAT[m]?MAT[m].nom:m);
const blOk=(f,n,m)=>(!f.nave||n===f.nave)&&(!f.mat||m===f.mat);
/* kilos por nave y aleación de un tipo de apunte (C consumo, E entrada, A ajuste) entre dos fechas */
function kgPorBloque(t,d0,d1){const S=saldos(),G={};
  todosMovs().forEach(r=>{if(r.h||r.t!==t||!r.f||(d0&&r.f<d0)||r.f>d1)return;const l=lotes.find(x=>x.id===(r.o||r.d));const nv=l?l.nave:r.nv,ml=l?l.material:r.ml;if(!nv||!ml)return;
    const k=key(nv,ml);G[k]=G[k]||{nave:nv,mat:ml,kg:0};G[k].kg+=Math.abs(kgAp(r,S)||0);});
  return G;}
const RGC_F={nave:{e:"Nave",todos:"Las dos",opts:()=>NAVES.map(n=>[n,n]),txt:v=>" en la "+v},
  mat:{e:"Aleación",todos:"Las dos",opts:()=>Object.keys(MAT).map(m=>[m,MAT[m].nom]),txt:v=>" de "+(MAT[v]?MAT[v].nom:v)}};
const RGC_PER=["7d","hoy","30d","mes","mesant"];
const porBloque=(t,ir)=>(f,P)=>Object.values(kgPorBloque(t,P.d0,P.d1)).filter(b=>blOk(f,b.nave,b.mat)).map(b=>({nom:nomBl(b.nave,b.mat),v:Math.round(b.kg),btn:"Ver",fn:irCol(ir)}));
const RGC_M={
  dias_material:{g:"Stock",e:"Días de material en la nave",d:"Para cuántos días llega lo que hay en la nave, al ritmo de consumo de estos días.",s:"los días de material que quedan",pl:true,t:"días de material",u:"días",
    f:["nave","mat"],cada:" en alguna nave",cadaF:"nave",op:"<",def:5,
    calc:f=>Object.values(bloques().B).filter(b=>b.dias!=null&&blOk(f,b.nave,b.mat)).map(b=>({nom:nomBl(b.nave,b.mat),v:b.dias,btn:"Ver stock",fn:irCol("stock")}))},
  fardos_nave:{g:"Stock",e:"Fardos en la nave",s:"los fardos que hay en la nave",pl:true,t:"fardos en la nave",u:"fardos",f:["nave","mat"],cada:" en alguna nave",cadaF:"nave",op:"<",def:20,
    calc:f=>Object.values(bloques().B).filter(b=>blOk(f,b.nave,b.mat)).map(b=>({nom:nomBl(b.nave,b.mat),v:Math.round(b.faN),btn:"Ver stock",fn:irCol("stock")}))},
  stock_kg:{g:"Stock",e:"Kilos en stock (nave y fuera)",s:"los kilos en stock",pl:true,t:"kilos en stock",u:"kg",f:["nave","mat"],cada:" en alguna nave",cadaF:"nave",op:"<",def:20000,
    calc:f=>Object.values(bloques().B).filter(b=>blOk(f,b.nave,b.mat)).map(b=>({nom:nomBl(b.nave,b.mat),v:Math.round(b.kg),det:Math.round(b.kgN).toLocaleString("es-ES")+" kg en la nave y "+Math.round(b.kgE).toLocaleString("es-ES")+" kg fuera",btn:"Ver stock",fn:irCol("stock")}))},
  consumo_kg:{g:"Movimientos",e:"Kilos consumidos",s:"lo consumido",t:"consumido",u:"kg",f:["nave","mat"],cada:" en alguna nave",cadaF:"nave",per:RGC_PER,op:">",def:30000,calc:porBloque("C","consumo")},
  entradas_kg:{g:"Movimientos",e:"Kilos que han entrado",s:"lo que ha entrado",t:"ha entrado",u:"kg",f:["nave","mat"],cada:" en alguna nave",cadaF:"nave",per:["mes","7d","30d","mesant","hoy"],op:"<",def:50000,calc:porBloque("E","entrada")},
  ajustes_kg:{g:"Movimientos",e:"Kilos de ajustes",d:"Suma de los ajustes de stock (en positivo o en negativo).",s:"los kilos ajustados",pl:true,t:"kilos ajustados",u:"kg",f:["nave","mat"],cada:" en alguna nave",cadaF:"nave",per:["mes","7d","30d","mesant"],op:">",def:1000,calc:porBloque("A","hist")},
  relevos_sin:{g:"Pendientes",e:"Relevos sin consumo apuntado",d:"De las dos últimas semanas.",s:"el número de relevos sin apuntar",t:"relevos sin apuntar",u:"relevos",op:">",def:0,
    calc:()=>[{v:huecos().reduce((s,d)=>s+d.falta.length,0),btn:"Ver huecos",fn:irCol("consumo","huecos")}]},
  sin_albaran:{g:"Pendientes",e:"Entradas sin albarán",s:"el número de entradas sin albarán",t:"entradas sin albarán",u:"entradas",op:">",def:0,
    calc:()=>[{v:sinAlbaran().length,btn:"Ver entradas",fn:irCol("entrada")}]},
  incid_abiertas:{g:"Pendientes",e:"Incidencias de proveedor abiertas",s:"el número de incidencias abiertas",t:"incidencias abiertas",u:"incidencias",op:">",def:0,
    calc:()=>[{v:todasIncid().filter(r=>r.estado!=="cerrada").length,btn:"Ver",fn:irCol("hist")}]}};
const RGC_EJ=[{nom:"Quedan menos de 3 días de material",r:{m:"dias_material",op:"<",n:3,niv:"bad"}},
  {nom:"Menos de 20 fardos en la nave",r:{m:"fardos_nave",op:"<",n:20}},
  {nom:"Consumo de la semana de más de 30.000 kg",r:{m:"consumo_kg",p:"7d",op:">",n:30000,niv:"info"}},
  {nom:"Han entrado menos de 50.000 kg este mes",r:{m:"entradas_kg",p:"mes",op:"<",n:50000,niv:"info"}},
  {nom:"Ajustes de más de 1.000 kg en el mes",r:{m:"ajustes_kg",p:"mes",op:">",n:1000}},
  {nom:"Algún relevo sin consumo apuntado",r:{m:"relevos_sin",op:">",n:0}}];
let _RGC=null;
const RGC=()=>_RGC||(_RGC=Reglas({M:RGC_M,F:RGC_F,ejemplos:RGC_EJ,hoy:()=>hoy(),toast:t=>toast(t),puede:()=>!!window.WEB&&!!db,titulo:"Reglas automáticas",
  leer:()=>cfg.reglas||[],guardar:async L=>{cfg.reglas=L;await saveCfg();},alCambiar:()=>render(),
  pie:"Lo que salta sale en la campana de arriba. Las reglas valen para todos los que usan Coladas."}));
function evalReglasCol(){try{return RGC().evaluar();}catch(e){return[];}}
function cardReglasCol(){try{return RGC().pantalla();}catch(e){return null;}}

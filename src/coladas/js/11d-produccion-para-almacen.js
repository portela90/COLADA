/* ===== PRODUCCIÓN PARA ALMACÉN =====
   Almacén usa los kilos de aluminio consumidos para medir el gasto «por tonelada» y saber qué máquinas estaban paradas.
   Se guarda un resumen en docs col «prod» id «resumen» (solo lo leen los usuarios con acceso completo, no los de consulta):
   {ts, sem:{lunes:{n:{nave:kg}, m:{F25:kg}, d:{F25:días en marcha}}}, mes:{"2026-10":{n,m,d}}}
   El consumo de cada relevo se reparte entre las máquinas en marcha de esa nave con esa aleación. */
function lunesDe(f){const d=new Date(f+"T12:00:00"),w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return d.toISOString().slice(0,10);}
function prodResumen(){const S=saldos(),h=hoy(),lim=ymd(new Date(Date.now()-400*864e5));const sem={},mes={};const cache={};
  const est=(f,u)=>{const k=f+"|"+(u||"");return cache[k]||(cache[k]=estadoMaq(f,u));};const hayEv=!!primerEvMaq();
  const B=(o,k)=>o[k]=o[k]||{n:{},m:{},d:{}};const sum=(o,k,v)=>{o[k]=Math.round(((o[k]||0)+v)*10)/10;};
  const diasC={};
  movs().forEach(r=>{if(r.t!=="C"||!r.f||r.f<lim||r.f>h)return;const l=lotes.find(x=>x.id===r.o);const nv=l?l.nave:r.nv,ml=l?l.material:r.ml;if(!nv)return;
    const kg=Math.abs(l?kgAp(r,S):(typeof r.kg==="number"?r.kg:0));if(!kg)return;const s=B(sem,lunesDe(r.f)),m=B(mes,r.f.slice(0,7));sum(s.n,nv,kg);sum(m.n,nv,kg);diasC[r.f+"|"+nv]=1;
    if(!hayEv)return;const st=est(r.f,r.u);const az=ml==="L-2521-B";const on=MAQ[nv].filter(c=>st[c]&&st[c].on&&(!ml||!!st[c].az===az));if(!on.length)return;
    on.forEach(c=>{sum(s.m,c,kg/on.length);sum(m.m,c,kg/on.length);});});
  /* días en marcha: días con consumo en su nave en que la máquina estaba en marcha */
  if(hayEv)Object.keys(diasC).forEach(k=>{const[f,nv]=k.split("|");const st=est(f);MAQ[nv].forEach(c=>{if(st[c]&&st[c].on){sum(B(sem,lunesDe(f)).d,c,1);sum(B(mes,f.slice(0,7)).d,c,1);}});});
  return{sem,mes,maqEv:hayEv};}
let _prodT=null,_prodU="";
function prodAlmacen(){if(!ready||!db||!window.WEB)return;clearTimeout(_prodT);_prodT=setTimeout(async()=>{try{const R=prodResumen();const u=JSON.stringify(R);if(u===_prodU)return;_prodU=u;
  await db.doc("prod/resumen").set(Object.assign(R,{ts:Date.now()}));}catch(e){}},30000);}
window.__prodResumen=()=>prodResumen();

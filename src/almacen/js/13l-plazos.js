/* ===== PLAZOS DE ENTREGA APRENDIDOS =====
   Si el artículo y su proveedor no tienen plazo puesto, se calcula con lo que ha pasado de verdad:
   - compras: días desde que se marcó «pedido» hasta que entró (las entradas guardan ped = fecha del pedido);
   - recuperación de pistones (Meyusa): días desde cada envío a recuperar hasta la siguiente recepción.
   Con 2 o más casos se usa la mediana; primero los del propio artículo y, si no hay, los de su proveedor. */
let _plzC=null;
function muestrasPlazo(){const k=todosMov().length+"|"+((cat.pusados&&cat.pusados.ev)||[]).length;if(_plzC&&_plzC.k===k)return _plzC.r;
  const art0={},prov0={};const add=(o,k,d)=>{if(!k||!(d>=0))return;(o[k]=o[k]||[]).push(d);};
  todosMov().forEach(m=>{if(m.tipo!=="entrada"||!/^\d{4}-\d{2}-\d{2}$/.test(m.ped||"")||m.f<m.ped)return;const d=dias(m.ped,m.f);add(art0,m.art,d);const a=art(m.art);add(prov0,m.prov||(a&&a.prov),d);});
  const ev=((cat.pusados&&cat.pusados.ev)||[]).slice().sort((a,b)=>a.f.localeCompare(b.f)||a.ts-b.ts);const pv=cat.proveedores.find(p=>String(p.nom||"").toUpperCase().includes(PU_REC));
  if(pv){let env=null;ev.forEach(e=>{if(e.t==="envio")env=env||e.f;else if(e.t==="recep"&&env){add(prov0,pv.id,dias(env,e.f));env=null;}});}
  const r={art0,prov0};_plzC={k,r};return r;}
function plazoAprendido(a){const M=muestrasPlazo(),med=v=>{const s=v.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
  const va=M.art0[a.id]||[];if(va.length>=2)return{dias:Math.max(1,med(va)),n:va.length,de:"artículo"};
  const vp=M.prov0[a.prov]||[];if(vp.length>=2)return{dias:Math.max(1,med(vp)),n:vp.length,de:"proveedor"};return null;}

/* ---------- Navegar como en Almacén (28/11/2026) ----------
   Para comun/navegar.js: qué se puede tocar en Coladas. El nombre de una colada lleva a su ficha (toda su historia)
   y el número de un albarán, a la ficha del albarán. Y al cerrar una pantalla se vuelve a pintar la de debajo. */
window.NAV_CFG={nombre:"Coladas",vista:"#view",repinta:()=>render(),
  firma:()=>lotes.length+"|"+Object.keys(meses).reduce((t,k)=>t+(meses[k]||[]).length,0),
  enlaces:()=>{const o=[];lotes.forEach(l=>{if(l.nombre)o.push([l.nombre,"Colada",()=>abrirFicha(l.id)]);});
    const A=new Set();lotes.forEach(l=>{if(l.albaran)A.add(String(l.albaran).trim());});todosMovs().forEach(r=>{if(r.t==="E"&&r.a)A.add(String(r.a).trim());});
    A.forEach(a=>o.push([a,"Albarán",()=>abrirAlbaran(a)]));return o;}};

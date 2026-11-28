/* ---------- Navegar como en Almacén (28/11/2026) ----------
   Para comun/navegar.js: qué se puede tocar en Limpieza. El código de una inyectora o un horno (F29, H-F29…) lleva
   a su ficha. La lista de máquinas se pide una vez al entrar. */
let _navEls=false;
window.NAV_CFG={nombre:"Limpieza",vista:"#v",repinta:()=>pinta(),
  firma:()=>(ELS?ELS.length:0)+"",
  enlaces:()=>{if(!ELS&&!_navEls&&S.tok){_navEls=true;elementosL().catch(()=>{});}
    const o=[];(ELS||[]).forEach(e=>{if(e.codigo){o.push([e.codigo,"Máquina",()=>fichaElemento(e.codigo)]);if(/^H-/.test(e.codigo)===false&&e.nombre&&e.nombre!==e.codigo)o.push([e.nombre,"Máquina",()=>fichaElemento(e.codigo)]);}});return o;}};

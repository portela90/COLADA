/* Exportar a Excel desde cualquier tabla: encima de cada tabla con datos sale un botón «Excel» que la descarga tal cual
   (con los números como números: 3.012 → 3012, 2,670 → 2,67). Funciona solo, también con las tablas que se añadan más adelante.
   No se pone en tablas de una sola fila ni donde la tarjeta ya tiene su propio botón de Excel. */
(function(){
  if(window.EXCEL_TABLAS)return;window.EXCEL_TABLAS=true;
  const XLSX_URL="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
  const carga=()=>window.XLSX?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement("script");s.src=XLSX_URL;s.onload=()=>res();s.onerror=()=>rej(new Error("no se pudo cargar el generador de Excel"));document.head.appendChild(s);});
  /* número en español (con o sin unidad detrás) → número; si no lo es, el texto */
  function valor(t){t=(t||"").replace(/\s+/g," ").trim();if(!t||t==="—"||t==="-"||t==="–")return t==="—"||t==="–"?"":t;
    const m=t.match(/^([+\-−]?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?\s*(?:kg|t|€|€\/kg|%|ud|uds|l|f|fardos|días|d|h|min)?$/i);
    if(!m)return t;const n=+(m[2].replace(/\./g,"")+(m[3]?"."+m[3]:""));return (m[1]==="-"||m[1]==="−")?-n:n;}
  function filas(tb){const out=[];for(const sec of [tb.tHead,...tb.tBodies,tb.tFoot])if(sec)for(const r of sec.rows){if(r.hidden||r.style.display==="none")continue;const f=[];
      for(const c of r.cells){const v=sec===tb.tHead?(c.textContent||"").replace(/\s+/g," ").trim():valor(c.textContent);f.push(v);for(let k=1;k<(c.colSpan||1);k++)f.push("");}out.push(f);}
    return out;}
  function titulo(tb){const c=tb.closest(".card,.dlg,section");const h=c&&c.querySelector("h2,h3,.pg-h");const t=(h&&h.textContent||document.title||"tabla").replace(/\s*\(\d+\)\s*$/,"").trim();
    return t.replace(/[\\/:*?"<>|]+/g,"").slice(0,60)||"tabla";}
  async function guarda(nombre,buf){
    try{if(window.claude&&claude.use){const dl=await claude.use("downloads");if(dl){await dl.save({filename:nombre,data:buf});return true;}}}catch(e){if(e&&e.code==="declined")return false;}
    const bl=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),u=URL.createObjectURL(bl),a=document.createElement("a");
    a.href=u;a.download=nombre;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);a.remove();},2000);return true;}
  async function exporta(tb,b){const t0=b.textContent;b.disabled=true;b.textContent="Preparando…";
    try{await carga();const X=window.XLSX,F=filas(tb),ws=X.utils.aoa_to_sheet(F);
      ws["!cols"]=(F[0]||[]).map((_,i)=>({wch:Math.min(40,Math.max(8,...F.map(f=>String(f[i]==null?"":f[i]).length+2)))}));
      const wb=X.utils.book_new(),tt=titulo(tb);X.utils.book_append_sheet(wb,ws,tt.slice(0,31).replace(/[\[\]*?:\/\\]/g,"")||"Hoja1");
      const d=new Date(),f=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
      await guarda(tt+" "+f+".xlsx",X.write(wb,{bookType:"xlsx",type:"array"}));}
    catch(e){alertaSuave("No se pudo hacer el Excel: "+(e.message||e));}
    finally{b.disabled=false;b.textContent=t0;}}
  function alertaSuave(m){if(typeof window.toast==="function")return window.toast(m);const d=document.createElement("div");d.textContent=m;d.style.cssText="position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#16212C;color:#fff;padding:10px 16px;border-radius:999px;z-index:99;font:14px system-ui";document.body.appendChild(d);setTimeout(()=>d.remove(),3500);}
  function tieneExcel(c){return c&&[...c.querySelectorAll("button")].some(b=>!b.classList.contains("xl-b")&&/excel/i.test(b.textContent||""));}
  function revisa(){document.querySelectorAll("main table, .dlg table").forEach(tb=>{
    if(tb.dataset.xl)return;const nf=[...tb.tBodies].reduce((s,x)=>s+x.rows.length,0);if(nf<2||tb.closest(".no-excel,.campana-pan"))return;
    const c=tb.closest(".card,.dlg");if(tieneExcel(c)){tb.dataset.xl="no";return;}
    tb.dataset.xl="1";const ref=tb.parentElement&&tb.parentElement.classList.contains("tw")||tb.parentElement&&getComputedStyle(tb.parentElement).overflowX!=="visible"&&tb.parentElement.children.length===1?tb.parentElement:tb;
    const bar=document.createElement("div");bar.className="xl-bar";const b=document.createElement("button");b.type="button";b.className="xl-b";
    b.innerHTML='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg><span>Excel</span>';
    b.setAttribute("aria-label","Descargar esta tabla en Excel");b.title="Descargar esta tabla en Excel";b.onclick=()=>exporta(tb,b);bar.appendChild(b);
    if(ref.parentNode)ref.parentNode.insertBefore(bar,ref);});}
  let pend=false;const luego=()=>{if(pend)return;pend=true;setTimeout(()=>{pend=false;try{revisa();}catch(e){}},250);};
  const ini=()=>{revisa();try{new MutationObserver(luego).observe(document.body,{childList:true,subtree:true});}catch(e){}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ini);else ini();
  window.excelTabla=exporta;window._valorExcel=valor;
})();

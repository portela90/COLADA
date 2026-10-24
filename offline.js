/* Modo sin conexión (Almacén, Coladas, Inicio y Limpieza)
   - Guarda en el móvil (IndexedDB) lo último que se leyó, para abrir la app sin red.
   - Lo que se apunta sin red se guarda en una cola y se envía solo cuando vuelve la conexión.
   - Muestra una barra: «Sin conexión · N cambios pendientes».
   Cada app le dice cómo enviar un cambio (OFF.ejecutor) y qué hacer al terminar (OFF.alVaciar). */
(function(){
  if(window.OFF)return;
  var DBN="mapri-offline",ST="kv",dbp=null,mem={};
  function idb(){if(dbp)return dbp;dbp=new Promise(function(ok){try{var r=indexedDB.open(DBN,1);
      r.onupgradeneeded=function(){r.result.createObjectStore(ST);};r.onsuccess=function(){ok(r.result);};r.onerror=function(){ok(null);};}catch(e){ok(null);}});return dbp;}
  function lee(k){return idb().then(function(d){if(!d)return mem[k];return new Promise(function(ok){try{var q=d.transaction(ST).objectStore(ST).get(k);q.onsuccess=function(){ok(q.result);};q.onerror=function(){ok(mem[k]);};}catch(e){ok(mem[k]);}});});}
  function guarda(k,v){mem[k]=v;return idb().then(function(d){if(!d)return;return new Promise(function(ok){try{var t=d.transaction(ST,"readwrite");t.objectStore(ST).put(v,k);t.oncomplete=ok;t.onerror=ok;t.onabort=ok;}catch(e){ok();}});});}
  var RED=/Failed to fetch|Load failed|NetworkError|network ?error|ERR_INTERNET|ERR_NETWORK|offline|The Internet connection appears|fetch failed|timed? ?out|AbortError|Network request failed/i;
  function esRed(e){if(!navigator.onLine)return true;if(!e)return false;if(e.name==="TypeError"&&!e.code)return true;
    var m=String(e.message||e.details||e.hint||e);return RED.test(m)||e.status===0;}

  /* ---------- cola de cambios pendientes ---------- */
  var COLA=[],cargada=lee("cola").then(function(c){COLA=Array.isArray(c)?c:[];pinta();return COLA;}),fallos=0,enviando=false;
  function guardaCola(){return guarda("cola",COLA);}
  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
  function encola(op){return cargada.then(function(){op.qid=uid();op.ts=Date.now();op.ambito=OFF.ambito;COLA.push(op);pinta();return guardaCola();});}
  /* cada app (ámbito) solo ve y envía sus cambios: Almacén/Coladas/Inicio = "colada", Limpieza = "limpieza" */
  function mias(){return COLA.filter(function(o){return (o.ambito||"colada")===OFF.ambito;});}
  var clave=function(it){return it&&typeof it==="object"?(it.id!=null?"id:"+it.id:it.i!=null?"i:"+it.i:JSON.stringify(it)):String(it);};
  /* aplica los cambios pendientes a un documento {items:[...]} leído (del servidor o del móvil) */
  function aplicaDoc(col,id,data){var ops=mias().filter(function(o){return o.col===col&&o.id===id;});if(!ops.length)return data;
    var d=JSON.parse(JSON.stringify(data||{}));var it=Array.isArray(d.items)?d.items:[];
    ops.forEach(function(o){var a=o.args||{};
      if(o.fn==="docs_items_add"){var hay={};it.forEach(function(x){hay[clave(x)]=1;});(a.p_items||[]).forEach(function(x){if(!hay[clave(x)])it.push(x);});}
      else if(o.fn==="docs_items_del_id"){var q={};(a.p_ids||[]).forEach(function(x){q[String(x)]=1;});it=it.filter(function(x){return !(x&&(q[String(x.id)]||q[String(x.i)]));});}
      else if(o.fn==="docs_items_patch_id"){(a.p_items||[]).forEach(function(p){var k=p.id!=null?"id":"i";it=it.map(function(x){return x&&x[k]===p[k]?Object.assign({},x,p):x;});});}
      });
    d.items=it;return d;}
  function aplicaCol(col,rows){var r=(rows||[]).map(function(x){return{id:x.id,data:aplicaDoc(col,x.id,x.data)};});
    mias().forEach(function(o){if(o.col===col&&o.fn==="docs_items_add"&&!r.some(function(x){return x.id===o.id;}))r.push({id:o.id,data:aplicaDoc(col,o.id,{items:[]})});});return r;}
  /* envía la cola en orden; si falla la red, para y lo intenta luego */
  function vaciar(){if(enviando||!navigator.onLine||!OFF.ejecutor)return Promise.resolve();
    return cargada.then(function(){if(!mias().length)return;enviando=true;pinta();var hechas=[];
      var quita=function(op){var i=COLA.indexOf(op);if(i>=0)COLA.splice(i,1);};
      var paso=function(){var op=mias()[0];if(!op)return Promise.resolve();
        return Promise.resolve().then(function(){return OFF.ejecutor(op);}).then(function(){quita(op);hechas.push(op);fallos=0;return guardaCola().then(paso);},
          function(e){if(esRed(e))return;/* error del servidor: se aparta para no bloquear el resto y se avisa */
            quita(op);OFF.fallidos.push({op:op,error:String(e&&e.message||e)});try{if(window.reportarError)window.reportarError(e,"cola sin conexión: "+op.fn);}catch(x){}
            fallos++;return guardaCola().then(paso);});};
      return paso().then(function(){enviando=false;pinta();if(hechas.length&&OFF.alVaciar){var cols={};hechas.forEach(function(o){if(o.col)cols[o.col]=1;});try{OFF.alVaciar(Object.keys(cols),hechas);}catch(e){}}
        if(hechas.length)aviso(hechas.length===1?"Enviado el cambio que tenías sin conexión":"Enviados los "+hechas.length+" cambios que tenías sin conexión");});});}

  /* ---------- barra de estado ---------- */
  var barra=null,redOk=navigator.onLine;
  function aviso(t){var a=document.createElement("div");a.setAttribute("role","status");a.textContent=t;
    a.style.cssText="position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:3000;background:#1D2D3E;color:#fff;font:600 14px/1.3 Inter,system-ui,sans-serif;padding:10px 14px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.25);max-width:calc(100vw - 32px)";
    document.body.appendChild(a);setTimeout(function(){a.remove();},3500);}
  function pinta(){if(!document.body){document.addEventListener("DOMContentLoaded",pinta,{once:true});return;}
    var n=mias().length,sin=!navigator.onLine||!redOk,fx=OFF.fallidos.length;
    if(!sin&&!n&&!fx){if(barra){barra.remove();barra=null;}return;}
    if(!barra){barra=document.createElement("div");barra.id="off-barra";barra.setAttribute("role","status");
      barra.style.cssText="position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 60px);z-index:2500;font:600 13px/1.25 Inter,system-ui,sans-serif;padding:6px 12px;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.18);max-width:calc(100vw - 24px);text-align:center;cursor:default";
      barra.onclick=function(){if(OFF.fallidos.length)detalleFallos();else vaciar();};document.body.appendChild(barra);}
    var t;if(sin)t="Sin conexión"+(n?" · "+n+(n===1?" cambio pendiente":" cambios pendientes")+" de enviar":" · ves los últimos datos guardados");
    else if(n)t=(enviando?"Enviando ":"Pendientes de enviar: ")+n+(n===1?" cambio":" cambios");
    else t=fx+(fx===1?" cambio no se pudo guardar":" cambios no se pudieron guardar")+" · toca para ver";
    barra.textContent=t;barra.style.background=fx&&!sin&&!n?"#AA0808":sin?"#E9730C":"#0064D9";barra.style.color="#fff";}
  function detalleFallos(){var F=OFF.fallidos.slice();OFF.fallidos=[];pinta();
    alert("No se pudieron guardar estos cambios hechos sin conexión (el servidor los rechazó):\n\n"+F.map(function(f){return "· "+(f.op.desc||f.op.fn)+": "+f.error;}).join("\n")+"\n\nVuelve a apuntarlos si hace falta.");}
  function red(ok){if(redOk!==ok){redOk=ok;pinta();if(ok)vaciar();}}

  window.addEventListener("online",function(){redOk=true;pinta();setTimeout(vaciar,800);});
  window.addEventListener("offline",function(){redOk=false;pinta();});
  document.addEventListener("visibilitychange",function(){if(!document.hidden)vaciar();});
  setInterval(function(){if(mias().length)vaciar();},20000);

  window.OFF={lee:lee,guarda:guarda,esRed:esRed,encola:encola,aplicaDoc:aplicaDoc,aplicaCol:aplicaCol,vaciar:vaciar,red:red,pinta:pinta,aviso:aviso,
    cola:mias,listo:cargada,fallidos:[],ejecutor:null,alVaciar:null,ambito:"colada"};
})();

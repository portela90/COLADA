/* Registro de errores: lo que falle en el móvil de alguien queda apuntado en Supabase (tabla app_errores).
   Uso: <script src="errlog.js" data-app="almacen" data-sb="colada"></script> lo antes posible en la página. */
(function(){
  var me=document.currentScript||{},ds=me.dataset||{};
  var SB={colada:["https://whemhkcrgwyjucpaswrm.supabase.co","sb_publishable_hcFf66q2-0X6pR1gq5YKpw_u4G6HriG"],
          limpieza:["https://uddejncrjcyyaxjocbpj.supabase.co","sb_publishable_UqnQLvLkCI0kk_y1KDt94Q_ccYmLw2i"]}[ds.sb||"colada"];
  if(!SB)return;
  var APP=ds.app||location.pathname.split("/").pop().replace(/\.html$/,"")||"index",vistos={},n=0,COLA="errlog.cola";
  var build=function(){var m=document.querySelector('meta[name="build"]');return m?m.content:"";};
  var quien=function(){try{if(window.yoNombre){var y=window.yoNombre();if(y)return y;}}catch(e){}
    try{var j=JSON.parse(localStorage.getItem("limp.yo")||"null");if(j&&j.nombre)return j.nombre;}catch(e){}return null;};
  /* fallos de red y avisos del navegador que no son errores de la app */
  var RUIDO=/ResizeObserver loop|^Script error\.?$|Failed to fetch|Load failed|NetworkError|network error|The operation was aborted|AbortError|cancelad|The user aborted|Non-Error promise rejection|play\(\) request was interrupted|NotAllowedError/i;
  function enviar(p){try{return fetch(SB[0]+"/rest/v1/rpc/log_error",{method:"POST",keepalive:true,headers:{apikey:SB[1],Authorization:"Bearer "+SB[1],"Content-Type":"application/json"},body:JSON.stringify({p:p})})
      .then(function(r){if(!r.ok)throw new Error(r.status);});}catch(e){return Promise.reject(e);}}
  function guarda(p){try{var c=JSON.parse(localStorage.getItem(COLA)||"[]");c.push(p);localStorage.setItem(COLA,JSON.stringify(c.slice(-20)));}catch(e){}}
  function vacia(){var c;try{c=JSON.parse(localStorage.getItem(COLA)||"[]");}catch(e){c=[];}if(!c.length||!navigator.onLine)return;
    try{localStorage.removeItem(COLA);}catch(e){}c.forEach(function(p){enviar(p).catch(function(){guarda(p);});});}
  function reporta(msg,stack,extra){msg=String(msg||"").slice(0,500);if(!msg||RUIDO.test(msg)||/solo consulta/.test(msg)||window.SOLO_CONSULTA)return;var k=msg+"|"+String(stack||"").split("\n")[1];
    if(vistos[k]||n>=15)return;vistos[k]=1;n++;
    var p={app:APP,build:build(),msg:msg,stack:String(stack||"").slice(0,3000)+(extra?"\n[contexto] "+extra:""),url:location.pathname+location.search,ua:navigator.userAgent,usuario:quien()};
    if(!navigator.onLine){guarda(p);return;}enviar(p).catch(function(){guarda(p);});}
  window.addEventListener("error",function(e){if(!e||!e.message)return;/* errores de carga de imágenes o scripts: no llevan message */
    reporta(e.message,(e.error&&e.error.stack)||(e.filename?e.filename+":"+e.lineno+":"+e.colno:""));});
  window.addEventListener("unhandledrejection",function(e){var r=e&&e.reason;reporta(r&&r.message?r.message:String(r),r&&r.stack);});
  window.addEventListener("online",vacia);setTimeout(vacia,4000);
  window.reportarError=function(err,contexto){reporta(err&&err.message?err.message:String(err),err&&err.stack,contexto);};
})();

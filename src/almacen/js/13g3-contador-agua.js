/* ===== CONTADOR DEL AGUA =====
   Un solo contador (no va por naves), en m³, que se lee cada día. Se guarda con las lecturas de aceite y glicol
   (colección «cont») como si fuera un punto más: items {id,f,nave:"Agua",c:{agua:m³},por,ts}.
   El consumo es la diferencia con la lectura anterior. */
const AGUA="Agua";
const fmtM3=v=>(Math.round(v*100)/100).toLocaleString("es-ES",{maximumFractionDigits:2})+" m³";
/* tramos entre lecturas: m³, días (todos los días cuentan: el agua se gasta también en fin de semana) y m³ por día */
function tramosAgua(){const L=lectDe(AGUA).filter(r=>r.c&&typeof r.c.agua==="number");const out=[];
  for(let i=1;i<L.length;i++){const a=L[i-1],b=L[i],dif=Math.round((b.c.agua-a.c.agua)*100)/100,d=Math.max(1,dias(a.f,b.f));out.push({f0:a.f,f:b.f,dif,d,mpd:dif/d,por:b.por||"",r:b});}
  out.forEach((t,i)=>{const prev=out.slice(Math.max(0,i-20),i).filter(x=>x.dif>=0).map(x=>x.mpd).sort((x,y)=>x-y);const med=prev.length?prev[Math.floor(prev.length/2)]:null;
    t.normal=med;t.raro=t.dif<0?"baja":(prev.length>=5&&med!=null&&t.mpd>Math.max(med*2,med+1)&&t.dif>1)?"alto":"";});
  return out;}
function avisoAgua(f,x){const L=lectDe(AGUA),ant=L.filter(r=>r.f<f).pop();if(!ant||typeof ant.c.agua!=="number")return"";const d=Math.round((x-ant.c.agua)*100)/100;
  if(d<0)return"Marca menos que la lectura anterior ("+fmtN(ant.c.agua)+" el "+fmtF(ant.f)+"). ¿Error al leer o contador cambiado?";
  const T=tramosAgua().filter(t=>t.dif>=0).slice(-20).map(t=>t.mpd).sort((a,b)=>a-b),med=T.length?T[Math.floor(T.length/2)]:null,dd=Math.max(1,dias(ant.f,f));
  if(med!=null&&T.length>=5&&d/dd>Math.max(med*3,med+1)&&d>1)return fmtM3(d)+(dd>1?" en "+dd+" días":"")+": más de 3 veces lo normal ("+fmtM3(med)+"/día). ¿Hay alguna fuga o un número mal leído?";
  return"";}
function formAgua(f0){const st={f:f0||hoy(),v:""};const box=el("div",{style:"display:grid;gap:10px"});
  const pinta=()=>{box.textContent="";const L=lectDe(AGUA),esta=L.find(r=>r.f===st.f),ant=L.filter(r=>r.f<st.f).pop();
    if(esta&&!st.cargada){st.v=String(esta.c.agua).replace(".",",");st.cargada=true;}
    box.appendChild(el("p",{class:"hint",style:"margin:0",text:ant?"Lectura anterior: "+fmtN(ant.c.agua)+" m³ el "+fmtF(ant.f)+(ant.por?" ("+ant.por+")":"")+".":"Primera lectura: a partir de la siguiente ya se calcula lo gastado."}));
    if(esta)box.appendChild(el("div",{class:"banner w"},[el("div",{text:"Ya hay lectura del agua el "+fmtF(st.f)+": cambia el número si está mal y pulsa «Guardar» para corregirla."}),
      window.SOLO_CONSULTA?null:el("button",{type:"button",class:"btn sec peq",style:"margin-top:8px",text:"Borrar la lectura de este día",onclick:()=>confirmar("¿Borrar la lectura?","Se borra la lectura del agua del "+fmtF(st.f)+". El consumo se vuelve a calcular con la lectura anterior y la siguiente.","Borrar",async()=>{try{await quitaDep(esta);toast("Lectura borrada");cerrarDlgs();render(true);}catch(e){toast("No se pudo borrar");return false;}})})]));
    const out=el("div",{class:"sub",style:"min-height:18px"});
    const calc=()=>{const x=parseN(st.v);out.textContent="";out.className="sub";if(!isFinite(x)||st.v===""||!ant)return;const av=avisoAgua(st.f,x);
      if(av){out.textContent=av;out.className="sub neg";return;}const d=Math.round((x-ant.c.agua)*100)/100,dd=Math.max(1,dias(ant.f,st.f));out.textContent="= "+fmtM3(d)+(dd>1?" en "+dd+" días ("+fmtM3(d/dd)+"/día)":"");};
    const iv=inp("aguaV",st.v,v=>{st.v=v;calc();},{inputmode:"decimal",class:"num",autocomplete:"off",placeholder:ant?fmtN(ant.c.agua):"m³"});
    const fb=botonFotoCont("agua",ant?ant.c.agua:null,v=>{st.v=String(v).replace(".",",");iv.value=st.v;iv.classList.add("leido");calc();},()=>({cont:"agua",nave:""}));
    box.appendChild(fld("Lectura del contador (m³)"+(ant?" · antes "+fmtN(ant.c.agua):""),el("div",{style:"display:grid;gap:2px"},[fb?el("div",{class:"con-foto"},[iv,fb]):iv,out])));calc();
    box.appendChild(el("p",{class:"hint",style:"margin:0",text:"Apunta los números negros del contador (los m³ enteros)."}));};
  pinta();
  dlg("Lectura del agua",[fld("Fecha",inp("aguaF",st.f,v=>{if(v===st.f)return;st.f=v;st.cargada=false;pinta();},{type:"date",max:hoy()})),box],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const s=String(st.v||"").trim(),x=parseN(s);if(!s||!isFinite(x)||x<0){toast("Escribe la lectura del contador");return false;}
      const av=avisoAgua(st.f,x),firma=st.f+"|"+x;if(av&&st.avisado!==firma){st.avisado=firma;toast("Revisa la lectura y pulsa «Guardar» otra vez si está bien");return false;}
      const esta=lectDe(AGUA).find(r=>r.f===st.f);try{await guardaLect({f:st.f,nave:AGUA,c:{agua:x}},esta);}catch(e){toast("No se pudo guardar");return false;}
      toast("Lectura del agua guardada");render(true);}}]);}
function cardAgua(){const h=hoy(),m0=h.slice(0,7)+"-01",L=lectDe(AGUA),u=L[L.length-1],T=tramosAgua(),t=T[T.length-1];
  const mes=T.filter(x=>x.f>=m0&&x.dif>0).reduce((s,x)=>s+x.dif,0),d30=T.filter(x=>x.f>=sumaDias(h,-30)&&x.dif>=0),md=d30.reduce((s,x)=>s+x.d,0),med=md?d30.reduce((s,x)=>s+x.dif,0)/md:null;
  const w=new Date(h+"T12:00:00").getDay(),falta=L.length&&u.f!==h&&w>0&&w<6,raros=T.filter(x=>x.raro&&x.f>=sumaDias(h,-7));
  return el("section",{class:"card"+(raros.length?" alerta":""),id:"aguaCard"},[el("div",{class:"hd"},[el("h2",{text:"Contador del agua"}),el("span",{class:"der sub",text:u?"última: "+fmtF(u.f)+(u.f===h?" (hoy)":""):"sin lecturas"})]),
    el("div",{class:"bd",style:"display:grid;gap:10px"},[
      falta?el("div",{class:"banner w",text:"Falta la lectura del agua de hoy."}):null,
      raros.length?el("div",{class:"banner b",text:"Consumo raro: "+raros.map(x=>fmtF(x.f)+" "+(x.raro==="baja"?"(el contador marca menos que antes)":fmtM3(x.mpd)+"/día, lo normal "+fmtM3(x.normal)+"/día")).join(" · ")}):null,
      el("dl",{class:"kpis num"},[["Última lectura",u?fmtN(u.c.agua)+" m³":"—"],["Último consumo",t?(t.dif<0?"¿?":fmtM3(t.dif)+(t.d>1?" ("+t.d+" d)":"")):"—"],["Este mes",mes?fmtM3(mes):"—"],["Media por día (30 d)",med!=null?fmtM3(med):"—"]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))),
      el("div",{class:"acciones acc2"},[window.SOLO_CONSULTA?null:el("button",{type:"button",class:"btn",id:"bAgua",text:"Apuntar lectura del agua",onclick:()=>formAgua()}),el("button",{type:"button",class:"btn sec",text:"Gráfica y lecturas",onclick:()=>informeAgua()})].filter(Boolean))])]);}
/* pantalla del agua (27/11/2026): antes era una ventanita; ahora pantalla entera con gráficas, cada lectura y cómo funciona */
function informeAgua(){const B={res:el("div",{class:"pz"}),lec:el("div",{class:"pz"}),como:el("div",{class:"pz"})};
  function pinta(){const T=tramosAgua(),ok=T.filter(t=>t.dif>=0),h=hoy(),mes=h.slice(0,7),ant=sumaDias(mes+"-01",-1).slice(0,7);
    const enMes=m=>ok.filter(t=>t.f.slice(0,7)===m).reduce((s,t)=>s+t.dif,0),u30=ok.filter(t=>t.f>=sumaDias(h,-30)),dd=u30.reduce((s,t)=>s+t.d,0),R=T.filter(t=>t.raro&&t.f>=sumaDias(h,-30));
    Object.values(B).forEach(b=>b.textContent="");
    B.res.appendChild(el("div",{class:"pz-barra"},[el("div",{class:"pz-acc"},[window.SOLO_CONSULTA?null:el("button",{type:"button",class:"btn",text:"Apuntar lectura del agua",onclick:()=>formAgua()}),el("button",{type:"button",class:"btn sec",text:"Excel",onclick:e=>excelCont(e.currentTarget)})])]));
    B.res.appendChild(pzCifras([["Este mes",fmtM3(enMes(mes)),"el mes pasado "+fmtM3(enMes(ant)),""],["Al día",dd?fmtM3(u30.reduce((s,t)=>s+t.dif,0)/dd):"—","media de los últimos 30 días",""],
      ["Lecturas raras",String(R.length),"en 30 días",R.length?"bad":"ok"],["Última lectura",lectDe(AGUA).length?fmtF(lectDe(AGUA).slice(-1)[0].f):"—","",""]]));
    if(!ok.length){B.res.appendChild(pzPan("Agua",null,[pzVacio("Todavía no hay dos lecturas seguidas para calcular el consumo.")]));}
    else{const M=[];for(let i=11;i>=0;i--){const d=new Date(+mes.slice(0,4),+mes.slice(5,7)-1-i,1);M.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));}
      B.res.appendChild(pzPan("m³ por mes","los últimos 12 meses",[pzBarras(M.map(m=>cap(MESES[+m.slice(5,7)-1].slice(0,3))),M.map(enMes),v=>fmtN(Math.round(v))+" m³")]));
      const U=T.slice(-20);B.res.appendChild(pzPan("m³ al día en cada lectura","las 20 últimas · en rojo las que no cuadran",[pzBarras(U.map(t=>t.f.slice(8,10)+"/"+t.f.slice(5,7)),U.map(t=>Math.max(0,t.mpd||0)),v=>fmtN(Math.round(v*10)/10),{mal:U.map(t=>!!t.raro),click:window.SOLO_CONSULTA?null:i=>formAgua(U[i].f)})]));}
    B.lec.appendChild(pzPan("Cada lectura",window.SOLO_CONSULTA?"":"toca una para corregirla o borrarla",[T.length?cTabla(["Fecha","Marca el contador","Gastado desde la anterior","Días","m³ al día","Lo normal","Cómo está"],
      T.slice().reverse().slice(0,60).map(t=>Object.assign([fmtF(t.f),fmtN(t.r.c.agua),t.dif<0?"−"+fmtM3(Math.abs(t.dif)):fmtM3(t.dif),String(t.d),t.dif<0?"—":fmtM3(t.mpd),t.normal!=null?fmtM3(t.normal):"—",t.raro==="baja"?"⚠ marca menos que la anterior":t.raro?"⚠ mucho más de lo normal":"bien"],window.SOLO_CONSULTA?{}:{__ir:()=>formAgua(t.f)})),[1,2,3,4,5]):pzVacio("Sin lecturas.")]));
    B.como.appendChild(pzPan("Cómo funciona",null,[el("div",{class:"pz-texto"},["El contador del agua marca el total de metros cúbicos (m³) que han pasado desde que se puso, como el cuentakilómetros de un coche. 1 m³ son 1000 litros.",
      "Lo gastado es la resta entre la lectura de hoy y la anterior. «Al día» reparte eso entre los días que han pasado entre las dos lecturas.",
      "«Marca menos que la anterior» casi siempre es un número mal apuntado: tócalo y corrígelo. «Mucho más de lo normal» puede ser una fuga o un llenado: si el número está bien, pregunta en la nave qué pasó ese día."].map(p=>el("p",{text:p})))]));}
  pinta();objPage({ruta:["Almacén","Piezas","Aceites"],titulo:"Contador del agua",sub:"Cuánta agua se gasta y si alguna lectura no cuadra.",volver:"Aceites",tabs:[["Resumen",[B.res]],["Cada lectura",[B.lec]],["Cómo funciona",[B.como]]]});
  const ov=[...document.querySelectorAll(".op-ov")].pop();if(ov)ov._repinta=pinta;}
/* Consultas: cada tramo es un consumo de agua en m³ */
const evAgua=()=>tramosAgua().filter(t=>t.dif>=0).map(t=>({f:t.f,ts:t.r.ts||0,maq:null,nave:null,ref:"Agua",cant:t.dif,ud:"m³",eur:0,quien:t.por,txt:t.raro?"Consumo raro":"",det:t.d>1?"en "+t.d+" días":"",fam:"Contadores"}));

/* ===== LEER UN CONTADOR CON UNA FOTO (función leer-contador: IA gratuita de Cloudflare) =====
   Se hace la foto, la IA devuelve el número y se pone en la casilla para que la persona lo compruebe antes de guardar. */
function jpegContador(file){return new Promise((ok,ko)=>{const u=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{const k=Math.min(1,1280/Math.max(im.width,im.height)),cv=document.createElement("canvas");cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);
    cv.getContext("2d").drawImage(im,0,0,cv.width,cv.height);URL.revokeObjectURL(u);ok(cv.toDataURL("image/jpeg",0.8));};im.onerror=()=>{URL.revokeObjectURL(u);ko(new Error("No se pudo abrir la foto"));};im.src=u;});}
/* lo que lee la IA, ajustado con la lectura anterior: al glicol a veces se le escapa la coma (sale 10 veces más) */
window.ajustaLectura=ajustaLectura;
function ajustaLectura(txt,tipo,prev){let v=parseFloat(String(txt).replace(",","."));if(!isFinite(v))return null;
  if(tipo==="glicol"&&prev!=null&&!/[.,]/.test(String(txt))&&v>prev*5&&v/10>=prev*0.95&&v/10<=prev*1.5+500)v=Math.round(v)/10;
  return v;}
/* foto pequeña para el registro de lecturas (para revisar fallos; se borra sola a los 15 días) */
function miniContador(dataUrl){return new Promise(ok=>{const im=new Image();im.onload=()=>{const k=Math.min(1,480/Math.max(im.width,im.height)),cv=document.createElement("canvas");cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);
  cv.getContext("2d").drawImage(im,0,0,cv.width,cv.height);ok(cv.toDataURL("image/jpeg",0.6));};im.onerror=()=>ok(null);im.src=dataUrl;});}
function botonFotoCont(tipo,prev,ponValor,info){if(window.SOLO_CONSULTA)return null;
  const fi=el("input",{type:"file",accept:"image/*",capture:"environment",style:"display:none"});
  fi.addEventListener("change",async()=>{const f=fi.files[0];fi.value="";if(!f)return;b.disabled=true;b.textContent="Leyendo…";
    try{const img=await jpegContador(f);const ex=(typeof info==="function"?info():info)||{};const mini=await miniContador(img);
      const r=window.__CONT_MOCK?window.__CONT_MOCK(tipo,{prev,mini:!!mini,...ex}):await llamarFn("leer-contador",{image:img,tipo,prev:prev!=null&&isFinite(+prev)?+prev:null,cont:ex.cont||"",nave:ex.nave||"",mini});
      if(r&&r.error)throw new Error(r.error);
      const v=r&&r.lectura!=null?ajustaLectura(r.lectura,tipo,prev):null;
      if(v==null){toast("No se ha podido leer el número: haz otra foto más cerca o escríbelo a mano");return;}
      /* lo leído no cuadra con la última lectura (ni con el segundo modelo): no se pone, se avisa */
      if(r.fuera||(prev!=null&&(v<prev-1||v>prev+Math.max(prev*0.05,3000)))){toast("La foto se lee como "+fmtN(v)+", que no cuadra con la última lectura ("+fmtN(prev)+"). Haz otra foto más de frente o escríbelo a mano.",true);return;}
      ponValor(v,r);toast("Leído "+fmtN(v)+(r.seguro===false||r.dudosas?" · alguna cifra no estaba clara":"")+": compruébalo antes de guardar");}
    catch(e){toast("No se pudo leer la foto: "+(e.message||e));}
    finally{b.disabled=false;b.textContent="📷";}});
  const b=el("button",{type:"button",class:"btn sec foto-cont","aria-label":"Leer el contador con una foto",title:"Leer el contador con una foto",text:"📷",onclick:()=>fi.click()});
  return el("span",{style:"display:contents"},[b,fi]);}

/* ===== PISTONES SALVADOS DE EJES AGARROTADOS Y VALOR DE LA CHATARRA (24/11/2026) =====
   Un pistón que se va al taller agarrotado dentro del eje se pierde entero: no vuelve ni como pistón ni como chatarra.
   Si se consigue sacar aquí, se queda en la fábrica: va a la zona de pistones usados de su nave (evento «saca» en
   cat.pusados.ev) y, como mínimo, vale lo que pagan por él en la chatarrería. Si luego se recupera, suma además el ahorro
   de recuperado, como cualquier otro.
   · Peso medio de un pistón = kilos ÷ pistones de los últimos viajes a la chatarrería que se pesaron (se pesan todos juntos).
   · Precio del kg = importe ÷ kilos de los viajes en que se apuntó lo que pagaron; si no hay ninguno, el de referencia
     (cat.chatEurKg; si no se ha puesto, CHAT_EUR_KG: cobre de 2.ª en chatarrería, unos 7,84 €/kg el 23/11/2026).
   · Valor de un pistón salvado = peso medio × precio del kg. Se calcula con los últimos datos: se va afinando solo. */
const CHAT_EUR_KG=7.84;
const CHAT_N=5;/* viajes pesados que se usan para la media */
const chatEurRef=()=>+cat.chatEurKg>0?+cat.chatEurKg:CHAT_EUR_KG;
function chatViajes(){return puEv().filter(e=>e.t==="chat").map(e=>({f:e.f,n:Object.values(e.c||{}).reduce((s,x)=>s+(+x||0),0),kg:+e.kg||0,eur:+e.eur||0}));}
function chatValor(){const rec=L=>L.slice().sort((a,b)=>b.f.localeCompare(a.f)).slice(0,CHAT_N);
  const V=rec(chatViajes().filter(v=>v.kg>0&&v.n>0)),kg=V.reduce((s,v)=>s+v.kg,0),n=V.reduce((s,v)=>s+v.n,0);
  const VE=rec(chatViajes().filter(v=>v.kg>0&&v.eur>0)),eK=VE.reduce((s,v)=>s+v.kg,0),eE=VE.reduce((s,v)=>s+v.eur,0);
  const peso=n?kg/n:null,eurKg=eK?eE/eK:chatEurRef();
  return{peso,eurKg,real:!!eK,viajes:V.length,pieza:peso!=null?peso*eurKg:null};}
/* los pistones sacados de ejes agarrotados entre dos fechas, con lo que vale cada uno */
function pistSalvados(d,h){const V=chatValor();return puEv().filter(e=>e.t==="saca"&&(!d||e.f>=d)&&(!h||e.f<=h)).sort((a,b)=>a.f.localeCompare(b.f))
  .map(e=>({f:e.f,maq:e.maq||"",d:e.d,n:+e.n||1,nv:e.nv,eur:V.pieza!=null?V.pieza*(+e.n||1):0}));}
/* lo que ha dado la chatarra de pistones entre dos fechas */
function chatDinero(d,h){const L=chatViajes().filter(v=>v.f>=d&&v.f<=h);
  return{L,n:L.reduce((s,v)=>s+v.n,0),kg:L.reduce((s,v)=>s+v.kg,0),eur:L.reduce((s,v)=>s+v.eur,0),sinKg:L.filter(v=>!v.kg).length,sinEur:L.filter(v=>!v.eur).length};}
function txtValorPist(){const V=chatValor();
  if(V.peso==null)return"Todavía no se ha pesado ningún viaje a la chatarrería: los pistones salvados se cuentan, pero sin euros. Apunta los kilos al llevarlos a la chatarrería.";
  return"Un pistón pesa unos "+fmtN(Math.round(V.peso*100)/100)+" kg (de "+V.viajes+(V.viajes===1?" viaje pesado":" viajes pesados")+") × "+fmtN(Math.round(V.eurKg*100)/100)+" €/kg "+(V.real?"(lo que han pagado)":"(precio de referencia)")+" = "+eur(V.pieza)+" cada uno.";}
/* «Recuperado en planta» / «No hay que repararlo» de un eje con pistón agarrotado: pregunta si se ha sacado el pistón.
   o = {maq, diam, pend}. fn(sacado) hace lo de siempre y guarda; después, si se sacó, se apunta el evento «saca» y se guarda. */
function confirmarSaca(t,msg,btn,o,fn){const m=cat.maquinas.find(x=>x.cod===o.maq||x.id===o.maq);
  const s={si:null,d:o.diam||(m&&typeof diamDe==="function"?diamDe(m):"")||""};
  const dBox=el("div",{style:"display:none"},[fld("Ø del pistón",sel("sacaD",[["","Elige"]].concat(DIAM.map(d=>[d,d])),s.d,v=>s.d=v)),
    el("p",{class:"hint",style:"margin:0",text:"Va a la zona de pistones usados de la "+puNavN(puNave({maq:o.maq}))+" y cuenta como pistón salvado. "+txtValorPist()})]);
  const seg=el("div",{class:"seg",role:"group","aria-label":"¿Se ha sacado el pistón?"},[[true,"Sí, lo hemos sacado"],[false,"No, sigue puesto"]].map(([k,tx])=>el("button",{type:"button","aria-pressed":"false",text:tx,onclick:ev=>{s.si=k;
    seg.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b===ev.currentTarget)));dBox.style.display=k?"grid":"none";dBox.style.gap="8px";}})));
  dlg(t,[el("p",{text:msg}),el("div",{class:"sub",style:"font-weight:600",text:"¿Habéis podido sacar el pistón agarrotado?"}),seg,dBox],
    [{t:"Cancelar",cls:"sec"},{t:btn,cls:"peligro",fn:async()=>{if(s.si===null){toast("Di si habéis sacado el pistón");return false;}if(s.si&&!s.d){toast("Elige el Ø del pistón");return false;}
      const r=await fn(!!s.si);if(r===false)return false;if(!s.si)return;
      /* se guarda después de lo de siempre (que puede volver a leer el catálogo) */
      cat.pusados={ev:puEv().concat([{id:uid(),ts:Date.now(),por:(window.yoNombre&&window.yoNombre())||"",t:"saca",f:hoy(),nv:puNave({maq:o.maq}),d:s.d,n:1,maq:o.maq||null,pend:o.pend||null}])};
      try{await saveCat();toast("Pistón "+s.d+" a la zona de usados de la "+puNavN(puNave({maq:o.maq})));}catch(e){}render(true);}}]);}
/* precio de referencia del kg de chatarra de pistones */
function formChatEur(){const x={v:String(chatEurRef()).replace(".",",")};
  dlg("Precio del kg de chatarra",[el("p",{class:"hint",text:"Se usa mientras no apuntes lo que pagan al llevar los pistones a la chatarrería. Cobre de 2.ª en chatarrería: unos 7,84 €/kg (23/11/2026)."}),
    fld("€ por kg",inp("chEur",x.v,v=>x.v=v,{inputmode:"decimal",class:"num"}))],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const n=parseN(x.v);if(!(isFinite(n)&&n>0)){toast("Pon un precio");return false;}const prev=cat.chatEurKg;cat.chatEurKg=n;
      try{await saveCat();toast("Precio guardado");}catch(e){cat.chatEurKg=prev;return false;}render(true);}}]);}
/* bloque para la tarjeta de pistones usados: valor de la chatarra y pistones salvados */
function bloqueChatarra(){const h=hoy(),y=h.slice(0,4)+"-01-01",V=chatValor(),D=chatDinero(y,h),S=pistSalvados(y,h);const nS=S.reduce((s,x)=>s+x.n,0);
  return el("div",{class:"bd",style:"border-top:1px solid var(--line2);display:grid;gap:6px"},[el("div",{class:"sub",style:"font-size:12px;font-weight:600",text:"Chatarra y pistones salvados (este año)"}),
    el("div",{style:"font-size:14px"},"Chatarrería: "+(D.L.length?D.n+" pistones · "+fmtN(Math.round(D.kg*10)/10)+" kg"+(D.eur?" · "+eur(D.eur)+" cobrados":"")+(D.sinKg?" ("+D.sinKg+" sin pesar)":""):"ningún viaje todavía")+"."),
    el("div",{style:"font-size:14px"},"Sacados de ejes agarrotados: "+(nS?nS+(nS===1?" pistón":" pistones")+(V.pieza!=null?" · "+eur(S.reduce((s,x)=>s+x.eur,0))+" que no se han perdido":""):"ninguno todavía")+"."),
    el("p",{class:"hint",style:"margin:0",text:txtValorPist()}),
    el("div",{},el("button",{type:"button",class:"btn txt peq",text:"Precio de referencia del kg: "+fmtN(chatEurRef())+" €",onclick:formChatEur}))]);}

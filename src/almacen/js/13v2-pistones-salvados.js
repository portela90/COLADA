/* ===== PISTONES SALVADOS DE EJES AGARROTADOS Y VALOR DE LA CHATARRA (24/11/2026) =====
   Un pistón que se va al taller agarrotado dentro del eje se pierde entero: no vuelve ni como pistón ni como chatarra.
   Si se consigue sacar aquí, se queda en la fábrica: va a la zona de pistones usados de su nave (evento «saca» en
   cat.pusados.ev) y, como mínimo, vale lo que pagan por él en la chatarrería. Si luego se recupera, suma además el ahorro
   de recuperado, como cualquier otro.
   · Peso medio de un pistón = kilos ÷ pistones de los últimos viajes a la chatarrería que se pesaron (se pesan todos juntos).
   · Precio del kg = importe ÷ kilos de los viajes en que se apuntó lo que pagaron; si no hay ninguno, el de referencia
     (cat.chatEurKg; si no se ha puesto, CHAT_EUR_KG: cobre de 2.ª en chatarrería, unos 7,84 €/kg el 23/11/2026).
   · Peso de cada Ø: si lo has puesto a mano (ficha del pistón, «Peso de un pistón (kg)», o «Peso de cada Ø»), manda ese;
     si no, el peso medio de los viajes pesados (24/11/2026).
   · Valor de un pistón salvado = peso (el de su Ø o el medio) × precio del kg. Se calcula con los últimos datos: se va afinando solo. */
const CHAT_EUR_KG=7.84;
const CHAT_N=5;/* viajes pesados que se usan para la media */
const chatEurRef=()=>+cat.chatEurKg>0?+cat.chatEurKg:CHAT_EUR_KG;
function chatViajes(){return puEv().filter(e=>e.t==="chat").map(e=>({f:e.f,n:Object.values(e.c||{}).reduce((s,x)=>s+(+x||0),0),kg:+e.kg||0,eur:+e.eur||0}));}
function chatValor(){const rec=L=>L.slice().sort((a,b)=>b.f.localeCompare(a.f)).slice(0,CHAT_N);
  const V=rec(chatViajes().filter(v=>v.kg>0&&v.n>0)),kg=V.reduce((s,v)=>s+v.kg,0),n=V.reduce((s,v)=>s+v.n,0);
  const VE=rec(chatViajes().filter(v=>v.kg>0&&v.eur>0)),eK=VE.reduce((s,v)=>s+v.kg,0),eE=VE.reduce((s,v)=>s+v.eur,0);
  const peso=n?kg/n:null,eurKg=eK?eE/eK:chatEurRef();
  return{peso,eurKg,real:!!eK,viajes:V.length,pieza:peso!=null?peso*eurKg:null};}
/* peso de un pistón de un Ø puesto a mano (null si no) */
const kgDiam=d=>{const a=d&&pistArt(d);const k=parseN(a&&a.kgPieza);return isFinite(k)&&k>0?k:null;};
/* lo que vale un pistón de ese Ø en la chatarrería: {kg, de:"diam"|"media", eur} o null si no hay peso */
function valorPist(d,V){V=V||chatValor();const k=kgDiam(d);if(k!=null)return{kg:k,de:"diam",eur:k*V.eurKg};return V.peso!=null?{kg:V.peso,de:"media",eur:V.pieza}:null;}
/* los pistones sacados de ejes agarrotados entre dos fechas, con lo que vale cada uno */
function pistSalvados(d,h){const V=chatValor();return puEv().filter(e=>e.t==="saca"&&(!d||e.f>=d)&&(!h||e.f<=h)).sort((a,b)=>a.f.localeCompare(b.f))
  .map(e=>{const p=valorPist(e.d,V);return{f:e.f,maq:e.maq||"",d:e.d,n:+e.n||1,nv:e.nv,eur:p?p.eur*(+e.n||1):0};});}
/* lo que ha dado la chatarra de pistones entre dos fechas */
function chatDinero(d,h){const L=chatViajes().filter(v=>v.f>=d&&v.f<=h);
  return{L,n:L.reduce((s,v)=>s+v.n,0),kg:L.reduce((s,v)=>s+v.kg,0),eur:L.reduce((s,v)=>s+v.eur,0),sinKg:L.filter(v=>!v.kg).length,sinEur:L.filter(v=>!v.eur).length};}
function txtValorPist(d){const V=chatValor(),p=valorPist(d,V);
  const kd=DIAM.filter(x=>kgDiam(x)!=null),pr=fmtN(Math.round(V.eurKg*100)/100)+" €/kg "+(V.real?"(lo que han pagado)":"(precio de referencia)");
  if(!d&&kd.length)return"Peso puesto a mano: "+kd.map(x=>x+" "+fmtN(kgDiam(x))+" kg").join(", ")+"."+(V.peso!=null?" Los demás Ø, "+fmtN(Math.round(V.peso*100)/100)+" kg (media de los viajes pesados).":" Los demás Ø no tienen peso todavía.")+" Precio: "+pr+".";
  if(!p)return"Todavía no hay peso"+(d?" del "+d:"")+": los pistones salvados se cuentan, pero sin euros. Pon el peso de cada Ø o apunta los kilos al llevarlos a la chatarrería.";
  return(p.de==="diam"?"Un pistón de "+d+" pesa "+fmtN(Math.round(p.kg*100)/100)+" kg":"Un pistón pesa unos "+fmtN(Math.round(p.kg*100)/100)+" kg (media de "+V.viajes+(V.viajes===1?" viaje pesado":" viajes pesados")+")")+
    " × "+fmtN(Math.round(V.eurKg*100)/100)+" €/kg "+(V.real?"(lo que han pagado)":"(precio de referencia)")+" = "+eur(p.eur)+" cada uno.";}
/* «Recuperado en planta» / «No hay que repararlo» de un eje con pistón agarrotado: pregunta si se ha sacado el pistón.
   o = {maq, diam, pend}. fn(sacado) hace lo de siempre y guarda; después, si se sacó, se apunta el evento «saca» y se guarda. */
function confirmarSaca(t,msg,btn,o,fn){const m=cat.maquinas.find(x=>x.cod===o.maq||x.id===o.maq);
  const s={si:null,d:o.diam||(m&&typeof diamDe==="function"?diamDe(m):"")||""};
  const hint=el("p",{class:"hint",style:"margin:0"});const pon=()=>{hint.textContent="Va a la zona de pistones usados de la "+puNavN(puNave({maq:o.maq}))+" y cuenta como pistón salvado. "+txtValorPist(s.d);};pon();
  const dBox=el("div",{style:"display:none"},[fld("Ø del pistón",sel("sacaD",[["","Elige"]].concat(DIAM.map(d=>[d,d])),s.d,v=>{s.d=v;pon();})),hint]);
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
/* peso de un pistón de cada Ø, todos a la vez (se guarda en la ficha de cada pistón: kgPieza) */
function formPesosDiam(){const ds=DIAM.filter(d=>pistArt(d));const x={};ds.forEach(d=>{const k=kgDiam(d);x[d]=k!=null?String(k).replace(".",","):"";});const V=chatValor();
  dlg("Peso de un pistón de cada Ø",[el("p",{class:"hint",text:"Pésalos una vez y apúntalo aquí. El Ø que dejes vacío usa el peso medio de los viajes pesados a la chatarrería"+(V.peso!=null?" (ahora "+fmtN(Math.round(V.peso*100)/100)+" kg)":"")+"."}),
    el("div",{class:"tw"},el("table",{},el("tbody",{},ds.map(d=>el("tr",{},[el("td",{},el("b",{text:d})),el("td",{},inp("kgD"+d.replace(/\W/g,""),x[d],v=>x[d]=v,{inputmode:"decimal",class:"num",placeholder:"kg",style:"width:90px;padding:7px 6px;font-size:16px"}))])))))],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{for(const d of ds){const v=String(x[d]||"").trim();if(v&&!(parseN(v)>0)){toast("Revisa el peso de "+d);return false;}}
      const prev=JSON.parse(JSON.stringify(cat.articulos));ds.forEach(d=>{const a=cat.articulos.find(z=>z.id===pistArt(d).id);if(!a)return;const n=parseN(x[d]);if(isFinite(n)&&n>0)a.kgPieza=n;else delete a.kgPieza;});
      try{await saveCat();toast("Pesos guardados");}catch(e){cat.articulos=prev;return false;}render(true);}}]);}
/* pesar las cajas de chatarra sin llevarlas (se llevan una vez al año, cuando están llenas): solo los kilos netos,
   sin contar pistones. Evento «pesa» en cat.pusados.ev {f,kg,nota}: no cambia lo que hay en el cajón (25/11/2026) */
const ultPesa=()=>puEv().filter(e=>e.t==="pesa").sort((a,b)=>a.f.localeCompare(b.f)||(a.ts||0)-(b.ts||0)).pop()||null;
function formPesaCajon(){const x={f:hoy(),c:[{b:"",t:""},{b:"",t:""}],nota:""};const tot=el("div",{class:"sub",style:"font-weight:600"});const box=el("div",{style:"display:grid;gap:10px"});
  /* cada cajón: peso total (con el cajón) y tara (el cajón vacío) → kilos de pistones */
  const neto=c=>{const b=parseN(c.b),t=parseN(String(c.t).trim()===""?"0":c.t);return isFinite(b)&&b>0&&isFinite(t)&&t>=0?Math.round((b-t)*100)/100:null;};
  const suma=()=>x.c.map(neto).filter(v=>v!=null&&v>0).reduce((a,b)=>a+b,0);
  const pinta=()=>{box.textContent="";x.c.forEach((c,i)=>{const n=el("div",{class:"sub"});const pn=()=>{const v=neto(c);n.textContent=v==null?"":v>0?"= "+fmtN(v)+" kg de pistones":"La tara es más que el total";tot.textContent="Total: "+fmtN(suma())+" kg de pistones";};
      box.appendChild(el("div",{style:"display:grid;gap:4px"},[el("div",{class:"sub",style:"font-weight:600",text:"Cajón "+(i+1)}),
        el("div",{class:"row"},[fld("Peso total (kg)",inp("pcB"+(i+1),c.b,w=>{c.b=w;pn();},{inputmode:"decimal",class:"num",placeholder:"con el cajón"})),fld("Tara (kg)",inp("pcT"+(i+1),c.t,w=>{c.t=w;pn();},{inputmode:"decimal",class:"num",placeholder:"cajón vacío"}))]),n]));pn();});
    box.appendChild(el("button",{type:"button",class:"btn txt peq",text:"＋ Otro cajón",onclick:()=>{x.c.push({b:"",t:""});pinta();}}));tot.textContent="Total: "+fmtN(suma())+" kg de pistones";};pinta();
  dlg("Pesar los cajones de chatarra",[el("p",{class:"hint",text:"Pon lo que pesa cada cajón lleno y su tara (el cajón vacío): la app resta y apunta los kilos de pistones. No hace falta contar nada ni se saca nada del cajón."}),
    fld("Fecha",inp("pcF",x.f,v=>x.f=v,{type:"date",max:hoy()})),box,tot,fld("Nota (opcional)",inp("pcN","",v=>x.nota=v,{autocomplete:"off"}))],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const C=x.c.filter(c=>String(c.b).trim()||String(c.t).trim());
      if(!C.length){toast("Pon el peso de los cajones");return false;}const N=C.map(neto);if(N.some(v=>v==null||!(v>0))){toast("Revisa el peso total y la tara de cada cajón");return false;}
      const kg=Math.round(N.reduce((a,b)=>a+b,0)*100)/100;
      try{await puGuarda({t:"pesa",f:x.f||hoy(),kg,cajones:N,bruto:C.map(c=>parseN(c.b)),tara:C.map(c=>parseN(String(c.t).trim()===""?"0":c.t)),nota:String(x.nota||"").trim()||null});toast("Peso de los cajones guardado");}catch(e){return false;}}}]);}
/* mandar a quien sea lo que ha pesado cada cajón y su tara (WhatsApp, correo… o copiar) */
function textoPesa(P){const V=chatValor(),L=["Pesada de los cajones de chatarra de pistones · "+fmtF(P.f)];
  (P.cajones||[P.kg]).forEach((n,i)=>{const b=(P.bruto||[])[i],t=(P.tara||[])[i];L.push("Cajón "+(i+1)+": "+(b!=null?"peso total "+fmtN(b)+" kg − tara "+fmtN(t||0)+" kg = ":"")+fmtN(n)+" kg de pistones");});
  L.push("Total: "+fmtN(P.kg)+" kg de pistones");L.push("Valor aproximado: "+eur(P.kg*V.eurKg)+" (a "+fmtN(Math.round(V.eurKg*100)/100)+" €/kg"+(V.real?", lo que pagaron la última vez":", precio de referencia del cobre de 2.ª")+")");
  if(P.nota)L.push("Nota: "+P.nota);return L.join("\n");}
function enviarPesa(P){const tx=textoPesa(P);const ta=el("textarea",{readonly:true,style:"min-height:170px;font-size:14px",value:tx});
  const acts=[{t:"Cerrar",cls:"sec"},{t:"Copiar",cls:"sec",fn:async()=>{try{await navigator.clipboard.writeText(tx);toast("Copiado: pégalo en WhatsApp o en el correo");}catch(e){ta.select();toast("Selecciona el texto y cópialo");return false;}}},
    {t:"Correo",cls:"sec",fn:()=>{location.href="mailto:?subject="+encodeURIComponent("Pesada de los cajones de chatarra · "+fmtF(P.f))+"&body="+encodeURIComponent(tx);}}];
  if(navigator.share)acts.push({t:"Enviar",fn:async()=>{try{await navigator.share({title:"Pesada de los cajones de chatarra",text:tx});}catch(e){return false;}}});
  dlg("Enviar la pesada",[el("p",{class:"hint",text:"«Enviar» abre WhatsApp, el correo y las demás apps del móvil. También puedes copiarlo y pegarlo donde quieras."}),ta],acts);}
/* bloque para la tarjeta de pistones usados: valor de la chatarra y pistones salvados */
function bloqueChatarra(){const h=hoy(),y=h.slice(0,4)+"-01-01",V=chatValor(),D=chatDinero(y,h),S=pistSalvados(y,h);const nS=S.reduce((s,x)=>s+x.n,0);
  return el("div",{class:"bd",style:"border-top:1px solid var(--line2);display:grid;gap:6px"},[el("div",{class:"sub",style:"font-size:12px;font-weight:600",text:"Chatarra y pistones salvados (este año)"}),
    el("div",{style:"font-size:14px"},"Chatarrería: "+(D.L.length?D.n+" pistones · "+fmtN(Math.round(D.kg*10)/10)+" kg"+(D.eur?" · "+eur(D.eur)+" cobrados":"")+(D.sinKg?" ("+D.sinKg+" sin pesar)":""):"ningún viaje todavía")+"."),
    (()=>{const P=ultPesa();if(!P)return null;const V=chatValor();return el("div",{style:"font-size:14px;display:flex;flex-wrap:wrap;align-items:center;gap:6px"},[el("span",{text:"Chatarra pesada el "+fmtF(P.f)+": "+fmtN(P.kg)+" kg"+(P.cajones&&P.cajones.length>1?" ("+P.cajones.length+" cajones)":"")+" ≈ "+eur(P.kg*V.eurKg)+" (a "+fmtN(Math.round(V.eurKg*100)/100)+" €/kg)."}),el("button",{type:"button",class:"btn sec peq",text:"Enviar",onclick:()=>enviarPesa(P)})]);})(),
    el("div",{style:"font-size:14px"},"Sacados de ejes agarrotados: "+(nS?nS+(nS===1?" pistón":" pistones")+(S.some(x=>x.eur)?" · "+eur(S.reduce((s,x)=>s+x.eur,0))+" que no se han perdido":""):"ninguno todavía")+"."),
    el("p",{class:"hint",style:"margin:0",text:txtValorPist()}),
    el("div",{style:"display:flex;flex-wrap:wrap;gap:4px"},[el("button",{type:"button",class:"btn txt peq",text:"Precio de referencia del kg: "+fmtN(chatEurRef())+" €",onclick:formChatEur}),
      window.SOLO_CONSULTA?null:el("button",{type:"button",class:"btn txt peq",text:"Pesar los cajones",onclick:formPesaCajon}),
      el("button",{type:"button",class:"btn txt peq",text:"Peso de cada Ø"+(DIAM.some(d=>kgDiam(d)!=null)?" ("+DIAM.filter(d=>kgDiam(d)!=null).length+" puestos)":""),onclick:formPesosDiam})])]);}

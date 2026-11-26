/* ===== PREGUNTAS DE AHORRO =====
   «¿Cuánto hemos ahorrado este mes en ejes?», «ahorro en pistones este año», «cuánto hemos ahorrado recuperando», «ahorro total».
   Junta todo lo que se ahorra en el Almacén:
   · Ejes recuperados en planta: no se mandan al taller → se ahorra su precio de reparación (el del modelo).
   · Pistones recuperados (rebajados de Ø) en vez de comprarlos nuevos → precio nuevo − precio recuperado.
   · Barras recuperadas en vez de comprarlas nuevas → precio nueva × cantidad − lo que costó recuperarlas.
   · Pistones sacados de ejes agarrotados (24/11/2026): no se pierden → lo que valen en la chatarrería (13v2).
   «¿Cuánto nos ha dado la chatarra?» → lo cobrado en la chatarrería por los pistones (no es ahorro: va aparte).
   Si no se dice el periodo, este mes. */
function intencionAhorro(q){
  if(/\bchatarr\w*\b/.test(q)&&/\b(dinero|euros?|pagad\w*|pagan|pagaron|cobrad\w*|cobramos|ingres\w*|dado|dio|da|dan|sacado|sacamos)\b/.test(q))return{cat:"chat"};
  if(/\bpiston\w*\b/.test(q)&&(/\bperd\w*\b/.test(q)||/\b(ido|van|mandado|mandamos|enviado|enviados)\b.*\btaller\b/.test(q))&&!/\bahorr\w*\b/.test(q))return{cat:"perd"};
  if(/\bahorr\w*\b/.test(q)&&/\b(sacad\w*|sacando|sacar|salvad\w*)\b/.test(q)&&/\b(piston\w*|ejes?|agarrotad\w*)\b/.test(q))return{cat:"salv"};
  if(!/\bahorr\w*\b/.test(q)||/\bagarrotad\w*\b/.test(q))return null;
  const cat=/\bejes?\b|\btaller\b|\breparac\w*\b/.test(q)?"ejes":/\bpiston\w*\b/.test(q)?"pist":/\bbarras?\b/.test(q)?"barras":"todo";
  return{cat};}
function datosAhorro(d,h){
  const ejes=ejeRecup().filter(x=>x.f>=d&&x.f<=h).map(x=>{const mod=(x.mods||[]).find(c=>precioMod(c)>0)||(x.mods||[])[0]||"";return{f:x.f,maq:x.maq,mod,eur:precioMod(mod),mot:x.motivo||""};});
  const P=datosComprasPist(d,h);
  const barras=[];(BREC||[]).forEach(b=>(b.vuelta||[]).forEach(v=>{if(!v.f||v.f<d||v.f>h)return;const a=art(v.art),pn=a?precioDe(a):0,c=+v.cant||0,coste=+v.eur||0;
    barras.push({f:v.f,a,c,coste,eur:pn?c*pn-coste:0,sinP:!pn});}));
  const sal=typeof pistSalvados==="function"?pistSalvados(d,h):[];
  const tE=ejes.reduce((s,x)=>s+x.eur,0),tP=P.ahorro,tB=barras.reduce((s,x)=>s+x.eur,0),tS=sal.reduce((s,x)=>s+x.eur,0);
  return{ejes,P,barras,sal,tE,tP,tB,tS,tot:tE+tP+tB+tS};}
function pintaAhorro(I,P0,H){const {frase,nota,ent,lista,it}=H;const per=P0.def?{d:hoy().slice(0,7)+"-01",h:hoy(),t:"este mes"}:P0;
  const D=datosAhorro(per.d,per.h),cat=I.ah.cat;
  const nE=D.ejes.length,sinE=D.ejes.filter(x=>!x.eur).length;
  const fE=()=>{if(!nE){frase(cap(per.t)+" no se ha recuperado ningún eje en planta, así que en ejes no hay ahorro.");return;}
    frase(cap(per.t)+" habéis ahorrado "+eur(D.tE)+" en ejes: "+nE+(nE===1?" eje recuperado":" ejes recuperados")+" en planta en vez de mandarlos al taller"+(sinE?" ("+sinE+" sin precio de reparación, que no suman)":"")+".");
    const porMod={};D.ejes.forEach(x=>{const k=x.mod||"sin modelo";porMod[k]=porMod[k]||{n:0,e:0};porMod[k].n++;porMod[k].e+=x.eur;});
    lista("Ejes recuperados en planta",D.ejes.slice().sort((a,b)=>b.f.localeCompare(a.f)).map(x=>{const m=modelo(x.mod);return it(x.maq+" · "+(m?m.ref+" ("+x.mod+")":x.mod||"modelo sin saber"),[fmtF(x.f)+(x.mot?" · "+String(x.mot).toLowerCase():"")],x.eur?eur(x.eur):"—",x.eur?"ahorro":"sin precio");}),eur(D.tE));
    if(Object.keys(porMod).length>1)lista("Por modelo",Object.entries(porMod).sort((a,b)=>b[1].e-a[1].e).map(([k,v])=>{const m=modelo(k);return it(m?m.ref+" ("+k+")":k,[v.n+(v.n===1?" eje":" ejes")],eur(v.e));}));};
  const fP=()=>{const P=D.P;if(!P.tR){frase(cap(per.t)+" no han entrado pistones recuperados, así que en pistones no hay ahorro.");return;}
    frase(cap(per.t)+" habéis ahorrado "+eur(D.tP)+" en pistones: "+fmtN(P.tR)+(P.tR===1?" pistón recuperado":" pistones recuperados")+" en vez de comprarlos nuevos (costaron "+eur(P.eR)+")."+(P.sinP.length?" Sin precio: "+P.sinP.join(", ")+".":""));
    lista("Pistones recuperados",Object.entries(P.G).filter(([,g])=>g.r>0).map(([d,g])=>{const a=pistArt(d),pn=a?precioDe(a):0,pr=a?precioRecDe(a):0;return it("Pistón "+d,[fmtN(g.r)+" recuperados · "+(pn?eur(pn)+" nuevo":"sin precio nuevo")+" · "+(pr?eur(pr)+" recuperado":"sin precio recuperado")],pn&&pr?eur(g.r*(pn-pr)):"—","ahorro");}));};
  const fB=()=>{if(!D.barras.length){frase(cap(per.t)+" no han vuelto barras recuperadas, así que en barras no hay ahorro.");return;}
    const n=D.barras.reduce((s,x)=>s+x.c,0);frase(cap(per.t)+" habéis ahorrado "+eur(D.tB)+" en barras: "+n+(n===1?" barra recuperada":" barras recuperadas")+" en vez de comprarlas nuevas.");
    lista("Barras recuperadas",D.barras.map(x=>it((x.a?nomBT(x.a):"Barra")+" × "+x.c,[fmtF(x.f)+(x.coste?" · recuperarlas costó "+eur(x.coste):"")],x.sinP?"—":eur(x.eur),x.sinP?"sin precio":"ahorro")));};
  const nS=D.sal.reduce((s,x)=>s+x.n,0);
  const fS=()=>{if(!nS){frase(cap(per.t)+" no se ha sacado ningún pistón de un eje agarrotado.");return;}
    frase(cap(per.t)+" habéis sacado "+nS+(nS===1?" pistón":" pistones")+" de ejes agarrotados"+(D.tS?": "+eur(D.tS)+" que no se han perdido.":". Todavía sin euros: falta el peso de su Ø o pesar algún viaje a la chatarrería."));
    lista("Pistones salvados",D.sal.slice().reverse().map(x=>it("Pistón "+x.d+(x.maq?" · "+x.maq:""),[fmtF(x.f)+" · a la zona de la "+puNavN(x.nv)],x.eur?eur(x.eur):"—",x.eur?"no perdido":"sin peso")),eur(D.tS));};
  if(cat==="salv"){ent("pistones sacados de ejes agarrotados",[per.t]);fS();nota("Un pistón que se va al taller dentro del eje se pierde entero. Si lo sacáis, se queda en la fábrica: como mínimo vale lo que pagan en la chatarrería. "+txtValorPist());return;}
  if(cat==="perd"){ent("pistones perdidos en el taller",[per.t]);const P=pistPerdidos(per.d,per.h);
    if(!P.length){frase(cap(per.t)+" no se ha mandado al taller ningún eje con el pistón agarrotado.");return;}
    const eu=P.reduce((s,x)=>s+x.eur,0),kg=P.reduce((s,x)=>s+x.kg,0),G={};P.forEach(x=>{const k=x.d||"Ø sin saber";G[k]=G[k]||{n:0,e:0};G[k].n++;G[k].e+=x.eur;});
    frase(cap(per.t)+" se han mandado al taller "+P.length+(P.length===1?" eje":" ejes")+" con el pistón agarrotado: "+fmtN(Math.round(kg*10)/10)+" kg de pistones"+(eu?" ≈ "+eur(eu)+" perdidos (lo que valían como chatarra)":"")+".");
    lista("Por Ø",Object.entries(G).sort((a,b)=>b[1].n-a[1].n).map(([d,g])=>it("Pistón "+d,[g.n+(g.n===1?" pistón":" pistones")],g.e?eur(g.e):"—")),eu?eur(eu):"");
    lista("Ejes enviados",P.slice().reverse().map(x=>it(x.eje+" · "+(x.d||"Ø sin saber"),[fmtF(x.f)+" · "+x.desp],x.eur?eur(x.eur):"—")));
    nota("Son los ejes mandados al taller cuyo desperfecto dice «agarrotado»: el pistón se queda allí. Es el mínimo perdido (su valor como chatarra); si se podía recuperar, se pierde más. "+txtValorPist());return;}
  if(cat==="chat"){ent("dinero de la chatarra de pistones",[per.t]);const C=chatDinero(per.d,per.h);
    if(!C.L.length){frase(cap(per.t)+" no se ha llevado ningún pistón a la chatarrería.");return;}
    frase(cap(per.t)+" se han llevado "+C.n+" pistones a la chatarrería ("+fmtN(Math.round(C.kg*10)/10)+" kg)"+(C.eur?" y han pagado "+eur(C.eur):"")+"."+(C.sinEur?" En "+C.sinEur+(C.sinEur===1?" viaje":" viajes")+" no se apuntó lo que pagaron.":""));
    lista("Viajes a la chatarrería",C.L.slice().reverse().map(v=>it(v.n+" pistones",[fmtF(v.f)+(v.kg?" · "+fmtN(v.kg)+" kg":" · sin pesar")],v.eur?eur(v.eur):"—")),C.eur?eur(C.eur):"");
    nota("Sale de Pistones › Pistones usados › «Llevar a chatarrería». Apunta siempre los kilos y, si lo sabes, lo que pagan.");return;}
  if(cat==="ejes"){ent("ahorro en ejes",[per.t]);fE();nota("El ahorro de un eje recuperado en planta es su precio de reparación (el del modelo, en Más › Ejes › Costes de reparación): es lo que no se ha pagado al taller.");return;}
  if(cat==="pist"){ent("ahorro en pistones",[per.t]);fP();nota("Ahorro = precio de un pistón nuevo − precio del recuperado, por cada recuperado que ha entrado.");return;}
  if(cat==="barras"){ent("ahorro en barras",[per.t]);fB();nota("Ahorro = precio de la barra nueva × las que han vuelto − lo que costó recuperarlas.");return;}
  ent("ahorro total",[per.t]);
  frase(cap(per.t)+" habéis ahorrado "+eur(D.tot)+" en total: "+eur(D.tE)+" en ejes recuperados en planta, "+eur(D.tP)+" en pistones recuperados, "+eur(D.tB)+" en barras recuperadas"+(nS?" y "+eur(D.tS)+" en pistones sacados de ejes agarrotados":"")+".");
  lista("De dónde sale",[it("Ejes recuperados en planta",[nE+(nE===1?" eje":" ejes")+" que no fueron al taller"],eur(D.tE)),it("Pistones recuperados",[fmtN(D.P.tR)+" en vez de nuevos"],eur(D.tP)),
    it("Barras recuperadas",[D.barras.reduce((s,x)=>s+x.c,0)+" en vez de nuevas"],eur(D.tB)),it("Pistones sacados de ejes agarrotados",[nS+" que no se han perdido"],eur(D.tS))],eur(D.tot));
  nota("Pregunta «ahorro en ejes», «ahorro en pistones» o «ahorro en barras» para ver el detalle. Cambia el periodo con «este año», «el mes pasado», «en octubre»…");}

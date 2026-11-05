/* ===== PREGUNTAS DE AHORRO =====
   «¿Cuánto hemos ahorrado este mes en ejes?», «ahorro en pistones este año», «cuánto hemos ahorrado recuperando», «ahorro total».
   Junta todo lo que se ahorra en el Almacén:
   · Ejes recuperados en planta: no se mandan al taller → se ahorra su precio de reparación (el del modelo).
   · Pistones recuperados (rebajados de Ø) en vez de comprarlos nuevos → precio nuevo − precio recuperado.
   · Barras recuperadas en vez de comprarlas nuevas → precio nueva × cantidad − lo que costó recuperarlas.
   Si no se dice el periodo, este mes. */
function intencionAhorro(q){if(!/\bahorr\w*\b/.test(q)||/\bagarrotad\w*\b/.test(q))return null;
  const cat=/\bejes?\b|\btaller\b|\breparac\w*\b/.test(q)?"ejes":/\bpiston\w*\b/.test(q)?"pist":/\bbarras?\b/.test(q)?"barras":"todo";
  return{cat};}
function datosAhorro(d,h){
  const ejes=ejeRecup().filter(x=>x.f>=d&&x.f<=h).map(x=>{const mod=(x.mods||[]).find(c=>precioMod(c)>0)||(x.mods||[])[0]||"";return{f:x.f,maq:x.maq,mod,eur:precioMod(mod),mot:x.motivo||""};});
  const P=datosComprasPist(d,h);
  const barras=[];(BREC||[]).forEach(b=>(b.vuelta||[]).forEach(v=>{if(!v.f||v.f<d||v.f>h)return;const a=art(v.art),pn=a?precioDe(a):0,c=+v.cant||0,coste=+v.eur||0;
    barras.push({f:v.f,a,c,coste,eur:pn?c*pn-coste:0,sinP:!pn});}));
  const tE=ejes.reduce((s,x)=>s+x.eur,0),tP=P.ahorro,tB=barras.reduce((s,x)=>s+x.eur,0);
  return{ejes,P,barras,tE,tP,tB,tot:tE+tP+tB};}
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
  if(cat==="ejes"){ent("ahorro en ejes",[per.t]);fE();nota("El ahorro de un eje recuperado en planta es su precio de reparación (el del modelo, en Más › Ejes › Costes de reparación): es lo que no se ha pagado al taller.");return;}
  if(cat==="pist"){ent("ahorro en pistones",[per.t]);fP();nota("Ahorro = precio de un pistón nuevo − precio del recuperado, por cada recuperado que ha entrado.");return;}
  if(cat==="barras"){ent("ahorro en barras",[per.t]);fB();nota("Ahorro = precio de la barra nueva × las que han vuelto − lo que costó recuperarlas.");return;}
  ent("ahorro total",[per.t]);
  frase(cap(per.t)+" habéis ahorrado "+eur(D.tot)+" en total: "+eur(D.tE)+" en ejes recuperados en planta, "+eur(D.tP)+" en pistones recuperados y "+eur(D.tB)+" en barras recuperadas.");
  lista("De dónde sale",[it("Ejes recuperados en planta",[nE+(nE===1?" eje":" ejes")+" que no fueron al taller"],eur(D.tE)),it("Pistones recuperados",[fmtN(D.P.tR)+" en vez de nuevos"],eur(D.tP)),
    it("Barras recuperadas",[D.barras.reduce((s,x)=>s+x.c,0)+" en vez de nuevas"],eur(D.tB))],eur(D.tot));
  nota("Pregunta «ahorro en ejes», «ahorro en pistones» o «ahorro en barras» para ver el detalle. Cambia el periodo con «este año», «el mes pasado», «en octubre»…");}

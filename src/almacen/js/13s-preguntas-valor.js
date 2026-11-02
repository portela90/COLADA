/* ===== PREGUNTAS DE VALOR Y PRECIO =====
   «valor de 2 tubos de westofen 21 y 3 krown 18», «cuánto sale un par de conos CCS-040 con IVA», «tubos westofen 21 x2»,
   «¿tengo para 2 tubos westofen 21 y 3 krown 18?», «cuántos tubos krown 21 puedo comprar con 2000 €», «qué entra en 1500 €»,
   «qué es más caro, el tubo krown 21 o el westofen 21», «valor de todo lo de westofen», «cuánto cuesta reponer los tubos dosificadores»,
   «valor de lo que se ha cambiado en la F21 este mes». También entiende las referencias del proveedor (refProv, p. ej. RTDM-021). */
const NUM_PAL={uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veinticinco:25,treinta:30,cuarenta:40,cincuenta:50,cien:100};
function normCant(q){let t=" "+q+" ";
  t=t.replace(/\bun par de\b/g,"2").replace(/\bmedia docena de\b/g,"6").replace(/\b(?:una |1 )?docena de\b/g,"12").replace(/\b(\d+) docenas? de\b/g,(m,n)=>String(+n*12));
  t=t.replace(/\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|veinte|veinticinco|treinta|cuarenta|cincuenta|cien)\b/g,w=>String(NUM_PAL[w]));
  return t.replace(/\s+/g," ").trim();}
/* «1.500» = 1500; «2,5» = 2,5 */
const numMiles=s=>{let t=String(s).trim();if(/^\d{1,3}(\.\d{3})+$/.test(t))t=t.replace(/\./g,"");return parseN(t);};
/* lista de «cantidad + artículo» separadas por «y», comas o «más» */
function parseCantQ(qn){const iva=/\bcon (el )?iva\b|\biva incluido\b|\bmas iva\b/.test(qn);
  const q2=qn.replace(/\bcon (el )?iva\b|\biva incluido\b|\bmas iva\b|\biva\b/g," ").replace(/\bespecial(es)?\b/g,"esp")
    .replace(/\b(presupuesto|valor|valores|precio|importe|suma|suman|son|es|el|los|las|dame|dime|hazme|haz|un|una|unos|unas|de|del|para|pedido|pedir|comprar|traer|cuanto|cuanta|cuantos|cuantas|cuesta|cuestan|costaria|costarian|vale|valen|valdria|valdrian|sale|salen|saldria|seria|serian|me|nos|que|a|aproximadamente|mas o menos|sobre|tengo|tenemos|hay|bastante|bastantes|suficiente|suficientes|stock|llega|alcanza|con)\b/g," ");
  const trozos=q2.split(/\s(?:y|mas)\s|,/).map(t=>t.trim()).filter(Boolean),L=[],mal=[];
  trozos.forEach(t=>{let n=null,rest=" "+t+" ";
    const mx=rest.match(/\sx\s*(\d+(?:[.,]\d+)?)(?=\s)/);
    if(mx){n=parseN(mx[1]);rest=rest.replace(mx[0]," ");}
    else{const cand=rest.match(/\s(\d+(?:[.,]\d+)?)\s*(pistones|piston|uds?|unidades|kg|kilos|litros|bidones|cajas|rollos|pares|metros|m)(?=\s)/),m=rest.match(/\s(\d+(?:[.,]\d+)?)(?=\s)/);
      const pick=cand||m;if(pick){n=parseN(pick[1]);rest=rest.replace(pick[0]," "+(pick[2]&&/piston/.test(pick[2])?"piston":"")+" ");}}
    const S=artsQ(rest.trim());if(n>0&&S.L.length===1)L.push({a:S.L[0],n});else mal.push({t,n,L:S.L});});
  return{L,mal,iva};}
const IVA=0.21;
function intencionValor(q,o){const qn=normCant(q),R=(x,e)=>Object.assign({vq:x,qn,maq:o.maq},e||{});
  const hayCant=/(^|\s)\d+(?:[.,]\d+)?(\s|$)|\sx\s*\d/.test(" "+qn+" ");
  /* 10 · valor de lo cambiado en una máquina */
  if(o.maq&&/\b(valor|cuanto|coste|importe|gasto|dinero)\b/.test(qn)&&/\b(cambiad\w*|cambiaron|gastad\w*|consumid\w*|puest\w*|sacad\w*|metid\w*)\b/.test(qn))return{mas:"mantener",maq:o.maq};
  /* 5 · ¿tengo para…? */
  if(/\b(tengo|tenemos|hay|queda|quedan) (?:stock )?(?:para|bastantes?|suficientes?)(?: stock)?(?: para| de)? \d|\b(llega|alcanza|da) (?:el stock )?para \d|\bhay stock (?:de|para) \d/.test(qn))return R("tengo");
  /* 6 · con un presupuesto */
  {const m=qn.match(/\bcuant[oa]s? (.+?) (?:puedo|podemos|se pueden|se puede|puedes|me da|da) (?:comprar|pedir|traer|para)? ?(?:con|por) (\d[\d.,]*)/);if(m)return R("concon",{txt:m[1],eur:numMiles(m[2])});}
  {const m=qn.match(/\bque (?:entra|puedo comprar|podemos comprar|me llega|nos llega|se puede comprar|pido|pedimos) (?:con|en|por) (\d[\d.,]*)(?: euros?)?(.*)$/);if(m)return R("entra",{eur:numMiles(m[1]),txt:m[2]||""});}
  /* 7 · comparar precios */
  if(/\b(?:que|cual) (?:es|sale|son) mas (?:car[oa]s?|barat[oa]s?)\b|\bdiferencia (?:de precio )?(?:entre|de)\b|\bcompara\w* (?:el |los )?precios?\b/.test(qn))return R("comp");
  /* 9 · reponer hasta el mínimo */
  if(/\breponer\b|\bllegar al minimo\b|\b(valor|coste|importe) de lo que (hay|tengo|tenemos) que pedir\b/.test(qn)&&/\b(cuanto|valor|coste|cuesta|costaria|importe|vale)\b/.test(qn))return R("reponer");
  /* 8 · valor de todo lo de una marca o grupo */
  if(!hayCant&&/\bvalor\b|\bcuanto vale\b/.test(qn)&&/\btodo (lo )?de\b/.test(qn))return R("grupo");
  /* 1-4 · valor de varias cosas */
  if(/\b(?:(?:el |los )?valor(?:es)? de|cuanto (?:valen|vale|cuestan|cuesta|suman?|es|son|sale|salen|seria|serian|me cuestan?|nos cuestan?|me sale|nos sale|costaria|costarian)|que valen|importe de|a cuanto sale\w*|precio de) (?:de )?\d/.test(qn))return{modo:"presupuesto",valor:!/\bpresupuesto\b/.test(qn),qn};
  if(/\sx\s*\d+(\s|$)/.test(" "+qn+" ")&&!/\b(dias?|semanas?|meses?)\b/.test(qn))return{modo:"presupuesto",valor:true,qn};
  return null;}

function pintaValor(I,P,H){const {add,frase,nota,ent,lista,it,pon,ign}=H,qn=I.qn;
  const filaA=(a,t2,b,small,stripe)=>it(nomArt(a),t2,b,small,()=>ficha(a),stripe);
  if(I.vq==="tengo"){const {L,mal}=parseCantQ(qn);ent("¿hay stock para…?");
    if(!L.length){frase("Dime qué y cuánto, por ejemplo «¿tengo para 2 tubos westofen 21 y 3 krown 18?».");return;}
    const R=L.map(x=>{const st=stockDe(x.a.id),f=Math.max(0,x.n-st),p=precioDe(x.a);return Object.assign({st,f,p},x);}),F=R.filter(x=>x.f>0),vf=F.reduce((s,x)=>s+x.f*x.p,0);
    frase((!F.length?"Sí, hay stock para todo.":F.length===R.length?"No hay bastante de nada.":"Hay de "+(R.length-F.length)+" y falta de "+F.length+".")
      +(F.length?" Lo que falta vale "+(vf?eur(vf):"sin valorar")+" sin IVA.":""));
    lista(null,R.map(x=>filaA(x.a,["Hacen falta "+fmtN(x.n)+" · hay "+fmtN(Math.round(x.st*10)/10)+" "+(x.a.ud||"ud"),x.f?"Faltan "+fmtN(x.f)+(x.p?" ("+eur(x.f*x.p)+")":""):"Hay bastante"],x.f?"−"+fmtN(x.f):"✓",x.f?(x.a.ud||"ud"):null,x.f?"bad":"ok")));
    if(mal.length)nota("No he sabido qué es «"+mal.map(x=>x.t).join("», «")+"».");return;}
  if(I.vq==="concon"){const S=artsQ(I.txt.replace(/\bespecial(es)?\b/g,"esp")),e=I.eur;ent("cuánto se puede comprar",[eur(e)]);
    if(!(e>0)){frase("Dime el dinero, por ejemplo «cuántos tubos krown 21 puedo comprar con 2000 €».");return;}
    const L=S.L.filter(a=>precioDe(a)>0);
    if(!L.length){frase(S.L.length?"No tiene precio: no se puede calcular.":"No sé qué artículo es «"+I.txt+"».");return;}
    if(L.length===1){const a=L[0],p=precioDe(a),n=Math.floor(e/p+1e-9);frase("Con "+eur(e)+" entran "+fmtN(n)+" "+(a.ud||"ud")+" de "+nomArt(a)+" a "+eur(p)+" ("+eur(n*p)+", sobran "+eur(e-n*p)+"). Sin IVA."+(n?" Con IVA entran "+fmtN(Math.floor(e/(p*(1+IVA))+1e-9))+".":""));
      lista(null,[filaA(a,["Hay "+fmtN(Math.round(stockDe(a.id)*10)/10)+" "+(a.ud||"ud")],fmtN(n),a.ud||"ud")]);return;}
    frase("Con "+eur(e)+" (sin IVA) entran:");lista(null,L.slice(0,30).map(a=>{const p=precioDe(a);return filaA(a,eur(p)+" / "+(a.ud||"ud"),fmtN(Math.floor(e/p+1e-9)),a.ud||"ud");}));ign(S.ign);return;}
  if(I.vq==="entra"){const e=I.eur,S=I.txt.trim()?artsQ(I.txt.replace(/\b(de|del|euros?|lo|que|hay|pedir)\b/g," ").trim()):{L:artsActivos(),ign:[]};
    ent("qué entra en "+eur(e));if(!(e>0)){frase("Dime el dinero, por ejemplo «qué entra en 1500 €».");return;}
    const ord={bad:0,warn:1};const C=S.L.filter(a=>a.fam!=="eje"&&cantPedir(a)>0).map(a=>({a,n:cantPedir(a),p:precioDe(a),nv:nivel(a)})).sort((x,y)=>(ord[x.nv]??2)-(ord[y.nv]??2));
    if(!C.length){frase("No hay nada pendiente de pedir"+(I.txt.trim()?" de eso":"")+".");return;}
    let resto=e;const D=[],Fu=[],SP=[];C.forEach(x=>{if(!x.p){SP.push(x);return;}const v=x.n*x.p;if(v<=resto+1e-9){D.push(Object.assign({v},x));resto-=v;}else{const k=Math.floor(resto/x.p+1e-9);if(k>0){D.push(Object.assign({v:k*x.p,parcial:k},x));resto-=k*x.p;}Fu.push(x);}});
    frase("Con "+eur(e)+" (sin IVA), por orden de urgencia, entra"+(D.length>1?"n ":" ")+(D.length?D.length+(D.length===1?" artículo":" artículos")+" por "+eur(e-resto):"nada")+"."+(Fu.length?" Se quedan fuera "+Fu.length+".":"")+(SP.length?" "+SP.length+" sin precio no se han contado.":""));
    if(D.length)lista("Entra",D.map(x=>filaA(x.a,[(x.parcial?fmtN(x.parcial)+" de "+fmtN(x.n):fmtN(x.n))+" "+(x.a.ud||"ud")+" a "+eur(x.p),x.nv==="bad"?"Bajo mínimo":null],eur(x.v),null,x.nv==="bad"?"bad":"warn")),eur(e-resto));
    if(Fu.length)lista("No entra",Fu.filter(x=>!D.some(d=>d.a.id===x.a.id)).map(x=>filaA(x.a,fmtN(x.n)+" "+(x.a.ud||"ud")+" a "+eur(x.p),eur(x.n*x.p))));return;}
  if(I.vq==="comp"){const q2=qn.replace(/\b(que|cual|es|son|sale|mas|car[oa]s?|barat[oa]s?|diferencia|de|precio|precios|entre|compara\w*|el|la|los|las)\b/g," ");
    const tro=q2.split(/\s(?:o|y|con|frente a|vs|contra)\s|,/).map(t=>t.trim()).filter(Boolean);
    let ant=null;const L=tro.map(t=>{let S=artsQ(t);if(S.L.length!==1&&ant){const w=ant.split(" ").filter(x=>!/\d/.test(x)).join(" ");S=artsQ(w+" "+t);}ant=t;return S.L.length===1?S.L[0]:null;});
    ent("comparar precios");const A=L.filter(Boolean);
    if(A.length<2){frase("Dime dos artículos, por ejemplo «qué es más caro, el tubo krown 21 o el westofen 21».");return;}
    const sp=A.filter(a=>!precioDe(a));if(sp.length){frase("Sin precio: "+sp.map(nomArt).join(", ")+".");return;}
    const S2=A.slice().sort((x,y)=>precioDe(y)-precioDe(x)),c=S2[0],b=S2[S2.length-1],d=precioDe(c)-precioDe(b);
    frase(d<0.005?"Cuestan lo mismo: "+eur(precioDe(c))+".":"El más caro es "+nomArt(c)+" ("+eur(precioDe(c))+"), "+eur(d)+" más que "+nomArt(b)+" ("+eur(precioDe(b))+"), un "+String(Math.round(d/precioDe(b)*1000)/10).replace(".",",")+" % más.");
    lista(null,S2.map(a=>filaA(a,[(a.refProv?"Ref. proveedor "+a.refProv+" · ":"")+"hay "+fmtN(Math.round(stockDe(a.id)*10)/10)+" "+(a.ud||"ud")],eur(precioDe(a)),"/ "+(a.ud||"ud"))));return;}
  if(I.vq==="reponer"){const t=qn.replace(/\b(cuanto|cuesta|costaria|coste|valor|importe|vale|reponer|llegar|al|minimo|de|del|lo|los|las|el|la|que|hay|tengo|tenemos|pedir)\b/g," ").trim(),S=t?artsQ(t):{L:artsActivos(),ign:[],fam:false};
    const L=S.L.filter(a=>a.fam!=="eje"&&cantPedir(a)>0).map(a=>({a,n:cantPedir(a),p:precioDe(a)})).sort((x,y)=>y.n*y.p-x.n*x.p),tot=L.reduce((s,x)=>s+x.n*x.p,0),sp=L.filter(x=>!x.p);
    ent("reponer",[t||null]);
    if(!L.length){frase("No hace falta reponer nada"+(t?" de eso":"")+": todo está por encima de lo que hay que tener.");return;}
    frase("Reponer "+L.length+(L.length===1?" artículo":" artículos")+" cuesta "+(tot?eur(tot):"sin valorar")+" sin IVA ("+eur(tot*(1+IVA))+" con IVA)."+(sp.length?" "+sp.length+" sin precio no se han sumado.":""));
    lista(null,L.map(x=>filaA(x.a,["Hay "+fmtN(Math.round(stockDe(x.a.id)*10)/10)+" · mínimo "+fmtN(+x.a.min||0)+" · pedir "+fmtN(x.n),x.p?eur(x.p)+" / "+(x.a.ud||"ud"):"Sin precio"],x.p?eur(x.n*x.p):"—",null,nivel(x.a)==="bad"?"bad":"warn")),tot?eur(tot):null);
    nota("La cantidad es la que propone la app para pedir: lo que falta hasta el mínimo más lo que se gasta mientras llega el pedido.");ign(S.ign);return;}
  if(I.vq==="grupo"){const t=qn.replace(/\b(valor|cuanto|vale|valen|de|del|todo|lo|el|la|los|las|que|hay|stock|dime|dame)\b/g," ").trim(),S=artsQ(t);ent("valor del stock",[t]);
    if(!t||S.L.length===artsActivos().filter(a=>a.fam!=="eje").length){frase("Dime de qué, por ejemplo «valor de todo lo de westofen».");return;}
    const A=S.L.map(a=>({a,st:stockDe(a.id),p:precioDe(a)})).filter(x=>x.st>0),V=A.filter(x=>x.p),tot=V.reduce((s,x)=>s+x.st*x.p,0),sp=A.filter(x=>!x.p);
    if(!A.length){frase("No hay stock de «"+t+"».");return;}
    frase("Lo de «"+t+"» que hay en stock vale "+eur(tot)+" sin IVA ("+A.length+(A.length===1?" artículo":" artículos")+")."+(sp.length?" "+sp.length+" sin precio no se han sumado.":""));
    lista(null,A.sort((x,y)=>y.st*y.p-x.st*x.p).map(x=>filaA(x.a,[fmtN(Math.round(x.st*10)/10)+" "+(x.a.ud||"ud")+(x.p?" a "+eur(x.p):" · sin precio")],x.p?eur(x.st*x.p):"—")),eur(tot));ign(S.ign);return;}
}

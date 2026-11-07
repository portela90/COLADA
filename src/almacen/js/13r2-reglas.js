/* ===== REGLAS AUTOMÁTICAS =====
   Tú pones la condición y la app avisa sola en «Qué hacer hoy» y en la campana, con un botón para actuar.
   Se guardan en el catálogo (cat.reglas) y valen para todos. Tipos:
   · pistDura   — un pistón ha durado menos de N días en una máquina (todas o una) → botón «Abrir avería»
   · stockPunto — el stock de un artículo en un almacén o punto baja de N
   · ejeTaller  — un eje lleva más de N días en el taller
   · gastoMaq   — una máquina (todas o una) lleva gastados más de N € este mes
   · sinCambio  — una máquina lleva más de N días sin cambiar pistón
   · consSem    — en los últimos 7 días se han gastado más de N de un artículo */
const REG_T={pistDura:{t:"Un pistón dura poco",d:"Si un pistón dura menos de N días en una máquina",u:"días",maq:true,def:10},
  stockPunto:{t:"Queda poco en un punto",d:"Si el stock de un artículo en un almacén o punto baja de N",u:"unidades",art:true,alm:true,def:50},
  ejeTaller:{t:"Eje mucho tiempo en el taller",d:"Si un eje lleva más de N días en el taller",u:"días",def:30},
  gastoMaq:{t:"Una máquina gasta mucho",d:"Si una máquina lleva gastados más de N € este mes",u:"€",maq:true,def:500},
  sinCambio:{t:"Máquina sin cambiar pistón",d:"Si una máquina lleva más de N días sin cambiar pistón",u:"días",maq:true,def:90},
  consSem:{t:"Se gasta mucho de algo",d:"Si en los últimos 7 días se gastan más de N de un artículo",u:"unidades",art:true,def:20}};
const reglas=()=>(cat.reglas||[]).filter(r=>r&&REG_T[r.tipo]);
function txtRegla(r){const T=REG_T[r.tipo],a=r.art?art(r.art):null,al=r.alm?(cat.almacenes||[]).find(x=>x.id===r.alm):null,mq=r.maq?maqN(r.maq):null;
  const n=fmtN(+r.n||0);
  return {pistDura:"Si un pistón dura menos de "+n+" días"+(mq?" en la "+mq:" en cualquier máquina"),
    stockPunto:"Si "+(a?a.desc:"(artículo)")+" baja de "+n+" "+(a&&a.ud||"")+" en "+(al?al.nom:"(almacén)"),
    ejeTaller:"Si un eje lleva más de "+n+" días en el taller",
    gastoMaq:"Si "+(mq?"la "+mq:"una máquina")+" gasta más de "+n+" € en el mes",
    sinCambio:"Si "+(mq?"la "+mq:"una máquina")+" lleva más de "+n+" días sin cambiar pistón",
    consSem:"Si en 7 días se gastan más de "+n+" "+(a&&a.ud||"")+" de "+(a?a.desc:"(artículo)")}[r.tipo]||T.d;}
/* lo que salta ahora: [{r, niv, txt, det, btn, fn}] */
function evalReglas(){const out=[],h=hoy();
  reglas().filter(r=>r.activa!==false).forEach(r=>{const N=+r.n||0;try{
    if(r.tipo==="pistDura"){const G={};todosPist().forEach(p=>{if(!p.maq||!p.f)return;if(r.maq&&p.maq!==r.maq)return;(G[p.maq]=G[p.maq]||new Set()).add(p.f);});
      Object.entries(G).forEach(([mq,S])=>{const fs=[...S].sort();if(fs.length<2)return;const u=fs[fs.length-1],a=fs[fs.length-2],d=dias(a,u);
        if(d<N&&dias(u,h)<=14)out.push({r,niv:"bad",txt:"El pistón de la "+maqN(mq)+" ha durado "+d+(d===1?" día":" días"),det:"Cambiado el "+fmtF(a)+" y otra vez el "+fmtF(u)+" · regla: menos de "+N+" días",btn:"Abrir avería",fn:()=>{if(typeof nuevaAveriaMano==="function")nuevaAveriaMano(mq);}});});}
    if(r.tipo==="stockPunto"&&r.art&&r.alm){const a=art(r.art);if(!a)return;const st=stockDe(a.id,r.alm),al=(cat.almacenes||[]).find(x=>x.id===r.alm);
      if(st<N)out.push({r,niv:"warn",txt:"Queda poco "+a.desc+" en "+(al?al.nom:"el almacén")+": "+fmtN(st)+" "+(a.ud||""),det:"Regla: menos de "+fmtN(N)+" "+(a.ud||""),btn:"Reponer",fn:()=>irA("repo")});}
    if(r.tipo==="ejeTaller")ejes.filter(e=>e.estado==="reparacion"||e.estado==="devuelto").forEach(e=>{const ab=abiertaDe(e.cod);if(!ab||!ab.env)return;const d=dias(ab.env,h);
      if(d>N)out.push({r,niv:"warn",txt:"El eje "+e.cod+" lleva "+d+" días en el taller",det:"Enviado el "+fmtF(ab.env)+(ab.alb?" · albarán "+ab.alb:"")+" · regla: más de "+N+" días",btn:"Ver eje",fn:()=>fichaEje(e)});});
    if(r.tipo==="gastoMaq"){const d1=h.slice(0,7)+"-01",G={};evTodo().forEach(e=>{if(!e.f||e.f<d1||e.f>h)return;const m=mqEv(e);if(!m)return;if(r.maq&&m.id!==r.maq)return;G[m.id]=(G[m.id]||0)+(e.eur||0);});
      Object.entries(G).forEach(([id,eu])=>{if(eu>N)out.push({r,niv:"warn",txt:"La "+maqN(id)+" lleva "+eur(Math.round(eu))+" gastados este mes",det:"Regla: más de "+eur(N),btn:"Ver máquina",fn:()=>{const m=maqDe(id);if(m)fichaIny(m);}});});}
    if(r.tipo==="sinCambio")(cat.maquinas||[]).filter(m=>(!r.maq||m.id===r.maq)&&(diamDe(m)||ultimoPist(m.id))).forEach(m=>{const u=ultimoPist(m.id);if(!u)return;const d=dias(u.f,h);
      if(d>N)out.push({r,niv:"info",txt:"La "+m.cod+" lleva "+d+" días sin cambiar pistón",det:"Último cambio el "+fmtF(u.f)+" · regla: más de "+N+" días",btn:"Ver máquina",fn:()=>fichaIny(m)});});
    if(r.tipo==="consSem"&&r.art){const a=art(r.art);if(!a)return;const d0=sumaDias(h,-6);const c=todosMov().filter(m=>m.tipo==="salida"&&m.art===a.id&&m.f>=d0&&m.f<=h).reduce((s,m)=>s+(+m.cant||0),0);
      if(c>N)out.push({r,niv:"warn",txt:"Se han gastado "+fmtN(c)+" "+(a.ud||"")+" de "+a.desc+" en 7 días",det:"Regla: más de "+fmtN(N),btn:"Ver",fn:()=>fichaProd(a.id)});}
  }catch(e){}});
  return out;}
/* pantalla: Más → Reglas automáticas */
function vReglas(v){const L=reglas(),S=evalReglas(),puede=!window.SOLO_CONSULTA;
  const fila=r=>{const n=S.filter(x=>x.r.id===r.id).length;return el("div",{class:"it",style:"cursor:default;flex-wrap:wrap"},[el("span",{class:"stripe "+(r.activa===false?"":n?"warn":"ok")}),
    el("div",{class:"ppal"},[el("div",{class:"t1",text:txtRegla(r)}),el("div",{class:"t2",text:REG_T[r.tipo].t+" · "+(r.activa===false?"apagada":n?"salta ahora: "+n+(n===1?" aviso":" avisos"):"ahora no salta")})]),
    puede?el("div",{class:"acciones",style:"flex:0 0 auto"},[el("button",{type:"button",class:"btn sec peq",text:r.activa===false?"Encender":"Apagar",onclick:async()=>{r.activa=r.activa===false;await saveCat();render(true);}}),
      el("button",{type:"button",class:"btn sec peq",text:"Cambiar",onclick:()=>formRegla(r)}),
      el("button",{type:"button",class:"btn txt peq",text:"Quitar",onclick:()=>confirmar("¿Quitar esta regla?",txtRegla(r),"Quitar",async()=>{cat.reglas=(cat.reglas||[]).filter(x=>x.id!==r.id);await saveCat();render(true);})})]):null]);};
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Tus reglas"}),el("span",{class:"der sub",text:L.length?L.length+(L.length===1?" regla":" reglas"):"ninguna todavía"})]),
    L.length?el("div",{class:"lst"},L.map(fila)):el("div",{class:"bd"},el("p",{class:"hint",style:"margin:0",text:"Pon una condición y la app te avisará sola en «Qué hacer hoy» y en la campana cuando se cumpla."})),
    puede?el("div",{class:"bd"},el("button",{type:"button",class:"btn",text:"+ Nueva regla",onclick:()=>formRegla(null)})):null]));
  if(S.length)v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Lo que salta ahora ("+S.length+")"})),
    el("div",{class:"lst"},S.map(x=>el("div",{class:"it",style:"cursor:default;flex-wrap:wrap"},[el("span",{class:"stripe "+(x.niv==="info"?"":x.niv)}),el("div",{class:"ppal"},[el("div",{class:"t1",text:x.txt}),el("div",{class:"t2",text:x.det})]),
      el("button",{type:"button",class:"btn peq",text:x.btn,onclick:x.fn})])))]));
  v.appendChild(el("p",{class:"hint",text:"Las reglas se miran cada vez que se abre la app. Lo que salta sale en «Qué hacer hoy» y en la campana de todos."}));}
function formRegla(r0){const r=r0?Object.assign({},r0):{id:uid(),tipo:"pistDura",n:REG_T.pistDura.def,activa:true};
  const box=el("div",{style:"display:grid;gap:10px"});
  const pinta=()=>{box.textContent="";const T=REG_T[r.tipo];
    box.appendChild(el("div",{class:"rg-tipos"},Object.entries(REG_T).map(([k,x])=>el("button",{type:"button",class:"rg-t","aria-pressed":String(r.tipo===k),onclick:()=>{if(r.tipo!==k){r.tipo=k;r.n=x.def;delete r.art;delete r.alm;delete r.maq;}pinta();}},[el("b",{text:x.t}),el("small",{text:x.d})]))));
    if(T.art)box.appendChild(fld("Artículo",sel("rgArt",artOpts(),r.art||"",x=>{r.art=x;pintaRes();},"Elige…")));
    if(T.alm)box.appendChild(fld("Almacén o punto",sel("rgAlm",(cat.almacenes||[]).map(a=>[a.id,a.nom]),r.alm||"",x=>{r.alm=x;pintaRes();},"Elige…")));
    if(T.maq)box.appendChild(fld("Máquina",sel("rgMaq",maqOpts(),r.maq||"",x=>{r.maq=x||undefined;pintaRes();},"Cualquiera")));
    box.appendChild(fld("N ("+T.u+")",inp("rgN",String(r.n),x=>{r.n=parseN(x);pintaRes();},{inputmode:"decimal",class:"num"})));
    box.appendChild(res);pintaRes();};
  const res=el("p",{class:"banner",style:"margin:0"});const pintaRes=()=>{res.textContent="Quedará así: «"+txtRegla(r)+"»";};
  pinta();
  dlg(r0?"Cambiar regla":"Nueva regla",[box],[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const T=REG_T[r.tipo];
    if(!(+r.n>0)){toast("Pon un número mayor que 0");return false;}if(T.art&&!r.art){toast("Elige el artículo");return false;}if(T.alm&&!r.alm){toast("Elige el almacén");return false;}
    cat.reglas=(cat.reglas||[]).filter(x=>x.id!==r.id).concat([r]);try{await saveCat();}catch(e){return false;}toast("Regla guardada");render(true);}}]);}

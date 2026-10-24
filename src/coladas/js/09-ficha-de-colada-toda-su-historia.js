/* ---------- Ficha de colada: toda su historia en una pantalla ---------- */
let fichaRefresca=null;
/* con 0 fardos, los kg sueltos son redondeo del kg/fardo: se muestran como 0 */
const kgVis=b=>(b.fa===0&&Math.abs(b.kg)<Math.max(1,b.ratio||0))?0:b.kg;
function abrirFicha(id){
  const prev=document.querySelector(".ficha-ov:not(.alb-ov)");if(prev)prev.remove();
  const body=el("div",{class:"ficha-body"}),tit=el("h2");
  const cerrar=()=>{ov.remove();fichaRefresca=null;document.removeEventListener("keydown",tec);};
  const T={C:"Consumo",E:"Entrada",A:"Ajuste",G:"Granalla de cobre",T:"Traslado"};
  const pinta=()=>{
    const l=lotes.find(x=>x.id===id);body.textContent="";
    if(!l){tit.textContent="Colada";body.appendChild(el("div",{class:"card"},[el("div",{class:"empty",text:"Esta colada ya no existe (se borró su entrada)."})]));return;}
    const S=saldos(),b=S[l.id]||{fa:0,kg:0,ratio:0},ext=l.donde==="externo";
    tit.textContent=l.nombre;
    const ms=todosMovs().filter(r=>r.o===l.id||r.d===l.id)
      .sort((a,c)=>(a.f||"").localeCompare(c.f||"")||(a.i||"").localeCompare(c.i||""));
    /* saldo corrido: arranca en el inventario y suma/resta cada apunte */
    let fa=l.fardosInv||0,kg=l.kgInv||0;const filas=[];
    let entFa=l.fardosInv||0,entKg=l.kgInv||0,conFa=0,conKg=0,ajFa=0,ajKg=0,trFa=0,ultCon=null;
    ms.forEach(r=>{
      const f=typeof r.fa==="number"?r.fa:0,k=kgAp(r,S),entra=r.d===l.id&&r.o!==l.id,sale=r.o===l.id&&r.d!==l.id;
      let sg=0;
      if(!r.h){if(entra){fa+=f;kg+=k;sg=1;}else if(sale){fa-=f;kg-=k;sg=-1;}}
      if(!r.h){
        if(r.t==="E"&&entra){entFa+=f;entKg+=k;}
        if(r.t==="C"&&sale){conFa+=f;conKg+=k;ultCon=r.f;}
        if(r.t==="A"){ajFa+=sg*f;ajKg+=sg*k;}
        if(r.t==="T"){trFa+=sg*f;}
      }
      filas.push({r,sg,f,k,fa,kg});
    });
    const foto=ms.find(r=>r.ft);
    const agot=b.fa<=0;
    const kpi=(t,v,sub)=>el("div",{},[el("dt",{text:t}),el("dd",{class:"num"},[document.createTextNode(v),sub?el("small",{text:sub}):null])]);
    body.appendChild(el("div",{class:"wrap"},[
      el("div",{class:"card"},[
        el("div",{class:"hd"},[el("span",{class:"tagm",style:"background:"+(MAT[l.material]?MAT[l.material].col:"var(--mut)")}),
          el("h2",{text:l.nave+" · "+(MAT[l.material]?MAT[l.material].nom:l.material)}),
          agot?el("span",{class:"pill na",style:"margin-left:auto",text:"Agotada"+(ultCon?" el "+dmy(ultCon):"")}):
            el("span",{class:"pill "+(ext?"ok":"na"),style:"margin-left:auto",text:ext?"Almacén externo":"En la nave"})]),
        el("dl",{class:"kpis",style:"margin:0"},[
          kpi("Quedan",fmt(b.fa)+" f",fmt(kgVis(b))+" kg"),
          kpi("Entró",fmt(entFa)+" f",fmt(entKg)+" kg"),
          kpi("Consumido",fmt(conFa)+" f",fmt(conKg)+" kg"),
          kpi("Kg por fardo",b.ratio>0?b.ratio.toLocaleString("es-ES"):"—",ajFa?("ajustes "+(ajFa>0?"+":"−")+fmt(Math.abs(ajFa))+" f"):(trFa?("traslados "+(trFa>0?"+":"−")+fmt(Math.abs(trFa))+" f"):""))
        ]),
        el("div",{class:"bd"},[el("dl",{class:"datos",style:"margin:0"},[
          el("dt",{text:"Proveedor"}),el("dd",{text:l.proveedor||"—"}),
          el("dt",{text:"Albarán"}),el("dd",{},[l.albaran?el("button",{type:"button",class:"linkcol",text:l.albaran,onclick:()=>abrirAlbaran(l.albaran)}):document.createTextNode("—")]),
          el("dt",{text:"Entrada"}),el("dd",{text:l.entrada?l.entrada.split("-").reverse().join("/"):"—"}),
          l.obs?el("dt",{text:"Notas"}):null,l.obs?el("dd",{text:l.obs}):null]),
          foto?el("div",{style:"margin-top:12px"},[el("img",{class:"foto-alb",src:fotoUrl(foto.ft),alt:"Albarán "+(l.albaran||""),onclick:()=>verFoto(foto.ft)})]):null]),
        el("div",{class:"bd",style:"padding-top:0"},[el("div",{class:"seg"},[
          el("button",{type:"button",class:"btn sec",text:"Ajustar fardos",onclick:()=>ajustarLote(l,b)}),
          el("button",{type:"button",class:"btn sec",text:"Ver en Consultas",onclick:()=>{cerrar();const bo=document.querySelector(".bus-ov");if(bo)bo.remove();
            filtro={desde:"",hasta:"",tipo:"",nave:"",mat:"",turno:"",texto:l.nombre};tab="hist";try{localStorage.setItem("colada.tab",tab);}catch(e){}tabsUI();render();}})])])
      ]),
      el("div",{class:"card"},[
        el("div",{class:"hd"},[el("h2",{text:"Historial"}),el("span",{class:"sub",style:"margin-left:auto",text:fmt(filas.length)+" apuntes"})]),
        el("div",{class:"tw"},[el("table",{},[
          el("thead",{},[el("tr",{},[el("th",{text:"Fecha"}),el("th",{text:"Qué"}),el("th",{class:"r",text:"Fardos"}),el("th",{class:"r",text:"Kg"}),el("th",{class:"r",text:"Quedan"})])]),
          el("tbody",{},[el("tr",{},[el("td",{class:"num sub",text:"—"}),el("td",{class:"sub",text:(l.fardosInv||l.kgInv)?"Inventario de arranque":"Alta de la colada"}),
              el("td",{class:"r num",text:(l.fardosInv?"+"+fmt(l.fardosInv):"—")}),el("td",{class:"r num",text:(l.kgInv?"+"+fmt(l.kgInv):"—")}),el("td",{class:"r num",text:fmt(l.fardosInv||0)})])]
            .concat(filas.map(x=>{const r=x.r,s=x.sg>0?"+":(x.sg<0?"−":"");
              return el("tr",{},[
                el("td",{class:"num",text:dmy(r.f)}),
                el("td",{},[document.createTextNode((r.t==="G"&&r.aj?"Ajuste granalla de cobre":(T[r.t]||r.t))),
                  el("div",{class:"sub",text:[r.u,r.h?"histórico, ya descontado":"",r.t!=="E"&&r.n?r.n:"",r.t==="E"&&r.a?r.a:"",r.ed?"editado":""].filter(Boolean).join(" · ")}),
                  (!r.h&&r.t!=="T")?el("button",{class:"btn sec del edit",type:"button",text:"Editar",onclick:()=>editarApunte(r)}):null]),
                el("td",{class:"r num",text:x.f?(r.h?"":s)+fmt(x.f):"—"}),
                el("td",{class:"r num",text:x.k?(r.h?"":s)+fmt(Math.abs(x.k)):"—"}),
                el("td",{class:"r num",style:x.fa<0?"color:var(--bad);font-weight:600":"",text:r.h?"":fmt(x.fa)})]);})))
        ])])
      ])
    ]));
  };
  const tec=e=>{if(e.key==="Escape"&&!document.querySelector(".dlg-ov,.lightbox"))cerrar();};
  const ov=el("div",{class:"ficha-ov",role:"dialog","aria-modal":"true","aria-label":"Ficha de colada"},[
    el("div",{class:"ficha-top"},[el("button",{type:"button",class:"btn sec",style:"font-size:14px;padding:9px 14px",text:"← Volver",onclick:cerrar}),tit]),body]);
  document.addEventListener("keydown",tec);document.body.appendChild(ov);fichaRefresca=pinta;pinta();
}
/* ---------- Ficha de albarán: qué coladas trajo y cuánto queda ---------- */
let albRefresca=null;
const albKey=a=>nrm(a).replace(/\s+/g,"");
function albaranes(){const m={};
  lotes.forEach(l=>{if(l.albaran){const k=albKey(l.albaran);(m[k]=m[k]||{alb:l.albaran,lotes:[],prov:l.proveedor||"",f:l.entrada||""}).lotes.push(l);}});
  todosMovs().forEach(r=>{if(r.t==="E"&&r.a){const k=albKey(r.a);const l=lotes.find(x=>x.id===r.d);
    const x=(m[k]=m[k]||{alb:r.a,lotes:[],prov:r.p||"",f:r.f||""});if(l&&x.lotes.indexOf(l)<0)x.lotes.push(l);if(!x.prov&&r.p)x.prov=r.p;}});
  return m;}
function abrirAlbaran(alb){
  const k=albKey(alb),prev=document.querySelector(".alb-ov");if(prev)prev.remove();
  const body=el("div",{class:"ficha-body"}),tit=el("h2");
  const cerrar=()=>{ov.remove();albRefresca=null;document.removeEventListener("keydown",tec);};
  const pinta=()=>{
    const A=albaranes()[k];body.textContent="";tit.textContent="Albarán "+alb;
    if(!A||!A.lotes.length){body.appendChild(el("div",{class:"card"},[el("div",{class:"empty",text:"No hay coladas con este albarán."})]));return;}
    const S=saldos(),ids=A.lotes.map(l=>l.id);
    const ents=todosMovs().filter(r=>r.t==="E"&&ids.indexOf(r.d)>=0);
    const foto=(ents.find(r=>r.ft)||{}).ft;
    const fecha=(ents[0]&&ents[0].f)||A.f;
    let tFa=0,tKg=0,qFa=0,qKg=0;
    const filas=A.lotes.slice().sort((a,b)=>a.nave.localeCompare(b.nave)||a.nombre.localeCompare(b.nombre,"es")).map(l=>{
      const b=S[l.id]||{fa:0,kg:0,ratio:0},e=ents.filter(r=>r.d===l.id);
      const eFa=(l.fardosInv||0)+e.reduce((a,r)=>a+(r.fa||0),0),eKg=(l.kgInv||0)+e.reduce((a,r)=>a+(r.kg||0),0);
      tFa+=eFa;tKg+=eKg;qFa+=b.fa;qKg+=kgVis(b);
      const ext=l.donde==="externo";
      return el("tr",{class:ext?"ext":""},[
        el("td",{},[el("span",{class:"tagm",style:"background:"+(MAT[l.material]?MAT[l.material].col:"var(--mut)")}),
          el("button",{type:"button",class:"linkcol",text:l.nombre,onclick:()=>abrirFicha(l.id)}),
          el("div",{class:"sub",text:l.nave+" · "+(MAT[l.material]?MAT[l.material].nom:l.material)+" · "+(b.fa<=0?"agotada":(ext?"externo":"en nave"))})]),
        el("td",{class:"r num"},[el("div",{text:eFa?fmt(eFa)+" f":"—"}),el("div",{class:"sub",text:eKg?fmt(eKg)+" kg":""})]),
        el("td",{class:"r num"},[el("div",{style:"font-weight:600",text:fmt(b.fa)+" f"}),el("div",{class:"sub",text:fmt(kgVis(b))+" kg"})])]);});
    const kpi=(t,v,sub)=>el("div",{},[el("dt",{text:t}),el("dd",{class:"num"},[document.createTextNode(v),sub?el("small",{text:sub}):null])]);
    body.appendChild(el("div",{class:"wrap"},[
      el("div",{class:"card"},[
        el("div",{class:"hd"},[el("h2",{text:A.prov||"Sin proveedor"}),el("span",{class:"sub",style:"margin-left:auto",text:fecha?"Entrada "+fecha.split("-").reverse().join("/"):""})]),
        el("dl",{class:"kpis",style:"margin:0"},[kpi("Coladas",String(A.lotes.length)),kpi("Entró",fmt(tFa)+" f",fmt(tKg)+" kg"),kpi("Quedan",fmt(qFa)+" f",fmt(qKg)+" kg"),
          kpi("Consumido",fmt(Math.max(0,tFa-qFa))+" f",tKg?Math.round(Math.max(0,tKg-qKg)/tKg*100)+" % del albarán":"")]),
        foto?el("div",{class:"bd"},[el("img",{class:"foto-alb",src:fotoUrl(foto),alt:"Albarán "+alb,onclick:()=>verFoto(foto)})]):
          el("div",{class:"bd"},[el("p",{class:"hint",text:"Este albarán no tiene foto."})])]),
      el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Coladas del albarán"})]),
        el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},[el("th",{text:"Colada"}),el("th",{class:"r",text:"Entró"}),el("th",{class:"r",text:"Quedan"})])]),el("tbody",{},filas)])])])
    ]));
  };
  const tec=e=>{if(e.key==="Escape"&&!document.querySelector(".dlg-ov,.lightbox,.ficha-ov:not(.alb-ov)"))cerrar();};
  const ov=el("div",{class:"ficha-ov alb-ov",role:"dialog","aria-modal":"true","aria-label":"Ficha de albarán"},[
    el("div",{class:"ficha-top"},[el("button",{type:"button",class:"btn sec",style:"font-size:14px;padding:9px 14px",text:"← Volver",onclick:cerrar}),tit]),body]);
  document.addEventListener("keydown",tec);document.body.appendChild(ov);albRefresca=pinta;pinta();
}
/* ---------- Buscador global ----------
   Busca en coladas y en todos los apuntes: colada, albarán, proveedor, nota,
   nave, aleación, dónde está (nave/externo), fecha (dd/mm) y relevo. Varias
   palabras se combinan: "befesa externo" = coladas de BEFESA en el externo. */
const nrm=t=>String(t==null?"":t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
let busQ="";
function marca(txt,terms){const t=String(txt==null?"":txt);if(!terms.length||!t)return[document.createTextNode(t)];
  const n=nrm(t),hits=[];terms.forEach(q=>{let i=n.indexOf(q);while(i>=0&&q){hits.push([i,i+q.length]);i=n.indexOf(q,i+q.length);}});
  if(!hits.length)return[document.createTextNode(t)];
  hits.sort((a,b)=>a[0]-b[0]);const out=[];let p=0;
  hits.forEach(([a,b])=>{if(a<p)a=p;if(b<=a)return;if(a>p)out.push(document.createTextNode(t.slice(p,a)));out.push(el("mark",{text:t.slice(a,b)}));p=b;});
  if(p<t.length)out.push(document.createTextNode(t.slice(p)));return out;}
/* filtros rápidos del buscador: se combinan con lo escrito */
let busF={ubi:"",mes:false,prov:"",nave:"",mat:""};
const hayFiltro=()=>!!(busF.ubi||busF.mes||busF.prov||busF.nave||busF.mat);
function buscar(q){
  const terms=nrm(q).split(/\s+/).filter(Boolean),F=busF,filtra=hayFiltro();
  if(!terms.length&&!filtra)return{terms,col:[],mov:[],alb:[],filtra};
  const S=saldos(),T={C:"consumo",E:"entrada",A:"ajuste",G:"granalla de cobre",T:"traslado"},mesAct=mesDe(hoy());
  const ok=txt=>{if(!terms.length)return true;const n=nrm(txt);return terms.every(t=>n.includes(t));};
  const fL=l=>{const b=S[l.id]||{fa:0};
    if(F.ubi==="agotada"&&b.fa>0)return false;
    if(F.ubi&&F.ubi!=="agotada"&&(l.donde!==F.ubi||b.fa<=0))return false;
    if(F.prov&&nrm(l.proveedor)!==nrm(F.prov))return false;
    if(F.nave&&l.nave!==F.nave)return false;
    if(F.mat&&l.material!==F.mat)return false;
    return true;};
  const col=lotes.map(l=>{const b=S[l.id]||{fa:0,kg:0};
      const txt=[l.nombre,l.albaran,l.proveedor,l.obs,l.nave,MAT[l.material]?MAT[l.material].nom+" "+MAT[l.material].al:"",l.material,
        l.donde==="externo"?"externo almacen externo bp":"en nave",b.fa<=0?"agotada":"",dmy(l.entrada),l.entrada].join(" ");
      return{l,b,txt};}).filter(x=>ok(x.txt)&&fL(x.l)&&(!F.mes||(x.l.entrada||"").slice(0,7)===mesAct))
    .sort((a,b)=>((b.b.fa>0)-(a.b.fa>0))||(a.l.entrada||"").localeCompare(b.l.entrada||""));
  const mov=todosMovs().map(r=>{const l=lotes.find(x=>x.id===(r.o||r.d));
      const nave=l?l.nave:(r.nv||""),mat=l?l.material:(r.ml||"");
      const colada=l?l.nombre:(r.t==="G"?"Granalla de cobre":(r.n||""));
      const txt=[(r.t==="G"&&r.aj?"Ajuste granalla de cobre":(T[r.t]||r.t)),colada,nave,MAT[mat]?MAT[mat].nom+" "+MAT[mat].al:"",mat,r.u,r.a,r.p,r.n,l?l.albaran:"",l?l.proveedor:"",dmy(r.f),r.f,r.h?"historico":""].join(" ");
      return{r,l,nave,mat,colada,txt};}).filter(x=>{if(!ok(x.txt))return false;
        if(F.mes&&(x.r.f||"").slice(0,7)!==mesAct)return false;
        if(x.l)return fL(x.l);
        if(F.ubi||F.prov||F.mat)return false;
        return !F.nave||x.nave===F.nave;})
    .sort((a,b)=>(b.r.f||"").localeCompare(a.r.f||"")||(b.r.i||"").localeCompare(a.r.i||""));
  const alb=Object.values(albaranes()).filter(a=>(terms.length?ok([a.alb,a.prov,a.lotes.map(l=>l.nombre).join(" "),"albaran"].join(" "))&&terms.some(t=>nrm(a.alb).includes(t)||nrm(a.prov).includes(t)):true)
      &&a.lotes.some(fL)&&(!F.mes||(a.f||"").slice(0,7)===mesAct))
    .sort((a,b)=>(b.f||"").localeCompare(a.f||""));
  return{terms,col,mov,alb,S,filtra};
}
function abrirBuscador(){
  if(document.querySelector(".bus-ov"))return;
  const inp=el("input",{type:"search",placeholder:"Colada, albarán, proveedor, fecha…",value:busQ,autocomplete:"off",autocorrect:"off",autocapitalize:"off",spellcheck:"false","aria-label":"Buscar"});
  const res=el("div",{class:"bus-res"}),chips=el("div",{class:"chips",role:"group","aria-label":"Filtros"});
  const cerrar=()=>{ov.remove();document.removeEventListener("keydown",tec);const b=$("lupa");if(b)b.focus();};
  const chip=(txt,on,fn)=>el("button",{type:"button",class:"chip","aria-pressed":String(!!on),text:txt,onclick:()=>{fn();pintaChips();pinta();}});
  const pintaChips=()=>{chips.textContent="";
    [["nave","En nave"],["externo","Externo"],["agotada","Agotadas"]].forEach(([v,t])=>chips.appendChild(chip(t,busF.ubi===v,()=>{busF.ubi=busF.ubi===v?"":v;})));
    chips.appendChild(chip("Este mes",busF.mes,()=>{busF.mes=!busF.mes;}));
    NAVES.forEach(n=>chips.appendChild(chip(n,busF.nave===n,()=>{busF.nave=busF.nave===n?"":n;})));
    Object.keys(MAT).forEach(m=>chips.appendChild(chip(MAT[m].nom,busF.mat===m,()=>{busF.mat=busF.mat===m?"":m;})));
    const provs=Array.from(new Set((cfg.proveedores||[]).concat(lotes.map(l=>l.proveedor).filter(Boolean)).map(p=>p.trim()))).sort((a,b)=>a.localeCompare(b,"es"));
    const sel=el("select",{class:"chip-sel"+(busF.prov?" on":""),"aria-label":"Proveedor",onchange:e=>{busF.prov=e.target.value;pintaChips();pinta();}},
      [el("option",{value:"",text:"Proveedor: todos"})].concat(provs.map(p=>{const o=el("option",{value:p,text:p});if(nrm(busF.prov)===nrm(p))o.selected=true;return o;})));
    chips.appendChild(sel);
    if(hayFiltro())chips.appendChild(el("button",{type:"button",class:"chip limpiar",text:"Quitar filtros",onclick:()=>{busF={ubi:"",mes:false,prov:"",nave:"",mat:""};pintaChips();pinta();}}));};
  const ir=nombre=>{cerrar();filtro={desde:"",hasta:"",tipo:"",nave:"",mat:"",turno:"",texto:nombre};tab="hist";
    try{localStorage.setItem("colada.tab",tab);}catch(e){}tabsUI();render();
    setTimeout(()=>{const c=$("f-q");if(c)c.scrollIntoView({block:"start"});},30);};
  const T={C:"Consumo",E:"Entrada",A:"Ajuste",G:"Granalla de cobre",T:"Traslado"};
  const pinta=()=>{
    const R=buscar(busQ),w=el("div",{class:"wrap"});res.textContent="";res.appendChild(w);
    if(!R.terms.length&&!R.filtra){w.appendChild(el("div",{class:"card"},[el("div",{class:"bd"},[
      el("p",{class:"hint",text:"Escribe una colada (C25073), un albarán (CEVA2601671), un proveedor (BEFESA), una fecha (24/09) o palabras como externo, AlSi12, Nave 2, noche, agotada. Varias palabras se combinan."})])]));return;}
    if(!R.col.length&&!R.mov.length&&!R.alb.length){w.appendChild(el("div",{class:"card"},[el("div",{class:"empty",text:"Nada coincide"+(busQ.trim()?" con «"+busQ.trim()+"»":"")+(R.filtra?" con estos filtros":"")+". Prueba con menos letras o quita algún filtro."})]));return;}
    if(R.alb.length)w.appendChild(el("div",{class:"card"},[
      el("div",{class:"gh"},[el("span",{text:"Albaranes"}),el("span",{class:"num",text:String(R.alb.length)})]),
      el("div",{},R.alb.slice(0,20).map(a=>el("button",{type:"button",class:"bus-it",onclick:()=>abrirAlbaran(a.alb)},[
        el("div",{class:"l1"},[el("b",{},marca(a.alb,R.terms)),el("span",{class:"sub"},marca(a.prov,R.terms)),
          el("span",{class:"der num sub",text:(a.f?dmy(a.f)+" · ":"")+a.lotes.length+" colada"+(a.lotes.length===1?"":"s")})]),
        el("div",{class:"sub"},marca(a.lotes.map(l=>l.nombre).join(" · "),R.terms))])))]));
    if(R.col.length)w.appendChild(el("div",{class:"card"},[
      el("div",{class:"gh"},[el("span",{text:"Coladas"}),el("span",{class:"num",text:String(R.col.length)})]),
      el("div",{},R.col.slice(0,40).map(({l,b})=>{const ext=l.donde==="externo";
        return el("button",{type:"button",class:"bus-it"+(ext?" ext":""),onclick:()=>abrirFicha(l.id)},[
          el("div",{class:"l1"},[el("span",{class:"tagm",style:"background:"+(MAT[l.material]?MAT[l.material].col:"var(--mut)")}),
            el("b",{},marca(l.nombre,R.terms)),
            b.fa<=0?el("span",{class:"pill na",text:"Agotada"}):el("span",{class:"pill "+(ext?"ok":"na"),text:ext?"Externo":"En nave"}),
            el("span",{class:"der num"},[el("b",{text:fmt(b.fa)+" f"}),document.createTextNode(" · "+fmt(kgVis(b))+" kg")])]),
          el("div",{class:"sub"},marca([l.nave,MAT[l.material]?MAT[l.material].nom:l.material,l.proveedor,l.albaran,"entró "+dmy(l.entrada)].filter(Boolean).join(" · "),R.terms))]);}))]));
    if(R.mov.length)w.appendChild(el("div",{class:"card"},[
      el("div",{class:"gh"},[el("span",{text:"Apuntes"}),el("span",{class:"num",text:R.mov.length>60?"60 de "+R.mov.length:String(R.mov.length)})]),
      el("div",{},R.mov.slice(0,60).map(({r,l,nave,mat,colada})=>{
        const kg=Math.abs(kgAp(r,R.S)),fa=typeof r.fa==="number"?Math.abs(r.fa):0;
        const sg=r.t==="E"||(r.t==="A"&&r.d)||(r.t==="G"&&r.kg>0)?"+":(r.t==="T"?"":"−");
        return el("button",{type:"button",class:"bus-it",onclick:()=>l?abrirFicha(l.id):ir("")},[
          el("div",{class:"l1"},[el("span",{class:"num sub",text:dmy(r.f)}),el("b",{text:(r.t==="G"&&r.aj?"Ajuste granalla de cobre":(T[r.t]||r.t))}),
            el("span",{},marca(colada,R.terms)),r.h?el("span",{class:"pill na",text:"histórico"}):null,
            el("span",{class:"der num",text:(fa?sg+fmt(fa)+" f · ":"")+sg+fmt(kg)+" kg"})]),
          el("div",{class:"sub"},marca([nave,MAT[mat]?MAT[mat].nom:"",r.u,r.a||(l&&r.t==="E"?l.albaran:""),r.p,r.n&&r.n!==colada?r.n:""].filter(Boolean).join(" · "),R.terms))]);}))]));
  };
  inp.addEventListener("input",()=>{busQ=inp.value;pinta();});
  const tec=e=>{if(e.key==="Escape"&&!document.querySelector(".dlg-ov"))cerrar();};
  const ov=el("div",{class:"bus-ov",role:"dialog","aria-modal":"true","aria-label":"Buscador"},[
    el("div",{class:"bus-top"},[inp,el("button",{type:"button",class:"btn sec",style:"font-size:14px;padding:9px 14px",text:"Cerrar",onclick:cerrar})]),chips,res]);
  document.addEventListener("keydown",tec);document.body.appendChild(ov);pintaChips();pinta();
  setTimeout(()=>{inp.focus();inp.select();},30);
}
/* Al redibujar se recrean los campos; guardamos cuál tenía el foco, el cursor
   y el scroll para devolverlos y que se pueda seguir escribiendo sin cortes. */

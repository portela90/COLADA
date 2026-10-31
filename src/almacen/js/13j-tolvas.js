/* ===== TOLVAS DEL HORNO (hierro y refractario): reparaciones en un taller de fuera =====
   - Cambiar una tolva en una máquina es una salida del artículo con la máquina: suma al gasto del horno de esa máquina
     (al precio del artículo, que para las tolvas es lo que cuesta repararlas).
   - Enviar a reparar: colección «trep», doc «lista», items {id, art, cant, env, prov, alb, nota, vuelta:[{f,cant,eur,alb}], ts}.
   - Cuando vuelven: entrada en el almacén (las tolvas reparadas vuelven al stock) y el importe del albarán (o el precio del artículo). */
let TREP=[];
const tolvasArts=()=>artsActivos().filter(a=>a.fam==="horno"&&(/tolva/i.test(a.desc)||/tolva/i.test(a.grupo||"")));
const trepVuelta=r=>(r.vuelta||[]).reduce((s,v)=>s+(+v.cant||0),0);
const trepAbiertas=()=>TREP.filter(r=>trepVuelta(r)<(+r.cant||0));
const trepCoste=(r,v)=>v.eur!=null&&v.eur!==""?+v.eur:(+v.cant||0)*precioDe(art(r.art));
async function guardaTrep(lista){const ref=db.doc("trep/lista");await ref.set({items:lista});}
async function trepNuevo(rec){const ref=db.doc("trep/lista"),sn=await ref.get();await ref.set({items:((sn.exists&&sn.data().items)||[]).concat([rec])});}
async function trepCambia(id,fn){const ref=db.doc("trep/lista"),sn=await ref.get();const it=((sn.exists&&sn.data().items)||[]).map(r=>r.id===id?fn(Object.assign({},r)):r);await ref.set({items:it});}
function formEnviarTolvas(){const T=tolvasArts();if(!T.length){toast("No hay tolvas en el catálogo");return;}
  const v={f:hoy(),c:{},prov:(T.find(a=>a.prov)||{}).prov||"",alb:"",nota:""};
  dlg("Enviar tolvas a reparar",[fld("Fecha",inp("tvF",v.f,x=>v.f=x,{type:"date",max:hoy()}))].concat(T.map(a=>fld(a.desc+" · cuántas",inp("tvC"+a.id,"",x=>v.c[a.id]=x,{inputmode:"numeric",class:"num",placeholder:"0"}))))
    .concat([el("div",{class:"row"},[fld("Taller",sel("tvProv",provOpts(),v.prov,x=>v.prov=x,"—")),fld("Nº albarán (opcional)",inp("tvAlb","",x=>v.alb=x,{autocomplete:"off"}))]),fld("Nota",inp("tvN","",x=>v.nota=x,{autocomplete:"off"}))]),
    [{t:"Cancelar",cls:"sec"},{t:"Enviar",fn:async()=>{const L=T.map(a=>({a,n:parseInt(v.c[a.id],10)})).filter(x=>x.n>0);if(!L.length){toast("Pon cuántas tolvas se envían");return false;}
      try{for(const x of L)await trepNuevo({id:uid(),art:x.a.id,cant:x.n,env:v.f,prov:v.prov||null,alb:String(v.alb).trim()||null,nota:String(v.nota).trim()||null,vuelta:[],ts:Date.now()});}catch(e){toast("No se pudo guardar");return false;}
      toast("Apuntado: "+L.map(x=>x.n+" "+x.a.desc.toLowerCase()).join(" y ")+" en el taller");render(true);}}]);}
function formVueltaTolvas(r){const a=art(r.art),falta=(+r.cant||0)-trepVuelta(r);const v={f:hoy(),n:String(falta),eur:"",alb:""};
  const almD=(a&&(a.almPpal||(a.alms||[])[0]))||(cat.almacenes[0]||{}).id||"";let alm=almD;
  dlg("Han vuelto del taller",[el("p",{class:"hint",text:(a?a.desc:"Tolva")+": enviadas "+r.cant+" el "+fmtF(r.env)+(trepVuelta(r)?", ya han vuelto "+trepVuelta(r):"")+"."}),
    el("div",{class:"row"},[fld("Fecha",inp("tvvF",v.f,x=>v.f=x,{type:"date",max:hoy()})),fld("Cuántas vuelven",inp("tvvN",v.n,x=>v.n=x,{inputmode:"numeric",class:"num"}))]),
    el("div",{class:"row"},[fld("Importe del albarán (€, opcional)",inp("tvvE","",x=>v.eur=x,{inputmode:"decimal",class:"num",placeholder:precioDe(a)?"si no: "+eur(precioDe(a))+" cada una":"€"})),fld("Nº albarán",inp("tvvA","",x=>v.alb=x,{autocomplete:"off"}))]),
    fld("Entran en el almacén",sel("tvvAlm",almOpts(),alm,x=>alm=x))],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const n=parseInt(v.n,10);if(!(n>0&&n<=falta)){toast("Pon cuántas vuelven (como mucho "+falta+")");return false;}const e=String(v.eur).trim()===""?null:parseN(v.eur);if(e!=null&&!(e>=0)){toast("Importe no válido");return false;}
      try{const m={tipo:"entrada",f:v.f,art:r.art,alm,cant:n,prov:r.prov||undefined,alb:String(v.alb).trim()||undefined,nota:"Reparadas en el taller (enviadas el "+fmtF(r.env)+")",trep:r.id};await addMovs([m]);
        await trepCambia(r.id,x=>{x.vuelta=(x.vuelta||[]).concat([{f:v.f,cant:n,eur:e,alb:String(v.alb).trim()||null,mov:m.id}]);return x;});}catch(er){toast("No se pudo guardar");return false;}
      toast("Vuelven "+n+" al almacén");render(true);}}]);}
/* números: en el taller ahora, gasto en reparaciones, cada cuánto se envían, cambios por máquina */
function datosTolvas(d0,d1){const T=tolvasArts(),h=hoy();const G={};T.forEach(a=>G[a.id]={a,taller:0,dias:[],gasto:0,rep:0,envios:[],cambios:0,maq:{}});
  TREP.forEach(r=>{const g=G[r.art];if(!g)return;const f=(+r.cant||0)-trepVuelta(r);if(f>0){g.taller+=f;g.dias.push(dias(r.env,h));}g.envios.push(r.env);
    (r.vuelta||[]).forEach(v=>{if(v.f>=d0&&v.f<=d1){g.gasto+=trepCoste(r,v);g.rep+=+v.cant||0;}});});
  todosMov().forEach(m=>{const g=G[m.art];if(!g||m.tipo!=="salida"||m.f<d0||m.f>d1)return;g.cambios+=+m.cant||0;const k=m.maq?maqN(m.maq):"Sin máquina";g.maq[k]=(g.maq[k]||0)+(+m.cant||0);});
  Object.values(G).forEach(g=>{const e=[...new Set(g.envios)].sort();const iv=e.slice(1).map((f,i)=>dias(e[i],f));g.cada=iv.length?Math.round(iv.reduce((s,x)=>s+x,0)/iv.length):null;g.ultEnv=e[e.length-1]||null;});
  return Object.values(G);}
function cardTolvas(){const T=tolvasArts();if(!T.length)return null;const h=hoy(),k=draft.tvP||"ano",y=h.slice(0,4);
  const P={mes:[h.slice(0,7)+"-01",h,"este mes"],ano:[y+"-01-01",h,"este año"],"12m":[sumaDias(h,-365),h,"12 meses"]}[k];const D=datosTolvas(P[0],P[1]);const ab=trepAbiertas();
  const tot=D.reduce((s,g)=>s+g.taller,0),gas=D.reduce((s,g)=>s+g.gasto,0),viejas=ab.filter(r=>dias(r.env,h)>30);
  return el("section",{class:"card"+(viejas.length?" alerta":"")},[el("div",{class:"hd"},[el("h2",{text:"Tolvas en reparación"}),el("span",{class:"der sub",text:tot?tot+" en el taller":"ninguna en el taller"})]),
    el("div",{class:"bd",style:"display:grid;gap:10px"},[
      el("dl",{class:"kpis num"},D.map(g=>[g.a.desc.replace(/^Tolva\s*/i,"").replace(/^de\s+/i,""),String(g.taller)]).concat([["Gasto "+P[2],eur(gas)]]).map(([a,b])=>el("div",{},[el("dt",{text:cap(a)+(a.startsWith("Gasto")?"":" en el taller")}),el("dd",{text:b})]))),
      viejas.length?el("div",{class:"banner w",text:viejas.length+(viejas.length===1?" envío lleva":" envíos llevan")+" más de 30 días en el taller: "+viejas.map(r=>(+r.cant-trepVuelta(r))+" "+(art(r.art)||{desc:"?"}).desc.toLowerCase()+" desde el "+fmtF(r.env)).join(", ")+"."}):null,
      ab.length?el("div",{class:"lst"},ab.sort((a,b)=>a.env.localeCompare(b.env)).map(r=>{const a=art(r.art),f=(+r.cant||0)-trepVuelta(r),d=dias(r.env,h);
        return el("div",{class:"it",style:"cursor:default"},[el("span",{class:"stripe "+(d>30?"bad":d>15?"warn":"ok")}),el("div",{class:"ppal"},[el("div",{class:"t1",text:(a?a.desc:"?")+" × "+f}),el("div",{class:"t2",text:"Enviadas el "+fmtF(r.env)+" · hace "+d+" días"+(r.prov?" · "+provN(r.prov):"")+(r.alb?" · alb. "+r.alb:"")})]),
          el("button",{type:"button",class:"btn sec peq",text:"Han vuelto",onclick:()=>formVueltaTolvas(r)})]);})):null,
      el("div",{class:"acciones"},[el("button",{type:"button",class:"btn",text:"Enviar a reparar",onclick:formEnviarTolvas})]),
      el("div",{class:"seg",role:"group","aria-label":"Periodo"},[["mes","Este mes"],["ano","Este año"],["12m","12 meses"]].map(([kk,t])=>el("button",{type:"button","aria-pressed":String(k===kk),text:t,onclick:()=>{draft.tvP=kk;render(true);}}))),
      cTabla(["","Reparadas","Gasto","Cambios en máquinas","Se envían cada"],D.map(g=>[g.a.desc,fmtN(g.rep),eur(g.gasto),fmtN(g.cambios),g.cada!=null?g.cada+" días":"—"]),[1,2,3,4]),
      (()=>{const M={};D.forEach(g=>Object.entries(g.maq).forEach(([m,n])=>{M[m]=(M[m]||0)+n;}));const L=Object.entries(M).sort((a,b)=>b[1]-a[1]).slice(0,8);
        return L.length?el("p",{class:"sub",style:"margin:0",text:"Máquinas que más tolvas han cambiado ("+P[2]+"): "+L.map(([m,n])=>m+" "+n).join(" · ")}):null;})(),
      T.some(a=>!precioDe(a))?el("div",{class:"banner w",text:"Pon en la ficha de cada tolva el precio de reparación: es lo que suma al gasto del horno cada vez que se cambia una en una máquina (y el gasto de la reparación si el albarán no trae importe)."}):null,
      el("p",{class:"hint",style:"margin:0",text:"Cambiar una tolva en una máquina: «Apuntar» un consumo de la tolva con esa máquina. Suma al gasto del horno de la máquina al precio de reparación."})])]);}

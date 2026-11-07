/* ===== CONSTRUCTOR DE REGLAS (común a Almacén y Coladas) =====
   Una regla se monta como una frase: [qué miro] · [de qué] · [cuándo] · [más de / menos de] · [número] · [aviso o urgente].
   Cada app pone sus «cosas que mirar» (M) y sus filtros (F); aquí está la pantalla, la ventana para crearlas y la cuenta.
   Regla: {id, m, f:{filtro:valor}, p:periodo, op:">"|"<"|">="|"=", n, niv:"warn"|"bad"|"info", activa}
   M[k] = {g:grupo, e:"nombre en la lista", s:"sujeto de la frase", t:"etiqueta corta del aviso", u:"unidad", pl:plural,
           f:[filtros], per:[periodos] (sin per = «ahora»), req:[filtros obligatorios], cada:" de cualquier máquina", cadaF:"maq",
           op, def, calc(f,{p,d0,d1,hoy}) → [{nom, v, det, btn, fn}] }
   F[k] = {e:"Etiqueta", todos:"Cualquiera", opts:()=>[[valor,texto,grupo?]], txt:v=>" de la máquina X"} */
(function(){
const PER={ahora:["Ahora mismo",""],hoy:["Hoy"," hoy"],"7d":["Últimos 7 días"," en los últimos 7 días"],"30d":["Últimos 30 días"," en los últimos 30 días"],
  mes:["Este mes"," este mes"],mesant:["El mes pasado"," el mes pasado"]};
const OPS={">":["más de",(v,n)=>v>n],"<":["menos de",(v,n)=>v<n],">=":["al menos",(v,n)=>v>=n],"=":["exactamente",(v,n)=>Math.abs(v-n)<1e-9]};
const NIV=[["warn","Aviso"],["bad","Urgente"],["info","Solo informar"]];
const p2=n=>String(n).padStart(2,"0");
const iso=d=>d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate());
function rango(p,h){const d=new Date(h+"T12:00:00"),menos=n=>{const x=new Date(d);x.setDate(x.getDate()-n);return iso(x);};
  if(p==="hoy")return[h,h];if(p==="7d")return[menos(6),h];if(p==="30d")return[menos(29),h];if(p==="mes")return[h.slice(0,7)+"-01",h];
  if(p==="mesant")return[iso(new Date(d.getFullYear(),d.getMonth()-1,1,12)),iso(new Date(d.getFullYear(),d.getMonth(),0,12))];
  return[null,h];}
function E(tag,a,kids){const n=document.createElement(tag);
  if(a)for(const k in a){const v=a[k];if(v==null||v===false)continue;if(k==="text")n.textContent=v;else if(k==="class")n.className=v;
    else if(k.slice(0,2)==="on")n.addEventListener(k.slice(2),v);else if(k==="value")n.value=v;else n.setAttribute(k,v===true?"":v);}
  (kids==null?[]:[].concat(kids)).forEach(c=>{if(c==null||c===false)return;n.appendChild(typeof c==="string"||typeof c==="number"?document.createTextNode(String(c)):c);});return n;}
const fmt=v=>(Math.round((+v||0)*10)/10).toLocaleString("es-ES");
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):"";
const nid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function selE(id,opts,val,on,vacio){const s=E("select",{id,class:"rgx-sel",onchange:e=>on(e.target.value)});
  if(vacio!=null)s.appendChild(E("option",{value:"",text:vacio}));const G={};
  opts.forEach(o=>{const op=E("option",{value:o[0],text:o[1]});if(o[2]){if(!G[o[2]]){G[o[2]]=E("optgroup",{label:o[2]});s.appendChild(G[o[2]]);}G[o[2]].appendChild(op);}else s.appendChild(op);});
  s.value=val==null?"":val;if(s.value!==String(val==null?"":val))s.value="";return s;}
const campo=(t,c)=>E("label",{class:"rgx-campo"},[E("span",{class:"rgx-et",text:t}),c]);

window.Reglas=function(o){
  const M=o.M,F=o.F||{},hoy=o.hoy||(()=>iso(new Date())),toast=o.toast||(()=>{}),puede=()=>o.puede?!!o.puede():true;
  const lista=()=>(o.leer()||[]).filter(r=>r&&M[r.m]);
  const perDe=m=>{const x=M[m];return x&&x.per&&x.per.length?x.per:["ahora"];};
  const pOk=(m,p)=>{const L=perDe(m);return L.includes(p)?p:L[0];};
  const uDe=(x,r)=>typeof x.u==="function"?x.u(r.f||{}):(x.u||"");
  function frase(r){const x=M[r.m];if(!x)return"(regla de un tipo que ya no existe)";const f=r.f||{};let s=x.s;
    (x.f||[]).forEach(k=>{if(f[k]&&F[k])s+=F[k].txt(f[k]);});
    if(x.cada&&!f[x.cadaF])s+=x.cada;
    s+=PER[pOk(r.m,r.p)][1];const u=uDe(x,r);
    return"Avisar si "+s+(x.pl?" son ":" es ")+(OPS[r.op]||OPS[">"])[0]+" "+fmt(r.n)+(u?" "+u:"");}
  function cuenta(r){const x=M[r.m];if(!x)return[];const p=pOk(r.m,r.p),R=rango(p,hoy());let L=[];
    try{L=x.calc(r.f||{},{p,d0:R[0],d1:R[1],hoy:hoy()})||[];}catch(e){L=[];}
    const t=OPS[r.op]||OPS[">"],n=+r.n||0;return L.filter(it=>it&&isFinite(it.v)&&t[1](+it.v,n));}
  function aviso(r,it){const x=M[r.m],u=uDe(x,r);
    return{r,niv:r.niv||"warn",txt:(it.nom?cap(it.nom)+" — "+x.t:cap(x.t))+": "+fmt(it.v)+(u?" "+u:""),
      det:[it.det,"regla: "+(OPS[r.op]||OPS[">"])[0]+" "+fmt(r.n)+(u?" "+u:"")].filter(Boolean).join(" · "),btn:it.btn||"Ver",fn:it.fn||null};}
  function evaluar(){const out=[];lista().filter(r=>r.activa!==false).forEach(r=>cuenta(r).forEach(it=>out.push(aviso(r,it))));return out;}
  async function guarda(L,msg){try{await o.guardar(L);}catch(e){toast("No se pudo guardar la regla");return false;}if(msg)toast(msg);if(o.alCambiar)o.alCambiar();return true;}
  /* pantalla con las reglas y lo que salta */
  function pantalla(){const L=lista(),S=evaluar(),ed=puede(),box=E("div",{class:"rgx"});
    const fila=r=>{const n=S.filter(x=>x.r.id===r.id).length,off=r.activa===false,x=M[r.m];
      let quitar=0;const bq=E("button",{type:"button",class:"btn sec peq",text:"Quitar",onclick:async()=>{
        if(!quitar){quitar=1;bq.textContent="¿Seguro? Toca otra vez";setTimeout(()=>{quitar=0;bq.textContent="Quitar";},3500);return;}
        await guarda((o.leer()||[]).filter(z=>z.id!==r.id),"Regla quitada");}});
      return E("div",{class:"rgx-it"+(off?" off":"")},[E("span",{class:"rgx-st "+(off?"":n?(r.niv||"warn"):"ok")}),
        E("div",{class:"rgx-tx"},[E("div",{class:"rgx-t1",text:frase(r)}),
          E("div",{class:"rgx-t2",text:x.g+" · "+(NIV.find(z=>z[0]===(r.niv||"warn"))||NIV[0])[1].toLowerCase()+" · "+(off?"apagada":n?"salta ahora: "+n+(n===1?" aviso":" avisos"):"ahora no salta")})]),
        ed?E("div",{class:"rgx-acc"},[E("button",{type:"button",class:"btn sec peq",text:off?"Encender":"Apagar",onclick:()=>guarda((o.leer()||[]).map(z=>z.id===r.id?Object.assign({},z,{activa:off}):z))}),
          E("button",{type:"button",class:"btn sec peq",text:"Cambiar",onclick:()=>editar(r)}),
          E("button",{type:"button",class:"btn sec peq",text:"Copiar",onclick:()=>editar(Object.assign({},r,{id:null}))}),bq]):null]);};
    const una=!!o.titulo,cuantas=E("span",{class:"rgx-der",text:L.length?L.length+(L.length===1?" regla":" reglas"):"ninguna todavía"});
    const c1=E("section",{class:"card"},[E("div",{class:"hd"},[E("h2",{text:o.titulo||"Tus reglas"}),cuantas]),
      L.length?E("div",{class:"rgx-lst"},L.map(fila)):E("div",{class:"bd"},E("p",{class:"hint",text:"Monta una regla como una frase (qué miro, de qué, cuándo y a partir de cuánto) y la app te avisará sola cuando se cumpla."})),
      ed?E("div",{class:"bd rgx-bot"},[E("button",{type:"button",class:"btn",text:"+ Nueva regla",onclick:()=>editar(null)})]):null]);
    box.appendChild(c1);
    if(S.length){const lst=E("div",{class:"rgx-lst"},S.map(a=>E("div",{class:"rgx-it"},[E("span",{class:"rgx-st "+a.niv}),E("div",{class:"rgx-tx"},[E("div",{class:"rgx-t1",text:a.txt}),E("div",{class:"rgx-t2",text:a.det})]),
        a.fn?E("button",{type:"button",class:"btn peq",text:a.btn,onclick:a.fn}):null])));
      if(una)c1.appendChild(E("div",{class:"rgx-sub"},[E("h3",{text:"Lo que salta ahora ("+S.length+")"}),lst]));
      else box.appendChild(E("section",{class:"card"},[E("div",{class:"hd"},E("h2",{text:"Lo que salta ahora ("+S.length+")"})),lst]));}
    if(o.pie)(una?c1:box).appendChild(E("p",{class:"hint rgx-pie",text:o.pie}));
    return una?c1:box;}
  /* ventana para crear o cambiar una regla */
  function editar(r0){const nuevo=!r0||!r0.id;const k0=Object.keys(M)[0];
    const r=Object.assign({id:nid(),m:k0,f:{},op:M[k0].op||">",n:M[k0].def!=null?M[k0].def:1,niv:"warn",activa:true},r0||{});if(!r.id)r.id=nid();r.f=Object.assign({},r.f||{});r.p=pOk(r.m,r.p);
    const cuerpo=E("div",{class:"rgx-form"}),prev=E("div",{class:"rgx-prev"});
    const pon=m=>{const x=M[m];r.m=m;const ok=x.f||[];Object.keys(r.f).forEach(k=>{if(!ok.includes(k))delete r.f[k];});r.p=pOk(m,r.p);r.op=x.op||">";r.n=x.def!=null?x.def:1;};
    const pinta=()=>{cuerpo.textContent="";const x=M[r.m];
      if(nuevo&&o.ejemplos&&o.ejemplos.length)cuerpo.appendChild(campo("Empezar desde un ejemplo (opcional)",selE("rgxEj",o.ejemplos.map((e,i)=>[String(i),e.nom]),"",v=>{if(v==="")return;const e=o.ejemplos[+v];
        Object.assign(r,{m:e.r.m,f:Object.assign({},e.r.f||{}),p:e.r.p,op:e.r.op||M[e.r.m].op||">",n:e.r.n,niv:e.r.niv||"warn"});r.p=pOk(r.m,r.p);pinta();},"Elige un ejemplo…")));
      cuerpo.appendChild(campo("1 · Qué miro",selE("rgxM",Object.keys(M).map(k=>[k,M[k].e,M[k].g]),r.m,v=>{pon(v);pinta();})));
      if(x.d)cuerpo.appendChild(E("p",{class:"hint rgx-d",text:x.d}));
      const fs=x.f||[];if(fs.length){const g=E("div",{class:"rgx-fila"});fs.forEach(k=>{const fd=F[k];if(!fd)return;const req=(x.req||[]).includes(k);
        g.appendChild(campo((fs.indexOf(k)===0?"2 · ":"")+fd.e+(req?"":" (opcional)"),selE("rgxF_"+k,fd.opts(),r.f[k]||"",v=>{if(v)r.f[k]=v;else delete r.f[k];pintaPrev();},req?"Elige…":(fd.todos||"Cualquiera"))));});cuerpo.appendChild(g);}
      const ps=perDe(r.m);
      if(ps.length>1)cuerpo.appendChild(campo("3 · Cuándo",selE("rgxP",ps.map(p=>[p,PER[p][0]]),r.p,v=>{r.p=v;pintaPrev();})));
      const nIn=E("input",{id:"rgxN",type:"text",inputmode:"decimal",class:"rgx-num",value:String(r.n==null?"":r.n).replace(".",","),oninput:e=>{const v=parseFloat(String(e.target.value).replace(/\./g,"").replace(",","."));r.n=isFinite(v)?v:NaN;pintaPrev();}});
      cuerpo.appendChild(campo("4 · Avisar si es",E("div",{class:"rgx-cond"},[selE("rgxOp",Object.keys(OPS).map(k=>[k,OPS[k][0]]),r.op||">",v=>{r.op=v;pintaPrev();}),nIn,E("span",{class:"rgx-u",text:uDe(x,r)})])));
      cuerpo.appendChild(campo("5 · Cómo aviso",E("div",{class:"rgx-niv",role:"group"},NIV.map(([k,t])=>E("button",{type:"button",class:"rgx-nb "+k,"aria-pressed":String((r.niv||"warn")===k),text:t,onclick:()=>{r.niv=k;pinta();}})))));
      cuerpo.appendChild(prev);pintaPrev();};
    const pintaPrev=()=>{prev.textContent="";const x=M[r.m];const fal=(x.req||[]).filter(k=>!r.f[k]);
      prev.appendChild(E("div",{class:"rgx-fr"},["Quedará así: «",E("b",{text:frase(r)}),"»"]));
      if(fal.length){prev.appendChild(E("div",{class:"rgx-n0",text:"Falta elegir: "+fal.map(k=>F[k].e.toLowerCase()).join(", ")}));return;}
      if(!isFinite(r.n)){prev.appendChild(E("div",{class:"rgx-n0",text:"Pon un número"}));return;}
      const L=cuenta(r);prev.appendChild(E("div",{class:L.length?"rgx-n1":"rgx-n0",text:L.length?"Ahora mismo saltaría "+L.length+(L.length===1?" vez:":" veces:"):"Ahora mismo no saltaría."}));
      if(L.length){const u=uDe(x,r);prev.appendChild(E("ul",{class:"rgx-ej"},L.slice(0,4).map(it=>E("li",{text:(it.nom?cap(it.nom)+": ":"")+fmt(it.v)+(u?" "+u:"")}))));if(L.length>4)prev.appendChild(E("div",{class:"rgx-n0",text:"y "+(L.length-4)+" más"}));}};
    let ov;const cerrar=()=>{ov.remove();document.removeEventListener("keydown",esc);};const esc=e=>{if(e.key==="Escape")cerrar();};
    const bG=E("button",{type:"button",class:"btn",text:"Guardar",onclick:async()=>{const x=M[r.m];const fal=(x.req||[]).filter(k=>!r.f[k]);
      if(fal.length){toast("Elige "+F[fal[0]].e.toLowerCase());return;}if(!isFinite(r.n)){toast("Pon un número");return;}
      const out={id:r.id,m:r.m,f:r.f,p:r.p,op:r.op||">",n:r.n,niv:r.niv||"warn",activa:r.activa!==false};
      bG.disabled=true;const ok=await guarda((o.leer()||[]).filter(z=>z.id!==r.id).concat([out]),"Regla guardada");bG.disabled=false;if(ok)cerrar();}});
    ov=E("div",{class:"dlg-ov rgx-ov",onclick:e=>{if(e.target===ov)cerrar();}},[E("div",{class:"dlg rgx-dlg",role:"dialog","aria-modal":"true","aria-label":nuevo?"Nueva regla":"Cambiar regla"},[
      E("h3",{class:"rgx-h",text:nuevo?"Nueva regla":"Cambiar regla"}),cuerpo,
      E("div",{class:"rgx-pieb"},[E("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:()=>cerrar()}),bG])])]);
    pinta();document.body.appendChild(ov);document.addEventListener("keydown",esc);}
  return{evaluar,pantalla,editar,frase,lista,cuenta};};
window.Reglas.rango=rango;
})();

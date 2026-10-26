/* ===== EJE PUESTO EN CADA MÁQUINA y corrección manual de dónde está un eje ===== */
const ejeEnMaq=cod=>ejes.find(e=>e.maq===cod&&e.estado==="planta");
const maqsDeEje=e=>{const m=modelo(e.mod);return m?[...new Set([].concat(...grupoEje(m).map(inyDe)))].sort((a,b)=>a.localeCompare(b,"es",{numeric:true})):[];};
async function ponerEnMaq(e,cod,f){f=f||hoy();
  for(const o of ejes.filter(z=>z.maq===cod&&z.id!==e.id)){await updEje(o,{maq:null});o.maq=null;}
  if(estR(e)!=="planta")await cambiarEstadoEje(e,"planta",f,{maq:cod,maqF:f});else{await updEje(e,{maq:cod,maqF:f});Object.assign(e,{maq:cod,maqF:f});}}
async function quitarDeMaq(e){if(!e.maq)return;await updEje(e,{maq:null});e.maq=null;}
function elegirMaq(e,despues){const sug=maqsDeEje(e);const x={otra:""};
  const btn=(cod)=>{const ya=ejeEnMaq(cod);return el("button",{type:"button",class:"btn "+(e.maq===cod?"":"sec")+" peq",text:cod+(ya&&ya.id!==e.id?" (ahora "+ya.cod+")":""),onclick:async()=>{cerrarDlgs();await ponerEnMaq(e,cod);toast(e.cod+" puesto en "+cod+(ya&&ya.id!==e.id?" · "+ya.cod+" queda de repuesto":""));if(despues)despues();}});};
  dlg("¿Dónde está puesto "+e.cod+"?",[sug.length?el("div",{},[el("div",{class:"sub",style:"margin-bottom:6px",text:"Máquinas que llevan este modelo"}),el("div",{style:"display:flex;gap:6px;flex-wrap:wrap"},sug.map(btn))]):el("p",{class:"hint",text:"Ninguna máquina tiene este modelo en su ficha."}),
    fld("Otra máquina",sel("emOtra",maqOpts().map(([id,t])=>[maqN(id),t]),"",v=>x.otra=v,"Elige…")),
    el("p",{class:"hint",text:"Si en esa máquina había otro eje apuntado, ese pasa a ser repuesto."})],
    [{t:"Es repuesto (no está puesto)",cls:"sec",fn:async()=>{await quitarDeMaq(e);toast(e.cod+" de repuesto");if(despues)despues();}},{t:"Cancelar",cls:"sec"},
     {t:"Guardar",fn:async()=>{if(!x.otra){toast("Elige una máquina");return false;}await ponerEnMaq(e,x.otra);toast(e.cod+" puesto en "+x.otra);if(despues)despues();}}]);}
function elegirEjeMaq(m,despues){const ms=modsMaq(m.cod);const cs=new Set();ms.forEach(x=>grupoEje(x).forEach(g=>cs.add(g.cod)));
  const lista=ejes.filter(e=>cs.has(e.mod)&&e.estado!=="baja").sort(porCod);const ya=ejeEnMaq(m.cod);
  dlg("Eje puesto en la "+m.cod,[lista.length?el("div",{style:"display:flex;gap:6px;flex-wrap:wrap"},lista.map(e=>el("button",{type:"button",class:"btn "+(ya&&ya.id===e.id?"":"sec")+" peq",
      text:e.cod+(e.estado!=="planta"?" ("+(EST_E[e.estado]||[e.estado])[0].toLowerCase()+")":e.maq&&e.maq!==m.cod?" (en "+e.maq+")":""),onclick:async()=>{cerrarDlgs();await ponerEnMaq(e,m.cod);toast(e.cod+" puesto en "+m.cod);if(despues)despues();}}))):el("p",{class:"hint",text:"No hay ejes del modelo de esta máquina."}),
    el("p",{class:"hint",text:"Si eliges uno que la app tenía en el taller, pasa a planta. El que estuviera puesto antes queda de repuesto."})],
    [ya?{t:"No sé cuál lleva",cls:"sec",fn:async()=>{await quitarDeMaq(ya);toast("Quitado");if(despues)despues();}}:null,{t:"Cerrar",cls:"sec"}].filter(Boolean));}
function corregirEstado(e,despues){const x={nu:estR(e),f:hoy()};const ops=[["planta","En planta"],["preparado","Preparado"],["reparacion","En taller"]];
  const seg=el("div",{class:"seg",role:"group","aria-label":"Dónde está"},ops.map(([k,t])=>{const b=el("button",{type:"button","aria-pressed":String(x.nu===k),text:t});b.onclick=()=>{x.nu=k;seg.querySelectorAll("button").forEach(z=>z.setAttribute("aria-pressed",String(z===b)));};return b;}));
  dlg("Mover "+e.cod,[el("p",{class:"sub",text:"Ahora la app lo tiene «"+(EST_E[e.estado]||[e.estado])[0]+"»"+(e.maq?" (puesto en "+e.maq+")":"")+". Marca dónde está de verdad."}),seg,fld("Fecha",inp("ceF",x.f,v=>x.f=v,{type:"date"})),
    el("p",{class:"hint",text:"Para corregir errores o movimientos que no se apuntaron. Las reparaciones abiertas se cierran o se anulan solas."})],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{if(x.nu===estR(e)){toast("No cambia nada");return false;}try{await cambiarEstadoEje(e,x.nu,x.f||hoy(),{cont:x.f||hoy()});}catch(er){toast("No se pudo guardar");return false;}
      toast(e.cod+" → "+ops.find(o=>o[0]===x.nu)[1]);if(despues)despues();}}]);}

/* ===== CATÁLOGO ===== */
function vCat(v){
  const aj=cat.ajustes||{};
  {const I=(cat.ideas||[]).slice().reverse();if(I.length)v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Ideas para la app ("+(n=>n+(n===1?" pendiente":" pendientes"))(I.filter(x=>!x.hecha).length)+")"})]),
    el("div",{class:"lst"},I.map(x=>el("label",{class:"it",style:"cursor:pointer;gap:10px"},[el("input",{type:"checkbox",checked:!!x.hecha,style:"width:22px;height:22px;flex:none","aria-label":"Hecha",onchange:async e=>{x.hecha=e.target.checked?hoy():false;await saveCat();render(true);}}),
      el("div",{class:"ppal"},[el("div",{class:"t1",text:x.txt}),el("div",{class:"t2",text:[(SECC[x.secc]||{}).nom,fmtF(x.f),x.por,x.hecha?"hecha el "+fmtF(x.hecha):null].filter(Boolean).join(" · ")})])]))),
    el("p",{class:"hint",style:"padding:8px 14px 12px",text:"Se apuntan desde «Más cosas» en cada pieza. Márcalas cuando estén hechas."})]));}
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Copia de seguridad"})]),el("div",{class:"bd frm",style:"gap:10px"},[
    el("p",{class:"hint",text:"Descarga todo (stock, movimientos, cambios de pistón, ejes, reparaciones y catálogo) en un Excel. Hazlo una vez a la semana (además, cada noche se guarda una copia sola en tu Google Drive)."}),
    downloads?el("button",{type:"button",class:"btn",text:"Descargar copia en Excel",onclick:e=>exportarExcel(e.currentTarget)}):el("p",{class:"hint",text:"Esta vista no permite descargar archivos. "})])]));
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Pedidos"}),el("button",{type:"button",class:"btn sec peq der",text:"Editar",onclick:formAjustes})]),
    el("div",{class:"bd"},el("dl",{class:"kpis"},[el("div",{},[el("dt",{text:"Responsable de pedidos"}),el("dd",{style:"font-size:15px",text:aj.resp||"—"})]),el("div",{},[el("dt",{text:"Correo"}),el("dd",{style:"font-size:15px;overflow-wrap:anywhere",text:aj.email||"—"})])]))]));
  {const D=destPist();v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Informe de pistones"}),el("button",{type:"button",class:"btn sec peq der",text:"Editar",onclick:()=>formDestPist()})]),
    el("div",{class:"bd"},el("dl",{class:"kpis"},[el("div",{},[el("dt",{text:"Se envía a"}),el("dd",{style:"font-size:15px",text:D.nom})]),el("div",{},[el("dt",{text:"Correo"}),el("dd",{style:"font-size:15px;overflow-wrap:anywhere",text:D.email||"—"})])]))]));}
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Informes de consumo por persona"}),el("button",{type:"button",class:"btn sec peq der",text:"Qué lleva cada uno",onclick:formInfArts})]),
    el("div",{class:"bd"},[el("p",{class:"hint",text:PERS_INF.map(p=>p.nom+": "+artsDe(p.k).length+" productos").join(" · ")+". Los pistones van en su informe de pistones."}),el("div",{class:"acciones"},PERS_INF.map(p=>el("button",{type:"button",class:"btn sec",text:"Informe para "+p.nom,onclick:()=>informePersona(p.k)})))])]));
  const sec=(tit,items,add)=>el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:tit+" ("+items.length+")"}),el("button",{type:"button",class:"btn sec peq der",text:"Añadir",onclick:add})]),
    items.length?el("div",{class:"lst"},items):el("div",{class:"empty",text:"Vacío."})]);
  const arts=cat.articulos.slice().sort((a,b)=>(a.activo===false)-(b.activo===false)||a.fam.localeCompare(b.fam)||a.desc.localeCompare(b.desc,"es",{numeric:true}));
  const fi=el("input",{type:"file",id:"impFile",accept:".xlsx,.xls,.csv",style:"font-size:14px"});fi.addEventListener("change",()=>{const f=fi.files[0];fi.value="";if(f)importarExcel(f);});
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Importar artículos desde Excel"})),el("div",{class:"bd frm",style:"gap:10px"},[
    el("p",{class:"hint",text:"Para dar de alta muchos consumibles de golpe: descarga la plantilla, rellénala en el ordenador (una fila por artículo y almacén) y súbela aquí. Antes de guardar verás un resumen."}),
    downloads?el("button",{type:"button",class:"btn sec",text:"Descargar plantilla",onclick:e=>descargarPlantilla(e.currentTarget)}):null,fld("Subir Excel relleno",fi)])]));
  v.appendChild(sec("Artículos",arts.map(a=>el("button",{type:"button",class:"it",onclick:()=>formArticulo(a)},[el("div",{class:"ppal"},[el("div",{class:"t1",text:a.desc}),
    el("div",{class:"t2",text:[FAM[a.fam],a.cod,"mín "+fmtN(+a.min||0),+a.pp>0?"pedido "+fmtN(+a.pp):null,provN(a.prov)].filter(Boolean).join(" · ")})]),a.activo===false?el("span",{class:"pill na",text:"Inactivo"}):el("span",{class:"sub",text:a.ud})])),()=>formArticulo()));
  v.appendChild(sec("Modelos de eje",(cat.modelos||[]).slice().sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true})).map(m=>el("button",{type:"button",class:"it",onclick:()=>fichaModelo(m)},[el("div",{class:"ppal"},[el("div",{class:"t1",text:m.ref}),el("div",{class:"t2",text:[m.cod,m.long,m.iny,m.rosca?"rosca "+m.rosca:null,"mín "+(m.min||0)].filter(Boolean).join(" · ")})])])),()=>formSimple("modelos")));
  v.appendChild(sec("Inyectoras",cat.maquinas.slice().sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true})).map(m=>el("button",{type:"button",class:"it",onclick:()=>fichaIny(m)},[el("div",{class:"ppal"},[el("div",{class:"t1",text:m.cod}),el("div",{class:"t2",text:[m.nave].concat(lineasFicha(m).map(l=>l.txt)).filter(Boolean).join(" · ")||"Ficha sin rellenar"})])])),()=>formMaquina()));
  {const fi=el("input",{type:"file",accept:".xlsx,.xls,.csv",style:"font-size:14px"});fi.addEventListener("change",()=>{const f=fi.files[0];fi.value="";if(f)importarMaquinas(f);});
   v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Ficha de inyectoras"})),el("div",{class:"bd frm",style:"gap:10px"},[
     el("p",{class:"hint",text:"Tú decides qué campos tiene la ficha (canaleta, cazo, horno…) y qué opciones hay en cada uno. Luego en cada inyectora solo tocas lo que monta."}),
     el("button",{type:"button",class:"btn",text:"Configurar campos y opciones",onclick:formPlantilla}),
     el("p",{class:"hint",text:"Para rellenar todas de golpe: descarga el Excel, rellénalo en el ordenador y súbelo. Si añades una columna nueva (un consumible nuevo), se crea sola como campo de la ficha."}),
     downloads?el("button",{type:"button",class:"btn sec",text:"Descargar fichas en Excel",onclick:e=>excelMaquinas(e.currentTarget)}):null,fld("Subir Excel relleno",fi)])]));}
  v.appendChild(sec("Operarios",(cat.operarios||[]).map(o=>el("button",{type:"button",class:"it",onclick:()=>formSimple("operarios",o)},[el("div",{class:"ppal"},[el("div",{class:"t1",text:o.nom||"(sin nombre)"}),el("div",{class:"t2",text:o.num?"Nº "+o.num:"Sin nº"})])])),()=>formSimple("operarios")));
  v.appendChild(sec("Almacenes",cat.almacenes.map(l=>el("button",{type:"button",class:"it",onclick:()=>formSimple("almacenes",l)},[el("div",{class:"ppal"},[el("div",{class:"t1",text:l.nom}),el("div",{class:"t2",text:[l.tipo==="produccion"?"Producción (se repone)":l.tipo==="central"?"Central":null,l.nave,l.notas].filter(Boolean).join(" · ")})])])),()=>formSimple("almacenes")));
  v.appendChild(sec("Proveedores",cat.proveedores.slice().sort((a,b)=>a.nom.localeCompare(b.nom)).map(p=>el("button",{type:"button",class:"it",onclick:()=>formSimple("proveedores",p)},[el("div",{class:"ppal"},[el("div",{class:"t1",text:p.nom}),el("div",{class:"t2",text:[p.sum,p.contacto,p.tel,p.email,p.plazo?"plazo "+p.plazo+" días":null].filter(Boolean).join(" · ")})])])),()=>formSimple("proveedores")));}
const ENVASES=["Bidón","GRG","Saca","Caja","Saco"];
const envTxt=a=>a.peso>0?(a.envase||"Envase")+" de "+fmtN(a.peso)+" kg":(a.envase||null);
function formArticulo(a,pre){const x=a?JSON.parse(JSON.stringify(a)):Object.assign({fam:"consumible",ud:"ud",desc:"",cod:"",min:"",pp:"",cant:"",prov:"",diam:"",activo:true},pre||{});if(!a&&!x.cod&&PREF_BT[x.fam]){x.cod=sigCodBT(x.fam);if(!x.desc)x.desc="Barra expulsora "+x.cod;}
  const diamF=fld("Diámetro",sel("aDiam",DIAM.map(z=>[z,z]),x.diam,v=>x.diam=v,"—"),x.fam!=="piston");
  const iy=new Set(x.iny||[]);
  const tecF=el("div",{class:"frm",style:"gap:10px"},[el("div",{class:"row"},[fld("Nº de plano / revisión",inp("aPlano",x.plano,v=>x.plano=v,{autocomplete:"off"})),fld("Medidas / notas técnicas",inp("aNotas",x.notas,v=>x.notas=v,{autocomplete:"off"}))]),fld("Cuántas lleva cada máquina",inp("aPorMaq",x.porMaq!=null?x.porMaq:(x.fam==="barra"?4:""),v=>x.porMaq=v,{inputmode:"numeric",class:"num",placeholder:"p. ej. 4"})),
    el("fieldset",{style:"border:1px solid var(--line);border-radius:8px;padding:8px 12px;margin:0"},[el("legend",{class:"sub",text:"Inyectoras donde va"}),
      el("div",{style:"display:flex;flex-wrap:wrap;gap:4px 14px"},cat.maquinas.slice().sort((p,q)=>p.cod.localeCompare(q.cod,"es",{numeric:true})).map(m=>el("label",{class:"chk",style:"font-size:14px"},[el("input",{type:"checkbox",checked:iy.has(m.id),onchange:e=>{e.target.checked?iy.add(m.id):iy.delete(m.id);}}),m.cod])))])]);
  tecF.hidden=!(TEC(x.fam)||x.fam==="horno");
  const usado=a&&todosMov().some(m=>m.art===a.id);
  const xs=new Set(a?almsDe(a).map(l=>l.id):[(origenRepo()||{}).id].filter(Boolean));
  const body=[fld("Descripción",inp("aDesc",x.desc,v=>x.desc=v,{autocomplete:"off"})),
    fld("Ubicación (estantería / balda)",inp("aUbic",x.ubic,v=>x.ubic=v,{autocomplete:"off",placeholder:"p. ej. Nave 1 · E3-B2"})),
    fld("Almacén principal (donde entra y desde donde se repone)",sel("aPpal",almOpts(),x.almPpal||(a?ppalDe(a):(origenRepo()||{}).id),v=>{x.almPpal=v;const cb=document.getElementById("aAl_"+v);if(cb&&!cb.checked){cb.checked=true;xs.add(v);}})),
    el("fieldset",{style:"border:1px solid var(--line);border-radius:8px;padding:8px 12px;margin:0"},[el("legend",{class:"sub",text:"Almacenes donde está"})].concat(cat.almacenes.map(l=>el("label",{class:"chk",style:"font-size:14px"},[el("input",{type:"checkbox",id:"aAl_"+l.id,checked:xs.has(l.id),onchange:e=>{e.target.checked?xs.add(l.id):xs.delete(l.id);}}),l.nom])))),
    el("div",{class:"row"},[fld("Código",inp("aCod",x.cod,v=>x.cod=v,{autocomplete:"off"})),fld("Familia",sel("aFam",Object.entries(FAM),x.fam,v=>{x.fam=v;diamF.hidden=v!=="piston";tecF.hidden=!(TEC(v)||v==="horno");if(!a&&!(x.cod||"").trim()&&PREF_BT[v]){x.cod=sigCodBT(v);const ci=document.getElementById("aCod");if(ci)ci.value=x.cod;}}))]),
    el("div",{class:"row"},[fld("Unidad",sel("aUd",UDS.map(u=>[u,u]),x.ud,v=>x.ud=v)),diamF]),tecF,
    fld("Grupo (para los informes y consultas)",sel("aGrupo",GRUPOS.map(g=>[g[0],g[1]]),x.grupo&&GRUPO_N[x.grupo]?x.grupo:"",v=>x.grupo=v,"Automático ("+GRUPO_N[grupoAuto(x)]+")")),
    el("div",{class:"row"},[fld("Envase",sel("aEnv",ENVASES.map(z=>[z,z]),x.envase,v=>x.envase=v,"—")),fld("Kg por envase",inp("aPeso",x.peso,v=>x.peso=v,{inputmode:"decimal",class:"num",placeholder:"p. ej. 200"}))]),
    fld("Precio (€ por "+(x.ud||"ud")+", opcional)",inp("aPrecio",x.precio,v=>x.precio=v,{inputmode:"decimal",class:"num",placeholder:"Para saber el gasto en euros"})),
    el("div",{class:"row"},[fld("Stock mínimo",inp("aMin",x.min,v=>x.min=v,{inputmode:"decimal",class:"num"})),fld("Punto de pedido",inp("aPp",x.pp,v=>x.pp=v,{inputmode:"decimal",class:"num"}))]),
    el("div",{class:"row"},[fld("Proveedor habitual",sel("aProv",provOpts(),x.prov,v=>x.prov=v,"—")),fld("Plazo de entrega (días)",inp("aPlazo",x.plazo,v=>x.plazo=v,{inputmode:"numeric",class:"num",placeholder:"Del proveedor"}))]),
    el("p",{class:"hint",text:"La app calcula sola cuándo y cuánto pedir con el consumo de los últimos 60 días y el plazo de entrega: avisa al llegar a mínimo + consumo durante el plazo, y pide lo que falta para eso. Ej.: mínimo 10, gasta 1 al día, plazo 5 días, hay 7 → pide 8. Si dejas el plazo vacío usa el del proveedor. El punto de pedido es opcional, para que avise antes."})];
  if(a)body.push(el("label",{class:"chk"},[el("input",{type:"checkbox",id:"aAct",checked:x.activo!==false,onchange:e=>x.activo=e.target.checked}),"Artículo activo"]));
  const acts=[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{
    if(!x.desc.trim()){toast("Pon una descripción");return false;}
    {const cc=(x.cod||"").trim().toUpperCase();const otro=cc&&cat.articulos.find(z=>z.id!==(a&&a.id)&&String(z.cod||"").trim().toUpperCase()===cc);if(otro){toast("El código "+cc+" ya está en uso: "+otro.desc);return false;}if(PREF_BT[x.fam]&&cc)x.cod=cc;}
    const num=k=>{const n=parseN(x[k]);return isFinite(n)&&n>=0?n:0;};
    const pp=x.almPpal||(a?ppalDe(a):(origenRepo()||{}).id)||null;if(pp)xs.add(pp);
    const nue={id:a?a.id:uid(),desc:x.desc.trim(),almPpal:pp,alms:Array.from(xs),ubic:(x.ubic||"").trim()||null,cod:(x.cod||"").trim()||null,fam:x.fam,ud:x.ud,diam:x.fam==="piston"?(x.diam||null):null,min:num("min"),pp:num("pp"),plazo:parseInt(x.plazo,10)>0?parseInt(x.plazo,10):null,prov:x.prov||null,activo:x.activo!==false};
    if(a&&a.pedido)nue.pedido=a.pedido;if(a&&a.docs)nue.docs=a.docs;nue.plano=(x.plano||"").trim()||null;{const pm=parseInt(x.porMaq!=null?x.porMaq:(x.fam==="barra"?4:""),10);nue.porMaq=(TEC(x.fam)||x.fam==="horno")&&pm>0?pm:null;}{const pr=parseN(x.precio);nue.precio=isFinite(pr)&&pr>0?pr:null;}{const pe=parseN(x.peso);nue.peso=isFinite(pe)&&pe>0?pe:null;nue.envase=x.envase||null;}nue.grupo=x.grupo&&GRUPO_N[x.grupo]?x.grupo:null;nue.notas=(x.notas||"").trim()||null;nue.iny=TEC(x.fam)||iy.size?Array.from(iy):[];if(a)Object.keys(a).forEach(k=>{if(!(k in nue))nue[k]=a[k];});
    if(nue.cod&&cat.articulos.some(z=>z.id!==nue.id&&z.cod&&z.cod.toLowerCase()===nue.cod.toLowerCase())){toast("Ya hay un artículo con ese código");return false;}
    const i=cat.articulos.findIndex(z=>z.id===nue.id);if(i>=0)cat.articulos[i]=nue;else cat.articulos.push(nue);
    try{await saveCat();toast("Artículo guardado");}catch(e){return false;}render(true);}}];
  if(a&&!usado)acts.splice(1,0,{t:"Borrar",cls:"txt",fn:()=>{setTimeout(()=>confirmar("¿Borrar "+a.desc+"?","No tiene movimientos, así que se elimina del catálogo.","Borrar",async()=>{cat.articulos=cat.articulos.filter(z=>z.id!==a.id);await saveCat();render(true);}),0);}});
  dlg(a?"Editar artículo":"Nuevo artículo",body,acts);}
const SIMPLE={maquinas:{tit:"inyectora",campos:[["cod","Código (p. ej. F53)"],["nave","Nave","nave"],["notas","Notas"]],clave:"cod"},
  modelos:{tit:"modelo de eje",campos:[["cod","Código de modelo (p. ej. 2.3.C)"],["ref","Referencia (p. ej. IDRA 700 L-640)"],["long","Longitud"],["iny","Inyectoras (p. ej. F54-63)"],["rosca","Rosca"],["diamP","Ø de pistón"],["plano","Nº de plano / revisión"],["min","Stock mínimo en planta"],["notas","Notas técnicas"]],clave:"cod"},
  operarios:{tit:"operario",campos:[["num","Nº de operario"],["nom","Nombre"]],clave:null},
  almacenes:{tit:"almacén",campos:[["nom","Nombre"],["tipo","Tipo","tipoAlm"],["nave","Nave (para los cambios de pistón)","nave"],["notas","Notas"]],clave:"nom"},
  proveedores:{tit:"proveedor",campos:[["nom","Nombre"],["sum","Qué suministra (p. ej. pistones, reparación de ejes)"],["cif","CIF"],["codCli","Nº de cliente / código de proveedor"],["contacto","Persona de contacto"],["tel","Teléfono"],["wa","WhatsApp (si es otro número)"],["email","Email"],["dir","Dirección"],["plazo","Plazo de entrega (días)"],["pedMin","Pedido mínimo"],["notas","Notas"]],clave:"nom"}};
function formSimple(col,obj){const S=SIMPLE[col],x=obj?Object.assign({},obj):{};cat[col]=cat[col]||[];
  const enUso=obj&&(col==="almacenes"?todosMov().some(m=>m.alm===obj.id||m.dest===obj.id):col==="maquinas"?(todosMov().some(m=>m.maq===obj.id)||todosPist().some(p=>p.maq===obj.id))
    :col==="modelos"?ejes.some(e=>e.mod===obj.cod):col==="operarios"?false:todosMov().some(m=>m.prov===obj.id)||cat.articulos.some(a=>a.prov===obj.id));
  const body=S.campos.map(([k,l,t])=>{if(t==="nave")return fld(l,sel("s_"+k,[["Nave 1","Nave 1"],["Nave 2","Nave 2"]],x[k],v=>x[k]=v,"—"));if(t==="tipoAlm")return fld(l,sel("s_"+k,[["central","Almacén central (desde aquí se repone)"],["produccion","Almacén de producción (se repone)"]],x[k],v=>x[k]=v,"—"));
    const i=inp("s_"+k,x[k]==null?"":x[k],v=>x[k]=v,{autocomplete:"off",type:k==="email"?"email":(k==="tel"||k==="wa")?"tel":"text",inputmode:(k==="min"||k==="num"||k==="plazo")?"numeric":null});if(enUso&&k===S.clave)i.disabled=true;return fld(l,i);});
  if(enUso&&S.clave)body.push(el("p",{class:"hint",text:"El código no se puede cambiar porque ya se usa."}));
  const acts=[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{
    const vals=S.campos.map(([k])=>String(x[k]==null?"":x[k]).trim());
    if(S.clave){const v=String(x[S.clave]||"").trim();if(!v){toast("Rellena "+S.campos[0][1].toLowerCase());return false;}
      if(cat[col].some(z=>z.id!==x.id&&String(z[S.clave]||"").toLowerCase()===v.toLowerCase())){toast("Ya existe");return false;}}
    else if(!vals.some(Boolean)){toast("Rellena algún dato");return false;}
    const nue=Object.assign({},obj||{},{id:obj?obj.id:uid()});S.campos.forEach(([k],i)=>{nue[k]=vals[i]||null;});if(col==="modelos")nue.min=parseInt(nue.min,10)||0;if(col==="proveedores")nue.plazo=parseInt(nue.plazo,10)||null;
    const i=cat[col].findIndex(z=>z.id===nue.id);if(i>=0)cat[col][i]=nue;else cat[col].push(nue);
    try{await saveCat();toast("Guardado");}catch(e){return false;}render(true);}}];
  if(obj&&!enUso)acts.splice(1,0,{t:"Borrar",cls:"txt",fn:async()=>{cat[col]=cat[col].filter(z=>z.id!==obj.id);await saveCat();toast("Borrado");render(true);}});
  dlg((obj?"Editar ":"Nuevo ")+S.tit,body,acts);}

/* ===== BUSCADOR ===== */
function albaranes(){const m={};todasRep().forEach(r=>{[r.alb].filter(Boolean).forEach(a=>{(m[a]=m[a]||{reps:[],movs:[]}).reps.push(r);});});todosMov().forEach(x=>{if(x.alb)(m[x.alb]=m[x.alb]||{reps:[],movs:[]}).movs.push(x);});return m;}
function fichaAlbaran(a,d){const fil=[];
  d.reps.sort((x,y)=>(x.rec||"").localeCompare(y.rec||"")).forEach(r=>{const e=ejes.find(z=>z.cod===r.eje);fil.push(el("button",{type:"button",class:"it",onclick:()=>{cerrarDlgs();if(e)fichaEje(e);}},[el("div",{class:"ppal"},[el("div",{class:"t1",text:"Eje "+r.eje+(e?" · "+ejeRef(e):"")}),el("div",{class:"t2",text:["Enviado "+fmtF(r.env),r.rec?"recibido "+fmtF(r.rec):null,r.desp].filter(Boolean).join(" · ")})]),el("span",{class:"pill "+(r.res==="ok"?"ok":"na"),text:r.res==="ok"?"OK":r.res?"Cerrada":"Abierta"})]));});
  d.movs.forEach(m=>{const x=art(m.art);fil.push(el("button",{type:"button",class:"it",onclick:()=>{cerrarDlgs();if(x)ficha(x);}},[el("div",{class:"ppal"},[el("div",{class:"t1",text:(x?x.desc:"Artículo")}),el("div",{class:"t2",text:[TIPOS[m.tipo],fmtF(m.f),provN(m.prov),almN(m.alm)].filter(Boolean).join(" · ")})]),el("b",{class:"num",text:signo(m)})]));});
  dlg("Albarán "+a,[el("p",{class:"sub",text:d.reps.length+" ejes · "+d.movs.length+" entradas de material"}),el("div",{class:"card"},el("div",{class:"lst"},fil))],[{t:"Cerrar",cls:"sec"}]);}
/* ===== INYECTORAS: plano de las naves, ficha completa, moldes y contenedores ===== */
let mlogAnos={};
function todosMlog(){const out=[];Object.keys(mlogAnos).forEach(k=>(mlogAnos[k]||[]).forEach(p=>out.push(p)));return out.sort((a,b)=>(a.f+"|"+a.ts).localeCompare(b.f+"|"+b.ts));}
async function addMlog(rec){rec.id=uid();rec.ts=Date.now();if(db.itemsAdd){await db.itemsAdd("mlog",rec.f.slice(0,4),[rec]);return;}const ref=db.doc("mlog/"+rec.f.slice(0,4)),sn=await ref.get();
  const items=sn.exists?(sn.data().items||[]).slice():[];items.push(rec);await ref.set({items});}
const moldes=()=>(cat.moldes||[]).slice().sort((a,b)=>String(a.cod).localeCompare(String(b.cod),"es",{numeric:true}));
const contens=()=>(cat.contens||[]).slice().sort((a,b)=>String(a.cod).localeCompare(String(b.cod),"es",{numeric:true}));
const moldeDe=id=>(cat.moldes||[]).find(x=>x.id===id);
const contDe=id=>(cat.contens||[]).find(x=>x.id===id);
const hoyDe=m=>m.hoy||{};
const moldeTxt=x=>x?x.cod+(x.pieza?" · "+x.pieza:""):"";
/* valor de un campo de la ficha (texto de la opción) */
function valFicha(m,cid){const c=plantilla().find(x=>x.id===cid);if(!c||!c.ops)return"";const v=valoresDe(m)[cid]||[];return v.map(id=>(c.ops.find(o=>o.id===id)||{}).t).filter(Boolean).join(", ");}
const zonaDe=m=>valFicha(m,"c-zona")||m.nave||"Sin zona";
const hornoTxt=m=>{const t=valFicha(m,"c-htipo"),mc=valFicha(m,"c-horno"),k=valFicha(m,"c-hmed");return[t==="Abierto"?"Abierto":mc||t||"",k].filter(Boolean).join(" ");};
/* parejas de operario (lo que pone «Comparte operario con») */
function gruposOperario(ms){const par={};ms.forEach(m=>{par[m.id]=m.id;});const raiz=x=>par[x]===x?x:(par[x]=raiz(par[x]));
  ms.forEach(m=>{valFicha(m,"c-oper").split(", ").filter(Boolean).forEach(c=>{const o=ms.find(z=>z.cod===c);if(o){const a=raiz(m.id),b=raiz(o.id);if(a!==b)par[a]=b;}});});
  const g={};ms.forEach(m=>{const r=raiz(m.id);(g[r]=g[r]||[]).push(m);});
  const num=m=>+String(m.cod).replace(/\D/g,"")||0;return Object.values(g).map(x=>x.sort((a,b)=>num(a)-num(b))).sort((a,b)=>num(a[0])-num(b[0]));}
/* todo lo que se puede buscar de una máquina */
function hayMaq(m){const h=hoyDe(m),mo=moldeDe(h.molde),co=contDe(h.cont);
  const arts=artsActivos().filter(a=>(a.iny||[]).includes(m.id));
  const mods=(cat.modelos||[]).filter(x=>inyDe(x).includes(m.cod));
  return[m.cod,zonaDe(m),m.nave,m.notas,diamDe(m),moldeTxt(mo),mo&&mo.diam,co&&co.cod].concat(resumenFicha(m),arts.map(a=>a.desc+" "+(a.cod||"")+" "+(a.grupo||"")),mods.map(x=>x.ref+" "+x.cod)).filter(Boolean).join(" ");}
function avisosMaq(m){const o=[];const mods=(cat.modelos||[]).filter(x=>inyDe(x).includes(m.cod));
  const bajos=artsActivos().filter(a=>(a.iny||[]).includes(m.id)&&nivel(a)==="bad");if(bajos.length)o.push(bajos.length+" pieza"+(bajos.length>1?"s":"")+" bajo mínimo");
  if(/pendiente/i.test(m.notas||""))o.push("dato pendiente");return o;}
function tarjetaMaq(m){const h=hoyDe(m),mo=moldeDe(h.molde),co=contDe(h.cont),ep=ejeEnMaq(m.cod),av=avisosMaq(m),dm=diamDe(m);
  const fila=(k,v,cls)=>el("div",{class:"mq-f"+(cls?" "+cls:"")},[el("span",{text:k}),el("b",{text:v||"—"})]);
  return el("button",{type:"button",class:"mq"+(av.length?" mq-av":""),onclick:()=>fichaIny(m),"aria-label":"Inyectora "+m.cod},[
    el("div",{class:"mq-h"},[el("b",{text:m.cod}),el("span",{text:valFicha(m,"c-maq")})]),
    fila("Molde",mo?mo.cod:"",mo?"":"mut"),fila("Pistón",dm),fila("Horno",hornoTxt(m)),fila("Contenedor",co?co.cod:"",co?"":"mut"),fila("Eje",ep?ep.cod:"",ep?"":"mut"),
    av.length?el("div",{class:"mq-a",text:""+av.join(" · ")}):null]);}
function vIny(v){draft.iz=draft.iz||"";draft.iq=draft.iq||"";
  const ZON=["Nave 1A","Nave 1B","Nave 2"];const todas=cat.maquinas.slice();
  const q=inp("inyQ",draft.iq,x=>{draft.iq=x;pintaPlano();},{type:"search",placeholder:"Busca: F54, molde, pieza, BE-06, RSW-650, IDRA, Krown…",autocomplete:"off"});
  const zonas=Array.from(new Set(todas.map(zonaDe))).sort((a,b)=>(ZON.indexOf(a)<0?9:ZON.indexOf(a))-(ZON.indexOf(b)<0?9:ZON.indexOf(b)));
  v.appendChild(el("div",{class:"frm",style:"gap:10px"},[q,el("div",{class:"chips"},[["","Todas"]].concat(zonas.map(z=>[z,z])).map(([k,t])=>el("button",{type:"button",class:"chip","aria-pressed":String(draft.iz===k),text:t,onclick:()=>{draft.iz=k;render(true);}})))]));
  const conMolde=todas.filter(m=>hoyDe(m).molde).length;
  v.appendChild(el("dl",{class:"kpis num"},[["Inyectoras",String(todas.length)],["Con molde apuntado",conMolde+"/"+todas.length],["Moldes",String((cat.moldes||[]).length)],["Con aviso",String(todas.filter(m=>avisosMaq(m).length).length)]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))));
  const plano=el("div",{id:"inyPlano",style:"display:grid;gap:14px"});v.appendChild(plano);
  function pintaPlano(){plano.textContent="";const toks=tokQ(draft.iq);
    const ms=todas.filter(m=>(!draft.iz||zonaDe(m)===draft.iz)&&(!toks.length||casa(hayMaq(m),toks)));
    if(toks.length){const mo=moldes().filter(x=>casa([x.cod,x.pieza,x.diam,x.notas].join(" "),toks));
      if(mo.length)plano.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Moldes ("+mo.length+")"})),el("div",{class:"lst"},mo.map(x=>itMolde(x)))]));}
    if(!ms.length){plano.appendChild(el("div",{class:"card"},el("div",{class:"empty",text:toks.length?"Ninguna inyectora coincide con «"+draft.iq+"».":"No hay inyectoras."})));return;}
    zonas.filter(z=>ms.some(m=>zonaDe(m)===z)).forEach(z=>{const mz=ms.filter(m=>zonaDe(m)===z);
      plano.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:z}),el("span",{class:"der sub",text:mz.length+" inyectora"+(mz.length>1?"s":"")})]),
        el("div",{class:"mq-zona"},gruposOperario(mz).map(g=>el("div",{class:"mq-op",title:g.length>1?"Mismo operario":""},[el("div",{class:"mq-op-t",text:g.length>1?""+g.map(m=>m.cod).join(" + "):""+g[0].cod}),el("div",{class:"mq-op-g"},g.map(tarjetaMaq))])))]));});}
  pintaPlano();}
function vMol(v){
  /* moldes y contenedores */
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Moldes ("+(cat.moldes||[]).length+")"}),el("button",{type:"button",class:"btn sec peq der",text:"＋ Molde",onclick:()=>formMolde(null)})]),
    (cat.moldes||[]).length?el("div",{class:"lst"},moldes().map(itMolde)):el("p",{class:"hint",style:"padding:10px 14px",text:"Todavía no hay moldes. Añádelos con su código, la pieza y el Ø de pistón que usa: así cada máquina sabrá qué pistón lleva según el molde puesto."})]));
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Contenedores ("+vivosCont().length+")"}),el("button",{type:"button",class:"btn sec peq der",text:"Ver contenedores",onclick:()=>irA("cont")})]),el("p",{class:"hint",style:"padding:10px 14px",text:"Los contenedores tienen su propia pestaña: estantería, inventario rápido y qué lleva cada máquina."})]));
  const ult=todosMlog().slice(-15).reverse();
  if(ult.length)v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Últimos cambios de molde y contenedor"})),el("div",{class:"tw"},el("table",{},el("tbody",{},ult.map(x=>el("tr",{},[el("td",{class:"num",text:fmtF(x.f)}),el("td",{text:maqN(x.maq)}),el("td",{text:x.tipo==="molde"?"Molde":"Contenedor"}),el("td",{text:(x.tipo==="molde"?(moldeDe(x.val)||{}).cod:(contDe(x.val)||{}).cod)||"—"}),el("td",{text:x.by||""})])))))]));}
/* consumo por inyectora: pistones y material sacado para cada máquina */
function vCons(v){draft.cd=draft.cd||90;const D=draft.cd,hy=hoy(),des=sumaDias(hy,-D);
  v.appendChild(el("div",{class:"chips"},[[30,"30 días"],[90,"3 meses"],[365,"1 año"]].map(([k,t])=>el("button",{type:"button",class:"chip","aria-pressed":String(D===k),text:t,onclick:()=>{draft.cd=k;render(true);}}))));
  const P=todosPist().filter(p=>p.f>=des&&p.maq),M=todosMov().filter(x=>x.tipo==="salida"&&x.maq&&x.f>=des&&!/^Cambio de pistón/.test(x.nota||""));
  const filas=cat.maquinas.map(m=>{const ps=P.filter(p=>p.maq===m.id),ms=M.filter(x=>x.maq===m.id);const g={};ms.forEach(x=>{g[x.art]=(g[x.art]||0)+(+x.cant||0);});
    const top=Object.entries(g).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,c])=>{const a=art(id);return a?(a.cod&&a.fam!=="consumible"?a.cod:a.desc)+" ×"+fmtN(c):null;}).filter(Boolean);
    const mo=moldeDe(hoyDe(m).molde);const eu=ps.reduce((t,p)=>t+(+p.cant||1)*precioDe(pistArt(p.diam)),0)+ms.reduce((t,x)=>t+(+x.cant||0)*precioDe(art(x.art)),0);return{m,eu,pist:ps.reduce((t,p)=>t+(+p.cant||1),0),mat:ms.reduce((t,x)=>t+(+x.cant||0),0),refs:Object.keys(g).length,top,mo};})
    .sort((a,b)=>b.pist-a.pist||b.mat-a.mat||a.m.cod.localeCompare(b.m.cod,"es",{numeric:true}));
  const tp=filas.reduce((t,f)=>t+f.pist,0),tm=filas.reduce((t,f)=>t+f.mat,0),te=filas.reduce((t,f)=>t+f.eu,0);
  v.appendChild(el("dl",{class:"kpis num"},[["Pistones cambiados",fmtN(tp)],["Material sacado",fmtN(tm)+" ud"],["Máquinas con consumo",String(filas.filter(f=>f.pist||f.mat).length)+"/"+filas.length],[te?"Gasto":"Media pistones/máquina",te?eur(te):fmtN(Math.round(tp/Math.max(1,filas.length)*10)/10)]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))));
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Consumo por inyectora"}),el("span",{class:"der sub",text:"desde "+fmtF(des)})]),
    el("div",{class:"lst"},filas.map(f=>el("button",{type:"button",class:"it",onclick:()=>fichaIny(f.m)},[el("span",{class:"stripe "+(f.pist>=Math.max(3,tp/Math.max(1,filas.length)*1.8)?"warn":"")}),
      el("div",{class:"ppal"},[el("div",{class:"t1",text:f.m.cod+" · "+(valFicha(f.m,"c-maq")||"")}),el("div",{class:"t2",text:[zonaDe(f.m),diamDe(f.m)?"pistón "+diamDe(f.m):null,f.mo?"molde "+f.mo.cod:null,f.top.length?f.top.join(", "):"sin material sacado"].filter(Boolean).join(" · ")})]),
      el("div",{class:"cant num"},[el("b",{text:fmtN(f.pist)}),el("small",{text:"pistones · "+fmtN(f.mat)+" ud"+(f.eu?" · "+eur(f.eu):"")})])])))]));
  const MN=todosMov().filter(x=>x.tipo==="salida"&&!x.maq&&x.nave&&x.f>=des);
  if(MN.length)v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Consumo cargado a nave"}),el("span",{class:"der sub",text:"sin inyectora"})]),
    el("div",{class:"lst"},NAVES_C.map(n=>{const ms=MN.filter(x=>x.nave===n);if(!ms.length)return null;const g={};ms.forEach(x=>{g[x.art]=(g[x.art]||0)+(+x.cant||0);});
      const eu=ms.reduce((t,x)=>t+(+x.cant||0)*precioDe(art(x.art)),0);
      return el("div",{class:"it",style:"cursor:default"},[el("span",{class:"stripe"}),el("div",{class:"ppal"},[el("div",{class:"t1",text:n}),el("div",{class:"t2",text:Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([id,c])=>{const a=art(id);return(a?a.desc:id)+" ×"+fmtN(c);}).join(" · ")})]),
        el("div",{class:"cant num"},[el("b",{text:fmtN(ms.reduce((t,x)=>t+(+x.cant||0),0))}),el("small",{text:"ud"+(eu?" · "+eur(eu):"")})])]);}).filter(Boolean))]));
  v.appendChild(el("p",{class:"hint",text:(te?"":"Cuando metas precios en los artículos (Almacén › editar artículo), aquí saldrá el gasto en euros de cada máquina. ")+"Cuando apuntes los cambios de molde, saldrá también el consumo por molde."}));}
function itMolde(x){const en=cat.maquinas.filter(m=>hoyDe(m).molde===x.id).map(m=>m.cod);
  return el("button",{type:"button",class:"it",onclick:()=>formMolde(x)},[el("div",{class:"ppal"},[el("div",{class:"t1",text:moldeTxt(x)}),el("div",{class:"t2",text:[x.diam?"pistón "+x.diam:"sin Ø de pistón",x.notas,en.length?"puesto en "+en.join(", "):"sin máquina"].filter(Boolean).join(" · ")})])]);}
function formMolde(x0,despues){const x=x0?Object.assign({},x0):{cod:"",pieza:"",diam:"",notas:""};
  dlg(x0?"Molde "+x0.cod:"Nuevo molde",[fld("Código del molde",inp("moC",x.cod,z=>x.cod=z,{autocomplete:"off"})),fld("Pieza (opcional)",inp("moP",x.pieza,z=>x.pieza=z,{autocomplete:"off"})),
    fld("Ø de pistón que usa",sel("moD",DIAM.map(d=>[d,d]),x.diam,z=>x.diam=z,"Sin saber")),fld("Notas",inp("moN",x.notas,z=>x.notas=z,{autocomplete:"off"}))],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const cod=String(x.cod||"").trim();if(!cod){toast("Pon el código");return false;}
      if((cat.moldes||[]).some(z=>z.id!==x.id&&norm(z.cod)===norm(cod))){toast("Ya existe el molde "+cod);return false;}
      const nue={id:x.id||uid(),cod,pieza:String(x.pieza||"").trim()||null,diam:x.diam||null,notas:String(x.notas||"").trim()||null};
      cat.moldes=(cat.moldes||[]).filter(z=>z.id!==nue.id).concat([nue]);try{await saveCat();toast("Molde guardado");}catch(e){return false;}if(despues)setTimeout(()=>despues(nue),60);else render(true);}}]);}
function formCont(x0,despues){return fichaCont(x0,despues);}
/* cambio de molde o de contenedor en una máquina */
function cambioHoy(m0,tipo,pre){if(tipo!=="molde")return cambioCont(m0,pre);const m=maqDe(m0.id)||m0;const h=hoyDe(m);const esM=tipo==="molde";const d={f:hoy(),val:esM?h.molde||"":h.cont||"",by:quienSoy()};
  const lista=()=>esM?moldes().map(x=>[x.id,moldeTxt(x)+(x.diam?" ("+x.diam+")":"")]):contens().map(x=>[x.id,x.cod]);
  const box=el("div",{style:"display:grid;gap:10px"});
  const pinta=()=>{box.textContent="";const mo=esM?moldeDe(d.val):null;const dm=diamDe(m);
    box.appendChild(fld("Fecha",inp("chF",d.f,z=>d.f=z,{type:"date"})));
    box.appendChild(fld(esM?"Molde que se pone":"Contenedor que se pone",sel("chV",lista(),d.val,z=>{d.val=z;pinta();},lista().length?"Elige…":"No hay ninguno: créalo")));
    box.appendChild(el("button",{type:"button",class:"btn sec peq",style:"justify-self:start",text:esM?"＋ Molde nuevo":"＋ Contenedor nuevo",onclick:()=>{cerrarDlgs();(esM?formMolde:formCont)(null,n=>cambioHoy(m,tipo,Object.assign({},d,{val:n.id})));}}));
    if(mo&&mo.diam&&mo.diam!==dm)box.appendChild(el("div",{class:"banner",text:"Este molde usa pistón "+mo.diam+" y la máquina tenía "+(dm||"sin Ø")+". Al guardar, la máquina pasa a "+mo.diam+"."}));
    box.appendChild(fld("Quién lo apunta",inp("chB",d.by,z=>d.by=z,{autocomplete:"off"})));};
  if(pre)Object.assign(d,pre);pinta();
  dlg((esM?"Cambio de molde · ":"Cambio de contenedor · ")+m.cod,[box],[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{if(!d.val){toast(esM?"Elige el molde":"Elige el contenedor");return false;}
    const x=maqDe(m.id);const antes=esM?hoyDe(x).molde:hoyDe(x).cont;x.hoy=Object.assign({},x.hoy||{},esM?{molde:d.val,moldeF:d.f}:{cont:d.val,contF:d.f});
    const mo=esM?moldeDe(d.val):null;if(mo&&mo.diam)x.diam=mo.diam;
    try{await saveCat();await addMlog({f:d.f,maq:m.id,tipo,val:d.val,antes:antes||null,by:(d.by||"").trim()||null});toast("Guardado");}catch(e){return false;}
    setTimeout(()=>fichaIny(x),0);}}]);}

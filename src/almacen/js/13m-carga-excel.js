/* ===== CARGA COMPLETA EN UN SOLO EXCEL =====
   Un archivo con todo lo que hay en el catálogo (artículos, proveedores, hornos, modelos de eje y fichas de inyectoras),
   ya relleno con lo que hay, para que otra persona complete lo que falta en el ordenador y se suba de una vez.
   Al subirlo: casilla vacía = no se toca; la columna ID une cada fila con lo que ya existe (sin ID = alta nueva).
   La hoja «Inyectoras» usa la importación de fichas de siempre (después de la carga). */
const H_ART=["ID","Código","Descripción","Familia","Unidad","Precio (€)","Precio recuperado (€)","Stock mínimo","Punto de pedido","Proveedor","Plazo (días)","Ubicación","Nº plano","Inyectoras","Envase","Kg por envase","Stock actual","Cantidad contada","Almacén del recuento"];
const H_PROV=["ID","Nombre","CIF","Dirección","Teléfono","WhatsApp","Correo","Contacto","Qué suministra","Plazo (días)","Nº de cliente","Pedido mínimo","Notas"];
const K_PROV={"Nombre":"nom","CIF":"cif","Dirección":"dir","Teléfono":"tel","WhatsApp":"wa","Correo":"email","Contacto":"contacto","Qué suministra":"sum","Plazo (días)":"plazo","Nº de cliente":"codCli","Pedido mínimo":"pedMin","Notas":"notas"};
const H_HOR=["Inyectora","Marca","Modelo","Nº de serie","Capacidad (kg)","Potencia (kW)","Energía","Fabricación (MM/AAAA)"];
const H_MOD=["ID","Referencia","Precio de reparación (€)","Mínimo en planta"];
async function descargarCarga(btn){if(!downloads){toast("Esta vista no permite descargar archivos");return;}btn.disabled=true;
  try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();const hoja=(n,H,rows,anchos)=>{const ws=X.utils.json_to_sheet(rows.length?rows:[{}],{header:H});ws["!cols"]=H.map(h=>({wch:(anchos||{})[h]||Math.max(12,h.length+2)}));X.utils.book_append_sheet(wb,ws,n);};
    hoja("Artículos",H_ART,cat.articulos.filter(a=>a.activo!==false&&a.fam!=="eje").slice().sort((a,b)=>a.fam.localeCompare(b.fam)||a.desc.localeCompare(b.desc,"es",{numeric:true})).map(a=>({"ID":a.id,"Código":a.cod||"","Descripción":a.desc,"Familia":FAM[a.fam]||a.fam,"Unidad":a.ud||"ud",
      "Precio (€)":precioDe(a)||"","Precio recuperado (€)":a.fam==="piston"?(precioRecDe(a)||""):"—","Stock mínimo":+a.min||"","Punto de pedido":+a.pp||"","Proveedor":provN(a.prov)||"","Plazo (días)":+a.plazo||"","Ubicación":a.ubic||"","Nº plano":a.plano||"",
      "Inyectoras":(a.iny||[]).map(maqN).filter(x=>x&&x!=="—").join(", "),"Envase":a.envase||"","Kg por envase":+a.peso||"","Stock actual":stockDe(a.id),"Cantidad contada":"","Almacén del recuento":""})),{"Descripción":42,"Inyectoras":30,"Proveedor":20});
    hoja("Proveedores",H_PROV,cat.proveedores.slice().sort((a,b)=>a.nom.localeCompare(b.nom)).map(p=>{const r={"ID":p.id};Object.entries(K_PROV).forEach(([h,k])=>{r[h]=p[k]==null?"":p[k];});return r;}),{"Nombre":28,"Dirección":40,"Qué suministra":40,"Notas":40,"Correo":28});
    hoja("Hornos",H_HOR,cat.maquinas.slice().sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true})).map(m=>{const p=m.hornoPlaca||{};const f=m.hornoFab?m.hornoFab.slice(5,7)+"/"+m.hornoFab.slice(0,4):"";
      return{"Inyectora":m.cod,"Marca":p.marca||valFicha(m,"c-horno")||"","Modelo":p.modelo||"","Nº de serie":p.serie||"","Capacidad (kg)":p.kg||"","Potencia (kW)":p.kw||"","Energía":p.energia||"","Fabricación (MM/AAAA)":f};}));
    hoja("Modelos de eje",H_MOD,(cat.modelos||[]).slice().sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true})).map(m=>({"ID":m.cod,"Referencia":m.ref||"","Precio de reparación (€)":+m.precioRep||"","Mínimo en planta":+m.min||""})),{"Referencia":30});
    {const P=plantilla();const H=["Inyectora","Nave"].concat(P.map(c=>c.nom)).concat(["Notas"]);
     const rows=cat.maquinas.slice().sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true})).map(m=>{const v=valoresDe(m);const r={"Inyectora":m.cod,"Nave":m.nave||""};P.forEach(c=>{r[c.nom]=c.auto?autoTxt(c,m):(v[c.id]||[]).map(id=>(c.ops.find(o=>o.id===id)||{}).t).filter(Boolean).join(", ");});r["Notas"]=m.notas||"";return r;});
     hoja("Inyectoras",H,rows);}
    X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([["CÓMO RELLENAR ESTE EXCEL"],[""],
      ["Ya viene con todo lo que hay en la app. Solo hay que completar las casillas vacías o corregir lo que esté mal."],
      ["Casilla vacía = no se cambia nada. Para borrar un dato, hazlo en la app."],
      ["No toques la columna ID: es la que une cada fila con lo que ya existe. Para dar de alta algo nuevo, añade una fila con el ID vacío."],[""],
      ["ARTÍCULOS"],["- Familia: "+Object.values(FAM).filter(x=>x!=="Eje").join(", ")],["- Unidad: "+UDS.join(", ")],
      ["- Precio recuperado: solo en pistones (lo que cuesta recuperar uno)."],["- Inyectoras: códigos separados por comas (F25, F28) o rangos (F20-F25)."],
      ["- Proveedor: el nombre tal cual está en la hoja Proveedores (si no existe, se crea)."],["- Envase: "+ENVASES.join(", ")],
      ["- Stock actual: solo para consultar, no se lee."],["- Cantidad contada + Almacén del recuento: si contáis el stock, se apunta como recuento y el stock queda en esa cantidad. Almacenes: "+cat.almacenes.map(l=>l.nom).join(", ")],[""],
      ["HORNOS"],["- Energía: Eléctrico o Gas. Fabricación: mes y año de la placa, por ejemplo 06/2018."],[""],
      ["INYECTORAS"],["- La ficha de lo que monta cada máquina: cada opción tal cual, varias separadas por comas. Se importa al final, con su propio resumen."]]),"Instrucciones");
    await downloads.save({filename:"Carga_almacen_"+hoy()+".xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Excel descargado");}
  catch(e){toast(e&&e.code==="declined"?"Descarga cancelada":"No se pudo crear el Excel");}btn.disabled=false;}
async function importarCarga(file){try{await cargarXLSX();}catch(e){toast("No se pudo cargar el lector de Excel");return;}
  let wb;try{wb=window.XLSX.read(await file.arrayBuffer());}catch(e){toast("No se pudo leer el archivo");return;}
  const filas=n=>{const k=wb.SheetNames.find(x=>norm(x)===norm(n));return k?window.XLSX.utils.sheet_to_json(wb.Sheets[k],{defval:""}):null;};
  const cel=(r,h)=>{for(const k of Object.keys(r))if(norm(k)===norm(h))return String(r[k]==null?"":r[k]).trim();return"";};
  const num=t=>{if(t===""||t==="—")return null;const n=parseN(t);return isFinite(n)&&n>=0?n:NaN;};
  const C=JSON.parse(JSON.stringify(cat));const res={art:0,artN:0,prov:0,provN:0,hor:0,mod:0,cuentas:[]},errs=[];
  const provPor=t=>{if(!t)return null;let p=C.proveedores.find(x=>norm(x.nom)===norm(t));if(!p){p={id:uid(),nom:t};C.proveedores.push(p);res.provN++;}return p.id;};
  /* proveedores primero (los artículos los usan) */
  (filas("Proveedores")||[]).forEach((r,i)=>{const id=cel(r,"ID"),nom=cel(r,"Nombre");if(!id&&!nom)return;let p=id?C.proveedores.find(x=>x.id===id):C.proveedores.find(x=>norm(x.nom)===norm(nom));
    if(!p){if(!nom){errs.push("Proveedores fila "+(i+2)+": sin nombre");return;}p={id:uid(),nom};C.proveedores.push(p);res.provN++;}let cambia=false;
    Object.entries(K_PROV).forEach(([h,k])=>{const t=cel(r,h);if(t==="")return;let v=t;if(k==="plazo"||k==="pedMin"){v=num(t);if(Number.isNaN(v)){errs.push("Proveedores fila "+(i+2)+": «"+h+"» no es un número");return;}}if(String(p[k]==null?"":p[k])!==String(v)){p[k]=v;cambia=true;}});if(cambia)res.prov++;});
  (filas("Artículos")||[]).forEach((r,i)=>{const id=cel(r,"ID"),desc=cel(r,"Descripción"),cod=cel(r,"Código");if(!id&&!desc)return;
    let a=id?C.articulos.find(x=>x.id===id):C.articulos.find(x=>(cod&&x.cod&&norm(x.cod)===norm(cod))||norm(x.desc)===norm(desc));const nuevo=!a;
    if(!a){const fm=norm(cel(r,"Familia")),fam=Object.keys(FAM).find(k=>norm(FAM[k])===fm||norm(k)===fm||(fm&&norm(FAM[k]).startsWith(fm.slice(0,4))))||"consumible";
      a={id:uid(),desc,cod:cod||null,fam,ud:"ud",min:0,pp:0,alms:[],almPpal:null,iny:[],activo:true};C.articulos.push(a);res.artN++;}
    let cambia=false;const pon=(k,v)=>{if(v==null||v==="")return;if(String(a[k]==null?"":a[k])!==String(v)){a[k]=v;cambia=true;}};
    if(!nuevo){pon("desc",desc);pon("cod",cod);}
    {const u=norm(cel(r,"Unidad"));if(u){const ud=UDS.includes(u)?u:u.startsWith("metro")?"m":u.startsWith("litro")?"l":u.startsWith("kilo")?"kg":null;if(ud)pon("ud",ud);else errs.push("Artículos fila "+(i+2)+": unidad «"+u+"» no válida");}}
    [["Precio (€)","precio"],["Stock mínimo","min"],["Punto de pedido","pp"],["Plazo (días)","plazo"],["Kg por envase","peso"]].concat(a.fam==="piston"?[["Precio recuperado (€)","precioRec"]]:[]).forEach(([h,k])=>{const v=num(cel(r,h));if(Number.isNaN(v)){errs.push("Artículos fila "+(i+2)+": «"+h+"» no es un número");return;}pon(k,v);});
    pon("ubic",cel(r,"Ubicación"));pon("plano",cel(r,"Nº plano"));{const e=cel(r,"Envase");if(e){const ev=ENVASES.find(x=>norm(x)===norm(e));if(ev)pon("envase",ev);}}
    {const pv=cel(r,"Proveedor");if(pv)pon("prov",provPor(pv));}
    {const t=cel(r,"Inyectoras").toUpperCase().replace(/\s/g,"");if(t){const out=[];t.split(/[,;\/]+/).forEach(g=>{const rg=g.match(/^F?(\d+)-F?(\d+)$/);const cods=rg?C.maquinas.map(m=>m.cod).filter(c=>{const n=+c.replace(/\D/g,"");return n>=+rg[1]&&n<=+rg[2];}):[g.startsWith("F")?g:"F"+g];
      cods.forEach(c=>{const m=C.maquinas.find(z=>z.cod.toUpperCase()===c.toUpperCase());if(m&&!out.includes(m.id))out.push(m.id);});});if(JSON.stringify((a.iny||[]).slice().sort())!==JSON.stringify(out.slice().sort())){a.iny=out;cambia=true;}}}
    {const q=num(cel(r,"Cantidad contada")),al=cel(r,"Almacén del recuento");if(q!=null){if(Number.isNaN(q)){errs.push("Artículos fila "+(i+2)+": cantidad contada no válida");}
      else{const l=C.almacenes.find(x=>norm(x.nom)===norm(al))||(al?C.almacenes.find(x=>norm(x.nom).includes(norm(al))):null)||(!al&&a.almPpal?C.almacenes.find(x=>x.id===a.almPpal):null);
        if(!l)errs.push("Artículos fila "+(i+2)+": falta el almacén del recuento");else{res.cuentas.push({a,alm:l.id,q});if(!(a.alms||[]).includes(l.id)){a.alms=(a.alms||[]).concat([l.id]);if(!a.almPpal)a.almPpal=l.id;}}}}}
    if(cambia&&!nuevo)res.art++;});
  (filas("Hornos")||[]).forEach((r,i)=>{let c=cel(r,"Inyectora").toUpperCase().replace(/\s/g,"");if(!c)return;if(/^\d+$/.test(c))c="F"+c;const m=C.maquinas.find(z=>z.cod.toUpperCase()===c);if(!m){errs.push("Hornos fila "+(i+2)+": no existe la "+c);return;}
    const p=Object.assign({},m.hornoPlaca||{});let cambia=false;[["Marca","marca"],["Modelo","modelo"],["Nº de serie","serie"],["Capacidad (kg)","kg"],["Potencia (kW)","kw"]].forEach(([h,k])=>{const t=cel(r,h);if(t&&String(p[k]||"")!==t){p[k]=t;cambia=true;}});
    {const e=cel(r,"Energía");if(e){const v=/gas/i.test(e)?"Gas":/el/i.test(e)?"Eléctrico":null;if(v&&p.energia!==v){p.energia=v;cambia=true;}}}
    {const f=cel(r,"Fabricación (MM/AAAA)");if(f){const mm=f.match(/^(\d{1,2})[\/\-.](\d{4})$/)||f.match(/^(\d{4})-(\d{1,2})/);let v=null;if(mm)v=mm[1].length===4?mm[1]+"-"+String(mm[2]).padStart(2,"0"):mm[2]+"-"+String(mm[1]).padStart(2,"0");else if(/^\d+(\.\d+)?$/.test(f)){const d=new Date(Math.round((+f-25569)*864e5));v=d.toISOString().slice(0,7);}
      if(v&&m.hornoFab!==v){m.hornoFab=v;cambia=true;}else if(!v)errs.push("Hornos fila "+(i+2)+": fecha «"+f+"» no válida (pon MM/AAAA)");}}
    if(cambia){m.hornoPlaca=Object.keys(p).length?p:null;res.hor++;}});
  (filas("Modelos de eje")||[]).forEach((r,i)=>{const id=cel(r,"ID");if(!id)return;const m=(C.modelos||[]).find(x=>x.cod===id);if(!m){errs.push("Modelos de eje fila "+(i+2)+": no existe el modelo "+id);return;}let cambia=false;
    const ref=cel(r,"Referencia");if(ref&&m.ref!==ref){m.ref=ref;cambia=true;}[["Precio de reparación (€)","precioRep"],["Mínimo en planta","min"]].forEach(([h,k])=>{const v=num(cel(r,h));if(v==null)return;if(Number.isNaN(v)){errs.push("Modelos de eje fila "+(i+2)+": «"+h+"» no es un número");return;}if(+m[k]!==v){m[k]=v;cambia=true;}});if(cambia)res.mod++;});
  const hayIny=!!filas("Inyectoras");const nada=!res.art&&!res.artN&&!res.prov&&!res.provN&&!res.hor&&!res.mod&&!res.cuentas.length;
  if(nada&&!hayIny){toast(errs.length?errs[0]:"No hay cambios");return;}
  const sigue=()=>{if(hayIny)setTimeout(()=>importarMaquinas(file,wb.SheetNames.find(x=>norm(x)==="inyectoras")),400);};
  if(nada){sigue();return;}
  dlg("Cargar el Excel",[el("p",{text:"Esto es lo que se va a cambiar:"}),el("dl",{class:"datos"},[].concat(...[["Artículos que cambian",res.art],["Artículos nuevos",res.artN],["Proveedores que cambian",res.prov],["Proveedores nuevos",res.provN],["Hornos",res.hor],["Modelos de eje",res.mod],["Recuentos de stock",res.cuentas.length]].filter(x=>x[1]).map(([k,n])=>[el("dt",{text:k}),el("dd",{text:String(n)})]))),
    errs.length?el("div",{class:"banner w"},[el("b",{text:errs.length+" casillas no se cargan:"}),el("div",{style:"font-size:13px;margin-top:4px"},errs.slice(0,10).map(t=>el("div",{text:t})))]):null,
    hayIny?el("p",{class:"hint",text:"Después se abre el resumen de la hoja «Inyectoras» (las fichas de cada máquina)."}):null],
    [{t:"Cancelar",cls:"sec"},{t:"Cargar",fn:async()=>{const keep=JSON.parse(JSON.stringify(cat));Object.assign(cat,{articulos:C.articulos,proveedores:C.proveedores,maquinas:C.maquinas,modelos:C.modelos});
      try{await saveCat();}catch(e){Object.assign(cat,keep);return false;}
      if(res.cuentas.length){const hy=hoy(),movs=res.cuentas.map(x=>{const t=stockDe(x.a.id,x.alm);return{f:hy,tipo:"ajuste",art:x.a.id,alm:x.alm,cant:Math.round((x.q-t)*1000)/1000,contado:x.q,teorico:t,nota:"Recuento (carga desde Excel)"};});try{await addMovs(movs);}catch(e){toast("Los recuentos no se pudieron guardar");}}
      toast("Excel cargado");render(true);sigue();}}]);}
function cardCargaExcel(){const fi=el("input",{type:"file",accept:".xlsx,.xls",style:"display:none"});fi.addEventListener("change",()=>{const f=fi.files[0];fi.value="";if(f)importarCarga(f);});
  return el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Carga completa en un Excel"})),el("div",{class:"bd frm",style:"gap:10px"},[
    el("p",{class:"hint",text:"Un solo archivo con todo lo del catálogo (artículos, precios, mínimos, proveedores, hornos, modelos de eje y fichas de las inyectoras), ya relleno con lo que hay. Se lo pasas a quien vaya a completarlo, lo rellena en el ordenador y se sube aquí. Antes de guardar sale un resumen; las casillas vacías no cambian nada."}),fi,
    el("div",{class:"acciones"},[downloads?el("button",{type:"button",class:"btn",text:"Descargar Excel para rellenar",onclick:e=>descargarCarga(e.currentTarget)}):null,el("button",{type:"button",class:"btn sec",text:"Subir Excel relleno",onclick:()=>fi.click()})])])]);}

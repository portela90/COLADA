/* ---------- Recuento físico guiado ----------
   Lista las coladas de una nave (en nave o en externo); se escribe lo contado
   y se apuntan de golpe los ajustes de las que no cuadran. Las casillas en
   blanco no se tocan. */
let rcNave="Nave 1",rcDonde="nave";
function abrirRecuento(){
  const prev=document.querySelector(".rc-ov");if(prev)prev.remove();
  const body=el("div",{class:"ficha-body"}),cont={};let gCont="";
  const cerrar=()=>{ov.remove();document.removeEventListener("keydown",tec);};
  const pinta=()=>{
    body.textContent="";const S=saldos();
    const ls=lotes.filter(l=>l.nave===rcNave&&l.donde===rcDonde&&S[l.id]&&S[l.id].fa>0)
      .sort((a,b)=>a.material.localeCompare(b.material)||(a.entrada||"").localeCompare(b.entrada||"")||a.nombre.localeCompare(b.nombre,"es"));
    const res=el("div",{class:"banner",style:"margin:0"}),go=el("button",{type:"button",class:"btn",text:"Apuntar ajustes"});
    const calcula=()=>{let n=0,cont2=0;ls.forEach(l=>{const v=cont[l.id];if(v==null||v==="")return;cont2++;const x=parseInt(v,10);
        const c=$("rcd-"+l.id);if(!(x>=0)||String(x)!==String(v).trim()){if(c){c.textContent="número entero";c.className="rc-dif mal";}return;}
        const d=x-S[l.id].fa;if(d)n++;if(c){c.textContent=d?(d>0?"+":"−")+fmt(Math.abs(d)):"cuadra";c.className="rc-dif"+(d?(d>0?" mas":" menos"):" ok");}});
      ls.filter(l=>cont[l.id]==null||cont[l.id]==="").forEach(l=>{const c=$("rcd-"+l.id);if(c){c.textContent="";c.className="rc-dif";}});
      let gd=0;if(gCont!==""){const g=numES(gCont),c=$("rcd-g");gd=g>=0?Math.round((g-granallaKg())*1000)/1000:NaN;
        if(c){c.textContent=isNaN(gd)?"número":(gd?(gd>0?"+":"−")+Math.abs(gd).toLocaleString("es-ES")+" kg":"cuadra");c.className="rc-dif"+(isNaN(gd)?" mal":(gd?(gd>0?" mas":" menos"):" ok"));}}
      const tot=n+(gd&&!isNaN(gd)?1:0);
      res.textContent=cont2||gCont!==""?(tot?tot+" diferencia"+(tot===1?"":"s")+" para ajustar · "+cont2+" de "+ls.length+" coladas contadas":"Todo lo contado cuadra ("+cont2+" de "+ls.length+" coladas)"):"Escribe los fardos que cuentas. Las casillas en blanco no se tocan.";
      res.className="banner"+(tot?" w":"");go.disabled=!tot;};
    const filas=ls.map(l=>{const b=S[l.id];return el("tr",{},[
      el("td",{},[el("span",{class:"tagm",style:"background:"+MAT[l.material].col}),document.createTextNode(l.nombre),el("div",{class:"sub",text:MAT[l.material].nom+" · entró "+dmy(l.entrada)})]),
      el("td",{class:"r num",text:fmt(b.fa)}),
      el("td",{class:"r"},[el("input",{class:"num rc-in",type:"text",inputmode:"numeric","aria-label":"Fardos contados de "+l.nombre,value:cont[l.id]||"",oninput:e=>{cont[l.id]=e.target.value.trim();calcula();}})]),
      el("td",{class:"r"},[el("span",{id:"rcd-"+l.id,class:"rc-dif"})])]);});
    const gk=granallaKg();
    const seg=(vals,cur,fn)=>el("div",{class:"seg"},vals.map(([v,t])=>el("button",{type:"button","aria-pressed":String(cur===v),text:t,onclick:()=>fn(v)})));
    go.onclick=async()=>{const S2=saldos(),recs=[],txt=[];
      ls.forEach(l=>{const v=cont[l.id];if(v==null||v==="")return;const x=parseInt(v,10);if(!(x>=0)||String(x)!==String(v).trim())return;
        const b=S2[l.id],d=x-b.fa;if(!d)return;const r={i:uid("m"),t:"A",f:hoy(),kg:Math.round(Math.abs(d)*(b.ratio||0)),fa:Math.abs(d),n:"Recuento físico: "+x+" fardos (la app tenía "+b.fa+")"};
        if(d>0)r.d=l.id;else r.o=l.id;recs.push(r);txt.push(l.nombre+": "+(d>0?"+":"−")+fmt(Math.abs(d))+" f (quedará en "+x+")");});
      if(gCont!==""){const g=numES(gCont);if(g>=0){const gk2=granallaKg(),d=Math.round((g-gk2)*1000)/1000;
        if(d){recs.push({i:uid("m"),t:"G",aj:true,f:hoy(),kg:d,n:"Recuento físico: "+g.toLocaleString("es-ES")+" kg (la app tenía "+(Math.round(gk2*100)/100).toLocaleString("es-ES")+")"});txt.push("Granalla de cobre: "+(d>0?"+":"−")+Math.abs(d).toLocaleString("es-ES")+" kg");}}}
      if(!recs.length)return;
      if(!(await confirmar(rcNave+" · "+(rcDonde==="nave"?"en nave":"almacén externo")+" · "+dmy(hoy())+"\n\n"+txt.join("\n"),{titulo:"Apuntar "+recs.length+" ajuste"+(recs.length===1?"":"s"),ok:"Apuntar"})))return;
      go.disabled=true;
      try{await addMovs(recs);toast(recs.length+" ajuste"+(recs.length===1?"":"s")+" apuntado"+(recs.length===1?"":"s"));
        Object.keys(cont).forEach(k=>delete cont[k]);gCont="";pinta();}
      catch(e){go.disabled=false;toast("No se pudo guardar");}};
    body.appendChild(el("div",{class:"wrap"},[
      el("div",{class:"card"},[el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[
        seg(NAVES.map(n=>[n,n]),rcNave,v=>{rcNave=v;Object.keys(cont).forEach(k=>delete cont[k]);pinta();}),
        seg([["nave","En la nave"],["externo","Almacén externo"]],rcDonde,v=>{rcDonde=v;Object.keys(cont).forEach(k=>delete cont[k]);pinta();})])]),
      el("div",{class:"card"},[
        ls.length?el("div",{class:"tw"},[el("table",{},[
          el("thead",{},[el("tr",{},[el("th",{text:"Colada"}),el("th",{class:"r",text:"App"}),el("th",{class:"r",text:"Contado"}),el("th",{class:"r",text:"Diferencia"})])]),
          el("tbody",{},filas)])]):el("div",{class:"empty",text:"No hay coladas con fardos aquí."})]),
      el("div",{class:"card"},[el("div",{class:"hd"},[el("span",{class:"tagm",style:"background:var(--cobre)"}),el("h2",{text:"Granalla de cobre (opcional)"})]),
        el("div",{class:"bd rc-g"},[el("span",{class:"sub",text:"App: "+(Math.round(gk*100)/100).toLocaleString("es-ES")+" kg"}),
          el("input",{class:"num rc-in",type:"text",inputmode:"decimal","aria-label":"Kg de granalla de cobre contados",placeholder:"kg contados",value:gCont,oninput:e=>{gCont=e.target.value.trim();calcula();}}),
          el("span",{id:"rcd-g",class:"rc-dif"})])]),
      res,go]));
    calcula();
  };
  const tec=e=>{if(e.key==="Escape"&&!document.querySelector(".dlg-ov"))cerrar();};
  const ov=el("div",{class:"ficha-ov rc-ov",role:"dialog","aria-modal":"true","aria-label":"Recuento físico"},[
    el("div",{class:"ficha-top"},[el("button",{type:"button",class:"btn sec",style:"font-size:14px;padding:9px 14px",text:"← Volver",onclick:cerrar}),el("h2",{text:"Recuento físico"})]),body]);
  document.addEventListener("keydown",tec);document.body.appendChild(ov);pinta();
}
function vLotes(){
  const {S}=bloques();const out=[el("div",{class:"card"},[el("div",{class:"bd",style:"display:flex;align-items:center;gap:12px;flex-wrap:wrap"},[
    el("p",{class:"hint",style:"flex:1;min-width:200px",text:"¿Has contado los fardos? Mete el recuento de toda una nave de una vez y se apuntan solos los ajustes."}),
    el("button",{type:"button",class:"btn sec",text:"Hacer recuento",onclick:abrirRecuento})])])];
  NAVES.forEach(n=>[["nave","En la nave"],["externo","En el almacén externo"]].forEach(([dn,tit])=>{
    /* sólo las que tienen fardos: las agotadas van aparte, al final (antes un
       resto de kg por redondeo dejaba una agotada como "Consumir ésta") */
    const ls=lotes.filter(l=>l.nave===n&&l.donde===dn).map(l=>({l,b:S[l.id]||{kg:0,fa:0,ratio:0}})).filter(x=>x.b.fa>0)
                  .sort((a,b)=>(a.l.entrada||"").localeCompare(b.l.entrada||""));
    if(!ls.length)return;
    out.push(el("div",{class:"card"},[
      el("div",{class:"gh"},[el("span",{text:n+" — "+tit}),el("span",{class:"num",text:fmt(ls.reduce((a,x)=>a+x.b.fa,0))+" f · "+fmt(ls.reduce((a,x)=>a+x.b.kg,0))+" kg"})]),
      el("div",{class:"tw"},[el("table",{},[
        el("thead",{},[el("tr",{},[el("th",{text:"Colada"}),el("th",{text:"Entró"}),el("th",{class:"r",text:"Fardos"}),el("th",{class:"r",text:"Kg"}),el("th",{class:"r",text:"Kg/f"}),el("th",{})])]),
        el("tbody",{},ls.map(({l,b},i)=>el("tr",{},[
          el("td",{},[el("span",{class:"tagm",style:"background:"+MAT[l.material].col}),el("button",{type:"button",class:"linkcol",text:l.nombre,onclick:()=>abrirFicha(l.id)}),(ls.findIndex(y=>y.l.material===l.material)===i)?el("span",{class:"fifo1"+(dn==="externo"?" traer":""),text:dn==="nave"?"Consumir ésta":"Traer ésta primero"}):null,l.albaran?el("div",{class:"sub",text:l.albaran+(l.proveedor?" · "+l.proveedor:"")}):null,(function(){var e=movs().filter(function(x){return x.d===l.id&&x.ft;});return e.length?el("img",{class:"thumb",src:fotoUrl(e[0].ft),alt:"Albarán",title:"Ver el albarán",onclick:function(){verFoto(e[0].ft);}}):null;})()]),
          el("td",{class:"num sub",text:dmy(l.entrada)}),
          el("td",{class:"r num",text:fmt(b.fa)}),
          el("td",{class:"r num",text:fmt(b.kg)}),
          el("td",{class:"r num sub",text:b.ratio>0?b.ratio.toLocaleString("es-ES"):"—"}),
          el("td",{class:"r acc"},[el("button",{class:"btn sec",type:"button",style:"font-size:13px;padding:5px 10px",text:"Ajustar",onclick:()=>ajustarLote(l,b)}),
          dn==="externo"?el("button",{class:"btn sec",type:"button",style:"font-size:13px;padding:5px 10px",text:"Traer a nave",onclick:async()=>{
            const hay=b.fa;
            if(!(hay>0)){toast("Este lote no tiene fardos");return;}
            const pri=ls.find(y=>y.l.material===l.material);
            const aviso=pri&&pri.l.id!==l.id?"\n\nOjo: la más antigua de "+MAT[l.material].nom+" en el externo es "+pri.l.nombre+" (entró el "+dmy(pri.l.entrada)+"). Por FIFO tocaría traer esa primero.":"";
            const r=await preguntar("¿Cuántos fardos de "+l.nombre+" subes a "+l.nave+"?\n\nEn el almacén externo hay "+fmt(hay)+"."+aviso,String(hay),{titulo:"Traer a nave",ok:"Subir"});
            if(r===null)return;
            const n=parseInt(r,10);
            if(!(n>0)){toast("Pon un número de fardos");return;}
            if(n>hay){toast("Sólo hay "+fmt(hay)+" fardos");return;}
            try{await subirExterno(l,b,n);toast(n===hay?"Lote entero subido a "+l.nave:fmt(n)+" fardos subidos a "+l.nave);}catch(e){toast("No se pudo");}
          }}):null])
        ])))
      ])])
    ]));
  }));
  if(out.length===1)out.push(el("div",{class:"card"},[el("div",{class:"empty",text:"No hay coladas con existencias."})]));
  /* coladas agotadas: plegadas, la más reciente primero */
  const ultimo=id=>{let f="";todosMovs().forEach(r=>{if(r.o===id&&(r.t==="C"||r.t==="A"||r.t==="T")&&!r.h&&(r.f||"")>f)f=r.f;});return f;};
  const ago=lotes.filter(l=>{const b=S[l.id];return b&&b.fa<=0&&((l.fardosInv||0)>0||b.ent.length);})
    .map(l=>({l,b:S[l.id],f:ultimo(l.id)})).sort((a,b)=>(b.f||"").localeCompare(a.f||"")||a.l.nombre.localeCompare(b.l.nombre,"es"));
  if(ago.length)out.push(el("details",{class:"card agotadas"},[
    el("summary",{class:"gh"},[el("span",{text:"Coladas agotadas"}),el("span",{class:"num",text:String(ago.length)})]),
    el("div",{class:"tw"},[el("table",{},[
      el("thead",{},[el("tr",{},[el("th",{text:"Colada"}),el("th",{text:"Entró"}),el("th",{text:"Se acabó"}),el("th",{class:"r",text:"Fardos"})])]),
      el("tbody",{},ago.map(({l,b,f})=>el("tr",{},[
        el("td",{},[el("span",{class:"tagm",style:"background:"+(MAT[l.material]?MAT[l.material].col:"var(--mut)")}),
          el("button",{type:"button",class:"linkcol",text:l.nombre,onclick:()=>abrirFicha(l.id)}),
          el("div",{class:"sub",text:l.nave+" · "+(MAT[l.material]?MAT[l.material].nom:l.material)+(l.proveedor?" · "+l.proveedor:"")})]),
        el("td",{class:"num sub",text:dmy(l.entrada)}),
        el("td",{class:"num sub",text:f?dmy(f):"—"}),
        el("td",{class:"r num",style:b.fa<0?"color:var(--bad);font-weight:600":"",text:fmt(b.fa)})])))])])]));
  return out;
}

function rangoRapido(k){
  const d=new Date(),p=n=>{const x=new Date(d);x.setDate(x.getDate()-n);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");};
  if(k==="hoy")return[hoy(),hoy()];
  if(k==="ayer")return[p(1),p(1)];
  if(k==="7")return[p(6),hoy()];
  if(k==="mes")return[mesDe(hoy())+"-01",hoy()];
  return["",""];
}
function filtrados(){
  const S=saldos(),f=filtro;
  const nom=id=>{const l=lotes.find(x=>x.id===id);return l?l.nombre:"";};
  const info=r=>{const l=lotes.find(x=>x.id===(r.o||r.d));
    return{nave:l?l.nave:(r.nv||""),mat:l?l.material:(r.ml||""),colada:l?l.nombre:(r.t==="G"?"Granalla de cobre":(r.n||""))};};
  return movs().filter(r=>{
    const i=info(r);
    if(f.desde&&(!r.f||r.f<f.desde))return false;
    if(f.hasta&&(!r.f||r.f>f.hasta))return false;
    if(f.tipo&&r.t!==f.tipo)return false;
    if(f.nave&&i.nave!==f.nave)return false;
    if(f.mat&&i.mat!==f.mat)return false;
    if(f.turno&&r.u!==f.turno)return false;
    if(f.texto){const q=f.texto.toLowerCase();
      if(!((i.colada||"").toLowerCase().includes(q)||(r.a||"").toLowerCase().includes(q)||(r.n||"").toLowerCase().includes(q)))return false;}
    return true;
  }).map(r=>{const i=info(r),sg=(r.t==="A"&&r.o&&!r.d)?-1:1;return{r,i,kg:sg*kgAp(r,S),fa:sg*(typeof r.fa==="number"?r.fa:0)};})
    .sort((a,b)=>(b.r.f||"").localeCompare(a.r.f||"")||(b.r.i||"").localeCompare(a.r.i||""));
}
function csvDe(rows){
  const T={C:"Consumo",E:"Entrada",A:"Ajuste",G:"Granalla de cobre",T:"Traslado"};
  const esc=s=>'"'+String(s==null?"":s).replace(/"/g,'""')+'"';
  const out=[["Fecha","Tipo","Nave","Aleacion","Relevo","Colada","Kg","Fardos","Albaran","Nota"].map(esc).join(";")];
  rows.forEach(({r,i,kg,fa})=>out.push([r.f||"",(r.t==="G"&&r.aj?"Ajuste granalla de cobre":(T[r.t]||r.t)),i.nave,i.mat,r.u||"",i.colada,
    String(Math.round(kg*100)/100).replace(".",","),fa,r.a||"",r.n||""].map(esc).join(";")));
  return "﻿"+out.join("\r\n");
}

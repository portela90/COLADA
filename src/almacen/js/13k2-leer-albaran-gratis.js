/* ===== LEER UN ALBARÁN GRATIS (OCR en el propio móvil, sin IA) =====
   Tesseract.js lee el texto de la foto en el navegador (no se paga nada ni sale la foto del móvil).
   Después la app busca: proveedor (los de la lista), nº de albarán, fecha y las líneas que tienen un artículo conocido
   (por código, referencia del proveedor, lo aprendido en otros albaranes o el nombre). Lo que no reconoce sale desmarcado.
   Todo pasa por la misma pantalla de revisión que la lectura con IA, y lo que se corrige se aprende (cat.albMap). */
const OCR_URL="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
let _ocrLib=null;
function cargarOCR(){if(window.Tesseract)return Promise.resolve(window.Tesseract);if(_ocrLib)return _ocrLib;
  _ocrLib=new Promise((res,rej)=>{const s=document.createElement("script");s.src=OCR_URL;s.onload=()=>res(window.Tesseract);s.onerror=()=>{_ocrLib=null;rej(new Error("No se pudo cargar el lector (¿sin conexión?)"));};document.head.appendChild(s);});return _ocrLib;}
/* foto a blanco y negro con umbral local (cada zona con su luz): con fotos de móvil, sombras y papel gris Tesseract lee mucho mejor */
function prepFotoOCR(file){return new Promise((res,rej)=>{const img=new Image(),u=URL.createObjectURL(file);
  img.onload=()=>{const w0=img.naturalWidth,h0=img.naturalHeight,k=Math.min(2.2,2200/Math.max(w0,h0));const c=document.createElement("canvas");const W=c.width=Math.round(w0*k),H=c.height=Math.round(h0*k);
    const x=c.getContext("2d");x.drawImage(img,0,0,W,H);
    try{const d=x.getImageData(0,0,W,H),p=d.data,g=new Float32Array(W*H),I=new Float64Array((W+1)*(H+1));
      for(let i=0,j=0;i<p.length;i+=4,j++)g[j]=0.299*p[i]+0.587*p[i+1]+0.114*p[i+2];
      for(let yy=0;yy<H;yy++){let fila=0;for(let xx=0;xx<W;xx++){fila+=g[yy*W+xx];I[(yy+1)*(W+1)+xx+1]=I[yy*(W+1)+xx+1]+fila;}}
      const r=Math.max(8,Math.round(Math.max(W,H)/80));
      for(let yy=0;yy<H;yy++){const y0=Math.max(0,yy-r),y1=Math.min(H,yy+r+1);for(let xx=0;xx<W;xx++){const x0=Math.max(0,xx-r),x1=Math.min(W,xx+r+1);
        const s=I[y1*(W+1)+x1]-I[y0*(W+1)+x1]-I[y1*(W+1)+x0]+I[y0*(W+1)+x0],m=s/((y1-y0)*(x1-x0));const v=g[yy*W+xx]>m-12?255:0,o=(yy*W+xx)*4;p[o]=p[o+1]=p[o+2]=v;p[o+3]=255;}}
      x.putImageData(d,0,0);}catch(e){}
    URL.revokeObjectURL(u);res(c);};img.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("No se pudo abrir la foto"));};img.src=u;});}
const numOCR=t=>{t=String(t).trim();if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t))t=t.replace(/\./g,"");return Number(t.replace(",","."));};
/* del texto leído saca lo que necesita la pantalla de revisión (igual que lo que devuelve la IA) */
function interpretarOCR(texto){const T=String(texto||"").replace(/\r/g,""),lineas=T.split("\n").map(s=>s.replace(/\s+/g," ").trim()).filter(Boolean),nT=" "+nqAlb(T)+" ";
  const D={proveedor:"",albaran:"",fecha:"",lineas:[],confianza:"media",ocr:true};
  /* proveedor: el de la lista cuyo nombre aparece en el albarán (la palabra más larga del nombre basta) */
  /* primero por el CIF (lo más seguro), luego por el nombre */
  let PV=null;{const TC=T.toUpperCase().replace(/[^A-Z0-9]/g,"");const cifN=c=>String(c||"").toUpperCase().replace(/[^A-Z0-9]/g,"").replace(/^ES(?=[A-Z]\d)/,"");
    PV=(cat.proveedores||[]).find(p=>{const c=cifN(p.cif);return c.length>=8&&TC.includes(c);})||null;
    if(!PV){let pt=0;(cat.proveedores||[]).forEach(p=>{const ws=nqAlb(p.nom).split(" ").filter(w=>w.length>=4);if(!ws.length)return;const n=ws.filter(w=>nT.includes(" "+w+" ")).length;const sc=n/ws.length+(nT.includes(" "+nqAlb(p.nom)+" ")?1:0);if(n&&sc>pt){pt=sc;PV=p;}});}
    if(PV)D.proveedor=PV.nom;}
  /* lo aprendido de los albaranes de ese proveedor (cat.proveedores[].albLee): dónde va el nº, si usa punto decimal, qué número es la cantidad */
  const LEE=(PV&&PV.albLee)||{};
  const numP=x=>LEE.dec==="punto"&&/^\d+\.\d{3}$/.test(x)?Number(x):numOCR(x);
  /* nº de albarán */
  if(LEE.num)try{const m=T.replace(/\n/g," ").match(new RegExp(LEE.num,"i"));if(m&&m[1])D.albaran=m[1].replace(/\s+/g," ").trim();}catch(e){}
  if(!D.albaran){const m=T.match(/alb[aá]r[aá]n[^\n\d]{0,25}?([A-Z]{0,4}[\-\/]?\d[\dA-Z\-\/]{1,})/i)||T.match(/(?:n[º°o]\.?\s*(?:de\s*)?(?:documento|doc\.?|delivery|nota)|delivery\s*note)[^\n\d]{0,10}([A-Z]{0,4}[\-\/]?\d[\dA-Z\-\/]{2,})/i);if(m)D.albaran=m[1].replace(/[\/\-]$/,"");}
  if(LEE.fecha)try{const m=T.replace(/\n/g," ").match(new RegExp(LEE.fecha,"i"));if(m){let[d,mo,y]=[+m[1],+m[2],+m[3]];if(y<100)y+=2000;if(d>=1&&d<=31&&mo>=1&&mo<=12)D.fechaP=y+"-"+String(mo).padStart(2,"0")+"-"+String(d).padStart(2,"0");}}catch(e){}
  /* fecha: la primera dd/mm/aa(aa) que tenga sentido */
  if(D.fechaP){D.fecha=D.fechaP;delete D.fechaP;}else{const re=/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/g;let m;while((m=re.exec(T))){let [_,d,mo,y]=m;d=+d;mo=+mo;y=+y;if(y<100)y+=2000;if(d>=1&&d<=31&&mo>=1&&mo<=12&&y>=2020&&y<=2099){D.fecha=y+"-"+String(mo).padStart(2,"0")+"-"+String(d).padStart(2,"0");break;}}}
  const recup=/recup/i.test(T);if(recup)D.tipo="recuperacion";
  const M=cat.albMap||{},arts=artsActivos().filter(a=>a.fam!=="eje");
  const codigos=arts.map(a=>({a,cs:[a.cod,a.refProv,a.codProv].filter(Boolean).map(c=>nqAlb(c)).filter(c=>c.length>=3)}));
  const nombre=a=>nqAlb(nomArtC(a)).split(" ").filter(w=>w.length>=3&&!/^\d+$/.test(w));
  const vistos=new Set();
  lineas.forEach(L=>{const nL=" "+nqAlb(L)+" ";if(nL.trim().length<3)return;
    if(/^(total|subtotal|base|iva|importe|portes|forma de pago|vencim|observ|firma|transport|cif|nif|tel|fax|www|e-?mail)/i.test(L))return;
    /* descripción sin números sueltos (así el texto aprendido sirve para el próximo albarán) */
    const desc=L.split(" ").filter(w=>!/^[\d.,€%x]+$/i.test(w)).join(" ").replace(/\s+/g," ").trim();if(desc.replace(/[^a-záéíóúñ]/gi,"").length<3)return;
    let art=null,sc=0,cod=null;
    const k=nqAlb(desc);if(M[k]&&arts.some(a=>a.id===M[k])){art=M[k];sc=100;}
    if(!art)codigos.forEach(({a,cs})=>cs.forEach(c=>{if(nL.includes(" "+c+" ")&&c.length+50>sc){art=a.id;sc=c.length+50;cod=c;}}));
    /* por el nombre: cada palabra vale entera o por su principio (guante / guantes) */
    if(!art){const toks=nL.trim().split(" ");const hay=w=>toks.some(t=>t===w||(w.length>=5&&t.length>=5&&t.slice(0,Math.min(6,w.length-1))===w.slice(0,Math.min(6,w.length-1))));
      arts.forEach(a=>{const ws=nombre(a);if(!ws.length)return;const n=ws.filter(hay).length,f=n/ws.length;if(n>=Math.min(2,ws.length)&&(ws.length>1||ws[0].length>=6)&&f>=0.6&&f*50>sc){art=a.id;sc=f*50;}});}
    /* cantidad: el primer número (sin contar el código), mejor si va al principio de la línea; los precios con € o con 2 decimales tras otro número se saltan */
    let resto=L;if(cod){const re=new RegExp(cod.split(" ").map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("[\\s\\-./]*"),"i");resto=resto.replace(re," ");}
    const nums=(resto.match(/(?:^|\s)(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)(?=\s|$|[a-z]{1,3}\b)/gi)||[]).map(x=>x.trim());
    /* los números que son parte del nombre o del código del artículo (Insural 800, PC 240-200) no son la cantidad */
    const aA=art?arts.find(a=>a.id===art):null,noC=new Set(aA?(nqAlb(nomArtC(aA))+" "+[aA.cod,aA.refProv,aA.codProv].filter(Boolean).map(nqAlb).join(" ")).split(" ").filter(w=>/^\d+$/.test(w)):[]);
    const numsC=nums.filter(x=>!noC.has(x));
    let cant=null;
    if(LEE.cant==="decimal"){const x=numsC.find(x=>/[.,]\d+$/.test(x)&&numP(x)>0&&numP(x)<=100000);if(x!=null)cant=numP(x);}
    if(cant==null)for(const x of numsC){const v=numP(x);if(!(v>0)||v>100000)continue;if(/[.,]\d{2}$/.test(x)&&numsC.length>1&&cant!=null)continue;cant=v;break;}
    if(!art&&cant==null)return;
    let desde=null,hasta=null;if(recup){const r=L.match(/(\d{2,3})\D{1,12}?\ba\s*[øo0]?\s*(\d{2,3})\b/i);if(r){desde=r[1];hasta=r[2];}}
    const clave=(art||"")+"|"+k;if(vistos.has(clave))return;vistos.add(clave);
    D.lineas.push({texto:desc,cantidad:cant,unidad:"",art:art||null,ok:!!art||!!hasta,desde,hasta,especial:/esp/i.test(L)});});
  if(!D.lineas.some(l=>l.ok))D.confianza="baja";
  return D;}
/* ===== LEER UN ALBARÁN CON LA IA GRATUITA (Cloudflare, la misma que lee los contadores; función leer-albaran-cf) =====
   Devuelve lo mismo que la lectura con Claude y pasa por la misma pantalla de revisión. Si falla (sin conexión, cupo del día
   gastado…), se lee con el lector del propio móvil como antes. */
function jpegAlb(file){return new Promise((ok,ko)=>{const u=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{const k=Math.min(1,1800/Math.max(im.width,im.height)),cv=document.createElement("canvas");cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);
    const g=cv.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,cv.width,cv.height);g.drawImage(im,0,0,cv.width,cv.height);URL.revokeObjectURL(u);cv.toBlob(b=>b?ok(b):ko(new Error("No se pudo preparar la foto")),"image/jpeg",0.82);};
  im.onerror=()=>{URL.revokeObjectURL(u);ko(new Error("No se pudo abrir la foto"));};im.src=u;});}
/* fams: solo esas familias (p. ej. desde Barras expulsoras); así la IA no se confunde con otros artículos */
async function leerAlbaranIAGratis(file,fams){if(!file)return;
  if(window.__OCR_MOCK!=null&&!window.__ALB_CF_MOCK)return leerAlbaranGratis(file);
  dlg("Leyendo el albarán…",[el("p",{class:"hint",text:"Un momento: la IA gratuita está leyendo la foto."})],[]);
  try{const bl=await jpegAlb(file);let datos;
    if(window.__ALB_CF_MOCK){const m=window.__ALB_CF_MOCK;if(m.error)throw new Error(m.error);datos=m.datos||m;}
    else{const b64=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result).split(",")[1]);fr.onerror=rej;fr.readAsDataURL(bl);});
      const r=await llamarFn("leer-albaran-cf",{image:b64,mime:"image/jpeg",proveedores:cat.proveedores.map(p=>p.nom),articulos:artsActivos().filter(a=>a.fam!=="eje"&&(!fams||fams.includes(a.fam))).map(a=>({id:a.id,t:nomArtC(a)+" · en "+a.ud+(a.peso?" (envase de "+a.peso+" "+a.ud+")":"")+[a.cod,a.codProv,a.refProv].filter(Boolean).map(c=>" ["+c+"]").join("")})),hoy:hoy(),
        pistas:cat.proveedores.filter(p=>p.albPista).map(p=>p.nom+(p.cif?" (CIF "+p.cif+")":"")+": "+p.albPista)});
      if(!r||r.error||!r.datos)throw new Error((r&&r.error)||"sin respuesta");datos=r.datos;}
    if(!(datos.lineas||[]).length&&!datos.albaran)throw new Error("no ha sacado nada de la foto");
    cerrarDlgs();revisarAlbaran(datos,bl);}
  catch(e){cerrarDlgs();toast("La IA gratuita no ha podido leerlo ("+(e.message||e)+"): lo leo con el lector del móvil");leerAlbaranGratis(file);}}
async function leerAlbaranGratis(file){if(!file)return;
  const est=el("p",{class:"hint",text:"Preparando el lector… la primera vez tarda un poco más (se descarga y se queda guardado)."});
  dlg("Leyendo el albarán (gratis)",[est,el("p",{class:"hint",text:"Se lee en el propio móvil: la foto no sale de aquí y no cuesta nada."})],[]);
  try{const bl=await comprimir(file);let texto;
    if(window.__OCR_MOCK!=null)texto=window.__OCR_MOCK;
    else{const Ts=await cargarOCR(),cv=await prepFotoOCR(file);
      const r=await Ts.recognize(cv,"spa",{logger:m=>{if(m&&m.status==="recognizing text")est.textContent="Leyendo… "+Math.round((m.progress||0)*100)+" %";else if(m&&m.status)est.textContent="Preparando el lector…";}});
      texto=(r&&r.data&&r.data.text)||"";}
    const D=interpretarOCR(texto);cerrarDlgs();
    if(!D.lineas.length&&!D.albaran){toast("No he podido leer el albarán: prueba con otra foto más recta y con más luz");return;}
    revisarAlbaran(D,bl);}
  catch(e){cerrarDlgs();toast("No se pudo leer el albarán: "+(e.message||e));}}

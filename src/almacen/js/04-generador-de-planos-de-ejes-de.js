/* ===== GENERADOR DE PLANOS DE EJES DE INYECCIÓN (estilo CIE Inyectametal) ===== */
const geoEjeDef=g=>Object.assign({Dc:100,tDc:"±0.20",lc:20,tlc:"-0.05/-0.1",Ds:0,ls:0,tDs:"",db:79,tdb:"+0/-0.20",df:0,tdf:"±0.20",ec:"70",caras:2,lf:100,L:780,T:840,juntas:[125,135,150],refr:[112],rosca:"M45x4.5",tubo:855,mat:"URKO-0-F-125",nplano:"",tipo:"",nota:"",papel:[],extra:""},g||{});
const lstN=v=>(Array.isArray(v)?v:String(v||"").split(/[,;\s]+/)).map(x=>parseFloat(String(x).replace(",","."))).filter(x=>isFinite(x)&&x>0);
function cotasEje(g){g=geoEjeDef(g);const o=[{n:"Ø46",v:"-0.03/-0.06"},{n:"Ø cabeza",v:"Ø"+g.Dc+" "+(g.tDc||"")}];
  if(g.Ds)o.push({n:"Ø escalón",v:"Ø"+g.Ds+" "+(g.tDs||"")});o.push({n:"Ø cuerpo",v:"Ø"+g.db+" "+(g.tdb||"")});if(g.df)o.push({n:"Ø delantero",v:"Ø"+g.df+" "+(g.tdf||"")});
  o.push({n:"Cota importante",v:g.L+" ±0.5"});if(g.T)o.push({n:"Cota total",v:g.T+" ±0.5"});o.push({n:"Rosca",v:g.rosca});o.push({n:"Cota cabeza",v:g.lc+" "+(g.tlc||"")});
  return o.map(c=>({n:c.n,v:c.v.trim()}));}
function difEje(a,b){const A=geoEjeDef(a),B=geoEjeDef(b),o=[];
  [["L","Cota importante"],["T","Cota total"],["Dc","Ø cabeza"],["tDc","Tolerancia Ø cabeza"],["lc","Cota cabeza"],["tlc","Tolerancia cota cabeza"],["Ds","Ø escalón"],["db","Ø cuerpo"],["tdb","Tolerancia Ø cuerpo"],["df","Ø delantero"],["ec","Entrecaras"],["rosca","Rosca"],["tubo","Tubo"],["mat","Material"]].forEach(([k,t])=>{if(String(A[k]==null?"":A[k])!==String(B[k]==null?"":B[k]))o.push(t+" "+(A[k]||"—")+" → "+(B[k]||"—"));});
  if(lstN(A.juntas).join()!==lstN(B.juntas).join())o.push("Cotas de juntas "+lstN(A.juntas).join("/")+" → "+lstN(B.juntas).join("/"));
  if(lstN(A.refr).join()!==lstN(B.refr).join())o.push("Refrigeración "+lstN(A.refr).join("/")+" → "+lstN(B.refr).join("/"));
  if((A.nota||"")!==(B.nota||""))o.push("Nota cambiada");return o;}
function svgEje(a,rev,hist){const g=geoEjeDef(rev.gen),esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
  const F=n=>(+n).toFixed(2);
  const ln=(x1,y1,x2,y2,c)=>'<line x1="'+F(x1)+'" y1="'+F(y1)+'" x2="'+F(x2)+'" y2="'+F(y2)+'"'+(c?' class="'+c+'"':'')+'/>';
  const tx=(x,yy,t,c,an)=>'<text x="'+F(x)+'" y="'+F(yy)+'" text-anchor="'+(an||"middle")+'"'+(c?' class="'+c+'"':'')+'>'+esc(t)+'</text>';
  const txV=(x,yy,t,c)=>'<text transform="translate('+F(x)+' '+F(yy)+') rotate(-90)" text-anchor="middle"'+(c?' class="'+c+'"':'')+'>'+esc(t)+'</text>';
  const cotaH=(x1,x2,yy,t,yref)=>{const w=String(t).length*1.5;return ln(x1,yref,x1,yy+(yy>yref?1.2:-1.2),"fino")+ln(x2,yref,x2,yy+(yy>yref?1.2:-1.2),"fino")+ln(x1,yy,x2,yy,"cota")+(x2-x1<w+3?tx(x2+1.2,yy+0.9,t,"num","start"):tx((x1+x2)/2,yy-0.9,t,"num"));};
  const cotaV=(xx,y1,y2,t)=>ln(xx,y1,xx,y2,"cota")+txV(xx-0.9,(y1+y2)/2,t,"num");
  const L=+g.L,T=+g.T||L+60,lc=+g.lc||20,Dc=+g.Dc||100,db=+g.db||80,df=+g.df||0,Ds=+g.Ds||0,ls=Ds?(+g.ls||lc+80):0,lf=df?(+g.lf||100):0;
  const J=lstN(g.juntas),Rf=lstN(g.refr);const m36=/M36/i.test(g.rosca||"");const rt=m36?18:22.5;
  const IZ=Math.max(lc,ls,...J,...Rf,120)+28;const R0=L-Math.max(lf,95)-15;const roto=R0>IZ+30;const GAP=12;
  const anch=roto?IZ+(T-R0):T;const s=Math.min(0.42,(roto?178:190)/anch);
  const x0=34,y=70,xr=x0+IZ*s+GAP;
  const X=p=>!roto||p<=IZ?x0+p*s:xr+(p-R0)*s;
  const segs=[[0,lc,Dc]];let p=lc;if(Ds){segs.push([p,ls,Ds]);p=ls;}
  if(df){segs.push([p,L-lf,db]);segs.push([L-lf,L,df]);}else segs.push([p,L,db]);
  segs.push([L,L+10,40.7],[L+10,L+22,46],[L+22,T,rt*2]);
  /* recortar por la rotura */
  const vis=[];segs.forEach(([a1,a2,d])=>{if(!roto){vis.push([a1,a2,d]);return;}if(a2<=IZ||a1>=R0){vis.push([a1,a2,d]);return;}if(a1<IZ)vis.push([a1,IZ,d,"cutR"]);if(a2>R0)vis.push([R0,a2,d,"cutL"]);});
  const rb=9.5*s;let S="",H="";
  vis.forEach(([a1,a2,d],i)=>{const r=d/2*s,p1=X(a1),p2=X(a2);S+=ln(p1,y-r,p2,y-r,"g")+ln(p1,y+r,p2,y+r,"g");
    if(a1>=L)H+=""; else H+='<rect x="'+F(p1)+'" y="'+F(y-r)+'" width="'+F(Math.max(0,p2-p1))+'" height="'+F(Math.max(0,r-rb))+'" class="ray2"/>';
    const pr=vis[i-1];if(!pr||pr[1]!==a1){if(a1===0)S+=ln(p1,y-r,p1,y+r,"g");}else{const r0=pr[2]/2*s;S+=ln(p1,y-Math.max(r,r0),p1,y-Math.min(r,r0),"g")+ln(p1,y+Math.min(r,r0),p1,y+Math.max(r,r0),"g");}
    if(a2===T)S+=ln(p2-0.8,y-r,p2,y-r+0.8,"g")+ln(p2-0.8,y+r,p2,y+r-0.8,"g")+ln(p2,y-r+0.8,p2,y+r-0.8,"g");});
  /* chaflanes 1x45 en la cabeza */
  /* rotura en S */
  if(roto){const lun=(bx,k,r)=>'M'+F(bx)+' '+F(y-r)+' C '+F(bx+3*k)+' '+F(y-r*0.5)+', '+F(bx-3*k)+' '+F(y+r*0.5)+', '+F(bx)+' '+F(y+r);
    const rI=(vis.find(v=>v[3]==="cutR")||[0,0,db])[2]/2*s,rD=(vis.find(v=>v[3]==="cutL")||[0,0,db])[2]/2*s;
    S+='<path d="'+lun(X(IZ),1,rI)+'" class="g"/><path d="'+lun(xr,1,rD)+'" class="g"/>';}
  /* taladro central, G1/2 trasero y tubo */
  const xIZ=roto?X(IZ):X(T);S+=ln(x0,y-10.5*s,x0+13*s,y-10.5*s,"oculta")+ln(x0,y+10.5*s,x0+13*s,y+10.5*s,"oculta")+ln(x0+13*s,y-10.5*s,x0+13*s,y+10.5*s,"oculta");
  S+=ln(x0+13*s,y-rb,xIZ-1,y-rb,"oculta")+ln(x0+13*s,y+rb,xIZ-1,y+rb,"oculta");if(roto)S+=ln(xr+1,y-6.5*s,X(T)-0.6,y-6.5*s,"oculta")+ln(xr+1,y+6.5*s,X(T)-0.6,y+6.5*s,"oculta");
  /* juntas tóricas (cotas desde la cara trasera) */
  J.forEach(j=>{if(j<IZ||!roto){const xx=X(j);S+='<rect x="'+F(xx-0.6)+'" y="'+F(y-rb-0.6)+'" width="1.2" height="1.2" class="fino"/><rect x="'+F(xx-0.6)+'" y="'+F(y+rb-0.6)+'" width="1.2" height="1.2" class="fino"/>';}});
  /* refrigeración G1/4 */
  Rf.forEach(q=>{const xx=X(q),r=db/2*s;S+=ln(xx-4*s,y+r,xx-4*s,y+r-14*s,"oculta")+ln(xx+4*s,y+r,xx+4*s,y+r-14*s,"oculta")+ln(xx-1.5*s,y+r-14*s,xx-1.5*s,y+rb,"oculta")+ln(xx+1.5*s,y+r-14*s,xx+1.5*s,y+rb,"oculta")+tx(xx+5,y+r-1.2,"G1/4″","isoS","start");});
  /* caras paralelas / entrecaras */
  const fa=df?L-lf+12:L-90,fb=df?L-lf+42:L-60;if(!roto||fa>=R0){const hr=Math.min(+String(g.ec).match(/\d+(\.\d+)?/)?.[0]||db,df||db)/2*s;S+='<rect x="'+F(X(fa))+'" y="'+F(y-hr)+'" width="'+F(X(fb)-X(fa))+'" height="'+F(2*hr)+'" class="fino"/>'+ln(X(fa),y-hr,X(fb),y+hr,"fino")+ln(X(fa),y+hr,X(fb),y-hr,"fino");}
  /* pasador Ø8 */
  if(df){const xp=X(L-30),yp=y-(df/2*s)*0.55;S+='<circle cx="'+F(xp)+'" cy="'+F(yp)+'" r="1.6" class="rayado"/>'+tx(xp-2.4,yp+0.7,"Ø8 Pasador","isoXS","end");}
  /* eje de simetría */
  S+=ln(x0-5,y,X(T)+4,y,"eje");
  /* cotas */
  const rMax=Math.max(Dc,Ds,db,df)/2*s,yT=y-rMax,yb=y+rMax;
  J.slice().sort((a,b)=>b-a).forEach((j,i)=>{S+=cotaH(X(0),X(j),yT-5-(J.length-1-i)*5.5,j+"±0.5",yT-0.5);});
  S+=cotaH(X(0),X(lc),yb+7,lc+" "+(g.tlc||""),y+Dc/2*s+0.5);
  Rf.forEach((q,i)=>{S+=cotaH(X(0),X(q),yb+13+i*6,q+"±0.5",yb+0.5);});const rowL=yb+13+Math.max(1,Rf.length)*6;
  S+=cotaH(X(0),X(L),rowL,L+" ±0.5",yb+0.5);if(+g.T)S+=cotaH(X(0),X(T),rowL+7,T+" ±0.5",yb+0.5);
  S+=cotaH(X(L),X(T),yb+7,String(Math.round((T-L)*10)/10),y+rt*s+0.5);
  /* diámetros (verticales) */
  S+=ln(x0-0.5,y-Dc/2*s,x0-14,y-Dc/2*s,"fino")+ln(x0-0.5,y+Dc/2*s,x0-14,y+Dc/2*s,"fino")+cotaV(x0-12,y-Dc/2*s,y+Dc/2*s,"Ø"+Dc+" "+(g.tDc||""));
  S+=cotaV(x0-5,y-10.5*s,y+10.5*s,"G1/2″");
  if(Ds){const xx=X(lc+(ls-lc)*0.5);S+=cotaV(xx,y-Ds/2*s,y+Ds/2*s,"Ø"+Ds+" "+(g.tDs||""));}
  {const xx=X(Math.min(IZ-12,Math.max(...J,ls||0,lc)+14));S+=cotaV(xx,y-db/2*s,y+db/2*s,"Ø"+db+" "+(g.tdb||""));}
  if(df){const xx=X(L-8);S+=cotaV(xx,y-df/2*s,y+df/2*s,"Ø"+df+" "+(g.tdf||""));}
  const xe=X(T);S+=ln(xe+0.5,y-rt*s,xe+8,y-rt*s,"fino")+ln(xe+0.5,y+rt*s,xe+8,y+rt*s,"fino")+cotaV(xe+6,y-rt*s,y+rt*s,g.rosca);
  S+=tx(X(L+16),y+23*s+3.2,"Ø46 -0.03/-0.06","isoXS");
  /* texto de caras paralelas */
  S+=tx(X(fa),y-(df||db)/2*s-2,(g.ec?String(g.ec)+" e.c. ("+(g.caras||2)+" caras paralelas)":""),"isoS","start");
  /* vista frontal */
  const cx=258,cy=y-4,sE=Math.min(0.4,40/Dc),R=Dc/2*sE;let V='<circle cx="'+cx+'" cy="'+F(cy)+'" r="'+F(R)+'" class="g"/><circle cx="'+cx+'" cy="'+F(cy)+'" r="'+F((df||db)/2*sE)+'" class="fino"/><circle cx="'+cx+'" cy="'+F(cy)+'" r="'+F(23*sE)+'" class="g"/><circle cx="'+cx+'" cy="'+F(cy)+'" r="'+F(19*sE)+'" class="fino"/><circle cx="'+cx+'" cy="'+F(cy)+'" r="'+F(6.5*sE)+'" class="g"/>';
  const ecn=+String(g.ec).match(/\d+(\.\d+)?/)?.[0]||0;if(ecn){const h=ecn/2*sE,rr=(df||db)/2*sE;if(h<rr){const w=Math.sqrt(rr*rr-h*h);V+=ln(cx-h,cy-w,cx-h,cy+w,"g")+ln(cx+h,cy-w,cx+h,cy+w,"g");if(+g.caras===4)V+=ln(cx-w,cy-h,cx+w,cy-h,"g")+ln(cx-w,cy+h,cx+w,cy+h,"g");
    V+=cotaH(cx-h,cx+h,cy-R-4,String(g.ec)+" e.c.",cy-w-0.5);}}
  V+=ln(cx-R-3,cy,cx+R+3,cy,"eje")+ln(cx,cy-R-3,cx,cy+R+3,"eje");
  /* tubo de latón */
  const ty=158,tx0=22,tl=Math.min(120,(+g.tubo||800)*0.13);let Tb="";if(+g.tubo){Tb+=ln(tx0,ty-1.3,tx0+tl,ty-1.3,"g")+ln(tx0,ty+1.3,tx0+tl,ty+1.3,"g")+ln(tx0,ty-1.3,tx0,ty+1.3,"g")+ln(tx0+tl,ty-1.3,tx0+tl,ty+1.3,"g")+ln(tx0-3,ty,tx0+tl+3,ty,"eje")
    +ln(tx0+tl*0.55,ty-3,tx0+tl*0.55-1.5,ty+3,"fino")+ln(tx0+tl*0.55+1.5,ty-3,tx0+tl*0.55,ty+3,"fino")+cotaH(tx0,tx0+tl,ty+8,String(g.tubo),ty+1.6)+tx(tx0,ty-4.5,"Tubo de latón Ø10 (extremo Ø7.5-8, 30°)","isoS","start");}
  /* notas */
  let N="";const wrap=(t,n)=>{const o=[];let c="";String(t).split(" ").forEach(w=>{if((c+" "+w).trim().length>n){o.push(c.trim());c=w;}else c+=" "+w;});if(c.trim())o.push(c.trim());return o;};
  const nl=[].concat(g.nota?[[g.nota,"isoN"]]:[],...(g.extra?wrap(g.extra,95).map(t=>[[t,"isoS"]]):[]));nl.forEach(([t,c],i)=>{N+=tx(16,128+i*(c==="isoN"?6:4.2),t,c,"start");});
  /* medidas garantizadas */
  const cg=g.garant===false?[]:cotasEje(g),bx=226,by=96,bw=63,bh=7+cg.length*4.4;let B=!cg.length?'':'<rect x="'+bx+'" y="'+by+'" width="'+bw+'" height="'+F(bh)+'" class="c"/>'+tx(bx+bw/2,by+4.6,"Medidas garantizadas por el proveedor","isoS");
  cg.forEach((c,i)=>{const t=c.n==="Ø46"?"Ø46 "+c.v:c.n.startsWith("Ø")?c.v:(c.n==="Rosca"?"Rosca ":"Cota ")+c.v;B+=tx(bx+6,by+9.6+i*4.4,t,"isoS","start");});
  /* cajetín */
  const maqs=inyDe(a).map(z=>"F"+z.replace(/^F/,""));const titulo="Eje de inyección "+(g.tipo||a.ref||"")+(maqs.length?" ("+maqs.join(",")+")":"");
  const cx0=164,cy0=158,W=125,c1=7,c2=60,c3=92,H1=4.2;let C="";
  const row=(yy,h)=>'<rect x="'+cx0+'" y="'+F(yy)+'" width="'+W+'" height="'+F(h)+'" class="c"/>';
  C+=row(cy0,H1)+row(cy0+H1,H1);[c1,c2,c3].forEach(c=>{C+=ln(cx0+c,cy0,cx0+c,cy0+2*H1,"c");});
  C+=tx(cx0+3.5,cy0+3.2,"1","isoC")+tx(cx0+c1+2,cy0+3.2,"Eje de inyección","isoC","start")+tx(cx0+c2+2,cy0+3.2,(g.mat||"").slice(0,18),"isoC","start")+tx(cx0+c3+1.5,cy0+3.1,(a.cod||"")+" · "+revTxt(rev.n),"isoR","start");
  C+=tx(cx0+3.5,cy0+H1+3.2,"N.º","isoS")+tx(cx0+c1+2,cy0+H1+3.2,"Denominación","isoS","start")+tx(cx0+c2+2,cy0+H1+3.2,"Material","isoS","start")+tx(cx0+c3+2,cy0+H1+3.2,"Observaciones","isoS","start");
  const yB=cy0+2*H1,hB=14;C+=row(yB,hB);const g1=16,g2=27,g3=38,g4=50;
  C+=ln(cx0+g1,yB,cx0+g1,yB+hB,"c")+ln(cx0+g2,yB,cx0+g2,yB+hB,"c")+ln(cx0+g3,yB,cx0+g3,yB+hB,"c")+ln(cx0+g4,yB,cx0+g4,yB+hB,"c")+ln(cx0,yB+4,cx0+g4,yB+4,"c")+ln(cx0,yB+9,cx0+g4,yB+9,"c");
  C+=tx(cx0+g1+5.5,yB+2.9,"Proyectado","isoXS")+tx(cx0+g2+5.5,yB+2.9,"Dibujado","isoXS")+tx(cx0+g3+6,yB+2.9,"Comprobado","isoXS");
  C+=tx(cx0+1.5,yB+7.6,"Fechas","isoS","start")+tx(cx0+1.5,yB+12.6,"Firmas","isoS","start")+tx(cx0+g2+5.5,yB+7.6,fmtF(rev.f),"isoXS")+tx(cx0+g2+5.5,yB+12.6,(rev.by||"").slice(0,12),"isoXS");
  const xr0=cx0+97;C+=ln(xr0,yB,xr0,yB+hB,"c")+ln(xr0+4,yB,xr0+4,yB+hB,"c")+ln(xr0+4,yB+hB/3,cx0+W,yB+hB/3,"c")+ln(xr0+4,yB+2*hB/3,cx0+W,yB+2*hB/3,"c")+txV(xr0+2.9,yB+hB/2,"Referencia","isoXS");
  C+=tx(xr0+5,yB+3.6,a.cod||"","isoS","start")+tx(xr0+5,yB+8.3,revTxt(rev.n),"isoS","start")+tx(xr0+5,yB+13,(a.ref||"").slice(0,16),"isoXS","start");
  const lx=cx0+g4+6,ly=yB+hB/2;C+='<circle cx="'+F(lx)+'" cy="'+F(ly)+'" r="3.3" style="fill:#333;stroke:none"/><circle cx="'+F(lx+1.3)+'" cy="'+F(ly)+'" r="1.9" style="fill:#fff;stroke:none"/><rect x="'+F(lx+1.3)+'" y="'+F(ly-0.7)+'" width="2.4" height="1.4" style="fill:#fff;stroke:none"/>'+tx(lx+5,ly+1.4,"CIE Inyectametal","isoC","start");
  const yC=yB+hB,hC=14;C+=row(yC,hC)+ln(cx0+16,yC,cx0+16,yC+hC,"c")+ln(xr0,yC,xr0,yC+hC,"c")+ln(xr0,yC+hC/2,cx0+W,yC+hC/2,"c");
  const tf=titulo.length>46?"isoTx":titulo.length>34?"isoTs":"isoT";C+=tx(cx0+1.5,yC+3.6,"Escala:","isoS","start")+tx(cx0+8,yC+10.8,"S/E","isoT")+tx(cx0+18.5,yC+9.4,titulo,tf,"start");
  C+=tx(xr0+1.5,yC+4.6,"N.º "+(g.nplano||a.cod||""),"isoS","start")+tx(xr0+1.5,yC+11.6,rev.antes?"Anula al "+revTxt(rev.antes):"Anula al —","isoS","start");
  /* tabla de modificaciones: las del papel y las de la app */
  const filas=(g.papel||[]).map(p=>[p.n,p.t,p.f,p.by||""]).concat((hist||[]).filter(h=>h.n>1).slice(-3).map(h=>[String(h.n).padStart(2,"0"),h.cambio||"",fmtF(h.f),h.by||""]));
  let Rv="";if(filas.length){const hF=4.4,y1=cy0-(filas.length+1)*hF;Rv+='<rect x="'+cx0+'" y="'+F(y1)+'" width="'+W+'" height="'+F((filas.length+1)*hF)+'" class="c"/>';
    filas.concat([["Nº","Clase de modificación","Fecha","Nombre"]]).forEach((f,i)=>{const yy=y1+i*hF;if(i)Rv+=ln(cx0,yy,cx0+W,yy,"c");const cl=i===filas.length?"isoXS":"isoS";
      Rv+=tx(cx0+3.5,yy+3.2,f[0],cl)+tx(cx0+c1+1.5,yy+3.2,String(f[1]).slice(0,58),cl,"start")+tx(cx0+101,yy+3.2,f[2],cl,"middle")+tx(cx0+115,yy+3.2,String(f[3]).slice(0,10),cl,"middle");});
    Rv+=ln(cx0+c1,y1,cx0+c1,cy0,"c")+ln(cx0+94,y1,cx0+94,cy0,"c")+ln(cx0+108,y1,cx0+108,cy0,"c");}
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210" width="297mm" height="210mm" font-family="\'Arial Narrow\', Arial, Helvetica, sans-serif" font-size="3.2"><style>line,path,circle,rect{stroke:#222;stroke-width:0.22;fill:none}.g{stroke-width:0.5;stroke:#111}.fino{stroke-width:0.17}.cota{stroke-width:0.17;marker-start:url(#fl);marker-end:url(#fl)}.oculta{stroke-dasharray:1.4 0.7;stroke-width:0.25}.eje{stroke-dasharray:7 1 1 1;stroke-width:0.16}.c{stroke-width:0.3}.rayado{fill:url(#ray);stroke-width:0.3}.ray2{fill:url(#ray2);stroke:none}text{fill:#111;stroke:none}.num{font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:2.7}.isoN,.isoC,.isoS,.isoXS,.isoT,.isoTs,.isoTx,.isoR{font-style:italic;font-family:\'Century Gothic\',\'Segoe UI\',Arial,sans-serif;font-weight:300}.isoN{font-size:4.2;letter-spacing:0.2}.isoC{font-size:3.3}.isoS{font-size:2.6}.isoXS{font-size:2}.isoT{font-size:4.6}.isoTs{font-size:3.6}.isoTx{font-size:2.9}.isoR{font-size:3;fill:#b00;font-weight:bold}</style><defs><marker id="fl" viewBox="0 0 8 6" refX="8" refY="3" markerWidth="4.5" markerHeight="3.4" orient="auto-start-reverse"><path d="M0 0.6 L8 3 L0 5.4 z" style="fill:#111;stroke:none"/></marker><pattern id="ray" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.4" style="stroke:#111;stroke-width:0.25"/></pattern><pattern id="ray2" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="2.6" style="stroke:#555;stroke-width:0.16"/></pattern></defs><rect x="0" y="0" width="297" height="210" style="fill:#fff;stroke:none"/><rect x="8" y="8" width="281" height="194" class="c"/>'+H+S+V+Tb+N+B+Rv+C+'</svg>';}
/* campos del formulario de medidas del eje */
function camposEje(g,pinta){const num=(id,lab,k)=>fld(lab,inp(id,g[k],z=>{const q=parseN(z);if(isFinite(q)&&q>=0){g[k]=q;pinta();}},{inputmode:"decimal",class:"num"}));
  const txt=(id,lab,k,ph)=>fld(lab,inp(id,Array.isArray(g[k])?g[k].join(", "):g[k],z=>{g[k]=Array.isArray(g[k])?lstN(z):z;pinta();},{autocomplete:"off",placeholder:ph||""}));
  return[el("div",{class:"row"},[num("geL","Cota importante (±0.5)","L"),num("geT","Cota total (±0.5)","T")]),
    el("div",{class:"row"},[num("geDc","Ø cabeza","Dc"),txt("getDc","Tolerancia","tDc")]),
    el("div",{class:"row"},[num("gelc","Cota cabeza","lc"),txt("getlc","Tolerancia","tlc")]),
    el("div",{class:"row"},[num("gedb","Ø cuerpo","db"),txt("getdb","Tolerancia","tdb")]),
    el("div",{class:"row"},[num("gedf","Ø delantero (0 = no tiene)","df"),txt("geec","Entrecaras (e.c.)","ec")]),
    el("div",{class:"row"},[num("geDs","Ø escalón (0 = no tiene)","Ds"),num("gels","Largo hasta fin del escalón","ls")]),
    el("div",{class:"row"},[txt("geJ","Cotas de juntas","juntas","125, 135, 150"),txt("geRf","Refrigeración G1/4","refr","112")]),
    el("div",{class:"row"},[txt("geR","Rosca","rosca"),num("geTb","Largo tubo latón","tubo")]),
    el("div",{class:"row"},[txt("geM","Material","mat"),txt("geTi","Tipo (título)","tipo","STP 900")]),
    txt("geN","Nota en el plano (opcional)","nota")];}
/* ===== EDITOR DE PLANOS: marcar encima del plano vigente (tapar cotas, escribir, flechas, recuadros, lápiz) ===== */
function cargarPdfJs(){if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);return new Promise((ok,ko)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  s.onload=()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";ok(window.pdfjsLib);};s.onerror=()=>ko(new Error("No se pudo cargar el lector de PDF"));document.head.appendChild(s);});}
async function baseDePlano(doc){let bl;if(doc.blobFn)bl=await doc.blobFn();else{const u=await (window.urlFirmada?window.urlFirmada(doc.id):fotoUrl(doc.id));if(!u)throw new Error("No se pudo abrir el plano");bl=await (await fetch(u)).blob();}
  if(/pdf/i.test(bl.type||doc.tipo||"")||/\.pdf$/i.test(doc.nombre||"")){const L=await cargarPdfJs();const pdf=await L.getDocument({isEvalSupported:false,data:await bl.arrayBuffer()}).promise;const pg=await pdf.getPage(1);
    const v0=pg.getViewport({scale:1});const sc=Math.min(3,3000/Math.max(v0.width,v0.height));const vp=pg.getViewport({scale:sc});const c=document.createElement("canvas");c.width=Math.round(vp.width);c.height=Math.round(vp.height);
    const cx=c.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,c.width,c.height);await pg.render({canvasContext:cx,viewport:vp}).promise;return c;}
  return await createImageBitmap(bl);}
/* abre el editor; sello(): líneas del cajetín de revisión que se añaden al guardar; devuelve un Blob JPEG o null */
function editarPlano(doc,sello){return new Promise(async res=>{
  const ov=el("div",{class:"pe",role:"dialog","aria-modal":"true","aria-label":"Modificar plano"});const cargando=el("div",{class:"pe-msg",text:"Abriendo el plano…"});ov.appendChild(cargando);document.body.appendChild(ov);
  let base;try{base=await baseDePlano(doc);}catch(e){cargando.textContent=(e&&e.message)||"No se pudo abrir el plano";setTimeout(()=>{ov.remove();res(null);},2200);return;}
  cargando.remove();const W=base.width,H=base.height,U=Math.max(W,H)/600;
  const st={tool:"tapa",col:"#d00000",tam:2,shapes:[],cur:null,s:1,ox:0,oy:0};
  const cv=el("canvas",{class:"pe-cv"}),cx=cv.getContext("2d");
  const btn=(t,fn,on,tit)=>el("button",{type:"button",class:"pe-b"+(on?" on":""),text:t,title:tit||t,onclick:fn});
  const bar=el("div",{class:"pe-bar"}),bar2=el("div",{class:"pe-bar"});
  const TOOLS=[["mover","✋ Mover"],["tapa","⬜ Tapar"],["texto","T Texto"],["flecha","↗ Flecha"],["rect","▭ Recuadro"],["lapiz","✎ Lápiz"]];
  function pintaBar(){bar.textContent="";TOOLS.forEach(([k,t])=>bar.appendChild(btn(t,()=>{st.tool=k;pintaBar();},st.tool===k)));
    bar2.textContent="";[["#d00000","Rojo"],["#0b4ea2","Azul"],["#000000","Negro"]].forEach(([c,t])=>bar2.appendChild(el("button",{type:"button",class:"pe-b pe-col"+(st.col===c?" on":""),style:"--c:"+c,text:t,onclick:()=>{st.col=c;pintaBar();}})));
    [[1,"Fino"],[2,"Medio"],[3,"Grueso"]].forEach(([k,t])=>bar2.appendChild(btn(t,()=>{st.tam=k;pintaBar();},st.tam===k)));
    bar2.appendChild(btn("↶ Deshacer",()=>{st.shapes.pop();draw();},false));
    bar2.appendChild(el("span",{class:"pe-sp"}));
    bar2.appendChild(btn("Cancelar",()=>{if(st.shapes.length&&!confirm("¿Salir sin guardar las marcas?"))return;fin(null);},false));
    bar2.appendChild(el("button",{type:"button",class:"pe-b pe-ok",text:"Guardar",onclick:guardar}));}
  const ayuda=el("div",{class:"pe-help",text:"Tapar: arrastra sobre la cota vieja. Texto: toca donde escribir. Con dos dedos (o la rueda del ratón) acercas y alejas; con «Mover» desplazas."});
  ov.appendChild(bar);ov.appendChild(bar2);ov.appendChild(cv);ov.appendChild(ayuda);pintaBar();
  function ajustar(){const r=cv.getBoundingClientRect(),d=window.devicePixelRatio||1;cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d);}
  function encajar(){ajustar();st.s=Math.min(cv.width/W,cv.height/H);st.ox=(cv.width-W*st.s)/2;st.oy=(cv.height-H*st.s)/2;draw();}
  const lw=()=>Math.max(1.5,U*(st.tam===1?0.6:st.tam===2?1.2:2.2));
  function pintaForma(c,f){c.save();c.strokeStyle=c.fillStyle=f.c||"#000";c.lineWidth=f.lw||2;c.lineCap=c.lineJoin="round";
    if(f.t==="tapa"){c.fillStyle="#ffffff";c.fillRect(f.x,f.y,f.w,f.h);}
    else if(f.t==="rect"){c.strokeRect(f.x,f.y,f.w,f.h);}
    else if(f.t==="flecha"){c.beginPath();c.moveTo(f.x1,f.y1);c.lineTo(f.x2,f.y2);c.stroke();const a=Math.atan2(f.y2-f.y1,f.x2-f.x1),L=f.lw*5;c.beginPath();c.moveTo(f.x2,f.y2);c.lineTo(f.x2-L*Math.cos(a-0.45),f.y2-L*Math.sin(a-0.45));c.lineTo(f.x2-L*Math.cos(a+0.45),f.y2-L*Math.sin(a+0.45));c.closePath();c.fill();}
    else if(f.t==="lapiz"){c.beginPath();f.p.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke();}
    else if(f.t==="texto"){c.font="bold "+f.s+"px Arial, sans-serif";c.textBaseline="top";String(f.txt).split("\n").forEach((l,i)=>c.fillText(l,f.x,f.y+i*f.s*1.15));}
    c.restore();}
  function draw(){cx.setTransform(1,0,0,1,0,0);cx.fillStyle="#9aa3a0";cx.fillRect(0,0,cv.width,cv.height);cx.setTransform(st.s,0,0,st.s,st.ox,st.oy);cx.drawImage(base,0,0);
    st.shapes.forEach(f=>pintaForma(cx,f));if(st.cur)pintaForma(cx,st.cur);}
  const aImg=e=>{const r=cv.getBoundingClientRect(),d=cv.width/r.width;return[((e.clientX-r.left)*d-st.ox)/st.s,((e.clientY-r.top)*d-st.oy)/st.s];};
  const P=new Map();let pin=null,ini=null;
  function zoomEn(px,py,k){const ns=Math.max(0.05,Math.min(20,st.s*k));st.ox=px-(px-st.ox)*(ns/st.s);st.oy=py-(py-st.oy)*(ns/st.s);st.s=ns;draw();}
  cv.addEventListener("wheel",e=>{e.preventDefault();const r=cv.getBoundingClientRect(),d=cv.width/r.width;zoomEn((e.clientX-r.left)*d,(e.clientY-r.top)*d,e.deltaY<0?1.15:1/1.15);},{passive:false});
  cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);P.set(e.pointerId,[e.clientX,e.clientY]);
    if(P.size===2){st.cur=null;const[a,b]=[...P.values()];pin={d:Math.hypot(a[0]-b[0],a[1]-b[1]),m:[(a[0]+b[0])/2,(a[1]+b[1])/2]};return;}
    const[x,y]=aImg(e);ini={x,y,cx:e.clientX,cy:e.clientY,ox:st.ox,oy:st.oy};
    if(st.tool==="texto"){const t=prompt("Texto a escribir (p. ej. 505±0.5)");if(t&&t.trim())st.shapes.push({t:"texto",x,y,s:Math.round(U*(st.tam===1?9:st.tam===2?13:19)),txt:t.trim(),c:st.col});ini=null;P.delete(e.pointerId);draw();return;}
    if(st.tool==="lapiz")st.cur={t:"lapiz",p:[[x,y]],c:st.col,lw:lw()};});
  cv.addEventListener("pointermove",e=>{if(!P.has(e.pointerId))return;P.set(e.pointerId,[e.clientX,e.clientY]);
    if(P.size===2&&pin){const[a,b]=[...P.values()];const d=Math.hypot(a[0]-b[0],a[1]-b[1]),m=[(a[0]+b[0])/2,(a[1]+b[1])/2];const r=cv.getBoundingClientRect(),k=cv.width/r.width;
      st.ox+=(m[0]-pin.m[0])*k;st.oy+=(m[1]-pin.m[1])*k;zoomEn((m[0]-r.left)*k,(m[1]-r.top)*k,d/pin.d);pin={d,m};return;}
    if(!ini)return;const[x,y]=aImg(e);
    if(st.tool==="mover"){const r=cv.getBoundingClientRect(),k=cv.width/r.width;st.ox=ini.ox+(e.clientX-ini.cx)*k;st.oy=ini.oy+(e.clientY-ini.cy)*k;draw();return;}
    if(st.tool==="tapa"||st.tool==="rect")st.cur={t:st.tool,x:Math.min(ini.x,x),y:Math.min(ini.y,y),w:Math.abs(x-ini.x),h:Math.abs(y-ini.y),c:st.col,lw:lw()};
    else if(st.tool==="flecha")st.cur={t:"flecha",x1:ini.x,y1:ini.y,x2:x,y2:y,c:st.col,lw:lw()};
    else if(st.tool==="lapiz"&&st.cur)st.cur.p.push([x,y]);
    draw();});
  const suelta=e=>{P.delete(e.pointerId);if(P.size<2)pin=null;if(P.size)return;
    if(st.cur){const f=st.cur;const ok=(f.t==="tapa"||f.t==="rect")?f.w>2&&f.h>2:f.t==="flecha"?Math.hypot(f.x2-f.x1,f.y2-f.y1)>4:f.t==="lapiz"?f.p.length>1:true;if(ok)st.shapes.push(f);st.cur=null;}ini=null;draw();};
  cv.addEventListener("pointerup",suelta);cv.addEventListener("pointercancel",suelta);
  const rz=()=>{const s0=st.s;ajustar();draw();};window.addEventListener("resize",rz);
  function fin(v){window.removeEventListener("resize",rz);ov.remove();res(v);}
  async function guardar(){if(!st.shapes.length&&!confirm("No has marcado nada. ¿Guardar el plano igual, solo con el sello de la revisión?"))return;
    const c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,W,H);g.drawImage(base,0,0);st.shapes.forEach(f=>pintaForma(g,f));
    const L=(sello&&sello())||[];if(L.length){const fs=Math.round(U*8),pad=fs*0.6;g.font="bold "+fs+"px Arial, sans-serif";const w=Math.max(...L.map(l=>g.measureText(l).width))+pad*2,h=L.length*fs*1.3+pad*2;
      const x=U*6,y=U*6;g.fillStyle="rgba(255,255,255,0.95)";g.fillRect(x,y,w,h);g.strokeStyle="#d00000";g.lineWidth=Math.max(2,U*0.8);g.strokeRect(x,y,w,h);g.fillStyle="#d00000";g.textBaseline="top";L.forEach((l,i)=>g.fillText(l,x+pad,y+pad+i*fs*1.3));}
    c.toBlob(b=>fin(b),"image/jpeg",0.92);}
  requestAnimationFrame(encajar);});}
/* --- pedido al proveedor con el plano vigente --- */
const pedidosBT=()=>cat.pedidosBT||[];
async function urlLarga(id){try{const r=await window.sbColada.storage.from("albaranes").createSignedUrl(id,3600*24*30);return r.data&&r.data.signedUrl;}catch(e){return window.urlFirmada?await window.urlFirmada(id):null;}}
function pedidoBT(f){const A=artsBT(f);if(!A.length){toast("No hay referencias");return;}
  const provId=(cat.ajustes||{}).provBT||(cat.proveedores.find(p=>/meyusa/i.test(p.nom))||{}).id||(A.find(a=>a.prov)||{}).prov||"";
  const st={prov:provId,email:"",q:{}};const pv=()=>cat.proveedores.find(p=>p.id===st.prov)||{};st.email=pv().email||"";
  A.forEach(a=>{const c=cantPedir(a);if(c>0)st.q[a.id]=String(c);});
  const ta=el("textarea",{readonly:true,style:"min-height:170px;font-size:13px"}),lst=el("div",{class:"lst"}),emI=inp("pbE",st.email,z=>{st.email=z.trim();},{type:"email",inputmode:"email",autocomplete:"off",placeholder:"correo del proveedor"});
  const lineas=()=>A.filter(a=>parseN(st.q[a.id])>0).map(a=>({a,cant:parseN(st.q[a.id]),rev:revVig(a)}));
  const texto=()=>{const L=lineas();return["Hola,","","Os hacemos el siguiente pedido de "+BT[f].nom.toLowerCase()+":",""].concat(L.map(l=>"- "+(l.a.cod||l.a.desc)+": "+fmtN(l.cant)+" ud"+(l.rev?" · según plano "+revTxt(l.rev.n)+(l.rev.n>1?" (actualizado el "+fmtF(l.rev.f)+")":"")+((l.rev.cotas||[]).length?" · cotas críticas: "+cotasTxt(l.rev.cotas):""):" · SIN PLANO"))).concat(["","Os adjuntamos los planos vigentes. Por favor, fabricad según la revisión indicada.","","Un saludo,",quienSoy()||"MAPRI"]).join("\n");};
  const pinta=()=>{ta.value=texto();};
  A.forEach(a=>{const v=revVig(a);lst.appendChild(el("div",{class:"it",style:"cursor:default"},[el("div",{class:"ppal"},[el("div",{class:"t1",text:nomBT(a)}),el("div",{class:"t2",text:["hay "+fmtN(stockDe(a.id)),v?revTxt(v.n):"sin plano",a.pedido?"ya pedida el "+fmtF(a.pedido):null].filter(Boolean).join(" · ")})]),
    inp("pbQ"+a.id,st.q[a.id]||"",z=>{st.q[a.id]=z;pinta();},{inputmode:"numeric",class:"num",placeholder:"0",style:"width:64px;padding:7px 6px;font-size:16px","aria-label":"Cantidad "+(a.cod||a.desc)})]));});
  pinta();
  const registrar=async(via)=>{const L=lineas();if(!L.length){toast("Pon alguna cantidad");return false;}const hy=hoy();
    if(st.email&&st.email!==(pv().email||"")){const p=cat.proveedores.find(z=>z.id===st.prov);if(p)p.email=st.email;}
    cat.ajustes=Object.assign({},cat.ajustes,{provBT:st.prov});
    cat.pedidosBT=pedidosBT().concat([{id:uid(),f:hy,prov:st.prov,email:st.email||null,via,by:quienSoy()||null,lin:L.map(l=>({art:l.a.id,cod:l.a.cod||l.a.desc,cant:l.cant,rev:l.rev?l.rev.n:null}))}]);
    L.forEach(l=>{const z=art(l.a.id);z.pedido=hy;z.pedCant=l.cant;z.pedRev=l.rev?l.rev.n:null;const pl=plazoArt(z);z.prevista=pl?sumaDias(hy,pl):null;});
    await saveCat();return true;};
  const archivos=async()=>{const out=[];for(const l of lineas()){if(l.rev&&l.rev.gen){try{const b=await blobPlano(l.a,l.rev,"image/png");out.push(new File([b],(l.a.cod||"plano")+"_"+revTxt(l.rev.n).replace(". ","")+".png",{type:"image/png"}));}catch(e){}continue;}if(!l.rev||!l.rev.doc)continue;const u=await (window.urlFirmada?window.urlFirmada(l.rev.doc.id):null);if(!u)continue;const b=await (await fetch(u)).blob();
    const ext=(l.rev.doc.nombre.match(/\.[a-z0-9]+$/i)||[""])[0]||(/pdf/.test(b.type)?".pdf":".jpg");out.push(new File([b],(l.a.cod||"plano")+"_"+revTxt(l.rev.n).replace(". ","")+ext,{type:b.type||l.rev.doc.tipo||"application/pdf"}));}return out;};
  const asunto=()=>"Pedido "+BT[f].nom.toLowerCase()+" MAPRI · "+fmtF(hoy());
  dlg("Pedido de "+BT[f].nom.toLowerCase(),[
    el("div",{class:"row"},[fld("Proveedor",sel("pbP",provOpts(),st.prov,z=>{st.prov=z;st.email=pv().email||"";emI.value=st.email;})),fld("Correo",emI)]),
    el("p",{class:"hint",text:"Pon la cantidad de cada código. Se propone lo que falta para el mínimo."}),lst,el("div",{class:"gh",style:"border-radius:6px",text:"Mensaje"}),ta,
    el("p",{class:"hint",text:"«Enviar con planos» abre el menú de compartir del móvil con los planos ya adjuntos (elige el correo). En el ordenador usa «Correo» y adjunta los planos que bajas con «Descargar planos». Al enviar queda apuntado el pedido con la revisión de cada plano."})],
    [{t:"Cancelar",cls:"sec"},
     {t:"Descargar planos",cls:"sec",fn:async()=>{const fs=await archivos();if(!fs.length){toast("Ningún código pedido tiene plano");return false;}for(const fl of fs){if(downloads)await downloads.save({filename:fl.name,data:fl});}toast(fs.length+" planos descargados");return false;}},
     {t:"Correo",cls:"sec",fn:async()=>{if(!lineas().length){toast("Pon alguna cantidad");return false;}
       const links=[];for(const l of lineas()){if(l.rev&&l.rev.doc){const u=await urlLarga(l.rev.doc.id);if(u)links.push((l.a.cod||"")+" "+revTxt(l.rev.n)+": "+u);}}
       const body=ta.value+(links.length?"\n\nPlanos (enlaces válidos 30 días):\n"+links.join("\n"):"");
       window.open("mailto:"+encodeURIComponent(st.email||"")+"?subject="+encodeURIComponent(asunto())+"&body="+encodeURIComponent(body),"_blank");
       if(await registrar("correo"))toast("Pedido apuntado");render(true);}},
     {t:"Enviar con planos",fn:async()=>{if(!lineas().length){toast("Pon alguna cantidad");return false;}const fs=await archivos();
       if(!(navigator.canShare&&navigator.canShare({files:fs.length?fs:[new File(["x"],"x.txt",{type:"text/plain"})]}))){toast("Este dispositivo no puede compartir archivos: usa «Correo» y «Descargar planos»");return false;}
       try{await navigator.share({title:asunto(),text:ta.value,files:fs});}catch(e){if(e&&e.name==="AbortError")return false;toast("No se pudo compartir");return false;}
       if(await registrar("compartir"))toast("Pedido apuntado");render(true);}}]);}

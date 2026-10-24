/* Gráficos de las apps (Apache ECharts, se carga solo cuando hace falta).
   GRAF.barras(contenedor, {x:[...], series:[{name, data:[...]}], apilado, horizontal, fmt:"eur"|"n"|"kg", alto, alClick(i)})
   GRAF.lineas(contenedor, {...igual, area:true})
   Colores de la paleta SAP Fiori; se adapta al modo oscuro y al ancho del móvil. */
(function(){
  if(window.GRAF)return;
  var LIB="https://cdnjs.cloudflare.com/ajax/libs/echarts/5.5.1/echarts.min.js",carga=null;
  function lib(){if(window.echarts)return Promise.resolve(window.echarts);
    if(!carga)carga=new Promise(function(ok,ko){var s=document.createElement("script");s.src=LIB;s.onload=function(){ok(window.echarts);};s.onerror=function(){carga=null;ko(new Error("No se pudo cargar la librería de gráficos"));};document.head.appendChild(s);});
    return carga;}
  var PAL=["#0070F2","#C87B00","#358A4D","#DF1278","#8B47D7","#049F9A","#E76500","#5D36FF","#798C77","#DA6C6C","#168EFF","#75980B"];
  function css(v,def){try{var x=getComputedStyle(document.documentElement).getPropertyValue(v).trim();return x||def;}catch(e){return def;}}
  function oscuro(){var t=document.documentElement.getAttribute("data-theme");if(t)return t==="dark";return window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches;}
  var nf=new Intl.NumberFormat("es-ES",{maximumFractionDigits:0}),nf1=new Intl.NumberFormat("es-ES",{maximumFractionDigits:1});
  function formato(f){return function(v){v=+v||0;if(f==="eur")return (Math.abs(v)>=10000?nf1.format(v/1000)+" mil":nf.format(v))+" €";
    if(f==="kg")return Math.abs(v)>=1000?nf1.format(v/1000)+" t":nf.format(v)+" kg";return nf.format(v);};}
  function formatoLargo(f){return function(v){v=+v||0;if(f==="eur")return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:v>=100?0:2}).format(v);
    if(f==="kg")return nf.format(v)+" kg";return nf1.format(v);};}
  var vivos=[];
  window.addEventListener("resize",function(){vivos=vivos.filter(function(c){return c.dom&&document.body.contains(c.dom);});vivos.forEach(function(c){c.ch.resize();});});
  function dibuja(box,o,tipo){
    box.textContent="";box.style.width="100%";box.style.height=(o.alto||(o.horizontal?Math.max(180,28*o.x.length+40):260))+"px";
    var aviso=document.createElement("div");aviso.textContent="Cargando gráfico…";aviso.style.cssText="font-size:13px;color:#888;padding:12px";box.appendChild(aviso);
    return lib().then(function(E){if(!document.body.contains(box)&&!box.isConnected)return null;box.textContent="";
      var ink=css("--ink",oscuro()?"#E5EEE8":"#1D2D3E"),mut=css("--mut",oscuro()?"#9aa":"#556b82"),line=css("--line2",css("--line",oscuro()?"#2A3830":"#E5E9E4"));
      var ch=E.init(box,null,{renderer:"svg"}),f=formato(o.fmt),fl=formatoLargo(o.fmt),estrecho=box.clientWidth<480;
      var ejeCat={type:"category",data:o.x,axisLine:{lineStyle:{color:line}},axisTick:{show:false},axisLabel:{color:mut,fontSize:11,hideOverlap:true,interval:o.horizontal?0:"auto",
        formatter:function(v){v=String(v);var m=o.horizontal?(estrecho?16:28):10;return v.length>m?v.slice(0,m-1)+"…":v;}}};
      var ejeVal={type:"value",splitLine:{lineStyle:{color:line}},axisLabel:{color:mut,fontSize:11,formatter:f}};
      var multi=o.series.length>1||!!o.leyenda;
      ch.setOption({color:o.colores||PAL,animationDuration:400,textStyle:{fontFamily:"Inter, system-ui, sans-serif"},
        grid:{left:8,right:16,top:multi?36:12,bottom:8,containLabel:true},
        legend:multi?{type:"scroll",top:0,left:0,textStyle:{color:ink,fontSize:12},icon:"circle",itemWidth:10,itemHeight:10}:undefined,
        tooltip:{trigger:"axis",axisPointer:{type:tipo==="line"?"line":"shadow"},confine:true,valueFormatter:fl,
          backgroundColor:oscuro()?"#223":"#fff",borderColor:line,textStyle:{color:ink,fontSize:12}},
        xAxis:o.horizontal?ejeVal:ejeCat,yAxis:o.horizontal?Object.assign({},ejeCat,{inverse:true}):ejeVal,
        series:o.series.map(function(s){return{name:s.name,type:tipo,data:s.data,stack:o.apilado?"t":undefined,barMaxWidth:28,
          smooth:tipo==="line",symbol:tipo==="line"?"circle":undefined,symbolSize:5,areaStyle:tipo==="line"&&o.area?{opacity:.12}:undefined,
          emphasis:{focus:"series"},itemStyle:tipo==="bar"?{borderRadius:o.apilado?0:(o.horizontal?[0,3,3,0]:[3,3,0,0])}:undefined};})});
      if(o.alClick)ch.on("click",function(p){o.alClick(p.dataIndex,p.seriesIndex);});
      vivos.push({ch:ch,dom:box});return ch;}).catch(function(e){aviso.textContent="No se ha podido cargar el gráfico (¿sin conexión?).";return null;});}
  window.GRAF={barras:function(b,o){return dibuja(b,o,"bar");},lineas:function(b,o){return dibuja(b,o,"line");},PAL:PAL,cargar:lib};
})();

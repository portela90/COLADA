/* Datos de prueba para la app de Limpieza (respuestas de las funciones rpc) */
const hoy='2026-10-21';
const W=[{id:'w1',nombre:'Cristian Portela',rol:'admin'},{id:'w2',nombre:'Abdoul kader Maiga',rol:'operario'},{id:'w3',nombre:'Ahmed El Hait',rol:'operario'},{id:'w4',nombre:'Josefa Ruiz',rol:'operario'}];
const ot=(i,t,est,nom,extra)=>Object.assign({id:'o'+i,titulo:t,descripcion:'',fecha:hoy,estado:est,equipo:'Semana',asignados:[nom==='Abdoul kader Maiga'?'w2':'w3'],nombres:[nom],prioridad:i%3===0?'alta':'normal',lugar:i%2?'Nave 1':'Nave 2',nave:i%2?'Nave 1':'Nave 2',minutos_est:30+i*5,nfotos:i%2,cubre:[],creado_por_n:'Cristian Portela'},extra||{});
const D=[ot(1,'Limpieza F25 y foso','pendiente','Abdoul kader Maiga'),ot(2,'Vaciar contenedores de viruta Nave 2','en_curso','Ahmed El Hait',{inicio:hoy+'T07:10:00Z'}),ot(3,'Cambiar bidón de taladrina Ecocool','hecha','Abdoul kader Maiga',{inicio:hoy+'T06:30:00Z',fin:hoy+'T06:50:00Z',minutos:20,hecho_por_n:'Abdoul kader Maiga'}),ot(4,'Barrer pasillo central Nave 1','pendiente','Ahmed El Hait'),ot(5,'Limpiar hornos mantenedores F51-F56','pendiente','Abdoul kader Maiga'),ot(6,'Recoger sacas blancas','pendiente','Ahmed El Hait')];
const R={ots_dia:{dia:D,atrasadas:[ot(9,'Limpiar canaleta F33','pendiente','Ahmed El Hait',{fecha:'2026-10-20'})],ausencias:[],extras:[],mi_horario:[["06:00","14:00"]],plantilla:W.slice(1).map(w=>({id:w.id,nombre:w.nombre,tramos:[["06:00","14:00"]]}))},
 lista_trabajadores:W.map(w=>Object.assign({tiene_pin:true},w)),avisos_activos:[{titulo:'Viernes: limpieza general de vestuarios',descripcion:'Todo el equipo de tarde'}],extra_lista:[],horas_dia_leer:[],resp_hornos_yo:null,consumos_dia:{fecha:hoy,lineas:[],resumen:[],dest:{}},prl_pendientes:[],push_clave:'x'};

const hor={lunes:[["06:00","14:00"]],martes:[["06:00","14:00"]],miercoles:[["06:00","14:00"]],jueves:[["06:00","14:00"]],viernes:[["06:00","14:00"]],sabado:[],domingo:[]};
R.trabajadores_admin=W.map((w,i)=>Object.assign({email:null,naves:[],notas:null,activo:true,avisos:i%2==0,equipos:['Semana'],horario:hor,jornada:'completa',telefono:'600000000',categoria:'Peón',tiene_pin:i!==3,turno_finde:null,turno_semana:'Mañana',horas_contrato:40},w));
R.trabajadores_gestor=R.trabajadores_admin;
const wk=['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23'];
R.semana={ots:wk.flatMap((f,j)=>D.slice(0,4).map(o=>Object.assign({},o,{id:o.id+'_'+j,fecha:f,estado:j<2?'hecha':o.estado,tipo:o.titulo}))),gente:W.slice(1).map(w=>({id:w.id,nombre:w.nombre,equipos:['Semana'],horario:hor})),extras:[],faltas:[]};
R.sust_lista=[{id:'s1',nota:'',desde:'2026-10-20',hasta:'2026-10-23',motivo:'Baja',ausente:'w4',ausente_n:'Josefa Ruiz',sustituto:'w3',sustituto_n:'Ahmed El Hait',borrado:false}];
R.festivos_listar=[{fecha:'2026-12-08',nombre:'Inmaculada'}];
R.tareas=[{id:'t1',dias:['lunes'],tipo:'Basuras',orden:0,turno:'Mañana',activo:true,equipo:'Semana',titulo:'Basuras Nave 2',borrado:false,nombres:['Ahmed El Hait'],asignados:['w3'],descripcion:'',minutos_est:90,todo_equipo:false}];
R.habituales=[];R.zonas=[];R.horas_rango=[];R.lugares=['Nave 1'];

const REC={cono:"hr-ccp040",tubo:"hr-tdk21",junta_tubo:"hr-jtdd001",resistencia:"hr-rst120",centrador:"hr-pcr32",con_estrella:"hr-vmh241",con_fase:"hr-vmh240",juntas_cono:[{art:"hr-jpc375",cant:2},{art:"hr-jpf365",cant:1}]};
const H29={id:'e29',codigo:'H-F29',nombre:'Horno mantenedor F29',tipo:'horno',modelo:'Krown',capacidad_kg:'1200',lugar:'Nave 1',activo:true,recambios:REC,consumibles:[],historial:[],ult:{},vaciado_dias:180};
const H10={id:'e10',codigo:'H-F10',nombre:'Horno mantenedor F10',tipo:'horno',modelo:'Sin marca',capacidad_kg:'600',lugar:'Nave 1',activo:true,recambios:{},consumibles:[],historial:[],ult:{},vaciado_dias:180};
R.elementos=[H29,H10];
R.horno_gasto_el={abierto:false,ver_precios:true,recambios:{cambio_cono:[{art:'hr-ccp040',nombre:'Cono con pestaña Krown CCP-040',cant:1,precio:85},{art:'hr-jpc375',nombre:'Junta cono Krown JPC-375',cant:2,precio:null},{art:'hr-jpf365',nombre:'Junta cono Krown JPF-365',cant:1,precio:null}],cambio_tolva:[{art:'hr-tolva-hierro',nombre:'Tolva de hierro',cant:1},{art:'hr-tolva-refr',nombre:'Tolva refractaria',cant:1}],cambio_dosificador:[{art:'hr-tdk21',nombre:'Tubo dosificador Krown 21',cant:1},{art:'hr-jtdd001',nombre:'Junta tubo dosificador Krown JTDD-001',cant:1}]},
 cambios:{cambio_cono:1,cambio_tolva:1},piezas:[{art:'hr-ccp040',nombre:'Cono con pestaña Krown CCP-040',cant:1,precio:85,importe:85},{art:'hr-jpc375',nombre:'Junta cono Krown JPC-375',cant:2,precio:null,importe:null},{art:'hr-tolva-hierro',nombre:'Tolva de hierro',cant:1,precio:null}],total:85,sin_precio:2,
 ultimos:[{ot_id:'x',cuando:'2026-10-21T08:00:00Z',accion:'cambio_cono',quien:'Abdoul kader Maiga',piezas:[{nombre:'Cono con pestaña Krown CCP-040',cant:1,envio:'enviado'},{nombre:'Junta cono Krown JPC-375',cant:2,envio:'fallo',info:'sin respuesta del Almacén'}],importe:85,mal:1}]};
R.horno_gasto_all={ver_precios:true,mal:1,hornos:[{id:'e29',codigo:'H-F29',nombre:'Horno mantenedor F29',modelo:'Krown',cambios:2,conos:1,tolvas:1,dosificadores:0,piezas:5,total:85,sin_precio:2}]};

module.exports={R,W,H29,H10,hoy};

// Núcleo compartido por Seguimiento y Análisis: una sola definición de la lectura de resultados,
// del seguimiento por fila y de las reglas de oro. Si cambia algo acá, cambian las dos páginas.
(function(){
const LIM=67;
// Reglas de oro configurables. Regla 3 (5 distintos en los 5 primeros sorteos): por defecto NO se aplica.
const RK="lw:reglas-v1",reglas={r3:false};
try{const x=JSON.parse(localStorage.getItem(RK)||"null");if(x&&typeof x.r3==="boolean")reglas.r3=x.r3}catch(e){}
function setR3(v){reglas.r3=!!v;try{localStorage.setItem(RK,JSON.stringify(reglas))}catch(e){}}   // sorteos sin salir para entrar en etapa de Análisis
const fmt=iso=>{const[a,b,c]=iso.split("-");return c+"/"+b+"/"+a};
function parse(j){const out=[],s=j&&j.sorteos||{};
 for(const iso of Object.keys(s)){const p=s[iso]&&s[iso].primera;
  if(Array.isArray(p)&&p.length===20&&p.every(x=>/^\d{4}$/.test(x)))
   out.push({k:iso,f:fmt(iso),u:p.map(x=>x[3]).join(""),d:p.map(x=>x[2]).join("")})}
 return out.sort((a,b)=>a.k.localeCompare(b.k))}   // viejo -> nuevo

// Método de cálculo. ser = dígitos de la fila desde el arranque (sorteo Y=1, 2, 3…).
function analizar(ser){
 const vistos=[],D=[];let canc=null,amax=1;
 for(let y=1;y<=ser.length;y++){const d=ser[y-1];
  if(!vistos.includes(d)){vistos.push(d);const x=vistos.length,a=x===1?1:Math.log(y)/Math.log(x);
   const it={y,d,x,a,rj:false};D.push(it);
   if(!canc){amax=Math.max(amax,a);
    if(a>=2)canc={regla:1,txt:"α llegó a 2",y,it:[it]};
    else if(a<1)canc={regla:2,txt:"α menor que 1",y,it:[it]};
    else if(reglas.r3&&y===5&&D.length===5)canc={regla:3,txt:"5 distintos en los 5 primeros sorteos",y,it:D.slice(-5)}}}
  }
 if(canc)canc.it.forEach(z=>z.rj=true);
 const A={Yact:ser.length,D,amax,canc,nd:D.length};
 if(!canc&&D.length>=9){const C=[amax];let a=amax;for(let k=0;k<3;k++){a=(2-a)/a+a;C.push(a)}
  const yr=Math.min(100,Math.max(10,Math.ceil(Math.pow(10,a)-1e-9)));
  A.cad=C;A.yraw=Math.pow(10,a);A.Y=yr;A.v1=yr-10;A.v2=yr}
 return A}

// Simulación sorteo a sorteo de una fila (f = "u" unidades, "d" decenas).
// Candidato = dígito de última salida más antigua que no esté descartado.
// Con LIM sorteos sin salir entra en Análisis. El análisis se cierra si: se rompe una regla de oro,
// termina la ventana de juego sin salir, o sale el dígito. Si se cancela o termina la ventana,
// el dígito se descarta (hasta que vuelva a salir) y Seguimiento pasa al siguiente más demorado.
function sim(data,i,f){
 f=f||"u";const n=data.length;
 if(n<2)return{R:null,ep:null,cer:[]};
 const last={},disc=new Set(),cer=[];let ep=null,sale=null;
 const serie=(L,t)=>data.slice(L+1,t+1).map(x=>x[f][i]);
 for(let t=0;t<n;t++){
  const d=data[t][f][i];sale=null;
  let cand=null;
  if(Object.keys(last).length===10){let m=Infinity;for(const x in last)if(!disc.has(x)&&last[x]<m){m=last[x];cand=x}}
  if(cand!==null&&d===cand){const Lp=last[cand];sale={t,dig:cand,Lp};
   if(ep&&ep.dig===cand){const A=analizar(serie(Lp,t-1)),Ys=t-Lp;
    cer.push({pos:i,dig:cand,arr:data[Lp+1].k,L:Lp,tipo:"salio",t,fecha:data[t].k,Ys,A,dentro:A.v1!==undefined&&Ys>=A.v1&&Ys<=A.v2});ep=null}}
  last[d]=t;disc.delete(d);
  if(Object.keys(last).length===10){
   for(let g=0;g<10;g++){
    let c=null,m=Infinity;for(const x in last)if(!disc.has(x)&&last[x]<m){m=last[x];c=x}
    if(c===null)break;
    const L=last[c],gap=t-L;
    if(L>=t)break;
    if(!ep&&gap>=LIM)ep={dig:c,L,arr:data[L+1].k,t0:t,f0:data[t].k};
    if(!ep)break;
    const A=analizar(serie(L,t));
    if(A.canc||(A.v2!==undefined&&A.Yact>A.v2)){
     cer.push({pos:i,dig:c,arr:ep.arr,L,tipo:A.canc?"canc":"ventana",t,fecha:data[t].k,Yc:A.Yact,A});
     disc.add(c);ep=null;continue}
    break}}}
 // estado final
 let R=null;
 if(sale){const{Lp,dig}=sale;
  R={cierres:[data[n-1].k],dig,gap:n-1-Lp-1,kDiag:data[Lp].k,kCirc:data[Lp+1].k,oldHasta:data[Lp].k,x:9,estado:"Salió "+dig+" ✓",sal:true}}
 else{
  const seen=Object.keys(last).length;
  let c=null,m=Infinity;for(const x in last)if((seen<10||!disc.has(x))&&last[x]<m){m=last[x];c=x}
  if(c!==null&&last[c]<n-1){const L=last[c];
   const dist=new Set();for(let t=L+1;t<n;t++)dist.add(data[t][f][i]);
   R={cierres:[],dig:c,gap:n-1-L,kDiag:data[L].k,kCirc:data[L+1].k,oldHasta:data[L].k,x:dist.size};
   if(seen<10||dist.size<9){R.estado="Búsqueda "+dist.size+"/10";R.proc=false}
   else if(ep&&ep.dig===c){R.estado="Análisis";R.ana=true}
   else{R.estado="En proceso "+dist.size+"/10";R.proc=true}}}
 let epv=null;
 if(ep&&R&&R.ana)epv=Object.assign({},ep,{A:analizar(serie(ep.L,n-1))});
 const saleEp=cer.find(c=>c.tipo==="salio"&&c.t===n-1)||null;
 return{R,ep:epv,cer,saleEp}}
function seguimiento(data,i,f){return sim(data,i,f).R}
window.LW={LIM,reglas,setR3,fmt,parse,analizar,sim,seguimiento,URL_DATA:"https://gabrielawilsonheguy-ai.github.io/quiniela-bolillero/data/resultados.json"};
})();

// Núcleo de ANÁLISIS Beta (método α y β). Independiente de lw-core.js: no modifica Seguimiento ni Análisis.
(function(){
const LIM=67;
const RK="lw:beta-reglas-v1",reglas={r3:false};
try{const x=JSON.parse(localStorage.getItem(RK)||"null");if(x&&typeof x.r3==="boolean")reglas.r3=x.r3}catch(e){}
function setR3(v){reglas.r3=!!v;try{localStorage.setItem(RK,JSON.stringify(reglas))}catch(e){}}
const fmt=iso=>{const[a,b,c]=iso.split("-");return c+"/"+b+"/"+a};
function parse(j){const out=[],s=j&&j.sorteos||{};
 for(const iso of Object.keys(s)){const p=s[iso]&&s[iso].primera;
  if(Array.isArray(p)&&p.length===20&&p.every(x=>/^\d{4}$/.test(x)))
   out.push({k:iso,f:fmt(iso),u:p.map(x=>x[3]).join(""),d:p.map(x=>x[2]).join("")})}
 return out.sort((a,b)=>a.k.localeCompare(b.k))}
// Apuestas: sorteo Y-11 ... Y-1 (11 sorteos). Paga 7 veces lo apostado.
const STK=[8100,9800,11800,14300,17200,20800,25100,30300,36500,44000,53200],PAGA=7;
const stakeY=(A,y)=>{const i=y-A.v1;return i>=0&&i<11?STK[i]:0};
function apuesta(A,lastY,hitY){ // lastY: último sorteo apostado
 if(A.v1===undefined)return{tot:0,premio:0,neto:0,hit:false};
 let tot=0;for(let y=A.v1;y<=Math.min(A.v2,lastY);y++)tot+=stakeY(A,y);
 const hit=hitY!=null&&hitY>=A.v1&&hitY<=A.v2;const premio=hit?PAGA*stakeY(A,hitY):0;
 return{tot,premio,neto:premio-tot,hit}}
const f2=b=>(2-b)/b+b;
// ser = dígitos desde el arranque (sorteo Y=1,2,3…)
function analizar(ser){
 const vistos=[],D=[];let canc=null,amax=1;
 for(let y=1;y<=ser.length;y++){const d=ser[y-1];
  if(!vistos.includes(d)){vistos.push(d);const x=vistos.length,a=x===1?1:Math.log(y)/Math.log(x);
   const it={y,d,x,a,rj:false};D.push(it);
   if(!canc){amax=Math.max(amax,a);
    if(a>=2)canc={regla:1,txt:"α llegó a 2",y,it:[it]};
    else if(a<1)canc={regla:2,txt:"α menor que 1",y,it:[it]};
    else if(reglas.r3&&y===5&&D.length===5)canc={regla:3,txt:"5 distintos en los 5 primeros sorteos",y,it:D.slice(-5)}}}}
 if(canc)canc.it.forEach(z=>z.rj=true);
 // β N: sorteo del último repetido antes de que salga el distinto N+1 (solo si hubo repetidos; β 1 no existe: log 1 = 0)
 const B=[];
 for(let N=2;N<D.length;N++){const S=D[N].y-1;if(S>D[N-1].y)B.push({N,S,b:Math.log(S)/Math.log(N)})}
 const A={Yact:ser.length,D,B,amax,canc,nd:D.length,bmax:null};
 if(B.length)A.bmax=Math.max(...B.map(z=>z.b));
 if(!canc&&D.length>=9){
  if(A.bmax===null)A.sinB=true;
  else{const C=[A.bmax];let b=A.bmax;for(let k=0;k<3;k++){b=f2(b);C.push(b)}
   const Y=Math.min(100,Math.max(12,Math.ceil(Math.pow(10,b)-1e-9)));
   A.cad=C;A.yraw=Math.pow(10,b);A.Y=Y;A.v1=Y-11;A.v2=Y-1}}
 return A}
// Misma simulación que el Análisis actual (entra a 67 sorteos sin salir; descarta al cancelar/cerrar ventana), con el método β.
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
    if(A.canc||(A.v2!==undefined&&A.Yact>=A.v2)){
     cer.push({pos:i,dig:c,arr:ep.arr,L,tipo:A.canc?"canc":"ventana",t,fecha:data[t].k,Yc:A.Yact,A});
     disc.add(c);ep=null;continue}
    break}}}
 let epv=null;
 if(ep){const seen=Object.keys(last).length;let c=null,m=Infinity;for(const x in last)if(seen<10||!disc.has(x)){if(last[x]<m){m=last[x];c=x}}
  if(!sale&&c===ep.dig&&last[c]<n-1)epv=Object.assign({},ep,{A:analizar(serie(ep.L,n-1))})}
 const saleEp=cer.find(c=>c.tipo==="salio"&&c.t===n-1)||null;
 return{ep:epv,cer,saleEp}}
window.LB={LIM,reglas,setR3,fmt,parse,analizar,sim,apuesta,stakeY,STK,PAGA,URL_DATA:"https://gabrielawilsonheguy-ai.github.io/quiniela-bolillero/data/resultados.json"};
})();

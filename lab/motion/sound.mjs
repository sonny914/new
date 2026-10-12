// Synthesised score: drone, ticks, riser, impact, glass shards, resolve chord.
import fs from 'fs';
const SR=48000,N=SR*10,L=new Float32Array(N),R=new Float32Array(N);
let s=7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647*2-1;
const add=(i,l,r=l)=>{if(i>=0&&i<N){L[i]+=l;R[i]+=r}};
for(let i=0;i<N;i++){const t=i/SR;
  // drone 0-4.15
  if(t<4.15){const a=Math.min(1,t/1.5)*.12*(t>3.9?1-(t-3.9)/.25:1);const v=Math.sin(2*Math.PI*55*t)+.5*Math.sin(2*Math.PI*82.5*t+Math.sin(t*.7))+.25*Math.sin(2*Math.PI*110.3*t);add(i,a*v,a*Math.sin(2*Math.PI*55.4*t)*1.2)}
  // riser 2.4-4.15
  if(t>2.4&&t<4.15){const p=(t-2.4)/1.75,f=200+p*p*1800;const a=.06*p*p;add(i,a*Math.sin(2*Math.PI*f*t)+a*.6*rnd())}
  // impact
  if(t>=4.15){const d=t-4.15;const sub=.8*Math.exp(-d*3.5)*Math.sin(2*Math.PI*(45+60*Math.exp(-d*12))*d);const nz=.5*Math.exp(-d*9)*rnd();add(i,sub+nz,sub+nz*.9)}
  // resolve chord 6.85+
  if(t>=6.85){const d=t-6.85;const env=Math.min(1,d/.02)*Math.exp(-d*.55)*(t>9.4?Math.max(0,1-(t-9.4)/.6):1)*.07;[220,277.18,329.63,440,554.37].forEach((f,k)=>{add(i,env*Math.sin(2*Math.PI*f*d+k)*(k%2?.6:1),env*Math.sin(2*Math.PI*f*1.003*d)*(k%2?1:.6))})}
}
// ticks (HUD) 0.8-3.6 on 8ths
for(let k=0;k<24;k++){const t0=.8+k*.12;if(t0>4.1)break;const i0=Math.floor(t0*SR);for(let j=0;j<800;j++){const v=.09*Math.exp(-j/120)*Math.sin(j*.9);add(i0+j,v,v*.7)}}
// glass shards
for(let k=0;k<70;k++){const t0=4.15+Math.pow(Math.abs(rnd()),2)*1.6,f=2500+Math.abs(rnd())*5500,pan=rnd(),a=.05*Math.abs(rnd());const i0=Math.floor(t0*SR);for(let j=0;j<SR*.25;j++){const v=a*Math.exp(-j/(SR*.04))*Math.sin(2*Math.PI*f*j/SR);add(i0+j,v*(1-pan)/1.5,v*(1+pan)/1.5)}}
// converge whoosh 5-6.9
for(let i=Math.floor(5*SR);i<6.9*SR;i++){const p=(i/SR-5)/1.9;const a=.12*Math.sin(Math.PI*p)*p;add(i,a*rnd(),a*rnd())}
// soft lowpass + normalise
let pl=0,pr=0,m=0;for(let i=0;i<N;i++){pl+=.5*(L[i]-pl);pr+=.5*(R[i]-pr);L[i]=pl;R[i]=pr;m=Math.max(m,Math.abs(pl),Math.abs(pr))}
const b=Buffer.alloc(44+N*4);b.write('RIFF',0);b.writeUInt32LE(36+N*4,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(SR,24);b.writeUInt32LE(SR*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(N*4,40);
for(let i=0;i<N;i++){b.writeInt16LE(Math.round(Math.tanh(L[i]/m*1.1)*30000),44+i*4);b.writeInt16LE(Math.round(Math.tanh(R[i]/m*1.1)*30000),46+i*4)}
fs.writeFileSync(process.argv[2]||'score.wav',b);

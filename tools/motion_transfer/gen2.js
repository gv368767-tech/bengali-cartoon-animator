const fs=require("fs"); const {humanShapes,HUMANS}=require("./js/human.js"); const {shapesToSvg}=require("./js/svg.js");
const mc=JSON.parse(fs.readFileSync("mc.json")); const N=mc.p[0].rec.x.length, W=mc.W,H=mc.H;
const chars=[{...HUMANS.woman,top:"#2a4d9b",top2:"#8fb2ee",bottom:"#2a4d9b"},HUMANS.woman];
fs.rmSync("fr2",{recursive:true,force:true}); fs.mkdirSync("fr2");
for(let i=0;i<N;i++){ let body="",defs="";
  for(const k of [0,1]){ const P=mc.p[k], r=P.rec, ks=P.k;
    const pose={action:"stand",phase:i/30*3,talk:0,blink:(i%90)<4,view:r.view[i],mc:{
      L:{a:[r.aL0[i],r.aL1[i]]},R:{a:[r.aR0[i],r.aR1[i]]},lgA:[r.gL[i],r.gR[i]],liftL:r.lfL[i],liftR:r.lfR[i],
      bob:0,sway:0,tilt:r.tilt[i],expr:"smile",eyes:"open",noHold:true}};
    const sv=shapesToSvg(humanShapes(chars[k],pose)); defs+=sv.defs;
    const ty=P.ground+r.ty[i];   // পুরো শরীর একসঙ্গে ওঠানামা/সরে — অঙ্গ আলাদা হয় না
    body+=`<ellipse cx="${r.x[i]}" cy="${P.ground+8}" rx="${60*ks}" ry="${12*ks}" fill="#000" opacity="0.18"/><g transform="translate(${r.x[i]} ${ty}) scale(${ks})">${sv.body}</g>`; }
  fs.writeFileSync(`fr2/${String(i).padStart(4,"0")}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`); }

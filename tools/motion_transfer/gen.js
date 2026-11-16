const fs=require("fs"); const {humanShapes,HUMANS}=require("./js/human.js"); const {shapesToSvg}=require("./js/svg.js");
const mc=JSON.parse(fs.readFileSync("mc.json")); const N=mc.p[0].rec.x.length, W=mc.W,H=mc.H;
const chars=[{...HUMANS.woman,top:"#2a4d9b",top2:"#8fb2ee",bottom:"#2a4d9b"},HUMANS.woman]; // 0=বাঁ (নীল শাড়ি), 1=ডান (লাল শাড়ি) — একই ডিজাইন সারা ভিডিওতে
fs.mkdirSync("fr",{recursive:true});
const bg=`<rect width="${W}" height="${H}" fill="#bfe3f7"/><rect y="520" width="${W}" height="560" fill="#e9d9b8"/><rect x="150" y="380" width="780" height="420" fill="#d8c9a4"/><rect x="150" y="380" width="120" height="420" fill="#f1ece0"/><rect x="810" y="380" width="120" height="420" fill="#f1ece0"/><rect x="150" y="360" width="780" height="40" fill="#b9a67c"/><rect y="800" width="${W}" height="${H-800}" fill="#e7cf9b"/><rect y="800" width="${W}" height="14" fill="#cdb67f"/>`;
for(let i=0;i<N;i++){
  let body="",defs="";
  for(const k of [0,1]){ const P=mc.p[k], r=P.rec, ks=P.k;
    const pose={action:"stand",phase:i/30*3,talk:0,blink:(i%90)<4,view:"front",mc:{
      L:{a:[r.aL0[i],r.aL1[i]]},R:{a:[r.aR0[i],r.aR1[i]]},lgA:[r.gL[i],r.gR[i]],liftL:r.lfL[i],liftR:r.lfR[i],
      bob:r.bob[i],sway:r.sway[i],tilt:r.tilt[i],expr:"smile",eyes:"open",noHold:true}};
    const sv=shapesToSvg(humanShapes(chars[k],pose)); defs+=sv.defs;
    // কার্টুনের ভূমি = পায়ের গড় উচ্চতা; x = নিতম্বের অবস্থান
    body+=`<ellipse cx="${r.x[i]}" cy="${P.ground+8}" rx="${60*ks}" ry="${12*ks}" fill="#000" opacity="0.15"/><g transform="translate(${r.x[i]} ${P.ground}) scale(${ks})">${sv.body}</g>`; }
  fs.writeFileSync(`fr/${String(i).padStart(4,"0")}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${bg}${body}</svg>`);
}
console.log("frames",N);

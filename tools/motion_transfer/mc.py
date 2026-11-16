import numpy as np, json
from scipy.ndimage import gaussian_filter1d
A=np.load("lm_filled.npy"); N=A.shape[1]; W,H=1080,1920
def interp(x):  # x: (N,...) with NaN rows
    x=x.copy(); idx=np.arange(N)
    for c in np.ndindex(*x.shape[1:]):
        v=x[(slice(None),)+c]; ok=~np.isnan(v)
        if ok.sum()>=2: v[~ok]=np.interp(idx[~ok],idx[ok],v[ok])
    return x
res={}
for k in range(2):
    P=A[k,:,:,:2].copy(); V=A[k,:,:,3]
    P[V<0.35]=np.nan                     # low-confidence joints -> interpolate
    P=interp(P); P=gaussian_filter1d(P,1.6,axis=0,mode="nearest")
    Wp=P*[W,H]
    hip=(Wp[:,23]+Wp[:,24])/2; sh=(Wp[:,11]+Wp[:,12])/2
    torso=np.median(np.linalg.norm(sh-hip,axis=1)); kscale=torso/93.0      # px per cartoon unit
    # screen-left landmark choice with hysteresis
    swap=np.zeros(N,bool); cur=False
    for i in range(N):
        d=Wp[i,11,0]-Wp[i,12,0]       # mp-left x - mp-right x ; if >0 mp-left is on screen right
        if abs(d)>0.04*torso: cur=d>0
        swap[i]=cur
    def side(i,a,b): return (b,a) if swap[i] else (a,b)  # returns (screenLeftIdx, screenRightIdx)
    def ang(p0,p1,sg):   # absolute angle from straight-down, +outward for side sg (-1 left, +1 right)
        v=p1-p0; return np.arctan2(sg*v[0],v[1])
    out=[]; legref={}
    for key,(h,a) in {"L":(23,27),"R":(24,28)}.items(): pass
    legL=np.percentile(np.linalg.norm(Wp[:,[23,24]]-Wp[:,[27,28]],axis=2),90); 
    rec={k2:[] for k2 in ["aL0","aL1","aR0","aR1","gL","gR","lfL","lfR","sway","tilt","bob","x"]}
    for i in range(N):
        l,r=side(i,11,12); el,er=side(i,13,14); wl,wr=side(i,15,16); hl,hr=side(i,23,24); kl,kr=side(i,25,26); al,ar=side(i,27,28)
        rec["aL0"].append(ang(Wp[i,l],Wp[i,el],-1)); rec["aL1"].append(ang(Wp[i,el],Wp[i,wl],-1))
        rec["aR0"].append(ang(Wp[i,r],Wp[i,er],1));  rec["aR1"].append(ang(Wp[i,er],Wp[i,wr],1))
        for nm,hh,aa in (("L",hl,al),("R",hr,ar)):
            v=Wp[i,aa]-Wp[i,hh]; rec["g"+nm].append(np.arctan2(v[0],v[1])); rec["lf"+nm].append(max(0,1-np.linalg.norm(v)/legL)*102)
        hp=hip[i]; shm=sh[i]
        rec["sway"].append(np.clip((shm[0]-hp[0])/kscale,-25,25)); rec["x"].append(hp[0])
        rec["bob"].append((hp[1]-np.median(hip[:,1]))/kscale)
        rec["tilt"].append(np.clip((Wp[i,0,0]-shm[0])/kscale/40*0.6,-0.3,0.3))
    for kk in rec:
        v=np.array(rec[kk]);
        if kk in("aL0","aL1","aR0","aR1","gL","gR"): v=np.unwrap(v)
        rec[kk]=gaussian_filter1d(v,1.2,mode="nearest").tolist()
    ground=float(np.median(np.maximum(Wp[:,27,1],Wp[:,28,1])))
    res[k]=dict(rec=rec,k=float(kscale),ground=ground,hipmed=float(np.median(hip[:,1])),legL=float(legL))
    print("person",k,"scale px/unit",round(kscale,2),"ground y",round(ground),"torso px",round(torso))
json.dump({"fps":30,"W":W,"H":H,"p":res},open("mc.json","w"))

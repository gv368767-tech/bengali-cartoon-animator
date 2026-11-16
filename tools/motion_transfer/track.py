import json, numpy as np, cv2
d=json.load(open("poses.json")); fps=d["fps"]; F=d["frames"]; N=len(F)
def cen(p): 
    a=np.array(p); return a[[11,12,23,24],:2].mean(0)
# identity assignment (A starts as the leftmost, B rightmost)
last=[None,None]; T=[[None]*N for _ in range(2)]
for i,f in enumerate(F):
    ps=sorted(f,key=lambda p:cen(p)[0])
    if len(ps)>=2 and last[0] is None: ps=ps[:1]+ps[-1:]; 
    if last[0] is None and len(ps)>=2:
        T[0][i],T[1][i]=ps[0],ps[1]; last=[cen(ps[0]),cen(ps[1])]; continue
    if last[0] is None: continue
    if False:
        if len(ps)==1:
            c=cen(ps[0]); k=0 if c[0]<0.6 else 1; T[k][i]=ps[0]; 
            if last[k] is None: pass
            last[k]=c
        if last[0] is None or last[1] is None: 
            if len(ps)==1: 
                # keep 'last' as partial; fill other with far default
                if last[0] is None: last[0]=np.array([0.3,0.5])
                if last[1] is None: last[1]=np.array([0.85,0.5])
        continue
    if len(ps)>=2:
        ps=ps[:1]+ps[-1:]
        c=[cen(p) for p in ps]
        if np.linalg.norm(c[0]-last[0])+np.linalg.norm(c[1]-last[1]) <= np.linalg.norm(c[0]-last[1])+np.linalg.norm(c[1]-last[0]): asg=[0,1]
        else: asg=[1,0]
        for k,p in zip(asg,ps): T[k][i]=p; last[k]=cen(p)
    elif len(ps)==1:
        c=cen(ps[0]); k=int(np.linalg.norm(c-last[1])<np.linalg.norm(c-last[0]))
        if np.linalg.norm(c-last[k])<0.25: T[k][i]=ps[0]; last[k]=c
for k in range(2): print("person",k,"frames",sum(t is not None for t in T[k]),"of",N, "mean x", np.mean([cen(t)[0] for t in T[k] if t]))
# arrays with NaN then interpolate
A=np.full((2,N,33,4),np.nan)
for k in range(2):
    for i,t in enumerate(T[k]):
        if t: A[k,i]=np.array(t)
np.save("lm_raw.npy",A)
# overlay video
cap=cv2.VideoCapture("in.mp4"); out=cv2.VideoWriter("overlay.mp4",cv2.VideoWriter_fourcc(*"mp4v"),fps,(540,960))
CON=[(11,12),(11,13),(13,15),(12,14),(14,16),(11,23),(12,24),(23,24),(23,25),(25,27),(24,26),(26,28),(0,11),(0,12)]
col=[(255,80,0),(0,0,255)]
for i in range(N):
    ok,fr=cap.read(); fr=cv2.resize(fr,(540,960))
    for k in range(2):
        if np.isnan(A[k,i,0,0]): continue
        P=A[k,i,:,:2]*[540,960]
        for a,b in CON: cv2.line(fr,tuple(P[a].astype(int)),tuple(P[b].astype(int)),col[k],4)
        cv2.putText(fr,"AB"[k],tuple((P[0]+[0,-30]).astype(int)),0,1.5,col[k],4)
    out.write(fr)
out.release()

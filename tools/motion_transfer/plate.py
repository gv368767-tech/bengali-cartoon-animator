import cv2, numpy as np
A=np.load("lm_filled.npy"); N=A.shape[1]; W,H=720,1280
cap=cv2.VideoCapture("in.mp4"); fr=[]
while True:
    ok,f=cap.read()
    if not ok: break
    fr.append(cv2.resize(f,(W,H),interpolation=cv2.INTER_AREA))
M=np.zeros((N,H,W),np.uint8)
for i in range(N):
    for k in range(2):
        p=A[k,i,:,:2]
        if np.isnan(p[0,0]): continue
        P=(p*[W,H]).astype(int); tors=np.linalg.norm(((p[11]+p[12])/2-(p[23]+p[24])/2)*[W,H]); w=int(0.62*tors)   # generous: saree + limbs
        for a,b in [(11,13),(13,15),(12,14),(14,16),(23,25),(25,27),(24,26),(26,28),(11,23),(12,24),(11,12),(23,24),(0,11),(0,12)]:
            cv2.line(M[i],tuple(P[a]),tuple(P[b]),1,w if (a,b) in [(23,25),(24,26),(25,27),(26,28),(11,23),(12,24),(11,12),(23,24)] else int(w*0.7))
        hx,hy=P[0]; cv2.circle(M[i],(hx,hy),int(0.5*tors),1,-1)
        # saree/dress region: hips down to ankles, wide
        hip=(P[23]+P[24])//2; an=(P[27]+P[28])//2
        cv2.fillConvexPoly(M[i],np.array([P[11],P[12],P[24]+[int(w*0.9),0],an+[int(w*0.9),0],an-[int(w*0.9),0],P[23]-[int(w*0.9),0]]),1)
    M[i]=cv2.dilate(M[i],np.ones((25,25),np.uint8))
np.save("fatmask.npy",M)
plate=np.zeros((H,W,3),np.uint8); cnt=np.zeros((H,W),np.int32)
idx=list(range(0,N,2)); S=64
for y in range(0,H,S):
    blk=np.stack([fr[i][y:y+S].astype(np.float32) for i in idx]); mk=np.stack([M[i][y:y+S] for i in idx])[...,None].astype(bool)
    blk[np.broadcast_to(mk,blk.shape)]=np.nan
    plate[y:y+S]=np.nan_to_num(np.nanmedian(blk,axis=0),nan=0).astype(np.uint8); cnt[y:y+S]=(~mk[...,0]).sum(0)
hole=(cnt<5).astype(np.uint8)*255
print("hole fraction",hole.mean()/255)
hole=cv2.dilate(hole,np.ones((9,9),np.uint8))
plate=cv2.inpaint(plate,hole,9,cv2.INPAINT_TELEA)
cv2.imwrite("plate.png",plate); cv2.imwrite("holes.png",hole)

import json,numpy as np,cv2,mediapipe as mp
from mediapipe.tasks import python as mpp
from mediapipe.tasks.python import vision
A=np.load("lm_raw.npy"); N=A.shape[1]
miss=[[i for i in range(N) if np.isnan(A[k,i,0,0])] for k in range(2)]; print("missing before",[len(m) for m in miss])
opt=vision.PoseLandmarkerOptions(base_options=mpp.BaseOptions(model_asset_path="pose.task"),running_mode=vision.RunningMode.IMAGE,num_poses=1,min_pose_detection_confidence=0.3,min_pose_presence_confidence=0.3)
lm=vision.PoseLandmarker.create_from_options(opt)
frames=[]; cap=cv2.VideoCapture("in.mp4")
while True:
    ok,fr=cap.read()
    if not ok: break
    frames.append(fr)
H,W=frames[0].shape[:2]
def bbox(k,i):
    # nearest known frame bbox
    idx=[j for j in range(N) if not np.isnan(A[k,j,0,0])]
    j=min(idx,key=lambda j:abs(j-i)); p=A[k,j,:,:2]
    x0,y0=np.nanmin(p,0); x1,y1=np.nanmax(p,0); return x0,y0,x1,y1
got=0
for k in range(2):
    for i in miss[k]:
        x0,y0,x1,y1=bbox(k,i); pw,ph=(x1-x0)*0.6+0.05,(y1-y0)*0.25+0.05
        X0,Y0,X1,Y1=max(0,x0-pw),max(0,y0-ph),min(1,x1+pw),min(1,y1+ph)
        crop=frames[i][int(Y0*H):int(Y1*H),int(X0*W):int(X1*W)]
        crop=cv2.resize(crop,(int(crop.shape[1]*960/crop.shape[0]) if False else crop.shape[1],crop.shape[0]))
        r=lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(crop,cv2.COLOR_BGR2RGB)))
        if r.pose_landmarks:
            P=np.array([[p.x,p.y,p.z,p.visibility] for p in r.pose_landmarks[0]])
            P[:,0]=X0+P[:,0]*(X1-X0); P[:,1]=Y0+P[:,1]*(Y1-Y0); A[k,i]=P; got+=1
print("recovered",got); np.save("lm_filled.npy",A)
print("missing after",[int(np.isnan(A[k,:,0,0]).sum()) for k in range(2)])

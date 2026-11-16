import cv2, numpy as np, mediapipe as mp
from mediapipe.tasks import python as mpp
from mediapipe.tasks.python import vision
A=np.load("lm_filled.npy"); N=A.shape[1]
opt=vision.PoseLandmarkerOptions(base_options=mpp.BaseOptions(model_asset_path="pose.task"),running_mode=vision.RunningMode.IMAGE,num_poses=1,min_pose_detection_confidence=0.3,min_pose_presence_confidence=0.3,output_segmentation_masks=True)
lm=vision.PoseLandmarker.create_from_options(opt)
cap=cv2.VideoCapture("in.mp4"); W,H=720,1280; masks=np.zeros((N,H,W),np.uint8); segok=0
for i in range(N):
    ok,fr=cap.read(); fr=cv2.resize(fr,(W,H))
    for k in range(2):
        p=A[k,i,:,:2]
        if np.isnan(p[0,0]): continue
        x0,y0=np.nanmin(p,0); x1,y1=np.nanmax(p,0); pw,ph=(x1-x0)*0.5+0.04,(y1-y0)*0.2+0.04
        X0,Y0,X1,Y1=int(max(0,x0-pw)*W),int(max(0,y0-ph)*H),int(min(1,x1+pw)*W),int(min(1,y1+ph)*H)
        crop=cv2.cvtColor(fr[Y0:Y1,X0:X1],cv2.COLOR_BGR2RGB)
        r=lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB,data=np.ascontiguousarray(crop)))
        if r.segmentation_masks:
            m=r.segmentation_masks[0].numpy_view(); m=(m>0.4).astype(np.uint8)
            masks[i,Y0:Y1,X0:X1]|=cv2.resize(m,(X1-X0,Y1-Y0),interpolation=cv2.INTER_NEAREST); segok+=1
        # fat skeleton fallback/safety net (covers saree and limbs)
        P=(p*[W,H]).astype(int); tw=int(0.9*np.linalg.norm(((A[k,i,11,:2]+A[k,i,12,:2])/2-(A[k,i,23,:2]+A[k,i,24,:2])/2)*[W,H]))
        for a,b in [(11,13),(13,15),(12,14),(14,16),(23,25),(25,27),(24,26),(26,28),(11,12),(23,24),(11,23),(12,24)]:
            cv2.line(masks[i],tuple(P[a]),tuple(P[b]),1,max(8,tw//3))
        cv2.fillConvexPoly(masks[i],np.array([P[11],P[12],P[24],P[23]]),1)
    masks[i]=cv2.dilate(masks[i],np.ones((21,21),np.uint8))
print("seg ok",segok,"of",2*N, "mean mask frac",masks.mean())
np.save("masks.npy",masks)

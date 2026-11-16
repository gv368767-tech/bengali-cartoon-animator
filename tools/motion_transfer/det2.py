import cv2, mediapipe as mp, numpy as np, json, sys
from mediapipe.tasks import python as mpp
from mediapipe.tasks.python import vision
W,H,conf=int(sys.argv[1]),int(sys.argv[2]),float(sys.argv[3]); save=len(sys.argv)>4
opt = vision.PoseLandmarkerOptions(base_options=mpp.BaseOptions(model_asset_path="pose.task"), running_mode=vision.RunningMode.VIDEO, num_poses=4, min_pose_detection_confidence=conf, min_pose_presence_confidence=conf, min_tracking_confidence=conf)
lm = vision.PoseLandmarker.create_from_options(opt)
cap = cv2.VideoCapture("in.mp4"); fps = cap.get(5); out=[]; i=0
while True:
    ok, fr = cap.read()
    if not ok: break
    rgb = cv2.cvtColor(cv2.resize(fr,(W,H)), cv2.COLOR_BGR2RGB)
    r = lm.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), int(i*1000/fps))
    out.append([[[p.x,p.y,p.z,p.visibility] for p in pose] for pose in r.pose_landmarks]); i+=1
from collections import Counter
print(W,H,conf,sorted(Counter(len(f) for f in out).items()))
if save: json.dump({"fps":fps,"frames":out}, open("poses.json","w"))

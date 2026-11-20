"""Reference cartoon filter (pure box/3x3 ops so it ports 1:1 to Kotlin/Java)."""
import numpy as np, cv2, sys, subprocess
W,H=360,640           # working res (portrait source 1080x1920)
LV=5                   # luminance bands
def bil3(img, sig, it):
    for _ in range(it):
        p=np.pad(img,((1,1),(1,1),(0,0)),mode='edge'); acc=np.zeros_like(img); ws=np.zeros(img.shape[:2]+(1,),np.float32)
        for dy in range(3):
            for dx in range(3):
                n=p[dy:dy+img.shape[0],dx:dx+img.shape[1]]
                d=((n-img)**2).sum(2,keepdims=True)
                w=np.exp(-d/(sig*sig))
                acc+=w*n; ws+=w
        img=acc/ws
    return img
def toon(rgb, prev):
    f=rgb.astype(np.float32)/255
    s=bil3(f,0.20,8)
    # temporal: motion-adaptive EMA on smoothed colour
    if prev is not None:
        d=np.abs(s-prev).mean(2,keepdims=True)
        a=np.clip(1-d*8,0.25,0.75)    # static -> keep 75% history
        s=a*prev+(1-a)*s
    sm=s.copy()
    y=0.299*s[...,0]+0.587*s[...,1]+0.114*s[...,2]
    # soft posterize luminance
    t=y*LV; fl=np.floor(t); fr=t-fl
    k=np.clip((fr-0.5)*3+0.5,0,1); k=k*k*(3-2*k)
    yq=(fl+k)/LV
    gain=(yq+0.02)/(y+0.02)
    c=s*gain[...,None]
    # saturation boost
    g=c.mean(2,keepdims=True); c=np.clip(g+(c-g)*1.35,0,1)
    # edges on smoothed luma (Sobel)
    ys=cv2.GaussianBlur(y,(0,0),1.6)
    gx=cv2.Sobel(ys,cv2.CV_32F,1,0,ksize=3); gy=cv2.Sobel(ys,cv2.CV_32F,0,1,ksize=3)
    m=np.sqrt(gx*gx+gy*gy)
    e=np.clip((m-0.22)/0.18,0,1)
    out=c*(1-0.8*e[...,None])
    return (np.clip(out,0,1)*255).astype(np.uint8), sm
if __name__=="__main__":
    src,dst=sys.argv[1],sys.argv[2]
    cap=cv2.VideoCapture(src); fps=cap.get(cv2.CAP_PROP_FPS)
    vw=cv2.VideoWriter(dst,cv2.VideoWriter_fourcc(*'mp4v'),fps,(W,H)); prev=None; n=0
    while True:
        ok,fr=cap.read()
        if not ok: break
        fr=cv2.resize(fr,(W,H),interpolation=cv2.INTER_AREA)
        o,prev=toon(fr[...,::-1].copy(),prev); vw.write(o[...,::-1]); n+=1
        if n in (1,60,120):cv2.imwrite(f"f{n}.png",np.hstack([fr,o[...,::-1]]))
    vw.release(); print(n,"frames")

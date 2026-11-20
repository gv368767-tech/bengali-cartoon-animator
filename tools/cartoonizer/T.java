import expo.modules.studioexport.CartoonFilter;
import java.io.*; import java.nio.file.*;
public class T { public static void main(String[] a) throws Exception {
  int w=Integer.parseInt(a[0]),h=Integer.parseInt(a[1]); int nf=Integer.parseInt(a[2]);
  byte[] raw=Files.readAllBytes(Paths.get(a[3])); CartoonFilter f=new CartoonFilter(w,h);
  float[] in=new float[w*h*3]; int[] out=new int[w*h]; DataOutputStream os=new DataOutputStream(new BufferedOutputStream(new FileOutputStream(a[4])));
  long t0=System.nanoTime();
  for(int k=0;k<nf;k++){ for(int i=0;i<w*h*3;i++) in[i]=(raw[k*w*h*3+i]&255)/255f; f.process(in,out);
    for(int i=0;i<w*h;i++){os.write((out[i]>>16)&255);os.write((out[i]>>8)&255);os.write(out[i]&255);} }
  os.close(); System.out.println("ms/frame "+(System.nanoTime()-t0)/1e6/nf);
}}

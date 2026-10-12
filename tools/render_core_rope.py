"""Generate the README's looping core-rope schematic. Requires Pillow.

The four-wire example is deliberately simplified. Selection, inhibit wiring,
strand switching and sense amplifiers are omitted.
"""
from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/animations/core-rope.gif'
SCALE = 2
W, H = 800, 480
BG = '#111710'
INK = '#e5e5cd'
MUTED = '#a1ab97'
WIRE = '#e5b36d'
READ = '#c1e780'
CX, CY, RX, RY = 448, 246, 62, 111
HX, HY = 30, 76
BITS = [1, 0, 1, 1]
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

def font(size, mono=False):
    return ImageFont.truetype(MONO if mono else FONT, size*SCALE)

def label(draw, xy, value, size=16, fill=INK, anchor='la', mono=False):
    draw.text(tuple(v*SCALE for v in xy), value, font=font(size,mono), fill=fill, anchor=anchor)

def line(draw, points, fill, width=3):
    draw.line([(round(x*SCALE),round(y*SCALE)) for x,y in points],fill=fill,width=width*SCALE,joint='curve')

def sampled_path(i):
    y=CY+[-43,-14,16,45][i]
    if BITS[i]: return [(88+k*(618/200),y) for k in range(201)]
    # Rounded bypass path around the exterior of the core.
    points=[(88,y),(CX-RX-38,y),(CX-RX-38,CY-RY-27)]
    for j in range(21):
        a=math.pi-j*math.pi/40
        points.append((CX-RX-21+17*math.cos(a),CY-RY-27-17*math.sin(a)))
    points.append((CX+RX+21,CY-RY-44))
    for j in range(21):
        a=math.pi/2-j*math.pi/40
        points.append((CX+RX+21+17*math.cos(a),CY-RY-27-17*math.sin(a)))
    points.extend([(CX+RX+38,y),(706,y)])
    return points

def portion(points,f):
    if f<=0:return []
    total=sum(math.dist(a,b) for a,b in zip(points,points[1:]))
    target=total*min(1,f);acc=0;out=[points[0]]
    for a,b in zip(points,points[1:]):
        length=math.dist(a,b)
        if acc+length>=target:
            frac=(target-acc)/length if length else 0
            out.append((a[0]+(b[0]-a[0])*frac,a[1]+(b[1]-a[1])*frac));break
        out.append(b);acc+=length
    return out

def core_layer(front=False):
    layer=Image.new('RGBA',(W*SCALE,H*SCALE))
    px=layer.load()
    for y in range(int((CY-RY-2)*SCALE),int((CY+RY+2)*SCALE)):
        for x in range(int((CX-RX-2)*SCALE),int((CX+RX+2)*SCALE)):
            xf=x/SCALE-CX;yf=y/SCALE-CY
            if (xf/RX)**2+(yf/RY)**2<=1 and (xf/HX)**2+(yf/HY)**2>=1 and (not front or xf>=0):
                light=.7+.3*math.cos((xf/RX+.4)*2)
                px[x,y]=(int(95*light),int(106*light),int(82*light),255)
    d=ImageDraw.Draw(layer)
    box=[(CX-RX)*SCALE,(CY-RY)*SCALE,(CX+RX)*SCALE,(CY+RY)*SCALE]
    inner=[(CX-HX)*SCALE,(CY-HY)*SCALE,(CX+HX)*SCALE,(CY+HY)*SCALE]
    if not front:
        d.ellipse(box,outline='#77826b',width=SCALE)
        d.ellipse(inner,outline='#394330',width=SCALE)
    return layer

PATHS=[sampled_path(i) for i in range(4)]
BACK,FRONT=core_layer(),core_layer(True)

def render(t):
    image=Image.new('RGB',(W*SCALE,H*SCALE),BG);d=ImageDraw.Draw(image)
    label(d,(34,24),'SOFTWARE YOU COULD WEAVE',24)
    label(d,(34,62),'Core-rope memory · enlarged schematic cutaway',14,MUTED)
    label(d,(88,115),'Sense wires',14,MUTED)
    label(d,(CX,115),'Magnetic core',14,MUTED,'ma')
    label(d,(746,115),'Bits',14,MUTED,'ra')
    image.paste(BACK,(0,0),BACK);d=ImageDraw.Draw(image)
    for x in range(88,707,13):line(d,[(x,CY+61),(min(x+7,706),CY+61)],MUTED,2)
    for i,path in enumerate(PATHS):
        fraction=max(0,min(1,t/1.8-i))
        p=portion(path,fraction)
        if len(p)>1:line(d,p,WIRE)
        y=CY+[-43,-14,16,45][i]
        label(d,(65,y+5),str(i+1),14,MUTED,'rm',True)
        label(d,(746,y+5),str(BITS[i]) if fraction>=1 else '·',24,INK,'rm',True)
    image.paste(FRONT,(0,0),FRONT);d=ImageDraw.Draw(image)
    if 7.8<=t<8.5:
        d.ellipse([(CX-RX-7)*SCALE,(CY-RY-7)*SCALE,(CX+RX+7)*SCALE,(CY+RY+7)*SCALE],outline=READ,width=2*SCALE)
    if 8.5<=t<10.1:
        f=(t-8.5)/1.6
        for i,bit in enumerate(BITS):
            if bit:
                y=CY+[-43,-14,16,45][i];x=CX+RX+7+(706-CX-RX-7)*f
                d.ellipse([(x-5)*SCALE,(y-5)*SCALE,(x+5)*SCALE,(y+5)*SCALE],fill=READ)
    label(d,(88,382),'Set / reset drive wire',14,MUTED)
    if t<7.2:
        i=min(3,int(t/1.8))
        stage=f'Wire {i+1}: '+('through the hole → 1' if BITS[i] else 'around the core → 0')
    elif t<7.8:stage='The completed wiring encodes 1011.'
    elif t<8.5:stage='SET: the selected core changes magnetic state.'
    elif t<10.1:stage='RESET / READ: pulses appear only in threaded sense wires.'
    else:stage='READ RESULT 1011 · the program remains physically wired.'
    label(d,(34,419),stage,17)
    label(d,(34,451),'Through = 1     Bypass = 0     Four sense wires shown; control circuits omitted.',13,MUTED)
    return image.resize((W,H),Image.Resampling.LANCZOS)

def main():
    OUT.parent.mkdir(parents=True,exist_ok=True)
    frames=[render(i/10) for i in range(125)]
    # One palette avoids colour flicker and keeps the GIF small.
    palette=render(9).quantize(colors=96,method=Image.Quantize.MEDIANCUT)
    converted=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in frames]
    converted[0].save(OUT,save_all=True,append_images=converted[1:],duration=100,loop=0,optimize=True,disposal=1)
    print(f'{OUT}: {OUT.stat().st_size:,} bytes, looping forever')

if __name__=='__main__':main()

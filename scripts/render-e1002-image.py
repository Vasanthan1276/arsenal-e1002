#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

W, H = 800, 480
ROOT = Path(__file__).resolve().parents[1]
football = json.loads((ROOT / "data" / "football.json").read_text(encoding="utf-8"))
fantasy = json.loads((ROOT / "data" / "fantasy.json").read_text(encoding="utf-8"))

# Spectra 6-friendly palette
WHITE = (255,255,255)
BLACK = (0,0,0)
RED = (220,0,20)
GREEN = (0,160,80)
BLUE = (0,95,190)
YELLOW = (255,212,0)
GRAY = (90,90,90)
LIGHT = (235,235,235)

img = Image.new("RGB", (W,H), WHITE)
d = ImageDraw.Draw(img)

def font(size, bold=False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size=size)
    return ImageFont.load_default()

F8 = font(8); F9 = font(9); F10 = font(10); F11 = font(11)
F12B = font(12, True); F14B = font(14, True); F17B = font(17, True)
F20B = font(20, True); F24B = font(24, True); F28B = font(28, True)

def txt(x,y,s,f=F10,fill=BLACK,anchor=None):
    d.text((x,y), str(s), font=f, fill=fill, anchor=anchor)

def box(x0,y0,x1,y1,outline=BLACK,width=1,fill=None):
    d.rectangle((x0,y0,x1,y1), outline=outline, width=width, fill=fill)

# outer border / header
box(0,0,799,479,width=2)
d.rectangle((2,2,797,45), fill=RED)
txt(14,12,"ARSENAL",F24B,WHITE)
txt(510,15,"PREMIER LEAGUE 2026/27",F12B,WHITE)
txt(785,17,football.get("updated",""),F9,WHITE,anchor="ra")

# split
d.line((480,46,480,436), fill=BLACK, width=2)
d.line((2,436,797,436), fill=BLACK, width=2)

# left: next match
fixtures = football.get("fixtures", [])
nextf = fixtures[0] if fixtures else {}
home = str(nextf.get("home",""))
away = str(nextf.get("away",""))
is_home = "ARSENAL" in home.upper()
opp = away if is_home else home
txt(14,56,"NEXT MATCH - " + ("HOME" if is_home else "AWAY"),F11,RED)
txt(14,79,"ARSENAL vs" if is_home else "ARSENAL @",F12B,GRAY)
txt(14,99,opp or "TBC",F28B,BLACK)
box(336,70,463,129,width=2)
txt(399,80,nextf.get("date","TBC"),F20B,BLACK,anchor="ma")
txt(399,107,nextf.get("time","TBC"),F11,BLACK,anchor="ma")

# form + last result
form = football.get("form", [])[-5:]
txt(14,137,"FORM",F10,BLACK)
fx=54
for r in form:
    c = GREEN if r=="W" else (YELLOW if r=="D" else RED)
    box(fx,133,fx+20,153,width=1,fill=c)
    txt(fx+10,137,r,F10,WHITE if r!="D" else BLACK,anchor="ma")
    fx += 25
results = football.get("results", [])
if results:
    r=results[0]
    last=f"{r.get('home','')} {r.get('homeScore','-')}-{r.get('awayScore','-')} {r.get('away','')}"
    txt(465,139,"LAST: "+last,F9,BLACK,anchor="ra")

# upcoming
d.line((2,160,478,160),fill=BLACK,width=2)
txt(14,168,"UPCOMING",F12B)
y=190
for f in fixtures[1:4]:
    h=str(f.get("home","")); a=str(f.get("away",""))
    ih="ARSENAL" in h.upper()
    o=a if ih else h
    txt(14,y,f.get("date",""),F11,BLACK)
    txt(95,y,("vs " if ih else "@ ")+o,F11,BLACK)
    txt(465,y,str(f.get("time","")).replace(" SGT",""),F11,BLACK,anchor="ra")
    d.line((14,y+18,465,y+18),fill=LIGHT,width=1)
    y += 24

# squad watch
d.line((2,266,478,266),fill=BLACK,width=2)
txt(14,274,"SQUAD WATCH",F12B)
y=297
for w in football.get("squadWatch", [])[:4]:
    typ=str(w.get("type","")).upper()
    c = YELLOW if typ in ("INJURY","SUSPEND") else BLUE
    box(14,y-2,75,y+15,width=1,fill=c)
    txt(44,y+2,typ,F8,BLACK if c==YELLOW else WHITE,anchor="ma")
    txt(84,y,w.get("player",""),F10,BLACK)
    txt(465,y,w.get("status",""),F9,BLACK,anchor="ra")
    d.line((14,y+18,465,y+18),fill=LIGHT,width=1)
    y += 25

# right: Arsenal summary + table
txt(494,56,"LEAGUE TABLE",F17B)
txt(785,60,"ARSENAL FOCUS",F9,GRAY,anchor="ra")
standings = football.get("standings", [])
ars = next((t for t in standings if str(t.get("team","")).lower()=="arsenal"), {})
stats=[("POSITION",ars.get("pos","-")),("POINTS",ars.get("pts","-")),("GOAL DIFF",("+" if isinstance(ars.get("gd"),(int,float)) and ars.get("gd",0)>0 else "")+str(ars.get("gd","-")))]
sx=494
for lab,val in stats:
    box(sx,82,sx+92,132,width=2)
    txt(sx+46,89,val,F20B,RED,anchor="ma")
    txt(sx+46,116,lab,F8,BLACK,anchor="ma")
    sx += 97

# table header
cols=[(496,"#"),(530,"TEAM"),(690,"P"),(727,"GD"),(770,"PTS")]
d.line((492,145,790,145),fill=BLACK,width=2)
for x,label in cols:
    txt(x,150,label,F8,BLACK)
d.line((492,166,790,166),fill=BLACK,width=2)

# choose top 8 plus ensure arsenal context
ars_i = next((i for i,t in enumerate(standings) if str(t.get("team","")).lower()=="arsenal"), -1)
idx=set(range(min(6,len(standings))))
if ars_i>=0:
    for i in range(max(0,ars_i-1), min(len(standings),ars_i+2)):
        idx.add(i)
rows=[standings[i] for i in sorted(idx)][:8]

y=173
for t in rows:
    isars=str(t.get("team","")).lower()=="arsenal"
    if isars:
        box(490,y-4,791,y+26,width=2,outline=RED)
    fill=RED if isars else BLACK
    txt(500,y,t.get("pos",""),F10,fill)
    txt(530,y,t.get("team",""),F10 if not isars else F12B,fill)
    txt(698,y,t.get("played",""),F10,fill,anchor="ma")
    gd=t.get("gd",0)
    gds=("+" if isinstance(gd,(int,float)) and gd>0 else "")+str(gd)
    txt(741,y,gds,F10,fill,anchor="ma")
    txt(778,y,t.get("pts",""),F12B,fill,anchor="ma")
    if not isars:
        d.line((492,y+25,790,y+25),fill=LIGHT,width=1)
    y += 33

# bottom fantasy strip
txt(14,447,"FANTASY HUB",F11,RED)
teams=[
    ("MAIN", fantasy.get("main",{})),
    ("D1", fantasy.get("draft",{}).get("d1",{})),
    ("D2", fantasy.get("draft",{}).get("d2",{})),
    ("C1", fantasy.get("challenge",{}).get("c1",{})),
]
x=110
for name,t in teams:
    box(x,442,x+155,472,width=1)
    txt(x+6,447,name,F9,BLACK)
    val=t.get("gameweekPoints")
    txt(x+142,445,"-" if val is None else val,F17B,BLUE,anchor="ra")
    txt(x+6,461,"GW pts",F8,GRAY)
    x += 165

out = ROOT / "e1002.png"
img.save(out, format="PNG", optimize=True)
print(f"Generated {out} ({out.stat().st_size} bytes)")

# -*- coding: utf-8 -*-
"""由用户封面派生 favicon / apple-touch-icon / OG 横版 banner（跑完可删）"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets'))
SRC = os.path.join(ROOT, 'share', 'og-cover.jpg')
im = Image.open(SRC).convert('RGB')
W, H = im.size

# 1) favicon：取曼陀罗中心区域 128x128
cx, cy = int(W * 0.5), int(H * 0.47)
half = int(W * 0.21)
im.crop((cx - half, cy - half, cx + half, cy + half)).resize((128, 128), Image.LANCZOS).save(
    os.path.join(ROOT, 'brand', 'favicon.png'), 'PNG', optimize=True)

# 2) apple-touch-icon：整图 180x180
im.resize((180, 180), Image.LANCZOS).save(os.path.join(ROOT, 'brand', 'apple-touch-icon.png'), 'PNG', optimize=True)

# 3) OG 横版 banner 1200x630：封面居中（平台中心方裁=完整封面），信息分列两侧
BW, BH = 1200, 630
banner = Image.new('RGB', (BW, BH), (14, 18, 32))
cover = im.resize((BH, BH), Image.LANCZOS)
cx0 = (BW - BH) // 2
banner.paste(cover, (cx0, 0))
d = ImageDraw.Draw(banner)
FB = 'C:/Windows/Fonts/msyhbd.ttc'
FR = 'C:/Windows/Fonts/msyh.ttc'
def font(p, s):
    try:
        return ImageFont.truetype(p, s)
    except Exception:
        return ImageFont.truetype(FR, s)
def center_text(x_center, y, s, f, fill):
    w = d.textlength(s, font=f)
    d.text((x_center - w / 2, y), s, font=f, fill=fill)
# 左侧：四个类目竖排
lcx = cx0 // 2
for i, s in enumerate(['卜卦', '星座', '手相', '塔罗']):
    center_text(lcx, 195 + i * 62, s, font(FB, 30), (152, 160, 180))
# 右侧：每日一签 + 合规声明
rcx = cx0 + BH + (BW - cx0 - BH) // 2
center_text(rcx, 225, '每日一签', font(FB, 30), (201, 169, 110))
center_text(rcx, 292, '仅供娱乐', font(FR, 24), (101, 109, 130))
center_text(rcx, 336, '不构成决策依据', font(FR, 18), (101, 109, 130))
banner.save(os.path.join(ROOT, 'share', 'og-banner-v2.jpg'), 'JPEG', quality=88, optimize=True, progressive=True)

for f in ['brand/favicon.png', 'brand/apple-touch-icon.png', 'share/og-banner-v2.jpg', 'share/og-cover.jpg']:
    p = os.path.join(ROOT, *f.split('/'))
    print(f, Image.open(p).size, os.path.getsize(p) // 1024, 'KB')

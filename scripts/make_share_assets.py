# -*- coding: utf-8 -*-
"""由用户封面派生 favicon / apple-touch-icon / OG 横版 banner（跑完可删）"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets'))
SRC = os.path.join(ROOT, 'share', 'og-cover.png')
im = Image.open(SRC).convert('RGB')
W, H = im.size

# 1) favicon：取曼陀罗中心区域 128x128
cx, cy = int(W * 0.5), int(H * 0.47)
half = int(W * 0.21)
im.crop((cx - half, cy - half, cx + half, cy + half)).resize((128, 128), Image.LANCZOS).save(
    os.path.join(ROOT, 'brand', 'favicon.png'), 'PNG', optimize=True)

# 2) apple-touch-icon：整图 180x180
im.resize((180, 180), Image.LANCZOS).save(os.path.join(ROOT, 'brand', 'apple-touch-icon.png'), 'PNG', optimize=True)

# 3) OG 横版 banner 1200x630：左封面 + 右文案
BW, BH = 1200, 630
banner = Image.new('RGB', (BW, BH), (14, 18, 32))
cover = im.resize((BH, BH), Image.LANCZOS)
banner.paste(cover, (0, 0))
d = ImageDraw.Draw(banner)
FB = 'C:/Windows/Fonts/msyhbd.ttc'
FR = 'C:/Windows/Fonts/msyh.ttc'
def font(p, s):
    try:
        return ImageFont.truetype(p, s)
    except Exception:
        return ImageFont.truetype(FR, s)
x = BH + 40
d.text((x, 150), '今日宜签', font=font(FB, 92), fill=(201, 169, 110))
d.text((x + 2, 285), '四种方式 · 一次自观', font=font(FR, 34), fill=(152, 160, 180))
d.text((x + 2, 360), '卜卦 · 星座 · 手相 · 塔罗 · 每日一签', font=font(FR, 28), fill=(101, 109, 130))
d.text((x + 2, 430), '纯娱乐自我探索 · 不预测 · 不断言', font=font(FR, 24), fill=(101, 109, 130))
banner.save(os.path.join(ROOT, 'share', 'og-banner.png'), 'PNG', optimize=True)

for f in ['brand/favicon.png', 'brand/apple-touch-icon.png', 'share/og-banner.png', 'share/og-cover.png']:
    p = os.path.join(ROOT, *f.split('/'))
    print(f, Image.open(p).size, os.path.getsize(p) // 1024, 'KB')

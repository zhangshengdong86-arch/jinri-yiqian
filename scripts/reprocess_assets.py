# -*- coding: utf-8 -*-
"""
一次性图片重整脚本（跑完可删）：
1. 星座系 15 张方图：裁掉右下角「AI生成 WORKBUDDY」水印 + 按主体紧裁 + 输出 720x720（手机 2x）
2. zd_today_card：缩到 750x422（16:9 手机横幅）
3. 塔罗 81 张：保持 600x800，仅重压缩（q76）
4. 小图标类：原尺寸重压缩
5. brand_logo.png：内容实为 webp，转成真 PNG 并缩到 256
所有输出覆盖原文件名（代码引用不变）。原图在 git 历史与 source/ 中有备份。
"""
import os
import cv2
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
ROOT = os.path.normpath(ROOT)

# 1024 方图右下角水印区域（归一化）：x>0.85 且 y>0.92
WM_X, WM_Y = 0.85, 0.92


def subject_bbox(path):
    """用连通域找主体（过滤星点等小噪点），返回 (x0,y0,x1,y1) 或 None"""
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        return None
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, th = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    n, lab, stats, cent = cv2.connectedComponentsWithStats(th, 8)
    H, W = gray.shape
    boxes = [s for s in stats[1:] if s[4] > max(300, W * H * 0.0004)]
    if not boxes:
        return None
    x0 = min(s[0] for s in boxes)
    y0 = min(s[1] for s in boxes)
    x1 = max(s[0] + s[2] for s in boxes)
    y1 = max(s[1] + s[3] for s in boxes)
    return (x0, y0, x1, y1)


def process_zodiac_square(path, out_size=720):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    wm_x, wm_y = int(W * WM_X), int(H * WM_Y)      # 水印左上角
    avail_h = wm_y                                   # 安全高度（水印以上）
    bb = subject_bbox(path)
    if bb:
        x0, y0, x1, y1 = bb
        mw = int((x1 - x0) * 0.12)
        mh = int((y1 - y0) * 0.12)
        x0, y0 = max(0, x0 - mw), max(0, y0 - mh)
        x1, y1 = min(W, x1 + mw), min(H, y1 + mh)
        side = max(x1 - x0, y1 - y0)
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        if side > avail_h:                           # 主体太大：退化为「去水印后居中方裁」
            side = avail_h
            cx, cy = W // 2, avail_h // 2
        # 方框中心定位，并保证不碰水印区、不出界
        left = min(max(0, cx - side // 2), W - side)
        top = min(max(0, cy - side // 2), avail_h - side)
        top = max(0, top)
        box = (left, top, left + side, top + side)
    else:
        side = min(W, avail_h)
        box = ((W - side) // 2, 0, (W + side) // 2, side)
    im2 = im.crop(box).resize((out_size, out_size), Image.LANCZOS)
    im2.save(path, 'WEBP', quality=82, method=6)
    return box


def simple_resize(path, size, quality=82):
    im = Image.open(path).convert('RGB')
    im = im.resize(size, Image.LANCZOS)
    im.save(path, 'WEBP', quality=quality, method=6)


def recompress(path, quality):
    im = Image.open(path).convert('RGB')
    fmt = 'WEBP' if path.lower().endswith('.webp') else None
    if fmt:
        im.save(path, 'WEBP', quality=quality, method=6)


report = []

# ---- 1. 星座方图（带水印） ----
zodiac_sq = []
for fn in sorted(os.listdir(os.path.join(ROOT, 'zodiac'))):
    if fn.endswith('.webp') and (fn.startswith('zd_art_') or fn.startswith('zd_galaxy_')):
        zodiac_sq.append(fn)
for fn in zodiac_sq:
    p = os.path.join(ROOT, 'zodiac', fn)
    box = process_zodiac_square(p)
    report.append(('zodiac', fn, box, os.path.getsize(p) // 1024))

# ---- 2. today card ----
p = os.path.join(ROOT, 'zodiac', 'zd_today_card.webp')
simple_resize(p, (750, 422), 82)
report.append(('zodiac', 'zd_today_card.webp', 'resize 750x422', os.path.getsize(p) // 1024))

# ---- 3. 塔罗重压缩 ----
tdir = os.path.join(ROOT, 'tarot')
for fn in sorted(os.listdir(tdir)):
    if fn.endswith('.webp'):
        p = os.path.join(tdir, fn)
        recompress(p, 76)
report.append(('tarot', '81 files', 'recompress q76', sum(os.path.getsize(os.path.join(tdir, f)) for f in os.listdir(tdir) if f.endswith('.webp')) // 1024))

# ---- 4. 小图标重压缩 ----
for sub, q in (('brand', 85), ('palm', 82), ('divination', 82)):
    d = os.path.join(ROOT, sub)
    for fn in sorted(os.listdir(d)):
        p = os.path.join(d, fn)
        if fn.endswith('.webp'):
            recompress(p, q)

# ---- 5. brand_logo.png 实为 webp → 真 PNG 256 ----
p = os.path.join(ROOT, 'brand', 'brand_logo.png')
im = Image.open(p).convert('RGB')
im = im.resize((256, 256), Image.LANCZOS)
im.save(p, 'PNG', optimize=True)
report.append(('brand', 'brand_logo.png', 'webp→png 256x256', os.path.getsize(p) // 1024))

print('处理完成：')
for r in report:
    print('  ', r)

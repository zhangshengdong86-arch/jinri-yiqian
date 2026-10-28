# -*- coding: utf-8 -*-
"""星座图二次精裁（跑完可删）：
- zd_art_* 13 张：只认金色/白色亮线主体（高阈值+连通域过滤星点），居中紧裁，去右下角水印
- zd_galaxy_* 2 张：满幅裁掉水印带后居中方裁
- zd_today_card：缩 750x422
输出 720x720 webp q82，覆盖原文件名。
"""
import os
import cv2
import numpy as np
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'zodiac'))
AVAIL = 0.92          # 水印安全线（y 方向可用比例）
OUT = 720


def bright_bbox(path):
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mean, std = gray.mean(), gray.std()
    t = max(100, mean + 2.2 * std)
    _, th = cv2.threshold(gray, t, 255, cv2.THRESH_BINARY)
    n, lab, stats, cent = cv2.connectedComponentsWithStats(th, 8)
    H, W = gray.shape
    boxes = [s for s in stats[1:] if s[4] > 200]          # 过滤星点
    if not boxes:
        return None
    x0 = min(s[0] for s in boxes); y0 = min(s[1] for s in boxes)
    x1 = max(s[0] + s[2] for s in boxes); y1 = max(s[1] + s[3] for s in boxes)
    return (x0, y0, x1, y1)


def square_crop_centered(im, cx, cy, side, W, H):
    avail_h = int(H * AVAIL)
    side = min(side, avail_h, W)
    left = int(min(max(0, cx - side / 2), W - side))
    top = int(min(max(0, cy - side / 2), avail_h - side))
    return im.crop((left, top, left + side, top + side))


done = []
for fn in sorted(os.listdir(ROOT)):
    if not fn.endswith('.webp'):
        continue
    p = os.path.join(ROOT, fn)
    im = Image.open(p).convert('RGB')
    W, H = im.size
    if fn.startswith('zd_art_'):
        bb = bright_bbox(p)
        if bb:
            x0, y0, x1, y1 = bb
            mw, mh = int((x1 - x0) * 0.10), int((y1 - y0) * 0.10)
            x0, y0 = max(0, x0 - mw), max(0, y0 - mh)
            x1, y1 = min(W, x1 + mw), min(H, y1 + mh)
            side = max(x1 - x0, y1 - y0)
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        else:
            side, cx, cy = int(W * 0.8), W / 2, H * 0.45
        im2 = square_crop_centered(im, cx, cy, side, W, H)
    elif fn.startswith('zd_galaxy_'):
        side = min(W, int(H * AVAIL))
        im2 = square_crop_centered(im, W / 2, int(H * AVAIL) / 2, side, W, H)
    elif fn == 'zd_today_card.webp':
        im.resize((750, 422), Image.LANCZOS).save(p, 'WEBP', quality=82, method=6)
        done.append((fn, '750x422'))
        continue
    else:
        continue
    im2.resize((OUT, OUT), Image.LANCZOS).save(p, 'WEBP', quality=82, method=6)
    done.append((fn, str(im2.size)))

for d in done:
    print(' ', d[0], '->', d[1], os.path.getsize(os.path.join(ROOT, d[0])) // 1024, 'KB')

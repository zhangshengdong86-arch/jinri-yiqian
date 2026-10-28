# -*- coding: utf-8 -*-
"""星座线稿三次精裁（跑完可删）：
只认金色线条（R 明显大于 B 的暖色亮像素），连通域过滤星点，
以金色主体 bbox 居中裁正方形，彻底避开右侧淡紫星云的干扰。
仅处理 zd_art_* 13 张；galaxy / today_card 不动。
"""
import os
import cv2
import numpy as np
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'zodiac'))
AVAIL = 0.92
OUT = 720


def gold_bbox(path):
    img = cv2.imread(path, cv2.IMREAD_COLOR)          # BGR
    B = img[:, :, 0].astype(np.int16)
    G = img[:, :, 1].astype(np.int16)
    R = img[:, :, 2].astype(np.int16)
    mask = ((R - B) > 25) & (R > 110)
    m8 = (mask.astype(np.uint8)) * 255
    m8 = cv2.dilate(m8, np.ones((5, 5), np.uint8))     # 连接线条
    n, lab, stats, cent = cv2.connectedComponentsWithStats(m8, 8)
    boxes = [s for s in stats[1:] if s[4] > 300]
    if not boxes:
        return None
    x0 = min(s[0] for s in boxes); y0 = min(s[1] for s in boxes)
    x1 = max(s[0] + s[2] for s in boxes); y1 = max(s[1] + s[3] for s in boxes)
    return (x0, y0, x1, y1)


for fn in sorted(os.listdir(ROOT)):
    if not fn.startswith('zd_art_') or not fn.endswith('.webp'):
        continue
    p = os.path.join(ROOT, fn)
    im = Image.open(p).convert('RGB')
    W, H = im.size
    bb = gold_bbox(p)
    if not bb:
        print('  skip(无金色主体):', fn)
        continue
    x0, y0, x1, y1 = bb
    mw, mh = int((x1 - x0) * 0.16), int((y1 - y0) * 0.16)
    x0, y0 = max(0, x0 - mw), max(0, y0 - mh)
    x1, y1 = min(W, x1 + mw), min(H, y1 + mh)
    side = max(x1 - x0, y1 - y0)
    avail_h = int(H * AVAIL)
    side = min(side, avail_h, W)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    left = int(min(max(0, cx - side / 2), W - side))
    top = int(min(max(0, cy - side / 2), avail_h - side))
    im.crop((left, top, left + side, top + side)).resize((OUT, OUT), Image.LANCZOS).save(p, 'WEBP', quality=82, method=6)
    print('  %-34s bbox=(%d,%d,%d,%d) crop=(%d,%d,%d)' % (fn, x0, y0, x1, y1, left, top, side))

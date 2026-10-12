"""Deterministic radial-hierarchy layout. Depth -> ring; angular wedge proportional to subtree size."""
import math
from collections import defaultdict

SPACING = 4.0   # lane pitch / min node distance (layout units)
GAP = 30.0      # radial gap between depth bands


def layout_tree(nodes, parent, dist):
    """nodes: list of playerIDs in one component. Returns {player: (x, y)} centered at root, plus radius."""
    children = defaultdict(list)
    root = None
    for n in nodes:
        if parent[n] is None:
            root = n
        else:
            children[parent[n]].append(n)
    for c in children.values():
        c.sort()
    order, i = [root], 0
    while i < len(order):
        order.extend(children.get(order[i], []))
        i += 1
    size = {}
    for n in reversed(order):
        size[n] = 1 + sum(size[c] for c in children.get(n, []))
    per_depth = defaultdict(int)
    for n in nodes:
        per_depth[dist[n]] += 1
    # Wedge angles: each node sits at the middle of its subtree-proportional wedge.
    lo, hi, ang = {root: 0.0}, {root: 2 * math.pi}, {}
    for n in order:
        a0, a1 = lo[n], hi[n]
        ang[n] = (a0 + a1) / 2
        kids = children.get(n, [])
        if kids:
            tot = sum(size[c] for c in kids)
            cur = a0
            for c in kids:
                w = (a1 - a0) * size[c] / tot
                lo[c], hi[c] = cur, cur + w
                cur += w
    # Radii: each depth is a band of L staggered lanes (pitch SPACING) so crowded depths stay compact.
    by_depth = defaultdict(list)
    for n in nodes:
        by_depth[dist[n]].append(n)
    base, lanes, outer = {0: 0.0}, {0: 1}, 0.0
    for d in range(1, max(per_depth) + 1):
        r0, L = outer + GAP, 1
        while per_depth[d] * SPACING > 2 * math.pi * (r0 + (L - 1) * SPACING / 2) * L:
            L += 1
        base[d], lanes[d] = r0, L
        outer = r0 + (L - 1) * SPACING
    lane = {}
    for d, ns in by_depth.items():
        for k, n in enumerate(sorted(ns, key=lambda n: (ang[n], n))):
            lane[n] = k % lanes[d]
    pos = {}
    for n in nodes:
        rr = base[dist[n]] + lane[n] * SPACING
        pos[n] = (rr * math.cos(ang[n]), rr * math.sin(ang[n]))
    radius = {0: outer}
    return pos, max(radius.values())


def place_satellites(comp_layouts, main_radius, margin=30.0):
    """comp_layouts: list of (pos_dict, radius) sorted large->small. Packs along concentric rings outside
    the main component. Returns list of (dx, dy) offsets."""
    offsets, ring_r = [], main_radius + margin * 2
    arc_used, ring_h = 0.0, 0.0
    for pos, rad in comp_layouts:
        diam = max(2 * rad, SPACING * 2) + margin * 0.3
        circ = 2 * math.pi * (ring_r + diam / 2)
        if arc_used + diam > circ and arc_used > 0:
            ring_r += ring_h + margin * 0.3
            arc_used, ring_h = 0.0, 0.0
            circ = 2 * math.pi * (ring_r + diam / 2)
        ang = 2 * math.pi * (arc_used + diam / 2) / circ
        cr = ring_r + diam / 2
        offsets.append((cr * math.cos(ang), cr * math.sin(ang)))
        arc_used += diam
        ring_h = max(ring_h, diam)
    return offsets

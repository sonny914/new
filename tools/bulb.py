"""Quiet Bands · Bulb Entry · geometry bake.

Builds the wireframe lightbulb as line-bearing meshes, splits the glass into four Voronoi
fragments (the nav), samples the debris seeds along the cracks, and writes one .glb plus a
static SVG of the whole bulb for the no-JS / no-WebGL fallback.

Run with the bpy wheel:      python3 tools/bulb.py
or in a Blender install:     blender -b --python tools/bulb.py

Output: assets/bulb/bulb.glb, assets/bulb/bulb-static.svg. Deterministic (seeded).

Units: the glass envelope has radius 1 at its equator; +Z is up in Blender, exported as +Y up.
Node names the runtime relies on: shell_0..shell_3, base, filament, dims, debris.
"""
import math
import os
import random
import sys

import bpy
import bmesh
from mathutils import Vector

random.seed(7)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'assets', 'bulb')
os.makedirs(OUT, exist_ok=True)

LONGS = 24            # longitude lines on the glass
LAT_STEP = 10.0       # degrees between latitude rings on the sphere
RIM = 0.022           # glass thickness shown at the cracks and the neck rim
NECK_Z = -1.55        # where the glass meets the base
NECK_R = 0.36

# Voronoi seeds: four fragments of deliberately uneven size. Order = nav order.
SEEDS = [
    Vector((0.55, 0.75, 0.35)),    # 0 Experiments: upper front-right, the largest
    Vector((-0.85, 0.20, 0.45)),   # 1 Build Log: left
    Vector((0.10, -0.60, -0.75)),  # 2 Work: back, lower
    Vector((-0.20, 0.30, -1.25)),  # 3 Contact: the neck
]

# ---------------------------------------------------------------- helpers

def new_object(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def lathe(profile, steps, cap_top=False):
    """Spin an (r, z) profile around Z. Returns a bmesh of quads (lat/long grid)."""
    bm = bmesh.new()
    prev = None
    for (r, z) in profile:
        v = bm.verts.new((r, 0.0, z))
        if prev is not None:
            bm.edges.new((prev, v))
        prev = v
    geom = bm.verts[:] + bm.edges[:]
    bmesh.ops.spin(bm, geom=geom, cent=(0, 0, 0), axis=(0, 0, 1), angle=math.radians(360), steps=steps, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    return bm


def smoothstep(k):
    k = max(0.0, min(1.0, k))
    return k * k * (3 - 2 * k)


def glass_profile():
    """Top pole, sphere down to -35°, then a neck easing into the base radius."""
    pts = [(0.0, 1.0)]
    lat = 90.0 - LAT_STEP
    while lat >= -30.0:
        a = math.radians(lat)
        pts.append((math.cos(a), math.sin(a)))
        lat -= LAT_STEP
    r0, z0 = math.cos(math.radians(-30)), math.sin(math.radians(-30))
    n = 8
    for i in range(1, n + 1):
        k = i / n
        e = smoothstep(k) ** 0.8            # narrows early, then runs almost straight into the base
        pts.append((r0 + (NECK_R - r0) * e, z0 + (NECK_Z - z0) * k))
    return pts


def add_polyline(bm, pts, closed=False):
    vs = [bm.verts.new(p) for p in pts]
    for a, b in zip(vs, vs[1:]):
        bm.edges.new((a, b))
    if closed:
        bm.edges.new((vs[-1], vs[0]))
    return vs


def circle_pts(r, z, n):
    return [(r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n), z) for i in range(n)]


def boundary_edges(bm):
    return [e for e in bm.edges if e.is_boundary]


def rim_strip(bm, depth):
    """Give every open edge a thin inward strip so the glass reads as having thickness at the cracks."""
    bm.normal_update()
    edges = boundary_edges(bm)
    if not edges:
        return
    normals = {}
    for e in edges:
        for v in e.verts:
            normals[v.index] = v.normal.copy()
    bm.verts.ensure_lookup_table()
    ret = bmesh.ops.extrude_edge_only(bm, edges=edges)
    new_verts = [g for g in ret['geom'] if isinstance(g, bmesh.types.BMVert)]
    # each new vert sits on an original; find it by position
    src = {}
    for v in bm.verts:
        if v.index in normals:
            src[(round(v.co.x, 5), round(v.co.y, 5), round(v.co.z, 5))] = normals[v.index]
    for v in new_verts:
        n = src.get((round(v.co.x, 5), round(v.co.y, 5), round(v.co.z, 5)))
        if n is not None:
            v.co -= n.normalized() * depth
    bm.normal_update()


def fragment(bm_src, i):
    """Voronoi cell i of the glass: clip by the bisector plane against every other seed."""
    bm = bm_src.copy()
    si = SEEDS[i]
    for j, sj in enumerate(SEEDS):
        if j == i:
            continue
        no = (sj - si).normalized()
        co = (si + sj) * 0.5
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-6, plane_co=co, plane_no=no, clear_outer=True, clear_inner=False)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bm.verts.index_update()
    return bm


CRACK_JITTER = 0.032   # a crack is not an arc: every vertex along it steps sideways on the glass, the same step on both fragments

def key(co):
    return (round(co.x, 4), round(co.y, 4), round(co.z, 4))


def crack_verts(frags):
    """Boundary vertices of the fragments that lie on cracks (not on the neck rim), keyed by position across fragments."""
    out = {}
    for bm in frags:
        bm.normal_update()
        for e in boundary_edges(bm):
            a, b = e.verts
            if a.co.z < NECK_Z + 0.02 and b.co.z < NECK_Z + 0.02:
                continue
            for v in (a, b):
                d = out.setdefault(key(v.co), {'co': v.co.copy(), 'n': v.normal.copy(), 'nb': set(), 'verts': []})
                d['verts'].append(v)
            out[key(a.co)]['nb'].add(key(b.co)); out[key(b.co)]['nb'].add(key(a.co))
    return out


def jitter_cracks(frags):
    cv = crack_verts(frags)
    for k, d in cv.items():
        if len(d['nb']) != 2 or d['co'].z < NECK_Z + 0.02:
            continue                                   # junctions, ends and the neck rim stay put
        n0, n1 = list(d['nb'])
        t = (cv[n1]['co'] - cv[n0]['co'])
        if t.length < 1e-6:
            continue
        side = d['n'].cross(t.normalized())
        if side.length < 1e-6:
            continue
        amp = CRACK_JITTER * (random.Random(str(k)).random() * 2 - 1)
        for v in d['verts']:
            v.co += side.normalized() * amp
    for bm in frags:
        bm.normal_update()


def wire_edges(bm, threshold_deg=1.0):
    """Edges EdgesGeometry would draw: boundary edges and edges between faces meeting at more than the threshold."""
    out = []
    cos_t = math.cos(math.radians(threshold_deg))
    for e in bm.edges:
        fs = e.link_faces
        if len(fs) < 2:
            out.append(e)
        elif fs[0].normal.dot(fs[1].normal) < cos_t:
            out.append(e)
    return out


def collect_lines(frags):
    """Two loose-edge sets: the whole shell's grid (no cracks) and the crack polylines. Deduplicated across fragments."""
    grid, cracks = {}, {}
    for bm in frags:
        for e in wire_edges(bm):
            a, b = e.verts
            k = tuple(sorted((key(a.co), key(b.co))))
            on_rim = a.co.z < NECK_Z + 0.02 and b.co.z < NECK_Z + 0.02
            if e.is_boundary and not on_rim:
                cracks[k] = (a.co.copy(), b.co.copy())
            else:
                grid[k] = (a.co.copy(), b.co.copy())
    def to_bm(segs):
        bm = bmesh.new(); vs = {}
        for (a, b) in segs.values():
            va = vs.get(key(a)) or vs.setdefault(key(a), bm.verts.new(a))
            vb = vs.get(key(b)) or vs.setdefault(key(b), bm.verts.new(b))
            if va is not vb:
                try: bm.edges.new((va, vb))
                except ValueError: pass
        return bm
    return to_bm(grid), to_bm(cracks)


def nearest_two(p):
    d = sorted((p - s).length for s in SEEDS)
    return d[0], d[1]


def sample_surface(bm, count):
    """Area-weighted random points on the faces of a bmesh."""
    faces = [f for f in bm.faces]
    areas = [f.calc_area() for f in faces]
    total = sum(areas)
    out = []
    for _ in range(count):
        r = random.random() * total
        acc = 0.0
        for f, a in zip(faces, areas):
            acc += a
            if acc >= r:
                vs = [v.co for v in f.verts]
                # split polygon into a fan; pick a triangle by rough equal weight
                k = random.randrange(1, len(vs) - 1)
                a_, b_, c_ = vs[0], vs[k], vs[k + 1]
                u, v = random.random(), random.random()
                if u + v > 1:
                    u, v = 1 - u, 1 - v
                out.append(a_ + (b_ - a_) * u + (c_ - a_) * v)
                break
    return out


# ---------------------------------------------------------------- build

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# glass: one lathe, then four fragments
glass = lathe(glass_profile(), LONGS)
frags = [fragment(glass, i) for i in range(len(SEEDS))]
# the whole-bulb grid comes from the unbroken lathe, so nothing hints at the cracks before they are drawn;
# the crack lines and the fragments carry the jitter that makes a crack a crack and not an arc
clean = [fragment(glass, i) for i in range(len(SEEDS))]
shell_wire, _ = collect_lines(clean)
jitter_cracks(frags)
_, cracks = collect_lines(frags)
new_object('shell_wire', shell_wire)
new_object('cracks', cracks)
for bm in frags:
    rim_strip(bm, RIM)
for i, bm in enumerate(frags):
    new_object(f'shell_{i}', bm)

# base: screw shell (faces, so it occludes) + thread rings + contact tip
base_profile = [(NECK_R, NECK_Z), (NECK_R, NECK_Z - 0.10), (NECK_R + 0.03, NECK_Z - 0.16), (NECK_R, NECK_Z - 0.22),
                (NECK_R + 0.03, NECK_Z - 0.28), (NECK_R, NECK_Z - 0.34), (NECK_R + 0.03, NECK_Z - 0.40), (NECK_R, NECK_Z - 0.46),
                (NECK_R - 0.02, NECK_Z - 0.52), (0.22, NECK_Z - 0.56), (0.14, NECK_Z - 0.64), (0.0, NECK_Z - 0.66)]
base = lathe(base_profile, 16)
new_object('base', base)

# filament: the glass mount (press) rising from the base, two support wires, one arc of filament between them
fil = bmesh.new()
add_polyline(fil, [(-0.07, 0.0, NECK_Z + 0.02), (-0.07, 0.0, -0.78), (-0.12, 0.0, -0.70), (-0.12, 0.0, -0.56), (0.12, 0.0, -0.56), (0.12, 0.0, -0.70), (0.07, 0.0, -0.78), (0.07, 0.0, NECK_Z + 0.02)])
add_polyline(fil, [(-0.05, 0.0, -0.56), (-0.30, 0.0, 0.12)])
add_polyline(fil, [(0.05, 0.0, -0.56), (0.30, 0.0, 0.12)])
arc = []
n = 14
for k in range(n + 1):
    u = k / n
    arc.append((-0.30 + 0.60 * u, 0.0, 0.12 + 0.20 * math.sin(math.pi * u)))
add_polyline(fil, arc)
new_object('filament', fil)

# dimension marks: overall height to the right, diameter across the top. Thin, with tick ends.
dims = bmesh.new()
TOP, BOT = 1.0, NECK_Z - 0.66
X = 1.42
tick = 0.07
add_polyline(dims, [(X, 0.0, BOT), (X, 0.0, TOP)])
add_polyline(dims, [(X - tick, 0.0, TOP), (X + tick, 0.0, TOP)])
add_polyline(dims, [(X - tick, 0.0, BOT), (X + tick, 0.0, BOT)])
add_polyline(dims, [(1.02, 0.0, TOP), (X - 0.06, 0.0, TOP)])       # extension line, top
add_polyline(dims, [(0.30, 0.0, BOT), (X - 0.06, 0.0, BOT)])       # extension line, bottom
ZD = 1.30
add_polyline(dims, [(-1.0, 0.0, ZD), (1.0, 0.0, ZD)])
add_polyline(dims, [(-1.0, 0.0, ZD - tick), (-1.0, 0.0, ZD + tick)])
add_polyline(dims, [(1.0, 0.0, ZD - tick), (1.0, 0.0, ZD + tick)])
add_polyline(dims, [(-1.0, 0.0, 0.06), (-1.0, 0.0, ZD - 0.06)])     # extension lines, equator to the dimension
add_polyline(dims, [(1.0, 0.0, 0.06), (1.0, 0.0, ZD - 0.06)])
new_object('dims', dims)

# debris: points on the glass within a hair of a crack (the Voronoi boundary)
pts = sample_surface(glass, 60000)
near = [p for p in pts if abs((lambda d: d[0] - d[1])(nearest_two(p))) < 0.10]
random.shuffle(near)
near = near[:1600]
deb = bmesh.new()
for p in near:
    deb.verts.new(p)
new_object('debris', deb)

# ---------------------------------------------------------------- export glb

glb = os.path.join(OUT, 'bulb.glb')

# export_colors was renamed across versions; build kwargs defensively
kwargs = dict(filepath=glb, export_format='GLB', export_apply=True, export_materials='NONE', export_normals=False, export_texcoords=False,
              use_mesh_edges=True, use_mesh_vertices=True, export_yup=True, export_animations=False, export_skins=False,
              export_morph=False, export_lights=False, export_cameras=False, export_extras=False)
props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
if 'export_vertex_color' in props:
    kwargs['export_vertex_color'] = 'NONE'
elif 'export_colors' in props:
    kwargs['export_colors'] = False
bpy.ops.export_scene.gltf(**kwargs)

# ---------------------------------------------------------------- static svg (front view, x right, z up)

lines = []
for e in wire_edges(base):
    a, b = e.verts
    lines.append(((a.co.x, a.co.z), (b.co.x, b.co.z)))
for bm in (shell_wire, cracks, fil, dims):
    for e in bm.edges:
        a, b = e.verts
        lines.append(((a.co.x, a.co.z), (b.co.x, b.co.z)))

W, H = 1200, 1600
xmin, xmax, zmin, zmax = -1.6, 1.6, -2.45, 1.55
sx = W / (xmax - xmin)
sz = H / (zmax - zmin)
def P(p):
    return f'{(p[0] - xmin) * sx:.1f},{(zmax - p[1]) * sz:.1f}'
d = ' '.join(f'M{P(a)} L{P(b)}' for a, b in lines)
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="A wireframe lightbulb, its glass cracked into four pieces.">'
       f'<rect width="{W}" height="{H}" fill="#0B0A09"/>'
       f'<path d="{d}" fill="none" stroke="#E8DCC2" stroke-width="1.1" stroke-linecap="round" stroke-opacity="0.85"/></svg>')
with open(os.path.join(OUT, 'bulb-static.svg'), 'w') as f:
    f.write(svg)

# ---------------------------------------------------------------- report
size = os.path.getsize(glb)
print(f'bulb.glb {size / 1024:.1f} KB · fragments {[len(b.verts) for b in frags]} verts · grid {len(shell_wire.edges)} edges · cracks {len(cracks.edges)} edges · base {len(base.verts)} · debris {len(near)} · svg lines {len(lines)}')
for i, bm in enumerate(frags):
    c = sum((v.co for v in bm.verts), Vector()) / max(1, len(bm.verts))
    print(f'  shell_{i}: {len(bm.faces)} faces, centre ({c.x:.2f}, {c.y:.2f}, {c.z:.2f})')

# Find beats in a narration line by word position, not pause number (takes vary in how many pauses they have).
def brk(L, n, frac):
    """(start, end) of the pause nearest to fraction `frac` of line n (by words). No pause: a zero-length point."""
    l = L[n]; want = l["at"] + frac * (l["end"] - l["at"])
    if not l["pauses"]: return (want, want)
    a, b = min(l["pauses"], key=lambda p: abs((p[0] + p[1]) / 2 - want)); return (a, b)

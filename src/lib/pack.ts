export interface PackInfo {
  col: number;
  cols: number;
}

interface Span {
  id: string;
  start: number;
  end: number;
}

/**
 * Greedy interval-packing: overlapping items on the same day are split into
 * side-by-side columns. Returns per-item {col, cols}. Lifted from the prototype.
 */
export function pack(evts: Span[]): Record<string, PackInfo> {
  const sorted = [...evts].sort((a, b) => a.start - b.start || a.end - b.end);
  const res: Record<string, PackInfo> = {};
  const clusters: Span[][] = [];
  let cur: Span[] = [];
  let curEnd = -1;

  for (const e of sorted) {
    if (cur.length && e.start >= curEnd) {
      clusters.push(cur);
      cur = [];
      curEnd = -1;
    }
    cur.push(e);
    curEnd = Math.max(curEnd, e.end);
  }
  if (cur.length) clusters.push(cur);

  for (const cl of clusters) {
    const cols: number[] = [];
    for (const e of cl) {
      let placed = false;
      for (let i = 0; i < cols.length; i++) {
        if (cols[i] <= e.start) {
          cols[i] = e.end;
          res[e.id] = { col: i, cols: 0 };
          placed = true;
          break;
        }
      }
      if (!placed) {
        cols.push(e.end);
        res[e.id] = { col: cols.length - 1, cols: 0 };
      }
    }
    for (const e of cl) res[e.id].cols = cols.length;
  }
  return res;
}

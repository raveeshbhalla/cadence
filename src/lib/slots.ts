import { END_HOUR, START_HOUR } from "../theme";

interface Span {
  start: number;
  end: number;
}

/**
 * Find up to `max` open start-times of length `dur` on a day, from `fromMin`
 * onward, avoiding the given busy spans. All values in minutes from midnight.
 */
export function openSlots(items: Span[], fromMin: number, dur: number, max = 3): number[] {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const slots: number[] = [];
  let cand = Math.ceil(Math.max(fromMin, START_HOUR * 60) / 15) * 15;
  let guard = 0;
  while (cand + dur <= END_HOUR * 60 && slots.length < max && guard++ < 300) {
    const blocking = sorted.find((it) => it.start < cand + dur && it.end > cand);
    if (!blocking) {
      slots.push(cand);
      cand += dur;
    } else {
      cand = Math.ceil(blocking.end / 15) * 15;
    }
  }
  return slots;
}

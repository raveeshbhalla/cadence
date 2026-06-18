import type { CalEvent } from "../types";

const LINK_RE = /(https?:\/\/[^\s<>"]*(?:zoom\.us\/[^\s<>"]*|meet\.google\.com\/[^\s<>"]*|teams\.microsoft\.com\/[^\s<>"]*|teams\.live\.com\/[^\s<>"]*|webex\.com\/[^\s<>"]*|whereby\.com\/[^\s<>"]*|meet\.jit\.si\/[^\s<>"]*))/i;

/**
 * The best video-conference link for an event: prefer the Google conferencing
 * link, else find a known provider URL in the location or description.
 */
export function meetingLink(e: Pick<CalEvent, "hangoutLink" | "location" | "description">): string | undefined {
  if (e.hangoutLink) return e.hangoutLink;
  for (const field of [e.location, e.description]) {
    if (!field) continue;
    const m = field.match(LINK_RE);
    if (m) return m[1];
  }
  return undefined;
}

/**
 * Slot fallback. Rendered on hard navigations to routes the slot
 * doesn't intercept, and when Next can't recover the slot's state.
 *
 * Returning null means: "no modal active." If we ever want a guaranteed
 * empty-state UI here (e.g. for analytics), make it transparent.
 */
export default function ModalSlotDefault() {
  return null;
}

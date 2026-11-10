/**
 * Whether the checkout screen is currently waiting for the OpenPay in-app
 * browser to close. `+native-intent` reads it so the return deep link
 * (`finisherlegacy://checkout/return?order=…`, which Android also delivers
 * as a regular deep link) doesn't push a second screen on top of the
 * checkout. Module state on purpose: it must be readable outside React.
 */
let awaiting = 0;

export function beginAwaitingCheckoutReturn(): () => void {
  awaiting += 1;
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    awaiting = Math.max(0, awaiting - 1);
  };
}

export function isAwaitingCheckoutReturn(): boolean {
  return awaiting > 0;
}

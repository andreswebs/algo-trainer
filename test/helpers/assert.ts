import { rejects, throws } from 'node:assert/strict';

type ErrorClass = new (...args: never[]) => Error;

// Node treats a third string argument to throws/rejects as the failure message, not a matcher,
// so a substring check needs a predicate.
export function assertThrowsWith(
  fn: () => unknown,
  errorClass: ErrorClass,
  includes: string,
): void {
  throws(fn, (error: unknown) => error instanceof errorClass && error.message.includes(includes));
}

export async function assertRejectsWith(
  fn: () => Promise<unknown>,
  errorClass: ErrorClass,
  includes: string,
): Promise<void> {
  await rejects(
    fn,
    (error: unknown) => error instanceof errorClass && error.message.includes(includes),
  );
}

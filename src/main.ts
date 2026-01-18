import { main } from './cli/main.ts';
import { logError } from './utils/output.ts';

export { main };

if (import.meta.main) {
  try {
    await main(Deno.args);
  } catch (error) {
    logError(error);
    Deno.exit(1);
  }
}

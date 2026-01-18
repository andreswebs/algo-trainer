import { main } from './cli/main.ts';
import { logErrorObject } from './utils/output.ts';

export { main };

if (import.meta.main) {
  try {
    await main(Deno.args);
  } catch (error) {
    logErrorObject(error);
    Deno.exit(1);
  }
}

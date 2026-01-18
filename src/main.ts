import { main } from './cli/main.ts';
import { logger } from './utils/output.ts';

export { main };

if (import.meta.main) {
  try {
    await main(Deno.args);
  } catch (error) {
    logger.errorObject(error);
    Deno.exit(1);
  }
}

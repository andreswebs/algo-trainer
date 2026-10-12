import { main } from './cli/main.ts';
import { closeInput } from './cli/prompts.ts';
import { logger } from './utils/output.ts';

export { main };

if (import.meta.main) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    logger.errorObject(error);
    process.exit(1);
  } finally {
    closeInput();
  }
}

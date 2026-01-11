import { main } from './cli/main.ts';

export { main };

if (import.meta.main) {
  try {
    await main(Deno.args);
  } catch (error) {
    console.error(error);
    Deno.exit(1);
  }
}

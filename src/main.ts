export { main } from './cli/main.ts';

try {
  if (import.meta.main) {
    const { main } = await import('./cli/main.ts');
    await main(Deno.args);
  }
} catch (error) {
  console.error(error);
  Deno.exit(1);
}

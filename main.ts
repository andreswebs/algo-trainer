export { main } from './lib/cli/main.ts';

try {
  if (import.meta.main) {
    const { main } = await import('./lib/cli/main.ts');
    await main(Deno.args);
  }
} catch (error) {
  console.error(error);
  Deno.exit(1);
}

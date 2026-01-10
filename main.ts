/**
 * Algo Trainer - CLI Entry Point
 *
 * Main entry point for the Algo Trainer CLI application.
 * This file exports the main CLI functionality.
 */

export { main } from "./src/cli/main.ts";

// Run CLI if this is the main module
try {
  // @ts-ignore: Check if running as main module
  if ((import.meta as any)?.main) {
    const { main } = await import("./src/cli/main.ts");
    // @ts-ignore: Get command line arguments from available runtime
    const args =
      (globalThis as any)?.Deno?.args ||
      (globalThis as any)?.process?.argv?.slice(2) ||
      [];
    await main(args);
  }
} catch {
  // Not running as main module or error occurred
}

import { closeInput, readLine } from '../../src/cli/prompts.ts';

const results: (string | null)[] = [];
for (let i = 0; i < 5; i++) {
  results.push(await readLine(''));
}
closeInput();
process.stdout.write(JSON.stringify(results));

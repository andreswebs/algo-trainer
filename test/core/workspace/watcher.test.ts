/**
 * Tests for file watching utilities (PMS-017)
 *
 * @module tests/core/workspace/watcher
 */

import { assertEquals, assertExists } from '@std/assert';
import { join } from '@std/path';
import {
  createWorkspaceWatcher,
  FileWatcher,
  type WatchEvent,
} from '../../../src/core/workspace/watcher.ts';
import { WorkspaceError } from '../../../src/utils/errors.ts';
import { createDirectory } from '../../../src/utils/fs.ts';

// =============================================================================
// Test Setup and Helpers
// =============================================================================

/**
 * Create a temporary test workspace
 */
async function createTestWorkspace(): Promise<string> {
  const tempDir = await Deno.makeTempDir({
    prefix: 'algo-trainer-watcher-test-',
  });
  const workspace = join(tempDir, 'workspace');

  // Create workspace structure
  await createDirectory(join(workspace, 'problems'));
  await createDirectory(join(workspace, 'completed'));
  await createDirectory(join(workspace, 'templates'));
  await createDirectory(join(workspace, 'config'));

  return workspace;
}

/**
 * Clean up temporary directory
 */
async function cleanupWorkspace(workspace: string): Promise<void> {
  try {
    const tempDir = join(workspace, '..');
    await Deno.remove(tempDir, { recursive: true });
  } catch (_error) {
    // Ignore cleanup errors
  }
}

/**
 * Wait for a specified duration
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a test problem directory
 */
async function createTestProblem(
  workspace: string,
  slug: string,
): Promise<void> {
  const problemDir = join(workspace, 'problems', slug);
  await createDirectory(problemDir);
  await Deno.writeTextFile(join(problemDir, 'solution.ts'), '// Solution code');
}

// =============================================================================
// FileWatcher - Basic Construction and Configuration
// =============================================================================

Deno.test('FileWatcher - constructs with single path', () => {
  const watcher = new FileWatcher('/test/path');
  assertExists(watcher);
  assertEquals(watcher.isRunning(), false);
});

Deno.test('FileWatcher - constructs with multiple paths', () => {
  const watcher = new FileWatcher(['/test/path1', '/test/path2']);
  assertExists(watcher);
  assertEquals(watcher.isRunning(), false);
});

Deno.test('FileWatcher - constructs with custom options', () => {
  const watcher = new FileWatcher('/test/path', {
    debounceMs: 500,
    recursive: false,
  });
  assertExists(watcher);
  assertEquals(watcher.isRunning(), false);
});

// =============================================================================
// FileWatcher - Event Handler Registration
// =============================================================================

Deno.test('FileWatcher - can register event handlers', () => {
  const watcher = new FileWatcher('/test/path');
  let called = false;

  watcher.on('problem-changed', () => {
    called = true;
  });

  // Handler is registered, but won't be called until events occur
  assertEquals(called, false);
});

Deno.test('FileWatcher - can register multiple handlers for same event', () => {
  const watcher = new FileWatcher('/test/path');
  let count = 0;

  watcher.on('problem-changed', () => {
    count++;
  });
  watcher.on('problem-changed', () => {
    count++;
  });

  // Both handlers are registered
  assertEquals(count, 0);
});

Deno.test('FileWatcher - can unregister event handlers', () => {
  const watcher = new FileWatcher('/test/path');
  const handler = () => {
    // Handler function
  };

  watcher.on('problem-changed', handler);
  watcher.off('problem-changed', handler);

  // Handler should be removed (can't directly test, but shouldn't throw)
  assertEquals(watcher.isRunning(), false);
});

// =============================================================================
// FileWatcher - Start and Stop
// =============================================================================

Deno.test('FileWatcher - starts and stops successfully', async () => {
  const workspace = await createTestWorkspace();
  try {
    const watcher = new FileWatcher(join(workspace, 'problems'));

    assertEquals(watcher.isRunning(), false);

    watcher.start();
    assertEquals(watcher.isRunning(), true);

    watcher.stop();
    assertEquals(watcher.isRunning(), false);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('FileWatcher - throws error if started twice', async () => {
  const workspace = await createTestWorkspace();
  try {
    const watcher = new FileWatcher(join(workspace, 'problems'));

    watcher.start();

    // Starting again should throw
    let errorThrown = false;
    try {
      watcher.start();
    } catch (error) {
      errorThrown = true;
      assertEquals(error instanceof WorkspaceError, true);
      assertEquals(
        (error as WorkspaceError).message.includes('already running'),
        true,
      );
    }

    assertEquals(errorThrown, true);

    watcher.stop();
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('FileWatcher - stop is idempotent', async () => {
  const workspace = await createTestWorkspace();
  try {
    const watcher = new FileWatcher(join(workspace, 'problems'));

    watcher.start();
    watcher.stop();

    // Stopping again should not throw
    watcher.stop();
    assertEquals(watcher.isRunning(), false);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('FileWatcher - can stop without starting', () => {
  const watcher = new FileWatcher('/test/path');

  // Should not throw
  watcher.stop();
  assertEquals(watcher.isRunning(), false);
});

// =============================================================================
// FileWatcher - Event Detection
// =============================================================================

Deno.test(
  'FileWatcher - detects file creation in problems directory',
  async () => {
    const workspace = await createTestWorkspace();
    try {
      const watcher = new FileWatcher(join(workspace, 'problems'));
      const events: WatchEvent[] = [];

      watcher.on('problem-changed', (event) => {
        events.push(event);
      });

      watcher.start();

      // Create a new file
      const testFile = join(workspace, 'problems', 'test.txt');
      await Deno.writeTextFile(testFile, 'test content');

      // Wait for debounce + event processing (increased for test reliability)
      await delay(800);

      watcher.stop();

      // Should have detected the creation
      assertEquals(events.length > 0, true);
      const event = events[0];
      assertExists(event);
      assertEquals(event.category, 'problem-changed');
      assertEquals(event.path.includes('test.txt'), true);
    } finally {
      await cleanupWorkspace(workspace);
    }
  },
);

Deno.test('FileWatcher - detects file modification', async () => {
  const workspace = await createTestWorkspace();
  try {
    const testFile = join(workspace, 'problems', 'test.txt');
    await Deno.writeTextFile(testFile, 'initial content');

    const watcher = new FileWatcher(join(workspace, 'problems'));
    const events: WatchEvent[] = [];

    watcher.on('problem-changed', (event) => {
      events.push(event);
    });

    watcher.start();

    // Wait a bit to ensure watcher is ready
    await delay(100);

    // Modify the file
    await Deno.writeTextFile(testFile, 'modified content');

    // Wait for debounce + event processing
    await delay(500);

    watcher.stop();

    // Should have detected the modification
    assertEquals(events.length > 0, true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('FileWatcher - detects file deletion', async () => {
  const workspace = await createTestWorkspace();
  try {
    const testFile = join(workspace, 'problems', 'test.txt');
    await Deno.writeTextFile(testFile, 'test content');

    const watcher = new FileWatcher(join(workspace, 'problems'));
    const events: WatchEvent[] = [];

    watcher.on('problem-changed', (event) => {
      events.push(event);
    });

    watcher.start();

    // Wait a bit to ensure watcher is ready
    await delay(100);

    // Delete the file
    await Deno.remove(testFile);

    // Wait for debounce + event processing
    await delay(500);

    watcher.stop();

    // Should have detected the deletion
    assertEquals(events.length > 0, true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

// =============================================================================
// FileWatcher - Event Categorization
// =============================================================================

Deno.test('FileWatcher - categorizes problem changes correctly', async () => {
  const workspace = await createTestWorkspace();
  try {
    const watcher = new FileWatcher(join(workspace, 'problems'));
    const events: WatchEvent[] = [];

    watcher.on('all', (event) => {
      events.push(event);
    });

    watcher.start();

    // Create a file in problems directory
    const testFile = join(workspace, 'problems', 'solution.ts');
    await Deno.writeTextFile(testFile, 'code');

    // Wait for event
    await delay(500);

    watcher.stop();

    // Should be categorized as problem-changed
    assertEquals(events.length > 0, true);
    assertEquals(events[0].category, 'problem-changed');
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('FileWatcher - categorizes template changes correctly', async () => {
  const workspace = await createTestWorkspace();
  try {
    const watcher = new FileWatcher([
      join(workspace, 'problems'),
      join(workspace, 'templates'),
    ]);
    const events: WatchEvent[] = [];

    watcher.on('all', (event) => {
      events.push(event);
    });

    watcher.start();

    // Create a file in templates directory
    const testFile = join(workspace, 'templates', 'template.txt');
    await Deno.writeTextFile(testFile, 'template');

    // Wait for event
    await delay(500);

    watcher.stop();

    // Should be categorized as template-changed
    assertEquals(events.length > 0, true);
    const templateEvent = events.find((e) => e.category === 'template-changed');
    assertExists(templateEvent);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

// =============================================================================
// FileWatcher - Debouncing
// =============================================================================

Deno.test('FileWatcher - debounces rapid file changes', async () => {
  const workspace = await createTestWorkspace();
  try {
    const watcher = new FileWatcher(join(workspace, 'problems'), {
      debounceMs: 300,
    });
    const events: WatchEvent[] = [];

    watcher.on('problem-changed', (event) => {
      events.push(event);
    });

    watcher.start();

    const testFile = join(workspace, 'problems', 'test.txt');

    // Make multiple rapid changes
    await Deno.writeTextFile(testFile, 'change 1');
    await delay(50);
    await Deno.writeTextFile(testFile, 'change 2');
    await delay(50);
    await Deno.writeTextFile(testFile, 'change 3');

    // Wait for debounce to complete
    await delay(500);

    watcher.stop();

    // Should have fewer events than changes due to debouncing
    // Exact count may vary, but should be less than 3
    assertEquals(events.length < 3, true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('FileWatcher - respects custom debounce time', async () => {
  const workspace = await createTestWorkspace();
  try {
    const watcher = new FileWatcher(join(workspace, 'problems'), {
      debounceMs: 100, // Shorter debounce
    });
    const events: WatchEvent[] = [];

    watcher.on('problem-changed', (event) => {
      events.push(event);
    });

    watcher.start();

    const testFile = join(workspace, 'problems', 'test.txt');
    await Deno.writeTextFile(testFile, 'test');

    // Wait for shorter debounce
    await delay(250);

    watcher.stop();

    // Should have detected the event with shorter wait
    assertEquals(events.length > 0, true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

// =============================================================================
// FileWatcher - Multiple Handlers
// =============================================================================

Deno.test('FileWatcher - calls all registered handlers', async () => {
  const workspace = await createTestWorkspace();
  try {
    const watcher = new FileWatcher(join(workspace, 'problems'));
    let handler1Called = false;
    let handler2Called = false;

    watcher.on('problem-changed', () => {
      handler1Called = true;
    });
    watcher.on('problem-changed', () => {
      handler2Called = true;
    });

    watcher.start();

    const testFile = join(workspace, 'problems', 'test.txt');
    await Deno.writeTextFile(testFile, 'test');

    await delay(500);
    watcher.stop();

    // Both handlers should be called
    assertEquals(handler1Called, true);
    assertEquals(handler2Called, true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('FileWatcher - all handler receives all events', async () => {
  const workspace = await createTestWorkspace();
  try {
    const watcher = new FileWatcher([
      join(workspace, 'problems'),
      join(workspace, 'templates'),
    ]);
    const allEvents: WatchEvent[] = [];
    const problemEvents: WatchEvent[] = [];

    watcher.on('all', (event) => {
      allEvents.push(event);
    });
    watcher.on('problem-changed', (event) => {
      problemEvents.push(event);
    });

    watcher.start();

    // Create files in both directories
    await Deno.writeTextFile(join(workspace, 'problems', 'test1.txt'), 'test');
    await Deno.writeTextFile(join(workspace, 'templates', 'test2.txt'), 'test');

    await delay(500);
    watcher.stop();

    // All handler should receive more events than problem-only handler
    assertEquals(allEvents.length >= problemEvents.length, true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

// =============================================================================
// FileWatcher - Error Handling
// =============================================================================

Deno.test('FileWatcher - handles handler errors gracefully', async () => {
  const workspace = await createTestWorkspace();
  try {
    const watcher = new FileWatcher(join(workspace, 'problems'));
    let goodHandlerCalled = false;

    // Handler that throws
    watcher.on('problem-changed', () => {
      throw new Error('Handler error');
    });

    // Good handler that should still be called
    watcher.on('problem-changed', () => {
      goodHandlerCalled = true;
    });

    watcher.start();

    const testFile = join(workspace, 'problems', 'test.txt');
    await Deno.writeTextFile(testFile, 'test');

    await delay(500);
    watcher.stop();

    // Good handler should still be called despite other handler error
    assertEquals(goodHandlerCalled, true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('FileWatcher - handles async handler errors gracefully', async () => {
  const workspace = await createTestWorkspace();
  try {
    const watcher = new FileWatcher(join(workspace, 'problems'));
    let goodHandlerCalled = false;

    // Async handler that throws
    watcher.on('problem-changed', async () => {
      await delay(10);
      throw new Error('Async handler error');
    });

    // Good handler that should still be called
    watcher.on('problem-changed', () => {
      goodHandlerCalled = true;
    });

    watcher.start();

    const testFile = join(workspace, 'problems', 'test.txt');
    await Deno.writeTextFile(testFile, 'test');

    await delay(500);
    watcher.stop();

    // Good handler should still be called
    assertEquals(goodHandlerCalled, true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

// =============================================================================
// createWorkspaceWatcher - Helper Function
// =============================================================================

Deno.test(
  'createWorkspaceWatcher - creates watcher for workspace',
  async () => {
    const workspace = await createTestWorkspace();
    try {
      const watcher = createWorkspaceWatcher(workspace);
      assertExists(watcher);
      assertEquals(watcher.isRunning(), false);

      // Should be able to start and stop
      watcher.start();
      assertEquals(watcher.isRunning(), true);
      watcher.stop();
      assertEquals(watcher.isRunning(), false);
    } finally {
      await cleanupWorkspace(workspace);
    }
  },
);

Deno.test(
  'createWorkspaceWatcher - watches both problems and templates',
  async () => {
    const workspace = await createTestWorkspace();
    try {
      const watcher = createWorkspaceWatcher(workspace);
      const problemEvents: WatchEvent[] = [];
      const templateEvents: WatchEvent[] = [];

      watcher.on('problem-changed', (event) => {
        problemEvents.push(event);
      });
      watcher.on('template-changed', (event) => {
        templateEvents.push(event);
      });

      watcher.start();

      // Create files in both directories
      await Deno.writeTextFile(join(workspace, 'problems', 'test.txt'), 'test');
      await Deno.writeTextFile(
        join(workspace, 'templates', 'template.txt'),
        'template',
      );

      await delay(500);
      watcher.stop();

      // Should have detected events in both directories
      assertEquals(problemEvents.length > 0, true);
      assertEquals(templateEvents.length > 0, true);
    } finally {
      await cleanupWorkspace(workspace);
    }
  },
);

Deno.test('createWorkspaceWatcher - accepts custom options', async () => {
  const workspace = await createTestWorkspace();
  try {
    const watcher = createWorkspaceWatcher(workspace, {
      debounceMs: 100,
    });
    assertExists(watcher);

    watcher.start();
    watcher.stop();
  } finally {
    await cleanupWorkspace(workspace);
  }
});

// =============================================================================
// Integration Tests
// =============================================================================

Deno.test(
  'FileWatcher - real-world scenario: problem file editing',
  async () => {
    const workspace = await createTestWorkspace();
    try {
      await createTestProblem(workspace, 'two-sum');

      const watcher = new FileWatcher(join(workspace, 'problems'));
      const events: WatchEvent[] = [];

      watcher.on('problem-changed', (event) => {
        events.push(event);
      });

      watcher.start();

      // Give the watcher time to initialize and capture any initial events
      await delay(500);

      // Clear any events from the initial file creation
      events.length = 0;

      // Simulate editing solution file
      const solutionFile = join(
        workspace,
        'problems',
        'two-sum',
        'solution.ts',
      );
      await Deno.writeTextFile(solutionFile, '// Updated solution');

      // Wait for the debounced event to fire
      await delay(800);
      watcher.stop();

      // Should detect the modification
      assertEquals(events.length > 0, true);
      const event = events[0];
      assertExists(event);
      assertEquals(event.category, 'problem-changed');
      assertEquals(event.path.includes('solution.ts'), true);
    } finally {
      await cleanupWorkspace(workspace);
    }
  },
);

Deno.test('FileWatcher - cleanup prevents memory leaks', async () => {
  const workspace = await createTestWorkspace();
  try {
    const watcher = new FileWatcher(join(workspace, 'problems'), {
      debounceMs: 200,
    });

    watcher.start();

    // Create some events
    for (let i = 0; i < 5; i++) {
      await Deno.writeTextFile(
        join(workspace, 'problems', `test${i}.txt`),
        'test',
      );
      await delay(50); // Rapid changes
    }

    // Stop immediately (should clear pending timers)
    watcher.stop();

    // Wait to ensure no events fire after stop
    await delay(500);

    // Should be stopped
    assertEquals(watcher.isRunning(), false);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

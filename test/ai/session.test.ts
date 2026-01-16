/**
 * Tests for AI Teaching System Session State Management
 *
 * @module tests/ai/session
 */

import { assertEquals, assertExists } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import type { ExecutionResult } from '../../src/core/ai/types.ts';
import { TeachingSession } from '../../src/core/ai/session.ts';

describe('TeachingSession', () => {
  describe('constructor', () => {
    it('should create a session with initial state', () => {
      const session = new TeachingSession('two-sum');
      const state = session.getState();

      assertEquals(state.problemId, 'two-sum');
      assertEquals(state.attempts, 0);
      assertEquals(state.passed, false);
      assertEquals(state.lastOutput, '');
      assertEquals(state.lastError, '');
      assertEquals(state.codeHistory, []);
      assertEquals(state.hintsViewed, 0);
      assertExists(state.startedAt);
    });

    it('should set startedAt to current time', () => {
      const before = new Date();
      const session = new TeachingSession('test-problem');
      const after = new Date();
      const state = session.getState();

      // startedAt should be between before and after
      assertEquals(state.startedAt >= before, true);
      assertEquals(state.startedAt <= after, true);
    });
  });

  describe('getState', () => {
    it('should return a copy of the state', () => {
      const session = new TeachingSession('test-problem');
      const state1 = session.getState();
      const state2 = session.getState();

      // Should be equal but not the same object
      assertEquals(state1.problemId, state2.problemId);
      assertEquals(state1 === state2, false);
    });

    it('should return a copy of codeHistory array', () => {
      const session = new TeachingSession('test-problem');
      session.recordAttempt('code1');

      const state = session.getState();
      state.codeHistory.push('modified');

      const state2 = session.getState();
      assertEquals(state2.codeHistory.length, 1);
      assertEquals(state2.codeHistory[0], 'code1');
    });

    it('should return a copy of startedAt date', () => {
      const session = new TeachingSession('test-problem');
      const state = session.getState();
      const originalTime = state.startedAt.getTime();

      state.startedAt.setFullYear(2000);

      const state2 = session.getState();
      assertEquals(state2.startedAt.getTime(), originalTime);
    });
  });

  describe('recordAttempt', () => {
    it('should increment attempts counter', () => {
      const session = new TeachingSession('test-problem');
      assertEquals(session.getState().attempts, 0);

      session.recordAttempt('code1');
      assertEquals(session.getState().attempts, 1);

      session.recordAttempt('code2');
      assertEquals(session.getState().attempts, 2);
    });

    it('should add code to history', () => {
      const session = new TeachingSession('test-problem');
      const code1 = 'function solve() { return 1; }';
      const code2 = 'function solve() { return 2; }';

      session.recordAttempt(code1);
      session.recordAttempt(code2);

      const state = session.getState();
      assertEquals(state.codeHistory.length, 2);
      assertEquals(state.codeHistory[0], code1);
      assertEquals(state.codeHistory[1], code2);
    });

    it('should handle empty code string', () => {
      const session = new TeachingSession('test-problem');
      session.recordAttempt('');

      const state = session.getState();
      assertEquals(state.attempts, 1);
      assertEquals(state.codeHistory.length, 1);
      assertEquals(state.codeHistory[0], '');
    });
  });

  describe('recordExecution', () => {
    it('should update lastOutput and lastError', () => {
      const session = new TeachingSession('test-problem');
      const result: ExecutionResult = {
        stdout: 'Test output',
        stderr: 'Test error',
        passed: false,
        exitCode: 0,
      };

      session.recordExecution(result);

      const state = session.getState();
      assertEquals(state.lastOutput, 'Test output');
      assertEquals(state.lastError, 'Test error');
    });

    it('should mark as passed when result.passed is true', () => {
      const session = new TeachingSession('test-problem');
      const result: ExecutionResult = {
        stdout: 'All tests passed',
        stderr: '',
        passed: true,
        exitCode: 0,
      };

      assertEquals(session.getState().passed, false);

      session.recordExecution(result);

      assertEquals(session.getState().passed, true);
    });

    it('should not mark as passed when result.passed is false', () => {
      const session = new TeachingSession('test-problem');
      const result: ExecutionResult = {
        stdout: 'Test failed',
        stderr: 'Expected 2, got 3',
        passed: false,
        exitCode: 1,
      };

      session.recordExecution(result);

      assertEquals(session.getState().passed, false);
    });

    it('should handle multiple executions', () => {
      const session = new TeachingSession('test-problem');

      session.recordExecution({
        stdout: 'output1',
        stderr: 'error1',
        passed: false,
        exitCode: 1,
      });

      assertEquals(session.getState().lastOutput, 'output1');
      assertEquals(session.getState().lastError, 'error1');

      session.recordExecution({
        stdout: 'output2',
        stderr: 'error2',
        passed: false,
        exitCode: 1,
      });

      assertEquals(session.getState().lastOutput, 'output2');
      assertEquals(session.getState().lastError, 'error2');
    });

    it('should handle empty stdout and stderr', () => {
      const session = new TeachingSession('test-problem');
      session.recordExecution({
        stdout: '',
        stderr: '',
        passed: true,
        exitCode: 0,
      });

      const state = session.getState();
      assertEquals(state.lastOutput, '');
      assertEquals(state.lastError, '');
    });
  });

  describe('markPassed', () => {
    it('should set passed to true', () => {
      const session = new TeachingSession('test-problem');
      assertEquals(session.getState().passed, false);

      session.markPassed();

      assertEquals(session.getState().passed, true);
    });

    it('should be idempotent', () => {
      const session = new TeachingSession('test-problem');

      session.markPassed();
      assertEquals(session.getState().passed, true);

      session.markPassed();
      assertEquals(session.getState().passed, true);
    });
  });

  describe('incrementHintsViewed', () => {
    it('should increment hintsViewed counter', () => {
      const session = new TeachingSession('test-problem');
      assertEquals(session.getState().hintsViewed, 0);

      session.incrementHintsViewed();
      assertEquals(session.getState().hintsViewed, 1);

      session.incrementHintsViewed();
      assertEquals(session.getState().hintsViewed, 2);

      session.incrementHintsViewed();
      assertEquals(session.getState().hintsViewed, 3);
    });
  });

  describe('reset', () => {
    it('should reset all state for new problem', () => {
      const session = new TeachingSession('problem1');

      // Modify state
      session.recordAttempt('code1');
      session.recordAttempt('code2');
      session.recordExecution({
        stdout: 'output',
        stderr: 'error',
        passed: true,
        exitCode: 0,
      });
      session.incrementHintsViewed();
      session.incrementHintsViewed();

      // Verify state is modified
      const stateBefore = session.getState();
      assertEquals(stateBefore.attempts, 2);
      assertEquals(stateBefore.passed, true);
      assertEquals(stateBefore.codeHistory.length, 2);
      assertEquals(stateBefore.hintsViewed, 2);

      // Reset for new problem
      session.reset('problem2');

      const stateAfter = session.getState();
      assertEquals(stateAfter.problemId, 'problem2');
      assertEquals(stateAfter.attempts, 0);
      assertEquals(stateAfter.passed, false);
      assertEquals(stateAfter.lastOutput, '');
      assertEquals(stateAfter.lastError, '');
      assertEquals(stateAfter.codeHistory, []);
      assertEquals(stateAfter.hintsViewed, 0);
    });

    it('should reset startedAt to current time', () => {
      const session = new TeachingSession('problem1');
      const originalStartedAt = session.getState().startedAt;

      // Wait a small amount of time
      const delay = new Promise((resolve) => setTimeout(resolve, 10));
      return delay.then(() => {
        session.reset('problem2');
        const newStartedAt = session.getState().startedAt;

        // New startedAt should be after original
        assertEquals(newStartedAt > originalStartedAt, true);
      });
    });
  });

  describe('getTriggerContext', () => {
    it('should return context with current code', () => {
      const session = new TeachingSession('test-problem');
      const code = 'function solve() { return 42; }';

      const context = session.getTriggerContext(code);

      assertEquals(context.code, code);
    });

    it('should return context with current session state', () => {
      const session = new TeachingSession('test-problem');

      session.recordAttempt('code1');
      session.recordAttempt('code2');
      session.recordExecution({
        stdout: 'Test output',
        stderr: 'Test error',
        passed: false,
        exitCode: 1,
      });

      const context = session.getTriggerContext('current code');

      assertEquals(context.stdout, 'Test output');
      assertEquals(context.stderr, 'Test error');
      assertEquals(context.passed, false);
      assertEquals(context.attempts, 2);
    });

    it('should work with passed state', () => {
      const session = new TeachingSession('test-problem');

      session.recordAttempt('code1');
      session.recordExecution({
        stdout: 'All tests passed',
        stderr: '',
        passed: true,
        exitCode: 0,
      });

      const context = session.getTriggerContext('passing code');

      assertEquals(context.passed, true);
      assertEquals(context.attempts, 1);
      assertEquals(context.stderr, '');
    });

    it('should work with empty execution state', () => {
      const session = new TeachingSession('test-problem');
      const context = session.getTriggerContext('first code');

      assertEquals(context.code, 'first code');
      assertEquals(context.stdout, '');
      assertEquals(context.stderr, '');
      assertEquals(context.passed, false);
      assertEquals(context.attempts, 0);
    });
  });

  describe('integration scenarios', () => {
    it('should support typical solving workflow', () => {
      const session = new TeachingSession('two-sum');

      // First attempt - wrong solution
      session.recordAttempt('function twoSum() { return []; }');
      session.recordExecution({
        stdout: 'Expected [0,1], got []',
        stderr: '',
        passed: false,
        exitCode: 1,
      });

      let state = session.getState();
      assertEquals(state.attempts, 1);
      assertEquals(state.passed, false);

      // Second attempt - still wrong
      session.recordAttempt('function twoSum() { return [0,0]; }');
      session.recordExecution({
        stdout: 'Expected [0,1], got [0,0]',
        stderr: '',
        passed: false,
        exitCode: 1,
      });

      state = session.getState();
      assertEquals(state.attempts, 2);
      assertEquals(state.passed, false);

      // User views a hint
      session.incrementHintsViewed();

      // Third attempt - correct solution
      session.recordAttempt('function twoSum() { return [0,1]; }');
      session.recordExecution({
        stdout: 'All tests passed',
        stderr: '',
        passed: true,
        exitCode: 0,
      });

      state = session.getState();
      assertEquals(state.attempts, 3);
      assertEquals(state.passed, true);
      assertEquals(state.hintsViewed, 1);
      assertEquals(state.codeHistory.length, 3);
    });

    it('should track struggle patterns', () => {
      const session = new TeachingSession('hard-problem');

      // Multiple failed attempts
      for (let i = 0; i < 5; i++) {
        session.recordAttempt(`attempt ${i}`);
        session.recordExecution({
          stdout: 'Failed',
          stderr: 'Error',
          passed: false,
          exitCode: 1,
        });
      }

      // User views multiple hints
      session.incrementHintsViewed();
      session.incrementHintsViewed();
      session.incrementHintsViewed();

      const state = session.getState();
      const context = session.getTriggerContext('current code');

      // Can detect struggle pattern
      assertEquals(state.attempts > 3, true);
      assertEquals(state.hintsViewed > 1, true);
      assertEquals(context.attempts > 3, true);
      assertEquals(context.passed, false);
    });

    it('should support session reuse for multiple problems', () => {
      const session = new TeachingSession('problem1');

      session.recordAttempt('code1');
      session.recordExecution({
        stdout: 'output1',
        stderr: '',
        passed: true,
        exitCode: 0,
      });

      assertEquals(session.getState().problemId, 'problem1');
      assertEquals(session.getState().attempts, 1);
      assertEquals(session.getState().passed, true);

      // Reset for new problem
      session.reset('problem2');

      assertEquals(session.getState().problemId, 'problem2');
      assertEquals(session.getState().attempts, 0);
      assertEquals(session.getState().passed, false);
      assertEquals(session.getState().codeHistory, []);

      // Work on new problem
      session.recordAttempt('code2');
      assertEquals(session.getState().attempts, 1);
    });
  });
});

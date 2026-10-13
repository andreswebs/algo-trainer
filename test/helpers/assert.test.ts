import { describe, test } from 'bun:test';
import { AssertionError } from 'node:assert';
import { rejects, throws } from 'node:assert/strict';
import { ProblemError, ValidationError } from '../../src/utils/errors.ts';
import { assertRejectsWith, assertThrowsWith } from './assert.ts';

const throwProblem = (): never => {
  throw new ProblemError('Problem not found: two-sum');
};

const rejectProblem = async (): Promise<never> => {
  throw new ProblemError('Problem not found: two-sum');
};

describe('assertThrowsWith', () => {
  test('passes on the right class with the right substring', () => {
    assertThrowsWith(throwProblem, ProblemError, 'not found');
  });

  test('fails on the right class with the wrong substring', () => {
    throws(() => assertThrowsWith(throwProblem, ProblemError, 'already exists'), AssertionError);
  });

  test('fails on the wrong class', () => {
    throws(() => assertThrowsWith(throwProblem, ValidationError, 'not found'), AssertionError);
  });
});

describe('assertRejectsWith', () => {
  test('passes on the right class with the right substring', async () => {
    await assertRejectsWith(rejectProblem, ProblemError, 'not found');
  });

  test('fails on the right class with the wrong substring', async () => {
    await rejects(assertRejectsWith(rejectProblem, ProblemError, 'already exists'), AssertionError);
  });

  test('fails on the wrong class', async () => {
    await rejects(assertRejectsWith(rejectProblem, ValidationError, 'not found'), AssertionError);
  });
});

import { CODENAME_MAX_LENGTH, normaliseCodename, validateCodename } from './codename';

describe('codename validation', () => {
  it('accepts the exact minimum and maximum lengths', () => {
    expect(validateCodename('A1')).toEqual({ valid: true, value: 'A1' });
    expect(validateCodename('A'.repeat(CODENAME_MAX_LENGTH))).toEqual({
      valid: true,
      value: 'A'.repeat(CODENAME_MAX_LENGTH)
    });
  });

  it('rejects values immediately outside the length boundaries', () => {
    expect(validateCodename('A')).toEqual({
      valid: false,
      error: 'Codename must contain at least 2 characters.'
    });
    expect(validateCodename('A'.repeat(CODENAME_MAX_LENGTH + 1))).toEqual({
      valid: false,
      error: 'Codename must contain no more than 18 characters.'
    });
  });

  it.each(['Agent 7', 'Agent-Seven', 'Agent_Seven', 'Écho 2'])('accepts %s', (value) => {
    expect(validateCodename(value)).toEqual({ valid: true, value });
  });

  it.each(['Agent!', 'Agent.Seven', 'Agent/Seven', 'Agent\tSeven', 'Agent🙂'])(
    'rejects unsupported characters in %s',
    (value) => {
      expect(validateCodename(value)).toEqual({
        valid: false,
        error: 'Use only letters, numbers, spaces, hyphens or underscores.'
      });
    }
  );

  it('trims outer spaces and collapses repeated spaces', () => {
    expect(normaliseCodename('   Agent   Seven   ')).toBe('Agent Seven');
    expect(validateCodename('   Agent   Seven   ')).toEqual({
      valid: true,
      value: 'Agent Seven'
    });
  });

  it('preserves selected capitalisation', () => {
    expect(validateCodename('aGeNt Nova')).toEqual({ valid: true, value: 'aGeNt Nova' });
  });
});

import { validateOps001Flag } from './flagValidator';

describe('OPS-001 flag validation', () => {
  it.each(['FLAG{WELCOME_TO_HQ}', 'flag{welcome_to_hq}', '  FlAg{WeLcOmE_To_Hq}\t'])(
    'accepts the exact discovered value case-insensitively after trimming: %s',
    (value) => {
      expect(validateOps001Flag(value, true)).toBe('accepted');
    }
  );

  it.each(['', '   '])('classifies empty input: %j', (value) => {
    expect(validateOps001Flag(value, true)).toBe('empty');
  });

  it.each([
    'WELCOME_TO_HQ',
    'FLAG{}',
    'FLAG{{WELCOME_TO_HQ}}',
    'FLAG{WELCOME\nTO_HQ}',
    'FLAG{WELCOME_TO_HQ'
  ])('rejects malformed flag syntax: %s', (value) => {
    expect(validateOps001Flag(value, true)).toBe('malformed');
  });

  it('distinguishes a well-formed incorrect flag and blocks a correct early guess', () => {
    expect(validateOps001Flag('FLAG{NOT_THIS_ONE}', true)).toBe('incorrect');
    expect(validateOps001Flag('FLAG{WELCOME_TO_HQ}', false)).toBe('incorrect');
  });
});

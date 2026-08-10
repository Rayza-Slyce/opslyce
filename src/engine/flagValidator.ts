import { MISSION_CONTROL_INPUT_LIMIT } from '../profile/localProfile';

export const OPS001_ACCEPTED_FLAG = 'FLAG{WELCOME_TO_HQ}';

export type FlagValidationResult = 'empty' | 'malformed' | 'incorrect' | 'accepted';

const flagPattern = /^FLAG\{[^{}\r\n]+\}$/iu;

export function validateOps001Flag(
  rawInput: string,
  verificationEvidenceRecovered: boolean
): FlagValidationResult {
  if (rawInput.length > MISSION_CONTROL_INPUT_LIMIT) return 'malformed';
  const normalised = rawInput.trim();
  if (normalised.length === 0) return 'empty';
  if (!flagPattern.test(normalised)) return 'malformed';
  if (!verificationEvidenceRecovered) return 'incorrect';
  return normalised.toLocaleUpperCase('en-GB') === OPS001_ACCEPTED_FLAG ? 'accepted' : 'incorrect';
}

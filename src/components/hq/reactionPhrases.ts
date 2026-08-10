export function splitReactionPhrases(dialogue: string): readonly string[] {
  return dialogue.split(/(?<=[.!?])\s+/u).filter(Boolean);
}

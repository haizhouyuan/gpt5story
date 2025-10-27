import type { StoryReviewNote, StoryOutlinePlan, StorySegment } from '@gpt5story/shared';

let seq = 0;

const nextId = (prefix: string) => `${prefix}-${Date.now()}-${seq++}`;

interface ValidatorContext {
  outline: StoryOutlinePlan;
  segment: StorySegment;
}

type StoryValidator = (ctx: ValidatorContext) => StoryReviewNote[];

const ensureBeatCoverage: StoryValidator = ({ outline }) => {
  const missing = outline.acts.filter((act) => act.beats.length === 0);
  if (missing.length === 0) return [];
  return missing.map((act) => ({
    id: nextId('beat'),
    severity: 'warn',
    message: `${act.title} 缺乏節拍描述，請補充至少一個關鍵節拍`,
  }));
};

const ensureChoicesCount: StoryValidator = ({ segment }) => {
  if (segment.choices.length === 3) return [];
  return [
    {
      id: nextId('choice'),
      severity: 'warn',
      message: `預期 3 個選項，實際為 ${segment.choices.length}，請補齊或說明`,
    },
  ];
};

const ensureCluePayoff: StoryValidator = ({ outline }) => {
  const missing = outline.clues.filter((clue) => !clue.payoff || clue.payoff.trim().length === 0);
  if (missing.length === 0) return [];
  return missing.map((clue) => ({
    id: nextId('clue'),
    severity: 'error',
    message: `線索「${clue.description}」缺少 payoff 描述`,
  }));
};

const validators: StoryValidator[] = [ensureBeatCoverage, ensureChoicesCount, ensureCluePayoff];

export const runStoryValidators = (ctx: ValidatorContext): StoryReviewNote[] =>
  validators.flatMap((validator) => validator(ctx));

export const getStage5MaxAutoRevisions = (): number => Number.parseInt(
  process.env.GPT5STORY_LONGFORM_STAGE5_RETRY ?? '2',
  10,
);

export const shouldFailOnStage6Warn = (): boolean => process.env.GPT5STORY_LONGFORM_FAIL_ON_WARN === '1';

export const getMarkdownOutputRoot = (): string | undefined => process.env.GPT5STORY_LONGFORM_MD_OUT;

export const getQaBoardRoot = (): string | undefined => process.env.GPT5STORY_LONGFORM_QA_BOARD ?? getMarkdownOutputRoot();

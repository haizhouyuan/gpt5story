const OUTPUT_BANNED_KEYWORDS = (process.env.GPT5STORY_BANNED_OUTPUT_KEYWORDS ?? '暴力,血腥,成人')
  .split(',')
  .map((w) => w.trim())
  .filter(Boolean);

export const containsBannedOutput = (text: string): boolean => {
  const lower = text.toLowerCase();
  return OUTPUT_BANNED_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
};

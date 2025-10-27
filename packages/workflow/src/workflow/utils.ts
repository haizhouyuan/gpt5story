export const sanitizeJsonBlock = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```[a-zA-Z]*\n/, '').replace(/```\s*$/, '').trim();
  }
  return trimmed;
};

import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  ALLOW_ORIGINS: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const loadEnvConfig = (): EnvConfig => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  return parsed.data;
};

const env = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (value === undefined) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const config = {
  port: parseInt(env("PORT", "3000"), 10),
  nodeEnv: env("NODE_ENV", "development"),
  isProduction: process.env.NODE_ENV === "production",
  apiVersion: "v1",
  accessTokenSecret: env("ACCESS_TOKEN_SECRET", "dev-access-token-secret"),
  qwen: {
    apiKey: process.env.QWEN_API_KEY,
    apiHost: process.env.QWEN_API_HOST || "https://dashscope-international.aliyuncs.com/compatible-mode/v1",
    model: process.env.QWEN_MODEL || "qwen-plus",
  },
} as const;

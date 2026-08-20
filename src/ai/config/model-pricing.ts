export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export const OPENAI_MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-5': {
    inputPerMillion: 1.25,
    outputPerMillion: 10,
  },

  'gpt-5-mini': {
    inputPerMillion: 0.25,
    outputPerMillion: 2,
  },

  'gpt-4.1': {
    inputPerMillion: 2,
    outputPerMillion: 8,
  },

  'gpt-4.1-mini': {
    inputPerMillion: 0.4,
    outputPerMillion: 1.6,
  },

  'gpt-4o-mini': {
    inputPerMillion: 0.15,
    outputPerMillion: 0.6,
  },
};

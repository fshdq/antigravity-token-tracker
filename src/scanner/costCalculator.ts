import { CostConfig, PricingModel, TokenBreakdown } from '../types';

export const DEFAULT_PRICING_MODELS: PricingModel[] = [
  {
    id: 'auto',
    name: 'Auto (Use Detected Session Model)',
    inputPerMillion: 0.075,
    outputPerMillion: 0.30,
    provider: 'Custom',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 / 3.x Flash',
    inputPerMillion: 0.075,
    outputPerMillion: 0.30,
    provider: 'Google',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 / 3.x Pro',
    inputPerMillion: 1.25,
    outputPerMillion: 5.00,
    provider: 'Google',
  },
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 / 4.x Sonnet',
    inputPerMillion: 3.00,
    outputPerMillion: 15.00,
    provider: 'Anthropic',
  },
  {
    id: 'custom',
    name: 'Custom Pricing Rate',
    inputPerMillion: 1.00,
    outputPerMillion: 3.00,
    provider: 'Custom',
  },
];

export function resolveRatesForModel(
  detectedModel: string | undefined,
  config: CostConfig
): { inRate: number; outRate: number; resolvedName: string } {
  // If user selected a specific manual override model:
  if (config.selectedModelId && config.selectedModelId !== 'auto') {
    if (config.selectedModelId === 'custom') {
      return {
        inRate: config.customInputRate,
        outRate: config.customOutputRate,
        resolvedName: 'Custom',
      };
    }
    const found = DEFAULT_PRICING_MODELS.find((m) => m.id === config.selectedModelId);
    if (found) {
      return {
        inRate: found.inputPerMillion,
        outRate: found.outputPerMillion,
        resolvedName: found.name,
      };
    }
  }

  // Automatic resolution based on detected model string:
  const modelStr = (detectedModel || '').toLowerCase();

  if (modelStr.includes('claude') || modelStr.includes('sonnet')) {
    return {
      inRate: 3.00,
      outRate: 15.00,
      resolvedName: detectedModel || 'Claude Sonnet',
    };
  }

  if (modelStr.includes('pro')) {
    return {
      inRate: 1.25,
      outRate: 5.00,
      resolvedName: detectedModel || 'Gemini Pro',
    };
  }

  // Default to Flash pricing tier (e.g. Gemini 3.5 Flash, Gemini 3.8 Flash)
  return {
    inRate: 0.075,
    outRate: 0.30,
    resolvedName: detectedModel || 'Gemini Flash',
  };
}

export function calculateCost(
  tokens: TokenBreakdown,
  config: CostConfig,
  detectedModel?: string
): { costUSD: number; costIDR: number; resolvedModelName: string } {
  const { inRate, outRate, resolvedName } = resolveRatesForModel(detectedModel, config);

  const inputCost = (tokens.totalInput / 1_000_000) * inRate;
  const outputCost = (tokens.totalOutput / 1_000_000) * outRate;
  const costUSD = inputCost + outputCost;
  const costIDR = costUSD * (config.idrExchangeRate || 16000);

  return {
    costUSD: Number(costUSD.toFixed(6)),
    costIDR: Math.round(costIDR),
    resolvedModelName: resolvedName,
  };
}

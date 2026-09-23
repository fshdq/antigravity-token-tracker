export interface TokenBreakdown {
  // Input components
  userPrompt: number;
  toolOutputs: number;
  systemAndHistory: number;
  totalInput: number;

  // Output components
  thinking: number;
  toolCalls: number;
  assistantResponse: number;
  totalOutput: number;

  // Total
  grandTotal: number;
}

export type StepRole = 'user' | 'assistant' | 'tool' | 'system';

export interface StepDetail {
  stepIndex: number;
  type: string;
  role: StepRole;
  createdAt?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  category: 'userPrompt' | 'toolOutputs' | 'systemAndHistory' | 'thinking' | 'toolCalls' | 'assistantResponse';
  summary: string;
  details?: {
    prompt?: string;
    thinking?: string;
    toolName?: string;
    toolArgs?: Record<string, unknown> | string;
    toolOutputSnippet?: string;
    assistantContent?: string;
  };
}

export interface ConversationSession {
  id: string;
  workspacePath: string | null;
  workspaceName: string;
  title: string;
  firstPromptSnippet: string;
  detectedModel: string;
  createdAt: string;
  updatedAt: string;
  turnCount: number;
  stepCount: number;
  tokens: TokenBreakdown;
  estimatedCostUSD: number;
  estimatedCostIDR: number;
  steps: StepDetail[];
}

export interface WorkspaceSummary {
  path: string;
  name: string;
  sessionCount: number;
  totalTokens: number;
}

export interface PricingModel {
  id: string;
  name: string;
  inputPerMillion: number;
  outputPerMillion: number;
  provider: 'Google' | 'Anthropic' | 'Custom';
}

export interface CostConfig {
  selectedModelId: string;
  currency: 'USD' | 'IDR';
  idrExchangeRate: number;
  charsPerToken: number;
  customInputRate: number;
  customOutputRate: number;
}

export interface OverallStats {
  totalSessions: number;
  totalTurns: number;
  tokens: TokenBreakdown;
  costUSD: number;
  costIDR: number;
}

export interface DashboardData {
  currentWorkspace: string | null;
  selectedWorkspace: string;
  workspaces: WorkspaceSummary[];
  sessions: ConversationSession[];
  overallStats: OverallStats;
  costConfig: CostConfig;
  pricingModels: PricingModel[];
}

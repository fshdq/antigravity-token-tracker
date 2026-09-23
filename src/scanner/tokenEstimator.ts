import { StepDetail, TokenBreakdown } from '../types';
import { cleanPromptText, truncateText } from '../utils/formatters';

export function estimateTokens(text: string, charsPerToken = 3.85): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / charsPerToken));
}

export function parseRawStep(
  rawStep: Record<string, any>,
  charsPerToken = 3.85
): {
  step: StepDetail;
  breakdown: Partial<TokenBreakdown>;
} {
  const type = String(rawStep.type || 'UNKNOWN');
  const content = String(rawStep.content || '');
  const createdAt = rawStep.created_at;
  const stepIndex = Number(rawStep.step_index ?? 0);

  let inputTokens = 0;
  let outputTokens = 0;
  let category: StepDetail['category'] = 'systemAndHistory';
  let role: StepDetail['role'] = 'system';
  let summary = '';
  const details: StepDetail['details'] = {};

  const partialBreakdown: Partial<TokenBreakdown> = {};

  switch (type) {
    case 'USER_INPUT': {
      role = 'user';
      category = 'userPrompt';
      const clean = cleanPromptText(content);
      const promptTokens = estimateTokens(clean, charsPerToken);
      const fullTokens = estimateTokens(content, charsPerToken);
      const metaTokens = Math.max(0, fullTokens - promptTokens);

      inputTokens = fullTokens;
      partialBreakdown.userPrompt = promptTokens;
      partialBreakdown.systemAndHistory = metaTokens;

      summary = clean ? truncateText(clean, 90) : 'User Prompt';
      details.prompt = clean;
      break;
    }

    case 'PLANNER_RESPONSE': {
      role = 'assistant';
      const thinking = String(rawStep.thinking || '');
      const toolCalls = rawStep.tool_calls;
      const responseContent = content;

      let thinkingTokens = 0;
      let toolCallTokens = 0;
      let assistantTokens = 0;

      if (thinking) {
        thinkingTokens = estimateTokens(thinking, charsPerToken);
        partialBreakdown.thinking = thinkingTokens;
        details.thinking = thinking;
      }

      if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
        const toolStr = JSON.stringify(toolCalls);
        toolCallTokens = estimateTokens(toolStr, charsPerToken);
        partialBreakdown.toolCalls = toolCallTokens;
        details.toolName = toolCalls.map((t: any) => t.name).join(', ');
        details.toolArgs = toolCalls[0]?.args;
      }

      if (responseContent) {
        assistantTokens = estimateTokens(responseContent, charsPerToken);
        partialBreakdown.assistantResponse = assistantTokens;
        details.assistantContent = responseContent;
      }

      outputTokens = thinkingTokens + toolCallTokens + assistantTokens;

      if (toolCalls && toolCalls.length > 0) {
        category = 'toolCalls';
        summary = `Executed tool: ${toolCalls.map((t: any) => t.name).join(', ')}`;
      } else if (responseContent) {
        category = 'assistantResponse';
        summary = truncateText(responseContent, 90);
      } else if (thinking) {
        category = 'thinking';
        summary = `Reasoning / Thinking (${thinkingTokens} tokens)`;
      } else {
        category = 'assistantResponse';
        summary = 'Assistant Turn';
      }
      break;
    }

    case 'RUN_COMMAND':
    case 'VIEW_FILE':
    case 'GREP_SEARCH':
    case 'LIST_DIR':
    case 'WRITE_TO_FILE':
    case 'REPLACE_FILE_CONTENT':
    case 'SEARCH_WEB':
    case 'FETCH_WEB_PAGE': {
      role = 'tool';
      category = 'toolOutputs';
      inputTokens = estimateTokens(content, charsPerToken);
      partialBreakdown.toolOutputs = inputTokens;
      summary = `Tool Output [${type}]: ${truncateText(content.replace(/\s+/g, ' '), 70)}`;
      details.toolOutputSnippet = truncateText(content, 500);
      break;
    }

    case 'CONVERSATION_HISTORY':
    case 'KNOWLEDGE_ARTIFACTS':
    case 'CHECKPOINT':
    default: {
      role = 'system';
      category = 'systemAndHistory';
      inputTokens = estimateTokens(content, charsPerToken);
      partialBreakdown.systemAndHistory = inputTokens;
      summary = `${type}: ${truncateText(content.replace(/\s+/g, ' '), 60)}`;
      break;
    }
  }

  const step: StepDetail = {
    stepIndex,
    type,
    role,
    createdAt,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    category,
    summary: summary || `${type} Step`,
    details,
  };

  return { step, breakdown: partialBreakdown };
}

export function createEmptyTokenBreakdown(): TokenBreakdown {
  return {
    userPrompt: 0,
    toolOutputs: 0,
    systemAndHistory: 0,
    totalInput: 0,
    thinking: 0,
    toolCalls: 0,
    assistantResponse: 0,
    totalOutput: 0,
    grandTotal: 0,
  };
}

export function aggregateTokens(breakdowns: Partial<TokenBreakdown>[]): TokenBreakdown {
  const result = createEmptyTokenBreakdown();

  for (const b of breakdowns) {
    if (b.userPrompt) result.userPrompt += b.userPrompt;
    if (b.toolOutputs) result.toolOutputs += b.toolOutputs;
    if (b.systemAndHistory) result.systemAndHistory += b.systemAndHistory;
    if (b.thinking) result.thinking += b.thinking;
    if (b.toolCalls) result.toolCalls += b.toolCalls;
    if (b.assistantResponse) result.assistantResponse += b.assistantResponse;
  }

  result.totalInput = result.userPrompt + result.toolOutputs + result.systemAndHistory;
  result.totalOutput = result.thinking + result.toolCalls + result.assistantResponse;
  result.grandTotal = result.totalInput + result.totalOutput;

  return result;
}

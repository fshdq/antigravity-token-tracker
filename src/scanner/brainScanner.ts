import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';
import {
  ConversationSession,
  CostConfig,
  DashboardData,
  OverallStats,
  StepDetail,
  TokenBreakdown,
  WorkspaceSummary,
} from '../types';
import { cleanPromptText, truncateText } from '../utils/formatters';
import { calculateCost, DEFAULT_PRICING_MODELS } from './costCalculator';
import { aggregateTokens, parseRawStep } from './tokenEstimator';

export function getDefaultBrainDir(): string {
  const home = os.homedir();
  return path.join(home, '.gemini', 'antigravity-ide', 'brain');
}

/**
 * Extracts a normalized root project workspace from a full file/folder path.
 * e.g., /Users/user/Code/jerune-store/frontend/app -> /Users/user/Code/jerune-store
 */
export function normalizeWorkspacePath(rawPath: string): { path: string; name: string } {
  const clean = path.normalize(rawPath).replace(/\\/g, '/');
  
  // Look for common patterns like /Users/.../Code/<project-name>
  const codeMatch = clean.match(/^(\/(?:Users|home)\/[^/]+\/Code\/([^/]+))/i);
  if (codeMatch) {
    return { path: codeMatch[1], name: codeMatch[2] };
  }

  // Look for any 3-4 segments root e.g. /home/user/projects/my-app
  const genericMatch = clean.match(/^(\/(?:Users|home)\/[^/]+\/[^/]+\/([^/]+))/i);
  if (genericMatch) {
    return { path: genericMatch[1], name: genericMatch[2] };
  }

  const base = path.basename(clean);
  return { path: clean, name: base || 'Workspace' };
}

export async function parseTranscriptFile(
  transcriptPath: string,
  cid: string,
  charsPerToken = 3.85
): Promise<{
  steps: StepDetail[];
  breakdowns: Partial<TokenBreakdown>[];
  detectedWorkspaces: Set<string>;
  firstPrompt: string;
  detectedModel: string;
  createdAt?: string;
  updatedAt?: string;
  turnCount: number;
}> {
  const detectedWorkspaces = new Set<string>();
  const steps: StepDetail[] = [];
  const breakdowns: Partial<TokenBreakdown>[] = [];
  let firstPrompt = '';
  let detectedModel = '';
  let createdAt: string | undefined;
  let updatedAt: string | undefined;
  let turnCount = 0;

  const fileStream = fs.createReadStream(transcriptPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const raw = JSON.parse(line);
      const parsed = parseRawStep(raw, charsPerToken);
      steps.push(parsed.step);
      breakdowns.push(parsed.breakdown);

      if (raw.created_at) {
        if (!createdAt) createdAt = raw.created_at;
        updatedAt = raw.created_at;
      }

      const content = String(raw.content || '');

      // Detect model selection tag
      if (!detectedModel && content.includes('Model Selection')) {
        const modelMatch = content.match(
          /setting\s+[`'"]?Model Selection[`'"]?\s+from\s+\S+\s+to\s+(.+?)\.\s+No need/i
        ) || content.match(
          /setting\s+[`'"]?Model Selection[`'"]?\s+from\s+\S+\s+to\s+([^\n\r]+?)(?:\.\s+[A-Z]|$)/i
        );
        if (modelMatch) {
          detectedModel = modelMatch[1].replace(/[`'"]/g, '').trim();
        }
      }

      if (raw.type === 'USER_INPUT') {
        turnCount++;
        if (!firstPrompt) {
          firstPrompt = cleanPromptText(content);
        }

        // Try to detect active document path in metadata
        const docMatch = content.match(/Active Document:\s*([^\s\r\n]+)/i);
        if (docMatch) {
          detectedWorkspaces.add(docMatch[1]);
        }
      }

      // Check tool_calls arguments for Cwd
      if (raw.tool_calls && Array.isArray(raw.tool_calls)) {
        for (const tc of raw.tool_calls) {
          const cwd = tc?.args?.Cwd;
          if (cwd && typeof cwd === 'string') {
            detectedWorkspaces.add(cwd.replace(/["']/g, ''));
          }
        }
      }
    } catch {
      // Ignore corrupted or malformed lines
    }
  }

  return {
    steps,
    breakdowns,
    detectedWorkspaces,
    firstPrompt,
    detectedModel: detectedModel || 'Gemini 3.5 Flash',
    createdAt,
    updatedAt,
    turnCount,
  };
}

export async function scanBrainDirectory(
  brainDir: string = getDefaultBrainDir(),
  config: CostConfig
): Promise<ConversationSession[]> {
  if (!fs.existsSync(brainDir)) {
    return [];
  }

  const entries = await fs.promises.readdir(brainDir, { withFileTypes: true });
  const sessions: ConversationSession[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const cid = entry.name;
    const logPath = path.join(brainDir, cid, '.system_generated', 'logs', 'transcript.jsonl');

    if (!fs.existsSync(logPath)) continue;

    try {
      const parsed = await parseTranscriptFile(logPath, cid, config.charsPerToken);
      const tokens = aggregateTokens(parsed.breakdowns);
      const { costUSD, costIDR } = calculateCost(tokens, config, parsed.detectedModel);

      let primaryWorkspacePath: string | null = null;
      let primaryWorkspaceName = 'General / Unassigned';

      if (parsed.detectedWorkspaces.size > 0) {
        // Take the first recognized workspace path
        const first = Array.from(parsed.detectedWorkspaces)[0];
        const normalized = normalizeWorkspacePath(first);
        primaryWorkspacePath = normalized.path;
        primaryWorkspaceName = normalized.name;
      }

      const title = parsed.firstPrompt
        ? truncateText(parsed.firstPrompt, 60)
        : `Session ${cid.slice(0, 8)}`;

      sessions.push({
        id: cid,
        workspacePath: primaryWorkspacePath,
        workspaceName: primaryWorkspaceName,
        title,
        firstPromptSnippet: parsed.firstPrompt,
        detectedModel: parsed.detectedModel,
        createdAt: parsed.createdAt || new Date().toISOString(),
        updatedAt: parsed.updatedAt || parsed.createdAt || new Date().toISOString(),
        turnCount: Math.max(1, parsed.turnCount),
        stepCount: parsed.steps.length,
        tokens,
        estimatedCostUSD: costUSD,
        estimatedCostIDR: costIDR,
        steps: parsed.steps,
      });
    } catch (err) {
      console.warn(`Error scanning session ${cid}:`, err);
    }
  }

  // Sort sessions newest first
  sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return sessions;
}

export function extractWorkspaceSummaries(sessions: ConversationSession[]): WorkspaceSummary[] {
  const map = new Map<string, { name: string; count: number; tokens: number }>();

  for (const s of sessions) {
    const key = s.workspacePath || 'UNASSIGNED';
    const name = s.workspaceName;
    const existing = map.get(key) || { name, count: 0, tokens: 0 };
    existing.count += 1;
    existing.tokens += s.tokens.grandTotal;
    map.set(key, existing);
  }

  const summaries: WorkspaceSummary[] = [];
  for (const [wsPath, data] of map.entries()) {
    summaries.push({
      path: wsPath,
      name: data.name,
      sessionCount: data.count,
      totalTokens: data.tokens,
    });
  }

  // Sort by session count descending
  summaries.sort((a, b) => b.sessionCount - a.sessionCount);
  return summaries;
}

export function computeOverallStats(
  sessions: ConversationSession[],
  config: CostConfig
): OverallStats {
  const totalTokens = aggregateTokens(sessions.map((s) => s.tokens));
  let costUSD = 0;
  let costIDR = 0;

  if (config.selectedModelId === 'auto') {
    // Sum individual sessions computed with their actual model
    for (const s of sessions) {
      costUSD += s.estimatedCostUSD;
      costIDR += s.estimatedCostIDR;
    }
    costUSD = Number(costUSD.toFixed(6));
  } else {
    // Manual override for all sessions
    const calc = calculateCost(totalTokens, config);
    costUSD = calc.costUSD;
    costIDR = calc.costIDR;
  }

  const totalTurns = sessions.reduce((acc, s) => acc + s.turnCount, 0);

  return {
    totalSessions: sessions.length,
    totalTurns,
    tokens: totalTokens,
    costUSD,
    costIDR,
  };
}

export async function getDashboardData(
  brainDir: string,
  config: CostConfig,
  currentWorkspace: string | null = null,
  selectedWorkspace: string = 'CURRENT'
): Promise<DashboardData> {
  const allSessions = await scanBrainDirectory(brainDir, config);
  const workspaces = extractWorkspaceSummaries(allSessions);

  let activeWorkspacePath = selectedWorkspace;
  if (selectedWorkspace === 'CURRENT') {
    activeWorkspacePath = currentWorkspace ? normalizeWorkspacePath(currentWorkspace).path : 'ALL';
  }

  let filteredSessions = allSessions;
  if (activeWorkspacePath !== 'ALL') {
    filteredSessions = allSessions.filter((s) => {
      if (!s.workspacePath) return activeWorkspacePath === 'UNASSIGNED';
      return (
        s.workspacePath.toLowerCase() === activeWorkspacePath.toLowerCase() ||
        s.workspacePath.toLowerCase().startsWith(activeWorkspacePath.toLowerCase())
      );
    });
  }

  const overallStats = computeOverallStats(filteredSessions, config);

  return {
    currentWorkspace: currentWorkspace ? normalizeWorkspacePath(currentWorkspace).path : null,
    selectedWorkspace: activeWorkspacePath,
    workspaces,
    sessions: filteredSessions,
    overallStats,
    costConfig: config,
    pricingModels: DEFAULT_PRICING_MODELS,
  };
}

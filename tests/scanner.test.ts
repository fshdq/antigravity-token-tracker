import { getDashboardData, getDefaultBrainDir } from '../src/scanner/brainScanner';
import { CostConfig } from '../src/types';
import { formatCurrency, formatNumber } from '../src/utils/formatters';

async function runTest() {
  console.log('Testing BrainScanner on real system transcripts...');
  const brainDir = getDefaultBrainDir();
  console.log('Brain dir:', brainDir);

  const config: CostConfig = {
    selectedModelId: 'auto',
    currency: 'USD',
    idrExchangeRate: 16000,
    charsPerToken: 3.85,
    customInputRate: 0.075,
    customOutputRate: 0.30,
  };

  const start = Date.now();
  const data = await getDashboardData(
    brainDir,
    config,
    '/Users/user/Code/jerune-store',
    'CURRENT'
  );
  const duration = Date.now() - start;

  console.log(`\nScan completed in ${duration}ms!`);
  console.log('Current workspace filter:', data.selectedWorkspace);
  console.log(`Filtered sessions count: ${data.sessions.length}`);
  console.log(`Total workspaces found: ${data.workspaces.length}`);

  console.log('\nTop 5 Workspaces:');
  for (const w of data.workspaces.slice(0, 5)) {
    console.log(` - ${w.name} (${w.path}): ${w.sessionCount} sessions, ${formatNumber(w.totalTokens)} tokens`);
  }

  console.log('\nOverall Stats for Current Workspace:');
  console.log(` - Total Sessions: ${data.overallStats.totalSessions}`);
  console.log(` - Total Input Tokens: ${formatNumber(data.overallStats.tokens.totalInput)}`);
  console.log(`   * User Prompt: ${formatNumber(data.overallStats.tokens.userPrompt)}`);
  console.log(`   * Tool Outputs: ${formatNumber(data.overallStats.tokens.toolOutputs)}`);
  console.log(`   * System / History: ${formatNumber(data.overallStats.tokens.systemAndHistory)}`);
  console.log(` - Total Output Tokens: ${formatNumber(data.overallStats.tokens.totalOutput)}`);
  console.log(`   * Thinking: ${formatNumber(data.overallStats.tokens.thinking)}`);
  console.log(`   * Tool Calls: ${formatNumber(data.overallStats.tokens.toolCalls)}`);
  console.log(`   * Assistant Response: ${formatNumber(data.overallStats.tokens.assistantResponse)}`);
  console.log(` - Grand Total Tokens: ${formatNumber(data.overallStats.tokens.grandTotal)}`);
  console.log(` - Estimated Cost USD: ${formatCurrency(data.overallStats.costUSD, 'USD')}`);
  console.log(` - Estimated Cost IDR: ${formatCurrency(data.overallStats.costIDR, 'IDR')}`);

  if (data.sessions.length > 0) {
    console.log('\nSample Sessions:');
    for (const s of data.sessions.slice(0, 3)) {
      console.log(` - [${s.id.slice(0, 8)}] Model: ${s.detectedModel} | Tokens: ${formatNumber(s.tokens.grandTotal)} | Cost: ${formatCurrency(s.estimatedCostUSD, 'USD')} / ${formatCurrency(s.estimatedCostIDR, 'IDR')}`);
    }
  }
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

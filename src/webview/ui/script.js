// Acquire VS Code API if running in VS Code Webview
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;

// Application State
let currentData = null;
let currentCurrency = 'USD';
let currentSearch = '';
let currentSort = 'newest';

// Elements
const workspaceSelect = document.getElementById('workspaceSelect');
const modelSelect = document.getElementById('modelSelect');
const currencyToggleBtn = document.getElementById('currencyToggleBtn');
const currencyIcon = document.getElementById('currencyIcon');
const currencyLabel = document.getElementById('currencyLabel');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const sessionsTableBody = document.getElementById('sessionsTableBody');
const emptyState = document.getElementById('emptyState');

// KPI Elements
const kpiScopeCount = document.getElementById('kpiScopeCount');
const kpiWorkspaceName = document.getElementById('kpiWorkspaceName');
const kpiTurnCount = document.getElementById('kpiTurnCount');
const kpiTotalTokens = document.getElementById('kpiTotalTokens');
const kpiInputTokens = document.getElementById('kpiInputTokens');
const kpiOutputTokens = document.getElementById('kpiOutputTokens');
const kpiCostPrimary = document.getElementById('kpiCostPrimary');
const kpiCostSecondary = document.getElementById('kpiCostSecondary');
const kpiPricingModelTag = document.getElementById('kpiPricingModelTag');
const kpiToolRatio = document.getElementById('kpiToolRatio');

// Breakdown Elements
const inputColTotal = document.getElementById('inputColTotal');
const barToolOut = document.getElementById('barToolOut');
const barSystemHist = document.getElementById('barSystemHist');
const barUserPrompt = document.getElementById('barUserPrompt');
const legToolOutVal = document.getElementById('legToolOutVal');
const legToolOutPct = document.getElementById('legToolOutPct');
const legSystemHistVal = document.getElementById('legSystemHistVal');
const legSystemHistPct = document.getElementById('legSystemHistPct');
const legUserPromptVal = document.getElementById('legUserPromptVal');
const legUserPromptPct = document.getElementById('legUserPromptPct');

const outputColTotal = document.getElementById('outputColTotal');
const barToolCall = document.getElementById('barToolCall');
const barThinking = document.getElementById('barThinking');
const barAssistant = document.getElementById('barAssistant');
const legToolCallVal = document.getElementById('legToolCallVal');
const legToolCallPct = document.getElementById('legToolCallPct');
const legThinkingVal = document.getElementById('legThinkingVal');
const legThinkingPct = document.getElementById('legThinkingPct');
const legAssistantVal = document.getElementById('legAssistantVal');
const legAssistantPct = document.getElementById('legAssistantPct');

// Drawer Elements
const detailDrawerOverlay = document.getElementById('detailDrawerOverlay');
const drawerCloseBtn = document.getElementById('drawerCloseBtn');
const drawerSessionTitle = document.getElementById('drawerSessionTitle');
const drawerSessionSubtitle = document.getElementById('drawerSessionSubtitle');
const drawerModelPill = document.getElementById('drawerModelPill');
const drawerWorkspacePill = document.getElementById('drawerWorkspacePill');
const drawerDatePill = document.getElementById('drawerDatePill');
const drawerTokensPill = document.getElementById('drawerTokensPill');
const drawerCostPill = document.getElementById('drawerCostPill');
const drawerTimeline = document.getElementById('drawerTimeline');

// Utility formatters
function formatNum(n) {
  if (isNaN(n)) return '0';
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

function formatCost(usd, idr, currency) {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Math.round(idr || 0));
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(usd || 0);
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoStr;
  }
}

// Event Listeners
workspaceSelect.addEventListener('change', () => {
  if (vscode) {
    vscode.postMessage({
      command: 'switchWorkspace',
      workspace: workspaceSelect.value,
    });
  }
});

modelSelect.addEventListener('change', () => {
  if (vscode) {
    vscode.postMessage({
      command: 'changeModel',
      modelId: modelSelect.value,
    });
  }
});

currencyToggleBtn.addEventListener('click', () => {
  currentCurrency = currentCurrency === 'USD' ? 'IDR' : 'USD';
  currencyIcon.textContent = currentCurrency === 'USD' ? '$' : 'Rp';
  currencyLabel.textContent = currentCurrency;
  if (vscode) {
    vscode.postMessage({
      command: 'toggleCurrency',
      currency: currentCurrency,
    });
  }
  renderDashboard();
});

refreshBtn.addEventListener('click', () => {
  refreshBtn.classList.add('loading');
  if (vscode) {
    vscode.postMessage({ command: 'refresh' });
  }
});

searchInput.addEventListener('input', (e) => {
  currentSearch = e.target.value.toLowerCase().trim();
  renderSessionsTable();
});

sortSelect.addEventListener('change', (e) => {
  currentSort = e.target.value;
  renderSessionsTable();
});

drawerCloseBtn.addEventListener('click', () => {
  detailDrawerOverlay.classList.remove('active');
});

detailDrawerOverlay.addEventListener('click', (e) => {
  if (e.target === detailDrawerOverlay) {
    detailDrawerOverlay.classList.remove('active');
  }
});

// Message Listener from Extension Host
window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.type) {
    case 'setData':
      currentData = message.payload;
      currentCurrency = currentData.costConfig.currency || 'USD';
      currencyIcon.textContent = currentCurrency === 'USD' ? '$' : 'Rp';
      currencyLabel.textContent = currentCurrency;
      modelSelect.value = currentData.costConfig.selectedModelId || 'gemini-2.5-flash';
      populateWorkspaceDropdown();
      renderDashboard();
      refreshBtn.classList.remove('loading');
      break;
  }
});

function populateWorkspaceDropdown() {
  if (!currentData) return;
  const currentVal = currentData.selectedWorkspace;
  workspaceSelect.innerHTML = '';

  const optCurrent = document.createElement('option');
  optCurrent.value = 'CURRENT';
  optCurrent.textContent = currentData.currentWorkspace
    ? `Current: ${currentData.currentWorkspace.split('/').pop()}`
    : 'Current Workspace';
  workspaceSelect.appendChild(optCurrent);

  const optAll = document.createElement('option');
  optAll.value = 'ALL';
  optAll.textContent = 'All Workspaces';
  workspaceSelect.appendChild(optAll);

  for (const ws of currentData.workspaces) {
    const opt = document.createElement('option');
    opt.value = ws.path;
    opt.textContent = `${ws.name} (${ws.sessionCount} sessions)`;
    workspaceSelect.appendChild(opt);
  }

  workspaceSelect.value = currentVal;
}

function renderDashboard() {
  if (!currentData) return;
  const stats = currentData.overallStats;
  const tokens = stats.tokens;

  // KPI 1: Scope
  kpiScopeCount.textContent = formatNum(stats.totalSessions);
  kpiTurnCount.textContent = `${formatNum(stats.totalTurns)} turns`;
  let wsLabel = 'All Workspaces';
  if (currentData.selectedWorkspace !== 'ALL') {
    wsLabel = currentData.selectedWorkspace.split('/').pop() || 'Workspace';
  }
  kpiWorkspaceName.textContent = wsLabel;

  // KPI 2: Total Tokens
  kpiTotalTokens.textContent = formatNum(tokens.grandTotal);
  kpiInputTokens.textContent = formatNum(tokens.totalInput);
  kpiOutputTokens.textContent = formatNum(tokens.totalOutput);

  // KPI 3: Cost
  if (currentCurrency === 'USD') {
    kpiCostPrimary.textContent = formatCost(stats.costUSD, stats.costIDR, 'USD');
    kpiCostSecondary.textContent = formatCost(stats.costUSD, stats.costIDR, 'IDR');
  } else {
    kpiCostPrimary.textContent = formatCost(stats.costUSD, stats.costIDR, 'IDR');
    kpiCostSecondary.textContent = formatCost(stats.costUSD, stats.costIDR, 'USD');
  }
  kpiPricingModelTag.textContent = (currentData.costConfig.selectedModelId || '').replace('gemini-2.5-', '').replace('claude-3-7-', '');

  // KPI 4: Tool Context Ratio
  const toolRatio = tokens.totalInput > 0 ? Math.round((tokens.toolOutputs / tokens.totalInput) * 100) : 0;
  kpiToolRatio.textContent = `${toolRatio}%`;

  // Granular Breakdown - Input
  inputColTotal.textContent = `${formatNum(tokens.totalInput)} tokens`;
  const inTotal = Math.max(1, tokens.totalInput);
  const toolOutPct = Math.round((tokens.toolOutputs / inTotal) * 100);
  const sysHistPct = Math.round((tokens.systemAndHistory / inTotal) * 100);
  const userPromptPct = Math.max(0, 100 - toolOutPct - sysHistPct);

  barToolOut.style.width = `${toolOutPct}%`;
  barSystemHist.style.width = `${sysHistPct}%`;
  barUserPrompt.style.width = `${userPromptPct}%`;

  legToolOutVal.textContent = formatNum(tokens.toolOutputs);
  legToolOutPct.textContent = `(${toolOutPct}%)`;
  legSystemHistVal.textContent = formatNum(tokens.systemAndHistory);
  legSystemHistPct.textContent = `(${sysHistPct}%)`;
  legUserPromptVal.textContent = formatNum(tokens.userPrompt);
  legUserPromptPct.textContent = `(${userPromptPct}%)`;

  // Granular Breakdown - Output
  outputColTotal.textContent = `${formatNum(tokens.totalOutput)} tokens`;
  const outTotal = Math.max(1, tokens.totalOutput);
  const toolCallPct = Math.round((tokens.toolCalls / outTotal) * 100);
  const thinkingPct = Math.round((tokens.thinking / outTotal) * 100);
  const assistantPct = Math.max(0, 100 - toolCallPct - thinkingPct);

  barToolCall.style.width = `${toolCallPct}%`;
  barThinking.style.width = `${thinkingPct}%`;
  barAssistant.style.width = `${assistantPct}%`;

  legToolCallVal.textContent = formatNum(tokens.toolCalls);
  legToolCallPct.textContent = `(${toolCallPct}%)`;
  legThinkingVal.textContent = formatNum(tokens.thinking);
  legThinkingPct.textContent = `(${thinkingPct}%)`;
  legAssistantVal.textContent = formatNum(tokens.assistantResponse);
  legAssistantPct.textContent = `(${assistantPct}%)`;

  renderSessionsTable();
}

function renderSessionsTable() {
  if (!currentData) return;
  let sessions = [...currentData.sessions];

  // Filter
  if (currentSearch) {
    sessions = sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(currentSearch) ||
        s.id.toLowerCase().includes(currentSearch) ||
        s.workspaceName.toLowerCase().includes(currentSearch) ||
        (s.firstPromptSnippet && s.firstPromptSnippet.toLowerCase().includes(currentSearch))
    );
  }

  // Sort
  if (currentSort === 'newest') {
    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } else if (currentSort === 'oldest') {
    sessions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (currentSort === 'tokens_desc') {
    sessions.sort((a, b) => b.tokens.grandTotal - a.tokens.grandTotal);
  } else if (currentSort === 'cost_desc') {
    sessions.sort((a, b) => b.estimatedCostUSD - a.estimatedCostUSD);
  }

  sessionsTableBody.innerHTML = '';
  if (sessions.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  for (const s of sessions) {
    const tr = document.createElement('tr');

    const isClaude = (s.detectedModel || '').toLowerCase().includes('claude');
    const modelBadgeClass = isClaude ? 'badge-claude' : 'badge-gemini';

    const tdTitle = document.createElement('td');
    tdTitle.className = 'session-title-cell';
    tdTitle.innerHTML = `
      <div class="session-main-text" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</div>
      <div class="session-meta-sub">
        <span class="badge-tag">${escapeHtml(s.workspaceName)}</span>
        <span class="badge-tag ${modelBadgeClass}">🤖 ${escapeHtml(s.detectedModel || 'Gemini Flash')}</span>
        <span>ID: ${s.id.slice(0, 8)}</span>
      </div>
    `;

    const tdDate = document.createElement('td');
    tdDate.textContent = formatDate(s.updatedAt);

    const tdTurns = document.createElement('td');
    tdTurns.textContent = `${s.turnCount} turns (${s.stepCount} steps)`;

    const tdIn = document.createElement('td');
    tdIn.textContent = formatNum(s.tokens.totalInput);

    const tdOut = document.createElement('td');
    tdOut.textContent = formatNum(s.tokens.totalOutput);

    const tdTotal = document.createElement('td');
    tdTotal.innerHTML = `<b>${formatNum(s.tokens.grandTotal)}</b>`;

    const tdCost = document.createElement('td');
    tdCost.textContent = formatCost(s.estimatedCostUSD, s.estimatedCostIDR, currentCurrency);

    const tdAction = document.createElement('td');
    const inspectBtn = document.createElement('button');
    inspectBtn.className = 'inspect-btn';
    inspectBtn.textContent = 'Inspect';
    inspectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSessionDrawer(s);
    });
    tdAction.appendChild(inspectBtn);

    tr.appendChild(tdTitle);
    tr.appendChild(tdDate);
    tr.appendChild(tdTurns);
    tr.appendChild(tdIn);
    tr.appendChild(tdOut);
    tr.appendChild(tdTotal);
    tr.appendChild(tdCost);
    tr.appendChild(tdAction);

    tr.addEventListener('click', () => openSessionDrawer(s));
    tr.style.cursor = 'pointer';

    sessionsTableBody.appendChild(tr);
  }
}

function openSessionDrawer(session) {
  drawerSessionTitle.textContent = session.title;
  drawerSessionSubtitle.textContent = `ID: ${session.id}`;
  if (drawerModelPill) {
    drawerModelPill.textContent = `🤖 ${session.detectedModel || 'Gemini Flash'}`;
  }
  drawerWorkspacePill.textContent = `📁 ${session.workspaceName}`;
  drawerDatePill.textContent = `📅 ${formatDate(session.createdAt)}`;
  drawerTokensPill.textContent = `⚡ ${formatNum(session.tokens.grandTotal)} Tokens`;
  drawerCostPill.textContent = `💰 ${formatCost(session.estimatedCostUSD, session.estimatedCostIDR, currentCurrency)}`;

  drawerTimeline.innerHTML = '';

  for (const step of session.steps) {
    const card = document.createElement('div');
    card.className = 'step-card';

    let roleBadgeClass = 'badge-system';
    if (step.role === 'user') roleBadgeClass = 'badge-user';
    else if (step.role === 'assistant') roleBadgeClass = 'badge-assistant';
    else if (step.role === 'tool') roleBadgeClass = 'badge-tool';

    let contentHtml = '';
    if (step.details?.prompt) {
      contentHtml = `<div class="step-content">${escapeHtml(step.details.prompt)}</div>`;
    } else if (step.details?.thinking) {
      contentHtml = `<div class="step-content" style="color: #f472b6;"><em>[Thinking]</em>\n${escapeHtml(step.details.thinking)}</div>`;
    } else if (step.details?.assistantContent) {
      contentHtml = `<div class="step-content">${escapeHtml(step.details.assistantContent)}</div>`;
    } else if (step.details?.toolOutputSnippet) {
      contentHtml = `<div class="step-content">${escapeHtml(step.details.toolOutputSnippet)}</div>`;
    }

    card.innerHTML = `
      <div class="step-header">
        <span class="step-type-badge ${roleBadgeClass}">Step #${step.stepIndex} • ${step.type}</span>
        <span class="step-tokens">${formatNum(step.totalTokens)} tokens</span>
      </div>
      <div style="font-weight: 500; margin-bottom: 6px; color: #ffffff;">${escapeHtml(step.summary)}</div>
      ${contentHtml}
    `;

    drawerTimeline.appendChild(card);
  }

  detailDrawerOverlay.classList.add('active');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initial request
if (vscode) {
  vscode.postMessage({ command: 'ready' });
}

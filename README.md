# Antigravity Token Tracker & Profiler

**Antigravity Token Tracker & Profiler** is a VS Code and Google Antigravity IDE extension built to provide **complete observability** into token usage and operational cost estimation for your AI agent interactions.

---

## ✨ Key Features

### 1. Workspace-Based Chat History Explorer
- Automatically detects and organizes Antigravity conversation sessions by your active workspace project.
- Easily toggle between **Current Workspace**, **All Workspaces**, or any specific project from the workspace switcher.

### 2. Granular Token Teardown (Token Anatomy)
- **Input Context (Ingested by Model)**:
  - **User Prompts**: Direct user request text and queries.
  - **Tool Outputs**: Terminal execution logs, file contents, grep/search outputs (typically accounting for 60%–90% of total input tokens).
  - **System & History**: System instructions, skill cheatsheets, editor tab metadata, and session summaries.
- **Output Generation (Produced by Model)**:
  - **Model Thinking**: Internal reasoning and Chain-of-Thought (CoT) tokens.
  - **Tool Calls**: Generated JSON payloads, CLI commands, and file diff patches.
  - **Assistant Responses**: Rendered markdown messages displayed in your chat view.

### 3. Automatic Model Detection & Multi-Model Cost Estimator
- **Automatic Per-Session Model Detection (`✨ Auto`)**:
  - Automatically identifies the exact model used for each session (e.g., `Gemini 3.5/3.8 Flash`, `Gemini Pro`, `Claude Sonnet 4.6 (Thinking)`).
  - Accurately calculates costs based on each session's actual model and sums aggregate workspace costs.
- **Official Pricing Presets & Simulation**:
  - **Gemini 2.5 / 3.x Flash**: $0.075 / 1M in, $0.30 / 1M out
  - **Gemini 2.5 / 3.x Pro**: $1.25 / 1M in, $5.00 / 1M out
  - **Claude 3.7 / 4.x Sonnet**: $3.00 / 1M in, $15.00 / 1M out
  - **Custom Rate**: User-defined input/output rates.
- **Real-Time Currency Conversion**:
  - Seamlessly switch between **USD ($)** and **IDR (Rp)** with configurable exchange rates.

### 4. Interactive Dashboard & Dual Access Mode
- Access via **Activity Bar** icon (Sidebar panel) or **Full Editor Tab** (`Cmd + Shift + P` > `Antigravity: Open Token Profiler Dashboard`).
- High-level KPI summary cards, visual token distribution progress bars, interactive search & sorting.
- **Turn-by-Turn Inspection Drawer**: Click any session to inspect each agent turn, view tool parameters, outputs, and exact token consumption.
- Real-time updates via internal file watcher.

---

## 🚀 Getting Started & Development

### Requirements
- Node.js `v18+` or `v20+`
- npm `10+`
- Antigravity IDE or VS Code `^1.85.0`

### Running in Development Mode (Debugging)
1. Open this repository folder in Antigravity IDE / VS Code.
2. Press **F5** (or open the **Run and Debug** view and click **Run Extension**).
3. A new *Extension Development Host* window will launch with the extension enabled.
4. Click the **Antigravity Token Tracker** icon in the Activity Bar or run:
   ```
   Antigravity: Open Token Profiler Dashboard
   ```

### Building & Packaging
```bash
# Install dependencies
npm install

# Compile TypeScript and bundle with esbuild
npm run build

# Package into a .vsix extension file
npx @vscode/vsce package --no-git-tag-version --allow-missing-repository
```

---

## 📦 Installing the VSIX in Antigravity IDE

1. Press `Cmd + Shift + P` to open the Command Palette.
2. Type and select `Extensions: Install from VSIX...`.
3. Choose the generated `antigravity-token-tracker-0.1.0.vsix` file.
4. The extension will be installed immediately into your IDE.

---

## 🏗️ Architecture

```
antigravity-token-tracker/
├── package.json              # Extension manifest & configuration contributions
├── esbuild.js                # Fast bundler & asset copy script
├── src/
│   ├── extension.ts          # Extension lifecycle, commands, and file watcher
│   ├── scanner/
│   │   ├── brainScanner.ts   # Parses ~/.gemini/antigravity-ide/brain transcripts
│   │   ├── tokenEstimator.ts # Computes input/output token breakdowns
│   │   └── costCalculator.ts # Auto model resolution & multi-currency pricing
│   ├── types/
│   │   └── index.ts          # Core TypeScript data interfaces
│   └── webview/
│       ├── ProfilerPanel.ts  # Webview controller for editor tab
│       ├── ProfilerSidebar.ts# WebviewViewProvider for activity bar
│       └── ui/               # Dashboard HTML, CSS (dark mode), and JS
└── tests/
    └── scanner.test.ts       # Automated verification against local transcripts
```

---

## 📄 License
MIT License


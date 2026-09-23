import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getDefaultBrainDir, getDashboardData } from '../scanner/brainScanner';
import { CostConfig, DashboardData } from '../types';

export class ProfilerPanel {
  public static currentPanel: ProfilerPanel | undefined;
  public static readonly viewType = 'antigravityTokenTracker.dashboard';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  private _selectedWorkspace = 'CURRENT';
  private _costConfig: CostConfig;

  public static createOrShow(extensionUri: vscode.Uri): ProfilerPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ProfilerPanel.currentPanel) {
      ProfilerPanel.currentPanel._panel.reveal(column);
      ProfilerPanel.currentPanel.refresh();
      return ProfilerPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      ProfilerPanel.viewType,
      'Antigravity Token Profiler',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist'),
          vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'ui'),
          vscode.Uri.joinPath(extensionUri, 'resources'),
        ],
      }
    );

    ProfilerPanel.currentPanel = new ProfilerPanel(panel, extensionUri);
    return ProfilerPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Load initial settings
    const config = vscode.workspace.getConfiguration('antigravityTokenTracker');
    this._costConfig = {
      selectedModelId: config.get<string>('defaultModel', 'auto'),
      currency: config.get<'USD' | 'IDR'>('currency', 'USD'),
      idrExchangeRate: config.get<number>('idrExchangeRate', 16000),
      charsPerToken: config.get<number>('charsPerToken', 3.85),
      customInputRate: 1.0,
      customOutputRate: 3.0,
    };

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'ready':
          case 'refresh':
            await this.refresh();
            break;
          case 'switchWorkspace':
            this._selectedWorkspace = message.workspace;
            await this.refresh();
            break;
          case 'changeModel':
            this._costConfig.selectedModelId = message.modelId;
            await this.refresh();
            break;
          case 'toggleCurrency':
            this._costConfig.currency = message.currency;
            await this.refresh();
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public async refresh(): Promise<void> {
    const currentWorkspacePath =
      vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : null;

    const brainDir = getDefaultBrainDir();
    const data: DashboardData = await getDashboardData(
      brainDir,
      this._costConfig,
      currentWorkspacePath,
      this._selectedWorkspace
    );

    this._panel.webview.postMessage({
      type: 'setData',
      payload: data,
    });
  }

  public dispose(): void {
    ProfilerPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) x.dispose();
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const distUi = path.join(this._extensionUri.fsPath, 'dist', 'ui');
    const srcUi = path.join(this._extensionUri.fsPath, 'src', 'webview', 'ui');
    const uiDir = fs.existsSync(distUi) ? distUi : srcUi;
    const htmlPath = path.join(uiDir, 'dashboard.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');

    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(uiDir, 'style.css'))
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(uiDir, 'script.js'))
    );

    html = html.replace('{{styleUri}}', styleUri.toString());
    html = html.replace('{{scriptUri}}', scriptUri.toString());

    return html;
  }
}

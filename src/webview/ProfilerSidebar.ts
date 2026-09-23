import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getDefaultBrainDir, getDashboardData } from '../scanner/brainScanner';
import { CostConfig, DashboardData } from '../types';

export class ProfilerSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'antigravityTokenTracker.sidebarView';

  private _view?: vscode.WebviewView;
  private _selectedWorkspace = 'CURRENT';
  private _costConfig: CostConfig;

  constructor(private readonly _extensionUri: vscode.Uri) {
    const config = vscode.workspace.getConfiguration('antigravityTokenTracker');
    this._costConfig = {
      selectedModelId: config.get<string>('defaultModel', 'auto'),
      currency: config.get<'USD' | 'IDR'>('currency', 'USD'),
      idrExchangeRate: config.get<number>('idrExchangeRate', 16000),
      charsPerToken: config.get<number>('charsPerToken', 3.85),
      customInputRate: 1.0,
      customOutputRate: 3.0,
    };
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'dist'),
        vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'ui'),
        vscode.Uri.joinPath(this._extensionUri, 'resources'),
      ],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
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
    });

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.refresh();
      }
    });
  }

  public async refresh(): Promise<void> {
    if (!this._view) return;

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

    this._view.webview.postMessage({
      type: 'setData',
      payload: data,
    });
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

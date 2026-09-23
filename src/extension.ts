import * as vscode from 'vscode';
import { getDefaultBrainDir } from './scanner/brainScanner';
import { ProfilerPanel } from './webview/ProfilerPanel';
import { ProfilerSidebarProvider } from './webview/ProfilerSidebar';

export function activate(context: vscode.ExtensionContext) {
  console.log('Antigravity Token Tracker & Profiler is now active!');

  // 1. Register Activity Bar Sidebar Provider
  const sidebarProvider = new ProfilerSidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ProfilerSidebarProvider.viewType,
      sidebarProvider
    )
  );

  // 2. Register Open Full Dashboard Command
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityTokenTracker.openDashboard', () => {
      ProfilerPanel.createOrShow(context.extensionUri);
    })
  );

  // 3. Register Global Refresh Command
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityTokenTracker.refresh', async () => {
      await sidebarProvider.refresh();
      if (ProfilerPanel.currentPanel) {
        await ProfilerPanel.currentPanel.refresh();
      }
      vscode.window.showInformationMessage('Antigravity Token Tracker data refreshed.');
    })
  );

  // 4. File Watcher for Real-time Log Updates
  try {
    const brainDir = getDefaultBrainDir();
    const pattern = new vscode.RelativePattern(
      brainDir,
      '*\\.system_generated\\logs\\*.jsonl'
    );
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    const onFileChange = () => {
      sidebarProvider.refresh();
      if (ProfilerPanel.currentPanel) {
        ProfilerPanel.currentPanel.refresh();
      }
    };

    watcher.onDidChange(onFileChange);
    watcher.onDidCreate(onFileChange);
    context.subscriptions.push(watcher);
  } catch (err) {
    console.warn('Could not initialize brain logs watcher:', err);
  }
}

export function deactivate() {
  if (ProfilerPanel.currentPanel) {
    ProfilerPanel.currentPanel.dispose();
  }
}

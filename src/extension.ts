import { basename, join } from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('EBM 查看器扩展已激活');

	const provider = new EbmEditorProvider(context);

	// 使用 CustomReadonlyEditorProvider 而不是 CustomTextEditorProvider
	const registration = vscode.window.registerCustomEditorProvider(
		'cabal-file-viewer.cabalViewer',
		provider,
		{
			webviewOptions: {
				retainContextWhenHidden: true,
			},
			supportsMultipleEditorsPerDocument: false,
		}
	);

	context.subscriptions.push(registration);
}


class EbmEditorProvider implements vscode.CustomReadonlyEditorProvider {
	constructor(private readonly context: vscode.ExtensionContext) { }

	async openCustomDocument(uri: vscode.Uri): Promise<vscode.CustomDocument> {
		// console.log('打开自定义文档:', uri.fsPath);
		return { uri, dispose: () => { } };
	}

	async resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
		console.log('解析自定义编辑器:', document.uri.fsPath);

		try {
			// 获取文件所在目录和工作区根目录
			const fileDir = vscode.Uri.file(join(document.uri.fsPath));
			const workspaceFolders = vscode.workspace.workspaceFolders;
			const workspaceRoots = workspaceFolders ? workspaceFolders.map(folder => folder.uri) : [fileDir];

			// 关键：正确配置 localResourceRoots
			webviewPanel.webview.options = {
				enableScripts: true,
				localResourceRoots: [
					this.context.extensionUri,
					fileDir,
					...workspaceRoots, // 包含所有工作区根目录
					vscode.Uri.file(join(this.context.extensionPath, 'out'))
				]
			};

			// 调试信息
			// console.log('文件URI:', document.uri.toString());
			// console.log('文件目录:', fileDir.toString());
			// workspaceRoots.map(uri => console.log('工作区根目录:', uri.toString()));

			webviewPanel.webview.html = this.getReactHtmlWithDirectFileAccess(
				webviewPanel.webview,
				document.uri,
				basename(document.uri.fsPath)
			);

		} catch (error: any) {
			console.error('错误:', error);
			webviewPanel.webview.html = this.getErrorHtml(error.message);
		}
	}

	private getReactHtmlWithDirectFileAccess(webview: vscode.Webview, fileUri: vscode.Uri, fileName: string): string {
		// 将工作区文件URI转换为Webview可访问的URI
		const webviewFileUri = webview.asWebviewUri(fileUri);

		const reactDistPath = join(this.context.extensionPath, 'out');
		const resourceUri = webview.asWebviewUri(vscode.Uri.file(reactDistPath));

		return `<!doctype html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EBM 查看器 - ${fileName}</title>
    <script>
        window.ebmFileInfo = {
            fileName: "${fileName}",
            fileUri: "${webviewFileUri.toString()}",
            originalUri: "${fileUri.toString()}"
        };
    </script>
    <script type="module" crossorigin src="${resourceUri}/assets/index.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
	}


	private getErrorHtml(errorMessage: string): string {
		return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body {
			background: #1e1e1e;
			color: #ff6b6b;
			padding: 40px;
			font-family: sans-serif;
		}
	</style>
</head>
<body>
	<h2>错误</h2>
	<p>${errorMessage}</p>
</body>
</html>`;
	}
}

export function deactivate() { }
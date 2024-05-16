// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "matlab-extra-support" is now active!');
	const outputChannel = vscode.window.createOutputChannel('MATLAB Extra Support');

	let disposable1 = vscode.commands.registerCommand('matlab-extra-support.runSection', async () => {
		
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const document = editor.document; // retrieve the document the editor is on
			if (document.languageId === 'matlab') {

				const cursorPosition = editor.selection.active;
				let startSectionLine = cursorPosition.line;
				let endSectionLine = cursorPosition.line;

				// first we will find the start of the section
				while (startSectionLine > 0 && !document.lineAt(startSectionLine).text.startsWith('%%')) {
					startSectionLine--;
				}

				// now find the end
				while(endSectionLine < document.lineCount - 1 && !document.lineAt(endSectionLine).text.startsWith('%%')) {
					endSectionLine++;
				}

				const sectionRange = new vscode.Range(startSectionLine, 0, endSectionLine, document.lineAt(endSectionLine).text.length);
        		let sectionText = document.getText(sectionRange);
				
				// trim the section text and remove the '%%' from the start and end
				sectionText = sectionText.replace(/^%%|%%$/g, '').trim();

				// check if the MATLAB terminal is running. if not we start one and execute our code
				let matlabTerminal = null;

				for (let terminal of vscode.window.terminals) {
					if (terminal.name === "MATLAB") {
						matlabTerminal = terminal;
						break;
					}
				}

				if (matlabTerminal) {
					outputChannel.appendLine("MATLAB terminal is running");
					// send the code to the terminal
					try {
						matlabTerminal.sendText(sectionText);
					} catch (error) {
						vscode.window.showErrorMessage("Error sending code to MATLAB terminal");
						return;
					}

				} else {
					outputChannel.appendLine("MATLAB terminal is not running. Started one");

					// start the MATLAB terminal
					try { 
						await vscode.commands.executeCommand('matlab.openCommandWindow');
					}
					catch (error) {
						vscode.window.showErrorMessage("Error starting MATLAB terminal. Ensure MATLAB Extension by MathWorks is installed.");
						return;
					}

					// retrieve the terminal we just created
					for (let terminal of vscode.window.terminals) {
						if (terminal.name === "MATLAB") {
							matlabTerminal = terminal;
						}
					}

					// error checking
					if (matlabTerminal === null) {
						vscode.window.showErrorMessage("Cannot retrieve created MATLAB terminal");
						return;
					}

					// send the code to the terminal
					try {
						matlabTerminal.sendText(sectionText);
					} catch (error) {
						vscode.window.showErrorMessage("Error sending code to MATLAB terminal");
						return;
					}

				}
			}
		}
	});

	context.subscriptions.push(disposable1);
}

// This method is called when your extension is deactivated
export function deactivate() {}

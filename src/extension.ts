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
				
				// trim the section text and remove the '%%' from the starst and end
				sectionText = sectionText.replace(/^%%|%%$/g, '').trim();
				outputChannel.appendLine(sectionText);

				runCode(sectionText, document);
				
			}
		}
	});

	let disposable2 = vscode.commands.registerCommand('matlab-extra-support.runAllSectionsAbove', async () => {
		
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const document = editor.document; // retrieve the document the editor is on

			if (document.languageId === 'matlab') {

				const cursorPosition = editor.selection.active;
				let endSectionLine = cursorPosition.line;

				// we want from start of entire document!
				let startSectionLine = 0;

				// now find the end of the current section
				while(endSectionLine < document.lineCount - 1 && !document.lineAt(endSectionLine).text.startsWith('%%')) {
					endSectionLine++;
				}

				const sectionRange = new vscode.Range(startSectionLine, 0, endSectionLine, document.lineAt(endSectionLine).text.length);
        		let sectionText = document.getText(sectionRange);
				
				// trim the section text and remove the '%%' from the starst and end
				sectionText = sectionText.replace(/^%%|%%$/g, '').trim();
				outputChannel.appendLine(sectionText);

				runCode(sectionText, document);
			}
		}
	});

	async function runCode(code: string, document: vscode.TextDocument) {
		const path = require('path');
		const documentPath = document.uri.fsPath; // retrieve the path of the document
		let directoryPath = path.dirname(documentPath); // get the directory of the document

		// check if the MATLAB terminal is running. if not we start one and execute our code
		let matlabTerminal : vscode.Terminal | null = null;

		for (let terminal of vscode.window.terminals) {
			if (terminal.name === "MATLAB") {
				matlabTerminal = terminal;
				break;
			}
		}

		if (matlabTerminal) {
			outputChannel.appendLine("MATLAB terminal is running.");
			// send the code to the terminal
			runTempFile();
		} 
		
		else { 
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

			// if the terminal is not running, we start one but we need to wait a bit for it to start so we add a delay
			setTimeout(async () => {
				outputChannel.appendLine("MATLAB terminal is not running. Started one.");
				// send the code to the terminal
				runTempFile();
			}, 1000);
			// note that this is a very inconsistent way of checking if the terminal is ready to run code.
			// cba to properly check if the terminal is ready, submit a PR if you want to fix this lol 
			
		}

		async function runTempFile() {
			outputChannel.appendLine("Sending code to MATLAB terminal.");

			const fs = require('fs');

			let fullpath : string;
			let tempFileName = 'matlab_section.m';

			if (process.platform === 'win32') {
				directoryPath += '\\';
			} else if (process.platform === 'darwin' || process.platform === 'linux') {
				directoryPath += '/';
			} else {
				vscode.window.showErrorMessage("Unsupported platform. This extension only supports Windows, MacOS and Linux. Message the developer if you want your OS supported: https://www.linkedin.com/in/faisal-shaik/");
				return;
			}

			fullpath = directoryPath +  tempFileName;
			outputChannel.appendLine(fullpath);

			// we want to make sure a file with the same name does not exist already so we don't delete it
			if (fs.existsSync(fullpath)) {
				tempFileName = 'matlab_section_' + Date.now() + '.m';
				fullpath = directoryPath +  tempFileName;
			}

			// double safety cause im paranoid lol
			while (fs.existsSync(fullpath)) {
				let x : number = Math.floor(Math.random() * 1000);
				tempFileName = `matlab_section_${x}.m`;
				fullpath = directoryPath + tempFileName;
			}

			if (matlabTerminal === null) {
				vscode.window.showErrorMessage("Cannot retrieve MATLAB terminal.");
				return;
			}

			// write the code to a temporary file
			try {
				fs.writeFileSync(fullpath, code);
			} catch (error) {
				vscode.window.showErrorMessage(`Could not create temp file '${tempFileName}' to send code to MATLAB terminal.`);
				return;
			}
			await sleep(100);

			// call the temporary file in the terminal
			try {
				matlabTerminal.sendText(tempFileName.replace(/\.m$/, ''));
			} catch (error) {
				vscode.window.showErrorMessage(`Error sending code from temp file '${tempFileName}' to MATLAB terminal.`);
				return;
			}
			await sleep(200);

			// delete the temporary file
			try {
				fs.unlinkSync(fullpath);
			} catch (error) {
				vscode.window.showErrorMessage(`Could not delete temp file '${tempFileName}'.`);
				return;
			}
		};
	}

	function sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	context.subscriptions.push(disposable1, disposable2);
}

// This method is called when your extension is deactivated
export function deactivate() {}

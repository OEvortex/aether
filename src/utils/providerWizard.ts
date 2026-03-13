import * as vscode from "vscode";
import { ApiKeyManager } from "./apiKeyManager";

interface ProviderWizardOptions {
	providerKey: string;
	displayName: string;
	apiKeyTemplate?: string;
	supportsApiKey?: boolean;
}

export class ProviderWizard {
	static async startWizard(options: ProviderWizardOptions): Promise<void> {
		const supportsApiKey = options.supportsApiKey !== false;

		const actions: Array<{
			label: string;
			detail?: string;
			description?: string;
			action: "apiKey";
		}> = [];

		if (supportsApiKey) {
			actions.push({
				label: `$(key) Configure ${options.displayName} API Key`,
				detail: `Set or clear ${options.displayName} API key`,
				action: "apiKey",
			});
		}

		if (actions.length === 0) {
			return;
		}

		const choice = await vscode.window.showQuickPick(actions, {
			title: `${options.displayName} Configuration`,
			placeHolder: "Select an option to configure",
		});

		if (!choice) {
			return;
		}

		if (choice.action === "apiKey") {
			await ProviderWizard.configureApiKey(options);
		}
	}

	static async configureApiKey(options: ProviderWizardOptions): Promise<void> {
		if (!options.apiKeyTemplate) {
			return;
		}
		await ApiKeyManager.promptAndSetApiKey(
			options.providerKey,
			options.displayName,
			options.apiKeyTemplate,
		);
	}
}

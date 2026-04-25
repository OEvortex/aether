import type { ModelConfig, ProviderConfig } from '../../types/sharedTypes';
import { getUserAgent, Logger } from '../../utils';

interface OpenCodeModelInfo {
    name?: string;
    description?: string;
    context_length?: number;
    max_output_tokens?: number;
}

interface OpenCodeModelsResponse {
    [modelId: string]: OpenCodeModelInfo;
}

export class OpenCodeGoHandler {
    async fetchModels(
        _apiKey: string,
        _baseUrl: string,
        _providerConfig: ProviderConfig,
        _customHeaders?: Record<string, string>
    ): Promise<ModelConfig[]> {
        const modelsUrl = 'https://models.dev/api.json';

        Logger.debug(`[OpenCodeGo] Fetching models from: ${modelsUrl}`);

        const headers: Record<string, string> = {
            'User-Agent': getUserAgent(),
            Accept: 'application/json'
        };

        const resp = await fetch(modelsUrl, { method: 'GET', headers });

        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            throw new Error(
                `Failed to fetch models: ${resp.status} ${resp.statusText}\n${text}`
            );
        }

        const data = (await resp.json()) as Record<string, unknown>;
        Logger.debug(`[OpenCodeGo] Received API response`);

        const models = this.parseOpenCodeModels(data);
        Logger.debug(`[OpenCodeGo] Parsed ${models.length} models from opencode-go provider`);

        return models;
    }

    private parseOpenCodeModels(data: Record<string, unknown>): ModelConfig[] {
        const models: ModelConfig[] = [];

        const opencodeGo = data['opencode-go'] as
            | { models?: OpenCodeModelsResponse }
            | undefined;

        if (!opencodeGo?.models) {
            Logger.warn('[OpenCodeGo] opencode-go provider not found in API response');
            return models;
        }

        const modelEntries = opencodeGo.models;

        for (const [modelId, modelInfo] of Object.entries(modelEntries)) {
            if (typeof modelInfo !== 'object' || modelInfo === null) {
                continue;
            }

            const info = modelInfo as Record<string, unknown>;
            const contextLength =
                (info.context_length as number) ||
                (info.max_output_tokens as number) ||
                128000;
            const maxOutputTokens = (info.max_output_tokens as number) || 8192;

            models.push({
                id: this.sanitizeModelId(modelId),
                name:
                    (info.name as string) ||
                    modelId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                tooltip: (info.description as string) || modelId,
                maxInputTokens: contextLength,
                maxOutputTokens,
                model: modelId,
                capabilities: {
                    toolCalling: true,
                    imageInput: false
                }
            });
        }

        return models;
    }

    private sanitizeModelId(id: string): string {
        return id
            .replace(/[/]/g, '-')
            .replace(/[^a-zA-Z0-9-]/g, '-')
            .toLowerCase();
    }
}
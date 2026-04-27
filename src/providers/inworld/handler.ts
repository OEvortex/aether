import type { ModelConfig, ProviderConfig } from '../../types/sharedTypes';
import { getUserAgent, Logger } from '../../utils';

interface InworldModelInfo {
    name?: string;
    description?: string;
    context_length?: number;
    max_output_tokens?: number;
}

interface InworldModelsResponse {
    [modelId: string]: InworldModelInfo;
}

export class InworldHandler {
    async fetchModels(
        _apiKey: string,
        _baseUrl: string,
        _providerConfig: ProviderConfig,
        _customHeaders?: Record<string, string>
    ): Promise<ModelConfig[]> {
        const modelsUrl = 'https://inworld.ai/models';

        Logger.debug(`[Inworld] Fetching models from: ${modelsUrl}`);

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
        Logger.debug(`[Inworld] Received API response`);

        const models = this.parseInworldModels(data);
        Logger.debug(
            `[Inworld] Parsed ${models.length} models from Inworld provider`
        );

        return models;
    }

    private parseInworldModels(data: Record<string, unknown>): ModelConfig[] {
        const models: ModelConfig[] = [];

        const inworldData = data as Record<string, unknown>;
        const router = inworldData.inworld as
            | { models?: InworldModelsResponse }
            | undefined;

        if (!router?.models) {
            Logger.warn('[Inworld] inworld provider not found in API response');
            return models;
        }

        const modelEntries = router.models;

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
                name: (info.name as string) || modelId,
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

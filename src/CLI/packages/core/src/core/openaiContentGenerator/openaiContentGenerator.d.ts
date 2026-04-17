import type { CountTokensParameters, CountTokensResponse, EmbedContentParameters, EmbedContentResponse, GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import type { Config } from '../../config/config.js';
import type { ContentGenerator, ContentGeneratorConfig } from '../contentGenerator.js';
import { ContentGenerationPipeline } from './pipeline.js';
import type { OpenAICompatibleProvider } from './provider/index.js';
export declare class OpenAIContentGenerator implements ContentGenerator {
    protected pipeline: ContentGenerationPipeline;
    constructor(contentGeneratorConfig: ContentGeneratorConfig, cliConfig: Config, provider: OpenAICompatibleProvider);
    /**
     * Hook for subclasses to customize error handling behavior
     * @param error The error that occurred
     * @param request The original request
     * @returns true if error logging should be suppressed, false otherwise
     */
    protected shouldSuppressErrorLogging(error: unknown, request: GenerateContentParameters): boolean;
    generateContent(request: GenerateContentParameters, userPromptId: string): Promise<GenerateContentResponse>;
    generateContentStream(request: GenerateContentParameters, userPromptId: string): Promise<AsyncGenerator<GenerateContentResponse>>;
    countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;
    embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;
    useSummarizedThinking(): boolean;
}

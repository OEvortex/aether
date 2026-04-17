import type { ContentGeneratorConfig } from '../../contentGenerator.js';
import { DefaultOpenAICompatibleProvider } from './default.js';
export declare class OpenRouterOpenAICompatibleProvider extends DefaultOpenAICompatibleProvider {
    static isOpenRouterProvider(contentGeneratorConfig: ContentGeneratorConfig): boolean;
    buildHeaders(): Record<string, string | undefined>;
}

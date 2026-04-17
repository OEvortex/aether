import { DefaultOpenAICompatibleProvider } from './default.js';
export class OpenRouterOpenAICompatibleProvider extends DefaultOpenAICompatibleProvider {
    static isOpenRouterProvider(contentGeneratorConfig) {
        const baseURL = contentGeneratorConfig.baseUrl || '';
        return baseURL.includes('openrouter.ai');
    }
    buildHeaders() {
        // Get base headers from parent class
        const baseHeaders = super.buildHeaders();
        // Add OpenRouter-specific headers
        return {
            ...baseHeaders,
            'HTTP-Referer': 'https://github.com/oewortex/aether-cli.git',
            'X-OpenRouter-Title': 'Aether'
        };
    }
}
//# sourceMappingURL=openrouter.js.map
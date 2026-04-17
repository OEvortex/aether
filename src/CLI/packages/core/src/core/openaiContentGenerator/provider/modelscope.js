import { DefaultOpenAICompatibleProvider } from './default.js';
/**
 * Provider for ModelScope API
 */
export class ModelScopeOpenAICompatibleProvider extends DefaultOpenAICompatibleProvider {
    /**
     * Checks if the configuration is for ModelScope.
     */
    static isModelScopeProvider(config) {
        return !!config.baseUrl?.includes('modelscope');
    }
    /**
     * ModelScope does not support `stream_options` when `stream` is false.
     * This method removes `stream_options` if `stream` is not true.
     */
    buildRequest(request, userPromptId) {
        const newRequest = super.buildRequest(request, userPromptId);
        if (!newRequest.stream) {
            delete newRequest.stream_options;
        }
        return newRequest;
    }
}
//# sourceMappingURL=modelscope.js.map
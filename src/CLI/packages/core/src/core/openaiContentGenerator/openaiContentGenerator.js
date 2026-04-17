import { createDebugLogger } from '../../utils/debugLogger.js';
import { isAbortError } from '../../utils/errors.js';
import { RequestTokenEstimator } from '../../utils/request-tokenizer/index.js';
import { EnhancedErrorHandler } from './errorHandler.js';
import { ContentGenerationPipeline } from './pipeline.js';
const debugLogger = createDebugLogger('OPENAI');
export class OpenAIContentGenerator {
    pipeline;
    constructor(contentGeneratorConfig, cliConfig, provider) {
        // Create pipeline configuration
        const pipelineConfig = {
            cliConfig,
            provider,
            contentGeneratorConfig,
            errorHandler: new EnhancedErrorHandler((error, request) => this.shouldSuppressErrorLogging(error, request))
        };
        this.pipeline = new ContentGenerationPipeline(pipelineConfig);
    }
    /**
     * Hook for subclasses to customize error handling behavior
     * @param error The error that occurred
     * @param request The original request
     * @returns true if error logging should be suppressed, false otherwise
     */
    shouldSuppressErrorLogging(error, request) {
        // Only suppress error logging for user-initiated cancellations.
        // We check that BOTH:
        // 1. The error is an AbortError
        // 2. AND our abort signal was explicitly aborted (user-initiated)
        //
        // This ensures we don't suppress network-related abort errors that
        // the user should be aware of.
        if (isAbortError(error) && request.config?.abortSignal?.aborted) {
            return true;
        }
        return false;
    }
    async generateContent(request, userPromptId) {
        return this.pipeline.execute(request, userPromptId);
    }
    async generateContentStream(request, userPromptId) {
        return this.pipeline.executeStream(request, userPromptId);
    }
    async countTokens(request) {
        try {
            // Use the request token estimator (character-based).
            const estimator = new RequestTokenEstimator();
            const result = await estimator.calculateTokens(request);
            return {
                totalTokens: result.totalTokens
            };
        }
        catch (error) {
            debugLogger.warn('Failed to calculate tokens with new tokenizer, falling back to simple method:', error);
            // Fallback to original simple method
            const content = JSON.stringify(request.contents);
            const totalTokens = Math.ceil(content.length / 4); // Rough estimate: 1 token ≈ 4 characters
            return {
                totalTokens
            };
        }
    }
    async embedContent(request) {
        // Extract text from contents
        let text = '';
        if (Array.isArray(request.contents)) {
            text = request.contents
                .map((content) => {
                if (typeof content === 'string') {
                    return content;
                }
                if ('parts' in content && content.parts) {
                    return content.parts
                        .map((part) => typeof part === 'string'
                        ? part
                        : 'text' in part
                            ? part.text || ''
                            : '')
                        .join(' ');
                }
                return '';
            })
                .join(' ');
        }
        else if (request.contents) {
            if (typeof request.contents === 'string') {
                text = request.contents;
            }
            else if ('parts' in request.contents && request.contents.parts) {
                text = request.contents.parts
                    .map((part) => typeof part === 'string'
                    ? part
                    : 'text' in part
                        ? part.text
                        : '')
                    .join(' ');
            }
        }
        try {
            const embedding = await this.pipeline.client.embeddings.create({
                model: 'text-embedding-ada-002', // Default embedding model
                input: text
            });
            return {
                embeddings: [
                    {
                        values: embedding.data[0].embedding
                    }
                ]
            };
        }
        catch (error) {
            debugLogger.error('OpenAI API Embedding Error:', error);
            throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    useSummarizedThinking() {
        return false;
    }
}
//# sourceMappingURL=openaiContentGenerator.js.map
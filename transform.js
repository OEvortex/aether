const fs = require('node:fs');
let c = fs.readFileSync('src/providers/gemini/provider.ts', 'utf8');
const t = `const tryAccountRequest = async (account: Account, accountAccessToken?: string) => {
                if (!accountAccessToken) {
                    const creds = (await accountManager.getCredentials(account.id)) as AccountCredentials | undefined;
                    if (!creds) { return { success: false, reason: 'no-creds' }; }
                    if ('accessToken' in creds) { accountAccessToken = (creds as OAuthCredentials).accessToken;
                    } else if ('apiKey' in creds) { accountAccessToken = (creds as ApiKeyCredentials).apiKey; }
                    if (!accountAccessToken) { return { success: false, reason: 'no-token' }; }
                }
                const geminiRequest = { model: model.id, messages: messages, generationConfig: { temperature: modelConfig.generationConfig?.temperature ?? 0.7, maxOutputTokens: modelConfig.maxOutputTokens, topP: modelConfig.generationConfig?.topP ?? 0.95, topK: modelConfig.generationConfig?.topK ?? 40 }, thinkingConfig: modelConfig.thinkingConfig, tools: modelConfig.tools };
                try {
                    if (options.stream) {
                        for await (const chunk of this.geminiHandler.streamGenerateContent(geminiRequest, accountAccessToken, token)) {
                            this.processGeminiChunk(chunk, thinkingParser, wrappedProgress, hideThinkingInUI, currentThinkingId);
                        }
                    } else {
                        const response = await this.geminiHandler.generateContent(geminiRequest, accountAccessToken, token);
                        this.processGeminiResponse(response, thinkingParser, wrappedProgress, hideThinkingInUI, currentThinkingId);
                    }
                    return { success: true };
                } catch (err) {
                    return { success: false, error: err };
                }
            };`;
const start = c.indexOf('const tryAccountRequest = async (');
if (start > 0) {
    let br = 0,
        f = false,
        end = start;
    for (let i = start; i < c.length; i++) {
        if (c[i] === '{') {
            br++;
            f = true;
        } else if (c[i] === '}') {
            br--;
        }
        if (
            f &&
            br === 0 &&
            c[i + 1] === ';' &&
            (c[i + 2] === '\n' || c[i + 2] === ' ')
        ) {
            end = i + 2;
            break;
        }
    }
    c = c.slice(0, start) + t + c.slice(end);
    console.log('Replaced tryAccountRequest');
}
const m = c.indexOf('private buildGeminiModelConfig');
const meth = `    private processGeminiChunk(chunk: any, thinkingParser: ThinkingBlockParser, progress: Progress<vscode.LanguageModelResponsePart2>, hideThinkingInUI: boolean, currentThinkingId: string | null) {
        if (chunk.content) {
            const { regular, thinking } = thinkingParser.parse(chunk.content);
            if (thinking && !hideThinkingInUI) {
                if (!currentThinkingId) { currentThinkingId = 'gemini_thinking_' + Date.now(); }
                progress.report(new vscode.LanguageModelThinkingPart(thinking, currentThinkingId));
            }
            if (regular && regular.length > 0) {
                if (currentThinkingId) { progress.report(new vscode.LanguageModelThinkingPart('', currentThinkingId)); currentThinkingId = null; }
                progress.report(new vscode.LanguageModelTextPart(regular));
            }
        }
        if (chunk.toolCalls) {
            for (const tc of chunk.toolCalls) {
                const callId = 'gemini_call_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                if (currentThinkingId) { progress.report(new vscode.LanguageModelThinkingPart('', currentThinkingId)); currentThinkingId = null; }
                progress.report(new vscode.LanguageModelToolCallPart(callId, tc.function.name, tc.function.arguments));
            }
        }
    }
    private processGeminiResponse(response: any, thinkingParser: ThinkingBlockParser, progress: Progress<vscode.LanguageModelResponsePart2>, hideThinkingInUI: boolean, currentThinkingId: string | null) {
        if (response.content) {
            const { regular, thinking } = thinkingParser.parse(response.content);
            if (thinking && !hideThinkingInUI) {
                if (!currentThinkingId) { currentThinkingId = 'gemini_thinking_' + Date.now(); }
                progress.report(new vscode.LanguageModelThinkingPart(thinking, currentThinkingId));
            }
            if (regular && regular.length > 0) {
                if (currentThinkingId) { progress.report(new vscode.LanguageModelThinkingPart('', currentThinkingId)); currentThinkingId = null; }
                progress.report(new vscode.LanguageModelTextPart(regular));
            }
        }
        if (response.toolCalls) {
            for (const tc of response.toolCalls) {
                const callId = 'gemini_call_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                if (currentThinkingId) { progress.report(new vscode.LanguageModelThinkingPart('', currentThinkingId)); currentThinkingId = null; }
                progress.report(new vscode.LanguageModelToolCallPart(callId, tc.function.name, tc.function.arguments));
            }
        }
    }`;
if (m > 0) {
    c = c.slice(0, m) + meth + c.slice(m);
    console.log('Added handler methods');
}
fs.writeFileSync('src/providers/gemini/provider.ts', c, 'utf8');
console.log('Done');

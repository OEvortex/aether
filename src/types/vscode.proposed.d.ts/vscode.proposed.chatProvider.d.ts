/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// version: 5 - Updated to latest VS Code Language Model API

declare module "vscode" {
    /**
     * The provider version of {@linkcode LanguageModelChatRequestOptions}
     */
    export interface ProvideLanguageModelChatResponseOptions {
        /**
         * What extension initiated the request to the language model
         */
        readonly requestInitiator: string;
    }

    /**
     * All the information representing a single language model contributed by a {@linkcode LanguageModelChatProvider}.
     */
    export interface LanguageModelChatInformation {
        /**
         * When present, this gates the use of `requestLanguageModelAccess` behind an authorization flow where
         * the user must approve of another extension accessing the models contributed by this extension.
         * Additionally, the extension can provide a label that will be shown in the UI.
         * A common example of a label is an account name that is signed in.
         */
        readonly requiresAuthorization?: true | { label: string };

        /**
         * Whether or not this will be selected by default in the model picker
         */
        readonly isDefault?: boolean;

        /**
         * Whether or not the model will show up in the model picker immediately upon being made known via
         * {@linkcode LanguageModelChatProvider.provideLanguageModelChatInformation}.
         */
        readonly isUserSelectable?: boolean;

        /**
         * Optional category to group models by in the model picker.
         * The lower the order, the higher the category appears in the list.
         * Has no effect if `isUserSelectable` is `false`.
         */
        readonly category?: { label: string; order: number };

        /**
         * Status icon shown in the model picker.
         */
        readonly statusIcon?: ThemeIcon;

        /**
         * Whether this model has quota tracking enabled.
         */
        readonly hasQuotaTracking?: boolean;
    }

    /**
     * Capabilities supported by a language model for chat interactions.
     */
    export interface LanguageModelChatCapabilities {
        /**
         * The tools the model prefers for making file edits. If not provided or if none of the tools
         * are recognized, the editor will try multiple edit tools and pick the best one.
         *
         * Edit tools currently recognized include:
         * - 'find-replace': Find and replace text in a document.
         * - 'multi-find-replace': Find and replace text in a document.
         * - 'apply-patch': A file-oriented diff format used by some OpenAI models
         * - 'code-rewrite': A general but slower editing tool that allows the model
         *   to rewrite a code snippet and provide only the replacement to the editor.
         *
         * The order of edit tools in this array has no significance; all of the recognized edit
         * tools will be made available to the model.
         */
        readonly editTools?: readonly string[];

        /**
         * Whether the model supports tool calling.
         * If a number is provided, that is the maximum number of tools that can be provided in a request.
         */
        readonly toolCalling?: number | boolean;

        /**
         * Whether the model supports image input (multimodal).
         */
        readonly imageInput?: boolean;
    }

    /**
     * Extended response parts including thinking and data parts.
     */
    export type LanguageModelResponsePart2 =
        | LanguageModelResponsePart
        | LanguageModelDataPart
        | LanguageModelThinkingPart;

    /**
     * A message in a chat request sent to a language model.
     * This is the provider-side version of messages.
     */
    export interface LanguageModelChatRequestMessage {
        /**
         * The role of the message sender.
         */
        readonly role: LanguageModelChatMessageRole;

        /**
         * The content of the message.
         */
        readonly content: string | readonly LanguageModelInputPart[];
    }

    /**
     * Input parts that can be included in a chat message.
     */
    export type LanguageModelInputPart =
        | LanguageModelTextPart
        | LanguageModelToolCallPart
        | LanguageModelToolResultPart
        | LanguageModelDataPart
        | LanguageModelThinkingPart;

    /**
     * A tool that can be invoked by a call to a {@link LanguageModelChat}.
     */
    export interface LanguageModelTool<T> {
        /**
         * Invoke the tool with the given input and return a result.
         * The provided {@link LanguageModelToolInvocationOptions.input} has been validated against the declared schema.
         */
        invoke(
            options: LanguageModelToolInvocationOptions<T>,
            token: CancellationToken,
        ): ProviderResult<LanguageModelToolResult>;

        /**
         * Called once before a tool is invoked. It's recommended to implement this to customize
         * the progress message that appears while the tool is running, and to provide a more
         * useful message with context from the invocation input. Can also signal that a tool
         * needs user confirmation before running.
         *
         * Note: Must be free of side-effects.
         * Note: A call to prepareInvocation is not necessarily followed by a call to invoke.
         */
        prepareInvocation?(
            options: LanguageModelToolInvocationPrepareOptions<T>,
            token: CancellationToken,
        ): ProviderResult<PreparedToolInvocation>;
    }

    /**
     * A result returned from a tool invocation.
     */
    export class LanguageModelToolResult {
        /**
         * A list of tool result content parts. Includes `unknown` because this list may be
         * extended with new content types in the future.
         */
        content: unknown[];

        /**
         * Create a LanguageModelToolResult
         * @param content A list of tool result content parts
         */
        constructor(content: unknown[]);
    }

    /**
     * Options provided for tool invocation.
     */
    export interface LanguageModelToolInvocationOptions<T> {
        /**
         * The input with which to invoke the tool. The input must match the schema defined in
         * {@link LanguageModelToolInformation.inputSchema}.
         */
        readonly input: T;

        /**
         * Options to hint at how many tokens the tool should return in its response,
         * and enable the tool to count tokens accurately.
         */
        readonly tokenizationOptions?: LanguageModelToolTokenizationOptions;

        /**
         * An opaque object that ties a tool invocation to a chat request from a chat participant.
         * The only way to get a valid tool invocation token is using the provided toolInvocationToken
         * from a chat request. In that case, a progress bar will be automatically shown for the tool
         * invocation in the chat response view, and if the tool requires user confirmation, it will
         * show up inline in the chat view.
         *
         * If the tool is being invoked outside of a chat request, undefined should be passed instead,
         * and no special UI except for confirmations will be shown.
         *
         * Note that a tool that invokes another tool during its invocation, can pass along the
         * toolInvocationToken that it received.
         */
        readonly toolInvocationToken?: unknown;
    }

    /**
     * Options for LanguageModelTool.prepareInvocation.
     */
    export interface LanguageModelToolInvocationPrepareOptions<T> {
        /**
         * The input that the tool is being invoked with.
         */
        readonly input: T;
    }

    /**
     * Result from prepareInvocation that can signal user confirmation is needed.
     */
    export interface PreparedToolInvocation {
        /**
         * If present, the user will be asked to confirm before running the tool.
         */
        readonly confirmation?: LanguageModelToolConfirmationMessages;
    }

    /**
     * Messages shown to the user when confirmation is needed for tool execution.
     */
    export interface LanguageModelToolConfirmationMessages {
        /**
         * The title of the confirmation message.
         */
        readonly title: string;
        /**
         * The body of the confirmation message.
         */
        readonly message: string | MarkdownString;
    }

    /**
     * Options related to tokenization for a tool invocation.
     */
    export interface LanguageModelToolTokenizationOptions {
        /**
         * If known, the maximum number of tokens the tool should emit in its result.
         */
        readonly tokenBudget?: number;

        /**
         * Count the number of tokens in a message using the model specific tokenizer-logic.
         */
        countTokens(text: string, token?: CancellationToken): Thenable<number>;
    }

    /**
     * The LanguageModelChatProvider interface for providing language models to VS Code.
     * Extensions implement this to contribute language models that can be used by other extensions
     * and the built-in chat participant.
     */
    export interface LanguageModelChatProvider<
        T extends LanguageModelChatInformation = LanguageModelChatInformation,
    > {
        /**
         * Returns the response for a chat request, passing the results to the progress callback.
         * The LanguageModelChatProvider must emit the response parts to the progress callback as
         * they are received from the language model.
         *
         * @param model The language model to use
         * @param messages The messages to include in the request
         * @param options Options for the request
         * @param progress Progress callback for streaming response parts
         * @param token Cancellation token
         */
        provideLanguageModelChatResponse(
            model: T,
            messages: readonly LanguageModelChatRequestMessage[],
            options: ProvideLanguageModelChatResponseOptions,
            progress: Progress<LanguageModelResponsePart2>,
            token: CancellationToken,
        ): Thenable<void>;

        /**
         * Get the list of available language models provided by this provider.
         *
         * @param options Options which specify the calling context of this function
         * @param token A cancellation token
         * @returns The list of available language models
         */
        provideLanguageModelChatInformation(
            options: { silent: boolean },
            token: CancellationToken,
        ): ProviderResult<T[]>;

        /**
         * Optional event fired when the available set of language models changes.
         */
        onDidChangeLanguageModelChatInformation?: Event<void>;

        /**
         * Optional method to count tokens for a given model and text.
         *
         * @param model The language model
         * @param text The text or message to count tokens for
         * @param token A cancellation token
         * @returns The number of tokens
         */
        provideTokenCount?(
            model: T,
            text: string | LanguageModelChatMessage | LanguageModelChatMessage2,
            token: CancellationToken,
        ): Thenable<number>;
    }

    /**
     * Information about a registered tool available in lm.tools.
     */
    export interface LanguageModelToolInformation {
        /**
         * A unique name for the tool.
         */
        readonly name: string;

        /**
         * A description of this tool that may be passed to a language model.
         */
        readonly description: string;

        /**
         * A JSON schema for the input this tool accepts.
         */
        readonly inputSchema: object;

        /**
         * A set of tags, declared by the tool, that roughly describe the tool's capabilities.
         * A tool user may use these to filter the set of tools to just ones that are relevant
         * for the task at hand.
         */
        readonly tags?: readonly string[];
    }

    // Re-export the new LanguageModelChatMessage2 if not already defined
    export class LanguageModelChatMessage2 {
        static User(
            content:
                | string
                | Array<
                      | LanguageModelTextPart
                      | LanguageModelToolResultPart2
                      | LanguageModelDataPart
                  >,
            name?: string,
        ): LanguageModelChatMessage2;

        static Assistant(
            content:
                | string
                | Array<
                      | LanguageModelTextPart
                      | LanguageModelToolCallPart
                      | LanguageModelDataPart
                  >,
            name?: string,
        ): LanguageModelChatMessage2;

        role: LanguageModelChatMessageRole;
        content: Array<
            | LanguageModelTextPart
            | LanguageModelToolResultPart2
            | LanguageModelToolCallPart
            | LanguageModelDataPart
            | LanguageModelThinkingPart
        >;
        name: string | undefined;

        constructor(
            role: LanguageModelChatMessageRole,
            content:
                | string
                | Array<
                      | LanguageModelTextPart
                      | LanguageModelToolResultPart2
                      | LanguageModelToolCallPart
                      | LanguageModelDataPart
                      | LanguageModelThinkingPart
                  >,
            name?: string,
        );
    }

    /**
     * The result of a tool call. This is the counterpart of a {@link LanguageModelToolCallPart tool call}
     * and it can only be included in the content of a User message.
     */
    export class LanguageModelToolResultPart2 {
        callId: string;
        content: Array<
            | LanguageModelTextPart
            | LanguageModelPromptTsxPart
            | LanguageModelDataPart
            | unknown
        >;

        constructor(
            callId: string,
            content: Array<
                | LanguageModelTextPart
                | LanguageModelPromptTsxPart
                | LanguageModelDataPart
                | unknown
            >,
        );
    }
}
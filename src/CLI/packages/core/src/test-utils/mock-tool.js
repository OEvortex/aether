/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from '../tools/tools.js';
class MockToolInvocation extends BaseToolInvocation {
    tool;
    constructor(tool, params) {
        super(params);
        this.tool = tool;
    }
    execute(signal, updateOutput) {
        if (updateOutput) {
            return this.tool.execute(this.params, signal, updateOutput);
        }
        else {
            return this.tool.execute(this.params);
        }
    }
    getDefaultPermission() {
        return this.tool.getDefaultPermission();
    }
    getConfirmationDetails(abortSignal) {
        return this.tool.getConfirmationDetails(abortSignal);
    }
    getDescription() {
        return `A mock tool invocation for ${this.tool.name}`;
    }
}
/**
 * A highly configurable mock tool for testing purposes.
 */
export class MockTool extends BaseDeclarativeTool {
    getDefaultPermission;
    getConfirmationDetails;
    execute;
    constructor(options) {
        super(options.name, options.displayName ?? options.name, options.description ?? options.name, Kind.Other, options.params, options.isOutputMarkdown ?? false, options.canUpdateOutput ?? false);
        if (options.getDefaultPermission) {
            this.getDefaultPermission = options.getDefaultPermission;
        }
        else {
            this.getDefaultPermission = () => Promise.resolve('allow');
        }
        if (options.getConfirmationDetails) {
            this.getConfirmationDetails = options.getConfirmationDetails;
        }
        else {
            this.getConfirmationDetails = () => {
                throw new Error(`${this.name} returned 'ask' from getDefaultPermission() ` +
                    `but does not implement getConfirmationDetails().`);
            };
        }
        if (options.execute) {
            this.execute = options.execute;
        }
        else {
            this.execute = () => Promise.resolve({
                llmContent: `Tool ${this.name} executed successfully.`,
                returnDisplay: `Tool ${this.name} executed successfully.`
            });
        }
    }
    createInvocation(params) {
        return new MockToolInvocation(this, params);
    }
}
export const MOCK_TOOL_GET_DEFAULT_PERMISSION = () => Promise.resolve('ask');
export const MOCK_TOOL_GET_CONFIRMATION_DETAILS = () => Promise.resolve({
    type: 'exec',
    title: 'Confirm mockTool',
    command: 'mockTool',
    rootCommand: 'mockTool',
    onConfirm: async () => { }
});
export class MockModifiableToolInvocation extends BaseToolInvocation {
    tool;
    constructor(tool, params) {
        super(params);
        this.tool = tool;
    }
    async execute(_abortSignal) {
        const result = this.tool.executeFn(this.params);
        return (result ?? {
            llmContent: `Tool ${this.tool.name} executed successfully.`,
            returnDisplay: `Tool ${this.tool.name} executed successfully.`
        });
    }
    async getDefaultPermission() {
        return this.tool.shouldConfirm ? 'ask' : 'allow';
    }
    async getConfirmationDetails(_abortSignal) {
        return {
            type: 'edit',
            title: 'Confirm Mock Tool',
            fileName: 'test.txt',
            filePath: 'test.txt',
            fileDiff: 'diff',
            originalContent: 'originalContent',
            newContent: 'newContent',
            onConfirm: async () => { }
        };
    }
    getDescription() {
        return `A mock modifiable tool invocation for ${this.tool.name}`;
    }
}
/**
 * Configurable mock modifiable tool for testing.
 */
export class MockModifiableTool extends BaseDeclarativeTool {
    // Should be overrided in test file. Functionality will be updated in follow
    // up PR which has MockModifiableTool expect MockTool
    executeFn = () => undefined;
    shouldConfirm = true;
    constructor(name = 'mockModifiableTool') {
        super(name, name, 'A mock modifiable tool for testing.', Kind.Other, {
            type: 'object',
            properties: { param: { type: 'string' } }
        });
    }
    getModifyContext(_abortSignal) {
        return {
            getFilePath: () => 'test.txt',
            getCurrentContent: async () => 'old content',
            getProposedContent: async () => 'new content',
            createUpdatedParams: (_oldContent, modifiedProposedContent, _originalParams) => ({ newContent: modifiedProposedContent })
        };
    }
    createInvocation(params) {
        return new MockModifiableToolInvocation(this, params);
    }
}
//# sourceMappingURL=mock-tool.js.map
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';
import { trustCommand } from './trustCommand.js';
import { type CommandContext, CommandKind } from './types.js';

describe('trustCommand', () => {
    let mockContext: CommandContext;

    beforeEach(() => {
        mockContext = createMockCommandContext();
    });

    it('should have the correct name and description', () => {
        expect(trustCommand.name).toBe('trust');
        expect(trustCommand.description).toBe('Manage folder trust settings');
    });

    it('should be a built-in command', () => {
        expect(trustCommand.kind).toBe(CommandKind.BUILT_IN);
    });

    it('should return an action to open the trust dialog', () => {
        const actionResult = trustCommand.action?.(mockContext, '');
        expect(actionResult).toEqual({
            type: 'dialog',
            dialog: 'trust'
        });
    });
});

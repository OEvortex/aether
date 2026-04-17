/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';
import { permissionsCommand } from './permissionsCommand.js';
import { type CommandContext, CommandKind } from './types.js';

describe('permissionsCommand', () => {
    let mockContext: CommandContext;

    beforeEach(() => {
        mockContext = createMockCommandContext();
    });

    it('should have the correct name and description', () => {
        expect(permissionsCommand.name).toBe('permissions');
        expect(permissionsCommand.description).toBe('Manage permission rules');
    });

    it('should be a built-in command', () => {
        expect(permissionsCommand.kind).toBe(CommandKind.BUILT_IN);
    });

    it('should return an action to open the permissions dialog', () => {
        const actionResult = permissionsCommand.action?.(mockContext, '');
        expect(actionResult).toEqual({
            type: 'dialog',
            dialog: 'permissions'
        });
    });
});

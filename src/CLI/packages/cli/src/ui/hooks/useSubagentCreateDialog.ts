/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState } from 'react';

export function useSubagentCreateDialog() {
    const [isSubagentCreateDialogOpen, setIsSubagentCreateDialogOpen] =
        useState(false);

    const openSubagentCreateDialog = useCallback(() => {
        setIsSubagentCreateDialogOpen(true);
    }, []);

    const closeSubagentCreateDialog = useCallback(() => {
        setIsSubagentCreateDialogOpen(false);
    }, []);

    return {
        isSubagentCreateDialogOpen,
        openSubagentCreateDialog,
        closeSubagentCreateDialog
    };
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as process from 'node:process';
import { useCallback, useEffect, useState } from 'react';
import type { LoadedSettings } from '../../config/settings.js';
import {
    isWorkspaceTrusted,
    loadTrustedFolders,
    TrustLevel
} from '../../config/trustedFolders.js';
import { FolderTrustChoice } from '../components/FolderTrustDialog.js';

export const useFolderTrust = (
    settings: LoadedSettings,
    onTrustChange: (isTrusted: boolean | undefined) => void
) => {
    const [isTrusted, setIsTrusted] = useState<boolean | undefined>(undefined);
    const [isFolderTrustDialogOpen, setIsFolderTrustDialogOpen] =
        useState(false);
    const [isRestarting, setIsRestarting] = useState(false);

    useEffect(() => {
        const { isTrusted: trusted } = isWorkspaceTrusted(settings.merged);
        setIsTrusted(trusted);
        setIsFolderTrustDialogOpen(trusted === undefined);
        onTrustChange(trusted);
    }, [onTrustChange, settings.merged]);

    const handleFolderTrustSelect = useCallback(
        (choice: FolderTrustChoice) => {
            const trustedFolders = loadTrustedFolders();
            const cwd = process.cwd();
            let trustLevel: TrustLevel;

            const wasTrusted = isTrusted ?? true;

            switch (choice) {
                case FolderTrustChoice.TRUST_FOLDER:
                    trustLevel = TrustLevel.TRUST_FOLDER;
                    break;
                case FolderTrustChoice.TRUST_PARENT:
                    trustLevel = TrustLevel.TRUST_PARENT;
                    break;
                case FolderTrustChoice.DO_NOT_TRUST:
                    trustLevel = TrustLevel.DO_NOT_TRUST;
                    break;
                default:
                    return;
            }

            trustedFolders.setValue(cwd, trustLevel);
            const currentIsTrusted =
                trustLevel === TrustLevel.TRUST_FOLDER ||
                trustLevel === TrustLevel.TRUST_PARENT;
            setIsTrusted(currentIsTrusted);
            onTrustChange(currentIsTrusted);

            const needsRestart = wasTrusted !== currentIsTrusted;
            if (needsRestart) {
                setIsRestarting(true);
                setIsFolderTrustDialogOpen(true);
            } else {
                setIsFolderTrustDialogOpen(false);
            }
        },
        [onTrustChange, isTrusted]
    );

    return {
        isTrusted,
        isFolderTrustDialogOpen,
        handleFolderTrustSelect,
        isRestarting
    };
};

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useIsScreenReaderEnabled } from 'ink';
import { QuittingDisplay } from './components/QuittingDisplay.js';
import { StreamingContext } from './contexts/StreamingContext.js';
import { useUIState } from './contexts/UIStateContext.js';
import { DefaultAppLayout } from './layouts/DefaultAppLayout.js';
import { ScreenReaderAppLayout } from './layouts/ScreenReaderAppLayout.js';

export const App = () => {
    const uiState = useUIState();
    const isScreenReaderEnabled = useIsScreenReaderEnabled();

    if (uiState.quittingMessages) {
        return <QuittingDisplay />;
    }

    return (
        <StreamingContext.Provider value={uiState.streamingState}>
            {isScreenReaderEnabled ? (
                <ScreenReaderAppLayout />
            ) : (
                <DefaultAppLayout />
            )}
        </StreamingContext.Provider>
    );
};

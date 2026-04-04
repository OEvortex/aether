// Global type declarations

// MACRO is injected at build time via --define
declare const MACRO: {
    VERSION: string;
    DISPLAY_VERSION?: string;
    BUILD_TIME: string;
    ISSUES_EXPLAINER: string;
    PACKAGE_URL: string;
    NATIVE_PACKAGE_URL?: string;
    FEEDBACK_CHANNEL?: string;
    VERSION_CHANGELOG?: string;
};

// Ink JSX namespace
declare namespace JSX {
    interface IntrinsicElements {
        'ink-box': Record<string, unknown>;
        'ink-text': Record<string, unknown>;
        'ink-root': Record<string, unknown>;
        'ink-virtual-text': Record<string, unknown>;
    }
}

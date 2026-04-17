/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Opens a URL in the default browser using platform-specific commands.
 * This implementation avoids shell injection vulnerabilities by:
 * 1. Validating the URL to ensure it's HTTP/HTTPS only
 * 2. Using execFile instead of exec to avoid shell interpretation
 * 3. Passing the URL as an argument rather than constructing a command string
 *
 * @param url The URL to open
 * @throws Error if the URL is invalid or if opening the browser fails
 */
export declare function openBrowserSecurely(url: string): Promise<void>;
/**
 * Checks if the current environment should attempt to launch a browser.
 * This is the same logic as in browser.ts for consistency.
 *
 * @returns True if the tool should attempt to launch a browser
 */
export declare function shouldLaunchBrowser(): boolean;

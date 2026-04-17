/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Normalizes a proxy URL to ensure it has a valid protocol prefix.
 *
 * Many proxy tools and environment variables provide proxy addresses without
 * a protocol prefix (e.g., "127.0.0.1:7860" instead of "http://127.0.0.1:7860").
 * This function adds the "http://" prefix if missing, since HTTP proxies are
 * the most common default.
 *
 * Note: Only HTTP and HTTPS proxies are supported. SOCKS proxies (socks://,
 * socks4://, socks5://) are NOT supported because the underlying undici library
 * does not support them. See: https://github.com/nodejs/undici/issues/2224
 *
 * @param proxyUrl - The proxy URL to normalize
 * @returns The normalized proxy URL with protocol prefix, or undefined if input is undefined/empty
 * @throws Error if a SOCKS proxy URL is provided
 */
export declare function normalizeProxyUrl(proxyUrl: string | undefined): string | undefined;

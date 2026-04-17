/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Supported image MIME types for vision models
 * These formats are supported by the vision model and can be processed by the image tokenizer
 */
export declare const SUPPORTED_IMAGE_MIME_TYPES: readonly ["image/bmp", "image/jpeg", "image/jpg", "image/png", "image/tiff", "image/webp", "image/heic"];
/**
 * Type for supported image MIME types
 */
export type SupportedImageMimeType = (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];
/**
 * Check if a MIME type is supported for vision processing
 * @param mimeType The MIME type to check
 * @returns True if the MIME type is supported
 */
export declare function isSupportedImageMimeType(mimeType: string): mimeType is SupportedImageMimeType;
/**
 * Get a human-readable list of supported image formats
 * @returns Comma-separated string of supported formats
 */
export declare function getSupportedImageFormatsString(): string;
/**
 * Get warning message for unsupported image formats
 * @returns Warning message string
 */
export declare function getUnsupportedImageFormatWarning(): string;

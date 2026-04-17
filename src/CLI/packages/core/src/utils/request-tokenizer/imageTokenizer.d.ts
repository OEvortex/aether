/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ImageMetadata } from './types.js';
/**
 * Image tokenizer for calculating image tokens based on dimensions
 *
 * Key rules:
 * - 28x28 pixels = 1 token
 * - Minimum: 4 tokens per image
 * - Maximum: 16384 tokens per image
 * - Additional: 2 special tokens (vision_bos + vision_eos)
 * - Supports: PNG, JPEG, WebP, GIF, BMP, TIFF, HEIC formats
 */
export declare class ImageTokenizer {
    /** 28x28 pixels = 1 token */
    private static readonly PIXELS_PER_TOKEN;
    /** Minimum tokens per image */
    private static readonly MIN_TOKENS_PER_IMAGE;
    /** Maximum tokens per image */
    private static readonly MAX_TOKENS_PER_IMAGE;
    /** Special tokens for vision markers */
    private static readonly VISION_SPECIAL_TOKENS;
    /**
     * Extract image metadata from base64 data
     *
     * @param base64Data Base64-encoded image data (with or without data URL prefix)
     * @param mimeType MIME type of the image
     * @returns Promise resolving to ImageMetadata with dimensions and format info
     */
    extractImageMetadata(base64Data: string, mimeType: string): Promise<ImageMetadata>;
    /**
     * Extract image dimensions from buffer based on format
     *
     * @param buffer Binary image data buffer
     * @param mimeType MIME type to determine parsing strategy
     * @returns Promise resolving to width and height dimensions
     */
    private extractDimensions;
    /**
     * Extract PNG dimensions from IHDR chunk
     * PNG signature: 89 50 4E 47 0D 0A 1A 0A
     * Width/height at bytes 16-19 and 20-23 (big-endian)
     */
    private extractPngDimensions;
    /**
     * Extract JPEG dimensions from SOF (Start of Frame) markers
     * JPEG starts with FF D8, SOF markers: 0xC0-0xC3, 0xC5-0xC7, 0xC9-0xCB, 0xCD-0xCF
     * Dimensions at offset +5 (height) and +7 (width) from SOF marker
     */
    private extractJpegDimensions;
    /**
     * Extract WebP dimensions from RIFF container
     * Supports VP8, VP8L, and VP8X formats
     */
    private extractWebpDimensions;
    /**
     * Extract GIF dimensions from header
     * Supports GIF87a and GIF89a formats
     */
    private extractGifDimensions;
    /**
     * Calculate tokens for an image based on its metadata
     *
     * @param metadata Image metadata containing width, height, and format info
     * @returns Total token count including base image tokens and special tokens
     */
    calculateTokens(metadata: ImageMetadata): number;
    /**
     * Calculate tokens with scaling logic
     *
     * Steps:
     * 1. Normalize to 28-pixel multiples
     * 2. Scale large images down, small images up
     * 3. Calculate tokens: pixels / 784 + 2 special tokens
     *
     * @param width Original image width in pixels
     * @param height Original image height in pixels
     * @returns Total token count for the image
     */
    private calculateTokensWithScaling;
    /**
     * Calculate tokens for multiple images serially
     *
     * @param base64DataArray Array of image data with MIME type information
     * @returns Promise resolving to array of token counts in same order as input
     */
    calculateTokensBatch(base64DataArray: Array<{
        data: string;
        mimeType: string;
    }>): Promise<number[]>;
    /**
     * Extract BMP dimensions from header
     * BMP signature: 42 4D (BM)
     * Width/height at bytes 18-21 and 22-25 (little-endian)
     */
    private extractBmpDimensions;
    /**
     * Extract TIFF dimensions from IFD (Image File Directory)
     * TIFF can be little-endian (II) or big-endian (MM)
     * Width/height are stored in IFD entries with tags 0x0100 and 0x0101
     */
    private extractTiffDimensions;
    /**
     * Extract HEIC dimensions from meta box
     * HEIC is based on ISO Base Media File Format
     * This is a simplified implementation that looks for 'ispe' (Image Spatial Extents) box
     */
    private extractHeicDimensions;
}

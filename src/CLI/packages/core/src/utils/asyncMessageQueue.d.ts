/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Generic non-blocking message queue.
 *
 * Simple FIFO queue for producer/consumer patterns. Dequeue is
 * non-blocking — returns null when empty. The consumer decides
 * when and how to process items.
 */
/**
 * A generic non-blocking message queue.
 *
 * - `enqueue(item)` adds an item. Silently dropped after `drain()`.
 * - `dequeue()` returns the next item, or `null` if empty.
 * - `drain()` signals that no more items will be enqueued.
 */
export declare class AsyncMessageQueue<T> {
    private items;
    private drained;
    /** Add an item to the queue. Dropped silently after drain. */
    enqueue(item: T): void;
    /** Remove and return the next item, or null if empty. */
    dequeue(): T | null;
    /** Signal that no more items will be enqueued. */
    drain(): void;
    /** Number of items currently in the queue. */
    get size(): number;
    /** Whether `drain()` has been called. */
    get isDrained(): boolean;
}

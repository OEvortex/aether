/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { IdeContext } from './types.js';
type IdeContextSubscriber = (ideContext?: IdeContext) => void;
export declare class IdeContextStore {
    private ideContextState?;
    private readonly subscribers;
    /**
     * Notifies all registered subscribers about the current IDE context.
     */
    private notifySubscribers;
    /**
     * Sets the IDE context and notifies all registered subscribers of the change.
     * @param newIdeContext The new IDE context from the IDE.
     */
    set(newIdeContext: IdeContext): void;
    /**
     * Clears the IDE context and notifies all registered subscribers of the change.
     */
    clear(): void;
    /**
     * Retrieves the current IDE context.
     * @returns The `IdeContext` object if a file is active; otherwise, `undefined`.
     */
    get(): IdeContext | undefined;
    /**
     * Subscribes to changes in the IDE context.
     *
     * When the IDE context changes, the provided `subscriber` function will be called.
     * Note: The subscriber is not called with the current value upon subscription.
     *
     * @param subscriber The function to be called when the IDE context changes.
     * @returns A function that, when called, will unsubscribe the provided subscriber.
     */
    subscribe(subscriber: IdeContextSubscriber): () => void;
}
/**
 * The default, shared instance of the IDE context store for the application.
 */
export declare const ideContextStore: IdeContextStore;
export {};

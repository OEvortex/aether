/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface ProjectSummaryInfo {
    hasHistory: boolean;
    content?: string;
    timestamp?: string;
    timeAgo?: string;
    goalContent?: string;
    planContent?: string;
    totalTasks?: number;
    doneCount?: number;
    inProgressCount?: number;
    todoCount?: number;
    pendingTasks?: string[];
}
/**
 * Reads and parses the project summary file to extract structured information
 */
export declare function getProjectSummaryInfo(): Promise<ProjectSummaryInfo>;

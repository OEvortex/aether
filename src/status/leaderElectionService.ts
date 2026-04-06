import * as crypto from 'node:crypto';
import type * as vscode from 'vscode';
import { StatusLogger } from '../utils/statusLogger.js';
import { UserActivityService } from './userActivityService.js';

interface LeaderInfo {
    instanceId: string;
    lastHeartbeat: number;
    electedAt: number;
}

/**
 * Master instance election service (pure static class)
 * Ensure that only one master instance is responsible for executing periodic tasks
 */
export class LeaderElectionService {
    private static readonly LEADER_KEY = 'aether.leader.info';
    private static readonly HEARTBEAT_INTERVAL = 5000;
    private static readonly LEADER_TIMEOUT = 15000;
    private static readonly TASK_INTERVAL = 60 * 1000;

    private static instanceId: string;
    private static context: vscode.ExtensionContext | undefined;
    private static heartbeatTimer: NodeJS.Timeout | undefined;
    private static taskTimer: NodeJS.Timeout | undefined;
    private static _isLeader = false;
    private static initialized = false;

    private static periodicTasks: Array<() => Promise<void>> = [];

    private constructor() {
        throw new Error(
            'LeaderElectionService is a static class and cannot be instantiated'
        );
    }

    public static initialize(context: vscode.ExtensionContext): void {
        if (LeaderElectionService.initialized) {
            return;
        }

        LeaderElectionService.registerPeriodicTask(async () => {
            StatusLogger.trace(
                '[LeaderElectionService] Master instance periodic task: record survival log'
            );
        });

        LeaderElectionService.instanceId = crypto.randomUUID();
        LeaderElectionService.context = context;
        StatusLogger.info(
            `[LeaderElectionService] Initialize master instance election service, instance ID: ${LeaderElectionService.instanceId}`
        );

        UserActivityService.initialize(
            context,
            LeaderElectionService.instanceId
        );

        const startDelay = Math.random() * 1000;
        setTimeout(() => {
            LeaderElectionService.start();
        }, startDelay);

        LeaderElectionService.initialized = true;
    }

    private static start(): void {
        if (!LeaderElectionService.context) {
            StatusLogger.warn(
                '[LeaderElectionService] Election service not initialized, cannot start'
            );
            return;
        }

        LeaderElectionService.checkLeader();
        LeaderElectionService.heartbeatTimer = setInterval(
            () => LeaderElectionService.checkLeader(),
            LeaderElectionService.HEARTBEAT_INTERVAL
        );

        LeaderElectionService.taskTimer = setInterval(() => {
            if (LeaderElectionService._isLeader) {
                LeaderElectionService.executePeriodicTasks();
            }
        }, LeaderElectionService.TASK_INTERVAL);
    }

    public static stop(): void {
        if (LeaderElectionService.heartbeatTimer) {
            clearInterval(LeaderElectionService.heartbeatTimer);
            LeaderElectionService.heartbeatTimer = undefined;
        }
        if (LeaderElectionService.taskTimer) {
            clearInterval(LeaderElectionService.taskTimer);
            LeaderElectionService.taskTimer = undefined;
        }

        UserActivityService.stop();
        LeaderElectionService.resignLeader();
        LeaderElectionService.initialized = false;
    }

    public static registerPeriodicTask(task: () => Promise<void>): void {
        LeaderElectionService.periodicTasks.push(task);
    }

    public static isLeader(): boolean {
        return LeaderElectionService._isLeader;
    }

    public static getInstanceId(): string {
        return LeaderElectionService.instanceId;
    }

    public static getLeaderId(): string | undefined {
        if (!LeaderElectionService.context) {
            return undefined;
        }
        const leaderInfo =
            LeaderElectionService.context.globalState.get<LeaderInfo>(
                LeaderElectionService.LEADER_KEY
            );
        return leaderInfo?.instanceId;
    }

    private static async checkLeader(): Promise<void> {
        if (!LeaderElectionService.context) {
            return;
        }

        const now = Date.now();
        const leaderInfo =
            LeaderElectionService.context.globalState.get<LeaderInfo>(
                LeaderElectionService.LEADER_KEY
            );
        StatusLogger.trace(
            `[LeaderElectionService] Heartbeat check: leaderInfo=${leaderInfo ? `instanceId=${leaderInfo.instanceId}, lastHeartbeat=${leaderInfo.lastHeartbeat}` : 'null'}`
        );

        if (!leaderInfo) {
            StatusLogger.trace(
                '[LeaderElectionService] No Leader found, attempting election...'
            );
            await LeaderElectionService.becomeLeader();
            return;
        }

        if (leaderInfo.instanceId === LeaderElectionService.instanceId) {
            StatusLogger.trace(
                '[LeaderElectionService] Confirming self as Leader, updating heartbeat'
            );
            await LeaderElectionService.updateHeartbeat();
            if (!LeaderElectionService._isLeader) {
                LeaderElectionService._isLeader = true;
                StatusLogger.info(
                    '[LeaderElectionService] Current instance has become master instance'
                );
            }
        } else {
            StatusLogger.trace(
                `[LeaderElectionService] Detected other Leader: ${leaderInfo.instanceId}`
            );
            if (LeaderElectionService._isLeader) {
                LeaderElectionService._isLeader = false;
                StatusLogger.warn(
                    `[LeaderElectionService] Detected master instance overwritten by another instance ${leaderInfo.instanceId}, current instance resigning`
                );
            }

            const heartbeatAge = now - leaderInfo.lastHeartbeat;
            StatusLogger.trace(
                `[LeaderElectionService] Leader heartbeat age: ${heartbeatAge}ms (timeout threshold: ${LeaderElectionService.LEADER_TIMEOUT}ms)`
            );
            if (heartbeatAge > LeaderElectionService.LEADER_TIMEOUT) {
                StatusLogger.info(
                    `[LeaderElectionService] Master instance ${leaderInfo.instanceId} heartbeat timeout, attempting takeover...`
                );
                await LeaderElectionService.becomeLeader();
            }
        }
    }

    private static async becomeLeader(): Promise<void> {
        if (!LeaderElectionService.context) {
            return;
        }

        StatusLogger.trace(
            '[LeaderElectionService] Starting election process...'
        );
        const existingLeader =
            LeaderElectionService.context.globalState.get<LeaderInfo>(
                LeaderElectionService.LEADER_KEY
            );

        if (existingLeader) {
            const now = Date.now();
            const heartbeatAge = now - existingLeader.lastHeartbeat;
            if (heartbeatAge <= LeaderElectionService.LEADER_TIMEOUT) {
                StatusLogger.trace(
                    `[LeaderElectionService] Active master instance ${existingLeader.instanceId} already exists (heartbeat age: ${heartbeatAge}ms), abandoning election`
                );
                return;
            }
        }

        const now = Date.now();
        const info: LeaderInfo = {
            instanceId: LeaderElectionService.instanceId,
            lastHeartbeat: now,
            electedAt: now
        };

        StatusLogger.trace(
            `[LeaderElectionService] Writing election info: instanceId=${LeaderElectionService.instanceId}, electedAt=${now}`
        );
        await LeaderElectionService.context.globalState.update(
            LeaderElectionService.LEADER_KEY,
            info
        );

        await new Promise((resolve) => setTimeout(resolve, 100));

        const currentInfo =
            LeaderElectionService.context.globalState.get<LeaderInfo>(
                LeaderElectionService.LEADER_KEY
            );

        if (!currentInfo) {
            StatusLogger.warn(
                '[LeaderElectionService] Election failed: unable to read Leader information'
            );
            return;
        }

        StatusLogger.trace(
            `[LeaderElectionService] Election result: current Leader=${currentInfo.instanceId}, electedAt=${currentInfo.electedAt}`
        );

        const isWinner =
            currentInfo.instanceId === LeaderElectionService.instanceId ||
            (currentInfo.electedAt === info.electedAt &&
                currentInfo.instanceId < LeaderElectionService.instanceId);

        if (
            isWinner &&
            currentInfo.instanceId === LeaderElectionService.instanceId
        ) {
            if (!LeaderElectionService._isLeader) {
                LeaderElectionService._isLeader = true;
                StatusLogger.info(
                    '[LeaderElectionService] Election successful, current instance becomes master instance'
                );
            }
        } else {
            StatusLogger.debug(
                `[LeaderElectionService] Election failed, instance ${currentInfo.instanceId} becomes master instance (electedAt: ${currentInfo.electedAt})`
            );
            if (LeaderElectionService._isLeader) {
                LeaderElectionService._isLeader = false;
                StatusLogger.info(
                    `[LeaderElectionService] Election failed, instance ${currentInfo.instanceId} becomes master instance`
                );
            }
        }
    }

    private static async updateHeartbeat(): Promise<void> {
        if (
            !LeaderElectionService._isLeader ||
            !LeaderElectionService.context
        ) {
            return;
        }

        const currentInfo =
            LeaderElectionService.context.globalState.get<LeaderInfo>(
                LeaderElectionService.LEADER_KEY
            );
        const newHeartbeat = Date.now();

        const info: LeaderInfo = {
            instanceId: LeaderElectionService.instanceId,
            lastHeartbeat: newHeartbeat,
            electedAt: currentInfo?.electedAt || newHeartbeat
        };
        StatusLogger.trace(
            `[LeaderElectionService] Update heartbeat: lastHeartbeat=${newHeartbeat}`
        );
        await LeaderElectionService.context.globalState.update(
            LeaderElectionService.LEADER_KEY,
            info
        );
    }

    private static async resignLeader(): Promise<void> {
        if (LeaderElectionService._isLeader && LeaderElectionService.context) {
            const currentInfo =
                LeaderElectionService.context.globalState.get<LeaderInfo>(
                    LeaderElectionService.LEADER_KEY
                );
            if (
                currentInfo &&
                currentInfo.instanceId === LeaderElectionService.instanceId
            ) {
                await LeaderElectionService.context.globalState.update(
                    LeaderElectionService.LEADER_KEY,
                    undefined
                );
                StatusLogger.info(
                    '[LeaderElectionService] Instance release: master instance identity cleared'
                );
            }
            LeaderElectionService._isLeader = false;
            StatusLogger.debug(
                '[LeaderElectionService] Instance release: exited master instance identity'
            );
        }
    }

    private static async executePeriodicTasks(): Promise<void> {
        if (!UserActivityService.isUserActive()) {
            const inactiveMinutes = Math.floor(
                UserActivityService.getInactiveTime() / 60000
            );
            StatusLogger.debug(
                `[LeaderElectionService] User inactive for ${inactiveMinutes} minutes, pausing periodic task execution`
            );
            return;
        }

        StatusLogger.trace(
            `[LeaderElectionService] Starting execution of ${LeaderElectionService.periodicTasks.length} periodic tasks...`
        );
        for (const task of LeaderElectionService.periodicTasks) {
            try {
                await task();
            } catch (error) {
                StatusLogger.error(
                    '[LeaderElectionService] Error executing periodic task:',
                    error
                );
            }
        }
        StatusLogger.trace(
            '[LeaderElectionService] Periodic task execution completed'
        );
    }
}

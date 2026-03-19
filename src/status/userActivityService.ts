import * as vscode from 'vscode';
import { StatusLogger } from '../utils/statusLogger';

interface UserActivityInfo {
    lastActiveTime: number;
    instanceId: string;
    recentActivityCount: number;
    lastActivityType?: ActivityType;
}

type ActivityType =
    | 'windowFocus'
    | 'editorChange'
    | 'textEdit'
    | 'textSelection'
    | 'terminalChange';

const ACTIVITY_THROTTLE_CONFIG: Record<ActivityType, number> = {
    windowFocus: 5000,
    editorChange: 3000,
    textEdit: 5000,
    textSelection: 2000,
    terminalChange: 3000
};

export class UserActivityService {
    private static readonly USER_ACTIVITY_KEY = 'chp.user.activity';
    private static readonly ACTIVITY_TIMEOUT = 30 * 60 * 1000;
    private static readonly ACTIVITY_COUNT_WINDOW = 5 * 60 * 1000;
    private static readonly CACHE_VALIDITY = 5000;

    private static instanceId: string;
    private static context: vscode.ExtensionContext | undefined;
    private static activityDisposables: vscode.Disposable[] = [];
    private static lastRecordedActivityByType = new Map<ActivityType, number>();
    private static cachedActivityInfo: UserActivityInfo | null = null;
    private static lastCacheUpdate = 0;
    private static initialized = false;

    private constructor() {
        throw new Error(
            'UserActivityService is a static class and cannot be instantiated'
        );
    }

    public static initialize(
        context: vscode.ExtensionContext,
        instanceId: string
    ): void {
        if (UserActivityService.initialized) {
            return;
        }

        UserActivityService.context = context;
        UserActivityService.instanceId = instanceId;

        UserActivityService.registerActivityListeners();

        UserActivityService.initialized = true;
        StatusLogger.debug(
            '[UserActivityService] User activity detection service initialized'
        );
    }

    public static stop(): void {
        UserActivityService.activityDisposables.forEach((d) => d.dispose());
        UserActivityService.activityDisposables = [];

        UserActivityService.cachedActivityInfo = null;
        UserActivityService.lastCacheUpdate = 0;
        UserActivityService.lastRecordedActivityByType.clear();

        UserActivityService.initialized = false;
        StatusLogger.debug(
            '[UserActivityService] User activity detection service stopped'
        );
    }

    private static registerActivityListeners(): void {
        if (!UserActivityService.context) {
            return;
        }

        UserActivityService.activityDisposables.push(
            vscode.window.onDidChangeWindowState((state) => {
                if (state.focused) {
                    UserActivityService.recordUserActivity('windowFocus');
                }
            })
        );

        UserActivityService.activityDisposables.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                if (vscode.window.state.focused && editor) {
                    const scheme = editor.document.uri.scheme;
                    if (scheme === 'file' || scheme === 'untitled') {
                        UserActivityService.recordUserActivity('editorChange');
                    }
                }
            })
        );

        UserActivityService.activityDisposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                if (event.contentChanges.length === 0) {
                    return;
                }
                if (!vscode.window.state.focused) {
                    return;
                }
                const scheme = event.document.uri.scheme;
                if (scheme !== 'file' && scheme !== 'untitled') {
                    return;
                }
                const totalChanges = event.contentChanges.reduce(
                    (sum, c) => sum + c.text.length + c.rangeLength,
                    0
                );
                if (totalChanges > 1000) {
                    return;
                }
                UserActivityService.recordUserActivity('textEdit');
            })
        );

        UserActivityService.activityDisposables.push(
            vscode.window.onDidChangeTextEditorSelection((event) => {
                if (!vscode.window.state.focused) {
                    return;
                }
                const scheme = event.textEditor.document.uri.scheme;
                if (scheme !== 'file' && scheme !== 'untitled') {
                    return;
                }
                if (
                    event.kind ===
                        vscode.TextEditorSelectionChangeKind.Keyboard ||
                    event.kind === vscode.TextEditorSelectionChangeKind.Mouse
                ) {
                    UserActivityService.recordUserActivity('textSelection');
                }
            })
        );

        UserActivityService.activityDisposables.push(
            vscode.window.onDidChangeActiveTerminal((terminal) => {
                if (vscode.window.state.focused && terminal) {
                    UserActivityService.recordUserActivity('terminalChange');
                }
            })
        );

        if (vscode.window.state.focused) {
            UserActivityService.recordUserActivity('windowFocus');
        }

        StatusLogger.debug(
            '[UserActivityService] User activity listeners registered'
        );
    }

    private static shouldThrottle(activityType: ActivityType): boolean {
        const now = Date.now();
        const lastRecorded =
            UserActivityService.lastRecordedActivityByType.get(activityType) ||
            0;
        const throttleInterval = ACTIVITY_THROTTLE_CONFIG[activityType];
        return now - lastRecorded < throttleInterval;
    }

    private static async recordUserActivity(
        activityType: ActivityType
    ): Promise<void> {
        if (!UserActivityService.context) {
            return;
        }

        if (UserActivityService.shouldThrottle(activityType)) {
            return;
        }

        const now = Date.now();
        UserActivityService.lastRecordedActivityByType.set(activityType, now);

        const currentInfo = UserActivityService.getCachedActivityInfo();
        let recentActivityCount = 1;

        if (
            currentInfo &&
            typeof currentInfo.recentActivityCount === 'number' &&
            !Number.isNaN(currentInfo.recentActivityCount)
        ) {
            if (
                now - currentInfo.lastActiveTime <
                UserActivityService.ACTIVITY_COUNT_WINDOW
            ) {
                recentActivityCount = Math.min(
                    currentInfo.recentActivityCount + 1,
                    100
                );
            }
        }

        const activityInfo: UserActivityInfo = {
            lastActiveTime: now,
            instanceId: UserActivityService.instanceId,
            recentActivityCount: recentActivityCount,
            lastActivityType: activityType
        };

        UserActivityService.cachedActivityInfo = activityInfo;
        UserActivityService.lastCacheUpdate = now;

        await UserActivityService.context.globalState.update(
            UserActivityService.USER_ACTIVITY_KEY,
            activityInfo
        );
        StatusLogger.trace(
            `[UserActivityService] Record user activity status: type=${activityType}, count=${recentActivityCount}, time=${now}`
        );
    }

    private static getCachedActivityInfo(): UserActivityInfo | null {
        const now = Date.now();

        if (
            UserActivityService.cachedActivityInfo &&
            now - UserActivityService.lastCacheUpdate <
                UserActivityService.CACHE_VALIDITY
        ) {
            return UserActivityService.cachedActivityInfo;
        }

        if (!UserActivityService.context) {
            return null;
        }

        const activityInfo =
            UserActivityService.context.globalState.get<UserActivityInfo>(
                UserActivityService.USER_ACTIVITY_KEY
            );
        if (activityInfo) {
            const isValidCount =
                typeof activityInfo.recentActivityCount === 'number' &&
                activityInfo.recentActivityCount >= 0 &&
                !Number.isNaN(activityInfo.recentActivityCount);

            const validatedInfo: UserActivityInfo = {
                lastActiveTime: activityInfo.lastActiveTime ?? Date.now(),
                instanceId: activityInfo.instanceId ?? '',
                recentActivityCount: isValidCount
                    ? activityInfo.recentActivityCount
                    : 0,
                lastActivityType: activityInfo.lastActivityType
            };
            UserActivityService.cachedActivityInfo = validatedInfo;
            UserActivityService.lastCacheUpdate = now;
            return validatedInfo;
        }
        return null;
    }

    public static isUserActive(): boolean {
        const activityInfo = UserActivityService.getCachedActivityInfo();
        if (!activityInfo) {
            return false;
        }

        const now = Date.now();
        const inactiveTime = now - activityInfo.lastActiveTime;
        const isActive = inactiveTime <= UserActivityService.ACTIVITY_TIMEOUT;

        StatusLogger.trace(
            `[UserActivityService] Check user activity status: lastActive=${activityInfo.lastActiveTime}, ` +
                `inactiveTime=${inactiveTime}ms, activityCount=${activityInfo.recentActivityCount}, isActive=${isActive}`
        );

        return isActive;
    }

    public static getLastActiveTime(): number | undefined {
        const activityInfo = UserActivityService.getCachedActivityInfo();
        return activityInfo?.lastActiveTime;
    }

    public static getInactiveTime(): number {
        const lastActiveTime = UserActivityService.getLastActiveTime();
        if (lastActiveTime === undefined) {
            return Infinity;
        }
        return Date.now() - lastActiveTime;
    }
}

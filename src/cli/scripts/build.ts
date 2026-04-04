/**
 * CHP CLI build script — bundles the TypeScript source into a single
 * distributable JS file using Bun's bundler.
 *
 * Handles:
 * - bun:bundle feature() flags → all false (disables internal-only features)
 * - MACRO.* globals → inlined version/build-time constants
 * - src/ path aliases
 */

import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { noTelemetryPlugin } from './no-telemetry-plugin';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version = pkg.version;

// Feature flags — all disabled for the open build.
// These gate Anthropic-internal features (voice, proactive, kairos, etc.)
const featureFlags: Record<string, boolean> = {
    VOICE_MODE: false,
    PROACTIVE: false,
    KAIROS: false,
    BRIDGE_MODE: false,
    DAEMON: false,
    AGENT_TRIGGERS: false,
    MONITOR_TOOL: false,
    ABLATION_BASELINE: false,
    DUMP_SYSTEM_PROMPT: false,
    CACHED_MICROCOMPACT: false,
    COORDINATOR_MODE: false,
    CONTEXT_COLLAPSE: false,
    COMMIT_ATTRIBUTION: false,
    TEAMMEM: false,
    UDS_INBOX: false,
    BG_SESSIONS: false,
    AWAY_SUMMARY: false,
    TRANSCRIPT_CLASSIFIER: false,
    WEB_BROWSER_TOOL: false,
    MESSAGE_ACTIONS: false,
    BUDDY: false,
    CHICAGO_MCP: false,
    COWORKER_TYPE_TELEMETRY: false
};

try {
    await esbuild.build({
        entryPoints: ['./src/entrypoints/cli.tsx'],
        outfile: './dist/cli.mjs',
        platform: 'node',
        target: 'node20',
        format: 'esm',
        bundle: true,
        packages: 'external',
        splitting: false,
        sourcemap: 'external',
        minify: false,
        define: {
            // MACRO.* build-time constants
            // Keep the internal compatibility version high enough to pass
            // first-party minimum-version guards, but expose the real package
            // version separately in Open Claude branding.
            'MACRO.VERSION': JSON.stringify('99.0.0'),
            'MACRO.DISPLAY_VERSION': JSON.stringify(version),
            'MACRO.BUILD_TIME': JSON.stringify(new Date().toISOString()),
            'MACRO.ISSUES_EXPLAINER': JSON.stringify(
                'report the issue at https://github.com/anthropics/claude-code/issues'
            ),
            'MACRO.PACKAGE_URL': JSON.stringify('@gitlawb/chp'),
            'MACRO.NATIVE_PACKAGE_URL': 'undefined'
        },
        plugins: [
            noTelemetryPlugin,
            {
                name: 'bun-bundle-shim',
                setup(build) {
                    const internalFeatureStubModules = new Map([
                        [
                            '../daemon/workerRegistry.js',
                            'export async function runDaemonWorker() { throw new Error("Daemon worker is unavailable in the open build."); }'
                        ],
                        [
                            '../daemon/main.js',
                            'export async function daemonMain() { throw new Error("Daemon mode is unavailable in the open build."); }'
                        ],
                        [
                            '../cli/bg.js',
                            `
export async function psHandler() { throw new Error("Background sessions are unavailable in the open build."); }
export async function logsHandler() { throw new Error("Background sessions are unavailable in the open build."); }
export async function attachHandler() { throw new Error("Background sessions are unavailable in the open build."); }
export async function killHandler() { throw new Error("Background sessions are unavailable in the open build."); }
export async function handleBgFlag() { throw new Error("Background sessions are unavailable in the open build."); }
`
                        ],
                        [
                            '../cli/handlers/templateJobs.js',
                            'export async function templatesMain() { throw new Error("Template jobs are unavailable in the open build."); }'
                        ],
                        [
                            '../environment-runner/main.js',
                            'export async function environmentRunnerMain() { throw new Error("Environment runner is unavailable in the open build."); }'
                        ],
                        [
                            '../self-hosted-runner/main.js',
                            'export async function selfHostedRunnerMain() { throw new Error("Self-hosted runner is unavailable in the open build."); }'
                        ],
                        // Analytics stubs
                        [
                            '../services/analytics/datadog.js',
                            'export async function shutdownDatadog() {}'
                        ],
                        [
                            '../services/analytics/firstPartyEventLogger.js',
                            'export async function shutdown1PEventLogging() {}'
                        ],
                        [
                            '../services/analytics/growthbook.js',
                            `
export function getFeatureValue_CACHED_MAY_BE_STALE(key, defaultValue) { return defaultValue ?? false; }
export function hasGrowthBookEnvOverride() { return false; }
export async function initializeGrowthBook() {}
export async function refreshGrowthBookAfterAuthChange() {}
`
                        ],
                        [
                            '../services/analytics/config.js',
                            'export function isAnalyticsDisabled() { return true; }'
                        ],
                        [
                            '../services/analytics/sink.js',
                            `
export function initializeAnalyticsGates() {}
export function initializeAnalyticsSink() {}
`
                        ],
                        [
                            '../services/analytics/index.js',
                            `
export const AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS = Symbol('Metadata');
export function logEvent(eventName, metadata) {}
`
                        ],
                        [
                            '../services/tips/tipRegistry.js',
                            'export function getRelevantTips() { return Promise.resolve([]); }'
                        ],
                        [
                            '../services/PromptSuggestion/promptSuggestion.js',
                            'export function shouldEnablePromptSuggestion() { return false; }'
                        ],
                        // Telemetry stubs
                        [
                            '../utils/telemetry/pluginTelemetry.js',
                            `
export function logPluginLoadErrors() {}
export function logPluginsEnabledForSession() {}
`
                        ],
                        [
                            '../utils/telemetry/skillLoadedEvent.js',
                            'export function logSkillsLoaded() { return Promise.resolve(); }'
                        ],
                        [
                            '../utils/telemetry/events.js',
                            'export function logOTelEvent() {}'
                        ],
                        [
                            '../utils/telemetry/sessionTracing.js',
                            `
export function startHookSpan() { return { end: () => {} }; }
export function endHookSpan() {}
export function isBetaTracingEnabled() { return false; }
`
                        ],
                        [
                            '../utils/teleport/api.js',
                            `
export async function fetchSession() { return null; }
export async function prepareApiRequest() { return {}; }
`
                        ],
                        [
                            '../utils/startupProfiler.js',
                            `
export function profileCheckpoint() {}
export function profileReport() {}
`
                        ],
                        // Additional internal module stubs for src/* path alias
                        [
                            '../commands/mcp/addCommand.js',
                            'export function registerMcpAddCommand() {}'
                        ],
                        [
                            '../commands/mcp/doctorCommand.js',
                            'export function registerMcpDoctorCommand() {}'
                        ],
                        [
                            '../commands/mcp/xaaIdpCommand.js',
                            'export function registerMcpXaaIdpCommand() {}'
                        ],
                        [
                            '../services/internalLogging.js',
                            'export function logPermissionContextForAnts() {}'
                        ],
                        [
                            '../services/mcp/claudeai.js',
                            'export async function fetchClaudeAIMcpConfigsIfEligible() { return []; }'
                        ],
                        [
                            '../services/mcp/client.js',
                            `
export async function getMcpToolsCommandsAndResources() { return { tools: [], commands: [], resources: [] }; }
export async function prefetchAllMcpResources() {}
export function clearServerCache() {}
`
                        ],
                        [
                            '../services/mcp/config.js',
                            `
export async function parseMcpConfig() { return { servers: {} }; }
export async function parseMcpConfigFromFilePath() { return { servers: {} }; }
export function getClaudeCodeMcpConfigs() { return []; }
export function getMcpServerSignature() { return null; }
export async function dedupClaudeAiMcpServers() { return []; }
export function doesEnterpriseMcpConfigExist() { return false; }
export function areMcpConfigsAllowedWithEnterpriseMcpConfig() { return true; }
export async function filterMcpServersByPolicy() { return []; }
`
                        ],
                        [
                            '../services/mcp/utils.js',
                            `
export function excludeCommandsByServer() { return []; }
export function excludeResourcesByServer() { return []; }
`
                        ],
                        [
                            '../services/mcp/xaaIdpLogin.js',
                            'export function isXaaEnabled() { return false; }'
                        ],
                        [
                            '../utils/api.js',
                            'export function logContextMetrics() {}'
                        ],
                        [
                            '../utils/claudeInChrome/common.js',
                            `
export const CLAUDE_IN_CHROME_MCP_SERVER_NAME = 'claude-in-chrome';
export function isClaudeInChromeMCPServer() { return false; }
`
                        ],
                        [
                            '../utils/cleanupRegistry.js',
                            'export function registerCleanup() {}'
                        ],
                        [
                            '../utils/cliArgs.js',
                            'export function eagerParseCliFlag() { return undefined; }'
                        ],
                        [
                            '../utils/commitAttribution.js',
                            'export function createEmptyAttributionState() { return {}; }'
                        ],
                        [
                            '../utils/concurrentSessions.js',
                            `
export function countConcurrentSessions() { return 0; }
export function registerSession() {}
export function updateSessionName() {}
`
                        ],
                        [
                            '../utils/cwd.js',
                            'export function getCwd() { return process.cwd(); }'
                        ],
                        [
                            '../utils/debug.js',
                            `
export function logForDebugging() {}
export function setHasFormattedOutput() {}
`
                        ],
                        [
                            '../utils/errors.js',
                            `
export function errorMessage() { return ''; }
export function getErrnoCode() { return null; }
export function isENOENT() { return false; }
export class TeleportOperationError extends Error {}
export function toError() { return new Error(''); }
`
                        ],
                        [
                            '../utils/fsOperations.js',
                            `
export function getFsImplementation() { return { readFile: () => Promise.resolve(''), writeFile: () => Promise.resolve(), statSync: () => ({ mtimeMs: 0, size: 0 }), mkdirSync: () => {}, copyFileSync: () => {}, unlinkSync: () => {}, readdirStringSync: () => [] }; }
export function safeResolvePath() { return { resolvedPath: '' }; }
`
                        ],
                        [
                            '../utils/gracefulShutdown.js',
                            `
export function gracefulShutdown() { return Promise.resolve(); }
export function gracefulShutdownSync() {}
`
                        ],
                        [
                            '../utils/hooks/hookEvents.js',
                            'export function setAllHookEventsEnabled() {}'
                        ],
                        [
                            '../utils/model/modelCapabilities.js',
                            'export function refreshModelCapabilities() { return Promise.resolve(); }'
                        ],
                        [
                            '../utils/process.js',
                            `
export async function peekForStdinData() { return false; }
export function writeToStderr() {}
`
                        ],
                        ['../utils/Shell.js', 'export function setCwd() {}'],
                        [
                            '../utils/sessionRestore.js',
                            `
export async function processResumedConversation() { return null; }
export type ProcessedResume = {};
`
                        ],
                        [
                            '../utils/settings/constants.js',
                            'export function parseSettingSourcesFlag() { return []; }'
                        ],
                        [
                            '../utils/stringUtils.js',
                            `
export function plural() { return ''; }
export function count() { return 0; }
`
                        ],
                        [
                            '../tools/ReviewArtifactTool/ReviewArtifactTool.js',
                            "export const ReviewArtifactTool = Symbol('ReviewArtifactTool');"
                        ],
                        [
                            '../tools/ReviewArtifactTool/ReviewArtifactPermissionRequest.js',
                            'export function ReviewArtifactPermissionRequest() { return null; }'
                        ],
                        [
                            '../tools/WorkflowTool/WorkflowTool.js',
                            "export const WorkflowTool = Symbol('WorkflowTool');"
                        ],
                        [
                            '../tools/WorkflowTool/WorkflowPermissionRequest.js',
                            'export function WorkflowPermissionRequest() { return null; }'
                        ],
                        [
                            '../tools/WorkflowTool/createWorkflowCommand.js',
                            'export function createWorkflowCommand() {}'
                        ],
                        [
                            '../tools/WorkflowTool/bundled/index.js',
                            'export function initBundledWorkflows() {}'
                        ],
                        [
                            '../tools/MonitorTool/MonitorTool.js',
                            "export const MonitorTool = Symbol('MonitorTool');"
                        ],
                        [
                            '../tools/MonitorTool/MonitorPermissionRequest.js',
                            'export function MonitorPermissionRequest() { return null; }'
                        ],
                        // Additional missing stubs
                        [
                            '../utils/telemetry/betaSessionTracing.js',
                            `
export function isBetaTracingEnabled() { return false; }
export function getDataTracingState() { return { enabled: false }; }
`
                        ],
                        [
                            '../utils/teleport/environments.js',
                            `
export async function fetchEnvironments() { return []; }
`
                        ],
                        [
                            '../utils/teleport/gitBundle.js',
                            `
export async function createAndUploadGitBundle() { return null; }
`
                        ],
                        [
                            '../utils/attributionHooks.js',
                            `
export function recordAttribution() {}
`
                        ],
                        [
                            '../utils/udsClient.js',
                            `
export async function connectUdsClient() { return null; }
`
                        ],
                        [
                            '../utils/systemThemeWatcher.js',
                            `
export function getSystemTheme() { return 'dark'; }
`
                        ],
                        [
                            '../utils/udsMessaging.js',
                            `
export function getUdsMessagingSocketPath() { return null; }
`
                        ],
                        [
                            '../utils/permissions/permissions.js',
                            `
export async function checkPermission() { return true; }
`
                        ],
                        [
                            '../utils/backgroundHousekeeping.js',
                            `
export async function initBackgroundHousekeeping() {}
`
                        ],
                        [
                            '../services/api/errors.js',
                            `
export class ApiError extends Error {}
export function isApiError() { return false; }
`
                        ],
                        [
                            '../services/api/sessionIngress.js',
                            `
export async function getOAuthHeaders() { return {}; }
`
                        ],
                        [
                            '../services/api/referral.js',
                            `
export async function prepareApiRequest() { return {}; }
`
                        ],
                        [
                            '../services/api/adminRequests.js',
                            `
export async function prepareApiRequest() { return {}; }
`
                        ],
                        [
                            '../services/api/filesApi.js',
                            `
export async function uploadFile() { return null; }
`
                        ],
                        [
                            '../services/api/ultrareviewQuota.js',
                            `
export async function prepareApiRequest() { return {}; }
`
                        ],
                        [
                            '../services/api/overageCreditGrant.js',
                            `
export async function prepareApiRequest() { return {}; }
`
                        ],
                        [
                            '../services/compact/reactiveCompact.js',
                            `
export function createReactiveCompact() { return null; }
`
                        ],
                        [
                            '../services/compact/cachedMCConfig.js',
                            `
export function getCachedMCConfig() { return null; }
`
                        ],
                        [
                            '../services/skillSearch/prefetch.js',
                            `
export async function prefetchSkills() {}
`
                        ],
                        [
                            '../services/skillSearch/featureCheck.js',
                            `
export function isSkillSearchEnabled() { return false; }
`
                        ],
                        [
                            '../services/skillSearch/remoteSkillState.js',
                            `
export function getRemoteSkillState() { return {}; }
`
                        ],
                        [
                            '../services/skillSearch/remoteSkillLoader.js',
                            `
export async function loadRemoteSkill() { return null; }
`
                        ],
                        [
                            '../services/skillSearch/telemetry.js',
                            `
export function logSkillSearchEvent() {}
`
                        ],
                        [
                            '../services/skillSearch/localSearch.js',
                            `
export async function searchLocalSkills() { return []; }
`
                        ],
                        [
                            '../services/extractMemories/extractMemories.js',
                            `
export async function extractMemories() { return []; }
`
                        ],
                        [
                            '../services/autoDream/autoDream.js',
                            `
export async function executeAutoDream() {}
export function isAutoDreamEnabled() { return false; }
`
                        ],
                        [
                            '../services/autoDream/config.js',
                            `
export function isAutoDreamEnabled() { return false; }
`
                        ],
                        [
                            '../services/autoDream/consolidationPrompt.js',
                            `
export function getConsolidationPrompt() { return ''; }
`
                        ],
                        [
                            '../services/autoDream/consolidationLock.js',
                            `
export async function acquireConsolidationLock() { return false; }
export function isConsolidatedAt() { return null; }
`
                        ],
                        [
                            '../services/contextCollapse/operations.js',
                            `
export async function collapseContext() { return null; }
`
                        ],
                        [
                            '../services/contextCollapse/persist.js',
                            `
export async function persistCollapsedContext() {}
`
                        ],
                        [
                            '../services/MagicDocs/magicDocs.js',
                            `
export async function clearTrackedMagicDocs() {}
`
                        ],
                        [
                            '../proactive/index.js',
                            `
export function isProactiveEnabled() { return false; }
export function setContextBlocked() {}
`
                        ],
                        [
                            '../proactive/useProactive.js',
                            `
export function useProactive() { return {}; }
`
                        ],
                        [
                            '../tools/DiscoverSkillsTool/prompt.js',
                            `
export function getDiscoverSkillsPrompt() { return ''; }
`
                        ],
                        [
                            '../tools/SendUserFileTool/prompt.js',
                            `
export function getSendUserFilePrompt() { return ''; }
`
                        ],
                        [
                            '../tools/TerminalCaptureTool/prompt.js',
                            `
export function getTerminalCapturePrompt() { return ''; }
`
                        ],
                        ['../tools/SnipTool/prompt.js', `                 `],
                        [
                            '../jobs/classifier.js',
                            `
export async function classifyJob() { return null; }
`
                        ],
                        [
                            '../commands/proactive.js',
                            `
export default null;
`
                        ],
                        [
                            '../commands/assistant/index.js',
                            `
export default null;
`
                        ],
                        [
                            '../commands/remoteControlServer/index.js',
                            `
export default null;
`
                        ],
                        [
                            '../commands/workflows/index.js',
                            `
export async function workflowsMain() {}
`
                        ],
                        [
                            '../commands/subscribe-pr.js',
                            `
export default null;
`
                        ],
                        [
                            '../commands/torch.js',
                            `
export default null;
`
                        ],
                        [
                            '../commands/peers/index.js',
                            `
export async function peersMain() {}
`
                        ],
                        [
                            '../commands/fork/index.js',
                            `
export async function forkMain() {}
`
                        ],
                        [
                            '../commands/buddy/index.js',
                            `
export async function buddyMain() {}
`
                        ],
                        [
                            '../commands/force-snip.js',
                            `
export default null;
`
                        ],
                        [
                            '../commands/dream/dream.js',
                            `
export async function consolidationPrompt() {}
export async function consolidationLock() {}
`
                        ],
                        [
                            '../commands/context/context.tsx',
                            `
export async function collapseContext() {}
`
                        ],
                        [
                            '../commands/context/context-noninteractive.ts',
                            `
export async function collapseContext() {}
`
                        ],
                        [
                            '../commands/clear/conversation.js',
                            `
export function setContextBlocked() {}
`
                        ],
                        ['../commands/clear/caches.js', `                 `],
                        ['../commands/compact/compact.js', `                 `],
                        ['../commands/bridge/bridge.tsx', `                 `],
                        [
                            '../commands/reload-plugins/reload-plugins.ts',
                            `                 `
                        ],
                        [
                            '../commands/remote-setup/api.ts',
                            `                 `
                        ],
                        ['../assistant/index.js', `                 `],
                        ['../assistant/gate.js', `                 `],
                        [
                            '../assistant/sessionDiscovery.js',
                            `                 `
                        ],
                        ['../bridge/peerSessions.js', `                 `],
                        ['../server/parseConnectUrl.js', `                 `],
                        ['../server/server.js', `                 `],
                        ['../server/sessionManager.js', `                 `],
                        [
                            '../server/backends/dangerousBackend.js',
                            `                 `
                        ],
                        ['../server/serverBanner.js', `                 `],
                        ['../server/serverLog.js', `                 `],
                        ['../server/lockfile.js', `                 `],
                        ['../server/connectHeadless.js', `                 `],
                        ['../ssh/createSSHSession.js', `                 `],
                        ['../components/Message.js', `                 `],
                        ['../components/Messages.js', `                 `],
                        [
                            '../components/messages/SnipBoundaryMessage.js',
                            `                 `
                        ],
                        [
                            '../components/messages/UserTextMessage.js',
                            `                 `
                        ],
                        [
                            '../components/messages/UserGitHubWebhookMessage.js',
                            `                 `
                        ],
                        [
                            '../components/messages/UserForkBoilerplateMessage.js',
                            `                 `
                        ],
                        [
                            '../components/messages/UserCrossSessionMessage.js',
                            `                 `
                        ],
                        [
                            '../components/tasks/BackgroundTasksDialog.js',
                            `                 `
                        ],
                        [
                            '../components/tasks/WorkflowDetailDialog.js',
                            `                 `
                        ],
                        [
                            '../components/tasks/MonitorMcpDetailDialog.js',
                            `                 `
                        ],
                        [
                            '../components/design-system/ThemeProvider.js',
                            `                 `
                        ],
                        [
                            '../components/RemoteEnvironmentDialog.js',
                            `                 `
                        ],
                        ['../utils/collapseReadSearch.js', `                 `],
                        [
                            '../utils/processUserInput/processSlashCommand.js',
                            `                 `
                        ],
                        [
                            '../utils/swarm/spawnInProcess.js',
                            `                 `
                        ],
                        [
                            '../utils/swarm/inProcessRunner.js',
                            `                 `
                        ],
                        [
                            '../utils/background/remote/preconditions.js',
                            `                 `
                        ],
                        [
                            '../utils/ultraplan/ccrSession.js',
                            `                 `
                        ],
                        [
                            '../utils/sessionFileAccessHooks.js',
                            `                 `
                        ],
                        [
                            '../tasks/LocalAgentTask/LocalAgentTask.js',
                            `                 `
                        ],
                        [
                            '../tasks/LocalShellTask/LocalShellTask.js',
                            `                 `
                        ],
                        [
                            '../tasks/RemoteAgentTask/RemoteAgentTask.js',
                            `                 `
                        ],
                        [
                            '../tasks/LocalWorkflowTask/LocalWorkflowTask.js',
                            `                 `
                        ],
                        [
                            '../tasks/MonitorMcpTask/MonitorMcpTask.js',
                            `                 `
                        ],
                        [
                            '../tasks/DreamTask/DreamTask.js',
                            `                 `
                        ],
                        [
                            '../tools/AgentTool/AgentTool.js',
                            `                 `
                        ],
                        ['../tools/AgentTool/runAgent.js', `                 `],
                        [
                            '../tools/AgentTool/builtInAgents.js',
                            `                 `
                        ],
                        [
                            '../tools/SkillTool/SkillTool.js',
                            `                 `
                        ],
                        [
                            '../tools/FileReadTool/FileReadTool.js',
                            `                 `
                        ],
                        [
                            '../tools/FileEditTool/FileEditTool.js',
                            `                 `
                        ],
                        [
                            '../tools/FileWriteTool/FileWriteTool.js',
                            `                 `
                        ],
                        [
                            '../tools/SendMessageTool/SendMessageTool.js',
                            `                 `
                        ],
                        [
                            '../tools/ToolSearchTool/prompt.js',
                            `                 `
                        ],
                        [
                            '../services/teamMemorySync/watcher.js',
                            `                 `
                        ],
                        [
                            '../services/teamMemorySync/teamMemSecretGuard.js',
                            `                 `
                        ],
                        [
                            '../services/sessionTranscript/sessionTranscript.js',
                            `                 `
                        ],
                        [
                            '../SessionMemory/sessionMemoryUtils.js',
                            `                 `
                        ],
                        ['../SessionMemory/prompts.js', `                 `],
                        [
                            '../SessionMemory/sessionMemory.js',
                            `                 `
                        ],
                        [
                            '../memdir/memoryShapeTelemetry.js',
                            `                 `
                        ],
                        ['../coordinator/workerAgent.js', `                 `],
                        [
                            '../services/settingsSync/index.js',
                            `                 `
                        ],
                        ['../skills/mcpSkills.js', `                 `],
                        [
                            '../tools/WebBrowserTool/WebBrowserTool.js',
                            `                 `
                        ],
                        [
                            '../tools/WebBrowserTool/WebBrowserPanel.js',
                            `                 `
                        ],
                        [
                            '../tools/CtxInspectTool/CtxInspectTool.js',
                            `                 `
                        ],
                        [
                            '../tools/OverflowTestTool/OverflowTestTool.js',
                            `                 `
                        ],
                        [
                            '../tools/VerifyPlanExecutionTool/constants.js',
                            `                 `
                        ],
                        [
                            '../tools/ListPeersTool/ListPeersTool.js',
                            `                 `
                        ],
                        ['../tasks.ts', `                 `],
                        ['../tools.ts', `                 `],
                        ['../commands.ts', `                 `],
                        ['../query.ts', `                 `],
                        ['../QueryEngine.ts', `                 `],
                        ['../setup.ts', `                 `],
                        ['../screens/REPL.js', `                 `],
                        // Additional telemetry stubs
                        [
                            './telemetry/events.js',
                            'export function logOTelEvent() {}'
                        ],
                        [
                            './telemetry/sessionTracing.js',
                            'export function startHookSpan() { return { end: () => {} }; }'
                        ],
                        [
                            './telemetry/instrumentation.js',
                            'export async function getInstrumentation() { return {}; }'
                        ],
                        [
                            './telemetry/betaSessionTracing.js',
                            'export function getDataTracingState() { return { enabled: false }; }'
                        ],
                        // Additional analytics stubs
                        [
                            '../analytics/growthbook.js',
                            'export function getFeatureValue_CACHED_MAY_BE_STALE() { return false; }'
                        ],
                        [
                            '../analytics/index.js',
                            'export function logEvent() {}'
                        ],
                        [
                            '../../services/analytics/metadata.js',
                            'export function sanitizeToolNameForAnalytics(n) { return n; }'
                        ],
                        // Additional command stubs
                        ['./commands/proactive.js', 'export default null;'],
                        [
                            './commands/assistant/index.js',
                            'export default null;'
                        ],
                        [
                            './commands/workflows/index.js',
                            'export async function workflowsMain() {}'
                        ],
                        ['./commands/subscribe-pr.js', 'export default null;'],
                        ['./commands/torch.js', 'export default null;'],
                        [
                            './commands/peers/index.js',
                            'export async function peersMain() {}'
                        ],
                        [
                            './commands/fork/index.js',
                            'export async function forkMain() {}'
                        ],
                        [
                            './commands/buddy/index.js',
                            'export async function buddyMain() {}'
                        ],
                        ['./commands/force-snip.js', 'export default null;'],
                        [
                            './commands/remoteControlServer/index.js',
                            'export default null;'
                        ],
                        // Additional tool stubs
                        [
                            './tools/SleepTool/SleepTool.js',
                            'export const SleepTool = null;'
                        ],
                        [
                            './tools/WebBrowserTool/WebBrowserTool.js',
                            'export const WebBrowserTool = null;'
                        ],
                        [
                            './tools/SendUserFileTool/SendUserFileTool.js',
                            'export const SendUserFileTool = null;'
                        ],
                        [
                            './tools/PushNotificationTool/PushNotificationTool.js',
                            'export const PushNotificationTool = null;'
                        ],
                        [
                            './tools/SubscribePRTool/SubscribePRTool.js',
                            'export const SubscribePRTool = null;'
                        ],
                        [
                            './tools/OverflowTestTool/OverflowTestTool.js',
                            'export const OverflowTestTool = null;'
                        ],
                        [
                            './tools/CtxInspectTool/CtxInspectTool.js',
                            'export const CtxInspectTool = null;'
                        ],
                        [
                            './tools/TerminalCaptureTool/TerminalCaptureTool.js',
                            'export const TerminalCaptureTool = null;'
                        ],
                        [
                            './tools/SnipTool/SnipTool.js',
                            'export const SnipTool = null;'
                        ],
                        [
                            './tools/ListPeersTool/ListPeersTool.js',
                            'export const ListPeersTool = null;'
                        ],
                        // Additional services stubs
                        [
                            './services/compact/snipProjection.js',
                            'export function snipProjection() { return null; }'
                        ],
                        [
                            '../../services/SessionMemory/sessionMemoryUtils.js',
                            'export function getSessionMemoryUtils() { return {}; }'
                        ],
                        // Teleport stubs
                        [
                            './teleport/api.js',
                            'export async function fetchSession() { return null; }'
                        ],
                        [
                            './teleport/environments.js',
                            'export async function fetchEnvironments() { return []; }'
                        ],
                        [
                            './teleport/gitBundle.js',
                            'export async function createAndUploadGitBundle() { return null; }'
                        ],
                        // Utils stubs
                        [
                            './utils/attributionHooks.js',
                            'export function recordAttribution() {}'
                        ]
                    ] as const);

                    // Resolve `import { feature } from 'bun:bundle'` to a shim
                    build.onResolve({ filter: /^bun:bundle$/ }, () => ({
                        path: 'bun:bundle',
                        namespace: 'bun-bundle-shim'
                    }));
                    build.onLoad(
                        { filter: /.*/, namespace: 'bun-bundle-shim' },
                        () => ({
                            contents: `export function feature(name) { return false; }`,
                            loader: 'js'
                        })
                    );

                    build.onResolve(
                        {
                            filter: /^\.\.\/(daemon\/workerRegistry|daemon\/main|cli\/bg|cli\/handlers\/templateJobs|environment-runner\/main|self-hosted-runner\/main|services\/analytics\/datadog|services\/analytics\/firstPartyEventLogger|services\/analytics\/growthbook|services\/analytics\/config|services\/analytics\/sink|services\/analytics\/index|services\/tips\/tipRegistry|services\/PromptSuggestion\/promptSuggestion|utils\/telemetry\/pluginTelemetry|utils\/telemetry\/skillLoadedEvent|utils\/telemetry\/events|utils\/telemetry\/sessionTracing|utils\/teleport\/api|utils\/startupProfiler)\.js$/
                        },
                        (args) => {
                            if (!internalFeatureStubModules.has(args.path))
                                return null;
                            return {
                                path: args.path,
                                namespace: 'internal-feature-stub'
                            };
                        }
                    );
                    // Catch-all resolver for any ../relative/path.js pattern
                    build.onResolve(
                        {
                            filter: /^\.\.\/[^/]+\.js$/
                        },
                        (args) => {
                            if (internalFeatureStubModules.has(args.path)) {
                                return {
                                    path: args.path,
                                    namespace: 'internal-feature-stub'
                                };
                            }
                            return null;
                        }
                    );
                    // Catch-all for deeper paths like ../services/xxx.js
                    build.onResolve(
                        {
                            filter: /^\.\.\/[^/]+\/[^/]+\.js$/
                        },
                        (args) => {
                            if (internalFeatureStubModules.has(args.path)) {
                                return {
                                    path: args.path,
                                    namespace: 'internal-feature-stub'
                                };
                            }
                            return null;
                        }
                    );
                    // Catch-all for even deeper paths like ../services/xxx/yyy.js
                    build.onResolve(
                        {
                            filter: /^\.\.\/[^/]+\/[^/]+\/[^/]+\.js$/
                        },
                        (args) => {
                            if (internalFeatureStubModules.has(args.path)) {
                                return {
                                    path: args.path,
                                    namespace: 'internal-feature-stub'
                                };
                            }
                            return null;
                        }
                    );
                    // Catch-all for relative paths starting with ./
                    build.onResolve(
                        {
                            filter: /^\.\/[^/]+\.js$/
                        },
                        (args) => {
                            if (internalFeatureStubModules.has(args.path)) {
                                return {
                                    path: args.path,
                                    namespace: 'internal-feature-stub'
                                };
                            }
                            return null;
                        }
                    );
                    // Catch-all for relative paths like ./telemetry/events.js
                    build.onResolve(
                        {
                            filter: /^\.\/[^/]+\/[^/]+\.js$/
                        },
                        (args) => {
                            if (internalFeatureStubModules.has(args.path)) {
                                return {
                                    path: args.path,
                                    namespace: 'internal-feature-stub'
                                };
                            }
                            return null;
                        }
                    );
                    // Handle src/* path alias (e.g., 'src/services/analytics/index.js')
                    build.onResolve({ filter: /^src\// }, (args) => {
                        const relativePath = args.path.replace(/^src\//, '../');
                        const fullPath = relativePath + '.js';
                        if (internalFeatureStubModules.has(fullPath)) {
                            return {
                                path: fullPath,
                                namespace: 'internal-feature-stub'
                            };
                        }
                        // Check if it's another internal module we need to stub
                        const internalModules = [
                            '../commands/mcp/addCommand.js',
                            '../commands/mcp/doctorCommand.js',
                            '../commands/mcp/xaaIdpCommand.js',
                            '../services/internalLogging.js',
                            '../services/mcp/claudeai.js',
                            '../services/mcp/client.js',
                            '../services/mcp/config.js',
                            '../services/mcp/utils.js',
                            '../services/mcp/xaaIdpLogin.js',
                            '../utils/api.js',
                            '../utils/claudeInChrome/common.js',
                            '../utils/cleanupRegistry.js',
                            '../utils/cliArgs.js',
                            '../utils/commitAttribution.js',
                            '../utils/concurrentSessions.js',
                            '../utils/cwd.js',
                            '../utils/debug.js',
                            '../utils/errors.js',
                            '../utils/fsOperations.js',
                            '../utils/gracefulShutdown.js',
                            '../utils/hooks/hookEvents.js',
                            '../utils/model/modelCapabilities.js',
                            '../utils/process.js',
                            '../utils/Shell.js',
                            '../utils/sessionRestore.js',
                            '../utils/settings/constants.js',
                            '../utils/stringUtils.js'
                        ];
                        if (internalModules.includes(fullPath)) {
                            return {
                                path: fullPath,
                                namespace: 'internal-feature-stub'
                            };
                        }
                        return null;
                    });
                    build.onResolve(
                        {
                            filter: /^(?:\.\.\/|\.\/)+services\/analytics\/.*\.js$/
                        },
                        (args) => {
                            const analyticsPath = args.path.slice(
                                args.path.lastIndexOf('/services/analytics/') +
                                    '/services/analytics/'.length
                            );
                            const fullPath = `../services/analytics/${analyticsPath}`;
                            if (internalFeatureStubModules.has(fullPath)) {
                                return {
                                    path: fullPath,
                                    namespace: 'internal-feature-stub'
                                };
                            }
                            return null;
                        }
                    );
                    build.onResolve(
                        {
                            filter: /^(?:\.\.\/|\.\/)+tools\/(ReviewArtifactTool|WorkflowTool|MonitorTool)\/.*\.js$/
                        },
                        (args) => {
                            const toolPath = args.path.slice(
                                args.path.lastIndexOf('/tools/') +
                                    '/tools/'.length
                            );
                            const fullPath = `../tools/${toolPath}`;
                            if (internalFeatureStubModules.has(fullPath)) {
                                return {
                                    path: fullPath,
                                    namespace: 'internal-feature-stub'
                                };
                            }
                            return null;
                        }
                    );
                    build.onResolve(
                        {
                            filter: /^(?:\.\.\/|\.\/)+ReviewArtifactPermissionRequest\/.*\.js$/
                        },
                        (args) => {
                            const fullPath =
                                '../tools/ReviewArtifactTool/ReviewArtifactPermissionRequest.js';
                            if (internalFeatureStubModules.has(fullPath)) {
                                return {
                                    path: fullPath,
                                    namespace: 'internal-feature-stub'
                                };
                            }
                            return null;
                        }
                    );
                    build.onResolve(
                        {
                            filter: /^(?:\.\.\/|\.\/)+MonitorPermissionRequest\/.*\.js$/
                        },
                        () => ({
                            path: '../tools/MonitorTool/MonitorPermissionRequest.js',
                            namespace: 'internal-feature-stub'
                        })
                    );
                    build.onLoad(
                        { filter: /.*/, namespace: 'internal-feature-stub' },
                        (args) => ({
                            contents:
                                internalFeatureStubModules.get(args.path) ??
                                'export {}',
                            loader: 'js'
                        })
                    );

                    // Resolve react/compiler-runtime to the standalone package
                    build.onResolve(
                        { filter: /^react\/compiler-runtime$/ },
                        () => ({
                            path: 'react/compiler-runtime',
                            namespace: 'react-compiler-shim'
                        })
                    );
                    build.onLoad(
                        { filter: /.*/, namespace: 'react-compiler-shim' },
                        () => ({
                            contents: `export function c(size) { return new Array(size).fill(Symbol.for('react.memo_cache_sentinel')); }`,
                            loader: 'js'
                        })
                    );

                    // NOTE: @opentelemetry/* kept as external deps (too many named exports to stub)

                    // Resolve native addon and missing snapshot imports to stubs
                    for (const mod of [
                        'audio-capture-napi',
                        'audio-capture.node',
                        'image-processor-napi',
                        'modifiers-napi',
                        'url-handler-napi',
                        'color-diff-napi',
                        '@anthropic-ai/mcpb',
                        '@ant/claude-for-chrome-mcp',
                        '@anthropic-ai/sandbox-runtime',
                        'asciichart',
                        'plist',
                        'cacache',
                        'fuse',
                        'code-excerpt',
                        'stack-utils'
                    ]) {
                        build.onResolve(
                            { filter: new RegExp(`^${mod}$`) },
                            () => ({
                                path: mod,
                                namespace: 'native-stub'
                            })
                        );
                    }
                    build.onLoad(
                        { filter: /.*/, namespace: 'native-stub' },
                        () => ({
                            // Comprehensive stub that handles any named export via Proxy
                            contents: `
const noop = () => null;
const noopClass = class {};
const handler = {
  get(_, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return new Proxy({}, handler);
    if (prop === 'ExportResultCode') return { SUCCESS: 0, FAILED: 1 };
    if (prop === 'resourceFromAttributes') return () => ({});
    if (prop === 'SandboxRuntimeConfigSchema') return { parse: () => ({}) };
    return noop;
  }
};
const stub = new Proxy(noop, handler);
export default stub;
export const __stub = true;
// Named exports for all known imports
export const SandboxViolationStore = null;
export const SandboxManager = new Proxy({}, { get: () => noop });
export const SandboxRuntimeConfigSchema = { parse: () => ({}) };
export const BROWSER_TOOLS = [];
export const getMcpConfigForManifest = noop;
export const ColorDiff = null;
export const ColorFile = null;
export const getSyntaxTheme = noop;
export const plot = noop;
export const createClaudeForChromeMcpServer = noop;
// OpenTelemetry exports
export const ExportResultCode = { SUCCESS: 0, FAILED: 1 };
export const resourceFromAttributes = noop;
export const Resource = noopClass;
export const SimpleSpanProcessor = noopClass;
export const BatchSpanProcessor = noopClass;
export const NodeTracerProvider = noopClass;
export const BasicTracerProvider = noopClass;
export const OTLPTraceExporter = noopClass;
export const OTLPLogExporter = noopClass;
export const OTLPMetricExporter = noopClass;
export const PrometheusExporter = noopClass;
export const LoggerProvider = noopClass;
export const SimpleLogRecordProcessor = noopClass;
export const BatchLogRecordProcessor = noopClass;
export const MeterProvider = noopClass;
export const PeriodicExportingMetricReader = noopClass;
export const trace = { getTracer: () => ({ startSpan: () => ({ end: noop, setAttribute: noop, setStatus: noop, recordException: noop }) }) };
export const context = { active: noop, with: (_, fn) => fn() };
export const SpanStatusCode = { OK: 0, ERROR: 1, UNSET: 2 };
export const ATTR_SERVICE_NAME = 'service.name';
export const ATTR_SERVICE_VERSION = 'service.version';
export const SEMRESATTRS_SERVICE_NAME = 'service.name';
export const SEMRESATTRS_SERVICE_VERSION = 'service.version';
export const AggregationTemporality = { CUMULATIVE: 0, DELTA: 1 };
export const DataPointType = { HISTOGRAM: 0, SUM: 1, GAUGE: 2 };
export const InstrumentType = { COUNTER: 0, HISTOGRAM: 1, UP_DOWN_COUNTER: 2 };
export const PushMetricExporter = noopClass;
export const SeverityNumber = {};
`,
                            loader: 'js'
                        })
                    );

                    // Resolve .md and .txt file imports to empty string stubs
                    build.onResolve({ filter: /\.(md|txt)$/ }, (args) => ({
                        path: args.path,
                        namespace: 'text-stub'
                    }));
                    build.onLoad(
                        { filter: /.*/, namespace: 'text-stub' },
                        () => ({
                            contents: `export default '';`,
                            loader: 'js'
                        })
                    );
                }
            }
        ],
        external: [
            // OpenTelemetry — too many named exports to stub, kept external
            '@opentelemetry/api',
            '@opentelemetry/api-logs',
            '@opentelemetry/core',
            '@opentelemetry/exporter-trace-otlp-grpc',
            '@opentelemetry/exporter-trace-otlp-http',
            '@opentelemetry/exporter-trace-otlp-proto',
            '@opentelemetry/exporter-logs-otlp-http',
            '@opentelemetry/exporter-logs-otlp-proto',
            '@opentelemetry/exporter-logs-otlp-grpc',
            '@opentelemetry/exporter-metrics-otlp-proto',
            '@opentelemetry/exporter-metrics-otlp-grpc',
            '@opentelemetry/exporter-metrics-otlp-http',
            '@opentelemetry/exporter-prometheus',
            '@opentelemetry/resources',
            '@opentelemetry/sdk-trace-base',
            '@opentelemetry/sdk-trace-node',
            '@opentelemetry/sdk-logs',
            '@opentelemetry/sdk-metrics',
            '@opentelemetry/semantic-conventions',
            // Native image processing
            'sharp',
            // Cloud provider SDKs
            '@aws-sdk/client-bedrock',
            '@aws-sdk/client-bedrock-runtime',
            '@aws-sdk/client-sts',
            '@aws-sdk/credential-providers',
            '@azure/identity',
            'google-auth-library'
        ]
    });
} catch (error) {
    console.error('Build failed:');
    if (
        error &&
        typeof error === 'object' &&
        'errors' in error &&
        Array.isArray((error as { errors?: unknown[] }).errors)
    ) {
        for (const buildError of (
            error as { errors: Array<{ text?: string; detail?: unknown }> }
        ).errors) {
            console.error(
                buildError.text ??
                    String(buildError.detail ?? 'Unknown build error')
            );
        }
    } else {
        console.error(error);
    }
    process.exit(1);
}

console.log(`✓ Built chp v${version} → dist/cli.mjs`);

Warning: truncated output (original token count: 178612)
Total output lines: 16605

// @ts-nocheck
import type {
  DesktopExportArtifactInput,
  DesktopExportArtifactResult,
  DesktopExportPdfInput,
  DesktopExportPdfResult,
  DesktopRenderSlidesInput,
  DesktopRenderSlidesResult,
} from '@open-design/sidecar-proto';
import express from 'express';
import multer from 'multer';
import JSZip from 'jszip';
import { execFile, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import {
  composeOdNextStrategyBundleHeadV2,
  composeOdNextStrategyCorePromptV2,
  OD_NEXT_BUNDLE_ECHO_GUARD_V2,
  odNextStrategyRecipeIdentityV2,
  renderOdNextRuntimeFactsV2,
  composeOdNextStrategyStableRequestContextV2,
  executionProfileFromStreamFormat,
  PLUGIN_SHARE_ACTION_PLUGIN_IDS,
} from '@open-design/contracts';
import { isTodoWriteToolName, stopReasonIsTruncation, todoItemsFromTodoWriteInput } from '@open-design/contracts';
import type {
  CollabCloudMemberDirectoryEntry,
  TeamProject,
  WorkspaceCollabContext,
} from '@open-design/contracts';
import {
  detectOdNextDevicePlatformFromText,
  resolveOdNextDevicePlatform,
  selectOdNextDeviceFrameContextV2,
  selectOdNextLayoutPrimitivesCss,
} from '@open-design/contracts';
import {
  loadOdNextTaskResourcesForSnapshot,
  materializeOdNextDeviceFrames,
  observeOdNextDeviceShell,
  observeOdNextLayoutPrimitives,
} from './strategies/od-next/device-frames.js';
import {
  composeSystemPrompt,
  detectDeckIntentSignal,
  detectMediaIntentSignal,
  detectPlatformIntentSignal,
  extractUserAuthoredSignalText,
  renderConnectedExternalMcpDirective,
  resolveExclusiveSurface,
} from './prompts/system.js';
import {
  computeStableSectionHashes,
  serializeStableSections,
  type StableSectionHashes,
} from './prompts/stable-sections.js';
import { emittedRenderableQuestionForm } from './question-form-detect.js';
import { resolveProjectRoot } from './project-root.js';
import { OPEN_DESIGN_PLUGIN_ID } from './mcp-observability.js';
import {
  resolveDaemonCliPath,
  resolveDaemonPluginPreviewsDir,
  resolveDaemonResourceDir,
  resolveDaemonResourceRoot,
  resolveDataDir,
  resolveProcessResourcesPath,
} from './daemon-paths.js';
export {
  resolveDaemonCliPath,
  resolveDaemonPluginPreviewsDir,
  resolveDaemonResourceRoot,
  resolveDataDir,
} from './daemon-paths.js';
import {
  isStaticSpaFallbackRequest,
  registerStaticSpaFallback,
  resolveStaticSpaFallbackPath,
} from './static-spa.js';
export {
  isStaticSpaFallbackRequest,
  resolveStaticSpaFallbackPath,
} from './static-spa.js';
import {
  createCompatApiError,
  createCompatApiErrorResponse,
  sendApiError,
} from './http/api-errors.js';
export {
  createCompatApiError,
  createCompatApiErrorResponse,
} from './http/api-errors.js';
import {
  applyBakedPreviews,
  resolvePluginPreviewsDir,
  PLUGIN_PREVIEWS_ROUTE,
} from './plugins/plugin-preview-bakes.js';
import { userFacingAgentLabel } from './user-facing-agent-label.js';
import {
  buildBrowserUseRunState,
  collectBrowserUseDiscoveryFacts,
  isBrowserUseRequested,
  renderBrowserUseUnavailablePrompt,
} from './browser/index.js';
import {
  UPLOAD_DIR,
  composeChatAgentTextPayload,
  composeLiveInstructionPrompt,
  formatDesignFilesWorkspaceHint,
  formatProjectAttachmentHint,
  normalizeCommentAttachments,
  renderCommentAttachmentHint,
  resolveChatExtraAllowedDirs,
  describeStablePromptCache,
  designSystemIdFromPluginSnapshot,
  resolveEffectiveDesignSystemSelection,
  resolveResearchCommandContract,
  resolveSafeProjectAttachments,
  resolveSafePromptImagePaths,
  resolveOdNextRequestUserPrompt,
  excludeAcpImagePathsAlreadyDeliveredAsResources,
  selectPromptImagePaths,
} from './runtimes/chat-prompt-inputs.js';
import {
  writePromptAndEndStdin,
  applyClaudeStreamJsonRunBookkeeping,
  assertValidRuntimeDefFirstOutputTimeoutMs,
  assertValidRuntimeDefInactivityTimeoutMs,
  bufferedAntigravityGeminiFirstTokenAt,
  classifyChatRunCloseStatus,
  looksLikeGeminiJsonEventStream,
  resolveAcpStageTimeoutMs,
  resolveActiveInactivityTimeoutMs,
  resolveChatRunArtifactQuietPeriodMs,
  resolveChatRunFirstOutputTimeoutMs,
  resolveChatRunInactivityTimeoutMs,
  runtimeEmissionCountsAsAgentProgress,
  resolveChatRunShutdownGraceMs,
} from './runtimes/chat-run-lifecycle.js';
import { assertOdNextSemanticRequestFactProducerCoverage } from './runtimes/od-next-exact-input.js';
import {
  normalizeRunContextSelection,
  renderRunContextPrompt,
} from './runtimes/chat-run-context.js';
import {
  daemonAgentPayloadToPersistedAgentEvent,
  persistRunEventToAssistantMessage,
  flushRunMessageEvents,
  finalizeRunMessageEvents,
  persistRunFailureClassification,
  pinAssistantMessageOnRunCreate,
} from './runtimes/chat-run-messages.js';
import {
  createRunSideEffectLedger,
  foldEventIntoRunSideEffectLedger,
  resolveRunProjectKindForAnalytics,
  retryFinalResultForRunStatus,
  runArtifactCountForRun,
  runDesignSystemCreatedForRun,
  runFilesWrittenForRun,
  runPreviewModuleCountForRun,
  runRetryEventsForAnalytics,
  runSideEffectsForRun,
  scanRunEventsForFinishedProps,
  scanRunEventsForRetrySideEffects,
} from './runtimes/run-lifecycle-analytics.js';
export {
  composeChatAgentTextPayload,
  composeLiveInstructionPrompt,
  formatDesignFilesWorkspaceHint,
  formatProjectAttachmentHint,
  normalizeCommentAttachments,
  renderCommentAttachmentHint,
  resolveChatExtraAllowedDirs,
  describeStablePromptCache,
  designSystemIdFromPluginSnapshot,
  resolveEffectiveDesignSystemSelection,
  resolveResearchCommandContract,
  resolveSafeProjectAttachments,
  resolveSafePromptImagePaths,
  excludeAcpImagePathsAlreadyDeliveredAsResources,
  selectPromptImagePaths,
} from './runtimes/chat-prompt-inputs.js';
export {
  applyClaudeStreamJsonRunBookkeeping,
  assertValidRuntimeDefFirstOutputTimeoutMs,
  assertValidRuntimeDefInactivityTimeoutMs,
  bufferedAntigravityGeminiFirstTokenAt,
  classifyChatRunCloseStatus,
  looksLikeGeminiJsonEventStream,
  resolveAcpStageTimeoutMs,
  resolveActiveInactivityTimeoutMs,
  resolveChatRunArtifactQuietPeriodMs,
  resolveChatRunFirstOutputTimeoutMs,
  resolveChatRunInactivityTimeoutMs,
  runtimeEmissionCountsAsAgentProgress,
} from './runtimes/chat-run-lifecycle.js';
export {
  renderRunContextPrompt,
} from './runtimes/chat-run-context.js';
export {
  daemonAgentPayloadToPersistedAgentEvent,
  persistRunEventToAssistantMessage,
  pinAssistantMessageOnRunCreate,
} from './runtimes/chat-run-messages.js';
export {
  resolveRunProjectKindForAnalytics as __forTestResolveRunProjectKindForAnalytics,
  retryFinalResultForRunStatus as __forTestRetryFinalResultForRunStatus,
  runRetryEventsForAnalytics as __forTestRunRetryEventsForAnalytics,
  scanRunEventsForFinishedProps as __forTestScanRunEventsForFinishedProps,
  scanRunEventsForRetrySideEffects as __forTestScanRunEventsForRetrySideEffects,
} from './runtimes/run-lifecycle-analytics.js';

export { resolveProjectRoot };
import { createCommandInvocation } from '@open-design/platform';
import { SIDECAR_ENV } from '@open-design/sidecar-proto';
import {
  buildLiveArtifactsMcpServersForAgent,
  checkPromptArgvBudget,
  checkWindowsCmdShimCommandLineBudget,
  checkWindowsDirectExeCommandLineBudget,
  detectAgents,
  getAgentDef,
  isKnownModel,
  isKnownReasoningEffort,
  isKnownServiceTier,
  openDesignAmrRunAttempt,
  openDesignAmrTraceEnv,
  applyAgentLaunchEnv,
  resolveAgentLaunch,
  sanitizeCustomModel,
  spawnEnvForAgent,
} from './agents.js';
import {
  getRememberedLiveModels,
  preferFreshLiveModels,
  rememberLiveModels,
  resolveDefaultModelFromOptions,
  resolveModelForAgent,
  resolveModelForServiceTier,
} from './runtimes/models.js';
import { loadMmdRouteLaunchEnv } from './runtimes/mmd-routes.js';
import { withAcpHandshakeFailureGuidance } from './runtimes/acp-handshake-failure.js';
import { preflightCodexDefaultModel } from './runtimes/codex-model-preflight.js';
import { preparePromptFileForAgent } from './runtimes/prompt-file.js';
import { TerminalControlSequenceStripper } from './runtimes/terminal-control.js';
import {
  buildOpenCodeByokProviderConfig,
  BYOK_OPENCODE_PROVIDER_REQUIRED_MESSAGE,
} from './runtimes/byok-opencode.js';
import {
  extractPlainStreamArtifacts,
  persistPlainStreamArtifactList,
  plainStdoutFromRunEvents,
} from './runtimes/plain-stream.js';
import {
  readVelaLoginStatus,
  resolveAmrProfile,
} from './integrations/vela.js';
import { isAbortedOperationError } from './integrations/aborted-error.js';
import { projectResourceIdFor } from './integrations/vela-team-projects.js';
import {
  getTeamProjectMaterialization,
  latestTeamProjectMaterializationVersion,
  materializePulledTeamMirror,
  teamProjectMaterializationMatches,
  teamProjectMaterializationSupersedes,
} from './collab/team-mirror-materializer.js';
import { recoverAuthorizedTeamProjectPromotions } from './collab/team-mirror-promotion.js';
import {
  amrAccountFailureDetails,
  classifyAmrAccountFailureSignal,
} from './integrations/vela-errors.js';
import { amrModelLoadingCache } from './runtimes/amr-model-cache.js';
import {
  fetchVelaPresetModels,
  fetchVelaRemoteModelsWithRetry,
} from './runtimes/defs/amr.js';
import { migrateLegacyDataDirSync } from './migration/index.js';
import {
  consumedImportNonces,
  getDesktopAuthSecret,
  isDesktopAuthGateActive,
  isDesktopAuthRegistered,
  pruneExpiredImportNonces,
  resetDesktopAuthForTests,
  setDesktopAuthSecret,
  signDesktopImportToken,
  verifyDesktopImportToken,
} from './desktop-auth.js';
import { normalizeDaemonBindHost } from './daemon-startup.js';
export {
  isDesktopAuthGateActive,
  isDesktopAuthRegistered,
  resetDesktopAuthForTests,
  setDesktopAuthSecret,
  signDesktopImportToken,
  verifyDesktopImportToken,
} from './desktop-auth.js';
import { readCurrentAppVersionInfo } from './app-version.js';
import {
  findSkillById,
  listSkills,
  resolveSkillId,
  splitDerivedSkillId,
} from './skills.js';
import { resolveSkillCatalogScope } from './skill-catalog-scope.js';
import {
  activateWorkspaceTeamSkillIfStillShared,
  resolveAndActivateWorkspaceTeamSkill,
  skillIdFromWorkspaceTeamBinding,
  workspaceTeamSkillBindingActivationFence,
  workspaceTeamSkillBindingResourceId,
} from './skills/workspace-team-binding.js';
import { validateLinkedDirs } from './linked-dirs.js';
import { installFromTarget, uninstallById, sanitizeRepoName } from './library-install.js';
import {
  buildWindowsFolderDialogCommand,
  parseFolderDialogStdout,
  parseLinuxFolderDialogResult,
} from './native-folder-dialog.js';
import {
  AssetCacheError,
  assetCacheRewriteUrl,
  createPluginAssetCache,
  isCacheableExternalUrl,
} from './plugins/plugin-asset-cache.js';
import { defaultMediaExecutionPolicy, parseMediaExecutionPolicyInput } from './media/policy.js';
import {
  applySandboxRuntimeEnv,
  ensureSandboxRuntimeDirs,
  isSandboxModeEnabled,
  resolveSandboxRuntimeConfig,
} from './sandbox-mode.js';
import {
  backfillDesignSystemWorkspaceResources,
  buildUserDesignSystemArchive,
  createUserDesignSystem,
  deleteUserDesignSystem,
  digestDesignSystemContext,
  isTeamSyncedUserDesignSystem,
  LEGACY_DESIGN_SYSTEM_ARTIFACTS,
  linkUserDesignSystemProject,
  listDesignSystems,
  listUserDesignSystemFiles,
  listUserDesignSystemRevisions,
  readDesignSystem,
  readDesignSystemPackageInfo,
  readDesignSystemStaticFile,
  readUserDesignSystemFile,
  readUserDesignSystemFileBytes,
  resolveDesignSystemAssets,
  stripPrefixAndValidateId,
  syncUserDesignSystemAssetsFromFiles,
  updateUserDesignSystem,
  updateUserDesignSystemRevisionStatus,
  type UserDesignSystemInput,
} from './design-systems/index.js';
import {
  createWorkspaceOwnedDesignSystem as persistWorkspaceOwnedDesignSystem,
  deleteWorkspaceOwnedDesignSystem as removeWorkspaceOwnedDesignSystem,
} from './design-systems/workspace-owned-create.js';
import { createDesignSystemGenerationJobStore } from './design-systems/generation-jobs.js';
import { createDesignSystemServerServices } from './design-systems/server-services.js';
import {
  designSystemIdFromWorkspaceTeamBinding,
  designSystemLogicalResourceId,
  workspaceTeamDesignSystemBindingResourceId,
} from './design-systems/workspace-team-binding.js';
import { ownedDesignSystemSourceIsReady } from './design-systems/team-owner-materialization.js';
import {
  createDesignSystemBackingProjectPreparer,
  createLinkedProjectTeamResourceShareService,
} from './design-systems/team-project-share.js';
import { prepareDesignTokenContractRebuild } from './design-systems/token-contract-rebuild.js';
import { registerBrandRoutes } from './brand-routes.js';
import {
  authorizeCreatedProjectWorkspace,
  bindCreatedProjectToWorkspace,
  createCreatedProjectWorkspaceResolver,
  sendCreatedProjectWorkspaceError,
} from './collab/created-project-workspace.js';
import {
  applyDiffReviewDecisionToCwd,
  applyPlugin,
  buildConnectorProbe,
  defaultBundledRoot,
  dismissSkillPluginCandidate,
  doctorPlugin,
  FIRST_PARTY_ATOMS,
  generateSkillPluginDraft,
  getInstalledPlugin,
  getSnapshot,
  installFromLocalFolder,
  installPlugin,
  isDiffReviewSurfaceId,
  listSkillPluginCandidates,
  listInstalledPlugins,
  listIterationsForRun,
  MissingInputError,
  pluginPromptBlock,
  pruneExpiredSnapshots,
  readPluginLockfile,
  readVerifiedProjectExampleBinding,
  registerBuiltInAtomWorkers,
  registerBundledPlugins,
  registryRootsForDataDir,
  resolveLocalPluginBySource,
  restoreProjectSnapshotLink,
  resolvePluginSnapshot,
  runPipelineForRun,
  isSafePluginId,
  runStageWithRegistry,
  startSnapshotGc,
  uninstallPlugin,
} from './plugins/index.js';
import {
  activateWorkspaceTeamPluginIfStillShared,
  pluginIdFromWorkspaceTeamPluginBinding,
  resolveAndActivateWorkspaceTeamPlugin,
  resolvePluginFolder,
  resolveWorkspaceTeamPluginWithBindingGate,
  workspaceTeamPluginBindingActivationFence,
  workspaceTeamPluginBindingAllowsRead,
  workspaceTeamPluginBindingResourceId,
} from './plugins/registry.js';
import {
  marketplaceManifestUrlForRegistry,
  marketplaceRegistryIdFromUrl,
} from './plugins/marketplaces.js';
import {
  composeMemoryBody,
  extractFromMessage,
  listActiveRuleEntries,
  readMemoryConfig,
} from './memory.js';
import { runAutoExtractionCleanup } from './memory-cleanup.js';
import { attachAcpSession } from './agent-protocol/index.js';
import { attachPiRpcSession } from './agent-protocol/index.js';
import { attachDshProfileSession } from './agent-protocol/index.js';
import { stageAmrImagePaths } from './media/amr-image-staging.js';
import { ingestRoutineConnectorEvolution } from './automation-routine-evolution.js';
import { createClaudeStreamHandler } from './runtimes/claude-stream.js';
import { createAgentTitleMarkerStripper } from './title-marker.js';
import { createRoleMarkerGuard } from './role-marker-guard.js';
import { createToolLoopGuard, resolveToolLoopMode, type ToolLoopVerdict } from './tool-loop-guard.js';
import { diagnoseClaudeCliFailure } from './claude-diagnostics.js';
import { loadCritiqueConfigFromEnv } from './critique/config.js';
import { reconcileStaleRuns } from './critique/persistence.js';
import { runOrchestrator } from './critique/orchestrator.js';
import { createRunRegistry } from './critique/run-registry.js';
import { handleCritiqueInterrupt } from './critique/interrupt-handler.js';
import { handleCritiqueArtifact } from './critique/artifact-handler.js';
import {
  isCritiqueEnabled,
  parseEnvEnabled,
  parseRolloutPhase,
  type SkillCritiquePolicy,
} from './critique/rollout.js';
import { narrowProjectCritiqueOverride } from './critique/spawn-inputs.js';
import { createCopilotStreamHandler } from './copilot-stream.js';
import { createJsonEventStreamHandler } from './runtimes/json-event-stream.js';
import {
  ensureDetectedRuntimeVersions,
  getDetectedRuntimeVersions,
  ensureDetectedRuntimeCapabilities,
} from './runtimes/detection.js';
import { resolveBundledOdNextRuntimeCapability } from './runtimes/od-next-capability-gate.js';
import {
  createOdNextNativeBuildPackageBindings,
  nativeBuildPackageBindingMap,
} from './strategies/od-next/native-build-package.js';
import {
  resolveAutomaticContinuationEvidence,
  rolloutStopSignalForBlockedContinuation,
  type OdNextComplexProductionResolver,
  type OdNextExecutionPreflightResolver,
} from './strategies/od-next/automatic-continuation-service.js';
import {
  antigravityAuthGuidance,
  antigravityQuotaGuidance,
  classifyAgentAuthFailure,
  classifyAgentServiceFailure,
  cursorAuthGuidance,
  normalizeDeepSeekHarnessFailure,
} from './runtimes/auth.js';
import { readOpenCodeServiceFailure } from './runtimes/opencode-log.js';
import { createAgentStderrVisibilityFilter } from './amr-stderr-filter.js';
import { createQoderStreamHandler } from './runtimes/qoder-stream.js';
import { subscribe as subscribeFileEvents } from './project-watchers.js';
import { importFigmaFromBytes } from './figma/figma-import.js';
import { renderDesignSystemPreview } from './design-systems/preview.js';
import { renderDesignSystemShowcase } from './design-systems/showcase.js';
import { createChatRunService } from './runtimes/runs.js';
import { createInternalRunCreationService } from './services/internal-run-service.js';
import {
  createOdNextRunInputProjection,
  OdNextTaskInputSnapshotError,
  removeOdNextRunInputProjection,
} from './strategies/od-next/task-input-snapshot.js';
import {
  createOdNextInitialPromptBundleService,
  resolveOdNextPromptRecipeForRun,
} from './strategies/od-next/initial-prompt-bundle-service.js';
import { OdNextMachineProtocolStream } from './strategies/od-next/protocol.js';
import {
  blockAutomaticContinuation,
  prepareAutomaticStrategyContinuation,
  projectStrategyTask,
  odNextTurnMayInferDirectEditCompletion,
  odNextTurnMayInferProductionCompletion,
} from './strategies/od-next/automatic-simple-production.js';
import {
  odNextRolloutSignalForRun,
  readOdNextRolloutPolicy,
  stopModeForOdNextSignal,
} from './strategies/od-next/rollout.js';
import { latchOdNextRolloutStopOperationally } from './strategies/od-next/rollout-control-telemetry.js';
import {
  getStrategyTaskExecutionByRunId,
  reconcileStrategyTaskRunTerminal,
} from './strategies/task-store.js';
import {
  InvalidFrozenSkillPackageError,
  materializeFrozenSkillPackage,
  renderFrozenSkillRosterContext,
} from './strategies/od-next/frozen-skill-package.js';
import { odNextExampleReferenceFact } from './strategies/od-next/example-skill-source.js';
import { runtimeResumesSessionById } from './runtimes/types.js';
import {
  createRunLifecycleTracer,
  runLifecycleMarkersForStreamEvent,
  type RunLifecycleStreamEventMarkers,
} from './run-lifecycle-tracer.js';
import { deriveRunErrorCode, runResultFromStatus } from './run-result.js';
import { classifyRunFailure, isResumableFailure } from './run-failure-classification.js';
import { validateRunDeliverable } from './run-deliverable-validation.js';
import {
  POST_TOOL_RESUME_CONTINUATION_PROMPT,
  decidePostToolResumeRecovery,
  decideSafeRunRetry,
} from './run-retry-policy.js';
import {
  amrUserIdForRunAnalytics,
  scanRunEventsForUsageAnalytics,
} from './run-analytics-observability.js';
import {
  createRunArtifactBaselines,
  diffRunArtifacts,
  snapshotProjectArtifacts,
  snapshotProjectArtifactsAsync,
} from './run-artifact-fs.js';
import {
  AiHtmlVersionSnapshotError,
  artifactOriginForRun,
  snapshotAiHtmlVersionsForRun,
} from './run-html-version-snapshots.js';
import { reportRunCompletedFromDaemon } from './langfuse-bridge.js';
import {
  describeRunTelemetrySink,
  readRunTelemetrySinkConfig,
} from './langfuse-trace.js';
import { reconcileDurableRunTerminals } from './runtimes/run-terminal-reconciliation.js';
import { createTaskObservationRolloutService } from './observability/task-observation-rollout.js';
import { strategyTaskRunObservationId } from './observability/task-observation-aggregation.js';
import { collectCodexChildEvidence } from './runtimes/codex-child-evidence.js';
import {
  collectOpenCodeChildEvidenceFacts,
  createOpenCodeSanitizedExportLoader,
} from './runtimes/opencode-child-evidence.js';
import {
  InvalidOdNextExactSendPromptError,
  bindOdNextExactSendPromptEvidence,
  buildPromptStackTelemetry,
} from './prompt-telemetry.js';
import { newInsertId, readAnalyticsContext, type AnalyticsService } from './analytics.js';
import {
  agentIdToTracking,
  modelIdForTracking,
} from '@open-design/contracts/analytics';
import {
  mergeNoProxyWithLoopbackDefaults,
  redactSecrets,
  testAgentConnection,
  testProviderConnection,
  validateBaseUrl,
  validateBaseUrlResolved,
} from './connectionTest.js';
import { listProviderModels } from './integrations/provider-models.js';
import { importClaudeDesignZip } from './design/index.js';
import {
  defaultBaseUrlForFinalizeProtocol,
  finalizeDesignPackage,
  FinalizePackageLockedError,
  FinalizeUpstreamError,
  isFinalizeProviderProtocol,
} from './design/index.js';
import { buildDocumentPreview } from './document-preview.js';
import { lintArtifact, renderFindingsForAgent } from './lint-artifact.js';
import { loadCraftSections, resolveCraftRequirements } from './craft.js';
import { skillCwdAliasSegment, stageActiveSkill } from './cwd-aliases.js';
import { buildDesktopArtifactExportInput, buildDesktopPdfExportInput } from './pdf-export.js';
import { generateMedia } from './media/index.js';
import { resolveHyperFramesCliPath } from './media/hyperframes-runtime.js';
import { listElevenLabsVoiceOptions } from './integrations/elevenlabs-voices.js';
import { searchResearch, ResearchError } from './research/index.js';
import { openBrowser } from './browser/index.js';
import {
  AUDIO_DURATIONS_SEC,
  AUDIO_MODELS_BY_KIND,
  IMAGE_MODELS,
  MEDIA_ASPECTS,
  MEDIA_PROVIDERS,
  VIDEO_LENGTHS_SEC,
  VIDEO_MODELS,
} from './media/models.js';
import { readMaskedConfig, writeConfig } from './media/config.js';
import {
  listMediaTasksByProject,
  listRecentMediaTasks,
  reconcileMediaTasksOnBoot,
} from './media/tasks.js';
import { TASK_TTL_AFTER_DONE_MS, createMediaTaskStore } from './media/task-store.js';
import {
  MCP_TEMPLATES,
  buildAcpMcpServers,
  buildClaudeMcpJson,
  buildOpenCodeMcpConfigContent,
  isManagedProjectCwd,
  readMcpConfig,
  writeMcpConfig,
} from './mcp-config.js';
import {
  resolveExternalMcpServersForRun,
} from './run-tool-bundle.js';
import {
  beginAuth,
  exchangeCodeForToken,
  PendingAuthCache,
  refreshAccessToken,
} from './mcp-oauth.js';
import {
  clearToken,
  getToken,
  isTokenExpired,
  readAllTokens,
  setToken,
} from './mcp-tokens.js';
import {
  agentCliEnvForAgent,
  readAppConfig,
  readAppConfigSync,
  readPluginEnvKnobs,
  writeAppConfig,
} from './app-config.js';
import { OrbitService, formatLocalProjectTimestamp, renderOrbitTemplateSystemPrompt } from './orbit.js';
import { buildOrbitNoLiveArtifactSummary } from './orbit-agent-summary.js';
import {
  RoutineService,
  validateSchedule as validateRoutineSchedule,
  validateTarget as validateRoutineTarget,
} from './routines.js';
import { buildMcpInstallPayload } from './mcp-install-info.js';
import { createDiagnosticsExportHandler } from './diagnostics-export.js';
import { DIAGNOSTICS_EXPORT_PATH } from '@open-design/diagnostics';
import {
  createProjectArchiveStream,
  createBatchArchiveStream,
  createProjectFolder,
  decodeMultipartFilename,
  deleteProjectFile,
  assertSandboxProjectRootAvailable,
  deleteProjectFolder,
  detectEntryFile,
  ensureProject,
  ensureProjectSubdir,
  isRunTouchedProjectFile,
  isSafeId,
  listFiles,
  listProjectFolders,
  mimeFor,
  parseByteRange,
  projectDir,
  readProjectFile,
  renameProjectFile,
  removeProjectDir,
  resolveProjectDir,
  SandboxImportedProjectError,
  sanitizeName,
  sanitizePath,
  searchProjectFiles,
  stageProjectDirsForDelete,
  resolveProjectFilePath,
  writeProjectFile,
  reconcileHtmlArtifactManifest,
} from './projects.js';
import { validateArtifactManifestInput } from './artifacts/manifest.js';
import { ArtifactPublicationBlockedError } from './artifacts/publication-guard.js';
import {
  appendMessageStatusEvent,
  confirmPreviewCommentPinSeq,
  deleteConversation,
  deletePreviewComment,
  deleteProject as dbDeleteProject,
  deleteWorkspaceProject,
  deleteWorkspaceResourceByResourceId,
  deleteTemplate,
  getConversation,
  getDeployment,
  getDeploymentById,
  getMessage,
  getMessageTelemetryFinalizationState,
  getPreviewComment,
  getProjectCommentAnchorConversationId,
  getProjectPreviewComment,
  getProject,
  countWorkspaceProjectRefs,
  findTeamWorkspaceIdForProject,
  getWorkspaceProject,
  getWorkspaceProjectByProjectId,
  listWorkspaceProjectBindings,
  getTemplate,
  ensureWorkspaceProject,
  ensureTeamProjectCommentConversations,
  ensureWorkspaceResource,
  getWorkspaceResource,
  getWorkspaceResourceByResourceId,
  insertConversation,
  insertProject,
  insertRoutine,
  insertRoutineRun,
  insertScheduledRoutineRun,
  insertTemplate,
  latchConversationIntentSignals,
  readConversationIntentSignals,
  findTemplateByNameAndProject,
  updateTemplate,
  listProjectsAwaitingInput,
  listConversations,
  listDeployments,
  listLatestProjectRunStatuses,
  listMessages,
  listPreviewComments,
  listProjectPreviewComments,
  listProjects,
  listUnboundProjects,
  listTeamWorkspaceProjectShares,
  listTeamWorkspaceResourceWorkspaceIds,
  listWorkspaceProjects,
  listWorkspaceResources,
  listRoutines,
  listRoutineRuns,
  listTabs,
  listTemplates,
  getLatestRoutineRun,
  getRoutine,
  mergeSyncedPreviewComment,
  normalizeConversationSessionMode,
  deleteRoutine as dbDeleteRoutine,
  openDatabase,
  reorderPreviewComment,
  repairTeamProjectCommentAnchorConversations,
  setTabs,
  SYNC_KEEPS_UPDATED_AT,
  updateConversation,
  updatePreviewCommentAnchor,
  updatePreviewCommentStatus,
  updateProject,
  updateWorkspaceProject,
  setWorkspaceProjectMetadataRefreshPending,
  updateWorkspaceResource,
  rebindWorkspaceProject,
  updateRoutine,
  updateRoutineRun,
  clearAgentSession,
  upsertAgentSession,
  upsertDeployment,
  upsertMessage,
  upsertPreviewComment,
} from './db.js';
import {
  computeIncludeStable,
  hashStableInstructions,
  persistCapturedAgentSession,
  resolveAgentResumeContext,
  resolveAgentResumeFailurePolicy,
  resolveAgentResumePromptPolicy,
} from './agent-session-resume.js';
import {
  initialNativeSessionRecoveryMetadata,
  markNativeSessionAutoReseeded,
  markNativeSessionCaptured,
} from './native-session-recovery.js';
import {
  createLiveArtifact,
  deleteLiveArtifact,
  ensureLiveArtifactPreview,
  getLiveArtifact,
  listLiveArtifacts,
  listLiveArtifactRefreshLogEntries,
  readLiveArtifactCode,
  recoverStaleLiveArtifactRefreshes,
  updateLiveArtifact,
} from './live-artifacts/store.js';
import { refreshLiveArtifact } from './live-artifacts/refresh-service.js';
import {
  sendLiveArtifactRouteError,
  setLiveArtifactCodeHeaders,
  setLiveArtifactPreviewHeaders,
} from './live-artifacts/http-helpers.js';
import { registerConnectorRoutes } from './connectors/routes.js';
import { registerActiveContextRoutes } from './routes/active-context.js';
import { registerAutomationRoutes } from './routes/automation.js';
import { registerAttributionRoutes } from './routes/attribution.js';
import { registerDaemonRoutes } from './routes/daemon.js';
import { registerGenuiRoutes } from './routes/genui.js';
import { registerDesignSystemRoutes } from './routes/design-systems.js';
import { registerHostToolsRoutes } from './routes/host-tools.js';
import { registerHostedBashRoutes } from './routes/hosted-bash.js';
import { registerPluginAssetRoutes } from './routes/plugins/assets.js';
import { registerPluginMarketplaceRoutes } from './routes/plugins/marketplaces.js';
import { registerPluginEventRoutes, registerPluginRoutes, registerProjectPluginRoutes } from './routes/plugins/index.js';
import { registerMcpRoutes } from './mcp-routes.js';
import { registerXaiRoutes } from './routes/xai.js';
import { registerLiveArtifactRoutes } from './routes/live-artifact.js';
import { registerDesignSystemToolRoutes } from './routes/design-system-tool.js';
import { registerDeployRoutes, registerDeploymentCheckRoutes } from './routes/deploy.js';
import { registerMediaRoutes } from './routes/media.js';
import { registerProjectRoutes, registerProjectArtifactRoutes, registerProjectFileRoutes, registerProjectUploadRoutes, createEnforceWorkspaceProjectMutation } from './routes/project/index.js';
import { registerVelaRoutes } from './routes/vela.js';
import { registerFinalizeRoutes, registerImportRoutes, registerProjectExportRoutes } from './import-export-routes.js';
import { registerHandoffRoutes } from './routes/handoff.js';
import { EmptyTranscriptError, synthesizeHandoffPrompt } from './design/index.js';
import { TranscriptExportLockedError } from './transcript-export.js';
import { registerChatRoutes } from './routes/chat.js';
import { registerRunRoutes } from './routes/runs.js';
import { registerStrategyRolloutRoutes } from './routes/strategy-rollout.js';
import { registerTerminalRoutes } from './routes/terminal.js';
import { registerBrowserSessionRoutes } from './routes/browser-sessions.js';
import { createTerminalService } from './terminals.js';
import { createBrowserSessionService } from './browser-sessions.js';
import { registerSocialShareRoutes } from './routes/social-share.js';
import { registerOpenDesignPublicMetadataRoutes } from './routes/open-design-public-metadata.js';
import { registerWhatsNewRoutes } from './routes/whats-new.js';
import { registerMemoryRoutes } from './routes/memory.js';
import {
  createCollabPresenceCloudClient,
  registerCollabPresenceRoutes,
} from './routes/collab-presence.js';
import {
  registerCollabSyncRoutes,
  type TeamMirrorPullScope,
} from './routes/collab-sync.js';
import {
  emitWorkspaceEventToAllScopes,
  emitWorkspaceEventToScope,
  registerCollabContextRoutes,
} from './routes/collab-context.js';
import { registerTeamResourceRoutes } from './routes/team-resources.js';
import { registerTeamResourceShareRoutes } from './routes/team-resource-share.js';
import { createCollabRuntime } from './collab/runtime.js';
import { createSqlitePublicFilePublicationStore } from './collab/public-file-publication-store.js';
import {
  createActiveWorkspaceSelectionStore,
} from './collab/active-workspace-selection.js';
import {
  headerValue,
  resolveOptionalLocalWorkspaceRequestAuthority,
  workspaceResourceContext,
  workspaceResourceContextFromRequest,
} from './collab/workspace-resource-mutation.js';
import {
  createAuthorizeProjectRequest,
} from './collab/project-request-authority.js';
import { withLastKnownWorkspaceContext } from './collab/workspace-context.js';
import {
  createWorkspaceTypeRegistry,
  impossibleTeamShareRows,
  projectCollabScope,
} from './collab/team-share-scope.js';
import { resolveWorkspaceScope } from './collab/workspace-scope.js';
import {
  AmrWorkspaceScopeRequiredError,
  openDesignAmrTraceEnvForRun,
  pinRunWorkspaceScopeForProject,
} from './runtimes/project-amr-trace-env.js';
import {
  createWorkspaceDirectoryAuthorityBroker,
  createWorkspaceContextProviderFromEnv,
  fetchVelaWorkspaceDirectory,
  resolveVelaWorkspaceHubEventsEndpoint,
  velaWorkspaceDirectoryIdentity,
  workspaceContextFromDirectoryItem,
} from './collab/vela-workspace-context.js';
import { verifyWorkspaceRequestContext } from './collab/request-workspace-context.js';
import {
  createWorkspaceBillingRuntimeCoordinator,
  shouldEmitWorkspaceBillingRuntimeNudge,
  WorkspaceBillingAccessRevokedError,
} from './collab/workspace-billing-runtime.js';
import {
  AUTHORITATIVE_PROJECT_PRESENCE_CAPABILITY,
  startHubEventsSubscriber,
  WORKSPACE_DIRECTORY_EVENTS_CAPABILITY,
} from './collab/hub-events-subscriber.js';
import {
  createWorkspaceAuthorityHealthCoordinator,
  resolveWorkspaceAuthorityCacheMode,
} from './collab/workspace-authority-health.js';
import {
  recordWorkspaceAuthorityDecision,
  recordWorkspaceAuthorityInvalidation,
  recordWorkspaceAuthorityRealtimeTransition,
  recordWorkspaceAuthorityRevocationClear,
  recordWorkspaceAuthoritySuppressedRequest,
} from './metrics/workspace-authority.js';
import {
  createWorkspaceHubSubscriptionManager,
  type WorkspaceHubSubscriptionManager,
} from './collab/workspace-hub-subscriptions.js';
import {
  activeTeamWorkspaceIdentity,
  createProactiveContentPull,
  type ProactiveContentPullTarget,
} from './collab/proactive-content-pull.js';
import {
  backgroundPullMaxEntriesFromEnv,
  backgroundPullMaxCumulativeEntriesFromEnv,
  createBackgroundPullSizeGuard,
} from './collab/background-pull-size-guard.js';
import {
  inspectAuthorizedTeamProjectPull,
} from './collab/authorized-team-project-pull.js';
import { createProjectContentTransferStateStore } from './collab/project-content-transfer-state.js';
import {
  emitSharedProjectPullTiming,
  sharedProjectPullProfileEnabled,
} from './collab/pull-profile.js';
import { createSyncDigestReader } from './collab/sync-digest.js';
import {
  createCollabSyncSnapshotStore,
  parseMemberDirectorySnapshot,
  parseTeamProjectSnapshot,
} from './collab/sync-snapshot-store.js';
import { createPersistentSyncCache } from './collab/persistent-sync-cache.js';
import { createSwrCache } from './collab/swr-cache.js';
import {
  COLLAB_VELA_FANOUT_CONCURRENCY,
  ConcurrencyGate,
} from './collab/concurrency-gate.js';
import {
  createTeamResourceListCache,
  invalidateTeamResourceListingCaches,
} from './collab/team-resource-list-cache.js';
import { createVelaResourcePullBatcher } from './collab/vela-cli-resource-pull-batcher.js';
import {
  createRememberedTeamResourceScopes,
  type RememberedTeamResourceScopeLease,
} from './collab/remembered-team-resource-scopes.js';
import { readVelaControlApiContext } from './integrations/vela.js';
import {
  fetchBillingCheckoutUrl,
  fetchVelaBillingCatalog,
  fetchVelaBillingSummary,
  fetchVelaWorkspaceBillingProjection,
  isVelaWorkspaceAuthorizationError,
} from './integrations/vela-billing.js';
import { createAccountBillingSummaryCache } from './collab/account-billing-summary-cache.js';
import { createEventRefreshCoordinator } from './collab/event-refresh-coordinator.js';
import { createWorkspaceExactAuthorityCache } from './collab/workspace-exact-authority-cache.js';
import { createCollabPublishWatcher } from './collab/collab-publish-watcher.js';
import {
  isUnmaterializedSharedPlaceholder,
  SHARED_PROJECT_PLACEHOLDER_METADATA_KEY,
} from './collab/shared-project-placeholder.js';
import { recoverPersistedTeamShareOwnership } from './collab/persisted-team-share.js';
import { resolveProjectShareDir } from './collab/project-share-dir.js';
import { createTeamProjectsLister } from './collab/team-projects.js';
import {
  createTeamResourceShareService,
  teamResourceRequestScopeFromContext,
  teamResourceRequestScopeForWorkspaceId,
  unshareIfCurrentlyShared,
  type TeamResourceRequestScope,
  type TeamResourceShareRecord,
  type TeamResourceSharedReadOptions,
  type TeamResourceShareService,
} from './collab/team-resource-share.js';
import {
  materializeWorkspaceScopedTeamResource,
  readTeamResourceMaterialization,
  teamResourceMaterializationDir,
  teamResourceSourceKey,
  teamResourceWorkspaceRoot,
} from './collab/team-resource-materialization.js';
import { createTeamResourceVersionStore } from './collab/team-resource-version-store.js';
import {
  contextToResourceHubPrincipal,
  type ResourceHubPrincipal,
} from './collab/resource-principal.js';
import { createCollabCloudClientFromEnv } from './integrations/collab-cloud.js';
import { createCollabCloudService } from './collab/collab-cloud-service.js';
import {
  commentRelayLocalBindingMatches,
  createCommentRelayOutboxStore,
} from './collab/comment-relay-outbox.js';
import { createWorkspaceInvalidationPoller } from './collab/workspace-invalidation-poller.js';
import { createWorkspaceExactContextCache } from './collab/workspace-exact-context-cache.js';
import {
  handleHubProjectMetadataChanged,
  handleHubTeamProjectsChanged,
  handlePolledWorkspaceInvalidation,
  reconcileWorkspaceProjectMetadataWithRemote,
  reconcileWorkspaceProjectsWithRemote,
  reconcilerRemoteTeamProjects,
  type LocalTeamProjectBinding,
  type WorkspaceProjectsReconcilerDeps,
} from './collab/workspace-projects-reconciler.js';
import {
  createWorkspaceTeamResourceEventCoordinator,
  reconcileWorkspaceResourcesWithRemote,
  type LocalTeamResourceBinding,
  type MaterializedTeamResourceRef,
  type WorkspaceTeamResourceRefreshReason,
} from './collab/workspace-resources-reconciler.js';
import { createVelaCliCollabClientFromEnv } from './collab/vela-cli-collab-client.js';
import {
  createScopedVelaTeamProjectCatalogClientCache,
  createVelaCliTeamProjectCatalogClientFromEnv,
  createVelaCliTeamProjectCatalogFromEnv,
} from './collab/vela-cli-team-projects.js';
import { createTeamProjectsChangeEmitter } from './collab/team-projects-change-emitter.js';
import { registerTelemetryRoutes } from './routes/telemetry.js';
import {
  assembleExample,
  registerAtomRoutes,
  registerStaticResourceRoutes,
  rewriteSkillAssetUrls,
} from './routes/static-resource.js';
export { rewriteSkillAssetUrls } from './routes/static-resource.js';
import { registerRoutineRoutes, routineDbRowToContract } from './routes/routine.js';
import {
  bindProjectToPersistedAutomationWorkspace,
  normalizePersistedAutomationWorkspaceScope,
} from './automations/workspace-scope.js';
import { resolveAmrModelProbe } from './runtimes/amr-model-probe.js';
import { createPluginInstallationHelpers, normalizeProjectPluginFolderPath, resolveProjectChildDirectory } from './services/plugin-installation.js';
import { createPluginShareTaskStore } from './services/plugin-share-tasks.js';
import { getRouteRegistrationInventory, installRouteRegistrationGuard } from './route-registration-guard.js';
import { assertServerContextSatisfiesRoutes } from './route-context-contract.js';
import { configureConnectorCredentialStore, connectorService, FileConnectorCredentialStore } from './connectors/service.js';
import { composioConnectorProvider } from './connectors/composio.js';
import { configureComposioConfigStore } from './connectors/composio-config.js';
import {
  CHAT_TOOL_ENDPOINTS,
  CHAT_TOOL_OPERATIONS,
  PROJECT_EXPORT_TOOL_ENDPOINT,
  resolveChatToolTokenTtlMs,
  toolTokenRegistry,
} from './tool-tokens.js';
import {
  buildDeployFileSet,
  checkDeploymentUrl,
  CLOUDFLARE_PAGES_PROVIDER_ID,
  DeployError,
  deployToCloudflarePages,
  deployToVercel,
  isDeployProviderId,
  listCloudflarePagesZones,
  prepareDeployPreflight,
  publicDeployConfigForProvider,
  readDeployConfig,
  VERCEL_PROVIDER_ID,
  writeDeployConfig,
} from './deploy.js';
import {
  checkCloudflarePagesDeploymentLinks,
  cloudflarePagesDeploymentMetadata,
  cloudflarePagesProjectNameForDeploy,
  cloudflarePagesProjectNameFromDeployment,
  publicDeployment,
  publicDeployments,
} from './deploy/cloudflare-pages-helpers.js';
import {
  allowedBrowserPorts,
  configuredAllowedOrigins,
  isAllowedBrowserOrigin,
  isLocalSameOrigin,
  isZeroConfigClipperLibraryRequest,
  parseHostHeader,
} from './origin-validation.js';
import { registerLibraryRoutes } from './routes/library.js';
import {
  libraryExtensionAllowedOrigins,
  seedLibraryExtensionOrigins,
} from './library-tokens.js';
import { listLibraryTokenOrigins } from './library-store.js';
import {
  API_TOKEN_BASIC_CHALLENGE,
  apiTokenAuthorizationMatches,
  apiTokenFromEnv,
  isApiAuthDisabled,
  isApiTokenMiddlewareEnabled,
} from './api-token-auth.js';
import { createOpenDesignPublicMetadataService } from './services/open-design-public-metadata.js';
import { createWhatsNewService } from './services/whats-new.js';
import { execCommandViaLoginShell } from './services/login-shell.js';
import {
  OFFICIAL_MARKETPLACE_ID,
  createMarketplaceSeedHelpers,
} from './plugins/marketplace-seed.js';
import {
  PLUGIN_SHARE_ACTION_LABELS,
  USER_PLUGIN_SOURCE_KINDS,
  copyPluginFolderForProjectContext,
  detectSkillPluginCandidateOnRunSuccess,
  ensureGhReady,
  githubRepoNameFromPluginName,
  hasGeneratedPluginArtifacts,
  isPluginAuthoringRun,
  normalizePluginShareAction,
  reconcileAssistantMessageOnRunEnd,
  renderPluginBriefTemplate,
  renderPluginSharePrompt,
} from './plugins/share-helpers.js';
import { sanitizeArchiveFilename } from './projects/archive-filename.js';
import {
  isLoopbackHostname,
  isLoopbackPeerAddress,
  requireLocalDaemonRequest,
} from './http/local-daemon-request.js';
import { renderOAuthResultPage } from './http/oauth-result-page.js';
import { bearerTokenFromRequest, createToolRequestAuth } from './http/tool-request-auth.js';
import { HostedBashManager } from './hosted-bash.js';

/** @typedef {import('@open-design/contracts').ApiErrorCode} ApiErrorCode */
/** @typedef {import('@open-design/contracts').ApiError} ApiError */
/** @typedef {import('@open-design/contracts').ApiErrorResponse} ApiErrorResponse */
/** @typedef {import('@open-design/contracts').ChatRequest} ChatRequest */
/** @typedef {import('@open-design/contracts').ChatSseEvent} ChatSseEvent */
/** @typedef {import('@open-design/contracts').ProxyStreamRequest} ProxyStreamRequest */
/** @typedef {import('@open-design/contracts').ProxySseEvent} ProxySseEvent */
/** @typedef {import('@open-design/contracts').ProjectConversationCreatedSsePayload} ProjectConversationCreatedSsePayload */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = resolveProjectRoot(__dirname);
const RESOURCE_ROOT_ENV = 'OD_RESOURCE_ROOT';

const DAEMON_RESOURCE_ROOT = resolveDaemonResourceRoot({
  safeBases: [
    PROJECT_ROOT,
    resolveProcessResourcesPath(),
    process.env.OD_INSTALLATION_DIR,
  ],
});
// Built web app lives in `out/` — that's where Next.js writes the static
// export configured in next.config.ts. The folder name used to be `dist/`
// when this project shipped with Vite; the daemon serves whatever the
// frontend toolchain emits, no further config needed.
const STATIC_DIR = path.join(PROJECT_ROOT, 'apps', 'web', 'out');
// Baked plugin preview clips (scripts/bake-plugin-previews.mjs). Served at
// PLUGIN_PREVIEWS_ROUTE; their manifest rewrites html plugins' previews to a
// cheap poster + hover-play video in the home gallery.
const PLUGIN_PREVIEWS_DIR = resolveDaemonPluginPreviewsDir({
  resourceRoot: DAEMON_RESOURCE_ROOT,
  projectRoot: PROJECT_ROOT,
});
const OD_BIN = resolveDaemonCliPath();
export function resolveOpenDesignNodeBin({
  env = process.env,
  execPath = process.execPath,
  platform = process.platform,
  resourceRoot = DAEMON_RESOURCE_ROOT,
  exists = fs.existsSync,
}: {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  execPath?: string;
  platform?: NodeJS.Platform;
  resourceRoot?: string | null;
  exists?: (path: string) => boolean;
} = {}): string {
  const configured = env.OD_NODE_BIN?.trim();
  if (configured) return configured;

  const bundledName = platform === 'win32' ? 'node.exe' : 'node';
  const bundled = resourceRoot
    ? (platform === 'win32' ? path.win32 : path).join(resourceRoot, 'bin', bundledName)
    : null;
  if (bundled && exists(bundled)) return bundled;

  return execPath;
}

const OD_NODE_BIN = resolveOpenDesignNodeBin();
const SKILLS_DIR = resolveDaemonResourceDir(
  DAEMON_RESOURCE_ROOT,
  'skills',
  path.join(PROJECT_ROOT, 'skills'),
);
const DESIGN_SYSTEMS_DIR = resolveDaemonResourceDir(
  DAEMON_RESOURCE_ROOT,
  'design-systems',
  path.join(PROJECT_ROOT, 'design-systems'),
);
// Renderable templates pulled out of `skills/` by the skills/design-templates
// split (PR #955) so the EntryView Templates tab gets the large rendering
// catalogue and Settings → Skills only carries functional skills the agent
// invokes mid-task. See specs/current/skills-and-design-templates.md.
const DESIGN_TEMPLATES_DIR = resolveDaemonResourceDir(
  DAEMON_RESOURCE_ROOT,
  'design-templates',
  path.join(PROJECT_ROOT, 'design-templates'),
);
const CRAFT_DIR = resolveDaemonResourceDir(
  DAEMON_RESOURCE_ROOT,
  'craft',
  path.join(PROJECT_ROOT, 'craft'),
);
// User-installed skills and design systems live under the runtime data dir
// so they respect OD_DATA_DIR overrides (test isolation, packaged runs).
// Defined after RUNTIME_DATA_DIR is resolved below.
const FRAMES_DIR = resolveDaemonResourceDir(
  DAEMON_RESOURCE_ROOT,
  'frames',
  path.join(PROJECT_ROOT, 'assets', 'frames'),
);
// Curated pets baked into the repo via `scripts/bake-community-pets.ts`.
// `listCodexPets` scans this in addition to `~/.codex/pets/` so the
// "Recently hatched" grid is non-empty out-of-the-box and users do not
// need to hit the "Download community pets" button to try a few pets.
const BUNDLED_PETS_DIR = resolveDaemonResourceDir(
  DAEMON_RESOURCE_ROOT,
  'community-pets',
  path.join(PROJECT_ROOT, 'assets', 'community-pets'),
);
const PROMPT_TEMPLATES_DIR = resolveDaemonResourceDir(
  DAEMON_RESOURCE_ROOT,
  'prompt-templates',
  path.join(PROJECT_ROOT, 'prompt-templates'),
);
const BUNDLED_PLUGINS_DIR = resolveDaemonResourceDir(
  DAEMON_RESOURCE_ROOT,
  path.join('plugins', '_official'),
  defaultBundledRoot(PROJECT_ROOT),
);
const PLUGIN_REGISTRY_DIR = resolveDaemonResourceDir(
  DAEMON_RESOURCE_ROOT,
  'plugins/registry',
  path.join(PROJECT_ROOT, 'plugins', 'registry'),
);
const {
  bundledPluginRegistrySource,
  createMarketplaceFetcher,
  defaultMarketplaceSeedConfig,
  marketplaceSeedManifestText,
} = createMarketplaceSeedHelpers({
  bundledPluginsDir: BUNDLED_PLUGINS_DIR,
  projectRoot: PROJECT_ROOT,
  pluginRegistryDir: PLUGIN_REGISTRY_DIR,
  marketplaceManifestUrlForRegistry,
  marketplaceRegistryIdFromUrl,
});

const SANDBOX_MODE_ENABLED = isSandboxModeEnabled(process.env);
const RUNTIME_DATA_DIR = resolveDataDir(process.env.OD_DATA_DIR, PROJECT_ROOT, {
  requireExplicit: SANDBOX_MODE_ENABLED,
});
const SANDBOX_RUNTIME = resolveSandboxRuntimeConfig(SANDBOX_MODE_ENABLED, RUNTIME_DATA_DIR);
ensureSandboxRuntimeDirs(SANDBOX_RUNTIME);
const PLUGIN_LOCKFILE_PATH = path.join(RUNTIME_DATA_DIR, 'od-plugin-lock.json');
// Canonical (realpath-resolved) form of RUNTIME_DATA_DIR for the few callers
// that compare it against a user-supplied realpath() result. On macOS, /var
// is a symlink to /private/var, so an import realpath lands in /private/var
// and would never start-with the raw RUNTIME_DATA_DIR. Keep RUNTIME_DATA_DIR
// itself as the stable, user-shaped path so OD_DATA_DIR resolution stays
// predictable; only this canonical alias is used for symlink-aware checks.
const RUNTIME_DATA_DIR_CANONICAL = (() => {
  try {
    return fs.realpathSync(RUNTIME_DATA_DIR);
  } catch {
    return RUNTIME_DATA_DIR;
  }
})();
// One-shot legacy data migration. When OD_LEGACY_DATA_DIR is set and the
// new data root is fresh (no app.sqlite), copy the 0.3.x .od/ payload
// across before SQLite opens. Synchronous on purpose: openDatabase below
// would race an async copy. See apps/daemon/src/legacy-data-migrator.ts
// and https://github.com/nexu-io/open-design/issues/710.
migrateLegacyDataDirSync({
  legacyDir: process.env.OD_LEGACY_DATA_DIR,
  dataDir: RUNTIME_DATA_DIR,
});
const ARTIFACTS_DIR = path.join(RUNTIME_DATA_DIR, 'artifacts');
// Critique Theater artifacts intentionally live outside the static
// `/artifacts` tree. The per-run artifact endpoint is the sanctioned
// read path so project-membership, size, and CSP guards cannot be bypassed.
const CRITIQUE_ARTIFACTS_DIR = path.join(RUNTIME_DATA_DIR, 'critique-artifacts');
const PROJECTS_DIR = path.join(RUNTIME_DATA_DIR, 'projects');
const USER_SKILLS_DIR = path.join(RUNTIME_DATA_DIR, 'skills');
const USER_DESIGN_SYSTEMS_DIR = path.join(RUNTIME_DATA_DIR, 'design-systems');
// Brand metadata (brand.json + meta.json per brand) lives here; each brand
// also registers a `user:<id>` design system under USER_DESIGN_SYSTEMS_DIR.
const BRANDS_DIR = path.join(RUNTIME_DATA_DIR, 'brands');
const PLUGIN_REGISTRY_ROOTS = registryRootsForDataDir(RUNTIME_DATA_DIR);
// Disk cache + same-origin proxy for external preview media (cross-border CDN
// images/videos referenced by plugin example.html). See plugin-asset-cache.ts.
const pluginAssetCache = createPluginAssetCache({
  cacheDir: path.join(RUNTIME_DATA_DIR, 'plugin-asset-cache'),
});
// User-imported design templates mirror USER_SKILLS_DIR but are scanned
// against DESIGN_TEMPLATES_DIR rather than SKILLS_DIR so the EntryView
// Templates surface and the Settings → Skills surface stay decoupled.
const USER_DESIGN_TEMPLATES_DIR = path.join(RUNTIME_DATA_DIR, 'design-templates');
// Multi-root tuples used everywhere the daemon resolves a skill / template
// id without knowing which surface it came from. SKILL_ROOTS drives
// Settings → Skills; DESIGN_TEMPLATE_ROOTS drives the EntryView Templates
// gallery; ALL_SKILL_LIKE_ROOTS spans both for chat run system-prompt
// composition and the orbit template resolver, where stored project ids
// can resolve to either root after the split.
const SKILL_ROOTS = [USER_SKILLS_DIR, SKILLS_DIR];
const DESIGN_TEMPLATE_ROOTS = [USER_DESIGN_TEMPLATES_DIR, DESIGN_TEMPLATES_DIR];
const ALL_SKILL_LIKE_ROOTS = [
  USER_SKILLS_DIR,
  USER_DESIGN_TEMPLATES_DIR,
  SKILLS_DIR,
  DESIGN_TEMPLATES_DIR,
];
// Global OD Library data root — owned, content-addressed assets captured by
// the clipper / `od library import`. Derived from RUNTIME_DATA_DIR per the
// daemon data directory contract.
const LIBRARY_DIR = path.join(RUNTIME_DATA_DIR, 'library');
fs.mkdirSync(PROJECTS_DIR, { recursive: true });
for (const dir of [USER_SKILLS_DIR, USER_DESIGN_SYSTEMS_DIR, BRANDS_DIR, USER_DESIGN_TEMPLATES_DIR, PLUGIN_REGISTRY_ROOTS.userPluginsRoot, LIBRARY_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}
fs.mkdirSync(CRITIQUE_ARTIFACTS_DIR, { recursive: true });
const orbitService = new OrbitService(RUNTIME_DATA_DIR);
const designSystemGenerationJobs = createDesignSystemGenerationJobStore({
  root: USER_DESIGN_SYSTEMS_DIR,
});
let routineService = null;

// In-memory OAuth state cache. Lives for the daemon process's lifetime.
// Maps the OAuth `state` parameter we generated in /api/mcp/oauth/start
// to the verifier + endpoint info needed to finish the exchange when the
// browser hits /api/mcp/oauth/callback.
const mcpPendingAuth = new PendingAuthCache();

/**
 * Resolve the daemon's public base URL — the origin the user's browser
 * (or the OAuth provider) reaches us at. Order of precedence:
 *
 *   1. `OD_PUBLIC_BASE_URL` env var. Cloud and packaged-electron deployments
 *      set this to the externally-routable URL (e.g. `https://app.example.com`).
 *   2. `req.protocol://req.get('host')` from the inbound request. Works in
 *      local dev and most reverse-proxy setups (Express respects
 *      `trust proxy` so X-Forwarded-* headers are honored).
 *
 * The OAuth callback URI is derived from this — it MUST be reachable from
 * the user's browser, otherwise the redirect after auth lands on
 * ERR_CONNECTION_REFUSED. Misconfiguration is loud: the OAuth provider
 * will reject `redirect_uri` mismatches.
 */
function getPublicBaseUrl(req) {
  const env = process.env.OD_PUBLIC_BASE_URL;
  if (env && /^https?:\/\//i.test(env)) {
    return env.replace(/\/+$/u, '');
  }
  const proto = req.protocol || 'http';
  const host = req.get('host');
  if (!host) return `http://localhost:${process.env.OD_PORT ?? '7456'}`;
  return `${proto}://${host}`;
}

function mcpOAuthCallbackUrl(req) {
  return `${getPublicBaseUrl(req)}/api/mcp/oauth/callback`;
}

/**
 * Refresh an expired token using the OAuth client context that the original
 * authorization-code exchange persisted alongside the token. Refresh tokens
 * are bound (RFC 6749 §6) to the client that received them, so we MUST
 * refresh against the same `tokenEndpoint` / `clientId` / `clientSecret`
 * pair — re-running discovery with a different redirect URI would risk
 * registering a new client_id that the upstream then rejects the refresh
 * for. Tokens persisted before that context was recorded can't be safely
 * refreshed; the caller treats `null` as "needs reconnect".
 */
async function refreshAndPersistToken(dataDir, serverId, current) {
  if (!current.refreshToken) return null;
  if (!current.tokenEndpoint || !current.clientId) return null;
  const tokenResp = await refreshAccessToken({
    tokenEndpoint: current.tokenEndpoint,
    clientId: current.clientId,
    clientSecret: current.clientSecret,
    refreshToken: current.refreshToken,
    scope: current.scope,
    resource: current.resourceUrl,
  });
  const next = {
    accessToken: tokenResp.access_token,
    refreshToken: tokenResp.refresh_token ?? current.refreshToken,
    tokenType: tokenResp.token_type ?? 'Bearer',
    scope: tokenResp.scope ?? current.scope,
    expiresAt:
      typeof tokenResp.expires_in === 'number'
        ? Date.now() + tokenResp.expires_in * 1000
        : undefined,
    savedAt: Date.now(),
    tokenEndpoint: current.tokenEndpoint,
    clientId: current.clientId,
    clientSecret: current.clientSecret,
    authServerIssuer: current.authServerIssuer,
    redirectUri: current.redirectUri,
    resourceUrl: current.resourceUrl,
  };
  await setToken(dataDir, serverId, next);
  return next;
}

const activeChatAgentEventSinks = new Map();
const activeProjectEventSinks = new Map();
// Collab realtime hop-2: subscribers to the WORKSPACE-scoped invalidation SSE
// (`GET /api/workspace/events`). Every connection is freshly verified for an
// exact Workspace/member pair; sinks are partitioned by Workspace so one
// daemon can safely serve tabs viewing A and B concurrently. Delivery is
// workspace-wide within a partition because roster/catalog/context/team
// billing invalidations legitimately affect every member of that Workspace.
const workspaceEventSinks =
  new Map<string, Set<(payload: unknown) => void>>();
// Per-chat-run handles, keyed by runId. Lets non-stream side effects
// (live-artifact create, project events) reach back into the chat
// run's local state — currently used by the artifact quiet-period
// shortcut (#1451) so a successful artifact registration can shorten
// the inactivity watchdog without the chat path having to poll a
// store.
const activeChatRunHandles = new Map();

function emitChatAgentEvent(runId, payload) {
  const sink = activeChatAgentEventSinks.get(runId);
  if (!sink) return false;
  return sink(payload);
}

// Exported for tests covering the artifact quiet-period plumbing
// (#1451). The chat run path is a deep closure inside startServer, so
// pin the hook contract at the emit/handle boundary instead of
// driving a full fake-agent e2e for every invariant.
export const __forTestChatRunHandles = activeChatRunHandles;

export function __forTestEmitLiveArtifactEvent(
  grant: { runId?: string; projectId?: string },
  action: 'created' | 'updated' | 'deleted',
  artifact: { id: string; projectId?: string; title?: string; refreshStatus?: string },
) {
  return emitLiveArtifactEvent(grant, action, artifact);
}

function emitLiveArtifactEvent(grant, action, artifact) {
  if (!artifact?.id) return false;
  const payload = {
    type: 'live_artifact',
    action,
    projectId: artifact.projectId ?? grant.projectId,
    artifactId: artifact.id,
    title: artifact.title ?? artifact.id,
    refreshStatus: artifact.refreshStatus,
  };
  let emitted = emitProjectEvent(payload.projectId, payload);
  if (grant?.runId) emitted = emitChatAgentEvent(grant.runId, payload) || emitted;
  // After the deliverable exists, switch the chat run into a shorter
  // "quiet period" watchdog: agents sometimes keep their child process
  // alive after a successful artifact write (post-write reasoning, log
  // flushes, claude-code stream-json's idle stdin) and the 10-minute
  // default leaves the UI parked on Working until the watchdog fires
  // an unrelated "stalled" error. See #1451.
  if (action === 'created' && grant?.runId) {
    const handle = activeChatRunHandles.get(grant.runId);
    if (handle?.noteArtifactRegistered) {
      try { handle.noteArtifactRegistered(); } catch {}
    }
  }
  return emitted;
}

function emitLiveArtifactRefreshEvent(grant, payload) {
  if (!payload?.artifactId) return false;
  const event = {
    type: 'live_artifact_refresh',
    projectId: grant.projectId,
    ...payload,
  };
  let emitted = emitProjectEvent(grant.projectId, event);
  if (grant?.runId) emitted = emitChatAgentEvent(grant.runId, event) || emitted;
  return emitted;
}

// Broadcast an event to every SSE subscriber currently watching the given
// project's `/api/projects/:id/events` stream. The payload's `type` field
// becomes the SSE event name (see routes/project/index.ts). Used for live-artifact
// events and `conversation-created` events emitted by routine runs (#1361).
function emitProjectEvent(projectId, payload) {
  const sinks = activeProjectEventSinks.get(projectId);
  if (!sinks || sinks.size === 0) return false;
  for (const sink of Array.from(sinks)) {
    try {
      sink(payload);
    } catch {
      sinks.delete(sink);
    }
  }
  if (sinks.size === 0) activeProjectEventSinks.delete(projectId);
  return true;
}

// Broadcast a thin WORKSPACE-scoped invalidation only to the verified sink
// partition for `workspaceId`. There is deliberately no account-wide fallback:
// every producer below is attached to an explicit hub/poller/billing/project
// scope, and broad delivery would reveal cross-workspace activity timing.
function emitWorkspaceEvent(
  workspaceId: string,
  payload: { type: string; at?: number },
): boolean {
  return emitWorkspaceEventToScope(
    workspaceEventSinks,
    workspaceId,
    payload,
  );
}

function emitWorkspaceDirectoryChanged(): boolean {
  return emitWorkspaceEventToAllScopes(workspaceEventSinks, {
    type: 'workspace-directory-changed',
    at: Date.now(),
  });
}

function hubEventRefreshToken(event: {
  type?: string;
  revision?: string;
  revisionClock?: { epoch: string; counter: string };
  workspaceMemberId?: string;
  memberId?: string;
  projectId?: string;
  resourceId?: string;
  seq?: number;
  version?: number;
  at?: string;
}): string | undefined {
  const scope = [
    event.type ?? '',
    event.workspaceMemberId ?? '',
    event.memberId ?? '',
    event.projectId ?? '',
    event.resourceId ?? '',
  ].join(':');
  if (event.revisionClock) {
    return `${scope}:clock:${event.revisionClock.epoch}:${event.revisionClock.counter}`;
  }
  if (event.revision) return `${scope}:revision:${event.revision}`;
  if (event.seq != null) return `${scope}:seq:${event.seq}`;
  if (event.version != null) return `${scope}:version:${event.version}`;
  if (event.at) return `${scope}:at:${event.at}`;
  return undefined;
}

function accountBillingInvalidationToken(event: {
  type: 'billing-changed' | 'billing-subscription-changed' | 'wallet-balance-changed';
  revision?: string;
  revisionClock?: { epoch: string; counter: string };
  at?: string;
}): string | undefined {
  let revision: string | undefined;
  if (event.revisionClock) {
    revision = `clock:${event.revisionClock.epoch}:${event.revisionClock.counter}`;
  } else if (event.revision) {
    revision = `revision:${event.revision}`;
  } else if (event.at) {
    revision = `at:${event.at}`;
  }
  if (!revision) return undefined;
  // Current Vela producers emit a subscription mutation under both names.
  // Wallet clocks are independent and therefore need a separate domain.
  const domain = event.type === 'wallet-balance-changed' ? 'wallet' : 'billing';
  return `${domain}:${revision}`;
}

/**
 * Hub → daemon handling for the `workspace-context-changed` event (see
 * `startHubEventsSubscriber`'s `onEvent` below). Vela sends this same event
 * both for directory changes and membership changes (e.g. removal from a
 * team). Besides forwarding the thin signal to the web, this kicks one
 * immediate background reconciliation cycle. Request mutations independently
 * perform fresh exact-scope authority checks and do not depend on this poll.
 *
 * Extracted as its own named, exported step (rather than inlined in the
 * switch) so this invariant is directly unit-testable without standing up a
 * real hub connection.
 */
export function handleHubWorkspaceContextChanged(
  workspaceId: string,
  pollWorkspaceInvalidation: () => Promise<void>,
  invalidateWorkspaceDirectory: () => void = () => undefined,
): Promise<void> {
  // Retire the settled authority generation before either the web or the
  // daemon can start a refresh. A directory request that began before this
  // event is allowed to finish for its original caller, but the broker will
  // not let it repopulate the post-event generation.
  invalidateWorkspaceDirectory();
  emitWorkspaceEvent(
    workspaceId,
    { type: 'workspace-context-changed', at: Date.now() },
  );
  return pollWorkspaceInvalidation().catch(() => undefined);
}

/** Terminal counterpart to workspace-context-changed. Vela has already
 * re-derived the stream principal and is closing the connection, so local
 * directory and billing projections must be retired synchronously before any
 * reconciliation I/O starts. */
export function handleHubWorkspaceAccessRevoked(
  workspaceId: string,
  pollWorkspaceInvalidation: () => Promise<void>,
  invalidateWorkspaceDirectory: () => void,
  revokeWorkspaceBilling: (workspaceId: string) => void,
): void {
  invalidateWorkspaceDirectory();
  revokeWorkspaceBilling(workspaceId);
  emitWorkspaceEvent(
    workspaceId,
    { type: 'workspace-context-changed', at: Date.now() },
  );
  void pollWorkspaceInvalidation().catch(() => undefined);
}

/**
 * A verified hub connection is itself a freshness boundary, including the
 * daemon's very first connection. Published content and billing may already
 * have changed before the subscriber came online, so both scopes catch up
 * immediately instead of waiting for a later reconnect or poll tick.
 */
export function handleHubVerifiedConnection(
  workspaceId: string | undefined,
  catchUpPublishedHeads: (workspaceId: string) => Promise<void>,
  catchUpWorkspaceBilling: (workspaceId: string) => void,
): void {
  if (!workspaceId) return;
  void catchUpPublishedHeads(workspaceId).catch(() => undefined);
  catchUpWorkspaceBilling(workspaceId);
}

// Windows ENAMETOOLONG mitigation constants
const CMD_BAT_RE = /\.(cmd|bat)$/i;
const PROMPT_TEMP_FILE = () =>
  '.od-prompt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.md';
const promptFileBootstrap = (fp) =>
  `Your full instructions are stored in the file: ${fp.replace(/\\/g, '/')}. ` +
  'Open that file first and follow every instruction in it exactly — ' +
  'it contains the system prompt, design system, skill workflow, and user request. ' +
  'Do not begin your response until you have read the entire file.';

// Load Critique Theater config once at startup so a bad OD_CRITIQUE_* value
// surfaces immediately as a boot-time RangeError instead of silently at
// run time. Default: enabled=false (M0 dark launch).
const critiqueCfg = loadCritiqueConfigFromEnv();
// Per-run baselines of the project's artifact files, captured before the agent
// runs and diffed at run-finish to derive `artifact_count` agent-agnostically
// (see `run-artifact-fs.ts`). Keyed by run id because the run-start scope and
// the run-finished analytics scope are different closures. The registry also
// flags runs that overlapped another run in the same cwd as `contended`; those
// must not trust the whole-tree diff (it would cross-attribute writes) and fall
// back to the per-run tool-stream count.
const runArtifactBaselines = createRunArtifactBaselines();
// Tracks adapter streamFormat values that have already received a one-time
// warning explaining why the Critique Theater orchestrator was bypassed.
// Adapter denylist for orchestrator routing is implicit: anything that is
// not the 'plain' streamFormat falls through to legacy single-pass.
const critiqueWarnedAdapters = new Set<string>();

// In-process registry of in-flight critique runs so the interrupt endpoint
// can cascade an AbortController to the matching orchestrator invocation.
// Created once per process; not persisted across daemon restarts.
const critiqueRunRegistry = createRunRegistry();
export const SSE_KEEPALIVE_INTERVAL_MS = 25_000;

export function createAgentRuntimeEnv(
  baseEnv: NodeJS.ProcessEnv | Record<string, string | undefined>,
  daemonUrl: string,
  toolTokenGrant: { token?: string } | null = null,
  nodeBin: string = OD_NODE_BIN,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = applySandboxRuntimeEnv(
    {
      ...baseEnv,
      OD_DATA_DIR: RUNTIME_DATA_DIR,
      OD_DAEMON_URL: daemonUrl,
      OD_NODE_BIN: nodeBin,
    },
    SANDBOX_RUNTIME,
  );
  // The daemon API token authorizes the whole non-loopback API surface. Agent
  // children receive only their run-scoped tool capability, never that broad
  // credential inherited from the daemon process (including Windows casing).
  for (const key of Object.keys(env)) {
    if (key.toUpperCase() === 'OD_API_TOKEN') delete env[key];
  }
  // A GUI-launched daemon can inherit a broken PATHEXT such as `.CPL` (issue
  // #6934). Nested native commands then lose stdout/stderr or fail with
  // ERROR_NO_DATA. On Windows, recover a usable executable-extension list while
  // preserving an already-valid value and the inherited key casing.
  if (process.platform === 'win32') {
    const pathextKey =
      Object.keys(env).find((key) => key.toLowerCase() === 'pathext') ?? 'PATHEXT';
    const pathextValue = typeof env[pathextKey] === 'string' ? (env[pathextKey] as string) : '';
    if (!/\.exe/i.test(pathextValue)) {
      env[pathextKey] = '.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC';
    }
  }
  const sidecarIpcPath = baseEnv[SIDECAR_ENV.IPC_PATH];
  if (typeof sidecarIpcPath === 'string' && sidecarIpcPath.length > 0) {
    env[SIDECAR_ENV.IPC_PATH] = sidecarIpcPath;
  }
  if (SANDBOX_RUNTIME.enabled) {
    const noProxy = mergeNoProxyWithLoopbackDefaults(env.NO_PROXY ?? env.no_proxy);
    if (noProxy) {
      env.NO_PROXY = noProxy;
      if (process.platform !== 'win32') env.no_proxy = noProxy;
    }
  }

  // Ensure the node binary directory is on PATH so agent sub-processes —
  // in particular npm .cmd shims on Windows that run `"node" script.js` —
  // can find the same node binary that runs the daemon even when the daemon
  // was launched with a full path to node and the directory was not on PATH.
  const nodeBinDir = path.dirname(nodeBin);
  if (nodeBinDir) {
    // On Windows, process.env spreads with the search path under 'Path' rather
    // than 'PATH'. Locate the key case-insensitively so we read and write the
    // same entry that child_process.spawn consults. If we blindly write a new
    // 'PATH' key alongside an existing 'Path', Node's case-insensitive env
    // de-duplication on Windows lets the new key win — dropping all inherited
    // directories (git, npm, agent shims, etc.) from the child's search path.
    const pathKey = Object.keys(env).find((k) => k.toLowerCase() === 'path') ?? 'PATH';
    const existingPath = typeof env[pathKey] === 'string' ? (env[pathKey] as string) : '';
    const parts = existingPath.split(path.delimiter).filter((p) => p.length > 0);
    const normalize = (p: string) => p.replace(/[/\\]+$/, '');
    const normalizedDir = normalize(nodeBinDir);
    const alreadyIncluded = parts.some((p) => {
      const n = normalize(p);
      return process.platform === 'win32'
        ? n.toLowerCase() === normalizedDir.toLowerCase()
        : n === normalizedDir;
    });
    if (!alreadyIncluded) {
      env[pathKey] = [nodeBinDir, ...parts].join(path.delimiter);
    }
  }

  if (toolTokenGrant?.token) {
    env.OD_TOOL_TOKEN = toolTokenGrant.token;
  } else {
    delete env.OD_TOOL_TOKEN;
  }

  return env;
}

export function createAgentRuntimeToolPrompt(
  daemonUrl: string,
  toolTokenGrant: { token?: string } | null = null,
): string {
  const tokenLine = toolTokenGrant?.token
    ? '- `OD_TOOL_TOKEN` is available in your environment for this run. Use it only through project wrapper commands; do not print, persist, or override it.'
    : '- `OD_TOOL_TOKEN` is not available for this run, so `/api/tools/*` wrapper commands may be unavailable.';

  return [
    '## Runtime tool environment',
    '',
    `- Daemon URL: \`${daemonUrl}\` (also available as \`OD_DAEMON_URL\`).`,
    '- `OD_NODE_BIN` is the absolute path to the Node-compatible runtime that started the daemon; packaged desktop installs provide this even when the user has no system `node` on PATH.',
    '- `OD_HYPERFRAMES_BIN` is the absolute path to Open Design\'s pinned HyperFrames CLI. Run lightweight commands through `OD_NODE_BIN`; use `"$OD_NODE_BIN" "$OD_BIN" media scaffold` for composition setup and never use a user-level `npx` cache.',
    '- `OD_BIN` is the absolute path to the OpenDesign CLI script. On POSIX shells run wrappers with `"$OD_NODE_BIN" "$OD_BIN" tools ...`; do not call bare `od`, which may resolve to the system octal-dump command on Unix-like systems.',
    '- On PowerShell use `& $env:OD_NODE_BIN $env:OD_BIN tools ...`; on cmd.exe use `"%OD_NODE_BIN%" "%OD_BIN%" tools ...`.',
    tokenLine,
    '- Prefer project wrapper commands through `OD_NODE_BIN` + `OD_BIN` over raw HTTP. The wrappers read these environment values automatically.',
    '- For shell scripts and file operations, always prefer `"$OD_NODE_BIN" "$OD_BIN" tools bash --script "$SCRIPT"` (or pipe the script on stdin) so the work runs through the project-scoped hosted just-bash tool. Do not call bare `bash`, `sh`, `node`, `npm`, `pnpm`, or other native commands for project mutations.',
    '- Hosted bash is an in-memory virtual workspace shared for this project until the daemon restarts. It cannot access host disk, native processes, or the network; use the existing project file tools when a durable project-file write is required.',
  ].join('\n');
}

export function createOpenDesignToolEnv({
  daemonUrl,
  hyperFramesBin = resolveHyperFramesCliPath(),
  projectDir,
  projectId,
}: {
  daemonUrl: string;
  hyperFramesBin?: string;
  projectDir?: string | null;
  projectId?: string | null;
}): NodeJS.ProcessEnv {
  return {
    OD_BIN,
    OD_DATA_DIR: RUNTIME_DATA_DIR,
    OD_HYPERFRAMES_BIN: hyperFramesBin,
    OD_NODE_BIN,
    OD_DAEMON_URL: daemonUrl,
    ...(typeof projectId === 'string' && projectId && projectDir
      ? {
          OD_PROJECT_ID: projectId,
          OD_PROJECT_DIR: projectDir,
        }
      : {}),
  };
}

export function createDaemonDataDirConfiguredAgentEnv(
  configuredAgentEnv: Record<string, string> = {},
): Record<string, string> {
  return {
    ...configuredAgentEnv,
    OD_DATA_DIR: RUNTIME_DATA_DIR,
  };
}

export function normalizeProjectDisplayStatus(status) {
  return status === 'starting' || status === 'queued' ? 'running' : status;
}

export function composeProjectDisplayStatus(
  baseStatus,
  awaitingInputProjects,
  projectId,
) {
  if (
    baseStatus.value === 'succeeded' &&
    awaitingInputProjects.has(projectId)
  ) {
    return { ...baseStatus, value: 'awaiting_input' };
  }
  return {
    ...baseStatus,
    value: normalizeProjectDisplayStatus(baseStatus.value),
  };
}

const TERMINAL_RUN_STATUSES = new Set(['succeeded', 'failed', 'canceled']);
const LANGFUSE_TERMINAL_FALLBACK_DELAY_MS = 15_000;

// Fold per-run work-completeness signals off the agent event stream (#1247 /
// #1060). Invoked for EVERY agent event via the single emitAgentEvent choke
// point, so it covers every runtime (Claude stream, qoder, pi-rpc, ACP, …), not
// just Claude:
//   - the most recent TodoWrite snapshot's `todos` become run.lastTodoSnapshot,
//     so finish() can judge whether declared work was left unfinished;
//   - a turn-terminal event cut off by max_tokens sets run.truncatedMidTurn, so
//     a truncated generation is flagged incomplete regardless of its todos.
// Never keys off a mid-turn `tool_use` pause — only turn_end / usage terminals.
function captureRunWorkCompletenessSignals(run, ev) {
  if (!run || !ev || typeof ev !== 'object') return;
  if (ev.type === 'tool_use' && isTodoWriteToolName(ev.name)) {
    const todos = todoItemsFromTodoWriteInput(ev.input);
    if (Array.isArray(todos)) run.lastTodoSnapshot = todos;
    return;
  }
  if ((ev.type === 'turn_end' || ev.type === 'usage') && stopReasonIsTruncation(ev.stopReason)) {
    run.truncatedMidTurn = true;
  }
}

function fileNameFromToolInputPath(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\\/g, '/');
  return normalized.split('/').filter(Boolean).at(-1) ?? trimmed;
}

function filesystemWriteFileNamesFromRunEvents(events) {
  const names = [];
  const seen = new Set();
  for (const rec of Array.isArray(events) ? events : []) {
    const data = rec?.data;
    if (!data || typeof data !== 'object') continue;
    if (data.type !== 'tool_use' && data.type !== 'artifact') continue;

    const toolName = typeof data.name === 'string' ? data.name : '';
    const isFileTool =
      data.type === 'artifact' ||
      /^(Write|Edit|MultiEdit|write_file|edit_file|replace_file)$/i.test(toolName);
    if (!isFileTool) continue;

    const input = data.input && typeof data.input === 'object' ? data.input : {};
    const candidate =
      fileNameFromToolInputPath(input.file_path) ||
      fileNameFromToolInputPath(input.filePath) ||
      fileNameFromToolInputPath(input.path) ||
      fileNameFromToolInputPath(input.filename) ||
      fileNameFromToolInputPath(data.path) ||
      fileNameFromToolInputPath(data.filePath) ||
      fileNameFromToolInputPath(data.name);
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    names.push(candidate);
  }
  return names;
}

export function __forTestFilesystemWriteFileNamesFromRunEvents(events) {
  return filesystemWriteFileNamesFromRunEvents(events);
}

function filesystemEmptyAnswerFallbackText(fileNames) {
  if (!Array.isArray(fileNames) || fileNames.length === 0) {
    return 'Wrote project files.';
  }
  const shown = fileNames.slice(0, 3);
  if (fileNames.length === 1) {
    return `Wrote ${shown[0]}.`;
  }
  if (fileNames.length <= 3) {
    const last = shown.at(-1);
    const first = shown.slice(0, -1).join(', ');
    return `Wrote ${first} and ${last}.`;
  }
  return `Wrote ${shown.join(', ')}, and ${fileNames.length} files total.`;
}

export function __forTestFilesystemEmptyAnswerFallbackText(fileNames) {
  return filesystemEmptyAnswerFallbackText(fileNames);
}


export function shouldReportRunCompletedFromMessage(saved, body = {}) {
  return Boolean(
    saved &&
      saved.runId &&
      typeof saved.runStatus === 'string' &&
      TERMINAL_RUN_STATUSES.has(saved.runStatus) &&
      body?.telemetryFinalized === true,
  );
}

export function telemetryPromptFromRunRequest(message, currentPrompt) {
  return typeof currentPrompt === 'string' ? currentPrompt : message;
}

// Keep this header grammar aligned with parseFormAnswers in @open-design/contracts.
const FORM_ANSWERS_HEADER_RE =
  /^\s*\[form answers(?:\s*[\u2014\-:]\s*([^\]\r\n]+))?\]\s*(?:\r?\n|$)/i;

// Aggressive OVERRIDE for weak / medium-strength plain agents (e.g.
// GPT-OSS-120B Medium, Gemini 3.5 Flash) that otherwise echo RULE 1's
// fenced form example back after the user has answered it. Strong models
// (Claude Sonnet 4.6, Gemini 3.1 Pro) already handle a shorter OVERRIDE;
// enumerating the anti-patterns is a no-op for them and a strong suppressor
// for the weaker ones. RULE 1 stays conditional: a genuinely new material
// blocker may still require a new, targeted form on any turn.
//
// Exported so tests pin both the trigger condition and the literal
// anti-patterns we ask the model to skip \u2014 silently weakening the
// list (e.g. dropping the markdown-fence ban) would reintroduce the
// form-echo regression on GPT-OSS / Gemini Flash.
export const FORM_ANSWERED_SYSTEM_OVERRIDE = `## OVERRIDE \u2014 submitted form answers are authoritative

The user already submitted their form answers (see # User request below).
Apply those answers. RULE 1 does not require another form merely because its
example appears in the system prompt.

Forbidden output for this turn:
- Re-emitting the answered \`discovery\` or \`task-type\` form, or asking again
  for information the submitted answers already provide.
- A markdown \`\`\`json fenced block echoing an answered form's schema or example.
- Form-asking prose that repeats the answered questions, such as
  "Got it \u2014 tell me the following" or
  "\u8bf7\u544a\u8bc9\u6211\u4ee5\u4e0b\u4fe1\u606f".
- Narrating fake system events such as "subagents stopped" or
  "server restart".

Required output for this turn:
- Open with a brief prose confirmation of what the brief is.
- Then apply RULE 2 as relevant and proceed to RULE 3 or the matching active
  workflow.
- Only if a new, materially blocking requirement remains unresolved may you
  emit one new targeted \`<question-form>\`; never repeat answered fields.

`;

// Smaller override for non-discovery / non-task-type form ids. These
// forms are not artifact-build transitions, so we only need to suppress
// the form re-ask without directing the model toward RULE 2 / RULE 3.
// Exported so tests can pin the literal content independently.
export const FORM_ANSWERED_GENERIC_OVERRIDE = `## OVERRIDE \u2014 submitted form answers are authoritative

The user already submitted their form answers (see # User request below).
Do not ask the same form again. Treat the submitted answers as the active
user instruction and respond accordingly. Ask again only if a new, materially
blocking requirement remains unresolved.

`;

function formAnswerTransitionForCurrentPrompt(currentPrompt) {
  if (typeof currentPrompt !== 'string') return null;
  const trimmed = currentPrompt.trim();
  if (!trimmed) return null;
  const match = FORM_ANSWERS_HEADER_RE.exec(trimmed);
  if (!match) return null;
  const rawFormId = (match[1] || 'form').trim() || 'form';
  const formId = rawFormId.replace(/[^\w.-]/g, '') || 'form';
  const lines = [
    '## Latest user turn - form answers submitted',
    trimmed,
    '',
    // Keep the wording in lock-step with main — the stronger answered-form
    // dedupe now lives in the system-prompt
    // `FORM_ANSWERED_SYSTEM_OVERRIDE` block, which every plain /
    // stream-json adapter sees. Diverging the
    // user-request transition string here breaks `chat-route.test
    // marks submitted discovery form answers ...` which asserts on
    // the exact main wording.
    `The user has answered the ${formId} form. Do not re-emit the answered form or repeat fields it already answered.`,
  ];
  if (formId.toLowerCase() === 'discovery' || formId.toLowerCase() === 'task-type') {
    lines.push(
      'Apply the submitted answers and continue with RULE 2 / RULE 3 or the matching active workflow. Only if a new, materially blocking requirement remains unresolved may you emit one targeted form; never repeat answered fields.',
    );
  } else {
    lines.push(
      'Treat these form answers as the active user turn instead of replaying the transcript as a fresh request.',
    );
  }
  return lines.join('\n');
}

export function composeChatUserRequestForAgent(
  message,
  currentPrompt,
  options: { skipTranscript?: boolean } = {},
) {
  // When the adapter resumes its own session, the
  // daemon-rendered `## user` / `## assistant` transcript is a duplicate
  // of what the upstream CLI already has in memory — and the embedded
  // copy carries the literal `<question-form>` markup the agent emitted
  // on turn 1, which the model then re-emits on turn 2. Send only the
  // latest user turn (`currentPrompt`) in that case; the external runtime's
  // native session memory provides the rest.
  const skip = options.skipTranscript === true;
  // Native-session clients normally provide `currentPrompt`, but headless
  // callers such as `od run start --message` only populate `message`. On a
  // resumed session that value is the latest turn, not a rendered transcript,
  // so dropping it would send the misleading empty-turn placeholder instead.
  const bodySource = skip
    ? (typeof currentPrompt === 'string' ? currentPrompt : message)
    : message;
  const body =
    typeof bodySource === 'string' && bodySource.trim()
      ? bodySource
      : '(No extra typed instruction.)';
  const transition = formAnswerTransitionForCurrentPrompt(currentPrompt);
  if (!transition) return body;
  if (skip) {
    // The transition block already embeds the trimmed `currentPrompt`
    // (the submitted form answers). On the resume path `body` IS
    // `currentPrompt`, so appending it would ship the answers twice
    // (issue #6239); the transition alone carries the whole turn.
    return transition;
  }
  return [
    transition,
    '## Full conversation transcript',
    body,
  ].join('\n\n');
}

export function createFinalizedMessageTelemetryReporter({
  design,
  db,
  dataDir,
  reportedRuns,
  taskObservationRollout,
  getAppVersion = () => null,
  report = reportRunCompletedFromDaemon,
}: {
  design: any;
  db: unknown;
  dataDir: string;
  reportedRuns: Set<string>;
  taskObservationRollout?: {
    modeForRun(runId: string): 'off' | 'observe' | 'send';
    representationForRun(runId: string):
      | 'single_run'
      | 'task_pending'
      | 'task_accepted'
      | 'task_not_expected';
    beginFinalizeForRun(runId: string): {
      durableTaskTruth: boolean;
      suppressSingleRun: boolean;
      completion: Promise<unknown>;
    };
    finalizeForRun(runId: string): Promise<unknown>;
  };
  getAppVersion?: () => any;
  report?: typeof reportRunCompletedFromDaemon;
}) {
  const appVersionForCapture = () => {
    const appVersion = getAppVersion();
    if (typeof appVersion === 'string') return appVersion;
    if (appVersion && typeof appVersion.version === 'string') return appVersion.version;
    if (typeof design?.getAppVersion === 'function') return design.getAppVersion();
    return 'unknown';
  };
  const captureResult = ({
    analyticsContext,
    conversationId,
    delivery,
    durationMs,
    projectId,
    reportResult,
    reportTrigger = 'final_message',
    run,
    runId,
    skipReason,
    status,
  }) => {
    const context = analyticsContext ?? run?.analyticsContext ?? null;
    if (!context || !design?.analytics?.capture || !runId || !delivery) return;
    const terminalResult = status ? runResultFromStatus(status) : undefined;
    design.analytics.capture({
      eventName: 'langfuse_report_result',
      context,
      appVersion: appVersionForCapture(),
      properties: {
        page_name: 'chat_panel',
        area: 'chat_panel',
        project_id: run?.projectId ?? projectId ?? null,
        conversation_id: run?.conversationId ?? conversationId ?? null,
        run_id: runId,
        langfuse_trace_id: runId,
        langfuse_expected: delivery.langfuse_expected,
        langfuse_delivery_status: delivery.langfuse_delivery_status,
        ...(delivery.langfuse_drop_reason
          ? { langfuse_drop_reason: delivery.langfuse_drop_reason }
          : {}),
        langfuse_report_result: reportResult,
        langfuse_report_trigger: reportTrigger,
        ...(skipReason ? { langfuse_report_skip_reason: skipReason } : {}),
        ...(durationMs !== undefined ? { report_duration_ms: durationMs } : {}),
        ...(terminalResult ? { result: terminalResult } : {}),
        ...(run?.errorCode ? { error_code: run.errorCode } : {}),
        ...(run?.agentId ? { agent_provider_id: agentIdToTracking(run.agentId) } : {}),
        ...(run?.model !== undefined || run?.resolvedModelId !== undefined
          ? { model_id: modelIdForTracking(run.resolvedModelId ?? run.model) }
          : {}),
      },
      insertId: `${runId}-langfuse-report-${reportTrigger}-${reportResult}${skipReason ? `-${skipReason}` : ''}`,
    });
  };
  const reportFinalized = (saved, body = {}, options = {}) => {
    if (!shouldReportRunCompletedFromMessage(saved, body)) return;
    const runId = saved.runId;
    const run = design.runs.get(runId);
    if (!run) {
      captureResult({
        analyticsContext: options.analyticsContext,
        conversationId: options.conversationId ?? saved.conversationId,
        delivery: {
          langfuse_expected: true,
          langfuse_delivery_status: 'failed',
          langfuse_drop_reason: 'network_error',
        },
        projectId: options.projectId,
        reportTrigger: options.reportTrigger,
        reportResult: 'skipped',
        runId,
        skipReason: 'run_not_found',
        status: saved.runStatus,
      });
      return;
    }
    const reportTrigger = options.reportTrigger ?? 'final_message';
    if (reportedRuns.has(run.id)) {
      captureResult({
        analyticsContext: options.analyticsContext,
        conversationId: options.conversationId ?? saved.conversationId,
        delivery: {
          langfuse_expected: true,
          langfuse_delivery_status: 'failed',
          langfuse_drop_reason: 'network_error',
        },
        projectId: options.projectId,
        reportTrigger: options.reportTrigger,
        reportResult: 'skipped',
        run,
        runId: run.id,
        skipReason: 'duplicate_run',
        status: saved.runStatus,
      });
      return;
    }
    let taskObservationMode = 'off';
    try {
      taskObservationMode = taskObservationRollout?.modeForRun(run.id) ?? 'off';
    } catch (error) {
      // Representation persistence is a best-effort optimization. A SQLite
      // claim/insert failure must leave the ordinary single-Run obligation
      // intact instead of aborting the reporter before it reaches that path.
      console.warn('[telemetry] task observation representation failed', String(error));
    }
    if (taskObservationMode === 'observe') {
      void taskObservationRollout!.finalizeForRun(run.id).catch((error) => {
        console.warn('[telemetry] task observation failed in observe mode', String(error));
      });
    } else if (taskObservationMode === 'send') {
      let taskCompletion: Promise<unknown> | null = null;
      try {
        // Establish task-level durable truth before erasing the compatibility
        // single-Run obligation. The returned completion may continue across
        // network I/O, but the SQLite claim is already committed here.
        const handle = taskObservationRollout!.beginFinalizeForRun(run.id);
        if (handle.suppressSingleRun) taskCompletion = handle.completion;
      } catch (error) {
        // A claim/storage failure leaves this Run on the compatibility path;
        // never suppress the only recoverable telemetry obligation.
        console.warn('[telemetry] task observation claim failed', String(error));
      }
      if (!taskCompletion) {
        // Fall through to the existing single-Run reporter below.
      } else {
        // The pending Task row owns this Run, but ownership alone is not a
        // delivery checkpoint. Keep the Run unfinished until the Task is
        // accepted/not-expected. A deterministic pre-network release removes
        // the process-local gate and immediately resumes this same Run through
        // the compatibility reporter.
        reportedRuns.add(run.id);
        void taskCompletion.then(() => {
          if (taskObservationRollout!.representationForRun(run.id) !== 'single_run') {
            return;
          }
          reportedRuns.delete(run.id);
          reportFinalized(saved, body, options);
        }).catch((error) => {
          console.warn('[telemetry] task observation delivery failed', String(error));
        });
        return;
      }
    }
    const existingDelivery = run.telemetryDelivery;
    if (
      existingDelivery?.status === 'in_flight'
      || typeof existingDelivery?.finalizedAt === 'number'
    ) {
      reportedRuns.add(run.id);
      const alreadyTerminal = typeof existingDelivery.finalizedAt === 'number';
      captureResult({
        analyticsContext: options.analyticsContext,
        conversationId: options.conversationId ?? saved.conversationId,
        delivery: {
          langfuse_expected: alreadyTerminal
            ? existingDelivery.status !== 'not_expected'
            : true,
          langfuse_delivery_status: alreadyTerminal
            ? existingDelivery.status
            : 'failed',
          ...(alreadyTerminal && existingDelivery.dropReason
            ? { langfuse_drop_reason: existingDelivery.dropReason }
            : !alreadyTerminal
              ? { langfuse_drop_reason: 'network_error' }
              : {}),
        },
        projectId: options.projectId,
        reportTrigger: options.reportTrigger,
        reportResult: 'skipped',
        run,
        runId: run.id,
        skipReason: 'duplicate_run',
        status: saved.runStatus,
      });
      return;
    }
    const deliveryAttempt = design.runs.beginTelemetryDelivery?.(run);
    reportedRuns.add(run.id);
    void (async () => {
      const start = Date.now();
      let delivery;
      try {
        delivery = await report({
          db,
          dataDir,
          run,
          persistedRunStatus: saved.runStatus,
          persistedEndedAt: saved.endedAt,
          appVersion: getAppVersion(),
          ...(deliveryAttempt?.idempotencyKey
            ? { deliveryIdempotencyKey: deliveryAttempt.idempotencyKey }
            : {}),
          ...(design.runs.recordTelemetryDeliveryAttempt
            ? {
                onDeliveryAttempt: () => {
                  design.runs.recordTelemetryDeliveryAttempt(run);
                },
              }
            : {}),
        });
      } catch {
        // The production bridge already converts provider and assembly errors
        // into a failed result. Keep this final guard so an injected/custom
        // reporter cannot reject out of the detached telemetry task or leave
        // a normal failure looking like a daemon crash window.
        delivery = {
          langfuse_expected: true,
          langfuse_delivery_status: 'failed',
          langfuse_drop_reason: 'network_error',
          langfuse_attempt_count: 0,
          ...(deliveryAttempt?.idempotencyKey
            ? { langfuse_idempotency_key: deliveryAttempt.idempotencyKey }
            : {}),
        };
      }
      const state = delivery ?? {
        langfuse_expected: true,
        langfuse_delivery_status: 'accepted',
      };
      captureResult({
        analyticsContext: options.analyticsContext,
        conversationId: options.conversationId ?? saved.conversationId,
        delivery: state,
        durationMs: Date.now() - start,
        projectId: options.projectId,
        reportTrigger,
        reportResult: state.langfuse_expected === false
          ? 'skipped'
          : state.langfuse_delivery_status === 'accepted'
            ? 'accepted'
            : state.langfuse_delivery_status === 'failed'
              ? 'failed'
              : 'skipped',
        run,
        runId: run.id,
        skipReason: state.langfuse_expected === false ? 'not_expected' : undefined,
        status: saved.runStatus,
      });
      design.runs.finalizeTelemetryDelivery?.(run, state);
    })();
  };
  return reportFinalized;
}

export function shouldReportRunCompletionTelemetryFallbackStatus(status: unknown): boolean {
  return status === 'failed' || status === 'canceled';
}

const PROJECT_PREVIEW_SCOPE_TTL_MS = 60 * 60 * 1000;
const PROJECT_PREVIEW_ASSET_PATH_RE = /^\/projects\/([^/]+)\/preview\/([^/]+)\/.+$/u;
const PROJECT_RUN_SCOPED_EXPORT_PATH_RE =
  /^\/projects\/[^/]+\/export(?:\/(?:pptx|pdf-image|image))?$/u;

function createProjectPreviewScopeRegistry() {
  const scopes = new Map();

  function pruneExpired(now = Date.now()) {
    for (const [scope, entry] of scopes) {
      if (entry.expiresAt <= now) scopes.delete(scope);
    }
  }

  return {
    mint(projectId, workspace = null, options = {}) {
      pruneExpired();
      const scope = randomUUID();
      scopes.set(scope, {
        projectId: String(projectId),
        workspace,
        expiresAt: Date.now() + (options.ttlMs ?? PROJECT_PREVIEW_SCOPE_TTL_MS),
      });
      return scope;
    },
    revoke(scope) {
      scopes.delete(String(scope || ''));
    },
    expiresAt(projectId, scope) {
      const key = String(scope || '');
      const entry = scopes.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        scopes.delete(key);
        return undefined;
      }
      if (entry.projectId !== String(projectId)) return undefined;
      return entry.expiresAt;
    },
    renew(projectId, scope, options = {}) {
      const key = String(scope || '');
      const entry = scopes.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        scopes.delete(key);
        return undefined;
      }
      if (entry.projectId !== String(projectId)) return undefined;
      entry.expiresAt = Date.now() + (options.ttlMs ?? PROJECT_PREVIEW_SCOPE_TTL_MS);
      return entry.expiresAt;
    },
    validate(projectId, scope) {
      const key = String(scope || '');
      const entry = scopes.get(key);
      if (!entry) return false;
      if (entry.expiresAt <= Date.now()) {
        scopes.delete(key);
        return false;
      }
      return entry.projectId === String(projectId);
    },
    resolve(projectId, scope) {
      const key = String(scope || '');
      const entry = scopes.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        scopes.delete(key);
        return undefined;
      }
      if (entry.projectId !== String(projectId)) return undefined;
      return entry.workspace ?? null;
    },
  };
}

function parseProjectPreviewAssetPath(pathname) {
  const match = PROJECT_PREVIEW_ASSET_PATH_RE.exec(String(pathname || ''));
  if (!match) return null;
  try {
    return {
      projectId: decodeURIComponent(match[1]),
      scope: match[2],
    };
  } catch {
    return null;
  }
}

function openNativeFolderDialog() {
  return new Promise((resolve, reject) => {
    const platform = process.platform;
    if (platform === 'darwin') {
      // `choose folder` is handled specially by the system: it presents a fully
      // interactive standard navigation panel that reliably takes key focus
      // (unlike a JXA-driven NSOpenPanel from background-only osascript, which
      // renders but can't be clicked). That standard panel already includes a
      // "New Folder" button in the bottom-left, so users can create a folder
      // inline without any extra wiring.
      execFile(
        'osascript',
        ['-e', 'POSIX path of (choose folder with prompt "Select a code folder to link")'],
        { timeout: 120_000 },
        (err, stdout) => {
          if (err) return resolve(null);
          const p = stdout.trim().replace(/\/$/, '');
          resolve(p || null);
        },
      );
    } else if (platform === 'linux') {
      execFile(
        'zenity',
        ['--file-selection', '--directory', '--title=Select a code folder to link'],
        { timeout: 120_000 },
        (err, stdout, stderr) => {
          try {
            resolve(parseLinuxFolderDialogResult(err, stdout, stderr));
          } catch (folderDialogError) {
            reject(folderDialogError);
          }
        },
      );
    } else if (platform === 'win32') {
      const command = buildWindowsFolderDialogCommand();
      execFile(command.command, command.args, { timeout: 120_000 }, (err, stdout) => {
        resolve(parseFolderDialogStdout(err, stdout));
      });
    } else {
      resolve(null);
    }
  });
}

/**
 * @param {ApiErrorCode} code
 * @param {string} message
 * @param {Omit<ApiError, 'code' | 'message'>} [init]
 */
function createSseErrorPayload(code, message, init = {}) {
  return { message, error: createCompatApiError(code, message, init) };
}

function rewriteKnownAgentStreamError(agentId, message, failureText = '') {
  const rawMessage =
    typeof message === 'string' && message.trim()
      ? message.trim()
      : 'Agent stream error';
  const combined = `${rawMessage}\n${failureText}`;
  if (
    /bufio\.scanner:\s*token too long/i.test(combined) &&
    /opencode/i.test(combined) &&
    (agentId === 'opencode' || agentId === 'mimo' || agentId === 'amr' || /json-rpc id \d+/i.test(combined))
  ) {
    return 'The run failed due to an unknown upstream streaming error. Please retry.';
  }
  // An ACP handshake refusal that reaches one of the stderr-tail fallbacks is
  // deliberately NOT reworded here. The daemon has no locale, so a sentence
  // composed at this layer lands in `run.error` untranslated and the chat
  // renders it verbatim. The failure is NAMED instead: each `send('error', …)`
  // below wraps its payload in `withAcpHandshakeFailureGuidance`, which stamps
  // `AGENT_CLI_SESSION_REFUSED` plus the runtime identity and leaves the
  // agent's own line alone.
  return rawMessage;
}

/**
 * The runtime identity a failure ships as structured data: the runtime's
 * display name, which is the one fact the localized copy interpolates.
 *
 * Read straight off the already-resolved `RuntimeAgentDef` — a pure lookup on
 * a value this run resolved before it spawned, so naming the failure adds no
 * work and no waiting to the failure path.
 *
 * @param def - The resolved `RuntimeAgentDef` for this run.
 * @returns An `AcpAgentIdentity`, with `null` when the runtime is unknown.
 */
function agentFailureIdentity(def) {
  return { agentName: def?.name ?? null };
}

function createAmrModelUnavailablePayload(model, init = {}) {
  const modelText = typeof model === 'string' && model.trim()
    ? `"${model.trim()}"`
    : 'the selected model';
  return createSseErrorPayload(
    'AMR_MODEL_UNAVAILABLE',
    `AMR model ${modelText} is not available from Vela. Refresh the AMR model list, choose a supported model, and retry this run.`,
    {
      retryable: false,
      details: {
        kind: 'amr_model',
        action: 'choose_model',
        ...(typeof model === 'string' && model.trim() ? { model: model.trim() } : {}),
        ...init,
      },
    },
  );
}

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      file.originalname = decodeMultipartFilename(file.originalname);
      const safe = sanitizeName(file.originalname);
      cb(
        null,
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`,
      );
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const importUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      file.originalname = decodeMultipartFilename(file.originalname);
      const safe = sanitizeName(file.originalname);
      cb(
        null,
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`,
      );
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const PLUGIN_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
const pluginUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: PLUGIN_UPLOAD_MAX_BYTES,
    files: 500,
    fieldSize: 2 * 1024 * 1024,
  },
});

// Figma `.fig` import — memory storage so the offline decoder gets the raw
// bytes without a temp-file round-trip. The decoder unzips + kiwi-decodes
// in-process and writes the snapshot under the project cwd.
const figmaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },  // community kits run large
});

const pluginShareTaskStore = createPluginShareTaskStore({
  randomUUID,
  execCommandViaLoginShell,
  OD_NODE_BIN,
  OD_BIN,
});

// Project-scoped multi-file upload. Lands files directly in the project
// folder (flat — same shape FileWorkspace expects), so the composer's
// pasted/dropped/picked images become referenceable filenames the agent
// can Read or @-mention without any cross-folder gymnastics.
// Bridge between the multer upload-storage destination (built at module
// init) and the per-process project DB (instantiated inside startServer).
// startServer() sets this so the upload destination can route attachments
// into the right project root, including folder-imported projects whose
// files live under metadata.baseDir.
let projectMetadataLookup: ((id: string) => Record<string, unknown> | null) | null = null;

const projectUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, _file, cb) => {
      try {
        // Route uploads into the project's actual root: for folder-imported
        // projects (metadata.baseDir set) attachments need to land alongside
        // the user's files so the agent can read them via the same path
        // it sees. projectMetadataLookup is populated at startServer() boot
        // and keyed by project id; null fallback gives the standard
        // .od/projects/<id>/ behavior for non-imported projects.
        const meta = projectMetadataLookup?.(req.params.id) ?? null;
        // Optional `dir` form field (sent BEFORE the file parts by the web
        // client) routes uploads into a subfolder, so files dropped/picked
        // while viewing a folder land there instead of the project root. The
        // sanitized relative dir is stashed on the request so the route can
        // report each file's true project-relative path.
        const subdir = typeof req.body?.dir === 'string' ? req.body.dir : '';
        const { absDir, relDir } = await ensureProjectSubdir(
          PROJECTS_DIR,
          req.params.id,
          subdir,
          meta,
        );
        (req as any)._uploadRelDir = relDir;
        (req as any)._uploadAbsDir = absDir;
        cb(null, absDir);
      } catch (err) {
        cb(err, '');
      }
    },
    filename: (req, file, cb) => {
      // multer@1 hands us latin1-decoded multipart filenames; restore the
      // original UTF-8 so the response (and the on-disk name) preserves
      // non-ASCII characters instead of mangling them. Then run the shared
      // sanitiser and only add a suffix when that sanitized source name
      // would collide with an existing or same-batch upload.
      file.originalname = decodeMultipartFilename(file.originalname);
      const safe = sanitizeName(file.originalname);
      const uploadDir = typeof (req as any)._uploadAbsDir === 'string' ? (req as any)._uploadAbsDir : '';
      const reserved = (req as any)._uploadReservedNames instanceof Set
        ? (req as any)._uploadReservedNames
        : ((req as any)._uploadReservedNames = new Set());
      cb(null, uniqueUploadFileName(uploadDir, safe, reserved));
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 },  // 200MB — covers the largest design assets we expect (PPTX/PDF/raw images)
});

function uniqueUploadFileName(uploadDir, safeName, reserved) {
  const parsed = path.parse(safeName);
  const base = parsed.name || parsed.base || 'file';
  const ext = parsed.ext || '';
  for (let index = 0; index < 10_000; index += 1) {
    const candidate = index === 0 ? safeName : `${base}-${index}${ext}`;
    if (reserved.has(candidate)) continue;
    if (uploadDir && fs.existsSync(path.join(uploadDir, candidate))) continue;
    reserved.add(candidate);
    return candidate;
  }
  const fallback = `${base}-${Date.now().toString(36)}${ext}`;
  reserved.add(fallback);
  return fallback;
}

function handleProjectUpload(req, res, next) {
  projectUpload.array('files', 12)(req, res, (err) => {
    if (err) {
      return sendMulterError(res, err);
    }
    next();
  });
}

function sendMulterError(res, err) {
  if (err instanceof multer.MulterError) {
    const code = err.code || 'UPLOAD_ERROR';
    const statusByCode = {
      LIMIT_FILE_SIZE: 413,
      LIMIT_FILE_COUNT: 400,
      LIMIT_UNEXPECTED_FILE: 400,
      LIMIT_PART_COUNT: 400,
      LIMIT_FIELD_KEY: 400,
      LIMIT_FIELD_VALUE: 400,
      LIMIT_FIELD_COUNT: 400,
      MISSING_FIELD_NAME: 400,
    };
    const errorByCode = {
      LIMIT_FILE_SIZE: 'file too large',
      LIMIT_FILE_COUNT: 'too many files',
      LIMIT_UNEXPECTED_FILE: 'unexpected file field',
      LIMIT_PART_COUNT: 'too many form parts',
      LIMIT_FIELD_KEY: 'field name too long',
      LIMIT_FIELD_VALUE: 'field value too long',
      LIMIT_FIELD_COUNT: 'too many form fields',
      MISSING_FIELD_NAME: 'missing field name',
    };
    const status = statusByCode[code] ?? 400;
    const message = errorByCode[code] ?? 'upload failed';
    return sendApiError(
      res,
      status,
      code === 'LIMIT_FILE_SIZE' ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
      message,
      { details: { legacyCode: code } },
    );
  }

  if (err) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', 'upload failed');
  }

  return sendApiError(res, 500, 'INTERNAL_ERROR', 'upload failed');
}

export function createSseResponse(
  res,
  { keepAliveIntervalMs = SSE_KEEPALIVE_INTERVAL_MS } = {},
) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const canWrite = () => !res.destroyed && !res.writableEnded;
  const writeKeepAlive = () => {
    if (canWrite()) {
      res.write(': keepalive\n\n');
      return true;
    }
    return false;
  };

  let heartbeat = null;
  if (keepAliveIntervalMs > 0) {
    heartbeat = setInterval(writeKeepAlive, keepAliveIntervalMs);
    heartbeat.unref?.();
  }

  const cleanup = () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  res.on('close', cleanup);
  res.on('finish', cleanup);

  return {
    /** @param {ChatSseEvent['event'] | ProxySseEvent['event'] | string} event */
    send(event, data, id: string | number | null | undefined = null) {
      if (!canWrite()) return false;
      // Assemble the full SSE event into a single write so id/event/data land
      // in one TCP chunk. Three separate writes would let `event: <type>` flush
      // ahead of the `data:` payload, which produces partial events for
      // consumers that read chunk-by-chunk (e.g. tests using a Response body
      // reader with a substring marker).
      const idLine = id !== null && id !== undefined ? `id: ${id}\n` : '';
      res.write(`${idLine}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      return true;
    },
    writeKeepAlive,
    cleanup,
    end() {
      cleanup();
      if (canWrite()) {
        res.end();
      }
    },
  };
}

export type DesktopPdfExporter = (input: DesktopExportPdfInput) => Promise<DesktopExportPdfResult>;
export type DesktopSlideRenderer = (input: DesktopRenderSlidesInput) => Promise<DesktopRenderSlidesResult>;
export type DesktopArtifactExporter = (input: DesktopExportArtifactInput) => Promise<DesktopExportArtifactResult>;

// Loosely typed shape — we only access `namespace`, `base`, `mode`, and
// `source` from the runtime context when building the diagnostics export.
// Anything richer would force a dependency from server.ts into the sidecar
// package, which the boundary checks explicitly forbid.
export interface DaemonRuntimeContext {
  namespace: string;
  base: string;
  mode?: string;
  source?: string;
}

export interface StartServerOptions {
  desktopArtifactExporter?: DesktopArtifactExporter | null;
  desktopPdfExporter?: DesktopPdfExporter | null;
  desktopSlideRenderer?: DesktopSlideRenderer | null;
  host?: string;
  port?: number;
  returnServer?: boolean;
  runtime?: DaemonRuntimeContext | null;
  staticDir?: string;
  /** Daemon-owned host capability facts. HTTP/model output cannot populate it. */
  odNextExecutionPreflightResolver?: OdNextExecutionPreflightResolver | null;
  /**
   * Daemon-owned, runtime-neutral capability/Child facts for complex OD Next
   * Production. Runtime adapters normalize their native events before this
   * boundary; HTTP bodies, assistant prose, and raw stdout are never inputs.
   */
  odNextComplexProductionResolver?: OdNextComplexProductionResolver | null;
}

export interface StartServerResult {
  url: string;
  server: import('node:http').Server;
  shutdown: () => Promise<void> | void;
  routeInventory: import('./route-registration-guard.js').RouteRegistration[];
}

export async function startServer({
  port = 7456,
  host = normalizeDaemonBindHost(process.env.OD_BIND_HOST),
  returnServer = false,
  desktopPdfExporter = null,
  desktopSlideRenderer = null,
  desktopArtifactExporter = null,
  runtime = null,
  staticDir = STATIC_DIR,
  odNextExecutionPreflightResolver = null,
  odNextComplexProductionResolver = null,
}: StartServerOptions = {}) {
  host = normalizeDaemonBindHost(host);
  let resolvedPort = port;
  let daemonShuttingDown = false;
  const extraAllowedOrigins = configuredAllowedOrigins();
  const workspaceAuthorityCacheMode = resolveWorkspaceAuthorityCacheMode(
    process.env.OD_WORKSPACE_AUTHORITY_CACHE_MODE,
  );

  // Plan §3.K1 / spec §15.7 — bound-API-token guard.
  //
  // The daemon refuses to bind to a public interface unless an
  // OD_API_TOKEN is set. This is the spec §16 Phase 5 safety floor:
  // a hosted operator can no longer accidentally publish an unsecured
  // daemon by setting OD_BIND_HOST=0.0.0.0 without a token.
  //
  // Loopback hosts (127.0.0.1 / ::1 / localhost) are always allowed —
  // the desktop / dev flow remains unchanged. Setting OD_API_TOKEN is
  // purely additive: when present, every /api/* request must carry a
  // matching Bearer token or browser Basic credentials (loopback origins
  // are exempted so the desktop UI keeps working).
  const apiToken = apiTokenFromEnv();
  const apiAuthDisabled = isApiAuthDisabled();
  const apiTokenAuthEnabled = apiToken.length > 0 && !apiAuthDisabled;
  const isApiTokenAuthorization = (authorization: string | undefined): boolean =>
    apiTokenAuthEnabled && apiTokenAuthorizationMatches(authorization, apiToken);
  if (!isLoopbackHostname(host) && apiToken.length === 0 && !apiAuthDisabled) {
    throw new Error(
      `OD_BIND_HOST=${host} requires OD_API_TOKEN to be set. ` +
      `Generate one with \`openssl rand -hex 32\` and re-launch. ` +
      `(Loopback hosts 127.0.0.1 / ::1 / localhost do not need a token.) ` +
      `Set OD_DISABLE_API_AUTH=1 only when a trusted reverse proxy already authenticates every request.`,
    );
  }

  const app = express();
  installRouteRegistrationGuard(app);
  const hostedBash = new HostedBashManager();
  // Clipper page captures are self-contained HTML with inlined images plus a
  // Figma IR, which for an image-heavy site (The Economist, news front pages)
  // runs to tens of MB — far past a normal JSON body. Give the ingest route a
  // dedicated generous limit so a full-page capture doesn't 413; the rest of the
  // API stays at the conservative 4mb. Registered first so this parser claims
  // the ingest body before the global one (express.json is a no-op once a body
  // has already been read).
  app.use('/api/library/ingest', express.json({ limit: '128mb' }));
  // Brand extract-from-html carries the full rendered page DOM (+ collected CSS)
  // the web read out of the in-app browser tab after the user cleared an anti-bot
  // wall — well past 4mb for image/markup-heavy sites. Give it a dedicated limit
  // (registered before the global parser so it claims the body first).
  app.use('/api/brands/:id/extract-from-html', express.json({ limit: '32mb' }));
  app.use(express.json({ limit: '4mb' }));
  const projectPreviewScopes = createProjectPreviewScopeRegistry();

  // Plan §3.K1 — API-token middleware.
  //
  // Active only when OD_API_TOKEN is set and API auth is not disabled.
  // Loopback origins skip the check (the desktop UI / local CLI never carry
  // credentials); every other request must present a matching bearer token
  // (CLI / proxy) or matching HTTP Basic credentials (browser UI). A currently
  // valid run-scoped token may pass only an exact screenshot-export endpoint;
  // its route rechecks the operation and project. Health / readiness / version
  // remain open. Server-minted project preview asset scopes are also accepted
  // for GETs so sandboxed
  // browser iframes can load HTML/CSS/JS without privileged headers.
  // Rich daemon status stays authenticated because it includes local
  // runtime paths.
  if (apiTokenAuthEnabled) {
    const openProbePaths = new Set([
      '/health',
      '/api/health',
      '/ready',
      '/api/ready',
      '/version',
      '/api/version',
    ]);
    app.use('/api', (req, res, next) => {
      if (openProbePaths.has(req.path)) return next();
      if (req.method === 'GET') {
        const previewAsset = parseProjectPreviewAssetPath(req.path);
        if (
          previewAsset &&
          projectPreviewScopes.validate(previewAsset.projectId, previewAsset.scope)
        ) {
          return next();
        }
      }
      // Loopback short-circuit. We ignore the proxied X-Forwarded-For
      // header here because a reverse proxy MUST always forward the
      // credentials; the loopback bypass exists for the localhost desktop
      // UI which has no proxy in the path.
      if (isLoopbackPeerAddress(req.socket?.remoteAddress)) return next();
      if (apiTokenAuthorizationMatches(req.get('authorization'), apiToken)) return next();
      if (
        req.method === 'POST'
        && PROJECT_RUN_SCOPED_EXPORT_PATH_RE.test(req.path)
        && toolTokenRegistry.validate(bearerTokenFromRequest(req), {
          endpoint: PROJECT_EXPORT_TOOL_ENDPOINT,
          operation: 'project:export',
        }).ok
      ) {
        return next();
      }
      res.setHeader('WWW-Authenticate', API_TOKEN_BASIC_CHALLENGE);
      return res.status(401).json({
        error: {
          code: 'API_TOKEN_REQUIRED',
          message: 'Authorization: Bearer <OD_API_TOKEN> or browser Basic authentication required',
        },
      });
    });

    // Docker Desktop forwards host-browser traffic across its bridge, so the
    // daemon correctly sees a non-loopback peer. Challenge the SPA document
    // navigation before serving any shell bytes; browsers then cache the Basic
    // credentials for same-origin /api requests. Static assets do not need a
    // separate challenge because the authenticated shell is the only entry
    // point and API routes still enforce credentials independently.
    app.use((req, res, next) => {
      if (isLoopbackPeerAddress(req.socket?.remoteAddress)) return next();
      if (resolveStaticSpaFallbackPath(req, staticDir) === null) return next();
      if (apiTokenAuthorizationMatches(req.get('authorization'), apiToken)) return next();

      res.setHeader('WWW-Authenticate', API_TOKEN_BASIC_CHALLENGE);
      return res.status(401).type('text/plain').send(
        'OpenDesign authentication required. Use username "open-design" and OD_API_TOKEN as the password.',
      );
    });
  }

  const designSystemServices = createDesignSystemServerServices({
    // `db` (below) is not initialized yet at this point in `startServer` —
    // pass a getter so `listAllSkills`'s workspace filter reads it lazily,
    // once the first request that needs it actually arrives.
    getDb: () => db,
    roots: { SKILL_ROOTS, DESIGN_TEMPLATE_ROOTS, ALL_SKILL_LIKE_ROOTS },
    paths: { PROJECTS_DIR, DESIGN_SYSTEMS_DIR, USER_DESIGN_SYSTEMS_DIR },
    skills: { listSkills, findSkillById },
    designSystems: {
      listDesignSystems,
      readDesignSystem,
      readDesignSystemPackageInfo,
      readDesignSystemStaticFile,
      listUserDesignSystemFiles,
      readUserDesignSystemFile,
      readUserDesignSystemFileBytes,
      linkUserDesignSystemProject,
      syncUserDesignSystemAssetsFromFiles,
      LEGACY_DESIGN_SYSTEM_ARTIFACTS,
    },
    projects: {
      getProject,
      insertProject,
      updateProject,
      readProjectFile,
      writeProjectFile,
      listFiles,
      resolveProjectDir,
      isSafeId,
    },
    bindProjectToWorkspace: (projectId, createdAt, designSystem) => {
      const workspaceId = designSystem.workspaceId?.trim();
      if (!workspaceId) return;
      const binding = getWorkspaceResource(
        db,
        'design_system',
        workspaceId,
        designSystem.teamSynced === true
          ? workspaceTeamDesignSystemBindingResourceId(workspaceId, designSystem.id)
          : designSystem.id,
      );
      const memberId = binding?.createdByWorkspaceMemberId?.trim();
      if (!memberId) return;
      ensureWorkspaceProject(db, {
        projectId,
        workspaceId,
        visibility: designSystem.teamSynced === true ? 'team' : 'personal',
        resourceState: 'active',
        createdByWorkspaceMemberId: memberId,
        updatedByWorkspaceMemberId: memberId,
        syncState: 'local_only',
        resourceHubResourceId: null,
        cloudTombstonedAt: null,
        createdAt,
        updatedAt: createdAt,
      });
    },
  });
  const {
    ensureUserDesignSystemWorkspaceProject,
    isProjectUsableDesignSystem,
    listAllDesignSystems,
    listAllDesignTemplates,
    listAllSkillLikeEntries,
    listAllSkills,
    readAvailableDesignSystem,
    readAvailableDesignSystemPackageInfo,
    readAvailableDesignSystemStaticFile,
    readDesignSystemWorkspaceTextFile,
    resolveUserDesignSystemShareDirectory,
    syncUserDesignSystemAssetsFromWorkspace,
    validateProjectDesignSystemId,
    validateProjectSkillId,
  } = designSystemServices;

  // Chrome may strip the port from the Origin header on same-origin GET
  // requests. Only use this as a fallback for safe, idempotent GET requests;
  // mutating routes always require an exact origin/host match.
  function isPortlessLoopbackOrigin(origin) {
    return /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])$/.test(origin);
  }

  function reportHostForPoweredPreview(): string {
    return host === '0.0.0.0' || host === '::' || host === '[::]' || host === '::1'
      ? '127.0.0.1'
      : host;
  }

  function poweredPreviewHost(): string | null {
    const reportHost = reportHostForPoweredPreview();
    if (reportHost === '127.0.0.1') return 'localhost';
    if (reportHost === 'localhost') return '127.0.0.1';
    return null;
  }

  // Routes that serve content to sandboxed iframes (Origin: null) for
  // read-only purposes.  All other /api routes reject Origin: null.
  const _NULL_ORIGIN_SAFE_GET_RE =
    /^\/projects\/[^/]+\/(?:raw|preview)\/|^\/codex-pets\/[^/]+\/spritesheet$|^\/asset-cache$/;
  const _POWERED_PREVIEW_SAFE_RE = /^\/projects\/[^/]+\/powered\/.+$/u;

  // Reject cross-origin requests to API endpoints.
  // Health/version remain open for monitoring probes.
  // Non-browser clients (no Origin header) are always allowed.
  app.use('/api', (req, res, next) => {
    // Live artifact previews have stricter local-daemon validation and
    // loopback CORS handling on the route itself. Let that middleware produce
    // the structured error shape and preflight headers for preview embeds.
    if (/^\/live-artifacts\/[^/]+\/preview$/.test(req.path)) return next();

    // Zero-config browser extension: the OD Clipper only needs a liveness probe
    // plus POST /api/library/ingest. A web page cannot forge a
    // chrome-extension:// (or moz-extension://) origin, and the daemon is
    // loopback-bound, so these two bootstrap routes are auto-trusted without a
    // pairing handshake. Library read routes still fall through to the normal
    // origin guard.
    // NOTE: `req.path` here is mount-relative (the `/api` prefix is stripped),
    // so the predicate matches `/library/ingest`, not `/api/library/ingest`.
    if (isZeroConfigClipperLibraryRequest(req.method, req.path, req.headers.origin)) {
      return next();
    }

    const poweredHost = poweredPreviewHost();
    if (poweredHost && resolvedPort) {
      const requestHost = parseHostHeader(req.headers.host);
      const fetchMetadataPresent =
        req.headers['sec-fetch-site'] != null ||
        req.headers['sec-fetch-mode'] != null ||
        req.headers['sec-fetch-dest'] != null;
      const poweredReferer = (() => {
        const raw = Array.isArray(req.headers.referer) ? req.headers.referer[0] : req.headers.referer;
        if (typeof raw !== 'string' || raw.length === 0) return false;
        try {
          const parsed = new URL(raw);
          return parsed.hostname === poweredHost &&
            (parsed.port || (parsed.protocol === 'https:' ? '443' : '80')) === String(resolvedPort) &&
            /^\/api\/projects\/[^/]+\/powered\/.+/u.test(parsed.pathname);
        } catch {
          return false;
        }
      })();
      const isPoweredPreviewBrowserRequest =
        requestHost?.hostname === poweredHost &&
        requestHost.port === String(resolvedPort) &&
        (fetchMetadataPresent || poweredReferer);
      if (isPoweredPreviewBrowserRequest && !_POWERED_PREVIEW_SAFE_RE.test(req.path)) {
        return res.status(403).json({
          error: 'Powered preview origin cannot access this API route',
        });
      }
    }

    const origin = req.headers.origin;
    // Non-browser client → allow.
    if (origin == null || origin === '') return next();

    // Origin: null (sandboxed iframes).  Only allowed for safe, read-only
    // routes that set their own CORS headers for canvas drawing.
    if (origin === 'null') {
      const isSafeReadOnly =
        req.method === 'GET' && _NULL_ORIGIN_SAFE_GET_RE.test(req.path);
      if (!isSafeReadOnly) {
        return res.status(403).json({ error: 'Origin: null not allowed for this route' });
      }
      return next();
    }

    // Fail-closed: block all browser origins until port is resolved.
    if (!resolvedPort) {
      return res.status(403).json({ error: 'Server initializing' });
    }

    const ports = allowedBrowserPorts(resolvedPort);
    // Paired browser-extension origins are persisted in library_tokens and
    // seeded into this in-memory allowlist at boot / on pairing.
    const allowedOrigins = [...extraAllowedOrigins, ...libraryExtensionAllowedOrigins()];
    if (!isAllowedBrowserOrigin(origin, req.headers.host, ports, host, allowedOrigins)) {
      if (req.method !== 'GET' || !isPortlessLoopbackOrigin(String(origin))) {
        return res.status(403).json({ error: 'Cross-origin requests are not allowed' });
      }
    }
    next();
  });
  const db = openDatabase(PROJECT_ROOT, { dataDir: RUNTIME_DATA_DIR });
  const commentAnchorRepair = repairTeamProjectCommentAnchorConversations(db);
  if (commentAnchorRepair.created > 0) {
    console.warn(
      `[comments] repaired ${commentAnchorRepair.created} historical Team project comment anchor(s)`,
    );
  }
  // Restore paired browser-extension origins into the in-memory allowlist the
  // /api origin middleware above consults, so a paired clipper survives daemon
  // restarts without re-pairing.
  try {
    seedLibraryExtensionOrigins(listLibraryTokenOrigins(db));
  } catch {
    // best-effort: a fresh db with no library_tokens is fine
  }
  const pluginInstallation = createPluginInstallationHelpers({
    db,
    installFromLocalFolder,
    PLUGIN_REGISTRY_ROOTS,
    PLUGIN_LOCKFILE_PATH,
    PLUGIN_UPLOAD_MAX_BYTES,
  });
  const mediaTaskStore = createMediaTaskStore(db, {
    isRunActive: (runId) => toolTokenRegistry.activeRunTokenCount(runId) > 0,
  });
  const {
    authorizeToolRequest,
    optionalToolGrantFromRequest,
    requestProjectOverride,
    requestRunOverride,
  } = createToolRequestAuth(toolTokenRegistry);
  // Wire the upload-destination bridge to this db so multer can route
  // file uploads into baseDir-rooted projects' actual folders.
  projectMetadataLookup = (id) => {
    try { return getProject(db, id)?.metadata ?? null; } catch { return null; }
  };
  configureConnectorCredentialStore(new FileConnectorCredentialStore(RUNTIME_DATA_DIR));
  configureComposioConfigStore(RUNTIME_DATA_DIR);
  composioConnectorProvider.configureCatalogCache(RUNTIME_DATA_DIR);
  composioConnectorProvider.startCatalogRefreshLoop();

  // RoutineService persistence is a thin adapter over the SQLite helpers.
  // Routines are stored as DB rows; the service holds in-memory timers and
  // delegates "list me everything" / "record a run" back to SQLite.
  routineService = new RoutineService({
    list: () => listRoutines(db).map((row) => routineDbRowToContract(row, null)),
    insertRun: (run, options) => {
      const row = {
        id: run.id,
        routineId: run.routineId,
        trigger: run.trigger,
        status: run.status,
        projectId: run.projectId,
        conversationId: run.conversationId,
        agentRunId: run.agentRunId,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        summary: run.summary,
        error: run.error,
        errorCode: run.errorCode,
      };
      if (options?.scheduledSlotAt != null) {
        return Boolean(insertScheduledRoutineRun(db, row, options.scheduledSlotAt));
      }
      insertRoutineRun(db, row);
      return true;
    },
    updateRun: (id, patch) => {
      updateRoutineRun(db, id, patch);
    },
    getLatestRun: (routineId) => getLatestRoutineRun(db, routineId),
  });
  let daemonUrl = `http://127.0.0.1:${port}`;

  // Boot reconcile: any critique_runs row left in 'running' state by a prior
  // daemon crash gets flipped to 'interrupted' with rounds_json.recoveryReason
  // = 'daemon_restart' so the spec's daemon-restart-mid-run failure mode is
  // honored on every boot. staleAfterMs comes from CritiqueConfig, not a
  // hardcoded constant.
  const reconciledStaleRuns = reconcileStaleRuns(db, { staleAfterMs: critiqueCfg.totalTimeoutMs });
  if (reconciledStaleRuns > 0) {
    console.warn(`[critique] reconcileStaleRuns flipped ${reconciledStaleRuns} stale running row(s) to interrupted`);
  }
  const mediaReconcile = reconcileMediaTasksOnBoot(db, {
    terminalTtlMs: TASK_TTL_AFTER_DONE_MS,
  });
  if (mediaReconcile.interrupted > 0 || mediaReconcile.deleted > 0) {
    console.warn(
      `[media] reconcileMediaTasksOnBoot interrupted ${mediaReconcile.interrupted} task(s), ` +
        `deleted ${mediaReconcile.deleted} expired terminal task(s)`,
    );
  }
  mediaTaskStore.mediaTasks.clear();
  for (const row of listRecentMediaTasks(db, { terminalTtlMs: TASK_TTL_AFTER_DONE_MS })) {
    mediaTaskStore.hydrateMediaTask(row);
  }

  if (process.env.OD_CODEX_DISABLE_PLUGINS === '1') {
    console.log('[od] Codex plugins disabled via OD_CODEX_DISABLE_PLUGINS=1');
  }

  let bundledMarketplaceEntries = [];
  // Plan §3.I3 / spec §23.3.5 — register every plugin under
  // <resourceRoot>/plugins/_official/** in packaged runs, or
  // <projectRoot>/plugins/_official/** in workspace runs, as bundled plugins. The walker
  // is idempotent (upserts on every boot) so a daemon upgrade rotates
  // the bundled set in lockstep with the code. ENOENT is silent —
  // running the daemon outside the dev tree just skips this step.
  try {
    const result = await registerBundledPlugins({
      db,
      bundledRoot: BUNDLED_PLUGINS_DIR,
      marketplaceProvenance: {
        sourceMarketplaceId: OFFICIAL_MARKETPLACE_ID,
        marketplaceTrust:    'official',
        entryNamePrefix:     'open-design',
      },
    });
    bundledMarketplaceEntries = result.registered.map((plugin) => ({
      name:        `open-design/${plugin.id}`,
      title:       plugin.title,
      title_i18n:  plugin.manifest.title_i18n,
      description: plugin.manifest.description,
      description_i18n: plugin.manifest.description_i18n,
      version:     plugin.version,
      source:      bundledPluginRegistrySource(plugin.source),
      publisher:   { id: 'open-design', url: 'https://open-design.ai' },
      homepage:    plugin.manifest.homepage,
      license:     plugin.manifest.license,
      tags:        plugin.manifest.tags,
      capabilitiesSummary: Array.isArray(plugin.manifest.od?.capabilities)
        ? plugin.manifest.od.capabilities
        : undefined,
    }));
    if (result.registered.length > 0) {
      console.log(`[plugins] registered ${result.registered.length} bundled plugin(s)`);
    }
    if (result.warnings.length > 0) {
      for (const w of result.warnings) console.warn(`[plugins] bundled warn: ${w}`);
    }
  } catch (err) {
    console.warn(`[plugins] bundled registration failed: ${(err)?.message ?? err}`);
  }

  try {
    const seedDirs = await fs.promises.readdir(PLUGIN_REGISTRY_DIR, { withFileTypes: true }).catch((err) => {
      if (err?.code === 'ENOENT') return [];
      throw err;
    });
    const { ensureMarketplaceManifest } = await import('./plugins/marketplaces.js');
    for (const dirent of seedDirs) {
      if (!dirent.isDirectory()) continue;
      const id = dirent.name;
      const manifestText = await marketplaceSeedManifestText(id, bundledMarketplaceEntries);
      if (!manifestText) continue;
      const configured = defaultMarketplaceSeedConfig(id);
      const result = ensureMarketplaceManifest(db, {
        id,
        url: configured.url,
        trust: configured.trust,
        manifestText,
      });
      if (result.ok) {
        console.log(`[plugins] seeded ${id} registry source (${result.row.manifest.plugins.length} plugin(s))`);
      } else {
        console.warn(`[plugins] ${id} registry seed failed: ${result.message}`);
      }
    }
  } catch (err) {
    console.warn(`[plugins] registry seed failed: ${(err)?.message ?? err}`);
  }

  // Plan §3.A5 / spec §16 Phase 5 / PB2: periodic snapshot GC. Disabled
  // when OD_SNAPSHOT_GC_INTERVAL_MS is 0; otherwise one-time bootstrap
  // sweep + interval. The function returns a NOOP_HANDLE when disabled
  // so we don't have to branch on the result.
  const snapshotGc = startSnapshotGc({ db });
  // One immediate sweep so a daemon that just gained the ALTER doesn't
  // wait the full interval before reaping pre-existing expired rows.
  try {
    const initialSweep = pruneExpiredSnapshots(db);
    if (initialSweep.removed > 0) {
      console.log(`[plugins] snapshot GC startup sweep removed ${initialSweep.removed} row(s)`);
    }
  } catch (err) {
    console.warn(`[plugins] snapshot GC startup sweep failed: ${(err)?.message ?? err}`);
  }
  void snapshotGc; // keep handle alive for the daemon's lifetime

  // Memory hygiene: one-time removal of entries the retired chat
  // auto-extraction pipelines wrote (regex-pack artifacts + chat-form
  // residue in user_profile). Marker-gated inside, so this is a no-op on
  // every boot after the first. Best-effort — memory cleanup must never
  // block the daemon from serving.
  try {
    const memoryCleanup = await runAutoExtractionCleanup(RUNTIME_DATA_DIR);
    if (memoryCleanup.ran && (memoryCleanup.deletedIds.length > 0 || memoryCleanup.profilePruned)) {
      console.log(
        `[memory] auto-extraction cleanup removed ${memoryCleanup.deletedIds.length} entr(y/ies)`
        + `${memoryCleanup.profilePruned ? ' and pruned user_profile to canonical fields' : ''}`,
      );
    }
  } catch (err) {
    console.warn('[memory] auto-extraction cleanup failed:', err);
  }

  // Warm agent-capability probes (e.g. whether the installed Claude Code
  // build advertises --include-partial-messages) so the first /api/chat
  // hits a populated cache even if /api/agents hasn't been called yet.
  void readAppConfig(RUNTIME_DATA_DIR)
    .then((config) => {
      orbitService.configure(config.orbit);
      return detectAgents(config.agentCliEnv ?? {});
    })
    .catch(() => detectAgents().catch(() => {}));

  await recoverStaleLiveArtifactRefreshes({ projectsRoot: PROJECTS_DIR }).catch((error) => {
    console.warn('[od] Failed to recover stale live artifact refreshes:', error);
  });

  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
  }

  // ---- Projects (DB-backed) -------------------------------------------------


  // Team collaboration subsystem: presence + author-side publish scheduler.
  // Product team workspaces publish and pull through the login-backed Vela CLI;
  // non-Vela local modes retain the in-memory adapter for isolated development.
  const describeCollabProject = (projectId: string) => {
    const project = getProject(db, projectId);
    if (!project) return null;
    return {
      name: project.name,
      skillId: project.skillId ?? null,
      designSystemId: project.designSystemId ?? null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      ...(project.metadata ? { metadata: project.metadata } : {}),
    };
  };
  const activeWorkspace = createActiveWorkspaceSelectionStore(RUNTIME_DATA_DIR);
  const teamMirrorPromotionJournalDir = path.join(
    RUNTIME_DATA_DIR,
    'team-mirror-promotions',
  );
  await recoverAuthorizedTeamProjectPromotions({
    journalDir: teamMirrorPromotionJournalDir,
    allowedProjectsRoot: PROJECTS_DIR,
    isCommitted: (entry) => {
      const stored = getTeamProjectMaterialization(
        db,
        entry.receipt.workspaceId,
        entry.receipt.projectId,
      );
      return teamProjectMaterializationMatches(stored, entry.receipt);
    },
    isSuperseded: (entry) => {
      const stored = getTeamProjectMaterialization(
        db,
        entry.receipt.workspaceId,
        entry.receipt.projectId,
      );
      return teamProjectMaterializationSupersedes(stored, entry.receipt);
    },
    onError: (error) => {
      console.warn('[od] failed to recover authorized team mirror promotion:', error);
    },
  });
  // What this daemon has learned about each workspace's type, memoized from
  // exact directory/context reads it already performs. It is the
  // second witness behind the team-share invariant: a team share may only be
  // recorded in — and a project-scoped collab call may only be pinned to — a
  // workspace that can actually host a team plane. See collab/team-share-scope.ts.
  const workspaceTypes = createWorkspaceTypeRegistry();
  const configuredAmrEnv = () =>
    agentCliEnvForAgent(readAppConfigSync(RUNTIME_DATA_DIR).agentCliEnv, 'amr');
  const workspaceExactAuthorityCache = createWorkspaceExactAuthorityCache({
    identity: () => velaWorkspaceDirectoryIdentity(
      readVelaControlApiContext,
      configuredAmrEnv(),
    ),
  });
  const workspaceDirectoryAuthority = createWorkspaceDirectoryAuthorityBroker({
    fetchDirectory: async () => {
      const result = await fetchVelaWorkspaceDirectory({
        configuredEnv: configuredAmrEnv(),
      });
      if (result.ok) workspaceTypes.learn(result.items);
      return result;
    },
    identityKey: () => velaWorkspaceDirectoryIdentity(
      readVelaControlApiContext,
      configuredAmrEnv(),
    ),
    onDecision: (input) => recordWorkspaceAuthorityDecision({
      mode: workspaceAuthorityCacheMode,
      ...input,
    }),
    onSuppressedRequest: (input) => recordWorkspaceAuthoritySuppressedRequest({
      mode: workspaceAuthorityCacheMode,
      ...input,
    }),
    onInvalidation: (input) => recordWorkspaceAuthorityInvalidation({
      mode: workspaceAuthorityCacheMode,
      ...input,
    }),
    onAcceptedResult: (result, identity) =>
      workspaceExactAuthorityCache.observe(identity, result.items),
  });
  const fetchWorkspaceDirectory = workspaceDirectoryAuthority.read;
  const fetchFreshMutationWorkspaceDirectory =
    workspaceDirectoryAuthority.fresh;
  const fetchFreshBackgroundWorkspaceDirectory =
    workspaceDirectoryAuthority.backgroundFresh;
  let workspaceHubSubscriptions: WorkspaceHubSubscriptionManager | null = null;
  const verifyExplicitWorkspaceRequestContext = async (input: {
    req: any;
    requireTeam?: boolean;
  }, options: { fresh?: boolean; backgroundFresh?: boolean } = {}) => {
    if (process.env.OD_WORKSPACE_CONTEXT_SOURCE?.trim() === 'vela') {
      let fetchDirectory = fetchFreshMutationWorkspaceDirectory;
      if (options.fresh === false) {
        fetchDirectory = fetchWorkspaceDirectory;
      } else if (options.backgroundFresh) {
        fetchDirectory = fetchFreshBackgroundWorkspaceDirectory;
      }
      return verifyWorkspaceRequestContext({
        ...input,
        fetchWorkspaceDirectory: fetchDirectory,
        configuredEnv: configuredAmrEnv(),
      });
    }
    // Local/dev has no signed membership directory. Its explicit request
    // headers are the complete, static authority; still never consult the
    // daemon's mutable active-workspace context.
    const claimed = workspaceResourceContextFromRequest(input.req);
    if (claimed === null) {
      return {
        ok: false as const,
        status: 400 as const,
        code: 'WORKSPACE_CONTEXT_REQUIRED' as const,
        message: 'an explicit workspace context is required',
      };
    }
    if (claimed === 'missing') {
      return {
        ok: false as const,
        status: 400 as const,
        code: 'WORKSPACE_CONTEXT_INCOMPLETE' as const,
        message: 'both workspace and member identity are required',
      };
    }
    if (
      claimed.memberStatus !== 'active'
      || claimed.lifecycleState === 'deleted'
      || (input.requireTeam && claimed.workspaceType !== 'team')
    ) {
      return {
        ok: false as const,
        status: 403 as const,
        code: 'WORKSPACE_ACCESS_DENIED' as const,
        message: 'the requested workspace is not available to this member',
      };
    }
    return {
      ok: true as const,
      context: workspaceContextFromDirectoryItem({
        workspaceId: claimed.workspaceId,
        workspaceName: claimed.workspaceId,
        workspaceType: claimed.workspaceType,
        workspaceMemberId: claimed.workspaceMemberId,
        role: claimed.role,
        memberStatus: claimed.memberStatus,
        lifecycleState: claimed.lifecycleState,
      }, configuredAmrEnv()),
    };
  };
  const verifyWorkspaceReadAuthority = (req: unknown) =>
    verifyExplicitWorkspaceRequestContext({ req }, { fresh: false });
  const verifyWorkspaceRequestAuthority = (req: unknown) =>
    verifyExplicitWorkspaceRequestContext({ req });
  const verifyPersonalProjectDeleteLeaseAuthority =
    process.env.OD_WORKSPACE_CONTEXT_SOURCE?.trim() === 'vela'
      ? (req: unknown) => verifyWorkspaceRequestContext({
          req,
          // A miss is intentionally returned as unavailable. The project gate
          // then falls through to the existing fresh authority verifier.
          fetchWorkspaceDirectory: workspaceDirectoryAuthority.cached,
          configuredEnv: configuredAmrEnv(),
        })
      : undefined;
  // Project-creation writes must be authorized by AMR in production, while
  // local/dev and explicitly anonymous clients keep their legacy behavior.
  // Keep this separate from read-side directory fetches so an unconfigured
  // daemon never turns ordinary local creation into a network-dependent path.
  const fetchProjectCreationWorkspaceDirectory =
    process.env.OD_WORKSPACE_CONTEXT_SOURCE?.trim() === 'vela'
      ? fetchFreshMutationWorkspaceDirectory
      : undefined;
  const listWorkspaceDirectory = async () => {
    const result = await fetchWorkspaceDirectory();
    return result.items;
  };
  const resolveAuthoritativeTeamWorkspaceContext = async (
    workspaceId: string | null | undefined,
    options: { fresh?: boolean; backgroundFresh?: boolean } = {},
  ): Promise<WorkspaceCollabContext | null> => {
    const requestedWorkspaceId = workspaceId?.trim() ?? '';
    if (!requestedWorkspaceId) return null;
    let fetchDirectory = fetchWorkspaceDirectory;
    if (options.fresh) {
      fetchDirectory = options.backgroundFresh
        ? fetchFreshBackgroundWorkspaceDirectory
        : fetchFreshMutationWorkspaceDirectory;
    }
    const directory = await fetchDirectory().catch(() => ({
      ok: false as const,
      items: [],
    }));
    if (!directory.ok) return null;
    const membership = directory.items.find(
      (item) =>
        item.workspaceId === requestedWorkspaceId
        && item.workspaceType === 'team'
        && item.memberStatus === 'active'
        && item.lifecycleState === 'active',
    );
    return membership
      ? workspaceContextFromDirectoryItem(membership, configuredAmrEnv())
      : null;
  };
  const teamResourceVersions = createTeamResourceVersionStore(RUNTIME_DATA_DIR);
  const teamProjectContentResourceId = (
    projectId: string,
    scope: { resourceTeamId: string; ownerMemberId: string },
  ) =>
    projectResourceIdFor(projectId, {
      teamId: scope.resourceTeamId,
      memberId: scope.ownerMemberId,
      role: 'member',
      lifecycleState: 'active',
      workspaceType: 'team',
    });
  /**
   * Resolve design-system ownership/filtering from this exact request.
   *
   * Catalog and create are data-plane operations. Daemon-global active/current
   * state can change between two tabs, so it is not authority for deciding
   * which Workspace a request reads or writes.
   */
  async function resolveDesignSystemWorkspaceContext(
    req: any,
  ): Promise<import('./collab/workspace-resource-mutation.js').WorkspaceResourceContext | null> {
    const claimed = workspaceResourceContextFromRequest(req);
    // A completely headerless local/signed-out request is the explicit legacy
    // lane: built-ins plus unclaimed local resources, and new resources remain
    // unbound. A half-specified identity is never that lane and is rejected by
    // the verifier below.
    if (claimed === null) return null;
    const verified = await verifyExplicitWorkspaceRequestContext({ req });
    if (!verified.ok) {
      throw Object.assign(new Error(verified.message), {
        status: verified.status,
        code: verified.code,
        ...(verified.retryable ? { retryable: true } : {}),
      });
    }
    return verified.context;
  }

  async function resolveDesignSystemWorkspaceScope(req: any): Promise<string | null> {
    const context = await resolveDesignSystemWorkspaceContext(req);
    return context?.workspaceId.trim() || null;
  }

  /**
   * Create a user design system CLAIMED by the workspace it was authored in.
   *
   * User design systems share one flat directory, so the claim written here is
   * the only thing that lets `GET /api/design-systems` keep one workspace's
   * library out of another's (#145). Stamping at creation is deliberate: it is
   * the one moment the authoring workspace is unambiguous, whereas deciding
   * ownership later (at read time, from whatever workspace happens to be
   * active) would re-home a system every time the user switched.
   *
   * Envelope double-write (spec 9.2): `metadata.json` stays the only thing
   * `listDesignSystems`'s filter reads, but a claimed system also gets a row
   * in the generic `workspace_resources` table — the same table plugin/skill
   * already bind into — so design systems stop being the one resource type
   * with zero rows there. Both writes happen from this single call site, so
   * they can never drift apart.
   */
  const reservedDesignSystemResourceIds = (): Set<string> => {
    const rows = db.prepare(
      `SELECT resource_id AS resourceId
         FROM workspace_resources
        WHERE resource_type = 'design_system'`,
    ).all() as Array<{ resourceId?: string }>;
    return new Set(rows.flatMap((row) => {
      const resourceId = row.resourceId?.trim();
      return resourceId ? [designSystemLogicalResourceId(resourceId)] : [];
    }));
  };
  const createWorkspaceOwnedDesignSystemForContext = (
    root: string,
    input: UserDesignSystemInput,
    context: import('./collab/workspace-resource-mutation.js').WorkspaceResourceContext | null,
  ) => persistWorkspaceOwnedDesignSystem(root, input, context, {
    listReservedResourceIds: reservedDesignSystemResourceIds,
    ensureWorkspaceResource: (resourceType, workspaceId, resourceId, envelope) => {
      // The filesystem allocation awaited above, so another request could
      // have claimed this logical id in the meantime. Fail before reusing its
      // envelope; the wrapper removes only the directory it just allocated.
      if (reservedDesignSystemResourceIds().has(resourceId)) {
        throw new Error('DESIGN_SYSTEM_ID_CONFLICT');
      }
      return ensureWorkspaceResource(db, resourceType, workspaceId, resourceId, envelope);
    },
  });
  const createWorkspaceOwnedDesignSystem = async (
    root: string,
    input: UserDesignSystemInput,
    req: any,
  ) => {
    const context = await resolveDesignSystemWorkspaceContext(req);
    return createWorkspaceOwnedDesignSystemForContext(root, input, context);
  };
  // Persistent half of the sync design: a cheap digest GET decides whether the
  // catalog / member payload this daemon already has on disk is still current,
  // so a cold start (or a workspace not touched in a while) can skip the real
  // round-trip entirely. Snapshots live in the daemon database, which was
  // opened from the resolved runtime data root. See collab/persistent-sync-cache.ts.
  const collabSyncSnapshots = createCollabSyncSnapshotStore(db);
  const velaCliCollabClient = createVelaCliCollabClientFromEnv(process.env);
  const velaCliTeamProjectCatalog = createVelaCliTeamProjectCatalogFromEnv();
  const velaCliWorkspaceTeamProjectCatalog =
    createVelaCliTeamProjectCatalogClientFromEnv();
  // Generic stale-while-revalidate cache (with an `invalidate()` escape hatch)
  // — see collab/swr-cache.ts.
  // Cache the workspace-scoped team catalog behind /api/workspaces/:id/projects
  // ?view=… (the "All projects"/"Recent" pages) the same way. The wrapper keeps
  // the verified request principal in both its key and its upstream call, so
  // navigation stays instant without letting an active-workspace switch retarget
  // an in-flight read.
  const workspaceTeamProjectCatalog = velaCliWorkspaceTeamProjectCatalog
    ? createScopedVelaTeamProjectCatalogClientCache(
        velaCliWorkspaceTeamProjectCatalog,
      )
    : velaCliWorkspaceTeamProjectCatalog;
  // Preserve the legacy observation API for compatibility tests and dev
  // tooling. Production data-plane routes never read current/lastKnown; they
  // verify the exact Workspace/member carried by each request.
  const workspaceContext = withLastKnownWorkspaceContext(
    createWorkspaceContextProviderFromEnv(process.env, {
      configuredEnv: configuredAmrEnv,
      fetchWorkspaceDirectory,
      getActiveWorkspaceId: () => activeWorkspace.get(),
      // The expected value keeps a directory-derived bootstrap/recovery write
      // from overwriting a newer user switch queued by another tab.
      replaceLocalSelection: (expectedWorkspaceId, workspaceId) =>
        activeWorkspace.replaceIf(expectedWorkspaceId, workspaceId),
    }),
  );
  const workspaceExactContextCache = createWorkspaceExactContextCache({
    provider: workspaceContext,
    identity: () => velaWorkspaceDirectoryIdentity(
      readVelaControlApiContext,
      configuredAmrEnv(),
    ),
    onDecision: (input) => recordWorkspaceAuthorityDecision({
      mode: workspaceAuthorityCacheMode,
      ...input,
    }),
    onSuppressedRequest: (input) => recordWorkspaceAuthoritySuppressedRequest({
      mode: workspaceAuthorityCacheMode,
      ...input,
    }),
    onInvalidation: (input) => recordWorkspaceAuthorityInvalidation({
      mode: workspaceAuthorityCacheMode,
      ...input,
    }),
  });
  let workspaceHubAccountIdentity = velaWorkspaceDirectoryIdentity(
    readVelaControlApiContext,
    configuredAmrEnv(),
  );
  const resetWorkspaceIdentityCaches = (): void => {
    workspaceDirectoryAuthority.resetIdentity();
    workspaceExactAuthorityCache.resetIdentity();
    workspaceExactContextCache.resetIdentity();
  };
  const refreshWorkspaceHubAccountIdentity = (): void => {
    const currentIdentity = velaWorkspaceDirectoryIdentity(
      readVelaControlApiContext,
      configuredAmrEnv(),
    );
    if (currentIdentity === workspaceHubAccountIdentity) return;
    workspaceHubAccountIdentity = currentIdentity;
    resetWorkspaceIdentityCaches();
    workspaceHubSubscriptions?.refreshEndpoints();
  };
  const fetchWorkspaceDirectoryForAccountSurface = () => {
    refreshWorkspaceHubAccountIdentity();
    return fetchWorkspaceDirectory();
  };
  const workspaceContextProvider = workspaceExactContextCache.provider;
  const cachedWorkspaceContextForRequest = (
    req: unknown,
    requestedWorkspaceId?: string,
  ): WorkspaceCollabContext | null => {
    refreshWorkspaceHubAccountIdentity();
    const claimed = workspaceResourceContextFromRequest(req);
    if (!claimed || claimed === 'missing') return null;
    if (
      requestedWorkspaceId &&
      claimed.workspaceId !== requestedWorkspaceId.trim()
    ) {
      return null;
    }
    const cached = workspaceExactContextCache.cached(claimed.workspaceId);
    return cached &&
      cached.workspaceMemberId === claimed.workspaceMemberId &&
      cached.memberStatus === 'active' &&
      cached.lifecycleState !== 'deleted'
      ? cached
      : null;
  };
  const verifyWorkspaceContextReadAuthority = async (req: unknown) => {
    refreshWorkspaceHubAccountIdentity();
    const claimed = workspaceResourceContextFromRequest(req);
    if (claimed && claimed !== 'missing') {
      const cached = workspaceExactAuthorityCache.cached(
        claimed.workspaceId,
        claimed.workspaceMemberId,
      );
      if (cached) {
        return {
          ok: true as const,
          context: workspaceContextFromDirectoryItem(cached, configuredAmrEnv()),
        };
      }
    }
    // The exact cache is directory-sourced and usable only under strict SSE
    // health. Every miss preserves the legacy directory verification.
    return verifyWorkspaceReadAuthority(req);
  };
  /**
   * Where a created project belongs for the surfaces with no authorization gate
   * of their own. An explicit pair is verified through the same fresh directory
   * authority as `POST /api/projects`; a headerless legacy/local request remains
   * unbound. No active/current/last-known Workspace is consulted.
   */
  const resolveCreatedProjectHome = createCreatedProjectWorkspaceResolver({
    ...(fetchProjectCreationWorkspaceDirectory
      ? { fetchWorkspaceDirectory: fetchProjectCreationWorkspaceDirectory }
      : {}),
    configuredEnv: configuredAmrEnv,
  });
  function persistWorkspaceProjectSyncState(
    projectId: string,
    workspaceId: string | null | undefined,
    syncState: 'synced' | 'sync_failed',
  ) {
    if (!workspaceId) return;
    // Where a background upload got to is sync bookkeeping, not a change to the
    // project — see SYNC_KEEPS_UPDATED_AT.
    updateWorkspaceProject(db, workspaceId, projectId, {
      syncState,
      updatedAt: SYNC_KEEPS_UPDATED_AT,
    });
  }
  function persistWorkspaceProjectVisibility(
    input: {
      projectId: string;
      principal?: ResourceHubPrincipal | null;
      visibility: 'personal' | 'team';
      ownerMemberId?: string | null;
      updatedByMemberId?: string | null;
    },
  ) {
    const workspaceId = input.principal?.teamId;
    if (!workspaceId) return;
    const project = getProject(db, input.projectId);
    // Keyed on the PROJECT, not on (workspace, project): a project belongs to
    // exactly one workspace (collab/workspace-project-home.ts), so a project
    // already bound elsewhere must not gain a second row here.
    if (project && !getWorkspaceProjectByProjectId(db, input.projectId)) {
      ensureWorkspaceProject(db, {
        projectId: input.projectId,
        workspaceId,
        visibility: 'personal',
        resourceState: 'active',
        createdByWorkspaceMemberId: input.ownerMemberId ?? input.updatedByMemberId ?? null,
        updatedByWorkspaceMemberId: input.updatedByMemberId ?? input.ownerMemberId ?? null,
        resourceHubResourceId: null,
        cloudTombstonedAt: null,
        syncState: 'local_only',
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
    }
    const patch = input.visibility === 'team'
      ? {
          visibility: 'team',
          createdByWorkspaceMemberId: input.ownerMemberId ?? input.updatedByMemberId ?? null,
          updatedByWorkspaceMemberId: input.updatedByMemberId ?? input.ownerMemberId ?? null,
          resourceHubResourceId: projectResourceIdFor(input.projectId, input.principal),
          cloudTombstonedAt: null,
          syncState: 'synced',
        }
      : {
          visibility: 'personal',
          updatedByWorkspaceMemberId: input.updatedByMemberId ?? input.ownerMemberId ?? null,
          resourceHubResourceId: null,
          cloudTombstonedAt: Date.now(),
          syncState: 'local_only',
        };
    const persist = db.transaction(() => {
      // `rebindWorkspaceProject`, not `updateWorkspaceProject`: the row this
      // event is about can predate the share — a personal draft the user made
      // before ever joining the team it just got shared into — so it sits under
      // an unrelated, stale workspace_id. Asking for an update scoped to the
      // NEW workspaceId would find nothing and silently never migrate it.
      rebindWorkspaceProject(db, input.projectId, { ...patch, workspaceId });
      if (input.visibility === 'team') {
        ensureTeamProjectCommentConversations(db, input.projectId);
      }
    });
    persist();
  }
  /**
   * The recvqzaDvUU6B3 fresh-install wipe guard's one db-backed predicate:
   * is this project's local record still an unmaterialized shared-project
   * placeholder (see collab/shared-project-placeholder.ts)? Consulted by the
   * publish watcher's shouldPublish AND the runtime's scheduler publish gate,
   * so neither a new watch nor an already-scheduled flush can push a
   * placeholder's empty directory over the team's real hub content.
   */
  const projectIsUnmaterializedSharedPlaceholder = (projectId: string): boolean =>
    isUnmaterializedSharedPlaceholder(getProject(db, projectId));
  let invalidatePresenceReadCache = (
    _projectId: string,
    _workspaceId?: string,
  ): void => {};
  let markPresenceReadCacheStale = (
    _projectId: string,
    _workspaceId?: string,
  ): void => {};
  const collab = createCollabRuntime({
    workspaceContext: workspaceContextProvider,
    canPublishProjectContent: (projectId) =>
      !projectIsUnmaterializedSharedPlaceholder(projectId),
    resolveProjectDir: async (projectId) => {
      const project = getProject(db, projectId);
      if (project) await ensureProject(PROJECTS_DIR, projectId, project.metadata);
      return resolveProjectShareDir(PROJECTS_DIR, projectId, project, resolveProjectDir);
    },
    resolvePullDir: (projectId) => resolveProjectDir(PROJECTS_DIR, projectId),
    describeProject: describeCollabProject,
    ...(velaCliTeamProjectCatalog ? { teamProjectCatalog: velaCliTeamProjectCatalog } : {}),
    onPublished: ({ projectId, principal }) => {
      persistWorkspaceProjectSyncState(projectId, principal?.teamId, 'synced');
    },
    onError: ({ projectId, principal }) => {
      persistWorkspaceProjectSyncState(projectId, principal?.teamId, 'sync_failed');
    },
    onMetadataRefreshError: ({ projectId, principal, error }) => {
      console.warn(
        `[od] team project metadata refresh will retry (${principal.teamId}/${projectId}):`,
        error,
      );
    },
    onMetadataRefreshPending: ({ projectId, principal }) => {
      setWorkspaceProjectMetadataRefreshPending(db, principal.teamId, projectId, true);
    },
    onMetadataRefreshComplete: ({ projectId, principal }) => {
      setWorkspaceProjectMetadataRefreshPending(db, principal.teamId, projectId, false);
    },
    // Collab realtime hop-2: a member joined/left this project's presence set
    // (fires only on explicit join/leave, not on every heartbeat). Push a thin
    // `presence-changed` onto the project's existing events SSE so the open
    // project view re-fetches presence instead of waiting for its poll tick.
    onPresenceChange: ({ projectId }) => {
      markPresenceReadCacheStale(projectId);
      emitProjectEvent(projectId, { type: 'presence-changed', projectId, at: Date.now() });
    },
  });
  for (const share of listTeamWorkspaceProjectShares(db)) {
    const restored = recoverPersistedTeamShareOwnership(share);
    if (!restored) continue;
    collab.rememberTeamShare(
      restored.projectId,
      restored.principal,
      share.syncState === 'synced' || share.syncState === 'sync_failed' || share.syncState === 'pending_upload'
        ? share.syncState
        : 'pending_upload',
      { metadataRefreshPending: Boolean(share.metadataRefreshPending) },
    );
  }
  /**
   * Heal `workspace_projects` rows that already violate the team-share
   * invariant: `visibility: 'team'` pinned to a PERSONAL workspace (see
   * collab/team-share-scope.ts). Older builds let a share taken while the client
   * sat on its personal workspace persist such a row, and the code guards alone
   * leave an affected user permanently stuck — the row 403s every collab call it
   * scopes and nothing ever rewrites it.
   *
   * Reconciliation at startup rather than a schema migration: the contradiction
   * is only decidable against the workspace DIRECTORY (which ids are teams),
   * which is a signed-in network fact a migration cannot see. Demotion is
   * therefore evidence-gated — a workspace the directory does not name is left
   * exactly as-is, and `visibility: 'personal'` rows are never candidates.
   *
   * A demoted row goes back to a local draft rather than being re-pointed at
   * some team: which team was intended is not recoverable, and the user can
   * simply re-share from the team workspace, which now writes a valid row. This
   * touches local state only — no hub resource is deleted — and deliberately
   * leaves `cloudTombstonedAt` null, so a copy that genuinely exists in the team
   * catalog keeps showing up instead of being suppressed as "unshared here".
   */
  const reconcileImpossibleTeamShares = async (): Promise<number> => {
    await listWorkspaceDirectory();
    const broken = impossibleTeamShareRows(listTeamWorkspaceProjectShares(db), workspaceTypes);
    for (const row of broken) {
      console.warn(
        `[od] healing project ${row.projectId}: its team share pointed at personal workspace ` +
          `${row.workspaceId}, which has no team plane. Re-share it from a team workspace.`,
      );
      updateWorkspaceProject(db, row.workspaceId, row.projectId, {
        visibility: 'personal',
        resourceHubResourceId: null,
        cloudTombstonedAt: null,
        syncState: 'local_only',
        // A startup heal of a row that was never valid; nobody changed the
        // project — see SYNC_KEEPS_UPDATED_AT.
        updatedAt: SYNC_KEEPS_UPDATED_AT,
      });
    }
    return broken.length;
  };
  void reconcileImpossibleTeamShares().catch((error) => {
    console.warn('[od] team-share scope reconciliation failed:', error);
  });
  // Spec 9.2 one-time backfill: claim every pre-existing user design system
  // whose metadata.json already names a workspace into the generic
  // `workspace_resources` table too. Idempotent (see
  // `backfillDesignSystemWorkspaceResources`'s own doc comment), so running
  // it unconditionally on every startup is deliberate, same as
  // `reconcileImpossibleTeamShares` just above.
  void backfillDesignSystemWorkspaceResources(db, USER_DESIGN_SYSTEMS_DIR).catch((error) => {
    console.warn('[od] design-system workspace-resource backfill failed:', error);
  });
  const collabCloudClient = velaCliCollabClient ?? createCollabCloudClientFromEnv();
  const resolveBoundProjectWorkspaceContext = async (
    projectId: string,
    options: { fresh?: boolean } = {},
  ): Promise<WorkspaceCollabContext | null> => {
    const binding = getWorkspaceProjectByProjectId(db, projectId);
    const workspaceId = binding?.workspaceId?.trim();
    if (!workspaceId) return null;
    const directory = await (
      options.fresh
        // `fresh` is requested only by the durable comment-outbox recovery
        // service. It must bypass a settled success lease but share the daemon's
        // account-wide outage circuit with other background recovery work.
        ? fetchFreshBackgroundWorkspaceDirectory()
        : fetchWorkspaceDirectory()
    ).catch(() => ({
      ok: false as const,
      items: [],
    }));
    if (!directory.ok) return null;
    const membership = directory.items.find(
      (item) =>
        item.workspaceId === workspaceId
        && item.workspaceType === 'team'
        && item.memberStatus === 'active'
        && item.lifecycleState !== 'deleted',
    );
    return membership
      ? workspaceContextFromDirectoryItem(membership, configuredAmrEnv())
      : null;
  };

  // Uncached remote catalog authority for both comment relay delivery and the
  // later project-sharing routes. A missing row is authoritative unshare;
  // transport failure throws so the durable outbox keeps the delivery pending.
  const teamProjectsLister = createTeamProjectsLister({
    ...(velaCliTeamProjectCatalog ? { teamProjectCatalog: velaCliTeamProjectCatalog } : {}),
  });

  // Collab cloud (C-lane §D2.5/§D4): cross-daemon comment sync + member
  // directory. The client is null (all calls degrade to no-op) unless
  // OD_COLLAB_CLOUD_URL is set. The service ties it to the one workspace context
  // so a single identity drives member registration, comment push, and the
  // pull+merge poller. Kept out of collab/runtime.ts to avoid colliding with the
  // team-project-catalog work also editing that file.
  const collabCloud = collabCloudClient
    ? createCollabCloudService({
        client: collabCloudClient,
        commentOutbox: createCommentRelayOutboxStore(db),
        resolveLocalProjectRelayBinding: (projectId) => {
          const binding = getWorkspaceProjectByProjectId(db, projectId);
          const workspaceId = binding?.workspaceId?.trim() ?? '';
          const ownerMemberId = binding?.createdByWorkspaceMemberId?.trim() || null;
          if (
            !workspaceId
            || binding?.visibility !== 'team'
            || binding?.resourceState === 'deleted'
          ) return null;
          return { workspaceId, ownerMemberId };
        },
        validateCommentRelayProjectBinding: (record) =>
          commentRelayLocalBindingMatches(
            record,
            getWorkspaceProjectByProjectId(db, record.projectId),
          ),
        resolveCommentRelayWorkspaceContext: async (queuedIdentity) => {
          const context = await resolveAuthoritativeTeamWorkspaceContext(
            queuedIdentity.workspaceId,
            { fresh: true, backgroundFresh: true },
          );
          const principal = contextToResourceHubPrincipal(context);
          if (
            !context
            || !principal
            || principal.memberId !== queuedIdentity.workspaceMemberId
            || principal.teamId !== queuedIdentity.teamId
          ) return null;
          return context;
        },
        listRemoteProjectRelayBindings: async (context) =>
          (await teamProjectsLister(context.workspaceId)).map((project) => ({
            projectId: project.projectId,
            ownerMemberId: project.ownerMemberId,
          })),
        resolveRemoteProjectOwnerMemberId: async (projectId, context) =>
          (await teamProjectsLister(context.workspaceId))
            .find((project) => project.projectId === projectId)
            ?.ownerMemberId ?? null,
        workspaceContext: collab.workspaceContext,
        // Only poll comments for projects the UI is actively viewing — those
        // have a live `/api/projects/:id/events` SSE subscriber, so their id is
        // a key in activeProjectEventSinks. Polling every local project each 5s
        // cycle spawned one `vela collab comment pull` subprocess per project
        // and did not scale: a workspace with many shared projects turned every
        // tick into a spawn storm that starved the pull the open project was
        // waiting on. A member picks up a project's comments when they open it
        // (a fresh sink) and stops polling it once they navigate away.
        listProjectIds: () => [...activeProjectEventSinks.keys()],
        resolveProjectWorkspaceContext: resolveBoundProjectWorkspaceContext,
        resolveLocalConversationId: (projectId) =>
          getProjectCommentAnchorConversationId(db, projectId),
        mergeComment: ({ projectId, conversationId, comment }) =>
          mergeSyncedPreviewComment(db, projectId, conversationId, comment),
        onError: (error) => console.warn('[od] collab cloud sync error:', error),
        onCommentPushed: ({ projectId, commentId, seq }) => {
          confirmPreviewCommentPinSeq(db, projectId, commentId, seq);
        },
        // Collab realtime hop-2 (reference path): when the ~5s comment self-poll
        // merges any teammate change into local storage (a new comment, a
        // strictly-newer edit/status change, or a delete tombstone all count),
        // push a thin `comment-changed` onto the project's existing events SSE.
        // The open project view re-fetches the comment list on receipt, so the
        // owner sees a member's freshly-synced comment without waiting for the
        // web poll tick.
        onMerged: ({ projectId }) =>
          emitProjectEvent(projectId, {
            type: 'comment-changed',
            projectId,
            at: Date.now(),
          }),
      })
    : null;
  // The poller registers each open project's exact bound membership before it
  // pulls. There is deliberately no ambient startup registration: no project
  // scope exists yet, so active-workspace state is not data-plane authority.
  collabCloud?.start();
  // Server-authoritative owner lookup for register-on-pull: read the shared
  // project's owner from the team hub (the same list the discovery endpoint
  // serves) rather than trusting a client-supplied id, so a pulled project is
  // recorded read-only under its true single writer.
  type TeamProjectsDisplayScope = {
    workspaceId: string;
    workspaceMemberId: string;
  };
  const teamProjectsDisplayScopeFromContext = (
    context: WorkspaceCollabContext | null,
  ): TeamProjectsDisplayScope | null => {
    if (
      !context
      || context.workspaceType !== 'team'
      || context.memberStatus !== 'active'
      || context.lifecycleState === 'deleted'
    ) {
      return null;
    }
    const workspaceId = context.workspaceId.trim();
    const workspaceMemberId = context.workspaceMemberId.trim();
    return workspaceId && workspaceMemberId
      ? { workspaceId, workspaceMemberId }
      : null;
  };
  const teamProjectsDisplayScopeKey = (
    scope: TeamProjectsDisplayScope,
  ): string => JSON.stringify([scope.workspaceId, scope.workspaceMemberId]);
  // Persistent snapshot layer for the display catalog. Each fetcher and digest
  // reader closes over one immutable Workspace scope; no await can retarget it
  // through a later active-workspace switch.
  const teamProjectsCatalogSnapshots = new Map<
    string,
    ReturnType<typeof createPersistentSyncCache<TeamProject[]>>
  >();
  const teamProjectsCatalogSnapshotFor = (
    scope: TeamProjectsDisplayScope,
  ) => {
    const key = teamProjectsDisplayScopeKey(scope);
    let snapshot = teamProjectsCatalogSnapshots.get(key);
    if (!snapshot) {
      const capturedScope = { ...scope };
      snapshot = createPersistentSyncCache({
        face: 'catalog',
        fetch: () => teamProjectsLister(capturedScope.workspaceId),
        readDigest: createSyncDigestReader({
          env: process.env,
          getWorkspaceId: () => capturedScope.workspaceId,
          onError: (error) =>
            console.warn('[od] team projects digest error:', error),
        }),
        store: collabSyncSnapshots,
        parseSnapshot: parseTeamProjectSnapshot,
        onError: (error) =>
          console.warn('[od] team projects snapshot cache error:', error),
      });
      teamProjectsCatalogSnapshots.set(key, snapshot);
    }
    return snapshot;
  };
  // Short-TTL, single-flight cache for the read-only DISPLAY path
  // (GET /api/workspace/projects/team). Each entry is keyed by the explicit,
  // immutable workspace + member scope captured for that request, so a later
  // active-workspace switch cannot retarget an in-flight read or its cache
  // write. Deliberately NOT used by resolveSharedProject below: the pull gate
  // and comment/presence relays must observe an unshare immediately, so those
  // use the uncached exact lookup. A just-shared/unshared project shows up in
  // this list within the TTL.
  const teamProjectsDisplayCache = (() => {
    const freshMs = 3000;
    const lists = new Map<
      string,
      ReturnType<typeof createSwrCache<TeamProject[]>>
    >();
    const workspaceIds = new Map<string, string>();
    const read = (scope: TeamProjectsDisplayScope) => {
      const key = teamProjectsDisplayScopeKey(scope);
      let list = lists.get(key);
      if (!list) {
        const snapshot = teamProjectsCatalogSnapshotFor(scope);
        list = createSwrCache(
          () => snapshot(),
          () => key,
          freshMs,
        );
        lists.set(key, list);
        workspaceIds.set(key, scope.workspaceId);
      }
      return list();
    };
    return Object.assign(read, {
      invalidate(scope?: TeamProjectsDisplayScope) {
        if (scope) {
          const key = teamProjectsDisplayScopeKey(scope);
          lists.get(key)?.invalidate();
          lists.delete(key);
          workspaceIds.delete(key);
          teamProjectsCatalogSnapshots.get(key)?.invalidate();
          teamProjectsCatalogSnapshots.delete(key);
          return;
        }
        for (const list of lists.values()) list.invalidate();
        for (const snapshot of teamProjectsCatalogSnapshots.values()) {
          snapshot.invalidate();
        }
        lists.clear();
        teamProjectsCatalogSnapshots.clear();
        workspaceIds.clear();
      },
      invalidateWorkspace(workspaceIdInput: string) {
        const workspaceId = workspaceIdInput.trim();
        if (!workspaceId) return;
        for (const [key, cachedWorkspaceId] of workspaceIds) {
          if (cachedWorkspaceId !== workspaceId) continue;
          lists.get(key)?.invalidate();
          lists.delete(key);
          teamProjectsCatalogSnapshots.get(key)?.invalidate();
          teamProjectsCatalogSnapshots.delete(key);
          workspaceIds.delete(key);
        }
      },
    });
  })();
  /**
   * Drop catalog rows this member has already moved back to "personal".
   *
   * A move to personal deletes the hub catalog row in the same request, but
   * every display read above goes through a stale-while-revalidate cache, so
   * for up to one TTL the list still carries the row that was just deleted.
   * That is long enough to paint the "shared" badge back onto a project the
   * user just made private — the unshare looks like it silently reverted. It
   * would also let the publish watcher re-adopt the project as owned-and-
   * shared and republish it.
   *
   * `cloudTombstonedAt` on the local workspace row is the truth for "this
   * member unshared it"; a re-share clears it (see `workspaceProjectMovePatch`
   * in routes/project). The filter runs on the cache OUTPUT, not inside it, so
   * a value cached before the unshare is still gated. Owner scoping keeps a
   * teammate's own share of the same project id visible.
   */
  const withoutLocallyUnsharedProjects = async <
    T extends { projectId: string; ownerMemberId: string },
  >(
    projects: T[],
    explicitScope?: { workspaceId: string; workspaceMemberId: string },
  ): Promise<T[]> => {
    if (!explicitScope || projects.length === 0) return projects;
    const { workspaceId, workspaceMemberId: memberId } = explicitScope;
    const tombstoned = new Set(
      listWorkspaceProjects(db, workspaceId)
        .filter((row: any) => row.workspaceVisibility === 'personal' && row.cloudTombstonedAt != null)
        .map((row: any) => row.id),
    );
    if (tombstoned.size === 0) return projects;
    return projects.filter(
      (entry) => !(entry.ownerMemberId === memberId && tombstoned.has(entry.projectId)),
    );
  };
  const teamProjectsForDisplay = async (
    context: WorkspaceCollabContext | null,
  ): Promise<TeamProject[]> => {
    const scope = teamProjectsDisplayScopeFromContext(context);
    if (!scope) return [];
    return withoutLocallyUnsharedProjects(
      await teamProjectsDisplayCache(scope),
      scope,
    );
  };
  /**
   * Non-destructive quarantine marker for a pulled Team mirror. The binding
   * state is the central data-plane gate; the project metadata marker also
   * protects legacy/raw read surfaces and records why the bytes remain on
   * disk. Only a later authorized materialization clears it.
   */
  const revokedTeamProjectMirrors = new Set(
    listProjects(db)
      .filter((project: any) => project?.metadata?.teamMirrorRevokedAt)
      .map((project: any) => project.id as string),
  );
  const setTeamProjectMirrorRevoked = (
    projectId: string,
    revoked: boolean,
  ): void => {
    const project = getProject(db, projectId);
    if (!project) return;
    const metadata: Record<string, unknown> = {
      ...((project.metadata as Record<string, unknown> | null) ?? {}),
    };
    if (revoked) {
      revokedTeamProjectMirrors.add(projectId);
      if (metadata.teamMirrorRevokedAt) return;
      metadata.teamMirrorRevokedAt = Date.now();
    } else {
      revokedTeamProjectMirrors.delete(projectId);
      if (!metadata.teamMirrorRevokedAt) return;
      delete metadata.teamMirrorRevokedAt;
    }
    updateProject(db, projectId, {
      metadata,
      updatedAt: SYNC_KEEPS_UPDATED_AT,
    });
  };
  // Collab realtime reconciliation: react to a `team-projects-changed` signal
  // (hub push OR the 15s poller's own diff, wired below) by actually
  // re-checking this daemon's `workspace_projects` rows against the remote
  // catalog, not just refreshing the display cache. See
  // `collab/workspace-projects-reconciler.ts` for the full design and its
  // relationship to `reconcileUnboundProjectBeforeMove` /
  // `reconcileLocalRowWithRemoteTeamAccess` (routes/project/index.ts), which
  // this does NOT replace.
  const workspaceProjectsReconcilerDeps = (
    requestedWorkspaceId: string,
  ): WorkspaceProjectsReconcilerDeps => {
    // Capture the trigger's Workspace before the first await. Hub events pass
    // their subscribed/event Workspace and pollers pass their persisted exact
    // subscription scope. The directory then verifies that identity once, and
    // the result is carried through every catalog/list/tombstone step below.
    const capturedWorkspaceId = requestedWorkspaceId.trim();
    return {
      getWorkspaceIdentity: async () => {
        if (!capturedWorkspaceId) return null;
        const directory = await fetchWorkspaceDirectory().catch(() => ({
          ok: false,
          items: [],
        }));
        if (!directory.ok) return null;
        const scope = teamResourceRequestScopeForWorkspaceId(
          directory.items,
          capturedWorkspaceId,
        );
        if (!scope) return null;
        return {
          workspaceId: capturedWorkspaceId,
          workspaceMemberId: scope.principal.memberId,
          principal: scope.principal,
        };
      },
      // Membership, not display: a catalog row whose latest publish failed is
      // still registered to its owner, so it must keep counting as "remote
      // lists it" here even though the display list hides it. Judging this
      // dep by the display read demoted a teammate's sync-failed mirror into
      // a self-attributed personal draft (recvqzjnshIlOe) — see
      // `reconcilerRemoteTeamProjects`'s invariant comment. Both sources run
      // through `withoutLocallyUnsharedProjects` so a row this member just
      // moved back to personal cannot be re-bound out from under the move
      // while the hub deletion is still propagating.
      // The membership read is deliberately UNCACHED (the raw catalog client,
      // not the SWR-wrapped display caches): reconciliation only runs on
      // team-projects-changed signals, and a ≤TTL-stale list here is exactly
      // the shape that misreads a just-shared row as absent.
      listRemoteTeamProjects: async (identity) => {
        // An absent row is destructive evidence only when the complete,
        // unfiltered catalog was read successfully. The display list hides
        // failed/pending publishes, so falling back to it could mistake a
        // partial view for a real unshare and revoke a valid mirror. Throwing
        // here makes the reconciler fail closed and leave every local binding
        // untouched until the authoritative transport is available again.
        if (!velaCliWorkspaceTeamProjectCatalog) {
          throw new Error('complete team project catalog unavailable');
        }
        return reconcilerRemoteTeamProjects({
          listCatalogMembership: async () =>
            (await withoutLocallyUnsharedProjects(
              await velaCliWorkspaceTeamProjectCatalog.list(identity.principal),
              {
                workspaceId: identity.workspaceId,
                workspaceMemberId: identity.workspaceMemberId,
              },
            )).map((record) => ({
              projectId: record.projectId,
              ownerMemberId: record.ownerMemberId,
              displayName: record.displayName,
              catalogRevisionAt: Number.isFinite(Date.parse(record.updatedAt))
                ? Date.parse(record.updatedAt)
                : null,
              originProjectUpdatedAt: record.originProjectUpdatedAt,
            })),
          listDisplayTeamProjects: async () => {
            throw new Error('display team project catalog is not authoritative');
          },
        });
      },
      // Materialization gate for the bind direction — see the dep's doc
      // comment in workspace-projects-reconciler.ts. `getProject` is the same
      // `projects`-table read `workspace_projects`' FOREIGN KEY points at.
      hasLocalProject: (projectId) => getProject(db, projectId) != null,
      listLocalTeamRows: (workspaceId): LocalTeamProjectBinding[] =>
        listWorkspaceProjects(db, workspaceId)
          .filter((row: any) => row.workspaceVisibility === 'team')
          .map((row: any) => ({
            projectId: row.id,
            workspaceId: row.workspaceId,
            visibility: row.workspaceVisibility,
            resourceState: row.resourceState ?? null,
            createdByWorkspaceMemberId: row.createdByWorkspaceMemberId ?? null,
            resourceHubResourceId: row.resourceHubResourceId ?? null,
            materializationPending:
              projectIsUnmaterializedSharedPlaceholder(row.id),
          })),
      getLocalBinding: (projectId): LocalTeamProjectBinding | null => {
        const row = getWorkspaceProjectByProjectId(db, projectId) as any;
        if (!row) return null;
        return {
          projectId,
          workspaceId: row.workspaceId,
          visibility: row.visibility,
          resourceState: row.resourceState ?? null,
          createdByWorkspaceMemberId: row.createdByWorkspaceMemberId ?? null,
          resourceHubResourceId: row.resourceHubResourceId ?? null,
          materializationPending:
            projectIsUnmaterializedSharedPlaceholder(projectId),
        };
      },
      getLocalProjectMetadata: (projectId) => {
        const project = getProject(db, projectId);
        return project
          ? { name: project.name, updatedAt: project.updatedAt }
          : null;
      },
      applyMetadataRefresh: (projectId, patch) => {
        // `patch.updatedAt` is the owner's origin project time carried in the
        // catalog metadata, never the catalog row's retry/observation time.
        updateProject(db, projectId, patch);
      },
      applyBind: (projectId, patch) => {
        // `rebindWorkspaceProject` only corrects an EXISTING row (it never
        // inserts — see its own doc comment in db.ts); a project this daemon
        // has never locally bound at all needs `ensureWorkspaceProject`
        // instead, seeded with the same patch so the fresh row is correct on
        // arrival.
        //
        // Reconciling a binding against B's catalog changes no project content,
        // so it must not restamp "last changed" — see SYNC_KEEPS_UPDATED_AT.
        const synced = { ...patch, updatedAt: SYNC_KEEPS_UPDATED_AT };
        if (rebindWorkspaceProject(db, projectId, synced)) return;
        ensureWorkspaceProject(db, { projectId, ...synced });
      },
      applyDemote: (workspaceId, projectId, patch) => updateWorkspaceProject(db, workspaceId, projectId, {
        ...patch,
        updatedAt: SYNC_KEEPS_UPDATED_AT,
      }),
      applyRevoke: (workspaceId, projectId, patch) => {
        // Write the binding denial before the metadata marker. A crash between
        // the two operations therefore fails closed, never open. The
        // transaction keeps the auditable marker and authority state aligned.
        db.transaction(() => {
          updateWorkspaceProject(db, workspaceId, projectId, {
            ...patch,
            updatedAt: SYNC_KEEPS_UPDATED_AT,
          });
          setTeamProjectMirrorRevoked(projectId, true);
        })();
      },
      onError: (error) => console.warn('[od] workspace-projects reconciliation error:', error),
    };
  };
  const reconcileWorkspaceProjectsFromRemote = (
    requestedWorkspaceId: string,
  ) => reconcileWorkspaceProjectsWithRemote(
    workspaceProjectsReconcilerDeps(requestedWorkspaceId),
  );
  const reconcileWorkspaceProjectMetadataFromRemote = (
    requestedWorkspaceId: string,
    projectId: string,
  ) => reconcileWorkspaceProjectMetadataWithRemote(
    workspaceProjectsReconcilerDeps(requestedWorkspaceId),
    projectId,
  );
  const resolveSharedProject = async (
    projectId: string,
    scope?: TeamMirrorPullScope | null,
  ) => {
    // Catalog reads are data-plane operations: never let the Vela adapter
    // substitute the daemon's mutable active Workspace.
    if (!scope?.workspaceId || !scope.viewerMemberId) return null;
    const project = velaCliTeamProjectCatalog
      ? await velaCliTeamProjectCatalog.get(projectId, scope.workspaceId)
      : (await teamProjectsLister(scope.workspaceId))
          .find((entry) => entry.projectId === projectId) ?? null;
    if (!project) return null;
    return (await withoutLocallyUnsharedProjects(
      [project],
      {
        workspaceId: scope.workspaceId,
        workspaceMemberId: scope.viewerMemberId,
      },
    ))[0] ?? null;
  };
  // Security-sensitive ownership decisions stay fresh. Pull, publish,
  // presence, and mutation paths all use this exact lookup so an unshare or
  // member revocation is observed immediately.
  const resolveSharedProjectOwner = async (
    projectId: string,
    explicitScope: { workspaceId: string; workspaceMemberId: string },
  ): Promise<string | null> => {
    const list = await withoutLocallyUnsharedProjects(
      await teamProjectsLister(explicitScope.workspaceId),
      explicitScope,
    );
    return list.find((entry) => entry.projectId === projectId)?.ownerMemberId ?? null;
  };
  // GET /collab/status is a display read whose request authority has already
  // been verified. Reuse the explicit workspace+member catalog cache here so
  // repeated project-open polls do not each wait on another Vela list process.
  // No security-sensitive caller receives this resolver.
  const resolveSharedProjectOwnerForStatus = async (
    projectId: string,
    explicitScope: { workspaceId: string; workspaceMemberId: string },
  ): Promise<string | null> => {
    const list = await withoutLocallyUnsharedProjects(
      await teamProjectsDisplayCache(explicitScope),
      explicitScope,
    );
    return list.find((entry) => entry.projectId === projectId)?.ownerMemberId ?? null;
  };
  // Presence is project-bound data. Its relay scope comes only from the
  // persisted project binding; an ambient active workspace is never a fallback.
  const authoritativePresenceWorkspaces = new Set<string>();
  const presenceScopeFor = (projectId: string): string | undefined =>
    findTeamWorkspaceIdForProject(db, projectId)?.trim() || undefined;
  const verifyPresenceWorkspaceRequest = async (
    req: any,
    projectId: string,
    options: { fresh?: boolean; backgroundFresh?: boolean } = {},
  ) => {
    const verified = await verifyExplicitWorkspaceRequestContext(
      { req },
      options,
    );
    if (!verified.ok) return verified;
    const binding = getWorkspaceProjectByProjectId(db, projectId);
    if (
      binding?.workspaceId
      && binding.workspaceId !== verified.context.workspaceId
    ) {
      return {
        ok: false as const,
        status: 403 as const,
        code: 'WORKSPACE_ACCESS_DENIED' as const,
        message: 'the requested workspace does not own this project',
      };
    }
    return verified;
  };
  const presenceRoutes = registerCollabPresenceRoutes(app, {
    collab,
    // Null when this run has no vela-cli collab transport, which is what keeps
    // the process-local presence fallback reachable. See
    // `createCollabPresenceCloudClient` for the invariant.
    cloud: createCollabPresenceCloudClient(velaCliCollabClient, presenceScopeFor),
    verifyWorkspaceRequest: (req, projectId) =>
      verifyPresenceWorkspaceRequest(req, projectId, { fresh: false }),
    verifyWorkspaceLeaveRequest: (req, projectId) =>
      verifyPresenceWorkspaceRequest(req, projectId, { fresh: true }),
    verifyWorkspaceReadRequest: (req, projectId) =>
      verifyPresenceWorkspaceRequest(req, projectId, { fresh: false }),
    isProjectShared: async (projectId, context) => {
      const projectContext =
        context ?? await resolveBoundProjectWorkspaceContext(projectId);
      if (!projectContext || projectContext.workspaceType !== 'team') return false;
      return Boolean(
        await resolveSharedProjectOwner(projectId, {
          workspaceId: projectContext.workspaceId,
          workspaceMemberId: projectContext.workspaceMemberId,
        }),
      );
    },
    cloudAuthorizesProjectPresence: (projectId) => {
      const workspaceId = findTeamWorkspaceIdForProject(db, projectId)?.trim();
      return Boolean(
        workspaceId && authoritativePresenceWorkspaces.has(workspaceId),
      );
    },
  });
  invalidatePresenceReadCache = presenceRoutes.invalidatePresence;
  markPresenceReadCacheStale = presenceRoutes.markPresenceStale;
  // Author-side publish TRIGGER (C spec §D1): watch the projects THIS daemon's
  // member owns + has shared, and coalesce every file edit into a debounced
  // publish. The read-only gate (team-shared AND owner === me) means a member's
  // pulled copy is never watched, so an inbound pull can't loop into a publish and
  // a member can't publish edits to someone else's project.
  const collabPublishWatcher = createCollabPublishWatcher({
    notifyChanged: (projectId, principal) =>
      collab.scheduler.notifyChanged(projectId, 'file-change', principal),
    listProjectIds: () => listProjects(db).map((project: { id: string }) => project.id),
    shouldPublish: async (projectId) => {
      if (projectIsUnmaterializedSharedPlaceholder(projectId)) return false;
      const workspaceId = findTeamWorkspaceIdForProject(db, projectId)?.trim();
      if (!workspaceId) return false;
      const directory = await fetchWorkspaceDirectory().catch(() => ({
        ok: false as const,
        items: [],
      }));
      if (!directory.ok) return false;
      const scope = teamResourceRequestScopeForWorkspaceId(
        directory.items,
        workspaceId,
      );
      if (!scope?.canShare) return false;
      const ownerMemberId = await resolveSharedProjectOwner(projectId, {
        workspaceId,
        workspaceMemberId: scope.principal.memberId,
      });
      if (ownerMemberId !== scope.principal.memberId) return false;
      collab.rememberTeamShare(projectId, scope.principal);
      return scope.principal;
    },
    subscribeFiles: (projectId, onChange) => {
      const watchProject = getProject(db, projectId);
      const sub = subscribeFileEvents(PROJECTS_DIR, projectId, (evt) => {
        if (evt.type === 'file-changed') onChange();
      }, { metadata: watchProject?.metadata });
      return { unsubscribe: () => sub.unsubscribe() };
    },
    onError: (error) => console.warn('[od] collab publish watcher error:', error),
  });
  collabPublishWatcher.start();
  const sharedProjectPullProfiling =
    sharedProjectPullProfileEnabled(process.env);
  const verifyProjectWorkspaceContextForRequest = async (
    req: any,
    projectId?: string,
    options: { fresh?: boolean } = {},
  ) => {
    const verified = await verifyExplicitWorkspaceRequestContext(
      { req },
      options,
    );
    if (!verified.ok) return verified;
    if (projectId) {
      const binding = getWorkspaceProjectByProjectId(db, projectId);
      if (
        binding?.workspaceId
        && binding.workspaceId !== verified.context.workspaceId
      ) {
        return {
          ok: false as const,
          status: 403 as const,
          code: 'WORKSPACE_ACCESS_DENIED' as const,
          message: 'the requested workspace does not own this project',
        };
      }
    }
    return verified;
  };
  const verifiedWorkspaceContextForRequest = (
    req: any,
    projectId?: string,
  ) => verifyProjectWorkspaceContextForRequest(req, projectId);
  const verifiedWorkspaceReadContextForRequest = (
    req: any,
    projectId?: string,
  ) => verifyProjectWorkspaceContextForRequest(
    req,
    projectId,
    { fresh: false },
  );
  const resolveLocalProjectCommentWorkspaceContext = async (
    req: any,
    projectId: string,
  ) => {
    const binding = getWorkspaceProjectByProjectId(db, projectId);
    if (revokedTeamProjectMirrors.has(projectId)) {
      return {
        ok: false as const,
        status: 403 as const,
        code: 'WORKSPACE_PROJECT_PERMISSION_DENIED',
        message: 'workspace project read is not allowed',
      };
    }
    if (!binding?.workspaceId) {
      return { ok: true as const, context: null };
    }
    if (binding.resourceState === 'deleted') {
      return {
        ok: false as const,
        status: 403 as const,
        code: 'WORKSPACE_PROJECT_PERMISSION_DENIED',
        message: 'workspace project read is not allowed',
      };
    }
    const local = resolveOptionalLocalWorkspaceRequestAuthority(req);
    if (!local.ok) return local;
    if (local.context) {
      if (
        local.context.workspaceId !== binding.workspaceId
        || (
          binding.visibility !== 'team'
          && binding.createdByWorkspaceMemberId
          && local.context.workspaceMemberId
            !== binding.createdByWorkspaceMemberId
        )
      ) {
        return {
          ok: false as const,
          status: 403 as const,
          code: 'WORKSPACE_PROJECT_PERMISSION_DENIED',
          message: 'workspace project access is not allowed',
        };
      }
      return {
        ok: true as const,
        context: {
          ...local.context,
          workspaceType: binding.visibility === 'team' ? 'team' : 'personal',
          ...(binding.visibility === 'team'
            ? { teamId: binding.workspaceId }
            : { teamId: null }),
        },
      };
    }
    const persistedMemberId = binding.createdByWorkspaceMemberId?.trim()
      || 'local-user';
    return {
      ok: true as const,
      context: workspaceContextFromDirectoryItem({
        workspaceId: binding.workspaceId,
        workspaceName: binding.workspaceId,
        workspaceType: binding.visibility === 'team' ? 'team' : 'personal',
        workspaceMemberId: persistedMemberId,
        role: 'member',
        memberStatus: 'active',
        lifecycleState: 'active',
      }, configuredAmrEnv()),
    };
  };
  const resolveProjectCommentWorkspaceContext = (
    req: any,
    projectId: string,
  ) => resolveLocalProjectCommentWorkspaceContext(req, projectId);
  const resolveProjectCommentReadWorkspaceContext = (
    req: any,
    projectId: string,
  ) => resolveLocalProjectCommentWorkspaceContext(req, projectId);
  const resolveFreshProjectCommentWorkspaceContext = async (
    req: any,
    projectId: string,
  ) => {
    const binding = getWorkspaceProjectByProjectId(db, projectId);
    if (
      revokedTeamProjectMirrors.has(projectId)
      || binding?.resourceState === 'deleted'
    ) {
      return {
        ok: false as const,
        status: 403 as const,
        code: 'WORKSPACE_PROJECT_PERMISSION_DENIED',
        message: 'workspace project read is not allowed',
      };
    }
    if (!binding?.workspaceId) {
      return { ok: true as const, context: null };
    }
    return verifiedWorkspaceContextForRequest(req, projectId);
  };
  const verifiedTeamMirrorScope = async (
    scope: TeamMirrorPullScope,
  ): Promise<boolean> => {
    const directory = await fetchWorkspaceDirectory().catch(() => ({
      ok: false as const,
      items: [],
    }));
    if (!directory.ok) return false;
    return directory.items.some(
      (item) =>
        item.workspaceId === scope.workspaceId
        && item.workspaceMemberId === scope.viewerMemberId
        && item.workspaceType === 'team'
        && item.memberStatus === 'active'
        && item.lifecycleState === 'active'
        && item.workspaceId === scope.resourceTeamId,
    );
  };
  const projectContentTransferStates =
    createProjectContentTransferStateStore({
      onChange: (scope, state) => {
        emitProjectEvent(scope.projectId, {
          type: 'project-content-transfer-state',
          projectId: scope.projectId,
          at: state.updatedAt,
        });
      },
    });
  let observeLegacyTeamProjectPull = async (
    _projectId: string,
    _scope: TeamMirrorPullScope,
    _version: number,
  ): Promise<void> => {};
  const collabSyncRoutes = registerCollabSyncRoutes(app, {
    collab,
    publicFilePublicationStore: createSqlitePublicFilePublicationStore(db),
    verifyWorkspaceRequest: verifiedWorkspaceContextForRequest,
    verifyWorkspaceReadRequest: verifiedWorkspaceReadContextForRequest,
    verifyWorkspaceScope: verifiedTeamMirrorScope,
    readContentTransferState: (projectId, scope) =>
      projectContentTransferStates.read({ projectId, ...scope }),
    beginContentTransfer: (projectId, scope, version) =>
      projectContentTransferStates.begin(
        { projectId, ...scope },
        version,
      ).token,
    finishContentTransfer: (projectId, scope, token, version) => {
      projectContentTransferStates.finish(
        { projectId, ...scope },
        token,
        version,
      );
    },
    // Register-on-pull: after a member pulls a shared project, insert a local
    // project record so it appears in /api/projects and opens read-only (the
    // member is not the owner). Idempotent — an already-local project is a no-op.
    projectStore: {
      get: (projectId) => getProject(db, projectId),
      has: (projectId) => getProject(db, projectId) != null,
      register: (input) => {
        insertProject(db, {
          id: input.id,
          name: input.name,
          skillId: input.skillId,
          designSystemId: input.designSystemId,
          metadata: input.metadata,
          createdAt: input.createdAt,
          updatedAt: input.updatedAt,
        });
      },
      update: (input) => {
        updateProject(db, input.id, {
          name: input.name,
          skillId: input.skillId,
          designSystemId: input.designSystemId,
          metadata: input.metadata,
          updatedAt: input.updatedAt,
        });
      },
      materializeTeamMirror: (input, scope) => materializePulledTeamMirror(db, input, scope),
      materializeTeamPlaceholder: (input, scope) =>
        materializePulledTeamMirror(db, input, scope, undefined, { placeholder: true }),
      materializeAuthorizedTeamMirror: (input, scope, receipt) =>
        materializePulledTeamMirror(db, input, scope, receipt),
    },
    resolveProjectDir: async (projectId) => {
      const project = getProject(db, projectId);
      if (project) await ensureProject(PROJECTS_DIR, projectId, project.metadata);
      return resolveProjectShareDir(PROJECTS_DIR, projectId, project, resolveProjectDir);
    },
    resolvePullDir: (projectId) => resolveProjectDir(PROJECTS_DIR, projectId),
    readMaterializedVersion: (projectId, scope) => {
      const authorized = getTeamProjectMaterialization(
        db,
        scope.workspaceId,
        projectId,
      );
      return latestTeamProjectMaterializationVersion(
        authorized,
        teamResourceVersions.get(
          scope.workspaceId,
          'project-content',
          teamProjectContentResourceId(projectId, scope),
        ),
        projectId,
        scope,
      );
    },
    authorizedTeamProjectPull: {
      journalDir: teamMirrorPromotionJournalDir,
    },
    writeMaterializedVersion: (projectId, scope, version) =>
      teamResourceVersions.set(
        scope.workspaceId,
        'project-content',
        teamProjectContentResourceId(projectId, scope),
        String(version),
      ),
    onLegacyPullMaterialized: (projectId, scope, version) =>
      observeLegacyTeamProjectPull(projectId, scope, version),
    resolveSharedProject,
    resolveSharedProjectOwner,
    resolveSharedProjectOwnerForStatus,
    isTeamProjectRevoked: (projectId) =>
      revokedTeamProjectMirrors.has(projectId),
    // Non-destructive revocation flag for a pulled team mirror: the pull gate
    // sets it when a project has left the team (files stay on disk but stop
    // being served) and clears it on a successful re-pull. Read routes refuse to
    // serve a project once this is set.
    markTeamProjectRevoked: setTeamProjectMirrorRevoked,
    // Set/clear the unmaterialized shared-project placeholder stamp (the
    // recvqzaDvUU6B3 fresh-install wipe guard) — same non-destructive
    // metadata-flag pattern as markTeamProjectRevoked above.
    markSharedProjectPlaceholder: (projectId: string, placeholder: boolean) => {
      const project = getProject(db, projectId);
      if (!project) return;
      const metadata: Record<string, unknown> = { ...((project.metadata as Record<string, unknown> | null) ?? {}) };
      if (placeholder) {
        if (metadata[SHARED_PROJECT_PLACEHOLDER_METADATA_KEY]) return;
        metadata[SHARED_PROJECT_PLACEHOLDER_METADATA_KEY] = Date.now();
      } else {
        if (!metadata[SHARED_PROJECT_PLACEHOLDER_METADATA_KEY]) return;
        delete metadata[SHARED_PROJECT_PLACEHOLDER_METADATA_KEY];
      }
      // Raised on placeholder registration and lowered the moment a pull
      // materializes real content. Both are sync steps on someone else's
      // project — see SYNC_KEEPS_UPDATED_AT. This is the flag that made a
      // member's very first open of a shared project read 「刚刚更新」.
      updateProject(db, projectId, { metadata, updatedAt: SYNC_KEEPS_UPDATED_AT });
    },
    // Retracted-share heal (飞书 recvqA6…78612 tokens truncated…ries are skipped because ACP's
    //     stdio-only descriptor can't represent them yet.
    // Other agents (Codex, Gemini, OpenCode, Cursor, Qwen, Qoder, Copilot,
    // Pi, DeepSeek) inherit the user's per-CLI MCP config from their own
    // home dir for now — a future change can grow this list.
    //
    // The MCP config + OAuth tokens were resolved earlier (above
    // composeDaemonSystemPrompt) so the system prompt could mention any
    // already-authenticated servers; we reuse `enabledExternalMcp` and
    // `oauthTokensForSpawn` here for the Claude `.mcp.json` write +
    // ACP merge so we don't pay for a second filesystem read.
    //
    // Claude Code: write `.mcp.json` to the daemon-managed project cwd before
    // spawn so Claude Code auto-loads the user's external MCP servers. Strict
    // gating is essential here:
    //   - cwd must be set (no project → no `.mcp.json` write).
    //   - cwd must live UNDER PROJECTS_DIR. We never write to a git-linked
    //     baseDir (= the user's own repo), since that would silently overwrite
    //     a hand-crafted .mcp.json the user already keeps in their source tree.
    // We also unlink a stale `.mcp.json` we previously wrote when the user has
    // since disabled all servers, so removing a server actually takes effect
    // on the next run.
    // Dispatch on `def.externalMcpInjection` rather than hard-coding agent
    // id / stream-format checks. The three branches are functionally
    // equivalent to the previous shape (claude/acp), with the OpenCode
    // env-content branch added to fix #2142. Runtimes that leave the field
    // undefined fall through unchanged — the settings UI surfaces an
    // explicit "external MCP is not forwarded to <agent>" banner for them
    // so the previous silent-failure UX is gone.
    if (
      def.externalMcpInjection === 'claude-mcp-json' &&
      isManagedProjectCwd(cwd, PROJECTS_DIR)
    ) {
      {
        const target = path.join(cwd, '.mcp.json');
        if (enabledExternalMcp.length > 0) {
          try {
            const claudeMcp = buildClaudeMcpJson(
              enabledExternalMcp,
              oauthTokensForSpawn,
            );
            if (claudeMcp) {
              await fs.promises.mkdir(path.dirname(target), { recursive: true });
              await fs.promises.writeFile(
                target,
                JSON.stringify(claudeMcp, null, 2),
                'utf8',
              );
            }
          } catch (err) {
            console.warn(
              '[mcp-config] failed to write project .mcp.json:',
              err && err.message ? err.message : err,
            );
          }
        } else {
          try {
            await fs.promises.unlink(target);
          } catch (err) {
            if ((err && err.code) !== 'ENOENT') {
              console.warn(
                '[mcp-config] failed to remove stale .mcp.json:',
                err && err.message ? err.message : err,
              );
            }
          }
        }
      }
    }
    if (
      enabledExternalMcp.length > 0 &&
      def.externalMcpInjection === 'acp-merge'
    ) {
      const acpExternal = buildAcpMcpServers(enabledExternalMcp);
      mcpServers.push(...acpExternal);
    }
    // OpenCode: serialise enabled MCP servers into its `mcp` config schema
    // and hand the JSON to the child via `OPENCODE_CONFIG_CONTENT`. The env
    // var is *merged* with the user's saved `~/.config/opencode/opencode
    // .json` (per OpenCode's documented config layering), so adding a
    // server here does not erase whatever the user already has in their
    // global config. We deliberately leave the env unset when no servers
    // are enabled — overwriting with `{}` would wipe the user's saved
    // mcp section for this single invocation, which is exactly the kind
    // of surprise the previous silent-failure UX taught us to avoid.
    let opencodeConfigContent: string | null = null;
    const isOpenCodeContent = def.externalMcpInjection === 'opencode-env-content';
    const isMiMoContent = def.externalMcpInjection === 'mimo-env-content';
    if (isOpenCodeContent || isMiMoContent) {
      try {
        opencodeConfigContent = buildOpenCodeMcpConfigContent(
          enabledExternalMcp,
          oauthTokensForSpawn,
          {
            allowedDirectories: [effectiveCwd, ...extraAllowedDirs],
            ...(byokOpenCodeProvider
              ? { extraConfig: byokOpenCodeProvider.config }
              : {}),
          },
        );
      } catch (err) {
        console.warn(
          '[mcp-config] failed to build OPENCODE_CONFIG_CONTENT:',
          err && err.message ? err.message : err,
        );
      }
    }

    // Pre-flight the composed prompt against any argv-byte budget the
    // adapter declared (only DeepSeek TUI today — its CLI doesn't accept
    // a `-` stdin sentinel, so the prompt has to ride argv). Doing this
    // before bin resolution means the test harness pins the guard
    // independently of whether the adapter binary happens to be on PATH
    // in the CI environment, and the user gets the actionable
    // adapter-named error even if /api/agents hadn't refreshed yet.
    const promptBudgetError = checkPromptArgvBudget(def, composed);
    if (promptBudgetError) {
      design.runs.emit(
        run,
        'error',
        createSseErrorPayload(
          promptBudgetError.code,
          promptBudgetError.message,
          { retryable: false },
        ),
      );
      return finishStrategyAwarePhysicalRun('failed', 1, null);
    }

    let mmdRouteLaunchEnv = null;
    if (def.id === 'claude' && safeModel) {
      mmdRouteLaunchEnv = await loadMmdRouteLaunchEnv(
        {
          ...process.env,
          ...(def.env || {}),
          ...configuredAgentEnv,
        },
        safeModel,
      ).catch(() => null);
    }

    // agentLaunch / resolvedBin are resolved above the resume guard (hoisted).
    // Hoisted above the AMR catalog preflight: the empty-catalog branch
    // below calls `sendAmrAccountFailure(...)` to surface AMR_AUTH_REQUIRED
    // for signed-out users, and a `const` declared later in the same outer
    // function scope would hit a TDZ ReferenceError before initialization.
    const sendAmrAccountFailure = (failure) => {
      send('error', createSseErrorPayload(
        failure.code,
        failure.message,
        {
          retryable: false,
          details: amrAccountFailureDetails(failure),
        },
      ));
    };

    if (def.id === 'amr' && resolvedBin && agentLaunch.launchPath) {
      const launchPath = agentLaunch.launchPath ?? resolvedBin;
      const modelProbeEnv = launchPath
        ? applyAgentLaunchEnv(
            spawnEnvForAgent(
              def.id,
              {
                ...createAgentRuntimeEnv(process.env, daemonUrl, toolTokenGrant),
                ...(def.env || {}),
              },
              configuredAgentEnv,
              undefined,
              { resolvedBin: agentLaunch.selectedPath },
            ),
            agentLaunch,
          )
        : null;
      const amrModelScope = resolveAmrProfile(modelProbeEnv ?? process.env);
      // Resolve the AMR model catalog through the SAME shared cache the UI's
      // `/api/amr/models` endpoint serves (AmrModelLoadingCache): a cached
      // authoritative `vela model list` when it is hot, otherwise the offline
      // `vela model preset` seed while a remote refresh runs in the background.
      //
      // Why not a fresh `vela model list` per run: that authoritative call
      // needs network reachability to the AMR gateway AND `$HOME` (the offline
      // `preset`/`--version` calls need neither), takes up to ~10s, and only
      // retries a narrow set of network errors. Running it blocking on every
      // turn turned any transient gateway/timeout/HOME hiccup into a hard
      // "AMR model … is not available from Vela" — even for a logged-in user
      // who already picked a real model the picker surfaced from the preset
      // seed. Under CorpLink/飞连 the call routinely exceeded the timeout, so
      // AMR became unusable in packaged nightlies. Reusing the cache keeps that
      // blocking probe off the per-run hot path and degrades to preset instead
      // of fail-closing; vela's own `session/set_model` remains the final gate.
      let liveModels = [];
      try {
        const probe = await resolveAmrModelProbe({ dataDir: RUNTIME_DATA_DIR, env: process.env, readAppConfig });
        const catalog = await amrModelLoadingCache.get(probe.cacheKey, {
          fetchPreset: () => fetchVelaPresetModels(probe.launchPath, probe.env),
          fetchRemote: () => fetchVelaRemoteModelsWithRetry(probe.launchPath, probe.env),
        });
        liveModels = catalog.models ?? [];
      } catch (error) {
        // Do not swallow silently: a probe failure here is exactly what made
        // the packaged AMR breakage undiagnosable (the old `catch {}` left no
        // trace in any log or diagnostics bundle). Record it and degrade to the
        // remembered catalog below.
        console.warn('[amr] model catalog preflight probe failed', error);
        liveModels = [];
      }
      const rememberedLiveModels = getRememberedLiveModels(def.id, amrModelScope);
      if (liveModels.length > 0) {
        rememberLiveModels(def.id, liveModels, amrModelScope);
      }
      liveModels = preferFreshLiveModels(liveModels, rememberedLiveModels);
      const liveModelIds = new Set(
        liveModels.map((candidate) => candidate?.id).filter(Boolean),
      );
      // A request that came in as 'default'/empty is normally pre-resolved to a
      // concrete id via the agent-wide cached model order; if it still is not,
      // adopt the catalog's enabled default so the spawn layer always has a
      // usable real id.
      const userAskedForDefault =
        typeof model !== 'string' ||
        !model.trim() ||
        model.trim().toLowerCase() === 'default';
      const defaultRunModel = resolveDefaultModelFromOptions(liveModels);
      if (
        !safeModel ||
        safeModel === 'default' ||
        (
          userAskedForDefault &&
          !hasDefaultModelEnvOverride &&
          defaultRunModel &&
          (!liveModelIds.has(safeModel) || safeModel !== defaultRunModel)
        )
      ) {
        safeModel = defaultRunModel ?? (safeModel === 'default' ? null : safeModel ?? null);
        agentOptions.model = safeModel;
      }
      if (liveModelIds.size === 0) {
        // The catalog is genuinely empty: even the offline preset seed could
        // not be read, which almost always means the user is signed out (`vela`
        // catalog calls 401) or the CLI is unrunnable. Prefer the relogin
        // affordance over a misleading "choose a model".
        if (def.id === 'amr') {
          const loginStatus = readVelaLoginStatus(
            modelProbeEnv ?? process.env,
            configuredAgentEnv,
          );
          if (!loginStatus.loggedIn) {
            sendAmrAccountFailure({
              code: 'AMR_AUTH_REQUIRED',
              message:
                'AMR sign-in is required. Sign in to AMR Cloud again, then retry this run.',
              action: 'relogin',
            });
            return finishStrategyAwarePhysicalRun('failed', 1, null);
          }
        }
        // Logged in but no catalog at all AND no resolvable model: only now is
        // there nothing safe to forward, so surface the model error.
        if (!safeModel) {
          send('error', createAmrModelUnavailablePayload(safeModel, {
            reason: 'model_catalog_unavailable',
          }));
          return finishStrategyAwarePhysicalRun('failed', 1, null);
        }
        // Otherwise fall through with the user's selected model and let vela's
        // `session/set_model` be the authoritative gate.
      } else if (!safeModel) {
        // Catalog known but we could not resolve any model id to forward.
        send('error', createAmrModelUnavailablePayload(
          typeof model === 'string' && model.trim() ? model : safeModel,
          { availableModels: [...liveModelIds] },
        ));
        return finishStrategyAwarePhysicalRun('failed', 1, null);
      }
      // NOTE: when the selected model is absent from the (possibly preset-only
      // or stale) catalog we intentionally do NOT fail-close. The cached/preset
      // catalog can lag the live one, and a logged-in user picked a concrete
      // id; vela rejects a truly unsupported model at `session/set_model` with
      // a precise error, which beats a pre-emptive block on a flaky metadata read.
    }

    // Plain-streaming adapters that own a "continue most recent
    // conversation" CLI flag (today: only `agy -c`) read this signal
    // to resume upstream session state on follow-up turns. The query
    // matches any persisted assistant message in the same conversation
    // EXCEPT the placeholder row this run just inserted (it's still
    // `pending` and has no body — counting it as prior would always
    // force `-c` on the very first turn). Adapters that don't consume
    // this field ignore it.
    const hasPriorAssistantTurn = run.conversationId
      ? Boolean(
          db
            .prepare(
              `SELECT 1 FROM messages
               WHERE conversation_id = ?
                 AND role = 'assistant'
                 AND COALESCE(content, '') <> ''
                 AND id <> COALESCE(?, '')
               LIMIT 1`,
            )
            .get(run.conversationId, run.assistantMessageId ?? ''),
        )
      : false;

    // Antigravity's `agy` is silent on stdout/stderr in print mode for
    // both auth-missing and quota-exhausted failures — the actual
    // RESOURCE_EXHAUSTED / "not logged in" payload only surfaces in
    // its `--log-file`. We allocate a per-run temp path, pipe agy's
    // log to it via buildArgs, then read it in the empty-output guard
    // to disambiguate the silent-failure cause. Other adapters ignore
    // this field.
    const agentLogFilePath =
      def.id === 'antigravity'
        ? path.join(os.tmpdir(), `od-agy-${run.id}.log`)
        : undefined;
    const promptFile = await preparePromptFileForAgent(def, composed, run.id);
    const cleanupPromptFile = () => {
      if (promptFile) promptFile.cleanup().catch(() => {});
    };

    // Codex CLI parses config.toml before processing any -c overrides. An
    // invalid `service_tier` value (the Codex app has written "priority",
    // "default", and other values the CLI rejects) causes an immediate parse
    // error and exit-1 before any work starts. Normalize it in-place — any
    // value outside {fast,flex} has its line removed so the CLI uses its
    // built-in default — so the launch succeeds. Errors are silently swallowed
    // — a missing or read-only config.toml is fine, and the Codex CLI still
    // surfaces the original error if the write fails. See issue #4276 / #3408.
    if (def.id === 'codex') {
      const { normalizeCodexConfigFile } = await import('./codex-config-normalize.js');
      // Route through spawnEnvForAgent so resolveCodexConfigPath sees the same
      // fully-expanded CODEX_HOME the Codex child process will see. In
      // particular, spawnEnvForAgent calls expandConfiguredEnv which expands
      // `~/` / `~\` prefixes — a user-configured CODEX_HOME="~/.codex-alt"
      // would otherwise resolve to the literal path "~/.codex-alt/config.toml"
      // in the normalizer while the child resolves it to the absolute path,
      // leaving the real config untouched. Mirrors the diagnostics-export.ts
      // `envFor('codex')` pattern. See issue #4276.
      const codexConfigEnv = spawnEnvForAgent(
        'codex',
        process.env,
        configuredAgentEnv,
        undefined,
        { resolvedBin: agentLaunch.selectedPath },
      );
      await normalizeCodexConfigFile(codexConfigEnv);

      // When OpenDesign leaves model selection at `default`, Codex resolves
      // the concrete model from config.toml. A known-old CLI can accept the
      // config, start `exec`, and only then reject a newer configured model.
      // Gate only evidence-backed stable-version/model combinations before
      // buildArgs/spawn. Every uncertain boundary (custom provider, API-key
      // auth, config overlays, project config, unknown/prerelease version)
      // fails open so Codex keeps its existing forward compatibility.
      if (agentLaunch.launchPath) {
        if (run.cancelRequested || design.runs.isTerminal(run.status)) {
          lifecycle.mark('launch_preflight_end');
          cleanupPromptFile();
          cleanupOdNextRunInputProjection();
          return;
        }
        const preflight = await preflightCodexDefaultModel({
          launchPath: agentLaunch.launchPath,
          env: applyAgentLaunchEnv(codexConfigEnv, agentLaunch),
          requestedModel: safeModel,
          projectRoot: effectiveCwd,
        });
        if (run.cancelRequested || design.runs.isTerminal(run.status)) {
          lifecycle.mark('launch_preflight_end');
          cleanupPromptFile();
          cleanupOdNextRunInputProjection();
          return;
        }
        if (preflight.status === 'compatible' || preflight.status === 'incompatible') {
          run.resolvedModelId = preflight.model;
          run.preflightAgentCliVersion = preflight.cliVersion;
        }
        if (preflight.status === 'incompatible') {
          lifecycle.mark('launch_preflight_end');
          const message =
            `The '${preflight.model}' model requires a newer version of Codex. ` +
            `The installed Codex CLI (${preflight.cliVersion}) is older than the known-compatible ` +
            `minimum (${preflight.requiredCliVersion}). ` +
            'Upgrade the Codex CLI or choose a model supported by this installation, then retry.';
          design.runs.emit(run, 'diagnostic', {
            type: 'model_capability_preflight',
            status: 'incompatible',
            model: preflight.model,
            cli_version: preflight.cliVersion,
            required_cli_version: preflight.requiredCliVersion,
          });
          send('error', createSseErrorPayload(
            'AGENT_EXECUTION_FAILED',
            message,
            {
              retryable: false,
              details: {
                failureCategory: 'model_unavailable',
                failureDetail: 'cli_version_incompatible',
                model: preflight.model,
                requiredCliVersion: preflight.requiredCliVersion,
              },
            },
          ));
          cleanupPromptFile();
          // No child was spawned, so there is no process exit code to report.
          // Passing null preserves the preflight attribution instead of
          // polluting exit_nonzero transport metrics with a synthetic exit 1.
          finishWithRetryDecision('failed', null, null);
          return;
        }
      }
    }

    // Serialize antigravity spawns whose buildArgs writes a concrete
    // model into settings.json. Two concurrent runs with different
    // models would otherwise race the file: A writes model A, B writes
    // model B, then A's agy reads model B. The lock is acquired BEFORE
    // buildArgs (which performs the write) and released asynchronously
    // AFTER agy's --log-file confirms the model was propagated. See
    // `antigravity.ts` for the chain implementation.
    let antigravityModelLockRelease: (() => void) | null = null;
    const antigravityConcreteModel =
      def.id === 'antigravity'
      && typeof agentOptions.model === 'string'
      && agentOptions.model.length > 0
      && agentOptions.model !== 'default'
        ? agentOptions.model
        : null;
    if (antigravityConcreteModel) {
      const { acquireAntigravityModelLock } = await import(
        './runtimes/defs/antigravity.js'
      );
      antigravityModelLockRelease = await acquireAntigravityModelLock();
    }

    let args;
    const observeClaudeNativeChildBehavior =
      def.id === 'claude' && strategyTaskAtStart !== null;
    const nativeBuildPackageBindings =
      def.id === 'claude'
      && strategyTaskAtStart?.executionMode === 'complex'
      && strategyTaskAtStart.inputStage === 'production'
      && strategyTaskAtStart.planContract
      && strategyTaskAtStart.planContractHash
      && strategyRunMapping
        ? (() => {
            const version = run.preflightAgentCliVersion
              ?? getDetectedRuntimeVersions(def.id)?.agentCliVersion;
            const capability = resolveBundledOdNextRuntimeCapability({
              agentId: def.id,
              agentCliVersion: version,
            });
            if (capability.reason !== 'capability_resolved') {
              throw new TypeError(
                'Claude native Build Package bindings require the exact verified CLI tuple.',
              );
            }
            return createOdNextNativeBuildPackageBindings({
              taskExecutionId: strategyTaskAtStart.taskExecutionId,
              taskRunIndex: strategyRunMapping.taskRunIndex,
              planContractHash: strategyTaskAtStart.planContractHash,
              plan: strategyTaskAtStart.planContract,
            });
          })()
        : [];
    try {
      // Optional argv flags are gated on the `--help` capability map, which used
      // to be filled only by `GET /api/agents`. Probe it here so a daemon that
      // has never served that route still builds the same argv as one that has.
      await ensureDetectedRuntimeCapabilities(def.id, configuredAgentEnv);
      args = def.buildArgs(
        composed,
        promptImagePaths,
        extraAllowedDirs,
        agentOptions,
        {
          cwd: effectiveCwd,
          hasPriorAssistantTurn,
          agentLogFilePath,
          promptFilePath: promptFile?.path,
          resumeSessionId: agentResumePromptPolicy.resumeSessionId,
          newSessionId: agentResumeCtx.newSessionId,
          disablePlugins:
            def.id === 'codex'
            && run.externalPluginAnalytics?.externalPluginId
              === OPEN_DESIGN_PLUGIN_ID,
          ...(nativeBuildPackageBindings.length > 0
            ? { nativeBuildPackageBindings }
            : {}),
          ...(observeClaudeNativeChildBehavior
            ? { observeNativeChildBehavior: true }
            : {}),
        },
      );
    } catch (err) {
      cleanupPromptFile();
      throw err;
    }
    // Second-pass budget check that knows about the Windows `.cmd` shim
    // wrap. The pre-buildArgs `checkPromptArgvBudget` only looks at the
    // raw composed prompt; on Windows an npm-installed adapter resolves
    // to e.g. `deepseek.cmd`, the spawn path goes through `cmd.exe /d /s
    // /c "<inner>"`, and `quoteForWindowsCmdShim` doubles every embedded
    // `"` plus wraps any whitespace/special-char arg in outer quotes —
    // so a quote-heavy prompt that fit under `maxPromptArgBytes` can
    // still expand past CreateProcess's 32_767-char cap. Fail fast with
    // the same `AGENT_PROMPT_TOO_LARGE` shape so the SSE error path
    // doesn't have to special-case it.
    const cmdShimBudgetError = checkWindowsCmdShimCommandLineBudget(
      def,
      agentLaunch.launchPath ?? resolvedBin,
      args,
    );
    if (cmdShimBudgetError) {
      cleanupPromptFile();
      design.runs.emit(
        run,
        'error',
        createSseErrorPayload(
          cmdShimBudgetError.code,
          cmdShimBudgetError.message,
          { retryable: false },
        ),
      );
      return finishStrategyAwarePhysicalRun('failed', 1, null);
    }

    // Companion guard for non-shim Windows installs (e.g. a cargo-built
    // `deepseek.exe` rather than the npm `.cmd` shim). Direct `.exe`
    // spawns skip the cmd.exe wrap above, but Node/libuv still composes
    // a CreateProcess `lpCommandLine` by walking each argv element
    // through `quote_cmd_arg`, which escapes every embedded `"` as `\"`
    // and doubles backslashes adjacent to quotes. A quote-heavy prompt
    // under `maxPromptArgBytes` can expand past the 32_767-char kernel
    // cap there too, so the cmd-shim early-return alone would let those
    // users hit a generic `spawn ENAMETOOLONG`.
    const directExeBudgetError = checkWindowsDirectExeCommandLineBudget(
      def,
      agentLaunch.launchPath ?? resolvedBin,
      args,
    );
    if (directExeBudgetError) {
      cleanupPromptFile();
      design.runs.emit(
        run,
        'error',
        createSseErrorPayload(
          directExeBudgetError.code,
          directExeBudgetError.message,
          { retryable: false },
        ),
      );
      return finishStrategyAwarePhysicalRun('failed', 1, null);
    }

    let persistDeliveredAgentSessionState = () => {};
    if (runtimeResumesSessionById(def) && run.conversationId) {
      let persisted = false;
      persistDeliveredAgentSessionState = () => {
        if (persisted) return;
        persisted = true;
        if (!getConversation(db, run.conversationId)) {
          console.warn(
            '[sessions] skipped delivered session persistence because the conversation is not persisted',
          );
          return;
        }
        // The id to persist for a create turn: capture-style adapters store the
        // session id the CLI minted and reported on the stream; specify-style
        // adapters store the daemon-minted id they passed to the CLI. A
        // capture-style run that never reported an id (CLI died before
        // `thread.started`) leaves nothing to resume — correct, the next turn
        // starts fresh and re-seeds the transcript.
        const createTurnSessionId = agentCapturesSessionId
          ? capturedSessionId
          : agentResumeCtx.newSessionId;
        if (!agentResumeCtx.isResuming && createTurnSessionId) {
          upsertAgentSession(db, {
            conversationId: run.conversationId,
            agentId: def.id,
            sessionId: createTurnSessionId,
            stablePromptHash: currentStableHash,
            stablePromptSections: currentStableSectionsJson,
            model: safeModel ?? null,
            cwd: effectiveCwd,
            lastMessageId: run.assistantMessageId ?? null,
          });
          if (!agentCapturesSessionId) {
            run.nativeSessionRecovery = markNativeSessionCaptured({
              previous: run.nativeSessionRecovery,
              agentId: def.id,
              sessionId: createTurnSessionId,
              resumed: false,
            });
            publishNativeSessionRecoveryMetadata();
          }
          return;
        }
        if (agentResumeCtx.isResuming && agentResumeCtx.resumeSessionId) {
          // Advance the resume identity guard after a successful resume turn:
          // the conversation grew by this turn, so the cursor must move to the
          // new max position (otherwise the next turn sees `cursor + 4` and
          // falsely reseeds). model/cwd are unchanged (they matched on resume);
          // refresh the stable hash to what the session now holds.
          upsertAgentSession(db, {
            conversationId: run.conversationId,
            agentId: def.id,
            sessionId: agentResumeCtx.resumeSessionId,
            stablePromptHash: currentStableHash,
            stablePromptSections: currentStableSectionsJson,
            model: safeModel ?? null,
            cwd: effectiveCwd,
            lastMessageId: run.assistantMessageId ?? null,
          });
          if (!agentCapturesSessionId) {
            run.nativeSessionRecovery = markNativeSessionCaptured({
              previous: run.nativeSessionRecovery,
              agentId: def.id,
              sessionId: agentResumeCtx.resumeSessionId,
              resumed: true,
            });
            publishNativeSessionRecoveryMetadata();
          }
        }
      };
    }

    // `runStartTimeMs` is consumed by the run-end artifact-manifest
    // reconciler (#2893 / #3110) to skip artifacts whose mtime predates
    // this run. The original main-side hunk also re-declared `const send`
    // here; on this branch `send` was hoisted into the AMR preflight
    // earlier, so we keep only the new `runStartTimeMs` declaration.
    const runStartTimeMs = Date.now();
    const firstOutputTimeoutMs =
      resolveChatRunFirstOutputTimeoutMs(def.firstOutputTimeoutMs);
    const artifactQuietPeriodMs = resolveChatRunArtifactQuietPeriodMs();
    // Grace before the inactivity watchdog escalates a stalled child from
    // SIGTERM to SIGKILL. Env-tunable like its OD_CHAT_RUN_* cancel-grace
    // siblings so the escalation path can be exercised deterministically.
    const inactivityKillGraceMs = (() => {
      const raw = Number(process.env.OD_CHAT_RUN_INACTIVITY_KILL_GRACE_MS);
      return Number.isFinite(raw) && raw > 0 ? raw : 3_000;
    })();
    let inactivityTimer = null;
    let firstOutputTimer = null;
    let firstOutputSeen = false;
    let childStdoutSeen = false;
    let lastAgentEventPhase = 'spawn pending';
    let lastToolResultChars = 0;
    // Becomes true once any live-artifact create has been registered for
    // this run. Subsequent watchdog scheduling uses the shorter quiet
    // period, and a watchdog trip after this point is treated as
    // "agent finished the deliverable and went idle" rather than
    // "agent stalled with nothing to show" (issue #1451).
    let artifactRegistered = false;
    // Only daemon-initiated quiet-period termination should be treated
    // as `succeeded` in the close handler. A later unrelated SIGTERM /
    // SIGKILL (external `kill`, OOM, container shutdown) must keep its
    // existing `failed` classification even when `artifactRegistered`
    // is true — those signals don't mean the agent finished cleanly,
    // they just terminated the process. Set strictly inside
    // `failForInactivity`'s quiet-period branch.
    let artifactQuietShutdownRequested = false;
    // Set when the no-output inactivity watchdog routed this attempt through
    // the same-run retry finalizer AND that finalizer restarted the run on a
    // fresh child. The stalled child is then SIGTERM'd, so its later `close`
    // must NOT finalize the run a second time or unregister the new attempt's
    // event sink / run handle (both keyed by the shared runId). The close
    // handler bails early when this is true, revoking only this attempt's own
    // tool token.
    let watchdogRetryRestarted = false;
    const summarizeAgentEventForInactivity = (payload) => {
      const type = payload?.type ? String(payload.type) : 'unknown';
      if (type === 'tool_result') {
        const content = typeof payload.content === 'string' ? payload.content : '';
        lastToolResultChars = Math.max(lastToolResultChars, content.length);
        return `tool_result:${content.length} chars`;
      }
      if (type === 'tool_use') {
        const name = payload?.name ? String(payload.name) : 'unknown';
        return `tool_use:${name}`;
      }
      if (type === 'text_delta' || type === 'thinking_delta') {
        const text = typeof payload.delta === 'string'
          ? payload.delta
          : typeof payload.text === 'string'
            ? payload.text
            : '';
        return `${type}:${text.length} chars`;
      }
      if (type === 'status') {
        const label = payload?.label ? String(payload.label) : 'unknown';
        return `status:${label}`;
      }
      return type;
    };
    const clearInactivityWatchdog = () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
      }
    };
    const clearFirstOutputWatchdog = () => {
      if (firstOutputTimer) {
        clearTimeout(firstOutputTimer);
        firstOutputTimer = null;
      }
    };
    let forcedChildShutdownTimers = [];
    const clearForcedChildShutdown = () => {
      for (const timer of forcedChildShutdownTimers) clearTimeout(timer);
      forcedChildShutdownTimers = [];
    };
    const scheduleForcedChildShutdown = () => {
      if (!child) return;
      clearForcedChildShutdown();
      // Capture THIS attempt's child and its process group. A same-run retry
      // can swap `run.child` to a fresh child within the grace window; these
      // timers must escalate the stalled child they were scheduled for, never
      // whatever now occupies `run.child` — otherwise the healthy retry gets
      // killed and this stalled child is left unreaped. See runs.ts
      // `signalChildProcess`.
      const targetChild = child;
      const targetProcessGroupId = run.processGroupId;
      forcedChildShutdownTimers = [
        setTimeout(() => {
          design.runs.signalChildProcess(targetChild, targetProcessGroupId, 'SIGTERM');
        }, inactivityKillGraceMs),
        setTimeout(() => {
          design.runs.signalChildProcess(targetChild, targetProcessGroupId, 'SIGKILL');
        }, inactivityKillGraceMs * 2),
      ];
    };
    const failForInactivity = (reason: 'inactivity' | 'first_output' = 'inactivity') => {
      if (run.cancelRequested || design.runs.isTerminal(run.status)) return;
      clearInactivityWatchdog();
      clearFirstOutputWatchdog();
      if (artifactRegistered) {
        // The deliverable already exists. The agent process is either
        // genuinely idle (claude-code's stream-json child sitting on an
        // open stdin) or wedged in post-write reasoning that never
        // emits stdout. Either way, finishing the run via the normal
        // child-exit path (status decision in child.on('close') below)
        // is safer than tearing it down with a failure banner — the
        // tool token, cancel state, and exit-code classification stay
        // owned by the existing lifecycle. SIGTERM the child and let
        // the close handler classify the run as succeeded (via the
        // artifactQuietShutdown branch). Mark this termination as
        // daemon-initiated so an unrelated later signal (external
        // kill, OOM) is NOT silently reclassified to `succeeded` —
        // only signals from this watchdog branch should be.
        artifactQuietShutdownRequested = true;
        if (acpSession?.abort) {
          acpSession.abort();
        }
        if (child && !child.killed) design.runs.signalChild(run, 'SIGTERM');
        scheduleForcedChildShutdown();
        return;
      }
      // OpenCode retries a 429 usage-limit silently and emits nothing on
      // stdout/stderr, so the watchdog is the first signal we get. The real
      // reason is recorded only in OpenCode's own session log — recover it
      // and surface it HERE, before finish() tears down the live SSE
      // clients, so a viewer sees "usage limit reached" instead of the
      // generic stall message. Bound to this run via `since` so a stale or
      // concurrent session's error can't be misattributed. See issue #982.
      let stallPayload = null;
      if (agentId === 'opencode') {
        const logFailure = readOpenCodeServiceFailure(spawnedAgentEnv, {
          since: run.createdAt,
        });
        if (logFailure) {
          stallPayload = createSseErrorPayload(
            logFailure.code,
            logFailure.message,
            { retryable: logFailure.retryable },
          );
        }
      }
      if (!stallPayload) {
        const timeoutMs =
          reason === 'first_output' ? firstOutputTimeoutMs : inactivityTimeoutMs;
        const timeoutDescription =
          reason === 'first_output'
            ? 'without emitting a first output'
            : 'without emitting any new output';
        const message =
          `Agent stalled ${timeoutDescription} for ${Math.round(timeoutMs / 1000)}s. ` +
          'The model or CLI likely hung while generating. ' +
          `Phase details: spawned agent ${userFacingAgentLabel(agentId, resolvedBin)}; stdout arrived: ${childStdoutSeen ? 'yes' : 'no'}; ` +
          `last agent event: ${lastAgentEventPhase}; largest tool result observed: ${lastToolResultChars} chars. ` +
          'Retry the turn, pick a different model, or start a new conversation if the prior context is very large.';
        stallPayload = createSseErrorPayload('AGENT_EXECUTION_FAILED', message, { retryable: true });
      }
      run.terminalTrigger = reason === 'first_output'
        ? 'first_output_deadline'
        : 'inactivity_watchdog';
      send('error', stallPayload);
      // A silent first-token hang is one of the safe transient failure shapes
      // this run is allowed to recover: classifyRunFailure maps the stall text
      // to a retryable `timeout` at `first_token_wait`, and decideSafeRunRetry
      // permits the same-run retry when no output/tools/artifacts were seen.
      // Route through the shared finalizer (after surfacing stallPayload) so
      // the watchdog path gets the same run_retry_attempted/run_retry_finished
      // telemetry as child close/error — not a bare terminal failure.
      const retried = finishWithRetryDecision('failed', 1, null);
      if (retried) {
        watchdogRetryRestarted = true;
      }
      if (acpSession?.abort) {
        acpSession.abort();
      }
      if (child && !child.killed) design.runs.signalChild(run, 'SIGTERM');
      scheduleForcedChildShutdown();
    };
    const armFirstOutputWatchdog = () => {
      if (firstOutputSeen || firstOutputTimer || firstOutputTimeoutMs <= 0) return;
      firstOutputTimer = setTimeout(
        () => failForInactivity('first_output'),
        firstOutputTimeoutMs,
      );
      firstOutputTimer.unref?.();
    };
    const noteFirstOutputEvent = (payload) => {
      const type = payload?.type ? String(payload.type) : '';
      const statusLabel =
        type === 'status' && payload?.label ? String(payload.label) : '';
      const isAcpToolActivity =
        statusLabel === 'tool_call' || statusLabel === 'tool_call_update';
      if (
        type !== 'text_delta' &&
        type !== 'thinking_delta' &&
        type !== 'tool_use' &&
        type !== 'tool_result' &&
        type !== 'artifact' &&
        !isAcpToolActivity
      ) {
        return;
      }
      firstOutputSeen = true;
      clearFirstOutputWatchdog();
    };
    const activeInactivityTimeoutMs = () =>
      resolveActiveInactivityTimeoutMs({
        inactivityTimeoutMs,
        artifactQuietPeriodMs,
        artifactRegistered,
      });
    /**
     * The progress clock (`run.lastAgentActivityAt` → `last_progress_age_ms`)
     * stops at the moment the daemon gives up on this attempt.
     *
     * After a terminal verdict the agent is no longer making progress toward
     * the user's task; whatever it emits next is a reaction to our teardown —
     * a shutdown line on stderr, a late diagnostic promoted from that stderr,
     * the bridge's own flushed bookkeeping. Letting any of it re-stamp the
     * clock is what makes a run that sat silent for the whole timeout window
     * report an age of a few hundred milliseconds, which is exactly the reading
     * that sent the 2026-07-28 AMR incident's triage after the wrong window.
     *
     * Scoped to the attempt, not the run: a retry (or the resume-failed reseed)
     * builds a fresh `startChatRun` closure, so the next attempt starts with an
     * unfrozen clock and measures its own silence.
     */
    let progressClockFrozen = false;
    const freezeProgressClock = () => {
      progressClockFrozen = true;
    };
    /**
     * The ACP bridge has reached a terminal verdict for this attempt: it has
     * already emitted the error and SIGTERMed the child. Hand the attempt over
     * to the close handler under THAT verdict.
     *
     * Retiring the outer chat inactivity watchdog is the point. `fail()` issues
     * one direct SIGTERM and nothing escalates it, while the outer watchdog is
     * still armed from the agent's last real output — so a child that lingers
     * past that ceiling lets `failForInactivity` fire on a run it does not yet
     * consider terminal, overwrite `terminal_trigger` with `inactivity_watchdog`,
     * and emit a second failure. The stall then reads as the wrong clock, which
     * is the confusion `acp_stage_timeout` exists to remove.
     *
     * Escalating the teardown is the other half: without it, retiring the
     * watchdog would leave a SIGTERM-ignoring child with nothing to reap it.
     * `scheduleForcedChildShutdown` captures this attempt's child, so a retry
     * that swaps `run.child` inside the grace window is not affected.
     */
    const retireAttemptOnAcpVerdict = () => {
      freezeProgressClock();
      clearInactivityWatchdog();
      scheduleForcedChildShutdown();
    };
    const noteAgentActivity = () => {
      // Once this attempt has a terminal verdict, nothing the child says may
      // restart any of its clocks — not the progress timestamp, and not the
      // inactivity watchdog. Bailing here rather than only skipping the
      // timestamp is load-bearing: the raw `child.stderr` handler routes every
      // late byte through this helper, so a child that logs while ignoring
      // SIGTERM would otherwise re-arm the very watchdog
      // `retireAttemptOnAcpVerdict` just cleared, and that timer firing before
      // forced shutdown reaps the child terminalizes the run a second time
      // under `inactivity_watchdog`. The token TTL is moot for the same reason:
      // this attempt is over, and a retry builds a fresh closure.
      if (progressClockFrozen) return;
      // E-lite: stamp the last-activity clock BEFORE the disabled-watchdog bail
      // so `last_progress_age_ms` is recorded even when the watchdog is off.
      run.lastAgentActivityAt = Date.now();
      if (toolTokenGrant) {
        toolTokenRegistry.refreshToken(toolTokenGrant.token, { ttlMs: toolTokenTtlMs });
      }
      const delay = activeInactivityTimeoutMs();
      if (delay <= 0) return;
      clearInactivityWatchdog();
      inactivityTimer = setTimeout(failForInactivity, delay);
      inactivityTimer.unref?.();
    };
    const noteArtifactRegistered = () => {
      if (artifactRegistered) return;
      artifactRegistered = true;
      firstOutputSeen = true;
      clearFirstOutputWatchdog();
      // Switch the watchdog to the shorter quiet-period window
      // immediately so we don't have to wait for the next agent event
      // before the new ceiling takes effect. Call unconditionally:
      // an earlier `if (inactivityTimer)` gate left the run in limbo
      // when `OD_CHAT_RUN_INACTIVITY_TIMEOUT_MS=0` but
      // `OD_CHAT_RUN_ARTIFACT_QUIET_PERIOD_MS>0` — noteAgentActivity()
      // had returned early at run start (pre-artifact delay = 0,
      // no timer set), so the guard then skipped the re-arm and the
      // newly-positive quiet-period delay never armed a timer at all.
      // `noteAgentActivity` itself is the one that decides whether to
      // schedule (it bails when the active delay is 0), so leaving the
      // decision there keeps the behavior coherent across all four
      // combinations of pre / quiet timeouts.
      noteAgentActivity();
    };
    const unregisterChatAgentEventSink = () => {
      const sinkRunId = toolTokenGrant?.runId ?? runId;
      activeChatAgentEventSinks.delete(sinkRunId);
      activeChatRunHandles.delete(sinkRunId);
    };
    if (toolTokenGrant?.runId) {
      activeChatAgentEventSinks.set(toolTokenGrant.runId, (payload) => {
        lastAgentEventPhase = summarizeAgentEventForInactivity(payload);
        noteAgentActivity();
        noteFirstOutputEvent(payload);
        send('agent', payload);
      });
      activeChatRunHandles.set(toolTokenGrant.runId, { noteArtifactRegistered });
    }
    // If detection can't find the binary, surface a friendly SSE error
    // pointing at /api/agents instead of silently falling back to
    // spawn(def.bin) — that fallback re-introduces the exact ENOENT symptom
    // from issue #10.
    if (!resolvedBin || !agentLaunch.launchPath) {
      cleanupPromptFile();
      revokeToolToken('child_exit');
      unregisterChatAgentEventSink();
      send('error', createSseErrorPayload(
        'AGENT_UNAVAILABLE',
        `Agent "${def.name}" (\`${def.bin}\`) is not installed or not on PATH. ` +
          'Install it and refresh the agent list (GET /api/agents) before retrying.',
        { retryable: true },
      ));
      return finishStrategyAwarePhysicalRun('failed', 1, null);
    }
    const browserUseRuntimeEnv = run.browserUse
      ? {
          OD_BROWSER_USE_REQUESTED: run.browserUse.requested ? '1' : '0',
          OD_BROWSER_USE_AVAILABLE: run.browserUse.available ? '1' : '0',
          ...(run.browserUse.reason ? { OD_BROWSER_USE_UNAVAILABLE_REASON: run.browserUse.reason } : {}),
          OD_BROWSER_USE_REGISTRY_PATH: run.browserUse.diagnostics?.registryPath ?? '',
        }
      : {};
    const configuredAgentSpawnEnv = createDaemonDataDirConfiguredAgentEnv(configuredAgentEnv);
    const agentSpawnEnv = spawnEnvForAgent(
      def.id,
      {
        ...createAgentRuntimeEnv(process.env, daemonUrl, toolTokenGrant),
        ...(def.env || {}),
        ...browserUseRuntimeEnv,
      },
      configuredAgentSpawnEnv,
      undefined,
      { resolvedBin: agentLaunch.selectedPath },
    );
    if (def.id === 'amr') {
      const loginStatus = readVelaLoginStatus(agentSpawnEnv, configuredAgentSpawnEnv);
      if (!loginStatus.loggedIn) {
        cleanupPromptFile();
        revokeToolToken('child_exit');
        unregisterChatAgentEventSink();
        sendAmrAccountFailure({
          code: 'AMR_AUTH_REQUIRED',
          message: 'AMR sign-in is required. Sign in to AMR Cloud again, then retry this run.',
          action: 'relogin',
        });
        return finishStrategyAwarePhysicalRun('failed', 1, null);
      }
    }
    const odMediaEnv = createOpenDesignToolEnv({
      daemonUrl,
      projectDir: cwd,
      projectId: typeof projectId === 'string' ? projectId : null,
    });
    if (run.cancelRequested || design.runs.isTerminal(run.status)) {
      cleanupPromptFile();
      revokeToolToken('child_exit');
      unregisterChatAgentEventSink();
      cleanupOdNextRunInputProjection();
      return;
    }

    run.status = 'running';
    run.updatedAt = Date.now();
    send('start', {
      runId,
      agentId,
      bin: userFacingAgentLabel(agentId, resolvedBin),
      streamFormat: def.streamFormat ?? 'plain',
      projectId: typeof projectId === 'string' ? projectId : null,
      cwd,
      model: safeModel,
      reasoning: safeReasoning,
      serviceTier: safeServiceTier,
      toolTokenExpiresAt: toolTokenGrant?.expiresAt ?? null,
    });
    noteAgentActivity();

    let child;
    let acpSession = null;
    let writePromptToChildStdin = false;
    let spawnedAgentEnv = null;
    // The stream handler is block-scoped to its parser branch, but the OpenCode
    // post-run child export runs in the shared close handler below — after the
    // stream that produced the candidates is gone.
    let jsonEventStreamHandler: ReturnType<typeof createJsonEventStreamHandler> | null = null;
    let agentStdoutTail = '';
    let agentStderrTail = '';
    const agentStderrFilter = createAgentStderrVisibilityFilter(agentId);
    const emitVisibleAgentStderr = (chunk: unknown) => {
      const visibleChunk = agentStderrFilter.write(chunk);
      if (!visibleChunk) return;
      agentStderrTail = `${agentStderrTail}${visibleChunk}`.slice(-2000);
      send('stderr', { chunk: visibleChunk });
    };
    const flushVisibleAgentStderr = () => {
      const visibleChunk = agentStderrFilter.flush();
      if (!visibleChunk) return;
      agentStderrTail = `${agentStderrTail}${visibleChunk}`.slice(-2000);
      send('stderr', { chunk: visibleChunk });
    };
    try {
      // Prompt delivery via stdin is now the universal default. This bypasses
      // both the cmd.exe 8KB limit and the CreateProcess 32KB limit.
      const stdinMode =
        def.promptViaStdin ||
        def.streamFormat === 'acp-json-rpc' ||
        def.streamFormat === 'dsh-profile-jsonl'
          ? 'pipe'
          : 'ignore';
      const env = applyAgentLaunchEnv({
        ...agentSpawnEnv,
        ...(mmdRouteLaunchEnv || {}),
        ...odMediaEnv,
        ...(byokOpenCodeProvider ? byokOpenCodeProvider.env : {}),
        ...await openDesignAmrTraceEnvForRun({
          agentId: def.id,
          runId: run.id,
          conversationId: run.conversationId,
          runAttempt: openDesignAmrRunAttempt({
            retryAttemptCount: run.retryAttemptCount,
            manualResumeAttemptCount: run.manualResumeAttemptCount,
          }),
          // Vela's workspace-credit isolation reads this env together with the
          // signed-in account identity. The run pins the project's exact
          // Workspace before its first asynchronous setup step; Vela/AMR
          // remains the authority for membership, balance, and billing
          // eligibility. Team and Personal bindings are both sent explicitly.
          // An unbound project is refused before process spawn. Later project
          // rebinds and ambient/current selection never participate.
          projectId,
          workspaceScope: run.workspaceScope,
          externalPluginAnalytics: run.externalPluginAnalytics ?? null,
        }, {
          // Report persisted-binding vs truly-unbound selection to the daemon
          // log and telemetry. Ids and the branch name only —
          // never member rows or credentials.
          onWorkspaceScopeOutcome: (outcome) => {
            console.log(
              `[od] amr workspace scope ${outcome.kind}`
                + ` project=${outcome.projectId}`
                + ` workspace=${outcome.workspaceId ?? 'none'}`
                + ` run=${run.id}`,
            );
            const context = run.analyticsContext ?? null;
            if (!context || !design?.analytics?.capture) return;
            design.analytics.capture({
              eventName: 'amr_workspace_scope_resolved',
              context,
              // `design.getAppVersion` is the only app-version accessor this
              // scope can see; the identically-named helper inside
              // `createFinalizedMessageTelemetryReporter` is a different
              // function's local and resolving it here threw a ReferenceError
              // out of the spawn path, failing 100% of AMR runs. That helper's
              // own last resort is this same accessor, so the value is
              // unchanged.
              appVersion: design.getAppVersion?.() ?? 'unknown',
              properties: {
                page_name: 'chat_panel',
                area: 'chat_panel',
                project_id: outcome.projectId,
                conversation_id: run.conversationId ?? null,
                run_id: run.id,
                workspace_scope_outcome: outcome.kind,
                workspace_id: outcome.workspaceId,
              },
            });
          },
        }),
        // OpenCode external-MCP injection (issue #2142). Layered AFTER
        // spawnEnvForAgent / odMediaEnv / configuredAgentEnv so the
        // daemon-built MCP config wins over a stale value the user
        // might have exported in their shell — that would let an
        // outdated content string suppress the user's freshly-saved
        // MCP servers, which is exactly the bug we are fixing.
        // `opencodeConfigContent === null` means "no enabled servers";
        // we deliberately leave the env unset in that case so the
        // user's saved `~/.config/opencode/opencode.json` continues
        // to apply as-is.
        ...(opencodeConfigContent
          ? { [isMiMoContent ? 'MIMOCODE_CONFIG_CONTENT' : 'OPENCODE_CONFIG_CONTENT']: opencodeConfigContent }
          : {}),
        // Daemon-owned resolver for task-input: references. Keep this last so
        // configured/BYOK/runtime env cannot redirect the Agent from the
        // verified Run projection back to mutable or canonical bytes.
        ...(odNextTaskInputSnapshot
          ? { OD_TASK_INPUT_DIR: odNextTaskInputSnapshot.projectionDir }
          : {}),
      }, agentLaunch);
      spawnedAgentEnv = env;
      const invocation = createCommandInvocation({
        command: agentLaunch.launchPath,
        args,
        env,
      });
      lifecycle.mark('launch_preflight_end');
      lifecycle.mark('process_spawn_start');
      child = spawn(invocation.command, invocation.args, {
        env,
        stdio: [stdinMode, 'pipe', 'pipe'],
        cwd: effectiveCwd,
        shell: false,
        detached: process.platform !== 'win32',
        // Required when invocation wraps a Windows .cmd/.bat shim through
        // cmd.exe; without this, Node re-escapes the inner command line and
        // breaks paths containing spaces (issue #315).
        windowsVerbatimArguments: invocation.windowsVerbatimArguments,
      });
      lifecycle.mark('process_spawned');
      run.child = child;
      run.childPid = typeof child.pid === 'number' ? child.pid : null;
      run.processGroupId =
        process.platform !== 'win32' && typeof child.pid === 'number'
          ? child.pid
          : null;
      // Schedule release of the antigravity model lock once agy's
      // --log-file confirms the chosen model was propagated to the
      // backend (the upstream signal that settings.json was read).
      // The watcher's `false` return (timeout) deliberately does NOT
      // release — looper review at 263fd2fe7 flagged that releasing
      // on timeout reopens the slow-cold-start race: a >15s agy
      // startup that hadn't yet read settings.json would let run B
      // rewrite the file and run A would then read run B's model.
      // The exit handler is the canonical fallback that releases the
      // lock no matter what (crashed agy, fast exit, etc.) so the
      // queue can never starve permanently.
      if (
        antigravityModelLockRelease
        && antigravityConcreteModel
        && agentLogFilePath
      ) {
        const releaseOnce = (() => {
          let fired = false;
          return () => {
            if (fired) return;
            fired = true;
            antigravityModelLockRelease?.();
          };
        })();
        const watcherAbort = new AbortController();
        const { waitForAgyToReadModel } = await import(
          './runtimes/defs/antigravity.js'
        );
        void waitForAgyToReadModel(
          agentLogFilePath,
          antigravityConcreteModel,
          { abortSignal: watcherAbort.signal },
        )
          .then((found) => {
            // Only release on TRUE confirmation; a `false` return means
            // the watcher ran out of its polling window without seeing
            // the propagation line. We hold the lock until child exit
            // so a slow-cold-start agy can't be pre-empted by a
            // concurrent settings.json rewrite from run B.
            if (found) releaseOnce();
          })
          .catch(() => undefined);
        child.once('exit', () => {
          // Stop the watcher so its pending readFile / setTimeout
          // chain does not outlive the run and leak into subsequent
          // antigravity spawns (or test cases).
          watcherAbort.abort();
          releaseOnce();
        });
      }
      if (
        def.promptViaStdin &&
        child.stdin &&
        def.streamFormat !== 'pi-rpc' &&
        def.streamFormat !== 'dsh-profile-jsonl'
      ) {
        // EPIPE from a fast-exiting CLI (bad auth, missing model, exit on
        // launch) would otherwise surface as an unhandled stream error and
        // crash the daemon. Swallow it — the regular exit/close handlers
        // below already route the underlying failure to SSE via stderr.
        child.stdin.on('error', (err) => {
          // EPIPE = Unix broken-pipe when child closes its stdin read end
          // early. 'write EOF' (err.code 'EOF') = Windows equivalent of
          // the same condition via UV_EOF. Both mean the child exited before
          // reading stdin — the process exit/close handlers already route
          // the underlying failure to SSE via stderr, so swallow these here.
          if (err.code !== 'EPIPE' && err.code !== 'EOF' && err.message !== 'write EOF') {
            send(
              'error',
              createSseErrorPayload(
                'AGENT_EXECUTION_FAILED',
                `stdin: ${err.message}`,
              ),
            );
          }
        });
        writePromptToChildStdin = true;
      }
    } catch (err) {
      cleanupPromptFile();
      revokeToolToken('child_exit');
      unregisterChatAgentEventSink();
      send('error', createSseErrorPayload(
        err instanceof AmrWorkspaceScopeRequiredError
          ? err.code
          : 'AGENT_EXECUTION_FAILED',
        err instanceof AmrWorkspaceScopeRequiredError
          ? err.message
          : `spawn failed: ${err.message}`,
      ));
      finishStrategyAwarePhysicalRun('failed', 1, null);
      return;
    }

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    // Reset the inactivity watchdog on every raw stdout byte so that
    // structured adapters that buffer partial lines (Codex item.completed,
    // pi-rpc session/prompt, ACP agent messages) and models that spend a
    // long time in non-streamed reasoning still keep the run alive.
    child.stdout.on('data', (chunk) => {
      childStdoutSeen = true;
      noteAgentActivity();
      agentStdoutTail = `${agentStdoutTail}${chunk}`.slice(-2000);
    });

    // ---- Memory: assistant-reply capture for LLM extraction --------------
    // Hand the extractor the guarded, rendered reply (`memoryReplyText`, fed
    // through `send()` from either the `agent` text_delta or the `stdout`
    // channel), NOT the child's raw stdout. For stream-json agents (Claude Code)
    // raw stdout is JSONL transport — system:init, stream_event thinking deltas,
    // hook_started/hook_response frames — none of which is the reply; mining it
    // produced empty extractions that, near-identical across a build's re-fires,
    // caused the same turn to be re-analyzed dozens of times.
    child.on('close', () => {
      const userMsg = typeof message === 'string' ? message : '';
      // Forward the chat agent id so memory-llm.pickProvider can
      // constrain its auto-pick to the chat protocol's family — keeps
      // a Claude Code (anthropic) chat from triggering OpenAI/gpt-4o-
      // mini extraction in the background just because the user has
      // an OpenAI key parked in media-config.
      //
      // Normalize the run-scoped BYOK provider shape for the memory extractor.
      // The raw secret never enters the persisted run body; it is held only by
      // this run closure while the child is alive.
      const memoryChatProvider: {
        provider?: string;
        apiKey?: string;
        baseUrl?: string;
        apiVersion?: string;
        model?: string;
        requiresApiKey?: boolean;
      } | null = byokProvider
        ? {
            provider: (byokProvider as { protocol?: string }).protocol ?? undefined,
            apiKey: (byokProvider as { apiKey?: string }).apiKey,
            baseUrl: (byokProvider as { baseUrl?: string }).baseUrl,
            apiVersion: (byokProvider as { apiVersion?: string }).apiVersion,
            model: typeof safeModel === 'string' ? safeModel : undefined,
            requiresApiKey: (byokProvider as { requiresApiKey?: boolean }).requiresApiKey,
          }
        : null;
      const memoryOptions = {
        projectRoot: PROJECT_ROOT,
        chatAgentId: typeof agentId === 'string' ? agentId : null,
        chatModel: typeof safeModel === 'string' ? safeModel : null,
        // Forward the per-call BYOK provider snapshot so pickProvider()
        // can run "Same as chat" extraction against the user's actual
        // provider/endpoint/model instead of falling back to defaults.
        chatProvider: memoryChatProvider,
        // Scope the extractor's duplicate-turn de-dup to this conversation, so a
        // re-fired turn collapses but an identical (message, reply) in another
        // conversation is still examined.
        conversationId: run.conversationId ?? null,
      };
      void import('./memory-llm.js')
        .then(({ extractWithLLM, distillAnnotationsToMemory }) => {
          // Read the reply HERE, in the post-import microtask, not in the
          // synchronous close handler: the Claude stream flush is a later
          // 'close' listener, so deferring the read lets flush() emit the reply's
          // final buffered frame first and a reply that ends without a trailing
          // newline isn't truncated.
          const captured = memoryReplyText;
          const generalPass = extractWithLLM(
            RUNTIME_DATA_DIR,
            {
              userMessage: userMsg,
              assistantMessage: captured,
            },
            memoryOptions,
          );
          // Auto-distill any inline preview feedback (comments / highlights /
          // drawn marks) from this turn into durable feedback + rule memory.
          // This closes the "interaction → memory" loop automatically: the
          // agent no longer has to propose a rule and the user no longer has
          // to click Keep — a review turn that carried annotations mines
          // itself in the background and writes straight to the store.
          const annotationPass =
            safeCommentAttachments.length > 0
              ? distillAnnotationsToMemory(
                  RUNTIME_DATA_DIR,
                  {
                    annotations: safeCommentAttachments,
                    userMessage: userMsg,
                    assistantMessage: captured,
                  },
                  memoryOptions,
                )
              : Promise.resolve([]);
          return Promise.allSettled([generalPass, annotationPass]);
        })
        .catch((err) => console.warn('[memory-llm] background failed', err));
    });

    // Critique Theater branch (M0 dark launch, default disabled).
    // Only plain-stream adapters are routed through runOrchestrator in v1.
    // Adapters that emit structured wrappers (claude-stream-json,
    // qoder-stream-json, copilot-stream-json, json-event-stream,
    // acp-json-rpc, pi-rpc) fall
    // through to the legacy single-pass code path below with a one-time
    // stderr warning so the parser never sees wrapper bytes. Per-format
    // decoding into the orchestrator is a v2 concern.
    //
    // Use critiqueShouldRun (computed in the prompt builder) instead of
    // just the env var or the rollout resolver so the orchestrator gate
    // is in lockstep with the panel addendum. Media surfaces and runs
    // missing brand/skill context never get the panel prompt, so they
    // must also skip the orchestrator and fall through to legacy
    // generation; otherwise the parser waits for <CRITIQUE_RUN> tags
    // the model was never told to emit.
    if (critiqueShouldRun) {
      const adapterStreamFormat: string = def.streamFormat ?? 'plain';
      if (adapterStreamFormat !== 'plain') {
        if (!critiqueWarnedAdapters.has(adapterStreamFormat)) {
          critiqueWarnedAdapters.add(adapterStreamFormat);
          console.warn(`[critique] adapter format=${adapterStreamFormat} is not plain-stream; skipping orchestrator and falling through to legacy generation`);
        }
      } else {
        const critiqueRunId = run.id;
        // Per-run artifact directory keeps concurrent or sequential runs in the
        // same project from overwriting each other's transcript or final HTML.
        // Spec: artifacts/<projectId>/<runId>/transcript.ndjson(.gz).
        const critiqueProjectKey = typeof projectId === 'string' && projectId ? projectId : critiqueRunId;
        const critiqueArtifactDir = path.join(ARTIFACTS_DIR, critiqueProjectKey, critiqueRunId);
        const stdoutIterable = (async function* () {
          for await (const chunk of child.stdout) yield String(chunk);
        })();
        // Forward each CritiqueSseEvent on its own contract-defined channel
        // (critique.run_started, critique.ship, critique.failed, ...) rather
        // than wrapping the frame inside the legacy 'agent' channel. Clients
        // that subscribe to the new event names see them directly with the
        // contract payload as event.data.
        //
        // Critique events go to TWO sinks (codex P1 on PR #1338):
        //
        //   1. `design.runs.emit(...)` via `send(...)`, which fans out on
        //      `/api/runs/:runId/events`. Existing transport, unchanged.
        //   2. The per-project event-sinks map, which fans out on
        //      `/api/projects/:projectId/events`. This is the transport the
        //      web `CritiqueTheaterMount` actually subscribes to (the mount
        //      is project-scoped, not run-scoped, because it lives at the
        //      project workspace level and follows the user across runs).
        //      Without this second sink the mount sees no frames in
        //      production and only the e2e tests' stubbed routes deliver
        //      anything to the reducer.
        //
        // The project-events route emits via `sse.send(payload.type,
        // payload)`, so we pack the SSE channel name onto `payload.type`
        // and let the sink push the right channel name. The web's
        // `sseToPanelEvent` overwrites `type` from the channel name on the
        // way back into a PanelEvent, so this round-trip stays correct.
        const critiqueProjectIdForBus =
          typeof projectId === 'string' && projectId ? projectId : null;
        const critiqueBus = {
          emit: (e) => {
            // Two transports for every critique event: the run-scoped
            // SSE send back to the originating chat run, plus the
            // project-scoped fan-out so the Theater mount (subscribed
            // to /api/projects/:id/events) sees it too. Route the
            // project fan-out through emitProjectEvent so empty-sink
            // cleanup and any future broadcast policy (rate limiting,
            // schema validation, telemetry) apply uniformly across
            // every project emitter (PerishCode P3 on PR #1338).
            send(e.event, e.data);
            if (critiqueProjectIdForBus) {
              emitProjectEvent(critiqueProjectIdForBus, { ...e.data, type: e.event });
            }
          },
        };

        // Register this run with the in-process registry so the interrupt
        // endpoint can cascade an AbortController to the orchestrator. The
        // register call must run BEFORE runOrchestrator is invoked, so a
        // request that arrives between spawn and orchestrator-start cannot
        // miss a runId that already has a live child process.
        const critiqueAbort = new AbortController();
        critiqueRunRegistry.register({
          runId: critiqueRunId,
          projectId: critiqueProjectKey,
          abort: critiqueAbort,
          startedAt: Date.now(),
        });

        // Stderr forwarding and child.on('error') must be wired BEFORE the
        // orchestrator awaits stdout. Otherwise a CLI that floods stderr can
        // fill the OS pipe and deadlock the run until the total timeout, and
        // an early child error fired before the orchestrator returns has no
        // listener. Both registrations are idempotent and the run lifecycle
        // is owned solely by the orchestrator's awaited result below.
        child.stderr.on('data', (chunk) => {
          noteAgentActivity();
          emitVisibleAgentStderr(chunk);
        });
        child.on('error', (err) => {
          flushVisibleAgentStderr();
          send('error', createSseErrorPayload('AGENT_EXECUTION_FAILED', err.message));
        });

        // Wrap the child's close event so the orchestrator can race child
        // exit against parser completion, abort, and timeouts in one awaited
        // flow. Without this the orchestrator can't tell a non-zero exit
        // apart from a clean ship and may misclassify failures.
        const childExitPromise = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
          child.once('close', (code, signal) => {
            flushVisibleAgentStderr();
            resolve({ code, signal });
          });
        });
        try {
          const orchestratorResult = await runOrchestrator({
            runId: critiqueRunId,
            projectId: typeof projectId === 'string' ? projectId : '',
            conversationId: typeof conversationId === 'string' ? conversationId : null,
            artifactId: critiqueRunId,
            artifactDir: critiqueArtifactDir,
            adapter: typeof agentId === 'string' ? agentId : 'unknown',
            // startChatRun resolves this once after loading the project:
            // request-level skill first, persisted project skill second.
            skill: typeof effectiveRunSkillId === 'string' && effectiveRunSkillId
              ? effectiveRunSkillId
              : undefined,
            cfg: critiqueCfg,
            db,
            bus: critiqueBus,
            stdout: stdoutIterable,
            child,
            childExitPromise,
            signal: critiqueAbort.signal,
          });
          // Map the critique terminal status to the chat run lifecycle.
          // 'shipped' and 'below_threshold' both ran to a ship decision and
          // finalize as 'succeeded'; every other status (timed_out,
          // interrupted, degraded, failed, legacy) is a failure path so the
          // run reflects the real outcome instead of a misleading success.
          const succeeded = orchestratorResult.status === 'shipped'
            || orchestratorResult.status === 'below_threshold';
          if (run.cancelRequested) {
            finishStrategyAwarePhysicalRun('canceled', 1, null);
          } else if (succeeded) {
            finishRun('succeeded', 0, null);
          } else {
            finishStrategyAwarePhysicalRun('failed', 1, null);
          }
        } catch (err) {
          flushVisibleAgentStderr();
          send('error', createSseErrorPayload('AGENT_EXECUTION_FAILED', err instanceof Error ? err.message : String(err)));
          finishStrategyAwarePhysicalRun('failed', 1, null);
        } finally {
          critiqueRunRegistry.unregister(critiqueProjectKey, critiqueRunId);
        }
        return;
      }
    }

    // Structured streams (Claude Code) go through a line-delimited JSON
    // parser that turns stream_event objects into UI-friendly events. For
    // plain streams (most other CLIs) we forward raw chunks unchanged so
    // the browser can append them to the assistant's text buffer.
    let agentStreamError = null;
    // Preserve whether a latched error predates a later cancel request. The
    // close handler runs after cancel() has already flipped cancelRequested,
    // so consulting only the current flag loses the ordering of those events.
    let agentStreamErrorObservedBeforeCancellation = false;
    let acpFatalErrorObservedBeforeCancellation = false;
    run.runtimeFailureObservedBeforeCancellation = false;
    // Holds buffered plain-text stdout chunks for agents (currently
    // antigravity) where we need to inspect the full output at close
    // time before deciding whether to forward it. The auth-prompt guard
    // in the close handler suppresses the buffer when the output is an
    // OAuth prompt; otherwise the flush below sends the chunks in order.
    const plaintextStdoutBuffer: BufferedStdoutChunk[] = [];
    // Arrival time of the first buffered plain-text stdout chunk
    // (antigravity). First-token timing is stamped from this value only
    // when the buffer is actually flushed to the client at close time. If
    // the auth-prompt guard suppresses the buffer (the OAuth login URL is
    // printed to stdout), no token ever reaches the user, so TTFT must not
    // be recorded for that failure mode. See PR #3412.
    let firstBufferedStdoutAt: number | null = null;
    // Tracks whether any stream the run is using actually emitted user-
    // visible content or a deliverable. Only the streams routed through
    // `sendAgentEvent` contribute to this flag; ACP sessions and plain stdout
    // streams are covered by their own success/failure paths and the
    // empty-output guard below skips them via `trackingSubstantiveOutput`.
    let agentProducedOutput = false;
    let trackingSubstantiveOutput = false;
    // Event types that count as "the agent actually produced a response or a
    // deliverable." Lifecycle markers (`status`), meter readings (`usage`),
    // reasoning deltas, and tool activity deliberately do NOT count: a run can
    // think/read/call tools and still terminate before returning text/artifacts
    // to the user. Treat that as empty output instead of a silent success
    // (issues #691, #4814).
    const SUBSTANTIVE_AGENT_EVENT_TYPES = new Set([
      'text_delta',
      'artifact',
    ]);
    // First-token timing must reflect when the user actually starts seeing
    // model output, so only token-producing events qualify. `tool_use` is
    // deliberately excluded: a run that opens with a Read/Glob/MCP call would
    // otherwise stamp `firstTokenAt` before any `text_delta` streamed,
    // making `time_to_first_token_ms` / `spawn_to_first_token_ms` under-report
    // TTFT for tool-first runs. `thinking_delta` stays in because it is the
    // first visible model activity the user perceives.
    const FIRST_TOKEN_AGENT_EVENT_TYPES = new Set([
      'text_delta',
      'thinking_delta',
    ]);
    // Stamps ONLY `first_token`. `first_visible_output` deliberately does not
    // ride along: it belongs to the single emission choke point in `send()`,
    // which runs after the title-marker stripper and the fabricated-role-marker
    // guard have decided whether these bytes reach the client at all. Stamping
    // both here made `time_to_first_visible_output_ms` a byte-for-byte copy of
    // `time_to_first_token_ms` — the mark is first-write-wins, so this call
    // always won and the `send()` mark could never fire. The two are equal
    // whenever output streams straight through (the common case, and correct);
    // they diverge exactly when the daemon HOLDS bytes back, which is the
    // window the metric exists to measure.
    const noteFirstTokenAt = (timestamp = Date.now()) => {
      // Telemetry-only, and every call site sits inside a live stream handler
      // that is mid-way through delivering a delta. Same contract as the marks
      // in `send`: a fault here costs a timing field, never the reply.
      recordRunTelemetry('first token', () => {
        if (run.analyticsTelemetry?.firstTokenAt) return;
        lifecycle.mark('first_token', timestamp);
      });
    };
    // Subsegment markers inside `processSpawnedAt -> firstTokenAt` (#3408 §4).
    // `cliReadyAt` is the first well-formed adapter output and is stamped for
    // every runtime family from its own decode choke point: first JSONL line
    // (claude-stream-json), first decoded stream event (json-event-stream /
    // qoder / pi-rpc), first non-empty stdout chunk (plain), or first ACP
    // JSON-RPC message (acp-json-rpc). `sessionInitDoneAt` is only observable
    // for ACP (the resume/`session/new` ack); for stream/plain families that
    // gap is folded into `spawn_to_first_token_remainder_ms` rather than
    // anchored to a fabricated marker. Both are first-write-wins like
    // `firstTokenAt` so a later chunk cannot move an already-stamped boundary.
    const noteCliReadyAt = (timestamp = Date.now()) => {
      if (run.analyticsTelemetry?.cliReadyAt) return;
      run.analyticsTelemetry = {
        ...(run.analyticsTelemetry ?? {}),
        cliReadyAt: timestamp,
      };
    };
    const noteSessionInitDoneAt = (timestamp = Date.now()) => {
      if (run.analyticsTelemetry?.sessionInitDoneAt) return;
      run.analyticsTelemetry = {
        ...(run.analyticsTelemetry ?? {}),
        sessionInitDoneAt: timestamp,
      };
    };
    const noteFirstTokenFromAgentEvent = (ev) => {
      if (ev?.type && FIRST_TOKEN_AGENT_EVENT_TYPES.has(ev.type)) {
        noteFirstTokenAt();
      }
    };

    // Per-run role-marker guard for non-Claude structured streams (#3247).
    // Claude has its own per-message guards in claude-stream.ts.
    const runGuard = createRoleMarkerGuard('run');
    let runWarned = false;
    const visibleStdoutControlStripper = new TerminalControlSequenceStripper();
    // Strip on every Run, announce on the Runs that asked for a title. The
    // directive lives in the agent's own session history, so a resumed CLI can
    // repeat the marker on a later turn that never requested one — gating the
    // stripper on the request is what let `<od-title>` reach the chat.
    const titleMarkerStripper = createAgentTitleMarkerStripper({
      enabled: true,
      emitTitle: titleGenerationRequested
        ? (title) => send('agent', { type: 'conversation_title', title })
        : () => {},
    });

    function flushAgentTitleMarkerBuffer() {
      const visible = titleMarkerStripper.flush();
      if (visible) emitGuardedTextDelta(visible);
    }

    function guardTextDelta(delta) {
      return runGuard.feedText(delta);
    }

    // Shared helper for emitting guarded text deltas across all agent
    // stream handlers (sendAgentEvent, copilot, ACP).
    function emitGuardedTextDelta(delta: string) {
      const safe = guardTextDelta(delta);
      if (safe.length > 0) {
        noteFirstOutputEvent({ type: 'text_delta' });
        send('agent', { type: 'text_delta', delta: safe });
      }
      if (runGuard.contaminated && !runWarned) {
        runWarned = true;
        const warn = runGuard.warningEvent();
        if (warn) {
          send('agent', warn);
          abortForRoleMarker(warn.marker);
        }
      }
    }

    function emitTitleFilteredGuardedTextDelta(delta: string) {
      const visibleDelta = titleMarkerStripper.strip(delta);
      if (!visibleDelta) return false;
      emitGuardedTextDelta(visibleDelta);
      return true;
    }

    // Detection-only is necessary but not sufficient: by the time we see
    // the role marker the model has already burned tokens, and the
    // subprocess will keep generating downstream tokens (including
    // `tool_use` blocks built on the fabricated context) until it exits
    // on its own. We terminate the child immediately so:
    //   1. Token billing stops at the detection point, not at the
    //      model's natural completion of the contaminated response.
    //   2. `tool_use` content blocks emitted AFTER the marker cannot
    //      reach the daemon's tool-call dispatcher. Blocks emitted
    //      BEFORE the marker have already been dispatched; this guard
    //      can't help with those — they're a separate hardening.
    //   3. The UI distinguishes "completed" from "killed by safety
    //      guard" through a structured SSE error rather than seeing a
    //      `fabricated_role_marker` warning followed by an eventual
    //      normal turn-end.
    // Idempotent — multiple guard paths (per-message Claude, run-scoped
    // non-Claude, plain stdout) can all call it.
    let roleMarkerAbortFired = false;
    function abortForRoleMarker(marker: string) {
      if (roleMarkerAbortFired) return;
      roleMarkerAbortFired = true;
      send(
        'error',
        createSseErrorPayload(
          'ROLE_MARKER_HALLUCINATION',
          `Run terminated: model emitted fabricated role marker (\`${marker}\`). ` +
            'No further tokens or tool calls accepted from this turn. ' +
            'See https://github.com/nexu-io/open-design/issues/3247.',
          { retryable: true },
        ),
      );
      // ACP sessions (Hermes, Kimi, Devin, Kiro, etc.) need explicit
      // abort because their I/O is multiplexed and they won't
      // necessarily exit on child SIGTERM alone.
      if (acpSession?.abort) {
        try {
          acpSession.abort();
        } catch {
          // ignore — best-effort
        }
      }
      if (child && !child.killed) design.runs.signalChild(run, 'SIGTERM');
      scheduleForcedChildShutdown();
    }

    // Per-run tool-loop guard. Agents sometimes fixate on a failing tool call
    // and grind through dozens of identical attempts (e.g. re-running an Edit
    // whose `old_string` never matches, or a shell assertion against an element
    // that does not exist). Unlike the BYOK proxy path — bounded by
    // MAX_BYOK_TOOL_LOOPS — the autonomous chat agents had no such bound. This
    // guard observes the normalized tool_use/tool_result events EVERY agent
    // path emits, so one instance covers Claude, Codex/OpenCode, Copilot, ACP,
    // … It emits a one-shot `tool_loop` warning, then (in halt mode) terminates
    // the run at a hard ceiling. Mode via OD_TOOL_LOOP_GUARD (halt|warn|off).
    const toolLoopGuard = createToolLoopGuard({ mode: resolveToolLoopMode() });
    let toolLoopAbortFired = false;

    // Idempotent — both agent-event paths (sendAgentEvent, the Claude
    // stream-json callback) can route a halt verdict here.
    function abortForToolLoop(verdict: ToolLoopVerdict) {
      if (toolLoopAbortFired) return;
      toolLoopAbortFired = true;
      send(
        'error',
        createSseErrorPayload(
          'TOOL_LOOP_DETECTED',
          `Run terminated: the agent repeated a failing ${verdict.toolName} call ` +
            `${verdict.count}× without progress (\`${verdict.signature}\`). Re-check the ` +
            'actual target — the file, the element, the command — before retrying ' +
            'instead of resubmitting the same turn.',
          { retryable: true },
        ),
      );
      if (acpSession?.abort) {
        try {
          acpSession.abort();
        } catch {
          // ignore — best-effort
        }
      }
      // Route through signalChild (not a bare child.kill) so the halt escalates
      // to the whole process group when one exists, matching abortForRoleMarker,
      // cancel, and the inactivity watchdog. A bare child.kill leaves Bash/build
      // grandchildren alive to keep mutating the workspace until the forced
      // shutdown fires — exactly the loop class this guard is meant to stop.
      if (child && !child.killed) design.runs.signalChild(run, 'SIGTERM');
      scheduleForcedChildShutdown();
    }

    // Feed a normalized agent event into the loop guard and act on a verdict.
    // Safe to call for every event; non-tool events are ignored. Emit the
    // `tool_loop` warning to the UI/CLI, and on a halt verdict tear the run
    // down so it cannot keep grinding.
    function observeToolEventForLoop(ev: any) {
      if (!ev || typeof ev !== 'object') return;
      if (ev.type === 'tool_use' && typeof ev.id === 'string') {
        toolLoopGuard.observeToolUse(ev.id, typeof ev.name === 'string' ? ev.name : 'tool', ev.input);
        return;
      }
      if (ev.type === 'tool_result' && typeof ev.toolUseId === 'string') {
        const verdict = toolLoopGuard.observeToolResult(
          ev.toolUseId,
          Boolean(ev.isError),
          typeof ev.content === 'string' ? ev.content : '',
        );
        if (verdict) {
          send('agent', verdict);
          if (verdict.action === 'halt') abortForToolLoop(verdict);
        }
      }
    }

    // Single choke point for emitting an agent event to the client. EVERY
    // stream handler (sendAgentEvent, the Claude callback, Copilot, ACP, …)
    // emits through here, never via a bare send('agent', …), so the tool-loop
    // guard sees every runtime's tool activity and no handler can drift out of
    // coverage. observe runs AFTER the send so a `tool_loop` warning/halt
    // follows the result that triggered it in the stream. (PR #3375 review:
    // Copilot and ACP bypassed the guard by calling send('agent', …) directly.)
    function emitAgentEvent(ev: any) {
      // Fold work-completeness signals (TodoWrite snapshot / truncation) off the
      // stream BEFORE the send, so run.lastTodoSnapshot / run.truncatedMidTurn are
      // set by the time finish() derives run.endedWithUnfinishedWork (#1247/#1060).
      captureRunWorkCompletenessSignals(run, ev);
      noteFirstOutputEvent(ev);
      send('agent', ev);
      observeToolEventForLoop(ev);
    }

    const sendAgentEvent = (ev) => {
      if (ev?.type === 'error') {
        // Cancellation is the terminal user intent. Some CLIs flush a final
        // error record while reacting to SIGTERM; treating that late frame as
        // a run failure races the cancel route and can make it return failed.
        if (run.cancelRequested) return;
        if (agentStreamError) return;
        flushVisibleAgentStderr();
        const failureText = [
          String(ev.message || 'Agent stream error'),
          typeof ev.raw === 'string' ? ev.raw : '',
          agentStdoutTail,
          agentStderrTail,
        ].join('\n');
        agentStreamError = rewriteKnownAgentStreamError(
          agentId,
          String(ev.message || 'Agent stream error'),
          failureText,
        );
        agentStreamErrorObservedBeforeCancellation = true;
        run.runtimeFailureObservedBeforeCancellation = true;
        clearInactivityWatchdog();
        const authFailure = classifyAgentAuthFailure(agentId, failureText);
        if (authFailure?.status === 'missing') {
          send('error', createSseErrorPayload(
            'AGENT_AUTH_REQUIRED',
            authFailure.message ?? cursorAuthGuidance(),
            { retryable: true },
          ));
          return;
        }
        // Recover the specific model-service failure class (auth / quota /
        // upstream) for agents without a tailored probe (Claude Code, codex,
        // …), so the chat shows an accurate reason instead of the generic
        // execution-failed bucket.
        const serviceCode = classifyAgentServiceFailure(failureText);
        if (serviceCode) {
          send('error', createSseErrorPayload(serviceCode, agentStreamError, {
            details: ev.raw ? { raw: ev.raw } : undefined,
            retryable: true,
          }));
          return;
        }
        send('error', withAcpHandshakeFailureGuidance(
          createSseErrorPayload('AGENT_EXECUTION_FAILED', agentStreamError, {
            details: ev.raw ? { raw: ev.raw } : undefined,
          }),
          agentFailureIdentity(def),
        ));
        return;
      }
      // First well-formed decoded stream event = CLI ready for the
      // json-event-stream / qoder / pi-rpc families (#3408 §4 marker).
      noteCliReadyAt();
      // Capture-style resume: codex reports its own thread id on the
      // `thread.started` status event. Persist the most recent non-empty id we
      // see so the create-turn store (and the resumable-failure store) use the
      // CLI's real session handle, not the unused daemon-minted `newSessionId`.
      if (
        agentCapturesSessionId &&
        ev?.type === 'status' &&
        typeof ev.sessionId === 'string' &&
        ev.sessionId.length > 0
      ) {
        capturedSessionId = ev.sessionId;
        run.nativeSessionRecovery = markNativeSessionCaptured({
          previous: run.nativeSessionRecovery,
          agentId: def.id,
          sessionId: capturedSessionId,
          resumed: agentResumeCtx.isResuming,
        });
        publishNativeSessionRecoveryMetadata();
      }
      lastAgentEventPhase = summarizeAgentEventForInactivity(ev);
      noteAgentActivity();
      // Role-marker guard for qoder / json-event-stream / pi-rpc (#3247).
      if (ev?.type === 'text_delta' && typeof ev.delta === 'string') {
        // Decode time, captured BEFORE the emit. The gate has to run first to
        // learn whether these bytes are a token at all, but the emit inside it
        // fans the delta out to every SSE client and stamps
        // `first_visible_output` on the way — reading the clock afterwards
        // charges our own write latency to TTFT and can leave the visible-output
        // mark a millisecond AHEAD of the token that produced it. See the
        // matching sites in the Copilot and ACP handlers.
        const decodedAt = Date.now();
        if (emitTitleFilteredGuardedTextDelta(ev.delta)) {
          noteFirstTokenAt(decodedAt);
          agentProducedOutput = true;
        }
        return;
      }
      noteFirstTokenFromAgentEvent(ev);
      if (ev?.type && SUBSTANTIVE_AGENT_EVENT_TYPES.has(ev.type)) {
        agentProducedOutput = true;
      }
      emitAgentEvent(ev);
    };
    const parseBufferedAntigravityGeminiJsonEventStream = () => {
      if (
        def.id !== 'antigravity' ||
        plaintextStdoutBuffer.length === 0
      ) {
        return false;
      }
      const bufferedStdout = plaintextStdoutBuffer.map((chunk) => chunk.text).join('');
      if (!looksLikeGeminiJsonEventStream(bufferedStdout)) return false;
      trackingSubstantiveOutput = true;
      const firstTokenAt = bufferedAntigravityGeminiFirstTokenAt(plaintextStdoutBuffer);
      if (firstTokenAt !== null) noteFirstTokenAt(firstTokenAt);
      const handler = createJsonEventStreamHandler('gemini', sendAgentEvent);
      handler.feed(bufferedStdout);
      handler.flush();
      plaintextStdoutBuffer.length = 0;
      return true;
    };
    const publishRuntimeChildEvidenceCoverage = (coverage) => {
      if (!strategyTaskAtStart || !coverage) return;
      sendAgentEvent({
        type: 'diagnostic',
        name: 'child_evidence_coverage_v1',
        coverage,
      });
    };

    if (def.streamFormat === 'claude-stream-json') {
      const claude = createClaudeStreamHandler((ev) => {
        // First parsed claude-stream-json event = CLI ready (#3408 §4); the
        // init/system line arrives well before the model's first token.
        noteCliReadyAt();
        if (ev?.type === 'error') {
          // Claude commonly reports its SIGTERM shutdown as an assistant or
          // result error frame. Once cancellation has been requested, that
          // frame is shutdown noise rather than a new user-visible failure.
          if (run.cancelRequested) return;
          if (agentStreamError) return;
          // Hold back a resume-failure error so the close handler's transparent
          // reseed stays invisible. An is_error result frame on a dead --resume
          // now surfaces here as a stream error; the resume-target-missing
          // block in the close handler clears the stale handle and re-runs the
          // turn fresh, so forwarding this error would flash an execution
          // failure a beat before the invisible recovery. Mirrors the ACP
          // resume_failed suppression below; the close handler stays the sole
          // authority on how a resume failure ends.
          if (
            (runtimeResumesSessionById(def) || def.resumesSessionViaAcpLoad === true) &&
            !run.resumeAutoReseeded &&
            resolveAgentResumeFailurePolicy({
              agentId: def.id,
              stderr: agentStderrTail,
              stdout: agentStdoutTail,
              isResuming: agentResumePromptPolicy.skipTranscript,
              resumeSessionId: agentResumePromptPolicy.resumeSessionId,
            }).resumeFailed
          ) {
            design.runs.emit(run, 'diagnostic', {
              type: 'agent_resume_failed_suppressed',
              agent_id: def.id,
              reason: 'resume_failed',
              previous_session_id: agentResumePromptPolicy.resumeSessionId ?? null,
            });
            return;
          }
          flushVisibleAgentStderr();
          const message = String((ev as any).message || 'Claude Code stream error');
          const failureText = [
            message,
            typeof (ev as any).code === 'string' ? (ev as any).code : '',
            agentStdoutTail,
            agentStderrTail,
          ].join('\n');
          clearInactivityWatchdog();
          // A parsed terminal Claude result has stronger provenance than text
          // sniffing across the combined stdout/stderr tail. In particular,
          // Claude can log `apiKeySource: none` alongside an upstream
          // `Prompt is too long` result; letting the broad auth diagnostic see
          // that tail first sends users to /login instead of reducing context.
          // Only accept the stable code emitted by claude-stream for this
          // terminal result shape; other Claude errors keep the existing
          // diagnostic/service fallback behavior.
          const structuredCode =
            (ev as any).terminal === true &&
            (ev as any).code === 'AGENT_PROMPT_TOO_LARGE'
              ? 'AGENT_PROMPT_TOO_LARGE'
              : null;
          // Claude surfaces a connection drop / reset as an in-stream `error`
          // frame (assistant `error:"unknown"` + the raw SDK string), which
          // would otherwise reach the UI verbatim as a non-retryable
          // AGENT_EXECUTION_FAILED. Run the same per-agent diagnostic used at
          // child-exit so this path emits the specific class
          // (AGENT_CONNECTION_DROPPED) — retryable, with copy the web can
          // localize and triage can count by code.
          const diagnostic = structuredCode
            ? null
            : diagnoseClaudeCliFailure({
                agentId: def.id,
                exitCode: 1,
                stderrTail: agentStderrTail,
                stdoutTail: failureText,
                env: spawnedAgentEnv,
                resolvedBin: agentLaunch.selectedPath,
              });
          const serviceCode = structuredCode
            ? null
            : classifyAgentServiceFailure(failureText);
          agentStreamError = structuredCode
            ? message
            : diagnostic?.message
              ?? rewriteKnownAgentStreamError(agentId, message, failureText);
          agentStreamErrorObservedBeforeCancellation = true;
          run.runtimeFailureObservedBeforeCancellation = true;
          send('error', withAcpHandshakeFailureGuidance(
            createSseErrorPayload(
              structuredCode ?? diagnostic?.code ?? serviceCode ?? 'AGENT_EXECUTION_FAILED',
              agentStreamError,
              {
                retryable: structuredCode
                  ? false
                  : diagnostic?.retryable
                    ?? (serviceCode === 'AGENT_AUTH_REQUIRED' || serviceCode === 'RATE_LIMITED'),
                ...(diagnostic ? { details: { detail: diagnostic.detail } } : {}),
              },
            ),
            agentFailureIdentity(def),
          ));
          return;
        }
        lastAgentEventPhase = summarizeAgentEventForInactivity(ev);
        noteAgentActivity();
        if (ev?.type === 'text_delta' && typeof ev.delta === 'string') {
          const visibleDelta = titleMarkerStripper.strip(ev.delta);
          if (visibleDelta) {
            noteFirstTokenAt();
            emitAgentEvent({ ...ev, delta: visibleDelta });
          }
          return;
        }
        noteFirstTokenFromAgentEvent(ev);
        emitAgentEvent(ev);
        // Claude uses per-message guards (claude-stream.ts) rather than the
        // run-scoped guard above, so its `fabricated_role_marker` events
        // surface here directly from the stream handler, not via
        // emitGuardedTextDelta. Same abort semantics apply.
        if (ev && (ev as any).type === 'fabricated_role_marker') {
          const m = (ev as any).marker;
          abortForRoleMarker(typeof m === 'string' ? m : 'role marker');
        }
        // Stream-json input mode keeps the child's stdin open across the
        // turn so the daemon can stream further user messages mid-turn. The
        // child has no other way to know the turn is over, though — without
        // an EOF it sits idle until the inactivity watchdog kills it.
        // Bookkeeping here closes stdin on a clean terminal turn:
        //   - turn_end (per-turn synthesized from `stop_reason`): fire on
        //     `end_turn` etc. but NOT on `tool_use` — that stop reason
        //     means the model paused mid-tool, not "turn complete".
        //   - usage (session result at EOF in single-shot mode).
        try {
          applyClaudeStreamJsonRunBookkeeping(run, ev);
        } catch {}
      }, {
        suppressHtmlArtifactsAfterFileWrite: def.id === 'claude',
        ...(observeClaudeNativeChildBehavior
          ? {
              suppressForwardedSubagentEvents: true,
              onChildRuntimeFact: (fact) => sendAgentEvent({
                type: 'diagnostic',
                name: 'claude_child_runtime_fact',
                ...fact,
              }),
              onChildToolRuntimeFact: (fact) => sendAgentEvent({
                type: 'diagnostic',
                name: 'claude_child_tool_runtime_fact',
                ...fact,
              }),
            }
          : {}),
        ...(nativeBuildPackageBindings.length > 0
          ? {
              nativeBuildPackageBindings: nativeBuildPackageBindingMap(
                nativeBuildPackageBindings,
              ),
            }
          : {}),
      });
      child.stdout.on('data', (chunk) => claude.feed(chunk));
      child.on('close', (code, signal) => {
        claude.flush();
        claude.finishOpenChildEvidence(
          run.cancelRequested
            ? 'canceled'
            : run.terminalTrigger === 'first_output_deadline'
              || run.terminalTrigger === 'inactivity_watchdog'
              ? 'timeout'
              : code === 0 && signal === null && !agentStreamError
                ? 'complete'
                : 'stream_incomplete',
        );
        publishRuntimeChildEvidenceCoverage(claude.childEvidenceCoverage());
      });
    } else if (def.streamFormat === 'qoder-stream-json') {
      trackingSubstantiveOutput = true;
      const qoder = createQoderStreamHandler(sendAgentEvent);
      child.stdout.on('data', (chunk) => qoder.feed(chunk));
      child.on('close', () => qoder.flush());
    } else if (def.streamFormat === 'copilot-stream-json') {
      const copilot = createCopilotStreamHandler((ev) => {
        lastAgentEventPhase = summarizeAgentEventForInactivity(ev);
        noteAgentActivity();
        if (ev?.type === 'text_delta' && typeof ev.delta === 'string') {
          // Decode time, read before the emit — see `sendAgentEvent`.
          const decodedAt = Date.now();
          if (emitTitleFilteredGuardedTextDelta(ev.delta)) {
            noteFirstTokenAt(decodedAt);
          }
          return;
        }
        noteFirstTokenFromAgentEvent(ev);
        emitAgentEvent(ev);
      }, {
        onChildRuntimeFact: (fact) => sendAgentEvent({
          type: 'diagnostic',
          name: 'claude_child_runtime_fact',
          ...fact,
        }),
      });
      child.stdout.on('data', (chunk) => copilot.feed(chunk));
      child.on('close', () => copilot.flush());
    } else if (def.streamFormat === 'pi-rpc') {
      // Route through sendAgentEvent so that pi-rpc's error events
      // (extension_error, auto_retry_end with success=false, and the
      // message_update error delta) set agentStreamError and flip the
      // run to `failed` on close — same path as qoder-stream-json and
      // json-event-stream after issue #691. Also enables the
      // substantive-output guard (agentProducedOutput) so a pi run
      // that exits 0 without producing visible content is caught.
      //
      // attachPiRpcSession invokes its send callback with the two-arg
      // channel/payload shape: send('agent', payload) for normal events
      // and send('error', {message}) from fail(). sendAgentEvent
      // expects a single event object, so we adapt at the call site:
      //   - 'agent' channel → relay payload through sendAgentEvent
      //   - 'error' channel → route through the daemon's error path
      //     (createSseErrorPayload + send SSE + set agentStreamError)
      trackingSubstantiveOutput = true;
      acpSession = attachPiRpcSession({
        child,
        prompt: composed,
        cwd: effectiveCwd,
        model: safeModel,
        parentSession: agentResumePromptPolicy.resumeSessionId
          ? agentResumePromptPolicy.resumeSessionId
          : undefined,
        send: (channel, payload) => {
          if (channel === 'agent') {
            sendAgentEvent(payload);
          } else if (channel === 'error') {
            if (run.cancelRequested) return;
            if (agentStreamError) return;
            flushVisibleAgentStderr();
            agentStreamError = String(payload?.message || 'Pi session error');
            agentStreamErrorObservedBeforeCancellation = true;
            acpFatalErrorObservedBeforeCancellation = true;
            run.runtimeFailureObservedBeforeCancellation = true;
            const piErrorCode = typeof payload?.code === 'string' ? payload.code : null;
            if (piErrorCode) {
              run.errorCode = piErrorCode;
            }
            if (piErrorCode === 'PI_PARENT_SESSION_FAILED' && run.conversationId) {
              clearAgentSession(db, run.conversationId, def.id);
            }
            clearInactivityWatchdog();
            send('error', createSseErrorPayload(
              'AGENT_EXECUTION_FAILED',
              agentStreamError,
              { retryable: false },
            ));
          } else {
            noteAgentActivity();
            send(channel, payload);
          }
        },
        imagePaths: def.supportsImagePaths ? promptImagePaths : [],
        uploadRoot: odNextTaskInputSnapshot?.projectionDir ?? UPLOAD_DIR,
      });
    } else if (def.streamFormat === 'acp-json-rpc') {
      const acpStageTimeoutMs = resolveAcpStageTimeoutMs(def.inactivityTimeoutMs);
      acpSession = attachAcpSession({
        child,
        prompt: composed,
        cwd: effectiveCwd,
        model: safeModel,
        imagePaths: def.supportsImagePaths ? acpPromptImagePaths : [],
        resourcePaths: odNextTaskInputSnapshot?.attachmentPaths ?? [],
        mcpServers,
        envFormat: def.acpMcpEnvFormat ?? 'array',
        // Lets the session withhold stdio MCP servers from agent builds that
        // reject them (Kimi 0.37.0+). Unset for every other runtime, which
        // leaves their `session/new` payload exactly as it is today.
        stdioMcpRemovedInVersion: def.acpStdioMcpRemovedInVersion ?? null,
        executionProfile,
        completePromptOnTurnEnd: def.acpTurnEndCompletesPrompt === true,
        ...(def.id === 'amr' ? { modelUnavailableErrorCode: 'AMR_MODEL_UNAVAILABLE' } : {}),
        // Resume the prior upstream session (drives `session/load`) when the
        // resume-identity guard says it is safe; otherwise a fresh session/new.
        ...(def.resumesSessionViaAcpLoad === true && agentResumePromptPolicy.resumeSessionId
          ? { resumeSessionId: agentResumePromptPolicy.resumeSessionId }
          : {}),
        onCliReady: () => noteCliReadyAt(),
        onSessionInit: () => noteSessionInitDoneAt(),
        onPromptComplete: () => clearFirstOutputWatchdog(),
        send: (event, data, meta) => {
          if (event === 'error') {
            clearFirstOutputWatchdog();
            if (run.cancelRequested) return;
            acpFatalErrorObservedBeforeCancellation = true;
            run.runtimeFailureObservedBeforeCancellation = true;
          }
          if (event === 'agent') {
            lastAgentEventPhase = summarizeAgentEventForInactivity(data);
            if (
              data?.type === 'status' &&
              data.label === 'waiting_for_first_output'
            ) {
              armFirstOutputWatchdog();
            } else if (data?.type !== 'text_delta') {
              // Raw ACP text may be entirely consumed by title-marker or role
              // filtering. Only the guarded non-empty emission below counts
              // as substantive first output.
              noteFirstOutputEvent(data);
            }
          }
          // Only bytes the agent produced advance the progress clock. The ACP
          // bridge's `hostSynthesized` pairs are the daemon closing tools the
          // agent left open, emitted from `fail()` just BEFORE the verdict;
          // the terminal `error` is the verdict itself. Stamping the clock
          // from either is what made a 30-minute stall report
          // `last_progress_age_ms = 664`.
          if (runtimeEmissionCountsAsAgentProgress(event, meta)) {
            noteAgentActivity();
          }
          // ...and everything the child emits AFTER the verdict — its shutdown
          // line on stderr, the diagnostic promoted from that line — is a
          // reaction to the SIGTERM this error is about to trigger, not
          // progress. Freeze here so the recorded age keeps describing the
          // silence rather than our own teardown.
          if (event === 'error') retireAttemptOnAcpVerdict();
          if (event === 'error') flushVisibleAgentStderr();
          if (def.id === 'amr' && event === 'error') {
            const failure = classifyAmrAccountFailureSignal({
              details: data?.error?.details,
              message: data?.message,
              errorMessage: data?.error?.message,
              errorCode: data?.error?.code,
              stdoutTail: agentStdoutTail,
              stderrTail: agentStderrTail,
            });
            if (failure) {
              sendAmrAccountFailure(failure);
              return;
            }
          }
          // Hold back the `resume_failed` error so the same-turn reseed stays
          // transparent. When this run is resuming an upstream session via
          // `session/load` and the agent reports that session is gone, the ACP
          // bridge has already called `fail()` -> `send('error')` for the failed
          // load. The child-close handler then clears the stale handle and
          // re-runs this turn fresh (the resume-target-missing block below), so
          // forwarding this error would flash an execution failure — and trip
          // clients that treat an SSE `error` as terminal — a beat before the
          // invisible recovery. Suppress it and leave a diagnostic instead; the
          // close handler is the sole authority on whether this turn ends in an
          // error or a transparent reseed. The `resumeAutoReseeded` guard lets a
          // second resume failure in one run fall through to the explicit
          // "resend your message" affordance the close handler emits.
          if (
            event === 'error' &&
            def.resumesSessionViaAcpLoad === true &&
            !run.resumeAutoReseeded &&
            resolveAgentResumeFailurePolicy({
              agentId: def.id,
              stderr: agentStderrTail,
              stdout: agentStdoutTail,
              isResuming: agentResumePromptPolicy.skipTranscript,
              resumeSessionId: agentResumePromptPolicy.resumeSessionId,
            }).resumeFailed
          ) {
            design.runs.emit(run, 'diagnostic', {
              type: 'agent_resume_failed_suppressed',
              agent_id: def.id,
              reason: 'resume_failed',
              previous_session_id: agentResumePromptPolicy.resumeSessionId ?? null,
            });
            return;
          }
          if (event === 'agent' && data?.type === 'text_delta' && typeof data.delta === 'string') {
            // Decode time, read before the emit — see `sendAgentEvent`.
            const decodedAt = Date.now();
            if (emitTitleFilteredGuardedTextDelta(data.delta)) {
              noteFirstTokenAt(decodedAt);
            }
            return;
          }
          if (event === 'agent') {
            noteFirstTokenFromAgentEvent(data);
            emitAgentEvent(data);
            return;
          }
          if (event === 'error') {
            // This payload is the whole user-visible surface of an ACP failure:
            // `send` streams it to SSE clients and `design.runs.emit` reads
            // `run.error` out of it, and the close handler below returns on
            // `hasFatalError()` before any later rewrite can run. Explain a
            // handshake rejection here or nowhere.
            send(event, withAcpHandshakeFailureGuidance(
              data,
              agentFailureIdentity(def),
            ));
            return;
          }
          send(event, data);
        },
        ...(acpStageTimeoutMs !== undefined ? { stageTimeoutMs: acpStageTimeoutMs } : {}),
      });
      // Publish AMR/vela child-evidence coverage at child close. Without it the
      // ACP runtime emits no `child_evidence_coverage_v1` at all and every AMR
      // task aggregates as `child_lifecycle_unavailable_not_zero`, which cannot
      // tell "this run had no Child agents" from "nobody was observing".
      //
      // Registration order is load-bearing: `attachAcpSession` installs its own
      // close handler above, so the session has already settled
      // finished/fatal/aborted by the time this one reads it and the coverage
      // reflects how the turn actually ended. A non-AMR ACP agent has no vela
      // consumer and yields undefined, which the publisher already ignores.
      child.on('close', () => {
        publishRuntimeChildEvidenceCoverage(acpSession?.childEvidenceCoverage?.());
      });
    } else if (def.streamFormat === 'dsh-profile-jsonl') {
      trackingSubstantiveOutput = true;
      acpSession = attachDshProfileSession({
        child,
        requestId: run.id,
        prompt: composed,
        cwd: effectiveCwd,
        model: safeModel,
        reasoningEffort: safeReasoning,
        ...(agentResumeCtx.isResuming && agentResumeCtx.resumeSessionId
          ? { resumeSessionId: agentResumeCtx.resumeSessionId }
          : {}),
        onReady: () => noteCliReadyAt(),
        onSession: () => noteSessionInitDoneAt(),
        onComplete: () => clearFirstOutputWatchdog(),
        send: (event, data) => {
          noteAgentActivity();
          if (event === 'agent') {
            sendAgentEvent(data);
            return;
          }
          if (event === 'error') {
            const failure = normalizeDeepSeekHarnessFailure(data);
            const { code, message } = failure;
            agentStreamError = message;
            agentStreamErrorObservedBeforeCancellation = !run.cancelRequested;
            acpFatalErrorObservedBeforeCancellation = !run.cancelRequested;
            run.runtimeFailureObservedBeforeCancellation = !run.cancelRequested;
            agentStdoutTail = `${agentStdoutTail}\n${code}`.slice(-2000);
            if (
              agentResumeCtx.isResuming &&
              !run.resumeAutoReseeded &&
              /^DSH_PROFILE_RESUME_(?:REJECTED|MISMATCH)$/.test(code)
            ) {
              design.runs.emit(run, 'diagnostic', {
                type: 'agent_resume_failed_suppressed',
                agent_id: def.id,
                reason: 'resume_failed',
                previous_session_id: agentResumeCtx.resumeSessionId ?? null,
              });
              return;
            }
            if (!run.cancelRequested) {
              send('error', createSseErrorPayload(code, message, {
                retryable:
                  failure.authRequired || code === 'DSH_PROFILE_RESUME_REJECTED',
              }));
            }
            return;
          }
          send(event, data);
        },
      });
    } else if (def.streamFormat === 'json-event-stream') {
      // Pipe through sendAgentEvent so the OpenCode `type:'error'` frame
      // (now emitted as a real error event by json-event-stream.ts after
      // #691) actually triggers `agentStreamError` instead of being
      // forwarded as a no-op `agent` SSE event. This also wires the
      // substantive-output tracking the close handler reads below.
      trackingSubstantiveOutput = true;
      const handler = createJsonEventStreamHandler(
        def.eventParser || def.id,
        sendAgentEvent,
        def.id === 'opencode'
          ? {
              openCodeChildEvidence: {
                cliVersion:
                  run.preflightAgentCliVersion
                  ?? getDetectedRuntimeVersions(def.id)?.agentCliVersion
                  ?? '',
                onCandidate: (candidate) => sendAgentEvent({
                  type: 'diagnostic',
                  name: 'opencode_child_task_candidate',
                  ...candidate,
                }),
              },
            }
          : {},
      );
      jsonEventStreamHandler = handler;
      child.stdout.on('data', (chunk) => handler.feed(chunk));
      child.on('close', (code, signal) => {
        handler.flush();
        publishRuntimeChildEvidenceCoverage(handler.childEvidenceCoverage(
          code === 0 && signal === null && !run.cancelRequested && !agentStreamError,
        ));
      });
    } else if (def.id === 'antigravity') {
      // Buffer stdout until close so the auth-prompt guard can suppress
      // the OAuth URL before forwarding it to the client as assistant
      // text. agy exits 0 after printing the auth URL on stdout, so the
      // chunks would otherwise arrive before the close-time classifier
      // detects them as an auth prompt. First-token timing is deliberately
      // NOT stamped here — only the first chunk's arrival time is recorded,
      // and `firstTokenAt` is stamped from it at flush time so the
      // suppressed OAuth-prompt path never reports a TTFT (PR #3412).
      child.stdout.on('data', (chunk) => {
        noteAgentActivity();
        const receivedAt = Date.now();
        if (firstBufferedStdoutAt === null) firstBufferedStdoutAt = receivedAt;
        plaintextStdoutBuffer.push({ text: String(chunk), receivedAt });
      });
    } else {
      // Plain / BYOK mode: guard raw stdout chunks (#3247).
      child.stdout.on('data', (chunk) => {
        noteAgentActivity();
        const text = typeof chunk === 'string' ? chunk : String(chunk);
        // First non-empty stdout chunk = CLI ready for the plain family
        // (#3408 §4 marker). A plain adapter has no structured preamble, so
        // this typically coincides with its first model output.
        if (text.length > 0) noteCliReadyAt();
        const strippedText = visibleStdoutControlStripper.write(text);
        const visibleText = titleMarkerStripper.strip(strippedText);
        const safe = guardTextDelta(visibleText);
        if (safe.length > 0) {
          noteFirstTokenAt();
          send('stdout', { chunk: safe });
        }
        if (runGuard.contaminated && !runWarned) {
          runWarned = true;
          const warn = runGuard.warningEvent();
          if (warn) {
            send('agent', warn);
            abortForRoleMarker(warn.marker);
          }
        }
      });
    }
    // Wire the acpSession onto the run so cancel() can call abort()
    // instead of raw SIGTERM (applies to pi-rpc and acp-json-rpc).
    run.acpSession = acpSession;
    child.stderr.on('data', (chunk) => {
      noteAgentActivity();
      emitVisibleAgentStderr(chunk);
    });

    // A retry reuses the same run object but replaces run.child. Treat that
    // exact child identity as the attempt generation token: once ownership has
    // moved, this attempt may still receive a late error/close event, but it
    // must not emit errors, unregister the new sink, or make a terminal retry
    // decision for the new attempt.
    const attemptStillOwnsRun = () => run.child === child;
    const finishCanceledIfRequested = (
      code: number | null,
      signal: NodeJS.Signals | null,
    ): boolean => {
      if (!run.cancelRequested) return false;
      if (!design.runs.isTerminal(run.status)) {
        // Harness has already durably established the session by the time its
        // validated `session` frame reaches `capturedSessionId`. Preserve that
        // handle when the user cancels the current process so a later OD run
        // can cold-resume the same conversation. Keep this scoped to the
        // profile-stdio contract: other capture-style CLIs do not promise that
        // a session interrupted mid-turn is safe to continue.
        if (def.resumesSessionViaProfileStdio === true && capturedSessionId) {
          try {
            persistDeliveredAgentSessionState();
          } catch (err) {
            console.warn('[sessions] canceled profile session persistence failed', err);
          }
        }
        markRpcCloseReason('cancel_requested');
        finishWithRetryDecision('canceled', code, signal);
      }
      return true;
    };

    child.on('error', (err) => {
      clearInactivityWatchdog();
      clearFirstOutputWatchdog();
      cleanupPromptFile();
      flushVisibleAgentStderr();
      revokeToolToken('child_exit');
      if (!attemptStillOwnsRun()) return;
      unregisterChatAgentEventSink();
      if (finishCanceledIfRequested(1, null)) return;
      send('error', createSseErrorPayload('AGENT_EXECUTION_FAILED', err.message));
      finishWithRetryDecision('failed', 1, null);
    });
    child.on('close', async (code, signal) => {
      try {
      clearInactivityWatchdog();
      clearFirstOutputWatchdog();
      clearForcedChildShutdown();
      flushVisibleAgentStderr();
      if (!attemptStillOwnsRun() || watchdogRetryRestarted) {
        // Finalization and event-sink / run-handle ownership (keyed by the
        // shared runId) now belong to another retry generation, so this
        // child's late close must not re-run them.
        // Revoke only THIS attempt's tool token (idempotent, keyed by its own
        // token string) and bail; the `finally` block still cleans up logs.
        revokeToolToken('child_exit');
        return;
      }
      revokeToolToken('child_exit');
      unregisterChatAgentEventSink();
      if (
        def.id === 'codex' &&
        strategyTaskAtStart &&
        capturedSessionId &&
        typeof spawnedAgentEnv?.CODEX_HOME === 'string'
      ) {
        const mapping = strategyTaskAtStart.runs.find((candidate) => (
          candidate.runId === run.id
        ));
        if (mapping) {
          try {
            const childEvidence = await collectCodexChildEvidence({
              codexHome: spawnedAgentEnv.CODEX_HOME,
              parentSessionId: capturedSessionId,
              taskExecutionId: strategyTaskAtStart.taskExecutionId,
              runId: run.id,
              taskRunIndex: mapping.taskRunIndex,
              stage: mapping.inputStage,
              parentObservationId: strategyTaskRunObservationId(
                strategyTaskAtStart.taskExecutionId,
                run.id,
              ),
              ...(run.preflightAgentCliVersion
                ? { agentCliVersion: run.preflightAgentCliVersion }
                : {}),
              runStartedAtMs: run.createdAt,
              runEndedAtMs: Date.now(),
            });
            for (const observation of childEvidence.observations) {
              sendAgentEvent({
                type: 'diagnostic',
                name: 'normalized_agent_observation_v1',
                observation,
              });
            }
            // The adapter owns this figure: Codex identifies a Child
            // observation per (session, turn), so deriving the count from
            // observation ids here reported one re-invoked Child once per
            // invocation, which no other runtime does.
            const { knownChildCount } = childEvidence;
            sendAgentEvent({
              type: 'diagnostic',
              name: 'child_evidence_coverage_v1',
              coverage: {
                availability: childEvidence.availability,
                source: childEvidence.source,
                knownChildCount,
                explicitZero: childEvidence.availability === 'complete' && knownChildCount === 0,
                limitations: childEvidence.limitations,
                diagnosticCounts: childEvidence.diagnostics,
              },
            });
          } catch (error) {
            console.warn('[observability] Codex child evidence unavailable', String(error));
            sendAgentEvent({
              type: 'diagnostic',
              name: 'child_evidence_coverage_v1',
              coverage: {
                availability: 'unavailable',
                source: 'codex_rollout',
                knownChildCount: 0,
                explicitZero: false,
                limitations: ['codex_child_evidence_collection_failed'],
                diagnosticCounts: [{ code: 'collector_exception', count: 1 }],
              },
            });
          }
        }
      }
      // Native OpenCode filters child-session events out of the root JSON
      // stream, so the live stream can only produce a terminal-only L1
      // candidate — which fails the evidence graph on `child_started_missing`
      // and refuses every COMPLEX task on this runtime. `opencode export
      // --sanitize` is the only surface that pairs a child's `parentID` with
      // its own transcript, and it can only be read once the child has exited.
      // Any failure here publishes nothing, leaving the L1 candidate in place.
      if (def.id === 'opencode' && strategyTaskAtStart) {
        const launchPath = agentLaunch.launchPath;
        const candidates = jsonEventStreamHandler?.childEvidenceCandidates() ?? [];
        if (launchPath && spawnedAgentEnv && candidates.length > 0) {
          try {
            const facts = await collectOpenCodeChildEvidenceFacts({
              candidates,
              loadSanitizedExport: createOpenCodeSanitizedExportLoader({
                launchPath,
                env: spawnedAgentEnv,
              }),
            });
            for (const fact of facts) {
              sendAgentEvent({
                type: 'diagnostic',
                name: 'opencode_child_runtime_fact',
                ...fact,
              });
            }
          } catch (error) {
            console.warn('[observability] OpenCode child export unavailable', String(error));
          }
        }
      }

      // Resume-target-missing recovery runs BEFORE the generic fatal/stream-error
      // short-circuits. The signal arrives differently per adapter: codex reports
      // "no rollout found for thread id" as a stream `error` event, while AMR/vela
      // reports a structured `resume_failed` JSON-RPC error that the ACP bridge
      // turns into a FATAL. Either would otherwise be swallowed by the
      // `fatal_rpc_error` / `stream_error` paths below and leave the dead session
      // id stored — so every later turn would retry the same broken resume (#4275
      // class). Clearing the stale handle here lets the next turn start fresh +
      // re-seed the full transcript: one cold turn, never a broken conversation.
      if (
        !run.cancelRequested &&
        (runtimeResumesSessionById(def) || def.resumesSessionViaAcpLoad === true) &&
        run.conversationId &&
        resolveAgentResumeFailurePolicy({
          agentId: def.id,
          stderr: agentStderrTail,
          stdout: agentStdoutTail,
          isResuming: agentResumePromptPolicy.skipTranscript,
          resumeSessionId: agentResumePromptPolicy.resumeSessionId,
        }).autoReseedFullTranscript
      ) {
        if (strategyTaskAtStart && strategyTaskAtStart.inputStage !== 'request') {
          const blocked = blockAutomaticContinuation(db, { runId: run.id });
          if (blocked) run.strategyTask = projectStrategyTask(blocked, run.id);
          latchOdNextRolloutForRun(run, 'observe', 'native_resume_failed');
          send('error', createSseErrorPayload(
            'AGENT_SESSION_RESUME_FAILED',
            'The locked OD Next native session is unavailable; the task was blocked without cold re-seeding.',
            { retryable: false },
          ));
          return finishWithRetryDecision('failed', code ?? 1, signal ?? null);
        }
        // The resumed upstream session is gone (expired / pruned). Clear the dead
        // handle and TRANSPARENTLY re-run this same turn with a fresh session +
        // the full transcript rebuilt from the DB — exactly the pre-session-reuse
        // path. The user sees one (slightly slower) turn, never an error or a
        // "resend" prompt. Re-spawn reuses the same-run retry machinery; because
        // the session row is now cleared, the re-spawn resolves isResuming=false
        // (fresh session, full transcript), so it CANNOT resume-fail again — the
        // `resumeAutoReseeded` guard is belt-and-suspenders against any loop.
        clearAgentSession(db, run.conversationId, def.id);
        if (!run.resumeAutoReseeded) {
          run.resumeAutoReseeded = true;
          run.resumeAutoReseededFrom = agentResumePromptPolicy.resumeSessionId ?? null;
          run.nativeSessionRecovery = markNativeSessionAutoReseeded({
            previous: run.nativeSessionRecovery,
            agentId: def.id,
            previousSessionId: agentResumePromptPolicy.resumeSessionId,
          });
          publishNativeSessionRecoveryMetadata();
          // Persisted to the per-run events.jsonl that the help → diagnostics
          // export bundles, so the whole resume → fail → auto-reseed chain is
          // visible in a support bundle without any user-facing signal.
          design.runs.emit(run, 'diagnostic', {
            type: 'agent_resume_auto_reseed',
            agent_id: def.id,
            reason: 'resume_failed',
            previous_session_id: agentResumePromptPolicy.resumeSessionId ?? null,
            stale_session_cleared: true,
            nativeSessionRecovery: run.nativeSessionRecovery,
          });
          scheduleRetryRestart(0);
          return;
        }
        // Unreachable in practice (the reseed runs fresh); if a second resume
        // failure ever surfaces in one run, fall back to the explicit affordance.
        send('error', createSseErrorPayload(
          'AGENT_EXECUTION_FAILED',
          'The previous session could not be resumed (it may have expired). Resend your message to continue with a fresh session.',
          { retryable: true },
        ));
        return finishStrategyAwarePhysicalRun('failed', code ?? 1, signal ?? null);
      }
      if (acpFatalErrorObservedBeforeCancellation && acpSession?.hasFatalError()) {
        markRpcCloseReason('fatal_rpc_error');
        return finishWithRetryDecision('failed', code ?? 1, signal ?? null);
      }
      parseBufferedAntigravityGeminiJsonEventStream();
      flushAgentTitleMarkerBuffer();
      if (agentStreamErrorObservedBeforeCancellation && agentStreamError) {
        markRpcCloseReason('stream_error');
        return finishWithRetryDecision('failed', code === 0 ? 1 : (code ?? 1), signal ?? null);
      }
      if (
        code !== 0 &&
        !run.cancelRequested
      ) {
        if (def.id === 'amr') {
          const amrFailure = classifyAmrAccountFailureSignal({
            stdoutTail: agentStdoutTail,
            stderrTail: agentStderrTail,
          });
          if (amrFailure) {
            sendAmrAccountFailure(amrFailure);
            return finishWithRetryDecision('failed', code ?? 1, signal ?? null);
          }
        }
        const authFailure = classifyAgentAuthFailure(
          agentId,
          `${agentStderrTail}\n${agentStdoutTail}`,
        );
        if (authFailure?.status === 'missing') {
          send('error', createSseErrorPayload(
            'AGENT_AUTH_REQUIRED',
            authFailure.message ?? cursorAuthGuidance(),
            { retryable: true },
          ));
          return finishWithRetryDecision('failed', code ?? 1, signal ?? null);
        }
      }
      // Empty-output guard: a clean `code === 0` exit with no visible
      // output means the run silently finished without producing anything.
      // Surface an explicit failure so the chat shows a clear reason.
      if (
        code === 0 &&
        !run.cancelRequested &&
        trackingSubstantiveOutput &&
        !agentProducedOutput
      ) {
        markRpcCloseReason('empty_output');
        send('error', createSseErrorPayload(
          'AGENT_EXECUTION_FAILED',
          'Agent completed without producing any output. The model or provider may have returned an empty response. Check the agent logs for upstream errors, then try re-authenticating the agent or switching models.',
          { retryable: true },
        ));
        return finishWithRetryDecision('failed', code, signal);
      }
      if (
        code === 0 &&
        !run.cancelRequested &&
        isPluginAuthoringRun(db, run, getSnapshot) &&
        !(await hasGeneratedPluginArtifacts(cwd)) &&
        !emittedRenderableQuestionForm(clarifyingQuestionText)
      ) {
        send('error', createSseErrorPayload(
          'AGENT_EXECUTION_FAILED',
          'Plugin authoring ended before generating the required generated-plugin artifacts.',
          { retryable: true },
        ));
        return finishWithRetryDecision('failed', code, signal);
      }
      // Plain-stream auth-failure guard: plain adapters (today
      // antigravity, deepseek's TUI variants) may exit cleanly with
      // visible stdout that's actually an auth prompt — agy prints
      // "Authentication required. Please visit the URL to log in:
      // <URL>" + "Error: authentication timed out." rather than
      // failing with a non-zero exit. Without this guard the chat
      // shows that raw prompt as the agent's "reply", and the user
      // has no way to actually complete OAuth from inside the chat.
      // Override the apparent success with a proper
      // AGENT_AUTH_REQUIRED error carrying actionable guidance.
      if (
        code === 0 &&
        !run.cancelRequested &&
        !trackingSubstantiveOutput &&
        childStdoutSeen
      ) {
        const authFailure = classifyAgentAuthFailure(
          agentId,
          `${agentStderrTail}\n${agentStdoutTail}`,
        );
        if (authFailure?.status === 'missing') {
          send('error', createSseErrorPayload(
            'AGENT_AUTH_REQUIRED',
            authFailure.message ?? `${def.name} authentication required. Please re-authenticate and retry.`,
            { retryable: true },
          ));
          return finishWithRetryDecision('failed', 0, signal);
        }
      }
      // Plain-stream empty-output guard: plain agents send raw stdout
      // chunks without structured event tracking. Detect auth failures
      // and quota / upstream errors when exit 0 but no stdout was
      // seen. agy in print mode is silent on stdout/stderr for both
      // missing-auth AND quota-exhausted failures; the daemon piped
      // agy's `--log-file` to `agentLogFilePath` precisely so this
      // guard can grep the upstream error code (RESOURCE_EXHAUSTED 429
      // for quota, "not logged into Antigravity" for auth) and route
      // to the right user-facing guidance.
      if (
        code === 0 &&
        !run.cancelRequested &&
        !trackingSubstantiveOutput &&
        !childStdoutSeen
      ) {
        markRpcCloseReason('empty_output');
        let combinedDetail = `${agentStderrTail}\n${agentStdoutTail}`;
        if (def.id === 'antigravity' && agentLogFilePath) {
          try {
            const logContent = await fs.promises.readFile(agentLogFilePath, 'utf8');
            // Keep the last 8 KB — quota / auth lines all land near the
            // tail (after the spawn / model-config preamble).
            combinedDetail = `${combinedDetail}\n${logContent.slice(-8192)}`;
          } catch {
            // Missing log file (agy didn't write it, mounted tmpfs is
            // read-only, etc.) is fine — fall through to the generic
            // empty-output message.
          }
        }
        const authFailure = classifyAgentAuthFailure(agentId, combinedDetail);
        const serviceFailure = !authFailure
          ? classifyAgentServiceFailure(combinedDetail)
          : null;
        const isAntigravityQuota =
          def.id === 'antigravity' && serviceFailure === 'RATE_LIMITED';
        // Antigravity-only fallback: if neither classifier matched but
        // the run was silent, lean on the empirical observation that
        // an empty agy print-mode exit almost always means
        // missing-OAuth (the only other silent path is quota, which
        // the log-file check above already caught).
        const useAntigravityAuthFallback =
          !authFailure && !serviceFailure && def.id === 'antigravity';
        const errorCode =
          authFailure || useAntigravityAuthFallback
            ? 'AGENT_AUTH_REQUIRED'
            : isAntigravityQuota
              ? 'RATE_LIMITED'
              : 'AGENT_EXECUTION_FAILED';
        const msg = authFailure
          ? authFailure.message ?? `${def.name} authentication expired. Please re-authenticate and retry.`
          : isAntigravityQuota
            ? antigravityQuotaGuidance()
            : useAntigravityAuthFallback
              ? antigravityAuthGuidance()
              : `${def.name} returned an empty response. This may indicate an expired session — try re-authenticating the agent.`;
        send('error', createSseErrorPayload(
          errorCode,
          msg,
          { retryable: true },
        ));
        return finishWithRetryDecision('failed', 0, signal);
      }
      // ACP agents that don't shut down on stdin.end() (e.g. Devin for
      // Terminal) are forced to exit via SIGTERM from attachAcpSession after
      // a clean prompt completion. Without an override, the chat run would
      // be marked `failed` because `code === 0` fails (code is null on a
      // signal exit). `completedSuccessfully()` reports whether the ACP
      // session resolved without a fatal error or abort.
      //
      // Scope the override narrowly to the exact forced-shutdown shape this
      // PR introduces: code is null AND signal is SIGTERM AND the ACP
      // session reported clean completion. Any other post-response failure
      // (non-zero exit code, SIGKILL, SIGSEGV, etc.) still propagates as
      // `failed`, preserving the existing close-status behavior for genuine
      // post-response process problems.
      const acpCleanCompletion =
        typeof acpSession?.completedSuccessfully === 'function' &&
        acpSession.completedSuccessfully();
      const runArtifactSideEffects = runSideEffectsForRun(run);
      const status = classifyChatRunCloseStatus({
        cancelRequested: !!run.cancelRequested,
        code,
        signal,
        acpCleanCompletion,
        artifactQuietShutdownRequested,
        turnCompletedCleanly: !!run.turnCompletedCleanly,
        artifactProducedThisRun:
          runArtifactSideEffects.artifactWriteSeen ||
          runArtifactSideEffects.liveArtifactSeen,
      });
      // Skip the close-handler failure emit when the run is already
      // terminal: the inactivity watchdog (failForInactivity) finishes the
      // run — sending its error and clearing run.clients/eventsLogStream —
      // before SIGTERM, so re-emitting here would double-send the error and
      // reopen the closed events-log stream. The run is finalized below
      // regardless (finish() no-ops once terminal).
      if (status === 'failed' && !design.runs.isTerminal(run.status)) {
        const diagnostic = diagnoseClaudeCliFailure({
          agentId: def.id,
          exitCode: code,
          signal,
          stderrTail: agentStderrTail,
          stdoutTail: agentStdoutTail,
          env: spawnedAgentEnv,
          resolvedBin: agentLaunch.selectedPath,
        });
        // A non-zero exit whose output reads as an auth / quota / upstream
        // problem (typical of Claude Code, codex, …) gets the specific code
        // rather than the generic execution-failed bucket; the human-readable
        // message still prefers the richer CLI diagnostic when we have one.
        const serviceCode = classifyAgentServiceFailure(
          `${agentStderrTail}\n${agentStdoutTail}`,
        );
        if (diagnostic) {
          send('error', createSseErrorPayload(
            // A diagnostic that named its own failure class (e.g.
            // AGENT_CONNECTION_DROPPED) wins over the generic service-failure
            // sniff so the UI can localize by code and triage can count it.
            diagnostic.code ?? serviceCode ?? 'AGENT_EXECUTION_FAILED',
            diagnostic.message,
            { retryable: diagnostic.retryable, details: { detail: diagnostic.detail } },
          ));
        } else if (serviceCode) {
          const detail = (agentStderrTail || agentStdoutTail || '').trim();
          send('error', createSseErrorPayload(
            serviceCode,
            detail || 'The model service returned an error.',
            { retryable: true },
          ));
        } else {
          // OpenCode swallows provider failures in headless mode: a 429
          // usage-limit is marked retryable and retried silently with
          // nothing on stdout/stderr, so the run only dies via the
          // inactivity watchdog and the checks above find no signal. The
          // real reason is recorded only in OpenCode's own session log,
          // so recover it before falling back to the generic rewrite.
          // See issue #982.
          const openCodeFailure =
            def.id === 'opencode'
              ? readOpenCodeServiceFailure(spawnedAgentEnv, { since: run.createdAt })
              : null;
          if (openCodeFailure) {
            send('error', createSseErrorPayload(
              openCodeFailure.code,
              openCodeFailure.message,
              { retryable: openCodeFailure.retryable },
            ));
          } else {
            const rewritten = rewriteKnownAgentStreamError(
              def.id,
              (agentStderrTail || agentStdoutTail || '').trim(),
              `${agentStderrTail}\n${agentStdoutTail}`,
            );
            if (rewritten !== 'Agent stream error') {
              send('error', withAcpHandshakeFailureGuidance(
                createSseErrorPayload(
                  'AGENT_EXECUTION_FAILED',
                  rewritten,
                  { retryable: true },
                ),
                agentFailureIdentity(def),
              ));
            }
          }
        }
      }
      // Reconcile any HTML artifacts that were written during this run
      // without a manifest sidecar (e.g. agent used write_file instead of
      // create_artifact, or the run terminated between HTML write and
      // sidecar write). Only files modified after the run started are
      // touched — pre-existing HTML in imported-folder projects must not
      // receive spurious manifests. Best-effort; must not block finalisation.
      // See issue #2893.
      if (run.projectId) {
        (async () => {
          try {
            const project = getProject(db, run.projectId);
            const files = await listFiles(PROJECTS_DIR, run.projectId, {
              metadata: project?.metadata,
            });
            const dir = resolveProjectDir(PROJECTS_DIR, run.projectId, project?.metadata);
            for (const f of files) {
              const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
              if (ext !== '.html' && ext !== '.htm') continue;
              try {
                const filePath = path.join(dir, f.name);
                const st = await fs.promises.stat(filePath);
                if (!isRunTouchedProjectFile(st.mtimeMs, runStartTimeMs)) continue;
                await reconcileHtmlArtifactManifest(
                  PROJECTS_DIR,
                  run.projectId,
                  f.name,
                  project?.metadata,
                );
              } catch { /* per-file best-effort */ }
            }
          } catch { /* project-level best-effort */ }
        })();
      }
      // Flush buffered plain-text stdout (antigravity) that was not
      // suppressed by the auth-prompt guard above. Send each chunk in
      // order before finishing so the assistant text arrives before the
      // run's `finished` event. Stamp first-token timing here — and only
      // here — using the first chunk's arrival time, so the OAuth-prompt
      // path (which returns before this flush) never records a TTFT for
      // output the user never saw (PR #3412).
      if (plaintextStdoutBuffer.length > 0 && firstBufferedStdoutAt !== null) {
        noteFirstTokenAt(firstBufferedStdoutAt);
      }
      for (const chunk of plaintextStdoutBuffer) {
        const strippedText = visibleStdoutControlStripper.write(chunk.text);
        const visibleText = titleMarkerStripper.strip(strippedText);
        if (visibleText) send('stdout', { chunk: visibleText });
      }
      const flushedControlText = visibleStdoutControlStripper.flush();
      const flushedTitleMarkerText =
        titleMarkerStripper.strip(flushedControlText) + titleMarkerStripper.flush();
      if (flushedTitleMarkerText) send('stdout', { chunk: flushedTitleMarkerText });
      if (
        status === 'succeeded' &&
        (def.streamFormat ?? 'plain') === 'plain' &&
        run.projectId
      ) {
        // Reconstruct the agent's stdout for artifact extraction from two
        // truncation-complementary windows over the SAME underlying stream:
        //   - head: `run.plainArtifactStdout`, the FIRST CAP bytes (bounded), and
        //   - tail: run.events, the LAST 2000 events.
        // Using stream offsets (total byte count) we stitch them into a single
        // continuous string at their exact seam, then extract ONCE. This is
        // correct by construction:
        //   - not truncated  -> head == whole stream (or tail == whole stream);
        //   - overlapping    -> seam removes the double-covered span, so the
        //                        same artifact is never counted twice AND two
        //                        distinct artifacts that share a body are both
        //                        kept (no value-level dedup);
        //   - a true gap (a run with both >CAP early bytes AND >2000 later
        //     events whose tail does not reach back to CAP) -> extract each
        //     window separately and concatenate the artifact lists. The windows
        //     do not overlap there, so there are no duplicate occurrences; only
        //     an artifact buried entirely in the un-covered middle is lost, which
        //     was already unrecoverable before this change (the old code only
        //     ever had the tail).
        const head = run.plainArtifactStdout ?? '';
        const tail = plainStdoutFromRunEvents(run.events);
        const totalBytes = run.plainStdoutTotalBytes ?? head.length;
        const tailStart = Math.max(0, totalBytes - tail.length);
        let plainArtifacts: ReturnType<typeof extractPlainStreamArtifacts>;
        if (head.length === 0) {
          plainArtifacts = extractPlainStreamArtifacts(tail);
        } else if (tailStart <= head.length) {
          // Overlap or contiguous: splice tail on at the seam and extract once.
          const stitched = head + tail.slice(head.length - tailStart);
          plainArtifacts = extractPlainStreamArtifacts(stitched);
        } else {
          // Gap: no overlap, so extracting each window and concatenating cannot
          // produce a duplicate occurrence or a false cross-gap artifact.
          plainArtifacts = [
            ...extractPlainStreamArtifacts(head),
            ...extractPlainStreamArtifacts(tail),
          ];
        }
        if (plainArtifacts.length > 0) {
          try {
            const project = getProject(db, run.projectId);
            const persistedPlainArtifacts = await persistPlainStreamArtifactList({
              projectsRoot: PROJECTS_DIR,
              projectId: run.projectId,
              artifacts: plainArtifacts,
              metadata: project?.metadata,
              writeProjectFile,
            });
            if (persistedPlainArtifacts.length > 0) {
              for (const artifact of persistedPlainArtifacts) {
                send('agent', {
                  type: 'artifact',
                  source: 'plain-stream',
                  name: artifact.name,
                  path: artifact.name,
                  identifier: artifact.identifier,
                  artifactType: artifact.artifactType,
                });
              }
              send('agent', {
                type: 'diagnostic',
                name: 'plain_stream_artifacts_persisted',
                source: 'daemon-run-finalize',
                fileCount: persistedPlainArtifacts.length,
                files: persistedPlainArtifacts.map((artifact) => artifact.name),
              });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const failureMessage = `Failed to persist plain-stream artifact(s): ${message}`;
            console.warn(`[plain-stream] failed to persist stdout artifact(s): ${message}`);
            send('agent', {
              type: 'diagnostic',
              name: 'plain_stream_artifacts_persist_failed',
              source: 'daemon-run-finalize',
              message,
            });
            send('error', createSseErrorPayload(
              'AGENT_EXECUTION_FAILED',
              failureMessage,
            ));
            return finishWithRetryDecision('failed', 1, null);
          }
        }
      }
      // Capture the pi session file path for conversational continuity.
      // The session path is discovered by attachPiRpcSession when it
      // processes agent_end; persist it under (conversationId, agentId) so
      // another conversation in the same cwd cannot inherit this history.
      if (acpSession && typeof acpSession.getLastSessionPath === 'function') {
        const sessionPath = acpSession.getLastSessionPath();
        if (status === 'succeeded' && def.streamFormat === 'pi-rpc') {
          persistCapturedAgentSession(db, {
            conversationId: run.conversationId,
            agentId: def.id,
            sessionId: sessionPath,
            stablePromptHash: currentStableHash,
            stablePromptSections: currentStableSectionsJson,
            model: safeModel ?? null,
            cwd: effectiveCwd,
            lastMessageId: run.assistantMessageId ?? null,
          });
          run.nativeSessionRecovery = markNativeSessionCaptured({
            previous: run.nativeSessionRecovery,
            agentId: def.id,
            sessionId: sessionPath,
            resumed: agentResumeCtx.isResuming,
          });
          publishNativeSessionRecoveryMetadata();
        }
      }
      // ACP session/load adapters (AMR/vela) report a durable upstream handle
      // from the ACP session; persist it (under the resume-identity guard) so
      // the next turn resumes via session/load. A missing handle clears the row
      // (so a fresh session is opened next turn), mirroring the capture-style
      // adapters.
      if (
        def.resumesSessionViaAcpLoad === true &&
        status === 'succeeded' &&
        acpSession &&
        typeof acpSession.getDurableSessionId === 'function'
      ) {
        persistCapturedAgentSession(db, {
          conversationId: run.conversationId,
          agentId: def.id,
          sessionId: acpSession.getDurableSessionId(),
          stablePromptHash: currentStableHash,
          stablePromptSections: currentStableSectionsJson,
          model: safeModel ?? null,
          cwd: effectiveCwd,
          lastMessageId: run.assistantMessageId ?? null,
        });
        run.nativeSessionRecovery = markNativeSessionCaptured({
          previous: run.nativeSessionRecovery,
          agentId: def.id,
          sessionId: acpSession.getDurableSessionId(),
          resumed: agentResumeCtx.isResuming,
        });
        publishNativeSessionRecoveryMetadata();
      }
      if (status === 'succeeded') {
        if (strategyProtocol && !strategyProtocolResult) {
          strategyProtocolResult = strategyProtocol.finish();
          const tail = strategyProtocolResult.visibleText.slice(strategyVisibleEmitted.length);
          if (tail) {
            const tailEvent = def.streamFormat === 'plain' ? 'stdout' : 'agent';
            const tailData = tailEvent === 'stdout'
              ? { chunk: tail }
              : { type: 'text_delta', delta: tail };
            // The protocol withholds any text that might still turn out to be
            // a reserved `<open-design-…>` block; `finish()` is what finally
            // rules that out, so this tail is the first moment those bytes are
            // user-visible. It cannot go back through `send` — `push` throws
            // once the protocol is finished — so it applies the same visible
            // output rule here. For a reply whose visible text was withheld in
            // its entirety this is the ONLY thing the run ever puts on screen;
            // without the mark the run reports no visible output at all and
            // the analytics fallback collapses a real close-time wait back to
            // `firstTokenAt`.
            recordRunTelemetry('strategy close-time tail', () => {
              applyVisibleOutputMarks(
                runLifecycleMarkersForStreamEvent(tailEvent, tailData),
              );
            });
            persistRunEventToAssistantMessage(db, run, tailEvent, tailData);
            design.runs.emit(run, tailEvent, tailData);
            strategyVisibleEmitted += tail;
          }
        }
        try {
          await snapshotAiHtmlVersionsBeforeSuccess();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const details = err instanceof AiHtmlVersionSnapshotError
            ? { failures: err.failures }
            : undefined;
          send('error', createSseErrorPayload(
            'HTML_VERSION_SNAPSHOT_FAILED',
            message,
            {
              retryable: false,
              ...(details ? { details } : {}),
            },
          ));
          finishStrategyAwarePhysicalRun('failed', 1, signal);
          return;
        }
        try {
          persistDeliveredAgentSessionState();
        } catch (err) {
          console.warn('[sessions] delivered session persistence failed', err);
        }
        let deliverableValid = false;
        // A turn that emitted no Runtime State can still have delivered. The
        // coordinator may only infer that Direct Edit completion from verified
        // physical delivery, so resolve the evidence here too — otherwise the
        // inference has nothing to accept and correct work is discarded.
        const mayInferDirectEditCompletion = Boolean(
          strategyTaskAtStart
          && (
            odNextTurnMayInferDirectEditCompletion(
              strategyTaskAtStart,
              strategyProtocolResult,
            )
            || odNextTurnMayInferProductionCompletion(
              strategyTaskAtStart,
              strategyProtocolResult,
            )
          ),
        );
        if (
          strategyTaskAtStart
          && (
            strategyProtocolResult?.runtimeState?.outcome === 'completed'
            || mayInferDirectEditCompletion
          )
        ) {
          const deliverable = await validateRunDeliverable({
            projectsRoot: PROJECTS_DIR,
            projectId: run.projectId ?? null,
            projectMetadata: projectRecord?.metadata,
            runStatus: 'succeeded',
            artifactCount: Number.isFinite(run.artifactCount) ? run.artifactCount : 0,
            ...(Array.isArray(run.artifactPaths) ? { touchedPaths: run.artifactPaths } : {}),
          });
          design.runs.setDeliverableValidation?.(run, deliverable);
          deliverableValid = deliverable.valid;
          // Observation only (this branch has no repair loop): did a phone-app
          // prototype actually ship inside the staged handset shell? Feeds
          // run_finished analytics so the rollout can measure shell adoption.
          if (
            deliverable.valid
            && projectRecord?.metadata?.kind === 'prototype'
            && typeof run.projectId === 'string'
          ) {
            try {
              const observation = await observeOdNextDeviceShell({
                projectRoot: resolveProjectDir(PROJECTS_DIR, run.projectId, projectRecord.metadata),
                entryFile: deliverable.entryFile,
                resolution: resolveOdNextDevicePlatform({
                  metadata: projectRecord.metadata,
                  textPlatform: typeof run.conversationId === 'string' && run.conversationId
                    ? readConversationIntentSignals(db, run.conversationId).devicePlatform
                    : null,
                }),
              });
              if (observation) {
                run.odNextDeviceShell = observation;
                console.info('[od-next-device-shell]', {
                  runId: run.id,
                  platform: observation.platform,
                  resolvedFrom: observation.resolvedFrom,
                  entryFile: observation.entryFile,
                  shellPresent: observation.shellPresent,
                });
              }
              const primitives = await observeOdNextLayoutPrimitives({
                projectRoot: resolveProjectDir(PROJECTS_DIR, run.projectId, projectRecord.metadata),
                entryFile: deliverable.entryFile,
                primitivesCss: typeof run.appliedPluginSnapshotId === 'string'
                  ? selectOdNextLayoutPrimitivesCss(await loadOdNextTaskResourcesForSnapshot({
                      bundledPluginsDir: BUNDLED_PLUGINS_DIR,
                      snapshot: getSnapshot(db, run.appliedPluginSnapshotId),
                    }))
                  : null,
              });
              if (primitives) {
                run.odNextLayoutPrimitives = primitives.presence;
                console.info('[od-next-layout-primitives]', {
                  runId: run.id,
                  entryFile: primitives.entryFile,
                  presence: primitives.presence,
                });
              }
            } catch (err) {
              console.warn(
                `[od-next-device-shell] observation skipped: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          }
        }
        if (strategyTaskAtStart && strategyProtocolResult) {
          let automaticContinuationChatBody = null;
          const plan = strategyProtocolResult.planContract
            ?? strategyProtocolResult.repairPlanContract;
          let executionPreflight;
          let complexRuntimeEvidence;
          try {
            const lockedPlan = plan ?? strategyTaskAtStart.planContract;
            const evidence = await resolveAutomaticContinuationEvidence({
              plan: lockedPlan,
              phase: strategyProtocolResult.runtimeState?.outcome === 'completed'
                ? 'completion'
                : 'eligibility',
              task: strategyTaskAtStart,
              run,
              localSyntheticCanary: readOdNextRolloutPolicy().localSyntheticCanary
                && process.env.NODE_ENV !== 'production',
              executionPreflightResolver: odNextExecutionPreflightResolver,
              complexProductionResolver: odNextComplexProductionResolver,
              runtimeCapabilitySnapshot: chatBody.runtimeCapabilitySnapshot,
            });
            executionPreflight = evidence.executionPreflight;
            complexRuntimeEvidence = evidence.complexRuntimeEvidence;
          } catch (error) {
            if (run.cancelRequested || design.runs.isTerminal(run.status)) return;
            send('error', createSseErrorPayload(
              'OD_NEXT_EXECUTION_PREFLIGHT_FAILED',
              error instanceof Error ? error.message : String(error),
              { retryable: false },
            ));
            finishStrategyAwarePhysicalRun('failed', 1, signal);
            return;
          }
          // Cancellation can win while the daemon-owned resolver is awaiting
          // host facts. Never let the stale continuation allocate a new Run or
          // mutate the already-terminal task after that boundary.
          if (run.cancelRequested || design.runs.isTerminal(run.status)) return;
          let transition;
          try {
            transition = prepareAutomaticStrategyContinuation({
              db,
              service: internalRunCreation,
              task: strategyTaskAtStart,
              parsed: strategyProtocolResult,
              toolUseCount: strategyToolUseCount,
              ...(executionPreflight ? { executionPreflight } : {}),
              ...(complexRuntimeEvidence ? { complexRuntimeEvidence } : {}),
              ...(
                strategyProtocolResult.runtimeState?.outcome === 'completed'
                || mayInferDirectEditCompletion
                  ? {
                      completionEvidence: {
                        physicalStatus: 'succeeded',
                        deliverableValid,
                      },
                    }
                  : {}),
              createMeta: (stage, instruction, taskRunIndex) => {
                const identity = createHash('sha256')
                  .update(`${strategyTaskAtStart.taskExecutionId}:${stage}:${taskRunIndex}`)
                  .digest('hex');
                const meta = {
                  ...chatBody,
                  projectId: strategyTaskAtStart.projectId,
                  conversationId: strategyTaskAtStart.conversationId,
                  agentId: strategyTaskAtStart.selectedAgentId,
                  appliedPluginSnapshotId: strategyTaskAtStart.snapshotId,
                  pluginId: strategyTaskAtStart.strategyId,
                  assistantMessageId: `odnext_assistant_${identity.slice(0, 32)}`,
                  clientRequestId: `odnext_run_${identity.slice(0, 40)}`,
                  message: instruction,
                  currentPrompt: instruction,
                  titleGeneration: undefined,
                  userMessageId: undefined,
                  odNextTaskInputSnapshot:
                    run.odNextTaskInputSnapshot ?? chatBody.odNextTaskInputSnapshot ?? null,
                };
                automaticContinuationChatBody = {
                  ...meta,
                  requestFingerprint: createHash('sha256')
                    .update(JSON.stringify({
                      taskExecutionId: strategyTaskAtStart.taskExecutionId,
                      sourceRunId: run.id,
                      stage,
                      taskRunIndex,
                      instruction,
                      projectId: meta.projectId,
                      conversationId: meta.conversationId,
                      agentId: meta.agentId,
                      snapshotId: meta.appliedPluginSnapshotId,
                    }))
                    .digest('hex'),
                };
                return automaticContinuationChatBody;
              },
            });
          } catch (error) {
            if (run.cancelRequested || design.runs.isTerminal(run.status)) return;
            send('error', createSseErrorPayload(
              'OD_NEXT_CONTINUATION_FAILED',
              error instanceof Error ? error.message : String(error),
              { retryable: false },
            ));
            finishStrategyAwarePhysicalRun('failed', 1, signal);
            return;
          }
          run.strategyTask = projectStrategyTask(transition.result.task, run.id);
          if (transition.result.action === 'blocked') {
            const signal = rolloutStopSignalForBlockedContinuation(
              transition.result.reasonCodes,
            );
            const stopMode = signal ? stopModeForOdNextSignal(signal) : null;
            if (signal && stopMode) {
              latchOdNextRolloutForRun(run, stopMode, signal);
            }
          }
          if (transition.start && transition.prepared?.kind === 'ready') {
            const nextRun = transition.prepared.run;
            nextRun.strategyTask = projectStrategyTask(transition.result.task, nextRun.id);
            pendingStrategyContinuation = {
              run: nextRun,
              chatBody: automaticContinuationChatBody,
            };
          }
        }
      }
      const retried = finishWithRetryDecision(status, code, signal);
      if (!retried && pendingStrategyContinuation) {
        const continuation = pendingStrategyContinuation;
        // This turn is not over: the daemon is about to run the next stage of
        // the SAME logical task, with no user prompt of its own. Record the
        // hand-off on the source stream — it lands in the Run's event log,
        // which is where a multi-Run turn is reconstructed when diagnosing one.
        //
        // Observability only. Do NOT drive rendering from it: the client keeps
        // the turn whole through `strategyTaskRunIndex` (folded at render time),
        // and a consumer that re-pointed the existing message at `nextRunId`
        // instead would print the continuation's answer twice.
        const continuationTask = getStrategyTaskExecutionByRunId(db, continuation.run.id);
        design.runs.emit(run, 'diagnostic', {
          type: 'strategy_task_continuation',
          taskExecutionId: continuationTask?.taskExecutionId
            ?? strategyTaskAtStart?.taskExecutionId
            ?? null,
          sourceRunId: run.id,
          nextRunId: continuation.run.id,
          inputStage: continuationTask?.inputStage ?? null,
          taskRunIndex: continuationTask?.runs.length
            ? continuationTask.runs.length - 1
            : null,
        });
        reconcileAssistantMessageOnRunEnd(db, design.runs, continuation.run);
        internalRunCreation.start(continuation.run, async () => {
          try {
            return await startChatRun(continuation.chatBody, continuation.run);
          } catch (error) {
            reconcileStrategyTaskRunTerminal(db, {
              runId: continuation.run.id,
              status: 'failed',
            });
            const latestTask = getStrategyTaskExecutionByRunId(db, continuation.run.id);
            if (latestTask) {
              continuation.run.strategyTask = projectStrategyTask(
                latestTask,
                continuation.run.id,
              );
            }
            throw error;
          }
        });
      }
      } finally {
        // Best-effort cleanup of the per-run agy log file on every close
        // path — successful, failed, cancelled, or non-zero exit — so
        // /tmp doesn't accumulate one file per Antigravity run. The log
        // is read inside the empty-output guard above before this finally
        // runs, so the read always happens before the unlink.
        if (agentLogFilePath) {
          fs.promises.unlink(agentLogFilePath).catch(() => {});
        }
        cleanupPromptFile();
      }
    });
    if (writePromptToChildStdin && child.stdin) {
      const promptInputFormat = def.promptInputFormat ?? 'text';
      lifecycle.mark('model_call_start');
      lifecycle.mark('stdin_write_start');
      const markStdinWriteEnd = (err?: Error | null) => {
        if (err) return;
        lifecycle.mark('stdin_write_end');
      };
      if (promptInputFormat === 'stream-json') {
        // Wrap the prompt as an Anthropic user message and write it as one
        // JSONL line. Do NOT close stdin: claude-code keeps reading further
        // messages until EOF, which is what lets the daemon stream more user
        // messages into the same turn. The stdin is closed on a clean terminal
        // turn (see applyClaudeStreamJsonRunBookkeeping) or when the child
        // exits (run terminates, user cancels).
        const userMessage = JSON.stringify({
          type: 'user',
          message: {
            role: 'user',
            content: [{ type: 'text', text: composed }],
          },
        });
        try {
          // E-lite: `write` returns false when the chunk was buffered because the
          // OS pipe is full (the child isn't draining stdin) — the corroborating
          // signal for a `stdin_write`-phase inactivity stall.
          const accepted = child.stdin.write(`${userMessage}\n`, 'utf8', markStdinWriteEnd);
          run.stdinBackpressure = accepted === false;
        } catch (err) {
          // Swallow EPIPE here for the same reason as the listener above —
          // a fast-exiting child has already routed its failure through
          // stderr / exit handlers.
          if (err && err.code !== 'EPIPE') throw err;
        }
        run.stdinOpen = true;
      } else {
        // Split write + close so the boolean backpressure signal survives —
        // see writePromptAndEndStdin for why `end(chunk)` cannot report it.
        run.stdinBackpressure = writePromptAndEndStdin(child.stdin, composed, markStdinWriteEnd);
      }
    }
  };

  orbitService.setRunHandler(async ({
    trigger,
    startedAt,
    prompt,
    systemPrompt,
    template,
    workspaceScope,
  }) => {
    // Each Orbit run gets its own project so the conversation, messages, and
    // live artifact are isolated. The handler does the synchronous prep here
    // (insert project/conversation/run rows, kick off the chat run) and
    // returns immediately with the new project id; the daemon endpoint
    // resolves the HTTP request with that id so the client can navigate to
    // the new project before the agent has finished. Anything that depends
    // on the agent's final status (live artifact discovery, lastRun summary
    // metadata) lives inside the `completion` promise.
    const appConfig = await readAppConfig(RUNTIME_DATA_DIR);
    let agentId = typeof appConfig.agentId === 'string' && appConfig.agentId
      ? appConfig.agentId
      : null;
    if (!agentId) {
      const agents = await detectAgents(appConfig.agentCliEnv ?? {}).catch(() => []);
      agentId = agents.find((agent) => agent.available)?.id ?? null;
    }
    if (!agentId) throw new Error('No available agent is configured for Orbit. Choose an agent in Settings first.');

    const now = Date.now();
    const normalizedWorkspaceScope =
      normalizePersistedAutomationWorkspaceScope(workspaceScope);
    const projectId = `orbit-${randomUUID()}`;
    const conversationId = `orbit-conv-${randomUUID()}`;
    const assistantMessageId = `orbit-assistant-${randomUUID()}`;
    const projectName = `Orbit · ${formatLocalProjectTimestamp(startedAt)}`;

    const orbitDesignSystemId = template?.designSystemRequired === false
      ? null
      : appConfig.designSystemId ?? null;

    insertProject(db, {
      id: projectId,
      name: projectName,
      skillId: 'live-artifact',
      designSystemId: orbitDesignSystemId,
      pendingPrompt: null,
      metadata: { kind: 'orbit', trigger },
      createdAt: now,
      updatedAt: now,
    });
    bindProjectToPersistedAutomationWorkspace(
      (input) => ensureWorkspaceProject(db, input),
      normalizedWorkspaceScope,
      projectId,
      now,
    );
    insertConversation(db, {
      id: conversationId,
      projectId,
      title: projectName,
      createdAt: now,
      updatedAt: now,
    });

    const run = design.runs.create({
      projectId,
      conversationId,
      assistantMessageId,
      clientRequestId: `orbit-${trigger}-${randomUUID()}`,
      agentId,
      mediaExecution: defaultMediaExecutionPolicy(),
    });
    upsertMessage(db, conversationId, {
      id: `orbit-user-${run.id}`,
      role: 'user',
      content: prompt,
    });
    upsertMessage(db, conversationId, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      agentId,
      agentName: getAgentDef(agentId)?.name ?? agentId,
      runId: run.id,
      runStatus: 'queued',
      startedAt: now,
    });

    if (template?.dir) {
      const cwd = await ensureProject(PROJECTS_DIR, projectId);
      const result = await stageActiveSkill(
        cwd,
        skillCwdAliasSegment(template.dir),
        template.dir,
        (msg) => console.warn(msg),
      );
      if (!result.staged) {
        console.warn(
          `[od] orbit template skill-stage skipped: ${result.reason ?? 'unknown reason'}; falling back to prompt-embedded instructions`,
        );
      }
    }

    const modelPrefs = appConfig.agentModels?.[agentId] ?? {};
    design.runs.start(run, () => startChatRun({
      agentId,
      projectId,
      conversationId: run.conversationId,
      assistantMessageId: run.assistantMessageId,
      clientRequestId: run.clientRequestId,
      skillId: 'live-artifact',
      designSystemId: orbitDesignSystemId,
      model: modelPrefs.model ?? null,
      reasoning: modelPrefs.reasoning ?? null,
      serviceTier: modelPrefs.serviceTier ?? null,
      message: prompt,
      systemPrompt: [
        renderOrbitTemplateSystemPrompt(template),
        systemPrompt,
        'You are Orbit, an autonomous activity-summary agent inside OpenDesign.',
        'You must discover connectors and connector tools yourself through the OD CLI; the daemon has not chosen tools for you.',
        'You must create and register a Live Artifact as the final deliverable. Do not merely describe what you would do.',
        'Do not ask follow-up questions, do not emit <question-form>, and do not wait for user input. This run is unattended; pick reasonable defaults and complete the artifact.',
        'Keep connector credentials and OD_TOOL_TOKEN private; never print or persist secrets.',
      ].join('\n'),
    }, run));

    const completion = (async () => {
      const finalStatus = await design.runs.wait(run);
      db.prepare(
        `UPDATE messages SET run_status = ?, ended_at = ? WHERE id = ?`,
      ).run(finalStatus.status, Date.now(), assistantMessageId);
      const artifacts = await listLiveArtifacts({ projectsRoot: PROJECTS_DIR, projectId });
      const artifact = artifacts.find((candidate) => candidate.createdByRunId === run.id);
      const status = finalStatus.status === 'succeeded' && !artifact ? 'failed' : finalStatus.status;
      return {
        agentRunId: run.id,
        status,
        ...(artifact?.id ? { artifactId: artifact.id, artifactProjectId: projectId } : {}),
        summary: artifact?.id
          ? `Agent ${finalStatus.status} and registered live artifact ${artifact.title}.`
          : finalStatus.status === 'succeeded'
            ? buildOrbitNoLiveArtifactSummary(run.events)
            : `Agent ${finalStatus.status} but did not register a live artifact for this Orbit run.`,
      };
    })();

    return { projectId, agentRunId: run.id, completion };
  });

  orbitService.setTemplateResolver(async (skillId) => {
    // Orbit templates (live-artifact, etc.) live under design-templates after
    // the split, but earlier projects may still point at functional-skill
    // ids for the same purpose — search both roots so a stored project id
    // keeps resolving through one or the other.
    // This callback carries no request/project Workspace authority. It may
    // therefore resolve app-bundled templates only; accepting a user skill
    // here would turn an unscoped scheduler callback into a cross-member read.
    const skills = await listAllSkillLikeEntries({
      workspaceId: null,
      workspaceMemberId: null,
    });
    const skill = findSkillById(skills, skillId);
    if (!skill || skill.source !== 'built-in' || skill.scenario !== 'orbit') return null;
    return {
      id: skill.id,
      name: skill.name,
      examplePrompt: skill.examplePrompt,
      dir: skill.dir,
      body: skill.body,
      designSystemRequired: skill.designSystemRequired !== false,
    };
  });

  registerRunRoutes(app, {
    db,
    design,
    resources: { listAllSkillLikeEntries },
    http: httpDeps,
    paths: { BUNDLED_PLUGINS_DIR, PROJECTS_DIR, RUNTIME_DATA_DIR },
    agents: { detectAgents, getAgentDef },
    chat: { prepareOdNextInitialPromptBundle, startChatRun },
    lifecycle: { isDaemonShuttingDown: () => daemonShuttingDown },
    plugins: {
      connectorService,
      detectSkillPluginCandidateOnRunSuccess,
      firePipelineForRun,
      loadPluginRegistryView,
      renderPluginBriefTemplate,
      getLocalPluginBySource: (id, source) => getLocalPluginBySource(db, id, source),
      authorizePluginRequest: async (req, res, pluginId) => {
        const authority = resolveOptionalLocalWorkspaceRequestAuthority(req);
        if (!authority.ok) {
          sendApiError(
            res,
            authority.status,
            authority.code,
            authority.message,
          );
          return false;
        }
        const plugin = await getWorkspacePluginForRequest(
          db,
          pluginId,
          authority.context?.workspaceId ?? null,
          authority.context?.workspaceMemberId ?? null,
        );
        if (!plugin) {
          sendApiError(res, 404, 'PLUGIN_NOT_FOUND', 'plugin not found');
          return false;
        }
        return true;
      },
    },
    telemetry: {
      reportRunCompletionTelemetryFallback,
      resolveRunProjectKindForAnalytics,
      runArtifactBaselines,
      runRetryEventsForAnalytics,
    },
    messages: {
      pinAssistantMessageOnRunCreate,
      reconcileAssistantMessageOnRunEnd,
    },
    internalRuns: internalRunCreation,
    // POST /api/runs and POST /api/chat are this file's "create a run" entry
    // points — see RegisterRunRoutesDeps.enforceWorkspaceProjectMutation.
    // Same provider `collab` was built with (collab.workspaceContext ===
    // workspaceContext), matching the cross-check `registerProjectRoutes`
    // wires up for its own mutation routes above.
    enforceWorkspaceProjectMutation: enforceAuthoritativeProjectMutation,
    projectStore: {
      getWorkspaceProject,
      getWorkspaceProjectByProjectId,
      ensureWorkspaceProject,
    },
    amrWorkspaceScope: {
      isSignedIn: async () => {
        const appConfig = await readAppConfig(RUNTIME_DATA_DIR).catch(
          () => ({}),
        );
        return readVelaLoginStatus(
          process.env,
          agentCliEnvForAgent(appConfig.agentCliEnv, 'amr'),
        ).loggedIn;
      },
    },
    authorizeProjectRequest,
  });

  // Each routine fire resolves an agent, prepares project/conversation state,
  // and dispatches into the same chat runner used by manual runs.
  routineService.setRunHandler(async ({ routine, trigger, startedAt, runId }) => {
    const appConfig = await readAppConfig(RUNTIME_DATA_DIR);
    let agentId = routine.agentId
      || (typeof appConfig.agentId === 'string' && appConfig.agentId ? appConfig.agentId : null);
    if (!agentId) {
      const agents = await detectAgents(appConfig.agentCliEnv ?? {}).catch(() => []);
      agentId = agents.find((agent) => agent.available)?.id ?? null;
    }
    if (!agentId) {
      throw new Error('No available agent is configured. Choose an agent in Settings first.');
    }

    const now = startedAt;
    const storedRoutineWorkspaceScope =
      normalizePersistedAutomationWorkspaceScope(routine.context.workspaceScope);
    const routineContext = normalizeRunContextSelection(routine.context);
    const routineSkillId = routine.skillId ?? routineContext.skillIds?.[0] ?? null;
    const contextMetadata = {
      ...(routineContext.pluginIds?.length
        ? {
            contextPlugins: routineContext.pluginIds.map((id) => {
              const plugin = getInstalledPlugin(db, id);
              return {
                id,
                title: plugin?.title ?? id,
                ...(plugin?.manifest?.description ? { description: plugin.manifest.description } : {}),
              };
            }),
          }
        : {}),
      ...(routineContext.mcpServerIds?.length
        ? { contextMcpServers: routineContext.mcpServerIds.map((id) => ({ id })) }
        : {}),
      ...(routineContext.connectorIds?.length
        ? { contextConnectors: routineContext.connectorIds.map((id) => ({ id, name: id })) }
        : {}),
    };
    const stamp = formatLocalProjectTimestamp(new Date(now).toISOString());
    let projectId;
    let projectName;
    const scheduledPlaceholderProjectId = `routine-pending-project-${runId}`;
    const scheduledPlaceholderConversationId = `routine-pending-conv-${runId}`;
    let createdProjectId: string | null = null;
    let createdConversationId: string | null = null;
    let previousProjectSnapshotId: string | null = null;
    const createRoutineProject = () => {
      if (createdProjectId) return;
      projectId = `routine-${randomUUID()}`;
      projectName = `${routine.name} · ${stamp}`;
      insertProject(db, {
        id: projectId,
        name: projectName,
        skillId: routineSkillId,
        // A background routine has no live request authority from which to
        // prove an ambient app default. Persist no brand for a new project;
        // reused projects carry their own already-persisted selection.
        designSystemId: null,
        pendingPrompt: null,
        metadata: {
          kind: 'other',
          intent: 'automation',
          automationId: routine.id,
          routineId: routine.id,
          trigger,
          ...contextMetadata,
        },
        createdAt: now,
        updatedAt: now,
      });
      bindProjectToPersistedAutomationWorkspace(
        (input) => ensureWorkspaceProject(db, input),
        storedRoutineWorkspaceScope,
        projectId,
        now,
      );
      createdProjectId = projectId;
    };
    if (routine.target.mode === 'reuse') {
      const project = getProject(db, routine.target.projectId);
      if (!project) throw new Error(`Routine target project ${routine.target.projectId} not found`);
      assertSandboxProjectRootAvailable(project.metadata);
      projectId = project.id;
      projectName = project.name;
      previousProjectSnapshotId = project.appliedPluginSnapshotId ?? null;
    }

    let conversationId = `routine-conv-${randomUUID()}`;
    let conversationCreatedEvent: ProjectConversationCreatedSsePayload | null = null;
    const routineConversationTitle = () => routine.target.mode === 'reuse'
      ? `${routine.name} · ${stamp}`
      : projectName;
    const createRoutineConversation = () => {
      if (createdConversationId) return;
      if (!projectId) createRoutineProject();
      if (!projectId) throw new Error('Routine project could not be prepared');
      conversationId = `routine-conv-${randomUUID()}`;
      insertConversation(db, {
        id: conversationId,
        projectId,
        title: routineConversationTitle(),
        createdAt: now,
        updatedAt: now,
      });
      createdConversationId = conversationId;
      conversationCreatedEvent = {
        type: 'conversation-created',
        projectId,
        conversationId,
        title: routineConversationTitle(),
        createdAt: now,
      };
    };

    const assistantMessageId = `routine-assistant-${randomUUID()}`;
    let resolvedRoutineSnapshot = null;
    // Tracks any snapshot id that `resolvePluginSnapshot()` already pinned
    // to the reused project before the resolver threw on a later linking
    // step. `finalizeOk()` performs `linkSnapshotToProject()` BEFORE
    // `linkSnapshotToConversation()` / `linkSnapshotToRun()`, so a failure
    // mid-resolve can leave `projects.applied_plugin_snapshot_id` repointed
    // at a snapshot the routine never durably claimed. The rollback path in
    // `discard()` falls back to this id when `resolvedRoutineSnapshot` is
    // still null so the reused project pin is restored either way.
    let partiallyAppliedSnapshotId: string | null = null;
    const primaryPluginId = routineContext.pluginIds?.[0] ?? null;
    const resolveRoutinePluginSnapshot = async () => {
      if (!primaryPluginId || resolvedRoutineSnapshot) return;
      const routineProjectBinding = getWorkspaceProjectByProjectId(db, projectId);
      const routinePlugin = await getWorkspacePluginForRequest(
        db,
        primaryPluginId,
        routineProjectBinding?.workspaceId
          ? String(routineProjectBinding.workspaceId)
          : null,
        typeof routineProjectBinding?.createdByWorkspaceMemberId === 'string'
          ? routineProjectBinding.createdByWorkspaceMemberId
          : null,
      );
      if (!routinePlugin) {
        throw new Error(
          `Automation plugin ${primaryPluginId} is not visible to the persisted project owner`,
        );
      }
      const registry = await loadPluginRegistryView(
        routineProjectBinding?.workspaceId
          ? {
              workspaceId: String(routineProjectBinding.workspaceId),
              workspaceMemberId:
                typeof routineProjectBinding.createdByWorkspaceMemberId === 'string'
                  ? routineProjectBinding.createdByWorkspaceMemberId
                  : null,
            }
          : undefined,
      );
      const projectSnapshotBefore = routine.target.mode === 'reuse'
        ? getProject(db, routine.target.projectId)?.appliedPluginSnapshotId ?? null
        : null;
      const persistedDesignSystemId = getProject(db, projectId)?.designSystemId ?? null;
      if (
        persistedDesignSystemId
        && !registry.designSystems.some((system) => system.id === persistedDesignSystemId)
      ) {
        throw new Error(
          `Automation design system ${persistedDesignSystemId} is not visible to the persisted project owner`,
        );
      }
      let resolved;
      try {
        resolved = resolvePluginSnapshot({
          db,
          body: {
            pluginId: primaryPluginId,
            pluginInputs: { prompt: routine.prompt },
          },
          projectId,
          conversationId,
          registry,
          activeProjectDesignSystem:
            typeof persistedDesignSystemId === 'string' && persistedDesignSystemId.length > 0
              ? { id: persistedDesignSystemId }
              : undefined,
        });
      } catch (resolverError) {
        // `resolvePluginSnapshot()` may have already updated the reused
        // project's pin via `linkSnapshotToProject()` before throwing on
        // `linkSnapshotToConversation()` (or `linkSnapshotToRun()`). Capture
        // whatever pin it left behind so `discard()` can roll it back even
        // though `resolvedRoutineSnapshot` will stay null.
        if (routine.target.mode === 'reuse') {
          const after = getProject(db, routine.target.projectId)?.appliedPluginSnapshotId ?? null;
          if (after && after !== projectSnapshotBefore) {
            partiallyAppliedSnapshotId = after;
          }
        }
        throw resolverError;
      }
      if (resolved && !resolved.ok) {
        // Non-throwing resolver failures cannot have called `finalizeOk()`,
        // so the project pin is still the previous one — nothing to roll
        // back beyond the loser cleanup the caller will perform.
        throw new Error(`Automation plugin ${primaryPluginId} could not be applied: ${JSON.stringify(resolved.body)}`);
      }
      resolvedRoutineSnapshot = resolved;
    };
    const run = design.runs.create({
      projectId: projectId ?? scheduledPlaceholderProjectId,
      conversationId: createdConversationId ? conversationId : scheduledPlaceholderConversationId,
      assistantMessageId,
      clientRequestId: `routine-${trigger}-${randomUUID()}`,
      agentId,
      mediaExecution: defaultMediaExecutionPolicy(),
      ...(resolvedRoutineSnapshot?.ok
        ? {
            appliedPluginSnapshotId: resolvedRoutineSnapshot.snapshotId,
            pluginId: resolvedRoutineSnapshot.snapshot.pluginId,
          }
        : {}),
    });
    const persistPreparedRun = async (routineRun = null) => {
      if (!projectId) {
        createRoutineProject();
      }
      if (projectId) {
        run.projectId = projectId;
        const preparedProject = getProject(db, projectId);
        run.projectMetadata =
          preparedProject?.metadata && typeof preparedProject.metadata === 'object'
            ? preparedProject.metadata
            : null;
        if (routineRun) {
          routineRun.projectId = projectId;
        }
      }
      createRoutineConversation();
      run.conversationId = conversationId;
      if (routineRun) {
        routineRun.conversationId = conversationId;
        routineRun.agentRunId = run.id;
      }
      await resolveRoutinePluginSnapshot();
      if (resolvedRoutineSnapshot?.ok) {
        run.appliedPluginSnapshotId = resolvedRoutineSnapshot.snapshotId;
        run.pluginId = resolvedRoutineSnapshot.snapshot.pluginId;
        const { linkSnapshotToRun } = await import('./plugins/snapshots.js');
        linkSnapshotToRun(db, resolvedRoutineSnapshot.snapshotId, run.id);
      }
      upsertMessage(db, conversationId, {
        id: `routine-user-${run.id}`,
        role: 'user',
        content: routine.prompt,
      });
      upsertMessage(db, conversationId, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        agentId,
        agentName: getAgentDef(agentId)?.name ?? agentId,
        runId: run.id,
        runStatus: 'queued',
        startedAt: now,
      });
    };

    const modelPrefs = appConfig.agentModels?.[agentId] ?? {};
    const start = () => {
      // Notify any open `ProjectView` only after the routine run row has
      // been accepted and preparation has completed, so failed setup does not
      // surface phantom conversations (#1361).
      if (conversationCreatedEvent) emitProjectEvent(projectId, conversationCreatedEvent);
      const persistedDesignSystemId = getProject(db, projectId)?.designSystemId ?? null;
      design.runs.start(run, () => startChatRun({
        agentId,
        projectId,
        conversationId: run.conversationId,
        assistantMessageId: run.assistantMessageId,
        clientRequestId: run.clientRequestId,
        skillId: routineSkillId,
        designSystemId: persistedDesignSystemId,
        context: routineContext,
        model: modelPrefs.model ?? null,
        reasoning: modelPrefs.reasoning ?? null,
        serviceTier: modelPrefs.serviceTier ?? null,
        message: routine.prompt,
        systemPrompt: [
          `You are running an unattended scheduled routine named "${routine.name}".`,
          'Do not ask follow-up questions, do not emit <question-form>, and do not wait for user input. Pick reasonable defaults and finish the task.',
        ].join('\n'),
      }, run));
    };

    // Tear-down for the case where the durable routine_run row was never
    // inserted (sibling daemon won the slot, or insertRun threw). The
    // in-memory chat run was created speculatively above, but the deferred
    // `persistPreparedRun()` has not run yet — so no project / conversation
    // / snapshot writes have to be rolled back. Dropping the run keeps it
    // off `/api/runs` instead of leaving a phantom canceled entry there.
    const discardUnstarted = () => {
      design.runs.drop(run);
    };

    const discard = () => {
      if (typeof run.projectId === 'string' && run.projectId.startsWith('routine-pending-')) {
        run.projectId = null;
      }
      if (typeof run.conversationId === 'string' && run.conversationId.startsWith('routine-pending-')) {
        run.conversationId = null;
      }
      design.runs.finish(run, 'canceled');
      if (routine.target.mode === 'reuse') {
        // Prefer the fully-resolved snapshot id; fall back to whatever id
        // `resolvePluginSnapshot()` left pinned on the project if it threw
        // partway through linking — see the comment on
        // `partiallyAppliedSnapshotId` above.
        const snapshotIdToDiscard =
          resolvedRoutineSnapshot?.ok
            ? resolvedRoutineSnapshot.snapshotId
            : partiallyAppliedSnapshotId;
        if (snapshotIdToDiscard) {
          restoreProjectSnapshotLink(
            db,
            projectId,
            snapshotIdToDiscard,
            previousProjectSnapshotId,
            run.id,
          );
        }
      }
      if (createdConversationId) {
        deleteConversation(db, createdConversationId);
      }
      if (createdProjectId) {
        dbDeleteProject(db, createdProjectId);
      }
    };

    const completion = (async () => {
      const finalStatus = await design.runs.wait(run);
      const failureError = finalStatus.status === 'failed'
        ? (typeof finalStatus.error === 'string' && finalStatus.error.trim() ? finalStatus.error.trim() : null)
        : null;
      const failureErrorCode = finalStatus.status === 'failed'
        ? (typeof finalStatus.errorCode === 'string' && finalStatus.errorCode.trim() ? finalStatus.errorCode.trim() : null)
        : null;
      if (failureError) {
        appendMessageStatusEvent(db, assistantMessageId, {
          label: 'error',
          detail: failureError,
        });
      }
      db.prepare(`UPDATE messages SET run_status = ?, ended_at = ? WHERE id = ?`)
        .run(finalStatus.status, Date.now(), assistantMessageId);
      let evolutionSummary = '';
      if (finalStatus.status === 'succeeded' && routineContext.connectorIds?.length) {
        try {
          const evolution = await ingestRoutineConnectorEvolution(RUNTIME_DATA_DIR, {
            routine,
            runId,
            trigger,
            status: finalStatus.status,
            projectId,
            conversationId,
            agentRunId: run.id,
            summary: `Routine "${routine.name}" ${finalStatus.status}.`,
            connectorIds: routineContext.connectorIds,
            messages: listMessages(db, conversationId),
          });
          if (evolution?.proposals?.length) {
            evolutionSummary = ` Created ${evolution.proposals.length} self-evolution proposal(s) from connector context.`;
          }
        } catch (error) {
          evolutionSummary = ` Connector self-evolution ingestion failed: ${error instanceof Error ? error.message : String(error)}.`;
        }
      }
      return {
        status: finalStatus.status,
        summary: failureError
          ? `Routine "${routine.name}" failed: ${failureError}`
          : `Routine "${routine.name}" ${finalStatus.status}.${evolutionSummary}`,
        error: failureError ?? undefined,
        errorCode: failureErrorCode ?? undefined,
      };
    })();

    return {
      projectId: run.projectId,
      conversationId: run.conversationId,
      agentRunId: run.id,
      completion,
      prepare: persistPreparedRun,
      start,
      discard,
      discardUnstarted,
    };
  });
  routineService.start();

  assertServerContextSatisfiesRoutes({
    db,
    design,
    http: httpDeps,
    paths: pathDeps,
    ids: idDeps,
    uploads: uploadDeps,
    node: nodeDeps,
    projectStore: projectStoreDeps,
    authorizeProjectRequest,
    authorizeProjectToolRequest,
    isApiTokenAuthorization,
    projectFiles: projectFileDeps,
    conversations: conversationDeps,
    templates: templateDeps,
    status: projectStatusDeps,
    events: projectEventDeps,
    imports: importDeps,
    exports: projectExportDeps,
    artifacts: artifactDeps,
    documents: { buildDocumentPreview },
    auth: authDeps,
    liveArtifacts: liveArtifactDeps,
    deploy: deployDeps,
    media: mediaDeps,
    appConfig: appConfigDeps,
    orbit: orbitDeps,
    nativeDialogs: nativeDialogDeps,
    research: researchDeps,
    mcp: { pendingAuth: mcpPendingAuth, daemonUrlRef },
    plugins: {
      connectorService,
      detectSkillPluginCandidateOnRunSuccess,
      firePipelineForRun,
      loadPluginRegistryView,
      renderPluginBriefTemplate,
    },
    resources: {
      listAllSkills,
      listAllDesignTemplates,
      listAllSkillLikeEntries,
      listAllDesignSystems,
      mimeFor,
    },
    routines: { routineService },
    projectPreviewScopes,
    validation: validationDeps,
    finalize: finalizeDeps,
    handoff: handoffDeps,
    chat: { prepareOdNextInitialPromptBundle, startChatRun },
    messages: {
      pinAssistantMessageOnRunCreate,
      reconcileAssistantMessageOnRunEnd,
    },
    agents: agentDeps,
    critique: critiqueDeps,
    openDesignPublicMetadata,
    lifecycle: { isDaemonShuttingDown: () => daemonShuttingDown },
  });

  registerRoutineRoutes(app, {
    db,
    paths: { RUNTIME_DATA_DIR },
    routines: { routineService },
  });

  // proxy routes (anthropic / openai / azure / google / ollama) live
  // in chat-routes.ts now — garnet had a partial duplicate here that
  // referenced helpers (rejectPluginInProxyBody, extractGeminiText, …)
  // dropped during the reconcile merge. Deleted to fix the BYOK crash.
  // Restore the plugin-runs-must-go-through-daemon gate by adding it
  // to chat-routes.ts if needed.


  registerChatRoutes(app, {
    db,
    design,
    http: httpDeps,
    authorizeProjectRequest,
    paths: pathDeps,
    chat: { prepareOdNextInitialPromptBundle, startChatRun },
    agents: agentDeps,
    critique: critiqueDeps,
    appConfig: { readAppConfig },
    validation: validationDeps,
    lifecycle: { isDaemonShuttingDown: () => daemonShuttingDown },
    telemetry: { reportFinalizedMessage, reportFeedback },
  });

  registerStaticSpaFallback(app, staticDir);

  // Wait for `listen` to bind so callers always see the resolved URL —
  // critical when port=0 (ephemeral port) and when the embedding sidecar
  // needs to advertise the port to a parent process before any request
  // can flow. Three callers depend on this contract:
  //   - `apps/daemon/src/cli.ts`            → expects `{ url, server, shutdown }`
  //   - `apps/daemon/sidecar/server.ts`     → expects `{ url, server }`
  //   - `apps/daemon/tests/version-route.test.ts` → expects `{ url, server }`
  return await new Promise((resolve, reject) => {
    let daemonShutdownStarted = false;
    const clearTerminalTelemetryFallbackTimers = () => {
      for (const timer of terminalTelemetryFallbackTimers) clearTimeout(timer);
      terminalTelemetryFallbackTimers.clear();
    };
    const cleanupDaemonBackgroundWork = () => {
      clearTerminalTelemetryFallbackTimers();
      telemetry.disposeFatalHandlers();
      composioConnectorProvider.stopCatalogRefreshLoop();
      orbitService.stop();
      routineService?.stop();
      clearInterval(teamResourcesPollTimer);
      workspaceHubSubscriptions?.dispose();
      hubEventRefreshes.dispose();
      workspaceDirectoryRefreshes.dispose();
      workspaceBillingRuntime.dispose();
      proactiveContentPull.dispose();
      collabCloud?.dispose();
    };
    const shutdownDaemonRuns = async () => {
      if (daemonShutdownStarted) return;
      daemonShutdownStarted = true;
      daemonShuttingDown = true;
      clearTerminalTelemetryFallbackTimers();
      await design.runs.shutdownActive({ graceMs: resolveChatRunShutdownGraceMs() });
      await terminalService.shutdownActive();
      await browserSessionService.shutdownActive();
      await design.analytics.shutdown();
    };
    let server;
    try {
      server = app.listen(port, host);
      server.once('listening', () => {
        // Widen the between-request idle window so kept-alive sockets
        // belonging to chat/SSE clients survive the gaps between bursts.
        //
        // Node's `keepAliveTimeout` (default 5s) only arms *after* a
        // response finishes writing, bounding the idle gap before the next
        // request on the same socket — it does not fire while an SSE
        // response is still streaming. A streaming `/api/runs/:id/events`
        // response stays open until the agent finishes, so middlebox idle
        // timers (nginx, socat/docker bridges, EC2 SG NAT) are typically
        // the proximate cause when an SSE stream drops; this listener-
        // side change cannot extend a connection past those middleboxes.
        //
        // What it *does* fix: chat clients that pipeline multiple requests
        // on the same TCP socket (status polls, run-status fetches, the
        // initial GET before the SSE upgrade). With the default 5s window
        // a sluggish client can lose the connection between two normal
        // calls and reconnect-storm. 120s aligns with the in-band
        // SSE_KEEPALIVE_INTERVAL_MS (25s) so kept-alive sockets used
        // around an SSE stream stay warm across reasonable client pauses.
        //
        // `headersTimeout` must exceed `keepAliveTimeout` per the Node
        // docs; otherwise a slow-loris client can stall request parsing.
        server.keepAliveTimeout = 120_000;
        server.headersTimeout = 125_000;
        const address = server.address();
        // `address()` can in theory return `string | AddressInfo | null`. For
        // a TCP listener it's always `AddressInfo` with a `.port` — the guard
        // is belt-and-braces so an unexpected null never silently produces a
        // `http://127.0.0.1:0` URL that callers would then try to fetch.
        const boundPort =
          address && typeof address === 'object' ? address.port : null;
        if (!boundPort) {
          reject(
            new Error(
              `[od] daemon failed to resolve listening port (address=${JSON.stringify(address)})`,
            ),
          );
          return;
        }
        resolvedPort = boundPort;
        // When binding to all interfaces report localhost for local callers;
        // when binding to a specific address (e.g. a Tailscale IP) report that
        // address so remote callers and the sidecar use the correct URL.
        const reportHost = host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host;
        const url = `http://${reportHost}:${resolvedPort}`;
        if (!returnServer) {
          console.log(`[od] daemon listening on ${url}`);
        }
        daemonUrl = url;
        resolve(returnServer ? {
          url,
          server,
          shutdown: shutdownDaemonRuns,
          routeInventory: getRouteRegistrationInventory(app),
        } : url);
      });
    } catch (error) {
      cleanupDaemonBackgroundWork();
      reject(error);
      return;
    }
    server.once('close', () => {
      void shutdownDaemonRuns().finally(cleanupDaemonBackgroundWork);
    });
    // `app.listen` throws synchronously when the port is already in use on
    // some Node versions, but emits an `error` event on others (and for
    // EACCES / EADDRNOTAVAIL even on the same Node). Wire the event so the
    // returned Promise always settles instead of hanging forever.
    server.on('error', (error) => {
      cleanupDaemonBackgroundWork();
      reject(error);
    });
  });
}

function randomId() {
  return randomUUID();
}

function sanitizeSlug(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

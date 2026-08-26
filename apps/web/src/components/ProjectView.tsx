Warning: truncated output (original token count: 139396)
Total output lines: 13267

import {
  startTransition,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react';
import { AnimatePresence } from 'motion/react';
import { Button } from '@open-design/components';
import { createHtmlArtifactManifest, inferLegacyManifest } from '../artifacts/manifest';
import { resolveHtmlPointerArtifactTarget } from '../artifacts/pointer';
import { validateHtmlArtifact } from '../artifacts/validate';
import { recoverHtmlDocumentFromMarkdownFence, recoverStandaloneHtmlDocument, resolvePersistedArtifactHtml } from '../artifacts/recover';
import { createArtifactParser } from '../artifacts/parser';
import { useI18n } from '../i18n';
import {
  fetchChatRunStatus,
  GENERIC_DAEMON_DISCONNECT_CODE,
  GENERIC_DAEMON_DISCONNECT_MESSAGE,
  listActiveChatRuns,
  listProjectRuns,
  publishDaemonRunFinishedEvent,
  reattachDaemonRun,
  reportChatRunFeedback,
  streamViaDaemon,
} from '../providers/daemon';
import { normalizeCustomReason } from '@open-design/contracts/analytics';
import {
  deletePreviewComment,
  fetchConnectorStatuses,
  fetchPreviewComments,
  fetchProjectDesignSystemPackageAudit,
  fetchLiveArtifacts,
  fetchProjectFiles,
  fetchProjectFileText,
  fetchSkill,
  invalidateProjectFilesCache,
  patchPreviewCommentSortKey,
  patchPreviewCommentStatus,
  projectRawUrl,
  uploadProjectFiles,
  upsertPreviewComment,
  writeProjectTextFile,
} from '../providers/registry';
import { useProjectFileEvents, type ProjectEvent } from '../providers/project-events';
import { claimProjectTurnIndex, claimRunTurnIndex } from '../analytics/identity';
import {
  buildInitialTaskAnalytics,
  buildRecoveryTaskAnalytics,
  runAgentProviderId,
} from '../analytics/run-task';
import { useCoalescedCallback } from '../hooks/useCoalescedCallback';
import { requestAmrArtifactUpgrade } from '../runtime/amr-artifact-upgrade';
import {
  resolveQuestionFormStrategyTaskExecutionId,
  strategySettledMessageFields,
} from '../runtime/strategy-question-continuation';
import {
  hasCurrentAutomaticScenarioBinding,
  type AmrWalletSnapshot,
  type ByokChatProviderConfig,
  type ByokMediaDefaults,
  type ByokChatProtocol,
  type ChatTaskExecutionAnalytics,
  type ProjectWorkspaceScope,
  type ResearchOptions,
} from '@open-design/contracts';
import {
  anonymizeArtifactId,
  artifactKindToTracking,
  byokProtocolToTracking,
  executionModeToTracking,
  projectKindFromMetadataToTracking,
  projectKindFromMetadataToTrackingOrLegacyDefault,
  projectKindToTracking,
  sessionModeToTracking,
} from '@open-design/contracts/analytics';
import type {
  TrackingArtifactKind,
  TrackingConversationForkErrorCode,
  TrackingConversationForkPoint,
  TrackingDesignSystemApplyTargetKind,
  TrackingDesignSystemOrigin,
  TrackingDesignSystemStatusValue,
  TrackingRunRecoveryActionType,
} from '@open-design/contracts/analytics';
import { useAnalytics } from '../analytics/provider';
import {
  trackByokPreflightBlocked,
  trackComposerBarClick,
  trackConversationForkClick,
  trackConversationForkResult,
  trackDesignSystemApplyResult,
  trackDesignSystemEnrichClick,
  trackPageView,
  trackOnboardingPromptPrefilled,
  trackOnboardingFirstPromptSent,
  trackOnboardingFirstGenerationCompleted,
  trackRunRecoveryActionClick,
  trackRunStartBlockedSurfaceView,
} from '../analytics/events';
import { byokPreflightBlockReason } from './byok/preflight';
import {
  clearOnboardingSessionId,
  peekOnboardingSessionId,
} from '../analytics/onboarding-session';
import { navigate } from '../router';
import { agentDisplayName, agentModelDisplayName } from '../utils/agentLabels';
import { isMacPlatform } from '../utils/platform';
import {
  canAutoRenameProjectFromPrompt,
  summarizeProjectNameFromPrompt,
} from '../utils/projectName';
import {
  apiProtocolAgentId,
  apiProtocolModelLabel,
  usesAnthropicProxy,
} from '../utils/apiProtocol';
import { playSound, showCompletionNotification } from '../utils/notifications';
import { randomUUID } from '../utils/uuid';
import { DEFAULT_NOTIFICATIONS, KNOWN_PROVIDERS } from '../state/config';
import type { TodoItem } from '../runtime/todos';
import type {
  AmrAuthRetryContinuation,
  AmrAuthRetryPersonalAdoptionWitness,
} from '../runtime/amr-auth-retry-continuation';
import {
  appendErrorStatusEvent,
  removeErrorStatusEvent,
  runFailureFieldsFromError,
} from '../runtime/chat-events';
import type { RunFailureClassificationFields } from '../runtime/chat-events';
import {
  designDeliveryReconciliationStale,
  designDeliveryVerificationPending,
  isRetryableAssistantTerminalFailure,
  resolveDesignDeliveryOutcome,
  type DesignDeliveryOutcome,
} from '../runtime/design-delivery';
import { notifyArtifactDelivered } from './experience-survey-trigger';
import { RESUME_CONTINUE_PROMPT } from '../runtime/resume';
import {
  amrBalanceGateScopeForWorkspaceContext,
  amrBalanceGateScopesMatch,
  checkAmrBalanceGate,
  isAmrBalanceGateScope,
  type AmrBalanceGateScope,
} from '../runtime/amr-balance-gate';
import { isPaidAmrPlan, resolveAmrPlan } from '../runtime/amr-low-balance-plan';
import { AmrBalanceDialog } from './AmrBalanceDialog';
import { AmrLowBalanceDialog, type AmrLowBalanceDecision } from './AmrLowBalanceDialog';
import {
  cancelBrandExtraction,
  continueBrandExtraction,
  extractBrandFromHtml,
  finalizeBrandProject,
} from '../runtime/brands';
import { isOpenDesignHostAvailable } from '@open-design/host';
import {
  getBrandBrowser,
  BRAND_BROWSER_TAB_ID,
  type BrandBrowserPageSnapshotResult,
} from '../runtime/brand-browser-bridge';
import {
  BROWSER_PAGE_ARCHIVE_INDEX_FILE,
  BROWSER_SERIALIZE_HTML_SCRIPT,
  BROWSER_SERIALIZE_STYLES_SCRIPT,
  isBrowserPageArchiveManifest,
} from './design-browser-tools';
import type { BrandBrowserAssistConfirm, BrandBrowserAssistResult } from './OdCard';
import {
  buildBrandEnrichmentPrompt,
  installedBrandEnrichmentSkillIds,
  isProgrammaticBrandExtractionProject,
} from '../runtime/brand-enrichment';
import { useSingleFlightCallback } from '../runtime/useSingleFlightCallback';
import { useBrandReadyPrompt } from '../runtime/useBrandReadyPrompt';
import {
  buildDesignSystemPackageAuditRepairPrompt,
  summarizeDesignSystemPackageAudit,
} from '../runtime/design-system-package-audit';
import { isLiveArtifactTabId, liveArtifactTabId } from '../types';
import {
  DESIGN_SYSTEM_WORKSPACE_DISPLAY_TITLE,
  isDesignSystemWorkspacePrompt,
} from '../design-system-auto-prompt';
import {
  createConversation,
  deleteConversation as deleteConversationApi,
  duplicatePluginAsProject,
  fetchAppliedPluginSnapshot,
  getProject,
  installGeneratedPluginFolder,
  listConversations,
  listMessages,
  loadTabs,
  patchConversation,
  patchProject,
  ProjectConversationsHttpError,
  saveMessage,
  startGeneratedPluginShareTask,
  cacheTabsLocally,
  persistTabsToDaemonNow,
  listPlugins,
  resolvedWorkspaceContextForWrite,
  restoreProjectAutomaticScenario,
  type SaveMessageOptions,
  waitGeneratedPluginShareTask,
} from '../state/projects';
import type {
  AppliedPluginSnapshot,
  BrandStatus,
  ChatAnalyticsEntryFrom,
  ChatSessionMode,
  InstalledPluginRecord,
  MobileScreenRecord,
  RunContextSelection,
  WorkspaceCollabContext,
  WorkspaceContextItem,
} from '@open-design/contracts';
import scenarioStyles from './ProjectScenarioControl.module.css';
import type {
  AgentEvent,
  AgentInfo,
  AppConfig,
  Artifact,
  ChatAttachment,
  ChatCommentAttachment,
  ChatMessage,
  ChatMessageFeedbackChange,
  Conversation,
  DesignSystemSummary,
  OpenTabsState,
  Project,
  ProjectMetadata,
  PreviewComment,
  PreviewCommentAttachment,
  PreviewCommentTarget,
  ProjectFile,
  LiveArtifactEventItem,
  LiveArtifactSummary,
  SkillSummary,
} from '../types';
import {
  commentsToAttachments,
  historyWithCommentAttachmentContext,
  mergeAttachedComments,
  mergePreviewCommentAttachments,
  queuedSlideNavTarget,
  removeAttachedComment,
} from '../comments';
import { historyWithApiAttachmentContext } from '../api-attachment-context';
import { filterImplicitProducedFiles } from '../produced-files';
import { AvatarMenu } from './AvatarMenu';
import { Icon } from './Icon';
import { useWorkspaceTabsDockRef } from './workspaceTabsDock';
import { localizePluginTitle } from './plugins-home/localization';
import { DesignSystemPicker } from './DesignSystemPicker';
import { PresenceBar } from '../collab/PresenceBar';
import { useProjectCollab } from '../collab/useProjectCollab';
import {
  currentUserDirectoryEntry,
  useTeamMembers,
} from '../collab/useTeamMembers';
import { workspaceIdentityCacheKey } from '../collab/workspace-identity';
import {
  useWorkspaceContext,
  workspaceIdentityCanBillAmr,
} from '../collab/useWorkspaceContext';
import {
  projectWorkspaceContext,
  projectWorkspaceScopeAuthorizesAmr,
  projectWorkspaceScopeReady,
  runWorkspaceIdentity,
  runWorkspacePersonalAdoptionWitness,
  useProjectWorkspaceScope,
} from '../collab/useProjectWorkspaceScope';
import {
  CollabProvider,
  type CollabContextValue,
  type ProjectResourceAuthority,
} from '../collab/collab-context';
import { persistCommentAnchors } from '../collab/comment-anchor-client';
import type { AnchorWriteBack } from '../comments';
import { PluginDetailsModal } from './PluginDetailsModal';
import { DesignSystemPreviewModal } from './DesignSystemPreviewModal';
import { ChatPane } from './ChatPane';
import type { ChatSendMeta, ChatSendOutcome } from './ChatComposer';
import {
  CritiqueTheaterMount,
  useCritiqueTheaterEnabled,
} from './Theater';
import { useIframeKeepAlivePool } from './IframeKeepAlivePool';
import { invalidateHtmlSourceSnapshotProject } from './html-source-snapshot-cache';
import {
  decideAutoOpenAfterWrite,
  selectAutoOpenProducedArtifact,
  selectAutoOpenTurnArtifact,
} from './auto-open-file';
import { buildRepoImportPrompt, designSystemNeedsRepoConnect } from './design-system-github-evidence';
import { isDesignSystemProject, resolveProjectDesignSystemId } from './design-system-project';
import { collectReferencedJsxNames } from '../runtime/jsx-module-refs';
import {
  DESIGN_SYSTEM_TAB,
  FileWorkspace,
  type BrowserOpenRequest,
  type FileRefreshResult,
} from './FileWorkspace';
import {
  type PluginFolderAgentAction,
} from './design-files/pluginFolderActions';
import { SHARE_TO_COMMUNITY_PROMPT } from './share-to-community/shareToCommunityPrompt';
import { CenteredLoader } from './Loading';
import type { SettingsSection } from './SettingsDialog';
import { Toast } from './Toast';
import { FirstArtifactHint } from './FirstArtifactHint';
import {
  consumeOnboardingEntryForProject,
  hasSentFirstOnboardingPrompt,
  markFirstOnboardingPromptSent,
  hasCompletedFirstOnboardingGeneration,
  markFirstOnboardingGenerationCompleted,
  type OnboardingEntry,
} from '../onboarding/onboarding-entry';
import { producedPreviewableArtifact } from '../onboarding/first-generation';
import { sentPrefilledPrompt } from '../onboarding/first-prompt';
import { beginFirstLoop, recordFirstLoopStep } from '../onboarding/first-loop';
import { BrandReadyPrompt } from './BrandReadyPrompt';
import { useDesignMdState } from '../hooks/useDesignMdState';
import { useFinalizeProject } from '../hooks/useFinalizeProject';
import {
  useProjectDetail,
  type ProjectDetailSeed,
} from '../hooks/useProjectDetail';
import { useTerminalLaunch } from '../hooks/useTerminalLaunch';
import { buildContinueInCliToast } from '../lib/build-continue-in-cli-toast';
import { buildClipboardPrompt } from '../lib/build-clipboard-prompt';
import { copyToClipboard } from '../lib/copy-to-clipboard';
import { effectiveMaxTokens } from '../state/maxTokens';
import { effectiveAgentModelChoice, effectiveAgentModelId } from './agentModelSelection';
import { mediaExecutionPolicyForProjectMetadata } from '../media/execution-policy';
import { mediaModelProviderId } from '../media/models';
import { byokProviderRequiresApiKey } from '../utils/byokProvider';
import {
  useByokImageModelOptions,
  useByokVideoModelOptions,
  useByokSpeechModelOptions,
} from '../media/aihubmix-image-models';
import {
  buildFinalizeCredentialsMissingToast,
  buildFinalizeRequest,
} from '../lib/resolve-finalize-request';
import type { CommentSendResult } from './comment-send-result';

type BrandBrowserSnapshot =
  | { status: 'ready'; html: string; css: string; baseUrl: string }
  | { status: 'unavailable'; message: string }
  | { status: 'read-failed'; message: string };

type BrandBrowserSnapshotExtractionResult =
  | { status: 'handled' }
  | { status: 'miss'; message: string | null };

type ProjectChatSendMeta = ChatSendMeta & {
  /** Stable persisted row ids for a replayable handoff such as Home auto-send. */
  userMessageId?: string;
  assistantMessageId?: string;
  queueOnly?: boolean;
  retryOfAssistantId?: string;
  sessionMode?: ChatSessionMode;
  /** Overrides the run_created / run_finished `entry_from` analytics prop for
   *  this send (e.g. 'resume_continue' from the resumable-failure Continue
   *  action). Behavior never depends on it; it only shapes PostHog props. */
  entryFrom?: ChatAnalyticsEntryFrom;
  /** Marks this send as the AI-optimize (deep enrichment) run so the daemon
   *  can emit design_system_enrich_result + flag the DS as ai_refined on
   *  success (tracking spec C14/C15). Daemon mode only. */
  dsEnrichment?: boolean;
  /** Marks a send replayed from the queued-sends drain. Its payload already
   *  lives in the queue item, so a pre-run block (e.g. the AMR balance gate)
   *  must NOT re-queue it — only pause further drains. */
  queueDrain?: boolean;
  /** The OpenDesign Cloud balance gate already ran for this exact send at
   *  the home submit (with any soft warning answered there); skip re-gating
   *  so the user is never double-prompted for one task. */
  amrGatePrechecked?: boolean;
  /** The Home handoff owns a separately persisted prompt. Once that payload is
   *  durably queued, report it as accepted so the handoff is consumed instead
   *  of replaying a second copy when the queue later drains. This flag is
   *  transport-only and is stripped before queue persistence. */
  acceptQueuedHomeHandoff?: boolean;
  /** Stable task lineage for retries, resumes and clarification answers. */
  taskAnalytics?: ChatTaskExecutionAnalytics;
  /** Explicit daemon-issued OD Next continuation handle. */
  strategyTaskExecutionId?: string;
};

export function mergeSavedPreviewComment(current: PreviewComment[], saved: PreviewComment): PreviewComment[] {
  const existingIndex = current.findIndex((comment) => comment.id === saved.id);
  if (existingIndex < 0) return [...current, saved];
  return current.map((comment, index) => (index === existingIndex ? saved : comment));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function conversationForkErrorCode(error: unknown): TrackingConversationForkErrorCode {
  if (error instanceof ProjectConversationsHttpError) {
    if (error.status === 400) return 'bad_request';
    if (error.status === 401 || error.status === 403) return 'permission_denied';
    if (error.status === 404) return 'fork_source_not_found';
    if (error.status === 413) return 'payload_too_large';
    if (error.status >= 500) return 'server_error';
    return 'http_error';
  }
  if (error instanceof TypeError) return 'network_error';
  return 'unknown_error';
}

function conversationForkPoint(
  messages: ChatMessage[],
  assistantMessageId: string,
  forkIndex: number,
): TrackingConversationForkPoint {
  if (forkIndex < 0) return 'unknown';
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== 'assistant') continue;
    return message.id === assistantMessageId ? 'latest' : 'historical';
  }
  return 'unknown';
}

export async function listConversationsWithRetry(
  projectId: string,
  workspaceContext?: WorkspaceCollabContext | null,
): Promise<Conversation[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= CONVERSATION_LOAD_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await listConversations(projectId, {
        throwOnError: true,
        workspaceContext,
      });
    } catch (err) {
      lastError = err;
      // A shared project may be visible in the catalog just before its local
      // conversation materialization completes. Only that transient 404 earns
      // the bounded retry window; auth/permission/request failures are settled
      // and retrying them merely leaves the entire project in a loading state.
      if (
        !(err instanceof ProjectConversationsHttpError)
        || err.status !== 404
        || workspaceContext?.workspaceType !== 'team'
      ) {
        throw err;
      }
      const delay = CONVERSATION_LOAD_RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break;
      await wait(delay);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Could not load conversations for this project.');
}

/**
 * Server messages whose local copy is longer only because the live stream
 * folded a LATER Run of the same logical task into it.
 *
 * A Full Plan turn spans several physical Runs. The live stream re-points one
 * assistant message at each successor Run (`onRunCreated`), so that message
 * accumulates every stage's output; the daemon meanwhile persists one message
 * per Run. On the post-run refresh the two views meet, and the ordinary
 * "longer local body is fresher" rule (#6396) reads the accumulation as
 * freshness and keeps it — next to the successor's own row. The successor's
 * answer then renders twice.
 *
 * Only a message with a LATER sibling in the same task qualifies: the task's
 * final Run has nothing to have absorbed, and its local copy really is the
 * freshest one.
 */
function messagesThatAbsorbedASuccessorRun(
  serverMessages: readonly ChatMessage[],
): Set<string> {
  const lastRunIndexByTask = new Map<string, number>();
  for (const message of serverMessages) {
    const task = message.strategyTaskExecutionId;
    if (!task) continue;
    const runIndex = message.strategyTaskRunIndex ?? 0;
    lastRunIndexByTask.set(task, Math.max(lastRunIndexByTask.get(task) ?? 0, runIndex));
  }
  const absorbed = new Set<string>();
  for (const message of serverMessages) {
    const task = message.strategyTaskExecutionId;
    if (!task) continue;
    if ((message.strategyTaskRunIndex ?? 0) < (lastRunIndexByTask.get(task) ?? 0)) {
      absorbed.add(message.id);
    }
  }
  return absorbed;
}

function mergeServerMessageWithLocal(
  server: ChatMessage,
  local?: ChatMessage,
  absorbedASuccessorRun = false,
): ChatMessage {
  if (!local) return server;
  const merged: ChatMessage = { ...server };
  if (local.role === 'assistant' && server.role === 'assistant' && !absorbedASuccessorRun) {
    if ((local.content?.length ?? 0) > (server.content?.length ?? 0)) {
      merged.content = local.content;
    }
    if ((local.events?.length ?? 0) > (server.events?.length ?? 0)) {
      merged.events = local.events;
    }
  }
  if (!server.producedFiles?.length && local.producedFiles?.length) {
    merged.producedFiles = local.producedFiles;
  }
  if (!server.preTurnFileNames?.length && local.preTurnFileNames?.length) {
    merged.preTurnFileNames = local.preTurnFileNames;
  }
  if (!server.lastRunEventId && local.lastRunEventId) {
    merged.lastRunEventId = local.lastRunEventId;
  }
  if (!server.startedAt && local.startedAt) {
    merged.startedAt = local.startedAt;
  }
  if (!server.endedAt && local.endedAt) {
    merged.endedAt = local.endedAt;
  }
  if (!server.runStatus && local.runStatus) {
    merged.runStatus = local.runStatus;
  }
  return merged;
}

export function mergeServerMessagesIntoConversation(
  current: ChatMessage[],
  serverMessages: ChatMessage[],
): ChatMessage[] {
  const currentById = new Map(current.map((message) => [message.id, message]));
  const serverIds = new Set(serverMessages.map((message) => message.id));
  const absorbed = messagesThatAbsorbedASuccessorRun(serverMessages);
  const merged = serverMessages.map((message) =>
    mergeServerMessageWithLocal(
      message,
      currentById.get(message.id),
      absorbed.has(message.id),
    ),
  );
  for (const message of current) {
    if (!serverIds.has(message.id)) merged.push(message);
  }
  return normalizeConversationMessageOrder(merged);
}

export function normalizeConversationMessageOrder(messages: ChatMessage[]): ChatMessage[] {
  let normalized: ChatMessage[] | null = null;
  for (let index = 0; index < messages.length - 1; index += 1) {
    const assistant = (normalized ?? messages)[index];
    const user = (normalized ?? messages)[index + 1];
    if (
      assistant?.role !== 'assistant'
      || user?.role !== 'user'
      || typeof assistant.runId !== 'string'
      || assistant.runId.length === 0
      || typeof assistant.startedAt !== 'number'
      || typeof user.createdAt !== 'number'
      || assistant.startedAt !== user.createdAt
    ) {
      continue;
    }
    // POST /api/runs pins the assistant synchronously. Older clients persisted
    // the matching user row through a separate best-effort PUT, so the two
    // requests could land in the opposite order. The identical turn-start
    // timestamp is a narrow positive witness; unrelated assistant/user pairs
    // keep their server position.
    normalized ??= [...messages];
    normalized[index] = user;
    normalized[index + 1] = assistant;
    index += 1;
  }
  return normalized ?? messages;
}

function ensureConversationPresent(
  conversations: Conversation[],
  conversationId: string,
  projectId: string,
): Conversation[] {
  if (conversations.some((conversation) => conversation.id === conversationId)) {
    return conversations;
  }
  const now = Date.now();
  return [
    {
      id: conversationId,
      projectId,
      title: null,
      createdAt: now,
      updatedAt: now,
    },
    ...conversations,
  ];
}

interface Props {
  project: Project;
  /**
   * Exact project-bound Workspace authority resolved by the route gate.
   * Production deep links pass this instead of borrowing the shell's mutable
   * current/default Workspace. Tests and legacy embedded callers may omit it
   * and retain the existing provider behavior.
   */
  workspaceContextOverride?: WorkspaceCollabContext | null;
  /** Fresh route-bootstrap witnesses, reused to avoid repeating scope/detail reads. */
  initialWorkspaceScope?: ProjectWorkspaceScope | null;
  initialProjectDetail?: ProjectDetailSeed | null;
  /** The seeded project row is a Team-bound placeholder, not content authority. */
  initialMaterializationPending?: boolean;
  /** Workspace/member authorization lifetime for async title reads. */
  projectAuthorizationKey?: string;
  amrAuthRetryContinuation?: AmrAuthRetryContinuation | null;
  onArmAmrAuthRetryContinuation?: (
    continuation: Omit<AmrAuthRetryContinuation, 'accountIdAtArm' | 'createdAtMs'>,
  ) => void;
  onConsumeAmrAuthRetryContinuation?: (
    continuation: AmrAuthRetryContinuation,
  ) => boolean;
  onDiscardAmrAuthRetryContinuation?: (
    continuation: AmrAuthRetryContinuation,
  ) => void;
  /**
   * The current title from the team catalog when this project is shared by
   * another member. That catalog is the naming authority; the member's local
   * mirror may carry an older real name with a newer local timestamp.
   */
  authoritativeProjectName?: string;
  /** Re-read the catalog after a metadata invalidation before merging detail. */
  resolveAuthoritativeProjectName?: (
    projectId: string,
    expectedAuthorizationKey: string,
  ) => Promise<ProjectNameAuthorityResolution>;
  routeFileName: string | null;
  /**
   * Routed conversation id. When set (the URL is
   * `/projects/:id/conversations/:cid[/...]`), the project view picks
   * this conversation as active instead of defaulting to `list[0]`.
   * Falls through to the default picker if the conversation does not
   * exist (e.g. the run was deleted between the route landing and the
   * conversation list loading). Issue #1505. Optional so existing
   * test harnesses that mount ProjectView with a stub props bag do
   * not have to be updated; production callers in `App.tsx` always
   * pass the value from `useRoute()`.
   */
  routeConversationId?: string | null;
  config: AppConfig;
  agents: AgentInfo[];
  // Mentionable functional skills — already filtered by config.disabledSkills
  // upstream, so this drives only the chat composer's @-picker scope. For
  // resolving an existing project's `skillId` (which can also point at a
  // design template after the skills/design-templates split), use
  // `designTemplates` as a fallback in the skill-name / skill-mode lookups
  // below.
  skills: SkillSummary[];
  // All known design templates (unfiltered). Required so projects created
  // from the Templates surface keep composing the template body in API
  // mode even when the user later disables the template in Settings.
  designTemplates: SkillSummary[];
  designSystems: DesignSystemSummary[];
  daemonLive: boolean;
  onModeChange: (mode: AppConfig['mode']) => void;
  onAgentChange: (id: string) => void;
  onAgentModelChange: (
    id: string,
    choice: { model?: string; reasoning?: string; serviceTier?: string },
  ) => void;
  onApiModelChange?: (model: string) => void;
  onRefreshAgents: () => void;
  onOpenSettings: (section?: SettingsSection) => void;
  onOpenAmrSettings?: () => void;
  onOpenMcpSettings?: () => void;
  onBrowsePlugins?: () => void;
  onOpenConnectors?: () => void;
  // Pet wiring forwarded to the chat composer so users can adopt /
  // wake / tuck a pet without leaving the project view.
  onAdoptPetInline?: (petId: string) => void;
  onTogglePet?: () => void;
  onOpenPetSettings?: () => void;
  onBack: () => void;
  onClearPendingPrompt: () => void;
  onTouchProject: () => void;
  onProjectChange: (next: Project) => void;
  onProjectRenameStarted?: (optimistic: Project) => ProjectRenameFenceToken | null;
  onProjectRenameSettled?: (
    token: ProjectRenameFenceToken | null,
    confirmed: Project,
  ) => void;
  onProjectsRefresh: () => void;
  onDeleteProject?: (id: string) => Promise<boolean> | boolean;
  onChangeDefaultDesignSystem?: (designSystemId: string | null) => void;
  onDesignSystemsRefresh?: () => Promise<void> | void;
  onCreateProjectFromDesignSystem?: (designSystemId: string, title: string) => Promise<void> | void;
  onCreateDesignSystemFromProject?: (
    sourceProjectId: string,
    input: { name?: string; pendingPrompt?: string },
  ) => Promise<void> | void;
  onDuplicateProject?: (
    sourceProjectId: string,
    input?: { name?: string },
  ) => Promise<void> | void;
  /** Lets the shell spend the optional memory-notification SSE slot only while
   * this project can produce a post-run extraction. */
  onRunActivityChange?: (projectId: string, active: boolean) => void;
}

export type ProjectRenameFenceToken = Readonly<{
  accountGeneration: number;
  scopeKey: string;
  projectId: string;
  mutationVersion: number;
}>;

interface QueuedChatSend {
  id: string;
  conversationId: string;
  prompt: string;
  attachments: ChatAttachment[];
  commentAttachments: ChatCommentAttachment[];
  meta?: ProjectChatSendMeta;
  createdAt: number;
}

interface QueuedChatSendUpdate {
  prompt: string;
  attachments: ChatAttachment[];
  commentAttachments: ChatCommentAttachment[];
  meta?: ProjectChatSendMeta;
}

let liveArtifactEventSequence = 0;
// The brand-extraction project's design-system (brand kit) preview tab. Mirrors
// the daemon `BRAND_KIT_FILE` (apps/daemon/src/brands/kit-render.ts); kept as a
// local literal to respect the web↔daemon boundary.
const BRAND_KIT_FILE = 'brand.html';
const BRAND_EMPTY_TRANSCRIPT_RETRY_DELAYS_MS = [120, 500, 1_200, 2_000] as const;
const CHAT_PANEL_WIDTH_STORAGE_KEY = 'open-design.project.chatPanelWidth';
const DEFAULT_CHAT_PANEL_WIDTH = 460;
const MIN_CHAT_PANEL_WIDTH = 345;
const MAX_CHAT_PANEL_WIDTH = 720;
const MIN_WORKSPACE_PANEL_WIDTH = 400;
const SPLIT_RESIZE_HANDLE_WIDTH = 8;
const BYOK_OPENCODE_UNAVAILABLE_MESSAGE =
  'BYOK API runs require OpenCode. Install OpenCode, then rescan local agents in Settings before retrying.';
const BYOK_PROVIDER_REQUIRED_MESSAGE =
  'BYOK OpenCode requires a provider, API key, and model. Complete BYOK settings before starting a run.';
const BEDROCK_BYOK_UNSUPPORTED_MESSAGE =
  'AWS Bedrock BYOK chat requires AWS credential signing and is not supported by the current API-key proxy.';
const CHAT_PANEL_KEYBOARD_STEP = 16;
const DESIGN_SYSTEM_AUDIT_AUTO_REPAIR_ATTEMPTS = 2;
// The conversations list 404s while a project is not yet in the local daemon DB.
// For a personal project that is a transient blip, but opening a TEAM-SHARED
// project a member has not pulled yet only registers it locally after the collab
// status resolves and the auto-pull completes — several seconds against a remote
// collab backend (e.g. a packaged feature-env build round-tripping through vela).
// The old ~1s window ran out mid-pull and surfaced a hard "conversations 404"
// error on first open of a shared project. Retry on the 404 long enough to cover
// that sync (~12s); a genuinely missing project is rare on this path (the user
// navigated in from a real project list) and still surfaces the error afterward.
const CONVERSATION_LOAD_RETRY_DELAYS_MS = [
  120, 300, 600, 1000, 1500, 2000, 2500, 3500,
] as const;
type ConversationMaterializationRecovery = {
  projectId: string;
  authorityKey: string;
  generation: number;
  workspaceContext: WorkspaceCollabContext;
  errorMessage: string;
};
export function reconcileConversationRecoveryGlobalError(
  current: string | null,
  previousConversationError: string,
  nextConversationError: string,
): string {
  return current === null || current === previousConversationError
    ? nextConversationError
    : current;
}
export function createConversationMaterializationGenerationController() {
  let current = 0;
  return {
    begin(): number {
      current += 1;
      return current;
    },
    invalidate(generation: number): void {
      if (current === generation) current += 1;
    },
    isCurrent(generation: number): boolean {
      return current === generation;
    },
  };
}
// Trailing-debounce window for the canonical (daemon + SQLite) tab-state write.
// Embedded-browser navigation bursts settle well within this; the local cache
// is written immediately so nothing is lost if the daemon write is coalesced.
const TAB_PERSIST_DEBOUNCE_MS = 400;
// The generic browser-side SSE reconnect-budget exhaustion message emitted by
// consumeDaemonRun when the daemon status fetch still shows the run as
// queued/running (providers/daemon.ts).  Both the live-stream onError and the
// reattach-stream onError share this message; neither constitutes an
// authoritative terminal failure.  Use isGenericDaemonDisconnect() at both
// sites so generic disconnects stay eligible for attachRecoverableRuns to
// re-query daemon authoritative status on the next tick.
function isGenericDaemonDisconnect(err: unknown): boolean {
  return err instanceof Error && (
    (err as Error & { code?: string }).code === GENERIC_DAEMON_DISCONNECT_CODE ||
    err.message === GENERIC_DAEMON_DISCONNECT_MESSAGE
  );
}

// A persisted status/error event represents a generic daemon disconnect when
// either its structured `code` matches GENERIC_DAEMON_DISCONNECT_CODE, OR
// (legacy rows persisted before this code was introduced) its `detail`
// equals the canonical GENERIC_DAEMON_DISCONNECT_MESSAGE with no code set.
// Mirrors isGenericDaemonDisconnect() above, which checks the equivalent
// code-or-message pair on live Error objects for the same reason.
function hasGenericDisconnectFailureEvent(message: ChatMessage): boolean {
  return (message.events ?? []).some(
    (event) =>
      event.kind === 'status' &&
      event.label === 'error' &&
      (event.code === GENERIC_DAEMON_DISCONNECT_CODE ||
        event.detail === GENERIC_DAEMON_DISCONNECT_MESSAGE),
  );
}
const MIN_NORMAL_SPLIT_WIDTH =
  MIN_CHAT_PANEL_WIDTH + SPLIT_RESIZE_HANDLE_WIDTH + MIN_WORKSPACE_PANEL_WIDTH;
type DesignSystemReviewEntry = NonNullable<ProjectMetadata['designSystemReview']>[string];
type DesignSystemReviewAgentTask = NonNullable<DesignSystemReviewEntry['agentTask']>;
interface DesignSystemReviewDetails {
  feedback?: string;
  files?: string[];
  agentTask?: DesignSystemReviewAgentTask;
}

function workspacePanelMinWidthForSplit(splitWidth: number): number {
  if (!Number.isFinite(splitWidth) || splitWidth <= 0) return MIN_WORKSPACE_PANEL_WIDTH;
  return splitWidth < MIN_NORMAL_SPLIT_WIDTH ? 0 : MIN_WORKSPACE_PANEL_WIDTH;
}

function maxChatPanelWidthForSplit(splitWidth: number): number {
  if (!Number.isFinite(splitWidth) || splitWidth <= 0) return MAX_CHAT_PANEL_WIDTH;
  const workspaceMinWidth = workspacePanelMinWidthForSplit(splitWidth);
  const viewportAwareMax = splitWidth - SPLIT_RESIZE_HANDLE_WIDTH - workspaceMinWidth;
  return Math.max(0, Math.min(MAX_CHAT_PANEL_WIDTH, Math.floor(viewportAwareMax)));
}

function clampPreferredChatPanelWidth(width: number): number {
  return Math.min(MAX_CHAT_PANEL_WIDTH, Math.max(MIN_CHAT_PANEL_WIDTH, Math.round(width)));
}

function clampChatPanelWidth(width: number, maxWidth = MAX_CHAT_PANEL_WIDTH): number {
  const effectiveMax = Math.max(0, Math.min(MAX_CHAT_PANEL_WIDTH, Math.floor(maxWidth)));
  const effectiveMin = Math.min(MIN_CHAT_PANEL_WIDTH, effectiveMax);
  return Math.min(effectiveMax, Math.max(effectiveMin, Math.round(width)));
}

function designSystemFeedbackAttachments(
  projectFiles: ProjectFile[],
  sectionFiles: string[],
): ChatAttachment[] {
  const fileLookup = new Map(projectFiles.map((file) => [file.name, file]));
  return sectionFiles
    .map((name) => fileLookup.get(name))
    .filter((file): file is ProjectFile => Boolean(file))
    .slice(0, 8)
    .map((file) => ({
      path: file.name,
      name: file.name,
      kind: file.kind === 'image' ? 'image' : 'file',
      size: file.size,
    }));
}

function brandExtractionPreviewFileName(projectFiles: readonly ProjectFile[]): string {
  return (
    projectFiles.find((file) => file.name === 'brand.html')?.name ??
    projectFiles.find((file) => file.name.endsWith('/brand.html'))?.name ??
    'brand.html'
  );
}

function buildBrandAgentExtractionContinuationPrompt(input: {
  promptSeed?: string | null;
  metadata?: ProjectMetadata | null;
  projectFiles: readonly ProjectFile[];
}): string {
  const trimmed = input.promptSeed?.trim() ?? '';
  const brandId = input.metadata?.brandId?.trim() || '(current brand id)';
  const sourceUrl = input.metadata?.brandSourceUrl?.trim() || 'the source website';
  const base = /DESIGN SYSTEM EXTRACTION|ready design system is NOT guaranteed/i.test(trimmed)
    ? trimmed
    : [
        `Continue the AI design-system extraction for ${sourceUrl}.`,
        `Brand id: ${brandId}`,
        '',
        'The programmatic pass has not produced a ready design system yet. Continue from the current brand.html scaffold and saved project files; do not assume the design system is ready, and do not create a duplicate design-system id.',
        '',
        'Inspect brand.html, brand.json, DESIGN.md, BRAND.md, context/, logos/, imagery/, fonts/, and system assets. Measure the source website when reachable. If the live page is an anti-bot verification interstitial, ask the user to clear it in the Browser tab before continuing.',
        '',
        `Write valid partial brand.json updates progressively, run od brand preview ${brandId} after meaningful field groups, then run od brand finalize ${brandId} when the kit is complete. Fix validation errors and keep updating the same registered design system in place.`,
      ].join('\n');
  const visibleFiles = input.projectFiles
    .filter((file) => file.name.trim())
    .slice(0, 80)
    .map((file) => `  - ${file.name}${file.size > 0 ? ` (${Math.round(file.size / 1024)}KB)` : ''}`);
  if (visibleFiles.length === 0 || base.includes('Current brand extraction continuation context:')) {
    return base;
  }
  return [
    base,
    '',
    'Current brand extraction continuation context:',
    `- Source URL: ${sourceUrl}`,
    `- Brand id: ${brandId}`,
    '- Files visible in the project right now:',
    ...visibleFiles,
  ].join('\n');
}

function designSystemNameForSourceProject(project: Project): string {
  const sourceName = project.name.trim() || 'Untitled';
  return /\bdesign system\b/i.test(sourceName)
    ? sourceName
    : `${sourceName} Design System`;
}

function buildCreateDesignSystemFromProjectPrompt(input: {
  project: Project;
  projectFiles: readonly ProjectFile[];
  activeDesignSystem?: DesignSystemSummary | null;
}): string {
  const visibleFiles = input.projectFiles
    .filter((file) => file.name.trim())
    .slice(0, 140)
    .map((file) => `  - ${file.name}${file.size > 0 ? ` (${Math.round(file.size / 1024)}KB)` : ''}`);
  const metadataJson = input.project.metadata
    ? JSON.stringify(input.project.metadata, null, 2)
    : '{}';
  const activeDesignSystem = input.activeDesignSystem
    ? [
        `- Active design system id: ${input.activeDesignSystem.id}`,
        `- Active design system title: ${input.activeDesignSystem.title}`,
      ]
    : ['- Active design system: (none)'];
  return [
    'Create this project as a complete OpenDesign design system workspace.',
    '',
    'Autonomy requirement:',
    '- Do not ask setup or clarification questions during design-system generation.',
    '- Do not emit `<question-form>`, "Quick brief — 30 seconds", direction cards, choice cards, or any UI that waits for user input.',
    '- The source project already contains the evidence. Choose sensible defaults where details are missing and begin generating the design-system artifacts immediately.',
    '',
    'Source project handoff:',
    `- Source project id: ${input.project.id}`,
    `- Source project name: ${input.project.name}`,
    ...activeDesignSystem,
    '- Read `context/source-context.md` first. It lists the copied project files and original project metadata.',
    '- Treat every copied file, uploaded asset, reference image, browser snapshot, sketch, generated artifact, and context note in this workspace as design-system evidence.',
    '- Use the copied project outputs to infer real visual language, components, layout, interaction patterns, copy tone, tokens, typography, spacing, assets, and anti-patterns.',
    '- Do not create another project or another design-system id. Update this new design-system project in place.',
    '',
    'Source project metadata:',
    '```json',
    metadataJson,
    '```',
    '',
    'Visible copied files to inspect:',
    ...(visibleFiles.length > 0 ? visibleFiles : ['  - (none listed yet; rely on context/source-context.md after the copy finishes)']),
    input.projectFiles.length > visibleFiles.length
      ? `  - ...and ${input.projectFiles.length - visibleFiles.length} more files listed in context/source-context.md`
      : '',
    '',
    'Expected output:',
    '- A clear `DESIGN.md` with product context, visual foundations, color, type, spacing, layout, components, motion, voice, and anti-patterns.',
    '- A reusable package: `README.md`, `SKILL.md`, `colors_and_type.css`, provenance notes, `assets/`, `build/` when runtime icons exist, optional `fonts/`, focused `preview/` cards, preserved source examples, and `ui_kits/app/`.',
    '- Preserve real source assets when evidence provides them: logos, app icons, tray icons, avatars, wordmarks, imagery, and font files belong in `assets/`, `build/`, or `fonts/`, not only in prose.',
    '- Preserve high-signal source/component examples outside `context/` when copied files include substantial implementation or artifact code. Do not replace them with tiny stubs.',
    '- Split review previews into focused cards for colors, typography, spacing, radius/shadows, components, brand assets, and applied UI surfaces. Preview cards must visibly load preserved files when available.',
    '- Build `ui_kits/app/` as an applied interface kit that reflects the source project, with an index page and component files when the evidence supports them. Do not leave it as a generic static mock.',
    '- Keep `README.md`, `SKILL.md`, `DESIGN.md`, preview manifest text, and `ui_kits/app/README.md` synchronized with the final file structure.',
    '',
    'Completion gate:',
    '- Finish only after the project contains reviewable design-system artifacts and the right-side Design System tab can inspect them.',
    '- Before your final response, run `"$OD_NODE_BIN" "$OD_BIN" tools connectors design-system-package-audit --path . --fail-on-warnings`.',
    '- Fix every audit error and design-quality warning. If an issue cannot be fixed because source evidence is missing, explain that blocker instead of claiming the design system is ready.',
    '',
    'When finished, summarize the generated files and name the first previews reviewers should inspect.',
  ].filter(Boolean).join('\n');
}

function chatAttachmentsFromPreviewCommentImages(
  images: PreviewCommentAttachment[] | undefined,
): ChatAttachment[] {
  if (!Array.isArray(images)) return [];
  const seen = new Set<string>();
  const out: ChatAttachment[] = [];
  for (const image of images) {
    const path = image.path.trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    out.push({
      path,
      name: image.name.trim() || path.split('/').pop() || path,
      kind: 'image',
    });
  }
  return out;
}

function mergeChatAttachments(...groups: ChatAttachment[][]): ChatAttachment[] {
  const seen = new Set<string>();
  const out: ChatAttachment[] = [];
  for (const group of groups) {
    for (const attachment of group) {
      const path = attachment.path.trim();
      if (!path || seen.has(path)) continue;
      seen.add(path);
      out.push({ ...attachment, path });
    }
  }
  return out;
}

function historyWithWorkspaceContext(
  history: ChatMessage[],
  messageId: string,
  context: ChatSendMeta['context'] | undefined,
): ChatMessage[] {
  const items = context?.workspaceItems ?? [];
  if (items.length === 0) return history;
  const block = [
    '',
    '',
    '<active-workspace-context>',
    'OpenDesign selected or inferred these workspace contexts for this turn. Treat absolute paths as reference context unless the user explicitly asks to edit them.',
    ...items.map((item, index) => {
      const details = [
        item.path ? `path: ${item.path}` : null,
        item.absolutePath ? `absolute: ${item.absolutePath}` : null,
        item.url ? `url: ${item.url}` : null,
        item.title ? `title: ${item.title}` : null,
        item.tabId ? `tab: ${item.tabId}` : null,
      ].filter(Boolean).join(' | ');
      return `${index + 1}. ${item.kind}: ${item.label}${details ? ` | ${details}` : ''}`;
    }),
    '</active-workspace-context>',
  ].join('\n');
  return history.map((message) =>
    message.id === messageId && message.role === 'user'
      ? { ...message, content: `${message.content}${block}` }
      : message,
  );
}

function commentTaskQuery(attachment: ChatCommentAttachment): string {
  return (attachment.comment ?? '').trim();
}

function commentTaskContextAttachment(attachment: ChatCommentAttachment): ChatCommentAttachment {
  return {
    ...attachment,
    comment: '',
    commentContext: 'query',
  };
}

function designSystemNeedsWorkPrompt(
  sectionTitle: string,
  feedback: string,
  sectionFiles: string[],
): string {
  const fileList =
    sectionFiles.length > 0
      ? sectionFiles.map((name) => `- @${name}`).join('\n')
      : '- No generated files are registered for this section yet.';
  return (
    `Needs work on the design system section "${sectionTitle}".\n\n` +
    `User feedback:\n${feedback}\n\n` +
    `Relevant section files:\n${fileList}\n\n` +
    'Revise the design-system project files directly. Keep DESIGN.md, tokens, previews, UI kit examples, and assets consistent with the feedback. ' +
    'After editing, summarize what changed and which files should be reviewed again.'
  );
}

function readSavedChatPanelWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_CHAT_PANEL_WIDTH;
  try {
    const raw = window.localStorage.getItem(CHAT_PANEL_WIDTH_STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isFinite(parsed)
      ? clampPreferredChatPanelWidth(parsed)
      : DEFAULT_CHAT_PANEL_WIDTH;
  } catch {
    return DEFAULT_CHAT_PANEL_WIDTH;
  }
}

function saveChatPanelWidth(width: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CHAT_PANEL_WIDTH_STORAGE_KEY,
      String(clampPreferredChatPanelWidth(width)),
    );
  } catch {
    // localStorage can be unavailable in hardened browser contexts.
  }
}

function autoSendFirstMessageKey(projectId: string): string {
  return `od:auto-send-first:${projectId}`;
}

function stableHandoffProjectDigest(projectId: string): string {
  // FNV-1a 64-bit keeps the daemon-facing id bounded while preserving a
  // deterministic identity across retries and ProjectView remounts.
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < projectId.length; index += 1) {
    hash ^= BigInt(projectId.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(36).padStart(13, '0');
}

function homeAutoSendIdentity(projectId: string): Pick<
  ProjectChatSendMeta,
  'assistantMessageId' | 'clientRequestId' | 'userMessageId'
> {
  const handoffId = `home-auto-send-${stableHandoffProjectDigest(projectId)}`;
  return {
    clientRequestId: handoffId,
    userMessageId: `${handoffId}-user`,
    assistantMessageId: `${handoffId}-assistant`,
  };
}

function autoSendPromptKey(projectId: string): string {
  return `od:auto-send-prompt:${projectId}`;
}

function autoSendAttachmentsKey(projectId: string): string {
  return `od:auto-send-attachments:${projectId}`;
}

function autoSendContextKey(projectId: string): string {
  return `od:auto-send-context:${projectId}`;
}

/** Exact workspace/member authority checked by the Home AMR preflight. */
function autoSendAmrGateWitnessKey(projectId: string): string {
  return `od:auto-send-amr-gate-witness:${projectId}`;
}

function legacyAutoSendAmrGateOkKey(projectId: string): string {
  return `od:auto-send-amr-gate-ok:${projectId}`;
}

function designSystemAuditAutoRepairKey(projectId: string): string {
  return `od:design-system-audit-auto-repair:${projectId}`;
}

function readAutoSendAttachments(projectId: string): ChatAttachment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(autoSendAttachmentsKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredChatAttachment);
  } catch {
    return [];
  }
}

function readAutoSendPrompt(projectId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(autoSendPromptKey(projectId));
  } catch {
    return null;
  }
}

function readAutoSendContext(projectId: string): RunContextSelection | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(autoSendContextKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isStoredRunContextSelection(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readAutoSendAmrGateWitness(
  projectId: string,
): AmrBalanceGateScope | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.sessionStorage.getItem(
      autoSendAmrGateWitnessKey(projectId),
    );
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    return isAmrBalanceGateScope(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function clearAutoSendSession(projectId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(autoSendFirstMessageKey(projectId));
    window.sessionStorage.removeItem(autoSendPromptKey(projectId));
    window.sessionStorage.removeItem(autoSendAttachmentsKey(projectId));
    window.sessionStorage.removeItem(autoSendContextKey(projectId));
    window.sessionStorage.removeItem(autoSendAmrGateWitnessKey(projectId));
    window.sessionStorage.removeItem(legacyAutoSendAmrGateOkKey(projectId));
  } catch {
    /* ignore */
  }
}

function markDesignSystemAuditAutoRepairEligible(projectId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      designSystemAuditAutoRepairKey(projectId),
      String(DESIGN_SYSTEM_AUDIT_AUTO_REPAIR_ATTEMPTS),
    );
  } catch {
    /* ignore */
  }
}

function consumeDesignSystemAuditAutoRepair(projectId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = designSystemAuditAutoRepairKey(projectId);
    const raw = window.sessionStorage.getItem(key);
    const attemptsRemaining = raw ? Number.parseInt(raw, 10) : 0;
    if (!Number.isFinite(attemptsRemaining) || attemptsRemaining <= 0) {
      window.sessionStorage.removeItem(key);
      return false;
    }
    const nextAttemptsRemaining = attemptsRemaining - 1;
    if (nextAttemptsRemaining > 0) {
      window.sessionStorage.setItem(key, String(nextAttemptsRemaining));
    } else {
      window.sessionStorage.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}

function clearDesignSystemAuditAutoRepair(projectId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(designSystemAuditAutoRepairKey(projectId));
  } catch {
    /* ignore */
  }
}

function isDesignSystemWorkspaceMetadata(metadata: ProjectMetadata | undefined): boolean {
  return metadata?.importedFrom === 'design-system';
}

function isStoredChatAttachment(value: unknown): value is ChatAttachment {
  if (value === null || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.path === 'string' &&
    record.path.length > 0 &&
    typeof record.name === 'string' &&
    record.name.length > 0 &&
    (record.kind === 'image' || record.kind === 'file') &&
    (record.size === undefined || typeof record.size === 'number') &&
    (record.order === undefined || typeof record.order === 'number')
  );
}

function isStoredStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isStoredWorkspaceContextItem(value: unknown): value is WorkspaceContextItem {
  if (value === null || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    record.id.length > 0 &&
    typeof record.kind === 'string' &&
    record.kind.length > 0 &&
    typeof record.label === 'string' &&
    record.label.length > 0 &&
    (record.tabId === undefined || typeof record.tabId === 'string') &&
    (record.path === undefined || typeof record.path === 'string') &&
    (record.absolutePath === undefined || typeof record.absolutePath === 'string') &&
    (record.url === undefined || typeof record.url === 'string') &&
    (record.title === undefined || typeof record.title === 'string')
  );
}

function isStoredRunContextSelection(value: unknown): value is RunContextSelection {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.skillIds === undefined || isStoredStringArray(record.skillIds)) &&
    (record.pluginIds === undefined || isStoredStringArray(record.pluginIds)) &&
    (record.mcpServerIds === undefined || isStoredStringArray(record.mcpServerIds)) &&
    (record.connectorIds === undefined || isStoredStringArray(record.connectorIds)) &&
    (
      record.workspaceItems === undefined ||
      (Array.isArray(record.workspaceItems) &&
        record.workspaceItems.every(isStoredWorkspaceContextItem))
    )
  );
}

function fallbackDesignSystemSummaryForProject(
  project: Project,
  designSystemId: string | null,
): DesignSystemSummary | null {
  if (!designSystemId || !isDesignSystemProject(project)) return null;
  const metadata = project.metadata;
  const sourceUrl = metadata?.brandSourceUrl?.trim() || null;
  const title =
    metadata?.sourceFileName?.trim()
    || project.name.replace(/\s+Design System\s*$/i, '').trim()
    || project.name
    || 'Design system';
  return {
    id: designSystemId,
    title,
    category: 'Brands',
    summary: sourceUrl ? `Draft design system extracted from ${sourceUrl}.` : '',
    swatches: [],
    surface: 'web',
    source: 'user',
    status: 'draft',
    isEditable: true,
    projectId: project.id,
    ...(sourceUrl
      ? { provenance: { sourceUrls: [sourceUrl], sourceNotes: `Extracting from ${sourceUrl}` } }
      : {}),
  };
}

function isBrandStatusValue(value: unknown): value is BrandStatus {
  return value === 'extracting' || value === 'needs_input' || value === 'ready' || value === 'failed';
}

function brandExtractionAllowsEditing(status: BrandStatus | null): boolean {
  return status === 'ready' || status === 'failed';
}

function normalizedBrandBrowserHost(parsed: URL): string {
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  return parsed.port ? `${hostname}:${parsed.port}` : hostname;
}

type BrowserExtractionUrlParts = {
  host: string;
  pathname: string;
  search: string;
};

function normalizedBrandBrowserPathname(pathname: string): string {
  const withoutTrailingSlash = pathname.replace(/\/+$/, '');
  return withoutTrailingSlash || '/';
}

function browserExtractionUrlParts(value: string | null | undefined): BrowserExtractionUrlParts | null {
  const url = value?.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      host: normalizedBrandBrowserHost(parsed),
      pathname: normalizedBrandBrowserPathname(parsed.pathname),
      search: parsed.search,
    };
  } catch {
    return null;
  }
}

function isBrandBrowserHomeRedirectPath(pathname: string): boolean {
  if (pathname === '/home') return true;
  return /^\/[a-z]{2}(?:-[a-z]{2})?$/i.test(pathname);
}

function brandBrowserSnapshotMatchesSource(
  snapshotBaseUrl: string,
  sourceUrl: string | null | undefined,
): boolean {
  const snapshot = browserExtractionUrlParts(snapshotBaseUrl);
  const source = browserExtractionUrlParts(sourceUrl);
  if (!snapshot || !source || snapshot.host !== source.host) return false;
  if (snapshot.pathname === source.pathname && snapshot.search === source.search) return true;
  return (
    source.pathname === '/'
    && source.search === ''
    && snapshot.search === ''
    && isBrandBrowserHomeRedirectPath(snapshot.pathname)
  );
}

function workspaceContextItemEqual(
  a: WorkspaceContextItem | null,
  b: WorkspaceContextItem | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.kind === b.kind &&
    a.label === b.label &&
    (a.tabId ?? '') === (b.tabId ?? '') &&
    (a.path ?? '') === (b.path ?? '') &&
    (a.absolutePath ?? '') === (b.absolutePath ?? '') &&
    (a.url ?? '') === (b.url ?? '') &&
    (a.title ?? '') === (b.title ?? '')
  );
}

function workspaceContextItemsEqual(
  a: WorkspaceContextItem[],
  b: WorkspaceContextItem[],
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((item, index) => workspaceContextItemEqual(item, b[index] ?? null));
}

function appendLiveArtifactEventItem(
  prev: LiveArtifactEventItem[],
  event: LiveArtifactEventItem['event'],
): LiveArtifactEventItem[] {
  liveArtifactEventSequence += 1;
  const next = [...prev, { id: liveArtifactEventSequence, event }];
  return next.length > 50 ? next.slice(next.length - 50) : next;
}

export function projectSplitClassName(workspaceFocused: boolean): string {
  return workspaceFocused ? 'split split-focus' : 'split';
}

/**
 * Whether a project open should start with the chat pane collapsed (workspace
 * focus mode). Uses `useProjectCollab`'s confirmed shared-non-owner signal
 * (`isSharedNonOwner`) — not raw `isOwner` — so a catalog-confirmed owner whose
 * `/collab/status` payload is still missing `ownerMemberId` does not latch into
 * focus mode permanently (review: sticky apply ref).
 */
export function shouldDefaultCollapseChatForSharedNonOwner(collab: {
  enabled: boolean;
  isSharedNonOwner: boolean;
}): boolean {
  return collab.enabled && collab.isSharedNonOwner;
}

// React key for the on-screen question form. Deliberately does NOT include the
// form's parsed `id`: there is at most one (first) form per assistant message,
// so `${conversation}:${message}` is already a stable, unique identity for the
// occurrence. Folding the parsed id in would remount the panel mid-stream — the
// preview shows the `discovery` fallback until the body `id` streams in, and a
// form that emits answerable questions before its `id` would flip identity
// while the user is mid-answer, dropping their selections. A distinct later
// form lives in a different assistant message, so it still gets its own key
// (and replays the reveal) without relying on the id.
export function buildQuestionFormKey(
  conversationId: string | null,
  assistantMessageId: string | null,
  hasForm: boolean,
): string | null {
  return conversationId && assistantMessageId && hasForm
    ? `${conversationId}:${assistantMessageId}`
    : null;
}

type ProjectSplitStyle = CSSProperties & {
  '--project-chat-panel-width': string;
  '--project-chat-handle-width': string;
  '--project-workspace-panel-track': string;
};

export function projectSplitStyle(
  workspaceFocused: boolean,
  chatPanelWidth: number,
  workspacePanelTrack: string,
): ProjectSplitStyle | undefined {
  if (workspaceFocused) return undefined;
  return {
    '--project-chat-panel-width': `${chatPanelWidth}px`,
    '--project-chat-handle-width': `${SPLIT_RESIZE_HANDLE_WIDTH}px`,
    '--project-workspace-panel-track': workspacePanelTrack,
  };
}

// Writes the two animatable width custom properties directly (see the
// `@property` registrations + `.split` / `.split.split-focus` transition
// rules in shell.css) instead of composing a `gridTemplateColumns` string —
// the grid layout is always driven by
// `var(--project-chat-panel-width) var(--project-chat-handle-width) var(--project-workspace-panel-track)`
// declared once on `.split`, so a plain custom-property write is all a
// collapse/expand or a live resize needs to animate or track the cursor.
function applySplitChatPanelWidth(
  split: HTMLDivElement | null,
  width: number,
  workspacePanelTrack: string,
  workspaceFocused: boolean,
): void {
  if (!split) return;
  if (workspaceFocused) {
    // Workspace-focused mode collapses the chat column through the
    // `.split-focus` CSS class alone (see `projectSplitStyle`, which
    // deliberately returns no inline style while focused). A resize firing
    // while focused still reaches this function via the ResizeObserver
    // effect below; without this guard it would write stale inline width
    // overrides back onto the element, which — as inline styles — outrank
    // the `.split-focus` class rule's `0px` values and reintroduce the
    // (hidden, so blank) chat column as dead space.
    split.style.removeProperty('--project-chat-panel-width');
    split.style.removeProperty('--project-chat-handle-width');
    split.style.removeProperty('--project-workspace-panel-track');
    return;
  }
  split.style.setProperty('--project-chat-panel-width', `${width}px`);
  split.style.setProperty('--project-chat-handle-width', `${SPLIT_RESIZE_HANDLE_WIDTH}px`);
  split.style.setProperty('--project-workspace-panel-track', workspacePanelTrack);
}

// The media model the user picked in the New Project → Media dialog, keyed by
// surface. For BYOK providers (AIHubMix) media is produced by the generate_*
// chat tools whose default model comes from the per-request byok*Model field —
// NOT the `od media generate` dispatcher — so without this seed the dialog pick
// is dropped and the conversation falls back to the Settings default. Returns
// undefined for non-media projects (and when the field is empty) so callers fall
// back to the Settings default exactly as before. The daemon re-validates the id
// against the active provider's registry, so a mismatched pick is safely ignored.
function projectMediaModelSeed(
  metadata: ProjectMetadata | null | undefined,
  surface: 'image' | 'video' | 'speech',
): string | undefined {
  if (!metadata) return undefined;
  if (surface === 'image' && metadata.kind === 'image') {
    return metadata.imageModel?.trim() || undefined;
  }
  if (surface === 'video' && metadata.kind === 'video') {
    return metadata.videoModel?.trim() || undefined;
  }
  if (surface === 'speech' && metadata.kind === 'audio' && metadata.audioKind === 'speech') {
    return metadata.audioModel?.trim() || undefined;
  }
  return undefined;
}

function projectMediaVoiceSeed(
  metadata: ProjectMetadata | null | undefined,
): string | undefined {
  if (metadata?.kind === 'audio' && metadata.audioKind === 'speech') {
    return metadata.voice?.trim() || undefined;
  }
  return undefined;
}

// Carry the creation-time model pick into the conversation ONLY when it belongs
// to the active BYOK provider. Guards against clobbering a user's Settings
// default with a model from a different provider — e.g. a SenseAudio user whose
// image project was created with the dialog's default `vela/gpt-image-2` keeps their
// configured SenseAudio model instead of being forced to the registry default.
// AIHubMix's live (`aihubmix-` prefixed) ids resolve via mediaModelProviderId
// without waiting on the async catalogue, so the AIHubMix path still seeds.
function byokModelSeedForProtocol(
  metadata: ProjectMetadata | null | undefined,
  surface: 'image' | 'video' | 'speech',
  protocol: string | undefined,
): string | undefined {
  const picked = projectMediaModelSeed(metadata, surface);
  if (!picked) return undefined;
  return mediaModelProviderId(picked) === protocol ? picked : undefined;
}

function firstNonBlank(...values: Array<string | null | undefined>): string {
  return values.find((value) => value?.trim())?.trim() ?? '';
}

function byokMediaDefaultsForRun(input: {
  imageModelOverride: string;
  videoModelOverride: string;
  speechModelOverride: string;
  speechVoiceOverride: string;
  config: Pick<AppConfig, 'byokImageModel' | 'byokVideoModel' | 'byokSpeechModel' | 'byokSpeechVoice'>;
  imageModelOptions: readonly { id: string }[];
  videoModelOptions: readonly { id: string }[];
  speechModelOptions: readonly { id: string }[];
}): ByokMediaDefaults {
  const imageModel = firstNonBlank(
    input.imageModelOverride,
    input.config.byokImageModel,
    input.imageModelOptions[0]?.id,
  );
  const videoModel = firstNonBlank(
    input.videoModelOverride,
    input.config.byokVideoModel,
    input.videoModelOptions[0]?.id,
  );
  const speechModel = firstNonBlank(
    input.speechModelOverride,
    input.config.byokSpeechModel,
    input.speechModelOptions[0]?.id,
  );
  const speechVoice = firstNonBlank(
    input.speechVoiceOverride,
    input.config.byokSpeechVoice,
  );
  return {
    ...(imageModel ? { imageModel } : {}),
    ...(videoModel ? { videoModel } : {}),
    ...(speechModel ? { speechModel } : {}),
    ...(speechVoice ? { speechVoice } : {}),
  };
}

function byokOpenCodeProviderFromConfig(
  config: AppConfig,
): ByokChatProviderConfig | undefined {
  if (!isOpenCodeByokChatProtocol(config.apiProtocol)) return undefined;
  const selectedProvider = selectedKnownProviderForConfig(config);
  const model = config.model.trim();
  if (
    (byokProviderRequiresApiKey(config.apiProtocol, selectedProvider, config.baseUrl)
      && !config.apiKey.trim())
    || !model
    || model.toLowerCase() === 'default'
    || (config.apiProtocol === 'azure' && !config.baseUrl.trim())
  ) {
    return undefined;
  }
  return {
    protocol: config.apiProtocol,
    apiKey: config.apiKey.trim(),
    baseUrl: config.baseUrl.trim(),
    model,
    ...(config.apiProtocol === 'azure' && config.apiVersion?.trim()
      ? { apiVersion: config.apiVersion.trim() }
      : {}),
    requiresApiKey: byokProviderRequiresApiKey(
      config.apiProtocol,
      selectedProvider,
      config.baseUrl,
    ),
  };
}

function selectedKnownProviderForConfig(config: AppConfig) {
  if (!config.apiProtocol) return undefined;
  return KNOWN_PROVIDERS.find(
    (provider) =>
      provider.protocol === config.apiProtocol
      && provider.baseUrl === config.baseUrl
      && (
        config.apiProviderBaseUrl == null
        || provider.baseUrl === config.apiProviderBaseUrl
      ),
  );
}

function isOpenCodeByokChatProtocol(
  protocol: AppConfig['apiProtocol'],
): protocol is ByokChatProtocol {
  return (
    protocol === 'anthropic' ||
    protocol === 'openai' ||
    protocol === 'azure' ||
    protocol === 'google' ||
    protocol === 'ollama' ||
    protocol === 'senseaudio' ||
    protocol === 'aihubmix'
  );
}

function projectEventToAgentEvent(evt: ProjectEvent): LiveArtifactEventItem['event'] | null {
  if (evt.type === 'file-changed') return null;
  if (evt.type === 'conversation-created') return null;
  // Collab realtime hop-2 invalidations are handled directly in
  // `handleProjectEvent` (they trigger targeted re-fetches, not artifact cards).
  if (
    evt.type === 'comment-changed' ||
    evt.type === 'presence-changed' ||
    evt.type === 'project-metadata-changed' ||
    evt.type === 'project-content-transfer-state'
  ) {
    return null;
  }
  if (evt.type === 'live_artifact') {
    return {
      kind: 'live_artifact',
      action: evt.action,
      projectId: evt.projectId,
      artifactId: evt.artifactId,
      title: evt.title,
      refreshStatus: evt.refreshStatus,
    };
  }
  return {
    kind: 'live_artifact_refresh',
    phase: evt.phase,
    projectId: evt.projectId,
    artifactId: evt.artifactId,
    refreshId: evt.refreshId,
    title: evt.title,
    refreshedSourceCount: evt.refreshedSourceCount,
    error: evt.error,
  };
}

function artifactWithHtml(
  artifact: Artifact | null,
  fallbackIdentifier: string,
  html: string,
): Artifact {
  return artifact
    ? { ...artifact, html }
    : {
        identifier: fallbackIdentifier,
        title: '',
        html,
      };
}

const SHARED_PROJECT_PLACEHOLDER_NAME = '共享项目';

export type ProjectNameAuthorityResolution =
  | { kind: 'resolved'; name: string | null }
  | { kind: 'stale' };

/**
 * Reconcile the route/list snapshot with the daemon detail response.
 *
 * A shared-project placeholder is created locally with `updatedAt = now`, so
 * timestamp-only selection can make it look newer than the catalog row whose
 * real title the user already saw. Detail still owns newer project fields, but
 * it must never replace a meaningful catalog title with that transport
 * placeholder. The project-id check also keeps a late response from a previous
 * route out of the next project.
 */
export function reconcileProjectDetail(
  project: Project,
  detail: Project | null,
  authoritativeProjectName?: string | null,
): Project {
  const authoritativeName = authoritativeProjectName?.trim() || null;
  const routedProject = authoritativeName
    ? { ...project, name: authoritativeName }
    : project;
  if (!detail || detail.id !== project.id || detail.updatedAt < project.updatedAt) {
    return routedProject;
  }
  const projectName = routedProject.name.trim();
  const detailName = detail.name.trim();
  if (
    detailName === SHARED_PROJECT_PLACEHOLDER_NAME
    && projectName
    && projectName !== SHARED_PROJECT_PLACEHOLDER_NAME
  ) {
    // The placeholder is an unmaterialized transport row, not a newer project
    // authority. Reject the whole row so its null skill/design metadata cannot
    // regress the catalog/local record along with its synthetic title.
    return routedProject;
  }
  return authoritativeName ? { ...detail, name: authoritativeName } : detail;
}

function mergeRunContextSelections(
  ...contexts: Array<RunContextSelection | undefined>
): RunContextSelection {
  const skillIds = new Set<string>();
  const pluginIds = new Set<string>();
  const mcpServerIds = new Set<string>();
  const connectorIds = new Set<string>();
  const workspaceItems = new Map<string, WorkspaceContextItem>();
  for (const context of contexts) {
    for (const id of context?.skillIds ?? []) skillIds.add(id);
    for (const id of context?.pluginIds ?? []) pluginIds.add(id);
    for (const id of context?.mcpServerIds ?? []) mcpServerIds.add(id);
    for (const id of context?.connectorIds ?? []) connectorIds.add(id);
    for (const item of context?.workspaceItems ?? []) workspaceItems.set(item.id, item);
  }
  return {
    ...(skillIds.size > 0 ? { skillIds: [...skillIds] } : {}),
    ...(pluginIds.size > 0 ? { pluginIds: [...pluginIds] } : {}),
    ...(mcpServerIds.size > 0 ? { mcpServerIds: [...mcpServerIds] } : {}),
    ...(connectorIds.size > 0 ? { connectorIds: [...connectorIds] } : {}),
    ...(workspaceItems.size > 0 ? { workspaceItems: [...workspaceItems.values()] } : {}),
  };
}

export function ProjectView({
  project,
  workspaceContextOverride,
  initialWorkspaceScope,
  initialProjectDetail,
  initialMaterializationPending = false,
  projectAuthorizationKey = project.id,
  amrAuthRetryContinuation = null,
  onArmAmrAuthRetryContinuation,
  onConsumeAmrAuthRetryContinuation,
  onDiscardAmrAuthRetryContinuation,
  authoritativeProjectName,
  resolveAuthoritativeProjectName,
  routeFileName,
  routeConversationId = null,
  config,
  agents,
  skills,
  designTemplates,
  designSystems,
  daemonLive,
  onModeChange,
  onAgentChange,
  onAgentModelChange,
  onApiModelChange,
  onRefreshAgents,
  onOpenSettings,
  onOpenAmrSettings,
  onOpenMcpSettings,
  onBrowsePlugins,
  onOpenConnectors,
  onAdoptPetInline,
  onTogglePet,
  onOpenPetSettings,
  onBack,
  onClearPendingPrompt,
  onTouchProject,
  onProjectChange,
  onProjectRenameStarted,
  onProjectRenameSettled,
  onProjectsRefresh,
  onDeleteProject,
  onChangeDefaultDesignSystem,
  onDesignSystemsRefresh,
  onCreateProjectFromDesignSystem,
  onCreateDesignSystemFromProject,
  onDuplicateProject,
  onRunActivityChange,
}: Props) {
  const { locale, t } = useI18n();
  const amrAuthRetryMountIdRef = useRef<string | null>(null);
  if (amrAuthRetryMountIdRef.current === null) {
    amrAuthRetryMountIdRef.current = randomUUID();
  }
  const activeAuthorizationLifetimeRef = useRef<string | null>(projectAuthorizationKey);
  useEffect(() => {
    activeAuthorizationLifetimeRef.current = projectAuthorizationKey;
    return () => {
      if (activeAuthorizationLifetimeRef.current === projectAuthorizationKey) {
        activeAuthorizationLifetimeRef.current = null;
      }
    };
  }, [projectAuthorizationKey]);
  const analytics = useAnalytics();
  const ambientWorkspaceContextState = useWorkspaceContext();
  const workspaceContextState = workspaceContextOverride !== undefined
    ? {
        context: workspaceContextOverride,
        loading: false,
        identityChangePending: false,
      }
    : ambientWorkspaceContextState;
  const { context: workspaceContext } = workspaceContextState;
  const projectWorkspaceScopeState = useProjectWorkspaceScope(
    project.id,
    workspaceContext,
    project.workspaceId,
    initialWorkspaceScope,
  );
  // The project's resolved scope when there is one. While that first read is
  // pending, the persisted project binding may witness the matching caller;
  // answered unavailable states deliberately do not borrow it.
  const resolvedProjectRunWorkspaceContext = runWorkspaceIdentity(
    projectWorkspaceScopeState,
    workspaceContext,
    project.workspaceId,
  );
  const personalAdoptionContext = runWorkspacePersonalAdoptionWitness(
    projectWorkspaceScopeState,
    workspaceContext,
    project.workspaceId,
  );
  // Scope revalidation returns a freshly decoded context object even when the
  // data-plane authority did not change. Project hydration is keyed to the
  // authority carried by resource requests, not that object's allocation:
  // replacing an equivalent object must not blank conversations, messages,
  // tabs, or files while the same project remains open.
  const projectRunAuthorityKey = workspaceIdentityCacheKey(
    resolvedProjectRunWorkspaceContext,
  );
  const amrAuthRetryPersonalAdoptionWitness:
    AmrAuthRetryPersonalAdoptionWitness | null = personalAdoptionContext
      ? {
          workspaceIdentityKey: workspaceIdentityCacheKey(personalAdoptionContext),
          workspaceId: personalAdoptionContext.workspaceId,
          workspaceMemberId: personalAdoptionContext.workspaceMemberId,
          workspaceType: 'personal',
          memberStatus: 'active',
        }
      : null;
  const canonicalProjectRunWorkspaceContextRef = useRef<{
    authorityKey: string;
    context: WorkspaceCollabContext | null;
  }>({
    authorityKey: projectRunAuthorityKey,
    context: resolvedProjectRunWorkspaceContext,
  });
  if (
    canonicalProjectRunWorkspaceContextRef.current.authorityKey
    !== projectRunAuthorityKey
  ) {
    canonicalProjectRunWorkspaceContextRef.current = {
      authorityKey: projectRunAuthorityKey,
      context: resolvedProjectRunWorkspaceContext,
    };
  }
  const projectRunWorkspaceContext =
    canonicalProjectRunWorkspaceContextRef.current.context;
  const projectResourceAuthority: ProjectResourceAuthority =
    projectWorkspaceScopeState.failure === 'forbidden'
    || projectWorkspaceScopeState.failure === 'unsupported'
      ? 'denied'
      : projectWorkspaceScopeState.scope?.kind === 'unbound'
        ? 'local'
        : projectRunWorkspaceContext
          ? 'workspace'
          : 'pending';
  const projectResourceAuthorityRef = useRef(projectResourceAuthority);
  projectResourceAuthorityRef.current = projectResourceAuthority;
  const projectRunWorkspaceContextRef = useRef(projectRunWorkspaceContext);
  projectRunWorkspaceContextRef.current = projectRunWorkspaceContext;
  // The AMR pre-run balance gate uses the project's resolved scope, or the one
  // narrow adoption witness returned above: an exact active Personal caller
  // for an explicitly unbound historical project. When no safe witness exists,
  // handleSend skips the local balance preflight and lets the daemon return its
  // explicit authorization/adoption decision. It must never inspect an
  // unrelated account wallet just because project scope is inconclusive.
  const projectRunBillingContext = projectWorkspaceContext(
    projectWorkspaceScopeState.scope,
  );
  // A pending first scope read may use the exact ambient caller only when
  // runWorkspaceIdentity has already proven it matches project.workspaceId.
  // That same safe witness is valid for the balance preflight. Settled
  // unavailable/forbidden states produce no run identity and therefore no
  // preflight context; they must never fall through to the Personal wallet.
  const projectRunPreflightContext =
    projectRunBillingContext ?? projectRunWorkspaceContext;
  const cloudModelSelected = config.mode === 'daemon' && config.agentId === 'amr';
  const projectRunRequiresWorkspaceScope = cloudModelSelected;
  // An OpenDesign Cloud run needs a wallet, and the ONLY client-side veto is
  // "there is no billing principal at all". Either witness suffices: the
  // caller's own cloud identity, or a project scope that already names an
  // explicit personal/team principal.
  //
  // What this deliberately stops doing is requiring the PROJECT's membership
  // projection to resolve before a send. A transient directory failure says
  // nothing authoritative about access or billing: the daemon still forwards
  // the project's persisted Workspace id with the signed-in account, and Vela
  // makes the final membership/balance decision. It must not be converted to a
  // Personal run. A settled unbound historical project is also allowed to
  // reach the daemon: with an exact Personal witness it may be transactionally
  // adopted; with a Team/absent witness the daemon rejects it explicitly.
  // An explicit backend rejection is preferable to a client-side dead button
  // or a popup for the wrong wallet.
  //
  // Strictly a widening: every state this admits was previously blocked, and
  // nothing previously admitted becomes blocked.
  const projectRunHasBillableAmrPrincipal =
    !projectRunRequiresWorkspaceScope ||
    projectWorkspaceScopeState.scope?.kind === 'unbound' ||
    workspaceIdentityCanBillAmr(workspaceContextState) ||
    projectWorkspaceScopeAuthorizesAmr(projectWorkspaceScopeState.scope);
  // Onboarding first-generation funnel (spec §11.1). Consume the pending entry
  // (set by the Home recommendation) exactly once on mount; the refs guard the
  // two lifecycle events so each fires only for the genuine first send / first
  // successful generation of a recommendation-started project.
  const onboardingEntryInitRef = useRef(false);
  const onboardingEntryRef = useRef<OnboardingEntry | null>(null);
  // The prompt the recommendation prefilled into the composer. Prefer the seed
  // cached WITH the onboarding entry (it survives a reopen-before-send, whereas
  // `project.pendingPrompt` is wiped by `onClearPendingPrompt` on the first
  // mount); fall back to `pendingPrompt` for the very first mount / any project
  // without a cached seed. The first-prompt-sent funnel event compares the
  // actually-sent prompt against this seed so `has_prefilled_prompt` reflects
  // real behavior — the user is free to edit, clear, or replace the suggestion
  // before sending (spec §7.4 / §8.2).
  const onboardingSeedPromptRef = useRef('');
  if (!onboardingEntryInitRef.current) {
    onboardingEntryInitRef.current = true;
    onboardingEntryRef.current = consumeOnboardingEntryForProject(project.id);
    onboardingSeedPromptRef.current =
      onboardingEntryRef.current?.seedPrompt ?? (project.pendingPrompt ?? '').trim();
    // Pin the first-loop ledger for THIS project so later delivery taps (the
    // FileViewer share/export path) can close the loop by project id without
    // prop plumbing. Project-scoped, so an unrelated project's delivery never
    // closes this loop.
    if (onboardingEntryRef.current) beginFirstLoop(project.id, onboardingEntryRef.current);
  }
  // The once-per-project funnel guards live in the onboarding-entry module
  // (project-keyed), not mount-local refs: ProjectView remounts on every
  // leave/reopen, and the entry now survives those remounts via its cache, so a
  // mount-local guard would let the funnel events re-fire on a later
  // conversation/run of the same project.
  const iframeKeepAlivePool = useIframeKeepAlivePool();
  // ProjectView is the authorization lifetime for project-owned file content.
  // FileViewer may unmount while switching to a root tab such as Design Files,
  // but ProjectView remains mounted in that flow so revisit snapshots survive.
  // Leaving the project (or changing project identity) crosses the boundary:
  // drop every source snapshot before a later mount can seed content that the
  // next project/workspace context has not reauthorized.
  // `viewerOnly` is not a revocation signal: it also represents authorized
  // read-only members, so this ProjectView lifetime is the fail-closed boundary.
  useEffect(() => () => {
    invalidateHtmlSourceSnapshotProject(project.id);
  }, [project.id]);
  // Team collaboration: presence for a shared project. Dormant (no heartbeat,
  // renders nothing) unless the workspace context marks the viewer an active
  // team member — safe to mount unconditionally.
  const projectCollab = useProjectCollab(project?.id ?? null, {
    workspaceContext: projectRunWorkspaceContext,
    workspaceContextLoading: projectWorkspaceScopeState.loading,
    initialMaterializationPending,
    presenceFilePath: project?.metadata?.entryFile ?? null,
  });
  // A Team-bound placeholder is safe to render and comment around, but its
  // empty tree is never a writer authority. Reuse the established viewer-only
  // gates for content/run/project mutations until the daemon's own status poll
  // proves first materialization finished. Keep the read-only ownership banner
  // keyed to `projectCollab.viewerOnly` below so an owner reinstall sees a
  // syncing project, not the misleading “shared by someone else” notice.
  const projectMutationReadOnly =
    projectCollab.viewerOnly || projectCollab.materializationPending;
  const { resolve: resolvePresenceMember } = useTeamMembers(
    currentUserDirectoryEntry(projectRunWorkspaceContext),
    projectRunWorkspaceContext,
  );
  // Tab layout is private browser state for a read-only Team viewer. Keep its
  // identity-partitioned local cache working, but only let a positively proven
  // project writer update the daemon's shared project row. Personal and legacy
  // unbound projects retain their existing local-daemon persistence once the
  // daemon has settled that scope. The local project row is not an unbound
  // authority witness: it can lag a daemon-side Team binding.
  const projectTabsCanPersistToDaemon =
    projectWorkspaceScopeState.scope?.kind === 'unbound'
    || projectWorkspaceScopeState.scope?.kind === 'personal'
    || (
      projectWorkspaceScopeState.scope?.kind === 'team'
      && projectCollab.writerAuthority === 'allowed'
    );
  const projectTabsCanPersistToDaemonRef = useRef(
    projectTabsCanPersistToDaemon,
  );
  projectTabsCanPersistToDaemonRef.current = projectTabsCanPersistToDaemon;
  // Stable references (useCallback with empty deps inside useCollab) — safe
  // for the project-events handler's dependency array without re-subscribing.
  const {
    refreshPresence: collabRefreshPresence,
    checkStatusNow: collabCheckStatusNow,
  } = projectCollab;
  // Read-only banner copy: when the collab cloud resolved who shared this project,
  // name them ("这是 麻薯 创建的共享项目…"); otherwise fall back to the name-less
  // notice. Only computed when the viewer is actually read-only.
  const readonlyNoticeText = projectCollab.viewerOnly
    ? projectCollab.ownerDisplayName
      ? t('workspace.readonlyNoticeBy', { owner: projectCollab.ownerDisplayName })
      : t('workspace.readonlyNotice')
    : undefined;
  // Team-share file-sync badge for the design-files tab bar + empty state
  // (recvqghymxqQQq). A member downloads (their local mirror trails the
  // published head); the owner uploads (a local edit hasn't published yet).
  // The two are mutually exclusive — a project has exactly one writer — so at
  // most one of these is ever true.
  const fileSyncBadge: 'downloading' | 'uploading' | null = projectCollab.downloadPending
    ? 'downloading'
    : projectCollab.enabled && projectCollab.isOwner && projectCollab.syncState === 'pending_upload'
      ? 'uploading'
      : null;
  const projectDetail = useProjectDetail(
    project.id,
    projectRunWorkspaceContext,
    project.workspaceId,
    initialProjectDetail,
  );
  const detailedProject = projectDetail.project?.id === project.id ? projectDetail.project : null;
  const currentProject = reconcileProjectDetail(
    project,
    detailedProject,
    authoritativeProjectName,
  );
  let projectTitleTooltip = currentProject.name;
  if (projectMutationReadOnly) projectTitleTooltip = t('workspace.readonlyNotice');
  if (projectCollab.materializationPending) projectTitleTooltip = t('designFiles.syncing');
  const resolvedProjectDesignSystemId = resolveProjectDesignSystemId(currentProject);
  // A project can outlive a Design System being disabled in Settings. Keep the
  // persisted project value intact for recovery, but do not inject a disabled
  // system into a new runtime turn.
  const projectDesignSystemId = resolvedProjectDesignSystemId;
  const runtimeDesignSystemId =
    projectDesignSystemId && (config.disabledDesignSystems ?? []).includes(projectDesignSystemId)
      ? null
      : projectDesignSystemId;
  const projectIsDesignSystemProject = isDesignSystemProject(currentProject);
  // Website-clone turns reproduce a whole multi-page site; auto-open should
  // land on the site entry (index.html), not the last-written subpage. See
  // `SelectAutoOpenOptions.preferSiteEntry`.
  const autoOpenArtifactOptions = {
    preferSiteEntry: currentProject.metadata?.intent === 'web-clone',
  };
  const designSystemBrandId = projectIsDesignSystemProject
    ? currentProject.metadata?.brandId?.trim() || null
    : null;
  const projectIsProgrammaticBrandExtraction =
    isProgrammaticBrandExtractionProject(currentProject.metadata);
  // P0 page_view page_name=chat_panel — fire once per project mount.
  // ProjectView outlives conversation switches (ChatPane is keyed by
  // activeConversationId so it remounts when the user switches chats,
  // but this component does not), so page_view stays a "chat-panel
  // entry" metric instead of becoming a "conversation switch" count.
  // Reviewer #2285 (mrcfps, 2026-05-20 04:08) flagged the previous
  // ChatComposer-level emit for skewing the funnel.
  const chatPanelPageViewFiredRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const trackedTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const timer of trackedTimeoutsRef.current) clearTimeout(timer);
      trackedTimeoutsRef.current.clear();
    };
  }, []);

  const scheduleProjectTimeout = useCallback((callback: () => void, delayMs: number) => {
    if (!mountedRef.current) return null;
    const timer = setTimeout(() => {
      trackedTimeoutsRef.current.delete(timer);
      if (!mountedRef.current) return;
      callback();
    }, delayMs);
    trackedTimeoutsRef.current.add(timer);
    return timer;
  }, []);

  const clearProjectTimeout = useCallback((timer: ReturnType<typeof setTimeout> | null) => {
    if (timer == null) return;
    clearTimeout(timer);
    trackedTimeoutsRef.current.delete(timer);
  }, []);

  useEffect(() => {
    if (chatPanelPageViewFiredRef.current === project.id) return;
    chatPanelPageViewFiredRef.current = project.id;
    trackPageView(analytics.track, { page_name: 'chat_panel' });
    // Onboarding's 4th step ("生成进度页") fires here, not in
    // `DesignSystemDetailView`: the Generate path navigates
    // straight to the project's chat_panel, not to the design
    // system detail surface. If an onboarding session id is still
    // in sessionStorage we stamp the funnel's last row here and
    // clear so any later DS visit doesn't inherit the attribution.
    // E2E (2026-05-21) confirmed this is the only path users
    // actually take — observed: page_view chat_panel fires, but
    // page_view design_system_project never did because that
    // route isn't visited from the embedded onboarding generate.
    const onboardingSessionId = peekOnboardingSessionId();
    if (onboardingSessionId) {
      trackPageView(analytics.track, {
        page_name: 'onboarding',
        area: 'generation_progress',
        step_index: 'progress',
        step_name: 'generation',
        onboarding_session_id: onboardingSessionId,
      });
      clearOnboardingSessionId();
    }
  }, [analytics.track, project.id]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const conversationsRef = useRef<Conversation[]>([]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const activeConversationIdRef = useRef(activeConversationId);
  activeConversationIdRef.current = activeConversationId;
  const [pendingEmptyConversationSeed, setPendingEmptyConversationSeed] =
    useState<{ projectId: string; authorityKey: string } | null>(null);
  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );
  // Team collaboration: persist a comment that drifted to `lost` so its ghost
  // pin survives reload. Only ProjectView has the active conversation id the
  // anchor route needs; fed to the drift ladder through the collab context.
  const handleLostAnchors = useCallback(
    (writeBacks: AnchorWriteBack[]) => {
      if (!activeConversationId || writeBacks.length === 0) return;
      void persistCommentAnchors({
        projectId: project.id,
        conversationId: activeConversationId,
        writeBacks,
        workspaceContext: projectRunWorkspaceContext,
      });
    },
    [project.id, activeConversationId, projectRunWorkspaceContext],
  );
  const collabValue = useMemo<CollabContextValue>(
    () => ({
      ...projectCollab,
      workspaceContext: projectRunWorkspaceContext,
      workspaceContextLoading: projectWorkspaceScopeState.loading,
      projectResourceAuthority,
      onLostAnchors: handleLostAnchors,
    }),
    [
      projectCollab,
      projectRunWorkspaceContext,
      projectWorkspaceScopeState.loading,
      projectResourceAuthority,
      handleLostAnchors,
    ],
  );
  const activeSessionMode = activeConversation?.sessionMode ?? 'design';
  const [messagesConversationId, setMessagesConversationId] = useState<string | null>(null);
  const [failedMessagesConversationId, setFailedMessagesConversationId] = useState<string | null>(null);
  const [conversationLoadError, setConversationLoadError] = useState<string | null>(null);
  const conversationMaterializationRecoveryRef =
    useRef<ConversationMaterializationRecovery | null>(null);
  const conversationMaterializationGenerationControllerRef =
    useRef<ReturnType<typeof createConversationMaterializationGenerationController> | null>(null);
  const conversationMaterializationGenerationController =
    conversationMaterializationGenerationControllerRef.current
    ?? createConversationMaterializationGenerationController();
  conversationMaterializationGenerationControllerRef.current =
    conversationMaterializationGenerationController;
  const conversationMaterializationRecoveryInFlightRef =
    useRef<ConversationMaterializationRecovery | null>(null);
  const [messageLoadRetryNonce, setMessageLoadRetryNonce] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [forkingMessageId, setForkingMessageId] = useState<string | null>(null);
  const [activePluginActionPaths, setActivePluginActionPaths] = useState<Set<string>>(() => new Set());
  const [hiddenAssistantPluginActionPaths, setHiddenAssistantPluginActionPaths] = useState<Set<string>>(() => new Set());
  const [forceStreamingPluginMessageIds, setForceStreamingPluginMessageIds] = useState<Set<string>>(() => new Set());
  // Ephemeral, live-only accumulation of a tool call's streaming JSON input,
  // keyed by tool-use id (globally unique per run). Fed by `onToolInputDelta`
  // while the model is still emitting `input_json_delta`; dropped per-id once
  // the full `tool_use` lands and wiped when the run ends. Never persisted —
  // see daemon `daemonAgentPayloadToPersistedAgentEvent` (returns null).
  // `seq` records how many persisted events existed when the tool started
  // streaming, so the renderer can place the live card at the tool call's
  // position in the message (text before it = preamble, after it = hedging).
  const [liveToolInput, setLiveToolInput] = useState<Record<string, { name: string; text: string; seq: number }>>({});
  // True once the initial DB read for the active conversation has settled.
  // Auto-send gates on this so it can't fire before listMessages resolves and
  // race-clobber the freshly-pushed user + assistant placeholder. Without
  // this, the auto-send writes [user, assistant] into state, then the still
  // in-flight listMessages PUT response arrives, runs setMessages(list), and
  // wipes both — leaving the daemon's run with no client-side message to
  // attach the runId to.
  const [messagesInitialized, setMessagesInitialized] = useState(false);
  const [previewComments, setPreviewComments] = useState<PreviewComment[]>([]);
  // Every local comment commit invalidates older in-flight list reads. The
  // initial read and the SSE/poll refresher use the same generation as a
  // commit witness, so a slow response can never resurrect a locally deleted
  // comment or replace a newer add/status update.
  const previewCommentsGenerationRef = useRef(0);
  const commitPreviewComments = useCallback((next: SetStateAction<PreviewComment[]>) => {
    previewCommentsGenerationRef.current += 1;
    setPreviewComments(next);
  }, []);
  // Mirror so the send-now interrupt path can read the current statuses
  // synchronously without re-creating its callback on every comment change.
  const previewCommentsRef = useRef<PreviewComment[]>([]);
  useEffect(() => {
    previewCommentsRef.current = previewComments;
  }, [previewComments]);
  const [attachedComments, setAttachedComments] = useState<PreviewComment[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingConversationId, setStreamingConversationId] = useState<string | null>(null);
  // Safety net: drop any live tool-input partials whose tool never produced a
  // full `tool_use` (run errored/canceled mid-call) once streaming settles.
  useEffect(() => {
    if (!streaming) setLiveToolInput((prev) => (Object.keys(prev).length ? {} : prev));
  }, [streaming]);
  const [paneError, setPaneError] = useState<{
    message: string;
    sourceAssistantId: string | null;
  } | null>(null);
  const error = paneError?.message ?? null;
  const errorSourceAssistantId = paneError?.sourceAssistantId ?? null;
  const setError = useCallback((next: SetStateAction<string | null>) => {
    setPaneError((current) => {
      const currentMessage = current?.message ?? null;
      const message = typeof next === 'function' ? next(currentMessage) : next;
      if (message == null) return null;
      return {
        message,
        sourceAssistantId:
          typeof next === 'function' && message === currentMessage
            ? current?.sourceAssistantId ?? null
            : null,
      };
    });
  }, []);
  const setRunError = useCallback((message: string, sourceAssistantId: string) => {
    setPaneError({ message, sourceAssistantId });
  }, []);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [filesRefresh, setFilesRefresh] = useState(0);
  const filesRefreshRequestKeyRef = useRef(0);
  const bumpFilesRefresh = useCallback(() => {
    setFilesRefresh((current) => {
      const next = current + 1;
      filesRefreshRequestKeyRef.current = next;
      return next;
    });
  }, []);
  // True while a working-dir replace is reindexing the new folder. Surfaced
  // to the Design Files panel so the file list shows a loading state instead
  // of silently sitting on the old tree for the few seconds the scan takes.
  const [projectFilesSnapshot, setProjectFilesSnapshot] = useState<{
    files: ProjectFile[];
    refreshKey: number;
    generation: number;
  }>({ files: [], refreshKey: 0, generation: 0 });
  const projectFiles = projectFilesSnapshot.files;
  const committedFilesRefreshKey = projectFilesSnapshot.refreshKey;
  const committedFilesGeneration = projectFilesSnapshot.generation;
  const projectFilesGenerationRef = useRef(committedFilesGeneration);
  const committedFilesRefreshKeyRef = useRef(committedFilesRefreshKey);
  committedFilesRefreshKeyRef.current = committedFilesRefreshKey;
  const projectFilesRef = useRef<ProjectFile[]>([]);
  const projectFilesRequestSeqRef = useRef(0);
  const [liveArtifacts, setLiveArtifacts] = useState<LiveArtifactSummary[]>([]);
  const [liveArtifactEvents, setLiveArtifactEvents] = useState<LiveArtifactEventItem[]>([]);
  const [workspaceFocused, setWorkspaceFocused] = useState(false);
  // Read by `renderPreferredChatPanelWidth` instead of closing over
  // `workspaceFocused` directly, so that callback's identity (and therefore
  // the ResizeObserver effect keyed on it, below) doesn't need to depend on
  // focus state — see the render-phase mirror below for why.
  const workspaceFocusedRef = useRef(workspaceFocused);
  // Keep this render-phase mirror synchronous with the state that determines
  // the committed `.split-focus` class. A child layout effect (and, in the
  // browser, ResizeObserver delivery before passive effects) can run before a
  // parent effect, so effect-based synchronization still exposes one stale
  // frame where the old three-column widths can be written back inline.
  workspaceFocusedRef.current = workspaceFocused;
  // Mirrors `workspaceFocused` but lags behind it while collapsing, so the
  // chat pane stays mounted/visible until the `.split` width transition
  // actually finishes — see the sync effect near the ResizeObserver below.
  const [chatSlotHidden, setChatSlotHidden] = useState(workspaceFocused);
  // Chat-column dock host for the workspace tab strip (workspaceTabsDock.ts);
  // FileWorkspace registers its own focus-mode host when the chat collapses.
  const chatTabsDockRef = useWorkspaceTabsDockRef();
  const [commentInspectorActive, setCommentInspectorActive] = useState(false);
  const commentInspectorPortalId = useId();
  // Per-session override for the BYOK chat's generate_image tool. Seeded once
  // from the New Project → Media model pick (project.metadata.imageModel) — but
  // only when that pick belongs to the active BYOK provider (see
  // byokModelSeedForProtocol) — falling back to the Settings default
  // (config.byokImageModel) otherwise. Subsequent selections live only in this
  // component's state — page refresh / project switch resets to this seed.
  // Persistent defaults live in Settings → BYOK → Image generation model.
  const [byokImageModelOverride, setByokImageModelOverride] = useState<string>(
    () => byokModelSeedForProtocol(project.metadata, 'image', config.apiProtocol) ?? config.byokImageModel ?? '',
  );
  // Same per-session override for the BYOK chat's generate_video tool, seeded
  // from the project's videoModel pick (provider-gated), then Settings.
  const [byokVideoModelOverride, setByokVideoModelOverride] = useState<string>(
    () => byokModelSeedForProtocol(project.metadata, 'video', config.apiProtocol) ?? config.byokVideoModel ?? '',
  );
  // Same per-session overrides for the BYOK chat's generate_speech tool (model +
  // voice), seeded from the project's speech pick (provider-gated), then Settings.
  const [byokSpeechModelOverride, setByokSpeechModelOverride] = useState<string>(
    () => byokModelSeedForProtocol(project.metadata, 'speech', config.apiProtocol) ?? config.byokSpeechModel ?? '',
  );
  // Voice only carries when the speech model itself is carried (same provider),
  // so a cross-provider voice id never leaks into the request.
  const [byokSpeechVoiceOverride, setByokSpeechVoiceOverride] = useState<string>(
    () => (byokModelSeedForProtocol(project.metadata, 'speech', config.apiProtocol)
      ? projectMediaVoiceSeed(project.metadata)
      : undefined) ?? config.byokSpeechVoice ?? '',
  );
  // Live model option lists (same hooks the composer/Settings pickers use) so
  // the chat "default" (no explicit pick) resolves to the FIRST catalogue model
  // shown in the dropdown — not a hardcoded id. The daemon keeps its own
  // fallback for when the catalogue hasn't loaded.
  const byokImageModelOptionsPV = useByokImageModelOptions(config.apiProtocol);
  const byokVideoModelOptionsPV = useByokVideoModelOptions(config.apiProtocol);
  const byokSpeechModelOptionsPV = useByokSpeechModelOptions(config.apiProtocol);
  // PR #974 round 7 (mrcfps @ useDesignMdState.ts:131): counter that
  // bumps on file-changed SSE events, live_artifact* events, and the
  // chat streaming-completion edge so the staleness chip stays in sync
  // with the underlying mtimes / conversation updatedAt as the user
  // keeps working post-finalize. The hook treats it as a dep and
  // recomputes whenever it changes.
  const [designMdRefreshKey, setDesignMdRefreshKey] = useState(0);
  // ----- Continue in CLI / Finalize design package wiring (#451) -----
  // The toast surface is shared between Finalize errors and the
  // success/fallback toasts emitted from handleContinueInCli.
  const designMdState = useDesignMdState(
    project.id,
    designMdRefreshKey,
    projectRunWorkspaceContext,
  );
  const finalize = useFinalizeProject(project.id, projectRunWorkspaceContext);
  const terminalLauncher = useTerminalLaunch();
  const [projectActionsToast, setProjectActionsToast] = useState<{
    message: string;
    details: string | null;
    code?: string | null;
    tone?: 'default' | 'success' | 'error' | 'loading';
    ttlMs?: number;
    scope?: 'chat-pane';
  } | null>(null);
  // Brand extraction has no SSE; this polls the brand's status and, once the
  // backing extraction finalizes a `user:<id>` design system, surfaces a
  // one-shot "ready — preview it" prompt so the user knows to open the Design
  // systems tab. A no-op for every non-brand-extraction project.
  const {
    status: polledBrandExtractionStatus,
    ready: brandReady,
    prompt: brandReadyPrompt,
    dismiss: dismissBrandReady,
    browserAssist: brandBrowserAssist,
    dismissBrowserAssist: dismissBrandBrowserAssist,
  } = useBrandReadyPrompt(currentProject.metadata);
  const currentBrandExtractionId = projectIsProgrammaticBrandExtraction
    ? currentProject.metadata?.brandId?.trim() || null
    : null;
  const [brandExtractionStatusOverride, setBrandExtractionStatusOverride] =
    useState<{ brandId: string; status: BrandStatus } | null>(null);
  useEffect(() => {
    if (!currentBrandExtractionId) {
      setBrandExtractionStatusOverride(null);
      return;
    }
    if (
      brandExtractionStatusOverride &&
      brandExtractionStatusOverride.brandId !== currentBrandExtractionId
    ) {
      setBrandExtractionStatusOverride(null);
      return;
    }
    if (
      brandExtractionStatusOverride &&
      brandExtractionStatusOverride.brandId === currentBrandExtractionId &&
      brandExtractionAllowsEditing(polledBrandExtractionStatus)
    ) {
      setBrandExtractionStatusOverride(null);
    }
  }, [brandExtractionStatusOverride, currentBrandExtractionId, polledBrandExtractionStatus]);
  const effectiveBrandExtractionStatus =
    brandExtractionStatusOverride?.brandId === currentBrandExtractionId
      ? brandExtractionStatusOverride.status
      : polledBrandExtractionStatus;
  const terminalBrandPreviewRefreshRef = useRef<string | null>(null);
  const pendingBrandDesignSystemOpenRef = useRef<string | null>(null);
  const handledBrandReadyDesignSystemRef = useRef<string | null>(null);
  const missingDesignSystemRefreshRef = useRef<string | null>(null);
  const autoOpenedBrandDesignSystemRef = useRef<string | null>(null);
  const brandEmptyTranscriptRetriesRef = useRef<Map<string, number>>(new Map());
  const [chatSeed, setChatSeed] = useState<{ id: string; value: string } | null>(null);
  // Hard block from the pre-run balance gate (empty wallet or signed out);
  // non-null renders the AmrBalanceDialog. `conversationId` remembers whose
  // queue to resume when the dialog resolves (sign-in done / recharge landed).
  const [amrBalanceGateBlock, setAmrBalanceGateBlock] = useState<
    {
      reason: 'insufficient' | 'signed_out';
      snapshot: AmrWalletSnapshot;
      conversationId: string;
    } | null
  >(null);
  // Soft low-balance warning holding a pending send: the dialog resolves the
  // promise the gate is awaiting ('proceed' continues the very same send).
  const [amrLowBalanceWarn, setAmrLowBalanceWarn] = useState<
    {
      snapshot: AmrWalletSnapshot;
      resolve: (decision: AmrLowBalanceDecision) => void;
    } | null
  >(null);
  // Conversations with a balance-gate check currently in flight. Sends that
  // arrive during the check queue instead of racing a duplicate run through
  // the not-yet-busy window the gate's await opens.
  const amrGateInFlightConversationsRef = useRef<Set<string>>(new Set());
  // Conversations whose queue auto-drain is paused because the balance gate
  // blocked a send. Without the pause, every unrelated re-run of the drain
  // effect would re-hit the wallet endpoint and re-pop the dialog. Lifted by
  // the next send that passes the gate.
  const amrGatePausedQueueConversationsRef = useRef<Set<string>>(new Set());
  const [autoAuditRepairSeed, setAutoAuditRepairSeed] =
    useState<{ id: string; value: string } | null>(null);
  const [chatPanelWidth, setChatPanelWidth] = useState(readSavedChatPanelWidth);
  const [chatPanelMaxWidth, setChatPanelMaxWidth] = useState(MAX_CHAT_PANEL_WIDTH);
  const [workspacePanelMinWidth, setWorkspacePanelMinWidth] = useState(MIN_WORKSPACE_PANEL_WIDTH);
  const [resizingChatPanel, setResizingChatPanel] = useState(false);
  const splitRef = useRef<HTMLDivElement | null>(null);
  const chatPanelWidthRef = useRef(chatPanelWidth);
  const preferredChatPanelWidthRef = useRef(chatPanelWidth);
  const resizeStartPreferredWidthRef = useRef(chatPanelWidth);
  const chatPanelMaxWidthRef = useRef(chatPanelMaxWidth);
  const resizeStateRef = useRef<{
    startClientX: number;
    startWidth: number;
    isRtl: boolean;
    hasMoved: boolean;
  } | null>(null);
  const pointerCleanupRef = useRef<(() => void) | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const pendingPointerClientXRef = useRef<number | null>(null);
  // The persisted set of open tabs + active tab. Persisted via PUT on every
  // change; loaded once when the project mounts.
  const [openTabsState, setOpenTabsState] = useState<OpenTabsState>({
    tabs: [],
    active: null,
  });
  // Artifact context for the header actions (settings gear, handoff) that live
  // in this workspace's header alongside FileViewer's present/share/download.
  // Mirrors the artifact_id / artifact_kind that FileViewer attaches, derived
  // from the currently-active file tab, so all artifact_header analytics carry
  // the same dimensions. Undefined on non-file tabs (e.g. the file list).
  const headerArtifact = useMemo<{
    artifact_id?: string;
    artifact_kind?: TrackingArtifactKind;
  }>(() => {
    const activeName = openTabsState.active;
    const file = activeName
      ? projectFiles.find((entry) => entry.name === activeName) ?? null
      : null;
    if (!file) return {};
    return {
      artifact_id: anonymizeArtifactId({ projectId: project.id, fileName: file.name }),
      artifact_kind: artifactKindToTracking({ fileKind: file.kind ?? null }),
    };
  }, [openTabsState.active, projectFiles, project.id]);
  const routeFileNameRef = useRef(routeFileName);
  routeFileNameRef.current = routeFileName;
  const [activeWorkspaceContext, setActiveWorkspaceContext] =
    useState<WorkspaceContextItem | null>(null);
  const [workspaceContexts, setWorkspaceContexts] = useState<WorkspaceContextItem[]>([]);
  const [selectedMobileScreen, setSelectedMobileScreen] =
    useState<WorkspaceContextItem | null>(null);
  useEffect(() => {
    setSelectedMobileScreen(null);
  }, [project.id]);
  const tabsLoadedRef = useRef(false);
  const tabsHydratedFromSavedStateRef = useRef(false);
  const [tabsHydrationVersion, setTabsHydrationVersion] = useState(0);
  const hasAppliedInitialPrimaryOpenRef = useRef(false);
  // Routed to FileWorkspace — bumped whenever the user clicks "open" on a
  // tool card, an attachment chip, or a produced-file chip in chat. We
  // include a nonce so re-clicking the same name after the user closed the
  // tab still focuses it.
  const [openRequest, setOpenRequest] = useState<{ name: string; nonce: number } | null>(null);
  const [browserOpenRequest, setBrowserOpenRequest] = useState<BrowserOpenRequest | null>(null);
  // Like `openRequest`, but additionally asks the preview workspace to open the
  // file's Share/Export menu. Drives the "Share" next-step action: it reuses the
  // existing export/deploy surface rather than introducing a new share backend.
  const [shareRequest, setShareRequest] = useState<{ name: string; nonce: number } | null>(null);
  // Parallel to shareRequest, but opens the workspace's Download/Export menu.
  const [downloadRequest, setDownloadRequest] = useState<{ name: string; nonce: number } | null>(null);
  const [designSystemEditRequest, setDesignSystemEditRequest] =
    useState<{ module: 'logo'; nonce: number } | null>(null);
  // When a queued chat send starts processing, ask the workspace to flip the
  // deck preview to the slide its marked element lives on, so the user watches
  // the edit land in context instead of staying parked on slide 1. Mirrors the
  // `shareRequest` nonce signal: FileWorkspace matches `name` against the open
  // file and FileViewer consumes each nonce once.
  const [slideNavRequest, setSlideNavRequest] = useState<
    { name: string; slideIndex: number; nonce: number } | null
  >(null);
  const abortRef = useRef<AbortController | null>(null);
  const cancelRef = useRef<AbortController | null>(null);
  // Runs explicitly superseded by a "send now" interrupt. Their abort
  // controller is recorded here synchronously — before handleStop() clears the
  // active refs — so the run's late terminal callbacks (which the daemon still
  // delivers for a canceled run) can be recognized as stale and skip every
  // current-run side effect, independent of abortRef churn. A WeakSet so a
  // finished run's controller is collected once nothing else references it.
  const supersededRunsRef = useRef<WeakSet<AbortController>>(new WeakSet());
  const streamingConversationIdRef = useRef<string | null>(null);
  const [queuedChatSends, setQueuedChatSends] = useState<QueuedChatSend[]>([]);
  const queuedChatSendsRef = useRef<QueuedChatSend[]>([]);
  // A BYOK preflight can reject a send before any Run exists. Keep that
  // submission's task identity in memory so fixing Settings and resubmitting
  // the same draft completes the original task funnel instead of fabricating a
  // second task. AMR hard gates persist the full send in the queue separately.
  const blockedRunTaskRef = useRef<{
    conversationId: string;
    requestKey: string;
    taskAnalytics: ChatTaskExecutionAnalytics;
  } | null>(null);
  const sendTextBufferRef = useRef<BufferedTextUpdates | null>(null);
  const reattachTextBuffersRef = useRef<Set<BufferedTextUpdates>>(new Set());
  const reattachControllersRef = useRef<Map<string, AbortController>>(new Map());
  const reattachCancelControllersRef = useRef<Map<string, AbortController>>(new Map());
  const completedReattachRunsRef = useRef<Set<string>>(new Set());
  // A locally finished run briefly has terminal status before its async
  // project-file refresh attaches delivery evidence. Do not let that same
  // browser session reattach the run during this handoff; reattach remains
  // the recovery path after a reload, where this in-memory set is empty.
  const finalizingLocalRunIdsRef = useRef<Set<string>>(new Set());
  // Tracks transient null-status retry attempts per runId; bounded by
  // MAX_TRANSIENT_RETRIES so we never spin indefinitely on a persistently
  // missing run.
  const transientFailedRetriesRef = useRef<Map<string, number>>(new Map());
  // Tracks generic-disconnect retry attempts per runId independently of the
  // null-status path so the two transient error classes don't share one budget
  // and cause premature sealing when both fire on the same run.
  const genericDisconnectRetriesRef = useRef<Map<string, number>>(new Map());
  // Cooldown window for active generic-disconnect retries after the transient
  // budget is exhausted, so a flapping SSE endpoint does not trigger an
  // immediate reattach loop while the daemon still reports the run as active.
  const genericDisconnectBackoffUntilRef = useRef<Map<string, number>>(new Map());
  // Timer handles for pending transient-retry callbacks; cleared on cleanup.
  const transientRetryTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const [recoveryTick, setRecoveryTick] = useState(0);
  const recoveredArtifactMessagesRef = useRef<Set<string>>(new Set());
  const messagesRef = useRef<ChatMessage[]>([]);
  const startingQueuedChatSendIdRef = useRef<string | null>(null);
  const [queuedAutoStartTick, setQueuedAutoStartTick] = useState(0);
  // We auto-save the most recent artifact to the project folder. Track the
  // last name we persisted so re-renders during streaming don't spawn
  // duplicate writes.
  const savedArtifactRef = useRef<string | null>(null);
  // Track which conversation the current messages belong to, so we can
  // correctly gate new-conversation creation even during async loads.
  const messagesConversationIdRef = useRef<string | null>(null);
  const messagesAuthorityKeyRef = useRef<string | null>(null);
  const creatingConversationRef = useRef(false);
  // Last conversation id this view pushed into the URL. Lets the
  // route -> active-conversation sync tell a genuine external navigation
  // apart from the URL merely lagging a local conversation switch.
  const lastSyncedConversationIdRef = useRef<string | null>(null);
  // Live mirror of the currently-viewed project id. Used to bail out of
  // the conversation-created async refresh (#1361) if the user switches
  // projects while the refetch is in flight — the existing project-load
  // effects use the same kind of cancellation guard.
  const projectIdRef = useRef(project.id);
  useEffect(() => {
    projectIdRef.current = project.id;
  }, [project.id]);
  const projectRunAuthorityKeyRef = useRef(projectRunAuthorityKey);
  projectRunAuthorityKeyRef.current = projectRunAuthorityKey;
  const conversationsLoadedProjectIdRef = useRef<string | null>(null);
  // Live mirror of the full project prop, for async handlers whose useCallback
  // deps only track `project.id` (e.g. the project-events handler below):
  // comparing a re-fetched record against a stale closure copy would
  // mis-detect changes after a rename.
  const projectRef = useRef(project);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    setChatSeed(null);
    setAutoAuditRepairSeed(null);
    const restored = loadQueuedChatSends(project.id);
    queuedChatSendsRef.current = restored;
    setQueuedChatSends(restored);
  }, [project.id]);
  // Monotonic token bumped on every `conversation-created` refresh dispatch.
  // Two rapid events (e.g. concurrent routine runs against the same reused
  // project, #1502) can start overlapping `listConversations` calls; if the
  // later request resolves first with N+1 conversations and the earlier
  // request resolves afterwards with only N, an unconditional
  // `setConversations(list)` would drop the newest conversation. Each
  // dispatch captures the token at start; only the dispatch whose token
  // still equals `conversationsRefreshTokenRef.current` at await-return is
  // allowed to apply its result.
  const conversationsRefreshTokenRef = useRef(0);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const currentConversationHasProgrammaticBrandExtractionRun = useMemo(
    () => messages.some((m) => isProgrammaticBrandExtractionStatusMessage(m, currentProject.metadata)),
    [messages, currentProject.metadata],
  );
  const currentConversationHasActiveRun = useMemo(
    () => messages.some((m) => m.role === 'assistant' && isActiveRunStatus(m.runStatus)),
    [messages],
  );
  const memoryExtractionRunActive = currentConversationHasActiveRun || streaming;
  useEffect(() => {
    onRunActivityChange?.(project.id, memoryExtractionRunActive);
  }, [memoryExtractionRunActive, onRunActivityChange, project.id]);
  useEffect(() => () => {
    onRunActivityChange?.(project.id, false);
  }, [onRunActivityChange, project.id]);
  const currentConversationHasRecoverableArtifact = useMemo(
    () => messages.some((message) => hasRecoverableArtifactMessage(message)),
    [messages],
  );
  const currentConversationLoading = Boolean(
    activeConversationId
      && messagesConversationId !== activeConversationId
      && failedMessagesConversationId !== activeConversationId,
  );
  const currentConversationStreaming = streaming && streamingConversationId === activeConversationId;
  const currentConversationControlStreaming =
    currentConversationStreaming || currentConversationHasProgrammaticBrandExtractionRun;
  const currentConversationBusy = currentConversationLoading
    || currentConversationStreaming
    || currentConversationHasActiveRun;
  const currentConversationAwaitingActiveRunAttach =
    currentConversationHasActiveRun
    && !currentConversationStreaming
    && !currentConversationHasProgrammaticBrandExtractionRun;
  const currentConversationSendDisabled = projectMutationReadOnly
    || !projectRunHasBillableAmrPrincipal
    || currentConversationLoading
    || failedMessagesConversationId === activeConversationId
    || currentConversationAwaitingActiveRunAttach;
  const currentConversationActionDisabled = currentConversationBusy || currentConversationSendDisabled;
  const currentConversationQueueDisabled = projectMutationReadOnly
    || currentConversationLoading
    || failedMessagesConversationId === activeConversationId;

  const currentConversationQueuedItems = activeConversationId
    ? queuedChatSends
        .filter((item) => item.conversationId === activeConversationId)
        .map((item) => {
          const queuedItem = {
            id: item.id,
            prompt: item.prompt,
            attachments: item.attachments,
            commentAttachments: item.commentAttachments,
          };
          if (item.meta === undefined) return queuedItem;
          return { ...queuedItem, meta: item.meta };
        })
    : [];
  const newConversationDisabled = creatingConversation || projectMutationReadOnly;
  const activeCompletionNotificationRunsRef = useRef<Set<string>>(new Set());
  const completedNotificationRunsRef = useRef<Set<string>>(new Set());

  // Load conversations on project switch. If none exist (older projects
  // pre-conversations, or a freshly created one whose default seed got
  // dropped), create one on the fly.
  useEffect(() => {
    let cancelled = false;
    const revalidatingCurrentProject =
      conversationsLoadedProjectIdRef.current === project.id;
    const generation = conversationMaterializationGenerationController.begin();
    const requestWorkspaceContext = projectRunWorkspaceContextRef.current;
    conversationMaterializationRecoveryRef.current = null;
    setPendingEmptyConversationSeed(null);
    setConversationLoadError(null);
    setError(null);
    if (!revalidatingCurrentProject) {
      setConversations([]);
      setActiveConversationId(null);
      setMessagesConversationId(null);
      setFailedMessagesConversationId(null);
      setMessageLoadRetryNonce(0);
      setMessages([]);
      commitPreviewComments([]);
      setAttachedComments([]);
      setStreaming(false);
      streamingConversationIdRef.current = null;
      setStreamingConversationId(null);
      setArtifact(null);
      savedArtifactRef.current = null;
    }
    (async () => {
      try {
        const list = await listConversationsWithRetry(
          project.id,
          requestWorkspaceContext,
        );
        if (cancelled) return;
        conversationsLoadedProjectIdRef.current = project.id;
        if (list.length === 0) {
          // Conversation reads can settle before collaboration ownership. Keep
          // the empty result and let the effect below seed only after the
          // fail-closed viewer gate proves this caller may mutate. This avoids
          // both a member's POST -> 403 loop and reloading the whole transcript
          // when status later confirms an owner.
          setConversations([]);
          setActiveConversationId(null);
          setPendingEmptyConversationSeed({
            projectId: project.id,
            authorityKey: projectRunAuthorityKey,
          });
        } else {
          setPendingEmptyConversationSeed(null);
          setConversations(list);
          // Issue #1505: when the URL deep-links to a specific
          // conversation, prefer that one. Falls through to list[0]
          // when the routed id is null or no longer present (the
          // routine row may have been deleted between the route
          // landing and the conversation list loading).
          const routedMatch = routeConversationId
            ? list.find((c) => c.id === routeConversationId) ?? null
            : null;
          const retainedMatch = revalidatingCurrentProject
            ? list.find((c) => c.id === activeConversationIdRef.current) ?? null
            : null;
          setActiveConversationId(
            retainedMatch?.id ?? routedMatch?.id ?? list[0]!.id,
          );
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not load conversations for this project.';
        const materializationRecovery =
          err instanceof ProjectConversationsHttpError
          && err.status === 404
          && requestWorkspaceContext?.workspaceType === 'team'
            ? {
                projectId: project.id,
                authorityKey: projectRunAuthorityKey,
                generation,
                workspaceContext: requestWorkspaceContext,
                errorMessage: message,
              }
            : null;
        conversationMaterializationRecoveryRef.current = materializationRecovery;
        setPendingEmptyConversationSeed(null);
        const accessRevoked =
          err instanceof ProjectConversationsHttpError
          && (err.status === 401 || err.status === 403);
        if (!revalidatingCurrentProject || accessRevoked) {
          setConversations([]);
          setActiveConversationId(null);
        }
        setConversationLoadError(message);
        setError(message);
      }
    })();
    return () => {
      cancelled = true;
      conversationMaterializationGenerationController.invalidate(generation);
      if (
        conversationMaterializationRecoveryRef.current?.generation
        === generation
      ) {
        conversationMaterializationRecoveryRef.current = null;
      }
    };
  }, [
    commitPreviewComments,
    conversationMaterializationGenerationController,
    project.id,
    projectRunAuthorityKey,
  ]);

  const recoverMaterializedConversations = useCallback(async (
    signalProjectId: string,
    signalAuthorityKey: string,
  ) => {
    const recovery = conversationMaterializationRecoveryRef.current;
    if (!recovery) return;
    if (recovery.projectId !== signalProjectId) return;
    if (recovery.authorityKey !== signalAuthorityKey) return;
    if (!conversationMaterializationGenerationController.isCurrent(recovery.generation)) return;
    if (projectIdRef.current !== recovery.projectId) return;
    if (projectRunAuthorityKeyRef.current !== recovery.authorityKey) return;
    if (conversationMaterializationRecoveryInFlightRef.current === recovery) return;
    conversationMaterializationRecoveryInFlightRef.current = recovery;
    try {
      // Materialization completion is already our retry signal, so perform one
      // exact-scoped read here instead of extending the fixed initial retry
      // schedule. A still-early 404 leaves recovery armed for the next signal.
      const list = await listConversations(recovery.projectId, {
        throwOnError: true,
        workspaceContext: recovery.workspaceContext,
      });
      if (conversationMaterializationRecoveryRef.current !== recovery) return;
      if (!conversationMaterializationGenerationController.isCurrent(recovery.generation)) return;
      if (projectIdRef.current !== recovery.projectId) return;
      if (projectRunAuthorityKeyRef.current !== recovery.authorityKey) return;

      conversationMaterializationRecoveryRef.current = null;
      setConversationLoadError(null);
      setError((current) => (
        current === recovery.errorMessage ? null : current
      ));
      if (list.length === 0) {
        setConversations([]);
        setActiveConversationId(null);
        setPendingEmptyConversationSeed({
          projectId: recovery.projectId,
          authorityKey: recovery.authorityKey,
        });
        return;
      }

      setPendingEmptyConversationSeed(null);
      setConversations(list);
      const routedMatch = routeConversationId
        ? list.find((candidate) => candidate.id === routeConversationId) ?? null
        : null;
      setActiveConversationId(routedMatch ? routedMatch.id : list[0]!.id);
    } catch (err) {
      if (conversationMaterializationRecoveryRef.current !== recovery) return;
      if (!conversationMaterializationGenerationController.isCurrent(recovery.generation)) return;
      if (projectIdRef.current !== recovery.projectId) return;
      if (projectRunAuthorityKeyRef.current !== recovery.authorityKey) return;
      if (
        err instanceof ProjectConversationsHttpError
        && err.status === 404
      ) {
        return;
      }
      // A completion signal exposed a settled non-404 failure. Stop treating
      // it as a materialization race and surface that exact response now; a
      // later project/authority load owns only any further retry.
      conversationMaterializationRecoveryRef.current = null;
      const message = err instanceof Error
        ? err.message
        : 'Could not load conversations for this project.';
      setConversationLoadError(message);
      setError((current) => reconcileConversationRecoveryGlobalError(
        current,
        recovery.errorMessage,
        message,
      ));
    } finally {
      if (conversationMaterializationRecoveryInFlightRef.current === recovery) {
        conversationMaterializationRecoveryInFlightRef.current = null;
      }
    }
  }, [
    conversationMaterializationGenerationController,
    routeConversationId,
  ]);

  const emptyConversationWriterAuthorized =
    projectWorkspaceScopeState.scope?.kind === 'personal'
    || projectWorkspaceScopeState.scope?.kind === 'unbound'
    || (
      projectWorkspaceScopeState.scope?.kind === 'team'
      && projectCollab.writerAuthority === 'allowed'
    );
  const emptyConversationReadOnlySettled =
    pendingEmptyConversationSeed?.projectId === project.id
    && pendingEmptyConversationSeed.authorityKey === projectRunAuthorityKey
    && projectCollab.writerAuthority === 'denied';
  useEffect(() => {
    if (
      !pendingEmptyConversationSeed
      || pendingEmptyConversationSeed.projectId !== project.id
      || pendingEmptyConversationSeed.authorityKey !== projectRunAuthorityKey
      || !emptyConversationWriterAuthorized
    ) {
      return;
    }
    let cancelled = false;
    const requestWorkspaceContext = projectRunWorkspaceContextRef.current;
    (async () => {
      try {
        const fresh = await createConversation(project.id, undefined, {
          workspaceContext: requestWorkspaceContext,
        });
        if (cancelled) return;
        if (!fresh) {
          throw new Error('Could not create a conversation for this project.');
        }
        setPendingEmptyConversationSeed(null);
        setConversations([fresh]);
        setActiveConversationId(fresh.id);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Could not create a conversation for this project.';
        setPendingEmptyConversationSeed(null);
        setConversationLoadError(message);
        setError(message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    pendingEmptyConversationSeed,
    emptyConversationWriterAuthorized,
    project.id,
    projectRunAuthorityKey,
  ]);

  // Issue #1505: when the URL changes the routed conversation id while
  // we are already inside the project (e.g. the user clicks "Open
  // project" on a different routine history row in the same project),
  // switch the active conversation without re-fetching the list.
  // Guards: only acts when the routed id is non-null AND present in
  // the already-loaded list, and only when it differs from the current
  // active id. Falls through to a no-op for stale / missing routes so
  // the default picker above keeps its result.
  useEffect(() => {
    if (!routeConversationId) {
      lastSeenRouteConversationIdRef.current = null;
      return;
    }
    if (conversations.length === 0) return;
    if (routeConversationId === activeConversationId) return;
    // When the route still points at the conversation this view last
    // pushed to the URL, the mismatch means a local switch (new
    // conversation, history pick) moved activeConversationId ahead and
    // the URL sync below has not caught up yet. Following the stale
    // route here would fight that sync and remount ChatPane in a loop,
    // so only react to a genuinely external navigation.
    if (routeConversationId === lastSyncedConversationIdRef.current) return;
    if (lastSeenRouteConversationIdRef.current === routeConversationId) return;
    const match = conversations.find((c) => c.id === routeConversationId);
    if (!match) return;
    lastSeenRouteConversationIdRef.current = routeConversationId;
    setActiveConversationId(routeConversationId);
  }, [routeConversationId, conversations, activeConversationId]);

  // Reset chat pane to the open default on project switch. Shared non-owner
  // projects re-collapse once collab status confirms (see below) — but only
  // once per open, so expanding chat after that is sticky for the visit.
  const sharedNonOwnerChatDefaultAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    setWorkspaceFocused(false);
    sharedNonOwnerChatDefaultAppliedRef.current = null;
  }, [project.id]);

  useEffect(() => {
    if (sharedNonOwnerChatDefaultAppliedRef.current === project.id) return;
    if (
      !shouldDefaultCollapseChatForSharedNonOwner({
        enabled: projectCollab.enabled,
        isSharedNonOwner: projectCollab.isSharedNonOwner,
      })
    ) {
      return;
    }
    setWorkspaceFocused(true);
    sharedNonOwnerChatDefaultAppliedRef.current = project.id;
  }, [project.id, projectCollab.enabled, projectCollab.isSharedNonOwner]);

  // Load messages whenever the active conversation changes. This happens
  // on project mount (after conversations load) and on user-triggered
  // conversation switches.
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setMessagesInitialized(false);
      commitPreviewComments([]);
      setAttachedComments([]);
      setMessagesConversationId(null);
      setFailedMessagesConversationId(null);
      messagesConversationIdRef.current = null;
      messagesAuthorityKeyRef.current = null;
      setStreaming(false);
      streamingConversationIdRef.current = null;
      setStreamingConversationId(null);
      return;
    }
    const reloadingCurrentConversation =
      messagesConversationIdRef.current === activeConversationId
      && messagesAuthorityKeyRef.current === projectRunAuthorityKey;
    const liveReloadMessageIds = new Set<string>();
    if (
      messagesConversationIdRef.current === activeConversationId
      && streamingConversationIdRef.current === activeConversationId
      && abortRef.current !== null
      && cancelRef.current !== null
      && projectResourceAuthorityRef.current !== 'denied'
    ) {
      const currentMessages = messagesRef.current;
      let assistantIndex = -1;
      for (let index = currentMessages.length - 1; index >= 0; index -= 1) {
        const message = currentMessages[index];
        if (message?.role === 'assistant' && isActiveRunStatus(message.runStatus)) {
          liveReloadMessageIds.add(message.id);
          assistantIndex = index;
          break;
        }
      }
      for (let index = assistantIndex - 1; index >= 0; index -= 1) {
        const message = currentMessages[index];
        if (message?.role !== 'user') continue;
        liveReloadMessageIds.add(message.id);
        break;
      }
    }
    const preservingLiveConversation = liveReloadMessageIds.size > 0;
    // Reset the initialized flag so auto-send waits for this authoritative DB
    // read to settle before checking messages.length. A same-conversation
    // authority refresh keeps the prior transcript visible. An authority-key
    // handoff keeps only the live turn, so its pending read cannot detach the
    // stream or later replace those rows with an empty snapshot.
    setMessagesInitialized(false);
    let cancelled = false;
    const requestWorkspaceContext = projectRunWorkspaceContextRef.current;
    setFailedMessagesConversationId(null);
    if (!preservingLiveConversation) {
      setMessagesConversationId(null);
      setStreaming(false);
      streamingConversationIdRef.current = null;
      setStreamingConversationId(null);
    }
    if (!reloadingCurrentConversation) {
      setMessages((current) =>
        preservingLiveConversation
          ? current.filter((message) => liveReloadMessageIds.has(message.id))
          : [],
      );
      commitPreviewComments([]);
      setAttachedComments([]);
      setArtifact(null);
      savedArtifactRef.current = null;
    }
    const commentsGeneration = previewCommentsGenerationRef.current;
    if (!reloadingCurrentConversation && !preservingLiveConversation) {
      messagesConversationIdRef.current = null;
      messagesAuthorityKeyRef.current = null;
    }
    (async () => {
      try {
        // Comments are an auxiliary overlay. A slow collaboration read must
        // not keep the persisted transcript (and every recovery action it
        // contains) behind ChatPane's Loading gate. Keep both reads under this
        // effect's project/conversation/authority lifetime, but settle them
        // independently.
        void fetchPreviewComments(
          project.id,
          activeConversationId,
          requestWorkspaceContext,
        ).then((comments) => {
          if (cancelled || previewCommentsGenerationRef.current !== commentsGeneration) return;
          setPreviewComments(comments);
        }).catch(() => {
          if (cancelled || previewCommentsGenerationRef.current !== commentsGeneration) return;
          if (!reloadingCurrentConversation) setPreviewComments([]);
        });
        const list = await listMessages(
          project.id,
          activeConversationId,
          requestWorkspaceContext,
        );
        if (cancelled) return;
        setMessages((current) =>
          preservingLiveConversation
            ? mergeServerMessagesIntoConversation(
                current.filter((message) => liveReloadMessageIds.has(message.id)),
                list,
              )
            : normalizeConversationMessageOrder(list),
        );
        setMessagesInitialized(true);
        setAttachedComments([]);
        setArtifact(null);
        setError(null);
        savedArtifactRef.current = null;
        messagesConversationIdRef.current = activeConversationId;
        messagesAuthorityKeyRef.current = projectRunAuthorityKey;
        setMessagesConversationId(activeConversationId);
        setFailedMessagesConversationId(null);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not load messages for this conversation.';
        if (!reloadingCurrentConversation) {
          setMessages((current) =>
            preservingLiveConversation
              ? current.filter((item) => liveReloadMessageIds.has(item.id))
              : [],
          );
          commitPreviewComments([]);
          setAttachedComments([]);
          setArtifact(null);
          savedArtifactRef.current = null;
        }
        setError(message);
        if (!preservingLiveConversation) {
          messagesConversationIdRef.current = null;
          messagesAuthorityKeyRef.current = null;
          setMessagesConversationId(null);
        }
        setFailedMessagesConversationId(activeConversationId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    project.id,
    activeConversationId,
    commitPreviewComments,
    messageLoadRetryNonce,
    projectRunAuthorityKey,
  ]);

  useEffect(() => {
    if (!projectIsProgrammaticBrandExtraction) return undefined;
    if (!activeConversationId || !messagesInitialized || messages.length > 0) return undefined;
    if (streaming || currentConversationStreaming) return undefined;
    const key = `${project.id}:${activeConversationId}`;
    const retries = brandEmptyTranscriptRetriesRef.current.get(key) ?? 0;
    const delay = BRAND_EMPTY_TRANSCRIPT_RETRY_DELAYS_MS[retries];
    if (delay === undefined) return undefined;
    brandEmptyTranscriptRetriesRef.current.set(key, retries + 1);
    const timer = window.setTimeout(() => {
      void projectDetail.refresh();
      setMessageLoadRetryNonce((nonce) => nonce + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [
    activeConversationId,
    currentConversationStreaming,
    messages.length,
    messagesInitialized,
    project.id,
    projectDetail.refresh,
    projectIsProgrammaticBrandExtraction,
    streaming,
  ]);

  useEffect(() => {
    return () => {
      sendTextBufferRef.current?.cancel();
      sendTextBufferRef.current = null;
      // Unmounts / conversation switches should only detach local stream
      // consumers. Aborting the daemon cancel controllers here turns routine
      // cleanup into an explicit POST /api/runs/:id/cancel, which can mark a
      // live run canceled even when the user never clicked Stop.
      abortRef.current?.abort();
      abortRef.current = null;
      cancelRef.current = null;
      for (const textBuffer of reattachTextBuffersRef.current) textBuffer.cancel();
      reattachTextBuffersRef.current.clear();
      for (const controller of reattachControllersRef.current.values()) {
        if (abortRef.current === controller) abortRef.current = null;
        controller.abort();
      }
      for (const controller of reattachCancelControllersRef.current.values()) {
        // Route changes should only detach the browser-side SSE listener.
        // Aborting this signal maps to POST /cancel, so leave the daemon run alive.
        if (cancelRef.current === controller) cancelRef.current = null;
      }
      reattachControllersRef.current.clear();
      reattachCancelControllersRef.current.clear();
    };
  }, [project.id, activeConversationId]);

  const cancelSendTextBuffer = useCallback((flushPending = false) => {
    if (flushPending) sendTextBufferRef.current?.flush();
    sendTextBufferRef.current?.cancel();
    sendTextBufferRef.current = null;
  }, []);

  const cancelReattachTextBuffers = useCallback((flushPending = false) => {
    for (const textBuffer of reattachTextBuffersRef.current) {
      if (flushPending) textBuffer.flush();
      textBuffer.cancel();
    }
    reattachTextBuffersRef.current.clear();
  }, []);

  const notifyCompletedRun = useCallback((last: ChatMessage) => {
    // Round 7 (mrcfps @ useDesignMdState.ts:131): a chat turn just
    // settled — conversation updatedAt almost certainly moved, so
    // recompute DESIGN.md staleness even when the turn produced no
    // file mutations or live artifacts.
    setDesignMdRefreshKey((n) => n + 1);

    const status =
      last.resultDeliveryState === 'no_result' ||
      last.resultDeliveryState === 'delivery_failed'
        ? 'failed'
        : last.runStatus;
    if (status !== 'succeeded' && status !== 'failed') return;

    const cfg = config.notifications ?? DEFAULT_NOTIFICATIONS;
    if (cfg.soundEnabled) {
      playSound(status === 'succeeded' ? cfg.successSoundId : cfg.failureSoundId);
    }

    if (cfg.desktopEnabled) {
      // System notifications are useful only when the task is not already in
      // front of the user. Sounds remain independent feedback for both states.
      const isHidden = typeof document !== 'undefined' && document.hidden;
      const isFocused = typeof document === 'undefined' ? true : document.hasFocus();
      if (isHidden || !isFocused) {
        const title = status === 'succeeded'
          ? t('notify.successTitle')
          : t('notify.failureTitle');
        const fallbackBody = status === 'succeeded'
          ? t('notify.successBody')
          : t('notify.failureBody');
        const trimmed = (last.content ?? '').trim();
        const body = trimmed ? trimmed.slice(0, 80) : fallbackBody;
        void showCompletionNotification({
          status,
          title,
          body,
          onClick: () => {
            if (typeof window !== 'undefined') window.focus();
          },
        });
      }
    }
  }, [config.notifications, t]);

  // Fire completion feedback from assistant run-status transitions rather than
  // from the local SSE listener state. A run can finish while its conversation
  // is detached; when the user returns, the terminal status should still produce
  // the one completion notification for runs this view previously saw active.
  useEffect(() => {
    const completedMessages: ChatMessage[] = [];
    for (const message of messages) {
      if (message.role !== 'assistant') continue;
      const keys = message.runId ? [message.runId, message.id] : [message.id];
      if (isActiveRunStatus(message.runStatus)) {
        for (const key of keys) activeCompletionNotificationRunsRef.current.add(key);
        continue;
      }
      if (message.runStatus !== 'succeeded' && message.runStatus !== 'failed') continue;
      if (message.runStatus === 'succeeded' && designDeliveryVerificationPending(message)) continue;
      if (!keys.some((key) => activeCompletionNotificationRunsRef.current.has(key))) continue;
      if (keys.some((key) => completedNotificationRunsRef.current.has(key))) continue;
      for (const key of keys) completedNotificationRunsRef.current.add(key);
      completedMessages.push(message);
    }

    for (const message of completedMessages) notifyCompletedRun(message);
  }, [messages, notifyCompletedRun]);

  // Hydrate the open-tabs state once per project. After this initial
  // load, every mutation flows through saveTabsState() which keeps DB +
  // local state coherent.
  useEffect(() => {
    let cancelled = false;
    const requestWorkspaceContext = projectRunWorkspaceContextRef.current;
    tabsLoadedRef.current = false;
    tabsHydratedFromSavedStateRef.current = false;
    hasAppliedInitialPrimaryOpenRef.current = false;
    setOpenTabsState({ tabs: [], active: null });
    (async () => {
      const state = await loadTabs(project.id, requestWorkspaceContext, {
        reconcileNewerCacheToDaemon: projectTabsCanPersistToDaemonRef.current,
      });
      if (cancelled) return;
      const routeActive = routeFileNameRef.current;
      let nextState = routeActive
        ? {
            ...state,
            tabs: state.tabs.includes(routeActive)
              ? state.tabs
              : [...state.tabs, routeActive],
            active: routeActive,
          }
        : state;
      const routeChangesSavedState = Boolean(
        routeActive
        && (
          state.active !== routeActive
          || !state.tabs.includes(routeActive)
        ),
      );
      if (routeActive && routeChangesSavedState) {
        nextState = cacheTabsLocally(
          project.id,
          nextState,
          requestWorkspaceContext,
        );
        if (projectTabsCanPersistToDaemonRef.current) {
          void persistTabsToDaemonNow(
            project.id,
            nextState,
            requestWorkspaceContext,
          );
        }
      }
      tabsHydratedFromSavedStateRef.current = state.hasSavedState === true;
      setOpenTabsState(nextState);
      tabsLoadedRef.current = true;
      setTabsHydrationVersion((version) => version + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id, projectRunAuthorityKey]);

  // Debounce the canonical (daemon + SQLite) tab-state write. The embedded
  // browser fans out url/title/favicon updates in bursts on a single page load
  // (did-navigate, did-navigate-in-page, page-title-updated, favicon), and each
  // used to be a localStorage write + HTTP PUT + SQLite UPDATE + re-render.
  // We keep React state and the local cache IMMEDIATE (so the UI and a reload
  // are never stale) and coalesce only the daemon PUT.
  const tabsDaemonSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDaemonTabsRef = useRef<{
    projectId: string;
    state: OpenTabsState;
    workspaceContext: WorkspaceCollabContext | null;
  } | null>(null);
  const flushTabsDaemonSave = useCallback(() => {
    if (tabsDaemonSaveTimerRef.current != null) {
      clearTimeout(tabsDaemonSaveTimerRef.current);
      tabsDaemonSaveTimerRef.current = null;
    }
    const pending = pendingDaemonTabsRef.current;
    pendingDaemonTabsRef.current = null;
    if (pending) {
      void persistTabsToDaemonNow(
        pending.projectId,
        pending.state,
        pending.workspaceContext,
      );
    }
  }, []);

  const persistTabsState = useCallback(
    (next: OpenTabsState) => {
      setOpenTabsState(next);
      if (!tabsLoadedRef.current) return;
      // Immediate, cheap, synchronous — keeps the cache canonical for reload.
      const stamped = cacheTabsLocally(
        project.id,
        next,
        projectRunWorkspaceContext,
      );
      if (!projectTabsCanPersistToDaemon) {
        if (tabsDaemonSaveTimerRef.current != null) {
          clearTimeout(tabsDaemonSaveTimerRef.current);
          tabsDaemonSaveTimerRef.current = null;
        }
        pendingDaemonTabsRef.current = null;
        return;
      }
      pendingDaemonTabsRef.current = {
        projectId: project.id,
        state: stamped,
        workspaceContext: projectRunWorkspaceContext,
      };
      if (tabsDaemonSaveTimerRef.current != null) {
        clearTimeout(tabsDaemonSaveTimerRef.current);
      }
      tabsDaemonSaveTimerRef.current = setTimeout(() => {
        tabsDaemonSaveTimerRef.current = null;
        const pending = pendingDaemonTabsRef.current;
        pendingDaemonTabsRef.current = null;
        if (pending) {
          void persistTabsToDaemonNow(
            pending.projectId,
            pending.state,
            pending.workspaceContext,
          );
        }
      }, TAB_PERSIST_DEBOUNCE_MS);
    },
    [
      project.id,
      projectRunWorkspaceContext,
      projectTabsCanPersistToDaemon,
    ],
  );

  // Revocation can arrive without another tab interaction. Discard a queued
  // write immediately instead of letting its old authority fire after the
  // project has become read-only.
  useEffect(() => {
    if (projectTabsCanPersistToDaemon) return;
    if (tabsDaemonSaveTimerRef.current != null) {
      clearTimeout(tabsDaemonSaveTimerRef.current);
      tabsDaemonSaveTimerRef.current = null;
    }
    pendingDaemonTabsRef.current = null;
  }, [projectTabsCanPersistToDaemon]);

  // Flush any pending tab write when the project changes or the view unmounts,
  // so a fast project switch / close doesn't leave the daemon a debounce behind.
  useEffect(
    () => flushTabsDaemonSave,
    [flushTabsDaemonSave, project.id],
  );

  const handleActiveWorkspaceContextChange = useCallback((next: WorkspaceContextItem | null) => {
    setActiveWorkspaceContext((current) =>
      workspaceContextItemEqual(current, next) ? current : next,
    );
  }, []);

  const handleMobileScreenSelection = useCallback((screen: MobileScreenRecord | null) => {
    setSelectedMobileScreen(
      screen
        ? {
            id: `mobile-screen:${screen.id}`,
            kind: 'mobile-screen',
            label: screen.name,
            path: screen.file,
            title: screen.id,
          }
        : null,
    );
  }, []);

  const handleMobileEditorMetadataChange = useCallback(async (
    mobileEditor: ProjectMetadata['mobileEditor'],
  ) => {
    if (!mobileEditor || !currentProject.metadata || projectMutationReadOnly) return;
    const updated = await patchProject(
      project.id,
      {
        metadata: {
          ...currentProject.metadata,
          platformMode: 'mobile',
          mobileEditor,
        },
      },
      projectRunWorkspaceContext,
    );
    if (updated) onProjectChange(updated);
  }, [
    currentProject.metadata,
    onProjectChange,
    project.id,
    projectMutationReadOnly,
    projectRunWorkspaceContext,
  ]);

  const handleWorkspaceContextsChange = useCallback((next: WorkspaceContextItem[]) => {
    // This runs in a post-commit effect inside FileWorkspace: on any tab
    // mutation the workspace-context set changes and this setState schedules a
    // SECOND full render of the entire ProjectView -> FileWorkspace ->
    // FileViewer tree, on top of the tab-state render that triggered it. The
    // result only feeds the composer's @-mention context picker, which never
    // needs to update in the same frame the user closes a tab. Marking it as a
    // transition lets the urgent tab-close render commit first (tab disappears
    // immediately) and defers this heavy second pass so it no longer stalls the
    // interaction.
    startTransition(() => {
      setWorkspaceContexts((current) =>
        workspaceContextItemsEqual(current, next) ? current : next,
      );
    });
  }, []);

  const refreshProjectFiles = useCallback(async (
    options?: { fresh?: boolean },
    onAcceptedGeneration?: (generation: number) => void,
  ): Promise<ProjectFile[]> => {
    const requestSeq = ++projectFilesRequestSeqRef.current;
    const requestedRefreshKey = filesRefreshRequestKeyRef.current;
    let next: ProjectFile[];
    try {
      next = await fetchProjectFiles(project.id, {
        workspaceContext: projectRunWorkspaceContextRef.current,
        requireAuthoritative: true,
        ...(options?.fresh ? { fresh: true } : {}),
      });
    } catch {
      // A transport/HTTP failure is not an authoritative empty directory.
      // Keep the last accepted snapshot and generation, while preserving the
      // refresh helper's historical resolved-list contract for its callers.
      return projectFilesRef.current;
    }
    if (requestSeq === projectFilesRequestSeqRef.current) {
      const acceptedGeneration = projectFilesGenerationRef.current + 1;
      projectFilesGenerationRef.current = acceptedGeneration;
      projectFilesRef.current = next;
      // Commit the list and both observation witnesses atomically. A refresh
      // request must never publish a new key or generation alongside an older
      // file snapshot.
      setProjectFilesSnapshot({
        files: next,
        refreshKey: requestedRefreshKey,
        generation: acceptedGeneration,
      });
      onAcceptedGeneration?.(acceptedGeneration);
    }
    return next;
  }, [project.id, projectRunAuthorityKey]);

  useEffect(() => {
    projectFilesRef.current = projectFiles;
  }, [projectFiles]);

  // Cache HTML file contents so the auto-open module check (issue #2744) does
  // not re-fetch unchanged entries on every Write. Keyed by file name with the
  // mtime stored alongside, so a rewrite REPLACES the file's single entry
  // rather than accreting a new key. Bounded by the project's HTML file count.
  const htmlContentCacheRef = useRef<Map<string, { mtime: number; text: string | null }>>(
    new Map(),
  );
  const readProjectHtml = useCallback(
    async (name: string): Promise<string | null> => {
      const file = projectFilesRef.current.find((entry) => entry.name === name);
      const mtime = file?.mtime ?? 0;
      const cached = htmlContentCacheRef.current.get(name);
      if (cached && cached.mtime === mtime) return cached.text;
      try {
        const text = await fetchProjectFileText(project.id, name, {
          workspaceContext: projectRunWorkspaceContextRef.current,
        });
        htmlContentCacheRef.current.set(name, { mtime, text });
        return text;
      } catch {
        htmlContentCacheRef.current.set(name, { mtime, text: null });
        return null;
      }
    },
    [project.id, projectRunAuthorityKey],
  );

  const refreshLiveArtifacts = useCallback(async (): Promise<LiveArtifactSummary[]> => {
    const next = await fetchLiveArtifacts(project.id, {
      workspaceContext: projectRunWorkspaceContextRef.current,
    });
    setLiveArtifacts(next);
    return next;
  }, [project.id, projectRunAuthorityKey]);

  const refreshWorkspaceItems = useCallback(async (
    options?: { freshProjectFiles?: boolean },
    onAcceptedFilesGeneration?: (generation: number) => void,
  ): Promise<ProjectFile[]> => {
    const [nextFiles] = await Promise.all([
      refreshProjectFiles({ fresh: options?.freshProjectFiles }, onAcceptedFilesGeneration),
      refreshLiveArtifacts(),
    ]);
    return nextFiles;
  }, [refreshLiveArtifacts, refreshProjectFiles]);

  const refreshFileWorkspace = useCallback(async (
    options?: { fresh?: boolean },
  ): Promise<FileRefreshResult> => {
    let acceptedGeneration: number | null = null;
    await refreshWorkspaceItems(
      { freshProjectFiles: options?.fresh },
      (generation) => { acceptedGeneration = generation; },
    );
    return { acceptedGeneration };
  }, [refreshWorkspaceItems]);

  const previousMaterializationDownloadRef = useRef<{
    projectId: string;
    authorityKey: string;
    pending: boolean;
  } | null>(null);
  useEffect(() => {
    const previous = previousMaterializationDownloadRef.current;
    const sameAuthority = previous?.projectId === project.id
      && previous.authorityKey === projectRunAuthorityKey;
    previousMaterializationDownloadRef.current = {
      projectId: project.id,
      authorityKey: projectRunAuthorityKey,
      pending: projectCollab.downloadPending,
    };
    if (
      !sameAuthority
      || !previous.pending
      || projectCollab.downloadPending
    ) {
      return;
    }

    // The first file read for a newly opened Team mirror can legitimately
    // observe the empty placeholder directory. Materialization replaces that
    // directory without producing a chokidar event for a stream that was not
    // connected yet, so settling the download is itself an authoritative file
    // invalidation. Fence the placeholder snapshot and fetch the exact scoped
    // directory now; otherwise the first view stays empty until it is reopened.
    invalidateProjectFilesCache(
      project.id,
      projectRunWorkspaceContextRef.current,
    );
    void refreshWorkspaceItems({ freshProjectFiles: true }).catch(() => {
      // Preserve the last accepted snapshot on a transient transport failure.
      // The project event stream and ordinary refresh paths remain retries.
    });
    void recoverMaterializedConversations(project.id, projectRunAuthorityKey);
  }, [
    project.id,
    projectRunAuthorityKey,
    projectCollab.downloadPending,
    recoverMaterializedConversations,
    refreshWorkspaceItems,
  ]);

  useEffect(() => {
    if (!currentBrandExtractionId) {
      terminalBrandPreviewRefreshRef.current = null;
      return;
    }
    if (!brandExtractionAllowsEditing(effectiveBrandExtractionStatus)) {
      terminalBrandPreviewRefreshRef.current = null;
      return;
    }
    const refreshKey = `${currentBrandExtractionId}:${effectiveBrandExtractionStatus}`;
    if (terminalBrandPreviewRefreshRef.current === refreshKey) return;
    terminalBrandPreviewRefreshRef.current = refreshKey;
    void refreshWorkspaceItems().catch(() => {});
    bumpFilesRefresh();
  }, [
    currentBrandExtractionId,
    effectiveBrandExtractionStatus,
    refreshWorkspaceItems,
  ]);

  useEffect(() => {
    if (!tabsLoadedRef.current) return;
    if (hasAppliedInitialPrimaryOpenRef.current) return;
    if (routeFileName) return;
    if (openTabsState.active || openTabsState.tabs.length > 0) {
      hasAppliedInitialPrimaryOpenRef.current = true;
      return;
    }
    if (tabsHydratedFromSavedStateRef.current) {
      hasAppliedInitialPrimaryOpenRef.current = true;
      return;
    }
    const primaryFile = selectPrimaryProjectFile(projectFiles);
    if (!primaryFile) return;
    hasAppliedInitialPrimaryOpenRef.current = true;
    persistTabsState({ tabs: [primaryFile.name], active: primaryFile.name });
  }, [openTabsState.active, openTabsState.tabs.length, persistTabsState, projectFiles, routeFileName]);

  const requestOpenFile = useCallback((name: string) => {
    if (!name) return;
    setOpenRequest({ name, nonce: Date.now() });
  }, []);

  useEffect(() => {
    const designSystemId = brandReady?.designSystemId;
    if (!designSystemId) return;
    if (handledBrandReadyDesignSystemRef.current === designSystemId) return;
    handledBrandReadyDesignSystemRef.current = designSystemId;
    pendingBrandDesignSystemOpenRef.current = designSystemId;
    void (async () => {
      try {
        await Promise.all([
          projectDetail.refresh(),
          Promise.resolve(onDesignSystemsRefresh?.()),
          refreshWorkspaceItems(),
        ]);
        onProjectsRefresh();
        if (activeConversationId) {
          setMessageLoadRetryNonce((nonce) => nonce + 1);
        }
      } catch (err) {
        handledBrandReadyDesignSystemRef.current = null;
        console.warn('[brand] failed to refresh ready design system state', err);
      }
    })();
  }, [
    activeConversationId,
    brandReady?.designSystemId,
    onDesignSystemsRefresh,
    onProjectsRefresh,
    projectDetail.refresh,
    refreshWorkspaceItems,
  ]);

  const persistArtifact = useCallback(
    async (
      art: Artifact,
      projectFilesSnapshot?: ProjectFile[],
      sourceText?: string,
      options: { pointerMinMtime?: number } = {},
    ) => {
      const persistedHtml = resolvePersistedArtifactHtml({
        artifactHtml: art.html,
        identifier: art.identifier,
        sourceText,
      });
      const artifactToPersist = persistedHtml === art.html ? art : { ...art, html: persistedHtml };
      const baseName = artifactBaseNameFor(art);
      const ext = artifactExtensionFor(art);
      const currentProjectFiles = projectFilesSnapshot ?? projectFilesRef.current;
      const existing = new Set(currentProjectFiles.map((f) => f.name));
      let fileName = `${baseName}${ext}`;
      // A non-empty identifier is stable artifact identity: when its canonical
      // filename already exists, update that file in place. Title- and
      // fallback-derived names still suffix collisions so new artifacts cannot
      // silently replace unrelated project files.
      const updatesExplicitlyIdentifiedFile =
        Boolean(art.identifier?.trim()) && existing.has(fileName);
      let c…59396 tokens truncated…pshot.status === 'running' || snapshot.status === 'queued') continue;
          const endedAt = snapshot.endedAt ?? Date.now();
          setActivePluginActionPaths((prev) => {
            const next = new Set(prev);
            next.delete(relativePath);
            return next;
          });
          setHiddenAssistantPluginActionPaths((prev) => {
            const next = new Set(prev);
            next.delete(relativePath);
            return next;
          });
          if (snapshot.status === 'done' && snapshot.result) {
            setForceStreamingPluginMessageIds((prev) => {
              const next = new Set(prev);
              next.delete(messageId);
              return next;
            });
            replaceConversationMessage(
              conversationId,
              {
                ...progressMessage,
                content: pluginWorkflowSuccessContent(
                  action,
                  relativePath,
                  snapshot.result.message,
                  snapshot.result.url,
                  snapshot.result.log,
                ),
                events: pluginWorkflowResultEvents(
                  action,
                  relativePath,
                  snapshot.result.message,
                  snapshot.result.url,
                  snapshot.result.log,
                  true,
                  liveEvents,
                ),
                endedAt,
                runStatus: 'succeeded',
              },
              { telemetryFinalized: true },
            );
            updateConversationLatestRun('succeeded', endedAt);
            return;
          }
          const errorMessage = snapshot.error?.message || `${pluginWorkflowTitle(action)} failed.`;
          setForceStreamingPluginMessageIds((prev) => {
            const next = new Set(prev);
            next.delete(messageId);
            return next;
          });
          replaceConversationMessage(
            conversationId,
            {
              ...progressMessage,
              content: pluginWorkflowFailureContent(
                action,
                relativePath,
                errorMessage,
                snapshot.error?.log,
              ),
              events: pluginWorkflowResultEvents(
                action,
                relativePath,
                errorMessage,
                undefined,
                snapshot.error?.log,
                false,
                liveEvents,
              ),
              endedAt,
              runStatus: 'failed',
            },
            { telemetryFinalized: true },
          );
          updateConversationLatestRun('failed', endedAt);
          return;
        }
      })().catch((err) => {
        const endedAt = Date.now();
        setForceStreamingPluginMessageIds((prev) => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
        setActivePluginActionPaths((prev) => {
          const next = new Set(prev);
          next.delete(relativePath);
          return next;
        });
        setHiddenAssistantPluginActionPaths((prev) => {
          const next = new Set(prev);
          next.delete(relativePath);
          return next;
        });
        replaceConversationMessage(
          conversationId,
          {
            ...progressMessage,
            content: pluginWorkflowFailureContent(
              action,
              relativePath,
              err instanceof Error ? err.message : String(err),
            ),
            events: pluginWorkflowResultEvents(
              action,
              relativePath,
              err instanceof Error ? err.message : String(err),
              undefined,
              [],
              false,
            ),
            endedAt,
            runStatus: 'failed',
          },
          { telemetryFinalized: true },
        );
        updateConversationLatestRun('failed', endedAt);
      });
      return;
    },
    [
      activeConversationId,
      appendConversationMessage,
      currentConversationActionDisabled,
      pluginWorkflowAgentName,
      project.id,
      projectRunWorkspaceContext,
      replaceConversationMessage,
    ],
  );

  // "Share to OpenDesign" — kicks off the bundled `od-share-to-community`
  // scenario in the active conversation. We just inject the trigger prompt
  // through the standard chat-send path; the agent then loads SKILL.md and
  // drives the rest. Keep this preparing state alive for the resulting chat
  // run so the action reads as async packaging instead of instant sharing.
  const [shareToOpenDesignBusyMessageId, setShareToOpenDesignBusyMessageId] = useState<string | null>(null);
  const shareToOpenDesignBusyMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!shareToOpenDesignBusyMessageIdRef.current || currentConversationBusy) return;
    shareToOpenDesignBusyMessageIdRef.current = null;
    setShareToOpenDesignBusyMessageId(null);
  }, [currentConversationBusy]);
  const handleShareToOpenDesign = useCallback((assistantMessageId: string) => {
    if (currentConversationActionDisabled || shareToOpenDesignBusyMessageIdRef.current) return;
    shareToOpenDesignBusyMessageIdRef.current = assistantMessageId;
    setShareToOpenDesignBusyMessageId(assistantMessageId);
    void Promise.resolve(handleSend(SHARE_TO_COMMUNITY_PROMPT, [], []))
      .then((started) => {
        if (started) return;
        shareToOpenDesignBusyMessageIdRef.current = null;
        setShareToOpenDesignBusyMessageId(null);
      })
      .catch(() => {
        shareToOpenDesignBusyMessageIdRef.current = null;
        setShareToOpenDesignBusyMessageId(null);
      });
  }, [currentConversationActionDisabled, handleSend]);

  const sentDesignSystemReviewTaskKeysRef = useRef<Set<string>>(new Set());
  const persistDesignSystemReviewEntry = useCallback((
    sectionTitle: string,
    entry: DesignSystemReviewEntry,
  ) => {
    const baseMetadata: ProjectMetadata = {
      kind: project.metadata?.kind ?? 'other',
      ...project.metadata,
    };
    const metadata: ProjectMetadata = {
      ...baseMetadata,
      designSystemReview: {
        ...(baseMetadata.designSystemReview ?? {}),
        [sectionTitle]: entry,
      },
    };
    onProjectChange({ ...project, metadata });
    void patchProject(project.id, { metadata }, projectRunWorkspaceContext);
  }, [onProjectChange, project, projectRunWorkspaceContext]);

  const sendDesignSystemFeedback = useCallback((
    sectionTitle: string,
    feedback: string,
    sectionFiles: string[],
  ): DesignSystemReviewAgentTask | void => {
    const cleanFeedback = feedback.trim();
    if (!cleanFeedback) return;
    const prompt = designSystemNeedsWorkPrompt(sectionTitle, cleanFeedback, sectionFiles);
    const queuedAt = new Date().toISOString();
    if (!activeConversationId || !messagesInitialized || currentConversationActionDisabled) {
      return {
        status: 'queued',
        prompt,
        queuedAt,
      };
    }
    const task: DesignSystemReviewAgentTask = {
      status: 'sent',
      prompt,
      queuedAt,
      sentAt: queuedAt,
    };
    sentDesignSystemReviewTaskKeysRef.current.add(`${sectionTitle}:${queuedAt}`);
    void handleSend(prompt, designSystemFeedbackAttachments(projectFiles, sectionFiles), []);
    return task;
  }, [
    activeConversationId,
    currentConversationActionDisabled,
    handleSend,
    messagesInitialized,
    projectFiles,
  ]);
  const persistDesignSystemReviewDecision = useCallback((
    sectionTitle: string,
    decision: DesignSystemReviewEntry['decision'],
    details?: DesignSystemReviewDetails,
  ) => {
    const entry: DesignSystemReviewEntry = {
      decision,
      updatedAt: new Date().toISOString(),
    };
    if (details?.feedback) entry.feedback = details.feedback;
    if (details?.files) entry.files = details.files;
    if (details?.agentTask) entry.agentTask = details.agentTask;
    persistDesignSystemReviewEntry(sectionTitle, entry);
  }, [persistDesignSystemReviewEntry]);
  useEffect(() => {
    if (!activeConversationId || !messagesInitialized || currentConversationActionDisabled) return;
    const queued = Object.entries(project.metadata?.designSystemReview ?? {}).find(
      ([, entry]) =>
        entry.decision === 'needs-work'
        && Boolean(entry.feedback?.trim())
        && entry.agentTask?.status === 'queued',
    );
    if (!queued) return;
    const [sectionTitle, entry] = queued;
    const task = entry.agentTask;
    if (!task) return;
    const taskKey = `${sectionTitle}:${task.queuedAt}`;
    if (sentDesignSystemReviewTaskKeysRef.current.has(taskKey)) return;
    sentDesignSystemReviewTaskKeysRef.current.add(taskKey);
    const sectionFiles = entry.files ?? [];
    const prompt = task.prompt || designSystemNeedsWorkPrompt(
      sectionTitle,
      entry.feedback ?? '',
      sectionFiles,
    );
    const sentAt = new Date().toISOString();
    persistDesignSystemReviewEntry(sectionTitle, {
      ...entry,
      agentTask: {
        ...task,
        status: 'sent',
        prompt,
        sentAt,
      },
    });
    void handleSend(prompt, designSystemFeedbackAttachments(projectFiles, sectionFiles), []);
  }, [
    activeConversationId,
    currentConversationActionDisabled,
    handleSend,
    messagesInitialized,
    persistDesignSystemReviewEntry,
    project.metadata?.designSystemReview,
    projectFiles,
  ]);

  const handleNewConversation = useCallback(async () => {
    if (projectMutationReadOnly) return;
    if (creatingConversationRef.current) return;
    // Only block if we're sure the current conversation is empty:
    // messages must be loaded AND match the active conversation.
    if (
      messagesConversationIdRef.current === activeConversationId &&
      messages.length === 0
    ) {
      return;
    }
    creatingConversationRef.current = true;
    setCreatingConversation(true);
    setConversationLoadError(null);
    try {
      const fresh = await createConversation(project.id, undefined, {
        workspaceContext: projectRunWorkspaceContext,
      });
      if (!fresh) throw new Error('Could not create a conversation for this project.');
      // Eagerly clear messages and update ref so rapid clicks don't create
      // duplicate empty conversations before the effect resolves.
      setMessages([]);
      commitPreviewComments([]);
      setAttachedComments([]);
      setArtifact(null);
      savedArtifactRef.current = null;
      setStreaming(false);
      streamingConversationIdRef.current = null;
      setStreamingConversationId(null);
      setMessagesConversationId(null);
      messagesConversationIdRef.current = fresh.id;
      messagesAuthorityKeyRef.current = projectRunAuthorityKey;
      setConversations((curr) => [fresh, ...curr]);
      setActiveConversationId(fresh.id);
      // Push the new conversation id into the URL synchronously so the
      // route-sync effect sees a matching `routeConversationId` before
      // it can revert `activeConversationId`. Without this, the route-sync
      // effect can fight the conversation switch, preventing users from
      // switching back to older conversations after creating a new one.
      navigate(
        {
          kind: 'project',
          projectId: project.id,
          conversationId: fresh.id,
          fileName: openTabsState.active ?? null,
        },
        { replace: true },
      );
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create a conversation for this project.';
      setConversationLoadError(message);
      setError(message);
    } finally {
      creatingConversationRef.current = false;
      setCreatingConversation(false);
    }
  }, [
    project.id,
    activeConversationId,
    commitPreviewComments,
    messages.length,
    navigate,
    openTabsState.active,
    projectRunWorkspaceContext,
    projectRunAuthorityKey,
    projectMutationReadOnly,
  ]);

  const handleSelectConversation = useCallback((id: string) => {
    if (id === activeConversationId && failedMessagesConversationId !== id) return;
    setMessages([]);
    commitPreviewComments([]);
    setAttachedComments([]);
    setArtifact(null);
    setStreaming(false);
    streamingConversationIdRef.current = null;
    setStreamingConversationId(null);
    setMessagesConversationId(null);
    setFailedMessagesConversationId(null);
    setConversationLoadError(null);
    messagesConversationIdRef.current = null;
    messagesAuthorityKeyRef.current = null;
    setActiveConversationId(id);
    // Push the new conversation id into the URL synchronously so the
    // route-sync effect at L512 sees a matching `routeConversationId`
    // before it can find the previous conversation in the list and
    // revert `activeConversationId` to it. Without this, the same
    // effect that fights handleNewConversation also fights chat
    // switching, ping-ponging until React's nested-update guard fires.
    navigate(
      {
        kind: 'project',
        projectId: project.id,
        conversationId: id,
        fileName: openTabsState.active ?? null,
      },
      { replace: true },
    );
    setMessageLoadRetryNonce((nonce) => nonce + 1);
  }, [activeConversationId, commitPreviewComments, failedMessagesConversationId, project.id, openTabsState.active]);

  const refreshConversationsForProgrammaticBrandRetry = useCallback(
    async (conversationId: string): Promise<boolean> => {
      const capturedProjectId = project.id;
      const myToken = ++conversationsRefreshTokenRef.current;
      try {
        const list = await listConversations(capturedProjectId, {
          workspaceContext: projectRunWorkspaceContext,
        });
        if (projectIdRef.current !== capturedProjectId) return false;
        if (conversationsRefreshTokenRef.current !== myToken) return false;
        setConversations(ensureConversationPresent(list, conversationId, capturedProjectId));
        return true;
      } catch (err) {
        if (projectIdRef.current !== capturedProjectId) return false;
        if (conversationsRefreshTokenRef.current !== myToken) return false;
        console.warn('Failed to refresh conversations after brand extraction retry', err);
        setConversations((curr) =>
          ensureConversationPresent(curr, conversationId, capturedProjectId),
        );
        return true;
      }
    },
    [project.id, projectRunWorkspaceContext],
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      if (projectMutationReadOnly) return;
      const ok = await deleteConversationApi(
        project.id,
        id,
        projectRunWorkspaceContext,
      );
      if (!ok) return;
      // The deleted conversation may have owned an unanswered
      // `<question-form>`, which the daemon counts toward the project's
      // `needsInput` flag in `/api/projects`. Home cards render that
      // flag from the cached projects payload, so without refreshing
      // it here the `Needs input` badge survives the deletion until
      // the next manual reload.
      onProjectsRefresh();
      setConversations((curr) => {
        const next = curr.filter((c) => c.id !== id);
        if (next.length === 0) {
          // Re-seed so the project always has at least one conversation
          // to write into.
          void createConversation(project.id, undefined, {
            workspaceContext: projectRunWorkspaceContext,
          }).then((fresh) => {
            if (fresh) {
              setConversations([fresh]);
              setActiveConversationId(fresh.id);
            }
          });
        } else if (id === activeConversationId) {
          setActiveConversationId(next[0]!.id);
        }
        return next;
      });
    },
    [
      project.id,
      activeConversationId,
      onProjectsRefresh,
      projectRunWorkspaceContext,
      projectMutationReadOnly,
    ],
  );

  const handleRenameConversation = useCallback(
    async (id: string, title: string) => {
      if (projectMutationReadOnly) return;
      const trimmed = title.trim() || null;
      setConversations((curr) =>
        curr.map((c) => (c.id === id ? { ...c, title: trimmed } : c)),
      );
      await patchConversation(
        project.id,
        id,
        { title: trimmed },
        projectRunWorkspaceContext,
      );
    },
    [project.id, projectRunWorkspaceContext, projectMutationReadOnly],
  );

  const handleConversationSessionModeChange = useCallback(
    async (id: string, sessionMode: ChatSessionMode) => {
      if (projectMutationReadOnly) return;
      setConversations((curr) =>
        curr.map((conversation) =>
          conversation.id === id ? { ...conversation, sessionMode } : conversation,
        ),
      );
      const updated = await patchConversation(
        project.id,
        id,
        { sessionMode },
        projectRunWorkspaceContext,
      );
      if (updated) {
        setConversations((curr) =>
          curr.map((conversation) =>
            conversation.id === id ? { ...conversation, ...updated } : conversation,
          ),
        );
      }
    },
    [project.id, projectRunWorkspaceContext, projectMutationReadOnly],
  );

  const handleActiveConversationSessionModeChange = useCallback(
    (sessionMode: ChatSessionMode) => {
      if (!activeConversationId) return;
      void handleConversationSessionModeChange(activeConversationId, sessionMode);
    },
    [activeConversationId, handleConversationSessionModeChange],
  );

  const handleForkFromMessage = useCallback(
    async (assistantMessage: ChatMessage) => {
      if (!activeConversationId || forkingMessageId || projectMutationReadOnly) return;
      const requestId = analytics.newRequestId();
      const startedAt = Date.now();
      const forkIndex = messages.findIndex((message) => message.id === assistantMessage.id);
      const forkContext = {
        page_name: 'chat_panel' as const,
        area: 'chat_panel' as const,
        element: 'assistant_fork_button' as const,
        action: 'fork_conversation' as const,
        project_id: project.id,
        project_kind: projectKindFromMetadataToTracking(project.metadata),
        conversation_id: activeConversationId,
        assistant_message_id: assistantMessage.id,
        source_run_id: assistantMessage.runId ?? null,
        source_agent_id: assistantMessage.agentId ?? 'unknown',
        agent_provider_id: runAgentProviderId(assistantMessage.agentId ?? 'unknown'),
        session_mode: sessionModeToTracking(activeSessionMode),
        fork_point: conversationForkPoint(messages, assistantMessage.id, forkIndex),
        seed_message_count: forkIndex < 0 ? null : forkIndex + 1,
        conversation_message_count: messages.length,
        messages_after_fork_count: forkIndex < 0 ? null : messages.length - forkIndex - 1,
      };
      trackConversationForkClick(analytics.track, forkContext, { requestId });
      setForkingMessageId(assistantMessage.id);
      setConversationLoadError(null);
      let emptyResponse = false;
      try {
        const sourceTitle = activeConversation?.title?.trim();
        const forkTitle = sourceTitle
          ? t('chat.forkedConversationTitle', { title: sourceTitle })
          : undefined;
        const forkFallbackPredecessorMessageId = forkIndex < 0
          ? undefined
          : (messages[forkIndex - 1]?.id ?? null);
        const fresh = await createConversation(project.id, forkTitle, {
          seedFromConversationId: activeConversationId,
          forkAfterMessageId: assistantMessage.id,
          sessionMode: activeSessionMode,
          forkFallbackMessage:
            forkFallbackPredecessorMessageId === undefined ? undefined : assistantMessage,
          forkFallbackPredecessorMessageId,
          workspaceContext: projectRunWorkspaceContext,
          throwOnError: true,
        });
        if (!fresh) {
          emptyResponse = true;
          throw new Error(t('chat.forkConversationFailed'));
        }
        trackConversationForkResult(
          analytics.track,
          {
            ...forkContext,
            target_conversation_id: fresh.id,
            result: 'success',
            duration_ms: Math.max(0, Date.now() - startedAt),
          },
          { requestId },
        );
        setMessages([]);
        commitPreviewComments([]);
        setAttachedComments([]);
        setArtifact(null);
        setStreaming(false);
        streamingConversationIdRef.current = null;
        setStreamingConversationId(null);
        setMessagesConversationId(null);
        messagesConversationIdRef.current = null;
        messagesAuthorityKeyRef.current = null;
        setFailedMessagesConversationId(null);
        setConversations((curr) => [fresh, ...curr.filter((c) => c.id !== fresh.id)]);
        setActiveConversationId(fresh.id);
        navigate(
          {
            kind: 'project',
            projectId: project.id,
            conversationId: fresh.id,
            fileName: openTabsState.active ?? null,
          },
          { replace: true },
        );
        onProjectsRefresh();
        setError(null);
      } catch (err) {
        trackConversationForkResult(
          analytics.track,
          {
            ...forkContext,
            target_conversation_id: null,
            result: 'failed',
            error_code: emptyResponse ? 'empty_response' : conversationForkErrorCode(err),
            duration_ms: Math.max(0, Date.now() - startedAt),
          },
          { requestId },
        );
        const message = err instanceof Error ? err.message : t('chat.forkConversationFailed');
        setConversationLoadError(message);
        setError(message);
      } finally {
        setForkingMessageId(null);
      }
    },
    [
      activeConversationId,
      activeConversation?.title,
      activeSessionMode,
      analytics,
      commitPreviewComments,
      forkingMessageId,
      messages,
      navigate,
      onProjectsRefresh,
      openTabsState.active,
      project.id,
      project.metadata,
      projectMutationReadOnly,
      t,
    ],
  );

  const projectRenameStatesRef = useRef<Map<string, {
    key: string;
    generation: number;
    confirmed: Project;
    pending: number;
    tail: Promise<void>;
  }>>(new Map());
  const handleProjectRename = useCallback(
    (newName: string) => {
      if (projectMutationReadOnly) return;
      const trimmed = newName.trim();
      if (!trimmed || trimmed === project.name) return;
      const previousName = project.name;
      const renameContext = projectRunWorkspaceContextRef.current;
      const renameWorkspaceIdentity = workspaceIdentityCacheKey(renameContext);
      const renameKey = JSON.stringify([
        project.id,
        project.workspaceId ?? null,
        renameWorkspaceIdentity,
      ]);
      let renameState = projectRenameStatesRef.current.get(renameKey);
      if (!renameState || renameState.pending === 0) {
        renameState = {
          key: renameKey,
          generation: 0,
          confirmed: project,
          pending: 0,
          tail: Promise.resolve(),
        };
        projectRenameStatesRef.current.set(renameKey, renameState);
      }
      const renameGeneration = ++renameState.generation;
      renameState.pending += 1;
      const metadata = project.metadata
        ? { ...project.metadata, nameSource: 'user' as const }
        : undefined;
      const updated: Project = {
        ...project,
        name: trimmed,
        ...(metadata ? { metadata } : {}),
        updatedAt: Date.now(),
      };
      const renameFenceToken = onProjectRenameStarted?.(updated) ?? null;
      onProjectChange(updated);
      const runRename = async () => {
        const persisted = await patchProject(project.id, {
          name: trimmed,
          ...(metadata ? { metadata } : {}),
        }, renameContext);
        if (persisted) renameState.confirmed = persisted;
        const isLatestQueuedRename =
          projectRenameStatesRef.current.get(renameKey) !== renameState
          ? false
          : renameState.generation === renameGeneration;
        if (!isLatestQueuedRename) return;
        const settledProject = persisted ?? renameState.confirmed;
        onProjectRenameSettled?.(renameFenceToken, settledProject);
        if (
          projectRef.current.id !== project.id
          || workspaceIdentityCacheKey(projectRunWorkspaceContextRef.current)
            !== renameWorkspaceIdentity
          || (
            projectRef.current.name !== previousName
            && projectRef.current.name !== trimmed
          )
        ) return;
        if (!persisted) {
          if (projectRef.current.name === trimmed) {
            const rollback = {
              ...projectRef.current,
              name: renameState.confirmed.name,
              metadata: renameState.confirmed.metadata,
              updatedAt: renameState.confirmed.updatedAt,
            };
            onProjectChange(rollback);
            try {
              await onProjectsRefresh();
            } catch {
              // The rollback is already projected locally. A later list read
              // closes the stale-request fence if this refresh is unavailable.
            }
          }
          return;
        }
        const confirmed = {
          ...projectRef.current,
          name: persisted.name,
          metadata: persisted.metadata,
          updatedAt: persisted.updatedAt,
        };
        onProjectChange(confirmed);
        try {
          await onProjectsRefresh();
        } catch {
          // The rename is already persisted. Existing list retry/reconnect
          // paths will reconcile a transient projection refresh failure.
        }
      };
      const queued = renameState.tail.then(runRename, runRename);
      renameState.tail = queued.then(
        () => undefined,
        () => undefined,
      ).finally(() => {
        renameState.pending -= 1;
        if (
          renameState.pending === 0
          && projectRenameStatesRef.current.get(renameKey) === renameState
        ) {
          projectRenameStatesRef.current.delete(renameKey);
        }
      });
    },
    [
      onProjectChange,
      onProjectRenameSettled,
      onProjectRenameStarted,
      onProjectsRefresh,
      project,
      projectMutationReadOnly,
    ],
  );

  const activeConversationChatState = useMemo(
    () =>
      activeConversationId
        ? {
	            conversationId: activeConversationId,
	            messages,
	            streaming: currentConversationControlStreaming,
	            loading: currentConversationLoading,
	            sendDisabled: currentConversationSendDisabled,
            queuedItems: currentConversationQueuedItems,
            error: conversationLoadError ?? error,
            errorSourceAssistantId:
              conversationLoadError ? null : errorSourceAssistantId,
            onSend: handleComposerSend,
            onRetry: handleRetry,
            onStop: handleStop,
            onRemoveQueuedSend: removeQueuedChatSend,
            onUpdateQueuedSend: updateQueuedChatSend,
            onReorderQueuedSends: reorderCurrentConversationQueuedChatSends,
            onSendQueuedNow: sendQueuedChatSendNow,
            onAssistantFeedback: handleAssistantFeedback,
          }
        : undefined,
    [
      activeConversationId,
      conversationLoadError,
      currentConversationActionDisabled,
	      currentConversationQueuedItems,
	      currentConversationSendDisabled,
	      currentConversationLoading,
	      currentConversationControlStreaming,
      error,
      errorSourceAssistantId,
      handleAssistantFeedback,
      handleRetry,
      handleComposerSend,
      handleStop,
      messages,
      removeQueuedChatSend,
      reorderCurrentConversationQueuedChatSends,
      sendQueuedChatSendNow,
      updateQueuedChatSend,
    ],
  );

  const handleChangeDesignSystemId = useCallback(
    (nextId: string | null) => {
      if (projectMutationReadOnly) return;
      if ((projectDesignSystemId ?? null) === nextId) return;
      // `design_system_apply_result` studio variant. The existing
      // NewProjectPanel picker fires the same event under
      // `page_name=home`; this in-project header picker fires under
      // `page_name=studio` so the funnel sees applies from both
      // surfaces. `target_project_kind` derives from
      // `project.metadata.kind`.
      const target =
        // NOTE: `target_project_kind` uses the narrower
        // `TrackingDesignSystemApplyTargetKind` enum, which intentionally does
        // NOT carry the prototype subtypes (wireframe/mobile) or `document`.
        // Derive the coarse kind here (subtypes collapse back to `prototype`)
        // so a Home-created Wireframe/Mobile/Document project never emits a
        // value outside this field's schema. The fine-grained split only
        // belongs on `project_kind` (create/run events).
        (projectKindToTracking(project.metadata?.kind ?? null, project.metadata?.videoModel) ?? 'unknown') as TrackingDesignSystemApplyTargetKind;
      const picked = nextId
        ? designSystems.find((d) => d.id === nextId)
        : null;
      const origin: TrackingDesignSystemOrigin | undefined = picked
        ? picked.source === 'user'
          ? 'manual_create'
          : picked.source === 'built-in'
            ? 'official_preset'
            : picked.source === 'installed'
              ? 'template'
              : 'unknown'
        : undefined;
      const status: TrackingDesignSystemStatusValue | undefined = picked
        ? picked.status === 'draft' || picked.status === 'published'
          ? picked.status
          : 'unknown'
        : undefined;
      if (nextId === null) {
        trackDesignSystemApplyResult(analytics.track, {
          page_name: 'studio',
          area: 'design_system_picker',
          action: 'clear_selection',
          result: 'success',
          target_project_kind: target,
          design_system_applied: false,
          design_system_selection_mode: 'none',
          is_default: false,
          is_auto_selected: false,
          available_design_system_count: designSystems.length,
          duration_ms: 0,
        });
      } else {
        trackDesignSystemApplyResult(analytics.track, {
          page_name: 'studio',
          area: 'design_system_picker',
          action: 'select_design_system',
          result: 'success',
          target_project_kind: target,
          design_system_id: nextId,
          design_system_source: origin,
          design_system_status: status,
          design_system_applied: true,
          design_system_selection_mode: 'manual',
          is_default: false,
          is_auto_selected: false,
          available_design_system_count: designSystems.length,
          duration_ms: 0,
        });
      }
      const updated: Project = {
        ...project,
        designSystemId: nextId,
        updatedAt: Date.now(),
      };
      onProjectChange(updated);
      void patchProject(project.id, { designSystemId: nextId }, projectRunWorkspaceContext);
    },
    [
      project,
      projectDesignSystemId,
      onProjectChange,
      designSystems,
      analytics.track,
      projectMutationReadOnly,
      projectRunWorkspaceContext,
    ],
  );

  // Canonical project-type chip shown next to the editable title. We label
  // by the resolved skill/template `mode` (the real type taxonomy) rather
  // than the skill's display name, so every project kind — prototype, deck,
  // template, image, video, audio, design system — reads as one consistent,
  // short type just like "Design system". Returns null for freeform projects
  // (no resolvable type), which hides the chip.
  const projectTypeLabel = useMemo<string | null>(() => {
    if (projectIsDesignSystemProject) return t('dsManager.tabDesignSystem');
    const summary =
      skills.find((s) => s.id === project.skillId) ??
      designTemplates.find((s) => s.id === project.skillId);
    switch (summary?.mode) {
      case 'prototype':
        return t('project.typePrototype');
      case 'deck':
        return t('project.typeDeck');
      case 'template':
        return t('project.typeTemplate');
      case 'design-system':
        return t('dsManager.tabDesignSystem');
      case 'image':
        return t('project.typeImage');
      case 'video':
        return t('project.typeVideo');
      case 'audio':
        return t('project.typeAudio');
      default:
        return null;
    }
  }, [projectIsDesignSystemProject, skills, designTemplates, project.skillId, t]);

  const activeDesignSystemSummary = useMemo(() => {
    if (!projectDesignSystemId) return null;
    return designSystems.find((d) => d.id === projectDesignSystemId) ?? null;
  }, [designSystems, projectDesignSystemId]);

  const designSystemProject = useMemo(() => {
    if (!projectIsDesignSystemProject || !projectDesignSystemId) return null;
    return designSystems.find((d) => d.id === projectDesignSystemId)
      ?? fallbackDesignSystemSummaryForProject(currentProject, projectDesignSystemId);
  }, [
    currentProject,
    designSystems,
    projectDesignSystemId,
    projectIsDesignSystemProject,
  ]);
  const designSystemProjectFromRegistry = useMemo(() => {
    if (!projectIsDesignSystemProject || !projectDesignSystemId) return null;
    return designSystems.find((d) => d.id === projectDesignSystemId) ?? null;
  }, [designSystems, projectDesignSystemId, projectIsDesignSystemProject]);
  // recvqb6mfyqXLD: `designSystemProject.teamSynced`/`canMutate` come off the
  // exact same `GET /api/design-systems` list this project's design-system
  // tab already reads (via the `designSystems` prop) — this is a genuinely
  // separate signal from `projectCollab.viewerOnly` above. Team-sharing a
  // design system does NOT also register its backing project with the
  // project-level collab/hub (`/api/projects/:id/collab/status` stays
  // `local_only` for a teammate's synced copy), so `viewerOnly` alone never
  // catches this: a plain member opening a teammate's team-synced design
  // system through this in-project tab (reachable once `DesignSystemFlow`'s
  // `ensureUserDesignSystemWorkspaceProject` materializes a local project for
  // it) used to see a fully-live Publish toggle, DESIGN.md editor, and the
  // logo/image/color edit + delete-project affordances below with no
  // ownership check at all. `canMutate` mirrors the daemon's own
  // `canMutateUserDesignSystem` PATCH/DELETE verdict, so this stays in
  // lockstep with whatever the backend actually allows; `undefined` (not
  // `teamSynced`, i.e. the caller's own system or a built-in preset) reads as
  // editable, matching every other consumer of this field.
  const designSystemEditable =
    !projectCollab.materializationPending &&
    designSystemProject?.canMutate !== false &&
    (
      !projectIsProgrammaticBrandExtraction ||
      brandExtractionAllowsEditing(effectiveBrandExtractionStatus) ||
      Boolean(brandReady)
    );
  // The brand-extraction-only half of the formula above, kept separate from
  // ownership: FileWorkspace's "Extracting design system…" status pill must
  // key off whether generation is genuinely still running, not off whether
  // the caller happens to own the (possibly fully-published) design system —
  // conflating the two would show a non-owner "still extracting" over a
  // finished, published teammate's system just because they cannot manage it.
  const designSystemExtractionInProgress =
    projectIsProgrammaticBrandExtraction &&
    !brandExtractionAllowsEditing(effectiveBrandExtractionStatus) &&
    !brandReady;
  useEffect(() => {
    if (!projectIsDesignSystemProject || !projectDesignSystemId) {
      missingDesignSystemRefreshRef.current = null;
      return;
    }
    if (designSystemProjectFromRegistry) {
      missingDesignSystemRefreshRef.current = null;
      return;
    }
    if (missingDesignSystemRefreshRef.current === projectDesignSystemId) return;
    missingDesignSystemRefreshRef.current = projectDesignSystemId;
    void Promise.resolve(onDesignSystemsRefresh?.()).catch((err) => {
      missingDesignSystemRefreshRef.current = null;
      console.warn('[design-system] failed to refresh missing project design system', err);
    });
  }, [
    designSystemProjectFromRegistry,
    onDesignSystemsRefresh,
    projectDesignSystemId,
    projectIsDesignSystemProject,
  ]);
  useEffect(() => {
    const pending = pendingBrandDesignSystemOpenRef.current;
    if (!pending || designSystemProject?.id !== pending) return;
    pendingBrandDesignSystemOpenRef.current = null;
    requestOpenFile(DESIGN_SYSTEM_TAB);
  }, [designSystemProject?.id, requestOpenFile]);
  useEffect(() => {
    if (!projectIsProgrammaticBrandExtraction || !designSystemProject?.id) {
      autoOpenedBrandDesignSystemRef.current = null;
      return;
    }
    if (autoOpenedBrandDesignSystemRef.current === designSystemProject.id) return;
    if (!tabsLoadedRef.current) return;
    if (routeFileName) {
      autoOpenedBrandDesignSystemRef.current = designSystemProject.id;
      return;
    }
    if (openTabsState.active || openTabsState.tabs.length > 0) {
      autoOpenedBrandDesignSystemRef.current = designSystemProject.id;
      return;
    }
    if (tabsHydratedFromSavedStateRef.current) {
      autoOpenedBrandDesignSystemRef.current = designSystemProject.id;
      return;
    }
    autoOpenedBrandDesignSystemRef.current = designSystemProject.id;
    requestOpenFile(DESIGN_SYSTEM_TAB);
  }, [
    designSystemProject?.id,
    openTabsState.active,
    openTabsState.tabs.length,
    projectIsProgrammaticBrandExtraction,
    requestOpenFile,
    routeFileName,
    tabsHydrationVersion,
  ]);
  const designSystemActivityEvents = useMemo(
    () => designSystemProject ? latestDesignSystemActivityEvents(messages) : [],
    [designSystemProject, messages],
  );
  const connectRepoNeeded = useMemo(
    () => designSystemNeedsRepoConnect(designSystemProject, projectFiles.map((file) => file.name)),
    [designSystemProject, projectFiles],
  );
  // Only the connect-repo CTA copy depends on this (connect vs re-import), so
  // resolve it lazily and only while the CTA is actually showing. Tri-state:
  // `undefined` means the status fetch has not resolved yet, which keeps the
  // CTA neutral and disabled so a fast click can't fire the wrong action.
  const [githubConnected, setGithubConnected] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    if (!connectRepoNeeded) {
      setGithubConnected(undefined);
      return;
    }
    let aborted = false;
    const controller = new AbortController();
    const refresh = () => {
      void fetchConnectorStatuses({ signal: controller.signal }).then((statuses) => {
        if (!aborted) setGithubConnected(statuses.github?.status === 'connected');
      });
    };
    refresh();
    // Connecting GitHub happens in the Connectors dialog or an external OAuth
    // window, neither of which changes connectRepoNeeded. Re-check on focus so
    // the CTA flips from "Connect GitHub" to "Import repo" when the user returns.
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      aborted = true;
      controller.abort();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [connectRepoNeeded]);

  // Signal that pushes a draft into the chat composer (the "Import repo" CTA).
  const [composerDraftSignal, setComposerDraftSignal] = useState<{ text: string; nonce: number }>();
  // One handler for both the review banner and the chat CTA. When GitHub is
  // not connected it opens Connectors; once connected it prefills the composer
  // with the import instruction so the user can review and send it.
  const handleConnectRepo = useCallback(() => {
    // Status not resolved yet; the CTA is disabled in this window, but guard
    // anyway so a stray call can't route a connected account to Connectors.
    if (githubConnected === undefined) return;
    if (githubConnected) {
      setComposerDraftSignal({
        text: buildRepoImportPrompt(designSystemProject, projectFiles.map((file) => file.name)),
        nonce: Date.now(),
      });
    } else {
      onOpenSettings('composio');
    }
  }, [githubConnected, onOpenSettings, designSystemProject, projectFiles]);

  // "Next step" affordance handlers (shown under the last assistant message
  // once it produced a previewable HTML artifact). Share reuses the preview
  // workspace's existing Share/Export menu. The featured design-toolbox rows are
  // driven by ChatPane's composer ref, so ProjectView no longer wires them here.
  const handleArtifactShare = useCallback(
    (fileName: string) => {
      requestOpenFile(fileName);
      setShareRequest({ name: fileName, nonce: Date.now() });
    },
    [requestOpenFile],
  );
  // Mirrors share, but opens the workspace's Download/Export menu (PDF / image /
  // zip / standalone HTML / save-as-template) instead of a bare file download.
  const handleArtifactDownload = useCallback(
    (fileName: string) => {
      requestOpenFile(fileName);
      setDownloadRequest({ name: fileName, nonce: Date.now() });
    },
    [requestOpenFile],
  );

  const handleBrowserUsePrompt = useCallback((text: string) => {
    setWorkspaceFocused(false);
    setComposerDraftSignal({
      text,
      nonce: Date.now(),
    });
  }, []);

  const isDeck = useMemo(
    () =>
      (skills.find((s) => s.id === project.skillId) ??
        designTemplates.find((s) => s.id === project.skillId))?.mode === 'deck',
    [skills, designTemplates, project.skillId],
  );
  const chatResizeLabel = t('project.resizeChatPanel');
  const workspacePanelTrack =
    workspacePanelMinWidth === 0
      ? 'minmax(0, 1fr)'
      : `minmax(${workspacePanelMinWidth}px, 1fr)`;
  // The comment panel floats over the workspace now, so opening it must not
  // touch the split at all: the chat column keeps the width the user set.
  // (It used to take over this column at COMMENT_INSPECTOR_PANEL_WIDTH.)
  const splitLeftPanelWidth = chatPanelWidthRef.current;
  const chatPanelAriaMinWidth = Math.min(MIN_CHAT_PANEL_WIDTH, chatPanelMaxWidth);
  const projectActionsToastInChatPane =
    projectActionsToast?.scope === 'chat-pane' &&
    !workspaceFocused &&
    !commentInspectorActive &&
    Boolean(activeConversationId || conversationLoadError);
  const projectActionsToastNode = projectActionsToast ? (
    <Toast
      message={projectActionsToast.message}
      details={projectActionsToast.details}
      code={projectActionsToast.code}
      tone={projectActionsToast.tone}
      ttlMs={projectActionsToast.ttlMs}
      onDismiss={() => setProjectActionsToast(null)}
    />
  ) : null;

  const renderPreferredChatPanelWidth = useCallback((
    preferredWidth: number,
    maxWidth = chatPanelMaxWidthRef.current,
    options: { commitState?: boolean } = {},
  ): number => {
    const next = clampChatPanelWidth(preferredWidth, maxWidth);
    chatPanelWidthRef.current = next;
    applySplitChatPanelWidth(splitRef.current, next, workspacePanelTrack, workspaceFocusedRef.current);
    if (options.commitState !== false) setChatPanelWidth(next);
    return next;
  }, [workspacePanelTrack]);
  // Deliberately excludes `workspaceFocused`: the ResizeObserver effect below
  // is keyed on this callback's identity, and recreating the observer on
  // every focus toggle forced a synchronous `clientWidth` reflow + style
  // rewrite in the same commit as the collapse/expand — a second, more
  // subtle jitter source layered on top of the grid hard-cut this file's
  // change fixes. `workspaceFocusedRef` (kept fresh during render) gives the callback
  // body the current value without making it a dependency.

  const applyChatPanelWidth = useCallback((
    width: number,
    options: { commitState?: boolean } = {},
  ): number => {
    const nextPreferred = clampPreferredChatPanelWidth(
      clampChatPanelWidth(width, chatPanelMaxWidthRef.current),
    );
    preferredChatPanelWidthRef.current = nextPreferred;
    return renderPreferredChatPanelWidth(nextPreferred, chatPanelMaxWidthRef.current, options);
  }, [renderPreferredChatPanelWidth]);

  const finishChatPanelResize = useCallback((saveFinalWidth = true) => {
    pointerCleanupRef.current?.();
    pointerCleanupRef.current = null;
    if (pointerFrameRef.current !== null) {
      cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = null;
    }
    pendingPointerClientXRef.current = null;
    resizeStateRef.current = null;
    setResizingChatPanel(false);
    if (saveFinalWidth) {
      const finalWidth = renderPreferredChatPanelWidth(preferredChatPanelWidthRef.current);
      saveChatPanelWidth(finalWidth);
    }
  }, [renderPreferredChatPanelWidth]);

  // `chatPanelWidthRef` and the `--project-chat-panel-width` DOM write are
  // already kept in sync by `renderPreferredChatPanelWidth` (which sets the
  // ref and calls `applySplitChatPanelWidth` in the same statement, right
  // before `setChatPanelWidth`). A mirroring effect keyed on `chatPanelWidth`
  // would just replay that identical write a tick later — dropped as
  // redundant. `projectSplitStyle` (the JSX `style` prop below) is the only
  // other writer, and it already re-renders whenever `chatPanelWidth` changes.

  useEffect(() => {
    chatPanelMaxWidthRef.current = chatPanelMaxWidth;
  }, [chatPanelMaxWidth]);

  useLayoutEffect(() => {
    const split = splitRef.current;
    if (!split) return undefined;

    const updateAllowedWidth = () => {
      const splitWidth = split.clientWidth;
      const nextWorkspaceMin = workspacePanelMinWidthForSplit(splitWidth);
      const nextMax = maxChatPanelWidthForSplit(splitWidth);
      chatPanelMaxWidthRef.current = nextMax;
      setWorkspacePanelMinWidth(nextWorkspaceMin);
      setChatPanelMaxWidth(nextMax);
      renderPreferredChatPanelWidth(preferredChatPanelWidthRef.current, nextMax);
    };

    updateAllowedWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateAllowedWidth);
      observer.observe(split);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateAllowedWidth);
    return () => window.removeEventListener('resize', updateAllowedWidth);
  }, [renderPreferredChatPanelWidth]);

  useEffect(() => () => finishChatPanelResize(false), [finishChatPanelResize]);

  // The chat slot stays in grid flow even after the collapse finishes. Using
  // the native `hidden` attribute here removes the first grid item with
  // `display: none`, which shifts FileWorkspace into the zero-width handle
  // track and leaves the full-width workspace track empty. The settled class
  // below only hides the collapsed chat visually, preserving all three grid
  // item positions. Expanding removes it immediately so the content is
  // visible while the chat column grows back in.
  useEffect(() => {
    if (!workspaceFocused) {
      setChatSlotHidden(false);
      return undefined;
    }
    const split = splitRef.current;
    if (!split) {
      setChatSlotHidden(true);
      return undefined;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      setChatSlotHidden(true);
    };
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== split) return;
      if (
        event.propertyName !== '--project-chat-panel-width'
        && event.propertyName !== '--project-chat-handle-width'
      ) {
        return;
      }
      finish();
    };
    split.addEventListener('transitionend', handleTransitionEnd);
    // Collapse is 140ms (shell.css `.split.split-focus`); the margin above
    // that covers `prefers-reduced-motion` (duration collapses to ~0 globally,
    // which some engines never fire a `transitionend` for) and any
    // already-collapsed-width edge case where the property never changes.
    const fallback = window.setTimeout(finish, 220);
    return () => {
      split.removeEventListener('transitionend', handleTransitionEnd);
      window.clearTimeout(fallback);
    };
  }, [workspaceFocused]);

  const handleChatResizePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const split = splitRef.current;
    if (!split) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerCleanupRef.current?.();
    setResizingChatPanel(true);
    resizeStartPreferredWidthRef.current = preferredChatPanelWidthRef.current;

    const updateWidthFromClientX = (clientX: number) => {
      const state = resizeStateRef.current;
      if (!state) return;
      const delta = clientX - state.startClientX;
      if (delta === 0 && !state.hasMoved) return;
      state.hasMoved = true;
      const rawWidth = state.startWidth + (state.isRtl ? -delta : delta);
      applyChatPanelWidth(rawWidth, { commitState: false });
    };

    const flushPendingPointerMove = () => {
      if (pointerFrameRef.current !== null) {
        cancelAnimationFrame(pointerFrameRef.current);
        pointerFrameRef.current = null;
      }
      const clientX = pendingPointerClientXRef.current;
      pendingPointerClientXRef.current = null;
      if (clientX !== null) updateWidthFromClientX(clientX);
    };

    resizeStateRef.current = {
      startClientX: event.clientX,
      startWidth: chatPanelWidthRef.current,
      isRtl: window.getComputedStyle(split).direction === 'rtl',
      hasMoved: false,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      pendingPointerClientXRef.current = moveEvent.clientX;
      if (pointerFrameRef.current !== null) return;
      pointerFrameRef.current = requestAnimationFrame(() => {
        pointerFrameRef.current = null;
        flushPendingPointerMove();
      });
    };
    const handlePointerEnd = () => {
      flushPendingPointerMove();
      finishChatPanelResize(true);
    };
    const handlePointerCancel = () => {
      flushPendingPointerMove();
      preferredChatPanelWidthRef.current = resizeStartPreferredWidthRef.current;
      renderPreferredChatPanelWidth(resizeStartPreferredWidthRef.current);
      finishChatPanelResize(false);
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('blur', handlePointerCancel);
    };

    pointerCleanupRef.current = cleanup;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('blur', handlePointerCancel);
  }, [applyChatPanelWidth, finishChatPanelResize, renderPreferredChatPanelWidth]);

  const handleChatResizeBlur = useCallback(() => {
    if (!pointerCleanupRef.current) return;
    preferredChatPanelWidthRef.current = resizeStartPreferredWidthRef.current;
    renderPreferredChatPanelWidth(resizeStartPreferredWidthRef.current);
    finishChatPanelResize(false);
  }, [finishChatPanelResize, renderPreferredChatPanelWidth]);

  const handleChatResizeKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    let nextWidth: number | null = null;
    const split = splitRef.current;
    const isRtl = split ? window.getComputedStyle(split).direction === 'rtl' : false;
    if (event.key === 'ArrowLeft') {
      nextWidth = chatPanelWidthRef.current + (isRtl ? 1 : -1) * CHAT_PANEL_KEYBOARD_STEP;
    } else if (event.key === 'ArrowRight') {
      nextWidth = chatPanelWidthRef.current + (isRtl ? -1 : 1) * CHAT_PANEL_KEYBOARD_STEP;
    } else if (event.key === 'Home') {
      nextWidth = MIN_CHAT_PANEL_WIDTH;
    } else if (event.key === 'End') {
      nextWidth = chatPanelMaxWidthRef.current;
    }
    if (nextWidth === null) return;
    event.preventDefault();
    const next = applyChatPanelWidth(nextWidth);
    saveChatPanelWidth(next);
  }, [applyChatPanelWidth]);

  // Hand the pending prompt to ChatPane exactly once per project. The local
  // project-scoped snapshot survives the conversation-id remount, while the
  // persisted pendingPrompt is cleared so refreshes and later entries do not
  // re-seed the composer.
  //
  // PluginLoopHome auto-send case: when the project was created with
  // `autoSendFirstMessage`, app.tsx left a sessionStorage flag telling us
  // to fire the prompt as a real user message immediately. We must NOT
  // seed initialDraft in that case — otherwise the textarea echoes the
  // prompt while it is also streaming as the first user message. The ref
  // captures the prompt independently so downstream effects can still
  // dispatch the auto-send without going through initialDraft.
  const autoSendSeedRef = useRef<string | null>(null);
  const autoSendAttachmentsRef = useRef<ChatAttachment[] | null>(null);
  const autoSendContextRef = useRef<RunContextSelection | null>(null);
  const autoSendFirstMessageRef = useRef(false);
  const autoSendAmrGateWitnessRef = useRef<AmrBalanceGateScope | undefined>(
    undefined,
  );
  if (autoSendSeedRef.current === null) {
    let isAutoSend = false;
    let amrGateWitness: AmrBalanceGateScope | undefined;
    try {
      isAutoSend = Boolean(
        window.sessionStorage.getItem(autoSendFirstMessageKey(project.id)),
      );
      amrGateWitness = readAutoSendAmrGateWitness(project.id);
    } catch {
      /* sessionStorage may be unavailable; treat as manual flow. */
    }
    autoSendFirstMessageRef.current = isAutoSend;
    autoSendAmrGateWitnessRef.current = isAutoSend
      ? amrGateWitness
      : undefined;
    autoSendSeedRef.current = isAutoSend
      ? (readAutoSendPrompt(project.id) ?? project.pendingPrompt ?? '')
      : '';
    autoSendAttachmentsRef.current = isAutoSend ? readAutoSendAttachments(project.id) : [];
    autoSendContextRef.current = isAutoSend ? readAutoSendContext(project.id) : null;
  }
  const initialWorkspaceContexts = autoSendContextRef.current?.workspaceItems ?? [];
  const brandEnrichmentEligibleForProject =
    config.mode === 'daemon' &&
    projectIsProgrammaticBrandExtraction &&
    !autoSendFirstMessageRef.current;
  const [initialDraft, setInitialDraft] = useState<
    { projectId: string; value: string } | undefined
  >(
    autoSendSeedRef.current || !project.pendingPrompt
      ? undefined
      : { projectId: project.id, value: project.pendingPrompt },
  );
  useEffect(() => {
    const pendingPrompt = project.pendingPrompt;
    if (!pendingPrompt) return;
    if (autoSendFirstMessageRef.current) {
      autoSendSeedRef.current = pendingPrompt;
      onClearPendingPrompt();
      return;
    }
    setInitialDraft((current) =>
      current?.projectId === project.id
        ? current
        : { projectId: project.id, value: pendingPrompt },
    );
    onClearPendingPrompt();
  }, [project.id, project.pendingPrompt, onClearPendingPrompt]);
  const chatInitialDraft =
    chatSeed?.value ??
    (
      brandEnrichmentEligibleForProject
        ? undefined
        : (initialDraft?.projectId === project.id ? initialDraft.value : undefined)
    );
  // Home → Studio handoff confirmation (spec §11.1 onboarding_prompt_prefilled):
  // the recommendation's first request actually reached this composer. Fires
  // once, only for recommendation-started projects that arrived with a seed.
  const onboardingPrefilledFiredRef = useRef(false);
  useEffect(() => {
    const entry = onboardingEntryRef.current;
    if (!entry || onboardingPrefilledFiredRef.current) return;
    if (typeof chatInitialDraft !== 'string' || chatInitialDraft.trim().length === 0) return;
    onboardingPrefilledFiredRef.current = true;
    trackOnboardingPromptPrefilled(analytics.track, {
      entry_source: entry.source,
      product_type: entry.productType,
      recommendation_id: entry.recommendationId,
      ...(entry.role ? { role: entry.role } : {}),
      ...(entry.useCases && entry.useCases.length > 0 ? { use_cases: entry.useCases } : {}),
    });
  }, [chatInitialDraft, analytics.track]);
  const brandEnrichmentPromptSeed =
    project.pendingPrompt?.trim() ||
    (initialDraft?.projectId === project.id ? initialDraft.value.trim() : '');
  const [brandEnrichmentPromptSeedCache, setBrandEnrichmentPromptSeedCache] = useState(
    () => brandEnrichmentPromptSeed,
  );
  const [brandEnrichmentStarting, setBrandEnrichmentStarting] = useState(false);
  const [brandAgentExtractionStarting, setBrandAgentExtractionStarting] = useState(false);
  const [brandProgrammaticContinueStarting, setBrandProgrammaticContinueStarting] = useState(false);
  const brandProgrammaticContinueStartingRef = useRef(false);
  const [brandCreateDesignStarting, setBrandCreateDesignStarting] = useState(false);
  const [projectDesignSystemCreateStarting, setProjectDesignSystemCreateStarting] = useState(false);
  const [projectDuplicateStarting, setProjectDuplicateStarting] = useState(false);
  useEffect(() => {
    if (brandEnrichmentPromptSeed) {
      setBrandEnrichmentPromptSeedCache(brandEnrichmentPromptSeed);
    }
  }, [brandEnrichmentPromptSeed]);

  const handleContinueBrandExtraction = useCallback(() => {
    if (brandProgrammaticContinueStartingRef.current) return;
    const brandId = currentProject.metadata?.brandId?.trim();
    if (!projectIsProgrammaticBrandExtraction || !brandId) return;
    brandProgrammaticContinueStartingRef.current = true;
    setBrandProgrammaticContinueStarting(true);
    setBrandExtractionStatusOverride({ brandId, status: 'extracting' });
    const brandPreviewFile = brandExtractionPreviewFileName(projectFiles);
    const brandExtractionSourceUrl =
      currentProject.metadata?.brandSourceUrl?.trim() ||
      brandBrowserAssist?.sourceUrl?.trim() ||
      '';

    const refreshAfterProgrammaticContinue = async (
      status: string,
      conversationId?: string | null,
    ) => {
      setBrandExtractionStatusOverride({
        brandId,
        status: isBrandStatusValue(status) ? status : 'extracting',
      });
      dismissBrandBrowserAssist();
      await Promise.allSettled([
        projectDetail.refresh(),
        Promise.resolve(onProjectsRefresh()),
        Promise.resolve(onDesignSystemsRefresh?.()),
        refreshWorkspaceItems(),
      ]);
      bumpFilesRefresh();
      requestOpenFile(brandPreviewFile);
      const returnedConversationId = conversationId?.trim() || null;
      if (returnedConversationId) {
        const stillCurrent = await refreshConversationsForProgrammaticBrandRetry(returnedConversationId);
        if (!stillCurrent) return;
        if (
          returnedConversationId !== activeConversationId
          || failedMessagesConversationId === returnedConversationId
        ) {
          handleSelectConversation(returnedConversationId);
        } else {
          scheduleConversationMessageRefresh(returnedConversationId);
        }
        return;
      }
      if (activeConversationId) scheduleConversationMessageRefresh(activeConversationId);
    };

    void (async () => {
      const delay = (ms: number) =>
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, ms);
        });
      const snapshotMessage = (snapshot: BrandBrowserSnapshot): string | null =>
        snapshot.status === 'ready' ? null : snapshot.message;
      const hasBrowserFallback = (): boolean => {
        const handle = getBrandBrowser(project.id, BRAND_BROWSER_TAB_ID);
        return Boolean(handle?.isDesktopWebview);
      };
      const extractSnapshot = async (
        snapshot: BrandBrowserSnapshot,
        options: { recoverableFailureIsMiss?: boolean } = {},
      ): Promise<BrandBrowserSnapshotExtractionResult> => {
        if (snapshot.status !== 'ready') {
          return { status: 'miss', message: snapshot.message };
        }
        if (!brandBrowserSnapshotMatchesSource(snapshot.baseUrl, brandExtractionSourceUrl)) {
          // The Browser tab/saved archive is for a different page than the brand
          // source. Stop instead of extracting a design system for the wrong site.
          setBrandExtractionStatusOverride({ brandId, status: 'needs_input' });
          setProjectActionsToast({
            message: t('chat.brandBrowserAssistReadFailed'),
            details: null,
            tone: 'error',
            ttlMs: 7000,
            scope: 'chat-pane',
          });
          return { status: 'handled' };
        }
        const outcome = await extractBrandFromHtml(brandId, {
          html: snapshot.html,
          css: snapshot.css,
          baseUrl: snapshot.baseUrl,
        });
        if (!outcome.ok) {
          if (options.recoverableFailureIsMiss) {
            return { status: 'miss', message: outcome.error };
          }
          // Recoverable, not terminal: the read may have caught the page mid-load
          // / still on the wall. Keep the kit in the calm `needs_input` state (a
          // retry or the agent fallback can still finish it) instead of flashing
          // the red "Extraction failed" terminal. The toast explains the retry.
          setBrandExtractionStatusOverride({ brandId, status: 'needs_input' });
          setProjectActionsToast({
            message: outcome.error,
            details: null,
            tone: 'error',
            ttlMs: 6000,
            scope: 'chat-pane',
          });
          return { status: 'handled' };
        }
        await refreshAfterProgrammaticContinue('ready');
        return { status: 'handled' };
      };

      const localSnapshot = await readLocalBrowserPageArchiveSnapshot(brandExtractionSourceUrl);
      const localExtract = await extractSnapshot(localSnapshot, { recoverableFailureIsMiss: true });
      if (localExtract.status === 'handled') return;

      const daemonOutcome = await continueBrandExtraction(brandId);
      let fallbackMessage: string | null = localExtract.message;
      if (daemonOutcome.ok) {
        await refreshAfterProgrammaticContinue(
          daemonOutcome.result.status,
          daemonOutcome.result.conversationId,
        );
        if (daemonOutcome.result.status === 'ready') return;
        if (!isOpenDesignHostAvailable() && !hasBrowserFallback()) return;
      } else {
        fallbackMessage = daemonOutcome.error;
        if (!isOpenDesignHostAvailable() && !hasBrowserFallback()) {
          setBrandExtractionStatusOverride({ brandId, status: 'needs_input' });
          setProjectActionsToast({
            message: daemonOutcome.error,
            details: null,
            tone: 'error',
            ttlMs: 5000,
            scope: 'chat-pane',
          });
          return;
        }
      }

      // Foreground the pinned Browser tab before either live DOM communication
      // or invoking its page-snapshot downloader. When the user clicks Continue
      // from the preview tab, the browser <webview> may be `display:none` and
      // Electron can throttle its renderer; a focus-only request wakes it
      // without navigating/re-triggering a wall.
      if (isOpenDesignHostAvailable() && brandExtractionSourceUrl) {
        setBrowserOpenRequest({
          tabId: BRAND_BROWSER_TAB_ID,
          url: brandExtractionSourceUrl,
          nonce: Date.now(),
          focusOnly: true,
        });
        await delay(600);
      }

      const liveSnapshot = await readBrandBrowserSnapshotWithRetry(BRAND_BROWSER_TAB_ID);
      requestOpenFile(brandPreviewFile);
      if ((await extractSnapshot(liveSnapshot)).status === 'handled') return;

      const archivedSnapshot = await downloadBrandBrowserPageArchive(brandExtractionSourceUrl);
      requestOpenFile(brandPreviewFile);
      if ((await extractSnapshot(archivedSnapshot)).status === 'handled') return;

      // Still no readable local source. Recoverable — clear/settle/download the
      // Browser page and click Continue again, or use the agent fallback.
      setBrandExtractionStatusOverride({ brandId, status: 'needs_input' });
      if (isOpenDesignHostAvailable() && brandExtractionSourceUrl) {
        setBrowserOpenRequest({
          tabId: BRAND_BROWSER_TAB_ID,
          url: brandExtractionSourceUrl,
          nonce: Date.now(),
          attentionAction: 'download-page',
        });
      }
      setProjectActionsToast({
        message:
          snapshotMessage(archivedSnapshot) ||
          snapshotMessage(liveSnapshot) ||
          fallbackMessage ||
          t('chat.brandBrowserAssistReadFailed'),
        details: null,
        tone: 'error',
        ttlMs: 7000,
        scope: 'chat-pane',
      });
    })()
      .catch((err) => {
        setBrandExtractionStatusOverride({ brandId, status: 'needs_input' });
        setProjectActionsToast({
          message: err instanceof Error ? err.message : t('chat.brandBrowserAssistReadFailed'),
          details: null,
          tone: 'error',
          ttlMs: 5000,
          scope: 'chat-pane',
        });
      })
      .finally(() => {
        brandProgrammaticContinueStartingRef.current = false;
        setBrandProgrammaticContinueStarting(false);
      });
  }, [
    activeConversationId,
    brandBrowserAssist?.sourceUrl,
    currentProject.metadata,
    dismissBrandBrowserAssist,
    failedMessagesConversationId,
    handleSelectConversation,
    onDesignSystemsRefresh,
    onProjectsRefresh,
    projectDetail,
    project.id,
    projectFiles,
    projectIsProgrammaticBrandExtraction,
    downloadBrandBrowserPageArchive,
    readLocalBrowserPageArchiveSnapshot,
    readBrandBrowserSnapshotWithRetry,
    refreshConversationsForProgrammaticBrandRetry,
    refreshWorkspaceItems,
    requestOpenFile,
    scheduleConversationMessageRefresh,
    t,
  ]);

  const handleBrandAgentExtraction = useCallback(() => {
    if (brandAgentExtractionStarting) return;
    const brandId = currentProject.metadata?.brandId?.trim();
    if (brandId) setBrandExtractionStatusOverride({ brandId, status: 'extracting' });
    const prompt = buildBrandAgentExtractionContinuationPrompt({
      promptSeed: brandEnrichmentPromptSeed || brandEnrichmentPromptSeedCache,
      metadata: currentProject.metadata,
      projectFiles,
    });
    setBrandAgentExtractionStarting(true);
    requestOpenFile(brandExtractionPreviewFileName(projectFiles));
    void handleSend(prompt, [], []).finally(() => setBrandAgentExtractionStarting(false));
  }, [
    brandAgentExtractionStarting,
    brandEnrichmentPromptSeed,
    brandEnrichmentPromptSeedCache,
    currentProject.metadata,
    handleSend,
    projectFiles,
    requestOpenFile,
  ]);

  // Run the deeper "AI Optimize" enrichment pass on a programmatically-extracted
  // brand: send the hidden seeded enrichment prompt + the default design-system
  // skill bundle, refining the SAME registered design system in place. Shared by
  // the chat "Continue" affordance and the ready-toast "AI Optimize" nudge.
  // The synchronous single-flight wrapper below (not this state flag) is what
  // stops a double trigger: `brandEnrichmentStarting` only updates after a
  // re-render, so it cannot reject a second call inside the same tick.
  const startBrandEnrichment = useCallback(() => {
    if (config.mode !== 'daemon') return;
    const system = designSystemProject ?? activeDesignSystemSummary;
    const skillIds = installedBrandEnrichmentSkillIds(skills);
    trackDesignSystemEnrichClick(analytics.track, {
      page_name: 'design_system_project',
      area: 'design_system_enrich',
      element: 'ai_optimize',
      design_system_id: projectDesignSystemId ?? undefined,
      project_kind: 'design_system',
    });
    setBrandEnrichmentStarting(true);
    return handleSend(
      buildBrandEnrichmentPrompt(brandEnrichmentPromptSeed || brandEnrichmentPromptSeedCache, {
        metadata: currentProject.metadata,
        designSystemId: system?.id,
        designSystemTitle: system?.title,
        projectFiles,
      }),
      [],
      [],
      { ...(skillIds.length > 0 ? { skillIds } : {}), dsEnrichment: true },
    ).finally(() => setBrandEnrichmentStarting(false));
  }, [
    activeDesignSystemSummary,
    analytics,
    brandEnrichmentPromptSeed,
    brandEnrichmentPromptSeedCache,
    config.mode,
    designSystemProject,
    handleSend,
    currentProject.metadata,
    projectDesignSystemId,
    projectFiles,
    skills,
  ]);
  const handleBrandEnrichment = useSingleFlightCallback(startBrandEnrichment);

  const handleCreateDesignFromActiveDesignSystem = useCallback(() => {
    if (brandCreateDesignStarting) return;
    const system = designSystemProject ?? activeDesignSystemSummary;
    if (!system || !onCreateProjectFromDesignSystem) return;
    setBrandCreateDesignStarting(true);
    void Promise.resolve(onCreateProjectFromDesignSystem(system.id, system.title)).finally(() => {
      setBrandCreateDesignStarting(false);
    });
  }, [
    activeDesignSystemSummary,
    brandCreateDesignStarting,
    designSystemProject,
    onCreateProjectFromDesignSystem,
  ]);

  const handleCreateDesignSystemFromProject = useCallback(() => {
    if (
      projectDesignSystemCreateStarting ||
      projectIsDesignSystemProject ||
      !onCreateDesignSystemFromProject
    ) {
      return;
    }
    const name = designSystemNameForSourceProject(currentProject);
    const pendingPrompt = buildCreateDesignSystemFromProjectPrompt({
      project: currentProject,
      projectFiles,
      activeDesignSystem: activeDesignSystemSummary,
    });
    setProjectDesignSystemCreateStarting(true);
    void Promise.resolve(onCreateDesignSystemFromProject(currentProject.id, {
      name,
      pendingPrompt,
    }))
      .catch((err) => {
        setProjectActionsToast({
          message: err instanceof Error ? err.message : String(err),
          details: null,
          tone: 'error',
        });
      })
      .finally(() => {
        setProjectDesignSystemCreateStarting(false);
      });
  }, [
    activeDesignSystemSummary,
    currentProject,
    onCreateDesignSystemFromProject,
    projectDesignSystemCreateStarting,
    projectFiles,
    projectIsDesignSystemProject,
  ]);

  const handleDuplicateProject = useCallback(() => {
    if (projectDuplicateStarting || !onDuplicateProject) return;
    setProjectDuplicateStarting(true);
    void Promise.resolve(onDuplicateProject(currentProject.id, {}))
      .catch((err) => {
        setProjectActionsToast({
          message: err instanceof Error ? err.message : String(err),
          details: null,
          tone: 'error',
        });
      })
      .finally(() => {
        setProjectDuplicateStarting(false);
      });
  }, [
    currentProject.id,
    onDuplicateProject,
    projectDuplicateStarting,
  ]);

  // Continue in CLI / Finalize design package handlers + keyboard
  // shortcut wiring. Close to the JSX so the data flow is easy to
  // trace from the toolbar back to its sources.
  const handleFinalize = useCallback(() => {
    const request = buildFinalizeRequest(config);
    if (!request) {
      setProjectActionsToast(buildFinalizeCredentialsMissingToast(config));
      return;
    }
    void finalize.trigger(request).then((result) => {
      if (result) void designMdState.refresh();
    });
  }, [finalize, config, designMdState]);

  const handleCancelFinalize = useCallback(() => {
    finalize.cancel();
  }, [finalize]);

  const handleContinueInCli = useCallback(async () => {
    const projectDir = projectDetail.resolvedDir;
    if (!projectDir) {
      setProjectActionsToast({
        message: 'Working directory unavailable. Update the daemon to enable Continue in CLI.',
        details: null,
      });
      return;
    }
    const prompt = buildClipboardPrompt({
      project: { id: project.id, name: project.name },
      designMdState: {
        generatedAt: designMdState.generatedAt,
        transcriptMessageCount: designMdState.transcriptMessageCount,
        designSystemId: designMdState.designSystemId,
        currentArtifact: designMdState.currentArtifact,
      },
      projectDir,
    });
    const copied = await copyToClipboard(prompt);
    if (!copied) {
      // Clipboard write failed in both the canonical and execCommand
      // fallback paths (locked clipboard / insecure context). Surface
      // the prompt body in the toast so the user can manually
      // select-and-copy. Do not open the folder — the user has nothing
      // to paste yet.
      setProjectActionsToast({
        message: 'Clipboard unavailable. Copy this prompt manually, then run `claude` at the working directory.',
        details: `Working directory: ${projectDir}`,
        code: prompt,
      });
      return;
    }
    const launched = await terminalLauncher.open(project.id);
    setProjectActionsToast(buildContinueInCliToast(projectDir, launched));
  }, [
    project.id,
    project.name,
    projectDetail.resolvedDir,
    designMdState.generatedAt,
    designMdState.transcriptMessageCount,
    designMdState.designSystemId,
    designMdState.currentArtifact,
    terminalLauncher,
  ]);

  // Defensive: if the conversation already has messages once they
  // hydrate, the pendingPrompt that seeded the composer is stale (the
  // user sent it earlier but onClearPendingPrompt did not get a chance
  // to patch the server before the page reloaded). Drop the seed so the
  // textarea does not echo a prompt the user already submitted.
  useEffect(() => {
    if (initialDraft && messages.length > 0) {
      setInitialDraft(undefined);
    }
  }, [initialDraft, messages.length]);

  // §8.4 — when the project was created with a plugin pinned (the
  // PluginLoopHome → POST /api/projects path), fetch the immutable
  // snapshot once so ChatPane can render the active plugin as a
  // context chip on user messages instead of re-rendering the inline
  // plugin rail. Re-fetches when the pinned id changes; cancelled if
  // the project switches away mid-flight to avoid setState-on-unmount.
  const [activePluginSnapshot, setActivePluginSnapshot] =
    useState<AppliedPluginSnapshot | null>(null);
  const [restoreAutomaticScenarioState, setRestoreAutomaticScenarioState] =
    useState<'idle' | 'confirm' | 'busy'>('idle');
  const [contextPluginDetails, setContextPluginDetails] =
    useState<InstalledPluginRecord | null>(null);
  const [contextDesignSystemDetails, setContextDesignSystemDetails] =
    useState<DesignSystemSummary | null>(null);
  useEffect(() => {
    const snapshotId = project.appliedPluginSnapshotId;
    if (!snapshotId) {
      setActivePluginSnapshot(null);
      return;
    }
    let cancelled = false;
    void fetchAppliedPluginSnapshot(snapshotId).then((snap) => {
      if (cancelled) return;
      setActivePluginSnapshot(snap);
    });
    return () => {
      cancelled = true;
    };
  }, [project.appliedPluginSnapshotId]);
  const canRestoreAutomaticScenario = Boolean(
    project.metadata?.kind
    && !hasCurrentAutomaticScenarioBinding({
      metadata: project.metadata,
      appliedPluginSnapshotId: project.appliedPluginSnapshotId,
    }),
  );
  const handleRestoreAutomaticScenario = useCallback(async () => {
    if (restoreAutomaticScenarioState === 'busy') return;
    setRestoreAutomaticScenarioState('busy');
    try {
      const result = await restoreProjectAutomaticScenario(
        project.id,
        project.appliedPluginSnapshotId ?? null,
        resolvedWorkspaceContextForWrite(workspaceContextState),
      );
      // The mutation response is the local project row; preserve read-model
      // Workspace projections that came from the scoped project detail API.
      onProjectChange({ ...project, ...result.project });
      setRestoreAutomaticScenarioState('idle');
    } catch {
      setRestoreAutomaticScenarioState('idle');
      setProjectActionsToast({
        message: t('project.restoreAutomaticScenarioFailed'),
        details: null,
        tone: 'error',
        ttlMs: 3000,
      });
    }
  }, [
    onProjectChange,
    project,
    project.appliedPluginSnapshotId,
    project.id,
    restoreAutomaticScenarioState,
    t,
    workspaceContextState,
  ]);
  const handleOpenContextPluginDetails = useCallback(async (pluginId: string) => {
    const normalizedId = pluginId.trim();
    if (!normalizedId) return;
    const plugins = await listPlugins({ includeHidden: true });
    const record = plugins.find((plugin) => plugin.id === normalizedId);
    if (record) setContextPluginDetails(record);
  }, []);
  const handleDuplicateContextPlugin = useCallback(async (record: InstalledPluginRecord) => {
    try {
      const result = await duplicatePluginAsProject(record.id, {
        name: localizePluginTitle(locale, record),
      }, resolvedWorkspaceContextForWrite(workspaceContextState));
      setContextPluginDetails(null);
      navigate({
        kind: 'project',
        projectId: result.projectId,
        conversationId: result.conversationId,
        fileName: result.relPath,
      });
    } catch {
      setProjectActionsToast({
        message: t('pluginCard.duplicateFailed'),
        details: null,
        tone: 'error',
        ttlMs: 3000,
      });
    }
  }, [locale, t, workspaceContextState]);
  const handleOpenContextDesignSystemDetails = useCallback((system: DesignSystemSummary) => {
    setContextDesignSystemDetails(system);
  }, []);
  const chatDesignSystemSummary = useMemo(() => {
    if (activeDesignSystemSummary) return activeDesignSystemSummary;
    const designSystemName = activePluginSnapshot?.inputs?.designSystem;
    if (typeof designSystemName !== 'string') return null;
    const normalized = designSystemName.trim();
    if (!normalized || normalized === 'the active project design system') return null;
    return designSystems.find((d) => d.title === normalized) ?? null;
  }, [activeDesignSystemSummary, activePluginSnapshot?.inputs, designSystems]);

  // Lift finalize errors into the shared project-actions toast so the
  // user sees both the daemon's category message and any upstream
  // detail (per #450 verification commitment).
  useEffect(() => {
    if (finalize.error) {
      setProjectActionsToast({
        message: finalize.error.message,
        details: finalize.error.details,
      });
    }
  }, [finalize.error]);

  // ⌘+Shift+K (mac) / Ctrl+Shift+K (others) → Continue in CLI. Mirrors
  // the capture-phase, platform-gated pattern from FileWorkspace's
  // Quick Switcher shortcut. ⌘+Shift+K is free (⌘+P is the only
  // existing primary-modifier shortcut on this surface).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const primary = isMacPlatform() ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
      if (primary && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        if (e.isComposing) return;
        if (!designMdState.exists) return;
        e.preventDefault();
        void handleContinueInCli();
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [designMdState.exists, handleContinueInCli]);

  // PluginLoopHome auto-send: when the user submits on Home, app.tsx
  // sets `sessionStorage['od:auto-send-first:<projectId>']` and routes
  // through createProject. Once the conversation id resolves and the
  // composer is mounted, fire handleSend(pendingPrompt) exactly once so
  // the user lands inside a running pipeline without an extra click.
  // We gate on `messages.length === 0` so a refresh after the run is
  // mid-flight never double-fires; the sessionStorage flag is cleared
  // immediately after the first dispatch.
  const autoSentRef = useRef(false);
  const autoSendInFlightRef = useRef(false);
  useEffect(() => {
    if (autoSentRef.current) return;
    if (autoSendInFlightRef.current) return;
    if (!activeConversationId) return;
    // `messagesInitialized` is React state, while the conversation ownership
    // guard used by handleSend is a ref. Require both to agree before consuming
    // the one-shot handoff: during a project/context transition there can be a
    // render where the state is ready but the ref has already been invalidated
    // for a fresh scoped reload.
    if (messagesConversationIdRef.current !== activeConversationId) return;
    if (!projectRunHasBillableAmrPrincipal) return;
    // Wait for the initial listMessages DB read to land. Without this gate
    // the auto-send fires before the in-flight DB response, which then
    // arrives with `setMessages([])` and wipes the freshly-pushed user +
    // assistant placeholder out of React state — leaving the daemon's run
    // with no in-memory message to attach the runId to.
    if (!messagesInitialized) return;
    if (streaming) return;
    if (projectIsProgrammaticBrandExtraction) {
      clearAutoSendSession(project.id);
      autoSendAttachmentsRef.current = [];
      autoSentRef.current = true;
      return;
    }
    if (messages.length > 0) return;
    let flag: string | null = null;
    try {
      flag = window.sessionStorage.getItem(autoSendFirstMessageKey(project.id));
    } catch {
      flag = null;
    }
    if (!flag) return;
    // Prefer the seed captured at mount (autoSendSeedRef) — it survives
    // even after onClearPendingPrompt wipes project.pendingPrompt on the
    // server. Fall back to the live values for any edge case where the
    // ref was not populated (e.g. sessionStorage error path).
    const seed = (
      autoSendSeedRef.current ||
      (initialDraft?.projectId === project.id ? initialDraft.value : '') ||
      project.pendingPrompt ||
      ''
    ).trim();
    const attachments = autoSendAttachmentsRef.current ?? [];
    const context = autoSendContextRef.current ?? readAutoSendContext(project.id);
    if (!seed && attachments.length === 0) {
      return;
    }
    const autoSendGateStillMatches =
      autoSendAmrGateWitnessRef.current !== undefined &&
      amrBalanceGateScopesMatch(
        autoSendAmrGateWitnessRef.current,
        amrBalanceGateScopeForWorkspaceContext(projectRunPreflightContext),
      );
    autoSendInFlightRef.current = true;
    void handleSend(seed, attachments, [], {
        ...(context ? { context } : {}),
        ...homeAutoSendIdentity(project.id),
        acceptQueuedHomeHandoff: true,
        // Only reuse Home's decision for the exact persisted project scope.
        // A workspace/member mismatch falls through to handleSend's normal gate.
        ...(autoSendGateStillMatches ? { amrGatePrechecked: true } : {}),
      })
      .then((accepted) => {
        if (!accepted) {
          // The handoff was not accepted (for example a transient project
          // scope/conversation transition or a recoverable preflight block).
          // Keep every session value intact; a later dependency change can
          // retry the exact same prompt and attachments.
          autoSendInFlightRef.current = false;
          return;
        }
        autoSentRef.current = true;
        if (isDesignSystemWorkspaceMetadata(project.metadata)) {
          markDesignSystemAuditAutoRepairEligible(project.id);
        }
        clearAutoSendSession(project.id);
        autoSendAttachmentsRef.current = [];
        autoSendInFlightRef.current = false;
      })
      .catch(() => {
        // `handleSend` normally reports a rejected preflight as `false`, but
        // transport/provider setup may still throw. Preserve the handoff for a
        // later retry instead of silently consuming the user's first prompt.
        autoSendInFlightRef.current = false;
      });
  }, [
    activeConversationId,
    messagesInitialized,
    streaming,
    messages.length,
    project.id,
    projectIsProgrammaticBrandExtraction,
    project.metadata,
    initialDraft,
    project.pendingPrompt,
    projectRunHasBillableAmrPrincipal,
    projectRunBillingContext,
    projectRunPreflightContext,
    handleSend,
  ]);

  // Wire the Critique Theater drop-in mount into the project workspace.
  // The hook reads the M1 Settings toggle out of the existing
  // `open-design:config` localStorage blob and stays in sync with the
  // platform `storage` event (cross-tab) plus the same-tab
  // `open-design:critique-theater-toggle` CustomEvent. The mount itself
  // returns `null` until the daemon emits a `critique.run_started` for
  // the active project, so the visual surface is unchanged for users
  // who have not opted in. The daemon-side gate
  // (`isCritiqueEnabled(...)` in `apps/daemon/src/server.ts`) is the
  // authority for whether a run is actually wired through the critique
  // pipeline; this hook only governs whether the web layer renders the
  // resulting SSE stream.
  const critiqueTheaterEnabled = useCritiqueTheaterEnabled();

  // CLI / agent selector lives below the chat conversation (composer footer),
  // not in the top-right header.
  const executionControls = (
    <>
      <AvatarMenu
        config={config}
        agents={agents}
        daemonLive={daemonLive}
        onModeChange={onModeChange}
        onOpen={() => {
          trackComposerBarClick(analytics.track, {
            page_name: 'chat_panel',
            area: 'chat_composer',
            element: 'agent_selector_open',
            ...(project?.id ? { project_id: project.id } : {}),
          });
        }}
        onAgentChange={(id) => {
          trackComposerBarClick(analytics.track, {
            page_name: 'chat_panel',
            area: 'chat_composer',
            element: 'agent_select',
            agent_id: id,
            ...(project?.id ? { project_id: project.id } : {}),
          });
          onAgentChange(id);
        }}
        onAgentModelChange={(agentId, choice) => {
          trackComposerBarClick(analytics.track, {
            page_name: 'chat_panel',
            area: 'chat_composer',
            element: 'agent_model_select',
            agent_id: agentId,
            ...(choice?.model ? { model_id: choice.model } : {}),
            ...(project?.id ? { project_id: project.id } : {}),
          });
          onAgentModelChange(agentId, choice);
        }}
        onApiModelChange={(model) => {
          trackComposerBarClick(analytics.track, {
            page_name: 'chat_panel',
            area: 'chat_composer',
            element: 'agent_model_select',
            model_id: model,
            ...(project?.id ? { project_id: project.id } : {}),
          });
          onApiModelChange?.(model);
        }}
        onOpenSettings={onOpenSettings}
        onRefreshAgents={onRefreshAgents}
        placement="up"
        projectWorkspaceScope={projectWorkspaceScopeState}
      />
    </>
  );

  // The `.app` shell belongs to the caller, not to this component. App.tsx
  // renders the same `div.app` around both this view and
  // ProjectCreationPendingView so React reconciles one element across the
  // hand-off. Owning the shell here would make each view mount its own
  // element and replay the `.app` entrance animation, which reads as the
  // project frame flashing twice on the way in from Home.
  return (
    <CollabProvider value={collabValue}>
      <CritiqueTheaterMount
        projectId={project.id}
        enabled={critiqueTheaterEnabled}
        workspaceContext={projectRunWorkspaceContext}
      />
      {/* ProjectActionsToolbar removed per 00efdcba — hide finalize-design
          toolbar from project header. Restore from cf1cd9bb if product
          wants the Finalize + Continue-in-CLI buttons back in the chrome. */}
      <div
        ref={splitRef}
        className={[
          projectSplitClassName(workspaceFocused),
          resizingChatPanel && !workspaceFocused ? 'is-resizing-chat' : '',
        ].filter(Boolean).join(' ')}
        style={projectSplitStyle(workspaceFocused, splitLeftPanelWidth, workspacePanelTrack)}
      >
        <div
          className={[
            'split-chat-slot',
            chatSlotHidden ? 'split-chat-slot-hidden' : '',
          ].filter(Boolean).join(' ')}
          aria-hidden={chatSlotHidden || undefined}
        >
          {/* Workspace tab strip dock: on the project route the strip leaves
              the full-width chrome row and sits here, directly above the chat
              card, level with the workspace column's tab row (which rises to
              the window top since the chrome row collapses). Unmounting
              (workspace-focused mode, leaving the route) automatically
              returns the strip to the chrome row. */}
          {!workspaceFocused ? (
            <div
              className="split-chat-tabs-dock"
              data-testid="workspace-tabs-dock"
              ref={chatTabsDockRef}
            >
              {/* Collapse-chat control, lifted out of the chat card header to
                  sit left of the docked tab dropdown (the dropdown portals in
                  after this button, so flex order stays button → dropdown). */}
              <button
                type="button"
                className="split-chat-collapse od-tooltip"
                onClick={() => setWorkspaceFocused(true)}
                title={t('chat.collapsePane')}
                aria-label={t('chat.collapsePane')}
                data-tooltip={t('chat.collapsePane')}
                data-tooltip-placement="bottom"
                data-testid="chat-collapse-toggle"
              >
                <Icon name="panel-left" size={16} />
              </button>
            </div>
          ) : null}
          {activeConversationId || conversationLoadError || emptyConversationReadOnlySettled ? (
            <ChatPane
              // The conversation id is part of the key so switching conversations
              // resets internal scroll/draft state inside ChatPane and ChatComposer.
              key={`${project.id}:${activeConversationId ?? 'conversation-unavailable'}:${chatSeed?.id ?? 'ready'}`}
              messages={messages}
              streaming={currentConversationControlStreaming}
              liveToolInput={liveToolInput}
              loading={currentConversationLoading}
              // A read-only viewer of a team-shared project cannot drive artifact
              // changes through chat (comments go through the separate overlay).
              sendDisabled={currentConversationSendDisabled || projectMutationReadOnly}
              viewerOnly={projectMutationReadOnly}
              composerPlaceholder={
                projectCollab.materializationPending
                  ? t('designFiles.syncing')
                  : projectMutationReadOnly
                  ? (projectCollab.ownerDisplayName
                      ? t('workspace.readonlyNoticeBy', { owner: projectCollab.ownerDisplayName })
                      : t('workspace.readonlyNotice'))
                  : undefined
              }
              queuedItems={currentConversationQueuedItems}
              error={conversationLoadError ?? error}
              errorSourceAssistantId={
                conversationLoadError ? null : errorSourceAssistantId
              }
              projectId={project.id}
              sessionMode={activeSessionMode}
              onSessionModeChange={handleActiveConversationSessionModeChange}
              projectKindForTracking={projectKindFromMetadataToTracking(currentProject.metadata)}
              projectFiles={projectFiles}
              activeProjectFileName={activeProjectFileName}
              hasActiveDesignSystem={!!projectDesignSystemId}
              activeDesignSystem={chatDesignSystemSummary}
              projectFileNames={projectFileNames}
              projectResolvedDir={projectDetail.resolvedDir}
              skills={skills}
              onEnsureProject={handleEnsureProject}
              previewComments={previewComments}
              attachedComments={attachedComments}
              onAttachComment={attachPreviewComment}
              onDetachComment={detachPreviewComment}
              onDeleteComment={(commentId) => void removePreviewComment(commentId)}
              onSend={handleComposerSend}
              onRetry={handleRetry}
              amrAuthRetryContinuation={amrAuthRetryContinuation}
              amrAuthRetryMountId={amrAuthRetryMountIdRef.current}
              amrAuthRetryWorkspaceIdentityKey={projectRunAuthorityKey}
              amrAuthRetryPersonalAdoptionWitness={amrAuthRetryPersonalAdoptionWitness}
              onArmAmrAuthRetryContinuation={onArmAmrAuthRetryContinuation}
              onConsumeAmrAuthRetryContinuation={onConsumeAmrAuthRetryContinuation}
              onDiscardAmrAuthRetryContinuation={onDiscardAmrAuthRetryContinuation}
              onResumeRun={handleResumeRun}
              onStop={handleStop}
              onRemoveQueuedSend={removeQueuedChatSend}
              onUpdateQueuedSend={updateQueuedChatSend}
              onReorderQueuedSends={reorderCurrentConversationQueuedChatSends}
              onSendQueuedNow={sendQueuedChatSendNow}
              onRequestOpenFile={requestOpenFile}
              onRequestPluginDetails={handleOpenContextPluginDetails}
              onRequestDesignSystemDetails={handleOpenContextDesignSystemDetails}
              onRequestPluginFolderAgentAction={handlePluginFolderAgentAction}
              activePluginActionPaths={activePluginActionPaths}
              hiddenPluginActionPaths={hiddenAssistantPluginActionPaths}
              onShareToOpenDesign={handleShareToOpenDesign}
              shareToOpenDesignBusyMessageId={shareToOpenDesignBusyMessageId}
              forceStreamingMessageIds={forceStreamingPluginMessageIds}
              initialDraft={chatInitialDraft}
              onboardingStarterPath={onboardingEntryRef.current?.productType ?? null}
              questionFormSubmitDisabled={currentConversationActionDisabled}
              onSubmitQuestionForm={async (text, attachments = [], context, sourceAssistantMessageId) => {
                if (currentConversationActionDisabled) return false;
                let sourceAssistant = sourceAssistantMessageId
                  ? messages.find((message) => message.id === sourceAssistantMessageId)
                  : undefined;
                const strategyTaskExecutionId = await resolveQuestionFormStrategyTaskExecutionId({
                  ...(sourceAssistant?.strategyTaskExecutionId
                    ? { persistedTaskExecutionId: sourceAssistant.strategyTaskExecutionId }
                    : {}),
                  ...(sourceAssistant?.runId ? { sourceRunId: sourceAssistant.runId } : {}),
                  fetchRunStatus: (runId) => fetchChatRunStatus(
                    runId,
                    projectRunWorkspaceContext,
                  ),
                });
                if (sourceAssistant && strategyTaskExecutionId) {
                  sourceAssistant = {
                    ...sourceAssistant,
                    strategyTaskExecutionId,
                  };
                }
                const questionTaskAnalytics = sourceAssistant
                  ? buildRecoveryTaskAnalytics(
                      messages,
                      sourceAssistant,
                      'question_answer',
                    )
                  : undefined;
                if (sourceAssistant && questionTaskAnalytics) {
                  trackRunRecoveryActionClick(analytics.track, {
                    page_name: 'chat_panel',
                    area: 'chat_panel',
                    element: 'run_recovery_action',
                    task_execution_id: questionTaskAnalytics.taskExecutionId,
                    recovery_action_instance_id:
                      questionTaskAnalytics.recoveryActionInstanceId!,
                    recovery_action_type: 'question_answer',
                    ...(questionTaskAnalytics.sourceRunId
                      ? { source_run_id: questionTaskAnalytics.sourceRunId }
                      : {}),
                    ...(sourceAssistant.agentId
                      ? { source_agent_provider_id: runAgentProviderId(sourceAssistant.agentId) }
                      : {}),
                  });
                }
                return handleSend(text, attachments, [], {
                  entryFrom: 'question_answer',
                  ...(context ? { context } : {}),
                  ...(questionTaskAnalytics
                    ? { taskAnalytics: questionTaskAnalytics }
                    : {}),
                  ...(strategyTaskExecutionId
                    ? { strategyTaskExecutionId }
                    : {}),
                });
              }}
              onContinueRemainingTasks={handleContinueRemainingTasks}
              onAssistantFeedback={handleAssistantFeedback}
              onArtifactShare={handleArtifactShare}
              onArtifactDownload={handleArtifactDownload}
              onForkFromMessage={
                projectMutationReadOnly ? undefined : handleForkFromMessage
              }
              forkingMessageId={forkingMessageId}
              onNewConversation={handleNewConversation}
              newConversationDisabled={newConversationDisabled}
              conversations={conversations}
              activeConversationId={activeConversationId}
              messagesConversationId={messagesConversationId}
              onSelectConversation={handleSelectConversation}
              onDeleteConversation={handleDeleteConversation}
              config={config}
              onOpenSettings={onOpenSettings}
              showByokRecoveryAction={
                config.mode === 'api' &&
                daemonLive &&
                (
                  !config.apiKey.trim() ||
                  !config.baseUrl.trim() ||
                  !config.model.trim()
                )
              }
              onSwitchToLocalCli={() => {
                setError(null);
                onModeChange('daemon');
              }}
              onOpenAmrSettings={onOpenAmrSettings}
              onSwitchToAmrAndRetry={handleSwitchToAmrAndRetry}
              onLaunchAntigravityOauth={handleLaunchAntigravityOauth}
              onOpenMcpSettings={onOpenMcpSettings}
              onBrowsePlugins={onBrowsePlugins}
              onOpenConnectors={onOpenConnectors}
              connectRepoNeeded={connectRepoNeeded}
              githubConnected={githubConnected}
              onConnectRepo={handleConnectRepo}
              brandExtractionComplete={effectiveBrandExtractionStatus === 'ready' || Boolean(brandReady)}
              brandEnrichmentEligible={brandEnrichmentEligibleForProject}
              onContinueBrandEnrichment={handleBrandEnrichment}
              brandEnrichmentBusy={brandEnrichmentStarting}
              onContinueBrandAgentExtraction={handleBrandAgentExtraction}
              continueBrandAgentExtractionBusy={brandAgentExtractionStarting}
              onContinueBrandExtraction={handleContinueBrandExtraction}
              continueBrandExtractionBusy={brandProgrammaticContinueStarting}
              onCreateDesignFromActiveDesignSystem={handleCreateDesignFromActiveDesignSystem}
              createDesignFromActiveDesignSystemBusy={brandCreateDesignStarting}
              onCreateDesignSystemFromProject={
                projectIsDesignSystemProject ? undefined : handleCreateDesignSystemFromProject
              }
              createDesignSystemFromProjectBusy={projectDesignSystemCreateStarting}
              onBrandBrowserAssistConfirm={handleBrandBrowserAssistConfirm}
              chatLogTray={
                projectActionsToastInChatPane ? (
                  <div className="project-actions-toast-anchor">
                    {projectActionsToastNode}
                  </div>
                ) : null
              }
              composerDraftSignal={composerDraftSignal}
              petConfig={config.pet}
              onAdoptPet={onAdoptPetInline}
              onTogglePet={onTogglePet}
              onOpenPetSettings={onOpenPetSettings}
              researchAvailable={config.mode === 'daemon'}
              byokApiProtocol={config.apiProtocol}
              byokImageModel={byokImageModelOverride}
              onChangeByokImageModel={setByokImageModelOverride}
              byokVideoModel={byokVideoModelOverride}
              onChangeByokVideoModel={setByokVideoModelOverride}
              byokSpeechModel={byokSpeechModelOverride}
              onChangeByokSpeechModel={setByokSpeechModelOverride}
              byokSpeechVoice={byokSpeechVoiceOverride}
              onChangeByokSpeechVoice={setByokSpeechVoiceOverride}
              projectMetadata={currentProject.metadata}
              onProjectMetadataChange={onProjectChange}
              activeWorkspaceContext={activeWorkspaceContext}
              initialWorkspaceContexts={initialWorkspaceContexts}
              workspaceContexts={workspaceContexts}
              mobileScreenSelection={selectedMobileScreen}
              onClearMobileScreenSelection={() => setSelectedMobileScreen(null)}
              currentSkillId={project.skillId}
              onProjectSkillChange={(skillId) => {
                onProjectChange({ ...project, skillId });
              }}
              activePluginSnapshot={activePluginSnapshot}
              currentDesignSystemId={projectDesignSystemId}
              onActiveDesignSystemChange={(updatedProject) => {
                onProjectChange(updatedProject);
              }}
              onShowToast={(message) => {
                setProjectActionsToast({ message, details: null });
              }}
              onBack={onBack}
              onCollapse={() => setWorkspaceFocused(true)}
              collapseControlLifted={!workspaceFocused}
              backLabel={t('project.backToProjects')}
              composerFooterAccessory={executionControls}
              projectHeader={(
                <span className="chat-project-title-line">
                  <span
                    className={`title${projectMutationReadOnly ? ' readonly' : ' editable'}`}
                    data-testid="project-title"
                    title={projectTitleTooltip}
                    tabIndex={projectMutationReadOnly ? -1 : 0}
                    role={projectMutationReadOnly ? undefined : 'textbox'}
                    suppressContentEditableWarning
                    contentEditable={!projectMutationReadOnly}
                    onBlur={(e) => {
                      if (projectMutationReadOnly) return;
                      handleProjectRename(e.currentTarget.textContent ?? '');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).blur();
                      }
                    }}
                  >
                    {currentProject.name}
                  </span>
                  {projectTypeLabel ? (
                    <span className="meta" data-testid="project-meta">{projectTypeLabel}</span>
                  ) : null}
                  {canRestoreAutomaticScenario && !projectCollab.viewerOnly ? (
                    <Button
                      variant="ghost"
                      className={scenarioStyles.restoreButton}
                      disabled={restoreAutomaticScenarioState === 'busy'}
                      onClick={() => {
                        if (restoreAutomaticScenarioState === 'confirm') {
                          void handleRestoreAutomaticScenario();
                        } else {
                          setRestoreAutomaticScenarioState('confirm');
                        }
                      }}
                    >
                      {restoreAutomaticScenarioState === 'busy'
                        ? t('project.restoreAutomaticScenarioBusy')
                        : restoreAutomaticScenarioState === 'confirm'
                          ? t('project.restoreAutomaticScenarioConfirm')
                          : t('project.restoreAutomaticScenario')}
                    </Button>
                  ) : null}
                </span>
              )}
              designSystemPicker={(
                <DesignSystemPicker
                  variant="icon"
                  designSystems={designSystems}
                  selectedId={projectDesignSystemId ?? null}
                  workspaceContext={projectRunWorkspaceContext}
                  disabled={projectMutationReadOnly}
                  onChange={handleChangeDesignSystemId}
                />
              )}
            />
          ) : (
            <div className="pane" data-testid="chat-pane-loading">
              <CenteredLoader />
            </div>
          )}
        </div>
        {/* The comment panel is a floating card over the workspace in EVERY
            state (per product: 任何状态下评论卡片都在这个位置). It used to dock
            inside the chat column, which put it in a different place —  and
            made it invisible in full-screen preview, where that column is
            hidden. Keep the empty host mounted so FileViewer can resolve its
            portal before opening; `:empty` hides all chrome and hit testing
            until the localized comment panel is portaled in. Exactly one
            element ever carries `commentInspectorPortalId`. */}
        <div
          id={commentInspectorPortalId}
          className="comment-float-host"
          data-testid="comment-float-host"
        />
        {!workspaceFocused ? (
          <div
            className="split-resize-handle"
            role="separator"
            aria-orientation="vertical"
            aria-label={chatResizeLabel}
            aria-valuemin={chatPanelAriaMinWidth}
            aria-valuemax={chatPanelMaxWidth}
            aria-valuenow={chatPanelWidth}
            tabIndex={0}
            title={chatResizeLabel}
            onPointerDown={handleChatResizePointerDown}
            onKeyDown={handleChatResizeKeyDown}
            onBlur={handleChatResizeBlur}
          />
        ) : null}
        <FileWorkspace
          projectId={project.id}
          projectName={currentProject.name}
          viewerOnly={projectMutationReadOnly}
          materializationPending={projectCollab.materializationPending}
          readonlyNotice={
            projectCollab.materializationPending
              ? t('designFiles.syncing')
              : readonlyNoticeText
          }
          fileSyncBadge={fileSyncBadge}
          mobileEditor={currentProject.metadata?.platformMode === 'mobile'}
          mobileEditorMetadata={currentProject.metadata?.mobileEditor}
          onMobileEditorMetadataChange={handleMobileEditorMetadataChange}
          selectedMobileScreenId={selectedMobileScreen?.id?.replace(/^mobile-screen:/, '') ?? null}
          onSelectMobileScreen={handleMobileScreenSelection}
          projectKind={projectKindFromMetadataToTrackingOrLegacyDefault(currentProject.metadata)}
          rootDirName={(() => {
            const baseDir = currentProject.metadata?.baseDir;
            return typeof baseDir === 'string'
              ? baseDir.split(/[/\\]/).filter(Boolean).pop()
              : undefined;
          })()}
          reloading={false}
          resolvedDir={projectDetail.resolvedDir}
          files={projectFiles}
          liveArtifacts={liveArtifacts}
          filesRefreshKey={committedFilesRefreshKey}
          filesGeneration={committedFilesGeneration}
          onRefreshFiles={refreshFileWorkspace}
          isDeck={isDeck}
          streaming={currentConversationActionDisabled}
          commentQueueOnSend={commentQueueOnSend}
          commentSendDisabled={currentConversationQueueDisabled}
          openRequest={openRequest}
          browserOpenRequest={browserOpenRequest}
          pinnedBrowserTabId={projectIsProgrammaticBrandExtraction ? BRAND_BROWSER_TAB_ID : null}
          shareRequest={shareRequest}
          downloadRequest={downloadRequest}
          slideNavRequest={slideNavRequest}
          liveArtifactEvents={liveArtifactEvents}
          designSystemActivityEvents={designSystemActivityEvents}
          tabsState={openTabsState}
          onTabsStateChange={persistTabsState}
          previewComments={previewComments}
          onSavePreviewComment={savePreviewComment}
          onRemovePreviewComment={removePreviewComment}
          onReorderPreviewComment={reorderPreviewComment}
          onSendBoardCommentAttachments={handleSendBoardCommentAttachments}
          onBrandExtractionStopRequest={projectIsProgrammaticBrandExtraction ? handleStop : undefined}
          onRequestBrowserUsePrompt={handleBrowserUsePrompt}
          onPluginFolderAgentAction={handlePluginFolderAgentAction}
          activePluginActionPaths={activePluginActionPaths}
          focusMode={workspaceFocused}
          onFocusModeChange={setWorkspaceFocused}
          designSystemProject={designSystemProject}
          designSystemBrandId={designSystemBrandId}
          designSystemEditable={designSystemEditable}
          designSystemExtractionInProgress={designSystemExtractionInProgress}
          defaultDesignSystemId={config.designSystemId}
          onSetDefaultDesignSystem={onChangeDefaultDesignSystem}
          onDesignSystemsRefresh={onDesignSystemsRefresh}
          onCreateDesignSystemFromProject={
            projectIsDesignSystemProject ? undefined : handleCreateDesignSystemFromProject
          }
          createDesignSystemFromProjectBusy={projectDesignSystemCreateStarting}
          onDuplicateProject={onDuplicateProject ? handleDuplicateProject : undefined}
          duplicateProjectBusy={projectDuplicateStarting}
          onDeleteDesignSystemProject={onDeleteProject}
          onDesignSystemNeedsWork={sendDesignSystemFeedback}
          designSystemReview={currentProject.metadata?.designSystemReview}
          onDesignSystemReviewDecision={persistDesignSystemReviewDecision}
          onUseDesignSystem={onCreateProjectFromDesignSystem}
          designSystemEditRequest={designSystemEditRequest}
          onConnectRepo={handleConnectRepo}
          githubConnected={githubConnected}
          commentPortalId={commentInspectorPortalId}
          onCommentModeChange={setCommentInspectorActive}
          fileActionsBefore={projectCollab.enabled ? (
            <PresenceBar
              members={projectCollab.present}
              selfMember={projectCollab.member}
              resolveMember={resolvePresenceMember}
              {...(projectCollab.member ? { selfMemberId: projectCollab.member.memberId } : {})}
            />
          ) : null}
          chatConfig={config}
          chatAgentsById={agentsById}
          handoffAgents={agents}
          handoffArtifactId={headerArtifact.artifact_id}
          handoffArtifactKind={headerArtifact.artifact_kind}
          metricsConsent={config.telemetry?.metrics === true}
          installationId={config.installationId}
          chatLocale={locale}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          onConversationSessionModeChange={handleConversationSessionModeChange}
          onNewConversation={handleNewConversation}
          activeConversationChat={activeConversationChatState}
          onActiveContextChange={handleActiveWorkspaceContextChange}
          onWorkspaceContextsChange={handleWorkspaceContextsChange}
          messages={messages}
          artifactHtml={artifact?.html}
          conversationError={error}
          onAuthorizeAndRetry={handleSwitchToAmrAndRetry}
          onLaunchTerminalAuth={handleLaunchAntigravityOauth}
          conversationId={activeConversationId}
        />
      </div>
      {contextPluginDetails ? (
        <PluginDetailsModal
          record={contextPluginDetails}
          workspaceContext={projectRunWorkspaceContext}
          onClose={() => setContextPluginDetails(null)}
          onUse={() => setContextPluginDetails(null)}
          onDuplicate={(record) => void handleDuplicateContextPlugin(record)}
          isApplying={false}
          hideUseAction
        />
      ) : null}
      {contextDesignSystemDetails ? (
        <DesignSystemPreviewModal
          system={contextDesignSystemDetails}
          workspaceContext={projectRunWorkspaceContext}
          initialViewId="kit"
          onClose={() => setContextDesignSystemDetails(null)}
        />
      ) : null}
      {/* One-time first-generation hint (spec §8.3) is scoped to the new-user
          onboarding handoff: only projects started from the Home recommendation
          carry a consumed `onboardingEntryRef`. Without this gate the hint
          would surface for any returning user opening an existing HTML project
          and burn its once-ever localStorage budget outside the intended flow. */}
      {onboardingEntryRef.current && hasPreviewableArtifact && !currentConversationStreaming ? (
        <FirstArtifactHint />
      ) : null}
      {amrBalanceGateBlock ? (
        <AmrBalanceDialog
          reason={amrBalanceGateBlock.reason}
          balanceUsd={amrBalanceGateBlock.snapshot.balanceUsd}
          profile={amrBalanceGateBlock.snapshot.profile}
          entrySource="chat_balance_gate_upgrade"
          metricsConsent={config.telemetry?.metrics === true}
          installationId={config.installationId}
          onClose={() => setAmrBalanceGateBlock(null)}
          onResolved={() => {
            // Sign-in completed or the recharge landed: lift the balance
            // pause and kick the drain so the parked send starts on its own
            // (it still re-gates, so a half-measure recharge surfaces the
            // soft reminder rather than silently failing mid-run).
            const conversationId = amrBalanceGateBlock.conversationId;
            setAmrBalanceGateBlock(null);
            amrGatePausedQueueConversationsRef.current.delete(conversationId);
            setQueuedAutoStartTick((tick) => tick + 1);
          }}
        />
      ) : null}
      {amrLowBalanceWarn ? (
        <AmrLowBalanceDialog
          balanceUsd={amrLowBalanceWarn.snapshot.balanceUsd}
          profile={amrLowBalanceWarn.snapshot.profile}
          entrySource="chat_low_balance_warn_recharge"
          metricsConsent={config.telemetry?.metrics === true}
          installationId={config.installationId}
          onDecision={amrLowBalanceWarn.resolve}
        />
      ) : null}
      <AnimatePresence>
        {projectActionsToast && !projectActionsToastInChatPane ? projectActionsToastNode : null}
        {brandReadyPrompt ? (
          <BrandReadyPrompt
            key="brand-ready-prompt"
            brandName={brandReadyPrompt.brandName}
            workspaceOffsetPx={workspaceFocused ? 0 : splitLeftPanelWidth + SPLIT_RESIZE_HANDLE_WIDTH}
            onPreview={() => {
              requestOpenFile(DESIGN_SYSTEM_TAB);
              setProjectActionsToast({
                message: t('project.brandReadyPreviewOpened'),
                details: null,
                tone: 'success',
                ttlMs: 3000,
              });
              dismissBrandReady();
            }}
            // Programmatic extraction can miss details — nudge toward refining it.
            showRefinement={projectIsProgrammaticBrandExtraction}
            onAiOptimize={() => {
              handleBrandEnrichment();
              dismissBrandReady();
            }}
            onEditManually={() => {
              setDesignSystemEditRequest({ module: 'logo', nonce: Date.now() });
              dismissBrandReady();
            }}
            onDismiss={dismissBrandReady}
          />
        ) : null}
      </AnimatePresence>
    </CollabProvider>
  );
}

function artifactExtensionFor(art: Artifact): '.html' | '.jsx' | '.tsx' | '.css' | '.svg' | '.md' {
  const type = (art.artifactType || '').toLowerCase();
  const identifier = (art.identifier || '').toLowerCase();
  if (type.includes('tsx') || identifier.endsWith('.tsx')) return '.tsx';
  if (type.includes('jsx') || type.includes('react') || identifier.endsWith('.jsx')) {
    return '.jsx';
  }
  if (type.includes('css') || identifier.endsWith('.css')) return '.css';
  if (type.includes('svg') || identifier.endsWith('.svg')) return '.svg';
  if (type.includes('markdown') || type === 'md' || identifier.endsWith('.md')) {
    return '.md';
  }
  return '.html';
}

function conversationHasBrandBrowserAssist(messages: ChatMessage[], brandId: string): boolean {
  const brandNeedle = `"brandId":"${escapeJsonNeedle(brandId)}"`;
  return messages.some((message) =>
    message.role === 'assistant' &&
    message.content.includes('<od-card type="brand-browser-assist"') &&
    message.content.includes(brandNeedle),
  );
}

function escapeJsonNeedle(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function artifactBaseNameFor(art: Artifact): string {
  return (
    (art.identifier || art.title || 'artifact')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'artifact'
  );
}

function artifactFileNamePattern(baseName: string, ext: string): RegExp {
  const escapedBaseName = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedExt = ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escapedBaseName}(?:-\\d+)?${escapedExt}$`);
}

export function findExistingArtifactProjectFile(
  art: Artifact,
  projectFiles: ProjectFile[],
  options: { minMtime?: number } = {},
): ProjectFile | null {
  const ext = artifactExtensionFor(art);
  const baseName = artifactBaseNameFor(art);
  const candidateFileName = `${baseName}${ext}`;
  const currentRunFiles = filterProjectFilesByMinMtime(projectFiles, options.minMtime);

  if (ext === '.html') {
    const pointerTarget = resolveHtmlPointerArtifactTarget({
      content: art.html,
      candidateFileName,
      projectFiles: currentRunFiles,
    });
    const pointerFile = pointerTarget
      ? currentRunFiles.find((file) => file.name === pointerTarget || file.path === pointerTarget)
      : null;
    if (pointerFile) return pointerFile;
  }

  const identifier = art.identifier || '';
  if (identifier) {
    const manifestMatches = currentRunFiles
      .filter((file) => file.artifactManifest?.metadata?.identifier === identifier)
      .sort((a, b) => b.mtime - a.mtime);
    if (manifestMatches[0]) return manifestMatches[0];
  }

  if (ext === '.html') {
    const exactNameMatch = currentRunFiles.find((file) => file.name === candidateFileName);
    if (exactNameMatch) return exactNameMatch;
  }
  return null;
}

export function findExistingNonHtmlArtifactProjectFile(
  art: Artifact,
  projectFiles: ProjectFile[],
  options: { minMtime?: number } = {},
): ProjectFile | null {
  if (artifactExtensionFor(art) === '.html') return null;
  return findExistingArtifactProjectFile(art, projectFiles, options);
}

export async function findSameTurnNonHtmlWriteForRecoveredArtifact({
  artifact,
  producedFiles,
  readProjectText,
}: {
  artifact: Artifact;
  producedFiles: readonly ProjectFile[];
  readProjectText: (name: string) => Promise<string | null>;
}): Promise<ProjectFile | null> {
  const ext = artifactExtensionFor(artifact);
  if (ext === '.html') return null;

  const baseName = artifactBaseNameFor(artifact);
  const candidateFileName = `${baseName}${ext}`;
  const namePattern = artifactFileNamePattern(baseName, ext);
  const identifier = artifact.identifier || '';
  const candidates = producedFiles
    .filter((file) => {
      if (identifier && file.artifactManifest?.metadata?.identifier === identifier) {
        return file.name.toLowerCase().endsWith(ext);
      }
      return file.name === candidateFileName || namePattern.test(file.name);
    })
    .sort((a, b) => b.mtime - a.mtime);

  const expected = normalizeProjectTextForArtifactComparison(artifact.html);
  for (const file of candidates) {
    const text = await readProjectText(file.name);
    if (text === null) continue;
    const actual = normalizeProjectTextForArtifactComparison(text);
    if (actual === expected) return file;
  }
  return null;
}

async function findSameTurnWriteForRecoveredArtifact({
  artifact,
  sourceText,
  producedFiles,
  readProjectText,
}: {
  artifact: Artifact;
  sourceText: string;
  producedFiles: readonly ProjectFile[];
  readProjectText: (name: string) => Promise<string | null>;
}): Promise<ProjectFile | null> {
  const nonHtmlWrite = await findSameTurnNonHtmlWriteForRecoveredArtifact({
    artifact,
    producedFiles,
    readProjectText,
  });
  if (nonHtmlWrite || artifactExtensionFor(artifact) !== '.html') return nonHtmlWrite;
  return findSameTurnHtmlWriteForRecoveredArtifact({
    artifactHtml: resolvePersistedArtifactHtml({
      artifactHtml: artifact.html,
      identifier: artifact.identifier,
      sourceText,
    }),
    producedFiles,
    readProjectHtml: readProjectText,
  });
}

function normalizeProjectTextForArtifactComparison(value: string | null | undefined): string {
  return String(value || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n');
}

function filterProjectFilesByMinMtime(
  projectFiles: readonly ProjectFile[],
  minMtime?: number,
): ProjectFile[] {
  return typeof minMtime === 'number' && Number.isFinite(minMtime)
    ? projectFiles.filter((file) => file.mtime >= minMtime)
    : [...projectFiles];
}

export function selectPrimaryProjectFile(files: ProjectFile[]): ProjectFile | null {
  const candidates = files
    .filter((file) => !isProcessArtifactFile(file.name))
    .map((file) => ({ file, rank: primaryProjectFileRank(file) }))
    .filter((candidate) => Number.isFinite(candidate.rank));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.rank - b.rank || b.file.mtime - a.file.mtime);
  return candidates[0]?.file ?? null;
}

function isProcessArtifactFile(name: string): boolean {
  const base = name.split('/').pop()?.toLowerCase() ?? name.toLowerCase();
  return (
    base === 'critique.json'
    || base.endsWith('.log')
    || base.endsWith('.meta.json')
    || base.endsWith('.artifact.json')
    || base.endsWith('.map')
  );
}

function primaryProjectFileRank(file: ProjectFile): number {
  if (manifestDeclaresPrimary(file)) return 0;
  if (file.artifactManifest && file.artifactManifest.metadata?.inferred !== true) return 1;
  if (file.kind === 'html') return 2;
  if (file.kind === 'image') return 3;
  if (file.kind === 'video') return 4;
  if (file.kind === 'sketch') return 5;
  if (file.kind === 'pdf') return 6;
  if (file.kind === 'presentation') return 7;
  if (file.kind === 'document') return 8;
  if (file.kind === 'spreadsheet') return 9;
  return Number.POSITIVE_INFINITY;
}

function manifestDeclaresPrimary(file: ProjectFile): boolean {
  const manifest = file.artifactManifest;
  if (!manifest) return false;
  if (primaryValueTargetsFile(manifest.primary, file.name)) return true;
  const metadata = manifest.metadata;
  if (!metadata || typeof metadata !== 'object') return false;
  if (primaryValueTargetsFile(metadata.primary, file.name)) return true;
  const outputs = metadata.outputs;
  if (outputs && typeof outputs === 'object' && !Array.isArray(outputs)) {
    return primaryValueTargetsFile(
      (outputs as { primary?: unknown }).primary,
      file.name,
    );
  }
  return false;
}

function primaryValueTargetsFile(value: unknown, fileName: string): boolean {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  return normalizeProjectFileName(value) === normalizeProjectFileName(fileName);
}

function normalizeProjectFileName(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();
}

function assistantAgentDisplayName(
  agentId: string | null,
  fallbackName?: string,
): string | undefined {
  return agentDisplayName(agentId, fallbackName) ?? undefined;
}

function isTerminalRunStatus(status: ChatMessage['runStatus']): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'canceled';
}

function isActiveRunStatus(status: ChatMessage['runStatus']): boolean {
  return status === 'queued' || status === 'running';
}

/** A daemon run-status snapshot, as returned by `fetchChatRunStatus`/`listActiveChatRuns`. */
type RunStatusSnapshot = Awaited<ReturnType<typeof fetchChatRunStatus>>;

/**
 * Resolves the authoritative `endedAt` for a terminal-recovery branch.
 *
 * Invariant: every terminal-recovery branch (reload reattach, generic
 * disconnect retry-cap probe, stale/legacy row replay) must stamp `endedAt`
 * from an authoritative TERMINAL `updatedAt` — a status snapshot whose
 * `status` is terminal (succeeded/canceled/failed), observed at the END of
 * recovery — never from a pre-reattach/heartbeat snapshot or a stale
 * disconnect-time value.
 *
 * `candidate` is whatever status snapshot the caller already has in hand
 * (e.g. fetched before `reattachDaemonRun` started, which may still read
 * 'running'/'queued' if the daemon only finished afterward). When it is
 * already terminal, its `updatedAt` IS the authoritative value and is
 * returned with no extra round trip. When it is missing or still active, a
 * fresh probe is taken via `fetchChatRunStatus` — the daemon may have
 * finished in the interim — and used if terminal. If the fresh probe is
 * also unavailable or non-terminal, `Date.now()` is the last-resort
 * fallback so `endedAt` is never left unset.
 */
async function resolveTerminalEndedAt(
  runId: string,
  candidate: RunStatusSnapshot | null | undefined,
  workspaceContext?: WorkspaceCollabContext | null,
): Promise<number> {
  if (candidate && !isActiveRunStatus(candidate.status)) {
    return candidate.updatedAt;
  }
  const probed = await fetchChatRunStatus(runId, workspaceContext).catch(() => null);
  if (probed && !isActiveRunStatus(probed.status)) {
    return probed.updatedAt;
  }
  return Date.now();
}

function isProgrammaticBrandExtractionStatusMessage(
  message: ChatMessage,
  metadata: ProjectMetadata | null | undefined,
): boolean {
  if (!isProgrammaticBrandExtractionProject(metadata)) return false;
  if (message.role !== 'assistant' || message.runId) return false;
  if (!isActiveRunStatus(message.runStatus)) return false;
  const text = `${message.content}\n${textContentFromAgentEvents(message.events)}`;
  return (
    text.includes('Programmatic design-system extraction started') ||
    text.includes('程序化设计系统抽取') ||
    text.includes('程式化設計系統抽取')
  );
}

export function hasRecoverableArtifactMessage(message: ChatMessage): boolean {
  if (message.role !== 'assistant') return false;
  if (!message.runId) return false;
  if (!isTerminalRunStatus(message.runStatus)) return false;
  if (message.producedFiles?.length) return false;
  const sourceText = message.content.trim().length > 0
    ? message.content
    : textContentFromAgentEvents(message.events);
  return artifactFromRecoverableSourceText(sourceText) !== null;
}

function artifactFromRecoverableSourceText(sourceText: string): Artifact | null {
  const parser = createArtifactParser();
  let parsedArtifact: Artifact | null = null;
  let liveHtml = '';
  for (const ev of [...parser.feed(sourceText), ...parser.flush()]) {
    if (ev.type === 'artifact:start') {
      liveHtml = '';
      parsedArtifact = {
        identifier: ev.identifier,
        artifactType: ev.artifactType,
        title: ev.title,
        html: '',
      };
    } else if (ev.type === 'artifact:chunk') {
      liveHtml += ev.delta;
      parsedArtifact = artifactWithHtml(parsedArtifact, ev.identifier, liveHtml);
    } else if (ev.type === 'artifact:end') {
      parsedArtifact = artifactWithHtml(parsedArtifact, ev.identifier, ev.fullContent);
    }
  }
  if (parsedArtifact?.html) return parsedArtifact;

  const html = recoverStandaloneHtmlDocument(sourceText)
    ?? recoverHtmlDocumentFromMarkdownFence(sourceText);
  if (!html) return null;
  return {
    identifier: 'response',
    artifactType: 'text/html',
    title: 'Response',
    html,
  };
}

export function shouldReplayTerminalRunMessage(message: ChatMessage): boolean {
  if (message.role !== 'assistant') return false;
  if (!message.runId) return false;
  if (message.runStatus !== 'succeeded') return false;
  // A daemon can persist terminal success before the browser finishes its
  // project-file refresh. Reattach once even when prose already exists so the
  // delivery invariant can confirm a file or downgrade the turn after reload.
  if (designDeliveryVerificationPending(message)) {
    // #6505: a historical succeeded Design row whose delivery metadata never
    // materialized must not be replayed/reattached on every reload. Bound
    // reconciliation to a short window after the run's terminal time; past it,
    // the row renders as a terminal outcome instead of looping through replay.
    if (designDeliveryReconciliationStale(message)) return false;
    return true;
  }
  if (message.content.trim().length > 0) return false;
  if (
    message.startedAt == null
    && !message.preTurnFileNames?.length
    && textContentFromAgentEvents(message.events).trim().length === 0
  ) {
    return false;
  }
  return !(message.producedFiles?.length);
}

function textContentFromAgentEvents(events?: AgentEvent[]): string {
  return (events ?? [])
    .filter((event): event is Extract<AgentEvent, { kind: 'text' }> => event.kind === 'text')
    .map((event) => event.text)
    .join('');
}

const QUEUED_CHAT_SENDS_STORAGE_VERSION = 1;

function queuedChatSendsStorageKey(projectId: string): string {
  return `od:chat-queued-sends:${projectId}:v${QUEUED_CHAT_SENDS_STORAGE_VERSION}`;
}

function loadQueuedChatSends(projectId: string): QueuedChatSend[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(queuedChatSendsStorageKey(projectId));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const seenIds = new Set<string>();
    return parsed
      .filter(isQueuedChatSend)
      .filter((item) => {
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      })
      .slice(0, 100);
  } catch {
    return [];
  }
}

function saveQueuedChatSends(projectId: string, items: QueuedChatSend[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = queuedChatSendsStorageKey(projectId);
    if (items.length === 0) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(items.slice(0, 100)));
  } catch {
    // Ignore private-mode/quota failures. The in-memory queue still works.
  }
}

function isQueuedChatSend(value: unknown): value is QueuedChatSend {
  if (typeof value !== 'object' || value == null || Array.isArray(value)) return false;
  const record = value as Partial<QueuedChatSend>;
  return (
    typeof record.id === 'string' &&
    typeof record.conversationId === 'string' &&
    typeof record.prompt === 'string' &&
    Array.isArray(record.attachments) &&
    Array.isArray(record.commentAttachments) &&
    typeof record.createdAt === 'number'
  );
}

function stripQueueOnlyFromMeta(
  meta: ProjectChatSendMeta | ChatSendMeta | undefined,
): ProjectChatSendMeta | undefined {
  if (!meta) return undefined;
  const {
    queueOnly: _queueOnly,
    acceptQueuedHomeHandoff: _acceptQueuedHomeHandoff,
    ...rest
  } = meta as ProjectChatSendMeta;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

export interface RetryTarget {
  failedAssistant: ChatMessage;
  userMsg: ChatMessage;
  priorMessages: ChatMessage[];
  preservedAttempts: ChatMessage[];
}

export function resolveRetryTarget(
  messages: ChatMessage[],
  failedAssistantId: string,
): RetryTarget | null {
  const failedIndex = messages.findIndex(
    (message) =>
      message.id === failedAssistantId &&
      message.role === 'assistant' &&
      isRetryableAssistantTerminalFailure(message),
  );
  if (failedIndex <= 0 || failedIndex !== messages.length - 1) return null;

  let userIndex = failedIndex - 1;
  while (
    userIndex >= 0 &&
    messages[userIndex]?.role === 'assistant' &&
    isRetryableAssistantTerminalFailure(messages[userIndex]!)
  ) {
    userIndex -= 1;
  }

  const userMsg = messages[userIndex];
  const failedAssistant = messages[failedIndex];
  if (!userMsg || userMsg.role !== 'user' || !failedAssistant) return null;

  return {
    failedAssistant,
    userMsg,
    priorMessages: messages.slice(0, userIndex),
    preservedAttempts: messages.slice(userIndex + 1, failedIndex + 1),
  };
}

function latestDesignSystemActivityEvents(messages: ChatMessage[]): AgentEvent[] {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== 'assistant') continue;
    if ((message.events?.length ?? 0) > 0) return message.events ?? [];
    if (isActiveRunStatus(message.runStatus)) return [];
  }
  return [];
}

function pluginWorkflowTitle(action: PluginFolderAgentAction): string {
  return action === 'publish' ? 'Publish repo' : 'OpenDesign PR';
}

function pluginWorkflowCliCommand(action: PluginFolderAgentAction, relativePath: string): string {
  return action === 'publish'
    ? `od plugin publish-repo ${relativePath}`
    : `od plugin open-design-pr ${relativePath}`;
}

function pluginWorkflowPlannedSteps(action: PluginFolderAgentAction): string[] {
  if (action === 'publish') {
    return [
      'Resolve GitHub owner and validate plugin metadata',
      'Create or update the GitHub repository',
      'Push plugin files and tags',
      'Return the repository URL',
    ];
  }
  return [
    'Ensure the OpenDesign fork exists',
    'Clone the fork and prepare a branch',
    'Copy the plugin into plugins/community',
    'Push the branch and open the PR form',
  ];
}

function pluginWorkflowPlannedEvents(action: PluginFolderAgentAction, relativePath: string): AgentEvent[] {
  return [
    { kind: 'text', text: `${pluginWorkflowStartContent(action, relativePath)}\n\n` },
    { kind: 'status', label: 'working', detail: pluginWorkflowTitle(action) },
  ];
}

function pluginWorkflowResultEvents(
  action: PluginFolderAgentAction,
  relativePath: string,
  message: string,
  url: string | undefined,
  log: string[] | undefined,
  ok: boolean,
  existingEvents?: AgentEvent[],
): AgentEvent[] {
  const summary = ok
    ? pluginWorkflowSuccessContent(action, relativePath, message, url, log)
    : pluginWorkflowFailureContent(action, relativePath, message, log);
  const baseEvents = (existingEvents ?? []).filter(
    (event) => !(event.kind === 'status' && event.label === 'working'),
  );
  return [
    ...baseEvents,
    { kind: 'text', text: `${summary}\n\n` },
    {
      kind: 'status',
      label: ok ? 'done' : 'failed',
      detail: ok ? 'CLI command finished' : 'CLI command failed',
    },
  ];
}

function pluginWorkflowStartContent(action: PluginFolderAgentAction, relativePath: string): string {
  const title = pluginWorkflowTitle(action);
  const command = pluginWorkflowCliCommand(action, relativePath);
  const steps = pluginWorkflowPlannedSteps(action).map((step) => `- ${step}`).join('\n');
  return `${title} started.\n\n\`\`\`bash\n${command}\n\`\`\`\n\nPlanned steps:\n${steps}`;
}

function pluginWorkflowSuccessContent(
  action: PluginFolderAgentAction,
  relativePath: string,
  message: string,
  url?: string,
  log?: string[],
): string {
  const summary = stripTrailingUrl(message, url) || `${pluginWorkflowTitle(action)} completed for \`${relativePath}\`.`;
  const lines = (log ?? []).map((line) => line.trim()).filter(Boolean).slice(0, 5);
  const command = pluginWorkflowCliCommand(action, relativePath);
  const details = lines.length > 0
    ? `\n\nCLI output:\n${lines.map((line) => `- \`${truncatePluginWorkflowLine(line)}\``).join('\n')}`
    : '';
  const link = url ? `\n\nLink: [${url}](${url})` : '';
  return `${summary}\n\n\`\`\`bash\n${command}\n\`\`\`${link}${details}`;
}

function pluginWorkflowFailureContent(
  action: PluginFolderAgentAction,
  relativePath: string,
  message: string,
  log?: string[],
): string {
  const lines = (log ?? []).map((line) => line.trim()).filter(Boolean).slice(0, 5);
  const command = pluginWorkflowCliCommand(action, relativePath);
  const details = lines.length > 0
    ? `\n\nCLI output:\n${lines.map((line) => `- \`${truncatePluginWorkflowLine(line)}\``).join('\n')}`
    : '';
  return `${pluginWorkflowTitle(action)} failed.\n\n\`\`\`bash\n${command}\n\`\`\`\n\n${message}${details}`;
}

function truncatePluginWorkflowLine(line: string): string {
  return line.length > 160 ? `${line.slice(0, 157)}...` : line;
}

function stripTrailingUrl(message: string, url?: string): string {
  const text = message.trim();
  const link = url?.trim();
  if (!link) return text;
  return text.replace(new RegExp(`\\s*${escapeRegExp(link)}\\s*$`), '').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A daemon assistant message that is "queued/running" but has no runId yet
// is in-flight on the client: POST /api/runs has not returned. Persisting it
// in this state creates a phantom DB row that the reattach loop can never
// recover (the daemon either never saw the request or the response was lost),
// which is what produced the "Working 24m+" stuck UI. Treat the in-flight
// window as ephemeral and only write to DB once a runId pins the row to a
// real daemon run — or once the run reaches a terminal state.
function isPhantomDaemonRunMessage(m: ChatMessage): boolean {
  return (
    m.role === 'assistant' &&
    isActiveRunStatus(m.runStatus) &&
    !m.runId
  );
}

function isStoppableAssistantMessage(message: ChatMessage): boolean {
  if (message.role !== 'assistant') return false;
  if (isActiveRunStatus(message.runStatus)) return true;
  return message.runStatus === undefined && message.endedAt === undefined && message.startedAt !== undefined;
}

export function resolveSucceededRunStatus(status: ChatMessage['runStatus']): ChatMessage['runStatus'] {
  return status === 'failed' || status === 'canceled' ? status : 'succeeded';
}

const DESIGN_RESULT_MISSING_DETAIL =
  'The design run finished without producing a deliverable project file.';
const DESIGN_RESULT_DELIVERY_FAILED_DETAIL =
  'The design result was generated, but OpenDesign could not save it to the project.';

function applyDesignDeliveryOutcome(
  message: ChatMessage,
  outcome: DesignDeliveryOutcome,
  persistenceError?: string,
): ChatMessage {
  if (outcome === 'delivered') {
    return { ...message, resultDeliveryState: 'delivered' };
  }
  if (outcome !== 'no_result' && outcome !== 'delivery_failed') return message;
  const detail =
    outcome === 'delivery_failed'
      ? persistenceError || DESIGN_RESULT_DELIVERY_FAILED_DETAIL
      : DESIGN_RESULT_MISSING_DETAIL;
  const failed = {
    ...message,
    resultDeliveryState: outcome,
    resumable: false,
  };
  return appendErrorStatusEvent(
    failed,
    detail,
    'ARTIFACT_NOT_FOUND',
  );
}

export function computeProducedFiles(
  beforeNames: ReadonlySet<string> | readonly string[] | undefined,
  next: readonly ProjectFile[],
  authoritativePaths?: readonly string[],
  projectId?: string,
  projectRoot?: string | null,
): ProjectFile[] | undefined {
  const beforeSet = beforeNames
    ? beforeNames instanceof Set
      ? beforeNames
      : new Set(beforeNames)
    : null;
  if (authoritativePaths !== undefined) {
    const byName = new Map<string, ProjectFile>();
    // The daemon's authoritative list intentionally covers user-facing
    // artifacts and render dependencies, not every file an agent can create
    // (for example plugin manifests and Markdown). Preserve all files that are
    // provably new from the turn baseline, then use authoritative paths to add
    // modified existing artifacts without attributing untouched inputs.
    if (beforeSet) {
      for (const file of next) {
        if (!beforeSet.has(file.name)) byName.set(file.name, file);
      }
    }
    for (const rawPath of authoritativePaths) {
      const file = findTouchedProjectFile(rawPath, next, projectId, projectRoot);
      if (file) byName.set(file.name, file);
    }
    return filterImplicitProducedFiles([...byName.values()]);
  }
  if (!beforeSet) return undefined;
  return filterImplicitProducedFiles(next.filter((f) => !beforeSet.has(f.name)));
}

export function computeTraceObjectFiles(
  beforeNames: ReadonlySet<string> | readonly string[] | undefined,
  next: readonly ProjectFile[],
  touchedPaths: Iterable<string> = [],
  projectId?: string,
  projectRoot?: string | null,
): ProjectFile[] | undefined {
  if (!beforeNames) return undefined;
  const set = beforeNames instanceof Set ? beforeNames : new Set(beforeNames);
  const byName = new Map<string, ProjectFile>();
  for (const file of filterImplicitProducedFiles(next.filter((f) => !set.has(f.name)))) {
    byName.set(file.name, { ...file, traceObjectReason: 'new' });
  }
  for (const rawPath of touchedPaths) {
    const file = findTouchedProjectFile(rawPath, next, projectId, projectRoot);
    if (!file) continue;
    byName.set(file.name, {
      ...file,
      traceObjectReason: set.has(file.name) ? 'modified' : 'new',
    });
  }
  return [...byName.values()];
}

function findTouchedProjectFile(
  rawPath: string,
  files: readonly ProjectFile[],
  projectId?: string,
  projectRoot?: string | null,
): ProjectFile | null {
  const slashed = rawPath.replace(/\\/g, '/');
  // Lexically resolve `.`/`..` first: a path whose `..` climbs above its own
  // anchor can never be proven to stay anywhere, so it is rejected outright —
  // before any suffix matching could pair it with an in-project file.
  const segments = lexicallyNormalizePathSegments(slashed);
  if (!segments || segments.length === 0) return null;
  let normalized = segments.join('/');
  // A managed-project alias (`…/projects/<projectId>/…`) identifies the file's
  // project-relative form regardless of where the alias mount lives, so it is
  // trusted as-is; containment below only anchors paths without that marker.
  const managedProjectRelativePath = relativePathFromManagedProjectAlias(normalized, projectId);
  if (!managedProjectRelativePath && isAbsoluteToolPath(slashed)) {
    const rootSegments = projectRoot
      ? lexicallyNormalizePathSegments(projectRoot.replace(/\\/g, '/'))
      : null;
    if (rootSegments && rootSegments.length > 0) {
      // An absolute tool path is only trusted when it provably lives under
      // the project root: require the root's segments as a prefix and match
      // on the remaining project-relative form (/workspace/index.html →
      // index.html). Out-of-root paths (including `..` escapes that resolve
      // outside the root) are rejected here rather than falling through to
      // suffix matching, where /tmp/site/index.html could otherwise pick the
      // project's own index.html.
      if (segments.length <= rootSegments.length) return null;
      for (let i = 0; i < rootSegments.length; i += 1) {
        if (segments[i] !== rootSegments[i]) return null;
      }
      normalized = segments.slice(rootSegments.length).join('/');
    }
    // Without a usable root there is no anchor to judge containment against;
    // keep the legacy suffix behavior below.
  }
  const comparablePaths = managedProjectRelativePath
    ? [normalized, managedProjectRelativePath]
    : [normalized];
  const hasPathSeparator = comparablePaths.every((candidate) => candidate.includes('/'));
  const basename = normalized.split('/').pop() ?? normalized;
  const normalizedFiles = files.map((file) => ({
    file,
    candidates: [
      normalizeComparableFilePath(file.path ?? ''),
      normalizeComparableFilePath(file.name),
    ].filter(Boolean),
  }));

  const matches = (predicate: (candidate: string) => boolean): ProjectFile[] => {
    const matched: ProjectFile[] = [];
    for (const { file, candidates } of normalizedFiles) {
      if (candidates.some(predicate)) matched.push(file);
    }
    return matched;
  };

  const exact = matches((candidate) => comparablePaths.includes(candidate));
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) return null;

  const suffix = matches((candidate) =>
    candidate.includes('/') &&
    comparablePaths.some((comparablePath) =>
      candidate.endsWith(`/${comparablePath}`) || comparablePath.endsWith(`/${candidate}`),
    ),
  );
  if (suffix.length === 1) return suffix[0]!;
  if (suffix.length > 1) return null;

  if (hasPathSeparator) return null;

  const basenameMatches = normalizedFiles.filter(({ candidates }) =>
    candidates.some((candidate) => candidate.split('/').pop() === basename),
  );
  return basenameMatches.length === 1 ? basenameMatches[0]!.file : null;
}

// Return a project-relative tool path only when an absolute Write/Edit path
// can be proven to live under the resolved project root. This runs before the
// refreshed inventory is available, so aliases, relative paths, and paths with
// only a matching `projects/<id>` suffix must wait for that later authoritative
// match instead of creating a persistent placeholder tab.
function provenProjectRelativeToolPath(
  rawPath: string,
  projectRoot?: string | null,
): string | null {
  const slashed = rawPath.replace(/\\/g, '/');
  if (!isAbsoluteToolPath(slashed) || !projectRoot) return null;
  const segments = lexicallyNormalizePathSegments(slashed);
  if (!segments || segments.length === 0) return null;
  const rootSegments = lexicallyNormalizePathSegments(projectRoot.replace(/\\/g, '/'));
  if (!rootSegments || segments.length <= rootSegments.length) return null;
  for (let index = 0; index < rootSegments.length; index += 1) {
    if (segments[index] !== rootSegments[index]) return null;
  }
  return segments.slice(rootSegments.length).join('/') || null;
}

function relativePathFromManagedProjectAlias(
  normalizedPath: string,
  projectId: string | undefined,
): string | null {
  const normalizedProjectId = normalizeComparableFilePath(projectId ?? '');
  if (!normalizedProjectId || normalizedProjectId.includes('/')) return null;
  const marker = `projects/${normalizedProjectId}/`;
  const markerIndex = normalizedPath.lastIndexOf(marker);
  if (markerIndex < 0 || (markerIndex > 0 && normalizedPath[markerIndex - 1] !== '/')) return null;
  return normalizedPath.slice(markerIndex + marker.length) || null;
}

function normalizeComparableFilePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .split('/')
    .filter((part) => part && part !== '.')
    .join('/');
}

// Lexically resolve `.`/`..` segments. Returns null when a `..` climbs above
// the path's own anchor — such a path cannot be proven to resolve anywhere.
function lexicallyNormalizePathSegments(path: string): string[] | null {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (out.length === 0) return null;
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out;
}

function isAbsoluteToolPath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:\//.test(path);
}

// Resolve the agent's raw Write/Edit tool paths (absolute or partial) to
// project file NAMES for selectAutoOpenTurnArtifact's touched-file
// restriction. Paths that do not resolve to a project file (out-of-project
// writes) are dropped; ambiguous matches resolve to null inside
// findTouchedProjectFile and are dropped the same way.
export function resolveAgentTouchedFileNames(
  touchedPaths: Iterable<string>,
  files: readonly ProjectFile[],
  projectId?: string,
  projectRoot?: string | null,
): Set<string> {
  const names = new Set<string>();
  for (const rawPath of touchedPaths) {
    const file = findTouchedProjectFile(rawPath, files, projectId, projectRoot);
    if (file) names.add(file.name);
  }
  return names;
}

// Reattach with a recovered (on-disk) artifact must still include any
// other files the turn produced before the artifact write — replacing
// the diff with a single file was the regression noted on PR #2383.
export function mergeRecoveredArtifact(
  diff: readonly ProjectFile[],
  recovered: ProjectFile | null,
): ProjectFile[] {
  if (!recovered) return [...diff];
  if (diff.some((f) => f.name === recovered.name)) return [...diff];
  return [...diff, recovered];
}

export async function findSameTurnHtmlWriteForRecoveredArtifact({
  artifactHtml,
  producedFiles,
  readProjectHtml,
}: {
  artifactHtml: string;
  producedFiles: readonly ProjectFile[];
  readProjectHtml: (name: string) => Promise<string | null>;
}): Promise<ProjectFile | null> {
  const recovered = normalizeHtmlForRecoveredArtifactComparison(artifactHtml);
  if (!recovered) return null;
  const candidates = producedFiles.filter(isHtmlProjectFile);
  if (candidates.length === 0) return null;
  const contents = await Promise.all(candidates.map((file) => readProjectHtml(file.name)));
  const normalized = contents.map(normalizeHtmlForRecoveredArtifactComparison);
  // Bind only on an exact normalized-content match. This is inherently
  // agent-agnostic (#4308): whenever a filesystem-backed CLI writes an HTML
  // file and echoes the same document as an artifact, the normalized contents
  // are equal and we suppress the duplicate — no Claude-specific gate needed.
  //
  // We deliberately do NOT bind on a content *mismatch*. A differing same-turn
  // HTML file is a genuinely different document and must persist on its own.
  // A blind single-file bind also mis-fired across queued runs: the pre-turn
  // file snapshot for a queued run can predate the previous run's persist, so
  // computeProducedFiles() reports that earlier artifact as "produced this
  // turn" and we'd bind the echo to the wrong, unrelated file.
  const exact = candidates.find((_file, i) => normalized[i] === recovered);
  return exact ?? null;
}

function isHtmlProjectFile(file: ProjectFile): boolean {
  const name = (file.path || file.name).toLowerCase();
  return file.kind === 'html' || /\.(?:html?|xhtml)$/u.test(name);
}

function normalizeHtmlForRecoveredArtifactComparison(value: string | null | undefined): string {
  return String(value || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .trim();
}

export function mergeRecoveredTraceObjectFile(
  files: readonly ProjectFile[],
  recovered: ProjectFile | null,
): ProjectFile[] {
  const out = [...files];
  if (!recovered) return out;
  const existing = out.findIndex((file) => file.name === recovered.name);
  const tagged = { ...recovered, traceObjectReason: 'recovered' as const };
  if (existing >= 0) {
    out[existing] = { ...out[existing]!, traceObjectReason: out[existing]!.traceObjectReason ?? 'recovered' };
    return out;
  }
  return [...out, tagged];
}

export function extractTouchedFilePathsFromEvents(events: ChatMessage['events']): string[] {
  if (!Array.isArray(events)) return [];
  const pending = new Map<string, string>();
  const touched: string[] = [];
  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    const rec = event as Record<string, unknown>;
    if (rec.kind === 'tool_use' && isFileWriteToolName(rec.name)) {
      const filePath = extractFileWriteToolPath(rec.input);
      if (typeof rec.id === 'string' && typeof filePath === 'string' && filePath) {
        pending.set(rec.id, filePath);
      }
    }
    if (rec.kind === 'tool_result') {
      const toolUseId = typeof rec.toolUseId === 'string'
        ? rec.toolUseId
        : typeof rec.tool_use_id === 'string'
          ? rec.tool_use_id
          : '';
      const filePath = pending.get(toolUseId);
      if (!filePath) continue;
      pending.delete(toolUseId);
      if (rec.isError !== true) touched.push(filePath);
    }
  }
  return touched;
}

function isFileWriteToolName(value: unknown): boolean {
  return (
    value === 'Write'
    || value === 'write'
    || value === 'create_file'
    || value === 'Edit'
    || value === 'str_replace_edit'
    || value === 'MultiEdit'
    || value === 'multi_edit'
  );
}

function extractFileWriteToolPath(input: unknown): string | null {
  if (!input || typeof input !== 'object') return null;
  const rec = input as Record<string, unknown>;
  const filePath = rec.file_path ?? rec.filePath ?? rec.path;
  return typeof filePath === 'string' && filePath ? filePath : null;
}

export function clearStreamingConversationMarker(
  currentConversationId: string | null,
  completedConversationId?: string | null,
): string | null {
  if (
    completedConversationId !== undefined
    && completedConversationId !== null
    && currentConversationId !== completedConversationId
  ) {
    return currentConversationId;
  }
  return null;
}

export function shouldClearActiveRunRefs(
  currentConversationId: string | null,
  completedConversationId: string,
): boolean {
  return currentConversationId === completedConversationId;
}

export function finalizeActiveAssistantMessagesOnStop(
  messages: ChatMessage[],
  stoppedAt: number,
): { messages: ChatMessage[]; finalized: ChatMessage[] } {
  const finalized: ChatMessage[] = [];
  const next = messages.map((message) => {
    if (!isStoppableAssistantMessage(message)) {
      return message;
    }
    const updated = {
      ...message,
      runStatus: 'canceled' as const,
      endedAt: message.endedAt ?? stoppedAt,
    };
    finalized.push(updated);
    return updated;
  });
  return { messages: next, finalized };
}

type BufferedTextUpdates = ReturnType<typeof createBufferedTextUpdates>;

export function createBufferedTextUpdates({
  updateMessage,
  persistSoon,
  flushAndPersistNow,
  onContentDelta,
}: {
  updateMessage: (updater: (prev: ChatMessage) => ChatMessage) => void;
  persistSoon: () => void;
  // Synchronous flush + persist with a transport that survives page
  // unload (PUT with keepalive). Invoked by the pagehide handler so the
  // last buffered chunk isn't lost when the user reloads mid-stream.
  flushAndPersistNow?: () => void;
  onContentDelta?: (delta: string) => void;
}) {
  let pendingContentDelta = '';
  let pendingTextEventDelta = '';
  let pendingThinkingEventDelta = '';
  let flushFrame: number | null = null;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let flushing = false;
  let needsFlush = false;
  const hasDocument = typeof document !== 'undefined';
  const hasWindow = typeof window !== 'undefined';

  const cancelScheduledFlush = () => {
    if (flushFrame !== null) {
      cancelAnimationFrame(flushFrame);
      flushFrame = null;
    }
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  };

  const flush = () => {
    if (disposed) return;
    if (flushing) {
      needsFlush = true;
      return;
    }
    cancelScheduledFlush();
    if (
      !pendingContentDelta
      && !pendingTextEventDelta
      && !pendingThinkingEventDelta
      && !needsFlush
    ) return;
    flushing = true;
    needsFlush = false;
    const contentDelta = pendingContentDelta;
    const textEventDelta = pendingTextEventDelta;
    const thinkingEventDelta = pendingThinkingEventDelta;
    pendingContentDelta = '';
    pendingTextEventDelta = '';
    pendingThinkingEventDelta = '';
    try {
      updateMessage((prev) => ({
        ...prev,
        content: prev.content + contentDelta,
        events: appendBufferedAgentDeltas(
          prev.events ?? [],
          textEventDelta,
          thinkingEventDelta,
        ),
      }));
      persistSoon();
      if (contentDelta) onContentDelta?.(contentDelta);
    } finally {
      flushing = false;
    }
    if (pendingContentDelta || pendingTextEventDelta || pendingThinkingEventDelta || needsFlush) {
      needsFlush = false;
      scheduleFlush();
    }
  };

  const scheduleFlush = () => {
    if (disposed || flushFrame !== null || flushTimer !== null) return;
    flushFrame = requestAnimationFrame(() => {
      flushFrame = null;
      flush();
    });
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, 250);
  };

  const appendContent = (delta: string) => {
    if (disposed) return;
    pendingContentDelta += delta;
    needsFlush = true;
    scheduleFlush();
  };

  const appendTextEvent = (delta: string) => {
    if (disposed) return;
    if (pendingThinkingEventDelta) flush();
    pendingTextEventDelta += delta;
    needsFlush = true;
    scheduleFlush();
  };

  const appendEvent = (ev: AgentEvent) => {
    if (disposed) return;
    if (ev.kind === 'text') {
      appendTextEvent(ev.text);
      return;
    }
    if (ev.kind === 'thinking') {
      if (pendingTextEventDelta) flush();
      pendingThinkingEventDelta += ev.text;
      needsFlush = true;
      scheduleFlush();
      return;
    }
    flush();
    updateMessage((prev) => ({
      ...prev,
      events: appendCoalescedAgentEvent(prev.events ?? [], ev),
    }));
    persistSoon();
  };

  const cancel = () => {
    disposed = true;
    cancelScheduledFlush();
    pendingContentDelta = '';
    pendingTextEventDelta = '';
    pendingThinkingEventDelta = '';
    needsFlush = false;
    if (hasDocument) {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
    if (hasWindow) {
      window.removeEventListener('pagehide', onPageHide);
    }
  };

  function onVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  }

  function onPageHide() {
    flush();
    // persistSoon's 500ms debounce never fires once the document tears
    // down, so synchronously PUT with keepalive instead.
    flushAndPersistNow?.();
  }

  if (hasDocument) {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
  if (hasWindow) {
    window.addEventListener('pagehide', onPageHide);
  }

  // True when text has been appended but not yet flushed into a `text` event.
  // Callers that need the soon-to-be-committed event count (e.g. pinning a live
  // tool's stream position) add 1 for this still-buffered preamble.
  const hasPendingText = () => pendingTextEventDelta.length > 0;

  return { appendContent, appendTextEvent, appendEvent, flush, cancel, hasPendingText };
}

function appendCoalescedAgentEvent(events: AgentEvent[], event: AgentEvent): AgentEvent[] {
  const last = events[events.length - 1];
  if (
    (event.kind === 'text' || event.kind === 'thinking')
    && last?.kind === event.kind
  ) {
    return [
      ...events.slice(0, -1),
      { ...last, text: last.text + event.text },
    ];
  }
  return [...events, event];
}

function appendBufferedAgentDeltas(
  events: AgentEvent[],
  textDelta: string,
  thinkingDelta: string,
): AgentEvent[] {
  let next = events;
  if (textDelta) next = appendCoalescedAgentEvent(next, { kind: 'text', text: textDelta });
  if (thinkingDelta) {
    next = appendCoalescedAgentEvent(next, { kind: 'thinking', text: thinkingDelta });
  }
  return next;
}

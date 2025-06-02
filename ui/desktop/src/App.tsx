import React, { useEffect, useRef, useState, useCallback } from 'react';
import { IpcRendererEvent } from 'electron';
import { openSharedSessionFromDeepLink } from './sessionLinks';
import SplitLayout from './components/SplitLayout';
import { HtmlResource } from '@mcp-ui/client';
import { initializeSystem } from './utils/providerUtils';
import { ErrorUI } from './components/ErrorBoundary';
import { ConfirmationModal } from './components/ui/ConfirmationModal';
import { ToastContainer } from 'react-toastify';
import { toastService } from './toasts';
import { extractExtensionName } from './components/settings/extensions/utils';
import { GoosehintsModal } from './components/GoosehintsModal';

import ChatView from './components/ChatView';
import SuspenseLoader from './suspense-loader';
import { type SettingsViewOptions } from './components/settings/SettingsView';
import SettingsViewV2 from './components/settings_v2/SettingsView';
import MoreModelsView from './components/settings/models/MoreModelsView';
import ConfigureProvidersView from './components/settings/providers/ConfigureProvidersView';
import SessionsView from './components/sessions/SessionsView';
import SharedSessionView from './components/sessions/SharedSessionView';
import SchedulesView from './components/schedule/SchedulesView';
import ProviderSettings from './components/settings_v2/providers/ProviderSettingsPage';
import RecipeEditor from './components/RecipeEditor';
import { useChat } from './hooks/useChat';

import 'react-toastify/dist/ReactToastify.css';
import { useConfig, MalformedConfigError } from './components/ConfigContext';
import { addExtensionFromDeepLink as addExtensionFromDeepLinkV2 } from './components/settings_v2/extensions';
import { backupConfig, initConfig, readAllConfig } from './api/sdk.gen';
import PermissionSettingsView from './components/settings_v2/permission/PermissionSetting';

import { type SessionDetails } from './sessions';

export type View =
  | 'welcome'
  | 'chat'
  | 'settings'
  | 'moreModels'
  | 'configureProviders'
  | 'configPage'
  | 'ConfigureProviders'
  | 'settingsV2'
  | 'sessions'
  | 'schedules'
  | 'sharedSession'
  | 'loading'
  | 'recipeEditor'
  | 'permission';

export type ViewOptions =
  | SettingsViewOptions
  | { resumedSession?: SessionDetails }
  | Record<string, unknown>;

export type ViewConfig = {
  view: View;
  viewOptions?: ViewOptions;
};

const getInitialView = (): ViewConfig => {
  const urlParams = new URLSearchParams(window.location.search);
  const viewFromUrl = urlParams.get('view');
  const windowConfig = window.electron.getConfig();

  if (viewFromUrl === 'recipeEditor' && windowConfig?.recipeConfig) {
    return {
      view: 'recipeEditor',
      viewOptions: {
        config: windowConfig.recipeConfig,
      },
    };
  }

  if (viewFromUrl) {
    return {
      view: viewFromUrl as View,
      viewOptions: {},
    };
  }

  return {
    view: 'loading',
    viewOptions: {},
  };
};

export default function App() {
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string>('');
  const [extensionConfirmLabel, setExtensionConfirmLabel] = useState<string>('');
  const [extensionConfirmTitle, setExtensionConfirmTitle] = useState<string>('');
  const [{ view, viewOptions }, setInternalView] = useState<ViewConfig>(getInitialView());

  const { getExtensions, addExtension, read } = useConfig();
  const initAttemptedRef = useRef(false);

  function extractCommand(link: string): string {
    const url = new URL(link);
    const cmd = url.searchParams.get('cmd') || 'Unknown Command';
    const args = url.searchParams.getAll('arg').map(decodeURIComponent);
    return `${cmd} ${args.join(' ')}`.trim();
  }

  function extractRemoteUrl(link: string): string | null {
    const url = new URL(link);
    return url.searchParams.get('url');
  }

  const setView = (view: View, viewOptions: ViewOptions = {}) => {
    console.log(`Setting view to: ${view}`, viewOptions);
    setInternalView({ view, viewOptions });
  };

  useEffect(() => {
    if (initAttemptedRef.current) {
      console.log('Initialization already attempted, skipping...');
      return;
    }
    initAttemptedRef.current = true;

    console.log(`Initializing app with settings v2`);

    const urlParams = new URLSearchParams(window.location.search);
    const viewType = urlParams.get('view');
    const recipeConfig = window.appConfig.get('recipeConfig');

    if (viewType) {
      if (viewType === 'recipeEditor' && recipeConfig) {
        console.log('Setting view to recipeEditor with config:', recipeConfig);
        setView('recipeEditor', { config: recipeConfig });
      } else {
        setView(viewType as View);
      }
      return;
    }

    const initializeApp = async () => {
      try {
        await initConfig();
        try {
          await readAllConfig({ throwOnError: true });
        } catch (error) {
          const configVersion = localStorage.getItem('configVersion');
          const shouldMigrateExtensions = !configVersion || parseInt(configVersion, 10) < 3;
          if (shouldMigrateExtensions) {
            await backupConfig({ throwOnError: true });
            await initConfig();
          } else {
            throw new Error('Unable to read config file, it may be malformed');
          }
        }

        if (recipeConfig === null) {
          setFatalError('Cannot read recipe config. Please check the deeplink and try again.');
          return;
        }

        const config = window.electron.getConfig();
        const provider = (await read('GOOSE_PROVIDER', false)) ?? config.GOOSE_DEFAULT_PROVIDER;
        const model = (await read('GOOSE_MODEL', false)) ?? config.GOOSE_DEFAULT_MODEL;

        if (provider && model) {
          setView('chat');
          try {
            await initializeSystem(provider, model, {
              getExtensions,
              addExtension,
            });
          } catch (error) {
            console.error('Error in initialization:', error);
            if (error instanceof MalformedConfigError) {
              throw error;
            }
            setView('welcome');
          }
        } else {
          console.log('Missing required configuration, showing onboarding');
          setView('welcome');
        }
      } catch (error) {
        setFatalError(
          `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        setView('welcome');
      }
      toastService.configure({ silent: false });
    };

    (async () => {
      try {
        await initializeApp();
        setAppInitialized(true);
      } catch (error) {
        console.error('Unhandled error in initialization:', error);
        setFatalError(`${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })();
  }, [read, getExtensions, addExtension]);

  const [isGoosehintsModalOpen, setIsGoosehintsModalOpen] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [sharedSessionError, setSharedSessionError] = useState<string | null>(null);
  const [isLoadingSharedSession, setIsLoadingSharedSession] = useState(false);
  const { chat, setChat } = useChat({ setView, setIsLoadingSession });

  useEffect(() => {
    console.log('Sending reactReady signal to Electron');
    try {
      window.electron.reactReady();
    } catch (error) {
      console.error('Error sending reactReady:', error);
      setFatalError(
        `React ready notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, []);

  useEffect(() => {
    const handleOpenSharedSession = async (_event: IpcRendererEvent, link: string) => {
      window.electron.logInfo(`Opening shared session from deep link ${link}`);
      setIsLoadingSharedSession(true);
      setSharedSessionError(null);
      try {
        await openSharedSessionFromDeepLink(link, setView);
      } catch (error) {
        console.error('Unexpected error opening shared session:', error);
        setView('sessions');
      } finally {
        setIsLoadingSharedSession(false);
      }
    };
    window.electron.on('open-shared-session', handleOpenSharedSession);
    return () => {
      window.electron.off('open-shared-session', handleOpenSharedSession);
    };
  }, []);

  useEffect(() => {
    console.log('Setting up keyboard shortcuts');
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = window.electron.platform === 'darwin';
      if ((isMac ? event.metaKey : event.ctrlKey) && event.key === 'n') {
        event.preventDefault();
        try {
          const workingDir = window.appConfig.get('GOOSE_WORKING_DIR');
          console.log(`Creating new chat window with working dir: ${workingDir}`);
          window.electron.createChatWindow(undefined, workingDir as string);
        } catch (error) {
          console.error('Error creating new window:', error);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    console.log('Setting up fatal error handler');
    const handleFatalError = (_event: IpcRendererEvent, errorMessage: string) => {
      console.error('Encountered a fatal error: ', errorMessage);
      console.error('Current view:', view);
      console.error('Is loading session:', isLoadingSession);
      setFatalError(errorMessage);
    };
    window.electron.on('fatal-error', handleFatalError);
    return () => {
      window.electron.off('fatal-error', handleFatalError);
    };
  }, [view, isLoadingSession]);

  useEffect(() => {
    console.log('Setting up view change handler');
    const handleSetView = (_event: IpcRendererEvent, newView: View) => {
      console.log(`Received view change request to: ${newView}`);
      setView(newView);
    };
    const urlParams = new URLSearchParams(window.location.search);
    const viewFromUrl = urlParams.get('view');
    if (viewFromUrl) {
      const windowConfig = window.electron.getConfig();
      if (viewFromUrl === 'recipeEditor') {
        const initialViewOptions = {
          recipeConfig: windowConfig?.recipeConfig,
          view: viewFromUrl,
        };
        setView(viewFromUrl, initialViewOptions);
      } else {
        setView(viewFromUrl);
      }
    }
    window.electron.on('set-view', handleSetView);
    return () => window.electron.off('set-view', handleSetView);
  }, []);

  useEffect(() => {
    console.log(`View changed to: ${view}`);
    if (view !== 'chat' && view !== 'recipeEditor') {
      console.log('Not in chat view, clearing loading session state');
      setIsLoadingSession(false);
    }
  }, [view]);

  const config = window.electron.getConfig();
  const STRICT_ALLOWLIST = config.GOOSE_ALLOWLIST_WARNING === true ? false : true;

  useEffect(() => {
    console.log('Setting up extension handler');
    const handleAddExtension = async (_event: IpcRendererEvent, link: string) => {
      try {
        console.log(`Received add-extension event with link: ${link}`);
        const command = extractCommand(link);
        const remoteUrl = extractRemoteUrl(link);
        const extName = extractExtensionName(link);
        window.electron.logInfo(`Adding extension from deep link ${link}`);
        setPendingLink(link);
        let warningMessage = '';
        let label = 'OK';
        let title = 'Confirm Extension Installation';
        let isBlocked = false;
        let useDetailedMessage = false;
        if (remoteUrl) {
          useDetailedMessage = true;
        } else {
          try {
            const allowedCommands = await window.electron.getAllowedExtensions();
            if (allowedCommands && allowedCommands.length > 0) {
              const isCommandAllowed = allowedCommands.some((allowedCmd) =>
                command.startsWith(allowedCmd)
              );
              if (!isCommandAllowed) {
                useDetailedMessage = true;
                title = '⛔️ Untrusted Extension ⛔️';
                if (STRICT_ALLOWLIST) {
                  isBlocked = true;
                  label = 'Extension Blocked';
                  warningMessage =
                    '\n\n⛔️ BLOCKED: This extension command is not in the allowed list. ' +
                    'Installation is blocked by your administrator. ' +
                    'Please contact your administrator if you need this extension.';
                } else {
                  label = 'Override and install';
                  warningMessage =
                    '\n\n⚠️ WARNING: This extension command is not in the allowed list. ' +
                    'Installing extensions from untrusted sources may pose security risks. ' +
                    'Please contact an admin if you are unsure or want to allow this extension.';
                }
              }
            }
          } catch (error) {
            console.error('Error checking allowlist:', error);
          }
        }
        if (useDetailedMessage) {
          const detailedMessage = remoteUrl
            ? `You are about to install the ${extName} extension which connects to:\n\n${remoteUrl}\n\nThis extension will be able to access your conversations and provide additional functionality.`
            : `You are about to install the ${extName} extension which runs the command:\n\n${command}\n\nThis extension will be able to access your conversations and provide additional functionality.`;
          setModalMessage(`${detailedMessage}${warningMessage}`);
        } else {
          const messageDetails = `Command: ${command}`;
          setModalMessage(
            `Are you sure you want to install the ${extName} extension?\n\n${messageDetails}`
          );
        }
        setExtensionConfirmLabel(label);
        setExtensionConfirmTitle(title);
        if (isBlocked) {
          setPendingLink(null);
        }
        setModalVisible(true);
      } catch (error) {
        console.error('Error handling add-extension event:', error);
      }
    };
    window.electron.on('add-extension', handleAddExtension);
    return () => {
      window.electron.off('add-extension', handleAddExtension);
    };
  }, [STRICT_ALLOWLIST]);

  useEffect(() => {
    const handleFocusInput = (_event: IpcRendererEvent) => {
      const inputField = document.querySelector('input[type="text"], textarea') as HTMLInputElement;
      if (inputField) {
        inputField.focus();
      }
    };
    window.electron.on('focus-input', handleFocusInput);
    return () => {
      window.electron.off('focus-input', handleFocusInput);
    };
  }, []);

  const handleConfirm = async () => {
    if (pendingLink) {
      console.log(`Confirming installation of extension from: ${pendingLink}`);
      setModalVisible(false);
      try {
        await addExtensionFromDeepLinkV2(pendingLink, addExtension, setView);
        console.log('Extension installation successful');
      } catch (error) {
        console.error('Failed to add extension:', error);
      } finally {
        setPendingLink(null);
      }
    } else {
      console.log('Extension installation blocked by allowlist restrictions');
      setModalVisible(false);
    }
  };

  const handleCancel = () => {
    console.log('Cancelled extension installation.');
    setModalVisible(false);
    setPendingLink(null);
  };

  const [htmlResource, setHtmlResource] = useState<{
    uri: string;
    mimeType: string;
    text?: string;
    blob?: string;
  } | null>(null);
  const [htmlResourceKey, setHtmlResourceKey] = useState<number>(0); // Key to force re-render
  const [isManuallySelected, setIsManuallySelected] = useState(false); // Track if user manually selected a resource

  // State for split layout panel management
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

  // Handle panel width changes (now receives actual pixel values)
  const handlePanelWidthChange = useCallback((leftWidth: number, rightWidth: number) => {
    console.log(`Panel widths changed - Left: ${leftWidth}px, Right: ${rightWidth}px`);
  }, []);

  // Handle window resizing when right panel state changes
  useEffect(() => {
    const animateWindowResize = async (targetWidth: number, targetHeight: number) => {
      try {
        console.log('🔄 htmlResource changed:', htmlResource ? 'has content' : 'no content');
        console.log('🔄 Panel collapsed:', isRightPanelCollapsed);

        await window.electron.resizeWindow(targetWidth, targetHeight);
        console.log('✅ Window resize animation completed');
      } catch (error) {
        console.error('❌ Error resizing window:', error);
      }
    };

    // Determine target window size based on panel state
    if (htmlResource && !isRightPanelCollapsed) {
      // When expanded: left panel (800px) + right panel (800px) = 1600px total
      console.log('📏 Animating window expansion to 1600x800');
      animateWindowResize(1600, 800);
    } else {
      // When collapsed or no right panel: fixed 800px window (matches left panel width)
      console.log('📏 Animating window contraction to 800x800');
      animateWindowResize(800, 800);
    }
  }, [htmlResource, isRightPanelCollapsed]);

  // Handle panel collapse state change
  const handlePanelCollapseChange = useCallback((collapsed: boolean) => {
    setIsRightPanelCollapsed(collapsed);
    console.log(`Right panel ${collapsed ? 'collapsed' : 'expanded'}`);
  }, []);

  // Toggle function for the header button
  const toggleRightPanel = useCallback(() => {
    setIsRightPanelCollapsed((prev) => {
      const newCollapsed = !prev;
      console.log(`Right panel ${newCollapsed ? 'collapsed' : 'expanded'}`);
      return newCollapsed;
    });
  }, []);

  useEffect(() => {
    const handleRefreshRightPanel = (event: {
      detail?: { resource?: { uri: string; mimeType: string; text?: string; blob?: string } };
    }) => {
      console.log('🔄 Refresh right panel event received:', event.detail);
      // Force a refresh by updating the key
      setHtmlResourceKey((prev) => prev + 1);

      // Also ensure the right panel is expanded and visible
      if (event.detail?.resource) {
        setHtmlResource(event.detail.resource);
        setIsRightPanelCollapsed(false);
        setIsManuallySelected(true); // Mark as manually selected
      }
    };

    // @ts-expect-error - Custom event handler type mismatch with addEventListener
    window.addEventListener('refreshRightPanel', handleRefreshRightPanel);

    return () => {
      // @ts-expect-error - Custom event handler type mismatch with removeEventListener
      window.removeEventListener('refreshRightPanel', handleRefreshRightPanel);
    };
  }, []);

  useEffect(() => {
    // Only auto-update if user hasn't manually selected a resource
    if (chat?.messages && !isManuallySelected) {
      console.log('🔥 chat.messages', chat.messages);
      // Look for the latest tool response with HTML resource
      const latestHtmlResource = [...chat.messages].reverse().find((msg) => {
        if (msg.role === 'user' && Array.isArray(msg.content)) {
          return msg.content.some((contentItem) => {
            if (contentItem.type === 'toolResponse' && contentItem.toolResult?.value) {
              return contentItem.toolResult.value.some(
                (valueItem) =>
                  valueItem.type === 'resource' && valueItem.resource?.mimeType === 'text/html'
              );
            }
            return false;
          });
        }
        return false;
      });

      console.log('🔍 Latest HTML resource message found:', !!latestHtmlResource);

      if (latestHtmlResource && Array.isArray(latestHtmlResource.content)) {
        // Find the HTML resource in the content array
        for (const contentItem of latestHtmlResource.content) {
          if (contentItem.type === 'toolResponse' && contentItem.toolResult?.value) {
            for (const valueItem of contentItem.toolResult.value) {
              if (
                valueItem.type === 'resource' &&
                valueItem.resource?.mimeType === 'text/html' &&
                (valueItem.resource.text || valueItem.resource.blob)
              ) {
                // Store the full resource object
                console.log('📄 Found HTML resource:', valueItem.resource);
                setHtmlResource(valueItem.resource);
                return;
              }
            }
          }
        }
      }

      // If we get here, no HTML resource was found
      console.log('🚫 No HTML resource found, clearing state');
      setHtmlResource(null);
    }

    // Reset manual selection if there are no HTML resources available at all
    if (chat?.messages && isManuallySelected) {
      const hasAnyHtmlResource = chat.messages.some((msg) => {
        if (msg.role === 'user' && Array.isArray(msg.content)) {
          return msg.content.some((contentItem) => {
            if (contentItem.type === 'toolResponse' && contentItem.toolResult?.value) {
              return contentItem.toolResult.value.some(
                (valueItem) =>
                  valueItem.type === 'resource' && valueItem.resource?.mimeType === 'text/html'
              );
            }
            return false;
          });
        }
        return false;
      });

      if (!hasAnyHtmlResource) {
        console.log('🚫 No HTML resources available, resetting manual selection');
        setIsManuallySelected(false);
        setHtmlResource(null);
      }
    }
  }, [chat?.messages, isManuallySelected]);

  if (fatalError) {
    return <ErrorUI error={new Error(fatalError)} />;
  }

  if (isLoadingSession)
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-textStandard"></div>
      </div>
    );

  return (
    <>
      <ToastContainer
        aria-label="Toast notifications"
        toastClassName={() =>
          `relative min-h-16 mb-4 p-2 rounded-lg
           flex justify-between overflow-hidden cursor-pointer
           text-textProminentInverse bg-bgStandardInverse dark:bg-bgAppInverse
          `
        }
        style={{ width: '380px' }}
        className="mt-6"
        position="top-right"
        autoClose={3000}
        closeOnClick
        pauseOnHover
      />
      {modalVisible && (
        <ConfirmationModal
          isOpen={modalVisible}
          message={modalMessage}
          confirmLabel={extensionConfirmLabel}
          title={extensionConfirmTitle}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      <div className="relative w-screen h-screen overflow-hidden bg-bgApp flex flex-col">
        <div className="titlebar-drag-region" />
        <div>
          {view === 'loading' && <SuspenseLoader />}
          {view === 'welcome' && (
            <ProviderSettings onClose={() => setView('chat')} isOnboarding={true} />
          )}
          {view === 'settings' && (
            <SettingsViewV2
              onClose={() => {
                setView('chat');
              }}
              setView={setView}
              viewOptions={viewOptions as SettingsViewOptions}
            />
          )}
          {view === 'moreModels' && (
            <MoreModelsView
              onClose={() => {
                setView('settings');
              }}
              setView={setView}
            />
          )}
          {view === 'configureProviders' && (
            <ConfigureProvidersView
              onClose={() => {
                setView('settings');
              }}
            />
          )}
          {view === 'ConfigureProviders' && (
            <ProviderSettings onClose={() => setView('chat')} isOnboarding={false} />
          )}
          {view === 'chat' && !isLoadingSession && (
            <SplitLayout
              leftPanel={
                <ChatView
                  readyForAutoUserPrompt={appInitialized}
                  chat={chat}
                  setChat={setChat}
                  setView={setView}
                  setIsGoosehintsModalOpen={setIsGoosehintsModalOpen}
                  hasRightPanel={!!htmlResource}
                  isRightPanelCollapsed={isRightPanelCollapsed}
                  onToggleRightPanel={toggleRightPanel}
                />
              }
              rightPanel={
                htmlResource ? (
                  <HtmlResource
                    key={htmlResourceKey} // Force re-render when key changes
                    resource={htmlResource}
                    onUiAction={async (tool: string, params: Record<string, unknown>) => {
                      console.log(`UI Action received - Tool: ${tool}, Params:`, params);
                      return {
                        status: 'Action handled by host application',
                        receivedParams: params,
                      };
                    }}
                    style={{
                      height: '100%',
                    }}
                  />
                ) : undefined
              }
              onWidthChange={handlePanelWidthChange}
              onCollapseChange={handlePanelCollapseChange}
              isCollapsed={isRightPanelCollapsed}
            />
          )}
          {view === 'sessions' && <SessionsView setView={setView} />}
          {view === 'schedules' && <SchedulesView onClose={() => setView('chat')} />}
          {view === 'sharedSession' && (
            <SharedSessionView
              session={viewOptions?.sessionDetails}
              isLoading={isLoadingSharedSession}
              error={viewOptions?.error || sharedSessionError}
              onBack={() => setView('sessions')}
              onRetry={async () => {
                if (viewOptions?.shareToken && viewOptions?.baseUrl) {
                  setIsLoadingSharedSession(true);
                  try {
                    await openSharedSessionFromDeepLink(
                      `goose://sessions/${viewOptions.shareToken}`,
                      setView,
                      viewOptions.baseUrl
                    );
                  } catch (error) {
                    console.error('Failed to retry loading shared session:', error);
                  } finally {
                    setIsLoadingSharedSession(false);
                  }
                }
              }}
            />
          )}
          {view === 'recipeEditor' && (
            <RecipeEditor
              config={viewOptions?.config || window.electron.getConfig().recipeConfig}
            />
          )}
          {view === 'permission' && (
            <PermissionSettingsView
              onClose={() => setView((viewOptions as { parentView: View }).parentView)}
            />
          )}
        </div>
      </div>
      {isGoosehintsModalOpen && (
        <GoosehintsModal
          directory={window.appConfig.get('GOOSE_WORKING_DIR') as string}
          setIsGoosehintsModalOpen={setIsGoosehintsModalOpen}
        />
      )}
    </>
  );
}

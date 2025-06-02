import { useState } from 'react';
import MoreMenu from './MoreMenu';
import type { View, ViewOptions } from '../../App';
import { Document } from '../icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';

export default function MoreMenuLayout({
  hasMessages,
  showMenu = true,
  setView,
  setIsGoosehintsModalOpen,
  // Panel collapse props
  hasRightPanel,
  isRightPanelCollapsed,
  onToggleRightPanel,
  // Auto button props
  hasManualSelection,
  onResetToAuto,
}: {
  hasMessages?: boolean;
  showMenu?: boolean;
  setView?: (view: View, viewOptions?: ViewOptions) => void;
  setIsGoosehintsModalOpen?: (isOpen: boolean) => void;
  // Panel collapse props
  hasRightPanel?: boolean;
  isRightPanelCollapsed?: boolean;
  onToggleRightPanel?: () => void;
  // Auto button props
  hasManualSelection?: boolean;
  onResetToAuto?: () => void;
}) {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  // Assume macOS if not explicitly set
  const safeIsMacOS = (window?.electron?.platform || 'darwin') === 'darwin';

  return (
    <div
      className="relative flex items-center h-14 border-b border-borderSubtle w-full"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {showMenu && (
        <div
          className={`flex items-center justify-between w-full h-full ${safeIsMacOS ? 'pl-[86px]' : 'pl-[8px]'} pr-4`}
        >
          <TooltipProvider>
            <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
              <TooltipTrigger asChild>
                <button
                  className="z-[100] no-drag hover:cursor-pointer border border-borderSubtle hover:border-borderStandard rounded-lg p-2 pr-3 text-textSubtle hover:text-textStandard text-sm flex items-center transition-colors [&>svg]:size-4 "
                  onClick={async () => {
                    if (hasMessages) {
                      window.electron.directoryChooser();
                    } else {
                      window.electron.directoryChooser(true);
                    }
                  }}
                >
                  <Document className="mr-1" />
                  <div className="max-w-[200px] truncate [direction:rtl]">
                    {window.appConfig.get('GOOSE_WORKING_DIR')}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-96 overflow-auto scrollbar-thin" side="top">
                {window.appConfig.get('GOOSE_WORKING_DIR') as string}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-2">
            <MoreMenu setView={setView} setIsGoosehintsModalOpen={setIsGoosehintsModalOpen} />

            {/* Auto Button - only show when user has manually selected a resource */}
            {hasRightPanel && hasManualSelection && onResetToAuto && (
              <button
                onClick={onResetToAuto}
                className="z-[100] px-2 h-7 rounded-full border border-borderSubtle transition-colors cursor-pointer no-drag hover:text-textStandard hover:border-borderStandard text-textSubtle text-xs font-medium flex items-center justify-center"
                title="Reset to auto mode - show latest HTML resource automatically"
                role="button"
              >
                Auto
              </button>
            )}

            {/* Panel Collapse/Expand Button */}
            {hasRightPanel && onToggleRightPanel && (
              <button
                onClick={onToggleRightPanel}
                className="z-[100] w-7 h-7 p-1 rounded-full border border-borderSubtle transition-colors cursor-pointer no-drag hover:text-textStandard hover:border-borderStandard text-textSubtle flex items-center justify-center"
                title={isRightPanelCollapsed ? 'Show side panel' : 'Hide side panel'}
                role="button"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className={`transition-transform duration-200 ${
                    isRightPanelCollapsed ? 'rotate-180' : ''
                  }`}
                >
                  <path
                    d="M8.5 3.5L5.5 7L8.5 10.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

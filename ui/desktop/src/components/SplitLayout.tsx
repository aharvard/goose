import React, { ReactNode, useState, useRef, useCallback, useEffect } from 'react';

interface SplitLayoutProps {
  leftPanel: ReactNode;
  rightPanel?: ReactNode;
  onWidthChange?: (leftWidth: number, rightWidth: number) => void;
  onCollapseChange?: (collapsed: boolean) => void;
  // External collapse state
  isCollapsed?: boolean;
}

const SplitLayout: React.FC<SplitLayoutProps> = ({
  leftPanel,
  rightPanel,
  onWidthChange,
  onCollapseChange,
  isCollapsed = false,
}) => {
  const hasRightPanel = !!rightPanel;
  const [leftPanelRatio, setLeftPanelRatio] = useState(0.5); // 50/50 split when both panels visible
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false); // Track window resizing
  const splitPaneRef = useRef<HTMLDivElement>(null);

  // Use external collapse state
  const isRightPanelCollapsed = isCollapsed;

  // Reset collapsed state when rightPanel becomes available/unavailable
  useEffect(() => {
    if (!hasRightPanel) {
      onCollapseChange?.(false);
    }
  }, [hasRightPanel, onCollapseChange]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!hasRightPanel || isRightPanelCollapsed) return;

      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        if (!splitPaneRef.current) return;

        const rect = splitPaneRef.current.getBoundingClientRect();
        const newRatio = (e.clientX - rect.left) / rect.width;

        // Constrain between 0.2 and 0.8 (20% and 80%)
        const constrainedRatio = Math.min(Math.max(newRatio, 0.2), 0.8);
        setLeftPanelRatio(constrainedRatio);

        // Calculate actual pixel widths based on target window size (1600px when expanded)
        const targetWindowWidth = 1600;
        const leftWidth = targetWindowWidth * constrainedRatio;
        const rightWidth = targetWindowWidth * (1 - constrainedRatio);

        // Call callback if provided
        if (onWidthChange) {
          onWidthChange(leftWidth, rightWidth);
        }
      };

      const handleMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('selectstart', preventSelection);
        document.body.style.userSelect = '';
      };

      const preventSelection = (e: globalThis.Event) => {
        e.preventDefault();
      };

      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.addEventListener('selectstart', preventSelection);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [hasRightPanel, isRightPanelCollapsed, onWidthChange]
  );

  // Calculate target window size and panel widths based on panel state
  const getTargetSizes = useCallback(() => {
    if (!hasRightPanel || isRightPanelCollapsed) {
      // When collapsed, window should be 800px and left panel fills it
      return {
        targetWindowWidth: 800,
        leftPanelWidth: 800,
        rightPanelWidth: 0,
        leftWidthPercent: 100,
        rightWidthPercent: 0,
      };
    } else {
      // When expanded, window should be 1600px (2x), panels split by ratio
      const targetWindowWidth = 1600;
      const leftPanelWidth = targetWindowWidth * leftPanelRatio;
      const rightPanelWidth = targetWindowWidth * (1 - leftPanelRatio);

      return {
        targetWindowWidth,
        leftPanelWidth,
        rightPanelWidth,
        leftWidthPercent: leftPanelRatio * 100,
        rightWidthPercent: (1 - leftPanelRatio) * 100,
      };
    }
  }, [hasRightPanel, isRightPanelCollapsed, leftPanelRatio]);

  const targetSizes = getTargetSizes();
  const leftWidthStyle = `${targetSizes.leftWidthPercent}%`;
  const rightWidthStyle = `${targetSizes.rightWidthPercent}%`;

  // Notify parent of width changes when collapse state changes
  useEffect(() => {
    if (hasRightPanel && onWidthChange) {
      const sizes = getTargetSizes();
      onWidthChange(sizes.leftPanelWidth, sizes.rightPanelWidth);
    }
  }, [isRightPanelCollapsed, hasRightPanel, leftPanelRatio, onWidthChange, getTargetSizes]);

  // Listen for window resize events to update width calculations in real-time
  useEffect(() => {
    if (!hasRightPanel || !onWidthChange) return;

    let resizeTimeout: number;

    const handleResize = () => {
      setIsResizing(true);

      // Always report target sizes based on panel state, not container measurements
      const sizes = getTargetSizes();
      onWidthChange(sizes.leftPanelWidth, sizes.rightPanelWidth);

      // Reset resizing state after resize stops
      window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        setIsResizing(false);
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.clearTimeout(resizeTimeout);
    };
  }, [hasRightPanel, isRightPanelCollapsed, leftPanelRatio, onWidthChange, getTargetSizes]);

  return (
    <div ref={splitPaneRef} className="flex h-full w-full relative">
      {/* Left Panel */}
      <div
        className={`h-full overflow-auto border-r border-borderStandard ${
          isDragging || isResizing
            ? 'pointer-events-none'
            : 'transition-all duration-300 ease-in-out'
        }`}
        style={{ width: leftWidthStyle }}
      >
        {leftPanel}
      </div>

      {/* Resize Handle - only show when right panel exists and is not collapsed */}
      {hasRightPanel && !isRightPanelCollapsed && (
        <div
          className={`relative flex items-center justify-center w-1 bg-borderStandard hover:bg-borderProminent cursor-col-resize transition-colors duration-150 z-10 ${
            isDragging ? 'bg-borderProminent' : ''
          }`}
          onMouseDown={handleMouseDown}
        >
          {/* Visual indicator for the handle */}
          <div className="absolute inset-y-0 w-1 flex items-center justify-center">
            <div className="w-0.5 h-8 bg-textSubtle rounded-full opacity-50 hover:opacity-100 transition-opacity duration-150" />
          </div>

          {/* Invisible wider hit area for easier grabbing */}
          <div className="absolute inset-y-0 -left-1 -right-1 w-3" />
        </div>
      )}

      {/* Right Panel */}
      {hasRightPanel && (
        <div
          className={`h-full overflow-auto relative ${
            isDragging || isResizing
              ? 'pointer-events-none'
              : 'transition-all duration-300 ease-in-out'
          }`}
          style={{
            width: rightWidthStyle,
            opacity: isRightPanelCollapsed ? 0 : 1,
            visibility: isRightPanelCollapsed ? 'hidden' : 'visible',
          }}
        >
          {rightPanel}
        </div>
      )}

      {/* Global drag overlay to capture mouse events during drag */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize" style={{ pointerEvents: 'auto' }} />
      )}
    </div>
  );
};

export default SplitLayout;

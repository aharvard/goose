import React, { ReactNode } from 'react';

interface SplitLayoutProps {
  leftPanel: ReactNode;
  rightPanel?: ReactNode;
}

const SplitLayout: React.FC<SplitLayoutProps> = ({ leftPanel, rightPanel }) => {
  const hasRightPanel = !!rightPanel;

  return (
    <div className="flex h-full w-full">
      <div
        className={`h-full overflow-auto transition-all duration-300 ease-in-out ${
          hasRightPanel ? 'w-1/2 border-r border-borderStandard' : 'w-full'
        }`}
      >
        {leftPanel}
      </div>
      <div
        className={`h-full overflow-auto transition-all duration-300 ease-in-out ${
          hasRightPanel ? 'w-1/2 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        {hasRightPanel && rightPanel}
      </div>
    </div>
  );
};

export default SplitLayout;

import React, { ReactNode } from 'react';

interface SplitLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
}

const SplitLayout: React.FC<SplitLayoutProps> = ({ leftPanel, rightPanel }) => {
  return (
    <div className="flex h-full w-full">
      <div className="w-1/2 h-full overflow-auto border-r border-borderStandard">{leftPanel}</div>
      <div className="w-1/2 h-full overflow-auto">{rightPanel}</div>
    </div>
  );
};

export default SplitLayout;

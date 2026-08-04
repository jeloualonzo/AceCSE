import React from 'react';

interface AppCanvasProps {
  title: string;
  description?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  children: React.ReactNode;
}

export const AppCanvas: React.FC<AppCanvasProps> = ({
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}) => {
  return (
    <main className="flex-1 bg-slate-50/60 min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-10">
        
        {/* Page Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </h1>
          </div>

          {/* Page Actions Slot */}
          {(primaryAction || secondaryAction) && (
            <div className="flex items-center gap-3 shrink-0 pt-1 sm:pt-0">
              {secondaryAction}
              {primaryAction}
            </div>
          )}
        </div>

        {/* Page Main Content */}
        <div>{children}</div>
      </div>
    </main>
  );
};

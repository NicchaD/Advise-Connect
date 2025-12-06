import React from 'react';
import { AppHeader } from './AppHeader';
import { TooltipProvider } from '@/components/ui/tooltip';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
};
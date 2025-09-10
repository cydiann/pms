import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TabContextType {
  readonly activeTab: string;
  readonly setActiveTab: (tab: string) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export function useTab(): TabContextType {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTab must be used within a TabProvider');
  }
  return context;
};

interface TabProviderProps {
  readonly children: ReactNode;
}

export function TabProvider({ children }: TabProviderProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <TabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabContext.Provider>
  );
}

export type { TabContextType, TabProviderProps };
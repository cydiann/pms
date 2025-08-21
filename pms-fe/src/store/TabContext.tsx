import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TabContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export const useTab = (): TabContextType => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTab must be used within a TabProvider');
  }
  return context;
};

interface TabProviderProps {
  children: ReactNode;
}

export const TabProvider: React.FC<TabProviderProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <TabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabContext.Provider>
  );
};
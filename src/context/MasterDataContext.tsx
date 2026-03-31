'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { classService, sectionService, branchService } from '../services/firebase/masterDataService';
import { ClassMaster, SectionMaster, BranchMaster } from '../types/masterData';

interface MasterDataContextType {
  classes: ClassMaster[];
  sections: SectionMaster[];
  branches: BranchMaster[];
  isLoading: boolean;
  refreshMasters: () => Promise<void>;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<ClassMaster[]>([]);
  const [sections, setSections] = useState<SectionMaster[]>([]);
  const [branches, setBranches] = useState<BranchMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMasters = async () => {
    setIsLoading(true);
    try {
      const [classesData, sectionsData, branchesData] = await Promise.all([
        classService.getClasses(),
        sectionService.getSections(),
        branchService.getBranches(),
      ]);
      console.log('Classes:', classesData);
      console.log('Sections:', sectionsData);
      console.log('Branches:', branchesData);
      setClasses(classesData);
      setSections(sectionsData);
      setBranches(branchesData);
    } catch (error) {
      console.error('Error fetching master data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMasters();
    console.log('fetchMasters called')
  }, []);

  return (
    <MasterDataContext.Provider value={{
      classes,
      sections,
      branches,
      isLoading,
      refreshMasters: fetchMasters
    }}>
      {children}
    </MasterDataContext.Provider>
  );
}

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
}

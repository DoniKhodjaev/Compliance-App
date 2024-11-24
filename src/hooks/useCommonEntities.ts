import { useState, useEffect } from 'react';
import type { CommonEntity } from '../types';

const STORAGE_KEY = 'common_entities';

export function useCommonEntities() {
  const [entities, setEntities] = useState<CommonEntity[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entities));
  }, [entities]);

  const addEntity = (entity: Omit<CommonEntity, 'id' | 'lastChecked'>) => {
    const newEntity: CommonEntity = {
      ...entity,
      id: crypto.randomUUID(),
      lastChecked: new Date().toISOString()
    };
    setEntities(prev => [...prev, newEntity]);
  };

  const deleteEntity = (id: string) => {
    setEntities(prev => prev.filter(entity => entity.id !== id));
  };

  const updateEntity = (id: string, updates: Partial<CommonEntity>) => {
    setEntities(prev => 
      prev.map(entity => 
        entity.id === id ? { ...entity, ...updates } : entity
      )
    );
  };

  return {
    entities,
    addEntity,
    deleteEntity,
    updateEntity
  };
} 
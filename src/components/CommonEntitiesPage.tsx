import { useState } from 'react';
import { CommonEntitiesManager } from './CommonEntitiesManager';
import { CommonEntityDetailsModal } from './CommonEntityDetailsModal';
import { CommonEntityDeleteModal } from './CommonEntityDeleteModal';
import { OfacChecker } from '../utils/ofacChecker';
import type { CommonEntity } from '../types';
import { toast } from 'react-hot-toast';

interface CommonEntitiesPageProps {
  entities: CommonEntity[];
  onDeleteEntity: (id: string) => void;
  onUpdateEntity: (id: string, updates: Partial<CommonEntity>) => void;
}

export function CommonEntitiesPage({
  entities,
  onDeleteEntity,
  onUpdateEntity,
}: CommonEntitiesPageProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<CommonEntity | null>(null);
  const [entityToDelete, setEntityToDelete] = useState<CommonEntity | null>(null);

  const handleCheckSelected = async (selectedEntities: CommonEntity[]) => {
    setIsChecking(true);
    try {
      await OfacChecker.initialize();
      
      for (const entity of selectedEntities) {
        // Check entity name
        const nameResult = await OfacChecker.checkName(entity.name);
        
        // Determine status based on match score
        let newStatus: CommonEntity['status'] = 'clean';
        if (nameResult.matchScore === 1) {
          newStatus = 'flagged';
        } else if (nameResult.matchScore >= 0.85) {
          newStatus = 'needs_review';
        }

        // Update entity status
        await onUpdateEntity(entity.id, {
          lastChecked: new Date().toISOString(),
          status: newStatus
        });
      }

      toast.success(`Successfully checked ${selectedEntities.length} entities`, {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#008766',
          color: '#fff',
          borderRadius: '8px',
        },
      });
    } catch (error) {
      console.error("Error checking selected entities:", error);
      toast.error('Failed to check selected entities', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: '#fff',
          borderRadius: '8px',
        },
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleDeleteEntity = (id: string) => {
    const entity = entities.find(e => e.id === id);
    if (entity) {
      setEntityToDelete(entity);
    }
  };

  const handleEditEntity = (entity: CommonEntity) => {
    setSelectedEntity(entity);
  };

  const handleAddEntity = (entity: Omit<CommonEntity, 'id'>) => {
    // Generate a new ID and add the entity
    const newEntity: CommonEntity = {
      ...entity,
      id: crypto.randomUUID(),
    };
    onUpdateEntity(newEntity.id, newEntity);
    toast.success('Entity added successfully', {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#008766',
        color: '#fff',
        borderRadius: '8px',
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <CommonEntitiesManager
        entities={entities}
        onDeleteEntity={handleDeleteEntity}
        isChecking={isChecking}
        onCheckSelected={handleCheckSelected}
        onEditEntity={handleEditEntity}
        onAddEntity={handleAddEntity}
      />

      {selectedEntity && (
        <CommonEntityDetailsModal
          entity={selectedEntity}
          isOpen={!!selectedEntity}
          onClose={() => setSelectedEntity(null)}
          onSave={(updates) => {
            onUpdateEntity(selectedEntity.id, updates);
            setSelectedEntity(null);
            toast.success('Entity updated successfully', {
              duration: 3000,
              position: 'top-right',
              style: {
                background: '#008766',
                color: '#fff',
                borderRadius: '8px',
              },
            });
          }}
        />
      )}

      {entityToDelete && (
        <CommonEntityDeleteModal
          entity={entityToDelete}
          isOpen={!!entityToDelete}
          onClose={() => setEntityToDelete(null)}
          onConfirm={() => {
            onDeleteEntity(entityToDelete.id);
            setEntityToDelete(null);
            toast.success('Entity deleted successfully', {
              duration: 3000,
              position: 'top-right',
              style: {
                background: '#008766',
                color: '#fff',
                borderRadius: '8px',
              },
            });
          }}
        />
      )}
    </div>
  );
} 
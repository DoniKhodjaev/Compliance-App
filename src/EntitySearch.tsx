import { toast } from 'react-hot-toast';  // Make sure this is imported

const handleAddToCommonEntities = (entityData: any) => {
  try {
    // Check for duplicates
    const isDuplicate = existingEntities.some(
      existingEntity => 
        existingEntity.name.toLowerCase() === entityData.name.toLowerCase() ||
        (entityData.inn && existingEntity.inn === entityData.inn)
    );

    if (isDuplicate) {
      toast.error('This entity already exists in Common Entities', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: '#fff',
          borderRadius: '8px',
        },
      });
      return;
    }

    const newEntity: Omit<CommonEntity, 'id'> = {
      name: entityData.name,
      inn: entityData.inn || '',
      source: entityData.inn ? 'egrul' : 'orginfo',
      CEO: entityData.CEO || '',
      Founders: entityData.Founders || [],
      status: 'clean',
      lastChecked: new Date().toISOString(),
      notes: ''
    };
    
    onAddToCommonEntities(newEntity);
    
    toast.success(`${entityData.name} has been added to Common Entities`, {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#008766',
        color: '#fff',
        borderRadius: '8px',
      },
    });
  } catch (error) {
    console.error("Error adding entity:", error);
    toast.error('Failed to add entity. Please try again.', {
      duration: 4000,
      position: 'top-right',
      style: {
        background: '#ef4444',
        color: '#fff',
        borderRadius: '8px',
      },
    });
  }
}; 
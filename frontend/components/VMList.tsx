// frontend/components/VMList.tsx
// Ubicación: gcp-vm-dashboard/frontend/components/VMList.tsx

import React from 'react';
import { VirtualMachine } from '../types'; // Importación relativa desde frontend/types.ts
import { VMCard } from './VMCard'; // Importación relativa desde frontend/components/VMCard.tsx

interface VMListProps {
  vms: VirtualMachine[];
  onStartVM: (vmId: string) => void;
  onStopVM: (vmId:string) => void;
  onConnectVM: (vm: VirtualMachine) => void;
  onCopyToClipboard: (text: string, type: string) => void;
  projectId: string; 
}

export const VMList: React.FC<VMListProps> = ({ vms, onStartVM, onStopVM, onConnectVM, onCopyToClipboard, projectId }) => {
  if (vms.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-gray-500">No virtual machines to display.</p>
        <p className="text-gray-400">Try adjusting your filters or refreshing the list.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vms.map(vm => (
        <VMCard 
            key={vm.id} 
            vm={vm} 
            onStartVM={() => onStartVM(vm.id)}   
            onStopVM={() => onStopVM(vm.id)}     
            onConnectVM={onConnectVM}            
            onCopyToClipboard={onCopyToClipboard}
            projectId={projectId} 
        />
      ))}
    </div>
  );
};
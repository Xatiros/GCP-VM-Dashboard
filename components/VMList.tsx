
import React from 'react';
import { VirtualMachine } from '../types';
import { VMCard } from './VMCard';

interface VMListProps {
  vms: VirtualMachine[];
  onStartVM: (vmId: string) => void;
  onStopVM: (vmId:string) => void;
  onConnectVM: (vm: VirtualMachine) => void;
  onCopyToClipboard: (text: string, type: string) => void;
}

export const VMList: React.FC<VMListProps> = ({ vms, onStartVM, onStopVM, onConnectVM, onCopyToClipboard }) => {
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
            onStart={() => onStartVM(vm.id)}
            onStop={() => onStopVM(vm.id)}
            onConnect={() => onConnectVM(vm)}
            onCopyToClipboard={onCopyToClipboard}
        />
      ))}
    </div>
  );
};

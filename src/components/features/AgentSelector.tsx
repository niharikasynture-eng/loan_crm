'use client';

import * as React from 'react';
import { IUser } from '@/models/User';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import { Check } from 'lucide-react';

interface AgentSelectorProps {
  agents: IUser[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function AgentSelector({ agents, selectedId, onSelect }: AgentSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
      {agents.map((agent) => {
        const isSelected = selectedId === agent._id.toString();
        return (
          <button
            key={agent._id.toString()}
            type="button"
            onClick={() => onSelect(agent._id.toString())}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 group",
              isSelected
                ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
                : "border-gray-100 bg-white hover:border-brand-200 hover:bg-brand-50/30"
            )}
          >
            <div className="relative">
              <Avatar name={agent.name} size="md" />
              {isSelected && (
                <div className="absolute -top-1 -right-1 bg-brand-500 text-white rounded-full p-0.5 ring-2 ring-white">
                  <Check size={10} strokeWidth={4} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-bold truncate transition-colors",
                isSelected ? "text-brand-900" : "text-gray-900 group-hover:text-brand-700"
              )}>
                {agent.name}
              </p>
              <p className="text-xs font-medium text-gray-500 truncate uppercase tracking-tight">
                {agent.role.replace('_', ' ')}
              </p>
            </div>
          </button>
        );
      })}

      {agents.length === 0 && (
        <div className="col-span-full py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-sm font-medium text-gray-400">No available agents found</p>
        </div>
      )}
    </div>
  );
}

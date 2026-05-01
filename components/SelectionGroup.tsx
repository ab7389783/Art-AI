
import React from 'react';

export interface SelectionOption {
  id: string;
  label: string;
  badge?: string;
}

interface SelectionGroupProps {
  options: SelectionOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  colorTheme?: 'orange' | 'green' | 'blue';
}

export const SelectionGroup: React.FC<SelectionGroupProps> = ({
  options,
  selectedValue,
  onChange,
  colorTheme = 'orange'
}) => {
  const activeBorder = colorTheme === 'green' ? 'border-green-500' : 'border-orange-500';
  const activeBg = colorTheme === 'green' ? 'bg-green-500' : 'bg-orange-500';
  const activeText = colorTheme === 'green' ? 'text-green-200' : 'text-orange-200';
  const activeContainer = colorTheme === 'green' 
    ? 'bg-green-950/30 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
    : 'bg-orange-950/30 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.1)]';

  return (
    <div className="space-y-2">
      {options.map(option => (
        <label 
          key={option.id}
          className={`flex items-center justify-between p-2.5 rounded-sm border cursor-pointer transition-all ${
            selectedValue === option.id 
            ? activeContainer
            : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
              selectedValue === option.id ? activeBorder : 'border-zinc-600'
            }`}>
              {selectedValue === option.id && <div className={`w-1.5 h-1.5 rounded-full ${activeBg}`} />}
            </div>
            <span className={`text-xs ${selectedValue === option.id ? activeText : 'text-zinc-300'}`}>
              {option.label}
            </span>
          </div>
          <input 
            type="radio" 
            name="selection_group" // Generic name, assumes one group per context or managed by parent
            value={option.id}
            checked={selectedValue === option.id}
            onChange={() => onChange(option.id)}
            className="hidden"
          />
          {option.badge && (
            <span className="text-[9px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/50 font-mono tracking-tight">
              {option.badge}
            </span>
          )}
        </label>
      ))}
    </div>
  );
};

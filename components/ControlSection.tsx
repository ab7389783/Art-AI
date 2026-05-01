
import React from 'react';

interface ControlSectionProps {
  label: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  chips?: React.ReactNode;
  className?: string;
  isInputBox?: boolean;
  boxClassName?: string;
}

export const ControlSection: React.FC<ControlSectionProps> = ({
  label,
  children,
  headerAction,
  chips,
  className = "",
  isInputBox = false,
  boxClassName = "bg-zinc-950"
}) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex justify-between items-center min-h-[16px]">
        <label className="text-[11px] font-semibold text-zinc-400 select-none">{label}</label>
        {headerAction}
      </div>

      {isInputBox ? (
         <div className={`${boxClassName} border border-zinc-700 rounded-sm p-2 flex flex-col gap-2 focus-within:border-orange-500 transition-colors shadow-sm group/promptbox`}>
            {chips && (
                <div className="flex flex-wrap gap-1.5 select-none shrink-0">
                    {chips}
                </div>
            )}
            <div className="relative w-full flex-1 flex flex-col min-h-0">
               {children}
            </div>
         </div>
      ) : (
         <div className="relative flex-1 flex flex-col min-h-0">
            {children}
         </div>
      )}
    </div>
  );
};

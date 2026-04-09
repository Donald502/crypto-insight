import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface HelpTooltipProps {
  content: string;
  className?: string;
  mode?: 'hover' | 'click';
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ content, className, mode = 'hover' }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (mode === 'click') {
    return (
      <div className={cn("inline-block ml-2", className)}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-blue-400"
        >
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed italic bg-slate-900/30 p-2 rounded border border-slate-800/50">
                {content}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={cn("group relative inline-block ml-1.5 align-middle", className)}>
      <HelpCircle size={12} className="text-slate-600 group-hover:text-blue-400 transition-colors cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-slate-800 rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
        <p className="text-[10px] text-slate-300 leading-relaxed">
          {content}
        </p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800" />
      </div>
    </div>
  );
};

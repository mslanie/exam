import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="h-10 bg-[#FEFDED] border-t border-[#E2E0C8] px-4 md:px-8 flex items-center justify-between text-[11px] text-stone-500 shrink-0 select-none z-10 font-semibold">
      <p>&copy; 2026 Ms. Lanie English Quiz & Fill-in-the-Blank Arena</p>
      <div className="flex gap-4 uppercase font-bold tracking-wider text-[10px]">
        <span className="text-emerald-700 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Hex: #FEFDED Connected
        </span>
        <span className="hidden sm:inline text-stone-400">RGB: (254, 253, 237)</span>
      </div>
    </footer>
  );
};

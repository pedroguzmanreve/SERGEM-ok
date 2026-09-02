import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs animate-pulse">
      {/* Table Header Skeleton */}
      <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="h-4 bg-slate-200 rounded-md w-1/4"></div>
        <div className="h-4 bg-slate-200 rounded-md w-16"></div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100 p-4 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3 w-1/3">
              <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0"></div>
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 bg-slate-200 rounded w-4/5"></div>
                <div className="h-2.5 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-3 bg-slate-200 rounded w-20"></div>
            <div className="h-3 bg-slate-200 rounded w-24"></div>
            <div className="h-3 bg-slate-200 rounded w-16"></div>
            <div className="h-8 bg-slate-200 rounded-xl w-20"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-200 rounded-md w-1/3"></div>
        <div className="w-8 h-8 bg-slate-200 rounded-xl"></div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 rounded w-full"></div>
        <div className="h-3 bg-slate-200 rounded w-4/5"></div>
      </div>
      <div className="pt-2 flex items-center justify-between">
        <div className="h-6 bg-slate-200 rounded-lg w-20"></div>
        <div className="h-8 bg-slate-200 rounded-xl w-24"></div>
      </div>
    </div>
  );
};

export const MetricCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs animate-pulse flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
        <div className="h-6 bg-slate-200 rounded w-3/4"></div>
      </div>
      <div className="w-12 h-12 rounded-2xl bg-slate-200 shrink-0"></div>
    </div>
  );
};

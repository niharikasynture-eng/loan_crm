'use client';

import React from 'react';
import { WifiOff, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  function handleRetry() {
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-200/80 max-w-md w-full space-y-6">
        <div className="w-20 h-20 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center mx-auto text-rose-500 shadow-xs">
          <WifiOff size={40} />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">You're Offline</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Please check your internet connection. Some offline data may still be accessible once reconnected.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={handleRetry}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RefreshCw size={16} />
            <span>Retry Connection</span>
          </button>

          <Link
            href="/dashboard"
            className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all block"
          >
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

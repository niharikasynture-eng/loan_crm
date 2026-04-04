'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Phone, PhoneCall, PhoneForwarded, PhoneOff, Check, X } from 'lucide-react';

interface CallButtonProps {
  lead: {
    _id: string;
    name: string;
    phone: string;
  };
}

type Phase = 'idle' | 'calling';

export default function CallButton({ lead }: CallButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [callLogId, setCallLogId] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedTimer, setConnectedTimer] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);


  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (phase === 'calling') {
      interval = setInterval(() => {
        setTimer((t) => t + 1);
        if (isConnected) setConnectedTimer((c) => c + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase, isConnected]);


  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startCall = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post<{ callLogId: string, phone: string, leadName: string }>(`/calls/start/${lead._id}`, {});
      setCallLogId(res.callLogId);
      window.open(`tel:${lead.phone}`, '_self');
      setPhase('calling');
      setTimer(0);
      setIsConnected(false);
      setConnectedTimer(0);
    } catch (err: any) {
      alert(err.message || 'Failed to start call');
    } finally {
      setIsSubmitting(false);
    }
  };

  const endCall = async () => {
    setIsSubmitting(true);
    if (callLogId) {
      try {
        await api.post(`/calls/${callLogId}/save`, {
          duration: timer,
          connectedDuration: connectedTimer
        });
        
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
        window.location.reload();
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }
    resetState();
  };

  const redial = () => {
    window.open(`tel:${lead.phone}`, '_self');
  };

  const resetState = () => {
    setPhase('idle');
    setCallLogId(null);
    setTimer(0);
    setIsConnected(false);
    setConnectedTimer(0);
  };

  if (phase === 'idle') {
    return (
      <div className="w-full relative">
        <button
          onClick={startCall}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-green-50 hover:bg-green-100 border border-green-200 transition-all text-green-700 font-bold shadow-sm group"
        >
          <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-700 group-hover:scale-110 transition-transform">
            <Phone className="w-4 h-4 fill-green-700" />
          </div>
          Call {lead.name}
        </button>
        <p className="text-center text-xs font-semibold text-gray-400 mt-2 tracking-wide">{lead.phone}</p>
        
        {showToast && (
          <div className="absolute top-0 left-0 right-0 -mt-12 bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-lg text-center shadow-lg animate-fade-in flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Call logged successfully
          </div>
        )}
      </div>
    );
  }

  if (phase === 'calling') {
    return (
      <div className="w-full rounded-2xl border-2 border-green-500 bg-white p-5 animate-fade-in shadow-lg shadow-green-100">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-black text-green-600 uppercase tracking-widest">Call in progress</span>
        </div>
        
        <div className="bg-gray-50 rounded-xl p-4 text-center mb-4">
          <p className="text-lg font-bold text-gray-900">{lead.name}</p>
          <p className="text-sm font-medium text-gray-500">{lead.phone}</p>
          <p className="text-3xl font-black text-gray-900 mt-3 font-mono">{formatTime(timer)}</p>
        </div>
        
        <p className="text-xs text-center text-gray-500 mb-4 font-medium px-4">
          Your dialer has opened. Click End Call when you are done.
        </p>
        
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={redial}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors text-xs"
          >
            <PhoneForwarded className="w-4 h-4" />
            Redial
          </button>
          {!isConnected ? (
            <button
              onClick={() => setIsConnected(true)}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold transition-colors text-xs"
            >
              <PhoneCall className="w-4 h-4" />
              Connected
            </button>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold text-xs pointer-events-none">
              <span className="animate-pulse">Live:</span>
              <span className="font-mono">{formatTime(connectedTimer)}</span>
            </div>
          )}
          <button
            onClick={endCall}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors shadow-sm text-xs"
          >
            <PhoneOff className="w-4 h-4" />
            End Call
          </button>
        </div>
      </div>
    );
  }

  return null;
}

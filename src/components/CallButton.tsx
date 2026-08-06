'use client';

import { useState } from 'react';
import { Phone, Check, CheckSquare } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PostCallDispositionModal } from '@/components/features/PostCallDispositionModal';

interface CallButtonProps {
  lead: {
    _id: string;
    name: string;
    phone: string;
  };
  onCallLogged?: () => void;
}

export default function CallButton({ lead, onCallLogged }: CallButtonProps) {
  const [isDialing, setIsDialing] = useState(false);
  const [showDispositionModal, setShowDispositionModal] = useState(false);

  const handleClickCall = () => {
    setIsDialing(true);
    
    // Clean phone number for the dialer
    const cleanPhone = lead.phone.replace(/[^\d+]/g, '');
    
    // Notify server of call start for predictive matching
    api.post('/activities/call-start', { leadId: lead._id })
      .catch(err => console.error('Call capture error:', err));
    
    // Direct navigation is more reliable for mobile dialers
    window.location.href = `tel:${cleanPhone}`;
    
    // Automatically open the 1-Click Call Outcome modal after 3 seconds
    setTimeout(() => {
      setIsDialing(false);
      setShowDispositionModal(true);
    }, 3000);
  };

  return (
    <div className="w-full relative space-y-3">
      <button
        onClick={handleClickCall}
        className={`w-full flex items-center justify-center gap-3 p-5 rounded-[24px] transition-all text-white font-black shadow-lg group overflow-hidden relative ${
          isDialing 
            ? 'bg-emerald-600 shadow-emerald-200' 
            : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        {isDialing ? (
          <>
            <Check className="w-5 h-5 fill-white animate-bounce-in" />
            <span className="uppercase tracking-tighter text-lg">DIALING...</span>
          </>
        ) : (
          <>
            <Phone className="w-5 h-5 fill-white" />
            <span className="uppercase tracking-tighter text-lg">Call Lead Now</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => setShowDispositionModal(true)}
        className="w-full h-11 flex items-center justify-center gap-2 rounded-2xl bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-[0.98]"
      >
        <CheckSquare size={15} /> 1-Click Record Call Outcome
      </button>

      <p className="text-center text-[10px] font-black text-gray-400 mt-2 uppercase tracking-widest">
        {isDialing ? `Dialing ${lead.phone}...` : lead.phone}
      </p>
      
      {isDialing && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[11px] font-black px-6 py-3 rounded-2xl shadow-2xl animate-bounce-in flex items-center gap-3 z-50 uppercase tracking-widest">
          <Phone className="w-4 h-4 animate-pulse" /> Mobile Dialer Initiated
        </div>
      )}

      {/* 1-Click Post-Call Outcome Modal */}
      <PostCallDispositionModal
        isOpen={showDispositionModal}
        onClose={() => setShowDispositionModal(false)}
        lead={lead}
        onSuccess={() => {
          if (onCallLogged) onCallLogged();
        }}
      />
    </div>
  );
}

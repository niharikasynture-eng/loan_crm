'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';

interface CallButtonProps {
  lead: {
    _id: string;
    name: string;
    phone: string;
  };
}

const OUTCOMES = [
  { value: 'interested', label: '🟢 Interested', bg: '#dcfce7' },
  { value: 'meeting', label: '📅 Meeting', bg: '#f1f5f9' },
  { value: 'callback', label: '🔵 Call Back', bg: '#dbeafe' },
  { value: 'not-interested', label: '🔴 Not Interested', bg: '#fee2e2' },
  { value: 'no-answer', label: '⚫ No Answer', bg: '#f3f4f6' },
  { value: 'busy', label: '🟡 Busy', bg: '#fef9c3' },
  { value: 'wrong-number', label: '❌ Wrong Number', bg: '#ffedd5' },
];

export default function CallButton({ lead }: CallButtonProps) {
  const { user } = useAuth();
  const [calling, setCalling] = useState(false);
  const [callLogId, setCallLogId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleCall() {
    if (!lead.phone) return alert('No phone number for this lead');
    
    if (!user?.phone) {
      alert('Action Required: Please set your phone number in Settings > My Profile to use the 1-click calling feature.');
      return;
    }

    setCalling(true);
    try {
      const data = await api.post<{ callLogId: string }>(`/calls/initiate/${lead._id}`, {});
      setCallLogId(data.callLogId);
      
      // Wait 2 seconds then show modal as requested
      setTimeout(() => {
        setCalling(false);
        setShowModal(true);
      }, 2000);
    } catch (err: any) {
      if (err.message.includes('phone number in your profile')) {
        alert('Action Required: Please set your phone number in Settings > My Profile to use the 1-click calling feature.');
      } else {
        alert(err.message || 'Failed to initiate call');
      }
      setCalling(false);
    }
  }

  async function handleSaveOutcome() {
    if (!callLogId || !outcome) return;
    setSubmitting(true);
    try {
      await api.post(`/calls/${callLogId}/outcome`, {
        outcome,
        notes,
        nextFollowUpDate: nextFollowUpDate || null
      });
      setShowModal(false);
      resetModal();
      alert('Call outcome recorded');
    } catch (err: any) {
      alert(err.message || 'Failed to save outcome');
    } finally {
      setSubmitting(false);
    }
  }

  function resetModal() {
    setOutcome(null);
    setNotes('');
    setNextFollowUpDate('');
    setCallLogId(null);
  }

  return (
    <>
      <button
        onClick={handleCall}
        disabled={calling}
        className="w-full flex items-center justify-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500 transition-all text-emerald-400 font-bold shadow-lg shadow-emerald-500/10 mb-1"
      >
        <span className="text-xl">📞</span>
        <span>{calling ? 'Calling...' : `Call ${lead.name.split(' ')[0]} Now`}</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white">Log call with {lead.name}</h2>
              <p className="text-slate-400 text-sm mt-1">What was the outcome?</p>

              <div className="grid grid-cols-2 gap-3 mt-6">
                {OUTCOMES.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setOutcome(opt.value)}
                    style={{ backgroundColor: opt.bg }}
                    className={`flex items-center justify-center p-3 rounded-xl text-slate-800 font-semibold text-xs py-4 transition-all ${
                      outcome === opt.value ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-[#1e293b]' : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {(outcome === 'interested' || outcome === 'callback' || outcome === 'meeting') && (
                <div className="mt-6">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {outcome === 'meeting' ? 'Meeting Date & Time' : 'Next Follow-up Date'}
                  </label>
                  <input
                    type="datetime-local"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              )}

              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 300))}
                  placeholder="Add call notes (optional)"
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[100px] resize-none"
                />
                <div className="text-right text-[10px] text-slate-500 mt-1">{notes.length}/300</div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-[#334155] text-slate-400 hover:text-white hover:bg-[#0f172a] rounded-xl font-bold transition-all"
                >
                  Skip
                </button>
                <button
                  onClick={handleSaveOutcome}
                  disabled={!outcome || submitting}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20"
                >
                  {submitting ? 'Saving...' : 'Save Log'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

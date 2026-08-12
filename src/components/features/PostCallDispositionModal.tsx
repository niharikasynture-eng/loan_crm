'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/useToast';
import { Trophy, FileText, CheckCircle2, PhoneCall, XCircle, PhoneOff, Calendar, StickyNote } from 'lucide-react';

interface PostCallDispositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    _id: string;
    name: string;
    phone?: string;
  };
  onSuccess?: () => void;
}

const DISPOSITIONS = [
  {
    id: 'won',
    label: 'Closed / Won',
    stage: 'won',
    icon: Trophy,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
    iconBg: 'bg-emerald-500 text-white',
    desc: 'Customer agreed to book/buy',
  },
  {
    id: 'proposal',
    label: 'Send Proposal / Quote',
    stage: 'proposal',
    icon: FileText,
    color: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:border-sky-300',
    iconBg: 'bg-sky-500 text-white',
    desc: 'Customer requested pricing/brochure',
  },
  {
    id: 'qualified',
    label: 'Qualified / Interested',
    stage: 'qualified',
    icon: CheckCircle2,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300',
    iconBg: 'bg-indigo-500 text-white',
    desc: 'High interest, needs follow-up',
  },
  {
    id: 'contacted',
    label: 'Call Back Later',
    stage: 'contacted',
    icon: PhoneCall,
    color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300',
    iconBg: 'bg-amber-500 text-white',
    desc: 'Customer requested callback',
  },
  {
    id: 'lost',
    label: 'Not Interested / Lost',
    stage: 'lost',
    icon: XCircle,
    color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300',
    iconBg: 'bg-red-500 text-white',
    desc: 'Not interested or budget too low',
  },
  {
    id: 'no_answer',
    label: 'No Answer / Busy',
    stage: 'new',
    icon: PhoneOff,
    color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300',
    iconBg: 'bg-slate-500 text-white',
    desc: 'Call unanswered or line busy',
  },
];

export function PostCallDispositionModal({
  isOpen,
  onClose,
  lead,
  onSuccess,
}: PostCallDispositionModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedDisposition, setSelectedDisposition] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState('');
  const [followUpDate, setFollowUpDate] = React.useState('');

  const handleSelectDisposition = async (disp: typeof DISPOSITIONS[0]) => {
    setSelectedDisposition(disp.id);
    setSubmitting(true);

    try {
      // Calculate callback date: use specified followUpDate, or default to 24 hours from now for 'Call Back Later'
      let targetFollowUpDate: Date | null = followUpDate ? new Date(followUpDate) : null;
      if (disp.id === 'contacted' && !targetFollowUpDate) {
        targetFollowUpDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours default
      }

      // 1. Update lead status & pipeline stage
      await api.patch(`/leads/${lead._id}`, {
        status: disp.stage,
        pipelineStage: disp.stage,
        lastContactedAt: new Date(),
        isGhost: false,
      });

      // 2. Log call activity entry
      await api.post('/activities', {
        leadId: lead._id,
        type: 'call',
        outcome: disp.id,
        notes: notes ? `${disp.label}: ${notes}` : `Call outcome recorded: ${disp.label}`,
        status: disp.id === 'contacted' ? 'pending' : 'completed',
        completedAt: disp.id === 'contacted' ? undefined : new Date(),
        scheduledAt: disp.id === 'contacted' ? targetFollowUpDate : undefined,
      });

      // 3. Create follow-up task
      if (targetFollowUpDate) {
        await api.post('/tasks', {
          leadId: lead._id,
          title: `Follow up: Call Back — ${lead.name}`,
          dueDate: targetFollowUpDate,
          priority: disp.id === 'proposal' || disp.id === 'won' ? 'high' : 'medium',
          status: 'pending',
        });
      }

      const callbackNotice = disp.id === 'contacted'
        ? followUpDate
          ? ` (Reminder set for specified time)`
          : ` (Reminder set for 24 hrs from now)`
        : '';

      toast('success', `Call outcome saved: ${disp.label}${callbackNotice}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast('error', err.message || 'Failed to save call disposition');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📞 Post-Call Outcome (1-Click Disposition)"
      size="lg"
    >
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-50 to-sky-50 p-4 rounded-2xl border border-indigo-100/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Calling Client</p>
            <h3 className="text-lg font-bold text-slate-800">{lead.name}</h3>
          </div>
          <span className="px-3 py-1 bg-white border border-indigo-100 rounded-full text-xs font-mono font-bold text-indigo-600 shadow-sm">
            {lead.phone || 'Phone call'}
          </span>
        </div>

        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Select 1-Click Call Outcome:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {DISPOSITIONS.map((disp) => {
            const Icon = disp.icon;
            const isSelected = selectedDisposition === disp.id;
            return (
              <button
                key={disp.id}
                type="button"
                disabled={submitting}
                onClick={() => handleSelectDisposition(disp)}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group shadow-sm hover:shadow-md ${disp.color} ${
                  isSelected ? 'ring-2 ring-indigo-500 scale-[0.98]' : ''
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${disp.iconBg}`}>
                    <Icon size={18} />
                  </div>
                  <span className="font-bold text-sm tracking-tight leading-snug">{disp.label}</span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed font-medium pl-0.5">
                  {disp.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Optional Notes & Follow-up */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <StickyNote size={13} /> Call Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Requested 3BHK brochure on WhatsApp"
                className="w-full h-11 px-4 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-400 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <Calendar size={13} /> Follow-Up Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full h-11 px-4 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-400 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

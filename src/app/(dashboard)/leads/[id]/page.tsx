'use client';

import { useEffect, useState, use } from 'react';
import { api } from '@/lib/api-client';
import { Mail, Phone, Building, Briefcase, Calendar, CheckSquare, MessageSquare, X, Clock, ClipboardList, Send, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CallButton from '@/components/CallButton';
import CallHistory from '@/components/CallHistory';

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  source: string;
  createdAt: string;
  assignedTo?: { name: string; avatar?: string };
}

interface Activity {
  _id: string;
  type: string;
  notes: string;
  createdAt: string;
  createdBy: { name: string };
}

// React 19 requires `use(params)` to unwrap params
export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const leadId = unwrappedParams.id;
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'call' | 'note' | 'meeting' | 'task' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [noteText, setNoteText] = useState('');
  const [callData, setCallData] = useState({ duration: '', outcome: 'connected', notes: '', followUpDate: '' });
  const [meetingData, setMeetingData] = useState({ date: '', time: '', notes: '', link: '' });
  const [taskData, setTaskData] = useState({ title: '', dueDate: '', priority: 'medium' });

  async function loadData() {
    try {
      const [leadRes, actsRes] = await Promise.all([
        api.get<{ lead: Lead }>(`/leads/${leadId}`),
        api.get<{ activities: Activity[] }>(`/activities?leadId=${leadId}`),
      ]);
      setLead(leadRes.lead);
      setActivities(actsRes.activities);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [leadId]);

  const handleLogged = () => {
    setActiveModal(null);
    loadData();
    // Reset forms
    setNoteText('');
    setCallData({ duration: '', outcome: 'connected', notes: '', followUpDate: '' });
    setMeetingData({ date: '', time: '', notes: '', link: '' });
    setTaskData({ title: '', dueDate: '', priority: 'medium' });
  };

  async function logActivity(type: string, data: any) {
    setSubmitting(true);
    try {
      await api.post('/activities', {
        leadId,
        type,
        ...data
      });
      handleLogged();
    } catch (err) {
      alert('Failed to log activity');
    } finally {
      setSubmitting(false);
    }
  }

  async function createTask() {
    setSubmitting(true);
    try {
      // Create the task
      await api.post('/tasks', {
        leadId,
        title: taskData.title,
        dueDate: `${taskData.dueDate}T12:00:00Z`,
        priority: taskData.priority,
      });
      
      // Also log it as an activity
      await api.post('/activities', {
        leadId,
        type: 'note',
        notes: `Created follow-up task: ${taskData.title} (Due: ${taskData.dueDate})`
      });
      
      handleLogged();
    } catch (err) {
      alert('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 text-[#94a3b8]">Loading lead details...</div>;
  if (!lead) return <div className="p-8 text-red-400">Lead not found</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center gap-4 text-[#94a3b8] text-sm">
        <Link href="/leads" className="hover:text-white transition-colors">Leads</Link>
        <span>/</span>
        <span className="text-white">{lead.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Lead Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-2xl font-bold text-white mb-4 shadow-lg shadow-indigo-500/20">
              {lead.name.charAt(0)}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{lead.name}</h1>
            <p className="text-[#94a3b8] mb-4 flex items-center gap-2 mt-1">
              <Building className="w-4 h-4" />
              {lead.company || 'No company'}
            </p>
            
            <span className={`badge badge-${lead.status.replace('_', '-')}`}>{lead.status.replace('_', ' ').toUpperCase()}</span>

            <div className="mt-6 space-y-4 pt-6 border-t border-[#334155]">
              <div className="flex items-center gap-3 text-sm text-[#cbd5e1]">
                <Mail className="w-4 h-4 text-[#64748b]" />
                <a href={`mailto:${lead.email}`} className="hover:text-indigo-400 transition-colors">{lead.email || 'No email provided'}</a>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#cbd5e1]">
                <Phone className="w-4 h-4 text-[#64748b]" />
                <a href={`tel:${lead.phone}`} className="hover:text-indigo-400 transition-colors">{lead.phone || 'No phone provided'}</a>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#cbd5e1]">
                <Briefcase className="w-4 h-4 text-[#64748b]" />
                <span className="capitalize">Source: {lead.source}</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {lead.phone && (
                <div className="col-span-2">
                  <CallButton lead={lead} />
                </div>
              )}
              <button 
                onClick={async () => {
                  if (!confirm('Send automated promotional voice message to this lead?')) return;
                  setSubmitting(true);
                  try {
                    await api.post('/calls/promo-ai', { leadId: lead._id });
                    alert('AI Promotional Call triggered successfully!');
                    loadData(); // Refresh timeline
                  } catch (err: any) {
                    alert(err.message || 'Failed to send promo call');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 hover:border-pink-500 transition-all text-pink-400"
              >
                <Send className="w-5 h-5" />
                <span className="text-xs font-medium">Promo Call</span>
              </button>
              <button 
                onClick={() => setActiveModal('call')}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-[#334155] bg-[#0f172a] hover:bg-[#1e293b] hover:border-indigo-500/50 transition-all text-[#94a3b8] hover:text-indigo-400"
              >
                <Clock className="w-5 h-5" />
                <span className="text-xs font-medium">Log Call</span>
              </button>
              <button 
                onClick={() => setActiveModal('note')}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-[#334155] bg-[#0f172a] hover:bg-[#1e293b] hover:border-sky-500/50 transition-all text-[#94a3b8] hover:text-sky-400"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs font-medium">Add Note</span>
              </button>
              <button 
                onClick={() => setActiveModal('meeting')}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-[#334155] bg-[#0f172a] hover:bg-[#1e293b] hover:border-emerald-500/50 transition-all text-[#94a3b8] hover:text-emerald-400"
              >
                <Calendar className="w-5 h-5" />
                <span className="text-xs font-medium">Meeting</span>
              </button>
              <button 
                onClick={() => setActiveModal('task')}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-[#334155] bg-[#0f172a] hover:bg-[#1e293b] hover:border-amber-500/50 transition-all text-[#94a3b8] hover:text-amber-400"
              >
                <CheckSquare className="w-5 h-5" />
                <span className="text-xs font-medium">Task</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Timeline / Activities */}
        <div className="lg:col-span-2">
          <div className="card p-6 h-full min-h-[500px]">
            <h2 className="text-lg font-bold text-white mb-6">Activity Timeline</h2>
            
            {activities.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-[#334155] rounded-xl">
                <p className="text-[#64748b]">No activity recorded yet.</p>
                <p className="text-sm text-[#475569] mt-1">Log a call, note, or meeting to get started.</p>
              </div>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[19px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-500/20 before:via-[#334155] before:to-transparent">
                {activities.map((act) => (
                  <div key={act._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0f172a] bg-[#1e293b] text-[#94a3b8] group-[.is-active]:text-indigo-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors group-hover:bg-[#0f172a]">
                      {act.type === 'call' ? <Phone className="w-4 h-4" /> : 
                       act.type === 'meeting' ? <Calendar className="w-4 h-4" /> : 
                       <MessageSquare className="w-4 h-4" />}
                    </div>
                    
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[#0f172a] p-4 rounded-xl border border-[#334155] transition-colors group-hover:border-indigo-500/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white capitalize">{act.type}</span>
                        <time className="text-xs text-[#64748b]">{new Date(act.createdAt).toLocaleDateString()}</time>
                      </div>
                      <p className="text-sm text-[#94a3b8] mb-2">Logged by <span className="text-[#cbd5e1]">{act.createdBy.name}</span></p>
                      {act.notes && (
                        <p className="text-sm text-[#e2e8f0] bg-[#1e293b] p-3 rounded-lg border border-[#334155]/50">
                          {act.notes}
                        </p>
                      )}
                      {(act as any).link && (
                        <div className="mt-3">
                          <a 
                            href={(act as any).link.startsWith('http') ? (act as any).link : `https://${(act as any).link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-500/20 transition-all shadow-sm"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Join Meeting (Zoom/Meet)
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <CallHistory leadId={lead._id} />
          </div>
        </div>
      </div>

      {/* MODALS */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-md shadow-2xl relative border border-[#334155]">
            <div className="flex justify-between items-center p-6 border-b border-[#334155]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 capitalize">
                {activeModal === 'call' && <Phone className="w-5 h-5 text-indigo-400" />}
                {activeModal === 'note' && <MessageSquare className="w-5 h-5 text-sky-400" />}
                {activeModal === 'meeting' && <Calendar className="w-5 h-5 text-emerald-400" />}
                {activeModal === 'task' && <CheckSquare className="w-5 h-5 text-amber-400" />}
                {activeModal === 'call' ? 'Log Call' : activeModal === 'task' ? 'Create Task' : `Add ${activeModal}`}
              </h2>
              <button onClick={() => setActiveModal(null)} className="p-1.5 text-[#64748b] hover:text-white rounded-lg hover:bg-[#0f172a] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {activeModal === 'note' && (
                <div className="space-y-4">
                  <textarea 
                    className="input-field min-h-[120px]" 
                    placeholder="Enter your notes here..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                  <button 
                    onClick={() => logActivity('note', { notes: noteText })}
                    disabled={submitting || !noteText}
                    className="btn-primary w-full"
                  >
                    {submitting ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              )}

              {activeModal === 'call' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Duration (min)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        placeholder="5" 
                        value={callData.duration}
                        onChange={(e) => setCallData({...callData, duration: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Outcome</label>
                      <select 
                        className="input-field"
                        value={callData.outcome}
                        onChange={(e) => setCallData({...callData, outcome: e.target.value})}
                      >
                        <option value="connected">Connected</option>
                        <option value="no_answer">No Answer</option>
                        <option value="busy">Busy</option>
                        <option value="voicemail">Voicemail</option>
                        <option value="callback">Callback Required</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Remarks</label>
                    <textarea 
                      className="input-field resize-none" 
                      rows={3} 
                      placeholder="Discussed pricing..."
                      value={callData.notes}
                      onChange={(e) => setCallData({...callData, notes: e.target.value})}
                    />
                  </div>
                  <button 
                    onClick={() => logActivity('call', { 
                      duration: parseInt(callData.duration) || 0, 
                      outcome: callData.outcome, 
                      notes: callData.notes 
                    })}
                    disabled={submitting}
                    className="btn-primary w-full"
                  >
                    {submitting ? 'Logging...' : 'Log Call'}
                  </button>
                </div>
              )}

              {activeModal === 'meeting' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Meeting Date & Time</label>
                      <input 
                        type="datetime-local" 
                        className="input-field"
                        value={meetingData.date}
                        onChange={(e) => setMeetingData({...meetingData, date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Meeting Link (Zoom/Meet)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="https://meet.google.com/xyz"
                      value={meetingData.link}
                      onChange={(e) => setMeetingData({...meetingData, link: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Remarks</label>
                    <textarea 
                      className="input-field resize-none" 
                      rows={3} 
                      placeholder="Agenda items..."
                      value={meetingData.notes}
                      onChange={(e) => setMeetingData({...meetingData, notes: e.target.value})}
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        // 1. Create a high priority task for the meeting
                        await api.post('/tasks', {
                          leadId,
                          title: `Meeting: ${lead.name}`,
                          dueDate: meetingData.date,
                          priority: 'high',
                          link: meetingData.link
                        });
                        
                        // 2. Log the activity
                        await api.post('/activities', {
                          leadId,
                          type: 'meeting',
                          notes: meetingData.notes,
                          scheduledAt: meetingData.date,
                          link: meetingData.link
                        });
                        
                        handleLogged();
                        alert('Meeting scheduled and task created!');
                      } catch (err) {
                        alert('Failed to schedule meeting');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting || !meetingData.date}
                    className="btn-primary w-full"
                  >
                    {submitting ? 'Scheduling...' : 'Schedule Meeting'}
                  </button>
                </div>
              )}

              {activeModal === 'task' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Task Title</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Follow up on proposal"
                      value={taskData.title}
                      onChange={(e) => setTaskData({...taskData, title: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Due Date</label>
                      <input 
                        type="date" 
                        className="input-field"
                        value={taskData.dueDate}
                        onChange={(e) => setTaskData({...taskData, dueDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Priority</label>
                      <select 
                        className="input-field"
                        value={taskData.priority}
                        onChange={(e) => setTaskData({...taskData, priority: e.target.value})}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                  <button 
                    onClick={createTask}
                    disabled={submitting || !taskData.title || !taskData.dueDate}
                    className="btn-primary w-full"
                  >
                    {submitting ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

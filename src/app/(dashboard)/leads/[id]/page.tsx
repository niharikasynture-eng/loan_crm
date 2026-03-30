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
          <div className="card p-8 relative overflow-hidden group">
            {/* Decorative background element */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-sky-500 p-0.5 shadow-xl shadow-indigo-200/50 mb-4 transform group-hover:rotate-3 transition-transform">
                <div className="w-full h-full rounded-[1.9rem] bg-white flex items-center justify-center text-3xl font-black text-indigo-600">
                  {lead.name.charAt(0)}
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{lead.name}</h1>
              <p className="text-gray-500 font-medium flex items-center gap-1.5 mt-1">
                <Building className="w-4 h-4 text-indigo-400" />
                {lead.company || 'Private Individual'}
              </p>
              
              <div className="mt-4">
                <span className={`badge badge-${lead.status.replace('_', '-')} shadow-sm px-4 py-1.5 text-[11px]`}>
                  {lead.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="mt-8 space-y-4 pt-8 border-t border-gray-100">
              <div className="group/item flex items-center gap-4 p-3 rounded-xl hover:bg-indigo-50/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover/item:bg-white group-hover/item:shadow-sm transition-all">
                  <Mail className="w-4 h-4 text-gray-400 group-hover/item:text-indigo-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Email Address</span>
                  <a href={`mailto:${lead.email}`} className="text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-colors">
                    {lead.email || '—'}
                  </a>
                </div>
              </div>

              <div className="group/item flex items-center gap-4 p-3 rounded-xl hover:bg-sky-50/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover/item:bg-white group-hover/item:shadow-sm transition-all">
                  <Phone className="w-4 h-4 text-gray-400 group-hover/item:text-sky-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Phone Number</span>
                  <a href={`tel:${lead.phone}`} className="text-sm font-semibold text-gray-700 hover:text-sky-600 transition-colors">
                    {lead.phone || '—'}
                  </a>
                </div>
              </div>

              <div className="group/item flex items-center gap-4 p-3 rounded-xl hover:bg-emerald-50/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover/item:bg-white group-hover/item:shadow-sm transition-all">
                  <Briefcase className="w-4 h-4 text-gray-400 group-hover/item:text-emerald-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Acquisition Source</span>
                  <span className="text-sm font-semibold text-gray-700 capitalize">{lead.source}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-gray-50/50">
            <h3 className="font-bold text-gray-800 mb-5 flex items-center justify-between">
              Quick Actions
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            </h3>
            <div className="grid grid-cols-2 gap-4">
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
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-pink-100 bg-white shadow-sm hover:shadow-md hover:shadow-pink-100 hover:-translate-y-1 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform">
                  <Send className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-tight text-pink-600">Promo Call</span>
              </button>

              <button 
                onClick={() => setActiveModal('call')}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-indigo-100 bg-white shadow-sm hover:shadow-md hover:shadow-indigo-100 hover:-translate-y-1 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-tight text-indigo-600">Log Call</span>
              </button>

              <button 
                onClick={() => setActiveModal('note')}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-sky-100 bg-white shadow-sm hover:shadow-md hover:shadow-sky-100 hover:-translate-y-1 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-tight text-sky-600">Add Note</span>
              </button>

              <button 
                onClick={() => setActiveModal('meeting')}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-emerald-100 bg-white shadow-sm hover:shadow-md hover:shadow-emerald-100 hover:-translate-y-1 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-tight text-emerald-600">Meeting</span>
              </button>

              <button 
                onClick={() => setActiveModal('task')}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-amber-100 bg-white shadow-sm hover:shadow-md hover:shadow-amber-100 hover:-translate-y-1 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-tight text-amber-600">New Task</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Timeline / Activities */}
        <div className="lg:col-span-2">
          <div className="card p-8 h-full min-h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                Activity Timeline
              </h2>
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 shadow-sm">MB</div>
                <div className="w-8 h-8 rounded-full border-2 border-white bg-sky-100 flex items-center justify-center text-[10px] font-bold text-sky-600 shadow-sm">AI</div>
              </div>
            </div>
            
            {activities.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/30">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
                  <ClipboardList className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No activity recorded yet.</p>
                <p className="text-sm text-gray-400 mt-1">Activities will appear here as you interact with {lead.name.split(' ')[0]}.</p>
              </div>
            ) : (
              <div className="flex-1 space-y-12 relative before:absolute before:inset-0 before:ml-[23px] before:-translate-x-px before:h-full before:w-[2px] before:bg-gray-100">
                {/* Grouping activities by date */}
                {Object.entries(
                  activities.reduce((groups: any, act) => {
                    const date = new Date(act.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    if (!groups[date]) groups[date] = [];
                    groups[date].push(act);
                    return groups;
                  }, {})
                ).map(([date, dateActivities]: [string, any]) => (
                  <div key={date} className="space-y-6">
                    {/* Date Header Segment */}
                    <div className="relative flex items-center gap-4 mb-4">
                      <div className="w-[48px] shrink-0" /> {/* Spacer for timeline spine icons */}
                      <div className="px-4 py-1 bg-gray-100/80 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest border border-gray-200 backdrop-blur-sm">
                        {date}
                      </div>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    <div className="space-y-8">
                      {dateActivities.map((act: any) => (
                        <div key={act._id} className="relative flex gap-6 group">
                          {/* Spine Icon */}
                          <div className={`relative flex items-center justify-center w-12 h-12 rounded-2xl border-4 border-white shadow-xl z-20 shrink-0 transition-all group-hover:scale-110 
                            ${act.type === 'call' ? 'bg-indigo-500 text-white shadow-indigo-100' : 
                              act.type === 'meeting' ? 'bg-emerald-500 text-white shadow-emerald-100' : 
                              'bg-sky-500 text-white shadow-sky-100'}`}>
                            {act.type === 'call' ? <Phone className="w-5 h-5" /> : 
                             act.type === 'meeting' ? <Calendar className="w-5 h-5" /> : 
                             <MessageSquare className="w-5 h-5" />}
                             
                             {/* Small connector pulse (decorative) */}
                             <div className="absolute -inset-1 rounded-2xl border border-white/20 animate-pulse" />
                          </div>
                          
                          {/* Activity Card */}
                          <div className={`flex-1 bg-white p-6 rounded-3xl border-2 border-transparent transition-all shadow-sm hover:shadow-xl hover:shadow-gray-200/50 relative overflow-hidden group/card
                            ${act.type === 'call' ? 'hover:border-indigo-100 ml-border-indigo-500' : 
                              act.type === 'meeting' ? 'hover:border-emerald-100 ml-border-emerald-500' : 
                              'hover:border-sky-100 ml-border-sky-500'}`}>
                            
                            {/* Color accent left border */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 
                              ${act.type === 'call' ? 'bg-indigo-500' : 
                                act.type === 'meeting' ? 'bg-emerald-500' : 
                                'bg-sky-500'}`} />

                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm
                                  ${act.type === 'call' ? 'bg-indigo-50 text-indigo-600' : 
                                    act.type === 'meeting' ? 'bg-emerald-50 text-emerald-600' : 
                                    'bg-sky-50 text-sky-600'}`}>
                                  {act.type}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                                  <Clock className="w-3.5 h-3.5" />
                                  {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">ID: {act._id.slice(-6)}</span>
                            </div>

                            <div className="flex items-start gap-4 mb-5 p-3 rounded-2xl bg-gray-50/50 border border-gray-100/50">
                               <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[10px] font-bold text-indigo-600 border border-indigo-50 shrink-0">
                                 {act.createdBy?.name?.charAt(0) || 'S'}
                               </div>
                               <div>
                                 <p className="text-[13px] text-gray-600 leading-tight">
                                   <span className="font-extrabold text-gray-800 tracking-tight">{act.createdBy?.name ?? 'System'}</span>
                                   <span className="ml-1 text-gray-400 font-medium">recorded this interaction.</span>
                                 </p>
                                 <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider italic">Verified by DealByte AI</p>
                               </div>
                            </div>

                            {act.notes && (
                              <div className="relative mt-2 p-5 rounded-2xl bg-white border border-gray-100 shadow-inner group/note">
                                <div className="absolute left-4 top-4 text-gray-200">
                                  <MessageSquare className="w-8 h-8 opacity-20" />
                                </div>
                                <p className="relative text-[14px] text-gray-700 leading-relaxed font-semibold italic text-justify">
                                  "{act.notes}"
                                </p>
                              </div>
                            )}

                            {(act as any).link && (
                              <div className="mt-5">
                                <a 
                                  href={(act as any).link.startsWith('http') ? (act as any).link : `https://${(act as any).link}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group/btn relative inline-flex items-center gap-3 px-6 py-3 bg-gray-900 text-white text-[11px] font-black tracking-widest rounded-2xl hover:bg-emerald-600 transition-all shadow-lg hover:shadow-emerald-200 overflow-hidden"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                  <Calendar className="relative w-4 h-4" />
                                  <span className="relative">JOIN ONLINE SESSION</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}


            <div className="mt-auto pt-8">
              <CallHistory leadId={lead._id} />
            </div>
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

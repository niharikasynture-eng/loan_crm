'use client';

import { useEffect, useState, use } from 'react';
import { api } from '@/lib/api-client';
import { Mail, Phone, Building, Briefcase, Calendar, CheckSquare, MessageSquare, X, Clock, ClipboardList, Send, CheckCircle2, Pencil, Settings, Plus, Bell, MessageCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CallButton from '@/components/CallButton';
import { useAuth } from '@/context/AuthContext';

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; text: string; label: string }> = {
  call:     { icon: <Phone size={14} />,        color: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600', label: 'Call' },
  meeting:  { icon: <Calendar size={14} />,     color: '#a855f7', bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-600', label: 'Meeting' },
  email:    { icon: <Mail size={14} />,          color: '#0ea5e9', bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-600', label: 'Email' },
  whatsapp: { icon: <MessageCircle size={14} />, color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', label: 'WhatsApp' },
  note:     { icon: <FileText size={14} />,      color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600', label: 'Note' },
};

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  source: string;
  createdAt: string;
  lostReason?: string;
  assignedTo?: { _id: string; name: string; avatar?: string };
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
  const { user } = useAuth();
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'call' | 'note' | 'meeting' | 'task' | 'reminder' | 'whatsapp' | 'email' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [noteText, setNoteText] = useState('');
  const [noteDateOnly, setNoteDateOnly] = useState('');
  const [noteTime, setNoteTime] = useState('');
  const [notePriority, setNotePriority] = useState('medium');
  const [callData, setCallData] = useState({ duration: '', outcome: 'connected', notes: '', followUpDate: '' });
  const [meetingData, setMeetingData] = useState({ date: '', time: '', notes: '', link: '' });
  const [taskData, setTaskData] = useState({ title: '', dueDate: '', priority: 'medium' });
  const [reminderData, setReminderData] = useState({ date: '', time: '', notes: '' });
  const [whatsappData, setWhatsappData] = useState({ message: 'Hi, just following up from DealByte CRM!', isTemplate: false });
  const [emailData, setEmailData] = useState({ subject: 'Follow up from DealByte CRM', message: '', isTemplate: false });
  
  const emailTemplates = [
    { name: 'Introduction', subject: 'Connecting: [Your Name] & [Lead Name]', body: `Hi ${lead?.name.split(' ')[0] || 'there'},\n\nI'm [Your Name] from [Your Company]. I'm reaching out to introduce myself and see how we can help you with your needs.\n\nBest regards,\n[Your Name]` },
    { name: 'Meeting Follow-up', subject: 'Next Steps: Our Meeting regarding [Topic]', body: `Hi ${lead?.name.split(' ')[0] || 'there'},\n\nIt was great speaking with you earlier today. Attached are the notes from our discussion. Let's touch base next week regarding the proposal.\n\nBest,\n[Your Name]` },
    { name: 'Proposal Review', subject: 'Proposal for [Lead Company]', body: `Hi ${lead?.name.split(' ')[0] || 'there'},\n\nI've attached the customized proposal we discussed. Please take a look and let me know if you have any questions.\n\nRegards,\n[Your Name]` }
  ];
  
  const whatsappTemplates = [
    { name: 'Introduction', text: `Hi ${lead?.name.split(' ')[0] || 'there'}, this is [Agent Name] from [Company]. Just wanted to introduce myself!` },
    { name: 'Ready for Demo', text: `Hi ${lead?.name.split(' ')[0] || 'there'}, are you available for a quick demo of our platform this week?` },
    { name: 'Following Up', text: `Hi ${lead?.name.split(' ')[0] || 'there'}, I'm following up on our previous conversation. Let me know if you have any questions!` },
    { name: 'Thank You', text: `Thanks for your time today, ${lead?.name.split(' ')[0] || 'there'}. Looking forward to our next steps.` }
  ];
  
  // Edit Lead state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', company: '' });

  async function loadData() {
    try {
      const [leadRes, actsRes, usersRes] = await Promise.all([
        api.get<{ lead: Lead }>(`/leads/${leadId}`),
        api.get<{ activities: Activity[] }>(`/activities?leadId=${leadId}`),
        api.get<{ users: { _id: string; name: string }[] }>('/users?limit=100'),
      ]);
      setLead(leadRes.lead);
      setActivities(actsRes.activities);
      setUsers(usersRes.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateLeadField(field: string, value: any) {
    setSubmitting(true);
    try {
      await api.patch(`/leads/${leadId}`, { [field]: value });
      loadData();
    } catch (err: any) {
      alert(err.message || `Failed to update ${field}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateLead() {
    setSubmitting(true);
    try {
      await api.patch(`/leads/${leadId}`, editForm);
      setIsEditModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update lead');
    } finally {
      setSubmitting(false);
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
    setNoteDateOnly('');
    setNoteTime('');
    setNotePriority('medium');
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
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} logged successfully!`);
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
              
              <div className="flex items-center gap-2 mt-2">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{lead.name}</h1>
                <button 
                  onClick={() => {
                    setEditForm({ name: lead.name, email: lead.email, phone: lead.phone || '', company: lead.company || '' });
                    setIsEditModalOpen(true);
                  }}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  title="Edit Lead Info"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

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
                  {lead.phone ? (
                    <a href={`tel:${lead.phone}`} className="text-sm font-semibold text-gray-700 hover:text-sky-600 transition-colors">
                      {lead.phone}
                    </a>
                  ) : (
                    <button 
                      onClick={() => {
                        setEditForm({ name: lead.name, email: lead.email, phone: '', company: lead.company || '' });
                        setIsEditModalOpen(true);
                      }}
                      className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Phone Number
                    </button>
                  )}
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

          {/* ────── Lead Management Options ────── */}
          <div className="card p-6 bg-white border border-gray-100 animate-slide-in">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-500" />
              Lead Management
            </h3>
            
            <div className="space-y-5">
              {/* Status Selector */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Operational Status</label>
                <select 
                  value={lead.status}
                  onChange={(e) => updateLeadField('status', e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                >
                  <option value="new">NEW OPPORTUNITY</option>
                  <option value="contacted">CONTACTED</option>
                  <option value="qualified">QUALIFIED</option>
                  <option value="won">WON / CLOSED</option>
                  <option value="lost">LOST / ARCHIVED</option>
                </select>
                {lead.status === 'lost' && (
                  <div className="mt-4 p-4 bg-red-50/50 border border-red-100 rounded-xl animate-fade-in shadow-inner">
                    <label className="block text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Archived Status Reason</label>
                    <p className="text-xs font-bold text-red-800 italic leading-relaxed">&ldquo;{lead.lostReason || 'N/A'}&rdquo;</p>
                  </div>
                )}
              </div>

              {/* Source Selector */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Acquisition Pipeline</label>
                <select 
                  value={lead.source}
                  onChange={(e) => updateLeadField('source', e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                >
                  <option value="inbound">INBOUND LEAD</option>
                  <option value="referral">REFERRAL</option>
                  <option value="manual">MANUAL ENTRY</option>
                  <option value="website">WEBSITE FORM</option>
                  <option value="social">SOCIAL MEDIA</option>
                </select>
              </div>

              {/* Assignee Selector */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Strategic Assignee</label>
                <select 
                  value={lead.assignedTo?._id || ''}
                  onChange={(e) => updateLeadField('assignedTo', e.target.value)}
                  disabled={user?.role !== 'manager'}
                  className={`w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer ${user?.role !== 'manager' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name.toUpperCase()}</option>
                  ))}
                </select>
                {user?.role !== 'manager' && (
                   <p className="text-[9px] text-orange-400 font-bold mt-1 uppercase tracking-tight italic">Only Managers can assign leads</p>
                )}
              </div>
            </div>
          </div>

          <div className="card p-6 bg-gray-50/50">
            <h3 className="font-bold text-gray-800 mb-5 flex items-center justify-between">
              Quick Actions
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            </h3>
            <div className="space-y-3">

              {/* 1. Call Now — full width, top (only when phone exists) */}
              {lead.phone && (
                <CallButton lead={lead} />
              )}

              {/* 2. Promo Call + Log Call */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={async () => {
                    if (!lead.phone) return alert('Phone number is required for Promo Call. Please update lead info first.');
                    if (!confirm('Send automated promotional voice message to this lead?')) return;
                    setSubmitting(true);
                    try {
                      await api.post('/calls/promo-ai', { leadId: lead._id });
                      alert('AI Promotional Call triggered successfully!');
                      loadData();
                    } catch (err: any) {
                      alert(err.message || 'Failed to send promo call');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                  className="flex col-span-1 flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-pink-100 bg-white shadow-sm hover:shadow-md hover:shadow-pink-100 hover:-translate-y-1 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform">
                    <Send className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-tight text-pink-600">Promo Call</span>
                </button>

                <button 
                  onClick={() => setActiveModal('call')}
                  className="flex col-span-1 flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-indigo-100 bg-white shadow-sm hover:shadow-md hover:shadow-indigo-100 hover:-translate-y-1 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-tight text-indigo-600">Log Call</span>
                </button>
              </div>

              {/* 3. WhatsApp + Email Integration */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setActiveModal('whatsapp')}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-emerald-100 bg-white shadow-sm hover:shadow-md hover:shadow-emerald-100 hover:-translate-y-1 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-tight text-emerald-600">WhatsApp</span>
                </button>

                <button 
                  onClick={() => setActiveModal('email')}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-sky-100 bg-white shadow-sm hover:shadow-md hover:shadow-sky-100 hover:-translate-y-1 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-tight text-sky-600">Send Email</span>
                </button>
              </div>

              {/* 4. Meeting & Add Note */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setActiveModal('meeting')}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-purple-100 bg-white shadow-sm hover:shadow-md hover:shadow-purple-100 hover:-translate-y-1 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-tight text-purple-600">Schedule Meeting</span>
                </button>

                <button 
                  onClick={() => setActiveModal('note')}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-amber-100 bg-white shadow-sm hover:shadow-md hover:shadow-amber-100 hover:-translate-y-1 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-tight text-amber-600">Add Note</span>
                </button>
              </div>

              {/* 5. New Task + Call Reminder (Joined) */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setActiveModal('task')}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-amber-100 bg-white shadow-sm hover:shadow-md hover:shadow-amber-100 hover:-translate-y-1 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-tight text-amber-600">New Task</span>
                </button>

                <button 
                  onClick={() => setActiveModal('reminder')}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-indigo-100 bg-white shadow-sm hover:shadow-md hover:shadow-indigo-100 hover:-translate-y-1 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                    <Bell className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-tight text-indigo-600">Call Reminder</span>
                </button>
              </div>

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
                    <div className="space-y-6">
                      {dateActivities.map((act: any) => {
                        const meta = (TYPE_META as any)[act.type] ?? (TYPE_META as any)['note'];
                        const isManual = act.type === 'call' && act.notes?.toLowerCase().includes('manual call');
                        const isPromo = act.type === 'call' && act.notes?.toLowerCase().includes('promo call');
                        const displayType = isManual ? 'manual call' : isPromo ? 'promo call' : act.type;

                        return (
                          <div key={act._id} className="relative flex gap-4 group">
                            {/* Spine Icon - Slimmer */}
                            <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-md z-20 shrink-0 transition-all group-hover:scale-110 
                              ${act.type === 'call' && isPromo ? 'bg-pink-500 text-white' : 
                                act.type === 'call' ? 'bg-indigo-500 text-white' : 
                                act.type === 'meeting' ? 'bg-purple-500 text-white' : 
                                act.type === 'whatsapp' ? 'bg-emerald-500 text-white' : 
                                act.type === 'email' ? 'bg-sky-500 text-white' : 
                                'bg-slate-500 text-white'}`}>
                              {act.type === 'call' ? <Phone className="w-4 h-4" /> : 
                               act.type === 'meeting' ? <Calendar className="w-4 h-4" /> : 
                               act.type === 'whatsapp' ? <MessageCircle className="w-4 h-4" /> : 
                               act.type === 'email' ? <Mail className="w-4 h-4" /> : 
                               <ClipboardList className="w-4 h-4" />}
                            </div>
                            
                            {/* Activity Card - Cleaner */}
                            <div className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 transition-all hover:shadow-md relative overflow-hidden group/card shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 pt-1">
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isPromo ? 'bg-pink-50 text-pink-600 ring-pink-100' : isManual ? 'bg-indigo-50 text-indigo-600 ring-indigo-100' : meta.bg + ' ' + meta.text} ring-1 ring-inset ${!isPromo && !isManual ? meta.border.replace('border-', 'ring-') : ''}`}>
                                    {displayType}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                                    <Clock className="w-3.5 h-3.5 opacity-50" />
                                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                                <span className="text-[8px] font-bold text-gray-300 uppercase">ID: {act._id.slice(-6)}</span>
                              </div>

                              <p className="text-sm text-gray-700 leading-relaxed">
                                <span className="font-bold text-gray-900">{act.createdBy?.name || 'System'}</span>
                                <span className="ml-1 text-gray-500">
                                  {act.type === 'call' ? 'recorded a call' : 
                                   act.type === 'meeting' ? 'scheduled a meeting' : 
                                   act.type === 'whatsapp' ? 'sent a WhatsApp message' : 
                                   act.type === 'email' ? 'sent an email' : 
                                   'added a note'}.
                                </span>
                              </p>

                              {act.notes && (
                                <div className="mt-2 p-3 rounded-xl bg-gray-50/50 border border-gray-100/50 text-[13px] text-gray-600 italic">
                                  "{act.notes}"
                                </div>
                              )}

                              {(act as any).link && (
                                <div className="mt-3">
                                  <a 
                                    href={(act as any).link.startsWith('http') ? (act as any).link : `https://${(act as any).link}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[10px] font-bold tracking-widest rounded-xl hover:bg-indigo-600 transition-all shadow-sm"
                                  >
                                    <Calendar className="w-3 h-3" />
                                    JOIN SESSION
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-auto pt-8">
              {/* CallHistory has been merged into Activity Timeline */}
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
                {activeModal === 'reminder' && <Bell className="w-5 h-5 text-indigo-400" />}
                {activeModal === 'call' ? 'Log Call' : 
                 activeModal === 'task' ? 'Create Task' : 
                 activeModal === 'reminder' ? 'Call Reminder' : 
                 `Add ${activeModal}`}
              </h2>
              <button onClick={() => setActiveModal(null)} className="p-1.5 text-[#64748b] hover:text-white rounded-lg hover:bg-[#0f172a] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {activeModal === 'note' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Note Description</label>
                    <textarea 
                      className="input-field min-h-[120px]" 
                      placeholder="Enter your notes here..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Due Date</label>
                      <input 
                        type="date" 
                        className="input-field"
                        value={noteDateOnly}
                        onChange={(e) => setNoteDateOnly(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Priority</label>
                      <select 
                        className="input-field"
                        value={notePriority}
                        onChange={(e) => setNotePriority(e.target.value)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Reminder Time</label>
                    <input 
                      type="time" 
                      className="input-field"
                      value={noteTime}
                      onChange={(e) => setNoteTime(e.target.value)}
                    />
                  </div>

                  <button 
                    onClick={async () => {
                      if (noteDateOnly) {
                        setSubmitting(true);
                        try {
                          // Combine date and time
                          const scheduledAt = noteTime 
                            ? new Date(`${noteDateOnly}T${noteTime}`)
                            : new Date(noteDateOnly);

                          await api.post('/tasks', {
                            leadId,
                            title: `Note Reminder: ${noteText.substring(0, 30)}${noteText.length > 30 ? '...' : ''}`,
                            dueDate: scheduledAt,
                            priority: notePriority
                          });
                          await api.post('/activities', {
                            leadId,
                            type: 'note',
                            notes: noteText,
                            scheduledAt: scheduledAt,
                            priority: notePriority
                          });
                          handleLogged();
                        } catch (err) {
                           alert('Failed to save note reminder');
                        } finally {
                           setSubmitting(false);
                        }
                      } else {
                        logActivity('note', { notes: noteText });
                      }
                    }}
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

              {activeModal === 'whatsapp' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex bg-gray-100 p-1 rounded-2xl mb-6 shadow-inner">
                       <button 
                         onClick={() => setWhatsappData({...whatsappData, isTemplate: false})}
                         className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${!whatsappData.isTemplate ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                       >
                         Manual Type
                       </button>
                       <button 
                         onClick={() => setWhatsappData({...whatsappData, isTemplate: true})}
                         className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${whatsappData.isTemplate ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                       >
                         Use Template
                       </button>
                    </div>

                    <div className="space-y-4">
                      {whatsappData.isTemplate ? (
                        <div className="space-y-3">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Template</label>
                          <select 
                            className="input-field !bg-gray-50 focus:!bg-white"
                            onChange={(e) => setWhatsappData({...whatsappData, message: e.target.value})}
                          >
                            <option value="">Choose a WhatsApp message...</option>
                            {whatsappTemplates.map((t, idx) => (
                              <option key={idx} value={t.text}>{t.name}</option>
                            ))}
                          </select>
                          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs text-emerald-700 italic leading-relaxed">
                            {whatsappData.message || 'Select a template to preview context here...'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">WhatsApp Message</label>
                          <textarea 
                            className="input-field min-h-[140px] !bg-gray-50 focus:!bg-white" 
                            placeholder="Type your message here..."
                            value={whatsappData.message}
                            onChange={(e) => setWhatsappData({...whatsappData, message: e.target.value})}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <p className="text-[11px] text-emerald-700 font-medium italic">
                      Real WhatsApp API is active via <strong>Ultramsg</strong>. 
                      Messages will be sent directly from your linked number.
                    </p>
                  </div>
                  <button 
                    onClick={async () => {
                      if (!lead.phone) return alert('Lead must have a phone number.');
                      setSubmitting(true);
                      try {
                        await api.post('/activities/whatsapp', {
                          leadId: lead._id,
                          message: whatsappData.message
                        });
                        alert('WhatsApp message sent successfully!');
                        handleLogged();
                      } catch (err: any) {
                        alert(err.message || 'Failed to send WhatsApp message');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting}
                    className="btn-primary w-full !bg-emerald-600 hover:!bg-emerald-700 border-none"
                  >
                    {submitting ? 'Sending...' : 'Send WhatsApp Message'}
                  </button>
                </div>
              )}

              {activeModal === 'email' && (
                <div className="space-y-4">
                  <div className="flex bg-gray-100 p-1 rounded-2xl mb-6 shadow-inner">
                    <button 
                      onClick={() => setEmailData({...emailData, isTemplate: false})}
                      className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${!emailData.isTemplate ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Manual Write
                    </button>
                    <button 
                      onClick={() => setEmailData({...emailData, isTemplate: true})}
                      className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${emailData.isTemplate ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Use Template
                    </button>
                  </div>

                  <div className="space-y-4">
                    {emailData.isTemplate && (
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Choose Template</label>
                        <select 
                          className="input-field !bg-gray-50 focus:!bg-white"
                          onChange={(e) => {
                            const template = emailTemplates.find(t => t.name === e.target.value);
                            if (template) {
                              setEmailData({...emailData, subject: template.subject, message: template.body});
                            }
                          }}
                        >
                          <option value="">Select a template...</option>
                          {emailTemplates.map((t, idx) => (
                            <option key={idx} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Subject Line</label>
                      <input 
                        type="text" 
                        className="input-field !bg-gray-50 focus:!bg-white" 
                        placeholder="e.g. Next Steps..."
                        value={emailData.subject}
                        onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Body</label>
                      <textarea 
                        className="input-field min-h-[160px] !bg-gray-50 focus:!bg-white" 
                        placeholder="Write your email content..."
                        value={emailData.message}
                        onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <p className="text-[11px] text-indigo-700 font-medium italic">
                      Emails will be sent directly through the system using your <strong>SMTP</strong> configuration.
                    </p>
                  </div>
                  <button 
                    onClick={async () => {
                      if (!lead.email) return alert('Lead must have an email address.');
                      setSubmitting(true);
                      try {
                        await api.post('/activities/email', {
                          leadId: lead._id,
                          subject: emailData.subject,
                          message: emailData.message
                        });
                        alert('Email sent successfully via system!');
                        handleLogged();
                      } catch (err: any) {
                        alert(err.message || 'Failed to send email. Check SMTP settings.');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting || !emailData.subject || !emailData.message}
                    className="btn-primary w-full"
                  >
                    {submitting ? 'Sending...' : 'Send System Email'}
                  </button>
                </div>
              )}
              {activeModal === 'reminder' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Date</label>
                      <input 
                        type="date" 
                        className="input-field" 
                        value={reminderData.date}
                        onChange={(e) => setReminderData({...reminderData, date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Time</label>
                      <input 
                        type="time" 
                        className="input-field" 
                        value={reminderData.time}
                        onChange={(e) => setReminderData({...reminderData, time: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Note (Optional)</label>
                    <textarea 
                      className="input-field resize-none" 
                      rows={3} 
                      placeholder="What should we discuss?"
                      value={reminderData.notes}
                      onChange={(e) => setReminderData({...reminderData, notes: e.target.value})}
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        await api.post('/activities', {
                          leadId,
                          type: 'call',
                          status: 'pending',
                          scheduledAt: `${reminderData.date}T${reminderData.time}:00Z`,
                          notes: reminderData.notes
                        });
                        handleLogged();
                        alert('Call reminder scheduled successfully!');
                      } catch (err) {
                        alert('Failed to schedule reminder');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting || !reminderData.date || !reminderData.time}
                    className="btn-primary w-full"
                  >
                    {submitting ? 'Setting...' : 'Set Call Reminder'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* EDIT LEAD MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="card w-full max-w-md shadow-2xl relative border border-indigo-100 !bg-white">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 uppercase tracking-tighter">
                <Settings className="w-5 h-5 text-indigo-600" />
                Edit Lead Information
              </h2>
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                <input 
                  type="text" 
                  className="input-field !bg-gray-50 !border-gray-100 !text-gray-900 focus:!bg-white focus:!border-indigo-500" 
                  value={editForm.name}
                  placeholder="e.g. John Doe"
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                  <input 
                    type="email" 
                    className="input-field !bg-gray-50 !border-gray-100 !text-gray-900 focus:!bg-white focus:!border-indigo-500" 
                    value={editForm.email}
                    placeholder="name@company.com"
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                  <input 
                    type="text" 
                    className="input-field !bg-gray-50 !border-gray-100 !text-gray-900 focus:!bg-white focus:!border-indigo-500" 
                    value={editForm.phone}
                    placeholder="+91 99999 99999"
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Company Name</label>
                <input 
                  type="text" 
                  className="input-field !bg-gray-50 !border-gray-100 !text-gray-900 focus:!bg-white focus:!border-indigo-500" 
                  value={editForm.company}
                  placeholder="Company Ltd."
                  onChange={(e) => setEditForm({...editForm, company: e.target.value})}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 border border-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-2xl font-bold transition-all text-sm uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={updateLead}
                  disabled={submitting || !editForm.name}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 p-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Update Lead'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

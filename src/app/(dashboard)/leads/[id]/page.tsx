'use client';

import { useEffect, useState, use } from 'react';
import { api } from '@/lib/api-client';
import { Mail, Phone, Building, Briefcase, Calendar, CheckSquare, MessageSquare, X, Clock, ClipboardList, Send, CheckCircle2, Pencil, Settings, Plus, Bell, MessageCircle, FileText, MapPin, HeartPulse, GraduationCap, Users, Shield, Trash2, User, TrendingUp, UserCog } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CallButton from '@/components/CallButton';
import { PostCallDispositionModal } from '@/components/features/PostCallDispositionModal';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; text: string; label: string }> = {
  call: { icon: <Phone size={14} />, color: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600', label: 'Call' },
  meeting: { icon: <Calendar size={14} />, color: '#a855f7', bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-600', label: 'Meeting' },
  email: { icon: <Mail size={14} />, color: '#0ea5e9', bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-600', label: 'Email' },
  whatsapp: { icon: <MessageCircle size={14} />, color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', label: 'WhatsApp' },
  note: { icon: <FileText size={14} />, color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600', label: 'Note' },
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
  isReadByVisitor?: boolean;
  readAt?: string;
  secondaryPhone?: string;
  address?: string;
  flatNo?: string;
  landmark?: string;
  area?: string;
  pincode?: string;
  income?: string;
  occupation?: string;
  education?: string;
  dateOfVisit?: string;
  timeOfVisit?: string;
  mapLink?: string;
  hasMedeclaim?: boolean;
  sumAssured?: string;
  insuranceCompany?: string;
  healthStatus?: {
    fit: boolean;
    bp: boolean;
    sugar: boolean;
    heart: boolean;
    kidney: boolean;
    liver: boolean;
  };
  familyAges?: {
    husband?: number;
    wife?: number;
    child1?: number;
    child2?: number;
    mother?: number;
    father?: number;
  };
  tseName?: string;
  tlName?: string;
  visitDate?: string;
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
  const router = useRouter();
  const { user } = useAuth();
  const isOnsiteVisitor = user?.role === 'onsite_visitor';
  const isSalesAgent = user?.role === 'sales_agent';
  const { showToast } = useToast();

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'call' | 'note' | 'meeting' | 'task' | 'reminder' | 'whatsapp' | 'email' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDialing, setIsDialing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Smart Call & 1-Click Outcome Modal ──
  const [isBrowserCallActive, setIsBrowserCallActive] = useState(false);
  const [browserCallResult, setBrowserCallResult] = useState<{ duration: number; trustLabel: string } | null>(null);
  const [isDispositionOpen, setIsDispositionOpen] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  async function handleEnrichLead() {
    setIsEnriching(true);
    try {
      await api.post(`/leads/${leadId}/enrich`, {});
      showToast('Lead enriched via Intelligence REST API!', 'success', 'Enriched');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Enrichment failed', 'error', 'Error');
    } finally {
      setIsEnriching(false);
    }
  }

  // Form states
  const [noteText, setNoteText] = useState('');
  const [noteDateOnly, setNoteDateOnly] = useState('');
  const [noteHour, setNoteHour] = useState('12');
  const [noteMinute, setNoteMinute] = useState('00');
  const [notePeriod, setNotePeriod] = useState('AM');
  const [notePriority, setNotePriority] = useState('medium');
  const [callData, setCallData] = useState({
    duration: '',
    outcome: 'connected',
    notes: '',
    followUpDate: '',
    date: new Date().toISOString().split('T')[0],
    startHour: '10',
    startMinute: '00',
    startSecond: '00',
    startPeriod: 'AM',
    endHour: '10',
    endMinute: '05',
    endSecond: '00',
    endPeriod: 'AM',
  });
  const [meetingData, setMeetingData] = useState({ date: '', timeHour: '12', timeMinute: '00', timePeriod: 'AM', notes: '', link: '' });
  const [taskData, setTaskData] = useState({ title: '', dueDate: '', priority: 'medium' });
  const [reminderData, setReminderData] = useState({ date: '', timeHour: '12', timeMinute: '00', timePeriod: 'AM', notes: '' });
  const [whatsappData, setWhatsappData] = useState({ message: 'Hi, just following up from R-Life CRM!', isTemplate: false });
  const [emailData, setEmailData] = useState({ subject: 'Follow up from R-Life CRM', message: '', isTemplate: false });

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

  async function markAsRead() {
    setSubmitting(true);
    try {
      await api.patch(`/leads/${leadId}`, { isReadByVisitor: true });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to mark as read');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteLead() {
    setIsDeleting(true);
    try {
      await api.delete(`/leads/${leadId}`);
      router.push('/leads');
    } catch (err: any) {
      alert(err.message || 'Failed to delete lead');
    } finally {
      setIsDeleting(false);
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
    setNoteHour('12');
    setNoteMinute('00');
    setNotePeriod('AM');
    setNotePriority('medium');
    setCallData({
      duration: '', outcome: 'connected', notes: '', followUpDate: '',
      date: new Date().toISOString().split('T')[0],
      startHour: '10', startMinute: '00', startSecond: '00', startPeriod: 'AM',
      endHour: '10', endMinute: '05', endSecond: '00', endPeriod: 'AM'
    });
    setMeetingData({ date: '', timeHour: '12', timeMinute: '00', timePeriod: 'AM', notes: '', link: '' });
    setTaskData({ title: '', dueDate: '', priority: 'medium' });
  };

  // ─── Smart Call: Browser Visibility Timer ───
  async function handleSmartCall() {
    if (!lead?.phone) { alert('No phone number for this lead.'); return; }
    if (isBrowserCallActive) { alert('A Smart Call is already in progress. Return to this tab to end it.'); return; }

    try {
      // 1. POST to server → locks startedAt server-side
      const res = await api.post<{ callLogId: string; phone: string }>(`/calls/start/${leadId}`, {});
      const callLogId = res.callLogId;
      setIsBrowserCallActive(true);
      setBrowserCallResult(null);

      // 2. Request push notification permission & schedule 8-min reminder
      if ('Notification' in window) {
        try {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            setTimeout(() => {
              new Notification('📞 Return to CRM', {
                body: `Please return to log your call with ${lead.name}. Tab has been open for 8 minutes.`,
                icon: '/favicon.ico',
              });
            }, 8 * 60 * 1000);
          }
        } catch { }
      }

      // 3. Open native dialer
      window.open(`tel:${lead.phone}`, '_self');

      // 4. Capture precise 'Hidden' time (when dialer actually opens)
      let hiddenAt = Date.now();
      const onHidden = () => {
        if (document.visibilityState === 'hidden') {
          hiddenAt = Date.now();
        }
      };
      document.addEventListener('visibilitychange', onHidden);

      // 5. Auto-end when salesperson returns to this tab
      const handleVisibility = async () => {
        if (document.visibilityState === 'visible') {
          // Clean up listeners
          document.removeEventListener('visibilitychange', handleVisibility);
          document.removeEventListener('visibilitychange', onHidden);

          setIsBrowserCallActive(false);
          // Show syncing state
          setBrowserCallResult({ duration: 0, trustLabel: '📱 Syncing duration...' });

          const visibleAt = Date.now();
          const clientElapsedSeconds = Math.round((visibleAt - hiddenAt) / 1000);

          // 6. Tell server to close the placeholder CallLog
          try {
            const result = await api.post<{ duration: number; trustLabel: string; rawBrowserElapsed: number }>(
              `/calls/${callLogId}/browser-end`,
              { clientDuration: clientElapsedSeconds }
            );

            setBrowserCallResult({ duration: result.duration, trustLabel: result.trustLabel });
            setIsDispositionOpen(true);

            // Refresh activities
            setTimeout(() => loadData(), 1000);
            setTimeout(() => loadData(), 15000);
            setTimeout(() => loadData(), 60000);
          } catch (err) {
            console.error('Browser call end failed:', err);
            setBrowserCallResult(null);
          }
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);


    } catch (err: any) {
      alert(err.message || 'Could not initiate Smart Call. Please try again.');
      setIsBrowserCallActive(false);
    }
  }

  async function logActivity(type: string, data: any) {
    setSubmitting(true);
    try {
      await api.post('/activities', {
        leadId,
        type,
        ...data
      });
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} logged successfully!`);
      handleLogged();
    } catch (err: any) {
      console.error('Activity Log Error:', err);
      alert(`Failed to log activity: ${err.message || 'Unknown error'}`);
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
    }
  }

  const DetailItem = ({ label, value, isLink, link, highlight, icon: Icon }: { label: string; value?: string | number; isLink?: boolean; link?: string; highlight?: boolean; icon?: any }) => (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group/item border border-transparent hover:border-slate-100">
      {Icon && (
        <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
          <Icon size={16} />
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</span>
        {isLink && value ? (
          <a href={link} className="text-[14px] font-semibold text-indigo-600 hover:underline truncate">
            {value}
          </a>
        ) : (
          <span className={`text-[14px] font-semibold ${highlight ? 'text-indigo-600' : 'text-slate-700'} truncate`}>
            {value || '—'}
          </span>
        )}
      </div>
    </div>
  );

  if (loading) return <div className="p-8 text-[#94a3b8]">Loading lead details...</div>;
  if (!lead) return <div className="p-8 text-red-400">Lead not found</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[#94a3b8] text-sm">
        <Link href="/leads" className="hover:text-white transition-colors">Leads</Link>
        <span>/</span>
        <span className="text-white font-medium truncate max-w-[160px] sm:max-w-none">{lead.name}</span>
        {(user?.role === 'manager' || user?.role === 'org_admin') && (
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
          >
            <Trash2 size={14} /> Delete Lead
          </button>
        )}
      </div>

      <div className={isOnsiteVisitor ? 'w-full' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
        {isOnsiteVisitor ? (
          <div className="w-full flex flex-col gap-6 pb-20">
            {/* ── Premium Profile Header ── */}
            <div className="relative overflow-hidden bg-white rounded-2xl border shadow-sm p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 group" style={{ borderColor: 'var(--border)' }}>
              <div className="relative w-16 h-16 rounded-xl flex items-center justify-center text-xl font-semibold text-white shadow-md ring-4" style={{ background: 'var(--brand)', '--tw-ring-color': 'var(--brand-soft)' } as React.CSSProperties}>
                {lead.name.charAt(0).toUpperCase()}
              </div>

              <div className="relative text-center md:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-1.5">
                  <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>{lead.name}</h1>
                  <span className="px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest rounded-md border" style={{ background: 'var(--brand-soft)', color: 'var(--brand)', borderColor: 'rgba(108,92,231,0.2)' }}>Verified Client</span>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 font-medium text-sm" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex items-center gap-2">
                    <Building size={16} />
                    {lead.company || 'Private Individual'}
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-300 hidden md:block" />
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    {lead.area || 'Pune'}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                  <span className="px-2.5 py-1 text-[9px] font-medium uppercase tracking-widest rounded-md border bg-slate-50 border-slate-200 text-slate-600">NEW</span>
                  <span className="px-2.5 py-1 text-[9px] font-medium uppercase tracking-widest rounded-md border" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#d1fae5' }}>ONSITE PROTOCOL ACTIVE</span>
                </div>
              </div>
            </div>

            {/* ── Unified Information Section ── */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="grid grid-cols-1 md:grid-cols-2">

                {/* Column 1: Personal & Professional */}
                <div className="p-6 md:p-10 border-b md:border-b-0 md:border-r border-slate-100 space-y-10">
                  {/* Contact Info */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
                        <User size={16} />
                      </div>
                      <h2 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Contact Information</h2>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-4">
                      <DetailItem label="Full Name" value={lead.name} icon={User} />
                      <DetailItem label="Email" value={lead.email} isLink link={`mailto:${lead.email}`} icon={Mail} />
                      <DetailItem label="Phone" value={lead.phone} isLink link={`tel:${lead.phone}`} icon={Phone} />
                      <DetailItem label="Lead Source" value={lead.source} icon={Briefcase} />
                    </div>
                  </section>

                  {/* Professional Info */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
                        <Briefcase size={16} />
                      </div>
                      <h2 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Professional Profile</h2>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-4">
                      <DetailItem label="Annual Income" value={lead.income} icon={TrendingUp} />
                      <DetailItem label="Occupation" value={lead.occupation} icon={Briefcase} />
                      <DetailItem label="Education" value={lead.education} icon={GraduationCap} />
                    </div>
                  </section>
                </div>

                {/* Column 2: Address & Health */}
                <div className="p-6 md:p-10 space-y-10">
                  {/* Physical Address */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
                        <MapPin size={16} />
                      </div>
                      <h2 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Physical Address</h2>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-4">
                      <DetailItem label="Street / Flat" value={lead.address || '—'} icon={MapPin} />
                      <DetailItem label="Area & Post" value={`${lead.area || ''} ${lead.pincode || ''}`} icon={Building} />
                    </div>
                    {lead.mapLink && (
                      <div className="pt-4">
                        <a href={lead.mapLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 text-[12px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white">
                          <MapPin size={14} /> View Location
                        </a>
                      </div>
                    )}
                  </section>

                  {/* Health & Insurance */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-600">
                        <HeartPulse size={16} />
                      </div>
                      <h2 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Health & Insurance</h2>
                    </div>
                    <div className="space-y-6">
                      {/* Medeclaim Status */}
                      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between mb-5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Medeclaim Status</p>
                          {lead.hasMedeclaim ? (
                            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-emerald-500 text-white">Active Policy</span>
                          ) : (
                            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-slate-200 text-slate-500">No Policy</span>
                          )}
                        </div>
                        {lead.hasMedeclaim ? (
                          <div className="grid grid-cols-2 gap-6 mt-2">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Company</p>
                              <p className="text-[15px] font-semibold text-slate-800">{lead.insuranceCompany || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Sum Assured</p>
                              <p className="text-[15px] font-semibold text-slate-800">{lead.sumAssured || '—'}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[13px] italic text-slate-500">No insurance information provided.</p>
                        )}
                      </div>

                      {/* Health Conditions */}
                      {lead.healthStatus && (
                        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                          <p className="text-[11px] font-bold uppercase tracking-wider mb-5 text-slate-500">Known Health Conditions</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.entries(lead.healthStatus).map(([key, val]) => {
                              const isFit = key.toLowerCase() === 'fit';
                              return (
                                <div 
                                  key={key} 
                                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                                    val 
                                      ? (isFit ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700')
                                      : 'bg-white border-slate-200 text-slate-400'
                                  }`}
                                >
                                  <div className={`w-2 h-2 rounded-full ${val ? (isFit ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-slate-200'}`} />
                                  <span className="text-[12px] font-bold uppercase tracking-wider">{key}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>

              {/* Family Overview - Bottom Row of Main Section */}
              <div className="border-t p-8 md:p-10 bg-slate-50/50" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
                    <Users size={16} />
                  </div>
                  <h2 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Family Overview (Ages)</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {Object.entries(lead.familyAges || {}).map(([member, age]) => (
                    <div key={member} className="bg-white border p-4 rounded-2xl text-center shadow-sm hover:border-indigo-100 transition-colors" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-slate-400">{member.replace(/child/i, 'Child ')}</p>
                      <p className="text-[18px] font-bold text-indigo-600">{age || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Protocol Info - Compact Row */}
            <div className="bg-white rounded-2xl border shadow-sm p-5 flex flex-col md:flex-row items-center justify-between gap-6" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Shield size={16} />
                </div>
                <div>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Assignment Details</h3>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Assigned to: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{lead.tseName}</span> · TL: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{lead.tlName}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg border" style={{ background: 'var(--brand-soft)', borderColor: 'rgba(108,92,231,0.2)' }}>
                <Calendar size={12} style={{ color: 'var(--brand)' }} />
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--brand)' }}>{lead.dateOfVisit || 'No Visit Date'}</span>
              </div>
            </div>

            {/* ── Classic Protocol Action Area ── */}
            <div className="rounded-2xl border p-6 flex flex-col items-center gap-5 text-center" style={{ background: 'var(--bg-row-hover)', borderColor: 'var(--border)' }}>
              <div className="space-y-1.5">
                <h3 className="text-[15px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Protocol Acknowledgment</h3>
                <p className="text-[13px] max-w-md" style={{ color: 'var(--text-muted)' }}>Please confirm you have visited the client and reviewed all necessary details.</p>
              </div>

              {lead.isReadByVisitor ? (
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                  <CheckCircle2 size={16} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Acknolwedged at {new Date(lead.readAt!).toLocaleTimeString()}</span>
                </div>
              ) : (
                <button
                  onClick={markAsRead}
                  disabled={submitting}
                  className="px-8 py-3 text-[12px] font-semibold uppercase tracking-[0.2em] rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2.5"
                  style={{ background: 'var(--brand)', color: '#fff' }}
                >
                  <Send size={14} /> Mark as Visited
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Original View: Left Column (Lead Info) */
          <div className="lg:col-span-1 space-y-6">
            <div className="card relative overflow-hidden group" style={{ padding: '20px' }}>
              {/* Decorative background element */}
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative flex flex-col items-center text-center">
                <div className="w-20 h-20 mb-4 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-sky-500 p-0.5 shadow-xl shadow-indigo-200/50 transform group-hover:rotate-3 transition-transform">
                  <div className="w-full h-full rounded-[1.9rem] bg-white flex items-center justify-center text-3xl font-black text-indigo-600">
                    {lead.name.charAt(0)}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tighter leading-tight">{lead.name}</h1>
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

                <p className="text-gray-500 font-medium text-gray-400 flex items-center gap-1.5 mt-2 transition-colors text-sm">
                  <Building className="w-4 h-4 text-indigo-400" />
                  {lead.company || 'Private Individual'}
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
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

            <div className="card" style={{ padding: '20px', background: 'linear-gradient(145deg, #ffffff, var(--bg-page))' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Quick Actions
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--brand)' }} />
              </h3>
              <div className="flex flex-col gap-2.5">
                {/* ── Button 1: Automate App Call (existing hardware-verified method) ── */}
                <button
                  onClick={() => {
                    if (lead.phone) {
                      setIsDialing(true);
                      window.open(`tel:${lead.phone}`, '_self');

                      // Auto-open 1-Click Post-Call Disposition modal when returning to CRM tab
                      const handleReturn = () => {
                        if (document.visibilityState === 'visible') {
                          document.removeEventListener('visibilitychange', handleReturn);
                          setIsDialing(false);
                          setIsDispositionOpen(true);
                        }
                      };
                      document.addEventListener('visibilitychange', handleReturn);

                      setTimeout(() => {
                        setIsDialing(false);
                        setIsDispositionOpen(true);
                      }, 3000);
                    } else {
                      showToast('No phone number available for this lead.', 'error', 'Error');
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all group ${isDialing ? 'bg-[#ecfdf5] border-[rgba(16,185,129,0.3)]' : 'bg-white border-[var(--border-strong)] hover:border-[var(--brand)] hover:shadow-[0_4px_12px_rgba(108,92,231,0.08)]'}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 ${isDialing ? 'bg-[#10b981] text-white' : 'bg-[var(--brand-soft)] text-[var(--brand)]'}`}>
                    <Phone size={16} className={isDialing ? 'animate-pulse' : ''} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span style={{ fontSize: '13px', fontWeight: 600, color: isDialing ? '#059669' : 'var(--text-primary)' }}>
                      {isDialing ? 'Initiating Dialer...' : 'Call Client'}
                    </span>
                    <span style={{ fontSize: '11px', color: isDialing ? '#10b981' : 'var(--text-muted)' }}>
                      {isDialing ? 'Automate app will sync duration' : 'Hardware Verified (App)'}
                    </span>
                  </div>
                </button>

                {/* ── Button 2: Smart Call — Browser Timer (Samsung / No Automate App) ── */}
                <button
                  onClick={handleSmartCall}
                  disabled={isBrowserCallActive}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all group ${isBrowserCallActive
                    ? 'bg-[#fffbeb] border-[rgba(245,158,11,0.3)]'
                    : browserCallResult
                      ? 'bg-[#eff6ff] border-[rgba(59,130,246,0.3)]'
                      : 'bg-white border-[var(--border-strong)] hover:border-[#f59e0b] hover:shadow-[0_4px_12px_rgba(245,158,11,0.08)]'
                    }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 ${isBrowserCallActive ? 'bg-[#f59e0b] text-white' :
                    browserCallResult ? 'bg-[#3b82f6] text-white' : 'bg-[#fffbeb] text-[#f59e0b]'
                    }`}>
                    <Phone size={16} className={isBrowserCallActive ? 'animate-bounce' : ''} />
                  </div>
                  <div className="flex flex-col text-left flex-1 min-w-0">
                    <span className="truncate" style={{ fontSize: '13px', fontWeight: 600, color: isBrowserCallActive ? '#d97706' : browserCallResult ? '#2563eb' : 'var(--text-primary)' }}>
                      {isBrowserCallActive ? 'Call Active (Return Here)' :
                        browserCallResult ? '✓ Call Logged' : 'Smart Call (Browser)'}
                    </span>
                    <span className="truncate" style={{ fontSize: '11px', color: isBrowserCallActive ? '#f59e0b' : browserCallResult ? '#3b82f6' : 'var(--text-muted)' }}>
                      {isBrowserCallActive
                        ? 'Auto-saves duration on return'
                        : browserCallResult
                          ? `${Math.floor(browserCallResult.duration / 60)}m ${browserCallResult.duration % 60}s · ${browserCallResult.trustLabel}`
                          : 'No App Required'}
                    </span>
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-2.5 mt-1">
                  <button
                    onClick={() => setActiveModal('whatsapp')}
                    className="flex flex-col gap-2 px-3 py-3 rounded-xl border border-[var(--border-strong)] bg-white hover:border-[#10b981] hover:shadow-[0_4px_12px_rgba(16,185,129,0.08)] transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] flex items-center justify-center text-[#10b981] group-hover:scale-105 transition-transform">
                      <MessageCircle size={14} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>WhatsApp</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Instant message</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveModal('email')}
                    className="flex flex-col gap-2 px-3 py-3 rounded-xl border border-[var(--border-strong)] bg-white hover:border-[#0ea5e9] hover:shadow-[0_4px_12px_rgba(14,165,233,0.08)] transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#f0f9ff] flex items-center justify-center text-[#0ea5e9] group-hover:scale-105 transition-transform">
                      <Mail size={14} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Email</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Send an email</span>
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const bookingUrl = `${window.location.origin}/book-visit/synture-solutions`;
                    navigator.clipboard.writeText(bookingUrl);
                    showToast('Site Visit booking link copied to clipboard!', 'success', 'Link Copied');
                  }}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-[0.98] mt-2"
                >
                  <Calendar size={14} /> 🔗 Share Site Visit Booking Link
                </button>

                <button
                  type="button"
                  onClick={handleEnrichLead}
                  disabled={isEnriching}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-95 transition-all active:scale-[0.98] mt-2"
                >
                  {isEnriching ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>✨ Auto-Enrich Lead Data</span>
                  )}
                </button>

                <button
                  onClick={() => setActiveModal('note')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border-strong)] bg-white hover:border-[#f59e0b] hover:shadow-[0_4px_12px_rgba(245,158,11,0.08)] transition-all group mt-1"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#fffbeb] flex items-center justify-center text-[#f59e0b] group-hover:scale-105 transition-transform shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Add Note</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Log manual updates</span>
                  </div>
                </button>

                {/* ── Enriched Intelligence Card ── */}
                {(lead as any).isEnriched && (
                  <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-indigo-500/30 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">✨ Enriched Intelligence</span>
                      <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">Zero-LLM</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {(lead as any).jobTitle && (
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Job Title</p>
                          <p className="font-bold text-white text-sm">{(lead as any).jobTitle}</p>
                        </div>
                      )}
                      {(lead as any).industry && (
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Industry</p>
                          <p className="font-semibold text-slate-200">{(lead as any).industry}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Company Size</p>
                          <p className="font-semibold text-indigo-300">{(lead as any).companySize || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Est. Revenue</p>
                          <p className="font-semibold text-emerald-400">{(lead as any).companyRevenue || '—'}</p>
                        </div>
                      </div>

                      {(lead as any).linkedinUrl && (
                        <a
                          href={(lead as any).linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 block text-center py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-[11px] transition-all shadow-sm"
                        >
                          🔗 View LinkedIn Profile
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Right Column: Timeline / Activities (Hidden for Onsite Visitors) */}
        {!isOnsiteVisitor && (
          <div className="lg:col-span-2">
            <div className="card h-full min-h-[400px] flex flex-col" style={{ padding: '24px' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <div className="w-1.5 h-5 rounded-full" style={{ background: 'var(--brand)' }} />
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

                                {act.type === 'call' && (act.duration || act.startTime) && (
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    {act.duration >= 0 && (
                                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-md border border-emerald-100 uppercase">
                                        <Clock className="w-3 h-3" />
                                        {(() => {
                                          const d = act.duration || 0;
                                          if (d < 60) return `${d}S`;
                                          const m = Math.floor(d / 60);
                                          const s = d % 60;
                                          return s > 0 ? `${m}M ${s}S` : `${m}M`;
                                        })()}
                                      </div>
                                    )}
                                    {act.syncId && (
                                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-md border border-indigo-100 uppercase tracking-tight">
                                        <CheckCircle2 className="w-3 h-3" /> VERIFIED
                                      </div>
                                    )}
                                    {act.startTime && act.endTime && (
                                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-black rounded-md border border-slate-100 uppercase tracking-tight">
                                        <Calendar className="w-3 h-3" />
                                        {act.startTime} — {act.endTime}
                                      </div>
                                    )}
                                  </div>
                                )}

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
        )}
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
                    <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Reminder Time (12H Format)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        className="input-field"
                        value={noteHour}
                        onChange={(e) => setNoteHour(e.target.value)}
                      >
                        {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <select
                        className="input-field"
                        value={noteMinute}
                        onChange={(e) => setNoteMinute(e.target.value)}
                      >
                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        className="input-field"
                        value={notePeriod}
                        onChange={(e) => setNotePeriod(e.target.value)}
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (noteDateOnly) {
                        setSubmitting(true);
                        try {
                          // Convert 12h to 24h
                          let hour = parseInt(noteHour);
                          if (notePeriod === 'PM' && hour !== 12) hour += 12;
                          if (notePeriod === 'AM' && hour === 12) hour = 0;
                          const timeStr = `${hour.toString().padStart(2, '0')}:${noteMinute}:00`;

                          // Convert to UTC ISO string using the BROWSER's local timezone.
                          // Without .toISOString(), a bare string like '2026-04-28T08:00:00'
                          // gets stored as 8:00 AM UTC by the server (= 1:30 PM IST — 5.5 hrs late!).
                          const scheduledAt = new Date(`${noteDateOnly}T${timeStr}`).toISOString();

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
                          showToast('Note and reminder task saved successfully!', 'success', 'Saved');
                          handleLogged();
                        } catch (err: any) {
                          showToast(`Failed to save note reminder: ${err.message || 'Unknown error'}`, 'error', 'Error');
                        } finally {
                          setSubmitting(false);
                        }
                      } else {
                        await logActivity('note', { notes: noteText });
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
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Call Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={callData.date}
                      onChange={(e) => setCallData({ ...callData, date: e.target.value })}
                    />
                  </div>

                  {isSalesAgent ? (
                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center text-center gap-2">
                      <Shield className="w-8 h-8 text-indigo-600 mb-1" />
                      <p className="text-xs font-black text-indigo-900 uppercase">Automatic Verification Active</p>
                      <p className="text-[10px] text-indigo-600 font-medium leading-relaxed">
                        Call duration is tracked automatically from your phone.
                        You only need to select the result of the call below.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Start Time</label>
                        <div className="flex gap-1 items-center">
                          <select className="flex-1 h-9 bg-white border border-[#e2e8f0] rounded-lg text-[13px] font-bold text-[#1a202c] px-1 outline-none focus:border-indigo-500" value={callData.startHour} onChange={(e) => setCallData({ ...callData, startHour: e.target.value })}>
                            {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => <option key={h} value={h} className="text-gray-900 bg-white">{h}</option>)}
                          </select>
                          <span className="text-gray-400 font-bold">:</span>
                          <select className="flex-1 h-9 bg-white border border-[#e2e8f0] rounded-lg text-[13px] font-bold text-[#1a202c] px-1 outline-none focus:border-indigo-500" value={callData.startMinute} onChange={(e) => setCallData({ ...callData, startMinute: e.target.value })}>
                            {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => <option key={m} value={m} className="text-gray-900 bg-white">{m}</option>)}
                          </select>
                          <span className="text-gray-400 font-bold">:</span>
                          <select className="flex-1 h-9 bg-white border border-[#e2e8f0] rounded-lg text-[13px] font-bold text-[#1a202c] px-1 outline-none focus:border-indigo-500" value={callData.startSecond} onChange={(e) => setCallData({ ...callData, startSecond: e.target.value })}>
                            {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(s => <option key={s} value={s} className="text-gray-900 bg-white">{s}</option>)}
                          </select>
                          <select className="w-16 h-9 bg-white border border-[#e2e8f0] rounded-lg text-[11px] font-black text-indigo-600 px-1 outline-none focus:border-indigo-500 uppercase" value={callData.startPeriod} onChange={(e) => setCallData({ ...callData, startPeriod: e.target.value })}>
                            <option value="AM" className="text-indigo-600 bg-white">AM</option>
                            <option value="PM" className="text-indigo-600 bg-white">PM</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-medium text-[#64748b] uppercase tracking-wider">End Time</label>
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-indigo-100 animate-in fade-in zoom-in-95 duration-300">
                            {(() => {
                              let startH = parseInt(callData.startHour);
                              if (callData.startPeriod === 'PM' && startH !== 12) startH += 12;
                              if (callData.startPeriod === 'AM' && startH === 12) startH = 0;
                              let endH = parseInt(callData.endHour);
                              if (callData.endPeriod === 'PM' && endH !== 12) endH += 12;
                              if (callData.endPeriod === 'AM' && endH === 12) endH = 0;

                              const startSeconds = startH * 3600 + parseInt(callData.startMinute) * 60 + parseInt(callData.startSecond);
                              const endSeconds = endH * 3600 + parseInt(callData.endMinute) * 60 + parseInt(callData.endSecond);
                              const diff = endSeconds - startSeconds;

                              if (diff < 0) return 'INV';
                              if (diff < 60) return `${diff}S`;
                              const m = Math.floor(diff / 60);
                              const s = diff % 60;
                              return s > 0 ? `${m}M ${s}S` : `${m}M`;
                            })()}
                          </span>
                        </div>
                        <div className="flex gap-1 items-center">
                          <select className="flex-1 h-9 bg-white border border-[#e2e8f0] rounded-lg text-[13px] font-bold text-[#1a202c] px-1 outline-none focus:border-indigo-500" value={callData.endHour} onChange={(e) => setCallData({ ...callData, endHour: e.target.value })}>
                            {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => <option key={h} value={h} className="text-gray-900 bg-white">{h}</option>)}
                          </select>
                          <span className="text-gray-400 font-bold">:</span>
                          <select className="flex-1 h-9 bg-white border border-[#e2e8f0] rounded-lg text-[13px] font-bold text-[#1a202c] px-1 outline-none focus:border-indigo-500" value={callData.endMinute} onChange={(e) => setCallData({ ...callData, endMinute: e.target.value })}>
                            {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => <option key={m} value={m} className="text-gray-900 bg-white">{m}</option>)}
                          </select>
                          <span className="text-gray-400 font-bold">:</span>
                          <select className="flex-1 h-9 bg-white border border-[#e2e8f0] rounded-lg text-[13px] font-bold text-[#1a202c] px-1 outline-none focus:border-indigo-500" value={callData.endSecond} onChange={(e) => setCallData({ ...callData, endSecond: e.target.value })}>
                            {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(s => <option key={s} value={s} className="text-gray-900 bg-white">{s}</option>)}
                          </select>
                          <select className="w-16 h-9 bg-white border border-[#e2e8f0] rounded-lg text-[11px] font-black text-indigo-600 px-1 outline-none focus:border-indigo-500 uppercase" value={callData.endPeriod} onChange={(e) => setCallData({ ...callData, endPeriod: e.target.value })}>
                            <option value="AM" className="text-indigo-600 bg-white">AM</option>
                            <option value="PM" className="text-indigo-600 bg-white">PM</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Call Outcome</label>
                    <select
                      className="input-field"
                      value={callData.outcome}
                      onChange={(e) => setCallData({ ...callData, outcome: e.target.value })}
                    >
                      <option value="connected">Connected</option>
                      <option value="no_answer">No Answer</option>
                      <option value="busy">Busy</option>
                      <option value="voicemail">Voicemail</option>
                      <option value="callback">Callback Required</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Remarks</label>
                    <textarea
                      className="input-field resize-none"
                      rows={3}
                      placeholder="Discussed pricing..."
                      value={callData.notes}
                      onChange={(e) => setCallData({ ...callData, notes: e.target.value })}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (isSalesAgent) {
                        // Sales agents are blocked from manual duration entry
                        logActivity('call', {
                          duration: 0,
                          outcome: callData.outcome,
                          notes: callData.notes,
                          createdAt: new Date().toISOString()
                        });
                        return;
                      }

                      let startH = parseInt(callData.startHour);
                      if (callData.startPeriod === 'PM' && startH !== 12) startH += 12;
                      if (callData.startPeriod === 'AM' && startH === 12) startH = 0;

                      let endH = parseInt(callData.endHour);
                      if (callData.endPeriod === 'PM' && endH !== 12) endH += 12;
                      if (callData.endPeriod === 'AM' && endH === 12) endH = 0;

                      const startSeconds = startH * 3600 + parseInt(callData.startMinute) * 60 + parseInt(callData.startSecond);
                      const endSeconds = endH * 3600 + parseInt(callData.endMinute) * 60 + parseInt(callData.endSecond);
                      const duration = endSeconds - startSeconds;

                      if (duration < 0) return showToast('End time cannot be earlier than start time', 'error', 'Invalid Time');

                      logActivity('call', {
                        duration: duration,
                        outcome: callData.outcome,
                        notes: callData.notes,
                        createdAt: `${callData.date}T${endH.toString().padStart(2, '0')}:${callData.endMinute}:${callData.endSecond.padStart(2, '0')}`,
                        startTime: `${callData.startHour}:${callData.startMinute}:${callData.startSecond} ${callData.startPeriod}`,
                        endTime: `${callData.endHour}:${callData.endMinute}:${callData.endSecond} ${callData.endPeriod}`
                      });
                    }}
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
                      <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Meeting Date</label>
                      <input
                        type="date"
                        className="input-field"
                        value={meetingData.date}
                        onChange={(e) => setMeetingData({ ...meetingData, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Meeting Time</label>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          className="input-field"
                          value={meetingData.timeHour}
                          onChange={(e) => setMeetingData({ ...meetingData, timeHour: e.target.value })}
                        >
                          {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <select
                          className="input-field"
                          value={meetingData.timeMinute}
                          onChange={(e) => setMeetingData({ ...meetingData, timeMinute: e.target.value })}
                        >
                          {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select
                          className="input-field"
                          value={meetingData.timePeriod}
                          onChange={(e) => setMeetingData({ ...meetingData, timePeriod: e.target.value })}
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Meeting Link (Zoom/Meet)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="https://meet.google.com/xyz"
                      value={meetingData.link}
                      onChange={(e) => setMeetingData({ ...meetingData, link: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Remarks</label>
                    <textarea
                      className="input-field resize-none"
                      rows={3}
                      placeholder="Agenda items..."
                      value={meetingData.notes}
                      onChange={(e) => setMeetingData({ ...meetingData, notes: e.target.value })}
                    />
                  </div>
                  <button
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        let hour = parseInt(meetingData.timeHour);
                        if (meetingData.timePeriod === 'PM' && hour !== 12) hour += 12;
                        if (meetingData.timePeriod === 'AM' && hour === 12) hour = 0;
                        const timeStr = `${hour.toString().padStart(2, '0')}:${meetingData.timeMinute}:00`;
                        // Convert to UTC ISO using browser's local timezone (avoids 5.5hr IST offset error)
                        const scheduledAt = new Date(`${meetingData.date}T${timeStr}`).toISOString();

                        await api.post('/tasks', {
                          leadId,
                          title: `Meeting: ${lead.name}`,
                          dueDate: scheduledAt,
                          priority: 'high',
                          link: meetingData.link
                        });
                        await api.post('/activities', {
                          leadId,
                          type: 'meeting',
                          notes: meetingData.notes,
                          scheduledAt: scheduledAt,
                          link: meetingData.link
                        });
                        handleLogged();
                        showToast('Meeting scheduled and task created!', 'success', 'Scheduled');
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
                      onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Due Date</label>
                      <input
                        type="date"
                        className="input-field"
                        value={taskData.dueDate}
                        onChange={(e) => setTaskData({ ...taskData, dueDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Priority</label>
                      <select
                        className="input-field"
                        value={taskData.priority}
                        onChange={(e) => setTaskData({ ...taskData, priority: e.target.value })}
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
                        onClick={() => setWhatsappData({ ...whatsappData, isTemplate: false })}
                        className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${!whatsappData.isTemplate ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        Manual Type
                      </button>
                      <button
                        onClick={() => setWhatsappData({ ...whatsappData, isTemplate: true })}
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
                            onChange={(e) => setWhatsappData({ ...whatsappData, message: e.target.value })}
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
                            onChange={(e) => setWhatsappData({ ...whatsappData, message: e.target.value })}
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
                      if (!lead.phone) return showToast('Lead must have a phone number.', 'error', 'Error');
                      setSubmitting(true);
                      try {
                        await api.post('/activities/whatsapp', {
                          leadId: lead._id,
                          message: whatsappData.message
                        });
                        showToast('WhatsApp message sent successfully!', 'success', 'WhatsApp');
                        handleLogged();
                      } catch (err: any) {
                        showToast(err.message || 'Failed to send WhatsApp message', 'error', 'WhatsApp Error');
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
                      onClick={() => setEmailData({ ...emailData, isTemplate: false })}
                      className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${!emailData.isTemplate ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Manual Write
                    </button>
                    <button
                      onClick={() => setEmailData({ ...emailData, isTemplate: true })}
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
                              setEmailData({ ...emailData, subject: template.subject, message: template.body });
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
                        onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Body</label>
                      <textarea
                        className="input-field min-h-[160px] !bg-gray-50 focus:!bg-white"
                        placeholder="Write your email content..."
                        value={emailData.message}
                        onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
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
                      if (!lead.email) return showToast('Lead must have an email address.', 'error', 'Error');
                      setSubmitting(true);
                      try {
                        await api.post('/activities/email', {
                          leadId: lead._id,
                          subject: emailData.subject,
                          message: emailData.message
                        });
                        showToast('Email sent successfully via system!', 'success', 'Email Sent');
                        handleLogged();
                      } catch (err: any) {
                        showToast(err.message || 'Failed to send email. Check SMTP settings.', 'error', 'Email Error');
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
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Reminder Date</label>
                      <input
                        type="date"
                        className="input-field"
                        value={reminderData.date}
                        onChange={(e) => setReminderData({ ...reminderData, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Reminder Time</label>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          className="input-field"
                          value={reminderData.timeHour}
                          onChange={(e) => setReminderData({ ...reminderData, timeHour: e.target.value })}
                        >
                          {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <select
                          className="input-field"
                          value={reminderData.timeMinute}
                          onChange={(e) => setReminderData({ ...reminderData, timeMinute: e.target.value })}
                        >
                          {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select
                          className="input-field"
                          value={reminderData.timePeriod}
                          onChange={(e) => setReminderData({ ...reminderData, timePeriod: e.target.value })}
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] uppercase mb-1.5 tracking-wider">Note (Optional)</label>
                    <textarea
                      className="input-field resize-none"
                      rows={3}
                      placeholder="What should we discuss?"
                      value={reminderData.notes}
                      onChange={(e) => setReminderData({ ...reminderData, notes: e.target.value })}
                    />
                  </div>
                  <button
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        let hour = parseInt(reminderData.timeHour);
                        if (reminderData.timePeriod === 'PM' && hour !== 12) hour += 12;
                        if (reminderData.timePeriod === 'AM' && hour === 12) hour = 0;
                        const timeStr = `${hour.toString().padStart(2, '0')}:${reminderData.timeMinute}:00`;
                        // Convert to UTC ISO using browser's local timezone (avoids 5.5hr IST offset error)
                        const scheduledAt = new Date(`${reminderData.date}T${timeStr}`).toISOString();

                        await api.post('/activities', {
                          leadId,
                          type: 'call',
                          status: 'pending',
                          scheduledAt: scheduledAt,
                          notes: reminderData.notes
                        });
                        handleLogged();
                        showToast('Call reminder scheduled successfully!', 'success', 'Scheduled');
                      } catch (err) {
                        showToast('Failed to schedule reminder', 'error', 'Error');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting || !reminderData.date}
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
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
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
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                  <input
                    type="text"
                    className="input-field !bg-gray-50 !border-gray-100 !text-gray-900 focus:!bg-white focus:!border-indigo-500"
                    value={editForm.phone}
                    placeholder="+91 99999 99999"
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
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
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
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
      {/* Lead Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl border border-gray-100 p-10 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mb-2">
                <Trash2 size={36} className="text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Delete Lead Protocol</h2>
                <p className="text-sm text-gray-500 font-medium mt-2 leading-relaxed">
                  Are you absolutely sure you want to delete <strong className="text-gray-900">"{lead.name}"</strong>? This will permanently erase all history and data associated with this entry.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-10">
              <button
                onClick={handleDeleteLead}
                disabled={isDeleting}
                className="w-full py-5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-2xl transition-all shadow-xl shadow-red-100 active:scale-95 uppercase tracking-widest flex items-center justify-center gap-3"
              >
                {isDeleting ? 'Erasing Data...' : <><Trash2 size={18} /> Confirm Permanent Deletion</>}
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-full py-4 text-sm font-black text-gray-400 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Post-Call Disposition Modal */}
      {lead && (
        <PostCallDispositionModal
          isOpen={isDispositionOpen}
          onClose={() => setIsDispositionOpen(false)}
          lead={lead}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}

'use client';

import * as React from 'react';
import { 
  Building2, KeyRound, DollarSign, FileCheck, CheckCircle2, Clock, 
  AlertCircle, Download, FileText, Send, ShieldCheck, CheckSquare, 
  Plus, Search, Filter, Printer, ExternalLink, ArrowRight, User, Rocket, Cpu
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { PageHeader } from '@/components/layout/PageHeader';
import { IBooking, IPaymentMilestone, IBuyerDocument, IHandoverCheckitem } from '@/models/Booking';

export default function PostSalesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<'milestones' | 'documents' | 'handover'>('milestones');

  const isManager = user?.role === 'super_admin' || user?.role === 'org_admin' || user?.role === 'manager';

  const [bookings, setBookings] = React.useState<IBooking[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  
  // Printable Milestone Invoice Modal State
  const [selectedBookingForLetter, setSelectedBookingForLetter] = React.useState<{ booking: IBooking; milestone: IPaymentMilestone } | null>(null);

  const fetchBookings = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ bookings: IBooking[] }>('/bookings');
      setBookings(res.bookings || []);
    } catch (err: any) {
      toast('error', err.message || 'Failed to load SAP contract data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Client-side search filtering
  const filteredBookings = React.useMemo(() => {
    return bookings.filter((b) => {
      const leadName = ((b.leadId as any)?.name || '').toLowerCase();
      const unit = (b.unitNumber || '').toLowerCase();
      const proj = (b.projectName || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return leadName.includes(query) || unit.includes(query) || proj.includes(query);
    });
  }, [bookings, searchQuery]);

  // Overall Post-Sales Metrics
  const metrics = React.useMemo(() => {
    let totalBookings = bookings.length;
    let totalRevenue = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let overdueCount = 0;
    let readyForHandover = 0;

    bookings.forEach((b) => {
      totalRevenue += b.totalAmount || 0;
      if (b.status === 'ready_for_golive' || (b.status as string) === 'active_ams') {
        readyForHandover++;
      }
      (b.paymentMilestones || []).forEach((m) => {
        totalCollected += m.paidAmount || 0;
        if (m.status === 'paid') {
          // paid
        } else if ((m.status as string) === 'overdue' || (m.dueDate && new Date(m.dueDate) < new Date())) {
          overdueCount++;
          totalPending += m.amount - (m.paidAmount || 0);
        } else {
          totalPending += m.amount - (m.paidAmount || 0);
        }
      });
    });

    return {
      totalBookings,
      totalRevenueStr: `₹${(totalRevenue / 100000).toFixed(1)}L`,
      totalCollectedStr: `₹${(totalCollected / 100000).toFixed(1)}L`,
      totalPendingStr: `₹${(totalPending / 100000).toFixed(1)}L`,
      overdueCount,
      readyForHandover,
    };
  }, [bookings]);

  // Update payment milestone status
  const handleUpdateMilestoneStatus = async (bookingId: string, milestoneIdx: number, newStatus: 'paid' | 'pending' | 'overdue') => {
    const booking = bookings.find((b) => (b._id as any) === bookingId);
    if (!booking) return;

    const updatedMilestones = [...booking.paymentMilestones];
    const target = updatedMilestones[milestoneIdx];
    target.status = newStatus;
    if (newStatus === 'paid') {
      target.paidAmount = target.amount;
      target.paidDate = new Date();
    }

    try {
      await api.patch(`/bookings/${bookingId}`, { paymentMilestones: updatedMilestones });
      toast('success', `Milestone marked as ${newStatus.toUpperCase()}`);
      fetchBookings();
    } catch (err: any) {
      toast('error', err.message || 'Failed to update milestone');
    }
  };

  // Update Document Status
  const handleToggleDocStatus = async (bookingId: string, docIdx: number, currentStatus: string) => {
    const booking = bookings.find((b) => (b._id as any) === bookingId);
    if (!booking) return;

    const nextStatus = currentStatus === 'verified' ? 'pending' : currentStatus === 'pending' ? 'uploaded' : 'verified';
    const updatedDocs = [...booking.documents];
    updatedDocs[docIdx].status = nextStatus as any;

    try {
      await api.patch(`/bookings/${bookingId}`, { documents: updatedDocs });
      toast('success', `Document status updated to ${nextStatus}`);
      fetchBookings();
    } catch (err: any) {
      toast('error', err.message || 'Failed to update document status');
    }
  };

  // Update Handover Checklist Item
  const handleToggleCheckitem = async (bookingId: string, itemIdx: number, currentCompleted: boolean) => {
    const booking = bookings.find((b) => (b._id as any) === bookingId);
    if (!booking) return;

    const updatedChecklist = [...booking.handoverChecklist];
    updatedChecklist[itemIdx].completed = !currentCompleted;

    try {
      await api.patch(`/bookings/${bookingId}`, { handoverChecklist: updatedChecklist });
      toast('success', `Go-Live checklist updated`);
      fetchBookings();
    } catch (err: any) {
      toast('error', err.message || 'Failed to update checklist');
    }
  };

  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold shadow-xs">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-md">
          The Post-Sales & Client Project Onboarding module is restricted to Organization Admins and Managers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <PageHeader
        title="Post-Sales & Client Project Onboarding"
        subtitle="Automate contract milestones, enterprise compliance documents, SLA billing, and Go-Live handovers for SAP clients"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => toast('info', 'Opening New SAP Contract Modal...')}
              className="btn-primary text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Plus size={14} /> New SAP Contract
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Contracts</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Cpu size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">{metrics.totalBookings}</p>
          <p className="text-xs text-slate-500 font-medium">Enterprise SAP solution deployments</p>
        </div>

        <div className="p-5 bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collected Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600">{metrics.totalCollectedStr}</p>
          <p className="text-xs text-slate-500 font-medium">Out of {metrics.totalRevenueStr} total contract value</p>
        </div>

        <div className="p-5 bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdue Invoices</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-600">{metrics.overdueCount}</p>
          <p className="text-xs text-rose-700 font-medium">{metrics.totalPendingStr} pending milestone billing</p>
        </div>

        <div className="p-5 bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ready for Go-Live</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Rocket size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-sky-600">{metrics.readyForHandover}</p>
          <p className="text-xs text-slate-500 font-medium">Projects ready for production handover</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('milestones')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'milestones'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <DollarSign size={15} /> Billing Schedules & Milestones
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'documents'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileCheck size={15} /> Enterprise Compliance & Legal Vault
          </button>
          <button
            onClick={() => setActiveTab('handover')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'handover'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Rocket size={15} /> Go-Live & Production Handover
          </button>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search solution or client..."
            className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-slate-200 bg-white focus:border-indigo-500 outline-none font-medium"
          />
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* ── TAB 1: BILLING SCHEDULES & MILESTONES ── */}
      {activeTab === 'milestones' && (
        <div className="space-y-6">
          {filteredBookings.map((b) => {
            const leadName = (b.leadId as any)?.name || 'Client';
            const leadCompany = (b.leadId as any)?.company || (b.leadId as any)?.name || 'Enterprise Client';

            const paidSum = (b.paymentMilestones || []).reduce((acc, m) => acc + (m.paidAmount || 0), 0);
            const totalSum = b.totalAmount || 1;
            const progressPct = Math.min(100, Math.round((paidSum / totalSum) * 100));

            return (
              <div key={b._id as any} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      <Cpu size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{b.unitNumber}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {b.projectName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        Client: <strong className="text-slate-800 font-semibold">{leadCompany}</strong> ({leadName})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contract Value</p>
                      <p className="text-lg font-black text-slate-900">₹{(b.totalAmount / 100000).toFixed(1)} Lakhs</p>
                    </div>
                    <div className="w-32">
                      <div className="flex justify-between text-[10px] font-bold mb-1">
                        <span className="text-slate-500">Billed</span>
                        <span className="text-emerald-600 font-black">{progressPct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Milestone Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Contract Milestone Stage</th>
                        <th className="py-2.5 px-3">Amount Due</th>
                        <th className="py-2.5 px-3">Due Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(b.paymentMilestones || []).map((m, idx) => {
                        const isOverdue = m.status === 'overdue' || (m.dueDate && new Date(m.dueDate) < new Date() && m.status !== 'paid');

                        return (
                          <tr key={m._id || idx} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-bold text-slate-800">{m.name}</td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">₹{(m.amount / 100000).toFixed(2)}L</td>
                            <td className="py-3 px-3 text-slate-600">
                              {m.dueDate ? new Date(m.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-3 px-3">
                              {m.status === 'paid' ? (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-[10px] border border-emerald-200/60 inline-flex items-center gap-1">
                                  <CheckCircle2 size={11} /> Billed & Paid
                                </span>
                              ) : isOverdue ? (
                                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-lg text-[10px] border border-rose-200/60 inline-flex items-center gap-1">
                                  <AlertCircle size={11} /> Overdue Invoice
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-lg text-[10px] border border-amber-200/60 inline-flex items-center gap-1">
                                  <Clock size={11} /> Pending Billing
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right space-x-2">
                              {m.status !== 'paid' && (
                                <button
                                  onClick={() => handleUpdateMilestoneStatus(b._id as any, idx, 'paid')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] transition-all shadow-2xs"
                                >
                                  Mark Paid
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedBookingForLetter({ booking: b, milestone: m })}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px] transition-all inline-flex items-center gap-1"
                              >
                                <FileText size={11} /> Milestone Invoice
                              </button>
                              <button
                                onClick={() => toast('success', `WhatsApp milestone reminder sent to ${leadName}`)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[10px] transition-all inline-flex items-center gap-1"
                              >
                                <Send size={10} /> WhatsApp
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 2: ENTERPRISE COMPLIANCE & LEGAL VAULT ── */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Client & Solution Package</th>
                  <th className="py-3.5 px-4">Master Services Agreement (MSA)</th>
                  <th className="py-3.5 px-4">Service Level Agreement (SLA)</th>
                  <th className="py-3.5 px-4">Data Protection & GDPR</th>
                  <th className="py-3.5 px-4">License Entitlement Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredBookings.map((b) => {
                  const leadName = (b.leadId as any)?.name || 'Client';

                  return (
                    <tr key={b._id as any} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-900 text-sm">{leadName}</p>
                        <p className="text-xs text-indigo-600 font-semibold">{b.unitNumber}</p>
                      </td>
                      {(b.documents || []).map((doc, dIdx) => (
                        <td key={dIdx} className="py-4 px-4">
                          <button
                            onClick={() => handleToggleDocStatus(b._id as any, dIdx, doc.status)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                              doc.status === 'verified'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : doc.status === 'uploaded'
                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {doc.status === 'verified' ? '✓ Executed' : doc.status === 'uploaded' ? '⌛ Under Review' : '○ Pending Signoff'}
                          </button>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: GO-LIVE & PRODUCTION HANDOVER ── */}
      {activeTab === 'handover' && (
        <div className="space-y-6">
          {filteredBookings.map((b) => {
            const leadName = (b.leadId as any)?.name || 'Client';

            return (
              <div key={b._id as any} className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{b.unitNumber} - Go-Live & Handover Checklist</h3>
                    <p className="text-xs text-slate-500">Enterprise Client: <strong className="text-slate-800">{leadName}</strong></p>
                  </div>
                  <span className="px-3 py-1 bg-sky-50 text-sky-700 font-bold rounded-full text-xs border border-sky-100 flex items-center gap-1.5">
                    <Rocket size={14} /> Production Go-Live Ready
                  </span>
                </div>

                <div className="space-y-2">
                  {(b.handoverChecklist || []).map((chk, cIdx) => (
                    <div
                      key={cIdx}
                      onClick={() => handleToggleCheckitem(b._id as any, cIdx, chk.completed)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        chk.completed ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 font-semibold text-xs">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${chk.completed ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'}`}>
                          {chk.completed && '✓'}
                        </div>
                        <span>{chk.item}</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase">{chk.completed ? 'Passed' : 'Pending Milestone'}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PRINTABLE SAP MILESTONE INVOICE MODAL ── */}
      {selectedBookingForLetter && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 space-y-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">SAP B2B Enterprise Solutions & Services Ltd.</h2>
                <p className="text-xs text-slate-500">Official Milestone Invoice & License Entitlement Statement</p>
              </div>
              <button
                onClick={() => setSelectedBookingForLetter(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Letter Content */}
            <div className="space-y-4 text-xs leading-relaxed text-slate-700">
              <div className="flex justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enterprise Client</p>
                  <p className="font-bold text-slate-900 text-sm">{((selectedBookingForLetter.booking.leadId as any)?.name) || 'Valued Client'}</p>
                  <p className="text-slate-500">Account Contact: {((selectedBookingForLetter.booking.leadId as any)?.email) || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solution Package</p>
                  <p className="font-bold text-indigo-700 text-sm">{selectedBookingForLetter.booking.unitNumber}</p>
                  <p className="text-slate-500">{selectedBookingForLetter.booking.projectName}</p>
                </div>
              </div>

              <p>
                Dear <strong>{((selectedBookingForLetter.booking.leadId as any)?.name) || 'Client'}</strong>,
              </p>
              <p>
                This invoice serves as confirmation that deployment milestone <strong className="text-indigo-900 font-bold">{selectedBookingForLetter.milestone.name}</strong> for your solution <strong>{selectedBookingForLetter.booking.unitNumber}</strong> is ready for billing.
              </p>

              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2">
                <div className="flex justify-between font-bold">
                  <span>Contract Milestone Stage:</span>
                  <span className="text-slate-900">{selectedBookingForLetter.milestone.name}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Milestone Billing Amount:</span>
                  <span className="text-indigo-900 font-mono text-base">₹{selectedBookingForLetter.milestone.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Payment Due Date:</span>
                  <span>{new Date(selectedBookingForLetter.milestone.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                Please remit the invoice amount via wire transfer / electronic payment payable to SAP B2B Enterprise Solutions & Services Ltd.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                onClick={() => {
                  window.print();
                }}
                className="btn-primary text-xs font-bold flex items-center gap-2"
              >
                <Printer size={14} /> Print Invoice
              </button>
              <button
                onClick={() => {
                  toast('success', `Milestone invoice emailed to client!`);
                  setSelectedBookingForLetter(null);
                }}
                className="btn-secondary text-xs font-bold flex items-center gap-2"
              >
                <Send size={14} /> Email Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

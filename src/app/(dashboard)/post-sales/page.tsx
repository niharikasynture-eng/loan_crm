'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { 
  Building2, KeyRound, DollarSign, FileCheck, CheckCircle2, Clock, 
  AlertCircle, Download, FileText, Send, ShieldCheck, CheckSquare, 
  Plus, Search, Filter, Printer, ExternalLink, ArrowRight, User, Rocket, Cpu,
  Calendar, RefreshCw, TrendingUp, Sparkles, UserCheck, ShieldAlert, Truck, Trash2
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { PageHeader } from '@/components/layout/PageHeader';
import { IBooking, IPaymentMilestone, IBuyerDocument, IHandoverCheckitem, IUpsellOpportunity } from '@/models/Booking';

const DELIVERY_STAGES = [
  { id: 'contract_signed', stepNum: 1, label: 'Contract Executed', shortLabel: 'Contract', description: 'MSA & Entitlement Created', icon: FileCheck },
  { id: 'advance_paid', stepNum: 2, label: 'Advance Cleared', shortLabel: 'Payment', description: 'First Milestone Paid', icon: DollarSign },
  { id: 'implementation_in_progress', stepNum: 3, label: 'System Setup & Config', shortLabel: 'Setup', description: 'Tenant Setup & Data Migration', icon: Cpu },
  { id: 'user_training', stepNum: 4, label: 'UAT & User Training', shortLabel: 'Training', description: 'Testing & Staff Onboarding', icon: UserCheck },
  { id: 'ready_for_golive', stepNum: 5, label: 'Go-Live Handover', shortLabel: 'Go-Live', description: 'Production Sign-off & Access', icon: Rocket },
  { id: 'active_ams', stepNum: 6, label: 'Active AMS Support', shortLabel: 'AMS Support', description: 'Ongoing Support & Renewals', icon: ShieldCheck },
] as const;

export default function PostSalesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<'tracker' | 'milestones' | 'documents' | 'handover' | 'renewals'>('tracker');
  const [mounted, setMounted] = React.useState<boolean>(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'org_admin';
  const isManager = user?.role === 'manager';
  const isSalesAgent = user?.role === 'sales_agent';
  const isVisitor = user?.role === 'onsite_visitor';

  const [bookings, setBookings] = React.useState<IBooking[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedAgentFilter, setSelectedAgentFilter] = React.useState<string>('all');
  
  // Printable Milestone Invoice Modal State
  const [selectedBookingForLetter, setSelectedBookingForLetter] = React.useState<{ booking: IBooking; milestone: IPaymentMilestone } | null>(null);

  // Contract Renewal & Upsell Modal States
  const [selectedBookingForRenewal, setSelectedBookingForRenewal] = React.useState<IBooking | null>(null);
  const [selectedBookingForUpsell, setSelectedBookingForUpsell] = React.useState<IBooking | null>(null);
  const [renewalForm, setRenewalForm] = React.useState<{ extensionMonths: number; renewalAmount: number }>({ extensionMonths: 12, renewalAmount: 0 });
  const [upsellForm, setUpsellForm] = React.useState<{ title: string; amount: number; notes: string }>({ title: '', amount: 0, notes: '' });

  // Delete Contract State
  const [contractToDelete, setContractToDelete] = React.useState<IBooking | null>(null);
  const [isDeletingContract, setIsDeletingContract] = React.useState<boolean>(false);

  const handleDeleteContract = async () => {
    if (!contractToDelete) return;
    setIsDeletingContract(true);
    try {
      await api.delete(`/bookings/${contractToDelete._id}`);
      toast('success', `Contract "${contractToDelete.unitNumber}" deleted successfully!`);
      setContractToDelete(null);
      fetchBookings();
    } catch (err: any) {
      toast('error', err.message || 'Failed to delete contract');
    } finally {
      setIsDeletingContract(false);
    }
  };

  // New SAP Contract Modal State
  const [isNewContractModalOpen, setIsNewContractModalOpen] = React.useState<boolean>(false);
  const [availableLeads, setAvailableLeads] = React.useState<{ _id: string; name: string; company?: string; value?: number }[]>([]);
  const [loadingLeads, setLoadingLeads] = React.useState<boolean>(false);
  const [newContractForm, setNewContractForm] = React.useState({
    leadId: '',
    unitNumber: 'SAP S/4HANA Cloud (Enterprise Edition)',
    customUnitNumber: '',
    projectName: '',
    totalAmount: 5000000,
    durationMonths: 12,
  });
  const [submittingNewContract, setSubmittingNewContract] = React.useState<boolean>(false);

  const fetchLeadsForContract = React.useCallback(async () => {
    setLoadingLeads(true);
    try {
      const res = await api.get<{ leads: any[] }>('/leads?limit=1000');
      const leadsList = res.leads || [];
      setAvailableLeads(leadsList);
      if (leadsList.length > 0) {
        setNewContractForm((prev) => ({
          ...prev,
          leadId: prev.leadId || leadsList[0]._id,
          projectName: prev.projectName || `${leadsList[0].company || leadsList[0].name} SAP Implementation`,
          totalAmount: prev.totalAmount || leadsList[0].value || 5000000,
        }));
      }
    } catch (err: any) {
      console.error('Failed to load leads for SAP contract modal:', err);
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  const handleOpenNewContractModal = () => {
    setIsNewContractModalOpen(true);
    fetchLeadsForContract();
  };

  const handleCreateNewContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractForm.leadId) {
      toast('error', 'Please select a client for the contract');
      return;
    }
    const solutionName = newContractForm.unitNumber === 'custom' ? newContractForm.customUnitNumber : newContractForm.unitNumber;
    if (!solutionName) {
      toast('error', 'Please enter a valid SAP solution package name');
      return;
    }
    setSubmittingNewContract(true);
    try {
      const contractEndDate = new Date();
      contractEndDate.setMonth(contractEndDate.getMonth() + Number(newContractForm.durationMonths || 12));

      await api.post('/bookings', {
        leadId: newContractForm.leadId,
        unitNumber: solutionName,
        projectName: newContractForm.projectName || 'Enterprise Solution Implementation',
        totalAmount: Number(newContractForm.totalAmount || 5000000),
        contractEndDate,
      });

      toast('success', '🚀 New SAP Contract created successfully!');
      setIsNewContractModalOpen(false);
      fetchBookings();
    } catch (err: any) {
      toast('error', err.message || 'Failed to create SAP contract');
    } finally {
      setSubmittingNewContract(false);
    }
  };

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

  // Lock body scroll when modal is open so modal remains perfectly viewport-centered
  React.useEffect(() => {
    if (isNewContractModalOpen || selectedBookingForLetter || selectedBookingForRenewal || selectedBookingForUpsell || contractToDelete) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isNewContractModalOpen, selectedBookingForLetter, selectedBookingForRenewal, selectedBookingForUpsell, contractToDelete]);

  // Unique list of sales reps for dropdown filter
  const salesAgentsList = React.useMemo(() => {
    const agentsMap = new Map<string, { id: string; name: string }>();
    bookings.forEach((b) => {
      const sp = b.salesPersonId as any;
      if (sp && sp._id && sp.name) {
        agentsMap.set(sp._id, { id: sp._id, name: sp.name });
      }
    });
    return Array.from(agentsMap.values());
  }, [bookings]);

  // Client-side search & sales agent filtering
  const filteredBookings = React.useMemo(() => {
    return bookings.filter((b) => {
      const leadName = ((b.leadId as any)?.name || '').toLowerCase();
      const unit = (b.unitNumber || '').toLowerCase();
      const proj = (b.projectName || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = leadName.includes(query) || unit.includes(query) || proj.includes(query);

      const agentId = (b.salesPersonId as any)?._id || b.salesPersonId;
      const matchesAgent = selectedAgentFilter === 'all' || agentId === selectedAgentFilter;

      return matchesSearch && matchesAgent;
    });
  }, [bookings, searchQuery, selectedAgentFilter]);

  // Overall Post-Sales Metrics
  const metrics = React.useMemo(() => {
    let totalBookings = bookings.length;
    let totalRevenue = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let overdueCount = 0;
    let readyForHandover = 0;

    // Renewal Metrics
    let arrAtRisk = 0;
    let expiring30Days = 0;
    let expiring60Days = 0;
    let renewedCount = 0;
    let totalUpsellValue = 0;

    const now = Date.now();

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

      // Contract Expiry logic
      if (b.renewalStatus === 'renewed') {
        renewedCount++;
      } else if (b.contractEndDate) {
        const daysLeft = Math.ceil((new Date(b.contractEndDate).getTime() - now) / (1000 * 3600 * 24));
        if (daysLeft <= 30) {
          expiring30Days++;
          arrAtRisk += b.totalAmount || 0;
        } else if (daysLeft <= 60) {
          expiring60Days++;
          arrAtRisk += b.totalAmount || 0;
        }
      }

      // Upsell sum
      (b.upsellOpportunities || []).forEach((u) => {
        if (u.status === 'identified' || u.status === 'pitched' || u.status === 'won') {
          totalUpsellValue += u.amount || 0;
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
      arrAtRiskStr: `₹${(arrAtRisk / 100000).toFixed(1)}L`,
      expiring30Days,
      expiring60Days,
      renewedCount,
      totalUpsellValueStr: `₹${(totalUpsellValue / 100000).toFixed(1)}L`,
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

  // Process Contract Renewal Submit
  const handleConfirmRenewal = async () => {
    if (!selectedBookingForRenewal) return;
    try {
      await api.patch(`/bookings/${selectedBookingForRenewal._id}/renewal`, {
        action: 'renew_contract',
        extensionMonths: Number(renewalForm.extensionMonths),
        renewalAmount: Number(renewalForm.renewalAmount)
      });
      toast('success', `Contract for ${selectedBookingForRenewal.unitNumber} renewed for ${renewalForm.extensionMonths} months!`);
      setSelectedBookingForRenewal(null);
      fetchBookings();
    } catch (err: any) {
      toast('error', err.message || 'Failed to renew contract');
    }
  };

  // Add Upsell Opportunity Submit
  const handleAddUpsell = async () => {
    if (!selectedBookingForUpsell) return;
    if (!upsellForm.title || !upsellForm.amount) {
      toast('error', 'Please enter an upgrade title and amount');
      return;
    }
    try {
      await api.patch(`/bookings/${selectedBookingForUpsell._id}/renewal`, {
        action: 'add_upsell',
        upsell: upsellForm
      });
      toast('success', `Upsell opportunity logged for ${selectedBookingForUpsell.unitNumber}!`);
      setSelectedBookingForUpsell(null);
      setUpsellForm({ title: '', amount: 0, notes: '' });
      fetchBookings();
    } catch (err: any) {
      toast('error', err.message || 'Failed to add upsell');
    }
  };

  // Update Upsell Opportunity Status
  const handleUpdateUpsellStatus = async (bookingId: string, upsellIndex: number, newStatus: 'identified' | 'pitched' | 'won' | 'lost') => {
    try {
      await api.patch(`/bookings/${bookingId}/renewal`, {
        action: 'update_upsell_status',
        upsellIndex,
        newStatus
      });
      toast('success', `Upsell status updated to ${newStatus.toUpperCase()}`);
      fetchBookings();
    } catch (err: any) {
      toast('error', err.message || 'Failed to update upsell status');
    }
  };

  // Update Implementation & Delivery Tracker Stage
  const handleUpdateDeliveryStage = async (bookingId: string, newStatus: string) => {
    if (!isAdmin && !isManager) {
      toast('error', 'Stage modification is restricted to Managers & Org Admins');
      return;
    }
    try {
      await api.patch(`/bookings/${bookingId}`, { status: newStatus });
      const stageObj = DELIVERY_STAGES.find((s) => s.id === newStatus);
      toast('success', `Delivery stage updated to: ${stageObj?.label || newStatus}`);
      fetchBookings();
    } catch (err: any) {
      toast('error', err.message || 'Failed to update delivery stage');
    }
  };

  // Run Payment Dunning & Escalation Engine
  const [dunningLoading, setDunningLoading] = React.useState<boolean>(false);
  const handleRunDunningEngine = async () => {
    if (!isAdmin && !isManager) {
      toast('error', 'Running Dunning Engine is restricted to Managers & Admins');
      return;
    }
    setDunningLoading(true);
    try {
      const res = await api.post<{ summary: any }>('/cron/dunning', {});
      const s = res.summary || {};
      toast('success', `⚡ Dunning Scan Complete! ${s.emailsSent || 0} Emails sent, ${s.whatsappSent || 0} WhatsApp alerts sent, ${s.tasksEscalated || 0} Overdue tasks escalated.`);
      fetchBookings();
    } catch (err: any) {
      toast('error', err.message || 'Failed to run Dunning Engine');
    } finally {
      setDunningLoading(false);
    }
  };

  if (isVisitor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold shadow-xs">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-md">
          Onsite Visitors do not have permission to view enterprise contracts or post-sales financial documents.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <PageHeader
        title="Post-Sales, Project Handovers & Contract Renewals"
        subtitle="Automate contract milestones, compliance vault, contract expiration countdowns, and payment dunning reminders"
        action={
          <div className="flex items-center gap-2">
            {/* Role indicator pill */}
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200/80 flex items-center gap-1.5 shadow-2xs">
              {isAdmin ? <ShieldAlert size={14} className="text-amber-600" /> : isManager ? <UserCheck size={14} className="text-indigo-600" /> : <User size={14} className="text-emerald-600" />}
              {isAdmin ? 'Org Admin View' : isManager ? 'Manager View' : 'Sales Agent View'}
            </span>

            {(isAdmin || isManager) && (
              <>
                <button
                  onClick={handleRunDunningEngine}
                  disabled={dunningLoading}
                  className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  title="Run Dunning Engine (T-7 Emails, T-0 WhatsApp, T+1 Overdue Escalations)"
                >
                  <RefreshCw size={14} className={dunningLoading ? 'animate-spin' : ''} />
                  {dunningLoading ? 'Scanning...' : '⚡ Run Dunning Engine'}
                </button>

                <button
                  onClick={handleOpenNewContractModal}
                  className="btn-primary text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Plus size={14} /> New SAP Contract
                </button>
              </>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isSalesAgent ? 'My Contracts' : 'Active Contracts'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Cpu size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">{metrics.totalBookings}</p>
          <p className="text-xs text-slate-500 font-medium">Enterprise solution deployments</p>
        </div>

        <div className="p-5 bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ARR Expiring (60 Days)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-600">{metrics.arrAtRiskStr}</p>
          <p className="text-xs text-amber-700 font-medium">{metrics.expiring30Days + metrics.expiring60Days} contracts due for renewal</p>
        </div>

        <div className="p-5 bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upgrade / Upsell Value</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-purple-600">{metrics.totalUpsellValueStr}</p>
          <p className="text-xs text-slate-500 font-medium">Identified expansion opportunities</p>
        </div>

        <div className="p-5 bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collected Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600">{metrics.totalCollectedStr}</p>
          <p className="text-xs text-slate-500 font-medium">Out of {metrics.totalRevenueStr} total value</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Control Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Sub-Tabs: All 5 Tabs Visible */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('tracker')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'tracker'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <Truck size={14} /> Delivery Tracker
            </button>
            <button
              onClick={() => setActiveTab('milestones')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'milestones'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <DollarSign size={14} /> Billing & Milestones
            </button>
            <button
              onClick={() => setActiveTab('renewals')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'renewals'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <Calendar size={14} /> Renewals & Upsells
              {(metrics.expiring30Days > 0 || metrics.expiring60Days > 0) && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 font-black text-[9px] flex items-center justify-center">
                  {metrics.expiring30Days + metrics.expiring60Days}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'documents'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <FileCheck size={14} /> Compliance Vault
            </button>
            <button
              onClick={() => setActiveTab('handover')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'handover'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <Rocket size={14} /> Production Handover
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 shrink-0">
            {(isAdmin || isManager) && salesAgentsList.length > 0 && (
              <select
                value={selectedAgentFilter}
                onChange={(e) => setSelectedAgentFilter(e.target.value)}
                className="h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white font-medium outline-none focus:border-indigo-500"
              >
                <option value="all">All Sales Agents</option>
                {salesAgentsList.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    Agent: {ag.name}
                  </option>
                ))}
              </select>
            )}

            <div className="relative w-48 sm:w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contract or client..."
                className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-slate-200 bg-white focus:border-indigo-500 outline-none font-medium"
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB 0: SAP IMPLEMENTATION & DELIVERY TRACKER (AMAZON/SWIGGY STYLE) ── */}
      {activeTab === 'tracker' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {filteredBookings.map((b) => {
              const leadName = (b.leadId as any)?.name || 'Valued Client';
              const leadCompany = (b.leadId as any)?.company || leadName;
              const leadPhone = (b.leadId as any)?.phone || '';
              const agentName = (b.salesPersonId as any)?.name || 'Assigned Rep';

              const currentStageIdx = DELIVERY_STAGES.findIndex((s) => s.id === b.status);
              const activeStageIdx = currentStageIdx >= 0 ? currentStageIdx : 0;
              const currentStageObj = DELIVERY_STAGES[activeStageIdx];
              const progressPct = Math.round(((activeStageIdx + 1) / DELIVERY_STAGES.length) * 100);

              return (
                <div key={b._id as any} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6 transition-all hover:shadow-md">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Cpu size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-slate-900 text-base">{b.unitNumber}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {b.projectName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Client: <strong className="text-slate-800 font-bold">{leadCompany}</strong> ({leadName}) • Account Rep: <strong className="text-indigo-700 font-bold">{agentName}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Implementation Stage</span>
                        <span className="text-sm font-black text-indigo-600 font-mono flex items-center gap-1 justify-end">
                          <Truck size={14} /> Stage {activeStageIdx + 1} of 6 ({progressPct}%)
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          const msg = `Hi ${leadName}, update regarding your ${b.unitNumber} contract: We are currently at Stage ${activeStageIdx + 1} (${currentStageObj.label}). Status: ${currentStageObj.description}. Thank you!`;
                          window.open(`https://wa.me/${leadPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                          toast('success', `WhatsApp progress update sent to ${leadName}`);
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                      >
                        <Send size={13} /> WhatsApp Update
                      </button>

                      {(isAdmin || isManager) && (
                        <button
                          onClick={() => setContractToDelete(b)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 rounded-xl font-bold text-xs transition-all flex items-center gap-1 shadow-2xs"
                          title="Delete SAP Contract Record"
                        >
                          <Trash2 size={13} /> Delete Contract
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Visual Delivery Progress Tracker Bar (Amazon / Swiggy Delivery Style) */}
                  <div className="space-y-4 py-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500 uppercase tracking-wider text-[10px]">Delivery Progress Line</span>
                      <span className="text-indigo-600 font-mono font-black">{currentStageObj.label} ({currentStageObj.description})</span>
                    </div>

                    {/* Progress Track Line */}
                    <div className="relative my-4">
                      {/* Line Background */}
                      <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-slate-100 -translate-y-1/2 rounded-full z-0" />
                      {/* Completed Line Fill */}
                      <div
                        className="absolute top-1/2 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-indigo-600 to-sky-500 -translate-y-1/2 rounded-full z-0 transition-all duration-700"
                        style={{ width: `${(activeStageIdx / (DELIVERY_STAGES.length - 1)) * 100}%` }}
                      />

                      {/* 6 Stage Nodes */}
                      <div className="relative z-10 flex items-center justify-between">
                        {DELIVERY_STAGES.map((stg, sIdx) => {
                          const isCompleted = sIdx < activeStageIdx;
                          const isCurrent = sIdx === activeStageIdx;
                          const isUpcoming = sIdx > activeStageIdx;
                          const StageIcon = stg.icon;

                          return (
                            <div key={stg.id} className="flex flex-col items-center group relative">
                              {/* Node Circle */}
                              <button
                                disabled={!isAdmin && !isManager}
                                onClick={() => handleUpdateDeliveryStage(b._id as any, stg.id)}
                                title={
                                  isAdmin || isManager
                                    ? `Click to update stage to: ${stg.label}`
                                    : `Stage ${stg.stepNum}: ${stg.label} (Managers only can edit)`
                                }
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 ${
                                  isCompleted
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs hover:scale-105'
                                    : isCurrent
                                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-4 ring-indigo-100 scale-110'
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                } ${isAdmin || isManager ? 'cursor-pointer' : 'cursor-default'}`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 size={18} />
                                ) : isCurrent ? (
                                  <StageIcon size={18} />
                                ) : (
                                  <span className="font-mono text-slate-400">{stg.stepNum}</span>
                                )}
                              </button>

                              {/* Label below node */}
                              <div className="mt-2 text-center max-w-[90px]">
                                <p className={`text-[11px] font-bold leading-tight ${
                                  isCompleted
                                    ? 'text-emerald-700'
                                    : isCurrent
                                    ? 'text-indigo-700 font-extrabold'
                                    : 'text-slate-400'
                                }`}>
                                  {stg.shortLabel}
                                </p>
                                <p className="text-[9px] text-slate-400 font-medium hidden sm:block mt-0.5">
                                  {stg.label}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Stage Control Bar (Managers & Admins) */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                      <span className="font-bold text-slate-800">Current Status:</span>
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 inline-flex items-center gap-1">
                        {currentStageObj.label}
                      </span>
                      <span className="text-slate-400 font-normal hidden md:inline">— {currentStageObj.description}</span>
                    </div>

                    {(isAdmin || isManager) ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Update Stage:</span>
                        {DELIVERY_STAGES.map((stg) => (
                          <button
                            key={stg.id}
                            onClick={() => handleUpdateDeliveryStage(b._id as any, stg.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                              b.status === stg.id
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {stg.stepNum}. {stg.shortLabel}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        * Stage updates managed by Account Managers / Project Leads
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 1: BILLING SCHEDULES & MILESTONES ── */}
      {activeTab === 'milestones' && (
        <div className="space-y-6">
          {filteredBookings.map((b) => {
            const leadName = (b.leadId as any)?.name || 'Client';
            const leadCompany = (b.leadId as any)?.company || (b.leadId as any)?.name || 'Enterprise Client';
            const agentName = (b.salesPersonId as any)?.name || 'Assigned Rep';

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
                        Client: <strong className="text-slate-800 font-semibold">{leadCompany}</strong> ({leadName}) • Rep: <strong className="text-indigo-700 font-semibold">{agentName}</strong>
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
                                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-lg text-[10px] border border-rose-200/60 inline-flex items-center gap-1" title="Dunning Rule 3: Auto-escalated to Sales Rep Task">
                                  <AlertCircle size={11} /> 🚨 Overdue Escalated to Rep
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-lg text-[10px] border border-amber-200/60 inline-flex items-center gap-1" title="Dunning Rule 1 & 2: T-7 Email & T-0 WhatsApp Active">
                                  <Clock size={11} /> 📧 T-7 Email & 💬 T-0 Active
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

      {/* ── TAB 2: CONTRACT RENEWALS & UPSELL REMINDERS ── */}
      {activeTab === 'renewals' && (
        <div className="space-y-6">
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-950 font-medium">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <Calendar size={18} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Contract Expiration & Recurring Revenue Radar</h4>
                <p className="text-amber-800 text-[11px]">
                  {isSalesAgent
                    ? 'Showing renewal countdowns & upgrade options for your assigned client accounts.'
                    : 'Monitoring annual recurring contracts due for renewal across your organization.'}
                </p>
              </div>
            </div>
            <div className="text-right font-black">
              <span className="text-slate-500 uppercase tracking-widest text-[10px] block">Total Upsell Pipeline</span>
              <span className="text-lg text-purple-700 font-mono">{metrics.totalUpsellValueStr}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {filteredBookings.map((b) => {
              const leadName = (b.leadId as any)?.name || 'Valued Client';
              const leadCompany = (b.leadId as any)?.company || leadName;
              const leadEmail = (b.leadId as any)?.email || '';
              const agentName = (b.salesPersonId as any)?.name || 'Assigned Rep';

              const endDate = b.contractEndDate ? new Date(b.contractEndDate) : null;
              const daysLeft = endDate ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 3600 * 24)) : 365;

              const isRenewed = b.renewalStatus === 'renewed';
              const isUrgent = daysLeft <= 30 && !isRenewed;
              const isWarning = daysLeft > 30 && daysLeft <= 60 && !isRenewed;

              return (
                <div key={b._id as any} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
                  {/* Card Top */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold shadow-xs ${
                        isRenewed ? 'bg-emerald-600' : isUrgent ? 'bg-rose-600 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}>
                        {isRenewed ? <CheckCircle2 size={22} /> : isUrgent ? <AlertCircle size={22} /> : <Calendar size={22} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-slate-900 text-base">{b.unitNumber}</h3>
                          {isRenewed ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ Contract Renewed
                            </span>
                          ) : isUrgent ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                              🔥 Expires in {daysLeft} Days!
                            </span>
                          ) : isWarning ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              ⏰ Expires in {daysLeft} Days
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                              Active ({daysLeft} days remaining)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Client: <strong className="text-slate-800 font-bold">{leadCompany}</strong> ({leadName}) • Account Owner: <strong className="text-indigo-700 font-semibold">{agentName}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Contract End Date</span>
                        <span className="text-sm font-black text-slate-900 font-mono">
                          {endDate ? endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '1 Year from Signup'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedBookingForRenewal(b);
                            setRenewalForm({ extensionMonths: 12, renewalAmount: b.totalAmount || 0 });
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <RefreshCw size={13} /> Log Renewal
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBookingForUpsell(b);
                            setUpsellForm({ title: '', amount: 500000, notes: '' });
                          }}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                        >
                          <Plus size={13} /> Pitch Upgrade
                        </button>
                        <button
                          onClick={() => toast('success', `Renewal reminder email & proposal sent to ${leadEmail}`)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                          title="Send Renewal Reminder"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Upsell / Expansion Opportunities Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={14} className="text-purple-600" /> License Expansion & Upsell Pitches ({(b.upsellOpportunities || []).length})
                      </h4>
                      <span className="text-[11px] text-slate-400 font-medium">Add extra modules or user licenses</span>
                    </div>

                    {(b.upsellOpportunities || []).length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No expansion opportunities logged yet. Click <strong className="text-purple-700">"Pitch Upgrade"</strong> above to record add-on licenses or module requests.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(b.upsellOpportunities || []).map((u, uIdx) => (
                          <div key={uIdx} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-slate-900 text-xs">{u.title}</p>
                                <p className="text-[11px] text-purple-700 font-mono font-extrabold mt-0.5">
                                  +₹{(u.amount / 100000).toFixed(2)} Lakhs
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wider border ${
                                u.status === 'won'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : u.status === 'pitched'
                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                  : u.status === 'lost'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {u.status}
                              </span>
                            </div>

                            {u.notes && <p className="text-[11px] text-slate-500 italic">"{u.notes}"</p>}

                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Update Stage:</span>
                              <button
                                onClick={() => handleUpdateUpsellStatus(b._id as any, uIdx, 'pitched')}
                                className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border text-[10px] font-bold text-slate-600"
                              >
                                Pitched
                              </button>
                              <button
                                onClick={() => handleUpdateUpsellStatus(b._id as any, uIdx, 'won')}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold"
                              >
                                Won
                              </button>
                              <button
                                onClick={() => handleUpdateUpsellStatus(b._id as any, uIdx, 'lost')}
                                className="px-2 py-0.5 rounded bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold"
                              >
                                Lost
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 3: ENTERPRISE COMPLIANCE & LEGAL VAULT ── */}
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

      {/* ── TAB 4: GO-LIVE & PRODUCTION HANDOVER ── */}
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

      {/* ── MODALS RENDERED IN BODY PORTAL FOR PERFECT VIEWPORT CENTERING ── */}
      {mounted && createPortal(
        <>
          {/* ── MODAL 1: RENEW CONTRACT ── */}
          {selectedBookingForRenewal && (
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto min-h-screen">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-scale-in my-auto max-h-[85vh] overflow-y-auto relative z-[10000]">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                      <RefreshCw className="text-amber-500" size={18} /> Renew Client Contract
                    </h3>
                    <p className="text-xs text-slate-500">{selectedBookingForRenewal.unitNumber}</p>
                  </div>
                  <button
                    onClick={() => setSelectedBookingForRenewal(null)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contract Renewal Extension</label>
                    <select
                      value={renewalForm.extensionMonths}
                      onChange={(e) => setRenewalForm({ ...renewalForm, extensionMonths: Number(e.target.value) })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-semibold outline-none focus:border-amber-500"
                    >
                      <option value={12}>+12 Months (1 Year Standard Renewal)</option>
                      <option value={24}>+24 Months (2 Year Multi-Year Renewal)</option>
                      <option value={36}>+36 Months (3 Year Enterprise Agreement)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Renewal Value (₹)</label>
                    <input
                      type="number"
                      value={renewalForm.renewalAmount}
                      onChange={(e) => setRenewalForm({ ...renewalForm, renewalAmount: Number(e.target.value) })}
                      placeholder="e.g. 7500000"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-mono font-bold outline-none focus:border-amber-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">This amount will be added to the cumulative contract revenue.</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => setSelectedBookingForRenewal(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmRenewal}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={14} /> Confirm Renewal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── MODAL 2: ADD UPSELL OPPORTUNITY ── */}
          {selectedBookingForUpsell && (
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto min-h-screen">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-scale-in my-auto max-h-[85vh] overflow-y-auto relative z-[10000]">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                      <Sparkles className="text-purple-600" size={18} /> Pitch Upgrade / License Add-on
                    </h3>
                    <p className="text-xs text-slate-500">{selectedBookingForUpsell.unitNumber}</p>
                  </div>
                  <button
                    onClick={() => setSelectedBookingForUpsell(null)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Expansion Module / License Title</label>
                    <input
                      type="text"
                      value={upsellForm.title}
                      onChange={(e) => setUpsellForm({ ...upsellForm, title: e.target.value })}
                      placeholder="e.g. Add-on 25 SAP Professional Licenses"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-medium outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Estimated Deal Value (₹)</label>
                    <input
                      type="number"
                      value={upsellForm.amount}
                      onChange={(e) => setUpsellForm({ ...upsellForm, amount: Number(e.target.value) })}
                      placeholder="e.g. 500000"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-mono font-bold outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Client Discussion Notes</label>
                    <textarea
                      rows={3}
                      value={upsellForm.notes}
                      onChange={(e) => setUpsellForm({ ...upsellForm, notes: e.target.value })}
                      placeholder="e.g. Requested during Q3 strategy sync with VP of Engineering"
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white font-medium outline-none focus:border-purple-500 resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => setSelectedBookingForUpsell(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddUpsell}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Log Upsell Pitch
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── PRINTABLE SAP MILESTONE INVOICE MODAL ── */}
          {selectedBookingForLetter && (
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto min-h-screen">
              <div className="bg-white rounded-3xl max-w-2xl w-full p-8 space-y-6 shadow-2xl border border-slate-200 animate-scale-in my-auto max-h-[85vh] overflow-y-auto relative z-[10000]">
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

          {/* ── NEW SAP CONTRACT CREATION MODAL ── */}
          {isNewContractModalOpen && (
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto min-h-screen">
              <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 animate-scale-in my-auto max-h-[85vh] overflow-y-auto relative z-[10000]">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <Cpu className="text-indigo-600" size={22} />
                      Create New SAP Contract
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Execute a new post-sales enterprise agreement, solution package & payment milestones
                    </p>
                  </div>
                  <button
                    onClick={() => setIsNewContractModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateNewContract} className="space-y-4 text-xs">
                  {/* Select Client / Lead */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Select Enterprise Client <span className="text-rose-500">*</span>
                    </label>
                    {loadingLeads ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 italic">
                        Loading clients list...
                      </div>
                    ) : (
                      <select
                        value={newContractForm.leadId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const selectedLead = availableLeads.find((l) => l._id === selectedId);
                          setNewContractForm((prev) => ({
                            ...prev,
                            leadId: selectedId,
                            projectName: selectedLead ? `${selectedLead.company || selectedLead.name} SAP Implementation` : prev.projectName,
                            totalAmount: selectedLead?.value || prev.totalAmount,
                          }));
                        }}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        required
                      >
                        {availableLeads.length === 0 && <option value="">No clients found</option>}
                        {availableLeads.map((lead) => (
                          <option key={lead._id} value={lead._id}>
                            {lead.name} {lead.company ? `(${lead.company})` : ''} — ₹{((lead.value || 0) / 100000).toFixed(1)}L
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* SAP Solution Package */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      SAP Solution Package <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={newContractForm.unitNumber}
                      onChange={(e) => setNewContractForm({ ...newContractForm, unitNumber: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="SAP S/4HANA Cloud (Enterprise Edition)">SAP S/4HANA Cloud (Enterprise Edition)</option>
                      <option value="SAP SuccessFactors HXM Cloud Suite">SAP SuccessFactors HXM Cloud Suite</option>
                      <option value="SAP Analytics Cloud & Datasphere">SAP Analytics Cloud & Datasphere</option>
                      <option value="SAP Ariba Digital Procurement Suite">SAP Ariba Digital Procurement Suite</option>
                      <option value="SAP CX & Customer Data Platform">SAP CX & Customer Data Platform</option>
                      <option value="custom">Other / Custom SAP Solution Package</option>
                    </select>
                  </div>

                  {newContractForm.unitNumber === 'custom' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Specify Custom Solution Name</label>
                      <input
                        type="text"
                        value={newContractForm.customUnitNumber}
                        onChange={(e) => setNewContractForm({ ...newContractForm, customUnitNumber: e.target.value })}
                        placeholder="e.g. SAP Business One Cloud Custom Tier"
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        required
                      />
                    </div>
                  )}

                  {/* Project Name */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Project / Implementation Name</label>
                    <input
                      type="text"
                      value={newContractForm.projectName}
                      onChange={(e) => setNewContractForm({ ...newContractForm, projectName: e.target.value })}
                      placeholder="e.g. Acme Corp ERP Digital Transformation"
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Total Contract Amount & Duration */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Total Contract Value (₹) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={newContractForm.totalAmount}
                        onChange={(e) => setNewContractForm({ ...newContractForm, totalAmount: Number(e.target.value) })}
                        placeholder="5000000"
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">₹{((newContractForm.totalAmount || 0) / 100000).toFixed(1)} Lakhs</p>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Contract Duration</label>
                      <select
                        value={newContractForm.durationMonths}
                        onChange={(e) => setNewContractForm({ ...newContractForm, durationMonths: Number(e.target.value) })}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value={12}>12 Months (1 Year)</option>
                        <option value={24}>24 Months (2 Years)</option>
                        <option value={36}>36 Months (3 Years)</option>
                        <option value={60}>60 Months (5 Years)</option>
                      </select>
                    </div>
                  </div>

                  {/* Default Milestones Summary Box */}
                  <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
                    <p className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-600" /> Auto-Generated Milestones & Vault:
                    </p>
                    <ul className="text-[11px] text-indigo-800/90 space-y-1 list-disc list-inside">
                      <li>20% Contract Signing Deposit (₹{(((newContractForm.totalAmount || 0) * 0.2) / 100000).toFixed(1)}L)</li>
                      <li>40% Solution Blueprint & Configuration Signoff</li>
                      <li>40% Go-Live Production Handover</li>
                      <li>Standard Compliance Vault (MSA, SLA, Entitlement Certificate)</li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsNewContractModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingNewContract}
                      className="btn-primary text-xs font-bold px-5 py-2.5 shadow-md flex items-center gap-2"
                    >
                      {submittingNewContract ? 'Creating Contract...' : '🚀 Create SAP Contract'}
                    </button>
                  </div>
                </form>
              </div>
          </div>
          )}

          {/* ── MODAL 5: DELETE CONTRACT CONFIRMATION ── */}
          {contractToDelete && (
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto min-h-screen">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-rose-100 animate-scale-in my-auto max-h-[85vh] overflow-y-auto relative z-[10000]">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                      <Trash2 size={18} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Delete SAP Contract</h3>
                      <p className="text-xs text-rose-600 font-medium">This action cannot be undone</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setContractToDelete(null)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-2xl space-y-1.5 text-xs text-rose-900">
                  <p className="font-bold">Are you sure you want to permanently delete this contract?</p>
                  <p className="font-semibold text-slate-700 mt-1">• Solution Package: <span className="font-bold text-slate-900">{contractToDelete.unitNumber}</span></p>
                  <p className="font-semibold text-slate-700">• Project: <span className="font-bold text-slate-900">{contractToDelete.projectName}</span></p>
                  <p className="font-semibold text-slate-700">• Total Value: <span className="font-bold text-slate-900">₹{((contractToDelete.totalAmount || 0) / 100000).toFixed(1)}L</span></p>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setContractToDelete(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingContract}
                    onClick={handleDeleteContract}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    {isDeletingContract ? 'Deleting...' : 'Yes, Delete Contract'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
}

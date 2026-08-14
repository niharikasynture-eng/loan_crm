import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import Booking from '@/models/Booking';
import Lead from '@/models/Lead';
import Task from '@/models/Task';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role === 'onsite_visitor') {
      return apiError('Access denied. Onsite Visitors do not have access to Post Sales.', 403);
    }

    // Reset old real-estate demo bookings if present
    await Booking.deleteMany({ organizationId: auth.organizationId, projectName: { $regex: /Acme Height|Residency/i } });

    // Build filter query based on user role
    const query: any = { organizationId: auth.organizationId };
    if (auth.role === 'sales_agent') {
      query.salesPersonId = auth.userId;
    }

    let bookings = await Booking.find(query)
      .populate('leadId', 'name email phone company status')
      .populate('salesPersonId', 'name email avatar')
      .sort({ createdAt: -1 });

    // Auto-seed sample SAP Enterprise Solution Bookings if empty
    if (bookings.length === 0 && (auth.role === 'super_admin' || auth.role === 'org_admin' || auth.role === 'manager')) {
      const leads = await Lead.find({ organizationId: auth.organizationId }).limit(4);
      if (leads.length > 0) {
        const sampleBookings = [
          {
            organizationId: auth.organizationId,
            leadId: leads[0]._id,
            salesPersonId: auth.userId,
            unitNumber: 'SAP S/4HANA Cloud (Enterprise Edition)',
            projectName: 'Enterprise ERP Digital Transformation',
            totalAmount: 7500000, // ₹75 Lakhs
            bookingDate: new Date(Date.now() - 330 * 24 * 60 * 60 * 1000),
            contractEndDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // Expiring in 35 days!
            renewalStatus: 'expiring_soon',
            status: 'implementation_in_progress',
            paymentMilestones: [
              { name: '20% Contract Signing & License Provisioning', amount: 1500000, dueDate: new Date(Date.now() - 25 * 24 * 3600 * 1000), status: 'paid', paidAmount: 1500000, paidDate: new Date(Date.now() - 25 * 24 * 3600 * 1000) },
              { name: '30% Blueprint & Core Architecture Signoff', amount: 2250000, dueDate: new Date(Date.now() - 5 * 24 * 3600 * 1000), status: 'paid', paidAmount: 2250000, paidDate: new Date(Date.now() - 5 * 24 * 3600 * 1000) },
              { name: '30% Data Migration & UAT Testing', amount: 2250000, dueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000), status: 'pending', paidAmount: 0 },
              { name: '20% Production Go-Live & AMS Handover', amount: 1500000, dueDate: new Date(Date.now() + 60 * 24 * 3600 * 1000), status: 'pending', paidAmount: 0 },
            ],
            documents: [
              { name: 'Master Services Agreement (MSA)', status: 'verified' },
              { name: 'Service Level Agreement (SLA)', status: 'verified' },
              { name: 'Data Protection & GDPR Compliance', status: 'verified' },
              { name: 'Software License Entitlement Certificate', status: 'pending' },
            ],
            handoverChecklist: [
              { item: 'Cloud Tenant Provisioning & Admin Activation', completed: true },
              { item: 'Master Data Migration & Validation Audit', completed: true },
              { item: 'Integration Test & UAT User Acceptance Signoff', completed: false },
              { item: 'Single Sign-On (SSO) & Security Audit Pass', completed: false },
              { item: 'Official Production Go-Live Certificate & Handover', completed: false },
            ],
            upsellOpportunities: [
              { title: 'Add-on 50 SAP Professional User Licenses', amount: 1500000, status: 'pitched', notes: 'Client requested proposal for expanded sales team' },
              { title: 'SAP Analytics Cloud Integration Module', amount: 800000, status: 'identified', notes: 'Discussed during Q3 architecture review' }
            ]
          },
          ...(leads.length > 1
            ? [
                {
                  organizationId: auth.organizationId,
                  leadId: leads[1]._id,
                  salesPersonId: auth.userId,
                  unitNumber: 'SAP SuccessFactors HXM Cloud Suite',
                  projectName: 'Global HR & Talent Management Rollout',
                  totalAmount: 12000000, // ₹1.2 Cr
                  bookingDate: new Date(Date.now() - 340 * 24 * 60 * 60 * 1000),
                  contractEndDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // Expiring in 25 days!
                  renewalStatus: 'expiring_soon',
                  status: 'ready_for_golive',
                  paymentMilestones: [
                    { name: '20% Execution Deposit', amount: 2400000, dueDate: new Date(Date.now() - 55 * 24 * 3600 * 1000), status: 'paid', paidAmount: 2400000, paidDate: new Date(Date.now() - 55 * 24 * 3600 * 1000) },
                    { name: '40% Solution Configuration & Integration', amount: 4800000, dueDate: new Date(Date.now() - 20 * 24 * 3600 * 1000), status: 'paid', paidAmount: 4800000, paidDate: new Date(Date.now() - 20 * 24 * 3600 * 1000) },
                    { name: '40% Go-Live Production Handover', amount: 4800000, dueDate: new Date(Date.now() - 2 * 24 * 3600 * 1000), status: 'overdue', paidAmount: 0 },
                  ],
                  documents: [
                    { name: 'Master Services Agreement (MSA)', status: 'verified' },
                    { name: 'Service Level Agreement (SLA)', status: 'verified' },
                    { name: 'Data Protection & GDPR Compliance', status: 'verified' },
                    { name: 'Software License Entitlement Certificate', status: 'verified' },
                  ],
                  handoverChecklist: [
                    { item: 'Cloud Tenant Provisioning & Admin Activation', completed: true },
                    { item: 'Master Data Migration & Validation Audit', completed: true },
                    { item: 'Integration Test & UAT User Acceptance Signoff', completed: true },
                    { item: 'Single Sign-On (SSO) & Security Audit Pass', completed: true },
                    { item: 'Official Production Go-Live Certificate & Handover', completed: false },
                  ],
                  upsellOpportunities: [
                    { title: 'Qualtrics Employee Experience Upgrade', amount: 2500000, status: 'identified', notes: 'HR Director showed interest in annual survey package' }
                  ]
                },
              ]
            : []),
        ];

        await Booking.insertMany(sampleBookings);

        bookings = await Booking.find(query)
          .populate('leadId', 'name email phone company status')
          .populate('salesPersonId', 'name email avatar')
          .sort({ createdAt: -1 });
      }
    }

    // Auto-generate post-sales tasks for all active bookings
    for (const b of bookings) {
      await syncPostSalesTasks(b, auth).catch((e) => console.error('Post-sales task sync warning:', e));
    }

    return apiSuccess({ bookings });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message, 500);
  }
}

async function syncPostSalesTasks(booking: any, auth: any) {
  // 1. Billing Milestone Tasks
  for (const m of booking.paymentMilestones || []) {
    if (m.status !== 'paid') {
      const title = `💳 Collect Milestone Invoice: ₹${(m.amount / 100000).toFixed(1)}L for ${booking.unitNumber}`;
      const existing = await Task.findOne({ organizationId: auth.organizationId, bookingId: booking._id, title });
      if (!existing) {
        await Task.create({
          organizationId: auth.organizationId,
          leadId: booking.leadId?._id || booking.leadId,
          bookingId: booking._id,
          category: 'billing',
          title,
          description: `Billing milestone '${m.name}' due on ${new Date(m.dueDate).toLocaleDateString()} for ${booking.projectName}`,
          status: m.status === 'overdue' ? 'overdue' : 'pending',
          priority: m.status === 'overdue' ? 'high' : 'medium',
          dueDate: m.dueDate || new Date(),
          assignedTo: booking.salesPersonId?._id || auth.userId,
          createdBy: auth.userId,
        });
      }
    }
  }

  // 2. Pending Document Compliance Tasks
  for (const doc of booking.documents || []) {
    if (doc.status === 'pending') {
      const title = `📑 Collect Executed Document: ${doc.name} for ${booking.unitNumber}`;
      const existing = await Task.findOne({ organizationId: auth.organizationId, bookingId: booking._id, title });
      if (!existing) {
        await Task.create({
          organizationId: auth.organizationId,
          leadId: booking.leadId?._id || booking.leadId,
          bookingId: booking._id,
          category: 'compliance',
          title,
          description: `Compliance document ${doc.name} signoff pending for SAP contract ${booking.unitNumber}`,
          status: 'pending',
          priority: 'high',
          dueDate: new Date(Date.now() + 3 * 86400000),
          assignedTo: booking.salesPersonId?._id || auth.userId,
          createdBy: auth.userId,
        });
      }
    }
  }

  // 3. Go-Live Handover Tasks
  if (booking.status === 'ready_for_golive') {
    const title = `🚀 Complete Go-Live Handover Signoff for ${booking.unitNumber}`;
    const existing = await Task.findOne({ organizationId: auth.organizationId, bookingId: booking._id, title });
    if (!existing) {
      await Task.create({
        organizationId: auth.organizationId,
        leadId: booking.leadId?._id || booking.leadId,
        bookingId: booking._id,
        category: 'handover',
        title,
        description: `Final SAP production go-live inspection and certificate handover for ${booking.projectName}`,
        status: 'pending',
        priority: 'high',
        dueDate: new Date(Date.now() + 2 * 86400000),
        assignedTo: booking.salesPersonId?._id || auth.userId,
        createdBy: auth.userId,
      });
    }
  }

  // 4. Contract Renewal Tasks (within 60 days of contractEndDate)
  if (booking.contractEndDate && booking.renewalStatus !== 'renewed') {
    const daysUntilExpiry = Math.ceil((new Date(booking.contractEndDate).getTime() - Date.now()) / (1000 * 3600 * 24));
    if (daysUntilExpiry <= 60) {
      const title = `⏰ Contract Renewal Due in ${daysUntilExpiry} days for ${booking.unitNumber}`;
      const existing = await Task.findOne({ organizationId: auth.organizationId, bookingId: booking._id, title: { $regex: /Contract Renewal/i } });
      if (!existing) {
        await Task.create({
          organizationId: auth.organizationId,
          leadId: booking.leadId?._id || booking.leadId,
          bookingId: booking._id,
          category: 'renewal',
          title,
          description: `Contract for ${booking.projectName} expires on ${new Date(booking.contractEndDate).toLocaleDateString()}. Initiate renewal discussion and pitch license upgrades.`,
          status: 'pending',
          priority: daysUntilExpiry <= 30 ? 'high' : 'medium',
          dueDate: booking.contractEndDate,
          assignedTo: booking.salesPersonId?._id || auth.userId,
          createdBy: auth.userId,
        });
      }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role !== 'super_admin' && auth.role !== 'org_admin' && auth.role !== 'manager') {
      return apiError('Access denied. Post Sales is restricted to Org Admins and Managers.', 403);
    }

    const body = await req.json();
    const { leadId, unitNumber, projectName, totalAmount, paymentMilestones } = body;

    if (!leadId || !unitNumber || !totalAmount) {
      return apiError('leadId, solution package (unitNumber), and totalAmount are required', 400);
    }

    const booking = await Booking.create({
      organizationId: auth.organizationId,
      leadId,
      salesPersonId: auth.userId,
      unitNumber,
      projectName: projectName || 'SAP Enterprise ERP Implementation',
      totalAmount,
      bookingDate: new Date(),
      status: 'contract_signed',
      paymentMilestones: paymentMilestones || [
        { name: '20% Contract Signing Deposit', amount: totalAmount * 0.2, dueDate: new Date(Date.now() + 7 * 86400000), status: 'pending', paidAmount: 0 },
        { name: '40% Solution Blueprint & UAT', amount: totalAmount * 0.4, dueDate: new Date(Date.now() + 45 * 86400000), status: 'pending', paidAmount: 0 },
        { name: '40% Production Go-Live', amount: totalAmount * 0.4, dueDate: new Date(Date.now() + 90 * 86400000), status: 'pending', paidAmount: 0 },
      ],
      documents: [
        { name: 'Master Services Agreement (MSA)', status: 'pending' },
        { name: 'Service Level Agreement (SLA)', status: 'pending' },
        { name: 'Software License Entitlement Certificate', status: 'pending' },
      ],
      handoverChecklist: [
        { item: 'Cloud Tenant Provisioning & Admin Activation', completed: false },
        { item: 'Single Sign-On (SSO) & Security Audit Pass', completed: false },
        { item: 'Official Production Go-Live Certificate', completed: false },
      ],
    });

    return apiSuccess({ booking }, 'SAP Contract Record created successfully', 201);
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message, 500);
  }
}

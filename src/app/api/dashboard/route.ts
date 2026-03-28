import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import Lead from '@/models/Lead';
import Deal from '@/models/Deal';
import Activity from '@/models/Activity';
import Task from '@/models/Task';
import User from '@/models/User';

// GET /api/dashboard
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const orgId = auth.organizationId;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalLeads,
      newLeads,
      wonLeads,
      lostLeads,
      totalDeals,
      wonDeals,
      totalActivities,
      callsThisMonth,
      pendingTasks,
      totalUsers,
      leadsByStatus,
      dealsByStage,
      recentActivities,
      upcomingTasks,
    ] = await Promise.all([
      Lead.countDocuments({ organizationId: orgId }),
      Lead.countDocuments({ organizationId: orgId, status: 'new' }),
      Lead.countDocuments({ organizationId: orgId, status: 'won' }),
      Lead.countDocuments({ organizationId: orgId, status: 'lost' }),
      Deal.countDocuments({ organizationId: orgId }),
      Deal.countDocuments({ organizationId: orgId, stage: 'closed_won' }),
      Activity.countDocuments({ organizationId: orgId }),
      Activity.countDocuments({
        organizationId: orgId,
        type: 'call',
        createdAt: { $gte: thirtyDaysAgo },
      }),
      Task.countDocuments({ organizationId: orgId, status: { $in: ['pending', 'in_progress'] } }),
      User.countDocuments({ organizationId: orgId, isActive: true }),
      Lead.aggregate([
        { $match: { organizationId: { $eq: orgId } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Deal.aggregate([
        { $match: { organizationId: { $eq: orgId } } },
        { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } },
      ]),
      Activity.find({ organizationId: orgId })
        .populate('createdBy', 'name avatar')
        .populate('leadId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Task.find({
        organizationId: orgId,
        status: { $in: ['pending', 'in_progress'] },
        dueDate: { $gte: new Date() },
      })
        .populate('assignedTo', 'name avatar')
        .populate('leadId', 'name')
        .sort({ dueDate: 1 })
        .limit(5)
        .lean(),
    ]);

    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';

    const wonDealValue = await Deal.aggregate([
      { $match: { organizationId: { $eq: orgId }, stage: 'closed_won' } },
      { $group: { _id: null, total: { $sum: '$value' } } },
    ]);

    return apiSuccess({
      metrics: {
        totalLeads,
        newLeads,
        wonLeads,
        lostLeads,
        totalDeals,
        wonDeals,
        totalActivities,
        callsThisMonth,
        pendingTasks,
        totalUsers,
        conversionRate: parseFloat(conversionRate),
        wonDealValue: wonDealValue[0]?.total || 0,
      },
      charts: {
        leadsByStatus,
        dealsByStage,
      },
      recentActivities,
      upcomingTasks,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch dashboard', 500);
  }
}

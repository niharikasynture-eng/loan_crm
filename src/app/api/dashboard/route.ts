import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import Lead from '@/models/Lead';
import Deal from '@/models/Deal';
import Activity from '@/models/Activity';
import Task from '@/models/Task';
import User from '@/models/User';
import mongoose from 'mongoose';

// GET /api/dashboard
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const orgId = auth.organizationId;
    const { searchParams } = req.nextUrl;
    const period = searchParams.get('period') || 'all';
    const userId = searchParams.get('userId');

    // Build Filters
    const queryLeads: any      = { organizationId: orgId };
    const queryActivities: any = { organizationId: orgId };
    const queryDeals: any      = { organizationId: orgId };
    const queryTasks: any      = { organizationId: orgId };

    if (userId && userId !== 'all') {
      const oid = new mongoose.Types.ObjectId(userId);
      queryLeads.assignedTo     = oid;
      queryActivities.createdBy = oid;
      queryDeals.assignedTo     = oid;
      queryTasks.assignedTo     = oid;
    }

    if (period && period !== 'all') {
      const now = new Date();
      let startDate = new Date(0);
      if (period === 'today') startDate = new Date(now.setHours(0, 0, 0, 0));
      else if (period === '7d') startDate = new Date(now.setDate(now.getDate() - 7));
      else if (period === '30d') startDate = new Date(now.setDate(now.getDate() - 30));
      
      const dateFilter = { $gte: startDate };
      queryLeads.createdAt      = dateFilter;
      queryActivities.createdAt = dateFilter;
      queryDeals.createdAt      = dateFilter;
      queryTasks.createdAt      = dateFilter;
    }

    const [
      totalLeads,
      newLeads,
      wonLeads,
      lostLeads,
      totalDeals,
      wonDeals,
      totalActivities,
      callsCount,
      pendingTasks,
      totalUsers,
      leadsByStatus,
      dealsByStage,
      recentActivities,
      upcomingTasks,
    ] = await Promise.all([
      Lead.countDocuments(queryLeads),
      Lead.countDocuments({ ...queryLeads, status: 'new' }),
      Lead.countDocuments({ ...queryLeads, status: 'won' }),
      Lead.countDocuments({ ...queryLeads, status: 'lost' }),
      Deal.countDocuments(queryDeals),
      Deal.countDocuments({ ...queryDeals, stage: 'closed_won' }),
      Activity.countDocuments(queryActivities),
      Activity.countDocuments({ ...queryActivities, type: 'call' }),
      Task.countDocuments({ ...queryTasks, status: { $in: ['pending', 'in_progress'] } }),
      User.countDocuments({ organizationId: orgId, isActive: true }),
      Lead.aggregate([
        { $match: queryLeads },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Deal.aggregate([
        { $match: queryDeals },
        { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } },
      ]),
      Activity.find(queryActivities)
        .populate('createdBy', 'name avatar')
        .populate('leadId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Task.find({
        ...queryTasks,
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
      { $match: { ...queryDeals, stage: 'closed_won' } },
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
        callsThisMonth: callsCount, // Reusing legacy field name for frontend compatibility
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
    console.error('Dashboard API Error:', err);
    return apiError('Failed to fetch dashboard', 500);
  }
}

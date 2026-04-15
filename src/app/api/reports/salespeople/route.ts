import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import User from '@/models/User';
import Activity from '@/models/Activity';
import Deal from '@/models/Deal';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role !== 'org_admin' && auth.role !== 'manager') {
      return apiError('Access denied: Unauthorized to view team stats', 403);
    }

    const orgId = new mongoose.Types.ObjectId(auth.organizationId);
    const { searchParams } = req.nextUrl;
    const period = searchParams.get('period') || '30d';

    // Calculate Date Range
    let startDate = new Date(0); // Default: All time
    const now = new Date();
    
    if (period === 'today') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (period === '7d') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      startDate = sevenDaysAgo;
    } else if (period === '30d') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      startDate = thirtyDaysAgo;
    } else if (period === '90d') {
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(now.getDate() - 90);
      startDate = ninetyDaysAgo;
    }

    // 1. Get all salespeople in the organization
    const salespeople = await User.find({
      organizationId: orgId,
      role: 'sales_agent',
      isActive: true
    }).select('name avatar email').lean();

    const salespersonIds = salespeople.map(s => s._id);

    // 2. Aggregate activities per salesperson
    const activityStats = await Activity.aggregate([
      { 
        $match: { 
          organizationId: orgId,
          createdBy: { $in: salespersonIds },
          createdAt: { $gte: startDate }
        } 
      },
      {
        $group: {
          _id: { userId: '$createdBy', type: '$type' },
          count: { $sum: 1 }
        }
      }
    ]);

    // 3. Aggregate won deals per salesperson
    const dealStats = await Deal.aggregate([
      {
        $match: {
          organizationId: orgId,
          assignedTo: { $in: salespersonIds },
          stage: 'closed_won',
          updatedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          wonDeals: { $sum: 1 },
          wonValue: { $sum: '$value' }
        }
      }
    ]);

    // 4. Merge stats into salespeople list
    const performanceData = salespeople.map(s => {
      const perUserActivities = activityStats.filter(a => a._id.userId.toString() === s._id.toString());
      
      return {
        id: s._id,
        name: s.name,
        avatar: s.avatar,
        email: s.email,
        stats: {
          calls: perUserActivities.find(a => a._id.type === 'call')?.count || 0,
          emails: perUserActivities.find(a => a._id.type === 'email')?.count || 0,
          meetings: perUserActivities.find(a => a._id.type === 'meeting')?.count || 0,
          whatsapp: perUserActivities.find(a => a._id.type === 'whatsapp')?.count || 0,
          wonDeals: dealStats.find(d => d._id.toString() === s._id.toString())?.wonDeals || 0,
          wonValue: dealStats.find(d => d._id.toString() === s._id.toString())?.wonValue || 0,
        }
      };
    });

    return apiSuccess({ performance: performanceData });
  } catch (err: unknown) {
    console.error('Stats API Error:', err);
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch team performance', 500);
  }
}

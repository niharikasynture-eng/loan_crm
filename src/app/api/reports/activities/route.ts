import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Activity from '@/models/Activity';
import Lead from '@/models/Lead';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    // Managers and Org Admins only
    if (auth.role !== ROLES.ORG_ADMIN && auth.role !== ROLES.MANAGER) {
      return apiError('Access denied', 403);
    }

    const { searchParams } = req.nextUrl;
    const period = searchParams.get('period') || '7d';
    const userId = searchParams.get('userId');
    const page   = parseInt(searchParams.get('page') || '1');
    const limit  = parseInt(searchParams.get('limit') || '50');

    // Calculate Date Range
    let startDate = new Date(0);
    const now = new Date();
    
    if (period === 'today') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (period === '7d') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (period === '30d') {
      startDate = new Date(now.setDate(now.getDate() - 30));
    }

    const query: any = { 
      organizationId: new mongoose.Types.ObjectId(auth.organizationId),
      createdAt: { $gte: startDate },
      type: 'call'
    };

    if (userId && userId !== 'all') {
      query.createdBy = new mongoose.Types.ObjectId(userId);
    }

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate('leadId', 'name company')
        .populate('createdBy', 'name avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Activity.countDocuments(query)
    ]);

    return apiSuccess({ 
      activities, 
      total, 
      page, 
      limit, 
      pages: Math.ceil(total / limit) 
    });
  } catch (err: unknown) {
    console.error('Activity Report Error:', err);
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch activity logs', 500);
  }
}

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Booking from '@/models/Booking';
import InventoryUnit from '@/models/InventoryUnit';

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: Record<string, unknown> = { organizationId: auth.organizationId };

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('lead_id', 'name phone')
        .populate({
          path: 'inventory_id',
          populate: { path: 'project_id', select: 'name' }
        })
        .populate('approved_by', 'name')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query),
    ]);

    return apiSuccess({ bookings, total, page, limit });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch bookings', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();
    const data = await req.json();

    // Check inventory availability
    const unit = await InventoryUnit.findOne({ 
      _id: data.inventory_id, 
      organizationId: auth.organizationId 
    });

    if (!unit) return apiError('Inventory unit not found', 404);
    if (unit.status !== 'Available') return apiError(`Inventory is already ${unit.status}`, 400);

    // Create booking request and block inventory
    const session = await Booking.startSession();
    let newBooking;
    
    await session.withTransaction(async () => {
      newBooking = await Booking.create([{
        ...data,
        organizationId: auth.organizationId,
        createdBy: auth.userId,
        booking_status: 'Pending'
      }], { session });

      await InventoryUnit.findByIdAndUpdate(
        data.inventory_id,
        { status: 'Blocked' },
        { session }
      );
    });
    session.endSession();

    return apiSuccess(newBooking, 'Booking requested successfully', 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to create booking', 500);
  }
}

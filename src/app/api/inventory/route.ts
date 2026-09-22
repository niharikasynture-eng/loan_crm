import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import InventoryUnit from '@/models/InventoryUnit';

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { searchParams } = req.nextUrl;
    const projectId = searchParams.get('projectId');
    const search = searchParams.get('search')?.trim();
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    const query: Record<string, unknown> = { organizationId: auth.organizationId };
    if (projectId) query.project_id = projectId;
    if (category && category !== 'all') query.category = category;
    if (status && status !== 'all') query.status = status;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { flat_number: { $regex: search, $options: 'i' } },
      ];
    }

    const [inventory, total, allOrgUnits] = await Promise.all([
      InventoryUnit.find(query)
        .populate('project_id', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      InventoryUnit.countDocuments(query),
      InventoryUnit.find({ organizationId: auth.organizationId }).select('stockQuantity minStockAlert price status').lean(),
    ]);

    // Calculate real-time inventory metrics
    let totalStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValuation = 0;

    allOrgUnits.forEach((u) => {
      const stock = u.stockQuantity || 0;
      const minAlert = u.minStockAlert || 5;
      const price = u.price || 0;

      totalStock += stock;
      totalValuation += stock * price;

      if (stock === 0 || u.status === 'Out of Stock') {
        outOfStockCount++;
      } else if (stock <= minAlert || u.status === 'Low Stock') {
        lowStockCount++;
      }
    });

    const metrics = {
      totalProducts: allOrgUnits.length,
      totalStock,
      lowStockCount,
      outOfStockCount,
      totalValuation,
    };

    return apiSuccess({ inventory, products: inventory, total, page, limit, metrics });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    console.error('[INVENTORY_GET_ERROR]', err);
    return apiError('Failed to fetch inventory', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const allowedRoles = [ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.SALES_AGENT] as string[];
    if (!allowedRoles.includes(auth.role)) return apiError('Forbidden', 403);

    await connectDB();
    const data = await req.json();

    const stockQty = Number(data.stockQuantity || 0);
    const minAlert = Number(data.minStockAlert || 5);
    const priceVal = Number(data.price || 0);

    let calculatedStatus = data.status || 'Available';
    if (!data.status || data.status === 'Available') {
      if (stockQty <= 0) calculatedStatus = 'Out of Stock';
      else if (stockQty <= minAlert) calculatedStatus = 'Low Stock';
      else calculatedStatus = 'Available';
    }

    const unit = await InventoryUnit.create({
      ...data,
      name: data.name || data.flat_number || 'New Product',
      flat_number: data.flat_number || data.name || 'PRD-1',
      stockQuantity: stockQty,
      availableQuantity: data.availableQuantity !== undefined ? Number(data.availableQuantity) : stockQty,
      price: priceVal,
      minStockAlert: minAlert,
      status: calculatedStatus,
      organizationId: auth.organizationId,
      createdBy: auth.userId,
    });

    return apiSuccess(unit, 'Product added to inventory', 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    console.error('[INVENTORY_POST_ERROR]', err);
    return apiError('Failed to create product', 500);
  }
}

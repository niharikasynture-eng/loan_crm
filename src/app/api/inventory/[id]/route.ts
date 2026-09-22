import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import InventoryUnit from '@/models/InventoryUnit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req);
    await connectDB();
    const { id } = await params;

    const unit = await InventoryUnit.findOne({
      _id: id,
      organizationId: auth.organizationId,
    }).populate('project_id', 'name');

    if (!unit) return apiError('Product not found', 404);

    return apiSuccess({ unit });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    console.error('[INVENTORY_GET_ID_ERROR]', err);
    return apiError('Failed to fetch product', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req);
    const allowedRoles = [ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.SALES_AGENT] as string[];
    if (!allowedRoles.includes(auth.role)) return apiError('Forbidden', 403);

    await connectDB();
    const { id } = await params;
    const data = await req.json();

    const unit = await InventoryUnit.findOne({
      _id: id,
      organizationId: auth.organizationId,
    });

    if (!unit) return apiError('Product not found in inventory', 404);

    // Support quick delta adjustment (+1, -1, +5, etc.)
    if (typeof data.deltaQuantity === 'number') {
      const newStock = Math.max(0, (unit.stockQuantity || 0) + data.deltaQuantity);
      unit.stockQuantity = newStock;
      unit.availableQuantity = Math.max(0, (unit.availableQuantity || 0) + data.deltaQuantity);
    } else if (data.stockQuantity !== undefined) {
      unit.stockQuantity = Math.max(0, Number(data.stockQuantity));
      if (data.availableQuantity !== undefined) {
        unit.availableQuantity = Math.max(0, Number(data.availableQuantity));
      } else {
        unit.availableQuantity = unit.stockQuantity;
      }
    }

    if (data.name !== undefined) unit.name = data.name;
    if (data.sku !== undefined) unit.sku = data.sku;
    if (data.category !== undefined) unit.category = data.category;
    if (data.price !== undefined) unit.price = Number(data.price);
    if (data.unit !== undefined) unit.unit = data.unit;
    if (data.description !== undefined) unit.description = data.description;
    if (data.minStockAlert !== undefined) unit.minStockAlert = Number(data.minStockAlert);

    // Dynamic stock status recalculation
    const minAlert = unit.minStockAlert || 5;
    if (data.status) {
      unit.status = data.status;
    } else {
      if (unit.stockQuantity <= 0) {
        unit.status = 'Out of Stock';
      } else if (unit.stockQuantity <= minAlert) {
        unit.status = 'Low Stock';
      } else {
        unit.status = 'Available';
      }
    }

    await unit.save();

    return apiSuccess({ unit }, 'Product updated successfully');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    console.error('[INVENTORY_PATCH_ERROR]', err);
    return apiError('Failed to update product', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req);
    const allowedRoles = [ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN] as string[];
    if (!allowedRoles.includes(auth.role)) return apiError('Forbidden', 403);

    await connectDB();
    const { id } = await params;

    const unit = await InventoryUnit.findOneAndDelete({
      _id: id,
      organizationId: auth.organizationId,
    });

    if (!unit) return apiError('Product not found', 404);

    return apiSuccess(null, 'Product removed from inventory');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    console.error('[INVENTORY_DELETE_ERROR]', err);
    return apiError('Failed to delete product', 500);
  }
}

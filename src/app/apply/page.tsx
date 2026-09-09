import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import Organization from '@/models/Organization';

export default async function ApplyDefaultPage() {
  await connectDB();
  const defaultOrg = await Organization.findOne({ status: { $in: ['active', 'approved'] } })
    .sort({ createdAt: 1 })
    .select('slug')
    .lean();

  const targetSlug = (defaultOrg as any)?.slug || 'acme-corp';
  redirect(`/apply/${targetSlug}`);
}

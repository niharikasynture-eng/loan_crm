import { Suspense } from 'react';
import PublicLoanInquiryForm from '@/components/public/PublicLoanInquiryForm';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ApplySlugPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PublicLoanInquiryForm initialSlug={slug} />
    </Suspense>
  );
}

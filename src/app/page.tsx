'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, BarChart3, Users, Zap, CheckCircle2 } from 'lucide-react';

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  if (!mounted || isLoading) {
    return (
      <div className="flex px-6 py-2 h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation */}
      <nav className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <img src="/dealbyte.svg" alt="DealByte Logo" className="w-9 h-9" />
              <span className="text-xl font-bold tracking-tight text-slate-900">DealByte</span>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-4 py-2"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-all shadow-sm hover:shadow active:scale-95"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-slate-50 opacity-100 -z-20"></div>
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[600px] bg-indigo-50 rounded-full blur-3xl -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium mb-6">
                <span className="flex h-2 w-2 rounded-full bg-indigo-600"></span>
                CRM for Modern Teams
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                Close more deals with less friction.
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl">
                A professional CRM built to streamline your sales pipeline, manage leads effectively, and provide actionable insights without the bloat of traditional software.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/register"
                  className="inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-base hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-200 active:scale-95"
                >
                  Start for free
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-slate-700 border border-slate-200 font-semibold text-base hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                >
                  View live demo
                </Link>
              </div>
              <div className="mt-10 flex items-center gap-4 text-sm text-slate-500 font-medium">
                <div className="flex items-center gap-1">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>14-day free trial</span>
                </div>
              </div>
            </div>

            {/* Dashboard Mockup - Abstract UI */}
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100 to-white rounded-3xl transform rotate-3 scale-105 opacity-50 shadow-xl -z-10"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[480px]">
                {/* Mock Browser Header */}
                <div className="h-12 border-b border-slate-100 bg-slate-50/80 flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                  </div>
                  <div className="ml-4 flex-1 bg-white rounded-md h-6 border border-slate-200/60 max-w-[200px]"></div>
                </div>
                {/* Mock Content */}
                <div className="flex-1 p-6 flex flex-col gap-6 bg-slate-50/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold text-slate-500 mb-1">Overview</div>
                      <div className="text-2xl font-bold text-slate-900">Dashboard</div>
                    </div>
                    <button className="h-10 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">
                      + New Deal
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { icon: <Users size={16} className="text-indigo-600" />, label: 'Active Leads', value: '1,245' },
                      { icon: <BarChart3 size={16} className="text-indigo-600" />, label: 'Revenue', value: '$45.2k' },
                      { icon: <Zap size={16} className="text-indigo-600" />, label: 'Conversion', value: '24.8%' }
                    ].map((item, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                          {item.icon}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-500 mb-0.5">{item.label}</div>
                          <div className="text-lg font-bold text-slate-900">{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 bg-white border border-slate-100 rounded-xl shadow-sm p-5">
                    <div className="text-sm font-semibold text-slate-900 mb-4">Recent Activity</div>
                    <div className="space-y-4">
                      {[
                        { name: 'Sarah Jenkins', action: 'Closed a deal', time: '2m ago' },
                        { name: 'Michael Chen', action: 'Added a new lead', time: '1h ago' },
                        { name: 'Emma Watson', action: 'Sent a proposal', time: '3h ago' }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                            {item.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-900">{item.name}</div>
                            <div className="text-xs text-slate-500">{item.action}</div>
                          </div>
                          <div className="text-xs font-medium text-slate-400">{item.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logos section */}
      <div className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-slate-400 tracking-wider uppercase mb-8">Trusted by modern sales teams</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-40 grayscale">
            {['Acme Corp', 'GlobalNet', 'TechFlow', 'Pinnacle', 'NextGen'].map((company) => (
              <div key={company} className="text-xl font-bold text-slate-800">
                {company}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

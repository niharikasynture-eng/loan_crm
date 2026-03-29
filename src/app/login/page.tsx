'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Activity, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#070b14] overflow-hidden p-4">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[30%] right-[10%] w-[20%] h-[20%] bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Grid Pattern Mesh */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-[440px] relative z-10 animate-fade-in">
        {/* Header Section */}
        <div className="text-center" style={{ marginBottom: '42px' }}>
          <div className="relative inline-block group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-sky-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-[#1e293b] border border-white/10 flex items-center justify-center mb-6 shadow-2xl transition-transform duration-500 group-hover:scale-110">
              <Activity className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-3">
            Welcome <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400">Back</span>
          </h1>

        </div>

        {/* Login Form Card */}
        <div className="glass-card overflow-hidden">
          <div style={{ padding: '36px 36px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-300 ml-1">Email address</label>
                <div className="relative group">
                  <input
                    type="email"
                    className="input-field pl-4"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    id="login-email"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-semibold text-slate-300">Password</label>
                </div>
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field pl-4 pr-12"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    id="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors duration-200"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2 animate-shake">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]"
                disabled={isLoading}
                id="login-submit"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign in to account</span>
                )}
              </button>
            </form>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '22px 36px', textAlign: 'center' }}>
            <p className="text-sm text-slate-500">
              New to SalesCRM?{' '}
              <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors duration-200">
                Create an organization
              </Link>
            </p>
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-8 flex justify-center gap-6">
          <a href="#" className="text-xs text-slate-500 hover:text-slate-400 transition-colors">Privacy Policy</a>
          <div className="w-1 h-1 rounded-full bg-slate-700 self-center" />
          <a href="#" className="text-xs text-slate-500 hover:text-slate-400 transition-colors">Terms of Service</a>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
}

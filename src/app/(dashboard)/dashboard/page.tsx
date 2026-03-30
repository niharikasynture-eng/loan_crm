'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { Users, TrendingUp, PhoneCall, CheckSquare, Link2, Copy, CheckCircle } from 'lucide-react';

interface DashboardMetrics {
  totalLeads: number; newLeads: number; wonLeads: number; lostLeads: number;
  totalDeals: number; wonDeals: number; wonDealValue: number;
  totalActivities: number; callsThisMonth: number; pendingTasks: number; conversionRate: number;
}
interface Activity {
  _id: string; type: string; notes: string; createdAt: string;
  createdBy: { name: string; avatar?: string }; leadId: { name: string };
}
interface Task {
  _id: string; title: string; dueDate: string; priority: string;
  assignedTo: { name: string; avatar?: string }; leadId?: { name: string };
}

export default function DashboardPage() {
  const { user, organization } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const publicLeadUrl = typeof window !== 'undefined' && user?.role !== 'super_admin'
    ? `${window.location.protocol}//${window.location.host}/form/${organization?.slug || 'org'}`
    : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicLeadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<{ metrics: DashboardMetrics; recentActivities: Activity[]; upcomingTasks: Task[] }>('/dashboard');
        setMetrics(data.metrics);
        setActivities(data.recentActivities);
        setTasks(data.upcomingTasks);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // Metric cards data
  const metricCards = [
    { label: 'Total Leads',    value: metrics?.totalLeads,       sub: `${metrics?.newLeads} new`,              subColor: '#0f9d58', icon: Users,       iconBg: '#e8f0fe', iconColor: '#1a73e8' },
    { label: 'Won Deals',      value: metrics?.wonDeals,          sub: `$${metrics?.wonDealValue?.toLocaleString()} value`, subColor: '#0f9d58', icon: TrendingUp,  iconBg: '#e6f4ea', iconColor: '#0f9d58' },
    { label: 'Calls (30d)',    value: metrics?.callsThisMonth,    sub: `${metrics?.totalActivities} total activities`, subColor: '#a0aec0', icon: PhoneCall,   iconBg: '#e3f6fd', iconColor: '#0277bd' },
    { label: 'Pending Tasks',  value: metrics?.pendingTasks,      sub: 'Requires attention',                    subColor: '#a0aec0', icon: CheckSquare, iconBg: '#fef7e0', iconColor: '#f29900' },
  ];

  return (
    <div style={{ maxWidth: 1280 }}>
      {/* Public Lead Form Banner — for Admin/Manager */}
      {(user?.role === 'org_admin' || user?.role === 'manager') && (
        <div style={{ background: 'linear-gradient(135deg, #e8f0fe, #e3f6fd)', border: '1px solid rgba(26,115,232,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#e8f0fe', border: '1px solid rgba(26,115,232,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Link2 size={18} style={{ color: '#1a73e8' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, color: '#1a202c', fontSize: 14 }}>Public Lead Form</p>
              <p style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>Share this link to capture leads automatically</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#1a73e8', fontFamily: 'monospace', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {publicLeadUrl}
            </code>
            <button onClick={copyToClipboard} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: copied ? '#0f9d58' : '#1a73e8', color: '#fff', fontSize: 13, fontWeight: 600, transition: 'background 0.2s' }}>
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
        {metricCards.map(({ label, value, sub, subColor, icon: Icon, iconBg, iconColor }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 22px', transition: 'box-shadow 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,115,232,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</p>
                <p style={{ fontSize: 32, fontWeight: 800, color: '#1a202c', lineHeight: 1 }}>{value ?? 0}</p>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} style={{ color: iconColor }} />
              </div>
            </div>
            <p style={{ fontSize: 12, marginTop: 12, color: subColor, fontWeight: 500 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Bottom Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Activity */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a202c', marginBottom: 16 }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activities.length === 0 ? (
              <p style={{ fontSize: 13, color: '#a0aec0' }}>No recent activities.</p>
            ) : activities.map((act) => (
              <div key={act._id} style={{ display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid #f0f4f9', transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f7f8fc')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e8f0fe', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#1a73e8' }}>
                  {act.createdBy?.name?.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: '#4a5568' }}>
                    <strong style={{ color: '#1a202c' }}>{act.createdBy?.name}</strong> logged a {act.type} for <strong style={{ color: '#1a202c' }}>{act.leadId?.name}</strong>
                  </p>
                  <p style={{ fontSize: 11, color: '#a0aec0', marginTop: 3 }}>{new Date(act.createdAt).toLocaleString()}</p>
                  {act.notes && <p style={{ fontSize: 12, color: '#718096', marginTop: 4, fontStyle: 'italic' }}>"{act.notes}"</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a202c', marginBottom: 16 }}>Upcoming Tasks</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks.length === 0 ? (
              <p style={{ fontSize: 13, color: '#a0aec0' }}>No pending tasks.</p>
            ) : tasks.map((task) => (
              <div key={task._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: '#f7f8fc', border: '1px solid #f0f4f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: task.priority === 'high' ? '#d93025' : task.priority === 'medium' ? '#f29900' : '#1a73e8' }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1a202c' }}>{task.title}</p>
                    <p style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                      {task.leadId && ` • ${task.leadId.name}`}
                    </p>
                  </div>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }} title={task.assignedTo?.name}>
                  {task.assignedTo?.name?.charAt(0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

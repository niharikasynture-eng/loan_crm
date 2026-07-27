'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { Building2, Plus, X, Loader2 } from 'lucide-react';

interface Project {
  _id: string; name: string; location: string; type: string; status: string;
  rera_number?: string; createdAt: string;
}

export default function ProjectsPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', type: 'Residential', status: 'upcoming', rera_number: '' });

  useEffect(() => {
    if (currentUser?.role === 'sales_agent') router.replace('/dashboard');
  }, [currentUser, router]);

  async function loadProjects() {
    setLoading(true);
    try {
      const data = await api.get<{ projects: Project[] }>('/projects');
      setProjects(data.projects);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadProjects(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/projects', form);
      setIsModalOpen(false); loadProjects();
    } catch (err: any) { alert(err.message || 'Operation failed'); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ maxWidth: 1280 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a202c' }}>Projects</h1>
          <p style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>Manage real estate projects and buildings</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary"><Plus size={15} /> Add Project</button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#a0aec0', fontSize: 14 }}>Loading projects...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7f8fc', borderBottom: '1px solid #e2e8f0' }}>
                {['Project Name', 'Location', 'Type', 'Status', 'RERA', 'Added'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: '#a0aec0' }}>No projects found</td></tr>
              ) : projects.map((p) => (
                <tr key={p._id} style={{ borderBottom: '1px solid #f0f4f9', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f7f8fc')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a73e8' }}>
                        <Building2 size={16} />
                      </div>
                      <p style={{ fontWeight: 600, color: '#1a202c', fontSize: 14 }}>{p.name}</p>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#4a5568', fontSize: 13 }}>{p.location}</td>
                  <td style={{ padding: '14px 16px', color: '#4a5568', fontSize: 13 }}>{p.type}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: p.status === 'ongoing' ? '#e6f4ea' : '#fef7e0', color: p.status === 'ongoing' ? '#0f9d58' : '#f29900', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase' }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#718096', fontSize: 13 }}>{p.rera_number || '—'}</td>
                  <td style={{ padding: '14px 16px', color: '#a0aec0', fontSize: 13 }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a202c' }}>Add Project</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', padding: 4 }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Project Name', name: 'name', type: 'text', required: true },
                { label: 'Location', name: 'location', type: 'text', required: true },
                { label: 'RERA Number (Optional)', name: 'rera_number', type: 'text', required: false },
              ].map(({ label, name, type, required }) => (
                <div key={name}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>{label}</label>
                  <input type={type} className="input-field" value={form[name as keyof typeof form]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} required={required} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Type</label>
                <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Mixed Use">Mixed Use</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 1 }}>
                  {submitting && <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />} Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

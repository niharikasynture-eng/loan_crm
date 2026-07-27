'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { MapPin, Plus, X, Loader2 } from 'lucide-react';

interface SiteVisit {
  _id: string; lead_id: { _id: string, name: string, phone: string }; project_id: { _id: string, name: string };
  visit_date: string; visit_time: string; status: string; createdAt: string;
}
interface Project { _id: string; name: string; }
interface Lead { _id: string; name: string; }

export default function SiteVisitsPage() {
  const { user: currentUser } = useAuth();
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ lead_id: '', project_id: '', visit_date: '', visit_time: '', status: 'Scheduled' });

  async function loadData() {
    setLoading(true);
    try {
      const [visitData, projData, leadData] = await Promise.all([
        api.get<{ visits: SiteVisit[] }>('/site-visits'),
        api.get<{ projects: Project[] }>('/projects'),
        api.get<{ leads: Lead[] }>('/leads')
      ]);
      setVisits(visitData.visits);
      setProjects(projData.projects);
      setLeads(leadData.leads);
      if (projData.projects.length > 0) setForm(f => ({ ...f, project_id: projData.projects[0]._id }));
      if (leadData.leads.length > 0) setForm(f => ({ ...f, lead_id: leadData.leads[0]._id }));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/site-visits', form);
      setIsModalOpen(false); loadData();
    } catch (err: any) { alert(err.message || 'Operation failed'); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ maxWidth: 1280 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a202c' }}>Site Visits</h1>
          <p style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>Schedule and track customer property visits</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary"><Plus size={15} /> Schedule Visit</button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#a0aec0', fontSize: 14 }}>Loading visits...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7f8fc', borderBottom: '1px solid #e2e8f0' }}>
                {['Lead', 'Project', 'Date & Time', 'Status', 'Scheduled On'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: '#a0aec0' }}>No site visits found</td></tr>
              ) : visits.map((v) => (
                <tr key={v._id} style={{ borderBottom: '1px solid #f0f4f9', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f7f8fc')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9' }}>
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: '#1a202c', fontSize: 14 }}>{v.lead_id?.name || 'Unknown'}</p>
                        <p style={{ fontSize: 12, color: '#a0aec0' }}>{v.lead_id?.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#4a5568', fontSize: 13 }}>{v.project_id?.name || '—'}</td>
                  <td style={{ padding: '14px 16px', color: '#4a5568', fontSize: 13 }}>{new Date(v.visit_date).toLocaleDateString()} {v.visit_time}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ 
                      background: v.status === 'Completed' ? '#e6f4ea' : v.status === 'Scheduled' ? '#e8f0fe' : '#fce8e6', 
                      color: v.status === 'Completed' ? '#0f9d58' : v.status === 'Scheduled' ? '#1a73e8' : '#d93025', 
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase' 
                    }}>
                      {v.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#a0aec0', fontSize: 13 }}>{new Date(v.createdAt).toLocaleDateString()}</td>
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
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a202c' }}>Schedule Site Visit</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', padding: 4 }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Lead</label>
                <select className="input-field" value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })} required>
                  {leads.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Project</label>
                <select className="input-field" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} required>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              {[
                { label: 'Date', name: 'visit_date', type: 'date', required: true },
                { label: 'Time', name: 'visit_time', type: 'time', required: true },
              ].map(({ label, name, type, required }) => (
                <div key={name}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>{label}</label>
                  <input type={type} className="input-field" value={form[name as keyof typeof form]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} required={required} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 1 }}>
                  {submitting && <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />} Schedule
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

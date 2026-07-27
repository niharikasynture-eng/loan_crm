'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { Bookmark, Plus, X, Loader2 } from 'lucide-react';

interface Booking {
  _id: string; lead_id: { _id: string, name: string, phone: string }; inventory_id: { _id: string, project_id: {name: string}, flat_number: string };
  booking_amount: number; booking_date: string; booking_status: string; createdAt: string;
}
interface Inventory { _id: string; flat_number: string; project_id: {name: string}; status: string; }
interface Lead { _id: string; name: string; }

export default function BookingsPage() {
  const { user: currentUser } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ lead_id: '', inventory_id: '', booking_amount: '', booking_date: new Date().toISOString().split('T')[0] });

  async function loadData() {
    setLoading(true);
    try {
      const [bookData, invData, leadData] = await Promise.all([
        api.get<{ bookings: Booking[] }>('/bookings'),
        api.get<{ inventory: Inventory[] }>('/inventory'), // In reality, filter by available
        api.get<{ leads: Lead[] }>('/leads')
      ]);
      setBookings(bookData.bookings);
      const available = invData.inventory.filter(i => i.status === 'Available');
      setInventory(available);
      setLeads(leadData.leads);
      if (available.length > 0) setForm(f => ({ ...f, inventory_id: available[0]._id }));
      if (leadData.leads.length > 0) setForm(f => ({ ...f, lead_id: leadData.leads[0]._id }));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/bookings', { ...form, booking_amount: Number(form.booking_amount) });
      setIsModalOpen(false); loadData();
    } catch (err: any) { alert(err.message || 'Operation failed'); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ maxWidth: 1280 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a202c' }}>Bookings</h1>
          <p style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>Manage inventory bookings and requests</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary"><Plus size={15} /> Request Booking</button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#a0aec0', fontSize: 14 }}>Loading bookings...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7f8fc', borderBottom: '1px solid #e2e8f0' }}>
                {['Lead', 'Project & Unit', 'Booking Amount', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: '#a0aec0' }}>No bookings found</td></tr>
              ) : bookings.map((b) => (
                <tr key={b._id} style={{ borderBottom: '1px solid #f0f4f9', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f7f8fc')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f3f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                        <Bookmark size={16} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: '#1a202c', fontSize: 14 }}>{b.lead_id?.name || 'Unknown'}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#4a5568', fontSize: 13 }}>
                    <p style={{ fontWeight: 600 }}>{b.inventory_id?.project_id?.name || '—'}</p>
                    <p style={{ fontSize: 12, color: '#a0aec0' }}>Unit {b.inventory_id?.flat_number || '—'}</p>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#4a5568', fontSize: 13 }}>₹{b.booking_amount?.toLocaleString() || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ 
                      background: b.booking_status === 'Approved' ? '#e6f4ea' : b.booking_status === 'Pending' ? '#fef7e0' : '#fce8e6', 
                      color: b.booking_status === 'Approved' ? '#0f9d58' : b.booking_status === 'Pending' ? '#f29900' : '#d93025', 
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase' 
                    }}>
                      {b.booking_status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#a0aec0', fontSize: 13 }}>{new Date(b.booking_date).toLocaleDateString()}</td>
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
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a202c' }}>Request Booking</h2>
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
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Available Inventory Unit</label>
                <select className="input-field" value={form.inventory_id} onChange={(e) => setForm({ ...form, inventory_id: e.target.value })} required>
                  {inventory.map(i => <option key={i._id} value={i._id}>{i.project_id?.name} - Unit {i.flat_number}</option>)}
                </select>
              </div>
              {[
                { label: 'Booking Amount (₹)', name: 'booking_amount', type: 'number', required: true },
                { label: 'Date', name: 'booking_date', type: 'date', required: true },
              ].map(({ label, name, type, required }) => (
                <div key={name}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>{label}</label>
                  <input type={type} className="input-field" value={form[name as keyof typeof form]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} required={required} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 1 }}>
                  {submitting && <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />} Submit Request
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

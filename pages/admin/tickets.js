import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [types, setTypes] = useState([]);
  const [filterType, setFilterType] = useState('');

  useEffect(()=>{ fetch(); }, []);

  async function fetch(){
    const { data: t } = await supabase.from('tickets').select('*,ticket_types(name)').eq('status','open').order('created_at', { ascending: false });
    const { data: types } = await supabase.from('ticket_types').select('*');
    setTickets(t || []);
    setTypes(types || []);
  }

  async function close(ticketId) {
    if (!confirm('Close ticket? This will delete it permanently if configured.')) return;
    // here we simply delete ticket to save storage as requested
    await supabase.from('tickets').delete().eq('id', ticketId);
    fetch();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold">Open Tickets</h2>
      <div className="mt-4">
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="p-2 border rounded">
          <option value="">All</option>
          {types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {tickets.filter(t => !filterType || t.ticket_type_id === filterType).map(t => (
          <div key={t.id} className="p-3 bg-white rounded flex justify-between">
            <div>
              <div className="font-semibold">{t.ticket_types?.name ?? '—'}</div>
              <div className="text-sm text-gray-600">{t.description}</div>
              <div className="text-xs text-gray-400">{new Date(t.created_at).toLocaleString()}</div>
            </div>
            <div className="flex gap-2 items-center">
              <a className="text-blue-600" href={`/tickets/${t.id}`}>Open</a>
              <button onClick={()=>close(t.id)} className="text-red-600">Close & Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ManageTypes() {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', discord_webhook: '', ping_role_id: '' });

  useEffect(() => { fetchTypes(); }, []);

  async function fetchTypes() {
    const { data } = await supabase.from('ticket_types').select('*').order('order');
    setTypes(data ?? []);
  }

  async function createType(e) {
    e.preventDefault();
    await supabase.from('ticket_types').insert([form]);
    setForm({ name: '', description: '', discord_webhook: '', ping_role_id: '' });
    fetchTypes();
  }

  async function deleteType(id) {
    if (!confirm('Delete ticket type?')) return;
    await supabase.from('ticket_types').delete().eq('id', id);
    fetchTypes();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold">Manage Ticket Types</h2>
      <form onSubmit={createType} className="mt-4 p-4 bg-white rounded shadow">
        <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name" className="w-full mb-2 p-2 border rounded"/>
        <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description" className="w-full mb-2 p-2 border rounded"/>
        <input value={form.discord_webhook} onChange={e=>setForm({...form,discord_webhook:e.target.value})} placeholder="Discord Webhook URL" className="w-full mb-2 p-2 border rounded"/>
        <input value={form.ping_role_id} onChange={e=>setForm({...form,ping_role_id:e.target.value})} placeholder="Ping Role ID (optional)" className="w-full mb-2 p-2 border rounded"/>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
      </form>

      <div className="mt-6 space-y-3">
        {types.map(t => (
          <div key={t.id} className="p-3 bg-white rounded flex justify-between items-center">
            <div>
              <div className="font-semibold">{t.name}</div>
              <div className="text-sm text-gray-500">{t.description}</div>
              <div className="text-xs text-gray-400">{t.discord_webhook ? 'Webhook set' : 'No webhook'}</div>
            </div>
            <div>
              <button onClick={()=>deleteType(t.id)} className="text-red-600 text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

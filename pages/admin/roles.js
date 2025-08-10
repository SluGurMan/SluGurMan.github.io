import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ManageRoles() {
  const [roles, setRoles] = useState([]);
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ name: '' });

  useEffect(() => { fetchData(); }, []);
  async function fetchData() {
    const { data: r } = await supabase.from('site_roles').select('*');
    const { data: t } = await supabase.from('ticket_types').select('*');
    setRoles(r ?? []); setTypes(t ?? []);
  }

  async function createRole(e) {
    e.preventDefault();
    const { data } = await supabase.from('site_roles').insert([form]).select().single();
    // default no perms; admin will set perms below
    setForm({ name: '' });
    fetchData();
  }

  async function deleteRole(id) {
    if (!confirm('Delete role?')) return;
    await supabase.from('site_roles').delete().eq('id', id);
    fetchData();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold">Manage Site Roles</h2>
      <form onSubmit={createRole} className="mt-4 flex gap-2">
        <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Role name" className="p-2 border rounded flex-1"/>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
      </form>

      <div className="mt-4 space-y-3">
        {roles.map(r => (
          <div key={r.id} className="p-3 bg-white rounded flex justify-between items-center">
            <div>
              <div className="font-semibold">{r.name}</div>
              <div className="text-sm text-gray-500">{r.description}</div>
            </div>
            <div className="flex gap-2">
              <a href={`/admin/role-perms/${r.id}`} className="text-blue-600 text-sm">Permissions</a>
              <button onClick={()=>deleteRole(r.id)} className="text-red-600 text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

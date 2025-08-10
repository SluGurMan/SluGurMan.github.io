import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function Staff() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => { fetchData(); }, []);
  async function fetchData(){
    const { data: r } = await supabase.from('site_roles').select('*');
    const { data: s } = await supabase.from('profiles').select('*');
    setRoles(r || []);
    setUsers(s || []);
  }

  async function grant() {
    if (!selectedUser || !selectedRole) return alert('choose');
    await supabase.from('staff_roles').insert([{ user_id: selectedUser, site_role_id: selectedRole }]);
    fetchData();
  }

  async function revoke(id) {
    if (!confirm('Revoke this assignment?')) return;
    await supabase.from('staff_roles').delete().eq('id', id);
    fetchData();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold">Staff Assignments</h2>
      <div className="mt-4 p-4 bg-white rounded">
        <select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} className="p-2 border rounded w-full mb-2">
          <option value="">Select user</option>
          {users.map(u=> <option key={u.id} value={u.id}>{u.display_name ?? u.id}</option>)}
        </select>
        <select value={selectedRole} onChange={e=>setSelectedRole(e.target.value)} className="p-2 border rounded w-full mb-2">
          <option value="">Select role</option>
          {roles.map(r=> <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button onClick={grant} className="px-4 py-2 bg-green-600 text-white rounded">Grant Role</button>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold">Current Assignments</h3>
        <StaffList revoke={revoke} />
      </div>
    </div>
  );
}

function StaffList({ revoke }) {
  const [assigns, setAssigns] = useState([]);
  useEffect(()=>{ fetch(); }, []);
  async function fetch(){
    const { data } = await supabase.from('staff_roles').select('id, user_id, site_roles(name)').order('created_at', { ascending: false });
    setAssigns(data || []);
  }
  return (
    <div className="mt-2 space-y-2">
      {assigns.map(a => (
        <div key={a.id} className="p-3 bg-white rounded flex justify-between items-center">
          <div>{a.user_id} — <span className="font-semibold">{a.site_roles?.name}</span></div>
          <button onClick={()=>revoke(a.id)} className="text-red-600">Revoke</button>
        </div>
      ))}
    </div>
  );
}

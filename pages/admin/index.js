import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [types, setTypes] = useState([]);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(r => setUser(r.data.session?.user ?? null));
    fetchData();
  }, []);

  async function fetchData() {
    const { data: t } = await supabase.from('ticket_types').select('*').order('order');
    const { data: r } = await supabase.from('site_roles').select('*');
    setTypes(t || []);
    setRoles(r || []);
  }

  // quick guard: replace this with proper owner check (e.g. staff_roles table)
  useEffect(() => {
    if (!user) return;
    // check staff_roles table for a role with 'admin' name or being creator
    (async () => {
      const { data } = await supabase.from('staff_roles').select('*,site_roles(*)').eq('user_id', user.id);
      const isAdmin = data?.some(d => d.site_roles?.name?.toLowerCase().includes('owner') || d.site_roles?.name?.toLowerCase().includes('admin'));
      setIsOwner(isAdmin);
    })();
  }, [user]);

  if (!user) return <div className="p-6">Please sign in with Discord first. <button className="ml-2 text-blue-600" onClick={() => supabase.auth.signInWithOAuth({ provider: 'discord' })}>Sign in</button></div>;
  if (!isOwner) return <div className="p-6">You are not an admin (owner-only area).</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold">Admin Panel</h2>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <h3 className="font-semibold">Ticket Types</h3>
          <Link href="/admin/ticket-types"><a className="text-blue-600 text-sm">Manage ticket types</a></Link>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <h3 className="font-semibold">Roles</h3>
          <Link href="/admin/roles"><a className="text-blue-600 text-sm">Manage site roles</a></Link>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <h3 className="font-semibold">Staff</h3>
          <Link href="/admin/staff"><a className="text-blue-600 text-sm">Staff management</a></Link>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <h3 className="font-semibold">Tickets</h3>
          <Link href="/admin/tickets"><a className="text-blue-600 text-sm">View open tickets</a></Link>
        </div>
      </div>
    </div>
  );
}

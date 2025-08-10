import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function RolePerms() {
  const router = useRouter();
  const { id } = router.query;
  const [types, setTypes] = useState([]);
  const [perms, setPerms] = useState({});

  useEffect(()=>{ if (id) fetch(); }, [id]);

  async function fetch() {
    const { data: t } = await supabase.from('ticket_types').select('*');
    const { data: p } = await supabase.from('role_permissions').select('*').eq('site_role_id', id);
    setTypes(t ?? []);
    const map = {};
    (p || []).forEach(row => map[row.ticket_type_id] = row);
    setPerms(map);
  }

  async function toggle(ticketTypeId, field) {
    const current = perms[ticketTypeId] || { can_view:false, can_accept:false, can_close:false };
    const updated = { ...current, [field]: !current[field], site_role_id: id, ticket_type_id: ticketTypeId };
    // upsert
    const { data } = await supabase.from('role_permissions').upsert([updated], { onConflict: ['site_role_id', 'ticket_type_id'] }).select();
    // refresh
    fetch();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold">Role Permissions</h2>
      <div className="mt-4 space-y-2">
        {types.map(t => {
          const p = perms[t.id] || {};
          return (
            <div key={t.id} className="p-3 bg-white rounded flex justify-between items-center">
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm text-gray-500">{t.description}</div>
              </div>
              <div className="flex gap-2 items-center">
                <label><input type="checkbox" checked={!!p.can_view} onChange={()=>toggle(t.id,'can_view')} /> view</label>
                <label><input type="checkbox" checked={!!p.can_accept} onChange={()=>toggle(t.id,'can_accept')} /> accept</label>
                <label><input type="checkbox" checked={!!p.can_close} onChange={()=>toggle(t.id,'can_close')} /> close</label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

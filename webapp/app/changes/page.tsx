import { createClient } from '@supabase/supabase-js';
import ChangeForm from './ChangeForm';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function ChangesPage() {
  const { data: campaigns } = await supabase.from('campaigns').select('id, name');

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Log a change</h1>
      <ChangeForm campaigns={campaigns ?? []} />
    </div>
  );
}
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}
const supabase = createClient(url, key);
(async () => {
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name,data_type,is_nullable')
      .eq('table_name', 'orders')
      .eq('table_schema', 'public')
      .order('ordinal_position', { ascending: true });
    if (error) {
      console.error('Error querying schema:', error);
      return;
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
})();

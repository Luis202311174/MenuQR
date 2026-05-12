const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log('URL set:', !!url, 'KEY set:', !!key);
if (!url || !key) process.exit(0);
const supabase = createClient(url, key);
(async () => {
  try {
    const res = await supabase.from('coupons').select('*').limit(1);
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('ERROR', err);
  }
})();

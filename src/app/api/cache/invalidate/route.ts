import { NextResponse } from 'next/server';
import { redisDel } from '@/lib/redis';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const key = data?.key;
    if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

    await redisDel(key);
    return NextResponse.json({ ok: true, key });
  } catch (e: any) {
    console.error('Cache invalidate error:', e?.message || e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

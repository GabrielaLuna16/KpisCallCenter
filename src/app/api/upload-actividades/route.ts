import { NextResponse } from 'next/server';
import { z } from 'zod';
import { commitFile } from '@/lib/github';
import type { MonthIndex, MonthEntry } from '@/types/data';

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato de mes inválido. Usa YYYY-MM'),
  data: z.record(z.string(), z.unknown()),
});

async function readIndex(): Promise<MonthIndex> {
  try {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const res = await fetch(`${base}/data/index.json`, { cache: 'no-store' });
    if (!res.ok) return { months: [] };
    return res.json();
  } catch {
    return { months: [] };
  }
}

function monthLabel(month: string): string {
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const [y, m] = month.split('-');
  return `${MESES[parseInt(m) - 1]} ${y}`;
}

export async function POST(request: Request) {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) {
    return NextResponse.json({ error: 'Variables de entorno de GitHub no configuradas.' }, { status: 500 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { month, data } = parsed.data;
  const label = monthLabel(month);

  try {
    await commitFile(
      `public/data/${month}-actividades.json`,
      JSON.stringify(data, null, 2),
      `actividades: ${label}`
    );

    const index = await readIndex();
    const existing = index.months.find(m => m.key === month);
    if (existing) {
      existing.hasActividades = true;
    } else {
      const entry: MonthEntry = { key: month, label, hasActividades: true, hasRespuesta: false };
      index.months.push(entry);
      index.months.sort((a, b) => b.key.localeCompare(a.key));
    }
    await commitFile('public/data/index.json', JSON.stringify(index, null, 2), `index: actividades ${label}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

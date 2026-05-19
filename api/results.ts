import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPartidos } from '../src/services/promiedos.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const partidos = await getPartidos();
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        return res.status(200).json(partidos);
    } catch (error: any) {
        console.error('Scraper error:', error.message);
        return res.status(500).json({ error: 'Error al obtener los partidos' });
    }
}

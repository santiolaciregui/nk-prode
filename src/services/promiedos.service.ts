import axios from "axios";
import * as cheerio from "cheerio";

const url = 'https://www.promiedos.com.ar/league/fifa-world-cup/fjda';

export interface Partido {
    leagueTitle: string;
    leagueFlag: string | undefined;
    gameState: string | null;
    gamet1: string;
    gamet2: string;
    gamer1: string;
    gamer2: string;
    url: string;
    fecha: string;       // "Fecha 1" | "Fecha 2" | "Fecha 3"
    group: string;       // "Grupo A" | "Grupo B" | ... | ""
}

export async function getPartidos(): Promise<Partido[]> {
    const response = await axios.get(url, {
        headers: {
           "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
        }
    });
    const html = response.data;
    const $ = cheerio.load(html);

    const partidos: Partido[] = [];
    const nextDataScript = $('#__NEXT_DATA__').html();

    if (!nextDataScript) {
        console.warn("No se encontró el script __NEXT_DATA__ en la página de Promiedos.");
        return partidos;
    }

    try {
        const jsonData = JSON.parse(nextDataScript);
        const dataObj = jsonData.props?.pageProps?.data;
        const buildId = jsonData.buildId;

        if (!dataObj?.games?.filters || !buildId) return partidos;

        // Build teamId -> groupName map from tables_groups
        const teamToGroup: Record<string, string> = {};
        const tablesGroups = dataObj.tables_groups || [];
        for (const section of tablesGroups) {
            for (const groupTable of (section.tables || [])) {
                const groupName: string = groupTable.name; // "Grupo A", "Grupo B", etc.
                for (const row of (groupTable.table?.rows || [])) {
                    const teamName: string | undefined = row.entity?.object?.name;
                    if (teamName) {
                        teamToGroup[teamName] = groupName;
                    }
                }
            }
        }

        const leagueTitle = dataObj.league?.name || 'Mundial';
        const leagueFlag = dataObj.league?.icon_url || undefined;

        const validPhaseRegex = /Fecha|Octavo|Cuarto|Semi|Final|Tercer/i;

        for (const filter of dataObj.games.filters) {
            if (!validPhaseRegex.test(filter.name)) continue;

            let matches: any[] = [];

            if (filter.games) {
                matches = filter.games;
            } else {
                const jsonUrl = `https://www.promiedos.com.ar/_next/data/${buildId}/league/fifa-world-cup/fjda.json?id=fifa-world-cup&id=fjda&filter=${filter.key}`;
                try {
                    const filterResp = await axios.get(jsonUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
                    const dynamicFilters = filterResp.data?.pageProps?.data?.games?.filters;
                    const dynamicSelected = dynamicFilters?.find((f: any) => f.selected);
                    matches = dynamicSelected?.games || [];
                } catch (e: any) {
                    console.error(`Error fetching dynamic filter ${filter.name}:`, e.message);
                }
            }

            for (const match of matches) {
                let gameState = match.game_time_status_to_display || match.status?.name || '';
                if (match.status?.name === 'Prog.' && match.start_time) {
                    gameState = `Prog. ${match.start_time}`;
                }

                const gamet1 = match.teams?.[0]?.name || match.teams?.[0]?.short_name || '';
                const gamet2 = match.teams?.[1]?.name || match.teams?.[1]?.short_name || '';
                const gamer1 = match.scores && match.scores.length > 0 ? String(match.scores[0]) : '';
                const gamer2 = match.scores && match.scores.length > 1 ? String(match.scores[1]) : '';

                const group = teamToGroup[gamet1] || teamToGroup[gamet2] || '';

                if (gameState || gamet1 || gamet2) {
                    partidos.push({
                        leagueTitle,
                        leagueFlag,
                        gameState,
                        gamet1,
                        gamet2,
                        gamer1,
                        gamer2,
                        url,
                        fecha: filter.name,
                        group,
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error parsing __NEXT_DATA__ JSON:", error);
    }

    return partidos;
}

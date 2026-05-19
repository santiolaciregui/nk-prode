import axios from 'axios';
import * as cheerio from 'cheerio';

const url = 'https://www.promiedos.com.ar/league/fifa-world-cup/fjda';

async function test() {
    const response = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const $ = cheerio.load(response.data);
    const data = $('#__NEXT_DATA__').html()!;
    const jsonData = JSON.parse(data);
    const firstGroup = jsonData.props?.pageProps?.data?.tables_groups?.[0]?.tables?.[0];
    // print first row keys
    console.log("Row keys:", Object.keys(firstGroup?.table?.rows?.[0] || {}));
    console.log("First row:", JSON.stringify(firstGroup?.table?.rows?.[0], null, 2));
}
test();

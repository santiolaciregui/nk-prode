const axios = require('axios');
async function testUrls() {
  const urls = [
    'https://www.promiedos.com.ar/images/paises/mexico.png',
    'https://www.promiedos.com.ar/images/paises/db.png',
    'https://www.promiedos.com.ar/images/paises/fbag.png',
    'https://www.promiedos.com.ar/images/equipos/mexico.png',
    'https://www.promiedos.com.ar/images/equipos/db.png',
    'https://www.promiedos.com.ar/images/equipos/fbag.png',
    'https://www.promiedos.com.ar/images/48/db.png',
    'https://www.promiedos.com.ar/images/64/db.png',
    'https://www.promiedos.com.ar/images/escudos/fbag.png'
  ];
  for (const url of urls) {
     try {
       const res = await axios.head(url, { headers: { "User-Agent": "Mozilla/5.0" }});
       console.log("SUCCESS:", url);
     } catch(e) {
       console.log("FAIL:", url);
     }
  }
}
testUrls();

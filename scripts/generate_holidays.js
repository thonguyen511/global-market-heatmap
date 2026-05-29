const fs = require('fs');
const path = require('path');
const Holidays = require('date-holidays');

const marketsPath = path.join(__dirname, '../assets/geo/markets.json');
const outputPath = path.join(__dirname, '../assets/geo/holidays.json');
const year = new Date().getFullYear();

function generate() {
    const data = JSON.parse(fs.readFileSync(marketsPath, 'utf8'));
    const cache = {};
    
    data.forEach(m => {
        const iso3 = m.iso;
        const iso2 = m.iso2;
        
        if (iso3 === 'EUR' || iso3 === 'EUN' || !iso2) { // Europe regions or missing iso2
            cache[iso3] = [];
            return;
        }

        try {
            const hd = new Holidays(iso2);
            const list = hd.getHolidays(year);
            if (list) {
                cache[iso3] = list.filter(h => h.type === 'public').map(h => h.date.split(' ')[0]);
            } else {
                cache[iso3] = [];
            }
        } catch (e) {
            cache[iso3] = [];
        }
    });
    fs.writeFileSync(outputPath, JSON.stringify(cache, null, 2));
    console.log('Done generating holidays using iso2 from markets.json!');
}
generate();

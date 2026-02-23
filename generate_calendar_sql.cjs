const fs = require('fs');

const events = [];

function addEvent(title, date, type, color) {
    events.push({
        title,
        event_date: date,
        type,
        color,
        all_day: true
    });
}

function addRange(title, startStr, endStr, type, color) {
    let current = new Date(startStr);
    const end = new Date(endStr);
    
    // Safety check: prevent infinite loop if dates are swapped
    if (current > end) return;

    while (current <= end) {
        const dateString = current.toISOString().split('T')[0];
        addEvent(title, dateString, type, color);
        
        // Add 1 day safely using UTC
        current.setUTCDate(current.getUTCDate() + 1);
    }
}

// 1. Inici de curs
addEvent('Inici de curs', '2025-09-08', 'general', '#3b82f6');

// 2. Vacances
// Nadal: 2025-12-20 al 2026-01-07
addRange('Vacances de Nadal', '2025-12-20', '2026-01-07', 'celebration', '#ec4899');

// Setmana Santa: 2026-03-28 al 2026-04-06
addRange('Vacances de Setmana Santa', '2026-03-28', '2026-04-06', 'celebration', '#ec4899');

// Estiu: A partir del 20 de juny
addEvent('Inici Vacances Estiu', '2026-06-20', 'celebration', '#ec4899');


// 3. Dies lliure disposició
const freeDays = ['2025-11-03', '2026-02-16', '2026-03-13', '2026-06-05'];
freeDays.forEach(day => addEvent('Dia de lliure disposició', day, 'general', '#8b5cf6')); // Purple

// 4. Festius locals
const localHolidays = ['2025-10-10', '2026-05-25'];
localHolidays.forEach(day => addEvent('Festa local', day, 'celebration', '#ef4444')); // Red


// Generate SQL
let sql = `
INSERT INTO events (title, event_date, event_type, color, all_day) VALUES
`;

const values = events.map(e => {
    return `('${e.title}', '${e.event_date}', '${e.type}', '${e.color}', ${e.all_day})`;
});

sql += values.join(',\n') + ';';

console.log(sql);

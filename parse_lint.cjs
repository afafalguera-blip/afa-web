const fs = require('fs');
const content = fs.readFileSync('lint_report.json', 'utf8');
const lines = content.split('\n');
const jsonStr = lines.slice(4).join('\n'); // Skip the first 4 lines of header
try {
    const report = JSON.parse(jsonStr);
    const rules = {};
    report.forEach(file => {
        file.messages.forEach(msg => {
            rules[msg.ruleId] = (rules[msg.ruleId] || 0) + 1;
        });
    });
    console.log(JSON.stringify(rules, null, 2));
} catch (e) {
    console.error('Failed to parse JSON:', e.message);
    console.log('Skipping lines and trying again...');
    // Fallback: search for the start of the array [
    const startIndex = content.indexOf('[');
    if (startIndex !== -1) {
        const report = JSON.parse(content.substring(startIndex));
        const rules = {};
        report.forEach(file => {
            file.messages.forEach(msg => {
                rules[msg.ruleId] = (rules[msg.ruleId] || 0) + 1;
            });
        });
        console.log(JSON.stringify(rules, null, 2));
    }
}

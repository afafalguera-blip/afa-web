const fs = require('fs');
const pdf = require('pdf-parse');

console.log('Type of pdf:', typeof pdf);
console.log('pdf export:', pdf);

// Double backslashes for windows path string
const pdfPath = 'c:\\Users\\Administrator\\Desktop\\Proyectos\\AFA\\25-26 ASSEMBLEA GENERAL AFA ESCOLA FALGUERA.pdf';

try {
    let dataBuffer = fs.readFileSync(pdfPath);
    console.log(`Reading PDF from: ${pdfPath}`);
    
    if (typeof pdf === 'function') {
        pdf(dataBuffer).then(function(data) {
             console.log('--- CONTENT START ---');
             console.log(data.text);
             console.log('--- CONTENT END ---');
        }).catch(e => console.error(e));
    } else if (typeof pdf.default === 'function') {
         pdf.default(dataBuffer).then(function(data) {
             console.log('--- CONTENT START ---');
             console.log(data.text);
             console.log('--- CONTENT END ---');
        }).catch(e => console.error(e));
    } else {
        console.error("PDF parse library not loaded correctly. Keys:", Object.keys(pdf));
    }
} catch (err) {
    console.error("Error reading file:", err);
}

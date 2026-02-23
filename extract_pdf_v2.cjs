const fs = require('fs');
// Try to require pdf-extraction, if not try pdf-parse just in case the install works differently
let pdf;
try {
    pdf = require('pdf-extraction');
} catch (e) {
    console.log("pdf-extraction not found, trying pdf-parse again or failing.");
    pdf = require('pdf-parse'); 
}

const pdfPath = 'c:\\Users\\Administrator\\Desktop\\Proyectos\\AFA\\25-26 ASSEMBLEA GENERAL AFA ESCOLA FALGUERA.pdf';

try {
    let dataBuffer = fs.readFileSync(pdfPath);
    console.log(`Reading PDF from: ${pdfPath}`);
    
    // simple check if it's a function
    if (typeof pdf === 'function') {
         pdf(dataBuffer).then(function(data) {
            console.log(data.text);
        }).catch(err => console.error(err));
    } else {
        // If it's the weird object again
        console.log("PDF export is not a function:", pdf);
    }

} catch (err) {
    console.error("Error reading file:", err);
}

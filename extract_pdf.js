const fs = require('fs');
const pdf = require('pdf-parse');

// Double backslashes for windows path string
const pdfPath = 'c:\\Users\\Administrator\\Desktop\\Proyectos\\AFA\\25-26 ASSEMBLEA GENERAL AFA ESCOLA FALGUERA.pdf';

try {
    let dataBuffer = fs.readFileSync(pdfPath);
    console.log(`Reading PDF from: ${pdfPath}`);
    
    pdf(dataBuffer).then(function(data) {
        // number of pages
        console.log(`Pages: ${data.numpages}`);
        // PDF info
        console.log(`Info: ${JSON.stringify(data.info)}`);
        
        console.log('--- CONTENT START ---');
        console.log(data.text);
        console.log('--- CONTENT END ---');
    }).catch(e => {
        console.error("Error parsing PDF:", e);
    });
} catch (err) {
    console.error("Error reading file:", err);
}

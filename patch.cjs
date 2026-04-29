const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');
code = code.replace(/\{ lookingFor: \"\", when: \"\", where: \"\" \}/g, '{ lookingFor: "", when: "", where: "", instagram: "" }');
fs.writeFileSync('src/pages/Home.tsx', code);

import fs from 'fs';
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
content = content.replace(/dark:dark:text-[a-zA-Z0-9-]+ /g, '');
content = content.replace(/ \]/g, ']');
fs.writeFileSync('src/pages/Dashboard.tsx', content);
console.log('Fixed double darks');

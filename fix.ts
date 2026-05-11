import fs from 'fs';
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
content = content.replace(/dark:dark:text-[a-z]+-\d+ /g, '');
fs.writeFileSync('src/pages/Dashboard.tsx', content);
console.log('Fixed double darks');

import fs from 'fs';

const filesToClean = [
  './src/pages/Home.tsx',
  './src/components/ExtraThemes.tsx',
  './src/components/Logo.tsx',
  './src/components/ErrorBoundary.tsx',
  './src/App.tsx'
];

filesToClean.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\s*dark:[a-zA-Z0-9\/\[\]_\-#\.]+\b/g, '');
    fs.writeFileSync(file, content);
  }
});

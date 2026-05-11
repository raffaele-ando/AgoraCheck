const fs = require('fs');

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// 1. Delete badges on profiles
content = content.replace(
  /\{\/\* show id, just the top one or macro id \*\/\}.*?<div className="absolute top-0 right-0[^>]*>.*?<\/div>/s,
  ''
);

// 2. Delete badges on messages (Profilato)
content = content.replace(
  /\{!msg\.instagram && \(\s*<div className="absolute top-0 right-0[^>]*>.*?Profilato.*?<\/div>\s*\)\}/s,
  ''
);

// 3. Remove truncate classes from detailed info sections. We'll simply replace `className="truncate"` or `className="[^"]*truncate[^"]*"` with text wrapping.
content = content.replace(/truncate"/g, 'break-words whitespace-pre-wrap"');
content = content.replace(/"truncate /g, '"break-words whitespace-pre-wrap ');
content = content.replace(/ truncate /g, ' break-words whitespace-pre-wrap ');
content = content.replace(/ truncate"/g, ' break-words whitespace-pre-wrap"');

fs.writeFileSync('src/pages/Dashboard.tsx', content);

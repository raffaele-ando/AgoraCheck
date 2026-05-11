const fs = require('fs');

function checkColors() {
  let content = fs.readFileSync('./src/pages/Dashboard.tsx', 'utf8');
  let lines = content.split('\n');
  let missing = [];
  
  lines.forEach((line, index) => {
    // Find bg-, text-, border- colors without a 'dark:' counterpart nearby.
    // Extremely simplistic check just to sample:
    const matches = line.match(/(text|bg|border)-(blue|indigo|emerald|sky|purple|pink|fuchsia|rose|orange|amber|yellow|cyan)-(500|600|700|800|900)/g);
    if (matches) {
      if (!line.includes('dark:')) {
        missing.push(`${index + 1}: ${line.trim()}`);
      }
    }
  });

  if(missing.length > 0) {
    console.log(missing.slice(0, 30).join('\n'));
  } else {
    console.log("No obvious lines without dark: completely.");
  }
}

checkColors();

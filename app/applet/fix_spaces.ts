import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, callback: (file: string) => void) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath, callback);
    } else if (fullPath.endsWith('.tsx')) {
      callback(fullPath);
    }
  }
}

walk(path.join(process.cwd(), 'src'), (filepath) => {
  const code = fs.readFileSync(filepath, 'utf8');
  let replaced = code.split('{" "}').join(' ');
  // Additionally replace any empty JSX string lines that just had spaces and got converted to ` `
  if (replaced !== code) {
    fs.writeFileSync(filepath, replaced, 'utf8');
    console.log('Fixed', filepath);
  }
});


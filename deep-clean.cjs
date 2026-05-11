const fs = require('fs');

function deepClean(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace any duplicated dark:xxx dark:xxx with a single dark:xxx
  // Using a regex to match word boundaries: (dark:[\w-/]+)(?:\s+\1)+
  const duplicateDarkRegex = /(dark:[\w\-\/]+)(\s+\1)+/g;
  content = content.replace(duplicateDarkRegex, '$1');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Deep cleaned duplicates in ${filePath}`);
  }
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(deepClean);
console.log('Done deep cleaning');

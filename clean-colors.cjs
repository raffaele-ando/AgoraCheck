const fs = require('fs');
const path = require('path');

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  content = content.replace(/dark:dark:/g, 'dark:');
  content = content.replace(/dark:text-gray-100 dark:text-gray-100/g, 'dark:text-gray-100');
  content = content.replace(/dark:text-gray-200 dark:text-gray-200/g, 'dark:text-gray-200');
  content = content.replace(/dark:text-gray-300 dark:text-gray-300/g, 'dark:text-gray-300');
  content = content.replace(/dark:text-gray-400 dark:text-gray-400/g, 'dark:text-gray-400');
  content = content.replace(/dark:text-gray-500 dark:text-gray-500/g, 'dark:text-gray-500');
  
  content = content.replace(/dark:text-slate-100 dark:text-slate-100/g, 'dark:text-slate-100');
  content = content.replace(/dark:text-slate-200 dark:text-slate-200/g, 'dark:text-slate-200');

  // Also text-gray-900 or whatever that has two
  content = content.replace(/dark:text-gray-400 dark:text-gray-500/g, 'dark:text-gray-400');
  content = content.replace(/dark:text-gray-500 dark:text-gray-400/g, 'dark:text-gray-400');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned ${filePath}`);
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
files.forEach(cleanFile);

console.log('Done');

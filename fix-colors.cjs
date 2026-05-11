const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace missing dark variants for text-black
  content = content.replace(/(?<!dark:)text-black/g, 'text-black dark:text-white');
  
  // Replace missing dark variants for text-gray-900
  content = content.replace(/(?<!dark:)text-gray-900/g, 'text-gray-900 dark:text-gray-100');
  
  // Replace missing dark variants for text-gray-800
  content = content.replace(/(?<!dark:)text-gray-800/g, 'text-gray-800 dark:text-gray-200');

  // Replace missing dark variants for text-slate-900
  content = content.replace(/(?<!dark:)text-slate-900/g, 'text-slate-900 dark:text-slate-100');

  // Replace missing dark variants for text-slate-800
  content = content.replace(/(?<!dark:)text-slate-800/g, 'text-slate-800 dark:text-slate-200');

  // Specific blue issues
  // text-blue-600 -> text-blue-600 dark:text-blue-400
  content = content.replace(/(?<!dark:)text-blue-600/g, 'text-blue-600 dark:text-blue-400');
  // text-blue-500 -> text-blue-500 dark:text-blue-400
  content = content.replace(/(?<!dark:)text-blue-500/g, 'text-blue-500 dark:text-blue-400');
  // text-blue-700 -> text-blue-700 dark:text-blue-400
  content = content.replace(/(?<!dark:)text-blue-700/g, 'text-blue-700 dark:text-blue-400');

  // bg-blue-50 -> bg-blue-50 dark:bg-blue-900/30
  content = content.replace(/(?<!dark:)bg-blue-50\b/g, 'bg-blue-50 dark:bg-blue-900/40');
  // bg-blue-100 -> bg-blue-100 dark:bg-blue-900/50
  content = content.replace(/(?<!dark:)bg-blue-100\b/g, 'bg-blue-100 dark:bg-blue-900/60');
  // bg-blue-600 -> bg-blue-600 dark:bg-blue-500
  content = content.replace(/(?<!dark:)bg-blue-600\b/g, 'bg-blue-600 dark:bg-blue-500');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      /* Recurse into a subdirectory */
      results = results.concat(walk(file));
    } else { 
      /* Is a file */
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(replaceInFile);

console.log('Done');

const fs = require('fs');

function applyDarkVariants() {
  let content = fs.readFileSync('./src/pages/Dashboard.tsx', 'utf8');
  let original = content;

  // text-purple-600
  content = content.replace(/(?<!dark:)text-purple-600/g, 'text-purple-600 dark:text-purple-400');
  // text-sky-600
  content = content.replace(/(?<!dark:)text-sky-600/g, 'text-sky-600 dark:text-sky-400');
  // text-indigo-500
  content = content.replace(/(?<!dark:)text-indigo-500/g, 'text-indigo-500 dark:text-indigo-400');
  // text-emerald-600
  content = content.replace(/(?<!dark:)text-emerald-600/g, 'text-emerald-600 dark:text-emerald-400');
  // text-orange-600
  content = content.replace(/(?<!dark:)text-orange-600/g, 'text-orange-600 dark:text-orange-400');
  
  // text-purple-800
  content = content.replace(/(?<!dark:)text-purple-800/g, 'text-purple-800 dark:text-purple-200');

  // bg-indigo-500
  content = content.replace(/(?<!dark:)bg-indigo-500/g, 'bg-indigo-500 dark:bg-indigo-600');
  // bg-indigo-600
  content = content.replace(/(?<!dark:)bg-indigo-600/g, 'bg-indigo-600 dark:bg-indigo-500');
  // bg-sky-600
  content = content.replace(/(?<!dark:)bg-sky-600/g, 'bg-sky-600 dark:bg-sky-700');
  // bg-purple-200/80
  content = content.replace(/(?<!dark:)bg-purple-200\/80/g, 'bg-purple-200/80 dark:bg-purple-900/40');
  
  // bg-orange-500
  content = content.replace(/(?<!dark:)bg-orange-500/g, 'bg-orange-500 dark:bg-orange-600');
  
  // shadow-indigo-500/30
  content = content.replace(/shadow-indigo-500\/30/g, 'shadow-indigo-500/30 dark:shadow-indigo-900/20');
  
  fs.writeFileSync('./src/pages/Dashboard.tsx', content, 'utf8');
  console.log("Updated Dashboard.tsx");
}

applyDarkVariants();

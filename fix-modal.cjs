const fs = require('fs');

function fixModalColors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Make popup text smaller if it was taking half screen
  content = content.replace(/text-lg sm:text-xl md:text-2xl/g, 'text-base sm:text-lg md:text-xl');
  content = content.replace(/text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100/g, 'text-lg sm:text-xl font-black text-gray-900 dark:text-gray-100');

  // Fix text-indigo-900 missing dark variant
  content = content.replace(/(?<!dark:)text-indigo-900/g, 'text-indigo-900 dark:text-indigo-200');

  // Fix text-blue-900 missing dark variant
  content = content.replace(/(?<!dark:)text-blue-900/g, 'text-blue-900 dark:text-blue-200');

  // Fix text-sky-800 missing dark variant
  // Wait, I see text-sky-800 dark:text-sky-200 in the code already.

  // The macro modal
  content = content.replace(/className="max-w-3xl mx-auto flex flex-col h-full animate-in/g, 'className="max-w-3xl mx-auto flex flex-col h-full animate-in w-full');
  
  // Update sidebar text contrast
  content = content.replace(/text-gray-700 dark:hover:text-gray-300 /g, 'text-gray-700 dark:hover:text-white ');
  content = content.replace(/bg-indigo-600 text-white/g, 'bg-indigo-600 dark:bg-indigo-500 text-white');
  content = content.replace(/bg-emerald-600 text-white/g, 'bg-emerald-600 dark:bg-emerald-500 text-white');

  // Make timeline dot more visible
  content = content.replace(/border-2 border-white shadow-sm/g, 'border-2 border-white dark:border-gray-800 shadow-sm');
  
  // Tab navbar in viewingMacro
  content = content.replace(/gap-1\.5 md:gap-2 overflow-x-auto/g, 'gap-2 md:gap-2 overflow-x-auto');
  
  // Make the entire modal responsive so no heavy scrolling required
  // Let's modify the flex of the content.
  content = content.replace(/className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-800 p-3 sm:p-4 md:p-6/g, 'className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-800/80 p-3 sm:p-4 md:p-6');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed modal UI in ${filePath}`);
  }
}

fixModalColors('./src/pages/Dashboard.tsx');
console.log('Done');

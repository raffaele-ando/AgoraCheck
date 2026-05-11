const fs = require('fs');

function processFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove all existing dark: classes to get back a clean slate
    content = content.replace(/\bdark:[a-z0-9/-]+\b/g, '');
    // Clean up double spaces left behind
    content = content.replace(/\s{2,}/g, ' ');

    // Mappings for common colors
    const replacements = {
        'bg-white': 'bg-gray-800',
        'bg-gray-50': 'bg-gray-800/50',
        'bg-gray-100': 'bg-gray-700',
        'bg-gray-200': 'bg-gray-600',
        'border-gray-100': 'border-gray-700',
        'border-gray-200': 'border-gray-600',
        'border-gray-300': 'border-gray-500',
        'text-gray-900': 'text-gray-100',
        'text-gray-800': 'text-gray-200',
        'text-gray-700': 'text-gray-300',
        'text-gray-600': 'text-gray-400',
        'text-gray-500': 'text-gray-400',
        'text-gray-400': 'text-gray-500',
        
        'bg-slate-50': 'bg-slate-800',
        'border-slate-200': 'border-slate-700',
        'text-slate-700': 'text-slate-300',

        'bg-indigo-50': 'bg-indigo-900/40',
        'bg-indigo-100': 'bg-indigo-900/60',
        'text-indigo-700': 'text-indigo-300',
        'text-indigo-600': 'text-indigo-400',
        'text-indigo-500': 'text-indigo-400',
        'border-indigo-100': 'border-indigo-800',
        'border-indigo-200': 'border-indigo-800',

        'bg-blue-50': 'bg-blue-900/40',
        'text-blue-700': 'text-blue-300',
        'border-blue-100': 'border-blue-800',

        'bg-emerald-50': 'bg-emerald-900/40',
        'text-emerald-700': 'text-emerald-300',
        'border-emerald-100': 'border-emerald-800',

        'bg-orange-50': 'bg-orange-900/40',
        'text-orange-700': 'text-orange-300',
        'border-orange-100': 'border-orange-800',

        'bg-pink-50': 'bg-pink-900/40',
        'text-pink-700': 'text-pink-300',
        'border-pink-100': 'border-pink-800',

        'bg-purple-50': 'bg-purple-900/40',
        'text-purple-700': 'text-purple-300',
        'border-purple-100': 'border-purple-800',

        'bg-teal-50': 'bg-teal-900/40',
        'text-teal-700': 'text-teal-300',
        'border-teal-100': 'border-teal-800',

        'bg-sky-50': 'bg-sky-900/40',
        'bg-sky-100': 'bg-sky-900/60',
        'text-sky-700': 'text-sky-300',
        'text-sky-800': 'text-sky-200',
        'border-sky-100': 'border-sky-800',
        'border-sky-200': 'border-sky-800',
        
        'bg-red-50': 'bg-red-900/40',
        'bg-red-100': 'bg-red-900/60',
        'text-red-600': 'text-red-400',
        'text-red-700': 'text-red-300',
        'text-red-800': 'text-red-200',
        'border-red-100': 'border-red-800',
        'border-red-200': 'border-red-800',
        
        // Let's add some missing values mapping backwards to avoid broken backgrounds
        'bg-gray-400': 'bg-gray-600',
        'bg-slate-200': 'bg-slate-700',
    };

    const keys = Object.keys(replacements).sort((a,b) => b.length - a.length);

    keys.forEach(key => {
        const replace = replacements[key];
        // Match prefix, the class, and not already dark:
        // Prefix can be 'hover:', 'focus:', 'group-hover:', 'sm:', 'md:', 'lg:' etc.
        // Or multiples like 'sm:hover:' => prefix is everything before the class
        const regex = new RegExp(`(?<!dark:)\\b((?:[a-z-]+:)*)(${key})\\b`, 'g');
        content = content.replace(regex, (match, prefix, cls) => {
            return `${prefix}${cls} dark:${prefix}${replace}`;
        });
    });

    fs.writeFileSync(filePath, content);
}

processFile('./src/pages/Dashboard.tsx');
processFile('./src/components/Analytics.tsx');

console.log("Cleaned and Redeployed Colors Comprehensively");

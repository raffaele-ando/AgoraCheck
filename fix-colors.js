import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === 'dist' || file.startsWith('.')) return;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(filePath));
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            results.push(filePath);
        }
    });
    return results;
}

const files = walkDir('./src');

files.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Fix dark:dark:
    content = content.replace(/dark:dark:/g, 'dark:');

    // Remove old matching logic and replace with a parser that looks for literal classes inside className="" or className={``}

    // A helper to append dark:text-... if it's missing
    function applyDarkVariant(match, fullClassAttr) {
        let classes = fullClassAttr.split(/\s+/);
        function hasDarkClass(clsArr, base) {
             return clsArr.some(c => c.startsWith('dark:' + base) || c.startsWith('dark:text-'));
        }

        let newClasses = [];
        for (let cls of classes) {
            newClasses.push(cls);
            if (cls === 'text-black' || cls === 'text-gray-900' || cls === 'text-slate-900') {
                 if (!hasDarkClass(classes, 'text')) {
                     newClasses.push('dark:text-white');
                 }
            } else if (cls === 'text-gray-800' || cls === 'text-slate-800') {
                 if (!hasDarkClass(classes, 'text')) {
                     newClasses.push('dark:text-gray-200');
                 }
            } else if (cls === 'text-gray-700' || cls === 'text-slate-700') {
                 if (!hasDarkClass(classes, 'text')) {
                     newClasses.push('dark:text-gray-300');
                 }
            } else if (cls === 'text-gray-600' || cls === 'text-slate-600') {
                 if (!hasDarkClass(classes, 'text')) {
                     newClasses.push('dark:text-gray-400');
                 }
            } else if (cls === 'text-gray-500' || cls === 'text-slate-500') {
                 if (!hasDarkClass(classes, 'text')) {
                     newClasses.push('dark:text-gray-400');
                 }
            } else if (cls === 'bg-white') {
                 if (!classes.some(c => c.startsWith('dark:bg-'))) {
                     newClasses.push('dark:bg-gray-900');
                 }
            } else if (cls === 'bg-gray-50' || cls === 'bg-slate-50') {
                 if (!classes.some(c => c.startsWith('dark:bg-'))) {
                     newClasses.push('dark:bg-gray-800/50');
                 }
            } else if (cls === 'bg-gray-100' || cls === 'bg-slate-100') {
                 if (!classes.some(c => c.startsWith('dark:bg-'))) {
                     newClasses.push('dark:bg-gray-800');
                 }
            } else if (cls.startsWith('border-gray-') && cls !== 'border-gray-transparent') {
                if (!classes.some(c => c.startsWith('dark:border-'))) {
                     let num = parseInt(cls.replace('border-gray-', ''));
                     if (!isNaN(num)) {
                         let darkNum = 800;
                         if (num <= 200) darkNum = 800; // border-gray-200 -> dark:border-gray-800
                         else if (num === 300) darkNum = 700;
                         else if (num >= 800) darkNum = 200;
                         newClasses.push(`dark:border-gray-${darkNum}`);
                     }
                }
            }
        }
        return newClasses.join(' ');
    }

    // Replace className="..."
    content = content.replace(/className="([^"]+)"/g, (m, p1) => {
        let fixed = applyDarkVariant(m, p1);
        return `className="${fixed}"`;
    });

    // Replace className={`...`}
    content = content.replace(/className=\{`([^`]+)`\}/g, (m, p1) => {
        let fixed = applyDarkVariant(m, p1);
        return `className={\`${fixed}\`}`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed', filePath);
    }
});

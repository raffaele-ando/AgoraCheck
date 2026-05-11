import fs from 'fs';

let contentA = fs.readFileSync('src/components/Analytics.tsx', 'utf8');
contentA = contentA.replace(/\/\/ Rilevamento iPad: esplicito o tramite Mac con touch support const isExplicitIpad/g, '/* Rilevamento iPad: esplicito o tramite Mac con touch support */ const isExplicitIpad');
contentA = contentA.replace(/\/\/ Traffic by Date const last14Days/g, '/* Traffic by Date */ const last14Days');
contentA = contentA.replace(/\/\/ Browser\/Platform const platforms:/g, '/* Browser/Platform */ const platforms:');
fs.writeFileSync('src/components/Analytics.tsx', contentA);

let contentD = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
contentD = contentD.replace(/\/\/ deprecated customInstagrams\?:/g, '/* deprecated */ customInstagrams?:');
contentD = contentD.replace(/\/\/ Track removed tags to prevent auto-sync from restoring them const currentProfile/g, '/* Track removed tags to prevent auto-sync from restoring them */ const currentProfile');
contentD = contentD.replace(/\/\/ Clean up orphaned tags from messages const msgsForProfile/g, '/* Clean up orphaned tags from messages */ const msgsForProfile');
contentD = contentD.replace(/\/\/ Reset pagination when view filter or active tab changes useEffect/g, '/* Reset pagination when view filter or active tab changes */ useEffect');
contentD = contentD.replace(/\/\/ Handle selected messages sync useEffect/g, '/* Handle selected messages sync */ useEffect');
contentD = contentD.replace(/\/\/ Auto-sync discovered instagram tags to the persistent profile records useEffect/g, '/* Auto-sync discovered instagram tags to the persistent profile records */ useEffect');
contentD = contentD.replace(/\/\/ Check if already present, or if user explicitly removed it before if \(/g, '/* Check if already present, or if user explicitly removed it before */ if (');
contentD = contentD.replace(/\/\/ Removed profiles from deps to avoid infinite loops const handleLogout/g, '/* Removed profiles from deps to avoid infinite loops */ const handleLogout');
contentD = contentD.replace(/\/\/ Determiniamo in quale tab ci troviamo \(new o archived\) e invertirne lo stato per la selezione const targetStatus/g, '/* Determiniamo in quale tab ci troviamo (new o archived) e invertirne lo stato per la selezione */ const targetStatus');
contentD = contentD.replace(/\/\/ alert\(`Messaggi raggruppati con successo nel profilo: \${newProfileGroupId}`\); \} catch/g, '/* alert(`Messaggi raggruppati con successo nel profilo: ${newProfileGroupId}`); */ } catch');

fs.writeFileSync('src/pages/Dashboard.tsx', contentD);
console.log('Restoration complete!');

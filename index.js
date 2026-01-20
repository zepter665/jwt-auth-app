#!/usr/bin/env node

import MyTischtennisAPI from './api.js';

// Hilfsfunktion für Argumente parsen
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    query: '',
    page: 1,
    pagesize: 10,
    help: false
  };

  let queryParts = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--page' || arg === '-p') {
      if (i + 1 < args.length) {
        options.page = parseInt(args[i + 1]) || 1;
        i++; // Nächstes Argument überspringen
      }
    } else if (arg === '--pagesize' || arg === '-s') {
      if (i + 1 < args.length) {
        options.pagesize = parseInt(args[i + 1]) || 10;
        i++; // Nächstes Argument überspringen
      }
    } else if (!arg.startsWith('-')) {
      // Wenn es kein Flag ist, ist es Teil des Suchbegriffs
      queryParts.push(arg);
    }
  }

  options.query = queryParts.join(' ').trim();
  return options;
}

// Hilfefunktion
function showHelp() {
  console.log(`
🏓 MyTischtennis Spielersuche
═════════════════════════════════════════════════════════════════

Verwendung:
  node index.js [Suchbegriff] [Optionen]
  npm start [Suchbegriff] [Optionen]

Beispiele:
  node index.js "Müller"
  node index.js "Schmidt" --page 2
  node index.js "Borussia" --pagesize 20

Optionen:
  -h, --help              Zeige diese Hilfe
  -p, --page <nummer>     Seitennummer (default: 1)
  -s, --pagesize <anzahl> Ergebnisse pro Seite (default: 10, max: 50)

Hinweise:
  • Der Suchbegriff muss mindestens 3 Zeichen lang sein
  • Rate Limit: 90 Requests pro Stunde
  • Öffentlich zugänglich (keine Authentifizierung erforderlich)

Quelle: https://notmycupofteetee.github.io/mytt-api/
  `);
}

// Hauptfunktion
async function main() {
  const options = parseArguments();

  // Hilfe anzeigen
  if (options.help) {
    showHelp();
    return;
  }

  // Validierung
  if (!options.query) {
    console.error('❌ Fehler: Bitte geben Sie einen Suchbegriff ein.\n');
    showHelp();
    process.exit(1);
  }

  if (options.query.length < 3) {
    console.error('❌ Fehler: Der Suchbegriff muss mindestens 3 Zeichen lang sein.\n');
    process.exit(1);
  }

  if (options.pagesize > 50) {
    console.warn('⚠️  Warnung: Pagesize auf 50 begrenzt (API-Limit)');
    options.pagesize = 50;
  }

  // API-Aufruf
  const api = new MyTischtennisAPI();
  
  try {
    console.log(`🔍 Suche nach "${options.query}"...`);
    
    const startTime = Date.now();
    const results = await api.searchPlayers(options.query, options.page, options.pagesize);
    const endTime = Date.now();
    
    console.log(api.formatPlayerResults(results));
    console.log(`⏱️  Suche abgeschlossen in ${endTime - startTime}ms`);
    
  } catch (error) {
    console.error(`❌ Fehler: ${error.message}`);
    
    if (error.message.includes('Rate Limit')) {
      console.log('\n💡 Tipp: Die API hat ein Rate Limit von 90 Requests pro Stunde.');
    } else if (error.message.includes('Internetverbindung')) {
      console.log('\n💡 Tipp: Überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.');
    }
    
    process.exit(1);
  }
}

// Unbehandelte Promise-Rejections abfangen
process.on('unhandledRejection', (error) => {
  console.error('❌ Unerwarteter Fehler:', error.message);
  process.exit(1);
});

// Script ausführen
main();
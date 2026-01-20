#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// .env-Datei laden
dotenv.config();

// JWT Token aus Environment oder .env Datei
const JWT_TOKEN = process.env.MYTISCHTENNIS_JWT || '';

const parseJWTToken = (tokenString) => {
  try {
    if (tokenString && tokenString.startsWith('base64-')) {
      const base64Data = tokenString.substring(7);
      const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    }
    return null;
  } catch (error) {
    return { error: error.message };
  }
};

console.log('🔍 JWT Authentication Test für myTischtennis.de\n');

// Test 1: Token vorhanden?
console.log('1. JWT-Token Status:');
if (!JWT_TOKEN) {
  console.log('   ❌ Kein JWT-Token gefunden in Environment Variable MYTISCHTENNIS_JWT');
  process.exit(1);
} else {
  console.log('   ✅ JWT-Token gefunden (Länge: ' + JWT_TOKEN.length + ' Zeichen)');
}

// Test 2: Token parsbar?
console.log('\n2. Token Parsing:');
const tokenData = parseJWTToken(JWT_TOKEN);
if (!tokenData || tokenData.error) {
  console.log('   ❌ Token kann nicht geparst werden:', tokenData?.error || 'Unbekannter Fehler');
  process.exit(1);
} else {
  console.log('   ✅ Token erfolgreich geparst');
}

// Test 3: Token Inhalt validieren
console.log('\n3. Token Inhalt:');
console.log('   - Access Token:', tokenData.access_token ? '✅ Vorhanden' : '❌ Fehlt');
console.log('   - Refresh Token:', tokenData.refresh_token ? '✅ Vorhanden' : '❌ Fehlt');
console.log('   - Token Type:', tokenData.token_type || 'Unbekannt');
console.log('   - User Email:', tokenData.user?.email || 'Nicht verfügbar');

// Test 4: Token Gültigkeit
console.log('\n4. Token Gültigkeit:');
if (tokenData.expires_at) {
  const expiresAt = new Date(tokenData.expires_at * 1000);
  const now = new Date();
  const isValid = expiresAt > now;
  const hoursLeft = (expiresAt - now) / (1000 * 60 * 60);
  
  console.log('   - Läuft ab am:', expiresAt.toLocaleString('de-DE'));
  console.log('   - Gültig noch:', hoursLeft > 0 ? hoursLeft.toFixed(1) + ' Stunden' : 'ABGELAUFEN');
  console.log('   - Status:', isValid ? '✅ Gültig' : '❌ Abgelaufen');
  
  if (!isValid) {
    console.log('\n⚠️  WARNUNG: Token ist abgelaufen! Neuer Login erforderlich.');
  } else if (hoursLeft < 1) {
    console.log('\n⚠️  WARNUNG: Token läuft bald ab! Refresh empfohlen.');
  }
} else {
  console.log('   ❌ Keine Ablaufzeit im Token gefunden');
}

// Test 5: Mock API Request
console.log('\n5. Auth Header Test:');
const authHeader = `sb-10-auth-token=${JWT_TOKEN}`;
console.log('   - Cookie Header:', authHeader.substring(0, 50) + '...');
console.log('   - Header Länge:', authHeader.length + ' Zeichen');

console.log('\n🎉 Authentifizierung Test abgeschlossen!');
console.log('📝 Zusammenfassung:');
console.log('   - Token:', JWT_TOKEN ? '✅ Verfügbar' : '❌ Fehlt');
console.log('   - Parsing:', tokenData && !tokenData.error ? '✅ OK' : '❌ Fehler');
console.log('   - Access Token:', tokenData?.access_token ? '✅ OK' : '❌ Fehlt');
console.log('   - Refresh Token:', tokenData?.refresh_token ? '✅ OK' : '❌ Fehlt');
console.log('   - Gültigkeit:', tokenData?.expires_at && (tokenData.expires_at * 1000 > Date.now()) ? '✅ Gültig' : '❌ Abgelaufen');
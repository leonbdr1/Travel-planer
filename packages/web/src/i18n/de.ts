// All UI texts (German). `npm run check:claims` scans this file for the
// forbidden claims from product.config.yaml (compliance.forbidden_claims).
// Product values (name, e-mails, operator) are never written here; they are
// passed in from @reiseplaner/config.

export const de = {
  common: {
    loading: 'Wird geladen …',
    retry: 'Erneut versuchen',
    back: 'Zurück',
    next: 'Weiter',
    close: 'Schließen',
    workingTitle: 'Arbeitstitel',
    placeholderNotice: 'Platzhalter: Die endgültigen Inhalte folgen nach rechtlicher Prüfung.',
  },
  nav: {
    home: 'Start',
    search: 'Suche',
    howItWorks: "So funktioniert's",
    booking: 'Meine Buchung',
  },
  home: {
    heroTitle: 'Flexibel reisen, besser wohnen.',
    heroLead:
      'Gib deinen Rahmen an – Startort, Fahrzeit, Zeitfenster und Reisemuster. Wir durchsuchen alle passenden Orte und Termine gleichzeitig und zeigen dir die besten Angebote innerhalb deines Rahmens.',
    cta: 'Suche starten',
    stepsTitle: 'In drei Schritten zum passenden Angebot',
    steps: [
      { title: 'Rahmen angeben', text: 'Startort, maximale Fahrzeit, Zeitfenster, Nächte und Wünsche.' },
      { title: 'Orte bestätigen', text: 'Wir schlagen Regionen und Orte aus einem geprüften Katalog vor. Du entscheidest.' },
      { title: 'Vergleichen und buchen', text: 'Preis-Matrix über alle Orte und Termine, ehrliche Bewertung, Buchung direkt hier.' },
    ],
  },
  status: {
    label: 'Systemstatus',
    api: 'API',
    db: 'Datenbank',
    ok: 'ok',
    down: 'nicht erreichbar',
    unknown: 'unbekannt',
    checking: 'wird geprüft …',
    apiUnreachable: 'Die API ist gerade nicht erreichbar. Bitte versuche es in einem Moment erneut.',
  },
  devBanner: {
    fake: 'Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.',
  },
  footer: {
    legal: 'Rechtliches',
    imprint: 'Impressum',
    terms: 'AGB',
    privacy: 'Datenschutz',
    contact: 'Kontakt',
    howItWorks: "So funktioniert's",
    ranking: 'So berechnen wir die Rangliste',
    sources: 'Datenquellen',
    intermediary: 'Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft.',
  },
  notFound: {
    title: 'Seite nicht gefunden',
    text: 'Diese Seite gibt es nicht (mehr).',
    home: 'Zur Startseite',
  },
} as const;

export type Texts = typeof de;

// Generated from src/review-lexicon.yaml by src/bin/generate.ts (`npm run gen`). Do not edit.
import type { ReviewTopic } from '../vocabulary';

export const REVIEW_LEXICON_LANGUAGES = ["de","en","fr","it","nl"] as const;
export type LexiconLanguage = (typeof REVIEW_LEXICON_LANGUAGES)[number];

export interface ReviewLexicon {
  version: number;
  topics: Record<ReviewTopic, Record<LexiconLanguage, readonly string[]>>;
  negations: Record<LexiconLanguage, readonly string[]>;
}

export const REVIEW_LEXICON: ReviewLexicon = {
  "version": 1,
  "topics": {
    "sauberkeit": {
      "de": [
        "schmutzig*",
        "dreckig*",
        "unsauber*",
        "verdreckt*",
        "*flecken",
        "fleckig*",
        "haare im",
        "haare auf",
        "staubig*",
        "nicht sauber",
        "nicht gereinigt",
        "nicht geputzt",
        "ekelhaft*"
      ],
      "en": [
        "dirty",
        "filthy",
        "stain*",
        "not clean",
        "dusty",
        "hair in",
        "hairs in",
        "hair on",
        "grimy",
        "unclean"
      ],
      "fr": [
        "sale",
        "sales",
        "tache",
        "taches",
        "pas propre",
        "poussiéreux",
        "poussiéreuse",
        "cheveux dans",
        "crasseux",
        "crasseuse"
      ],
      "it": [
        "sporco",
        "sporca",
        "sporchi",
        "sporche",
        "macchia",
        "macchie",
        "non pulito",
        "non pulita",
        "polveroso",
        "polverosa",
        "capelli nel",
        "capelli sul"
      ],
      "nl": [
        "vies",
        "vieze",
        "smerig",
        "smerige",
        "vlek",
        "vlekken",
        "niet schoon",
        "stoffig",
        "haren in",
        "haren op"
      ]
    },
    "schimmel": {
      "de": [
        "schimmel*",
        "*schimmel",
        "stockfleck*",
        "feuchte wand",
        "feuchte wände",
        "feuchte stellen"
      ],
      "en": [
        "mold",
        "mould",
        "moldy",
        "mouldy",
        "mildew",
        "damp walls",
        "damp patches"
      ],
      "fr": [
        "moisissure",
        "moisissures",
        "moisi",
        "moisie",
        "murs humides"
      ],
      "it": [
        "muffa",
        "muffe",
        "ammuffito",
        "ammuffita",
        "pareti umide"
      ],
      "nl": [
        "schimmel",
        "schimmelig",
        "schimmelige",
        "vochtige muren",
        "vochtplekken"
      ]
    },
    "ungeziefer": {
      "de": [
        "bettwanze*",
        "wanzen",
        "kakerlake*",
        "schaben",
        "mäuse",
        "flöhe",
        "milben",
        "ungeziefer",
        "silberfische*"
      ],
      "en": [
        "bed bugs",
        "bed bug",
        "bedbug*",
        "cockroach*",
        "roaches",
        "mice",
        "fleas",
        "mites",
        "vermin",
        "silverfish"
      ],
      "fr": [
        "punaise*",
        "cafard*",
        "souris",
        "puces",
        "blattes"
      ],
      "it": [
        "cimici",
        "cimice",
        "scarafagg*",
        "topi",
        "pulci",
        "blatte"
      ],
      "nl": [
        "bedwants*",
        "kakkerlak*",
        "muizen",
        "vlooien",
        "ongedierte",
        "zilvervisjes"
      ]
    },
    "laerm": {
      "de": [
        "lärm*",
        "*lärm",
        "sehr laut",
        "zu laut",
        "ziemlich laut",
        "extrem laut",
        "recht laut",
        "laut zu hören",
        "hellhörig*",
        "dünne wände",
        "baustelle*"
      ],
      "en": [
        "noise",
        "noisy",
        "very loud",
        "too loud",
        "quite loud",
        "thin walls",
        "construction work"
      ],
      "fr": [
        "bruit",
        "bruits",
        "bruyant",
        "bruyante",
        "bruyants",
        "murs fins",
        "travaux"
      ],
      "it": [
        "rumore",
        "rumori",
        "rumoroso",
        "rumorosa",
        "pareti sottili",
        "lavori in corso"
      ],
      "nl": [
        "lawaai*",
        "luidruchtig*",
        "gehorig*",
        "herrie",
        "dunne muren",
        "erg luid"
      ]
    },
    "geruch": {
      "de": [
        "gestank",
        "stinkt",
        "stank",
        "stinkend*",
        "muffig*",
        "*geruch",
        "geruch",
        "gerüche",
        "roch nach",
        "riecht nach",
        "roch stark"
      ],
      "en": [
        "smell*",
        "stink*",
        "stank",
        "odor*",
        "odour*",
        "musty"
      ],
      "fr": [
        "odeur",
        "odeurs",
        "puait",
        "pue",
        "puanteur",
        "sent mauvais"
      ],
      "it": [
        "odore",
        "odori",
        "puzza*",
        "cattivo odore"
      ],
      "nl": [
        "stank",
        "stinkt",
        "stonk",
        "geur",
        "geuren",
        "muf",
        "muffe",
        "muffig*"
      ]
    },
    "zustand": {
      "de": [
        "kaputt*",
        "defekt*",
        "abgewohnt*",
        "abgenutzt*",
        "renovierungsbedürftig*",
        "heruntergekommen*",
        "in die jahre gekommen",
        "durchgelaufen*",
        "funktionierte nicht",
        "ging nicht"
      ],
      "en": [
        "broken",
        "run-down",
        "run down",
        "worn out",
        "worn",
        "shabby",
        "out of order",
        "did not work",
        "didn't work"
      ],
      "fr": [
        "cassé",
        "cassée",
        "cassés",
        "vétuste*",
        "usé",
        "usée",
        "délabré*",
        "en panne",
        "ne fonctionnait pas"
      ],
      "it": [
        "rotto",
        "rotta",
        "rotti",
        "rotte",
        "fatiscente",
        "usurat*",
        "guasto",
        "guasta",
        "non funzionava"
      ],
      "nl": [
        "kapot",
        "versleten",
        "gedateerd",
        "verouderd*",
        "defect",
        "werkte niet"
      ]
    },
    "abweichung_beschreibung": {
      "de": [
        "anders als auf den fotos",
        "anders als auf den bildern",
        "anders aus als auf den fotos",
        "anders aus als auf den bildern",
        "nicht wie beschrieben",
        "nicht wie auf den fotos",
        "nicht wie auf den bildern",
        "bilder im internet",
        "fotos täuschen",
        "fotos sind veraltet"
      ],
      "en": [
        "not as described",
        "not as advertised",
        "not like the pictures",
        "not like the photos",
        "different from the photos",
        "misleading photos",
        "photos are old"
      ],
      "fr": [
        "pas comme sur les photos",
        "pas conforme",
        "ne correspond pas",
        "photos trompeuses"
      ],
      "it": [
        "diverso dalle foto",
        "non corrisponde",
        "foto ingannevoli",
        "non come descritto"
      ],
      "nl": [
        "niet zoals beschreven",
        "anders dan op de foto's",
        "anders dan op de foto",
        "foto's kloppen niet",
        "misleidende foto's"
      ]
    }
  },
  "negations": {
    "de": [
      "kein",
      "keine",
      "keinen",
      "keinem",
      "keiner",
      "nicht",
      "ohne",
      "nie",
      "niemals",
      "null"
    ],
    "en": [
      "no",
      "not",
      "never",
      "without",
      "zero",
      "wasn't",
      "weren't",
      "didn't",
      "isn't"
    ],
    "fr": [
      "pas",
      "aucun",
      "aucune",
      "sans",
      "jamais",
      "ni"
    ],
    "it": [
      "nessun",
      "nessuna",
      "nessuno",
      "senza",
      "mai",
      "niente",
      "non"
    ],
    "nl": [
      "geen",
      "niet",
      "zonder",
      "nooit"
    ]
  }
};

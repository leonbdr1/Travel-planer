// Generated from src/praise-lexicon.yaml by src/bin/generate.ts (`npm run gen`). Do not edit.
import type { PraiseTopic } from '../vocabulary';
import type { LexiconLanguage } from './review-lexicon';

export interface PraiseLexicon {
  version: number;
  topics: Record<PraiseTopic, Record<LexiconLanguage, readonly string[]>>;
  nothing: Record<LexiconLanguage, readonly string[]>;
}

export const PRAISE_LEXICON: PraiseLexicon = {
  "version": 1,
  "topics": {
    "fruehstueck": {
      "de": [
        "frühstück*",
        "*frühstück",
        "buffet*"
      ],
      "en": [
        "breakfast*"
      ],
      "fr": [
        "petit-déjeuner*",
        "petit déjeuner*",
        "petits-déjeuners",
        "petits déjeuners",
        "petit-déj",
        "petit déj"
      ],
      "it": [
        "colazion*"
      ],
      "nl": [
        "ontbijt*"
      ]
    },
    "sauberkeit": {
      "de": [
        "*sauber*",
        "schmutz*",
        "dreck*",
        "reinlich*",
        "hygien*",
        "geputzt",
        "gereinigt",
        "staubig*",
        "fleckig*",
        "*flecken"
      ],
      "en": [
        "clean*",
        "unclean",
        "spotless",
        "dirt*",
        "filth*",
        "dust*",
        "stain*",
        "hygien*"
      ],
      "fr": [
        "propre*",
        "sale",
        "sales",
        "saleté*",
        "poussière*",
        "poussiéreu*",
        "tache*",
        "hygiène",
        "nickel"
      ],
      "it": [
        "pulit*",
        "pulizia",
        "sporc*",
        "polver*",
        "macchia",
        "macchie",
        "igien*"
      ],
      "nl": [
        "schoon",
        "schone",
        "netjes",
        "vies",
        "vieze",
        "smerig*",
        "stoffig*",
        "vlek*",
        "hygiën*"
      ]
    },
    "ruhe": {
      "de": [
        "ruhig*",
        "ruhe",
        "*ruhe",
        "leise",
        "lärm*",
        "*lärm",
        "sehr laut",
        "zu laut",
        "ziemlich laut",
        "recht laut",
        "lautstärke",
        "hellhörig*",
        "geräusch*",
        "*geräusch",
        "*geräusche"
      ],
      "en": [
        "quiet*",
        "peaceful*",
        "silent",
        "silence",
        "noise*",
        "noisy",
        "loud*",
        "thin walls"
      ],
      "fr": [
        "calme*",
        "tranquill*",
        "silencieu*",
        "bruit*",
        "bruyant*",
        "murs fins"
      ],
      "it": [
        "silenzi*",
        "tranquill*",
        "calm*",
        "rumor*",
        "pareti sottili"
      ],
      "nl": [
        "rustig*",
        "stil",
        "stille",
        "lawaai*",
        "luidruchtig*",
        "gehorig*",
        "herrie",
        "geluid*",
        "dunne muren"
      ]
    },
    "personal": {
      "de": [
        "personal*",
        "*personal",
        "mitarbeiter*",
        "*mitarbeiter",
        "gastgeber*",
        "*gastgeber",
        "vermieter*",
        "*vermieter",
        "rezeption*",
        "service",
        "team",
        "*team",
        "besitzer*",
        "inhaber*",
        "wirt",
        "wirtin",
        "wirtsleute",
        "freundlich*",
        "hilfsbereit*"
      ],
      "en": [
        "staff",
        "*staff",
        "host",
        "hosts",
        "hostess",
        "owner*",
        "reception*",
        "service",
        "team",
        "employee*",
        "manager*",
        "helpful"
      ],
      "fr": [
        "personnel",
        "accueil*",
        "hôte",
        "hôtes",
        "hôtesse",
        "propriétaire*",
        "réception*",
        "service",
        "équipe",
        "serviable*",
        "aimable*",
        "sympathique*",
        "sympa"
      ],
      "it": [
        "personale",
        "staff",
        "proprietari*",
        "reception",
        "receptionist*",
        "servizio",
        "gentil*",
        "cordial*",
        "accoglienza",
        "titolar*",
        "gestor*"
      ],
      "nl": [
        "personeel",
        "gastheer",
        "gastvrouw",
        "gastvrij*",
        "eigena*",
        "receptie",
        "medewerker*",
        "service",
        "vriendelijk*",
        "behulpzaam*"
      ]
    },
    "betten": {
      "de": [
        "bett",
        "betten",
        "*bett",
        "*betten",
        "matratze*",
        "*matratze",
        "*matratzen",
        "kissen",
        "*kissen",
        "schlafkomfort",
        "liegekomfort"
      ],
      "en": [
        "*bed",
        "*beds",
        "mattress*",
        "pillow*"
      ],
      "fr": [
        "lit",
        "lits",
        "matelas",
        "oreiller*",
        "literie"
      ],
      "it": [
        "letto",
        "letti",
        "materass*",
        "cuscin*"
      ],
      "nl": [
        "*bed",
        "*bedden",
        "matras*",
        "kussen*"
      ]
    },
    "aussicht": {
      "de": [
        "*aussicht*",
        "*ausblick*",
        "*blick auf",
        "sicht auf",
        "panorama*",
        "*bergblick*",
        "*seeblick*",
        "*meerblick*",
        "*alpenblick*",
        "*talblick*"
      ],
      "en": [
        "view",
        "views",
        "panoram*",
        "scenery",
        "overlooking"
      ],
      "fr": [
        "vue",
        "vues",
        "panoram*",
        "paysage*"
      ],
      "it": [
        "vista",
        "viste",
        "panoram*",
        "affaccio",
        "paesaggi*"
      ],
      "nl": [
        "*uitzicht*",
        "panorama*"
      ]
    },
    "lage": {
      "de": [
        "lage",
        "gelegen",
        "zentral*",
        "ortskern*",
        "ortsmitte*",
        "ortszentrum",
        "innenstadt*",
        "altstadt*",
        "zentrumsnah*",
        "fußläufig*",
        "zu fuß erreichbar",
        "gut erreichbar",
        "nähe zum",
        "nähe zur",
        "nah am",
        "nahe am"
      ],
      "en": [
        "location",
        "located",
        "central*",
        "walking distance",
        "close to",
        "near the",
        "city centre",
        "city center",
        "town centre",
        "town center",
        "old town"
      ],
      "fr": [
        "emplacement",
        "situé",
        "située",
        "centre-ville",
        "centre ville",
        "proche du",
        "proche de",
        "à deux pas",
        "proximité"
      ],
      "it": [
        "posizione",
        "centrale",
        "centro storico",
        "in centro",
        "dal centro",
        "vicino a",
        "vicino al",
        "a due passi"
      ],
      "nl": [
        "ligging",
        "gelegen",
        "centraal",
        "centrum",
        "loopafstand",
        "dichtbij",
        "vlakbij"
      ]
    }
  },
  "nothing": {
    "de": [
      "nichts",
      "nix"
    ],
    "en": [
      "nothing",
      "none"
    ],
    "fr": [
      "rien"
    ],
    "it": [
      "niente",
      "nulla"
    ],
    "nl": [
      "niets",
      "niks"
    ]
  }
};

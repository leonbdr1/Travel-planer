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
      ],
      "es": [
        "desayun*"
      ],
      "pt": [
        "pequeno-almoço*",
        "pequeno almoço*",
        "café da manhã"
      ],
      "pl": [
        "śniadani*"
      ],
      "cs": [
        "snídan*"
      ],
      "hr": [
        "doručak*",
        "doručk*"
      ],
      "hu": [
        "reggeli*"
      ],
      "da": [
        "morgenmad*"
      ],
      "sv": [
        "frukost*"
      ],
      "no": [
        "frokost*"
      ],
      "el": [
        "πρωινό*"
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
      ],
      "es": [
        "limpi*",
        "sucio",
        "sucia",
        "suciedad",
        "polvo",
        "higien*",
        "impecable"
      ],
      "pt": [
        "limp*",
        "sujo",
        "suja",
        "sujidade",
        "sujeira",
        "poeira",
        "higien*",
        "impecável"
      ],
      "pl": [
        "czyst*",
        "brud*",
        "kurzu",
        "higien*"
      ],
      "cs": [
        "čist*",
        "špinav*",
        "prach*",
        "hygien*"
      ],
      "hr": [
        "čist*",
        "prljav*",
        "prašin*",
        "higijen*"
      ],
      "hu": [
        "tiszta*",
        "tisztaság*",
        "koszos*",
        "piszkos*",
        "poros*"
      ],
      "da": [
        "ren",
        "rent",
        "rene",
        "renlig*",
        "beskidt*",
        "snavset*",
        "støvet*"
      ],
      "sv": [
        "ren",
        "rent",
        "rena",
        "städ*",
        "smuts*",
        "dammig*"
      ],
      "no": [
        "ren",
        "rent",
        "rene",
        "skitten*",
        "støvete"
      ],
      "el": [
        "καθαρ*",
        "βρώμικ*",
        "σκόνη"
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
      ],
      "es": [
        "tranquil*",
        "silencio*",
        "ruido*"
      ],
      "pt": [
        "tranquil*",
        "silencio*",
        "sossego",
        "barulh*",
        "ruído*"
      ],
      "pl": [
        "cich*",
        "spokoj*",
        "hałas*",
        "głośn*"
      ],
      "cs": [
        "klid*",
        "tich*",
        "hluk*",
        "hlučn*"
      ],
      "hr": [
        "mirno",
        "mirna",
        "mirni",
        "tišin*",
        "tih*",
        "buk*",
        "bučn*"
      ],
      "hu": [
        "csend*",
        "nyugodt*",
        "nyugalom",
        "zaj*",
        "hangos*"
      ],
      "da": [
        "rolig*",
        "stille",
        "larm",
        "støj*"
      ],
      "sv": [
        "lugn*",
        "tyst*",
        "buller",
        "oljud",
        "lyhört"
      ],
      "no": [
        "rolig*",
        "stille",
        "støy*",
        "bråk"
      ],
      "el": [
        "ήσυχ*",
        "ησυχία",
        "θόρυβ*"
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
      ],
      "es": [
        "personal",
        "anfitrion*",
        "anfitriona",
        "recepción",
        "servicio",
        "dueñ*",
        "propietari*",
        "amable*",
        "atent*",
        "simpátic*"
      ],
      "pt": [
        "pessoal",
        "funcionári*",
        "anfitri*",
        "recepção",
        "serviço",
        "dono",
        "dona",
        "proprietári*",
        "simpátic*",
        "prestáve*",
        "atencios*"
      ],
      "pl": [
        "personel*",
        "obsług*",
        "gospodarz*",
        "gospodyni",
        "właściciel*",
        "recepcj*",
        "uprzejm*",
        "pomocn*"
      ],
      "cs": [
        "personál*",
        "obsluh*",
        "hostitel*",
        "majitel*",
        "recepc*",
        "ochotn*",
        "přátelsk*"
      ],
      "hr": [
        "osoblje",
        "domaćin*",
        "vlasni*",
        "recepcij*",
        "ljubazn*",
        "susretljiv*"
      ],
      "hu": [
        "személyzet*",
        "házigazd*",
        "tulajdonos*",
        "recepció*",
        "kedves*",
        "segítőkész*"
      ],
      "da": [
        "personale*",
        "vært*",
        "ejer*",
        "reception*",
        "venlig*",
        "hjælpsom*",
        "service"
      ],
      "sv": [
        "personal*",
        "värd*",
        "ägare*",
        "reception*",
        "trevlig*",
        "hjälpsam*",
        "service"
      ],
      "no": [
        "personale*",
        "vert*",
        "eier*",
        "resepsjon*",
        "vennlig*",
        "hjelpsom*",
        "service"
      ],
      "el": [
        "προσωπικό*",
        "οικοδεσπότ*",
        "ιδιοκτήτ*",
        "ρεσεψιόν",
        "ευγενικ*",
        "εξυπηρετικ*"
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
      ],
      "es": [
        "cama",
        "camas",
        "colchón",
        "colchones",
        "almohada*"
      ],
      "pt": [
        "cama",
        "camas",
        "colchão",
        "colchões",
        "almofada*",
        "travesseiro*"
      ],
      "pl": [
        "łóżk*",
        "materac*",
        "poduszk*"
      ],
      "cs": [
        "postel*",
        "matrac*",
        "polštář*"
      ],
      "hr": [
        "krevet*",
        "madrac*",
        "jastu*"
      ],
      "hu": [
        "ágy",
        "ágyak",
        "ágyat",
        "matrac*",
        "párn*"
      ],
      "da": [
        "seng",
        "senge",
        "sengen",
        "sengene",
        "madras*",
        "pude*"
      ],
      "sv": [
        "säng",
        "sängar",
        "sängen",
        "madrass*",
        "kudd*"
      ],
      "no": [
        "seng",
        "senger",
        "sengen",
        "sengene",
        "madrass*",
        "pute*"
      ],
      "el": [
        "κρεβάτ*",
        "στρώμα*",
        "μαξιλάρ*"
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
      ],
      "es": [
        "vista",
        "vistas",
        "panorám*",
        "paisaje*"
      ],
      "pt": [
        "vista",
        "vistas",
        "panorâmic*",
        "paisage*"
      ],
      "pl": [
        "widok*",
        "panoram*"
      ],
      "cs": [
        "výhled*",
        "panoram*"
      ],
      "hr": [
        "pogled*",
        "panoram*"
      ],
      "hu": [
        "kilátás*",
        "panorám*"
      ],
      "da": [
        "udsigt*",
        "panorama*"
      ],
      "sv": [
        "utsikt*",
        "panorama*"
      ],
      "no": [
        "utsikt*",
        "panorama*"
      ],
      "el": [
        "θέα",
        "πανοραμικ*"
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
      ],
      "es": [
        "ubicación",
        "situado",
        "situada",
        "céntric*",
        "cerca de",
        "a pocos pasos",
        "centro histórico"
      ],
      "pt": [
        "localização",
        "localizado",
        "localizada",
        "central",
        "perto de",
        "centro histórico"
      ],
      "pl": [
        "lokalizacj*",
        "położeni*",
        "blisko do",
        "w centrum"
      ],
      "cs": [
        "poloh*",
        "lokalit*",
        "v centru",
        "blízko"
      ],
      "hr": [
        "lokacij*",
        "položaj*",
        "u centru",
        "blizu"
      ],
      "hu": [
        "elhelyezkedés*",
        "fekvés*",
        "központ*",
        "közel"
      ],
      "da": [
        "beliggenhed*",
        "placering*",
        "central*",
        "tæt på",
        "centrum"
      ],
      "sv": [
        "läge",
        "läget",
        "beläget",
        "centralt",
        "nära till",
        "centrum"
      ],
      "no": [
        "beliggenhet*",
        "plassering*",
        "sentral*",
        "nær",
        "sentrum"
      ],
      "el": [
        "τοποθεσία",
        "κεντρικ*",
        "κοντά σε",
        "κέντρο"
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
    ],
    "es": [
      "nada"
    ],
    "pt": [
      "nada"
    ],
    "pl": [
      "nic"
    ],
    "cs": [
      "nic"
    ],
    "hr": [
      "ništa"
    ],
    "hu": [
      "semmi"
    ],
    "da": [
      "intet",
      "ingenting"
    ],
    "sv": [
      "inget",
      "ingenting"
    ],
    "no": [
      "ingenting",
      "intet"
    ],
    "el": [
      "τίποτα"
    ]
  }
};

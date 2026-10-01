// Generated from src/review-lexicon.yaml by src/bin/generate.ts (`npm run gen`). Do not edit.
import type { ReviewTopic } from '../vocabulary';

export const REVIEW_LEXICON_LANGUAGES = ["de","en","fr","it","nl","es","pt","pl","cs","hr","hu","da","sv","no","el"] as const;
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
      ],
      "es": [
        "sucio",
        "sucia",
        "sucios",
        "sucias",
        "suciedad",
        "manchas",
        "manchado*",
        "no estaba limpio",
        "no estaba limpia",
        "polvo",
        "pelos en",
        "pelo en"
      ],
      "pt": [
        "sujo",
        "suja",
        "sujos",
        "sujas",
        "sujidade",
        "sujeira",
        "manchas",
        "manchad*",
        "não estava limpo",
        "não estava limpa",
        "poeira",
        "cabelos no"
      ],
      "pl": [
        "brudn*",
        "brud",
        "brudem",
        "plamy",
        "plamami",
        "nie było czysto",
        "kurzu",
        "zakurzon*",
        "włosy w",
        "włosy na"
      ],
      "cs": [
        "špinav*",
        "nebylo čisto",
        "skvrn*",
        "prach",
        "prachu",
        "zaprášen*",
        "vlasy v"
      ],
      "hr": [
        "prljav*",
        "nije bilo čisto",
        "mrlj*",
        "prašin*",
        "kose u",
        "dlake u"
      ],
      "hu": [
        "koszos*",
        "piszkos*",
        "nem volt tiszta",
        "foltos*",
        "poros*",
        "hajszál*"
      ],
      "da": [
        "beskidt*",
        "snavset*",
        "ikke rent",
        "ikke ren",
        "pletter",
        "plettet*",
        "støvet*",
        "hår i"
      ],
      "sv": [
        "smutsig*",
        "inte rent",
        "inte städat",
        "fläckar",
        "fläckig*",
        "dammig*",
        "hår i"
      ],
      "no": [
        "skitten*",
        "skittent",
        "ikke rent",
        "flekker",
        "flekket*",
        "støvete",
        "hår i"
      ],
      "el": [
        "βρώμικ*",
        "λεκέδες",
        "λερωμέν*",
        "δεν ήταν καθαρό",
        "σκόνη",
        "τρίχες στο",
        "τρίχες στη"
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
      ],
      "es": [
        "moho",
        "mohos",
        "hongos",
        "manchas de humedad",
        "paredes húmedas"
      ],
      "pt": [
        "mofo",
        "bolor",
        "paredes húmidas",
        "paredes úmidas",
        "manchas de humidade"
      ],
      "pl": [
        "pleśń",
        "pleśni",
        "pleśnią",
        "zagrzybi*",
        "wilgoć",
        "wilgoci"
      ],
      "cs": [
        "plíseň",
        "plísně",
        "plísní",
        "vlhké stěny",
        "vlhkost"
      ],
      "hr": [
        "plijesan",
        "plijesni",
        "buđ*",
        "vlaga",
        "vlage"
      ],
      "hu": [
        "penész*",
        "nedves fal*",
        "dohos*"
      ],
      "da": [
        "skimmel",
        "skimmelsvamp",
        "fugtige vægge",
        "fugtpletter"
      ],
      "sv": [
        "mögel",
        "mögligt",
        "möglig*",
        "fuktiga väggar",
        "fuktfläckar"
      ],
      "no": [
        "mugg",
        "muggsopp",
        "fuktige vegger",
        "fuktflekker"
      ],
      "el": [
        "μούχλα",
        "μούχλας",
        "υγρασία",
        "υγρασίας"
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
      ],
      "es": [
        "chinches",
        "chinche",
        "cucarachas",
        "cucaracha",
        "ratones",
        "pulgas",
        "bichos"
      ],
      "pt": [
        "percevejos",
        "percevejo",
        "baratas",
        "ratos",
        "pulgas",
        "bichos"
      ],
      "pl": [
        "pluskw*",
        "karaluch*",
        "myszy",
        "pchły",
        "robactw*",
        "insekty"
      ],
      "cs": [
        "štěnice",
        "šváb*",
        "myši",
        "blechy",
        "hmyz"
      ],
      "hr": [
        "stjenice",
        "stjenica",
        "žohar*",
        "miševi",
        "buhe",
        "kukci"
      ],
      "hu": [
        "poloska",
        "poloskák",
        "poloskát",
        "csótány*",
        "egerek",
        "bolhák"
      ],
      "da": [
        "væggelus",
        "kakerlakker",
        "lopper",
        "utøj",
        "skadedyr"
      ],
      "sv": [
        "vägglöss",
        "kackerlackor",
        "möss",
        "loppor",
        "ohyra"
      ],
      "no": [
        "veggdyr",
        "kakerlakker",
        "lopper",
        "skadedyr"
      ],
      "el": [
        "κοριοί",
        "κοριούς",
        "κατσαρίδες",
        "κατσαρίδα",
        "ποντίκια",
        "ψύλλοι"
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
      ],
      "es": [
        "ruido",
        "ruidos",
        "ruidoso",
        "ruidosa",
        "paredes finas",
        "muy ruidoso"
      ],
      "pt": [
        "barulho",
        "barulhento*",
        "ruído",
        "ruídos",
        "paredes finas"
      ],
      "pl": [
        "hałas*",
        "głośno",
        "głośny",
        "głośna",
        "cienkie ściany"
      ],
      "cs": [
        "hluk*",
        "hlučn*",
        "tenké stěny"
      ],
      "hr": [
        "buka",
        "buke",
        "bučn*",
        "tanki zidovi",
        "glasno"
      ],
      "hu": [
        "zaj*",
        "hangos*",
        "vékony fal*"
      ],
      "da": [
        "larm",
        "støj*",
        "tynde vægge",
        "lydt"
      ],
      "sv": [
        "buller",
        "oljud",
        "bullrig*",
        "lyhört",
        "tunna väggar"
      ],
      "no": [
        "bråk",
        "støy*",
        "lytt",
        "tynne vegger"
      ],
      "el": [
        "θόρυβος",
        "θόρυβο",
        "θορυβώδ*"
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
      ],
      "es": [
        "olor",
        "olores",
        "mal olor",
        "apestaba",
        "peste",
        "huele",
        "olía"
      ],
      "pt": [
        "cheiro",
        "cheiros",
        "mau cheiro",
        "fedor",
        "fedia",
        "cheirava a"
      ],
      "pl": [
        "smród",
        "śmierdział*",
        "zapach*",
        "stęchlizn*"
      ],
      "cs": [
        "zápach*",
        "smrad",
        "smrděl*",
        "páchl*"
      ],
      "hr": [
        "smrad",
        "smrdi",
        "smrdjel*",
        "neugodan miris",
        "miris"
      ],
      "hu": [
        "szag*",
        "bűz*",
        "büdös"
      ],
      "da": [
        "lugt*",
        "stank",
        "stinker",
        "muggen"
      ],
      "sv": [
        "lukt*",
        "stank",
        "stinker",
        "unken"
      ],
      "no": [
        "lukt*",
        "stank",
        "stinker",
        "muggen lukt"
      ],
      "el": [
        "μυρωδιά",
        "μύριζε",
        "δυσοσμία",
        "βρώμα"
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
      ],
      "es": [
        "roto",
        "rota",
        "rotos",
        "rotas",
        "estropeado*",
        "desgastad*",
        "no funcionaba",
        "averiado*",
        "deteriorad*"
      ],
      "pt": [
        "partido",
        "avariad*",
        "estragad*",
        "desgastad*",
        "não funcionava",
        "degradad*"
      ],
      "pl": [
        "zepsut*",
        "zniszczon*",
        "nie działał",
        "nie działała",
        "nie działało",
        "zużyt*",
        "obskurn*"
      ],
      "cs": [
        "rozbit*",
        "nefungoval",
        "nefungovala",
        "nefungovalo",
        "opotřeben*",
        "zchátral*"
      ],
      "hr": [
        "pokvaren*",
        "slomljen*",
        "nije radio",
        "nije radila",
        "dotrajal*",
        "istrošen*"
      ],
      "hu": [
        "törött*",
        "elromlott",
        "nem működött",
        "kopott*",
        "lepusztult*",
        "elhasznált*"
      ],
      "da": [
        "ødelagt*",
        "slidt*",
        "virkede ikke",
        "nedslidt*"
      ],
      "sv": [
        "trasig*",
        "sliten",
        "slitet",
        "slitna",
        "fungerade inte",
        "nedgången*"
      ],
      "no": [
        "ødelagt*",
        "slitt",
        "slitte",
        "virket ikke",
        "nedslitt*"
      ],
      "el": [
        "χαλασμέν*",
        "σπασμέν*",
        "δεν λειτουργούσε",
        "φθαρμέν*"
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
      ],
      "es": [
        "no como en las fotos",
        "diferente a las fotos",
        "no corresponde",
        "fotos engañosas",
        "no como se describe"
      ],
      "pt": [
        "diferente das fotos",
        "não corresponde",
        "fotos enganosas",
        "não como descrito"
      ],
      "pl": [
        "inaczej niż na zdjęciach",
        "niezgodne z opisem",
        "niezgodny z opisem",
        "zdjęcia są stare"
      ],
      "cs": [
        "jinak než na fotkách",
        "neodpovídá popisu",
        "neodpovídá fotkám"
      ],
      "hr": [
        "drugačije nego na slikama",
        "ne odgovara opisu",
        "ne odgovara slikama"
      ],
      "hu": [
        "nem olyan mint a képeken",
        "nem felel meg a leírásnak",
        "félrevezető képek"
      ],
      "da": [
        "ikke som på billederne",
        "ikke som beskrevet",
        "misvisende billeder"
      ],
      "sv": [
        "inte som på bilderna",
        "inte som beskrivet",
        "missvisande bilder"
      ],
      "no": [
        "ikke som på bildene",
        "ikke som beskrevet",
        "misvisende bilder"
      ],
      "el": [
        "όχι όπως στις φωτογραφίες",
        "δεν αντιστοιχεί"
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
    ],
    "es": [
      "no",
      "nunca",
      "sin",
      "ningún",
      "ninguna",
      "nada",
      "ni"
    ],
    "pt": [
      "não",
      "nunca",
      "sem",
      "nenhum",
      "nenhuma",
      "nada"
    ],
    "pl": [
      "nie",
      "bez",
      "żadnego",
      "żadnej",
      "żadnych",
      "nigdy",
      "brak"
    ],
    "cs": [
      "ne",
      "bez",
      "žádný",
      "žádná",
      "žádné",
      "nikdy",
      "nebyl",
      "nebyla",
      "nebylo",
      "nebyly"
    ],
    "hr": [
      "ne",
      "bez",
      "nema",
      "nikad",
      "nije",
      "nisu",
      "nimalo"
    ],
    "hu": [
      "nem",
      "nincs",
      "sem",
      "nélkül",
      "soha",
      "semmi",
      "semmilyen"
    ],
    "da": [
      "ikke",
      "ingen",
      "intet",
      "uden",
      "aldrig"
    ],
    "sv": [
      "inte",
      "ingen",
      "inga",
      "inget",
      "utan",
      "aldrig"
    ],
    "no": [
      "ikke",
      "ingen",
      "intet",
      "uten",
      "aldri"
    ],
    "el": [
      "δεν",
      "όχι",
      "χωρίς",
      "καθόλου",
      "ποτέ"
    ]
  }
};

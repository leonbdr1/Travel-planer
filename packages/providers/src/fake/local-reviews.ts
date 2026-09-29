// Local-language reviews for simulated houses in the European destinations
// (Aufgabe F18): guests in Italy write Italian, in Poland Polish and so on,
// so the review check can be shown reading them. Neutral texts contain no
// complaint keyword of the review check; issue texts contain one.
import type { IssueProfile } from './world';

export type LocalLanguage = 'it' | 'es' | 'pt' | 'fr' | 'hr' | 'pl' | 'cs' | 'hu' | 'nl' | 'el' | 'da' | 'sv' | 'no';

interface LocalTexts {
  pros: readonly string[];
  cons: readonly string[];
  issues: Record<Exclude<IssueProfile, 'none'>, string>;
  headline: { good: string; ok: string; bad: string };
}

export const LOCAL_TEXTS: Record<LocalLanguage, LocalTexts> = {
  it: {
    pros: ['Ottimo rapporto qualità prezzo.', 'Parcheggio gratuito davanti alla casa.'],
    cons: ['Il wifi era un po’ lento.'],
    issues: {
      mold: 'C’era muffa nella doccia.',
      noise: 'Camera molto rumorosa di notte.',
      dirty: 'Il bagno era sporco.',
      bugs: 'Abbiamo trovato cimici nel letto.',
      smell: 'Cattivo odore in tutta la camera.',
      condition: 'La doccia era rotta.',
      photos: 'La camera era diverso dalle foto.',
    },
    headline: { good: 'Soggiorno splendido', ok: 'Buono', bad: 'Deludente' },
  },
  es: {
    pros: ['Buena relación calidad precio.', 'Aparcamiento gratuito junto a la casa.'],
    cons: ['El wifi iba un poco lento.'],
    issues: {
      mold: 'Había moho en la ducha.',
      noise: 'Habitación muy ruidosa por la noche.',
      dirty: 'El baño estaba sucio.',
      bugs: 'Encontramos chinches en la cama.',
      smell: 'Mal olor en toda la habitación.',
      condition: 'La ducha estaba rota.',
      photos: 'La habitación no como en las fotos.',
    },
    headline: { good: 'Estancia maravillosa', ok: 'Bien', bad: 'Decepcionante' },
  },
  pt: {
    pros: ['Boa relação qualidade preço.', 'Estacionamento gratuito junto à casa.'],
    cons: ['O wifi era um pouco lento.'],
    issues: {
      mold: 'Havia bolor no duche.',
      noise: 'Muito barulho à noite.',
      dirty: 'A casa de banho estava suja.',
      bugs: 'Encontrámos percevejos na cama.',
      smell: 'Mau cheiro no quarto.',
      condition: 'O chuveiro não funcionava.',
      photos: 'O quarto era diferente das fotos.',
    },
    headline: { good: 'Estadia maravilhosa', ok: 'Bom', bad: 'Dececionante' },
  },
  fr: {
    pros: ['Bon rapport qualité prix.', 'Parking gratuit devant la maison.'],
    cons: ['Le wifi était un peu lent.'],
    issues: {
      mold: 'De la moisissure dans la douche.',
      noise: 'Chambre très bruyante la nuit.',
      dirty: 'La salle de bain était sale.',
      bugs: 'Des punaises de lit dans la chambre.',
      smell: 'Une odeur désagréable dans la chambre.',
      condition: 'La douche était cassée.',
      photos: 'La chambre ne correspond pas aux photos.',
    },
    headline: { good: 'Séjour merveilleux', ok: 'Bien', bad: 'Décevant' },
  },
  hr: {
    pros: ['Odličan omjer cijene i kvalitete.', 'Besplatan parking ispred kuće.'],
    cons: ['Wifi je bio malo spor.'],
    issues: {
      mold: 'U kupaonici je bila plijesan.',
      noise: 'Noću je bila velika buka.',
      dirty: 'Kupaonica je bila prljava.',
      bugs: 'Našli smo stjenice u krevetu.',
      smell: 'U sobi je bio smrad.',
      condition: 'Klima uređaj nije radio.',
      photos: 'Soba ne odgovara slikama.',
    },
    headline: { good: 'Prekrasan boravak', ok: 'Dobro', bad: 'Razočaravajuće' },
  },
  pl: {
    pros: ['Dobry stosunek jakości do ceny.', 'Bezpłatny parking przed domem.'],
    cons: ['Wifi było trochę wolne.'],
    issues: {
      mold: 'W łazience była pleśń.',
      noise: 'W nocy był duży hałas.',
      dirty: 'Łazienka była brudna.',
      bugs: 'W łóżku były pluskwy.',
      smell: 'W pokoju był smród.',
      condition: 'Prysznic był zepsuty.',
      photos: 'Pokój był niezgodny z opisem.',
    },
    headline: { good: 'Wspaniały pobyt', ok: 'Dobrze', bad: 'Rozczarowanie' },
  },
  cs: {
    pros: ['Dobrý poměr ceny a kvality.', 'Parkování zdarma před domem.'],
    cons: ['Wifi bylo trochu pomalé.'],
    issues: {
      mold: 'V koupelně byla plíseň.',
      noise: 'V noci byl velký hluk.',
      dirty: 'Koupelna byla špinavá.',
      bugs: 'V posteli byly štěnice.',
      smell: 'V pokoji byl zápach.',
      condition: 'Sprcha byla rozbitá.',
      photos: 'Pokoj neodpovídá popisu.',
    },
    headline: { good: 'Skvělý pobyt', ok: 'Dobré', bad: 'Zklamání' },
  },
  hu: {
    pros: ['Jó ár érték arány.', 'Ingyenes parkolás a ház előtt.'],
    cons: ['A wifi kicsit lassú volt.'],
    issues: {
      mold: 'Penész volt a fürdőszobában.',
      noise: 'Éjjel nagy zaj volt.',
      dirty: 'A fürdőszoba koszos volt.',
      bugs: 'Poloskák voltak az ágyban.',
      smell: 'Kellemetlen szag volt a szobában.',
      condition: 'A zuhany nem működött.',
      photos: 'A szoba nem felel meg a leírásnak.',
    },
    headline: { good: 'Csodás tartózkodás', ok: 'Jó', bad: 'Csalódás' },
  },
  nl: {
    pros: ['Goede prijs kwaliteit verhouding.', 'Gratis parkeren voor het huis.'],
    cons: ['De wifi was wat traag.'],
    issues: {
      mold: 'Er zat schimmel in de douche.',
      noise: 'Veel lawaai in de nacht.',
      dirty: 'De badkamer was vies.',
      bugs: 'Bedwantsen in het bed.',
      smell: 'Een muffe geur in de kamer.',
      condition: 'De douche was kapot.',
      photos: 'De kamer was niet zoals beschreven.',
    },
    headline: { good: 'Heerlijk verblijf', ok: 'Goed', bad: 'Teleurstellend' },
  },
  el: {
    pros: ['Καλή σχέση ποιότητας και τιμής.', 'Δωρεάν στάθμευση μπροστά στο σπίτι.'],
    cons: ['Το wifi ήταν λίγο αργό.'],
    issues: {
      mold: 'Υπήρχε μούχλα στο μπάνιο.',
      noise: 'Πολύς θόρυβος τη νύχτα.',
      dirty: 'Το μπάνιο ήταν βρώμικο.',
      bugs: 'Βρήκαμε κατσαρίδες στο δωμάτιο.',
      smell: 'Άσχημη μυρωδιά στο δωμάτιο.',
      condition: 'Το ντους ήταν χαλασμένο.',
      photos: 'Το δωμάτιο δεν αντιστοιχεί στις φωτογραφίες.',
    },
    headline: { good: 'Υπέροχη διαμονή', ok: 'Καλό', bad: 'Απογοητευτικό' },
  },
  da: {
    pros: ['God pris i forhold til kvalitet.', 'Gratis parkering foran huset.'],
    cons: ['Wifi var lidt langsomt.'],
    issues: {
      mold: 'Der var skimmel i badeværelset.',
      noise: 'Meget larm om natten.',
      dirty: 'Badeværelset var beskidt.',
      bugs: 'Vi fandt væggelus i sengen.',
      smell: 'Dårlig lugt i værelset.',
      condition: 'Bruseren var ødelagt.',
      photos: 'Værelset var ikke som beskrevet.',
    },
    headline: { good: 'Skønt ophold', ok: 'Godt', bad: 'Skuffende' },
  },
  sv: {
    pros: ['Bra pris i förhållande till kvalitet.', 'Gratis parkering framför huset.'],
    cons: ['Wifi var lite långsamt.'],
    issues: {
      mold: 'Det fanns mögel i duschen.',
      noise: 'Mycket buller på natten.',
      dirty: 'Badrummet var smutsigt.',
      bugs: 'Vi hittade vägglöss i sängen.',
      smell: 'Dålig lukt i rummet.',
      condition: 'Duschen var trasig.',
      photos: 'Rummet var inte som beskrivet.',
    },
    headline: { good: 'Underbar vistelse', ok: 'Bra', bad: 'Besvikelse' },
  },
  no: {
    pros: ['God pris i forhold til kvalitet.', 'Gratis parkering foran huset.'],
    cons: ['Wifi var litt tregt.'],
    issues: {
      mold: 'Det var mugg på badet.',
      noise: 'Mye støy om natten.',
      dirty: 'Badet var skittent.',
      bugs: 'Vi fant veggdyr i sengen.',
      smell: 'Vond lukt på rommet.',
      condition: 'Dusjen var ødelagt.',
      photos: 'Rommet var ikke som beskrevet.',
    },
    headline: { good: 'Nydelig opphold', ok: 'Bra', bad: 'Skuffende' },
  },
};

/**
 * Rough language area of a simulated house outside the DACH frame (the same
 * frame as the orientation map: lat 45.7–55.2, lng 5.6–17.3); inside it the
 * reviews stay German and English as before. Boxes are coarse on purpose.
 */
export function localLanguageAt(lat: number, lng: number): LocalLanguage | null {
  if (lat >= 45.7 && lat <= 55.2 && lng >= 5.6 && lng <= 17.3) return null;
  const inBox = (la: [number, number], ln: [number, number]) => lat >= la[0] && lat <= la[1] && lng >= ln[0] && lng <= ln[1];
  if (inBox([34.5, 41.8], [19.3, 29.7])) return 'el';
  if (inBox([32, 42.2], [-17.5, -6.2])) return 'pt';
  if (inBox([27.5, 43.8], [-18.2, 4.4])) return 'es';
  if (inBox([42.3, 46.6], [13.4, 19.5])) return 'hr';
  if (inBox([36, 46.6], [6.6, 18.6])) return 'it';
  if (inBox([41.3, 51.1], [-5.2, 8.2])) return 'fr';
  if (inBox([45.7, 48.6], [16.1, 22.9])) return 'hu';
  if (inBox([49, 54.9], [17.3, 24.2])) return 'pl';
  if (inBox([50.7, 53.6], [3.3, 5.6])) return 'nl';
  if (inBox([55.3, 69.1], [11.2, 24.2])) return 'sv';
  if (inBox([57.9, 71.3], [4.5, 11.2])) return 'no';
  if (inBox([54.5, 57.8], [8, 15.2])) return 'da';
  return null;
}

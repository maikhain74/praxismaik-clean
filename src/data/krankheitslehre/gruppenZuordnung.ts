export const gruppenZuordnung = {
  grundlagen: [
    "krankheitslehre-grundlagen",
    "akut-vs-chronisch",
    "schmerz",
  ],

  herz: [
    "koronare-herzkrankheit",
    "angina-pectoris",
    "herzinfarkt",
    "herzinsuffizienz",
    "herzrhythmusstoerungen",
    "hypertonie",
    "thrombose",
    "oedem",
  ],

  atmung: [
    "asthma",
    "copd",
    "pneumonie",
    "lungenembolie",
  ],

  verdauung: [
    "verdauungstrakt",
    "reflux",
    "gastritis",
    "ulcus",
    "appendizitis",
    "divertikulitis",
    "morbus-crohn",
    "colitis",
    "karzinom",
    "ileus",
    "gallen",
    "hepatitis",
    "leberzirrhose",
    "pankreatitis",
  ],

  stoffwechsel: [
    "diabetes",
    "dehydratation",
    "mangelernaehrung",
  ],

  niere: [
    "niereninsuffizienz",
    "harnwegsinfektion",
  ],

  nerven: [
    "schlaganfall",
    "parkinson",
    "delir",
  ],

  infektionen: [
    "infektion",
    "entzuendung",
    "fieber",
    "sepsis",
  ],
} as const;

export type GruppenKey = keyof typeof gruppenZuordnung | "weitere";
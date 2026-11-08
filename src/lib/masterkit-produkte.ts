export const MASTERKIT_BUCKET = "praxismaik-produkte";

export const MASTERKIT_PRODUKTE = {
  "medikamentenlehre-masterkit": {
    name: "Medikamentenlehre-Masterkit",
    datei: "PraxisMaik_Medikamentenlehre_Masterkit.pdf",
    emailBetreff: "Dein Medikamentenlehre-Masterkit von PraxisMaik",
    preisVariable: "STRIPE_PRICE_ID_MASTERKIT",
  },

  "fachgespraech-masterkit": {
    name: "Fachgespräch-Masterkit Generalistik",
    datei: "PraxisMaik_Fachgespraech_Masterkit_FINAL.pdf",
    emailBetreff: "Dein Fachgespräch-Masterkit von PraxisMaik",
    preisVariable: "STRIPE_PRICE_ID_FACHGESPRAECH",
  },
} as const;

export type MasterkitProduktKey =
  keyof typeof MASTERKIT_PRODUKTE;

export function getMasterkitProdukt(
  productKey: string
) {
  if (
    Object.prototype.hasOwnProperty.call(
      MASTERKIT_PRODUKTE,
      productKey
    )
  ) {
    return MASTERKIT_PRODUKTE[
      productKey as MasterkitProduktKey
    ];
  }

  return null;
}

export function getMasterkitPreisId(
  productKey: MasterkitProduktKey
): string | undefined {
  switch (productKey) {
    case "medikamentenlehre-masterkit":
      return import.meta.env.STRIPE_PRICE_ID_MASTERKIT;

    case "fachgespraech-masterkit":
      return import.meta.env.STRIPE_PRICE_ID_FACHGESPRAECH;
  }
}

import type { BlueprintId } from "../engine/engine_v0_1";

export type SkillNode = {
  id: string;
  title: string;
  description: string;
  prereqs: string[];
  blueprints: BlueprintId[];
  /**
   * Level used by Level-4 IRT update (maps to item difficulty b via levelToB).
   * For fine-grained progression nodes (A*), keep this fixed per node.
   */
  default_level: number;
  /**
   * If true, PracticeSession will pick item level from theta each item.
   * If false, it will keep default_level fixed.
   */
  adaptive?: boolean;
};

export const SKILLMAP: { nodes: SkillNode[] } = {
  nodes: [
    // ------------------------
    // ADDITION — A0 … A10.2
    // Whole-number addition progression (0. – 9. klasse, groft skaleret).
    // ------------------------

    // A0: tidlig addition (tælle/komplementer)
    {
      id: "A0.1",
      title: "Addition A0.1: Tæl alt (≤5)",
      description: "Læg små mængder sammen ved at tælle alle.",
      prereqs: [],
      blueprints: ["A0-COUNT_ALL"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "A0.2",
      title: "Addition A0.2: Tæl videre (≤10)",
      description: "Start ved det første tal og tæl videre.",
      prereqs: ["A0.1"],
      blueprints: ["A0-COUNT_ON"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "A0.3",
      title: "Addition A0.3: Ti-venner",
      description: "Talpar der giver 10 (fx 6+4).",
      prereqs: ["A0.2"],
      blueprints: ["A0-BONDS_10"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "A0.4",
      title: "Addition A0.4: Dobbelt",
      description: "Doble tal (fx 7+7).",
      prereqs: ["A0.3"],
      blueprints: ["A0-DOUBLES"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "A0.5",
      title: "Addition A0.5: Næsten dobbelt",
      description: "Næsten-dobbelte (fx 6+7).",
      prereqs: ["A0.4"],
      blueprints: ["A0-NEAR_DOUBLES"],
      default_level: 1,
      adaptive: false,
    },

    // A1: inden for 20
    {
      id: "A1.1",
      title: "Addition A1.1: Ét-cifrede (sum ≤10)",
      description: "Læg to ét-cifrede tal sammen uden at komme over 10.",
      prereqs: ["A0.5"],
      blueprints: ["A1-1D-SUM_LE_10"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "A1.2",
      title: "Addition A1.2: Ét-cifrede (sum 11–18)",
      description: "Læg to ét-cifrede tal sammen med 'mente' (over 10).",
      prereqs: ["A1.1"],
      blueprints: ["A1-1D-SUM_11_18"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "A1.3",
      title: "Addition A1.3: Lav 10 (8 og 9)",
      description: "Brug 'lav 10'-strategi med 8/9 (fx 9+6).",
      prereqs: ["A1.2"],
      blueprints: ["A1-MAKE_TEN_8_9"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "A1.4",
      title: "Addition A1.4: Tre tal (sum ≤10)",
      description: "Læg tre små tal sammen (uden at komme over 10).",
      prereqs: ["A1.3"],
      blueprints: ["A1-3TERMS_LE_10"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "A1.5",
      title: "Addition A1.5: Tre tal (sum 11–18)",
      description: "Læg tre små tal sammen (sum mellem 11 og 18).",
      prereqs: ["A1.4"],
      blueprints: ["A1-3TERMS_11_18"],
      default_level: 1,
      adaptive: false,
    },

    // A2: inden for 100 (mentale strategier)
    {
      id: "A2.1.1",
      title: "Addition A2.1.1: Hele tiere ≤ 100",
      description: "Hele tiere + hele tiere, sum ≤ 100 (fx 30+40).",
      prereqs: ["A1.5"],
      blueprints: ["A2-TENS_TENS_LE_100"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "A2.1.2",
      title: "Addition A2.1.2: Hele tiere > 100",
      description: "Hele tiere + hele tiere, sum > 100 (fx 70+60).",
      prereqs: ["A2.1.1"],
      blueprints: ["A2-TENS_TENS_GT_100"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "A2.1.3",
      title: "Addition A2.1.3: Taler + blandet ≤ 100",
      description: "Et tal er hele tiere; det andet må have enere. Sum ≤ 100 (fx 50+34).",
      prereqs: ["A2.1.2"],
      blueprints: ["A2-TENS_MIX_LE_100"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "A2.1.4",
      title: "Addition A2.1.4: Taler + blandet > 100",
      description: "Et tal er hele tiere; det andet må have enere. Sum > 100 (fx 80+37).",
      prereqs: ["A2.1.3"],
      blueprints: ["A2-TENS_MIX_GT_100"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "A2.2",
      title: "Addition A2.2: 2-cifret + 1-cifret (uden mente)",
      description: "To-cifret + ét-cifret uden overgang over 10 i enere.",
      prereqs: ["A2.1.4"],
      blueprints: ["A2-2D1D-NOCARRY"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "A2.3",
      title: "Addition A2.3: 2-cifret + 1-cifret (med mente)",
      description: "To-cifret + ét-cifret med overgang over 10 i enere.",
      prereqs: ["A2.2"],
      blueprints: ["A2-2D1D-CARRY"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "A2.4",
      title: "Addition A2.4: 2-cifret + 2-cifret (uden mente)",
      description: "To-cifret + to-cifret uden overgang i enere/tiere.",
      prereqs: ["A2.3"],
      blueprints: ["A2-2D2D-NOCARRY"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "A2.5",
      title: "Addition A2.5: 2-cifret + 2-cifret (én mente)",
      description: "Overgang i enere, men ikke i tiere.",
      prereqs: ["A2.4"],
      blueprints: ["A2-2D2D-CARRY1"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "A2.6",
      title: "Addition A2.6: 2-cifret + 2-cifret (to menter)",
      description: "Overgang i enere og i tiere (giver 3-cifret resultat).",
      prereqs: ["A2.5"],
      blueprints: ["A2-2D2D-CARRY2"],
      default_level: 2,
      adaptive: false,
    },

    // A3: skriftlig/kolonneaddition (2 cifre)
    {
      id: "A3.1",
      title: "Addition A3.1: Kolonne (2 cifre, uden mente)",
      description: "Skriftlig addition i kolonner uden overgang.",
      prereqs: ["A2.6"],
      blueprints: ["A3-COL2D-NOCARRY"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "A3.2",
      title: "Addition A3.2: Kolonne (2 cifre, én mente)",
      description: "Skriftlig addition med overgang i enere.",
      prereqs: ["A3.1"],
      blueprints: ["A3-COL2D-CARRY1"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "A3.3",
      title: "Addition A3.3: Kolonne (2 cifre, to menter)",
      description: "Skriftlig addition med overgang i enere og tiere.",
      prereqs: ["A3.2"],
      blueprints: ["A3-COL2D-CARRY2"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "A3.4",
      title: "Addition A3.4: Mental kompensation",
      description: "Brug afrunding/kompensation (fx 49+27 = 50+26).",
      prereqs: ["A3.3"],
      blueprints: ["A3-COMPENSATION"],
      default_level: 2,
      adaptive: false,
    },

    // A4: 3 cifre + flere led
    {
      id: "A4.1",
      title: "Addition A4.1: 3 cifre (uden mente)",
      description: "Tre-cifret + tre-cifret uden overgang.",
      prereqs: ["A3.4"],
      blueprints: ["A4-3D3D-NOCARRY"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "A4.2",
      title: "Addition A4.2: 3 cifre (én mente)",
      description: "Tre-cifret + tre-cifret med præcis én overgang.",
      prereqs: ["A4.1"],
      blueprints: ["A4-3D3D-CARRY1"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "A4.3",
      title: "Addition A4.3: 3 cifre (flere menter)",
      description: "Tre-cifret + tre-cifret med flere overgange.",
      prereqs: ["A4.2"],
      blueprints: ["A4-3D3D-MULTICARRY"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "A4.4",
      title: "Addition A4.4: Kæde-mente",
      description: "Overgange som 'løber videre' (fx 199+7).",
      prereqs: ["A4.3"],
      blueprints: ["A4-CHAIN_CARRY"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "A4.5",
      title: "Addition A4.5: Flere led (3 tal)",
      description: "Læg tre tal sammen (2–3 cifre), ofte med overgange.",
      prereqs: ["A4.4"],
      blueprints: ["A4-MULTIADD-3"],
      default_level: 3,
      adaptive: false,
    },

    {
      id: "A4.6",
      title: "Addition A4.6: Kolonneaddition (cifre + menter)",
      description: "Regn i kolonner. Udfyld både mente-tal og resultatcifre.",
      prereqs: ["A4.3"],
      blueprints: ["A4-COLUMN_ADD"],
      default_level: 4,
      adaptive: false,
    },

    // A5: 4–6 cifre
    {
      id: "A5.1",
      title: "Addition A5.1: 4 cifre (uden mente)",
      description: "Fire-cifret + fire-cifret uden overgang.",
      prereqs: ["A4.5"],
      blueprints: ["A5-4D4D-NOCARRY"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "A5.2",
      title: "Addition A5.2: 4 cifre (med mente)",
      description: "Fire-cifret + fire-cifret med overgange.",
      prereqs: ["A5.1"],
      blueprints: ["A5-4D4D-CARRY"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "A5.3",
      title: "Addition A5.3: 5–6 cifre",
      description: "Fem-/seks-cifrede tal (kolonne/mental).",
      prereqs: ["A5.2"],
      blueprints: ["A5-5_6_DIGIT"],
      default_level: 4,
      adaptive: false,
    },
    {
      id: "A5.4",
      title: "Addition A5.4: Mange nuller / pladsværdi",
      description: "Tal med nuller (fx 50.070 + 340).",
      prereqs: ["A5.3"],
      blueprints: ["A5-ZEROS_PLACEVALUE"],
      default_level: 4,
      adaptive: false,
    },

    // A6: 7–9 cifre
    {
      id: "A6.1",
      title: "Addition A6.1: 7–8 cifre",
      description: "Større heltal (millioner).",
      prereqs: ["A5.4"],
      blueprints: ["A6-7_8_DIGIT"],
      default_level: 4,
      adaptive: false,
    },
    {
      id: "A6.2",
      title: "Addition A6.2: 9 cifre",
      description: "Meget store heltal (op til ~1 mia.).",
      prereqs: ["A6.1"],
      blueprints: ["A6-9_DIGIT"],
      default_level: 4,
      adaptive: false,
    },

    // A7: blandet (to eller mange led, 1–9 cifre)
    {
      id: "A7.1",
      title: "Addition A7.1: Blandet (2 led)",
      description: "To tal med varierende størrelse (1–9 cifre).",
      prereqs: ["A6.2"],
      blueprints: ["A7-MIXED-2"],
      default_level: 4,
      adaptive: false,
    },
    {
      id: "A7.2",
      title: "Addition A7.2: Blandet (3–6 led)",
      description: "Flere addender med varierende størrelse.",
      prereqs: ["A7.1"],
      blueprints: ["A7-MIXED-MULTI"],
      default_level: 4,
      adaptive: false,
    },

    // A8–A10: udvidelser (inkl. negative tal og parenteser). Disse kan senere flyttes til Z2/Z4.
    {
      id: "A8.1",
      title: "Addition A8.1: Negative tal (2 led)",
      description: "Addition med negative tal (kun '+', ingen minus-tegn som operation).",
      prereqs: ["A7.2"],
      blueprints: ["A8-NEG-2"],
      default_level: 4,
      adaptive: false,
    },
    {
      id: "A8.2",
      title: "Addition A8.2: Negative tal (3 led)",
      description: "Addition med tre led og negative tal (kun '+').",
      prereqs: ["A8.1"],
      blueprints: ["A8-NEG-3"],
      default_level: 4,
      adaptive: false,
    },
    {
      id: "A9.1",
      title: "Addition A9.1: Parenteser (kun plus)",
      description: "Udtryk som a + (b + c).",
      prereqs: ["A8.2"],
      blueprints: ["A9-PARENS"],
      default_level: 4,
      adaptive: false,
    },
    {
      id: "A9.2",
      title: "Addition A9.2: Parenteser + negative",
      description: "Udtryk som a + (b + c) med negative tal.",
      prereqs: ["A9.1"],
      blueprints: ["A9-CANCEL"],
      default_level: 4,
      adaptive: false,
    },
    {
      id: "A10.1",
      title: "Addition A10.1: Blandet (parens + 3–4 led)",
      description: "Blandede udtryk med paranteser og flere led.",
      prereqs: ["A9.2"],
      blueprints: ["A10-MIXED-PARENS-NEG"],
      default_level: 4,
      adaptive: false,
    },
    {
      id: "A10.2",
      title: "Addition A10.2: Challenge (4–6 led)",
      description: "Større blandede additionsudtryk (4–6 led).",
      prereqs: ["A10.1"],
      blueprints: ["A10-CHALLENGE"],
      default_level: 4,
      adaptive: false,
    },
    // ------------------------
    // TALFORSTÅELSE & POSITIONSSYSTEM — T0 … T4 (heltal)
    // ------------------------
    {
      id: "T0.1",
      title: "Talforståelse T0.1: Takrækker (0–10)",
      description: "Skriv tallet, der mangler, i en talrække fra 0 til 10.",
      prereqs: [],
      blueprints: ["T0-SEQUENCE-0-10"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "T0.1b",
      title: "Talforståelse T0.1b: Takrækker (0–100)",
      description: "Skriv tallet, der mangler, i en talrække fra 0 til 100.",
      prereqs: ["T0.1"],
      blueprints: ["T0-SEQUENCE-0-100"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "T0.1c",
      title: "Talforståelse T0.1c: Takrækker (0–1000)",
      description: "Skriv tallet, der mangler, i en talrække fra 0 til 1000.",
      prereqs: ["T0.1b"],
      blueprints: ["T0-SEQUENCE-0-1000"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "T0.2",
      title: "Talforståelse T0.2: Tæl i spring (2, 5, 10)",
      description: "Skriv tallet, der mangler (det skjulte tal står til sidst).",
      prereqs: ["T0.1c"],
      blueprints: ["T0-SKIPCOUNT-END-2-5-10"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "T0.2b",
      title: "Talforståelse T0.2b: Tæl i spring (skjult i midten)",
      description: "Skriv tallet, der mangler (det skjulte tal kan stå i midten).",
      prereqs: ["T0.2"],
      blueprints: ["T0-SKIPCOUNT-MIDDLE-2-5-10"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "T0.2c",
      title: "Talforståelse T0.2c: Tæl i spring (skjult i starten)",
      description: "Skriv tallet, der mangler (det skjulte tal kan stå i starten).",
      prereqs: ["T0.2b"],
      blueprints: ["T0-SKIPCOUNT-START-2-5-10"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "T1.1",
      title: "Positionssystem T1.1: Enere og tiere",
      description: "Vælg om et ciffer står på ener- eller tierpladsen.",
      prereqs: ["T0.2c"],
      blueprints: ["T1-PLACEVALUE-2D"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "T1.2",
      title: "Positionssystem T1.2: Hundreder, tiere, enere",
      description: "Vælg om et ciffer står på hundrede-, tier- eller enerpladsen.",
      prereqs: ["T1.1"],
      blueprints: ["T1-PLACEVALUE-3D"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "T1.3",
      title: "Positionssystem T1.3: Omveksling som idé",
      description: "Ombyt mellem hundreder, tiere og enere.",
      prereqs: ["T1.2"],
      blueprints: ["T1-REGROUP-CONCEPT"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "T2.1",
      title: "Talforståelse T2.1: Sammenlign tal (≤1000)",
      description: "Afgør hvilket tal der er størst.",
      prereqs: ["T1.2"],
      blueprints: ["T2-COMPARE-LE-1000"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "T2.2",
      title: "Talforståelse T2.2: Sammenlign og ordn",
      description: "Træk og slip tal, så de står i stigende orden.",
      prereqs: ["T2.1"],
      blueprints: ["T2-ORDER-LE-1000"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "T3.1",
      title: "Talforståelse T3.1: Afrund (10 og 100)",
      description: "Afrund til nærmeste 10 og 100.",
      prereqs: ["T2.1"],
      blueprints: ["T3-ROUND-10-100"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "T3.2",
      title: "Talforståelse T3.2: Overslag",
      description: "Lav et overslag ved at afrunde først.",
      prereqs: ["T3.1"],
      blueprints: ["T3-ESTIMATE"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "T4.1",
      title: "Talforståelse T4.1: Tallinje (start/slut positiv)",
      description: "Aflæs bevægelse på en tallinje med positive tal.",
      prereqs: ["T2.1"],
      blueprints: ["T4-NUMBERLINE-POSPOS"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "T4.1b",
      title: "Talforståelse T4.1b: Tallinje (positiv → negativ)",
      description: "Start på et positivt tal og bevæg dig til et negativt tal.",
      prereqs: ["T4.1"],
      blueprints: ["T4-NUMBERLINE-POSNEG"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "T4.1c",
      title: "Talforståelse T4.1c: Tallinje (negativ → positiv)",
      description: "Start på et negativt tal og bevæg dig til et positivt tal.",
      prereqs: ["T4.1b"],
      blueprints: ["T4-NUMBERLINE-NEGPOS"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "T4.1d",
      title: "Talforståelse T4.1d: Tallinje (start/slut negativ)",
      description: "Aflæs bevægelse på en tallinje med negative tal.",
      prereqs: ["T4.1c"],
      blueprints: ["T4-NUMBERLINE-NEGNEG"],
      default_level: 1,
      adaptive: false,
    },


    // ------------------------
    // LIGHEDSTEGN & MANGLENDE LED — E0 … E1
    // ------------------------
    {
      id: "E0.1",
      title: "Lighedstegn",
      description: "Forstå at '=' betyder samme værdi på begge sider.",
      prereqs: ["T0.1"],
      blueprints: ["E0-EQUAL-SIGN"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "E0.2",
      title: "Manglende led E0.2: Addition",
      description: "Find det manglende tal i □ + b = a.",
      prereqs: ["E0.1"],
      blueprints: ["E0-MISSING-ADD"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "E0.3",
      title: "Manglende led E0.3: Subtraktion",
      description: "Find det manglende tal i a − □ = b.",
      prereqs: ["E0.2"],
      blueprints: ["E0-MISSING-SUB"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "E1.1",
      title: "Omvendthed E1.1: plus ↔ minus",
      description: "Brug addition til at kontrollere subtraktion (og omvendt).",
      prereqs: ["E0.3"],
      blueprints: ["E1-INVERSE-ADD-SUB"],
      default_level: 2,
      adaptive: false,
    },

    // ------------------------
    // DECIMALTAL — T10.* (fundament for A11/S11/M11/D11)
    // ------------------------
    {
      id: "T10.1",
      title: "Decimaltal T10.1: Pladsværdi",
      description: "Tiendedele og hundrededele: læs og skriv decimaltal.",
      prereqs: ["T2.1"],
      blueprints: ["T10-DEC-PLACEVALUE"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "T10.2",
      title: "Decimaltal T10.2: Sammenlign og ordn",
      description: "Træk og slip decimaltal, så de står i stigende orden.",
      prereqs: ["T10.1"],
      blueprints: ["T10-DEC-ORDER"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "T10.3",
      title: "Decimaltal T10.3: Afrund og overslag",
      description: "Afrund decimaltal og lav overslag som kontrol.",
      prereqs: ["T10.2", "T3.1"],
      blueprints: ["T10-DEC-ROUND"],
      default_level: 2,
      adaptive: false,
    },

    // ------------------------
    // SUBTRAKTION — S0 … S2 + S11 (granulær)
    // ------------------------
    {
      id: "S0.1",
      title: "Subtraktion S0.1: Facts (≤10)",
      description: "Subtraktion inden for 10.",
      prereqs: ["E0.1"],
      blueprints: ["S0-SUB-LE10"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "S0.2",
      title: "Subtraktion S0.2: Fra 10 (ti-venner)",
      description: "10 − n og komplementer.",
      prereqs: ["S0.1"],
      blueprints: ["S0-FROM10"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "S0.3",
      title: "Subtraktion S0.3: Kryds tier (≤20)",
      description: "13−7, 18−9 osv. (afstand til næste tier).",
      prereqs: ["S0.2", "T4.1"],
      blueprints: ["S0-CROSS-TEN"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "S1.1",
      title: "Subtraktion S1.1: 2-cifret − 1-cifret (uden lån)",
      description: "Træk et ciffer fra uden at låne.",
      prereqs: ["S0.3", "T1.2"],
      blueprints: ["S1-2D1D-NOBORROW"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "S1.2",
      title: "Subtraktion S1.2: 2-cifret − 1-cifret (med lån)",
      description: "Lån fra tierkolonnen.",
      prereqs: ["S1.1", "T1.3"],
      blueprints: ["S1-2D1D-BORROW"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "S1.3",
      title: "Subtraktion S1.3: 2-cifret − 2-cifret (uden lån)",
      description: "To cifre, ingen låning.",
      prereqs: ["S1.1"],
      blueprints: ["S1-2D2D-NOBORROW"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "S1.4",
      title: "Subtraktion S1.4: 2-cifret − 2-cifret (med lån)",
      description: "Lån i enere/tiere.",
      prereqs: ["S1.2"],
      blueprints: ["S1-2D2D-BORROW"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "S2.1",
      title: "Subtraktion S2.1: 3-cifret − 3-cifret (uden lån)",
      description: "H-T-E uden låning.",
      prereqs: ["S1.3", "T1.2"],
      blueprints: ["S2-3D3D-NOBORROW"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "S2.2",
      title: "Subtraktion S2.2: 3-cifret − 3-cifret (med lån)",
      description: "Lån i enere og/eller tiere.",
      prereqs: ["S1.4"],
      blueprints: ["S2-3D3D-BORROW"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "S2.3",
      title: "Subtraktion S2.3: Lån over nul",
      description: "Fx 402 − 178 (lån gennem en nul-kolonne).",
      prereqs: ["S2.2"],
      blueprints: ["S2-BORROW-OVER-ZERO"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "S-WP.1",
      title: "Subtraktion S-WP.1: Tekstopgaver (forskel/afstand)",
      description: "Vælg om problemet handler om 'tage fra' eller 'forskel'.",
      prereqs: ["S1.4", "T4.1"],
      blueprints: ["S-WORD-PROBLEMS"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "S11.1",
      title: "Subtraktion S11.1: Decimaler (alignment)",
      description: "Subtrahér decimaltal ved at stille komma under komma.",
      prereqs: ["T10.2"],
      blueprints: ["S11-DEC-ALIGN"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "S11.2",
      title: "Subtraktion S11.2: Decimaler (lån)",
      description: "Lån over komma (fx 5,2 − 2,78).",
      prereqs: ["S11.1"],
      blueprints: ["S11-DEC-BORROW"],
      default_level: 3,
      adaptive: false,
    },

    // ------------------------
    // MULTIPLIKATION — M0 … M4 + M11 (arealmetoden som rygrad)
    // ------------------------
    {
      id: "M0.1",
      title: "Multiplikation M0.1: Gentagen addition",
      description: "Forstå gange som gentagen addition.",
      prereqs: ["A0.2"],
      blueprints: ["M0-REPEATED-ADD"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "M0.2",
      title: "Multiplikation M0.2: Arrays",
      description: "Rækker og kolonner (arrays) som model for gange.",
      prereqs: ["M0.1"],
      blueprints: ["M0-ARRAYS"],
      default_level: 1,
      adaptive: false,
    },
    {
      id: "M1.1",
      title: "Multiplikation M1.1: Tabeller (0–10)",
      description: "Automatisér små gangestykker.",
      prereqs: ["M0.2", "T0.2"],
      blueprints: ["M1-TIMES-TABLES-0-10"],
      default_level: 2,
      adaptive: true,
    },
    {
      id: "M1.2",
      title: "Multiplikation M1.2: Gang med 10/100/1000",
      description: "Pladsværdi-regler for gange med 10, 100, 1000.",
      prereqs: ["T1.2"],
      blueprints: ["M1-MUL-BY-10-100-1000"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "M2.1",
      title: "Arealmetoden M2.1: 2-cifret × 1-cifret (let)",
      description: "Udfyld delprodukter (fx 40×6 og 7×6) og læg sammen.",
      prereqs: ["M1.1", "A2.2"],
      blueprints: ["M2-AREA-2Dx1D-EASY"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "M2.2",
      title: "Arealmetoden M2.2: 2-cifret × 1-cifret (svær)",
      description: "Delprodukter + sammentælling med carry.",
      prereqs: ["M2.1", "A3.2"],
      blueprints: ["M2-AREA-2Dx1D-HARD"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "M3.1",
      title: "Arealmetoden M3.1: 2-cifret × 2-cifret (let)",
      description: "4 felter: (a+b)×(c+d) som sum af delprodukter.",
      prereqs: ["M2.2"],
      blueprints: ["M3-AREA-2Dx2D-EASY"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "M3.2",
      title: "Arealmetoden M3.2: 2-cifret × 2-cifret (svær)",
      description: "Mere carry i delprodukterne og summen.",
      prereqs: ["M3.1"],
      blueprints: ["M3-AREA-2Dx2D-HARD"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "M4.1",
      title: "Arealmetoden M4.1: 3-cifret × 2-cifret",
      description: "6 felter: 126×34 som (100+20+6)×(30+4).",
      prereqs: ["M3.2"],
      blueprints: ["M4-AREA-3Dx2D"],
      default_level: 4,
      adaptive: false,
    },
    {
      id: "M-WP.1",
      title: "Multiplikation M-WP.1: Tekstopgaver",
      description: "Brug array/areal-tænkning i tekstkontekst.",
      prereqs: ["M2.2"],
      blueprints: ["M-WORD-PROBLEMS"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "M11.1",
      title: "Multiplikation M11.1: Decimal × heltal",
      description: "Gang decimaltal med heltal (komma via pladsværdi).",
      prereqs: ["T10.3", "M1.1"],
      blueprints: ["M11-DEC-TIMES-INT"],
      default_level: 4,
      adaptive: false,
    },
    {
      id: "M11.2",
      title: "Multiplikation M11.2: Decimal × decimal",
      description: "Gang to decimaltal (tjek med overslag).",
      prereqs: ["M11.1"],
      blueprints: ["M11-DEC-TIMES-DEC"],
      default_level: 4,
      adaptive: false,
    },

    // ------------------------
    // DIVISION — D0 … D2 + D11 (granulær)
    // ------------------------
    {
      id: "D0.1",
      title: "Division D0.1: Deling og grupper",
      description: "Forstå division som deling og som 'hvor mange grupper?'.",
      prereqs: ["M1.1"],
      blueprints: ["D0-CONCEPT"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "D0.2",
      title: "Division D0.2: Facts uden rest",
      description: "Små divisioner der går op (koblet til tabeller).",
      prereqs: ["D0.1"],
      blueprints: ["D0-DIV-FACTS"],
      default_level: 2,
      adaptive: true,
    },
    {
      id: "D1.1",
      title: "Division D1.1: Rest-begreb",
      description: "Kvotient og rest, og reglen: rest < divisor.",
      prereqs: ["D0.2"],
      blueprints: ["D1-REM-CONCEPT"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "D1.2",
      title: "Division D1.2: Kontrol",
      description: "Kontrollér med divisor·kvotient + rest = dividend.",
      prereqs: ["D1.1"],
      blueprints: ["D1-REM-CHECK"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "D2.1",
      title: "Lang division D2.1: Uden rest (2–3 cifre ÷ 1 ciffer)",
      description: "Lang division hvor det går op.",
      prereqs: ["D0.2", "S1.4"],
      blueprints: ["D2-LONGDIV-NOREM"],
      default_level: 3,
      adaptive: true,
    },
    {
      id: "D2.2",
      title: "Lang division D2.2: Med rest",
      description: "Lang division med kvotient og rest.",
      prereqs: ["D2.1", "D1.1"],
      blueprints: ["D2-LONGDIV-REM"],
      default_level: 3,
      adaptive: true,
    },
    {
      id: "D2.3",
      title: "Lang division D2.3: Nul i kvotienten",
      description: "Cases hvor man skal skrive 0 i kvotienten undervejs.",
      prereqs: ["D2.2"],
      blueprints: ["D2-ZERO-IN-QUOTIENT"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "D-WP.1",
      title: "Division D-WP.1: Tekstopgaver",
      description: "Fortolk rest (runde op/ned) i kontekst.",
      prereqs: ["D1.2"],
      blueprints: ["D-WORD-PROBLEMS"],
      default_level: 2,
      adaptive: false,
    },
    {
      id: "D11.1",
      title: "Division D11.1: ÷10/100/1000",
      description: "Komma flytter ved division med 10, 100, 1000.",
      prereqs: ["T10.1"],
      blueprints: ["D11-DIV-BY-10-100-1000"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "D11.2",
      title: "Division D11.2: Decimal ÷ heltal",
      description: "Division der giver terminende decimaler.",
      prereqs: ["D11.1", "D0.2"],
      blueprints: ["D11-DEC-DIV-INT"],
      default_level: 4,
      adaptive: false,
    },

    // ------------------------
    // ADDITION (decimaler) — A11.*
    // ------------------------
    {
      id: "A11.1",
      title: "Addition A11.1: Decimaler (alignment)",
      description: "Addér decimaltal ved at stille komma under komma.",
      prereqs: ["T10.2"],
      blueprints: ["A11-DEC-ALIGN"],
      default_level: 3,
      adaptive: false,
    },
    {
      id: "A11.2",
      title: "Addition A11.2: Decimaler (forskellig længde)",
      description: "Addér decimaler med forskellige antal decimaler.",
      prereqs: ["A11.1"],
      blueprints: ["A11-DEC-MIXED-LEN"],
      default_level: 3,
      adaptive: false,
    },

    // ------------------------
    // RESTEN (avanceret/øvrigt) — negative tal, regnehierarki, manglende led, potenser
    // (Beholdt fra MVP, men med opdaterede prereqs)
    // ------------------------
    {
      id: "N1.5.1",
      title: "Subtraktion (capstone)",
      description: "Blandet subtraktion (med og uden lån).",
      prereqs: ["S2.3"],
      blueprints: ["N1.5-SUB"],
      default_level: 2,
      adaptive: true,
    },
    {
      id: "N1.7.1",
      title: "Multiplikation (capstone)",
      description: "Blandet multiplikation (fra tabel til flercifret).",
      prereqs: ["M4.1"],
      blueprints: ["N1.7-MUL"],
      default_level: 2,
      adaptive: true,
    },
    {
      id: "N1.18.1",
      title: "Division uden rest (capstone)",
      description: "Lang division uden rest.",
      prereqs: ["D2.1"],
      blueprints: ["N1.18-F3-LONGDIV-NOREM"],
      default_level: 2,
      adaptive: true,
    },
    {
      id: "N1.18.2",
      title: "Division med rest (capstone)",
      description: "Division med kvotient og rest (positive tal).",
      prereqs: ["D2.2"],
      blueprints: ["N1.18-DIV-REM"],
      default_level: 2,
      adaptive: true,
    },
    {
      id: "Z2.1",
      title: "Negative tal: plus og minus",
      description: "Regn med negative tal i addition og subtraktion.",
      prereqs: ["N1.5.1"],
      blueprints: ["Z2-ADD-SUB"],
      default_level: 2,
      adaptive: true,
    },
    {
      id: "Z2.2",
      title: "Negative tal: gange og dividér",
      description: "Regn med negative tal i multiplikation og division (ingen rest).",
      prereqs: ["Z2.1", "N1.18.1"],
      blueprints: ["Z2-MUL-DIV"],
      default_level: 2,
      adaptive: true,
    },
    {
      id: "Z4.1",
      title: "Regnehierarki og parenteser",
      description: "Regn udtryk med gange/division før plus/minus og med parenteser.",
      prereqs: ["Z2.2"],
      blueprints: ["Z4-ORDER"],
      default_level: 2,
      adaptive: true,
    },
    {
      id: "N1.9.1",
      title: "Manglende led (capstone)",
      description: "Find det manglende tal i en simpel ligning.",
      prereqs: ["E0.3"],
      blueprints: ["N1.9-MISSING"],
      default_level: 2,
      adaptive: true,
    },
    {
      id: "P1.1",
      title: "Potenser",
      description: "Beregn potenser (inkl. negative baser).",
      prereqs: ["N1.7.1", "Z2.1"],
      blueprints: ["P1-POW"],
      default_level: 2,
      adaptive: true,
    },
  ],
};

// ------------------------
// GROUPING LAYER (UI)
// ------------------------
// This layer does NOT modify nodes/prereqs. It only groups existing node ids
// into paths/levels for rendering learning paths on HomePage/GroupPage.

export type SkillGroup = {
  name: string;
  children?: SkillGroup[];
  /** Leaf nodes (skill node ids). Prefer ids only to avoid duplicating titles. */
  nodes?: string[];
};

// NOTE: Keep this structure in sync with your curriculum ordering.
// Levels are represented as groups named "Level 1", "Level 2", ... with a `nodes` list.
export const SKILL_GROUPS: SkillGroup[] = [
  {
    name: "Fundament",
    children: [
      {
        name: "Talrækker",
        children: [
          { name: "Level 1", nodes: ["T0.1", "T0.1b", "T0.1c"] },
          { name: "Level 2", nodes: ["T0.2"] },
          { name: "Level 3", nodes: ["T0.2b", "T0.2c"] },
        ],
      },
      {
        name: "Positionssystem",
        children: [
          { name: "Level 1", nodes: ["T1.1", "T1.2"] },
          { name: "Level 2", nodes: ["T1.3"] },
        ],
      },
      {
        name: "Sammenligning og overslag",
        children: [
          { name: "Level 1", nodes: ["T2.1", "T2.2", "T3.1"] },
          { name: "Level 2", nodes: ["T3.2"] },
        ],
      },
      {
        name: "Tallinje og negative (repræsentation)",
        children: [
          { name: "Level 1", nodes: ["T4.1"] },
          { name: "Level 2", nodes: ["T4.1b", "T4.1c"] },
          { name: "Level 3", nodes: ["T4.1d"] },
        ],
      },
      {
        name: "Lighedstegn og manglende led",
        children: [
          { name: "Level 1", nodes: ["E0.1", "E0.2", "E0.3"] },
          { name: "Level 2", nodes: ["E1.1"] },
        ],
      },
      {
        name: "Decimaltal (fundament)",
        children: [
          { name: "Level 1", nodes: ["T10.1"] },
          { name: "Level 2", nodes: ["T10.2"] },
          { name: "Level 3", nodes: ["T10.3"] },
        ],
      },
    ],
  },

  {
    name: "Addition",
    children: [
      {
        name: "Tidlig addition (strategier)",
        children: [
          { name: "Level 1", nodes: ["A0.1", "A0.2"] },
          { name: "Level 2", nodes: ["A0.3", "A0.4", "A0.5"] },
        ],
      },
      {
        name: "Inden for 20",
        children: [
          { name: "Level 1", nodes: ["A1.1"] },
          { name: "Level 2", nodes: ["A1.2", "A1.3"] },
          { name: "Level 3", nodes: ["A1.4", "A1.5"] },
        ],
      },
      {
        name: "Inden for 100 (mentale strategier)",
        children: [
          {
            name: "Level 1",
            nodes: ["A2.1.1", "A2.1.2", "A2.1.3", "A2.1.4"],
          },
          { name: "Level 2", nodes: ["A2.2", "A2.3"] },
          { name: "Level 3", nodes: ["A2.4", "A2.5", "A2.6"] },
        ],
      },
      {
        name: "Kolonneaddition (2 cifre)",
        children: [
          { name: "Level 1", nodes: ["A3.1"] },
          { name: "Level 2", nodes: ["A3.2", "A3.4"] },
          { name: "Level 3", nodes: ["A3.3"] },
        ],
      },
      {
        name: "3-cifrede og flerled",
        children: [
          { name: "Level 1", nodes: ["A4.1"] },
          { name: "Level 2", nodes: ["A4.2", "A4.3", "A4.4"] },
          { name: "Level 3", nodes: ["A4.5", "A4.6"] },
        ],
      },
      {
        name: "Store tal",
        children: [
          { name: "Level 1", nodes: ["A5.1"] },
          { name: "Level 2", nodes: ["A5.2", "A5.3", "A5.4"] },
          { name: "Level 3", nodes: ["A6.1", "A6.2"] },
        ],
      },
      {
        name: "Udtryk og negative tal",
        children: [
          { name: "Level 1", nodes: ["A7.1"] },
          { name: "Level 2", nodes: ["A7.2"] },
          { name: "Level 3", nodes: ["A8.1", "A8.2"] },
        ],
      },
      {
        name: "Parenteser",
        children: [
          { name: "Level 1", nodes: ["A9.1"] },
          { name: "Level 2", nodes: ["A9.2"] },
          { name: "Level 3", nodes: ["A10.1", "A10.2"] },
        ],
      },
      {
        name: "Addition med decimaltal",
        children: [
          { name: "Level 1", nodes: ["A11.1"] },
          { name: "Level 2", nodes: ["A11.2"] },
        ],
      },
    ],
  },

  {
    name: "Subtraktion",
    children: [
      {
        name: "Facts og strategier",
        children: [
          { name: "Level 1", nodes: ["S0.1", "S0.2"] },
          { name: "Level 2", nodes: ["S0.3"] },
        ],
      },
      {
        name: "2-cifrede subtraktioner",
        children: [
          { name: "Level 1", nodes: ["S1.1", "S1.3"] },
          { name: "Level 2", nodes: ["S1.2", "S1.4"] },
        ],
      },
      {
        name: "3-cifrede subtraktioner",
        children: [
          { name: "Level 1", nodes: ["S2.1"] },
          { name: "Level 2", nodes: ["S2.2"] },
          { name: "Level 3", nodes: ["S2.3"] },
        ],
      },
      {
        name: "Tekstopgaver",
        children: [{ name: "Level 2", nodes: ["S-WP.1"] }],
      },
      {
        name: "Subtraktion med decimaltal",
        children: [
          { name: "Level 1", nodes: ["S11.1"] },
          { name: "Level 2", nodes: ["S11.2"] },
        ],
      },
    ],
  },

  {
    name: "Multiplikation",
    children: [
      {
        name: "Begrebsforståelse",
        children: [{ name: "Level 1", nodes: ["M0.1", "M0.2"] }],
      },
      {
        name: "Tabeller og 10/100/1000",
        children: [
          { name: "Level 1", nodes: ["M1.1"] },
          { name: "Level 2", nodes: ["M1.2"] },
        ],
      },
      {
        name: "Arealmetoden (flercifret)",
        children: [
          { name: "Level 1", nodes: ["M2.1"] },
          { name: "Level 2", nodes: ["M2.2"] },
          { name: "Level 3", nodes: ["M2.3"] },
        ],
      },
      {
        name: "Standardalgoritme (kolonne-gange)",
        children: [
          { name: "Level 1", nodes: ["M3.1"] },
          { name: "Level 2", nodes: ["M3.2"] },
        ],
      },
      {
        name: "Multiplikation med decimaltal",
        children: [
          { name: "Level 1", nodes: ["M11.1"] },
          { name: "Level 2", nodes: ["M11.2"] },
        ],
      },
    ],
  },

  {
    name: "Division",
    children: [
      {
        name: "Begrebsforståelse",
        children: [{ name: "Level 1", nodes: ["D0.1", "D0.2"] }],
      },
      {
        name: "Dele og rest",
        children: [
          { name: "Level 1", nodes: ["D1.1"] },
          { name: "Level 2", nodes: ["D1.2"] },
        ],
      },
      {
        name: "Lang division (standardalgoritme)",
        children: [
          { name: "Level 1", nodes: ["D2.1"] },
          { name: "Level 2", nodes: ["D2.2"] },
        ],
      },
      {
        name: "Division med decimaltal",
        children: [
          { name: "Level 1", nodes: ["D11.1"] },
          { name: "Level 2", nodes: ["D11.2"] },
        ],
      },
    ],
  },
];

/** Find a group by a path of names, e.g. ["Addition", "Inden for 20"]. */
export function findGroupByPath(groups: SkillGroup[], path: string[]): SkillGroup | null {
  if (path.length === 0) return null;
  let curList: SkillGroup[] = groups;
  let cur: SkillGroup | undefined;
  for (const seg of path) {
    cur = curList.find((g) => g.name === seg);
    if (!cur) return null;
    curList = cur.children ?? [];
  }
  return cur ?? null;
}

/**
 * Collect node ids in a stable curriculum order (depth-first, preserving array order).
 * GroupPage uses this to compute Option B gating ("current" node).
 */
export function collectNodesInOrder(group: SkillGroup): string[] {
  const out: string[] = [];
  const walk = (g: SkillGroup) => {
    if (g.nodes && g.nodes.length) out.push(...g.nodes);
    (g.children ?? []).forEach(walk);
  };
  walk(group);
  return out;
}

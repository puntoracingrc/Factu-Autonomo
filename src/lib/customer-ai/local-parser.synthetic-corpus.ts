export type SyntheticCustomerCorpusCase = {
  id: string;
  input: string;
  expected: {
    customerType: "person" | "company";
    firstName: string;
    lastName: string;
    nif: string;
    email: string;
    phone: string;
    address: string;
    postalCode: string;
  };
};

type SyntheticProfile = SyntheticCustomerCorpusCase["expected"] & {
  id: string;
  fullName: string;
  cityInput: string;
  labels: {
    name: string;
    taxId: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
  };
  addressInput: string;
};

const PROFILES: readonly SyntheticProfile[] = [
  {
    id: "castellano-madrid",
    fullName: "Taller Horizonte SL",
    customerType: "company",
    firstName: "Taller Horizonte SL",
    lastName: "",
    nif: "B12345678",
    email: "horizonte@example.test",
    phone: "600111222",
    addressInput: "C/ Mayor 12, Local",
    address: "Mayor 12",
    postalCode: "28013",
    cityInput: "Madird",
    labels: {
      name: "empresa",
      taxId: "NIF",
      email: "correo electrónico",
      phone: "teléfono",
      address: "dirección",
      city: "ciudad",
      postalCode: "código postal",
    },
  },
  {
    id: "catala-barcelona",
    fullName: "Fusteria Delta SL",
    customerType: "company",
    firstName: "Fusteria Delta SL",
    lastName: "",
    nif: "B23456789",
    email: "delta@example.test",
    phone: "611222333",
    addressInput: "Carrer de Mallorca 24, 2n 1a",
    address: "Mallorca 24",
    postalCode: "08013",
    cityInput: "Barna",
    labels: {
      name: "raó social",
      taxId: "NIF",
      email: "correu electrònic",
      phone: "telèfon",
      address: "adreça",
      city: "ciutat",
      postalCode: "codi postal",
    },
  },
  {
    id: "valencia-valencia",
    fullName: "Nuria Proves Ferrer",
    customerType: "person",
    firstName: "Nuria",
    lastName: "Proves Ferrer",
    nif: "00000000T",
    email: "nuria@example.test",
    phone: "622333444",
    addressInput: "Avinguda del Port 44, 3r",
    address: "Port 44",
    postalCode: "46001",
    cityInput: "Valenca",
    labels: {
      name: "nom",
      taxId: "NIF",
      email: "correu electrònic",
      phone: "mòbil",
      address: "adreça",
      city: "població",
      postalCode: "codi postal",
    },
  },
  {
    id: "galego-santiago",
    fullName: "Xoana Probas Castro",
    customerType: "person",
    firstName: "Xoana",
    lastName: "Probas Castro",
    nif: "00000000T",
    email: "xoana@example.test",
    phone: "633444555",
    addressInput: "Rúa do Hórreo 12, 1º",
    address: "Hórreo 12",
    postalCode: "15701",
    cityInput: "Santiago de Compostela",
    labels: {
      name: "nome",
      taxId: "NIF",
      email: "enderezo electrónico",
      phone: "teléfono",
      address: "enderezo",
      city: "cidade",
      postalCode: "código postal",
    },
  },
  {
    id: "euskara-bilbao",
    fullName: "Itsasargi Proba SL",
    customerType: "company",
    firstName: "Itsasargi Proba SL",
    lastName: "",
    nif: "B34567890",
    email: "itsasargi@example.test",
    phone: "644555666",
    addressInput: "Ercilla Kalea 14, 2. esk.",
    address: "Ercilla 14",
    postalCode: "48009",
    cityInput: "Bilbo",
    labels: {
      name: "enpresaren izena",
      taxId: "IFZ",
      email: "helbide elektronikoa",
      phone: "mugikorra",
      address: "helbidea",
      city: "hiria",
      postalCode: "posta kodea",
    },
  },
  {
    id: "euskara-donostia",
    fullName: "Ane Proba Etxeberria",
    customerType: "person",
    firstName: "Ane",
    lastName: "Proba Etxeberria",
    nif: "00000000T",
    email: "ane@example.test",
    phone: "655666777",
    addressInput: "Nafarroa Etorbidea 2, 4. ezk.",
    address: "Nafarroa 2",
    postalCode: "20001",
    cityInput: "Donosti",
    labels: {
      name: "izena",
      taxId: "IFZ",
      email: "posta elektronikoa",
      phone: "telefono mugikorra",
      address: "helbide",
      city: "udalerria",
      postalCode: "posta kodea",
    },
  },
  {
    id: "balears-palma",
    fullName: "Taller Tramuntana SL",
    customerType: "company",
    firstName: "Taller Tramuntana SL",
    lastName: "",
    nif: "B45678901",
    email: "tramuntana@example.test",
    phone: "666777888",
    addressInput: "Passeig des Born 5, baixos",
    address: "Born 5",
    postalCode: "07001",
    cityInput: "Palma de Mallorca",
    labels: {
      name: "empresa",
      taxId: "NIF",
      email: "correu electrònic",
      phone: "telèfon",
      address: "domicili",
      city: "municipi",
      postalCode: "codi postal",
    },
  },
  {
    id: "canarias-tenerife",
    fullName: "Servicios Teide SL",
    customerType: "company",
    firstName: "Servicios Teide SL",
    lastName: "",
    nif: "B56789012",
    email: "teide@example.test",
    phone: "677888999",
    addressInput: "Calle Castillo 7, oficina B",
    address: "Castillo 7",
    postalCode: "38001",
    cityInput: "Santa Cruz de Tenerife",
    labels: {
      name: "razón social",
      taxId: "CIF",
      email: "email",
      phone: "tlf",
      address: "domicilio fiscal",
      city: "localidad",
      postalCode: "CP",
    },
  },
  {
    id: "ceuta",
    fullName: "Comercio Estrecho SL",
    customerType: "company",
    firstName: "Comercio Estrecho SL",
    lastName: "",
    nif: "B67890123",
    email: "estrecho@example.test",
    phone: "688999111",
    addressInput: "Avenida de África 9, Local",
    address: "África 9",
    postalCode: "51001",
    cityInput: "Ceuta",
    labels: {
      name: "cliente",
      taxId: "CIF",
      email: "correo",
      phone: "móvil",
      address: "dirección",
      city: "población",
      postalCode: "CP",
    },
  },
  {
    id: "melilla",
    fullName: "Levante Ensayo SL",
    customerType: "company",
    firstName: "Levante Ensayo SL",
    lastName: "",
    nif: "B78901234",
    email: "levante@example.test",
    phone: "699111222",
    addressInput: "Calle O'Donnell 18, Local 2",
    address: "O'Donnell 18",
    postalCode: "52001",
    cityInput: "Melilla",
    labels: {
      name: "empresa",
      taxId: "NIF",
      email: "e-mail",
      phone: "tel",
      address: "domicilio",
      city: "municipio",
      postalCode: "código postal",
    },
  },
  {
    id: "asturianu-oviedo",
    fullName: "Noelia Prueba Suarez",
    customerType: "person",
    firstName: "Noelia",
    lastName: "Prueba Suarez",
    nif: "00000000T",
    email: "noelia@example.test",
    phone: "711222333",
    addressInput: "Cai Uría 10, 5º",
    address: "Uría 10",
    postalCode: "33001",
    cityInput: "Uvieu",
    labels: {
      name: "nome",
      taxId: "NIF",
      email: "corréu electrónicu",
      phone: "teléfonu",
      address: "direición",
      city: "ciudá",
      postalCode: "códigu postal",
    },
  },
  {
    id: "aranes-vielha",
    fullName: "Comerc Aran Prova SL",
    customerType: "company",
    firstName: "Comerc Aran Prova SL",
    lastName: "",
    nif: "B89012345",
    email: "aran@example.test",
    phone: "733444555",
    addressInput: "Carrèr Major 4, baish",
    address: "Major 4",
    postalCode: "25530",
    cityInput: "Vielha e Mijaran",
    labels: {
      name: "empresa",
      taxId: "NIF",
      email: "corrèu electronic",
      phone: "telefòn",
      address: "adreça",
      city: "municipi",
      postalCode: "còdi postal",
    },
  },
  {
    id: "aragones-zaragoza",
    fullName: "Taller Pirineu Proba SL",
    customerType: "company",
    firstName: "Taller Pirineu Proba SL",
    lastName: "",
    nif: "B90123456",
    email: "pirineu@example.test",
    phone: "744555666",
    addressInput: "Carrera d'a Independencia 6, local",
    address: "d'a Independencia 6",
    postalCode: "50001",
    cityInput: "Zaragoza",
    labels: {
      name: "interpresa",
      taxId: "NIF",
      email: "correu electronico",
      phone: "telefono",
      address: "adreza",
      city: "ziudat",
      postalCode: "codigo postal",
    },
  },
  {
    id: "navarra-iruna",
    fullName: "Miren Proba Garate",
    customerType: "person",
    firstName: "Miren",
    lastName: "Proba Garate",
    nif: "00000000T",
    email: "miren@example.test",
    phone: "722333444",
    addressInput: "Karrika Nagusia 3, 2. eskuina",
    address: "Nagusia 3",
    postalCode: "31001",
    cityInput: "Iruña",
    labels: {
      name: "izena",
      taxId: "IFZ",
      email: "helbide elektronikoa",
      phone: "telefonoa",
      address: "helbidea",
      city: "herria",
      postalCode: "posta kodea",
    },
  },
];

function expected(profile: SyntheticProfile): SyntheticCustomerCorpusCase["expected"] {
  return {
    customerType: profile.customerType,
    firstName: profile.firstName,
    lastName: profile.lastName,
    nif: profile.nif,
    email: profile.email,
    phone: profile.phone,
    address: profile.address,
    postalCode: profile.postalCode,
  };
}

function casesForProfile(profile: SyntheticProfile): SyntheticCustomerCorpusCase[] {
  const { labels } = profile;
  const variants = [
    {
      id: "multilinea",
      input: [
        `${labels.name}: ${profile.fullName}`,
        `${labels.taxId}: ${profile.nif}`,
        `${labels.email}: ${profile.email}`,
        `${labels.phone}: ${profile.phone}`,
        `${labels.address}: ${profile.addressInput}`,
        `${labels.postalCode}: ${profile.postalCode}`,
        `${labels.city}: ${profile.cityInput}`,
      ].join("\n"),
    },
    {
      id: "frase-natural",
      input:
        `Te paso los datos, la ${labels.name} es ${profile.fullName} y el ${labels.taxId} es ${profile.nif}, ` +
        `${labels.email}: ${profile.email} y ${labels.phone}: ${profile.phone}; ` +
        `vive en ${profile.addressInput}, ${profile.postalCode} ${profile.cityInput}`,
    },
    {
      id: "tuberias-reordenado",
      input: [
        `${labels.phone}=${profile.phone}`,
        `${labels.postalCode}=${profile.postalCode}`,
        `${labels.city}=${profile.cityInput}`,
        `${labels.name}=${profile.fullName}`,
        `${labels.address}=${profile.addressInput}`,
        `${labels.taxId}=${profile.nif}`,
        `${labels.email}=${profile.email}`,
      ].join(" | "),
    },
    {
      id: "erratas-etiquetas",
      input: [
        `clietne: ${profile.fullName}`,
        `nfi: ${profile.nif}`,
        `emial: ${profile.email}`,
        `telofono: ${profile.phone}`,
        `dirrecion: ${profile.addressInput}`,
        `codgio postal: ${profile.postalCode}`,
        `cuidad: ${profile.cityInput}`,
      ].join(" // "),
    },
    {
      id: "sin-etiquetas",
      input: [
        profile.fullName,
        profile.email,
        profile.phone,
        profile.addressInput,
        `${profile.postalCode} ${profile.cityInput}`,
        profile.nif,
      ].join("\n"),
    },
    {
      id: "mensaje-contable",
      input:
        `Apunta, empresa ${profile.fullName}, CIF ${profile.nif}, correo ${profile.email} y tlf ${profile.phone}; ` +
        `domicilio ${profile.addressInput}, ${profile.postalCode} ${profile.cityInput}`,
    },
  ];

  return variants.map((variant) => ({
    id: `${profile.id}-${variant.id}`,
    input: variant.input,
    expected: expected(profile),
  }));
}

export const SYNTHETIC_CUSTOMER_RESOLVABLE_CORPUS: readonly SyntheticCustomerCorpusCase[] =
  PROFILES.flatMap(casesForProfile);

export const SYNTHETIC_CUSTOMER_REVIEW_CORPUS = [
  {
    id: "sin-identidad",
    input: "NIF 00000000T; telefono 600111222; 28013 Madrid",
    expected: "null",
  },
  {
    id: "dos-clientes",
    input:
      "cliente: Taller Uno SL; cliente: Taller Dos SL; CIF B12345678; C/ Mayor 1; 28013 Madrid",
    expected: "null",
  },
  {
    id: "dos-nif",
    input:
      "cliente: Taller Doble SL; CIF B12345678; CIF B23456789; C/ Mayor 1; 28013 Madrid",
    expected: "null",
  },
  {
    id: "dos-correos",
    input:
      "cliente: Taller Correos SL; correo uno@example.test; correo dos@example.test; CIF B12345678",
    expected: "null",
  },
  {
    id: "dos-telefonos",
    input:
      "cliente: Taller Telefonos SL; tlf 600111222; tlf 611222333; CIF B12345678",
    expected: "null",
  },
  {
    id: "municipio-ambiguo-sin-cp",
    input: "cliente: Taller Arroyos SL; CIF B12345678; ciudad: Arroyomolinos",
    expected: "raw-city",
  },
  {
    id: "cp-localidad-en-conflicto",
    input: "cliente: Taller Cruce SL; CIF B12345678; ciudad: Madrid; CP 08001",
    expected: "conflict-warning",
  },
  {
    id: "errata-geografica-no-segura",
    input: "cliente: Taller Cruce SL; CIF B12345678; ciudad: Madriz; CP 08001",
    expected: "raw-city",
  },
  {
    id: "texto-sin-datos",
    input: "Me han dicho que luego me pasan los datos completos del cliente.",
    expected: "null",
  },
  {
    id: "solo-direccion",
    input: "Calle Mayor 1, 28013 Madrid",
    expected: "null",
  },
  {
    id: "nif-invalido-no-inventado",
    input: "cliente: Persona Sintetica; NIF 1234; C/ Mayor 1; 28013 Madrid",
    expected: "missing-nif-warning",
  },
  {
    id: "cp-imposible-no-inventado",
    input: "cliente: Taller Imposible SL; CIF B12345678; C/ Mayor 1; CP 99999",
    expected: "missing-postal-code",
  },
] as const;

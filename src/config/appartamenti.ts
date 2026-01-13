export const appartamentiConfig = [
  {
    id: 1,
    nome: 'Appartamento 1',
    slug: 'appartamento-1',
    postiLetto: 6,
    camere: 2,
    bagni: 1,
    piano: 'Piano terra',
    airbnbId: '1203aboribo',
    colore: '#3B82F6', // blue-500
    dotazioni: ['Cucina completa', 'Aria condizionata', 'TV', 'WiFi', 'Lavatrice', 'Veranda attrezzata', 'Sdraio', 'Doccia esterna', 'Barbecue', 'Parcheggio privato'],
    descrizione: 'Appartamento al piano terra con ampia veranda attrezzata, sdraio, docce esterne e barbecue. Ideale per famiglie con bambini.',
    vistaMare: false,
    letti: {
      camera1: { tipo: 'Camera matrimoniale + castello', matrimoniali: 1, castello: 1, singoli: 0, descrizione: '1 letto matrimoniale + 1 letto a castello (2 posti)' },
      camera2: { tipo: 'Camera matrimoniale', matrimoniali: 1, castello: 0, singoli: 0, descrizione: '1 letto matrimoniale' },
    },
    lettiDescrizione: '2 camere: una con letto matrimoniale + castello, una con letto matrimoniale',
    idealePerFamiglie: '2 coppie con 2 bambini, oppure 1 famiglia numerosa (genitori + 4 figli)',
  },
  {
    id: 2,
    nome: 'Appartamento 2',
    slug: 'appartamento-2',
    postiLetto: 8, // CORRETTO da 7 a 8
    camere: 3, // CORRETTO: 2 camere + 1 cameretta
    bagni: 1,
    piano: 'Primo piano',
    airbnbId: '1203aborme',
    colore: '#10B981', // emerald-500
    dotazioni: ['Cucina completa', 'Aria condizionata', 'TV', 'WiFi', 'Lavatrice', 'Ampio terrazzo', 'Vista mare', 'Parcheggio privato'],
    descrizione: 'Appartamento spazioso al primo piano con ampio terrazzo e splendida vista mare. Il più grande della struttura, ideale per gruppi numerosi.',
    vistaMare: true,
    letti: {
      camera1: { tipo: 'Camera matrimoniale + singolo', matrimoniali: 1, castello: 0, singoli: 1, descrizione: '1 letto matrimoniale + 1 letto singolo' },
      camera2: { tipo: 'Camera matrimoniale + singolo', matrimoniali: 1, castello: 0, singoli: 1, descrizione: '1 letto matrimoniale + 1 letto singolo' },
      cameretta: { tipo: 'Cameretta con castello', matrimoniali: 0, castello: 1, singoli: 0, descrizione: '1 letto a castello (2 posti)' },
    },
    lettiDescrizione: '2 camere con matrimoniale + singolo ciascuna, 1 cameretta con letto a castello',
    idealePerFamiglie: '2 famiglie (genitori + figli), oppure gruppo di 8 persone',
  },
  {
    id: 3,
    nome: 'Appartamento 3',
    slug: 'appartamento-3',
    postiLetto: 4,
    camere: 1,
    bagni: 1,
    piano: 'Secondo piano',
    airbnbId: '1203aborna',
    colore: '#F59E0B', // amber-500
    dotazioni: ['Angolo cottura', 'Aria condizionata', 'TV', 'WiFi', 'Zanzariere', 'Ampio terrazzo', 'Vista mare', 'Parcheggio privato'],
    descrizione: 'Appartamento accogliente al secondo piano con ampio terrazzo e splendida vista mare. WiFi in tutta la casa e terrazza.',
    vistaMare: true,
    letti: {
      camera1: { tipo: 'Camera matrimoniale + castello', matrimoniali: 1, castello: 1, singoli: 0, descrizione: '1 letto matrimoniale + 1 letto a castello (2 posti)' },
    },
    lettiDescrizione: '1 camera con letto matrimoniale + letto a castello',
    idealePerFamiglie: '1 coppia con 2 bambini, oppure 2 coppie',
  },
  {
    id: 4,
    nome: 'Appartamento 4',
    slug: 'appartamento-4',
    postiLetto: 5, // CORRETTO da 6 a 5
    camere: 2,
    bagni: 1,
    piano: 'Secondo piano',
    airbnbId: '1203abornb',
    colore: '#EF4444', // red-500
    dotazioni: ['Cucina completa', 'Aria condizionata', 'TV', 'WiFi', 'Lavatrice', 'Ampia veranda', 'Parcheggio privato'],
    descrizione: 'Appartamento al secondo piano con ampia veranda attrezzata con tavolo e sedie.',
    vistaMare: false,
    letti: {
      camera1: { tipo: 'Camera matrimoniale', matrimoniali: 1, castello: 0, singoli: 0, descrizione: '1 letto matrimoniale' },
      camera2: { tipo: 'Camera tripla', matrimoniali: 0, castello: 0, singoli: 3, descrizione: '3 letti singoli' },
    },
    lettiDescrizione: '1 camera matrimoniale + 1 camera tripla (3 singoli)',
    idealePerFamiglie: '1 coppia con 3 figli, oppure gruppo di 5 amici',
  },
]

// Settimane sabato-sabato con prezzi per appartamento
// Struttura: { settimana, dataInizio (sabato), dataFine (sabato), prezzi per app }
export function getSettimanePerAnno(anno: number) {
  // Calcola i sabati della stagione (da fine maggio a inizio novembre)
  const settimane = [
    // Bassa stagione - Maggio/Giugno
    { num: 1, inizio: `${anno}-05-30`, fine: `${anno}-06-06`, periodo: 'Bassa', prezzi: { 1: 400, 2: 650, 3: 350, 4: 375 } },
    { num: 2, inizio: `${anno}-06-06`, fine: `${anno}-06-13`, periodo: 'Bassa', prezzi: { 1: 400, 2: 650, 3: 350, 4: 375 } },
    { num: 3, inizio: `${anno}-06-13`, fine: `${anno}-06-20`, periodo: 'Bassa', prezzi: { 1: 400, 2: 650, 3: 350, 4: 375 } },
    { num: 4, inizio: `${anno}-06-20`, fine: `${anno}-06-27`, periodo: 'Bassa', prezzi: { 1: 400, 2: 650, 3: 350, 4: 375 } },
    { num: 5, inizio: `${anno}-06-27`, fine: `${anno}-07-04`, periodo: 'Bassa', prezzi: { 1: 400, 2: 650, 3: 350, 4: 375 } },
    { num: 6, inizio: `${anno}-07-04`, fine: `${anno}-07-11`, periodo: 'Bassa', prezzi: { 1: 400, 2: 650, 3: 350, 4: 375 } },
    // Media stagione - Luglio
    { num: 7, inizio: `${anno}-07-11`, fine: `${anno}-07-18`, periodo: 'Media', prezzi: { 1: 550, 2: 750, 3: 500, 4: 525 } },
    { num: 8, inizio: `${anno}-07-18`, fine: `${anno}-07-25`, periodo: 'Media', prezzi: { 1: 550, 2: 750, 3: 500, 4: 525 } },
    { num: 9, inizio: `${anno}-07-25`, fine: `${anno}-08-01`, periodo: 'Media', prezzi: { 1: 550, 2: 750, 3: 500, 4: 525 } },
    // Altissima stagione - Agosto (incluso pre-Ferragosto)
    { num: 10, inizio: `${anno}-08-01`, fine: `${anno}-08-08`, periodo: 'Altissima', prezzi: { 1: 900, 2: 1200, 3: 850, 4: 850 } },
    { num: 11, inizio: `${anno}-08-08`, fine: `${anno}-08-15`, periodo: 'Altissima', prezzi: { 1: 900, 2: 1200, 3: 850, 4: 850 } },
    // Altissima stagione - Ferragosto
    { num: 12, inizio: `${anno}-08-15`, fine: `${anno}-08-22`, periodo: 'Altissima', prezzi: { 1: 900, 2: 1200, 3: 850, 4: 850 } },
    // Post-Ferragosto (transizione graduale)
    { num: 13, inizio: `${anno}-08-22`, fine: `${anno}-08-29`, periodo: 'Alta', prezzi: { 1: 750, 2: 900, 3: 650, 4: 700 } },
    { num: 14, inizio: `${anno}-08-29`, fine: `${anno}-09-05`, periodo: 'Media', prezzi: { 1: 550, 2: 750, 3: 500, 4: 525 } },
    { num: 15, inizio: `${anno}-09-05`, fine: `${anno}-09-12`, periodo: 'Media', prezzi: { 1: 550, 2: 750, 3: 500, 4: 525 } },
    // Bassa stagione - Settembre/Ottobre
    { num: 16, inizio: `${anno}-09-12`, fine: `${anno}-09-19`, periodo: 'Bassa', prezzi: { 1: 400, 2: 650, 3: 350, 4: 375 } },
    { num: 17, inizio: `${anno}-09-19`, fine: `${anno}-09-26`, periodo: 'Bassa', prezzi: { 1: 400, 2: 650, 3: 350, 4: 375 } },
    { num: 18, inizio: `${anno}-09-26`, fine: `${anno}-10-03`, periodo: 'Bassa', prezzi: { 1: 400, 2: 650, 3: 350, 4: 375 } },
    { num: 19, inizio: `${anno}-10-03`, fine: `${anno}-10-10`, periodo: 'Bassa', prezzi: { 1: 400, 2: 650, 3: 350, 4: 375 } },
    { num: 20, inizio: `${anno}-10-10`, fine: `${anno}-10-17`, periodo: 'Bassa', prezzi: { 1: 400, 2: 650, 3: 350, 4: 375 } },
    { num: 21, inizio: `${anno}-10-17`, fine: `${anno}-10-24`, periodo: 'Bassa', prezzi: { 1: 400, 2: 650, 3: 350, 4: 375 } },
    { num: 22, inizio: `${anno}-10-24`, fine: `${anno}-10-31`, periodo: 'Bassa', prezzi: { 1: 400, 2: 650, 3: 350, 4: 375 } },
    { num: 23, inizio: `${anno}-10-31`, fine: `${anno}-11-07`, periodo: 'Bassa', prezzi: { 1: 400, 2: 650, 3: 350, 4: 375 } },
  ]
  return settimane
}

// Funzione per trovare il prezzo di una settimana specifica
export function getPrezzoSettimana(anno: number, dataCheckIn: string, appartamentoId: number): number {
  const settimane = getSettimanePerAnno(anno)
  const checkIn = new Date(dataCheckIn)

  for (const sett of settimane) {
    const inizio = new Date(sett.inizio)
    const fine = new Date(sett.fine)
    if (checkIn >= inizio && checkIn < fine) {
      return sett.prezzi[appartamentoId as keyof typeof sett.prezzi] || 0
    }
  }

  // Se fuori stagione, usa prezzo bassa stagione
  const prezziBassa: Record<number, number> = { 1: 400, 2: 500, 3: 350, 4: 375 }
  return prezziBassa[appartamentoId] || 0
}

// Funzione per calcolare prezzo totale soggiorno (gestisce settimane multiple e a cavallo)
export function calcolaPrezzoSoggiorno(
  anno: number,
  dataCheckIn: string,
  dataCheckOut: string,
  appartamentoId: number
): { prezzoTotale: number; settimane: number; dettaglio: Array<{ settimana: number; periodo: string; prezzo: number }> } {
  const settimaneConfig = getSettimanePerAnno(anno)
  const checkIn = new Date(dataCheckIn)
  const checkOut = new Date(dataCheckOut)

  // Calcola notti e arrotonda per eccesso a settimane
  const notti = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  const numSettimane = Math.ceil(notti / 7)

  const dettaglio: Array<{ settimana: number; periodo: string; prezzo: number }> = []
  let prezzoTotale = 0
  const dataCorrente = new Date(checkIn)

  for (let i = 0; i < numSettimane; i++) {
    // Trova la settimana per la data corrente
    const settTrovata = settimaneConfig.find(sett => {
      const inizio = new Date(sett.inizio)
      const fine = new Date(sett.fine)
      return dataCorrente >= inizio && dataCorrente < fine
    })

    if (settTrovata) {
      const prezzo = settTrovata.prezzi[appartamentoId as keyof typeof settTrovata.prezzi] || 0
      dettaglio.push({
        settimana: settTrovata.num,
        periodo: settTrovata.periodo,
        prezzo
      })
      prezzoTotale += prezzo
    } else {
      // Fuori stagione
      const prezzoBassa: Record<number, number> = { 1: 400, 2: 500, 3: 350, 4: 375 }
      const prezzo = prezzoBassa[appartamentoId] || 0
      dettaglio.push({
        settimana: 0,
        periodo: 'Fuori stagione',
        prezzo
      })
      prezzoTotale += prezzo
    }

    // Avanza di 7 giorni
    dataCorrente.setDate(dataCorrente.getDate() + 7)
  }

  return { prezzoTotale, settimane: numSettimane, dettaglio }
}

// LEGACY: Mantieni per retrocompatibilità con il vecchio sistema
export function getPrezziPerAnno(anno: number) {
  return {
    periodi: [
      { nome: 'Bassa', dataInizio: `${anno}-05-30`, dataFine: `${anno}-07-11` },
      { nome: 'Media', dataInizio: `${anno}-07-11`, dataFine: `${anno}-08-01` },
      { nome: 'Altissima', dataInizio: `${anno}-08-01`, dataFine: `${anno}-08-22` },
      { nome: 'Media-Alta', dataInizio: `${anno}-08-22`, dataFine: `${anno}-08-29` },
      { nome: 'Media', dataInizio: `${anno}-08-29`, dataFine: `${anno}-09-12` },
      { nome: 'Bassa', dataInizio: `${anno}-09-12`, dataFine: `${anno}-11-07` },
    ],
    prezzi: {
      1: [400, 500, 850, 650, 500, 400],
      2: [500, 600, 1000, 750, 600, 500],
      3: [350, 450, 750, 550, 400, 350],
      4: [375, 475, 800, 600, 450, 375],
    } as Record<number, number[]>,
  }
}

// Per retrocompatibilità
export const prezziConfig = getPrezziPerAnno(new Date().getFullYear())

export const costiExtra = {
  biancheria: 10, // per persona
  tassaSoggiorno: 1, // per adulto per notte (12-70 anni)
  cauzioneDefault: 200,
  accontoPercentuale: 30,
}

// Informazioni sulla struttura
export const strutturaInfo = {
  nome: 'Villa MareBlu',
  indirizzo: 'Via delle Marine, Torre Vado',
  comune: 'Morciano di Leuca',
  provincia: 'Lecce',
  regione: 'Puglia',
  cap: '73040',
  paese: 'Italia',
  coordinate: {
    lat: 39.8356,
    lng: 18.3089,
  },
  telefono: '+39 XXX XXX XXXX', // Da configurare
  email: 'info@villamareblu.it', // Da configurare
  distanze: {
    spiaggia: '300 metri',
    centro: '500 metri',
    supermercato: '200 metri',
    farmacia: '500 metri',
    ristoranti: '100-500 metri',
    aeroportoBrindisi: '95 km (1h 15min)',
    aeroportoBari: '220 km (2h 30min)',
    stazioneLecce: '65 km (50min)',
  },
  comeArrivare: {
    auto: 'Da Nord: A14 fino a Bari, poi SS16 e SS101 verso Gallipoli, seguire indicazioni per Santa Maria di Leuca/Torre Vado. Da Taranto: SS7ter fino a Lecce, poi SS101.',
    aereo: 'Aeroporto di Brindisi (BDS) è il più vicino. Noleggio auto consigliato. In alternativa bus/navetta per Lecce e poi autobus SITA per Torre Vado.',
    treno: 'Stazione di Lecce, poi autobus SITA per Torre Vado o taxi/noleggio auto.',
  },
}

// Regole della casa
export const regoleCasa = {
  checkIn: {
    orarioInizio: '16:00',
    orarioFine: '20:00',
    note: 'Check-in anticipato possibile su richiesta e in base alla disponibilità. Check-in tardivo (dopo le 20:00) da concordare.',
  },
  checkOut: {
    orario: '10:00',
    note: 'Check-out posticipato possibile su richiesta (fino alle 11:00) se non ci sono arrivi lo stesso giorno.',
  },
  animali: {
    ammessi: true,
    condizioni: 'Animali di piccola taglia ammessi su richiesta. Supplemento pulizia €30. Tenere al guinzaglio nelle aree comuni.',
  },
  fumo: {
    consentito: false,
    note: 'Vietato fumare all\'interno degli appartamenti. Consentito su balconi/terrazze e aree esterne.',
  },
  feste: {
    consentite: false,
    note: 'Non sono ammesse feste o eventi. Rispettare la quiete dalle 14:00 alle 16:00 e dalle 23:00 alle 08:00.',
  },
  parcheggio: {
    disponibile: true,
    tipo: 'Parcheggio privato gratuito',
    posti: 'Un posto auto per appartamento',
  },
  bambini: {
    benvenuti: true,
    dotazioni: 'Lettino e seggiolone disponibili su richiesta gratuita.',
  },
  pagamenti: {
    acconto: '30% alla prenotazione',
    saldo: 'Entro 7 giorni prima dell\'arrivo o al check-in',
    cauzione: '€200 (restituita al check-out dopo verifica)',
    metodiAccettati: ['Bonifico bancario', 'Contanti', 'PayPal'],
  },
  cancellazione: {
    gratuita: 'Fino a 30 giorni prima dell\'arrivo: rimborso completo dell\'acconto',
    parziale: 'Da 30 a 14 giorni prima: rimborso 50% dell\'acconto',
    nonRimborsabile: 'Meno di 14 giorni prima: nessun rimborso',
  },
}

// Informazioni sulla zona
export const infoZona = {
  descrizione: 'Torre Vado è una frazione marina di Morciano di Leuca, situata nel Salento meridionale, tra Santa Maria di Leuca e le spiagge sabbiose della costa ionica. È famosa per le sue acque cristalline e la vicinanza alle Maldive del Salento (Pescoluse).',
  spiagge: [
    { nome: 'Spiaggia di Torre Vado', distanza: '300m', tipo: 'Sabbia e scogli', note: 'Spiaggia principale con stabilimenti e tratti liberi' },
    { nome: 'Pescoluse (Maldive del Salento)', distanza: '5km', tipo: 'Sabbia bianca', note: 'Spiaggia caraibica, acqua bassa ideale per bambini' },
    { nome: 'Marina di Felloniche', distanza: '3km', tipo: 'Sabbia', note: 'Spiaggia tranquilla, meno affollata' },
    { nome: 'Lido Marini', distanza: '7km', tipo: 'Sabbia', note: 'Lunga spiaggia con dune' },
    { nome: 'Santa Maria di Leuca', distanza: '8km', tipo: 'Scogli e calette', note: 'Grotte marine, faro, punto più a sud della Puglia' },
  ],
  attrazioni: [
    { nome: 'Santa Maria di Leuca', distanza: '8km', descrizione: 'Santuario, faro, grotte marine, cascata monumentale' },
    { nome: 'Gallipoli', distanza: '35km', descrizione: 'Centro storico su isola, cattedrale barocca, spiagge' },
    { nome: 'Otranto', distanza: '55km', descrizione: 'Cattedrale con mosaico pavimentale, castello aragonese, Baia dei Turchi' },
    { nome: 'Lecce', distanza: '65km', descrizione: 'Barocco leccese, anfiteatro romano, centro storico' },
    { nome: 'Grotta Zinzulusa', distanza: '25km', descrizione: 'Grotta carsica visitabile in barca' },
    { nome: 'Specchia', distanza: '15km', descrizione: 'Borgo tra i più belli d\'Italia' },
  ],
  ristoranti: [
    { nome: 'Ristoranti sul lungomare', distanza: '100-300m', tipo: 'Pesce fresco, cucina salentina' },
    { nome: 'Pizzerie', distanza: '200-500m', tipo: 'Pizza, street food' },
    { nome: 'Bar e gelaterie', distanza: '100-200m', tipo: 'Colazioni, aperitivi, gelato artigianale' },
  ],
  servizi: [
    { nome: 'Supermercato/Minimarket', distanza: '200m' },
    { nome: 'Farmacia', distanza: '500m' },
    { nome: 'Ufficio postale', distanza: '500m' },
    { nome: 'Bancomat', distanza: '300m' },
    { nome: 'Noleggio barche/gommoni', distanza: '400m' },
    { nome: 'Noleggio bici/scooter', distanza: '500m' },
    { nome: 'Escursioni in barca', distanza: 'Porto Torre Vado' },
  ],
  eventi: [
    { nome: 'Notte della Taranta', periodo: 'Agosto', descrizione: 'Festival di musica popolare salentina' },
    { nome: 'Sagre locali', periodo: 'Estate', descrizione: 'Sagre del pesce, delle frise, dei prodotti tipici' },
    { nome: 'Festa patronale', periodo: 'Agosto', descrizione: 'Festa con luminarie, musica, fuochi d\'artificio' },
  ],
}

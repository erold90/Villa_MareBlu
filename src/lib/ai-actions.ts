// Tipi per le azioni che l'AI può proporre
// L'utente deve confermare prima che vengano eseguite

export type AzioneAI =
  | AzioneCreaPrenotazione
  | AzioneModificaPrezzo
  | AzioneBloccoDate
  | AzioneModificaPrenotazione
  | AzioneAnnullaPrenotazione

export interface AzioneCreaPrenotazione {
  tipo: 'crea_prenotazione'
  dati: {
    appartamentiIds: number[]
    checkIn: string
    checkOut: string
    ospiteNome: string
    ospiteCognome: string
    ospiteTelefono: string
    ospiteEmail?: string
    ospiteNazione?: string
    numAdulti: number
    numBambini: number
    numNeonati: number
    animali: boolean
    animaliDettaglio?: string
    biancheria: boolean
    fonte: 'direct' | 'airbnb' | 'booking' | 'altro'
    fonteRiferimento?: string
    prezzoSoggiorno: number
    biancheriaCosto: number
    tassaSoggiorno: number
    extra: number
    totale: number
    acconto: number
    richiesteSpeciali?: string
    noteInterne?: string
  }
  riepilogo: string // Descrizione leggibile dell'azione
}

export interface AzioneModificaPrezzo {
  tipo: 'modifica_prezzo'
  dati: {
    anno: number
    settimana: number
    appartamentoId: number
    prezzoAttuale: number
    nuovoPrezzo: number
  }
  riepilogo: string
}

export interface AzioneBloccoDate {
  tipo: 'blocco_date'
  dati: {
    appartamentoId: number
    dataInizio: string
    dataFine: string
    motivo: string
  }
  riepilogo: string
}

export interface AzioneModificaPrenotazione {
  tipo: 'modifica_prenotazione'
  dati: {
    prenotazioneId: number
    modifiche: Partial<{
      checkIn: string
      checkOut: string
      numAdulti: number
      numBambini: number
      numNeonati: number
      prezzoSoggiorno: number
      totale: number
      acconto: number
      stato: string
      accontoPagato: boolean
      saldoPagato: boolean
      noteInterne: string
    }>
  }
  riepilogo: string
}

export interface AzioneAnnullaPrenotazione {
  tipo: 'annulla_prenotazione'
  dati: {
    prenotazioneId: number
    motivo: string
  }
  riepilogo: string
}

// Regex per estrarre azioni JSON dal messaggio dell'AI
const ACTION_REGEX = /```azione\n([\s\S]*?)\n```/g

// Funzione per estrarre le azioni proposte dal messaggio dell'AI
export function estraiAzioniDaMessaggio(messaggio: string): {
  testoSenzaAzioni: string
  azioni: AzioneAI[]
} {
  const azioni: AzioneAI[] = []
  let testoSenzaAzioni = messaggio

  const matches = messaggio.matchAll(ACTION_REGEX)
  for (const match of matches) {
    try {
      const azione = JSON.parse(match[1]) as AzioneAI
      if (isValidAzione(azione)) {
        azioni.push(azione)
      }
    } catch (e) {
      console.error('Errore parsing azione AI:', e)
    }
    // Rimuovi il blocco azione dal testo
    testoSenzaAzioni = testoSenzaAzioni.replace(match[0], '')
  }

  return { testoSenzaAzioni: testoSenzaAzioni.trim(), azioni }
}

// Valida che l'azione abbia la struttura corretta
function isValidAzione(obj: unknown): obj is AzioneAI {
  if (!obj || typeof obj !== 'object') return false
  const azione = obj as Record<string, unknown>

  if (!azione.tipo || !azione.dati || !azione.riepilogo) return false

  const tipiValidi = [
    'crea_prenotazione',
    'modifica_prezzo',
    'blocco_date',
    'modifica_prenotazione',
    'annulla_prenotazione'
  ]

  return tipiValidi.includes(azione.tipo as string)
}

// Genera l'icona per tipo di azione
export function getIconaAzione(tipo: AzioneAI['tipo']): string {
  switch (tipo) {
    case 'crea_prenotazione': return '📅'
    case 'modifica_prezzo': return '💰'
    case 'blocco_date': return '🔒'
    case 'modifica_prenotazione': return '✏️'
    case 'annulla_prenotazione': return '❌'
    default: return '⚡'
  }
}

// Genera il label per tipo di azione
export function getLabelAzione(tipo: AzioneAI['tipo']): string {
  switch (tipo) {
    case 'crea_prenotazione': return 'Nuova Prenotazione'
    case 'modifica_prezzo': return 'Modifica Prezzo'
    case 'blocco_date': return 'Blocco Date'
    case 'modifica_prenotazione': return 'Modifica Prenotazione'
    case 'annulla_prenotazione': return 'Annulla Prenotazione'
    default: return 'Azione'
  }
}

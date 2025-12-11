/**
 * Gestione centralizzata delle stagioni
 *
 * Regole:
 * - Stagione estiva: 1 Giugno - 30 Settembre
 * - Dopo il 30 Settembre: la stagione è chiusa, si passa alla preparazione della prossima
 * - La "stagione corrente" è quella su cui si sta lavorando attivamente
 */

// Anno di inizio attività (prima stagione)
export const ANNO_INIZIO_ATTIVITA = 2025

// Mesi della stagione (0-indexed: 5 = Giugno, 8 = Settembre)
export const MESE_INIZIO_STAGIONE = 5 // Giugno
export const MESE_FINE_STAGIONE = 8 // Settembre
export const GIORNO_FINE_STAGIONE = 30

/**
 * Determina la stagione corrente su cui lavorare
 * - Se siamo tra 1 Giugno e 30 Settembre → stagione dell'anno corrente
 * - Se siamo tra 1 Ottobre e 31 Maggio → stagione dell'anno successivo
 */
export function getStagioneCorrente(): number {
  const oggi = new Date()
  const anno = oggi.getFullYear()
  const mese = oggi.getMonth() // 0-indexed
  const giorno = oggi.getDate()

  // Se siamo tra Giugno e Settembre (incluso il 30 Settembre)
  if (mese >= MESE_INIZIO_STAGIONE && mese <= MESE_FINE_STAGIONE) {
    // Se siamo a Settembre dopo il 30, passiamo all'anno successivo
    if (mese === MESE_FINE_STAGIONE && giorno > GIORNO_FINE_STAGIONE) {
      return anno + 1
    }
    return anno
  }

  // Se siamo tra Ottobre e Dicembre → stagione anno successivo
  if (mese > MESE_FINE_STAGIONE) {
    return anno + 1
  }

  // Se siamo tra Gennaio e Maggio → stagione anno corrente
  return anno
}

/**
 * Verifica se una stagione è attualmente attiva (in corso)
 */
export function isStagioneAttiva(anno: number): boolean {
  const oggi = new Date()
  const annoCorrente = oggi.getFullYear()
  const mese = oggi.getMonth()
  const giorno = oggi.getDate()

  // La stagione è attiva solo se siamo nell'anno giusto e nel periodo giusto
  if (anno !== annoCorrente) return false

  // Verifica se siamo nel periodo della stagione
  if (mese >= MESE_INIZIO_STAGIONE && mese <= MESE_FINE_STAGIONE) {
    if (mese === MESE_FINE_STAGIONE && giorno > GIORNO_FINE_STAGIONE) {
      return false
    }
    return true
  }

  return false
}

/**
 * Verifica se una stagione è chiusa (passata)
 */
export function isStagioneChiusa(anno: number): boolean {
  const oggi = new Date()
  const annoCorrente = oggi.getFullYear()
  const mese = oggi.getMonth()
  const giorno = oggi.getDate()

  // Stagioni di anni passati sono sempre chiuse
  if (anno < annoCorrente) return true

  // Stagione dell'anno corrente: chiusa se siamo dopo il 30 Settembre
  if (anno === annoCorrente) {
    if (mese > MESE_FINE_STAGIONE) return true
    if (mese === MESE_FINE_STAGIONE && giorno > GIORNO_FINE_STAGIONE) return true
  }

  return false
}

/**
 * Verifica se una stagione è futura (non ancora iniziata)
 */
export function isStagioneFutura(anno: number): boolean {
  const oggi = new Date()
  const annoCorrente = oggi.getFullYear()
  const mese = oggi.getMonth()

  // Stagioni di anni futuri sono sempre future
  if (anno > annoCorrente) return true

  // Stagione dell'anno corrente: futura se siamo prima di Giugno
  if (anno === annoCorrente && mese < MESE_INIZIO_STAGIONE) return true

  return false
}

/**
 * Ottiene la lista delle stagioni disponibili
 * Include: dall'anno di inizio attività fino alla stagione corrente + 1 (per pianificazione)
 */
export function getStagioniDisponibili(): number[] {
  const stagioneCorrente = getStagioneCorrente()
  const stagioni: number[] = []

  for (let anno = ANNO_INIZIO_ATTIVITA; anno <= stagioneCorrente + 1; anno++) {
    stagioni.push(anno)
  }

  return stagioni
}

/**
 * Ottiene le date di inizio e fine di una stagione
 */
export function getDateStagione(anno: number): { inizio: Date; fine: Date } {
  return {
    inizio: new Date(anno, MESE_INIZIO_STAGIONE, 1), // 1 Giugno
    fine: new Date(anno, MESE_FINE_STAGIONE, GIORNO_FINE_STAGIONE, 23, 59, 59), // 30 Settembre 23:59:59
  }
}

/**
 * Formatta il nome della stagione
 */
export function getNomeStagione(anno: number): string {
  return `Stagione ${anno}`
}

/**
 * Ottiene lo stato della stagione come stringa
 */
export function getStatoStagione(anno: number): 'attiva' | 'chiusa' | 'futura' {
  if (isStagioneAttiva(anno)) return 'attiva'
  if (isStagioneChiusa(anno)) return 'chiusa'
  return 'futura'
}

/**
 * Ottiene il badge/etichetta per lo stato della stagione
 */
export function getBadgeStagione(anno: number): { testo: string; colore: string } {
  const stato = getStatoStagione(anno)

  switch (stato) {
    case 'attiva':
      return { testo: 'In corso', colore: 'bg-green-100 text-green-800' }
    case 'chiusa':
      return { testo: 'Archivio', colore: 'bg-gray-100 text-gray-600' }
    case 'futura':
      return { testo: 'Prossima', colore: 'bg-blue-100 text-blue-800' }
  }
}

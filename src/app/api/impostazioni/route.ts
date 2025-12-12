import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { costiExtra } from '@/config/appartamenti'

// Valori di default dal config
const defaultSettings = {
  biancheria: costiExtra.biancheria,
  tassaSoggiorno: costiExtra.tassaSoggiorno,
  cauzioneDefault: costiExtra.cauzioneDefault,
  accontoPercentuale: costiExtra.accontoPercentuale,
  notificheEmail: true,
  notifichePush: true,
  promemoriCheckIn: true,
  promemoriPagamenti: true,
  lingua: 'it',
  valuta: 'EUR',
  formatoData: 'dd/mm/yyyy',
}

export async function GET() {
  try {
    // Leggi tutte le impostazioni dal database
    const impostazioniDb = await prisma.impostazione.findMany()

    // Converti in oggetto
    const settings: Record<string, string | number | boolean> = { ...defaultSettings }

    impostazioniDb.forEach((imp) => {
      // Parse del valore in base al tipo atteso
      const defaultValue = defaultSettings[imp.chiave as keyof typeof defaultSettings]
      if (typeof defaultValue === 'number') {
        settings[imp.chiave] = parseInt(imp.valore) || 0
      } else if (typeof defaultValue === 'boolean') {
        settings[imp.chiave] = imp.valore === 'true'
      } else {
        settings[imp.chiave] = imp.valore
      }
    })

    return NextResponse.json({
      settings,
      fonte: impostazioniDb.length > 0 ? 'database' : 'config',
    })
  } catch (error) {
    console.error('Errore GET /api/impostazioni:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero delle impostazioni' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Dati mancanti: settings è richiesto' },
        { status: 400 }
      )
    }

    // Salva ogni impostazione nel database
    const chiavi = Object.keys(settings)

    for (const chiave of chiavi) {
      const valore = String(settings[chiave])

      await prisma.impostazione.upsert({
        where: { chiave },
        update: { valore },
        create: { chiave, valore },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Impostazioni salvate con successo',
      count: chiavi.length,
    })
  } catch (error) {
    console.error('Errore PUT /api/impostazioni:', error)
    return NextResponse.json(
      { error: 'Errore nel salvataggio delle impostazioni' },
      { status: 500 }
    )
  }
}

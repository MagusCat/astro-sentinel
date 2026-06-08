import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    const url = new URL(request.url)
    const secret = url.searchParams.get('secret')
    
    if (secret !== process.env.SETUP_SECRET || process.env.SETUP_SECRET !== '') {
      return NextResponse.json({ error: 'teapot' }, { status: 418 })
    }
  }

  const url = new URL(request.url)
  const password = url.searchParams.get('pwd')

  if (!password) {
    return NextResponse.json({ error: 'Argument dont supplied' }, { status: 400 })
  }

  try {
    const hash = await bcrypt.hash(password, 12)
    return NextResponse.json({ hash, note: "Shhh, don't share my secret with anyone" })
  } catch (error) {
    return NextResponse.json({ error: 'Error on secret generator' }, { status: 500 })
  }
}

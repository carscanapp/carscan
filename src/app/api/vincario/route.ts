import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { vin } = await request.json();

    if (!vin || vin.length !== 17) {
      return NextResponse.json({ error: 'VIN inválido' }, { status: 400 });
    }

    const apiKey = process.env.VINDECODER_API_KEY;
    const secretKey = process.env.VINDECODER_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json({ error: 'Claves de Vincario no configuradas' }, { status: 500 });
    }

    // URL oficial de Vincario Decoder API 3.2
    const url = `https://api.vindecoder.eu/3.2/${apiKey}/${secretKey}/decode/${vin}`;
    
    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vincario Error:', errorText);
      return NextResponse.json({ error: 'Error al consultar Vincario' }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

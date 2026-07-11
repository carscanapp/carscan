import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { matricula } = await request.json();

    if (!matricula) {
      return NextResponse.json({ error: 'Matrícula requerida' }, { status: 400 });
    }

    // Hardcoded temporaly to bypass .env cache issues
    const apiKey = "carscanapp1@gmail.com";

    if (!apiKey) {
      return NextResponse.json({ error: 'Clave de MatriculaAPI no configurada' }, { status: 500 });
    }

    const url = `https://www.regcheck.org.uk/api/reg.asmx/CheckSpain?RegistrationNumber=${matricula}&username=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RegCheck Error:', errorText);
      return NextResponse.json({ error: 'Error al consultar la matrícula' }, { status: 502 });
    }

    // A veces regcheck devuelve XML con el JSON incrustado como string si no se especifica bien, 
    // pero intentamos parsear como JSON directo primero. Si da error, lo trataremos.
    const text = await response.text();
    let data;
    try {
      // Si la API envuelve el JSON en XML de la forma <Vehicle xmlns="..."> {JSON} </Vehicle>
      if (text.includes('<?xml')) {
        const jsonMatch = text.match(/>(\s*\{.*\}\s*)</s);
        if (jsonMatch && jsonMatch[1]) {
          data = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('No se pudo extraer JSON del XML');
        }
      } else {
        data = JSON.parse(text);
      }
    } catch (e) {
      console.error('Error parseando JSON de RegCheck:', e, text);
      return NextResponse.json({ error: 'Respuesta inválida del servidor' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

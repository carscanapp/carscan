import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { matricula } = await request.json();

    if (!matricula) {
      return NextResponse.json({ error: 'Matrícula requerida' }, { status: 400 });
    }

    const apiKey = process.env.MATRICULA_API_KEY;

    // TODO: Cuando haya API KEY, descomentar y hacer el fetch real:
    /*
    if (!apiKey) {
      return NextResponse.json({ error: 'Clave de MatriculaAPI no configurada' }, { status: 500 });
    }
    const url = `https://www.regcheck.org.uk/api/reg.asmx/CheckSpain?RegistrationNumber=${matricula}&username=${apiKey}`;
    // fetch...
    */

    // MOCK: Devolvemos el payload exacto que da la documentación para que el frontend pueda parsearlo.
    // Simulamos un retraso de red de 1 segundo.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockResponse = {
      Description: "RENAULT MEGANE",
      CarMake: {
        CurrentTextValue: "RENAULT",
      },
      CarModel: {
        CurrentTextValue: "MEGANE",
      },
      MakeDescription: {
        CurrentTextValue: "RENAULT",
      },
      ModelDescription: {
        CurrentTextValue: "MEGANE",
      },
      EngineSize: "1461",
      VehicleIdentificationNumber: null,
      RegistrationYear: "2010",
      RegistrationDate: "06/07/2010",
      Variation: "EXPRESSION 1.5DCI 85",
      Seats: null,
      VariantType: "Diesel 1461 cc 5 puertas",
      VehicleType: "Car",
      Fuel: "Diesel",
      IndicativePrice: null,
      Doors: "5",
      AllTerain: null,
      KType: null,
      ImageUrl: "http://matriculaapi.com/image.aspx/@UkVOQVVMVCBNRUdBTkU=",
      DynamicPower: "85.0",
      Stolen: null,
    };

    return NextResponse.json(mockResponse);

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

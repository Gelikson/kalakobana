import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { word, category, letter } = await req.json();

    const cleanWord = word ? word.trim() : '';

    if (!cleanWord) {
      return NextResponse.json({ isValid: false, reason: 'სიტყვა ცარიელია' });
    }

    if (!cleanWord.toLowerCase().startsWith(letter.toLowerCase())) {
      return NextResponse.json({ isValid: false, reason: `სიტყვა არ იწყება ასო "${letter}"-ზე` });
    }

    const prompt = `შენ ხარ ქართული თამაშის "ქალაქობანას" (Categories) მსაჯი.
შენი ამოცანაა შეამოწმო, არის თუ არა მოწოდებული სიტყვა ვალიდური.

მონაცემები:
- სავალდებულო საწყისი ასო: "${letter}"
- კატეგორია: "${category}"
- მოთამაშის ჩაწერილი სიტყვა: "${cleanWord}"

წესები:
1. სიტყვა უნდა იყოს რეალური და არსებული ქართულ ენაში ან მსოფლიოში (არ მიიღო უაზრო ასოების კომბინაცია ან ფრაზები, მაგალითად: "არვიცი", "ხზ", "ასასდ").
2. სიტყვა ზუსტად უნდა შეესაბამებოდეს მოცემულ კატეგორიას (მაგალითად, "ხაჭაპური" არ არის ქალაქი).
3. უპასუხე მხოლოდ JSON ფორმატში, ყოველგვარი მარკდაუნის ან დამატებითი ტექსტის გარეშე.

ფორმატი:
{"isValid": true, "reason": "სწორია"}
ან
{"isValid": false, "reason": "განმარტება ქართულად"}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const resultText = response.text || '{}';
    const jsonResult = JSON.parse(resultText);

    return NextResponse.json(jsonResult);

  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json({ isValid: true, reason: 'AI შემოწმება ვერ განხორციელდა' });
  }
}

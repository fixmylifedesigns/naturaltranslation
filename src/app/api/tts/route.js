import { NextResponse } from "next/server";

// Mapping of target languages to OpenAI TTS voices
const TTS_VOICES = {
  en: "alloy", // English
  ja: "nova", // Japanese
  es: "echo", // Spanish (fixing pronunciation)
  fr: "shimmer", // French
  de: "onyx", // German
  zh: "fable", // Chinese
  ko: "nova", // Korean
  it: "shimmer", // Italian
  pt: "echo", // Portuguese
  ru: "onyx", // Russian
  default: "alloy", // Fallback voice
};

// Function to normalize text for better pronunciation
const preprocessText = (text, language) => {
  if (language === "es") {
    // Normalize Spanish text: remove accents for better pronunciation
    return text
      .normalize("NFD") // Decomposes characters
      .replace(/[\u0300-\u036f]/g, ""); // Removes accents
  }
  return text; // Default behavior for other languages
};

export async function POST(request) {
  try {
    const { text, language } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Select the correct voice model
    const voiceModel = TTS_VOICES[language] || TTS_VOICES["default"];

    // Preprocess text for better pronunciation
    const processedText = preprocessText(text, language);

    // Call OpenAI TTS API
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: processedText,
        voice: voiceModel,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || "Error from OpenAI API" },
        { status: response.status }
      );
    }

    // Return audio file with correct headers
    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("TTS API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { text, sourceLanguage, targetLanguage, targetDialect } =
      await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

   let prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}${
       targetDialect ? ` with ${targetDialect} dialect` : ""
    }. 
    If the target language has a non-Latin script, also provide a romanized version.
    
    Text: "${text}"
    
    Respond in JSON format: 
    {
      "translation": "[translated text]",
      "romaji": "[romanized text (if applicable)]"
    }`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful translation assistant. Always respond in valid JSON format.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();

    // Log the raw response if there's an error
    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Error from OpenAI API" },
        { status: response.status }
      );
    }

    // Check if we have the expected data structure
    if (!data.choices?.[0]?.message?.content) {
      console.error("Unexpected API response structure:", data);
      return NextResponse.json(
        { error: "Invalid response from translation service" },
        { status: 500 }
      );
    }

    try {
      const jsonResponse = JSON.parse(data.choices[0].message.content.trim());

      // Validate the response has the required fields
      if (!jsonResponse.translation) {
        console.error("Invalid JSON response structure:", jsonResponse);
        return NextResponse.json(
          { error: "Invalid translation response format" },
          { status: 500 }
        );
      }

      return NextResponse.json(jsonResponse);
    } catch (parseError) {
      console.error("JSON Parse Error:", {
        error: parseError,
        content: data.choices[0].message.content,
      });
      return NextResponse.json(
        { error: "Failed to parse translation response" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

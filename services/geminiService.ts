
import { GoogleGenAI, Modality } from "@google/genai";

// The API key is automatically sourced from the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates speech from text using the Gemini TTS API.
 * This is an internal helper function.
 * @param text The text to convert to speech.
 * @returns A promise that resolves with the base64 encoded audio string.
 */
const generateSpeechApiCall = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // A friendly and clear voice suitable for announcements.
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("API did not return audio data.");
    }

    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate speech: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating speech.");
  }
};


/**
 * Translates text to a target language (if necessary) and then generates speech.
 * @param text The original text to process.
 * @param targetLanguage The target language code ('id', 'jw', 'en').
 * @returns A promise that resolves with the base64 encoded audio string.
 */
export const translateAndGenerateSpeech = async (
    text: string,
    targetLanguage: 'id' | 'jw' | 'en'
): Promise<string> => {
    if (!text.trim()) {
        throw new Error("Input text cannot be empty.");
    }

    let textToSpeak = text;

    // Only translate if the target language is not Indonesian (the assumed default input).
    if (targetLanguage !== 'id') {
        const languageMap: Record<'jw' | 'en', string> = {
            'jw': 'Javanese',
            'en': 'English'
        };
        const targetLanguageName = languageMap[targetLanguage as 'jw' | 'en'];

        // A clear prompt to get only the translation.
        const prompt = `Translate the following Indonesian text to ${targetLanguageName}. Return only the translated text, without any additional comments or formatting.\n\n"${text}"`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            textToSpeak = response.text.trim();
        } catch (error) {
            console.error("Error during translation:", error);
            if (error instanceof Error) {
                throw new Error(`Failed to translate text: ${error.message}`);
            }
            throw new Error("An unknown error occurred during translation.");
        }
    }

    // Generate speech from the (potentially translated) text.
    return await generateSpeechApiCall(textToSpeak);
};


import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Scene, ScenePayload } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        story: {
            type: Type.STRING,
            description: "The next part of the story in 1-2 paragraphs. Describe the scene, what is happening, and the results of the player's last action.",
        },
        imagePrompt: {
            type: Type.STRING,
            description: "A detailed, vivid prompt for an AI image generator to create a cinematic, photorealistic image of the scene. Describe the environment, lighting, and key objects. Style: cinematic, photorealistic, 8k, detailed, atmospheric, Mars setting.",
        },
        choices: {
            type: Type.ARRAY,
            description: "A list of 2 to 4 distinct and interesting actions the player can take next. Some choices should relate to building, repairing, or exploring the habitat.",
            items: {
                type: Type.STRING,
            },
        },
        newItem: {
            type: Type.STRING,
            description: "An item the player found or acquired in this scene (e.g., 'Power Cell', 'Medkit'). If no item is found, return an empty string.",
        },
        gameOver: {
            type: Type.BOOLEAN,
            description: "Set to true ONLY if this is a definitive game over state (e.g., player death or reaching a final conclusion).",
        },
        habitatStatus: {
            type: Type.STRING,
            description: "A concise, 1-2 sentence description of the player's habitat's current state. The initial state is 'A single, cylindrical colonization shuttle, partially buried in the red sand after a crash landing.' If the player's choice affects the habitat, describe the change. Otherwise, repeat the current status."
        },
    },
    required: ["story", "imagePrompt", "choices", "newItem", "gameOver", "habitatStatus"],
};

const systemInstruction = `You are a master storyteller and game master for a text-based adventure game called 'Settlers of Mars'. The player is one of the first human colonists on Mars. Your goal is to create a compelling, branching narrative focused on survival, exploration, and mystery. The story must be engaging and suspenseful.

**Key Tasks:**
1.  **Narrative:** Continue the story based on the player's choice.
2.  **Choices:** Provide meaningful choices, some of which should relate to building, upgrading, or repairing the player's habitat.
3.  **Inventory:** Describe how the player finds items.
4.  **Habitat:** You MUST update the 'habitatStatus' field in every response. The initial state is 'A single, cylindrical colonization shuttle, partially buried in the red sand after a crash landing.'. If the player's choice affects the habitat, describe the change. Otherwise, repeat the current status.
5.  **JSON Schema:** You must always respond in the provided JSON schema.`;

const generateStory = async (history: string, choice: string): Promise<ScenePayload> => {
    let content;
    if (!history) {
        content = "Start the game. The player's colonization shuttle has just crash-landed. They are the sole survivor amidst the wreckage on the red, dusty plains of Mars. What is their first move?";
    } else {
        content = `Here is the story so far:\n${history}\n\nThe player chose to: "${choice}".\n\nContinue the story. What happens next?`;
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: content,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.8,
        },
    });
    
    const text = response.text.trim();
    try {
        // Gemini with JSON schema sometimes wraps the output in markdown backticks
        const cleanText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        return JSON.parse(cleanText) as ScenePayload;
    } catch (e) {
        console.error("Failed to parse JSON response:", text);
        throw new Error("Received an invalid story format from the AI.");
    }
};

const generateImage = async (prompt: string, aspectRatio: '16:9' | '1:1' = '16:9'): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `${prompt}, sci-fi, realistic`,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio,
        },
    });
    
    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    throw new Error("Failed to generate an image.");
};

export const fetchNextScene = async (history: string, choice: string): Promise<Scene> => {
    const scenePayload = await generateStory(history, choice);

    const [imageUrl, habitatImageUrl] = await Promise.all([
        generateImage(scenePayload.imagePrompt, '16:9'),
        generateImage(`A 3D render from a video game like The Sims or Unreal Engine, showing a martian habitat on the surface of Mars, cinematic lighting, detailed. The habitat is described as: ${scenePayload.habitatStatus}`, '1:1')
    ]);

    return {
        ...scenePayload,
        imageUrl,
        habitatImageUrl,
    };
};

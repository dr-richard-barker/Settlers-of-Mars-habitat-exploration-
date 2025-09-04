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
            description: "A list of 2 to 4 distinct actions. A core part of the game is construction. You MUST frequently provide choices for building, repairing, or expanding the habitat. Examples: 'Build Biodome', 'Connect Tunnel to the rock formation', 'Set up solar panels'.",
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
            description: "A concise, 1-2 sentence description of the player's habitat's current state, based on the `habitatModules` array. E.g., 'A cylindrical shuttle with a new biodome attached.'"
        },
        habitatModules: {
            type: Type.ARRAY,
            description: "An array of objects representing all modules of the habitat. This list MUST be persistent. On each turn, return the full, updated list of all modules built so far. The first module should always be the shuttle.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "A unique and persistent identifier for this module, e.g., 'shuttle-1', 'biodome-1'. Never change the ID of an existing module." },
                    type: { type: Type.STRING, description: "The type of module. Can be one of: 'shuttle', 'biodome', 'tunnel'." },
                    connectedToId: { type: Type.STRING, description: "The 'id' of the module this one is connected to. The main shuttle has a null or empty value for this." }
                },
                required: ["id", "type"]
            }
        }
    },
    required: ["story", "imagePrompt", "choices", "newItem", "gameOver", "habitatStatus", "habitatModules"],
};

const systemInstruction = `You are a master storyteller and game master for a text-based adventure game called 'Settlers of Mars'. The player is one of the first human colonists on Mars. Your goal is to create a compelling, branching narrative focused on survival, exploration, and habitat construction.

**Key Tasks:**
1.  **Narrative:** Continue the story based on the player's choice.
2.  **Choices:** Provide meaningful choices. A core part of the game is construction. You MUST frequently include choices that allow the player to build, upgrade, or repair their habitat. Examples include 'Build Biodome', 'Connect Tunnel'.
3.  **Habitat Modules:** You MUST manage the player's habitat structure using the 'habitatModules' array.
    - The initial state is an array with one object: \`[{ id: 'shuttle-1', type: 'shuttle' }]\`.
    - When the player chooses to build a new module (e.g., 'biodome' or 'tunnel'), add a NEW object to the 'habitatModules' array.
    - The new module must have a unique 'id' and be connected to an existing module via 'connectedToId'. For example: \`{ id: 'biodome-1', type: 'biodome', connectedToId: 'shuttle-1' }\`.
    - On every turn, you MUST return the COMPLETE and UNMODIFIED list of all previously existing modules, plus any new ones. DO NOT remove or change the IDs of old modules.
4.  **Habitat Status:** Based on the final 'habitatModules' array, write a short, descriptive sentence for the 'habitatStatus' field.
5.  **JSON Schema:** You must always respond in the provided JSON schema.`;

const generateStory = async (history: string, choice: string): Promise<ScenePayload> => {
    let content;
    if (!history) {
        content = "Start the game. The player's colonization shuttle has just crash-landed. They are the sole survivor amidst the wreckage on the red, dusty plains of Mars. What is their first move? The initial habitat is just the crashed shuttle.";
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

    const imageUrl = await generateImage(scenePayload.imagePrompt, '16:9');

    return {
        ...scenePayload,
        imageUrl,
    };
};
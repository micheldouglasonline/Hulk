import { GoogleGenAI, Type } from "@google/genai";
import { GeminiStoryResponse } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const imagePrompt = `Ilustração em estilo de painel de quadrinhos vintage da Marvel: ${prompt}. Ação dramática e dinâmica, tintas fortes, cores de matriz de pontos, sem texto.`;
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: imagePrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '4:3',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      throw new Error("Nenhuma imagem foi gerada.");
    }
  } catch (error) {
    console.error("Erro ao gerar imagem com a API Gemini:", error);
    throw new Error("Falha ao gerar a imagem da história. Verifique sua chave de API e conexão de rede.");
  }
};


const responseSchema = {
  type: Type.OBJECT,
  properties: {
    story: {
      type: Type.STRING,
      description: "O próximo parágrafo da história. Deve ser dramático e envolvente, em estilo de quadrinhos. 2-4 frases."
    },
    choices: {
      type: Type.ARRAY,
      description: "Um array de exatamente três escolhas distintas e empolgantes para o usuário fazer a seguir.",
      items: {
        type: Type.STRING
      }
    },
  },
  required: ['story', 'choices'],
};

const generateContentWithSchema = async (prompt: string): Promise<GeminiStoryResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.8,
      },
    });

    const jsonText = response.text.trim();
    const parsedResponse = JSON.parse(jsonText);
    
    if (parsedResponse.story && Array.isArray(parsedResponse.choices) && parsedResponse.choices.length > 0) {
        return parsedResponse;
    } else {
        throw new Error("Estrutura de resposta inválida da API Gemini.");
    }

  } catch (error) {
    console.error("Erro ao chamar a API Gemini:", error);
    throw new Error("Falha ao gerar a história. Verifique sua chave de API e conexão de rede.");
  }
};


export const startStory = async (initialPrompt: string): Promise<GeminiStoryResponse> => {
    const prompt = `Você é um roteirista criativo criando uma história em quadrinhos interativa. Comece uma história baseada nesta cena: ${initialPrompt}

Escreva um parágrafo de abertura que prepare o cenário. Em seguida, forneça três escolhas empolgantes para o que o Hulk deve fazer a seguir.

A história e as escolhas devem ser em português do Brasil.

Retorne sua resposta APENAS como um objeto JSON válido que corresponda ao schema definido.`;

    return generateContentWithSchema(prompt);
};


export const continueStory = async (storyHistory: string[]): Promise<GeminiStoryResponse> => {
    const storySoFar = storyHistory.join('\n\n');
    const prompt = `Você é um roteirista criativo continuando uma história em quadrinhos interativa.

Aqui está a história até agora:
---
${storySoFar}
---

Com base na última escolha do usuário, continue a história com um novo parágrafo curto e dramático (2-4 frases). Em seguida, forneça três novas escolhas distintas e empolgantes para o usuário fazer a seguir.

A história e as escolhas devem ser em português do Brasil.

Retorne sua resposta APENAS como um objeto JSON válido que corresponda ao schema definido.`;
    
    return generateContentWithSchema(prompt);
};
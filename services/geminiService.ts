// services/geminiService.ts
import { GeminiStoryResponse } from '../types';

const responseSchema = {
  type: 'object',
  properties: {
    story: {
      type: 'string',
      description: "O próximo parágrafo da história. Deve ser dramático e envolvente, em estilo de quadrinhos. 2-4 frases."
    },
    choices: {
      type: 'array',
      description: "Um array de exatamente três escolhas distintas e empolgantes para o usuário fazer a seguir.",
      items: { type: 'string' }
    },
  },
  required: ['story', 'choices'],
};

/**
 * Gera imagem pedindo ao server-side (Vercel function) que chame a API do Google.
 * Espera que a função server-side retorne JSON com uma das formas:
 *  - { generatedImages: [{ image: { imageBytes: "<base64>" } }] }  (estilo response antigo)
 *  - { imageBase64: "<base64>" }
 *  - { dataUrl: "data:image/jpeg;base64,..." }
 */
export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const imagePrompt = `Ilustração em estilo de painel de quadrinhos vintage da Marvel: ${prompt}. Ação dramática e dinâmica, tintas fortes, cores de matriz de pontos, sem texto.`;

    const resp = await fetch('/api/proxy-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'imagen-4.0-generate-001',
        prompt: imagePrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '4:3',
        },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Erro no proxy de imagem: ${resp.status} ${txt}`);
    }

    const data = await resp.json();

    // Compatibilidade com várias formas de retorno
    if (data.generatedImages && data.generatedImages.length > 0 && data.generatedImages[0].image?.imageBytes) {
      const base64ImageBytes = data.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }

    if (data.imageBase64) {
      return `data:image/jpeg;base64,${data.imageBase64}`;
    }

    if (data.dataUrl) {
      return data.dataUrl;
    }

    throw new Error('Resposta inesperada do proxy de imagem.');
  } catch (error) {
    console.error('Erro ao gerar imagem via proxy:', error);
    throw new Error('Falha ao gerar a imagem da história. Verifique a função proxy no Vercel e a chave do servidor.');
  }
};

/**
 * Chama a geração de conteúdo (texto) via proxy server-side.
 * O servidor deve encaminhar a requisição para o endpoint de geração de conteúdo do Google.
 */
const generateContentWithSchema = async (prompt: string): Promise<GeminiStoryResponse> => {
  try {
    const resp = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.8,
        },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Erro no proxy de conteúdo: ${resp.status} ${txt}`);
    }

    const response = await resp.json();

    // Em algumas integrações o retorno pode estar em response.text ou response.data
    // Mas aqui esperamos o proxy já ter retornado o JSON final do modelo
    const parsedResponse = response;

    if (parsedResponse && parsedResponse.story && Array.isArray(parsedResponse.choices) && parsedResponse.choices.length > 0) {
      return parsedResponse as GeminiStoryResponse;
    } else {
      throw new Error('Estrutura de resposta inválida vinda do proxy.');
    }
  } catch (error) {
    console.error('Erro ao chamar generateContent via proxy:', error);
    throw new Error('Falha ao gerar a história. Verifique a função proxy no Vercel e a chave do servidor.');
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

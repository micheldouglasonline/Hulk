import React, { useState, useEffect, useCallback, useRef } from 'react';
import { startStory, continueStory, generateImage } from './services/geminiService';
import Spinner from './components/Spinner';
import ChoiceButton from './components/ChoiceButton';

interface StoryPart {
  text: string;
  imageUrl?: string;
  isChoice?: boolean;
}

const HULK_IMAGE_URL = 'https://storage.googleapis.com/generative-ai-story/hulk.png';
const INITIAL_PROMPT_TEXT = `Hulk, enfurecido, acaba de esmagar um laptop em uma cidade em ruínas. Ele ruge, "HULK JÁ APAGOU TUDO E AINDA ESTÁ LENTO!"`;

const App: React.FC = () => {
  const [storyLog, setStoryLog] = useState<StoryPart[]>([]);
  const [currentChoices, setCurrentChoices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const storyEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    storyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [storyLog, currentChoices, scrollToBottom]);

  const startNewStory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCurrentChoices([]);
    setStoryLog([{ text: INITIAL_PROMPT_TEXT, imageUrl: HULK_IMAGE_URL }]);
    
    try {
      const { story, choices } = await startStory(INITIAL_PROMPT_TEXT);
      const imageUrl = await generateImage(story);
      
      setStoryLog(prev => [...prev, { text: story, imageUrl }]);
      setCurrentChoices(choices);
    } catch (err) {
      if(err instanceof Error) {
          setError(err.message);
      } else {
          setError("Ocorreu um erro desconhecido.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    startNewStory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChoice = async (choice: string) => {
    setIsLoading(true);
    setCurrentChoices([]);
    
    const userChoicePart: StoryPart = { text: `> Você escolheu: ${choice}`, isChoice: true };
    const newStoryLog = [...storyLog, userChoicePart];
    setStoryLog(newStoryLog);

    const historyForGemini = newStoryLog.map(p => p.text);

    try {
      const { story, choices } = await continueStory(historyForGemini);
      const imageUrl = await generateImage(story);

      setStoryLog(prev => [...prev, { text: story, imageUrl }]);
      setCurrentChoices(choices);
    } catch (err) {
      if(err instanceof Error) {
          setError(err.message);
      } else {
          setError("Ocorreu um erro desconhecido.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white flex justify-center items-start p-4 md:p-8">
      <main className="w-full max-w-2xl mx-auto bg-gray-900 border-4 border-black shadow-[8px_8px_0px_#1f2937] rounded-lg overflow-hidden">
        <header className="p-4 border-b-4 border-black bg-purple-700">
           <h1 className="font-bangers text-4xl md:text-5xl text-yellow-300 tracking-wider text-center" style={{ textShadow: '3px 3px 0px #000' }}>A FÚRIA DO HULK</h1>
           <p className="text-center text-purple-200 font-semibold">Uma Aventura Interativa em Quadrinhos</p>
        </header>

        <div className="p-4 md:p-6 max-h-[60vh] overflow-y-auto">
            {storyLog.map((part, index) => (
                <div key={index} className="mb-6">
                    {part.imageUrl && (
                        <div className="border-4 border-black mb-4 rounded-lg overflow-hidden shadow-[4px_4px_0px_#000]">
                            <img src={part.imageUrl} alt={`Cena da história em quadrinhos ${index + 1}`} className="w-full h-auto" />
                        </div>
                    )}
                    <p className={`mb-4 ${part.isChoice ? 'text-yellow-400 italic font-semibold' : 'text-gray-200 leading-relaxed'}`}>
                        {part.text}
                    </p>
                </div>
            ))}
            
            {isLoading && <Spinner />}

            {error && (
              <div className="my-4 p-4 bg-red-800 border-2 border-red-500 rounded-lg text-white">
                <p className="font-bold">Ocorreu um erro:</p>
                <p>{error}</p>
                <button 
                  onClick={startNewStory}
                  className="mt-2 px-4 py-2 bg-yellow-400 text-black font-bold rounded-md hover:bg-yellow-300"
                >
                  Recomeçar História
                </button>
              </div>
            )}
            
            <div ref={storyEndRef}></div>
        </div>

        {!isLoading && !error && currentChoices.length > 0 && (
          <div className="p-4 md:p-6 border-t-4 border-black bg-gray-800">
            <h2 className="font-bangers text-3xl text-green-400 mb-4 tracking-wide" style={{ textShadow: '2px 2px 0px #000' }}>O QUE HULK FAZ?</h2>
            <div className="space-y-3">
              {currentChoices.map((choice, index) => (
                <ChoiceButton
                  key={index}
                  text={choice}
                  onClick={() => handleChoice(choice)}
                  disabled={isLoading}
                />
              ))}
            </div>
             <button 
                onClick={startNewStory}
                className="mt-6 w-full py-2 bg-purple-600 text-white font-bold rounded-md hover:bg-purple-500 transition-colors"
            >
                Recomeçar História
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;

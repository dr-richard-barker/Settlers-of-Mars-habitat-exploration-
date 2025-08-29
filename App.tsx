
import React, { useState, useCallback } from 'react';
import { GameState, Scene, StoryLogEntry } from './types';
import { fetchNextScene } from './services/geminiService';
import GameUI from './components/GameUI';
import MarsIcon from './components/icons/MarsIcon';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [storyLog, setStoryLog] = useState<StoryLogEntry[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastAddedItem, setLastAddedItem] = useState<string | null>(null);

  const resetGame = useCallback(() => {
    setGameState(GameState.START);
    setCurrentScene(null);
    setStoryLog([]);
    setInventory([]);
    setError(null);
    setLastAddedItem(null);
  }, []);

  const handleApiCall = useCallback(async (history: string, choice: string) => {
    setError(null);
    setGameState(GameState.LOADING);
    try {
      const scene = await fetchNextScene(history, choice);
      
      if (scene.newItem && scene.newItem.trim() !== "" && !inventory.includes(scene.newItem)) {
        setInventory(prev => [...prev, scene.newItem!]);
        setLastAddedItem(scene.newItem);
      } else {
        setLastAddedItem(null); // Reset if no new item
      }

      setCurrentScene(scene);

      if (scene.gameOver) {
        setGameState(GameState.GAME_OVER);
      } else {
        setGameState(GameState.PLAYING);
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "An unknown error occurred.");
      setGameState(GameState.ERROR);
    }
  }, [inventory]);

  const handleStartGame = useCallback(() => {
    handleApiCall("", "Start the game");
  }, [handleApiCall]);

  const handleChoice = useCallback((choice: string) => {
    if (!currentScene || gameState === GameState.LOADING) return;

    const newLogEntry: StoryLogEntry = {
      id: storyLog.length,
      story: currentScene.story,
    };
    const updatedLog = [...storyLog, newLogEntry];
    setStoryLog(updatedLog);

    const historyText = updatedLog.map(entry => entry.story).join('\n---\n');
    handleApiCall(historyText, choice);
  }, [currentScene, storyLog, handleApiCall, gameState]);

  const renderContent = () => {
    switch (gameState) {
      case GameState.START:
        return (
          <div className="flex flex-col items-center justify-center h-screen text-center p-4">
            <MarsIcon className="w-40 h-40 text-orange-500 mb-6 animate-pulse" />
            <h1 className="text-5xl md:text-7xl font-orbitron text-orange-400 mb-4 tracking-widest">SETTLERS OF MARS</h1>
            <p className="max-w-2xl text-gray-400 mb-8">
              Your shuttle has crash-landed. You are the sole survivor. The red dust settles, revealing a hostile, alien landscape. Every choice matters. Can you survive?
            </p>
            <button
              onClick={handleStartGame}
              className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xl font-orbitron rounded-lg shadow-lg shadow-orange-600/20 transition-all duration-300 transform hover:scale-105"
            >
              BEGIN EXPEDITION
            </button>
          </div>
        );
      case GameState.LOADING:
      case GameState.PLAYING:
        return (
          <GameUI
            scene={currentScene}
            storyLog={storyLog}
            inventory={inventory}
            onChoice={handleChoice}
            isLoading={gameState === GameState.LOADING}
            lastAddedItem={lastAddedItem}
          />
        );
      case GameState.GAME_OVER:
        return (
          <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-black/50">
             <div className="relative w-full max-w-4xl aspect-video bg-black/50 border-2 border-red-500/50 rounded-lg flex items-center justify-center overflow-hidden mb-6">
                {currentScene && <img src={currentScene.imageUrl} alt="Game Over" className="w-full h-full object-cover opacity-70" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                <h1 className="absolute text-6xl md:text-8xl font-orbitron text-red-500 tracking-widest z-10">GAME OVER</h1>
             </div>
            <div className="max-w-3xl text-gray-300 mb-8 text-lg">
                {currentScene?.story}
            </div>
            <button
              onClick={resetGame}
              className="px-8 py-4 bg-gray-600 hover:bg-gray-500 text-white font-bold text-xl font-orbitron rounded-lg shadow-lg transition-all duration-300"
            >
              PLAY AGAIN
            </button>
          </div>
        );
      case GameState.ERROR:
        return (
          <div className="flex flex-col items-center justify-center h-screen text-center p-4">
            <h1 className="text-4xl font-orbitron text-red-500 mb-4">TRANSMISSION FAILED</h1>
            <p className="text-gray-400 mb-6 max-w-lg">{error || 'An unknown error occurred while contacting the AI.'}</p>
            <button
              onClick={resetGame}
              className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xl font-orbitron rounded-lg shadow-lg transition-all duration-300"
            >
              RESTART MISSION
            </button>
          </div>
        );
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen bg-cover bg-center" style={{backgroundImage: "url('https://www.transparenttextures.com/patterns/stardust.png')"}}>
        {renderContent()}
    </div>
  );
};

export default App;

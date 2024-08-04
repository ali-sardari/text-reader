import React, { useState, useEffect } from 'react';

const App = () => {
    const [text, setText] = useState('');
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState('');
    const [rate, setRate] = useState(1);
    const [delay, setDelay] = useState(2000); // Default delay in milliseconds
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const populateVoices = () => {
            const voices = speechSynthesis.getVoices();
            setVoices(voices);

            const storedVoice = localStorage.getItem('selectedVoice');
            if (storedVoice && voices.some(voice => voice.name === storedVoice)) {
                setSelectedVoice(storedVoice);
            } else {
                const defaultVoice = voices.find(voice => voice.name === "Microsoft Emma Online (Natural) - English (United States)");
                if (defaultVoice) {
                    setSelectedVoice(defaultVoice.name);
                } else if (voices.length > 0) {
                    setSelectedVoice(voices[0].name);
                }
            }
        };

        populateVoices();
        speechSynthesis.onvoiceschanged = populateVoices;
    }, []);

    useEffect(() => {
        if (selectedVoice) {
            localStorage.setItem('selectedVoice', selectedVoice);
        }
    }, [selectedVoice]);

    const speakText = () => {
        if (window.speechSynthesis.speaking) {
            console.error('Speech synthesis already in progress');
            return;
        }

        if (text !== '') {
            setIsPlaying(true);
            const lines = text.split('\n');
            const selectedVoiceObj = voices.find(voice => voice.name === selectedVoice);

            const speakLine = async (index) => {
                if (index < lines.length) {
                    const utterance = new SpeechSynthesisUtterance(lines[index]);
                    utterance.voice = selectedVoiceObj || null;
                    utterance.rate = rate;

                    return new Promise((resolve) => {
                        utterance.onend = () => {
                            setTimeout(() => resolve(), delay); // Delay between lines
                        };

                        window.speechSynthesis.speak(utterance);
                    }).then(() => speakLine(index + 1)); // Recursive call
                } else {
                    setIsPlaying(false);
                }
            };

            speakLine(0);
        } else {
            console.error('No text to read aloud');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
            <div className="w-full max-w-lg bg-white p-8 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Text Reader</h1>
                <textarea
                    className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type your text here..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <div className="mb-4">
                    <label className="block text-lg font-medium text-gray-700 mb-2">Voice</label>
                    <div className="relative">
                        <select
                            className="w-full p-2 border border-gray-300 rounded-lg bg-white pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                        >
                            {voices.map((voice) => (
                                <option key={voice.name} value={voice.name}>
                                    {voice.name}
                                </option>
                            ))}
                        </select>
                        <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-lg font-medium text-gray-700 mb-2">Rate</label>
                    <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={rate}
                        onChange={(e) => setRate(parseFloat(e.target.value))}
                        className="w-full"
                    />
                    <div className="text-center text-lg font-medium text-blue-600 mt-2">{rate}</div>
                </div>
                <div className="mb-4">
                    <label className="block text-lg font-medium text-gray-700 mb-2">Delay (ms)</label>
                    <div className="relative">
                        <select
                            className="w-full p-2 border border-gray-300 rounded-lg bg-white pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={delay}
                            onChange={(e) => setDelay(parseInt(e.target.value))}
                        >
                            <option value={0}>0</option>
                            <option value={500}>500</option>
                            <option value={1000}>1000</option>
                            <option value={1500}>1500</option>
                            <option value={2000}>2000</option>
                            <option value={3000}>3000</option>
                        </select>
                        <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
                <button
                    onClick={speakText}
                    disabled={isPlaying}
                    className={`w-full p-3 text-white rounded-lg ${isPlaying ? 'bg-red-500' : 'bg-blue-500'} hover:bg-opacity-80 transition duration-300`}
                >
                    {isPlaying ? 'Pause' : 'Play'}
                </button>
            </div>
        </div>
    );
};

export default App;

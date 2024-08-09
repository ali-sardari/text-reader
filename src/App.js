import React, { useState, useEffect, useCallback } from 'react';
import './index.css';

const App = () => {
    // Load the text from local storage, or use the default text if none exists
    const initialText = localStorage.getItem('text') || '';

    const [text, setText] = useState(initialText);
    const [voices, setVoices] = useState([]);
    const [voiceOptions, setVoiceOptions] = useState({});
    const [rate, setRate] = useState(1);
    const [delay, setDelay] = useState(200);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // List of default voices to choose from
    const possibleDefaultVoices = [
        "Microsoft Eric Online (Natural) - English (United States)",
        "Microsoft Andrew Online (Natural) - English (United States)",
        "Microsoft Emma Online (Natural) - English (United States)",
        "Microsoft Jenny Online (Natural) - English (United States)"
    ];

    // Function to filter voices by language
    const filterEnglishVoices = (voices) => {
        return voices.filter(voice => {
            const lang = voice.lang.toLowerCase();
            return lang === 'en-us' || lang === 'en-gb' || lang === 'nl-nl' || lang === 'fa-ir';
        });
    };

    useEffect(() => {
        speechSynthesis.onvoiceschanged = () => {
            if (typeof speechSynthesis === "undefined") {
                return;
            }

            const allVoices = speechSynthesis.getVoices();

            if (allVoices.length === 0) {
                console.error('xxx.No voices found.');
                return;
            }

            const englishVoices = filterEnglishVoices(allVoices).sort((a, b) => {
                return a.lang.localeCompare(b.lang);
            });

            setVoices(englishVoices);
        };

        // Load saved settings from localStorage
        const savedSettings = JSON.parse(localStorage.getItem('settings'));
        console.log('xxx.1.savedSettings:', savedSettings);

        if (savedSettings) {
            setVoiceOptions(savedSettings.voiceOptions || {});
            setRate(savedSettings.rate || 1);
            setDelay(savedSettings.delay || 200);
        } else {
            setDefaultVoices();
        }
    }, []);

    const setDefaultVoices = useCallback(() => {
        const uniquePrefixes = getUniquePrefixes();

        console.log('xxx.2.uniquePrefixes:', uniquePrefixes);

        let newVoiceOptions = {};

        if (uniquePrefixes.length > 0) {
            if (uniquePrefixes.length === 1) {
                const defaultVoice = possibleDefaultVoices.find(name =>
                    name.toLowerCase().includes('eric')
                );

                if (defaultVoice) {
                    newVoiceOptions[uniquePrefixes[0]] = defaultVoice;
                }
            } else {
                uniquePrefixes.forEach((prefix, index) => {
                    newVoiceOptions[prefix] = possibleDefaultVoices[index % possibleDefaultVoices.length];
                });
                newVoiceOptions["DEFAULT"] = possibleDefaultVoices[0] || '';
            }

            setVoiceOptions(prev => ({
                ...prev,
                ...newVoiceOptions
            }));
        } else {
            newVoiceOptions["DEFAULT"] = possibleDefaultVoices[0] || '';
            setVoiceOptions(newVoiceOptions);
        }
    }, [voices, rate, delay]);

    useEffect(() => {
        console.log('xxx.4.text:', text);
        if (text) {
            setDefaultVoices();
        }
    }, [text, setDefaultVoices]);

    const getUniquePrefixes = useCallback(() => {
        const lines = text.split('\n');
        const prefixes = new Set();

        lines.forEach((line) => {
            const prefix = line.substring(0, 2);
            if (prefix.match(/[A-Z]:/)) {
                prefixes.add(prefix);
            }
        });

        console.log('xxx.3.prefixes:', {prefixes, lines});

        return Array.from(prefixes);
    }, [text]);

    const speakText = () => {
        if (window.speechSynthesis.speaking) {
            console.error('Speech synthesis already in progress');
            return;
        }

        if (text !== '') {
            setIsPlaying(true);
            const lines = text.split('\n');
            const voiceMap = {};

            Object.keys(voiceOptions).forEach((key) => {
                const voice = voices.find(voice => voice.name === voiceOptions[key]);
                if (voice) {
                    voiceMap[key] = voice;
                }
            });

            const speakLine = async (index) => {
                if (index < lines.length) {
                    let prefix = lines[index].substring(0, 2);
                    let sentence = lines[index];
                    if (prefix.match(/[A-Z]:/)) {
                        sentence = lines[index].substring(2).trim();
                    } else {
                        prefix = "DEFAULT";
                    }

                    const utterance = new SpeechSynthesisUtterance(sentence);
                    utterance.voice = voiceMap[prefix] || voiceMap["DEFAULT"];
                    utterance.rate = rate;
                    utterance.onboundary = (e) => {
                        // console.log('xxxx.Boundary:', e.charIndex, e.charLength);
                    }

                    return new Promise((resolve) => {
                        utterance.onend = () => {
                            setTimeout(() => resolve(), delay);
                        };

                        window.speechSynthesis.speak(utterance);
                    }).then(() => speakLine(index + 1));
                } else {
                    setIsPlaying(false);
                }
            };

            speakLine(0);
        } else {
            console.error('No text to read aloud');
        }
    };

    const handleVoiceChange = (prefix, newVoice) => {
        setVoiceOptions(prev => {
            const newVoiceOptions = {
                ...prev,
                [prefix]: newVoice
            };
            saveSettings({
                voiceOptions: newVoiceOptions,
                rate,
                delay
            });
            return newVoiceOptions;
        });
    };

    const handlePlayPause = () => {
        if (isPlaying) {
            if (isPaused) {
                window.speechSynthesis.resume();
                setIsPaused(false);
            } else {
                window.speechSynthesis.pause();
                setIsPaused(true);
            }
        } else {
            speakText();
        }
    };

    const handleStop = () => {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
    };

    const saveSettings = (settings) => {
        localStorage.setItem('settings', JSON.stringify(settings));
        console.log('Settings saved to localStorage:', settings);
    };

    // Save text to local storage when it changes
    useEffect(() => {
        localStorage.setItem('text', text);
    }, [text]);

    const uniquePrefixes = getUniquePrefixes();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
            <div className="w-full max-w-screen-lg bg-white p-8 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Text Reader</h1>
                <textarea
                    className="w-full h-80 p-4 border border-gray-300 rounded-lg resize-none mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type your text here..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                {uniquePrefixes.length > 0 && uniquePrefixes.map((prefix, index) => (
                    <div key={prefix} className="mb-4">
                        <label className="block text-lg font-medium text-gray-700 mb-2">Voice {prefix}</label>
                        <div className="relative">
                            <select
                                id={`voice-${prefix}`}
                                className="w-full p-2 border border-gray-300 rounded-lg bg-white pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={voiceOptions[prefix] || possibleDefaultVoices[index] || ''}
                                onChange={(e) => handleVoiceChange(prefix, e.target.value)}
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
                ))}
                {uniquePrefixes.length === 0 && (
                    <div className="mb-4">
                        <label className="block text-lg font-medium text-gray-700 mb-2">Default Voice</label>
                        <div className="relative">
                            <select
                                id='voice-default'
                                className="w-full p-2 border border-gray-300 rounded-lg bg-white pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={voiceOptions["DEFAULT"] || possibleDefaultVoices[0] || ''}
                                onChange={(e) => handleVoiceChange("DEFAULT", e.target.value)}
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
                )}
                <div className="mb-4">
                    <label className="block text-lg font-medium text-gray-700 mb-2">Rate</label>
                    <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={rate}
                        onChange={(e) => {
                            setRate(e.target.value);
                            saveSettings({
                                voiceOptions,
                                rate: e.target.value,
                                delay
                            });
                        }}
                        className="w-full"
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-lg font-medium text-gray-700 mb-2">Delay (ms)</label>
                    <input
                        type="number"
                        value={delay}
                        onChange={(e) => {
                            setDelay(e.target.value);
                            saveSettings({
                                voiceOptions,
                                rate,
                                delay: e.target.value
                            });
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex space-x-4">
                    <button
                        onClick={handlePlayPause}
                        className={`w-full py-3 px-6 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                    >
                        {isPlaying ? (isPaused ? 'Resume' : 'Pause') : 'Play'}
                    </button>
                    <button
                        onClick={handleStop}
                        className="w-full py-3 px-6 text-white bg-gray-500 hover:bg-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Stop
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;

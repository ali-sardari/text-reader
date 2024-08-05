import React, { useState, useEffect, useCallback } from 'react';
import './index.css';

const App = () => {
    const [text, setText] = useState('A: Hi, are you feeling better?\n' +
        'B: I\'m good. How about you?\n' +
        'C: Hey, were you feeling bad?');
    const [voices, setVoices] = useState([]);
    const [voiceOptions, setVoiceOptions] = useState({});
    const [rate, setRate] = useState(1);
    const [delay, setDelay] = useState(200);
    const [isPlaying, setIsPlaying] = useState(false);

    // List of default voices to choose from
    const possibleDefaultVoices = [
        "Microsoft Emma Online (Natural) - English (United States)",
        "Microsoft Andrew Online (Natural) - English (United States)",
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
        const populateVoices = () => {
            const allVoices = speechSynthesis.getVoices();
            if (allVoices.length === 0) {
                console.error('No voices found.');
                return;
            }

            const englishVoices = filterEnglishVoices(allVoices).sort((a, b) => {
                return a.lang.localeCompare(b.lang);
            });
            setVoices(englishVoices);
        };

        populateVoices();
        speechSynthesis.onvoiceschanged = populateVoices;

        // Load saved settings from localStorage
        const savedSettings = JSON.parse(localStorage.getItem('settings'));
        console.log('Loaded settings from localStorage:', savedSettings);

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
        let newVoiceOptions = {};

        if (uniquePrefixes.length > 0) {
            if (uniquePrefixes.length === 1) {
                const emmaVoice = possibleDefaultVoices.find(name =>
                    name.toLowerCase().includes('emma')
                );

                if (emmaVoice) {
                    newVoiceOptions[uniquePrefixes[0]] = emmaVoice;
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
            saveSettings({
                voiceOptions: newVoiceOptions,
                rate,
                delay
            });
        }
    }, [voices, rate, delay]);

    useEffect(() => {
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
            window.speechSynthesis.cancel();
            setIsPlaying(false);
        } else {
            speakText();
        }
    };

    const saveSettings = (settings) => {
        localStorage.setItem('settings', JSON.stringify(settings));
        console.log('Settings saved to localStorage:', settings);
    };

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
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={rate}
                        onChange={(e) => {
                            const newRate = parseFloat(e.target.value);
                            setRate(newRate);
                            saveSettings({
                                voiceOptions,
                                rate: newRate,
                                delay
                            });
                        }}
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
                            onChange={(e) => {
                                const newDelay = parseInt(e.target.value);
                                setDelay(newDelay);
                                saveSettings({
                                    voiceOptions,
                                    rate,
                                    delay: newDelay
                                });
                            }}
                        >
                            <option value={0}>0</option>
                            <option value={200}>200</option>
                            <option value={500}>500</option>
                            <option value={800}>800</option>
                            <option value={1000}>1000</option>
                            <option value={2000}>2000</option>
                            <option value={4000}>4000</option>
                        </select>
                        <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
                <button
                    onClick={handlePlayPause}
                    className={`w-full p-3 text-white rounded-lg ${isPlaying ? 'bg-red-500' : 'bg-blue-500'} hover:bg-opacity-80 transition duration-300`}
                >
                    {isPlaying ? 'Pause' : 'Play'}
                </button>
            </div>
        </div>
    );
};

export default App;

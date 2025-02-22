"use client";
import React, { useState, useEffect } from "react";
import {
  Mic,
  Volume2,
  ChevronDown,
  Copy,
  MessageSquare,
  Share2,
  Star,
  Keyboard,
  RefreshCw,
  X,
  Search,
} from "lucide-react";
import languagesData from "../data/available-languages.json";
import dialectsData from "../data/dialects.json";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [translation, setTranslation] = useState("");
  const [romaji, setRomaji] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [charCount, setCharCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sourceLang, setSourceLang] = useState({ code: "en", name: "English" });
  const [targetLang, setTargetLang] = useState({
    code: "ja",
    name: "Japanese",
  });
  const [selectedDialect, setSelectedDialect] = useState({
    source: "",
    target: "",
  });
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showDialectDropdown, setShowDialectDropdown] = useState(false);
  const [modalTarget, setModalTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputAudioUrl, setInputAudioUrl] = useState(null);
  const [isInputAudioLoading, setIsInputAudioLoading] = useState(false);
  const [isOutputAudioLoading, setIsOutputAudioLoading] = useState(false);
  const CHARACTER_LIMIT = 2000;

  // Load saved language preferences
  useEffect(() => {
    const savedPreferences = localStorage.getItem("translationPreferences");
    if (savedPreferences) {
      const { sourceLang: savedSource, targetLang: savedTarget } =
        JSON.parse(savedPreferences);
      setSourceLang(savedSource);
      setTargetLang(savedTarget);
    }
  }, []);

  // Save preferences when languages change
  useEffect(() => {
    localStorage.setItem(
      "translationPreferences",
      JSON.stringify({
        sourceLang,
        targetLang,
      })
    );
  }, [sourceLang, targetLang]);

  const handleAudioClick = async (text, lang, isInput = false) => {
    const loadingStateSetter = isInput
      ? setIsInputAudioLoading
      : setIsOutputAudioLoading;
    const currentAudioUrl = isInput ? inputAudioUrl : audioUrl;
    const audioUrlSetter = isInput ? setInputAudioUrl : setAudioUrl;

    // If we already have the audio, just play it
    if (currentAudioUrl) {
      try {
        const audio = new Audio(currentAudioUrl);
        await audio.play();
        return;
      } catch (err) {
        console.error("Audio playback error:", err);
        // Clear invalid audio URL
        audioUrlSetter(null);
      }
    }

    // Generate new audio
    loadingStateSetter(true);
    try {
      const adjustedText = adjustTextForSpeech(text);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: adjustedText, language: lang }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "TTS request failed");
      }

      const blob = await res.blob();
      if (!blob.type.includes("audio/")) {
        throw new Error("Invalid audio format received");
      }

      const url = URL.createObjectURL(blob);
      audioUrlSetter(url);

      // Create new audio instance and play
      const audio = new Audio(url);
      await new Promise((resolve, reject) => {
        audio.onloadeddata = () => {
          audio.play().then(resolve).catch(reject);
        };
        audio.onerror = () => reject(new Error("Audio loading failed"));
      });
    } catch (err) {
      console.error("Error with audio:", err);
      audioUrlSetter(null);
    } finally {
      loadingStateSetter(false);
    }
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    if (text.length <= CHARACTER_LIMIT) {
      setInputText(text);
      setCharCount(text.length);
      setInputAudioUrl(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // In your frontend handleSubmit function
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        setLoading(true);
        setError("");
        setTranslation("");
        setRomaji("");
        setAudioUrl(null);
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: inputText,
            sourceLanguage: sourceLang.name,
            targetLanguage: targetLang.name,
            targetDialect: selectedDialect.target,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Translation failed");
        }

        const data = await res.json();
        setTranslation(data.translation || "");
        setRomaji(data.romaji || "");
        break; // Success, exit the loop
      } catch (err) {
        retryCount++;
        if (retryCount === maxRetries) {
          setError(
            `Translation failed after ${maxRetries} attempts: ${err.message}`
          );
        }
        // Wait a short time before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    setLoading(false);
  };

  // Add cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup URLs when component unmounts
      if (inputAudioUrl) URL.revokeObjectURL(inputAudioUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [inputAudioUrl, audioUrl]);

  const adjustTextForSpeech = (text) => {
    return text
      .replace(/([.!?])(\S)/g, "$1 $2") // Ensure proper spacing after punctuation
      .trim();
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(translation);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const switchLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSelectedDialect({
      source: selectedDialect.target,
      target: selectedDialect.source,
    });
  };

  const openLanguageModal = (target) => {
    setModalTarget(target);
    setShowLanguageModal(true);
    setSearchQuery("");
  };

  const selectLanguage = (lang) => {
    if (modalTarget === "source") {
      // If selected language is same as target, switch languages
      if (lang.code === targetLang.code) {
        switchLanguages();
      } else {
        setSourceLang(lang);
      }
    } else {
      // If selected language is same as source, switch languages
      if (lang.code === sourceLang.code) {
        switchLanguages();
      } else {
        setTargetLang(lang);
      }
    }
    setShowLanguageModal(false);
  };

  const filteredLanguages = languagesData.languages.filter((lang) =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col items-center">
      {/* Keep the Language Modal code exactly as is */}
      {showLanguageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Select {modalTarget === "source" ? "Source" : "Target"} Language
              </h2>
              <button
                onClick={() => setShowLanguageModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search input */}
            <div className="relative mb-4">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search languages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => selectLanguage(lang)}
                  className={`w-full text-left p-3 hover:bg-gray-100 rounded ${
                    (modalTarget === "source"
                      ? sourceLang.code
                      : targetLang.code) === lang.code
                      ? "bg-blue-50"
                      : ""
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-7xl flex flex-col gap-4">
        {/* Language Selection Bar - Mobile Only */}
        <div className="lg:hidden flex items-center space-x-4 bg-white p-3 rounded-lg shadow-sm">
          <button
            className="text-blue-500 font-medium"
            onClick={() => openLanguageModal("source")}
          >
            {sourceLang.name}
          </button>
          <button className="text-gray-600" onClick={switchLanguages}>
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            className="text-blue-500 font-medium"
            onClick={() => openLanguageModal("target")}
          >
            {targetLang.name}
          </button>
        </div>

        {/* Translation Area - Desktop Row Layout */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Input Side */}
          <div className="w-full lg:w-1/2">
            {/* Desktop Language Selection */}
            <div className="hidden lg:flex items-center bg-white p-3 rounded-lg shadow-sm mb-4">
              <button
                className="text-blue-500 font-medium"
                onClick={() => openLanguageModal("source")}
              >
                {sourceLang.name}
              </button>
            </div>

            {/* Input Form */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <textarea
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Enter text..."
                className="w-full h-64 p-3 border border-gray-300 rounded resize-none text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={CHARACTER_LIMIT}
              />
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-2">
                  {inputText && (
                    <button
                      type="button"
                      className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                      onClick={() =>
                        handleAudioClick(inputText, sourceLang.code, true)
                      }
                      disabled={isInputAudioLoading}
                      title="Listen to input text"
                    >
                      {isInputAudioLoading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </div>
                <div
                  className={`text-sm ${
                    charCount > CHARACTER_LIMIT * 0.9
                      ? "text-red-500"
                      : "text-gray-500"
                  }`}
                >
                  {charCount}/{CHARACTER_LIMIT} characters
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              className="mt-4 w-full bg-blue-500 text-white p-2 rounded"
              disabled={
                loading || charCount === 0 || charCount > CHARACTER_LIMIT
              }
            >
              {loading ? "Translating..." : "Translate"}
            </button>
          </div>

          {/* Switch Languages Button - Desktop Only */}
          <div className="hidden lg:flex items-center justify-center">
            <button
              className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
              onClick={switchLanguages}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Output Side */}
          <div className="w-full lg:w-1/2">
            {/* Desktop Language Selection */}
            <div className="hidden lg:flex items-center justify-between bg-white p-3 rounded-lg shadow-sm mb-4">
              <button
                className="text-blue-500 font-medium"
                onClick={() => openLanguageModal("target")}
              >
                {targetLang.name}
              </button>
              {dialectsData[targetLang.code] && (
                <div className="relative">
                  <button
                    className="text-gray-600 text-sm flex items-center gap-1"
                    onClick={() => setShowDialectDropdown(!showDialectDropdown)}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showDialectDropdown && (
                    <div className="absolute right-0 mt-1 w-48 bg-white border rounded shadow-lg z-10 max-h-60 overflow-y-auto">
                      {dialectsData[targetLang.code].map((dialect, idx) => (
                        <button
                          key={idx}
                          className={`block w-full text-left p-2 hover:bg-gray-100 ${
                            selectedDialect.target === dialect
                              ? "bg-blue-100"
                              : ""
                          }`}
                          onClick={() => {
                            setSelectedDialect({
                              ...selectedDialect,
                              target: dialect,
                            });
                            setShowDialectDropdown(false);
                          }}
                        >
                          {dialect}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Translation Output */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              {error ? (
                <p className="text-red-500">{error}</p>
              ) : translation ? (
                <>
                  <p className="text-gray-700 text-lg min-h-[16rem]">
                    {translation}
                  </p>
                  {romaji && (
                    <p className="text-gray-500 text-sm mt-2">{romaji}</p>
                  )}
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                      onClick={() =>
                        handleAudioClick(translation, targetLang.code, false)
                      }
                      disabled={isOutputAudioLoading}
                      title="Listen to translation"
                    >
                      {isOutputAudioLoading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                      onClick={handleCopyText}
                      title="Copy translation"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-lg min-h-[16rem] flex items-center justify-center">
                  Translation will appear here
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

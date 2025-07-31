import React, { useState, useEffect } from 'react';

// Komponen utama aplikasi
const App = () => {
  // State untuk input prompt teks
  const [sceneDescription, setSceneDescription] = useState('');
  const [style, setStyle] = useState('');
  const [mood, setMood] = useState('');
  const [keywords, setKeywords] = useState('');
  const [cameraAngle, setCameraAngle] = useState('');
  const [lighting, setLighting] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9'); 

  // State untuk prompt JSON yang dihasilkan
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  // State untuk input gambar (analisis)
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  // State untuk pembuatan gambar
  const [imageGenPrompt, setImageGenPrompt] = useState(''); 
  const [negativePrompt, setNegativePrompt] = useState(''); 
  const [generatedImages, setGeneratedImages] = useState([]); 
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageGenError, setImageGenError] = useState('');

  // State untuk saran prompt AI
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  
  // State untuk pembaruan prompt
  const [isRefining, setIsRefining] = useState(false);
  const [refinementError, setRefinementError] = useState('');

  // State untuk soundscape
  const [isSuggestingSoundscape, setIsSuggestingSoundscape] = useState(false);
  const [soundscapeSuggestion, setSoundscapeSuggestion] = useState(null);
  const [soundscapeError, setSoundscapeError] = useState('');

  // State untuk rating prompt
  const [isRatingPrompt, setIsRatingPrompt] = useState(false);
  const [promptRating, setPromptRating] = useState(null);
  const [ratingError, setRatingError] = useState('');

  // State untuk riwayat prompt
  const [promptHistory, setPromptHistory] = useState([]);
  const [selectedHistoryPrompt, setSelectedHistoryPrompt] = useState('');
  
  // State untuk menonaktifkan tombol
  const [disableButtons, setDisableButtons] = useState(false);

  // --- Fungsi Utilitas ---

  // Mengubah file gambar menjadi Base64
  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  // Mengelola perubahan file gambar
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setAnalysisError('');
    } else {
      setImageFile(null);
      setImagePreviewUrl('');
    }
  };

  // --- Fungsi Interaksi AI ---

  // Menganalisis gambar dan mengisi input prompt
  const analyzeImage = async () => {
    if (!imageFile) {
      setAnalysisError('Mohon unggah gambar terlebih dahulu.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');
    setDisableButtons(true);

    try {
      const base64ImageData = await getBase64(imageFile);

      const prompt = `Gambarkan gambar ini secara detail dan sarankan nilai-nilai untuk deskripsi adegan, gaya visual, suasana hati, kata kunci, sudut kamera, dan pencahayaan. Keluarkan hasilnya sebagai objek JSON dengan kunci: "sceneDescription", "style", "mood", "keywords" (array string), "cameraAngle", "lighting". Pastikan setiap nilai adalah string yang relevan dan ringkas. Jangan sertakan teks penjelasan lainnya, hanya JSON.`;
      
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: imageFile.type,
                  data: base64ImageData
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              "sceneDescription": { "type": "STRING" },
              "style": { "type": "STRING" },
              "mood": { "type": "STRING" },
              "keywords": {
                "type": "ARRAY",
                "items": { "type": "STRING" }
              },
              "cameraAngle": { "type": "STRING" },
              "lighting": { "type": "STRING" }
            },
            required: ["sceneDescription", "style", "mood", "keywords", "cameraAngle", "lighting"]
          }
        }
      };

      const apiKey = ""; 
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();

      if (result.candidates && result.candidates.length > 0) {
        const jsonString = result.candidates[0].content.parts[0].text;
        const parsedData = JSON.parse(jsonString);
        setSceneDescription(parsedData.sceneDescription || '');
        setStyle(parsedData.style || '');
        setMood(parsedData.mood || '');
        setKeywords(parsedData.keywords ? parsedData.keywords.join(', ') : '');
        setCameraAngle(parsedData.cameraAngle || '');
        setLighting(parsedData.lighting || '');
        setImageGenPrompt(parsedData.sceneDescription || ''); 
      } else {
        setAnalysisError('Gagal menganalisis gambar.');
      }
    } catch (error) {
      setAnalysisError(`Terjadi kesalahan saat menganalisis gambar: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
      setDisableButtons(false);
    }
  };

  // Memberikan saran prompt AI untuk mengisi kolom
  const suggestPromptDetails = async () => {
    setIsSuggesting(true);
    setSuggestionError('');
    setDisableButtons(true);

    try {
      let promptText;
      if (!sceneDescription.trim()) {
        promptText = `Anda adalah seorang ahli prompt engineer untuk model AI generatif, yang berspesialisasi dalam konten visual. Hasilkan "Deskripsi Adegan" yang menarik dan detail untuk proyek visual kreatif, bersama dengan gaya visual, suasana hati, kata kunci (sebagai array string), sudut kamera, dan pencahayaan. Berikan output sebagai objek JSON dengan kunci: "sceneDescription", "style", "mood", "keywords", "cameraAngle", "lighting". Pastikan semua nilai adalah string yang ringkas dan berkualitas tinggi, cocok untuk prompt AI. Jangan sertakan teks penjelasan lain, hanya JSON.`;
      } else {
        promptText = `Anda adalah seorang ahli prompt engineer untuk model AI generatif, yang berspesialisasi dalam konten visual. Berdasarkan deskripsi adegan ini: "${sceneDescription.trim()}", sarankan deskripsi adegan yang disempurnakan, gaya visual, suasana hati, kata kunci (sebagai array string), sudut kamera, dan pencahayaan. Berikan output sebagai objek JSON dengan kunci: "sceneDescription", "style", "mood", "keywords", "cameraAngle", "lighting". Pastikan semua nilai adalah string yang ringkas dan berkualitas tinggi, cocok untuk prompt AI. Jangan sertakan teks penjelasan lain, hanya JSON.`;
      }
      
      const examples = `
Berikut adalah beberapa contoh saran yang baik:
[
  { "description": "A gritty, grounded, and chaotic take on street racing through the narrow, bustling roads of Yogyakarta...", "style": "Cyberpunk, Gritty Realism", "mood": "Chaotic, Intense, Adrenaline-pumping", "keywords": ["Yogyakarta", "street racing", "cyberpunk", "neon"], "cameraAngle": "Dynamic tracking, low-angle, POV", "lighting": "Neon glow, harsh shadows, futuristic" },
  { "description": "The surreal scene begins with a peanut slowly opening to reveal a boy sleeping inside...", "style": "Surreal, Dreamlike, Whimsical", "mood": "Tender, Heartwarming, Peaceful", "keywords": ["Peanut", "boy", "sleeping", "waking", "nature"], "cameraAngle": "Slow zoom, close-up, gentle tracking", "lighting": "Soft morning light, warm, diffused" }
]
Berikan saran yang mengikuti gaya di atas untuk deskripsi berikut:
${promptText}`;

      const chatHistory = [{ role: "user", parts: [{ text: examples }] }];
      const payload = {
        contents: chatHistory,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              "sceneDescription": { "type": "STRING" },
              "style": { "type": "STRING" },
              "mood": { "type": "STRING" },
              "keywords": { "type": "ARRAY", "items": { "type": "STRING" } },
              "cameraAngle": { "type": "STRING" },
              "lighting": { "type": "STRING" }
            },
            required: ["sceneDescription", "style", "mood", "keywords", "cameraAngle", "lighting"]
          }
        }
      };

      const apiKey = ""; 
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();

      if (result.candidates && result.candidates.length > 0) {
        const jsonString = result.candidates[0].content.parts[0].text;
        const parsedData = JSON.parse(jsonString);
        setSceneDescription(parsedData.sceneDescription || '');
        setStyle(parsedData.style || '');
        setMood(parsedData.mood || '');
        setKeywords(parsedData.keywords ? parsedData.keywords.join(', ') : '');
        setCameraAngle(parsedData.cameraAngle || '');
        setLighting(parsedData.lighting || '');
        setImageGenPrompt(parsedData.sceneDescription || '');
      } else {
        setSuggestionError('Gagal mendapatkan saran. Struktur respons tidak terduga.');
      }
    } catch (error) {
      setSuggestionError(`Terjadi kesalahan saat mendapatkan saran: ${error.message}`);
    } finally {
      setIsSuggesting(false);
      setDisableButtons(false);
    }
  };

  // Memperbarui Deskripsi Adegan Utama dengan AI
  const refinePrompt = async () => {
    if (!sceneDescription.trim()) {
      setRefinementError('Mohon isi Deskripsi Adegan Utama terlebih dahulu untuk diperbarui.');
      return;
    }
    setIsRefining(true);
    setRefinementError('');
    setDisableButtons(true);

    try {
      const prompt = `Anda adalah seorang ahli prompt engineer. Perbarui dan sempurnakan deskripsi adegan berikut agar lebih mendalam, detail, dan efektif untuk model pembuatan video AI. Fokus pada penambahan detail sensorik dan bahasa visual. Hanya berikan teks yang diperbarui.
Deskripsi: ${sceneDescription.trim()}`;
      
      const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      };
      
      const apiKey = ""; 
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();

      if (result.candidates && result.candidates.length > 0) {
        const refinedText = result.candidates[0].content.parts[0].text.trim();
        setSceneDescription(refinedText);
        setImageGenPrompt(refinedText);
      } else {
        setRefinementError('Gagal memperbarui prompt. Struktur respons tidak terduga.');
      }
    } catch (error) {
      setRefinementError(`Terjadi kesalahan saat memperbarui prompt: ${error.message}`);
    } finally {
      setIsRefining(false);
      setDisableButtons(false);
    }
  };

  // Memberikan saran soundscape berdasarkan deskripsi
  const suggestSoundscape = async () => {
    if (!sceneDescription.trim()) {
      setSoundscapeError('Mohon isi Deskripsi Adegan Utama untuk mendapatkan saran soundscape.');
      return;
    }
    setIsSuggestingSoundscape(true);
    setSoundscapeError('');
    setSoundscapeSuggestion(null);
    setDisableButtons(true);

    try {
      const prompt = `Berdasarkan deskripsi adegan visual ini: '${sceneDescription.trim()}', sarankan tiga elemen soundscape untuk video yang cocok. Berikan output dalam format JSON dengan kunci 'soundtrack' (genre musik), 'sound_effects' (daftar efek suara), dan 'atmosphere' (suasana audio). Hanya berikan JSON.`;
      
      const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              "soundtrack": { "type": "STRING" },
              "sound_effects": { "type": "ARRAY", "items": { "type": "STRING" } },
              "atmosphere": { "type": "STRING" }
            },
            required: ["soundtrack", "sound_effects", "atmosphere"]
          }
        }
      };
      
      const apiKey = ""; 
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();

      if (result.candidates && result.candidates.length > 0) {
        const jsonString = result.candidates[0].content.parts[0].text;
        const parsedData = JSON.parse(jsonString);
        setSoundscapeSuggestion(parsedData);
      } else {
        setSoundscapeError('Gagal mendapatkan saran soundscape.');
      }
    } catch (error) {
      setSoundscapeError(`Terjadi kesalahan saat mendapatkan saran soundscape: ${error.message}`);
    } finally {
      setIsSuggestingSoundscape(false);
      setDisableButtons(false);
    }
  };

  // Menilai prompt teks
  const ratePrompt = async () => {
    if (!generatedPrompt.trim()) {
      setRatingError('Mohon hasilkan prompt teks terlebih dahulu untuk dinilai.');
      return;
    }
    setIsRatingPrompt(true);
    setRatingError('');
    setPromptRating(null);
    setDisableButtons(true);

    try {
      const prompt = `Analisis prompt visual JSON ini dan berikan rating dari 1-10 untuk keefektifannya. Berikan juga kritik singkat tentang kekuatan dan kelemahannya. Hanya berikan output dalam format JSON dengan kunci 'rating' (angka) dan 'critique' (string). Hanya berikan JSON.
Prompt: ${generatedPrompt.trim()}`;

      const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              "rating": { "type": "NUMBER" },
              "critique": { "type": "STRING" }
            },
            required: ["rating", "critique"]
          }
        }
      };

      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
      
      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();

      if (result.candidates && result.candidates.length > 0) {
        const jsonString = result.candidates[0].content.parts[0].text;
        const parsedData = JSON.parse(jsonString);
        setPromptRating(parsedData);
      } else {
        setRatingError('Gagal mendapatkan rating prompt.');
      }
    } catch (error) {
      setRatingError(`Terjadi kesalahan saat menilai prompt: ${error.message}`);
    } finally {
      setIsRatingPrompt(false);
      setDisableButtons(false);
    }
  };

  // Menghasilkan prompt JSON (hanya saat klik tombol)
  const generatePrompt = () => {
    const promptObject = {
      prompt: sceneDescription.trim(),
      style: style.trim() || 'cinematic', 
      mood: mood.trim() || 'epic',       
      keywords: keywords.split(',').map(kw => kw.trim()).filter(kw => kw !== ''),
      camera_angle: cameraAngle.trim() || 'wide shot', 
      lighting: lighting.trim() || 'golden hour',     
      aspect_ratio: aspectRatio,
    };
    setGeneratedPrompt(JSON.stringify(promptObject, null, 2));
    setCopySuccess('');
    savePromptToHistory(promptObject);
  };

  // Menyalin prompt ke clipboard
  const copyToClipboard = () => {
    if (generatedPrompt) {
      const textArea = document.createElement('textarea');
      textArea.value = generatedPrompt;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess('Berhasil disalin!');
      } catch (err) {
        setCopySuccess('Gagal menyalin.');
        console.error('Failed to copy text: ', err);
      }
      document.body.removeChild(textArea);
    }
  };

  // Menghasilkan gambar menggunakan Imagen 3.0 API
  const generateImages = async () => {
    if (!imageGenPrompt.trim()) {
      setImageGenError('Mohon masukkan prompt untuk pembuatan gambar.');
      return;
    }

    setIsGeneratingImages(true);
    setImageGenError('');
    setGeneratedImages([]); 
    setDisableButtons(true);

    try {
      const fullImageGenPrompt = `${imageGenPrompt.trim()}, aspect ratio ${aspectRatio}`;
      const payload = {
        instances: { 
          prompt: fullImageGenPrompt,
          negativePrompt: negativePrompt.trim() 
        }, 
        parameters: {
          sampleCount: 4, 
          aspectRatio: aspectRatio
        }
      };

      const apiKey = ""; 
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result.predictions && result.predictions.length > 0) {
        const imageUrls = result.predictions.map(pred => `data:image/png;base64,${pred.bytesBase64Encoded}`);
        setGeneratedImages(imageUrls);
      } else {
        setImageGenError('Gagal menghasilkan gambar. Struktur respons tidak terduga.');
      }
    } catch (error) {
      setImageGenError(`Terjadi kesalahan saat menghasilkan gambar: ${error.message}`);
    } finally {
      setIsGeneratingImages(false);
      setDisableButtons(false);
    }
  };

  // Mengunduh gambar
  const handleDownloadImage = (imageUrl, index) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `generated_image_${index + 1}.png`; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Fungsi Riwayat Prompt ---

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('veo3_prompt_history');
      if (storedHistory) {
        setPromptHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Gagal memuat riwayat prompt dari localStorage:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('veo3_prompt_history', JSON.stringify(promptHistory));
    } catch (error) {
      console.error("Gagal menyimpan riwayat prompt ke localStorage:", error);
    }
  }, [promptHistory]);

  const savePromptToHistory = (promptObj) => {
    const newPrompt = { ...promptObj, id: Date.now(), savedAt: new Date().toLocaleString() };
    setPromptHistory(prevHistory => [newPrompt, ...prevHistory.slice(0, 9)]);
  };

  const loadPromptFromHistory = (id) => {
    const promptToLoad = promptHistory.find(p => p.id === id);
    if (promptToLoad) {
      setSceneDescription(promptToLoad.prompt || '');
      setStyle(promptToLoad.style || '');
      setMood(promptToLoad.mood || '');
      setKeywords(promptToLoad.keywords ? promptToLoad.keywords.join(', ') : '');
      setCameraAngle(promptToLoad.camera_angle || '');
      setLighting(promptToLoad.lighting || '');
      setAspectRatio(promptToLoad.aspect_ratio || '16:9');
      setImageGenPrompt(promptToLoad.prompt || '');
      setNegativePrompt('');
      setGeneratedPrompt(JSON.stringify(promptToLoad, null, 2));
      setSelectedHistoryPrompt(id);
    }
  };

  const clearHistory = () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus semua riwayat prompt?")) {
      setPromptHistory([]);
      setSelectedHistoryPrompt('');
    }
  };

  // Menggunakan deskripsi adegan untuk prompt gambar
  const useForImageGeneration = () => {
    setImageGenPrompt(sceneDescription);
  };
  
  // Tentukan rasio aspek untuk gambar yang dihasilkan
  const imageDisplayAspectRatio = {
    '16:9': '16 / 9',
    '9:16': '9 / 16',
    '1:1': '1 / 1',
    '21:9': '21 / 9',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900 text-white p-4 sm:p-8 flex items-center justify-center">
      <div className="bg-gray-800 bg-opacity-70 backdrop-blur-md rounded-3xl shadow-2xl p-6 sm:p-10 w-full max-w-4xl border border-gray-700">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-400">
          Veo 3 Prompt Generator
        </h1>

        {/* Image Input Section for Analysis */}
        <div className="mb-8 p-4 bg-gray-700 border border-gray-600 rounded-lg">
          <label htmlFor="imageUpload" className="block text-lg font-semibold mb-2 text-purple-200">
            Unggah Gambar untuk Analisis:
          </label>
          <input
            type="file"
            id="imageUpload"
            accept="image/*"
            className="w-full p-2 bg-gray-600 border border-gray-500 rounded-lg text-white mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-600"
            onChange={handleImageChange}
            disabled={disableButtons}
          />
          {imagePreviewUrl && (
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-300 mb-2">Pratinjau Gambar:</p>
              <img src={imagePreviewUrl} alt="Pratinjau Gambar" className="max-w-full h-48 object-contain mx-auto rounded-lg border border-gray-500 shadow-md" />
            </div>
          )}
          <button
            onClick={analyzeImage}
            className={`w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold py-2 px-4 rounded-xl shadow-md transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-green-400 focus:ring-opacity-75 ${isAnalyzing ? 'opacity-70 cursor-not-allowed' : ''}`}
            disabled={isAnalyzing || disableButtons}
          >
            {isAnalyzing ? 'Menganalisis...' : 'Analisis Gambar ✨'}
          </button>
          {analysisError && (
            <p className="text-red-400 text-sm mt-2 text-center">{analysisError}</p>
          )}
        </div>

        {/* Prompt History Section */}
        <div className="mb-8 p-4 bg-gray-700 border border-gray-600 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-purple-200">Riwayat Prompt</h2>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <select
              className="flex-grow p-3 bg-gray-600 border border-gray-500 rounded-lg text-white"
              value={selectedHistoryPrompt}
              onChange={(e) => loadPromptFromHistory(parseInt(e.target.value))}
              disabled={promptHistory.length === 0 || disableButtons}
            >
              <option value="">{promptHistory.length > 0 ? "Pilih Prompt dari Riwayat" : "Riwayat Kosong"}</option>
              {promptHistory.map(p => (
                <option key={p.id} value={p.id}>
                  {p.prompt.substring(0, 50)}... ({p.savedAt})
                </option>
              ))}
            </select>
            <button
              onClick={clearHistory}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl shadow-md transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-opacity-75"
              disabled={promptHistory.length === 0 || disableButtons}
            >
              Hapus Riwayat
            </button>
          </div>
        </div>

        {/* Text Prompt Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Scene Description Input */}
          <div className="col-span-full">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="sceneDescription" className="block text-lg font-semibold text-purple-200">
                Deskripsi Adegan Utama:
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={suggestPromptDetails}
                  className={`ml-4 bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold py-1.5 px-3 rounded-full transition-colors duration-200 ${isSuggesting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={isSuggesting || disableButtons} 
                  title="Dapatkan saran AI untuk semua bidang prompt"
                >
                  {isSuggesting ? 'Menyarankan...' : 'Saran AI ✨'}
                </button>
                <button
                  onClick={refinePrompt}
                  className={`bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold py-1.5 px-3 rounded-full transition-colors duration-200 ${isRefining ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={isRefining || !sceneDescription.trim() || disableButtons}
                  title="Perbarui prompt ini dengan detail AI"
                >
                  {isRefining ? 'Memperbarui...' : 'Perbarui Prompt ✨'}
                </button>
              </div>
            </div>
            <textarea
              id="sceneDescription"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400 h-32 resize-y"
              placeholder="Contoh: Seekor naga terbang di atas kota futuristik yang diterangi neon saat matahari terbit..."
              value={sceneDescription}
              onChange={(e) => setSceneDescription(e.target.value)}
              disabled={disableButtons}
            ></textarea>
            {suggestionError && (
              <p className="text-red-400 text-sm mt-2">{suggestionError}</p>
            )}
            {refinementError && (
              <p className="text-red-400 text-sm mt-2">{refinementError}</p>
            )}
          </div>

          {/* Style Input */}
          <div>
            <label htmlFor="style" className="block text-lg font-semibold mb-2 text-purple-200">
              Gaya Visual:
            </label>
            <input
              type="text"
              id="style"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
              placeholder="Contoh: Cinematic, Anime, Watercolor, Abstract"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              disabled={disableButtons}
            />
          </div>

          {/* Mood Input */}
          <div>
            <label htmlFor="mood" className="block text-lg font-semibold mb-2 text-purple-200">
              Suasana/Mood:
            </label>
            <input
              type="text"
              id="mood"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
              placeholder="Contoh: Epik, Tenang, Misterius, Gembira"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              disabled={disableButtons}
            />
          </div>

          {/* Keywords Input */}
          <div>
            <label htmlFor="keywords" className="block text-lg font-semibold mb-2 text-purple-200">
              Kata Kunci (pisahkan dengan koma):
            </label>
            <input
              type="text"
              id="keywords"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
              placeholder="Contoh: Naga, Kota, Neon, Fajar, Terbang"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              disabled={disableButtons}
            />
          </div>

          {/* Camera Angle Input */}
          <div>
            <label htmlFor="cameraAngle" className="block text-lg font-semibold mb-2 text-purple-200">
              Sudut Kamera:
            </label>
            <input
              type="text"
              id="cameraAngle"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
              placeholder="Contoh: Wide shot, Close-up, Drone view, POV"
              value={cameraAngle}
              onChange={(e) => setCameraAngle(e.target.value)}
              disabled={disableButtons}
            />
          </div>

          {/* Lighting Input */}
          <div>
            <label htmlFor="lighting" className="block text-lg font-semibold mb-2 text-purple-200">
              Pencahayaan:
            </label>
            <input
              type="text"
              id="lighting"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
              placeholder="Contoh: Golden hour, Neon, Dramatis, Lembut"
              value={lighting}
              onChange={(e) => setLighting(e.target.value)}
              disabled={disableButtons}
            />
          </div>
        </div>

        {/* Generate Text Prompt Button */}
        <button
          onClick={generatePrompt}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-75 mb-6"
          disabled={disableButtons}
        >
          Hasilkan Prompt Teks
        </button>

        {/* Generated JSON Output and Rating */}
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 font-mono text-sm overflow-x-auto relative mb-8">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-lg font-semibold text-purple-200">
              Prompt JSON Anda:
            </label>
            <button
              onClick={ratePrompt}
              className={`bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold py-1.5 px-3 rounded-full transition-colors duration-200 ${isRatingPrompt ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={isRatingPrompt || !generatedPrompt || disableButtons}
              title="Nilai prompt ini dengan AI"
            >
              {isRatingPrompt ? 'Menilai...' : 'Nilai Prompt ✨'}
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-words text-gray-200">
            {generatedPrompt}
          </pre>
          {promptRating && (
            <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-sm font-semibold text-pink-300">Rating AI: <span className="text-white">{promptRating.rating}/10</span></p>
              <p className="text-sm text-gray-300 mt-1">Kritik: {promptRating.critique}</p>
            </div>
          )}
          {ratingError && (
              <p className="text-red-400 text-sm mt-2">{ratingError}</p>
          )}
          <div className="flex justify-end mt-4">
            <button
              onClick={useForImageGeneration}
              className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-1.5 px-3 rounded-md transition-colors duration-200 mr-2"
              title="Gunakan Deskripsi Adegan Utama untuk Prompt Gambar"
              disabled={disableButtons}
            >
              Gunakan untuk Gambar
            </button>
            <button
              onClick={copyToClipboard}
              className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold py-1.5 px-3 rounded-md transition-colors duration-200"
              title="Salin ke Clipboard"
              disabled={disableButtons}
            >
              Salin
            </button>
          </div>
          {copySuccess && (
            <span className="absolute bottom-4 right-4 text-green-400 text-xs font-semibold animate-fade-in">
              {copySuccess}
            </span>
          )}
        </div>

        {/* Soundscape Suggestion Section */}
        <div className="p-4 bg-gray-700 border border-gray-600 rounded-lg mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-blue-200">Saran Soundscape</h2>
            <button
              onClick={suggestSoundscape}
              className={`bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-1.5 px-3 rounded-full transition-colors duration-200 ${isSuggestingSoundscape ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={isSuggestingSoundscape || !sceneDescription.trim() || disableButtons}
              title="Dapatkan saran musik dan efek suara"
            >
              {isSuggestingSoundscape ? 'Menyarankan...' : 'Saran Soundscape ✨'}
            </button>
          </div>
          {soundscapeSuggestion ? (
            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-sm font-semibold text-green-300">Soundtrack: <span className="text-white">{soundscapeSuggestion.soundtrack}</span></p>
              <p className="text-sm font-semibold text-green-300 mt-1">Efek Suara: <span className="text-white">{soundscapeSuggestion.sound_effects.join(', ')}</span></p>
              <p className="text-sm font-semibold text-green-300 mt-1">Suasana: <span className="text-white">{soundscapeSuggestion.atmosphere}</span></p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Tekan tombol 'Saran Soundscape' untuk mendapatkan ide audio.</p>
          )}
          {soundscapeError && (
            <p className="text-red-400 text-sm mt-2">{soundscapeError}</p>
          )}
        </div>

        {/* --- Image Generation Section --- */}
        <div className="p-4 bg-gray-700 border border-gray-600 rounded-lg mb-8">
          <h2 className="text-3xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            Hasilkan Gambar
          </h2>
          <div className="mb-4">
            <label htmlFor="imageGenPrompt" className="block text-lg font-semibold mb-2 text-blue-200">
              Prompt untuk Gambar:
            </label>
            <textarea
              id="imageGenPrompt"
              className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400 h-24 resize-y"
              placeholder="Masukkan deskripsi gambar yang ingin Anda hasilkan. Contoh: Pemandangan kota yang ramai di bawah langit senja, gaya cyberpunk."
              value={imageGenPrompt}
              onChange={(e) => setImageGenPrompt(e.target.value)}
              disabled={disableButtons}
            ></textarea>
          </div>

          {/* Negative Prompt Input */}
          <div className="mb-4">
            <label htmlFor="negativePrompt" className="block text-lg font-semibold mb-2 text-blue-200">
              Prompt Negatif (Apa yang tidak diinginkan):
            </label>
            <textarea
              id="negativePrompt"
              className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400 h-20 resize-y"
              placeholder="Contoh: Buruk, terdistorsi, jelek, abstrak, buram"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              disabled={disableButtons}
            ></textarea>
          </div>

          {/* Aspect Ratio Input */}
          <div className="mb-6">
            <label htmlFor="aspectRatio" className="block text-lg font-semibold mb-2 text-blue-200">
              Rasio Aspek Gambar:
            </label>
            <select
              id="aspectRatio"
              className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 text-white"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              disabled={disableButtons}
            >
              <option value="16:9">16:9 (Lanskap)</option>
              <option value="9:16">9:16 (Potret)</option>
              <option value="1:1">1:1 (Persegi)</option>
              <option value="21:9">21:9 (Ultrawide)</option>
            </select>
          </div>

          <button
            onClick={generateImages}
            className={`w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-75 ${isGeneratingImages ? 'opacity-70 cursor-not-allowed' : ''}`}
            disabled={isGeneratingImages || disableButtons}
          >
            {isGeneratingImages ? 'Menghasilkan Gambar...' : 'Hasilkan 4 Gambar'}
          </button>
          {imageGenError && (
            <p className="text-red-400 text-sm mt-2 text-center">{imageGenError}</p>
          )}

          {/* Generated Images Display */}
          {isGeneratingImages && (
            <div className="flex justify-center items-center mt-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
              <p className="ml-4 text-blue-300">Gambar sedang dibuat...</p>
            </div>
          )}

          {generatedImages.length > 0 && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {generatedImages.map((imageUrl, index) => (
                <div key={index} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-600 relative"
                  style={{
                    aspectRatio: imageDisplayAspectRatio[aspectRatio],
                    width: '100%',
                    height: 'auto'
                  }}
                >
                  <img src={imageUrl} alt={`Generated Image ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-70 p-2 flex justify-between items-center">
                    <p className="text-sm text-gray-300">Gambar {index + 1}</p>
                    <button
                      onClick={() => handleDownloadImage(imageUrl, index)}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-1 px-2 rounded-md transition-colors duration-200"
                      title="Unduh Gambar"
                    >
                      Unduh
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;

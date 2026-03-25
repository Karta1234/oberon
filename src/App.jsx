import { useState, useRef, useCallback } from 'react';
import './App.css';

const STYLES = [
  { id: 'modern', label: 'Современный', emoji: '🏢' },
  { id: 'classic', label: 'Классика', emoji: '🏛️' },
  { id: 'minimalism', label: 'Минимализм', emoji: '⬜' },
  { id: 'loft', label: 'Лофт', emoji: '🧱' },
  { id: 'scandi', label: 'Скандинавский', emoji: '🌿' },
  { id: 'hightech', label: 'Хай-тек', emoji: '⚡' },
  { id: 'provence', label: 'Прованс', emoji: '🌻' },
  { id: 'neoclassic', label: 'Неоклассика', emoji: '✨' },
];

const API_BASE = 'https://polza.ai/api/v1/media';
const POLL_INTERVAL = 4000;
const MAX_POLL_ATTEMPTS = 75;

function ImageCard({ title, hint, image, onChange }) {
  const fileRef = useRef(null);

  const handleUrlChange = (e) => {
    const url = e.target.value;
    if (url.trim()) {
      onChange({ type: 'url', data: url.trim(), preview: url.trim() });
    } else {
      onChange(null);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ type: 'base64', data: reader.result, preview: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const clear = () => {
    onChange(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="url-card">
      <h3>{title}</h3>
      <p className="hint">{hint}</p>

      {image?.type === 'base64' ? (
        <div className="file-preview">
          <img src={image.preview} alt={title} className="url-preview-img" />
          <button type="button" className="clear-btn" onClick={clear}>
            Удалить
          </button>
        </div>
      ) : (
        <>
          <input
            className="url-input"
            type="url"
            placeholder="https://example.com/image.jpg"
            value={image?.data || ''}
            onChange={handleUrlChange}
          />
          {image?.preview && (
            <img
              src={image.preview}
              alt={title}
              className="url-preview-img"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
              onLoad={(e) => {
                e.target.style.display = 'block';
              }}
            />
          )}
        </>
      )}

      <div className="file-upload-divider">или</div>
      <button type="button" className="file-upload-btn" onClick={() => fileRef.current?.click()}>
        Загрузить файл
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  );
}

function FurnitureList({ images, onChange }) {
  const fileRef = useRef(null);

  const addUrl = () => {
    onChange([...images, { type: 'url', data: '', preview: '' }]);
  };

  const addFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange([...images, { type: 'base64', data: reader.result, preview: reader.result }]);
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const updateUrl = (index, url) => {
    const updated = [...images];
    updated[index] = { type: 'url', data: url, preview: url };
    onChange(updated);
  };

  const remove = (index) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="url-card furniture-card">
      <h3>Фото мебели</h3>
      <p className="hint">Добавьте одно или несколько фото мебели для размещения</p>

      {images.map((img, i) => (
        <div key={i} className="furniture-item">
          {img.type === 'base64' ? (
            <div className="file-preview">
              <img src={img.preview} alt={`Мебель ${i + 1}`} className="url-preview-img" />
            </div>
          ) : (
            <>
              <input
                className="url-input"
                type="url"
                placeholder="https://example.com/furniture.jpg"
                value={img.data}
                onChange={(e) => updateUrl(i, e.target.value)}
              />
              {img.preview && (
                <img
                  src={img.preview}
                  alt={`Мебель ${i + 1}`}
                  className="url-preview-img"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                  onLoad={(e) => {
                    e.target.style.display = 'block';
                  }}
                />
              )}
            </>
          )}
          <button type="button" className="clear-btn" onClick={() => remove(i)}>
            Удалить
          </button>
        </div>
      ))}

      <div className="furniture-actions">
        <button type="button" className="file-upload-btn" onClick={addUrl}>
          + URL
        </button>
        <button type="button" className="file-upload-btn" onClick={() => fileRef.current?.click()}>
          + Файл
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={addFile}
        />
      </div>
    </div>
  );
}

export default function App() {
  const [roomImage, setRoomImage] = useState(null);
  const [furnitureImages, setFurnitureImages] = useState([]);
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem('polza_token') || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusText, setStatusText] = useState('');
  const [finalPrompt, setFinalPrompt] = useState('');
  const abortRef = useRef(null);

  const handleTokenChange = (val) => {
    setToken(val);
    localStorage.setItem('polza_token', val);
  };

  const toggleStyle = (id) => {
    setSelectedStyles((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const buildPrompt = () => {
    const stylePart = selectedStyles.length
      ? `Стиль: ${selectedStyles.map((id) => STYLES.find((s) => s.id === id)?.label).join(', ')}. `
      : '';
    const userPart = prompt.trim() ? prompt.trim() + ' ' : '';
    const countPart =
      furnitureImages.length > 1
        ? `На фотографиях представлено ${furnitureImages.length} предметов мебели — размести каждый из них в интерьере. `
        : '';
    return (
      `Размести мебель в помещении с предчистовой отделкой. ` +
      `${countPart}` +
      `Сохрани пропорции комнаты, перспективу и освещение. ` +
      `${stylePart}${userPart}` +
      `Результат должен выглядеть как профессиональная фотография реального интерьера.`
    );
  };

  const rebuildPrompt = () => {
    setFinalPrompt(buildPrompt());
  };

  const pollResult = useCallback(async (generationId, bearerToken) => {
    let elapsed = 0;
    const maxWait = POLL_INTERVAL * MAX_POLL_ATTEMPTS;

    while (elapsed < maxWait) {
      if (abortRef.current?.aborted) throw new Error('Генерация отменена');

      setStatusText(`Генерация... (${Math.round(elapsed / 1000)} сек)`);

      const res = await fetch(`${API_BASE}/${generationId}`, {
        headers: { Authorization: `Bearer ${bearerToken}` },
        signal: abortRef.current,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error?.message || `Ошибка polling: HTTP ${res.status}`);
      }

      const json = await res.json();

      if (json.status === 'completed') return json.data?.url;
      if (json.status === 'failed') throw new Error(`Ошибка: ${json.error}`);

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      elapsed += POLL_INTERVAL;
    }

    throw new Error('Превышено время ожидания (5 минут). Попробуйте снова.');
  }, []);

  const handleGenerate = async () => {
    const validFurniture = furnitureImages.filter((img) => img.data.trim());
    if (!roomImage || !validFurniture.length) return;
    if (!token.trim()) {
      setError('Укажите Bearer Token');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setStatusText('Отправка запроса...');

    const controller = new AbortController();
    abortRef.current = controller.signal;

    try {
      const allImages = [
        { type: roomImage.type, data: roomImage.data },
        ...validFurniture.map((img) => ({ type: img.type, data: img.data })),
      ];

      const body = {
        model: 'google/gemini-3.1-flash-image-preview',
        input: {
          prompt: finalPrompt || buildPrompt(),
          aspect_ratio: '4:3',
          images: allImages,
          image_resolution: '2K',
          quality: 'high',
          output_format: 'png',
          max_images: 1,
          strength: 0.8,
        },
        async: true,
      };

      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.error?.code) {
        throw new Error(data.error.message || 'Ошибка генерации');
      }

      if (data.status === 'completed' && data.data?.url) {
        setResult(data.data.url);
      } else {
        const generationId = data.id;
        if (!generationId) throw new Error('Не удалось получить ID генерации из ответа API');

        setStatusText('Ожидание результата...');
        const imageData = await pollResult(generationId, token.trim());
        setResult(imageData);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setStatusText('');
      abortRef.current = null;
    }
  };

  const validFurniture = furnitureImages.filter((img) => img.data.trim());
  const canGenerate = roomImage && validFurniture.length > 0 && !loading;

  return (
    <>
      <header className="app-header">
        <p>Загрузите фото помещения и мебели — AI разместит мебель в интерьере</p>
      </header>

      <div className="api-key-section">
        <label>Polza AI Token:</label>
        <input
          className="api-key-input"
          type="password"
          placeholder="Bearer token..."
          value={token}
          onChange={(e) => handleTokenChange(e.target.value)}
        />
      </div>

      <div className="upload-section">
        <ImageCard
          title="Фото помещения"
          hint="Фото комнаты с предчистовой отделкой"
          image={roomImage}
          onChange={setRoomImage}
        />
        <FurnitureList images={furnitureImages} onChange={setFurnitureImages} />
      </div>

      <div className="styles-section">
        <h3>Стиль интерьера</h3>
        <div className="styles-grid">
          {STYLES.map((style) => (
            <label
              key={style.id}
              className={`style-chip ${selectedStyles.includes(style.id) ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={selectedStyles.includes(style.id)}
                onChange={() => toggleStyle(style.id)}
              />
              <span>{style.emoji}</span>
              <span>{style.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="prompt-section">
        <h3>Дополнительные пожелания</h3>
        <textarea
          className="prompt-input"
          placeholder="Например: светлые стены, деревянный пол, тёплое освещение..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      <div className="final-prompt-section">
        <div className="final-prompt-header">
          <h3>Итоговый промпт</h3>
          <button type="button" className="rebuild-btn" onClick={rebuildPrompt}>
            Собрать промпт
          </button>
        </div>
        <textarea
          className="final-prompt-input"
          placeholder="Нажмите «Собрать промпт» или введите свой текст..."
          value={finalPrompt}
          onChange={(e) => setFinalPrompt(e.target.value)}
        />
      </div>

      {error && <div className="error-msg">{error}</div>}

      <button
        className={`generate-btn ${loading ? 'loading' : ''}`}
        disabled={!canGenerate}
        onClick={handleGenerate}>
        {loading ? statusText || 'Генерация...' : 'Сгенерировать'}
      </button>

      <div className="result-section">
        <h3>Результат</h3>
        {result ? (
          <img src={result} alt="Результат генерации" className="result-img" />
        ) : (
          <div className="result-placeholder">Здесь появится сгенерированное изображение</div>
        )}
      </div>
    </>
  );
}

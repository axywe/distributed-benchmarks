// src/components/Dashboard.tsx
import React, { useEffect, useState } from 'react';

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

const Dashboard: React.FC = () => {
  const [path, setPath] = useState<string>('');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/files?path=${encodeURIComponent(path)}`);
      const json = await res.json();
      setEntries(json.data || []);
    } catch (e) {
      alert('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [path]);

  const navigateTo = (sub: string) => {
    setPath(prev => (prev ? `${prev}/${sub}` : sub));
  };

  const goUp = () => {
    setPath(prev => prev.split('/').slice(0, -1).join('/'));
  };

  const createFolder = async () => {
    if (!newFolderName) return;
    await fetch('/api/v1/folders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, name: newFolderName }),
    });
    setNewFolderName('');
    fetchFiles();
  };

  const deleteEntry = async (name: string) => {
    if (!window.confirm(`Удалить ${name}?`)) return;
    await fetch('/api/v1/files', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `${path}/${name}`.replace(/^\/+/, '') }),
    });
    fetchFiles();
  };

  const uploadFile = async () => {
    if (!fileToUpload) return;
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('path', path);
    await fetch('/api/v1/files/upload', {
      method: 'POST',
      body: formData,
    });
    setFileToUpload(null);
    fetchFiles();
  };

  return (
    <div className="container mt-4">
      <h2>Файловый обменник</h2>
      <p>Текущий путь: <strong>{path || '/'}</strong></p>

      <div className="mb-3">
        <button className="btn btn-secondary btn-sm me-2" onClick={goUp} disabled={!path}>
          Вверх
        </button>

        <input
          type="text"
          className="form-control d-inline-block w-auto me-2"
          placeholder="Новая папка"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
        />
        <button className="btn btn-outline-primary btn-sm me-2" onClick={createFolder}>
          Создать папку
        </button>

        <input
          type="file"
          className="form-control d-inline-block w-auto me-2"
          onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
        />
        <button className="btn btn-success btn-sm" onClick={uploadFile}>
          Загрузить
        </button>
      </div>

      {loading ? <p>Загрузка...</p> : (
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Тип</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.path}>
                <td>
                  {entry.is_dir ? (
                    <button className="btn btn-link" onClick={() => navigateTo(entry.name)}>
                      📁 {entry.name}
                    </button>
                  ) : (
                    entry.name
                  )}
                </td>
                <td>{entry.is_dir ? 'Папка' : 'Файл'}</td>
                <td>
                  {!entry.is_dir && (
                    <a
                      className="btn btn-sm btn-outline-secondary me-2"
                      href={`/api/v1/files/raw?path=${encodeURIComponent(path)}&name=${entry.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Скачать
                    </a>
                  )}
                  <button className="btn btn-sm btn-danger" onClick={() => deleteEntry(entry.name)}>
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-muted">
                  Пусто
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Dashboard;

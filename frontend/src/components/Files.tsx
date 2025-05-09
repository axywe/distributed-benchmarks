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
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setEntries(json.data || []);
    } catch (err: any) {
      alert('Ошибка загрузки списка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [path]);

  const navigateTo = (sub: string) => {
    setPath(p => (p ? `${p}/${sub}` : sub));
  };

  const goUp = () => {
    setPath(p => p.split('/').slice(0, -1).join('/'));
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      return alert('Введите имя папки');
    }
    try {
      const res = await fetch('/api/v1/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, name: newFolderName }),
      });      
      if (!res.ok) throw new Error(await res.text());
      setNewFolderName('');
      await fetchFiles();
    } catch (err: any) {
      alert('Не удалось создать папку: ' + err.message);
    }
  };

    const deleteEntry = async (name: string) => {
        const fullPath = path ? `${path}/${name}` : name;
        const url = `/api/v1/files/${encodeURIComponent(fullPath)}`;
    
        if (!window.confirm(`Удалить «${name}»?`)) return;
    
        const res = await fetch(url, { method: 'DELETE' });
        if (!res.ok) {
            const txt = await res.text();
            return alert('Не удалось удалить: ' + txt);
        }

        fetchFiles();
    };
  

  const uploadFile = async () => {
    if (!fileToUpload) return;
    const formData = new FormData();
    formData.append('file', fileToUpload);

    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/files/upload?path=${encodeURIComponent(path)}`,
        { method: 'POST', body: formData }
      );
      if (!res.ok) throw new Error(await res.text());
      setFileToUpload(null);
      await fetchFiles();
    } catch (err: any) {
      alert('Ошибка загрузки файла: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (name: string) => {
    try {
      const res = await fetch(
        `/api/v1/files/raw?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`
      );
      if (!res.ok) throw new Error(res.statusText);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Ошибка скачивания: ' + err.message);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Файловый обменник</h2>
      <p>Текущий путь: <strong>{path || '/'}</strong></p>

      <div className="mb-3">
        <button
          type="button"
          className="btn btn-secondary btn-sm me-2"
          onClick={goUp}
          disabled={!path}
        >
          Вверх
        </button>

        <input
          type="text"
          className="form-control d-inline-block w-auto me-2"
          placeholder="Новая папка"
          value={newFolderName}
          onChange={e => setNewFolderName(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-outline-primary btn-sm me-2"
          onClick={createFolder}
        >
          Создать папку
        </button>

        <input
          type="file"
          className="form-control d-inline-block w-auto me-2"
          onChange={e => setFileToUpload(e.target.files?.[0] || null)}
        />
        <button
          type="button"
          className="btn btn-success btn-sm"
          onClick={uploadFile}
          disabled={!fileToUpload || loading}
        >
          {loading ? 'Загрузка…' : 'Загрузить'}
        </button>
      </div>

      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Тип</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.path}>
                <td>
                  {entry.is_dir ? (
                    <button
                      type="button"
                      className="btn btn-link"
                      onClick={() => navigateTo(entry.name)}
                    >
                      📁 {entry.name}
                    </button>
                  ) : (
                    entry.name
                  )}
                </td>
                <td>{entry.is_dir ? 'Папка' : 'Файл'}</td>
                <td>
                  {!entry.is_dir && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary me-2"
                      onClick={() => downloadFile(entry.name)}
                    >
                      Скачать
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteEntry(entry.name)}
                  >
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

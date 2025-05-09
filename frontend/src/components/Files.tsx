import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import strings from '../i18n';

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

const Files: React.FC = () => {
  const [path, setPath] = useState<string>('');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [authHeader, setAuthHeader] = useState<Record<string, string> | null>(null);
  const navigate = useNavigate();

  const handleAuthError = () => {
    navigate('/login');
  };

  const fetchFiles = async () => {
    if (!authHeader) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/files?path=${encodeURIComponent(path)}`,
        { headers: authHeader }
      );
      if (res.status === 401) return handleAuthError();
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setEntries(json.data || []);
    } catch (err: any) {
      alert(strings.files.error_loading_list + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
    } else {
      setAuthHeader({ Authorization: `Bearer ${token}` });
    }
  }, [navigate]);

  useEffect(() => {
    if (authHeader) {
      fetchFiles();
    }
  }, [path, authHeader]);

  const navigateTo = (sub: string) => {
    setPath(p => (p ? `${p}/${sub}` : sub));
  };

  const goUp = () => {
    setPath(p => p.split('/').slice(0, -1).join('/'));
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !authHeader) return alert(strings.files.enter_folder_name);
    try {
      const res = await fetch('/api/v1/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({ path, name: newFolderName }),
      });
      if (res.status === 401) return handleAuthError();
      if (!res.ok) throw new Error(await res.text());
      setNewFolderName('');
      await fetchFiles();
    } catch (err: any) {
      alert(strings.files.error_create_folder + err.message);
    }
  };

  const deleteEntry = async (name: string) => {
    if (!authHeader) return;
    const fullPath = path ? `${path}/${name}` : name;
    if (!window.confirm(`${strings.files.delete} «${name}»?`)) return;
    try {
      const res = await fetch(
        `/api/v1/files/${encodeURIComponent(fullPath)}`,
        { method: 'DELETE', headers: authHeader }
      );
      if (res.status === 401) return handleAuthError();
      if (!res.ok) throw new Error(await res.text());
      await fetchFiles();
    } catch (err: any) {
      alert(strings.files.error_delete + err.message);
    }
  };

  const uploadFile = async () => {
    if (!fileToUpload || !authHeader) return;
    const formData = new FormData();
    formData.append('file', fileToUpload);

    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/files/upload?path=${encodeURIComponent(path)}`,
        {
          method: 'POST',
          headers: authHeader,
          body: formData
        }
      );
      if (res.status === 401) return handleAuthError();
      if (!res.ok) throw new Error(await res.text());
      setFileToUpload(null);
      await fetchFiles();
    } catch (err: any) {
      alert(strings.files.error_upload_file + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (name: string) => {
    if (!authHeader) return;
    try {
      const res = await fetch(
        `/api/v1/files/raw?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`,
        { headers: authHeader }
      );
      if (res.status === 401) return handleAuthError();
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
      alert(strings.files.error_download + err.message);
    }
  };

  return (
    <div className="container mt-4">
      <h2>{strings.files.title}</h2>
      <p>{strings.files.current_path} <strong>{path || '/'}</strong></p>

      <div className="mb-3">
        <button
          type="button"
          className="btn btn-secondary btn-sm me-2"
          onClick={goUp}
          disabled={!path}
        >
          {strings.files.up}
        </button>

        <input
          type="text"
          className="form-control d-inline-block w-auto me-2"
          placeholder={strings.files.new_folder_placeholder}
          value={newFolderName}
          onChange={e => setNewFolderName(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-outline-primary btn-sm me-2"
          onClick={createFolder}
        >
          {strings.files.create_folder}
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
          {loading ? strings.files.uploading : strings.files.upload}
        </button>
      </div>

      {loading
        ? <p>{strings.files.loading}</p>
        : (
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>{strings.files.table.name}</th>
                <th>{strings.files.table.type}</th>
                <th>{strings.files.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.path}>
                  <td>
                    {entry.is_dir
                      ? <button
                          type="button"
                          className="btn btn-link"
                          onClick={() => navigateTo(entry.name)}
                        >
                          📁 {entry.name}
                        </button>
                      : entry.name
                    }
                  </td>
                  <td>{entry.is_dir ? strings.files.type.folder : strings.files.type.file}</td>
                  <td>
                    {!entry.is_dir && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => downloadFile(entry.name)}
                      >
                        {strings.files.download}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteEntry(entry.name)}
                    >
                      {strings.files.delete}
                    </button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted">
                    {strings.files.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )
      }
    </div>
  );
};

export default Files;

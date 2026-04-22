import React, { useState } from 'react';
import { Btn, T } from './primitives.jsx';
import { API } from './data.jsx';

export function NewMediaModal({ onClose }) {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return;

    setIsSubmitting(true);
    try {
      const { signedUrl, publicUrl } = await API.getSignedUrl(file.name, file.type);

      await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      await API.uploadMedia({
        mediaFormat: file.type.startsWith('video/') ? 'VIDEO' : 'PHOTO',
        sourceUrl: publicUrl,
        description: description,
        locationAssociation: {
          category: 'ADDITIONAL'
        }
      });

      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 20, width: 500 }}>
      <h2>Upload new media</h2>
      <input
        type="file"
        onChange={handleFileChange}
        style={{ width: "100%", marginBottom: 10, padding: 10, borderRadius: 6, border: `1px solid ${T.line}` }}
      />
      <input
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description"
        style={{ width: "100%", marginBottom: 10, padding: 10, borderRadius: 6, border: `1px solid ${T.line}` }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn tone="solid" onClick={handleSubmit} disabled={isSubmitting || !file}>
          {isSubmitting ? "Uploading..." : "Upload Media"}
        </Btn>
      </div>
    </div>
  );
}

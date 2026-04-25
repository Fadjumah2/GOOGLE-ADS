import React, { useState } from 'react';
import { Btn, T, showToast } from './primitives.jsx';
import { API } from './data.jsx';

export function NewPostModal({ onClose }) {
  const [summary, setSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!summary.trim()) {
      showToast("Post summary is required.", "bad");
      return;
    }
    setIsSubmitting(true);
    try {
      await API.createPost({ postData: { summary, languageCode: 'en' } });
      showToast("Post created.", "good");
      onClose();
    } catch (e) {
      console.error(e);
      showToast(e.message || "Failed to create post.", "bad");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 20, width: 500 }}>
      <h2>Create a new post</h2>
      <textarea
        value={summary}
        onChange={e => setSummary(e.target.value)}
        placeholder="Write your post summary here..."
        style={{ width: "100%", height: 150, marginBottom: 10, padding: 10, borderRadius: 6, border: `1px solid ${T.line}` }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn tone="solid" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Create Post"}
        </Btn>
      </div>
    </div>
  );
}

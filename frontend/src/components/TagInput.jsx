import { useState } from 'react';

const TagInput = ({ label, name, value, onChange, suggestions = [], placeholder, required }) => {
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const tag = draft.trim();
    if (!tag) return;
    const exists = value.some((t) => t.toLowerCase() === tag.toLowerCase());
    if (!exists) {
      onChange([...value, tag]);
    }
    setDraft('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (tag) => onChange(value.filter((t) => t !== tag));

  return (
    <div className="form-group">
      <label htmlFor={name}>
        {label} {required && <span className="required-star">*</span>}
      </label>
      <div className="tag-input">
        <input
          id={name}
          list={`${name}-list`}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
        />
        <datalist id={`${name}-list`}>
          {suggestions.map((s) => (
            <option key={s._id} value={s.name} />
          ))}
        </datalist>
        <button type="button" className="btn btn-sm btn-outline" onClick={addTag}>
          Add
        </button>
      </div>
      {value.length > 0 && (
        <div className="tags">
          {value.map((tag) => (
            <span key={tag} className="tag">
              {tag}
              <button
                type="button"
                className="tag-remove"
                aria-label={`Remove ${tag}`}
                onClick={() => removeTag(tag)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;
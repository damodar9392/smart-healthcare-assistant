import { useState } from 'react';
import { getStoredTheme, toggleTheme } from '../utils/theme';

const ThemeToggle = () => {
  const [theme, setThemeState] = useState(() => getStoredTheme());

  const onToggle = () => {
    setThemeState(toggleTheme());
  };

  return (
    <button
      type="button"
      className="btn btn-outline btn-sm theme-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? 'Dark' : 'Light'}
    </button>
  );
};

export default ThemeToggle;
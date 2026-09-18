import { useTheme } from "../../context/useTheme";

function ThemeToggle({ className = "", floating = false }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-toggle ${className} ${floating ? "theme-toggle-floating" : ""}`}
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <svg
          className="theme-toggle-icon"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="3.4" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <line x1="8" y1="1.4" x2="8" y2="2.8" />
            <line x1="8" y1="13.2" x2="8" y2="14.6" />
            <line x1="1.4" y1="8" x2="2.8" y2="8" />
            <line x1="13.2" y1="8" x2="14.6" y2="8" />
            <line x1="3.33" y1="3.33" x2="4.34" y2="4.34" />
            <line x1="11.66" y1="11.66" x2="12.67" y2="12.67" />
            <line x1="12.67" y1="3.33" x2="11.66" y2="4.34" />
            <line x1="4.34" y1="11.66" x2="3.33" y2="12.67" />
          </g>
        </svg>
      ) : (
        <svg
          className="theme-toggle-icon"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M8.55 1.55a.55.55 0 0 0-.14.56 4.6 4.6 0 0 1-1.05 5.05 4.6 4.6 0 0 1-5.05 1.05.55.55 0 0 0-.71.68 6.9 6.9 0 0 0 11.86-2.04 6.9 6.9 0 0 0-3.5-6.03.55.55 0 0 0-.41-.27Z"
          />
        </svg>
      )}
    </button>
  );
}

export default ThemeToggle;
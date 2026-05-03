import coreWebVitals from "eslint-config-next/core-web-vitals"

/**
 * Next.js 16 + flat ESLint (no `next lint` subcommand).
 * Alcune regole react-hooks v7 sono troppo rigide per il codice esistente;
 * restano attive le regole core/hooks classiche inclusa `react-hooks/rules-of-hooks`.
 */
const eslintConfig = [
  ...coreWebVitals,
  {
    rules: {
      // Evita refactor massivo dei pattern async + useEffect esistenti
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",

      // Frasi UX in JSX (chat placeholder)
      "react/no-unescaped-entities": "off",

      "import/no-anonymous-default-export": "off",
    },
  },
]

export default eslintConfig

"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginFormDebug() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");
  const router = useRouter();

  // Auto-reset loading dopo 10 secondi per sicurezza
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
        setDebugInfo("Timeout: loading resettato automaticamente");
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDebugInfo("Submit cliccato...");
    setLoading(true);
    setError("");

    try {
      setDebugInfo("Chiamo signIn...");
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      
      setDebugInfo("Risultato ricevuto: " + JSON.stringify(result));
      setLoading(false);
      
      if (result?.error) {
        setError("Errore: " + result.error);
      } else if (result?.ok) {
        setDebugInfo("Login OK, redirect...");
        router.push("/dashboard");
      } else {
        setError("Risultato sconosciuto");
      }
    } catch (err: any) {
      setDebugInfo("Errore catch: " + err.message);
      setError("Errore: " + err.message);
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setDebugInfo("Test API...");
    try {
      const res = await fetch("/api/auth/providers");
      const data = await res.json();
      setDebugInfo("Providers: " + JSON.stringify(data));
    } catch (err: any) {
      setDebugInfo("Test failed: " + err.message);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Caricamento..." : "Accedi"}
        </button>
      </form>

      <button
        onClick={testConnection}
        className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
      >
        Test API Connection
      </button>

      {debugInfo && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs font-mono">
          <strong>Debug:</strong><br/>
          {debugInfo}
        </div>
      )}

      <div className="text-xs text-gray-400">
        loading: {loading ? "true" : "false"}
      </div>
    </div>
  );
}

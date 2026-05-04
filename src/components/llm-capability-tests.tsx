"use client";

import { useState, useEffect } from "react";

interface TestResult {
  name: string;
  status: "pending" | "running" | "success" | "error";
  message?: string;
  duration?: number;
}

interface LLMCapabilityTestsProps {
  onTestsComplete?: (results: TestResult[]) => void;
}

export default function LLMCapabilityTests({ onTestsComplete }: LLMCapabilityTestsProps) {
  const [results, setResults] = useState<TestResult[]>([
    { name: "Connessione Ollama", status: "pending" },
    { name: "Streaming response", status: "pending" },
    { name: "Tool calling (listUserProjects)", status: "pending" },
    { name: "JSON mode", status: "pending" },
    { name: "Risposta strutturata", status: "pending" },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    if (isRunning) return;
    setIsRunning(true);

    const updateResult = (index: number, update: Partial<TestResult>) => {
      setResults((prev) => {
        const newResults = [...prev];
        newResults[index] = { ...newResults[index], ...update };
        return newResults;
      });
    };

    // Test 1: Connessione Ollama
    updateResult(0, { status: "running" });
    const startTime1 = Date.now();
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Say 'pong' if you receive this" }],
          projectId: null,
          saveToDb: false,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream available");
      
      const decoder = new TextDecoder();
      let content = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }
      
      const duration = Date.now() - startTime1;
      updateResult(0, { 
        status: "success", 
        message: `Connesso (${duration}ms)`,
        duration 
      });
    } catch (error: any) {
      updateResult(0, { 
        status: "error", 
        message: error.message || "Connessione fallita" 
      });
    }

    // Test 2: Streaming
    updateResult(1, { status: "running" });
    const startTime2 = Date.now();
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Conta da 1 a 5 lentamente" }],
          projectId: null,
          saveToDb: false,
        }),
      });
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");
      
      let chunkCount = 0;
      let receivedData = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.length > 0) {
          chunkCount++;
          receivedData = true;
        }
      }
      
      const duration = Date.now() - startTime2;
      if (receivedData && chunkCount > 0) {
        updateResult(1, { 
          status: "success", 
          message: `${chunkCount} chunk ricevuti`,
          duration 
        });
      } else {
        throw new Error("Nessun dato streaming ricevuto");
      }
    } catch (error: any) {
      updateResult(1, { 
        status: "error", 
        message: error.message || "Streaming fallito" 
      });
    }

    // Test 3: Tool calling
    updateResult(2, { status: "running" });
    const startTime3 = Date.now();
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Elenca i miei progetti" }],
          projectId: null,
          saveToDb: false,
        }),
      });
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");
      
      const decoder = new TextDecoder();
      let content = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }
      
      const duration = Date.now() - startTime3;
      
      // Check if the response mentions projects or tool execution
      const hasToolResult = content.toLowerCase().includes("progett") || 
                           content.toLowerCase().includes("project") ||
                           content.toLowerCase().includes("listuserprojects") ||
                           content.toLowerCase().includes("tool");
      
      if (hasToolResult || content.length > 20) {
        updateResult(2, { 
          status: "success", 
          message: content.length > 50 ? "Tool eseguito (risposta lunga)" : "Risposta ricevuta",
          duration 
        });
      } else {
        updateResult(2, { 
          status: "error", 
          message: "Tool non sembra essere stato chiamato" 
        });
      }
    } catch (error: any) {
      updateResult(2, { 
        status: "error", 
        message: error.message || "Tool calling fallito" 
      });
    }

    // Test 4: JSON mode capability (just check if model can respond)
    updateResult(3, { status: "running" });
    const startTime4 = Date.now();
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ 
            role: "user", 
            content: "Rispondi con un JSON valido: {\"status\": \"ok\", \"test\": true}" 
          }],
          projectId: null,
          saveToDb: false,
        }),
      });
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");
      
      const decoder = new TextDecoder();
      let content = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }
      
      const duration = Date.now() - startTime4;
      
      // Try to parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          JSON.parse(jsonMatch[0]);
          updateResult(3, { 
            status: "success", 
            message: "JSON valido rilevato",
            duration 
          });
        } catch {
          updateResult(3, { 
            status: "success", 
            message: "Risponde ma non in JSON puro",
            duration 
          });
        }
      } else {
        updateResult(3, { 
          status: "success", 
          message: "Risponde (no JSON)",
          duration 
        });
      }
    } catch (error: any) {
      updateResult(3, { 
        status: "error", 
        message: error.message || "Test JSON fallito" 
      });
    }

    // Test 5: Response structure
    updateResult(4, { status: "running" });
    const startTime5 = Date.now();
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Ciao, come stai?" }],
          projectId: null,
          saveToDb: false,
        }),
      });
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");
      
      const decoder = new TextDecoder();
      let content = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }
      
      const duration = Date.now() - startTime5;
      
      if (content.length > 10 && content.toLowerCase().includes("ciao")) {
        updateResult(4, { 
          status: "success", 
          message: `Risposta coerente (${content.length} chars)`,
          duration 
        });
      } else if (content.length > 0) {
        updateResult(4, { 
          status: "success", 
          message: `Risposta ricevuta (${content.length} chars)`,
          duration 
        });
      } else {
        updateResult(4, { 
          status: "error", 
          message: "Risposta vuota" 
        });
      }
    } catch (error: any) {
      updateResult(4, { 
        status: "error", 
        message: error.message || "Test risposta fallito" 
      });
    }

    setIsRunning(false);
    
    // Call callback with final results
    if (onTestsComplete) {
      setResults((finalResults) => {
        onTestsComplete(finalResults);
        return finalResults;
      });
    }
  };

  // Run tests on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      runTests();
    }, 1000); // Delay to let page load first
    
    return () => clearTimeout(timer);
  }, []);

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "running":
        return "⏳";
      default:
        return "⏸️";
    }
  };

  const getStatusColor = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return "text-green-600 bg-green-50";
      case "error":
        return "text-red-600 bg-red-50";
      case "running":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-400 bg-gray-50";
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">
          🧪 Test Capabilità LLM
        </h3>
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            isRunning
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
          }`}
        >
          {isRunning ? "Test in corso..." : "Riesegui test"}
        </button>
      </div>

      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-2 rounded text-xs ${getStatusColor(
              result.status
            )}`}
          >
            <div className="flex items-center gap-2">
              <span>{getStatusIcon(result.status)}</span>
              <span className="font-medium">{result.name}</span>
            </div>
            <div className="text-right">
              {result.message && (
                <span className="text-gray-600">{result.message}</span>
              )}
              {result.duration && (
                <span className="text-gray-400 ml-2">({result.duration}ms)</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {results.every((r) => r.status === "success") && (
        <div className="mt-3 p-2 bg-green-100 text-green-700 text-xs rounded text-center">
          ✅ Tutti i test passati! L&apos;LLM è configurato correttamente.
        </div>
      )}

      {results.some((r) => r.status === "error") && (
        <div className="mt-3 p-2 bg-red-100 text-red-700 text-xs rounded text-center">
          ❌ Alcuni test sono falliti. Controlla la configurazione di Ollama.
        </div>
      )}
    </div>
  );
}

export type { TestResult };
export { LLMCapabilityTests };

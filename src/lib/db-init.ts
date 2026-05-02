import { initializeVectorExtension } from "./vector-db"

// Inizializza estensioni database all'avvio
export async function initializeDatabase() {
  try {
    await initializeVectorExtension()
    console.log("[DB] Database initialized with vector extension")
  } catch (error) {
    console.error("[DB] Database initialization failed:", error)
    // Non blocca l'avvio se sqlite-vec non è installato
    console.log("[DB] Continuing without vector extension...")
  }
}

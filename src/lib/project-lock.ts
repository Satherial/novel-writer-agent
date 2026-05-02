import { prisma } from "../../prisma/config"

// Durata del lock in millisecondi (5 minuti)
const LOCK_DURATION_MS = 5 * 60 * 1000

export type LockOwner = "ai" | "user"

export interface LockInfo {
  id: string
  projectId: string
  filePath: string
  lockedBy: LockOwner
  lockedAt: Date
  expiresAt: Date
}

// Acquisisci un lock su un file
export async function acquireLock(
  projectId: string,
  filePath: string,
  lockedBy: LockOwner
): Promise<LockInfo> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS)

  // Verifica se esiste già un lock valido
  const existingLock = await prisma.fileLock.findFirst({
    where: {
      projectId,
      filePath,
      expiresAt: {
        gt: now, // Lock non scaduto
      },
    },
  })

  if (existingLock) {
    throw new Error(`File is locked by ${existingLock.lockedBy} until ${existingLock.expiresAt.toISOString()}`)
  }

  // Cancella eventuali lock scaduti per lo stesso file
  await prisma.fileLock.deleteMany({
    where: {
      projectId,
      filePath,
    },
  })

  // Crea nuovo lock
  const lock = await prisma.fileLock.create({
    data: {
      projectId,
      filePath,
      lockedBy,
      lockedAt: now,
      expiresAt,
    },
  })

  return {
    id: lock.id,
    projectId: lock.projectId,
    filePath: lock.filePath,
    lockedBy: lock.lockedBy as LockOwner,
    lockedAt: lock.lockedAt,
    expiresAt: lock.expiresAt,
  }
}

// Rilascia un lock
export async function releaseLock(
  projectId: string,
  filePath: string,
  lockedBy: LockOwner
): Promise<void> {
  await prisma.fileLock.deleteMany({
    where: {
      projectId,
      filePath,
      lockedBy,
    },
  })
}

// Verifica se un file è lockato
export async function isLocked(
  projectId: string,
  filePath: string
): Promise<LockInfo | null> {
  const now = new Date()

  const lock = await prisma.fileLock.findFirst({
    where: {
      projectId,
      filePath,
      expiresAt: {
        gt: now,
      },
    },
  })

  if (!lock) return null

  return {
    id: lock.id,
    projectId: lock.projectId,
    filePath: lock.filePath,
    lockedBy: lock.lockedBy as LockOwner,
    lockedAt: lock.lockedAt,
    expiresAt: lock.expiresAt,
  }
}

// Verifica se possiamo modificare un file (lock implicito per l'AI)
export async function canModify(
  projectId: string,
  filePath: string,
  requester: LockOwner
): Promise<{ allowed: boolean; reason?: string }> {
  const lock = await isLocked(projectId, filePath)

  if (!lock) {
    return { allowed: true }
  }

  if (lock.lockedBy === requester) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: `File is locked by ${lock.lockedBy} until ${lock.expiresAt.toISOString()}`,
  }
}

// Acquisisci lock implicito prima di scrittura (usato dai tool AI)
export async function acquireLockIfNeeded(
  projectId: string,
  filePath: string,
  lockedBy: LockOwner
): Promise<void> {
  const canMod = await canModify(projectId, filePath, lockedBy)
  
  if (!canMod.allowed) {
    throw new Error(canMod.reason)
  }

  // Se non c'è lock, acquisiscilo automaticamente
  const existing = await isLocked(projectId, filePath)
  if (!existing) {
    await acquireLock(projectId, filePath, lockedBy)
  }
}

// Rilascia tutti i lock scaduti (pulizia periodica)
export async function cleanupExpiredLocks(): Promise<number> {
  const now = new Date()

  const result = await prisma.fileLock.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  })

  return result.count
}

// Ottieni tutti i lock attivi per un progetto
export async function getActiveLocks(projectId: string): Promise<LockInfo[]> {
  const now = new Date()

  const locks = await prisma.fileLock.findMany({
    where: {
      projectId,
      expiresAt: {
        gt: now,
      },
    },
  })

  return locks.map((lock: { id: string; projectId: string; filePath: string; lockedBy: string; lockedAt: Date; expiresAt: Date }) => ({
    id: lock.id,
    projectId: lock.projectId,
    filePath: lock.filePath,
    lockedBy: lock.lockedBy as LockOwner,
    lockedAt: lock.lockedAt,
    expiresAt: lock.expiresAt,
  }))
}

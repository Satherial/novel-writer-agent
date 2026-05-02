"use client"

import { useState, useEffect } from "react"

interface Character {
  id: string
  name: string
  role: "protagonist" | "antagonist" | "supporting" | "minor"
  description: string
  background: string
  personality: string
  appearance: string
  motivations: string[]
  conflicts: string[]
  relationships: Array<{
    characterId: string
    type: "friend" | "enemy" | "family" | "romantic" | "mentor" | "rival"
    description: string
  }>
  arc: string
  notes: string
}

interface CharacterToolsProps {
  projectId: string
}

export default function CharacterTools({ projectId }: CharacterToolsProps) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState<"list" | "details" | "relationships">("list")

  useEffect(() => {
    loadCharacters()
  }, [projectId])

  const loadCharacters = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/files?path=characters.md`)
      if (response.ok) {
        const data = await response.json()
        const parsed = parseCharactersMarkdown(data.file.content)
        setCharacters(parsed)
      }
    } catch (error) {
      console.error("Error loading characters:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const parseCharactersMarkdown = (content: string): Character[] => {
    const characterBlocks = content.split(/\n## /).filter(block => block.trim())
    const chars: Character[] = []

    characterBlocks.forEach((block, index) => {
      const lines = block.split('\n')
      const character: Character = {
        id: `char-${index}`,
        name: "",
        role: "supporting",
        description: "",
        background: "",
        personality: "",
        appearance: "",
        motivations: [],
        conflicts: [],
        relationships: [],
        arc: "",
        notes: ""
      }

      lines.forEach(line => {
        const trimmed = line.trim()
        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          character.name = trimmed.replace(/\*\*/g, '')
        } else if (trimmed.startsWith('- **Ruolo:**')) {
          const role = trimmed.split('**Ruolo:**')[1]?.trim()
          if (role) character.role = role as any
        } else if (trimmed.startsWith('- **Descrizione:**')) {
          character.description = trimmed.split('**Descrizione:**')[1]?.trim() || ""
        } else if (trimmed.startsWith('- **Background:**')) {
          character.background = trimmed.split('**Background:**')[1]?.trim() || ""
        } else if (trimmed.startsWith('- **Personalità:**')) {
          character.personality = trimmed.split('**Personalità:**')[1]?.trim() || ""
        } else if (trimmed.startsWith('- **Aspetto:**')) {
          character.appearance = trimmed.split('**Aspetto:**')[1]?.trim() || ""
        }
      })

      if (character.name) {
        chars.push(character)
      }
    })

    return chars
  }

  const saveCharacters = async () => {
    setIsSaving(true)
    try {
      const markdown = generateCharactersMarkdown(characters)
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "characters.md",
          content: markdown
        })
      })

      if (!response.ok) {
        throw new Error("Failed to save characters")
      }
    } catch (error) {
      console.error("Error saving characters:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const generateCharactersMarkdown = (chars: Character[]): string => {
    let markdown = "---\ntitle: \"Personaggi\"\nupdated: " + new Date().toISOString() + "\n---\n\n# Personaggi del Romanzo\n\n"
    
    chars.forEach(char => {
      markdown += `## ${char.name}\n\n`
      markdown += `- **Ruolo:** ${char.role}\n`
      markdown += `- **Descrizione:** ${char.description}\n`
      if (char.background) markdown += `- **Background:** ${char.background}\n`
      if (char.personality) markdown += `- **Personalità:** ${char.personality}\n`
      if (char.appearance) markdown += `- **Aspetto:** ${char.appearance}\n`
      if (char.motivations.length > 0) {
        markdown += `- **Motivazioni:**\n`
        char.motivations.forEach(mot => markdown += `  - ${mot}\n`)
      }
      if (char.conflicts.length > 0) {
        markdown += `- **Conflitti:**\n`
        char.conflicts.forEach(conf => markdown += `  - ${conf}\n`)
      }
      if (char.arc) markdown += `- **Arco narrativo:** ${char.arc}\n`
      if (char.notes) markdown += `- **Note:** ${char.notes}\n`
      markdown += "\n"
    })

    return markdown
  }

  const createCharacter = () => {
    const newChar: Character = {
      id: `char-${Date.now()}`,
      name: "Nuovo Personaggio",
      role: "supporting",
      description: "",
      background: "",
      personality: "",
      appearance: "",
      motivations: [],
      conflicts: [],
      relationships: [],
      arc: "",
      notes: ""
    }
    setCharacters([...characters, newChar])
    setSelectedCharacter(newChar)
    setIsCreating(true)
    setActiveTab("details")
  }

  const deleteCharacter = (charId: string) => {
    setCharacters(characters.filter(char => char.id !== charId))
    if (selectedCharacter?.id === charId) {
      setSelectedCharacter(null)
      setActiveTab("list")
    }
  }

  const updateCharacter = (charId: string, updates: Partial<Character>) => {
    setCharacters(characters.map(char => 
      char.id === charId ? { ...char, ...updates } : char
    ))
    if (selectedCharacter?.id === charId) {
      setSelectedCharacter({ ...selectedCharacter, ...updates })
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "protagonist": return "#3b82f6"
      case "antagonist": return "#ef4444"
      case "supporting": return "#8b5cf6"
      case "minor": return "#6b7280"
      default: return "#e5e7eb"
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "protagonist": return "🦸"
      case "antagonist": return "🦹"
      case "supporting": return "👥"
      case "minor": return "👤"
      default: return "❓"
    }
  }

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '0.5rem', 
      border: '1px solid #e5e7eb',
      height: '600px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
          👥 Personaggi
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={createCharacter}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            + Personaggio
          </button>
          <button
            onClick={saveCharacters}
            disabled={isSaving}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: isSaving ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: isSaving ? 'not-allowed' : 'pointer'
            }}
          >
            {isSaving ? "Salvaggio..." : "Salva"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <button
          onClick={() => setActiveTab("list")}
          style={{
            flex: 1,
            padding: '0.5rem',
            backgroundColor: activeTab === "list" ? '#f3f4f6' : 'white',
            border: 'none',
            borderBottom: activeTab === "list" ? '2px solid #3b82f6' : 'none',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Elenco
        </button>
        <button
          onClick={() => setActiveTab("details")}
          disabled={!selectedCharacter}
          style={{
            flex: 1,
            padding: '0.5rem',
            backgroundColor: activeTab === "details" ? '#f3f4f6' : 'white',
            border: 'none',
            borderBottom: activeTab === "details" ? '2px solid #3b82f6' : 'none',
            cursor: selectedCharacter ? 'pointer' : 'not-allowed',
            fontSize: '0.875rem',
            color: selectedCharacter ? 'inherit' : '#9ca3af'
          }}
        >
          Dettagli
        </button>
        <button
          onClick={() => setActiveTab("relationships")}
          disabled={!selectedCharacter}
          style={{
            flex: 1,
            padding: '0.5rem',
            backgroundColor: activeTab === "relationships" ? '#f3f4f6' : 'white',
            border: 'none',
            borderBottom: activeTab === "relationships" ? '2px solid #3b82f6' : 'none',
            cursor: selectedCharacter ? 'pointer' : 'not-allowed',
            fontSize: '0.875rem',
            color: selectedCharacter ? 'inherit' : '#9ca3af'
          }}
        >
          Relazioni
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#6b7280'
          }}>
            Caricamento personaggi...
          </div>
        ) : activeTab === "list" ? (
          <div style={{ padding: '1rem', overflowY: 'auto', height: '100%' }}>
            {characters.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#6b7280'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                <div>Nessun personaggio creato</div>
                <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Crea il tuo primo personaggio per iniziare
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {characters.map((character) => (
                  <div
                    key={character.id}
                    onClick={() => {
                      setSelectedCharacter(character)
                      setActiveTab("details")
                    }}
                    style={{
                      padding: '1rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: selectedCharacter?.id === character.id ? '#f0f9ff' : 'white'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCharacter?.id !== character.id) {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCharacter?.id !== character.id) {
                        e.currentTarget.style.backgroundColor = 'white'
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>
                        {getRoleIcon(character.role)}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          marginBottom: '0.25rem'
                        }}>
                          {character.name}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          marginBottom: '0.25rem'
                        }}>
                          {character.description}
                        </div>
                        <div style={{
                          display: 'inline-block',
                          padding: '0.125rem 0.5rem',
                          backgroundColor: getRoleColor(character.role),
                          color: 'white',
                          borderRadius: '0.25rem',
                          fontSize: '0.625rem',
                          fontWeight: '500'
                        }}>
                          {character.role}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteCharacter(character.id)
                        }}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          color: '#ef4444',
                          background: 'none',
                          border: '1px solid #ef4444',
                          borderRadius: '0.25rem',
                          cursor: 'pointer'
                        }}
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "details" && selectedCharacter ? (
          <CharacterDetails
            character={selectedCharacter}
            onUpdate={(updates) => updateCharacter(selectedCharacter.id, updates)}
          />
        ) : activeTab === "relationships" && selectedCharacter ? (
          <CharacterRelationships
            character={selectedCharacter}
            allCharacters={characters}
            onUpdate={(updates) => updateCharacter(selectedCharacter.id, updates)}
          />
        ) : null}
      </div>
    </div>
  )
}

// Component for character details
function CharacterDetails({ 
  character, 
  onUpdate 
}: { 
  character: Character
  onUpdate: (updates: Partial<Character>) => void 
}) {
  return (
    <div style={{ padding: '1rem', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
            Nome:
          </label>
          <input
            type="text"
            value={character.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
            Ruolo:
          </label>
          <select
            value={character.role}
            onChange={(e) => onUpdate({ role: e.target.value as any })}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem'
            }}
          >
            <option value="protagonist">Protagonista</option>
            <option value="antagonist">Antagonista</option>
            <option value="supporting">Supporting</option>
            <option value="minor">Minore</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
            Descrizione:
          </label>
          <textarea
            value={character.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
            Background:
          </label>
          <textarea
            value={character.background}
            onChange={(e) => onUpdate({ background: e.target.value })}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
            Personalità:
          </label>
          <textarea
            value={character.personality}
            onChange={(e) => onUpdate({ personality: e.target.value })}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
            Aspetto:
          </label>
          <textarea
            value={character.appearance}
            onChange={(e) => onUpdate({ appearance: e.target.value })}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
            Arco narrativo:
          </label>
          <textarea
            value={character.arc}
            onChange={(e) => onUpdate({ arc: e.target.value })}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
            Note:
          </label>
          <textarea
            value={character.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
        </div>
      </div>
    </div>
  )
}

// Component for character relationships
function CharacterRelationships({ 
  character, 
  allCharacters, 
  onUpdate 
}: { 
  character: Character
  allCharacters: Character[]
  onUpdate: (updates: Partial<Character>) => void 
}) {
  const otherCharacters = allCharacters.filter(c => c.id !== character.id)

  return (
    <div style={{ padding: '1rem', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Relazioni di {character.name}
        </h4>
      </div>

      {character.relationships.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: '#6b7280'
        }}>
          Nessuna relazione definita
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {character.relationships.map((rel, index) => {
            const otherChar = allCharacters.find(c => c.id === rel.characterId)
            return (
              <div
                key={index}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem'
                }}
              >
                <div style={{
                  fontWeight: '500',
                  marginBottom: '0.25rem'
                }}>
                  {otherChar?.name || 'Sconosciuto'} - {rel.type}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  {rel.description}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Aggiungi Relazione:
        </h5>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Funzionalità in sviluppo - presto potrai aggiungere relazioni tra personaggi
        </div>
      </div>
    </div>
  )
}

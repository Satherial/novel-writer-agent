"use client"

import { useEffect, useState } from "react"

export default function DebugDashboard() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/projects")
      .then(res => res.json())
      .then(data => {
        console.log("DEBUG: Projects loaded:", data)
        setProjects(data.projects || [])
        setLoading(false)
      })
      .catch(error => {
        console.error("DEBUG: Error loading projects:", error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div>Caricamento...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">DEBUG Dashboard</h1>
      <div className="mb-4 p-4 bg-yellow-100">
        <p>Progetti trovati: {projects.length}</p>
        <pre className="text-xs">
          {JSON.stringify(projects, null, 2)}
        </pre>
      </div>
      
      {projects.map((project: any) => (
        <div key={project.id} className="mb-4 p-4 border">
          <h3>{project.name}</h3>
          <p>ID: {project.id}</p>
          <p>Creato: {project.createdAt}</p>
          <a href={`/projects/${project.id}`} className="text-blue-600 underline">
            Vai al progetto →
          </a>
        </div>
      ))}
    </div>
  )
}

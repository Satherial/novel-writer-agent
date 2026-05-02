"use client"

import Link from "next/link"

interface Project {
  id: string
  name: string
  description: string | null
  createdAt: string | Date
}

export default function ProjectList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        Nessun progetto ancora creato.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="block p-6 bg-white rounded-lg shadow border hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
          {project.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {project.description}
            </p>
          )}
          <p className="text-xs text-gray-400">
            Creato: {new Date(project.createdAt).toLocaleDateString("it-IT")}
          </p>
        </Link>
      ))}
    </div>
  )
}

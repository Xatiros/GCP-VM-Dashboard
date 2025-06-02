// src/components/Header.tsx
import React from 'react';
import { GCPProject } from '../types';
import { CloudIcon, UserCircleIcon, ChevronDownIcon } from './icons';

interface HeaderProps {
  appName: string;
  projects: GCPProject[];
  selectedProject: GCPProject;
  onProjectChange: (project: GCPProject) => void;
  userEmail: string | null; 
  onLogout: () => void; // Prop para la función de cerrar sesión
}

export const Header: React.FC<HeaderProps> = ({ appName, projects, selectedProject, onProjectChange, userEmail, onLogout }) => {
  return (
    <header className="bg-sky-700 text-white shadow-md">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <CloudIcon className="h-8 w-8 mr-2 text-sky-300" />
            <h1 className="text-2xl font-semibold">{appName}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <label htmlFor="project-selector" className="sr-only">Select Project</label>
              <select
                id="project-selector"
                name="project-selector"
                className="bg-sky-600 hover:bg-sky-500 text-white pl-3 pr-8 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-700 focus:ring-white appearance-none"
                value={selectedProject.id}
                onChange={(e) => {
                  const project = projects.find(p => p.id === e.target.value);
                  if (project) onProjectChange(project);
                }}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id} className="bg-sky-700">
                    {project.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-sky-200">
                <ChevronDownIcon className="h-4 w-4" />
              </div>
            </div>
            {/* Información de Usuario y Botón de Cerrar Sesión */}
            <div className="flex items-center">
              <UserCircleIcon className="h-8 w-8 text-sky-300" />
              {userEmail && <span className="ml-2 text-sm font-medium hidden md:block">{userEmail.split('@')[0]}</span>}
              <button 
                onClick={onLogout} // Asignar la función onLogout al click
                className="ml-4 px-3 py-1 bg-sky-600 hover:bg-sky-500 rounded-md text-sm font-medium"
                title="Cerrar sesión"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

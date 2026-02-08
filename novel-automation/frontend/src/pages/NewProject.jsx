// This file is no longer used - replaced by NewProduction.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProject } from '../api';
import { Lightbulb, BookOpen, Library, ArrowRight, Sparkles } from 'lucide-react';

const INPUT_TYPES = [
  {
    id: 'idea',
    icon: Lightbulb,
    title: 'Start from an Idea',
    description: 'Just a sentence or a concept — the AI will brainstorm everything',
    color: 'text-gold-500 bg-gold-50 border-gold-200',
  },
  {
    id: 'outline',
    icon: BookOpen,
    title: 'I Have an Outline',
    description: 'You have chapter outlines ready — skip brainstorming',
    color: 'text-crimson-500 bg-crimson-50 border-crimson-200',
  },
  {
    id: 'story_bible',
    icon: Library,
    title: 'Full Story Bible',
    description: 'Complete world-building, characters, and outlines ready to go',
    color: 'text-indigo-500 bg-indigo-50 border-indigo-200',
  },
];

export default function NewProject() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inputType, setInputType] = useState('idea');
  const [form, setForm] = useState({
    name: '',
    description: '',
    series_name: '',
    genre: 'romance fantasy',
    idea_text: '',
    story_bible: '',
    ship_vibes: '',
  });

  const mutation = useMutation({
    mutationFn: (data) => createProject(data),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/projects/${project.id}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ ...form, input_type: inputType });
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-ink-900 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-crimson-500" />
          New Project
        </h1>
        <p className="text-ink-500 mt-1">Start your next novel — from a spark of an idea to a finished book</p>
      </div>

      {/* Input Type Selection */}
      <div>
        <label className="block text-sm font-medium text-ink-700 mb-3">How much do you have?</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {INPUT_TYPES.map(({ id, icon: Icon, title, description, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => setInputType(id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                inputType === id
                  ? `${color} ring-2 ring-offset-2 ring-crimson-400`
                  : 'border-parchment-200 bg-white hover:border-parchment-300'
              }`}
            >
              <Icon className={`w-6 h-6 mb-2 ${inputType === id ? '' : 'text-ink-400'}`} />
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-ink-400 mt-1">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Project Name *</label>
            <input
              className="input-field"
              placeholder="e.g. Sanctuary of the Damned"
              value={form.name}
              onChange={set('name')}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Series Name</label>
            <input
              className="input-field"
              placeholder="e.g. Gothic Devotion Series"
              value={form.series_name}
              onChange={set('series_name')}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Genre</label>
          <select className="select-field" value={form.genre} onChange={set('genre')}>
            <option value="romance fantasy">Romance Fantasy</option>
            <option value="dark romance">Dark Romance</option>
            <option value="urban fantasy romance">Urban Fantasy Romance</option>
            <option value="epic fantasy romance">Epic Fantasy Romance</option>
            <option value="paranormal romance">Paranormal Romance</option>
            <option value="sci-fi romance">Sci-Fi Romance</option>
            <option value="contemporary romance">Contemporary Romance</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Description</label>
          <textarea
            className="textarea-field"
            placeholder="Brief description of your project..."
            value={form.description}
            onChange={set('description')}
            rows={2}
          />
        </div>

        {/* Conditional fields based on input type */}
        {inputType === 'idea' && (
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Your Idea *
              <span className="text-ink-400 font-normal ml-1">(can be one sentence or paragraphs)</span>
            </label>
            <textarea
              className="textarea-field"
              placeholder="e.g. A vampire warden falls in love with an illegal healer in a world where magic is controlled by soul contracts..."
              value={form.idea_text}
              onChange={set('idea_text')}
              rows={4}
              required
            />
          </div>
        )}

        {(inputType === 'outline' || inputType === 'story_bible') && (
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Story Bible / World-Building
            </label>
            <textarea
              className="textarea-field font-mono text-sm"
              placeholder="Paste your story bible, world-building notes, character profiles..."
              value={form.story_bible}
              onChange={set('story_bible')}
              rows={8}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">
            Ship Vibes / Inspiration
            <span className="text-ink-400 font-normal ml-1">(media couples to channel)</span>
          </label>
          <textarea
            className="textarea-field"
            placeholder="e.g. Astarion x Tav energy — wounded predator, consent-first healing, protective obsession..."
            value={form.ship_vibes}
            onChange={set('ship_vibes')}
            rows={3}
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={mutation.isPending || !form.name}
          >
            {mutation.isPending ? 'Creating...' : 'Create Project'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {mutation.isError && (
          <p className="text-sm text-crimson-500 mt-2">{mutation.error.message}</p>
        )}
      </form>
    </div>
  );
}

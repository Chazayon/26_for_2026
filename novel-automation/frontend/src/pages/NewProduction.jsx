import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { createProject, getProjects, getBooks, createBook, createChapter, startBrainstorm, startChapterRun, startBookRun } from '../api';
import {
  Lightbulb, BookOpen, Library, ArrowRight, ArrowLeft, Sparkles,
  Wand2, CheckCircle2, ChevronRight, Rocket, Plus, Trash2
} from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const INPUT_TYPES = [
  { id: 'idea', icon: Lightbulb, title: 'From an Idea', desc: 'A sentence or concept — AI brainstorms everything', gradient: 'from-amber-500/20 to-amber-400/5', border: 'border-amber-500/20', accent: 'text-amber-400' },
  { id: 'outline', icon: BookOpen, title: 'From an Outline', desc: 'Chapter outlines ready — skip brainstorming', gradient: 'from-cyan-500/20 to-cyan-400/5', border: 'border-cyan-500/20', accent: 'text-cyan-400' },
  { id: 'story_bible', icon: Library, title: 'Full Story Bible', desc: 'World-building, characters, outlines — all set', gradient: 'from-violet-500/20 to-violet-400/5', border: 'border-violet-500/20', accent: 'text-violet-400' },
];

export default function NewProduction() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0); // 0: type, 1: details, 2: chapters, 3: launch
  const [inputType, setInputType] = useState('idea');
  const [form, setForm] = useState({
    name: '', description: '', series_name: '', genre: 'romance fantasy',
    idea_text: '', story_bible: '', ship_vibes: '',
  });

  const createMutation = useMutation({
    mutationFn: (data) => createProject(data),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (inputType === 'idea') {
        startBrainstorm(project.id).then(() => {
          queryClient.invalidateQueries({ queryKey: ['runs'] });
          navigate(`/library/${project.id}`);
        });
      } else {
        navigate(`/library/${project.id}`);
      }
    },
  });

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleLaunch = () => {
    createMutation.mutate({ ...form, input_type: inputType });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-gradient-hero">New Production</h1>
        <p className="text-base-400 mt-1 text-sm">Launch a new novel into your production pipeline</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {['Type', 'Details', 'Launch'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                i === step ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                i < step ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 cursor-pointer' :
                'bg-white/[0.03] text-base-500 border border-white/[0.06]'
              }`}
            >
              {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 text-center">{i + 1}</span>}
              {label}
            </button>
            {i < 2 && <ChevronRight className="w-4 h-4 text-base-600" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0: Choose input type */}
        {step === 0 && (
          <motion.div key="step0" variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <h2 className="text-lg font-display font-semibold text-base-100">What are you starting with?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {INPUT_TYPES.map(({ id, icon: Icon, title, desc, gradient, border, accent }) => (
                <motion.button
                  key={id}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setInputType(id)}
                  className={`p-5 rounded-2xl text-left transition-all border ${
                    inputType === id
                      ? `bg-gradient-to-br ${gradient} ${border} ring-1 ring-cyan-500/30`
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon className={`w-7 h-7 mb-3 ${inputType === id ? accent : 'text-base-500'}`} />
                  <h3 className={`font-semibold text-sm ${inputType === id ? 'text-base-50' : 'text-base-300'}`}>{title}</h3>
                  <p className="text-xs text-base-500 mt-1 leading-relaxed">{desc}</p>
                </motion.button>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setStep(1)} className="btn-primary flex items-center gap-2">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 1: Project Details */}
        {step === 1 && (
          <motion.div key="step1" variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="glass p-6 space-y-5">
            <h2 className="text-lg font-display font-semibold text-base-100">Series Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-base-300 mb-1.5 uppercase tracking-wider">Series Name *</label>
                <input className="input-field" placeholder="e.g. Sanctuary of the Damned" value={form.name} onChange={set('name')} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-base-300 mb-1.5 uppercase tracking-wider">Series Title</label>
                <input className="input-field" placeholder="e.g. Gothic Devotion Series" value={form.series_name} onChange={set('series_name')} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-base-300 mb-1.5 uppercase tracking-wider">Genre</label>
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
              <label className="block text-xs font-semibold text-base-300 mb-1.5 uppercase tracking-wider">Description</label>
              <textarea className="textarea-field" placeholder="Brief description of your series..." value={form.description} onChange={set('description')} rows={2} />
            </div>

            {inputType === 'idea' && (
              <div>
                <label className="block text-xs font-semibold text-base-300 mb-1.5 uppercase tracking-wider">
                  Your Idea * <span className="text-base-500 font-normal normal-case">(can be one sentence or paragraphs)</span>
                </label>
                <textarea
                  className="textarea-field"
                  placeholder="e.g. A vampire warden falls in love with an illegal healer in a world where magic is controlled by soul contracts..."
                  value={form.idea_text} onChange={set('idea_text')} rows={4} required
                />
              </div>
            )}

            {(inputType === 'outline' || inputType === 'story_bible') && (
              <div>
                <label className="block text-xs font-semibold text-base-300 mb-1.5 uppercase tracking-wider">Story Bible / World-Building</label>
                <textarea className="textarea-field font-mono text-xs" placeholder="Paste your story bible, world-building notes, character profiles..." value={form.story_bible} onChange={set('story_bible')} rows={10} />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-base-300 mb-1.5 uppercase tracking-wider">
                Ship Vibes <span className="text-base-500 font-normal normal-case">(media couples to channel)</span>
              </label>
              <textarea className="textarea-field" placeholder="e.g. Astarion x Tav energy — wounded predator, consent-first healing..." value={form.ship_vibes} onChange={set('ship_vibes')} rows={3} />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button onClick={() => setStep(0)} className="btn-ghost flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => setStep(2)} className="btn-primary flex items-center gap-2" disabled={!form.name}>
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Launch */}
        {step === 2 && (
          <motion.div key="step2" variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="glass p-6 space-y-4">
              <h2 className="text-lg font-display font-semibold text-base-100">Ready to Launch</h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <DetailRow label="Series" value={form.name} />
                  <DetailRow label="Genre" value={form.genre} />
                  <DetailRow label="Input Type" value={INPUT_TYPES.find(t => t.id === inputType)?.title} />
                </div>
                <div className="space-y-3">
                  {form.series_name && <DetailRow label="Series Title" value={form.series_name} />}
                  <DetailRow label="Ship Vibes" value={form.ship_vibes ? 'Provided' : 'None'} />
                  {inputType === 'idea' && <DetailRow label="Idea" value={form.idea_text ? `${form.idea_text.slice(0, 60)}...` : 'None'} />}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/15">
                <div className="flex items-center gap-3">
                  <Wand2 className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-sm font-semibold text-base-100">
                      {inputType === 'idea' ? 'AI Brainstorm will start automatically' : 'You can add books & chapters next'}
                    </p>
                    <p className="text-xs text-base-400 mt-0.5">
                      {inputType === 'idea'
                        ? 'The brainstormer will expand your idea into a full series concept with outlines'
                        : 'Head to the Library to add books, chapters, and start production'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="btn-ghost flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleLaunch}
                disabled={createMutation.isPending || !form.name}
                className="btn-primary flex items-center gap-2 px-8 py-3 text-base"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-base-900 border-t-transparent animate-spin" />
                    Launching...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" /> Launch Production
                  </>
                )}
              </motion.button>
            </div>

            {createMutation.isError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                {createMutation.error.message}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <span className="text-[11px] text-base-500 uppercase tracking-wider font-medium">{label}</span>
      <p className="text-sm text-base-100 mt-0.5">{value || '—'}</p>
    </div>
  );
}

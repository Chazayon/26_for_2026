import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getModelConfigs, createModelConfig, updateModelConfig, deleteModelConfig,
  getAvailableModels,
} from '../api';
import {
  Plus, Trash2, Star, Cpu, Cloud,
  CheckCircle2, XCircle, RefreshCw
} from 'lucide-react';

const ROLES = [
  { id: 'brainstormer', label: 'Brainstormer', description: 'Expands ideas into series concepts', gradient: 'from-amber-500 to-amber-400' },
  { id: 'orchestrator', label: 'Orchestrator', description: 'Reviews quality and manages workflow', gradient: 'from-cyan-500 to-cyan-400' },
  { id: 'scene_brief_creator', label: 'Scene Brief Creator', description: 'Creates detailed scene briefs', gradient: 'from-violet-500 to-violet-400' },
  { id: 'prose_writer', label: 'Prose Writer', description: 'Writes publication-ready prose', gradient: 'from-emerald-500 to-emerald-400' },
];

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

export default function Settings() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);

  const { data: configs = [] } = useQuery({ queryKey: ['modelConfigs'], queryFn: getModelConfigs });
  const { data: available = { openrouter: [], ollama: [], ollama_available: false } } = useQuery({ queryKey: ['availableModels'], queryFn: getAvailableModels });

  const [newConfig, setNewConfig] = useState({
    name: '', provider: 'openrouter', model_id: '', role: 'brainstormer',
    temperature: '0.7', max_tokens: 4096, is_default: 0,
  });

  const addMut = useMutation({
    mutationFn: createModelConfig,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['modelConfigs'] }); setShowAdd(false); setNewConfig({ name: '', provider: 'openrouter', model_id: '', role: 'brainstormer', temperature: '0.7', max_tokens: 4096, is_default: 0 }); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => updateModelConfig(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['modelConfigs'] }); setEditingConfig(null); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteModelConfig,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['modelConfigs'] }),
  });

  const allModels = newConfig.provider === 'openrouter' ? available.openrouter : available.ollama;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-4xl mx-auto space-y-8">
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl font-display font-bold text-gradient-hero">Settings</h1>
        <p className="text-base-400 mt-1 text-sm">Configure AI models for each agent role</p>
      </motion.div>

      {/* Ollama Status */}
      <motion.div variants={fadeUp} className="glass p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-400/5 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-base-100">Ollama (Local Models)</p>
            <p className="text-[11px] text-base-500 font-mono">http://localhost:11434</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {available.ollama_available ? (
            <span className="badge-completed"><CheckCircle2 className="w-3 h-3" /> {available.ollama.length} models</span>
          ) : (
            <span className="badge-pending"><XCircle className="w-3 h-3" /> Not running</span>
          )}
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['availableModels'] })} className="p-2 text-base-400 hover:text-cyan-400 rounded-xl hover:bg-white/[0.04] transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Model Configurations by Role */}
      {ROLES.map(role => {
        const roleConfigs = configs.filter(c => c.role === role.id);
        const defaultConfig = roleConfigs.find(c => c.is_default);

        return (
          <motion.div key={role.id} variants={fadeUp} className="glass overflow-hidden">
            <div className="p-4 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${role.gradient}`} />
                <div>
                  <h3 className="font-display font-semibold text-base-100">{role.label}</h3>
                  <p className="text-[11px] text-base-500">{role.description}</p>
                </div>
              </div>
              {defaultConfig && (
                <div className="flex items-center gap-2">
                  {defaultConfig.provider === 'openrouter' ? <Cloud className="w-3.5 h-3.5 text-cyan-400" /> : <Cpu className="w-3.5 h-3.5 text-emerald-400" />}
                  <span className="text-xs text-base-300 font-mono">{defaultConfig.model_id}</span>
                </div>
              )}
            </div>
            <div className="divide-y divide-white/[0.03]">
              {roleConfigs.length === 0 ? (
                <div className="p-4 text-sm text-base-500">No configurations. Using system default.</div>
              ) : (
                roleConfigs.map(config => (
                  <ConfigRow
                    key={config.id}
                    config={config}
                    isEditing={editingConfig === config.id}
                    onEdit={() => setEditingConfig(editingConfig === config.id ? null : config.id)}
                    onSetDefault={() => updateMut.mutate({ id: config.id, is_default: 1 })}
                    onDelete={() => deleteMut.mutate(config.id)}
                    onSave={(data) => updateMut.mutate({ id: config.id, ...data })}
                    available={available}
                  />
                ))
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Add New Configuration */}
      <motion.div variants={fadeUp}>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-secondary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Model Configuration
        </button>

        <AnimatePresence>
          {showAdd && (
            <motion.form
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              onSubmit={(e) => { e.preventDefault(); addMut.mutate(newConfig); }}
              className="glass p-5 mt-3 space-y-4 overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-base-300 mb-1.5 uppercase tracking-wider">Name</label>
                  <input className="input-field" placeholder="e.g. Claude for Prose" value={newConfig.name} onChange={e => setNewConfig({ ...newConfig, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-base-300 mb-1.5 uppercase tracking-wider">Role</label>
                  <select className="select-field" value={newConfig.role} onChange={e => setNewConfig({ ...newConfig, role: e.target.value })}>
                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-base-300 mb-1.5 uppercase tracking-wider">Provider</label>
                  <select className="select-field" value={newConfig.provider} onChange={e => setNewConfig({ ...newConfig, provider: e.target.value, model_id: '' })}>
                    <option value="openrouter">OpenRouter (Cloud)</option>
                    <option value="ollama">Ollama (Local)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-base-300 mb-1.5 uppercase tracking-wider">Model</label>
                  {allModels.length > 0 ? (
                    <select className="select-field" value={newConfig.model_id} onChange={e => setNewConfig({ ...newConfig, model_id: e.target.value })}>
                      <option value="">Select a model...</option>
                      {allModels.map(m => <option key={m.id} value={m.id}>{m.name || m.id}</option>)}
                    </select>
                  ) : (
                    <input className="input-field" placeholder="anthropic/claude-sonnet-4" value={newConfig.model_id} onChange={e => setNewConfig({ ...newConfig, model_id: e.target.value })} required />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-base-300 mb-1.5 uppercase tracking-wider">Temperature</label>
                  <input className="input-field" type="number" step="0.05" min="0" max="2" value={newConfig.temperature} onChange={e => setNewConfig({ ...newConfig, temperature: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-base-300 mb-1.5 uppercase tracking-wider">Max Tokens</label>
                  <input className="input-field" type="number" min="256" max="128000" value={newConfig.max_tokens} onChange={e => setNewConfig({ ...newConfig, max_tokens: parseInt(e.target.value) })} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-base-300 cursor-pointer">
                    <input type="checkbox" className="rounded border-base-600 bg-white/[0.05]" checked={newConfig.is_default === 1} onChange={e => setNewConfig({ ...newConfig, is_default: e.target.checked ? 1 : 0 })} />
                    Default
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Cancel</button>
                <button type="submit" className="btn-primary text-sm" disabled={addMut.isPending}>Add Configuration</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function ConfigRow({ config, isEditing, onEdit, onSetDefault, onDelete, onSave, available }) {
  const [editForm, setEditForm] = useState({
    name: config.name, provider: config.provider, model_id: config.model_id,
    temperature: config.temperature, max_tokens: config.max_tokens,
  });

  const models = editForm.provider === 'openrouter' ? available.openrouter : available.ollama;

  return (
    <div className="group">
      <div className="p-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          {config.is_default ? (
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          ) : (
            <button onClick={onSetDefault} className="p-0.5 text-base-600 hover:text-amber-400 transition-colors" title="Set as default">
              <Star className="w-4 h-4" />
            </button>
          )}
          <div>
            <span className="text-sm font-medium text-base-200">{config.name}</span>
            <div className="flex items-center gap-2 text-[11px] text-base-500">
              {config.provider === 'openrouter' ? <Cloud className="w-3 h-3 text-cyan-500" /> : <Cpu className="w-3 h-3 text-emerald-500" />}
              <span className="font-mono">{config.model_id}</span>
              <span>temp={config.temperature}</span>
              <span>max={config.max_tokens}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1.5 text-base-500 hover:text-cyan-400 rounded opacity-0 group-hover:opacity-100 transition-all text-xs">
            {isEditing ? 'Close' : 'Edit'}
          </button>
          <button onClick={onDelete} className="p-1.5 text-base-500 hover:text-rose-400 rounded opacity-0 group-hover:opacity-100 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3 border-t border-white/[0.03] pt-3">
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field text-sm" placeholder="Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                <select className="select-field text-sm" value={editForm.provider} onChange={e => setEditForm({ ...editForm, provider: e.target.value, model_id: '' })}>
                  <option value="openrouter">OpenRouter</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {models.length > 0 ? (
                  <select className="select-field text-sm" value={editForm.model_id} onChange={e => setEditForm({ ...editForm, model_id: e.target.value })}>
                    <option value="">Select...</option>
                    {models.map(m => <option key={m.id} value={m.id}>{m.name || m.id}</option>)}
                  </select>
                ) : (
                  <input className="input-field text-sm" placeholder="Model ID" value={editForm.model_id} onChange={e => setEditForm({ ...editForm, model_id: e.target.value })} />
                )}
                <input className="input-field text-sm" type="number" step="0.05" placeholder="Temp" value={editForm.temperature} onChange={e => setEditForm({ ...editForm, temperature: e.target.value })} />
                <input className="input-field text-sm" type="number" placeholder="Max tokens" value={editForm.max_tokens} onChange={e => setEditForm({ ...editForm, max_tokens: parseInt(e.target.value) })} />
              </div>
              <div className="flex justify-end">
                <button onClick={() => onSave(editForm)} className="btn-primary text-xs">Save Changes</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

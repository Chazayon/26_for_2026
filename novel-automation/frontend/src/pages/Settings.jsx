import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getModelConfigs, createModelConfig, updateModelConfig, deleteModelConfig,
  getAvailableModels, getProviders, updateProviderConfig,
} from '../api';
import {
  Plus, Trash2, Star, Cpu, Cloud,
  CheckCircle2, XCircle, RefreshCw, Key, Sparkles, Eye, EyeOff
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
  const { data: providers = [] } = useQuery({ queryKey: ['providers'], queryFn: getProviders });

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

      {/* Provider Configuration */}
      <motion.div variants={fadeUp} className="space-y-4">
        <h2 className="text-lg font-display font-bold text-base-100">Provider Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProviderCard
            providerName="openrouter"
            label="OpenRouter"
            description="Aggregator for Claude, GPT-4, Llama 3"
            icon={Cloud}
          />
          <ProviderCard
            providerName="ollama"
            label="Ollama"
            description="Run local models (Llama 3, Mistral)"
            icon={Cpu}
            hasBaseUrl
          />
          <ProviderCard
            providerName="openai"
            label="OpenAI"
            description="Direct API (GPT-4o)"
            icon={Sparkles}
          />
          <ProviderCard
            providerName="anthropic"
            label="Anthropic"
            description="Direct API (Claude 3.5)"
            icon={Sparkles}
          />
          <ProviderCard
            providerName="google"
            label="Google Gemini"
            description="Direct API (Gemini 1.5)"
            icon={Sparkles}
          />
        </div>
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
                  <select className="select-field" value={newConfig.provider} onChange={e => {
                    setNewConfig({ ...newConfig, provider: e.target.value, model_id: '' });
                    setIsCustomNew(false);
                  }}>
                    <option value="openrouter">OpenRouter (Cloud)</option>
                    <option value="ollama">Ollama (Local)</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google Gemini</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-base-300 mb-1.5 uppercase tracking-wider">Model</label>
                  {!isCustomNew && allModels && allModels.length > 0 ? (
                    <select className="select-field" value={newConfig.model_id} onChange={e => {
                      if (e.target.value === 'custom') setIsCustomNew(true);
                      else setNewConfig({ ...newConfig, model_id: e.target.value });
                    }}>
                      <option value="">Select a model...</option>
                      {allModels.map(m => <option key={m.id} value={m.id}>{m.name || m.id}</option>)}
                      <option value="custom" className="text-cyan-400 font-bold">+ Enter Custom ID</option>
                    </select>
                  ) : (
                    <div className="relative">
                      <input className="input-field pr-8" placeholder="anthropic/claude-sonnet-4" value={newConfig.model_id} onChange={e => setNewConfig({ ...newConfig, model_id: e.target.value })} required />
                      {allModels && allModels.length > 0 && (
                        <button type="button" onClick={() => setIsCustomNew(false)} className="absolute right-2 top-2.5 text-base-500 hover:text-cyan-400" title="Back to list">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
  const [isCustom, setIsCustom] = useState(false);

  const models = available[editForm.provider];

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
                <select className="select-field text-sm" value={editForm.provider} onChange={e => {
                  setEditForm({ ...editForm, provider: e.target.value, model_id: '' });
                  setIsCustom(false);
                }}>
                  <option value="openrouter">OpenRouter</option>
                  <option value="ollama">Ollama</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google Gemini</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {!isCustom && models && models.length > 0 ? (
                  <select className="select-field text-sm" value={editForm.model_id} onChange={e => {
                    if (e.target.value === 'custom') setIsCustom(true);
                    else setEditForm({ ...editForm, model_id: e.target.value });
                  }}>
                    <option value="">Select...</option>
                    {models.map(m => <option key={m.id} value={m.id}>{m.name || m.id}</option>)}
                    <option value="custom" className="text-cyan-400 font-bold">+ Enter Custom ID</option>
                  </select>
                ) : (
                  <div className="relative">
                    <input className="input-field text-sm pr-6" placeholder="Model ID" value={editForm.model_id} onChange={e => setEditForm({ ...editForm, model_id: e.target.value })} />
                    {models && models.length > 0 && (
                      <button onClick={() => setIsCustom(false)} className="absolute right-2 top-2 text-base-500 hover:text-cyan-400" title="Back to list">
                        <XCircle className="w-3 h-3" />
                      </button>
                    )}
                  </div>
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
    </div >
  );
}

function ProviderCard({ providerName, label, description, icon: Icon, hasBaseUrl }) {
  const queryClient = useQueryClient();
  const { data: providers = [] } = useQuery({ queryKey: ['providers'], queryFn: getProviders });

  const config = providers.find(p => p.provider_name === providerName) || { is_enabled: 0, has_key: false };
  const [isEditing, setIsEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState({ api_key: '', base_url: config.base_url || '' });

  const updateMut = useMutation({
    mutationFn: (data) => updateProviderConfig({ provider_name: providerName, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['availableModels'] }); // Refresh available models
      setIsEditing(false);
      setForm(f => ({ ...f, api_key: '' })); // Clear key from state
    }
  });

  const handleSave = () => {
    const data = { is_enabled: 1 };
    if (form.api_key) data.api_key = form.api_key;
    if (hasBaseUrl && form.base_url) data.base_url = form.base_url;
    updateMut.mutate(data);
  };

  const toggleEnabled = () => {
    updateMut.mutate({ is_enabled: config.is_enabled ? 0 : 1 });
  };

  return (
    <div className={`glass p-4 border ${config.is_enabled ? 'border-cyan-500/20' : 'border-white/5'} transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.is_enabled ? 'bg-cyan-500/10 text-cyan-400' : 'bg-base-800 text-base-500'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base-100 text-sm">{label}</h3>
            <p className="text-[11px] text-base-400">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={!!config.is_enabled} onChange={toggleEnabled} />
            <div className="w-9 h-5 bg-base-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-base-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500/20 peer-checked:after:bg-cyan-400 peer-checked:after:border-transparent"></div>
          </label>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/[0.04]">
        {isEditing ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-semibold text-base-500 mb-1 block">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  className="input-field text-xs pr-8"
                  placeholder={config.has_key ? "(Unchanged)" : "sk-..."}
                  value={form.api_key}
                  onChange={e => setForm({ ...form, api_key: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1.5 text-base-500 hover:text-base-300"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {hasBaseUrl && (
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-base-500 mb-1 block">Base URL</label>
                <input
                  className="input-field text-xs"
                  placeholder="https://api.openai.com/v1"
                  value={form.base_url}
                  onChange={e => setForm({ ...form, base_url: e.target.value })}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsEditing(false)} className="btn-ghost text-xs py-1 h-auto">Cancel</button>
              <button onClick={handleSave} className="btn-primary text-xs py-1 h-auto">Save</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {config.has_key ? (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                  <Key className="w-3 h-3" /> Key Set
                </span>
              ) : (
                <span className="text-[10px] text-amber-400 flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded-full">
                  <Key className="w-3 h-3" /> No Key
                </span>
              )}
              {config.base_url && (
                <span className="text-[10px] text-base-500 font-mono truncate max-w-[100px]">{config.base_url}</span>
              )}
            </div>
            <button onClick={() => setIsEditing(true)} className="text-xs text-base-400 hover:text-cyan-400 transition-colors">
              Configure
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


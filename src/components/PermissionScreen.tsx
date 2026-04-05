
import React, { useState } from 'react';
import { Shield, MessageSquare, CheckSquare, Check, AlertCircle, Lock, Key, Mail, Calendar } from 'lucide-react';
import { saveSlackToken, saveJiraCredentials } from '../services/api';

interface PermissionScreenProps {
  onContinue: () => void;
}

/**
 * Permission screen — updated for production auth.
 * Google is now auto-connected via OAuth (no token input needed).
 * Only Slack and Jira still require manual token entry.
 */
export const PermissionScreen: React.FC<PermissionScreenProps> = ({ onContinue }) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Slack
  const [slackToken, setSlackToken] = useState('');
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackSaved, setSlackSaved] = useState(false);

  // Jira
  const [jiraDomain, setJiraDomain] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [jiraEnabled, setJiraEnabled] = useState(false);
  const [jiraSaved, setJiraSaved] = useState(false);

  const handleSaveSlack = async () => {
    if (!slackToken) return;
    setSaving(true);
    setError(null);
    try {
      await saveSlackToken(slackToken);
      setSlackSaved(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save Slack token');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveJira = async () => {
    if (!jiraDomain || !jiraEmail || !jiraToken) return;
    setSaving(true);
    setError(null);
    try {
      await saveJiraCredentials(jiraDomain, jiraEmail, jiraToken);
      setJiraSaved(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save Jira credentials');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (key: string) => {
    if (key === 'slack') setSlackEnabled(!slackEnabled);
    if (key === 'jira') setJiraEnabled(!jiraEnabled);
    setActiveSection(activeSection === key ? null : key);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-cyan-950/30 rounded-full mb-4 border border-cyan-500/20">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Connect Your Workspace</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Google is already connected via your sign-in.
            <br />Optionally connect Slack and Jira for a complete picture.
          </p>
        </div>

        <div className="grid gap-4 mb-8">
          
          {/* Google — Auto-connected (read-only display) */}
          <div className="rounded-xl border bg-cyan-950/10 border-cyan-500/50 overflow-hidden">
            <div className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-cyan-500/20 text-cyan-400">
                <Mail className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-white">Google Workspace</h3>
                <p className="text-sm text-slate-500">Gmail & Calendar — Connected via OAuth</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-medium bg-emerald-950/40 px-2 py-1 rounded-full border border-emerald-800/50">
                  Auto-connected
                </span>
                <div className="w-6 h-6 rounded-full bg-cyan-500 border-2 border-cyan-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Slack */}
          <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${slackEnabled ? 'bg-violet-950/10 border-violet-500/50' : 'bg-[#0b1221] border-slate-800'}`}>
            <div 
               onClick={() => toggleSection('slack')}
               className="p-5 cursor-pointer flex items-center gap-4"
            >
                <div className={`p-3 rounded-lg ${slackEnabled ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-800 text-slate-400'}`}>
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold text-lg ${slackEnabled ? 'text-white' : 'text-slate-300'}`}>Slack</h3>
                  <p className="text-sm text-slate-500">Channels & DMs</p>
                </div>
                {slackSaved ? (
                  <span className="text-xs text-emerald-400 font-medium">✓ Saved</span>
                ) : (
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${slackEnabled ? 'bg-violet-500 border-violet-500' : 'border-slate-600'}`}>
                    {slackEnabled && <Check className="w-4 h-4 text-white" />}
                  </div>
                )}
            </div>
             {(activeSection === 'slack' || slackEnabled) && !slackSaved && (
                <div className="px-5 pb-5 pt-0">
                    <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-700/50 space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase block">Bot User OAuth Token</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <input 
                              type="password" 
                              value={slackToken}
                              onChange={(e) => setSlackToken(e.target.value)}
                              placeholder="xoxb-..."
                              className="w-full bg-[#020617] border border-slate-700 rounded-md py-2 pl-9 pr-4 text-sm text-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                            />
                        </div>
                        <button
                          onClick={handleSaveSlack}
                          disabled={!slackToken || saving}
                          className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-md transition-colors"
                        >
                          {saving ? 'Saving...' : 'Save Slack Token'}
                        </button>
                    </div>
                </div>
            )}
          </div>

          {/* Jira */}
          <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${jiraEnabled ? 'bg-blue-950/10 border-blue-500/50' : 'bg-[#0b1221] border-slate-800'}`}>
            <div 
               onClick={() => toggleSection('jira')}
               className="p-5 cursor-pointer flex items-center gap-4"
            >
                <div className={`p-3 rounded-lg ${jiraEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                  <CheckSquare className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold text-lg ${jiraEnabled ? 'text-white' : 'text-slate-300'}`}>Jira Software</h3>
                  <p className="text-sm text-slate-500">Issues & Projects</p>
                </div>
                {jiraSaved ? (
                  <span className="text-xs text-emerald-400 font-medium">✓ Saved</span>
                ) : (
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${jiraEnabled ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                    {jiraEnabled && <Check className="w-4 h-4 text-white" />}
                  </div>
                )}
            </div>
             {(activeSection === 'jira' || jiraEnabled) && !jiraSaved && (
                <div className="px-5 pb-5 pt-0">
                    <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-700/50 space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Jira Domain</label>
                            <input 
                              type="text" 
                              value={jiraDomain}
                              onChange={(e) => setJiraDomain(e.target.value)}
                              placeholder="company.atlassian.net"
                              className="w-full bg-[#020617] border border-slate-700 rounded-md py-2 px-3 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Email</label>
                            <input 
                              type="email" 
                              value={jiraEmail}
                              onChange={(e) => setJiraEmail(e.target.value)}
                              placeholder="you@company.com"
                              className="w-full bg-[#020617] border border-slate-700 rounded-md py-2 px-3 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                         <div>
                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">API Token</label>
                             <div className="relative">
                                <Key className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                <input 
                                  type="password" 
                                  value={jiraToken}
                                  onChange={(e) => setJiraToken(e.target.value)}
                                  placeholder="ATATT3..."
                                  className="w-full bg-[#020617] border border-slate-700 rounded-md py-2 pl-9 pr-4 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <button
                          onClick={handleSaveJira}
                          disabled={!jiraDomain || !jiraEmail || !jiraToken || saving}
                          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-md transition-colors"
                        >
                          {saving ? 'Saving...' : 'Save Jira Credentials'}
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 px-4 py-2 rounded-lg border border-red-900/50 mb-4">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
           <button
            onClick={onContinue}
            className="w-full max-w-md bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2"
          >
            Continue to Dashboard
          </button>
          
          <div className="flex items-center gap-2 text-slate-600 text-xs">
             <Lock size={12} />
             <span>Tokens are encrypted and stored securely on the server.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Card, Button } from '../components/ui';
import { Download, Moon, Sun, Plus, ToggleLeft, ToggleRight, Trash2, User, Users, LayoutDashboard } from 'lucide-react';
import { dbService } from '../services/db';
import { Team, Person, Platform } from '../types';

const Settings = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Teams State
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#6366f1'); // Default indigo

  // People State
  const [newPersonName, setNewPersonName] = useState('');
  const [selectedTeamsForPerson, setSelectedTeamsForPerson] = useState<string[]>([]);

  // Platforms State
  const [newPlatformName, setNewPlatformName] = useState('');

  useEffect(() => {
    loadData();

    // Load theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  const loadData = async () => {
      const [t, p, pl] = await Promise.all([
          dbService.getTeams(), 
          dbService.getPeople(),
          dbService.getPlatforms()
      ]);
      setTeams(t);
      setPeople(p);
      setPlatforms(pl);
  };

  const handleExport = async () => {
    const teamsData = await dbService.getTeams();
    const people = await dbService.getPeople();
    const initiatives = await dbService.getInitiatives();
    const activities = await dbService.getActivities();
    
    const exportData = { meta: { generatedAt: new Date() }, teams: teamsData, people, initiatives, activities };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "manager_tower_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // --- Teams Logic ---

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;
    const id = `team_${newTeamName.toLowerCase().replace(/\s+/g, '_')}`;
    const newTeam: Team = {
      id,
      name: newTeamName,
      color: newTeamColor,
      active: true
    };
    await dbService.saveTeam(newTeam);
    setNewTeamName('');
    loadData();
  };

  const handleToggleTeamStatus = async (team: Team) => {
    const updatedTeam = { ...team, active: !team.active };
    await dbService.saveTeam(updatedTeam);
    loadData();
  };

  // --- People Logic ---
  
  const handleAddPerson = async () => {
      if (!newPersonName.trim()) return;
      const id = newPersonName.toLowerCase().replace(/\s+/g, '.'); // e.g. "John Doe" -> "john.doe"
      // Basic check for duplicates by ID
      if (people.find(p => p.id === id)) {
          alert('Person ID already exists.');
          return;
      }
      
      const newPerson: Person = { id, name: newPersonName, teamIds: selectedTeamsForPerson };
      await dbService.savePerson(newPerson);
      setNewPersonName('');
      setSelectedTeamsForPerson([]);
      loadData();
  };

  const toggleTeamForPerson = (teamId: string) => {
    setSelectedTeamsForPerson(prev => 
        prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  };

  const handleTogglePersonTeam = async (person: Person, teamId: string) => {
      const currentTeams = person.teamIds || [];
      const newTeams = currentTeams.includes(teamId) 
          ? currentTeams.filter(id => id !== teamId)
          : [...currentTeams, teamId];
      
      const updatedPerson = { ...person, teamIds: newTeams };
      await dbService.savePerson(updatedPerson);
      loadData();
  };

  const handleDeletePerson = async (id: string) => {
      if (window.confirm('Are you sure you want to delete this person?')) {
          await dbService.deletePerson(id);
          loadData();
      }
  };

  // --- Platforms Logic ---

  const handleAddPlatform = async () => {
    if (!newPlatformName.trim()) return;
    const id = `platform_${newPlatformName.toLowerCase().replace(/\s+/g, '_')}`;
    const newPlatform: Platform = {
      id,
      name: newPlatformName
    };
    await dbService.savePlatform(newPlatform);
    setNewPlatformName('');
    loadData();
  };

  const handleDeletePlatform = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this platform?')) {
      await dbService.deletePlatform(id);
      loadData();
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>

      {/* Theme */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
            <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">Theme Preference</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Switch between light and dark mode.</p>
            </div>
            <Button variant="secondary" onClick={toggleTheme} className="w-32 justify-between">
                <span className="capitalize">{theme}</span>
                {theme === 'light' ? <Sun className="w-4 h-4 ml-2" /> : <Moon className="w-4 h-4 ml-2" />}
            </Button>
        </div>
      </Card>

      {/* Teams Management */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Manage Teams</h2>
        </div>
        
        {/* Add Team */}
        <div className="flex gap-2 items-end bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
            <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Team Name</label>
                <input 
                    type="text" 
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    placeholder="Ex: Marketing"
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                />
            </div>
            <div className="space-y-1">
                 <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Color (Hex)</label>
                 <div className="flex items-center gap-2">
                    <input 
                        type="color" 
                        value={newTeamColor}
                        onChange={e => setNewTeamColor(e.target.value)}
                        className="h-9 w-12 cursor-pointer border-0 rounded p-0 bg-transparent"
                    />
                 </div>
            </div>
            <Button onClick={handleAddTeam} disabled={!newTeamName.trim()}>
                <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
        </div>

        {/* Team List */}
        <div className="space-y-2 mt-4">
            {teams.map(team => (
                <div key={team.id} className={`flex items-center justify-between p-3 rounded-lg border ${team.active ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }}></div>
                        <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{team.name}</p>
                            <p className="text-xs text-slate-400">{team.id}</p>
                        </div>
                        {!team.active && <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">Inactive</span>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleTeamStatus(team)} title={team.active ? "Deactivate Team" : "Activate Team"}>
                         {team.active ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                    </Button>
                </div>
            ))}
        </div>
      </Card>

      {/* People Management */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Manage People</h2>
        </div>

        {/* Add Person */}
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg space-y-3">
            <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Full Name</label>
                    <input 
                        type="text" 
                        value={newPersonName}
                        onChange={e => setNewPersonName(e.target.value)}
                        placeholder="Ex: John Doe"
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                    />
                </div>
                <Button onClick={handleAddPerson} disabled={!newPersonName.trim()}>
                    <Plus className="w-4 h-4 mr-2" /> Add Person
                </Button>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Assigned Teams</label>
                <div className="flex flex-wrap gap-2">
                    {teams.filter(t => t.active).map(team => (
                        <button
                            key={team.id}
                            onClick={() => toggleTeamForPerson(team.id)}
                            className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                selectedTeamsForPerson.includes(team.id)
                                ? 'bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-700 dark:text-indigo-300'
                                : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                            }`}
                        >
                            {team.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* People List */}
        <div className="grid grid-cols-1 gap-3 mt-4">
            {people.map(person => (
                <div key={person.id} className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 flex-1">
                         <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                            {person.name.substring(0, 2).toUpperCase()}
                         </div>
                        <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{person.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {teams.filter(t => t.active).map(team => (
                                    <button
                                        key={team.id}
                                        onClick={() => handleTogglePersonTeam(person, team.id)}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                            (person.teamIds || []).includes(team.id)
                                            ? 'bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200'
                                            : 'bg-transparent border-transparent text-slate-400 hover:border-slate-200 dark:text-slate-500'
                                        }`}
                                    >
                                        {team.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-400 mr-2">@{person.id}</p>
                        {/* Prevent deleting 'me' to avoid lockout of basic data */}
                        {person.id !== 'me' ? (
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePerson(person.id)} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        ) : (
                            <div className="w-8" />
                        )}
                    </div>
                </div>
            ))}
        </div>
      </Card>

      {/* Platforms Management */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
            <LayoutDashboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Manage Platforms</h2>
        </div>

        {/* Add Platform */}
        <div className="flex gap-2 items-end bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
            <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Platform Name</label>
                <input 
                    type="text" 
                    value={newPlatformName}
                    onChange={e => setNewPlatformName(e.target.value)}
                    placeholder="Ex: Mobile, Web, Backend"
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                />
            </div>
            <Button onClick={handleAddPlatform} disabled={!newPlatformName.trim()}>
                <Plus className="w-4 h-4 mr-2" /> Add Platform
            </Button>
        </div>

        {/* Platform List */}
        <div className="space-y-2 mt-4">
            {platforms.map(platform => (
                <div key={platform.id} className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{platform.name}</p>
                        <p className="text-xs text-slate-400">{platform.id}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeletePlatform(platform.id)} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ))}
            {platforms.length === 0 && (
                <p className="text-sm text-center text-slate-400 py-4">No platforms configured.</p>
            )}
        </div>
      </Card>

      {/* Data Export */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2">Data Management</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Export your local database to JSON for backup or migration.</p>
        <div className="flex gap-4">
            <Button variant="secondary" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export DB to JSON
            </Button>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dbService } from '../services/db';
import { Initiative, Status, Priority, Team, Person, Platform } from '../types';
import { Button, StatusBadge, PriorityBadge, Card, ProgressBar, Modal, Input, Select, TextArea } from '../components/ui';
import { Filter, Search, Plus, Trash2 } from 'lucide-react';
import { TEAM_COLORS } from '../constants';

const InitiativesList = () => {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [filterArchived, setFilterArchived] = useState(false);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  // Form State
  const [formData, setFormData] = useState<Partial<Initiative>>({
      title: '',
      description: '',
      priority: Priority.P2,
      status: Status.NotStarted,
      startDate: '',
      endDate: '',
      progress: 0,
      tags: [],
      platformId: ''
  });

  const loadData = async () => {
    const [inits, teamsData, peopleData, platformsData] = await Promise.all([
        dbService.getInitiatives(),
        dbService.getTeams(),
        dbService.getPeople(),
        dbService.getPlatforms()
    ]);
    setInitiatives(inits);
    setTeams(teamsData.filter(t => t.active));
    setPeople(peopleData);
    setPlatforms(platformsData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateInitiative = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title || !formData.teamId || !formData.ownerId) {
          alert("Please fill in required fields (Title, Team, Owner)");
          return;
      }

      const newInitiative: Initiative = {
          id: crypto.randomUUID(),
          title: formData.title!,
          description: formData.description || '',
          teamId: formData.teamId!,
          ownerId: formData.ownerId!,
          platformId: formData.platformId,
          priority: formData.priority as Priority,
          status: formData.status as Status,
          progress: 0,
          startDate: formData.startDate,
          endDate: formData.endDate,
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archived: false
      };

      await dbService.saveInitiative(newInitiative);
      setIsModalOpen(false);
      setFormData({ title: '', description: '', priority: Priority.P2, status: Status.NotStarted, startDate: '', endDate: '', platformId: '' }); // Reset
      loadData(); // Refresh
  };

  const handleArchive = async (id: string) => {
      if (window.confirm('Are you sure you want to archive this initiative?')) {
          await dbService.archiveInitiative(id);
          loadData();
      }
  };

  const filtered = initiatives.filter(i => {
    if (i.archived !== filterArchived) return false;
    if (selectedPlatformId !== 'all' && i.platformId !== selectedPlatformId) return false;
    if (searchTerm && !i.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All Initiatives</h1>
        <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Initiative
        </Button>
      </div>

      {/* Toolbar */}
      <Card className="p-4 flex flex-wrap gap-4 items-center">
         <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
                type="text" 
                placeholder="Search initiatives..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
            />
         </div>
         <div className="min-w-[150px]">
            <select 
                value={selectedPlatformId} 
                onChange={(e) => setSelectedPlatformId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700 dark:text-slate-200"
            >
                <option value="all">All Platforms</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
         </div>
         <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4">
             <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                 <input 
                    type="checkbox" 
                    checked={filterArchived} 
                    onChange={e => setFilterArchived(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-700" 
                 />
                 Show Archived
             </label>
             <Button variant="secondary" size="sm">
                <Filter className="w-4 h-4 mr-2" /> More Filters
             </Button>
         </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                <tr>
                    <th className="p-4 w-2"></th>
                    <th className="p-4">Title</th>
                    <th className="p-4">Team</th>
                    <th className="p-4">Owner</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4 w-32">Progress</th>
                    <th className="p-4">Timeline</th>
                    <th className="p-4">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map(initiative => (
                    <tr key={initiative.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className={`w-1 ${TEAM_COLORS[initiative.teamId]}`}></td>
                        <td className="p-4">
                            <Link to={`/initiatives/${initiative.id}`} className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400">
                                {initiative.title}
                            </Link>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{initiative.description}</div>
                        </td>
                        <td className="p-4">
                            <span className={`text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium`}>
                                {initiative.teamId.replace('team_', '').toUpperCase()}
                            </span>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">{initiative.ownerId}</td>
                        <td className="p-4"><StatusBadge status={initiative.status} /></td>
                        <td className="p-4"><PriorityBadge priority={initiative.priority} /></td>
                        <td className="p-4">
                            <div className="flex items-center gap-2">
                                <ProgressBar progress={initiative.progress} />
                                <span className="text-xs text-slate-500 dark:text-slate-400 w-8">{initiative.progress}%</span>
                            </div>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">
                            {initiative.endDate ? new Date(initiative.endDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-4">
                            {!initiative.archived && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleArchive(initiative.id)} 
                                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                    title="Archive Initiative"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {filtered.length === 0 && (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                No initiatives found matching filters.
            </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Initiative">
        <form onSubmit={handleCreateInitiative} className="space-y-4">
            <Input 
                label="Title" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                placeholder="e.g. Migration to Cloud"
                required
            />
            <TextArea 
                label="Description" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                placeholder="Goal and scope..."
                rows={3}
            />
            <div className="grid grid-cols-2 gap-4">
                <Select 
                    label="Team" 
                    value={formData.teamId} 
                    onChange={e => setFormData({...formData, teamId: e.target.value})}
                    required
                >
                    <option value="">Select Team</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
                <Select 
                    label="Platform" 
                    value={formData.platformId} 
                    onChange={e => setFormData({...formData, platformId: e.target.value})}
                >
                    <option value="">Select Platform</option>
                    {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Select 
                    label="Owner" 
                    value={formData.ownerId} 
                    onChange={e => setFormData({...formData, ownerId: e.target.value})}
                    required
                >
                    <option value="">Select Owner</option>
                    {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                <Select 
                    label="Priority" 
                    value={formData.priority} 
                    onChange={e => setFormData({...formData, priority: e.target.value as Priority})}
                >
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Select 
                    label="Status" 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value as Status})}
                >
                    {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Input 
                    type="date"
                    label="Start Date" 
                    value={formData.startDate} 
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                />
                <Input 
                    type="date"
                    label="End Date" 
                    value={formData.endDate} 
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                />
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit">Create Initiative</Button>
            </div>
        </form>
      </Modal>
    </div>
  );
};

export default InitiativesList;
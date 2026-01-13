import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dbService } from '../services/db';
import { Initiative, Status, Activity, Priority, Team, Person } from '../types';
import { Card, PriorityBadge, StatusBadge, ProgressBar, RiskBadge, Button, Modal, Input, Select, TextArea } from '../components/ui';
import { AlertCircle, Calendar, ArrowRight, Plus, ChevronDown, ChevronUp, Trash2, Filter, User, ArrowUpDown } from 'lucide-react';
import { TEAM_COLORS } from '../constants';

const Dashboard = () => {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  
  // Activity Filter State
  const [activityOwnerId, setActivityOwnerId] = useState<string>('me');
  const [activitySort, setActivitySort] = useState<'priority' | 'startDate' | 'endDate'>('endDate');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Initiative>>({
      title: '',
      description: '',
      priority: Priority.P2,
      status: Status.NotStarted,
      startDate: '',
      endDate: '',
      progress: 0,
      tags: []
  });

  const fetchData = async () => {
    const [inits, acts, teamsData, peopleData] = await Promise.all([
      dbService.getInitiatives(),
      dbService.getActivities(),
      dbService.getTeams(),
      dbService.getPeople()
    ]);
    setInitiatives(inits);
    setActivities(acts);
    setTeams(teamsData.filter(t => t.active));
    setPeople(peopleData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateInitiative = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title || !formData.teamId || !formData.ownerId) {
          alert("Please fill in required fields (Title, Team, Owner)");
          return;
      }

      const newInitiative: Initiative = {
          id: crypto.randomUUID(),
          title: formData.title,
          description: formData.description || '',
          teamId: formData.teamId,
          ownerId: formData.ownerId,
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
      setFormData({ title: '', description: '', priority: Priority.P2, status: Status.NotStarted, startDate: '', endDate: '' }); // Reset
      fetchData(); // Refresh
  };

  const handleArchiveInitiative = async (id: string) => {
      if (window.confirm('Are you sure you want to archive this initiative? It will be hidden from the main view.')) {
          // Optimistic update: Update state immediately to remove from view
          setInitiatives(prev => prev.map(i => i.id === id ? { ...i, archived: true } : i));
          
          await dbService.archiveInitiative(id);
          // Fetch data in background to ensure sync
          fetchData();
      }
  };

  const handleArchiveActivity = async (id: string) => {
      if (window.confirm('Archive this activity?')) {
          // Optimistic update: Update state immediately to remove from view
          setActivities(prev => prev.map(a => a.id === id ? { ...a, archived: true } : a));

          await dbService.archiveActivity(id);
          fetchData();
      }
  };

  const today = new Date();
  
  // KPIs (Calculated from NON-archived)
  const activeInitiatives = initiatives.filter(i => !i.archived);
  const activeCount = activeInitiatives.length;
  const blockedCount = activeInitiatives.filter(i => i.status === Status.Blocked).length;
  const overdueCount = activeInitiatives.filter(i => 
    i.status !== Status.Done && i.endDate && new Date(i.endDate) < today
  ).length;
  const dueSoonCount = activeInitiatives.filter(i => {
    if (!i.endDate || i.status === Status.Done) return false;
    const end = new Date(i.endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }).length;

  const visibleInitiatives = initiatives
    .filter(i => showArchived ? true : !i.archived)
    .filter(i => selectedTeamId === 'all' || i.teamId === selectedTeamId)
    .sort((a, b) => {
        // Sort logic: Blocked > P0 > Overdue > EndDate
        if (a.status === Status.Blocked && b.status !== Status.Blocked) return -1;
        if (b.status === Status.Blocked && a.status !== Status.Blocked) return 1;
        if (a.priority === Priority.P0 && b.priority !== Priority.P0) return -1;
        if (b.priority === Priority.P0 && a.priority !== Priority.P0) return 1;
        return new Date(a.endDate || '').getTime() - new Date(b.endDate || '').getTime();
  });

  const filteredActivities = activities
    .filter(a => (activityOwnerId === 'all' || a.ownerId === activityOwnerId) && a.status !== Status.Done && !a.archived)
    .sort((a, b) => {
        if (activitySort === 'priority') {
            return a.priority.localeCompare(b.priority);
        } else if (activitySort === 'startDate') {
            return new Date(a.startDate || '9999-12-31').getTime() - new Date(b.startDate || '9999-12-31').getTime();
        } else {
            // endDate
            return new Date(a.endDate || '9999-12-31').getTime() - new Date(b.endDate || '9999-12-31').getTime();
        }
    });

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading dashboard...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Control Tower</h1>
          <p className="text-slate-500 dark:text-slate-400">Overview of active risks and priorities</p>
        </div>
        <div className="flex space-x-3 items-center">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none mr-2">
                 <input 
                    type="checkbox" 
                    checked={showArchived} 
                    onChange={e => setShowArchived(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-700" 
                 />
                 Show Archived
             </label>
            <Button size="md" onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Initiative
            </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Active Initiatives" value={activeCount} icon={<Calendar className="text-indigo-600 dark:text-indigo-400" />} />
        <KPICard title="Blocked" value={blockedCount} color="text-rose-600 dark:text-rose-400" bg="bg-rose-50 dark:bg-rose-900/20" icon={<AlertCircle className="text-rose-600 dark:text-rose-400" />} />
        <KPICard title="Overdue" value={overdueCount} color="text-orange-600 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-900/20" />
        <KPICard title="Due Soon (7d)" value={dueSoonCount} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-900/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-end">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Priority & Risk Watchlist</h2>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1">
                    <Filter className="w-3 h-3 text-slate-500" />
                    <select 
                        value={selectedTeamId} 
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="bg-transparent border-none text-xs text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer py-0 pl-0 pr-6"
                    >
                        <option value="all">All Teams</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <Link to="/initiatives" className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">View All</Link>
            </div>
          </div>
          
          <div className="space-y-3">
            {visibleInitiatives.map(initiative => (
                <InitiativeRow 
                    key={initiative.id} 
                    initiative={{
                        ...initiative,
                        progress: (() => {
                            const initActivities = activities.filter(a => a.initiativeId === initiative.id && !a.archived);
                            if (initActivities.length === 0) return 0;
                            const doneActivities = initActivities.filter(a => a.status === Status.Done);
                            return Math.round((doneActivities.length / initActivities.length) * 100);
                        })()
                    }}
                    activities={activities.filter(a => a.initiativeId === initiative.id && (showArchived ? true : !a.archived))}
                    showArchived={showArchived}
                    onArchive={() => handleArchiveInitiative(initiative.id)}
                    onArchiveActivity={handleArchiveActivity}
                />
            ))}
            {visibleInitiatives.length === 0 && (
                <div className="text-center py-10 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    No active initiatives found for this filter.
                </div>
            )}
          </div>
        </div>

        {/* Sidebar: My Actions */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                {activityOwnerId === 'me' ? 'My' : 'Team'} Next Actions
              </h2>
              <div className="flex gap-2">
                 {/* Owner Filter */}
                 <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1">
                    <User className="w-3 h-3 text-slate-500" />
                    <select 
                        value={activityOwnerId} 
                        onChange={(e) => setActivityOwnerId(e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer py-0 pl-0"
                    >
                        <option value="me">Me</option>
                        <option value="all">All</option>
                        {people.filter(p => p.id !== 'me').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                 </div>
                 {/* Sort */}
                 <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1">
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    <select 
                        value={activitySort} 
                        onChange={(e) => setActivitySort(e.target.value as any)}
                        className="w-full bg-transparent border-none text-xs text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer py-0 pl-0"
                    >
                        <option value="endDate">Due Date</option>
                        <option value="startDate">Start Date</option>
                        <option value="priority">Priority</option>
                    </select>
                 </div>
              </div>
          </div>
          <Card className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredActivities.length > 0 ? filteredActivities.map(activity => (
              <div key={activity.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                 <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{activity.priority}</span>
                    <span className={`text-xs ${new Date(activity.endDate||'') < today ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                        {activity.endDate ? new Date(activity.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                    </span>
                 </div>
                 <Link to={`/initiatives/${activity.initiativeId}`} className="block font-medium text-slate-800 dark:text-slate-200 text-sm mb-1 hover:text-indigo-600 dark:hover:text-indigo-400">
                    {activity.title}
                 </Link>
                 <div className="flex justify-between items-center">
                    <StatusBadge status={activity.status} />
                    {activityOwnerId === 'all' && <span className="text-xs text-slate-400">{activity.ownerId}</span>}
                 </div>
              </div>
            )) : (
                <div className="p-6 text-center text-sm text-slate-400 dark:text-slate-500">
                    No pending activities.
                </div>
            )}
          </Card>
        </div>
      </div>

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
                    label="Owner" 
                    value={formData.ownerId} 
                    onChange={e => setFormData({...formData, ownerId: e.target.value})}
                    required
                >
                    <option value="">Select Owner</option>
                    {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Select 
                    label="Priority" 
                    value={formData.priority} 
                    onChange={e => setFormData({...formData, priority: e.target.value as Priority})}
                >
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
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

const InitiativeRow: React.FC<{ 
    initiative: Initiative, 
    activities: Activity[], 
    onArchive: () => void,
    onArchiveActivity: (id: string) => void,
    showArchived: boolean
}> = ({ initiative, activities, onArchive, onArchiveActivity, showArchived }) => {
    const [expanded, setExpanded] = useState(false);
    const today = new Date();
    const isOverdue = initiative.endDate ? new Date(initiative.endDate) < today : false;
    const isBlocked = initiative.status === Status.Blocked;

    return (
        <Card className={`hover:shadow-md transition-shadow relative overflow-hidden group ${initiative.archived ? 'opacity-60 border-dashed bg-slate-50' : ''}`}>
            {/* Left accent border for Team */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${TEAM_COLORS[initiative.teamId] || 'bg-slate-300'}`} />
            
            <div className="p-4 pl-5">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-1 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                        <div className="flex items-center gap-2 mb-1">
                            <PriorityBadge priority={initiative.priority} />
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                {initiative.title}
                                {initiative.archived && <span className="text-xs bg-slate-200 px-2 rounded text-slate-600">Archived</span>}
                            </h3>
                            <RiskBadge overdue={isOverdue && initiative.status !== Status.Done} blocked={isBlocked} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                            <span>{initiative.ownerId === 'me' ? 'You' : initiative.ownerId}</span>
                            <span>•</span>
                            <span>{initiative.endDate ? new Date(initiative.endDate).toLocaleDateString() : 'No Date'}</span>
                            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                                {activities.length} activities {expanded ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                            </span>
                        </div>
                    </div>

                    <div className="w-full md:w-32 flex flex-col gap-1">
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Progress</span>
                            <span>{initiative.progress}%</span>
                        </div>
                        <ProgressBar progress={initiative.progress} />
                    </div>

                    <div className="flex items-center gap-2">
                        <StatusBadge status={initiative.status} />
                        {!initiative.archived && (
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onArchive(); }} title="Archive Initiative" className="text-slate-400 hover:text-rose-600">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                        <Link to={`/initiatives/${initiative.id}`}>
                            <Button variant="ghost" size="icon">
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Collapsible Activities List */}
                {expanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 -mx-5 px-5 -mb-4 pb-4">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Activities</h4>
                        <div className="space-y-2">
                            {activities.map(act => (
                                <div key={act.id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 text-sm">
                                    <div className="flex items-center gap-3">
                                        <StatusBadge status={act.status} />
                                        <div className="flex flex-col">
                                            <span className={`${act.status === Status.Done ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>{act.title}</span>
                                            <div className="flex gap-2 text-xs text-slate-500">
                                                <span>{act.ownerId}</span>
                                                {act.endDate && <span>Due: {new Date(act.endDate).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {!act.archived && (
                                            <button onClick={(e) => { e.stopPropagation(); onArchiveActivity(act.id); }} className="text-slate-400 hover:text-rose-500 p-1" title="Archive Activity">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <Link to={`/initiatives/${initiative.id}`} className="text-slate-400 hover:text-indigo-600 p-1">
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                            {activities.length === 0 && <div className="text-xs text-slate-400 italic">No activities found.</div>}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}

const KPICard = ({ title, value, icon, color = 'text-slate-900 dark:text-white', bg = 'bg-white dark:bg-slate-700' }: any) => (
  <Card className="p-5 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
    {icon && <div className={`p-3 rounded-full ${bg}`}>{icon}</div>}
  </Card>
);

export default Dashboard;
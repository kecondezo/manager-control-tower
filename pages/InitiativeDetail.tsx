import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../services/db';
import { Initiative, Activity, ActivityLog, Status, Priority, Person, Team } from '../types';
import { Button, StatusBadge, PriorityBadge, Card, ProgressBar, Modal, Input, Select, TextArea } from '../components/ui';
import { ArrowLeft, Archive, Plus, Calendar, User, MessageSquare, Send, GripHorizontal, FileText, History, Trash2, Edit2 } from 'lucide-react';

const InitiativeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  // Modals & Data State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'kanban' | 'list'>('kanban');
  
  // Edit Initiative Modal State
  const [isEditInitiativeModalOpen, setIsEditInitiativeModalOpen] = useState(false);
  const [editInitiativeForm, setEditInitiativeForm] = useState<Partial<Initiative>>({});

  // Activity Modal State
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null); 
  const [activityModalTab, setActivityModalTab] = useState<'details' | 'log'>('log'); // Default to log to see history fast
  const [selectedActivityLogs, setSelectedActivityLogs] = useState<ActivityLog[]>([]);
  const [newLogMessage, setNewLogMessage] = useState('');

  // Drag and Drop State
  const [draggedActivityId, setDraggedActivityId] = useState<string | null>(null);

  // New Activity Form State
  const [activityForm, setActivityForm] = useState<Partial<Activity>>({
      title: '',
      description: '',
      priority: Priority.P2,
      status: Status.NotStarted,
      startDate: '',
      endDate: '',
      ownerId: 'me'
  });

  const refreshData = async () => {
    if (!id) return;
    const [init, acts, ppl, tms] = await Promise.all([
        dbService.getInitiative(id),
        dbService.getActivities(id),
        dbService.getPeople(),
        dbService.getTeams()
    ]);

    setInitiative(init || null);
    setActivities(acts.filter(a => !a.archived));
    setPeople(ppl);
    setTeams(tms);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [id]);

  // --- Handlers ---

  const handleOpenEditInitiative = () => {
      if (!initiative) return;
      setEditInitiativeForm({
          title: initiative.title,
          description: initiative.description,
          priority: initiative.priority,
          ownerId: initiative.ownerId,
          startDate: initiative.startDate,
          endDate: initiative.endDate,
          teamId: initiative.teamId,
          status: initiative.status
      });
      setIsEditInitiativeModalOpen(true);
  };

  const handleUpdateInitiative = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!initiative) return;

      const updatedInitiative = {
          ...initiative,
          ...editInitiativeForm,
          updatedAt: new Date().toISOString()
      };

      await dbService.saveInitiative(updatedInitiative);
      setInitiative(updatedInitiative);
      setIsEditInitiativeModalOpen(false);
  };

  const handleUpdateInitiativeStatus = async (newStatus: Status) => {
      if (!initiative) return;
      const updated = { ...initiative, status: newStatus };
      // Optimistic update
      setInitiative(updated);
      await dbService.saveInitiative(updated);
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!id || !activityForm.title || !activityForm.ownerId) {
          alert('Missing required fields');
          return;
      }

      const newActivity: Activity = {
          id: crypto.randomUUID(),
          initiativeId: id,
          title: activityForm.title,
          description: activityForm.description || '',
          ownerId: activityForm.ownerId,
          priority: activityForm.priority as Priority,
          status: activityForm.status as Status,
          startDate: activityForm.startDate,
          endDate: activityForm.endDate,
          archived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
      };

      await dbService.saveActivity(newActivity);
      setIsActivityModalOpen(false);
      setActivityForm({ title: '', description: '', priority: Priority.P2, status: Status.NotStarted, startDate: '', endDate: '', ownerId: 'me' });
      refreshData();
  };

  const handleArchiveActivity = async (actId: string) => {
    if(window.confirm('Are you sure you want to archive this activity? It will disappear from this view.')) {
        await dbService.archiveActivity(actId);
        // Remove from local state immediately
        setActivities(prev => prev.filter(a => a.id !== actId));
        if (selectedActivity?.id === actId) {
            setSelectedActivity(null);
        }
    }
  };

  const handleUpdateActivityStatus = async (activityId: string, newStatus: Status) => {
      const activity = activities.find(a => a.id === activityId);
      if (!activity) return;

      const updated = { ...activity, status: newStatus };
      
      // Optimistic Update
      setActivities(prev => prev.map(a => a.id === activityId ? updated : a));
      
      await dbService.saveActivity(updated);
  };

  // --- Drag and Drop Handlers ---

  const onDragStart = (e: React.DragEvent, activityId: string) => {
      setDraggedActivityId(activityId);
      e.dataTransfer.effectAllowed = 'move';
      // Set data just in case, though we use state
      e.dataTransfer.setData('text/plain', activityId);
  };

  const onDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = async (e: React.DragEvent, targetStatus: Status) => {
      e.preventDefault();
      if (!draggedActivityId) return;
      
      const activity = activities.find(a => a.id === draggedActivityId);
      if (activity && activity.status !== targetStatus) {
         await handleUpdateActivityStatus(draggedActivityId, targetStatus);
      }
      setDraggedActivityId(null);
  };

  // --- Details & Log Handlers ---

  const openActivityDetails = async (activity: Activity) => {
      setSelectedActivity(activity);
      setActivityModalTab('log'); // Default open to logs
      const logs = await dbService.getLogs(activity.id);
      setSelectedActivityLogs(logs);
      setNewLogMessage('');
  };

  const handleAddLog = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedActivity || !newLogMessage.trim()) return;

      const log: ActivityLog = {
          id: crypto.randomUUID(),
          activityId: selectedActivity.id,
          createdAt: new Date().toISOString(),
          authorId: 'me', 
          message: newLogMessage
      };

      await dbService.addLog(log);
      const updatedLogs = await dbService.getLogs(selectedActivity.id);
      setSelectedActivityLogs(updatedLogs);
      setNewLogMessage('');
  };

  const handleUpdateActivityDetails = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedActivity) return;
      await dbService.saveActivity(selectedActivity);
      // Refresh list to show new details
      setActivities(prev => prev.map(a => a.id === selectedActivity.id ? selectedActivity : a));
      alert('Activity updated');
  };

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>;
  if (!initiative) return <div className="p-8 text-slate-500 dark:text-slate-400">Initiative not found</div>;

  const activitiesByStatus = {
    [Status.NotStarted]: activities.filter(a => a.status === Status.NotStarted),
    [Status.InProgress]: activities.filter(a => a.status === Status.InProgress),
    [Status.Blocked]: activities.filter(a => a.status === Status.Blocked),
    [Status.Done]: activities.filter(a => a.status === Status.Done),
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Nav */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1" />
        <Button variant="secondary" size="sm" onClick={() => {
            if(window.confirm('Archive entire initiative?')) {
                dbService.archiveInitiative(initiative.id).then(() => navigate('/initiatives'));
            }
        }}>
           <Archive className="w-4 h-4 mr-2" /> Archive Initiative
        </Button>
      </div>

      {/* Initiative Header */}
      <Card className="p-6 relative group">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{initiative.title}</h1>
                    <PriorityBadge priority={initiative.priority} />
                    
                    {/* Editable Status for Initiative */}
                    <div className="relative">
                        <select 
                            value={initiative.status}
                            onChange={(e) => handleUpdateInitiativeStatus(e.target.value as Status)}
                            className="appearance-none bg-slate-100 dark:bg-slate-700 border border-transparent hover:border-slate-300 dark:hover:border-slate-500 text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 max-w-2xl">{initiative.description}</p>
                <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400 mt-4">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Owner: <span className="font-medium text-slate-800 dark:text-slate-200">{initiative.ownerId}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{initiative.startDate || 'TBD'} - {initiative.endDate || 'TBD'}</span>
                    </div>
                </div>
            </div>
            <div className="w-full md:w-64 space-y-2 flex flex-col items-end">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleOpenEditInitiative}
                >
                    <Edit2 className="w-4 h-4 mr-1" /> Edit
                </Button>
                <div className="w-full">
                    <div className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                        <span>Progress</span>
                        <span>{initiative.progress}%</span>
                    </div>
                    <ProgressBar progress={initiative.progress} />
                </div>
            </div>
        </div>
      </Card>

      {/* Activities Toolbar */}
      <div className="flex justify-between items-center mt-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Activities</h2>
        <div className="flex items-center gap-2">
             <div className="bg-slate-200 dark:bg-slate-700 p-1 rounded-lg flex text-sm font-medium text-slate-600 dark:text-slate-300">
                <button onClick={() => setActiveTab('kanban')} className={`px-3 py-1 rounded-md transition-colors ${activeTab==='kanban' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-400' : 'hover:text-slate-900 dark:hover:text-white'}`}>Kanban</button>
                <button onClick={() => setActiveTab('list')} className={`px-3 py-1 rounded-md transition-colors ${activeTab==='list' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-400' : 'hover:text-slate-900 dark:hover:text-white'}`}>List</button>
             </div>
             <Button size="sm" onClick={() => setIsActivityModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> New Activity
             </Button>
        </div>
      </div>

      {/* === KANBAN VIEW === */}
      {activeTab === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4 h-[600px]">
            {Object.entries(activitiesByStatus).map(([status, items]) => (
                <div 
                    key={status} 
                    className={`bg-slate-100 dark:bg-slate-800/40 rounded-xl p-3 min-w-[280px] flex flex-col h-full transition-colors ${draggedActivityId ? 'bg-slate-50 border-2 border-dashed border-slate-200' : ''}`}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, status as Status)}
                >
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3 px-1 flex justify-between shrink-0">
                        {status}
                        <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 rounded-full text-xs py-0.5">{items.length}</span>
                    </h3>
                    <div className="space-y-3 overflow-y-auto flex-1 p-1">
                        {items.map(activity => (
                            <ActivityCard 
                                key={activity.id} 
                                activity={activity} 
                                onClick={() => openActivityDetails(activity)}
                                draggable
                                onDragStart={(e) => onDragStart(e, activity.id)}
                            />
                        ))}
                         {items.length === 0 && <div className="h-full flex items-center justify-center text-xs text-slate-400">Drop here</div>}
                    </div>
                </div>
            ))}
        </div>
      ) : (
        /* === LIST VIEW === */
        <Card>
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                        <th className="p-4 font-medium">Priority</th>
                        <th className="p-4 font-medium">Activity</th>
                        <th className="p-4 font-medium">Owner</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">End Date</th>
                        <th className="p-4 font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {activities.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="p-4"><PriorityBadge priority={a.priority} /></td>
                            <td className="p-4 font-medium text-slate-900 dark:text-slate-100 cursor-pointer hover:text-indigo-600" onClick={() => openActivityDetails(a)}>{a.title}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">{a.ownerId}</td>
                            <td className="p-4">
                                {/* Editable Status in List */}
                                <select 
                                    value={a.status}
                                    onChange={(e) => handleUpdateActivityStatus(a.id, e.target.value as Status)}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500"
                                >
                                    {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">{a.endDate}</td>
                            <td className="p-4">
                                <Button variant="ghost" size="sm" onClick={() => handleArchiveActivity(a.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
      )}

      {/* === EDIT INITIATIVE MODAL === */}
      <Modal isOpen={isEditInitiativeModalOpen} onClose={() => setIsEditInitiativeModalOpen(false)} title="Edit Initiative">
          <form onSubmit={handleUpdateInitiative} className="space-y-4">
              <Input 
                  label="Title" 
                  value={editInitiativeForm.title || ''} 
                  onChange={e => setEditInitiativeForm({...editInitiativeForm, title: e.target.value})} 
                  required
              />
              <TextArea 
                  label="Description" 
                  value={editInitiativeForm.description || ''} 
                  onChange={e => setEditInitiativeForm({...editInitiativeForm, description: e.target.value})} 
                  rows={3}
              />
              <div className="grid grid-cols-2 gap-4">
                  <Select 
                      label="Team" 
                      value={editInitiativeForm.teamId || ''} 
                      onChange={e => setEditInitiativeForm({...editInitiativeForm, teamId: e.target.value})}
                      required
                  >
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                  <Select 
                      label="Owner" 
                      value={editInitiativeForm.ownerId || ''} 
                      onChange={e => setEditInitiativeForm({...editInitiativeForm, ownerId: e.target.value})}
                      required
                  >
                      {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <Select 
                      label="Priority" 
                      value={editInitiativeForm.priority || Priority.P2} 
                      onChange={e => setEditInitiativeForm({...editInitiativeForm, priority: e.target.value as Priority})}
                  >
                      {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                  <Select 
                      label="Status" 
                      value={editInitiativeForm.status || Status.NotStarted} 
                      onChange={e => setEditInitiativeForm({...editInitiativeForm, status: e.target.value as Status})}
                  >
                      {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <Input 
                      type="date"
                      label="Start Date" 
                      value={editInitiativeForm.startDate || ''} 
                      onChange={e => setEditInitiativeForm({...editInitiativeForm, startDate: e.target.value})}
                  />
                  <Input 
                      type="date"
                      label="End Date" 
                      value={editInitiativeForm.endDate || ''} 
                      onChange={e => setEditInitiativeForm({...editInitiativeForm, endDate: e.target.value})}
                  />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setIsEditInitiativeModalOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Changes</Button>
              </div>
          </form>
      </Modal>

      {/* === CREATE ACTIVITY MODAL === */}
      <Modal isOpen={isActivityModalOpen} onClose={() => setIsActivityModalOpen(false)} title="New Activity">
        <form onSubmit={handleCreateActivity} className="space-y-4">
             <Input 
                label="Title" 
                value={activityForm.title} 
                onChange={e => setActivityForm({...activityForm, title: e.target.value})} 
                placeholder="What needs to be done?"
                required
            />
             <TextArea 
                label="Description" 
                value={activityForm.description} 
                onChange={e => setActivityForm({...activityForm, description: e.target.value})} 
                rows={2}
            />
            <div className="grid grid-cols-2 gap-4">
                 <Select 
                    label="Owner" 
                    value={activityForm.ownerId} 
                    onChange={e => setActivityForm({...activityForm, ownerId: e.target.value})}
                    required
                >
                    {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                 <Select 
                    label="Priority" 
                    value={activityForm.priority} 
                    onChange={e => setActivityForm({...activityForm, priority: e.target.value as Priority})}
                >
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Input 
                    type="date"
                    label="Start Date" 
                    value={activityForm.startDate} 
                    onChange={e => setActivityForm({...activityForm, startDate: e.target.value})}
                />
                <Input 
                    type="date"
                    label="End Date" 
                    value={activityForm.endDate} 
                    onChange={e => setActivityForm({...activityForm, endDate: e.target.value})}
                />
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setIsActivityModalOpen(false)}>Cancel</Button>
                <Button type="submit">Create Activity</Button>
            </div>
        </form>
      </Modal>

      {/* === VIEW/EDIT ACTIVITY DETAILS & LOGS MODAL === */}
      {selectedActivity && (
          <Modal isOpen={!!selectedActivity} onClose={() => setSelectedActivity(null)} title={selectedActivity.title}>
              
              {/* Tabs Header */}
              <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                  <button 
                    onClick={() => setActivityModalTab('log')}
                    className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activityModalTab === 'log' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                      <span className="flex items-center justify-center gap-2"><History className="w-4 h-4"/> Bitácora / Log</span>
                  </button>
                  <button 
                    onClick={() => setActivityModalTab('details')}
                    className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activityModalTab === 'details' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                      <span className="flex items-center justify-center gap-2"><FileText className="w-4 h-4"/> Details</span>
                  </button>
              </div>

              {/* Tab Content */}
              <div className="min-h-[300px]">
                  
                  {/* --- TAB: LOGS --- */}
                  {activityModalTab === 'log' && (
                      <div className="flex flex-col h-full">
                          <div className="flex-1 space-y-3 max-h-[400px] overflow-y-auto mb-4 pr-1">
                              {selectedActivityLogs.length === 0 && <div className="text-center py-8 text-slate-400 italic">No logs recorded yet.</div>}
                              {selectedActivityLogs.map(log => (
                                  <div key={log.id} className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg text-sm border border-slate-100 dark:border-slate-700">
                                      <div className="flex justify-between items-center mb-1 text-xs text-slate-500 dark:text-slate-400">
                                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{log.authorId}</span>
                                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                                      </div>
                                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{log.message}</p>
                                  </div>
                              ))}
                          </div>
                          <form onSubmit={handleAddLog} className="flex gap-2 mt-auto border-t border-slate-100 dark:border-slate-700 pt-4">
                              <TextArea 
                                className="flex-1 min-h-[50px]" 
                                placeholder="Write a new entry..." 
                                value={newLogMessage}
                                onChange={e => setNewLogMessage(e.target.value)}
                                rows={2}
                              />
                              <Button size="icon" className="h-auto self-end" type="submit" disabled={!newLogMessage.trim()}>
                                  <Send className="w-4 h-4" />
                              </Button>
                          </form>
                      </div>
                  )}

                  {/* --- TAB: DETAILS (EDIT) --- */}
                  {activityModalTab === 'details' && (
                      <form onSubmit={handleUpdateActivityDetails} className="space-y-4">
                           <Input 
                                label="Title" 
                                value={selectedActivity.title} 
                                onChange={e => setSelectedActivity({...selectedActivity, title: e.target.value})} 
                           />
                           <TextArea 
                                label="Description" 
                                value={selectedActivity.description || ''} 
                                onChange={e => setSelectedActivity({...selectedActivity, description: e.target.value})} 
                                rows={3}
                           />
                           <div className="grid grid-cols-2 gap-4">
                                <Select 
                                    label="Status" 
                                    value={selectedActivity.status} 
                                    onChange={e => setSelectedActivity({...selectedActivity, status: e.target.value as Status})}
                                >
                                    {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                                </Select>
                                <Select 
                                    label="Priority" 
                                    value={selectedActivity.priority} 
                                    onChange={e => setSelectedActivity({...selectedActivity, priority: e.target.value as Priority})}
                                >
                                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                                </Select>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    type="date"
                                    label="Start Date" 
                                    value={selectedActivity.startDate || ''} 
                                    onChange={e => setSelectedActivity({...selectedActivity, startDate: e.target.value})}
                                />
                                <Input 
                                    type="date"
                                    label="End Date" 
                                    value={selectedActivity.endDate || ''} 
                                    onChange={e => setSelectedActivity({...selectedActivity, endDate: e.target.value})}
                                />
                           </div>
                           <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
                                <Button variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => {
                                    handleArchiveActivity(selectedActivity.id);
                                    setSelectedActivity(null);
                                }}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Archive Activity
                                </Button>
                                <Button type="submit">Save Changes</Button>
                           </div>
                      </form>
                  )}
              </div>
          </Modal>
      )}

    </div>
  );
};

const ActivityCard: React.FC<{ 
    activity: Activity, 
    onClick: () => void, 
    draggable?: boolean,
    onDragStart?: (e: React.DragEvent) => void 
}> = ({ activity, onClick, draggable, onDragStart }) => {
    const isOverdue = activity.endDate && new Date(activity.endDate) < new Date() && activity.status !== Status.Done;
    
    return (
        <div 
            onClick={onClick}
            draggable={draggable}
            onDragStart={onDragStart}
            className={`bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 group hover:shadow-md transition-all cursor-pointer select-none ${activity.status === Status.Done ? 'opacity-75' : ''} ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            <div className="flex justify-between items-start mb-2">
                <PriorityBadge priority={activity.priority} />
                {draggable && <GripHorizontal className="w-4 h-4 text-slate-300" />}
            </div>
            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1 leading-snug">{activity.title}</h4>
            
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>{activity.ownerId}</span>
                {activity.endDate && (
                    <span className={`flex items-center ${isOverdue ? 'text-red-600 dark:text-red-400 font-bold' : ''}`}>
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(activity.endDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                    </span>
                )}
            </div>
        </div>
    );
};

export default InitiativeDetail;
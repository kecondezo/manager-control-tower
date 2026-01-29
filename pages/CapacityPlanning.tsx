import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Initiative, Person, CapacityAssignment, Team } from '../types';
import { Card, Button, Modal, Select, Input } from '../components/ui';
import { Users, Calendar, Plus, Trash2, Save, AlertCircle } from 'lucide-react';

const CapacityPlanning = () => {
    const [people, setPeople] = useState<Person[]>([]);
    const [initiatives, setInitiatives] = useState<Initiative[]>([]);
    const [assignments, setAssignments] = useState<CapacityAssignment[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    // Modal state for adding assignment
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState<{personId: string, month: number} | null>(null);
    const [newAssignment, setNewAssignment] = useState({
        initiativeId: '',
        percentage: 100
    });

    const fetchData = async () => {
        setLoading(true);
        const [p, i, a, t] = await Promise.all([
            dbService.getPeople(),
            dbService.getInitiatives(),
            dbService.getCapacityAssignments(selectedYear),
            dbService.getTeams()
        ]);
        setPeople(p);
        setInitiatives(i.filter(init => !init.archived));
        setAssignments(a);
        setTeams(t.filter(team => team.active));
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [selectedYear]);

    const months = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];

    const handleOpenCell = (personId: string, month: number) => {
        setSelectedCell({ personId, month });
        setNewAssignment({ initiativeId: '', percentage: 100 });
        setIsModalOpen(true);
    };

    const handleAddAssignment = async () => {
        if (!selectedCell || !newAssignment.initiativeId) return;

        const assignment: CapacityAssignment = {
            id: crypto.randomUUID(),
            personId: selectedCell.personId,
            initiativeId: newAssignment.initiativeId,
            year: selectedYear,
            month: selectedCell.month,
            percentage: Number(newAssignment.percentage),
            updatedAt: new Date().toISOString()
        };

        await dbService.saveCapacityAssignment(assignment);
        setIsModalOpen(false);
        fetchData();
    };

    const handleDeleteAssignment = async (id: string) => {
        if (window.confirm('¿Eliminar esta asignación?')) {
            await dbService.deleteCapacityAssignment(id);
            fetchData();
        }
    };

    const getAssignmentsForCell = (personId: string, month: number) => {
        return assignments.filter(a => a.personId === personId && a.month === month);
    };

    const getTotalPercentage = (personId: string, month: number) => {
        return getAssignmentsForCell(personId, month).reduce((sum, a) => sum + a.percentage, 0);
    };

    const filteredPeople = people.filter(person => {
        if (selectedTeamId === 'all') return true;
        return (person.teamIds || []).includes(selectedTeamId);
    });

    if (loading) return <div className="p-8 text-slate-500">Cargando planificación...</div>;

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-6 h-6 text-indigo-600" />
                        Capacity Planning
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Planificación de dedicación del equipo por iniciativa</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <select 
                            value={selectedTeamId} 
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer dark:text-white"
                        >
                            <option value="all">Todos los equipos</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer dark:text-white"
                        >
                            {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50">
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 w-48">
                                    Persona
                                </th>
                                {months.map((month, idx) => (
                                    <th key={month} className="p-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 min-w-[120px]">
                                        {month}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredPeople.map(person => (
                                <tr key={person.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4 sticky left-0 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700/50 z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase">
                                                {person.name.substring(0, 2)}
                                            </div>
                                            <span className="font-medium text-slate-900 dark:text-slate-100">{person.name}</span>
                                        </div>
                                    </td>
                                    {months.map((_, monthIdx) => {
                                        const monthNum = monthIdx + 1;
                                        const cellAssignments = getAssignmentsForCell(person.id, monthNum);
                                        const total = getTotalPercentage(person.id, monthNum);
                                        
                                        return (
                                            <td key={monthNum} className="p-2 border-r border-slate-100 dark:border-slate-700/50 align-top group">
                                                <div className="space-y-1 min-h-[80px]">
                                                    {cellAssignments.map(a => {
                                                        const init = initiatives.find(i => i.id === a.initiativeId);
                                                        return (
                                                            <div key={a.id} className="text-[10px] p-1.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm flex flex-col relative group/item">
                                                                <span className="font-bold truncate text-slate-800 dark:text-slate-200" title={init?.title}>
                                                                    {init?.title || 'Unknown'}
                                                                </span>
                                                                <div className="flex justify-between items-center mt-1">
                                                                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">{a.percentage}%</span>
                                                                    <button 
                                                                        onClick={() => handleDeleteAssignment(a.id)}
                                                                        className="opacity-0 group-hover/item:opacity-100 text-rose-500 hover:text-rose-700 transition-opacity"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    <button 
                                                        onClick={() => handleOpenCell(person.id, monthNum)}
                                                        className="w-full py-1 border border-dashed border-slate-300 dark:border-slate-600 rounded text-slate-400 hover:text-indigo-600 hover:border-indigo-400 dark:hover:text-indigo-400 dark:hover:border-indigo-500 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Plus className="w-4 h-4 mx-auto" />
                                                    </button>
                                                </div>
                                                {total > 0 && (
                                                    <div className={`mt-2 text-[10px] font-bold text-center py-0.5 rounded ${
                                                        total > 100 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 
                                                        total === 100 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                    }`}>
                                                        Total: {total}%
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {filteredPeople.length === 0 && (
                                <tr>
                                    <td colSpan={13} className="p-8 text-center text-slate-500 dark:text-slate-400">
                                        No hay personas configuradas para este equipo.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={`Asignar Iniciativa - ${selectedCell ? months[selectedCell.month - 1] : ''}`}
            >
                <div className="space-y-4">
                    <Select 
                        label="Iniciativa"
                        value={newAssignment.initiativeId}
                        onChange={(e) => setNewAssignment({ ...newAssignment, initiativeId: e.target.value })}
                    >
                        <option value="">Seleccionar iniciativa...</option>
                        {initiatives.map(i => (
                            <option key={i.id} value={i.id}>{i.title}</option>
                        ))}
                    </Select>
                    <Input 
                        label="Porcentaje de dedicación (%)"
                        type="number"
                        min="1"
                        max="200"
                        value={newAssignment.percentage}
                        onChange={(e) => setNewAssignment({ ...newAssignment, percentage: Number(e.target.value) })}
                    />
                    <div className="pt-4 flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddAssignment} disabled={!newAssignment.initiativeId}>
                            Asignar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CapacityPlanning;

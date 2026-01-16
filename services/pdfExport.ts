import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Initiative, Activity, Status, ActivityLog } from '../types';
import { dbService } from './db';

export const exportExecutiveSummary = async (
  initiatives: Initiative[],
  activities: Activity[],
  teams: any[],
  people: any[]
) => {
  const doc = new jsPDF();
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // Title
  doc.setFontSize(18);
  doc.text('Resumen Ejecutivo de Iniciativas', 14, 20);
  doc.setFontSize(10);
  doc.text(`Fecha de generación: ${now.toLocaleString()}`, 14, 28);

  let currentY = 35;

  for (const init of initiatives) {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    // Initiative Header
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(init.title, 14, currentY);
    currentY += 7;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const team = teams.find(t => t.id === init.teamId)?.name || 'Sin equipo';
    const owner = people.find(p => p.id === init.ownerId)?.name || 'Sin dueño';
    doc.text(`Equipo: ${team} | Dueño: ${owner} | Estado: ${init.status}`, 14, currentY);
    currentY += 7;

    // Progress Bar (Simulated in PDF)
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, currentY, 100, 3);
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(14, currentY, init.progress, 3, 'F');
    doc.text(`${init.progress}%`, 116, currentY + 3);
    currentY += 10;

    // Filter relevant activities for this initiative
    const initActivities = activities.filter(a => a.initiativeId === init.id);
    
    const relevantActivitiesData: any[] = [];

    for (const activity of initActivities) {
      const logs = await dbService.getLogs(activity.id);
      
      const isDone = activity.status === Status.Done;
      const isInProgress = activity.status === Status.InProgress;
      const isBlocked = activity.status === Status.Blocked;
      
      let logsToShow: ActivityLog[] = [];
      let statusText = '';
      let statusColor: [number, number, number] = [0, 0, 0];

      if (isDone) {
        logsToShow = logs.filter(log => new Date(log.createdAt) >= last24h);
        statusText = 'Terminado';
        statusColor = [0, 128, 0]; // Verde
      } else if (isInProgress) {
        logsToShow = logs.filter(log => new Date(log.createdAt) >= last48h);
        if (logsToShow.length === 0 && logs.length > 0) {
          // Si no hay en las últimas 48h, mostrar el último
          const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          logsToShow = [sortedLogs[0]];
        } else if (logsToShow.length === 0 && logs.length === 0) {
          // Si no hay comentarios del todo, aún mostramos la tarea en progreso según requerimiento
          logsToShow = [{ id: '', activityId: activity.id, createdAt: '', authorId: '', message: 'Sin comentarios' }];
        }
        statusText = 'En progreso';
        statusColor = [218, 165, 32]; // Amarillo (Goldenrod)
      } else if (isBlocked) {
        if (logs.length > 0) {
          const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          logsToShow = [sortedLogs[0]];
        } else {
          logsToShow = [{ id: '', activityId: activity.id, createdAt: '', authorId: '', message: 'Sin comentarios' }];
        }
        statusText = 'Bloqueado';
        statusColor = [220, 38, 38]; // Rojo
      }

      if (logsToShow.length > 0) {
        logsToShow.forEach(log => {
          relevantActivitiesData.push({
            title: activity.title,
            status: statusText,
            comment: log.message,
            dateStatus: log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A',
            dateEnd: activity.endDate ? new Date(activity.endDate).toLocaleDateString() : 'N/A',
            color: statusColor
          });
        });
      }
    }

    if (relevantActivitiesData.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Actividad', 'Estado', 'Comentario', 'Fecha Estado', 'Fecha Fin']],
        body: relevantActivitiesData.map(d => [d.title, d.status, d.comment, d.dateStatus, d.dateEnd]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        columnStyles: {
          1: { fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const rowIndex = data.row.index;
            data.cell.styles.textColor = relevantActivitiesData[rowIndex].color;
          }
        },
        didDrawPage: (data) => {
            currentY = data.cursor ? data.cursor.y : currentY;
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text('No hay actualizaciones recientes o tareas relevantes para mostrar.', 14, currentY);
      currentY += 15;
    }
  }

  doc.save(`Resumen_Ejecutivo_${now.toISOString().split('T')[0]}.pdf`);
};

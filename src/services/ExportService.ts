import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { sortSizes } from '../utils/productUtils';
import type { Inscription, InscriptionFlat } from '../types/inscription';

export const ExportService = {
  // Helper to flatten inscription data
  getFlattenedData(inscriptions: (Inscription | InscriptionFlat)[], fields: 'basic' | 'full') {
    const rows: any[] = [];
    const shouldSort = fields === 'basic'; // 'basic' implies compact/list view, which usually needs sorting and exploding by activity

    inscriptions.forEach(ins => {
      // Handle both legacy flat structure and new nested students array
      const record = ins as (Inscription & Record<string, any>);
      const students = record.students && Array.isArray(record.students) ?
        record.students :
        [{
          name: record.student_name,
          surname: record.student_surname,
          course: record.student_course,
          activities: record.selected_activities || [],
          suspended: record.suspended
        }];

      students.forEach((student: any) => {
        // If student is suspended, we might want to filter or mark them.
        // For now we include them but can access student.suspended status.

        const activities = Array.isArray(student.activities) ? student.activities : [];

        if (shouldSort && activities.length > 0) {
          // Create a row per activity for "Listado por Actividad" mode
          activities.forEach((activity: string) => {
            rows.push({
              ...student,
              single_activity: activity,
              parent: ins
            });
          });
        } else {
          // One row per student
          rows.push({
            ...student,
            single_activity: activities.join(', '),
            parent: ins
          });
        }
      });
    });

    if (shouldSort) {
      rows.sort((a, b) => {
        // 1. Activity
        const actA = String(a.single_activity || '');
        const actB = String(b.single_activity || '');
        if (actA !== actB) return actA.localeCompare(actB);

        // 2. Course (custom sort logic could be added here)
        const courseA = String(a.course || '');
        const courseB = String(b.course || '');
        if (courseA !== courseB) return courseA.localeCompare(courseB);

        // 3. Name
        const nameA = `${a.name} ${a.surname}`;
        const nameB = `${b.name} ${b.surname}`;
        return nameA.localeCompare(nameB);
      });
    }

    return rows;
  },

  exportInscriptionsExcel(
    inscriptions: (Inscription | InscriptionFlat)[],
    fields: 'basic' | 'full' = 'full',
    filename: string = 'inscripcions'
  ) {
    const rows = this.getFlattenedData(inscriptions, fields);

    let exportData: any[] = [];

    if (fields === 'basic') {
      exportData = rows.map(r => ({
        'Actividad': r.single_activity,
        'Curso': r.course,
        'Nombre': r.name,
        'Apellidos': r.surname,
        'Socio AFA': r.parent.afa_member ? 'Sí' : 'No',
        'Teléfono': r.parent.parent_phone_1 || ''
      }));
    } else {
      exportData = rows.map(r => ({
        'ID': r.parent.id,
        'Fecha': r.parent.created_at ? new Date(r.parent.created_at).toLocaleDateString('es-ES') : '',
        'Actividad': r.single_activity,
        'Curso': r.course,
        'Nombre Alumno': r.name,
        'Apellidos Alumno': r.surname,
        'Padre/Madre/Tutor': r.parent.parent_name || '',
        'DNI': r.parent.parent_dni || '',
        'Teléfono 1': r.parent.parent_phone_1 || '',
        'Teléfono 2': r.parent.parent_phone_2 || '',
        'Email 1': r.parent.parent_email_1 || '',
        'Email 2': r.parent.parent_email_2 || '',
        'Socio AFA': r.parent.afa_member ? 'Sí' : 'No',
        'Salud/Alergias': r.parent.health_info || '',
        'Autorización Imagen': r.parent.image_auth_consent ? 'Sí' : 'No',
        'Sale Solo': r.parent.can_leave_alone ? 'Sí' : 'No',
        'Autorizados Recogida': r.parent.authorized_pickup || ''
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inscripcions');
    XLSX.writeFile(workbook, `${filename}_${fields}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  },

  exportInscriptionsPDF(inscriptions: (Inscription | InscriptionFlat)[], fields: 'basic' | 'full' = 'full', filename: string = 'inscripcions') {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    const rows = this.getFlattenedData(inscriptions, fields); // Explode by activity if list mode

    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185); // Blue
    doc.text(fields === 'full' ? 'Informe Completo de Inscripciones' : 'Listado de Grupos - Extraescolares', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`AFA Escola Falguera - Generado el ${new Date().toLocaleString('es-ES')}`, 14, 27);
    doc.text(`Registros: ${rows.length}`, pageWidth - 14, 27, { align: 'right' });

    let yPos = 35;

    if (fields === 'full') {
      doc.text("Resum d'Inscripcions", 14, 15); // This line was added
      const tableData = rows.map(r => [ // This tableData definition was changed
        r.single_activity || '',
        r.course || '',
        `${r.name || ''} ${r.surname || ''}`,
        r.parent.parent_name || '',
        r.parent.parent_dni || '',
        r.parent.parent_phone_1 || '',
        r.parent.parent_email_1 || '',
        r.parent.afa_member ? 'Sí' : 'No',
        r.parent.health_info || ''
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Actividad', 'Curso', 'Alumno', 'Padre/Madre', 'DNI', 'Teléfono', 'Email', 'Socio', 'Salud']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [44, 62, 80] },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 30 },
          2: { cellWidth: 15 },
          3: { cellWidth: 35 },
          9: { cellWidth: 'auto' }
        }
      });
    } else {
      // List Mode - Group by Activity
      let currentActivity = '';
      let groupData: any[] = [];

      rows.forEach((r, index) => {
        const activity = r.single_activity || 'Sin Actividad';

        if (activity !== currentActivity) {
          // Render previous group
          if (groupData.length > 0) {
            autoTable(doc, {
              startY: yPos,
              head: [['#', 'Nombre', 'Apellidos', 'Curso', 'Teléfono', 'Observaciones']],
              body: groupData,
              margin: { left: 14, right: 14 },
              theme: 'striped',
              headStyles: { fillColor: [41, 128, 185] }
            });
            // @ts-ignore
            yPos = doc.lastAutoTable.finalY + 15;
          }

          // Check page break
          if (yPos > 160 && index < rows.length - 1) {
            doc.addPage();
            yPos = 20;
          }

          // Activity Header
          doc.setFontSize(16);
          doc.setTextColor(44, 62, 80);
          doc.setFont('helvetica', 'bold');
          doc.text(`Actividad: ${activity.toUpperCase()}`, 14, yPos);

          const count = rows.filter((row: any) => row.single_activity === activity).length;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(127, 140, 141);
          doc.text(`(${count} alumnos inscritos)`, pageWidth - 14, yPos, { align: 'right' });

          yPos += 7;
          currentActivity = activity;
          groupData = [];
        }

        groupData.push([
          groupData.length + 1,
          r.name,
          r.surname,
          r.course,
          r.parent.parent_phone_1 || '',
          '' // Empty for notes
        ]);

        // Render last group
        if (index === rows.length - 1) {
          autoTable(doc, {
            startY: yPos,
            head: [['#', 'Nombre', 'Apellidos', 'Curso', 'Teléfono', 'Observaciones']],
            body: groupData,
            margin: { left: 14, right: 14 },
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
          });
        }
      });
    }

    doc.save(`${filename}_${fields}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  },
  
  exportInventoryPDF(products: any[], filename: string = 'inventari') {
    const doc = new jsPDF('p', 'mm', 'a4');

    // Header
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185);
    doc.text('Informe d\'Inventari i Estoc', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`AFA Escola Falguera - Generat el ${new Date().toLocaleString('es-ES')}`, 14, 27);
    
    let yPos = 35;

    products.forEach((product) => {
      // Check for page break
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.setFont('helvetica', 'bold');
      doc.text(product.name, 14, yPos);
      yPos += 6;

      // Sort variants by size using the utility
      const variants = sortSizes(product.variants || []);
      
      const tableData = variants.map((v: any) => [
        v.size,
        `${v.price_member}€`,
        `${v.price_non_member}€`,
        v.stock,
        v.stock <= 0 ? 'Esgotat' : (v.stock <= 5 ? 'Baix estoc' : 'En estoc')
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Talla', 'Preu Soci', 'Preu No Soci', 'Estoc', 'Estat']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
             const stockValue = (variants as any[])[data.row.index].stock;
             if (stockValue <= 0) {
                data.cell.styles.textColor = [231, 76, 60]; // Red
                data.cell.styles.fontStyle = 'bold';
             } else if (stockValue <= 5) {
                data.cell.styles.textColor = [230, 126, 34]; // Orange
                data.cell.styles.fontStyle = 'bold';
             }
          }
        }
      });

      // @ts-ignore
      yPos = doc.lastAutoTable.finalY + 10;
    });

    // Add a Summary Page/Section for Low/Out of stock items
    const lowStockItems: any[] = [];
    
    // We sort products and variants first to ensure the summary is ordered
    const sortedProductsForSummary = [...products].sort((a, b) => a.name.localeCompare(b.name));

    sortedProductsForSummary.forEach(p => {
      // Sort variants within the product
      const sortedVariants = sortSizes(p.variants || []);
      
      sortedVariants.forEach((v: any) => {
        if (v.stock <= 5) {
          lowStockItems.push({
            name: p.name,
            size: v.size,
            stock: v.stock,
            status: v.stock <= 0 ? 'Esgotat' : 'Baix estoc'
          });
        }
      });
    });

    if (lowStockItems.length > 0) {
      doc.addPage();
      doc.setFontSize(20);
      doc.setTextColor(192, 57, 43); // More aggressive Red for critical report
      doc.setFont('helvetica', 'bold');
      doc.text('RESUM CRÍTIC DE REPOSICIÓ', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(127, 140, 141);
      doc.setFont('helvetica', 'normal');
      doc.text('Llistat prioritatit per producte i talla.', 14, 27);

      const summaryData = lowStockItems.map(item => [
        item.name,
        item.size,
        item.stock,
        item.status
      ]);

      autoTable(doc, {
        startY: 35,
        head: [['Producte', 'Talla', 'Estoc', 'Estat']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [192, 57, 43], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 80 }
        },
        didParseCell: (data) => {
          // Add border top when product changes for better differentiation
          if (data.section === 'body' && data.row.index > 0) {
            const currentProduct = summaryData[data.row.index][0];
            const prevProduct = summaryData[data.row.index - 1][0];
            
            if (currentProduct !== prevProduct) {
              // @ts-ignore
              data.cell.styles.lineWidth = { top: 0.5 };
              // @ts-ignore
              data.cell.styles.lineColor = [44, 62, 80];
            } else if (data.column.index === 0) {
              // Mute repeating product names but keep them for clarity on page breaks
              data.cell.styles.textColor = [150, 150, 150];
              data.cell.styles.fontStyle = 'normal';
            }
          }

          // Coloring the status
          if (data.section === 'body' && data.column.index === 3) {
            const status = summaryData[data.row.index][3];
            if (status === 'Esgotat') {
              data.cell.styles.textColor = [231, 76, 60];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [230, 126, 34];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });
    }

    doc.save(`${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  },
  
  exportPaymentsCSV(payments: any[], filename: string = 'pagos') {
      const rows = [
          ['Estudiante', 'Curso', 'Actividades', 'Importe', 'Vencimiento', 'Estado', 'Fecha de pago', 'Referencia bancaria', 'Notas'],
          ...payments.map(payment => [
              `${payment.student_name || ''} ${payment.student_surname || ''}`.trim(),
              payment.course || '',
              Array.isArray(payment.activities) ? payment.activities.join('; ') : (payment.activities || ''),
              payment.amount || 0,
              payment.due_date ? new Date(payment.due_date).toLocaleDateString('es-ES') : '',
              payment.status === 'paid' ? 'Pagado' : (payment.status === 'overdue' ? 'Vencido' : 'Pendiente'),
              payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('es-ES') : '',
              payment.bank_reference || '',
              payment.notes || ''
          ])
      ];

      const csvContent = "\uFEFF" + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }
};

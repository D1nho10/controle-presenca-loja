import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import { getAllAttendances, getInvalidAttempts } from './attendance'
import { getAllProfiles } from './auth'

// Exportar relatório em PDF
export async function exportToPDF() {
  try {
    const attendances = await getAllAttendances()
    const profiles = await getAllProfiles()
    
    const doc = new jsPDF()
    
    // Cabeçalho
    doc.setFontSize(16)
    doc.text('A.R.L.S. Acílio Cândido Ventura nº 3569', 20, 20)
    doc.setFontSize(14)
    doc.text('Relatório de Presenças', 20, 30)
    doc.setFontSize(10)
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 40)
    
    let yPosition = 60
    
    // Estatísticas gerais
    doc.setFontSize(12)
    doc.text('Estatísticas Gerais:', 20, yPosition)
    yPosition += 10
    
    doc.setFontSize(10)
    doc.text(`Total de Irmãos: ${profiles.length}`, 20, yPosition)
    yPosition += 8
    doc.text(`Total de Presenças Registradas: ${attendances.length}`, 20, yPosition)
    yPosition += 15
    
    // Lista de presenças
    doc.setFontSize(12)
    doc.text('Histórico de Presenças:', 20, yPosition)
    yPosition += 10
    
    doc.setFontSize(8)
    attendances.slice(0, 30).forEach((attendance: any) => {
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }
      
      const date = new Date(attendance.marked_at).toLocaleDateString('pt-BR')
      const time = new Date(attendance.marked_at).toLocaleTimeString('pt-BR')
      const name = attendance.profiles?.full_name || 'N/A'
      const cargo = attendance.profiles?.cargo || 'N/A'
      
      doc.text(`${date} ${time} - ${name} (${cargo})`, 20, yPosition)
      yPosition += 6
    })
    
    if (attendances.length > 30) {
      doc.text(`... e mais ${attendances.length - 30} registros`, 20, yPosition + 10)
    }
    
    // Salvar PDF
    doc.save('relatorio-presencas-arls-3569.pdf')
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    throw new Error('Erro ao gerar relatório PDF')
  }
}

// Exportar relatório em Excel
export async function exportToExcel() {
  try {
    const attendances = await getAllAttendances()
    const invalidAttempts = await getInvalidAttempts()
    
    // Preparar dados das presenças
    const attendanceData = attendances.map((att: any) => ({
      'Data': new Date(att.marked_at).toLocaleDateString('pt-BR'),
      'Hora': new Date(att.marked_at).toLocaleTimeString('pt-BR'),
      'Nome': att.profiles?.full_name || 'N/A',
      'Cargo': att.profiles?.cargo || 'N/A',
      'Status': att.status === 'present' ? 'Presente' : 'Inválido',
      'Latitude': att.latitude,
      'Longitude': att.longitude,
      'Distância (m)': Math.round(att.distance_meters || 0),
      'Tipo de Sessão': att.sessions?.type || 'N/A'
    }))
    
    // Preparar dados das tentativas inválidas
    const invalidData = invalidAttempts.map((att: any) => ({
      'Data': new Date(att.attempted_at).toLocaleDateString('pt-BR'),
      'Hora': new Date(att.attempted_at).toLocaleTimeString('pt-BR'),
      'Nome': att.profiles?.full_name || 'N/A',
      'Motivo': att.reason,
      'Latitude': att.latitude,
      'Longitude': att.longitude,
      'Distância (m)': Math.round(att.distance_meters || 0)
    }))
    
    // Criar workbook
    const wb = XLSX.utils.book_new()
    
    // Adicionar planilha de presenças
    const wsAttendances = XLSX.utils.json_to_sheet(attendanceData)
    XLSX.utils.book_append_sheet(wb, wsAttendances, 'Presenças')
    
    // Adicionar planilha de tentativas inválidas
    const wsInvalid = XLSX.utils.json_to_sheet(invalidData)
    XLSX.utils.book_append_sheet(wb, wsInvalid, 'Tentativas Inválidas')
    
    // Salvar arquivo
    XLSX.writeFile(wb, 'relatorio-presencas-arls-3569.xlsx')
    
  } catch (error) {
    console.error('Erro ao gerar Excel:', error)
    throw new Error('Erro ao gerar relatório Excel')
  }
}

// Calcular estatísticas gerais da loja
export async function getLodgeStats() {
  try {
    const attendances = await getAllAttendances()
    const profiles = await getAllProfiles()
    
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    // Presenças do mês atual
    const monthlyAttendances = attendances.filter((att: any) => {
      const attDate = new Date(att.marked_at)
      return attDate.getMonth() === currentMonth && attDate.getFullYear() === currentYear
    })
    
    // Presenças do ano atual
    const yearlyAttendances = attendances.filter((att: any) => {
      const attDate = new Date(att.marked_at)
      return attDate.getFullYear() === currentYear
    })
    
    // Irmãos ativos
    const activeMembers = profiles.filter(p => p.status === 'active')
    
    // Calcular presença média
    const uniqueMonthlyAttendees = new Set(monthlyAttendances.map((att: any) => att.user_id))
    const uniqueYearlyAttendees = new Set(yearlyAttendances.map((att: any) => att.user_id))
    
    return {
      totalMembers: profiles.length,
      activeMembers: activeMembers.length,
      totalAttendances: attendances.length,
      monthlyStats: {
        attendances: monthlyAttendances.length,
        uniqueAttendees: uniqueMonthlyAttendees.size,
        averageAttendance: activeMembers.length > 0 
          ? Math.round((uniqueMonthlyAttendees.size / activeMembers.length) * 100) 
          : 0
      },
      yearlyStats: {
        attendances: yearlyAttendances.length,
        uniqueAttendees: uniqueYearlyAttendees.size,
        averageAttendance: activeMembers.length > 0 
          ? Math.round((uniqueYearlyAttendees.size / activeMembers.length) * 100) 
          : 0
      }
    }
  } catch (error) {
    console.error('Erro ao calcular estatísticas:', error)
    return null
  }
}
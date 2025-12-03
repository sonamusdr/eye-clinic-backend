const { Patient, Appointment, Inventory, Invoice, Payment, User, MedicalRecord, sequelize } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

// Import OpenAI if API key is available
let OpenAI;
let openaiClient = null;

try {
  if (process.env.OPENAI_API_KEY) {
    OpenAI = require('openai');
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ OpenAI AI initialized successfully');
    console.log(`   Model: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'}`);
  } else {
    console.log('ℹ️  OpenAI API key not found, using rule-based chatbot');
  }
} catch (error) {
  console.error('❌ OpenAI initialization error:', error.message);
  console.log('   Falling back to rule-based chatbot');
}

// Enhanced system data query functions
const getSystemData = {
  // Patient statistics
  async getPatientStats() {
    const total = await Patient.count();
    const active = await Patient.count({ where: { isActive: true } });
    const today = await Patient.count({
      where: {
        createdAt: {
          [Op.gte]: moment().startOf('day').toDate()
        }
      }
    });
    const thisMonth = await Patient.count({
      where: {
        createdAt: {
          [Op.gte]: moment().startOf('month').toDate()
        }
      }
    });
    const thisWeek = await Patient.count({
      where: {
        createdAt: {
          [Op.gte]: moment().startOf('week').toDate()
        }
      }
    });
    return { total, active, today, thisMonth, thisWeek };
  },

  // Appointment statistics
  async getAppointmentStats() {
    const total = await Appointment.count();
    const today = await Appointment.count({
      where: {
        appointmentDate: moment().format('YYYY-MM-DD')
      }
    });
    const scheduled = await Appointment.count({ where: { status: 'scheduled' } });
    const confirmed = await Appointment.count({ where: { status: 'confirmed' } });
    const completed = await Appointment.count({ where: { status: 'completed' } });
    const cancelled = await Appointment.count({ where: { status: 'cancelled' } });
    const inProgress = await Appointment.count({ where: { status: 'in_progress' } });
    const noShow = await Appointment.count({ where: { status: 'no_show' } });
    const thisWeek = await Appointment.count({
      where: {
        appointmentDate: {
          [Op.between]: [
            moment().startOf('week').format('YYYY-MM-DD'),
            moment().endOf('week').format('YYYY-MM-DD')
          ]
        }
      }
    });
    const thisMonth = await Appointment.count({
      where: {
        appointmentDate: {
          [Op.gte]: moment().startOf('month').format('YYYY-MM-DD')
        }
      }
    });
    return { total, today, scheduled, confirmed, completed, cancelled, inProgress, noShow, thisWeek, thisMonth };
  },

  // Inventory statistics
  async getInventoryStats() {
    const total = await Inventory.count();
    const allItems = await Inventory.findAll({
      attributes: ['itemName', 'quantity', 'reorderLevel', 'category', 'unitPrice']
    });
    
    const lowStockItems = allItems.filter(item => item.quantity <= item.reorderLevel);
    const lowStock = lowStockItems.length;
    const outOfStock = allItems.filter(item => item.quantity === 0).length;
    const totalValue = allItems.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0));
    }, 0);
    
    return { 
      total, 
      lowStock, 
      outOfStock, 
      totalValue,
      lowStockItems: lowStockItems.slice(0, 10).map(item => ({
        itemName: item.itemName,
        quantity: item.quantity,
        reorderLevel: item.reorderLevel,
        category: item.category
      }))
    };
  },

  // Financial statistics
  async getFinancialStats() {
    const totalInvoices = await Invoice.count();
    const paidInvoices = await Invoice.count({ where: { status: 'paid' } });
    const pendingInvoices = await Invoice.count({ where: { status: 'pending' } });
    
    const totalRevenue = await Payment.sum('amount', {
      where: { status: 'completed' }
    }) || 0;
    
    const pendingAmount = await Invoice.sum('total', {
      where: { status: 'pending' }
    }) || 0;

    const todayRevenue = await Payment.sum('amount', {
      where: {
        paymentDate: moment().format('YYYY-MM-DD'),
        status: 'completed'
      }
    }) || 0;

    const thisWeekRevenue = await Payment.sum('amount', {
      where: {
        paymentDate: {
          [Op.between]: [
            moment().startOf('week').format('YYYY-MM-DD'),
            moment().endOf('week').format('YYYY-MM-DD')
          ]
        },
        status: 'completed'
      }
    }) || 0;

    const thisMonthRevenue = await Payment.sum('amount', {
      where: {
        paymentDate: {
          [Op.gte]: moment().startOf('month').format('YYYY-MM-DD')
        },
        status: 'completed'
      }
    }) || 0;

    return {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      totalRevenue,
      pendingAmount,
      todayRevenue,
      thisWeekRevenue,
      thisMonthRevenue
    };
  },

  // Staff statistics
  async getStaffStats() {
    const total = await User.count();
    const active = await User.count({ where: { isActive: true } });
    const doctors = await User.count({ where: { role: 'doctor', isActive: true } });
    const receptionists = await User.count({ where: { role: 'receptionist', isActive: true } });
    const technicians = await User.count({ where: { role: 'technician', isActive: true } });
    const admins = await User.count({ where: { role: 'admin', isActive: true } });
    return { total, active, doctors, receptionists, technicians, admins };
  },

  // Get specific patient info
  async getPatientInfo(name) {
    const patients = await Patient.findAll({
      where: {
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${name}%` } },
          { lastName: { [Op.iLike]: `%${name}%` } },
          sequelize.where(
            sequelize.fn('CONCAT', sequelize.col('firstName'), ' ', sequelize.col('lastName')),
            { [Op.iLike]: `%${name}%` }
          )
        ]
      },
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    return patients;
  },

  // Get patient details with appointments and records
  async getPatientDetails(patientId) {
    const patient = await Patient.findByPk(patientId);
    if (!patient) return null;

    const [appointments, medicalRecords, invoices] = await Promise.all([
      Appointment.findAll({
        where: { patientId },
        include: [{ model: User, as: 'doctor', attributes: ['firstName', 'lastName'] }],
        order: [['appointmentDate', 'DESC']],
        limit: 10
      }),
      MedicalRecord.findAll({
        where: { patientId },
        include: [{ model: User, as: 'doctor', attributes: ['firstName', 'lastName'] }],
        order: [['visitDate', 'DESC']],
        limit: 5
      }),
      Invoice.findAll({
        where: { patientId },
        order: [['createdAt', 'DESC']],
        limit: 5
      })
    ]);

    return { patient, appointments, medicalRecords, invoices };
  },

  // Get appointments for today/tomorrow
  async getUpcomingAppointments(days = 1) {
    const appointments = await Appointment.findAll({
      where: {
        appointmentDate: {
          [Op.between]: [
            moment().format('YYYY-MM-DD'),
            moment().add(days, 'days').format('YYYY-MM-DD')
          ]
        },
        status: { [Op.notIn]: ['cancelled', 'completed'] }
      },
      include: [
        { model: Patient, attributes: ['firstName', 'lastName', 'phone', 'email'] },
        { model: User, as: 'doctor', attributes: ['firstName', 'lastName', 'specialization'] }
      ],
      order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']],
      limit: 20
    });
    return appointments;
  },

  // Get appointments by doctor
  async getAppointmentsByDoctor(doctorName) {
    const doctors = await User.findAll({
      where: {
        role: 'doctor',
        isActive: true,
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${doctorName}%` } },
          { lastName: { [Op.iLike]: `%${doctorName}%` } }
        ]
      },
      limit: 1
    });

    if (doctors.length === 0) return { doctor: null, appointments: [] };

    const appointments = await Appointment.findAll({
      where: {
        doctorId: doctors[0].id,
        appointmentDate: {
          [Op.gte]: moment().format('YYYY-MM-DD')
        }
      },
      include: [
        { model: Patient, attributes: ['firstName', 'lastName'] }
      ],
      order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']],
      limit: 10
    });

    return { doctor: doctors[0], appointments };
  },

  // Get medical records statistics
  async getMedicalRecordsStats() {
    const total = await MedicalRecord.count();
    const thisMonth = await MedicalRecord.count({
      where: {
        visitDate: {
          [Op.gte]: moment().startOf('month').toDate()
        }
      }
    });
    const thisWeek = await MedicalRecord.count({
      where: {
        visitDate: {
          [Op.gte]: moment().startOf('week').toDate()
        }
      }
    });
    return { total, thisMonth, thisWeek };
  },

  // Get all relevant system data for AI context
  async getAllSystemContext() {
    const [patientStats, appointmentStats, inventoryStats, financialStats, staffStats, medicalRecordsStats] = await Promise.all([
      this.getPatientStats(),
      this.getAppointmentStats(),
      this.getInventoryStats(),
      this.getFinancialStats(),
      this.getStaffStats(),
      this.getMedicalRecordsStats()
    ]);

    return {
      patients: patientStats,
      appointments: appointmentStats,
      inventory: inventoryStats,
      financial: financialStats,
      staff: staffStats,
      medicalRecords: medicalRecordsStats,
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
    };
  }
};

// AI-powered intent detection and response generation
const useAIForChat = async (message, conversationHistory = []) => {
  if (!openaiClient) {
    return null; // Fall back to rule-based if AI not available
  }

  try {
    // Get current system context
    const systemContext = await getSystemData.getAllSystemContext();
    
    // Build conversation history for context
    const messages = [
      {
        role: 'system',
        content: `Eres un asistente virtual inteligente para una clínica oftalmológica. Tu función es ayudar al personal con información sobre el sistema.

CONTEXTO DEL SISTEMA (datos actuales):
- Pacientes: Total ${systemContext.patients.total}, activos ${systemContext.patients.active}, hoy ${systemContext.patients.today}
- Citas: Total ${systemContext.appointments.total}, hoy ${systemContext.appointments.today}, programadas ${systemContext.appointments.scheduled}
- Inventario: Total ${systemContext.inventory.total} artículos, ${systemContext.inventory.lowStock} con stock bajo, valor total $${systemContext.inventory.totalValue.toFixed(2)}
- Financiero: Ingresos totales $${systemContext.financial.totalRevenue.toFixed(2)}, facturas pendientes ${systemContext.financial.pendingInvoices} por $${systemContext.financial.pendingAmount.toFixed(2)}
- Personal: ${systemContext.staff.active} miembros activos (${systemContext.staff.doctors} doctores, ${systemContext.staff.receptionists} recepcionistas, ${systemContext.staff.technicians} técnicos)
- Expedientes médicos: Total ${systemContext.medicalRecords.total}, este mes ${systemContext.medicalRecords.thisMonth}

CAPACIDADES:
1. Puedes responder preguntas sobre estadísticas del sistema usando los datos del contexto
2. Para búsquedas específicas (ej: "buscar paciente Juan"), debes indicar que necesitas consultar la base de datos
3. Responde de forma natural, amigable y profesional en español
4. Si no tienes la información exacta, sé honesto y sugiere cómo obtenerla
5. Usa emojis apropiados para hacer las respuestas más amigables
6. Formatea las respuestas con negritas (**texto**) para destacar información importante
7. Si la pregunta requiere datos específicos que no están en el contexto, indica que necesitas hacer una consulta más específica

IMPORTANTE: Si la pregunta requiere buscar información específica (nombres de pacientes, detalles de citas, etc.), responde indicando que necesitas hacer una consulta más detallada a la base de datos.`
      },
      ...conversationHistory.slice(-6), // Last 6 messages for context
      {
        role: 'user',
        content: message
      }
    ];

    const completion = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    return null; // Fall back to rule-based
  }
};

// Enhanced intent detection with more patterns
const detectIntent = (message) => {
  const lowerMessage = message.toLowerCase().trim();
  
  // Patient queries - enhanced
  if (lowerMessage.match(/\b(paciente|patient|cliente|client)\b/)) {
    // Check for specific patient name search
    const nameMatch = lowerMessage.match(/(?:paciente|patient|cliente|client|buscar|search|find)\s+([a-záéíóúñ\s]+)/i);
    if (nameMatch && nameMatch[1].trim().length > 2) {
      return { type: 'patient_search', name: nameMatch[1].trim() };
    }
    
    if (lowerMessage.match(/\b(cuánto|how many|total|cuántos|cuántas)\b/)) {
      return { type: 'patient_count' };
    }
    if (lowerMessage.match(/\b(hoy|today|hoy día)\b/)) {
      return { type: 'patient_today' };
    }
    if (lowerMessage.match(/\b(mes|month|este mes|this month)\b/)) {
      return { type: 'patient_month' };
    }
    if (lowerMessage.match(/\b(semana|week|esta semana|this week)\b/)) {
      return { type: 'patient_week' };
    }
    return { type: 'patient_info' };
  }

  // Appointment queries - enhanced
  if (lowerMessage.match(/\b(cita|appointment|consulta|visita)\b/)) {
    if (lowerMessage.match(/\b(cuánto|how many|total|cuántos|cuántas)\b/)) {
      return { type: 'appointment_count' };
    }
    if (lowerMessage.match(/\b(hoy|today|hoy día)\b/)) {
      return { type: 'appointment_today' };
    }
    if (lowerMessage.match(/\b(próxima|upcoming|siguiente|next|mañana|tomorrow)\b/)) {
      const daysMatch = lowerMessage.match(/(\d+)\s*(día|day|días|days)/);
      const days = daysMatch ? parseInt(daysMatch[1]) : 7;
      return { type: 'appointment_upcoming', days };
    }
    if (lowerMessage.match(/\b(programada|scheduled|agendada)\b/)) {
      return { type: 'appointment_scheduled' };
    }
    if (lowerMessage.match(/\b(completada|completed|finalizada)\b/)) {
      return { type: 'appointment_completed' };
    }
    if (lowerMessage.match(/\b(cancelada|cancelled|cancelada)\b/)) {
      return { type: 'appointment_cancelled' };
    }
    if (lowerMessage.match(/\b(semana|week|esta semana|this week)\b/)) {
      return { type: 'appointment_week' };
    }
    if (lowerMessage.match(/\b(mes|month|este mes|this month)\b/)) {
      return { type: 'appointment_month' };
    }
    // Check for doctor name in appointment query
    const doctorMatch = lowerMessage.match(/(?:doctor|dr\.?|doctora)\s+([a-záéíóúñ\s]+)/i);
    if (doctorMatch && doctorMatch[1].trim().length > 2) {
      return { type: 'appointment_doctor', doctorName: doctorMatch[1].trim() };
    }
    return { type: 'appointment_info' };
  }

  // Inventory queries - enhanced
  if (lowerMessage.match(/\b(inventario|inventory|insumo|stock|artículo|item|producto)\b/)) {
    if (lowerMessage.match(/\b(bajo|low|falt|missing|poco|escaso)\b/)) {
      return { type: 'inventory_low' };
    }
    if (lowerMessage.match(/\b(agotado|out of stock|sin stock|sin existencias|cero)\b/)) {
      return { type: 'inventory_out' };
    }
    if (lowerMessage.match(/\b(cuánto|how many|total|valor|value)\b/)) {
      return { type: 'inventory_value' };
    }
    return { type: 'inventory_info' };
  }

  // Financial queries - enhanced
  if (lowerMessage.match(/\b(factura|invoice|ingreso|revenue|pago|payment|dinero|money|financiero|financial)\b/)) {
    if (lowerMessage.match(/\b(pendiente|pending|por pagar)\b/)) {
      return { type: 'financial_pending' };
    }
    if (lowerMessage.match(/\b(hoy|today|hoy día)\b/)) {
      return { type: 'financial_today' };
    }
    if (lowerMessage.match(/\b(semana|week|esta semana|this week)\b/)) {
      return { type: 'financial_week' };
    }
    if (lowerMessage.match(/\b(mes|month|este mes|this month)\b/)) {
      return { type: 'financial_month' };
    }
    if (lowerMessage.match(/\b(total|general|overall)\b/)) {
      return { type: 'financial_info' };
    }
    return { type: 'financial_info' };
  }

  // Staff queries - enhanced
  if (lowerMessage.match(/\b(personal|staff|doctor|empleado|employee|trabajador|worker)\b/)) {
    if (lowerMessage.match(/\b(cuánto|how many|total|cuántos|cuántas)\b/)) {
      return { type: 'staff_count' };
    }
    return { type: 'staff_info' };
  }

  // Medical records queries
  if (lowerMessage.match(/\b(expediente|medical record|historial|record|registro médico)\b/)) {
    if (lowerMessage.match(/\b(cuánto|how many|total|cuántos|cuántas)\b/)) {
      return { type: 'medical_records_count' };
    }
    if (lowerMessage.match(/\b(mes|month|este mes|this month)\b/)) {
      return { type: 'medical_records_month' };
    }
    return { type: 'medical_records_info' };
  }

  // Greeting and help
  if (lowerMessage.match(/\b(hola|hello|hi|buenos días|buenas tardes|buenas noches)\b/)) {
    return { type: 'greeting' };
  }
  if (lowerMessage.match(/\b(ayuda|help|qué puedo|what can|qué puedes|what do you)\b/)) {
    return { type: 'help' };
  }

  return { type: 'general' };
};

// Enhanced response generation (rule-based fallback)
const generateResponse = async (intent, data, originalMessage) => {
  switch (intent.type) {
    case 'greeting':
      return '¡Hola! 👋 Soy tu asistente virtual inteligente. Puedo ayudarte con información sobre pacientes, citas, inventario, facturación, personal y expedientes médicos. ¿En qué puedo ayudarte?';

    case 'help':
      return `Puedo ayudarte con:
📊 **Estadísticas**: Pregúntame sobre totales, promedios, tendencias
👥 **Pacientes**: "¿Cuántos pacientes hay?", "Buscar paciente Juan"
📅 **Citas**: "¿Cuántas citas hay hoy?", "Próximas citas"
📦 **Inventario**: "Artículos con stock bajo", "Valor del inventario"
💰 **Financiero**: "Ingresos de hoy", "Facturas pendientes"
👨‍⚕️ **Personal**: "¿Cuántos doctores hay?"
📋 **Expedientes**: "Expedientes médicos del mes"

¿Qué te gustaría saber?`;

    case 'patient_count':
      return `📊 **Estadísticas de Pacientes:**
• Total de pacientes: **${data.total}**
• Pacientes activos: **${data.active}**
• Registrados hoy: **${data.today}**
• Registrados esta semana: **${data.thisWeek}**
• Registrados este mes: **${data.thisMonth}**`;

    case 'patient_today':
      return `Hoy se registraron **${data.today}** ${data.today === 1 ? 'paciente nuevo' : 'pacientes nuevos'}.`;

    case 'patient_month':
      return `Este mes se han registrado **${data.thisMonth}** ${data.thisMonth === 1 ? 'paciente nuevo' : 'pacientes nuevos'}.`;

    case 'patient_week':
      return `Esta semana se han registrado **${data.thisWeek}** ${data.thisWeek === 1 ? 'paciente nuevo' : 'pacientes nuevos'}.`;

    case 'patient_search':
      if (data.length === 0) {
        return `No encontré pacientes con el nombre "${intent.name}". ¿Podrías verificar el nombre o intentar con otro?`;
      }
      if (data.length === 1) {
        const patient = data[0];
        const details = await getSystemData.getPatientDetails(patient.id);
        if (details) {
          return `**Paciente encontrado:** ${patient.firstName} ${patient.lastName}
📧 Email: ${patient.email || 'No registrado'}
📞 Teléfono: ${patient.phone || 'No registrado'}
📅 Fecha de nacimiento: ${patient.dateOfBirth ? moment(patient.dateOfBirth).format('DD/MM/YYYY') : 'No registrada'}
📋 Citas: ${details.appointments.length}
🏥 Expedientes: ${details.medicalRecords.length}
💰 Facturas: ${details.invoices.length}`;
        }
      }
      const patientsList = data.slice(0, 5).map(p => `• ${p.firstName} ${p.lastName} (${p.email || p.phone || 'Sin contacto'})`).join('\n');
      return `Encontré ${data.length} ${data.length === 1 ? 'paciente' : 'pacientes'} con ese nombre:\n${patientsList}${data.length > 5 ? `\n... y ${data.length - 5} más. Por favor, sé más específico con el nombre.` : ''}`;

    case 'appointment_count':
      return `📅 **Estadísticas de Citas:**
• Total de citas: **${data.total}**
• Programadas: **${data.scheduled}**
• Confirmadas: **${data.confirmed}**
• En progreso: **${data.inProgress}**
• Completadas: **${data.completed}**
• Canceladas: **${data.cancelled}**
• No se presentaron: **${data.noShow}**
• Esta semana: **${data.thisWeek}**
• Este mes: **${data.thisMonth}**`;

    case 'appointment_today':
      return `Hoy hay **${data.today}** ${data.today === 1 ? 'cita programada' : 'citas programadas'}.`;

    case 'appointment_scheduled':
      return `Hay **${data.scheduled}** citas programadas en el sistema.`;

    case 'appointment_completed':
      return `Hay **${data.completed}** citas completadas en el sistema.`;

    case 'appointment_cancelled':
      return `Hay **${data.cancelled}** citas canceladas en el sistema.`;

    case 'appointment_week':
      return `Esta semana hay **${data.thisWeek}** citas programadas.`;

    case 'appointment_month':
      return `Este mes hay **${data.thisMonth}** citas programadas.`;

    case 'appointment_upcoming':
      if (data.length === 0) {
        return `No hay citas próximas programadas para los próximos ${intent.days || 7} días.`;
      }
      const appointmentsList = data.slice(0, 8).map(apt => {
        const date = moment(apt.appointmentDate).format('DD/MM');
        const time = apt.startTime;
        return `• ${date} a las ${time} - ${apt.Patient.firstName} ${apt.Patient.lastName} con Dr. ${apt.doctor.firstName} ${apt.doctor.lastName}`;
      }).join('\n');
      return `📅 **Próximas citas (${intent.days || 7} días):**\n${appointmentsList}${data.length > 8 ? `\n... y ${data.length - 8} más` : ''}`;

    case 'appointment_doctor':
      if (!data.doctor || data.appointments.length === 0) {
        return `No encontré citas para el doctor "${intent.doctorName}". ¿Podrías verificar el nombre?`;
      }
      const doctorAppts = data.appointments.slice(0, 5).map(apt => {
        const date = moment(apt.appointmentDate).format('DD/MM');
        return `• ${date} a las ${apt.startTime} - ${apt.Patient.firstName} ${apt.Patient.lastName}`;
      }).join('\n');
      return `📅 **Citas del Dr. ${data.doctor.firstName} ${data.doctor.lastName}:**\n${doctorAppts}${data.appointments.length > 5 ? `\n... y ${data.appointments.length - 5} más` : ''}`;

    case 'inventory_low':
      if (data.lowStockItems.length === 0) {
        return '✅ No hay artículos con stock bajo en este momento. Todo está bien abastecido.';
      }
      const itemsList = data.lowStockItems.map(item => 
        `• ${item.itemName} (${item.category}): ${item.quantity} unidades (mínimo: ${item.reorderLevel})`
      ).join('\n');
      return `⚠️ **Artículos con stock bajo (${data.lowStock}):**\n${itemsList}`;

    case 'inventory_out':
      return `Hay **${data.outOfStock}** artículos sin stock en el inventario.`;

    case 'inventory_value':
      return `💰 **Valor del Inventario:**
• Total de artículos: **${data.total}**
• Valor total: **$${data.totalValue.toFixed(2)}**
• Con stock bajo: **${data.lowStock}**
• Sin stock: **${data.outOfStock}**`;

    case 'financial_pending':
      return `💰 **Facturas Pendientes:**
• Cantidad: **${data.pendingInvoices}**
• Monto total pendiente: **$${data.pendingAmount.toFixed(2)}**`;

    case 'financial_today':
      return `Los ingresos de hoy son **$${data.todayRevenue.toFixed(2)}**.`;

    case 'financial_week':
      return `Los ingresos de esta semana son **$${data.thisWeekRevenue.toFixed(2)}**.`;

    case 'financial_month':
      return `Los ingresos de este mes son **$${data.thisMonthRevenue.toFixed(2)}**.`;

    case 'financial_info':
      return `💰 **Resumen Financiero:**
• Total de facturas: **${data.totalInvoices}**
• Facturas pagadas: **${data.paidInvoices}**
• Facturas pendientes: **${data.pendingInvoices}**
• Ingresos totales: **$${data.totalRevenue.toFixed(2)}**
• Pendiente por cobrar: **$${data.pendingAmount.toFixed(2)}**`;

    case 'staff_info':
    case 'staff_count':
      return `👨‍⚕️ **Personal Activo:**
• Total: **${data.active}** miembros
• Doctores: **${data.doctors}**
• Recepcionistas: **${data.receptionists}**
• Técnicos: **${data.technicians}**
• Administradores: **${data.admins}**`;

    case 'medical_records_count':
      return `📋 **Expedientes Médicos:**
• Total: **${data.total}**
• Este mes: **${data.thisMonth}**
• Esta semana: **${data.thisWeek}**`;

    case 'medical_records_month':
      return `Este mes se han creado **${data.thisMonth}** expedientes médicos.`;

    case 'medical_records_info':
      return `📋 **Expedientes Médicos:**
• Total: **${data.total}**
• Este mes: **${data.thisMonth}**
• Esta semana: **${data.thisWeek}**`;

    default:
      return 'Puedo ayudarte con información sobre pacientes, citas, inventario, facturación, personal y expedientes médicos. ¿Qué te gustaría saber? Intenta preguntar de forma más específica, por ejemplo: "¿Cuántos pacientes hay?" o "Buscar paciente Juan".';
  }
};

// Main chatbot handler with AI integration
exports.chat = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const userId = req.user?.id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'El mensaje no puede estar vacío' });
    }

    // Try AI first if available
    let aiResponse = null;
    if (openaiClient) {
      try {
        aiResponse = await useAIForChat(message, conversationHistory);
      } catch (error) {
        console.error('AI error, falling back to rule-based:', error);
      }
    }

    // If AI provided a good response, use it
    if (aiResponse && aiResponse.length > 10) {
      return res.json({
        success: true,
        response: aiResponse,
        intent: 'ai_generated',
        aiEnabled: true
      });
    }

    // Otherwise, use rule-based system
    const intent = detectIntent(message);
    let data = {};
    let response = '';

    try {
      switch (intent.type) {
        case 'greeting':
        case 'help':
          response = await generateResponse(intent, {}, message);
          break;

        case 'patient_count':
        case 'patient_today':
        case 'patient_month':
        case 'patient_week':
          data = await getSystemData.getPatientStats();
          response = await generateResponse(intent, data, message);
          break;

        case 'patient_search':
          data = await getSystemData.getPatientInfo(intent.name);
          response = await generateResponse(intent, data, message);
          break;

        case 'appointment_count':
        case 'appointment_today':
        case 'appointment_scheduled':
        case 'appointment_completed':
        case 'appointment_cancelled':
        case 'appointment_week':
        case 'appointment_month':
          data = await getSystemData.getAppointmentStats();
          response = await generateResponse(intent, data, message);
          break;

        case 'appointment_upcoming':
          data = await getSystemData.getUpcomingAppointments(intent.days || 7);
          response = await generateResponse(intent, data, message);
          break;

        case 'appointment_doctor':
          data = await getSystemData.getAppointmentsByDoctor(intent.doctorName);
          response = await generateResponse(intent, data, message);
          break;

        case 'inventory_low':
        case 'inventory_out':
        case 'inventory_value':
          data = await getSystemData.getInventoryStats();
          response = await generateResponse(intent, data, message);
          break;

        case 'financial_pending':
        case 'financial_today':
        case 'financial_week':
        case 'financial_month':
        case 'financial_info':
          data = await getSystemData.getFinancialStats();
          response = await generateResponse(intent, data, message);
          break;

        case 'staff_info':
        case 'staff_count':
          data = await getSystemData.getStaffStats();
          response = await generateResponse(intent, data, message);
          break;

        case 'medical_records_count':
        case 'medical_records_month':
        case 'medical_records_info':
          data = await getSystemData.getMedicalRecordsStats();
          response = await generateResponse(intent, data, message);
          break;

        default:
          response = await generateResponse(intent, {}, message);
      }
    } catch (error) {
      console.error('Error getting system data:', error);
      response = 'Lo siento, hubo un error al obtener la información. Por favor intenta de nuevo o reformula tu pregunta.';
    }

    res.json({
      success: true,
      response,
      intent: intent.type,
      aiEnabled: !!openaiClient
    });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ message: 'Error procesando el mensaje', error: error.message });
  }
};

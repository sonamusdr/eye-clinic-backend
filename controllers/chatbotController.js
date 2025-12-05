const { Patient, Appointment, Inventory, Invoice, Payment, User, MedicalRecord, Procedure, TherapySchedule, StudyResult, MedicalCertificate, InsuranceAuthorization, sequelize } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

// Import OpenAI if API key is available
let OpenAI;
let openaiClient = null;

try {
  if (process.env.OPENAI_API_KEY) {
    const apiKey = process.env.OPENAI_API_KEY.trim();
    if (apiKey && apiKey.length > 10) {
      OpenAI = require('openai');
      openaiClient = new OpenAI({
        apiKey: apiKey
      });
      console.log('✅ OpenAI AI initialized successfully');
      console.log(`   Model: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'}`);
      console.log(`   API Key length: ${apiKey.length} characters`);
      console.log(`   API Key prefix: ${apiKey.substring(0, 7)}...`);
    } else {
      console.log('⚠️  OpenAI API key found but appears invalid (too short)');
      console.log('   Falling back to rule-based chatbot');
    }
  } else {
    console.log('ℹ️  OpenAI API key not found in environment variables');
    console.log('   Using rule-based chatbot');
    console.log('   To enable AI: Set OPENAI_API_KEY in Railway environment variables');
  }
} catch (error) {
  console.error('❌ OpenAI initialization error:', error.message);
  console.error('   Error stack:', error.stack);
  console.log('   Falling back to rule-based chatbot');
  openaiClient = null; // Ensure it's null on error
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

  // Procedure statistics
  async getProcedureStats() {
    const total = await Procedure.count();
    const scheduled = await Procedure.count({ where: { status: 'scheduled' } });
    const inProgress = await Procedure.count({ where: { status: 'in_progress' } });
    const completed = await Procedure.count({ where: { status: 'completed' } });
    const cancelled = await Procedure.count({ where: { status: 'cancelled' } });
    const today = await Procedure.count({
      where: {
        procedureDate: moment().format('YYYY-MM-DD')
      }
    });
    return { total, scheduled, inProgress, completed, cancelled, today };
  },

  // Therapy Schedule statistics
  async getTherapyStats() {
    const total = await TherapySchedule.count();
    const active = await TherapySchedule.count({ where: { status: 'active' } });
    const completed = await TherapySchedule.count({ where: { status: 'completed' } });
    const cancelled = await TherapySchedule.count({ where: { status: 'cancelled' } });
    return { total, active, completed, cancelled };
  },

  // Study Result statistics
  async getStudyResultStats() {
    const total = await StudyResult.count();
    const pending = await StudyResult.count({ where: { status: 'pending' } });
    const completed = await StudyResult.count({ where: { status: 'completed' } });
    const reviewed = await StudyResult.count({ where: { status: 'reviewed' } });
    const thisMonth = await StudyResult.count({
      where: {
        studyDate: {
          [Op.gte]: moment().startOf('month').format('YYYY-MM-DD')
        }
      }
    });
    return { total, pending, completed, reviewed, thisMonth };
  },

  // Medical Certificate statistics
  async getCertificateStats() {
    const total = await MedicalCertificate.count();
    const active = await MedicalCertificate.count({ where: { status: 'active' } });
    const expired = await MedicalCertificate.count({ where: { status: 'expired' } });
    const thisMonth = await MedicalCertificate.count({
      where: {
        issueDate: {
          [Op.gte]: moment().startOf('month').format('YYYY-MM-DD')
        }
      }
    });
    return { total, active, expired, thisMonth };
  },

  // Insurance Authorization statistics
  async getInsuranceStats() {
    const total = await InsuranceAuthorization.count();
    const pending = await InsuranceAuthorization.count({ where: { status: 'pending' } });
    const approved = await InsuranceAuthorization.count({ where: { status: 'approved' } });
    const rejected = await InsuranceAuthorization.count({ where: { status: 'rejected' } });
    const expired = await InsuranceAuthorization.count({ where: { status: 'expired' } });
    return { total, pending, approved, rejected, expired };
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
    const [patientStats, appointmentStats, inventoryStats, financialStats, staffStats, medicalRecordsStats, procedureStats, therapyStats, studyResultStats, certificateStats, insuranceStats] = await Promise.all([
      this.getPatientStats(),
      this.getAppointmentStats(),
      this.getInventoryStats(),
      this.getFinancialStats(),
      this.getStaffStats(),
      this.getMedicalRecordsStats(),
      this.getProcedureStats(),
      this.getTherapyStats(),
      this.getStudyResultStats(),
      this.getCertificateStats(),
      this.getInsuranceStats()
    ]);

    return {
      patients: patientStats,
      appointments: appointmentStats,
      inventory: inventoryStats,
      financial: financialStats,
      staff: staffStats,
      medicalRecords: medicalRecordsStats,
      procedures: procedureStats,
      therapySchedules: therapyStats,
      studyResults: studyResultStats,
      certificates: certificateStats,
      insuranceAuthorizations: insuranceStats,
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
    };
  }
};

// AI-powered conversational chatbot
const useAIForChat = async (message, conversationHistory = []) => {
  if (!openaiClient) {
    console.log('⚠️  useAIForChat called but openaiClient is null');
    return null; // Fall back to rule-based if AI not available
  }

  console.log('🚀 useAIForChat: Starting AI request');
  console.log(`   Message length: ${message.length}`);
  console.log(`   History length: ${conversationHistory.length}`);

  try {
    // Get current system context
    const systemContext = await getSystemData.getAllSystemContext();
    
    // Build comprehensive system prompt - More conversational and ChatGPT-like
    const systemPrompt = `Eres un asistente virtual inteligente y muy conversacional para la clínica oftalmológica "Bethesda Eye Clinic". Actúa como un asistente humano real, amigable y profesional.

PERSONALIDAD:
- Hablas de forma natural y conversacional, como si fueras un colega de trabajo
- Mantienes el contexto de la conversación y recuerdas lo que se ha hablado antes
- Haces preguntas de seguimiento cuando es apropiado
- Eres proactivo y ofreces información adicional relevante
- Usas un tono amigable pero profesional
- NO repites frases robóticas como "Puedo ayudarte con..." - en su lugar, responde directamente

CONTEXTO DEL SISTEMA (datos en tiempo real):
📊 Estadísticas:
- Pacientes: ${systemContext.patients.total} totales, ${systemContext.patients.active} activos, ${systemContext.patients.today} registrados hoy
- Citas: ${systemContext.appointments.total} totales, ${systemContext.appointments.today} hoy, ${systemContext.appointments.scheduled} programadas
- Inventario: ${systemContext.inventory.total} artículos, ${systemContext.inventory.lowStock} con stock bajo, valor $${systemContext.inventory.totalValue.toFixed(2)}
- Financiero: $${systemContext.financial.totalRevenue.toFixed(2)} ingresos totales, ${systemContext.financial.pendingInvoices} facturas pendientes por $${systemContext.financial.pendingAmount.toFixed(2)}
- Personal: ${systemContext.staff.active} activos (${systemContext.staff.doctors} doctores, ${systemContext.staff.receptionists} recepcionistas, ${systemContext.staff.technicians} técnicos)
- Expedientes: ${systemContext.medicalRecords.total} totales, ${systemContext.medicalRecords.thisMonth} este mes
- Procedimientos: ${systemContext.procedures.total} totales, ${systemContext.procedures.scheduled} programados, ${systemContext.procedures.completed} completados
- Terapias: ${systemContext.therapySchedules.total} totales, ${systemContext.therapySchedules.active} activas
- Estudios: ${systemContext.studyResults.total} totales, ${systemContext.studyResults.pending} pendientes
- Certificados: ${systemContext.certificates.total} totales, ${systemContext.certificates.active} activos
- Seguros: ${systemContext.insuranceAuthorizations.total} totales, ${systemContext.insuranceAuthorizations.pending} pendientes

INFORMACIÓN DE LA CLÍNICA:
- Nombre: Bethesda Eye Clinic
- Dirección: Tetelo Vargas 26, Torre Profesional Corazones Unidos, Santo Domingo, República Dominicana
- Teléfono: 809.368.3824 | WhatsApp: 829-707-6533
- Email: info@bethesdaeyeclinic.com
- Servicios: Oftalmología General, Consulta Neuro-Oftalmológica, Diagnóstico, Procedimientos Quirúrgicos, Óptica

REGLAS DE CONVERSACIÓN:
1. **Mantén el contexto**: Si el usuario hace referencia a algo mencionado antes, recuérdalo y responde en consecuencia
2. **Sé natural**: Responde como hablarías con un compañero de trabajo, no como un robot
3. **Haz seguimiento**: Si respondes una pregunta, puedes hacer una pregunta de seguimiento relevante
4. **Usa datos reales**: Cuando menciones estadísticas, usa los números exactos del contexto
5. **Formato ligero**: Usa emojis ocasionalmente (📊, 👥, 📅) y negritas para destacar números importantes
6. **No repitas**: No uses las mismas frases una y otra vez. Varía tus respuestas
7. **Sé específico**: Si el usuario pregunta algo general, da información específica y útil

EJEMPLOS DE CONVERSACIÓN:
Usuario: "Hola"
Tú: "¡Hola! 👋 ¿Qué necesitas hoy?"

Usuario: "¿Cuántos pacientes hay?"
Tú: "Tenemos **${systemContext.patients.total}** pacientes en total, **${systemContext.patients.active}** están activos. ¿Quieres saber cuántos se registraron hoy?"

Usuario: "Sí"
Tú: "Hoy se registraron **${systemContext.patients.today}** pacientes nuevos. ¿Te interesa saber algo más sobre los pacientes?"

Usuario: "¿Y las citas de hoy?"
Tú: "Hoy tenemos **${systemContext.appointments.today}** citas programadas. También hay **${systemContext.appointments.scheduled}** citas programadas en total. ¿Quieres que te dé más detalles?"

IMPORTANTE: Mantén conversaciones fluidas y naturales. Recuerda el contexto. Haz preguntas de seguimiento cuando sea apropiado.`;

    // Build conversation history - include more messages for better context
    // Ensure we have proper message format
    const formattedHistory = conversationHistory
      .filter(msg => msg && msg.role && msg.content) // Filter out invalid messages
      .slice(-15); // Last 15 messages for better context
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...formattedHistory,
      {
        role: 'user',
        content: message
      }
    ];

    console.log(`💬 Sending ${messages.length} messages to OpenAI (${formattedHistory.length} from history)`);
    console.log(`   Model: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'}`);
    console.log(`   API Key present: ${!!process.env.OPENAI_API_KEY}`);
    console.log(`   API Key length: ${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0}`);

    const completion = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.9, // Higher for more creative, natural responses
      max_tokens: 1000, // More tokens for longer, more complete responses
      top_p: 0.95,
      frequency_penalty: 0.5, // Higher penalty to avoid repetition
      presence_penalty: 0.5, // Higher to encourage variety
      stream: false
    });

    if (!completion || !completion.choices || !completion.choices[0]) {
      console.error('❌ Invalid response from OpenAI API');
      return null;
    }

    const aiResponse = completion.choices[0].message.content;
    
    if (!aiResponse || aiResponse.trim().length === 0) {
      console.error('❌ Empty response from OpenAI API');
      return null;
    }
    
    // Log for debugging
    console.log('✅ AI Response generated successfully');
    console.log(`   Response length: ${aiResponse.length} characters`);
    console.log(`   Response preview: "${aiResponse.substring(0, 150)}..."`);
    
    return aiResponse;
  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    console.error('   Error type:', error.constructor.name);
    console.error('   Error message:', error.message);
    if (error.response) {
      console.error('   API response status:', error.response.status);
      console.error('   API response data:', error.response.data);
    }
    return null; // Fall back to rule-based
  }
};

// Enhanced intent detection with more patterns
const detectIntent = (message) => {
  const lowerMessage = message.toLowerCase().trim();
  
  // Log for debugging
  console.log('🔍 Detecting intent for message:', message);
  
  // Patient queries - enhanced with more patterns
  if (lowerMessage.match(/\b(paciente|patient|cliente|client|pacientes|patients)\b/)) {
    // Check for specific patient name search
    const nameMatch = lowerMessage.match(/(?:paciente|patient|cliente|client|buscar|search|find|busca)\s+([a-záéíóúñ\s]+)/i);
    if (nameMatch && nameMatch[1].trim().length > 2) {
      console.log('✅ Intent detected: patient_search');
      return { type: 'patient_search', name: nameMatch[1].trim() };
    }
    
    if (lowerMessage.match(/\b(cuánto|how many|total|cuántos|cuántas|hay|tengo|tenemos)\b/)) {
      console.log('✅ Intent detected: patient_count');
      return { type: 'patient_count' };
    }
    if (lowerMessage.match(/\b(hoy|today|hoy día|este día)\b/)) {
      console.log('✅ Intent detected: patient_today');
      return { type: 'patient_today' };
    }
    if (lowerMessage.match(/\b(mes|month|este mes|this month|del mes)\b/)) {
      console.log('✅ Intent detected: patient_month');
      return { type: 'patient_month' };
    }
    if (lowerMessage.match(/\b(semana|week|esta semana|this week|de la semana)\b/)) {
      console.log('✅ Intent detected: patient_week');
      return { type: 'patient_week' };
    }
    console.log('✅ Intent detected: patient_info');
    return { type: 'patient_info' };
  }

  // Appointment queries - enhanced with more patterns
  if (lowerMessage.match(/\b(cita|appointment|consulta|visita|citas|appointments|consultas)\b/)) {
    if (lowerMessage.match(/\b(cuánto|how many|total|cuántos|cuántas|hay|tengo|tenemos)\b/)) {
      console.log('✅ Intent detected: appointment_count');
      return { type: 'appointment_count' };
    }
    if (lowerMessage.match(/\b(hoy|today|hoy día|este día|de hoy)\b/)) {
      console.log('✅ Intent detected: appointment_today');
      return { type: 'appointment_today' };
    }
    if (lowerMessage.match(/\b(próxima|upcoming|siguiente|next|mañana|tomorrow|próximas|siguientes)\b/)) {
      const daysMatch = lowerMessage.match(/(\d+)\s*(día|day|días|days)/);
      const days = daysMatch ? parseInt(daysMatch[1]) : 7;
      console.log('✅ Intent detected: appointment_upcoming');
      return { type: 'appointment_upcoming', days };
    }
    if (lowerMessage.match(/\b(programada|scheduled|agendada|programadas)\b/)) {
      console.log('✅ Intent detected: appointment_scheduled');
      return { type: 'appointment_scheduled' };
    }
    if (lowerMessage.match(/\b(completada|completed|finalizada|completadas)\b/)) {
      console.log('✅ Intent detected: appointment_completed');
      return { type: 'appointment_completed' };
    }
    if (lowerMessage.match(/\b(cancelada|cancelled|canceladas)\b/)) {
      console.log('✅ Intent detected: appointment_cancelled');
      return { type: 'appointment_cancelled' };
    }
    if (lowerMessage.match(/\b(semana|week|esta semana|this week|de la semana)\b/)) {
      console.log('✅ Intent detected: appointment_week');
      return { type: 'appointment_week' };
    }
    if (lowerMessage.match(/\b(mes|month|este mes|this month|del mes)\b/)) {
      console.log('✅ Intent detected: appointment_month');
      return { type: 'appointment_month' };
    }
    // Check for doctor name in appointment query
    const doctorMatch = lowerMessage.match(/(?:doctor|dr\.?|doctora|del doctor|del dr)\s+([a-záéíóúñ\s]+)/i);
    if (doctorMatch && doctorMatch[1].trim().length > 2) {
      console.log('✅ Intent detected: appointment_doctor');
      return { type: 'appointment_doctor', doctorName: doctorMatch[1].trim() };
    }
    console.log('✅ Intent detected: appointment_info');
    return { type: 'appointment_info' };
  }

  // Inventory queries - enhanced with more patterns
  if (lowerMessage.match(/\b(inventario|inventory|insumo|stock|artículo|item|producto|artículos|productos|insumos)\b/)) {
    if (lowerMessage.match(/\b(bajo|low|falt|missing|poco|escaso|bajos|faltan|faltantes)\b/)) {
      console.log('✅ Intent detected: inventory_low');
      return { type: 'inventory_low' };
    }
    if (lowerMessage.match(/\b(agotado|out of stock|sin stock|sin existencias|cero|agotados)\b/)) {
      console.log('✅ Intent detected: inventory_out');
      return { type: 'inventory_out' };
    }
    if (lowerMessage.match(/\b(cuánto|how many|total|valor|value|hay|tengo|tenemos)\b/)) {
      console.log('✅ Intent detected: inventory_value');
      return { type: 'inventory_value' };
    }
    console.log('✅ Intent detected: inventory_info');
    return { type: 'inventory_info' };
  }

  // Financial queries - enhanced with more patterns
  if (lowerMessage.match(/\b(factura|invoice|ingreso|revenue|pago|payment|dinero|money|financiero|financial|facturas|ingresos|pagos)\b/)) {
    if (lowerMessage.match(/\b(pendiente|pending|por pagar|pendientes)\b/)) {
      console.log('✅ Intent detected: financial_pending');
      return { type: 'financial_pending' };
    }
    if (lowerMessage.match(/\b(hoy|today|hoy día|de hoy|este día)\b/)) {
      console.log('✅ Intent detected: financial_today');
      return { type: 'financial_today' };
    }
    if (lowerMessage.match(/\b(semana|week|esta semana|this week|de la semana)\b/)) {
      console.log('✅ Intent detected: financial_week');
      return { type: 'financial_week' };
    }
    if (lowerMessage.match(/\b(mes|month|este mes|this month|del mes)\b/)) {
      console.log('✅ Intent detected: financial_month');
      return { type: 'financial_month' };
    }
    if (lowerMessage.match(/\b(total|general|overall|totales)\b/)) {
      console.log('✅ Intent detected: financial_info');
      return { type: 'financial_info' };
    }
    console.log('✅ Intent detected: financial_info');
    return { type: 'financial_info' };
  }

  // Staff queries - enhanced with more patterns
  if (lowerMessage.match(/\b(personal|staff|doctor|empleado|employee|trabajador|worker|doctores|empleados)\b/)) {
    if (lowerMessage.match(/\b(cuánto|how many|total|cuántos|cuántas|hay|tengo|tenemos)\b/)) {
      console.log('✅ Intent detected: staff_count');
      return { type: 'staff_count' };
    }
    console.log('✅ Intent detected: staff_info');
    return { type: 'staff_info' };
  }

  // Medical records queries - enhanced
  if (lowerMessage.match(/\b(expediente|medical record|historial|record|registro médico|expedientes|historiales)\b/)) {
    if (lowerMessage.match(/\b(cuánto|how many|total|cuántos|cuántas|hay|tengo|tenemos)\b/)) {
      console.log('✅ Intent detected: medical_records_count');
      return { type: 'medical_records_count' };
    }
    if (lowerMessage.match(/\b(mes|month|este mes|this month|del mes)\b/)) {
      console.log('✅ Intent detected: medical_records_month');
      return { type: 'medical_records_month' };
    }
    console.log('✅ Intent detected: medical_records_info');
    return { type: 'medical_records_info' };
  }

  // Procedure queries
  if (lowerMessage.match(/\b(procedimiento|procedure|cirugía|surgery|procedimientos|cirugías)\b/)) {
    if (lowerMessage.match(/\b(cuánto|how many|total|cuántos|cuántas|hay)\b/)) {
      console.log('✅ Intent detected: procedure_count');
      return { type: 'procedure_count' };
    }
    if (lowerMessage.match(/\b(programado|scheduled|agendado|programados)\b/)) {
      console.log('✅ Intent detected: procedure_scheduled');
      return { type: 'procedure_scheduled' };
    }
    if (lowerMessage.match(/\b(completado|completed|completados)\b/)) {
      console.log('✅ Intent detected: procedure_completed');
      return { type: 'procedure_completed' };
    }
    if (lowerMessage.match(/\b(hoy|today|de hoy)\b/)) {
      console.log('✅ Intent detected: procedure_today');
      return { type: 'procedure_today' };
    }
    console.log('✅ Intent detected: procedure_info');
    return { type: 'procedure_info' };
  }

  // Therapy schedule queries
  if (lowerMessage.match(/\b(terapia|therapy|horario de terapia|therapy schedule|terapias)\b/)) {
    if (lowerMessage.match(/\b(cuánto|how many|total|cuántos|cuántas|hay)\b/)) {
      console.log('✅ Intent detected: therapy_count');
      return { type: 'therapy_count' };
    }
    if (lowerMessage.match(/\b(activo|active|activos)\b/)) {
      console.log('✅ Intent detected: therapy_active');
      return { type: 'therapy_active' };
    }
    console.log('✅ Intent detected: therapy_info');
    return { type: 'therapy_info' };
  }

  // Study result queries
  if (lowerMessage.match(/\b(estudio|study|resultado de estudio|study result|estudios|resultados)\b/)) {
    if (lowerMessage.match(/\b(cuánto|how many|total|cuántos|cuántas|hay)\b/)) {
      console.log('✅ Intent detected: study_result_count');
      return { type: 'study_result_count' };
    }
    if (lowerMessage.match(/\b(pendiente|pending|pendientes)\b/)) {
      console.log('✅ Intent detected: study_result_pending');
      return { type: 'study_result_pending' };
    }
    if (lowerMessage.match(/\b(mes|month|este mes)\b/)) {
      console.log('✅ Intent detected: study_result_month');
      return { type: 'study_result_month' };
    }
    console.log('✅ Intent detected: study_result_info');
    return { type: 'study_result_info' };
  }

  // Medical certificate queries
  if (lowerMessage.match(/\b(certificado|certificate|certificación|certificados|certificaciones)\b/)) {
    if (lowerMessage.match(/\b(cuánto|how many|total|cuántos|cuántas|hay)\b/)) {
      console.log('✅ Intent detected: certificate_count');
      return { type: 'certificate_count' };
    }
    if (lowerMessage.match(/\b(activo|active|activos)\b/)) {
      console.log('✅ Intent detected: certificate_active');
      return { type: 'certificate_active' };
    }
    if (lowerMessage.match(/\b(vencido|expired|vencidos)\b/)) {
      console.log('✅ Intent detected: certificate_expired');
      return { type: 'certificate_expired' };
    }
    if (lowerMessage.match(/\b(mes|month|este mes)\b/)) {
      console.log('✅ Intent detected: certificate_month');
      return { type: 'certificate_month' };
    }
    console.log('✅ Intent detected: certificate_info');
    return { type: 'certificate_info' };
  }

  // Insurance authorization queries
  if (lowerMessage.match(/\b(seguro|insurance|autorización|authorization|autorizaciones|seguros)\b/)) {
    if (lowerMessage.match(/\b(cuánto|how many|total|cuántos|cuántas|hay)\b/)) {
      console.log('✅ Intent detected: insurance_count');
      return { type: 'insurance_count' };
    }
    if (lowerMessage.match(/\b(pendiente|pending|pendientes)\b/)) {
      console.log('✅ Intent detected: insurance_pending');
      return { type: 'insurance_pending' };
    }
    if (lowerMessage.match(/\b(aprobado|approved|aprobados)\b/)) {
      console.log('✅ Intent detected: insurance_approved');
      return { type: 'insurance_approved' };
    }
    if (lowerMessage.match(/\b(rechazado|rejected|rechazados)\b/)) {
      console.log('✅ Intent detected: insurance_rejected');
      return { type: 'insurance_rejected' };
    }
    console.log('✅ Intent detected: insurance_info');
    return { type: 'insurance_info' };
  }

  // Greeting and help - enhanced
  if (lowerMessage.match(/\b(hola|hello|hi|buenos días|buenas tardes|buenas noches|saludos)\b/)) {
    console.log('✅ Intent detected: greeting');
    return { type: 'greeting' };
  }
  if (lowerMessage.match(/\b(ayuda|help|qué puedo|what can|qué puedes|what do you|qué puedes hacer|qué sabes)\b/)) {
    console.log('✅ Intent detected: help');
    return { type: 'help' };
  }

  // Try to detect common question patterns even without keywords
  if (lowerMessage.match(/\b(cuánto|cuántos|cuántas|how many|total|hay|tengo|tenemos)\b/)) {
    // If it's a "how many" question but we couldn't categorize it, try to get general stats
    console.log('✅ Intent detected: general_count (trying to provide useful info)');
    return { type: 'general_count' };
  }

  console.log('⚠️  Intent detected: general (no specific intent found)');
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

    case 'procedure_count':
    case 'procedure_info':
      return `🏥 **Procedimientos:**
• Total: **${data.total}**
• Programados: **${data.scheduled}**
• En progreso: **${data.inProgress}**
• Completados: **${data.completed}**
• Cancelados: **${data.cancelled}**
• Hoy: **${data.today}**`;

    case 'procedure_scheduled':
      return `Hay **${data.scheduled}** procedimientos programados.`;

    case 'procedure_completed':
      return `Hay **${data.completed}** procedimientos completados.`;

    case 'procedure_today':
      return `Hoy hay **${data.today}** ${data.today === 1 ? 'procedimiento programado' : 'procedimientos programados'}.`;

    case 'therapy_count':
    case 'therapy_info':
      return `💊 **Horarios de Terapia:**
• Total: **${data.total}**
• Activos: **${data.active}**
• Completados: **${data.completed}**
• Cancelados: **${data.cancelled}**`;

    case 'therapy_active':
      return `Hay **${data.active}** horarios de terapia activos.`;

    case 'study_result_count':
    case 'study_result_info':
      return `🔬 **Resultados de Estudios:**
• Total: **${data.total}**
• Pendientes: **${data.pending}**
• Completados: **${data.completed}**
• Revisados: **${data.reviewed}**
• Este mes: **${data.thisMonth}**`;

    case 'study_result_pending':
      return `Hay **${data.pending}** resultados de estudios pendientes de revisión.`;

    case 'study_result_month':
      return `Este mes se han realizado **${data.thisMonth}** estudios.`;

    case 'certificate_count':
    case 'certificate_info':
      return `📜 **Certificaciones Médicas:**
• Total: **${data.total}**
• Activas: **${data.active}**
• Vencidas: **${data.expired}**
• Este mes: **${data.thisMonth}**`;

    case 'certificate_active':
      return `Hay **${data.active}** certificaciones médicas activas.`;

    case 'certificate_expired':
      return `Hay **${data.expired}** certificaciones médicas vencidas.`;

    case 'certificate_month':
      return `Este mes se han emitido **${data.thisMonth}** certificaciones médicas.`;

    case 'insurance_count':
    case 'insurance_info':
      return `🛡️ **Autorizaciones de Seguro:**
• Total: **${data.total}**
• Pendientes: **${data.pending}**
• Aprobadas: **${data.approved}**
• Rechazadas: **${data.rejected}**
• Vencidas: **${data.expired}**`;

    case 'insurance_pending':
      return `Hay **${data.pending}** autorizaciones de seguro pendientes.`;

    case 'insurance_approved':
      return `Hay **${data.approved}** autorizaciones de seguro aprobadas.`;

    case 'insurance_rejected':
      return `Hay **${data.rejected}** autorizaciones de seguro rechazadas.`;

    case 'general_count':
      // Try to provide a general overview when we detect a "how many" question
      return `📊 **Resumen General del Sistema:**
• Pacientes: Consulta con "¿Cuántos pacientes hay?"
• Citas: Consulta con "¿Cuántas citas hay?"
• Personal: Consulta con "¿Cuántos doctores hay?"
• Inventario: Consulta con "Artículos con stock bajo"
• Financiero: Consulta con "Ingresos de hoy"
• Procedimientos: Consulta con "¿Cuántos procedimientos hay?"
• Terapias: Consulta con "Horarios de terapia activos"
• Estudios: Consulta con "Resultados de estudios pendientes"
• Certificados: Consulta con "Certificados médicos activos"
• Seguros: Consulta con "Autorizaciones de seguro pendientes"

¿Sobre qué sección te gustaría saber más?`;

    default:
      return 'Puedo ayudarte con información sobre pacientes, citas, inventario, facturación, personal, expedientes médicos, procedimientos, horarios de terapia, resultados de estudios, certificaciones médicas y autorizaciones de seguro. ¿Qué te gustaría saber? Intenta preguntar de forma más específica, por ejemplo: "¿Cuántos pacientes hay?" o "¿Cuántos procedimientos hay?".';
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

    // Always try AI first if available (prioritize conversational AI)
    let aiResponse = null;
    
    // Double-check openaiClient status
    console.log('🔍 Checking OpenAI client status...');
    console.log(`   openaiClient exists: ${!!openaiClient}`);
    console.log(`   OPENAI_API_KEY in env: ${!!process.env.OPENAI_API_KEY}`);
    if (process.env.OPENAI_API_KEY) {
      console.log(`   OPENAI_API_KEY length: ${process.env.OPENAI_API_KEY.length}`);
      console.log(`   OPENAI_API_KEY prefix: ${process.env.OPENAI_API_KEY.substring(0, 7)}...`);
    }
    
    if (openaiClient) {
      console.log('🤖 OpenAI client available, attempting AI response...');
      console.log(`   Message: "${message.substring(0, 50)}..."`);
      console.log(`   Conversation history: ${conversationHistory.length} messages`);
      try {
        aiResponse = await useAIForChat(message, conversationHistory);
        if (aiResponse && aiResponse.trim().length > 0) {
          console.log('✅ AI response generated successfully');
          console.log(`   Response preview: "${aiResponse.substring(0, 100)}..."`);
        } else {
          console.log('⚠️  AI returned empty or null response, falling back to rule-based');
        }
      } catch (error) {
        console.error('❌ AI error, falling back to rule-based:', error);
        console.error('   Error details:', error.message);
        console.error('   Error stack:', error.stack);
      }
    } else {
      console.log('⚠️  OpenAI client NOT available, using rule-based system');
      console.log('   OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
      if (process.env.OPENAI_API_KEY) {
        console.log('   ⚠️  WARNING: API key exists but client is null - reinitializing...');
        // Try to reinitialize
        try {
          const apiKey = process.env.OPENAI_API_KEY.trim();
          if (apiKey && apiKey.length > 10) {
            const OpenAI = require('openai');
            openaiClient = new OpenAI({ apiKey: apiKey });
            console.log('   ✅ OpenAI client reinitialized successfully');
            // Try again with reinitialized client
            try {
              aiResponse = await useAIForChat(message, conversationHistory);
              if (aiResponse && aiResponse.trim().length > 0) {
                console.log('✅ AI response generated after reinitialization');
              }
            } catch (retryError) {
              console.error('❌ AI failed after reinitialization:', retryError.message);
            }
          }
        } catch (initError) {
          console.error('❌ Failed to reinitialize OpenAI:', initError.message);
        }
      }
    }

    // If AI provided a response, use it (even if short, AI is more conversational)
    if (aiResponse && aiResponse.trim().length > 0) {
      console.log('📤 Returning AI response to client');
      return res.json({
        success: true,
        response: aiResponse,
        intent: 'ai_generated',
        aiEnabled: true
      });
    }
    
    console.log('📤 Falling back to rule-based response');

    // Fallback to rule-based system only if AI is not available or failed
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

        case 'procedure_count':
        case 'procedure_info':
        case 'procedure_scheduled':
        case 'procedure_completed':
        case 'procedure_today':
          data = await getSystemData.getProcedureStats();
          response = await generateResponse(intent, data, message);
          break;

        case 'therapy_count':
        case 'therapy_info':
        case 'therapy_active':
          data = await getSystemData.getTherapyStats();
          response = await generateResponse(intent, data, message);
          break;

        case 'study_result_count':
        case 'study_result_info':
        case 'study_result_pending':
        case 'study_result_month':
          data = await getSystemData.getStudyResultStats();
          response = await generateResponse(intent, data, message);
          break;

        case 'certificate_count':
        case 'certificate_info':
        case 'certificate_active':
        case 'certificate_expired':
        case 'certificate_month':
          data = await getSystemData.getCertificateStats();
          response = await generateResponse(intent, data, message);
          break;

        case 'insurance_count':
        case 'insurance_info':
        case 'insurance_pending':
        case 'insurance_approved':
        case 'insurance_rejected':
          data = await getSystemData.getInsuranceStats();
          response = await generateResponse(intent, data, message);
          break;

        case 'general_count':
          // Get all stats for a general overview
          const [patientStats, appointmentStats, inventoryStats, financialStats, staffStats] = await Promise.all([
            getSystemData.getPatientStats(),
            getSystemData.getAppointmentStats(),
            getSystemData.getInventoryStats(),
            getSystemData.getFinancialStats(),
            getSystemData.getStaffStats()
          ]);
          response = `📊 **Resumen General del Sistema:**
• **Pacientes**: ${patientStats.total} totales, ${patientStats.active} activos
• **Citas**: ${appointmentStats.total} totales, ${appointmentStats.today} hoy
• **Inventario**: ${inventoryStats.total} artículos, ${inventoryStats.lowStock} con stock bajo
• **Financiero**: $${financialStats.totalRevenue.toFixed(2)} ingresos totales, ${financialStats.pendingInvoices} facturas pendientes
• **Personal**: ${staffStats.active} miembros activos (${staffStats.doctors} doctores)

¿Sobre qué sección te gustaría saber más detalles?`;
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

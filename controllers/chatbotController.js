const { Patient, Appointment, Inventory, Invoice, Payment, User, MedicalRecord, sequelize } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

// System data query functions
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
    return { total, active, today, thisMonth };
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
    return { total, today, scheduled, confirmed, completed, cancelled, thisWeek };
  },

  // Inventory statistics
  async getInventoryStats() {
    const total = await Inventory.count();
    const allItems = await Inventory.findAll({
      attributes: ['itemName', 'quantity', 'reorderLevel']
    });
    
    const lowStockItems = allItems.filter(item => item.quantity <= item.reorderLevel);
    const lowStock = lowStockItems.length;
    const outOfStock = allItems.filter(item => item.quantity === 0).length;
    
    return { 
      total, 
      lowStock, 
      outOfStock, 
      lowStockItems: lowStockItems.slice(0, 10).map(item => ({
        itemName: item.itemName,
        quantity: item.quantity,
        reorderLevel: item.reorderLevel
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
    return { total, active, doctors, receptionists, technicians };
  },

  // Get specific patient info
  async getPatientInfo(name) {
    const patients = await Patient.findAll({
      where: {
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${name}%` } },
          { lastName: { [Op.iLike]: `%${name}%` } }
        ]
      },
      limit: 5
    });
    return patients;
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
        { model: Patient, attributes: ['firstName', 'lastName', 'phone'] },
        { model: User, as: 'doctor', attributes: ['firstName', 'lastName'] }
      ],
      order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']],
      limit: 20
    });
    return appointments;
  }
};

// Simple intent detection (can be enhanced with AI)
const detectIntent = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // Patient queries
  if (lowerMessage.includes('paciente') || lowerMessage.includes('patient')) {
    if (lowerMessage.includes('cuánto') || lowerMessage.includes('how many') || lowerMessage.includes('total')) {
      return 'patient_count';
    }
    if (lowerMessage.includes('hoy') || lowerMessage.includes('today')) {
      return 'patient_today';
    }
    if (lowerMessage.includes('mes') || lowerMessage.includes('month')) {
      return 'patient_month';
    }
    return 'patient_info';
  }

  // Appointment queries
  if (lowerMessage.includes('cita') || lowerMessage.includes('appointment')) {
    if (lowerMessage.includes('cuánto') || lowerMessage.includes('how many') || lowerMessage.includes('total')) {
      return 'appointment_count';
    }
    if (lowerMessage.includes('hoy') || lowerMessage.includes('today')) {
      return 'appointment_today';
    }
    if (lowerMessage.includes('programada') || lowerMessage.includes('scheduled')) {
      return 'appointment_scheduled';
    }
    if (lowerMessage.includes('próxima') || lowerMessage.includes('upcoming') || lowerMessage.includes('siguiente')) {
      return 'appointment_upcoming';
    }
    return 'appointment_info';
  }

  // Inventory queries
  if (lowerMessage.includes('inventario') || lowerMessage.includes('inventory') || lowerMessage.includes('insumo') || lowerMessage.includes('stock')) {
    if (lowerMessage.includes('bajo') || lowerMessage.includes('low') || lowerMessage.includes('falt') || lowerMessage.includes('missing')) {
      return 'inventory_low';
    }
    if (lowerMessage.includes('agotado') || lowerMessage.includes('out of stock') || lowerMessage.includes('sin stock')) {
      return 'inventory_out';
    }
    return 'inventory_info';
  }

  // Financial queries
  if (lowerMessage.includes('factura') || lowerMessage.includes('invoice') || lowerMessage.includes('ingreso') || lowerMessage.includes('revenue') || lowerMessage.includes('pago') || lowerMessage.includes('payment')) {
    if (lowerMessage.includes('pendiente') || lowerMessage.includes('pending')) {
      return 'financial_pending';
    }
    if (lowerMessage.includes('hoy') || lowerMessage.includes('today')) {
      return 'financial_today';
    }
    if (lowerMessage.includes('mes') || lowerMessage.includes('month')) {
      return 'financial_month';
    }
    return 'financial_info';
  }

  // Staff queries
  if (lowerMessage.includes('personal') || lowerMessage.includes('staff') || lowerMessage.includes('doctor') || lowerMessage.includes('empleado')) {
    return 'staff_info';
  }

  return 'general';
};

// Generate response based on intent and data
const generateResponse = async (intent, data, originalMessage) => {
  switch (intent) {
    case 'patient_count':
      return `Actualmente hay ${data.total} pacientes registrados en el sistema. ${data.active} están activos.`;

    case 'patient_today':
      return `Hoy se registraron ${data.today} ${data.today === 1 ? 'paciente nuevo' : 'pacientes nuevos'}.`;

    case 'patient_month':
      return `Este mes se han registrado ${data.thisMonth} ${data.thisMonth === 1 ? 'paciente nuevo' : 'pacientes nuevos'}.`;

    case 'appointment_count':
      return `Hay ${data.total} citas en total. ${data.scheduled} programadas, ${data.confirmed} confirmadas, ${data.completed} completadas y ${data.cancelled} canceladas.`;

    case 'appointment_today':
      return `Hoy hay ${data.today} ${data.today === 1 ? 'cita programada' : 'citas programadas'}.`;

    case 'appointment_scheduled':
      return `Hay ${data.scheduled} citas programadas en el sistema.`;

    case 'appointment_upcoming':
      if (data.length === 0) {
        return 'No hay citas próximas programadas.';
      }
      const appointmentsList = data.slice(0, 5).map(apt => {
        const date = moment(apt.appointmentDate).format('DD/MM/YYYY');
        return `- ${apt.Patient.firstName} ${apt.Patient.lastName} con Dr. ${apt.doctor.firstName} ${apt.doctor.lastName} el ${date} a las ${apt.startTime}`;
      }).join('\n');
      return `Próximas citas:\n${appointmentsList}${data.length > 5 ? `\n... y ${data.length - 5} más` : ''}`;

    case 'inventory_low':
      if (data.lowStockItems.length === 0) {
        return 'No hay artículos con stock bajo en este momento.';
      }
      const itemsList = data.lowStockItems.map(item => 
        `- ${item.itemName}: ${item.quantity} unidades (nivel mínimo: ${item.reorderLevel})`
      ).join('\n');
      return `Hay ${data.lowStock} artículos con stock bajo:\n${itemsList}`;

    case 'inventory_out':
      return `Hay ${data.outOfStock} artículos sin stock en el inventario.`;

    case 'financial_pending':
      return `Hay ${data.pendingInvoices} facturas pendientes por un total de $${data.pendingAmount.toFixed(2)}.`;

    case 'financial_today':
      return `Los ingresos de hoy son $${data.todayRevenue.toFixed(2)}.`;

    case 'financial_month':
      return `Los ingresos de este mes son $${data.thisMonthRevenue.toFixed(2)}.`;

    case 'financial_info':
      return `Total de facturas: ${data.totalInvoices}. ${data.paidInvoices} pagadas, ${data.pendingInvoices} pendientes. Ingresos totales: $${data.totalRevenue.toFixed(2)}.`;

    case 'staff_info':
      return `El personal activo incluye: ${data.doctors} ${data.doctors === 1 ? 'doctor' : 'doctores'}, ${data.receptionists} ${data.receptionists === 1 ? 'recepcionista' : 'recepcionistas'}, y ${data.technicians} ${data.technicians === 1 ? 'técnico' : 'técnicos'}. Total: ${data.active} miembros activos.`;

    default:
      return 'Puedo ayudarte con información sobre pacientes, citas, inventario, facturación y personal. ¿Qué te gustaría saber?';
  }
};

// Main chatbot handler
exports.chat = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?.id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'El mensaje no puede estar vacío' });
    }

    // Detect intent
    const intent = detectIntent(message);

    // Get relevant data
    let data = {};
    let response = '';

    try {
      switch (intent) {
        case 'patient_count':
        case 'patient_today':
        case 'patient_month':
          data = await getSystemData.getPatientStats();
          break;

        case 'appointment_count':
        case 'appointment_today':
        case 'appointment_scheduled':
          data = await getSystemData.getAppointmentStats();
          break;

        case 'appointment_upcoming':
          data = await getSystemData.getUpcomingAppointments(7);
          break;

        case 'inventory_low':
        case 'inventory_out':
          data = await getSystemData.getInventoryStats();
          break;

        case 'financial_pending':
        case 'financial_today':
        case 'financial_month':
        case 'financial_info':
          data = await getSystemData.getFinancialStats();
          break;

        case 'staff_info':
          data = await getSystemData.getStaffStats();
          break;

        default:
          data = {};
      }

      // Generate response
      response = await generateResponse(intent, data, message);
    } catch (error) {
      console.error('Error getting system data:', error);
      response = 'Lo siento, hubo un error al obtener la información. Por favor intenta de nuevo.';
    }

    res.json({
      success: true,
      response,
      intent
    });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ message: 'Error procesando el mensaje', error: error.message });
  }
};


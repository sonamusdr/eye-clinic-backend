const { PatientForm, Appointment, Patient, User } = require('../models');

// Generate or get form link for an appointment
exports.generateFormLink = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if form already exists
    let form = await PatientForm.findOne({
      where: { appointmentId }
    });

    if (!form) {
      // Create new form
      form = await PatientForm.create({
        appointmentId
      });
    }

    // Generate the public URL
    const frontendUrl = process.env.FRONTEND_URL || 'https://eyeclinic.aledsystems.com';
    const formUrl = `${frontendUrl}/patient-form/${form.token}`;

    res.json({
      success: true,
      formUrl,
      token: form.token,
      isCompleted: form.isCompleted
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get form by token (public endpoint)
exports.getFormByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const form = await PatientForm.findOne({
      where: { token },
      include: [
        {
          model: Appointment,
          include: [
            {
              model: Patient,
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
            }
          ]
        }
      ]
    });

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Check if form is expired
    if (new Date() > new Date(form.expiresAt)) {
      return res.status(400).json({ message: 'This form has expired' });
    }

    // Check if already completed
    if (form.isCompleted) {
      return res.status(400).json({ message: 'This form has already been completed' });
    }

    res.json({
      success: true,
      form: {
        id: form.id,
        appointment: form.Appointment,
        isCompleted: form.isCompleted
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Submit form (public endpoint)
exports.submitForm = async (req, res) => {
  try {
    const { token } = req.params;
    const formData = req.body;

    const form = await PatientForm.findOne({
      where: { token },
      include: [
        {
          model: Appointment,
          include: [
            {
              model: Patient
            }
          ]
        }
      ]
    });

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    if (form.isCompleted) {
      return res.status(400).json({ message: 'This form has already been completed' });
    }

    if (new Date() > new Date(form.expiresAt)) {
      return res.status(400).json({ message: 'This form has expired' });
    }

    // Update form with data
    await form.update({
      formData,
      isCompleted: true,
      completedAt: new Date()
    });

    // Optionally update patient information if provided
    if (formData.patientInfo && form.Appointment.Patient) {
      const patient = form.Appointment.Patient;
      const updates = {};
      
      if (formData.patientInfo.email) updates.email = formData.patientInfo.email;
      if (formData.patientInfo.phone) updates.phone = formData.patientInfo.phone;
      if (formData.patientInfo.address) updates.address = formData.patientInfo.address;
      if (formData.patientInfo.medicalHistory) updates.medicalHistory = formData.patientInfo.medicalHistory;
      if (formData.patientInfo.allergies) updates.allergies = formData.patientInfo.allergies;

      if (Object.keys(updates).length > 0) {
        await patient.update(updates);
      }
    }

    res.json({
      success: true,
      message: 'Form submitted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get form status (for staff)
exports.getFormStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const form = await PatientForm.findOne({
      where: { appointmentId },
      include: [
        {
          model: Appointment
        }
      ]
    });

    if (!form) {
      return res.json({
        success: true,
        hasForm: false
      });
    }

    res.json({
      success: true,
      hasForm: true,
      isCompleted: form.isCompleted,
      completedAt: form.completedAt,
      formData: form.formData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


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
          required: false,
          include: [
            {
              model: Patient,
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
            }
          ]
        },
        {
          model: Patient,
          required: false,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        }
      ]
    });

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Check if form is expired
    if (form.expiresAt && new Date() > new Date(form.expiresAt)) {
      return res.status(400).json({ message: 'This form has expired' });
    }

    // Check if already completed
    if (form.isCompleted) {
      return res.status(400).json({ message: 'This form has already been completed' });
    }

    // Get patient name for display
    let patientName = null;
    if (form.Appointment && form.Appointment.Patient) {
      patientName = `${form.Appointment.Patient.firstName} ${form.Appointment.Patient.lastName}`;
    } else if (form.Patient) {
      patientName = `${form.Patient.firstName} ${form.Patient.lastName}`;
    }

    res.json({
      success: true,
      form: {
        id: form.id,
        formType: form.formType,
        appointment: form.Appointment,
        patient: form.Patient,
        patientName,
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

    // Handle form submission based on form type
    if (form.formType === 'registration') {
      // For registration forms, create or update patient
      const patientInfo = formData.patientInfo;
      
      if (patientInfo) {
        let patient = null;
        
        // If form has patientId, update existing patient
        if (form.patientId) {
          patient = await Patient.findByPk(form.patientId);
          if (patient) {
            // Update existing patient
            await patient.update({
              firstName: patientInfo.firstName || patient.firstName,
              lastName: patientInfo.lastName || patient.lastName,
              dateOfBirth: patientInfo.dateOfBirth || patient.dateOfBirth,
              gender: patientInfo.gender || patient.gender,
              email: patientInfo.email || patient.email,
              phone: patientInfo.phone || patient.phone,
              address: patientInfo.address || patient.address,
              city: patientInfo.city || patient.city,
              state: patientInfo.state || patient.state,
              zipCode: patientInfo.zipCode || patient.zipCode,
              emergencyContactName: patientInfo.emergencyContactName || patient.emergencyContactName,
              emergencyContactPhone: patientInfo.emergencyContactPhone || patient.emergencyContactPhone,
              emergencyContactRelation: patientInfo.emergencyContactRelation || patient.emergencyContactRelation,
              medicalHistory: patientInfo.medicalHistory || patient.medicalHistory,
              allergies: patientInfo.allergies || patient.allergies,
              insuranceProvider: formData.insuranceInfo?.insuranceProvider || patient.insuranceProvider,
              insurancePolicyNumber: formData.insuranceInfo?.insurancePolicyNumber || patient.insurancePolicyNumber,
              insuranceGroupNumber: formData.insuranceInfo?.insuranceGroupNumber || patient.insuranceGroupNumber
            });
          }
        } else {
          // Create new patient
          patient = await Patient.create({
            firstName: patientInfo.firstName,
            lastName: patientInfo.lastName,
            dateOfBirth: patientInfo.dateOfBirth,
            gender: patientInfo.gender,
            email: patientInfo.email,
            phone: patientInfo.phone,
            address: patientInfo.address,
            city: patientInfo.city,
            state: patientInfo.state,
            zipCode: patientInfo.zipCode,
            emergencyContactName: patientInfo.emergencyContactName,
            emergencyContactPhone: patientInfo.emergencyContactPhone,
            emergencyContactRelation: patientInfo.emergencyContactRelation,
            medicalHistory: patientInfo.medicalHistory || formData.medicalInfo?.medicalHistory,
            allergies: patientInfo.allergies || formData.medicalInfo?.allergies,
            insuranceProvider: formData.insuranceInfo?.insuranceProvider,
            insurancePolicyNumber: formData.insuranceInfo?.insurancePolicyNumber,
            insuranceGroupNumber: formData.insuranceInfo?.insuranceGroupNumber
          });
          
          // Update form with patientId
          await form.update({ patientId: patient.id });
        }
      }
    } else if (form.formType === 'appointment' && form.Appointment && form.Appointment.Patient) {
      // For appointment forms, update existing patient
      const patient = form.Appointment.Patient;
      const updates = {};
      
      if (formData.patientInfo?.email) updates.email = formData.patientInfo.email;
      if (formData.patientInfo?.phone) updates.phone = formData.patientInfo.phone;
      if (formData.patientInfo?.address) updates.address = formData.patientInfo.address;
      if (formData.medicalInfo?.medicalHistory) updates.medicalHistory = formData.medicalInfo.medicalHistory;
      if (formData.medicalInfo?.allergies) updates.allergies = formData.medicalInfo.allergies;

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

// Generate registration form link for a patient (or new patient)
exports.generateRegistrationFormLink = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Handle 'new' or null patientId
    const actualPatientId = (patientId && patientId !== 'new' && patientId !== 'null') ? patientId : null;

    // If patientId is provided, verify patient exists
    if (actualPatientId) {
      const patient = await Patient.findByPk(actualPatientId);
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
    }

    // Check if form already exists for this patient (only if patientId exists)
    let form = null;
    if (actualPatientId) {
      form = await PatientForm.findOne({
        where: { 
          patientId: actualPatientId,
          formType: 'registration',
          isCompleted: false
        }
      });
    }

    if (!form) {
      // Create new registration form
      const formData = {
        patientId: actualPatientId,
        appointmentId: null,
        formType: 'registration'
      };
      
      form = await PatientForm.create(formData);
    }

    // Generate the public URL
    const frontendUrl = process.env.FRONTEND_URL || 'https://eyeclinic.aledsystems.com';
    const formUrl = `${frontendUrl}/patient-form/${form.token}`;

    res.json({
      success: true,
      formUrl,
      token: form.token,
      isCompleted: form.isCompleted || false
    });
  } catch (error) {
    console.error('Error generating registration form link:', error);
    res.status(500).json({ 
      message: error.message,
      details: error.stack 
    });
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


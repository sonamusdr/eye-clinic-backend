const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID ? twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
) : null;

exports.sendEmail = async (to, subject, data) => {
  try {
    let html = '';
    
    if (subject === 'Appointment Scheduled') {
      html = `
        <h2>Appointment Scheduled</h2>
        <p>Dear ${data.patientName},</p>
        <p>Your appointment has been scheduled with Dr. ${data.doctorName} on ${data.date} at ${data.time}.</p>
        <p>Please arrive 15 minutes early for your appointment.</p>
        <p>Thank you,<br>Eye Clinic Management System</p>
      `;
    } else if (subject === 'Appointment Cancelled') {
      html = `
        <h2>Appointment Cancelled</h2>
        <p>Dear ${data.patientName},</p>
        <p>Your appointment scheduled for ${data.date} at ${data.time} has been cancelled.</p>
        <p>Please contact us to reschedule if needed.</p>
        <p>Thank you,<br>Eye Clinic Management System</p>
      `;
    } else if (subject === 'Appointment Reminder') {
      html = `
        <h2>Appointment Reminder</h2>
        <p>Dear ${data.patientName},</p>
        <p>This is a reminder that you have an appointment with Dr. ${data.doctorName} on ${data.date} at ${data.time}.</p>
        <p>Please arrive 15 minutes early for your appointment.</p>
        <p>Thank you,<br>Eye Clinic Management System</p>
      `;
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    });

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

exports.sendSMS = async (to, message) => {
  try {
    if (!twilioClient) {
      console.log('Twilio not configured, SMS not sent');
      return false;
    }

    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });

    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
};


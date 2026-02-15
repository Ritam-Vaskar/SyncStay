import nodemailer from 'nodemailer';

const email = process.env.EMAIL_USER;
const password = process.env.EMAIL_PassKey;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: email,
    pass: password,
  },
});

const sendEmail = async (options) => {
  if (!email || !password) {
    console.warn('Email is not configured. Skipping send.');
    return;
  }

  const { to, subject, text, html, attachments = [] } = options;
  
  // Use html if provided, otherwise use text
  const content = html || text;
  const isHTML = html ? true : false;
  
  const mailOptions = {
    from: email,
    to: to,
    subject: subject,
    ...(isHTML ? { html: content } : { text: content }),
    attachments: attachments, 
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export default sendEmail;
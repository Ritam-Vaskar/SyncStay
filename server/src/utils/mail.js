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

const sendEmail = async (toOrOptions, subject, html) => {
  if (!email || !password) {
    console.warn('⚠️ Email is not configured. EMAIL_USER or EMAIL_PassKey missing in .env');
    console.warn('EMAIL_USER:', email ? 'SET' : 'NOT SET');
    console.warn('EMAIL_PassKey:', password ? 'SET' : 'NOT SET');
    return;
  }

  // Support both old signature sendEmail(to, subject, html) and new object-based signature
  let to, emailSubject, content, isHTML, attachments;
  
  if (typeof toOrOptions === 'string') {
    // Old signature: sendEmail(to, subject, html)
    to = toOrOptions;
    emailSubject = subject;
    content = html;
    isHTML = true;
    attachments = [];
    console.log('📧 Using old sendEmail signature (to, subject, html)');
  } else {
    // New signature: sendEmail({ to, subject, text, html, attachments })
    const options = toOrOptions;
    to = options.to;
    emailSubject = options.subject;
    content = options.html || options.text;
    isHTML = options.html ? true : false;
    attachments = options.attachments || [];
    console.log('📧 Using new sendEmail signature (options object)');
  }
  
  console.log('📤 Preparing to send email:');
  console.log('  To:', to);
  console.log('  Subject:', emailSubject);
  console.log('  Has HTML:', isHTML);
  console.log('  Attachments:', attachments.length);
  
  const mailOptions = {
    from: email,
    to: to,
    subject: emailSubject,
    ...(isHTML ? { html: content } : { text: content }),
    attachments: attachments, 
  };

  try {
    console.log('🚀 Sending email via nodemailer...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully');
    console.log('  Message ID:', info.messageId);
    console.log('  Response:', info.response);
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.error('  Error code:', error.code);
    console.error('  Error command:', error.command);
    throw error;
  }
};

export default sendEmail;
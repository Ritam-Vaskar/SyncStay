// Professional email templates for SyncStay

const getEmailTemplate = (content, eventName = 'SyncStay') => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${eventName}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7fa;
      color: #333333;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .email-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .email-header .logo {
      font-size: 36px;
      margin-bottom: 10px;
    }
    .email-body {
      padding: 40px 30px;
      line-height: 1.8;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #333333;
      margin-bottom: 20px;
    }
    .message {
      font-size: 15px;
      color: #555555;
      margin-bottom: 25px;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 25px 0;
      border-radius: 6px;
    }
    .info-box h3 {
      margin: 0 0 15px 0;
      font-size: 16px;
      color: #333333;
      font-weight: 600;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #666666;
      flex: 0 0 45%;
    }
    .info-value {
      color: #333333;
      flex: 0 0 55%;
      text-align: right;
    }
    .button {
      display: inline-block;
      padding: 14px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      font-size: 15px;
    }
    .button:hover {
      opacity: 0.9;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-success {
      background-color: #d4edda;
      color: #155724;
    }
    .status-warning {
      background-color: #fff3cd;
      color: #856404;
    }
    .status-info {
      background-color: #d1ecf1;
      color: #0c5460;
    }
    .divider {
      height: 1px;
      background-color: #e9ecef;
      margin: 30px 0;
    }
    .email-footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #6c757d;
      font-size: 13px;
      border-top: 1px solid #e9ecef;
    }
    .email-footer p {
      margin: 8px 0;
    }
    .email-footer a {
      color: #667eea;
      text-decoration: none;
    }
    .highlight {
      color: #667eea;
      font-weight: 600;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        margin: 0;
        border-radius: 0;
      }
      .email-header, .email-body, .email-footer {
        padding: 25px 20px;
      }
      .info-row {
        flex-direction: column;
      }
      .info-label, .info-value {
        text-align: left;
        flex: 1;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="logo">🏨</div>
      <h1>SyncStay</h1>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p><strong>SyncStay - Seamless Event Accommodation Management</strong></p>
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>© ${new Date().getFullYear()} SyncStay. All rights reserved.</p>
      <p>Need help? Contact us at <a href="mailto:support@syncstay.com">support@syncstay.com</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

export const bookingReceivedTemplate = (data) => {
  const { guestName, eventName, hotelName, roomType, numberOfRooms, checkIn, checkOut, bookingId } = data;
  
  const content = `
    <div class="greeting">Dear ${guestName},</div>
    <div class="message">
      Thank you for choosing SyncStay! We have successfully received your booking request for <span class="highlight">${eventName}</span>. 
      Your booking details are currently being processed and will be confirmed shortly by the event organizer.
    </div>
    
    <div class="info-box">
      <h3>📋 Booking Summary</h3>
      <div class="info-row">
        <span class="info-label">Booking ID</span>
        <span class="info-value" style="font-family: monospace; font-weight: 600;">${bookingId}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Event</span>
        <span class="info-value">${eventName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Hotel</span>
        <span class="info-value">${hotelName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Room Type</span>
        <span class="info-value">${roomType}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Number of Rooms</span>
        <span class="info-value">${numberOfRooms} room${numberOfRooms > 1 ? 's' : ''}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Check-in Date</span>
        <span class="info-value">${checkIn}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Check-out Date</span>
        <span class="info-value">${checkOut}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status</span>
        <span class="info-value"><span class="status-badge status-warning">Pending Approval</span></span>
      </div>
    </div>

    <div class="message">
      We'll send you a confirmation email once your booking has been approved by the event organizer. 
      Please keep this reference number for future correspondence: <strong>${bookingId}</strong>
    </div>

    <div class="divider"></div>

    <div class="message" style="font-size: 13px; color: #6c757d;">
      <strong>What's Next?</strong><br>
      • The event organizer will review your booking request<br>
      • You'll receive a confirmation email within 24-48 hours<br>
      • Upon confirmation, payment instructions will be provided
    </div>
  `;
  
  return getEmailTemplate(content, eventName);
};

export const bookingConfirmedTemplate = (data) => {
  const { guestName, eventName, hotelName, roomType, numberOfRooms, checkIn, checkOut, bookingId, totalAmount } = data;
  
  const content = `
    <div class="greeting">Congratulations ${guestName}! 🎉</div>
    <div class="message">
      Great news! Your booking for <span class="highlight">${eventName}</span> has been <strong>confirmed</strong>. 
      We're excited to have you join us. Below are your confirmed booking details.
    </div>
    
    <div class="info-box">
      <h3>✅ Confirmed Booking Details</h3>
      <div class="info-row">
        <span class="info-label">Booking ID</span>
        <span class="info-value" style="font-family: monospace; font-weight: 600;">${bookingId}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Event</span>
        <span class="info-value">${eventName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Hotel</span>
        <span class="info-value">${hotelName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Room Type</span>
        <span class="info-value">${roomType}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Number of Rooms</span>
        <span class="info-value">${numberOfRooms} room${numberOfRooms > 1 ? 's' : ''}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Check-in Date</span>
        <span class="info-value">${checkIn}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Check-out Date</span>
        <span class="info-value">${checkOut}</span>
      </div>
      ${totalAmount ? `
      <div class="info-row" style="border-top: 2px solid #667eea; margin-top: 10px; padding-top: 15px;">
        <span class="info-label" style="font-size: 16px;">Total Amount</span>
        <span class="info-value" style="font-size: 18px; color: #667eea; font-weight: 700;">${totalAmount}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">Status</span>
        <span class="info-value"><span class="status-badge status-success">Confirmed</span></span>
      </div>
    </div>

    <div class="message">
      Please save this confirmation email for your records. Present your booking ID at check-in: <strong>${bookingId}</strong>
    </div>

    <div class="divider"></div>

    <div class="message" style="font-size: 13px; color: #6c757d;">
      <strong>Important Reminders:</strong><br>
      • Check-in time is typically 2:00 PM, Check-out time is 11:00 AM<br>
      • Please carry a valid photo ID for verification<br>
      • Contact the hotel directly for any special requests<br>
      • For any changes or cancellations, please reach out to us immediately
    </div>
  `;
  
  return getEmailTemplate(content, eventName);
};

export const plannerNewBookingTemplate = (data) => {
  const { plannerName, eventName, guestName, guestEmail, hotelName, roomType, numberOfRooms, checkIn, checkOut, bookingId } = data;
  
  const content = `
    <div class="greeting">Dear ${plannerName},</div>
    <div class="message">
      A new booking request has been submitted for your event <span class="highlight">${eventName}</span>. 
      Please review the details below and approve or reject the request at your earliest convenience.
    </div>
    
    <div class="info-box">
      <h3>📨 New Booking Request</h3>
      <div class="info-row">
        <span class="info-label">Booking ID</span>
        <span class="info-value" style="font-family: monospace; font-weight: 600;">${bookingId}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Guest Name</span>
        <span class="info-value">${guestName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Guest Email</span>
        <span class="info-value">${guestEmail}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Hotel</span>
        <span class="info-value">${hotelName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Room Type</span>
        <span class="info-value">${roomType}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Number of Rooms</span>
        <span class="info-value">${numberOfRooms} room${numberOfRooms > 1 ? 's' : ''}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Check-in Date</span>
        <span class="info-value">${checkIn}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Check-out Date</span>
        <span class="info-value">${checkOut}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status</span>
        <span class="info-value"><span class="status-badge status-info">Requires Action</span></span>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://syncstay.com/dashboard" class="button">Review Booking Request</a>
    </div>

    <div class="message" style="font-size: 13px; color: #6c757d;">
      Please review and process this booking request promptly to ensure a seamless experience for your attendees.
    </div>
  `;
  
  return getEmailTemplate(content, eventName);
};

export default {
  bookingReceivedTemplate,
  bookingConfirmedTemplate,
  plannerNewBookingTemplate,
  getEmailTemplate
};

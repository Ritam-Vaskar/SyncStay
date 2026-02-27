import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Generate a PDF for client event review
 * @param {Object} data - Event and hotel data
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generateClientEventPDF = async (data) => {
  const { clientName, eventName, eventDates, location, expectedGuests, totalBudget, selectedHotels = [] } = data;

  return new Promise((resolve, reject) => {
    try {
      // Create a document
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // Collect PDF data in memory
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Helper function to format currency
      const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount);
      };

      // ===== HEADER SECTION =====
      doc.fontSize(24)
         .fillColor('#667eea')
         .text('🏨 SyncStay', { align: 'center' });
      
      doc.moveDown(0.5);
      
      doc.fontSize(18)
         .fillColor('#333333')
         .text('Event Accommodation Plan', { align: 'center' });
      
      doc.moveDown(1);
      
      // Horizontal line
      doc.moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .strokeColor('#667eea')
         .lineWidth(2)
         .stroke();
      
      doc.moveDown(1.5);

      // ===== GREETING =====
      doc.fontSize(14)
         .fillColor('#333333')
         .text(`Dear ${clientName},`, { align: 'left' });
      
      doc.moveDown(0.5);
      
      doc.fontSize(11)
         .fillColor('#555555')
         .text('Your event coordinator has selected the best accommodations for your upcoming event. Please review the selected hotels and event details below.', { 
           align: 'justify',
           lineGap: 3
         });
      
      doc.moveDown(1.5);

      // ===== EVENT SUMMARY SECTION =====
      doc.fontSize(14)
         .fillColor('#667eea')
         .text('📅 Event Summary', { underline: true });
      
      doc.moveDown(0.5);

      const eventDetails = [
        { label: 'Event Name', value: eventName },
        { label: 'Event Dates', value: eventDates },
        { label: 'Location', value: location },
        { label: 'Expected Guests', value: expectedGuests.toString() },
        { label: 'Total Budget', value: formatCurrency(totalBudget) }
      ];

      doc.fontSize(11).fillColor('#333333');
      
      eventDetails.forEach((detail) => {
        doc.font('Helvetica-Bold')
           .text(detail.label + ':', 70, doc.y, { continued: true, width: 150 })
           .font('Helvetica')
           .text(' ' + detail.value, { width: 300 });
        doc.moveDown(0.3);
      });

      doc.moveDown(1);

      // ===== SELECTED HOTELS SECTION =====
      doc.fontSize(14)
         .fillColor('#667eea')
         .font('Helvetica-Bold')
         .text('🏨 Selected Hotels', { underline: true });
      
      doc.moveDown(0.8);

      // Table header
      const tableTop = doc.y;
      const tableHeaders = ['Hotel Name', 'Room Type', 'Rooms', 'Price/Night', 'Total'];
      const columnWidths = [160, 80, 50, 85, 85];
      const startX = 50;

      // Draw table header background
      doc.rect(startX, tableTop, 495, 25)
         .fillColor('#667eea')
         .fill();

      // Draw table header text
      doc.fontSize(10)
         .fillColor('#ffffff')
         .font('Helvetica-Bold');

      let currentX = startX;
      tableHeaders.forEach((header, i) => {
        const align = i >= 2 ? 'right' : 'left';
        const padding = align === 'right' ? columnWidths[i] - 10 : 10;
        doc.text(header, currentX + (align === 'right' ? padding : 10), tableTop + 8, {
          width: columnWidths[i] - 20,
          align: align
        });
        currentX += columnWidths[i];
      });

      doc.moveDown(1.5);

      // Draw table rows
      doc.fillColor('#333333').font('Helvetica');
      
      let totalPrice = 0;
      selectedHotels.forEach((hotel, index) => {
        totalPrice += hotel.totalPrice || 0;
        
        const rowTop = doc.y;
        currentX = startX;

        // Background for alternating rows
        if (index % 2 === 0) {
          doc.rect(startX, rowTop - 5, 495, 25)
             .fillColor('#f8f9fa')
             .fill();
        }

        doc.fillColor('#333333');

        // Hotel Name
        doc.text(hotel.name, currentX + 10, rowTop, { width: columnWidths[0] - 20, align: 'left' });
        currentX += columnWidths[0];

        // Room Type
        doc.text(hotel.roomType, currentX + 10, rowTop, { width: columnWidths[1] - 20, align: 'left' });
        currentX += columnWidths[1];

        // Rooms
        doc.text(hotel.numberOfRooms.toString(), currentX, rowTop, { width: columnWidths[2] - 10, align: 'right' });
        currentX += columnWidths[2];

        // Price per Night
        doc.text(formatCurrency(hotel.pricePerNight), currentX, rowTop, { width: columnWidths[3] - 10, align: 'right' });
        currentX += columnWidths[3];

        // Total Price
        doc.font('Helvetica-Bold')
           .text(formatCurrency(hotel.totalPrice), currentX, rowTop, { width: columnWidths[4] - 10, align: 'right' });

        doc.font('Helvetica');
        doc.moveDown(1.2);
      });

      // Total row
      const totalRowTop = doc.y;
      doc.rect(startX, totalRowTop - 5, 495, 30)
         .fillColor('#f8f9fa')
         .fill();

      doc.fontSize(11)
         .fillColor('#333333')
         .font('Helvetica-Bold')
         .text('Total Accommodation Cost', startX + 10, totalRowTop + 3, { width: 350, align: 'right' });

      doc.fontSize(13)
         .fillColor('#667eea')
         .text(formatCurrency(totalPrice), startX + 370, totalRowTop + 2, { width: 115, align: 'right' });

      doc.moveDown(2);

      // ===== FOOTER MESSAGE =====
      doc.fontSize(10)
         .fillColor('#555555')
         .font('Helvetica')
         .text('Please review the selected accommodations and provide your feedback if any changes are needed. Your event coordinator is ready to make adjustments based on your preferences.', {
           align: 'justify',
           lineGap: 3
         });

      doc.moveDown(1.5);

      // Horizontal line
      doc.moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .strokeColor('#e9ecef')
         .lineWidth(1)
         .stroke();

      doc.moveDown(0.8);

      // ===== FOOTER =====
      doc.fontSize(9)
         .fillColor('#6c757d')
         .text('SyncStay - Seamless Event Accommodation Management', { align: 'center' });
      
      doc.moveDown(0.3);
      
      doc.text(`Generated on ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
      
      doc.moveDown(0.3);
      
      doc.fillColor('#667eea')
         .text('© ' + new Date().getFullYear() + ' SyncStay. All rights reserved.', { align: 'center' });

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export default {
  generateClientEventPDF
};

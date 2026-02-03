# 🔒 Private Event & Guest Management - Testing Guide

## 🌱 Seed Data Created

The database has been seeded with complete test data for the private event flow!

### 👥 Test Accounts

| Role    | Email                  | Password    | Notes                          |
|---------|------------------------|-------------|--------------------------------|
| Admin   | admin@example.com      | password123 | Can approve events             |
| Planner | planner@example.com    | password123 | Creates & manages events       |
| Hotel 1 | hotel1@example.com     | password123 | Grand Royale Hotel             |
| Hotel 2 | hotel2@example.com     | password123 | Ocean View Resort              |
| Guest 1 | guest1@example.com     | password123 | ✅ Invited to private wedding  |
| Guest 2 | guest2@example.com     | password123 | ✅ Invited to private wedding  |
| Guest 3 | guest3@example.com     | password123 | ✅ Invited to private wedding  |
| Guest 4 | guest4@example.com     | password123 | ❌ NOT invited (for testing)   |

### 🎉 Test Events

#### 1. **Anderson Private Wedding** (PRIVATE)
- **URL**: http://localhost:5173/microsite/anderson-wedding-2026
- **Type**: Private Event (Planner Pays)
- **Invited Guests**: 10 guests
- **Bookings**: 3 bookings ($4,125 total)
- **Access**: Only invited guests can access microsite

#### 2. **50th Birthday Celebration** (PUBLIC)
- **URL**: http://localhost:5173/microsite/birthday-bash-2026
- **Type**: Public Event (Guest Pays)
- **Access**: Anyone can book

### 📊 Private Wedding Details

**Invited Guests:**
1. Emily Johnson (guest1@example.com) ✅ Has accessed
2. Michael Chen (guest2@example.com) ✅ Has accessed
3. Sarah Williams (guest3@example.com) ⏳ Not accessed yet
4. David Brown (guest4@example.com) ⏳ Not accessed yet
5. Jennifer Taylor (wedding.guest1@example.com) ⏳ No account yet
6. Robert Martinez (wedding.guest2@example.com) ⏳ No account yet
7. Lisa Anderson (wedding.guest3@example.com) ⏳ No account yet
8. James Wilson (wedding.guest4@example.com) ⏳ No account yet
9. Mary Davis (wedding.guest5@example.com) ⏳ No account yet
10. Christopher Moore (wedding.guest6@example.com) ⏳ No account yet

**Bookings:**
- Emily Johnson: 2 Deluxe Suites - $2,310 (Confirmed) ✅
- Michael Chen: 1 Standard Double - $660 (Confirmed) ✅
- Sarah Williams: 1 Deluxe Suite - $1,155 (Pending) ⏳

**Total Cost for Planner**: $4,125

---

## 🧪 Test Scenarios

### ✅ Test 1: Private Event Access Control

**Objective**: Verify that only invited guests can access private microsites

1. **Test Denied Access:**
   ```
   - Logout if logged in
   - Visit: http://localhost:5173/microsite/anderson-wedding-2026
   - Should see: Access verification modal
   - Enter email: guest4@example.com (NOT invited)
   - Click "Verify Access"
   - Should see: "You are not invited to this private event"
   ```

2. **Test Granted Access:**
   ```
   - Enter email: guest1@example.com (invited)
   - Click "Verify Access"
   - Should see: "Welcome, Emily Johnson!"
   - Microsite content should now be visible
   ```

3. **Test With Login:**
   ```
   - Login as: guest2@example.com / password123
   - Visit: http://localhost:5173/microsite/anderson-wedding-2026
   - Should automatically grant access (email in invite list)
   - No verification modal shown
   ```

---

### ✅ Test 2: Guest List Management

**Objective**: Manage invited guests for private events

1. **Access Guest Management:**
   ```
   - Login as: planner@example.com / password123
   - Navigate to: Planner Events
   - Find: "Anderson Private Wedding"
   - Should see: 🔒 "Private" badge
   - Click: "Manage Guests (10)" button
   ```

2. **View Guest List:**
   ```
   - Should see: 10 invited guests
   - Check stats: Total, Accessed, Not Accessed
   - View guest details: Name, Email, Phone, Access Code, Status
   ```

3. **Add Guest Manually:**
   ```
   - Click: "Add Guests Manually" button
   - Fill in guest details:
     * Name: Test Guest
     * Email: test.guest@example.com
     * Phone: +1-555-9999
   - Click: "Add Another Guest" (to add multiple)
   - Click: "Add Guests" button
   - Should see success message
   - Guest list should update with new guest
   ```

4. **Upload Excel File:**
   ```
   - Click: "Upload Excel File" button
   - Click: "Choose File"
   - Select: server/sample-guest-list.csv
   - Click: "Upload & Add Guests"
   - Should see: "10 guests added successfully"
   - Total guests should now be 20+
   ```

5. **Remove Guest:**
   ```
   - Find any guest in the list
   - Click: Red trash icon
   - Confirm deletion
   - Guest should be removed from list
   ```

6. **Toggle Event Privacy:**
   ```
   - Click: "Make Public" button at top
   - Should see: Event is now public
   - Visit microsite - no access verification needed
   - Click: "Make Private" to revert
   ```

---

### ✅ Test 3: Private Event Booking Flow (No Payment)

**Objective**: Test booking process for private events (planner pays)

1. **Make Booking as Invited Guest:**
   ```
   - Login as: guest3@example.com / password123
   - Visit: http://localhost:5173/microsite/anderson-wedding-2026
   - Should see: Available rooms
   - Click: "Book Now" on any room
   - Fill booking form (rooms, dates)
   - Submit booking
   - **IMPORTANT**: Should NOT see payment screen
   - Should see: "Paid by Planner" message
   - Booking status: Pending approval
   ```

2. **Verify Booking Created:**
   ```
   - Login as: planner@example.com
   - Go to: Microsite Dashboard for this event
   - Should see new booking in list
   - Status: Pending
   - Payment: "Paid by Planner"
   ```

---

### ✅ Test 4: Planner Billing Aggregation

**Objective**: View total costs for all guest bookings

1. **Access Billing (Method 1 - Custom Endpoint):**
   ```
   - Login as: planner@example.com
   - Get event ID from event details
   - Visit API: GET /api/bookings/planner/{eventId}/billing
   - Should see:
     * Total Cost: $4,125
     * Confirmed Cost: $2,970
     * Pending Cost: $1,155
     * Bookings breakdown by guest
   ```

2. **View in Dashboard:**
   ```
   - Login as: planner@example.com
   - Navigate to: Planner Events
   - Click on: "Anderson Private Wedding"
   - View booking summary
   - Should show aggregated costs
   ```

---

### ✅ Test 5: Public Event (Normal Flow)

**Objective**: Verify public events work as before

1. **Access Public Event:**
   ```
   - ANY user (logged in or not)
   - Visit: http://localhost:5173/microsite/birthday-bash-2026
   - No access verification required
   - Can view and book immediately
   ```

2. **Make Booking:**
   ```
   - Login as: guest4@example.com (or any guest)
   - Book a room
   - **IMPORTANT**: Payment IS required
   - Guest pays for their own booking
   - Normal payment flow applies
   ```

---

### ✅ Test 6: Create New Private Event

**Objective**: Create a brand new private event from scratch

1. **Create Event:**
   ```
   - Login as: planner@example.com
   - Navigate to: Planner Events
   - Click: "Create New Event"
   - Fill in event details
   - **IMPORTANT**: Toggle "Private Event" ON
   - Should see: "Only invited guests can access..."
   - Submit for approval
   ```

2. **Admin Approval:**
   ```
   - Login as: admin@example.com
   - Navigate to: Admin Approvals
   - Find pending event
   - Click: "Approve"
   - Event status → RFP Published
   ```

3. **Add Guests:**
   ```
   - Login back as: planner@example.com
   - Go to event
   - Click: "Manage Guests"
   - Add guests manually or upload Excel
   ```

4. **Test Access:**
   ```
   - Logout
   - Visit microsite URL
   - Try access with invited email → Success
   - Try with non-invited email → Denied
   ```

---

## 📁 Excel Upload Format

Use the sample file: `server/sample-guest-list.csv`

**Required Format:**
```csv
Name,Email,Phone
John Doe,john@example.com,+1-234-567-8900
Jane Smith,jane@example.com,+1-234-567-8901
```

**Rules:**
- First row MUST be headers: `Name`, `Email`, `Phone`
- Name and Email are required
- Phone is optional
- Duplicate emails will be skipped
- Accepts: .csv, .xlsx, .xls files

---

## 🔍 What to Verify

### Private Event Features:
- ✅ Guest list management (add, remove, upload)
- ✅ Email verification for microsite access
- ✅ Access codes generated for each guest
- ✅ Only invited guests can book
- ✅ No payment required for guests
- ✅ Total cost aggregated for planner
- ✅ "Paid by Planner" indicator on bookings
- ✅ Private badge on event cards
- ✅ Manage Guests button shows count
- ✅ Access status tracking (accessed/not accessed)

### Public Event Features:
- ✅ Open access (no verification)
- ✅ Normal payment flow
- ✅ Guest pays for own booking
- ✅ No guest list management

---

## 🐛 Known Scenarios to Test

1. **Duplicate Guest Prevention:**
   - Try adding same email twice
   - Should show error message

2. **Invalid Excel Format:**
   - Upload file without Name/Email columns
   - Should show clear error message

3. **Toggle Privacy with Existing Bookings:**
   - Make event private → public → private
   - Verify bookings remain intact

4. **Guest Removal with Existing Booking:**
   - Remove guest who already made booking
   - Verify booking remains valid

5. **Access Code Security:**
   - Each guest gets unique access code
   - Verify codes are different for each guest

---

## 📊 Expected Results Summary

| Scenario | Expected Behavior |
|----------|------------------|
| Private event + invited guest | ✅ Access granted, can book, no payment |
| Private event + non-invited guest | ❌ Access denied, cannot view microsite |
| Public event + any user | ✅ Full access, normal booking + payment |
| Planner billing view | Shows all bookings with total $4,125 |
| Guest list upload | 10 guests added from CSV successfully |
| Manual guest add | Single/multiple guests added with codes |
| Guest removal | Guest removed, booking (if any) remains |
| Privacy toggle | Event switches between private/public |

---

## 🚀 Quick Start Testing

**Run this sequence for full flow test:**

```bash
# 1. Seed the database
cd server
npm run seed:private

# 2. Start backend
npm run dev

# 3. Start frontend (new terminal)
cd ../client
npm run dev

# 4. Test private event access
# Open: http://localhost:5173/microsite/anderson-wedding-2026
# Try: guest4@example.com (denied) then guest1@example.com (granted)

# 5. Test guest management
# Login: planner@example.com
# Navigate to: Planner Events → Manage Guests
# Upload: server/sample-guest-list.csv

# 6. Test booking
# Login: guest2@example.com
# Visit private microsite
# Make booking (no payment required)

# 7. View planner billing
# Login: planner@example.com
# View event dashboard
# Check total costs
```

---

## 📞 Support

If you encounter any issues during testing:
1. Check terminal logs for errors
2. Verify MongoDB is running
3. Confirm all seeds ran successfully
4. Check browser console for frontend errors

**Happy Testing! 🎉**

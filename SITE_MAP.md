# LOYALTY PROGRAM - COMPLETE SITE MAP

## 🌐 DOMAIN STRUCTURE

### Main Domain (Institutional)
- **URL**: `menulove.com.au` or `menulove-rewards.netlify.app`
- **Purpose**: Marketing/sales site for cafe owners

### Venue Domains (Customer-facing)
- **URL**: `localhost:3000` (local) or `menulove.com.au?venue=xxx` (production)
- **Purpose**: Customer loyalty program for each cafe

---

## 📄 PAGE 1: INSTITUTIONAL LANDING
**Route**: `/` (main domain only)
**File**: `components/InstitutionalLanding.tsx`
**Purpose**: Marketing page for cafe owners

**Content**:
- MenuLove™ branding
- "Build Customer Loyalty. Grow Your Business."
- Description of service
- **Buttons**:
  - "Start Free Trial" → Owner signup
  - "Owner Login" → Admin panel

**Navigation**:
- Start Free Trial → Owner signup flow
- Owner Login → `/admin` (after auth)

---

## 📄 PAGE 2: ADMIN DASHBOARD
**Route**: `/admin`
**File**: `app/admin/page.tsx`
**Purpose**: Cafe owner management panel

**Tabs**:
1. **Overview** - Stats, insights, member activity
2. **Members** - Customer list, search, filters
3. **Activity** - Recent check-ins
4. **Redemptions** - Reward claims history
5. **Campaign Settings** - Configure loyalty program
6. **Account** - Owner profile

**Key Features**:
- Business Name configuration
- Points per check-in setting
- Reward tiers management (up to 4)
- Logo upload
- QR Display URLs generation
- Preview QR Display button

**Navigation**:
- Preview QR Display → `/qr-display?venue=xxx`
- Logout → `/` (institutional)

---

## 📄 PAGE 3: QR DISPLAY
**Route**: `/qr-display?venue=xxx`
**File**: `app/qr-display/page.tsx`
**Purpose**: Display on cafe checkout screen (tablet/POS)

**Content**:
- Cafe logo (if uploaded)
- Campaign name (e.g., "BACKSTREET CAFE POINTS CLUB")
- "Your Rewards" title
- Rewards grid (only configured rewards)
- **QR Code** (time-based token, changes hourly)
- Text: "Already registered? Scan QR code or click Join Us."
- **"Join Us" button**
- "Powered by MenuLove™" footer

**Navigation**:
- QR Code scan → `/jointheclub` (redirects to signup)
- Join Us button → `/jointheclub`

**Important**: Customers never return to this page after scanning

---

## 📄 PAGE 4: JOIN THE CLUB (Redirect)
**Route**: `/jointheclub`
**File**: `app/jointheclub/page.tsx`
**Purpose**: Redirect page to preserve subdomain/venue context

**Behavior**:
- Shows "Redirecting..." briefly
- Redirects to: `/?screen=signup&source=button`

**Navigation**:
- Auto-redirects → Page 5 (Signup Form)

---

## 📄 PAGE 5: SIGNUP FORM
**Route**: `/?screen=signup&source=button` or `/?screen=signup` (from QR scan)
**File**: `components/SignupForm.tsx`
**Purpose**: New customer registration

**Content**:
- Cafe logo
- Campaign name
- "Join the Club" title
- **Form fields**:
  - Full Name (required)
  - Email (required)
- "Join Now" button
- Back button

**Behavior**:
- **New email**: Creates account → Page 6 (Check-in)
- **Existing email (via button)**: Alert → redirects to Page 7 (Landing)
- **Existing email (via QR scan)**: Auto-login → Page 6 (Check-in)

**Navigation**:
- Back button → Page 7 (Landing)
- After signup → Page 6 (Check-in)

---

## 📄 PAGE 6: CHECK-IN
**Route**: `/?screen=checkin` (internal state)
**File**: `components/CheckInPage.tsx`
**Purpose**: Daily check-in for points

**Content**:
- Cafe logo
- Welcome message with customer name
- Points display (e.g., "You have 15 points")
- Progress bar with reward milestones
- Check-in status/confirmation
- **Buttons**:
  - "Claim Your Reward" (if eligible)
  - "View My Rewards"
- "Not you? Clear data" link
- "Powered by MenuLove™" footer

**Behavior**:
- Auto-checks in if valid QR token
- 1 check-in per day limit
- After successful check-in → **Auto-redirects to Page 7 (Landing)**

**Navigation**:
- After check-in → Page 7 (Landing) ✅
- View My Rewards → Page 8 (Rewards)
- Claim Your Reward → Page 8 (Rewards)

---

## 📄 PAGE 7: CUSTOMER LANDING
**Route**: `/?screen=landing` (internal state) or `/` (default)
**File**: `components/LandingPage.tsx`
**Purpose**: Customer home page after check-in

**Content**:
- Cafe logo (if uploaded)
- Campaign name
- "Your [Business Name] Rewards" title
- Description: "Scan, collect points, and unlock exclusive rewards."
- **Rewards grid** (all configured rewards)
- **"View My Rewards" button** (only for logged-in users)
- "Powered by MenuLove™" footer

**Important**: 
- **NO QR CODE** displayed (QR is only on Page 3)
- This is where customers land after check-in
- Shows all available rewards

**Navigation**:
- View My Rewards → Page 8 (Rewards)

---

## 📄 PAGE 8: REWARDS PAGE
**Route**: `/?screen=rewards` (internal state)
**File**: `components/RewardsPage.tsx`
**Purpose**: View and claim rewards

**Content**:
- Cafe logo
- "Your Rewards" title
- Current points display
- **Rewards list** with status:
  - Locked (not enough points)
  - Available (can claim)
  - Claimed (already redeemed)
- Each reward shows:
  - Points required
  - Name
  - Description
  - "Claim" button (if available)
- Back button
- "Powered by MenuLove™" footer

**Navigation**:
- Back button → **Page 7 (Landing)** ✅
- After claiming reward → Stays on Page 8

---

## 📄 PAGE 9: SUCCESS PAGE
**Route**: `/?screen=success` (internal state)
**File**: `components/SuccessPage.tsx`
**Purpose**: Confirmation after signup (fallback)

**Content**:
- Cafe logo
- "Welcome!" title
- Success message
- "Done" button

**Navigation**:
- Done button → Page 7 (Landing)

**Note**: This page is rarely shown now since new signups go directly to check-in

---

## 🔄 COMPLETE USER FLOWS

### Flow 1: New Customer via QR Scan
```
Page 3 (QR Display) 
  → Scan QR Code
  → Page 5 (Signup Form)
  → Fill name + email
  → Page 6 (Check-in)
  → Auto check-in
  → Page 7 (Landing) ✅
  → Click "View My Rewards"
  → Page 8 (Rewards)
  → Back button
  → Page 7 (Landing) ✅
```

### Flow 2: New Customer via Join Us Button
```
Page 3 (QR Display)
  → Click "Join Us"
  → Page 4 (Redirect)
  → Page 5 (Signup Form)
  → Fill name + email
  → Page 6 (Check-in)
  → Auto check-in
  → Page 7 (Landing) ✅
  → Click "View My Rewards"
  → Page 8 (Rewards)
  → Back button
  → Page 7 (Landing) ✅
```

### Flow 3: Existing Customer via QR Scan
```
Page 3 (QR Display)
  → Scan QR Code
  → Page 6 (Check-in) [auto-login]
  → Auto check-in
  → Page 7 (Landing) ✅
  → Click "View My Rewards"
  → Page 8 (Rewards)
```

### Flow 4: Existing Customer via Join Us Button
```
Page 3 (QR Display)
  → Click "Join Us"
  → Page 4 (Redirect)
  → Page 5 (Signup Form)
  → Enter existing email
  → Alert: "Already registered! Scan QR code"
  → Auto-redirect to Page 7 (Landing) ✅
```

### Flow 5: Cafe Owner
```
Page 1 (Institutional)
  → Click "Owner Login"
  → Page 2 (Admin Dashboard)
  → Configure campaign
  → Click "Preview QR Display"
  → Page 3 (QR Display)
```

---

## 🎯 KEY PRINCIPLES

1. **QR Display (Page 3)** = Cafe checkout screen only
2. **Customer Landing (Page 7)** = Customer home (NO QR code)
3. **After check-in** → Always go to Page 7 (Landing)
4. **Rewards back button** → Always go to Page 7 (Landing)
5. **Customers never return to Page 3** after scanning

---

## 📱 NAVIGATION SUMMARY

| From Page | Action | To Page |
|-----------|--------|---------|
| 1 (Institutional) | Owner Login | 2 (Admin) |
| 2 (Admin) | Preview QR | 3 (QR Display) |
| 3 (QR Display) | Scan QR / Join Us | 4 → 5 (Signup) |
| 5 (Signup) | New email | 6 (Check-in) |
| 5 (Signup) | Existing (button) | 7 (Landing) |
| 5 (Signup) | Existing (QR) | 6 (Check-in) |
| 6 (Check-in) | After check-in | 7 (Landing) ✅ |
| 6 (Check-in) | View Rewards | 8 (Rewards) |
| 7 (Landing) | View Rewards | 8 (Rewards) |
| 8 (Rewards) | Back | 7 (Landing) ✅ |


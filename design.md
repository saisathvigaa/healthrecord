# HealthTrack Mobile — Interface Design

## Overview

HealthTrack Mobile is a patient health record app that enables users to upload blood and urine test reports (PDF/images), automatically extracts biomarker data using AI, and displays historical trends with micro-charts. The design follows Apple Human Interface Guidelines with a clean, clinical aesthetic using light backgrounds and blue accent colors.

---

## Design Principles

- **Clinical & Professional**: Medical-grade clarity with a light theme and calming blue accents
- **One-Handed Mobile-First**: All interactive elements within thumb reach; portrait orientation (9:16)
- **Data-Driven**: Emphasize charts, trends, and historical comparisons
- **Minimal Cognitive Load**: Clear hierarchy, progressive disclosure of details

---

## Color Palette

| Token | Light Theme | Usage |
|-------|-------------|-------|
| **Primary** | `#0a7ea4` (Clinical Blue) | Accent, buttons, active states, chart lines |
| **Background** | `#ffffff` | Screen background |
| **Surface** | `#f5f5f5` | Cards, elevated containers |
| **Foreground** | `#11181c` | Primary text |
| **Muted** | `#687076` | Secondary text, labels |
| **Border** | `#e5e7eb` | Dividers, card borders |
| **Success** | `#22c55e` | Normal/healthy values |
| **Warning** | `#f59e0b` | Borderline values |
| **Error** | `#ef4444` | Out-of-range values |

---

## Screen List

### 1. **Onboarding / Welcome**
- Intro slides explaining the app's purpose
- Quick setup (user name, date of birth optional)
- Permission requests (camera, photo library, notifications)
- CTA: "Start Tracking"

### 2. **Dashboard (Home)**
- **Header**: User greeting, last update date
- **Quick Stats Card**: 3–4 key metrics (Hemoglobin, Glucose, Creatinine, Cholesterol) with status badges (✓ Normal, ⚠ Warning, ✗ Abnormal)
- **Micro-Charts Section**: Grid of 6–8 small line charts (one per biomarker) showing last 6–12 months
- **Recent Reports**: List of last 3 uploaded reports with date and count of biomarkers extracted
- **CTA Button**: "Upload New Report" (prominent, bottom-right or sticky)

### 3. **Upload Report**
- **File Picker**: Camera or photo library
- **Preview**: Thumbnail of selected PDF/image
- **Processing State**: Spinner + "Extracting biomarkers..." message
- **Extraction Result**: Confirmation of extracted values with edit option
- **Save CTA**: "Save to Records"

### 4. **Biomarker Detail**
- **Header**: Biomarker name, unit, reference range
- **Large Chart**: Full-screen line chart with reference band (shaded area)
- **Current Value**: Large, color-coded display
- **Trend Indicator**: Arrow (↑↓→) + percentage change from last reading
- **Historical Table**: Last 6–12 readings with dates and values
- **Reference Info**: Explanation of what this marker means (collapsible)

### 5. **Reports History**
- **List View**: Each report shows:
  - Upload date
  - Number of biomarkers extracted
  - Report type (Blood/Urine)
  - Expandable details (tap to see all extracted values)
- **Search/Filter**: By date range or report type
- **Delete Option**: Swipe-to-delete or long-press menu

### 6. **Settings**
- **Profile**: User name, DOB, gender (optional)
- **Notifications**: Toggle push notifications
- **Data**: Export data as CSV, backup option
- **About**: App version, privacy policy, terms

---

## Key User Flows

### Flow 1: Upload & Extract Report
1. User taps "Upload New Report" button
2. Selects PDF or image from camera/library
3. App shows preview and "Processing..." state
4. AI extracts biomarker values and displays them
5. User reviews extracted data (can edit if needed)
6. Taps "Save" → values stored, dashboard updates

### Flow 2: View Biomarker Trend
1. User taps a micro-chart on Dashboard
2. Navigates to Biomarker Detail screen
3. Sees full chart, current value, trend, and historical table
4. Can scroll through historical readings
5. Taps back to return to Dashboard

### Flow 3: Check Report History
1. User navigates to Reports tab
2. Sees list of all uploaded reports sorted by date
3. Taps a report to expand and see all extracted values
4. Can delete a report via swipe or menu

---

## Component Library

### Micro-Chart
- **Size**: ~80×60px
- **Data**: Last 6–12 months of one biomarker
- **Style**: Line chart with reference band (shaded background)
- **Color**: Primary blue for line, muted for reference band
- **No labels** (space-constrained)

### Metric Card
- **Layout**: Icon + metric name + current value + status badge
- **Status Badge**: Color-coded circle (✓ green, ⚠ orange, ✗ red)
- **Tap Action**: Navigate to Biomarker Detail

### Report Card
- **Layout**: Date + report type + biomarker count + expand icon
- **Expanded**: Shows all extracted values in a scrollable list
- **Actions**: Delete (swipe or menu)

### Input Field
- **Style**: Rounded border, light background, clinical font
- **Validation**: Real-time feedback (optional)

---

## Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| **Screen Title** | System | 28px | Bold (700) | Foreground |
| **Section Header** | System | 18px | Semibold (600) | Foreground |
| **Body Text** | System | 16px | Regular (400) | Foreground |
| **Label** | System | 14px | Regular (400) | Muted |
| **Metric Value** | System | 24px | Semibold (600) | Primary |
| **Reference Range** | System | 12px | Regular (400) | Muted |

---

## Interaction & Feedback

| Action | Feedback |
|--------|----------|
| Button tap | Scale 0.97 + haptic (light) |
| Card tap | Opacity 0.7 |
| List item tap | Opacity 0.7 |
| Swipe to delete | Confirm dialog |
| File upload | Progress spinner + percentage |
| Data extraction | Loading state with "Processing..." message |

---

## Accessibility

- All text has sufficient contrast (WCAG AA minimum)
- Color is not the only indicator (use badges, icons, text)
- Touch targets are minimum 44×44pt
- Haptic feedback for important actions
- VoiceOver support for screen readers

---

## Technical Notes

- **Charts**: Use `react-native-svg` + custom drawing or lightweight chart library (e.g., `react-native-chart-kit`)
- **File Upload**: Use `expo-image-picker` for camera/library, `expo-document-picker` for PDFs
- **PDF Parsing**: Server-side using OpenAI Vision API
- **State Management**: React Context + AsyncStorage for local persistence
- **Animations**: Subtle transitions (80–300ms) using `react-native-reanimated`

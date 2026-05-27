# HealthTrack Mobile — Project TODO (MVP Edition)

## Infrastructure (COMPLETED)
- [x] Set up database schema (users, reports, biomarkers, readings)
- [x] Create backend API routes for report upload and biomarker storage
- [x] Set up tRPC API with protected procedures

## Core Features (IN PROGRESS)
- [x] Dashboard screen with quick stats and recent reports
- [x] Comprehensive comparison charts screen with line charts
- [x] Biomarker detail screens with large charts and reference ranges
- [x] Date filtering for biomarker charts (3m, 6m, 1y, all-time)
- [x] Data summary statistics (min, max, avg values)
- [x] Upload Report screen with working file picker
- [x] Gemini Vision API integration for biomarker extraction (via platform LLM)
- [x] Backend extraction endpoint to process uploads
- [x] Extraction service with JSON schema validation
- [ ] Dynamic chart updates from real database data
- [ ] End-to-end upload → extract → chart workflow (ready for testing)

## Branding & Polish
- [x] Generate custom app logo
- [x] Update app.config.ts with branding
- [x] Implement clinical blue color scheme (theme already set)
- [x] Add loading states and error handling
- [ ] Polish UI transitions

## Testing & Delivery
- [ ] Test upload and extraction flow
- [ ] Verify chart rendering
- [ ] Test on real device (QR code)
- [ ] Create checkpoint
- [ ] Final delivery to user

---

## Completed Items
- [x] Database schema created
- [x] Backend API routes implemented
- [x] Dashboard screen built

## Testing & Production Ready (NEW)
- [ ] Real file picker for PDFs and images
- [ ] S3 file upload integration
- [ ] OAuth login activation and testing
- [ ] Connect charts to real database data
- [ ] Remove mock data from charts
- [ ] Search and filter metrics by name
- [ ] Filter biomarkers by date range
- [ ] Filter biomarkers by status (normal/warning/abnormal)
- [ ] Test OCR accuracy with sample reports
- [ ] Build production APK for Android testing
- [ ] Test complete upload → extract → display workflow

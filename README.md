# SafeGate - Student Entry, Exit, and Attendance Monitoring System

A modern, professional Progressive Web App (PWA) designed for schools to monitor student attendance with real-time entry and exit tracking through QR code scanning.

## 🎯 Features

### Dashboard
- **Live Attendance Overview**: Real-time statistics showing total present, late arrivals, early departures, and missing students
- **Quick Actions**: One-click access to QR scanning and report generation
- **Recent Activity Feed**: Timestamped log of student check-ins and check-outs with verification status
- **Live Clock**: Real-time display of current time

### QR Code Scanner
- **Camera Integration**: Built-in QR code scanner for quick check-in/check-out
- **Camera Controls**: Start/stop camera with smooth transitions
- **Manual Entry Fallback**: Comprehensive student list for manual attendance recording
- **Visual Feedback**: Real-time status confirmations with success/error messages

### Student Profiles
- **Individual Records**: Detailed student profiles with photo, ID, class, and name
- **Attendance History**: Complete timeline of daily check-in and check-out events
- **Attendance Statistics**: Visual attendance rate progress indicator
- **Status Indicators**: Clear status markers for present, late, early, or absent

### Analytics & Reports
- **Weekly Trends**: Bar charts showing attendance patterns over time
- **Check-in Distribution**: Line charts displaying hourly check-in patterns
- **Status Breakdown**: Pie charts visualizing attendance status distribution
- **Active Alerts**: Real-time alert system for unusual attendance patterns
- **Summary Statistics**: Key metrics including total students, attendance rate, and alerts

## 🎨 Design

### Color Theme
- **Primary Blue**: `#8080FF` - Main brand color for primary actions and UI elements
- **Secondary Yellow**: `#D4AF37` - Accent color for warnings and secondary actions
- **Success Green**: `#50C878` - Verified check-ins and positive status
- **Warning Yellow**: `#FFD700` - Late arrivals and warnings
- **Destructive Red**: `#FF6B6B` - Absent students and critical alerts
- **Neutral Grays**: Background and text colors with high contrast

### Features
- **Light & Dark Modes**: Automatic theme switching based on system preferences with manual override
- **Mobile-First Design**: Fully responsive layout optimized for tablets, mobile devices, and desktops
- **Smooth Transitions**: Subtle animations and transitions for enhanced user experience
- **Accessibility**: Semantic HTML, ARIA labels, and keyboard navigation support

## 📱 Progressive Web App

### PWA Capabilities
- **Offline Support**: Service Worker enables offline functionality with caching
- **Installable**: Add to home screen on mobile devices
- **App-like Experience**: Standalone display mode for native app feel
- **Web Push Notifications**: Real-time alerts for attendance anomalies
- **Background Sync**: Offline attendance recording with automatic sync

### Installation

#### On Android
1. Open the app in Chrome or Edge
2. Tap the menu button (three dots)
3. Select "Install app"
4. Follow the prompts

#### On iOS
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Name the app and add it

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn
- Modern web browser with camera access
- For QR scanning: Camera-enabled device

### Installation

1. **Clone and Install**
```bash
git clone <repository-url>
cd safegate
npm install
```

2. **Run Development Server**
```bash
npm run dev
```

3. **Open in Browser**
Visit `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## 📊 Pages Overview

| Page | Path | Purpose |
|------|------|---------|
| Dashboard | `/` | Main hub with attendance overview and quick actions |
| QR Scanner | `/scan` | Camera-based check-in/check-out interface |
| Student Profiles | `/students` | Individual student records and attendance history |
| Analytics | `/analytics` | Comprehensive reports and trend analysis |

## 🔧 Technology Stack

- **Framework**: Next.js 16
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Icons**: Lucide React
- **PWA**: Service Worker, Web Manifest
- **Deployment**: Vercel Ready

## 🎓 Sample Data

The application includes sample student data for demonstration:
- 5 sample students with realistic names
- Daily attendance records
- Event timelines
- Attendance statistics

To integrate with a real database, modify the mock data in each component with your API calls.

## 🔐 Security Considerations

- Student data should be secured with proper authentication
- Implement backend validation for attendance records
- Use HTTPS in production
- Secure QR codes with student IDs only (no personal data)
- Add role-based access control (teacher/admin/student)

## 📝 Customization

### Color Theme
Edit `/app/globals.css` CSS variables:
```css
:root {
  --primary: oklch(0.55 0.18 260);      /* Blue */
  --secondary: oklch(0.75 0.15 50);     /* Yellow */
  --success: oklch(0.65 0.22 140);      /* Green */
  --warning: oklch(0.75 0.15 50);       /* Warning Yellow */
}
```

### School Information
Update metadata and branding:
- Logo in navbar component
- School name in layout title
- Contact information in footer

### Student Database
Replace sample data with actual student records from your school management system.

## 🚀 Deployment

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Deploy to Other Platforms
The app is a standard Next.js application and can be deployed to:
- Netlify
- Firebase Hosting
- AWS Amplify
- Self-hosted servers

## 📚 Features Roadmap

- [ ] Backend database integration
- [ ] User authentication and roles
- [ ] Email/SMS notifications
- [ ] Bulk QR code generation
- [ ] Parent portal integration
- [ ] Advanced analytics and ML-based predictions
- [ ] Multi-class support
- [ ] Calendar view for attendance

## 🐛 Troubleshooting

### Camera Not Working
- Check browser camera permissions
- Ensure HTTPS in production (required for camera API)
- Try a different browser
- Ensure device has camera hardware

### Service Worker Not Caching
- Clear browser cache and site data
- Unregister old service worker
- Check browser DevTools Network tab

### PWA Not Installing
- Use HTTPS (required for PWA installation)
- Ensure `manifest.json` is valid
- Check browser console for errors

## 📞 Support

For issues, questions, or feature requests, please contact the development team.

## 📄 License

This project is licensed under the MIT License.

---

**SafeGate** - Making schools safer, one scan at a time. ✓

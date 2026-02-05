# MLBB Draft Tool by kgjl

A real-time Mobile Legends: Bang Bang draft pick/ban tool with WebSocket synchronization, built with Next.js and Socket.IO.

NOTE: This is a work in progress and is not yet ready for production use.

**VIBECODED with the help of Gemini 3.0, Antigravity, and Claude 4.5**

## Features

- ✅ **Real-time synchronization** - Multiple clients stay in sync via WebSocket
- ✅ **Official MLBB draft sequence** - Follows tournament ban/pick order
- ✅ **Hover & Lock-In system** - Two-step selection process
- ✅ **Admin controls** - Start draft, reset, and manage both teams
- ✅ **Responsive design** - Works on desktop, tablet, and mobile (16:9 vertical screens)
- ✅ **Smooth animations** - Slide-in effects, grayscale hover states, and transitions
- ✅ **Timer system** - 60-second countdown per selection with panic mode at 10s

## Tech Stack

**Frontend:**
- Next.js 16.1.6
- React 19.2.3
- TailwindCSS 4
- Socket.IO Client 4.8.3

**Backend:**
- Node.js
- Express 4.18.2
- Socket.IO 4.8.3
- CORS 2.8.5

## Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd mlbb-drafttool
```

2. **Install server dependencies**
```bash
npm install
```

3. **Install client dependencies**
```bash
cd client
npm install
cd ..
```

## Running the Application

### Development Mode

1. **Start the server** (in root directory)
```bash
npm start
# or
node server.js
```
Server runs on `http://localhost:3002`

2. **Start the client** (in new terminal)
```bash
cd client
npm run dev
```
Client runs on `http://localhost:3000`

### Access the Draft Board

- **Admin view:** `http://localhost:3000/?side=admin`
- **Blue team view:** `http://localhost:3000/?side=blue`
- **Red team view:** `http://localhost:3000/?side=red`
- **Spectator view:** `http://localhost:3000/` (no side parameter)

## Usage

1. Open the admin view in one browser tab
2. Click **"Start Draft"** to begin
3. Hover over a hero to preview selection
4. Click **"Lock In"** to confirm the pick/ban
5. Timer automatically advances to next team
6. Use **"Reset"** button to restart the draft

## Project Structure

```
mlbb-drafttool/
├── server.js              # WebSocket server
├── package.json           # Server dependencies
├── download_assets.js     # Hero image scraper
├── client/                # Next.js frontend
│   ├── app/
│   │   ├── page.jsx       # Main draft board component
│   │   ├── globals.css    # Styles and animations
│   │   ├── heroes.json    # Hero data
│   │   └── layout.jsx     # Root layout
│   └── package.json       # Client dependencies
└── backups/               # Version history
    ├── v0.1/
    ├── v0.2/
    └── v0.3/
```

## Version History

- **v0.1** - Initial implementation with manual draft start
- **v0.2** - Added hover/confirm logic with grayscale effects
- **v0.3** - Mobile responsive design + project cleanup

## Responsive Breakpoints

- **Mobile:** < 768px (3-column hero grid, stacked layout)
- **Tablet:** 768px - 1023px (5-column grid, reduced sidebars)
- **Desktop:** ≥ 1024px (6-7 column grid, full layout)

## Updating Heroes

To add new heroes or update images:

1. Edit `client/app/heroes.json`
2. Run the asset downloader:
```bash
node download_assets.js
```

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

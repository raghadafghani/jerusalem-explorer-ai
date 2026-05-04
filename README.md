# Jerusalem Explorer AI

**AI-Powered Intelligent Trip Planner for Jerusalem & North**

*(Replace this with a real screenshot of the app once added to the repo)*

An intelligent, weather-aware travel companion that generates **personalized itineraries** for exploring Jerusalem and North.  
Tell the AI what you love — history, food, hiking, family time, spiritual journeys — and get a smart, optimized daily plan with interactive maps and one-click Waze navigation.

**Live Demo**: [jerusalem-explorer-ai-private.vercel.app](https://jerusalem-explorer-ai-private.vercel.app)

**Demo**: [jerusalem-explorer-ai-demo](https://drive.google.com/file/d/1lzfe4ZiIGkNtZBAZM9h9RBM_whLqESRs/view?usp=sharing)
---

## ✨ Key Features

- **AI Itinerary Generator** — Describe your preferences and receive a perfectly planned itinerary
- **Weather-Aware Planning** — Automatically adjusts suggestions based on current and forecasted weather
- **Multilingual Support** — Full interface and content in English, Hebrew (עברית), and Arabic (العربية)
- **Interactive Maps** — Powered by Leaflet with points of interest, routes, and map layers
- **Direct Waze Navigation** — One-click navigation to every stop
- **Modern Beautiful UI** — Built with shadcn/ui, Tailwind CSS, and smooth animations
---

## 🛠 Tech Stack

| Layer              | Technology                                      |
|--------------------|-------------------------------------------------|
| **Framework**      | React 19 + TanStack Start (full-stack)          |
| **Routing**        | TanStack Router                                 |
| **Language**       | TypeScript                                      |
| **Styling**        | Tailwind CSS + shadcn/ui + Radix UI             |
| **Maps**           | Leaflet + react-leaflet                         |
| **Server**         | Nitro                                           |
| **Build Tool**     | Vite                                            |
| **Package Manager**| Bun (recommended)                               |
| **Deployment**     | Vercel + Cloudflare Workers                     |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ or **Bun** (recommended)

### 1. Clone the repository
```bash
git clone https://github.com/raghadafghani/jerusalem-explorer-ai.git
cd jerusalem-explorer-ai
```
2. Install dependencies
```bash
Bashbun install
# or
npm install
```

3. Set up environment variables
Copy .env.example to .env and add your keys:
```bash
AI_API_KEY=your_api_key
AI_MODEL=gemini-2.5-flash
```

4. Run locally
```bash
Bashbun dev

# or
```bash
npm run dev
```
Open http://localhost:5173 in your browser.
Build for production
Bashbun run build
```

📁 Project Structure
```bash
textjerusalem-explorer-ai/
├── src/
│   ├── components/          # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   ├── integrations/
│   │   └── supabase/        # Supabase client & types
│   ├── lib/                 # Utilities & config
│   ├── routes/              # TanStack Router file-based routes
│   └── server/              # Nitro server functions
├── public/                  # Static assets
├── supabase/                # Database schema & migrations
├── .env.example
├── package.json
├── vite.config.ts
└── README.md
```
# Team Members:
Hadeel Abdellatif - Hadeel.abdellatif2001@gmail.com - +972584933933
Raghad Afghani - raghadafghani2001@gmail.com - +972 52-772-0461
Asma'a Abdellatif - asmaa.younes.abdellatif@gmail.com - +972 58-593-3911

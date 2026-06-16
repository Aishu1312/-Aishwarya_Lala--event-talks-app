# BigQuery Release Notes Tracker & X (Twitter) Composer

A premium single-page web dashboard built using **Python Flask** and **Vanilla HTML, CSS, and JavaScript** that fetches official Google Cloud BigQuery release notes, parses them into actionable updates, and lets you compose and share tweets about them directly to X (Twitter).

---

## 🌟 Key Features

- **Live Feed Syncing**: Fetches the official Google Cloud BigQuery Atom feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`) in real-time.
- **Smart Parsing**: Breaks down standard multi-update feed entries into separate, structured cards grouped by update type (Features, Breaking Changes, Bugs/Issues, General Changes, Announcements).
- **Intelligent Local Cache**: Utilizes a 10-minute in-memory cache to maintain server performance while providing an on-demand "Refresh" button with loading spinner indicator to sync live data.
- **Category Filter & Search**: Instantly filter updates by type using interactive stat cards and category chips, or perform instant full-text searches.
- **Interactive Tweet Composer**:
  - Populates a visual card mimicking the official X/Twitter post composer interface.
  - Auto-truncates description content to fit the character limit.
  - Provides options to toggle the official source URL link and hashtags (`#GoogleCloud`, `#BigQuery`).
  - Displays a real-time circular character count indicator (changing from blue to amber to red as you approach the 280-character limit).
  - Supports clipboard copies and opens the X web sharing intent inside a dedicated popup window.
- **Premium Aesthetics**: Features a modern dark-mode interface with glassmorphism panels, soft glowing status indicators, pulsing skeleton loaders, smooth hover transitions, and clean inline SVG icons.

---

## 🛠️ Architecture & Tech Stack

### Backend
- **Python Flask**: Simple routing and API controller.
- **urllib & xml.etree.ElementTree**: Standard libraries used to fetch and parse XML namespaces safely without heavy third-party dependencies.
- **Regular Expressions (`re`)**: Clean parsing mechanism to isolate H3 section headers inside CDATA HTML blocks and sanitize text elements for the Twitter composer.

### Frontend
- **Semantic HTML5**: Native layout shells for optimal SEO, screen readability, and performance.
- **Custom CSS3 (Dark Theme)**: Built using flexible CSS Custom Properties (Variables), Flexbox, CSS Grid layouts, and custom keyframe animations.
- **Vanilla ES6+ JavaScript**: Client-side state manager handling dynamic API requests, searching, category filters, interactive progress ring calculations, and Twitter integration.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- An internet connection to fetch the feed

### Installation & Run

1. Clone or copy the project files to your workspace.
2. Initialize and activate a Python virtual environment:
   ```powershell
   # On Windows PowerShell:
   py -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install the dependencies listed in `requirements.txt`:
   ```powershell
   pip install -r requirements.txt
   ```
4. Run the Flask server:
   ```powershell
   python app.py
   ```
5. Open your browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```

---

## 📂 Project Structure

```
bq-releases-notes/
├── app.py                  # Flask application server
├── requirements.txt        # Python dependencies
├── README.md               # Project documentation
├── .gitignore              # Files ignored by Git
├── templates/
│   └── index.html          # Main HTML structure with custom SVGs
└── static/
    ├── css/
    │   └── style.css       # Custom dark mode layout and transitions
    └── js/
        └── app.js          # JavaScript logic for search, chips, and composer
```

---

## 📝 License
This project is built as an open-source utility under the MIT License. BigQuery and Google Cloud Platform are trademarks of Google LLC.

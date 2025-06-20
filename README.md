# 🚀 VentureMind — *Your AI-Powered Business Strategy Co-Pilot*

> *Empowering your business ideas with the intelligence of a strategic AI crew.*

---

### 🎥 Live Demo & Video Walkthrough

[![Live Demo](https://img.shields.io/badge/Live_Demo-VentureMind-brightgreen?style=for-the-badge&logo=rocket)](https://your-live-app-url.com) 
> *Click the button above to try the application.*


[![Demo Video](https://img.youtube.com/vi/YT_ID/0.jpg)](https://youtu.be/YT_ID/)

> *Click the image above to see the demo video on YouTube.*

---

### 🧠 What is VentureMind?

**VentureMind** is an advanced web platform that uses a **multi-agent AI system** to provide deep, well-rounded business strategy analysis. Just input your business idea, and our team of intelligent agents—**The Visionary, Market Analyst, Critic, and Planner**—will collaborate to craft a comprehensive, personalized strategic report.

This project is a full-stack portfolio piece showcasing the synergy between a **modern backend, responsive frontend, scalable database design**, and **cutting-edge AI integration**.

---

### ✨ Key Features

- 🧩 **Multi-Agent Collaboration** Multiple AI models (GPT-4.1-Mini & DeepSeek-Chat), each assigned a unique role, work together to analyze your business concept from multiple angles.

- ⏱️ **Live Analysis Log** Watch the process in real-time as each AI agent contributes its insight—just like having a live strategy session.

- 🔐 **User Auth & Persistence** Built with **FastAPI** & **PostgreSQL**, with secure registration & login using username and email. All user data and reports are safely stored.

- 🧠 **Smart Memory System**
  - **Short-Term:** Access and manage your full history of analysis.
  - **Long-Term:** Opt to use your past reports as "memory" for deeper, contextual future analyses.

- 💬 **Interactive Q&A Agent** Curious about the results? Ask follow-up questions, and the Q&A Agent will provide contextual, intelligent answers.

- 📄 **Export to PDF** Generate a professionally formatted report ready to be shared, pitched, or printed.
  
- 🖥️ **Clean, Modern UI** Built with **Tailwind CSS** & **Alpine.js** for a fast, responsive experience across devices.

- 📖 **Auto-Generated API Docs**
  Thanks to FastAPI, interactive API documentation is available at `/docs` and `/redoc` when the server is running.

---

### 🌐 How to Use

1. **Register or log in** with your email.
2. **Enter your business idea** and start the analysis.
3. Watch the **live agent log** in action.
4. Review or download the **strategic report** in PDF.
5. Use the **Q&A feature** for follow-ups or to refine your idea.
6. Return anytime to view your **analysis history** or reuse memory for deeper insights.

---

### ⚙️ Tech Stack

| Layer        | Tech Used                                     |
|--------------|-----------------------------------------------|
| **Backend** | Python, FastAPI, CrewAI, SQLAlchemy, Psycopg2 |
| **Frontend** | HTML, Tailwind CSS, Alpine.js                 |
| **Database** | PostgreSQL (Dockerized)                       |
| **AI Models**| gpt-4.1-mini, deepseek-chat                   |
| **Tools** | Tavily Search API, WeasyPrint                 |

---

### 🚀 Getting Started Locally

Follow these steps to run VentureMind on your local machine.

**Prerequisites:**
- Python 3.9+
- Docker & Docker Compose
- An account with OpenAI & DeepSeek for API keys.

**1. Clone the repository:**
```sh
git clone [https://github.com/your-username/venturemind.git](https://github.com/your-username/venturemind.git)
cd venturemind
```

**2. Setup Backend Environment:**
```sh
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt
```

**3. Configure Environment Variables:**
- Create a file named `.env` in the root directory.
- Copy the contents of `.env.example` (if available) and fill in your details:
```env
# Example for PostgreSQL running in Docker
DATABASE_URL="postgresql://user:password@localhost:5432/venturemind_db"

# API Keys
OPENAI_API_KEY="sk-..."
DEEPSEEK_API_KEY="sk-..."
TAVILY_API_KEY="tvly-..."

# JWT Secret
SECRET_KEY="your_super_secret_key_for_jwt_that_is_very_long"
```

**4. Run the Database:**
```sh
docker-compose up -d
```
This command will start a PostgreSQL container in the background.

**5. Run the FastAPI Server:**
```sh
uvicorn main:app --reload
```
The server will be available at `http://127.0.0.1:8080`.

**6. Launch the Frontend:**
- Simply open the `index.html` file in your browser. The application is a static frontend that communicates with your local backend server.

---

### 📦 Project Status

✅ MVP Features Implemented  
🚧 Future Plans:  
- Multi-language support  
- Integration with Google Docs or Notion export  
- More agent personalities (e.g., Legal Advisor, Financial Analyst)  

---

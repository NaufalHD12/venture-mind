# 🚀 VentureMind — Your AI-Powered Business Strategy Co-Pilot

> *Empowering your business ideas with the intelligence of a strategic AI crew.*

---

### 🎥 Live Demo & Video Walkthrough

[![Live Demo](https://img.shields.io/badge/Live_Demo-Try%20VentureMind-brightgreen?style=for-the-badge&logo=rocket)](https://venture-mind-production-531d.up.railway.app/)
> *Click the button above to try the live application.*


[![Demo Video](https://img.youtube.com/vi/6tnLxhZDisA/0.jpg)](https://youtu.be/6tnLxhZDisA)

> *Click the image above for a video walkthrough on YouTube.*

---

### 🧠 What is VentureMind?

**VentureMind** is an advanced web application that uses a **multi-agent AI system** to provide deep, well-rounded business strategy analysis. Just input your business idea, and our team of intelligent agents—**The Visionary, Market Analyst, Critic, and Planner**—will collaborate to craft a comprehensive, personalized strategic report.

This project is a full-stack portfolio piece showcasing the synergy between a **modern backend, responsive frontend, scalable database design**, and **cutting-edge AI integration**.

---

### ✨ Key Features

-   🧩 **Multi-Agent Collaboration:** A team of AI agents, each with a unique role and powered by **GPT-4.1-Mini**, work together to analyze your business concept from multiple angles.
-   ⏱️ **Live Analysis Log:** Watch the process in real-time as each AI agent contributes its insight—just like having a live strategy session.
-   🔐 **User Auth & Persistence:** Built with **FastAPI** & **PostgreSQL**, with secure JWT-based registration and login. All user data and reports are safely stored.
-   🧠 **Smart Memory System:**
    -   **Short-Term:** Access and manage your full history of analysis.
    -   **Long-Term:** Opt to use your past reports as "memory" for deeper, contextual future analyses.
-   💬 **Interactive Q&A Agent:** Curious about the results? Ask follow-up questions, and a specialized Q&A agent will provide contextual, intelligent answers using the report as its knowledge base.
-   📄 **Export to PDF:** Generate a professionally formatted PDF report ready to be shared, pitched, or printed.
-   🖥️ **Clean, Modern UI:** Built with **Tailwind CSS** & **Alpine.js** for a fast, responsive experience across devices.

---

### 🤖 AI Engineering Concepts Applied

This project demonstrates several key skills in AI Engineering and the development of LLM-powered applications:

-   **Multi-Agent Systems:** Designed and implemented a collaborative workflow using the **CrewAI** framework. This goes beyond simple prompting by assigning specialized roles and backstories to different agents, enabling them to tackle complex problems by breaking them down into sub-tasks (vision, market analysis, risk assessment, and planning).

-   **RAG (Retrieval-Augmented Generation):** The *Market Analyst* agent uses the **Tavily Search API** to augment its knowledge with real-time, external information from the web. This grounds the AI's analysis in current data rather than relying solely on its pre-trained knowledge.

-   **Contextual & Long-Term Memory:** Implemented a system where users can explicitly provide past analyses as context for new tasks. This simulates a form of long-term memory, allowing the AI crew to produce more nuanced and relevant strategies that build upon previous interactions.

-   **Asynchronous Task Handling for LLMs:** Solved a critical real-world deployment challenge (`net::ERR_CONNECTION_RESET`) by building a robust streaming architecture.
    -   The backend uses **FastAPI's `StreamingResponse`** and **`asyncio`** to handle long-running AI tasks without blocking the server.
    -   Implemented a **per-task streaming** model, yielding progress updates to the frontend after each agent completes its work.
    -   Finalized with a **report chunking** mechanism to stream the large final report in smaller pieces, ensuring a stable connection and a responsive user experience on platforms with strict idle timeout policies.

---

### ⚙️ Tech Stack

| Layer | Tech Used |
|---|---|
| **Backend** | Python, FastAPI, CrewAI, SQLAlchemy, Psycopg2 |
| **Frontend** | HTML, Tailwind CSS, Alpine.js |
| **Database** | PostgreSQL (Deployed on Railway) |
| **AI Model** | GPT-4.1-Mini (via OpenAI API) |
| **Tools** | Tavily Search API, WeasyPrint (PDF Generation) |
| **Deployment** | Railway.app, Docker |

---

### 🚀 Getting Started Locally

Follow these steps to run VentureMind on your local machine.

**Prerequisites:**
- Python 3.9+
- An account with OpenAI for API keys.

**1. Clone the repository:**
```sh
git clone [https://github.com/NaufalHD12/venture-mind.git](https://github.com/NaufalHD12/venture-mind.git)
cd venture-mind
```

**2. Setup Environment:**
```sh
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# Install dependencies from the backend directory
pip install -r backend/requirements.txt
```

**3. Configure Environment Variables:**
- Create a file named `.env` in the **root** directory.
- Fill in your details:
```env
# Use a local SQLite database for easy setup
DATABASE_URL="postgresql://user:password@localhost:5432/venturemind_db"

# API Keys
OPENAI_API_KEY="sk-..."
TAVILY_API_KEY="tvly-..."

# JWT Secret
SECRET_KEY="a_very_long_and_super_secret_key_for_jwt"
```

**4. Run the FastAPI Server:**
```sh
# Navigate to the backend directory to run the server
cd backend
uvicorn app.main:app --reload
```
The server will be available at `http://127.0.0.1:8000`.

**5. Launch the Frontend:**
- Open the `frontend/static/index.html` file in your browser.

---

### 📦 Project Status

✅ **Deployed & Fully Functional** 

🚧 **Future Plans:** 
-   Integrate with Google Docs or Notion for report export.
-   Allow users to customize the AI agent crew or add new roles (e.g., *Legal Advisor*, *Financial Analyst*).
-   Implement a more advanced, vector-based long-term memory system.

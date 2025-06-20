# ==============================================================================
# 1. IMPORTS
# ==============================================================================
# --- Standard Library Imports ---
import os
import json
import asyncio
from datetime import timedelta
from typing import List
from starlette.responses import Response

# --- Third-party Library Imports ---
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session
from crewai import Agent, Task
from langchain_openai import ChatOpenAI
from langchain_community.tools.tavily_search import TavilySearchResults
import markdown2
from weasyprint import HTML

# --- Local Application Imports ---
from . import models, schemas, crud, auth
from .database import engine, get_db


# ==============================================================================
# 2. INITIALIZATION & CONFIGURATION
# ==============================================================================
# --- Load Environment Variables ---
load_dotenv()

# --- Database Initialization ---
# Create database tables based on the models defined
models.Base.metadata.create_all(bind=engine)

# --- LLM and Tool Initialization ---
# Initialize the Tavily search tool for web searches
search_tool = TavilySearchResults()

# Initialize OpenAI's GPT-4.1-mini model
gpt_4_1_mini = ChatOpenAI(
    model="gpt-4.1-mini", 
    temperature=0.7, 
    api_key=os.getenv("OPENAI_API_KEY")
)

# ==============================================================================
# 3. AI AGENT DEFINITIONS
# ==============================================================================
# --- Core Analysis Agents ---
visionary_agent = Agent(
    role='Creative Product Visionary',
    goal='Develop a raw business idea into a grand, compelling vision.',
    backstory="You are a highly optimistic product visionary...",
    llm=gpt_4_1_mini,
    allow_delegation=False,
    verbose=False
)

market_analyst_agent = Agent(
    role='Data-Driven Market Analyst',
    goal='Use web search to find real-time data...',
    backstory="You are a market analyst...",
    llm=gpt_4_1_mini,
    tools=[search_tool],
    allow_delegation=False,
    verbose=False
)

critic_agent = Agent(
    role='Realistic Risk Manager',
    goal='Objectively identify all weaknesses...',
    backstory="You are a meticulous and logical risk manager...",
    llm=gpt_4_1_mini,
    allow_delegation=False,
    verbose=False
)

planner_agent = Agent(
    role='Pragmatic Strategy Consultant',
    goal='Synthesize all information into a final report.',
    backstory='You are an expert at taking inputs from multiple sources...',
    llm=gpt_4_1_mini,
    allow_delegation=False,
    verbose=False
)

# --- Follow-up Q&A Agent ---
qna_agent = Agent(
    role='Creative Strategist & Follow-up Specialist',
    goal="Answer user questions and expand on ideas based on a provided report. Use your general knowledge and web search capabilities to provide creative, insightful, and forward-thinking answers.",
    backstory="You are a brilliant strategic assistant. You use a provided report as the primary context, but you are encouraged to think beyond it, add new insights, perform web searches for new information, and help the user develop their original idea further.",
    llm=gpt_4_1_mini,
    tools=[search_tool],
    allow_delegation=False,
    verbose=False
)


# ==============================================================================
# 4. FASTAPI APP & MIDDLEWARE
# ==============================================================================
app = FastAPI(title="VentureMind - AI Business Idea Analyst Server")

# Configure CORS to allow frontend requests
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://venture-mind-production.up.railway.app",
    "https://venture-mind-production-531d.up.railway.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# 5. PYDANTIC API MODELS
# ==============================================================================
class BusinessIdea(BaseModel):
    idea: str
    use_history: bool = False

class ReportPayload(BaseModel):
    markdown_content: str

class FollowUpQuery(BaseModel):
    report_context: str
    question: str
    use_history: bool = False


# ==============================================================================
# 6. AUTHENTICATION DEPENDENCIES & LOGIC
# ==============================================================================
async def get_current_user(token: str = Depends(auth.oauth2_scheme), db: Session = Depends(get_db)):
    """
    Decodes the JWT token to get the current user based on their email.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = crud.get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user


# ==============================================================================
# 7. API ENDPOINTS
# ==============================================================================

# --- Authentication Endpoints ---
@app.post("/token", response_model=schemas.Token, tags=["Authentication"])
async def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Authenticate user and return an access token.
    """
    # Frontend sends email in the 'username' field of the form
    user = crud.authenticate_user(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    # Create token with 'sub' as email, but also include username for the UI
    access_token = auth.create_access_token(
        data={"sub": user.email, "username": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "username": user.username}

@app.post("/users/", response_model=schemas.User, tags=["Authentication"])
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user.
    """
    db_user_by_email = crud.get_user_by_email(db, email=user.email)
    if db_user_by_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user_by_username = crud.get_user_by_username(db, username=user.username)
    if db_user_by_username:
        raise HTTPException(status_code=400, detail="Username already taken")
        
    return crud.create_user(db=db, user=user)

# --- History Endpoints ---
@app.get("/analyses/", response_model=List[schemas.Analysis], tags=["Analysis History"])
def read_analyses_for_user(current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Retrieve all analyses for the current user.
    """
    return crud.get_analyses_by_user(db, user_id=current_user.id)

@app.delete("/analyses/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Analysis History"])
def delete_user_analysis(analysis_id: int, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Delete a specific analysis belonging to the current user.
    """
    result = crud.delete_analysis(db=db, analysis_id=analysis_id, user_id=current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found or you don't have permission to delete it.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# --- Feature Endpoints (Refactored for Robust Streaming) ---

async def stream_analysis_generator(idea: str, use_history: bool, db: Session, user_id: int):
    """
    Asynchronously generates analysis steps and yields them as Server-Sent Events.
    This version uses an asyncio.Queue to decouple the blocking AI tasks from the
    streaming response, allowing for keep-alive pings to be sent.
    """
    loop = asyncio.get_running_loop()
    q = asyncio.Queue()

    def update_callback(update_type: str, data: dict):
        """A thread-safe way to put updates into the asyncio queue."""
        asyncio.run_coroutine_threadsafe(q.put({"type": update_type, **data}), loop)

    def crew_runner():
        """
        This function runs the blocking CrewAI tasks in a separate thread.
        It uses the callback to post updates to the queue instead of yielding.
        """
        try:
            # --- History Context ---
            history_context = ""
            if use_history:
                recent_analyses = crud.get_analyses_by_user(db, user_id)
                if recent_analyses:
                    history_summary = "\n".join([f"- Idea: '{an.idea_prompt}'. Key finding: {an.report_markdown[:150]}..." for an in recent_analyses[:2]])
                    history_context = f"For context, this user has previously analyzed:\n{history_summary}\nKeep these past analyses in mind when creating the new vision."

            # --- Task 1: Visionary ---
            vision_task = Task(description=f"Create a compelling vision for: '{idea}'.\n{history_context}", agent=visionary_agent, expected_output="An inspiring paragraph about the idea's potential.")
            update_callback('agent_start', {'agent': visionary_agent.role})
            vision_result = vision_task.execute()
            update_callback('agent_end', {'agent': visionary_agent.role})

            # --- Task 2: Market Analyst ---
            market_analysis_task = Task(description=f"Analyze the market for '{idea}', considering this vision: {vision_result}", agent=market_analyst_agent, expected_output="A summary of market trends and competitors.")
            update_callback('agent_start', {'agent': market_analyst_agent.role})
            market_result = market_analysis_task.execute()
            update_callback('agent_end', {'agent': market_analyst_agent.role})

            # --- Task 3: Critic ---
            critique_task = Task(description=f"Critically evaluate the idea for '{idea}', considering the vision ({vision_result}) and market analysis ({market_result}).", agent=critic_agent, expected_output="A bullet list of potential risks.")
            update_callback('agent_start', {'agent': critic_agent.role})
            critique_result = critique_task.execute()
            update_callback('agent_end', {'agent': critic_agent.role})

            # --- Task 4: Planner ---
            planning_task = Task(
                description=f"""
                    Synthesize all the following information into a single, cohesive final report for the business idea: '{idea}'.
                    You MUST use the information provided below as the primary context for your report.
                    **Vision Provided:** {vision_result}
                    **Market Analysis Provided:** {market_result}
                    **Critique & Risks Provided:** {critique_result}
                    Based on ALL of this information, create a comprehensive report that includes a summary, the market analysis, the risks, and a final SWOT & Action Plan. Structure your response with clear markdown headings.
                """,
                expected_output="A comprehensive, well-structured report in Markdown format.",
                agent=planner_agent
            )
            update_callback('agent_start', {'agent': planner_agent.role})
            final_report = planning_task.execute()
            update_callback('agent_end', {'agent': planner_agent.role})
            
            # --- Save to DB and send final result ---
            analysis_data = schemas.AnalysisCreate(idea_prompt=idea, report_markdown=final_report)
            crud.save_analysis(db, analysis_data, user_id)
            update_callback('final_result', {'result': final_report})

        except Exception as e:
            error_message = f"An error occurred during analysis: {str(e)}"
            print(f"\n--- STREAMING/CREW ERROR ---\n{error_message}\n-----------------------\n")
            update_callback('error', {'message': error_message})
        finally:
            # Signal that the work is done
            asyncio.run_coroutine_threadsafe(q.put(None), loop)

    # Start the blocking crew runner in a background thread
    crew_task = loop.run_in_executor(None, crew_runner)

    # Loop to handle queue items and send keep-alive pings
    while True:
        try:
            # Wait for an item from the queue, with a 15-second timeout
            item = await asyncio.wait_for(q.get(), timeout=15.0)
            
            if item is None:  # End of processing signal
                break
            
            # Send the actual data event
            yield f"data: {json.dumps(item)}\n\n"
            q.task_done()
        except asyncio.TimeoutError:
            # If the queue is empty for 15s, send a comment to keep the connection alive
            yield ": keep-alive\n\n"

    # Ensure the background thread is complete before finishing
    await crew_task


@app.post("/analyze-idea-stream", tags=["Analysis"])
async def analyze_business_idea_stream(request: BusinessIdea, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Endpoint to trigger the business idea analysis stream.
    """
    print(f"Analysis requested by user: {current_user.username}. Use History: {request.use_history}")
    return StreamingResponse(
        stream_analysis_generator(request.idea, request.use_history, db, current_user.id), 
        media_type="text/event-stream", 
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Important for Nginx/proxy setups
        })

@app.post("/generate-pdf", tags=["Reporting"])
def generate_pdf(payload: ReportPayload, current_user: schemas.User = Depends(get_current_user)):
    """
    Generates a PDF from markdown content.
    """
    try:
        html_content = markdown2.markdown(payload.markdown_content, extras=["tables", "fenced-code-blocks"])
        styled_html = f"<html><head><style>body {{ font-family: sans-serif; line-height: 1.6; }} h1, h2, h3 {{ color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;}}</style></head><body><h1>VentureMind Report for {current_user.username}</h1>{html_content}</body></html>"
        pdf_bytes = HTML(string=styled_html).write_pdf()
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=VentureMind_Report.pdf"})
    except Exception as e:
        print(f"PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF.")


@app.post("/ask-follow-up", tags=["Analysis"])
def ask_follow_up_question(query: FollowUpQuery, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Handles follow-up questions about a generated report.
    """
    try:
        full_context = query.report_context
        if query.use_history:
            # Fetch user's history and add it to the context
            user_history = crud.get_analyses_by_user(db, user_id=current_user.id)
            if user_history:
                history_summary = "\n\n--- PREVIOUS ANALYSIS CONTEXT ---\n"
                for an in user_history[:2]: # Use last 2 analyses
                    history_summary += f"\n**Regarding '{an.idea_prompt}':**\n{an.report_markdown}\n"
                full_context += history_summary

        qna_task = Task(
            description=f"""
                Based on the context below, answer the user's question. 
                You are encouraged to be creative, expand on the ideas, and use your search tool if needed to find new information that can enrich the answer.

                --- CONTEXT ---
                {full_context}
                --- END OF CONTEXT ---

                User's Question: {query.question}
            """,
            expected_output="An insightful and helpful answer that goes beyond just summarizing the report. Provide new perspectives or actionable advice if possible.",
            agent=qna_agent
        )
        # For single-agent tasks, it's more direct to just execute the task
        answer = qna_task.execute()
        return {"answer": answer}
    except Exception as e:
        print(f"Follow-up error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

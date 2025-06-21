const API_BASE_URL = 'https://venture-mind-production.up.railway.app';


document.addEventListener('alpine:init', () => {
    Alpine.data('ventureMindApp', () => ({
        //======================================================================
        //  STATE MANAGEMENT
        //======================================================================
        
        // --- Authentication & User State ---
        isLoggedIn: false,
        authView: 'login', // 'login' or 'register'
        username: '',
        email: '',
        password: '',
        currentUser: null,
        authToken: null,

        // --- Core Application State ---
        businessIdea: '',
        isLoading: false,
        isDownloading: false,
        error: null,
        liveLog: [],
        rawMarkdown: '',
        currentAnalysisId: null,

        // --- UI & Component State ---
        isHistoryPanelOpen: false,
        analysisHistory: [],
        useHistory: false,
        showConfirmationModal: false,
        itemToDelete: null,
        showLogoutModal: false,

        // --- Toast Notification State ---
        toastMessage: '',
        toastType: 'success',
        showToast: false,
        toastTimer: null,

        // --- Q&A Chat State ---
        followUpQuestion: '',
        isAskingFollowUp: false,
        chatHistory: [],
        useHistoryForFollowUp: false,

        //======================================================================
        //  COMPUTED PROPERTIES
        //======================================================================

        get resultsReady() {
            return !this.isLoading && this.rawMarkdown;
        },

        //======================================================================
        //  LIFECYCLE & INITIALIZATION
        //======================================================================

        init() {
            this.authToken = localStorage.getItem('ventureMindToken');
            const storedUser = localStorage.getItem('ventureMindUser');
            if (this.authToken && storedUser) {
                this.isLoggedIn = true;
                this.currentUser = storedUser;
                this.fetchHistory();
            }
        },

        //======================================================================
        //  UI & NOTIFICATION METHODS
        //======================================================================

        showNotification(message, type = 'success', duration = 3000) {
            if (this.toastTimer) clearTimeout(this.toastTimer);
            this.toastMessage = message;
            this.toastType = type;
            this.showToast = true;
            this.toastTimer = setTimeout(() => {
                this.showToast = false;
            }, duration);
        },

        toggleHistoryPanel() {
            this.isHistoryPanelOpen = !this.isHistoryPanelOpen;
        },

        //======================================================================
        //  AUTHENTICATION METHODS
        //======================================================================

        async login() {
            this.error = null;
            this.isLoading = true;
            const params = new URLSearchParams();
            // FastAPI's OAuth2 form expects a 'username' field, we pass the email value to it.
            params.append('username', this.email);
            params.append('password', this.password);

            try {
                const response = await fetch(`${API_BASE_URL}/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.detail || 'Login failed');

                this.authToken = data.access_token;
                this.currentUser = data.username; // Backend returns the actual username
                localStorage.setItem('ventureMindToken', this.authToken);
                localStorage.setItem('ventureMindUser', this.currentUser);
                
                this.isLoggedIn = true;
                this.password = '';
                this.fetchHistory();
                this.showNotification(`Welcome back, ${this.currentUser}!`);
            } catch (e) {
                this.error = e.message;
            } finally {
                this.isLoading = false;
            }
        },

        async register() {
            this.error = null;
            this.isLoading = true;
            try {
                const response = await fetch(`${API_BASE_URL}/users/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: this.username,
                        email: this.email,
                        password: this.password
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.detail || 'Registration failed');
                
                this.authView = 'login';
                // Use the error state to show a success message on the login form
                this.error = 'Registration successful! Please log in.';
            } catch (e) {
                this.error = e.message;
            } finally {
                this.isLoading = false;
            }
        },

        logout() {
            localStorage.removeItem('ventureMindToken');
            localStorage.removeItem('ventureMindUser');
            
            // Reset state
            this.isLoggedIn = false;
            this.currentUser = null;
            this.authToken = null;
            this.businessIdea = '';
            this.rawMarkdown = '';
            this.analysisHistory = [];
            this.isHistoryPanelOpen = false;
            this.showLogoutModal = false;
            
            this.showNotification('Logged out successfully.', 'info');
        },

        //======================================================================
        //  HISTORY & ANALYSIS MANAGEMENT
        //======================================================================
        
        async fetchHistory() {
            if (!this.authToken) return;
            try {
                const response = await fetch(`${API_BASE_URL}/analyses/`, {
                    headers: { 'Authorization': `Bearer ${this.authToken}` }
                });
                if (!response.ok) {
                    if (response.status === 401) {
                        this.logout(); // Token is invalid or expired
                        return;
                    }
                    throw new Error('Could not fetch history.');
                }
                this.analysisHistory = await response.json();
            } catch (e) {
                this.error = e.message;
                this.showNotification(e.message, 'error');
            }
        },

        loadAnalysisFromHistory(analysis) {
            this.businessIdea = analysis.idea_prompt;
            this.rawMarkdown = analysis.report_markdown;
            this.chatHistory = []; // Reset chat when loading a new report
            this.isHistoryPanelOpen = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.showNotification('Analysis loaded from history.');
        },

        confirmDelete(analysisId, event) {
            event.stopPropagation(); // Prevent the click from loading the analysis
            this.itemToDelete = analysisId;
            this.showConfirmationModal = true;
        },

        async deleteHistoryItem() {
            if (!this.itemToDelete) return;

            const deletedItemId = this.itemToDelete;

            try {
                const response = await fetch(`${API_BASE_URL}/analyses/${deletedItemId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${this.authToken}` }
                });
                if (!response.ok) {
                    throw new Error('Failed to delete history item.');
                }

                // Refresh history data
                await this.fetchHistory(); 

                // Check if the deleted item is currently displayed
                const currentAnalysis = this.analysisHistory.find(
                    analysis => analysis.id === deletedItemId
                );
                
                // If the currently displayed analysis was deleted, clear the view
                if (currentAnalysis && 
                    (this.businessIdea === currentAnalysis.idea_prompt || 
                    this.rawMarkdown === currentAnalysis.report_markdown)) {
                    this.rawMarkdown = '';
                    this.businessIdea = '';
                    this.chatHistory = [];
                    this.showNotification('Deleted analysis was cleared from view.');
                }

                this.showNotification('Analysis deleted successfully.');
                
                // Force a small UI refresh
                this.$nextTick(() => {
                    // This ensures the UI updates properly
                    console.log('UI refreshed after deletion');
                });

            } catch (e) {
                this.showNotification(e.message, 'error');
            } finally {
                this.showConfirmationModal = false;
                this.itemToDelete = null;
            }
        },

        //======================================================================
        //  CORE API CALLS (ANALYSIS, Q&A, PDF)
        //======================================================================

        async startAnalysis() {
            if (this.isLoading || !this.businessIdea.trim()) return;
            
            this.isLoading = true;
            this.error = null;
            this.liveLog = [];
            this.rawMarkdown = '';
            this.chatHistory = [];
            
            // Try streaming first, then fallback to simple endpoint
            const success = await this.tryStreamingAnalysis();
            
            if (!success) {
                console.log('Streaming failed, trying fallback method...');
                this.showNotification('Switching to alternative method...', 'info', 2000);
                await this.trySimpleAnalysis();
            }
        },

        async tryStreamingAnalysis() {
            try {
                console.log('Streaming attempt: trying stream method...');
                
                const response = await fetch(`${API_BASE_URL}/analyze-idea-stream`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.authToken}`,
                        'Cache-Control': 'no-cache'
                    },
                    body: JSON.stringify({
                        idea: this.businessIdea,
                        use_history: this.useHistory
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                if (!response.body) {
                    throw new Error('Response body is null.');
                }

                const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
                let buffer = '';
                
                let lastActivity = Date.now();
                const timeoutDuration = 60000; // 60 seconds
                const activityTimeout = setInterval(() => {
                    if (Date.now() - lastActivity > timeoutDuration) {
                        console.log('Streaming activity timeout detected');
                        reader.cancel('Timeout');
                        clearInterval(activityTimeout);
                    }
                }, 5000);

                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) {
                            console.log('Streaming completed by the server.');
                            clearInterval(activityTimeout);
                            
                            // If we have markdown content but didn't get a completion event,
                            // handle it here
                            if (this.rawMarkdown && this.isLoading) {
                                this.isLoading = false;
                                this.fetchHistory();
                                this.showNotification('Analysis completed!');
                            }
                            return true;
                        }

                        lastActivity = Date.now();
                        buffer += value;
                        
                        const messages = buffer.split('\n\n');
                        buffer = messages.pop() || '';
                        
                        for (const message of messages) {
                            if (!message.trim()) continue;
                            if (message.startsWith(':')) {
                                console.log('Keep-alive ping received');
                                continue;
                            }
                            if (message.startsWith('data:')) {
                                try {
                                    const jsonData = message.substring(5).trim();
                                    if (!jsonData) continue;
                                    const data = JSON.parse(jsonData);
                                    const shouldStop = await this.handleStreamData(data);
                                    if (shouldStop) {
                                        clearInterval(activityTimeout);
                                        return true;
                                    }
                                    if (data.type === 'error') throw new Error(data.message);
                                } catch (parseError) {
                                    console.error('JSON parse error:', parseError);
                                }
                            }
                        }
                    }
                } finally {
                    clearInterval(activityTimeout);
                    try { reader.cancel(); } catch (e) { /* Already closed */ }
                }
                
            } catch (error) {
                console.error('Streaming method failed:', error);
                return false; 
            }
        },

        // FIX 5: Add method to refresh entire view if needed
        refreshView() {
            this.$nextTick(() => {
                // Force Alpine.js to re-evaluate reactive data
                this.analysisHistory = [...this.analysisHistory];
                console.log('View refreshed');
            });
        },

        // FIX 6: Enhanced loadAnalysisFromHistory with tracking
        loadAnalysisFromHistory(analysis) {
            this.businessIdea = analysis.idea_prompt;
            this.rawMarkdown = analysis.report_markdown;
            this.chatHistory = []; // Reset chat when loading a new report
            this.currentAnalysisId = analysis.id; // Track current analysis
            this.isHistoryPanelOpen = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.showNotification('Analysis loaded from history.');
        },

        async trySimpleAnalysis() {
            try {
                this.liveLog = [
                    { id: 1, agent: 'Analyzing Business Idea', status: 'thinking' }
                ];
                
                const response = await fetch(`${API_BASE_URL}/analyze-idea-simple`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.authToken}`
                    },
                    body: JSON.stringify({
                        idea: this.businessIdea,
                        use_history: this.useHistory
                    })
                });

                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.detail || 'Analysis failed');
                }

                // Mark as completed
                this.liveLog[0].status = 'done';
                this.rawMarkdown = data.result;
                this.isLoading = false;
                this.fetchHistory();
                this.showNotification('Analysis completed using backup method!');
                
            } catch (error) {
                this.error = `Analysis failed: ${error.message}`;
                this.isLoading = false;
                this.showNotification(this.error, 'error', 5000);
                console.error('Simple analysis failed:', error);
            }
        },

        // Helper methods
        async handleStreamData(data) {
            switch (data.type) {
                case 'connection_established':
                    console.log('Stream connected');
                    break;
                    
                case 'agent_start':
                    this.liveLog.push({ 
                        id: Date.now(), 
                        agent: data.agent, 
                        status: 'thinking' 
                    });
                    break;
                    
                case 'agent_end':
                    const log = this.liveLog.find(l => l.agent === data.agent);
                    if (log) log.status = 'done';
                    break;
                    
                case 'progress':
                    console.log(`Progress: ${data.step}/${data.total} - ${data.message}`);
                    break;
                    
                // FIX 1: Handle report_chunk events to build the markdown content
                case 'report_chunk':
                    this.rawMarkdown += data.chunk;
                    console.log('Received report chunk, total length:', this.rawMarkdown.length);
                    break;
                    
                // FIX 2: Handle completed event properly
                case 'completed':
                    console.log('Analysis completed:', data.message);
                    this.isLoading = false;
                    this.fetchHistory(); // Refresh history
                    this.showNotification('Analysis completed successfully!');
                    return true; // Signal to stop streaming
                    
                case 'error':
                    throw new Error(data.message);
            }
            return false; // Continue streaming
        },

        shouldRetryStreaming(error) {
            const retryableErrors = [
                'timeout',
                'connection_reset',
                'network',
                'fetch'
            ];
            
            const errorString = (error.message || error.toString()).toLowerCase();
            return retryableErrors.some(keyword => errorString.includes(keyword));
        },

        async askFollowUp() {
            if (!this.followUpQuestion.trim() || this.isAskingFollowUp) return;

            this.isAskingFollowUp = true;
            this.chatHistory.push({ role: 'user', content: this.followUpQuestion });
            const questionToAsk = this.followUpQuestion;
            this.followUpQuestion = '';

            try {
                const response = await fetch(`${API_BASE_URL}/ask-follow-up`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.authToken}`
                    },
                    body: JSON.stringify({
                        report_context: this.rawMarkdown,
                        question: questionToAsk,
                        use_history: this.useHistoryForFollowUp
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.detail || 'Failed to get an answer.');
                
                this.chatHistory.push({ role: 'ai', content: data.answer });
                this.showNotification('Question answered successfully!');
            } catch (e) {
                this.chatHistory.push({
                    role: 'ai',
                    content: `Sorry, I encountered an error: ${e.message}`
                });
                this.showNotification(`Failed to answer question: ${e.message}`, 'error');
            } finally {
                this.isAskingFollowUp = false;
                this.$nextTick(() => {
                    this.$refs.chatContainer.scrollTop = this.$refs.chatContainer.scrollHeight;
                });
            }
        },

        async downloadPDF() {
            if (this.isDownloading || !this.rawMarkdown) return;
            this.isDownloading = true;

            try {
                const response = await fetch(`${API_BASE_URL}/generate-pdf`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.authToken}`
                    },
                    body: JSON.stringify({ markdown_content: this.rawMarkdown })
                });
                if (!response.ok) throw new Error('PDF generation failed.');

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'VentureMind_Report.pdf';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                this.showNotification('PDF downloaded successfully!');
            } catch (err) {
                this.error = `Could not download PDF: ${err.message}`;
                this.showNotification(this.error, 'error');
            } finally {
                this.isDownloading = false;
            }
        }
    }));
});

// ==============================================================================
//  GLOBAL CONFIGURATION
// ==============================================================================
const API_BASE_URL = 'https://venture-mind-production.up.railway.app';

document.addEventListener('alpine:init', () => {
    Alpine.data('ventureMindApp', () => ({
        //======================================================================
        //  STATE MANAGEMENT
        //======================================================================
        
        // --- Authentication & User State ---
        isLoggedIn: false,
        authView: 'login',
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

        // --- Streaming Control ---
        streamingSupported: true,
        currentStream: null,

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
            
            // Test streaming support
            this.testStreamingSupport();
        },

        //======================================================================
        //  STREAMING SUPPORT TEST
        //======================================================================

        async testStreamingSupport() {
            try {
                const response = await fetch(`${API_BASE_URL}/health`);
                if (response.ok) {
                    console.log('API is reachable');
                } else {
                    console.warn('API health check failed');
                }
            } catch (error) {
                console.warn('API connection test failed:', error);
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
                this.currentUser = data.username;
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
                this.error = 'Registration successful! Please log in.';
            } catch (e) {
                this.error = e.message;
            } finally {
                this.isLoading = false;
            }
        },

        logout() {
            // Cancel any ongoing stream
            if (this.currentStream) {
                this.currentStream.close();
                this.currentStream = null;
            }

            localStorage.removeItem('ventureMindToken');
            localStorage.removeItem('ventureMindUser');
            
            this.isLoggedIn = false;
            this.currentUser = null;
            this.authToken = null;
            this.businessIdea = '';
            this.rawMarkdown = '';
            this.analysisHistory = [];
            this.isHistoryPanelOpen = false;
            this.showLogoutModal = false;
            this.liveLog = [];
            this.isLoading = false;
            
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
                        this.logout();
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
            this.chatHistory = [];
            this.isHistoryPanelOpen = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.showNotification('Analysis loaded from history.');
        },

        confirmDelete(analysisId, event) {
            event.stopPropagation();
            this.itemToDelete = analysisId;
            this.showConfirmationModal = true;
        },

        async deleteHistoryItem() {
            if (!this.itemToDelete) return;
            try {
                const response = await fetch(`${API_BASE_URL}/analyses/${this.itemToDelete}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${this.authToken}` }
                });
                if (!response.ok) {
                    throw new Error('Failed to delete history item.');
                }
                this.analysisHistory = this.analysisHistory.filter(item => item.id !== this.itemToDelete);
                this.showNotification('Analysis deleted successfully.');
            } catch (e) {
                this.showNotification(e.message, 'error');
            } finally {
                this.showConfirmationModal = false;
                this.itemToDelete = null;
            }
        },

        //======================================================================
        //  IMPROVED ANALYSIS METHODS WITH FALLBACK
        //======================================================================

        async startAnalysis() {
            if (this.isLoading || !this.businessIdea.trim()) return;
            
            this.isLoading = true;
            this.error = null;
            this.liveLog = [];
            this.rawMarkdown = '';
            this.chatHistory = [];

            // Try streaming first, fallback to sync if it fails
            const streamingWorked = await this.tryStreamingAnalysis();
            if (!streamingWorked) {
                await this.fallbackSyncAnalysis();
            }
        },

        async tryStreamingAnalysis() {
            try {
                console.log('Attempting streaming analysis...');
                
                const response = await fetch(`${API_BASE_URL}/analyze-idea-stream`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.authToken}`,
                        'Accept': 'text/event-stream',
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
                    throw new Error('Response body is null');
                }

                // Create EventSource-like behavior with fetch stream
                const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
                let streamActive = true;
                
                this.currentStream = {
                    close: () => {
                        streamActive = false;
                        reader.cancel();
                    }
                };

                while (streamActive) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    const lines = value.split('\n\n');
                    for (const line of lines) {
                        if (line.startsWith('data:') && streamActive) {
                            const jsonData = line.substring(5).trim();
                            if (jsonData === '') continue;

                            try {
                                const data = JSON.parse(jsonData);
                                await this.handleStreamData(data);
                            } catch (parseError) {
                                console.warn('Failed to parse stream data:', parseError, jsonData);
                            }
                        }
                    }
                }
                
                this.currentStream = null;
                return true; // Streaming succeeded
                
            } catch (err) {
                console.warn('Streaming failed:', err);
                this.currentStream = null;
                return false; // Streaming failed
            }
        },

        async handleStreamData(data) {
            switch (data.type) {
                case 'connection_started':
                    console.log('Stream connection established');
                    break;
                    
                case 'agent_start':
                    this.liveLog.push({ 
                        id: Date.now(), 
                        agent: data.agent, 
                        status: 'thinking',
                        message: data.message || 'Processing...'
                    });
                    break;
                    
                case 'agent_end':
                    const log = this.liveLog.find(l => l.agent === data.agent);
                    if (log) {
                        log.status = 'done';
                        log.message = data.message || 'Completed';
                    }
                    break;
                    
                case 'final_result':
                    this.rawMarkdown = data.result;
                    this.isLoading = false;
                    this.fetchHistory();
                    this.showNotification('Analysis completed successfully!');
                    break;
                    
                case 'stream_complete':
                    console.log('Stream completed successfully');
                    break;
                    
                case 'stream_cancelled':
                    console.log('Stream was cancelled');
                    break;
                    
                case 'error':
                    throw new Error(data.message || 'Stream error occurred');
                    
                default:
                    console.log('Unknown stream data type:', data.type);
            }
        },

        async fallbackSyncAnalysis() {
            try {
                console.log('Falling back to synchronous analysis...');
                this.showNotification('Using alternative analysis method...', 'info');
                
                // Clear streaming logs and show sync message
                this.liveLog = [{ 
                    id: Date.now(), 
                    agent: 'System', 
                    status: 'thinking',
                    message: 'Processing analysis (this may take a few minutes)...'
                }];

                const response = await fetch(`${API_BASE_URL}/analyze-idea-sync`, {
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

                // Update log to show completion
                this.liveLog[0].status = 'done';
                this.liveLog[0].message = 'Analysis completed successfully';

                this.rawMarkdown = data.result;
                this.fetchHistory();
                this.showNotification('Analysis completed successfully!');
                
            } catch (err) {
                this.error = `Analysis failed: ${err.message}`;
                this.showNotification(this.error, 'error');
            } finally {
                this.isLoading = false;
            }
        },

        //======================================================================
        //  OTHER API METHODS (UNCHANGED)
        //======================================================================

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
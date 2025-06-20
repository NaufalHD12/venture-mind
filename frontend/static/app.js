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
                
                // (PERBAIKAN UX) Periksa apakah item yang dihapus sedang ditampilkan
                const deletedAnalysis = this.analysisHistory.find(item => item.id === this.itemToDelete);
                
                // Hapus item dari daftar riwayat
                this.analysisHistory = this.analysisHistory.filter(item => item.id !== this.itemToDelete);
                
                // Jika item yang dihapus sedang aktif, bersihkan tampilan utama
                if (deletedAnalysis && this.businessIdea === deletedAnalysis.idea_prompt) {
                    this.rawMarkdown = '';
                    this.businessIdea = '';
                    this.chatHistory = [];
                }

                this.showNotification('Analysis deleted successfully.');
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

            try {
                const response = await fetch(`${API_BASE_URL}/analyze-idea-stream`, {
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

                if (!response.body) throw new Error('Response body is null.');

                const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    const lines = value.split('\n\n');
                    for (const line of lines) {
                        if (line.startsWith(':')) { // Handle heartbeats
                            console.log('Heartbeat received.');
                            continue;
                        }

                        if (line.startsWith('data:')) {
                            const jsonData = line.substring(5);
                            if (jsonData.trim() === '') continue;

                            const data = JSON.parse(jsonData);

                            // (PERBAIKAN UX) Logika baru untuk menangani progres dan potongan laporan
                            switch (data.type) {
                                case 'agent_start':
                                    this.liveLog.push({ id: Date.now(), agent: data.agent, status: 'thinking' });
                                    break;
                                case 'agent_end':
                                    const log = this.liveLog.find(l => l.agent === data.agent);
                                    if (log) log.status = 'done';
                                    break;
                                case 'report_chunk':
                                    // Rakit kembali laporan dari potongan-potongan
                                    this.rawMarkdown += data.chunk;
                                    break;
                                case 'completed':
                                    // Proses selesai, hentikan loading dan refresh riwayat
                                    this.isLoading = false;
                                    this.fetchHistory();
                                    this.showNotification(data.message);
                                    break;
                                case 'error':
                                    throw new Error(data.message);
                            }
                        }
                    }
                }
            } catch (err) {
                this.error = `Analysis failed: ${err.message}.`;
                this.isLoading = false;
                this.showNotification(this.error, 'error');
            }
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

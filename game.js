document.addEventListener('DOMContentLoaded', () => {

    const translations = {
        en: {
            // Session Screen
            newGame: "New Game",
            connectGame: "Connect to Existing Game",
            followMe: "follow me",
            version: "ver. 1.1.2",

            // Start Screen
            truthOr: "Truth or",
            drink: "Drink",
            players: "Players",
            categories: "Categories",
            party: "Party",
            everyone: "Everyone",
            couple: "Couple",
            sex: "Sex",
            trash: "Trash",
            personal: "Personal",
            maybeLater: "Maybe later",
            start: "Start",
            back: "Back",

            // Connect Screen
            enterRoomId: "Enter Room ID",
            ok: "OK",
            invalidRoomId: "Invalid Room ID",

            // Game Screen
            sessionId: "Session ID: ",
            questionPlaceholder: "Question will appear here",
            done: "Done",
            tellEverything: "Tell everything!",
            pass: "Pass",
            drinkAndLeave: "Drink and leave the question for someone else!",
            truth: "Truth",
            dareRegButton: "Dare",

            // End Screen
            allQuestionsDone: "All Questions Done!",
            backToMenu: "Back to Menu"
        },
        ru: {
            // Session Screen
            newGame: "Новая игра",
            connectGame: "Подключиться к сессии",
            followMe: "социал0чка",
            version: "ver. 1.1.2",

            // Start Screen
            truthOr: "Правда или",
            drink: "Выпивка",
            maybeLater: "Позже",
          
            players: "Игроки",
            categories: "Категории",
            party: "Для компании",
            couple: "Для парочек",
            everyone: "Для всех",
            sex: "Секс",
            trash: "Трэш",
            personal: "Личное",

            start: "Начать",
            back: "Назад",

            // Connect Screen
            enterRoomId: "Введите ID сессии",
            ok: "ОК",
            invalidRoomId: "Неверный ID сессии",

            // Game Screen
            sessionId: "ID сессии: ",
            questionPlaceholder: "Здесь появится вопрос",
            done: "Сделано!",
            tellEverything: "Расскажи всё!",
            pass: "Пас!",
            drinkAndLeave: "Выпей и оставь вопрос другому!",
            truth: "Правда",
            dareRegButton: "Действие",

            // End Screen
            allQuestionsDone: "Вопросы закончились!",
            backToMenu: "В меню"
        }
    };
    const screens = document.querySelectorAll('.screen');
    const logContainer = document.getElementById('log-container');
    const roomIdInput = document.getElementById('room-id-input');
    const connectButton = document.getElementById('connect-button');
    const errorMessage = document.getElementById('error-message');
    const sessionIdDisplay = document.getElementById('session-id-display'); // Get the session ID display element
    const exitSessionLink = document.getElementById('exit-session-link');

    // Initialize Supabase client
    const supabaseUrl = 'https://ylrbjiciudweqmfnzghc.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlscmJqaWNpdWR3ZXFtZm56Z2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTQ4MDksImV4cCI6MjA2NTY5MDgwOX0.eR-eSeTZR8ZUBC21zIjqDYX0fez6whLsduFNEVr7vYo'
    const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
  
    if (exitSessionLink) {
        exitSessionLink.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent the default anchor behavior
            console.log('Exit Session button clicked');
            showScreen('session-screen'); // Assuming you want to navigate back to the session screen
        });
    }
  
    let selectedCategories = [];
    let selectedGameMode = null;
    let selectedPlayers = null;
    let sessionId = null;
    let questionsRemaining = 0;
    let currentLanguage = 'en';
    let currentChannel = null;

    // ADD this new function anywhere in your script
    async function resetGameState() {
        logToPage('Resetting game state...');
        
        // Unsubscribe from the current Supabase channel if it exists
        if (currentChannel) {
            try {
                await supabaseClient.removeChannel(currentChannel);
                logToPage('Successfully unsubscribed from channel.');
            } catch (error) {
                logToPage(`Error unsubscribing from channel: ${error.message}`);
            }
            currentChannel = null;
        }

        // Reset all global state variables
        sessionId = null;
        selectedGameMode = null;
        selectedPlayers = null;
        selectedCategories = [];
        questionsRemaining = 0;

        // Reset relevant UI elements
        if (sessionIdDisplay) {
            sessionIdDisplay.textContent = translations[currentLanguage].sessionId;
        }
        const questionTextElement = document.getElementById('question-text');
        if (questionTextElement) {
            questionTextElement.textContent = translations[currentLanguage].questionPlaceholder;
        }
        logToPage('Game state has been reset.');
    }


    // Subscribe to Supabase realtime changes for the session
    async function subscribeToSessionChanges(sessionId) {
        // If a channel is already open, remove it first
        if (currentChannel) {
            await supabaseClient.removeChannel(currentChannel);
        }

        // Create, store, and subscribe to the new channel
        const channel = supabaseClient
            .channel(`session_${sessionId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'truth_sessions',
                filter: `s_id=eq.${sessionId}`
            }, (payload) => {
                handleSessionUpdate(payload.new);
            })
            .subscribe();
        
        currentChannel = channel; // Store the active channel
        logToPage('Subscribed to session changes');
    }

    function handleSessionUpdate(sessionData) {
        if (sessionData.current_question) {
            updateQuestionUI(sessionData.current_question);
            enableButtons();
        }
        if (sessionData.q_done && sessionData.q_done.length === 0) {
            endGame();
        }
    }

    function updateLanguage(lang) {
        currentLanguage = lang;

        // Update all translatable elements
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[lang][key]) {
                element.textContent = translations[lang][key];
            }
        });

        // Special cases for elements with complex content
        const todDoneButton = document.getElementById('tod-done-button');
        if (todDoneButton) {
            todDoneButton.querySelector('.main-text').textContent = translations[lang].done;
            todDoneButton.querySelector('.hint-text').textContent = translations[lang].tellEverything;
        }

        const todPassButton = document.getElementById('tod-pass-button');
        if (todPassButton) {
            todPassButton.querySelector('.main-text').textContent = translations[lang].pass;
            todPassButton.querySelector('.hint-text').textContent = translations[lang].drinkAndLeave;
        }

        // Update session ID display prefix
        if (sessionIdDisplay && sessionId) {
            sessionIdDisplay.textContent = translations[lang].sessionId + sessionId;
        }

        // Update language toggle UI
        document.getElementById('en-lang').classList.toggle('selected', lang === 'en');
        document.getElementById('ru-lang').classList.toggle('selected', lang === 'ru');

        // Update HTML lang attribute
        document.documentElement.lang = lang;

        // Save language preference
        localStorage.setItem('gameLanguage', lang);

        // Update session language in Supabase if we're in a game
        if (sessionId) {
            updateSessionLanguage(sessionId, lang);
        }
    }

    async function updateSessionLanguage(sessionId, language) {
        try {
            const { error } = await supabaseClient
                .from('truth_sessions')
                .update({ language })
                .eq('s_id', sessionId);

            if (error) throw error;
            logToPage(`Session language updated to: ${language}`);
        } catch (error) {
            logToPage(`Failed to update session language: ${error.message}`);
        }
    }

    // Language toggle functionality
    document.getElementById('language-toggle-button').addEventListener('click', async (e) => {
        e.stopPropagation();
        const newLanguage = currentLanguage === 'en' ? 'ru' : 'en';

        // Optimistic UI update for buttons/menu
        updateLanguage(newLanguage);

        if (sessionId) {
            try {
                // Update session language
                await updateSessionLanguage(sessionId, newLanguage);

                // Get translated question if in game screen
                if (document.getElementById('game-screen').style.display !== 'none') {
                    const { data: sessionData, error: sessionError } = await supabaseClient
                        .from('truth_sessions')
                        .select('current_question')
                        .eq('s_id', sessionId)
                        .single();

                    if (sessionError) throw sessionError;

                    if (sessionData.current_question) {
                        const { data: questionData, error: questionError } = await supabaseClient
                            .from('truth_questions')
                            .select(newLanguage === 'en' ? 'question' : 'ru_question')
                            .eq('q_id', sessionData.current_question)
                            .single();

                        if (questionError) throw questionError;

                        const translatedQuestion = newLanguage === 'en' ? 
                            questionData.question : 
                            questionData.ru_question;

                        updateQuestionUI(translatedQuestion);
                    }
                }
            } catch (error) {
                updateLanguage(currentLanguage); // Revert on failure
                logToPage(`Language change failed: ${error.message}`);
                showError('Translation failed. Please try again.');
            }
        }
    }); 

    function validateRoomId() {
        const roomId = roomIdInput.value.trim();
        const isValid = /^[a-zA-Z0-9]{4}$/.test(roomId);

        // Toggle the disabled state and the 'enabled' class
        connectButton.disabled = !isValid;

        if (isValid) {
            connectButton.classList.add('enabled');  // Add the 'enabled' class if valid
        } else {
            connectButton.classList.remove('enabled');  // Remove the 'enabled' class if not valid
        }
    }


    roomIdInput.addEventListener('input', validateRoomId);
    validateRoomId();

    connectButton.addEventListener('click', async () => {
        if (!connectButton.disabled) {
            const roomId = roomIdInput.value.trim().toUpperCase();
            logToPage(`Connect button clicked with Room ID: ${roomId}`);

            try {
                // Check if session exists in Supabase
                const { data: sessionData, error } = await supabaseClient
                    .from('truth_sessions')
                    .select('*')
                    .eq('s_id', roomId)
                    .single();

                if (error) throw error;

                if (sessionData) {
                    sessionId = roomId;
                    selectedGameMode = sessionData.game_mode;
                    selectedPlayers = sessionData.players;
                    selectedCategories = sessionData.categories.split(',');
                    currentLanguage = sessionData.language || 'en';

                    // Subscribe to realtime updates
                    await subscribeToSessionChanges(sessionId);

                    // Update UI
                    sessionIdDisplay.textContent = `Session ID: ${sessionId}`;
                    document.getElementById('en-lang').classList.toggle('selected', currentLanguage === 'en');
                    document.getElementById('ru-lang').classList.toggle('selected', currentLanguage === 'ru');

                    showScreen('game-screen');

                    if (sessionData.current_question) {
                        const { data: questionData, error: questionError } = await supabaseClient
                            .from('truth_questions')
                            .select(currentLanguage === 'en' ? 'question' : 'ru_question')
                            .eq('q_id', sessionData.current_question)
                            .single();

                        if (!questionError && questionData) {
                            updateQuestionUI(currentLanguage === 'en' ? 
                                questionData.question : 
                                questionData.ru_question);
                        }
                    }

                    showButtonsBasedOnGameMode();
                } else {
                    showError('There is no such room');
                    logToPage('Room does not exist: ' + roomId);
                }
            } catch (error) {
                showError('Failed to check room ID. Please try again.');
                logToPage('Error checking room ID: ' + error.message);
            }
        }
    });

    // Event listener for Suggest Question button
    const suggestButton = document.getElementById('suggest-button-game');
    if (suggestButton) {
        suggestButton.addEventListener('click', () => {
            window.open('https://forms.gle/Hk9qqeWhcwsRxGDXA', '_blank');
        });
    }

    // Event listener for Report a Problem button
    const reportButton = document.getElementById('report-button-game');
    if (reportButton) {
        reportButton.addEventListener('click', () => {
            window.open('https://forms.gle/yBebcqYvRCgASLgaA', '_blank');
        });
    }

    async function fetchNextQuestion(addToExclusions = false, forceRefresh = false) {
        if (!sessionId) {
            logToPage('No session ID for question fetch');
            return;
        }

        try {
            // Get current session data
            const { data: sessionData, error: sessionError } = await supabaseClient
                .from('truth_sessions')
                .select('q_done, categories, game_mode')
                .eq('s_id', sessionId)
                .single();

            if (sessionError) throw sessionError;

            // Parse categories and excluded questions
            const categories = sessionData.categories.split(',');
            const excludedQuestions = sessionData.q_done ? sessionData.q_done.split(',').filter(id => id) : [];
            logToPage(`Current excluded questions: ${JSON.stringify(excludedQuestions)}`);

            // Build query for next question
            let query = supabaseClient
                .from('truth_questions')
                .select('q_id, question, ru_question');
            
            // Only add NOT IN clause if there are excluded questions
            if (excludedQuestions.length > 0) {
                query = query.not('q_id', 'in', `(${excludedQuestions.join(',')})`);
            }

            // Add category filters
            const categoryConditions = categories.map(cat => `${cat}.eq.1`);
            if (sessionData.game_mode === 'truth-or-dare') {
                categoryConditions.push('truth.eq.1');
                categoryConditions.push('dare.eq.1');
            }
            query = query.or(categoryConditions.join(','));

            logToPage('Executing query with conditions: ' + categoryConditions.join(','));

            // Get all matching questions
            const { data: questions, error: questionsError } = await query;

            if (questionsError) {
                logToPage('Question fetch error: ' + JSON.stringify(questionsError));
                throw questionsError;
            }

            logToPage(`Got ${questions ? questions.length : 0} questions`);

            if (questions && questions.length > 0) {
                // Select a random question from the results
                const randomIndex = Math.floor(Math.random() * questions.length);
                const question = questions[randomIndex];
                const questionText = currentLanguage === 'en' ? question.question : question.ru_question;

                // Update session with new question
                const newExcludedQuestions = addToExclusions ? 
                    (excludedQuestions.length > 0 ? 
                        excludedQuestions.concat(question.q_id).join(',') : 
                        question.q_id.toString()) : 
                    (excludedQuestions.length > 0 ? 
                        excludedQuestions.join(',') : 
                        '');

                const { error: updateError } = await supabaseClient
                    .from('truth_sessions')
                    .update({ 
                        current_question: question.q_id,
                        q_done: newExcludedQuestions
                    })
                    .eq('s_id', sessionId);

                if (updateError) {
                    logToPage('Session update error: ' + JSON.stringify(updateError));
                    throw updateError;
                }

                updateQuestionUI(questionText);
            } else {
                logToPage('No questions found matching criteria');
                endGame();
            }
        } catch (error) {
            logToPage('Fetch question error: ' + error.message);
            showError('Failed to get next question');
        }
    }
  
    function updateQuestionUI(question) {
        const questionTextElement = document.getElementById('question-text');
        if (questionTextElement) {
            logToPage("Updating question element content");
            questionTextElement.textContent = question;
            logToPage("Updated question element content: " + questionTextElement.textContent);
            showButtonsBasedOnGameMode();
        } else {
            logToPage("Question text element not found!");
        }
    }

    function showError(message) {
        const errorMessageElement = document.getElementById('error-message');
        if (errorMessageElement) {
            errorMessageElement.textContent = message;
            errorMessageElement.classList.remove('hidden');
            logToPage(`Error displayed: ${message}`);
            setTimeout(() => {
                errorMessageElement.classList.add('hidden');
                logToPage('Error message hidden.');
            }, 3000);
        } else {
            logToPage('Error message element not found.');
        }
    }
    
    function updateStartButtonState() {
        const startButton = document.getElementById('start-button');
        const hasGameMode = !!selectedGameMode;
        const hasPlayers = !!selectedPlayers;
        const hasCategories = selectedCategories.length > 0;

        logToPage(`Checking start button state: gameMode=${hasGameMode}, players=${hasPlayers}, categories=${hasCategories}`);

        if (hasGameMode && hasPlayers && hasCategories) {
            startButton.disabled = false;
            startButton.classList.add('enabled'); // Add the enabled class for the pink gradient and pulsating effect
            logToPage('Start button enabled');
        } else {
            startButton.disabled = true;
            startButton.classList.remove('enabled'); // Remove the enabled class to revert to gray
            logToPage('Start button disabled');
        }
    }

    function logToPage(message) {
        const logMessage = document.createElement('p');
        logMessage.textContent = message;
        logContainer.appendChild(logMessage);

        if (logContainer.childElementCount > 30) {
            logContainer.removeChild(logContainer.firstChild);
        }

        logContainer.scrollTop = logContainer.scrollHeight;
    }

    function sendQuestionUpdated(question) {
        if (sessionId) {
            logToPage(`Question updated: ${question}`);
        } else {
            logToPage('Error: sessionId is undefined when attempting to update question');
        }
    }

    function hideAllScreens() {
        screens.forEach(screen => {
            screen.style.display = 'none';
            logToPage(`Hiding screen: ${screen.id}`);
        });
    }

    function showScreen(screenId) {
        hideAllScreens();
        const activeScreen = document.getElementById(screenId);
        if (activeScreen) {
            activeScreen.style.display = 'block';
            logToPage(`Showing screen: ${screenId}`);
        } else {
            logToPage(`Screen not found: ${screenId}`);
        }
    }

    async function startSession() {
        logToPage('Starting a new game session...');
        logToPage(`Categories: ${selectedCategories.join(',')}, Language: ${currentLanguage}`);

        try {
            // Generate a random 4-character session ID
            sessionId = Math.random().toString(36).substring(2, 6).toUpperCase();

            // Create new session in Supabase
            const { error: sessionError } = await supabaseClient
                .from('truth_sessions')
                .insert({
                    s_id: sessionId,
                    game_mode: selectedGameMode,
                    players: selectedPlayers,
                    categories: selectedCategories.join(','),
                    language: currentLanguage,
                    q_done: '',  // Initialize as empty string instead of array
                    current_question: null,
                    timestamp: new Date().toISOString()
                });

            if (sessionError) {
                logToPage(`Session creation error: ${JSON.stringify(sessionError)}`);
                throw sessionError;
            }

            // Subscribe to realtime updates
            await subscribeToSessionChanges(sessionId);

            // Update UI
            document.getElementById('session-id-display').textContent = `Session ID: ${sessionId}`;
            logToPage(`Session created: ${sessionId}`);

            // Fetch first question
            await fetchNextQuestion();

        } catch (error) {
            logToPage(`Session creation failed: ${error.message}`);
            showError(error.message || 'Failed to start game');
            endGame();
        }
    }

    function endGame() {
        logToPage('Game over. All questions answered.');
        showScreen('end-screen');
    }

    function disableButtons() {
        document.getElementById('tod-done-button').disabled = true;
        document.getElementById('tod-pass-button').disabled = true;
        document.getElementById('tord-done-button').disabled = true;
        document.getElementById('tord-pass-button').disabled = true;
        logToPage('Action buttons disabled');
    }

    function enableButtons() {
        document.getElementById('tod-done-button').disabled = false;
        document.getElementById('tod-pass-button').disabled = false;
        document.getElementById('tord-done-button').disabled = false;
        document.getElementById('tord-pass-button').disabled = false;
        logToPage('Action buttons enabled');
    }

    function showButtonsBasedOnGameMode() {
        const truthOrDrinkButtons = document.getElementById('truth-or-drink-buttons');
        const truthOrDareButtons = document.getElementById('truth-or-dare-buttons');

        truthOrDrinkButtons.classList.add('hidden');
        truthOrDareButtons.classList.add('hidden');

        if (selectedGameMode === 'truth-or-drink') {
            truthOrDrinkButtons.classList.remove('hidden');
        } else if (selectedGameMode === 'truth-or-dare') {
            truthOrDareButtons.classList.remove('hidden');
        }
    }

    function attachSingleChoiceListeners() {
        const gameModeButtons = document.querySelectorAll('.single-choice.game-mode .choice-button');
        const playerCountButtons = document.querySelectorAll('.single-choice.player-count .choice-button');

        gameModeButtons.forEach(button => {
            button.addEventListener('click', () => {
                logToPage(`Game mode button clicked: ${button.textContent}`);
                gameModeButtons.forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                selectedGameMode = button.getAttribute('data-choice');
                updateStartButtonState();
            });
        });

        playerCountButtons.forEach(button => {
            button.addEventListener('click', () => {
                logToPage(`Player count button clicked: ${button.textContent}`);
                playerCountButtons.forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                selectedPlayers = button.getAttribute('data-choice');
                updateStartButtonState();
            });
        });
    }

    function attachMultipleChoiceListeners() {
        const multipleChoiceButtons = document.querySelectorAll('.multiple-choice .choice-button');

        multipleChoiceButtons.forEach(button => {
            button.replaceWith(button.cloneNode(true));
        });

        const updatedButtons = document.querySelectorAll('.multiple-choice .choice-button');

        updatedButtons.forEach(button => {
            button.addEventListener('click', () => {
                const choice = button.getAttribute('data-choice');
                logToPage(`Multiple choice button clicked: ${choice}`);

                if (!choice) {
                    logToPage('Error: data-choice attribute is missing.');
                    return;
                }

                if (selectedCategories.includes(choice)) {
                    selectedCategories = selectedCategories.filter(category => category !== choice);
                    button.classList.remove('selected');
                    logToPage('Category removed from selection.');
                } else {
                    selectedCategories.push(choice);
                    button.classList.add('selected');
                    logToPage('Category added to selection.');
                }

                logToPage(`Updated selected categories: ${selectedCategories.join(', ')}`);

                updateStartButtonState();
            });
        });
    }

    function updateStartButtonState() {
        const startButton = document.getElementById('start-button');
        const hasGameMode = !!selectedGameMode;
        const hasPlayers = !!selectedPlayers;
        const hasCategories = selectedCategories.length > 0;

        logToPage(`Checking start button state: gameMode=${hasGameMode}, players=${hasPlayers}, categories=${hasCategories}`);

        if (hasGameMode && hasPlayers && hasCategories) {
            startButton.disabled = false;
            startButton.classList.add('enabled');
            logToPage('Start button enabled');
        } else {
            startButton.disabled = true;
            startButton.classList.remove('enabled');
            logToPage('Start button disabled');
        }
    }

    document.getElementById('start-button').addEventListener('click', () => {
        const startButton = document.getElementById('start-button');
        if (startButton.disabled) return;

        logToPage('Start button clicked');
        showScreen('game-screen');
        startSession();
    });

    document.getElementById('tod-done-button').addEventListener('click', () => {
        logToPage('TOD Done button clicked');
        fetchNextQuestion(true);
    });

    document.getElementById('tod-pass-button').addEventListener('click', () => {
        logToPage('TOD Pass button clicked');
        fetchNextQuestion(false);
    });

    document.getElementById('tord-done-button').addEventListener('click', () => {
        logToPage('TORD Done button clicked');
        fetchNextQuestion(true);
    });

    document.getElementById('tord-pass-button').addEventListener('click', () => {
        logToPage('TORD Pass button clicked');
        fetchNextQuestion(false);
    });

    document.getElementById('new-game-button').addEventListener('click', () => {
        logToPage('New Game button clicked');
        showScreen('start-screen');
        attachSingleChoiceListeners();
        attachMultipleChoiceListeners();
    });

    document.getElementById('connect-game-button').addEventListener('click', () => {
        logToPage('Connect button clicked');
        showScreen('connect-screen');
    });

    document.getElementById('back-button').addEventListener('click', async () => {
        logToPage('Back button clicked');
        await resetGameState(); // Reset state
        showScreen('session-screen');
    });

    document.getElementById('back-to-menu-button').addEventListener('click', async () => {
        logToPage('Back to Menu button clicked');
        await resetGameState(); // Reset state
        showScreen('session-screen');
    });

    document.getElementById('back-to-session-button').addEventListener('click', () => {
        logToPage('Back to Session button clicked');
        showScreen('session-screen');
    });

    if (exitSessionLink) {
        exitSessionLink.addEventListener('click', async (e) => { // Make the handler async
            e.preventDefault();
            console.log('Exit Session button clicked');
            await resetGameState(); // Reset state
            showScreen('session-screen');
        });
    }
  
    // Load saved language preference
    const savedLanguage = localStorage.getItem('gameLanguage') || 'en';
    updateLanguage(savedLanguage);

    hideAllScreens();
    showScreen('session-screen'); // Modified code for development

    attachSingleChoiceListeners();
    attachMultipleChoiceListeners();
});

// ============================================
// 🤖 Project Stark - Telegram Team Assistant
// ============================================
// A Telegram bot powered by Claude AI that serves
// as the team assistant for the Fysio Assistent project.
//
// Features:
// - Full project context awareness
// - Conversation memory (persists to file)
// - To-do list management
// - Responds when tagged (@botname) or in private chat
// ============================================

const TelegramBot = require('node-telegram-bot-api');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION - Fill in your tokens here
// ============================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_API_KEY';
const BOT_USERNAME = process.env.BOT_USERNAME || 'stark_assistant_bot'; // without @

// ============================================
// FILE PATHS FOR PERSISTENT STORAGE
// ============================================
const DATA_DIR = path.join(__dirname, 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'memory.json');
const TODOS_FILE = path.join(DATA_DIR, 'todos.json');
const CONVERSATION_FILE = path.join(DATA_DIR, 'conversations.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================
// PERSISTENT STORAGE HELPERS
// ============================================
function loadJSON(filepath, defaultValue = {}) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error loading ${filepath}:`, e.message);
  }
  return defaultValue;
}

function saveJSON(filepath, data) {
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Error saving ${filepath}:`, e.message);
  }
}

// ============================================
// STATE
// ============================================
let conversations = loadJSON(CONVERSATION_FILE, {}); // chatId -> messages[]
let todos = loadJSON(TODOS_FILE, {}); // chatId -> todo[]
let memory = loadJSON(MEMORY_FILE, {}); // chatId -> key facts[]

// ============================================
// PROJECT CONTEXT - This is what makes the bot smart
// ============================================
const PROJECT_CONTEXT = `
# Project Stark - Fysio Assistent

## Wat is het?
Fysio Assistent is een premium AI-powered SaaS platform voor Nederlandse fysiotherapeuten. 
Het biedt een 7-stappen behandelflow met AI-begeleiding en 6 standalone AI-tools.

## Core Value Proposition
Fysiotherapeuten helpen betere, evidence-based behandelplannen te maken. 
AI assisteert maar vervangt NOOIT - de therapeut houdt altijd de controle.

## Tech Stack
- Frontend: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- Backend: Next.js API Routes, Prisma ORM
- Database: SQLite (dev) → Supabase PostgreSQL (prod)
- Auth: Supabase Auth
- AI: Anthropic Claude API (claude-sonnet-4-5-20250929), Server-Sent Events streaming
- Deployment: Vercel
- Version Control: Git + GitHub

## De 7-Stappen Behandelflow
1. Nieuw Traject - Patient selecteren, klacht invoeren
2. Screening - AI genereert screeningsvragen, red flags detectie
3. Anamnese - AI-begeleide anamnese met follow-up vragen
4. Samenvatting - AI maakt gestructureerde samenvatting
5. Tussentijdse Hypothese - AI genereert differentiaal diagnose
6. Definitieve Hypothese - Verfijnde hypothese na lichamelijk onderzoek
7. Behandeltraject - Compleet behandelplan met SMART doelen

## 6 Standalone Tools
1. Screening (standalone)
2. Anamnese (standalone)
3. Hypothese (standalone)
4. Lichamelijk Onderzoek
5. Behandelplan
6. Behandeling

## Design Principes
- Premium, futuristisch design (Apple/Framer/OnAssemble aesthetic)
- Glassmorphism, smooth animaties (60fps)
- Dark/light mode
- Desktop-first, mobile-responsive
- Alle UI tekst in het Nederlands

## Key Features
- Patient Management System (CRUD, zoeken, exporteren)
- AI Thinking Visualization (stappen tonen wat AI doet)
- Thumbs up/down feedback systeem
- Cinematografische intro bij elke login
- GDPR/AVG compliant (NEN 7510, ISO 27001)
- Row-Level Security op database niveau

## Database Models
- User (email, naam, praktijk, theme, onboarding)
- Patient (naam, geboortedatum, geslacht, contact, medische info)
- Trajectory (patient, klacht, status, startdatum)
- FlowStep (trajectory, stepName, stepData, aiOutput, completed)
- StandaloneTool (user, toolType, input, output)
- AuditLog (user, actie, details)

## Timeline
- Maand 1: Foundation (auth, patient management, eerste AI features, eerste 3 stappen)
- Maand 2: Complete flow, standalone tools, design polish
- Maand 3: Security, testing, beta, launch

## Doelgroep
Nederlandse fysiotherapeuten (25-55 jaar), zowel ZZP als groepspraktijken.
Tech-savviness: laag tot gemiddeld. Alle specialisaties.

## Concurrentie
Er is GEEN premium AI-assistent platform voor fysiotherapeuten in Nederland.
Bestaande EPD systemen zijn traditioneel en administratief-gericht zonder AI.
Dit is een first-mover opportunity.

## Business Model
Premium SaaS - abonnementsmodel (pricing nog te bepalen).
`;

// ============================================
// SYSTEM PROMPT
// ============================================
function buildSystemPrompt(chatId) {
  const chatTodos = todos[chatId] || [];
  const chatMemory = memory[chatId] || [];
  
  const todoSection = chatTodos.length > 0 
    ? `\n## Huidige To-Do Lijst\n${chatTodos.map((t, i) => `${i + 1}. [${t.done ? '✅' : '⬜'}] ${t.text} (toegevoegd door ${t.addedBy} op ${t.date})`).join('\n')}`
    : '\n## Huidige To-Do Lijst\nGeen taken op dit moment.';

  const memorySection = chatMemory.length > 0
    ? `\n## Belangrijke Notities & Besluiten\n${chatMemory.map(m => `- ${m}`).join('\n')}`
    : '';

  return `Je bent Stark, de AI team-assistent voor Project Stark (Fysio Assistent). 
Je werkt als een slim, betrokken teamlid dat meedenkt over het project.

## Jouw Rol
- Je bent een meedenkende assistent, geen passieve vraag-beantwoorder
- Je kent het project door en door (zie projectcontext hieronder)
- Je houdt to-do lijsten bij en herinnert het team aan taken
- Je onthoudt belangrijke besluiten en gesprekken
- Je geeft proactief advies en suggesties
- Je bent direct, eerlijk, en pragmatisch
- Je communiceert in het Nederlands (tenzij anders gevraagd)

## Communicatiestijl
- Informeel maar professioneel - je bent een teamlid, geen robot
- Kort en bondig - geen lange lappen tekst tenzij nodig
- Gebruik emoji's spaarzaam maar effectief
- Als je iets niet weet, zeg dat eerlijk
- Denk mee en stel vragen als iets onduidelijk is

## To-Do Commando's
Als iemand een taak wil toevoegen, verwijderen of afvinken, doe dit dan en bevestig.
Formaat voor taken: gewoon in natuurlijke taal, jij parsed het.
Als iemand vraagt om de to-do lijst te tonen, toon deze netjes.

## Geheugen
Als er belangrijke besluiten worden genomen of informatie wordt gedeeld die later relevant is,
sla dit op door [ONTHOUD: ...] aan het einde van je bericht toe te voegen.
Het team ziet dit niet - het is voor jouw eigen geheugen.

${PROJECT_CONTEXT}
${todoSection}
${memorySection}
`;
}

// ============================================
// ANTHROPIC CLIENT
// ============================================
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

async function askClaude(chatId, userMessage, userName) {
  // Get or initialize conversation history
  if (!conversations[chatId]) {
    conversations[chatId] = [];
  }

  // Add user message to history
  conversations[chatId].push({
    role: 'user',
    content: `[${userName}]: ${userMessage}`
  });

  // Keep last 50 messages for context (to stay within token limits)
  if (conversations[chatId].length > 50) {
    conversations[chatId] = conversations[chatId].slice(-50);
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: buildSystemPrompt(chatId),
      messages: conversations[chatId]
    });

    const assistantMessage = response.content[0].text;

    // Add assistant response to history
    conversations[chatId].push({
      role: 'assistant',
      content: assistantMessage
    });

    // Save conversation
    saveJSON(CONVERSATION_FILE, conversations);

    // Check for memory markers
    const memoryMatch = assistantMessage.match(/\[ONTHOUD: (.+?)\]/g);
    if (memoryMatch) {
      if (!memory[chatId]) memory[chatId] = [];
      memoryMatch.forEach(m => {
        const fact = m.replace('[ONTHOUD: ', '').replace(']', '');
        memory[chatId].push(fact);
      });
      saveJSON(MEMORY_FILE, memory);
    }

    // Process todo commands from the AI response
    processTodoActions(chatId, assistantMessage);

    // Clean the response (remove memory markers before sending)
    const cleanResponse = assistantMessage.replace(/\[ONTHOUD: .+?\]/g, '').trim();

    return cleanResponse;
  } catch (error) {
    console.error('Claude API error:', error.message);
    return '⚠️ Er ging iets mis met de AI. Probeer het opnieuw.';
  }
}

// ============================================
// TODO MANAGEMENT
// ============================================
function processTodoActions(chatId, message) {
  // This is handled naturally by the AI through conversation
  // The AI will modify todos through explicit commands
  saveJSON(TODOS_FILE, todos);
}

function addTodo(chatId, text, addedBy) {
  if (!todos[chatId]) todos[chatId] = [];
  todos[chatId].push({
    text,
    done: false,
    addedBy,
    date: new Date().toLocaleDateString('nl-NL')
  });
  saveJSON(TODOS_FILE, todos);
}

function completeTodo(chatId, index) {
  if (todos[chatId] && todos[chatId][index]) {
    todos[chatId][index].done = true;
    saveJSON(TODOS_FILE, todos);
    return true;
  }
  return false;
}

function removeTodo(chatId, index) {
  if (todos[chatId] && todos[chatId][index]) {
    todos[chatId].splice(index, 1);
    saveJSON(TODOS_FILE, todos);
    return true;
  }
  return false;
}

function getTodoList(chatId) {
  const list = todos[chatId] || [];
  if (list.length === 0) return '📋 Geen taken op de lijst!';
  return '📋 *To-Do Lijst:*\n' + list.map((t, i) => 
    `${i + 1}. ${t.done ? '✅' : '⬜'} ${t.text} _(${t.addedBy}, ${t.date})_`
  ).join('\n');
}

// ============================================
// TELEGRAM BOT
// ============================================
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('🤖 Stark Bot is online!');

// Handle messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const userName = msg.from.first_name || msg.from.username || 'Onbekend';
  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  
  // In groups: only respond when tagged or when it's a reply to the bot
  if (isGroup) {
    const isMentioned = text.toLowerCase().includes(`@${BOT_USERNAME.toLowerCase()}`);
    const isReplyToBot = msg.reply_to_message && 
                         msg.reply_to_message.from && 
                         msg.reply_to_message.from.is_bot;
    
    if (!isMentioned && !isReplyToBot) return;
  }

  // Clean the message (remove bot mention)
  const cleanText = text.replace(new RegExp(`@${BOT_USERNAME}`, 'gi'), '').trim();
  
  if (!cleanText) return;

  // Quick commands (no AI needed)
  if (cleanText.toLowerCase() === '/todos' || cleanText.toLowerCase() === '/taken') {
    bot.sendMessage(chatId, getTodoList(chatId), { parse_mode: 'Markdown' });
    return;
  }

  if (cleanText.toLowerCase() === '/help') {
    bot.sendMessage(chatId, `🤖 *Stark - Project Assistent*

Ik ben jullie AI teamlid voor Project Stark (Fysio Assistent).

*Wat kan ik?*
• Meedenken over het project, features, en beslissingen
• To-do lijst bijhouden (voeg toe, vink af, verwijder)
• Onthouden wat we bespreken
• Technische vragen beantwoorden over de stack
• Brainstormen over nieuwe features

*Commando's:*
/todos - Toon de to-do lijst
/help - Dit bericht
/reset - Reset gespreksgeschiedenis

*Gebruik:*
${isGroup ? 'Tag me met @' + BOT_USERNAME + ' of reply op mijn berichten.' : 'Stuur gewoon een bericht!'}
`, { parse_mode: 'Markdown' });
    return;
  }

  if (cleanText.toLowerCase() === '/reset') {
    conversations[chatId] = [];
    saveJSON(CONVERSATION_FILE, conversations);
    bot.sendMessage(chatId, '🔄 Gespreksgeschiedenis gereset! Mijn geheugen en to-dos zijn bewaard.');
    return;
  }

  // Send typing indicator
  bot.sendChatAction(chatId, 'typing');

  // Ask Claude
  const response = await askClaude(chatId, cleanText, userName);

  // Handle todo additions from user messages
  const todoPatterns = [
    /(?:voeg toe|add|nieuwe taak|todo):?\s*(.+)/i,
    /(?:taak|task):?\s*(.+)/i,
  ];

  for (const pattern of todoPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      addTodo(chatId, match[1].trim(), userName);
      break;
    }
  }

  // Check if AI wants to add/complete todos
  const addTodoMatch = response.match(/\[TODO_ADD: (.+?)\]/g);
  if (addTodoMatch) {
    addTodoMatch.forEach(m => {
      const task = m.replace('[TODO_ADD: ', '').replace(']', '');
      addTodo(chatId, task, 'Stark');
    });
  }

  const completeTodoMatch = response.match(/\[TODO_DONE: (\d+)\]/g);
  if (completeTodoMatch) {
    completeTodoMatch.forEach(m => {
      const idx = parseInt(m.replace('[TODO_DONE: ', '').replace(']', '')) - 1;
      completeTodo(chatId, idx);
    });
  }

  // Clean response of internal markers
  const finalResponse = response
    .replace(/\[TODO_ADD: .+?\]/g, '')
    .replace(/\[TODO_DONE: \d+\]/g, '')
    .trim();

  // Send response (split if too long for Telegram)
  if (finalResponse.length > 4000) {
    const chunks = finalResponse.match(/.{1,4000}/gs);
    for (const chunk of chunks) {
      await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' }).catch(() => {
        // Fallback without markdown if parsing fails
        bot.sendMessage(chatId, chunk);
      });
    }
  } else {
    bot.sendMessage(chatId, finalResponse, { parse_mode: 'Markdown' }).catch(() => {
      bot.sendMessage(chatId, finalResponse);
    });
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

console.log(`
╔══════════════════════════════════════╗
║  🤖 Stark Bot - Project Assistent   ║
║                                      ║
║  Status: ONLINE                      ║
║  Bot: @${BOT_USERNAME.padEnd(28)}║
║                                      ║
║  Commando's:                         ║
║  /help  - Uitleg                     ║
║  /todos - To-do lijst                ║
║  /reset - Reset gesprek              ║
╚══════════════════════════════════════╝
`);

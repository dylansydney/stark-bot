# 🤖 Stark Bot - Project Stark Team Assistant

Een Telegram bot powered by Claude AI die dient als team-assistent voor het Fysio Assistent project.

## Features

- 🧠 **Kent het hele project** - Alle PRD, tech design, en architectuur zit in de bot
- 💬 **Gespreksgeheugen** - Onthoudt wat jullie bespreken
- 📋 **To-do lijsten** - Houdt taken bij voor het team
- 🤔 **Meedenken** - Geeft advies over features, bugs, en beslissingen
- 🇳🇱 **Nederlands** - Communiceert in het Nederlands

## Setup

### 1. Lokaal testen

```bash
# Clone of download de bestanden
cd stark-bot

# Installeer dependencies
npm install

# Kopieer en vul .env in
cp .env.example .env
# Bewerk .env met je tokens

# Start de bot
npm start
```

### 2. Deploy op Railway (gratis)

1. Ga naar [railway.app](https://railway.app)
2. Maak een account (kan met GitHub)
3. Klik "New Project" → "Deploy from GitHub repo" 
   (of "Empty Project" → "Add Service" → "GitHub Repo")
4. Als je geen GitHub repo hebt:
   - Maak een nieuwe repo op github.com
   - Push deze bestanden erheen
   - Koppel de repo aan Railway
5. Ga naar je service → "Variables"
6. Voeg toe:
   - `TELEGRAM_TOKEN` = je Telegram bot token
   - `ANTHROPIC_API_KEY` = je Anthropic API key  
   - `BOT_USERNAME` = je bot username (zonder @)
7. Railway deployed automatisch!

### 3. Bot toevoegen aan Telegram groep

1. Open je Telegram groep
2. Klik op de groepsnaam → "Leden toevoegen"
3. Zoek je bot op (@jouw_bot_username)
4. Voeg toe
5. **Belangrijk:** Maak de bot admin (anders kan hij niet alle berichten zien)
   - Groep instellingen → Beheerders → Voeg beheerder toe → Selecteer bot

### 4. Group Privacy uitschakelen (belangrijk!)

De bot moet berichten in de groep kunnen lezen:
1. Ga naar @BotFather op Telegram
2. Stuur: `/mybots`
3. Selecteer je bot
4. Ga naar "Bot Settings" → "Group Privacy"
5. Zet op "Disable" (zodat de bot alle berichten kan zien)

## Gebruik

### In de groep
Tag de bot: `@jouw_bot Hey, wat vind je van...`
Of reply op een bericht van de bot.

### Commando's
- `/help` - Overzicht van wat de bot kan
- `/todos` of `/taken` - Toon de to-do lijst
- `/reset` - Reset de gespreksgeschiedenis

### Voorbeelden
```
@stark_bot wat is de volgende stap voor het project?
@stark_bot voeg toe: auth systeem implementeren
@stark_bot toon de to-do lijst
@stark_bot hoe werkt de AI streaming in ons project?
@stark_bot we hebben besloten om eerst de patient management te bouwen
```

## Architectuur

```
stark-bot/
├── index.js          # Hoofdbestand met alle logica
├── package.json      # Dependencies
├── .env.example      # Voorbeeld configuratie
├── .env              # Jouw configuratie (NIET committen!)
└── data/             # Wordt automatisch aangemaakt
    ├── conversations.json  # Gespreksgeschiedenis
    ├── todos.json          # To-do lijsten
    └── memory.json         # Opgeslagen feiten/besluiten
```

## Kosten

- **Telegram Bot**: Gratis
- **Railway**: Gratis tier (500 uur/maand - genoeg voor een bot)
- **Anthropic API**: Betaal per gebruik (~$3/miljoen input tokens voor Sonnet)

## Troubleshooting

**Bot reageert niet in groep?**
- Check of Group Privacy uit staat bij @BotFather
- Check of de bot admin is in de groep
- Check of je de juiste @username gebruikt

**"AI error" berichten?**
- Check je ANTHROPIC_API_KEY in de environment variables
- Check of je genoeg API credits hebt

**Bot crasht?**
- Check de Railway logs voor foutmeldingen
- Meest voorkomend: verkeerde tokens in environment variables

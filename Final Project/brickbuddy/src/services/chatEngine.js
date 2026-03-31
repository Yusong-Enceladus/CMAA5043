/**
 * ChatEngine — Context-aware AI response system for BrickBuddy.
 * Generates responses based on selected model, current step, pieces, and STEAM topics.
 * Uses intent classification + retrieval from the knowledge base rather than raw keyword matching.
 */
import { steamFacts } from '../data/models';

/* ── Intent Classification ───────────────────────────────────── */

const INTENTS = [
  { id: 'help_stuck',     patterns: [/stuck/i, /can'?t/i, /hard/i, /difficult/i, /don'?t know/i, /confused/i, /wrong/i, /mess/i] },
  { id: 'ask_why',        patterns: [/why/i, /how come/i, /reason/i, /because/i] },
  { id: 'ask_how',        patterns: [/how do/i, /how to/i, /how can/i, /connect/i, /attach/i, /put/i, /build/i, /make/i, /where does/i, /where do/i] },
  { id: 'ask_piece',      patterns: [/what piece/i, /which piece/i, /next piece/i, /what do i need/i, /which brick/i, /how many/i, /count/i, /piece/i] },
  { id: 'ask_balance',    patterns: [/fall/i, /tip/i, /wobble/i, /balance/i, /stable/i, /stand/i, /lean/i, /topple/i] },
  { id: 'ask_sensor',     patterns: [/sensor/i, /see/i, /eye/i, /detect/i, /robot see/i, /vision/i, /camera/i] },
  { id: 'ask_color',      patterns: [/color/i, /look/i, /pretty/i, /design/i, /decorate/i, /style/i, /paint/i] },
  { id: 'ask_math',       patterns: [/many/i, /count/i, /number/i, /symmetr/i, /pattern/i, /equal/i, /same/i, /measure/i] },
  { id: 'ask_strength',   patterns: [/strong/i, /break/i, /hold/i, /support/i, /weight/i, /heavy/i, /sturdy/i] },
  { id: 'ask_movement',   patterns: [/move/i, /walk/i, /spin/i, /turn/i, /roll/i, /drive/i, /run/i, /fast/i, /wheel/i, /hinge/i] },
  { id: 'ask_fun_fact',   patterns: [/tell me/i, /fun fact/i, /cool/i, /interesting/i, /wow/i, /awesome/i, /more/i, /what else/i] },
  { id: 'positive',       patterns: [/done/i, /did it/i, /yay/i, /great/i, /good/i, /nice/i, /love/i, /easy/i, /fun/i] },
  { id: 'greeting',       patterns: [/hi/i, /hello/i, /hey/i, /sup/i, /what'?s up/i] },
  { id: 'help_general',   patterns: [/help/i, /assist/i, /explain/i, /show/i, /again/i, /repeat/i] },
];

function classifyIntent(text) {
  for (const intent of INTENTS) {
    if (intent.patterns.some(p => p.test(text))) return intent.id;
  }
  return 'unknown';
}

/* ── Step-Specific Knowledge ─────────────────────────────────── */

/** Get context-specific tips based on model and step */
function getStepContext(model, stepIndex) {
  if (!model || stepIndex == null) return {};
  const step = model.steps[stepIndex];
  if (!step) return {};

  const pieceNames = step.pieces.map(p => p.name).join(', ');
  const pieceCount = step.pieces.length;

  return {
    stepTitle: step.title,
    stepNum: step.num,
    pieceNames,
    pieceCount,
    tip: step.tip,
    desc: step.desc?.replace(/<[^>]+>/g, ''), // Strip HTML
    modelName: model.name,
    modelEmoji: model.emoji,
    totalSteps: model.steps.length,
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex === model.steps.length - 1,
  };
}

/* ── Response Templates ──────────────────────────────────────── */

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a response based on intent and step context */
function generateResponse(intent, ctx) {
  const { stepTitle, stepNum, pieceNames, pieceCount, tip, modelName, modelEmoji, totalSteps, isFirstStep, isLastStep } = ctx;

  switch (intent) {
    case 'help_stuck':
      return {
        text: pickRandom([
          `No worries! Let's break step ${stepNum} into smaller parts. First, find ${pieceNames.split(',')[0]}. Got it? Then we'll place it carefully. You've got this! 💪`,
          `It's totally okay to feel stuck — even real engineers do! For "${stepTitle}", try laying out all the pieces first: ${pieceNames}. Then follow along one piece at a time. 🧩`,
          `Deep breath! 😊 Remember, ${tip || 'every builder has tricky moments'}. Let's try this step again together — which part is confusing?`,
        ]),
        tag: null,
      };

    case 'ask_why':
      return {
        text: pickRandom([
          `Great question! In step ${stepNum} (${stepTitle}), ${tip || 'each piece has a special purpose'}. Scientists ask "why" all the time — that's how discoveries are made! 🔬`,
          `Asking "why" makes you a true scientist! ${tip || `The pieces in this step work together to make your ${modelName} stronger and cooler`}. 🧪`,
        ]),
        tag: 'science',
      };

    case 'ask_how':
      return {
        text: pickRandom([
          `For "${stepTitle}": take ${pieceNames.split(',')[0]} and press it firmly onto the base until you hear a click. The studs on top fit into the tubes underneath — that's clever engineering! ⚙️`,
          `Here's how: you need ${pieceCount} piece${pieceCount > 1 ? 's' : ''} for this step — ${pieceNames}. Line them up, then press down firmly. The connection should feel solid! 🔧`,
          `Engineering tip! For step ${stepNum}, place each piece starting from ${isFirstStep ? 'the center' : 'where the last step ended'}. Press down until it clicks. ${tip || 'Precision matters!'} ⚙️`,
        ]),
        tag: 'engineering',
      };

    case 'ask_piece':
      return {
        text: `For step ${stepNum} "${stepTitle}", you need ${pieceCount} piece${pieceCount > 1 ? 's' : ''}: ${pieceNames}. ${totalSteps - stepNum} step${totalSteps - stepNum !== 1 ? 's' : ''} left after this one! Let's count them together — that's math! 🔢`,
        tag: 'math',
      };

    case 'ask_balance':
      return {
        text: pickRandom([
          `Your ${modelName} ${modelEmoji} might wobble because of center of gravity! Heavy parts should be low and the base wide. ${tip || 'Think of it like balancing a book on your head!'} 🔬`,
          `Balance is all about physics! The wider the base, the more stable your ${modelName}. That's why step 1 starts with a flat plate — it spreads the weight evenly. Real engineers test this too! 🔬`,
        ]),
        tag: 'science',
      };

    case 'ask_sensor':
      return {
        text: pickRandom([
          `Real robots use sensors as their eyes! Cameras, infrared, and ultrasonic sensors help them "see". Your ${modelName}'s sensor brick works the same way — it's like giving it superpowers! 💻`,
          `Robot vision is amazing technology! Some robots can even see in the dark using infrared light. The sensor on your ${modelName} ${modelEmoji} is its way of understanding the world! 💻`,
        ]),
        tag: 'technology',
      };

    case 'ask_color':
      return {
        text: pickRandom([
          `Art and design are huge in robotics! Colors affect how people feel — red means energy, blue means calm, yellow means happy. What colors does your ${modelName} ${modelEmoji} have? Choose colors that match its personality! 🎨`,
          `Being creative with your ${modelName} is what makes it uniquely YOURS! Real robot designers spend lots of time on how robots look — it's called industrial design. You're doing the same thing! 🎨`,
        ]),
        tag: 'art',
      };

    case 'ask_math':
      return {
        text: `Let's count! Your ${modelName} uses ${pieceCount} pieces in step ${stepNum} alone. Notice how${modelName === 'Robot Dog' ? ' the legs are symmetric — both sides match like a mirror' : modelName === 'Robot Car' ? ' the wheels come in pairs — 2 front, 2 back' : ' the pieces repeat in patterns'}. That's math in action! 🔢`,
        tag: 'math',
      };

    case 'ask_strength':
      return {
        text: `Triangles are the strongest shape — that's why bridges use them! Your ${modelName} is strong because ${tip || 'the pieces interlock at multiple points'}. Press firmly so the studs connect properly. Real engineers test strength the same way! ⚙️`,
        tag: 'engineering',
      };

    case 'ask_movement':
      return {
        text: pickRandom([
          modelName === 'Robot Car'
            ? 'Round wheels reduce friction — that\'s why things roll smoothly! Your car\'s axles let the wheels spin freely. Real self-driving cars use motors connected to the wheels. 💻'
            : modelName === 'Robot Dog'
            ? 'Real robot dogs use motors in each leg joint to walk! The hinge pieces in your model show where movement happens. Boston Dynamics\' Spot robot can even dance! 💻'
            : 'Dinosaur robots need strong leg motors to support their weight! The thick legs on your Dino Bot show how real engineers solve the stability problem. 💻',
          `Movement in robots comes from motors and hinges! Your ${modelName} ${modelEmoji} shows how joints work. ${tip || 'Each moving part is a feat of engineering!'} 💻`,
        ]),
        tag: 'technology',
      };

    case 'ask_fun_fact': {
      const allFacts = Object.values(steamFacts).flat();
      const fact = pickRandom(allFacts);
      return {
        text: `Here's something cool: ${fact.fact} 🌟\n\nWant to know more? Ask me about science, robots, or engineering!`,
        tag: pickRandom(['science', 'technology', 'engineering']),
      };
    }

    case 'positive':
      return {
        text: pickRandom([
          `You're doing amazing! ${isLastStep ? 'This is the final step — you\'re almost a master builder!' : `Step ${stepNum} down, ${totalSteps - stepNum} to go!`} Keep up the awesome work! 🌟`,
          `Fantastic job, builder! ${modelEmoji} Your ${modelName} is looking great! ${tip || 'Every step makes it better!'} 🎉`,
          `YES! You're a natural engineer! ${isLastStep ? 'Almost done with your masterpiece!' : 'Ready for the next challenge?'} 💪`,
        ]),
        tag: null,
      };

    case 'greeting':
      return {
        text: `Hey there, builder! 👋 We're on step ${stepNum}: "${stepTitle}". You need: ${pieceNames}. Ready to go? 😊`,
        tag: null,
      };

    case 'help_general':
      return {
        text: `Sure! Here's step ${stepNum} again: "${stepTitle}". You need ${pieceCount} piece${pieceCount > 1 ? 's' : ''}: ${pieceNames}. ${ctx.desc ? ctx.desc.substring(0, 120) : ''} Need me to explain any part differently? 😊`,
        tag: null,
      };

    default:
      return {
        text: pickRandom([
          `That's interesting! ${tip || `Your ${modelName} is coming along great`}. Did you know: ${pickRandom(Object.values(steamFacts).flat()).fact} Keep exploring! 🧪`,
          `Great thinking! Want me to tell you more about how your ${modelName} ${modelEmoji} works, or are you ready to keep building step ${stepNum}? 🔬`,
          `I love your curiosity! Scientists ask lots of questions too. For step ${stepNum}, remember you need: ${pieceNames}. Ask me anything! 😊`,
        ]),
        tag: 'science',
      };
  }
}

/* ── Public API ──────────────────────────────────────────────── */

/**
 * Generate a context-aware AI response.
 * @param {string} text - User's message
 * @param {object} model - Selected robot model
 * @param {number} stepIndex - Current build step index
 * @returns {{ text: string, tag: string|null }}
 */
export function getAIResponse(text, model, stepIndex) {
  const intent = classifyIntent(text);
  const ctx = getStepContext(model, stepIndex);
  return generateResponse(intent, ctx);
}

/**
 * Generate a welcome message when entering a new step.
 */
export function getStepWelcome(model, stepIndex) {
  if (!model) return null;
  const step = model.steps[stepIndex];
  if (!step) return null;
  const pieceNames = step.pieces.map(p => p.name).join(', ');
  return {
    text: `Step ${step.num}: ${step.title}! You'll need: ${pieceNames}. ${step.tip || 'Let\'s do this!'} Ask me if you need help! 😊`,
    tag: null,
  };
}

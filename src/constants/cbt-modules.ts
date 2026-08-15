export interface CBTCard {
  title: string;
  body: string;
  reflection?: string;
}

export interface CBTModule {
  id: string;
  title: string;
  description: string;
  emoji: string;
  freeCards: number; // how many cards are free
  cards: CBTCard[];
}

export const CBT_MODULES: CBTModule[] = [
  {
    id: 'triggers',
    title: 'Understanding Your Triggers',
    description: 'Learn what drives the urge to gamble and how to see it coming.',
    emoji: '🎯',
    freeCards: 2,
    cards: [
      {
        title: "What is a trigger?",
        body: "A trigger is anything — a thought, feeling, situation, or person — that activates the urge to gamble.\n\nTriggers are not the problem. They're just signals. The problem is what we do with them.",
        reflection: "Think of the last time you felt the urge. What was happening right before it?"
      },
      {
        title: "The trigger chain",
        body: "Triggers follow a predictable chain:\n\n🔗 Situation → Thought → Feeling → Urge → Action\n\nYou can break the chain at any point. The earlier you catch it, the easier it is.",
        reflection: "Where in the chain do you usually notice the urge first?"
      },
      {
        title: "Common gambling triggers",
        body: "Most gambling triggers fall into five categories:\n\n• Financial stress — wanting to 'solve' money problems\n• Boredom — seeking excitement or stimulation\n• Social pressure — others gambling around you\n• Emotional pain — numbing sadness, anger, or anxiety\n• Sports events — habitual betting tied to watching games",
        reflection: "Which of these resonates most with your experience?"
      },
      {
        title: "The high-risk moment",
        body: "Research shows gambling urges spike at predictable times:\n\n• After a win (the near-miss effect)\n• During financial stress\n• When alone and bored\n• Late at night\n• Before/during major sports events\n\nKnowing your high-risk moments lets you prepare in advance.",
        reflection: "When are you most vulnerable? Write down your top 2-3 high-risk times."
      },
      {
        title: "Building your trigger map",
        body: "Your trigger map is a personal record of what sets you off and when.\n\nEvery time you log a check-in, you're building this map. Over time, patterns emerge that you can't see in the moment.\n\nThe app's trigger journal helps you build this map automatically.",
        reflection: "What pattern do you already know about yourself that you haven't fully faced yet?"
      },
    ]
  },
  {
    id: 'cognitive_distortions',
    title: 'Cognitive Distortions',
    description: 'The thinking errors that keep the gambling loop alive.',
    emoji: '🧠',
    freeCards: 2,
    cards: [
      {
        title: "Your brain lies to you",
        body: "Gambling disorder isn't a moral failure. It's a brain pattern.\n\nYour brain has learned to generate compelling thoughts that justify gambling. These are called cognitive distortions — and they feel completely true, even when they aren't.",
        reflection: "What's the most convincing gambling thought your brain produces?"
      },
      {
        title: "The gambler's fallacy",
        body: "The gambler's fallacy is the belief that past results affect future odds.\n\n'I've lost 10 times — I'm due for a win.'\n\nIn reality, each spin, hand, or bet is statistically independent. The casino is designed around this misunderstanding.",
        reflection: "Have you ever caught yourself thinking 'I'm due for a win'? What happened next?"
      },
      {
        title: "Magical thinking",
        body: "Magical thinking is believing you can influence random outcomes:\n\n'My lucky shirt'\n'I always win when I bet on this team'\n'I have a system'\n\nThese beliefs create a false sense of control. The randomness is the point — it's what makes gambling addictive.",
        reflection: "What personal 'systems' or rituals did you have around gambling?"
      },
      {
        title: "Chasing losses",
        body: "Loss chasing is the most dangerous distortion:\n\n'I just need to win back what I lost.'\n\nThis thought is the engine of gambling disorder. It turns one bad session into devastation. The math is unwinnable — the house always has the edge.",
        reflection: "What's the most you ever lost trying to 'win back' a previous loss?"
      },
      {
        title: "Challenging the thought",
        body: "When a distorted gambling thought appears, ask:\n\n1. Is this thought true? (Actually true, not just feels true)\n2. What evidence contradicts it?\n3. What would I tell a friend who said this?\n4. What's the most realistic outcome if I act on it?\n\nYou don't have to argue with the thought. Just question it.",
        reflection: "Write the distorted thought. Then write one sentence that challenges it."
      },
    ]
  },
  {
    id: 'urge_surfing',
    title: 'Urge Surfing',
    description: 'How to ride out cravings without acting on them.',
    emoji: '🌊',
    freeCards: 2,
    cards: [
      {
        title: "The urge is a wave",
        body: "Every urge follows the same shape as a wave:\n\n🌊 It builds → peaks → and fades\n\nThe peak lasts 15-30 minutes. If you don't act on it, it passes.\n\nUrge surfing is the skill of riding the wave without wiping out.",
        reflection: "Think of a time the urge passed on its own. What did you do?"
      },
      {
        title: "Don't fight it — observe it",
        body: "Fighting an urge makes it stronger. This is called 'ironic process' — the more you try to suppress a thought, the more it appears.\n\nInstead: observe the urge like a scientist.\n\n'There's the urge. I notice it. It's about a 7/10 right now. I'm curious what it does next.'",
        reflection: "Can you describe your urge as a physical sensation in your body right now or last time it appeared?"
      },
      {
        title: "The 5-step protocol",
        body: "When the urge hits, use this sequence:\n\n1️⃣ Name it: 'I'm having the urge to gamble'\n2️⃣ Locate it: Where in your body do you feel it?\n3️⃣ Breathe: 4 counts in, 4 hold, 4 out\n4️⃣ Wait: Set a 10-minute timer. Just wait.\n5️⃣ Reassess: Is it still as strong? Usually no.\n\nThis is exactly what the SOS button does.",
        reflection: "Which step is hardest for you? Why?"
      },
      {
        title: "Delaying tactics",
        body: "When surfing feels impossible, delay tactics buy you time:\n\n• Call someone\n• Go for a 10-minute walk\n• Drink a glass of water slowly\n• Do 20 push-ups or jumping jacks\n• Watch something that fully captures your attention\n\nYou don't have to win the battle. You just have to delay it long enough for the wave to pass.",
        reflection: "What's your go-to delay tactic? If you don't have one, pick one now."
      },
      {
        title: "Building the muscle",
        body: "Every urge you surf — even partly — makes the next one easier.\n\nYou're not just avoiding gambling. You're rewiring your brain's response to the trigger.\n\nNeuroscience shows that with repeated practice, the urge signal weakens and the pause before action grows longer.\n\nThe SOS log in this app tracks every urge you've surfed. Look at it when you need proof you can do this.",
        reflection: "How many urges have you surfed since starting this app?"
      },
    ]
  },
  {
    id: 'relapse_planning',
    title: 'Relapse Prevention',
    description: "Plan for setbacks before they happen — so they don't become collapses.",
    emoji: '🛡️',
    freeCards: 2,
    cards: [
      {
        title: "Relapse is not failure",
        body: "Most people attempting recovery relapse at least once. That's not a flaw in the person — it's the nature of the process.\n\nThe difference between a relapse and a collapse is what happens after:\n\n• Relapse: slip → learn → restart\n• Collapse: slip → shame spiral → give up\n\nYour lifetime clean days never reset. The journey continues.",
        reflection: "How have you talked to yourself after a past slip? Was it helpful?"
      },
      {
        title: "The warning signs",
        body: "Relapse rarely comes without warning. The signs appear days or weeks before the actual event:\n\n• Romanticising past gambling\n• 'Just this once' thinking\n• Isolating from support\n• Skipping check-ins\n• Increased stress with no outlet\n• Telling yourself you're cured\n\nKnowing your personal warning signs is the most powerful prevention tool.",
        reflection: "What were your personal warning signs before past relapses?"
      },
      {
        title: "Your emergency plan",
        body: "Write your personal emergency plan before you need it:\n\n1. When I feel the urge strongly, I will: _____\n2. The person I will call is: _____\n3. The place I will go is: _____\n4. The app I will open first is: BetFree → SOS\n5. If I do slip, the first thing I will do after is: _____\n\nHaving a plan reduces the decision load in the moment of crisis.",
        reflection: "Fill in the blanks above. Screenshot it and save it somewhere you'll find it."
      },
      {
        title: "After a relapse",
        body: "If you relapse:\n\n1. Don't make it worse by continuing\n2. Tell someone you trust\n3. Open BetFree and log it honestly\n4. Read your motivation statement\n5. Start your streak again — immediately, not tomorrow\n\nShame is the enemy of recovery. Honesty and action are the cure.",
        reflection: "What would you say to a close friend who just relapsed? Say that to yourself."
      },
      {
        title: "The long game",
        body: "Recovery is not a straight line. It's a practice — like fitness or meditation.\n\nEvery day clean is progress. Every urge surfed is practice. Every honest check-in is data.\n\nThe people who make long-term recovery aren't the ones who never slipped. They're the ones who kept showing up.\n\nYou're here. You're showing up.\n\nThat's enough.",
        reflection: "What does your life look like in 1 year if you keep showing up?"
      },
    ]
  },
];

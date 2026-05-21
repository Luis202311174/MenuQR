"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { faRobot, faPaperPlane, faTimes, faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fetchTopMenuItems } from '@/utils/fetchTopMenuItems';

export const CRAVEBOT_SYSTEM_PROMPT = `
System Prompt: CraveBot Database-Validated Flow
Role: You are CraveBot, the data-driven concierge for the MenuQR web app. Your intelligence is strictly restricted to the provided database context. You must never hallucinate a dish or business that does not exist in the provided data.

Database Awareness (Schema Mapping):
- Business Selection: Use public.businesses (name, address, store_category).
- Menu Items: Use public.menu_items (name, category, price, availability, menu_desc).
- Availability: Only suggest items where availability = true.
- Item Logic: Filter suggestions based on menu_category (Meals, Beverage, Solo, Dessert, Extras).

Mandatory Interaction Flow:
Step 1: The Vibe (Cuisine & Mood)
Greeting: "Welcome to MenuQR! I'm CraveBot. 🤖 Let's get you fed. What's the vibe for your meal today?"
Options: 🔥 Filipino Dishes, 🥗 Healthy & Fresh, 🍦 Dessert, ☕ Coffee, 🍢 Street Food & Snacks, 🍗 Fast & Filling.

Step 2: The Safety Filter (Allergies)
Greeting: "Excellent choice! Before I check the menu, any dietary restrictions or allergies?"
Options: ✅ No Allergies, 🥦 Vegetarian, 🦐 Seafood, 🥜 Nut Allergy, 🌾 Gluten-Free, 🐄 Lactose Intolerant.

Step 3: The Main Event (Live Dishes)
Greeting: "Based on your vibe, here are some local favorites available right now. Which one are you craving?"
Options: 🥩 Sizzling Sisig, 🥓 Silog, 🍲 Beef Pares, 🍗 Wings, 🍜 Special Lomi/Mami, 🍛 Rice Bowl Specials.

Step 4: The Liquid Companion (Beverages)
Greeting: "A great meal needs a chaser! Let's pair it with a drink:"
Options: 🥤 Iced Tea, 🍈 Fresh Buko Juice, 🧊 Sago’t Gulaman, 🍋 Calamansi Juice, 🍉 Fruit Shake, 🥤 Milk Tea, 🥤 Softdrinks (Soda).

Step 5: The Conscious Check (Mindset)
Action: Ask about their health goal for this specific meal.
Quick Replies: ⚖️ Balanced & Lean, 🚀 Cheat Day Mode, 🥤 Low Sugar/Guilt-Free, 🥣 Budget-Friendly, 🏋️ Protein-Packed, 🎲 Surprise Me, 👨‍👩‍👧‍👦 Family/Group Share, 🏃 On-The-Go.

Step 6: The Grand Reveal (Restaurant Referral)
Action: Consolidate all data into a final recommendation.
Constraint: Must name a specific restaurant (e.g., Wing Squad) from the MenuQR database.
Formatting: Use a horizontal rule (---) followed by a [Visit Store] call-to-action.

The Reset & Retention Logic:
Post-Recommendation: Ask: "Is that the one, or should we try a different path?"
Quick Replies: 🔄 Reset Search, ✅ Perfect, taking me there!.

Behavioral Guidelines:
- Minimalist UI: Keep responses under 50 words. The floating modal is small; don't bury the buttons.
- Dynamic Tone: Use emojis to act as visual anchors for the buttons.
- Memory: Reference their choice. (e.g., "Since we're going Vegan for our Main Event...")
- Format for Clicking: At the end of every response, you must provide a list of "Quick Replies" formatted as a bulleted list starting with a dash (-) or asterisk (*).
- Tone & Layout: Use a clear header "Select an option:" to guide the user's eye right before the bulleted list.
`;

const INITIAL_MESSAGE = {
  role: 'assistant' as const,
  content: "Welcome back! I'm CraveBot. 🤖 Let's get you fed. What's the vibe for your meal today?\n\nSelect an option:\n- 🔥 Savory & Heavy\n- 🥗 Healthy & Fresh\n- 🍦 Sweet Tooth\n- ☕ Cafe & Caffeine\n- 🍢 Street Food & Snacks\n- 🍔 Fast & Filling\n- 🍜 Noodle Craving\n- 🍳 Breakfast Anytime"
};

type CraveBotProps = {
  businessSlug?: string;
  businessName?: string;
  businessAddress?: string;
  businessOptions?: Array<{
    id: string;
    title: string;
    address: string;
    slug: string;
    menuItems: string[];
  }>;
};

export default function CraveBot({ businessSlug, businessName, businessAddress, businessOptions }: CraveBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedVibe, setSelectedVibe] = useState('');
  const [selectedAllergy, setSelectedAllergy] = useState('');
  const [selectedMenuItem, setSelectedMenuItem] = useState('');
  const [matchedBusinesses, setMatchedBusinesses] = useState<any[]>([]);
  const [needsStoreSelection, setNeedsStoreSelection] = useState(false);
  const [topMenuItems, setTopMenuItems] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch top 16 most sold menu items on component mount
  useEffect(() => {
    const loadTopMenuItems = async () => {
      const items = await fetchTopMenuItems();
      setTopMenuItems(items);
    };
    loadTopMenuItems();
  }, []);

  const normalizeText = (text: string) => text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

  const menuItemChoices = useMemo(() => {
    // If we have top menu items from the database, use those (up to 16)
    if (topMenuItems.length > 0) {
      return topMenuItems.slice(0, 16);
    }
    
    // Fallback: get unique menu items from businessOptions
    const allMenuNames = businessOptions?.flatMap((biz) => biz.menuItems || []) ?? [];
    const uniqueMenus = Array.from(new Set(allMenuNames.map((name) => name.trim()).filter(Boolean)));
    return uniqueMenus.slice(0, 16);
  }, [topMenuItems, businessOptions]);

  const menuChoiceKeywords: Record<string, string[]> = {
    '🥩 Sizzling Sisig': ['sisig'],
    '🥓 Silog': ['silog', 'tapa', 'tocino', 'bangus'],
    '🍲 Beef Pares': ['pares', 'beef pares'],
    '🍗 Wings': ['wing', 'wings'],
    '🍜 Special Lomi/Mami': ['lomi', 'mami'],
    '🍱 Rice Bowl Specials': ['rice bowl', 'rice bowl specials'],
  };

  const getMenuKeywords = (selection: string) => {
    const normalizedSelection = normalizeText(selection);
    if (menuChoiceKeywords[selection]) return menuChoiceKeywords[selection];
    if (menuChoiceKeywords[normalizedSelection]) return menuChoiceKeywords[normalizedSelection];
    // Split into individual words for flexible matching
    return normalizedSelection.split(' ').filter(word => word.length > 0);
  };

  const findBusinessMatches = (selection: string) => {
    const keywords = getMenuKeywords(selection);
    console.log('DEBUG: findBusinessMatches called with selection:', selection);
    console.log('DEBUG: extracted keywords:', keywords);
    console.log('DEBUG: businessOptions:', businessOptions);
    
    if (!businessOptions || businessOptions.length === 0) {
      console.log('DEBUG: businessOptions is empty!');
      return [];
    }
    
    const matches = businessOptions.filter((biz) => {
      console.log(`DEBUG: checking business ${biz.title}, menuItems:`, biz.menuItems);
      return (biz.menuItems || []).some((menuName) => {
        const normalizedMenuName = normalizeText(menuName);
        const found = keywords.some((keyword) => normalizedMenuName.includes(keyword));
        if (found) console.log(`DEBUG: ✓ Found match in ${biz.title}: "${menuName}"`);
        return found;
      });
    });
    console.log('DEBUG: final matches:', matches);
    return matches;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const submitMessage = async (userMessage: string) => {
    const normalized = userMessage.trim();

    // Intercept Frontend Reset Logic
    if (normalized === '🔄 Reset Search') {
      setMessages([INITIAL_MESSAGE]);
      setInput('');
      setStep(0);
      setSelectedVibe('');
      setSelectedAllergy('');
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', content: normalized }] );
    setInput('');
    setIsLoading(true);

    try {
      const currentStep = step;
      let nextStep = currentStep + 1;
      let assistantContent = '';

      if (currentStep === 0) {
        setSelectedVibe(normalized);
        assistantContent = `Excellent choice! Before I check the menu, any dietary restrictions or allergies?\n\nSelect an option:\n- ✅ No Allergies\n- 🥦 Vegetarian\n- 🦐 Seafood\n- 🥜 Nut Allergy\n- 🌾 Gluten-Free\n- 🐄 Lactose Intolerant`;
      } else if (currentStep === 1) {
        setSelectedAllergy(normalized);
        const menuChoices = menuItemChoices.length > 0 && menuItemChoices.length <= 16
          ? menuItemChoices
          : ['🥩 Sizzling Sisig', '🥓 Silog', '🍲 Beef Pares', '🍗 Wings', '🍜 Special Lomi/Mami', '🍛 Rice Bowl Specials'];
        assistantContent = `Based on your vibe, here are some local favorites available right now. Which one are you craving?\n\nSelect an option:\n- ${menuChoices.join('\n- ')}`;
      } else if (currentStep === 2) {
        setSelectedMenuItem(normalized);        console.log('Step 2: User selected item:', normalized);
        console.log('Step 2: businessOptions count:', businessOptions?.length || 'undefined');        const matches = findBusinessMatches(normalized);
        setMatchedBusinesses(matches);

        assistantContent = `A great meal needs a chaser! Let's pair it with a drink:\n\nSelect an option:\n- 🥤 Iced Tea\n- 🍈 Fresh Buko Juice\n- 🧊 Sago’t Gulaman\n- 🍋 Calamansi Juice\n- 🍉 Fruit Shake\n- 🥤 Milk Tea\n- 🥤 Softdrinks (Soda)`;
      } else if (currentStep === 3) {
        assistantContent = `Perfect. What kind of mindset are we in for this round?\n\nSelect an option:\n- ⚖️ Balanced & Lean\n- 🚀 Cheat Day Mode\n- 🥣 Budget-Friendly\n- 🏋️ Protein-Packed\n- 👨‍👩‍👧‍👦 Family Share\n- 🎲 Surprise Me`;
      } else if (currentStep === 4) {
        if (matchedBusinesses.length === 0) {
          assistantContent = `Sorry, I couldn't find **"${selectedMenuItem}"** on any menu right now. The stores might not have that item listed yet.\n\nSelect an option:\n- 🔄 Reset Search\n- ✅ Try another item`;
          setNeedsStoreSelection(false);
        } else if (matchedBusinesses.length === 1) {
          const match = matchedBusinesses[0];
          assistantContent = `---\nPerfect! I found **"${selectedMenuItem}"** at **${match.title}** (${match.address}).\n\nSelect an option:\n- 🔄 Reset Search\n- ✅ Perfect, taking me there!`;
          setNeedsStoreSelection(false);
        } else {
          setNeedsStoreSelection(true);
          assistantContent = `---\nI found ${matchedBusinesses.length} stores that serve **${selectedMenuItem}**. Please pick one:\n\n${matchedBusinesses.map((biz) => `- ✅ ${biz.title}`).join('\n')}\n\nOr reset if you want a different search.`;
        }
        nextStep = 5;
      } else if (currentStep === 5) {
        const storeChoice = matchedBusinesses.find((biz) =>
          normalizeText(biz.title) === normalizeText(normalized) ||
          normalizeText(normalized).includes(normalizeText(biz.title))
        );

        if (needsStoreSelection && storeChoice) {
          assistantContent = `Awesome! Tap the button below to open that menu.\n\nACTION_BUTTON: Visit ${storeChoice.title}|/${storeChoice.slug}\n\nIf you'd like, select:\n- 🔄 Reset Search`;
          setNeedsStoreSelection(false);
        } else if (!needsStoreSelection && matchedBusinesses.length === 1) {
          const match = matchedBusinesses[0];
          assistantContent = `Awesome! Tap the button below to open that menu.\n\nACTION_BUTTON: Visit ${match.title}|/${match.slug}\n\nIf you'd like, select:\n- 🔄 Reset Search`;
        } else {
          assistantContent = `I didn't recognize that store choice. Please pick one of the stores listed or reset the search.\n\nSelect an option:\n- 🔄 Reset Search\n${matchedBusinesses.map((biz) => `- ✅ ${biz.title}`).join('\n')}`;
          nextStep = 5;
        }
      } else {
        assistantContent = `Would you like to find something else?\n\nSelect an option:\n- 🔄 Reset Search`;
      }

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: assistantContent
          }
        ]);
        setStep(nextStep);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error communicating with CraveBot:', error);
      setIsLoading(false);
    }
  };

  const renderAssistantContent = (content: string, messageIndex: number) => {
    const lines = content.split('\n');
    const nodes: React.ReactNode[] = [];
    let optionButtons: React.ReactNode[] = [];

    const flushOptions = () => {
      if (optionButtons.length > 0) {
        nodes.push(
          <div key={`options-${messageIndex}-${nodes.length}`} className="grid grid-cols-2 gap-2 mt-2">
            {optionButtons}
          </div>
        );
        optionButtons = [];
      }
    };

    lines.forEach((line, i) => {
      const trimmedLine = line.trim();
      const isLatest = messageIndex === messages.length - 1;

      if (trimmedLine.startsWith('ACTION_BUTTON: ')) {
        flushOptions();
        const [label, href] = trimmedLine.substring(14).split('|');
        nodes.push(
          <a
            key={`action-${messageIndex}-${i}`}
            href={href}
            className="block w-full text-left mt-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 bg-blue-600 text-white border border-blue-700 shadow-sm hover:bg-blue-700"
            target="_blank"
            rel="noreferrer"
          >
            {label}
          </a>
        );
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        const optionText = trimmedLine.substring(2).replace(/\*\*/g, '');
        optionButtons.push(
          <button
            key={`option-${messageIndex}-${i}`}
            onClick={() => {
              if (!isLoading && isLatest) submitMessage(optionText);
            }}
            disabled={isLoading || !isLatest}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap overflow-hidden text-ellipsis ${
              isLatest && !isLoading
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-sm cursor-pointer hover:-translate-y-0.5'
                : 'bg-slate-50 text-slate-500 border border-slate-200 cursor-default opacity-70'
            }`}
          >
            {optionText}
          </button>
        );
      } else {
        flushOptions();

        if (trimmedLine === '---') {
          nodes.push(<hr key={`hr-${messageIndex}-${i}`} className="my-4 border-slate-300 border-dashed" />);
        } else if (trimmedLine === '') {
          nodes.push(<div key={`spacer-${messageIndex}-${i}`} className="h-2" />);
        } else {
          nodes.push(<p key={`text-${messageIndex}-${i}`}>{trimmedLine.replace(/\*\*/g, '')}</p>);
        }
      }
    });

    flushOptions();
    return nodes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    submitMessage(input.trim());
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start">
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[90vw] max-w-[420px] h-[80vh] max-h-[720px] flex flex-col overflow-hidden mb-4 transition-all duration-300 transform origin-bottom-left">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-2 rounded-full flex items-center justify-center w-8 h-8">
                <FontAwesomeIcon icon={faRobot} className="text-white text-sm" />
              </div>
              <div>
                <h3 className="font-bold text-sm">CraveBot</h3>
                <p className="text-xs text-slate-300">Food Concierge</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-300 hover:text-white transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4 min-h-0">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-sm'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                  ) : (
                    <div className="space-y-1">
                      {renderAssistantContent(msg.content, index)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-500 border border-slate-200 shadow-sm p-3 rounded-2xl rounded-tl-sm flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your vibe..."
              className="flex-1 px-4 py-2 bg-slate-100 border-transparent rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl hover:bg-blue-700 hover:scale-105 transition-all duration-300"
        >
          <FontAwesomeIcon icon={faCommentDots} className="text-2xl" />
        </button>
      )}
    </div>
  );
}
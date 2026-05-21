"use client";

import React, { useState, useRef, useEffect } from 'react';
import { faRobot, faPaperPlane, faTimes, faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const CRAVEBOT_SYSTEM_PROMPT = `
Role: You are CraveBot V2, an intelligent, data-validated in-menu ordering assistant embedded inside a specific restaurant's digital menu on the MenuQR web app. Your goal is to guide the user through a strict 5-step sequential ordering flow. You filter choices in real-time by performing algorithmic calculations on calorie counts and matching allergy inputs against the menu data.

Core Database & Parsing Constraints:
- Zero Hallucination: Only display and recommend items provided in the CURRENT_RESTO_MENU context string. If an item is not in the payload, it does not exist.
- Inventory Enforcement: Only display items where availability = true and current_stock > 0.
- The Calorie Cutoff Rule: If the user selects "Yes, I am on a diet" in Step 1, you must look at the numeric calorie value parsed from the item's nutrition details. Immediately exclude and hide any meal choice where Calories > 400 kcal.
- The Allergy Interception Rule: In Step 2, parse the user's allergy selection (whether a custom text input or a system preset). Cross-reference this against the item’s Allergens metadata or menu_desc field. If a match is found, completely remove that item from all subsequent step selections.

The 5-Step Sequential Conversation Flow:
Step 1: The Health & Diet Filter
Step 2: The Allergy Guard (Presets & Custom Inputs)
Step 3: The Main Event (Filtered Category: Meals / Solo)
Step 4: The Liquid Companion (Filtered Category: Beverage)
Step 5: The Extras & Upgrades (Category: Extras / Dessert)
Step 6: The Intelligent Summary & Lookalike Recommendations
`;

const INITIAL_MESSAGE = {
  role: 'assistant' as const,
  content: "Welcome to our digital menu! I'm CraveBot V2. 🤖 Let's build your perfect order. First things first: Are you currently tracking your diet or watching your calorie intake?\n\nSelect an option:\n- 🥗 Yes, keep it light!\n- 🚀 No, I'm going all out!"
};

type CraveBotV2Props = {
  businessSlug?: string;
  businessName?: string;
  businessAddress?: string;
  menuData?: any[];
};

export default function CraveBotV2({ businessSlug, businessName, businessAddress, menuData }: CraveBotV2Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0);
  
  const [isDiet, setIsDiet] = useState(false);
  const [allergyFilter, setAllergyFilter] = useState('');
  const [selectedMain, setSelectedMain] = useState<any>(null);
  const [selectedDrink, setSelectedDrink] = useState<any>(null);
  const [selectedExtra, setSelectedExtra] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const isMenuItemAvailable = (item: any) => {
    if (item.availability === false) return false;
    if (item.is_trackable && Number(item.current_stock ?? 0) <= 0) return false;
    return true;
  };

  const getSafeItems = (categories: string[], currentDiet: boolean, currentAllergy: string, limit = 6) => {
    if (!menuData || menuData.length === 0) {
      return [];
    }

    return menuData.filter(item => {
      const cat = (item.category || '').toLowerCase();
      const matchCat = categories.some(c => cat === c.toLowerCase() || cat.includes(c.toLowerCase()));
      if (!matchCat) return false;
      if (!isMenuItemAvailable(item)) return false;
      if (currentDiet && item.calories && Number(item.calories) > 400) return false;

      if (currentAllergy && !currentAllergy.toLowerCase().includes('no allergies')) {
        const aLower = currentAllergy.toLowerCase();
        const hasAllergen = item.allergens?.some((a: string) => a.toLowerCase().includes(aLower) || aLower.includes(a.toLowerCase()));
        const descHasAllergen = item.menu_desc?.toLowerCase().includes(aLower);
        if (hasAllergen || descHasAllergen) return false;
      }

      return true;
    }).slice(0, limit);
  };

  const findMenuItemByName = (selection: string, categories: string[]) => {
    if (!menuData || menuData.length === 0) return null;

    const normalizedSelection = normalizeText(selection);
    return menuData.find((item) => {
      if (!isMenuItemAvailable(item)) return false;
      const normalizedName = normalizeText(item.name || '');
      const normalizedDesc = normalizeText(item.menu_desc || '');
      if (normalizedName === normalizedSelection || normalizedName.includes(normalizedSelection) || normalizedSelection.includes(normalizedName)) {
        return categories.length === 0 || categories.some((category) => normalizeText(item.category || '').includes(normalizeText(category)));
      }
      if (normalizedDesc.includes(normalizedSelection)) {
        return categories.length === 0 || categories.some((category) => normalizeText(item.category || '').includes(normalizeText(category)));
      }
      return false;
    }) || null;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const submitMessage = async (userMessage: string) => {
    const originalText = userMessage.trim();
    const normalized = originalText.toLowerCase();

    // Intercept Frontend Reset Logic
    if (originalText === '🔄 Reset Search' || normalized === 'reset search') {
      setMessages([INITIAL_MESSAGE]);
      setInput('');
      setStep(0);
      setIsDiet(false);
      setAllergyFilter('');
      setSelectedMain(null);
      setSelectedDrink(null);
      setSelectedExtra(null);
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', content: originalText }] );
    setInput('');
    setIsLoading(true);

    try {
      const currentStep = step;
      let nextStep = currentStep + 1;
      let assistantContent = '';

      if (currentStep === 0) {
        const dietEnabled = normalized.includes('yes');
        setIsDiet(dietEnabled);
        assistantContent = `Got it. Next, let's keep it safe. Do you have any food allergies or strict dietary restrictions?\n\nSelect an option:\n- ✅ No Allergies\n- 🥦 Plant-Based Only (Vegetarian/Vegan)\n- 🦐 Seafood & Shellfish\n- 🥜 Peanut / Nut Allergy\n- 🌾 Gluten-Free\n- 🐄 Lactose Intolerant\n- ⌨️ Type Custom Allergy`;
      } else if (currentStep === 1) {
        if (normalized.includes('type custom allergy')) {
          assistantContent = `Please type your specific allergy or dietary restriction below:`;
          nextStep = 1; // Stay on step 1 to catch the text
        } else {
          const currentAllergy = originalText;
          setAllergyFilter(currentAllergy);

          const mealItems = getSafeItems(['meals', 'meal', 'main'], isDiet, currentAllergy, 8);
          const soloItems = getSafeItems(['solo'], isDiet, currentAllergy, 8);
          const mains = [...mealItems, ...soloItems];

          if (mains.length === 0) {
            assistantContent = `I couldn't find any mains matching your exact dietary restrictions right now.\n\nSelect an option:\n- 🔄 Reset Search`;
            nextStep = 6;
          } else {
            const options = mains.map(m => `- 🍽️ ${m.name} — ₱${m.price}`).join('\n');
            assistantContent = `Perfect. Checking the kitchen for safe, available options that match your profile... Which dish are you craving for your main event?\n\nSelect an option:\n${options}`;
          }
        }
      } else if (currentStep === 2) {
        const mainName = originalText.replace('- 🍽️ ', '').split(' — ₱')[0].trim();
        const mainItem = findMenuItemByName(mainName, ['meals', 'solo', 'main']);
        if (!mainItem) {
          const availableMealMains = getSafeItems(['meals', 'meal', 'main'], isDiet, allergyFilter, 8);
          const availableSoloMains = getSafeItems(['solo'], isDiet, allergyFilter, 8);
          const availableMains = [...availableMealMains, ...availableSoloMains];
          const options = availableMains.length > 0
            ? availableMains.map((m) => `- 🍽️ ${m.name} — ₱${m.price}`).join('\n')
            : '- Sorry, no available mains right now.';

          assistantContent = `That's not on our menu here at ${businessName ?? 'this restaurant'} today! Would you like to try one of our available mains instead?\n\nSelect an option:\n${options}`;
          nextStep = 2;
        } else {
          setSelectedMain(mainItem);

          const drinks = getSafeItems(['beverage', 'beverages', 'drink', 'drinks'], false, allergyFilter);

          if (drinks.length === 0) {
            assistantContent = `Excellent pick! We don't have any drinks matching your profile right now. Would you like any side dishes, extras, or desserts?\n\nSelect an option:\n- ❌ No extras, proceed to summary.`;
            nextStep = 4;
          } else {
            const options = drinks.map(d => `- 🥤 ${d.name} — ₱${d.price}`).join('\n');
            assistantContent = `Excellent pick! Every great meal needs a refreshing partner. What's your drink choice?\n\nSelect an option:\n${options}`;
          }
        }
      } else if (currentStep === 3) {
        const drinkName = originalText.replace('- 🥤 ', '').split(' — ₱')[0].trim();
        const drinkItem = findMenuItemByName(drinkName, ['beverage', 'beverages', 'drink', 'drinks']);
        if (!drinkItem) {
          const availableDrinks = getSafeItems(['beverage', 'beverages', 'drink', 'drinks'], false, allergyFilter);
          const options = availableDrinks.length > 0
            ? availableDrinks.map((d) => `- 🥤 ${d.name} — ₱${d.price}`).join('\n')
            : '- Sorry, no beverages are available right now.';

          assistantContent = `That's not on our menu here at ${businessName ?? 'this restaurant'} today! Would you like to try one of our available beverages instead?\n\nSelect an option:\n${options}`;
          nextStep = 3;
        } else {
          setSelectedDrink(drinkItem);

          const extras = getSafeItems(['extras', 'dessert', 'desserts', 'side', 'sides', 'add-ons'], false, allergyFilter);
          let options = extras.map(e => `- ➕ ${e.name} — ₱${e.price}`).join('\n');
          options += `\n- ❌ No extras, proceed to summary.`;
          
          assistantContent = `Looking good! Would you like to complete your bundle with any side dishes, extras, or desserts?\n\nSelect an option:\n${options}`;
        }
      } else if (currentStep === 4) {
        let extraItem = null;
        let shouldSummary = true;

        if (!normalized.includes('no extras')) {
          const extraName = originalText.replace('- ➕ ', '').split(' — ₱')[0].trim();
          extraItem = findMenuItemByName(extraName, ['extras', 'dessert', 'desserts', 'side', 'sides', 'add-ons']);

          if (!extraItem) {
            const availableExtras = getSafeItems(['extras', 'dessert', 'desserts', 'side', 'sides', 'add-ons'], false, allergyFilter);
            const options = availableExtras.length > 0
              ? availableExtras.map((e) => `- ➕ ${e.name} — ₱${e.price}`).join('\n')
              : '- Sorry, no extras are available right now.';

            assistantContent = `That's not on our menu here at ${businessName ?? 'this restaurant'} today! Would you like to try one of our available extras instead?\n\nSelect an option:\n${options}`;
            nextStep = 4;
            shouldSummary = false;
          } else {
            setSelectedExtra(extraItem);
          }
        }

        if (shouldSummary) {
          const m = selectedMain || { name: 'None', price: 0 };
        const d = selectedDrink || { name: 'None', price: 0 };
        const e = extraItem || { name: 'None', price: 0 };
        
        const total = Number(m.price || 0) + Number(d.price || 0) + Number(e.price || 0);

        const altMains = getSafeItems(['meals', 'solo', 'main'], isDiet, allergyFilter).filter((x:any) => x.name !== m.name);
        const altMainName = altMains.length > 0 ? altMains[0].name : 'Another healthy choice';
        
        const altDrinks = getSafeItems(['beverage', 'beverages', 'drink', 'drinks'], false, allergyFilter).filter((x:any) => x.name !== d.name);
        const altDrinkName = altDrinks.length > 0 ? altDrinks[0].name : 'Another safe drink';

        assistantContent = `---
### 🛒 YOUR CUSTOMIZED ORDER SUMMARY

* 🍽️ **Main:** ${m.name} — ₱${Number(m.price || 0).toFixed(2)}
* 🥤 **Drink:** ${d.name} — ₱${Number(d.price || 0).toFixed(2)}
* ➕ **Extra:** ${e.name} — ₱${Number(e.price || 0).toFixed(2)}

**Total Amount: ₱${total.toFixed(2)}**
---

💡 **Craving something similar next time? These also match your profile:**
* Since you picked ${m.name}, try **${altMainName}** next visit!
* Since you picked ${d.name}, try **${altDrinkName}**!

Select an option:
- 🔄 Reset Search`;
      } else {
        assistantContent = `Would you like to build another order?\n\nSelect an option:\n- 🔄 Reset Search`;
      }
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
      } else if (trimmedLine.startsWith('- ')) {
        const optionText = trimmedLine.substring(2).replace(/\*\*/g, '');
        optionButtons.push(
          <button
            key={`option-${messageIndex}-${i}`}
            onClick={() => {
              if (!isLoading && isLatest) submitMessage(optionText);
            }}
            disabled={isLoading || !isLatest}
            className={`w-full flex items-start text-left px-3 py-2 min-h-[48px] rounded-xl text-xs font-medium transition-all duration-200 whitespace-normal break-words ${
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
                <h3 className="font-bold text-sm">CraveBot V2</h3>
                <p className="text-xs text-slate-300">Intelligent Ordering</p>
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
              placeholder="Type your response..."
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

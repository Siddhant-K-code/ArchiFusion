"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wand2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Upload,
  Sparkles,
  Home,
  Building2,
  ShoppingBag,
  Stethoscope,
  Coffee,
  Waves,
  ArrowRight,
} from "lucide-react";

import { toast } from "@/components/ui/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface InputPanelProps {
  onGenerateModel: (inputs: {
    prompt: string;
    sketchData: string | null;
    speechData: string | null;
    photoData: string | null;
  }) => void;
  isGenerating: boolean;
}

export function InputPanel({ onGenerateModel, isGenerating }: InputPanelProps) {
  // Input state
  const [textPrompt, setTextPrompt] = useState("");
  const [photoData, setPhotoData] = useState<string | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState<"text" | "photo">("text");

  // UI state
  const [showExamples, setShowExamples] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("residential");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Text prompt handlers
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextPrompt(e.target.value);
  };

  const handleClearAll = () => {
    setTextPrompt("");
    setPhotoData(null);
    toast({
      title: "Inputs cleared",
      description: "All inputs have been cleared.",
    });
  };

  const handleSubmit = () => {
    if (!textPrompt && !photoData) {
      toast({
        title: "No input provided",
        description: "Please enter a text description or upload a photo.",
        variant: "destructive",
      });
      return;
    }

    onGenerateModel({
      prompt: textPrompt,
      sketchData: null,
      speechData: null,
      photoData,
    });
  };

  // Categorized example prompts for better UX
  const examplePrompts = {
    residential: {
      icon: Home,
      label: "Residential",
      color: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
      prompts: [
        "Design a luxury 2-story villa with 4 bedrooms, master suite with walk-in closet, gourmet kitchen, home theater, and wine cellar.",
        "Create a modern tiny house with loft bedroom, compact kitchen, fold-out dining, and smart storage solutions.",
        "Build a sustainable family home with solar panels, rainwater collection, garden spaces, and natural materials."
      ]
    },
    commercial: {
      icon: Building2,
      label: "Commercial",
      color: "bg-green-500/10 text-green-700 dark:text-green-300",
      prompts: [
        "Create a modern coworking space with hot desks, phone booths, meditation room, coffee bar, and rooftop terrace access.",
        "Build a tech startup office with open workspace, gaming area, podcast studio, kitchen, and collaboration zones.",
        "Design a corporate headquarters with conference rooms, executive suites, cafeteria, and presentation center."
      ]
    },
    retail: {
      icon: ShoppingBag,
      label: "Retail & Hospitality",
      color: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
      prompts: [
        "Generate a boutique hotel lobby with check-in desk, lounge seating, business center, gift shop, and grand staircase.",
        "Design a modern restaurant with open kitchen, bar area, dining spaces for 80 people, and outdoor patio.",
        "Create a luxury retail store with product displays, fitting rooms, checkout areas, and customer lounge."
      ]
    },
    healthcare: {
      icon: Stethoscope,
      label: "Healthcare",
      color: "bg-red-500/10 text-red-700 dark:text-red-300",
      prompts: [
        "Design a medical clinic with 6 examination rooms, waiting area, pharmacy, lab, break room, and wheelchair accessible features.",
        "Build a modern dental office with treatment rooms, sterilization area, reception, and patient comfort amenities.",
        "Create a veterinary clinic with examination rooms, surgery suite, boarding area, and separate cat/dog entrances."
      ]
    },
    leisure: {
      icon: Waves,
      label: "Leisure & Wellness",
      color: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
      prompts: [
        "Create a luxury spa with treatment rooms, sauna, steam room, relaxation lounge, and retail boutique.",
        "Design a fitness center with cardio area, weight room, yoga studio, locker rooms, and juice bar.",
        "Build a community center with event hall, meeting rooms, kitchen, children's play area, and outdoor spaces."
      ]
    }
  };

  const handleCategoryChange = (category: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedCategory(category);
      setIsTransitioning(false);
    }, 150);
  };

  const handleExampleClick = (example: string) => {
    setTextPrompt(example);
    setActiveTab("text");
    setShowExamples(false); // Auto-close after selection for smoother UX

    // Show success feedback
    toast({
      title: "✨ Example loaded",
      description: "You can now edit the prompt or generate directly!",
      duration: 2000,
    });
  };

  return (
    <div className="h-full flex flex-col space-y-3 md:space-y-4 p-3 md:p-4">
      {/* Header */}
      <div className="flex flex-row sm:items-center justify-between gap-2">
        <h2 className="text-lg md:text-xl font-semibold">Architectural Designer</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTips(!showTips)}
          className="text-muted-foreground self-start sm:self-auto h-8 text-xs md:text-sm"
        >
          <Lightbulb className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
          Tips
          {showTips ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
        </Button>
      </div>

      {/* Tips Section */}
      {showTips && (
        <Card>
          <CardContent className="p-3 md:p-4">
            <h4 className="font-medium mb-2 text-sm md:text-base">Creating Better Architectural Descriptions:</h4>
            <ul className="text-xs md:text-sm space-y-1 list-disc pl-3 md:pl-4 text-muted-foreground">
              <li>Specify building type (house, office, retail, clinic, etc.)</li>
              <li>Include room count, sizes, and how spaces connect</li>
              <li>Mention architectural style (modern, traditional, industrial)</li>
              <li>Add special features (skylights, balconies, courtyards, storage)</li>
              <li>Consider user needs (wheelchair access, natural light, privacy)</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Input Method Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 h-9 md:h-10">
          <TabsTrigger value="text" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Wand2 className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Describe Building</span>
            <span className="sm:hidden">Describe</span>
          </TabsTrigger>
          <TabsTrigger value="photo" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Upload className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Upload Floor Plan</span>
            <span className="sm:hidden">Upload</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main Input Area */}
      <div className="flex-1 flex flex-col">
        {activeTab === "text" && (
          <div className="flex-1 flex flex-col space-y-3 md:space-y-4">
            <Textarea
              placeholder="Describe your architectural vision... e.g., 'Design a modern 3-bedroom house with open floor plan and large windows' or 'Create a tech office with collaborative spaces, meeting rooms, and a rooftop terrace'"
              className="flex-1 resize-none min-h-[150px] md:min-h-[200px] text-sm md:text-base"
              value={textPrompt}
              onChange={handleTextChange}
            />

            {/* Enhanced Examples Section */}
            <Collapsible open={showExamples} onOpenChange={setShowExamples}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between group hover:bg-accent/50 transition-colors h-9 md:h-10 text-sm">
                  <div className="flex items-center">
                    <Sparkles className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 group-hover:rotate-12 transition-transform" />
                    <span className="hidden sm:inline">Inspiration Gallery</span>
                    <span className="sm:hidden">Examples</span>
                  </div>
                  {showExamples ? <ChevronUp className="h-3 w-3 md:h-4 md:w-4" /> : <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 md:space-y-4 mt-3">
                {/* Category Tabs */}
                <div className="flex flex-wrap gap-1">
                  {Object.entries(examplePrompts).map(([key, category]) => {
                    const IconComponent = category.icon;
                    return (
                      <Button
                        key={key}
                        variant={selectedCategory === key ? "default" : "ghost"}
                        size="sm"
                        className={`h-7 md:h-8 text-xs transition-all duration-200 hover:scale-105 ${
                          selectedCategory === key
                            ? category.color + " border border-current/20"
                            : "hover:bg-accent"
                        }`}
                        onClick={() => handleCategoryChange(key)}
                      >
                        <IconComponent className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1 md:mr-1.5" />
                        <span className="hidden sm:inline">{category.label}</span>
                        <span className="sm:hidden text-[10px]">{category.label.split(' ')[0]}</span>
                      </Button>
                    );
                  })}
                </div>

                {/* Selected Category Prompts */}
                <div className={`space-y-2 transition-all duration-300 ${isTransitioning ? 'opacity-50 transform scale-95' : 'opacity-100 transform scale-100'}`}>
                  {examplePrompts[selectedCategory as keyof typeof examplePrompts]?.prompts.map((prompt, index) => (
                    <div
                      key={index}
                      className="group relative overflow-hidden rounded-lg border border-border/50 hover:border-border transition-all duration-300 hover:shadow-md hover:scale-[1.01] bg-gradient-to-r from-background to-accent/20 hover:from-accent/10 hover:to-accent/30 cursor-pointer"
                    >
                      <Button
                        variant="ghost"
                        className="w-full h-auto p-4 text-left justify-start group-hover:bg-transparent transition-all duration-300"
                        onClick={() => handleExampleClick(prompt)}
                      >
                        <div className="flex items-start gap-3 w-full min-h-[3rem]">
                          <div className="flex-shrink-0 mt-1.5">
                            <div className={`h-2 w-2 rounded-full ${examplePrompts[selectedCategory as keyof typeof examplePrompts].color.split(' ')[0]} opacity-60 group-hover:opacity-100 transition-opacity duration-300`}></div>
                          </div>
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-sm leading-relaxed text-foreground/90 group-hover:text-foreground transition-colors duration-300 whitespace-normal break-words">
                              {prompt}
                            </p>
                          </div>
                          <div className="flex-shrink-0 flex items-start pt-1">
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0" />
                          </div>
                        </div>
                      </Button>

                      {/* Subtle glow effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg"></div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <p className="text-xs text-muted-foreground">
                    Click any example to use as starting point
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => setShowExamples(false)}
                  >
                    Close
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {activeTab === "photo" && (
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-full">
              <CardContent className="p-4 md:p-8 text-center">
                <Upload className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                <h3 className="text-base md:text-lg font-medium mb-2">Floor Plan Upload Coming Soon</h3>
                <p className="text-muted-foreground text-xs md:text-sm">
                  Upload existing floor plans, sketches, or architectural drawings for AI analysis and 3D conversion. For now, please describe your building vision in text.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Input Status */}
        {textPrompt && (
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
            <Wand2 className="h-3 w-3 md:h-4 md:w-4" />
            <span>Architectural description ready</span>
          </div>
        )}

        {/* Generate Button */}
        <Button
          className="w-full h-11 md:h-12 text-sm md:text-base"
          onClick={handleSubmit}
          disabled={isGenerating || !textPrompt}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 md:h-5 md:w-5 mr-2 animate-spin" />
              <span className="hidden sm:inline">Building Your Architecture...</span>
              <span className="sm:hidden">Building...</span>
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              <span className="hidden sm:inline">Build 3D Architecture</span>
              <span className="sm:hidden">Build 3D</span>
            </>
          )}
        </Button>

        {/* Clear Button */}
        {(textPrompt || photoData) && (
          <Button
            variant="outline"
            className="w-full h-9 md:h-10 text-sm"
            onClick={handleClearAll}
            disabled={isGenerating}
          >
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
}
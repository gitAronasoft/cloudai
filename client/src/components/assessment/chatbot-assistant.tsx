import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Send, Bot, User, Lightbulb, Copy, Check, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Assessment } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: ChatSuggestion[];
}

interface ChatSuggestion {
  type: 'replace' | 'append' | 'improve';
  section: string;
  content: string;
  reason: string;
}

interface ChatbotAssistantProps {
  assessment: Assessment;
  currentSection: string;
  currentContent: string;
  onApplySuggestion: (section: string, content: string, type: 'replace' | 'append') => void;
}

export function ChatbotAssistant({ 
  assessment, 
  currentSection, 
  currentContent, 
  onApplySuggestion 
}: ChatbotAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m here to help you improve your assessment documentation. Ask me anything about editing, improving clarity, or adding professional language to your assessment.',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const requestData = {
        message,
        context: {
          currentSection,
          currentContent,
          assessmentData: {
            // Include ALL dynamic sections from the assessment
            dynamicSections: assessment.dynamicSections || {},
            actionItems: assessment.actionItems || [],
          }
        }
      };

      // Create timeout promise (60 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 60000);
      });

      // Race the API call against the timeout
      const apiPromise = apiRequest("POST", "/api/chatbot/assist", requestData)
        .then(response => response.json());

      return await Promise.race([apiPromise, timeoutPromise]);
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: data.message,
        timestamp: new Date(),
        suggestions: data.suggestions || []
      };

      // Remove loading message and add AI response
      setMessages(prev => prev.filter(msg => msg.id !== 'loading').concat(assistantMessage));
    },
    onError: (error) => {
      // Remove loading message
      setMessages(prev => prev.filter(msg => msg.id !== 'loading'));

      toast({
        variant: "destructive",
        title: "Error",
        description: error.message.includes('timeout') 
          ? "AI response took too long. Please try again with a simpler question." 
          : "Failed to get AI assistance. Please try again.",
      });
    }
  });

  const suggestionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chatbot/suggestions", {
        section: currentSection,
        content: currentContent
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.suggestions.length > 0) {
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: `Here are some suggestions for improving your ${currentSection} section:`,
          timestamp: new Date(),
          suggestions: data.suggestions.map((suggestion: string) => ({
            type: 'improve' as const,
            section: currentSection,
            content: suggestion,
            reason: 'AI-generated improvement suggestion'
          }))
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim() || chatMutation.isPending) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    // Add loading message
    const loadingMessage: ChatMessage = {
      id: 'loading',
      type: 'assistant',
      content: 'AI is thinking... This may take up to a minute.',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    chatMutation.mutate(inputMessage);
    setInputMessage('');
  };

  const handleApplySuggestion = (suggestion: ChatSuggestion) => {
    onApplySuggestion(suggestion.section, suggestion.content, suggestion.type === 'append' ? 'append' : 'replace');
    toast({
      title: "Suggestion Applied",
      description: `Content has been ${suggestion.type === 'append' ? 'added to' : 'updated in'} the ${suggestion.section} section.`,
    });
    // Auto-close chatbot after applying suggestion
    setIsOpen(false);
  };

  const handleCopySuggestion = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Copied",
        description: "Suggestion copied to clipboard.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy to clipboard.",
      });
    }
  };

  const handleGetSuggestions = () => {
    if (!currentContent.trim()) {
      toast({
        title: "No Content",
        description: "Please add some content to the current section first.",
      });
      return;
    }
    suggestionsMutation.mutate();
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 transition-all duration-300 w-auto">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-14 w-14 shadow-lg"
          data-testid="button-open-chatbot"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 transition-all duration-300 sm:w-96 sm:max-w-md">
      <Card className="h-full sm:h-[600px] md:h-[650px] lg:h-[700px] w-full flex flex-col shadow-2xl border-0 bg-gradient-to-b from-background to-background/95 backdrop-blur-lg">
        <CardHeader className="pb-3 sm:pb-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2 sm:gap-3 font-semibold">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-full">
                <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <span className="truncate">AI Assistant</span>
            </CardTitle>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGetSuggestions}
                disabled={suggestionsMutation.isPending}
                className="shadow-sm hover:shadow-md transition-all h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                data-testid="button-get-suggestions"
              >
                {suggestionsMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <Lightbulb className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="hover:bg-destructive/10 hover:text-destructive transition-colors h-8 w-8 sm:h-9 sm:w-9"
                data-testid="button-close-chatbot"
              >
                <div className="text-xl sm:text-2xl leading-none">×</div>
              </Button>
            </div>
          </div>
          {currentSection && (
            <div className="text-xs sm:text-sm text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
              <span className="flex-shrink-0">Currently editing:</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs truncate max-w-[180px]">
                {currentSection.charAt(0).toUpperCase() + currentSection.slice(1).replace(/([A-Z])/g, ' $1').trim()}
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="space-y-4 sm:space-y-6 pb-4">
              {messages.map((message) => (
                <div key={message.id} className="space-y-2">
                  <div className={`flex gap-2 sm:gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[90%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-sm ${
                        message.type === 'user' 
                          ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground' 
                          : 'bg-gradient-to-br from-secondary to-secondary/80 border'
                      }`}>
                        {message.type === 'user' ? <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      </div>
                      <div className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-sm ${
                        message.type === 'user' 
                          ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground' 
                          : 'bg-gradient-to-br from-muted to-muted/70 border'
                      }`}>
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    </div>
                  </div>

                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="ml-9 sm:ml-11 space-y-2 sm:space-y-3">
                      {message.suggestions.map((suggestion, index) => (
                        <div key={index} className="bg-gradient-to-br from-accent/30 to-accent/10 rounded-xl p-3 sm:p-4 border border-accent/20 shadow-sm">
                          <div className="flex flex-col gap-2 sm:gap-3 mb-2 sm:mb-3">
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant="outline" className="text-xs bg-background/50 border-accent/30 max-w-[140px] sm:max-w-[200px] truncate">
                                {suggestion.type} {suggestion.section}
                              </Badge>
                              <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopySuggestion(suggestion.content, `${message.id}-${index}`)}
                                  className="h-7 w-7 p-0 hover:bg-background/60 transition-colors"
                                  data-testid={`button-copy-suggestion-${index}`}
                                >
                                  {copiedId === `${message.id}-${index}` ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleApplySuggestion(suggestion)}
                                  className="h-7 px-2 sm:px-3 text-xs shadow-sm hover:shadow-md transition-all"
                                  data-testid={`button-apply-suggestion-${index}`}
                                >
                                  Apply
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium break-words">{suggestion.reason}</p>
                          </div>
                          <p className="text-xs sm:text-sm leading-relaxed break-words">{suggestion.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {chatMutation.isPending && (
                <div className="flex gap-2 sm:gap-3 justify-start">
                  <div className="flex gap-2 sm:gap-3">
                    <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-secondary to-secondary/80 border flex items-center justify-center shadow-sm">
                      <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <div className="bg-gradient-to-br from-muted to-muted/70 rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-sm border">
                      <div className="flex gap-1 items-center">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="ml-1.5 sm:ml-2 text-xs text-muted-foreground">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t bg-gradient-to-r from-background to-background/95 flex-shrink-0">
            <div className="p-3 sm:p-4">
              <div className="flex gap-2 sm:gap-3">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask for help with your assessment"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={chatMutation.isPending}
                  className="flex-1 bg-background/50 border-muted focus:border-primary/50 shadow-sm rounded-xl text-sm h-10"
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || chatMutation.isPending}
                  className="h-10 w-10 flex-shrink-0 rounded-xl shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-primary to-primary/90"
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2 text-center leading-tight">
                Press Enter to send • Responses may take up to a minute
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
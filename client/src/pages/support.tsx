import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, Mail } from "lucide-react";

const faqItems = [
  {
    question: "How do I upload and process audio recordings?",
    answer: "Go to the Record page, either record directly or upload an audio file (MP3, WAV, M4A, OGG). The system will automatically transcribe using OpenAI Whisper and generate a care assessment report.",
    category: "Getting Started"
  },
  {
    question: "What audio formats are supported?",
    answer: "CloudnotesAI supports MP3, WAV, M4A, and OGG audio formats. Maximum file size is 50MB per upload.",
    category: "Technical"
  },
  {
    question: "How accurate is the AI transcription?",
    answer: "We use OpenAI's Whisper API which provides industry-leading accuracy. However, audio quality, background noise, and speaker clarity can affect results.",
    category: "AI Features"
  },
  {
    question: "Can I edit the generated assessments?",
    answer: "Yes! All assessment sections support inline editing. Simply hover over any text and click to edit. Changes are automatically saved.",
    category: "Editing"
  },
  {
    question: "How do I export assessment reports?",
    answer: "On any assessment page, click the 'Export Report' button to download a formatted HTML version that can be printed or shared.",
    category: "Reports"
  },
  {
    question: "What happens to my audio files after processing?",
    answer: "Audio files are stored securely and remain accessible for playback. They are not deleted after transcription to ensure you can reference them later.",
    category: "Data Management"
  }
];


export default function Support() {
  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 md:pl-16 py-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Support Center</h1>
          <p className="text-sm text-muted-foreground">Find answers to frequently asked questions</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 space-y-6">

        {/* FAQ Section */}
        <div>
          <h2 className="text-base sm:text-lg font-medium text-foreground mb-3 sm:mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3 sm:space-y-4">
            {faqItems.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-medium">
                      <HelpCircle className="inline mr-2 h-4 w-4" />
                      {faq.question}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {faq.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
            <p className="text-sm text-muted-foreground">
              Can't find what you're looking for? Send us a message and we'll get back to you.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Name</label>
                  <Input placeholder="Your name" data-testid="input-contact-name" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <Input type="email" placeholder="your.email@example.com" data-testid="input-contact-email" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Subject</label>
                <Input placeholder="Brief description of your issue" data-testid="input-contact-subject" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Message</label>
                <Textarea 
                  placeholder="Please describe your issue or question in detail..."
                  rows={5}
                  data-testid="textarea-contact-message"
                />
              </div>
              <Button type="submit" data-testid="button-submit-contact">
                <Mail className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
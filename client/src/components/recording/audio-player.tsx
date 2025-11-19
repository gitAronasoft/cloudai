import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Play, Pause, SkipBack, SkipForward, Users, User, Stethoscope, Headphones } from "lucide-react";
import type { EnhancedTranscript, TranscriptSegment } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";


interface AudioPlayerProps {
  audioUrl?: string;
  transcript?: string;
  enhancedTranscript?: EnhancedTranscript;
}

export function AudioPlayer({ audioUrl, transcript, enhancedTranscript }: AudioPlayerProps) {
  // Normalize audio URL - ensure it starts with / for HTTP requests  
  const normalizedAudioUrl = audioUrl && !audioUrl.startsWith('/') ? `/${audioUrl}` : audioUrl;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Use enhanced transcript if available, otherwise create basic format
  const displayTranscript = enhancedTranscript || (transcript ? {
    text: transcript,
    segments: [{ start: 0, end: duration || 0, text: transcript, speaker: "Speaker", speakerRole: "Unknown" }],
    speakers: ["Speaker"],
    speakerRoles: { "Speaker": "Unknown" }
  } : null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      const newTime = audio.currentTime;
      setCurrentTime(newTime);

      // Update active segment for highlighting
      if (displayTranscript?.segments) {
        const activeIndex = displayTranscript.segments.findIndex(
          (segment, index) => {
            const nextSegment = displayTranscript.segments[index + 1];
            return newTime >= segment.start && (!nextSegment || newTime < nextSegment.start);
          }
        );
        setActiveSegmentIndex(activeIndex >= 0 ? activeIndex : null);
      }
    };

    const updateDuration = () => {
      // Validate duration before setting it - allow 0 but reject NaN/Infinity
      const dur = audio.duration;
      if (!isNaN(dur) && isFinite(dur)) {
        setDuration(dur);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setActiveSegmentIndex(null);
    };

    const handleError = () => {
      // Stop playback and reset state
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      toast({
        title: "Audio not available",
        description: "The audio file could not be loaded. It may have been deleted or is not accessible.",
        variant: "destructive",
      });
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration); // Additional event for mobile
    audio.addEventListener('canplay', updateDuration); // Fallback for iOS
    audio.addEventListener('loadeddata', updateDuration); // Another fallback
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Try to set duration immediately if already loaded
    const dur = audio.duration;
    if (!isNaN(dur) && isFinite(dur)) {
      setDuration(dur);
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('canplay', updateDuration);
      audio.removeEventListener('loadeddata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [normalizedAudioUrl, displayTranscript, toast]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch((error) => {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
        toast({
          title: "Playback error",
          description: "Unable to play the audio file. Please try again.",
          variant: "destructive",
        });
      });
      setIsPlaying(true);
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = value[0];
    audio.currentTime = newTime;
    setCurrentTime(newTime);

    // Update active segment immediately when seeking
    if (displayTranscript?.segments) {
      const activeIndex = displayTranscript.segments.findIndex(
        (segment, index) => {
          const nextSegment = displayTranscript.segments[index + 1];
          return newTime >= segment.start && (!nextSegment || newTime < nextSegment.start);
        }
      );
      setActiveSegmentIndex(activeIndex >= 0 ? activeIndex : null);
    }
  };

  const jumpToSegment = (segmentIndex: number) => {
    const audio = audioRef.current;
    const segment = displayTranscript?.segments[segmentIndex];
    if (!audio || !segment) return;

    audio.currentTime = segment.start;
    setCurrentTime(segment.start);
    setActiveSegmentIndex(segmentIndex);
  };

  const getSpeakerColor = (speaker?: string) => {
    if (!speaker) return "bg-muted";
    const colors = [
      "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
      "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200", 
      "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200",
      "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200",
      "bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200"
    ];
    const hash = speaker.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const getSpeakerAvatar = (speaker?: string, speakerRole?: string) => {
    if (!speaker) return { icon: User, color: "bg-gray-500", showIcon: true };

    // Determine if this is a healthcare provider based on role information
    const isHealthcareProvider = speakerRole ? 
      /social worker|doctor|nurse|therapist|clinician|provider|worker|staff|healthcare/i.test(speakerRole) :
      /social worker|doctor|nurse|therapist|clinician|provider|worker|staff/i.test(speaker);

    const colors = [
      "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"
    ];

    const hash = speaker.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const initials = speaker.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return {
      icon: isHealthcareProvider ? Stethoscope : User,
      color: colors[Math.abs(hash) % colors.length],
      initials,
      showIcon: !initials || initials.length < 2 || isHealthcareProvider // Show icon for healthcare providers
    };
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!normalizedAudioUrl) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No audio file available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <audio 
        ref={audioRef} 
        src={normalizedAudioUrl} 
        preload="metadata"
        playsInline
      />

      {/* Audio Controls */}
      <Card className="w-full">
      <CardHeader className="pb-2 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-base sm:text-lg md:text-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Headphones className="h-4 w-4 sm:h-5 sm:w-5" />
            Audio Playback
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4 md:space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.max(0, currentTime - 10);
                }
              }}
              data-testid="button-skip-back"
              className="min-h-[44px] sm:min-h-[36px] px-4"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              variant={isPlaying ? "secondary" : "default"}
              onClick={togglePlayPause}
              data-testid="button-play-pause"
              className="min-h-[44px] sm:min-h-[36px] px-4"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.min(duration, currentTime + 10);
                }
              }}
              data-testid="button-skip-forward"
              className="min-h-[44px] sm:min-h-[36px] px-4"
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Speaker roles indicator - simplified labels */}
          {displayTranscript?.speakerRoles && Object.keys(displayTranscript.speakerRoles).length > 0 && (
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {Object.entries(displayTranscript.speakerRoles).map(([speaker, role], index) => {
                // Map roles to display names
                const displayRole = role?.toLowerCase().includes('social worker') || role?.toLowerCase().includes('worker') ? 
                  'Social Worker' : 
                  role?.toLowerCase().includes('client') ? 'Client' : role;

                return (
                  <div key={speaker} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${getSpeakerColor(speaker).replace('text-', 'bg-').replace('dark:', '').split(' ')[0]}`}></div>
                    <span className="text-xs sm:text-sm text-muted-foreground font-medium" data-testid={`label-speaker-role-${index}`}>
                      {displayRole}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration}
            step={1}
            onValueChange={handleSeek}
            className="w-full"
            data-testid="slider-audio-progress"
          />

          {/* Segment markers on timeline */}
          {displayTranscript?.segments && displayTranscript.segments.length > 1 && duration > 0 && (
            <div className="relative w-full h-1 bg-border rounded">
              {displayTranscript.segments.map((segment, index) => (
                <div
                  key={index}
                  className="absolute top-0 h-full bg-primary cursor-pointer hover:bg-primary/70 transition-colors"
                  style={{
                    left: `${(segment.start / duration) * 100}%`,
                    width: `${Math.max(0.5, ((segment.end - segment.start) / duration) * 100)}%`,
                  }}
                  onClick={() => jumpToSegment(index)}
                  title={`${segment.speaker || 'Speaker'}: ${segment.text.substring(0, 50)}...`}
                  data-testid={`segment-marker-${index}`}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
      </Card>

      {/* Transcript Section */}
      {displayTranscript && (
        <Card className="w-full">
          <CardHeader className="p-4 sm:p-6">
            <div className="space-y-3">
              <h3 className="text-base sm:text-lg font-semibold flex flex-wrap items-center gap-2">
                <span>Transcript</span>
                {enhancedTranscript && (
                  <Badge variant="secondary" className="text-xs">
                    {enhancedTranscript.speakers.length} Speaker{enhancedTranscript.speakers.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </h3>
              {enhancedTranscript && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {enhancedTranscript.speakers.map(speaker => (
                    <Badge key={speaker} variant="outline" className="text-xs">
                      {speaker}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto pr-1 sm:pr-2">
              {enhancedTranscript ? (
                enhancedTranscript.segments.map((segment, index) => {
                  const avatar = getSpeakerAvatar(segment.speaker, segment.speakerRole);
                  const Icon = avatar.icon;

                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-2 sm:gap-3 transition-all duration-200 cursor-pointer hover:bg-muted/50 p-1.5 sm:p-2 rounded-md ${
                        activeSegmentIndex === index 
                          ? 'bg-primary/5 ring-1 ring-primary/20' 
                          : ''
                      }`}
                      onClick={() => jumpToSegment(index)}
                      data-testid={`transcript-segment-${index}`}
                    >
                      {/* Timestamp */}
                      <div className="text-xs text-muted-foreground font-mono pt-1 min-w-[40px] sm:min-w-[45px] flex-shrink-0">
                        {formatTime(segment.start)}
                      </div>

                      {/* Avatar */}
                      <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                        <AvatarFallback className={`${avatar.color} text-white text-xs`}>
                          {avatar.showIcon ? <Icon className="h-4 w-4" /> : avatar.initials}
                        </AvatarFallback>
                      </Avatar>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        {/* Speaker Name */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                          <span className={`text-sm font-medium break-words ${getSpeakerColor(segment.speaker).replace('bg-', 'text-').replace('/30', '').replace('100', '600').replace('900', '400')}`}>
                            {segment.speaker || 'Unknown Speaker'}
                          </span>
                        </div>

                        {/* Message Text */}
                        <p className="text-sm text-foreground leading-relaxed break-words">
                          {segment.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Single segment fallback with basic layout
                <div className="flex gap-2 sm:gap-3">
                  <div className="text-xs text-muted-foreground font-mono pt-1 min-w-[40px] flex-shrink-0">
                    0:00
                  </div>
                  <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                    <AvatarFallback className="bg-gray-500 text-white text-xs">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Speaker</div>
                    <p className="text-sm text-foreground leading-relaxed break-words">
                      {displayTranscript.text}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
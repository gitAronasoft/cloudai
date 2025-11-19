import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => void;
  onFocus?: () => void;
  onChange?: (newValue: string) => void;
  placeholder?: string;
  className?: string;
  editClassName?: string;
  multiline?: boolean;
  disabled?: boolean;
  "data-testid"?: string;
}

export function InlineEdit({
  value,
  onSave,
  onFocus,
  onChange,
  placeholder = "Click to edit...",
  className = "",
  editClassName = "",
  multiline = false,
  disabled = false,
  "data-testid": testId,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter" && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  if (disabled) {
    return (
      <div className={cn("p-2 min-h-12 flex items-center", className)} data-testid={testId}>
        {value ? (
          <p className="leading-relaxed whitespace-pre-wrap">{value}</p>
        ) : (
          <p className="text-muted-foreground leading-relaxed italic">{placeholder}</p>
        )}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={cn("space-y-2", editClassName)}>
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            onChange?.(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-20 resize-y"
          rows={multiline ? 4 : 2}
        />
        <div className="flex space-x-2">
          <Button size="sm" onClick={handleSave} data-testid="button-save-edit">
            <Check className="h-3 w-3 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} data-testid="button-cancel-edit">
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group relative", className)}>
      <div
        className="cursor-pointer hover:bg-muted/50 rounded p-2 min-h-12 flex items-center"
        onClick={() => {
          setIsEditing(true);
          onFocus?.();
        }}
        data-testid={testId || "editable-text"}
      >
        {value ? (
          <p className="leading-relaxed pr-8 whitespace-pre-wrap">{value}</p>
        ) : (
          <p className="text-muted-foreground leading-relaxed italic pr-8">{placeholder}</p>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="absolute right-0 top-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
            onFocus?.();
          }}
          data-testid="button-edit-text"
        >
          <Edit className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
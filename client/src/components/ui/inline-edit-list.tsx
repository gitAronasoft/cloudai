import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Check, X, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineEditListProps {
  items: string[];
  onSave: (newItems: string[]) => void;
  onFocus?: () => void;
  onChange?: (newItems: string[]) => void;
  placeholder?: string;
  addButtonText?: string;
  className?: string;
}

export function InlineEditList({
  items,
  onSave,
  onFocus,
  onChange,
  placeholder = "Add new item...",
  addButtonText = "Add item",
  className = "",
}: InlineEditListProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState(items);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setEditItems(items);
  }, [items]);

  useEffect(() => {
    if (isEditing && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    const filteredItems = editItems.filter(item => item.trim() !== "");
    onSave(filteredItems);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditItems(items);
    setIsEditing(false);
  };

  const handleAddItem = () => {
    const newItems = [...editItems, ""];
    setEditItems(newItems);
    onChange?.(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = editItems.filter((_, i) => i !== index);
    setEditItems(newItems);
    onChange?.(newItems);
  };

  const handleItemChange = (index: number, value: string) => {
    const updated = [...editItems];
    updated[index] = value;
    setEditItems(updated);
    onChange?.(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (index === editItems.length - 1) {
        handleAddItem();
      } else {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  if (isEditing) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="space-y-2">
          {editItems.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Input
                ref={el => inputRefs.current[index] = el}
                value={item}
                onChange={(e) => handleItemChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder={placeholder}
                className="flex-1"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveItem(index)}
                data-testid={`button-remove-item-${index}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" onClick={handleAddItem} data-testid="button-add-item">
            <Plus className="h-3 w-3 mr-1" />
            {addButtonText}
          </Button>
        </div>

        <div className="flex space-x-2 pt-2 border-t">
          <Button size="sm" onClick={handleSave} data-testid="button-save-list">
            <Check className="h-3 w-3 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} data-testid="button-cancel-list">
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
        className="cursor-pointer hover:bg-muted/50 rounded p-2 min-h-12"
        onClick={() => {
          setIsEditing(true);
          onFocus?.();
        }}
        data-testid="editable-list"
      >
        {items.length > 0 ? (
          <ul className="space-y-2 pr-8">
            {items.map((item, index) => (
              <li key={index} className="flex items-start space-x-3">
                <span className="text-accent h-2 w-2 mt-2 bg-current rounded-full block"></span>
                <span className="text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground italic">Click to add action items...</p>
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
          data-testid="button-edit-list"
        >
          <Edit className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
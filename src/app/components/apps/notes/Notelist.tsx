"use client";

import { Icon } from "@iconify/react";
import React, { useState, useEffect } from "react";
import { NotesType } from "@/app/(DashboardLayout)/types/apps/notes";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";

interface NotelistProps {
  notes: NotesType[];
  loading: boolean;
  onSelectNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
}

// Map colors to Tailwind classes
const colorClassMap: Record<string, string> = {
  primary: "bg-lightprimary text-primary",
  warning: "bg-lightwarning text-warning",
  error: "bg-lighterror text-error",
  success: "bg-lightsuccess text-success",
  secondary: "bg-lightsecondary text-secondary",
};

const Notelist: React.FC<NotelistProps> = ({ notes, loading, onSelectNote, onDeleteNote }) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (notes.length > 0) {
      setActiveNoteId(notes[0].id);
    }
  }, [notes]);

  const filteredNotes = notes.filter((note) => {
    if (!note.title) return false;
    if (searchTerm === "") return true;
    return note.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleNoteClick = (noteId: string) => {
    setActiveNoteId(noteId);
    onSelectNote(noteId);
  };

  if (loading) return <p>Loading notes...</p>;

  return (
    <div>
      <Input
        type="text"
        placeholder="Search Notes"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full"
      />
      <h6 className="text-base mt-6">All Notes</h6>
      <div className="flex flex-col gap-3 mt-4">
        {filteredNotes.length ? (
          filteredNotes.map((note) => {
            const colorClasses = colorClassMap[note.color || "primary"];
            return (
              <div key={note.id}>
                <div
                  className={`cursor-pointer relative p-4 rounded-md ${colorClasses} ${
                    activeNoteId === note.id ? "scale-100" : "scale-95"
                  } transition-transform duration-200`}
                  onClick={() => handleNoteClick(note.id)}
                >
                  <h6 className="text-base truncate">{note.title}</h6>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-ld">{new Date(note.updated_at).toLocaleDateString()}</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteNote(note.id)}
                          aria-label="Delete note"
                        >
                          <Icon icon="tabler:trash" height={18} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <Alert variant="destructive">
            <AlertTitle>No Notes Found!</AlertTitle>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default Notelist;

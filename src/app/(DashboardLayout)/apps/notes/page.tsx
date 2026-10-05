
import NotesApp from "@/app/components/apps/notes";
import BreadcrumbComp from "../../layout/shared/breadcrumb/BreadcrumbComp";
import type { Metadata } from "next";
import { getOwnedNotes } from "@/lib/template-apps/data";
export const metadata: Metadata = {
  title: "Notes App",
};

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Notes",
  },
];
const Notes = async ({ searchParams }: { searchParams: Promise<{ noteId?: string }> }) => {
  const [{ noteId }, notes] = await Promise.all([searchParams, getOwnedNotes()]);
  const initialSelectedNoteId = notes.some((note) => note.id === noteId)
    ? noteId ?? null
    : notes[0]?.id ?? null;

  return (
    <>
        <BreadcrumbComp title="Notes app" items={BCrumb} />
      <NotesApp initialNotes={notes} initialSelectedNoteId={initialSelectedNoteId} />
    </>
  );
};

export default Notes;

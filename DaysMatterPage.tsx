import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import DaysMatterEditor from '@/components/settings/DaysMatterEditor';
import { toast } from 'sonner';

export default function DaysMatterPage() {
  const navigate = useNavigate();
  const { contact, updateContact } = useApp();
  const [formOpen, setFormOpen] = useState(false);

  const handleChange = (events: typeof contact.daysMatterEvents) => {
    updateContact({ ...contact, daysMatterEvents: events });
    toast.success('已保存');
  };

  return (
    <div className="flex flex-col h-dvh w-full bg-gray-50">
      <header className="shrink-0 h-14 px-4 flex items-center justify-between bg-white border-b border-gray-100 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-gray-800">倒数日 / 纪念日</h1>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 text-[var(--accent-color)]"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <DaysMatterEditor
          events={contact.daysMatterEvents || []}
          onChange={handleChange}
          formOpen={formOpen}
          onFormOpenChange={setFormOpen}
        />
      </div>
    </div>
  );
}

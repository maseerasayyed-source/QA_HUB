import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  FileText,
  Save,
  Filter,
  Download,
  Share2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Database,
  StickyNote,
  ListTodo,
  TrendingUp,
} from 'lucide-react';
import {
  DailyTaskItem,
  DailyTaskStatus,
  UserNotepad,
  UserProfile,
  TicketSummary,
  BeaconModule,
} from '../types';
import { generateAiDailySuggestions } from '../utils/userManualHelper';

interface DailyTaskUpdatesViewProps {
  currentUser: UserProfile;
  tickets: TicketSummary[];
  modules: BeaconModule[];
  dailyTasks: DailyTaskItem[];
  userNotepads: UserNotepad[];
  onSaveDailyTasks: (tasks: DailyTaskItem[]) => void;
  onSaveNotepads: (notepads: UserNotepad[]) => void;
}

export const DailyTaskUpdatesView: React.FC<DailyTaskUpdatesViewProps> = ({
  currentUser,
  tickets,
  modules,
  dailyTasks,
  userNotepads,
  onSaveDailyTasks,
  onSaveNotepads,
}) => {
  // Today's date string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Active view sub-tab: 'tasks' or 'notepad'
  const [activeSubTab, setActiveSubTab] = useState<'tasks' | 'notepad'>('tasks');

  // New Task form state
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState<boolean>(false);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [selectedTicketNo, setSelectedTicketNo] = useState<string>('');
  const [timeSpentHours, setTimeSpentHours] = useState<number>(2);
  const [timeSlot, setTimeSlot] = useState<string>('10:00 AM - 12:00 PM');
  const [taskStatus, setTaskStatus] = useState<DailyTaskStatus>('In Progress');
  const [taskNotes, setTaskNotes] = useState<string>('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Notepad State
  const currentUserEmail = (currentUser.email || '').toLowerCase().trim();
  const userNotes = useMemo(() => {
    return userNotepads.filter(
      (n) => (n.userEmail || '').toLowerCase().trim() === currentUserEmail
    );
  }, [userNotepads, currentUserEmail]);

  const [activeNoteId, setActiveNoteId] = useState<string>(
    userNotes[0]?.id || ''
  );
  const [activeNoteTitle, setActiveNoteTitle] = useState<string>(
    userNotes[0]?.title || 'Daily Standup Notes'
  );
  const [activeNoteContent, setActiveNoteContent] = useState<string>(
    userNotes[0]?.content ||
      '• Today Focus: Verify Ticket regression tests\n• Standup Update: Executed 8 test cases in Term Loan module\n• Blockers: None currently'
  );

  // Notification Banner
  const [bannerMessage, setBannerMessage] = useState<string>('');

  // AI Suggestions
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Filter tasks for selected user and selected date
  const myTasksForSelectedDate = useMemo(() => {
    return dailyTasks.filter(
      (t) =>
        t.date === selectedDate &&
        (t.userEmail || '').toLowerCase().trim() === currentUserEmail
    );
  }, [dailyTasks, selectedDate, currentUserEmail]);

  // Total logged hours today
  const totalHoursLogged = useMemo(() => {
    return myTasksForSelectedDate.reduce((sum, t) => sum + (Number(t.timeSpentHours) || 0), 0);
  }, [myTasksForSelectedDate]);

  // Change date (previous/next day)
  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Open add modal
  const handleOpenAddModal = (taskToEdit?: DailyTaskItem) => {
    if (taskToEdit) {
      setEditingTaskId(taskToEdit.id);
      setTaskTitle(taskToEdit.taskTitle);
      setSelectedTicketNo(taskToEdit.ticketNo || '');
      setTimeSpentHours(taskToEdit.timeSpentHours);
      setTimeSlot(taskToEdit.timeSlot || '10:00 AM - 12:00 PM');
      setTaskStatus(taskToEdit.status);
      setTaskNotes(taskToEdit.notesOrRemarks || '');
    } else {
      setEditingTaskId(null);
      setTaskTitle('');
      setSelectedTicketNo(tickets[0]?.ticketNumber || '');
      setTimeSpentHours(2);
      setTimeSlot('10:00 AM - 12:00 PM');
      setTaskStatus('In Progress');
      setTaskNotes('');
    }
    setIsAddTaskModalOpen(true);
  };

  // Save Task (Add or Update)
  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const matchedTicket = tickets.find((t) => t.ticketNumber === selectedTicketNo);
    const modName = matchedTicket?.moduleName || 'General QA';

    if (editingTaskId) {
      // Update
      const updated = dailyTasks.map((t) => {
        if (t.id === editingTaskId) {
          return {
            ...t,
            taskTitle: taskTitle.trim(),
            ticketNo: selectedTicketNo,
            moduleName: modName,
            timeSpentHours: Number(timeSpentHours) || 1,
            timeSlot,
            status: taskStatus,
            notesOrRemarks: taskNotes.trim(),
          };
        }
        return t;
      });
      onSaveDailyTasks(updated);
      setBannerMessage('Task updated successfully!');
    } else {
      // Create new
      const newTask: DailyTaskItem = {
        id: `task-${Date.now()}`,
        date: selectedDate,
        userEmail: currentUser.email,
        userName: currentUser.name,
        taskTitle: taskTitle.trim(),
        ticketNo: selectedTicketNo,
        moduleName: modName,
        timeSpentHours: Number(timeSpentHours) || 1,
        timeSlot,
        status: taskStatus,
        notesOrRemarks: taskNotes.trim(),
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      onSaveDailyTasks([newTask, ...dailyTasks]);
      setBannerMessage('Daily work log entry added!');
    }

    setIsAddTaskModalOpen(false);
    setTimeout(() => setBannerMessage(''), 3000);
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    const updated = dailyTasks.filter((t) => t.id !== taskId);
    onSaveDailyTasks(updated);
    setBannerMessage('Task entry removed');
    setTimeout(() => setBannerMessage(''), 2500);
  };

  // Quick toggle status
  const handleToggleStatus = (taskId: string) => {
    const statusCycle: DailyTaskStatus[] = ['Pending', 'In Progress', 'Completed', 'Blocked'];
    const updated = dailyTasks.map((t) => {
      if (t.id === taskId) {
        const nextIdx = (statusCycle.indexOf(t.status) + 1) % statusCycle.length;
        return { ...t, status: statusCycle[nextIdx] };
      }
      return t;
    });
    onSaveDailyTasks(updated);
  };

  // Save current note
  const handleSaveActiveNote = () => {
    let updatedNotes: UserNotepad[];
    const existingIdx = userNotepads.findIndex((n) => n.id === activeNoteId);

    if (existingIdx >= 0) {
      updatedNotes = [...userNotepads];
      updatedNotes[existingIdx] = {
        ...updatedNotes[existingIdx],
        title: activeNoteTitle,
        content: activeNoteContent,
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    } else {
      const newNote: UserNotepad = {
        id: `note-${Date.now()}`,
        userEmail: currentUser.email,
        title: activeNoteTitle || 'Untitled Note',
        content: activeNoteContent,
        category: 'Daily Standup',
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setActiveNoteId(newNote.id);
      updatedNotes = [newNote, ...userNotepads];
    }

    onSaveNotepads(updatedNotes);
    setBannerMessage('Notepad updated & saved locally!');
    setTimeout(() => setBannerMessage(''), 3000);
  };

  // Create new note
  const handleCreateNewNote = () => {
    const newNote: UserNotepad = {
      id: `note-${Date.now()}`,
      userEmail: currentUser.email,
      title: `Standup Notes - ${new Date().toLocaleDateString('en-GB')}`,
      content: '• Plan for today:\n• Completed yesterday:\n• Blockers / Impediments:',
      category: 'Daily Standup',
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setActiveNoteId(newNote.id);
    setActiveNoteTitle(newNote.title);
    setActiveNoteContent(newNote.content);
    onSaveNotepads([newNote, ...userNotepads]);
  };

  // Generate AI Suggestions
  const handleTriggerAiSuggestions = () => {
    setIsAiLoading(true);
    setTimeout(() => {
      const suggestions = generateAiDailySuggestions(
        myTasksForSelectedDate.map((t) => ({
          taskTitle: t.taskTitle,
          timeSpentHours: t.timeSpentHours,
          status: t.status,
        })),
        activeNoteContent
      );
      setAiSuggestions(suggestions);
      setIsAiLoading(false);
    }, 400);
  };

  // Copy Standup Update to Clipboard for Manager / Slack / Teams
  const handleCopyStandupText = () => {
    const dateFormatted = new Date(selectedDate).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const completed = myTasksForSelectedDate.filter((t) => t.status === 'Completed');
    const inProg = myTasksForSelectedDate.filter((t) => t.status === 'In Progress');
    const blocked = myTasksForSelectedDate.filter((t) => t.status === 'Blocked');

    let text = `📋 Daily QA Status Update - ${currentUser.name} (${dateFormatted})\n`;
    text += `⏱ Total Hours Logged: ${totalHoursLogged.toFixed(1)}h\n\n`;

    if (completed.length > 0) {
      text += `✅ Completed Tasks:\n`;
      completed.forEach((t) => {
        text += `  • ${t.taskTitle} (${t.timeSpentHours}h)${t.ticketNo ? ` [Ticket #${t.ticketNo}]` : ''}\n`;
      });
      text += `\n`;
    }

    if (inProg.length > 0) {
      text += `🔄 In Progress / Current Tasks:\n`;
      inProg.forEach((t) => {
        text += `  • ${t.taskTitle} (${t.timeSpentHours}h)${t.ticketNo ? ` [Ticket #${t.ticketNo}]` : ''}\n`;
      });
      text += `\n`;
    }

    if (blocked.length > 0) {
      text += `⚠️ Blockers / Impediments:\n`;
      blocked.forEach((t) => {
        text += `  • ${t.taskTitle} (${t.notesOrRemarks || 'Waiting on dev build'})\n`;
      });
      text += `\n`;
    }

    if (myTasksForSelectedDate.length === 0) {
      text += `Notes:\n${activeNoteContent}\n`;
    }

    navigator.clipboard.writeText(text);
    setBannerMessage('Formatted Standup Update copied to clipboard for your Manager / Teams!');
    setTimeout(() => setBannerMessage(''), 3500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Top Bar Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Daily Task Work Log &amp; Personal QA Notepad
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Log what you worked on, track hours, manage your standup updates &amp; maintain private notes with AI suggestions.
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector & Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sub-Tab Navigation */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('tasks')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeSubTab === 'tasks'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5 inline mr-1" />
              Daily Task Log ({myTasksForSelectedDate.length})
            </button>
            <button
              onClick={() => setActiveSubTab('notepad')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeSubTab === 'notepad'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5 inline mr-1" />
              My Scratchpad / Notes
            </button>
          </div>

          {/* Date Picker Switcher */}
          <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
            <button
              onClick={() => handleShiftDate(-1)}
              className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent px-2 py-0.5 focus:outline-none cursor-pointer"
            />
            <button
              onClick={() => handleShiftDate(1)}
              className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Copy Standup Update Button */}
          <button
            onClick={handleCopyStandupText}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
            title="Copy standup summary formatted for Slack / Teams / Manager update"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy for Manager</span>
          </button>

          {/* Add Task Button */}
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Work Item</span>
          </button>
        </div>
      </header>

      {/* Notification Banner */}
      {bannerMessage && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 text-xs font-semibold text-emerald-800 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <button
            onClick={() => setBannerMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Daily Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Selected Date</span>
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-base font-black text-slate-900 mt-1">
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {selectedDate === todayStr ? 'Today' : 'Historical / Future Log'}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Logged Hours</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-base font-black text-slate-900 mt-1">
                {totalHoursLogged.toFixed(1)} hrs
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                {totalHoursLogged >= 8 ? 'Full work day logged' : `${(8 - totalHoursLogged).toFixed(1)} hrs remaining`}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Total Work Items</span>
                <ListTodo className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-base font-black text-slate-900 mt-1">
                {myTasksForSelectedDate.length} Tasks
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {myTasksForSelectedDate.filter((t) => t.status === 'Completed').length} Completed
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>User Context</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                  {currentUser.role}
                </span>
              </div>
              <div className="text-base font-black text-slate-900 mt-1 truncate">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                {currentUser.email}
              </div>
            </div>
          </div>

          {activeSubTab === 'tasks' ? (
            /* ================= TASKS LIST VIEW ================= */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Tasks &amp; Execution Timeline for {selectedDate}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click status badges to cycle through status (Pending → In Progress → Completed → Blocked).
                  </p>
                </div>
                <button
                  onClick={() => handleOpenAddModal()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs border border-indigo-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              </div>

              {myTasksForSelectedDate.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <Clock3 className="w-10 h-10 mx-auto opacity-30 text-indigo-600" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">No tasks logged for this date</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Start by adding what you are working on today. Keep track of hours and status for manager reporting.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenAddModal()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log First Work Item</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myTasksForSelectedDate.map((item) => {
                    const statusColors = {
                      Completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                      'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
                      Pending: 'bg-amber-100 text-amber-800 border-amber-300',
                      Blocked: 'bg-rose-100 text-rose-800 border-rose-300',
                    };

                    return (
                      <div
                        key={item.id}
                        className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors gap-4"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <button
                            onClick={() => handleToggleStatus(item.id)}
                            className={`mt-0.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                              statusColors[item.status]
                            }`}
                            title="Click to toggle status"
                          >
                            {item.status}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-bold text-slate-900 leading-snug">
                                {item.taskTitle}
                              </h4>
                              {item.ticketNo && (
                                <span className="text-[10px] font-mono font-bold bg-slate-100 text-blue-700 px-1.5 py-0.2 rounded border border-slate-200">
                                  #{item.ticketNo}
                                </span>
                              )}
                              {item.moduleName && (
                                <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                                  {item.moduleName}
                                </span>
                              )}
                            </div>
                            {item.notesOrRemarks && (
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                {item.notesOrRemarks}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1.5">
                              {item.timeSlot && <span>⏱ {item.timeSlot}</span>}
                              <span>Created at {item.createdAt}</span>
                            </div>
                          </div>
                        </div>

                        {/* Hours & Controls */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <span className="text-sm font-black text-slate-900 font-mono">
                              {item.timeSpentHours}h
                            </span>
                            <div className="text-[10px] text-slate-400">Duration</div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenAddModal(item)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ================= NOTEPAD VIEW ================= */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Notes Sidebar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    My Saved Notes ({userNotes.length})
                  </span>
                  <button
                    onClick={handleCreateNewNote}
                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                    title="Create New Note"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {userNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => {
                        setActiveNoteId(note.id);
                        setActiveNoteTitle(note.title);
                        setActiveNoteContent(note.content);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        activeNoteId === note.id
                          ? 'bg-indigo-50/70 border-indigo-500 font-bold text-indigo-950'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="truncate">{note.title}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        Updated {note.updatedAt}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note Editor */}
              <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <input
                    type="text"
                    value={activeNoteTitle}
                    onChange={(e) => setActiveNoteTitle(e.target.value)}
                    className="text-base font-bold text-slate-900 border-none focus:outline-none w-full"
                    placeholder="Note Title (e.g. Daily Standup Notes)..."
                  />
                  <button
                    onClick={handleSaveActiveNote}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer shrink-0 ml-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Note</span>
                  </button>
                </div>

                <textarea
                  rows={12}
                  value={activeNoteContent}
                  onChange={(e) => setActiveNoteContent(e.target.value)}
                  className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono leading-relaxed resize-none"
                  placeholder="Type your notes, standup points, blockers, or ideas here..."
                />
              </div>
            </div>
          )}

          {/* AI Daily Suggestions Box */}
          <div className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 rounded-2xl border border-indigo-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  AI Standup &amp; Productivity Suggestions
                </h3>
              </div>
              <button
                onClick={handleTriggerAiSuggestions}
                disabled={isAiLoading}
                className="flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs cursor-pointer"
              >
                <Sparkles className={`w-3 h-3 ${isAiLoading ? 'animate-spin' : ''}`} />
                <span>{isAiLoading ? 'Thinking...' : 'Get AI Suggestions'}</span>
              </button>
            </div>

            {aiSuggestions.length > 0 ? (
              <div className="space-y-2">
                {aiSuggestions.map((sug, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-white/90 rounded-lg border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2 shadow-2xs"
                  >
                    <span className="text-indigo-600 font-bold">•</span>
                    <span>{sug}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Click 'Get AI Suggestions' to let the AI analyze your tasks, calculate total hours, and formulate a crisp standup update for your manager.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Task Modal */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingTaskId ? 'Edit Daily Work Item' : 'Add Daily Work Item'}
              </h3>
              <button
                onClick={() => setIsAddTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  What did you work on? *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full text-xs text-slate-900 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Executed regression test cases for Term Loan disbursement"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Related Ticket (Optional):
                  </label>
                  <select
                    value={selectedTicketNo}
                    onChange={(e) => setSelectedTicketNo(e.target.value)}
                    className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- None / General Task --</option>
                    {tickets.map((t) => (
                      <option key={t.id} value={t.ticketNumber}>
                        #{t.ticketNumber} - {t.featureName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status:
                  </label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as DailyTaskStatus)}
                    className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Time Spent (Hours):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="14"
                    value={timeSpentHours}
                    onChange={(e) => setTimeSpentHours(parseFloat(e.target.value) || 1)}
                    className="w-full text-xs text-slate-900 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Time Slot (Optional):
                  </label>
                  <input
                    type="text"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full text-xs text-slate-900 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. 10:00 AM - 01:00 PM"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remarks / Standup Notes for Manager:
                </label>
                <textarea
                  rows={2}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="w-full text-xs text-slate-800 border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Any details, blockers, or test case outcomes..."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                >
                  {editingTaskId ? 'Update Work Item' : 'Save Work Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
